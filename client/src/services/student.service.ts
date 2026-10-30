import type { TokenDetail, TokenHistoryItem } from '../types';
import { api } from './api';

export const studentService = {
  generate: (counterId: string, mealId: string) =>
    api.post<{ token: TokenDetail }>('/student/tokens', { counterId, mealId }).then((r) => r.data.token),
  active: () => api.get<{ tokens: TokenDetail[] }>('/student/tokens/active').then((r) => r.data.tokens),
  get: (id: string) => api.get<{ token: TokenDetail }>(`/student/tokens/${id}`).then((r) => r.data.token),
  history: (limit = 30) => api.get<{ tokens: TokenHistoryItem[] }>('/student/tokens/history', { params: { limit } }).then((r) => r.data.tokens),
  cancel: (id: string) => api.post<{ token: TokenDetail }>(`/student/tokens/${id}/cancel`).then((r) => r.data.token),
};
