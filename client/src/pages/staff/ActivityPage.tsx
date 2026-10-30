import { useState } from 'react';
import { History } from 'lucide-react';
import { Badge, Card, EmptyState, ErrorState, PageHeader, Select, Skeleton, Table, Td, Th, Tr, type Tone } from '../../components/ui';
import { useFetch } from '../../hooks/useFetch';
import { useLiveEvent } from '../../hooks/useLive';
import { useMeta } from '../../hooks/useMeta';
import { staffService } from '../../services/staff.service';
import { formatDateTime, formatSecs } from '../../utils/format';

export const EVENT_META: Record<string, { label: string; tone: Tone }> = {
  TOKEN_GENERATED: { label: 'Token generated', tone: 'gray' },
  TOKEN_CALLED: { label: 'Called', tone: 'amber' },
  TOKEN_RECALLED: { label: 'Recalled', tone: 'amber' },
  TOKEN_SERVED: { label: 'Served', tone: 'green' },
  TOKEN_SKIPPED: { label: 'Skipped', tone: 'red' },
  TOKEN_CANCELLED: { label: 'Cancelled', tone: 'gray' },
  QUEUE_PAUSED: { label: 'Queue paused', tone: 'navy' },
  QUEUE_RESUMED: { label: 'Queue resumed', tone: 'blue' },
};

export default function ActivityPage() {
  const meta = useMeta();
  const [counterId, setCounterId] = useState('');
  const [type, setType] = useState('');
  const events = useFetch(() => staffService.activity(counterId || undefined, 200), [counterId], { pollMs: 30_000 });
  useLiveEvent(['queue.updated', 'counter.updated'], () => events.reload());
  const rows = (events.data ?? []).filter((e) => !type || e.type === type);

  return (
    <div>
      <PageHeader
        title="Activity log"
        description="Every queue action is recorded for accountability."
        actions={
          <>
            <Select aria-label="Counter" value={counterId} onChange={(e) => setCounterId(e.target.value)} className="min-w-[180px]">
              <option value="">All counters</option>
              {meta.data?.counters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Select aria-label="Event type" value={type} onChange={(e) => setType(e.target.value)} className="min-w-[160px]">
              <option value="">All events</option>
              {Object.entries(EVENT_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </Select>
          </>
        }
      />
      <Card>
        {events.loading ? (
          <div className="space-y-2 p-5">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : events.error ? (
          <ErrorState message={events.error} onRetry={events.retry} />
        ) : rows.length === 0 ? (
          <EmptyState icon={<History className="h-5 w-5" />} title="No activity yet" description="Queue actions will be logged here." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Time</Th>
                <Th>Event</Th>
                <Th>Token</Th>
                <Th>Counter</Th>
                <Th>Performed by</Th>
                <Th>Details</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => {
                const m = EVENT_META[e.type] ?? { label: e.type, tone: 'gray' as Tone };
                const service = e.details?.serviceSecs as number | undefined;
                return (
                  <Tr key={e.id}>
                    <Td className="tabular text-ink-muted">{formatDateTime(e.createdAt)}</Td>
                    <Td><Badge tone={m.tone}>{m.label}</Badge></Td>
                    <Td>
                      {e.token ? (
                        <span><span className="tabular font-semibold">{e.token.display}</span> <span className="text-ink-muted">· {e.token.studentName}</span></span>
                      ) : (
                        <span className="text-ink-subtle">—</span>
                      )}
                    </Td>
                    <Td className="text-ink-muted">{e.counter.name}</Td>
                    <Td>{e.actor ? <span>{e.actor.name} <span className="text-xs text-ink-subtle">({e.actor.role.toLowerCase()})</span></span> : '—'}</Td>
                    <Td className="text-xs text-ink-muted">
                      {service ? `Service time ${formatSecs(service)}` : e.details?.recall ? `Reminder #${String(e.details.recall)}` : e.details?.note ? String(e.details.note) : e.details?.from ? `From ${String(e.details.from).toLowerCase()}` : ''}
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
