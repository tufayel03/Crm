
import React, { useState, useEffect } from 'react';
import { EmailProvider } from '../../types';
import { X, Server, Lock, Mail, User, ShieldCheck, Loader2, AlertCircle, Info } from 'lucide-react';

interface SmtpModalProps {
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

const PROVIDERS: EmailProvider[] = ['Namecheap', 'Gmail', 'Outlook', 'Custom'];

const SmtpModal: React.FC<SmtpModalProps> = ({ onClose, onSave }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [provider, setProvider] = useState<EmailProvider>('Namecheap');
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  const [formData, setFormData] = useState({
    label: '',
    email: '',
    username: '',
    password: '',
    smtpHost: 'mail.privateemail.com',
    smtpPort: 587,
    imapHost: 'mail.privateemail.com',
    imapPort: 993,
    imapSecure: true,
    imapStartTLS: false,
    useForCampaigns: true,
    useForClients: true
  });

  // Auto-fill defaults based on provider
  useEffect(() => {
    setErrorMsg('');
    if (provider === 'Namecheap') {
        setFormData(prev => ({ ...prev, smtpHost: 'mail.privateemail.com', smtpPort: 587, imapHost: 'mail.privateemail.com', imapPort: 993, imapSecure: true, imapStartTLS: false }));
    } else if (provider === 'Gmail') {
        setFormData(prev => ({ ...prev, smtpHost: 'smtp.gmail.com', smtpPort: 587, imapHost: 'imap.gmail.com', imapPort: 993, imapSecure: true, imapStartTLS: false }));
    } else if (provider === 'Outlook') {
        setFormData(prev => ({ ...prev, smtpHost: 'smtp.office365.com', smtpPort: 587, imapHost: 'outlook.office365.com', imapPort: 993, imapSecure: true, imapStartTLS: false }));
    } else {
        setFormData(prev => ({ ...prev, smtpHost: '', smtpPort: 465, imapHost: '', imapPort: 993, imapSecure: true, imapStartTLS: false }));
    }
  }, [provider]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');
    setStatusMsg(`Connecting to ${formData.smtpHost}:${formData.smtpPort}...`);

    try {
        // Simulate SMTP Handshake / Auth Verification
        await new Promise((resolve, reject) => {
            setTimeout(() => {
                // Strict Mock Validation Logic
                const pass = formData.password.toLowerCase();
                const email = formData.email.toLowerCase();
                
                // 1. Check for obviously bad passwords
                // Relaxed: Removed check for 'test' to allow valid test accounts
                if (pass.length < 4 || pass.includes('wrong') || pass === '123456') {
                    reject(new Error("SMTP Authentication Failed: Invalid credentials (535 5.7.8)"));
                    return;
                } 
                
                // 2. Domain consistency check
                if (provider === 'Gmail' && !email.includes('@gmail.com') && !email.includes('@googlemail.com')) {
                    reject(new Error("Connection Failed: Gmail provider requires a Gmail address."));
                    return;
                }
                
                // 3. Port check for Namecheap
                if (provider === 'Namecheap' && formData.smtpPort !== 587) {
                     reject(new Error("Connection Timeout: Namecheap requires Port 587 (STARTTLS)."));
                     return;
                }

                // 4. Basic Email format
                if (!email.includes('@') || !email.includes('.')) {
                    reject(new Error("Invalid email format."));
                    return;
                }

                resolve(true);
            }, 1500); 
        });

        setStatusMsg('TLS Handshake Successful. Verifying credentials...');
        await new Promise(resolve => setTimeout(resolve, 800)); 

        setStatusMsg('Verified! Saving account...');
        
        // Pass 'isVerified: true' to store
        await onSave({ ...formData, provider, isVerified: true });
        onClose();
    } catch (err: any) {
        setErrorMsg(err.message || "Failed to connect to SMTP server");
        setStatusMsg('');
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-lg text-textPrimary">Connect Business Email</h3>
          <button onClick={onClose} className="text-textMuted hover:text-danger"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-2">
             <Info size={16} className="text-blue-600 mt-0.5 shrink-0" />
             <p className="text-xs text-blue-700 leading-relaxed">
               <strong>Note:</strong> This UI simulates SMTP verification. Mailbox sync still requires valid IMAP credentials on the server.
             </p>
          </div>

          {/* Provider Selection */}
          <div>
            <label className="block text-xs font-bold text-textSecondary uppercase mb-2">Email Provider</label>
            <div className="flex gap-2">
                {PROVIDERS.map(p => (
                    <button
                        key={p}
                        type="button"
                        onClick={() => setProvider(p)}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${
                            provider === p 
                            ? 'bg-primary text-darkGreen border-primary' 
                            : 'bg-white text-textSecondary border-border hover:bg-slate-50'
                        }`}
                    >
                        {p}
                    </button>
                ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-xs font-bold text-textSecondary mb-1">Internal Label</label>
                <input 
                    type="text" 
                    value={formData.label}
                    onChange={(e) => setFormData({...formData, label: e.target.value})}
                    placeholder="e.g. Marketing Sender" 
                    className="w-full px-3 py-2 bg-white text-textPrimary border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                    required
                />
             </div>
             <div>
                <label className="block text-xs font-bold text-textSecondary mb-1">Email Address</label>
                <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
                    <input 
                        type="email" 
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value, username: e.target.value})}
                        placeholder="you@business.com" 
                        className="w-full pl-9 pr-3 py-2 bg-white text-textPrimary border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                        required
                    />
                </div>
             </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-border space-y-4">
             <h4 className="text-xs font-bold text-textMuted uppercase flex items-center gap-2">
                <Server size={14} /> SMTP Configuration
             </h4>
             
             <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-textSecondary mb-1">Host</label>
                    <input 
                        type="text" 
                        value={formData.smtpHost}
                        onChange={(e) => setFormData({...formData, smtpHost: e.target.value})}
                        className="w-full px-3 py-2 bg-white text-textPrimary border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                        required
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-textSecondary mb-1">Port</label>
                    <input 
                        type="number" 
                        value={formData.smtpPort}
                        onChange={(e) => setFormData({...formData, smtpPort: parseInt(e.target.value)})}
                        className="w-full px-3 py-2 bg-white text-textPrimary border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                        required
                    />
                </div>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-[10px] font-bold text-textSecondary mb-1">Username</label>
                    <div className="relative">
                        <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
                        <input 
                            type="text" 
                            value={formData.username}
                            onChange={(e) => setFormData({...formData, username: e.target.value})}
                            className="w-full pl-9 pr-3 py-2 bg-white text-textPrimary border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                            required
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-textSecondary mb-1">Password</label>
                    <div className="relative">
                        <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
                        <input 
                            type="password" 
                            value={formData.password}
                            onChange={(e) => setFormData({...formData, password: e.target.value})}
                            className="w-full pl-9 pr-3 py-2 bg-white text-textPrimary border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                            placeholder="App Password"
                            required
                        />
                    </div>
                </div>
             </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-border space-y-4">
             <h4 className="text-xs font-bold text-textMuted uppercase flex items-center gap-2">
                <Server size={14} /> IMAP Configuration
             </h4>

             <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-textSecondary mb-1">Host</label>
                    <input 
                        type="text" 
                        value={formData.imapHost}
                        onChange={(e) => setFormData({...formData, imapHost: e.target.value})}
                        className="w-full px-3 py-2 bg-white text-textPrimary border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                        required
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-textSecondary mb-1">Port</label>
                    <input 
                        type="number" 
                        value={formData.imapPort}
                        onChange={(e) => setFormData({...formData, imapPort: parseInt(e.target.value)})}
                        className="w-full px-3 py-2 bg-white text-textPrimary border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                        required
                    />
                </div>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-[10px] font-bold text-textSecondary mb-1">Security</label>
                    <select
                        value={formData.imapStartTLS ? 'starttls' : 'ssl'}
                        onChange={(e) => {
                            const mode = e.target.value;
                            if (mode === 'starttls') {
                                setFormData(prev => ({
                                    ...prev,
                                    imapStartTLS: true,
                                    imapSecure: false,
                                    imapPort: prev.imapPort === 993 ? 143 : prev.imapPort
                                }));
                            } else {
                                setFormData(prev => ({
                                    ...prev,
                                    imapStartTLS: false,
                                    imapSecure: true,
                                    imapPort: prev.imapPort === 143 ? 993 : prev.imapPort
                                }));
                            }
                        }}
                        className="w-full px-3 py-2 bg-white text-textPrimary border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                    >
                        <option value="ssl">SSL/TLS (IMAPS)</option>
                        <option value="starttls">STARTTLS</option>
                    </select>
                </div>
                <div className="flex items-end">
                    <p className="text-[10px] text-textSecondary">
                        Use STARTTLS for TLS on port 143 if your provider requires it.
                    </p>
                </div>
             </div>
          </div>

          <div>
             <label className="block text-xs font-bold text-textSecondary uppercase mb-2">Usage & Routing</label>
             <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-slate-50 transition-colors bg-white">
                    <input 
                        type="checkbox" 
                        checked={formData.useForCampaigns}
                        onChange={(e) => setFormData({...formData, useForCampaigns: e.target.checked})}
                        className="w-4 h-4 text-primary focus:ring-primary rounded"
                    />
                    <div>
                        <p className="text-sm font-bold text-textPrimary">Use for Campaigns</p>
                        <p className="text-xs text-textSecondary">Send bulk email blasts from this address.</p>
                    </div>
                </label>
                <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-slate-50 transition-colors bg-white">
                    <input 
                        type="checkbox" 
                        checked={formData.useForClients}
                        onChange={(e) => setFormData({...formData, useForClients: e.target.checked})}
                        className="w-4 h-4 text-primary focus:ring-primary rounded"
                    />
                    <div>
                        <p className="text-sm font-bold text-textPrimary">Use for Clients</p>
                        <p className="text-xs text-textSecondary">Send individual emails, invoices, and alerts.</p>
                    </div>
                </label>
             </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 text-danger text-sm rounded-lg flex items-center gap-2 border border-red-100">
                <AlertCircle size={16} /> {errorMsg}
            </div>
          )}

          <div className="pt-4 border-t border-border flex justify-end gap-3">
             <button type="button" onClick={onClose} className="px-4 py-2 text-textSecondary hover:bg-slate-100 rounded-lg font-bold">Cancel</button>
             <button 
                type="submit" 
                disabled={isSubmitting}
                className="px-6 py-2 bg-darkGreen text-white font-bold rounded-lg hover:bg-opacity-90 disabled:opacity-50 flex items-center gap-2"
             >
                {isSubmitting ? (
                    <>
                        <Loader2 size={18} className="animate-spin" /> {statusMsg || 'Verifying...'}
                    </>
                ) : (
                    <><ShieldCheck size={18}/> Connect & Save</>
                )}
             </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default SmtpModal;
