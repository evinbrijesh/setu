-- Setu Schema Migration 001
-- Creates core tables for the multi-day resumable workflow pipeline.
-- Run this in the Supabase Dashboard SQL Editor.

-- =============================================================
-- Table: workflow_instances
-- The day-spanning logical unit. Each row tracks one user's
-- application process across multiple Render task runs.
-- =============================================================
create table if not exists workflow_instances (
    id              uuid        primary key default gen_random_uuid(),
    user_id         uuid        not null,
    scheme_id       text        not null,
    current_stage   text        not null default 'intake',
    status          text        not null default 'in_progress'
                                    check (status in (
                                        'in_progress',
                                        'completed',
                                        'failed'
                                    )),
    last_render_run_id  text,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

-- Index for resumability lookup: find in-progress instances by user + scheme
create index if not exists idx_workflow_instances_user_scheme
    on workflow_instances (user_id, scheme_id, status);

-- Auto-update updated_at on row modification
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger set_workflow_instances_updated_at
    before update on workflow_instances
    for each row
    execute function update_updated_at_column();


-- =============================================================
-- Table: documents_collected
-- Stores extracted field values per workflow instance.
-- Unique constraint on (workflow_instance_id, field_name) makes
-- upserts idempotent for safe retry.
-- =============================================================
create table if not exists documents_collected (
    id                  uuid        primary key default gen_random_uuid(),
    workflow_instance_id uuid       not null references workflow_instances(id) on delete cascade,
    field_name          text        not null,
    field_value         jsonb,
    collected_at        timestamptz not null default now(),

    -- Idempotent upsert: retries won't create duplicate rows
    unique (workflow_instance_id, field_name)
);

create index if not exists idx_documents_collected_workflow
    on documents_collected (workflow_instance_id);


-- =============================================================
-- Table: conversation_log
-- Logs every user utterance and agent response for context.
-- =============================================================
create table if not exists conversation_log (
    id                  uuid        primary key default gen_random_uuid(),
    workflow_instance_id uuid       not null references workflow_instances(id) on delete cascade,
    role                text        not null check (role in ('user', 'agent')),
    text                text        not null,
    created_at          timestamptz not null default now()
);

create index if not exists idx_conversation_log_workflow
    on conversation_log (workflow_instance_id);
