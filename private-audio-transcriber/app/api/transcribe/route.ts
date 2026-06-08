import { getSession } from "@/lib/auth";
import {
  createEncryptedRunpodPayload,
  generateJobId,
  getEncryptionConfigStatus,
} from "@/lib/crypto";
import { saveCompletedJob } from "@/lib/jobs";
import { buildMockTranscriptionResult } from "@/lib/mock-transcribe";
import { getPipelineConfigStatus, runProcessingPipeline } from "@/lib/pipeline";
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
  const firstName = getRequiredText(formData, "firstName", "Le prenom");
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

  const pipelineConfig = getPipelineConfigStatus();

  if (!pipelineConfig.isConfigured) {
    return Response.json(
      {
        error:
          pipelineConfig.issues.join(" ") ||
          "La pipeline de workers n'est pas configuree.",
      },
      { status: 503 },
    );
  }

  const encryptionConfig = getEncryptionConfigStatus();

  if (!pipelineConfig.isMockFallback && !encryptionConfig.isConfigured) {
    const details = [...encryptionConfig.missing, ...encryptionConfig.issues].join(", ");

    return Response.json(
      {
        error: details
          ? `Le chiffrement BFF n'est pas pret : ${details}`
          : "Le chiffrement BFF n'est pas pret.",
      },
      { status: 503 },
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
    const createdAt = new Date().toISOString();
    const result = pipelineConfig.isMockFallback
      ? buildMockTranscriptionResult({
          fileName: file.name,
          fileSize: file.size,
          firstName: firstName.value,
          jobId: generateJobId(),
          lastName: lastName.value,
        })
      : await (async () => {
          const audioBuffer = Buffer.from(await file.arrayBuffer());
          const encryptedRequest = createEncryptedRunpodPayload({
            audioBuffer,
            fileName: file.name,
          });

          return runProcessingPipeline(encryptedRequest.payload);
        })();
    const jobId = result.job_id;

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
        mode:
          "mode" in result && typeof result.mode === "string"
            ? result.mode
            : pipelineConfig.modeLabel,
        modifiedText: result.modified_text,
        rawText: result.raw_text,
        result,
        status: "success",
      },
      { status: 200 },
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Le traitement serveur a echoue.",
      },
      { status: 500 },
    );
  } finally {
    reservation.release();
  }
}
