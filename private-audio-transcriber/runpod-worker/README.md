# RunPod Worker

This directory contains the Python worker for the private audio transcription flow.

## Responsibilities

The worker is responsible for:

- receiving the encrypted payload from the Next.js BFF;
- deriving the per-file key with HKDF;
- decrypting the audio only inside `/tmp/job_xxx`;
- running `faster-whisper`;
- generating `raw_text`;
- returning `modified_text` with the same value as `raw_text` for now so the app contract stays stable;
- returning structured JSON;
- cleaning up temporary files in `finally`.

## Files

- `handler.py`: RunPod entrypoint and orchestration.
- `crypto_utils.py`: HKDF and AES-256-GCM decryption helpers.
- `transcriber.py`: `faster-whisper` loading and transcription logic.
- `requirements.txt`: Python dependencies.
- `Dockerfile`: base image for the worker.

## Required environment variables

- `MASTER_KEY_BASE64`

## Recommended environment variables

- `WHISPER_MODEL=large-v3`
- `WHISPER_MODEL_PATH=` optional explicit local path
- `WHISPER_DEVICE=auto`
- `WHISPER_COMPUTE_TYPE=float16`
- `WHISPER_BEAM_SIZE=5`
- `RUNPOD_PREFER_CACHED_MODELS=true`
- `RUNPOD_REQUIRE_CACHED_MODELS=true`
- `REQUIRE_CUDA=true`
- `HF_HOME=/tmp/hf-cache`

## Input contract

The worker expects the `input` payload created by the Next.js BFF:

```json
{
  "job_id": "job_xxx",
  "filename": "audio.mp3",
  "encrypted_audio_base64": "...",
  "salt_base64": "...",
  "audio_nonce_base64": "...",
  "options": {
    "language": "fr",
    "generate_modified": true
  }
}
```

`generate_modified` is currently accepted for forward compatibility, but this worker does not run a text-correction LLM anymore. It returns `modified_text` as a pass-through copy of `raw_text` until the local post-processing stage is added outside RunPod.

## Output contract

Successful output:

```json
{
  "job_id": "job_xxx",
  "status": "success",
  "engine": "faster-whisper-large-v3",
  "language": "fr",
  "duration_seconds": 1200,
  "raw_text": "...",
  "modified_text": "...",
  "segments": [
    {
      "start": 0.0,
      "end": 8.4,
      "text": "..."
    }
  ],
  "cleanup": {
    "temp_files_deleted": true
  }
}
```

Error output:

```json
{
  "job_id": "job_xxx",
  "status": "error",
  "error_type": "ValueError",
  "error_message": "...",
  "cleanup": {
    "temp_files_deleted": true
  }
}
```

## Local validation

Syntax check:

```bash
python -m py_compile handler.py crypto_utils.py transcriber.py model_utils.py
```

## Notes

- The worker does not retain original audio after processing.
- Sensitive material must never be logged.
- The real RunPod endpoint integration is handled later by the Next.js BFF.
- For RunPod Serverless production, this worker is designed around a single cached model strategy: Whisper only.
- The worker fails fast if the configured Whisper model is not already available through the expected cached-model path or an explicit local path, which helps avoid accidental runtime downloads on billed serverless seconds.
