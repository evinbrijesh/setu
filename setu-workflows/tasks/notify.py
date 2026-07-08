"""Notify task — generates spoken/text confirmation with download link.

Reads/writes:
- Reads: workflow_instances (pdf_storage_path, scheme_id)
- Writes: conversation_log, workflow_instances.status (sets to 'completed')
"""

from __future__ import annotations

from typing import Any

from render_sdk import Workflows
from render_sdk.workflows import Retry

from scheme_loader import get_scheme
from supabase_client import get_supabase

notify_app = Workflows()

_SIGNED_URL_EXPIRY_SECONDS = 604800  # 7 days


@notify_app.task(
    retry=Retry(max_retries=2, wait_duration_ms=1000),
    timeout_seconds=30,
)
def notify_user_task(
    workflow_instance_id: str,
    channel: str,
    pdf_storage_path: str | None = None,
) -> dict[str, Any]:
    """Send notification with download link to user.

    Phase 5 implementation: generates a signed download URL from the
    PDF storage path (passed in or read from workflow_instances),
    builds a Hindi confirmation message, logs it, and marks the workflow
    as completed.

    Args:
        workflow_instance_id: The workflow instance UUID.
        channel: "voice" or "text".
        pdf_storage_path: The storage path from form_generation_task.
                          Falls back to reading from workflow_instances if
                          not provided (backward-compatible).

    Returns:
        dict with keys:
            notified (bool): True if notification was prepared.
            channel_used (str): The channel used.
            message (str): The user-facing confirmation text (Hindi/English).
            pdf_url (str): Signed download URL (empty if unavailable).
    """
    supabase = get_supabase()

    # ── Read workflow instance for scheme_id ──
    result = (
        supabase.table("workflow_instances")
        .select("scheme_id")
        .eq("id", workflow_instance_id)
        .single()
        .execute()
    )
    scheme_id = result.data["scheme_id"]

    # ── Get PDF storage path (passed in or from DB) ──
    if not pdf_storage_path:
        try:
            db_result = (
                supabase.table("workflow_instances")
                .select("pdf_storage_path")
                .eq("id", workflow_instance_id)
                .single()
                .execute()
            )
            pdf_storage_path = db_result.data.get("pdf_storage_path")
        except Exception:
            pass

    scheme = get_scheme(scheme_id)
    display_name = scheme.get("display_name", scheme_id)

    # ── Generate signed download URL ──
    download_url: str = ""
    if pdf_storage_path:
        try:
            signed = supabase.storage.from_("generated_forms").create_signed_url(
                pdf_storage_path,
                expires_in=_SIGNED_URL_EXPIRY_SECONDS,
            )
            # Response is a SignedUrlResponse with a .signedURL attribute or dict
            download_url = getattr(signed, "signedURL", None) or (
                signed.get("signedURL", "") if isinstance(signed, dict) else ""
            )
        except Exception:
            # Signed URL generation failure — the PDF still exists in storage
            pass

    # ── Build confirmation message ──
    message = _build_notification_message(display_name, download_url)

    # ── Log to conversation_log ──
    supabase.table("conversation_log").insert(
        {
            "workflow_instance_id": workflow_instance_id,
            "role": "agent",
            "text": f"[Notification] {message}",
        }
    ).execute()

    # ── Mark workflow as completed ──
    supabase.table("workflow_instances").update(
        {"status": "completed", "current_stage": "notified"}
    ).eq("id", workflow_instance_id).execute()

    return {
        "notified": True,
        "channel_used": channel,
        "message": message,
        "pdf_url": download_url,
    }


def _build_notification_message(display_name: str, download_url: str) -> str:
    """Build a Hindi/English user-facing confirmation message."""
    base = f"Namaste! {display_name} ke liye aapka aavedan patra taiyar hai."
    if download_url:
        base += (
            f" Aap apna form yahan se download kar sakte hain: {download_url}."
            f" Yeh link 7 din ke liye valid hai."
        )
    else:
        base += " Aapka form surakshit roop se server par uplabdh hai."
    return base
