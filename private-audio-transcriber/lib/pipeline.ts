import type { RunpodTranscriptionPayload } from "@/lib/crypto";

const DEFAULT_RUNPOD_API_BASE_URL = "https://api.runpod.ai/v2";

type WorkerKind = "local" | "runpod";

type WorkerTarget = {
  endpoint: string;
  kind: WorkerKind;
  label: string;
};

type PipelineConfigStatus = {
  issues: string[];
  isConfigured: boolean;
  isMockFallback: boolean;
  llmTarget: WorkerTarget | null;
  modeLabel: string;
  whisperTarget: WorkerTarget | null;
};

export type WhisperWorkerSuccess = {
  cleanup?: {
    cleanup_error?: string;
    temp_files_deleted?: boolean;
  };
  duration_seconds?: number;
  engine?: string;
  job_id: string;
  language?: string;
  raw_text: string;
  segments: Array<{
    end: number;
    start: number;
    text: string;
  }>;
  status: "success";
};

export type LlmWorkerInput = {
  job_id: string;
  options: {
    language: "fr";
  };
  raw_text: string;
};

export type LlmWorkerSuccess = {
  engine?: string;
  job_id: string;
  language?: string;
  metadata?: Record<string, unknown>;
  modified_text: string;
  status: "success";
};

export type ProcessingPipelineResult = {
  cleanup?: WhisperWorkerSuccess["cleanup"];
  duration_seconds?: number;
  engine: string;
  engines: {
    llm?: string;
    whisper?: string;
  };
  job_id: string;
  language: string;
  mode: string;
  modified_text: string;
  raw_text: string;
  segments: WhisperWorkerSuccess["segments"];
  status: "success";
};

function isTruthyEnvValue(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function buildRunpodRunSyncUrl(endpointId: string) {
  const apiBaseUrl =
    process.env.RUNPOD_API_BASE_URL?.trim() || DEFAULT_RUNPOD_API_BASE_URL;

  return `${apiBaseUrl.replace(/\/+$/, "")}/${endpointId}/runsync`;
}

function getWorkerTarget(
  {
    endpointEnvName,
    localEndpointEnvName,
    localModeEnvName,
    workerLabel,
  }: {
    endpointEnvName: string;
    localEndpointEnvName: string;
    localModeEnvName: string;
    workerLabel: string;
  },
): { issues: string[]; target: WorkerTarget | null } {
  const localMode = isTruthyEnvValue(process.env[localModeEnvName]);

  if (localMode) {
    const endpoint = process.env[localEndpointEnvName]?.trim();

    if (!endpoint) {
      return {
        issues: [`${localEndpointEnvName} est requis quand ${localModeEnvName}=true.`],
        target: null,
      };
    }

    return {
      issues: [],
      target: {
        endpoint,
        kind: "local",
        label: `${workerLabel} local`,
      },
    };
  }

  const endpointId = process.env[endpointEnvName]?.trim();
  const apiKey = process.env.RUNPOD_API_KEY?.trim();
  const issues: string[] = [];

  if (!apiKey) {
    issues.push("RUNPOD_API_KEY est requis quand le mode local est desactive.");
  }

  if (!endpointId) {
    issues.push(`${endpointEnvName} est requis quand ${localModeEnvName} est desactive.`);
  }

  if (issues.length > 0 || !endpointId) {
    return {
      issues,
      target: null,
    };
  }

  return {
    issues: [],
    target: {
      endpoint: endpointId,
      kind: "runpod",
      label: `${workerLabel} RunPod`,
    },
  };
}

function hasAnyWorkerSignal() {
  return [
    process.env.RUNPOD_API_KEY,
    process.env.RUNPOD_WHISPER_ENDPOINT_ID,
    process.env.WHISPER_LOCAL_ENDPOINT,
    process.env.WHISPER_LOCAL_MODE,
    process.env.RUNPOD_LLM_ENDPOINT_ID,
    process.env.LLM_LOCAL_ENDPOINT,
    process.env.LLM_LOCAL_MODE,
  ].some((value) => Boolean(value?.trim()));
}

export function getPipelineConfigStatus(): PipelineConfigStatus {
  if (!hasAnyWorkerSignal()) {
    return {
      isConfigured: true,
      isMockFallback: true,
      issues: [],
      llmTarget: null,
      modeLabel: "Mode mock local",
      whisperTarget: null,
    };
  }

  const whisper = getWorkerTarget({
    endpointEnvName: "RUNPOD_WHISPER_ENDPOINT_ID",
    localEndpointEnvName: "WHISPER_LOCAL_ENDPOINT",
    localModeEnvName: "WHISPER_LOCAL_MODE",
    workerLabel: "Whisper",
  });
  const llm = getWorkerTarget({
    endpointEnvName: "RUNPOD_LLM_ENDPOINT_ID",
    localEndpointEnvName: "LLM_LOCAL_ENDPOINT",
    localModeEnvName: "LLM_LOCAL_MODE",
    workerLabel: "LLM",
  });
  const issues = [...whisper.issues, ...llm.issues];
  const isConfigured = issues.length === 0 && Boolean(whisper.target) && Boolean(llm.target);

  return {
    isConfigured,
    isMockFallback: false,
    issues,
    llmTarget: llm.target,
    modeLabel:
      whisper.target && llm.target
        ? `${whisper.target.label} / ${llm.target.label}`
        : "Pipeline non configure",
    whisperTarget: whisper.target,
  };
}

async function parseJsonResponse(response: Response) {
  try {
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

function unwrapWorkerResponse(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return payload;
  }

  if ("output" in payload) {
    const runpodPayload = payload as {
      error?: string;
      output?: unknown;
      status?: string;
    };

    if (runpodPayload.status === "FAILED") {
      throw new Error(runpodPayload.error || "Le worker RunPod a renvoye un echec.");
    }

    return runpodPayload.output;
  }

  return payload;
}

function assertWhisperWorkerSuccess(payload: unknown): WhisperWorkerSuccess {
  if (!payload || typeof payload !== "object") {
    throw new Error("Le worker Whisper a renvoye une reponse invalide.");
  }

  const value = payload as Partial<WhisperWorkerSuccess> & { error_message?: string };

  if (value.status !== "success") {
    throw new Error(value.error_message || "Le worker Whisper n'a pas termine avec succes.");
  }

  if (
    !value.job_id ||
    typeof value.raw_text !== "string" ||
    !Array.isArray(value.segments)
  ) {
    throw new Error("Le worker Whisper a renvoye un payload incomplet.");
  }

  return {
    cleanup: value.cleanup,
    duration_seconds: value.duration_seconds,
    engine: value.engine,
    job_id: value.job_id,
    language: value.language,
    raw_text: value.raw_text,
    segments: value.segments,
    status: "success",
  };
}

function assertLlmWorkerSuccess(payload: unknown): LlmWorkerSuccess {
  if (!payload || typeof payload !== "object") {
    throw new Error("Le worker LLM a renvoye une reponse invalide.");
  }

  const value = payload as Partial<LlmWorkerSuccess> & { error_message?: string };

  if (value.status !== "success") {
    throw new Error(value.error_message || "Le worker LLM n'a pas termine avec succes.");
  }

  if (!value.job_id || typeof value.modified_text !== "string") {
    throw new Error("Le worker LLM a renvoye un payload incomplet.");
  }

  return {
    engine: value.engine,
    job_id: value.job_id,
    language: value.language,
    metadata: value.metadata,
    modified_text: value.modified_text,
    status: "success",
  };
}

async function callLocalWorker<TInput>(
  endpoint: string,
  input: TInput,
) {
  const response = await fetch(endpoint, {
    body: JSON.stringify({ input }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });
  const payload = unwrapWorkerResponse(await parseJsonResponse(response));

  if (!response.ok) {
    const errorPayload = payload as { error?: unknown } | null;
    const errorMessage =
      errorPayload && typeof errorPayload === "object" && "error" in errorPayload
        ? String(errorPayload.error)
        : `Le worker local a repondu avec ${response.status}.`;
    throw new Error(errorMessage);
  }

  return payload;
}

async function callRunpodWorker<TInput>(
  endpointId: string,
  input: TInput,
) {
  const apiKey = process.env.RUNPOD_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("RUNPOD_API_KEY est manquant.");
  }

  const response = await fetch(buildRunpodRunSyncUrl(endpointId), {
    body: JSON.stringify({ input }),
    headers: {
      accept: "application/json",
      authorization: apiKey,
      "content-type": "application/json",
    },
    method: "POST",
  });
  const payload = await parseJsonResponse(response);

  if (!response.ok) {
    const errorPayload = payload as { error?: unknown } | null;
    const errorMessage =
      errorPayload && typeof errorPayload === "object" && "error" in errorPayload
        ? String(errorPayload.error)
        : `RunPod a repondu avec ${response.status}.`;
    throw new Error(errorMessage);
  }

  return unwrapWorkerResponse(payload);
}

async function callWorker<TInput>(
  target: WorkerTarget,
  input: TInput,
) {
  if (target.kind === "local") {
    return callLocalWorker(target.endpoint, input);
  }

  return callRunpodWorker(target.endpoint, input);
}

export async function runProcessingPipeline(
  whisperPayload: RunpodTranscriptionPayload,
): Promise<ProcessingPipelineResult> {
  const config = getPipelineConfigStatus();

  if (!config.isConfigured || !config.whisperTarget || !config.llmTarget) {
    throw new Error(
      config.issues.join(" ") || "La pipeline de workers n'est pas configuree.",
    );
  }

  const whisperResult = assertWhisperWorkerSuccess(
    await callWorker(config.whisperTarget, whisperPayload),
  );
  const llmResult = assertLlmWorkerSuccess(
    await callWorker<LlmWorkerInput>(config.llmTarget, {
      job_id: whisperResult.job_id,
      options: {
        language: "fr",
      },
      raw_text: whisperResult.raw_text,
    }),
  );
  const whisperEngine = whisperResult.engine?.trim();
  const llmEngine = llmResult.engine?.trim();

  return {
    cleanup: whisperResult.cleanup,
    duration_seconds: whisperResult.duration_seconds,
    engine: [whisperEngine, llmEngine].filter(Boolean).join(" / ") || "worker-pipeline",
    engines: {
      llm: llmEngine,
      whisper: whisperEngine,
    },
    job_id: whisperResult.job_id,
    language: whisperResult.language || llmResult.language || "fr",
    mode: config.modeLabel,
    modified_text: llmResult.modified_text,
    raw_text: whisperResult.raw_text,
    segments: whisperResult.segments,
    status: "success",
  };
}
