import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useSettingsStore } from '../stores/settingsStore';
import { ShieldAlert, Loader2 } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const login = useAuthStore(state => state.login);
  const { requestIpResetLink } = useSettingsStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('reason') === 'ip_blocked') {
        setError('Access Denied: Your IP address has been blocked by the workspace security rules.');
    }
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
        await login(email, password);

        const from = (location.state as any)?.from?.pathname;
        if (useAuthStore.getState().role === 'client') {
            navigate('/portal', { replace: true });
        } else {
            navigate(from || '/dashboard', { replace: true });
        }
    } catch (e: any) {
        setError(e.message || 'Login failed');
    } finally {
        setIsLoading(false);
    }
  };

  const handleEmergencyReset = async () => {
      const adminEmail = window.prompt('Enter the admin email to receive the emergency reset link:');
      if (!adminEmail) return;
      try {
          await requestIpResetLink(adminEmail);
          alert('If that admin exists, a reset link has been sent.');
      } catch (e: any) {
          setError(e.message || 'Emergency reset request failed.');
      }
  };

  return (
    <div className="min-h-screen bg-appBg flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-8 border border-border">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4">M</div>
          <h1 className="text-2xl font-bold text-textPrimary">Matlance CRM</h1>
          <p className="text-textSecondary mt-2">Sign in to access your workspace</p>
        </div>

        {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-in slide-in-from-top-2">
                <ShieldAlert size={24} className="text-danger shrink-0" />
                <div>
                    <h4 className="font-bold text-danger text-sm">Security Alert</h4>
                    <p className="text-xs text-red-800 mt-1">{error}</p>
                    {error.includes('IP address') && (
                        <button 
                            onClick={handleEmergencyReset}
                            className="mt-2 text-xs font-bold text-danger underline hover:no-underline"
                        >
                            Emergency Reset Rules
                        </button>
                    )}
                </div>
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-textSecondary mb-2">Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full px-4 py-3 bg-appBg border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              required
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-semibold text-textSecondary">Password</label>
                <Link to="/forgot-password" className="text-xs text-primary font-bold hover:underline">Forgot Password?</Link>
            </div>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-appBg border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all"
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full py-4 bg-darkGreen text-white font-bold rounded-xl hover:bg-opacity-90 transition-all shadow-lg shadow-darkGreen/20 flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-border text-center">
          <p className="text-sm text-textMuted">Protected by Matlance Security</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
