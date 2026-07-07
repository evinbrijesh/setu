"""Validation task — evaluates scheme eligibility against collected fields.

Reads/writes:
- Reads: documents_collected (all fields for the instance), schemes/{scheme_id}.json (eligibility rule)
- Writes: workflow_instances.current_stage (advances to 'form_generation' or 'notified')
"""

from __future__ import annotations

from typing import Any

from render_workflows import task

from supabase_client import get_supabase


@task
def validation_task(workflow_instance_id: str) -> dict[str, Any]:
    """Check eligibility rules against collected document fields.

    Reads documents_collected from Supabase and evaluates per-scheme
    eligibility criteria. Uses hardcoded per-scheme logic, not a runtime
    expression evaluator.

    Args:
        workflow_instance_id: The workflow instance UUID.

    Returns:
        dict with keys: eligible (bool), failed_reasons (list[str])
    """
    # TODO (Phase 5): implement per-scheme eligibility check
    supabase = get_supabase()

    instance = (
        supabase.table("workflow_instances")
        .select("scheme_id")
        .eq("id", workflow_instance_id)
        .single()
        .execute()
    )

    scheme_id = instance.data["scheme_id"]

    # Read collected fields
    fields = (
        supabase.table("documents_collected")
        .select("field_name, field_value")
        .eq("workflow_instance_id", workflow_instance_id)
        .execute()
    )

    collected = {row["field_name"]: row["field_value"] for row in fields.data}

    # TODO: Route to per-scheme validation logic
    return {
        "eligible": True,
        "failed_reasons": [],
    }
