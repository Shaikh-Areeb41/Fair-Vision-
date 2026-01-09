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
  colors = ["#3b82f6", "#60a5fa"] // Blue
}) => {
  return (
    <div className="rounded-xl border border-border bg-card text-card-foreground shadow-soft h-full glass-card flex flex-col">
      <div className="p-6 pb-2">
        <h3 className="font-semibold leading-none tracking-tight">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
      <div className="flex-1 min-h-[180px] p-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
             <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 11 }} 
              tickLine={false} 
              axisLine={false} 
              interval={0} // <--- THIS FIXES THE MISSING LABEL
            />
            <YAxis 
              tick={{ fontSize: 11 }} 
              tickLine={false} 
              axisLine={false} 
            />
            <Tooltip 
              cursor={{ fill: 'transparent' }}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
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