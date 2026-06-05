import { randomUUID } from "node:crypto";
import { getSession } from "@/lib/auth";
import { saveCompletedJob } from "@/lib/jobs";
import { buildMockTranscriptionResult } from "@/lib/mock-transcribe";
import { reserveQuotaSlot } from "@/lib/quota";
import {
  ALLOWED_AUDIO_EXTENSIONS,
  getMaxAudioSizeMb,
  validateAudioFile,
} from "@/lib/transcribe";

function getRequiredText(formData: FormData, fieldName: string, label: string) {
  const value = String(formData.get(fieldName) ?? "").trim();

  if (!value) {
    return {
      error: `${label} est requis.`,
      ok: false as const,
    };
  }

  return {
    ok: true as const,
    value,
  };
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return Response.json(
      { error: "Authentification requise." },
      { status: 401 },
    );
  }

  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.includes("multipart/form-data")) {
    return Response.json(
      { error: "Le format attendu est multipart/form-data." },
      { status: 415 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const firstName = getRequiredText(formData, "firstName", "Le prénom");
  const lastName = getRequiredText(formData, "lastName", "Le nom");

  if (!firstName.ok) {
    return Response.json({ error: firstName.error }, { status: 400 });
  }

  if (!lastName.ok) {
    return Response.json({ error: lastName.error }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return Response.json(
      { error: "Un fichier audio est requis." },
      { status: 400 },
    );
  }

  const validation = validateAudioFile(file);

  if (!validation.ok) {
    return Response.json(
      {
        allowedExtensions: ALLOWED_AUDIO_EXTENSIONS,
        error: validation.error,
        maxAudioSizeMb: getMaxAudioSizeMb(),
      },
      { status: validation.status },
    );
  }

  const reservation = reserveQuotaSlot();

  if (!reservation.ok) {
    return Response.json(
      {
        error: reservation.error,
      },
      { status: 429 },
    );
  }

  try {
    const jobId = `job_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const createdAt = new Date().toISOString();
    const result = buildMockTranscriptionResult({
      fileName: file.name,
      fileSize: file.size,
      firstName: firstName.value,
      jobId,
      lastName: lastName.value,
    });

    await saveCompletedJob({
      createdAt,
      durationSeconds: result.duration_seconds,
      engine: result.engine,
      firstName: firstName.value,
      jobId,
      lastName: lastName.value,
      modifiedText: result.modified_text,
      originalFilename: file.name,
      rawText: result.raw_text,
      result,
    });

    return Response.json(
      {
        createdAt,
        downloads: {
          modified: `/api/history/download?jobId=${jobId}&artifact=modified`,
          raw: `/api/history/download?jobId=${jobId}&artifact=raw`,
          result: `/api/history/download?jobId=${jobId}&artifact=result`,
        },
        firstName: firstName.value,
        jobId,
        lastName: lastName.value,
        mode: "mock-local",
        modifiedText: result.modified_text,
        rawText: result.raw_text,
        result,
        status: "success",
      },
      { status: 200 },
    );
  } catch {
    return Response.json(
      {
        error:
          "Le traitement local n’a pas pu être enregistré dans l’historique.",
      },
      { status: 500 },
    );
  } finally {
    reservation.release();
  }
}
