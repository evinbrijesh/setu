# setu-web Docker image
# =====================
# Multi-stage build: Node.js build → nginx static serve.
#
# Build:
#   docker build -t setu-web -f setu-web/Dockerfile .
#
# Run:
#   docker run --rm -p 80:80 setu-web
#
# Environment variables (build-time ARGS):
#   VITE_AUDIO_WS_URL   — WebSocket URL for setu-audio (default: ws://localhost:8000/ws/audio)
#   VITE_SUPABASE_URL   — Supabase project URL
#   VITE_SUPABASE_ANON_KEY — Supabase anon key
#
# Example build with env vars:
#   docker build -t setu-web \
#     --build-arg VITE_SUPABASE_URL=https://xxx.supabase.co \
#     --build-arg VITE_SUPABASE_ANON_KEY=eyJ... \
#     -f setu-web/Dockerfile .

# ── Stage 1: Build ────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app
COPY setu-web/ .

# Accept build-time env vars that Vite inlines at build time
ARG VITE_AUDIO_WS_URL
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

# Vite inlines VITE_* env vars during the build; if not provided
# as build-args, fall back to defaults or empty strings so the
# .env file values can be read from the copied source.
ENV VITE_AUDIO_WS_URL=${VITE_AUDIO_WS_URL}
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}

RUN npm ci && npm run build

# ── Stage 2: Serve ────────────────────────────────────────────
FROM nginx:alpine

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Minimal nginx config: SPA routing (fallback to index.html)
RUN echo 'server { \
    listen 80; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
