import { create } from 'zustand';
import { User, Role } from '../types';
import { apiRequest } from '../utils/api';

interface TeamState {
  members: User[];
  fetchMembers: () => Promise<void>;
  addMember: (member: Omit<User, 'id' | 'status' | 'lastActive'> & { password?: string }) => Promise<void>;
  updateMember: (id: string, updates: Partial<User>) => Promise<void>;
  removeMember: (id: string) => Promise<void>;
  updateRole: (id: string, role: Role) => Promise<void>;
  toggleBlockStatus: (id: string) => Promise<void>;
}

export const useTeamStore = create<TeamState>((set, get) => ({
  members: [],

  fetchMembers: async () => {
    const data = await apiRequest<User[]>('/api/v1/users');
    set({ members: data });
  },

  addMember: async (member) => {
    const created = await apiRequest<User>('/api/v1/users', {
      method: 'POST',
      body: JSON.stringify(member)
    });
    set(state => ({ members: [created, ...state.members] }));
  },

  updateMember: async (id, updates) => {
    const updated = await apiRequest<User>(`/api/v1/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
    set(state => ({ members: state.members.map(m => m.id === id ? updated : m) }));
  },

  removeMember: async (id) => {
    await apiRequest(`/api/v1/users/${id}`, { method: 'DELETE' });
    set(state => ({ members: state.members.filter(m => m.id !== id) }));
  },

  updateRole: async (id, role) => {
    await get().updateMember(id, { role });
  },

  toggleBlockStatus: async (id) => {
    const member = get().members.find(m => m.id === id);
    if (!member) return;
    const nextStatus = member.status === 'active' ? 'blocked' : 'active';
    await get().updateMember(id, { status: nextStatus });
  }
}));

