"""Form generation task — renders Jinja2 template to PDF via WeasyPrint.

Reads/writes:
- Reads: documents_collected (all fields), schemes/{scheme_id}.json (template ref)
- Writes: Supabase Storage (PDF file), workflow_instances (pdf_storage_path)
"""

from __future__ import annotations

import os
from typing import Any

from jinja2 import Environment, FileSystemLoader
from render_sdk import Workflows
from render_sdk.workflows import Retry
from storage3.types import FileOptions
from weasyprint import HTML

from scheme_loader import get_scheme
from supabase_client import get_supabase

form_generation_app = Workflows()

_TEMPLATES_DIR = os.path.join(os.path.dirname(__file__), "..", "templates")

# WeasyPrint shared configuration
_HTML = HTML  # alias for convenient access
_WEASYPRINT_OPTIONS = {
    "presentational_hints": True,
}


@form_generation_app.task(
    retry=Retry(max_retries=1, wait_duration_ms=2000),
    timeout_seconds=60,
)
def form_generation_task(workflow_instance_id: str) -> dict[str, Any]:
    """Generate filled PDF form and upload to Supabase Storage.

    Phase 5 implementation: reads collected fields, renders the scheme's
    Jinja2 template via WeasyPrint, uploads the resulting PDF to the
    `generated_forms` Supabase Storage bucket, and stores the path on
    the workflow_instances row.

    Args:
        workflow_instance_id: The workflow instance UUID.

    Returns:
        dict with keys:
            pdf_storage_path (str): Internal storage path, empty on failure.
    """
    supabase = get_supabase()

    # ── Load workflow and scheme config ──
    instance = (
        supabase.table("workflow_instances")
        .select("scheme_id")
        .eq("id", workflow_instance_id)
        .single()
        .execute()
    )
    scheme_id = instance.data["scheme_id"]
    scheme = get_scheme(scheme_id)
    template_name = scheme.get("pdf_template", f"{scheme_id}.html")

    # ── Read collected fields ──
    fields_result = (
        supabase.table("documents_collected")
        .select("field_name, field_value")
        .eq("workflow_instance_id", workflow_instance_id)
        .execute()
    )
    collected: dict[str, Any] = {
        row["field_name"]: row["field_value"] for row in fields_result.data
    }

    # ── Render Jinja2 HTML template ──
    try:
        env = Environment(loader=FileSystemLoader(_TEMPLATES_DIR))
        template = env.get_template(template_name)
        html = template.render(**collected)
    except Exception as exc:
        # Template rendering failure is a real bug — log and return early
        _log_error(supabase, workflow_instance_id, f"Template render failed: {exc}")
        return {"pdf_storage_path": ""}

    # ── Convert to PDF via WeasyPrint ──
    try:
        pdf_bytes = HTML(string=html).write_pdf()
    except Exception as exc:
        _log_error(
            supabase, workflow_instance_id, f"WeasyPrint conversion failed: {exc}"
        )
        return {"pdf_storage_path": ""}

    if not pdf_bytes:
        _log_error(supabase, workflow_instance_id, "WeasyPrint produced empty PDF")
        return {"pdf_storage_path": ""}

    # ── Ensure the generated_forms bucket exists ──
    _ensure_bucket(supabase)

    # ── Upload to Supabase Storage ──
    storage_path = f"{workflow_instance_id}.pdf"
    try:
        supabase.storage.from_("generated_forms").upload(
            storage_path,
            pdf_bytes,
            FileOptions(content_type="application/pdf"),
        )
    except Exception as exc:
        # If file already exists (retry after prior success), that's fine.
        # Any other error is transient and should be retried by the task runner.
        existing = supabase.storage.from_("generated_forms").exists(storage_path)
        if not existing:
            _log_error(
                supabase,
                workflow_instance_id,
                f"Storage upload failed: {exc}",
            )
            return {"pdf_storage_path": ""}

    # ── Advance stage (path is returned to orchestrator, not stored in DB) ──
    supabase.table("workflow_instances").update({"current_stage": "notify_user"}).eq(
        "id", workflow_instance_id
    ).execute()

    return {"pdf_storage_path": storage_path}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _ensure_bucket(supabase) -> None:
    """Create the generated_forms bucket if it doesn't exist (idempotent)."""
    try:
        existing = {b.name for b in supabase.storage.list_buckets()}
        if "generated_forms" not in existing:
            supabase.storage.create_bucket(
                "generated_forms",
                options={"public": False},
            )
    except Exception:
        pass  # Best-effort; will fail on upload if bucket is truly unavailable


def _log_error(supabase, workflow_instance_id: str, message: str) -> None:
    """Log an error to conversation_log for observability."""
    try:
        supabase.table("conversation_log").insert(
            {
                "workflow_instance_id": workflow_instance_id,
                "role": "agent",
                "text": f"[FormGen Error] {message}",
            }
        ).execute()
    except Exception:
        pass  # Don't let logging failure mask the original error
