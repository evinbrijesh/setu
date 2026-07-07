# ADR-005: Monorepo Structure

**Status:** Accepted  
**Date:** 2026-07-07  
**Deciders:** Setu Architect

## Context
Three distinct services are needed: a React frontend, a FastAPI audio bridge, and a Render Workflows Python service. These could be developed in separate repositories or combined into one.

## Decision
Use a single monorepo with three subdirectories:

```
setu-web/          # React + Vite frontend
setu-audio/        # FastAPI WebSocket service
setu-workflows/    # Render Workflow service (Python SDK)
schemes/           # JSON scheme configs + Jinja2 templates
docs/              # Planning docs + ADRs
```

## Alternatives Considered
| Option | Reason Rejected |
|---|---|
| Three separate repos | Higher overhead for coordination during a tight hackathon timeline; cross-cutting changes (scheme configs, doc updates) require multiple PRs |
| Single flat directory | Separating services into subdirectories makes independent deployment and dependency management cleaner |

## Consequences
- Each subdirectory has its own `requirements.txt` / `package.json` and can be deployed independently.
- A single GitHub repo connects to Render, with different services deployed from different subdirectories.
- Scheme configs and docs are shared across services without cross-repo coordination.
