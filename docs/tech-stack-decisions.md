# Setu — Tech Stack Decision Doc

| Layer | Chosen | Alternatives considered | Rationale |
|---|---|---|---|
| Speech-to-text | Saaras v3 (Sarvam) | Whisper, Google STT | Native support for 22 Indian languages plus code-mixed/Hinglish speech; satisfies the Sarvam track requirement directly. |
| Text-to-speech | Bulbul v3 (Sarvam) | Google TTS, ElevenLabs | 30+ voices across 11 Indian languages; same track-alignment reasoning as Saaras. |
| Reasoning/extraction LLM | Sarvam-30B (default), Sarvam-105B (complex/agentic cases) | Claude API, GPT-4-class models | 64K context, low latency for live voice loop; 105B for ambiguous multi-field extraction. Full Sarvam pipeline (STT + LLM + TTS) makes the track integration deep. |
| Orchestration / durable execution | Render Workflows | Temporal, Inngest, custom Supabase Edge Functions + hand-rolled state machine | No separate control-plane infrastructure, lightweight decorator-based SDK, automatic retries, built-in observability dashboard — and is the second required hackathon track. |
| Database / persistence | Supabase (Postgres + Storage) | Firebase, raw Postgres + S3 | Relational integrity for field/instance/log relationships; Storage, auth, row-level security built in; JSONB columns fit variable per-scheme fields. |
| Backend audio bridge | FastAPI | Node.js/Express | Python keeps same language as Sarvam SDK and Render Workflow tasks; native async supports WebSocket audio streaming. |
| PDF generation | WeasyPrint (Jinja2 HTML → PDF) | Headless LibreOffice, hosted PDF APIs | Pure Python, no external service dependency; Jinja2 keeps scheme-to-form mapping as plain HTML. |
| Frontend | React + Vite | Next.js, plain HTML/JS | Matches builder's existing stack; Vite's fast dev loop suits hackathon iteration speed; no server-rendering requirement. |

**Explicitly rejected from the original plan:** Django + DRF and a hand-rolled Python/TypeScript state machine — both are unnecessary once Render Workflows takes over orchestration.