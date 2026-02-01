
import React, { useState } from 'react';
import { X, User, Mail, Shield, CheckCircle2 } from 'lucide-react';
import { Role } from '../../types';

interface AddMemberModalProps {
  onClose: () => void;
  onSave: (data: { name: string; email: string; role: Role }) => void;
}

const AddMemberModal: React.FC<AddMemberModalProps> = ({ onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'agent' as Role
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-lg text-textPrimary">Invite Team Member</h3>
          <button onClick={onClose} className="text-textMuted hover:text-danger"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
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
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-textSecondary mb-2">Assign Role</label>
            <div className="grid grid-cols-3 gap-2">
              {(['agent', 'manager', 'admin'] as Role[]).map(role => (
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
            <p className="text-[10px] text-textMuted mt-2 text-center">
              {formData.role === 'admin' && 'Full access to all settings, users, and financial data.'}
              {formData.role === 'manager' && 'Can manage leads, campaigns, and view analytics.'}
              {formData.role === 'agent' && 'Limited to assigned leads and basic task management.'}
            </p>
          </div>

          <div className="pt-4 border-t border-border flex justify-end gap-3">
             <button type="button" onClick={onClose} className="px-4 py-2 text-textSecondary hover:bg-slate-100 rounded-lg font-bold text-sm">Cancel</button>
             <button 
                type="submit" 
                className="px-6 py-2 bg-darkGreen text-white font-bold rounded-lg hover:bg-opacity-90 flex items-center gap-2 text-sm"
             >
                <CheckCircle2 size={16} /> Send Invite
             </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default AddMemberModal;
