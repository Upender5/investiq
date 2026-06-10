import { type HTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  color?: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = { sm: "h-1.5", md: "h-2.5", lg: "h-4" };

export function Progress({
  value,
  max = 100,
  color = "bg-primary",
  size = "md",
  className,
  ...props
}: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div
      className={twMerge(
        "w-full overflow-hidden rounded-full bg-secondary/60",
        sizeMap[size],
        className
      )}
      {...props}
    >
      <div
        className={twMerge("h-full rounded-full transition-all duration-500", color)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
