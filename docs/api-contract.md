# Setu — API Contract / Schema Design

## 7.1 `setu-audio` — WebSocket Contract

**Endpoint:** `wss://<host>/ws/audio`

**Client → Server (binary frames):** raw audio chunks (webm/opus), ~250ms recommended.

**Client → Server (control, JSON text frame):**
```json
{ "type": "start_session", "user_id": "uuid", "language_code": "hi-IN" }
```
```json
{ "type": "end_utterance" }
```

**Server → Client (JSON text frame):**
```json
{ "type": "transcript", "text": "मुझे जाति प्रमाण पत्र चाहिए", "is_final": true }
```
```json
{ "type": "agent_response_text", "text": "आपको कौन से जिले का प्रमाण पत्र चाहिए?" }
```
```json
{ "type": "session_state", "workflow_instance_id": "uuid", "current_stage": "document_collection", "collected_fields": { "district": "Lucknow" }, "resumed": true }
```

**Server → Client (binary frames):** synthesized audio (Bulbul output), streamed as generated.

## 7.2 `setu-audio` — REST Endpoints

**`GET /api/session/{user_id}/{scheme_id}` — Look up existing `in_progress` workflow instance.**

Response (200):
```json
{ "workflow_instance_id": "uuid", "current_stage": "document_collection", "collected_fields": { "district": "Lucknow", "owns_land": true }, "status": "in_progress" }
```
If none exists: `204 No Content`.

**`GET /api/form/{workflow_instance_id}` — Get signed download URL for generated PDF.**

Response:
```json
{ "status": "ready", "download_url": "https://<supabase-storage-signed-url>", "expires_at": "2026-07-10T12:00:00Z" }
```
If not yet generated: `{ "status": "pending" }`.

## 7.3 `setu-workflows` — Render Task Signatures

```python
def intake_task(user_id: str, raw_utterance: str, scheme_id: str | None) -> WorkflowInstanceRef:
    """Returns: { id: str, scheme_id: str, current_stage: str }"""

def document_collection_task(workflow_instance_id: str, latest_utterance: str | None) -> CollectionResult:
    """Returns: { complete: bool, missing_fields: list[str], needs_reask: bool, reask_prompt: str | None }"""

def validation_task(workflow_instance_id: str) -> ValidationResult:
    """Returns: { eligible: bool, failed_reasons: list[str] }"""

def form_generation_task(workflow_instance_id: str) -> FormResult:
    """Returns: { pdf_storage_path: str }"""

def notify_user_task(workflow_instance_id: str, channel: str) -> NotifyResult:
    """Returns: { notified: bool, channel_used: str }"""

def run_setu_turn(user_id: str, raw_utterance: str) -> CollectionResult:
    """Top-level chained task triggered by setu-audio per user utterance."""
```

## 7.4 Database Schema (authoritative)

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
  unique (workflow_instance_id, field_name)  -- idempotent upsert on retry
);

create table conversation_log (
  id uuid primary key default gen_random_uuid(),
  workflow_instance_id uuid references workflow_instances(id),
  role text not null,
  text text not null,
  created_at timestamptz default now()
);
```

The `unique (workflow_instance_id, field_name)` constraint makes `document_collection_task` safely retryable — retries upsert rather than blind-insert.

## 7.5 Scheme Config Schema (JSON, not a DB table)

```json
{
  "scheme_id": "pm_kisan",
  "display_name": "PM Kisan Samman Nidhi",
  "fields": [
    { "name": "owns_land", "type": "boolean", "prompt": "Do you own agricultural land?" },
    { "name": "land_size_acres", "type": "number", "prompt": "How many acres do you own?", "depends_on": "owns_land" },
    { "name": "has_aadhaar_linked_bank", "type": "boolean", "prompt": "Is your bank account linked to Aadhaar?" }
  ],
  "eligibility_rule": "owns_land == true and land_size_acres <= 2 and has_aadhaar_linked_bank == true",
  "pdf_template": "pm_kisan_application.html.jinja"
}
```

`eligibility_rule` is descriptive/documentation only — `validation_task` implements checks as explicit, hardcoded per-scheme logic, not a runtime-evaluated expression.