import React, { useEffect, useMemo, useState } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import { useTeamStore } from '../../stores/teamStore';
import { PermissionResource } from '../../types';
import { Shield, Lock, Eye, Edit3, Download, UserCog, RotateCcw } from 'lucide-react';

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
  { id: 'settings', label: 'Settings' }
];

const AccessControlTab: React.FC = () => {
  const { permissions, updatePermission } = useSettingsStore();
  const { members, fetchMembers, updateMember } = useTeamStore();
  const [selectedUserId, setSelectedUserId] = useState('');

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const teamMembers = useMemo(
    () => members.filter((m) => m.role === 'manager' || m.role === 'agent'),
    [members]
  );

  useEffect(() => {
    if (!teamMembers.length) {
      setSelectedUserId('');
      return;
    }
    if (!selectedUserId || !teamMembers.find((m) => m.id === selectedUserId)) {
      setSelectedUserId(teamMembers[0].id);
    }
  }, [teamMembers, selectedUserId]);

  const selectedMember = useMemo(
    () => teamMembers.find((m) => m.id === selectedUserId) || null,
    [teamMembers, selectedUserId]
  );

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) => (
    <div
      onClick={() => onChange(!checked)}
      className={`w-10 h-5 rounded-full flex items-center p-1 cursor-pointer transition-colors duration-300 ${checked ? 'bg-primary' : 'bg-slate-300'}`}
    >
      <div className={`bg-white w-3.5 h-3.5 rounded-full shadow-md transform transition-transform duration-300 ${checked ? 'translate-x-5' : ''}`} />
    </div>
  );

  const updateIndividualPermission = async (
    resource: PermissionResource,
    action: 'view' | 'manage' | 'export',
    nextValue: boolean
  ) => {
    if (!selectedMember) return;
    const current = selectedMember.permissionOverrides || {};
    await updateMember(selectedMember.id, {
      permissionOverrides: {
        ...current,
        [resource]: {
          ...(current[resource] || {}),
          [action]: nextValue
        }
      }
    });
  };

  const clearIndividualOverrides = async () => {
    if (!selectedMember) return;
    await updateMember(selectedMember.id, { permissionOverrides: {} });
  };

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
                  <div className="flex items-center justify-center gap-2 pb-2 text-blue-700 font-bold">Manager</div>
                  <div className="grid grid-cols-3 gap-2 px-2 pb-2 text-[10px] text-textMuted">
                    <span className="flex flex-col items-center gap-1"><Eye size={12} /> View</span>
                    <span className="flex flex-col items-center gap-1"><Edit3 size={12} /> Manage</span>
                    <span className="flex flex-col items-center gap-1"><Download size={12} /> Export</span>
                  </div>
                </th>

                <th className="px-2 text-center" colSpan={3}>
                  <div className="flex items-center justify-center gap-2 pb-2 text-green-700 font-bold">Agent</div>
                  <div className="grid grid-cols-3 gap-2 px-2 pb-2 text-[10px] text-textMuted">
                    <span className="flex flex-col items-center gap-1"><Eye size={12} /> View</span>
                    <span className="flex flex-col items-center gap-1"><Edit3 size={12} /> Manage</span>
                    <span className="flex flex-col items-center gap-1"><Download size={12} /> Export</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-white">
              {RESOURCES.map((resource) => (
                <tr key={resource.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-textPrimary border-r border-border">{resource.label}</td>

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

      <div className="bg-white p-6 rounded-2xl border border-border">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-bold text-textPrimary flex items-center gap-2">
              <UserCog size={20} className="text-primary" /> Individual Team Member Overrides
            </h3>
            <p className="text-sm text-textSecondary">
              Override role defaults for one Manager/Agent without changing everyone else in that role.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg bg-white text-sm min-w-[260px]"
            >
              {!teamMembers.length && <option value="">No manager/agent found</option>}
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.role})
                </option>
              ))}
            </select>
            <button
              onClick={clearIndividualOverrides}
              disabled={!selectedMember}
              className="px-3 py-2 text-sm border border-border rounded-lg hover:bg-slate-50 disabled:opacity-50 flex items-center gap-2"
            >
              <RotateCcw size={14} /> Reset User
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-100 text-textSecondary text-xs uppercase tracking-wider border-b border-border">
                <th className="px-6 py-4 font-bold border-r border-border">Feature / Page</th>
                <th className="px-2 text-center" colSpan={3}>
                  <div className="flex items-center justify-center gap-2 pb-2 text-emerald-700 font-bold">Selected User</div>
                  <div className="grid grid-cols-3 gap-2 px-2 pb-2 text-[10px] text-textMuted">
                    <span className="flex flex-col items-center gap-1"><Eye size={12} /> View</span>
                    <span className="flex flex-col items-center gap-1"><Edit3 size={12} /> Manage</span>
                    <span className="flex flex-col items-center gap-1"><Download size={12} /> Export</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-white">
              {RESOURCES.map((resource) => {
                const role = selectedMember?.role === 'manager' ? 'manager' : 'agent';
                const defaults = permissions[role][resource.id];
                const overrides = selectedMember?.permissionOverrides?.[resource.id] || {};
                return (
                  <tr key={resource.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-textPrimary border-r border-border">{resource.label}</td>
                    {(['view', 'manage', 'export'] as const).map((action) => {
                      const effective = typeof overrides[action] === 'boolean' ? Boolean(overrides[action]) : defaults[action];
                      return (
                        <td key={action} className="px-2 py-4 text-center w-16">
                          <div className="flex justify-center">
                            <Toggle
                              checked={effective}
                              onChange={(val) => updateIndividualPermission(resource.id, action, val)}
                            />
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AccessControlTab;
