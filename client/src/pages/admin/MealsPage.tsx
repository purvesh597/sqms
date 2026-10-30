import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { MealIcon } from '../../components/MealIcon';
import { Button, Card, CardHeader, ErrorState, Input, PageHeader, PageLoader, Toggle } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { useFetch } from '../../hooks/useFetch';
import { adminService } from '../../services/admin.service';
import { getErrorMessage } from '../../services/api';
import type { Meal, Settings } from '../../types';

function MealRow({ meal, onSaved }: { meal: Meal; onSaved: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: meal.name, startTime: meal.startTime, endTime: meal.endTime, isActive: meal.isActive });
  const [saving, setSaving] = useState(false);
  useEffect(() => setForm({ name: meal.name, startTime: meal.startTime, endTime: meal.endTime, isActive: meal.isActive }), [meal]);
  const dirty = form.name !== meal.name || form.startTime !== meal.startTime || form.endTime !== meal.endTime || form.isActive !== meal.isActive;
  const invalid = form.startTime >= form.endTime;

  async function save(patch = form) {
    setSaving(true);
    try {
      await adminService.updateMeal(meal.id, patch);
      toast.success(`${patch.name} updated`);
      onSaved();
    } catch (err) {
      toast.error('Could not update meal', getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid items-end gap-4 px-5 py-4 md:grid-cols-[auto_1fr_140px_140px_auto_auto]">
      <MealIcon type={meal.type} className="hidden md:inline-flex" />
      <Input label="Session name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <Input label="Starts" type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
      <Input label="Ends" type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} error={invalid ? 'Must be after start' : undefined} />
      <div className="flex h-9 items-center gap-2 text-[13px] text-ink-muted">
        <Toggle checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} /> {form.isActive ? 'Active' : 'Off'}
      </div>
      <Button variant={dirty ? 'primary' : 'secondary'} disabled={!dirty || invalid} loading={saving} onClick={() => save()} icon={<Save className="h-4 w-4" />}>
        Save
      </Button>
    </div>
  );
}

export default function MealsPage() {
  const toast = useToast();
  const meals = useFetch(() => adminService.meals(), []);
  const settings = useFetch(() => adminService.settings(), []);
  const [s, setS] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => setS(settings.data), [settings.data]);

  async function saveSettings() {
    if (!s) return;
    setSaving(true);
    try {
      const updated = await adminService.updateSettings({
        name: s.name,
        location: s.location,
        defaultServiceSecs: Number(s.defaultServiceSecs),
        approachThreshold: Number(s.approachThreshold),
        enforceMealTimings: s.enforceMealTimings,
      });
      settings.setData(updated);
      toast.success('Settings saved');
    } catch (err) {
      toast.error('Could not save settings', getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (meals.loading || settings.loading) return <PageLoader />;
  if (meals.error) return <Card><ErrorState message={meals.error} onRetry={meals.retry} /></Card>;

  return (
    <div className="space-y-6">
      <PageHeader title="Meal sessions" description="Configure meal timings, availability and queue rules." />
      <Card>
        <CardHeader title="Daily sessions" description="Times are in 24-hour format. Inactive sessions cannot accept tokens." />
        <div className="divide-y divide-line">
          {meals.data?.map((m) => <MealRow key={m.id} meal={m} onSaved={meals.reload} />)}
        </div>
      </Card>

      {s && (
        <Card>
          <CardHeader title="Mess & queue settings" action={<Button loading={saving} onClick={saveSettings} icon={<Save className="h-4 w-4" />}>Save settings</Button>} />
          <div className="grid gap-5 p-5 md:grid-cols-2">
            <Input label="Mess name" value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} />
            <Input label="Location" value={s.location} onChange={(e) => setS({ ...s, location: e.target.value })} />
            <Input
              label="Default service time (seconds per token)"
              type="number"
              min={20}
              max={600}
              value={s.defaultServiceSecs}
              onChange={(e) => setS({ ...s, defaultServiceSecs: Number(e.target.value) })}
              hint="Used for wait estimates until live service speed is observed (3+ calls)."
            />
            <Input
              label="Turn-approaching alert (tokens ahead)"
              type="number"
              min={1}
              max={10}
              value={s.approachThreshold}
              onChange={(e) => setS({ ...s, approachThreshold: Number(e.target.value) })}
              hint="Students are notified once when this many or fewer tokens remain ahead."
            />
            <div className="rounded-lg border border-line p-4 md:col-span-2">
              <Toggle
                checked={s.enforceMealTimings}
                onChange={(v) => setS({ ...s, enforceMealTimings: v })}
                label="Enforce meal timings"
                description="When on, students can only book tokens from 30 minutes before a session starts until it ends. Turn off for demos or flexible service."
              />
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
