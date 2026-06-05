"use client";

import { useMemo, useState } from "react";
import { TextPreviewPanel } from "@/components/results/text-preview-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DownloadIcon, HistoryIcon } from "@/components/ui/icons";
import { StatusPill } from "@/components/ui/status-pill";
import { TextField } from "@/components/ui/text-field";
import { cn, formatBytes } from "@/lib/utils";

type UploadState =
  | { message: string; tone: "neutral" | "success" | "warning" | "danger" }
  | null;

type CompletedJobPayload = {
  createdAt: string;
  downloads: {
    modified: string;
    raw: string;
    result: string;
  };
  firstName: string;
  jobId: string;
  lastName: string;
  mode: "mock-local";
  modifiedText: string;
  rawText: string;
  result: unknown;
  status: "success";
};

type PreflightUploadCardProps = {
  allowedExtensions: string[];
  maxAudioSizeMb: number;
};

function DownloadLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <a
      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold tracking-tight text-slate-800 hover:border-slate-300 hover:bg-slate-50"
      href={href}
    >
      <DownloadIcon className="h-4 w-4" />
      {label}
    </a>
  );
}

function HistoryLink({
  href,
}: {
  href: string;
}) {
  return (
    <a
      aria-label="Ouvrir dans l historique"
      className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50"
      href={href}
      title="Ouvrir dans l historique"
    >
      <HistoryIcon className="h-4 w-4" />
      <span className="sr-only">Ouvrir dans l historique</span>
    </a>
  );
}

export function PreflightUploadCard({
  allowedExtensions,
  maxAudioSizeMb,
}: PreflightUploadCardProps) {
  const [file, setFile] = useState<File | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadResult, setUploadResult] = useState<CompletedJobPayload | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>(null);

  const acceptedExtensions = useMemo(
    () => allowedExtensions.join(","),
    [allowedExtensions],
  );

  function validateIdentityFields() {
    if (!firstName.trim()) {
      return {
        ok: false as const,
        message: "Le prenom est requis pour lancer le traitement.",
      };
    }

    if (!lastName.trim()) {
      return {
        ok: false as const,
        message: "Le nom est requis pour lancer le traitement.",
      };
    }

    return { ok: true as const };
  }

  function validateFile(nextFile: File | null) {
    if (!nextFile) {
      return {
        ok: false as const,
        message: "Selectionnez un fichier audio pour continuer.",
      };
    }

    const extension = nextFile.name.includes(".")
      ? nextFile.name.slice(nextFile.name.lastIndexOf(".")).toLowerCase()
      : "";
    const maxAudioSizeBytes = maxAudioSizeMb * 1024 * 1024;

    if (!allowedExtensions.includes(extension)) {
      return {
        ok: false as const,
        message: `Type de fichier non pris en charge. Formats autorises : ${allowedExtensions.join(", ")}`,
      };
    }

    if (nextFile.size > maxAudioSizeBytes) {
      return {
        ok: false as const,
        message: `Le fichier depasse la limite de ${maxAudioSizeMb} Mo.`,
      };
    }

    return { ok: true as const };
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const identityValidation = validateIdentityFields();

    if (!identityValidation.ok) {
      setUploadResult(null);
      setUploadState({ message: identityValidation.message, tone: "danger" });
      return;
    }

    const currentFile = file;
    const validation = validateFile(currentFile);

    if (!validation.ok) {
      setUploadResult(null);
      setUploadState({ message: validation.message, tone: "danger" });
      return;
    }

    if (!currentFile) {
      setUploadResult(null);
      setUploadState({
        message: "Selectionnez un fichier audio pour continuer.",
        tone: "danger",
      });
      return;
    }

    setIsSubmitting(true);
    setUploadState({ message: "Traitement local en cours...", tone: "neutral" });

    try {
      const formData = new FormData();
      formData.append("file", currentFile);
      formData.append("firstName", firstName.trim());
      formData.append("lastName", lastName.trim());

      const response = await fetch("/api/transcribe", {
        body: formData,
        method: "POST",
      });

      const payload = (await response.json()) as
        | CompletedJobPayload
        | {
            error?: string;
          };

      if (!response.ok) {
        const errorPayload = payload as { error?: string };
        setUploadResult(null);
        setUploadState({
          message: errorPayload.error ?? "La requete a echoue.",
          tone: response.status === 429 ? "warning" : "danger",
        });
        return;
      }

      const completedPayload = payload as CompletedJobPayload;
      console.log("result.json", completedPayload.result);
      setUploadResult(completedPayload);
      setUploadState({
        message:
          "Le traitement mock est termine et le resultat a ete sauvegarde dans l historique local.",
        tone: "success",
      });
    } catch {
      setUploadResult(null);
      setUploadState({
        message: "La requete n a pas pu joindre l application locale.",
        tone: "danger",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card
      className="bg-white text-left lg:h-full lg:overflow-auto"
      description="Ajoutez le fichier et les informations minimales avant de lancer le traitement."
      eyebrow="Traitement"
      title="Nouveau fichier audio"
    >
      <form
        className="grid gap-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(18rem,0.92fr)] lg:items-start"
        onSubmit={handleSubmit}
      >
        <div className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              autoComplete="given-name"
              label="Prenom"
              onChange={(event) => setFirstName(event.target.value)}
              placeholder="Ex. Jean"
              required
              value={firstName}
            />
            <TextField
              autoComplete="family-name"
              label="Nom"
              onChange={(event) => setLastName(event.target.value)}
              placeholder="Ex. Dupont"
              required
              value={lastName}
            />
          </div>

          <label
            className={cn(
              "flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-white px-6 py-5 text-center hover:border-sky-300 hover:bg-sky-50 lg:min-h-[14rem]",
              file ? "border-sky-400 bg-sky-50" : "",
            )}
          >
            <input
              accept={acceptedExtensions}
              className="sr-only"
              name="file"
              onChange={(event) => {
                const nextFile = event.target.files?.[0] ?? null;
                setFile(nextFile);
                setUploadResult(null);

                if (!nextFile) {
                  setUploadState(null);
                  return;
                }

                const validation = validateFile(nextFile);

                if (!validation.ok) {
                  setUploadState({ message: validation.message, tone: "danger" });
                  return;
                }

                setUploadState({
                  message: "Fichier selectionne. Vous pouvez continuer.",
                  tone: "success",
                });
              }}
              type="file"
            />

            <span className="mb-3 rounded-full border border-slate-200 bg-white px-3 py-1 font-mono text-[0.68rem] uppercase tracking-[0.28em] text-sky-700/80">
              Selection audio
            </span>
            <p className="max-w-md text-lg font-semibold tracking-tight text-slate-900">
              Cliquez pour choisir un fichier audio.
            </p>
            <p className="mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
              Taille maximale : {maxAudioSizeMb} Mo.
            </p>
          </label>
        </div>

        <div className="grid gap-3 lg:content-start">
          <div className="grid gap-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-800">
                Fichier selectionne
              </p>
              <p className="break-words text-sm text-[var(--muted-strong)]">
                {file
                  ? `${file.name} (${formatBytes(file.size)})`
                  : "Aucun fichier selectionne pour le moment."}
              </p>
            </div>

            <Button
              className="w-full"
              disabled={!file || isSubmitting}
              type="submit"
              variant="secondary"
            >
              {isSubmitting ? "Traitement..." : "Lancer"}
            </Button>
          </div>

          {uploadState ? (
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <div className="mb-2">
                <StatusPill tone={uploadState.tone}>
                  {uploadState.tone === "danger"
                    ? "Bloque"
                    : uploadState.tone === "success"
                      ? "Pret"
                      : uploadState.tone === "warning"
                        ? "Attention"
                        : "En cours"}
                </StatusPill>
              </div>
              <p className="text-sm leading-6 text-[var(--muted-strong)]">
                {uploadState.message}
              </p>
            </div>
          ) : (
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-800">Etat</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted-strong)]">
                Ajoutez le fichier et les informations demandees, puis lancez le traitement.
              </p>
            </div>
          )}
        </div>
      </form>

      {uploadResult ? (
        <div className="mt-5 grid gap-4 border-t border-slate-200 pt-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-slate-900">
                Resultat disponible pour {uploadResult.firstName} {uploadResult.lastName}
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Job {uploadResult.jobId} enregistre dans l historique local.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusPill tone="warning">Mode mock local</StatusPill>
              <HistoryLink
                href={`/?tab=history&jobId=${encodeURIComponent(uploadResult.jobId)}`}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <DownloadLink href={uploadResult.downloads.raw} label="raw.txt" />
            <DownloadLink
              href={uploadResult.downloads.modified}
              label="modified.txt"
            />
            <DownloadLink
              href={uploadResult.downloads.result}
              label="result.json"
            />
          </div>

          <div className="grid gap-4">
            <TextPreviewPanel content={uploadResult.rawText} title="Texte brut" />
            <TextPreviewPanel
              content={uploadResult.modifiedText}
              title="Texte restructure"
            />
          </div>
        </div>
      ) : null}
    </Card>
  );
}
