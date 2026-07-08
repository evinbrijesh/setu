"""Document collection task — extracts field values and tracks collection state.

Reads/writes:
- Reads: documents_collected (existing fields), schemes/{scheme_id}.json (field definitions)
- Writes: documents_collected (upsert new/updated fields), conversation_log
"""

from __future__ import annotations

from typing import Any

from render_sdk import Workflows
from render_sdk.workflows import Retry

from sarvam_llm import extract_field
from scheme_loader import get_scheme, get_scheme_field, get_scheme_field_names
from supabase_client import get_supabase

document_collection_app = Workflows()


GENERIC_RESUME_PROMPT = (
    "Swagat hai! Aap phir se aa gaye. Aapne pahle hi kuch jaankari di hai."
    " Main aapko agle sawaal se aage badhaunga."
)


def generate_recap_prompt(
    supabase,
    scheme_id: str,
    workflow_instance_id: str,
) -> str:
    """Generate a Hindi recap of already-collected fields for resume context.

    Reads documents_collected for the workflow instance and builds a
    human-readable summary of what the user has already provided.

    Returns:
        A Hindi string summarizing collected fields, or GENERIC_RESUME_PROMPT
        if no fields are collected yet.
    """
    fields_result = (
        supabase.table("documents_collected")
        .select("field_name, field_value")
        .eq("workflow_instance_id", workflow_instance_id)
        .execute()
    )

    if not fields_result.data:
        return GENERIC_RESUME_PROMPT

    scheme = get_scheme(scheme_id)
    field_defs = {f["name"]: f for f in scheme.get("fields", [])}

    lines = ["Swagat hai! Aap phir se aa gaye. Aapne pahle yeh jaankari di hai:"]
    for row in fields_result.data:
        fname = row["field_name"]
        fval = row["field_value"]
        label = field_defs.get(fname, {}).get("prompt", fname)
        # Display value in a human-readable way
        if isinstance(fval, bool):
            display = "haan" if fval else "nahin"
        elif fval is None:
            continue  # skip null placeholder fields
        else:
            display = str(fval)
        lines.append(f"  * {label}: {display}")

    return "\n".join(lines)


@document_collection_app.task(
    retry=Retry(max_retries=3, wait_duration_ms=1000, backoff_scaling=1.5),
    timeout_seconds=60,
)
async def document_collection_task(
    workflow_instance_id: str,
    latest_utterance: str | None,
    is_resume: bool = False,
) -> dict[str, Any]:
    """Process one user utterance to extract the next missing field.

    One-pass task — reads current state, tries to extract value for the
    first missing field from the utterance using Sarvam LLM, updates
    documents_collected, and reports what's still needed.

    When is_resume=True and existing collected fields exist, the reask
    prompt is prepended with a recap of what's already been provided.

    Args:
        workflow_instance_id: The UUID of the workflow instance.
        latest_utterance: The transcribed user utterance, or None if just
                          checking state without new input.
        is_resume: If True and there are previously collected fields, a
                   recap prompt is generated for user context.

    Returns:
        dict with keys:
            complete (bool): True if all fields collected.
            missing_fields (list[str]): Fields still needed.
            needs_reask (bool): True if extraction failed/low confidence.
            reask_prompt (str | None): Prompt for the next field.
            extracted (bool): True if a value was extracted this turn.
    """
    supabase = get_supabase()

    # Load workflow instance
    instance = (
        supabase.table("workflow_instances")
        .select("scheme_id, current_stage")
        .eq("id", workflow_instance_id)
        .single()
        .execute()
    )
    scheme_id = instance.data["scheme_id"]

    # Read already-collected fields
    fields_result = (
        supabase.table("documents_collected")
        .select("field_name, field_value")
        .eq("workflow_instance_id", workflow_instance_id)
        .execute()
    )
    collected = {row["field_name"]: row["field_value"] for row in fields_result.data}

    # Load scheme field definitions
    all_field_names = get_scheme_field_names(scheme_id)
    missing = _get_missing_fields(scheme_id, all_field_names, collected)

    # Log utterance
    if latest_utterance:
        supabase.table("conversation_log").insert(
            {
                "workflow_instance_id": workflow_instance_id,
                "role": "user",
                "text": latest_utterance,
            }
        ).execute()

    # All fields collected — done
    if not missing:
        _advance_stage(supabase, workflow_instance_id, "validation")
        return {
            "complete": True,
            "missing_fields": [],
            "needs_reask": False,
            "reask_prompt": None,
            "extracted": False,
        }

    # No utterance to process — tell caller what's needed
    if not latest_utterance:
        prompt = _get_prompt(scheme_id, missing[0])
        prompt = _maybe_wrap_recap(
            supabase, scheme_id, workflow_instance_id, is_resume, prompt
        )
        return {
            "complete": False,
            "missing_fields": missing,
            "needs_reask": True,
            "reask_prompt": prompt,
            "extracted": False,
        }

    # Try to extract the first missing field
    next_field = missing[0]
    field_def = get_scheme_field(scheme_id, next_field)

    # Handle dependency: skip fields whose dependency isn't satisfied
    if field_def and "depends_on" in field_def:
        dep = field_def["depends_on"]
        dep_value = collected.get(dep["field"])
        if dep_value is None or dep_value != dep["value"]:
            # Record a null placeholder and move on
            _upsert_field(supabase, workflow_instance_id, next_field, None)
            # Re-process remaining fields on next turn
            prompt = _get_prompt(scheme_id, missing[1] if len(missing) > 1 else None)
            return {
                "complete": False,
                "missing_fields": [f for f in missing if f != next_field],
                "needs_reask": bool(prompt),
                "reask_prompt": prompt,
                "extracted": False,
            }

    # Phase 3: Sarvam LLM extraction
    field_type = field_def.get("type", "text")
    field_prompt = field_def.get("prompt", f"Please provide your {next_field}.")

    # Use Sarvam-30B for single-field extraction (lower latency)
    # Use Sarvam-105B for complex/multi-field cases (future enhancement)
    llm_result = await extract_field(
        utterance=latest_utterance,
        field_name=next_field,
        field_type=field_type,
        field_prompt=field_prompt,
        context=collected,
        model="sarvam-30b",
    )

    extracted_value = llm_result.get("value")
    confidence = llm_result.get("confidence", 0.0)
    reasoning = llm_result.get("reasoning", "")

    # Log the extraction attempt
    _log_agent_response(
        supabase,
        workflow_instance_id,
        f"LLM extraction for {next_field}: value={extracted_value}, confidence={confidence:.2f}, reasoning={reasoning}",
    )

    # Low confidence → signal re-ask
    if extracted_value is None or confidence < 0.7:
        prompt = _get_prompt(scheme_id, next_field)
        prompt = _maybe_wrap_recap(
            supabase, scheme_id, workflow_instance_id, is_resume, prompt
        )
        return {
            "complete": False,
            "missing_fields": missing,
            "needs_reask": True,
            "reask_prompt": prompt,
            "extracted": False,
        }

    # Success — upsert the extracted value
    _upsert_field(supabase, workflow_instance_id, next_field, extracted_value)
    _log_agent_response(
        supabase,
        workflow_instance_id,
        f"Got {next_field}: {extracted_value}",
    )

    # Check if more fields needed
    remaining = [f for f in missing if f != next_field]
    if not remaining:
        _advance_stage(supabase, workflow_instance_id, "validation")
        return {
            "complete": True,
            "missing_fields": [],
            "needs_reask": False,
            "reask_prompt": None,
            "extracted": True,
        }

    next_prompt = _get_prompt(scheme_id, remaining[0])
    return {
        "complete": False,
        "missing_fields": remaining,
        "needs_reask": True,
        "reask_prompt": next_prompt,
        "extracted": True,
    }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _maybe_wrap_recap(
    supabase,
    scheme_id: str,
    workflow_instance_id: str,
    is_resume: bool,
    base_prompt: str | None,
) -> str | None:
    """If resuming with collected fields, prepend recap to the reask prompt."""
    if not is_resume or base_prompt is None:
        return base_prompt
    recap = generate_recap_prompt(supabase, scheme_id, workflow_instance_id)
    # Only prepend recap if there are actually collected fields to recap
    if recap != GENERIC_RESUME_PROMPT:
        return f"{recap}\n\n{base_prompt}"
    return base_prompt


def _get_missing_fields(
    scheme_id: str,
    all_field_names: list[str],
    collected: dict[str, Any],
) -> list[str]:
    """Return fields that are still needed (not yet collected or null)."""
    missing = []
    for name in all_field_names:
        val = collected.get(name)
        if val is None:
            missing.append(name)
    return missing


def _get_prompt(scheme_id: str, field_name: str | None) -> str | None:
    """Get the user-facing prompt for a field, or None."""
    if field_name is None:
        return None
    field = get_scheme_field(scheme_id, field_name)
    if field is None:
        return f"Please provide your {field_name.replace('_', ' ')}."
    return field.get("prompt", f"Please provide your {field_name.replace('_', ' ')}.")


def _upsert_field(
    supabase,
    workflow_instance_id: str,
    field_name: str,
    value: Any,
) -> None:
    """Idempotent upsert into documents_collected."""
    supabase.table("documents_collected").upsert(
        {
            "workflow_instance_id": workflow_instance_id,
            "field_name": field_name,
            "field_value": value,
        },
        on_conflict="workflow_instance_id, field_name",
    ).execute()


def _advance_stage(supabase, workflow_instance_id: str, stage: str) -> None:
    """Advance the workflow instance's current_stage if appropriate."""
    supabase.table("workflow_instances").update({"current_stage": stage}).eq(
        "id", workflow_instance_id
    ).execute()


def _log_agent_response(supabase, workflow_instance_id: str, text: str) -> None:
    """Log an agent response to conversation_log."""
    supabase.table("conversation_log").insert(
        {
            "workflow_instance_id": workflow_instance_id,
            "role": "agent",
            "text": text,
        }
    ).execute()
