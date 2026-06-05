import Link from "next/link";
import { TextPreviewPanel } from "@/components/results/text-preview-panel";
import { Card } from "@/components/ui/card";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DownloadIcon,
  ResetIcon,
  SearchIcon,
  XIcon,
} from "@/components/ui/icons";
import { StatusPill } from "@/components/ui/status-pill";
import type {
  HistoryListResult,
  StoredJobDetail,
} from "@/lib/jobs";
import { cn } from "@/lib/utils";

type HistoryViewProps = {
  filters: {
    date: string;
    dateFrom: string;
    dateTo: string;
    firstName: string;
    lastName: string;
    originalFilename: string;
  };
  history: HistoryListResult;
  selectedJob: StoredJobDetail | null;
};

const inputClassName =
  "h-8 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100";

function buildHistoryHref(
  filters: HistoryViewProps["filters"],
  overrides: Record<string, number | string | null | undefined>,
) {
  const params = new URLSearchParams();
  params.set("tab", "history");

  if (filters.firstName) {
    params.set("firstName", filters.firstName);
  }

  if (filters.lastName) {
    params.set("lastName", filters.lastName);
  }

  if (filters.originalFilename) {
    params.set("originalFilename", filters.originalFilename);
  }

  if (filters.date) {
    params.set("date", filters.date);
  }

  if (filters.dateFrom) {
    params.set("dateFrom", filters.dateFrom);
  }

  if (filters.dateTo) {
    params.set("dateTo", filters.dateTo);
  }

  for (const [key, value] of Object.entries(overrides)) {
    if (value === null || value === undefined || value === "") {
      params.delete(key);
      continue;
    }

    params.set(key, String(value));
  }

  return `/?${params.toString()}`;
}

function DownloadLink({
  artifact,
  jobId,
  label,
}: {
  artifact: "modified" | "raw" | "result";
  jobId: string;
  label: string;
}) {
  return (
    <a
      className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold tracking-tight text-slate-800 hover:border-slate-300 hover:bg-slate-50"
      href={`/api/history/download?jobId=${encodeURIComponent(jobId)}&artifact=${artifact}`}
    >
      <DownloadIcon className="h-4 w-4" />
      {label}
    </a>
  );
}

export function HistoryView({
  filters,
  history,
  selectedJob,
}: HistoryViewProps) {
  const hasResults = history.totalItems > 0;
  const hasActiveFilters = Boolean(
    filters.date ||
      filters.dateFrom ||
      filters.dateTo ||
      filters.firstName ||
      filters.lastName ||
      filters.originalFilename,
  );
  const closeModalHref = buildHistoryHref(filters, {
    jobId: null,
    page: history.page,
  });

  return (
    <div className="grid gap-4 lg:h-[calc(100vh-2rem)] lg:grid-rows-[auto_minmax(0,1fr)]">
      <Card
        className="bg-white p-4"
        description="Recherchez rapidement dans les traitements sauvegardes localement."
        eyebrow="Historique"
        title="Resultats enregistres"
      >
        <details
          className="rounded-[20px] border border-slate-200 bg-slate-50/80"
          open={hasActiveFilters}
        >
          <summary className="flex list-none items-center justify-between gap-3 px-3 py-3 text-sm font-semibold text-slate-900 marker:hidden">
            <span className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600">
                <SearchIcon className="h-3.5 w-3.5" />
              </span>
              <span>Filtres de recherche</span>
            </span>
            {hasActiveFilters ? (
              <ChevronUpIcon className="h-4 w-4 text-slate-500" />
            ) : (
              <ChevronDownIcon className="h-4 w-4 text-slate-500" />
            )}
          </summary>

          <form action="/" className="border-t border-slate-200 px-4 py-3">
            <input name="tab" type="hidden" value="history" />

            <div className="mx-auto grid w-full max-w-[70rem] gap-3">
              <div className="grid gap-2 lg:grid-cols-2 xl:grid-cols-[0.82fr_0.82fr_1.45fr_0.95fr_0.95fr_0.95fr]">
                <label className="grid min-w-0 gap-1.5">
                  <span className="truncate text-[10px] font-medium uppercase tracking-[0.12em] text-slate-600">
                    Prenom
                  </span>
                  <input
                    className={inputClassName}
                    defaultValue={filters.firstName}
                    name="firstName"
                    placeholder="Ex. Jean"
                  />
                </label>

                <label className="grid min-w-0 gap-1.5">
                  <span className="truncate text-[10px] font-medium uppercase tracking-[0.12em] text-slate-600">
                    Nom
                  </span>
                  <input
                    className={inputClassName}
                    defaultValue={filters.lastName}
                    name="lastName"
                    placeholder="Ex. Dupont"
                  />
                </label>

                <label className="grid min-w-0 gap-1.5">
                  <span className="truncate text-[10px] font-medium uppercase tracking-[0.12em] text-slate-600">
                    Nom du fichier
                  </span>
                  <input
                    className={inputClassName}
                    defaultValue={filters.originalFilename}
                    name="originalFilename"
                    placeholder="Ex. reunion.mp3"
                  />
                </label>

                <label className="grid min-w-0 gap-1.5">
                  <span className="truncate text-[10px] font-medium uppercase tracking-[0.12em] text-slate-600">
                    Date exacte
                  </span>
                  <input
                    className={inputClassName}
                    defaultValue={filters.date}
                    name="date"
                    type="date"
                  />
                </label>

                <label className="grid min-w-0 gap-1.5">
                  <span className="truncate text-[10px] font-medium uppercase tracking-[0.12em] text-slate-600">
                    Date de debut
                  </span>
                  <input
                    className={inputClassName}
                    defaultValue={filters.dateFrom}
                    name="dateFrom"
                    type="date"
                  />
                </label>

                <label className="grid min-w-0 gap-1.5">
                  <span className="truncate text-[10px] font-medium uppercase tracking-[0.12em] text-slate-600">
                    Date de fin
                  </span>
                  <input
                    className={inputClassName}
                    defaultValue={filters.dateTo}
                    name="dateTo"
                    type="date"
                  />
                </label>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  aria-label="Rechercher"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-sky-200 bg-[linear-gradient(135deg,#38bdf8,#0ea5e9)] text-white shadow-[0_12px_24px_rgba(14,165,233,0.18)] hover:-translate-y-0.5 hover:shadow-[0_16px_28px_rgba(14,165,233,0.24)]"
                  title="Rechercher"
                >
                  <SearchIcon className="h-4 w-4" />
                  <span className="sr-only">Rechercher</span>
                </button>
                <Link
                  aria-label="Reinitialiser"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50"
                  href="/?tab=history"
                  title="Reinitialiser"
                >
                  <ResetIcon className="h-4 w-4" />
                  <span className="sr-only">Reinitialiser</span>
                </Link>
              </div>
            </div>
          </form>
        </details>
      </Card>

      <Card
        className="bg-white p-4 lg:flex lg:min-h-0 lg:flex-col"
        description={`${history.totalItems} traitement(s) local(aux) trouve(s).`}
        eyebrow="Liste"
        title="Traitements precedents"
      >
        {hasResults ? (
          <div className="grid gap-3 lg:min-h-0 lg:flex-1 lg:grid-rows-[minmax(0,1fr)_auto]">
            <div className="grid gap-3 lg:min-h-0 lg:content-start lg:overflow-y-auto lg:pr-1">
              {history.items.map((item) => {
                const isActive = selectedJob?.jobId === item.jobId;

                return (
                  <Link
                    className={cn(
                      "rounded-[24px] border px-4 py-3 text-left transition-colors",
                      isActive
                        ? "border-sky-200 bg-sky-50"
                        : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white",
                    )}
                    href={buildHistoryHref(filters, {
                      jobId: item.jobId,
                      page: history.page,
                    })}
                    key={item.jobId}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {item.firstName} {item.lastName}
                          </p>
                          <span className="h-1 w-1 shrink-0 rounded-full bg-slate-300" />
                          <span className="shrink-0 text-sm text-[var(--muted)]">
                            {new Date(item.createdAt).toLocaleDateString("fr-FR")}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--muted)]">
                          <p className="min-w-0 truncate">{item.originalFilename}</p>
                          {item.durationSeconds ? (
                            <span className="shrink-0">{item.durationSeconds}s</span>
                          ) : null}
                          {item.engine ? (
                            <span className="shrink-0 truncate">{item.engine}</span>
                          ) : null}
                        </div>
                      </div>

                      <div className="shrink-0 pt-0.5">
                        <StatusPill tone="success">Succes</StatusPill>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
              <p className="text-sm text-[var(--muted)]">
                Page {history.page} sur {history.totalPages}
              </p>
              <div className="flex gap-2">
                <Link
                  aria-disabled={history.page <= 1}
                  className={cn(
                    "inline-flex h-10 w-10 items-center justify-center rounded-2xl border text-sm font-semibold",
                    history.page <= 1
                      ? "pointer-events-none border-slate-200 bg-slate-100 text-slate-400"
                      : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50",
                  )}
                  href={buildHistoryHref(filters, {
                    page: Math.max(1, history.page - 1),
                  })}
                  title="Page precedente"
                >
                  <ArrowLeftIcon className="h-4 w-4" />
                  <span className="sr-only">Precedent</span>
                </Link>
                <Link
                  aria-disabled={history.page >= history.totalPages}
                  className={cn(
                    "inline-flex h-10 w-10 items-center justify-center rounded-2xl border text-sm font-semibold",
                    history.page >= history.totalPages
                      ? "pointer-events-none border-slate-200 bg-slate-100 text-slate-400"
                      : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50",
                  )}
                  href={buildHistoryHref(filters, {
                    page: Math.min(history.totalPages, history.page + 1),
                  })}
                  title="Page suivante"
                >
                  <ArrowRightIcon className="h-4 w-4" />
                  <span className="sr-only">Suivant</span>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm text-[var(--muted)]">
            Aucun traitement reussi n est encore disponible dans l historique local.
          </div>
        )}
      </Card>

      {selectedJob ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Link
            aria-label="Fermer le detail du traitement"
            className="absolute inset-0 bg-slate-950/36 backdrop-blur-[2px]"
            href={closeModalHref}
          />

          <div className="relative z-10 flex max-h-[calc(100vh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.18)]">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-6">
              <div className="min-w-0">
                <p className="font-mono text-[0.68rem] uppercase tracking-[0.32em] text-sky-700/70">
                  Detail
                </p>
                <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">
                  {selectedJob.firstName} {selectedJob.lastName}
                </h3>
                <p className="mt-1 truncate text-sm text-[var(--muted)]">
                  {selectedJob.originalFilename}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <StatusPill tone="success">Succes</StatusPill>
                <Link
                  aria-label="Fermer"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50"
                  href={closeModalHref}
                  title="Fermer"
                >
                  <XIcon className="h-4 w-4" />
                  <span className="sr-only">Fermer</span>
                </Link>
              </div>
            </div>

            <div className="grid gap-4 overflow-y-auto px-5 py-5 sm:px-6">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">Traite le</p>
                  <p className="mt-2 text-sm text-[var(--muted-strong)]">
                    {selectedJob.createdAtLabel}
                  </p>
                </div>

                {selectedJob.durationSeconds ? (
                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">Duree</p>
                    <p className="mt-2 text-sm text-[var(--muted-strong)]">
                      {selectedJob.durationSeconds}s
                    </p>
                  </div>
                ) : null}

                {selectedJob.engine ? (
                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">Moteur</p>
                    <p className="mt-2 text-sm text-[var(--muted-strong)]">
                      {selectedJob.engine}
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-3">
                <DownloadLink artifact="raw" jobId={selectedJob.jobId} label="raw.txt" />
                <DownloadLink
                  artifact="modified"
                  jobId={selectedJob.jobId}
                  label="modified.txt"
                />
                <DownloadLink
                  artifact="result"
                  jobId={selectedJob.jobId}
                  label="result.json"
                />
              </div>

              <div className="grid gap-4">
                <TextPreviewPanel content={selectedJob.rawText} title="Texte brut" />
                <TextPreviewPanel
                  content={selectedJob.modifiedText}
                  title="Texte restructure"
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
