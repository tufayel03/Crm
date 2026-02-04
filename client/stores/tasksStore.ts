import { create } from 'zustand';
import { Task } from '../types';
import { apiRequest } from '../utils/api';

interface TasksState {
  tasks: Task[];
  fetchTasks: () => Promise<void>;
  createTask: (task: Omit<Task, 'id' | 'status'>) => Promise<void>;
  completeTask: (taskId: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  deleteCompletedTasks: () => Promise<string[]>;
  rescheduleTask: (taskId: string, newDate: string) => Promise<void>;
  purgeAll: () => Promise<void>;
}

export const useTasksStore = create<TasksState>((set, get) => ({
  tasks: [],

  fetchTasks: async () => {
    const data = await apiRequest<Task[]>('/api/v1/tasks');
    set({ tasks: data });
  },

  createTask: async (task) => {
    const created = await apiRequest<Task>('/api/v1/tasks', {
      method: 'POST',
      body: JSON.stringify(task)
    });
    set(state => ({ tasks: [created, ...state.tasks] }));
  },

  completeTask: async (taskId) => {
    const updated = await apiRequest<Task>(`/api/v1/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'completed' })
    });
    set(state => ({ tasks: state.tasks.map(t => t.id === taskId ? updated : t) }));
  },

  deleteTask: async (taskId) => {
    await apiRequest(`/api/v1/tasks/${taskId}`, { method: 'DELETE' });
    set(state => ({ tasks: state.tasks.filter(t => t.id !== taskId) }));
  },

  deleteCompletedTasks: async () => {
    const result = await apiRequest<{ deletedIds: string[] }>('/api/v1/tasks/completed', { method: 'DELETE' });
    const deletedIds = result?.deletedIds || [];
    if (deletedIds.length > 0) {
      set(state => ({ tasks: state.tasks.filter(t => !deletedIds.includes(t.id)) }));
    }
    return deletedIds;
  },

  rescheduleTask: async (taskId, newDate) => {
    const updated = await apiRequest<Task>(`/api/v1/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify({ dueDate: newDate })
    });
    set(state => ({ tasks: state.tasks.map(t => t.id === taskId ? updated : t) }));
  },

  purgeAll: async () => {
    const ids = get().tasks.map(t => t.id);
    for (const id of ids) {
      await get().deleteTask(id);
    }
  }
}));

