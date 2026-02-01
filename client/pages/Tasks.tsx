
import React, { useState, useMemo, useEffect } from 'react';
import { useTasksStore } from '../stores/tasksStore';
import { useAuthStore } from '../stores/authStore';
import { useTeamStore } from '../stores/teamStore';
import { useNotificationStore } from '../stores/notificationStore';
import { 
  CheckSquare, 
  Plus, 
  Search, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  Trash2,
  X,
  User as UserIcon
} from 'lucide-react';

const Tasks: React.FC = () => {
  const { tasks, createTask, completeTask, deleteTask, fetchTasks } = useTasksStore();
  const { user } = useAuthStore();
  const { members, fetchMembers } = useTeamStore();
  const { addNotification } = useNotificationStore();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('pending');
  const [search, setSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    dueDate: new Date().toISOString().split('T')[0],
    priority: 'medium' as 'low' | 'medium' | 'high',
    assignedTo: user?.id || ''
  });

  useEffect(() => {
    fetchTasks();
    fetchMembers();
    const interval = setInterval(() => {
      fetchTasks();
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchTasks, fetchMembers]);

  useEffect(() => {
    if (user?.id) {
      setNewTask(prev => (prev.assignedTo ? prev : { ...prev, assignedTo: user.id }));
    }
  }, [user?.id]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      // Visibility Rule: Only show tasks created by me OR assigned to me
      const isVisible = t.assignedTo === user?.id || t.createdBy === user?.id;
      
      if (!isVisible) return false;

      const matchesSearch = String(t.title || '').toLowerCase().includes(search.toLowerCase());
      const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
      
      return matchesSearch && matchesStatus;
    }).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [tasks, search, filterStatus, user?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!newTask.title.trim()) {
      setFormError('Title is required.');
      return;
    }
    if (!user?.id) {
      setFormError('User not loaded. Please refresh and try again.');
      return;
    }
    
    const assignedToFinal = newTask.assignedTo || user.id;
    const assignedUser = members.find(m => m.id === assignedToFinal) ||
      (assignedToFinal === user.id ? { id: user.id, name: user.name } : { id: 'unknown', name: 'Unknown' });

    try {
      setIsCreating(true);
      await createTask({
        ...newTask,
        createdBy: user.id,
        createdByName: user.name || 'Unknown',
        assignedTo: assignedToFinal,
        assignedToName: assignedUser.name
      });
      addNotification('success', 'Task created.');
      setIsModalOpen(false);
      setNewTask({
        title: '',
        description: '',
        dueDate: new Date().toISOString().split('T')[0],
        priority: 'medium',
        assignedTo: user.id
      });
    } catch (err: any) {
      const message = err?.message || 'Failed to create task.';
      setFormError(message);
      addNotification('error', message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = (id: string) => {
    if(window.confirm("Are you sure you want to permanently delete this task?")) {
        deleteTask(id);
    }
  };

  const getPriorityColor = (p: string) => {
    switch(p) {
      case 'high': return 'bg-danger text-white';
      case 'medium': return 'bg-warning text-white';
      case 'low': return 'bg-info text-white';
      default: return 'bg-slate-400 text-white';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-textPrimary">Tasks & To-Dos</h2>
          <p className="text-textSecondary">Manage your assignments and team requests.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-darkGreen text-white font-bold rounded-xl shadow-lg shadow-darkGreen/10 hover:bg-opacity-90 transition-all"
        >
          <Plus size={20} /> New Task
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-border flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" size={18} />
          <input 
            type="text" 
            placeholder="Search tasks..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-appBg border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'pending', 'completed'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status as any)}
              className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition-colors ${
                filterStatus === status 
                  ? 'bg-softMint text-darkGreen border border-primary' 
                  : 'bg-appBg text-textSecondary border border-border hover:bg-slate-100'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTasks.length === 0 ? (
          <div className="col-span-full py-20 text-center text-textMuted border-2 border-dashed border-border rounded-2xl bg-slate-50">
            <CheckSquare size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">No tasks found</p>
            <p className="text-sm">You have no pending tasks assigned to you or created by you.</p>
          </div>
        ) : (
          filteredTasks.map(task => (
            <div key={task.id} className={`group bg-white p-5 rounded-2xl border border-border shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col h-full ${task.status === 'completed' ? 'opacity-70 bg-slate-50' : ''}`}>
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${task.status === 'completed' ? 'bg-success' : (task.priority === 'high' ? 'bg-danger' : task.priority === 'medium' ? 'bg-warning' : 'bg-info')}`} />
              
              <div className="flex justify-between items-start mb-3 pl-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getPriorityColor(task.priority)}`}>
                  {task.priority}
                </span>
                <div className="flex items-center gap-1">
                    {task.status === 'completed' && (
                        <button 
                            onClick={() => handleDelete(task.id)}
                            className="text-textMuted hover:text-danger transition-colors p-1"
                            title="Delete Task"
                        >
                            <Trash2 size={18} />
                        </button>
                    )}
                    {task.status === 'pending' ? (
                    <button 
                        onClick={() => completeTask(task.id)}
                        className="text-textMuted hover:text-success transition-colors p-1"
                        title="Mark Complete"
                    >
                        <div className="w-5 h-5 rounded-full border-2 border-border hover:border-success flex items-center justify-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-success opacity-0 hover:opacity-100 transition-opacity" />
                        </div>
                    </button>
                    ) : (
                    <CheckCircle2 size={22} className="text-success p-0.5" />
                    )}
                </div>
              </div>

              <h3 className={`font-bold text-textPrimary mb-2 pl-2 ${task.status === 'completed' ? 'line-through decoration-textMuted' : ''}`}>
                {task.title}
              </h3>
              <p className="text-sm text-textSecondary mb-4 pl-2 line-clamp-2 flex-grow">
                {task.description || 'No description provided.'}
              </p>

              {/* Assignment Info */}
              <div className="mb-4 pl-2">
                <div className="flex items-center gap-2 text-xs text-textSecondary bg-slate-100 p-2 rounded-lg">
                    <UserIcon size={14} className="text-textMuted" />
                    <div className="flex flex-col">
                        <span className="font-bold text-textPrimary">To: {task.assignedTo === user?.id ? 'Me' : task.assignedToName}</span>
                        <span className="text-[10px] text-textMuted flex items-center gap-1">
                            From: {task.createdBy === user?.id ? 'Me' : task.createdByName}
                        </span>
                    </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-textMuted border-t border-border pt-4 pl-2">
                <div className="flex items-center gap-1">
                  <Calendar size={14} />
                  <span className={new Date(task.dueDate) < new Date() && task.status === 'pending' ? 'text-danger font-bold' : ''}>
                    {new Date(task.dueDate).toLocaleDateString()}
                  </span>
                </div>
                {task.status === 'pending' && new Date(task.dueDate) < new Date() && (
                  <span className="flex items-center gap-1 text-danger font-bold">
                    <AlertCircle size={12} /> Overdue
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-textPrimary">Create New Task</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-textMuted hover:text-danger">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-textSecondary uppercase mb-1">Title</label>
                <input 
                  type="text" 
                  value={newTask.title}
                  onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                  className="w-full px-3 py-2 bg-appBg border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                  placeholder="e.g. Prepare Monthly Report"
                  required 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-textSecondary uppercase mb-1">Assign To</label>
                <select 
                    value={newTask.assignedTo}
                    onChange={(e) => setNewTask({...newTask, assignedTo: e.target.value})}
                    className="w-full px-3 py-2 bg-appBg border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                >
                    <option value={user?.id}>Myself ({user?.name})</option>
                    {members.filter(m => m.id !== user?.id).map(member => (
                        <option key={member.id} value={member.id}>
                            {member.name} ({member.role})
                        </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-textSecondary uppercase mb-1">Due Date</label>
                  <input 
                    type="date" 
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask({...newTask, dueDate: e.target.value})}
                    className="w-full px-3 py-2 bg-appBg border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                    required 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-textSecondary uppercase mb-1">Priority</label>
                  <select 
                    value={newTask.priority}
                    onChange={(e) => setNewTask({...newTask, priority: e.target.value as any})}
                    className="w-full px-3 py-2 bg-appBg border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-textSecondary uppercase mb-1">Description</label>
                <textarea 
                  value={newTask.description}
                  onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                  className="w-full px-3 py-2 bg-appBg border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none min-h-[80px]"
                  placeholder="Additional details..."
                />
              </div>

              {formError && (
                <div className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">
                  {formError}
                </div>
              )}

              <button 
                type="submit" 
                disabled={isCreating}
                className="w-full py-3 mt-2 bg-darkGreen text-white font-bold rounded-xl hover:bg-opacity-90 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isCreating ? 'Creating...' : 'Create Task'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;
