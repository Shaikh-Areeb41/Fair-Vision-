import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from "recharts";

// Assuming you might move your UI components later, but for now 
// we will use standard HTML/Tailwind classes that match your "Card" style
// so this component is self-contained.

interface BiasBarChartProps {
  data: { name: string; rate: string | number }[];
  title: string;
  description?: string;
  colors?: [string, string]; // [Color for Privileged, Color for Unprivileged]
  height?: number; // Allow custom height
  layout?: "vertical" | "horizontal";
}

export const BiasBarChart: React.FC<BiasBarChartProps> = ({
  data,
  title,
  description,
  colors = ["#8b5cf6", "#ec4899"], // Default Purple/Pink
  height = 200,
  layout = "vertical"
}) => {
  
  return (
    <div className="rounded-xl border border-border bg-card text-card-foreground shadow-soft h-full glass-card">
      <div className="flex flex-col space-y-1.5 p-6 pb-2">
        <h3 className="font-semibold leading-none tracking-tight text-foreground">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-muted-foreground text-zinc-500 dark:text-zinc-400">
            {description}
          </p>
        )}
      </div>
      <div className="p-6 pt-0" style={{ height: `${height}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout={layout}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
            <XAxis type="number" domain={[0, 100]} unit="%" hide={height < 200} />
            <YAxis 
              dataKey="name" 
              type="category" 
              width={100} 
              tick={{ fontSize: 11, fill: "currentColor" }} 
            />
            <Tooltip
              cursor={{ fill: "transparent" }}
              contentStyle={{
                borderRadius: "8px",
                border: "none",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                fontSize: "12px",
                backgroundColor: "var(--card)",
                color: "var(--foreground)"
              }}
            />
            <Bar dataKey="rate" radius={[0, 4, 4, 0]} barSize={height > 200 ? 40 : 20}>
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={index === 0 ? colors[0] : colors[1]} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};