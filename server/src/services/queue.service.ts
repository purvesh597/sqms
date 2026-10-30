import { Prisma, type Counter, type Meal, type Notification, type Token } from '@prisma/client';
import {
  MAX_OBSERVED_GAP_SECS,
  MIN_OBSERVED_GAP_SECS,
  MAX_SERVICE_SECS,
  MIN_OBSERVED_SAMPLES,
  MIN_SERVICE_SECS,
  TOKEN_TRANSITIONS,
  type QueueEventType,
  type TokenStatus,
} from '../config/constants';
import { prisma, type Tx } from '../prisma/client';
import { secondsBetween, todayStr } from '../utils/date';
import { formatTokenNumber } from '../utils/format';
import { badRequest, conflict, forbidden, notFound } from '../utils/http-error';
import { withLock } from '../utils/lock';
import { events } from './events.service';
import { getMessService, isBookable } from './meal.service';
import { createNotification, deliver } from './notification.service';

export interface QueueKey {
  counterId: string;
  mealId: string;
  date: string;
}

const lockKey = (k: QueueKey) => `queue:${k.counterId}:${k.mealId}:${k.date}`;
const activeKeyOf = (userId: string, k: QueueKey) => `${userId}:${k.counterId}:${k.mealId}:${k.date}`;
const calledKeyOf = (k: QueueKey) => `${k.counterId}:${k.mealId}:${k.date}`;
const keyOf = (t: Pick<Token, 'counterId' | 'mealId' | 'date'>): QueueKey => ({
  counterId: t.counterId,
  mealId: t.mealId,
  date: t.date,
});

function assertTransition(from: string, to: TokenStatus) {
  const allowed = TOKEN_TRANSITIONS[from as TokenStatus] ?? [];
  if (!allowed.includes(to)) {
    throw conflict(`Invalid status change: a ${from.toLowerCase()} token cannot be marked ${to.toLowerCase()}.`);
  }
}

async function logEvent(
  tx: Tx,
  type: QueueEventType,
  counterId: string,
  opts: { tokenId?: string; actorId?: string; details?: Record<string, unknown> } = {},
) {
  await tx.queueEvent.create({
    data: {
      type,
      counterId,
      tokenId: opts.tokenId,
      actorId: opts.actorId,
      details: opts.details ? JSON.stringify(opts.details) : undefined,
    },
  });
}

function emitQueue(k: QueueKey, reason: string) {
  events.broadcast({ type: 'queue.updated', data: { ...k, reason } });
}

/* ------------------------------------------------------------------ */
/* Estimates                                                           */
/* ------------------------------------------------------------------ */

/**
 * Average seconds per token. Uses the observed gaps between consecutive calls in
 * this queue today; falls back to the counter's or mess-wide configured value.
 */
export async function getServiceEstimate(k: QueueKey, counter?: Counter) {
  const [c, service, called] = await Promise.all([
    counter ?? prisma.counter.findUnique({ where: { id: k.counterId } }),
    getMessService(),
    prisma.token.findMany({
      where: { ...k, calledAt: { not: null } },
      orderBy: { calledAt: 'desc' },
      take: 16,
      select: { calledAt: true },
    }),
  ]);
  const configured = c?.serviceSecs ?? service.defaultServiceSecs;
  const gaps: number[] = [];
  for (let i = 0; i < called.length - 1; i++) {
    const gap = secondsBetween(called[i + 1].calledAt!, called[i].calledAt!);
    if (gap >= MIN_OBSERVED_GAP_SECS && gap <= MAX_OBSERVED_GAP_SECS) gaps.push(gap);
  }
  if (gaps.length >= MIN_OBSERVED_SAMPLES) {
    const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    return { secsPerToken: Math.round(Math.min(MAX_SERVICE_SECS, Math.max(MIN_SERVICE_SECS, avg))), source: 'observed' as const, samples: gaps.length };
  }
  return { secsPerToken: configured, source: 'configured' as const, samples: gaps.length };
}

/** Estimated wait for a token with `ahead` waiting tokens in front of it. */
const estimateWait = (ahead: number, hasCalled: boolean, secsPerToken: number) =>
  Math.round((ahead + (hasCalled ? 1 : 0)) * secsPerToken);

/* ------------------------------------------------------------------ */
/* Snapshots                                                           */
/* ------------------------------------------------------------------ */

type TokenWithRefs = Token & { counter: Counter; meal: Meal };

export async function getQueueSnapshot(k: QueueKey) {
  const [counter, meal, tokens] = await Promise.all([
    prisma.counter.findUnique({ where: { id: k.counterId } }),
    prisma.meal.findUnique({ where: { id: k.mealId } }),
    prisma.token.findMany({
      where: k,
      orderBy: { tokenNumber: 'asc' },
      include: { user: { select: { id: true, name: true, rollNumber: true } } },
    }),
  ]);
  if (!counter) throw notFound('Counter not found');
  if (!meal) throw notFound('Meal session not found');
  const estimate = await getServiceEstimate(k, counter);

  const called = tokens.find((t) => t.status === 'CALLED') ?? null;
  const waiting = tokens.filter((t) => t.status === 'WAITING');
  const counts = { WAITING: 0, CALLED: 0, SERVED: 0, SKIPPED: 0, CANCELLED: 0 } as Record<TokenStatus, number>;
  for (const t of tokens) counts[t.status as TokenStatus]++;

  const positions = new Map(waiting.map((t, i) => [t.id, i + 1]));
  const lastServed = tokens
    .filter((t) => t.status === 'SERVED' && t.servedAt)
    .sort((a, b) => b.servedAt!.getTime() - a.servedAt!.getTime())[0];

  return {
    key: k,
    counter,
    meal,
    estimate,
    nowServing: called
      ? { ...called, display: formatTokenNumber(counter.code, called.tokenNumber) }
      : null,
    lastServed: lastServed ? formatTokenNumber(counter.code, lastServed.tokenNumber) : null,
    counts,
    total: tokens.length,
    nextWaitSecs: estimateWait(waiting.length, !!called, estimate.secsPerToken),
    tokens: tokens.map((t) => {
      const position = positions.get(t.id) ?? null;
      return {
        ...t,
        display: formatTokenNumber(counter.code, t.tokenNumber),
        position,
        etaSecs: position ? estimateWait(position - 1, !!called, estimate.secsPerToken) : null,
      };
    }),
  };
}

/** Public queue summary shown to students before they book. */
export async function getQueueStatus(k: QueueKey) {
  const snap = await getQueueSnapshot(k);
  const service = await getMessService();
  return {
    counter: { id: snap.counter.id, name: snap.counter.name, code: snap.counter.code, isActive: snap.counter.isActive, isPaused: snap.counter.isPaused },
    meal: { id: snap.meal.id, name: snap.meal.name, type: snap.meal.type, startTime: snap.meal.startTime, endTime: snap.meal.endTime },
    bookable: isBookable(snap.meal, service),
    nowServing: snap.nowServing?.display ?? null,
    waitingCount: snap.counts.WAITING,
    servedCount: snap.counts.SERVED,
    estimatedWaitSecs: snap.nextWaitSecs,
    secsPerToken: snap.estimate.secsPerToken,
    estimateSource: snap.estimate.source,
  };
}

/** Live details for a single token: position, ETA, and now-serving for its queue. */
export async function describeToken(token: TokenWithRefs) {
  const k = keyOf(token);
  const [called, ahead, estimate] = await Promise.all([
    prisma.token.findFirst({ where: { ...k, status: 'CALLED' }, select: { tokenNumber: true, id: true } }),
    token.status === 'WAITING'
      ? prisma.token.count({ where: { ...k, status: 'WAITING', tokenNumber: { lt: token.tokenNumber } } })
      : Promise.resolve(null),
    getServiceEstimate(k, token.counter),
  ]);
  return {
    id: token.id,
    tokenNumber: token.tokenNumber,
    display: formatTokenNumber(token.counter.code, token.tokenNumber),
    status: token.status,
    date: token.date,
    counter: { id: token.counter.id, name: token.counter.name, code: token.counter.code, isPaused: token.counter.isPaused },
    meal: { id: token.meal.id, name: token.meal.name, type: token.meal.type, startTime: token.meal.startTime, endTime: token.meal.endTime },
    position: ahead === null ? null : ahead + 1,
    tokensAhead: ahead,
    estimatedWaitSecs: ahead === null ? null : estimateWait(ahead, !!called && called.id !== token.id, estimate.secsPerToken),
    secsPerToken: estimate.secsPerToken,
    estimateSource: estimate.source,
    nowServing: called ? formatTokenNumber(token.counter.code, called.tokenNumber) : null,
    recallCount: token.recallCount,
    createdAt: token.createdAt,
    calledAt: token.calledAt,
    servedAt: token.servedAt,
    skippedAt: token.skippedAt,
    cancelledAt: token.cancelledAt,
    canCancel: token.status === 'WAITING',
  };
}

/* ------------------------------------------------------------------ */
/* Turn-approaching notifications                                      */
/* ------------------------------------------------------------------ */

/**
 * Notifies every waiting student who now has `approachThreshold` or fewer tokens
 * ahead. The `approachingNotified` flag (set with a conditional update) makes
 * this idempotent, so each token gets the alert at most once.
 */
async function notifyApproaching(k: QueueKey): Promise<Notification[]> {
  const service = await getMessService();
  const waiting = await prisma.token.findMany({
    where: { ...k, status: 'WAITING' },
    orderBy: { tokenNumber: 'asc' },
    take: service.approachThreshold + 1,
    include: { counter: true },
  });
  const out: Notification[] = [];
  for (const [ahead, t] of waiting.entries()) {
    if (t.approachingNotified) continue;
    const created = await prisma.$transaction(async (tx) => {
      const flagged = await tx.token.updateMany({
        where: { id: t.id, status: 'WAITING', approachingNotified: false },
        data: { approachingNotified: true },
      });
      if (!flagged.count) return null;
      const display = formatTokenNumber(t.counter.code, t.tokenNumber);
      return createNotification(tx, {
        userId: t.userId,
        tokenId: t.id,
        type: 'TURN_APPROACHING',
        title: ahead === 0 ? "You're next in line" : 'Your turn is approaching',
        message:
          ahead === 0
            ? `Token ${display} is next at ${t.counter.name}. Please be ready at the counter.`
            : `Only ${ahead} ${ahead === 1 ? 'token is' : 'tokens are'} ahead of ${display} at ${t.counter.name}. Please head to the counter.`,
      });
    });
    if (created) out.push(created);
  }
  return out;
}

async function afterQueueChange(k: QueueKey, reason: string, notifications: Notification[] = []) {
  const approaching = await notifyApproaching(k);
  deliver([...notifications, ...approaching]);
  emitQueue(k, reason);
}

/* ------------------------------------------------------------------ */
/* Student actions                                                     */
/* ------------------------------------------------------------------ */

const tokenInclude = { counter: true, meal: true } as const;

export async function generateToken(userId: string, counterId: string, mealId: string) {
  const [counter, meal, service, user] = await Promise.all([
    prisma.counter.findUnique({ where: { id: counterId } }),
    prisma.meal.findUnique({ where: { id: mealId } }),
    getMessService(),
    prisma.user.findUnique({ where: { id: userId }, select: { role: true, isActive: true } }),
  ]);
  if (!user || user.role !== 'STUDENT' || !user.isActive) throw forbidden('Only active students can generate tokens.');
  if (!counter) throw notFound('Counter not found');
  if (!meal) throw notFound('Meal session not found');
  if (!counter.isActive) throw badRequest(`${counter.name} is currently closed.`);
  if (counter.isPaused) throw conflict(`${counter.name} has paused new tokens. Please try again shortly or pick another counter.`);
  const bookable = isBookable(meal, service);
  if (!bookable.ok) throw badRequest(bookable.reason!);

  const k: QueueKey = { counterId, mealId, date: todayStr() };
  const activeKey = activeKeyOf(userId, k);

  const token = await withLock(lockKey(k), async () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        return await prisma.$transaction(async (tx) => {
          const existing = await tx.token.findUnique({ where: { activeKey } });
          if (existing) {
            throw conflict(
              `You already have an active token (${formatTokenNumber(counter.code, existing.tokenNumber)}) for ${meal.name} at ${counter.name}.`,
              { tokenId: existing.id },
            );
          }
          // Re-check the pause flag inside the transaction to close the race with "Pause Queue".
          const fresh = await tx.counter.findUniqueOrThrow({ where: { id: counterId }, select: { isPaused: true, isActive: true } });
          if (fresh.isPaused || !fresh.isActive) throw conflict(`${counter.name} is not accepting new tokens right now.`);

          const last = await tx.token.aggregate({ where: k, _max: { tokenNumber: true } });
          const tokenNumber = (last._max.tokenNumber ?? 0) + 1;
          const created = await tx.token.create({
            data: { ...k, userId, tokenNumber, status: 'WAITING', activeKey },
            include: tokenInclude,
          });
          await logEvent(tx, 'TOKEN_GENERATED', counterId, { tokenId: created.id, actorId: userId, details: { tokenNumber } });
          const notification = await createNotification(tx, {
            userId,
            tokenId: created.id,
            type: 'TOKEN_GENERATED',
            title: 'Token generated',
            message: `Your token ${formatTokenNumber(counter.code, tokenNumber)} for ${meal.name} at ${counter.name} is confirmed.`,
          });
          return { created, notification };
        });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          const target = String(err.meta?.target ?? '');
          if (target.includes('activeKey')) throw conflict(`You already have an active token for ${meal.name} at ${counter.name}.`);
          continue; // token number collision – retry with the next number
        }
        throw err;
      }
    }
    throw conflict('The queue is very busy right now. Please try again.');
  });

  await afterQueueChange(k, 'generated', [token.notification]);
  return describeToken(token.created);
}

export async function cancelToken(userId: string, tokenId: string) {
  const token = await prisma.token.findUnique({ where: { id: tokenId }, include: tokenInclude });
  if (!token || token.userId !== userId) throw notFound('Token not found');
  assertTransition(token.status, 'CANCELLED');
  const k = keyOf(token);
  const display = formatTokenNumber(token.counter.code, token.tokenNumber);

  const notification = await withLock(lockKey(k), () =>
    prisma.$transaction(async (tx) => {
      const res = await tx.token.updateMany({
        where: { id: tokenId, status: 'WAITING' },
        data: { status: 'CANCELLED', cancelledAt: new Date(), activeKey: null, calledKey: null },
      });
      if (!res.count) throw conflict('This token can no longer be cancelled because its status has changed.');
      await logEvent(tx, 'TOKEN_CANCELLED', token.counterId, { tokenId, actorId: userId, details: { by: 'STUDENT' } });
      return createNotification(tx, {
        userId,
        tokenId,
        type: 'TOKEN_CANCELLED',
        title: 'Token cancelled',
        message: `Your token ${display} for ${token.meal.name} at ${token.counter.name} has been cancelled.`,
      });
    }),
  );
  await afterQueueChange(k, 'cancelled', [notification]);
  const updated = await prisma.token.findUniqueOrThrow({ where: { id: tokenId }, include: tokenInclude });
  return describeToken(updated);
}

export async function getActiveTokens(userId: string) {
  const tokens = await prisma.token.findMany({
    where: { userId, date: todayStr(), status: { in: ['WAITING', 'CALLED'] } },
    include: tokenInclude,
    orderBy: { createdAt: 'desc' },
  });
  return Promise.all(tokens.map(describeToken));
}

export async function getTokenForStudent(userId: string, tokenId: string) {
  const token = await prisma.token.findUnique({ where: { id: tokenId }, include: tokenInclude });
  if (!token || token.userId !== userId) throw notFound('Token not found');
  return describeToken(token);
}

export async function getTokenHistory(userId: string, limit = 30) {
  const tokens = await prisma.token.findMany({
    where: { userId },
    include: tokenInclude,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return tokens.map((t) => ({
    id: t.id,
    display: formatTokenNumber(t.counter.code, t.tokenNumber),
    status: t.status,
    date: t.date,
    counter: { id: t.counter.id, name: t.counter.name },
    meal: { id: t.meal.id, name: t.meal.name, type: t.meal.type },
    createdAt: t.createdAt,
    calledAt: t.calledAt,
    servedAt: t.servedAt,
    waitSecs: t.calledAt ? Math.round(secondsBetween(t.createdAt, t.calledAt)) : null,
  }));
}

/* ------------------------------------------------------------------ */
/* Staff actions                                                       */
/* ------------------------------------------------------------------ */

export async function callNext(staffId: string, counterId: string, mealId: string) {
  const counter = await prisma.counter.findUnique({ where: { id: counterId } });
  if (!counter) throw notFound('Counter not found');
  if (!counter.isActive) throw badRequest(`${counter.name} is inactive.`);
  const meal = await prisma.meal.findUnique({ where: { id: mealId } });
  if (!meal) throw notFound('Meal session not found');
  const k: QueueKey = { counterId, mealId, date: todayStr() };

  const result = await withLock(lockKey(k), async () => {
    try {
      return await prisma.$transaction(async (tx) => {
        const current = await tx.token.findFirst({ where: { ...k, status: 'CALLED' } });
        if (current) {
          throw conflict(
            `Token ${formatTokenNumber(counter.code, current.tokenNumber)} is still at the counter. Mark it served or skip it before calling the next token.`,
          );
        }
        const next = await tx.token.findFirst({ where: { ...k, status: 'WAITING' }, orderBy: { tokenNumber: 'asc' } });
        if (!next) throw notFound('There are no waiting tokens in this queue.');

        const updated = await tx.token.updateMany({
          where: { id: next.id, status: 'WAITING' },
          data: { status: 'CALLED', calledAt: new Date(), calledKey: calledKeyOf(k) },
        });
        if (!updated.count) throw conflict('Queue changed while calling. Please try again.');
        await logEvent(tx, 'TOKEN_CALLED', counterId, { tokenId: next.id, actorId: staffId, details: { tokenNumber: next.tokenNumber } });
        const display = formatTokenNumber(counter.code, next.tokenNumber);
        const notification = await createNotification(tx, {
          userId: next.userId,
          tokenId: next.id,
          type: 'TOKEN_CALLED',
          title: `Token ${display} is being called`,
          message: `It's your turn! Please proceed to ${counter.name} now to collect your ${meal.name.toLowerCase()}.`,
        });
        return { tokenId: next.id, notification };
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw conflict('Another token is already being served at this counter.');
      }
      throw err;
    }
  });

  await afterQueueChange(k, 'called', [result.notification]);
  return getQueueSnapshot(k);
}

async function loadTokenForStaff(tokenId: string) {
  const token = await prisma.token.findUnique({ where: { id: tokenId }, include: tokenInclude });
  if (!token) throw notFound('Token not found');
  return token;
}

export async function recallToken(staffId: string, tokenId: string) {
  const token = await loadTokenForStaff(tokenId);
  if (token.status !== 'CALLED') throw conflict('Only the token currently at the counter can be recalled.');
  const k = keyOf(token);
  const display = formatTokenNumber(token.counter.code, token.tokenNumber);
  const notification = await prisma.$transaction(async (tx) => {
    const res = await tx.token.updateMany({ where: { id: tokenId, status: 'CALLED' }, data: { recallCount: { increment: 1 } } });
    if (!res.count) throw conflict('This token is no longer being called.');
    await logEvent(tx, 'TOKEN_RECALLED', token.counterId, { tokenId, actorId: staffId, details: { recall: token.recallCount + 1 } });
    return createNotification(tx, {
      userId: token.userId,
      tokenId,
      type: 'TOKEN_RECALLED',
      title: `Reminder: token ${display} is being called`,
      message: `${token.counter.name} is waiting for you. Please collect your meal now or your token may be skipped.`,
    });
  });
  await afterQueueChange(k, 'recalled', [notification]);
  return getQueueSnapshot(k);
}

export async function serveToken(staffId: string, tokenId: string) {
  return finishToken(staffId, tokenId, 'SERVED');
}

export async function skipToken(staffId: string, tokenId: string) {
  return finishToken(staffId, tokenId, 'SKIPPED');
}

async function finishToken(staffId: string, tokenId: string, to: 'SERVED' | 'SKIPPED') {
  const token = await loadTokenForStaff(tokenId);
  assertTransition(token.status, to);
  const k = keyOf(token);
  const display = formatTokenNumber(token.counter.code, token.tokenNumber);
  const now = new Date();

  const notification = await withLock(lockKey(k), () =>
    prisma.$transaction(async (tx) => {
      const res = await tx.token.updateMany({
        where: { id: tokenId, status: token.status },
        data: {
          status: to,
          activeKey: null,
          calledKey: null,
          ...(to === 'SERVED' ? { servedAt: now } : { skippedAt: now }),
        },
      });
      if (!res.count) throw conflict('This token was updated by someone else. Refresh and try again.');
      await logEvent(tx, to === 'SERVED' ? 'TOKEN_SERVED' : 'TOKEN_SKIPPED', token.counterId, {
        tokenId,
        actorId: staffId,
        details: {
          from: token.status,
          ...(token.calledAt && to === 'SERVED' ? { serviceSecs: Math.round(secondsBetween(token.calledAt, now)) } : {}),
        },
      });
      return createNotification(
        tx,
        to === 'SERVED'
          ? {
              userId: token.userId,
              tokenId,
              type: 'TOKEN_SERVED',
              title: 'Enjoy your meal!',
              message: `Token ${display} has been served at ${token.counter.name}.`,
            }
          : {
              userId: token.userId,
              tokenId,
              type: 'TOKEN_SKIPPED',
              title: `Token ${display} was skipped`,
              message: `Your token at ${token.counter.name} was skipped${token.status === 'CALLED' ? ' because you were not at the counter' : ''}. You can generate a new token if needed.`,
            },
      );
    }),
  );
  await afterQueueChange(k, to.toLowerCase(), [notification]);
  return getQueueSnapshot(k);
}

export async function setPaused(staffId: string, counterId: string, paused: boolean) {
  const counter = await prisma.counter.findUnique({ where: { id: counterId } });
  if (!counter) throw notFound('Counter not found');
  if (counter.isPaused === paused) throw conflict(`The queue is already ${paused ? 'paused' : 'running'}.`);
  const updated = await prisma.$transaction(async (tx) => {
    const c = await tx.counter.update({ where: { id: counterId }, data: { isPaused: paused } });
    await logEvent(tx, paused ? 'QUEUE_PAUSED' : 'QUEUE_RESUMED', counterId, { actorId: staffId });
    return c;
  });
  events.broadcast({ type: 'counter.updated', data: { counterId } });
  return updated;
}

export async function getActivity(counterId: string | undefined, limit: number) {
  const items = await prisma.queueEvent.findMany({
    where: counterId ? { counterId } : {},
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      counter: { select: { id: true, name: true, code: true } },
      actor: { select: { id: true, name: true, role: true } },
      token: { select: { id: true, tokenNumber: true, user: { select: { name: true } } } },
    },
  });
  return items.map((e) => ({
    id: e.id,
    type: e.type,
    createdAt: e.createdAt,
    counter: e.counter,
    actor: e.actor,
    token: e.token ? { id: e.token.id, display: formatTokenNumber(e.counter.code, e.token.tokenNumber), studentName: e.token.user.name } : null,
    details: e.details ? JSON.parse(e.details) : null,
  }));
}
