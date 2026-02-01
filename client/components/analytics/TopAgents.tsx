
import React, { useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import { Lead, Meeting } from '../../types';

interface TopAgentsProps {
  leads: Lead[];
  meetings: Meeting[];
  startDate: Date;
  endDate: Date;
}

const TopAgents: React.FC<TopAgentsProps> = ({ leads, meetings, startDate, endDate }) => {
  const agentStats = useMemo(() => {
    const stats: Record<string, { calls: number; meetings: number; emails: number }> = {};

    // Process Notes (Calls & Emails)
    leads.forEach(lead => {
      lead.notes.forEach(note => {
        const noteDate = new Date(note.timestamp);
        if (noteDate >= startDate && noteDate <= endDate) {
          const agentName = note.author || 'Unknown';
          if (!stats[agentName]) stats[agentName] = { calls: 0, meetings: 0, emails: 0 };
          
          const content = String(note.content || '').toLowerCase();
          if (content.includes('call')) stats[agentName].calls++;
          if (content.includes('email')) stats[agentName].emails++;
        }
      });
    });

    // Process Meetings
    meetings.forEach(meeting => {
      const meetingDate = new Date(meeting.date);
      if (meetingDate >= startDate && meetingDate <= endDate && meeting.status !== 'Cancelled') {
        // Attempt to find agent from lead
        const lead = leads.find(l => l.id === meeting.leadId);
        const agentName = lead ? lead.assignedAgentName : 'Unknown Agent';
        
        if (!stats[agentName]) stats[agentName] = { calls: 0, meetings: 0, emails: 0 };
        stats[agentName].meetings++;
      }
    });

    return Object.entries(stats)
      .map(([name, data]) => ({
        name,
        ...data,
        total: data.calls + data.meetings + data.emails
      }))
      .sort((a, b) => b.total - a.total);
  }, [leads, meetings, startDate, endDate]);

  return (
    <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="p-6 border-b border-border">
          <h3 className="font-bold text-lg text-textPrimary flex items-center gap-2">
            <TrendingUp size={20} className="text-primary" /> Top Agents
          </h3>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-border">
              <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider">Agent</th>
              <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider text-center">Calls</th>
              <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider text-center">Meetings</th>
              <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider text-center">Emails</th>
              <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider text-right">Total Activity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {agentStats.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-textMuted">No recent agent activity found in this period.</td></tr>
            ) : (
              agentStats.map((agent, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-textPrimary">{agent.name}</td>
                  <td className="px-6 py-4 text-center text-textSecondary">{agent.calls}</td>
                  <td className="px-6 py-4 text-center text-textSecondary">{agent.meetings}</td>
                  <td className="px-6 py-4 text-center text-textSecondary">{agent.emails}</td>
                  <td className="px-6 py-4 text-right font-bold text-darkGreen">{agent.total}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
  );
};

export default TopAgents;
