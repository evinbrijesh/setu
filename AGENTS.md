# Setu — Agent Instructions

## Project
Voice-first AI agent helping Indian citizens navigate government bureaucracy
(certificates, welfare schemes) using Sarvam AI (STT/LLM/TTS) + Render Workflows + Supabase.
Hackathon: Sarvam Track + Render Workflows Track.

## Architecture Summary
```
User voice → setu-web (React/Vite) → setu-audio (FastAPI, voice bridge)
  ─ Saaras v3 STT → Sarvam-30B/105B LLM → Bulbul v3 TTS ─
  → triggers Render Workflow task run (setu-workflows/Python)
  → intake_task → document_collection_task → validation_task
    → form_generation_task → notify_user_task
  → Supabase (workflow_instances, documents_collected, conversation_log, PDFs)
```

## Repo Structure
- `setu-web/` — React + Vite frontend (mic capture, transcript, form preview)
- `setu-audio/` — FastAPI WebSocket service (audio bridge, no business logic)
- `setu-workflows/` — Render Workflow service (Python SDK, 5 chained task functions)
- `schemes/` — JSON config per government scheme + Jinja2 PDF templates
- `docs/` — planning docs (PRD, architecture, tech-stack, user-stories, api-contract, coding-conventions)

## The Resumability Model (Section 2.3 of architecture.md)
Render runs cap at 24h with no native scheduling. **Not** modeled as one long task.

- `workflow_instances` row in Supabase is the day-spanning record.
- Each new user utterance triggers a **fresh** Render task run with existing
  `workflow_instance_id` + `current_stage`.
- Tasks read existing Supabase state first — they resume, not restart.
- Result: many short-lived Render runs stitched by the Supabase row.

## Environment Variables
| Service | Variables |
|---|---|
| `setu-audio/.env` | `SARVAM_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RENDER_WORKFLOWS_TRIGGER_URL`, `RENDER_API_KEY` |
| `setu-workflows/.env` | `SARVAM_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| `setu-web/.env` | `VITE_AUDIO_WS_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |

Never commit real values. Never use service-role key in setu-web (anon key only).

## What NOT to Do
- Do not reintroduce Django/DRF or a hand-rolled state machine — replaced by Render Workflows.
- Do not add a Claude API fallback for the reasoning LLM — Sarvam-30B/105B only.
- Do not expose the Supabase service-role key to the frontend.
- Do not hardcode scheme-specific `if` branches in task functions — use `schemes/*.json` config.
- Do not blind-insert into `documents_collected` — always upsert (idempotent retry).
- Do not treat low-confidence LLM extraction as a task failure — return "needs re-ask" signal instead.
