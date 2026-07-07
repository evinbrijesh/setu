"""Notify task — generates spoken/text confirmation with download link.

Reads/writes:
- Reads: workflow_instances (pdf_storage_path, scheme_id, user_id)
- Writes: workflow_instances.status (sets to 'completed')
"""

from __future__ import annotations

from typing import Any

from render_workflows import task


@task
def notify_user_task(workflow_instance_id: str, channel: str) -> dict[str, Any]:
    """Send notification with download link to user.

    Generates a Bulbul v3 spoken confirmation or a text notification
    containing the signed PDF download URL.

    Args:
        workflow_instance_id: The workflow instance UUID.
        channel: "voice" or "text".

    Returns:
        dict with keys: notified (bool), channel_used (str)
    """
    # TODO (Phase 5): implement Bulbul TTS notification + signed URL generation
    return {
        "notified": True,
        "channel_used": channel,
    }
