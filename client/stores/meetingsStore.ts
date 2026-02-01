import { create } from 'zustand';
import { Meeting } from '../types';
import { apiRequest } from '../utils/api';

interface MeetingsState {
  meetings: Meeting[];
  fetchMeetings: () => Promise<void>;
  addMeeting: (meeting: Omit<Meeting, 'id' | 'status'>) => Promise<void>;
  updateMeeting: (id: string, updates: Partial<Meeting>) => Promise<void>;
  updateStatus: (id: string, status: Meeting['status']) => Promise<void>;
  cancelMeeting: (id: string) => Promise<void>;
  deleteMeeting: (id: string) => Promise<void>;
  checkReminders: () => Promise<void>;
  purgeAll: () => Promise<void>;
}

export const useMeetingsStore = create<MeetingsState>((set, get) => ({
  meetings: [],

  fetchMeetings: async () => {
    const data = await apiRequest<Meeting[]>('/api/v1/meetings');
    set({ meetings: data });
  },

  addMeeting: async (meeting) => {
    const created = await apiRequest<Meeting>('/api/v1/meetings', {
      method: 'POST',
      body: JSON.stringify(meeting)
    });
    set(state => ({ meetings: [created, ...state.meetings] }));
  },

  updateMeeting: async (id, updates) => {
    const updated = await apiRequest<Meeting>(`/api/v1/meetings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
    set(state => ({ meetings: state.meetings.map(m => m.id === id ? updated : m) }));
  },

  updateStatus: async (id, status) => {
    await get().updateMeeting(id, { status });
  },

  cancelMeeting: async (id) => {
    await get().updateMeeting(id, { status: 'Cancelled' });
  },

  deleteMeeting: async (id) => {
    await apiRequest(`/api/v1/meetings/${id}`, { method: 'DELETE' });
    set(state => ({ meetings: state.meetings.filter(m => m.id !== id) }));
  },

  checkReminders: async () => {
    // Reminder logic should run on backend in production.
  },

  purgeAll: async () => {
    const ids = get().meetings.map(m => m.id);
    for (const id of ids) {
      await get().deleteMeeting(id);
    }
  }
}));

