# ADR-002: Render Workflows for Durable Orchestration

**Status:** Accepted  
**Date:** 2026-07-07  
**Deciders:** Setu Architect

## Context
The process of guiding a user through a government scheme application involves multiple stages (intake, document collection, validation, form generation, notification). Each stage must be independently retryable, observable, and able to survive the user taking breaks of hours or days between turns.

## Decision
Use Render Workflows (Python SDK) as the orchestration layer. The system defines five chained tasks:

1. `intake_task` — identifies/confirms scheme intent
2. `document_collection_task` — extracts structured fields via Sarvam LLM
3. `validation_task` — checks eligibility against scheme rules
4. `form_generation_task` — renders PDF from template
5. `notify_user_task` — sends completed-document notification

These are chained in a top-level `run_setu_turn` task, triggered per user utterance from `setu-audio`.

## Alternatives Considered
| Option | Reason Rejected |
|---|---|
| Temporal | Requires separate control-plane infrastructure to self-host; overkill for hackathon scope |
| Inngest | Less mature Python SDK; cloud-only; less control over retry policies |
| Custom Supabase Edge Functions + hand-rolled state machine | Reinventing the wheel; no built-in execution graph or retry visibility; explicitly rejected in original plan |

## Consequences
- Render task runs cap at 24h — multi-day resumability must be handled via Supabase state (see ADR-004).
- No Django/DRF or custom state machine needed — Render Workflows replaces both.
- Each task's execution is visible in the Render Dashboard, satisfying the Render Workflows Track judging criterion.
