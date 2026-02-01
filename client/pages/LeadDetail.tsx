
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLeadsStore } from '../stores/leadsStore';
import { useAuthStore } from '../stores/authStore';
import { useTasksStore } from '../stores/tasksStore';
import { useClientsStore } from '../stores/clientsStore';
import { useCampaignStore } from '../stores/campaignStore';
import { useTeamStore } from '../stores/teamStore';
import { useSettingsStore } from '../stores/settingsStore';
import { maskValue } from '../utils/mockData';
import { applyTemplateTokens, buildCompanyTokens } from '../utils/templateTokens';
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  User, 
  Plus, 
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Hash,
  Tag,
  X,
  Loader2
} from 'lucide-react';
import { LeadStatus } from '../types';

const LeadDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { leads, updateStatus, updateAgent, addNote, revealContact, statuses, outcomes } = useLeadsStore();
  const { user, role } = useAuthStore();
  const { createTask } = useTasksStore();
  const { convertLeadToClient, clients } = useClientsStore();
  const { templates, sendSingleEmail } = useCampaignStore();
  const { members, fetchMembers } = useTeamStore();
  const { generalSettings } = useSettingsStore();
  
  const lead = leads.find(l => l.id === id);
  const isAlreadyClient = clients.some(c => c.leadId === id);
  const [newNote, setNewNote] = useState('');
  const [outcome, setOutcome] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');

  // Email Modal State
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const isAdmin = role === 'admin' || role === 'manager';

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const availableAgents = useMemo(() => {
    return members
      .filter(m => m.role !== 'client' && m.status !== 'blocked')
      .map(m => ({ id: m.id, name: m.name || m.email || 'Unnamed User' }));
  }, [members]);

  const displayAgents = useMemo(() => {
    const list = [...availableAgents];
    if (lead?.assignedAgentId && !list.find(a => a.id === lead.assignedAgentId)) {
      list.unshift({
        id: lead.assignedAgentId,
        name: lead.assignedAgentName || 'Unknown Agent'
      });
    }
    return list;
  }, [availableAgents, lead?.assignedAgentId, lead?.assignedAgentName]);

  if (!lead) {
    return <div className="p-8 text-center">Lead not found</div>;
  }

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote) return;
    addNote(lead.id, newNote, user?.name || 'Unknown');
    setNewNote('');
  };

  const handleLogCall = () => {
    if (!outcome) return;
    
    const noteContent = `Call logged. Outcome: ${outcome}`;
    addNote(lead.id, noteContent, user?.name || 'Unknown');

    if (outcome === 'Follow-up' && followUpDate) {
      createTask({
        title: `Follow up with ${lead.name}`,
        description: `Auto-generated follow up from call logging.`,
        dueDate: followUpDate,
        priority: 'medium',
        leadId: lead.id,
        createdBy: user?.id || 'unknown',
        createdByName: user?.name || 'Unknown',
        assignedTo: user?.id || 'unknown', // Auto-assign to self
        assignedToName: user?.name || 'Unknown',
      });
      alert('Follow-up task created!');
    }
    
    setOutcome('');
    setFollowUpDate('');
  };

  const handleConvertToClient = () => {
    // Prompt is now for Shop Name and optional
    const shopName = window.prompt("Enter Client's Shop Name (Optional):", "");
    if (shopName !== null) { // Check for null (Cancel) but allow empty string
      convertLeadToClient(lead, shopName);
      updateStatus(lead.id, 'Closed Won');
      alert(`${lead.name} has been converted to a client!`);
      navigate('/clients');
    }
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    updateStatus(lead.id, newStatus);

    if ((newStatus === 'Converted' || newStatus === 'Closed Won') && !isAlreadyClient) {
        const shopName = window.prompt(`Lead status changed to ${newStatus}. Enter Shop Name to create Client account (Optional):`, "") || "";
        convertLeadToClient(lead, shopName);
        alert("Client account created successfully!");
    }
  };

  const handleAgentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
     const newValue = e.target.value;
     if (!newValue) {
       updateAgent(lead.id, '', 'Unassigned');
       return;
     }
     const agent = availableAgents.find(a => a.id === newValue);
     if (agent) updateAgent(lead.id, agent.id, agent.name);
  };

  const handleTemplateSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tId = e.target.value;
    if (!tId) return;
    const t = templates.find(temp => temp.id === tId);
    if (t) {
        const baseTokens = buildCompanyTokens(generalSettings);
        const tokenData = {
          ...baseTokens,
          lead_name: lead.name,
          lead_first_name: lead.name.split(' ')[0],
          lead_email: lead.email || ''
        };
        setEmailSubject(applyTemplateTokens(t.subject, tokenData));
        setEmailBody(t.htmlContent);
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailSubject || !emailBody) return;
    
    setIsSendingEmail(true);
    // Simple replacement for variables if not processed by template selection
    const baseTokens = buildCompanyTokens(generalSettings);
    const tokenData = {
      ...baseTokens,
      lead_name: lead.name,
      lead_first_name: lead.name.split(' ')[0],
      lead_email: lead.email || '',
      agent_name: user?.name || 'Agent'
    };
    let finalBody = applyTemplateTokens(emailBody, tokenData);
    const finalSubject = applyTemplateTokens(emailSubject, tokenData);

    const success = await sendSingleEmail(lead.email, finalSubject, finalBody);
    setIsSendingEmail(false);
    
    if (success) {
        addNote(lead.id, `Email Sent: ${emailSubject}`, user?.name || 'System');
        alert('Email sent successfully!');
        setIsEmailModalOpen(false);
        setEmailSubject('');
        setEmailBody('');
    } else {
        alert('Failed to send email. Check your email settings.');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <button 
          onClick={() => navigate('/leads')}
          className="flex items-center gap-2 text-textSecondary hover:text-darkGreen font-medium transition-colors"
        >
          <ArrowLeft size={18} /> Back to Leads
        </button>
        <div className="flex gap-2">
            <span className="px-3 py-2 bg-slate-100 rounded-lg text-sm font-mono text-textMuted flex items-center gap-1" title="Unique ID">
                <Tag size={14} /> {lead.shortId || '---'}
            </span>
            <span className="px-3 py-2 bg-slate-100 rounded-lg text-sm font-mono text-textMuted flex items-center gap-1" title="System ID">
                <Hash size={14} /> {lead.readableId}
            </span>
            {lead.status === 'Closed Won' && !isAlreadyClient && (
            <button 
                onClick={handleConvertToClient}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-darkGreen font-bold rounded-xl hover:bg-lightMint transition-all shadow-lg shadow-primary/10"
            >
                <Briefcase size={18} /> Convert to Client
            </button>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Profile */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-border">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-24 h-24 rounded-full bg-softMint flex items-center justify-center text-darkGreen text-4xl font-bold mb-4 shadow-inner">
                {lead.name.charAt(0)}
              </div>
              <h2 className="text-2xl font-bold text-textPrimary">{lead.name}</h2>
              <span className={`mt-2 px-3 py-1 rounded-full text-xs font-bold border ${lead.status === 'New' ? 'bg-blue-50 text-blue-600' : 'bg-success/10 text-success'}`}>
                {lead.status}
              </span>
              {isAlreadyClient && (
                <span className="mt-2 text-xs font-bold text-primary flex items-center gap-1">
                  <CheckCircle2 size={14} /> Active Client
                </span>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 text-textSecondary">
                <Mail size={18} className="text-textMuted" />
                <span className="text-sm">{maskValue(lead.email, 'email', lead.isRevealed || isAdmin)}</span>
              </div>
              <div className="flex items-center gap-3 text-textSecondary">
                <Phone size={18} className="text-textMuted" />
                <span className="text-sm">{maskValue(lead.phone, 'phone', lead.isRevealed || isAdmin)}</span>
              </div>
              <div className="flex items-center gap-3 text-textSecondary">
                <MapPin size={18} className="text-textMuted" />
                <span className="text-sm">{lead.country}</span>
              </div>
              <div className="flex items-center gap-3 text-textSecondary">
                <Calendar size={18} className="text-textMuted" />
                <span className="text-sm">Created {new Date(lead.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-3 text-textSecondary">
                <User size={18} className="text-textMuted" />
                <span className="text-sm">Assigned to:</span>
                <select 
                    className="ml-auto text-sm bg-slate-50 border border-border rounded px-2 py-1 outline-none focus:border-primary"
                    value={lead.assignedAgentId || ''}
                    onChange={handleAgentChange}
                >
                    <option value="">Unassigned</option>
                    {displayAgents.map(agent => (
                      <option key={agent.id} value={agent.id}>{agent.name}</option>
                    ))}
                </select>
              </div>
            </div>

            <div className="mt-8 space-y-3">
              {!lead.isRevealed && !isAdmin && (
                <button 
                  onClick={() => revealContact(lead.id)}
                  className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-opacity-90 transition-all flex items-center justify-center gap-2"
                >
                  Reveal Contact Details
                </button>
              )}
              <button 
                onClick={() => setIsEmailModalOpen(true)}
                className="w-full py-3 border border-border text-textPrimary font-semibold rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
              >
                <Mail size={18} /> Send Email
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-border">
            <h3 className="font-bold text-textPrimary mb-4">Update Status</h3>
            <select 
              value={lead.status}
              onChange={handleStatusChange}
              className="w-full px-4 py-3 bg-appBg border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all font-medium text-textSecondary"
            >
              {statuses.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Right Column: Timeline & Interactions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-border">
            <h3 className="font-bold text-textPrimary mb-6 flex items-center gap-2">
              <Phone size={20} className="text-darkGreen" /> Log Call Interaction
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-bold text-textMuted uppercase tracking-wider mb-2">Outcome</label>
                <select 
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                  className="w-full px-4 py-3 bg-appBg border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none"
                >
                  <option value="">Select Outcome</option>
                  {outcomes.map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
              {outcome === 'Follow-up' && (
                <div>
                  <label className="block text-xs font-bold text-textMuted uppercase tracking-wider mb-2">Follow-up Date</label>
                  <input 
                    type="date" 
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full px-4 py-3 bg-appBg border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
              )}
            </div>
            <button 
              onClick={handleLogCall}
              disabled={!outcome || (outcome === 'Follow-up' && !followUpDate)}
              className="px-6 py-3 bg-darkGreen text-white font-bold rounded-xl hover:bg-opacity-90 disabled:opacity-50 transition-all"
            >
              Log Interaction
            </button>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-border">
            <h3 className="font-bold text-textPrimary mb-6">Activity & Notes</h3>
            
            <form onSubmit={handleAddNote} className="mb-8">
              <div className="relative">
                <textarea 
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note about this lead..."
                  className="w-full p-4 bg-appBg border border-border rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all min-h-[100px]"
                ></textarea>
                <button 
                  type="submit"
                  className="absolute bottom-4 right-4 p-2 bg-darkGreen text-white rounded-lg hover:bg-opacity-90 transition-all"
                >
                  <Send size={18} />
                </button>
              </div>
            </form>

            <div className="space-y-6 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-[1px] before:bg-border">
              {lead.notes.length === 0 ? (
                <div className="pl-10 text-textMuted italic py-4">No activity logged yet.</div>
              ) : (
                [...lead.notes].reverse().map((note) => (
                  <div key={note.id} className="relative pl-10">
                    <div className="absolute left-0 top-1 w-8 h-8 bg-white border border-border rounded-full flex items-center justify-center">
                      <Clock size={14} className="text-textMuted" />
                    </div>
                    <div className="bg-appBg p-4 rounded-xl border border-border/50">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-bold text-textPrimary">{note.author}</span>
                        <span className="text-[10px] font-medium text-textMuted uppercase">{new Date(note.timestamp).toLocaleString()}</span>
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

      {/* SEND EMAIL MODAL */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-textPrimary flex items-center gap-2">
                <Mail size={20} className="text-darkGreen" /> Send Email to {lead.name}
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

export default LeadDetail;
