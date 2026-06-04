import { cn } from "@/lib/utils";

type LogoMarkProps = {
  className?: string;
  compact?: boolean;
};

export function LogoMark({ className, compact = false }: LogoMarkProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-[linear-gradient(160deg,#ffffff,#e7f4fb)] shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
        <div className="absolute inset-[6px] rounded-[14px] border border-white bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.95),rgba(255,255,255,0.45)_58%,transparent_100%)]" />
        <div className="relative flex w-6 flex-col gap-1.5">
          <span className="h-1.5 rounded-full bg-slate-700" />
          <span className="h-1.5 w-5 rounded-full bg-sky-400" />
          <span className="h-1.5 w-4 rounded-full bg-sky-600" />
        </div>
      </div>

      {!compact ? (
        <div className="space-y-1">
          <p className="text-[0.68rem] font-mono uppercase tracking-[0.32em] text-sky-700/70">
            Private Workflow
          </p>
          <p className="text-lg font-semibold tracking-tight text-slate-900">
            Audio Transcriber
          </p>
        </div>
      ) : null}
    </div>
  );
}
