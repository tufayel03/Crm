import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { apiRequest } from '../utils/api';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await apiRequest('/api/v1/auth/forgot', {
        method: 'POST',
        body: JSON.stringify({
          email,
          resetBaseUrl: window.location.origin
        })
      });
      setIsSent(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to send reset email');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-appBg flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-8 border border-border">
        
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-softMint rounded-xl flex items-center justify-center text-darkGreen mx-auto mb-4">
            <Mail size={24} />
          </div>
          <h1 className="text-2xl font-bold text-textPrimary">Reset Password</h1>
          <p className="text-textSecondary mt-2 text-sm">Enter your email address and we'll send you a link to reset your password.</p>
        </div>

        {isSent ? (
          <div className="text-center animate-in fade-in zoom-in duration-300">
            <div className="bg-green-50 text-green-700 p-4 rounded-xl border border-green-100 mb-6 flex flex-col items-center">
                <CheckCircle2 size={32} className="mb-2" />
                <p className="font-bold">Check your inbox</p>
                <p className="text-sm mt-1">We have sent a password reset link to <strong>{email}</strong>.</p>
            </div>
            <Link to="/login" className="text-primary font-bold hover:underline text-sm">
              Back to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 bg-red-50 text-danger text-sm rounded-lg flex items-center gap-2 border border-red-100">
                <AlertCircle size={16} /> {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-textSecondary mb-2">Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full px-4 py-3 bg-appBg border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                required
              />
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full py-3 bg-darkGreen text-white font-bold rounded-xl hover:bg-opacity-90 transition-all shadow-lg shadow-darkGreen/20 flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : 'Send Reset Link'}
            </button>

            <div className="text-center">
                <Link to="/login" className="text-textMuted hover:text-textPrimary text-sm font-medium flex items-center justify-center gap-1">
                    <ArrowLeft size={16} /> Back to Sign In
                </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
