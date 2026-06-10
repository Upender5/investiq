import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  name: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "h-7 w-7 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-12 w-12 text-base",
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Avatar({ name, size = "md", className, ...props }: AvatarProps) {
  return (
    <div
      className={cn(
        "flex flex-shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground",
        sizeMap[size],
        className
      )}
      {...props}
    >
      {initials(name)}
    </div>
  );
}
