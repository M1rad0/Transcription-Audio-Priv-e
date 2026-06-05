"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ExpandIcon,
  XIcon,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";

type TextPreviewPanelProps = {
  content: string;
  title: string;
};

function needsPreviewCollapse(content: string) {
  const lineCount = content.split(/\r?\n/).length;
  return lineCount > 10 || content.length > 900;
}

export function TextPreviewPanel({
  content,
  title,
}: TextPreviewPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFocusOpen, setIsFocusOpen] = useState(false);
  const shouldCollapse = useMemo(() => needsPreviewCollapse(content), [content]);
  const lineCount = useMemo(() => content.split(/\r?\n/).length, [content]);

  useEffect(() => {
    if (!isFocusOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsFocusOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFocusOpen]);

  const currentHeightClass = shouldCollapse
    ? isExpanded
      ? "max-h-[26rem]"
      : "max-h-56"
    : "max-h-[26rem]";

  return (
    <>
      <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/80">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">{title}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
              {lineCount} ligne{lineCount > 1 ? "s" : ""}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {shouldCollapse ? (
              <Button
                aria-label={isExpanded ? "Réduire le texte" : "Voir plus de texte"}
                className="h-10 w-10 rounded-xl px-0"
                onClick={() => setIsExpanded((current) => !current)}
                title={isExpanded ? "Réduire" : "Voir plus"}
                type="button"
                variant="ghost"
              >
                {isExpanded ? (
                  <ChevronUpIcon className="h-5 w-5" />
                ) : (
                  <ChevronDownIcon className="h-5 w-5" />
                )}
                <span className="sr-only">{isExpanded ? "Réduire" : "Voir plus"}</span>
              </Button>
            ) : null}
            <Button
              aria-label={`Ouvrir ${title} en plein écran`}
              className="h-11 w-11 rounded-xl px-0"
              onClick={() => setIsFocusOpen(true)}
              title="Plein écran"
              type="button"
              variant="secondary"
            >
              <ExpandIcon className="h-6 w-6" />
              <span className="sr-only">Plein écran</span>
            </Button>
          </div>
        </div>

        <div className="relative mt-3">
          <pre
            className={cn(
              "overflow-auto whitespace-pre-wrap text-sm leading-6 text-slate-600",
              currentHeightClass,
            )}
          >
            {content}
          </pre>
          {shouldCollapse && !isExpanded ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 rounded-b-[20px] bg-gradient-to-t from-white via-white/90 to-transparent" />
          ) : null}
        </div>
      </div>

      {isFocusOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <button
            aria-label={`Fermer la vue plein écran de ${title}`}
            className="absolute inset-0 bg-slate-950/20 backdrop-blur-[2px]"
            onClick={() => setIsFocusOpen(false)}
            type="button"
          />

          <div className="relative z-10 flex h-[calc(100vh-2rem)] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl shadow-slate-300/60">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-6">
              <div>
                <p className="font-mono text-[0.68rem] uppercase tracking-[0.32em] text-sky-700/70">
                  Lecture
                </p>
                <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">
                  {title}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Vue longue pour les contenus volumineux.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {shouldCollapse ? (
                  <Button
                    aria-label={isExpanded ? "Réduire l’aperçu" : "Étendre l’aperçu"}
                    className="h-11 w-11 rounded-xl px-0"
                    onClick={() => setIsExpanded((current) => !current)}
                    title={isExpanded ? "Réduire l’aperçu" : "Étendre l’aperçu"}
                    type="button"
                    variant="ghost"
                  >
                    {isExpanded ? (
                      <ChevronUpIcon className="h-5 w-5" />
                    ) : (
                      <ChevronDownIcon className="h-5 w-5" />
                    )}
                    <span className="sr-only">
                      {isExpanded ? "Réduire l’aperçu" : "Étendre l’aperçu"}
                    </span>
                  </Button>
                ) : null}
                <Button
                  aria-label="Fermer"
                  className="h-11 gap-2 rounded-xl px-4 text-sm"
                  onClick={() => setIsFocusOpen(false)}
                  title="Fermer"
                  type="button"
                  variant="secondary"
                >
                  <XIcon className="h-5 w-5" />
                  <span>Fermer</span>
                </Button>
              </div>
            </div>

            <div className="min-h-0 flex-1 px-5 py-5 sm:px-6">
              <pre className="h-full overflow-auto rounded-[24px] border border-slate-200 bg-white p-4 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                {content}
              </pre>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
