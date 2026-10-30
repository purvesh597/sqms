import { Clock3, Hash, MapPin, Users, UtensilsCrossed } from 'lucide-react';
import type { TokenDetail } from '../types';
import { cn } from '../utils/cn';
import { formatClock, formatTime, formatWait } from '../utils/format';
import { StatusBadge } from './ui';

/** The student's digital token, styled like a physical ticket. */
export function TokenCard({ token, footer, compact }: { token: TokenDetail; footer?: React.ReactNode; compact?: boolean }) {
  const called = token.status === 'CALLED';
  const ordinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  return (
    <div className={cn('overflow-hidden rounded-2xl border bg-white shadow-card', called ? 'border-amber-300 ring-4 ring-amber-100' : 'border-line')}>
      <div className={cn('relative px-6 pb-6 pt-5', called ? 'bg-amber-50' : 'bg-navy-900 text-white')}>
        <div className="flex items-center justify-between gap-3">
          <p className={cn('flex items-center gap-1.5 text-[13px] font-medium', called ? 'text-amber-800' : 'text-navy-200')}>
            <MapPin className="h-3.5 w-3.5" /> {token.counter.name}
          </p>
          <StatusBadge status={token.status} />
        </div>
        <p className={cn('mt-3 text-xs font-medium uppercase tracking-wider', called ? 'text-amber-700' : 'text-navy-300')}>Token number</p>
        <p className={cn('tabular mt-0.5 font-bold tracking-tight', compact ? 'text-4xl' : 'text-5xl sm:text-6xl', called ? 'text-amber-900' : 'text-white')}>{token.display}</p>
        {called && <p className="mt-2 text-sm font-semibold text-amber-800">Please proceed to the counter now.</p>}
        {token.counter.isPaused && token.status === 'WAITING' && (
          <p className="mt-2 text-[13px] text-amber-300">This counter has paused new tokens. Your place in line is safe.</p>
        )}
      </div>

      {/* Ticket perforation */}
      <div className="relative h-0">
        <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full border border-line bg-canvas" />
        <span className="absolute -right-3 -top-3 h-6 w-6 rounded-full border border-line bg-canvas" />
      </div>

      <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
        {[
          { icon: Hash, label: 'Queue position', value: token.position ? ordinal(token.position) : called ? 'At counter' : '—' },
          { icon: Clock3, label: 'Estimated wait', value: token.status === 'WAITING' ? formatWait(token.estimatedWaitSecs) : called ? 'Now' : '—' },
          { icon: Users, label: 'Now serving', value: token.nowServing ?? '—' },
          { icon: UtensilsCrossed, label: 'Meal session', value: token.meal.name },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-white px-5 py-4">
            <p className="flex items-center gap-1.5 text-xs text-ink-muted">
              <Icon className="h-3.5 w-3.5 text-ink-subtle" /> {label}
            </p>
            <p className="tabular mt-1 text-[15px] font-semibold text-ink">{value}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3 text-xs text-ink-muted">
        <span>
          Generated at {formatTime(token.createdAt)} · {token.meal.name} {formatClock(token.meal.startTime)}–{formatClock(token.meal.endTime)}
        </span>
        {token.status === 'WAITING' && (
          <span title="How the estimate is calculated">
            {token.estimateSource === 'observed' ? 'Based on live service speed' : 'Based on standard service time'} · ~{Math.round(token.secsPerToken)}s per token
          </span>
        )}
      </div>
      {footer && <div className="border-t border-line bg-gray-50/60 px-5 py-3">{footer}</div>}
    </div>
  );
}
