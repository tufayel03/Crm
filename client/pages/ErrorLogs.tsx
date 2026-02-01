import React, { useMemo, useState } from 'react';
import { useAuditStore } from '../stores/auditStore';
import { AlertTriangle, Search, Clock, User, RefreshCw } from 'lucide-react';

const ErrorLogs: React.FC = () => {
  const { logs, fetchLogs } = useAuditStore();
  const [search, setSearch] = useState('');

  const errorLogs = useMemo(() => {
    const lower = search.toLowerCase();
    return logs.filter(l => {
      const isError = String(l.action || '').toLowerCase().includes('error');
      if (!isError) return false;
      if (!lower) return true;
      return (
        String(l.userName || '').toLowerCase().includes(lower) ||
        String(l.details || '').toLowerCase().includes(lower) ||
        String(l.action || '').toLowerCase().includes(lower)
      );
    });
  }, [logs, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-textPrimary">Error Logs</h2>
          <p className="text-textSecondary">Authentication and system errors recorded across the platform.</p>
        </div>
        <button
          onClick={() => fetchLogs()}
          className="flex items-center gap-2 px-4 py-2 bg-darkGreen text-white font-bold rounded-xl hover:bg-opacity-90 shadow-lg shadow-darkGreen/10 transition-all text-sm"
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" size={16} />
            <input
              type="text"
              placeholder="Search by user, action, or details..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-textMuted">
            <AlertTriangle size={14} className="text-danger" />
            <span>{errorLogs.length} errors</span>
          </div>
        </div>

        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-border">
            <tr>
              <th className="px-6 py-4 font-bold text-textMuted uppercase tracking-wider">User</th>
              <th className="px-6 py-4 font-bold text-textMuted uppercase tracking-wider">Action</th>
              <th className="px-6 py-4 font-bold text-textMuted uppercase tracking-wider">Details</th>
              <th className="px-6 py-4 font-bold text-textMuted uppercase tracking-wider">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {errorLogs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-20 text-center text-textMuted italic">
                  No error logs recorded yet.
                </td>
              </tr>
            ) : (
              errorLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-textMuted" />
                      <span className="font-semibold text-textPrimary">{log.userName || 'Unknown'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-bold uppercase tracking-wider">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-textSecondary">{log.details}</td>
                  <td className="px-6 py-4 text-textMuted flex items-center gap-1">
                    <Clock size={12} />
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ErrorLogs;
