import { create } from 'zustand';
import { apiRequest } from '../utils/api';

export interface EmailMessage {
  id: string;
  from: string;
  fromName: string;
  to: string;
  subject: string;
  body: string; // HTML supported
  timestamp: string;
  isRead: boolean;
  isStarred: boolean;
  attachments?: { name: string; size: string }[];
  category?: 'primary' | 'social' | 'promotions';
}

interface MailState {
  emails: EmailMessage[];
  refreshing: boolean;
  error: string | null;
  fetchEmails: (accountId?: string) => Promise<void>;
  syncEmails: (limit?: number) => Promise<void>;
  clearMailbox: () => Promise<void>;
  sendEmail: (to: string, subject: string, body: string) => void;
  markAsRead: (id: string) => void;
  toggleStar: (id: string) => void;
  deleteEmail: (id: string) => void;
}

export const useMailStore = create<MailState>((set, get) => ({
  emails: [],
  refreshing: false,
  error: null,

  fetchEmails: async (accountId = 'all') => {
    set({ refreshing: true, error: null });
    try {
      const data = await apiRequest<any>(`/api/v1/mailbox/messages?accountId=${encodeURIComponent(accountId)}&limit=1000`);
      if (Array.isArray(data)) {
        set({ emails: data, refreshing: false, error: null });
        return;
      }
      const messages = Array.isArray(data?.messages) ? data.messages : [];
      const errors = Array.isArray(data?.errors) ? data.errors.filter(Boolean) : [];
      set({
        emails: messages,
        refreshing: false,
        error: errors.length ? errors.join(' | ') : null
      });
    } catch (err: any) {
      set({ refreshing: false, error: err?.message || 'Failed to load emails' });
    }
  },

  syncEmails: async (limit = 1000) => {
    try {
      const res = await apiRequest<any>('/api/v1/mailbox/sync', { method: 'POST', body: JSON.stringify({ limit }) });
      const errors = Array.isArray(res?.errors) ? res.errors.filter(Boolean) : [];
      if (errors.length) {
        set({ error: errors.join(' | ') });
      }
    } catch (err: any) {
      set({ error: err?.message || 'Failed to sync mailbox' });
    }
  },

  clearMailbox: async () => {
    await apiRequest('/api/v1/mailbox/messages', { method: 'DELETE' });
    set({ emails: [] });
  },

  sendEmail: (to, subject, body) => set((state) => ({
    emails: [{
      id: 'sent-' + Math.random().toString(36).substr(2, 9),
      from: 'me@matlance.com',
      fromName: 'Me',
      to,
      subject,
      body,
      timestamp: new Date().toISOString(),
      isRead: true,
      isStarred: false
    }, ...state.emails]
  })),

  markAsRead: async (id) => {
    // Optimistic update
    set((state) => ({
      emails: state.emails.map(e => e.id === id ? { ...e, isRead: true } : e)
    }));
    await apiRequest(`/api/v1/mailbox/messages/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isRead: true })
    });
  },

  toggleStar: async (id) => {
    const email = get().emails.find(e => e.id === id);
    if (!email) return;
    const newVal = !email.isStarred;

    set((state) => ({
      emails: state.emails.map(e => e.id === id ? { ...e, isStarred: newVal } : e)
    }));
    await apiRequest(`/api/v1/mailbox/messages/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isStarred: newVal })
    });
  },

  deleteEmail: async (id) => {
    set((state) => ({
      emails: state.emails.filter(e => e.id !== id)
    }));
    // Note: If you want persistent delete, you'd add an API call here too. 
    // Assuming clearMailbox is global, but usually we need deleteMessage(id). 
    // Controller currently doesn't have deleteSingleMessage, so we leave it local or add it later.
  },

}));
