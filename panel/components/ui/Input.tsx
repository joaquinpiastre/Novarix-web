import { forwardRef } from "react";
import clsx from "clsx";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => (
    <label className="flex flex-col gap-1.5 text-sm">
      {label && <span className="text-xs font-medium text-text-muted">{label}</span>}
      <input
        ref={ref}
        id={id}
        className={clsx(
          "min-h-10 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted/70 focus:border-accent focus:outline-none",
          error && "border-danger",
          className
        )}
        {...props}
      />
      {error && <span className="text-xs text-danger">{error}</span>}
    </label>
  )
);
Input.displayName = "Input";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => (
    <label className="flex flex-col gap-1.5 text-sm">
      {label && <span className="text-xs font-medium text-text-muted">{label}</span>}
      <textarea
        ref={ref}
        id={id}
        className={clsx(
          "min-h-10 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted/70 focus:border-accent focus:outline-none",
          error && "border-danger",
          className
        )}
        {...props}
      />
      {error && <span className="text-xs text-danger">{error}</span>}
    </label>
  )
);
Textarea.displayName = "Textarea";
