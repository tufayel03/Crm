
import React, { useState, useRef, useEffect } from 'react';
import { Search, Filter } from 'lucide-react';
import { ServicePlan } from '../../types';

interface ClientsToolbarProps {
  search: string;
  setSearch: (val: string) => void;
  serviceFilter: string;
  setServiceFilter: (val: string) => void;
  managerFilter: string;
  setManagerFilter: (val: string) => void;
  countryFilter: string;
  setCountryFilter: (val: string) => void;
  rangeStart: string;
  setRangeStart: (val: string) => void;
  rangeEnd: string;
  setRangeEnd: (val: string) => void;
  onRangeSelect: (e: React.FormEvent) => void;
  isAdmin: boolean;
  
  uniqueManagers: string[];
  uniqueCountries: string[];
  
  // New props for Plan filtering
  plans: ServicePlan[];
  selectedPlan: string;
  setSelectedPlan: (val: string) => void;
  
  onExport: () => void;
}

const ClientsToolbar: React.FC<ClientsToolbarProps> = ({
  search, setSearch, 
  serviceFilter, setServiceFilter,
  managerFilter, setManagerFilter,
  countryFilter, setCountryFilter,
  rangeStart, setRangeStart, rangeEnd, setRangeEnd, onRangeSelect,
  isAdmin,
  uniqueManagers, uniqueCountries,
  plans, selectedPlan, setSelectedPlan,
  onExport
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

  const activeFiltersCount = 
    (serviceFilter !== 'All' ? 1 : 0) + 
    (managerFilter !== 'All' ? 1 : 0) + 
    (countryFilter !== 'All' ? 1 : 0) +
    (serviceFilter === 'Active' && selectedPlan !== 'All' ? 1 : 0);

  return (
    <div className="bg-white p-4 rounded-2xl border border-border space-y-4 relative z-20">
      <div className="flex flex-col lg:flex-row gap-4 justify-between">
        
        {/* Search & Filter */}
        <div className="flex flex-1 gap-4 items-center">
           <div className="flex-1 relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" size={18} />
            <input 
              type="text" 
              placeholder="Search company, contact, email..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white text-black border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none placeholder:text-gray-400"
            />
          </div>
          
          {/* Filter Dropdown */}
          <div className="relative" ref={filterRef}>
            <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`p-2 border rounded-xl transition-all flex items-center gap-2 ${
                isFilterOpen || activeFiltersCount > 0 
                  ? 'bg-softMint border-primary text-darkGreen' 
                  : 'bg-white border-border text-textSecondary hover:bg-slate-50'
              }`}
              title="Filter Clients"
            >
              <Filter size={20} />
              {activeFiltersCount > 0 && (
                <span className="bg-darkGreen text-white text-[10px] font-bold px-1.5 rounded-full min-w-[16px] h-4 flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {isFilterOpen && (
              <div className="absolute top-full right-0 mt-2 w-72 bg-white border border-border rounded-2xl shadow-xl p-5 animate-in fade-in zoom-in-95 duration-100 z-50">
                 <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-sm text-textPrimary">Filters</h4>
                    {activeFiltersCount > 0 && (
                      <button 
                        onClick={() => { 
                            setServiceFilter('All'); 
                            setManagerFilter('All'); 
                            setCountryFilter('All'); 
                            setSelectedPlan('All');
                        }}
                        className="text-xs text-danger hover:underline"
                      >
                        Clear All
                      </button>
                    )}
                 </div>
                 
                 <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-textSecondary mb-1.5">Service Status</label>
                      <select 
                        value={serviceFilter}
                        onChange={(e) => setServiceFilter(e.target.value)}
                        className="w-full bg-white text-black border border-border p-2 rounded-lg text-sm outline-none focus:border-primary"
                      >
                        <option value="All">All Clients</option>
                        <option value="Active">Has Active Services</option>
                        <option value="Inactive">No Active Services</option>
                      </select>
                    </div>

                    {serviceFilter === 'Active' && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                            <label className="block text-xs font-bold text-textSecondary mb-1.5 pl-2 border-l-2 border-primary">Filter Plan</label>
                            <select 
                                value={selectedPlan}
                                onChange={(e) => setSelectedPlan(e.target.value)}
                                className="w-full bg-white text-black border border-border p-2 rounded-lg text-sm outline-none focus:border-primary"
                            >
                                <option value="All">Any Active Plan</option>
                                {plans.map(p => (
                                    <option key={p.id} value={p.name}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-textSecondary mb-1.5">Account Manager</label>
                      <select 
                        value={managerFilter}
                        onChange={(e) => setManagerFilter(e.target.value)}
                        className="w-full bg-white text-black border border-border p-2 rounded-lg text-sm outline-none focus:border-primary"
                      >
                        <option value="All">All Managers</option>
                        {uniqueManagers.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-textSecondary mb-1.5">Country</label>
                      <select 
                        value={countryFilter}
                        onChange={(e) => setCountryFilter(e.target.value)}
                        className="w-full bg-white text-black border border-border p-2 rounded-lg text-sm outline-none focus:border-primary"
                      >
                        <option value="All">All Countries</option>
                        {uniqueCountries.map(c => (
                          <option key={c} value={c}>{c}</option>
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
      </div>
    </div>
  );
};

export default ClientsToolbar;
