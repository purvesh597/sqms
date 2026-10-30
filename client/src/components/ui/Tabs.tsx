import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

export function SegmentedTabs<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode; count?: number }[];
  className?: string;
}) {
  return (
    <div className={cn('scrollbar-thin inline-flex max-w-full gap-1 overflow-x-auto rounded-lg border border-line bg-gray-50 p-1', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors',
            value === o.value ? 'bg-white text-ink shadow-sm ring-1 ring-line' : 'text-ink-muted hover:text-ink',
          )}
        >
          {o.label}
          {o.count !== undefined && (
            <span className={cn('tabular rounded px-1.5 text-[11px]', value === o.value ? 'bg-navy-900 text-white' : 'bg-gray-200 text-ink-muted')}>
              {o.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
