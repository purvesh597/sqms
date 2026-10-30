import type { User } from '../types';
import { api } from './api';

export const authService = {
  login: (email: string, password: string) => api.post<{ user: User }>('/auth/login', { email, password }).then((r) => r.data.user),
  logout: () => api.post('/auth/logout'),
  me: () => api.get<{ user: User }>('/auth/me').then((r) => r.data.user),
  updateProfile: (data: { name: string; phone?: string }) => api.patch<{ user: User }>('/auth/profile', data).then((r) => r.data.user),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
};
