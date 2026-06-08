from __future__ import annotations

import os
import shutil
import tempfile
import time
from pathlib import Path
from typing import Any

import runpod

from crypto_utils import DecryptedPayload, decrypt_runpod_payload
from transcriber import FasterWhisperTranscriber

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


def _build_error_result(
    *,
    cleanup: dict[str, Any],
    error: Exception,
    job_id: str | None,
) -> dict[str, Any]:
    return {
        "cleanup": cleanup,
        "error_message": str(error),
        "error_type": type(error).__name__,
        "job_id": job_id or "unknown",
        "status": "error",
    }


def _log_status(job_id: str, **fields: Any) -> None:
    parts = [f"job_id={job_id}"]

    for key, value in fields.items():
        parts.append(f"{key}={value}")

    print("[worker]", " ".join(parts), flush=True)


def handler(job: dict[str, Any]) -> dict[str, Any]:
    started_at = time.perf_counter()
    cleanup = {"temp_files_deleted": False}
    job_id: str | None = None
    temp_dir: Path | None = None

    try:
        payload = job.get("input")

        if not isinstance(payload, dict):
            raise ValueError("Job input is missing or invalid.")

        decrypted_payload = decrypt_runpod_payload(payload)
        job_id = decrypted_payload.job_id
        _log_status(job_id, status="started")
        runpod.serverless.progress_update(job, "decrypting")

        temp_dir = Path(tempfile.mkdtemp(prefix=f"{job_id}_", dir="/tmp"))
        audio_path = _write_audio_file(temp_dir, decrypted_payload)
        runpod.serverless.progress_update(job, "transcribing")

        transcription = get_transcriber().transcribe(
            audio_path,
            language=decrypted_payload.language,
        )

        raw_text = transcription.raw_text
        modified_text = raw_text

        elapsed_seconds = round(time.perf_counter() - started_at, 3)
        result = {
            "cleanup": cleanup,
            "duration_seconds": transcription.duration_seconds,
            "engine": transcription.engine,
            "job_id": decrypted_payload.job_id,
            "language": transcription.language,
            "modified_text": modified_text,
            "raw_text": raw_text,
            "segments": transcription.segments,
            "status": "success",
            "timings": {
                "worker_elapsed_seconds": elapsed_seconds,
            },
        }
        _log_status(
            decrypted_payload.job_id,
            status="success",
            duration_seconds=transcription.duration_seconds,
            elapsed_seconds=elapsed_seconds,
            file_size_bytes=len(decrypted_payload.audio_bytes),
            modified_text_strategy="raw_text_passthrough",
        )
        return result
    except Exception as error:
        if job_id:
            _log_status(job_id, status="error", error_type=type(error).__name__)
        return _build_error_result(cleanup=cleanup, error=error, job_id=job_id)
    finally:
        if temp_dir is not None:
            try:
                shutil.rmtree(temp_dir)
                cleanup["temp_files_deleted"] = True
            except Exception as cleanup_error:  # pragma: no cover - defensive cleanup
                cleanup["cleanup_error"] = str(cleanup_error)
                cleanup["temp_files_deleted"] = False


if __name__ == "__main__":
    runpod.serverless.start({"handler": handler})
