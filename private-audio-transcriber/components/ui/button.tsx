import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  ghost:
    "border border-slate-200 bg-white text-slate-700 hover:border-sky-200 hover:bg-slate-50",
  primary:
    "border border-sky-200 bg-[linear-gradient(135deg,#38bdf8,#0ea5e9)] text-white shadow-[0_14px_28px_rgba(14,165,233,0.18)] hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(14,165,233,0.24)]",
  secondary:
    "border border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50",
};

export function Button({
  className,
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-11 items-center justify-center rounded-2xl px-4 text-sm font-semibold tracking-tight disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      )}
      type={type}
      {...props}
    />
  );
}
