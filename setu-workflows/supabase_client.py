"""Shared Supabase client singleton for setu-workflows.

Usage:
    from supabase_client import get_supabase
    supabase = get_supabase()
    result = supabase.table("workflow_instances").select("*").execute()
"""

from __future__ import annotations

import os

from supabase import Client, create_client

_client: Client | None = None


def get_supabase() -> Client:
    """Get or create the Supabase admin client using service-role key."""
    global _client
    if _client is None:
        url = os.environ["SUPABASE_URL"]
        key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
        _client = create_client(url, key)
    return _client
