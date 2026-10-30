import { BellRing, CheckCircle2, Clock, Megaphone, SkipForward, Ticket, XCircle, type LucideIcon } from 'lucide-react';
import type { NotificationType } from '../types';
import { cn } from '../utils/cn';

const map: Record<NotificationType, { icon: LucideIcon; cls: string }> = {
  TOKEN_GENERATED: { icon: Ticket, cls: 'bg-navy-50 text-navy-600' },
  TURN_APPROACHING: { icon: Clock, cls: 'bg-amber-50 text-amber-600' },
  TOKEN_CALLED: { icon: Megaphone, cls: 'bg-brand-50 text-brand-600' },
  TOKEN_RECALLED: { icon: BellRing, cls: 'bg-brand-50 text-brand-600' },
  TOKEN_SERVED: { icon: CheckCircle2, cls: 'bg-emerald-50 text-emerald-600' },
  TOKEN_SKIPPED: { icon: SkipForward, cls: 'bg-red-50 text-red-600' },
  TOKEN_CANCELLED: { icon: XCircle, cls: 'bg-gray-100 text-gray-500' },
};

export function NotificationIcon({ type, className }: { type: NotificationType; className?: string }) {
  const m = map[type] ?? map.TOKEN_GENERATED;
  const Icon = m.icon;
  return (
    <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', m.cls, className)}>
      <Icon className="h-4 w-4" />
    </span>
  );
}
