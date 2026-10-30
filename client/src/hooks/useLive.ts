import { useEffect, useRef } from 'react';
import { useLiveContext, type LiveEventType } from '../context/LiveContext';

/** Calls `handler` whenever one of the given live events arrives. */
export function useLiveEvent(types: LiveEventType | LiveEventType[], handler: (data: any, type: LiveEventType) => void) {
  const { subscribe } = useLiveContext();
  const ref = useRef(handler);
  ref.current = handler;
  const key = Array.isArray(types) ? types.join(',') : types;

  useEffect(() => {
    const list = key.split(',') as LiveEventType[];
    const unsubs = list.map((t) => subscribe(t, (d) => ref.current(d, t)));
    return () => unsubs.forEach((u) => u());
  }, [key, subscribe]);
}
