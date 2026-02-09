
export type Role = 'admin' | 'manager' | 'agent' | 'client';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  status: 'active' | 'blocked' | 'pending';
  phone?: string;
  jobTitle?: string;
  lastActive?: string;
}

export type LeadStatus = string;
export type ServiceType = 'SEO' | 'PPC' | 'Full Management' | 'Brand Protection' | string;
export type SubscriptionStatus = 'Active' | 'Paused' | 'Cancelled';

export interface Note {
  id: string;
  content: string;
  author: string;
  timestamp: string;
}

export interface Lead {
  id: string;
  readableId: number;
  shortId: string;
  name: string;
  profession?: string;
  status: LeadStatus;
  email: string;
  phone: string;
  country: string;
  assignedAgentId: string;
  assignedAgentName: string;
  createdAt: string;
  isRevealed: boolean;
  notes: Note[];
  source?: string;
}

export interface ClientDocument {
  id: string;
  name: string;
  type: string;
  url: string;
  size: number;
  uploadDate: string;
  category: 'invoice' | 'contract';
  key?: string;
}

export interface Client {
  id: string;
  readableId: number;
  uniqueId: string;
  leadId: string;
  companyName: string;
  contactName: string;
  profession?: string;
  email: string;
  phone: string;
  country: string;
  accountManagerId: string;
  accountManagerName: string;
  services: ServiceSubscription[];
  onboardedAt: string;
  walletBalance: number;
  invoices: ClientDocument[];
  documents: ClientDocument[];
  notes: Note[];
}

export interface ServiceSubscription {
  id: string;
  type: ServiceType;
  price: number;
  duration: number;
  billingCycle?: 'monthly' | 'one-time';
  status: SubscriptionStatus;
  startDate: string;
}

export interface ServicePlan {
  id: string;
  name: string;
  price: number;
  duration: number;
  billingCycle: 'monthly' | 'one-time';
  description: string;
  features: string[];
}

export interface InvoiceItem {
  description: string;
  quantity: number; // New
  unitPrice: number; // New
  amount: number;
}

export interface Payment {
  id: string;
  invoiceId?: string;
  clientId: string;
  clientName: string;
  amount: number;
  serviceType: ServiceType;
  status: 'Paid' | 'Due' | 'Overdue';
  date: string;
  dueDate?: string;
  items?: InvoiceItem[];
}

export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'completed';
  leadId?: string;
  createdBy: string;
  createdByName: string;
  assignedTo: string;
  assignedToName: string;
}

export interface Meeting {
  id: string;
  title: string;
  agenda: string;
  date: string;
  time: string;
  duration: number;
  leadId?: string;
  leadName: string;
  type: 'Discovery' | 'Demo' | 'Negotiation' | 'Check-in';
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  platform: 'Google Meet' | 'Zoom' | 'Phone';
  link?: string;
  reminderSent?: boolean;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  designJson?: string;
  createdBy: string;
}

export interface EmailQueueItem {
  leadId: string;
  leadName: string;
  leadEmail: string;
  status: 'Pending' | 'Sent' | 'Failed';
  sentAt?: string;
  sentMessageId?: string;
  sentBy?: string;
  error?: string;
  trackingId?: string;
  openedAt?: string;
  clickedAt?: string;
  repliedAt?: string;
  repliedMessageId?: string;
  replyFrom?: string;
  replySubject?: string;
}

export interface Campaign {
  id: string;
  name: string;
  templateId: string;
  templateName: string;
  status: 'Draft' | 'Queued' | 'Scheduled' | 'Sending' | 'Paused' | 'Completed';
  targetStatus: LeadStatus | 'All';
  targetStatuses?: LeadStatus[];
  targetAgentId: string | 'All';
  targetAgentIds?: string[];
  targetOutcome?: string | 'All';
  targetOutcomes?: string[];
  targetServiceStatus?: 'All' | 'Active' | 'Expired';
  targetServicePlan?: string | 'All';

  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  openCount: number;
  clickCount: number;
  replyCount?: number;
  createdAt: string;
  completedAt?: string;
  queue: EmailQueueItem[];
  previewText?: string;
  scheduledAt?: string;
}

export type EmailProvider = 'Namecheap' | 'Gmail' | 'Outlook' | 'Custom';

export interface EmailAccount {
  id: string;
  email: string;
  label: string;
  provider: EmailProvider;
  smtpHost: string;
  smtpPort: number;
  username: string;
  password?: string;
  imapHost?: string;
  imapPort?: number;
  imapSecure?: boolean;
  imapStartTLS?: boolean;
  isVerified: boolean;
  useForCampaigns: boolean;
  useForClients: boolean;
  sentCount: number;
}

// --- PERMISSIONS TYPES ---
export type PermissionResource =
  | 'dashboard'
  | 'leads'
  | 'clients'
  | 'tasks'
  | 'meetings'
  | 'mailbox'
  | 'campaigns'
  | 'payments'
  | 'team'
  | 'settings';

export interface RolePermissions {
  view: boolean;   // Can see the page
  manage: boolean; // Can create, edit, delete
  export: boolean; // Can download/export data
}

export interface AccessControlConfig {
  manager: Record<PermissionResource, RolePermissions>;
  agent: Record<PermissionResource, RolePermissions>;
}

export interface GeneralSettings {
  companyName: string;
  workspaceSlug: string;
  supportEmail: string;
  companyAddress?: string;
  companyPhone?: string;
  companyWebsite?: string;
  publicTrackingUrl?: string;
  timezone: string;
  currency: string;
  dateFormat: string;
  logoUrl?: string;
  systemWalletBalance?: number;
  invoiceUseLogo?: boolean;
  invoiceFooterText?: string;
  availableLabels?: string[];
}

export interface SystemTemplates {
  invoice: { subject: string; body: string };
  meetingSchedule: { subject: string; body: string };
  meetingUpdate: { subject: string; body: string };
  meetingCancel: { subject: string; body: string };
  passwordReset: { subject: string; body: string };
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  url: string;
  size: number;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: string;
}
