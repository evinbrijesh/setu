"""
main.py — Phase 2 WebSocket audio bridge with Render Workflow trigger.

Accepts streamed browser mic audio, transcribes via Saaras v3 STT,
triggers the setu-workflows pipeline (run_setu_turn), synthesizes the
agent's response via Bulbul v3 TTS, and streams it back.
"""

import json
import os
from uuid import uuid4

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.audio_utils import transcode_to_wav
from app.sarvam_client import synthesize_speech, transcribe_audio
from app.workflow_trigger import trigger_setu_turn

app = FastAPI(title="setu-audio")

# Allow the Vite dev server to connect during local development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/api/session/{user_id}/{scheme_id}")
async def lookup_session(user_id: str, scheme_id: str):
    """Look up existing in_progress workflow instance for a user + scheme."""
    try:
        from supabase import create_client

        url = os.environ.get("SUPABASE_URL", "")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
        if url and key:
            supabase = create_client(url, key)
            result = (
                supabase.table("workflow_instances")
                .select("id, current_stage, status")
                .eq("user_id", user_id)
                .eq("scheme_id", scheme_id)
                .eq("status", "in_progress")
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )
            if result.data:
                row = result.data[0]
                return {
                    "workflow_instance_id": row["id"],
                    "current_stage": row["current_stage"],
                    "status": row["status"],
                }
    except Exception:
        pass
    return None  # 204 No Content


@app.websocket("/ws/audio")
async def audio_websocket(websocket: WebSocket):
    await websocket.accept()
    audio_chunks: list[bytes] = []
    session_user_id: str | None = None
    session_language: str = "hi-IN"
    session_workflow_instance_id: str | None = None

    try:
        while True:
            message = await websocket.receive()

            if "bytes" in message and message["bytes"] is not None:
                # Buffer incoming binary audio chunks from MediaRecorder
                audio_chunks.append(message["bytes"])

            elif "text" in message and message["text"] is not None:
                control = json.loads(message["text"])

                if control.get("type") == "start_session":
                    session_user_id = control.get("user_id", str(uuid4()))
                    session_language = control.get("language_code", "hi-IN")
                    session_workflow_instance_id = control.get("workflow_instance_id")
                    response = {
                        "type": "session_started",
                        "user_id": session_user_id,
                    }
                    if session_workflow_instance_id:
                        response["workflow_instance_id"] = session_workflow_instance_id
                        response["resumed"] = True
                    await websocket.send_json(response)
                    continue

                if control.get("type") == "end_utterance":
                    if not audio_chunks:
                        await websocket.send_json({"type": "error", "message": "No audio received"})
                        continue

                    raw_webm = b"".join(audio_chunks)
                    audio_chunks = []  # reset buffer for next utterance

                    # Step 1: transcode webm -> wav
                    wav_bytes = await transcode_to_wav(raw_webm)

                    # Step 2: STT via Saaras v3
                    transcript = await transcribe_audio(
                        wav_bytes,
                        filename="utterance.wav",
                        language_code=session_language,
                        mode="codemix",
                    )
                    await websocket.send_json(
                        {"type": "transcript", "text": transcript, "is_final": True}
                    )

                    # Step 3: Trigger setu-workflows pipeline
                    user_id = session_user_id or str(uuid4())
                    result = await trigger_setu_turn(
                        user_id=user_id,
                        raw_utterance=transcript,
                        existing_instance_id=session_workflow_instance_id,
                    )

                    # Send session state update
                    await websocket.send_json(
                        {
                            "type": "session_state",
                            "workflow_instance_id": result.get("workflow_instance_id"),
                            "current_stage": result.get("current_stage"),
                            "complete": result.get("complete", False),
                            "needs_reask": result.get("needs_reask", False),
                            "resumed": result.get("resumed", False),
                        }
                    )

                    # Determine the agent's response text
                    response_text = _build_response_text(result)

                    await websocket.send_json(
                        {"type": "agent_response_text", "text": response_text}
                    )

                    # Step 4: TTS via Bulbul v3 — stream back
                    response_audio = await synthesize_speech(
                        response_text,
                        target_language_code=session_language,
                    )
                    await websocket.send_bytes(response_audio)

    except WebSocketDisconnect:
        pass


def _build_response_text(result: dict) -> str:
    """Build a user-facing response from the workflow result.

    Priority order:
    1. notification_message from notify_user_task (post-completion)
    2. reask_prompt (mid-collection question)
    3. ineligibility message (validation failed)
    4. generic fallback
    """
    needs_reask = result.get("needs_reask", False)
    reask_prompt = result.get("reask_prompt")
    complete = result.get("complete", False)
    eligible = result.get("eligible")
    failed_reasons = result.get("failed_reasons", [])
    notification_message = result.get("notification_message", "")

    # Post-completion notification with download link
    if complete and eligible and notification_message:
        return notification_message

    if needs_reask and reask_prompt:
        return reask_prompt

    if complete and eligible is False and failed_reasons:
        return (
            "आपकी जानकारी के अनुसार, आप इस योजना के लिए पात्र नहीं हैं। "
            f"कारण: {'। '.join(failed_reasons)}।"
        )

    if complete and eligible:
        return (
            "आपकी जानकारी पूरी हो गई है। आपका आवेदन पत्र तैयार किया जा रहा है। "
            "जल्द ही आपको डाउनलोड लिंक भेजा जाएगा।"
        )

    return "कृपया अपनी जानकारी प्रदान करें।"
