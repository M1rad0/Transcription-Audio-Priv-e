# Security Checklist

This checklist tracks privacy and security requirements for V1.

Rules used here:

- Excel security IDs are preserved.
- `AGENTS.md` remains the final authority when wording differs.
- Nothing in this file should be interpreted as complete security certification. It is a V1 control checklist.

## Frontend and secrets

- [ ] SEC-001 - No sensitive secret is exposed to the browser
  - Risk covered: Secret leakage could expose RunPod usage, compromise sessions, or reveal encryption material.
  - Verification: Inspect bundles, DevTools, client code, and environment variable usage for secret exposure.
  - Notes: Sensitive values include `RUNPOD_API_KEY`, `MASTER_KEY_BASE64`, `SESSION_SECRET`, `AUTH_PASSWORD_HASH`, and any worker secret.

- [ ] SEC-003 - `RUNPOD_API_KEY` is server-side only
  - Risk covered: Direct abuse of the RunPod endpoint and uncontrolled costs.
  - Verification: Confirm the key exists only in server-side environment usage and never appears in frontend code or browser network traffic.
  - Notes: The browser must never call RunPod directly.

- [ ] SEC-006 - `MASTER_KEY_BASE64` is never transmitted to the browser or worker payload
  - Risk covered: Exposure of the shared master key would break transport confidentiality.
  - Verification: Inspect frontend code, request payloads, and logs to confirm the master key stays only in BFF and worker environment variables.
  - Notes: `salt` and `audio_nonce` are not secret; the master key is secret.

## Authentication and BFF guardrails

- [ ] SEC-002 - Authentication is required before `/api/transcribe`
  - Risk covered: Unauthorized usage and accidental RunPod spend.
  - Verification: Call `/api/transcribe` without a valid session and confirm access is refused.
  - Notes: V1 uses a signed HTTP-only session cookie.

- [ ] SEC-004 - File size validation blocks files above 12 MB
  - Risk covered: Excessive payload size, unexpected cost, and potential platform rejection.
  - Verification: Submit a file larger than 12 MB before encryption and confirm the BFF rejects it before any RunPod call.
  - Notes: The limit applies before encryption and base64.

- [ ] SEC-005 - Anti-abuse quota controls are enforced if enabled
  - Risk covered: Repeated or concurrent job abuse leading to excess cost.
  - Verification: Test daily limits and overlapping requests according to the chosen V1 quota settings.
  - Notes: V1 should support the target usage volume while still enforcing concurrency and abuse controls from the start.

## Cryptography

- [ ] SEC-007 - A unique `salt` is generated per file
  - Risk covered: Key derivation reuse across different jobs.
  - Verification: Compare multiple uploads and confirm different salt values.
  - Notes: The salt is not secret.

- [ ] SEC-008 - A unique AES-GCM nonce is generated per file
  - Risk covered: AES-GCM nonce reuse can critically weaken confidentiality and integrity.
  - Verification: Compare multiple uploads and confirm different nonce values.
  - Notes: The nonce should be 12 bytes for AES-GCM.

- [ ] SEC-009 - AES-GCM authenticated decryption fails on tampering
  - Risk covered: Undetected ciphertext or metadata manipulation.
  - Verification: Modify encrypted payload bytes and confirm the worker rejects decryption.
  - Notes: This validates integrity in addition to confidentiality.

## Worker handling and cleanup

- [ ] SEC-010 - Decryption is temporary only inside `/tmp/job_xxx`
  - Risk covered: Sensitive audio persisting outside the job lifecycle.
  - Verification: Inspect worker temp, volumes, cache, and logs after jobs.
  - Notes: No decrypted audio should persist in long-lived storage.

- [ ] SEC-011 - Cleanup always runs in `finally`
  - Risk covered: Sensitive temporary files remaining after success or failure.
  - Verification: Run both success and forced-error cleanup tests.
  - Notes: Cleanup status should be returned in the worker response.

## Logging

- [ ] SEC-012 - Logs never contain sensitive content
  - Risk covered: Privacy leakage through application or worker logs.
  - Verification: Review logs after representative jobs and confirm they contain only technical metadata.
  - Notes: Do not log raw audio, decrypted paths if sensitive, full transcripts, full encrypted payloads, secrets, or API keys.

## RunPod controls

- [ ] SEC-013 - `workersMax=1` is configured in RunPod
  - Risk covered: Runaway scaling and cost amplification.
  - Verification: Inspect the endpoint configuration directly in RunPod.
  - Notes: This is a cost-control and abuse-limiting measure.

- [ ] SEC-014 - A strict execution timeout is configured
  - Risk covered: Hanging or excessively long GPU jobs.
  - Verification: Inspect the endpoint timeout and confirm stalled jobs terminate.
  - Notes: The timeout value is intentionally configurable and must be validated during deployment benchmarking.

- [ ] SEC-015 - RunPod budget alerts are configured manually
  - Risk covered: Unnoticed spending growth.
  - Verification: Confirm alert or equivalent billing threshold configuration exists in the RunPod account.
  - Notes: Useful but not a substitute for BFF validation and worker limits.

## Architecture and product boundaries

- [ ] SEC-016 - Only allowed audio extensions are accepted
  - Risk covered: Unsupported or malicious file upload paths.
  - Verification: Confirm `.mp3`, `.wav`, `.m4a`, `.ogg`, and `.flac` are allowed, and unsupported extensions are rejected.
  - Notes: Added because this requirement is explicit in `AGENTS.md` but not a standalone Excel `SEC-*` row.

- [ ] SEC-017 - No external transcription API is used
  - Risk covered: Privacy loss and departure from the V1 architecture.
  - Verification: Review dependencies, network calls, and environment variables for any external transcription API usage.
  - Notes: Hugging Face Hub is allowed only as a model source or cache, not as an inference endpoint.

- [ ] SEC-018 - Correction does not use OpenAI API or other external correction API
  - Risk covered: Unexpected data exfiltration and architectural drift.
  - Verification: Review network activity, code paths, and configured services used for `modified_text`.
  - Notes: The correction engine must be a lightweight local LLM inside the worker.
