import { cn } from "@/lib/utils";

type StatusPillProps = {
  children: string;
  tone?: "neutral" | "success" | "warning" | "danger";
};

const tones: Record<NonNullable<StatusPillProps["tone"]>, string> = {
  danger: "border-orange-200 bg-orange-50 text-orange-700",
  neutral: "border-slate-200 bg-white text-slate-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
};

export function StatusPill({
  children,
  tone = "neutral",
}: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 font-mono text-[0.7rem] uppercase tracking-[0.24em]",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}
