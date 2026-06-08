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

- [ ] RP-007 - Choose a GPU suitable for the Whisper worker
  - Why: The transcription worker must handle audio within acceptable time and VRAM limits without overpaying for unused capacity.
  - Verify in RunPod: Benchmark at least one target GPU profile and record cost versus latency.
  - Notes: The Whisper worker is intentionally isolated so it can keep a single cached model strategy.

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

Required Whisper worker-side variables:

- `MASTER_KEY_BASE64`
- `WHISPER_MODEL=large-v3`

Optional Whisper worker-side variables:

- `WHISPER_MODEL_PATH=` explicit local path if not using the standard cached-model location
- `WHISPER_DEVICE=auto`
- `WHISPER_COMPUTE_TYPE=float16`
- `WHISPER_BEAM_SIZE=5`
- `RUNPOD_PREFER_CACHED_MODELS=true`
- `RUNPOD_REQUIRE_CACHED_MODELS=true`
- any additional logging controls introduced later by implementation

Required LLM worker-side variables:

- `LLM_MODEL=Qwen/Qwen2.5-0.5B-Instruct`

Optional LLM worker-side variables:

- `LLM_MODEL_PATH=` explicit local path if not using the standard cached-model location
- `LLM_DEVICE_MAP=auto`
- `LLM_INPUT_CHAR_LIMIT=12000`
- `LLM_MAX_NEW_TOKENS=1200`
- `RUNPOD_PREFER_CACHED_MODELS=true`
- `RUNPOD_REQUIRE_CACHED_MODELS=true`

Notes:

- `AGENTS.md` explicitly requires `MASTER_KEY_BASE64`.
- Model names remain configurable, but the deployment can now be split between a Whisper endpoint and an LLM endpoint.

## Deployment steps

1. Prepare the Whisper worker codebase and Docker image definition.
2. Build the Whisper worker image and confirm it starts locally or in CI without packaging errors.
3. Push the Whisper image to the chosen container registry.
4. Create a RunPod Serverless custom endpoint from that image if Whisper will run on RunPod.
5. Prepare the LLM worker image and create its endpoint if restructuring will also run on RunPod.
6. Enable FlashBoot if the option is available on each endpoint.
7. Set `workersMin=0`.
8. Set `workersMax=1`.
9. Configure a strict execution timeout.
10. Configure worker environment variables, including `MASTER_KEY_BASE64` for Whisper.
11. Configure billing alerts manually in RunPod.
12. Send a controlled encrypted test job from the BFF or a test harness.
13. Inspect logs and confirm no sensitive content appears.

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
