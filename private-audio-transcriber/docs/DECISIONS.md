# Decisions

This file records the current V1 project decisions and why they were made.

Decision precedence:

- `AGENTS.md` is the final decision source.
- The Excel decision log is used as supporting rationale where it does not conflict with `AGENTS.md`.

## Decision log

| ID | Decision | Why it was made | V1 impact | Status |
| --- | --- | --- | --- | --- |
| `D-001` | Use Next.js as the local UI and BFF instead of Spring Boot. | It is sufficient for auth, quotas, encryption, and the server-side RunPod call while keeping the codebase smaller and deployment simpler. | One local application can own UI, auth, validation, and encrypted transport logic. | Final |
| `D-002` | Use a RunPod Serverless custom endpoint instead of manual Pod start and stop. | Jobs are processed one file at a time and cost control depends on scale-to-zero behavior. | No persistent GPU is required during human review and the operational model stays simpler. | Final |
| `D-003` | Exclude audio enhancement from V1. | Audio enhancement increases complexity and may alter words in ways that are not aligned with the first usable private workflow goal. | The pipeline stays simpler and more predictable, but poor audio quality may still require more human review. | Final |
| `D-004` | Exclude double transcription and use a single `faster-whisper` pass. | A single pass reduces GPU cost and implementation complexity. | `raw.txt` is generated from the original audio only, with no second-pass transcription engine. | Final |
| `D-005` | Exclude OpenAI API and keep correction local in the worker. | V1 requires privacy and avoids external correction APIs. | `modified.txt` is generated inside the RunPod worker by a lightweight local LLM. | Final |
| `D-006` | Use `faster-whisper` as the V1 transcription engine. | It matches the desired private worker architecture and supports the expected raw transcript plus segment output. | The worker must return `raw_text`, timestamps, and a configurable model choice. | Final |
| `D-007` | Use a lightweight local LLM for `modified.txt`. | V1 needs readability improvements without sending text to an external correction API. | The worker performs punctuation, paragraphing, and obvious spelling cleanup while preserving meaning. | Final |
| `D-008` | Treat the BFF as the main anti-cost barrier. | The browser must never reach RunPod directly, and validation must happen before any paid GPU call. | Auth, size checks, extension checks, env checks, and optional quotas all happen in the BFF. | Final |
| `D-009` | Use AES-256-GCM plus HKDF for transport encryption. | Audio must be encrypted before it leaves the BFF, with a per-file derived key and authenticated decryption. | Requires matching crypto logic in Next.js and Python plus unique salt and nonce per file. | Final |
| `D-010` | Keep HMAC request signing optional in V1. | The main protections are BFF auth, server-side secrets, HTTPS, and quota controls; optional HMAC would be secondary defense only. | V1 can ship without HMAC as long as the primary controls are implemented correctly. | Final |
| `D-011` | Standardize on `bcrypt` for `AUTH_PASSWORD_HASH`. | It is production-friendly, widely available, and is the preferred tiebreaker when both `bcrypt` and `argon2` are acceptable. | Auth setup stays simple and conventional for V1. | Final |
| `D-012` | Use `large-v3` as the default Whisper model for V1. | The priority is French transcription quality, even if the model is heavier and slower. | Worker sizing and timeout tuning must account for a heavier Whisper model. | Final |
| `D-013` | Use `Qwen2.5-3B-Instruct` as the default local correction model. | It stays relatively simple while remaining strong enough for punctuation, paragraphing, and light restructuring. | The worker keeps correction local without needing a larger, more complex model first. | Final |
| `D-014` | Use `MAX_CONCURRENT_JOBS` as the documented concurrency variable name. | The Excel backlog naming was explicitly chosen by product direction for documentation consistency. | All docs should use the same variable name for BFF concurrency control. | Final |
| `D-015` | Make the RunPod timeout configurable. | The deployment context is not fixed enough yet to commit to a single numeric timeout. | The timeout is still mandatory, but its exact value will be finalized during operational benchmarking. | Final |
| `D-016` | Defer UI cost estimation to V2. | It is not required for the first secure end-to-end transcription release. | V1 focuses on the workflow itself, while cost display is postponed. | Final |
| `D-017` | Design quotas from the start so V1 can support about 120 minutes per day. | The target operating volume should be supported from the beginning rather than retrofitted later. | BFF quota rules must avoid blocking the intended daily usage envelope. | Final |

## Decision details

### Why Next.js BFF instead of Spring Boot

Next.js is enough for the local login page, protected routes, BFF API route, validation, server-side encryption, and the server-side RunPod call. Choosing it avoids splitting V1 across two backend stacks too early.

### Why RunPod Serverless instead of manual Pod start and stop

RunPod Serverless aligns with one-job-at-a-time transcription, scale-to-zero cost control, and a simpler operational flow. The project does not want a GPU running continuously while the user is only reviewing text.

### Why audio enhancement is excluded from V1

Audio enhancement adds extra moving parts and may change the signal in ways that complicate trust in the transcript. The project prefers a simpler initial pipeline with honest review expectations.

### Why double transcription is excluded from V1

Running more than one transcription pass would increase cost and complexity without being necessary for the first release goal. V1 favors one main engine and human review.

### Why OpenAI API is excluded from correction

The correction step must remain private and local to the worker. External correction APIs would violate that direction and introduce extra dependency and cost concerns.

### Why `faster-whisper` is the V1 transcription engine

It fits the worker-based architecture and the expected outputs of raw transcript plus segments. It also keeps the project within the chosen local/private inference direction.

### Why a local LLM corrector is used

The project wants a second output that improves readability without inventing content. A lightweight local LLM can handle punctuation, paragraphing, and obvious spelling cleanup inside the same worker boundary.

### Why the BFF is the main anti-cost barrier

The BFF is the point where auth, validation, env checks, and optional quotas can stop bad requests before they trigger GPU usage. This makes it the most important cost-control and abuse-control layer in V1.

### Why `bcrypt` is used for password hashes

`bcrypt` is a stable production choice and was selected as the explicit default when no stronger product constraint required `argon2`.

### Why `large-v3` is used for Whisper

The V1 priority is French transcription quality over lightweight inference. `large-v3` is therefore the default documented model, even if that increases GPU requirements.

### Why `Qwen2.5-3B-Instruct` is used for correction

The correction step only needs formatting, punctuation, and light restructuring without semantic invention. `Qwen2.5-3B-Instruct` is a practical balance between simplicity and multilingual usefulness.

### Why the timeout remains configurable

The project must enforce a strict timeout, but the exact number depends on the final GPU, cold-start behavior, and real file duration benchmarks. Documenting it as configurable is more honest than freezing a premature value.

### Why cost estimation is deferred to V2

The first release goal is a secure, private, reviewable transcription flow. Cost display can wait until the end-to-end workflow is validated.
