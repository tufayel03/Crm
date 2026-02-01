import { create } from 'zustand';
import { EmailAccount, GeneralSettings, SystemTemplates, AccessControlConfig, PermissionResource, RolePermissions } from '../types';
import { apiRequest } from '../utils/api';

interface IPRules {
  mode: 'none' | 'whitelist' | 'blacklist';
  whitelist: string[];
  blacklist: string[];
}

interface CampaignLimits {
  hourly: number;
  daily: number;
}

const DEFAULT_PERMISSIONS: AccessControlConfig = {
  manager: {
    dashboard: { view: true, manage: true, export: true },
    leads: { view: true, manage: true, export: true },
    clients: { view: true, manage: true, export: true },
    tasks: { view: true, manage: true, export: true },
    meetings: { view: true, manage: true, export: true },
    mailbox: { view: true, manage: true, export: false },
    campaigns: { view: true, manage: true, export: true },
    payments: { view: true, manage: true, export: true },
    team: { view: true, manage: true, export: false },
    settings: { view: true, manage: true, export: false },
  },
  agent: {
    dashboard: { view: true, manage: false, export: false },
    leads: { view: true, manage: true, export: false },
    clients: { view: true, manage: false, export: false },
    tasks: { view: true, manage: true, export: false },
    meetings: { view: true, manage: true, export: false },
    mailbox: { view: true, manage: true, export: false },
    campaigns: { view: false, manage: false, export: false },
    payments: { view: false, manage: false, export: false },
    team: { view: false, manage: false, export: false },
    settings: { view: false, manage: false, export: false },
  }
};

interface SettingsState {
  emailAccounts: EmailAccount[];
  generalSettings: GeneralSettings;
  systemTemplates: SystemTemplates;
  ipRules: IPRules;
  campaignLimits: CampaignLimits;
  permissions: AccessControlConfig;

  fetchSettings: () => Promise<void>;
  addEmailAccount: (account: Omit<EmailAccount, 'id' | 'sentCount'> & { isVerified?: boolean }) => Promise<void>;
  removeEmailAccount: (id: string) => Promise<void>;
  updateRouting: (id: string, updates: Partial<Pick<EmailAccount, 'useForCampaigns' | 'useForClients'>>) => Promise<void>;
  verifyAccount: (id: string) => Promise<boolean>;
  updateGeneralSettings: (settings: Partial<GeneralSettings>) => Promise<void>;
  updateSystemTemplate: (key: keyof SystemTemplates, template: { subject: string; body: string }) => Promise<void>;
  updateIpRuleMode: (mode: 'none' | 'whitelist' | 'blacklist') => Promise<void>;
  addIpToRule: (list: 'whitelist' | 'blacklist', ip: string) => Promise<void>;
  removeIpFromRule: (list: 'whitelist' | 'blacklist', ip: string) => Promise<void>;
  resetIpRules: () => Promise<void>;
  requestIpResetLink: (email: string) => Promise<void>;
  updateCampaignLimits: (limits: CampaignLimits) => Promise<void>;
  updatePermission: (role: 'manager' | 'agent', resource: PermissionResource, updates: Partial<RolePermissions>) => Promise<void>;
}

const DEFAULT_STATE = {
  emailAccounts: [],
  permissions: DEFAULT_PERMISSIONS,
  generalSettings: {
    companyName: 'Matlance',
    workspaceSlug: 'matlance-hq',
    supportEmail: 'support@matlance.com',
    companyAddress: '',
    companyPhone: '',
    companyWebsite: '',
    publicTrackingUrl: '',
    timezone: 'UTC',
    currency: 'USD',
    dateFormat: 'MM/DD/YYYY',
    logoUrl: '',
    systemWalletBalance: 0,
    invoiceUseLogo: true,
    invoiceFooterText: ''
  },
  systemTemplates: {
    invoice: { subject: 'Invoice {{invoice_id}}', body: 'Please find attached invoice...' },
    meetingSchedule: { subject: 'Meeting Scheduled', body: 'A meeting has been scheduled...' },
    meetingUpdate: { subject: 'Meeting Updated', body: 'Meeting details changed...' },
    meetingCancel: { subject: 'Meeting Cancelled', body: 'Meeting cancelled...' },
    passwordReset: { subject: 'Reset Password', body: 'Reset your password here...' }
  },
  ipRules: { mode: 'none', whitelist: [], blacklist: [] },
  campaignLimits: { hourly: 50, daily: 500 }
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...DEFAULT_STATE,

  fetchSettings: async () => {
    const data = await apiRequest<any>('/api/v1/settings');
    const mergedPermissions: AccessControlConfig = {
      manager: { ...DEFAULT_PERMISSIONS.manager, ...(data.permissions?.manager || {}) },
      agent: { ...DEFAULT_PERMISSIONS.agent, ...(data.permissions?.agent || {}) }
    };
    set({
      emailAccounts: data.emailAccounts || [],
      generalSettings: data.generalSettings || DEFAULT_STATE.generalSettings,
      systemTemplates: data.systemTemplates || DEFAULT_STATE.systemTemplates,
      ipRules: data.ipRules || DEFAULT_STATE.ipRules,
      campaignLimits: data.campaignLimits || DEFAULT_STATE.campaignLimits,
      permissions: mergedPermissions
    });
  },

  addEmailAccount: async (accountData) => {
    const newAccount: EmailAccount = {
      ...accountData,
      id: 'email-' + Math.random().toString(36).substr(2, 9),
      isVerified: accountData.isVerified || false,
      sentCount: 0
    };
    const updated = {
      emailAccounts: [...get().emailAccounts, newAccount]
    };
    await apiRequest('/api/v1/settings', { method: 'PATCH', body: JSON.stringify(updated) });
    set(state => ({ emailAccounts: [...state.emailAccounts, newAccount] }));
  },

  removeEmailAccount: async (id) => {
    const emailAccounts = get().emailAccounts.filter(acc => acc.id !== id);
    await apiRequest('/api/v1/settings', { method: 'PATCH', body: JSON.stringify({ emailAccounts }) });
    set({ emailAccounts });
  },

  updateRouting: async (id, updates) => {
    const emailAccounts = get().emailAccounts.map(acc => acc.id === id ? { ...acc, ...updates } : acc);
    await apiRequest('/api/v1/settings', { method: 'PATCH', body: JSON.stringify({ emailAccounts }) });
    set({ emailAccounts });
  },

  verifyAccount: async (id) => {
    const emailAccounts = get().emailAccounts.map(acc => acc.id === id ? { ...acc, isVerified: true } : acc);
    await apiRequest('/api/v1/settings', { method: 'PATCH', body: JSON.stringify({ emailAccounts }) });
    set({ emailAccounts });
    return true;
  },

  updateGeneralSettings: async (updates) => {
    const generalSettings = { ...get().generalSettings, ...updates };
    await apiRequest('/api/v1/settings', { method: 'PATCH', body: JSON.stringify({ generalSettings }) });
    set({ generalSettings });
  },

  updateSystemTemplate: async (key, template) => {
    const systemTemplates = { ...get().systemTemplates, [key]: template };
    await apiRequest('/api/v1/settings', { method: 'PATCH', body: JSON.stringify({ systemTemplates }) });
    set({ systemTemplates });
  },

  updateIpRuleMode: async (mode) => {
    const ipRules = { ...get().ipRules, mode };
    await apiRequest('/api/v1/settings', { method: 'PATCH', body: JSON.stringify({ ipRules }) });
    set({ ipRules });
  },

  addIpToRule: async (list, ip) => {
    const ipRules = { ...get().ipRules, [list]: [...get().ipRules[list], ip] };
    await apiRequest('/api/v1/settings', { method: 'PATCH', body: JSON.stringify({ ipRules }) });
    set({ ipRules });
  },

  removeIpFromRule: async (list, ip) => {
    const ipRules = { ...get().ipRules, [list]: get().ipRules[list].filter(item => item !== ip) };
    await apiRequest('/api/v1/settings', { method: 'PATCH', body: JSON.stringify({ ipRules }) });
    set({ ipRules });
  },

  resetIpRules: async () => {
    const ipRules = { mode: 'none', whitelist: [], blacklist: [] };
    await apiRequest('/api/v1/settings', { method: 'PATCH', body: JSON.stringify({ ipRules }) });
    set({ ipRules });
  },

  requestIpResetLink: async (email) => {
    await apiRequest('/api/v1/settings/ip-reset/request', { method: 'POST', body: JSON.stringify({ email }) });
  },

  updateCampaignLimits: async (limits) => {
    await apiRequest('/api/v1/settings', { method: 'PATCH', body: JSON.stringify({ campaignLimits: limits }) });
    set({ campaignLimits: limits });
  },

  updatePermission: async (role, resource, updates) => {
    const permissions = {
      ...get().permissions,
      [role]: {
        ...get().permissions[role],
        [resource]: { ...get().permissions[role][resource], ...updates }
      }
    };
    await apiRequest('/api/v1/settings', { method: 'PATCH', body: JSON.stringify({ permissions }) });
    set({ permissions });
  }
}));

