from __future__ import annotations

import time
from typing import Any

import runpod

from llm_corrector import LocalLlmCorrector

_CORRECTOR: LocalLlmCorrector | None = None


def get_corrector() -> LocalLlmCorrector:
    global _CORRECTOR

    if _CORRECTOR is None:
        _CORRECTOR = LocalLlmCorrector()

    return _CORRECTOR


def _get_required_str(payload: dict[str, Any], key: str) -> str:
    value = payload.get(key)

    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{key} is required.")

    return value.strip()


def _log_status(job_id: str, **fields: Any) -> None:
    parts = [f"job_id={job_id}"]

    for key, value in fields.items():
        parts.append(f"{key}={value}")

    print("[llm-worker]", " ".join(parts), flush=True)


def handler(job: dict[str, Any]) -> dict[str, Any]:
    started_at = time.perf_counter()
    payload = job.get("input")

    if not isinstance(payload, dict):
        raise ValueError("Job input is missing or invalid.")

    job_id = _get_required_str(payload, "job_id")
    raw_text = _get_required_str(payload, "raw_text")
    options = payload.get("options")

    if not isinstance(options, dict):
        raise ValueError("options is required.")

    language = str(options.get("language", "fr")).strip().lower() or "fr"

    if language != "fr":
        raise ValueError("Only French language processing is supported in V1.")

    _log_status(job_id, status="started", raw_chars=len(raw_text))
    runpod.serverless.progress_update(job, "correcting")
    modified_text = get_corrector().correct(raw_text)
    elapsed_seconds = round(time.perf_counter() - started_at, 3)
    result = {
        "engine": f"local-llm-{get_corrector().model_name}",
        "job_id": job_id,
        "language": language,
        "metadata": {
            "raw_characters": len(raw_text),
            "worker_elapsed_seconds": elapsed_seconds,
        },
        "modified_text": modified_text,
        "status": "success",
    }
    _log_status(job_id, status="success", elapsed_seconds=elapsed_seconds)
    return result


if __name__ == "__main__":
    runpod.serverless.start({"handler": handler})
