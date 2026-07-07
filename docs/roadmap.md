### Voice-First AI Agent for Government Bureaucracy (Sarvam Track + Render Workflows Track)

---

## 1. Success Criteria

Before writing any code, these are the bars the finished project must clear. Every phase below exists to satisfy one or more of these.

**Functional criteria**
- A user can speak naturally in Hindi, Tamil, or Hinglish and be understood without typing anything.
- The agent can identify intent, ask for missing information one item at a time, and know when it has everything it needs.
- A user can stop mid-process and resume — hours or days later — without repeating already-given information.
- The end result of a completed process is a real, downloadable, filled document (PDF), not just a chat summary.

**Technical criteria**
- Voice pipeline (Saaras v3 → Sarvam-30B/105B → Bulbul v3) runs end-to-end with acceptable latency (~2–3s per turn).
- Every multi-step process (intake → collection → validation → generation → notify) runs as independently retryable, observable Render Workflow tasks — not as a single monolithic function.
- The "resumable across days" property is achieved without any single task run blocking for that long (Render tasks cap at 24 hours and don't natively schedule future runs) — state lives in Supabase, execution happens per-turn.
- Adding a second government scheme requires only a new config file and template, no new orchestration code.

**Demo/judging criteria**
- The Sarvam integration must be visibly core to the UX (a real voice conversation), not a token API call.
- The Render Workflows integration must be visibly core to the architecture (a real execution graph with multiple stages), not a single wrapped function — the dashboard's run history must be shown, not just claimed.
- One scheme must be fully polished end-to-end rather than several built shallowly.
- The full demo must fit under ~3 minutes and survive a live network hiccup without falling apart.

If a build decision doesn't serve one of the above, it's out of scope for this version.

---

## 2. Final Architecture

```
User (voice) 
  → setu-audio (FastAPI, WebSocket)
      → Saaras v3 (STT)
      → Sarvam-30B / Sarvam-105B (extraction + reasoning)
      → Bulbul v3 (TTS)
  → triggers → setu-workflows (Render Workflow service)
      intake_task → document_collection_task → validation_task 
      → form_generation_task → notify_user_task
  → reads/writes → Supabase (Postgres + Storage)
      workflow_instances, documents_collected, conversation_log
  ← setu-web (React + Vite): mic UI, live transcript, form preview, run status
```

**Why this shape:** the audio service and Sarvam calls handle *understanding*; Render Workflows handles *doing the work reliably and observably*; Supabase holds the *durable record* that lets a logical process outlive any single task run. No component does more than one job.

---

## 3. Roadmap

### Phase 0 — Foundations
**Goal:** every account, key, and empty project exists before any logic is written.

1. Create a Supabase project; note the URL and API keys.
2. Get a Sarvam API key; confirm access to Saaras v3, Bulbul v3, and Sarvam-30B/105B.
3. Create a Render account, install the Render CLI, and deploy the "hello world" example from **Your First Workflow** in the docs.
4. Scaffold three repos:
   - `setu-workflows/` — Render Workflow service (Python SDK)
   - `setu-audio/` — FastAPI WebSocket service for voice I/O
   - `setu-web/` — React + Vite frontend
5. Connect `setu-workflows/` to GitHub (Render Workflow services deploy from a connected repo).

**Done when:** a trivial task triggers and completes, visible in the Render Dashboard.

---

### Phase 1 — Voice pipeline
**Goal:** prove the highest-risk piece works before building anything on top of it.

1. Build `/ws/audio` in `setu-audio/`: accept streamed browser mic audio, transcode if needed (webm/opus → Saaras's expected format via `ffmpeg`).
2. Call **Saaras v3** with the right `language_code`, testing Hindi, Tamil, and Hinglish input.
3. Call **Bulbul v3** (e.g. `speaker="anushka"`) to synthesize a response and stream it back.
4. Build a minimal React page: mic button, plays back whatever audio returns.

**Done when:** speaking into the browser mic produces a spoken (even if hardcoded) response, full round-trip.

---

### Phase 2 — Render Workflow tasks
**Goal:** replace the idea of a "chatbot" with a real, chained, durable task pipeline.

1. Define each stage as a decorated task in `setu-workflows/`:

```python
from render_workflows import task

@task
def intake_task(user_id: str, raw_utterance: str, scheme_id: str | None):
    ...

@task
def document_collection_task(workflow_instance_id: str, latest_utterance: str | None):
    ...

@task
def validation_task(workflow_instance_id: str):
    ...

@task
def form_generation_task(workflow_instance_id: str):
    ...

@task
def notify_user_task(workflow_instance_id: str, channel: str):
    ...
```

2. Chain them by function call inside a top-level task:

```python
@task
def run_setu_turn(user_id: str, raw_utterance: str):
    instance = intake_task(user_id, raw_utterance, scheme_id=None)
    result = document_collection_task(instance.id, raw_utterance)
    if result.complete:
        validation_task(instance.id)
        form_generation_task(instance.id)
        notify_user_task(instance.id, channel="voice")
    return result
```

3. Set per-task retry policy and timeout — generous for LLM-calling tasks, strict for deterministic ones like PDF rendering.
4. Trigger `run_setu_turn` from `setu-audio/` every time a transcribed utterance arrives.

**Done when:** manually triggering `run_setu_turn` with a fake utterance shows each sub-task completing in the Render Dashboard.

---

### Phase 3 — Sarvam LLM integration
**Goal:** turn raw transcribed speech into structured field data reliably.

1. Inside `document_collection_task`, call **Sarvam-30B** with a narrow extraction prompt: given the current missing field, its type, and the raw utterance, return strict JSON with the value or a "couldn't understand" flag.
2. On low confidence or a parse failure, return a "needs re-ask" signal rather than guessing — the next turn's prompt should rephrase the question.
3. Use **Sarvam-105B** specifically where a single utterance may answer multiple fields at once or needs agentic reasoning — its stronger tool-use/agentic benchmark performance is suited to that case; keep 30B as the default for latency.
4. Log every extraction attempt (success or failure) to `conversation_log`.

**Done when:** a real spoken utterance flows through Saaras → Sarvam extraction → a correctly updated field in Supabase.

---

### Phase 4 — Multi-session resumability
**Goal:** this is the single most important feature in the whole project — dedicate real, deliberate time here.

1. Supabase schema:

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
  collected_at timestamptz default now()
);

create table conversation_log (
  id uuid primary key default gen_random_uuid(),
  workflow_instance_id uuid references workflow_instances(id),
  role text not null,
  text text not null,
  created_at timestamptz default now()
);
```

2. Before triggering `run_setu_turn`, look up an `in_progress` `workflow_instances` row for that user + scheme. If found, pass its `id` and `current_stage` in so processing resumes into `document_collection_task` rather than restarting `intake_task`.
3. Generate a recap prompt from existing `documents_collected` rows: *"You told me you own 1.5 acres. Is your bank account linked to Aadhaar?"*
4. Test explicitly: trigger once, wait, trigger again with new information, and confirm the second trigger resumes correctly rather than starting over.

**Done when:** two time-gapped triggers for the same user form one continuous logical process — one `workflow_instances` row, multiple separate Render task runs.

---

### Phase 5 — Validation, form generation, notification
**Goal:** produce the tangible artifact that makes this a completed task, not just a conversation.

1. `validation_task`: check `documents_collected` against a scheme's eligibility rule. Keep this an explicit, hardcoded-per-scheme check rather than a generic expression evaluator.
2. `form_generation_task`: render a Jinja2 HTML template with the collected fields, convert to PDF with WeasyPrint, upload to Supabase Storage, write the URL back to `workflow_instances`.
3. `notify_user_task`: generate a short Bulbul v3 spoken confirmation and/or a text message with the download link.
4. Each of these being a separate Render task means transient failures (a storage hiccup, a large-PDF render timeout) retry automatically without custom retry code.

**Done when:** completing a full flow produces a real downloadable, correctly-filled PDF, and the Render Dashboard shows the complete task chain for that run.

---

### Phase 6 — Frontend and observability
**Goal:** make the architecture's strengths visible to someone watching, not just provable to yourself.

1. Mic button, live transcript, and a form-preview panel that fills in live as fields are collected.
2. A "resumed session" banner when an existing instance is found.
3. Surface the Render task execution status in your own UI (or have the Render Dashboard open and ready) — this is explicitly judged evidence for one of your two tracks, so it must be shown, not just described.
4. A language selector for at least two languages to make the multilingual layer explicit.

**Done when:** someone unfamiliar with the project can watch a short demo and understand both what happened in the conversation and what happened in the underlying task pipeline.

---

### Phase 7 — Second scheme (only if time remains)
**Goal:** prove the architecture generalizes, without risking the first scheme's polish.

1. Add a second scheme config (JSON) with its own fields and eligibility rule.
2. Confirm `intake_task` and `document_collection_task` require zero code changes — only a new config and PDF template.

**Done when:** switching schemes is a dropdown selection, not a redeploy. Skip this phase entirely if it threatens Phase 4 or 8 polish.

---

### Phase 8 — Demo rehearsal
**Goal:** a flawless, rehearsed 3 minutes beats a broader but fragile build.

1. Rehearse the full flow at least three times, including a deliberate multi-turn gap to demonstrate resumability.
2. Have the Render Dashboard open and ready to show task run history at the exact moment you claim "durable and observable."
3. Prepare answers for the two most likely questions: "What happens if a Sarvam API call times out mid-task?" (point to automatic per-task retries) and "How is this different from a chatbot with a database?" (point to the per-stage execution graph, not the transcript).
4. Keep the full run under 3 minutes.

---

## 4. Timeline

| Day | Focus |
|---|---|
| Day 0 | Phase 0 — accounts, first Render Workflow deploy |
| Day 1 | Phase 1 + Phase 2 — voice round-trip working, Render tasks defined and chained |
| Day 2 | Phase 3 + Phase 4 — Sarvam extraction wired in, resumability proven across separate triggers |
| Day 3 | Phase 5 + Phase 6 — validation/PDF generation, frontend + dashboard visibility |
| Day 4 | Phase 7 (only if ahead of schedule) + Phase 8 — rehearsal, contingency prep |

If time is short: cut Phase 7 first. Resumability (Phase 4) and a clean, dashboard-backed demo (Phase 8) matter more to a dual-track judging panel than scheme breadth.
