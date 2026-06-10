import { type LucideIcon } from "lucide-react";
import { twMerge } from "tailwind-merge";
import { Card } from "@/components/ui/card";

interface StatsCardProps {
  label: string;
  value: string;
  change?: number;
  changeLabel?: string;
  icon?: LucideIcon;
  iconColor?: string;
}

export function StatsCard({
  label,
  value,
  change,
  changeLabel,
  icon: Icon,
  iconColor = "text-primary",
}: StatsCardProps) {
  const isPositive = change !== undefined && change >= 0;
  const isNegative = change !== undefined && change < 0;

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {Icon && (
          <div className="rounded-lg bg-secondary p-2">
            <Icon className={twMerge("h-5 w-5", iconColor)} />
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        {change !== undefined && (
          <p
            className={twMerge(
              "mt-1 text-sm font-medium",
              isPositive ? "text-profit" : isNegative ? "text-loss" : "text-muted-foreground"
            )}
          >
            {isPositive ? "+" : ""}
            {change.toFixed(2)}%{changeLabel ? ` ${changeLabel}` : ""}
          </p>
        )}
      </div>
    </Card>
  );
}
