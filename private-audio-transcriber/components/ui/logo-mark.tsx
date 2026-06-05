import { cn } from "@/lib/utils";

type LogoMarkProps = {
  className?: string;
  compact?: boolean;
};

export function LogoMark({ className, compact = false }: LogoMarkProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-sky-100 shadow-sm shadow-slate-200">
        <div className="absolute inset-[6px] rounded-[14px] border border-white bg-white/70" />
        <div className="relative flex w-6 flex-col gap-1.5">
          <span className="h-1.5 rounded-full bg-slate-700" />
          <span className="h-1.5 w-5 rounded-full bg-sky-400" />
          <span className="h-1.5 w-4 rounded-full bg-sky-600" />
        </div>
      </div>

      {!compact ? (
        <div className="space-y-1">
          <p className="text-[0.68rem] font-mono uppercase tracking-[0.32em] text-sky-700/70">
            Flux prive
          </p>
          <p className="text-lg font-semibold tracking-tight text-slate-900">
            Transcription Audio
          </p>
        </div>
      ) : null}
    </div>
  );
}
