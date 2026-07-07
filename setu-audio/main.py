"""Setu audio bridge service.

FastAPI WebSocket service that:
- Receives streamed audio chunks from the browser
- Calls Saaras v3 for speech-to-text transcription
- Triggers Render Workflow task runs with transcribed utterances
- Calls Bulbul v3 for text-to-speech synthesis
- Streams synthesized audio back to the browser

This service holds NO business logic — it is purely an audio bridge plus
a trigger point for Render Workflows.
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: validate required env vars, init clients
    required = [
        "SARVAM_API_KEY",
        "SUPABASE_URL",
        "SUPABASE_SERVICE_ROLE_KEY",
        "RENDER_WORKFLOWS_TRIGGER_URL",
        "RENDER_API_KEY",
    ]
    for var in required:
        if not os.getenv(var):
            raise RuntimeError(f"Missing required env var: {var}")
    yield
    # Shutdown: cleanup


app = FastAPI(
    title="Setu Audio Bridge",
    version="0.0.1",
    lifespan=lifespan,
)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.websocket("/ws/audio")
async def audio_websocket(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            # Receive control message or audio chunk
            data = await websocket.receive()
            # TODO: Phase 1 — implement audio streaming, STT, TTS, workflow trigger
            pass
    except WebSocketDisconnect:
        pass


@app.get("/api/session/{user_id}/{scheme_id}")
async def get_session(user_id: str, scheme_id: str):
    """Look up existing in_progress workflow instance for resuming."""
    # TODO: Phase 2 — query Supabase for existing workflow_instances
    return None, 204


@app.get("/api/form/{workflow_instance_id}")
async def get_form(workflow_instance_id: str):
    """Return signed download URL for generated PDF, if ready."""
    # TODO: Phase 4 — check form_generation status, return signed URL
    return {"status": "pending"}
