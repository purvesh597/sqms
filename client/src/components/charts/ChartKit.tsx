import type { ReactNode } from 'react';
import type { TooltipProps } from 'recharts';

/** Validated categorical slots (light surface): primary blue, teal. */
export const SERIES = { primary: '#2557E0', secondary: '#0F9F8F' };
export const AXIS = { stroke: '#E6E8EE', tick: { fill: '#8A92A1', fontSize: 12 } };

export function ChartTooltip({ active, payload, label, labelFormatter, valueFormatter }: TooltipProps<number, string> & { valueFormatter?: (v: number, name: string) => string; labelFormatter?: (l: any) => ReactNode }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2 text-xs shadow-pop">
      <p className="mb-1 font-medium text-ink">{labelFormatter ? labelFormatter(label) : label}</p>
      {payload.map((p) => (
        <p key={String(p.dataKey)} className="flex items-center gap-2 text-ink-muted">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          {p.name}
          <span className="tabular ml-auto pl-3 font-semibold text-ink">{valueFormatter ? valueFormatter(Number(p.value), String(p.name)) : p.value}</span>
        </p>
      ))}
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-ink-muted">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: i.color }} /> {i.label}
        </span>
      ))}
    </div>
  );
}
