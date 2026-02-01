import { create } from 'zustand';
import { ServicePlan } from '../types';
import { apiRequest } from '../utils/api';

interface ServicesState {
  plans: ServicePlan[];
  fetchPlans: () => Promise<void>;
  addPlan: (plan: Omit<ServicePlan, 'id'>) => Promise<void>;
  removePlan: (id: string) => Promise<void>;
  updatePlan: (id: string, updates: Partial<ServicePlan>) => Promise<void>;
}

export const useServicesStore = create<ServicesState>((set) => ({
  plans: [],

  fetchPlans: async () => {
    const data = await apiRequest<ServicePlan[]>('/api/v1/services');
    set({ plans: data });
  },

  addPlan: async (plan) => {
    const created = await apiRequest<ServicePlan>('/api/v1/services', {
      method: 'POST',
      body: JSON.stringify(plan)
    });
    set((state) => ({ plans: [created, ...state.plans] }));
  },

  removePlan: async (id) => {
    await apiRequest(`/api/v1/services/${id}`, { method: 'DELETE' });
    set((state) => ({ plans: state.plans.filter(p => p.id !== id) }));
  },

  updatePlan: async (id, updates) => {
    const updated = await apiRequest<ServicePlan>(`/api/v1/services/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
    set((state) => ({ plans: state.plans.map(p => p.id === id ? updated : p) }));
  },
}));
