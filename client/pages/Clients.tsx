
import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClientsStore } from '../stores/clientsStore';
import { useServicesStore } from '../stores/servicesStore';
import { useAuthStore } from '../stores/authStore';
import { useTeamStore } from '../stores/teamStore';
import { usePermissions } from '../hooks/usePermissions'; // Hook
import { useNotificationStore } from '../stores/notificationStore';
import { downloadBulkClientsZip, downloadDuplicates } from '../utils/exportHelpers';
import { createWorkbookFromJson, downloadWorkbook, loadWorkbookFromArrayBuffer, parseCsvToJson, sheetToJson } from '../utils/excelUtils';
import { 
  Plus, FileSpreadsheet, X, Upload, Trash2, 
  ChevronLeft, ChevronRight, CheckCircle2, Loader2, AlertTriangle, Download
} from 'lucide-react';
import { Client } from '../types';

// Components
import ClientsToolbar from '../components/clients/ClientsToolbar';
import ClientsTable from '../components/clients/ClientsTable';
import ClientBulkActions from '../components/clients/ClientBulkActions';
import ClientFormModal from '../components/clients/ClientFormModal';

const Clients: React.FC = () => {
  const { clients, addClient, updateClient, importClients, removeClients } = useClientsStore();
  const { plans } = useServicesStore();
  const { user, role } = useAuthStore();
  const { members } = useTeamStore();
  const { can } = usePermissions(); // Permissions
  const { addNotification } = useNotificationStore();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Permission Flags
  const canManage = can('manage', 'clients');
  const canExport = can('export', 'clients');

  // State
  const [search, setSearch] = useState('');
  const [serviceFilter, setServiceFilter] = useState('All');
  const [selectedPlan, setSelectedPlan] = useState('All');
  const [managerFilter, setManagerFilter] = useState('All');
  const [countryFilter, setCountryFilter] = useState('All');
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState('1'); 
  const itemsPerPage = 50;

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Progress States
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const [isClientFormModalOpen, setIsClientFormModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Duplicate Result State
  const [duplicatesFound, setDuplicatesFound] = useState<any[]>([]);
  const [importStats, setImportStats] = useState({ added: 0, count: 0 });
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const isAdmin = role === 'admin' || role === 'manager';

  // Derived Data for Dropdowns
  const uniqueManagers = useMemo(() => Array.from(new Set(clients.map(c => c.accountManagerName))).filter(Boolean).sort() as string[], [clients]);
  const uniqueCountries = useMemo(() => Array.from(new Set(clients.map(c => c.country))).filter(Boolean).sort() as string[], [clients]);
  
  const availableAgents = useMemo(() => {
      return members.filter(m => m.role === 'agent' || m.role === 'manager').map(m => ({ id: m.id, name: m.name }));
  }, [members]);

  // --- Filtering Logic ---
  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      // Search
      const term = search.toLowerCase();
      const matchesSearch = 
        (c.companyName && String(c.companyName).toLowerCase().includes(term)) || 
        (c.contactName && String(c.contactName).toLowerCase().includes(term)) ||
        (c.profession && String(c.profession).toLowerCase().includes(term)) ||
        (c.email && String(c.email).toLowerCase().includes(term)) ||
        (c.uniqueId && String(c.uniqueId).toLowerCase().includes(term));

      // Service Status
      const activeServices = c.services.filter(s => s.status === 'Active');
      let matchesService = true;
      
      if (serviceFilter === 'Active') {
          matchesService = activeServices.length > 0;
          if (matchesService && selectedPlan !== 'All') {
              matchesService = activeServices.some(s => s.type === selectedPlan);
          }
      } else if (serviceFilter === 'Inactive') {
          matchesService = activeServices.length === 0;
      }

      // Manager
      const matchesManager = managerFilter === 'All' || c.accountManagerName === managerFilter;

      // Country
      const matchesCountry = countryFilter === 'All' || c.country === countryFilter;

      return matchesSearch && matchesService && matchesManager && matchesCountry;
    }).sort((a, b) => a.readableId - b.readableId); // ASCENDING Sort by ID: 1, 2, 3...
  }, [clients, search, serviceFilter, selectedPlan, managerFilter, countryFilter]);

  // --- Pagination Logic ---
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const paginatedClients = filteredClients.slice(
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

  // --- Handlers ---
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const selectPage = () => {
    const pageIds = paginatedClients.map(c => c.id);
    const allSelected = pageIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...pageIds])]);
    }
  };

  const handleSelectAllFiltered = () => {
      const allIds = filteredClients.map(c => c.id);
      setSelectedIds(allIds);
  };

  const handleRangeSelect = (e: React.FormEvent) => {
    e.preventDefault();
    const startRaw = parseInt(rangeStart);
    const endRaw = parseInt(rangeEnd);
    if (isNaN(startRaw) || isNaN(endRaw)) return;
    const start = Math.min(startRaw, endRaw);
    const end = Math.max(startRaw, endRaw);

    const idsInRange = filteredClients
      .map((c, idx) => ({ id: c.id, serial: idx + 1 }))
      .filter(item => item.serial >= start && item.serial <= end)
      .map(item => item.id);

    setSelectedIds(prev => [...new Set([...prev, ...idsInRange])]);
  };

  const isPageSelected = useMemo(() => 
    paginatedClients.length > 0 && paginatedClients.every(c => selectedIds.includes(c.id)), 
  [paginatedClients, selectedIds]);

  const isAllSelected = useMemo(() => {
      if (filteredClients.length === 0) return false;
      if (selectedIds.length < filteredClients.length) return false;
      const selectedSet = new Set(selectedIds);
      return filteredClients.every(c => selectedSet.has(c.id));
  }, [filteredClients, selectedIds]);

  const handleSaveClient = async (clientData: any) => {
      try {
          if (editingClient) {
              await updateClient(editingClient.id, clientData);
              addNotification('success', 'Client updated.');
          } else {
          await addClient({
              ...clientData,
              services: [],
              invoices: [],
              documents: [],
              notes: [],
              onboardedAt: new Date().toISOString()
          });
              addNotification('success', 'Client created.');
          }
          setIsClientFormModalOpen(false);
          setEditingClient(null);
      } catch (err: any) {
          addNotification('error', err?.message || 'Failed to save client.');
      }
  };

  const handleEditClient = (client: Client) => {
      if (!canManage) return alert("Permission Denied: Cannot edit clients.");
      setEditingClient(client);
      setIsClientFormModalOpen(true);
  };

  const executeBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setIsDeleteModalOpen(true);
  };

  const confirmBulkDelete = async () => {
    await removeClients(selectedIds);
    setSelectedIds([]);
    setIsDeleteModalOpen(false);
  };

  const handleExcelExport = async () => {
    if (!canExport) return alert("Permission Denied.");

    const clientsToExport = selectedIds.length > 0 
        ? clients.filter(c => selectedIds.includes(c.id)) 
        : filteredClients;

    const exportData = clientsToExport.map(c => {
      const notesText = (c.notes || [])
        .map(n => {
          const ts = n.timestamp ? new Date(n.timestamp).toLocaleString() : '';
          const author = n.author ? String(n.author) : '';
          const content = n.content ? String(n.content) : '';
          const prefix = [ts, author].filter(Boolean).join(' - ');
          return prefix ? `${prefix}: ${content}` : content;
        })
        .filter(Boolean)
        .join('\n');

      return ({
      'Unique ID': c.uniqueId,
      ShopName: c.companyName,
      Contact: c.contactName,
      Profession: c.profession || '',
      Email: c.email,
      Phone: c.phone,
      Country: c.country,
      AccountManager: c.accountManagerName,
      Onboarded: new Date(c.onboardedAt).toLocaleDateString(),
      ActiveServices: c.services.filter(s => s.status === 'Active').length,
      TotalValue: c.services.reduce((acc, s) => acc + s.price, 0),
      Notes: notesText
    });
    });

    const wb = createWorkbookFromJson("Clients List", exportData);
    await downloadWorkbook(wb, `Matlance_Clients_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleBulkZipExport = async () => {
    if (!canExport) return alert("Permission Denied.");

    // Optimization for large selections: Use Set for O(1) lookup
    let clientsToExport: Client[];
    
    if (selectedIds.length > 0) {
        // Create Set for faster lookup
        const selectedSet = new Set(selectedIds);
        clientsToExport = clients.filter(c => selectedSet.has(c.id));
    } else {
        clientsToExport = filteredClients;
    }

    if (clientsToExport.length === 0) return;
    
    // Warn for huge datasets
    if (clientsToExport.length > 500 && !window.confirm(`You are about to generate a ZIP for ${clientsToExport.length} clients. This may take a few minutes and require significant memory. Continue?`)) {
        return;
    }

    setIsExporting(true);
    setExportProgress(0);
    setExportStatus('Starting...');

    try {
        await new Promise(resolve => setTimeout(resolve, 100)); 
        await downloadBulkClientsZip(clientsToExport, (percent, status) => {
            setExportProgress(percent);
            setExportStatus(status);
        });
    } catch (e) {
        console.error(e);
        alert("Failed to generate ZIP export. Try selecting a smaller batch.");
    } finally {
        setIsExporting(false);
        setExportProgress(0);
        setExportStatus('');
    }
  };

  // Import Handler
  const handleImportClick = () => {
      if (!canExport) return alert("Permission Denied.");
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
            
            // Map keys to standard format
            const mappedData = jsonData.map((row: any) => {
                const newRow: any = {};
                // Try different casing and common variations
                Object.keys(row).forEach(key => {
                    const k = key.toLowerCase().trim();
                    if (k === 'unique id' || k === 'short id' || k === 'id') newRow.uniqueId = row[key];
                    else if (k.includes('shop name') || k.includes('company')) newRow.companyName = row[key];
                    else if (k.includes('contact') || k === 'name') newRow.contactName = row[key];
                    else if (k.includes('profession') || k.includes('job title') || k.includes('job')) newRow.profession = row[key];
                    else if (k.includes('email')) newRow.email = row[key];
                    else if (k.includes('phone') || k.includes('mobile')) newRow.phone = row[key];
                    else if (k.includes('country') || k.includes('location')) newRow.country = row[key];
                    else if (k.includes('manager')) newRow.accountManager = row[key];
                });
                return { ...newRow, _raw: row };
            });

            const result = await importClients(mappedData);
            
            setImportStats({ added: result.added, count: result.duplicates.length });
            setDuplicatesFound(result.duplicates);
            
            if (result.duplicates.length > 0) {
                setShowDuplicateModal(true);
            } else {
                alert(`Import Complete!\nAdded: ${result.added} clients.`);
            }

        } catch (e: any) {
            alert("Import failed: " + e.message);
        } finally {
            setIsImporting(false);
            e.target.value = ''; // Reset
        }
    };
    // Small delay to render loader
    setTimeout(() => {
        if (isCsv) reader.readAsText(file);
        else reader.readAsArrayBuffer(file);
    }, 100);
  };

  const handleDownloadDuplicates = () => {
      downloadDuplicates(duplicatesFound, 'clients');
      setShowDuplicateModal(false);
  };

  return (
    <div className="space-y-6 pb-20">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx, .csv" className="hidden" />

      {/* Header */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-textPrimary">Client Portfolio</h2>
          <p className="text-textSecondary">Manage {clients.length} active customer accounts and subscriptions.</p>
        </div>
        <div className="flex flex-wrap gap-2">
           {canExport && (
             <>
                <button 
                    onClick={handleImportClick}
                    disabled={isImporting}
                    className="flex items-center gap-2 px-4 py-3 bg-white border border-border text-textPrimary font-bold rounded-xl hover:bg-slate-50 transition-all disabled:opacity-70"
                >
                    {isImporting ? <Loader2 size={18} className="animate-spin text-primary" /> : <Upload size={18} />} 
                    {isImporting ? 'Processing...' : 'Import'}
                </button>
                <button 
                    onClick={handleExcelExport}
                    className="flex items-center gap-2 px-4 py-3 bg-white border border-border text-textPrimary font-bold rounded-xl hover:bg-slate-50 transition-all"
                    title="Download Excel List"
                >
                    <FileSpreadsheet size={18} className="text-green-600" /> 
                    <span className="hidden sm:inline">Export List</span>
                </button>
             </>
           )}
           
          {canManage && (
            <button 
                onClick={() => { setEditingClient(null); setIsClientFormModalOpen(true); }}
                className="flex items-center gap-2 px-6 py-3 bg-darkGreen text-white font-bold rounded-xl shadow-lg shadow-darkGreen/10 hover:bg-opacity-90 transition-all"
            >
                <Plus size={20} /> New Client
            </button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <ClientsToolbar 
        search={search} setSearch={setSearch}
        serviceFilter={serviceFilter} setServiceFilter={setServiceFilter}
        managerFilter={managerFilter} setManagerFilter={setManagerFilter}
        countryFilter={countryFilter} setCountryFilter={setCountryFilter}
        rangeStart={rangeStart} setRangeStart={setRangeStart}
        rangeEnd={rangeEnd} setRangeEnd={setRangeEnd}
        onRangeSelect={handleRangeSelect}
        isAdmin={isAdmin}
        uniqueManagers={uniqueManagers}
        uniqueCountries={uniqueCountries}
        plans={plans} 
        selectedPlan={selectedPlan} 
        setSelectedPlan={setSelectedPlan}
        onExport={canExport ? handleExcelExport : () => {}}
      />

      {/* Select All Banner */}
      {isPageSelected && !isAllSelected && filteredClients.length > paginatedClients.length && (
        <div className="flex items-center justify-center gap-2 p-3 bg-blue-50 border border-blue-200 text-blue-800 text-sm rounded-xl animate-in fade-in slide-in-from-top-2 shadow-sm">
            <CheckCircle2 size={16} />
            <span>All <b>{paginatedClients.length}</b> clients on this page are selected.</span>
            <button 
                onClick={handleSelectAllFiltered}
                className="font-bold underline hover:text-blue-900 ml-1"
            >
                Select all {filteredClients.length} clients matching current filters
            </button>
        </div>
      )}
      
      {isAllSelected && filteredClients.length > paginatedClients.length && (
         <div className="flex items-center justify-center gap-2 p-3 bg-softMint border border-primary text-darkGreen text-sm rounded-xl animate-in fade-in slide-in-from-top-2 shadow-sm">
            <CheckCircle2 size={16} />
            <span>All <b>{filteredClients.length}</b> clients are selected.</span>
            <button 
                onClick={() => setSelectedIds([])}
                className="font-bold underline hover:text-green-900 ml-1"
            >
                Clear selection
            </button>
        </div>
      )}

      {/* Table */}
      <ClientsTable 
        clients={paginatedClients}
        pageStartIndex={(currentPage - 1) * itemsPerPage}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onSelectPage={selectPage}
        isPageSelected={isPageSelected}
        onNavigate={navigate}
        onEdit={handleEditClient}
      />

      {/* Pagination Controls */}
      {filteredClients.length > 0 && (
        <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-border">
          <span className="text-sm text-textSecondary">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredClients.length)} of {filteredClients.length}
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

      {/* Bulk Actions */}
      {canManage && (
        <ClientBulkActions 
            selectedCount={selectedIds.length}
            onClear={() => setSelectedIds([])}
            onExportZip={canExport ? handleBulkZipExport : () => {}}
            onDelete={executeBulkDelete}
            isExporting={isExporting}
            exportProgress={exportProgress}
            exportStatus={exportStatus}
        />
      )}

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
                    Successfully added <span className="font-bold text-success">{importStats.added}</span> new clients.
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
                <h3 className="font-bold text-lg text-textPrimary">Delete Clients?</h3>
             </div>
             <p className="text-textSecondary text-sm mb-6 leading-relaxed">
                Are you sure you want to delete <span className="font-bold text-textPrimary">{selectedIds.length}</span> clients? This will also remove their documents and notes. This action cannot be undone.
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

      {/* Add/Edit Client Modal */}
      {isClientFormModalOpen && (
        <ClientFormModal 
            initialData={editingClient || undefined}
            agents={availableAgents}
            onClose={() => setIsClientFormModalOpen(false)}
            onSave={handleSaveClient}
        />
      )}
    </div>
  );
};

export default Clients;
