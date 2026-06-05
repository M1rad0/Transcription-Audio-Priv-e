import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  eyebrow?: string;
  title?: string;
  description?: string;
  actions?: ReactNode;
};

export function Card({
  actions,
  children,
  className,
  description,
  eyebrow,
  title,
  ...props
}: CardProps) {
  return (
    <section
      className={cn(
        "relative isolate overflow-hidden rounded-[28px] border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/70",
        className,
      )}
      {...props}
    >
      {eyebrow || title || description || actions ? (
        <header className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            {eyebrow ? (
              <p className="font-mono text-[0.68rem] uppercase tracking-[0.32em] text-sky-700/70">
                {eyebrow}
              </p>
            ) : null}
            {title ? (
              <h2 className="text-xl font-semibold tracking-tight text-slate-900">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="max-w-2xl text-sm leading-6 text-slate-600">
                {description}
              </p>
            ) : null}
          </div>

          {actions ? <div className="shrink-0">{actions}</div> : null}
        </header>
      ) : null}

      {children}
    </section>
  );
}
