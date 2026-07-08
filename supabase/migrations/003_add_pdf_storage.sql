-- Setu Schema Migration 003
-- Adds PDF storage path column to workflow_instances for Phase 5 form generation.
-- Also creates (or ensures) the generated_forms bucket for PDF storage.
-- Run this in the Supabase Dashboard SQL Editor.

-- =============================================================
-- Add pdf_storage_path column to workflow_instances
-- Stores the internal storage path for the generated PDF,
-- e.g., "generated_forms/<uuid>.pdf"
-- =============================================================
alter table if exists workflow_instances
    add column if not exists pdf_storage_path text;

-- =============================================================
-- Note: The "generated_forms" storage bucket must be created
-- via the Supabase Dashboard (Storage → Create bucket) or the
-- Management API. Set it as a private bucket (not public).
-- The form_generation task will attempt to create it at runtime
-- if it doesn't exist.
-- =============================================================
-- Create bucket SQL (run separately in the SQL Editor if needed):
--   select storage.create_bucket('generated_forms', jsonb_build_object('public', false));
