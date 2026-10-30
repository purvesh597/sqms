import type { AppNotification, MenuResponse, Meta, QueueStatus } from '../types';
import { api } from './api';

export const commonService = {
  meta: () => api.get<Meta>('/meta').then((r) => r.data),
  menu: (date?: string) => api.get<MenuResponse>('/menu', { params: { date } }).then((r) => r.data),
  queueStatus: (counterId: string, mealId: string) =>
    api.get<QueueStatus>('/queue/status', { params: { counterId, mealId } }).then((r) => r.data),
  notifications: (params?: { unread?: boolean; limit?: number }) =>
    api.get<{ items: AppNotification[]; unreadCount: number }>('/notifications', { params }).then((r) => r.data),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/read-all'),
};
