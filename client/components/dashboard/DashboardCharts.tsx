
import React from 'react';
import { TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface DashboardChartsProps {
  data: any[];
  countryDistribution: Record<string, number>;
  totalLeads: number;
  campaignStats: {
      sent: number;
      opens: number;
      clickRate: string;
  };
}

const DashboardCharts: React.FC<DashboardChartsProps> = ({ data, countryDistribution, totalLeads, campaignStats }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        <div className="bg-white p-6 rounded-2xl border border-border">
          <h3 className="font-bold text-lg text-textPrimary mb-6 flex items-center gap-2">
            <TrendingUp size={20} className="text-primary" /> Performance Trends
          </h3>
          {data.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-textMuted italic bg-slate-50 rounded-xl">
                  No data available. Add leads to see analytics.
              </div>
          ) : (
              <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} 
                    cursor={{fill: 'transparent'}}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  {/* Orange for Contacted */}
                  <Bar name="Contacted" dataKey="contacted" fill="#F59E0B" radius={[4, 4, 0, 0]} barSize={20} />
                  {/* Green for Converted */}
                  <Bar name="Converted" dataKey="converted" fill="#22C55E" radius={[4, 4, 0, 0]} barSize={20} />
                  </BarChart>
              </ResponsiveContainer>
              </div>
          )}
        </div>
      </div>

      <div className="space-y-8">
        <div className="bg-white p-6 rounded-2xl border border-border">
          <h3 className="font-bold text-lg text-textPrimary mb-6">Top Countries</h3>
          <div className="space-y-5">
            {Object.keys(countryDistribution).length === 0 ? (
                <p className="text-sm text-textMuted italic">No country data yet.</p>
            ) : (
              Object.entries(countryDistribution)
                  .sort((a, b) => (b[1] as number) - (a[1] as number))
                  .slice(0, 5)
                  .map(([country, count]) => (
                  <div key={country}>
                      <div className="flex justify-between text-sm mb-1">
                      <span className="text-textSecondary font-medium">{country}</span>
                      <span className="text-textPrimary font-bold">{count}</span>
                      </div>
                      <div className="w-full bg-appBg h-2 rounded-full overflow-hidden">
                      <div 
                          className="h-full bg-primary" 
                          style={{ width: `${((count as number) / totalLeads) * 100}%` }}
                      ></div>
                      </div>
                  </div>
                  ))
            )}
          </div>
        </div>
        
        <div className="bg-darkGreen p-6 rounded-2xl text-white">
          <h3 className="font-bold text-lg mb-2">Campaign Performance</h3>
          <p className="text-softMint/80 text-sm mb-6">Real-time metrics from all active campaigns.</p>
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <span className="text-sm opacity-80">Emails Sent</span>
              <span className="font-bold text-xl">{campaignStats.sent.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <span className="text-sm opacity-80">Total Opens</span>
              <span className="font-bold text-xl">{campaignStats.opens.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm opacity-80">Click Rate</span>
              <span className="font-bold text-xl text-primary">{campaignStats.clickRate}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardCharts;
