from __future__ import annotations

import shutil
import tempfile
import time
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException

from crypto_utils import DecryptedPayload, decrypt_runpod_payload
from env_loader import load_worker_env
from transcriber import FasterWhisperTranscriber

load_worker_env()

app = FastAPI(title="local-whisper-worker")
_TRANSCRIBER: FasterWhisperTranscriber | None = None


def get_transcriber() -> FasterWhisperTranscriber:
    global _TRANSCRIBER

    if _TRANSCRIBER is None:
        _TRANSCRIBER = FasterWhisperTranscriber()

    return _TRANSCRIBER


def _safe_filename(filename: str) -> str:
    suffix = Path(filename).suffix.lower() or ".bin"
    return f"input{suffix}"


def _write_audio_file(temp_dir: Path, payload: DecryptedPayload) -> Path:
    audio_path = temp_dir / _safe_filename(payload.filename)
    audio_path.write_bytes(payload.audio_bytes)
    return audio_path


def _build_result(payload: dict[str, Any]) -> dict[str, Any]:
    started_at = time.perf_counter()
    cleanup = {"temp_files_deleted": False}
    temp_dir: Path | None = None
    job_id = None

    try:
        decrypted_payload = decrypt_runpod_payload(payload)
        job_id = decrypted_payload.job_id
        temp_root = Path.cwd() / "tmp"
        temp_root.mkdir(parents=True, exist_ok=True)
        temp_dir = Path(tempfile.mkdtemp(prefix=f"{job_id}_", dir=str(temp_root)))
        audio_path = _write_audio_file(temp_dir, decrypted_payload)
        transcription = get_transcriber().transcribe(
            audio_path,
            language=decrypted_payload.language,
        )
        elapsed_seconds = round(time.perf_counter() - started_at, 3)
        return {
            "cleanup": cleanup,
            "duration_seconds": transcription.duration_seconds,
            "engine": transcription.engine,
            "job_id": decrypted_payload.job_id,
            "language": transcription.language,
            "modified_text": transcription.raw_text,
            "raw_text": transcription.raw_text,
            "segments": transcription.segments,
            "status": "success",
            "timings": {
                "worker_elapsed_seconds": elapsed_seconds,
            },
        }
    finally:
        if temp_dir is not None:
            try:
                shutil.rmtree(temp_dir)
                cleanup["temp_files_deleted"] = True
            except Exception as cleanup_error:
                cleanup["cleanup_error"] = str(cleanup_error)
                cleanup["temp_files_deleted"] = False


@app.get("/health")
def health() -> dict[str, Any]:
    return {"status": "ok"}


@app.post("/runsync")
def runsync(job: dict[str, Any]) -> dict[str, Any]:
    payload = job.get("input")

    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Job input is missing or invalid.")

    try:
        output = _build_result(payload)
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error

    return {
        "output": output,
        "status": "COMPLETED",
    }
