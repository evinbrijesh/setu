"""Workflow trigger — triggers a run_setu_turn task on Render Workflows.

For local development, calls the task directly via import.
For production, POSTs to the Render Workflow trigger URL.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Any

import httpx
from dotenv import load_dotenv

load_dotenv()

RENDER_WORKFLOWS_TRIGGER_URL: str | None = os.environ.get("RENDER_WORKFLOWS_TRIGGER_URL")
RENDER_API_KEY: str | None = os.environ.get("RENDER_API_KEY")

# When running locally without Render, import tasks directly
_use_direct_call: bool = False
_direct_module: Any = None


def _find_workflows_dir() -> Path | None:
    """Walk up from setu-audio/ to find the setu-workflows/ directory.

    Searches parent directories for a sibling 'setu-workflows/main.py'.
    This is more robust than hardcoding a relative path that depends on
    the uvicorn working directory.
    """
    current = Path(__file__).resolve().parent
    for _ in range(10):  # walk up at most 10 levels
        candidate = current / "setu-workflows"
        if (candidate / "main.py").exists():
            return candidate
        parent = current.parent
        if parent == current:
            break
        current = parent
    return None


def _try_import_direct() -> bool:
    """Attempt to import run_setu_turn for direct local calls."""
    global _direct_module, _use_direct_call
    try:
        workflows_dir = _find_workflows_dir()
        if workflows_dir is None:
            print("[workflow_trigger] Could not find setu-workflows/ directory")
            return False

        sys.path.insert(0, str(workflows_dir))
        from main import run_setu_turn  # type: ignore

        _direct_module = run_setu_turn
        _use_direct_call = True
        return True
    except ImportError as e:
        print(f"[workflow_trigger] Direct import failed: {e}")
        return False


async def trigger_setu_turn(
    user_id: str,
    raw_utterance: str,
    scheme_id: str | None = None,
    existing_instance_id: str | None = None,
) -> dict[str, Any]:
    """Trigger a run_setu_turn task execution.

    Uses Render Workflows REST API in production, falls back to direct
    Python call for local development.

    Args:
        user_id: The UUID of the user.
        raw_utterance: The transcribed user utterance.
        scheme_id: Optional explicit scheme identifier.
        existing_instance_id: Known workflow instance ID for session resume.

    Returns:
        dict with the task run result or error info.
    """
    if RENDER_WORKFLOWS_TRIGGER_URL and RENDER_API_KEY:
        return await _trigger_via_api(user_id, raw_utterance, scheme_id, existing_instance_id)

    # Fallback: direct call for local dev
    if not _use_direct_call:
        _try_import_direct()

    if _use_direct_call and _direct_module is not None:
        return _direct_module(
            user_id,
            raw_utterance,
            existing_instance_id=existing_instance_id,
        )

    return {
        "error": "No Render trigger URL configured and direct import unavailable.",
        "workflow_instance_id": None,
    }


async def _trigger_via_api(
    user_id: str,
    raw_utterance: str,
    scheme_id: str | None = None,
    existing_instance_id: str | None = None,
) -> dict[str, Any]:
    """POST to the Render Workflow trigger URL to start a task run."""
    if not RENDER_WORKFLOWS_TRIGGER_URL or not RENDER_API_KEY:
        return {"error": "Render Workflow trigger not configured"}

    payload = {
        "user_id": user_id,
        "raw_utterance": raw_utterance,
    }
    if scheme_id:
        payload["scheme_id"] = scheme_id
    if existing_instance_id:
        payload["existing_instance_id"] = existing_instance_id

    headers = {
        "Authorization": f"Bearer {RENDER_API_KEY}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            RENDER_WORKFLOWS_TRIGGER_URL,
            json=payload,
            headers=headers,
        )
        response.raise_for_status()
        return response.json()
