
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { 
  LayoutDashboard, 
  Users, 
  Briefcase,
  CheckSquare, 
  Video, 
  Mail, 
  FileText, 
  Send, 
  BarChart3, 
  ShieldCheck, 
  Settings, 
  LogOut,
  CreditCard
} from 'lucide-react';

const Sidebar: React.FC = () => {
  const { role, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', roles: ['admin', 'manager', 'agent'] },
    { name: 'Analytics', icon: BarChart3, path: '/analytics', roles: ['admin', 'manager'] },
    { name: 'Mailbox', icon: Mail, path: '/mailbox', roles: ['admin', 'manager', 'agent'] },
    { name: 'Leads', icon: Users, path: '/leads', roles: ['admin', 'manager', 'agent'] },
    { name: 'Clients', icon: Briefcase, path: '/clients', roles: ['admin', 'manager'] },
    { name: 'Services', icon: Briefcase, path: '/services', roles: ['admin', 'manager'] },
    { name: 'Tasks', icon: CheckSquare, path: '/tasks', roles: ['admin', 'manager', 'agent'] },
    { name: 'Meetings', icon: Video, path: '/meetings', roles: ['admin', 'manager', 'agent'] },
    { name: 'Templates', icon: FileText, path: '/email-templates', roles: ['admin', 'manager'] },
    { name: 'Campaigns', icon: Send, path: '/campaigns', roles: ['admin', 'manager'] },
    { name: 'Payments', icon: CreditCard, path: '/payments', roles: ['admin', 'manager'] },
    { name: 'Database', icon: ShieldCheck, path: '/database', roles: ['admin'] },
    { name: 'Settings', icon: Settings, path: '/settings', roles: ['admin', 'manager', 'agent'] },
  ];

  return (
    <aside className="w-64 bg-white border-r border-border h-screen flex flex-col fixed left-0 top-0 z-20">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-darkGreen flex items-center gap-2">
          <span className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white text-xl">M</span>
          Matlance
        </h1>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {menuItems.filter(item => role && item.roles.includes(role)).map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => 
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive 
                  ? 'bg-softMint text-darkGreen font-semibold' 
                  : 'text-textSecondary hover:bg-lightMint hover:text-darkGreen'
              }`
            }
          >
            <item.icon size={20} />
            <span className="text-sm">{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-border">
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-danger hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut size={20} />
          <span className="text-sm">Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
