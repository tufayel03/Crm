
import React, { useState, useRef } from 'react';
import { 
  Users, Briefcase, CheckSquare, 
  Video, Send, Archive,
  Download, Upload, AlertCircle, CheckCircle2, Loader2, FileArchive, RefreshCw, X, AlertTriangle,
  CreditCard, Mail, Folder
} from 'lucide-react';

// Stores
import { useLeadsStore } from '../stores/leadsStore';
import { useClientsStore } from '../stores/clientsStore';
import { useTasksStore } from '../stores/tasksStore';
import { useMeetingsStore } from '../stores/meetingsStore';
import { useCampaignStore } from '../stores/campaignStore';
import { useMailStore } from '../stores/mailStore';

// Helpers
import { exportDatabase, importDatabase, exportToJson, importFromJson, mergeArrays } from '../utils/backupUtils';

// Component
import DataSection from '../components/database/DataSection';
import FileManager from '../components/database/FileManager';

const DatabasePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('mailbox');
  
  // Restore State
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [restoreStatus, setRestoreStatus] = useState<{type: 'success' | 'error', msg: string} | null>(null);
  const [restoreSummary, setRestoreSummary] = useState<Record<string, { added: number; skipped: number }> | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');
  const [importAll, setImportAll] = useState(true);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([
    'dashboard',
    'mailbox',
    'analytics',
    'leads',
    'clients',
    'services',
    'tasks',
    'meetings',
    'templates',
    'campaigns',
    'payments',
    'database',
    'error_logs',
    'settings'
  ]);
  const [exportAll, setExportAll] = useState(true);
  const [selectedExportCollections, setSelectedExportCollections] = useState<string[]>([
    'dashboard',
    'mailbox',
    'analytics',
    'leads',
    'clients',
    'services',
    'tasks',
    'meetings',
    'templates',
    'campaigns',
    'payments',
    'database',
    'error_logs',
    'settings'
  ]);

  // Export State
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState<{type: 'success' | 'error', msg: string} | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Store Hooks
  const leadsStore = useLeadsStore();
  const clientsStore = useClientsStore();
  const tasksStore = useTasksStore();
  const meetingsStore = useMeetingsStore();
  const campaignStore = useCampaignStore();
  const mailStore = useMailStore();

  const tabs = [
    { id: 'mailbox', label: 'Mailbox', icon: Mail },
    { id: 'leads', label: 'Leads', icon: Users },
    { id: 'clients', label: 'Clients', icon: Briefcase },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'meetings', label: 'Meetings', icon: Video },
    { id: 'campaigns', label: 'Campaigns', icon: Send },
    { id: 'templates', label: 'Templates', icon: FileArchive },
    { id: 'files', label: 'File Manager', icon: Folder },
    { id: 'backup', label: 'Backup & Restore', icon: Archive },
  ];

  // --- Handlers for Single Store Operations ---

  const handleImportLeads = async (file: File) => {
      try {
          const data = await importFromJson(file);
          const list = Array.isArray(data) ? data : (data.leads || []);
          const result = await leadsStore.importLeads(list);
          if (result.duplicates.length > 0) {
              alert(`Imported ${result.added} leads.\nSkipped ${result.duplicates.length} duplicates.`);
          }
      } catch (e: any) {
          alert("Import failed: " + e.message);
      }
  };

  const handleImportClients = async (file: File) => {
      try {
          const data = await importFromJson(file);
          // Handle both simple array and store dump format
          const clientsList = Array.isArray(data) ? data : (data.clients || []);
          const result = await clientsStore.importClients(clientsList);
          
          if (result.duplicates.length > 0) {
              alert(`Imported ${result.added} clients.\nSkipped ${result.duplicates.length} duplicates.`);
          }
      } catch (e: any) {
          alert("Import failed: " + e.message);
      }
  };

  const handleImportPayments = async (file: File) => {
      try {
          const data = await importFromJson(file);
          const list = Array.isArray(data) ? data : (data.payments || []);
          const merged = mergeArrays(clientsStore.payments, list);
          useClientsStore.setState({ payments: merged });
          alert(`Imported/Merged ${list.length} payment records.`);
      } catch (e: any) { alert("Import failed: " + e.message); }
  };

  const handleImportTasks = async (file: File) => {
      try {
          const data = await importFromJson(file);
          const list = Array.isArray(data) ? data : (data.tasks || []);
          const merged = mergeArrays(tasksStore.tasks, list);
          useTasksStore.setState({ tasks: merged });
      } catch (e: any) { alert("Import failed: " + e.message); }
  };

  const handleImportMeetings = async (file: File) => {
      try {
          const data = await importFromJson(file);
          const list = Array.isArray(data) ? data : (data.meetings || []);
          const merged = mergeArrays(meetingsStore.meetings, list);
          useMeetingsStore.setState({ meetings: merged });
      } catch (e: any) { alert("Import failed: " + e.message); }
  };

  const handleImportMailbox = async (file: File) => {
      try {
          const data = await importFromJson(file);
          const list = Array.isArray(data) ? data : (data.emails || []);
          const merged = mergeArrays(mailStore.emails, list);
          useMailStore.setState({ emails: merged });
      } catch (e: any) { alert("Import failed: " + e.message); }
  };

  const handleImportCampaigns = async (file: File) => {
      try {
          const data = await importFromJson(file);
          const campaignsList = Array.isArray(data) ? data : (data.campaigns || []);
          const templatesList = !Array.isArray(data) && data.templates ? data.templates : [];
          
          const mergedCamps = mergeArrays(campaignStore.campaigns, campaignsList);
          const mergedTemps = mergeArrays(campaignStore.templates, templatesList);
          
          useCampaignStore.setState({ campaigns: mergedCamps, templates: mergedTemps });
      } catch (e: any) { alert("Import failed: " + e.message); }
  };

  const handleImportTemplates = async (file: File) => {
      try {
          const data = await importFromJson(file);
          const templatesList = Array.isArray(data) ? data : (data.templates || []);
          const mergedTemps = mergeArrays(campaignStore.templates, templatesList);
          useCampaignStore.setState({ templates: mergedTemps });
      } catch (e: any) { alert("Import failed: " + e.message); }
  };

  // --- Bulk Backup Handlers ---

  const handleBackup = async () => {
    try {
        setIsExporting(true);
        setExportProgress(0);
        setExportStatus(null);
        const exportMap: Record<string, string | string[]> = {
          dashboard: 'users',
          mailbox: 'mail',
          analytics: 'campaigns',
          leads: 'leads',
          clients: 'clients',
          services: 'services',
          tasks: 'tasks',
          meetings: 'meetings',
          templates: 'templates',
          campaigns: 'campaigns',
          payments: 'payments',
          database: 'counters',
          error_logs: 'audit',
          settings: 'settings'
        };
        const collectionsToExport = exportAll
          ? undefined
          : Array.from(new Set(
              selectedExportCollections.flatMap((key) => {
                const mapped = exportMap[key];
                return Array.isArray(mapped) ? mapped : (mapped ? [mapped] : []);
              })
            ));
        await exportDatabase((percent) => setExportProgress(percent), collectionsToExport);
        setExportStatus({ type: 'success', msg: 'Backup generated successfully.' });
    } catch (e) {
        console.error(e);
        setExportStatus({ type: 'error', msg: "Failed to generate backup. See console." });
    } finally {
        setIsExporting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setSelectedFile(file);
          setRestoreStatus(null);
          setShowConfirm(false);
      }
      e.target.value = '';
  };

  const clearSelection = () => {
      setSelectedFile(null);
      setRestoreStatus(null);
      setRestoreProgress(0);
      setShowConfirm(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const initiateRestore = () => {
      if (!selectedFile) return;
      setShowConfirm(true);
  };

  const executeRestore = async () => {
      if (!selectedFile) return;

      setIsRestoring(true);
      setRestoreProgress(0);
      setRestoreStatus(null);
      setRestoreSummary(null);
      setShowConfirm(false);

      try {
          const collectionMap: Record<string, string | string[]> = {
            dashboard: 'users',
            mailbox: 'mail',
            analytics: 'campaigns',
            leads: 'leads',
            clients: 'clients',
            services: 'services',
            tasks: 'tasks',
            meetings: 'meetings',
            templates: 'templates',
            campaigns: 'campaigns',
            payments: 'payments',
            database: 'counters',
            error_logs: 'audit',
            settings: 'settings'
          };

          const collectionsToImport = importAll
            ? undefined
            : Array.from(new Set(
                selectedCollections.flatMap((key) => {
                  const mapped = collectionMap[key];
                  return Array.isArray(mapped) ? mapped : (mapped ? [mapped] : []);
                })
              ));
          const result = await importDatabase(selectedFile, (percent) => {
              setRestoreProgress(percent);
          }, restoreMode, collectionsToImport);
          
          setRestoreStatus({
              type: result.success ? 'success' : 'error',
              msg: result.message
          });
          if (result.summary) setRestoreSummary(result.summary);
          
          if (result.success) {
              setTimeout(() => {
                  setRestoreProgress(100);
              }, 500);
          }
      } catch (err: any) {
          console.error("Import Exception:", err);
          setRestoreStatus({
              type: 'error',
              msg: err.message || "An unexpected error occurred during restoration."
          });
      } finally {
          setIsRestoring(false);
      }
  };

  // Drag and Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      
      const file = e.dataTransfer.files?.[0];
      if (file) {
          if (file.name.toLowerCase().endsWith('.zip')) {
              setSelectedFile(file);
              setRestoreStatus(null);
              setShowConfirm(false);
          } else {
              setRestoreStatus({ type: 'error', msg: "Please upload a valid .zip backup file." });
          }
      }
  };

  const collectionOptions = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'mailbox', label: 'Mailbox' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'leads', label: 'Leads' },
    { id: 'clients', label: 'Clients' },
    { id: 'services', label: 'Services' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'meetings', label: 'Meetings' },
    { id: 'templates', label: 'Templates' },
    { id: 'campaigns', label: 'Campaigns' },
    { id: 'payments', label: 'Payments' },
    { id: 'database', label: 'Database' },
    { id: 'error_logs', label: 'Error Logs' },
    { id: 'settings', label: 'Settings' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-textPrimary">Database Management</h2>
          <p className="text-textSecondary">Manage system storage, retention policies, and bulk data operations.</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Tabs */}
        <div className="w-full lg:w-64 shrink-0">
           <div className="bg-white rounded-2xl border border-border overflow-hidden">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-4 text-sm font-bold transition-all border-l-4 ${
                    activeTab === tab.id 
                      ? 'border-primary bg-softMint/30 text-darkGreen' 
                      : 'border-transparent text-textSecondary hover:bg-slate-50'
                  }`}
                >
                  <tab.icon size={18} />
                  {tab.label}
                </button>
              ))}
           </div>
        </div>

        {/* Content Area */}
        <div className="flex-1">
           {activeTab === 'mailbox' && (
             <DataSection 
                title="Mailbox Emails (External)"
                description="Manage sent and received emails in the integrated mailbox."
                count={mailStore.emails.length}
                data={mailStore.emails}
                onPurge={mailStore.clearMailbox}
                onExport={() => exportToJson({ emails: mailStore.emails }, 'matlance_mail.json')}
                onImport={handleImportMailbox}
                icon={Mail}
                itemName="Emails"
             />
           )}

           {activeTab === 'leads' && (
             <DataSection 
                title="Leads Database"
                description="Manage raw lead data, notes, and contact information."
                count={leadsStore.leads.length}
                data={leadsStore.leads}
                onPurge={leadsStore.purgeAll}
                onExport={() => exportToJson({ leads: leadsStore.leads, statuses: leadsStore.statuses, outcomes: leadsStore.outcomes }, 'matlance_leads.json')}
                onImport={handleImportLeads}
                icon={Users}
                itemName="Leads"
             />
           )}

           {activeTab === 'clients' && (
             <DataSection 
                title="Clients Profile Data"
                description="Manage client profiles, service subscriptions, and documents. Payments are managed separately."
                count={clientsStore.clients.length}
                data={clientsStore.clients}
                onPurge={clientsStore.purgeAll}
                onExport={() => exportToJson({ clients: clientsStore.clients }, 'matlance_clients.json')}
                onImport={handleImportClients}
                icon={Briefcase}
                itemName="Clients"
             />
           )}

           {activeTab === 'payments' && (
             <DataSection 
                title="Payments & Revenue Data"
                description="Manage invoice records, transaction history, and revenue data."
                count={clientsStore.payments.length}
                data={clientsStore.payments}
                onPurge={() => clientsStore.bulkDeletePayments(clientsStore.payments.map(p => p.id))}
                onExport={() => exportToJson({ payments: clientsStore.payments }, 'matlance_payments.json')}
                onImport={handleImportPayments}
                icon={CreditCard}
                itemName="Transactions"
             />
           )}

           {activeTab === 'tasks' && (
             <DataSection 
                title="Tasks"
                description="Manage all pending and completed tasks assigned to users."
                count={tasksStore.tasks.length}
                data={tasksStore.tasks}
                onPurge={tasksStore.purgeAll}
                onExport={() => exportToJson({ tasks: tasksStore.tasks }, 'matlance_tasks.json')}
                onImport={handleImportTasks}
                icon={CheckSquare}
                itemName="Tasks"
             />
           )}

           {activeTab === 'meetings' && (
             <DataSection 
                title="Meetings Schedule"
                description="Manage scheduled, completed, and cancelled meeting records in the calendar."
                count={meetingsStore.meetings.length}
                data={meetingsStore.meetings}
                onPurge={meetingsStore.purgeAll}
                onExport={() => exportToJson({ meetings: meetingsStore.meetings }, 'matlance_meetings.json')}
                onImport={handleImportMeetings}
                icon={Video}
                itemName="Meetings"
             />
           )}

          {activeTab === 'campaigns' && (
             <div className="space-y-8">
                <DataSection 
                    title="Email Campaigns & Templates"
                    description="Manage campaign history, stats, queues, and design templates."
                    count={campaignStore.campaigns.length}
                    data={{ campaigns: campaignStore.campaigns, templates: campaignStore.templates }}
                    onPurge={() => { campaignStore.purgeAllCampaigns(); campaignStore.purgeAllTemplates(); }}
                    onExport={() => exportToJson({ campaigns: campaignStore.campaigns, templates: campaignStore.templates }, 'matlance_campaigns.json')}
                    onImport={handleImportCampaigns}
                    icon={Send}
                    itemName="Campaign Data"
                />
             </div>
           )}

           {activeTab === 'templates' && (
             <DataSection 
                title="Email Templates"
                description="Manage saved email templates for campaigns and notifications."
                count={campaignStore.templates.length}
                data={campaignStore.templates}
                onPurge={campaignStore.purgeAllTemplates}
                onExport={() => exportToJson({ templates: campaignStore.templates }, 'matlance_templates.json')}
                onImport={handleImportTemplates}
                icon={FileArchive}
                itemName="Templates"
             />
           )}

           {activeTab === 'files' && (
             <FileManager />
           )}

           {/* BACKUP & RESTORE TAB */}
           {activeTab === 'backup' && (
             <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-border">
                    <h3 className="text-lg font-bold text-textPrimary flex items-center gap-2 mb-2">
                        <Archive size={20} className="text-primary" /> Disaster Recovery
                    </h3>
                    <p className="text-sm text-textSecondary mb-8">
                        Export your entire workspace database as a ZIP file (users, settings, leads, clients, payments, tasks, meetings, campaigns, templates, mail, services, and logs).
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Export Card */}
                        <div className="p-6 bg-slate-50 rounded-xl border border-border flex flex-col items-center text-center">
                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-primary mb-4 shadow-sm">
                                <Download size={24} />
                            </div>
                            <h4 className="font-bold text-textPrimary mb-2">Export Full Backup</h4>
                            <p className="text-xs text-textSecondary mb-6">
                                Downloads a full backup of every collection in your database.
                            </p>
                            <button 
                                onClick={handleBackup}
                                disabled={isExporting}
                                className="px-6 py-3 bg-darkGreen text-white font-bold rounded-xl hover:bg-opacity-90 shadow-lg shadow-darkGreen/10 transition-all w-full disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {isExporting ? 'Generating...' : 'Download Database'}
                            </button>
                            {!isExporting && (
                              <div className="w-full mt-4 p-3 border border-border rounded-lg bg-white text-xs text-textSecondary">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="font-bold text-textPrimary">What to Export</div>
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={exportAll}
                                      onChange={(e) => setExportAll(e.target.checked)}
                                    />
                                    Export all
                                  </label>
                                </div>
                                <div className={`grid grid-cols-1 md:grid-cols-2 gap-2 ${exportAll ? 'opacity-50 pointer-events-none' : ''}`}>
                                  {collectionOptions.map(option => (
                                    <label key={option.id} className="flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={selectedExportCollections.includes(option.id)}
                                        onChange={(e) => {
                                          setSelectedExportCollections(prev => {
                                            if (e.target.checked) return [...prev, option.id];
                                            return prev.filter(id => id !== option.id);
                                          });
                                        }}
                                      />
                                      {option.label}
                                    </label>
                                  ))}
                                </div>
                              </div>
                            )}
                            {isExporting && (
                                <div className="w-full mt-4">
                                    <div className="flex justify-between text-xs font-bold text-textSecondary mb-1">
                                        <span>Creating ZIP...</span>
                                        <span>{exportProgress}%</span>
                                    </div>
                                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-primary transition-all duration-300 ease-out" 
                                            style={{ width: `${exportProgress}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )}
                            {exportStatus && !isExporting && (
                              <div className={`mt-4 w-full p-3 rounded-lg border text-xs flex items-start gap-2 ${
                                exportStatus.type === 'success'
                                  ? 'bg-green-50 border-green-200 text-green-800'
                                  : 'bg-red-50 border-red-200 text-red-800'
                              }`}>
                                {exportStatus.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                                <div className="text-left">{exportStatus.msg}</div>
                              </div>
                            )}
                        </div>

                        {/* Import Card with Drag & Drop */}
                        <div 
                            className={`p-6 bg-slate-50 rounded-xl border-2 border-dashed flex flex-col items-center text-center relative overflow-hidden transition-all ${
                                isDragging ? 'border-primary bg-softMint/20' : 'border-border'
                            }`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                        >
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleFileSelect} 
                                accept=".zip" 
                                className="hidden" 
                            />

                            {/* Icon - Click to browse */}
                            <button 
                                onClick={() => !isRestoring && !showConfirm && fileInputRef.current?.click()}
                                disabled={isRestoring || showConfirm}
                                className={`w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm transition-transform ${isDragging ? 'scale-110 text-primary' : 'text-blue-600'} ${!isRestoring && !showConfirm && 'cursor-pointer hover:scale-105'}`}
                            >
                                {isRestoring ? <Loader2 size={32} className="animate-spin" /> : selectedFile ? <FileArchive size={32} /> : <Upload size={32} />}
                            </button>

                            <h4 className="font-bold text-textPrimary mb-2">
                                {selectedFile ? 'Backup File Selected' : (isDragging ? 'Drop to Select' : 'Restore Database')}
                            </h4>
                            
                            <div className="text-xs text-textSecondary mb-6 min-h-[20px]">
                                {selectedFile ? (
                                    <span className="font-mono bg-slate-200 px-2 py-1 rounded text-textPrimary">{selectedFile.name}</span>
                                ) : (
                                    <>
                                        {isDragging ? 'Release to select file' : 'Drag and drop your .zip backup file here.'}
                                        {!isDragging && <br/>}
                                        {!isDragging && <span className="text-primary font-bold cursor-pointer hover:underline" onClick={() => fileInputRef.current?.click()}>Click icon to browse</span>}
                                    </>
                                )}
                            </div>
                            
                            {/* Action Buttons */}
                            {selectedFile && !showConfirm && !isRestoring && (
                                <div className="flex gap-2 w-full animate-in fade-in slide-in-from-bottom-2">
                                    <button 
                                        onClick={clearSelection}
                                        className="flex-1 px-4 py-3 bg-white border border-border text-textSecondary font-bold rounded-xl hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
                                    >
                                        <X size={16} /> Cancel
                                    </button>
                                    <button 
                                        onClick={initiateRestore}
                                        className="flex-[2] px-6 py-3 bg-primary text-darkGreen font-bold rounded-xl hover:bg-opacity-90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                                    >
                                        <RefreshCw size={18} /> Restore Database
                                    </button>
                                </div>
                            )}

                            {/* Restore Mode */}
                            {selectedFile && !showConfirm && !isRestoring && (
                              <div className="w-full mt-4 p-3 border border-border rounded-lg bg-white text-xs text-textSecondary">
                                <div className="font-bold text-textPrimary mb-2">Import Mode</div>
                                <label className="flex items-center gap-2 mb-2 cursor-pointer">
                                  <input
                                    type="radio"
                                    name="restoreMode"
                                    value="merge"
                                    checked={restoreMode === 'merge'}
                                    onChange={() => setRestoreMode('merge')}
                                  />
                                  Merge (skip duplicates)
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="radio"
                                    name="restoreMode"
                                    value="replace"
                                    checked={restoreMode === 'replace'}
                                    onChange={() => setRestoreMode('replace')}
                                  />
                                  Replace (delete existing first)
                                </label>
                              </div>
                            )}

                            {/* Collection Selection */}
                            {selectedFile && !showConfirm && !isRestoring && (
                              <div className="w-full mt-4 p-3 border border-border rounded-lg bg-white text-xs text-textSecondary">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="font-bold text-textPrimary">What to Import</div>
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={importAll}
                                      onChange={(e) => setImportAll(e.target.checked)}
                                    />
                                    Import all
                                  </label>
                                </div>
                                <div className={`grid grid-cols-1 md:grid-cols-2 gap-2 ${importAll ? 'opacity-50 pointer-events-none' : ''}`}>
                                  {collectionOptions.map(option => (
                                    <label key={option.id} className="flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={selectedCollections.includes(option.id)}
                                        onChange={(e) => {
                                          setSelectedCollections(prev => {
                                            if (e.target.checked) return [...prev, option.id];
                                            return prev.filter(id => id !== option.id);
                                          });
                                        }}
                                      />
                                      {option.label}
                                    </label>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Confirmation UI (Replaces window.confirm for sandbox compatibility) */}
                            {showConfirm && (
                                <div className="w-full bg-yellow-50 border border-yellow-200 rounded-xl p-4 animate-in fade-in zoom-in-95">
                                    <div className="flex items-center gap-2 text-yellow-800 font-bold mb-2">
                                        <AlertTriangle size={18} /> Confirm Restore
                                    </div>
                                    <p className="text-xs text-yellow-800 mb-4 text-left">
                                        {restoreMode === 'replace'
                                          ? <>This will <b>replace</b> your current database with the contents of <b>{selectedFile?.name}</b>. Existing records will be removed.</>
                                          : <>This will merge the contents of <b>{selectedFile?.name}</b> into your current database. Existing records will be preserved; new ones will be added.</>
                                        }
                                    </p>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => setShowConfirm(false)}
                                            className="flex-1 py-2 bg-white border border-yellow-200 text-yellow-800 font-bold rounded-lg text-xs hover:bg-yellow-100"
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            onClick={executeRestore}
                                            className="flex-1 py-2 bg-yellow-500 text-white font-bold rounded-lg text-xs hover:bg-yellow-600 shadow-sm"
                                        >
                                            {restoreMode === 'replace' ? 'Yes, Replace Data' : 'Yes, Merge Data'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Progress Bar */}
                            {isRestoring && (
                                <div className="w-full mt-4">
                                    <div className="flex justify-between text-xs font-bold text-textSecondary mb-1">
                                        <span>Restoring Data...</span>
                                        <span>{restoreProgress}%</span>
                                    </div>
                                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-primary transition-all duration-300 ease-out" 
                                            style={{ width: `${restoreProgress}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Restore Status Message */}
                    {restoreStatus && (
                        <div className={`mt-6 p-4 rounded-xl border flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 ${
                            restoreStatus.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
                        }`}>
                            {restoreStatus.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                            <div>
                                <h5 className="font-bold text-sm">{restoreStatus.type === 'success' ? 'Database Merged Successfully' : 'Merge Failed'}</h5>
                                <p className="text-xs mt-1">{restoreStatus.msg}</p>
                            </div>
                        </div>
                    )}
                    {restoreSummary && restoreStatus?.type === 'success' && (
                      <div className="mt-4 p-4 rounded-xl border border-border bg-white">
                        <div className="text-sm font-bold text-textPrimary mb-2">Import Summary</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-textSecondary">
                          {Object.entries(restoreSummary).map(([name, stats]) => (
                            <div key={name} className="flex items-center justify-between border border-border rounded-lg px-3 py-2">
                              <span className="font-semibold text-textPrimary capitalize">{name}</span>
                              <span className="text-textMuted">Added {stats.added} • Skipped {stats.skipped}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default DatabasePage;
