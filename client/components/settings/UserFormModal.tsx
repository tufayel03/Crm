
import React, { useState, useEffect } from 'react';
import { X, User, Mail, Shield, CheckCircle2, Phone, Briefcase } from 'lucide-react';
import { Role, User as UserType } from '../../types';

interface UserFormModalProps {
  initialData?: UserType;
  onClose: () => void;
  onSave: (data: any) => void;
}

const UserFormModal: React.FC<UserFormModalProps> = ({ initialData, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'agent' as Role,
    phone: '',
    jobTitle: ''
  });

  useEffect(() => {
    if (initialData) {
        setFormData({
            name: initialData.name,
            email: initialData.email,
            role: initialData.role,
            phone: initialData.phone || '',
            jobTitle: initialData.jobTitle || ''
        });
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-lg text-textPrimary">{initialData ? 'Edit User' : 'Create New User'}</h3>
          <button onClick={onClose} className="text-textMuted hover:text-danger"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-xs font-bold text-textSecondary mb-1">Full Name</label>
                <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
                <input 
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="John Doe"
                    className="w-full pl-9 pr-3 py-2 bg-white text-textPrimary border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                    required
                />
                </div>
            </div>
            <div>
                <label className="block text-xs font-bold text-textSecondary mb-1">Job Title</label>
                <div className="relative">
                <Briefcase size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
                <input 
                    type="text" 
                    value={formData.jobTitle}
                    onChange={(e) => setFormData({...formData, jobTitle: e.target.value})}
                    placeholder="e.g. Sales Lead"
                    className="w-full pl-9 pr-3 py-2 bg-white text-textPrimary border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                />
                </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-textSecondary mb-1">Email Address</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
              <input 
                type="email" 
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="john@company.com"
                className="w-full pl-9 pr-3 py-2 bg-white text-textPrimary border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                required
                disabled={!!initialData} // Email is immutable for ID purposes usually
              />
            </div>
            {initialData && <p className="text-[10px] text-textMuted mt-1">Email cannot be changed.</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-textSecondary mb-1">Phone Number (Optional)</label>
            <div className="relative">
              <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
              <input 
                type="text" 
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="+1 (555) 000-0000"
                className="w-full pl-9 pr-3 py-2 bg-white text-textPrimary border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-textSecondary mb-2">Assign System Role</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['client', 'agent', 'manager', 'admin'] as Role[]).map(role => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setFormData({...formData, role})}
                  className={`flex flex-col items-center justify-center p-3 border rounded-xl transition-all ${
                    formData.role === role 
                      ? 'bg-softMint border-primary text-darkGreen' 
                      : 'bg-white border-border text-textSecondary hover:bg-slate-50'
                  }`}
                >
                  <Shield size={20} className={`mb-1 ${formData.role === role ? 'text-primary' : 'text-textMuted'}`} />
                  <span className="text-xs font-bold capitalize">{role}</span>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-textMuted mt-2 text-center min-h-[1.5em]">
              {formData.role === 'admin' && 'Full access to settings, billing, users, and all data.'}
              {formData.role === 'manager' && 'Can manage leads, campaigns, agents, and view reports.'}
              {formData.role === 'agent' && 'Limited to assigned leads, tasks, and basic CRM features.'}
              {formData.role === 'client' && 'Restricted access to Client Portal (Invoices, Projects, Support).'}
            </p>
          </div>

          <div className="pt-4 border-t border-border flex justify-end gap-3">
             <button type="button" onClick={onClose} className="px-4 py-2 text-textSecondary hover:bg-slate-100 rounded-lg font-bold text-sm">Cancel</button>
             <button 
                type="submit" 
                className="px-6 py-2 bg-darkGreen text-white font-bold rounded-lg hover:bg-opacity-90 flex items-center gap-2 text-sm"
             >
                <CheckCircle2 size={16} /> {initialData ? 'Save Changes' : 'Create User'}
             </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default UserFormModal;
