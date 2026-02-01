
import React, { useMemo } from 'react';
import { useLeadsStore } from '../stores/leadsStore';
import { useClientsStore } from '../stores/clientsStore';
import { useCampaignStore } from '../stores/campaignStore';
import DashboardStats from '../components/dashboard/DashboardStats';
import DashboardCharts from '../components/dashboard/DashboardCharts';

const Dashboard: React.FC = () => {
  const { leads } = useLeadsStore();
  const { clients, payments } = useClientsStore();
  const { campaigns } = useCampaignStore();

  // --- Counts ---
  const activeSubscriptionsCount = useMemo(() => {
    return clients.reduce((acc, c) => acc + c.services.filter(s => s.status === 'Active').length, 0);
  }, [clients]);

  // Revenue Calculation: Sum of PAID payments in the CURRENT MONTH
  const monthlyRevenue = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return payments.reduce((acc, p) => {
        const pDate = new Date(p.date);
        const isCurrentMonth = pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear;
        
        if (p.status === 'Paid' && isCurrentMonth) {
            return acc + p.amount;
        }
        return acc;
    }, 0);
  }, [payments]);

  const countryDistribution = useMemo(() => {
    const stats: Record<string, number> = {};
    leads.forEach(l => {
      stats[l.country] = (stats[l.country] || 0) + 1;
    });
    return stats;
  }, [leads]);

  // --- Trend Calculations ---
  const getTrend = (items: any[], dateKey: string, amountKey?: string) => {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastYear = currentMonth === 0 ? currentYear - 1 : currentYear;

      let currentVal = 0;
      let lastVal = 0;

      items.forEach(item => {
          const d = new Date(item[dateKey]);
          const value = amountKey ? (item[amountKey] || 0) : 1;

          if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
              currentVal += value;
          } else if (d.getMonth() === lastMonth && d.getFullYear() === lastYear) {
              lastVal += value;
          }
      });

      if (lastVal === 0) {
          return { val: currentVal > 0 ? '+100%' : '0%', isUp: currentVal > 0 };
      }

      const percent = ((currentVal - lastVal) / lastVal) * 100;
      return { 
          val: `${percent > 0 ? '+' : ''}${percent.toFixed(0)}%`, 
          isUp: percent >= 0 
      };
  };

  const trends = useMemo(() => {
      // Leads Trend (Created Date)
      const leadsTrend = getTrend(leads, 'createdAt');

      // Clients Trend (Onboarded Date)
      const clientsTrend = getTrend(clients, 'onboardedAt');

      // Services Trend (Start Date of Active Services)
      const allServices = clients.flatMap(c => c.services.filter(s => s.status === 'Active'));
      const servicesTrend = getTrend(allServices, 'startDate');

      // Revenue Trend (Payment Date)
      const paidPayments = payments.filter(p => p.status === 'Paid');
      const revenueTrend = getTrend(paidPayments, 'date', 'amount');

      return {
          leads: leadsTrend,
          clients: clientsTrend,
          services: servicesTrend,
          revenue: revenueTrend
      };
  }, [leads, clients, payments]);

  // --- Dynamic Chart Data (Last 7 Days) ---
  const chartData = useMemo(() => {
      const days = [];
      const isValidDate = (value: any) => {
          const d = new Date(value);
          return !Number.isNaN(d.getTime()) ? d : null;
      };

      // Generate last 7 days
      for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD
          const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });

          // Filter leads created on this day
          const dayLeads = leads.filter(l => {
              const created = isValidDate(l.createdAt);
              return created ? created.toISOString().startsWith(dateStr) : false;
          });
          
          // Calculate metrics for this day's cohort
          // Note: "Contacted" means status is Contacted or further down the funnel? 
          // For simplicity in this visual chart, we count leads created that day that ARE currently Contacted.
          // Ideally this would be historical snapshots, but this proxies activity.
          
          const contactedCount = dayLeads.filter(l => l.status === 'Contacted').length;
          const convertedCount = dayLeads.filter(l => ['Converted', 'Closed Won'].includes(l.status)).length;

          days.push({ 
              name: dayLabel, 
              contacted: contactedCount, 
              converted: convertedCount 
          });
      }
      return days;
  }, [leads]);

  // --- Campaign Stats ---
  const campaignStats = useMemo(() => {
      const totalSent = campaigns.reduce((acc, c) => acc + c.sentCount, 0);
      const totalOpens = campaigns.reduce((acc, c) => acc + c.openCount, 0);
      const totalClicks = campaigns.reduce((acc, c) => acc + c.clickCount, 0);
      
      const clickRate = totalSent > 0 ? ((totalClicks / totalSent) * 100).toFixed(1) + '%' : '0%';

      return {
          sent: totalSent,
          opens: totalOpens,
          clickRate
      };
  }, [campaigns]);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-textPrimary">Executive Dashboard</h2>
          <p className="text-textSecondary">Real-time revenue, reach, and conversion analytics.</p>
        </div>
      </div>

      <DashboardStats 
        leadsCount={leads.length}
        clientsCount={clients.length}
        activeServicesCount={activeSubscriptionsCount}
        monthlyRevenue={monthlyRevenue}
        trends={trends}
      />

      <DashboardCharts 
        data={chartData}
        countryDistribution={countryDistribution}
        totalLeads={leads.length}
        campaignStats={campaignStats}
      />
    </div>
  );
};

export default Dashboard;
