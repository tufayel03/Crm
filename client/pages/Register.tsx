import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Loader2, Mail, Lock } from 'lucide-react';
import { apiRequest } from '../utils/api';

const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiRequest<{ message?: string }>('/api/v1/auth/register-client', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      setSuccess(res.message || 'Registration submitted. Await admin approval.');
      setEmail('');
      setPassword('');
      setConfirm('');
    } catch (e: any) {
      setError(e.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-appBg flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-8 border border-border">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4">M</div>
          <h1 className="text-2xl font-bold text-textPrimary">Client Registration</h1>
          <p className="text-textSecondary mt-2">Register for client portal access</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <ShieldCheck size={22} className="text-danger shrink-0" />
            <div>
              <h4 className="font-bold text-danger text-sm">Registration Error</h4>
              <p className="text-xs text-red-800 mt-1">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
            <ShieldCheck size={22} className="text-success shrink-0" />
            <div>
              <h4 className="font-bold text-success text-sm">Request Submitted</h4>
              <p className="text-xs text-green-800 mt-1">{success}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-textSecondary mb-2">Client Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" size={16} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@company.com"
                className="w-full pl-9 pr-4 py-3 bg-appBg border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                required
              />
            </div>
            <p className="text-xs text-textMuted mt-2">
              Use the same email that exists in the Clients database.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-textSecondary mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" size={16} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-4 py-3 bg-appBg border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-textSecondary mb-2">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" size={16} />
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-4 py-3 bg-appBg border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-darkGreen text-white font-bold rounded-xl hover:bg-opacity-90 transition-all shadow-lg shadow-darkGreen/20 flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : 'Request Access'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-border text-center">
          <p className="text-sm text-textMuted">
            Already approved? <Link to="/login" className="text-primary font-bold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
