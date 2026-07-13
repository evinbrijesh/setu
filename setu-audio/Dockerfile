# setu-audio Docker image
# =======================
# Bundles both setu-audio (FastAPI WebSocket service) and setu-workflows
# (Python task library imported in-process for local dev mode).
#
# Build:
#   docker build -t setu-audio -f setu-audio/Dockerfile .
#
# Run:
#   docker run --rm -p 8000:8000 \
#     -e SARVAM_API_KEY=... \
#     -e SUPABASE_URL=... \
#     -e SUPABASE_SERVICE_ROLE_KEY=... \
#     -e CORS_ORIGINS=http://localhost:5173,http://localhost:4173 \
#     setu-audio

FROM python:3.11-slim

# ── System dependencies ─────────────────────────────────────
# ffmpeg:      audio transcoding (webm → wav for Saaras STT)
# libpango + libcairo + libgdk-pixbuf: WeasyPrint PDF rendering
# shared-mime-info: MIME type detection for storage uploads
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libpango-1.0-0 \
    libcairo2 \
    libgdk-pixbuf-2.0-0 \
    libffi-dev \
    shared-mime-info \
    && rm -rf /var/lib/apt/lists/*

# ── Copy service code ────────────────────────────────────────
WORKDIR /app

# Copy setu-audio (FastAPI WebSocket service)
COPY setu-audio/ /app/setu-audio/

# Copy setu-workflows (imported in-process by setu-audio)
COPY setu-workflows/ /app/setu-workflows/

# ── Install Python deps ──────────────────────────────────────
RUN pip install --no-cache-dir -r /app/setu-audio/requirements.txt \
    && pip install --no-cache-dir -r /app/setu-workflows/requirements.txt

# PYTHONPATH lets setu-audio import setu-workflows.main directly
ENV PYTHONPATH=/app/setu-workflows:$PYTHONPATH
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

# Run from the setu-audio directory so `app.main` module resolves
WORKDIR /app/setu-audio
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
