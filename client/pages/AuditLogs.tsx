
import React from 'react';
import { useAuditStore } from '../stores/auditStore';
import { ShieldCheck, Clock, User } from 'lucide-react';

const AuditLogs: React.FC = () => {
  const { logs } = useAuditStore();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-textPrimary">System Audit Logs</h2>
          <p className="text-textSecondary">Historical record of all platform activities and administrative changes.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
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
            {logs.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-20 text-center text-textMuted italic">No activity logs recorded yet.</td></tr>
            ) : (
              logs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-textMuted" />
                      <span className="font-semibold text-textPrimary">{log.userName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 bg-softMint/40 text-darkGreen rounded text-[10px] font-bold uppercase tracking-wider">
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

export default AuditLogs;
