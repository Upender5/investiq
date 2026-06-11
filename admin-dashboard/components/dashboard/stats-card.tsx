"use client";

import { useId } from "react";
import { type LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { twMerge } from "tailwind-merge";
import { Card } from "@/components/ui/card";

interface StatsCardProps {
  label: string;
  value: string;
  change?: number;
  changeLabel?: string;
  icon?: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  sparkData?: number[];
}

function Sparkline({
  data,
  positive,
  gradId,
}: {
  data: number[];
  positive: boolean;
  gradId: string;
}) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const W = 80;
  const H = 32;
  const pad = 2;

  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - pad - ((v - min) / range) * (H - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const polyline = pts.join(" ");
  const first = pts[0].split(",");
  const last = pts[pts.length - 1].split(",");
  const fillPath = `M${polyline} L${W},${H} L0,${H} Z`;
  const color = positive ? "#22c55e" : "#ef4444";

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className="overflow-visible"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#${gradId})`} />
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* End dot */}
      <circle
        cx={last[0]}
        cy={last[1]}
        r="2.5"
        fill={color}
        className="animate-pulse"
      />
    </svg>
  );
}

export function StatsCard({
  label,
  value,
  change,
  changeLabel,
  icon: Icon,
  iconColor = "text-primary",
  iconBg = "bg-primary/10",
  sparkData,
}: StatsCardProps) {
  const uid = useId();
  const gradId = `spk-${uid.replace(/:/g, "")}`;

  const hasChange = change !== undefined;
  const isPositive = hasChange
    ? change >= 0
    : sparkData && sparkData.length >= 2
    ? sparkData[sparkData.length - 1] >= sparkData[0]
    : true;

  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <Card className="group relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5 cursor-default">
      {/* Hover shimmer overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/4 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

      {/* Top row: label + icon */}
      <div className="mb-3 flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
          {label}
        </p>
        {Icon && (
          <div className={twMerge("rounded-xl p-2.5 flex-shrink-0", iconBg)}>
            <Icon className={twMerge("h-4 w-4", iconColor)} />
          </div>
        )}
      </div>

      {/* Bottom row: value + sparkline */}
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-2xl font-bold tracking-tight text-foreground font-mono">
            {value}
          </p>
          {hasChange && (
            <div
              className={twMerge(
                "mt-1.5 flex items-center gap-1 text-xs font-semibold",
                isPositive ? "text-profit" : "text-loss"
              )}
            >
              <TrendIcon className="h-3 w-3 flex-shrink-0" />
              <span>
                {isPositive && change! > 0 ? "+" : ""}
                {change!.toFixed(2)}%
              </span>
              {changeLabel && (
                <span className="font-normal text-muted-foreground/60">
                  {changeLabel}
                </span>
              )}
            </div>
          )}
        </div>
        {sparkData && sparkData.length >= 2 && (
          <div className="mb-1 flex-shrink-0 opacity-75 group-hover:opacity-100 transition-opacity duration-200">
            <Sparkline data={sparkData} positive={isPositive} gradId={gradId} />
          </div>
        )}
      </div>
    </Card>
  );
}
