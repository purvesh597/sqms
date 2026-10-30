import { cn } from '../utils/cn';

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('h-8 w-8', className)} aria-hidden>
      <rect width="32" height="32" rx="8" fill="#111D36" />
      <rect x="8" y="9" width="16" height="3" rx="1.5" fill="#6094FA" />
      <rect x="8" y="14.5" width="11" height="3" rx="1.5" fill="#fff" />
      <rect x="8" y="20" width="6" height="3" rx="1.5" fill="#fff" opacity=".6" />
    </svg>
  );
}

export function Logo({ collapsed, light }: { collapsed?: boolean; light?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark className={light ? '[&>rect:first-child]:fill-white/10' : undefined} />
      {!collapsed && (
        <div className="leading-tight">
          <p className={cn('text-[15px] font-semibold tracking-tight', light ? 'text-white' : 'text-ink')}>SQMS</p>
          <p className={cn('text-[11px]', light ? 'text-navy-300' : 'text-ink-subtle')}>Smart Mess Queue</p>
        </div>
      )}
    </div>
  );
}
