
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCampaignStore } from '../stores/campaignStore';
import {
    ArrowLeft, CheckCircle2, XCircle, Clock,
    Mail, MousePointer2, AlertTriangle, RefreshCw, Loader2
} from 'lucide-react';

const RECIPIENTS_PER_PAGE = 50;

const CampaignResults: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { campaigns, fetchCampaigns } = useCampaignStore();
    const [campaign, setCampaign] = useState(campaigns.find(c => c.id === id));
    const [activeTab, setActiveTab] = useState<'overview' | 'recipients'>('overview');
    const [recipientPage, setRecipientPage] = useState(1);

    useEffect(() => {
        if (!campaign) fetchCampaigns();
    }, [fetchCampaigns]);

    useEffect(() => {
        setCampaign(campaigns.find(c => c.id === id));
    }, [campaigns, id]);

    useEffect(() => {
        setRecipientPage(1);
    }, [id, activeTab]);

    if (!campaign) {
        return (
            <div className="flex flex-col items-center justify-center h-96">
                <p className="text-textSecondary">Campaign not found.</p>
                <Link to="/email/campaigns" className="text-primary hover:underline mt-2">Back to Campaigns</Link>
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

    const goToRecipientPage = (nextPage: number) => {
        const clampedPage = Math.min(Math.max(nextPage, 1), recipientTotalPages);
        setRecipientPage(clampedPage);
    };

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link to="/email/campaigns" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
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
            </div>

            {/* Content */}
            {activeTab === 'overview' && (
                <div className="space-y-6 animate-in slide-in-from-left duration-300">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
        </div>
    );
};

export default CampaignResults;
