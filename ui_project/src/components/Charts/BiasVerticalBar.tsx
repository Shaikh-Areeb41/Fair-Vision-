import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from "recharts";

interface BiasVerticalBarProps {
  data: { name: string; rate: string | number }[];
  title: string;
  description?: string;
  colors?: string[];
}

export const BiasVerticalBar: React.FC<BiasVerticalBarProps> = ({
  data,
  title,
  description,
  colors = ["rgb(var(--status-success))", "rgb(var(--status-info))"]
}) => {
  const normalizedData = data.map((entry) => {
    const raw = Number(entry.rate);
    const normalized = Number.isFinite(raw)
      ? Math.max(0, Math.min(100, raw <= 1 ? raw * 100 : raw))
      : 0;
    return { ...entry, rate: normalized };
  });

  return (
    <div className="fv-panel h-full flex flex-col">
      <div className="p-6 pb-2">
        <h3 className="font-semibold leading-none tracking-tight">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
      <div className="flex-1 min-h-[180px] p-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={normalizedData} margin={{ top: 10, right: 8, left: -14, bottom: 0 }}>
             <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} stroke="rgb(var(--border))" />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 11, fill: "rgb(var(--foreground))" }} 
              tickLine={false} 
              axisLine={false} 
              interval={0} // <--- THIS FIXES THE MISSING LABEL
            />
            <YAxis 
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: "rgb(var(--muted-foreground))" } } 
              tickLine={false} 
              axisLine={false} 
            />
            <Tooltip 
              cursor={{ fill: 'transparent' }}
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid rgb(var(--border))',
                boxShadow: 'var(--shadow-soft)',
                backgroundColor: 'rgb(var(--popover))',
                color: 'rgb(var(--popover-foreground))',
                backdropFilter: 'none',
                WebkitBackdropFilter: 'none',
                opacity: 1
              }}
              labelStyle={{ color: 'rgb(var(--popover-foreground))', fontWeight: 600 }}
              itemStyle={{ color: 'rgb(var(--popover-foreground))' }}
            />
            <Bar dataKey="rate" radius={[4, 4, 0, 0]} barSize={40}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};