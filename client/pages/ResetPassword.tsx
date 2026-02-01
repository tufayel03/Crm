import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { apiRequest } from '../utils/api';

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const email = searchParams.get('email');
  const token = searchParams.get('token');

  useEffect(() => {
      if (!token || !email) {
          setError('Invalid or expired reset link.');
      }
  }, [token, email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
    }
    if (password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      await apiRequest('/api/v1/auth/reset', {
        method: 'POST',
        body: JSON.stringify({ token, password })
      });

      setSuccess(true);

      setTimeout(() => {
          navigate('/login');
      }, 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to reset password');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (error && !token) {
      return (
        <div className="min-h-screen bg-appBg flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-border text-center max-w-sm w-full">
                <AlertCircle size={48} className="text-danger mx-auto mb-4" />
                <h2 className="text-xl font-bold text-textPrimary">Invalid Link</h2>
                <p className="text-textSecondary mt-2 mb-6">This password reset link is invalid or has expired.</p>
                <button onClick={() => navigate('/login')} className="px-6 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg font-bold text-textPrimary transition-colors">
                    Back to Login
                </button>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-appBg flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-8 border border-border">
        
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mx-auto mb-4">
            <Lock size={24} />
          </div>
          <h1 className="text-2xl font-bold text-textPrimary">Set New Password</h1>
          <p className="text-textSecondary mt-2 text-sm">Create a strong password for <strong>{email}</strong></p>
        </div>

        {success ? (
          <div className="text-center animate-in fade-in zoom-in duration-300">
            <div className="bg-green-50 text-green-700 p-6 rounded-xl border border-green-100 mb-6 flex flex-col items-center">
                <CheckCircle2 size={48} className="mb-3" />
                <h3 className="font-bold text-lg">Password Updated!</h3>
                <p className="text-sm mt-1">Your password has been successfully reset.</p>
            </div>
            <p className="text-textMuted text-sm">Redirecting to login in 3 seconds...</p>
            <button onClick={() => navigate('/login')} className="mt-4 text-primary font-bold hover:underline">
              Sign In Now
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
                <div className="p-3 bg-red-50 text-danger text-sm rounded-lg flex items-center gap-2 border border-red-100">
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-textSecondary mb-2">New Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-appBg border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-textSecondary mb-2">Confirm Password</label>
              <input 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 bg-appBg border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                required
                minLength={6}
              />
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full py-3 bg-primary text-darkGreen font-bold rounded-xl hover:bg-opacity-90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
