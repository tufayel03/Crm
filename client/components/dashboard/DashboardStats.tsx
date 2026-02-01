
import React from 'react';
import { Users, Briefcase, CheckSquare, DollarSign, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface TrendData {
    val: string;
    isUp: boolean;
}

interface DashboardStatsProps {
  leadsCount: number;
  clientsCount: number;
  activeServicesCount: number;
  monthlyRevenue: number;
  trends: {
      leads: TrendData;
      clients: TrendData;
      services: TrendData;
      revenue: TrendData;
  };
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ 
  leadsCount, 
  clientsCount, 
  activeServicesCount, 
  monthlyRevenue,
  trends
}) => {
  const stats = [
    { title: 'Total Leads', value: leadsCount, icon: Users, color: 'bg-softMint', trend: trends.leads.val, trendUp: trends.leads.isUp },
    { title: 'Paying Clients', value: clientsCount, icon: Briefcase, color: 'bg-blue-100', trend: trends.clients.val, trendUp: trends.clients.isUp },
    { title: 'Active Services', value: activeServicesCount, icon: CheckSquare, color: 'bg-purple-100', trend: trends.services.val, trendUp: trends.services.isUp },
    { title: 'Monthly Revenue', value: `$${monthlyRevenue.toLocaleString()}`, icon: DollarSign, color: 'bg-orange-100', trend: trends.revenue.val, trendUp: trends.revenue.isUp },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, idx) => (
        <div key={idx} className={`${stat.color} p-6 rounded-2xl border border-white shadow-sm transition-transform hover:scale-[1.02]`}>
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-white bg-opacity-60 rounded-xl">
              <stat.icon size={24} className="text-darkGreen" />
            </div>
            <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-white bg-opacity-60 ${stat.trend === '0%' ? 'text-textSecondary' : (stat.trendUp ? 'text-success' : 'text-danger')}`}>
              {stat.trend === '0%' ? <Minus size={14} /> : (stat.trendUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />)}
              {stat.trend}
            </div>
          </div>
          <p className="text-textSecondary text-sm font-medium">{stat.title}</p>
          <h3 className="text-2xl font-bold text-textPrimary mt-1">{stat.value}</h3>
        </div>
      ))}
    </div>
  );
};

export default DashboardStats;
