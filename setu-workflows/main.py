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


def log_task_execution(
    workflow_id: str,
    task_name: str,
    status: str,
    input_data: dict,
    output_data: dict = None,
    error: str = None
) -> None:
    """Log task execution state inside documents_collected using special prefix."""
    import datetime
    try:
        supabase = get_supabase()
        payload = {
            "status": status,
            "updated_at": datetime.datetime.utcnow().isoformat() + "Z",
            "input": input_data,
            "output": output_data,
            "error": error
        }
        supabase.table("documents_collected").upsert({
            "workflow_instance_id": workflow_id,
            "field_name": f"__task_log_{task_name}",
            "field_value": payload
        }, on_conflict="workflow_instance_id,field_name").execute()
    except Exception as e:
        print(f"Failed to log task execution for {task_name}: {e}")


@app.task(
    retry=Retry(max_retries=2, wait_duration_ms=1000, backoff_scaling=1.5),
    timeout_seconds=120,
    plan="standard",
)
def run_setu_turn(
    user_id: str,
    raw_utterance: str,
    scheme_id: str | None = None,
    existing_instance_id: str | None = None,
) -> dict[str, Any]:
    """Top-level orchestrator: process one user utterance through the pipeline."""
    # Helper to call task raw function if not in Render execution context
    def _call(task_callable, *args, **kwargs):
        from render_sdk.workflows.task import _current_client
        if _current_client.get(None) is None:
            return task_callable._func(*args, **kwargs)
        return task_callable(*args, **kwargs)

    # Step 1: Intake — identify scheme, get or create workflow instance
    instance = _call(
        intake_task,
        user_id,
        raw_utterance,
        scheme_id=scheme_id,
        existing_instance_id=existing_instance_id,
    )

    workflow_id = instance["workflow_instance_id"]
    scheme_id = instance["scheme_id"]
    is_resume = instance.get("resumed", False)

    # Log Step 1 Intake success
    log_task_execution(
        workflow_id,
        "intake",
        "SUCCESS",
        {
            "user_id": user_id,
            "raw_utterance": raw_utterance,
            "scheme_id": scheme_id,
            "existing_instance_id": existing_instance_id,
        },
        instance,
    )

    # Step 2: Document collection — extract field data
    log_task_execution(
        workflow_id,
        "document_collection",
        "RUNNING",
        {"raw_utterance": raw_utterance},
    )
    try:
        collection_result = _call(
            document_collection_task,
            workflow_id,
            raw_utterance,
            is_resume=is_resume,
        )
        log_task_execution(
            workflow_id,
            "document_collection",
            "SUCCESS",
            {"raw_utterance": raw_utterance},
            collection_result,
        )
    except Exception as e:
        log_task_execution(
            workflow_id,
            "document_collection",
            "FAILED",
            {"raw_utterance": raw_utterance},
            error=str(e),
        )
        raise e

    collected_fields = collection_result.get("collected_fields", {})

    # Helper to clean up fields and inject logs before exit
    def _finalize_result(res_dict: dict[str, Any]) -> dict[str, Any]:
        try:
            supabase = get_supabase()
            db_fields = (
                supabase.table("documents_collected")
                .select("field_name, field_value")
                .eq("workflow_instance_id", workflow_id)
                .execute()
            )
            for row in db_fields.data:
                if row["field_name"].startswith("__task_log_"):
                    res_dict["collected_fields"][row["field_name"]] = row["field_value"]
        except Exception as e:
            print(f"Failed to merge final task logs: {e}")
        return res_dict

    # If collection is still in progress and needs user input, return early
    if collection_result.get("needs_reask") or not collection_result.get("complete"):
        log_task_execution(workflow_id, "validation", "PENDING", {})
        log_task_execution(workflow_id, "form_generation", "PENDING", {})
        log_task_execution(workflow_id, "notify_user", "PENDING", {})
        return _finalize_result({
            "workflow_instance_id": workflow_id,
            "scheme_id": scheme_id,
            "current_stage": "document_collection",
            "complete": False,
            "needs_reask": collection_result.get("needs_reask", False),
            "reask_prompt": collection_result.get("reask_prompt"),
            "resumed": is_resume,
            "collected_fields": collected_fields,
        })

    # Step 3: Validation — check eligibility
    log_task_execution(workflow_id, "validation", "RUNNING", {})
    try:
        validation_result = _call(validation_task, workflow_id)
        status = "SUCCESS" if validation_result.get("eligible", False) else "FAILED"
        log_task_execution(
            workflow_id, "validation", status, {}, validation_result
        )
    except Exception as e:
        log_task_execution(workflow_id, "validation", "FAILED", {}, error=str(e))
        raise e

    if not validation_result.get("eligible", False):
        # Update the workflow instance status to 'completed' in Supabase
        from supabase_client import get_supabase
        try:
            supabase = get_supabase()
            supabase.table("workflow_instances").update(
                {"status": "completed", "current_stage": "validation_failed"}
            ).eq("id", workflow_id).execute()
        except Exception as e:
            print(f"Failed to update workflow instance status on validation failure: {e}")

        log_task_execution(workflow_id, "form_generation", "PENDING", {})
        log_task_execution(workflow_id, "notify_user", "PENDING", {})
        return _finalize_result({
            "workflow_instance_id": workflow_id,
            "scheme_id": scheme_id,
            "current_stage": "validation_failed",
            "complete": True,
            "eligible": False,
            "failed_reasons": validation_result.get("failed_reasons", []),
            "resumed": is_resume,
            "collected_fields": collected_fields,
        })

    # Step 4: Form generation — produce PDF
    log_task_execution(workflow_id, "form_generation", "RUNNING", {})
    try:
        form_result = _call(form_generation_task, workflow_id)
        log_task_execution(
            workflow_id, "form_generation", "SUCCESS", {}, form_result
        )
    except Exception as e:
        log_task_execution(
            workflow_id, "form_generation", "FAILED", {}, error=str(e)
        )
        raise e
    pdf_storage_path = form_result.get("pdf_storage_path")

    # Step 5: Notify — send confirmation
    log_task_execution(
        workflow_id, "notify_user", "RUNNING", {"channel": "voice"}
    )
    try:
        notify_result = _call(
            notify_user_task,
            workflow_id,
            channel="voice",
            pdf_storage_path=pdf_storage_path,
        )
        log_task_execution(
            workflow_id,
            "notify_user",
            "SUCCESS",
            {"channel": "voice"},
            notify_result,
        )
    except Exception as e:
        log_task_execution(
            workflow_id, "notify_user", "FAILED", {"channel": "voice"}, error=str(e)
        )
        raise e

    return _finalize_result({
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
    })


# Entry point for Render Workflow worker
if __name__ == "__main__":
    app.start()
