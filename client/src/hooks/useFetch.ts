import { useCallback, useEffect, useRef, useState } from 'react';
import { getErrorMessage } from '../services/api';

interface Options {
  /** Re-fetch silently on this interval (ms). Fallback for when live events are unavailable. */
  pollMs?: number;
  enabled?: boolean;
}

/**
 * Loads data and exposes `reload` (silent background refresh) plus loading and error state.
 * `loading` is only true for the first load or when dependencies change.
 */
export function useFetch<T>(fetcher: () => Promise<T>, deps: unknown[], { pollMs, enabled = true }: Options = {}) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const requestId = useRef(0);

  const run = useCallback(async (silent: boolean) => {
    const id = ++requestId.current;
    if (!silent) setLoading(true);
    try {
      const result = await fetcherRef.current();
      if (id === requestId.current) {
        setData(result);
        setError(null);
      }
    } catch (err) {
      if (id === requestId.current && !silent) setError(getErrorMessage(err));
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    run(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, run, ...deps]);

  useEffect(() => {
    if (!pollMs || !enabled) return;
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') run(true);
    }, pollMs);
    return () => clearInterval(t);
  }, [pollMs, enabled, run]);

  const reload = useCallback(() => run(true), [run]);
  const retry = useCallback(() => run(false), [run]);
  return { data, setData, loading, error, reload, retry };
}
