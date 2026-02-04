import { create } from 'zustand';
import { Client, Payment, ServiceSubscription, Lead, ClientDocument } from '../types';
import { apiRequest } from '../utils/api';

interface ClientsState {
  clients: Client[];
  payments: Payment[];

  fetchClients: () => Promise<void>;
  fetchPayments: () => Promise<void>;
  addClient: (client: Partial<Client>) => Promise<void>;
  updateClient: (id: string, updates: Partial<Client>) => Promise<void>;
  convertLeadToClient: (lead: Lead, companyName: string) => Promise<void>;
  removeClients: (ids: string[]) => Promise<void>;
  updateSubscription: (clientId: string, subId: string, updates: Partial<ServiceSubscription>) => Promise<void>;
  addClientService: (clientId: string, service: ServiceSubscription) => Promise<void>;
  removeClientService: (clientId: string, serviceId: string) => Promise<void>;
  addClientNote: (clientId: string, content: string, author: string) => Promise<void>;

  updateWalletBalance: (clientId: string, amount: number, operation: 'credit' | 'debit' | 'set') => Promise<void>;

  addPayment: (payment: Payment) => Promise<void>;
  updatePayment: (paymentId: string, updates: Partial<Payment>) => Promise<void>;
  updatePaymentStatus: (paymentId: string, status: 'Paid' | 'Due' | 'Overdue') => Promise<void>;
  deletePayment: (paymentId: string) => Promise<void>;
  bulkDeletePayments: (paymentIds: string[]) => Promise<void>;
  sendInvoiceEmail: (paymentId: string, payload: { to?: string; subject?: string; html?: string; attachmentBase64?: string; attachmentName?: string; attachmentType?: string }) => Promise<void>;

  addClientDocument: (clientId: string, document: ClientDocument) => Promise<void>;
  removeClientDocument: (clientId: string, documentId: string, category: 'invoice' | 'contract') => Promise<void>;
  uploadClientDocument: (clientId: string, file: File, category: 'invoice' | 'contract') => Promise<void>;
  importClients: (data: any[]) => Promise<{ added: number; duplicates: any[] }>;
  purgeAll: () => Promise<void>;
}

export const useClientsStore = create<ClientsState>((set, get) => ({
  clients: [],
  payments: [],

  fetchClients: async () => {
    const data = await apiRequest<Client[]>('/api/v1/clients');
    set({ clients: data });
  },

  fetchPayments: async () => {
    const data = await apiRequest<Payment[]>('/api/v1/payments');
    set({ payments: data });
  },

  addClient: async (client) => {
    const created = await apiRequest<Client>('/api/v1/clients', {
      method: 'POST',
      body: JSON.stringify(client)
    });
    set(state => ({ clients: [created, ...state.clients] }));
  },

  updateClient: async (id, updates) => {
    const updated = await apiRequest<Client>(`/api/v1/clients/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
    set(state => ({ clients: state.clients.map(c => c.id === id ? updated : c) }));
  },

  updateWalletBalance: async (clientId, amount, operation) => {
    const updated = await apiRequest<Client>(`/api/v1/clients/${clientId}/wallet`, {
      method: 'PATCH',
      body: JSON.stringify({ amount, operation })
    });
    set(state => ({ clients: state.clients.map(c => c.id === clientId ? updated : c) }));
  },

  convertLeadToClient: async (lead, companyName) => {
    const created = await apiRequest<Client>('/api/v1/clients/convert', {
      method: 'POST',
      body: JSON.stringify({ leadId: lead.id, companyName })
    });
    set(state => ({ clients: [created, ...state.clients] }));
  },

  removeClients: async (ids) => {
    await apiRequest('/api/v1/clients', {
      method: 'DELETE',
      body: JSON.stringify({ ids })
    });
    set(state => ({ clients: state.clients.filter(c => !ids.includes(c.id)) }));
  },

  updateSubscription: async (clientId, subId, updates) => {
    const updated = await apiRequest<Client>(`/api/v1/clients/${clientId}/services`, {
      method: 'PATCH',
      body: JSON.stringify({ serviceId: subId, updates })
    });
    set(state => ({ clients: state.clients.map(c => c.id === clientId ? updated : c) }));
  },

  addClientService: async (clientId, service) => {
    const updated = await apiRequest<Client>(`/api/v1/clients/${clientId}/services`, {
      method: 'POST',
      body: JSON.stringify({ service })
    });
    set(state => ({ clients: state.clients.map(c => c.id === clientId ? updated : c) }));
  },

  removeClientService: async (clientId, serviceId) => {
    const updated = await apiRequest<Client>(`/api/v1/clients/${clientId}/services`, {
      method: 'DELETE',
      body: JSON.stringify({ serviceId })
    });
    set(state => ({ clients: state.clients.map(c => c.id === clientId ? updated : c) }));
  },

  addClientNote: async (clientId, content, author) => {
    const updated = await apiRequest<Client>(`/api/v1/clients/${clientId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ content, author })
    });
    set(state => ({ clients: state.clients.map(c => c.id === clientId ? updated : c) }));
  },

  addPayment: async (payment) => {
    const created = await apiRequest<Payment>('/api/v1/payments', {
      method: 'POST',
      body: JSON.stringify(payment)
    });
    set(state => ({ payments: [created, ...state.payments] }));
  },

  updatePayment: async (paymentId, updates) => {
    const updated = await apiRequest<Payment>(`/api/v1/payments/${paymentId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
    set(state => ({ payments: state.payments.map(p => p.id === paymentId ? updated : p) }));
  },

  updatePaymentStatus: async (paymentId, status) => {
    const updated = await apiRequest<Payment>(`/api/v1/payments/${paymentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
    set(state => ({ payments: state.payments.map(p => p.id === paymentId ? updated : p) }));
  },

  deletePayment: async (paymentId) => {
    await apiRequest(`/api/v1/payments/${paymentId}`, { method: 'DELETE' });
    set(state => ({ payments: state.payments.filter(p => p.id !== paymentId) }));
  },

  sendInvoiceEmail: async (paymentId, payload) => {
    await apiRequest(`/api/v1/payments/${paymentId}/send-invoice`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  bulkDeletePayments: async (paymentIds) => {
    if (!paymentIds || paymentIds.length === 0) return;
    await apiRequest('/api/v1/payments', {
      method: 'DELETE',
      body: JSON.stringify({ ids: paymentIds })
    });
    set(state => ({ payments: state.payments.filter(p => !paymentIds.includes(p.id)) }));
  },

  addClientDocument: async (clientId, document) => {
    const updated = await apiRequest<Client>(`/api/v1/clients/${clientId}/documents`, {
      method: 'POST',
      body: JSON.stringify({ document })
    });
    set(state => ({ clients: state.clients.map(c => c.id === clientId ? updated : c) }));
  },

  uploadClientDocument: async (clientId, file, category) => {
    const form = new FormData();
    form.append('file', file);
    form.append('category', category);
    const updated = await apiRequest<Client>(`/api/v1/clients/${clientId}/upload`, {
      method: 'POST',
      body: form
    });
    set(state => ({ clients: state.clients.map(c => c.id === clientId ? updated : c) }));
  },

  removeClientDocument: async (clientId, documentId, category) => {
    const updated = await apiRequest<Client>(`/api/v1/clients/${clientId}/documents`, {
      method: 'DELETE',
      body: JSON.stringify({ documentId, category })
    });
    set(state => ({ clients: state.clients.map(c => c.id === clientId ? updated : c) }));
  },

  importClients: async (newClientsData) => {
    const result = await apiRequest<{ added: number; duplicates: any[] }>('/api/v1/clients/import', {
      method: 'POST',
      body: JSON.stringify({ clients: newClientsData })
    });
    await get().fetchClients();
    return result;
  },

  purgeAll: async () => {
    const ids = get().clients.map(c => c.id);
    if (ids.length) await get().removeClients(ids);
    set({ payments: [] });
  }
}));

