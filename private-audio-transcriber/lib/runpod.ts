import type { RunpodTranscriptionPayload } from "@/lib/crypto";

const RUNPOD_API_BASE_URL = "https://api.runpod.ai/v2";

export function getRunpodConfigStatus() {
  const missing = [
    !process.env.RUNPOD_API_KEY ? "RUNPOD_API_KEY" : null,
    !process.env.RUNPOD_ENDPOINT_ID ? "RUNPOD_ENDPOINT_ID" : null,
  ].filter((value): value is string => Boolean(value));

  return {
    isConfigured: missing.length === 0,
    missing,
  };
}

export function buildRunpodRequestEnvelope(
  payload: RunpodTranscriptionPayload,
) {
  return {
    input: payload,
  };
}

export function buildRunpodRunUrl(endpointId = process.env.RUNPOD_ENDPOINT_ID) {
  if (!endpointId) {
    throw new Error("RUNPOD_ENDPOINT_ID is missing.");
  }

  return `${RUNPOD_API_BASE_URL}/${endpointId}/run`;
}
