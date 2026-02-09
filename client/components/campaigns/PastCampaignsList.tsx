
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCampaignStore } from '../../stores/campaignStore';
import { usePermissions } from '../../hooks/usePermissions';
import {
  CheckCircle2, Mail, Trash2, Copy, Eye, MousePointer2, Archive, X
} from 'lucide-react';

const PastCampaignsList: React.FC = () => {
  const { campaigns, deleteCampaign, cloneCampaign } = useCampaignStore();
  const { can } = usePermissions();
  const canManageCampaigns = can('manage', 'campaigns');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const pastCampaigns = campaigns.filter(c => c.status === 'Completed')
    .sort((a, b) => new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime());

  const selectedCampaign = useMemo(() => pastCampaigns.find(c => c.id === selectedId) || null, [pastCampaigns, selectedId]);

  if (pastCampaigns.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-50 rounded-2xl border border-border">
        <Archive size={32} className="mx-auto mb-2 opacity-20" />
        <p className="text-sm text-textMuted">No campaign history available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {pastCampaigns.map(camp => {
        const openRate = camp.sentCount > 0 ? Math.round((camp.openCount / camp.sentCount) * 100) : 0;
        const clickRate = camp.sentCount > 0 ? Math.round((camp.clickCount / camp.sentCount) * 100) : 0;

        return (
          <div key={camp.id} className="bg-white p-4 rounded-xl border border-border hover:border-primary/30 transition-all flex flex-col sm:flex-row justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 size={16} className="text-success" />
                <h4 className="font-bold text-textPrimary">{camp.name}</h4>
              </div>
              <p className="text-xs text-textSecondary flex items-center gap-2">
                <span>{new Date(camp.completedAt || camp.createdAt).toLocaleDateString()}</span>
                <span className="text-border">|</span>
                <span>{camp.totalRecipients} Recipients</span>
              </p>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 px-4 border-l border-r border-border/50">
              <div className="text-center">
                <p className="text-[10px] text-textMuted uppercase font-bold flex items-center gap-1 justify-center"><Mail size={10} /> Sent</p>
                <p className="text-sm font-bold text-textPrimary">{camp.sentCount}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-textMuted uppercase font-bold flex items-center gap-1 justify-center"><Eye size={10} /> Open</p>
                <p className="text-sm font-bold text-success">{openRate}%</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-textMuted uppercase font-bold flex items-center gap-1 justify-center"><MousePointer2 size={10} /> Click</p>
                <p className="text-sm font-bold text-primary">{clickRate}%</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to={`/campaigns/${camp.id}`}
                className="p-2 text-textSecondary hover:bg-slate-100 hover:text-darkGreen rounded-lg transition-colors"
                title="View recipients"
              >
                <Eye size={16} />
              </Link>
              {canManageCampaigns && (
                <button
                  onClick={() => cloneCampaign(camp.id)}
                  className="p-2 text-textSecondary hover:bg-slate-100 hover:text-primary rounded-lg transition-colors"
                  title="Re-run (Clone)"
                >
                  <Copy size={16} />
                </button>
              )}
              {canManageCampaigns && (
                <button
                  onClick={() => deleteCampaign(camp.id)}
                  className="p-2 text-textSecondary hover:bg-red-50 hover:text-danger rounded-lg transition-colors"
                  title="Delete History"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
        )
      })}

      {selectedCampaign && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-4xl rounded-2xl p-6 shadow-2xl border border-border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-textPrimary">{selectedCampaign.name}</h3>
                <p className="text-xs text-textSecondary">
                  Completed {new Date(selectedCampaign.completedAt || selectedCampaign.createdAt).toLocaleString()}
                </p>
              </div>
              <button onClick={() => setSelectedId(null)} className="p-2 rounded-lg hover:bg-slate-100 text-textMuted">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-slate-50 rounded-xl p-3 border border-border">
                <p className="text-[10px] text-textMuted uppercase font-bold">Sent</p>
                <p className="text-lg font-bold text-textPrimary">{selectedCampaign.sentCount}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-border">
                <p className="text-[10px] text-textMuted uppercase font-bold">Open Rate</p>
                <p className="text-lg font-bold text-success">
                  {selectedCampaign.sentCount > 0 ? Math.round((selectedCampaign.openCount / selectedCampaign.sentCount) * 100) : 0}%
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-border">
                <p className="text-[10px] text-textMuted uppercase font-bold">Click Rate</p>
                <p className="text-lg font-bold text-primary">
                  {selectedCampaign.sentCount > 0 ? Math.round((selectedCampaign.clickCount / selectedCampaign.sentCount) * 100) : 0}%
                </p>
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto border border-border rounded-xl">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-100 text-textMuted text-[10px] uppercase">
                  <tr>
                    <th className="px-4 py-3">Recipient</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Opened</th>
                    <th className="px-4 py-3">Clicked</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-white">
                  {(selectedCampaign.queue || []).map((item, idx) => (
                    <tr key={`${item.leadId}-${idx}`} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-textPrimary">{item.leadName || '—'}</td>
                      <td className="px-4 py-3 text-textSecondary">{item.leadEmail}</td>
                      <td className="px-4 py-3 text-textSecondary">{item.status}</td>
                      <td className="px-4 py-3 text-textSecondary">
                        {item.openedAt ? new Date(item.openedAt).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-textSecondary">
                        {item.clickedAt ? new Date(item.clickedAt).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}
                  {(selectedCampaign.queue || []).length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-textMuted">No recipient data.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PastCampaignsList;
