
import React, { useState, useRef, useEffect } from 'react';
import { Search, Download, Filter, X, Check } from 'lucide-react';

interface LeadsToolbarProps {
  search: string;
  setSearch: (val: string) => void;
  statusFilter: string[];
  setStatusFilter: (val: string[]) => void;
  agentFilter: string;
  setAgentFilter: (val: string) => void;
  outcomeFilter: string;
  setOutcomeFilter: (val: string) => void;
  statuses: string[];
  outcomes: string[];
  agents: { id: string; name: string }[];
  rangeStart: string;
  setRangeStart: (val: string) => void;
  rangeEnd: string;
  setRangeEnd: (val: string) => void;
  onRangeSelect: (e: React.FormEvent) => void;
  onExport: () => void;
  isAdmin: boolean;
}

const LeadsToolbar: React.FC<LeadsToolbarProps> = ({
  search, setSearch,
  statusFilter, setStatusFilter,
  agentFilter, setAgentFilter,
  outcomeFilter, setOutcomeFilter,
  statuses, outcomes, agents,
  rangeStart, setRangeStart, rangeEnd, setRangeEnd, onRangeSelect,
  onExport, isAdmin
}) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeFiltersCount = (statusFilter.includes('All') ? 0 : 1) + (agentFilter !== 'All' ? 1 : 0) + (outcomeFilter !== 'All' ? 1 : 0);

  const handleStatusToggle = (status: string) => {
    if (status === 'All') {
      setStatusFilter(['All']);
      return;
    }

    let newFilters = statusFilter.includes('All') ? [] : [...statusFilter];

    if (newFilters.includes(status)) {
      newFilters = newFilters.filter(s => s !== status);
    } else {
      newFilters.push(status);
    }

    if (newFilters.length === 0) {
      setStatusFilter(['All']);
    } else {
      setStatusFilter(newFilters);
    }
  };

  return (
    <div className="bg-white p-4 rounded-2xl border border-border space-y-4 relative z-20">
      <div className="flex flex-col lg:flex-row gap-4 justify-between">

        {/* Search & Filter */}
        <div className="flex flex-1 gap-4 items-center">
          <div className="flex-1 relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" size={18} />
            <input
              type="text"
              placeholder="Search name, email, or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white text-black border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none placeholder:text-gray-400"
            />
          </div>

          {/* Filter Dropdown */}
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`p-2 border rounded-xl transition-all flex items-center gap-2 ${isFilterOpen || activeFiltersCount > 0
                  ? 'bg-softMint border-primary text-darkGreen'
                  : 'bg-white border-border text-textSecondary hover:bg-slate-50'
                }`}
              title="Filter Leads"
            >
              <Filter size={20} />
              {activeFiltersCount > 0 && (
                <span className="bg-darkGreen text-white text-[10px] font-bold px-1.5 rounded-full min-w-[16px] h-4 flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {isFilterOpen && (
              <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-border rounded-2xl shadow-xl p-5 animate-in fade-in zoom-in-95 duration-100 z-50">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold text-sm text-textPrimary">Filters</h4>
                  {activeFiltersCount > 0 && (
                    <button
                      onClick={() => { setStatusFilter(['All']); setAgentFilter('All'); setOutcomeFilter('All'); }}
                      className="text-xs text-danger hover:underline"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-textSecondary mb-2">By Status</label>
                    <div className="bg-slate-50 border border-border rounded-xl p-2 max-h-40 overflow-y-auto space-y-1">

                      {/* All Statuses Option */}
                      <button
                        onClick={() => handleStatusToggle('All')}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors ${statusFilter.includes('All')
                            ? 'bg-white text-primary font-bold shadow-sm'
                            : 'text-textSecondary hover:bg-white'
                          }`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${statusFilter.includes('All') ? 'bg-primary border-primary' : 'border-gray-300'}`}>
                          {statusFilter.includes('All') && <Check size={12} className="text-white" />}
                        </div>
                        All Statuses
                      </button>

                      {/* Individual Statuses */}
                      {statuses.map(s => (
                        <button
                          key={s}
                          onClick={() => handleStatusToggle(s)}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors ${statusFilter.includes(s)
                              ? 'bg-white text-primary font-bold shadow-sm'
                              : 'text-textSecondary hover:bg-white'
                            }`}
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${statusFilter.includes(s) ? 'bg-primary border-primary' : 'border-gray-300'}`}>
                            {statusFilter.includes(s) && <Check size={12} className="text-white" />}
                          </div>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-textSecondary mb-1.5">By Agent</label>
                    <select
                      value={agentFilter}
                      onChange={(e) => setAgentFilter(e.target.value)}
                      className="w-full bg-white text-black border border-border p-2 rounded-lg text-sm outline-none focus:border-primary"
                    >
                      <option value="All">All Agents</option>
                      <option value="">Unassigned</option>
                      {agents.map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-textSecondary mb-1.5">Last Call Outcome</label>
                    <select
                      value={outcomeFilter}
                      onChange={(e) => setOutcomeFilter(e.target.value)}
                      className="w-full bg-white text-black border border-border p-2 rounded-lg text-sm outline-none focus:border-primary"
                    >
                      <option value="All">All Outcomes</option>
                      {outcomes.map(o => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Range Selection Tool */}
        {isAdmin && (
          <form onSubmit={onRangeSelect} className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-border">
            <span className="text-xs font-bold text-textMuted uppercase px-2">Select Range:</span>
            <input
              type="number"
              placeholder="From ID"
              value={rangeStart}
              onChange={(e) => setRangeStart(e.target.value)}
              className="w-24 px-2 py-1.5 text-sm bg-white text-black border border-border rounded-lg"
            />
            <span className="text-textMuted">-</span>
            <input
              type="number"
              placeholder="To ID"
              value={rangeEnd}
              onChange={(e) => setRangeEnd(e.target.value)}
              className="w-24 px-2 py-1.5 text-sm bg-white text-black border border-border rounded-lg"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-primary text-darkGreen text-xs font-bold rounded-lg hover:bg-softMint"
            >
              Apply
            </button>
          </form>
        )}

        <button
          onClick={onExport}
          className="p-2 border border-border rounded-xl hover:bg-slate-50 transition-colors shrink-0 flex items-center gap-2 bg-white text-black" title="Export CSV"
        >
          <Download size={20} />
          <span className="hidden sm:inline text-sm font-medium">Export</span>
        </button>
      </div>
    </div>
  );
};

export default LeadsToolbar;
