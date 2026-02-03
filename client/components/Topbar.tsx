
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, X, Briefcase, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useLeadsStore } from '../stores/leadsStore';
import { useClientsStore } from '../stores/clientsStore';

const Topbar: React.FC = () => {
  const { user, role } = useAuthStore();
  const { leads } = useLeadsStore();
  const { clients } = useClientsStore();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close search on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    
    const lowerQuery = query.toLowerCase();
    
    const matchedLeads = leads.filter(l => 
        (l.name && l.name.toLowerCase().includes(lowerQuery)) ||
        (l.email && l.email.toLowerCase().includes(lowerQuery)) ||
        (l.shortId && l.shortId.toLowerCase().includes(lowerQuery)) ||
        (l.readableId && l.readableId.toString().includes(lowerQuery))
    ).map(l => ({ ...l, displayId: l.shortId, type: 'Lead' as const, link: `/leads/${l.id}` }));

    const matchedClients = clients.filter(c => 
        (c.companyName && c.companyName.toLowerCase().includes(lowerQuery)) ||
        (c.contactName && c.contactName.toLowerCase().includes(lowerQuery)) ||
        (c.email && c.email.toLowerCase().includes(lowerQuery)) ||
        (c.uniqueId && c.uniqueId.toLowerCase().includes(lowerQuery)) ||
        (c.readableId && c.readableId.toString().includes(lowerQuery))
    ).map(c => ({ ...c, name: c.companyName, displayId: c.uniqueId, type: 'Client' as const, link: `/clients/${c.id}` }));

    return [...matchedLeads, ...matchedClients].slice(0, 6);
  }, [query, leads, clients]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(e.target.value);
      setShowResults(true);
  };

  const handleResultClick = (link: string) => {
      navigate(link);
      setQuery('');
      setShowResults(false);
  };

  return (
    <header className="h-16 bg-white border-b border-border flex items-center justify-between px-8 sticky top-0 z-10 shadow-sm">
      <div className="flex-1 max-w-xl relative" ref={searchRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted pointer-events-none" size={18} />
          <input 
            type="text" 
            value={query}
            onChange={handleSearchChange}
            onFocus={() => setShowResults(true)}
            placeholder="Search leads, clients, emails, or IDs..." 
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm font-medium"
          />
          {query && (
              <button 
                onClick={() => { setQuery(''); setShowResults(false); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-textMuted hover:text-textPrimary"
              >
                  <X size={16} />
              </button>
          )}
        </div>

        {/* Live Search Dropdown */}
        {showResults && query && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-50">
                {searchResults.length > 0 ? (
                    <div>
                        <div className="px-4 py-2 bg-slate-50 border-b border-border text-[10px] font-bold text-textMuted uppercase tracking-wider">
                            Top Results
                        </div>
                        {searchResults.map((result) => (
                            <button
                                key={`${result.type}-${result.id}`}
                                onClick={() => handleResultClick(result.link)}
                                className="w-full text-left px-4 py-3 hover:bg-softMint/20 transition-colors border-b border-border last:border-0 flex items-center gap-3 group"
                            >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0 ${
                                    result.type === 'Client' ? 'bg-darkGreen' : 'bg-blue-500'
                                }`}>
                                    {result.name.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <p className="font-bold text-sm text-textPrimary truncate group-hover:text-primary transition-colors">
                                            {result.name}
                                        </p>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                            result.type === 'Client' ? 'bg-green-100 text-darkGreen' : 'bg-blue-100 text-blue-700'
                                        }`}>
                                            {result.type}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-textSecondary">
                                        <span className="font-mono bg-slate-100 px-1 rounded text-textMuted">#{result.displayId}</span>
                                        <span className="truncate opacity-70">{result.email}</span>
                                    </div>
                                </div>
                                <ChevronRight size={16} className="text-textMuted opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="p-8 text-center text-textMuted">
                        <Search size={24} className="mx-auto mb-2 opacity-20" />
                        <p className="text-sm">No results found for "{query}"</p>
                    </div>
                )}
            </div>
        )}
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3 border-l pl-6 border-border">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-textPrimary leading-none">{user?.name}</p>
            <p className="text-[12px] text-textMuted capitalize mt-1">{role}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-softMint border border-primary overflow-hidden flex items-center justify-center">
            {user?.avatar ? (
              <img src={user.avatar} alt="User Avatar" className="w-full h-full object-cover" />
            ) : (
              <User size={20} className="text-darkGreen" />
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
