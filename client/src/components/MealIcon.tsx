import { Coffee, Cookie, Moon, Sun, type LucideIcon } from 'lucide-react';
import type { MealType } from '../types';
import { cn } from '../utils/cn';

const map: Record<MealType, { icon: LucideIcon; cls: string }> = {
  BREAKFAST: { icon: Coffee, cls: 'bg-amber-50 text-amber-600' },
  LUNCH: { icon: Sun, cls: 'bg-orange-50 text-orange-600' },
  SNACKS: { icon: Cookie, cls: 'bg-rose-50 text-rose-500' },
  DINNER: { icon: Moon, cls: 'bg-indigo-50 text-indigo-600' },
};

export function MealIcon({ type, className, size = 'md' }: { type: MealType; className?: string; size?: 'sm' | 'md' }) {
  const m = map[type];
  const Icon = m.icon;
  return (
    <span className={cn('inline-flex shrink-0 items-center justify-center rounded-lg', size === 'md' ? 'h-9 w-9' : 'h-7 w-7', m.cls, className)}>
      <Icon className={size === 'md' ? 'h-[18px] w-[18px]' : 'h-3.5 w-3.5'} />
    </span>
  );
}

export function VegMark({ isVeg }: { isVeg: boolean }) {
  return (
    <span
      title={isVeg ? 'Vegetarian' : 'Non-vegetarian'}
      className={cn('inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border', isVeg ? 'border-emerald-600' : 'border-red-600')}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', isVeg ? 'bg-emerald-600' : 'bg-red-600')} />
    </span>
  );
}
