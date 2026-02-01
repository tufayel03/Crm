
import React, { useMemo } from 'react';
import { Mail } from 'lucide-react';
import { Campaign } from '../../types';

interface EmailMetricsProps {
  campaigns: Campaign[];
  startDate: Date;
  endDate: Date;
}

const EmailMetrics: React.FC<EmailMetricsProps> = ({ campaigns, startDate, endDate }) => {
  const emailPerformance = useMemo(() => {
    const filteredCampaigns = campaigns.filter(c => {
        const date = new Date(c.createdAt);
        return date >= startDate && date <= endDate;
    });

    const totalSent = filteredCampaigns.reduce((acc, c) => acc + c.sentCount, 0);
    const totalOpened = filteredCampaigns.reduce((acc, c) => acc + c.openCount, 0);
    const totalClicked = filteredCampaigns.reduce((acc, c) => acc + c.clickCount, 0);

    return {
      sent: totalSent,
      opened: totalOpened,
      openRate: totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0,
      clicked: totalClicked,
      clickRate: totalSent > 0 ? Math.round((totalClicked / totalSent) * 100) : 0,
    };
  }, [campaigns, startDate, endDate]);

  return (
    <div className="bg-white p-6 rounded-2xl border border-border shadow-sm h-full">
      <h3 className="font-bold text-lg text-textPrimary mb-6 flex items-center gap-2">
        <Mail size={20} className="text-primary" /> Email Performance
      </h3>
      <div className="grid grid-cols-2 gap-6 mb-4">
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-textSecondary">Total Sent</span>
            <span className="font-bold">{emailPerformance.sent}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-textSecondary">Opened</span>
            <span className="font-bold text-darkGreen">{emailPerformance.opened}</span>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-textSecondary">Clicked</span>
            <span className="font-bold text-primary">{emailPerformance.clicked}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-textSecondary">Click Rate</span>
            <span className="font-bold">{emailPerformance.clickRate}%</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-xs font-bold mb-1">
            <span>Open Rate</span>
            <span>{emailPerformance.openRate}%</span>
          </div>
          <div className="w-full bg-appBg h-2 rounded-full overflow-hidden">
            <div className="h-full bg-success transition-all duration-500" style={{ width: `${emailPerformance.openRate}%` }}></div>
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs font-bold mb-1">
            <span>Click Rate</span>
            <span>{emailPerformance.clickRate}%</span>
          </div>
          <div className="w-full bg-appBg h-2 rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all duration-500" style={{ width: `${emailPerformance.clickRate}%` }}></div>
          </div>
        </div>
      </div>
      <p className="text-[10px] text-textMuted mt-4 italic">* Open tracking is estimated. Click tracking is more reliable.</p>
    </div>
  );
};

export default EmailMetrics;
