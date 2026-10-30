import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Menu, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { CallAlert } from '../components/CallAlert';
import { Logo } from '../components/Logo';
import { NotificationBell } from '../components/NotificationBell';
import { ProfileMenu } from '../components/ProfileMenu';
import { useAuth } from '../context/AuthContext';
import { useLiveContext } from '../context/LiveContext';
import { useMeta } from '../hooks/useMeta';
import { cn } from '../utils/cn';
import { formatDate } from '../utils/format';
import { NAVIGATION, ROLE_LABEL, type NavSection } from './navigation';

const COLLAPSE_KEY = 'sqms.sidebar.collapsed';

function SidebarNav({ sections, collapsed, onNavigate }: { sections: NavSection[]; collapsed: boolean; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
      {sections.map((section, i) => (
        <div key={i}>
          {section.title && !collapsed && <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-navy-400">{section.title}</p>}
          {section.title && collapsed && <div className="mx-3 mb-2 border-t border-white/10" />}
          <ul className="space-y-0.5">
            {section.items.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  onClick={onNavigate}
                  title={collapsed ? label : undefined}
                  className={({ isActive }) =>
                    cn(
                      'group flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors',
                      collapsed && 'justify-center px-0',
                      isActive ? 'bg-white/10 text-white' : 'text-navy-200 hover:bg-white/5 hover:text-white',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={cn('h-[18px] w-[18px] shrink-0', isActive ? 'text-brand-300' : 'text-navy-300 group-hover:text-white')} />
                      {!collapsed && <span className="truncate">{label}</span>}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function AppLayout() {
  const { user } = useAuth();
  const { connected } = useLiveContext();
  const { data: meta } = useMeta();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => setMobileOpen(false), [location.pathname]);
  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
    } catch {
      /* storage unavailable */
    }
  }, [collapsed]);

  if (!user) return null;
  const sections = NAVIGATION[user.role];

  const footer = (isCollapsed: boolean) => (
    <div className={cn('border-t border-white/10 p-3', isCollapsed && 'px-2')}>
      <div className={cn('flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] text-navy-300', isCollapsed && 'justify-center px-0')} title={connected ? 'Live updates connected' : 'Reconnecting…'}>
        <span className={cn('h-2 w-2 shrink-0 rounded-full', connected ? 'bg-emerald-400' : 'bg-amber-400')} />
        {!isCollapsed && (connected ? 'Live updates on' : 'Reconnecting…')}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'sticky top-0 hidden h-screen shrink-0 flex-col bg-navy-900 transition-[width] duration-200 lg:flex',
          collapsed ? 'w-[72px]' : 'w-[248px]',
        )}
      >
        <div className={cn('flex h-16 items-center border-b border-white/10 px-4', collapsed && 'justify-center px-0')}>
          <Logo collapsed={collapsed} light />
        </div>
        {!collapsed && (
          <div className="px-6 pt-4">
            <span className="inline-flex rounded-md bg-white/5 px-2 py-0.5 text-[11px] font-medium text-navy-200 ring-1 ring-inset ring-white/10">{ROLE_LABEL[user.role]} workspace</span>
          </div>
        )}
        <SidebarNav sections={sections} collapsed={collapsed} />
        {footer(collapsed)}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 animate-fade-in bg-navy-950/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-[272px] animate-slide-up flex-col bg-navy-900 shadow-pop">
            <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
              <Logo light />
              <button onClick={() => setMobileOpen(false)} className="rounded-md p-1.5 text-navy-200 hover:bg-white/10" aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarNav sections={sections} collapsed={false} onNavigate={() => setMobileOpen(false)} />
            {footer(false)}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-white/85 px-4 backdrop-blur-md sm:px-6">
          <button onClick={() => setMobileOpen(true)} className="-ml-1 rounded-lg p-2 text-ink-muted hover:bg-gray-100 lg:hidden" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="-ml-2 hidden rounded-lg p-2 text-ink-subtle hover:bg-gray-100 hover:text-ink lg:inline-flex"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] text-ink-muted">
              {meta && <span className="hidden sm:inline">{meta.service.name} · </span>}
              {formatDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <NotificationBell />
            <div className="mx-1 h-6 w-px bg-line" />
            <ProfileMenu />
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1320px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
      {user.role === 'STUDENT' && <CallAlert />}
    </div>
  );
}
