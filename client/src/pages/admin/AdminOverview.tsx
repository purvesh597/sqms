import { Link } from 'react-router-dom';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowRight, CheckCircle2, Clock3, GraduationCap, PauseCircle, SkipForward, Ticket, Users, XCircle } from 'lucide-react';
import { AXIS, ChartTooltip, Legend, SERIES } from '../../components/charts/ChartKit';
import { MealIcon } from '../../components/MealIcon';
import { Badge, Card, CardHeader, ErrorState, PageHeader, PageLoader, StatCard, Table, Td, Th, Tr } from '../../components/ui';
import { useFetch } from '../../hooks/useFetch';
import { useLiveEvent } from '../../hooks/useLive';
import { adminService } from '../../services/admin.service';
import { formatDate, formatRelative, formatSecs } from '../../utils/format';
import { EVENT_META } from '../staff/ActivityPage';

const hourLabel = (h: number) => `${h % 12 || 12}${h < 12 ? 'a' : 'p'}`;

export default function AdminOverview() {
  const q = useFetch(() => adminService.overview(), [], { pollMs: 30_000 });
  useLiveEvent(['queue.updated', 'counter.updated'], () => q.reload());

  if (q.loading) return <PageLoader />;
  if (q.error || !q.data) return <Card><ErrorState message={q.error ?? 'No data'} onRetry={q.retry} /></Card>;
  const d = q.data;
  const t = d.totals;

  return (
    <div className="space-y-6">
      <PageHeader title="Overview" description={`Live mess operations for ${formatDate(d.date, { weekday: 'long', day: 'numeric', month: 'long' })}`} />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Registered students" value={t.students} hint={`${t.staff} active staff members`} icon={<GraduationCap className="h-4 w-4" />} accent="navy" />
        <StatCard label="Tokens today" value={t.tokensToday} hint={`${t.serviceRate}% served so far`} icon={<Ticket className="h-4 w-4" />} accent="blue" />
        <StatCard label="Waiting now" value={t.waitingNow} hint={`${t.calledNow} at counters`} icon={<Users className="h-4 w-4" />} accent="amber" />
        <StatCard label="Avg waiting time" value={formatSecs(t.avgWaitSecs)} hint={`Service ${formatSecs(t.avgServiceSecs)} per token`} icon={<Clock3 className="h-4 w-4" />} accent="navy" />
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard label="Served today" value={t.servedToday} icon={<CheckCircle2 className="h-4 w-4" />} accent="green" />
        <StatCard label="Skipped today" value={t.skippedToday} icon={<SkipForward className="h-4 w-4" />} accent="red" />
        <StatCard label="Cancelled today" value={t.cancelledToday} icon={<XCircle className="h-4 w-4" />} accent="gray" />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader
            title="Tokens over the last 7 days"
            description={`${d.weekTotals.generated} generated · ${d.weekTotals.served} served`}
            action={<Legend items={[{ label: 'Generated', color: SERIES.primary }, { label: 'Served', color: SERIES.secondary }]} />}
          />
          <div className="h-[260px] px-2 pb-3 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={d.weekly} margin={{ left: 0, right: 16, top: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="gGen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={SERIES.primary} stopOpacity={0.14} />
                    <stop offset="100%" stopColor={SERIES.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={AXIS.stroke} />
                <XAxis dataKey="date" tickFormatter={(v) => formatDate(v, { weekday: 'short' })} tickLine={false} axisLine={false} tick={AXIS.tick} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={AXIS.tick} width={32} />
                <Tooltip content={<ChartTooltip labelFormatter={(l) => formatDate(l, { weekday: 'long', day: 'numeric', month: 'short' })} />} cursor={{ stroke: '#C5D1E6' }} />
                <Area type="monotone" dataKey="generated" name="Generated" stroke={SERIES.primary} strokeWidth={2} fill="url(#gGen)" activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} />
                <Area type="monotone" dataKey="served" name="Served" stroke={SERIES.secondary} strokeWidth={2} fill="none" activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Tokens by hour" description="When students booked today" />
          <div className="h-[260px] px-2 pb-3 pt-4">
            {t.tokensToday === 0 ? (
              <p className="pt-20 text-center text-[13px] text-ink-muted">No tokens generated yet today.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.hourly} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={AXIS.stroke} />
                  <XAxis dataKey="hour" tickFormatter={hourLabel} tickLine={false} axisLine={false} tick={AXIS.tick} interval={1} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={AXIS.tick} width={28} />
                  <Tooltip content={<ChartTooltip labelFormatter={(h) => `${hourLabel(h)}m – ${hourLabel(h + 1)}m`} />} cursor={{ fill: '#F2F5FA' }} />
                  <Bar dataKey="tokens" name="Tokens" fill={SERIES.primary} radius={[4, 4, 0, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Meal-wise today" action={<Link to="/admin/reports" className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-600 hover:text-brand-700">Full reports <ArrowRight className="h-3.5 w-3.5" /></Link>} />
          <Table className="min-w-[520px]">
            <thead>
              <tr>
                <Th>Meal</Th>
                <Th className="text-right">Tokens</Th>
                <Th className="text-right">Served</Th>
                <Th className="text-right">Skipped</Th>
                <Th className="text-right">Avg wait</Th>
              </tr>
            </thead>
            <tbody>
              {d.byMealToday.map((m) => (
                <Tr key={m.id}>
                  <Td><span className="flex items-center gap-2.5"><MealIcon type={m.type} size="sm" /> {m.name}</span></Td>
                  <Td className="tabular text-right">{m.generated}</Td>
                  <Td className="tabular text-right">{m.served}</Td>
                  <Td className="tabular text-right">{m.skipped}</Td>
                  <Td className="tabular text-right text-ink-muted">{formatSecs(m.avgWaitSecs)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Counters right now" action={<Link to="/admin/counters" className="text-[13px] font-medium text-brand-600 hover:text-brand-700">Manage</Link>} />
          <ul className="divide-y divide-line">
            {d.counters.map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-5 py-3.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy-900 text-[13px] font-bold text-white">{c.code}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-ink-muted">{c.waiting} waiting · serving {c.nowServing ?? '—'}</p>
                </div>
                {!c.isActive ? <Badge>Inactive</Badge> : c.isPaused ? <Badge tone="amber"><PauseCircle className="h-3 w-3" /> Paused</Badge> : <Badge tone="green" dot>Open</Badge>}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <CardHeader title="Recent activity" />
        <ul className="divide-y divide-line">
          {d.recentActivity.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 text-[13px]">
              <Badge tone={EVENT_META[e.type]?.tone ?? 'gray'}>{EVENT_META[e.type]?.label ?? e.type}</Badge>
              {e.token && <span className="tabular font-semibold">{e.token}</span>}
              <span className="text-ink-muted">{e.counter}{e.actor ? ` · by ${e.actor}` : ''}</span>
              <span className="ml-auto text-xs text-ink-subtle">{formatRelative(e.createdAt)}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
