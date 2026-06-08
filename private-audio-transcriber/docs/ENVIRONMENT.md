# Environment

This document lists the intended V1 environment variables.

Rules used here:

- `AGENTS.md` is the final source of truth for behavior.
- The documentation requirement in `AGENTS.md` explicitly asks to include the variables below, even when another section also mentions a default.
- If a variable naming conflict exists between `AGENTS.md` and the Excel backlog, the `AGENTS.md` name is retained here and the conflict is called out below.

## Variables

| Variable | Used by | Required? | Example format | Security notes |
| --- | --- | --- | --- | --- |
| `AUTH_USERNAME` | Next.js BFF | Yes | `admin` | Not highly sensitive by itself, but still keep it server-side with the auth config. |
| `AUTH_PASSWORD_HASH` | Next.js BFF | Yes | `bcrypt hash string` | Must never be exposed to frontend code or logs. |
| `SESSION_SECRET` | Next.js BFF | Yes | base64 string, 32+ random bytes | Must stay server-side only and never appear in browser-visible code. |
| `RUNPOD_API_KEY` | Next.js BFF | Conditional | `rp_...` | Secret. Required only when at least one worker runs on RunPod. Never expose to the browser. |
| `RUNPOD_API_BASE_URL` | Next.js BFF | Optional | `https://api.runpod.ai/v2` | Not secret. Useful for explicit configuration or future proxying without code changes. |
| `WHISPER_LOCAL_MODE` | Next.js BFF | Optional | `true` or `false` | Not secret. Toggles the Whisper stage between a local HTTP endpoint and RunPod. |
| `RUNPOD_WHISPER_ENDPOINT_ID` | Next.js BFF | Conditional | endpoint identifier string | Required when `WHISPER_LOCAL_MODE` is not enabled. Keep server-side usage only. |
| `WHISPER_LOCAL_ENDPOINT` | Next.js BFF | Conditional | `http://127.0.0.1:8000/runsync` | Required when `WHISPER_LOCAL_MODE=true`. |
| `LLM_LOCAL_MODE` | Next.js BFF | Optional | `true` or `false` | Not secret. Toggles the restructuring stage between a local HTTP endpoint and RunPod. |
| `RUNPOD_LLM_ENDPOINT_ID` | Next.js BFF | Conditional | endpoint identifier string | Required when `LLM_LOCAL_MODE` is not enabled. Keep server-side usage only. |
| `LLM_LOCAL_ENDPOINT` | Next.js BFF | Conditional | `http://127.0.0.1:8001/runsync` | Required when `LLM_LOCAL_MODE=true`. |
| `MASTER_KEY_BASE64` | Next.js BFF and RunPod worker | Yes | base64 for a 32-byte master key | Secret. Must exist only in BFF and worker env vars. Never send it to the browser or payload. |
| `MAX_AUDIO_SIZE_MB` | Next.js BFF | Yes | `12` | Not secret. `AGENTS.md` also mentions a default of `12`, but this doc keeps it explicit to avoid ambiguity. |
| `MAX_JOBS_PER_DAY` | Next.js BFF | Optional | integer such as `10` | Not secret. Controls abuse and cost limits if enabled. |
| `MAX_CONCURRENT_JOBS` | Next.js BFF | Yes | `1` | Not secret. V1 uses this name to cap overlapping jobs at the BFF layer. |

## Ownership by runtime

Next.js BFF variables:

- `AUTH_USERNAME`
- `AUTH_PASSWORD_HASH`
- `SESSION_SECRET`
- `RUNPOD_API_KEY`
- `RUNPOD_API_BASE_URL`
- `WHISPER_LOCAL_MODE`
- `RUNPOD_WHISPER_ENDPOINT_ID`
- `WHISPER_LOCAL_ENDPOINT`
- `LLM_LOCAL_MODE`
- `RUNPOD_LLM_ENDPOINT_ID`
- `LLM_LOCAL_ENDPOINT`
- `MASTER_KEY_BASE64`
- `MAX_AUDIO_SIZE_MB`
- `MAX_JOBS_PER_DAY`
- `MAX_CONCURRENT_JOBS`

Whisper worker variables:

- `MASTER_KEY_BASE64`
- worker-local env such as `local-worker/worker.env` or the RunPod endpoint env

LLM worker variables:

- worker-local env such as `local-llm-worker/worker.env` or the RunPod endpoint env

## Security rules

- Never expose `RUNPOD_API_KEY`, `MASTER_KEY_BASE64`, `SESSION_SECRET`, or `AUTH_PASSWORD_HASH` to frontend code.
- Never put secrets in `NEXT_PUBLIC_*` variables.
- Never log secrets, full encrypted payloads, full transcripts, or raw audio.
- Prefer explicit environment configuration over hidden defaults for V1 reproducibility.

## Documentation notes

- `AUTH_PASSWORD_HASH` is standardized on `bcrypt` for V1.
- The documentation intentionally uses `MAX_CONCURRENT_JOBS` to match the Excel backlog naming.
- `RUNPOD_WHISPER_ENDPOINT_ID` and `RUNPOD_LLM_ENDPOINT_ID` are deployment-provided identifiers whose exact format depends on RunPod.
- `MAX_AUDIO_SIZE_MB` should be explicitly set to `12` in runtime configuration for V1 clarity.
- The current architecture supports two separate workers, and each stage can be routed independently to a local endpoint or to RunPod.
- The root `.env` is now intended only for BFF orchestration and secrets. Model selection belongs to worker-specific env files or RunPod worker env settings.

## Clarifications needed

- `AGENTS.md` names `ALLOW_CONCURRENT_JOBS`, while the current approved backlog direction kept `MAX_CONCURRENT_JOBS`. Reconfirm the final runtime variable name before continuing implementation that depends on concurrency configuration.
