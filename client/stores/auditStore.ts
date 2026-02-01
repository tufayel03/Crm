import { create } from 'zustand';
import { AuditLog } from '../types';
import { apiRequest } from '../utils/api';

interface AuditState {
  logs: AuditLog[];
  fetchLogs: () => Promise<void>;
  addLog: (log: Omit<AuditLog, 'id' | 'timestamp'>) => Promise<void>;
  purgeAll: () => Promise<void>;
}

export const useAuditStore = create<AuditState>((set) => ({
  logs: [],

  fetchLogs: async () => {
    const data = await apiRequest<AuditLog[]>('/api/v1/audit');
    set({ logs: data });
  },

  addLog: async (log) => {
    const created = await apiRequest<AuditLog>('/api/v1/audit', {
      method: 'POST',
      body: JSON.stringify(log)
    });
    set(state => ({ logs: [created, ...state.logs].slice(0, 1000) }));
  },

  purgeAll: async () => {
    await apiRequest('/api/v1/audit', { method: 'DELETE' });
    set({ logs: [] });
  }
}));

