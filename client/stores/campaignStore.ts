import { create } from 'zustand';
import { EmailTemplate, Campaign, EmailQueueItem } from '../types';
import { useLeadsStore } from './leadsStore';
import { useClientsStore } from './clientsStore';
import { useSettingsStore } from './settingsStore';
import { apiRequest } from '../utils/api';
import { applyTemplateTokens, buildCompanyTokens } from '../utils/templateTokens';

interface CreateCampaignDTO {
  name: string;
  templateId: string;
  templateName: string;
  targetStatus: string;
  targetAgentId: string;
  targetOutcome: string;
  targetServiceStatus: 'All' | 'Active' | 'Expired';
  targetServicePlan: string;
  previewText?: string;
  scheduledAt?: string;
}

interface CampaignState {
  templates: EmailTemplate[];
  campaigns: Campaign[];

  fetchTemplates: () => Promise<void>;
  fetchCampaigns: () => Promise<void>;

  addTemplate: (template: EmailTemplate) => Promise<EmailTemplate>;
  updateTemplate: (id: string, updates: Partial<EmailTemplate>) => Promise<void>;
  removeTemplate: (id: string) => Promise<void>;
  duplicateTemplate: (id: string) => Promise<void>;

  createCampaign: (data: CreateCampaignDTO) => Promise<void>;
  cloneCampaign: (id: string) => Promise<void>;
  toggleCampaignStatus: (id: string, action: 'resume' | 'pause') => Promise<void>;
  startCampaignNow: (id: string) => Promise<void>;
  deleteCampaign: (id: string) => Promise<void>;

  sendTestEmail: (templateId: string, email: string) => Promise<boolean>;
  sendSingleEmail: (to: string, subject: string, content: string, attachments?: File[], accountId?: string) => Promise<boolean>;

  purgeAllCampaigns: () => Promise<void>;
  purgeAllTemplates: () => Promise<void>;
}

const isSubscriptionExpired = (startDate: string, duration: number) => {
  const start = new Date(startDate);
  const end = new Date(start);
  end.setDate(start.getDate() + duration);
  return end < new Date();
};

const DEFAULT_STYLE = {
  backgroundColor: '#F1F5F9',
  contentWidth: 600,
  contentBackgroundColor: '#FFFFFF',
  fontFamily: 'Arial, Helvetica, sans-serif'
};

const DEFAULT_TEMPLATES: EmailTemplate[] = [
  {
    id: 'temp-meet-sched',
    name: 'Meeting Scheduled',
    subject: 'Meeting Scheduled: {{meeting_title}}',
    htmlContent: '',
    designJson: JSON.stringify({
      globalStyle: DEFAULT_STYLE,
      blocks: []
    }),
    createdBy: 'System'
  },
  {
    id: 'temp-meet-update',
    name: 'Meeting Updated',
    subject: 'Updated: {{meeting_title}}',
    htmlContent: '',
    designJson: JSON.stringify({
      globalStyle: DEFAULT_STYLE,
      blocks: []
    }),
    createdBy: 'System'
  },
  {
    id: 'temp-meet-cancel',
    name: 'Meeting Cancelled',
    subject: 'Cancelled: {{meeting_title}}',
    htmlContent: '',
    designJson: JSON.stringify({
      globalStyle: DEFAULT_STYLE,
      blocks: []
    }),
    createdBy: 'System'
  },
  {
    id: 'temp-invoice',
    name: 'Invoice Alert',
    subject: 'Invoice {{invoice_id}} from {{company_name}}',
    htmlContent: '',
    designJson: JSON.stringify({
      globalStyle: DEFAULT_STYLE,
      blocks: []
    }),
    createdBy: 'System'
  },
  {
    id: 'temp-invoice-reminder',
    name: 'Invoice Reminder',
    subject: 'Reminder: Invoice {{invoice_id}} is due',
    htmlContent: '',
    designJson: JSON.stringify({
      globalStyle: DEFAULT_STYLE,
      blocks: []
    }),
    createdBy: 'System'
  }
];

const createTrackingId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export const useCampaignStore = create<CampaignState>((set, get) => ({
  templates: DEFAULT_TEMPLATES,
  campaigns: [],

  fetchTemplates: async () => {
    try {
      const data = await apiRequest<EmailTemplate[]>('/api/v1/templates');
      set({ templates: data });
    } catch {
      set({ templates: DEFAULT_TEMPLATES });
    }
  },

  fetchCampaigns: async () => {
    const data = await apiRequest<Campaign[]>('/api/v1/campaigns');
    set({ campaigns: data });
  },

  addTemplate: async (t) => {
    const created = await apiRequest<EmailTemplate>('/api/v1/templates', {
      method: 'POST',
      body: JSON.stringify(t)
    });
    set(s => ({ templates: [created, ...s.templates] }));
    return created;
  },

  updateTemplate: async (id, updates) => {
    const updated = await apiRequest<EmailTemplate>(`/api/v1/templates/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
    set(s => ({ templates: s.templates.map(t => t.id === id ? updated : t) }));
  },

  removeTemplate: async (id) => {
    await apiRequest(`/api/v1/templates/${id}`, { method: 'DELETE' });
    set(s => ({ templates: s.templates.filter(t => t.id !== id) }));
  },

  duplicateTemplate: async (id) => {
    const original = get().templates.find(t => t.id === id);
    if (!original) return;

    const copy: EmailTemplate = {
      ...original,
      id: 'temp-' + Math.random().toString(36).substr(2, 9),
      name: `${original.name} (Copy)`,
      createdBy: 'System'
    };
    await get().addTemplate(copy);
  },

  createCampaign: async (data) => {
    const leads = useLeadsStore.getState().leads;
    const clients = useClientsStore.getState().clients;

    const recipients = leads.filter(l => {
      if (!l.email || !l.email.includes('@')) return false;
      if (data.targetStatus !== 'All' && l.status !== data.targetStatus) return false;
      if (data.targetAgentId !== 'All' && l.assignedAgentId !== data.targetAgentId) return false;

      if (data.targetOutcome !== 'All') {
        const callNotes = l.notes
          .filter(n => n.content.includes('Call logged. Outcome: '))
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        if (callNotes.length === 0) return false;
        const lastOutcome = callNotes[0].content.split('Outcome: ')[1].trim();
        if (lastOutcome !== data.targetOutcome) return false;
      }

      if (data.targetServiceStatus !== 'All') {
        const clientRecord = clients.find(c => c.leadId === l.id);
        if (!clientRecord) return false;

        const services = clientRecord.services;
        if (data.targetServiceStatus === 'Active') {
          const hasActive = services.some(s => {
            const notExpired = !isSubscriptionExpired(s.startDate, s.duration);
            const isActiveStatus = s.status === 'Active';
            const matchesPlan = data.targetServicePlan === 'All' || s.type === data.targetServicePlan;
            return notExpired && isActiveStatus && matchesPlan;
          });
          if (!hasActive) return false;
        } else if (data.targetServiceStatus === 'Expired') {
          const hasExpired = services.some(s => {
            const isExpired = isSubscriptionExpired(s.startDate, s.duration);
            const matchesPlan = data.targetServicePlan === 'All' || s.type === data.targetServicePlan;
            return isExpired && matchesPlan;
          });
          if (!hasExpired) return false;
        }
      }
      return true;
    });

    // Deduplicate by email
    const uniqueRecipients = new Map();
    recipients.forEach(l => {
      if (!uniqueRecipients.has(l.email.toLowerCase())) {
        uniqueRecipients.set(l.email.toLowerCase(), l);
      }
    });

    const queue: EmailQueueItem[] = Array.from(uniqueRecipients.values()).map(l => ({
      leadId: l.id,
      leadName: l.name,
      leadEmail: l.email,
      status: 'Pending',
      trackingId: createTrackingId()
    }));

    const isScheduled = !!data.scheduledAt;

    const newCampaign: Campaign = {
      id: 'camp-' + Math.random().toString(36).substr(2, 9),
      name: data.name,
      templateId: data.templateId,
      templateName: data.templateName,
      status: isScheduled ? 'Scheduled' : 'Queued',
      targetStatus: data.targetStatus,
      targetAgentId: data.targetAgentId,
      targetOutcome: data.targetOutcome,
      targetServiceStatus: data.targetServiceStatus,
      targetServicePlan: data.targetServicePlan,
      totalRecipients: uniqueRecipients.size,
      sentCount: 0,
      failedCount: 0,
      openCount: 0,
      clickCount: 0,
      createdAt: new Date().toISOString(),
      queue: queue,
      previewText: data.previewText,
      scheduledAt: data.scheduledAt
    };

    const created = await apiRequest<Campaign>('/api/v1/campaigns', {
      method: 'POST',
      body: JSON.stringify(newCampaign)
    });

    set(state => ({ campaigns: [created, ...state.campaigns] }));
  },

  cloneCampaign: async (id) => {
    const original = get().campaigns.find(c => c.id === id);
    if (!original) return;

    const clone: Campaign = {
      ...original,
      id: 'camp-' + Math.random().toString(36).substr(2, 9),
      name: `${original.name} (Clone)`,
      status: 'Draft',
      sentCount: 0,
      failedCount: 0,
      openCount: 0,
      clickCount: 0,
      createdAt: new Date().toISOString(),
      completedAt: undefined,
      scheduledAt: undefined
    };

    const created = await apiRequest<Campaign>('/api/v1/campaigns', {
      method: 'POST',
      body: JSON.stringify(clone)
    });

    set(state => ({ campaigns: [created, ...state.campaigns] }));
  },

  toggleCampaignStatus: async (id, action) => {
    const campaign = get().campaigns.find(c => c.id === id);
    if (!campaign) return;

    let nextStatus = campaign.status;
    if (action === 'pause') nextStatus = 'Paused';
    if (action === 'resume') {
      if (campaign.scheduledAt && new Date(campaign.scheduledAt) > new Date()) {
        nextStatus = 'Scheduled';
      } else {
        nextStatus = campaign.totalRecipients === campaign.sentCount + campaign.failedCount ? 'Completed' : 'Sending';
      }
    }

    const updated = await apiRequest<Campaign>(`/api/v1/campaigns/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: nextStatus })
    });

    set(state => ({ campaigns: state.campaigns.map(c => c.id === id ? updated : c) }));
  },

  startCampaignNow: async (id) => {
    const updated = await apiRequest<Campaign>(`/api/v1/campaigns/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'Sending', scheduledAt: undefined })
    });
    await apiRequest(`/api/v1/campaigns/${id}/send`, { method: 'POST', body: JSON.stringify({ batchSize: 50 }) });
    set(state => ({ campaigns: state.campaigns.map(c => c.id === id ? updated : c) }));
  },

  deleteCampaign: async (id) => {
    await apiRequest(`/api/v1/campaigns/${id}`, { method: 'DELETE' });
    set(state => ({ campaigns: state.campaigns.filter(c => c.id !== id) }));
  },



  sendTestEmail: async (templateId, email) => {
    const template = get().templates.find(t => t.id === templateId);
    if (!template) return false;
    const baseTokens = buildCompanyTokens(useSettingsStore.getState().generalSettings);
    const tokenData = {
      ...baseTokens,
      lead_name: 'Test Lead',
      lead_first_name: 'Test',
      client_name: 'Test Client',
      service: 'Test Service',
      amount: '0',
      due_date: '',
      invoice_id: 'TEST-0001',
      meeting_title: 'Test Meeting',
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
      link: baseTokens.unsubscribe_link || '',
      host_name: 'Test Host'
    };
    const subject = applyTemplateTokens(template.subject, tokenData);
    const html = applyTemplateTokens(template.htmlContent, tokenData);
    await apiRequest('/api/v1/email/send', {
      method: 'POST',
      body: JSON.stringify({ to: email, subject, html })
    });
    return true;
  },

  sendSingleEmail: async (to, subject, content, attachments = [], accountId) => {
    const payload = {
      to,
      subject,
      html: content,
      ...(accountId ? { accountId } : {}),
      attachments: await Promise.all(attachments.map(async (file) => {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        return { filename: file.name, contentBase64: base64, contentType: file.type };
      }))
    };
    await apiRequest('/api/v1/email/send', { method: 'POST', body: JSON.stringify(payload) });
    return true;
  },

  purgeAllCampaigns: async () => {
    const ids = get().campaigns.map(c => c.id);
    for (const id of ids) {
      await get().deleteCampaign(id);
    }
  },

  purgeAllTemplates: async () => {
    const ids = get().templates.map(t => t.id);
    for (const id of ids) {
      await get().removeTemplate(id);
    }
  }
}));


