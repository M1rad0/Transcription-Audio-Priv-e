from __future__ import annotations

import base64
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

HKDF_INFO_PREFIX = "private-audio-transcriber:job:"
DERIVED_KEY_BYTES = 32
SALT_BYTES = 16
AUDIO_NONCE_BYTES = 12
AUDIO_AUTH_TAG_BYTES = 16


@dataclass(frozen=True)
class DecryptedPayload:
    audio_bytes: bytes
    filename: str
    job_id: str
    language: str
    generate_modified: bool


def _from_base64(value: str, label: str) -> bytes:
    try:
        return base64.b64decode(value, validate=True)
    except Exception as exc:
        raise ValueError(f"{label} is not valid base64.") from exc


def _get_required_str(payload: dict[str, Any], key: str) -> str:
    value = payload.get(key)

    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{key} is required.")

    return value.strip()


def get_master_key(master_key_base64: str | None = None) -> bytes:
    raw_value = master_key_base64 or os.getenv("MASTER_KEY_BASE64")

    if not raw_value:
        raise ValueError("MASTER_KEY_BASE64 is missing.")

    master_key = _from_base64(raw_value, "MASTER_KEY_BASE64")

    if len(master_key) != DERIVED_KEY_BYTES:
        raise ValueError("MASTER_KEY_BASE64 must decode to exactly 32 bytes.")

    return master_key


def derive_per_file_key(
    *,
    job_id: str,
    salt: bytes,
    master_key_base64: str | None = None,
) -> bytes:
    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=DERIVED_KEY_BYTES,
        salt=salt,
        info=f"{HKDF_INFO_PREFIX}{job_id}".encode("utf-8"),
    )
    return hkdf.derive(get_master_key(master_key_base64))


def decrypt_runpod_payload(
    payload: dict[str, Any],
    master_key_base64: str | None = None,
) -> DecryptedPayload:
    job_id = _get_required_str(payload, "job_id")
    filename = Path(_get_required_str(payload, "filename")).name or "audio.bin"
    salt = _from_base64(_get_required_str(payload, "salt_base64"), "salt_base64")
    audio_nonce = _from_base64(
        _get_required_str(payload, "audio_nonce_base64"),
        "audio_nonce_base64",
    )
    encrypted_audio = _from_base64(
        _get_required_str(payload, "encrypted_audio_base64"),
        "encrypted_audio_base64",
    )

    if len(salt) != SALT_BYTES:
        raise ValueError("salt_base64 must decode to exactly 16 bytes.")

    if len(audio_nonce) != AUDIO_NONCE_BYTES:
        raise ValueError("audio_nonce_base64 must decode to exactly 12 bytes.")

    if len(encrypted_audio) <= AUDIO_AUTH_TAG_BYTES:
        raise ValueError("encrypted_audio_base64 is too short.")

    options = payload.get("options")

    if not isinstance(options, dict):
        raise ValueError("options is required.")

    language = options.get("language", "fr")
    generate_modified = bool(options.get("generate_modified", True))

    if language != "fr":
        raise ValueError("Only French language processing is supported in V1.")

    key = derive_per_file_key(
        job_id=job_id,
        master_key_base64=master_key_base64,
        salt=salt,
    )
    plaintext = AESGCM(key).decrypt(audio_nonce, encrypted_audio, None)

    return DecryptedPayload(
        audio_bytes=plaintext,
        filename=filename,
        generate_modified=generate_modified,
        job_id=job_id,
        language=language,
    )
