import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
  randomUUID,
} from "node:crypto";

const HKDF_HASH_ALGORITHM = "sha256";
const DERIVED_KEY_BYTES = 32;
const SALT_BYTES = 16;
const AUDIO_NONCE_BYTES = 12;
const AUDIO_AUTH_TAG_BYTES = 16;
const RUNPOD_DEFAULT_LANGUAGE = "fr";

export const CRYPTO_CONTRACT = {
  audioAuthTagBytes: AUDIO_AUTH_TAG_BYTES,
  audioNonceBytes: AUDIO_NONCE_BYTES,
  derivedKeyBytes: DERIVED_KEY_BYTES,
  hkdfHashAlgorithm: HKDF_HASH_ALGORITHM,
  hkdfInfoPrefix: "private-audio-transcriber:job:",
  language: RUNPOD_DEFAULT_LANGUAGE,
  saltBytes: SALT_BYTES,
} as const;

export type RunpodTranscriptionPayload = {
  job_id: string;
  filename: string;
  encrypted_audio_base64: string;
  salt_base64: string;
  audio_nonce_base64: string;
  options: {
    language: "fr";
    generate_modified: boolean;
  };
};

export type EncryptedRunpodRequest = {
  jobId: string;
  payload: RunpodTranscriptionPayload;
};

type CreateEncryptedRunpodPayloadInput = {
  audioBuffer: Buffer;
  fileName: string;
  generateModified?: boolean;
  jobId?: string;
  language?: "fr";
  masterKeyBase64?: string;
};

type DecryptRunpodPayloadInput = {
  masterKeyBase64?: string;
  payload: RunpodTranscriptionPayload;
};

function toBase64(buffer: Buffer) {
  return buffer.toString("base64");
}

function fromBase64(value: string, label: string) {
  try {
    return Buffer.from(value, "base64");
  } catch {
    throw new Error(`${label} is not valid base64.`);
  }
}

function getMasterKeyBuffer(masterKeyBase64 = process.env.MASTER_KEY_BASE64) {
  if (!masterKeyBase64) {
    throw new Error("MASTER_KEY_BASE64 is missing.");
  }

  const masterKey = fromBase64(masterKeyBase64, "MASTER_KEY_BASE64");

  if (masterKey.length !== DERIVED_KEY_BYTES) {
    throw new Error("MASTER_KEY_BASE64 must decode to exactly 32 bytes.");
  }

  return masterKey;
}

function getHkdfInfo(jobId: string) {
  return Buffer.from(`${CRYPTO_CONTRACT.hkdfInfoPrefix}${jobId}`, "utf8");
}

export function generateJobId() {
  return `job_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

export function derivePerFileKey({
  jobId,
  masterKeyBase64,
  salt,
}: {
  jobId: string;
  masterKeyBase64?: string;
  salt: Buffer;
}) {
  const masterKey = getMasterKeyBuffer(masterKeyBase64);
  const derivedKey = hkdfSync(
    HKDF_HASH_ALGORITHM,
    masterKey,
    salt,
    getHkdfInfo(jobId),
    DERIVED_KEY_BYTES,
  );

  return Buffer.from(derivedKey);
}

export function getEncryptionConfigStatus() {
  const missing = [
    !process.env.MASTER_KEY_BASE64 ? "MASTER_KEY_BASE64" : null,
  ].filter((value): value is string => Boolean(value));

  const issues: string[] = [];

  if (!missing.length) {
    try {
      getMasterKeyBuffer();
    } catch (error) {
      issues.push(
        error instanceof Error ? error.message : "MASTER_KEY_BASE64 is invalid.",
      );
    }
  }

  return {
    isConfigured: missing.length === 0 && issues.length === 0,
    issues,
    missing,
  };
}

export function createEncryptedRunpodPayload({
  audioBuffer,
  fileName,
  generateModified = true,
  jobId = generateJobId(),
  language = RUNPOD_DEFAULT_LANGUAGE,
  masterKeyBase64,
}: CreateEncryptedRunpodPayloadInput): EncryptedRunpodRequest {
  const salt = randomBytes(SALT_BYTES);
  const audioNonce = randomBytes(AUDIO_NONCE_BYTES);
  const derivedKey = derivePerFileKey({
    jobId,
    masterKeyBase64,
    salt,
  });

  const cipher = createCipheriv("aes-256-gcm", derivedKey, audioNonce);
  const ciphertext = Buffer.concat([
    cipher.update(audioBuffer),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // The worker receives ciphertext with the 16-byte GCM auth tag appended.
  const encryptedAudio = Buffer.concat([ciphertext, authTag]);

  return {
    jobId,
    payload: {
      audio_nonce_base64: toBase64(audioNonce),
      encrypted_audio_base64: toBase64(encryptedAudio),
      filename: fileName,
      job_id: jobId,
      options: {
        generate_modified: generateModified,
        language,
      },
      salt_base64: toBase64(salt),
    },
  };
}

export function decryptRunpodPayload({
  masterKeyBase64,
  payload,
}: DecryptRunpodPayloadInput) {
  const salt = fromBase64(payload.salt_base64, "salt_base64");
  const audioNonce = fromBase64(payload.audio_nonce_base64, "audio_nonce_base64");
  const encryptedAudio = fromBase64(
    payload.encrypted_audio_base64,
    "encrypted_audio_base64",
  );

  if (audioNonce.length !== AUDIO_NONCE_BYTES) {
    throw new Error("audio_nonce_base64 must decode to exactly 12 bytes.");
  }

  if (encryptedAudio.length <= AUDIO_AUTH_TAG_BYTES) {
    throw new Error("encrypted_audio_base64 is too short.");
  }

  const ciphertext = encryptedAudio.subarray(0, -AUDIO_AUTH_TAG_BYTES);
  const authTag = encryptedAudio.subarray(-AUDIO_AUTH_TAG_BYTES);
  const derivedKey = derivePerFileKey({
    jobId: payload.job_id,
    masterKeyBase64,
    salt,
  });

  const decipher = createDecipheriv("aes-256-gcm", derivedKey, audioNonce);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}
