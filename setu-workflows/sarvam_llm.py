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
    print("⚠️ WARNING: SARVAM_API_KEY is not set. setu-workflows will fall back to Gemini.")


def extract_field(
    utterance: str,
    field_name: str,
    field_type: str,
    field_prompt: str,
    context: dict[str, Any] | None = None,
    model: str = "sarvam-30b",
) -> dict[str, Any]:
    """Call Sarvam LLM to extract a single field value from user utterance.

    Fallback: If Sarvam key is missing or calls fail, falls back to Gemini 1.5 Flash.
    """
    system_prompt = _build_system_prompt(field_name, field_type, field_prompt)
    user_prompt = _build_user_prompt(utterance, context)

    # 1. Try Sarvam first
    if SARVAM_API_KEY:
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
        try:
            with httpx.Client(timeout=15.0) as client:
                response = client.post(
                    f"{SARVAM_BASE_URL}/v1/chat/completions",
                    headers=headers,
                    json=payload,
                )
                if response.status_code == 200:
                    result = response.json()
                    content = result["choices"][0]["message"].get("content")
                    if content:
                        return _parse_llm_response(content, field_type)
        except Exception as exc:
            print(f"Sarvam LLM failed: {exc}. Trying Gemini fallback...")
            pass

    # 2. Try Gemini Fallback
    gemini_key = os.environ.get("GEMINI_API_KEY")
    if gemini_key:
        try:
            gemini_content = _call_gemini_fallback(system_prompt, user_prompt, gemini_key)
            if gemini_content:
                return _parse_llm_response(gemini_content, field_type)
        except Exception as e:
            print(f"Gemini fallback failed: {e}")
            pass

    return {
        "value": None,
        "confidence": 0.0,
        "reasoning": "Extraction failed: no API keys available or both LLM models failed.",
    }


def _call_gemini_fallback(system_prompt: str, user_prompt: str, gemini_key: str) -> str | None:
    """Call Google AI Studio's Gemini 1.5 Flash in JSON mode."""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}"
    payload = {
        "contents": [{
            "role": "user",
            "parts": [
                {"text": f"System Instructions:\n{system_prompt}\n\nUser Input:\n{user_prompt}"}
            ]
        }],
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    }
    headers = {"Content-Type": "application/json"}
    try:
        with httpx.Client(timeout=15.0) as client:
            response = client.post(url, headers=headers, json=payload)
            if response.status_code == 200:
                res_json = response.json()
                return res_json["candidates"][0]["content"]["parts"][0]["text"]
            else:
                print(f"Gemini API returned code {response.status_code}: {response.text}")
    except Exception as e:
        print(f"Gemini HTTP connection failed: {e}")
    return None


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
