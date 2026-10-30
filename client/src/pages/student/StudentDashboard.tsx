import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, Clock3, Hash, Megaphone, TicketPlus, UtensilsCrossed } from 'lucide-react';
import { MealIcon, VegMark } from '../../components/MealIcon';
import { MealStateBadge } from '../../components/MealStateBadge';
import { TokenCard } from '../../components/TokenCard';
import { Button, Card, CardHeader, EmptyState, ErrorState, Skeleton, StatCard } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useActiveTokens } from '../../hooks/useActiveTokens';
import { useFetch } from '../../hooks/useFetch';
import { useLiveEvent } from '../../hooks/useLive';
import { useMeta } from '../../hooks/useMeta';
import { commonService } from '../../services/common.service';
import { formatClock, formatDate, formatWait, greeting } from '../../utils/format';

export default function StudentDashboard() {
  const { user } = useAuth();
  const meta = useMeta();
  const tokens = useActiveTokens();
  const menu = useFetch(() => commonService.menu(), []);
  useLiveEvent('menu.updated', () => menu.reload());

  const currentMeal = meta.data?.meals.find((m) => m.id === meta.data?.currentMeal?.id);
  const currentMenu = menu.data?.meals.find((m) => m.id === currentMeal?.id);
  const active = tokens.data?.[0];
  const firstName = user?.name.split(' ')[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-1.5 text-[13px] text-ink-muted">
            <CalendarDays className="h-3.5 w-3.5" /> {formatDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <h1 className="mt-1 text-[22px] font-semibold tracking-tight">
            {greeting()}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {active ? 'Here is the live status of your token.' : 'Book a token and skip the queue at the mess.'}
          </p>
        </div>
        <Link to="/student/generate">
          <Button icon={<TicketPlus className="h-4 w-4" />}>Generate token</Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Current session"
          loading={meta.loading}
          value={currentMeal?.name ?? 'No session'}
          hint={currentMeal ? `${formatClock(currentMeal.startTime)} – ${formatClock(currentMeal.endTime)}` : 'No active meals today'}
          icon={<UtensilsCrossed className="h-4 w-4" />}
          accent="navy"
        />
        <StatCard
          label="Queue position"
          loading={tokens.loading}
          value={active ? (active.status === 'CALLED' ? 'Called' : `#${active.position}`) : '—'}
          hint={active ? `${active.tokensAhead ?? 0} ahead of you` : 'No active token'}
          icon={<Hash className="h-4 w-4" />}
          accent="blue"
        />
        <StatCard
          label="Estimated wait"
          loading={tokens.loading}
          value={active ? (active.status === 'CALLED' ? 'Now' : formatWait(active.estimatedWaitSecs)) : '—'}
          hint={active ? (active.estimateSource === 'observed' ? 'From live service speed' : 'From standard service time') : 'Generate a token to see'}
          icon={<Clock3 className="h-4 w-4" />}
          accent="amber"
        />
        <StatCard
          label="Now serving"
          loading={tokens.loading}
          value={active?.nowServing ?? '—'}
          hint={active ? active.counter.name : 'At your counter'}
          icon={<Megaphone className="h-4 w-4" />}
          accent="green"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">Active token</h2>
            {tokens.data && tokens.data.length > 1 && (
              <Link to="/student/tokens" className="text-[13px] font-medium text-brand-600 hover:text-brand-700">
                View all {tokens.data.length}
              </Link>
            )}
          </div>
          {tokens.loading ? (
            <Skeleton className="h-[300px] w-full rounded-2xl" />
          ) : tokens.error ? (
            <Card><ErrorState message={tokens.error} onRetry={tokens.retry} /></Card>
          ) : active ? (
            <TokenCard
              token={active}
              footer={
                <Link to="/student/tokens" className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-600 hover:text-brand-700">
                  Manage token <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              }
            />
          ) : (
            <Card>
              <EmptyState
                icon={<TicketPlus className="h-5 w-5" />}
                title="You don't have an active token"
                description={currentMeal ? `Generate a token for ${currentMeal.name.toLowerCase()} and track your place in line live.` : 'Tokens can be generated during active meal sessions.'}
                action={
                  <Link to="/student/generate">
                    <Button>Generate token</Button>
                  </Link>
                }
              />
            </Card>
          )}
        </div>

        <Card className="lg:col-span-2">
          <CardHeader
            title={currentMeal ? `${currentMeal.name} menu` : "Today's menu"}
            description={currentMeal && `${formatClock(currentMeal.startTime)} – ${formatClock(currentMeal.endTime)}`}
            action={currentMeal && <MealStateBadge state={currentMeal.state} />}
          />
          <div className="p-2">
            {menu.loading ? (
              <div className="space-y-2 p-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}</div>
            ) : menu.error ? (
              <ErrorState message={menu.error} onRetry={menu.retry} />
            ) : !currentMenu?.items.length ? (
              <EmptyState icon={<UtensilsCrossed className="h-5 w-5" />} title="Menu not published yet" description="The mess team hasn't added items for this session." />
            ) : (
              <ul>
                {currentMenu.items.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-gray-50">
                    <VegMark isVeg={item.isVeg} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.name}</p>
                      {item.description && <p className="truncate text-xs text-ink-muted">{item.description}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="border-t border-line px-5 py-3">
            <Link to="/student/menu" className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-600 hover:text-brand-700">
              Full day menu <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </Card>
      </div>

      {meta.data && (
        <Card>
          <CardHeader title="Today's sessions" description="Meal timings at the mess" />
          <div className="grid divide-y divide-line sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
            {meta.data.meals.map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-5 py-4">
                <MealIcon type={m.type} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{m.name}</p>
                    {m.isActive ? <MealStateBadge state={m.state} /> : <span className="text-xs text-ink-subtle">Not served</span>}
                  </div>
                  <p className="tabular whitespace-nowrap text-xs text-ink-muted">
                    {formatClock(m.startTime)} – {formatClock(m.endTime)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
