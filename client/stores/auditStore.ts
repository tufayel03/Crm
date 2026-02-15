import { create } from 'zustand';
import { AuditLog } from '../types';
import { apiRequest } from '../utils/api';

export interface AuditLogFilters {
  search?: string;
  action?: string;
  module?: string;
  severity?: string;
  userId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

interface AuditState {
  logs: AuditLog[];
  total: number;
  fetchLogs: (filters?: AuditLogFilters) => Promise<void>;
  addLog: (log: Omit<AuditLog, 'id' | 'timestamp'>) => Promise<void>;
  purgeAll: (filters?: AuditLogFilters) => Promise<void>;
  deleteLog: (id: string) => Promise<void>;
}

const toQuery = (filters: AuditLogFilters = {}) => {
  const qs = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    qs.set(key, String(value));
  });
  const query = qs.toString();
  return query ? `?${query}` : '';
};

export const useAuditStore = create<AuditState>((set) => ({
  logs: [],
  total: 0,

  fetchLogs: async (filters = {}) => {
    const data = await apiRequest<{ logs: AuditLog[]; total: number; page: number; limit: number }>(`/api/v1/audit${toQuery(filters)}`);
    set({ logs: data.logs || [], total: data.total || 0 });
  },

  addLog: async (log) => {
    const created = await apiRequest<AuditLog>('/api/v1/audit', {
      method: 'POST',
      body: JSON.stringify(log)
    });
    set((state) => ({ logs: [created, ...state.logs].slice(0, 1000), total: (state.total || 0) + 1 }));
  },

  purgeAll: async (filters = {}) => {
    await apiRequest(`/api/v1/audit${toQuery(filters)}`, { method: 'DELETE' });
    set({ logs: [], total: 0 });
  },

  deleteLog: async (id) => {
    await apiRequest(`/api/v1/audit/${id}`, { method: 'DELETE' });
    set((state) => ({
      logs: state.logs.filter((log) => log.id !== id),
      total: Math.max(0, (state.total || 0) - 1)
    }));
  }
}));
