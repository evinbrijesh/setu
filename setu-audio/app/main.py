"""
main.py — Phase 2 WebSocket audio bridge with Render Workflow trigger.

Accepts streamed browser mic audio, transcribes via Saaras v3 STT,
triggers the setu-workflows pipeline (run_setu_turn), synthesizes the
agent's response via Bulbul v3 TTS, and streams it back.
"""

import json
import os
from uuid import uuid4
from typing import Any
from pydantic import BaseModel

from fastapi import FastAPI, Response, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.audio_utils import transcode_to_wav
from app.sarvam_client import synthesize_speech, transcribe_audio
from app.workflow_trigger import trigger_setu_turn

app = FastAPI(title="setu-audio")

# CORS: allow Vite dev server (localhost:5173) and any production frontend URL
# via the CORS_ORIGINS env var (comma-separated list).
_ALLOWED_ORIGINS = os.environ.get(
    "CORS_ORIGINS", "http://localhost:5173,http://localhost:4173"
).split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
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
    return Response(status_code=204)


MOCK_DATA = {
    "mock-income-123": {
        "scheme_id": "income_cert",
        "template_name": "income_cert.html",
        "data": {
            "full_name": "Rajesh Kumar",
            "district": "Lucknow",
            "occupation": "Retail Shop Owner",
            "annual_income": 180000,
        }
    },
    "mock-caste-123": {
        "scheme_id": "caste_cert",
        "template_name": "caste_cert.html",
        "data": {
            "full_name": "Rajesh Kumar",
            "state": "Uttar Pradesh",
            "caste_category": "OBC",
            "sub_caste": "Yadav",
            "annual_family_income": 240000,
        }
    },
    "mock-kisan-123": {
        "scheme_id": "pm_kisan",
        "template_name": "pm_kisan.html",
        "data": {
            "full_name": "Rajesh Kumar",
            "district": "Lucknow",
            "owns_land": True,
            "land_size_acres": 1.5,
            "has_aadhaar_linked_bank": True,
        }
    }
}


@app.get("/api/form/{workflow_instance_id}")
async def get_form_download(workflow_instance_id: str):
    """Get signed download URL for a generated PDF.

    Reads the workflow_instances table to find the PDF storage path,
    generates a signed URL from Supabase Storage, and returns it.

    For mock/demo IDs (e.g. mock-income-123), it compiles the PDF on-the-fly,
    uploads it to Supabase Storage, and returns a signed download link.
    """
    try:
        from supabase import create_client

        url = os.environ.get("SUPABASE_URL", "")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
        if not url or not key:
            return {"status": "pending"}

        supabase = create_client(url, key)

        # ── Mock/Demo ID generation ──
        if workflow_instance_id.startswith("mock-") or workflow_instance_id in MOCK_DATA:
            mock_key = workflow_instance_id
            if mock_key not in MOCK_DATA:
                mock_key = "mock-income-123"
            
            config = MOCK_DATA[mock_key]
            pdf_path = f"{workflow_instance_id}.pdf"
            
            try:
                from jinja2 import Environment, FileSystemLoader
                from weasyprint import HTML
                
                # Templates directory is adjacent to setu-audio
                templates_dir = os.path.abspath(
                    os.path.join(os.path.dirname(__file__), "../../setu-workflows/templates")
                )
                env = Environment(loader=FileSystemLoader(templates_dir))
                template = env.get_template(config["template_name"])
                html = template.render(**config["data"], workflow_instance_id=workflow_instance_id)
                pdf_bytes = HTML(string=html).write_pdf()
                
                # Upload/Overwrite PDF to Supabase Storage
                try:
                    supabase.storage.from_("generated_forms").remove([pdf_path])
                except Exception:
                    pass
                
                supabase.storage.from_("generated_forms").upload(
                    pdf_path,
                    pdf_bytes,
                    {"content-type": "application/pdf"}
                )
            except Exception as e:
                print(f"Error compiling mock PDF on the fly: {e}")
                pass

            # Once uploaded, request the signed URL
            signed = supabase.storage.from_("generated_forms").create_signed_url(
                pdf_path,
                expires_in=604800,  # 7 days
            )
            download_url = getattr(signed, "signedURL", None) or (
                signed.get("signedURL", "") if isinstance(signed, dict) else ""
            )
            return {
                "status": "ready",
                "download_url": download_url,
                "expires_at": "",
            }

        # ── Real Workflow Instance ──
        instance = (
            supabase.table("workflow_instances")
            .select("pdf_storage_path, status")
            .eq("id", workflow_instance_id)
            .single()
            .execute()
        )
        pdf_path = instance.data.get("pdf_storage_path", "")
        if not pdf_path:
            return {"status": "pending"}

        signed = supabase.storage.from_("generated_forms").create_signed_url(
            pdf_path,
            expires_in=604800,
        )
        download_url = getattr(signed, "signedURL", None) or (
            signed.get("signedURL", "") if isinstance(signed, dict) else ""
        )
        return {
            "status": "ready",
            "download_url": download_url,
            "expires_at": "",
        }
    except Exception:
        return {"status": "pending"}


@app.get("/api/history/{user_id}")
async def get_history(user_id: str):
    """Look up all workflow instances for a user."""
    try:
        from supabase import create_client

        url = os.environ.get("SUPABASE_URL", "")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
        if url and key:
            supabase = create_client(url, key)
            result = (
                supabase.table("workflow_instances")
                .select("id, scheme_id, current_stage, status, created_at, pdf_storage_path")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .execute()
            )
            return result.data or []
    except Exception as e:
        print(f"Error fetching history: {e}")
    return []


@app.get("/api/session/{workflow_instance_id}/messages")
async def get_session_messages(workflow_instance_id: str):
    """Fetch the conversation log messages for a given workflow instance."""
    try:
        from supabase import create_client

        url = os.environ.get("SUPABASE_URL", "")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
        if url and key:
            supabase = create_client(url, key)
            result = (
                supabase.table("conversation_log")
                .select("role, text, created_at")
                .eq("workflow_instance_id", workflow_instance_id)
                .order("created_at", asc=True)
                .execute()
            )
            raw_msgs = result.data or []
            
            # Filter and map messages
            clean_msgs = []
            for msg in raw_msgs:
                text = msg["text"]
                role = msg["role"]
                
                # Filter out system debug logs
                if role == "agent":
                    if (text.startswith("LLM extraction for") or 
                        text.startswith("Got ") or 
                        text.startswith("[FormGen Error]")):
                        continue
                    if text.startswith("[Notification] "):
                        text = text.replace("[Notification] ", "")
                
                clean_msgs.append({
                    "role": role,
                    "text": text,
                    "created_at": msg.get("created_at")
                })
            return clean_msgs
    except Exception as e:
        print(f"Error fetching session messages: {e}")
    return []


class PrepopulatePayload(BaseModel):
    user_id: str
    scheme_id: str
    fields: dict[str, Any]


@app.post("/api/session/prepopulate")
async def prepopulate_session(payload: PrepopulatePayload):
    """Prepopulate documents_collected table for simulated OCR upload."""
    try:
        from supabase import create_client

        url = os.environ.get("SUPABASE_URL", "")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
        if not url or not key:
            return {"error": "Supabase credentials missing"}

        supabase = create_client(url, key)
        
        # 1. Check or create workflow instance
        existing = (
            supabase.table("workflow_instances")
            .select("id")
            .eq("user_id", payload.user_id)
            .eq("scheme_id", payload.scheme_id)
            .eq("status", "in_progress")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        
        if existing.data:
            workflow_id = existing.data[0]["id"]
        else:
            workflow_id = str(uuid4())
            supabase.table("workflow_instances").insert(
                {
                    "id": workflow_id,
                    "user_id": payload.user_id,
                    "scheme_id": payload.scheme_id,
                    "current_stage": "document_collection",
                    "status": "in_progress",
                }
            ).execute()
            
        # 2. Insert fields into documents_collected
        for fname, fval in payload.fields.items():
            supabase.table("documents_collected").upsert(
                {
                    "workflow_instance_id": workflow_id,
                    "field_name": fname,
                    "field_value": fval,
                },
                on_conflict="workflow_instance_id, field_name",
            ).execute()
            
        # 3. Log an agent message
        supabase.table("conversation_log").insert(
            {
                "workflow_instance_id": workflow_id,
                "role": "agent",
                "text": f"[OCR Extraction] Successfully analyzed certificate. Pre-populated details in the registry.",
            }
        ).execute()

        return {
            "status": "ok",
            "workflow_instance_id": workflow_id,
        }
    except Exception as e:
        print(f"Error prepopulating session: {e}")
        return {"error": str(e)}


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

                is_text_utterance = control.get("type") == "text_utterance"

                if control.get("type") == "end_utterance" or is_text_utterance:
                    if is_text_utterance:
                        transcript = control.get("text", "")
                    else:
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
                            "download_url": result.get("download_url", ""),
                            "collected_fields": result.get("collected_fields", {}),
                        }
                    )

                    # Determine the agent's response text
                    response_text = _build_response_text(result)

                    # Update websocket session reference
                    session_workflow_instance_id = result.get("workflow_instance_id")

                    # Log user-facing agent response to conversation_log
                    try:
                        from supabase import create_client
                        url = os.environ.get("SUPABASE_URL", "")
                        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
                        if url and key and session_workflow_instance_id:
                            supabase = create_client(url, key)
                            supabase.table("conversation_log").insert({
                                "workflow_instance_id": session_workflow_instance_id,
                                "role": "agent",
                                "text": response_text
                            }).execute()
                    except Exception as e:
                        print(f"Error logging agent response: {e}")

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
