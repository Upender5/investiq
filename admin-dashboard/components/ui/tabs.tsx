"use client";

import { type HTMLAttributes, type ButtonHTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

interface TabsProps extends HTMLAttributes<HTMLDivElement> {
  value: string;
  onValueChange: (value: string) => void;
}

interface TabsListProps extends HTMLAttributes<HTMLDivElement> {}

interface TabsTriggerProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onSelect"> {
  value: string;
  activeValue: string;
  onSelect: (value: string) => void;
}

interface TabsContentProps extends HTMLAttributes<HTMLDivElement> {
  value: string;
  activeValue: string;
}

export function Tabs({ value, onValueChange, className, children, ...props }: TabsProps) {
  return (
    <div className={twMerge("space-y-4", className)} {...props}>
      {children}
    </div>
  );
}

export function TabsList({ className, children, ...props }: TabsListProps) {
  return (
    <div
      className={twMerge(
        "flex gap-1 rounded-lg bg-card/60 border border-border p-1",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({ value, activeValue, onSelect, className, children, ...props }: TabsTriggerProps) {
  const isActive = value === activeValue;
  return (
    <button
      onClick={() => onSelect(value)}
      className={twMerge(
        "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
        isActive
          ? "bg-primary text-white shadow"
          : "text-muted-foreground hover:text-foreground",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, activeValue, className, children, ...props }: TabsContentProps) {
  if (value !== activeValue) return null;
  return (
    <div className={twMerge("", className)} {...props}>
      {children}
    </div>
  );
}
