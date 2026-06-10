import { type SelectHTMLAttributes, forwardRef } from "react";
import { twMerge } from "tailwind-merge";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className, id, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-foreground/80">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={id}
        className={twMerge(
          "w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-red-500 focus:border-red-500 focus:ring-red-500",
          className
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-loss">{error}</p>}
    </div>
  )
);
Select.displayName = "Select";
