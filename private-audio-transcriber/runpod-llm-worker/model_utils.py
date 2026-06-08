from __future__ import annotations

import os
from pathlib import Path

HF_CACHE_ROOT = Path("/runpod-volume/huggingface-cache/hub")


def is_truthy_env(var_name: str, default: str = "false") -> bool:
    value = os.getenv(var_name, default).strip().lower()
    return value in {"1", "true", "yes", "on"}


def resolve_model_source(
    *,
    model_name: str,
    explicit_path_env: str,
    require_cached_env: str = "RUNPOD_REQUIRE_CACHED_MODELS",
    prefer_cached_env: str = "RUNPOD_PREFER_CACHED_MODELS",
) -> tuple[str, bool]:
    explicit_path = os.getenv(explicit_path_env, "").strip()

    if explicit_path:
        return explicit_path, Path(explicit_path).exists()

    prefer_cached = is_truthy_env(prefer_cached_env, "true")
    require_cached = is_truthy_env(require_cached_env, "false")
    cached_path = find_cached_model_path(model_name)

    if cached_path is not None and prefer_cached:
        return str(cached_path), True

    if require_cached:
        raise FileNotFoundError(
            f"Cached model not found for {model_name}. "
            f"Expected under {HF_CACHE_ROOT}.",
        )

    return model_name, False


def find_cached_model_path(model_name: str) -> Path | None:
    parts = [part.strip() for part in model_name.split("/") if part.strip()]

    if len(parts) != 2:
        return None

    org, name = parts
    model_root = HF_CACHE_ROOT / f"models--{org}--{name}"
    snapshots_dir = model_root / "snapshots"

    if not snapshots_dir.exists():
        return None

    snapshots = sorted(
        [path for path in snapshots_dir.iterdir() if path.is_dir()],
        key=lambda path: path.name,
        reverse=True,
    )

    return snapshots[0] if snapshots else None
