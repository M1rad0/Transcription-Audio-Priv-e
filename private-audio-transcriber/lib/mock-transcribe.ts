export type MockTranscriptionResult = {
  cleanup: {
    temp_files_deleted: true;
  };
  duration_seconds: number;
  engine: string;
  generated_by: "mock-local-bff";
  job_id: string;
  language: "fr";
  mode: "mock-local";
  modified_text: string;
  raw_text: string;
  segments: Array<{
    end: number;
    start: number;
    text: string;
  }>;
  status: "success";
};

type BuildMockResultInput = {
  fileName: string;
  fileSize: number;
  firstName: string;
  jobId: string;
  lastName: string;
};

export function buildMockTranscriptionResult({
  fileName,
  fileSize,
  firstName,
  jobId,
  lastName,
}: BuildMockResultInput): MockTranscriptionResult {
  const durationSeconds = Math.max(30, Math.round(fileSize / 24000));
  const rawText = [
    `Transcription mock locale pour ${firstName} ${lastName}.`,
    `Fichier traite : ${fileName}.`,
    "Cette sortie sert a valider le flux traitement et historique avant l integration RunPod reelle.",
  ].join("\n");

  const modifiedText = [
    `Transcription mock pour ${firstName} ${lastName}.`,
    "",
    `Le fichier ${fileName} a ete traite localement dans le mode de validation actuel.`,
    "Cette version restructure legerement le texte afin de simuler le rendu final attendu apres correction.",
  ].join("\n");

  return {
    cleanup: {
      temp_files_deleted: true,
    },
    duration_seconds: durationSeconds,
    engine: "mock-local-bff",
    generated_by: "mock-local-bff",
    job_id: jobId,
    language: "fr",
    mode: "mock-local",
    modified_text: modifiedText,
    raw_text: rawText,
    segments: [
      {
        end: Math.max(8, Math.round(durationSeconds * 0.35)),
        start: 0,
        text: `Transcription mock locale pour ${firstName} ${lastName}.`,
      },
      {
        end: Math.max(16, Math.round(durationSeconds * 0.7)),
        start: Math.max(8, Math.round(durationSeconds * 0.35)),
        text: `Fichier traite : ${fileName}.`,
      },
      {
        end: durationSeconds,
        start: Math.max(16, Math.round(durationSeconds * 0.7)),
        text: "Validation du flux local avant branchement RunPod.",
      },
    ],
    status: "success",
  };
}
