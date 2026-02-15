import React from 'react';
import { Link } from 'react-router-dom';
import { History } from 'lucide-react';
import PastCampaignsList from '../components/campaigns/PastCampaignsList';

const CampaignHistory: React.FC = () => {
  return (
    <div className="space-y-8 pb-20">
      <div>
        <h2 className="text-2xl font-bold text-textPrimary">Campaign History</h2>
        <p className="text-textSecondary">Completed campaigns sorted by most recent first.</p>
      </div>

      <div className="flex gap-2">
        <Link
          to="/campaigns/history"
          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-softMint text-darkGreen border border-primary/30"
        >
          Campaign History
        </Link>
        <Link
          to="/campaigns/active"
          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-textSecondary border border-border hover:bg-slate-50"
        >
          Active Campaigns
        </Link>
      </div>

      <div className="space-y-4">
        <h3 className="font-bold text-lg text-textPrimary flex items-center gap-2">
          <History size={20} className="text-textMuted" /> Campaign History
        </h3>
        <PastCampaignsList />
      </div>
    </div>
  );
};

export default CampaignHistory;
