import { useState, type FormEvent } from 'react';
import { KeyRound, Save } from 'lucide-react';
import { Avatar, Badge, Button, Card, CardHeader, Input, PageHeader } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ROLE_LABEL } from '../../layouts/navigation';
import { getErrorMessage, getFieldErrors } from '../../services/api';
import { authService } from '../../services/auth.service';
import { formatDateTime } from '../../utils/format';

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({});
  const [changing, setChanging] = useState(false);

  if (!user) return null;

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return setProfileErrors({ name: 'Name must be at least 2 characters' });
    setSaving(true);
    setProfileErrors({});
    try {
      setUser(await authService.updateProfile({ name: name.trim(), phone: phone.trim() }));
      toast.success('Profile updated');
    } catch (err) {
      setProfileErrors(getFieldErrors(err));
      toast.error('Could not update profile', getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!pw.current) errs.current = 'Enter your current password';
    if (pw.next.length < 8) errs.next = 'Use at least 8 characters';
    if (pw.next !== pw.confirm) errs.confirm = 'Passwords do not match';
    setPwErrors(errs);
    if (Object.keys(errs).length) return;
    setChanging(true);
    try {
      await authService.changePassword(pw.current, pw.next);
      setPw({ current: '', next: '', confirm: '' });
      toast.success('Password changed', 'Use your new password the next time you sign in.');
    } catch (err) {
      toast.error('Could not change password', getErrorMessage(err));
    } finally {
      setChanging(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="My profile" description="Manage your account details and password." />
      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <Avatar name={user.name} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold">{user.name}</p>
          <p className="text-sm text-ink-muted">{user.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone="navy">{ROLE_LABEL[user.role]}</Badge>
          {user.rollNumber && <Badge>{user.rollNumber}</Badge>}
          {user.hostel && <Badge>{user.hostel}</Badge>}
          {user.assignedCounter && <Badge tone="blue">{user.assignedCounter.name}</Badge>}
        </div>
      </Card>

      <Card>
        <CardHeader title="Personal details" description={user.lastLoginAt ? `Last sign-in ${formatDateTime(user.lastLoginAt)}` : undefined} />
        <form onSubmit={saveProfile} className="grid gap-4 p-5 sm:grid-cols-2">
          <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} error={profileErrors.name} required />
          <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98xxx xxxxx" error={profileErrors.phone} />
          <Input label="Email" value={user.email} disabled hint="Contact the administrator to change your email." />
          <div className="flex items-end justify-end sm:col-span-2">
            <Button type="submit" loading={saving} icon={<Save className="h-4 w-4" />}>Save changes</Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader title="Change password" description="Use at least 8 characters." />
        <form onSubmit={changePassword} className="grid gap-4 p-5 sm:grid-cols-3">
          <Input label="Current password" type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} error={pwErrors.current} />
          <Input label="New password" type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} error={pwErrors.next} />
          <Input label="Confirm new password" type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} error={pwErrors.confirm} />
          <div className="flex justify-end sm:col-span-3">
            <Button type="submit" variant="secondary" loading={changing} icon={<KeyRound className="h-4 w-4" />}>Update password</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
