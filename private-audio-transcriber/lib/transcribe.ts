import { parsePositiveInt } from "@/lib/utils";

export const ALLOWED_AUDIO_EXTENSIONS = [
  ".mp3",
  ".wav",
  ".m4a",
  ".ogg",
  ".flac",
] as const;

const DEFAULT_MAX_AUDIO_SIZE_MB = 12;

export function getMaxAudioSizeMb() {
  return parsePositiveInt(process.env.MAX_AUDIO_SIZE_MB, DEFAULT_MAX_AUDIO_SIZE_MB)!;
}

export function getMaxAudioSizeBytes() {
  return getMaxAudioSizeMb() * 1024 * 1024;
}

export function getFileExtension(filename: string) {
  const index = filename.lastIndexOf(".");

  if (index === -1) {
    return "";
  }

  return filename.slice(index).toLowerCase();
}

export function validateAudioFile(file: File) {
  const extension = getFileExtension(file.name);

  if (!ALLOWED_AUDIO_EXTENSIONS.includes(extension as (typeof ALLOWED_AUDIO_EXTENSIONS)[number])) {
    return {
      ok: false as const,
      error: `Type de fichier non pris en charge. Formats autorisés : ${ALLOWED_AUDIO_EXTENSIONS.join(", ")}`,
      status: 400,
    };
  }

  if (file.size > getMaxAudioSizeBytes()) {
    return {
      ok: false as const,
      error: `Le fichier dépasse la limite de ${getMaxAudioSizeMb()} Mo.`,
      status: 413,
    };
  }

  return { ok: true as const };
}

export function getRunpodConfigStatus() {
  const missing = [
    !process.env.RUNPOD_API_KEY ? "RUNPOD_API_KEY" : null,
    !process.env.RUNPOD_WHISPER_ENDPOINT_ID ? "RUNPOD_WHISPER_ENDPOINT_ID" : null,
    !process.env.RUNPOD_LLM_ENDPOINT_ID ? "RUNPOD_LLM_ENDPOINT_ID" : null,
    !process.env.MASTER_KEY_BASE64 ? "MASTER_KEY_BASE64" : null,
  ].filter((value): value is string => Boolean(value));

  return {
    isConfigured: missing.length === 0,
    missing,
  };
}
