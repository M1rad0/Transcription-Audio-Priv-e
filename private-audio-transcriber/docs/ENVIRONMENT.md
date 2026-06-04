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
| `RUNPOD_API_KEY` | Next.js BFF | Yes | `rp_...` | Secret. Server-side only. Never expose to the browser. |
| `RUNPOD_ENDPOINT_ID` | Next.js BFF | Yes | endpoint identifier string | Keep server-side usage only even if the raw identifier is less sensitive than the API key. |
| `MASTER_KEY_BASE64` | Next.js BFF and RunPod worker | Yes | base64 for a 32-byte master key | Secret. Must exist only in BFF and worker env vars. Never send it to the browser or payload. |
| `MAX_AUDIO_SIZE_MB` | Next.js BFF | Yes | `12` | Not secret. `AGENTS.md` also mentions a default of `12`, but this doc keeps it explicit to avoid ambiguity. |
| `MAX_JOBS_PER_DAY` | Next.js BFF | Optional | integer such as `10` | Not secret. Controls abuse and cost limits if enabled. |
| `MAX_CONCURRENT_JOBS` | Next.js BFF | Yes | `1` | Not secret. V1 uses this name to cap overlapping jobs at the BFF layer. |
| `WHISPER_MODEL` | RunPod worker | Optional | `large-v3` | Not secret. V1 default prioritizes French transcription quality. |
| `LLM_MODEL` | RunPod worker | Optional | `Qwen2.5-3B-Instruct` | Not secret, but still best kept in worker-only configuration. |

## Ownership by runtime

Next.js BFF variables:

- `AUTH_USERNAME`
- `AUTH_PASSWORD_HASH`
- `SESSION_SECRET`
- `RUNPOD_API_KEY`
- `RUNPOD_ENDPOINT_ID`
- `MASTER_KEY_BASE64`
- `MAX_AUDIO_SIZE_MB`
- `MAX_JOBS_PER_DAY`
- `MAX_CONCURRENT_JOBS`

RunPod worker variables:

- `MASTER_KEY_BASE64`
- `WHISPER_MODEL`
- `LLM_MODEL`

## Security rules

- Never expose `RUNPOD_API_KEY`, `MASTER_KEY_BASE64`, `SESSION_SECRET`, or `AUTH_PASSWORD_HASH` to frontend code.
- Never put secrets in `NEXT_PUBLIC_*` variables.
- Never log secrets, full encrypted payloads, full transcripts, or raw audio.
- Prefer explicit environment configuration over hidden defaults for V1 reproducibility.

## Documentation notes

- `AUTH_PASSWORD_HASH` is standardized on `bcrypt` for V1.
- The documentation intentionally uses `MAX_CONCURRENT_JOBS` to match the Excel backlog naming.
- `RUNPOD_ENDPOINT_ID` remains a deployment-provided identifier whose exact format depends on RunPod.
- `MAX_AUDIO_SIZE_MB` should be explicitly set to `12` in runtime configuration for V1 clarity.
