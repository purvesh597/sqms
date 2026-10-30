import { commonService } from '../services/common.service';
import { useFetch } from './useFetch';
import { useLiveEvent } from './useLive';

/** Shared configuration (meals with live state, counters, settings) kept fresh by live events. */
export function useMeta() {
  const q = useFetch(() => commonService.meta(), [], { pollMs: 60_000 });
  useLiveEvent(['config.updated', 'counter.updated'], () => q.reload());
  return q;
}
