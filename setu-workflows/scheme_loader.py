"""Shared scheme config loader — single source of truth for reading schemes/*.json.

Usage:
    from scheme_loader import get_scheme, get_scheme_field_names

    scheme = get_scheme("pm_kisan")
    fields = get_scheme_field_names("pm_kisan")
"""

from __future__ import annotations

import json
import os
from typing import Any

_SCHEMES_DIR = os.path.join(os.path.dirname(__file__), "schemes")

_cache: dict[str, dict[str, Any]] = {}


def _load_scheme(scheme_id: str) -> dict[str, Any]:
    """Load a scheme JSON file, caching the result."""
    if scheme_id not in _cache:
        path = os.path.join(_SCHEMES_DIR, f"{scheme_id}.json")
        if not os.path.exists(path):
            raise FileNotFoundError(f"Scheme config not found: {path}")
        with open(path, encoding="utf-8") as f:
            _cache[scheme_id] = json.load(f)
    return _cache[scheme_id]


def get_scheme(scheme_id: str) -> dict[str, Any]:
    """Return the full scheme config dict."""
    return _load_scheme(scheme_id)


def get_scheme_field_names(scheme_id: str) -> list[str]:
    """Return the list of field names defined for a scheme."""
    scheme = _load_scheme(scheme_id)
    return [f["name"] for f in scheme.get("fields", [])]


def get_scheme_field(scheme_id: str, field_name: str) -> dict[str, Any] | None:
    """Return a single field definition by name, or None."""
    scheme = _load_scheme(scheme_id)
    for f in scheme.get("fields", []):
        if f["name"] == field_name:
            return f
    return None


def get_scheme_prompt(scheme_id: str, field_name: str) -> str:
    """Return the user-facing prompt for a field."""
    field = get_scheme_field(scheme_id, field_name)
    if field is None:
        return f"Please provide your {field_name.replace('_', ' ')}."
    return field["prompt"]


def reload_schemes() -> None:
    """Clear cache (useful for hot-reload in development)."""
    _cache.clear()
