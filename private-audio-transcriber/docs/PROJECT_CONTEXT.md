# Project Context

## Source priority

This documentation follows these rules:

1. `private-audio-transcriber/AGENTS.md` is the main source of truth.
2. `../docs/backlog_transcription_audio_privee.xlsx` at the repository root is used as the backlog reference when it does not conflict with `AGENTS.md`.
3. If information is still missing or ambiguous, it is documented explicitly instead of guessed.

## Project objective

Private Audio Transcriber V1 is a local-first private audio transcription workflow.

The V1 goal is:

- accept one local audio upload through a Next.js application;
- protect access with simple local authentication;
- encrypt the audio in the server-side BFF before sending it to RunPod;
- transcribe the audio with `faster-whisper`;
- generate two reviewable text outputs plus a structured JSON result;
- show the outputs immediately after processing;
- keep a local authenticated history of completed transcriptions on the Next.js side;
- clean temporary files after each job;
- control GPU usage and RunPod costs.

V1 is not trying to produce perfect transcription. It must produce a private, usable, human-reviewable workflow.

## Expected outputs

Each successful job is expected to produce:

- `raw_text` in the live UI result view;
- `modified_text` in the live UI result view;
- `result.json` in the live UI result view;
- `raw.txt` in local history storage;
- `modified.txt` in local history storage;
- `result.json` in local history storage;
- `metadata.json` in local history storage.

## Target usage volume

Target operating volume from `AGENTS.md`:

- around 120 minutes of audio per day;
- around 6 days per week;
- around 52 hours of audio per month.

## Final architecture

```text
Browser
-> Local Next.js app
-> Authenticated Next.js BFF API routes
-> Treatment tab / History tab
-> Treatment form with audio + first name + last name
-> BFF validation and anti-abuse checks
-> AES-256-GCM encrypted audio payload
-> RunPod Serverless custom endpoint
-> Python worker
-> Temporary decryption in /tmp/job_xxx
-> faster-whisper transcription
-> Lightweight local LLM correction
-> raw_text + modified_text + result JSON
-> Cleanup temporary files in finally
-> Response to Next.js
-> Local persistence under /storage/jobs/{job_id}
-> User review, history lookup, and exports
```

## Main user workflow

### Tab 1: Treatment

1. The user opens the local application and logs in.
2. The authenticated user lands on a simple app with a sidebar navigation exposing two main entries: `Traitement` and `Historique`.
3. In `Traitement`, the user uploads one supported audio file.
4. The user must enter at minimum:
   - `first_name`
   - `last_name`
5. The Next.js BFF validates auth, file size, file extension, anti-abuse rules, and required identity fields.
6. The BFF encrypts the audio server-side with AES-256-GCM using an HKDF-derived per-file key.
7. The BFF sends the encrypted payload to the RunPod Serverless custom worker.
8. The worker decrypts the audio temporarily under `/tmp/job_xxx`.
9. The worker runs `faster-whisper` to generate `raw_text` and timestamped segments.
10. The worker sends `raw_text` to a lightweight local LLM to generate `modified_text`.
11. The worker deletes temporary files in a `finally` block and returns JSON to the BFF.
12. The BFF saves the local history record under `/storage/jobs/{job_id}` with:
    - `metadata.json`
    - `raw.txt`
    - `modified.txt`
    - `result.json`
13. The UI displays `raw_text`, `modified_text`, and `result.json` directly after processing.
14. Only successful jobs are saved in local history.

### Tab 2: History

1. The authenticated user opens `Historique`.
2. The BFF reads local records from `/storage/jobs`.
3. The user can search or filter by:
   - first name
   - last name
   - original filename
   - exact processing date
   - processing date range
4. The user can open a previous treatment without relaunching RunPod.
5. The user can download:
   - `raw.txt`
   - `modified.txt`
   - `result.json`
6. The history view should be prepared for pagination from V1 to keep the interface stable as the local archive grows.

## Recommended local storage structure

```text
/storage/jobs/{job_id}/metadata.json
/storage/jobs/{job_id}/raw.txt
/storage/jobs/{job_id}/modified.txt
/storage/jobs/{job_id}/result.json
```

`metadata.json` must contain at minimum:

- `job_id`
- `first_name`
- `last_name`
- `original_filename`
- `created_at`
- `duration_seconds` if available
- `engine` if available
- `status`
- paths or generated file names

## V1 scope

Included in V1:

- local Next.js application with App Router;
- Next.js API routes as BFF;
- simple local authentication with signed HTTP-only session cookie;
- protected main page and protected `/api/transcribe`;
- a sidebar-based authenticated navigation exposing `Traitement` and `Historique`;
- required `first_name` and `last_name` fields associated with each transcription job;
- file validation and anti-abuse checks before any RunPod call;
- AES-256-GCM encryption with HKDF-derived per-file key;
- RunPod Serverless custom endpoint;
- Python worker;
- `faster-whisper` as the transcription engine;
- lightweight local LLM correction inside the same worker;
- temporary decryption under `/tmp/job_xxx`;
- cleanup in `finally`;
- immediate display of `raw_text`, `modified_text`, and `result.json` after processing;
- local authenticated history of successful jobs stored on the Next.js side with file-based storage;
- local download of `raw.txt`, `modified.txt`, and `result.json` from current and previous jobs;
- history filtering by exact date and date range;
- pagination-ready history behavior from V1;
- support for the target operating volume of about 120 audio minutes per day from the first implementation phase.

## Out of scope for V1

Explicitly excluded from V1:

- Spring Boot;
- OpenAI API;
- Hugging Face Inference Endpoint;
- ElevenLabs API;
- Google Speech API;
- any external transcription API;
- audio enhancement;
- DeepFilterNet;
- RNNoise;
- double transcription;
- advanced diarization;
- public SaaS multi-tenant architecture;
- payment system;
- complex role management;
- mandatory database for history;
- UI cost estimation.

Notes:

- Hugging Face Hub is allowed only as a model source or cache inside the RunPod worker.
- HMAC signing between BFF and worker is optional only, and not a primary V1 defense.
- SQLite can be considered later if history requirements become more complex.

## Main constraints

- The browser must never call RunPod directly.
- `RUNPOD_API_KEY`, `MASTER_KEY_BASE64`, `SESSION_SECRET`, and `AUTH_PASSWORD_HASH` must stay server-side only.
- Maximum file size is 12 MB before encryption and base64.
- Allowed V1 extensions are `.mp3`, `.wav`, `.m4a`, `.ogg`, `.flac`.
- Audio must be encrypted before leaving the BFF.
- The worker must decrypt only temporarily and clean up in `finally`.
- Sensitive logs are forbidden.
- Cost control is a core requirement.
- No GPU should remain active during human review.
- The original audio must never be stored in local history.
- The encrypted audio payload must never be stored in local history.
- Local history must contain only text outputs and the minimum metadata needed to retrieve them.
- Historical records must remain local to the machine hosting the Next.js BFF.
- History access and downloads must be protected by authentication like `/api/transcribe`.

## Final technical decisions

Key final decisions from `AGENTS.md` and the updated product direction:

- `D-001`: Use Next.js as both local UI and BFF.
- `D-002`: Use RunPod Serverless custom endpoint instead of manual Pod start and stop.
- `D-003`: Exclude audio enhancement from V1.
- `D-004`: Use a single `faster-whisper` transcription pass.
- `D-005`: Use a lightweight local LLM for `modified.txt`.
- `D-006`: Use AES-256-GCM plus HKDF for encrypted transport.
- `D-007`: Do not require HMAC in V1.
- `D-008`: Require local authentication.
- `D-009`: Standardize on `bcrypt` for `AUTH_PASSWORD_HASH`.
- `D-010`: Use `large-v3` as the default `faster-whisper` model for V1 French transcription.
- `D-011`: Use `Qwen2.5-3B-Instruct` as the default lightweight local LLM for text restructuring.
- `D-012`: Use `MAX_CONCURRENT_JOBS` as the concurrency variable name in documentation.
- `D-013`: Keep RunPod timeout configurable and finalize the numeric value during deployment benchmarking.
- `D-014`: Defer cost estimation in the UI to V2.
- `D-018`: Include two authenticated sidebar navigation entries in V1: `Traitement` and `Historique`.
- `D-019`: Use local file storage under `/storage/jobs/{job_id}` for transcription history in V1.
- `D-020`: Do not require a database for history in V1; add SQLite later only if history complexity grows.
- `D-021`: Never persist original audio or encrypted audio in history; persist only text outputs and necessary metadata.
- `D-022`: Historize only successful jobs in V1.
- `D-023`: Support both exact-date and date-range filtering in history.
- `D-024`: Prepare pagination in V1 so local history remains stable as records grow.

## Clarifications needed

- `AGENTS.md` still names `ALLOW_CONCURRENT_JOBS`, while the current approved documentation set keeps `MAX_CONCURRENT_JOBS`. Reconfirm the final runtime variable name before implementing new concurrency-dependent behavior.

## Observed repository state

Observed during repository inspection on 2026-06-05:

- the Git repository root contains `docs/` and `private-audio-transcriber/`;
- the root `docs/` directory still contains the Excel backlog only;
- `private-audio-transcriber/docs/` contains the project Markdown documentation required before coding;
- the current app code already contains an early auth and upload shell, but the local history feature described here is not implemented yet;
- the preferred target architecture described in `AGENTS.md` is still only partially implemented.
