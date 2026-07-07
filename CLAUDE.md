# CLAUDE.md for Setu Project

## Stack
- **Frontend**: React + Vite (setu-web/)
- **Voice Bridge**: FastAPI WebSocket service (setu-audio/)
- **STT/TTS/LLM**: Sarvam AI (Saaras v3 STT, Sarvam-30B/105B LLM, Bulbul v3 TTS)
- **Orchestration**: Render Workflows (Python SDK, setu-workflows/)
- **Persistence**: Supabase (PostgreSQL + Storage)
- **Configuration**: JSON schemes + Jinja2 PDF templates (schemes/)
- **Documentation**: docs/

## Structure
```
setu-web/          # React + Vite frontend: mic capture, transcript, form preview, run status
setu-audio/        # FastAPI WebSocket service: audio bridge, STT/TTS, triggers Render workflows
setu-workflows/    # Render Workflow service: 5 chained Python tasks (intake → document_collection → validation → form_generation → notify_user)
schemes/           # JSON config per government scheme + Jinja2 PDF templates
docs/              # Planning docs: PRD, architecture, tech-stack, user-stories, api-contract, coding-conventions
```

## Conventions
### Python (setu-audio, setu-workflows)
- **Style**: PEP 8, enforced via `ruff` (lint + format). Run `ruff check .` and `ruff format .` before commits.
- **Type hints**: Required on every function signature (including Render tasks and FastAPI handlers). Use `from __future__ import annotations` where helpful.
- **Naming**:
  - Modules/files: `snake_case.py`
  - Functions/variables: `snake_case`
  - Classes: `PascalCase`
  - Render task functions: `verb_noun` matching stage name exactly (e.g., `intake_task`, `document_collection_task`) – do not rename casually as task names appear in Render Dashboard.
- **Async**: All I/O-bound code (Supabase calls, Sarvam API, WebSocket handling) must be `async`/`await`; avoid blocking calls (no synchronous `requests` inside `async def`).
- **Error handling**: Never swallow exceptions silently. Caught exceptions in Render tasks should either be re-raised (for retry) or explicitly converted into domain-level results (e.g., `ExtractionResult(complete=False, reason="low_confidence")`) – never both logged and ignored.
- **Config/scheme data**: Load from `schemes/*.json` via a single shared loader function; do not read scheme JSON files ad hoc from multiple places.
- **Docstrings**: Every Render task function gets a one-paragraph docstring stating inputs, outputs, and Supabase state read/written.

### TypeScript / React (setu-web)
- **Style**: Prettier (default config) + ESLint with recommended React/TypeScript rule sets.
- **Components**: Functional components only, with hooks. No class components.
- **Naming**:
  - Components: `PascalCase.tsx`
  - Hooks: `useCamelCase.ts`
  - Non-component modules: `camelCase.ts`
- **State management**: Local component state (`useState`) for UI-only concerns; Supabase real-time subscriptions or polling for backend state (`documents_collected`, `workflow_instances.current_stage`) – do not duplicate backend state in a separate client-side store.
- **Styling**: Tailwind utility classes; no inline style objects except for runtime-computed values (e.g., progress-bar width).
- **Typing**: TypeScript strict mode on; define explicit interfaces rather than reaching for `any`.

### Cross-Cutting
- **Commit messages**: `type(scope): short description` (e.g., `feat(workflows): add validation_task retry policy`).
- **Branch naming**: `feature/<short-desc>`, `fix/<short-desc>`.
- **Environment variables**: Always documented in the relevant `.env.example` file when added.
- **Testing priority**: Prioritize testing state-machine transition logic in `document_collection_task` and the resumability path over exhaustive unit coverage elsewhere.
- **Secrets**: Never commit secrets or keys (Sarvam keys, Supabase service-role key, Render API key) to code or commit history.

## Known Gotchas
- **Resumability model**: Render Workflows are capped at 24h with no native scheduling. The system does **not** model "wait 3 days for the user" as a single blocking task. Instead:
  - A `workflow_instances` row in Supabase is the day-spanning logical unit.
  - Each user utterance triggers a **fresh** Render task run with the existing `workflow_instance_id` and `current_stage`.
  - Tasks read existing Supabase state first to resume into the correct stage, not restart from `intake_task`.
  - Result: many short-lived, fully observable Render runs stitched together by the Supabase row.
- **Do not**:
  - Reintroduce Django/DRF or a hand-rolled state machine (replaced by Render Workflows).
  - Add a Claude API fallback for the reasoning LLM – use Sarvam-30B/105B only.
  - Expose the Supabase service-role key to the frontend (use anon key only in setu-web).
  - Hardcode scheme-specific `if` branches in task functions – use `schemes/*.json` config.
  - Blind-insert into `documents_collected` – always upsert (idempotent retry) due to the unique constraint.
  - Treat low-confidence LLM extraction as a task failure – return a "needs re-ask" signal instead.

## Module Map
- **setu-web/**: Frontend UI, microphone capture, WebSocket connection to setu-audio, transcript display, form preview, session status.
- **setu-audio/**: WebSocket endpoint (`/ws/audio`), STT (Saaras v3), TTS (Bulbul v3), REST endpoints for session/form lookup, triggers Render workflow runs.
- **setu-workflows/**: 
  - `intake_task`: Identifies/confirms scheme intent, creates `workflow_instances` row if needed.
  - `document_collection_task`: Extracts structured fields via Sarvam LLM, updates `documents_collected`, checks for missing fields.
  - `validation_task`: Evaluates scheme eligibility rule against collected fields.
  - `form_generation_task`: Renders Jinja2 template with fields, converts to PDF via WeasyPrint, uploads to Supabase Storage.
  - `notify_user_task`: Generates Bulbul v3 spoken confirmation and/or text notification with download link.
- **schemes/**: JSON files defining scheme fields, prompts, eligibility rules (descriptive), and PDF template names.
- **supabase/** (via schema): 
  - `workflow_instances`: Tracks per-user process state (`scheme_id`, `current_stage`, `status`).
  - `documents_collected`: Stores extracted field values per workflow instance (unique per `workflow_instance_id` + `field_name` for idempotent upsert).
  - `conversation_log`: Stores utterance history (`role`, `text`).
  - `storage`: Holds generated PDFs (accessed via signed URLs).