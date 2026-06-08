# RunPod LLM Worker

This directory contains the dedicated text-restructuring worker used after Whisper transcription.

## Responsibilities

The worker is responsible for:

- receiving `raw_text` from the Next.js BFF;
- loading one local or cached text-correction model;
- generating `modified_text` without changing meaning;
- returning structured JSON.

## Files

- `handler.py`: RunPod entrypoint and orchestration.
- `llm_corrector.py`: local LLM loading and correction logic.
- `model_utils.py`: cached-model and explicit-path helpers.
- `requirements.txt`: Python dependencies.
- `Dockerfile`: base image for the worker.

## Recommended environment variables

- `LLM_MODEL=Qwen/Qwen2.5-0.5B-Instruct`
- `LLM_MODEL_PATH=` optional explicit local path
- `LLM_DEVICE_MAP=auto`
- `LLM_INPUT_CHAR_LIMIT=12000`
- `LLM_MAX_NEW_TOKENS=1200`
- `RUNPOD_PREFER_CACHED_MODELS=true`
- `RUNPOD_REQUIRE_CACHED_MODELS=true`
- `REQUIRE_CUDA=true`
- `HF_HOME=/tmp/hf-cache`

## Input contract

The worker expects this payload:

```json
{
  "job_id": "job_xxx",
  "raw_text": "...",
  "options": {
    "language": "fr"
  }
}
```

## Output contract

Successful output:

```json
{
  "job_id": "job_xxx",
  "status": "success",
  "engine": "local-llm-Qwen/Qwen2.5-0.5B-Instruct",
  "language": "fr",
  "modified_text": "...",
  "metadata": {
    "raw_characters": 1234,
    "worker_elapsed_seconds": 2.913
  }
}
```

## Notes

- This worker is intentionally separate from the Whisper worker so each stage can run either on RunPod or on a local endpoint.
- The worker assumes French-only text restructuring in V1.
- Cached models are preferred to avoid billed runtime downloads.
