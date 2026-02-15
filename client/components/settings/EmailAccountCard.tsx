
import React, { useState } from 'react';
import { EmailAccount } from '../../types';
import { Trash2, AlertCircle, CheckCircle2, RefreshCw, Mail, Briefcase, Users } from 'lucide-react';

interface EmailAccountCardProps {
  account: EmailAccount;
  onVerify: (id: string) => Promise<boolean>;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: any) => void;
}

const EmailAccountCard: React.FC<EmailAccountCardProps> = ({ account, onVerify, onDelete, onUpdate }) => {
  const [verifying, setVerifying] = useState(false);

  const handleVerify = async () => {
    setVerifying(true);
    await onVerify(account.id);
    setVerifying(false);
  };

  return (
    <div className="bg-white border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg ${account.provider === 'Namecheap' ? 'bg-orange-500' : 'bg-blue-600'}`}>
                    {account.provider.charAt(0)}
                </div>
                <div>
                    <h4 className="font-bold text-textPrimary">{account.label}</h4>
                    <p className="text-sm text-textSecondary">{account.email}</p>
                </div>
            </div>
            <div className="flex gap-2">
                {account.isVerified ? (
                    <span className="px-2 py-1 bg-softMint text-darkGreen text-[10px] font-bold uppercase rounded-md flex items-center gap-1">
                        <CheckCircle2 size={12} /> Verified
                    </span>
                ) : (
                    <button 
                        onClick={handleVerify}
                        disabled={verifying}
                        className="px-2 py-1 bg-yellow-100 text-yellow-700 text-[10px] font-bold uppercase rounded-md flex items-center gap-1 hover:bg-yellow-200"
                    >
                        {verifying ? <RefreshCw size={12} className="animate-spin"/> : <AlertCircle size={12} />} 
                        {verifying ? 'Checking...' : 'Verify Now'}
                    </button>
                )}
            </div>
        </div>

        <div className="space-y-3 mb-6">
            <label className="flex items-center justify-between p-2 border border-border rounded-lg cursor-pointer hover:bg-slate-50 transition-all">
                <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-md ${account.useForClients ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-textMuted'}`}>
                        <Briefcase size={16} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-textPrimary">Clients</p>
                        <p className="text-[10px] text-textMuted">Direct emails</p>
                    </div>
                </div>
                <input 
                    type="checkbox" 
                    checked={account.useForClients}
                    onChange={(e) => onUpdate(account.id, { useForClients: e.target.checked })}
                    className="w-4 h-4 text-primary focus:ring-primary rounded"
                />
            </label>

            <label className="flex items-center justify-between p-2 border border-border rounded-lg cursor-pointer hover:bg-slate-50 transition-all">
                <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-md ${account.useForLeads ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-textMuted'}`}>
                        <Users size={16} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-textPrimary">Leads</p>
                        <p className="text-[10px] text-textMuted">Lead follow-up emails</p>
                    </div>
                </div>
                <input
                    type="checkbox"
                    checked={account.useForLeads}
                    onChange={(e) => onUpdate(account.id, { useForLeads: e.target.checked })}
                    className="w-4 h-4 text-primary focus:ring-primary rounded"
                />
            </label>
        </div>
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-border">
         <span className="text-[10px] text-textMuted font-mono">{account.smtpHost}:{account.smtpPort}</span>
         <button onClick={() => onDelete(account.id)} className="text-textMuted hover:text-danger p-1">
            <Trash2 size={16} />
         </button>
      </div>
    </div>
  );
};

export default EmailAccountCard;
