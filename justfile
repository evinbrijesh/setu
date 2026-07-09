# Setu — one-command dev orchestrator (for `just` users)
# ======================================================
# Usage:
#   just          — install deps + run test + start all services
#   just install  — install all deps
#   just test     — run pipeline test
#   just run      — start all services
#   just clean    — kill processes, remove venvs/node_modules

# ── Default: full flow ──────────────────────────────────────────
default: check-deps install test run

# ── Check prerequisites ────────────────────────────────────────
check-deps:
    @echo "Checking prerequisites..."
    @which python3 || (echo "Need python3" && exit 1)
    @which node    || (echo "Need node"    && exit 1)
    @which ffmpeg  || (echo "Need ffmpeg"  && exit 1)
    @test -f setu-audio/.env    || (echo "Missing setu-audio/.env"    && exit 1)
    @test -f setu-workflows/.env || (echo "Missing setu-workflows/.env" && exit 1)
    @test -f setu-web/.env       || (echo "Missing setu-web/.env"       && exit 1)
    @echo "  OK"

# ── Install dependencies ────────────────────────────────────────
install: check-deps
    @echo "Installing deps..."
    cd setu-workflows && (test -d .venv || python3 -m venv .venv) && source .venv/bin/activate && pip install -q -r requirements.txt
    cd setu-audio && (test -d venv || python3 -m venv venv) && source venv/bin/activate && pip install -q -r requirements.txt
    cd setu-web && (test -d node_modules || npm install --silent)
    @echo "  All deps installed."

# ── Run pipeline test ───────────────────────────────────────────
test:
    @echo "Running pipeline test..."
    cd setu-workflows && source .venv/bin/activate && python test_pipeline.py

# ── Start all services ──────────────────────────────────────────
run:
    @echo "Starting setu-audio on :8000 ..."
    cd setu-audio && source venv/bin/activate && uvicorn app.main:app --reload --port 8000 &
    @sleep 3
    @echo "Starting setu-web on :5173 ..."
    @echo "Press Ctrl+C to stop both."
    cd setu-web && npm run dev

# ── Clean up ────────────────────────────────────────────────────
clean:
    -pkill -f "uvicorn app.main:app" 2>/dev/null || true
    -pkill -f "vite" 2>/dev/null || true
    rm -rf setu-workflows/.venv setu-audio/venv setu-web/node_modules
    @echo "Cleaned."
