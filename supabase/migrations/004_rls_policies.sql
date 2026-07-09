-- Setu Schema Migration 004
-- Row-Level Security policies for all three core tables.
--
-- WARNING: These policies rely on Supabase Auth (auth.uid()). The frontend
-- uses the anon key, so RLS must be enabled and policies must exist.
-- The service-role key (used by setu-workflows and setu-audio) bypasses RLS
-- entirely — that is the intended design.
--
-- Run this in the Supabase Dashboard SQL Editor AFTER migrations 001-003.

-- =============================================================
-- 1. workflow_instances
-- =============================================================
alter table if exists workflow_instances enable row level security;

-- Users can view only their own workflow instances
create policy "Users can view own workflow instances"
    on workflow_instances
    for select
    using (user_id = auth.uid()::uuid);

-- Users can create workflow instances for themselves
create policy "Users can create own workflow instances"
    on workflow_instances
    for insert
    with check (user_id = auth.uid()::uuid);

-- =============================================================
-- 2. documents_collected
-- =============================================================
alter table if exists documents_collected enable row level security;

-- Users can view documents for their own workflow instances
create policy "Users can view own documents"
    on documents_collected
    for select
    using (
        workflow_instance_id in (
            select id from workflow_instances
            where user_id = auth.uid()::uuid
        )
    );

-- =============================================================
-- 3. conversation_log
-- =============================================================
alter table if exists conversation_log enable row level security;

-- Users can view conversation logs for their own workflows
create policy "Users can view own conversation logs"
    on conversation_log
    for select
    using (
        workflow_instance_id in (
            select id from workflow_instances
            where user_id = auth.uid()::uuid
        )
    );

-- Note on storage: The generated_forms bucket is private (not public).
-- Access is via signed URLs generated server-side by notify_user_task,
-- which uses the service-role key. No additional storage RLS policy is
-- needed since signed URLs are time-limited and scoped to specific files.
