import type { Notification } from '@prisma/client';
import type { NotificationType } from '../config/constants';
import { prisma, type Tx } from '../prisma/client';
import { events } from './events.service';

export interface NotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  tokenId?: string;
}

export const createNotification = (tx: Tx, input: NotificationInput) => tx.notification.create({ data: input });

/** Push already-committed notifications to connected clients. */
export function deliver(notifications: Notification[]) {
  for (const n of notifications) events.toUser(n.userId, { type: 'notification', data: n });
}

export async function listNotifications(userId: string, opts: { unreadOnly?: boolean; limit?: number }) {
  const where = { userId, ...(opts.unreadOnly ? { isRead: false } : {}) };
  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: opts.limit ?? 50,
      include: { token: { select: { id: true, tokenNumber: true, status: true, counter: { select: { code: true, name: true } } } } },
    }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);
  return { items, unreadCount };
}

export async function markRead(userId: string, id: string) {
  const result = await prisma.notification.updateMany({ where: { id, userId }, data: { isRead: true } });
  return result.count > 0;
}

export async function markAllRead(userId: string) {
  const result = await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
  return result.count;
}
