
import React from 'react';
import { useCampaignStore } from '../../stores/campaignStore';
import { Link } from 'react-router-dom';
import { usePermissions } from '../../hooks/usePermissions';
import {
    Play, Pause, Trash2, Clock, Copy, Users, Rocket, Zap, Eye, RefreshCw
} from 'lucide-react';

const ActiveCampaignsList: React.FC = () => {
    const { campaigns, toggleCampaignStatus, deleteCampaign, cloneCampaign, startCampaignNow, retryFailedRecipients } = useCampaignStore();
    const { can } = usePermissions();
    const canManageCampaigns = can('manage', 'campaigns');

    // Filter active statuses
    const activeCampaigns = campaigns.filter(c =>
        ['Draft', 'Queued', 'Scheduled', 'Sending', 'Paused'].includes(c.status)
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Draft': return 'bg-slate-100 text-slate-600';
            case 'Queued': return 'bg-yellow-100 text-yellow-700';
            case 'Scheduled': return 'bg-purple-100 text-purple-700';
            case 'Sending': return 'bg-blue-100 text-blue-700';
            case 'Paused': return 'bg-orange-100 text-orange-700';
            default: return 'bg-slate-100';
        }
    };

    if (activeCampaigns.length === 0) {
        return (
            <div className="p-12 text-center border-2 border-dashed border-border rounded-2xl bg-slate-50">
                <Rocket size={48} className="mx-auto mb-4 opacity-20" />
                <p className="text-textSecondary font-medium">No active campaigns.</p>
                <p className="text-sm text-textMuted">Schedule or launch a new campaign to see it here.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {activeCampaigns.map(camp => {
                const percent = camp.totalRecipients > 0
                    ? Math.round(((camp.sentCount + camp.failedCount) / camp.totalRecipients) * 100)
                    : 0;
                const senderLabel = Array.isArray(camp.senderAccountEmails) && camp.senderAccountEmails.length > 0
                    ? camp.senderAccountEmails.length <= 2
                        ? camp.senderAccountEmails.join(', ')
                        : `${camp.senderAccountEmails.length} senders`
                    : (camp.senderAccountEmail || 'Auto');

                return (
                    <div key={camp.id} className="bg-white p-6 rounded-2xl border border-border shadow-sm hover:shadow-md transition-all">
                        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4">
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <h4 className="text-lg font-bold text-textPrimary">{camp.name}</h4>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getStatusColor(camp.status)}`}>
                                        {camp.status}
                                    </span>
                                </div>
                                <p className="text-sm text-textSecondary flex items-center gap-2 flex-wrap">
                                    <span className="font-medium text-textPrimary">{camp.templateName}</span>
                                    <span className="text-textMuted">•</span>
                                    <span>From: {senderLabel}</span>
                                    <span className="text-textMuted">•</span>
                                    <span>Target: {camp.targetStatus === 'All' && camp.targetServiceStatus === 'All' ? 'All Leads' : `Custom Filter`}</span>
                                    <span className="text-textMuted">•</span>
                                    <span className="text-xs text-textMuted">Created: {new Date(camp.createdAt).toLocaleDateString()}</span>
                                </p>
                                {camp.status === 'Scheduled' && camp.scheduledAt && (
                                    <p className="text-xs font-bold text-purple-600 mt-1 flex items-center gap-1">
                                        <Clock size={12} /> Scheduled for {new Date(camp.scheduledAt).toLocaleString()}
                                    </p>
                                )}
                            </div>

                            <div className="flex items-center gap-3">
                                <Link
                                    to={`/campaigns/${camp.id}`}
                                    className="p-2 bg-slate-50 text-textSecondary rounded-lg hover:bg-slate-100 transition-colors border border-border"
                                    title="View Details"
                                >
                                    <Eye size={18} />
                                </Link>
                                {/* START NOW BUTTON FOR SCHEDULED */}
                                {camp.status === 'Scheduled' && (
                                    canManageCampaigns && (
                                    <button
                                        onClick={() => startCampaignNow(camp.id)}
                                        className="flex items-center gap-1 px-3 py-2 bg-purple-50 text-purple-700 font-bold rounded-lg border border-purple-200 hover:bg-purple-100 transition-colors"
                                        title="Skip schedule and start immediately"
                                    >
                                        <Zap size={16} /> Start Now
                                    </button>
                                    )
                                )}

                                {camp.status === 'Sending' && (
                                    canManageCampaigns && (
                                    <button
                                        onClick={() => toggleCampaignStatus(camp.id, 'pause')}
                                        className="p-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors border border-orange-200"
                                        title="Pause Campaign"
                                    >
                                        <Pause size={18} />
                                    </button>
                                    )
                                )}
                                {(camp.status === 'Paused' || camp.status === 'Queued' || camp.status === 'Scheduled') && (
                                    canManageCampaigns && (
                                    <button
                                        onClick={() => toggleCampaignStatus(camp.id, 'resume')}
                                        className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200"
                                        title={camp.status === 'Scheduled' ? "Resume/Unpause" : "Resume Campaign"}
                                    >
                                        <Play size={18} />
                                    </button>
                                    )
                                )}
                                {canManageCampaigns && camp.failedCount > 0 && (
                                    <button
                                        onClick={() => retryFailedRecipients(camp.id)}
                                        className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors border border-amber-200"
                                        title="Retry failed recipients"
                                    >
                                        <RefreshCw size={18} />
                                    </button>
                                )}
                                {canManageCampaigns && (
                                    <button
                                        onClick={() => cloneCampaign(camp.id)}
                                        className="p-2 bg-slate-50 text-textSecondary rounded-lg hover:bg-slate-100 transition-colors border border-border"
                                        title="Clone Campaign"
                                    >
                                        <Copy size={18} />
                                    </button>
                                )}
                                {canManageCampaigns && (
                                    <button
                                        onClick={() => {
                                            if (window.confirm(`Delete campaign "${camp.name}"? This action cannot be undone.`)) {
                                                deleteCampaign(camp.id);
                                            }
                                        }}
                                        className="p-2 bg-red-50 text-danger rounded-lg hover:bg-red-100 transition-colors border border-red-200"
                                        title="Delete"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="relative pt-2">
                            <div className="flex justify-between items-end mb-1 text-xs font-bold text-textSecondary">
                                <span className="flex items-center gap-1"><Users size={12} /> {camp.sentCount} / {camp.totalRecipients} Sent</span>
                                <span className="flex items-center gap-2">
                                    {camp.failedCount > 0 && <span className="text-danger">{camp.failedCount} Failed</span>}
                                    <span className="text-primary">{percent}%</span>
                                </span>
                            </div>
                            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                <div
                                    className={`h-full transition-all duration-500 ease-out relative ${camp.status === 'Paused' ? 'bg-warning striped-bg' : (camp.status === 'Scheduled' ? 'bg-purple-400' : 'bg-primary striped-bg animate-pulse')}`}
                                    style={{ width: `${percent}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default ActiveCampaignsList;
