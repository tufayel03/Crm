
import React, { useState, useEffect, useMemo } from 'react';
import { useCampaignStore } from '../stores/campaignStore';
import { useLeadsStore } from '../stores/leadsStore';
import { useClientsStore } from '../stores/clientsStore';
import { useServicesStore } from '../stores/servicesStore';
import { useAuthStore } from '../stores/authStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useTeamStore } from '../stores/teamStore';
import { usePermissions } from '../hooks/usePermissions';
import {
    Send, Plus, Users, CheckCircle2, Clock, ChevronRight, X,
    Calendar, Mail, Loader2, Phone, Briefcase, History, Settings, Zap, ChevronDown
} from 'lucide-react';

// Sub-components
import ActiveCampaignsList from '../components/campaigns/ActiveCampaignsList';
import PastCampaignsList from '../components/campaigns/PastCampaignsList';



interface CheckboxMultiSelectProps {
    label: string;
    placeholder: string;
    options: Array<{ value: string; label: string }>;
    values: string[];
    onChange: (next: string[]) => void;
}

const CheckboxMultiSelect: React.FC<CheckboxMultiSelectProps> = ({ label, placeholder, options, values, onChange }) => {
    const [open, setOpen] = useState(false);
    const selectedSet = useMemo(() => new Set(values), [values]);

    const summary = values.length === 0
        ? placeholder
        : values.length <= 2
            ? options.filter(o => selectedSet.has(o.value)).map(o => o.label).join(', ')
            : `${values.length} selected`;

    const toggleValue = (value: string) => {
        if (selectedSet.has(value)) onChange(values.filter(v => v !== value));
        else onChange([...values, value]);
    };

    const allSelected = values.length > 0 && values.length === options.length;

    return (
        <div className="relative">
            <label className="block text-xs font-bold text-textSecondary mb-1">{label}</label>
            <button
                type="button"
                onClick={() => setOpen(prev => !prev)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-white text-left text-sm flex items-center justify-between"
            >
                <span className={`${values.length === 0 ? 'text-textMuted' : 'text-textPrimary'} truncate`}>{summary}</span>
                <ChevronDown size={14} className={`text-textMuted transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-lg shadow-lg z-20 max-h-56 overflow-y-auto p-2 space-y-1">
                    <label className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-50 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={(e) => onChange(e.target.checked ? options.map(o => o.value) : [])}
                            className="rounded border-border text-primary focus:ring-primary"
                        />
                        <span className="text-xs font-bold text-textSecondary">Select All</span>
                    </label>
                    <div className="border-t border-border my-1" />
                    {options.map((opt) => (
                        <label key={opt.value} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-50 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={selectedSet.has(opt.value)}
                                onChange={() => toggleValue(opt.value)}
                                className="rounded border-border text-primary focus:ring-primary"
                            />
                            <span className="text-sm text-textPrimary">{opt.label}</span>
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
};

const Campaigns: React.FC = () => {
    const {
        campaigns, createCampaign,
        templates, sendTestEmail
    } = useCampaignStore();
    const { statuses, leads, outcomes } = useLeadsStore();
    const { clients } = useClientsStore();
    const { plans } = useServicesStore();
    const { user } = useAuthStore();
    const { campaignLimits, updateCampaignLimits } = useSettingsStore();
    const { members } = useTeamStore();
    const { can } = usePermissions();
    const canManageCampaigns = can('manage', 'campaigns');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [step, setStep] = useState(1);
    const [testEmail, setTestEmail] = useState(user?.email || '');
    const [isSendingTest, setIsSendingTest] = useState(false);

    // Settings Form
    const [limitsForm, setLimitsForm] = useState({ hourly: campaignLimits.hourly, daily: campaignLimits.daily });

    // Wizard State
    const [newCampaign, setNewCampaign] = useState({
        name: '',
        templateId: '',
        previewText: '',
        // Filters
        targetStatus: 'All',
        targetStatuses: [] as string[],
        targetAgentId: 'All',
        targetAgentIds: [] as string[],
        targetOutcome: 'All',
        targetOutcomes: [] as string[],
        targetServiceStatus: 'All' as 'All' | 'Active' | 'Expired',
        targetServicePlan: 'All',
        // Schedule
        scheduledAt: '', // ISO String
        scheduleMode: 'now' as 'now' | 'later'
    });

    // Helper to calculate expiration
    const isSubscriptionExpired = (startDate: string, duration: number) => {
        const start = new Date(startDate);
        const end = new Date(start);
        end.setDate(start.getDate() + duration);
        return end < new Date();
    };

    // Derived Audience Count for Wizard
    const matchingLeadsCount = useMemo(() => {
        return leads.filter(l => {
            // Basic Checks
            if (!l.email || !l.email.includes('@')) return false;

            const matchesStatus = newCampaign.targetStatuses.length > 0
                ? newCampaign.targetStatuses.includes(l.status)
                : (newCampaign.targetStatus === 'All' || l.status === newCampaign.targetStatus);
            const matchesAgent = newCampaign.targetAgentIds.length > 0
                ? newCampaign.targetAgentIds.includes(l.assignedAgentId)
                : (newCampaign.targetAgentId === 'All' || l.assignedAgentId === newCampaign.targetAgentId);

            // Outcome Filter
            let matchesOutcome = true;
            if (newCampaign.targetOutcomes.length > 0 || newCampaign.targetOutcome !== 'All') {
                const callNotes = l.notes
                    .filter(n => n.content.includes('Call logged. Outcome: '))
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

                if (callNotes.length === 0) matchesOutcome = false;
                else {
                    const lastOutcome = callNotes[0].content.split('Outcome: ')[1].trim();
                    matchesOutcome = newCampaign.targetOutcomes.length > 0
                        ? newCampaign.targetOutcomes.includes(lastOutcome)
                        : lastOutcome === newCampaign.targetOutcome;
                }
            }

            // Service Filter
            let matchesService = true;
            if (newCampaign.targetServiceStatus !== 'All') {
                const clientRecord = clients.find(c => c.leadId === l.id);
                if (!clientRecord) matchesService = false;
                else {
                    const services = clientRecord.services;
                    if (newCampaign.targetServiceStatus === 'Active') {
                        matchesService = services.some(s => !isSubscriptionExpired(s.startDate, s.duration) && s.status === 'Active' && (newCampaign.targetServicePlan === 'All' || s.type === newCampaign.targetServicePlan));
                    } else if (newCampaign.targetServiceStatus === 'Expired') {
                        matchesService = services.some(s => isSubscriptionExpired(s.startDate, s.duration) && (newCampaign.targetServicePlan === 'All' || s.type === newCampaign.targetServicePlan));
                    }
                }
            }

            return matchesStatus && matchesAgent && matchesOutcome && matchesService;
        }).length;
    }, [leads, clients, newCampaign]);



    // --- Handlers ---
    const handleLaunch = () => {
        const template = templates.find(t => t.id === newCampaign.templateId);
        if (!template) return;

        createCampaign({
            name: newCampaign.name,
            templateId: newCampaign.templateId,
            templateName: template.name,
            previewText: newCampaign.previewText,
            // Targeting
            targetStatus: newCampaign.targetStatus,
            targetStatuses: newCampaign.targetStatuses,
            targetAgentId: newCampaign.targetAgentId,
            targetAgentIds: newCampaign.targetAgentIds,
            targetOutcome: newCampaign.targetOutcome,
            targetOutcomes: newCampaign.targetOutcomes,
            targetServiceStatus: newCampaign.targetServiceStatus,
            targetServicePlan: newCampaign.targetServicePlan,
            // Schedule
            scheduledAt: newCampaign.scheduleMode === 'later' && newCampaign.scheduledAt ? newCampaign.scheduledAt : undefined
        });

        setIsModalOpen(false);
        resetForm();
    };

    const resetForm = () => {
        setStep(1);
        setNewCampaign({
            name: '',
            templateId: '',
            previewText: '',
            targetStatus: 'All',
            targetStatuses: [],
            targetAgentId: 'All',
            targetAgentIds: [],
            targetOutcome: 'All',
            targetOutcomes: [],
            targetServiceStatus: 'All',
            targetServicePlan: 'All',
            scheduledAt: '',
            scheduleMode: 'now'
        });
    };

    const handleSendTest = async () => {
        if (!newCampaign.templateId || !testEmail) return;
        setIsSendingTest(true);
        await sendTestEmail(newCampaign.templateId, testEmail);
        setIsSendingTest(false);
        alert(`Test email sent to ${testEmail}`);
    };

    const saveLimits = () => {
        updateCampaignLimits(limitsForm);
        setIsSettingsOpen(false);
    };

    const AGENTS = members.map(m => ({ id: m.id, name: m.name }));

    return (
        <div className="space-y-8 pb-20">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-textPrimary">Email Campaigns</h2>
                    <p className="text-textSecondary">Create, schedule, and track your marketing outreach.</p>
                </div>
                <div className="flex gap-2">
                    {canManageCampaigns && (
                        <button
                            onClick={() => { setLimitsForm(campaignLimits); setIsSettingsOpen(true); }}
                            className="flex items-center gap-2 px-4 py-3 bg-white border border-border text-textSecondary font-bold rounded-xl hover:bg-slate-50 transition-all"
                            title="Configure sending limits"
                        >
                            <Settings size={20} />
                        </button>
                    )}
                    {canManageCampaigns && (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-2 px-6 py-3 bg-darkGreen text-white font-bold rounded-xl shadow-lg shadow-darkGreen/10 hover:bg-opacity-90 transition-all"
                        >
                            <Plus size={20} /> Create Campaign
                        </button>
                    )}
                </div>
            </div>

            {/* --- Current Limits Badge --- */}
            <div className="flex gap-4">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-lg text-xs font-bold text-blue-800">
                    <Zap size={14} />
                    Sending Speed: {campaignLimits.hourly} / hour
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-50 border border-purple-100 rounded-lg text-xs font-bold text-purple-800">
                    <Calendar size={14} />
                    Daily Limit: {campaignLimits.daily} / day
                </div>
            </div>

            {/* --- Active Campaigns Section --- */}
            <div className="space-y-4">
                <h3 className="font-bold text-lg text-textPrimary flex items-center gap-2">
                    <Send size={20} className="text-primary" /> Active & Upcoming
                </h3>
                <ActiveCampaignsList />
            </div>

            {/* --- Past Campaigns Section --- */}
            <div className="space-y-4 pt-4 border-t border-border">
                <h3 className="font-bold text-lg text-textPrimary flex items-center gap-2">
                    <History size={20} className="text-textMuted" /> Campaign History
                </h3>
                <PastCampaignsList />
            </div>

            {/* --- SETTINGS MODAL --- */}
            {canManageCampaigns && isSettingsOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg text-textPrimary">Sending Configuration</h3>
                            <button onClick={() => setIsSettingsOpen(false)} className="text-textMuted hover:text-danger"><X size={20} /></button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-textSecondary uppercase mb-1">Hourly Limit</label>
                                <input
                                    type="number"
                                    value={limitsForm.hourly}
                                    onChange={(e) => setLimitsForm({ ...limitsForm, hourly: parseInt(e.target.value) })}
                                    className="w-full px-3 py-2 border border-border rounded-lg bg-slate-50 focus:ring-2 focus:ring-primary outline-none"
                                />
                                <p className="text-[10px] text-textMuted mt-1">Maximum emails sent per hour per account.</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-textSecondary uppercase mb-1">Daily Limit</label>
                                <input
                                    type="number"
                                    value={limitsForm.daily}
                                    onChange={(e) => setLimitsForm({ ...limitsForm, daily: parseInt(e.target.value) })}
                                    className="w-full px-3 py-2 border border-border rounded-lg bg-slate-50 focus:ring-2 focus:ring-primary outline-none"
                                />
                                <p className="text-[10px] text-textMuted mt-1">Total limit per 24 hours.</p>
                            </div>

                            <button
                                onClick={saveLimits}
                                className="w-full py-3 bg-darkGreen text-white font-bold rounded-xl hover:bg-opacity-90 mt-2"
                            >
                                Save Settings
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- CREATE CAMPAIGN WIZARD (Modal) --- */}
            {canManageCampaigns && isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh]">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-lg text-textPrimary">Create Campaign</h3>
                            <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="text-textMuted hover:text-danger"><X size={24} /></button>
                        </div>

                        {/* Body */}
                        <div className="p-6 overflow-y-auto">

                            {/* Steps Indicator */}
                            <div className="flex items-center justify-between mb-6 px-2">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className={`flex items-center gap-2 ${step >= i ? 'text-darkGreen' : 'text-textMuted'}`}>
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= i ? 'bg-primary text-darkGreen' : 'bg-slate-200 text-textMuted'}`}>
                                            {i}
                                        </div>
                                        <span className="text-xs font-bold uppercase">{i === 1 ? 'Setup' : i === 2 ? 'Audience' : 'Schedule'}</span>
                                    </div>
                                ))}
                            </div>

                            {step === 1 && (
                                <div className="space-y-4 animate-in slide-in-from-right duration-300">
                                    <div>
                                        <label className="block text-sm font-bold text-textSecondary mb-1">Campaign Name</label>
                                        <input
                                            type="text"
                                            value={newCampaign.name}
                                            onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                                            placeholder="e.g. April Newsletter"
                                            className="w-full px-4 py-2 border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none bg-white"
                                            autoFocus
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-textSecondary mb-1">Select Template</label>
                                        <select
                                            value={newCampaign.templateId}
                                            onChange={(e) => setNewCampaign({ ...newCampaign, templateId: e.target.value })}
                                            className="w-full px-4 py-2 border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none bg-white text-black"
                                        >
                                            <option value="">-- Choose Email Template --</option>
                                            {templates.map(t => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-textSecondary mb-1">Preview Text <span className="font-normal text-textMuted">(Optional)</span></label>
                                        <input
                                            type="text"
                                            value={newCampaign.previewText}
                                            onChange={(e) => setNewCampaign({ ...newCampaign, previewText: e.target.value })}
                                            placeholder="Snippet shown after subject line..."
                                            className="w-full px-4 py-2 border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm bg-white"
                                        />
                                        <p className="text-[10px] text-textMuted mt-1">This text appears in the inbox preview next to the subject line.</p>
                                    </div>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="space-y-4 animate-in slide-in-from-right duration-300">
                                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-center gap-3 text-blue-800">
                                        <Users size={24} />
                                        <div>
                                            <p className="text-xs uppercase font-bold text-blue-600">Estimated Audience</p>
                                            <p className="text-xl font-bold">{matchingLeadsCount} Leads</p>
                                        </div>
                                    </div>

                                    {/* Standard Filters */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <CheckboxMultiSelect
                                            label="Status"
                                            placeholder="All Statuses"
                                            options={statuses.map(s => ({ value: s, label: s }))}
                                            values={newCampaign.targetStatuses}
                                            onChange={(vals) => setNewCampaign({ ...newCampaign, targetStatuses: vals, targetStatus: vals.length === 0 ? 'All' : 'Custom' })}
                                        />
                                        <CheckboxMultiSelect
                                            label="Agent"
                                            placeholder="All Agents"
                                            options={AGENTS.map(a => ({ value: a.id, label: a.name }))}
                                            values={newCampaign.targetAgentIds}
                                            onChange={(vals) => setNewCampaign({ ...newCampaign, targetAgentIds: vals, targetAgentId: vals.length === 0 ? 'All' : 'Custom' })}
                                        />
                                    </div>

                                    {/* Call Outcome Filter */}
                                    <div>
                                        <div className="mb-1 flex items-center gap-2">
                                            <Phone size={14} className="text-textMuted" />
                                            <span className="text-sm font-bold text-textSecondary">Call Outcome</span>
                                        </div>
                                        <CheckboxMultiSelect
                                            label=""
                                            placeholder="All / Any Outcome"
                                            options={outcomes.map(o => ({ value: o, label: `Last Call: ${o}` }))}
                                            values={newCampaign.targetOutcomes}
                                            onChange={(vals) => setNewCampaign({ ...newCampaign, targetOutcomes: vals, targetOutcome: vals.length === 0 ? 'All' : 'Custom' })}
                                        />
                                    </div>

                                    {/* Service Filters */}
                                    <div className="pt-2 border-t border-border mt-2">
                                        <label className="block text-sm font-bold text-textSecondary mb-2 flex items-center gap-2"><Briefcase size={14} className="text-textMuted" /> Services</label>

                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-xs font-bold text-textSecondary mb-1">Subscription Status</label>
                                                <select
                                                    value={newCampaign.targetServiceStatus}
                                                    onChange={(e) => setNewCampaign({ ...newCampaign, targetServiceStatus: e.target.value as any, targetServicePlan: 'All' })}
                                                    className="w-full px-4 py-2 border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none bg-white text-black"
                                                >
                                                    <option value="All">Ignore Service Status</option>
                                                    <option value="Active">Has Active Services</option>
                                                    <option value="Expired">Has Expired Services</option>
                                                </select>
                                            </div>

                                            {/* Conditional Service Plan Dropdown */}
                                            {newCampaign.targetServiceStatus !== 'All' && (
                                                <div className="animate-in fade-in slide-in-from-top-2">
                                                    <label className="block text-xs font-bold text-textSecondary mb-1">
                                                        {newCampaign.targetServiceStatus === 'Active' ? 'Which Active Service?' : 'Which Expired Service?'}
                                                    </label>
                                                    <select
                                                        value={newCampaign.targetServicePlan}
                                                        onChange={(e) => setNewCampaign({ ...newCampaign, targetServicePlan: e.target.value })}
                                                        className="w-full px-4 py-2 border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none bg-white text-black"
                                                    >
                                                        <option value="All">Any {newCampaign.targetServiceStatus} Service</option>
                                                        {plans.map(p => (
                                                            <option key={p.id} value={p.name}>{p.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {step === 3 && (
                                <div className="space-y-6 animate-in slide-in-from-right duration-300">

                                    {/* Scheduling Section */}
                                    <div className="space-y-3">
                                        <h4 className="font-bold text-sm text-textPrimary flex items-center gap-2"><Clock size={16} /> Schedule Campaign</h4>
                                        <div className="flex gap-4">
                                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                                <input
                                                    type="radio"
                                                    checked={newCampaign.scheduleMode === 'now'}
                                                    onChange={() => setNewCampaign({ ...newCampaign, scheduleMode: 'now' })}
                                                    className="text-primary focus:ring-primary"
                                                />
                                                Send Immediately
                                            </label>
                                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                                <input
                                                    type="radio"
                                                    checked={newCampaign.scheduleMode === 'later'}
                                                    onChange={() => setNewCampaign({ ...newCampaign, scheduleMode: 'later' })}
                                                    className="text-primary focus:ring-primary"
                                                />
                                                Schedule for Later
                                            </label>
                                        </div>

                                        {newCampaign.scheduleMode === 'later' && (
                                            <div className="p-4 bg-slate-50 border border-border rounded-xl animate-in fade-in slide-in-from-top-2">
                                                <label className="block text-xs font-bold text-textSecondary mb-2 uppercase">Select Date & Time</label>
                                                <div className="relative">
                                                    <input
                                                        type="datetime-local"
                                                        value={newCampaign.scheduledAt}
                                                        onChange={(e) => setNewCampaign({ ...newCampaign, scheduledAt: e.target.value })}
                                                        className="w-full bg-white text-black border border-border px-4 py-3 rounded-xl text-base focus:ring-2 focus:ring-primary outline-none cursor-pointer"
                                                        min={new Date().toISOString().slice(0, 16)}
                                                    />
                                                    <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-textMuted pointer-events-none" size={18} />
                                                </div>
                                                <p className="text-[10px] text-textMuted mt-2">Local Time: {Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
                                            </div>
                                        )}
                                    </div>

                                    <hr className="border-border" />

                                    {/* Test Email Section */}
                                    <div className="space-y-3">
                                        <h4 className="font-bold text-sm text-textPrimary flex items-center gap-2"><Mail size={16} /> Send Test Email</h4>
                                        <div className="flex gap-2">
                                            <input
                                                type="email"
                                                value={testEmail}
                                                onChange={(e) => setTestEmail(e.target.value)}
                                                className="flex-1 px-3 py-2 border border-border rounded-lg text-sm bg-white"
                                                placeholder="your@email.com"
                                            />
                                            <button
                                                onClick={handleSendTest}
                                                disabled={isSendingTest || !testEmail}
                                                className="px-4 py-2 bg-slate-100 border border-border rounded-lg text-xs font-bold hover:bg-slate-200 disabled:opacity-50"
                                            >
                                                {isSendingTest ? <Loader2 size={16} className="animate-spin" /> : 'Send'}
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-textMuted">Send a test to yourself to verify formatting before launching.</p>
                                    </div>

                                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-sm text-blue-800 flex items-start gap-2">
                                        <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                                        <p>You are about to {newCampaign.scheduleMode === 'later' ? 'schedule' : 'queue'} <b>{matchingLeadsCount} emails</b>.</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-border bg-slate-50 flex justify-between">
                            {step > 1 ? (
                                <button onClick={() => setStep(step - 1)} className="text-textSecondary font-bold hover:text-textPrimary px-4">Back</button>
                            ) : (
                                <div></div>
                            )}

                            {step < 3 ? (
                                <button
                                    onClick={() => setStep(step + 1)}
                                    disabled={step === 1 && (!newCampaign.name || !newCampaign.templateId)}
                                    className="bg-primary text-darkGreen font-bold px-6 py-2 rounded-xl hover:bg-opacity-90 disabled:opacity-50 transition-all flex items-center gap-2"
                                >
                                    Next <ChevronRight size={16} />
                                </button>
                            ) : (
                                <button
                                    onClick={handleLaunch}
                                    disabled={matchingLeadsCount === 0 || (newCampaign.scheduleMode === 'later' && !newCampaign.scheduledAt)}
                                    className="bg-darkGreen text-white font-bold px-6 py-2 rounded-xl hover:bg-opacity-90 disabled:opacity-50 transition-all flex items-center gap-2 shadow-lg shadow-darkGreen/20"
                                >
                                    {newCampaign.scheduleMode === 'later' ? <Clock size={16} /> : <Send size={16} />}
                                    {newCampaign.scheduleMode === 'later' ? 'Schedule Campaign' : 'Launch Now'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Campaigns;
