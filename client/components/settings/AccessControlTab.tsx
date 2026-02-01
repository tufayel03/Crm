
import React from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import { PermissionResource } from '../../types';
import { Shield, Lock, Eye, Edit3, Download } from 'lucide-react';

const RESOURCES: { id: PermissionResource; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'leads', label: 'Leads' },
  { id: 'clients', label: 'Clients' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'meetings', label: 'Meetings' },
  { id: 'mailbox', label: 'Mailbox' },
  { id: 'campaigns', label: 'Campaigns' },
  { id: 'payments', label: 'Payments & Revenue' },
  { id: 'team', label: 'Team Management' },
  { id: 'settings', label: 'Settings' },
];

const AccessControlTab: React.FC = () => {
  const { permissions, updatePermission } = useSettingsStore();

  const Toggle = ({ 
    checked, 
    onChange 
  }: { checked: boolean; onChange: (checked: boolean) => void }) => (
    <div 
        onClick={() => onChange(!checked)}
        className={`w-10 h-5 rounded-full flex items-center p-1 cursor-pointer transition-colors duration-300 ${checked ? 'bg-primary' : 'bg-slate-300'}`}
    >
        <div className={`bg-white w-3.5 h-3.5 rounded-full shadow-md transform transition-transform duration-300 ${checked ? 'translate-x-5' : ''}`} />
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="bg-white p-6 rounded-2xl border border-border">
            <h3 className="text-lg font-bold text-textPrimary flex items-center gap-2 mb-2">
                <Shield size={20} className="text-primary" /> Role Access Control
            </h3>
            <p className="text-sm text-textSecondary mb-6">
                Configure what Managers and Agents can see, manage, or export across the platform. 
                <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs ml-2 font-bold">Admins have full access</span>
            </p>

            <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="bg-slate-100 text-textSecondary text-xs uppercase tracking-wider border-b border-border">
                            <th className="px-6 py-4 font-bold border-r border-border">Feature / Page</th>
                            
                            <th className="px-2 text-center border-r border-border" colSpan={3}>
                                <div className="flex items-center justify-center gap-2 pb-2 text-blue-700 font-bold">
                                    Manager
                                </div>
                                <div className="grid grid-cols-3 gap-2 px-2 pb-2 text-[10px] text-textMuted">
                                    <span className="flex flex-col items-center gap-1"><Eye size={12}/> View</span>
                                    <span className="flex flex-col items-center gap-1"><Edit3 size={12}/> Manage</span>
                                    <span className="flex flex-col items-center gap-1"><Download size={12}/> Export</span>
                                </div>
                            </th>

                            <th className="px-2 text-center" colSpan={3}>
                                <div className="flex items-center justify-center gap-2 pb-2 text-green-700 font-bold">
                                    Agent
                                </div>
                                <div className="grid grid-cols-3 gap-2 px-2 pb-2 text-[10px] text-textMuted">
                                    <span className="flex flex-col items-center gap-1"><Eye size={12}/> View</span>
                                    <span className="flex flex-col items-center gap-1"><Edit3 size={12}/> Manage</span>
                                    <span className="flex flex-col items-center gap-1"><Download size={12}/> Export</span>
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-white">
                        {RESOURCES.map((resource) => (
                            <tr key={resource.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 font-bold text-textPrimary border-r border-border">
                                    {resource.label}
                                </td>

                                {/* MANAGER PERMISSIONS */}
                                <td className="px-2 py-4 text-center w-16">
                                    <div className="flex justify-center">
                                        <Toggle 
                                            checked={permissions.manager[resource.id].view}
                                            onChange={(val) => updatePermission('manager', resource.id, { view: val })}
                                        />
                                    </div>
                                </td>
                                <td className="px-2 py-4 text-center w-16">
                                    <div className="flex justify-center">
                                        <Toggle 
                                            checked={permissions.manager[resource.id].manage}
                                            onChange={(val) => updatePermission('manager', resource.id, { manage: val })}
                                        />
                                    </div>
                                </td>
                                <td className="px-2 py-4 text-center border-r border-border w-16">
                                    <div className="flex justify-center">
                                        <Toggle 
                                            checked={permissions.manager[resource.id].export}
                                            onChange={(val) => updatePermission('manager', resource.id, { export: val })}
                                        />
                                    </div>
                                </td>

                                {/* AGENT PERMISSIONS */}
                                <td className="px-2 py-4 text-center w-16">
                                    <div className="flex justify-center">
                                        <Toggle 
                                            checked={permissions.agent[resource.id].view}
                                            onChange={(val) => updatePermission('agent', resource.id, { view: val })}
                                        />
                                    </div>
                                </td>
                                <td className="px-2 py-4 text-center w-16">
                                    <div className="flex justify-center">
                                        <Toggle 
                                            checked={permissions.agent[resource.id].manage}
                                            onChange={(val) => updatePermission('agent', resource.id, { manage: val })}
                                        />
                                    </div>
                                </td>
                                <td className="px-2 py-4 text-center w-16">
                                    <div className="flex justify-center">
                                        <Toggle 
                                            checked={permissions.agent[resource.id].export}
                                            onChange={(val) => updatePermission('agent', resource.id, { export: val })}
                                        />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl flex gap-3 text-sm text-blue-800">
                <Lock size={18} className="shrink-0 mt-0.5" />
                <p>
                    <strong>Note:</strong> "View" controls page visibility. "Manage" controls Add, Edit, Delete buttons. "Export" controls Excel/ZIP downloads. 
                    Changes apply immediately.
                </p>
            </div>
        </div>
    </div>
  );
};

export default AccessControlTab;
