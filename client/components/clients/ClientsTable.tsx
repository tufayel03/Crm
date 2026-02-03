
import React from 'react';
import { Client } from '../../types';
import { CheckSquare, Square, Globe, ChevronRight, Mail, Hash, Edit2 } from 'lucide-react';
import { useNotificationStore } from '../../stores/notificationStore';

interface ClientsTableProps {
  clients: Client[];
  pageStartIndex: number;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onSelectPage: () => void;
  isPageSelected: boolean;
  onNavigate: (path: string) => void;
  onEdit: (client: Client) => void; // New prop
}

const ClientsTable: React.FC<ClientsTableProps> = ({ 
  clients,
  pageStartIndex,
  selectedIds, 
  onToggleSelect, 
  onSelectPage, 
  isPageSelected, 
  onNavigate,
  onEdit
}) => {
  const { addNotification } = useNotificationStore();
  
  const handleCopy = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    if (text) {
        navigator.clipboard.writeText(text);
        addNotification('success', 'Copied to clipboard.');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-border">
              <th className="px-4 py-4 w-10">
                <button onClick={onSelectPage} className="text-textMuted hover:text-primary transition-colors">
                  {isPageSelected ? <CheckSquare size={18} className="text-primary" /> : <Square size={18} />}
                </button>
              </th>
              <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider">SL</th>
              <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider">Unique ID</th>
              <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider">Shop Name</th>
              <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider">Contact Person</th>
              <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider">Active Services</th>
              <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider">Account Manager</th>
              <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider">Onboarded</th>
              <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {clients.length === 0 ? (
               <tr>
              <td colSpan={9} className="px-6 py-12 text-center text-textMuted">
                   No clients found matching your filters.
                 </td>
               </tr>
            ) : (
              clients.map((client, idx) => (
                <tr 
                  key={client.id} 
                  className={`hover:bg-slate-50 transition-colors group ${selectedIds.includes(client.id) ? 'bg-softMint/20' : ''}`}
                >
                  <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => onToggleSelect(client.id)} className="text-textMuted hover:text-primary transition-colors">
                      {selectedIds.includes(client.id) ? <CheckSquare size={18} className="text-primary" /> : <Square size={18} />}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-textSecondary">
                    #{pageStartIndex + idx + 1}
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-textPrimary font-bold flex items-center gap-1 cursor-copy select-none" onDoubleClick={(e) => handleCopy(e, client.uniqueId || '')} title="Double click to copy Unique ID">
                    <Hash size={12} className="text-textMuted"/> {client.uniqueId || '---'}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      type="button"
                      onClick={() => onNavigate(`/clients/${client.id}`)}
                      className="flex items-center gap-3 text-left"
                      title="Open client"
                    >
                      <div className="w-10 h-10 rounded-xl bg-darkGreen flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0">
                        {(client.companyName || client.contactName).charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-textPrimary">{client.companyName || 'N/A'}</p>
                        <p className="text-xs text-textSecondary flex items-center gap-1">
                          <Globe size={10} /> {client.country}
                        </p>
                      </div>
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="space-y-0.5">
                        <p className="text-sm font-semibold text-textPrimary">{client.contactName}</p>
                        <p 
                            className="text-xs text-textMuted flex items-center gap-1 hover:text-primary transition-colors cursor-copy select-none"
                            onDoubleClick={(e) => handleCopy(e, client.email)}
                            title="Double click to copy email"
                        >
                          <Mail size={10} /> {client.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {client.services.map(s => (
                        <span key={s.id} className={`px-2 py-0.5 rounded text-[10px] font-bold border ${s.status === 'Active' ? 'bg-softMint text-darkGreen border-primary/20' : 'bg-slate-100 text-textMuted border-border'}`}>
                          {s.type}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-textSecondary px-2 py-1 bg-slate-100 rounded-lg">
                      {client.accountManagerName}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-textSecondary">
                    {new Date(client.onboardedAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                        <button 
                            onClick={(e) => { e.stopPropagation(); onEdit(client); }}
                            className="p-1.5 text-textMuted hover:text-darkGreen" title="Edit"
                        >
                            <Edit2 size={16} />
                        </button>
                        <button className="p-1.5 text-textMuted hover:text-darkGreen transition-colors">
                            <ChevronRight size={18} />
                        </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ClientsTable;
