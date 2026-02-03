
import React, { useState } from 'react';
import { Key, Smartphone, CheckCircle2, Shield } from 'lucide-react';
import { apiRequest } from '../../utils/api';
import { useNotificationStore } from '../../stores/notificationStore';

const AuthenticationTab: React.FC = () => {
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [passwordStatus, setPasswordStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isSaving, setIsSaving] = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const { addNotification } = useNotificationStore();

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.new !== passwordForm.confirm) {
        alert("Passwords do not match.");
        return;
    }
    if (passwordForm.new.length < 6) {
        alert("Password must be at least 6 characters.");
        return;
    }
    setIsSaving(true);
    try {
        await apiRequest('/api/v1/auth/change-password', {
          method: 'POST',
          body: JSON.stringify({ currentPassword: passwordForm.current, newPassword: passwordForm.new })
        });
        setPasswordStatus('success');
        addNotification('success', 'Password updated.');
        setTimeout(() => {
            setPasswordStatus('idle');
            setPasswordForm({ current: '', new: '', confirm: '' });
        }, 1500);
    } catch (e: any) {
        setPasswordStatus('error');
        addNotification('error', e?.message || 'Failed to update password.');
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        
        {/* Password Change */}
        <div className="bg-white p-6 rounded-2xl border border-border">
            <h3 className="text-lg font-bold text-textPrimary flex items-center gap-2 mb-6"><Key size={20} className="text-primary"/> Change Password</h3>
            
            {passwordStatus === 'success' ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 animate-in fade-in">
                    <CheckCircle2 size={24} className="text-success" />
                    <div>
                        <h4 className="font-bold text-green-800">Password Changed</h4>
                        <p className="text-sm text-green-700">Your password has been successfully updated.</p>
                    </div>
                </div>
            ) : (
                <form onSubmit={handlePasswordUpdate} className="space-y-4 max-w-lg">
                    <div>
                        <label className="block text-xs font-bold text-textSecondary mb-1">Current Password</label>
                        <input type="password" value={passwordForm.current} onChange={(e) => setPasswordForm({...passwordForm, current: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none" required />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-textSecondary mb-1">New Password</label>
                        <input type="password" value={passwordForm.new} onChange={(e) => setPasswordForm({...passwordForm, new: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none" required minLength={6} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-textSecondary mb-1">Confirm New Password</label>
                        <input type="password" value={passwordForm.confirm} onChange={(e) => setPasswordForm({...passwordForm, confirm: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none" required minLength={6} />
                    </div>
                    <div className="pt-2">
                        <button type="submit" disabled={isSaving} className="px-6 py-2 bg-darkGreen text-white font-bold rounded-xl hover:bg-opacity-90 transition-all shadow-lg shadow-darkGreen/10 disabled:opacity-70">
                            {isSaving ? 'Updating...' : 'Update Password'}
                        </button>
                    </div>
                </form>
            )}
        </div>

        {/* 2FA */}
        <div className="bg-white p-6 rounded-2xl border border-border">
            <h3 className="text-lg font-bold text-textPrimary flex items-center gap-2 mb-4"><Shield size={20} className="text-primary"/> Two-Factor Authentication</h3>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-border">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${is2FAEnabled ? 'bg-success/10 text-success' : 'bg-slate-200 text-textMuted'}`}><Smartphone size={24}/></div>
                    <div>
                        <p className="font-bold text-textPrimary">Authenticator App</p>
                        <p className="text-xs text-textSecondary">{is2FAEnabled ? 'Enabled and secured' : 'Not configured'}</p>
                    </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={is2FAEnabled} onChange={() => setIs2FAEnabled(!is2FAEnabled)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-success"></div>
                </label>
            </div>
        </div>
    </div>
  );
};

export default AuthenticationTab;
