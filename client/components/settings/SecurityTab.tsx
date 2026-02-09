
import React, { useState, useEffect, useMemo } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import { useAuthStore } from '../../stores/authStore';
import { apiRequest } from '../../utils/api';
import { 
  Shield, Smartphone, LogOut, CheckCircle2, AlertTriangle, 
  MapPin, Laptop, Globe, ChevronLeft, 
  ChevronRight, X, AlertOctagon, Activity, Server,
} from 'lucide-react';

interface Session {
  id: string;
  device: string;
  browser: string;
  os: string;
  ip: string;
  location: string;
  coords?: { lat: number; lng: number };
  lastActive: string;
  isCurrent: boolean;
  status: 'active' | 'idle';
  userName?: string;
  userEmail?: string;
  userRole?: string;
}

const ITEMS_PER_PAGE = 8;

const SecurityTab: React.FC = () => {
  const { ipRules, updateIpRuleMode, addIpToRule, removeIpFromRule } = useSettingsStore();
  const { role } = useAuthStore();
  
  // Navigation State
  const [activeSection, setActiveSection] = useState<'sessions' | 'ip_rules'>('sessions');

  // Data State
  const [currentIp, setCurrentIp] = useState<string>('Loading...');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [summary, setSummary] = useState<{ totalSessions: number; totalUsersActive: number }>({ totalSessions: 0, totalUsersActive: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  
  const [ipInput, setIpInput] = useState('');
  const [activeListTab, setActiveListTab] = useState<'whitelist' | 'blacklist'>('whitelist');

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    isDanger?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const closeConfirm = () => setConfirmModal(prev => ({ ...prev, isOpen: false }));

  const loadSessions = async () => {
    const data = await apiRequest<{ sessions: Session[]; summary: { totalSessions: number; totalUsersActive: number } }>('/api/v1/sessions');
    setSessions(Array.isArray(data.sessions) ? data.sessions : []);
    setSummary(data.summary || { totalSessions: 0, totalUsersActive: 0 });
  };

  // --- Initialization & Real IP Fetching ---
  useEffect(() => {
    const initData = async () => {
        // 1. Fetch Real IP
        let realIp = 'Unknown';
        try {
            const res = await fetch('https://api.ipify.org?format=json');
            const data = await res.json();
            realIp = data.ip;
            setCurrentIp(realIp);
        } catch (e) {
            console.error("Failed to fetch IP", e);
            setCurrentIp('Unavailable');
        }

        await loadSessions();
    };

    initData();
  }, []);

  useEffect(() => {
    if (activeSection !== 'sessions') return;
    const timer = setInterval(() => {
      loadSessions().catch(() => {});
    }, 5000);
    return () => clearInterval(timer);
  }, [activeSection]);

  // --- Handlers ---

  const handleLogoutSession = (id: string) => {
    if (window.confirm('Revoke this session? User will be logged out.')) {
        apiRequest(`/api/v1/sessions/${id}`, { method: 'DELETE' })
          .then(() => loadSessions())
          .catch(() => {});
    }
  };

  const handleAddIp = () => {
    if (!ipInput) return;
    setConfirmModal({
        isOpen: true,
        title: 'Add IP Address',
        message: `Are you sure you want to add IP "${ipInput}" to the ${activeListTab === 'whitelist' ? 'Allowed' : 'Blocked'} list?`,
        confirmText: 'Add IP',
        onConfirm: () => {
            addIpToRule(activeListTab, ipInput);
            setIpInput('');
            closeConfirm();
        }
    });
  };

  const handleRemoveIp = (list: 'whitelist' | 'blacklist', ip: string) => {
      setConfirmModal({
        isOpen: true,
        title: 'Remove Rule',
        message: `Are you sure you want to remove ${ip} from the ${list === 'whitelist' ? 'Allowed' : 'Blocked'} list?`,
        confirmText: 'Remove',
        isDanger: true,
        onConfirm: () => {
            removeIpFromRule(list, ip);
            closeConfirm();
        }
    });
  };

  const handleModeChange = (newMode: 'none' | 'whitelist' | 'blacklist') => {
    if (newMode === ipRules.mode) return;

    if (newMode === 'whitelist') {
        // Prevent enabling whitelist if IP cannot be determined
        if (currentIp === 'Unavailable' || currentIp === 'Loading...') {
             setConfirmModal({
                isOpen: true,
                title: 'Cannot Enable Whitelist',
                message: 'Your current IP address could not be detected. Enabling Whitelist Only mode now would lock you out immediately.\n\nPlease disable ad-blockers or try again when your IP is visible.',
                confirmText: 'Okay',
                isDanger: true,
                onConfirm: closeConfirm
            });
            return;
        }

        const isCurrentWhitelisted = ipRules.whitelist.includes(currentIp);
        if (!isCurrentWhitelisted) {
            // Safety Interceptor
            setConfirmModal({
                isOpen: true,
                title: 'Lockout Prevention',
                message: `⚠️ SAFETY WARNING ⚠️\n\nYour current IP (${currentIp}) is NOT in the whitelist.\n\nEnabling "Whitelist Only" mode now will block your access immediately.\n\nDo you want to add your current IP to the whitelist and enable the mode?`,
                confirmText: 'Add IP & Enable',
                isDanger: true,
                onConfirm: () => {
                    addIpToRule('whitelist', currentIp);
                    updateIpRuleMode('whitelist');
                    closeConfirm();
                }
            });
            return;
        }
    }
    
    // Standard Confirmation
    const modeLabels = { none: 'Off (Allow All)', whitelist: 'Whitelist Only', blacklist: 'Blacklist' };
    setConfirmModal({
        isOpen: true,
        title: 'Change Security Mode',
        message: `Are you sure you want to change the IP Enforcement Mode to "${modeLabels[newMode]}"?`,
        confirmText: 'Confirm Change',
        onConfirm: () => {
            updateIpRuleMode(newMode);
            closeConfirm();
        }
    });
  };

  // --- IP Blocking Simulation Logic ---
  const isCurrentIpBlocked = useMemo(() => {
      if (ipRules.mode === 'none') return false;
      if (ipRules.mode === 'blacklist') return ipRules.blacklist.includes(currentIp);
      if (ipRules.mode === 'whitelist') return !ipRules.whitelist.includes(currentIp);
      return false;
  }, [ipRules, currentIp]);

  // --- Sub-Components ---

  const renderSidebar = () => (
    <div className="w-full lg:w-64 shrink-0 space-y-1">
        <button 
            onClick={() => setActiveSection('sessions')}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-all text-left ${activeSection === 'sessions' ? 'bg-softMint text-darkGreen' : 'text-textSecondary hover:bg-slate-50'}`}
        >
            <Activity size={18} /> Active Sessions
        </button>
        <button 
            onClick={() => setActiveSection('ip_rules')}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-all text-left ${activeSection === 'ip_rules' ? 'bg-softMint text-darkGreen' : 'text-textSecondary hover:bg-slate-50'}`}
        >
            <Globe size={18} /> IP Access Rules
        </button>
    </div>
  );

  const renderSessions = () => {
    const totalPages = Math.ceil(sessions.length / ITEMS_PER_PAGE);
    const paginated = sessions.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    return (
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
            <div className="p-6 border-b border-border flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-bold text-textPrimary flex items-center gap-2"><Shield size={20} className="text-primary"/> Active Sessions</h3>
                    <p className="text-sm text-textSecondary">
                      {role === 'admin' ? 'Monitor all active users and devices across CRM.' : 'Manage devices logged into your account.'}
                    </p>
                    <p className="text-xs text-textMuted mt-1">
                      Active Sessions: {summary.totalSessions} {role === 'admin' ? `| Active Users: ${summary.totalUsersActive}` : ''}
                    </p>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-border">
                        <tr>
                            <th className="px-6 py-4 font-bold text-textMuted uppercase text-xs">Device</th>
                            <th className="px-6 py-4 font-bold text-textMuted uppercase text-xs">IP Address</th>
                            <th className="px-6 py-4 font-bold text-textMuted uppercase text-xs">Location</th>
                            <th className="px-6 py-4 font-bold text-textMuted uppercase text-xs">Last Active</th>
                            <th className="px-6 py-4 font-bold text-textMuted uppercase text-xs text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {paginated.map(session => (
                            <tr key={session.id} className={session.isCurrent ? 'bg-softMint/10' : ''}>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-slate-100 rounded-lg text-textSecondary">
                                            {session.device.includes('iPhone') || session.os === 'iOS' ? <Smartphone size={16}/> : <Laptop size={16}/>}
                                        </div>
                                        <div>
                                            <p className="font-bold text-textPrimary flex items-center gap-2">
                                                {session.device}
                                                {session.isCurrent && <span className="text-[10px] bg-primary/20 text-darkGreen px-1.5 rounded">YOU</span>}
                                            </p>
                                            <p className="text-xs text-textSecondary">{session.browser} on {session.os}</p>
                                            {role === 'admin' && (
                                              <p className="text-xs text-textMuted">{session.userName || 'Unknown'} ({session.userEmail || 'No email'})</p>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 font-mono text-textSecondary">{session.ip}</td>
                                <td className="px-6 py-4">
                                    {session.coords ? (
                                        <div className="flex flex-col">
                                            <span className="text-xs text-darkGreen font-bold flex items-center gap-1"><CheckCircle2 size={12}/> Exact</span>
                                            <a href={`https://maps.google.com/?q=${session.coords.lat},${session.coords.lng}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-xs flex items-center gap-1"><MapPin size={10}/> Map</a>
                                        </div>
                                    ) : (
                                        <span className="text-textSecondary text-xs">{session.location}</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-xs text-textSecondary">
                                  {session.lastActive ? new Date(session.lastActive).toLocaleString() : 'Now'}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        {!session.isCurrent && (
                                            <button onClick={() => handleLogoutSession(session.id)} className="p-1.5 border rounded hover:bg-red-50 text-danger" title="Revoke"><LogOut size={14}/></button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {sessions.length > ITEMS_PER_PAGE && (
                <div className="p-4 border-t border-border flex justify-end gap-2">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 border rounded disabled:opacity-50"><ChevronLeft size={16}/></button>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 border rounded disabled:opacity-50"><ChevronRight size={16}/></button>
                </div>
            )}
        </div>
    );
  };

  const renderIpRules = () => (
    <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-border">
            <h3 className="text-lg font-bold text-textPrimary flex items-center gap-2 mb-2"><Server size={20} className="text-primary"/> IP Access Control</h3>
            <p className="text-sm text-textSecondary mb-6">Manage allowed or blocked IP addresses. Whitelisting restricts access to ONLY the listed IPs.</p>

            <div className="flex flex-col gap-4">
                <div className="flex gap-4 items-center bg-slate-50 p-4 rounded-xl border border-border">
                    <div className="flex-1">
                        <span className="text-xs font-bold text-textMuted uppercase block mb-1">Your Current IP</span>
                        <span className="text-xl font-mono font-bold text-textPrimary">{currentIp}</span>
                    </div>
                    <button onClick={() => setIpInput(currentIp)} className="text-xs font-bold text-primary hover:underline">Use My IP</button>
                </div>

                {isCurrentIpBlocked && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-pulse">
                        <AlertOctagon size={24} className="text-danger shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-bold text-danger">Access Warning</h4>
                            <p className="text-sm text-red-800">
                                Your current IP ({currentIp}) is blocked by the active rules. 
                                <br/><span className="font-bold">You will be automatically logged out momentarily.</span>
                            </p>
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                    <label className="text-xs font-bold text-textMuted uppercase">Enforcement Mode</label>
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button onClick={() => handleModeChange('none')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${ipRules.mode === 'none' ? 'bg-white shadow text-textPrimary' : 'text-textMuted hover:text-textPrimary'}`}>Off (Allow All)</button>
                        <button onClick={() => handleModeChange('whitelist')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${ipRules.mode === 'whitelist' ? 'bg-white shadow text-success' : 'text-textMuted hover:text-textPrimary'}`}>Whitelist Only</button>
                        <button onClick={() => handleModeChange('blacklist')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${ipRules.mode === 'blacklist' ? 'bg-white shadow text-danger' : 'text-textMuted hover:text-textPrimary'}`}>Blacklist</button>
                    </div>
                </div>

                <div className="pt-6 border-t border-border">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex gap-4">
                            <button 
                                onClick={() => setActiveListTab('whitelist')}
                                className={`text-sm font-bold pb-1 border-b-2 transition-all ${activeListTab === 'whitelist' ? 'border-primary text-textPrimary' : 'border-transparent text-textMuted'}`}
                            >
                                Allowed IPs (Whitelist)
                            </button>
                            <button 
                                onClick={() => setActiveListTab('blacklist')}
                                className={`text-sm font-bold pb-1 border-b-2 transition-all ${activeListTab === 'blacklist' ? 'border-danger text-textPrimary' : 'border-transparent text-textMuted'}`}
                            >
                                Blocked IPs (Blacklist)
                            </button>
                        </div>
                        <span className="text-xs text-textMuted bg-slate-100 px-2 py-1 rounded">
                            {activeListTab === 'whitelist' ? ipRules.whitelist.length : ipRules.blacklist.length} rules
                        </span>
                    </div>

                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <input type="text" value={ipInput} onChange={(e) => setIpInput(e.target.value)} placeholder={`Enter IP to ${activeListTab === 'whitelist' ? 'allow' : 'block'} (e.g. 192.168.1.1)`} className="flex-1 px-4 py-2 border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none font-mono text-sm" />
                            <button onClick={handleAddIp} className="px-6 py-2 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700">Add</button>
                        </div>
                        <div className="bg-slate-50 rounded-xl border border-border p-4 max-h-[250px] overflow-y-auto">
                            <div className="space-y-2">
                                {(activeListTab === 'whitelist' ? ipRules.whitelist : ipRules.blacklist).map((ip, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-lg border border-border shadow-sm">
                                        <div className="flex items-center gap-2">
                                            {activeListTab === 'whitelist' ? <CheckCircle2 size={16} className="text-success"/> : <X size={16} className="text-danger"/>}
                                            <span className="font-mono text-sm font-medium">{ip}</span>
                                        </div>
                                        <button onClick={() => handleRemoveIp(activeListTab, ip)} className="text-textMuted hover:text-danger p-1" title="Remove Rule"><X size={16}/></button>
                                    </div>
                                ))}
                                {(activeListTab === 'whitelist' ? ipRules.whitelist : ipRules.blacklist).length === 0 && <p className="text-sm text-textMuted italic text-center py-4">No IP addresses in this list.</p>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row gap-8 animate-in fade-in slide-in-from-right-4 duration-300">
        {renderSidebar()}
        <div className="flex-1 min-w-0">
            {activeSection === 'sessions' && renderSessions()}
            {activeSection === 'ip_rules' && renderIpRules()}
        </div>

      {/* Custom Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-border">
                <div className="p-6">
                    <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-full ${confirmModal.isDanger ? 'bg-red-50 text-danger' : 'bg-softMint/30 text-darkGreen'}`}>
                            {confirmModal.isDanger ? <AlertTriangle size={24}/> : <Shield size={24}/>}
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-textPrimary mb-2">{confirmModal.title}</h3>
                            <p className="text-sm text-textSecondary whitespace-pre-wrap">{confirmModal.message}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-50 p-4 flex justify-end gap-3 border-t border-border">
                    <button 
                        onClick={closeConfirm}
                        className="px-4 py-2 text-sm font-bold text-textSecondary hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={confirmModal.onConfirm}
                        className={`px-4 py-2 text-sm font-bold text-white rounded-lg transition-colors shadow-sm ${confirmModal.isDanger ? 'bg-danger hover:bg-red-600' : 'bg-darkGreen hover:bg-opacity-90'}`}
                    >
                        {confirmModal.confirmText || 'Confirm'}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default SecurityTab;
