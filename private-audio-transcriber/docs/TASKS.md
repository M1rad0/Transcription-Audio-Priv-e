# Tasks

This file tracks implementation work for V1.

Rule used here:

- Excel task IDs are preserved when available.
- New IDs were added only for gaps required by `AGENTS.md` but not explicitly listed in the Excel backlog.
- Checkboxes reflect documentation state only. No application code has been implemented in this step.

## Documentation setup

- [x] T-025 - Create initial project documentation under `docs/`
  - Scope: Create `PROJECT_CONTEXT.md`, `TASKS.md`, `TEST_PLAN.md`, `SECURITY_CHECKLIST.md`, `RUNPOD_SETUP.md`, `ENVIRONMENT.md`, and `DECISIONS.md`.
  - Acceptance: All requested files exist and align with `AGENTS.md` as the source of truth.
  - Notes: Completed in the current documentation-only step.

- [ ] T-026 - Validate documentation before any coding
  - Scope: Review documentation with the user and resolve open clarifications before implementation starts.
  - Acceptance: Documentation is approved and blockers are explicitly resolved or deferred.
  - Notes: Coding must not start before this task is validated.

- [ ] T-023 - Document local launch and deployment workflow
  - Scope: Add launch, worker build, deployment, environment, and verification instructions to project-facing docs.
  - Acceptance: A developer can relaunch the V1 from docs without hidden knowledge.
  - Notes: Excel maps this mainly to README-level documentation, not yet done.

- [ ] T-024 - Document the privacy and security promise honestly
  - Scope: Explain encrypted transport, temporary worker decryption, no external transcription API, and cleanup limits.
  - Acceptance: Documentation is accurate and does not overstate privacy guarantees.
  - Notes: Must stay consistent with actual implementation behavior.

## Next.js app setup

- [ ] T-001 - Initialize the Next.js App Router TypeScript app structure
  - Scope: Prepare the application base structure for app pages, shared components, and server-side utilities.
  - Acceptance: The app structure is ready for auth, upload, validation, and BFF work.
  - Notes: The repository currently contains a minimal starter app and still needs the target structure from `AGENTS.md`.

## Authentication

- [ ] T-003 - Implement local login and signed session handling
  - Scope: Add `/login`, validate credentials from environment variables, issue an HTTP-only signed session cookie, and add logout if simple.
  - Acceptance: Protected routes reject unauthenticated users and permit authenticated users.
  - Notes: No OAuth, Keycloak, user database, or complex role management in V1.

## Upload UI

- [ ] T-017 - Create the upload interface
  - Scope: Add audio file selection or drag-and-drop, show selected file metadata, and apply client-side format and size prechecks.
  - Acceptance: Unsupported files are rejected with clear messages before submission.
  - Notes: Client checks are convenience only; the BFF remains authoritative.

- [ ] T-018 - Display processing state to the user
  - Scope: Show states such as validating, encrypting, uploading, running, completed, and failed.
  - Acceptance: Users can understand where the job is in the flow.
  - Notes: Useful for cold starts and cost-aware user expectations.

- [ ] T-019 - Display raw and modified outputs
  - Scope: Present `raw_text` and `modified_text` clearly after successful jobs.
  - Acceptance: Both outputs are visible and easy to review.
  - Notes: The UI must support human review rather than claim full automation accuracy.

## File validation

- [ ] T-004 - Guard `/api/transcribe` before any RunPod call
  - Scope: Require auth, require POST, reject unsupported extensions, reject files above 12 MB, and block invalid requests early.
  - Acceptance: RunPod is never called when validation fails.
  - Notes: This is part of the main anti-cost barrier.

- [ ] T-005 - Add simple quota controls in the BFF
  - Scope: Support one active job at a time, daily job limits if configured, and daily usage controls that still allow the target volume of about 120 audio minutes per day.
  - Acceptance: Quota violations return clear errors without reaching RunPod, while the intended daily usage target remains supportable from the first V1 implementation phase.
  - Notes: The BFF is the main anti-cost barrier and quota behavior must be designed from the start.

## Encryption

- [ ] T-006 - Generate unique `job_id`, `salt`, and AES-GCM nonce per file
  - Scope: Use secure random generation and ensure non-reuse across uploads.
  - Acceptance: Repeated uploads never reuse the same key/nonce pair.
  - Notes: `salt` is not secret; the master key is secret.

- [ ] T-007 - Derive the per-file key with HKDF
  - Scope: Derive a 32-byte AES-256 key from `MASTER_KEY_BASE64`, `salt`, and `job_id`.
  - Acceptance: The same fixed vector produces matching results across Next.js and Python.
  - Notes: Cross-language compatibility is a blocker for the worker integration.

- [ ] T-008 - Encrypt the audio and build the RunPod payload
  - Scope: Encrypt audio server-side with AES-256-GCM and build the JSON payload with base64 fields.
  - Acceptance: No clear audio leaves the BFF and the payload matches the contract in `AGENTS.md`.
  - Notes: The browser must never see `MASTER_KEY_BASE64`.

## RunPod mock client

- [ ] T-027 - Implement a mock RunPod client for local flow validation
  - Scope: Add a controlled mock response path for the BFF so auth, validation, UI, and export logic can be tested before the real endpoint exists.
  - Acceptance: The full app flow can be exercised locally without a live RunPod deployment.
  - Notes: This phase appears in `AGENTS.md` implementation order but is not explicitly broken out in the Excel task list.

## RunPod real client

- [ ] T-009 - Call RunPod only from the BFF
  - Scope: Implement the server-side RunPod client with `RUNPOD_API_KEY` and `RUNPOD_ENDPOINT_ID`.
  - Acceptance: The browser never calls RunPod directly and no secret leaks into frontend code.
  - Notes: This is a security and cost-control requirement, not only a transport choice.

- [ ] T-010 - Configure the RunPod Serverless custom endpoint
  - Scope: Create the endpoint, enable FlashBoot if available, set worker limits, and prepare timeout and budget settings.
  - Acceptance: A valid encrypted test job can reach the endpoint.
  - Notes: Timeout remains configurable by deployment, while the initial model choices are fixed in the docs.

- [ ] T-011 - Define worker environment variables in RunPod
  - Scope: Configure `MASTER_KEY_BASE64` and model-related worker environment variables.
  - Acceptance: Missing env vars are detected cleanly and valid env vars enable the worker to start.
  - Notes: Worker secrets must never be logged.

- [ ] T-022 - Lock down RunPod cost limits
  - Scope: Enforce `workersMax=1`, strict timeout, budget alerts, and the narrowest practical account restrictions.
  - Acceptance: The platform cannot scale beyond the intended V1 cost envelope.
  - Notes: This complements the BFF anti-abuse barrier.

## Python worker

- [ ] T-002 - Create the `runpod-worker` structure
  - Scope: Add the worker module layout, core files, and packaging scaffold described in `AGENTS.md`.
  - Acceptance: The worker codebase structure exists and matches the intended responsibilities.
  - Notes: The repository does not contain the worker yet.

- [ ] T-012 - Create the worker Docker image definition
  - Scope: Add the Dockerfile and requirements for Python, ffmpeg, RunPod SDK, `faster-whisper`, and the local LLM dependencies.
  - Acceptance: The worker image builds successfully.
  - Notes: Initial defaults are `large-v3` for Whisper and `Qwen2.5-3B-Instruct` for the local corrector.

- [ ] T-013 - Decrypt audio in `/tmp/job_xxx`
  - Scope: Reproduce the HKDF derivation, decrypt with AES-GCM, and write the temporary clear audio file only inside a job-specific temp directory.
  - Acceptance: A payload produced by the BFF can be decrypted and used for transcription.
  - Notes: Cleanup must happen even on failure.

## faster-whisper integration

- [ ] T-014 - Integrate `faster-whisper` as the V1 transcription engine
  - Scope: Load the configured Whisper model, transcribe the original audio, and produce `raw_text` plus timestamped segments.
  - Acceptance: The worker returns coherent `raw_text` and segment data for valid input audio.
  - Notes: Audio enhancement and double transcription remain out of scope.

## Local LLM correction

- [ ] T-015 - Add a lightweight local LLM corrector
  - Scope: Apply the strict correction prompt and return `modified_text` without adding new information or changing meaning.
  - Acceptance: `modified_text` improves readability while preserving uncertain content with `[a verifier]` when needed.
  - Notes: OpenAI API and other external inference APIs are excluded from V1.

## Cleanup

- [ ] T-016 - Guarantee worker cleanup in `finally`
  - Scope: Delete `/tmp/job_xxx` after both success and failure paths and report cleanup status in the result.
  - Acceptance: No job temp directory remains after processing.
  - Notes: This is a privacy and security blocker.

## Exports

- [ ] T-020 - Export `raw.txt`, `modified.txt`, and `result.json`
  - Scope: Add download actions from the processed result returned by the BFF.
  - Acceptance: All three export artifacts are available and readable after a successful job.
  - Notes: Export support is part of the V1 definition of done.

## Final QA

- [ ] T-028 - Execute final QA and Definition of Done review
  - Scope: Run the blocking test matrix, verify the security checklist, and validate all V1 definition-of-done criteria.
  - Acceptance: Blocking tests are passed and documented before declaring V1 ready.
  - Notes: This consolidates `TEST_PLAN.md`, `SECURITY_CHECKLIST.md`, and the DoD sheet.

## Deferred beyond V1

- [ ] T-021 - Add duration and cost estimation reporting
  - Scope: Track end-to-end timing and expose a simple estimated processing cost in the UI.
  - Acceptance: A completed job shows non-empty timing and cost estimate fields.
  - Notes: Explicitly deferred to V2 by product decision.
