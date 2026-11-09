import { forwardRef } from "react";
import clsx from "clsx";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, id, children, ...props }, ref) => (
    <label className="flex flex-col gap-1.5 text-sm">
      {label && <span className="text-xs font-medium text-text-muted">{label}</span>}
      <select
        ref={ref}
        id={id}
        className={clsx(
          "min-h-10 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none",
          error && "border-danger",
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error && <span className="text-xs text-danger">{error}</span>}
    </label>
  )
);
Select.displayName = "Select";
