
import React, { useState, useRef, useEffect } from 'react';
import { X, Search, CheckCircle2, Loader2, Calendar, Link as LinkIcon } from 'lucide-react';
import { Meeting } from '../../types';
import { useLeadsStore } from '../../stores/leadsStore';
import { useClientsStore } from '../../stores/clientsStore';

interface MeetingFormModalProps {
  initialData?: Meeting;
  onClose: () => void;
  onSubmit: (data: any, contact: any) => Promise<void>;
  isProcessing: boolean;
}

const MeetingFormModal: React.FC<MeetingFormModalProps> = ({ initialData, onClose, onSubmit, isProcessing }) => {
  const { leads } = useLeadsStore();
  const { clients } = useClientsStore();
  
  // Search State
  const [searchInput, setSearchInput] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedContact, setSelectedContact] = useState<{id: string, name: string, email: string, type: 'Lead' | 'Client', displayId: string} | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    agenda: initialData?.agenda || '',
    date: initialData?.date || new Date().toISOString().split('T')[0],
    time: initialData?.time || '09:00',
    duration: initialData?.duration || 30,
    platform: (initialData?.platform || 'Google Meet') as 'Google Meet' | 'Zoom' | 'Phone',
    link: initialData?.link || ''
  });

  // Init Data Logic
  useEffect(() => {
    if (initialData) {
        if (initialData.leadId) {
            const client = clients.find(c => c.id === initialData.leadId);
            if (client) {
                setSelectedContact({ 
                    id: client.id, name: client.contactName, email: client.email, type: 'Client', displayId: client.uniqueId 
                });
                setSearchInput(client.contactName);
            } else {
                const lead = leads.find(l => l.id === initialData.leadId);
                if (lead) {
                    setSelectedContact({ 
                        id: lead.id, name: lead.name, email: lead.email, type: 'Lead', displayId: lead.shortId 
                    });
                    setSearchInput(lead.name);
                } else {
                    setSearchInput(initialData.leadName); // Fallback
                }
            }
        } else {
            setSearchInput(initialData.leadName);
        }
    }
  }, [initialData, clients, leads]);

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    
    if (selectedContact && value !== selectedContact.name) setSelectedContact(null);

    if (!value.trim()) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
    }

    const term = value.toLowerCase();
    const matchedClients = clients.filter(c => 
        (c.companyName && c.companyName.toLowerCase().includes(term)) ||
        (c.contactName && c.contactName.toLowerCase().includes(term)) ||
        (c.email && c.email.toLowerCase().includes(term)) ||
        (c.uniqueId && c.uniqueId.toLowerCase().includes(term))
    ).map(c => ({
        id: c.id, name: c.contactName, subInfo: c.companyName, email: c.email, type: 'Client', displayId: c.uniqueId
    }));

    const matchedLeads = leads.filter(l => 
        (l.name && l.name.toLowerCase().includes(term)) ||
        (l.email && l.email.toLowerCase().includes(term)) ||
        (l.shortId && l.shortId.toLowerCase().includes(term))
    ).map(l => ({
        id: l.id, name: l.name, subInfo: l.country, email: l.email, type: 'Lead', displayId: l.shortId
    }));

    setSuggestions([...matchedClients, ...matchedLeads].slice(0, 5));
    setShowSuggestions(true);
  };

  const handleSelectContact = (contact: any) => {
      setSelectedContact(contact);
      setSearchInput(contact.name);
      setShowSuggestions(false);
  };

  const handlePlatformChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const platform = e.target.value as any;
      setFormData(prev => ({ ...prev, platform }));
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      // Allow manual input for participant name even if not in DB
      const contactToSubmit = selectedContact || { 
          id: undefined, 
          name: searchInput || 'Internal Meeting', 
          email: '', 
          type: 'Manual', 
          displayId: '' 
      };
      onSubmit(formData, contactToSubmit);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200 overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-textPrimary">
              {initialData ? 'Edit Meeting Details' : 'Schedule New Meeting'}
          </h3>
          <button onClick={onClose} className="text-textMuted hover:text-danger">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Participant Search */}
          <div className="bg-slate-50 p-4 rounded-xl border border-border space-y-3 relative z-20" ref={searchRef}>
              <label className="block text-xs font-bold text-textSecondary uppercase">Participant (Optional)</label>
              <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
                  <input 
                    type="text" 
                    value={searchInput}
                    onChange={handleSearchChange}
                    onFocus={() => { if (searchInput && suggestions.length > 0) setShowSuggestions(true); }}
                    className={`w-full pl-9 pr-3 py-2 bg-white border rounded-lg focus:ring-2 outline-none ${selectedContact ? 'border-success ring-success/20 font-bold text-darkGreen' : 'border-border focus:ring-primary'}`}
                    placeholder="Search Name, Email, or Unique ID..."
                    autoComplete="off"
                    disabled={!!initialData && !!selectedContact} // Lock participant if editing linked meeting
                  />
                  {selectedContact && (
                      <CheckCircle2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-success" />
                  )}
              </div>

              {/* Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && !initialData && (
                  <div className="absolute left-4 right-4 top-[70px] bg-white border border-border rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto z-30">
                      {suggestions.map((suggestion) => (
                          <div 
                            key={suggestion.id}
                            onClick={() => handleSelectContact(suggestion)}
                            className="px-4 py-3 hover:bg-softMint/30 cursor-pointer border-b border-border last:border-0 flex items-center justify-between group"
                          >
                              <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs ${suggestion.type === 'Client' ? 'bg-darkGreen' : 'bg-blue-500'}`}>
                                      {suggestion.name.charAt(0)}
                                  </div>
                                  <div>
                                      <p className="text-sm font-bold text-textPrimary group-hover:text-darkGreen">{suggestion.name}</p>
                                      <p className="text-xs text-textMuted flex items-center gap-1">
                                          <span className="opacity-75">{suggestion.email}</span>
                                          {suggestion.subInfo && <span className="opacity-50">• {suggestion.subInfo}</span>}
                                      </p>
                                  </div>
                              </div>
                              <div className="text-right">
                                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${suggestion.type === 'Client' ? 'bg-softMint text-darkGreen' : 'bg-blue-50 text-blue-700'}`}>
                                      {suggestion.type}
                                  </span>
                                  <p className="text-[10px] text-textMuted mt-1 font-mono">{suggestion.displayId}</p>
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>

          <div>
            <label className="block text-xs font-bold text-textSecondary uppercase mb-1">Meeting Title</label>
            <input 
              type="text" 
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full px-3 py-2 bg-appBg border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
              placeholder="e.g. Discovery Call"
              required 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-textSecondary uppercase mb-1">Date</label>
              <div className="relative">
                <input 
                    type="date" 
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    // Forces calendar picker on click
                    onClick={(e) => e.currentTarget.showPicker()}
                    className="w-full px-3 py-2 bg-appBg border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none cursor-pointer"
                    required 
                />
                <Calendar size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-textMuted pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-textSecondary uppercase mb-1">Time (Dhaka, GMT+6)</label>
              <input 
                type="time" 
                value={formData.time}
                onChange={(e) => setFormData({...formData, time: e.target.value})}
                // Forces clock picker on click
                onClick={(e) => e.currentTarget.showPicker()}
                className="w-full px-3 py-2 bg-appBg border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none cursor-pointer"
                required 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="block text-xs font-bold text-textSecondary uppercase mb-1">Duration (min)</label>
              <input 
                type="number" 
                value={formData.duration}
                onChange={(e) => setFormData({...formData, duration: parseInt(e.target.value)})}
                className="w-full px-3 py-2 bg-appBg border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-textSecondary uppercase mb-1">Platform</label>
              <select 
                value={formData.platform}
                onChange={handlePlatformChange}
                className="w-full px-3 py-2 bg-appBg border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
              >
                <option value="Google Meet">Google Meet</option>
                <option value="Zoom">Zoom</option>
                <option value="Phone">Phone</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-textSecondary uppercase">Meeting Link</label>
            </div>
            <div className="relative">
                <input 
                type="url" 
                value={formData.link}
                onChange={(e) => setFormData({...formData, link: e.target.value})}
                className="w-full pl-9 pr-3 py-2 bg-appBg border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                placeholder="https://meet.google.com/..."
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted">
                    <LinkIcon size={16} />
                </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-textSecondary uppercase mb-1">Agenda</label>
            <textarea 
              value={formData.agenda}
              onChange={(e) => setFormData({...formData, agenda: e.target.value})}
              className="w-full px-3 py-2 bg-appBg border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none min-h-[80px]"
              placeholder="Key discussion points..."
            />
          </div>

          <button 
            type="submit" 
            disabled={isProcessing}
            className="w-full py-3 mt-2 bg-darkGreen text-white font-bold rounded-xl hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
            {isProcessing 
                ? 'Processing...' 
                : (initialData ? 'Update Meeting' : 'Schedule Meeting')
            }
          </button>
        </form>
      </div>
    </div>
  );
};

export default MeetingFormModal;
