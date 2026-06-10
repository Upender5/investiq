"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface SparkLineProps {
  data: { date: string; value: number }[];
  color?: string;
  height?: number;
  showAxes?: boolean;
}

export function SparkLine({ data, color = "#6366f1", height = 60, showAxes = false }: SparkLineProps) {
  const isPositive = data.length > 1 ? data[data.length - 1].value >= data[0].value : true;
  const lineColor = isPositive ? "#22c55e" : "#ef4444";

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
        <defs>
          <linearGradient id={`grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={lineColor} stopOpacity={0.3} />
            <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        {showAxes && <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 10 }} tickLine={false} axisLine={false} />}
        {showAxes && <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} tickLine={false} axisLine={false} width={50} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />}
        {showAxes && <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />}
        <Tooltip
          contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: "#94a3b8" }}
          itemStyle={{ color: lineColor }}
          formatter={(v) => [`₹${Number(v ?? 0).toLocaleString("en-IN")}`, "Value"]}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={lineColor}
          strokeWidth={2}
          fill={`url(#grad-${lineColor.replace("#", "")})`}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

interface StockChartProps {
  data: { date: string; close: number; open?: number }[];
  height?: number;
}

export function StockChart({ data, height = 280 }: StockChartProps) {
  const isPositive = data.length > 1 ? data[data.length - 1].close >= data[0].close : true;
  const lineColor = isPositive ? "#22c55e" : "#ef4444";

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
        <defs>
          <linearGradient id="stockGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={lineColor} stopOpacity={0.25} />
            <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis
          dataKey="date"
          tick={{ fill: "#94a3b8", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(d) => {
            const date = new Date(d);
            return date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
          }}
        />
        <YAxis
          tick={{ fill: "#94a3b8", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          width={60}
          domain={["auto", "auto"]}
          tickFormatter={(v) => `₹${v.toLocaleString("en-IN")}`}
        />
        <Tooltip
          contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: "#94a3b8" }}
          itemStyle={{ color: lineColor }}
          formatter={(v) => [`₹${Number(v ?? 0).toLocaleString("en-IN")}`, "Price"]}
          labelFormatter={(d) => new Date(d).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
        />
        <Area
          type="monotone"
          dataKey="close"
          stroke={lineColor}
          strokeWidth={2}
          fill="url(#stockGrad)"
          dot={false}
          activeDot={{ r: 4, fill: lineColor }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

interface PieChartProps {
  data: { name: string; value: number; color: string }[];
  size?: number;
}

export function DonutChart({ data, size = 140 }: PieChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0);
  let cumulative = 0;
  const r = 50;
  const cx = 70;
  const cy = 70;
  const circumference = 2 * Math.PI * r;

  return (
    <svg width={size} height={size} viewBox="0 0 140 140">
      {data.map((slice) => {
        const pct = slice.value / total;
        const offset = circumference - pct * circumference;
        const rotation = (cumulative / total) * 360 - 90;
        cumulative += slice.value;
        return (
          <circle
            key={slice.name}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={slice.color}
            strokeWidth={20}
            strokeDasharray={`${pct * circumference} ${(1 - pct) * circumference}`}
            strokeDashoffset={0}
            transform={`rotate(${rotation}, ${cx}, ${cy})`}
            style={{ transition: "all 0.5s ease" }}
          />
        );
      })}
      <circle cx={cx} cy={cy} r={40} fill="#1e293b" />
      <text x={cx} y={cy - 4} textAnchor="middle" fill="white" fontSize={11} fontWeight="bold">
        Portfolio
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="#94a3b8" fontSize={9}>
        Allocation
      </text>
    </svg>
  );
}
