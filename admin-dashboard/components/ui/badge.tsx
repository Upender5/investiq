import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "success" | "danger" | "warning" | "info" | "secondary" | "ai";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-secondary text-secondary-foreground",
  success: "bg-green-500/15 text-profit",
  danger: "bg-red-500/15 text-loss",
  warning: "bg-yellow-500/15 text-warning",
  info: "bg-primary/15 text-primary",
  secondary: "bg-muted text-muted-foreground",
  ai: "bg-ai/15 text-ai",
};

export function Badge({ variant = "default", className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
