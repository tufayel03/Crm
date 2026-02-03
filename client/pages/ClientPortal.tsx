
import React, { useMemo } from 'react';
import { useClientsStore } from '../stores/clientsStore';
import { useAuthStore } from '../stores/authStore';
import { useSettingsStore } from '../stores/settingsStore';
import { generateInvoicePDF } from '../utils/pdfGenerator';
import { 
  Briefcase, Globe, Mail, User, Clock, Hash, 
  CreditCard, CheckCircle2, Calendar, Download
} from 'lucide-react';

const ClientPortal: React.FC = () => {
  const { clients, payments } = useClientsStore();
  const { user } = useAuthStore();
  const { generalSettings } = useSettingsStore();

  // Find the client record associated with the logged-in user
  const client = useMemo(() => {
    if (!user) return null;
    const found = clients.find(c => c.email.toLowerCase() === user.email.toLowerCase());
    return found || clients[0]; // Fallback for demo
  }, [clients, user]);

  const clientPayments = useMemo(() => {
    if (!client) return [];
    return payments.filter(p => p.clientId === client.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [payments, client]);

  // Calculations
  const totalInvested = useMemo(() => {
      return clientPayments.filter(p => p.status === 'Paid').reduce((acc, p) => acc + p.amount, 0);
  }, [clientPayments]);

  const activeServices = useMemo(() => {
      return client?.services.filter(s => s.status === 'Active') || [];
  }, [client]);

  const nextDueDate = useMemo(() => {
      const due = clientPayments.find(p => p.status === 'Due' || p.status === 'Overdue');
      return due ? new Date(due.dueDate || due.date) : null;
  }, [clientPayments]);

  if (!client) {
      return (
          <div className="p-12 text-center">
              <h2 className="text-xl font-bold text-textPrimary">No Account Found</h2>
              <p className="text-textSecondary">We couldn't associate your login with a client profile.</p>
          </div>
      );
  }

  const handleDownloadInvoice = (payment: any) => {
      generateInvoicePDF(payment, client, generalSettings);
  };

  return (
    <div className="space-y-8 pb-20">
      
      {/* Header */}
      <div>
          <h2 className="text-2xl font-bold text-textPrimary">Welcome, {client.contactName}</h2>
          <p className="text-textSecondary">Client Portal for <span className="font-bold text-primary">{client.companyName}</span></p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-border shadow-sm flex items-center justify-between">
              <div>
                  <p className="text-xs font-bold text-textMuted uppercase mb-1">Total Invested</p>
                  <h3 className="text-2xl font-bold text-textPrimary">${totalInvested.toLocaleString()}</h3>
              </div>
              <div className="p-3 bg-green-50 rounded-xl text-darkGreen"><CreditCard size={24} /></div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl border border-border shadow-sm flex items-center justify-between">
              <div>
                  <p className="text-xs font-bold text-textMuted uppercase mb-1">Active Services</p>
                  <h3 className="text-2xl font-bold text-textPrimary">{activeServices.length}</h3>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl text-blue-600"><CheckCircle2 size={24} /></div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-border shadow-sm flex items-center justify-between">
              <div>
                  <p className="text-xs font-bold text-textMuted uppercase mb-1">Next Payment</p>
                  <h3 className={`text-xl font-bold ${nextDueDate ? 'text-warning' : 'text-textPrimary'}`}>
                      {nextDueDate ? nextDueDate.toLocaleDateString() : 'All Caught Up'}
                  </h3>
              </div>
              <div className="p-3 bg-orange-50 rounded-xl text-orange-600"><Calendar size={24} /></div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Profile Card */}
          <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
                  <div className="flex flex-col items-center text-center mb-6">
                      <div className="w-20 h-20 rounded-full bg-softMint flex items-center justify-center text-darkGreen text-3xl font-bold mb-4 border-4 border-white shadow-sm">
                          {client.companyName.charAt(0)}
                      </div>
                      <h3 className="text-xl font-bold text-textPrimary">{client.companyName}</h3>
                      <p className="text-sm text-textSecondary">{client.contactName}</p>
                  </div>

                  <div className="space-y-4">
                      <div className="flex justify-between py-2 border-b border-border/50">
                          <span className="text-sm text-textMuted flex items-center gap-2"><Globe size={14} /> Country</span>
                          <span className="text-sm font-medium text-textPrimary">{client.country}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-border/50">
                          <span className="text-sm text-textMuted flex items-center gap-2"><Mail size={14} /> Email</span>
                          <span className="text-sm font-medium text-textPrimary">{client.email}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-border/50">
                          <span className="text-sm text-textMuted flex items-center gap-2"><Hash size={14} /> Unique ID</span>
                          <span className="text-sm font-mono font-bold text-primary">{client.uniqueId}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-border/50">
                          <span className="text-sm text-textMuted flex items-center gap-2"><Clock size={14} /> Onboarded</span>
                          <span className="text-sm font-medium text-textPrimary">{new Date(client.onboardedAt).toLocaleDateString()}</span>
                      </div>
                      
                      {/* Account Manager Section (Read Only) */}
                      <div className="flex justify-between items-center py-2">
                          <span className="text-sm text-textMuted flex items-center gap-2"><User size={14} /> Account Manager</span>
                          <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-darkGreen bg-softMint px-2 py-0.5 rounded-md">
                                  {client.accountManagerName}
                              </span>
                          </div>
                      </div>
                  </div>
              </div>
          </div>

          {/* Main Content (Services & Invoices) */}
          <div className="lg:col-span-2 space-y-8">
              
              {/* Active Services */}
              <div>
                  <h3 className="font-bold text-lg text-textPrimary mb-4 flex items-center gap-2">
                      <Briefcase size={20} className="text-primary" /> Active Subscriptions
                  </h3>
                  {activeServices.length === 0 ? (
                      <div className="bg-slate-50 border border-border rounded-xl p-8 text-center text-textMuted">
                          No active services found.
                      </div>
                  ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {activeServices.map(sub => (
                              <div key={sub.id} className="bg-white p-5 rounded-xl border border-border shadow-sm hover:border-primary/50 transition-colors">
                                  <div className="flex justify-between items-start mb-3">
                                      <span className="px-2 py-1 bg-softMint text-darkGreen text-xs font-bold rounded uppercase">Active</span>
                                      <span className="text-sm text-textMuted">{sub.duration} Days</span>
                                  </div>
                                  <h4 className="text-lg font-bold text-textPrimary mb-1">{sub.type}</h4>
                                  <p className="text-2xl font-bold text-textPrimary">${sub.price.toLocaleString()}</p>
                                  <p className="text-xs text-textSecondary mt-2">Started: {new Date(sub.startDate).toLocaleDateString()}</p>
                              </div>
                          ))}
                      </div>
                  )}
              </div>

              {/* Invoices */}
              <div>
                  <h3 className="font-bold text-lg text-textPrimary mb-4 flex items-center gap-2">
                      <CreditCard size={20} className="text-primary" /> Payment History
                  </h3>
                  <div className="bg-white rounded-xl border border-border overflow-hidden shadow-sm">
                      <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 border-b border-border">
                              <tr>
                                  <th className="px-6 py-4 font-bold text-textMuted uppercase">Date</th>
                                  <th className="px-6 py-4 font-bold text-textMuted uppercase">Description</th>
                                  <th className="px-6 py-4 font-bold text-textMuted uppercase">Amount</th>
                                  <th className="px-6 py-4 font-bold text-textMuted uppercase">Status</th>
                                  <th className="px-6 py-4 font-bold text-textMuted uppercase text-right">Invoice</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                              {clientPayments.length === 0 ? (
                                  <tr><td colSpan={5} className="px-6 py-8 text-center text-textMuted">No invoices found.</td></tr>
                              ) : (
                                  clientPayments.map(p => (
                                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                          <td className="px-6 py-4 text-textSecondary">{new Date(p.date).toLocaleDateString()}</td>
                                          <td className="px-6 py-4 font-medium text-textPrimary">{p.serviceType}</td>
                                          <td className="px-6 py-4 font-bold text-textPrimary">${p.amount.toLocaleString()}</td>
                                          <td className="px-6 py-4">
                                              <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                                                  p.status === 'Paid' ? 'bg-success/10 text-success' : 
                                                  p.status === 'Overdue' ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning'
                                              }`}>
                                                  {p.status}
                                              </span>
                                          </td>
                                          <td className="px-6 py-4 text-right">
                                              <button 
                                                  onClick={() => handleDownloadInvoice(p)}
                                                  className="p-2 text-textSecondary hover:text-primary hover:bg-slate-100 rounded-lg transition-colors"
                                                  title="Download Invoice PDF"
                                              >
                                                  <Download size={16} />
                                              </button>
                                          </td>
                                      </tr>
                                  ))
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>

          </div>
      </div>
    </div>
  );
};

export default ClientPortal;
