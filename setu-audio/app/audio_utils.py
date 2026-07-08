"""
audio_utils.py — transcodes browser-recorded audio (typically webm/opus)
into a format Saaras v3 accepts reliably (16kHz mono WAV).

Requires ffmpeg installed on the system (`sudo apt install ffmpeg` on
most Linux distros, `brew install ffmpeg` on macOS).
"""

import asyncio


async def transcode_to_wav(input_bytes: bytes) -> bytes:
    """
    Pipes input_bytes (assumed webm/opus from browser MediaRecorder)
    through ffmpeg, converting to 16kHz mono WAV — the format Saaras
    works best with. Runs ffmpeg as a subprocess with stdin/stdout pipes
    so nothing touches disk.
    """
    process = await asyncio.create_subprocess_exec(
        "ffmpeg",
        "-i",
        "pipe:0",  # read input from stdin
        "-ar",
        "16000",  # resample to 16kHz
        "-ac",
        "1",  # mono
        "-f",
        "wav",  # output format
        "pipe:1",  # write output to stdout
        "-loglevel",
        "error",  # suppress ffmpeg's normal chatter
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )

    stdout, stderr = await process.communicate(input=input_bytes)

    if process.returncode != 0:
        raise RuntimeError(f"ffmpeg transcoding failed: {stderr.decode(errors='ignore')}")

    return stdout
