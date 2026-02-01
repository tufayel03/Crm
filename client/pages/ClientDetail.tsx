
import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useClientsStore } from '../stores/clientsStore';
import { useServicesStore } from '../stores/servicesStore';
import { useAuthStore } from '../stores/authStore';
import { useTeamStore } from '../stores/teamStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useCampaignStore } from '../stores/campaignStore';
import { ServiceSubscription, Payment } from '../types';
import FileSection from '../components/clients/FileSection';
import ServiceFormModal from '../components/clients/ServiceFormModal';
import { downloadClientExcel, downloadClientZip } from '../utils/exportHelpers';
import { generateInvoicePDF } from '../utils/pdfGenerator';
import { generateInvoiceId, getInvoiceDisplayId } from '../utils/invoiceId';
import { applyTemplateTokens, buildCompanyTokens } from '../utils/templateTokens';
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  MoreHorizontal, 
  Globe, 
  Clock, 
  DollarSign,
  FileText,
  CreditCard,
  Plus,
  X,
  Calendar,
  Send,
  CheckCircle2,
  AlertCircle,
  Download,
  FileSpreadsheet,
  Archive,
  Loader2,
  User,
  Edit2,
  Check,
  Copy,
  Trash2
} from 'lucide-react';

const ClientDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { 
    clients, payments, updateClient,
    removeClientDocument, uploadClientDocument,
    addClientService, updateSubscription, removeClientService, addClientNote, 
    addPayment, updatePaymentStatus
  } = useClientsStore();
  const { plans } = useServicesStore();
  const { members } = useTeamStore();
  const { user, role } = useAuthStore();
  const { generalSettings } = useSettingsStore();
  const { templates, sendSingleEmail } = useCampaignStore();
  
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceSubscription | undefined>(undefined);
  const [serviceToDelete, setServiceToDelete] = useState<string | null>(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  
  // Agent Editing State
  const [isEditingAgent, setIsEditingAgent] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  
  // Email Modal State
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // New Payment Form State
  const [newPayment, setNewPayment] = useState({
    amount: 0,
    serviceType: '',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  const client = clients.find(c => c.id === id);
  const isAdminOrManager = role === 'admin' || role === 'manager';

  // List of available agents/managers for assignment
  const availableAgents = useMemo(() => {
      return members.filter(m => m.role === 'agent' || m.role === 'manager');
  }, [members]);

  // Filter payments for this client
  const clientPayments = useMemo(() => {
    return payments.filter(p => p.clientId === id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [payments, id]);

  const pendingPayments = clientPayments.filter(p => p.status === 'Due' || p.status === 'Overdue');
  const paidPayments = clientPayments.filter(p => p.status === 'Paid');

  if (!client) {
    return <div className="p-8 text-center">Client not found</div>;
  }

  // Simplified calculation assuming monthly renewals for LTV estimation for now
  const lifetimeValue = client.services.reduce((acc, s) => acc + (s.price * 12), 0) + paidPayments.reduce((acc, p) => acc + p.amount, 0); 

  const getRemainingDays = (startDate: string, duration: number) => {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + duration);
    const now = new Date();
    // Normalize to start of day for accurate day diff
    now.setHours(0,0,0,0);
    end.setHours(0,0,0,0);
    
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    return diffDays;
  };

  // --- Handlers ---

  const handleCopyInfo = () => {
      const text = `${client.companyName}\nContact: ${client.contactName}\nEmail: ${client.email}\nPhone: ${client.phone}`;
      navigator.clipboard.writeText(text);
      alert("Client info copied to clipboard!");
  };

  const handleSaveAgent = () => {
      const agent = availableAgents.find(a => a.id === selectedAgentId);
      if (agent) {
          updateClient(client.id, {
              accountManagerId: agent.id,
              accountManagerName: agent.name
          });
          setIsEditingAgent(false);
      }
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    addClientNote(client.id, newNote, user?.name || 'Unknown');
    setNewNote('');
  };

  const handleSaveService = (serviceData: any) => {
      if (editingService) {
          updateSubscription(client.id, editingService.id, {
              type: serviceData.customName,
              price: serviceData.price,
              duration: serviceData.duration,
              billingCycle: serviceData.billingCycle,
              startDate: new Date(serviceData.startDate).toISOString(),
              status: serviceData.status
          });
      } else {
          const service: ServiceSubscription = {
              id: 'sub-' + Math.random().toString(36).substr(2, 9),
              type: serviceData.customName,
              price: serviceData.price,
              duration: serviceData.duration,
              billingCycle: serviceData.billingCycle,
              status: 'Active',
              startDate: new Date(serviceData.startDate).toISOString()
          };
          addClientService(client.id, service);
      }
      setIsServiceModalOpen(false);
      setEditingService(undefined);
  };

  const confirmDeleteService = () => {
      if (serviceToDelete) {
          removeClientService(client.id, serviceToDelete);
          setServiceToDelete(null);
      }
  };

  const handleCreatePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPayment.amount <= 0 || !newPayment.serviceType) return;

    const payment: Payment = {
        id: `temp-${Math.random().toString(36).slice(2, 10)}`,
        invoiceId: generateInvoiceId(payments.map(item => item.invoiceId || item.id)),
        clientId: client.id,
        clientName: client.companyName,
        amount: newPayment.amount,
        serviceType: newPayment.serviceType,
        status: 'Due',
        date: new Date().toISOString(),
        dueDate: new Date(newPayment.dueDate).toISOString()
    };

    addPayment(payment);
    setIsPaymentModalOpen(false);
    setNewPayment({
        amount: 0,
        serviceType: '',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });
  };

  const handleDownloadInvoice = (payment: Payment) => {
      generateInvoicePDF(payment, client, generalSettings);
  };

  const handleSendReminder = async (payment: Payment) => {
      if (!client.email) {
          alert("Client has no email address.");
          return;
      }
      if (!window.confirm("Send payment reminder email?")) return;

      const subject = `Payment Reminder: Invoice ${getInvoiceDisplayId(payment.invoiceId, payment.id)}`;
      const body = `Dear ${client.contactName},<br/><br/>This is a reminder that payment of $${payment.amount} for ${payment.serviceType} is due.<br/><br/>Regards,<br/>${generalSettings.companyName}`;
      
      await sendSingleEmail(client.email, subject, body);
      alert("Reminder sent!");
  };

  const handleUpload = async (file: File, category: 'invoice' | 'contract') => {
      try {
          await uploadClientDocument(client.id, file, category);
      } catch (e: any) {
          alert(e.message || 'Upload failed');
      }
  };

  const handleDelete = async (docId: string, category: 'invoice' | 'contract') => {
      if (window.confirm('Are you sure you want to delete this file?')) {
          await removeClientDocument(client.id, docId, category);
      }
  };

  const handleExportZip = async () => {
    setIsExporting(true);
    await new Promise(resolve => setTimeout(resolve, 100)); // UI update
    await downloadClientZip(client);
    setIsExporting(false);
  };

  // --- Email Logic ---
  const handleTemplateSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tId = e.target.value;
    if (!tId) return;
    const t = templates.find(temp => temp.id === tId);
    if (t) {
        const baseTokens = buildCompanyTokens(generalSettings);
        const tokenData = {
          ...baseTokens,
          client_name: client.contactName,
          lead_name: client.contactName,
          lead_first_name: client.contactName.split(' ')[0],
          lead_email: client.email || ''
        };
        setEmailSubject(applyTemplateTokens(t.subject, tokenData));
        setEmailBody(t.htmlContent);
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailSubject || !emailBody) return;
    
    setIsSendingEmail(true);
    // Simple replacement for variables
    const baseTokens = buildCompanyTokens(generalSettings);
    const primaryService = client.services?.[0]?.type || '';
    const tokenData = {
      ...baseTokens,
      client_name: client.contactName,
      lead_name: client.contactName,
      lead_first_name: client.contactName.split(' ')[0],
      lead_email: client.email || '',
      agent_name: user?.name || 'Agent',
      service: primaryService
    };
    let finalBody = applyTemplateTokens(emailBody, tokenData);
    const finalSubject = applyTemplateTokens(emailSubject, tokenData);

    const success = await sendSingleEmail(client.email, finalSubject, finalBody);
    setIsSendingEmail(false);
    
    if (success) {
        addClientNote(client.id, `Email Sent: ${emailSubject}`, user?.name || 'System');
        alert('Email sent successfully!');
        setIsEmailModalOpen(false);
        setEmailSubject('');
        setEmailBody('');
    } else {
        alert('Failed to send email. Check your email settings.');
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <button 
            onClick={() => navigate('/clients')}
            className="flex items-center gap-2 text-textSecondary hover:text-darkGreen font-medium transition-colors"
        >
            <ArrowLeft size={18} /> Back to Clients
        </button>

        <div className="flex gap-2">
            <button 
               onClick={handleCopyInfo}
               className="flex items-center gap-2 px-3 py-2 bg-white border border-border rounded-lg text-sm font-bold text-textSecondary hover:bg-slate-50 transition-colors"
               title="Copy Name, Email, Phone"
            >
               <Copy size={16} /> Copy Info
            </button>
            <button 
               onClick={() => downloadClientExcel(client)}
               className="flex items-center gap-2 px-3 py-2 bg-white border border-border rounded-lg text-sm font-bold text-textSecondary hover:bg-slate-50 transition-colors"
            >
               <FileSpreadsheet size={16} className="text-green-600" /> Export Excel
            </button>
            <button 
               onClick={handleExportZip}
               disabled={isExporting}
               className="flex items-center gap-2 px-3 py-2 bg-white border border-border rounded-lg text-sm font-bold text-textSecondary hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
               {isExporting ? <Loader2 size={16} className="animate-spin text-primary"/> : <Archive size={16} className="text-orange-500" />} 
               Export Full Package (ZIP)
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN - Main Info & Services */}
        <div className="lg:col-span-2 space-y-6">
            {/* Main Client Card */}
            <div className="bg-white rounded-3xl border border-border overflow-hidden shadow-sm">
                {/* Header Section */}
                <div className="p-6 border-b border-border flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white">
                <div className="flex gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-darkGreen flex items-center justify-center text-white font-bold text-3xl shadow-lg shadow-darkGreen/20">
                    {client.companyName.charAt(0)}
                    </div>
                    <div>
                    <h2 className="text-2xl font-bold text-textPrimary">{client.companyName}</h2>
                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 mt-2">
                        <span className="text-sm text-textSecondary flex items-center gap-1">
                        <Globe size={16} className="text-textMuted" /> {client.country}
                        </span>
                        <span className="text-sm text-textSecondary flex items-center gap-1">
                        <Clock size={16} className="text-textMuted" /> Onboarded {new Date(client.onboardedAt).toLocaleDateString()}
                        </span>
                        
                        {/* Account Manager Section with Edit Capability */}
                        {isEditingAgent && isAdminOrManager ? (
                            <div className="flex items-center gap-1">
                                <select 
                                    className="text-xs border border-border rounded p-1 max-w-[150px] bg-white"
                                    value={selectedAgentId}
                                    onChange={(e) => setSelectedAgentId(e.target.value)}
                                >
                                    <option value="">Select Agent...</option>
                                    {availableAgents.map(agent => (
                                        <option key={agent.id} value={agent.id}>{agent.name}</option>
                                    ))}
                                </select>
                                <button onClick={handleSaveAgent} disabled={!selectedAgentId} className="p-1 text-success hover:bg-green-50 rounded"><Check size={14}/></button>
                                <button onClick={() => setIsEditingAgent(false)} className="p-1 text-danger hover:bg-red-50 rounded"><X size={14}/></button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-darkGreen font-bold px-3 py-1 bg-softMint rounded-full flex items-center gap-1">
                                    <User size={12} /> AM: {client.accountManagerName}
                                </span>
                                {isAdminOrManager && (
                                    <button 
                                        onClick={() => { setSelectedAgentId(client.accountManagerId); setIsEditingAgent(true); }}
                                        className="text-textMuted hover:text-primary transition-colors p-1 rounded hover:bg-slate-100"
                                        title="Change Account Manager"
                                    >
                                        <Edit2 size={12} />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                    <p className="text-xs text-textMuted font-bold uppercase tracking-widest">Contact</p>
                    <p className="text-lg font-semibold text-textPrimary">{client.contactName}</p>
                    </div>
                    <div className="flex gap-2">
                    <button 
                        onClick={() => setIsEmailModalOpen(true)}
                        className="p-3 bg-white border border-border rounded-xl text-textSecondary hover:text-primary transition-colors" 
                        title="Send Email"
                    >
                        <Mail size={20} />
                    </button>
                    <button className="p-3 bg-white border border-border rounded-xl text-textSecondary hover:text-primary transition-colors" title="Call">
                        <Phone size={20} />
                    </button>
                    <button className="p-3 bg-white border border-border rounded-xl text-textSecondary hover:text-danger transition-colors">
                        <MoreHorizontal size={20} />
                    </button>
                    </div>
                </div>
                </div>

                {/* Services Section */}
                <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                    <h4 className="text-lg font-bold text-textPrimary flex items-center gap-2">
                    <DollarSign size={20} className="text-primary" /> Active Service Subscriptions
                    </h4>
                    <button 
                        onClick={() => { setEditingService(undefined); setIsServiceModalOpen(true); }}
                        className="flex items-center gap-2 text-sm font-bold text-darkGreen hover:bg-softMint px-3 py-2 rounded-lg transition-colors"
                    >
                        <Plus size={16} /> Add Service
                    </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {client.services.map(sub => {
                    const remainingDays = getRemainingDays(sub.startDate, sub.duration);
                    const isExpired = remainingDays < 0;
                    
                    return (
                        <div key={sub.id} className={`group p-6 bg-appBg rounded-2xl border ${isExpired ? 'border-danger/30 bg-red-50/50' : 'border-border'} hover:border-primary/40 hover:bg-white transition-all shadow-sm hover:shadow-md relative`}>
                            <div className="flex justify-between items-start mb-6">
                                <div className="px-3 py-1 bg-white rounded-lg shadow-sm border border-border">
                                    <span className="text-sm font-bold text-darkGreen">{sub.type}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${isExpired ? 'bg-danger/10 text-danger' : (sub.status === 'Active' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger')}`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${isExpired ? 'bg-danger' : (sub.status === 'Active' ? 'bg-success' : 'bg-danger')}`} />
                                        {isExpired ? 'Expired' : sub.status}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-end justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs text-textMuted font-bold uppercase tracking-widest">{sub.duration} Day Plan</span>
                                </div>
                                <p className="text-2xl font-bold text-textPrimary">${sub.price.toLocaleString()} <span className="text-xs font-normal text-textSecondary">{sub.billingCycle === 'one-time' ? '/ one-time' : '/ month'}</span></p>
                            </div>
                            <div className="text-right">
                                <p className={`text-xs font-bold mb-1 ${isExpired ? 'text-danger' : 'text-primary'}`}>
                                    {isExpired ? `${Math.abs(remainingDays)} days ago` : `${remainingDays} days left`}
                                </p>
                                <p className="text-xs text-textMuted">Started {new Date(sub.startDate).toLocaleDateString()}</p>
                            </div>
                            </div>
                            {/* Progress Bar for time remaining */}
                            {!isExpired && (
                                <div className="mt-4 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-primary" 
                                        style={{ width: `${Math.max(0, Math.min(100, (remainingDays / sub.duration) * 100))}%` }}
                                    ></div>
                                </div>
                            )}
                            
                            {/* Actions Overlay */}
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setEditingService(sub); setIsServiceModalOpen(true); }}
                                    className="p-1.5 bg-white text-textMuted hover:text-primary hover:bg-slate-50 rounded shadow-sm border border-border"
                                    title="Edit Service"
                                >
                                    <Edit2 size={14} />
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setServiceToDelete(sub.id); }}
                                    className="p-1.5 bg-white text-textMuted hover:text-danger hover:bg-red-50 rounded shadow-sm border border-border"
                                    title="Remove Service"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    );
                    })}
                </div>
                </div>
                
                {/* Footer Metrics */}
                <div className="px-8 py-6 bg-slate-50 border-t border-border flex justify-between items-center">
                <div className="flex items-center gap-8">
                    <div>
                    <span className="text-sm text-textMuted block">Total LTV</span>
                    <span className="text-xl font-bold text-textPrimary">
                        ${lifetimeValue.toLocaleString()}
                    </span>
                    </div>
                    <div className="h-8 w-px bg-border"></div>
                    <div>
                    <span className="text-sm text-textMuted block">Pending Payments</span>
                    <span className={`text-xl font-bold ${pendingPayments.length > 0 ? 'text-danger' : 'text-success'}`}>
                        {pendingPayments.length}
                    </span>
                    </div>
                </div>
                </div>
            </div>

            {/* Financials Section */}
            <div className="bg-white rounded-3xl border border-border p-8">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-lg text-textPrimary flex items-center gap-2">
                        <CreditCard size={20} className="text-primary" /> Financials & Payments
                    </h3>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setIsPaymentModalOpen(true)}
                            className="flex items-center gap-2 text-sm font-bold text-darkGreen hover:bg-softMint px-3 py-2 rounded-lg transition-colors"
                        >
                            <Plus size={16} /> Create Invoice
                        </button>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Pending Payments */}
                    <div>
                        <h4 className="text-xs font-bold text-textMuted uppercase mb-3 flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-warning"></div> Pending / Due
                        </h4>
                        {pendingPayments.length === 0 ? (
                            <p className="text-sm text-textSecondary italic py-2">No pending payments.</p>
                        ) : (
                            <div className="space-y-3">
                                {pendingPayments.map(p => (
                                    <div key={p.id} className="flex justify-between items-center p-4 bg-orange-50/50 border border-orange-100 rounded-xl">
                                        <div>
                                            <p className="font-bold text-textPrimary">{p.serviceType}</p>
                                            <p className="text-xs text-textSecondary">Due: {new Date(p.dueDate || p.date).toLocaleDateString()}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-lg mr-2">${p.amount.toLocaleString()}</span>
                                            <button 
                                                onClick={() => handleDownloadInvoice(p)}
                                                className="p-1.5 bg-white border border-border text-textSecondary hover:text-primary rounded-lg transition-colors"
                                                title="Download PDF"
                                            >
                                                <Download size={14} />
                                            </button>
                                            <button 
                                                onClick={() => handleSendReminder(p)}
                                                className="p-1.5 bg-white border border-border text-textSecondary hover:text-primary rounded-lg transition-colors"
                                                title="Send Reminder"
                                            >
                                                <Mail size={14} />
                                            </button>
                                            <button 
                                                onClick={() => updatePaymentStatus(p.id, 'Paid')}
                                                className="px-3 py-1.5 bg-success text-white text-xs font-bold rounded-lg hover:bg-success/90 transition-colors ml-1"
                                            >
                                                Mark Paid
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Paid History */}
                    <div className="pt-6 border-t border-border">
                        <h4 className="text-xs font-bold text-textMuted uppercase mb-3 flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-success"></div> Payment History
                        </h4>
                        {paidPayments.length === 0 ? (
                            <p className="text-sm text-textSecondary italic py-2">No payment history yet.</p>
                        ) : (
                            <div className="space-y-2">
                                {paidPayments.map(p => (
                                    <div key={p.id} className="flex justify-between items-center p-3 bg-slate-50 border border-border rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className="p-1.5 bg-white rounded-full border border-border text-success"><CheckCircle2 size={14} /></div>
                                            <div>
                                                <p className="font-medium text-sm text-textPrimary">{p.serviceType}</p>
                                                <p className="text-[10px] text-textMuted">{new Date(p.date).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-textSecondary">${p.amount.toLocaleString()}</span>
                                            <button 
                                                onClick={() => handleDownloadInvoice(p)}
                                                className="p-1 text-textMuted hover:text-primary transition-colors"
                                                title="Download PDF"
                                            >
                                                <Download size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Documents Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FileSection 
                title="Invoices" 
                icon={<FileText size={20} className="text-textMuted" />} 
                files={client.invoices || []}
                category="invoice"
                onUpload={handleUpload}
                onDelete={handleDelete}
                />

                <FileSection 
                title="Contracts" 
                icon={<FileText size={20} className="text-textMuted" />} 
                files={client.documents || []}
                category="contract"
                onUpload={handleUpload}
                onDelete={handleDelete}
                />
            </div>
        </div>

        {/* RIGHT COLUMN - Notes & Activity */}
        <div className="space-y-6">
             <div className="bg-white p-6 rounded-2xl border border-border h-full flex flex-col">
                <h3 className="font-bold text-textPrimary mb-6 flex items-center gap-2">
                    <FileText size={20} className="text-primary" /> Notes & Activity
                </h3>
                
                <form onSubmit={handleAddNote} className="mb-8">
                <div className="relative">
                    <textarea 
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Log a call, meeting note, or update..."
                    className="w-full p-4 bg-appBg border border-border rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all min-h-[120px] text-sm"
                    ></textarea>
                    <button 
                    type="submit"
                    className="absolute bottom-4 right-4 p-2 bg-darkGreen text-white rounded-lg hover:bg-opacity-90 transition-all"
                    >
                    <Send size={16} />
                    </button>
                </div>
                </form>

                <div className="space-y-6 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-[1px] before:bg-border flex-1 overflow-y-auto max-h-[600px] pr-2">
                {(!client.notes || client.notes.length === 0) ? (
                    <div className="pl-10 text-textMuted italic py-4 text-sm">No notes added yet.</div>
                ) : (
                    [...client.notes].reverse().map((note) => (
                    <div key={note.id} className="relative pl-10">
                        <div className="absolute left-0 top-1 w-8 h-8 bg-white border border-border rounded-full flex items-center justify-center">
                        <Clock size={14} className="text-textMuted" />
                        </div>
                        <div className="bg-appBg p-4 rounded-xl border border-border/50">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-sm font-bold text-textPrimary">{note.author}</span>
                            <span className="text-[10px] font-medium text-textMuted uppercase">{new Date(note.timestamp).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm text-textSecondary whitespace-pre-line leading-relaxed">
                            {note.content}
                        </p>
                        </div>
                    </div>
                    ))
                )}
                </div>
            </div>
        </div>
      </div>

      {/* MODALS */}

      {/* Service Delete Confirmation */}
      {serviceToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="flex items-center gap-3 mb-4 text-danger">
                    <div className="p-2 bg-red-100 rounded-full">
                        <Trash2 size={24} />
                    </div>
                    <h3 className="font-bold text-lg text-textPrimary">Delete Service?</h3>
                </div>
                <p className="text-sm text-textSecondary mb-6 leading-relaxed">
                    Are you sure you want to remove this active subscription? This cannot be undone.
                </p>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setServiceToDelete(null)} 
                        className="flex-1 py-2 border border-border rounded-xl font-bold text-textSecondary hover:bg-slate-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={confirmDeleteService} 
                        className="flex-1 py-2 bg-danger text-white rounded-xl font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-100"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Service Modal (Add/Edit) */}
      {isServiceModalOpen && (
        <ServiceFormModal 
            initialData={editingService}
            plans={plans}
            onClose={() => { setIsServiceModalOpen(false); setEditingService(undefined); }}
            onSave={handleSaveService}
        />
      )}

      {/* Add Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-textPrimary">Create Invoice / Payment Request</h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-textMuted hover:text-danger">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreatePayment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-textSecondary uppercase mb-1">Description / Service</label>
                <input 
                  type="text" 
                  value={newPayment.serviceType}
                  onChange={(e) => setNewPayment({...newPayment, serviceType: e.target.value})}
                  className="w-full px-3 py-2 bg-appBg border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                  placeholder="e.g. Monthly SEO Retainer - Oct"
                  required 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-textSecondary uppercase mb-1">Amount ($)</label>
                  <input 
                    type="number" 
                    value={newPayment.amount}
                    onChange={(e) => setNewPayment({...newPayment, amount: parseFloat(e.target.value)})}
                    className="w-full px-3 py-2 bg-appBg border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                    required 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-textSecondary uppercase mb-1">Due Date</label>
                  <input 
                    type="date" 
                    value={newPayment.dueDate}
                    onChange={(e) => setNewPayment({...newPayment, dueDate: e.target.value})}
                    className="w-full px-3 py-2 bg-appBg border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                    required 
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full py-3 mt-4 bg-darkGreen text-white font-bold rounded-xl hover:bg-opacity-90 transition-all"
              >
                Create Payment Request
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SEND EMAIL MODAL */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            {/* ... (Existing Email Modal Content) ... */}
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-textPrimary flex items-center gap-2">
                <Mail size={20} className="text-darkGreen" /> Send Email to {client.contactName}
              </h3>
              <button onClick={() => setIsEmailModalOpen(false)} className="text-textMuted hover:text-danger">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSendEmail} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-textSecondary uppercase mb-1">Load Template (Optional)</label>
                <select 
                    onChange={handleTemplateSelect}
                    className="w-full px-3 py-2 bg-appBg border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                >
                    <option value="">-- Choose Template --</option>
                    {templates.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-textSecondary uppercase mb-1">Subject</label>
                <input 
                  type="text" 
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-appBg border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                  placeholder="Subject line..."
                  required 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-textSecondary uppercase mb-1">Message Body</label>
                <textarea 
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="w-full px-3 py-2 bg-appBg border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none min-h-[200px] font-mono text-sm"
                  placeholder="Write your message here... (HTML supported)"
                  required
                />
                <p className="text-[10px] text-textMuted mt-1">Variables like {'{{lead_name}}'} will be replaced automatically.</p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => setIsEmailModalOpen(false)}
                    className="px-4 py-2 text-textSecondary font-bold hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSendingEmail}
                    className="px-6 py-2 bg-darkGreen text-white font-bold rounded-lg hover:bg-opacity-90 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSendingEmail ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    {isSendingEmail ? 'Sending...' : 'Send Email'}
                  </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientDetail;
