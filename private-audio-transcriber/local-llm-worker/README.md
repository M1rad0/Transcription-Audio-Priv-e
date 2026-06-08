# Local LLM Worker

This directory contains a local HTTP worker for the restructuring stage.

It is optimized for local installation rather than RunPod deployment:

- `FastAPI` + `uvicorn` server
- local `worker.env` configuration
- lighter default local text model
- `/runsync` endpoint compatible with the BFF local mode

## Setup

1. Create a virtual environment.
2. Install `requirements.txt`.
3. Copy `worker.env.example` to `worker.env`.
4. Adjust the model or path if needed.
5. Start the server:

```bash
uvicorn app:app --host 127.0.0.1 --port 8001
```

## Endpoint

- `POST /runsync`
- `GET /health`

The request body uses the same `{"input": ...}` envelope as the RunPod sync flow.
