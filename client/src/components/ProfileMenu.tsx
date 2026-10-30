import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABEL } from '../layouts/navigation';
import { Avatar } from './ui';

export function ProfileMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  if (!user) return null;
  const go = (to: string) => {
    setOpen(false);
    navigate(to);
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition-colors hover:bg-gray-100" aria-haspopup="menu">
        <Avatar name={user.name} size="sm" />
        <span className="hidden text-left leading-tight md:block">
          <span className="block max-w-[140px] truncate text-[13px] font-medium text-ink">{user.name}</span>
          <span className="block text-[11px] text-ink-subtle">{ROLE_LABEL[user.role]}</span>
        </span>
        <ChevronDown className="hidden h-3.5 w-3.5 text-ink-subtle md:block" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-11 z-40 w-60 animate-slide-up overflow-hidden rounded-xl border border-line bg-white py-1 shadow-pop">
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-ink-muted">{user.email}</p>
          </div>
          <button role="menuitem" onClick={() => go('/profile')} className="flex w-full items-center gap-2.5 px-4 py-2 text-[13px] text-ink hover:bg-gray-50">
            <UserRound className="h-4 w-4 text-ink-subtle" /> My profile
          </button>
          <button
            role="menuitem"
            onClick={async () => {
              setOpen(false);
              await logout();
              navigate('/login', { replace: true });
            }}
            className="flex w-full items-center gap-2.5 px-4 py-2 text-[13px] text-red-600 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
