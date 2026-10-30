import { useState, type FormEvent } from 'react';
import { Pencil, Plus, Search, UserCog } from 'lucide-react';
import { Avatar, Badge, Button, Card, EmptyState, ErrorState, Input, Modal, PageHeader, Select, Skeleton, Table, Td, Th, Toggle, Tr } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { useDebounce } from '../../hooks/useDebounce';
import { useFetch } from '../../hooks/useFetch';
import { adminService } from '../../services/admin.service';
import { getErrorMessage, getFieldErrors } from '../../services/api';
import type { User } from '../../types';
import { formatDateTime } from '../../utils/format';

interface FormState {
  name: string;
  email: string;
  phone: string;
  password: string;
  assignedCounterId: string;
}

export default function StaffPage() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const q = useDebounce(search);
  const staff = useFetch(() => adminService.staff(q), [q]);
  const counters = useFetch(() => adminService.counters(), []);
  const [editing, setEditing] = useState<User | 'new' | null>(null);
  const [form, setForm] = useState<FormState>({ name: '', email: '', phone: '', password: '', assignedCounterId: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  function open(u: User | 'new') {
    setEditing(u);
    setErrors({});
    setForm(u === 'new' ? { name: '', email: '', phone: '', password: '', assignedCounterId: '' } : { name: u.name, email: u.email, phone: u.phone ?? '', password: '', assignedCounterId: u.assignedCounterId ?? '' });
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (form.name.trim().length < 2) errs.name = 'Name is required';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errs.email = 'Enter a valid email';
    if (editing === 'new' && form.password.length < 8) errs.password = 'At least 8 characters';
    if (editing !== 'new' && form.password && form.password.length < 8) errs.password = 'At least 8 characters';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
      password: form.password,
      assignedCounterId: form.assignedCounterId || null,
    };
    try {
      if (editing === 'new') await adminService.createStaff(payload);
      else await adminService.updateStaff((editing as User).id, payload);
      toast.success(editing === 'new' ? 'Staff account created' : 'Staff details updated', payload.name);
      setEditing(null);
      staff.reload();
    } catch (err) {
      setErrors(getFieldErrors(err));
      toast.error('Could not save staff member', getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggle(u: User) {
    setToggling(u.id);
    try {
      await adminService.updateStaff(u.id, { isActive: !u.isActive });
      toast.success(u.isActive ? 'Account deactivated' : 'Account activated', u.isActive ? `${u.name} can no longer sign in.` : `${u.name} can sign in again.`);
      staff.reload();
    } catch (err) {
      toast.error('Could not update account', getErrorMessage(err));
    } finally {
      setToggling(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Staff accounts"
        description="Mess staff who operate the counters."
        actions={<Button icon={<Plus className="h-4 w-4" />} onClick={() => open('new')}>Add staff</Button>}
      />
      <Card>
        <div className="border-b border-line p-4">
          <Input aria-label="Search staff" placeholder="Search by name or email" icon={<Search className="h-4 w-4" />} value={search} onChange={(e) => setSearch(e.target.value)} containerClassName="max-w-xs" />
        </div>
        {staff.loading ? (
          <div className="space-y-2 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : staff.error ? (
          <ErrorState message={staff.error} onRetry={staff.retry} />
        ) : !staff.data?.length ? (
          <EmptyState icon={<UserCog className="h-5 w-5" />} title={search ? 'No staff match your search' : 'No staff accounts yet'} action={!search && <Button onClick={() => open('new')}>Add staff</Button>} />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Phone</Th>
                <Th>Assigned counter</Th>
                <Th>Last sign-in</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {staff.data.map((u) => (
                <Tr key={u.id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} />
                      <div>
                        <p className="font-medium">{u.name}</p>
                        <p className="text-xs text-ink-muted">{u.email}</p>
                      </div>
                    </div>
                  </Td>
                  <Td className="text-ink-muted">{u.phone ?? '—'}</Td>
                  <Td>{u.assignedCounter ? <Badge tone="blue">{u.assignedCounter.name}</Badge> : <span className="text-ink-subtle">Unassigned</span>}</Td>
                  <Td className="text-ink-muted">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : 'Never'}</Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <Toggle checked={u.isActive} disabled={toggling === u.id} onChange={() => toggle(u)} />
                      <span className="text-[13px] text-ink-muted">{u.isActive ? 'Active' : 'Inactive'}</span>
                    </div>
                  </Td>
                  <Td className="text-right">
                    <Button size="sm" variant="secondary" icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => open(u)}>Edit</Button>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Add staff member' : 'Edit staff member'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="submit" form="staff-form" loading={saving}>{editing === 'new' ? 'Create account' : 'Save changes'}</Button>
          </>
        }
      >
        <form id="staff-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <Input label="Full name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} />
          <Input label="Phone" placeholder="+91 98xxx xxxxx" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} error={errors.phone} />
          <Input containerClassName="sm:col-span-2" label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} />
          <Input
            label={editing === 'new' ? 'Password' : 'New password'}
            type="password"
            autoComplete="new-password"
            required={editing === 'new'}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            error={errors.password}
            hint={editing === 'new' ? 'At least 8 characters' : 'Leave blank to keep the current password'}
          />
          <Select label="Assigned counter" value={form.assignedCounterId} onChange={(e) => setForm({ ...form, assignedCounterId: e.target.value })}>
            <option value="">Unassigned</option>
            {counters.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </form>
      </Modal>
    </div>
  );
}
