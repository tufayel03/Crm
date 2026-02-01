
import React, { useMemo } from 'react';
import { BarChart3, Phone, Video, Mail } from 'lucide-react';
import { Lead, Meeting, Campaign } from '../../types';

interface ActivityOverviewProps {
  leads: Lead[];
  meetings: Meeting[];
  campaigns: Campaign[];
  startDate: Date;
  endDate: Date;
}

const ActivityOverview: React.FC<ActivityOverviewProps> = ({ leads, meetings, campaigns, startDate, endDate }) => {
  // --- Activity Stats ---
  const activityStats = useMemo(() => {
    // Calls: Derived from notes containing "Call"
    const calls = leads.reduce((acc, lead) => {
      const recentCalls = lead.notes.filter(n => {
        const noteDate = new Date(n.timestamp);
        return noteDate >= startDate && noteDate <= endDate && (String(n.content || '').toLowerCase().includes('call'));
      });
      return acc + recentCalls.length;
    }, 0);

    // Meetings: From meetings store
    const recentMeetings = meetings.filter(m => {
      const meetingDate = new Date(m.date);
      return meetingDate >= startDate && meetingDate <= endDate && m.status !== 'Cancelled';
    }).length;

    // Emails: From campaigns + notes containing "Email"
    const recentCampaignEmails = campaigns
      .filter(c => {
          const date = new Date(c.createdAt);
          return date >= startDate && date <= endDate;
      })
      .reduce((acc, c) => acc + c.sentCount, 0);

    const individualEmails = leads.reduce((acc, lead) => {
      const recentEmails = lead.notes.filter(n => {
        const noteDate = new Date(n.timestamp);
        return noteDate >= startDate && noteDate <= endDate && (String(n.content || '').toLowerCase().includes('email'));
      });
      return acc + recentEmails.length;
    }, 0);

    return {
      calls,
      meetings: recentMeetings,
      emails: recentCampaignEmails + individualEmails
    };
  }, [leads, meetings, campaigns, startDate, endDate]);

  return (
    <div className="bg-white p-6 rounded-2xl border border-border shadow-sm h-full">
      <h3 className="font-bold text-lg text-textPrimary mb-6 flex items-center gap-2">
        <BarChart3 size={20} className="text-primary" /> Activity
      </h3>
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-appBg rounded-xl flex flex-col items-center justify-center gap-2">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
            <Phone size={20} />
          </div>
          <span className="text-2xl font-bold text-textPrimary">{activityStats.calls}</span>
          <span className="text-xs text-textSecondary uppercase font-bold">Calls</span>
        </div>
        <div className="p-4 bg-appBg rounded-xl flex flex-col items-center justify-center gap-2">
          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
            <Video size={20} />
          </div>
          <span className="text-2xl font-bold text-textPrimary">{activityStats.meetings}</span>
          <span className="text-xs text-textSecondary uppercase font-bold">Meetings</span>
        </div>
        <div className="p-4 bg-appBg rounded-xl flex flex-col items-center justify-center gap-2">
          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
            <Mail size={20} />
          </div>
          <span className="text-2xl font-bold text-textPrimary">{activityStats.emails}</span>
          <span className="text-xs text-textSecondary uppercase font-bold">Emails</span>
        </div>
      </div>
    </div>
  );
};

export default ActivityOverview;
