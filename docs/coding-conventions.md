# Setu — Coding Conventions & Style Guide

## 6.1 Python (`setu-audio`, `setu-workflows`)

- **Style:** PEP 8, enforced via `ruff` (lint + format). Run `ruff check .` and `ruff format .` before every commit.
- **Type hints:** required on every function signature, including Render task functions and FastAPI route handlers. Use `from __future__ import annotations` where helpful.
- **Naming:**
  - Modules/files: `snake_case.py`
  - Functions/variables: `snake_case`
  - Classes: `PascalCase`
  - Render task functions: verb_noun pattern matching the stage name exactly (`intake_task`, `document_collection_task`) — do not rename casually, as task names appear in the Render Dashboard.
- **Async:** all I/O-bound code (Supabase calls, Sarvam API, WebSocket handling) should be `async`/`await`; avoid blocking calls (no synchronous `requests` inside `async def`).
- **Error handling:** never swallow exceptions silently. Caught exceptions in Render tasks should either be re-raised (for retry) or explicitly converted into domain-level results (e.g., `ExtractionResult(complete=False, reason="low_confidence")`) — never both logged-and-ignored.
- **Config/scheme data:** loaded from `schemes/*.json` via a single shared loader function — do not read scheme JSON files ad hoc from multiple places.
- **Docstrings:** every Render task function gets a one-paragraph docstring stating its inputs, outputs, and what Supabase state it reads/writes.

## 6.2 TypeScript / React (`setu-web`)

- **Style:** Prettier (default config) + ESLint with recommended React/TypeScript rule sets.
- **Components:** functional components only, with hooks. No class components.
- **Naming:**
  - Components: `PascalCase.tsx`
  - Hooks: `useCamelCase.ts`
  - Non-component modules: `camelCase.ts`
- **State management:** local component state (`useState`) for UI-only concerns; Supabase real-time subscriptions or polling for backend state (`documents_collected`, `workflow_instances.current_stage`) — do not duplicate backend state in a separate client-side store.
- **Styling:** Tailwind utility classes; no inline style objects except for runtime-computed values (e.g., progress-bar width).
- **No `any`:** TypeScript strict mode on; define explicit interfaces rather than reaching for `any`.

## 6.3 Cross-Cutting Conventions

- **Commit messages:** `type(scope): short description` — e.g., `feat(workflows): add validation_task retry policy`.
- **Branch naming:** `feature/<short-desc>`, `fix/<short-desc>`.
- **Environment variables:** always documented in the relevant `.env.example` file when added.
- **Testing priority:** prioritize testing state-machine transition logic in `document_collection_task` and the resumability path over exhaustive unit coverage elsewhere.
- **No secrets in code or commit history** — Sarvam keys, Supabase service-role keys, and Render API keys equally.