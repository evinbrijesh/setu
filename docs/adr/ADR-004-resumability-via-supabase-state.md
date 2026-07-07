# ADR-004: Resumability via Supabase State (Per-Turn Render Runs)

**Status:** Accepted  
**Date:** 2026-07-07  
**Deciders:** Setu Architect

## Context
Users may stop mid-process and return hours or days later. Render Workflows cap task runs at 24 hours and don't natively support scheduled or delayed triggers. The system needs a multi-session resumability model that works within these platform constraints.

## Decision
Do **not** model "wait for the user" as a single long-running task. Instead:

1. A `workflow_instances` row in Supabase is the durable, day-spanning logical unit.
2. Each user utterance triggers a **fresh** Render task run, passing the existing `workflow_instance_id` and `current_stage`.
3. Tasks read existing Supabase state first and resume into the correct stage — they do not restart from `intake_task`.
4. The result: many short-lived, fully observable Render runs stitched together by the Supabase row.

## Consequences
- Each user turn = one Render task run, visible as a discrete execution in the Dashboard.
- No task ever blocks on user input — the block is at the application level (waiting for the next utterance), not inside a task.
- Resume logic must be explicitly coded into `document_collection_task` (read existing docs, determine next missing field, generate recap prompt).
