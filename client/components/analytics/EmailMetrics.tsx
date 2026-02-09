
import React, { useMemo } from 'react';
import { Mail, MousePointer2, Reply, SendHorizontal } from 'lucide-react';
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
    const totalReplied = filteredCampaigns.reduce((acc, c) => acc + (c.replyCount || 0), 0);

    return {
      sent: totalSent,
      opened: totalOpened,
      openRate: totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0,
      clicked: totalClicked,
      clickRate: totalSent > 0 ? Math.round((totalClicked / totalSent) * 100) : 0,
      replied: totalReplied,
      replyRate: totalSent > 0 ? Math.round((totalReplied / totalSent) * 100) : 0,
    };
  }, [campaigns, startDate, endDate]);

  const metricCards = [
    {
      label: 'Sent',
      value: emailPerformance.sent,
      icon: SendHorizontal,
      text: 'text-blue-700',
      bg: 'bg-blue-50',
      border: 'border-blue-100'
    },
    {
      label: 'Opened',
      value: emailPerformance.opened,
      icon: Mail,
      text: 'text-emerald-700',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100'
    },
    {
      label: 'Clicked',
      value: emailPerformance.clicked,
      icon: MousePointer2,
      text: 'text-indigo-700',
      bg: 'bg-indigo-50',
      border: 'border-indigo-100'
    },
    {
      label: 'Replied',
      value: emailPerformance.replied,
      icon: Reply,
      text: 'text-violet-700',
      bg: 'bg-violet-50',
      border: 'border-violet-100'
    }
  ];

  return (
    <div className="bg-white p-6 rounded-2xl border border-border shadow-sm h-full">
      <h3 className="font-bold text-lg text-textPrimary mb-6 flex items-center gap-2">
        <Mail size={20} className="text-primary" /> Email Performance
      </h3>

      <div className="grid grid-cols-2 gap-3 mb-5">
        {metricCards.map(({ label, value, icon: Icon, text, bg, border }) => (
          <div key={label} className={`rounded-xl border p-3 ${bg} ${border}`}>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-bold uppercase tracking-wide text-textSecondary">{label}</p>
              <Icon size={14} className={text} />
            </div>
            <p className={`text-2xl leading-none font-black ${text}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3.5">
        <div>
          <div className="flex justify-between text-xs font-bold mb-1.5">
            <span>Open Rate</span>
            <span>{emailPerformance.openRate}%</span>
          </div>
          <div className="w-full bg-appBg h-2.5 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500" style={{ width: `${emailPerformance.openRate}%` }}></div>
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs font-bold mb-1.5">
            <span>Click Rate</span>
            <span>{emailPerformance.clickRate}%</span>
          </div>
          <div className="w-full bg-appBg h-2.5 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-400 to-indigo-600 transition-all duration-500" style={{ width: `${emailPerformance.clickRate}%` }}></div>
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs font-bold mb-1.5">
            <span>Reply Rate</span>
            <span>{emailPerformance.replyRate}%</span>
          </div>
          <div className="w-full bg-appBg h-2.5 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-violet-400 to-violet-600 transition-all duration-500" style={{ width: `${emailPerformance.replyRate}%` }}></div>
          </div>
        </div>
      </div>
      <p className="text-[10px] text-textMuted mt-4 italic">* Open tracking is estimated. Click and reply tracking are more reliable.</p>
    </div>
  );
};

export default EmailMetrics;
