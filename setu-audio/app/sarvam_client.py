import asyncio
import base64
import os
import httpx
from dotenv import load_dotenv

load_dotenv()  # reads .env in the current working directory into os.environ

SARVAM_API_KEY = os.environ.get("SARVAM_API_KEY")
SARVAM_BASE_URL = "https://api.sarvam.ai"

if not SARVAM_API_KEY:
    print(
        "⚠️ WARNING: SARVAM_API_KEY is not set. The application will fall back "
        "to browser Web Speech API for transcription, Gemini for LLM, and gTTS for speech synthesis."
    )


async def transcribe_audio(
    audio_bytes: bytes,
    filename: str = "audio.wav",
    language_code: str = "hi-IN",
    mode: str = "codemix",
) -> str:
    """
    Sends audio to Saaras v3 STT REST endpoint, returns transcribed text.

    Fallback: If Sarvam API fails or key is missing, uses Gemini 1.5 Flash (if ENABLE_FALLBACKS=true).
    """
    # 1. Try Sarvam STT first
    if SARVAM_API_KEY:
        try:
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
                if response.status_code == 200:
                    result = response.json()
                    transcript = result.get("transcript", "").strip()
                    if transcript:
                        return transcript
                else:
                    print(f"Sarvam STT returned code {response.status_code}: {response.text}")
        except Exception as e:
            print(f"Sarvam STT connection failed: {e}")

    # 2. Try Gemini STT fallback (only if enabled)
    if os.environ.get("ENABLE_FALLBACKS") == "true":
        gemini_key = os.environ.get("GEMINI_API_KEY")
        if gemini_key:
            print("Trying Gemini STT audio transcription fallback...")
            loop = asyncio.get_event_loop()
            gemini_transcript = await loop.run_in_executor(
                None, _call_gemini_stt_fallback, audio_bytes, gemini_key
            )
            return gemini_transcript

    return ""


def _call_gemini_stt_fallback(audio_bytes: bytes, gemini_key: str) -> str:
    """Call Google AI Studio's Gemini 3.1 Flash-Lite to transcribe inline audio bytes."""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key={gemini_key}"
    
    # Base64 encode the WAV audio bytes for inline multimodal input
    audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
    
    payload = {
        "contents": [{
            "parts": [
                {
                    "inlineData": {
                        "mimeType": "audio/wav",
                        "data": audio_b64
                    }
                },
                {
                    "text": (
                        "Transcribe the spoken audio. Return ONLY the transcribed text "
                        "in the language spoken (Hindi, English or Tamil). Do not add "
                        "any metadata, formatting, or commentary."
                    )
                }
            ]
        }]
    }
    headers = {"Content-Type": "application/json"}
    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(url, headers=headers, json=payload)
            if response.status_code == 200:
                res_json = response.json()
                text = res_json["candidates"][0]["content"]["parts"][0]["text"].strip()
                return text
            else:
                print(f"Gemini STT API error {response.status_code}: {response.text}")
    except Exception as e:
        print(f"Gemini STT fallback connection failed: {e}")
    return ""


async def synthesize_speech(
    text: str,
    target_language_code: str = "hi-IN",
    speaker: str = "shubh",
) -> bytes:
    """
    Sends text to Bulbul v3 TTS REST endpoint, returns decoded WAV audio
    bytes ready to stream/play. Note: Sarvam's REST response wraps audio
    as a base64 string inside an `audios` array.

    Fallback: If Sarvam API fails or key is missing, uses the free gTTS library.
    """
    url = f"{SARVAM_BASE_URL}/text-to-speech"
    headers = {
        "api-subscription-key": SARVAM_API_KEY or "",
        "Content-Type": "application/json",
    }
    payload = {
        "inputs": [text],
        "target_language_code": target_language_code,
        "speaker": speaker,
        "model": "bulbul:v3",
    }

    if not SARVAM_API_KEY and os.environ.get("ENABLE_FALLBACKS") != "true":
        raise RuntimeError("SARVAM_API_KEY is not set and fallbacks are disabled.")

    if SARVAM_API_KEY:
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                if response.status_code == 200:
                    result = response.json()
                    audio_b64 = result["audios"][0]
                    return base64.b64decode(audio_b64)
                else:
                    print(f"Sarvam TTS failed with code {response.status_code}: {response.text}")
        except Exception as e:
            print(f"Sarvam TTS connection failed: {e}")
            if os.environ.get("ENABLE_FALLBACKS") != "true":
                raise e

    # ── gTTS Fallback ──
    if os.environ.get("ENABLE_FALLBACKS") == "true":
        try:
            from gtts import gTTS
            import io
            
            # Convert e.g., "hi-IN" or "ta-IN" to "hi" / "ta"
            lang = target_language_code.split("-")[0]
            tts = gTTS(text=text, lang=lang)
            fp = io.BytesIO()
            tts.write_to_fp(fp)
            fp.seek(0)
            return fp.read()
        except Exception as e:
            print(f"gTTS fallback failed: {e}")
            return b""
    else:
        raise RuntimeError("Sarvam TTS failed and fallbacks are disabled.")
