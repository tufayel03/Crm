import React, { useEffect, useMemo, useState } from 'react';
import { useAuditStore, AuditLogFilters } from '../stores/auditStore';
import { useNotificationStore } from '../stores/notificationStore';
import { Clock, Filter, RefreshCw, Search, Trash2, User } from 'lucide-react';

const ActivityLogs: React.FC = () => {
  const { logs, total, fetchLogs, deleteLog, purgeAll } = useAuditStore();
  const { addNotification } = useNotificationStore();
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  const filters: AuditLogFilters = useMemo(() => ({
    search: search.trim(),
    module: moduleFilter,
    severity: severityFilter,
    action: actionFilter,
    limit: 500
  }), [search, moduleFilter, severityFilter, actionFilter]);

  useEffect(() => {
    fetchLogs(filters);
  }, [fetchLogs, filters]);

  const uniqueModules = useMemo(() => Array.from(new Set(logs.map((l) => l.module).filter(Boolean))).sort(), [logs]);
  const uniqueActions = useMemo(() => Array.from(new Set(logs.map((l) => l.action).filter(Boolean))).sort(), [logs]);

  const clearFilters = () => {
    setSearch('');
    setModuleFilter('');
    setSeverityFilter('');
    setActionFilter('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-textPrimary">Activity Logs</h2>
          <p className="text-textSecondary">Track user actions across CRM: login, edits, deletes, exports, emails, campaigns, templates and database actions.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              setIsBusy(true);
              try {
                await fetchLogs(filters);
              } finally {
                setIsBusy(false);
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-darkGreen text-white font-bold rounded-xl hover:bg-opacity-90 text-sm disabled:opacity-60"
            disabled={isBusy}
          >
            <RefreshCw size={16} /> Refresh
          </button>
          <button
            onClick={async () => {
              if (!window.confirm('Delete logs matching current filters? This cannot be undone.')) return;
              setIsBusy(true);
              try {
                await purgeAll(filters);
                await fetchLogs(filters);
                addNotification('success', 'Filtered activity logs deleted.');
              } catch (err: any) {
                addNotification('error', err?.message || 'Failed to delete logs.');
              } finally {
                setIsBusy(false);
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-danger text-danger font-bold rounded-xl hover:bg-red-50 text-sm disabled:opacity-60"
            disabled={isBusy}
          >
            <Trash2 size={16} /> Delete Filtered
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" size={16} />
            <input
              type="text"
              placeholder="Search by user, action, details, target..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)} className="px-3 py-2 bg-slate-50 border border-border rounded-xl text-sm">
              <option value="">All Modules</option>
              {uniqueModules.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className="px-3 py-2 bg-slate-50 border border-border rounded-xl text-sm">
              <option value="">All Severity</option>
              <option value="info">info</option>
              <option value="warn">warn</option>
              <option value="error">error</option>
            </select>
            <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="px-3 py-2 bg-slate-50 border border-border rounded-xl text-sm">
              <option value="">All Actions</option>
              {uniqueActions.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <button
              onClick={clearFilters}
              className="px-3 py-2 bg-white border border-border rounded-xl text-sm font-semibold text-textSecondary hover:bg-slate-50 flex items-center justify-center gap-2"
            >
              <Filter size={14} /> Clear Filters
            </button>
          </div>
          <div className="text-xs text-textMuted">{logs.length} shown / {total} total</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-border">
              <tr>
                <th className="px-4 py-3 font-bold text-textMuted uppercase">User</th>
                <th className="px-4 py-3 font-bold text-textMuted uppercase">Action</th>
                <th className="px-4 py-3 font-bold text-textMuted uppercase">Module</th>
                <th className="px-4 py-3 font-bold text-textMuted uppercase">Details</th>
                <th className="px-4 py-3 font-bold text-textMuted uppercase">Timestamp</th>
                <th className="px-4 py-3 font-bold text-textMuted uppercase">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-textMuted italic">No activity logs found.</td>
                </tr>
              ) : logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-textMuted" />
                      <div>
                        <div className="font-semibold text-textPrimary">{log.userName || 'Unknown'}</div>
                        <div className="text-xs text-textMuted">{log.userEmail || '-'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-softMint/40 text-darkGreen rounded text-[10px] font-bold">{log.action}</span>
                  </td>
                  <td className="px-4 py-3 text-textSecondary">{log.module || '-'}</td>
                  <td className="px-4 py-3 text-textSecondary max-w-xl truncate" title={log.details}>{log.details}</td>
                  <td className="px-4 py-3 text-textMuted">
                    <div className="flex items-center gap-1"><Clock size={12} />{new Date(log.timestamp).toLocaleString()}</div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={async () => {
                        if (!window.confirm('Delete this activity log?')) return;
                        try {
                          await deleteLog(log.id);
                          addNotification('success', 'Activity log deleted.');
                        } catch (err: any) {
                          addNotification('error', err?.message || 'Failed to delete log.');
                        }
                      }}
                      className="p-1.5 text-danger hover:bg-red-50 rounded-lg"
                      title="Delete log"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ActivityLogs;
