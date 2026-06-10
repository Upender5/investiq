import { type HTMLAttributes, type TdHTMLAttributes, type ThHTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

export function Table({ className, children, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table
        className={twMerge("w-full border-collapse text-sm", className)}
        {...props}
      >
        {children}
      </table>
    </div>
  );
}

export function TableHead({ className, children, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={twMerge("border-b border-border", className)} {...props}>
      {children}
    </thead>
  );
}

export function TableBody({ className, children, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={twMerge("divide-y divide-border/60", className)} {...props}>
      {children}
    </tbody>
  );
}

export function TableRow({ className, children, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={twMerge("transition-colors hover:bg-accent/60", className)}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableHeader({ className, children, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={twMerge(
        "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground",
        className
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function TableCell({ className, children, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={twMerge("px-4 py-3 text-foreground/80", className)}
      {...props}
    >
      {children}
    </td>
  );
}
