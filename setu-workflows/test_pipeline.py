#!/usr/bin/env python3
"""
test_pipeline.py — Phase 3 manual test script.

Calls the underlying task functions directly (bypassing Render task decorator)
for local testing. Supports async task functions (e.g., Sarvam LLM calls).

Usage:
    python test_pipeline.py

Requires SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SARVAM_API_KEY
in the environment or .env file.
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
import uuid

from dotenv import load_dotenv

load_dotenv()


def _check_env() -> bool:
    """Verify required environment variables are set."""
    required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SARVAM_API_KEY"]
    missing = [v for v in required if not os.environ.get(v)]
    if missing:
        print(f"Missing required env vars: {', '.join(missing)}")
        print(
            "Ensure SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SARVAM_API_KEY are set in .env"
        )
        return False
    return True


async def _run_async(fn, **kwargs):
    """Call a function that may be sync or async."""
    result = fn(**kwargs)
    if asyncio.iscoroutine(result):
        return await result
    return result


async def run_test_flow():
    """Run a complete test of the pipeline with simulated utterances."""
    if not _check_env():
        sys.exit(1)

    # Note: All task functions are now synchronous. _run_async handles both
    # sync and async functions for backward compatibility — it detects whether
    # the returned value is a coroutine and only awaits if needed.
    # Import the decorated TaskCallable objects, then access raw functions via ._func
    from tasks.intake import intake_task as intake_tc
    from tasks.document_collection import document_collection_task as doc_collection_tc
    from tasks.validation import validation_task as validation_tc
    from tasks.form_generation import form_generation_task as form_gen_tc
    from tasks.notify import notify_user_task as notify_tc

    # Get the raw functions
    intake_fn = intake_tc._func
    doc_collection_fn = doc_collection_tc._func
    validation_fn = validation_tc._func
    form_gen_fn = form_gen_tc._func
    notify_fn = notify_tc._func

    test_user_id = str(uuid.uuid4())
    print(f"Test user ID: {test_user_id}")
    print("=" * 60)

    # Turn 1: Express intent to apply for PM Kisan
    print("\n--- Turn 1: Intent ---")
    print('Utterance: "Mujhe PM Kisan ke liye apply karna hai"')
    instance = await _run_async(
        intake_fn,
        user_id=test_user_id,
        raw_utterance="Mujhe PM Kisan ke liye apply karna hai",
        scheme_id=None,
    )
    print(f"Result: {json.dumps(instance, indent=2, default=str)}")
    wf_id = instance.get("workflow_instance_id")
    print(f"Workflow instance: {wf_id}")
    print()

    # Turn 2: Answer first question (owns_land)
    print("--- Turn 2: Answer owns_land ---")
    print('Utterance: "Haan, mere paas zameen hai"')
    result = await _run_async(
        doc_collection_fn,
        workflow_instance_id=wf_id,
        latest_utterance="Haan, mere paas zameen hai",
    )
    print(f"Result: {json.dumps(result, indent=2, default=str)}")
    print()

    if result.get("complete"):
        print("--- All fields collected! ---")
    else:
        print(f"Next field needed: {result.get('reask_prompt')}")
    print()

    # Turn 3: Answer land size
    print("--- Turn 3: Answer land_size_acres ---")
    print('Utterance: "Mere paas 1.5 acre zameen hai"')
    result = await _run_async(
        doc_collection_fn,
        workflow_instance_id=wf_id,
        latest_utterance="Mere paas 1.5 acre zameen hai",
    )
    print(f"Result: {json.dumps(result, indent=2, default=str)}")
    print()

    # Turn 4: Answer Aadhaar-linked bank
    print("--- Turn 4: Answer has_aadhaar_linked_bank ---")
    print('Utterance: "Haan, mera bank account aadhaar se linked hai"')
    result = await _run_async(
        doc_collection_fn,
        workflow_instance_id=wf_id,
        latest_utterance="Haan, mera bank account aadhaar se linked hai",
    )
    print(f"Result: {json.dumps(result, indent=2, default=str)}")
    print()

    # Turn 5: Answer district
    print("--- Turn 5: Answer district ---")
    print('Utterance: "Lucknow"')
    result = await _run_async(
        doc_collection_fn,
        workflow_instance_id=wf_id,
        latest_utterance="Lucknow",
    )
    print(f"Result: {json.dumps(result, indent=2, default=str)}")
    print()

    # Turn 6: Answer full name
    print("--- Turn 6: Answer full_name ---")
    print('Utterance: "Mera naam Ram Singh hai"')
    result = await _run_async(
        doc_collection_fn,
        workflow_instance_id=wf_id,
        latest_utterance="Mera naam Ram Singh hai",
    )
    print(f"Result: {json.dumps(result, indent=2, default=str)}")
    print()

    # Now all fields should be collected - run validation
    print("--- Validation ---")
    val_result = await _run_async(validation_fn, workflow_instance_id=wf_id)
    print(f"Result: {json.dumps(val_result, indent=2, default=str)}")
    print()

    if val_result.get("eligible"):
        # Form generation
        print("--- Form Generation ---")
        form_result = await _run_async(form_gen_fn, workflow_instance_id=wf_id)
        print(f"Result: {json.dumps(form_result, indent=2, default=str)}")
        pdf_path = form_result.get("pdf_storage_path", "")
        if pdf_path:
            print(f"  ✅ PDF generated: {pdf_path}")
        else:
            print("  ⚠️  PDF generation returned empty path (check Supabase Storage)")
        print()

        # Notify (pass pdf_storage_path from form generation result)
        print("--- Notify ---")
        notify_result = await _run_async(
            notify_fn,
            workflow_instance_id=wf_id,
            channel="voice",
            pdf_storage_path=pdf_path,
        )
        print(f"Result: {json.dumps(notify_result, indent=2, default=str)}")
        if notify_result.get("message"):
            print(f"  ✅ Notification message generated")
        if notify_result.get("pdf_url"):
            print(f"  ✅ Download URL available")
        print()

    # Summary
    print("=" * 60)
    print("Final pipeline result:")
    if result.get("complete"):
        print("  ✅ All fields collected!")
        if val_result.get("eligible"):
            print("  ✅ User is ELIGIBLE for PM Kisan")
            if form_result.get("pdf_storage_path"):
                print(f"  ✅ PDF stored at: {form_result['pdf_storage_path']}")
            if notify_result.get("message"):
                print(f"  ✅ Notification sent: {notify_result['message'][:80]}...")
        else:
            print(f"  ❌ User is NOT eligible: {val_result.get('failed_reasons')}")
    else:
        print(f"  ⏳ Pipeline in progress: stage={result.get('current_stage')}")
        if result.get("needs_reask"):
            print(f"  💬 Needs re-ask: {result.get('reask_prompt')}")


async def run_resumability_test():
    """Test multi-session resumability: two time-gapped triggers for same user.

    First trigger: answers 2 fields, then stops.
    Second trigger: same user, should resume and answer remaining 3 fields.
    """
    if not _check_env():
        sys.exit(1)

    from tasks.intake import intake_task as intake_tc
    from tasks.document_collection import document_collection_task as doc_collection_tc
    from tasks.validation import validation_task as validation_tc
    from tasks.form_generation import form_generation_task as form_gen_tc
    from tasks.notify import notify_user_task as notify_tc

    intake_fn = intake_tc._func
    doc_collection_fn = doc_collection_tc._func
    validation_fn = validation_tc._func
    form_gen_fn = form_gen_tc._func
    notify_fn = notify_tc._func

    test_user_id = str(uuid.uuid4())
    print(f"Test user ID: {test_user_id}")
    print("=" * 60)

    # ── Session 1: first interaction ──
    print("\n📌 SESSION 1: First interaction")
    print("\n--- Turn 1: Intent ---")
    print('Utterance: "Mujhe PM Kisan ke liye apply karna hai"')
    instance = await _run_async(
        intake_fn,
        user_id=test_user_id,
        raw_utterance="Mujhe PM Kisan ke liye apply karna hai",
        scheme_id=None,
    )
    print(f"Result: {json.dumps(instance, indent=2, default=str)}")
    wf_id = instance.get("workflow_instance_id")

    assert instance.get("resumed") is False, "First session should NOT be a resume"
    assert instance.get("collected_count") == 0, (
        "Fresh session should have 0 collected fields"
    )
    print("  ✅ Fresh session created correctly")

    # Answer owns_land
    print("\n--- Turn 2: Answer owns_land ---")
    print('Utterance: "Haan, mere paas zameen hai"')
    result = await _run_async(
        doc_collection_fn,
        workflow_instance_id=wf_id,
        latest_utterance="Haan, mere paas zameen hai",
    )
    print(f"Result: {json.dumps(result, indent=2, default=str)}")

    # Answer land_size_acres
    print("\n--- Turn 3: Answer land_size_acres ---")
    print('Utterance: "Mere paas 1.5 acre zameen hai"')
    result = await _run_async(
        doc_collection_fn,
        workflow_instance_id=wf_id,
        latest_utterance="Mere paas 1.5 acre zameen hai",
    )
    print(f"Result: {json.dumps(result, indent=2, default=str)}")

    print("\n" + "=" * 60)
    print("⏰ Simulating time gap — user returns later...")
    print("=" * 60)

    # ── Session 2: resume ──
    print("\n📌 SESSION 2: Resume (same user, no existing_instance_id)")
    print("\n--- Turn 4: Resume with greeting ---")
    print('Utterance: "Haan, main phir se aa gaya hoon"')
    instance2 = await _run_async(
        intake_fn,
        user_id=test_user_id,
        raw_utterance="Haan, main phir se aa gaya hoon",
        scheme_id=None,
    )
    print(f"Result: {json.dumps(instance2, indent=2, default=str)}")

    assert instance2.get("resumed") is True, "Second session SHOULD be a resume"
    assert instance2.get("collected_count") >= 2, (
        f"Resumed session should have >=2 fields, got {instance2.get('collected_count')}"
    )
    print("  ✅ Resumption detected correctly!")

    wf_id2 = instance2.get("workflow_instance_id")
    assert wf_id2 == wf_id, "Workflow instance ID should be the same across sessions"

    # Resume utterance — should trigger recap prompt
    print("\n--- Turn 5: Resume utterance (extraction attempt) ---")
    print('Utterance: "Haan, main phir se aa gaya hoon"')
    result2 = await _run_async(
        doc_collection_fn,
        workflow_instance_id=wf_id2,
        latest_utterance="Haan, main phir se aa gaya hoon",
        is_resume=True,
    )
    print(f"Result: {json.dumps(result2, indent=2, default=str)}")
    print(f"Reask prompt:\n{result2.get('reask_prompt', 'N/A')}")

    if result2.get("needs_reask"):
        print(
            "  ✅ Resume recap generated (extraction failed as expected for greeting)"
        )
    else:
        print("  ⚠️ Extraction may have succeeded unexpectedly")

    # Now answer the remaining fields properly
    print("\n--- Turn 6: Answer has_aadhaar_linked_bank ---")
    print('Utterance: "Haan, mera bank account aadhaar se linked hai"')
    result2 = await _run_async(
        doc_collection_fn,
        workflow_instance_id=wf_id2,
        latest_utterance="Haan, mera bank account aadhaar se linked hai",
        is_resume=True,
    )
    print(f"Result: {json.dumps(result2, indent=2, default=str)}")

    print("\n--- Turn 7: Answer district ---")
    print('Utterance: "Lucknow"')
    result2 = await _run_async(
        doc_collection_fn,
        workflow_instance_id=wf_id2,
        latest_utterance="Lucknow",
        is_resume=True,
    )
    print(f"Result: {json.dumps(result2, indent=2, default=str)}")

    print("\n--- Turn 8: Answer full_name ---")
    print('Utterance: "Mera naam Ram Singh hai"')
    result2 = await _run_async(
        doc_collection_fn,
        workflow_instance_id=wf_id2,
        latest_utterance="Mera naam Ram Singh hai",
        is_resume=True,
    )
    print(f"Result: {json.dumps(result2, indent=2, default=str)}")

    # Validate
    print("\n--- Validation ---")
    val_result2 = await _run_async(validation_fn, workflow_instance_id=wf_id2)
    print(f"Result: {json.dumps(val_result2, indent=2, default=str)}")

    # Form generation
    print("\n--- Form Generation ---")
    form_result2 = await _run_async(form_gen_fn, workflow_instance_id=wf_id2)
    print(f"Result: {json.dumps(form_result2, indent=2, default=str)}")
    pdf_path2 = form_result2.get("pdf_storage_path", "")
    if pdf_path2:
        print(f"  ✅ PDF generated: {pdf_path2}")

    # Notify (pass pdf_storage_path from form generation result)
    print("\n--- Notify ---")
    notify_result2 = await _run_async(
        notify_fn,
        workflow_instance_id=wf_id2,
        channel="voice",
        pdf_storage_path=pdf_path2,
    )
    print(f"Result: {json.dumps(notify_result2, indent=2, default=str)}")
    if notify_result2.get("message"):
        print(f"  ✅ Notification generated")
    if notify_result2.get("pdf_url"):
        print(f"  ✅ Download URL available")

    # Summary
    print("\n" + "=" * 60)
    print("Resumability test result:")
    print(f"  Session 1 (resumed=False): ✅ intake_task created fresh instance")
    print(f"  Session 2 (resumed=True):  ✅ intake_task detected existing instance")
    print(f"  Same workflow_instance_id: {'✅' if wf_id2 == wf_id else '❌'}")
    print(
        f"  Total fields collected:    {instance2.get('collected_count')} (+3 in session 2)"
    )

    if result2.get("complete"):
        print("  ✅ All fields collected across two sessions!")
    if val_result2.get("eligible"):
        print("  ✅ User is ELIGIBLE for PM Kisan")
    if form_result2.get("pdf_storage_path"):
        print(f"  ✅ PDF stored at: {form_result2['pdf_storage_path']}")
    if notify_result2.get("message"):
        print(f"  ✅ Notification sent: {notify_result2['message'][:80]}...")


if __name__ == "__main__":
    print("=== Full Pipeline Test ===")
    asyncio.run(run_test_flow())

    print("\n\n")
    print("=" * 60)
    print("=== Resumability Test ===")
    asyncio.run(run_resumability_test())
