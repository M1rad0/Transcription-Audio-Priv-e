from __future__ import annotations

import os
from pathlib import Path


def is_truthy_env(var_name: str, default: str = "false") -> bool:
    value = os.getenv(var_name, default).strip().lower()
    return value in {"1", "true", "yes", "on"}


def resolve_model_source(
    *,
    model_name: str,
    explicit_path_env: str,
) -> tuple[str, bool]:
    explicit_path = os.getenv(explicit_path_env, "").strip()

    if explicit_path:
        return explicit_path, Path(explicit_path).exists()

    return model_name, False
