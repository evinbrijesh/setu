Here's the minimal stack to actually ship this for a demo:

**Voice I/O**
- **Saaras v3** (Sarvam) — speech-to-text, use `mode="codemix"` for natural Hindi/Tamil+English mixing
- **Bulbul v3** (Sarvam) — text-to-speech, pick one speaker voice and keep it consistent
- Browser mic + WebSocket (skip real telephony/Twilio for demo — not worth the setup risk)

**Backend**
- **Django + DRF** — your `/session/{id}/turn` endpoint, form schema logic, PDF generation
- **FastAPI (or Node) + WebSocket** — separate small service just for streaming audio in/out (Django doesn't handle persistent audio streams well)
- **Redis** — lock a session so overlapping turns don't race

**State + Data**
- **Supabase (Postgres)** — two tables: `sessions` (state, collected_fields as JSONB) and `conversation_log`
- Plain Python dict/class for the state machine — don't pull in a library, hand-roll it for demo scope

**LLM (dialogue + extraction)**
- **Sarvam-30B or 105B** for the full-Indian-stack story, with structured JSON output forced
- Keep a **Claude API** fallback wired in case Sarvam's function-calling misbehaves live

**Form output**
- **WeasyPrint** (Jinja2 HTML → PDF) — fastest way to render a filled certificate/application as a downloadable PDF

**Frontend**
- **React + Vite** — mic button, live transcript, form-preview panel that fills in as fields get collected

That's the whole stack. Everything else (scheme configs, eligibility rules) is just JSON files, not new infrastructure.
