FROM pytorch/pytorch:2.5.1-cuda12.4-cudnn9-runtime

ENV DEBIAN_FRONTEND=noninteractive \
    HF_HOME=/tmp/hf-cache \
    HF_HUB_ENABLE_HF_TRANSFER=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    REQUIRE_CUDA=true \
    RUNPOD_PREFER_CACHED_MODELS=true \
    RUNPOD_REQUIRE_CACHED_MODELS=true \
    RUNPOD_INIT_TIMEOUT=800 \
    WHISPER_BEAM_SIZE=5

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg git \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./requirements.txt

RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "-u", "handler.py"]
