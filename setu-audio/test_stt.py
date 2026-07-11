import asyncio
import os
import sys

# Add setu-audio paths
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.sarvam_client import transcribe_audio

async def main():
    audio_path = os.path.join(os.path.dirname(__file__), "test.wav")
    with open(audio_path, "rb") as f:
        audio_bytes = f.read()
    
    print(f"Reading test.wav ({len(audio_bytes)} bytes)")
    transcript = await transcribe_audio(audio_bytes, filename="test.wav", language_code="hi-IN")
    print(f"Transcript response: '{transcript}'")

if __name__ == "__main__":
    asyncio.run(main())
