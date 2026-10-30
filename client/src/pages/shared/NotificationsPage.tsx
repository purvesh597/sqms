import { useState } from 'react';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { NotificationIcon } from '../../components/NotificationIcon';
import { Button, Card, EmptyState, PageHeader, SegmentedTabs, Skeleton } from '../../components/ui';
import { useNotifications } from '../../context/NotificationContext';
import { cn } from '../../utils/cn';
import { formatDateTime, formatRelative } from '../../utils/format';

export default function NotificationsPage() {
  const { items, unreadCount, loading, markRead, markAllRead } = useNotifications();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const shown = filter === 'unread' ? items.filter((n) => !n.isRead) : items;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Notifications"
        description="Queue alerts for your tokens. In-app notifications update in real time."
        actions={
          <Button variant="secondary" icon={<CheckCheck className="h-4 w-4" />} disabled={!unreadCount} onClick={markAllRead}>
            Mark all as read
          </Button>
        }
      />
      <SegmentedTabs
        className="mb-4"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: 'All', count: items.length },
          { value: 'unread', label: 'Unread', count: unreadCount },
        ]}
      />
      <Card>
        {loading ? (
          <div className="space-y-3 p-5">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : shown.length === 0 ? (
          <EmptyState
            icon={<Bell className="h-5 w-5" />}
            title={filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            description="You'll be notified when your token is generated, when your turn is approaching, and when you're called."
          />
        ) : (
          <ul className="divide-y divide-line">
            {shown.map((n) => (
              <li key={n.id} className={cn('flex gap-4 px-5 py-4', !n.isRead && 'bg-brand-50/30')}>
                <NotificationIcon type={n.type} className="h-9 w-9" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2">
                    <p className="text-sm font-semibold text-ink">{n.title}</p>
                    {!n.isRead && <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-label="Unread" />}
                  </div>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-ink-muted">{n.message}</p>
                  <p className="mt-1.5 text-xs text-ink-subtle" title={formatDateTime(n.createdAt)}>{formatRelative(n.createdAt)}</p>
                </div>
                {!n.isRead && (
                  <Button size="sm" variant="ghost" className="shrink-0 self-start" icon={<Check className="h-3.5 w-3.5" />} onClick={() => markRead(n.id)}>
                    <span className="hidden sm:inline">Mark read</span>
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
