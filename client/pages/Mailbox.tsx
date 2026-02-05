
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useMailStore, EmailMessage } from '../stores/mailStore';
import { useLeadsStore } from '../stores/leadsStore';
import { useClientsStore } from '../stores/clientsStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useCampaignStore } from '../stores/campaignStore'; // Import Campaign Store for Templates
import { applyTemplateTokens, buildCompanyTokens } from '../utils/templateTokens';
import { apiRequest } from '../utils/api';
import {
    Inbox, Star, Send, Trash2, Search, MoreVertical,
    RefreshCw, ChevronLeft, ChevronRight, Paperclip,
    CornerUpLeft, MoreHorizontal, Tag, Briefcase,
    Folder, ChevronDown, ChevronRight as ChevronRightIcon,
    Mail, Plus, X, FileText, Check, User, Settings as SettingsIcon, Filter, ArrowLeft, ArrowRight
} from 'lucide-react';

const Mailbox: React.FC = () => {
    const { emails, markAsRead, toggleStar, deleteEmail, deleteForever, moveToFolder, updateLabels, fetchEmails, syncEmails, refreshing } = useMailStore();
    const { leads, statuses, addNote } = useLeadsStore();
    const { clients, addClientNote } = useClientsStore();
    const { emailAccounts, generalSettings } = useSettingsStore();
    const { templates, sendSingleEmail } = useCampaignStore();

    const [search, setSearch] = useState('');
    const [selectedFolder, setSelectedFolder] = useState<'General' | 'Sent' | 'Trash' | 'Clients' | string>('General');
    const [selectedAccountId, setSelectedAccountId] = useState<string>('all');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(50);

    const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
    const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
    const accountMenuRef = useRef<HTMLDivElement>(null);

    // Reply State
    const [isReplying, setIsReplying] = useState(false);
    const [replyContent, setReplyContent] = useState('');
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [isSendingReply, setIsSendingReply] = useState(false);
    const [replyError, setReplyError] = useState<string | null>(null);

    // Reset pagination when folder/search changes
    useEffect(() => { setCurrentPage(1); }, [selectedFolder, search, selectedAccountId]);

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
        const id1 = setInterval(() => fetchEmails(selectedAccountId), 10000);
        const id2 = setInterval(() => syncEmails(), 5 * 60 * 1000);
        return () => { clearInterval(id1); clearInterval(id2); };
    }, [selectedAccountId, emailAccounts, fetchEmails, syncEmails]);

    // Derived Labels (from Settings + existing emails)
    const availableLabels = useMemo(() => {
        const settingLabels = generalSettings?.availableLabels || [];
        const emailLabels = new Set(emails.flatMap(e => e.labels || []));
        return Array.from(new Set([...settingLabels, ...Array.from(emailLabels)])).sort();
    }, [emails, generalSettings]);

    // --- Account Switching Logic ---
    const currentAccount = useMemo(() =>
        emailAccounts.find(acc => acc.id === selectedAccountId),
        [emailAccounts, selectedAccountId]);

    // --- Filtering Logic ---
    const filteredEmails = useMemo(() => {
        let list = emails;

        // 0. Account Filter
        if (selectedAccountId !== 'all' && currentAccount) {
            list = list.filter(e => e.to.toLowerCase() === currentAccount.email.toLowerCase());
        }

        // 1. Global Search
        if (search) {
            const term = search.toLowerCase();
            list = list.filter(e =>
                e.subject.toLowerCase().includes(term) ||
                e.fromName.toLowerCase().includes(term) ||
                e.body.toLowerCase().includes(term)
            );
        }

        // 2. Folder Routing
        return list.filter(email => {
            // Trash check first (unless we are IN Trash)
            const isTrash = email.folder === 'TRASH';
            if (selectedFolder === 'Trash') return isTrash;
            if (isTrash) return false; // Hide trash from other folders

            // Sent check
            const isSent = email.folder === 'SENT';
            if (selectedFolder === 'Sent') return isSent;
            if (isSent) return false; // Hide sent from Inbox? (Gmail shows conversations, but for now strict separation)

            // Identify Sender
            const leadMatch = leads.find(l => l.email.toLowerCase() === email.from.toLowerCase());
            const clientMatch = clients.find(c => c.email.toLowerCase() === email.from.toLowerCase());

            // A. General / Inbox
            if (selectedFolder === 'General') {
                if (clientMatch) return false; // Clients go to Clients folder
                if (leadMatch) { // Leads status routing
                    if (leadMatch.status === 'New') return false;
                    if (leadMatch.status === 'Contacted') return false;
                }
                // Also hide if it has a label? strict gmail style: Inbox shows everything unless archived. 
                // We'll keep our "Smart Routing" logic: If it matches a specific lead status folder, maybe hide from inbox?
                // For now, keep existing logic: 
                return true;
            }

            if (selectedFolder === 'Clients') return !!clientMatch;
            if (selectedFolder === 'Starred') return email.isStarred;

            // Labels match
            if (availableLabels.includes(selectedFolder)) {
                return (email.labels || []).includes(selectedFolder);
            }

            // Lead Status match
            if (statuses.includes(selectedFolder)) {
                return leadMatch && leadMatch.status === selectedFolder;
            }

            return false;
        });
    }, [emails, search, selectedFolder, leads, clients, statuses, selectedAccountId, currentAccount, availableLabels]);

    const paginatedEmails = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredEmails.slice(start, start + itemsPerPage);
    }, [filteredEmails, currentPage, itemsPerPage]);

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

        apiRequest('/api/v1/email/send', {
            method: 'POST',
            body: JSON.stringify({
                to: selectedEmail.from,
                subject,
                html,
                accountId
            })
        })
            .then((res: any) => {
                // Return value is the created message object
                if (res && res.id) {
                    useMailStore.getState().addEmail(res);
                }

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

    const SidebarItem = ({ icon: Icon, label, id, count, indent = false, activeColor = 'bg-[#d3e3fd] text-[#001d35]' }: any) => (
        <button
            onClick={() => { setSelectedFolder(id); setSelectedEmailId(null); }}
            className={`w-full flex items-center justify-between px-6 py-2 text-sm font-medium rounded-r-full mr-2 transition-colors ${selectedFolder === id
                ? activeColor + ' font-bold'
                : 'text-gray-700 hover:bg-gray-100'
                } ${indent ? 'pl-10' : ''}`}
        >
            <div className="flex items-center gap-4">
                <Icon size={18} className={selectedFolder === id ? 'fill-current' : ''} />
                <span className="truncate">{label}</span>
            </div>
            {count > 0 && <span className={`text-xs ${selectedFolder === id ? 'font-bold' : 'font-medium'}`}>{count}</span>}
        </button>
    );

    return (
        <div className="h-[calc(100vh-64px)] -m-8 flex bg-white overflow-hidden">

            {/* 1. FOLDER SIDEBAR */}
            <div className="w-56 bg-white flex flex-col shrink-0 py-4 pr-2 group">

                <div className="px-3 mb-6">
                    <button className="flex items-center gap-3 px-6 py-4 bg-[#c2e7ff] text-[#001d35] font-semibold rounded-2xl hover:shadow-md transition-shadow">
                        <Plus size={24} />
                        <span>Compose</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-0.5 no-scrollbar px-2">
                    <SidebarItem icon={Inbox} label="Inbox" id="General" count={filteredEmails.length} activeColor="bg-[#d3e3fd] text-[#001d35]" />
                    <SidebarItem icon={Star} label="Starred" id="Starred" count={emails.filter(e => e.isStarred).length} />
                    <SidebarItem icon={Send} label="Sent" id="Sent" />
                    <SidebarItem icon={Trash2} label="Trash" id="Trash" />

                    <div className="my-2 border-t border-gray-200 mx-2"></div>

                    {/* LABELS SECTION */}
                    <div className="px-4 py-2 flex items-center justify-between group/label">
                        <span className="text-sm font-medium text-gray-700">Labels</span>
                        <button
                            onClick={() => {
                                const newLabel = window.prompt("Enter new label name:");
                                // In a real app, calling updateSettings via store would be better
                                if (newLabel) {
                                    // settingsStore.updateGeneralSettings({ availableLabels: [...availableLabels, newLabel] })
                                    // For now, relies on it appearing if assigned. 
                                    // To make it persist as "Available" we need API. 
                                    // Mocked:
                                    const current = generalSettings.availableLabels || [];
                                    if (!current.includes(newLabel)) {
                                        useSettingsStore.getState().updateGeneralSettings({ availableLabels: [...current, newLabel] });
                                    }
                                }
                            }}
                            className="p-1 hover:bg-gray-200 rounded opacity-0 group-hover/label:opacity-100 transition-opacity">
                            <Plus size={14} />
                        </button>
                    </div>
                    {availableLabels.map(label => (
                        <SidebarItem key={label} icon={Tag} label={label} id={label} />
                    ))}

                    <div className="my-2 border-t border-gray-200 mx-2"></div>

                    <div className="px-4 py-2 text-sm font-medium text-gray-700">Leads</div>
                    {statuses.map(status => {
                        const count = filteredEmails.filter(e => {
                            const l = leads.find(lead => lead.email.toLowerCase() === e.from.toLowerCase());
                            return l && l.status === status && !e.isRead;
                        }).length;
                        return (
                            <SidebarItem
                                key={status}
                                icon={Briefcase}
                                label={status}
                                id={status}
                                count={count}
                                indent
                            />
                        );
                    })}

                    <div className="my-2 border-t border-gray-200 mx-2"></div>
                    <SidebarItem icon={Briefcase} label="Clients" id="Clients" count={filteredEmails.filter(e => clients.some(c => c.email === e.from) && !e.isRead).length} />
                </div>
            </div>

            {/* 2. EMAIL LIST */}
            <div className={`flex flex-col bg-white flex-1 min-w-0 ${selectedEmailId ? 'hidden' : 'flex'}`}>
                {/* Gmail-style Toolbar */}
                <div className="border-b border-gray-200 bg-white/95 backdrop-blur z-10 sticky top-0 flex flex-col">
                    <div className="h-14 flex items-center justify-between px-4">
                        <div className="flex items-center gap-2 flex-1 max-w-3xl">
                            <div className="relative w-full max-w-xl group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-600" size={20} />
                                <input
                                    type="text"
                                    placeholder="Search in mail"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-[#eaf1fb] border-transparent rounded-[24px] text-[16px] focus:bg-white focus:shadow-md focus:border-transparent outline-none transition-all placeholder-gray-600"
                                />
                                <button className="absolute right-3 top-1/2 -translate-y-1/2 bg-gray-200 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Filter size={16} />
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 text-gray-600">
                            {/* PAGINATION CONTROLS */}
                            <div className="flex items-center gap-2 mr-4 text-sm text-gray-500">
                                <span>{(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredEmails.length)} of {filteredEmails.length}</span>
                                <button
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    className="p-1 hover:bg-gray-100 rounded disabled:opacity-30">
                                    <ArrowLeft size={16} />
                                </button>
                                <button
                                    disabled={currentPage * itemsPerPage >= filteredEmails.length}
                                    onClick={() => setCurrentPage(p => p + 1)}
                                    className="p-1 hover:bg-gray-100 rounded disabled:opacity-30">
                                    <ArrowRight size={16} />
                                </button>
                            </div>

                            <button onClick={async () => { await syncEmails(); fetchEmails(selectedAccountId); }} className="p-2 hover:bg-gray-100 rounded-full" title="Refresh">
                                <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
                            </button>
                            <button className="p-2 hover:bg-gray-100 rounded-full">
                                <SettingsIcon size={20} />
                            </button>
                        </div>
                    </div>

                    {/* SEARCH CHIPS (Hardcoded for now as placeholders for Advanced Search UI) */}
                    <div className="flex gap-2 px-4 pb-2 overflow-x-auto no-scrollbar">
                        {['From', 'Any time', 'Has attachment', 'To', 'Is unread'].map(chip => (
                            <button key={chip} className="px-3 py-1 border border-gray-200 rounded-full text-xs font-medium text-gray-600 hover:bg-gray-50 whitespace-nowrap">
                                {chip}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto w-full">
                    {paginatedEmails.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                            <p className="text-lg">No messages in "{selectedFolder}"</p>
                            {selectedFolder === 'Trash' && (
                                <button className="mt-4 px-4 py-2 text-blue-600 font-medium hover:bg-blue-50 rounded">Empty Trash Now</button>
                            )}
                        </div>
                    ) : (
                        <table className="w-full table-fixed text-sm border-separate border-spacing-0">
                            <tbody>
                                {paginatedEmails.map(email => {
                                    const senderInfo = getSenderDetails(email);
                                    const isSelected = selectedEmailId === email.id;

                                    return (
                                        <tr
                                            key={email.id}
                                            onClick={() => { setSelectedEmailId(email.id); markAsRead(email.id); }}
                                            className={`group cursor-pointer hover:shadow-md hover:z-20 relative transition-all border-b border-gray-100
                                                ${!email.isRead ? 'bg-white font-semibold text-gray-900' : 'bg-gray-50/50 text-gray-600'}
                                                ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}
                                            `}
                                        >
                                            {/* Checkbox & Star */}
                                            <td className="w-12 py-3 pl-4 align-top border-b border-gray-100">
                                                <div className="flex items-center gap-3">
                                                    <input type="checkbox" className="w-4 h-4 border-gray-300 rounded focus:ring-0 cursor-pointer" onClick={(e) => e.stopPropagation()} />
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); toggleStar(email.id); }}
                                                        className="text-gray-400 hover:text-yellow-400 focus:outline-none"
                                                    >
                                                        <Star size={18} fill={email.isStarred ? "#fbbc04" : "none"} className={email.isStarred ? "text-yellow-400" : ""} />
                                                    </button>
                                                </div>
                                            </td>

                                            {/* Sender */}
                                            <td className={`w-48 py-3 px-2 truncate border-b border-gray-100 ${!email.isRead ? 'font-bold text-black' : ''}`}>
                                                {selectedFolder === 'Sent' ? `To: ${email.to}` : (email.fromName || email.from)}
                                            </td>

                                            {/* Subject - Snippet */}
                                            <td className="py-3 px-2 border-b border-gray-100">
                                                <div className="flex items-center gap-2 truncate">
                                                    {/* LABELS CHIPS */}
                                                    {(email.labels || []).map(label => (
                                                        <span key={label} className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-700 text-[10px] font-medium border border-gray-300">
                                                            {label}
                                                        </span>
                                                    ))}

                                                    {senderInfo.type !== 'General' && (
                                                        <span className={`px-2 py-0.5 rounded text-[11px] font-medium shrink-0 ${senderInfo.type === 'Lead' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>
                                                            {senderInfo.type === 'Lead' ? senderInfo.status : 'Client'}
                                                        </span>
                                                    )}
                                                    <span className={`${!email.isRead ? 'font-bold text-black' : ''} shrink-0`}>
                                                        {email.subject}
                                                    </span>
                                                    <span className="text-gray-400 mx-1">-</span>
                                                    <span className="text-gray-500 truncate font-normal">
                                                        {email.body.replace(/<[^>]+>/g, '')}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Date */}
                                            <td className={`w-32 py-3 pr-4 text-right text-xs border-b border-gray-100 ${!email.isRead ? 'font-bold text-black' : ''}`}>
                                                {(() => {
                                                    const date = new Date(email.timestamp);
                                                    const now = new Date();
                                                    const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                                                    return isToday
                                                        ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                                                        : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                                                })()}
                                            </td>

                                            {/* Hover Actions (Absolute Right) */}
                                            <td className="w-0 p-0 border-b border-gray-100 relative">
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur pl-2 shadow-sm rounded-l">
                                                    <button onClick={(e) => { e.stopPropagation(); deleteEmail(email.id); }} className="p-2 hover:bg-gray-200 rounded-full text-gray-600" title="Delete">
                                                        <Trash2 size={18} />
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); markAsRead(email.id); }} className="p-2 hover:bg-gray-200 rounded-full text-gray-600" title="Mark Unread">
                                                        <Mail size={18} />
                                                    </button>
                                                    {/* Assign Label Button Mock */}
                                                    <button onClick={(e) => {
                                                        e.stopPropagation();
                                                        const l = window.prompt("Assign label:", "Work");
                                                        if (l) updateLabels(email.id, [...email.labels, l]);
                                                    }} className="p-2 hover:bg-gray-200 rounded-full text-gray-600" title="Label">
                                                        <Tag size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* 3. EMAIL CONTENT / READING PANE */}
            <div className={`flex-1 bg-white flex flex-col ${selectedEmailId ? 'flex' : 'hidden'}`}>
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

                        <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
                            {/* Thread View */}
                            {(() => {
                                // 1. Thread Logic: Find related emails (Subject matching)
                                // Clean subject: remove Re:, Fwd:, [labels], etc.
                                const cleanSubject = (s: string) => s.replace(/^(Re|Fwd): /i, '').trim();
                                const currentSubject = cleanSubject(selectedEmail.subject);

                                const thread = emails
                                    .filter(e => cleanSubject(e.subject) === currentSubject)
                                    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

                                return thread.map((msg, index) => (
                                    <div key={msg.id} className={`mb-6 ${index !== thread.length - 1 ? 'border-b border-gray-100 pb-6' : ''}`}>
                                        <div className="flex justify-between items-start mb-4">
                                            <h2 className="text-xl font-bold text-textPrimary leading-tight mb-1">{msg.subject}</h2>
                                            <div className="flex items-center gap-2">
                                                {getSenderDetails(msg).type === 'Lead' && (
                                                    <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded">Lead: {getSenderDetails(msg).status}</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-4 mb-4">
                                            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-lg font-bold text-textSecondary shrink-0">
                                                {(msg.fromName || '?').charAt(0)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-baseline flex-wrap">
                                                    <h4 className="font-bold text-textPrimary mr-2">{msg.fromName} <span className="text-xs font-normal text-textMuted">&lt;{msg.from}&gt;</span></h4>
                                                    <span className="text-xs text-textMuted whitespace-nowrap">{new Date(msg.timestamp).toLocaleString()}</span>
                                                </div>
                                                <p className="text-xs text-textSecondary truncate">to {msg.to || 'me'}</p>
                                            </div>
                                        </div>

                                        <div
                                            className="prose prose-sm max-w-none text-textPrimary"
                                            dangerouslySetInnerHTML={{ __html: msg.body }}
                                        />
                                    </div>
                                ));
                            })()}

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
