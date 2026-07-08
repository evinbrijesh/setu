"""Task modules for the setu-workflows pipeline.

Each module registers its task(s) on a per-module Workflows app instance.
main.py combines all apps via Workflows.from_workflows() and adds the
run_setu_turn orchestrator.
"""
