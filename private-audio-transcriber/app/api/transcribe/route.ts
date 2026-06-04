import { getSession } from "@/lib/auth";
import { reserveQuotaSlot } from "@/lib/quota";
import {
  ALLOWED_AUDIO_EXTENSIONS,
  getMaxAudioSizeMb,
  getRunpodConfigStatus,
  validateAudioFile,
} from "@/lib/transcribe";

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

  const runpod = getRunpodConfigStatus();

  if (!runpod.isConfigured) {
    return Response.json(
      {
        error: "L’intégration RunPod n’est pas encore configurée.",
        missingEnv: runpod.missing,
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
    return Response.json(
      {
        error: "La validation BFF est prête, mais le chiffrement et l’exécution RunPod seront implémentés à l’étape suivante.",
        filename: file.name,
        maxAudioSizeMb: getMaxAudioSizeMb(),
        size: file.size,
        step: "bff-guard-ready",
      },
      { status: 501 },
    );
  } finally {
    reservation.release();
  }
}
