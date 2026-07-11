# CLAUDE.md for Setu Project

## What Setu Does

Setu is a voice-first AI agent that helps Indian citizens navigate government bureaucracy — certificates, welfare schemes, identity documents — by speaking in their own language. The user speaks naturally, Setu guides them through a multi-step application process conversationally, tracks progress durably across days, and produces a real, submission-ready filled PDF at the end.

## Stack
- **Frontend**: React + Vite + Tailwind CSS (setu-web/, plain .jsx files, no TypeScript)
- **Voice Bridge**: FastAPI WebSocket service (setu-audio/)
- **STT/TTS/LLM**: Sarvam AI (Saaras v3 STT, Sarvam-30B/105B LLM, Bulbul v3 TTS)
- **Orchestration**: Render Workflows (Python SDK, setu-workflows/)
- **Persistence**: Supabase (PostgreSQL + Storage)
- **PDF Generation**: WeasyPrint + Jinja2 templates
- **Configuration**: JSON scheme configs + Jinja2 PDF templates (setu-workflows/schemes/)

## Structure
```
setu-web/          # React + Vite frontend: mic capture, transcript, form preview, run status
  src/
    hooks/         # Custom hooks (useAudioLevel.js — real-time mic amplitude for reactive UI)
    lib/           # supabase.js (anon client), api.js (REST helpers)
setu-audio/        # FastAPI WebSocket service: audio bridge, STT/TTS, triggers Render workflows
setu-workflows/    # Render Workflow service: 5 chained Python tasks (intake → document_collection → validation → form_generation → notify_user)
  schemes/         # JSON config per government scheme (pm_kisan.json)
  templates/       # Jinja2 HTML templates for PDF rendering (pm_kisan.html)
supabase/          # SQL migrations (001-004)
docs/              # Planning docs + ADRs: PRD, architecture, tech-stack, user-stories, api-contract, coding-conventions
```

## One-Command Dev Start
- **`make`** — installs deps, runs pipeline test, starts setu-audio + setu-web
- **`just`** — same as make, for `just` users
- **`docker compose up`** — containerized: no Python/Node on host needed
- First-time setup: copy `.env.example → .env` in each service (or root `.env` for Docker), apply Supabase migrations (001-004).
- See `Makefile`, `justfile`, `docker-compose.yml` for details.

## Schemes & Documents

Setu helps citizens complete **government scheme applications and certificate requests**. Each scheme is fully config-driven — adding a new one requires only a JSON config file + PDF template, zero new orchestration code.

### Currently Supported

| Scheme ID | Display Name | What It Does | Fields Collected |
|-----------|-------------|-------------|-----------------|
| `pm_kisan` | PM Kisan Samman Nidhi | Income support for farmers (₹6,000/year) | owns_land, land_size_acres, has_aadhaar_linked_bank, district, full_name |

**Eligibility rule (pm_kisan):** owns agricultural land, land ≤ 2 acres, bank linked to Aadhaar.

### Planned / Stretch Schemes (Phase 7+)
These are documented in `docs/roadmap.md` and `docs/user-stories.md` but not yet implemented:
- **Caste certificate** — community/category verification for reserved-category benefits
- **Income certificate** — annual income declaration for means-tested schemes
- **Domicile certificate** — state residency proof for state-specific schemes
- **Ration card** — household food-subsidy entitlement
- **Ayushman Bharat (PMJAY)** — health insurance for Below Poverty Line families

To add a new scheme:
1. Create `setu-workflows/schemes/<scheme_id>.json` with fields, prompts, eligibility rule, and PDF template name.
2. Create `setu-workflows/templates/<template>.html` — Jinja2 template for the filled form.
3. Add a `<scheme_id>` key to `intake_task._infer_scheme()` keyword map in `setu-workflows/tasks/intake.py`.
4. Add a chip to `setu-web/src/components/SuggestionChips.jsx`.
5. No changes to any task function or orchestration code.

## Language Support

Setu is multilingual by design — the voice pipeline (Saaras v3 STT → Sarvam LLM → Bulbul v3 TTS) supports code-mixed Indian speech natively.

### Supported Languages

| Code | Language | Notes |
|------|----------|-------|
| `hi-IN` | Hindi | Default. Full support across STT, LLM, TTS. |
| `ta-IN` | Tamil | Supported by Saaras v3 and Bulbul v3. |
| `en` | English | LLM handles extraction; STT/TTS support varies. |

**Hinglish** (Hindi-English code-mix) is supported natively via Saaras v3's `codemix` mode — no special config needed. The STT outputs Roman-script mixed text that the Sarvam LLM handles well.

### How Language Flows Through the System
1. User selects language in `TopBar.jsx` → stored as `language` state in `App.jsx`.
2. Language code is passed to `MicButton` → sent as `language_code` in the WebSocket `start_session` message.
3. `setu-audio` passes `language_code` to `transcribe_audio()` (Saaras v3 STT) and `synthesize_speech()` (Bulbul v3 TTS).
4. The LLM extraction step (`sarvam_llm.py`) is language-agnostic — it receives transcribed text in whatever script Saaras outputs.
5. Scheme prompts in `schemes/*.json` are currently English; the LLM translates them to the user's language at extraction time.

### Adding a New Language
1. Verify the language code is supported by Saaras v3 STT and Bulbul v3 TTS (check Sarvam docs).
2. Add the language code + display label to `TopBar.jsx` `LanguageButton.labels` map.
3. No backend changes needed — the language code is passed through dynamically.

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
  - hooks: `useCamelCase.js` (in `src/hooks/`)
- **State management**: Local component state (`useState`) for UI-only concerns; `App.jsx` holds the screen state machine (`'welcome' | 'chat' | 'complete'`). No external state library. Props flow down from App.
- **Styling**: Tailwind utility classes only (no inline `style={{}}` objects except for runtime-computed values like audio-reactive ring scale/opacity). Design system tokens defined in `tailwind.config.js` (colors, spacing, typography, border radius, keyframes).
- **Screen routing**: State-based via `ScreenContext` (no react-router-dom). Three screens: WelcomeScreen, ChatScreen, CompletionScreen.
- **WebSocket**: All WS logic lives in `MicButton.jsx` (The Pulse component). Parent passes callbacks for transcript/response/session events.
- **Audio visualization**: `useAudioLevel` hook uses Web Audio API (`AnalyserNode`) to return real-time mic amplitude (0–1). Used by MicButton to drive reactive ring scale/opacity. The MediaStream is created on mic open, passed to the hook, and cleaned up on mic close.
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
  - `src/components/MicButton.jsx` — The Pulse: WebSocket connection, mic capture, reactive audio-level rings, transcript/response routing.
  - `src/components/TopBar.jsx` — Sticky header with branding, nav, language toggle (hi-IN / ta-IN / en).
  - `src/components/SuggestionChips.jsx` — Pill-shaped scheme buttons (currently: PM Kisan).
  - `src/components/ChatMessage.jsx` — Message bubble component.
  - `src/components/ProgressPanel.jsx` — Right sidebar: progress bar + field checklist.
  - `src/components/FieldItem.jsx` — Single field row (collected/active/pending states).
  - `src/components/ScreenContext.jsx` — React context for screen routing (no react-router-dom).
  - `src/components/ErrorBoundary.jsx` — React error boundary for crash recovery.
  - `src/hooks/useAudioLevel.js` — Web Audio API hook: real-time mic amplitude (0–1) via AnalyserNode, drives reactive ring animation.
  - `src/lib/supabase.js` — Supabase anon client initialization.
  - `src/lib/api.js` — REST helpers for session lookup + form download.
- **setu-audio/**: WebSocket endpoint (`/ws/audio`), STT (Saaras v3), TTS (Bulbul v3), REST endpoints:
  - `app/main.py` — FastAPI app: WebSocket handler, REST endpoints, CORS config.
  - `app/sarvam_client.py` — Async wrappers for Saaras v3 STT and Bulbul v3 TTS (batch REST, not streaming).
  - `app/audio_utils.py` — ffmpeg transcoding (webm → 16kHz mono WAV via subprocess pipes).
  - `app/workflow_trigger.py` — Routes to Render API (production) or direct Python import (local dev).
  - `app/test_main.py` — Smoke tests for the WebSocket + REST endpoints.
  - `GET /api/session/{user_id}/{scheme_id}` — find existing in_progress instance (204 if none).
  - `GET /api/form/{workflow_instance_id}` — get signed PDF download URL.
  - Triggers Render Workflow runs per utterance.
- **setu-workflows/**:
  - `main.py` — Orchestrator: chains intake → document_collection → validation → form_generation → notify. Entry point for Render Workflow worker.
  - `tasks/intake.py` — `intake_task`: identifies/confirms scheme intent, creates/resumes `workflow_instances` row.
  - `tasks/document_collection.py` — `document_collection_task`: extracts structured fields via Sarvam LLM, updates `documents_collected`. Handles dependency-skipped fields, resume recap prompts.
  - `tasks/validation.py` — `validation_task`: evaluates scheme eligibility rule against collected fields.
  - `tasks/form_generation.py` — `form_generation_task`: renders Jinja2 template → WeasyPrint PDF → Supabase Storage upload.
  - `tasks/notify.py` — `notify_user_task`: generates signed URL + confirmation message, marks workflow completed.
  - `sarvam_llm.py` — Sync Sarvam-30B/105B chat completion wrapper for field extraction (uses `httpx.Client`, not async).
  - `scheme_loader.py` — Shared JSON config loader with in-memory cache.
  - `supabase_client.py` — Singleton Supabase admin client (service-role key).
  - `test_pipeline.py` — End-to-end pipeline test (runs without server, calls task functions directly).
- **setu-workflows/schemes/**: JSON files defining scheme fields, prompts, eligibility rules, and PDF template names.
  - `pm_kisan.json` — PM Kisan Samman Nidhi: 5 fields (owns_land, land_size_acres, has_aadhaar_linked_bank, district, full_name).
- **setu-workflows/templates/**: Jinja2 HTML templates for PDF rendering.
  - `pm_kisan.html` — PM Kisan application form template.
- **supabase/migrations/**:
  - `001_setu_schema.sql` — Core tables: workflow_instances, documents_collected, conversation_log.
  - `002_fix_constraints.sql` — Unique constraint on (workflow_instance_id, field_name).
  - `003_add_pdf_storage.sql` — pdf_storage_path column on workflow_instances.
  - `004_rls_policies.sql` — Row-level security for all tables (anon key access scoped to auth.uid()).
- **docs/**:
  - `prd.md` — Product requirements: problem statement, goals, non-goals, target users, success metrics.
  - `architecture.md` — Technical design: system overview, resumability model, data model, error handling, security.
  - `api-contract.md` — WebSocket contract, REST endpoints, task signatures, DB schema, scheme config schema.
  - `coding-conventions.md` — Style guide for Python, TypeScript/React, cross-cutting conventions.
  - `roadmap.md` — 8-phase build plan with success criteria and timeline.
  - `user-stories.md` — User stories for each workflow stage.
  - `tech-stack-decisions.md` — Rationale for each tech choice.
  - `abstract.md` — Project abstract / summary.
  - `adr/` — Architecture Decision Records (6 ADRs covering Sarvam, Render, Supabase, resumability, monorepo, config-driven schemes).
