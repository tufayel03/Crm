
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useLeadsStore } from '../stores/leadsStore';
import { useMeetingsStore } from '../stores/meetingsStore';
import { useCampaignStore } from '../stores/campaignStore';
import { Filter, Calendar, ChevronDown } from 'lucide-react';

// Components
import LeadFunnel from '../components/analytics/LeadFunnel';
import ActivityOverview from '../components/analytics/ActivityOverview';
import EmailMetrics from '../components/analytics/EmailMetrics';
import TopAgents from '../components/analytics/TopAgents';
import CallOutcomes from '../components/analytics/CallOutcomes';

type TimeRange = '7d' | '30d' | '6m' | '1y' | 'custom';

const Analytics: React.FC = () => {
  const { leads } = useLeadsStore();
  const { meetings } = useMeetingsStore();
  const { campaigns } = useCampaignStore();

  // Filter State
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calculate Date Range
  const dateRange = useMemo(() => {
    const end = new Date();
    const start = new Date();
    end.setHours(23, 59, 59, 999);
    start.setHours(0, 0, 0, 0);

    switch (timeRange) {
        case '7d':
            start.setDate(end.getDate() - 7);
            break;
        case '30d':
            start.setDate(end.getDate() - 30);
            break;
        case '6m':
            start.setMonth(end.getMonth() - 6);
            break;
        case '1y':
            start.setFullYear(end.getFullYear() - 1);
            break;
        case 'custom':
            if (customStart) {
                const s = new Date(customStart);
                s.setHours(0, 0, 0, 0);
                start.setTime(s.getTime());
            } else {
                // Default to 30 days if custom start is missing
                start.setDate(end.getDate() - 30);
            }
            if (customEnd) {
                const e = new Date(customEnd);
                e.setHours(23, 59, 59, 999);
                end.setTime(e.getTime());
            }
            break;
    }
    return { start, end };
  }, [timeRange, customStart, customEnd]);

  const getLabel = () => {
      switch(timeRange) {
          case '7d': return 'Last 7 Days';
          case '30d': return 'Last 30 Days';
          case '6m': return 'Last 6 Months';
          case '1y': return 'Last Year';
          case 'custom': return 'Custom Range';
          default: return 'Filter';
      }
  };

  return (
    <div className="space-y-6 pb-20 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-textPrimary">Analytics Dashboard</h2>
          <p className="text-textSecondary">Performance metrics and conversion tracking.</p>
        </div>
        
        {/* Filter Dropdown */}
        <div className="relative" ref={filterRef}>
            <button 
                onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                className="px-4 py-2 bg-white border border-border rounded-xl text-sm font-medium text-textPrimary flex items-center gap-2 hover:bg-slate-50 transition-colors shadow-sm"
            >
                <Calendar size={16} className="text-textSecondary" /> 
                {getLabel()}
                <ChevronDown size={14} className="text-textMuted" />
            </button>

            {isFilterMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-border rounded-xl shadow-xl z-50 p-2 animate-in fade-in zoom-in-95 duration-100">
                    <div className="space-y-1 mb-2">
                        {['7d', '30d', '6m', '1y'].map((range) => (
                            <button
                                key={range}
                                onClick={() => { setTimeRange(range as TimeRange); setIsFilterMenuOpen(false); }}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${timeRange === range ? 'bg-softMint text-darkGreen' : 'text-textSecondary hover:bg-slate-50'}`}
                            >
                                {range === '7d' ? 'Last 7 Days' : range === '30d' ? 'Last 30 Days' : range === '6m' ? 'Last 6 Months' : 'Last Year'}
                            </button>
                        ))}
                        <button
                            onClick={() => setTimeRange('custom')}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${timeRange === 'custom' ? 'bg-softMint text-darkGreen' : 'text-textSecondary hover:bg-slate-50'}`}
                        >
                            Custom Range
                        </button>
                    </div>

                    {timeRange === 'custom' && (
                        <div className="pt-2 border-t border-border space-y-2">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-textMuted ml-1">Start Date</label>
                                <input 
                                    type="date" 
                                    value={customStart}
                                    onChange={(e) => setCustomStart(e.target.value)}
                                    className="w-full text-sm border border-border rounded-lg p-2 bg-slate-50 outline-none focus:border-primary"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-textMuted ml-1">End Date</label>
                                <input 
                                    type="date" 
                                    value={customEnd}
                                    onChange={(e) => setCustomEnd(e.target.value)}
                                    className="w-full text-sm border border-border rounded-lg p-2 bg-slate-50 outline-none focus:border-primary"
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
      </div>

      {/* Row 1: Funnel */}
      <LeadFunnel leads={leads} startDate={dateRange.start} endDate={dateRange.end} />

      {/* Row 2: Grid for Activity, Email, and Calls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Activity */}
        <ActivityOverview leads={leads} meetings={meetings} campaigns={campaigns} startDate={dateRange.start} endDate={dateRange.end} />
        
        {/* Call Outcomes */}
        <CallOutcomes leads={leads} startDate={dateRange.start} endDate={dateRange.end} />

        {/* Email Performance */}
        <div className="lg:col-span-2 xl:col-span-1">
            <EmailMetrics campaigns={campaigns} startDate={dateRange.start} endDate={dateRange.end} />
        </div>
      </div>

      {/* Row 3: Agents Table */}
      <TopAgents leads={leads} meetings={meetings} startDate={dateRange.start} endDate={dateRange.end} />
    </div>
  );
};

export default Analytics;
