import { useNavigate } from 'react-router-dom';
import { Megaphone } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { Button } from './ui';

/** Full-screen, prominent alert shown to a student when their token is called or recalled. */
export function CallAlert() {
  const { callAlert, dismissCallAlert } = useNotifications();
  const navigate = useNavigate();
  if (!callAlert) return null;
  const token = callAlert.title.match(/[A-Z]{1,3}-\d{3}/)?.[0];
  const counter = callAlert.message.match(/proceed to (.+?) now/)?.[1] ?? callAlert.message.match(/^(.+?) is waiting/)?.[1];

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-4">
      <div className="absolute inset-0 animate-fade-in bg-navy-950/60 backdrop-blur-sm" />
      <div role="alertdialog" aria-live="assertive" className="relative w-full max-w-sm animate-slide-up overflow-hidden rounded-2xl bg-white text-center shadow-pop">
        <div className="bg-navy-900 px-6 pb-8 pt-7 text-white">
          <span className="mx-auto flex h-12 w-12 animate-pulse-ring items-center justify-center rounded-full bg-brand-500">
            <Megaphone className="h-5 w-5" />
          </span>
          <p className="mt-4 text-sm font-medium text-navy-200">{callAlert.type === 'TOKEN_RECALLED' ? 'Reminder · Your token is being called' : "It's your turn"}</p>
          {token && <p className="tabular mt-1 text-5xl font-bold tracking-tight">{token}</p>}
          {counter && <p className="mt-2 text-[15px] text-white/90">Please proceed to <span className="font-semibold text-white">{counter}</span></p>}
        </div>
        <div className="space-y-3 p-5">
          <p className="text-[13px] text-ink-muted">{callAlert.message}</p>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={dismissCallAlert}>
              Dismiss
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                dismissCallAlert();
                navigate('/student/tokens');
              }}
            >
              View token
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
