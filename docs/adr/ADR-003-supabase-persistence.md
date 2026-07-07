# ADR-003: Supabase for Persistence

**Status:** Accepted  
**Date:** 2026-07-07  
**Deciders:** Setu Architect

## Context
The system needs to store workflow state across sessions, collected document data, conversation history, and generated PDFs. The store must support relational integrity (workflow → documents ↔ conversations), row-level security, and file storage.

## Decision
Use Supabase (PostgreSQL + Storage) as the single persistence layer.

Core schema:
- `workflow_instances` — per-user process state (`scheme_id`, `current_stage`, `status`)
- `documents_collected` — extracted field values (unique per `workflow_instance_id` + `field_name` for idempotent upsert)
- `conversation_log` — utterance history for context
- Supabase Storage — generated PDF files, accessed via signed URLs

## Alternatives Considered
| Option | Reason Rejected |
|---|---|
| Firebase Firestore | No native relational integrity for the three-table schema; weaker query expressiveness for upsert patterns |
| Raw Postgres + S3 | Adds operational overhead; no built-in auth, RLS, or client SDKs for real-time subscriptions |

## Consequences
- Service-role key must never be exposed client-side — anon key only in `setu-web`.
- Row-level security scopes reads/writes to the owning user.
- The `unique (workflow_instance_id, field_name)` constraint provides idempotent retry for `document_collection_task`.
