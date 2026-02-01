
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLeadsStore } from '../stores/leadsStore';
import { useAuthStore } from '../stores/authStore';
import { useClientsStore } from '../stores/clientsStore';
import { useTeamStore } from '../stores/teamStore';
import { usePermissions } from '../hooks/usePermissions'; // Permission Hook
import { downloadDuplicates } from '../utils/exportHelpers';
import { createWorkbookFromJson, downloadWorkbook, loadWorkbookFromArrayBuffer, parseCsvToJson, sheetToJson } from '../utils/excelUtils';
import { 
  Plus, Upload, Trash2, Settings, X, 
  ChevronLeft, ChevronRight, AlertTriangle, Phone, CheckCircle2, Loader2, Download
} from 'lucide-react';
import { LeadStatus, Lead } from '../types';

// Components
import LeadsTable from '../components/leads/LeadsTable';
import LeadsToolbar from '../components/leads/LeadsToolbar';
import BulkActionsBar from '../components/leads/BulkActionsBar';
import LeadFormModal from '../components/leads/LeadFormModal';

const Leads: React.FC = () => {
  const { 
    leads, statuses, outcomes, 
    revealContact, addLead, updateLead, bulkDelete, bulkAssign, bulkStatusUpdate, 
    addCustomStatus, removeCustomStatus, addOutcome, removeOutcome,
    purgeAll, importLeads 
  } = useLeadsStore();
  
  const { role, user } = useAuthStore();
  const { clients, convertLeadToClient } = useClientsStore();
  const { members, fetchMembers } = useTeamStore();
  const { can } = usePermissions(); // Hook
  
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Permissions
  const canManage = can('manage', 'leads');
  const canExport = can('export', 'leads');

  // Filtering & Pagination State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [agentFilter, setAgentFilter] = useState('All');
  const [outcomeFilter, setOutcomeFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState('1'); 
  const itemsPerPage = 50;
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // Modals State
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false); 
  const [isOutcomeModalOpen, setIsOutcomeModalOpen] = useState(false);
  const [isLeadFormModalOpen, setIsLeadFormModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [isBulkAssignModalOpen, setIsBulkAssignModalOpen] = useState(false);
  const [isBulkStatusModalOpen, setIsBulkStatusModalOpen] = useState(false);
  
  // Progress State for Bulk Update
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);

  // Duplicate Result State
  const [duplicatesFound, setDuplicatesFound] = useState<any[]>([]);
  const [importStats, setImportStats] = useState({ added: 0, count: 0 });
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  // Confirmation Modals
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);
  const [statusToDelete, setStatusToDelete] = useState<string | null>(null);
  const [outcomeToDelete, setOutcomeToDelete] = useState<string | null>(null);
  
  // Form Data
  const [newStatusName, setNewStatusName] = useState('');
  const [newOutcomeName, setNewOutcomeName] = useState('');
  const [targetAgentId, setTargetAgentId] = useState('');
  const [targetStatus, setTargetStatus] = useState('');

  const isAdmin = role === 'admin' || role === 'manager';

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const availableAgents = useMemo(() => {
    return members
      .filter(m => m.role !== 'client' && m.status !== 'blocked')
      .map(m => ({ id: m.id, name: m.name || m.email || 'Unnamed User' }));
  }, [members]);

  useEffect(() => {
    if (!targetAgentId) {
      setTargetAgentId(availableAgents[0]?.id || '');
    }
  }, [availableAgents, targetAgentId]);

  // --- Filtering Logic ---
  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      const safeName = String(l.name || '');
      const safeEmail = String(l.email || '');
      const safeId = l.readableId ? String(l.readableId) : '';

      const matchesSearch = safeName.toLowerCase().includes(search.toLowerCase()) || 
                            safeEmail.toLowerCase().includes(search.toLowerCase()) ||
                            safeId.includes(search);
      
      const matchesStatus = statusFilter === 'All' || l.status === statusFilter;
      const matchesAgent = agentFilter === 'All' || l.assignedAgentId === agentFilter;
      const matchesRole = role === 'agent' ? l.assignedAgentId === user?.id : true;
      
      let matchesOutcome = true;
      if (outcomeFilter !== 'All') {
         const callNotes = l.notes
            .filter(n => (String(n.content || '')).includes('Call logged. Outcome: '))
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
         
         if (callNotes.length > 0 && callNotes[0].content) {
            const parts = String(callNotes[0].content).split('Outcome: ');
            if (parts.length > 1) {
                const lastOutcome = parts[1].trim();
                matchesOutcome = lastOutcome === outcomeFilter;
            } else {
                matchesOutcome = false;
            }
         } else {
            matchesOutcome = false;
         }
      }

      return matchesSearch && matchesStatus && matchesAgent && matchesOutcome && matchesRole;
    }).sort((a, b) => a.readableId - b.readableId); // ASCENDING SORT: ID 1 First
  }, [leads, search, statusFilter, agentFilter, outcomeFilter, role, user]);

  // --- Pagination Logic ---
  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);
  const paginatedLeads = filteredLeads.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (newPage: number) => {
    const page = Math.max(1, Math.min(newPage, totalPages));
    setCurrentPage(page);
    setPageInput(page.toString());
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(pageInput);
    if (!isNaN(page)) {
      handlePageChange(page);
    } else {
      setPageInput(currentPage.toString());
    }
  };

  // --- Selection Handlers ---
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const selectPage = () => {
    const pageIds = paginatedLeads.map(l => l.id);
    const allSelected = pageIds.every(id => selectedIds.includes(id));
    
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...pageIds])]);
    }
  };

  const handleSelectAllFiltered = () => {
      const allIds = filteredLeads.map(l => l.id);
      setSelectedIds(allIds);
  };

  const isPageSelected = useMemo(() => 
    paginatedLeads.length > 0 && paginatedLeads.every(l => selectedIds.includes(l.id)), 
  [paginatedLeads, selectedIds]);

  const isAllSelected = useMemo(() => {
      if (filteredLeads.length === 0) return false;
      if (selectedIds.length < filteredLeads.length) return false;
      const selectedSet = new Set(selectedIds);
      return filteredLeads.every(l => selectedSet.has(l.id));
  }, [filteredLeads, selectedIds]);

  const handleRangeSelect = (e: React.FormEvent) => {
    e.preventDefault();
    const start = parseInt(rangeStart);
    const end = parseInt(rangeEnd);
    
    if (isNaN(start) || isNaN(end)) return;

    const leadsInRange = leads.filter(l => l.readableId >= start && l.readableId <= end);
    const idsInRange = leadsInRange.map(l => l.id);
    
    setSelectedIds(prev => [...new Set([...prev, ...idsInRange])]);
  };

  // --- Bulk Actions ---
  const executeBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setIsDeleteModalOpen(true);
  };

  const confirmBulkDelete = async () => {
    await bulkDelete(selectedIds);
    setSelectedIds([]);
    setIsDeleteModalOpen(false);
  };

  const openBulkAssign = () => {
    setTargetAgentId(availableAgents[0]?.id || '');
    setIsBulkAssignModalOpen(true);
  };

  const confirmBulkAssign = async () => {
    if (!targetAgentId) {
      await bulkAssign(selectedIds, '', 'Unassigned');
      setSelectedIds([]);
      setIsBulkAssignModalOpen(false);
      return;
    }
    const agent = availableAgents.find(a => a.id === targetAgentId);
    if (!agent) return;
    await bulkAssign(selectedIds, agent.id, agent.name);
    setSelectedIds([]);
    setIsBulkAssignModalOpen(false);
  };

  const openBulkStatus = () => {
    setTargetStatus(statuses[0]);
    setIsBulkStatusModalOpen(true);
  };

  const confirmBulkStatus = async () => {
    if (targetStatus && selectedIds.length > 0) {
      setIsUpdatingStatus(true);
      setUpdateProgress(0);

      const batchSize = 20; // Process 20 at a time to keep UI responsive
      const total = selectedIds.length;
      let convertedCount = 0;

      for (let i = 0; i < total; i += batchSize) {
          const batch = selectedIds.slice(i, i + batchSize);
          
          // 1. Update Status
          await bulkStatusUpdate(batch, targetStatus as LeadStatus);

          // 2. Auto-convert logic
          if (['Converted', 'Closed Won'].includes(targetStatus)) {
            const batchLeads = leads.filter(l => batch.includes(l.id));
            batchLeads.forEach(lead => {
              const isClient = clients.some(c => c.leadId === lead.id);
              if (!isClient) {
                 convertLeadToClient(lead, lead.name); 
                 convertedCount++;
              }
            });
          }

          // 3. Update Progress
          const currentProgress = Math.min(100, Math.round(((i + batch.length) / total) * 100));
          setUpdateProgress(currentProgress);
          
          // 4. Yield to main thread to allow UI render
          await new Promise(resolve => setTimeout(resolve, 50)); 
      }

      setIsUpdatingStatus(false);
      setUpdateProgress(0);
      setSelectedIds([]);
      setIsBulkStatusModalOpen(false);
    }
  };

  const handlePurgeAll = () => {
    setIsPurgeModalOpen(true);
  };

  const confirmPurgeAll = async () => {
    await purgeAll();
    setIsPurgeModalOpen(false);
  };

  // --- Add/Remove Status Handler ---
  const handleAddStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (newStatusName) {
      addCustomStatus(newStatusName);
      setNewStatusName('');
    }
  };

  const handleRemoveStatus = (status: string) => {
    const leadsWithStatus = leads.filter(l => l.status === status).length;
    if (leadsWithStatus > 0) {
      alert(`Cannot delete status "${status}".\n\nIt is currently assigned to ${leadsWithStatus} leads. Please reassign these leads before deleting the status.`);
      return;
    }
    
    setStatusToDelete(status);
  };

  const confirmStatusDelete = () => {
    if (statusToDelete) {
      removeCustomStatus(statusToDelete);
      setStatusToDelete(null);
    }
  };

  // --- Add/Remove Outcome Handler ---
  const handleAddOutcome = (e: React.FormEvent) => {
    e.preventDefault();
    if (newOutcomeName) {
      addOutcome(newOutcomeName);
      setNewOutcomeName('');
    }
  };

  const handleRemoveOutcome = (outcome: string) => {
    // Check if this outcome is used in any notes
    const leadsWithOutcome = leads.filter(l => 
        l.notes.some(n => (String(n.content || '')).includes(`Outcome: ${outcome}`))
    ).length;

    if (leadsWithOutcome > 0) {
      alert(`Cannot delete outcome "${outcome}".\n\nIt is currently referenced in the history of ${leadsWithOutcome} leads.`);
      return;
    }

    setOutcomeToDelete(outcome);
  };

  const confirmOutcomeDelete = () => {
    if (outcomeToDelete) {
      removeOutcome(outcomeToDelete);
      setOutcomeToDelete(null);
    }
  };

  // --- Lead Form Handler (Add/Edit) ---
  const handleSaveLead = async (leadData: any) => {
    if (editingLead) {
        // Edit Mode
        await updateLead(editingLead.id, leadData);
    } else {
        // Add Mode
        const normalizedEmail = leadData.email.toLowerCase().trim();
        const normalizedPhone = leadData.phone.replace(/\D/g, '');
        
        const isDuplicate = leads.some(lead => {
          const leadEmail = lead.email ? lead.email.toLowerCase().trim() : '';
          const leadPhone = lead.phone ? lead.phone.replace(/\D/g, '') : '';
          return (normalizedEmail && leadEmail === normalizedEmail) || 
                 (normalizedPhone && leadPhone === normalizedPhone);
        });

        if (isDuplicate) {
          alert('A lead with this email or phone number already exists.');
          return;
        }
        await addLead(leadData);
    }
    setIsLeadFormModalOpen(false);
    setEditingLead(null);
  };

  const handleEditLead = (lead: Lead) => {
      setEditingLead(lead);
      setIsLeadFormModalOpen(true);
  };

  // --- XLSX Export/Import ---
  const handleExport = async () => {
    if (!canExport) return alert("You do not have permission to export data.");

    // Prioritize selected IDs. If no selection, use currently filtered list.
    let dataToExport;
    
    if (selectedIds.length > 0) {
      // Export specifically selected items (ignore filters)
      dataToExport = leads.filter(l => selectedIds.includes(l.id));
    } else {
      // Export all items in current filtered view
      dataToExport = filteredLeads;
    }

    const exportData = dataToExport.map(l => ({
      ID: l.readableId,
      'Unique ID': l.shortId,
      Name: l.name,
      Email: l.email,
      Phone: l.phone,
      Country: l.country,
      Status: l.status,
      Agent: l.assignedAgentName
    }));

    const wb = createWorkbookFromJson("Leads", exportData);
    await downloadWorkbook(wb, `Matlance_Leads_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleImportClick = () => {
      if (!canExport) return alert("Importing requires export/data permissions.");
      fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);

    const reader = new FileReader();
    const isCsv = file.name.toLowerCase().endsWith('.csv');

    reader.onload = async (evt) => {
      try {
          const data = evt.target?.result;
          let jsonData: any[] = [];

          if (isCsv) {
              jsonData = parseCsvToJson(String(data || ''));
          } else {
              const workbook = await loadWorkbookFromArrayBuffer(data as ArrayBuffer);
              const sheet = workbook.worksheets[0];
              if (!sheet) {
                  alert("No worksheet found in file.");
                  return;
              }
              jsonData = sheetToJson(sheet);
          }
          
          // Smart Column Mapping
          const mappedData = jsonData.map((row: any) => {
              const newRow: any = {};
              Object.keys(row).forEach(key => {
                  const k = key.toLowerCase().trim();
                  // Capture Unique ID
                  if (k === 'unique id' || k === 'short id' || k === 'id') newRow.uniqueId = row[key];
                  else if (k === 'name' || k.includes('full name') || k.includes('contact')) newRow.name = row[key];
                  else if (k.includes('email')) newRow.email = row[key];
                  else if (k.includes('phone') || k.includes('mobile')) newRow.phone = row[key];
                  else if (k.includes('country') || k.includes('region')) newRow.country = row[key];
                  else if (k === 'status') newRow.status = row[key]; 
                  else if (k.includes('note') || k.includes('comment') || k.includes('remarks')) newRow.note = row[key];
              });
              // Return cleaned row + original for troubleshooting duplicate export if needed
              return { ...newRow, _raw: row };
          });

          const validData = mappedData.filter(d => d.name || d.email);
          if (validData.length === 0) {
              alert("No valid data found in file.");
              return;
          }

          const result = await importLeads(validData);
          
          setImportStats({ added: result.added, count: result.duplicates.length });
          setDuplicatesFound(result.duplicates);
          
          if (result.duplicates.length > 0) {
              setShowDuplicateModal(true);
          } else {
              alert(`Import Complete!\nAdded: ${result.added} leads.`);
          }

      } catch (err: any) {
          alert("Failed to parse file: " + err.message);
      } finally {
          setIsImporting(false);
          e.target.value = '';
      }
    };
    
    // Small timeout to allow UI to render loading state before heavy parsing
    setTimeout(() => {
        if (isCsv) reader.readAsText(file);
        else reader.readAsArrayBuffer(file);
    }, 100);
  };

  const handleDownloadDuplicates = () => {
      downloadDuplicates(duplicatesFound, 'leads');
      setShowDuplicateModal(false);
  };

  return (
    <div className="space-y-6 pb-20 relative">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx, .csv" className="hidden" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-textPrimary">Leads Repository</h2>
          <p className="text-textSecondary">Manage {leads.length} leads efficiently.</p>
        </div>
        <div className="flex gap-2">
           {isAdmin && (
             <>
                <button onClick={() => setIsOutcomeModalOpen(true)} className="px-4 py-2 border border-border bg-white text-textSecondary font-semibold rounded-xl hover:bg-slate-50 transition-all flex items-center gap-2">
                  <Phone size={18} /> Outcomes
                </button>
                <button onClick={() => setIsStatusModalOpen(true)} className="px-4 py-2 border border-border bg-white text-textSecondary font-semibold rounded-xl hover:bg-slate-50 transition-all flex items-center gap-2">
                  <Settings size={18} /> Statuses
                </button>
                {canExport && (
                    <button 
                        onClick={handleImportClick} 
                        disabled={isImporting}
                        className="px-4 py-2 border border-border bg-white text-textSecondary font-semibold rounded-xl hover:bg-slate-50 transition-all flex items-center gap-2 disabled:opacity-70"
                    >
                    {isImporting ? <Loader2 size={18} className="animate-spin text-primary" /> : <Upload size={18} />} 
                    {isImporting ? 'Processing...' : 'Import'}
                    </button>
                )}
                {canManage && (
                    <button onClick={handlePurgeAll} className="px-4 py-2 border border-danger text-danger font-semibold rounded-xl hover:bg-red-50 transition-all flex items-center gap-2">
                        <Trash2 size={18} /> Purge All
                    </button>
                )}
             </>
          )}
          {canManage && (
            <button 
                onClick={() => { setEditingLead(null); setIsLeadFormModalOpen(true); }}
                className="flex items-center gap-2 px-6 py-3 bg-darkGreen text-white font-bold rounded-xl shadow-lg shadow-darkGreen/10 hover:bg-opacity-90 transition-all"
            >
                <Plus size={20} /> New Lead
            </button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <LeadsToolbar 
        search={search} setSearch={setSearch}
        statusFilter={statusFilter} setStatusFilter={setStatusFilter}
        agentFilter={agentFilter} setAgentFilter={setAgentFilter}
        outcomeFilter={outcomeFilter} setOutcomeFilter={setOutcomeFilter}
        statuses={statuses}
        outcomes={outcomes}
        agents={availableAgents}
        rangeStart={rangeStart} setRangeStart={setRangeStart}
        rangeEnd={rangeEnd} setRangeEnd={setRangeEnd}
        onRangeSelect={handleRangeSelect}
        onExport={handleExport}
        isAdmin={isAdmin}
      />

      {/* Select All Banner */}
      {isPageSelected && !isAllSelected && filteredLeads.length > paginatedLeads.length && (
        <div className="flex items-center justify-center gap-2 p-3 bg-blue-50 border border-blue-200 text-blue-800 text-sm rounded-xl animate-in fade-in slide-in-from-top-2 shadow-sm">
            <CheckCircle2 size={16} />
            <span>All <b>{paginatedLeads.length}</b> leads on this page are selected.</span>
            <button 
                onClick={handleSelectAllFiltered}
                className="font-bold underline hover:text-blue-900 ml-1"
            >
                Select all {filteredLeads.length} leads matching current filters
            </button>
        </div>
      )}
      
      {isAllSelected && filteredLeads.length > paginatedLeads.length && (
         <div className="flex items-center justify-center gap-2 p-3 bg-softMint border border-primary text-darkGreen text-sm rounded-xl animate-in fade-in slide-in-from-top-2 shadow-sm">
            <CheckCircle2 size={16} />
            <span>All <b>{filteredLeads.length}</b> leads are selected.</span>
            <button 
                onClick={() => setSelectedIds([])}
                className="font-bold underline hover:text-green-900 ml-1"
            >
                Clear selection
            </button>
        </div>
      )}

      {/* Table */}
      <LeadsTable 
        leads={paginatedLeads}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onSelectPage={selectPage}
        isPageSelected={isPageSelected}
        onNavigate={navigate}
        onReveal={revealContact}
        onSelectionChange={setSelectedIds}
        isAdmin={isAdmin}
        onEdit={handleEditLead}
      />

      {/* Pagination */}
      {filteredLeads.length > 0 && (
        <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-border">
          <span className="text-sm text-textSecondary">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredLeads.length)} of {filteredLeads.length}
          </span>
          <div className="flex items-center gap-3">
            <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="p-2 bg-white border border-border rounded-lg disabled:opacity-50 hover:bg-slate-100 transition-colors">
              <ChevronLeft size={16} />
            </button>
            
            <form onSubmit={handlePageInputSubmit} className="flex items-center gap-2">
               <span className="text-sm font-medium text-textSecondary">Page</span>
               <input 
                  type="text" 
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value)}
                  className="w-12 px-2 py-1 text-center bg-white text-black border border-border rounded-lg text-sm font-bold focus:ring-2 focus:ring-primary outline-none"
               />
               <span className="text-sm font-medium text-textSecondary">of {totalPages}</span>
            </form>

            <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="p-2 bg-white border border-border rounded-lg disabled:opacity-50 hover:bg-slate-100 transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Floating Bulk Actions */}
      {canManage && (
        <BulkActionsBar 
            selectedCount={selectedIds.length}
            onClear={() => setSelectedIds([])}
            onDelete={executeBulkDelete}
            onAssign={openBulkAssign}
            onStatusChange={openBulkStatus}
        />
      )}

      {/* --- MODALS --- */}

      {/* Duplicate Found Modal */}
      {showDuplicateModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200 border border-border">
             <div className="flex items-center gap-3 mb-4 text-warning">
                <div className="p-2 bg-orange-100 rounded-full">
                  <AlertTriangle size={24} className="text-orange-600"/>
                </div>
                <h3 className="font-bold text-lg text-textPrimary">Import Completed</h3>
             </div>
             <div className="space-y-4">
                 <p className="text-sm text-textSecondary">
                    Successfully added <span className="font-bold text-success">{importStats.added}</span> new leads.
                 </p>
                 <div className="bg-orange-50 p-3 rounded-xl border border-orange-100">
                    <p className="text-sm font-medium text-orange-800">
                        Skipped <span className="font-bold">{importStats.count}</span> duplicate records based on email/phone.
                    </p>
                 </div>
             </div>
             <div className="flex gap-3 mt-6">
                <button 
                  onClick={() => setShowDuplicateModal(false)} 
                  className="flex-1 py-3 border border-border text-textPrimary font-bold rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Close
                </button>
                <button 
                  onClick={handleDownloadDuplicates} 
                  className="flex-1 py-3 bg-primary text-darkGreen font-bold rounded-xl hover:bg-softMint transition-colors flex items-center justify-center gap-2"
                >
                  <Download size={16} /> Download Duplicates
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
             <div className="flex items-center gap-3 mb-4 text-danger">
                <div className="p-2 bg-red-100 rounded-full">
                  <Trash2 size={24} />
                </div>
                <h3 className="font-bold text-lg text-textPrimary">Delete Leads?</h3>
             </div>
             <p className="text-textSecondary text-sm mb-6 leading-relaxed">
                Are you sure you want to delete <span className="font-bold text-textPrimary">{selectedIds.length}</span> leads? This action cannot be undone.
             </p>
             <div className="flex gap-3">
                <button 
                  onClick={() => setIsDeleteModalOpen(false)} 
                  className="flex-1 py-3 border border-border text-textPrimary font-bold rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmBulkDelete} 
                  className="flex-1 py-3 bg-danger text-white font-bold rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-100"
                >
                  Delete
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Purge All Confirmation Modal */}
      {isPurgeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
             <div className="flex items-center gap-3 mb-4 text-danger">
                <div className="p-2 bg-red-100 rounded-full">
                  <AlertTriangle size={24} />
                </div>
                <h3 className="font-bold text-lg text-textPrimary">Purge All Data?</h3>
             </div>
             <p className="text-textSecondary text-sm mb-6 leading-relaxed">
                WARNING: This will permanently delete <span className="font-bold text-danger">ALL LEADS</span> entirely from the database. This action is irreversible.
             </p>
             <div className="flex gap-3">
                <button 
                  onClick={() => setIsPurgeModalOpen(false)} 
                  className="flex-1 py-3 border border-border text-textPrimary font-bold rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmPurgeAll} 
                  className="flex-1 py-3 bg-danger text-white font-bold rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-100"
                >
                  Yes, Purge All
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Status Delete Confirmation Modal */}
      {statusToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
             <div className="flex items-center gap-3 mb-4 text-danger">
                <div className="p-2 bg-red-100 rounded-full">
                  <Trash2 size={24} />
                </div>
                <h3 className="font-bold text-lg text-textPrimary">Delete Status?</h3>
             </div>
             <p className="text-textSecondary text-sm mb-6 leading-relaxed">
                Are you sure you want to delete the status <span className="font-bold text-textPrimary">"{statusToDelete}"</span>?
             </p>
             <div className="flex gap-3">
                <button 
                  onClick={() => setStatusToDelete(null)} 
                  className="flex-1 py-3 border border-border text-textPrimary font-bold rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmStatusDelete} 
                  className="flex-1 py-3 bg-danger text-white font-bold rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-100"
                >
                  Delete
                </button>
             </div>
          </div>
        </div>
      )}

       {/* Outcome Delete Confirmation Modal */}
       {outcomeToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
             <div className="flex items-center gap-3 mb-4 text-danger">
                <div className="p-2 bg-red-100 rounded-full">
                  <Trash2 size={24} />
                </div>
                <h3 className="font-bold text-lg text-textPrimary">Delete Outcome?</h3>
             </div>
             <p className="text-textSecondary text-sm mb-6 leading-relaxed">
                Are you sure you want to delete the outcome <span className="font-bold text-textPrimary">"{outcomeToDelete}"</span>?
             </p>
             <div className="flex gap-3">
                <button 
                  onClick={() => setOutcomeToDelete(null)} 
                  className="flex-1 py-3 border border-border text-textPrimary font-bold rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmOutcomeDelete} 
                  className="flex-1 py-3 bg-danger text-white font-bold rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-100"
                >
                  Delete
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Bulk Assign Modal */}
      {isBulkAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
             <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">Assign {selectedIds.length} Leads</h3>
                <button onClick={() => setIsBulkAssignModalOpen(false)}><X size={20}/></button>
             </div>
             <div className="space-y-4">
                <label className="block text-sm font-medium text-textSecondary">Select Agent</label>
                <select 
                  className="w-full p-2 bg-white text-black border border-border rounded-xl"
                  value={targetAgentId}
                  onChange={(e) => setTargetAgentId(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {availableAgents.map(agent => (
                    <option key={agent.id} value={agent.id}>{agent.name}</option>
                  ))}
                </select>
                <button onClick={confirmBulkAssign} className="w-full py-3 bg-darkGreen text-white font-bold rounded-xl hover:bg-opacity-90">
                  Assign Agents
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Bulk Status Modal */}
      {isBulkStatusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
             <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">Update Status</h3>
                <button onClick={() => !isUpdatingStatus && setIsBulkStatusModalOpen(false)} disabled={isUpdatingStatus}><X size={20}/></button>
             </div>
             
             {isUpdatingStatus ? (
                 <div className="space-y-4 py-4">
                     <div className="flex justify-between text-sm font-bold text-textSecondary mb-1">
                        <span>Updating {selectedIds.length} leads...</span>
                        <span>{updateProgress}%</span>
                     </div>
                     <div className="h-3 bg-slate-100 rounded-full overflow-hidden border border-border">
                        <div className="h-full bg-primary transition-all duration-300" style={{ width: `${updateProgress}%` }}></div>
                     </div>
                     <p className="text-xs text-textMuted text-center animate-pulse">Processing updates, please wait...</p>
                 </div>
             ) : (
                 <div className="space-y-4">
                    <p className="text-sm text-textSecondary">Applying new status to <span className="font-bold">{selectedIds.length}</span> selected leads.</p>
                    <div>
                        <label className="block text-sm font-medium text-textSecondary mb-1">Select New Status</label>
                        <select 
                        className="w-full p-2 bg-white text-black border border-border rounded-xl"
                        value={targetStatus}
                        onChange={(e) => setTargetStatus(e.target.value)}
                        >
                        <option value="">Select...</option>
                        {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <button 
                        onClick={confirmBulkStatus} 
                        disabled={!targetStatus} 
                        className="w-full py-3 bg-darkGreen text-white font-bold rounded-xl hover:bg-opacity-90 disabled:opacity-50"
                    >
                        Update Status
                    </button>
                 </div>
             )}
          </div>
        </div>
      )}

      {/* Manage Statuses Modal */}
      {isStatusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200 overflow-y-auto max-h-[80vh]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-textPrimary">Manage Statuses</h3>
              <button onClick={() => setIsStatusModalOpen(false)} className="text-textMuted hover:text-danger"><X size={20} /></button>
            </div>
            
            <div className="mb-6 space-y-2 max-h-60 overflow-y-auto pr-2">
              <label className="block text-xs font-bold text-textSecondary mb-2 uppercase">Existing Statuses</label>
              {statuses.map(s => (
                <div key={s} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-border">
                   <span className="text-sm font-medium text-textPrimary">{s}</span>
                   <button onClick={() => handleRemoveStatus(s)} className="text-textMuted hover:text-danger p-1">
                      <Trash2 size={16} />
                   </button>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddStatus} className="space-y-4 pt-4 border-t border-border">
              <label className="block text-xs font-bold text-textSecondary uppercase">Add New Status</label>
              <div className="flex gap-2">
                 <input 
                    type="text" 
                    value={newStatusName} 
                    onChange={(e) => setNewStatusName(e.target.value)} 
                    className="flex-1 px-3 py-2 bg-white text-black border border-border rounded-lg outline-none focus:border-primary" 
                    placeholder="e.g., Follow Up 2" 
                    required 
                  />
                 <button type="submit" className="px-4 py-2 bg-darkGreen text-white font-bold rounded-lg hover:bg-opacity-90">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Outcomes Modal */}
      {isOutcomeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200 overflow-y-auto max-h-[80vh]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-textPrimary">Manage Outcomes</h3>
              <button onClick={() => setIsOutcomeModalOpen(false)} className="text-textMuted hover:text-danger"><X size={20} /></button>
            </div>
            
            <div className="mb-6 space-y-2 max-h-60 overflow-y-auto pr-2">
              <label className="block text-xs font-bold text-textSecondary mb-2 uppercase">Existing Outcomes</label>
              {outcomes.map(o => (
                <div key={o} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-border">
                   <span className="text-sm font-medium text-textPrimary">{o}</span>
                   <button onClick={() => handleRemoveOutcome(o)} className="text-textMuted hover:text-danger p-1">
                      <Trash2 size={16} />
                   </button>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddOutcome} className="space-y-4 pt-4 border-t border-border">
              <label className="block text-xs font-bold text-textSecondary uppercase">Add New Outcome</label>
              <div className="flex gap-2">
                 <input 
                    type="text" 
                    value={newOutcomeName} 
                    onChange={(e) => setNewOutcomeName(e.target.value)} 
                    className="flex-1 px-3 py-2 bg-white text-black border border-border rounded-lg outline-none focus:border-primary" 
                    placeholder="e.g., Left Voicemail" 
                    required 
                  />
                 <button type="submit" className="px-4 py-2 bg-darkGreen text-white font-bold rounded-lg hover:bg-opacity-90">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isLeadFormModalOpen && (
        <LeadFormModal 
            initialData={editingLead || undefined}
            statuses={statuses}
            agents={availableAgents}
            onClose={() => setIsLeadFormModalOpen(false)}
            onSave={handleSaveLead}
        />
      )}

    </div>
  );
};

export default Leads;
