import { studentService } from '../services/student.service';
import { useFetch } from './useFetch';
import { useLiveEvent } from './useLive';

/** The student's active tokens, refreshed on queue changes (SSE) with polling as a fallback. */
export function useActiveTokens() {
  const q = useFetch(() => studentService.active(), [], { pollMs: 15_000 });
  useLiveEvent(['queue.updated', 'counter.updated', 'notification'], () => q.reload());
  return q;
}
