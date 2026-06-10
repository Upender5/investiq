import { type InputHTMLAttributes, forwardRef } from "react";
import { twMerge } from "tailwind-merge";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  prefix?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, prefix, className, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-foreground/80">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {prefix && (
            <span className="absolute left-3 text-sm text-muted-foreground select-none">
              {prefix}
            </span>
          )}
          <input
            ref={ref}
            id={id}
            className={twMerge(
              "w-full rounded-lg border border-input bg-secondary py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
              prefix ? "pl-10 pr-4" : "px-4",
              error ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "",
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-loss">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
