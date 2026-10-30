import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLiveEvent } from '../hooks/useLive';
import { commonService } from '../services/common.service';
import type { AppNotification } from '../types';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

interface NotificationState {
  items: AppNotification[];
  unreadCount: number;
  loading: boolean;
  /** The most recent "token called" alert that the student has not dismissed yet. */
  callAlert: AppNotification | null;
  dismissCallAlert: () => void;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationState | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [callAlert, setCallAlert] = useState<AppNotification | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const res = await commonService.notifications({ limit: 50 });
      setItems(res.items);
      setUnread(res.unreadCount);
    } catch {
      /* the bell simply keeps its last state */
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setItems([]);
      setUnread(0);
      return;
    }
    refresh();
    const t = setInterval(() => document.visibilityState === 'visible' && refresh(), 30_000);
    return () => clearInterval(t);
  }, [user, refresh]);

  useLiveEvent('notification', (n: AppNotification) => {
    setItems((prev) => [n, ...prev.filter((p) => p.id !== n.id)].slice(0, 50));
    setUnread((c) => c + 1);
    if (n.type === 'TOKEN_CALLED' || n.type === 'TOKEN_RECALLED') {
      setCallAlert(n);
      try {
        navigator.vibrate?.([200, 100, 200]);
      } catch {
        /* unsupported */
      }
    } else if (n.type !== 'TOKEN_GENERATED') {
      n.type === 'TOKEN_SKIPPED' ? toast.error(n.title, n.message) : toast.info(n.title, n.message);
    }
  });

  const markRead = useCallback(async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnread((c) => Math.max(0, c - 1));
    await commonService.markRead(id).catch(() => refresh());
  }, [refresh]);

  const markAllRead = useCallback(async () => {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
    await commonService.markAllRead().catch(() => refresh());
  }, [refresh]);

  const dismissCallAlert = useCallback(() => {
    if (callAlert && !callAlert.isRead) markRead(callAlert.id);
    setCallAlert(null);
  }, [callAlert, markRead]);

  const value = useMemo(
    () => ({ items, unreadCount, loading, callAlert, dismissCallAlert, refresh, markRead, markAllRead }),
    [items, unreadCount, loading, callAlert, dismissCallAlert, refresh, markRead, markAllRead],
  );
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
