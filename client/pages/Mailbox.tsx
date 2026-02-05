
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useMailStore, EmailMessage } from '../stores/mailStore';
import { useLeadsStore } from '../stores/leadsStore';
import { useClientsStore } from '../stores/clientsStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useCampaignStore } from '../stores/campaignStore'; // Import Campaign Store for Templates
import { applyTemplateTokens, buildCompanyTokens } from '../utils/templateTokens';
import {
    Inbox, Star, Send, Trash2, Search, MoreVertical,
    RefreshCw, ChevronLeft, ChevronRight, Paperclip,
    CornerUpLeft, MoreHorizontal, Tag, Briefcase,
    Folder, ChevronDown, ChevronRight as ChevronRightIcon,
    Mail, Plus, X, FileText, Check, User
} from 'lucide-react';

const Mailbox: React.FC = () => {
    const { emails, markAsRead, toggleStar, deleteEmail, fetchEmails, syncEmails, refreshing, error: mailError } = useMailStore();
    const { leads, statuses, addNote } = useLeadsStore();
    const { clients, addClientNote } = useClientsStore();
    const { emailAccounts, generalSettings } = useSettingsStore();
    const { templates, sendSingleEmail } = useCampaignStore();

    const [search, setSearch] = useState('');
    const [selectedFolder, setSelectedFolder] = useState<'General' | 'Clients' | string>('General');
    const [selectedAccountId, setSelectedAccountId] = useState<string>('all'); // 'all' or emailAccount.id

    const [expandedLeads, setExpandedLeads] = useState(true);
    const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
    const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
    const accountMenuRef = useRef<HTMLDivElement>(null);

    // Reply State
    const [isReplying, setIsReplying] = useState(false);
    const [replyContent, setReplyContent] = useState('');
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [isSendingReply, setIsSendingReply] = useState(false);
    const [replyError, setReplyError] = useState<string | null>(null);

    // Handle click outside account menu
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
                setIsAccountMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (emailAccounts.length === 0) return;
        fetchEmails(selectedAccountId);
    }, [selectedAccountId, emailAccounts, fetchEmails]);

    useEffect(() => {
        if (emailAccounts.length === 0) return;
        const id = setInterval(() => {
            fetchEmails(selectedAccountId);
        }, 10000);
        return () => clearInterval(id);
    }, [selectedAccountId, emailAccounts, fetchEmails]);

    useEffect(() => {
        if (emailAccounts.length === 0) return;
        const id = setInterval(() => {
            syncEmails();
        }, 5 * 60 * 1000);
        return () => clearInterval(id);
    }, [emailAccounts, syncEmails]);

    // Reset reply state when changing email
    useEffect(() => {
        setIsReplying(false);
        setReplyContent('');
        setSelectedTemplateId('');
    }, [selectedEmailId]);

    // --- Account Switching Logic ---
    const currentAccount = useMemo(() =>
        emailAccounts.find(acc => acc.id === selectedAccountId),
        [emailAccounts, selectedAccountId]);

    // --- Filtering Logic (Folder Routing & Account) ---
    const filteredEmails = useMemo(() => {
        let list = emails;

        // 1. Account Filter
        if (selectedAccountId !== 'all' && currentAccount) {
            // Filter emails sent TO the selected account
            // Note: Mock data needs to align. In production, this matches the 'to' field.
            list = list.filter(e => e.to.toLowerCase() === currentAccount.email.toLowerCase());
        }

        // 2. Search Filter
        if (search) {
            const term = search.toLowerCase();
            list = list.filter(e =>
                e.subject.toLowerCase().includes(term) ||
                e.fromName.toLowerCase().includes(term) ||
                e.body.toLowerCase().includes(term)
            );
        }

        // 3. Folder Routing Logic
        return list.filter(email => {
            // Identify Sender
            const leadMatch = leads.find(l => l.email.toLowerCase() === email.from.toLowerCase());
            const clientMatch = clients.find(c => c.email.toLowerCase() === email.from.toLowerCase());

            // A. "General" Folder:
            if (selectedFolder === 'General') {
                // Exclude Clients
                if (clientMatch) return false;

                // Exclude Leads w/ specific statuses (New, Contacted) as per request
                if (leadMatch) {
                    if (leadMatch.status === 'New') return false;
                    if (leadMatch.status === 'Contacted') return false;
                }

                return true;
            }

            // B. "Clients" Folder:
            if (selectedFolder === 'Clients') {
                return !!clientMatch;
            }

            // C. "Leads" Parent Folder (Optional view for all leads)
            if (selectedFolder === 'Leads_All') {
                return !!leadMatch;
            }

            // D. "Starred" Folder
            if (selectedFolder === 'Starred') {
                return email.isStarred;
            }

            // E. Lead Status Sub-Folders (e.g. "New", "Interested")
            if (statuses.includes(selectedFolder)) {
                return leadMatch && leadMatch.status === selectedFolder;
            }

            return false;
        });
    }, [emails, search, selectedFolder, leads, clients, statuses, selectedAccountId, currentAccount]);

    const selectedEmail = useMemo(() =>
        emails.find(e => e.id === selectedEmailId),
        [emails, selectedEmailId]);

    // --- Helper to get sender details ---
    const getSenderDetails = (email: EmailMessage) => {
        const lead = leads.find(l => l.email.toLowerCase() === email.from.toLowerCase());
        const client = clients.find(c => c.email.toLowerCase() === email.from.toLowerCase());

        if (client) return { type: 'Client', badgeColor: 'bg-blue-100 text-blue-700', data: client, name: client.contactName };
        if (lead) return { type: 'Lead', badgeColor: 'bg-orange-100 text-orange-700', data: lead, status: lead.status, name: lead.name };
        return { type: 'General', badgeColor: 'bg-slate-100 text-slate-700', data: null, name: email.fromName };
    };

    // --- Reply Logic ---
    const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const tId = e.target.value;
        setSelectedTemplateId(tId);

        const template = templates.find(t => t.id === tId);
        if (template && selectedEmail) {
            const senderInfo = getSenderDetails(selectedEmail);
            const baseTokens = buildCompanyTokens(generalSettings);
            const tokenData = {
                ...baseTokens,
                lead_name: senderInfo.name || 'Guest',
                lead_first_name: (senderInfo.name || 'Guest').split(' ')[0],
                lead_email: selectedEmail.from || ''
            };

            // Replace variables
            let processedText = applyTemplateTokens(template.htmlContent, tokenData)
                .replace(/<[^>]+>/g, '\n'); // Strip HTML tags for textarea

            setReplyContent(prev => prev + (prev ? '\n\n' : '') + processedText.trim());
        }
    };

    const handleSendReply = () => {
        if (!selectedEmail || !replyContent) return;

        const senderInfo = getSenderDetails(selectedEmail);
        const baseTokens = buildCompanyTokens(generalSettings);
        const tokenData = {
            ...baseTokens,
            lead_name: senderInfo.name || 'Guest',
            lead_first_name: (senderInfo.name || 'Guest').split(' ')[0],
            lead_email: selectedEmail.from || ''
        };

        // 1. Send Email (SMTP)
        setIsSendingReply(true);
        setReplyError(null);
        const html = applyTemplateTokens(replyContent, tokenData).replace(/\n/g, '<br/>');
        const accountId = selectedAccountId !== 'all' ? selectedAccountId : undefined;
        const subject = applyTemplateTokens(`Re: ${selectedEmail.subject}`, tokenData);
        sendSingleEmail(selectedEmail.from, subject, html, [], accountId)
            .then(() => {
                // 2. Log to CRM if applicable
                if (senderInfo.type === 'Lead' && senderInfo.data) {
                    addNote(senderInfo.data.id, `Replied to email via Mailbox: \n"${replyContent.substring(0, 50)}..."`, 'Me');
                } else if (senderInfo.type === 'Client' && senderInfo.data) {
                    addClientNote(senderInfo.data.id, `Replied to email via Mailbox: \n"${replyContent.substring(0, 50)}..."`, 'Me');
                }

                // 3. Reset UI
                setReplyContent('');
                setIsReplying(false);
                alert('Reply sent successfully!');
            })
            .catch((e: any) => {
                setReplyError(e?.message || 'Failed to send reply');
            })
            .finally(() => setIsSendingReply(false));
    };

    // --- Components ---

    const SidebarItem = ({ icon: Icon, label, id, count, indent = false }: any) => (
        <button
            onClick={() => { setSelectedFolder(id); setSelectedEmailId(null); }}
            className={`w-full flex items-center justify-between px-4 py-2 text-sm font-medium rounded-r-full mr-4 transition-colors ${selectedFolder === id
                    ? 'bg-primary/20 text-darkGreen'
                    : 'text-textSecondary hover:bg-slate-100'
                } ${indent ? 'pl-10' : ''}`}
        >
            <div className="flex items-center gap-3">
                <Icon size={18} className={selectedFolder === id ? 'fill-current' : ''} />
                <span className="truncate">{label}</span>
            </div>
            {count > 0 && <span className="text-xs font-bold">{count}</span>}
        </button>
    );

    return (
        <div className="h-[calc(100vh-64px)] -m-8 flex bg-white overflow-hidden">

            {/* 1. FOLDER SIDEBAR */}
            <div className="w-64 bg-slate-50 border-r border-border flex flex-col shrink-0 py-4">

                {/* Account Switcher */}
                <div className="px-4 mb-4 relative" ref={accountMenuRef}>
                    <button
                        onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                        className="w-full flex items-center justify-between p-2 bg-white border border-border rounded-xl shadow-sm hover:border-primary transition-colors mb-4"
                    >
                        <div className="flex items-center gap-2 overflow-hidden">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0 ${currentAccount ? (currentAccount.provider === 'Namecheap' ? 'bg-orange-500' : 'bg-blue-600') : 'bg-slate-800'}`}>
                                {currentAccount ? currentAccount.provider.charAt(0) : 'A'}
                            </div>
                            <div className="text-left overflow-hidden">
                                <p className="text-xs font-bold text-textPrimary truncate">{currentAccount ? currentAccount.label : 'All Inboxes'}</p>
                                <p className="text-[10px] text-textMuted truncate">{currentAccount ? currentAccount.email : 'Unified View'}</p>
                            </div>
                        </div>
                        <ChevronDown size={14} className="text-textMuted" />
                    </button>

                    {/* Dropdown */}
                    {isAccountMenuOpen && (
                        <div className="absolute top-14 left-4 right-4 bg-white border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95">
                            <button
                                onClick={() => { setSelectedAccountId('all'); setIsAccountMenuOpen(false); }}
                                className="w-full flex items-center justify-between p-3 hover:bg-slate-50 text-left border-b border-border"
                            >
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center text-white text-[10px] font-bold">A</div>
                                    <span className="text-xs font-bold">All Inboxes</span>
                                </div>
                                {selectedAccountId === 'all' && <Check size={14} className="text-primary" />}
                            </button>

                            <div className="max-h-48 overflow-y-auto">
                                {emailAccounts.map(acc => (
                                    <button
                                        key={acc.id}
                                        onClick={() => { setSelectedAccountId(acc.id); setIsAccountMenuOpen(false); }}
                                        className="w-full flex items-center justify-between p-3 hover:bg-slate-50 text-left"
                                    >
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <div className={`w-6 h-6 rounded flex items-center justify-center text-white text-[10px] font-bold shrink-0 ${acc.provider === 'Namecheap' ? 'bg-orange-500' : 'bg-blue-600'}`}>
                                                {acc.provider.charAt(0)}
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="text-xs font-bold truncate">{acc.label}</p>
                                                <p className="text-[10px] text-textMuted truncate">{acc.email}</p>
                                            </div>
                                        </div>
                                        {selectedAccountId === acc.id && <Check size={14} className="text-primary" />}
                                    </button>
                                ))}
                            </div>

                            {emailAccounts.length === 0 && (
                                <div className="p-3 text-[10px] text-textMuted text-center bg-slate-50">
                                    No email accounts connected via Settings.
                                </div>
                            )}
                        </div>
                    )}

                    <button className="w-full py-3 bg-darkGreen text-white font-bold rounded-xl shadow-lg shadow-darkGreen/10 hover:bg-opacity-90 flex items-center justify-center gap-2 transition-all">
                        <div className="text-white"><Plus size={18} /></div> Compose
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-1 no-scrollbar">
                    <SidebarItem icon={Inbox} label="General / All" id="General" count={filteredEmails.length} />
                    <SidebarItem icon={Star} label="Starred" id="Starred" count={emails.filter(e => e.isStarred).length} />

                    <div className="pt-4 pb-2 px-4 text-xs font-bold text-textMuted uppercase flex items-center justify-between cursor-pointer hover:text-textPrimary" onClick={() => setExpandedLeads(!expandedLeads)}>
                        <span>Leads Folders</span>
                        {expandedLeads ? <ChevronDown size={14} /> : <ChevronRightIcon size={14} />}
                    </div>

                    {expandedLeads && (
                        <>
                            {statuses.map(status => {
                                // Calculate Count: Email sender must exist in Leads AND match this Status AND match current Account filter
                                const count = filteredEmails.filter(e => {
                                    const l = leads.find(lead => lead.email.toLowerCase() === e.from.toLowerCase());
                                    return l && l.status === status && !e.isRead;
                                }).length;

                                return (
                                    <SidebarItem
                                        key={status}
                                        icon={Tag}
                                        label={status}
                                        id={status}
                                        count={count}
                                        indent
                                    />
                                );
                            })}
                        </>
                    )}

                    <div className="pt-4 pb-2 px-4 text-xs font-bold text-textMuted uppercase">Relationships</div>
                    <SidebarItem icon={Briefcase} label="Clients" id="Clients" count={filteredEmails.filter(e => clients.some(c => c.email === e.from) && !e.isRead).length} />
                </div>
            </div>

            {/* 2. EMAIL LIST */}
            <div className={`flex flex-col border-r border-border w-80 xl:w-96 shrink-0 bg-white ${selectedEmailId ? 'hidden lg:flex' : 'flex w-full'}`}>
                <div className="h-16 border-b border-border flex items-center px-4 gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" size={16} />
                        <input
                            type="text"
                            placeholder="Search mail"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-100 border-transparent rounded-lg text-sm focus:bg-white focus:ring-1 focus:ring-primary outline-none transition-all"
                        />
                    </div>
                    <button onClick={async () => { await syncEmails(); fetchEmails(selectedAccountId); }} className="p-2 text-textMuted hover:bg-slate-100 rounded-full">
                        <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
                    </button>
                </div>

                {mailError && (
                    <div className="mx-4 mt-3 mb-2 text-xs text-danger bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                        {mailError}
                    </div>
                )}

                <div className="flex-1 overflow-y-auto no-scrollbar">
                    {filteredEmails.length === 0 ? (
                        <div className="p-8 text-center text-textMuted">
                            <Mail size={32} className="mx-auto mb-2 opacity-20" />
                            <p className="text-sm">No emails in "{selectedFolder}"</p>
                            {selectedAccountId !== 'all' && <p className="text-xs mt-1">for {currentAccount?.email}</p>}
                        </div>
                    ) : (
                        filteredEmails.map(email => {
                            const senderInfo = getSenderDetails(email);
                            return (
                                <div
                                    key={email.id}
                                    onClick={() => { setSelectedEmailId(email.id); markAsRead(email.id); }}
                                    className={`p-4 border-b border-border cursor-pointer hover:shadow-sm transition-all group relative ${selectedEmailId === email.id ? 'bg-softMint/30 border-l-4 border-l-primary' : (!email.isRead ? 'bg-white border-l-4 border-l-black' : 'bg-slate-50/50 border-l-4 border-l-transparent')}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className={`text-sm truncate pr-6 ${!email.isRead ? 'font-bold text-textPrimary' : 'font-medium text-textSecondary'}`}>
                                            {email.fromName || email.from}
                                        </h4>
                                        <span className={`text-[10px] whitespace-nowrap ${!email.isRead ? 'text-primary font-bold' : 'text-textMuted'}`}>
                                            {new Date(email.timestamp).toLocaleDateString()}
                                        </span>
                                    </div>

                                    <p className={`text-xs truncate mb-2 ${!email.isRead ? 'text-textPrimary font-semibold' : 'text-textSecondary'}`}>
                                        {email.subject}
                                    </p>
                                    <p className="text-xs text-textMuted line-clamp-2">
                                        {email.body.replace(/<[^>]+>/g, '')}
                                    </p>

                                    <div className="flex items-center gap-2 mt-3">
                                        {senderInfo.type !== 'General' && (
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${senderInfo.badgeColor}`}>
                                                {senderInfo.type === 'Lead' ? (senderInfo.status || 'Lead') : 'Client'}
                                            </span>
                                        )}
                                        {email.attachments && (
                                            <div className="flex items-center gap-1 text-[10px] text-textMuted border border-border px-1.5 py-0.5 rounded bg-white">
                                                <Paperclip size={10} /> {email.attachments.length}
                                            </div>
                                        )}
                                    </div>

                                    {/* Hover Actions */}
                                    <div className="absolute right-2 top-8 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1 bg-white/80 backdrop-blur-sm p-1 rounded shadow-sm">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); deleteEmail(email.id); }}
                                            className="p-1.5 hover:bg-red-50 text-textMuted hover:text-danger rounded"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); toggleStar(email.id); }}
                                            className={`p-1.5 hover:bg-yellow-50 rounded ${email.isStarred ? 'text-yellow-400' : 'text-textMuted hover:text-yellow-400'}`}
                                        >
                                            <Star size={14} fill={email.isStarred ? "currentColor" : "none"} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* 3. EMAIL CONTENT / READING PANE */}
            <div className={`flex-1 bg-white flex flex-col ${selectedEmailId ? 'flex' : 'hidden lg:flex'}`}>
                {selectedEmail ? (
                    <>
                        {/* Toolbar */}
                        <div className="h-16 border-b border-border flex items-center justify-between px-6 bg-white shrink-0">
                            <div className="flex items-center gap-3 text-textSecondary">
                                <button onClick={() => deleteEmail(selectedEmail.id)} className="p-2 hover:bg-slate-100 rounded-full" title="Delete">
                                    <Trash2 size={18} />
                                </button>
                                <button className="p-2 hover:bg-slate-100 rounded-full" title="Mark Unread">
                                    <Mail size={18} />
                                </button>
                                <div className="w-px h-6 bg-border mx-1"></div>
                                <button className="p-2 hover:bg-slate-100 rounded-full" title="Move to">
                                    <Folder size={18} />
                                </button>
                                <button className="p-2 hover:bg-slate-100 rounded-full" title="More">
                                    <MoreVertical size={18} />
                                </button>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-textMuted">1 of {filteredEmails.length}</span>
                                <button className="p-1 hover:bg-slate-100 rounded"><ChevronLeft size={18} /></button>
                                <button className="p-1 hover:bg-slate-100 rounded"><ChevronRight size={18} /></button>
                            </div>
                        </div>

                        {/* Email Body */}
                        <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
                            <div className="flex justify-between items-start mb-6">
                                <h2 className="text-xl font-bold text-textPrimary leading-tight">{selectedEmail.subject}</h2>
                                <div className="flex items-center gap-2">
                                    {getSenderDetails(selectedEmail).type === 'Lead' && (
                                        <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded">Lead: {getSenderDetails(selectedEmail).status}</span>
                                    )}
                                    {getSenderDetails(selectedEmail).type === 'Client' && (
                                        <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded">Active Client</span>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-start gap-4 mb-8">
                                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-lg font-bold text-textSecondary">
                                    {selectedEmail.fromName.charAt(0)}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-baseline">
                                        <h4 className="font-bold text-textPrimary">{selectedEmail.fromName} <span className="text-xs font-normal text-textMuted">&lt;{selectedEmail.from}&gt;</span></h4>
                                        <span className="text-xs text-textMuted">{new Date(selectedEmail.timestamp).toLocaleString()}</span>
                                    </div>
                                    <p className="text-xs text-textSecondary">to {selectedEmail.to || 'me'}</p>
                                </div>
                            </div>

                            <div
                                className="prose prose-sm max-w-none text-textPrimary"
                                dangerouslySetInnerHTML={{ __html: selectedEmail.body }}
                            />

                            {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                                <div className="mt-8 pt-4 border-t border-border">
                                    <h5 className="text-xs font-bold text-textSecondary mb-3">{selectedEmail.attachments.length} Attachments</h5>
                                    <div className="flex gap-3">
                                        {selectedEmail.attachments.map((att, idx) => (
                                            <div key={idx} className="group relative w-32 h-24 bg-slate-50 border border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100">
                                                <div className="bg-white p-2 rounded shadow-sm mb-1">
                                                    <Paperclip size={16} className="text-red-500" />
                                                </div>
                                                <span className="text-[10px] text-textSecondary font-medium truncate max-w-[80%]">{att.name}</span>
                                                <span className="text-[9px] text-textMuted">{att.size}</span>

                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                                    <div className="bg-white p-1.5 rounded-full">
                                                        <CornerUpLeft size={14} className="text-black" />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Reply Section */}
                            <div className="mt-10">
                                {!isReplying ? (
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setIsReplying(true)}
                                            className="flex items-center gap-2 px-6 py-2 border border-border rounded-full text-sm font-bold text-textSecondary hover:bg-slate-50 hover:shadow-sm transition-all"
                                        >
                                            <CornerUpLeft size={16} /> Reply
                                        </button>
                                        <button className="flex items-center gap-2 px-6 py-2 border border-border rounded-full text-sm font-bold text-textSecondary hover:bg-slate-50 hover:shadow-sm transition-all">
                                            <MoreHorizontal size={16} /> Forward
                                        </button>
                                    </div>
                                ) : (
                                    <div className="border border-border rounded-xl bg-slate-50 p-4 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                                        <div className="flex justify-between items-center mb-3">
                                            <div className="flex items-center gap-2">
                                                <CornerUpLeft size={16} className="text-textMuted" />
                                                <span className="text-sm font-bold text-textSecondary">Replying to {selectedEmail.fromName}</span>
                                            </div>

                                            {/* Template Selector */}
                                            <div className="flex items-center gap-2">
                                                <FileText size={14} className="text-primary" />
                                                <select
                                                    value={selectedTemplateId}
                                                    onChange={handleTemplateChange}
                                                    className="text-xs border border-border rounded p-1 bg-white outline-none focus:border-primary max-w-[200px]"
                                                >
                                                    <option value="">Insert Template...</option>
                                                    {templates.map(t => (
                                                        <option key={t.id} value={t.id}>{t.name}</option>
                                                    ))}
                                                </select>
                                                <button onClick={() => setIsReplying(false)} className="text-textMuted hover:text-danger ml-2">
                                                    <X size={18} />
                                                </button>
                                            </div>
                                        </div>

                                        <textarea
                                            value={replyContent}
                                            onChange={(e) => setReplyContent(e.target.value)}
                                            className="w-full p-4 border border-border rounded-lg bg-white text-sm focus:ring-2 focus:ring-primary outline-none min-h-[150px] font-sans"
                                            placeholder="Type your reply here..."
                                            autoFocus
                                        />

                                        {replyError && (
                                            <div className="mt-3 text-xs text-danger bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                                                {replyError}
                                            </div>
                                        )}

                                        <div className="flex justify-end gap-3 mt-3">
                                            <button
                                                onClick={() => setIsReplying(false)}
                                                className="px-4 py-2 text-textSecondary font-bold text-sm hover:bg-slate-200 rounded-lg"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleSendReply}
                                                disabled={!replyContent.trim() || isSendingReply}
                                                className="px-6 py-2 bg-darkGreen text-white font-bold text-sm rounded-lg hover:bg-opacity-90 disabled:opacity-50 flex items-center gap-2"
                                            >
                                                <Send size={16} /> {isSendingReply ? 'Sending...' : 'Send Reply'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 text-textMuted">
                        <div className="w-32 h-32 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                            <Mail size={64} className="opacity-20" />
                        </div>
                        <p className="text-lg font-medium">Select an email to read</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Mailbox;
