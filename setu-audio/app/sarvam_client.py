"""
sarvam_client.py — thin wrappers around Sarvam AI's REST STT and TTS
endpoints. Uses the batch/REST endpoints (not WebSocket streaming) for
Phase 1 — simpler to get working first, upgrade to streaming later if
time allows.
"""

import base64
import os
import httpx
from dotenv import load_dotenv

load_dotenv()  # reads .env in the current working directory into os.environ

SARVAM_API_KEY = os.environ.get("SARVAM_API_KEY")
SARVAM_BASE_URL = "https://api.sarvam.ai"

if not SARVAM_API_KEY:
    raise RuntimeError(
        "SARVAM_API_KEY is not set. Check that a .env file with "
        "SARVAM_API_KEY=<your key> exists in the directory you're "
        "running uvicorn from."
    )


async def transcribe_audio(
    audio_bytes: bytes,
    filename: str = "audio.wav",
    language_code: str = "hi-IN",
    mode: str = "codemix",
) -> str:
    """
    Sends audio to Saaras v3 STT REST endpoint, returns transcribed text.

    mode="codemix" is used by default since real Indian speech mixes
    English words in — codemix output is generally easier for the
    downstream LLM extraction step to parse than pure native-script
    transliteration.
    """
    url = f"{SARVAM_BASE_URL}/speech-to-text"
    headers = {"api-subscription-key": SARVAM_API_KEY}
    files = {"file": (filename, audio_bytes, "audio/wav")}
    data = {
        "model": "saaras:v3",
        "language_code": language_code,
        "mode": mode,
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, headers=headers, files=files, data=data)
        response.raise_for_status()
        result = response.json()

    # Field name per Sarvam docs is "transcript" — verify against your
    # actual response the first time you call this, response shapes on
    # young APIs occasionally shift between doc versions.
    return result.get("transcript", "")


async def synthesize_speech(
    text: str,
    target_language_code: str = "hi-IN",
    speaker: str = "shubh",
) -> bytes:
    """
    Sends text to Bulbul v3 TTS REST endpoint, returns decoded WAV audio
    bytes ready to stream/play. Note: Sarvam's REST response wraps audio
    as a base64 string inside an `audios` array (supports batching
    multiple text inputs per request) — always decode, never treat the
    response body as raw audio bytes directly.
    """
    url = f"{SARVAM_BASE_URL}/text-to-speech"
    headers = {
        "api-subscription-key": SARVAM_API_KEY,
        "Content-Type": "application/json",
    }
    payload = {
        "inputs": [text],
        "target_language_code": target_language_code,
        "speaker": speaker,
        "model": "bulbul:v3",
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, headers=headers, json=payload)
        response.raise_for_status()
        result = response.json()

    audio_b64 = result["audios"][0]
    return base64.b64decode(audio_b64)
