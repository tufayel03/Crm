
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { usePermissions } from '../hooks/usePermissions'; // Import Permission Hook
import { PermissionResource } from '../types';
import { 
  LayoutDashboard, 
  Users, 
  Briefcase,
  CheckSquare, 
  Video, 
  FileText, 
  Send, 
  BarChart3, 
  Settings, 
  LogOut,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Package,
  Database,
  Inbox,
  Home,
  AlertTriangle
} from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  toggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, toggleSidebar }) => {
  const { role, logout } = useAuthStore();
  const navigate = useNavigate();
  const { can } = usePermissions();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', resource: 'dashboard' },
    
    // Client Specific (No permission check needed usually, handled by roles check)
    { name: 'Portal', icon: Home, path: '/portal', roles: ['client'] }, 
    { name: 'Meetings', icon: Video, path: '/client-meetings', roles: ['client'] },
    // Internal Team (Mapped to Permission Resources)
    { name: 'Mailbox', icon: Inbox, path: '/mailbox', resource: 'mailbox' },
    { name: 'Analytics', icon: BarChart3, path: '/analytics', roles: ['admin', 'manager'] }, // Analytics usually strictly for managers
    { name: 'Leads', icon: Users, path: '/leads', resource: 'leads' },
    { name: 'Clients', icon: Briefcase, path: '/clients', resource: 'clients' },
    { name: 'Services', icon: Package, path: '/services', roles: ['admin', 'manager'] }, // Strict role
    { name: 'Tasks', icon: CheckSquare, path: '/tasks', resource: 'tasks' },
    { name: 'Meetings', icon: Video, path: '/meetings', resource: 'meetings', roles: ['admin', 'manager', 'agent'] },
    { name: 'Templates', icon: FileText, path: '/email-templates', roles: ['admin', 'manager'] },
    { name: 'Campaigns', icon: Send, path: '/campaigns', resource: 'campaigns' }, 
    { name: 'Payments', icon: CreditCard, path: '/payments', resource: 'payments' },
    { name: 'Database', icon: Database, path: '/database', roles: ['admin'] },
    { name: 'Error Logs', icon: AlertTriangle, path: '/error-logs', roles: ['admin'] },
    { name: 'Settings', icon: Settings, path: '/settings', resource: 'settings' },
  ];

  return (
    <aside 
      className={`bg-white border-r border-border h-screen flex flex-col fixed left-0 top-0 z-20 transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div className={`p-6 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} relative`}>
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="min-w-8 w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white text-xl font-bold shrink-0">
            M
          </div>
          {!isCollapsed && (
            <span className="text-2xl font-bold text-darkGreen whitespace-nowrap animate-in fade-in duration-300">
              Matlance
            </span>
          )}
        </div>
      </div>
      
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto overflow-x-hidden no-scrollbar">
        {menuItems.filter(item => {
            // 1. Check strict Role override (e.g. Client portal items)
            if (item.roles) {
                return role && item.roles.includes(role);
            }
            // 2. Check Permission Store
            if (item.resource) {
                return can('view', item.resource as PermissionResource);
            }
            return true;
        }).map((item, idx) => (
          <NavLink
            key={`${item.path}-${idx}`}
            to={item.path}
            title={isCollapsed ? item.name : ''}
            className={({ isActive }) => 
              `flex items-center gap-3 px-3 py-3 rounded-lg transition-colors whitespace-nowrap ${
                isActive 
                  ? 'bg-softMint text-darkGreen font-semibold' 
                  : 'text-textSecondary hover:bg-lightMint hover:text-darkGreen'
              } ${isCollapsed ? 'justify-center' : ''}`
            }
          >
            <item.icon size={20} className="shrink-0" />
            {!isCollapsed && <span className="text-sm animate-in fade-in slide-in-from-left-2 duration-200">{item.name}</span>}
          </NavLink>
        ))}
      </nav>

      <div className={`p-4 border-t border-border flex ${isCollapsed ? 'flex-col-reverse gap-3' : 'items-center gap-2'}`}>
        <button 
          onClick={handleLogout}
          title={isCollapsed ? 'Logout' : ''}
          className={`flex items-center gap-3 px-3 py-2 text-danger hover:bg-red-50 rounded-lg transition-colors whitespace-nowrap ${isCollapsed ? 'justify-center w-full' : 'flex-1'}`}
        >
          <LogOut size={20} className="shrink-0" />
          {!isCollapsed && <span className="text-sm font-medium">Logout</span>}
        </button>

        <button
          onClick={toggleSidebar}
          title={isCollapsed ? 'Expand' : 'Collapse'}
          className={`flex items-center justify-center p-2 text-textSecondary hover:text-primary hover:bg-slate-50 rounded-lg transition-colors ${isCollapsed ? 'w-full' : ''}`}
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
