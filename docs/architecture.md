# Setu — Technical Design Document / Architecture Overview

## 2.1 System Overview

```
User (voice)
   │
   ▼
setu-web (React + Vite)  ──── mic capture, live transcript, form-preview UI, run-status view
   │  WebSocket
   ▼
setu-audio (FastAPI)  ──── audio streaming bridge
   │                          │
   │ Saaras v3 (STT)          │ Bulbul v3 (TTS)
   ▼                          ▲
  transcribed text ───────────┘ synthesized speech
   │
   ▼  triggers a Render task run per turn
setu-workflows (Render Workflow service, Python SDK)
   intake_task → document_collection_task → validation_task → form_generation_task → notify_user_task
   │            (each task calls Sarvam-30B/105B where reasoning is needed)
   ▼
Supabase (Postgres + Storage)
   workflow_instances, documents_collected, conversation_log, generated PDFs
```

## 2.2 Components

**setu-web (frontend)** — React + Vite single-page app. Captures microphone audio and streams over WebSocket, plays back synthesized audio, renders live transcript, form-preview panel reflecting `documents_collected` state, resumed-session indicator, language selector.

**setu-audio (voice bridge service)** — FastAPI WebSocket service. Receives streamed audio chunks from browser, transcodes if needed, calls Saaras v3 for STT, calls Bulbul v3 for TTS, triggers the appropriate Render Workflow task run with the transcribed utterance and `user_id`/`workflow_instance_id`. Holds no business logic — purely an audio bridge plus trigger point.

**setu-workflows (orchestration service)** — Render Workflow service defining five chained tasks:
- `intake_task` — identifies or confirms scheme intent, creates a `workflow_instances` row if none exists.
- `document_collection_task` — calls Sarvam-30B (or 105B for ambiguous/multi-field answers) to extract structured field values, checks the scheme config for what's still missing, and updates `documents_collected`.
- `validation_task` — evaluates the scheme's eligibility rule against collected fields.
- `form_generation_task` — renders a Jinja2 template with collected fields, converts to PDF via WeasyPrint, uploads to Supabase Storage.
- `notify_user_task` — generates a Bulbul v3 spoken confirmation and/or text notification with the download link.

Each task has its own retry policy and timeout, visible in the Render Dashboard.

**Supabase (persistence layer)** — Holds the durable record of the process via three core tables (`workflow_instances`, `documents_collected`, `conversation_log`) plus Storage for generated PDFs.

## 2.3 The Multi-Day Resumability Model

Render task runs cap at 24 hours and do not natively schedule future runs. The system does **not** model "wait 3 days for the user" as a single blocking task. Instead:

- A **workflow instance** (one row in `workflow_instances`) is the logical, day-spanning unit — tracked in Supabase, not in Render execution state.
- Each user interaction triggers a **brand-new Render task run**, passing the existing `workflow_instance_id` and its `current_stage`.
- `document_collection_task` reads existing state from Supabase first, resuming into the correct stage rather than restarting from `intake_task`.
- The result: many short-lived, fully-observable Render runs stitched together by the Supabase row.

This respects the platform's actual constraints and produces a better demo artifact — a visible, growing history of task runs per user process.

## 2.4 Data Model

```sql
create table workflow_instances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  scheme_id text not null,
  current_stage text not null default 'intake',
  status text not null default 'in_progress',
  last_render_run_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table documents_collected (
  id uuid primary key default gen_random_uuid(),
  workflow_instance_id uuid references workflow_instances(id),
  field_name text not null,
  field_value jsonb,
  collected_at timestamptz default now(),
  unique (workflow_instance_id, field_name)
);

create table conversation_log (
  id uuid primary key default gen_random_uuid(),
  workflow_instance_id uuid references workflow_instances(id),
  role text not null,
  text text not null,
  created_at timestamptz default now()
);
```

Scheme definitions (fields, prompts, eligibility rules) live as JSON config files in `setu-workflows/schemes/`, not in the database.

## 2.5 Error Handling and Retry Strategy

- LLM-calling tasks: generous retry counts (transient API flakiness).
- Deterministic tasks (`form_generation_task`): stricter retries (repeated failure = real bug).
- Low-confidence/unparseable LLM extraction → "needs re-ask" signal, not a task retry.
- All failures/retries visible in the Render Dashboard.

## 2.6 Security and Privacy Considerations

- Supabase row-level security scopes reads/writes to the owning user.
- Service-role keys never exposed client-side.
- Generated PDFs use signed, time-limited URLs.
- No document authenticity or identity verification performed (stated clearly in demo).

## 2.7 Scalability Notes

- Render Workflows scale task execution horizontally by design.
- Main latency-sensitive path is the voice round-trip (Saaras → Sarvam LLM → Bulbul), bounded by Sarvam API response time.