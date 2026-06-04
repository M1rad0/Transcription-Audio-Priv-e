"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { cn, formatBytes } from "@/lib/utils";

type UploadState =
  | { message: string; tone: "neutral" | "success" | "warning" | "danger" }
  | null;

type PreflightUploadCardProps = {
  allowedExtensions: string[];
  maxAudioSizeMb: number;
};

export function PreflightUploadCard({
  allowedExtensions,
  maxAudioSizeMb,
}: PreflightUploadCardProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>(null);

  const acceptedExtensions = useMemo(
    () => allowedExtensions.join(","),
    [allowedExtensions],
  );

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

    const currentFile = file;
    const validation = validateFile(currentFile);

    if (!validation.ok) {
      setUploadState({ message: validation.message, tone: "danger" });
      return;
    }

    if (!currentFile) {
      setUploadState({
        message: "Selectionnez un fichier audio pour continuer.",
        tone: "danger",
      });
      return;
    }

    setIsSubmitting(true);
    setUploadState({ message: "Verification en cours...", tone: "neutral" });

    try {
      const formData = new FormData();
      formData.append("file", currentFile);

      const response = await fetch("/api/transcribe", {
        body: formData,
        method: "POST",
      });

      const payload = (await response.json()) as {
        error?: string;
        missingEnv?: string[];
        step?: string;
      };

      if (response.status === 501 && payload.step === "bff-guard-ready") {
        setUploadState({
          message:
            "Le fichier a ete controle. Le traitement complet sera branche a l etape suivante.",
          tone: "warning",
        });
        return;
      }

      if (!response.ok) {
        const suffix = payload.missingEnv?.length
          ? ` Variables manquantes : ${payload.missingEnv.join(", ")}`
          : "";

        setUploadState({
          message: `${payload.error ?? "La requete a echoue."}${suffix}`,
          tone: response.status === 503 ? "warning" : "danger",
        });
        return;
      }

      setUploadState({
        message: "Le fichier est pret.",
        tone: "success",
      });
    } catch {
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
      className="bg-white text-left"
      description="Choisissez un fichier audio puis lancez la verification."
      eyebrow="Etape 1"
      title="Votre fichier audio"
    >
      <form className="grid gap-4" onSubmit={handleSubmit}>
        <label
          className={cn(
            "flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-white px-6 py-5 text-center hover:border-sky-300 hover:bg-sky-50",
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
                message: "Fichier selectionné. Vous pouvez continuer.",
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

        <div className="grid gap-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_auto] md:items-center">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-800">
              Fichier selectionné
            </p>
            <p className="text-sm text-[var(--muted-strong)]">
              {file
                ? `${file.name} (${formatBytes(file.size)})`
                : "Aucun fichier selectionné pour le moment."}
            </p>
          </div>

          <Button disabled={!file || isSubmitting} type="submit" variant="secondary">
            {isSubmitting ? "Verification..." : "Continuer"}
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
                      ? "Etape suivante"
                      : "Verification"}
              </StatusPill>
            </div>
            <p className="text-sm leading-6 text-[var(--muted-strong)]">
              {uploadState.message}
            </p>
          </div>
        ) : null}
      </form>
    </Card>
  );
}
