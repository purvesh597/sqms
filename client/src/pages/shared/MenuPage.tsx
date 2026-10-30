import { useState } from 'react';
import { ChevronLeft, ChevronRight, Leaf, UtensilsCrossed } from 'lucide-react';
import { MealIcon, VegMark } from '../../components/MealIcon';
import { MealStateBadge } from '../../components/MealStateBadge';
import { Badge, Button, Card, EmptyState, ErrorState, IconButton, PageHeader, Skeleton } from '../../components/ui';
import { useFetch } from '../../hooks/useFetch';
import { useLiveEvent } from '../../hooks/useLive';
import { useMeta } from '../../hooks/useMeta';
import { commonService } from '../../services/common.service';
import { CATEGORY_LABEL, formatClock, formatDate, shiftDate, toDateInput } from '../../utils/format';

export default function MenuPage() {
  const today = toDateInput();
  const [date, setDate] = useState(today);
  const menu = useFetch(() => commonService.menu(date), [date]);
  const meta = useMeta();
  useLiveEvent('menu.updated', () => menu.reload());
  const states = new Map(meta.data?.meals.map((m) => [m.id, m.state]));
  const isToday = date === today;

  return (
    <div>
      <PageHeader
        title={isToday ? "Today's menu" : 'Mess menu'}
        description={formatDate(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        actions={
          <div className="flex items-center gap-1 rounded-lg border border-line bg-white p-1 shadow-sm">
            <IconButton label="Previous day" className="h-7 w-7" onClick={() => setDate((d) => shiftDate(d, -1))}>
              <ChevronLeft className="h-4 w-4" />
            </IconButton>
            <input
              type="date"
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className="h-7 rounded-md border-0 bg-transparent px-1 text-[13px] font-medium text-ink focus:ring-0"
              aria-label="Menu date"
            />
            <IconButton label="Next day" className="h-7 w-7" onClick={() => setDate((d) => shiftDate(d, 1))}>
              <ChevronRight className="h-4 w-4" />
            </IconButton>
            {!isToday && (
              <Button size="sm" variant="ghost" className="h-7" onClick={() => setDate(today)}>
                Today
              </Button>
            )}
          </div>
        }
      />

      {menu.loading ? (
        <div className="grid gap-4 md:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-56 rounded-xl" />)}</div>
      ) : menu.error ? (
        <Card><ErrorState message={menu.error} onRetry={menu.retry} /></Card>
      ) : menu.data && menu.data.meals.every((m) => !m.items.length) ? (
        <Card>
          <EmptyState icon={<UtensilsCrossed className="h-5 w-5" />} title="No menu published for this day" description="The mess administration hasn't added a menu for this date yet." />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {menu.data?.meals.map((meal) => {
            const vegOnly = meal.items.length > 0 && meal.items.every((i) => i.isVeg);
            const state = states.get(meal.id);
            return (
              <Card key={meal.id} className={!meal.isActive ? 'opacity-60' : undefined}>
                <div className="flex items-center gap-3 border-b border-line px-5 py-4">
                  <MealIcon type={meal.type} />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[15px] font-semibold">{meal.name}</h3>
                    <p className="tabular text-xs text-ink-muted">{formatClock(meal.startTime)} – {formatClock(meal.endTime)}</p>
                  </div>
                  {vegOnly && <Badge tone="green"><Leaf className="h-3 w-3" /> Pure veg</Badge>}
                  {isToday && state && meal.isActive && <MealStateBadge state={state} />}
                </div>
                {meal.items.length === 0 ? (
                  <p className="px-5 py-8 text-center text-[13px] text-ink-muted">{meal.isActive ? 'Menu not published yet.' : 'Not served today.'}</p>
                ) : (
                  <ul className="divide-y divide-line/70">
                    {meal.items.map((item) => (
                      <li key={item.id} className="flex items-center gap-3 px-5 py-3">
                        <VegMark isVeg={item.isVeg} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{item.name}</p>
                          {item.description && <p className="text-xs text-ink-muted">{item.description}</p>}
                        </div>
                        <span className="text-[11px] font-medium uppercase tracking-wide text-ink-subtle">{CATEGORY_LABEL[item.category]}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
