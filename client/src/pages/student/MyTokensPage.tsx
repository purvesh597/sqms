import { useState } from 'react';
import { Link } from 'react-router-dom';
import { History, Ticket, TicketPlus, XCircle } from 'lucide-react';
import { TokenCard } from '../../components/TokenCard';
import { Button, Card, CardHeader, ConfirmDialog, EmptyState, ErrorState, PageHeader, Skeleton, StatusBadge, Table, Td, Th, Tr } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { useActiveTokens } from '../../hooks/useActiveTokens';
import { useFetch } from '../../hooks/useFetch';
import { useLiveEvent } from '../../hooks/useLive';
import { getErrorMessage } from '../../services/api';
import { studentService } from '../../services/student.service';
import type { TokenDetail } from '../../types';
import { formatDate, formatSecs, formatTime } from '../../utils/format';

export default function MyTokensPage() {
  const toast = useToast();
  const active = useActiveTokens();
  const history = useFetch(() => studentService.history(30), []);
  useLiveEvent(['queue.updated', 'notification'], () => history.reload());
  const [cancelling, setCancelling] = useState<TokenDetail | null>(null);
  const [busy, setBusy] = useState(false);

  async function confirmCancel() {
    if (!cancelling) return;
    setBusy(true);
    try {
      await studentService.cancel(cancelling.id);
      toast.success('Token cancelled', `${cancelling.display} has been removed from the queue.`);
      setCancelling(null);
      active.reload();
      history.reload();
    } catch (err) {
      toast.error('Could not cancel token', getErrorMessage(err));
      active.reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="My tokens"
        description="Track your live queue position and review past tokens."
        actions={
          <Link to="/student/generate">
            <Button icon={<TicketPlus className="h-4 w-4" />}>Generate token</Button>
          </Link>
        }
      />

      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold">
          <Ticket className="h-4 w-4 text-ink-subtle" /> Active
        </h2>
        {active.loading ? (
          <Skeleton className="h-[300px] rounded-2xl" />
        ) : active.error ? (
          <Card><ErrorState message={active.error} onRetry={active.retry} /></Card>
        ) : !active.data?.length ? (
          <Card>
            <EmptyState
              icon={<Ticket className="h-5 w-5" />}
              title="No active tokens"
              description="Tokens you generate today will appear here with live updates."
              action={<Link to="/student/generate"><Button>Generate token</Button></Link>}
            />
          </Card>
        ) : (
          <div className="grid gap-6 xl:grid-cols-2">
            {active.data.map((t) => (
              <TokenCard
                key={t.id}
                token={t}
                footer={
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-ink-muted">
                      {t.canCancel ? 'Not hungry anymore? Free up your spot for others.' : 'Called tokens cannot be cancelled. Please collect your meal.'}
                    </p>
                    {t.canCancel && (
                      <Button size="sm" variant="outline-danger" icon={<XCircle className="h-3.5 w-3.5" />} onClick={() => setCancelling(t)}>
                        Cancel token
                      </Button>
                    )}
                  </div>
                }
              />
            ))}
          </div>
        )}
      </section>

      <Card>
        <CardHeader title={<span className="flex items-center gap-2"><History className="h-4 w-4 text-ink-subtle" /> Token history</span>} description="Your last 30 tokens" />
        {history.loading ? (
          <div className="space-y-2 p-5">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : history.error ? (
          <ErrorState message={history.error} onRetry={history.retry} />
        ) : !history.data?.length ? (
          <EmptyState title="No tokens yet" description="Your token history will be shown here." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Token</Th>
                <Th>Date</Th>
                <Th>Meal</Th>
                <Th>Counter</Th>
                <Th>Generated</Th>
                <Th>Wait time</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {history.data.map((t) => (
                <Tr key={t.id}>
                  <Td className="tabular font-semibold">{t.display}</Td>
                  <Td className="text-ink-muted">{formatDate(t.date, { day: 'numeric', month: 'short' })}</Td>
                  <Td>{t.meal.name}</Td>
                  <Td className="text-ink-muted">{t.counter.name}</Td>
                  <Td className="tabular text-ink-muted">{formatTime(t.createdAt)}</Td>
                  <Td className="tabular text-ink-muted">{formatSecs(t.waitSecs)}</Td>
                  <Td><StatusBadge status={t.status} /></Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <ConfirmDialog
        open={!!cancelling}
        onClose={() => setCancelling(null)}
        onConfirm={confirmCancel}
        loading={busy}
        tone="danger"
        title="Cancel this token?"
        confirmLabel="Yes, cancel token"
        message={
          <>
            Token <strong className="text-ink">{cancelling?.display}</strong> will be removed from the {cancelling?.counter.name} queue and you will lose your place in line. You can generate a new token afterwards.
          </>
        }
      />
    </div>
  );
}
