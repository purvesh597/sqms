import type { Counter, CounterWithStats, Meal, MenuItem, Overview, Report, Settings, Student, User } from '../types';
import { api } from './api';

export interface ReportFilters {
  from: string;
  to: string;
  counterId?: string;
  mealId?: string;
}

const clean = <T extends object>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v !== undefined));

export const adminService = {
  overview: () => api.get<Overview>('/admin/overview').then((r) => r.data),

  counters: () => api.get<{ counters: CounterWithStats[] }>('/admin/counters').then((r) => r.data.counters),
  createCounter: (data: Partial<Counter>) => api.post<{ counter: Counter }>('/admin/counters', data).then((r) => r.data.counter),
  updateCounter: (id: string, data: Partial<Counter>) =>
    api.patch<{ counter: Counter }>(`/admin/counters/${id}`, data).then((r) => r.data.counter),

  meals: () => api.get<{ meals: Meal[] }>('/admin/meals').then((r) => r.data.meals),
  updateMeal: (id: string, data: Partial<Meal>) => api.patch<{ meal: Meal }>(`/admin/meals/${id}`, data).then((r) => r.data.meal),
  settings: () => api.get<{ settings: Settings }>('/admin/settings').then((r) => r.data.settings),
  updateSettings: (data: Partial<Settings>) => api.patch<{ settings: Settings }>('/admin/settings', data).then((r) => r.data.settings),

  menu: (date: string, mealId?: string) =>
    api.get<{ items: MenuItem[] }>('/admin/menu', { params: clean({ date, mealId }) }).then((r) => r.data.items),
  createMenuItem: (data: Omit<MenuItem, 'id' | 'meal'>) => api.post<{ item: MenuItem }>('/admin/menu', data).then((r) => r.data.item),
  updateMenuItem: (id: string, data: Partial<MenuItem>) =>
    api.patch<{ item: MenuItem }>(`/admin/menu/${id}`, data).then((r) => r.data.item),
  deleteMenuItem: (id: string) => api.delete(`/admin/menu/${id}`),
  copyMenu: (fromDate: string, toDate: string, replace: boolean) =>
    api.post<{ copied: number }>('/admin/menu/copy', { fromDate, toDate, replace }).then((r) => r.data.copied),

  staff: (search?: string) => api.get<{ staff: User[] }>('/admin/staff', { params: clean({ search }) }).then((r) => r.data.staff),
  createStaff: (data: { name: string; email: string; phone?: string; password: string; assignedCounterId?: string | null }) =>
    api.post<{ user: User }>('/admin/staff', data).then((r) => r.data.user),
  updateStaff: (id: string, data: Record<string, unknown>) => api.patch<{ user: User }>(`/admin/staff/${id}`, data).then((r) => r.data.user),

  students: (search?: string) =>
    api.get<{ students: Student[] }>('/admin/students', { params: clean({ search }) }).then((r) => r.data.students),

  report: (f: ReportFilters) => api.get<Report>('/admin/reports', { params: clean(f) }).then((r) => r.data),
  async exportCsv(f: ReportFilters, type: 'summary' | 'tokens') {
    const res = await api.get<Blob>('/admin/reports/export', { params: clean({ ...f, type }), responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sqms-${type}-${f.from}_to_${f.to}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};
