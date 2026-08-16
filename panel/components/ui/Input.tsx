import { forwardRef } from "react";
import clsx from "clsx";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => (
    <label className="flex flex-col gap-1.5 text-sm">
      {label && <span className="font-medium text-text-primary">{label}</span>}
      <input
        ref={ref}
        id={id}
        className={clsx(
          "rounded-lg border border-border bg-surface-hover px-3 py-2 text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none",
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
      {label && <span className="font-medium text-text-primary">{label}</span>}
      <textarea
        ref={ref}
        id={id}
        className={clsx(
          "rounded-lg border border-border bg-surface-hover px-3 py-2 text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none",
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
