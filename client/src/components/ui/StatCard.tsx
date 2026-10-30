import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';
import { Card } from './Card';
import { Skeleton } from './States';

type Accent = 'navy' | 'blue' | 'green' | 'amber' | 'red' | 'gray';

const accents: Record<Accent, string> = {
  navy: 'bg-navy-50 text-navy-700',
  blue: 'bg-brand-50 text-brand-600',
  green: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  red: 'bg-red-50 text-red-600',
  gray: 'bg-gray-100 text-gray-500',
};

export function StatCard({
  label,
  value,
  icon,
  hint,
  accent = 'blue',
  loading,
  className,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  hint?: ReactNode;
  accent?: Accent;
  loading?: boolean;
  className?: string;
}) {
  return (
    <Card className={cn('p-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-ink-muted">{label}</p>
        {icon && <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', accents[accent])}>{icon}</span>}
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-7 w-16" />
      ) : (
        <p className="tabular mt-1 text-2xl font-semibold tracking-tight text-ink">{value}</p>
      )}
      {hint && <p className="mt-1 text-xs text-ink-subtle">{hint}</p>}
    </Card>
  );
}
