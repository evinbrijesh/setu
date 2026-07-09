# CLAUDE.md for Setu Project

## Stack
- **Frontend**: React + Vite + Tailwind CSS (setu-web/, plain .jsx files, no TypeScript)
- **Voice Bridge**: FastAPI WebSocket service (setu-audio/)
- **STT/TTS/LLM**: Sarvam AI (Saaras v3 STT, Sarvam-30B/105B LLM, Bulbul v3 TTS)
- **Orchestration**: Render Workflows (Python SDK, setu-workflows/)
- **Persistence**: Supabase (PostgreSQL + Storage)
- **Configuration**: JSON schemes + Jinja2 PDF templates (schemes/)

## Structure
```
setu-web/          # React + Vite frontend: mic capture, transcript, form preview, run status
  src/
    lib/           # supabase.js (anon client), api.js (REST helpers)
setu-audio/        # FastAPI WebSocket service: audio bridge, STT/TTS, triggers Render workflows
setu-workflows/    # Render Workflow service: 5 chained Python tasks (intake → document_collection → validation → form_generation → notify_user)
  schemes/         # JSON config per government scheme (pm_kisan.json)
  templates/       # Jinja2 HTML templates for PDF rendering (pm_kisan.html)
supabase/          # SQL migrations (001-004)
docs/              # Planning docs: PRD, architecture, tech-stack, user-stories, api-contract, coding-conventions
```

## One-Command Dev Start
- **`make`** — installs deps, runs pipeline test, starts setu-audio + setu-web
- **`just`** — same as make, for `just` users
- **`docker compose up`** — containerized: no Python/Node on host needed
- First-time setup: copy `.env.example → .env` in each service (or root `.env` for Docker), apply Supabase migrations (001-004).
- See `Makefile`, `justfile`, `docker-compose.yml` for details.

## Conventions
### Python (setu-audio, setu-workflows)
- **Style**: PEP 8, enforced via `ruff` (lint + format). Run `ruff check .` and `ruff format .` before commits.
- **Type hints**: Required on every function signature (including Render tasks and FastAPI handlers). Use `from __future__ import annotations` where helpful.
- **Naming**:
  - Modules/files: `snake_case.py`
  - Functions/variables: `snake_case`
  - Classes: `PascalCase`
  - Render task functions: `verb_noun` matching stage name exactly (e.g., `intake_task`, `document_collection_task`) – do not rename casually as task names appear in Render Dashboard.
- **Async**: All I/O-bound code in setu-audio (Supabase calls, Sarvam API, WebSocket handling) is `async`/`await`. However, setu-workflows tasks are **synchronous** by design — Render SDK's task decorator doesn't natively support async execution. The `sarvam_llm.py` module uses `httpx.Client` (sync) for this reason.
- **Error handling**: Never swallow exceptions silently. Caught exceptions in Render tasks should either be re-raised (for retry) or explicitly converted into domain-level results (e.g., `ExtractionResult(complete=False, reason="low_confidence")`) — never both logged and ignored.
- **Config/scheme data**: Load from `schemes/*.json` via a single shared loader function (`scheme_loader.py`); do not read scheme JSON files ad hoc from multiple places.
- **Docstrings**: Every Render task function gets a one-paragraph docstring stating inputs, outputs, and Supabase state read/written.

### React (setu-web)
- **Style**: Prettier (default config). ESLint v9 config needed (`eslint.config.js`).
- **Components**: Functional components only, with hooks. No class components.
- **Naming**:
  - Components: `PascalCase.jsx`
  - Screens: `PascalCase.jsx` (in `src/screens/`)
  - Non-component modules: `camelCase.js`
  - hooks: `useCamelCase.js`
- **State management**: Local component state (`useState`) for UI-only concerns; `App.jsx` holds the screen state machine (`'welcome' | 'chat' | 'complete'`). No external state library. Props flow down from App.
- **Styling**: Tailwind utility classes only (no inline `style={{}}` objects). Design system tokens defined in `tailwind.config.js` (colors, spacing, typography, border radius).
- **Screen routing**: State-based via `ScreenContext` (no react-router-dom). Three screens: WelcomeScreen, ChatScreen, CompletionScreen.
- **WebSocket**: All WS logic lives in `MicButton.jsx` (The Pulse component). Parent passes callbacks for transcript/response/session events.
- **REST API**: `src/lib/api.js` provides `lookupSession()` and `getFormDownloadUrl()` for setu-audio HTTP endpoints.
- **Icons**: Material Symbols (`material-symbols-outlined` Google font). Use `fontVariationSettings: "'FILL' 1"` for filled variants.

### Cross-Cutting
- **Commit messages**: `type(scope): short description` (e.g., `feat(workflows): add validation_task retry policy`).
- **Branch naming**: `feature/<short-desc>`, `fix/<short-desc>`.
- **Environment variables**: Always documented in the relevant `.env.example` file when added.
- **Environment variable reference**:
  - `setu-audio/.env`: `SARVAM_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RENDER_WORKFLOWS_TRIGGER_URL`, `RENDER_API_KEY`, `CORS_ORIGINS` (optional, comma-separated)
  - `setu-workflows/.env`: `SARVAM_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
  - `setu-web/.env`: `VITE_AUDIO_WS_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- **Secrets**: Never commit secrets or keys to code or commit history. .env files are gitignored.
- **Supabase auth**: Frontend uses the anon key with RLS. Backend uses the service-role key (bypasses RLS). The service-role key must never be exposed to the browser.

## Known Gotchas
- **Resumability model**: Render Workflows are capped at 24h with no native scheduling. The system does **not** model "wait 3 days for the user" as a single blocking task. Instead:
  - A `workflow_instances` row in Supabase is the day-spanning logical unit.
  - Each user utterance triggers a **fresh** Render task run with the existing `workflow_instance_id` and `current_stage`.
  - Tasks read existing Supabase state first to resume into the correct stage, not restart from `intake_task`.
  - Result: many short-lived, fully observable Render runs stitched together by the Supabase row.
- **Sync vs async in workflows**: All 5 Render tasks are synchronous. `sarvam_llm.py` uses `httpx.Client` (sync) rather than `AsyncClient`. Do NOT make Render task functions `async def` — the SDK's task decorator doesn't support it.
- **Dependency-skipped fields**: When a field has `depends_on` and the dependency isn't met, the field is stored with sentinel value `"__dependency_skipped__"` in `documents_collected`. The `_get_missing_fields` helper skips these fields on subsequent turns so they aren't re-prompted.
- **Design system source**: The frontend design spec lives in `setu-web/ui_ideas/stitch_setu_voice_government_interface.zip` — contains DESIGN.md, three code.html screens, and screenshots.
- **Do not**:
  - Reintroduce Django/DRF or a hand-rolled state machine (replaced by Render Workflows).
  - Add a Claude API fallback for the reasoning LLM – use Sarvam-30B/105B only.
  - Expose the Supabase service-role key to the frontend (use anon key only in setu-web).
  - Hardcode scheme-specific `if` branches in task functions – use `schemes/*.json` config.
  - Blind-insert into `documents_collected` – always upsert (idempotent retry) due to the unique constraint.
  - Treat low-confidence LLM extraction as a task failure – return a "needs re-ask" signal instead.

## Module Map
- **setu-web/**: React + Vite frontend with 3-screen state machine.
  - `src/screens/WelcomeScreen.jsx` — Landing: hero text, The Pulse mic button, suggestion chips.
  - `src/screens/ChatScreen.jsx` — Split-pane: left 2/3 is live assistant chat, right 1/3 is Application Progress.
  - `src/screens/CompletionScreen.jsx` — Done state: checkmark, download button, "start another" link.
  - `src/components/MicButton.jsx` — The Pulse: WebSocket connection, mic capture, transcript/response routing.
  - `src/components/TopBar.jsx` — Sticky header with branding, nav, language toggle.
  - `src/components/SuggestionChips.jsx` — 4 pill-shaped scheme buttons.
  - `src/components/ChatMessage.jsx` — Message bubble component.
  - `src/components/ProgressPanel.jsx` — Right sidebar: progress bar + field checklist.
  - `src/components/FieldItem.jsx` — Single field row (collected/active/pending states).
  - `src/components/ScreenContext.jsx` — React context for screen routing.
  - `src/lib/supabase.js` — Supabase anon client initialization.
  - `src/lib/api.js` — REST helpers for session lookup + form download.
- **setu-audio/**: WebSocket endpoint (`/ws/audio`), STT (Saaras v3), TTS (Bulbul v3), REST endpoints:
  - `GET /api/session/{user_id}/{scheme_id}` — find existing in_progress instance (204 if none)
  - `GET /api/form/{workflow_instance_id}` — get signed PDF download URL
  - Triggers Render Workflow runs per utterance.
- **setu-workflows/**:
  - `intake_task`: Identifies/confirms scheme intent, creates/resumes `workflow_instances` row.
  - `document_collection_task`: Sync; extracts structured fields via Sarvam LLM, updates `documents_collected`.
  - `validation_task`: Evaluates scheme eligibility rule against collected fields.
  - `form_generation_task`: Renders Jinja2 template → WeasyPrint PDF → Supabase Storage upload.
  - `notify_user_task`: Generates signed URL + confirmation message, marks workflow completed.
  - `sarvam_llm.py`: Sync Sarvam-30B/105B chat completion wrapper for field extraction.
  - `scheme_loader.py`: Shared JSON config loader with cache.
  - `supabase_client.py`: Singleton Supabase admin client (service-role key).
- **schemes/**: JSON files defining scheme fields, prompts, eligibility rules, and PDF template names.
- **supabase/migrations/**:
  - `001_setu_schema.sql` — Core tables: workflow_instances, documents_collected, conversation_log.
  - `002_fix_constraints.sql` — Unique constraint on (workflow_instance_id, field_name).
  - `003_add_pdf_storage.sql` — pdf_storage_path column on workflow_instances.
  - `004_rls_policies.sql` — Row-level security for all tables (anon key access scoped to auth.uid()).
