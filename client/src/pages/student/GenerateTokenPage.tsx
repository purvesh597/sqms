import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Check, CheckCircle2, Clock3, PauseCircle, Store, Ticket, Users } from 'lucide-react';
import { MealIcon } from '../../components/MealIcon';
import { MealStateBadge } from '../../components/MealStateBadge';
import { TokenCard } from '../../components/TokenCard';
import { Badge, Button, Card, CardHeader, EmptyState, ErrorState, PageHeader, PageLoader, Skeleton } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { useActiveTokens } from '../../hooks/useActiveTokens';
import { useFetch } from '../../hooks/useFetch';
import { useLiveEvent } from '../../hooks/useLive';
import { useMeta } from '../../hooks/useMeta';
import { getErrorMessage } from '../../services/api';
import { commonService } from '../../services/common.service';
import { studentService } from '../../services/student.service';
import type { TokenDetail } from '../../types';
import { cn } from '../../utils/cn';
import { formatClock, formatWait } from '../../utils/format';

function Step({ n, title, done, children }: { n: number; title: string; done?: boolean; children: React.ReactNode }) {
  return (
    <Card>
      <div className="flex items-center gap-3 border-b border-line px-5 py-4">
        <span className={cn('flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold', done ? 'bg-emerald-500 text-white' : 'bg-navy-900 text-white')}>
          {done ? <Check className="h-3.5 w-3.5" /> : n}
        </span>
        <h3 className="text-[15px] font-semibold">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </Card>
  );
}

export default function GenerateTokenPage() {
  const toast = useToast();
  const meta = useMeta();
  const active = useActiveTokens();
  const [mealId, setMealId] = useState<string>('');
  const [counterId, setCounterId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<TokenDetail | null>(null);

  useEffect(() => {
    if (!mealId && meta.data?.currentMeal) setMealId(meta.data.currentMeal.id);
  }, [meta.data, mealId]);

  const counters = useMemo(() => meta.data?.counters.filter((c) => c.isActive) ?? [], [meta.data]);
  const statuses = useFetch(
    () => (mealId ? Promise.all(counters.map((c) => commonService.queueStatus(c.id, mealId))) : Promise.resolve([])),
    [mealId, counters.map((c) => c.id + c.isPaused).join()],
    { enabled: !!mealId && counters.length > 0, pollMs: 20_000 },
  );
  useLiveEvent(['queue.updated', 'counter.updated'], () => statuses.reload());

  // Keep the confirmation screen live too.
  useLiveEvent(['queue.updated', 'notification'], () => {
    if (created) studentService.get(created.id).then(setCreated).catch(() => undefined);
  });

  const meal = meta.data?.meals.find((m) => m.id === mealId);
  const status = statuses.data?.find((s) => s.counter.id === counterId);
  const existing = active.data?.find((t) => t.meal.id === mealId && t.counter.id === counterId);

  async function generate() {
    if (!mealId || !counterId) return;
    setSubmitting(true);
    setError(null);
    try {
      const token = await studentService.generate(counterId, mealId);
      setCreated(token);
      toast.success('Token generated', `${token.display} · ${token.counter.name}`);
      active.reload();
    } catch (err) {
      setError(getErrorMessage(err));
      statuses.reload();
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-6 w-6" />
          </span>
          <h1 className="mt-4 text-[22px] font-semibold tracking-tight">Your token is confirmed</h1>
          <p className="mt-1 text-sm text-ink-muted">We'll notify you when your turn is approaching and again when you're called.</p>
        </div>
        <TokenCard token={created} />
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Link to="/student/tokens">
            <Button className="w-full sm:w-auto" icon={<Ticket className="h-4 w-4" />}>Track my token</Button>
          </Link>
          <Link to="/student">
            <Button variant="secondary" className="w-full sm:w-auto">Back to dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (meta.loading) return <PageLoader />;
  if (meta.error) return <Card><ErrorState message={meta.error} onRetry={meta.retry} /></Card>;

  const meals = meta.data!.meals;

  return (
    <div>
      <PageHeader
        title="Generate token"
        description="Choose a meal session and counter. Your place in line is reserved the moment you confirm."
        actions={
          <Link to="/student">
            <Button variant="ghost" icon={<ArrowLeft className="h-4 w-4" />}>Back</Button>
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Step n={1} title="Select meal session" done={!!mealId}>
            <div className="grid gap-3 sm:grid-cols-2">
              {meals.map((m) => {
                const disabled = !m.bookable.ok;
                return (
                  <button
                    key={m.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      setMealId(m.id);
                      setError(null);
                    }}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border p-4 text-left transition-all',
                      mealId === m.id ? 'border-brand-500 bg-brand-50/50 ring-1 ring-brand-500' : 'border-line hover:border-gray-300 hover:bg-gray-50',
                      disabled && 'cursor-not-allowed opacity-50 hover:border-line hover:bg-white',
                    )}
                  >
                    <MealIcon type={m.type} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{m.name}</p>
                      <p className="tabular text-xs text-ink-muted">{formatClock(m.startTime)} – {formatClock(m.endTime)}</p>
                      {disabled && <p className="mt-1 text-[11px] text-ink-subtle">{m.bookable.reason}</p>}
                    </div>
                    {m.isActive && <MealStateBadge state={m.state} />}
                  </button>
                );
              })}
            </div>
          </Step>

          <Step n={2} title="Choose a counter" done={!!counterId}>
            {!mealId ? (
              <p className="text-sm text-ink-muted">Select a meal session first.</p>
            ) : counters.length === 0 ? (
              <EmptyState icon={<Store className="h-5 w-5" />} title="No counters open" description="All counters are currently closed. Please check back shortly." />
            ) : statuses.loading ? (
              <div className="grid gap-3 sm:grid-cols-2">{counters.map((c) => <Skeleton key={c.id} className="h-[132px] rounded-xl" />)}</div>
            ) : statuses.error ? (
              <ErrorState message={statuses.error} onRetry={statuses.retry} />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {statuses.data?.map((s) => {
                  const paused = s.counter.isPaused;
                  const selected = counterId === s.counter.id;
                  return (
                    <button
                      key={s.counter.id}
                      type="button"
                      disabled={paused}
                      onClick={() => {
                        setCounterId(s.counter.id);
                        setError(null);
                      }}
                      className={cn(
                        'rounded-xl border p-4 text-left transition-all',
                        selected ? 'border-brand-500 bg-brand-50/50 ring-1 ring-brand-500' : 'border-line hover:border-gray-300 hover:bg-gray-50',
                        paused && 'cursor-not-allowed bg-gray-50 opacity-70 hover:border-line',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy-900 text-[13px] font-bold text-white">{s.counter.code}</span>
                          <p className="text-sm font-semibold">{s.counter.name}</p>
                        </div>
                        {paused ? (
                          <Badge tone="amber"><PauseCircle className="h-3 w-3" /> Paused</Badge>
                        ) : (
                          <Badge tone="green" dot>Open</Badge>
                        )}
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <div>
                          <p className="text-[11px] text-ink-subtle">Waiting</p>
                          <p className="tabular text-[15px] font-semibold">{s.waitingCount}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-ink-subtle">Serving</p>
                          <p className="tabular text-[15px] font-semibold">{s.nowServing ?? '—'}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-ink-subtle">Est. wait</p>
                          <p className="tabular text-[15px] font-semibold">{formatWait(s.estimatedWaitSecs)}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </Step>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardHeader title="Review & confirm" description="Check your selection before generating." />
            <div className="space-y-4 p-5">
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-muted">Meal session</dt>
                  <dd className="font-medium">{meal?.name ?? '—'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-muted">Counter</dt>
                  <dd className="text-right font-medium">{status?.counter.name ?? '—'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="flex items-center gap-1.5 text-ink-muted"><Users className="h-3.5 w-3.5" /> Your position</dt>
                  <dd className="tabular font-medium">{status ? `#${status.waitingCount + 1}` : '—'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="flex items-center gap-1.5 text-ink-muted"><Clock3 className="h-3.5 w-3.5" /> Estimated wait</dt>
                  <dd className="tabular font-medium">{status ? formatWait(status.estimatedWaitSecs) : '—'}</dd>
                </div>
              </dl>

              {existing && (
                <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[13px] text-amber-800">
                  <AlertCircle className="mt-px h-4 w-4 shrink-0" />
                  <span>
                    You already hold token <strong>{existing.display}</strong> for this queue.{' '}
                    <Link to="/student/tokens" className="font-medium underline">View it</Link>
                  </span>
                </div>
              )}
              {error && (
                <div role="alert" className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-[13px] text-red-700">
                  <AlertCircle className="mt-px h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                size="lg"
                className="w-full"
                disabled={!mealId || !counterId || !!existing || status?.counter.isPaused}
                loading={submitting}
                onClick={generate}
                icon={<Ticket className="h-4 w-4" />}
              >
                Confirm & generate token
              </Button>
              <p className="text-center text-xs text-ink-subtle">You can cancel a waiting token at any time.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
