import { create } from 'zustand';
import { Lead, LeadStatus } from '../types';
import { apiRequest } from '../utils/api';

interface LeadsState {
  leads: Lead[];
  statuses: string[];
  outcomes: string[];
  fetchLeads: () => Promise<void>;
  addLead: (lead: Omit<Lead, 'id' | 'createdAt' | 'notes' | 'isRevealed' | 'readableId' | 'shortId'>) => Promise<void>;
  updateLead: (id: string, updates: Partial<Lead>) => Promise<void>;
  updateStatus: (leadId: string, status: LeadStatus) => Promise<void>;
  updateAgent: (leadId: string, agentId: string, agentName: string) => Promise<void>;
  addNote: (leadId: string, content: string, author: string) => Promise<void>;
  revealContact: (leadId: string) => Promise<void>;
  setLeads: (leads: Lead[]) => void;
  bulkDelete: (ids: string[]) => Promise<void>;
  bulkAssign: (ids: string[], agentId: string, agentName: string) => Promise<void>;
  bulkStatusUpdate: (ids: string[], status: LeadStatus) => Promise<void>;
  addCustomStatus: (status: string) => void;
  removeCustomStatus: (status: string) => void;
  addOutcome: (outcome: string) => void;
  removeOutcome: (outcome: string) => void;
  purgeAll: () => Promise<void>;
  importLeads: (newLeadsData: any[]) => Promise<{ added: number; duplicates: any[] }>;
}

const DEFAULT_STATUSES = ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost', 'Converted'];
const DEFAULT_OUTCOMES = ['Busy', 'Follow-up', 'Interested', 'Not Interested', 'Meeting Required'];

export const useLeadsStore = create<LeadsState>((set, get) => ({
  leads: [],
  statuses: DEFAULT_STATUSES,
  outcomes: DEFAULT_OUTCOMES,

  fetchLeads: async () => {
    const data = await apiRequest<Lead[]>('/api/v1/leads');
    set({ leads: data });
  },

  addLead: async (lead) => {
    const created = await apiRequest<Lead>('/api/v1/leads', {
      method: 'POST',
      body: JSON.stringify(lead)
    });
    set((state) => ({ leads: [created, ...state.leads] }));
  },

  updateLead: async (id, updates) => {
    const updated = await apiRequest<Lead>(`/api/v1/leads/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
    set((state) => ({ leads: state.leads.map(l => l.id === id ? updated : l) }));
  },

  updateStatus: async (leadId, status) => {
    await get().updateLead(leadId, { status });
  },

  updateAgent: async (leadId, agentId, agentName) => {
    await get().updateLead(leadId, { assignedAgentId: agentId, assignedAgentName: agentName });
  },

  addNote: async (leadId, content, author) => {
    const updated = await apiRequest<Lead>(`/api/v1/leads/${leadId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ content, author })
    });
    set((state) => ({ leads: state.leads.map(l => l.id === leadId ? updated : l) }));
  },

  revealContact: async (leadId) => {
    const updated = await apiRequest<Lead>(`/api/v1/leads/${leadId}/reveal`, { method: 'POST' });
    set((state) => ({ leads: state.leads.map(l => l.id === leadId ? updated : l) }));
  },

  setLeads: (leads) => set({ leads }),

  bulkDelete: async (ids) => {
    await apiRequest('/api/v1/leads', {
      method: 'DELETE',
      body: JSON.stringify({ ids })
    });
    set((state) => ({ leads: state.leads.filter(l => !ids.includes(l.id)) }));
  },

  bulkAssign: async (ids, agentId, agentName) => {
    await apiRequest('/api/v1/leads/bulk-assign', {
      method: 'POST',
      body: JSON.stringify({ ids, agentId, agentName })
    });
    set((state) => ({
      leads: state.leads.map(l => ids.includes(l.id) ? { ...l, assignedAgentId: agentId, assignedAgentName: agentName } : l)
    }));
  },

  bulkStatusUpdate: async (ids, status) => {
    await apiRequest('/api/v1/leads/bulk-status', {
      method: 'POST',
      body: JSON.stringify({ ids, status })
    });
    set((state) => ({
      leads: state.leads.map(l => ids.includes(l.id) ? { ...l, status } : l)
    }));
  },

  addCustomStatus: (status) => set(state => {
    if (state.statuses.includes(status)) return state;
    return { statuses: [...state.statuses, status] };
  }),

  removeCustomStatus: (status) => set(state => ({
    statuses: state.statuses.filter(s => s !== status)
  })),

  addOutcome: (outcome) => set(state => {
    if (state.outcomes.includes(outcome)) return state;
    return { outcomes: [...state.outcomes, outcome] };
  }),

  removeOutcome: (outcome) => set(state => ({
    outcomes: state.outcomes.filter(o => o !== outcome)
  })),

  purgeAll: async () => {
    const ids = get().leads.map(l => l.id);
    if (ids.length === 0) return;
    await get().bulkDelete(ids);
  },

  importLeads: async (newLeadsData) => {
    const result = await apiRequest<{ added: number; duplicates: any[] }>('/api/v1/leads/import', {
      method: 'POST',
      body: JSON.stringify({ leads: newLeadsData })
    });
    await get().fetchLeads();
    return result;
  }
}));

