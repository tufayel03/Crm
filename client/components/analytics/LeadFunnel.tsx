
import React, { useMemo } from 'react';
import { Users } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Lead } from '../../types';

interface LeadFunnelProps {
  leads: Lead[];
  startDate: Date;
  endDate: Date;
}

const LeadFunnel: React.FC<LeadFunnelProps> = ({ leads, startDate, endDate }) => {
  const filteredLeads = useMemo(() => {
      return leads.filter(l => {
          const created = new Date(l.createdAt);
          return created >= startDate && created <= endDate;
      });
  }, [leads, startDate, endDate]);

  const funnelStats = useMemo(() => {
    return {
      total: filteredLeads.length,
      new: filteredLeads.filter(l => l.status === 'New').length,
      contacted: filteredLeads.filter(l => l.status === 'Contacted').length,
      interested: filteredLeads.filter(l => l.status === 'Qualified').length,
      meeting: filteredLeads.filter(l => ['Proposal', 'Negotiation'].includes(l.status)).length,
      converted: filteredLeads.filter(l => l.status === 'Closed Won').length,
      notInterested: filteredLeads.filter(l => l.status === 'Closed Lost').length,
    };
  }, [filteredLeads]);

  const funnelData = [
    { name: 'New', value: funnelStats.new, color: '#3B82F6' },
    { name: 'Contacted', value: funnelStats.contacted, color: '#F59E0B' },
    { name: 'Interested', value: funnelStats.interested, color: '#8B5CF6' },
    { name: 'Meeting', value: funnelStats.meeting, color: '#EC4899' },
    { name: 'Converted', value: funnelStats.converted, color: '#22C55E' },
  ];

  return (
    <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
        <h3 className="font-bold text-lg text-textPrimary mb-6 flex items-center gap-2">
          <Users size={20} className="text-primary" /> Lead Funnel
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
          <div className="p-4 bg-slate-50 rounded-xl border border-border text-center">
            <p className="text-xs font-bold text-textMuted uppercase mb-1">Total Leads</p>
            <p className="text-2xl font-bold text-textPrimary">{funnelStats.total}</p>
          </div>
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 text-center">
            <p className="text-xs font-bold text-blue-600 uppercase mb-1">New</p>
            <p className="text-2xl font-bold text-blue-700">{funnelStats.new}</p>
          </div>
          <div className="p-4 bg-orange-50 rounded-xl border border-orange-100 text-center">
            <p className="text-xs font-bold text-orange-600 uppercase mb-1">Contacted</p>
            <p className="text-2xl font-bold text-orange-700">{funnelStats.contacted}</p>
          </div>
          <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 text-center">
            <p className="text-xs font-bold text-purple-600 uppercase mb-1">Interested</p>
            <p className="text-2xl font-bold text-purple-700">{funnelStats.interested}</p>
          </div>
          <div className="p-4 bg-pink-50 rounded-xl border border-pink-100 text-center">
            <p className="text-xs font-bold text-pink-600 uppercase mb-1">Meeting</p>
            <p className="text-2xl font-bold text-pink-700">{funnelStats.meeting}</p>
          </div>
          <div className="p-4 bg-green-50 rounded-xl border border-green-100 text-center">
            <p className="text-xs font-bold text-success uppercase mb-1">Converted</p>
            <p className="text-2xl font-bold text-darkGreen">{funnelStats.converted}</p>
          </div>
          <div className="p-4 bg-red-50 rounded-xl border border-red-100 text-center">
            <p className="text-xs font-bold text-danger uppercase mb-1">Not Interested</p>
            <p className="text-2xl font-bold text-red-700">{funnelStats.notInterested}</p>
          </div>
        </div>

        <div className="h-[300px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={funnelData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
              <Tooltip 
                cursor={{ fill: 'transparent' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} 
              />
              <Bar dataKey="value" radius={[8, 8, 8, 8]} barSize={40}>
                {funnelData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
  );
};

export default LeadFunnel;
