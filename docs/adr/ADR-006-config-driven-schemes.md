# ADR-006: Config-Driven Scheme Definitions

**Status:** Accepted  
**Date:** 2026-07-07  
**Deciders:** Setu Architect

## Context
Multiple government schemes have different fields, prompts, and eligibility rules. Hardcoding scheme-specific logic inside task functions would make adding a second scheme expensive and error-prone.

## Decision
Define each scheme as an external JSON config file in `schemes/*.json`. Each config includes:
- `scheme_id`, `display_name`
- `fields`: name, type, prompt, optional dependencies
- `eligibility_rule`: descriptive/documentation only
- `pdf_template`: filename of the Jinja2 template

Task functions load scheme config via a single shared loader function — no ad hoc file reads. The `eligibility_rule` field is documentation; the actual `validation_task` logic is hardcoded per scheme (not runtime-evaluated expressions).

## Consequences
- Adding a new scheme means: add a JSON file + add a Jinja2 template + add one `elif` in `validation_task`.
- No scheme-specific `if` branches scattered through `intake_task` or `document_collection_task`.
- The shared config loader becomes the single point of contact for scheme data.
