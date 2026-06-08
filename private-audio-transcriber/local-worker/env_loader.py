from __future__ import annotations

from pathlib import Path

from dotenv import load_dotenv


def load_worker_env() -> Path:
    worker_root = Path(__file__).resolve().parent
    preferred = worker_root / "worker.env"
    fallback = worker_root / ".env"

    if preferred.exists():
        load_dotenv(preferred, override=False)
        return preferred

    load_dotenv(fallback, override=False)
    return fallback
