import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import GlobalCallUI from '../components/GlobalCallUI';
import ToastContainer from '../components/ui/ToastContainer';
import { useSettingsStore } from '../stores/settingsStore';
import { useAuthStore } from '../stores/authStore';
import { useCallStore } from '../stores/callStore';
import { useMeetingsStore } from '../stores/meetingsStore';
import { useLeadsStore } from '../stores/leadsStore';
import { useClientsStore } from '../stores/clientsStore';
import { useTasksStore } from '../stores/tasksStore';
import { useCampaignStore } from '../stores/campaignStore';
import { useServicesStore } from '../stores/servicesStore';
import { useTeamStore } from '../stores/teamStore';
import { useAuditStore } from '../stores/auditStore';

const DashboardLayout: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const toggleSidebar = () => setIsCollapsed(!isCollapsed);

  const { ipRules, fetchSettings } = useSettingsStore();
  const { logout, user, initialize, isAuthenticated, isReady } = useAuthStore();
  const { connect, disconnect } = useCallStore();
  const { checkReminders, fetchMeetings } = useMeetingsStore();
  const { fetchLeads, fetchMeta: fetchLeadMeta } = useLeadsStore();
  const { fetchClients, fetchPayments } = useClientsStore();
  const { fetchTasks } = useTasksStore();
  const { fetchCampaigns, fetchTemplates } = useCampaignStore();
  const { fetchPlans } = useServicesStore();
  const { fetchMembers } = useTeamStore();
  const { fetchLogs } = useAuditStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isReady) {
      initialize();
    }
  }, [initialize, isReady]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    connect(user.id);
    return () => disconnect();
  }, [isAuthenticated, user, connect, disconnect]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const load = async () => {
      await Promise.allSettled([
        fetchSettings(),
        fetchLeadMeta(),
        fetchLeads(),
        fetchClients(),
        fetchPayments(),
        fetchTasks(),
        fetchMeetings(),
        fetchCampaigns(),
        fetchTemplates(),
        fetchMembers(),
        fetchLogs(),
        fetchPlans()
      ]);
    };
    load();
  }, [isAuthenticated, fetchSettings, fetchLeads, fetchClients, fetchPayments, fetchTasks, fetchMeetings, fetchCampaigns, fetchTemplates, fetchMembers, fetchLogs, fetchPlans]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      Promise.allSettled([
        fetchSettings(),
        fetchLeadMeta(),
        fetchLeads(),
        fetchClients(),
        fetchPayments(),
        fetchTasks(),
        fetchMeetings(),
        fetchCampaigns(),
        fetchTemplates(),
        fetchMembers(),
        fetchLogs(),
        fetchPlans()
      ]);
    }, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchSettings, fetchLeads, fetchClients, fetchPayments, fetchTasks, fetchMeetings, fetchCampaigns, fetchTemplates, fetchMembers, fetchLogs, fetchPlans]);

  useEffect(() => {
    const checkAccess = async () => {
        if (ipRules.mode === 'none') return;

        try {
            const res = await fetch('https://api.ipify.org?format=json');
            const data = await res.json();
            const currentIp = data.ip;
            
            let isBlocked = false;
            if (ipRules.mode === 'blacklist' && ipRules.blacklist.includes(currentIp)) isBlocked = true;
            if (ipRules.mode === 'whitelist' && !ipRules.whitelist.includes(currentIp)) isBlocked = true;

            if (isBlocked) {
                logout();
                navigate('/login?reason=ip_blocked');
            }
        } catch (e) {
            console.error("IP Check failed", e);
        }
    };

    checkAccess();
  }, [ipRules, logout, navigate]);

  useEffect(() => {
      const interval = setInterval(() => {
          checkReminders();
      }, 60000);

      checkReminders();

      return () => clearInterval(interval);
  }, [checkReminders]);

  return (
    <div className="min-h-screen flex bg-appBg">
      <GlobalCallUI />
      <ToastContainer />
      
      <Sidebar isCollapsed={isCollapsed} toggleSidebar={toggleSidebar} />
      <div 
        className={`flex-1 flex flex-col transition-all duration-300 ${
          isCollapsed ? 'pl-20' : 'pl-64'
        }`}
      >
        <Topbar />
        <main className="p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
