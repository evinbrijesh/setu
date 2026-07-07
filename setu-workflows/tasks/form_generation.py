"""Form generation task — renders Jinja2 template to PDF via WeasyPrint.

Reads/writes:
- Reads: documents_collected (all fields), schemes/{scheme_id}.json (template ref)
- Writes: Supabase Storage (PDF file), workflow_instances (pdf_storage_path)
"""

from __future__ import annotations

from typing import Any

from render_workflows import task

from supabase_client import get_supabase


@task
def form_generation_task(workflow_instance_id: str) -> dict[str, Any]:
    """Generate filled PDF form and upload to Supabase Storage.

    Reads documents_collected and scheme config, renders the Jinja2 HTML
    template, converts to PDF with WeasyPrint, and uploads to Supabase
    Storage under the workflow instance's path.

    Args:
        workflow_instance_id: The workflow instance UUID.

    Returns:
        dict with keys: pdf_storage_path (str)
    """
    # TODO (Phase 5): implement Jinja2 rendering + WeasyPrint conversion + upload
    return {
        "pdf_storage_path": "",
    }
