"use client";

import type { PnlHistory } from "@/types";

interface PortfolioChartProps {
  data: PnlHistory[];
}

export function PortfolioChart({ data }: PortfolioChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-muted-foreground/80 text-sm">
        No chart data available
      </div>
    );
  }

  const values = data.map((d) => d.value);
  const maxVal = Math.max(...values);
  const minVal = Math.min(...values);
  const range = maxVal - minVal || 1;

  const chartWidth = 600;
  const chartHeight = 180;
  const barGap = 4;
  const barCount = data.length;
  const barWidth = Math.max(8, (chartWidth - barGap * (barCount - 1)) / barCount);

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight + 30}`}
        className="w-full"
        preserveAspectRatio="none"
        style={{ minHeight: 160 }}
      >
        {data.map((point, i) => {
          const normalised = (point.value - minVal) / range;
          const barH = Math.max(4, normalised * chartHeight);
          const x = i * (barWidth + barGap);
          const y = chartHeight - barH;
          const isPositive = point.value >= 0;

          return (
            <g key={point.date}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                rx={3}
                fill={isPositive ? "#22c55e" : "#ef4444"}
                opacity={0.85}
              />
              {barCount <= 12 && (
                <text
                  x={x + barWidth / 2}
                  y={chartHeight + 20}
                  textAnchor="middle"
                  fontSize={9}
                  fill="#94a3b8"
                >
                  {new Date(point.date).toLocaleDateString("en-IN", {
                    month: "short",
                    day: "numeric",
                  })}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
