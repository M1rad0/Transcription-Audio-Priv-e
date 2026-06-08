from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import torch
from faster_whisper import WhisperModel

from model_utils import is_truthy_env, resolve_model_source


@dataclass(frozen=True)
class TranscriptionResult:
    duration_seconds: int
    engine: str
    language: str
    raw_text: str
    segments: list[dict[str, Any]]


def _detect_device() -> str:
    requested = os.getenv("WHISPER_DEVICE", "auto").strip().lower()

    if requested != "auto":
        return requested

    cuda_available = torch.cuda.is_available()
    require_cuda = is_truthy_env("REQUIRE_CUDA", "true")

    if require_cuda and not cuda_available:
        raise RuntimeError("CUDA is required but no GPU is available to the worker.")

    return "cuda" if cuda_available else "cpu"


def _detect_compute_type(device: str) -> str:
    configured = os.getenv("WHISPER_COMPUTE_TYPE")

    if configured:
        return configured.strip()

    return "float16" if device == "cuda" else "int8"


class FasterWhisperTranscriber:
    def __init__(self) -> None:
        self.model_name = os.getenv("WHISPER_MODEL", "large-v3").strip()
        self.device = _detect_device()
        self.compute_type = _detect_compute_type(self.device)
        self.download_root = os.getenv("HF_HOME", "/tmp/hf-cache")
        self.beam_size = int(os.getenv("WHISPER_BEAM_SIZE", "5"))
        self.model_source, self.using_local_source = resolve_model_source(
            explicit_path_env="WHISPER_MODEL_PATH",
            model_name=self.model_name,
        )
        self.model = WhisperModel(
            self.model_source,
            compute_type=self.compute_type,
            device=self.device,
            download_root=self.download_root,
        )

    def transcribe(self, audio_path: Path, language: str = "fr") -> TranscriptionResult:
        segments_iter, info = self.model.transcribe(
            str(audio_path),
            beam_size=self.beam_size,
            condition_on_previous_text=True,
            language=language,
            vad_filter=False,
        )

        segments: list[dict[str, Any]] = []
        raw_parts: list[str] = []
        max_end = 0.0

        for segment in segments_iter:
            text = segment.text.strip()

            if not text:
                continue

            segments.append(
                {
                    "end": round(float(segment.end), 3),
                    "start": round(float(segment.start), 3),
                    "text": text,
                }
            )
            raw_parts.append(text)
            max_end = max(max_end, float(segment.end))

        return TranscriptionResult(
            duration_seconds=int(round(getattr(info, "duration", 0.0) or max_end)),
            engine=f"faster-whisper-{self.model_name}",
            language=getattr(info, "language", None) or language,
            raw_text=" ".join(raw_parts).strip(),
            segments=segments,
        )
