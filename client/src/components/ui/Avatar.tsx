import { cn } from '../../utils/cn';
import { initials } from '../../utils/format';

const palette = ['bg-brand-100 text-brand-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700', 'bg-navy-100 text-navy-700', 'bg-rose-100 text-rose-700'];

export function Avatar({ name, size = 'md', className }: { name: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const hash = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold',
        palette[hash % palette.length],
        size === 'sm' && 'h-7 w-7 text-[11px]',
        size === 'md' && 'h-8 w-8 text-xs',
        size === 'lg' && 'h-12 w-12 text-base',
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
