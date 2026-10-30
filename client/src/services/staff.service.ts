import type { ActivityEvent, Counter, QueueSnapshot } from '../types';
import { api } from './api';

export const staffService = {
  queue: (counterId: string, mealId: string) =>
    api.get<QueueSnapshot>('/staff/queue', { params: { counterId, mealId } }).then((r) => r.data),
  callNext: (counterId: string, mealId: string) =>
    api.post<QueueSnapshot>('/staff/queue/call-next', { counterId, mealId }).then((r) => r.data),
  recall: (id: string) => api.post<QueueSnapshot>(`/staff/tokens/${id}/recall`).then((r) => r.data),
  serve: (id: string) => api.post<QueueSnapshot>(`/staff/tokens/${id}/serve`).then((r) => r.data),
  skip: (id: string) => api.post<QueueSnapshot>(`/staff/tokens/${id}/skip`).then((r) => r.data),
  pause: (counterId: string) => api.post<{ counter: Counter }>(`/staff/counters/${counterId}/pause`).then((r) => r.data.counter),
  resume: (counterId: string) => api.post<{ counter: Counter }>(`/staff/counters/${counterId}/resume`).then((r) => r.data.counter),
  activity: (counterId?: string, limit = 100) =>
    api.get<{ events: ActivityEvent[] }>('/staff/activity', { params: { counterId, limit } }).then((r) => r.data.events),
};
