# RunPod Setup

This document captures the intended V1 RunPod Serverless setup.

Source priority:

- `AGENTS.md` defines the required V1 direction.
- The Excel `RunPod Config` sheet provides recommended operational values where `AGENTS.md` is not numeric.

## Configuration checklist

- [ ] RP-001 - Use a Serverless custom endpoint
  - Why: This matches the V1 architecture and avoids manual Pod start and stop management.
  - Verify in RunPod: The endpoint product type is Serverless custom, not a manual Pod workflow.
  - Notes: This is the selected V1 runtime model.

- [ ] RP-002 - Enable FlashBoot if available
  - Why: Reduce cold start delays for infrequent jobs.
  - Verify in RunPod: FlashBoot is enabled on the endpoint.
  - Notes: Recommended in both `AGENTS.md` and the Excel backlog.

- [ ] RP-003 - Set `workersMin=0`
  - Why: No GPU should remain active while a user is only reviewing results.
  - Verify in RunPod: Minimum workers is set to zero.
  - Notes: Core cost-control requirement.

- [ ] RP-004 - Set `workersMax=1`
  - Why: Limit runaway parallel spend and reduce abuse impact.
  - Verify in RunPod: Maximum workers is set to one.
  - Notes: Also tied to `SEC-013` and `QA-091`.

- [ ] RP-005 - Keep idle timeout short
  - Why: Avoid paying for idle GPU time between jobs and during human review.
  - Verify in RunPod: Idle timeout is configured to shut workers down promptly.
  - Notes: Exact number is not fixed in `AGENTS.md`.

- [ ] RP-006 - Set a strict execution timeout
  - Why: Prevent overlong or stuck GPU jobs from increasing cost indefinitely.
  - Verify in RunPod: The endpoint timeout is explicitly configured and tested with realistic audio.
  - Notes: The timeout value remains deployment-configurable. Benchmark realistic files before fixing the production value.

- [ ] RP-007 - Choose a GPU suitable for `faster-whisper` plus a lightweight local LLM
  - Why: The worker must handle transcription and correction within acceptable time and VRAM limits.
  - Verify in RunPod: Benchmark at least one target GPU profile and record cost versus latency.
  - Notes: Initial model defaults are `large-v3` for Whisper and `Qwen2.5-3B-Instruct` for correction, so GPU selection must account for those defaults.

- [ ] RP-008 - Keep model sourcing local to the worker environment
  - Why: V1 allows model download or cache usage from Hugging Face Hub, but not external inference endpoints.
  - Verify in RunPod: Models are loaded locally inside the worker image, cache, or allowed model source path.
  - Notes: No Hugging Face Inference Endpoint usage in V1.

- [ ] RP-009 - Configure worker secrets through environment variables
  - Why: The worker must access `MASTER_KEY_BASE64` and model settings without hardcoding secrets.
  - Verify in RunPod: Required worker env vars are present and missing values fail cleanly.
  - Notes: Secrets must never be logged.

- [ ] RP-010 - Keep logging minimal
  - Why: Worker logs must not leak audio data, transcripts, or secrets.
  - Verify in RunPod: Sample logs contain only job ID, status, timings, file size, error type, and cleanup status.
  - Notes: Aligns with the security rules in `AGENTS.md`.

- [ ] RP-011 - Configure billing alerts
  - Why: Manual budget alerts provide an extra safety net against unexpected spend.
  - Verify in RunPod: Account-level or project-level billing alerts exist.
  - Notes: Helpful but secondary to BFF validation and worker limits.

## Worker environment variables

Required worker-side variables:

- `MASTER_KEY_BASE64`
- `WHISPER_MODEL=large-v3`
- `LLM_MODEL=Qwen2.5-3B-Instruct`

Optional worker-side variables:

- any model cache path, language default, or logging controls introduced later by implementation

Notes:

- `AGENTS.md` explicitly requires `MASTER_KEY_BASE64`.
- Model names remain configurable, but the documented initial defaults are `large-v3` and `Qwen2.5-3B-Instruct`.

## Deployment steps

1. Prepare the worker codebase and Docker image definition.
2. Build the worker image and confirm it starts locally or in CI without packaging errors.
3. Push the image to the chosen container registry.
4. Create a RunPod Serverless custom endpoint from that image.
5. Enable FlashBoot if the option is available.
6. Set `workersMin=0`.
7. Set `workersMax=1`.
8. Configure a strict execution timeout.
9. Configure worker environment variables, including `MASTER_KEY_BASE64`.
10. Configure billing alerts manually in RunPod.
11. Send a controlled encrypted test job from the BFF or a test harness.
12. Inspect logs and confirm no sensitive content appears.

## Testing steps

1. Send one small valid encrypted payload and confirm a structured success response.
2. Confirm the worker can decrypt the payload produced by the Next.js BFF.
3. Confirm temp cleanup occurs after a successful job.
4. Force a failure path and confirm cleanup still occurs.
5. Submit a realistic file near the target duration and verify timeout suitability.
6. Inspect billing and worker behavior to confirm scale-to-zero and `workersMax=1`.

## Cost-control notes

- The BFF is the main anti-cost barrier. RunPod settings are the second layer.
- `workersMin=0` is required to avoid idle GPU cost.
- `workersMax=1` is required to limit parallel cost explosion.
- Strict timeout is required to cap hanging-job exposure.
- Budget alerts should be configured manually before real usage.
- No GPU should remain active while the user is only reading or exporting results.

## Operational note

The exact timeout value and final GPU type remain deployment-time operational settings. They are intentionally configurable, but the V1 documentation now fixes the initial model defaults and the required cost-control constraints.
