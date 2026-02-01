
import React, { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { Lead } from '../../types';
import { Phone } from 'lucide-react';

interface CallOutcomesProps {
  leads: Lead[];
  startDate: Date;
  endDate: Date;
}

// Colors for the chart
const COLORS = ['#22C55E', '#8B5CF6', '#3B82F6', '#F59E0B', '#EF4444', '#94A3B8'];

const CallOutcomes: React.FC<CallOutcomesProps> = ({ leads, startDate, endDate }) => {
  const outcomeData = useMemo(() => {
    const counts: Record<string, number> = {};
    let total = 0;

    leads.forEach(lead => {
        lead.notes.forEach(note => {
            const noteDate = new Date(note.timestamp);
            
            // Filter by date range and content type
            if (noteDate >= startDate && noteDate <= endDate) {
                // Match the standard format used in LeadDetail.tsx
                // "Call logged. Outcome: [Outcome]"
                if (note.content && String(note.content).includes('Call logged. Outcome:')) {
                    const parts = String(note.content).split('Outcome:');
                    if (parts.length > 1) {
                        const outcome = parts[1].trim();
                        counts[outcome] = (counts[outcome] || 0) + 1;
                        total++;
                    }
                }
            }
        });
    });

    const data = Object.keys(counts).map(name => ({
        name,
        value: counts[name]
    })).sort((a, b) => b.value - a.value);

    return { data, total };
  }, [leads, startDate, endDate]);

  if (outcomeData.total === 0) {
      return (
        <div className="bg-white p-6 rounded-2xl border border-border shadow-sm h-full flex flex-col">
            <h3 className="font-bold text-lg text-textPrimary mb-6 flex items-center gap-2">
                <Phone size={20} className="text-primary" /> Call Outcomes
            </h3>
            <div className="flex-1 min-h-[300px] flex flex-col items-center justify-center text-textMuted text-sm">
                <Phone size={32} className="mb-2 opacity-20" />
                <p>No calls logged in this period.</p>
            </div>
        </div>
      );
  }

  return (
    <div className="bg-white p-6 rounded-2xl border border-border shadow-sm h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-lg text-textPrimary flex items-center gap-2">
            <Phone size={20} className="text-primary" /> Call Outcomes
        </h3>
        <span className="text-xs font-bold bg-slate-100 px-2 py-1 rounded-lg text-textSecondary">
            {outcomeData.total} Calls
        </span>
      </div>

      <div className="w-full h-[300px] min-w-0">
        <ResponsiveContainer width="100%" height="100%">
            <BarChart 
                data={outcomeData.data} 
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: '#64748b' }} 
                    interval={0}
                    dy={10}
                />
                <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: '#64748b' }} 
                    allowDecimals={false}
                />
                <Tooltip 
                    cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" radius={[6, 6, 6, 6]} barSize={32}>
                    {outcomeData.data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CallOutcomes;
