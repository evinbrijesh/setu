"""Validation task — evaluates scheme eligibility against collected fields.

Reads/writes:
- Reads: documents_collected (all fields for the instance), schemes/{scheme_id}.json
- Writes: workflow_instances.current_stage (advances to 'form_generation' or 'notified')
"""

from __future__ import annotations

from typing import Any

from render_sdk import Workflows
from render_sdk.workflows import Retry

from supabase_client import get_supabase

validation_app = Workflows()


@validation_app.task(
    retry=Retry(max_retries=2, wait_duration_ms=1000),
    timeout_seconds=30,
)
def validation_task(workflow_instance_id: str) -> dict[str, Any]:
    """Check eligibility rules against collected document fields.

    Reads documents_collected from Supabase and evaluates per-scheme
    eligibility criteria. Uses hardcoded per-scheme logic, not a runtime
    expression evaluator.

    Args:
        workflow_instance_id: The workflow instance UUID.

    Returns:
        dict with keys: eligible (bool), failed_reasons (list[str])
    """
    supabase = get_supabase()

    instance = (
        supabase.table("workflow_instances")
        .select("scheme_id")
        .eq("id", workflow_instance_id)
        .single()
        .execute()
    )
    scheme_id = instance.data["scheme_id"]

    # Read collected fields
    fields = (
        supabase.table("documents_collected")
        .select("field_name, field_value")
        .eq("workflow_instance_id", workflow_instance_id)
        .execute()
    )
    collected = {row["field_name"]: row["field_value"] for row in fields.data}

    # Route to per-scheme validation
    if scheme_id == "pm_kisan":
        result = _validate_pm_kisan(collected)
    elif scheme_id == "caste_cert":
        result = _validate_caste_cert(collected)
    elif scheme_id == "income_cert":
        result = _validate_income_cert(collected)
    else:
        result = {"eligible": False, "failed_reasons": [f"Unknown scheme: {scheme_id}"]}

    # Advance stage
    next_stage = "form_generation" if result["eligible"] else "validation_failed"
    supabase.table("workflow_instances").update({"current_stage": next_stage}).eq(
        "id", workflow_instance_id
    ).execute()

    return result


def _validate_pm_kisan(collected: dict[str, Any]) -> dict[str, Any]:
    """PM Kisan Samman Nidhi eligibility check.

    Rules:
    - owns_land must be True
    - land_size_acres must be <= 2 (if owns_land is True)
    - has_aadhaar_linked_bank must be True
    """
    failed_reasons: list[str] = []

    owns_land = collected.get("owns_land")
    if owns_land is not True:
        failed_reasons.append("Applicant must own agricultural land.")

    land_size = collected.get("land_size_acres")
    if owns_land is True:
        if land_size is None:
            failed_reasons.append("Land size not provided.")
        elif land_size > 2:
            failed_reasons.append(
                f"Land size ({land_size} acres) exceeds the 2-acre limit."
            )

    aadhaar_bank = collected.get("has_aadhaar_linked_bank")
    if aadhaar_bank is not True:
        failed_reasons.append("Bank account must be linked to Aadhaar.")

    return {
        "eligible": len(failed_reasons) == 0,
        "failed_reasons": failed_reasons,
    }


def _validate_caste_cert(collected: dict[str, Any]) -> dict[str, Any]:
    """Caste Certificate eligibility check.

    Rules:
    - annual_family_income must be <= 800,000 INR (Creamy Layer limit)
    """
    failed_reasons: list[str] = []
    
    income = collected.get("annual_family_income")
    if income is not None:
        try:
            val = float(income)
            if val > 800000:
                failed_reasons.append(
                    f"Annual family income ({val} INR) exceeds the 8 Lakhs Creamy Layer limit."
                )
        except (ValueError, TypeError):
            pass

    return {
        "eligible": len(failed_reasons) == 0,
        "failed_reasons": failed_reasons,
    }


def _validate_income_cert(collected: dict[str, Any]) -> dict[str, Any]:
    """Income Certificate eligibility check.

    Rules:
    - annual_income must be greater than 0.
    """
    failed_reasons: list[str] = []
    
    income = collected.get("annual_income")
    if income is not None:
        try:
            val = float(income)
            if val <= 0:
                failed_reasons.append("Annual income must be greater than 0.")
        except (ValueError, TypeError):
            pass
    else:
        failed_reasons.append("Annual income is required.")

    return {
        "eligible": len(failed_reasons) == 0,
        "failed_reasons": failed_reasons,
    }
