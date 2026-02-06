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
  labels: string[];
  attachments?: { name: string; size: string }[];
  category?: 'primary' | 'social' | 'promotions';
  folder?: string;
  imapUid?: number;
  messageId?: string;
}

interface MailState {
  emails: EmailMessage[];
  refreshing: boolean;
  error: string | null;
  fetchEmails: (accountId?: string, limit?: number) => Promise<void>;
  loadMore: (accountId?: string, batchSize?: number, skipOverride?: number) => Promise<void>;
  addMessage: (message: any) => void;
  syncEmails: (limit?: number, force?: boolean, accountId?: string) => Promise<void>;
  clearMailbox: () => Promise<void>;
  sendEmail: (to: string, subject: string, body: string) => void;
  addEmail: (email: EmailMessage) => void;
  markAsRead: (id: string) => void;
  toggleStar: (id: string) => void;
  deleteEmail: (id: string) => Promise<void>;
  updateLabels: (id: string, labels: string[]) => Promise<void>;
  moveToFolder: (id: string, folder: string) => Promise<void>;
  deleteForever: (id: string) => Promise<void>;
}

export const useMailStore = create<MailState>((set, get) => ({
  emails: [],
  refreshing: false,
  error: null,

  fetchEmails: async (accountId = 'all', limit = 500) => {
    set({ refreshing: true, error: null });
    try {
      const cacheKey = `mailbox_cache_${accountId}`;
      // Use cache ONLY on initial default load (limit 500) AND only if store is empty
      const cached = localStorage.getItem(cacheKey);
      if (limit === 500 && cached && get().emails.length === 0) {
        try {
          const cachedData = JSON.parse(cached);
          if (Array.isArray(cachedData)) {
            set({ emails: cachedData });
          } else if (Array.isArray(cachedData?.messages)) {
            set({ emails: cachedData.messages });
          }
        } catch { /* ignore */ }
      }

      const data = await apiRequest<any>(`/api/v1/mailbox/messages?accountId=${encodeURIComponent(accountId)}&limit=${limit}`);
      if (Array.isArray(data)) {
        localStorage.setItem(cacheKey, JSON.stringify(data));
        set({ emails: data, refreshing: false, error: null });
        return;
      }
      const messages = Array.isArray(data?.messages) ? data.messages : [];
      const errors = Array.isArray(data?.errors) ? data.errors.filter(Boolean) : [];
      localStorage.setItem(cacheKey, JSON.stringify({ messages }));
      set({
        emails: messages,
        refreshing: false,
        error: errors.length ? errors.join(' | ') : null
      });
    } catch (err: any) {
      set({ refreshing: false, error: err?.message || 'Failed to load emails' });
    }
  },

  addMessage: (message: any) => {
    set(state => {
      // Prevent duplicates
      if (state.emails.find(e => e.imapUid === message.imapUid || e.messageId === message.messageId)) {
        return {}; // No change
      }
      // Add to top
      return {
        emails: [message, ...state.emails]
      };
    });
  },

  loadMore: async (accountId = 'all', batchSize = 500, skipOverride?: number) => {
    set({ refreshing: true, error: null });
    try {
      const currentCount = get().emails.length;
      const skip = skipOverride !== undefined ? skipOverride : currentCount;

      // Fetch next batch using SKIP
      const data = await apiRequest<any>(
        `/api/v1/mailbox/messages?accountId=${encodeURIComponent(accountId)}&limit=${batchSize}&skip=${skip}`
      );

      const newMessages = Array.isArray(data) ? data : (data?.messages || []);
      const errors = !Array.isArray(data) && data?.errors ? data.errors : [];

      if (newMessages.length > 0) {
        set(state => {
          // Filter duplicates just in case
          const existingIds = new Set(state.emails.map(e => e.id));
          const uniqueNew = newMessages.filter((e: any) => !existingIds.has(e.id));

          // If we skipped significantly (gap in history), maybe we should warn or just append?
          // For now, valid use case: User wants to see old stuff.
          // We just append. The date sorting in UI handles display order.
          const updatedEmails = [...state.emails, ...uniqueNew];

          // Update cache with expanded list
          const cacheKey = `mailbox_cache_${accountId}`;
          localStorage.setItem(cacheKey, JSON.stringify(updatedEmails));

          return {
            emails: updatedEmails,
            refreshing: false,
            error: errors.length ? errors.join(' | ') : null
          };
        });
      } else {
        set({ refreshing: false }); // No more emails to load
        if (skipOverride !== undefined) {
          alert("No emails found at that offset.");
        }
      }
    } catch (err: any) {
      set({ refreshing: false, error: err?.message || 'Failed to load more emails' });
    }
  },

  syncEmails: async (limit = 100000, force = false, accountId = 'all') => {
    try {
      const res = await apiRequest<any>('/api/v1/mailbox/sync', { method: 'POST', body: JSON.stringify({ limit, force, accountId }) });
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
      isStarred: false,
      labels: []
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
    // Optimistic: Move to TRASH
    set((state) => ({
      emails: state.emails.map(e => e.id === id ? { ...e, folder: 'TRASH' } : e)
    }));
    try {
      await apiRequest(`/api/v1/mailbox/messages/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ folder: 'TRASH' })
      });
    } catch (e) { console.error(e); }
  },

  updateLabels: async (id, labels) => {
    set((state) => ({
      emails: state.emails.map(e => e.id === id ? { ...e, labels } : e)
    }));
    await apiRequest(`/api/v1/mailbox/messages/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ labels })
    });
  },

  addEmail: (email) => {
    set(state => ({ emails: [email, ...state.emails] }));
  },

  moveToFolder: async (id, folder) => {
    set((state) => ({
      emails: state.emails.map(e => e.id === id ? { ...e, folder } : e)
    }));
    await apiRequest(`/api/v1/mailbox/messages/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ folder })
    });
  },

  deleteForever: async (id) => {
    set((state) => ({
      emails: state.emails.filter(e => e.id !== id)
    }));
    await apiRequest(`/api/v1/mailbox/messages/${id}`, {
      method: 'DELETE'
    });
  },

}));
