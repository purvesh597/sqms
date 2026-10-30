import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CheckCircle2, Clock3, Download, FileSpreadsheet, SkipForward, Ticket, XCircle } from 'lucide-react';
import { AXIS, ChartTooltip, Legend, SERIES } from '../../components/charts/ChartKit';
import { MealIcon } from '../../components/MealIcon';
import { Button, Card, CardHeader, ErrorState, Input, PageHeader, PageLoader, SegmentedTabs, Select, StatCard, Table, Td, Th, Tr } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { useFetch } from '../../hooks/useFetch';
import { useMeta } from '../../hooks/useMeta';
import { adminService, type ReportFilters } from '../../services/admin.service';
import { getErrorMessage } from '../../services/api';
import type { StatBlock } from '../../types';
import { formatDate, formatSecs, shiftDate, toDateInput } from '../../utils/format';

const today = toDateInput();
const RANGES = [
  { value: '7', label: '7 days' },
  { value: '14', label: '14 days' },
  { value: '30', label: '30 days' },
  { value: 'custom', label: 'Custom' },
] as const;
type Range = (typeof RANGES)[number]['value'];

function Cells({ s }: { s: StatBlock }) {
  return (
    <>
      <Td className="tabular text-right">{s.generated}</Td>
      <Td className="tabular text-right">{s.served}</Td>
      <Td className="tabular text-right">{s.skipped}</Td>
      <Td className="tabular text-right">{s.cancelled}</Td>
      <Td className="tabular text-right text-ink-muted">{formatSecs(s.avgWaitSecs)}</Td>
      <Td className="tabular text-right text-ink-muted">{formatSecs(s.avgServiceSecs)}</Td>
      <Td className="tabular text-right">{s.generated ? `${s.serviceRate}%` : '—'}</Td>
    </>
  );
}
const Heads = ({ first }: { first: string }) => (
  <tr>
    <Th>{first}</Th>
    {['Tokens', 'Served', 'Skipped', 'Cancelled', 'Avg wait', 'Avg service', 'Served %'].map((h) => <Th key={h} className="text-right">{h}</Th>)}
  </tr>
);

export default function ReportsPage() {
  const toast = useToast();
  const meta = useMeta();
  const [range, setRange] = useState<Range>('7');
  const [filters, setFilters] = useState<ReportFilters>({ from: shiftDate(today, -6), to: today, counterId: '', mealId: '' });
  const [exporting, setExporting] = useState<string | null>(null);
  const invalid = filters.from > filters.to;
  const report = useFetch(() => adminService.report(filters), [filters.from, filters.to, filters.counterId, filters.mealId], { enabled: !invalid });

  function pickRange(r: Range) {
    setRange(r);
    if (r !== 'custom') setFilters((f) => ({ ...f, from: shiftDate(today, -(Number(r) - 1)), to: today }));
  }

  async function exportCsv(type: 'summary' | 'tokens') {
    setExporting(type);
    try {
      await adminService.exportCsv(filters, type);
      toast.success('Report downloaded', type === 'summary' ? 'Daily, counter and meal summary (CSV)' : 'Token-level log (CSV)');
    } catch (err) {
      toast.error('Export failed', getErrorMessage(err));
    } finally {
      setExporting(null);
    }
  }

  const r = report.data;
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & analytics"
        description="Token volumes, service performance and waiting times."
        actions={
          <>
            <Button variant="secondary" icon={<FileSpreadsheet className="h-4 w-4" />} loading={exporting === 'tokens'} disabled={invalid} onClick={() => exportCsv('tokens')}>Export token log</Button>
            <Button icon={<Download className="h-4 w-4" />} loading={exporting === 'summary'} disabled={invalid} onClick={() => exportCsv('summary')}>Export report</Button>
          </>
        }
      />

      <Card className="flex flex-wrap items-end gap-3 p-4">
        <div className="space-y-1.5">
          <p className="text-[13px] font-medium">Period</p>
          <SegmentedTabs value={range} onChange={pickRange} options={RANGES.map((x) => ({ value: x.value, label: x.label }))} />
        </div>
        <Input label="From" type="date" max={today} value={filters.from} onChange={(e) => { setRange('custom'); setFilters({ ...filters, from: e.target.value }); }} containerClassName="w-[150px]" />
        <Input label="To" type="date" max={today} value={filters.to} onChange={(e) => { setRange('custom'); setFilters({ ...filters, to: e.target.value }); }} error={invalid ? 'Must be after From' : undefined} containerClassName="w-[150px]" />
        <Select label="Counter" value={filters.counterId} onChange={(e) => setFilters({ ...filters, counterId: e.target.value })} containerClassName="w-[200px]">
          <option value="">All counters</option>
          {meta.data?.counters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select label="Meal" value={filters.mealId} onChange={(e) => setFilters({ ...filters, mealId: e.target.value })} containerClassName="w-[150px]">
          <option value="">All meals</option>
          {meta.data?.meals.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </Select>
      </Card>

      {invalid ? (
        <Card><ErrorState message='The "From" date must be on or before the "To" date.' /></Card>
      ) : report.loading ? (
        <PageLoader />
      ) : report.error || !r ? (
        <Card><ErrorState message={report.error ?? 'No data'} onRetry={report.retry} /></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
            <StatCard label="Tokens generated" value={r.totals.generated} icon={<Ticket className="h-4 w-4" />} accent="blue" />
            <StatCard label="Served" value={r.totals.served} hint={`${r.totals.serviceRate}% of tokens`} icon={<CheckCircle2 className="h-4 w-4" />} accent="green" />
            <StatCard label="Skipped" value={r.totals.skipped} icon={<SkipForward className="h-4 w-4" />} accent="red" />
            <StatCard label="Cancelled" value={r.totals.cancelled} icon={<XCircle className="h-4 w-4" />} accent="gray" />
            <StatCard label="Avg waiting time" value={formatSecs(r.totals.avgWaitSecs)} hint={`Service ${formatSecs(r.totals.avgServiceSecs)} per token`} icon={<Clock3 className="h-4 w-4" />} accent="navy" />
          </div>

          <Card>
            <CardHeader title="Daily token generation" description={`${formatDate(r.filters.from, { day: 'numeric', month: 'short' })} – ${formatDate(r.filters.to, { day: 'numeric', month: 'short', year: 'numeric' })}`} action={<Legend items={[{ label: 'Generated', color: SERIES.primary }, { label: 'Served', color: SERIES.secondary }]} />} />
            <div className="h-[280px] px-2 pb-3 pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={r.daily} barGap={2} margin={{ left: 0, right: 16, top: 4, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={AXIS.stroke} />
                  <XAxis dataKey="date" tickFormatter={(v) => formatDate(v, { day: 'numeric', month: 'short' })} tickLine={false} axisLine={false} tick={AXIS.tick} minTickGap={16} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={AXIS.tick} width={32} />
                  <Tooltip content={<ChartTooltip labelFormatter={(l) => formatDate(l, { weekday: 'short', day: 'numeric', month: 'short' })} />} cursor={{ fill: '#F2F5FA' }} />
                  <Bar dataKey="generated" name="Generated" fill={SERIES.primary} radius={[4, 4, 0, 0]} maxBarSize={18} />
                  <Bar dataKey="served" name="Served" fill={SERIES.secondary} radius={[4, 4, 0, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader title="Counter-wise performance" />
              <Table>
                <thead><Heads first="Counter" /></thead>
                <tbody>
                  {r.counters.map((c) => (
                    <Tr key={c.id}>
                      <Td className="font-medium">{c.name}</Td>
                      <Cells s={c} />
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </Card>
            <Card>
              <CardHeader title="Meal-wise statistics" />
              <Table>
                <thead><Heads first="Meal" /></thead>
                <tbody>
                  {r.meals.map((m) => (
                    <Tr key={m.id}>
                      <Td><span className="flex items-center gap-2 font-medium"><MealIcon type={m.type} size="sm" /> {m.name}</span></Td>
                      <Cells s={m} />
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          </div>

          <Card>
            <CardHeader title="Daily breakdown" description="Skipped and cancelled tokens by day" />
            <Table>
              <thead><Heads first="Date" /></thead>
              <tbody>
                {[...r.daily].reverse().map((d) => (
                  <Tr key={d.date}>
                    <Td className="font-medium">{formatDate(d.date, { weekday: 'short', day: 'numeric', month: 'short' })}</Td>
                    <Cells s={d} />
                  </Tr>
                ))}
                <tr className="bg-gray-50/70 font-semibold">
                  <Td>Total</Td>
                  <Cells s={r.totals} />
                </tr>
              </tbody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}
