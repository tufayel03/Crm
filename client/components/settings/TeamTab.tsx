
import React, { useState, useRef, useEffect } from 'react';
import { useTeamStore } from '../../stores/teamStore';
import { useAuthStore } from '../../stores/authStore';
import { useCampaignStore } from '../../stores/campaignStore'; // For sending emails
import { apiRequest } from '../../utils/api';
import { useSettingsStore } from '../../stores/settingsStore';
import { 
    Plus, Search, Trash2, Shield, Mail, Users as UsersIcon, 
    MoreVertical, Lock, Unlock, Edit2, KeyRound, Filter, CheckCircle2,
    ChevronLeft, ChevronRight
} from 'lucide-react';
import UserFormModal from './UserFormModal';
import { Role, User } from '../../types';

const TeamTab: React.FC = () => {
  const { members, addMember, removeMember, toggleBlockStatus, updateMember } = useTeamStore();
  const { user: currentUser } = useAuthStore(); 
  const { sendSingleEmail } = useCampaignStore();
  const { systemTemplates, generalSettings } = useSettingsStore();
  
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'All' | Role>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'active' | 'blocked' | 'pending'>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const itemsPerPage = 10;
  
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | undefined>(undefined);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('[data-menu-trigger="team-menu"]')) return;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setMenuOpenId(null);
        setMenuPosition(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredMembers = members.filter(m => {
    const matchesSearch = 
        String(m.name || '').toLowerCase().includes(search.toLowerCase()) || 
        String(m.email || '').toLowerCase().includes(search.toLowerCase());
    
    const matchesRole = roleFilter === 'All' || m.role === roleFilter;
    const matchesStatus = statusFilter === 'All' || m.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });
  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage) || 1;
  const paginatedMembers = filteredMembers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (newPage: number) => {
    const page = Math.max(1, Math.min(newPage, totalPages));
    setCurrentPage(page);
    setPageInput(page.toString());
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(pageInput);
    if (!isNaN(page)) {
      handlePageChange(page);
    } else {
      setPageInput(currentPage.toString());
    }
  };

  const getRoleBadgeColor = (role: Role) => {
    switch(role) {
      case 'admin': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'manager': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'agent': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-slate-100 text-slate-700';
    }
  };
  const getStatusBadge = (status: string) => {
    if (status === 'pending') return 'bg-yellow-100 text-yellow-700';
    if (status === 'blocked') return 'bg-red-100 text-red-700';
    return 'bg-green-100 text-green-700';
  };

  // --- Actions ---

  const handleEdit = (user: User) => {
      setEditingUser(user);
      setIsFormModalOpen(true);
      setMenuOpenId(null);
      setMenuPosition(null);
  };

  const handleCreate = () => {
      setEditingUser(undefined);
      setIsFormModalOpen(true);
  };

  const handleSaveUser = (data: any) => {
      if (editingUser) {
          updateMember(editingUser.id, data);
      } else {
          addMember(data);
          // Send Invite Email (Simulated)
          sendSingleEmail(
              data.email, 
              `Welcome to ${generalSettings.companyName}`, 
              `<p>Hi ${data.name},</p><p>You have been invited to join the team.</p>`
          );
      }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to remove this user permanently? This action cannot be undone.')) {
      removeMember(id);
    }
    setMenuOpenId(null);
  };

  const handleToggleBlock = (id: string, currentStatus: string) => {
      const action = currentStatus === 'active' ? 'block' : 'unblock';
      if (confirm(`Are you sure you want to ${action} this user?`)) {
          toggleBlockStatus(id);
      }
      setMenuOpenId(null);
      setMenuPosition(null);
  };
  const handleApprove = (user: User) => {
      if (!confirm(`Approve ${user.name} for client portal access?`)) return;
      updateMember(user.id, { status: 'active' });
      setMenuOpenId(null);
      setMenuPosition(null);
  };

  const handleResetPassword = async (email: string, name: string) => {
      try {
          await apiRequest('/api/v1/auth/forgot', {
              method: 'POST',
              body: JSON.stringify({ email, resetBaseUrl: window.location.origin })
          });
          alert(`Password reset link sent to ${email}`);
      } catch (e: any) {
          alert(e?.message || 'Failed to send reset email');
      } finally {
          setMenuOpenId(null);
          setMenuPosition(null);
      }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-lg font-bold text-textPrimary flex items-center gap-2">
            <UsersIcon className="text-primary" /> User Management
          </h3>
          <p className="text-sm text-textSecondary mt-1">
            Create users, manage roles, and control access permissions.
          </p>
        </div>
        <button 
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-darkGreen text-white font-bold rounded-xl hover:bg-opacity-90 shadow-lg shadow-darkGreen/10 transition-all text-sm"
        >
          <Plus size={16} /> Create User
        </button>
      </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" size={18} />
                <input 
                    type="text" 
                    placeholder="Search users..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm"
                />
            </div>
            <div className="flex gap-2">
                <div className="relative">
                    <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
                    <select 
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value as any)}
                        className="pl-9 pr-4 py-2 bg-white border border-border rounded-xl text-sm outline-none focus:border-primary appearance-none"
                    >
                        <option value="All">All Roles</option>
                        <option value="admin">Admin</option>
                        <option value="manager">Manager</option>
                        <option value="agent">Agent</option>
                    </select>
                </div>
                <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="px-4 py-2 bg-white border border-border rounded-xl text-sm outline-none focus:border-primary"
                >
                    <option value="All">All Status</option>
                    <option value="active">Active</option>
                    <option value="blocked">Blocked</option>
                    <option value="pending">Pending</option>
                </select>
            </div>
        </div>

        {/* User Table */}
        <div className="rounded-xl border border-border overflow-visible bg-white">
            <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-border">
                    <tr>
                        <th className="px-6 py-4 font-bold text-textMuted uppercase text-xs">SL</th>
                        <th className="px-6 py-4 font-bold text-textMuted uppercase text-xs">User</th>
                        <th className="px-6 py-4 font-bold text-textMuted uppercase text-xs">Role</th>
                        <th className="px-6 py-4 font-bold text-textMuted uppercase text-xs">Status</th>
                        <th className="px-6 py-4 font-bold text-textMuted uppercase text-xs">Last Active</th>
                        <th className="px-6 py-4 font-bold text-textMuted uppercase text-xs text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">
                    {paginatedMembers.map((member, idx) => (
                        <tr key={member.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-6 py-4 text-textSecondary font-mono">
                                #{(currentPage - 1) * itemsPerPage + idx + 1}
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-200 border border-border shrink-0">
                                        <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-textPrimary">{member.name}</p>
                                        <p className="text-xs text-textMuted flex items-center gap-1">
                                            {member.email}
                                        </p>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase border ${getRoleBadgeColor(member.role)}`}>
                                    <Shield size={10} /> {member.role}
                                </span>
                                {member.jobTitle && <p className="text-xs text-textSecondary mt-1">{member.jobTitle}</p>}
                            </td>
                            <td className="px-6 py-4">
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase ${getStatusBadge(member.status)}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${member.status === 'active' ? 'bg-green-600' : member.status === 'pending' ? 'bg-yellow-600' : 'bg-red-600'}`}></div>
                                    {member.status}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-textSecondary text-xs">
                                {member.lastActive ? new Date(member.lastActive).toLocaleDateString() : 'Never'}
                            </td>
                            <td className="px-6 py-4 text-right relative">
                                {currentUser?.id !== member.id ? (
                                    <>
                                        <button 
                                            data-menu-trigger="team-menu"
                                            onClick={(e) => {
                                              const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                                              if (menuOpenId === member.id) {
                                                setMenuOpenId(null);
                                                setMenuPosition(null);
                                                return;
                                              }
                                              setMenuOpenId(member.id);
                                              setMenuPosition({
                                                x: Math.max(8, rect.right - 224),
                                                y: rect.bottom + 8
                                              });
                                            }}
                                            className="p-2 text-textMuted hover:text-textPrimary hover:bg-slate-100 rounded-lg transition-colors"
                                        >
                                            <MoreVertical size={16} />
                                        </button>
                                        
                                        {/* Dropdown Menu */}
                                        {menuOpenId === member.id && menuPosition && (
                                            <div
                                              ref={menuRef}
                                              className="fixed w-56 bg-white border border-border shadow-xl rounded-xl z-[999] overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right text-left"
                                              style={{ left: menuPosition.x, top: menuPosition.y }}
                                            >
                                              <button onClick={() => handleEdit(member)} className="w-full px-4 py-2.5 text-sm text-textSecondary hover:bg-slate-50 flex items-center gap-2">
                                                  <Edit2 size={14} /> Edit Details
                                              </button>
                                              {member.status === 'pending' && (
                                                <button onClick={() => handleApprove(member)} className="w-full px-4 py-2.5 text-sm text-green-700 hover:bg-green-50 flex items-center gap-2">
                                                    <CheckCircle2 size={14} /> Approve Client
                                                </button>
                                              )}
                                              <button onClick={() => handleResetPassword(member.email, member.name)} className="w-full px-4 py-2.5 text-sm text-textSecondary hover:bg-slate-50 flex items-center gap-2">
                                                  <KeyRound size={14} /> Send Password Reset
                                              </button>
                                              {member.status !== 'pending' && (
                                              <button 
                                                  onClick={() => handleToggleBlock(member.id, member.status)} 
                                                  className={`w-full px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-slate-50 ${member.status === 'active' ? 'text-orange-600' : 'text-green-600'}`}
                                              >
                                                  {member.status === 'active' ? <Lock size={14} /> : <Unlock size={14} />} 
                                                  {member.status === 'active' ? 'Block User' : 'Unblock User'}
                                              </button>
                                              )}
                                              <div className="h-px bg-border my-1"></div>
                                              <button onClick={() => handleDelete(member.id)} className="w-full px-4 py-2.5 text-sm text-danger hover:bg-red-50 flex items-center gap-2">
                                                  <Trash2 size={14} /> Delete User
                                              </button>
                                            </div>
                                        )}
                                        
                                        {/* Click outside listener could be added here for perfection, 
                                            but simple toggle works for this scope */}
                                    </>
                                ) : (
                                    <span className="text-xs text-textMuted italic pr-2">You</span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            </div>
            
            {filteredMembers.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-textMuted text-sm">No users found matching your filters.</p>
                </div>
            )}
        </div>

        {filteredMembers.length > 0 && (
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-border">
            <span className="text-sm text-textSecondary">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredMembers.length)} of {filteredMembers.length}
            </span>
            <div className="flex items-center gap-3">
              <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="p-2 bg-white border border-border rounded-lg disabled:opacity-50 hover:bg-slate-100 transition-colors">
                <ChevronLeft size={16} />
              </button>
              
              <form onSubmit={handlePageInputSubmit} className="flex items-center gap-2">
                 <span className="text-sm font-medium text-textSecondary">Page</span>
                 <input 
                    type="text" 
                    value={pageInput}
                    onChange={(e) => setPageInput(e.target.value)}
                    className="w-12 px-2 py-1 text-center bg-white text-black border border-border rounded-lg text-sm font-bold focus:ring-2 focus:ring-primary outline-none"
                 />
                 <span className="text-sm font-medium text-textSecondary">of {totalPages}</span>
              </form>

              <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="p-2 bg-white border border-border rounded-lg disabled:opacity-50 hover:bg-slate-100 transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      {isFormModalOpen && (
        <UserFormModal 
          initialData={editingUser}
          onClose={() => setIsFormModalOpen(false)}
          onSave={handleSaveUser}
        />
      )}
    </div>
  );
};

export default TeamTab;
