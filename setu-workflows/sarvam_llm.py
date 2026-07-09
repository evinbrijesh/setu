"""Sarvam LLM client — thin wrapper around Sarvam-30B/105B chat completion API.

Used for structured field extraction from user utterances.
Uses synchronous httpx calls because Render Workflow tasks are sync
(calling async from a sync task decorator is not natively supported).
"""

from __future__ import annotations

import json
import os
import re
from typing import Any

import httpx
from dotenv import load_dotenv

load_dotenv()

SARVAM_API_KEY = os.environ.get("SARVAM_API_KEY")
SARVAM_BASE_URL = "https://api.sarvam.ai"

if not SARVAM_API_KEY:
    raise RuntimeError(
        "SARVAM_API_KEY is not set. Check that a .env file with "
        "SARVAM_API_KEY=<your key> exists."
    )


def extract_field(
    utterance: str,
    field_name: str,
    field_type: str,
    field_prompt: str,
    context: dict[str, Any] | None = None,
    model: str = "sarvam-30b",
) -> dict[str, Any]:
    """Call Sarvam LLM to extract a single field value from user utterance.

    Synchronous — Render Workflow tasks do not natively support async
    execution, so all LLM calls use sync httpx.

    Returns a dict with keys:
        - value: the extracted value (or None if not extractable)
        - confidence: float 0-1
        - reasoning: brief explanation
    """
    system_prompt = _build_system_prompt(field_name, field_type, field_prompt)
    user_prompt = _build_user_prompt(utterance, context)

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.1,
        "max_tokens": 1500,
    }

    headers = {
        "api-subscription-key": SARVAM_API_KEY,
        "Content-Type": "application/json",
    }

    with httpx.Client(timeout=30.0) as client:
        response = client.post(
            f"{SARVAM_BASE_URL}/v1/chat/completions",
            headers=headers,
            json=payload,
        )
        result = response.json()

    if response.status_code != 200:
        return {
            "value": None,
            "confidence": 0.0,
            "reasoning": f"API error {response.status_code}: {result}",
        }

    if "choices" not in result or not result["choices"]:
        return {
            "value": None,
            "confidence": 0.0,
            "reasoning": f"Unexpected API response format: {result}",
        }

    content = result["choices"][0]["message"].get("content")
    if content is None:
        finish_reason = result["choices"][0].get("finish_reason", "unknown")
        return {
            "value": None,
            "confidence": 0.0,
            "reasoning": f"LLM returned no content (finish_reason: {finish_reason}). Full response: {result}",
        }

    return _parse_llm_response(content, field_type)


def _build_system_prompt(field_name: str, field_type: str, field_prompt: str) -> str:
    """Build the system prompt for field extraction."""
    type_instructions = {
        "boolean": "Return true or false only.",
        "number": "Return a number (integer or decimal).",
        "text": "Return a short text string.",
    }

    return f"""Extract the answer from the user's response for this field.

Return ONLY valid JSON: {{"value": ..., "confidence": 0.0-1.0, "reasoning": "..."}}

Field: {field_name} ({field_type})
Question: {field_prompt}
Rules: {type_instructions.get(field_type, "Return the extracted value.")}"""


def _build_user_prompt(utterance: str, context: dict[str, Any] | None) -> str:
    """Build the user prompt with utterance and optional context."""
    parts = [f'User said: "{utterance}"']
    if context:
        parts.append(
            f"Context (already collected): {json.dumps(context, ensure_ascii=False)}"
        )
    return "\n".join(parts)


def _parse_llm_response(content: str, field_type: str) -> dict[str, Any]:
    """Parse and validate the LLM's JSON response.

    Strips any markdown code fences or leading/trailing text,
    and extracts the first JSON object found in the response.
    """
    if not content:
        return {
            "value": None,
            "confidence": 0.0,
            "reasoning": "Empty response from LLM",
        }

    # Strip markdown code fences
    cleaned = content.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[-1] if "\n" in cleaned else cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3].strip()
        elif "```" in cleaned:
            cleaned = cleaned.split("```")[0].strip()

    # Try direct parse first
    try:
        parsed = json.loads(cleaned)
        if isinstance(parsed, dict) and "value" in parsed:
            return _validate_value(parsed, field_type)
    except json.JSONDecodeError:
        pass

    # Try to extract JSON object from the response (handles leading text)
    json_match = re.search(r'\{.*"value".*\}', cleaned, re.DOTALL)
    if json_match:
        try:
            parsed = json.loads(json_match.group())
            if isinstance(parsed, dict) and "value" in parsed:
                return _validate_value(parsed, field_type)
        except json.JSONDecodeError:
            pass

    return {
        "value": None,
        "confidence": 0.0,
        "reasoning": f"Could not parse JSON from LLM response: {content[:500]}",
    }


def _validate_value(parsed: dict, field_type: str) -> dict[str, Any]:
    """Validate and coerce the parsed JSON value."""
    value = parsed.get("value")
    confidence = float(parsed.get("confidence", 0.0))
    reasoning = parsed.get("reasoning", "")

    if value is not None:
        try:
            if field_type == "boolean" and isinstance(value, str):
                value = value.lower() in ("true", "yes", "1", "haan", "sahi")
            elif field_type == "number":
                value = float(value)
            elif field_type == "text" and not isinstance(value, str):
                value = str(value)
        except (ValueError, TypeError):
            value = None
            confidence = 0.0
            reasoning = "Type coercion failed"

    return {
        "value": value,
        "confidence": max(0.0, min(1.0, confidence)),
        "reasoning": reasoning,
    }
