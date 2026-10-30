import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';

/**
 * Maintains one Server-Sent Events connection per signed-in tab and fans events out
 * to subscribers. EventSource reconnects automatically; pages also poll as a fallback.
 */
export type LiveEventType = 'queue.updated' | 'counter.updated' | 'menu.updated' | 'config.updated' | 'notification';
type Handler = (data: any) => void;

interface LiveApi {
  connected: boolean;
  subscribe: (type: LiveEventType, handler: Handler) => () => void;
}

const LiveContext = createContext<LiveApi | null>(null);
const TYPES: LiveEventType[] = ['queue.updated', 'counter.updated', 'menu.updated', 'config.updated', 'notification'];

export function LiveProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const handlers = useRef(new Map<LiveEventType, Set<Handler>>());

  useEffect(() => {
    if (!user) return;
    const es = new EventSource('/api/events', { withCredentials: true });
    es.addEventListener('connected', () => setConnected(true));
    es.onerror = () => setConnected(false);
    for (const type of TYPES) {
      es.addEventListener(type, (e) => {
        let data: unknown = null;
        try {
          data = JSON.parse((e as MessageEvent).data);
        } catch {
          /* ignore malformed payloads */
        }
        handlers.current.get(type)?.forEach((h) => h(data));
      });
    }
    return () => {
      es.close();
      setConnected(false);
    };
  }, [user]);

  const api = useMemo<LiveApi>(
    () => ({
      connected,
      subscribe(type, handler) {
        if (!handlers.current.has(type)) handlers.current.set(type, new Set());
        handlers.current.get(type)!.add(handler);
        return () => handlers.current.get(type)?.delete(handler);
      },
    }),
    [connected],
  );

  return <LiveContext.Provider value={api}>{children}</LiveContext.Provider>;
}

export function useLiveContext() {
  const ctx = useContext(LiveContext);
  if (!ctx) throw new Error('useLiveContext must be used within LiveProvider');
  return ctx;
}
