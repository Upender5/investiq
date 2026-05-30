import { type HTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

type BadgeVariant = "default" | "success" | "danger" | "warning" | "info" | "secondary";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-slate-700 text-slate-300",
  success: "bg-green-500/20 text-green-400",
  danger: "bg-red-500/20 text-red-400",
  warning: "bg-yellow-500/20 text-yellow-400",
  info: "bg-indigo-500/20 text-indigo-400",
  secondary: "bg-slate-600 text-slate-200",
};

export function Badge({ variant = "default", className, children, ...props }: BadgeProps) {
  return (
    <span
      className={twMerge(
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
