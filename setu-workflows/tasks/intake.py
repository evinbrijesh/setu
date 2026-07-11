"""Intake task — identifies scheme intent and creates/resumes workflow instances.

Reads/writes:
- Reads: workflow_instances (existing rows for user + scheme), documents_collected
- Writes: workflow_instances (creates new row if none in progress)
"""

from __future__ import annotations

import uuid
from typing import Any

from render_sdk import Workflows
from render_sdk.workflows import Retry

from supabase_client import get_supabase

intake_app = Workflows()


@intake_app.task(
    retry=Retry(max_retries=3, wait_duration_ms=1000, backoff_scaling=1.5),
    timeout_seconds=30,
)
def intake_task(
    user_id: str,
    raw_utterance: str,
    scheme_id: str | None,
    existing_instance_id: str | None = None,
) -> dict[str, Any]:
    """Identify or confirm scheme intent, create or resume a workflow instance.

    If existing_instance_id is provided, fetches that row directly (used when
    the frontend already knows the workflow instance from a session lookup).
    Otherwise, if scheme_id is provided uses it directly, else infers scheme.
    Looks up an existing 'in_progress' workflow_instance for the user + scheme
    pair. If found, returns it with resumed=True (resume path). If not, creates
    a new row with resumed=False.

    Args:
        user_id: The UUID of the user.
        raw_utterance: The transcribed user utterance.
        scheme_id: Explicit scheme identifier, or None to infer.
        existing_instance_id: If provided, skip lookup and resume this instance.

    Returns:
        dict with keys: workflow_instance_id, scheme_id, current_stage,
                        resumed (bool), collected_count (int)
    """
    supabase = get_supabase()

    # If an existing workflow instance ID is known, fetch it directly.
    if existing_instance_id:
        instance = (
            supabase.table("workflow_instances")
            .select("id, current_stage, scheme_id")
            .eq("id", existing_instance_id)
            .eq("status", "in_progress")
            .execute()
        )
        if instance.data:
            row = instance.data[0]
            fields_result = (
                supabase.table("documents_collected")
                .select("field_name", count="exact")
                .eq("workflow_instance_id", row["id"])
                .execute()
            )
            collected_count = (
                fields_result.count
                if hasattr(fields_result, "count")
                else len(fields_result.data or [])
            )
            return {
                "workflow_instance_id": row["id"],
                "scheme_id": row["scheme_id"],
                "current_stage": row["current_stage"],
                "resumed": True,
                "collected_count": collected_count,
            }

    # Resolve scheme_id if not provided
    resolved_scheme_id = scheme_id or _infer_scheme(raw_utterance)
    if not resolved_scheme_id:
        resolved_scheme_id = "pm_kisan"  # default for Phase 2 demo

    # Check for existing in_progress instance
    existing = (
        supabase.table("workflow_instances")
        .select("id, current_stage, scheme_id")
        .eq("user_id", user_id)
        .eq("scheme_id", resolved_scheme_id)
        .eq("status", "in_progress")
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )

    if existing.data:
        row = existing.data[0]
        # Count already-collected fields
        fields_result = (
            supabase.table("documents_collected")
            .select("field_name", count="exact")
            .eq("workflow_instance_id", row["id"])
            .execute()
        )
        collected_count = (
            fields_result.count
            if hasattr(fields_result, "count")
            else len(fields_result.data or [])
        )
        return {
            "workflow_instance_id": row["id"],
            "scheme_id": row["scheme_id"],
            "current_stage": row["current_stage"],
            "resumed": True,
            "collected_count": collected_count,
        }

    # Create new workflow instance
    instance_id = str(uuid.uuid4())
    supabase.table("workflow_instances").insert(
        {
            "id": instance_id,
            "user_id": user_id,
            "scheme_id": resolved_scheme_id,
            "current_stage": "intake",
            "status": "in_progress",
        }
    ).execute()

    return {
        "workflow_instance_id": instance_id,
        "scheme_id": resolved_scheme_id,
        "current_stage": "intake",
        "resumed": False,
        "collected_count": 0,
    }


def _infer_scheme(utterance: str) -> str | None:
    """Simple keyword-based scheme inference.

    Phase 2: supports only pm_kisan. Phase 7 will extend this.
    Returns the scheme_id or None if no match.
    """
    lower = utterance.lower()
    keywords = {
        "pm_kisan": [
            "kisan",
            "pm kisan",
            "farmer",
            "kheti",
            "kisaan",
            "pradhan mantri",
        ],
        "caste_cert": [
            "caste",
            "jaati",
            "jati",
            "caste certificate",
            "jaati praman patra",
        ],
        "income_cert": [
            "income",
            "aay",
            "income certificate",
            "aay praman patra",
        ],
    }
    for scheme_id, words in keywords.items():
        if any(w in lower for w in words):
            return scheme_id
    return None
