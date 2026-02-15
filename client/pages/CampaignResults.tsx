
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCampaignStore } from '../stores/campaignStore';
import { useSettingsStore } from '../stores/settingsStore';
import {
    ArrowLeft, CheckCircle2, XCircle, Clock,
    Mail, MousePointer2, AlertTriangle, RefreshCw, Loader2, Send, X
} from 'lucide-react';

const RECIPIENTS_PER_PAGE = 50;

const CampaignResults: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { campaigns, templates, fetchCampaigns, fetchTemplates, retargetUnopenedRecipients, retryFailedRecipients } = useCampaignStore();
    const { emailAccounts, fetchSettings } = useSettingsStore();
    const [campaign, setCampaign] = useState(campaigns.find(c => c.id === id));
    const [activeTab, setActiveTab] = useState<'overview' | 'recipients' | 'replied'>('overview');
    const [recipientPage, setRecipientPage] = useState(1);
    const [repliedPage, setRepliedPage] = useState(1);
    const [isRetargetOpen, setIsRetargetOpen] = useState(false);
    const [retargetTemplateId, setRetargetTemplateId] = useState('');
    const [retargetSenderIds, setRetargetSenderIds] = useState<string[]>([]);
    const [isRetargeting, setIsRetargeting] = useState(false);
    const [isRetryingFailed, setIsRetryingFailed] = useState(false);

    useEffect(() => {
        if (!campaign) fetchCampaigns();
        if (!templates.length) fetchTemplates();
        if (!emailAccounts.length) fetchSettings();
    }, [fetchCampaigns, fetchTemplates, fetchSettings, templates.length, campaign, emailAccounts.length]);

    useEffect(() => {
        setCampaign(campaigns.find(c => c.id === id));
    }, [campaigns, id]);

    useEffect(() => {
        setRecipientPage(1);
        setRepliedPage(1);
    }, [id, activeTab]);

    useEffect(() => {
        const validIds = new Set(emailAccounts.filter((acc) => acc.isVerified).map((acc) => acc.id));
        setRetargetSenderIds((prev) => prev.filter((senderId) => validIds.has(senderId)));
    }, [emailAccounts]);

    if (!campaign) {
        return (
            <div className="flex flex-col items-center justify-center h-96">
                <p className="text-textSecondary">Campaign not found.</p>
                <Link to="/campaigns/active" className="text-primary hover:underline mt-2">Back to Campaigns</Link>
            </div>
        );
    }

    const successRate = campaign.sentCount > 0
        ? Math.round((campaign.sentCount / (campaign.sentCount + campaign.failedCount)) * 100)
        : 0;

    const openRate = campaign.sentCount > 0
        ? Math.round((campaign.openCount / campaign.sentCount) * 100)
        : 0;

    const clickRate = campaign.openCount > 0
        ? Math.round((campaign.clickCount / campaign.openCount) * 100)
        : 0;

    const replyCount = campaign.replyCount || 0;
    const replyRate = campaign.sentCount > 0
        ? Math.round((replyCount / campaign.sentCount) * 100)
        : 0;

    const recipientTotal = campaign.queue.length;
    const recipientTotalPages = Math.max(1, Math.ceil(recipientTotal / RECIPIENTS_PER_PAGE));
    const currentRecipientPage = Math.min(recipientPage, recipientTotalPages);
    const recipientStartIndex = (currentRecipientPage - 1) * RECIPIENTS_PER_PAGE;
    const paginatedRecipients = campaign.queue.slice(
        recipientStartIndex,
        recipientStartIndex + RECIPIENTS_PER_PAGE
    );
    const recipientStart = recipientTotal === 0 ? 0 : recipientStartIndex + 1;
    const recipientEnd = recipientTotal === 0
        ? 0
        : Math.min(recipientStartIndex + RECIPIENTS_PER_PAGE, recipientTotal);

    const repliedItems = [...campaign.queue]
        .filter((item) => Boolean(item.repliedAt))
        .sort((a, b) => new Date(b.repliedAt || '').getTime() - new Date(a.repliedAt || '').getTime());
    const repliedTotal = repliedItems.length;
    const repliedTotalPages = Math.max(1, Math.ceil(repliedTotal / RECIPIENTS_PER_PAGE));
    const currentRepliedPage = Math.min(repliedPage, repliedTotalPages);
    const repliedStartIndex = (currentRepliedPage - 1) * RECIPIENTS_PER_PAGE;
    const paginatedReplied = repliedItems.slice(repliedStartIndex, repliedStartIndex + RECIPIENTS_PER_PAGE);
    const repliedStart = repliedTotal === 0 ? 0 : repliedStartIndex + 1;
    const repliedEnd = repliedTotal === 0 ? 0 : Math.min(repliedStartIndex + RECIPIENTS_PER_PAGE, repliedTotal);

    const goToRecipientPage = (nextPage: number) => {
        const clampedPage = Math.min(Math.max(nextPage, 1), recipientTotalPages);
        setRecipientPage(clampedPage);
    };

    const goToRepliedPage = (nextPage: number) => {
        const clampedPage = Math.min(Math.max(nextPage, 1), repliedTotalPages);
        setRepliedPage(clampedPage);
    };
    const unopenedSentCount = campaign.queue.filter((item) => item.status === 'Sent' && !item.openedAt).length;

    const handleRetargetUnopened = async () => {
        if (!id || !retargetTemplateId) return;
        setIsRetargeting(true);
        try {
            await retargetUnopenedRecipients(id, retargetTemplateId, retargetSenderIds);
            await fetchCampaigns();
            setIsRetargetOpen(false);
            setRetargetTemplateId('');
            setRetargetSenderIds([]);
            alert('Retarget campaign created and queued for unopened recipients.');
        } catch (err: any) {
            alert(err?.message || 'Failed to retarget unopened recipients.');
        } finally {
            setIsRetargeting(false);
        }
    };
    const availableSenderAccounts = emailAccounts.filter((acc) => acc.isVerified);

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link to="/campaigns/active" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                    <ArrowLeft size={20} className="text-textSecondary" />
                </Link>
                <div>
                    <h2 className="text-2xl font-bold text-textPrimary">{campaign.name}</h2>
                    <p className="text-sm text-textSecondary">
                        {campaign.status} &bull; {campaign.totalRecipients} Recipients
                        {campaign.completedAt && ` &bull; Completed ${new Date(campaign.completedAt).toLocaleDateString()}`}
                    </p>
                </div>
                <button
                    onClick={() => fetchCampaigns()}
                    className="ml-auto p-2 text-primary hover:bg-blue-50 rounded-lg transition-colors"
                    title="Refresh Data"
                >
                    <RefreshCw size={20} />
                </button>
                <button
                    onClick={async () => {
                        if (!id || campaign.failedCount <= 0 || isRetryingFailed) return;
                        setIsRetryingFailed(true);
                        try {
                            await retryFailedRecipients(id);
                            await fetchCampaigns();
                            alert('Retry started for failed recipients.');
                        } catch (err: any) {
                            alert(err?.message || 'Failed to retry failed recipients.');
                        } finally {
                            setIsRetryingFailed(false);
                        }
                    }}
                    disabled={campaign.failedCount <= 0 || isRetryingFailed}
                    className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    title={campaign.failedCount <= 0 ? 'No failed recipients' : 'Retry failed recipients'}
                >
                    {isRetryingFailed ? <Loader2 size={20} className="animate-spin" /> : <RefreshCw size={20} />}
                </button>
                <button
                    onClick={() => {
                        setRetargetSenderIds(
                            (campaign.senderAccountIds && campaign.senderAccountIds.length > 0)
                                ? campaign.senderAccountIds
                                : (campaign.senderAccountId ? [campaign.senderAccountId] : [])
                        );
                        setIsRetargetOpen(true);
                    }}
                    disabled={unopenedSentCount === 0}
                    className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    title={unopenedSentCount === 0 ? 'No unopened recipients' : 'Retarget unopened recipients'}
                >
                    <Send size={20} />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-6 border-b border-border">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`pb-3 text-sm font-bold transition-colors border-b-2 ${activeTab === 'overview' ? 'border-primary text-primary' : 'border-transparent text-textSecondary hover:text-textPrimary'}`}
                >
                    Overview
                </button>
                <button
                    onClick={() => setActiveTab('recipients')}
                    className={`pb-3 text-sm font-bold transition-colors border-b-2 ${activeTab === 'recipients' ? 'border-primary text-primary' : 'border-transparent text-textSecondary hover:text-textPrimary'}`}
                >
                    Recipients ({campaign.queue.length})
                </button>
                <button
                    onClick={() => setActiveTab('replied')}
                    className={`pb-3 text-sm font-bold transition-colors border-b-2 ${activeTab === 'replied' ? 'border-primary text-primary' : 'border-transparent text-textSecondary hover:text-textPrimary'}`}
                >
                    Replied ({replyCount})
                </button>
            </div>

            {/* Content */}
            {activeTab === 'overview' && (
                <div className="space-y-6 animate-in slide-in-from-left duration-300">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div className="p-4 bg-white border border-border rounded-xl">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-green-50 text-green-600 rounded-lg"><CheckCircle2 size={20} /></div>
                                <span className="text-sm font-bold text-textSecondary">Delivered</span>
                            </div>
                            <p className="text-2xl font-bold text-textPrimary">{campaign.sentCount}</p>
                            <p className="text-xs text-textSecondary">{successRate}% Success Rate</p>
                        </div>

                        <div className="p-4 bg-white border border-border rounded-xl">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Mail size={20} /></div>
                                <span className="text-sm font-bold text-textSecondary">Opened</span>
                            </div>
                            <p className="text-2xl font-bold text-textPrimary">{campaign.openCount}</p>
                            <p className="text-xs text-textSecondary">{openRate}% Open Rate</p>
                        </div>

                        <div className="p-4 bg-white border border-border rounded-xl">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><MousePointer2 size={20} /></div>
                                <span className="text-sm font-bold text-textSecondary">Clicked</span>
                            </div>
                            <p className="text-2xl font-bold text-textPrimary">{campaign.clickCount}</p>
                            <p className="text-xs text-textSecondary">{clickRate}% Click Rate</p>
                        </div>

                        <div className="p-4 bg-white border border-border rounded-xl">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-red-50 text-red-600 rounded-lg"><AlertTriangle size={20} /></div>
                                <span className="text-sm font-bold text-textSecondary">Failed</span>
                            </div>
                            <p className="text-2xl font-bold text-textPrimary">{campaign.failedCount}</p>
                            <p className="text-xs text-textSecondary">Bounce / Error</p>
                        </div>

                        <div className="p-4 bg-white border border-border rounded-xl">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Mail size={20} /></div>
                                <span className="text-sm font-bold text-textSecondary">Replied</span>
                            </div>
                            <p className="text-2xl font-bold text-textPrimary">{replyCount}</p>
                            <p className="text-xs text-textSecondary">{replyRate}% Reply Rate</p>
                        </div>
                    </div>

                    <div className="p-6 bg-slate-50 border border-border rounded-xl">
                        <h3 className="font-bold text-lg text-textPrimary mb-4">Campaign Details</h3>
                        <div className="grid grid-cols-2 gap-y-4 text-sm">
                            <div>
                                <span className="block text-textSecondary font-bold text-xs uppercase">Internal ID</span>
                                <span className="font-mono text-textPrimary">{campaign.id}</span>
                            </div>
                            <div>
                                <span className="block text-textSecondary font-bold text-xs uppercase">Template</span>
                                <span className="text-textPrimary">{campaign.templateName}</span>
                            </div>
                            <div>
                                <span className="block text-textSecondary font-bold text-xs uppercase">Created At</span>
                                <span className="text-textPrimary">{new Date(campaign.createdAt).toLocaleString()}</span>
                            </div>
                            <div>
                                <span className="block text-textSecondary font-bold text-xs uppercase">Target Audience</span>
                                <span className="text-textPrimary">Status: {campaign.targetStatus}, Agent: {campaign.targetAgentId}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'recipients' && (
                <div className="bg-white border border-border rounded-xl overflow-hidden animate-in slide-in-from-right duration-300">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-border">
                            <tr>
                                <th className="px-4 py-3 font-semibold text-textSecondary">Recipient</th>
                                <th className="px-4 py-3 font-semibold text-textSecondary">Status</th>
                                <th className="px-4 py-3 font-semibold text-textSecondary">Sent At</th>
                                <th className="px-4 py-3 font-semibold text-textSecondary">Opened</th>
                                <th className="px-4 py-3 font-semibold text-textSecondary">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {paginatedRecipients.map((item, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                    <td className="px-4 py-3">
                                        <p className="font-bold text-textPrimary">{item.leadName}</p>
                                        <p className="text-xs text-textSecondary">{item.leadEmail}</p>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${item.status === 'Sent' ? 'bg-green-100 text-green-700' :
                                            item.status === 'Failed' ? 'bg-red-100 text-red-700' :
                                                item.status === 'Processing' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-slate-100 text-slate-600'
                                            }`}>
                                            {item.status === 'Sent' && <CheckCircle2 size={12} />}
                                            {item.status === 'Failed' && <XCircle size={12} />}
                                            {item.status === 'Processing' && <Loader2 size={12} className="animate-spin" />}
                                            {item.status === 'Pending' && <Clock size={12} />}
                                            {item.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-textSecondary">
                                        {item.sentAt ? new Date(item.sentAt).toLocaleString() : '-'}
                                    </td>
                                    <td className="px-4 py-3">
                                        {item.openedAt ? (
                                            <span className="text-green-600 font-bold text-xs">{new Date(item.openedAt).toLocaleString()}</span>
                                        ) : (
                                            <span className="text-textMuted text-xs">-</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {item.error ? (
                                            <span className="text-danger text-xs max-w-xs block truncate" title={item.error}>{item.error}</span>
                                        ) : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {campaign.queue.length > 0 && (
                        <div className="px-4 py-3 border-t border-border bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
                            <p className="text-xs text-textSecondary">
                                Showing {recipientStart} to {recipientEnd} of {recipientTotal} recipients
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => goToRecipientPage(currentRecipientPage - 1)}
                                    disabled={currentRecipientPage <= 1}
                                    className="px-3 py-1.5 text-xs font-bold rounded border border-border bg-white text-textSecondary hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Prev
                                </button>
                                <span className="text-xs font-bold text-textSecondary px-2">
                                    Page {currentRecipientPage} of {recipientTotalPages}
                                </span>
                                <button
                                    onClick={() => goToRecipientPage(currentRecipientPage + 1)}
                                    disabled={currentRecipientPage >= recipientTotalPages}
                                    className="px-3 py-1.5 text-xs font-bold rounded border border-border bg-white text-textSecondary hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                    {campaign.queue.length === 0 && (
                        <div className="p-8 text-center text-textMuted text-sm">No recipients in queue.</div>
                    )}
                </div>
            )}

            {activeTab === 'replied' && (
                <div className="bg-white border border-border rounded-xl overflow-hidden animate-in slide-in-from-right duration-300">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-border">
                            <tr>
                                <th className="px-4 py-3 font-semibold text-textSecondary">Recipient</th>
                                <th className="px-4 py-3 font-semibold text-textSecondary">Sent At</th>
                                <th className="px-4 py-3 font-semibold text-textSecondary">Replied At</th>
                                <th className="px-4 py-3 font-semibold text-textSecondary">From</th>
                                <th className="px-4 py-3 font-semibold text-textSecondary">Subject</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {paginatedReplied.map((item, idx) => (
                                <tr key={`${item.trackingId || item.leadEmail}-${idx}`} className="hover:bg-slate-50">
                                    <td className="px-4 py-3">
                                        <p className="font-bold text-textPrimary">{item.leadName}</p>
                                        <p className="text-xs text-textSecondary">{item.leadEmail}</p>
                                    </td>
                                    <td className="px-4 py-3 text-textSecondary">
                                        {item.sentAt ? new Date(item.sentAt).toLocaleString() : '-'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-purple-600 font-bold text-xs">
                                            {item.repliedAt ? new Date(item.repliedAt).toLocaleString() : '-'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-textSecondary text-xs">
                                        {item.replyFrom || item.leadEmail || '-'}
                                    </td>
                                    <td className="px-4 py-3 text-textSecondary text-xs max-w-md">
                                        {item.replyMessageId ? (
                                            <Link
                                                to={`/mailbox?messageId=${encodeURIComponent(item.replyMessageId)}&from=${encodeURIComponent(item.replyFrom || '')}&subject=${encodeURIComponent(item.replySubject || '')}`}
                                                className="block truncate text-primary hover:underline font-semibold"
                                                title="Open in Mailbox"
                                            >
                                                {item.replySubject || '(No Subject)'}
                                            </Link>
                                        ) : (
                                            <span className="block truncate" title={item.replySubject || ''}>
                                                {item.replySubject || '-'}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {repliedTotal > 0 && (
                        <div className="px-4 py-3 border-t border-border bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
                            <p className="text-xs text-textSecondary">
                                Showing {repliedStart} to {repliedEnd} of {repliedTotal} replies
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => goToRepliedPage(currentRepliedPage - 1)}
                                    disabled={currentRepliedPage <= 1}
                                    className="px-3 py-1.5 text-xs font-bold rounded border border-border bg-white text-textSecondary hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Prev
                                </button>
                                <span className="text-xs font-bold text-textSecondary px-2">
                                    Page {currentRepliedPage} of {repliedTotalPages}
                                </span>
                                <button
                                    onClick={() => goToRepliedPage(currentRepliedPage + 1)}
                                    disabled={currentRepliedPage >= repliedTotalPages}
                                    className="px-3 py-1.5 text-xs font-bold rounded border border-border bg-white text-textSecondary hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                    {repliedTotal === 0 && (
                        <div className="p-8 text-center text-textMuted text-sm">No replies tracked for this campaign yet.</div>
                    )}
                </div>
            )}

            {isRetargetOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl border border-border">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-textPrimary">Retarget Unopened</h3>
                            <button
                                onClick={() => {
                                    if (isRetargeting) return;
                                    setIsRetargetOpen(false);
                                }}
                                className="p-2 rounded-lg hover:bg-slate-100 text-textMuted"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <p className="text-sm text-textSecondary mb-3">
                            {unopenedSentCount} recipients have not opened this email yet.
                        </p>
                        <label className="block text-xs font-bold text-textSecondary mb-1">Choose Template</label>
                        <select
                            value={retargetTemplateId}
                            onChange={(e) => setRetargetTemplateId(e.target.value)}
                            className="w-full px-3 py-2 border border-border rounded-lg bg-white text-sm"
                        >
                            <option value="">-- Select Template --</option>
                            {templates.map((t) => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                        <label className="block text-xs font-bold text-textSecondary mt-4 mb-2">Choose Sender Email(s)</label>
                        <div className="max-h-36 overflow-y-auto border border-border rounded-lg p-2 space-y-2 bg-slate-50">
                            {availableSenderAccounts.length === 0 && (
                                <p className="text-xs text-textMuted">No verified sender email available.</p>
                            )}
                            {availableSenderAccounts.map((acc) => {
                                const checked = retargetSenderIds.includes(acc.id);
                                return (
                                    <label key={acc.id} className="flex items-center gap-2 text-sm text-textPrimary">
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={(e) => {
                                                if (e.target.checked) setRetargetSenderIds((prev) => [...prev, acc.id]);
                                                else setRetargetSenderIds((prev) => prev.filter((id) => id !== acc.id));
                                            }}
                                            className="w-4 h-4 text-primary rounded"
                                        />
                                        <span>{acc.label ? `${acc.label} (${acc.email})` : acc.email}</span>
                                    </label>
                                );
                            })}
                        </div>
                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                onClick={() => setIsRetargetOpen(false)}
                                disabled={isRetargeting}
                                className="px-4 py-2 text-textSecondary hover:bg-slate-100 rounded-lg text-sm font-bold"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRetargetUnopened}
                                disabled={!retargetTemplateId || isRetargeting || unopenedSentCount === 0 || retargetSenderIds.length === 0}
                                className="px-4 py-2 bg-darkGreen text-white rounded-lg text-sm font-bold hover:bg-opacity-90 disabled:opacity-50"
                            >
                                {isRetargeting ? 'Sending...' : 'Send'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CampaignResults;
