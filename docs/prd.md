# Setu — Product Requirements Document (PRD)

## 1.1 Problem Statement

Hundreds of millions of Indians are entitled to government services — certificates, welfare scheme benefits, identity documents — but are functionally locked out of them by process friction: forms in English or bureaucratic formal language, unclear document requirements, no way to check status or resume an abandoned application, and no help available in the citizen's own spoken language. This friction disproportionately affects people with lower literacy or limited digital fluency, who often resort to paid middlemen for services that should be free and self-serve.

## 1.2 Product Vision

Setu is a voice-first AI agent that lets a person speak naturally, in their own language, about what government service they need, and be guided conversationally through the entire process — with the system tracking progress durably across days, without the person needing to re-explain anything, ending in a real, submission-ready filled document.

## 1.3 Goals

- Let a user complete an entire government-form-filling process using only spoken natural language, in Hindi, Tamil, or Hinglish.
- Make the process resumable: a user can stop after any answer and return later (minutes, hours, or days) without repeating information.
- Produce a tangible, correct, downloadable output (a filled PDF) at the end of the process.
- Demonstrate that the underlying process is reliable and observable — not just conversational, but backed by a real, inspectable execution pipeline.

## 1.4 Non-Goals (explicitly out of scope for this version)

- Actually submitting the form to a government system or portal — Setu produces a submission-ready document; the user still performs the final physical/online submission.
- Supporting an open-ended number of government schemes at launch — one scheme fully built and polished is the priority; a second is a stretch goal.
- Identity verification, document authenticity checking, or fraud prevention — Setu assumes what the user tells it is true and does not validate against government identity systems.
- Real telephony/PSTN integration (actual phone calls) — the primary interaction surface is browser-based voice via microphone; phone-call support is a future extension, not required for this build.
- Handling every possible spoken dialect or extreme accent variation — reasonable coverage of major language modes (Hindi, Tamil, Hinglish) is the target, not universal coverage.

## 1.5 Target Users

- Primary: a citizen who needs a specific government certificate or scheme benefit, is more comfortable speaking than typing/reading forms, and may have limited English fluency.
- Secondary (demo audience): hackathon judges evaluating both the Sarvam voice-AI integration and the Render Workflows durable-orchestration integration as distinct, non-token uses of each platform.

## 1.6 Key Features

1. Voice-only conversational intake — no typing required at any point.
2. Multi-turn structured information collection, one field at a time, driven by a scheme-specific config rather than hardcoded logic.
3. Durable, multi-session resumability — the process survives disconnection and time gaps of arbitrary length.
4. Automatic eligibility validation against the specific scheme's rules.
5. Automatic generation of a filled, downloadable PDF once all required information is collected.
6. Live status/progress visibility in the UI ("Step 3 of 5 complete").
7. Full observability of the underlying execution — every stage of the process is inspectable as a discrete, logged task run.

## 1.7 Success Metrics (for the hackathon demo context)

- A full end-to-end flow (voice intake → data collection → validation → PDF generation → notification) completes without manual intervention.
- A deliberate mid-flow disconnect-and-resume test succeeds without any data loss or re-asked questions.
- The Render Dashboard shows a clear, multi-stage execution graph for the demoed session.
- The full demo runs in under 3 minutes.

## 1.8 Constraints and Assumptions

- Render Workflow task runs cap at 24 hours and do not natively support scheduled/delayed triggering — the multi-day resumability property must be achieved via Supabase state, not a single long-blocking task (see Technical Design, Section 2.3).
- Sarvam API availability and latency are external dependencies; the product's responsiveness is bounded by their round-trip time.
- The project assumes a single active scheme (e.g., PM Kisan eligibility or a caste certificate application) is fully built; additional schemes are configuration, not new code, and are stretch scope.