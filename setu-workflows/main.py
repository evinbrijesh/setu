"""
main.py — Phase 2 Render Workflow Tasks orchestrator.

Registers all task modules and provides the `run_setu_turn` entry point
that chains intake → document_collection → validation → form_generation → notify.

Run locally:
    render-workflows setu_workflows:app

Deploy to Render as a Workflow service with `app.start()` as the entry point.
"""

from __future__ import annotations

from typing import Any

from render_sdk import Workflows
from render_sdk.workflows import Retry

from tasks.document_collection import document_collection_app
from tasks.form_generation import form_generation_app
from tasks.intake import intake_app
from tasks.notify import notify_app
from tasks.validation import validation_app

# Import decorated task callables for use in the orchestrator
from tasks.document_collection import document_collection_task
from tasks.form_generation import form_generation_task
from tasks.intake import intake_task
from tasks.notify import notify_user_task
from tasks.validation import validation_task

# Combine all task registries into one
app = Workflows.from_workflows(
    intake_app,
    document_collection_app,
    validation_app,
    form_generation_app,
    notify_app,
    default_retry=Retry(max_retries=2, wait_duration_ms=1000),
    default_timeout=120,
)


@app.task(
    retry=Retry(max_retries=2, wait_duration_ms=1000, backoff_scaling=1.5),
    timeout_seconds=120,
    plan="standard",
)
def run_setu_turn(
    user_id: str,
    raw_utterance: str,
    existing_instance_id: str | None = None,
) -> dict[str, Any]:
    """Top-level orchestrator: process one user utterance through the pipeline.

    Called once per user utterance from setu-audio (via Render Workflow trigger).
    Reads Supabase state to resume if an existing workflow instance is in progress.

    When existing_instance_id is provided (from frontend session lookup), the
    intake_task skips schema inference and directly resumes that workflow instance.

    Task chain:
        1. intake_task      — identify/resolve scheme, get/create workflow_instance
        2. document_collection_task — extract field data from utterance
        3. validation_task  — check eligibility (if all fields collected)
        4. form_generation_task — produce filled PDF (if eligible)
        5. notify_user_task — send download notification

    Args:
        user_id: The UUID of the user.
        raw_utterance: The transcribed text from the user's spoken input.
        existing_instance_id: Known workflow instance ID (from session lookup).

    Returns:
        dict with keys describing the outcome of this turn:
            workflow_instance_id, scheme_id, current_stage, complete,
            needs_reask, reask_prompt, resumed
    """
    # Step 1: Intake — identify scheme, get or create workflow instance
    instance = intake_task(
        user_id,
        raw_utterance,
        scheme_id=None,
        existing_instance_id=existing_instance_id,
    )

    workflow_id = instance["workflow_instance_id"]
    scheme_id = instance["scheme_id"]
    is_resume = instance.get("resumed", False)

    # Step 2: Document collection — extract field data
    collection_result = document_collection_task(
        workflow_id,
        raw_utterance,
        is_resume=is_resume,
    )

    collected_fields = collection_result.get("collected_fields", {})

    # If collection is still in progress and needs user input, return early
    if collection_result.get("needs_reask") or not collection_result.get("complete"):
        return {
            "workflow_instance_id": workflow_id,
            "scheme_id": scheme_id,
            "current_stage": "document_collection",
            "complete": False,
            "needs_reask": collection_result.get("needs_reask", False),
            "reask_prompt": collection_result.get("reask_prompt"),
            "resumed": is_resume,
            "collected_fields": collected_fields,
        }

    # Step 3: Validation — check eligibility
    validation_result = validation_task(workflow_id)

    if not validation_result.get("eligible", False):
        return {
            "workflow_instance_id": workflow_id,
            "scheme_id": scheme_id,
            "current_stage": "validation_failed",
            "complete": True,
            "eligible": False,
            "failed_reasons": validation_result.get("failed_reasons", []),
            "resumed": is_resume,
            "collected_fields": collected_fields,
        }

    # Step 4: Form generation — produce PDF
    form_result = form_generation_task(workflow_id)
    pdf_storage_path = form_result.get("pdf_storage_path")

    # Step 5: Notify — send confirmation (pass storage path from form generation)
    notify_result = notify_user_task(
        workflow_id,
        channel="voice",
        pdf_storage_path=pdf_storage_path,
    )

    return {
        "workflow_instance_id": workflow_id,
        "scheme_id": scheme_id,
        "current_stage": "notified",
        "complete": True,
        "eligible": True,
        "pdf_generated": bool(form_result.get("pdf_storage_path")),
        "notified": notify_result.get("notified", False),
        "resumed": is_resume,
        "notification_message": notify_result.get("message", ""),
        "download_url": notify_result.get("pdf_url", ""),
        "collected_fields": collected_fields,
    }


# Entry point for Render Workflow worker
if __name__ == "__main__":
    app.start()
