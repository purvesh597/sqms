import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';
import { STATUS_META } from '../../utils/format';
import type { TokenStatus } from '../../types';

export type Tone = 'blue' | 'amber' | 'green' | 'red' | 'gray' | 'navy';

const tones: Record<Tone, string> = {
  blue: 'bg-brand-50 text-brand-700 ring-brand-600/15',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  red: 'bg-red-50 text-red-700 ring-red-600/15',
  gray: 'bg-gray-100 text-gray-600 ring-gray-500/15',
  navy: 'bg-navy-900 text-white ring-navy-900',
};

const dots: Record<Tone, string> = {
  blue: 'bg-brand-500',
  amber: 'bg-amber-500',
  green: 'bg-emerald-500',
  red: 'bg-red-500',
  gray: 'bg-gray-400',
  navy: 'bg-white',
};

export function Badge({ tone = 'gray', dot, children, className }: { tone?: Tone; dot?: boolean; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset', tones[tone], className)}>
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dots[tone])} />}
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: TokenStatus }) {
  const m = STATUS_META[status];
  return (
    <Badge tone={m.tone} dot>
      {m.label}
    </Badge>
  );
}
