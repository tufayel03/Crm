
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useClientsStore } from '../stores/clientsStore';
import { useAuthStore } from '../stores/authStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useCampaignStore } from '../stores/campaignStore';
import { useNotificationStore } from '../stores/notificationStore';
import { generateInvoicePDF, getInvoicePDFBlob } from '../utils/pdfGenerator';
import { downloadBulkInvoicesZip } from '../utils/exportHelpers';
import { compileHtml } from '../components/email-builder/compiler';
import { generateInvoiceId, getInvoiceDisplayId } from '../utils/invoiceId';
import { applyTemplateTokens, buildCompanyTokens } from '../utils/templateTokens';
import { 
  DollarSign, TrendingUp, AlertCircle, CheckCircle2, 
  Search, Filter, Plus, Download, Trash2, X, FileText, Mail,
  ChevronLeft, ChevronRight, Square, CheckSquare, Loader2
} from 'lucide-react';
import RevenueChart from '../components/payments/RevenueChart';
import ClientBulkActions from '../components/clients/ClientBulkActions'; 
import { Payment, Client, InvoiceItem } from '../types';

const Payments: React.FC = () => {
  const { payments, clients, addPayment, updatePaymentStatus, deletePayment, bulkDeletePayments, sendInvoiceEmail } = useClientsStore();
  const { generalSettings } = useSettingsStore();
  const { templates } = useCampaignStore();
  const { user } = useAuthStore();
  const { addNotification } = useNotificationStore();
  
  // Local State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Paid' | 'Due' | 'Overdue'>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Delete Confirmation State
  const [deleteConfig, setDeleteConfig] = useState<{ isOpen: boolean; type: 'single' | 'bulk'; id?: string }>({
      isOpen: false,
      type: 'single'
  });
  
  // Search Client State
  const [searchInput, setSearchInput] = useState('');
  const [suggestions, setSuggestions] = useState<Client[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Pagination & Selection State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState('1'); 
  const itemsPerPage = 20;
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState('');

  // Sending Email State
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [isBulkEmailing, setIsBulkEmailing] = useState(false);

  // Create Invoice State
  const [newInvoice, setNewInvoice] = useState<{
      clientId: string;
      items: InvoiceItem[];
      dueDate: string;
  }>({
      clientId: '',
      items: [{ description: '', quantity: 1, unitPrice: 0, amount: 0 }],
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  // Handle outside click for search dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- Statistics Calculation ---
  const stats = useMemo(() => {
      const totalRevenue = payments.filter(p => p.status === 'Paid').reduce((acc, p) => acc + p.amount, 0);
      const totalDue = payments.filter(p => p.status === 'Due').reduce((acc, p) => acc + p.amount, 0);
      const totalOverdue = payments.filter(p => p.status === 'Overdue').reduce((acc, p) => acc + p.amount, 0);
      
      const mrr = clients.reduce((acc, c) => {
          return acc + c.services
            .filter(s => s.status === 'Active')
            .reduce((sum, s) => sum + (s.price / (s.duration / 30)), 0); 
      }, 0);

      return { totalRevenue, totalDue, totalOverdue, mrr };
  }, [payments, clients]);

  // --- Filtering ---
  const filteredPayments = useMemo(() => {
      return payments.filter(p => {
          const matchesSearch = 
            p.clientName.toLowerCase().includes(search.toLowerCase()) || 
            p.serviceType.toLowerCase().includes(search.toLowerCase()) ||
            (p.invoiceId || p.id).toLowerCase().includes(search.toLowerCase());
          
          const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
          return matchesSearch && matchesStatus;
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [payments, search, statusFilter]);

  // --- Pagination Logic ---
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
  const paginatedPayments = filteredPayments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (newPage: number) => {
    const page = Math.max(1, Math.min(newPage, totalPages));
    setCurrentPage(page);
    setPageInput(page.toString());
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(pageInput);
    if (!isNaN(page)) {
      handlePageChange(page);
    } else {
      setPageInput(currentPage.toString());
    }
  };

  // --- Search Handlers ---
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    
    if (newInvoice.clientId && value !== clients.find(c => c.id === newInvoice.clientId)?.companyName) {
         setNewInvoice(prev => ({ ...prev, clientId: '' }));
    }

    if (!value.trim()) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
    }

    const term = value.toLowerCase();
    const matched = clients.filter(c => 
        (c.companyName && c.companyName.toLowerCase().includes(term)) ||
        (c.contactName && c.contactName.toLowerCase().includes(term)) ||
        (c.email && c.email.toLowerCase().includes(term)) ||
        (c.uniqueId && c.uniqueId.toLowerCase().includes(term)) ||
        (c.readableId && c.readableId.toString().includes(term))
    ).slice(0, 5);

    setSuggestions(matched);
    setShowSuggestions(true);
  };

  const handleSelectClient = (client: Client) => {
    setNewInvoice(prev => ({ ...prev, clientId: client.id }));
    setSearchInput(client.companyName || client.contactName);
    setShowSuggestions(false);
  };

  // --- Item Handlers ---
  const handleAddItem = () => {
      setNewInvoice(prev => ({ ...prev, items: [...prev.items, { description: '', quantity: 1, unitPrice: 0, amount: 0 }] }));
  };

  const handleRemoveItem = (index: number) => {
      setNewInvoice(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
      setNewInvoice(prev => {
          const newItems = [...prev.items];
          const currentItem = { ...newItems[index], [field]: value };
          
          // Recalculate amount if qty or price changes
          if (field === 'quantity' || field === 'unitPrice') {
              const qty = field === 'quantity' ? parseFloat(value) : currentItem.quantity;
              const price = field === 'unitPrice' ? parseFloat(value) : currentItem.unitPrice;
              currentItem.amount = (qty || 0) * (price || 0);
          }

          newItems[index] = currentItem;
          return { ...prev, items: newItems };
      });
  };

  const calculateTotal = () => {
      return newInvoice.items.reduce((sum, item) => sum + (item.amount || 0), 0);
  };

  // --- Selection Handlers ---
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectPage = () => {
    const pageIds = paginatedPayments.map(p => p.id);
    const allSelected = pageIds.every(id => selectedIds.includes(id));
    if (allSelected) {
        // Deselect current page
        setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
        // Select all on current page
        setSelectedIds(prev => [...new Set([...prev, ...pageIds])]);
    }
  };

  // --- Select All Filtered Logic ---
  const handleSelectAllFiltered = () => {
      const allIds = filteredPayments.map(p => p.id);
      setSelectedIds(allIds);
  };

  // Check if ALL items on the CURRENT page are selected
  const isPageSelected = useMemo(() => 
    paginatedPayments.length > 0 && paginatedPayments.every(p => selectedIds.includes(p.id)), 
  [paginatedPayments, selectedIds]);

  // Check if ALL filtered items (across all pages) are selected
  const isAllSelected = useMemo(() => {
      if (filteredPayments.length === 0) return false;
      return filteredPayments.every(p => selectedIds.includes(p.id));
  }, [filteredPayments, selectedIds]);

  // Can we expand selection? (Is there more to select than currently selected?)
  const canSelectMore = selectedIds.length < filteredPayments.length;

  // --- Bulk Actions ---
  const handleBulkDownload = async () => {
    if (selectedIds.length === 0) return;
    setIsExporting(true);
    const paymentsToExport = payments.filter(p => selectedIds.includes(p.id));
    
    try {
        await downloadBulkInvoicesZip(paymentsToExport, clients, generalSettings, (pct, status) => {
            setExportProgress(pct);
            setExportStatus(status);
        });
    } catch (e) {
        console.error(e);
        addNotification('error', "Export failed. Please try again.");
    } finally {
        setIsExporting(false);
        setExportProgress(0);
        setExportStatus('');
    }
  };

  const initiateBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setDeleteConfig({ isOpen: true, type: 'bulk' });
  };

  const initiateSingleDelete = (id: string) => {
    setDeleteConfig({ isOpen: true, type: 'single', id });
  };

  const confirmDelete = () => {
      if (deleteConfig.type === 'bulk') {
          bulkDeletePayments(selectedIds);
          setSelectedIds([]);
          addNotification('success', `Deleted ${selectedIds.length} invoices.`);
      } else if (deleteConfig.type === 'single' && deleteConfig.id) {
          deletePayment(deleteConfig.id);
          addNotification('success', 'Invoice deleted.');
      }
      setDeleteConfig({ isOpen: false, type: 'single' });
  };

  // --- Handlers ---
  const handleCreateInvoice = (e: React.FormEvent) => {
      e.preventDefault();
      const totalAmount = calculateTotal();
      
      if (!newInvoice.clientId || totalAmount <= 0) {
          addNotification('error', 'Please select a client and add at least one valid item.');
          return;
      }

      const client = clients.find(c => c.id === newInvoice.clientId);
      if (!client) return;

      // Construct summary for legacy view
      const serviceSummary = newInvoice.items.length > 1 
        ? `${newInvoice.items[0].description} + ${newInvoice.items.length - 1} more` 
        : newInvoice.items[0].description;

      const payment: Payment = {
          id: `temp-${Math.random().toString(36).slice(2, 10)}`,
          invoiceId: generateInvoiceId(payments.map(item => item.invoiceId || item.id)),
          clientId: client.id,
          clientName: client.companyName || client.contactName,
          amount: totalAmount,
          serviceType: serviceSummary,
          status: 'Due',
          date: new Date().toISOString(),
          dueDate: new Date(newInvoice.dueDate).toISOString(),
          items: newInvoice.items
      };

      addPayment(payment);
      setIsModalOpen(false);
      setNewInvoice({
          clientId: '',
          items: [{ description: '', quantity: 1, unitPrice: 0, amount: 0 }],
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
      setSearchInput('');
      addNotification('success', 'Invoice created successfully.');
  };

  const handleDownloadPDF = (payment: Payment) => {
      const client = clients.find(c => c.id === payment.clientId);
      generateInvoicePDF(payment, client, generalSettings);
  };

  const sendInvoiceWithPdf = async (payment: Payment, client: Client) => {
      // Use visual template from Campaign Store
      let template = templates.find(t => t.name === "Invoice Notification");
      
      // Fallback if deleted
      if (!template) {
          console.warn("Invoice Notification template not found. Using simple fallback.");
          template = {
              id: 'fallback',
              name: 'Fallback',
              subject: `Invoice ${getInvoiceDisplayId(payment.invoiceId, payment.id)}`,
              htmlContent: `<p>Please pay your invoice of $${payment.amount}.</p>`,
              createdBy: 'System'
          };
      }

      const formattedAmount = `${payment.amount.toLocaleString()} ${generalSettings.currency}`;
      const dueDate = payment.dueDate ? new Date(payment.dueDate).toLocaleDateString() : 'Immediate';

      // If Visual Builder used, re-compile to ensure latest state
      let htmlBody = template.htmlContent;
      if (template.designJson) {
          try {
              const design = JSON.parse(template.designJson);
              htmlBody = compileHtml(design.blocks, design.globalStyle, [], generalSettings.logoUrl);
          } catch (e) {
              console.error("Error compiling invoice template", e);
          }
      }

      const baseTokens = buildCompanyTokens(generalSettings);
      const tokenData = {
          ...baseTokens,
          client_name: client.contactName || '',
          invoice_id: getInvoiceDisplayId(payment.invoiceId, payment.id),
          amount: formattedAmount,
          due_date: dueDate,
          service: payment.serviceType || '',
          invoice_link: '#'
      };

      const subject = applyTemplateTokens(template.subject, tokenData);
      const body = applyTemplateTokens(htmlBody, tokenData);

      // Generate PDF Blob
      const pdfBlob = getInvoicePDFBlob(payment, client, generalSettings);
      const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(pdfBlob);
      });

      await sendInvoiceEmail(payment.id, {
          to: client.email,
          subject,
          html: body,
          attachmentBase64: base64,
          attachmentName: `Invoice_${getInvoiceDisplayId(payment.invoiceId, payment.id)}.pdf`,
          attachmentType: 'application/pdf'
      });
  };

  const handleEmailInvoice = async (payment: Payment) => {
      const client = clients.find(c => c.id === payment.clientId);
      if (!client || !client.email) {
          addNotification('error', "Client email not found.");
          return;
      }

      if (!window.confirm(`Send invoice email to ${client.email}?`)) return;

      setSendingEmailId(payment.id);

      try {
        await sendInvoiceWithPdf(payment, client);
        addNotification('success', `Invoice and PDF sent to ${client.email}`);
      } catch (err) {
        console.error("Failed to send email", err);
        addNotification('error', "Failed to send email. Please check configuration.");
      } finally {
        setSendingEmailId(null);
      }
  };

  const handleBulkEmailInvoices = async () => {
      if (selectedIds.length === 0) return;
      if (!window.confirm(`Send ${selectedIds.length} invoice emails with PDFs?`)) return;

      const paymentsToSend = payments.filter(p => selectedIds.includes(p.id));
      setIsBulkEmailing(true);

      let sent = 0;
      let skipped = 0;
      let failed = 0;

      for (const payment of paymentsToSend) {
          const client = clients.find(c => c.id === payment.clientId);
          if (!client || !client.email) {
              skipped += 1;
              continue;
          }
          try {
              await sendInvoiceWithPdf(payment, client);
              sent += 1;
          } catch (err) {
              console.error('Bulk email failed', err);
              failed += 1;
          }
      }

      setIsBulkEmailing(false);
      addNotification('success', `Bulk email complete. Sent: ${sent}, Skipped: ${skipped}, Failed: ${failed}.`);
  };

  return (
    <div className="space-y-8 pb-20 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-textPrimary">Payments & Revenue</h2>
          <p className="text-textSecondary">Track invoices, cash flow, and financial health.</p>
        </div>
        <button 
          onClick={() => { setIsModalOpen(true); setSearchInput(''); setNewInvoice(prev => ({...prev, clientId: ''})); }}
          className="flex items-center gap-2 px-6 py-3 bg-darkGreen text-white font-bold rounded-xl shadow-lg shadow-darkGreen/10 hover:bg-opacity-90 transition-all"
        >
          <Plus size={20} /> Create Invoice
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-border shadow-sm flex items-start justify-between">
              <div>
                  <p className="text-xs font-bold text-textMuted uppercase mb-1">Total Revenue (All Time)</p>
                  <h3 className="text-2xl font-bold text-textPrimary">${stats.totalRevenue.toLocaleString()}</h3>
              </div>
              <div className="p-3 bg-softMint rounded-xl text-darkGreen"><DollarSign size={24} /></div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl border border-border shadow-sm flex items-start justify-between">
              <div>
                  <p className="text-xs font-bold text-textMuted uppercase mb-1">Estimated MRR</p>
                  <h3 className="text-2xl font-bold text-textPrimary">${Math.round(stats.mrr).toLocaleString()}</h3>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl text-blue-600"><TrendingUp size={24} /></div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-border shadow-sm flex items-start justify-between">
              <div>
                  <p className="text-xs font-bold text-textMuted uppercase mb-1">Pending Invoices</p>
                  <h3 className="text-2xl font-bold text-warning">${stats.totalDue.toLocaleString()}</h3>
              </div>
              <div className="p-3 bg-orange-50 rounded-xl text-orange-600"><FileText size={24} /></div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-border shadow-sm flex items-start justify-between">
              <div>
                  <p className="text-xs font-bold text-textMuted uppercase mb-1">Overdue Amount</p>
                  <h3 className="text-2xl font-bold text-danger">${stats.totalOverdue.toLocaleString()}</h3>
              </div>
              <div className="p-3 bg-red-50 rounded-xl text-danger"><AlertCircle size={24} /></div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Revenue Chart */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-border shadow-sm">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-lg text-textPrimary">Revenue Trends</h3>
                  <div className="px-3 py-1 bg-slate-50 text-xs font-bold text-textSecondary rounded-lg">Last 6 Months</div>
              </div>
              <RevenueChart payments={payments} />
          </div>

          {/* Quick Actions / Summary */}
          <div className="bg-darkGreen text-white p-6 rounded-2xl shadow-lg flex flex-col justify-between">
              <div>
                  <h3 className="font-bold text-lg mb-2">Financial Health</h3>
                  <p className="text-softMint/80 text-sm mb-6">
                      You have collected <b>{Math.round((stats.totalRevenue / (stats.totalRevenue + stats.totalDue + 0.01)) * 100)}%</b> of total invoiced value.
                  </p>
                  
                  <div className="space-y-4">
                      <div className="flex justify-between items-center">
                          <span className="text-sm opacity-80">Active Subscriptions</span>
                          <span className="font-bold text-lg">{clients.reduce((acc, c) => acc + c.services.filter(s => s.status === 'Active').length, 0)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                          <span className="text-sm opacity-80">Avg. Client Value</span>
                          <span className="font-bold text-lg">
                              ${clients.length > 0 ? Math.round(stats.totalRevenue / clients.length).toLocaleString() : 0}
                          </span>
                      </div>
                  </div>
              </div>
              <button onClick={() => window.print()} className="w-full py-3 bg-white text-darkGreen font-bold rounded-xl mt-6 hover:bg-softMint transition-colors">
                  Print Report
              </button>
          </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
          {/* ... (Existing table code remains the same as previous) ... */}
          <div className="p-4 border-b border-border flex flex-col sm:flex-row justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                  <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" size={16} />
                      <input 
                          type="text" 
                          placeholder="Search invoice, client..." 
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-border rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none"
                      />
                  </div>
                  <div className="relative">
                      <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
                      <select 
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value as any)}
                          className="pl-9 pr-8 py-2 bg-slate-50 border border-border rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none appearance-none cursor-pointer"
                      >
                          <option value="All">All Status</option>
                          <option value="Paid">Paid</option>
                          <option value="Due">Due</option>
                          <option value="Overdue">Overdue</option>
                      </select>
                  </div>
              </div>
              
              {selectedIds.length > 0 && (
                  <button 
                    onClick={initiateBulkDelete}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 text-danger font-bold rounded-lg hover:bg-red-100 transition-colors border border-red-100"
                  >
                    <Trash2 size={16} /> Delete ({selectedIds.length})
                  </button>
              )}
          </div>

          {/* DYNAMIC SELECTION BANNER - Shows whenever there is a selection */}
          {selectedIds.length > 0 && (
            <div className={`flex items-center justify-center gap-2 p-3 text-sm font-medium animate-in fade-in slide-in-from-top-1 ${
                isAllSelected ? 'bg-softMint/50 border-b border-primary/20 text-darkGreen' : 'bg-blue-50 border-b border-blue-100 text-blue-800'
            }`}>
                <CheckCircle2 size={16} />
                
                {/* Text Logic */}
                {isAllSelected ? (
                    <span>All <b>{filteredPayments.length}</b> invoices are selected.</span>
                ) : (
                    <span>
                        <b>{selectedIds.length}</b> invoice{selectedIds.length !== 1 ? 's' : ''} selected.
                    </span>
                )}

                {/* Button Logic */}
                {!isAllSelected && canSelectMore ? (
                    <button 
                        onClick={handleSelectAllFiltered}
                        className="font-bold underline hover:text-blue-900 ml-1 cursor-pointer"
                    >
                        Select all {filteredPayments.length} matching filters
                    </button>
                ) : (
                    <button 
                        onClick={() => setSelectedIds([])}
                        className="font-bold underline ml-1 cursor-pointer hover:opacity-80"
                    >
                        Clear selection
                    </button>
                )}
            </div>
          )}

          <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-border">
                      <tr>
                          <th className="px-4 py-4 w-10">
                            <button onClick={toggleSelectPage} className="text-textMuted hover:text-primary">
                                {isPageSelected ? <CheckSquare size={18} className="text-primary"/> : <Square size={18}/>}
                            </button>
                          </th>
                          <th className="px-6 py-4 font-bold text-textMuted uppercase text-xs">Invoice ID</th>
                          <th className="px-6 py-4 font-bold text-textMuted uppercase text-xs">Client</th>
                          <th className="px-6 py-4 font-bold text-textMuted uppercase text-xs">Service</th>
                          <th className="px-6 py-4 font-bold text-textMuted uppercase text-xs">Date</th>
                          <th className="px-6 py-4 font-bold text-textMuted uppercase text-xs">Amount</th>
                          <th className="px-6 py-4 font-bold text-textMuted uppercase text-xs">Status</th>
                          <th className="px-6 py-4 font-bold text-textMuted uppercase text-xs text-right">Actions</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                      {filteredPayments.length === 0 ? (
                          <tr><td colSpan={8} className="px-6 py-12 text-center text-textMuted">No transactions found.</td></tr>
                      ) : (
                          paginatedPayments.map(payment => (
                              <tr key={payment.id} className={`hover:bg-slate-50 transition-colors ${selectedIds.includes(payment.id) ? 'bg-softMint/20' : ''}`}>
                                  <td className="px-4 py-4">
                                    <button onClick={() => toggleSelect(payment.id)} className="text-textMuted hover:text-primary">
                                        {selectedIds.includes(payment.id) ? <CheckSquare size={18} className="text-primary"/> : <Square size={18}/>}
                                    </button>
                                  </td>
                                  <td className="px-6 py-4 font-mono text-textSecondary">{getInvoiceDisplayId(payment.invoiceId, payment.id)}</td>
                                  <td className="px-6 py-4 font-bold text-textPrimary">{payment.clientName}</td>
                                  <td className="px-6 py-4 text-textSecondary">{payment.serviceType}</td>
                                  <td className="px-6 py-4 text-textSecondary">
                                      {new Date(payment.date).toLocaleDateString()}
                                      <div className="text-[10px] text-textMuted">Due: {payment.dueDate ? new Date(payment.dueDate).toLocaleDateString() : 'N/A'}</div>
                                  </td>
                                  <td className="px-6 py-4 font-bold text-textPrimary">${payment.amount.toLocaleString()}</td>
                                  <td className="px-6 py-4">
                                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                                          payment.status === 'Paid' ? 'bg-success/10 text-success' : 
                                          payment.status === 'Overdue' ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning'
                                      }`}>
                                          {payment.status}
                                      </span>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                      <div className="flex justify-end gap-2">
                                          {payment.status !== 'Paid' && (
                                              <button 
                                                  onClick={() => updatePaymentStatus(payment.id, 'Paid')}
                                                  className="p-1.5 text-success hover:bg-green-50 rounded transition-colors"
                                                  title="Mark as Paid"
                                              >
                                                  <CheckCircle2 size={16} />
                                              </button>
                                          )}
                                          <button 
                                              onClick={() => handleEmailInvoice(payment)}
                                              disabled={sendingEmailId === payment.id}
                                              className="p-1.5 text-textSecondary hover:bg-slate-100 rounded transition-colors disabled:opacity-50"
                                              title="Email Invoice & PDF"
                                          >
                                              {sendingEmailId === payment.id ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                                          </button>
                                          <button 
                                              onClick={() => handleDownloadPDF(payment)}
                                              className="p-1.5 text-textSecondary hover:bg-slate-100 rounded transition-colors"
                                              title="Download PDF"
                                          >
                                              <Download size={16} />
                                          </button>
                                          <button 
                                              onClick={() => initiateSingleDelete(payment.id)}
                                              className="p-1.5 text-textMuted hover:text-danger hover:bg-red-50 rounded transition-colors"
                                              title="Delete"
                                          >
                                              <Trash2 size={16} />
                                          </button>
                                      </div>
                                  </td>
                              </tr>
                          ))
                      )}
                  </tbody>
              </table>
          </div>

          {/* Pagination */}
          {filteredPayments.length > 0 && (
            <div className="flex items-center justify-between bg-white p-4 border-t border-border">
              <span className="text-sm text-textSecondary">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredPayments.length)} of {filteredPayments.length}
              </span>
              <div className="flex items-center gap-3">
                <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="p-2 bg-white border border-border rounded-lg disabled:opacity-50 hover:bg-slate-100 transition-colors">
                  <ChevronLeft size={16} />
                </button>
                
                <form onSubmit={handlePageInputSubmit} className="flex items-center gap-2">
                   <span className="text-sm font-medium text-textSecondary">Page</span>
                   <input 
                      type="text" 
                      value={pageInput}
                      onChange={(e) => setPageInput(e.target.value)}
                      className="w-12 px-2 py-1 text-center bg-white text-black border border-border rounded-lg text-sm font-bold focus:ring-2 focus:ring-primary outline-none"
                   />
                   <span className="text-sm font-medium text-textSecondary">of {totalPages}</span>
                </form>

                <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="p-2 bg-white border border-border rounded-lg disabled:opacity-50 hover:bg-slate-100 transition-colors">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
      </div>

      {/* Floating Bulk Actions - Ensure it's rendered if selection > 0 */}
      {selectedIds.length > 0 && (
        <ClientBulkActions 
           selectedCount={selectedIds.length}
           onClear={() => setSelectedIds([])}
           onExportZip={handleBulkDownload}
           onDelete={initiateBulkDelete}
           isExporting={isExporting}
           onEmailBulk={handleBulkEmailInvoices}
           isEmailingBulk={isBulkEmailing}
           exportProgress={exportProgress}
           exportStatus={exportStatus}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfig.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
             <div className="flex items-center gap-3 mb-4 text-danger">
                <div className="p-2 bg-red-100 rounded-full">
                  <Trash2 size={24} />
                </div>
                <h3 className="font-bold text-lg text-textPrimary">Delete Invoices?</h3>
             </div>
             <p className="text-textSecondary text-sm mb-6 leading-relaxed">
                Are you sure you want to delete {deleteConfig.type === 'bulk' ? <span className="font-bold text-textPrimary">{selectedIds.length} invoices</span> : <span className="font-bold text-textPrimary">this invoice</span>}? This action cannot be undone.
             </p>
             <div className="flex gap-3">
                <button 
                  onClick={() => setDeleteConfig({ ...deleteConfig, isOpen: false })} 
                  className="flex-1 py-3 border border-border text-textPrimary font-bold rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete} 
                  className="flex-1 py-3 bg-danger text-white font-bold rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-100"
                >
                  Delete
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Create Invoice Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-3xl rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-textPrimary">Create New Invoice</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-textMuted hover:text-danger">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateInvoice} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-6">
                  {/* Client Search */}
                  <div className="relative" ref={searchRef}>
                    <label className="block text-xs font-bold text-textSecondary uppercase mb-1">Bill To Client</label>
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
                        <input 
                            type="text" 
                            value={searchInput}
                            onChange={handleSearchChange}
                            onFocus={() => { if (searchInput && suggestions.length > 0) setShowSuggestions(true); }}
                            className={`w-full pl-9 pr-3 py-2 bg-slate-50 border rounded-lg focus:ring-2 outline-none ${newInvoice.clientId ? 'border-success ring-success/20 font-bold text-darkGreen' : 'border-border focus:ring-primary'}`}
                            placeholder="Search Name or ID..."
                            autoComplete="off"
                        />
                        {newInvoice.clientId && (
                            <CheckCircle2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-success" />
                        )}
                    </div>
                    
                    {showSuggestions && suggestions.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-border rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto z-30">
                            {suggestions.map(client => (
                                <div 
                                    key={client.id}
                                    onClick={() => handleSelectClient(client)}
                                    className="px-4 py-3 hover:bg-softMint/30 cursor-pointer border-b border-border last:border-0 flex items-center justify-between group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs bg-darkGreen">
                                            {(client.companyName || client.contactName).charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-textPrimary group-hover:text-darkGreen">{client.companyName || client.contactName}</p>
                                            <p className="text-xs text-textMuted">{client.email}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                  </div>

                  {/* Due Date */}
                  <div>
                      <label className="block text-xs font-bold text-textSecondary uppercase mb-1">Due Date</label>
                      <input 
                        type="date" 
                        value={newInvoice.dueDate}
                        onChange={(e) => setNewInvoice({...newInvoice, dueDate: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50 border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                        required 
                      />
                  </div>
              </div>

              {/* Items Section */}
              <div className="bg-slate-50 p-4 rounded-xl border border-border">
                  <div className="flex justify-between items-center mb-3 border-b border-border pb-2">
                      <label className="text-xs font-bold text-textSecondary uppercase">Item Description</label>
                      <div className="flex gap-4 pr-12">
                          <label className="text-xs font-bold text-textSecondary uppercase w-16 text-center">Qty</label>
                          <label className="text-xs font-bold text-textSecondary uppercase w-24 text-right">Price</label>
                          <label className="text-xs font-bold text-textSecondary uppercase w-24 text-right">Total</label>
                      </div>
                  </div>
                  
                  <div className="space-y-3">
                      {newInvoice.items.map((item, index) => (
                          <div key={index} className="flex gap-4 items-start">
                              <div className="flex-1">
                                  <input 
                                      type="text" 
                                      placeholder="Service or Product Name" 
                                      value={item.description}
                                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                      className="w-full px-3 py-2 bg-white border border-border rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none"
                                      required
                                  />
                              </div>
                              <div className="w-16">
                                  <input 
                                      type="number" 
                                      min="1"
                                      value={item.quantity}
                                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                      className="w-full px-2 py-2 bg-white border border-border rounded-lg text-sm text-center focus:ring-1 focus:ring-primary outline-none"
                                      required
                                  />
                              </div>
                              <div className="w-24">
                                  <input 
                                      type="number" 
                                      min="0"
                                      step="0.01"
                                      placeholder="0.00" 
                                      value={item.unitPrice}
                                      onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                                      className="w-full px-2 py-2 bg-white border border-border rounded-lg text-sm text-right focus:ring-1 focus:ring-primary outline-none"
                                      required
                                  />
                              </div>
                              <div className="w-24 py-2 text-right font-bold text-textPrimary text-sm">
                                  ${item.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                              </div>
                              {newInvoice.items.length > 1 && (
                                  <button 
                                      type="button" 
                                      onClick={() => handleRemoveItem(index)}
                                      className="p-2 text-textMuted hover:text-danger hover:bg-white rounded-lg transition-colors"
                                  >
                                      <Trash2 size={16} />
                                  </button>
                              )}
                          </div>
                      ))}
                  </div>
                  
                  <button type="button" onClick={handleAddItem} className="mt-4 text-xs font-bold text-primary hover:underline flex items-center gap-1">
                      <Plus size={12} /> Add Line Item
                  </button>

                  <div className="flex justify-end items-center mt-4 pt-4 border-t border-border">
                      <div className="text-right">
                          <p className="text-xs text-textSecondary uppercase font-bold mb-1">Grand Total</p>
                          <p className="text-2xl font-bold text-darkGreen">${calculateTotal().toLocaleString()}</p>
                      </div>
                  </div>
              </div>

              <button 
                type="submit" 
                className="w-full py-3 mt-4 bg-darkGreen text-white font-bold rounded-xl hover:bg-opacity-90 transition-all shadow-lg shadow-darkGreen/20"
              >
                Generate Invoice
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;
