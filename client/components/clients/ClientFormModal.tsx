
import React, { useState, useEffect } from 'react';
import { X, User, Mail, Phone, MapPin, CheckCircle2, Briefcase, ShoppingBag } from 'lucide-react';
import { Client } from '../../types';

interface ClientFormModalProps {
  initialData?: Client;
  agents: { id: string; name: string }[];
  onClose: () => void;
  onSave: (data: any) => void;
}

const ClientFormModal: React.FC<ClientFormModalProps> = ({ initialData, agents, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    country: '',
    accountManagerId: '',
    accountManagerName: ''
  });

  useEffect(() => {
    if (initialData) {
        setFormData({
            companyName: initialData.companyName,
            contactName: initialData.contactName,
            email: initialData.email,
            phone: initialData.phone,
            country: initialData.country,
            accountManagerId: initialData.accountManagerId,
            accountManagerName: initialData.accountManagerName
        });
    }
  }, [initialData]);

  const handleAgentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const agentId = e.target.value;
      const agent = agents.find(a => a.id === agentId);
      setFormData(prev => ({
          ...prev,
          accountManagerId: agentId,
          accountManagerName: agent ? agent.name : ''
      }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName && !formData.contactName && !formData.email) {
        alert("Please provide at least a Company/Shop Name, Contact Name, or Email.");
        return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-lg text-textPrimary">{initialData ? 'Edit Client' : 'Add New Client'}</h3>
          <button onClick={onClose} className="text-textMuted hover:text-danger"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          <div>
            <label className="block text-xs font-bold text-textSecondary mb-1">Shop / Company Name</label>
            <div className="relative">
              <ShoppingBag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
              <input 
                type="text" 
                value={formData.companyName}
                onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                placeholder="Acme Corp"
                className="w-full pl-9 pr-3 py-2 bg-white text-textPrimary border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-textSecondary mb-1">Contact Person</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
              <input 
                type="text" 
                value={formData.contactName}
                onChange={(e) => setFormData({...formData, contactName: e.target.value})}
                placeholder="Jane Doe"
                className="w-full pl-9 pr-3 py-2 bg-white text-textPrimary border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-xs font-bold text-textSecondary mb-1">Email</label>
                <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
                <input 
                    type="email" 
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="jane@example.com"
                    className="w-full pl-9 pr-3 py-2 bg-white text-textPrimary border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                />
                </div>
            </div>
            <div>
                <label className="block text-xs font-bold text-textSecondary mb-1">Phone</label>
                <div className="relative">
                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
                <input 
                    type="text" 
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="+1 555 000 0000"
                    className="w-full pl-9 pr-3 py-2 bg-white text-textPrimary border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                />
                </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-xs font-bold text-textSecondary mb-1">Country</label>
                <div className="relative">
                <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
                <input 
                    type="text" 
                    value={formData.country}
                    onChange={(e) => setFormData({...formData, country: e.target.value})}
                    placeholder="USA"
                    className="w-full pl-9 pr-3 py-2 bg-white text-textPrimary border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                />
                </div>
            </div>
            <div>
                <label className="block text-xs font-bold text-textSecondary mb-1">Account Manager</label>
                <div className="relative">
                    <Briefcase size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
                    <select 
                        value={formData.accountManagerId}
                        onChange={handleAgentChange}
                        className="w-full pl-9 pr-3 py-2 bg-white text-textPrimary border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                    >
                        <option value="">Unassigned</option>
                        {agents.map(agent => (
                            <option key={agent.id} value={agent.id}>{agent.name}</option>
                        ))}
                    </select>
                </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border flex justify-end gap-3">
             <button type="button" onClick={onClose} className="px-4 py-2 text-textSecondary hover:bg-slate-100 rounded-lg font-bold text-sm">Cancel</button>
             <button 
                type="submit" 
                className="px-6 py-2 bg-darkGreen text-white font-bold rounded-lg hover:bg-opacity-90 flex items-center gap-2 text-sm"
             >
                <CheckCircle2 size={16} /> {initialData ? 'Save Changes' : 'Create Client'}
             </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default ClientFormModal;
