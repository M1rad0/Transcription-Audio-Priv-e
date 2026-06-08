from __future__ import annotations

from typing import Any

from fastapi import FastAPI, HTTPException

from env_loader import load_worker_env
from llm_corrector import LocalLlmCorrector

load_worker_env()

app = FastAPI(title="local-llm-worker")
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


@app.get("/health")
def health() -> dict[str, Any]:
    return {"status": "ok"}


@app.post("/runsync")
def runsync(job: dict[str, Any]) -> dict[str, Any]:
    payload = job.get("input")

    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Job input is missing or invalid.")

    try:
        job_id = _get_required_str(payload, "job_id")
        raw_text = _get_required_str(payload, "raw_text")
        options = payload.get("options")

        if not isinstance(options, dict):
            raise ValueError("options is required.")

        language = str(options.get("language", "fr")).strip().lower() or "fr"

        if language != "fr":
            raise ValueError("Only French language processing is supported in V1.")

        output = {
            "engine": f"local-llm-{get_corrector().model_name}",
            "job_id": job_id,
            "language": language,
            "modified_text": get_corrector().correct(raw_text),
            "status": "success",
        }
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error

    return {
        "output": output,
        "status": "COMPLETED",
    }
