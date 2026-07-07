# ADR-001: Sarvam AI for End-to-End Voice Pipeline

**Status:** Accepted  
**Date:** 2026-07-07  
**Deciders:** Setu Architect

## Context
The project needs a voice pipeline that supports Indian languages (Hindi, Tamil, Hinglish) with low enough latency for conversational interaction. Three separate capabilities are needed: Speech-to-Text, reasoning/extraction LLM, and Text-to-Speech.

## Decision
Use Sarvam AI for all three layers of the voice pipeline:
- **STT:** Saaras v3
- **LLM:** Sarvam-30B (default) / Sarvam-105B (complex/agentic cases)
- **TTS:** Bulbul v3

## Alternatives Considered
| Layer | Alternatives | Reason Rejected |
|---|---|---|
| STT | Whisper, Google STT | Weaker support for code-mixed/Hinglish and smaller Indian language coverage |
| LLM | Claude API, GPT-4-class | Sarvam satisfies the Sarvam Track hackathon requirement; 64K context, low latency |
| TTS | Google TTS, ElevenLabs | Same track-alignment reasoning as STT |

## Consequences
- The voice pipeline latency is bounded by Sarvam API response times (target ~2–3s per turn).
- No non-Sarvam LLM fallback is permitted — the Sarvam Track requirement is core to judging.
- Retry logic must account for Sarvam API transient failures.
