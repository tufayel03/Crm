
import React, { useMemo, useState, useEffect } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { useAuthStore } from '../stores/authStore';
import {
  Settings as SettingsIcon, Mail, Shield,
  Users, Globe, Plus, Server, Key, Lock
} from 'lucide-react';

// Components
import SmtpModal from '../components/settings/SmtpModal';
import EmailAccountCard from '../components/settings/EmailAccountCard';
import TeamTab from '../components/settings/TeamTab';
import GeneralTab from '../components/settings/GeneralTab';
import SecurityTab from '../components/settings/SecurityTab';
import AuthenticationTab from '../components/settings/AuthenticationTab';
import AccessControlTab from '../components/settings/AccessControlTab'; // New

const Settings: React.FC = () => {
  const { emailAccounts, addEmailAccount, removeEmailAccount, updateRouting, verifyAccount } = useSettingsStore();
  const { role } = useAuthStore();
  const [activeTab, setActiveTab] = useState('general');
  const [isSmtpModalOpen, setIsSmtpModalOpen] = useState(false);

  const tabs = [
    { id: 'general', label: 'General', icon: SettingsIcon, allowed: ['admin', 'manager', 'agent'] },
    { id: 'auth', label: 'Authentication', icon: Key, allowed: ['admin', 'manager', 'agent', 'client'] },
    { id: 'email', label: 'Email Integrations', icon: Mail, allowed: ['admin', 'manager'] },
    { id: 'access', label: 'Control Panel', icon: Lock, allowed: ['admin'] }, // New Access Control
    { id: 'team', label: 'Team Members', icon: Users, allowed: ['admin', 'manager'] },
    { id: 'security', label: 'Security Logs', icon: Shield, allowed: ['admin', 'manager', 'agent'] },
  ];

  const visibleTabs = useMemo(() => tabs.filter(t => role && t.allowed.includes(role)), [tabs, role]);

  useEffect(() => {
    if (!visibleTabs.length) return;
    if (!visibleTabs.find(t => t.id === activeTab)) {
      setActiveTab(visibleTabs[0].id);
    }
  }, [visibleTabs, activeTab]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-textPrimary">Settings</h2>
          <p className="text-textSecondary">Manage your workspace configuration and integrations.</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Top Tabs */}
        {visibleTabs.length > 1 && (
          <div className="bg-white rounded-2xl border border-border p-2">
            <div className="flex flex-wrap gap-2">
              {visibleTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-xl transition-all ${activeTab === tab.id
                    ? 'bg-softMint text-darkGreen border border-primary/30'
                    : 'text-textSecondary hover:bg-slate-50 border border-transparent'
                    }`}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Content Area */}
        <div>
          {/* GENERAL SETTINGS TAB */}
          {activeTab === 'general' && (
            <GeneralTab />
          )}

          {/* ACCESS CONTROL TAB (New) */}
          {activeTab === 'access' && (
            <AccessControlTab />
          )}

          {/* AUTHENTICATION TAB */}
          {activeTab === 'auth' && (
            <AuthenticationTab />
          )}

          {/* EMAIL INTEGRATIONS TAB */}
          {activeTab === 'email' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-border">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-textPrimary flex items-center gap-2">
                      <Server size={20} className="text-primary" /> Connected Email Accounts
                    </h3>
                         <p className="text-sm text-textSecondary mt-1">
                            Connect Namecheap or other business emails. Define which accounts handle campaigns, leads, and client communication.
                         </p>
                  </div>
                  <button
                    onClick={() => setIsSmtpModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-darkGreen text-white font-bold rounded-xl hover:bg-opacity-90 shadow-lg shadow-darkGreen/10 transition-all text-sm"
                  >
                    <Plus size={16} /> Add Account
                  </button>
                </div>

                {emailAccounts.length === 0 ? (
                  <div className="p-12 bg-slate-50 border-2 border-dashed border-border rounded-xl text-center">
                    <Mail size={40} className="mx-auto mb-3 text-textMuted" />
                    <p className="font-bold text-textPrimary">No email accounts connected.</p>
                    <p className="text-sm text-textSecondary mb-4">Connect your Namecheap business email to start sending.</p>
                    <button
                      onClick={() => setIsSmtpModalOpen(true)}
                      className="text-primary font-bold hover:underline"
                    >
                      Connect Namecheap Email
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {emailAccounts.map(acc => (
                      <EmailAccountCard
                        key={acc.id}
                        account={acc}
                        onVerify={verifyAccount}
                        onDelete={removeEmailAccount}
                        onUpdate={updateRouting}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3">
                <Globe size={24} className="text-blue-600 shrink-0" />
                <div>
                  <h4 className="font-bold text-blue-800 text-sm">Routing Logic</h4>
                        <p className="text-xs text-blue-600 mt-1">
                            If multiple accounts are selected for <b>Campaigns</b>, the system will distribute the load to optimize delivery rates. 
                            For <b>Lead</b> and <b>Client</b> emails, the system defaults to the first matching verified account unless a specific sender account is chosen.
                        </p>
                </div>
              </div>
            </div>
          )}

          {/* TEAM MEMBERS TAB */}
          {activeTab === 'team' && (
            <TeamTab />
          )}

          {/* SECURITY TAB */}
          {activeTab === 'security' && (
            <SecurityTab />
          )}

          {/* OTHER TABS (Placeholders) */}
          {activeTab !== 'email' && activeTab !== 'team' && activeTab !== 'general' && activeTab !== 'security' && activeTab !== 'auth' && activeTab !== 'access' && (
            <div className="bg-white p-12 rounded-2xl border border-border text-center">
              <SettingsIcon size={48} className="mx-auto mb-4 text-border" />
              <h3 className="text-xl font-bold text-textPrimary">Coming Soon</h3>
              <p className="text-textSecondary">The {tabs.find(t => t.id === activeTab)?.label} settings module is currently under development.</p>
            </div>
          )}
        </div>
      </div>

      {isSmtpModalOpen && (
        <SmtpModal
          onClose={() => setIsSmtpModalOpen(false)}
          onSave={addEmailAccount}
        />
      )}
    </div>
  );
};

export default Settings;
