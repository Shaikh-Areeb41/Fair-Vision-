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
  clean?: boolean;
  className?: string;
}

export const BiasBarChart: React.FC<BiasBarChartProps> = ({
  data,
  title,
  description,
  colors = ["rgb(var(--status-analytics))", "rgb(var(--status-danger))"],
  height = 200,
  layout = "vertical",
  clean = false,
  className,
}) => {
  const normalizedData = data.map((entry) => {
    const raw = Number(entry.rate);
    const normalized = Number.isFinite(raw)
      ? Math.max(0, Math.min(100, raw <= 1 ? raw * 100 : raw))
      : 0;
    return {
      ...entry,
      rate: normalized,
    };
  });

  
  return (
    <div className={clean ? "h-full bg-transparent" : `fv-panel h-full ${className || ""}`}>
      {(title || description) ? (
      <div className="flex flex-col space-y-1.5 p-6 pb-2">
        <h3 className="font-semibold leading-none tracking-tight text-foreground">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      ) : null}
      <div className={clean ? "p-0" : "p-6 pt-0"} style={{ height: `${height}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={normalizedData}
            layout={layout}
            margin={clean ? { top: 8, right: 12, left: 8, bottom: 8 } : { top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              horizontal
              vertical
              opacity={clean ? 0.16 : 0.26}
              stroke="rgb(var(--border))"
            />
            <XAxis
              type="number"
              domain={[0, 100]}
              unit="%"
              hide={height < 170}
              tick={{ fontSize: 11, fill: "rgb(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={{ stroke: "rgb(var(--border))" }}
            />
            <YAxis 
              dataKey="name" 
              type="category" 
              width={clean ? 120 : 100} 
              tick={{ fontSize: 12, fill: "rgb(var(--foreground))" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: "transparent" }}
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid rgb(var(--border))",
                boxShadow: "var(--shadow-soft)",
                fontSize: "12px",
                backgroundColor: "rgb(var(--popover))",
                color: "rgb(var(--popover-foreground))",
                backdropFilter: "none",
                WebkitBackdropFilter: "none",
                opacity: 1,
              }}
              labelStyle={{ color: "rgb(var(--popover-foreground))", fontWeight: 600 }}
              itemStyle={{ color: "rgb(var(--popover-foreground))" }}
            />
            <Bar dataKey="rate" radius={[0, 8, 8, 0]} barSize={height > 180 ? 28 : 20}>
              {normalizedData.map((entry, index) => (
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