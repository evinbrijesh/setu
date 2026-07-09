# Setu — one-command dev orchestrator
# =====================================
# Prerequisites: python3, node, npm, ffmpeg
# First-time setup: cp .env.example .env in each service (already done if keys exist)
# Usage:
#   make          — install deps + run pipeline test + start all services
#   make install  — install all dependencies
#   make test     — run pipeline test (proves Sarvam + Supabase work)
#   make run      — start setu-audio (background) + setu-web (foreground)
#   make clean    — kill background processes, remove venvs/node_modules

SHELL := /bin/bash

# Colours for output
GREEN  := \033[0;32m
BLUE   := \033[0;34m
YELLOW := \033[1;33m
NC     := \033[0m

.PHONY: help install test run setup clean all

help:
	@echo "$(BLUE)Setu — One-command dev orchestrator$(NC)"
	@echo ""
	@echo "  $(GREEN)make$(NC)           — install deps + run test + start services"
	@echo "  $(GREEN)make install$(NC)   — install Python + Node deps"
	@echo "  $(GREEN)make test$(NC)      — run setu-workflows test_pipeline.py"
	@echo "  $(GREEN)make run$(NC)       — start setu-audio (bg) + setu-web (fg)"
	@echo "  $(GREEN)make clean$(NC)     — stop services, remove venvs/node_modules"
	@echo ""
	@echo "Make sure .env files exist in each service with real keys."
	@echo "Supabase migrations must be applied once (see README Step 1)."

# ── Default target ──────────────────────────────────────────────
all: check-deps install test run

# ── Prerequisite check ──────────────────────────────────────────
check-deps:
	@echo "$(BLUE)[1/4] Checking prerequisites...$(NC)"
	@command -v python3 >/dev/null 2>&1 || { echo "Need python3"; exit 1; }
	@command -v node    >/dev/null 2>&1 || { echo "Need node";    exit 1; }
	@command -v ffmpeg  >/dev/null 2>&1 || { echo "Need ffmpeg";  exit 1; }
	@test -f setu-audio/.env    || { echo "Missing setu-audio/.env";    exit 1; }
	@test -f setu-workflows/.env || { echo "Missing setu-workflows/.env"; exit 1; }
	@test -f setu-web/.env       || { echo "Missing setu-web/.env";       exit 1; }
	@echo "  $(GREEN)OK$(NC)"

# ── Install dependencies ────────────────────────────────────────
install: check-deps
	@echo "$(BLUE)[2/4] Installing Python deps (setu-workflows)...$(NC)"
	cd setu-workflows && \
		( test -d .venv || python3 -m venv .venv ) && \
		source .venv/bin/activate && \
		pip install -q -r requirements.txt
	@echo "$(BLUE)[2/4] Installing Python deps (setu-audio)...$(NC)"
	cd setu-audio && \
		( test -d venv || python3 -m venv venv ) && \
		source venv/bin/activate && \
		pip install -q -r requirements.txt
	@echo "$(BLUE)[2/4] Installing Node deps (setu-web)...$(NC)"
	cd setu-web && test -d node_modules || npm install --silent
	@echo "  $(GREEN)All dependencies installed.$(NC)"

# ── Run pipeline test ───────────────────────────────────────────
test:
	@echo "$(BLUE)[3/4] Running pipeline test...$(NC)"
	cd setu-workflows && \
		source .venv/bin/activate && \
		python test_pipeline.py

# ── Start all services ──────────────────────────────────────────
run:
	@echo "$(BLUE)[4/4] Starting services...$(NC)"
	@echo ""
	@echo "  $(GREEN)setu-audio$(NC) → http://localhost:8000  (WebSocket + REST)"
	@echo "  $(GREEN)setu-web$(NC)   → http://localhost:5173  (React frontend)"
	@echo ""
	@echo "  Press $(YELLOW)Ctrl+C$(NC) to stop both."
	@echo ""
	# Start setu-audio in background
	cd setu-audio && \
		source venv/bin/activate && \
		uvicorn app.main:app --reload --port 8000 &
	# Wait for audio service to be ready
	@sleep 3
	# Start setu-web in foreground (so Ctrl+C stops everything)
	cd setu-web && npm run dev

# ── Clean up ────────────────────────────────────────────────────
clean:
	@echo "$(YELLOW)Cleaning up...$(NC)"
	-pkill -f "uvicorn app.main:app" 2>/dev/null || true
	-pkill -f "vite" 2>/dev/null || true
	rm -rf setu-workflows/.venv setu-audio/venv setu-web/node_modules
	@echo "$(GREEN)Done.$(NC)"
