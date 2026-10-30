import { useState, type FormEvent } from 'react';
import { ChevronLeft, ChevronRight, ClipboardList, Copy, Pencil, Plus, Trash2 } from 'lucide-react';
import { MealIcon, VegMark } from '../../components/MealIcon';
import { Button, Card, ConfirmDialog, EmptyState, ErrorState, IconButton, Input, Modal, PageHeader, Select, Skeleton, Textarea, Toggle } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { useFetch } from '../../hooks/useFetch';
import { adminService } from '../../services/admin.service';
import { getErrorMessage, getFieldErrors } from '../../services/api';
import type { MenuCategory, MenuItem } from '../../types';
import { CATEGORY_LABEL, formatClock, formatDate, shiftDate, toDateInput } from '../../utils/format';

interface FormState {
  name: string;
  description: string;
  category: MenuCategory;
  isVeg: boolean;
  date: string;
  mealId: string;
}

export default function MenuManagementPage() {
  const toast = useToast();
  const [date, setDate] = useState(toDateInput());
  const meals = useFetch(() => adminService.meals(), []);
  const items = useFetch(() => adminService.menu(date), [date]);
  const [editing, setEditing] = useState<MenuItem | 'new' | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<MenuItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [copyFrom, setCopyFrom] = useState(shiftDate(toDateInput(), -1));
  const [replace, setReplace] = useState(false);

  function open(item: MenuItem | 'new', mealId?: string) {
    setEditing(item);
    setErrors({});
    setForm(
      item === 'new'
        ? { name: '', description: '', category: 'MAIN', isVeg: true, date, mealId: mealId ?? meals.data?.[0]?.id ?? '' }
        : { name: item.name, description: item.description ?? '', category: item.category, isVeg: item.isVeg, date: item.date, mealId: item.mealId },
    );
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    if (form.name.trim().length < 2) return setErrors({ name: 'Item name is required' });
    setSaving(true);
    const payload = { ...form, name: form.name.trim(), description: form.description.trim() || undefined };
    try {
      if (editing === 'new') await adminService.createMenuItem(payload as never);
      else await adminService.updateMenuItem((editing as MenuItem).id, payload as never);
      toast.success(editing === 'new' ? 'Menu item added' : 'Menu item updated', 'Students see the change immediately.');
      setEditing(null);
      if (payload.date !== date) setDate(payload.date);
      else items.reload();
    } catch (err) {
      setErrors(getFieldErrors(err));
      toast.error('Could not save item', getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await adminService.deleteMenuItem(deleting.id);
      toast.success('Menu item deleted', deleting.name);
      setDeleting(null);
      items.reload();
    } catch (err) {
      toast.error('Could not delete item', getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function copyMenu() {
    setBusy(true);
    try {
      const n = await adminService.copyMenu(copyFrom, date, replace);
      toast.success('Menu copied', `${n} items copied to ${formatDate(date, { day: 'numeric', month: 'short' })}.`);
      setCopyOpen(false);
      items.reload();
    } catch (err) {
      toast.error('Could not copy menu', getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Menu management"
        description={formatDate(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        actions={
          <>
            <div className="flex items-center gap-1 rounded-lg border border-line bg-white p-1 shadow-sm">
              <IconButton label="Previous day" className="h-7 w-7" onClick={() => setDate((d) => shiftDate(d, -1))}><ChevronLeft className="h-4 w-4" /></IconButton>
              <input type="date" aria-label="Menu date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="h-7 rounded-md border-0 bg-transparent px-1 text-[13px] font-medium focus:ring-0" />
              <IconButton label="Next day" className="h-7 w-7" onClick={() => setDate((d) => shiftDate(d, 1))}><ChevronRight className="h-4 w-4" /></IconButton>
            </div>
            <Button variant="secondary" icon={<Copy className="h-4 w-4" />} onClick={() => setCopyOpen(true)}>Copy from date</Button>
            <Button icon={<Plus className="h-4 w-4" />} onClick={() => open('new')} disabled={!meals.data?.length}>Add item</Button>
          </>
        }
      />

      {items.loading || meals.loading ? (
        <div className="grid gap-4 lg:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-56 rounded-xl" />)}</div>
      ) : items.error ? (
        <Card><ErrorState message={items.error} onRetry={items.retry} /></Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {meals.data?.map((meal) => {
            const list = items.data?.filter((i) => i.mealId === meal.id) ?? [];
            return (
              <Card key={meal.id}>
                <div className="flex items-center gap-3 border-b border-line px-5 py-3.5">
                  <MealIcon type={meal.type} />
                  <div className="flex-1">
                    <p className="text-[15px] font-semibold">{meal.name}</p>
                    <p className="text-xs text-ink-muted">{formatClock(meal.startTime)} – {formatClock(meal.endTime)} · {list.length} items</p>
                  </div>
                  <Button size="sm" variant="ghost" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => open('new', meal.id)}>Add</Button>
                </div>
                {list.length === 0 ? (
                  <EmptyState className="py-8" icon={<ClipboardList className="h-5 w-5" />} title="No items" description={`Add dishes for ${meal.name.toLowerCase()} on this date.`} />
                ) : (
                  <ul className="divide-y divide-line/70">
                    {list.map((item) => (
                      <li key={item.id} className="group flex items-center gap-3 px-5 py-2.5">
                        <VegMark isVeg={item.isVeg} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{item.name}</p>
                          <p className="truncate text-xs text-ink-subtle">{CATEGORY_LABEL[item.category]}{item.description ? ` · ${item.description}` : ''}</p>
                        </div>
                        <IconButton label={`Edit ${item.name}`} className="h-8 w-8" onClick={() => open(item)}><Pencil className="h-3.5 w-3.5" /></IconButton>
                        <IconButton label={`Delete ${item.name}`} className="h-8 w-8 hover:bg-red-50 hover:text-red-600" onClick={() => setDeleting(item)}><Trash2 className="h-3.5 w-3.5" /></IconButton>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={!!editing && !!form}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Add menu item' : 'Edit menu item'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="submit" form="menu-form" loading={saving}>{editing === 'new' ? 'Add item' : 'Save changes'}</Button>
          </>
        }
      >
        {form && (
          <form id="menu-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <Input containerClassName="sm:col-span-2" label="Item name" required placeholder="Paneer Butter Masala" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} />
            <Select label="Meal session" value={form.mealId} onChange={(e) => setForm({ ...form, mealId: e.target.value })} error={errors.mealId}>
              {meals.data?.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </Select>
            <Select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as MenuCategory })}>
              {Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
            <Input label="Menu date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} error={errors.date} />
            <div className="flex items-end pb-1.5">
              <div className="flex items-center gap-2 text-sm">
                <Toggle checked={form.isVeg} onChange={(v) => setForm({ ...form, isVeg: v })} />
                <VegMark isVeg={form.isVeg} /> {form.isVeg ? 'Vegetarian' : 'Non-vegetarian'}
              </div>
            </div>
            <div className="sm:col-span-2">
              <Textarea label="Description" placeholder="Optional short description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={copyOpen}
        onClose={() => setCopyOpen(false)}
        size="sm"
        title="Copy menu"
        description={`Copy all items from another date to ${formatDate(date, { day: 'numeric', month: 'short' })}.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCopyOpen(false)}>Cancel</Button>
            <Button loading={busy} onClick={copyMenu}>Copy menu</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Copy from" type="date" value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)} />
          <Toggle checked={replace} onChange={setReplace} label="Replace existing items" description="Remove the current items on the target date first." />
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={busy}
        tone="danger"
        title="Delete menu item?"
        confirmLabel="Delete item"
        message={<><strong className="text-ink">{deleting?.name}</strong> will be removed from the menu. Students will no longer see it.</>}
      />
    </div>
  );
}
