import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, BellRing, Clock3, Eye, EyeOff, Lock, Mail, ShieldCheck, Ticket } from 'lucide-react';
import { Logo } from '../../components/Logo';
import { Button, Input } from '../../components/ui';
import { HOME_BY_ROLE, useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../services/api';
import { cn } from '../../utils/cn';

const DEMO = [
  { role: 'Student', email: 'aarav.sharma@sqms.edu', password: 'Student@123' },
  { role: 'Mess Staff', email: 'ramesh.staff@sqms.edu', password: 'Staff@123' },
  { role: 'Admin', email: 'admin@sqms.edu', password: 'Admin@123' },
];

const FEATURES = [
  { icon: Ticket, title: 'Digital tokens', text: 'Book your place in line from anywhere on campus.' },
  { icon: Clock3, title: 'Live wait times', text: 'Positions and estimates based on real service speed.' },
  { icon: BellRing, title: 'Turn alerts', text: 'Get notified as your turn approaches and when called.' },
];

export default function LoginPage() {
  const { user, login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) return <Navigate to={HOME_BY_ROLE[user.role]} replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const fieldErrors: typeof errors = {};
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) fieldErrors.email = 'Enter a valid email address';
    if (!password) fieldErrors.password = 'Password is required';
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length) return;

    setSubmitting(true);
    setError(null);
    try {
      const u = await login(email.trim().toLowerCase(), password);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from && from.startsWith(HOME_BY_ROLE[u.role]) ? from : HOME_BY_ROLE[u.role], { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/* Brand panel */}
      <div className="relative hidden w-[46%] max-w-[640px] flex-col justify-between overflow-hidden bg-navy-900 p-10 text-white lg:flex xl:p-14">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '44px 44px' }}
        />
        <div className="relative">
          <Logo light />
        </div>

        <div className="relative">
          <p className="text-[13px] font-medium uppercase tracking-wider text-brand-300">College Mess · Queue Management</p>
          <h1 className="mt-3 max-w-md text-[34px] font-semibold leading-[1.15] tracking-tight">Skip the line. Not the meal.</h1>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-navy-200">
            SQMS replaces long physical queues with digital tokens, live queue tracking and timely alerts — for students, mess staff and administrators.
          </p>

          {/* Token preview */}
          <div className="mt-10 max-w-sm rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-navy-300">Counter A · Lunch</p>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-brand-500/15 px-2 py-0.5 text-[11px] font-medium text-brand-200">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-300" /> Waiting
              </span>
            </div>
            <p className="tabular mt-2 text-4xl font-bold tracking-tight">A-014</p>
            <div className="mt-4 grid grid-cols-3 gap-3 border-t border-white/10 pt-4 text-center">
              {[
                ['3rd', 'In line'],
                ['~4 min', 'Est. wait'],
                ['A-011', 'Serving'],
              ].map(([v, l]) => (
                <div key={l}>
                  <p className="tabular text-sm font-semibold">{v}</p>
                  <p className="text-[11px] text-navy-300">{l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative grid grid-cols-3 gap-6">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title}>
              <Icon className="h-[18px] w-[18px] text-brand-300" />
              <p className="mt-2 text-[13px] font-semibold">{title}</p>
              <p className="mt-1 text-xs leading-relaxed text-navy-300">{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Form */}
      <div className="flex flex-1 flex-col items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-ink">Sign in</h2>
          <p className="mt-1.5 text-sm text-ink-muted">Use your college account to access SQMS.</p>

          {error && (
            <div role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
            <Input
              label="Email address"
              type="email"
              autoComplete="email"
              placeholder="you@sqms.edu"
              icon={<Mail className="h-4 w-4" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              className="h-10"
            />
            <div className="relative">
              <Input
                label="Password"
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                icon={<Lock className="h-4 w-4" />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
                className="h-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-2.5 top-[30px] rounded p-1 text-ink-subtle hover:text-ink"
                aria-label={show ? 'Hide password' : 'Show password'}
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button type="submit" size="lg" className="w-full" loading={submitting}>
              Sign in {!submitting && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>

          <div className="mt-8">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-line" />
              <p className="text-xs font-medium text-ink-subtle">Demo accounts</p>
              <div className="h-px flex-1 bg-line" />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {DEMO.map((d) => {
                const active = email === d.email;
                return (
                  <button
                    key={d.role}
                    type="button"
                    onClick={() => {
                      setEmail(d.email);
                      setPassword(d.password);
                      setErrors({});
                      setError(null);
                    }}
                    className={cn(
                      'rounded-lg border px-2 py-2.5 text-center transition-colors',
                      active ? 'border-brand-500 bg-brand-50/60 ring-1 ring-brand-500' : 'border-line hover:border-gray-300 hover:bg-gray-50',
                    )}
                  >
                    <p className="text-[13px] font-medium text-ink">{d.role}</p>
                    <p className="mt-0.5 text-[11px] text-ink-subtle">Fill credentials</p>
                  </button>
                );
              })}
            </div>
          </div>

          <p className="mt-10 flex items-center justify-center gap-1.5 text-xs text-ink-subtle">
            <ShieldCheck className="h-3.5 w-3.5" /> Sessions are secured with encrypted, http-only cookies.
          </p>
        </div>
      </div>
    </div>
  );
}
