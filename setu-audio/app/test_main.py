"""
Phase 1 test harness — minimal FastAPI routes to validate the STT and
TTS round trip BEFORE wiring the full WebSocket audio bridge. This is
the fastest way to hit the Phase 1 "done when" bar: confirm Saaras and
Bulbul actually work with real audio before building anything on top.

Test STT:
  curl -X POST http://localhost:8000/test-stt \
    -F "file=@sample_hindi.wav" \
    -F "language_code=hi-IN"

Test TTS:
  curl -X POST http://localhost:8000/test-tts \
    -H "Content-Type: application/json" \
    -d '{"text": "नमस्ते, आपका दिन शुभ हो", "language_code": "hi-IN"}' \
    --output test_output.wav
  # then just play test_output.wav locally to confirm it sounds right
"""

from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import Response
from pydantic import BaseModel

from app.sarvam_client import transcribe_audio, synthesize_speech

app = FastAPI(title="setu-audio (Phase 1 test harness)")


class TTSTestRequest(BaseModel):
    text: str
    language_code: str = "hi-IN"
    speaker: str = "shubh"


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/test-stt")
async def test_stt(
    file: UploadFile = File(...),
    language_code: str = Form("hi-IN"),
    mode: str = Form("codemix"),
):
    audio_bytes = await file.read()
    transcript = await transcribe_audio(
        audio_bytes,
        filename=file.filename,
        language_code=language_code,
        mode=mode,
    )
    return {"transcript": transcript}


@app.post("/test-tts")
async def test_tts(req: TTSTestRequest):
    audio_bytes = await synthesize_speech(
        req.text,
        target_language_code=req.language_code,
        speaker=req.speaker,
    )
    return Response(content=audio_bytes, media_type="audio/wav")
