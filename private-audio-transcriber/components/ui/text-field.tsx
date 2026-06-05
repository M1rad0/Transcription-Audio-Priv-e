import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: string;
  helper?: string;
  label: string;
};

export function TextField({
  className,
  error,
  helper,
  id,
  label,
  ...props
}: TextFieldProps) {
  return (
    <label className="grid gap-2" htmlFor={id}>
      <span className="text-sm font-medium text-slate-800">{label}</span>
      <input
        className={cn(
          "h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-300 focus:bg-white focus:ring-4 focus:ring-sky-100",
          error ? "border-orange-300 focus:border-orange-400 focus:ring-orange-100" : "",
          className,
        )}
        id={id}
        {...props}
      />
      {error ? (
        <span className="text-sm text-orange-700">{error}</span>
      ) : helper ? (
        <span className="text-sm text-[var(--muted)]">{helper}</span>
      ) : null}
    </label>
  );
}
