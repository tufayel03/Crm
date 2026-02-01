
import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Payment } from '../../types';

interface RevenueChartProps {
  payments: Payment[];
}

const RevenueChart: React.FC<RevenueChartProps> = ({ payments }) => {
  const data = useMemo(() => {
    // 1. Group by Month (Last 6 Months)
    const months: Record<string, number> = {};
    const now = new Date();
    
    // Initialize last 6 months with 0
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      months[key] = 0;
    }

    // Sum paid payments
    payments.forEach(p => {
        if (p.status === 'Paid') {
            const date = new Date(p.date);
            const key = date.toLocaleString('default', { month: 'short', year: '2-digit' });
            if (months[key] !== undefined) {
                months[key] += p.amount;
            }
        }
    });

    return Object.keys(months).map(name => ({
        name,
        amount: months[name]
    }));
  }, [payments]);

  return (
    <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 12 }} 
                    dy={10}
                />
                <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 12 }} 
                    tickFormatter={(val) => `$${val/1000}k`}
                />
                <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ 
                        borderRadius: '12px', 
                        border: 'none', 
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                        padding: '12px'
                    }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                />
                <Bar 
                    dataKey="amount" 
                    fill="#4B7F52" 
                    radius={[4, 4, 0, 0]} 
                    barSize={40}
                    animationDuration={1500}
                />
            </BarChart>
        </ResponsiveContainer>
    </div>
  );
};

export default RevenueChart;
