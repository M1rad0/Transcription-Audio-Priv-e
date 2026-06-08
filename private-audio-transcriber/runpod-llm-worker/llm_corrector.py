from __future__ import annotations

import os

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

from model_utils import is_truthy_env, resolve_model_source

CORRECTION_PROMPT = (
    "Tu recois une transcription brute generee automatiquement.\n"
    "Ta tache est de corriger uniquement la forme : ponctuation, paragraphes, "
    "orthographe evidente et lisibilite.\n"
    "Tu ne dois pas ajouter d'informations.\n"
    "Tu ne dois pas inventer de mots.\n"
    "Tu ne dois pas changer le sens.\n"
    "Si un passage semble incomplet, ambigu ou incoherent, conserve-le et "
    "ajoute [a verifier].\n"
    "Retourne uniquement le texte corrige."
)


class LocalLlmCorrector:
    def __init__(self) -> None:
        self.model_name = os.getenv("LLM_MODEL", "Qwen/Qwen2.5-0.5B-Instruct").strip()
        self.device_map = os.getenv("LLM_DEVICE_MAP", "auto").strip()
        self.input_char_limit = int(os.getenv("LLM_INPUT_CHAR_LIMIT", "12000"))
        self.max_new_tokens = int(os.getenv("LLM_MAX_NEW_TOKENS", "1200"))
        require_cuda = is_truthy_env("REQUIRE_CUDA", "true")

        if require_cuda and not torch.cuda.is_available():
            raise RuntimeError("CUDA is required but no GPU is available to the worker.")

        self.model_source, self.using_local_source = resolve_model_source(
            explicit_path_env="LLM_MODEL_PATH",
            model_name=self.model_name,
        )
        self.tokenizer = AutoTokenizer.from_pretrained(
            self.model_source,
            local_files_only=self.using_local_source,
            trust_remote_code=True,
        )
        self.model = AutoModelForCausalLM.from_pretrained(
            self.model_source,
            device_map=self.device_map,
            local_files_only=self.using_local_source,
            low_cpu_mem_usage=True,
            torch_dtype="auto",
            trust_remote_code=True,
        )

        if self.tokenizer.pad_token_id is None and self.tokenizer.eos_token_id is not None:
            self.tokenizer.pad_token_id = self.tokenizer.eos_token_id

    def _split_text(self, raw_text: str) -> list[str]:
        cleaned = raw_text.strip()

        if not cleaned:
            return []

        if len(cleaned) <= self.input_char_limit:
            return [cleaned]

        paragraphs = [part.strip() for part in cleaned.splitlines() if part.strip()]
        chunks: list[str] = []
        current: list[str] = []
        current_length = 0

        for paragraph in paragraphs:
            paragraph_length = len(paragraph) + 2

            if current and current_length + paragraph_length > self.input_char_limit:
                chunks.append("\n\n".join(current))
                current = [paragraph]
                current_length = paragraph_length
                continue

            current.append(paragraph)
            current_length += paragraph_length

        if current:
            chunks.append("\n\n".join(current))

        return chunks

    def _build_prompt(self, text: str) -> str:
        messages = [
            {"role": "system", "content": CORRECTION_PROMPT},
            {"role": "user", "content": text},
        ]

        if hasattr(self.tokenizer, "apply_chat_template"):
            return self.tokenizer.apply_chat_template(
                messages,
                add_generation_prompt=True,
                tokenize=False,
            )

        return f"{CORRECTION_PROMPT}\n\nTranscription brute:\n{text}\n\nTexte corrige:"

    def _move_inputs(self, encoded_inputs: dict[str, torch.Tensor]) -> dict[str, torch.Tensor]:
        model_device = getattr(self.model, "device", None)

        if model_device is None or str(model_device) == "meta":
            return encoded_inputs

        return {key: value.to(model_device) for key, value in encoded_inputs.items()}

    def _generate_single(self, text: str) -> str:
        prompt = self._build_prompt(text)
        encoded = self.tokenizer(prompt, return_tensors="pt")
        encoded = self._move_inputs(encoded)
        prompt_length = encoded["input_ids"].shape[-1]

        with torch.inference_mode():
            output_ids = self.model.generate(
                **encoded,
                do_sample=False,
                max_new_tokens=self.max_new_tokens,
                pad_token_id=self.tokenizer.pad_token_id,
            )

        generated_ids = output_ids[0][prompt_length:]
        corrected = self.tokenizer.decode(generated_ids, skip_special_tokens=True).strip()
        return corrected or text

    def correct(self, raw_text: str) -> str:
        chunks = self._split_text(raw_text)

        if not chunks:
            return raw_text

        corrected_chunks = [self._generate_single(chunk) for chunk in chunks]
        return "\n\n".join(chunk.strip() for chunk in corrected_chunks if chunk.strip())
