import { useState, type FormEvent } from 'react';
import { Pencil, Plus, Store } from 'lucide-react';
import { Badge, Button, Card, EmptyState, ErrorState, Input, Modal, PageHeader, Skeleton, Textarea, Toggle } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { useFetch } from '../../hooks/useFetch';
import { useLiveEvent } from '../../hooks/useLive';
import { adminService } from '../../services/admin.service';
import { getErrorMessage, getFieldErrors } from '../../services/api';
import type { CounterWithStats } from '../../types';

interface FormState {
  name: string;
  code: string;
  description: string;
  serviceSecs: string;
}
const empty: FormState = { name: '', code: '', description: '', serviceSecs: '' };

export default function CountersPage() {
  const toast = useToast();
  const list = useFetch(() => adminService.counters(), []);
  useLiveEvent(['queue.updated', 'counter.updated'], () => list.reload());
  const [editing, setEditing] = useState<CounterWithStats | 'new' | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  function open(c: CounterWithStats | 'new') {
    setEditing(c);
    setErrors({});
    setForm(c === 'new' ? empty : { name: c.name, code: c.code, description: c.description ?? '', serviceSecs: c.serviceSecs ? String(c.serviceSecs) : '' });
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (form.name.trim().length < 2) errs.name = 'Name is required';
    if (!/^[A-Za-z]{1,3}$/.test(form.code.trim())) errs.code = 'Use 1–3 letters';
    if (form.serviceSecs && (Number(form.serviceSecs) < 20 || Number(form.serviceSecs) > 600)) errs.serviceSecs = 'Between 20 and 600 seconds';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      description: form.description.trim() || undefined,
      serviceSecs: form.serviceSecs ? Number(form.serviceSecs) : null,
    };
    try {
      if (editing === 'new') await adminService.createCounter(payload);
      else await adminService.updateCounter(editing!.id, payload);
      toast.success(editing === 'new' ? 'Counter created' : 'Counter updated', payload.name);
      setEditing(null);
      list.reload();
    } catch (err) {
      setErrors(getFieldErrors(err));
      toast.error('Could not save counter', getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(c: CounterWithStats) {
    setToggling(c.id);
    try {
      await adminService.updateCounter(c.id, { isActive: !c.isActive });
      toast.success(c.isActive ? 'Counter deactivated' : 'Counter activated', c.name);
      list.reload();
    } catch (err) {
      toast.error('Could not update counter', getErrorMessage(err));
    } finally {
      setToggling(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Mess counters"
        description="Counters students can queue at. Inactive counters are hidden from token booking."
        actions={<Button icon={<Plus className="h-4 w-4" />} onClick={() => open('new')}>Add counter</Button>}
      />
      {list.loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[0, 1].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>
      ) : list.error ? (
        <Card><ErrorState message={list.error} onRetry={list.retry} /></Card>
      ) : !list.data?.length ? (
        <Card><EmptyState icon={<Store className="h-5 w-5" />} title="No counters yet" description="Create your first counter to start accepting tokens." action={<Button onClick={() => open('new')}>Add counter</Button>} /></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.data.map((c) => (
            <Card key={c.id} className={c.isActive ? undefined : 'bg-gray-50/60'}>
              <div className="flex items-start gap-3 p-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy-900 text-sm font-bold text-white">{c.code}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{c.name}</p>
                  <p className="mt-0.5 line-clamp-2 text-[13px] text-ink-muted">{c.description || 'No description'}</p>
                </div>
                {!c.isActive ? <Badge>Inactive</Badge> : c.isPaused ? <Badge tone="amber">Paused</Badge> : <Badge tone="green" dot>Active</Badge>}
              </div>
              <div className="grid grid-cols-3 border-y border-line text-center">
                {[
                  ['Today', c.tokensToday],
                  ['Waiting', c.waiting],
                  ['Served', c.served],
                ].map(([l, v]) => (
                  <div key={l} className="py-3">
                    <p className="tabular text-lg font-semibold">{v}</p>
                    <p className="text-[11px] text-ink-subtle">{l}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-1 px-5 py-3 text-xs text-ink-muted">
                <p>Service time: {c.serviceSecs ? `${c.serviceSecs}s per token` : 'Mess default'}</p>
                <p>Staff: {c.staff.length ? c.staff.map((s) => s.name).join(', ') : 'None assigned'}</p>
              </div>
              <div className="flex items-center justify-between border-t border-line px-5 py-3">
                <div className="flex items-center gap-2 text-[13px] text-ink-muted">
                  <Toggle checked={c.isActive} disabled={toggling === c.id} onChange={() => toggleActive(c)} />
                  {c.isActive ? 'Active' : 'Inactive'}
                </div>
                <Button size="sm" variant="secondary" icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => open(c)}>Edit</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Add counter' : 'Edit counter'}
        description="The code prefixes token numbers, e.g. code A → A-012."
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="submit" form="counter-form" loading={saving}>{editing === 'new' ? 'Create counter' : 'Save changes'}</Button>
          </>
        }
      >
        <form id="counter-form" onSubmit={save} className="grid gap-4 sm:grid-cols-3">
          <Input containerClassName="sm:col-span-2" label="Counter name" required placeholder="Counter C · South Indian" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} />
          <Input label="Code" required placeholder="C" maxLength={3} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} error={errors.code} />
          <div className="sm:col-span-3">
            <Textarea label="Description" placeholder="What this counter serves" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <Input containerClassName="sm:col-span-3" label="Service time per token (seconds)" type="number" min={20} max={600} placeholder="Leave empty to use the mess default" value={form.serviceSecs} onChange={(e) => setForm({ ...form, serviceSecs: e.target.value })} error={errors.serviceSecs} hint="Used for wait estimates until enough live service data is observed." />
        </form>
      </Modal>
    </div>
  );
}
