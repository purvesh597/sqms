import { useEffect, useMemo, useState } from 'react';
import { BellRing, CheckCircle2, Clock3, Megaphone, PauseCircle, PlayCircle, Search, SkipForward, Timer, Users, XCircle } from 'lucide-react';
import { Badge, Button, Card, CardHeader, ConfirmDialog, EmptyState, ErrorState, Input, PageHeader, PageLoader, SegmentedTabs, Select, Skeleton, StatCard, StatusBadge, Table, Td, Th, Tr } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useFetch } from '../../hooks/useFetch';
import { useLiveEvent } from '../../hooks/useLive';
import { useMeta } from '../../hooks/useMeta';
import { getErrorMessage } from '../../services/api';
import { staffService } from '../../services/staff.service';
import type { QueueSnapshot, QueueToken, TokenStatus } from '../../types';
import { cn } from '../../utils/cn';
import { formatClock, formatRelative, formatSecs, formatTime, formatWait } from '../../utils/format';

type Filter = 'ACTIVE' | TokenStatus | 'ALL';
type Action = 'call' | 'recall' | 'serve' | 'skip' | 'pause' | 'resume';

export default function QueueConsole() {
  const { user } = useAuth();
  const toast = useToast();
  const meta = useMeta();
  const [counterId, setCounterId] = useState('');
  const [mealId, setMealId] = useState('');
  const [filter, setFilter] = useState<Filter>('ACTIVE');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<Action | null>(null);
  const [skipTarget, setSkipTarget] = useState<QueueToken | null>(null);
  const [pauseConfirm, setPauseConfirm] = useState(false);

  useEffect(() => {
    if (!meta.data) return;
    if (!counterId) {
      const assigned = meta.data.counters.find((c) => c.id === user?.assignedCounterId && c.isActive);
      setCounterId(assigned?.id ?? meta.data.counters.find((c) => c.isActive)?.id ?? '');
    }
    if (!mealId && meta.data.currentMeal) setMealId(meta.data.currentMeal.id);
  }, [meta.data, counterId, mealId, user]);

  const queue = useFetch(() => staffService.queue(counterId, mealId), [counterId, mealId], { enabled: !!counterId && !!mealId, pollMs: 10_000 });
  useLiveEvent(['queue.updated', 'counter.updated'], (d) => {
    if (!d?.counterId || d.counterId === counterId) queue.reload();
  });

  const snap = queue.data;
  const counter = meta.data?.counters.find((c) => c.id === counterId);
  const isPaused = snap?.counter.isPaused ?? counter?.isPaused ?? false;

  async function run(action: Action, fn: () => Promise<QueueSnapshot | unknown>, success?: string) {
    setBusy(action);
    try {
      const result = await fn();
      if (result && typeof result === 'object' && 'tokens' in result) queue.setData(result as QueueSnapshot);
      else queue.reload();
      if (success) toast.success(success);
      return true;
    } catch (err) {
      toast.error('Action failed', getErrorMessage(err));
      queue.reload();
      return false;
    } finally {
      setBusy(null);
    }
  }

  const callNext = () =>
    run('call', async () => {
      const s = await staffService.callNext(counterId, mealId);
      toast.success(`Calling ${s.nowServing?.display}`, `${s.nowServing?.user.name} has been notified.`);
      return s;
    });

  const counts = snap?.counts;
  const visible = useMemo(() => {
    if (!snap) return [];
    const q = search.trim().toLowerCase();
    return snap.tokens
      .filter((t) => (filter === 'ALL' ? true : filter === 'ACTIVE' ? t.status === 'WAITING' || t.status === 'CALLED' : t.status === filter))
      .filter((t) => !q || t.display.toLowerCase().includes(q) || t.user.name.toLowerCase().includes(q) || t.user.rollNumber?.toLowerCase().includes(q))
      .sort((a, b) => (filter === 'ACTIVE' || filter === 'WAITING' ? a.tokenNumber - b.tokenNumber : b.tokenNumber - a.tokenNumber));
  }, [snap, filter, search]);

  if (meta.loading) return <PageLoader />;
  if (meta.error) return <Card><ErrorState message={meta.error} onRetry={meta.retry} /></Card>;
  const meal = meta.data!.meals.find((m) => m.id === mealId);
  const now = snap?.nowServing;
  const upNext = snap?.tokens.filter((t) => t.status === 'WAITING').slice(0, 4) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live queue"
        description={meal ? `${meal.name} · ${formatClock(meal.startTime)} – ${formatClock(meal.endTime)}` : 'Select a meal session'}
        actions={
          <>
            <Select aria-label="Counter" value={counterId} onChange={(e) => setCounterId(e.target.value)} className="min-w-[200px]">
              {meta.data!.counters.map((c) => (
                <option key={c.id} value={c.id} disabled={!c.isActive}>
                  {c.name}
                  {!c.isActive ? ' (inactive)' : ''}
                </option>
              ))}
            </Select>
            <Select aria-label="Meal session" value={mealId} onChange={(e) => setMealId(e.target.value)} className="min-w-[140px]">
              {meta.data!.meals.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </Select>
            {isPaused ? (
              <Button variant="success" icon={<PlayCircle className="h-4 w-4" />} loading={busy === 'resume'} onClick={() => run('resume', () => staffService.resume(counterId), 'Queue resumed — students can book tokens again.')}>
                Resume queue
              </Button>
            ) : (
              <Button variant="secondary" icon={<PauseCircle className="h-4 w-4" />} disabled={!counterId} onClick={() => setPauseConfirm(true)}>
                Pause queue
              </Button>
            )}
          </>
        }
      />

      {isPaused && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
          <PauseCircle className="h-4 w-4 shrink-0" />
          <span><strong>New token generation is paused</strong> for {counter?.name}. You can keep serving students already in line.</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Now serving" loading={queue.loading} value={now?.display ?? '—'} icon={<Megaphone className="h-4 w-4" />} accent="amber" />
        <StatCard label="Waiting" loading={queue.loading} value={counts?.WAITING ?? 0} hint={snap ? `New tokens wait ${formatWait(snap.nextWaitSecs).toLowerCase()}` : undefined} icon={<Users className="h-4 w-4" />} accent="blue" />
        <StatCard label="Served" loading={queue.loading} value={counts?.SERVED ?? 0} icon={<CheckCircle2 className="h-4 w-4" />} accent="green" />
        <StatCard label="Skipped" loading={queue.loading} value={counts?.SKIPPED ?? 0} icon={<SkipForward className="h-4 w-4" />} accent="red" />
        <StatCard label="Cancelled" loading={queue.loading} value={counts?.CANCELLED ?? 0} icon={<XCircle className="h-4 w-4" />} accent="gray" />
        <StatCard
          label="Avg per token"
          loading={queue.loading}
          value={snap ? formatSecs(snap.estimate.secsPerToken) : '—'}
          hint={snap?.estimate.source === 'observed' ? 'Observed today' : 'Configured default'}
          icon={<Timer className="h-4 w-4" />}
          accent="navy"
        />
      </div>

      {queue.error ? (
        <Card><ErrorState message={queue.error} onRetry={queue.retry} /></Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-3">
          {/* Counter control */}
          <Card className="overflow-hidden xl:col-span-1">
            <div className={cn('px-6 py-6 text-center', now ? 'bg-amber-50' : 'bg-navy-900 text-white')}>
              <p className={cn('text-xs font-medium uppercase tracking-wider', now ? 'text-amber-700' : 'text-navy-300')}>{now ? 'At the counter' : 'Counter is free'}</p>
              {queue.loading ? (
                <Skeleton className="mx-auto mt-3 h-14 w-40 bg-white/20" />
              ) : now ? (
                <>
                  <p className="tabular mt-1 text-6xl font-bold tracking-tight text-amber-900">{now.display}</p>
                  <p className="mt-2 text-sm font-medium text-amber-900">{now.user.name}</p>
                  <p className="text-xs text-amber-700">
                    {now.user.rollNumber} · called {formatRelative(now.calledAt!)}
                    {now.recallCount > 0 && ` · recalled ${now.recallCount}×`}
                  </p>
                </>
              ) : (
                <>
                  <p className="tabular mt-1 text-6xl font-bold tracking-tight">{upNext[0]?.display ?? '—'}</p>
                  <p className="mt-2 text-sm text-navy-200">{upNext[0] ? `Next: ${upNext[0].user.name}` : 'No one is waiting'}</p>
                </>
              )}
            </div>
            <div className="space-y-3 p-5">
              {now ? (
                <>
                  <Button size="lg" variant="success" className="w-full" loading={busy === 'serve'} icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => run('serve', () => staffService.serve(now.id), `${now.display} marked as served`)}>
                    Mark served
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="secondary" loading={busy === 'recall'} icon={<BellRing className="h-4 w-4" />} onClick={() => run('recall', () => staffService.recall(now.id), `Reminder sent to ${now.user.name}`)}>
                      Recall
                    </Button>
                    <Button variant="outline-danger" icon={<SkipForward className="h-4 w-4" />} onClick={() => setSkipTarget(now)}>
                      Skip
                    </Button>
                  </div>
                  <p className="text-center text-xs text-ink-subtle">Serve or skip this token to call the next one.</p>
                </>
              ) : (
                <>
                  <Button size="lg" className="w-full" disabled={!counts?.WAITING} loading={busy === 'call'} icon={<Megaphone className="h-4 w-4" />} onClick={callNext}>
                    Call next token
                  </Button>
                  <p className="text-center text-xs text-ink-subtle">{counts?.WAITING ? `${counts.WAITING} student${counts.WAITING > 1 ? 's' : ''} waiting` : 'The queue is empty.'}</p>
                </>
              )}
            </div>
            <div className="border-t border-line px-5 py-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-subtle">Up next</p>
              {upNext.length === 0 ? (
                <p className="text-[13px] text-ink-muted">No waiting tokens.</p>
              ) : (
                <ul className="space-y-1.5">
                  {upNext.map((t) => (
                    <li key={t.id} className="flex items-center justify-between gap-2 text-[13px]">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="tabular w-12 font-semibold">{t.display}</span>
                        <span className="truncate text-ink-muted">{t.user.name}</span>
                      </span>
                      <span className="tabular shrink-0 text-xs text-ink-subtle">{formatWait(t.etaSecs)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          {/* Queue table */}
          <Card className="xl:col-span-2">
            <CardHeader
              title="Queue"
              description={snap ? `${snap.total} tokens today${snap.lastServed ? ` · last served ${snap.lastServed}` : ''}` : undefined}
              action={
                <Input
                  aria-label="Search tokens"
                  placeholder="Search token or name"
                  icon={<Search className="h-4 w-4" />}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  containerClassName="w-full sm:w-56"
                />
              }
            />
            <div className="border-b border-line px-5 py-3">
              <SegmentedTabs
                value={filter}
                onChange={setFilter}
                options={[
                  { value: 'ACTIVE', label: 'In queue', count: (counts?.WAITING ?? 0) + (counts?.CALLED ?? 0) },
                  { value: 'SERVED', label: 'Served', count: counts?.SERVED ?? 0 },
                  { value: 'SKIPPED', label: 'Skipped', count: counts?.SKIPPED ?? 0 },
                  { value: 'CANCELLED', label: 'Cancelled', count: counts?.CANCELLED ?? 0 },
                  { value: 'ALL', label: 'All', count: snap?.total ?? 0 },
                ]}
              />
            </div>
            {queue.loading ? (
              <div className="space-y-2 p-5">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-11" />)}</div>
            ) : visible.length === 0 ? (
              <EmptyState
                icon={<Clock3 className="h-5 w-5" />}
                title={search ? 'No matching tokens' : filter === 'ACTIVE' ? 'Queue is empty' : 'Nothing here yet'}
                description={filter === 'ACTIVE' && !search ? 'New tokens appear here instantly as students book them.' : undefined}
              />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Token</Th>
                    <Th>Student</Th>
                    <Th>Generated</Th>
                    <Th>Position</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((t) => (
                    <Tr key={t.id} className={t.status === 'CALLED' ? 'bg-amber-50/60 hover:bg-amber-50' : undefined}>
                      <Td className="tabular font-semibold">{t.display}</Td>
                      <Td>
                        <p className="font-medium">{t.user.name}</p>
                        <p className="text-xs text-ink-subtle">{t.user.rollNumber}</p>
                      </Td>
                      <Td className="tabular text-ink-muted">{formatTime(t.createdAt)}</Td>
                      <Td className="tabular">
                        {t.position ? (
                          <span>
                            #{t.position} <span className="text-xs text-ink-subtle">· {formatWait(t.etaSecs)}</span>
                          </span>
                        ) : t.status === 'CALLED' ? (
                          <Badge tone="amber">At counter</Badge>
                        ) : (
                          <span className="text-ink-subtle">—</span>
                        )}
                      </Td>
                      <Td><StatusBadge status={t.status} /></Td>
                      <Td className="text-right">
                        {t.status === 'CALLED' ? (
                          <div className="flex justify-end gap-1.5">
                            <Button size="sm" variant="secondary" disabled={!!busy} onClick={() => run('recall', () => staffService.recall(t.id), `Reminder sent to ${t.user.name}`)}>Recall</Button>
                            <Button size="sm" variant="success" disabled={!!busy} onClick={() => run('serve', () => staffService.serve(t.id), `${t.display} marked as served`)}>Served</Button>
                            <Button size="sm" variant="outline-danger" disabled={!!busy} onClick={() => setSkipTarget(t)}>Skip</Button>
                          </div>
                        ) : t.status === 'WAITING' ? (
                          <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => setSkipTarget(t)}>Skip</Button>
                        ) : (
                          <span className="tabular text-xs text-ink-subtle">
                            {t.status === 'SERVED' ? formatTime(t.servedAt) : t.status === 'SKIPPED' ? formatTime(t.skippedAt) : formatTime(t.cancelledAt)}
                          </span>
                        )}
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={!!skipTarget}
        onClose={() => setSkipTarget(null)}
        tone="danger"
        title={`Skip token ${skipTarget?.display}?`}
        confirmLabel="Skip token"
        loading={busy === 'skip'}
        message={
          <>
            <strong className="text-ink">{skipTarget?.user.name}</strong> will be removed from the queue and notified. {skipTarget?.status === 'CALLED' ? 'Use this when the student does not arrive after being called.' : 'This student has not been called yet.'}
          </>
        }
        onConfirm={async () => {
          const t = skipTarget!;
          if (await run('skip', () => staffService.skip(t.id), `${t.display} skipped`)) setSkipTarget(null);
        }}
      />
      <ConfirmDialog
        open={pauseConfirm}
        onClose={() => setPauseConfirm(false)}
        title="Pause new tokens?"
        confirmLabel="Pause queue"
        loading={busy === 'pause'}
        message={`Students won't be able to generate new tokens for ${counter?.name} until you resume. Tokens already in line are not affected.`}
        onConfirm={async () => {
          if (await run('pause', () => staffService.pause(counterId), 'Queue paused')) setPauseConfirm(false);
          meta.reload();
        }}
      />
    </div>
  );
}
