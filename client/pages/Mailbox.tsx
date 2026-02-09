
import React, { useState, useMemo, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMailStore, EmailMessage } from '../stores/mailStore';
import { io } from 'socket.io-client';
import { useLeadsStore } from '../stores/leadsStore';
import { useClientsStore } from '../stores/clientsStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useCampaignStore } from '../stores/campaignStore'; // Import Campaign Store for Templates
import { applyTemplateTokens, buildCompanyTokens } from '../utils/templateTokens';
import { apiRequest, getAuthToken } from '../utils/api';
import {
    Inbox, Star, Send, Trash2, Search, MoreVertical,
    RefreshCw, ChevronLeft, ChevronRight, Paperclip,
    CornerUpLeft, MoreHorizontal, Tag, Briefcase,
    Folder, ChevronDown, ChevronRight as ChevronRightIcon,
    Mail, Plus, X, FileText, Check, User, Settings as SettingsIcon, Filter, ArrowLeft, ArrowRight
} from 'lucide-react';

const Mailbox: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { emails, markAsRead, toggleStar, deleteEmail, deleteForever, moveToFolder, updateLabels, fetchEmails, syncEmails, refreshing } = useMailStore();
    const { leads, statuses, addNote } = useLeadsStore();
    const { clients, addClientNote } = useClientsStore();
    const { emailAccounts, generalSettings } = useSettingsStore();
    const { templates } = useCampaignStore();
    const [sharedEmailAccounts, setSharedEmailAccounts] = useState<any[]>([]);
    const availableEmailAccounts = emailAccounts.length > 0 ? emailAccounts : sharedEmailAccounts;

    const [search, setSearch] = useState('');
    const [selectedFolder, setSelectedFolder] = useState<'General' | 'Sent' | 'Trash' | 'Clients' | string>('General');
    const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [filterFrom, setFilterFrom] = useState('');
    const [filterTo, setFilterTo] = useState('');
    const [filterUnreadOnly, setFilterUnreadOnly] = useState(false);
    const [filterHasAttachments, setFilterHasAttachments] = useState(false);
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(50);

    const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
    const [selectedEmailIds, setSelectedEmailIds] = useState<string[]>([]);
    const [lastClickedId, setLastClickedId] = useState<string | null>(null);
    const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    const [deleteProgress, setDeleteProgress] = useState(0);
    const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
    const accountMenuRef = useRef<HTMLDivElement>(null);

    // Compose State
    const [isComposeOpen, setIsComposeOpen] = useState(false);
    const [composeAccountId, setComposeAccountId] = useState('');
    const [composeTo, setComposeTo] = useState('');
    const [composeCcRecipients, setComposeCcRecipients] = useState<string[]>([]);
    const [composeCcInput, setComposeCcInput] = useState('');
    const [composeSubject, setComposeSubject] = useState('');
    const [composeMode, setComposeMode] = useState<'html' | 'text'>('html');
    const [composeBody, setComposeBody] = useState('');
    const [composeTemplateId, setComposeTemplateId] = useState('');
    const [composeAttachments, setComposeAttachments] = useState<File[]>([]);
    const [composeError, setComposeError] = useState<string | null>(null);
    const [isSendingCompose, setIsSendingCompose] = useState(false);

    // Reply State
    const [isReplying, setIsReplying] = useState(false);
    const [replyContent, setReplyContent] = useState('');
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [isSendingReply, setIsSendingReply] = useState(false);
    const [replyError, setReplyError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const getAccountKey = (account: any) =>
        String(account?.id || account?._id || account?.email || '').trim();

    const normalizeMessageId = (value: string | undefined | null) =>
        String(value || '').trim().replace(/^<|>$/g, '');

    const parseMessageIdList = (value: unknown): string[] => {
        if (!value) return [];
        const values = Array.isArray(value) ? value : [value];
        const output: string[] = [];
        const seen = new Set<string>();

        values.forEach((entry) => {
            const tokens = String(entry || '').match(/<[^>]+>|[^\s]+/g) || [];
            tokens.forEach((token) => {
                const normalized = normalizeMessageId(token);
                if (!normalized || seen.has(normalized)) return;
                seen.add(normalized);
                output.push(normalized);
            });
        });

        return output;
    };

    const normalizeSubject = (subject: string) =>
        String(subject || '')
            .replace(/^\s*((re|fwd)\s*:\s*)+/i, '')
            .trim()
            .toLowerCase();

    const getThreadKey = (message: EmailMessage) => {
        if (message.threadId) return String(message.threadId);

        const refs = parseMessageIdList((message as any).references);
        if (refs.length > 0) return refs[0];

        const replyTo = normalizeMessageId((message as any).inReplyTo);
        if (replyTo) return replyTo;

        const msgId = normalizeMessageId(message.messageId);
        if (msgId) return msgId;

        const fallback = normalizeSubject(message.subject);
        return fallback ? `subject:${fallback}` : '';
    };

    const buildReplyReferences = (message: EmailMessage) => {
        const refs = parseMessageIdList((message as any).references);
        const msgId = normalizeMessageId(message.messageId);
        if (msgId && !refs.includes(msgId)) refs.push(msgId);
        return refs;
    };

    const htmlToPlainText = (value: string) =>
        String(value || '')
            .replace(/<style[\s\S]*?<\/style>/gi, ' ')
            .replace(/<script[\s\S]*?<\/script>/gi, ' ')
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/gi, ' ')
            .replace(/&amp;/gi, '&')
            .replace(/&lt;/gi, '<')
            .replace(/&gt;/gi, '>')
            .replace(/&quot;/gi, '"')
            .replace(/&#39;/gi, "'")
            .replace(/\r/g, '')
            .replace(/[ \t]+\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .replace(/[ \t]{2,}/g, ' ')
            .trim();

    const toBodySnippet = (value: string) => {
        const plain = htmlToPlainText(value);
        return plain || '(No preview)';
    };

    const fileToBase64 = (file: File) =>
        new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = String(reader.result || '');
                const base64 = result.includes(',') ? result.split(',')[1] : result;
                resolve(base64);
            };
            reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });

    const normalizeEmailToken = (value: string) =>
        String(value || '').trim().replace(/[;,]+$/g, '');

    const addCcTokens = (raw: string) => {
        const parts = String(raw || '')
            .split(/[,\n;]+/g)
            .map(normalizeEmailToken)
            .filter(Boolean);
        if (parts.length === 0) return;

        setComposeCcRecipients((prev) => {
            const seen = new Set(prev.map((x) => x.toLowerCase()));
            const next = [...prev];
            parts.forEach((email) => {
                const key = email.toLowerCase();
                if (!seen.has(key)) {
                    seen.add(key);
                    next.push(email);
                }
            });
            return next;
        });
    };

    const removeCcRecipient = (email: string) => {
        setComposeCcRecipients((prev) => prev.filter((x) => x.toLowerCase() !== email.toLowerCase()));
    };
    const sanitizeEmailHtml = (value: string) => {
        const raw = String(value || '');
        const hasHtmlTag = /<\w+[\s\S]*?>/i.test(raw);
        const source = hasHtmlTag ? raw : raw.replace(/\n/g, '<br/>');

        return DOMPurify.sanitize(source, {
            FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'textarea', 'select'],
            FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus']
        });
    };

    // Reset pagination when folder/search changes
    useEffect(() => { setCurrentPage(1); setSelectedEmailIds([]); }, [selectedFolder, search, selectedAccountId, filterFrom, filterTo, filterUnreadOnly, filterHasAttachments, filterDateFrom, filterDateTo]);

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
        if (!isComposeOpen) return;
        if (composeAccountId) return;
        if (availableEmailAccounts.length === 0) return;
        setComposeAccountId(getAccountKey(availableEmailAccounts[0]));
    }, [isComposeOpen, composeAccountId, availableEmailAccounts]);

    useEffect(() => {
        let active = true;

        const loadSharedAccounts = async () => {
            try {
                const data = await apiRequest<any>('/api/v1/email/accounts');
                if (!active) return;
                setSharedEmailAccounts(Array.isArray(data?.emailAccounts) ? data.emailAccounts : []);
            } catch {
                if (active) setSharedEmailAccounts([]);
            }
        };

        loadSharedAccounts();
        return () => { active = false; };
    }, []);

    // REAL-TIME SOCKET SETUP (Gmail-like architecture)
    useEffect(() => {
        // Initial Fetch (One-time on mount/account change)
        const init = async () => {
            await fetchEmails(selectedAccountId);
        };
        init();

        // Connect Socket
        const token = getAuthToken();
        const socketUrl = (import.meta as any).env?.VITE_SOCKET_URL || window.location.origin;
        const socket = token
            ? io(socketUrl, { auth: { token }, transports: ['websocket'] })
            : null;
        if (!socket) return;

        socket.on('connect', () => {
            console.log('Connected to Mail Push Server');
        });

        socket.on('email:new', (msg) => {
            console.log('Received new email push:', msg);
            // Only add if it belongs to current view (or add to all and let filter handle it?)
            // For now, simpler to add.
            useMailStore.getState().addMessage(msg);
        });

        return () => {
            socket.disconnect();
        };
    }, [selectedAccountId, fetchEmails]);

    // Derived Labels (from Settings + existing emails)
    const availableLabels = useMemo(() => {
        const settingLabels = generalSettings?.availableLabels || [];
        const emailLabels = new Set(emails.flatMap(e => e.labels || []));
        return Array.from(new Set([...settingLabels, ...Array.from(emailLabels)])).sort();
    }, [emails, generalSettings]);

    useEffect(() => {
        const params = new URLSearchParams(location.search || '');
        const targetMessageId = normalizeMessageId(params.get('messageId'));
        const targetFrom = String(params.get('from') || '').trim().toLowerCase();
        const targetSubject = String(params.get('subject') || '').trim().toLowerCase();

        if (!targetMessageId && !targetFrom && !targetSubject) return;
        if (!Array.isArray(emails) || emails.length === 0) return;

        let matched = targetMessageId
            ? emails.find((e) => normalizeMessageId((e as any).messageId) === targetMessageId)
            : undefined;

        if (!matched && targetFrom && targetSubject) {
            matched = emails.find((e) =>
                String((e as any).from || '').toLowerCase() === targetFrom &&
                String((e as any).subject || '').trim().toLowerCase() === targetSubject
            );
        }

        if (!matched) return;

        setSelectedEmailId(matched.id);

        const folder = String((matched as any).folder || '').toUpperCase();
        if (folder === 'SENT') setSelectedFolder('Sent');
        else if (folder === 'TRASH' || folder === 'DELETED') setSelectedFolder('Trash');
        else if (String((matched as any).folder || '') === 'Clients') setSelectedFolder('Clients');
        else if (statuses.includes(String((matched as any).folder || ''))) setSelectedFolder(String((matched as any).folder || ''));
        else if (availableLabels.includes(String((matched as any).folder || ''))) setSelectedFolder(String((matched as any).folder || ''));
        else setSelectedFolder('General');

        if (!matched.isRead) {
            markAsRead(matched.id);
        }

        navigate('/mailbox', { replace: true });
    }, [location.search, emails, statuses, availableLabels, navigate, markAsRead]);

    // --- Account Switching Logic ---
    const currentAccount = useMemo(() =>
        availableEmailAccounts.find(acc => getAccountKey(acc) === selectedAccountId),
        [availableEmailAccounts, selectedAccountId]);

    // --- Filtering Logic ---
    const filteredEmails = useMemo(() => {
        let list = emails;

        // 0. Account Filter
        if (selectedAccountId !== 'all' && currentAccount) {
            const selectedId = getAccountKey(currentAccount).toLowerCase();
            const selectedEmail = String(currentAccount.email || '').toLowerCase();
            list = list.filter(e => {
                const msgAccountId = String((e as any).accountId || '').toLowerCase();
                const msgAccountEmail = String((e as any).accountEmail || '').toLowerCase();
                return msgAccountId === selectedId || msgAccountId === selectedEmail || msgAccountEmail === selectedEmail;
            });
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

        // 1b. Advanced Filters
        if (filterFrom) {
            const term = filterFrom.toLowerCase();
            list = list.filter(e =>
                (e.from && e.from.toLowerCase().includes(term)) ||
                (e.fromName && e.fromName.toLowerCase().includes(term))
            );
        }
        if (filterTo) {
            const term = filterTo.toLowerCase();
            list = list.filter(e =>
                (e.to && e.to.toLowerCase().includes(term))
            );
        }
        if (filterUnreadOnly) {
            list = list.filter(e => !e.isRead);
        }
        if (filterHasAttachments) {
            list = list.filter(e => Array.isArray(e.attachments) && e.attachments.length > 0);
        }
        if (filterDateFrom) {
            const fromDate = new Date(filterDateFrom);
            list = list.filter(e => new Date(e.timestamp) >= fromDate);
        }
        if (filterDateTo) {
            const toDate = new Date(filterDateTo);
            toDate.setHours(23, 59, 59, 999);
            list = list.filter(e => new Date(e.timestamp) <= toDate);
        }

        // 2. Folder Routing
        return list.filter(email => {
            if (email.folder === 'DELETED') return false;
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

    const isPageSelected = useMemo(() => {
        if (paginatedEmails.length === 0) return false;
        const pageIds = paginatedEmails.map(e => e.id);
        return pageIds.every(id => selectedEmailIds.includes(id));
    }, [paginatedEmails, selectedEmailIds]);

    const toggleSelect = (id: string, e?: React.MouseEvent) => {
        let newSelected = [...selectedEmailIds];

        if (e && (e.nativeEvent as any).shiftKey && lastClickedId) {
            const startIdx = paginatedEmails.findIndex(m => m.id === lastClickedId);
            const endIdx = paginatedEmails.findIndex(m => m.id === id);

            if (startIdx !== -1 && endIdx !== -1) {
                const start = Math.min(startIdx, endIdx);
                const end = Math.max(startIdx, endIdx);
                const rangeIds = paginatedEmails.slice(start, end + 1).map(m => m.id);

                rangeIds.forEach(rid => {
                    if (!newSelected.includes(rid)) newSelected.push(rid);
                });
                setSelectedEmailIds(newSelected);
                return;
            }
        }

        if (newSelected.includes(id)) {
            newSelected = newSelected.filter(x => x !== id);
        } else {
            newSelected.push(id);
        }

        setSelectedEmailIds(newSelected);
        setLastClickedId(id);
    };

    const toggleSelectPage = () => {
        const pageIds = paginatedEmails.map(e => e.id);
        if (pageIds.length === 0) return;
        setSelectedEmailIds(prev => {
            const allSelected = pageIds.every(id => prev.includes(id));
            if (allSelected) {
                return prev.filter(id => !pageIds.includes(id));
            }
            return [...new Set([...prev, ...pageIds])];
        });
    };

    const clearSelection = () => setSelectedEmailIds([]);

    const bulkMoveToTrash = async () => {
        if (selectedEmailIds.length === 0) return;
        for (const id of selectedEmailIds) {
            await deleteEmail(id);
        }
        clearSelection();
    };

    const bulkRestore = async () => {
        if (selectedEmailIds.length === 0) return;
        for (const id of selectedEmailIds) {
            await moveToFolder(id, 'INBOX');
        }
        clearSelection();
    };

    const openBulkDeleteForever = () => {
        if (selectedEmailIds.length === 0) return;
        setIsBulkDeleteModalOpen(true);
    };

    const confirmBulkDeleteForever = async () => {
        if (selectedEmailIds.length === 0) return;
        setIsBulkDeleting(true);
        setDeleteProgress(0);
        const total = selectedEmailIds.length;
        for (let i = 0; i < total; i += 1) {
            await deleteForever(selectedEmailIds[i]);
            const pct = Math.round(((i + 1) / total) * 100);
            setDeleteProgress(pct);
        }
        clearSelection();
        setIsBulkDeleting(false);
        setIsBulkDeleteModalOpen(false);
    };

    const cancelBulkDeleteForever = () => {
        setIsBulkDeleteModalOpen(false);
    };

    const selectedEmail = useMemo(() =>
        emails.find(e => e.id === selectedEmailId),
        [emails, selectedEmailId]);

    const threadEmails = useMemo(() => {
        if (!selectedEmail) return [];

        const selectedThreadKey = getThreadKey(selectedEmail);
        const selectedSubjectKey = normalizeSubject(selectedEmail.subject);

        const isVisibleInCurrentView = (message: EmailMessage) => {
            if (message.folder === 'DELETED') return false;
            if (selectedFolder !== 'Trash' && message.folder === 'TRASH') return false;
            if (selectedFolder === 'Trash') return message.folder === 'TRASH' || message.folder === 'DELETED';
            return true;
        };

        return emails
            .filter((message) => {
                if (!isVisibleInCurrentView(message)) return false;

                const messageThreadKey = getThreadKey(message);
                if (selectedThreadKey && messageThreadKey) {
                    return messageThreadKey === selectedThreadKey;
                }

                return normalizeSubject(message.subject) === selectedSubjectKey;
            })
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }, [emails, selectedEmail, selectedFolder]);

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

    const openCompose = () => {
        const defaultAccountId =
            selectedAccountId !== 'all'
                ? selectedAccountId
                : getAccountKey(availableEmailAccounts[0]);

        setComposeAccountId(defaultAccountId);
        setComposeTo('');
        setComposeCcRecipients([]);
        setComposeCcInput('');
        setComposeSubject('');
        setComposeMode('html');
        setComposeBody('');
        setComposeTemplateId('');
        setComposeAttachments([]);
        setComposeError(null);
        setIsComposeOpen(true);
    };

    const closeCompose = () => {
        if (isSendingCompose) return;
        setIsComposeOpen(false);
        setComposeError(null);
    };

    const handleComposeTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const templateId = e.target.value;
        setComposeTemplateId(templateId);
        if (!templateId) return;

        const template = templates.find((t) => t.id === templateId);
        if (!template) return;

        const baseTokens = buildCompanyTokens(generalSettings);
        const tokenData = {
            ...baseTokens,
            lead_name: 'Customer',
            lead_first_name: 'Customer',
            lead_email: '',
            client_name: 'Customer'
        };

        setComposeSubject(applyTemplateTokens(template.subject, tokenData));
        const processedHtml = applyTemplateTokens(template.htmlContent || '', tokenData);
        setComposeBody(composeMode === 'text' ? htmlToPlainText(processedHtml) : processedHtml);
    };

    const handleComposeFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        setComposeAttachments((prev) => [...prev, ...files]);
        e.target.value = '';
    };

    const handleRemoveComposeAttachment = (index: number) => {
        setComposeAttachments((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSendCompose = async () => {
        const to = composeTo.trim();
        const pendingCc = normalizeEmailToken(composeCcInput);
        if (pendingCc) addCcTokens(pendingCc);
        const ccValues = [...composeCcRecipients, ...(pendingCc ? [pendingCc] : [])]
            .map((x) => x.trim())
            .filter(Boolean);
        const ccUnique: string[] = [];
        const ccSeen = new Set<string>();
        ccValues.forEach((email) => {
            const key = email.toLowerCase();
            if (!ccSeen.has(key)) {
                ccSeen.add(key);
                ccUnique.push(email);
            }
        });
        const cc = ccUnique.join(', ');
        const subject = composeSubject.trim();
        const body = composeBody.trim();
        if (!to) {
            setComposeError('Recipient email is required.');
            return;
        }
        if (!subject) {
            setComposeError('Subject is required.');
            return;
        }
        if (!body && composeAttachments.length === 0) {
            setComposeError('Write a message or attach a file.');
            return;
        }
        if (availableEmailAccounts.length > 0 && !composeAccountId) {
            setComposeError('Select sender account.');
            return;
        }

        setIsSendingCompose(true);
        setComposeError(null);
        try {
            const attachments = await Promise.all(
                composeAttachments.map(async (file) => ({
                    filename: file.name,
                    contentBase64: await fileToBase64(file),
                    contentType: file.type || 'application/octet-stream'
                }))
            );

            const htmlBody = composeMode === 'html' ? composeBody : composeBody.replace(/\n/g, '<br/>');
            const textBody = composeMode === 'text' ? composeBody : htmlToPlainText(composeBody);
            const clientRequestId = `compose-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

            const response: any = await apiRequest('/api/v1/email/send', {
                method: 'POST',
                body: JSON.stringify({
                    to: composeTo,
                    ...(cc ? { cc } : {}),
                    subject: composeSubject,
                    html: htmlBody,
                    text: textBody,
                    ...(composeAccountId ? { accountId: composeAccountId } : {}),
                    clientRequestId,
                    attachments
                })
            });

            if (response?.id) {
                useMailStore.getState().addEmail(response);
            } else if (Array.isArray(response?.sent)) {
                response.sent.forEach((m: any) => {
                    if (m?.id) useMailStore.getState().addEmail(m);
                });
            }

            setIsComposeOpen(false);
            setSuccessMessage('Email sent successfully!');
            setTimeout(() => setSuccessMessage(null), 3000);

            if (selectedFolder === 'Sent') {
                await fetchEmails(selectedAccountId);
            }
        } catch (e: any) {
            setComposeError(e?.message || 'Failed to send email');
        } finally {
            setIsSendingCompose(false);
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
        const accountId = selectedAccountId !== 'all'
            ? selectedAccountId
            : String((selectedEmail as any).accountId || (selectedEmail as any).accountEmail || getAccountKey(availableEmailAccounts[0]) || '');
        const subject = applyTemplateTokens(`Re: ${selectedEmail.subject}`, tokenData);
        const inReplyTo = normalizeMessageId(selectedEmail.messageId);
        const references = buildReplyReferences(selectedEmail);
        const clientRequestId = `reply-${selectedEmail.id}-${Date.now()}`;

        apiRequest('/api/v1/email/send', {
            method: 'POST',
            body: JSON.stringify({
                to: selectedEmail.from,
                subject,
                html,
                ...(accountId ? { accountId } : {}),
                ...(inReplyTo ? { inReplyTo } : {}),
                ...(references.length > 0 ? { references } : {}),
                clientRequestId
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
                // Custom Success Popup
                setSuccessMessage('Reply sent successfully!');
                setTimeout(() => setSuccessMessage(null), 3000);
            })
            .catch((e: any) => {
                setReplyError(e?.message || 'Failed to send reply');
            })
            .finally(() => setIsSendingReply(false));
    };

    // --- Components ---

    const SidebarItem = ({ icon: Icon, label, id, count, indent = false, activeColor = 'bg-[#d3e3fd] text-[#001d35]', onDelete }: any) => (
        <div className="group relative">
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
                <div className="flex items-center gap-2">
                    {count > 0 && <span className={`text-xs ${selectedFolder === id ? 'font-bold' : 'font-medium'}`}>{count}</span>}
                    {onDelete && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(); }}
                            className="p-1 rounded hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Delete label"
                        >
                            <Trash2 size={14} />
                        </button>
                    )}
                </div>
            </button>
        </div>
    );

    return (
        <div className="h-[calc(100vh-64px)] -m-8 flex bg-white overflow-hidden">

            {/* 1. FOLDER SIDEBAR */}
            <div className="w-56 bg-white flex flex-col shrink-0 py-4 pr-2 group">

                <div className="px-3 mb-6">
                    {/* Account Switcher */}
                    <div className="mb-4 relative" ref={accountMenuRef}>
                        <button
                            onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                            className="w-full flex items-center justify-between px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                                    {currentAccount ? (currentAccount.username || currentAccount.email).charAt(0).toUpperCase() : 'A'}
                                </div>
                                <div className="flex flex-col items-start overflow-hidden">
                                    <span className="text-sm font-bold truncate max-w-[120px]">{currentAccount ? (currentAccount.username || currentAccount.email) : 'All Inboxes'}</span>
                                    <span className="text-xs text-gray-500 truncate max-w-[120px]">{currentAccount ? currentAccount.email : 'All Accounts'}</span>
                                </div>
                            </div>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isAccountMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isAccountMenuOpen && (
                            <div className="absolute top-full left-0 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                                <button
                                    onClick={() => { setSelectedAccountId('all'); setIsAccountMenuOpen(false); }}
                                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left ${selectedAccountId === 'all' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}
                                >
                                    <div className="w-8 h-8 rounded-full bg-slate-500 flex items-center justify-center text-white font-bold">A</div>
                                    <span className="font-medium">All Inboxes</span>
                                </button>
                                {availableEmailAccounts.map(acc => {
                                    const accountKey = getAccountKey(acc);
                                    return (
                                    <button
                                        key={accountKey || acc.email}
                                        onClick={() => { setSelectedAccountId(accountKey); setIsAccountMenuOpen(false); }}
                                        className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left ${selectedAccountId === accountKey ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}
                                    >
                                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                                            {(acc.username || acc.email).charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex flex-col overflow-hidden">
                                            <span className="font-medium truncate">{acc.username || acc.email}</span>
                                            <span className="text-xs text-gray-500 truncate">{acc.email}</span>
                                        </div>
                                    </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={openCompose}
                        className="flex items-center gap-3 px-6 py-4 bg-[#c2e7ff] text-[#001d35] font-semibold rounded-2xl hover:shadow-md transition-shadow"
                    >
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
                        <SidebarItem
                            key={label}
                            icon={Tag}
                            label={label}
                            id={label}
                            onDelete={() => {
                                if (!window.confirm(`Delete label "${label}"? This removes it from settings and all emails.`)) return;
                                const current = generalSettings.availableLabels || [];
                                useSettingsStore.getState().updateGeneralSettings({
                                    availableLabels: current.filter(l => l !== label)
                                });
                                emails
                                    .filter(e => (e.labels || []).includes(label))
                                    .forEach(e => updateLabels(e.id, (e.labels || []).filter(l => l !== label)));
                            }}
                        />
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
                            <div className="flex items-center gap-2 mr-3">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 border-gray-300 rounded focus:ring-0 cursor-pointer"
                                    checked={isPageSelected}
                                    onChange={toggleSelectPage}
                                    title="Select page"
                                />
                                {selectedEmailIds.length > 0 && (
                                    <button
                                        onClick={clearSelection}
                                        className="text-xs text-gray-500 hover:text-gray-700"
                                    >
                                        Clear ({selectedEmailIds.length})
                                    </button>
                                )}
                            </div>
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
                            {selectedEmailIds.length > 0 && (
                                <>
                                    {selectedFolder === 'Trash' ? (
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={bulkRestore}
                                                className="px-3 py-1.5 text-xs font-bold bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100"
                                                title="Restore selected"
                                            >
                                                Restore
                                            </button>
                                            <button
                                                onClick={openBulkDeleteForever}
                                                className="px-3 py-1.5 text-xs font-bold bg-red-50 text-red-700 rounded-lg hover:bg-red-100"
                                                title="Delete selected forever"
                                            >
                                                Delete Forever
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={bulkMoveToTrash}
                                            className="px-3 py-1.5 text-xs font-bold bg-red-50 text-red-700 rounded-lg hover:bg-red-100"
                                            title="Move selected to trash"
                                        >
                                            Delete
                                        </button>
                                    )}
                                </>
                            )}
                            {emails.length >= 500 && (
                                <>
                                    <button
                                        onClick={() => useMailStore.getState().loadMore(selectedAccountId, 500)}
                                        className="text-xs text-blue-600 hover:text-blue-800 underline mr-4"
                                        title="Load next 500 emails"
                                    >
                                        Load Older
                                    </button>
                                    <button
                                        onClick={() => {
                                            const skip = prompt("Enter email number to start from (e.g., 3500):", String(emails.length));
                                            if (skip && !isNaN(parseInt(skip))) {
                                                useMailStore.getState().loadMore(selectedAccountId, 500, parseInt(skip));
                                            }
                                        }}
                                        className="text-xs text-blue-600 hover:text-blue-800 underline mr-4"
                                        title="Jump to specific point in history"
                                    >
                                        Jump to...
                                    </button>
                                </>
                            )}

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

                            <button
                                onClick={async () => {
                                    if (selectedFolder !== 'Trash') {
                                        await syncEmails(100000, true, selectedAccountId);
                                    }
                                    // Preserve current limit (if user loaded more, keep it)
                                    // Force clear cache to ensure we see new db items
                                    localStorage.removeItem(`mailbox_cache_${selectedAccountId}`);

                                    const currentCount = useMailStore.getState().emails.length;
                                    fetchEmails(selectedAccountId, Math.max(500, currentCount));
                                }}
                                className="p-2 hover:bg-gray-100 rounded-full"
                                title="Refresh"
                            >
                                <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
                            </button>
                            <button
                                onClick={() => setIsFilterOpen(v => !v)}
                                className={`p-2 rounded-full ${isFilterOpen ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}
                                title="Filters"
                            >
                                <Filter size={20} />
                            </button>
                        </div>
                    </div>

                    {refreshing && (
                        <div className="h-1 w-full bg-slate-100">
                            <div className="h-full w-full bg-blue-500 animate-pulse" />
                        </div>
                    )}

                    {/* SEARCH FILTERS */}
                    {isFilterOpen && (
                        <div className="px-4 pb-3">
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                                <input
                                    type="text"
                                    placeholder="From"
                                    value={filterFrom}
                                    onChange={(e) => setFilterFrom(e.target.value)}
                                    className="px-3 py-2 border border-gray-200 rounded-lg text-xs"
                                />
                                <input
                                    type="text"
                                    placeholder="To"
                                    value={filterTo}
                                    onChange={(e) => setFilterTo(e.target.value)}
                                    className="px-3 py-2 border border-gray-200 rounded-lg text-xs"
                                />
                                <input
                                    type="date"
                                    value={filterDateFrom}
                                    onChange={(e) => setFilterDateFrom(e.target.value)}
                                    className="px-3 py-2 border border-gray-200 rounded-lg text-xs"
                                    title="From date"
                                />
                                <input
                                    type="date"
                                    value={filterDateTo}
                                    onChange={(e) => setFilterDateTo(e.target.value)}
                                    className="px-3 py-2 border border-gray-200 rounded-lg text-xs"
                                    title="To date"
                                />
                                <div className="flex items-center gap-2">
                                    <label className="flex items-center gap-2 text-xs text-gray-600">
                                        <input
                                            type="checkbox"
                                            checked={filterHasAttachments}
                                            onChange={(e) => setFilterHasAttachments(e.target.checked)}
                                        />
                                        Has attachment
                                    </label>
                                    <label className="flex items-center gap-2 text-xs text-gray-600">
                                        <input
                                            type="checkbox"
                                            checked={filterUnreadOnly}
                                            onChange={(e) => setFilterUnreadOnly(e.target.checked)}
                                        />
                                        Unread
                                    </label>
                                    <button
                                        onClick={() => {
                                            setFilterFrom('');
                                            setFilterTo('');
                                            setFilterDateFrom('');
                                            setFilterDateTo('');
                                            setFilterHasAttachments(false);
                                            setFilterUnreadOnly(false);
                                        }}
                                        className="ml-auto text-xs text-blue-600 hover:text-blue-700"
                                    >
                                        Reset
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto w-full">
                    {paginatedEmails.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                            <p className="text-lg">No messages in "{selectedFolder}"</p>
                            {selectedFolder === 'Trash' && (
                                <button
                                    onClick={() => {
                                        const trashIds = emails.filter(e => e.folder === 'TRASH').map(e => e.id);
                                        trashIds.forEach(id => deleteForever(id));
                                    }}
                                    className="mt-4 px-4 py-2 text-blue-600 font-medium hover:bg-blue-50 rounded"
                                >
                                    Empty Trash Now
                                </button>
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
                                            className={`group cursor-pointer hover:shadow-md hover:z-20 relative transition-all duration-200 ease-in-out border-b border-gray-100
                                                ${!email.isRead ? 'bg-white font-semibold text-gray-900' : 'bg-gray-50/50 text-gray-600'}
                                                ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}
                                            `}
                                        >
                                            {/* Checkbox & Star */}
                                            <td className="w-16 py-3 pl-4 pr-2 align-top border-b border-gray-100">
                                                <div className="flex items-center gap-5">
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 border-gray-300 rounded focus:ring-0 cursor-pointer"
                                                        checked={selectedEmailIds.includes(email.id)}
                                                        onChange={(e) => toggleSelect(email.id, e as unknown as React.MouseEvent)}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
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
                                                        {toBodySnippet(email.body)}
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
                                                    {selectedFolder === 'Trash' && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                moveToFolder(email.id, 'INBOX');
                                                            }}
                                                            className="p-2 hover:bg-gray-200 rounded-full text-gray-600"
                                                            title="Restore to Inbox"
                                                        >
                                                            <CornerUpLeft size={18} />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            selectedFolder === 'Trash' ? deleteForever(email.id) : deleteEmail(email.id);
                                                        }}
                                                        className="p-2 hover:bg-gray-200 rounded-full text-gray-600"
                                                        title={selectedFolder === 'Trash' ? "Delete Forever" : "Delete"}
                                                    >
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

            {
                isBulkDeleteModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                            <div className="flex items-center gap-3 mb-4 text-danger">
                                <div className="p-2 bg-red-100 rounded-full">
                                    <Trash2 size={24} />
                                </div>
                                <h3 className="font-bold text-lg text-textPrimary">Delete Forever?</h3>
                            </div>
                            <p className="text-sm text-textSecondary mb-6 leading-relaxed">
                                Permanently delete {selectedEmailIds.length} email(s) from Trash. This cannot be undone.
                            </p>
                            {isBulkDeleting && (
                                <div className="mb-5">
                                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-danger transition-all"
                                            style={{ width: `${deleteProgress}%` }}
                                        />
                                    </div>
                                    <div className="mt-2 text-xs text-textMuted">{deleteProgress}%</div>
                                </div>
                            )}
                            <div className="flex gap-3">
                                <button
                                    onClick={cancelBulkDeleteForever}
                                    disabled={isBulkDeleting}
                                    className="flex-1 py-2 border border-border rounded-xl font-bold text-textSecondary hover:bg-slate-50 transition-colors disabled:opacity-60"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmBulkDeleteForever}
                                    disabled={isBulkDeleting}
                                    className="flex-1 py-2 bg-danger text-white rounded-xl font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-100 disabled:opacity-60"
                                >
                                    {isBulkDeleting ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* 3. EMAIL CONTENT / READING PANE */}
            <div className={`flex-1 bg-white flex flex-col ${selectedEmailId ? 'flex' : 'hidden'}`}>
                {selectedEmail ? (
                    <>
                        {/* Toolbar */}
                        <div className="h-16 border-b border-border flex items-center justify-between px-6 bg-white shrink-0">
                            <div className="flex items-center gap-3 text-textSecondary">
                                <button
                                    onClick={() => selectedFolder === 'Trash' ? deleteForever(selectedEmail.id) : deleteEmail(selectedEmail.id)}
                                    className="p-2 hover:bg-slate-100 rounded-full"
                                    title="Delete"
                                >

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
                            {threadEmails.map((msg, index) => (
                                <div key={msg.id} className={`mb-6 ${index !== threadEmails.length - 1 ? 'border-b border-gray-100 pb-6' : ''}`}>
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
                                            <p className="text-xs text-textSecondary truncate">
                                                to {msg.to || 'me'}{(msg as any).cc ? ` | cc ${(msg as any).cc}` : ''}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="max-w-none text-textPrimary break-words">
                                        <div
                                            className="[&_img]:max-w-full [&_table]:max-w-full [&_table]:h-auto"
                                            dangerouslySetInnerHTML={{ __html: sanitizeEmailHtml(msg.body) }}
                                        />
                                    </div>
                                </div>
                            ))}

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
            {/* Compose Modal */}
            {isComposeOpen && (
                <div className="fixed inset-0 z-[9998] bg-black/40 flex items-center justify-center p-4">
                    <div className="w-full max-w-3xl max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col">
                        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-textPrimary">New Message</h3>
                            <button
                                onClick={closeCompose}
                                className="p-1 text-textMuted hover:text-danger"
                                disabled={isSendingCompose}
                                title="Close"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-5 space-y-3 overflow-y-auto no-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-textSecondary uppercase mb-1">From Account</label>
                                    <select
                                        value={composeAccountId}
                                        onChange={(e) => setComposeAccountId(e.target.value)}
                                        className="w-full px-3 py-2 bg-appBg border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary"
                                    >
                                        {availableEmailAccounts.length === 0 ? (
                                            <option value="">No account configured</option>
                                        ) : (
                                            availableEmailAccounts.map((acc) => (
                                                <option key={getAccountKey(acc) || acc.email} value={getAccountKey(acc)}>
                                                    {acc.username || acc.email} ({acc.email})
                                                </option>
                                            ))
                                        )}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-textSecondary uppercase mb-1">Content Type</label>
                                    <select
                                        value={composeMode}
                                        onChange={(e) => setComposeMode(e.target.value as 'html' | 'text')}
                                        className="w-full px-3 py-2 bg-appBg border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary"
                                    >
                                        <option value="html">HTML Email</option>
                                        <option value="text">Plain Text Email</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-textSecondary uppercase mb-1">To</label>
                                <input
                                    type="text"
                                    value={composeTo}
                                    onChange={(e) => setComposeTo(e.target.value)}
                                    placeholder="recipient@example.com or a,b,c@example.com"
                                    className="w-full px-3 py-2 bg-appBg border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-textSecondary uppercase mb-1">Cc (Optional)</label>
                                <div className="w-full px-2 py-2 bg-appBg border border-border rounded-lg min-h-[56px] max-h-[160px] overflow-y-auto focus-within:ring-2 focus-within:ring-primary flex flex-wrap gap-1.5 items-start">
                                    {composeCcRecipients.map((email) => (
                                        <span
                                            key={email}
                                            className="inline-flex items-center gap-1.5 bg-white border border-slate-300 rounded-full px-2.5 py-1 text-xs text-textPrimary"
                                        >
                                            <span className="w-5 h-5 rounded-full bg-orange-600 text-white text-[10px] font-bold flex items-center justify-center">
                                                {email.charAt(0).toLowerCase()}
                                            </span>
                                            <span>{email}</span>
                                            <button
                                                type="button"
                                                className="text-textMuted hover:text-danger"
                                                onClick={() => removeCcRecipient(email)}
                                                title="Remove"
                                            >
                                                <X size={14} />
                                            </button>
                                        </span>
                                    ))}
                                    <input
                                        type="text"
                                        value={composeCcInput}
                                        onChange={(e) => setComposeCcInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === 'Tab' || e.key === ',' || e.key === ';') {
                                                e.preventDefault();
                                                const token = normalizeEmailToken(composeCcInput);
                                                if (token) {
                                                    addCcTokens(token);
                                                    setComposeCcInput('');
                                                }
                                            }
                                        }}
                                        onBlur={() => {
                                            const token = normalizeEmailToken(composeCcInput);
                                            if (token) {
                                                addCcTokens(token);
                                                setComposeCcInput('');
                                            }
                                        }}
                                        onPaste={(e) => {
                                            const text = e.clipboardData.getData('text');
                                            if (/[,\n;]/.test(text)) {
                                                e.preventDefault();
                                                addCcTokens(text);
                                            }
                                        }}
                                        placeholder={composeCcRecipients.length ? 'Add another email...' : 'copy@example.com'}
                                        className="flex-1 min-w-[180px] px-2 py-1 bg-transparent outline-none text-xs"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-textSecondary uppercase mb-1">Subject</label>
                                    <input
                                        type="text"
                                        value={composeSubject}
                                        onChange={(e) => setComposeSubject(e.target.value)}
                                        placeholder="Email subject"
                                        className="w-full px-3 py-2 bg-appBg border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-textSecondary uppercase mb-1">Template (Optional)</label>
                                    <select
                                        value={composeTemplateId}
                                        onChange={handleComposeTemplateChange}
                                        className="w-full px-3 py-2 bg-appBg border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary"
                                    >
                                        <option value="">-- Select Template --</option>
                                        {templates.map((t) => (
                                            <option key={t.id} value={t.id}>
                                                {t.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-textSecondary uppercase mb-1">
                                    {composeMode === 'html' ? 'HTML Body' : 'Text Body'}
                                </label>
                                <textarea
                                    value={composeBody}
                                    onChange={(e) => setComposeBody(e.target.value)}
                                    placeholder={composeMode === 'html' ? '<h1>Hello</h1><p>Your message...</p>' : 'Write plain text message...'}
                                    className="w-full px-3 py-2 bg-appBg border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary min-h-[220px] font-mono text-sm"
                                />
                            </div>

                            <div className="border border-border rounded-lg p-3 bg-slate-50">
                                <div className="flex items-center justify-between">
                                    <div className="text-xs font-bold text-textSecondary uppercase">Attachments</div>
                                    <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-border rounded-lg text-xs font-bold text-textSecondary cursor-pointer hover:bg-slate-100">
                                        <Paperclip size={14} />
                                        Add Files
                                        <input
                                            type="file"
                                            multiple
                                            className="hidden"
                                            onChange={handleComposeFiles}
                                        />
                                    </label>
                                </div>
                                {composeAttachments.length > 0 && (
                                    <div className="mt-3 space-y-1">
                                        {composeAttachments.map((file, idx) => (
                                            <div key={`${file.name}-${idx}`} className="flex items-center justify-between text-sm bg-white border border-border rounded px-2 py-1">
                                                <span className="truncate pr-2">{file.name}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveComposeAttachment(idx)}
                                                    className="text-textMuted hover:text-danger"
                                                    title="Remove file"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {composeError && (
                                <div className="text-xs text-danger bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                                    {composeError}
                                </div>
                            )}
                        </div>

                        <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-2 bg-white shrink-0">
                            <button
                                onClick={closeCompose}
                                disabled={isSendingCompose}
                                className="px-4 py-2 text-textSecondary font-bold hover:bg-slate-100 rounded-lg disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSendCompose}
                                disabled={isSendingCompose}
                                className="px-5 py-2 bg-darkGreen text-white font-bold rounded-lg hover:bg-opacity-90 disabled:opacity-50 flex items-center gap-2"
                            >
                                <Send size={16} />
                                {isSendingCompose ? 'Sending...' : 'Send'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Toast */}
            {successMessage && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#0f172a] text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 z-[9999]">
                    <div className="bg-green-500 rounded-full p-1">
                        <Check size={14} className="text-white bg-transparent" strokeWidth={3} />
                    </div>
                    <span className="font-medium text-sm">{successMessage}</span>
                </div>
            )}
        </div >
    );
};

export default Mailbox;
