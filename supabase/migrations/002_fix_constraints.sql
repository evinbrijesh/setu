-- Fix migration 001: Add missing unique constraint and handle idempotent inserts

-- 1. Ensure unique constraint exists on documents_collected
-- (create table if not exists won't add constraints to existing tables)
do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'documents_collected_workflow_instance_id_field_name_key'
          and conrelid = 'documents_collected'::regclass
    ) then
        -- Drop any duplicate rows first (keep the latest for each pair)
        delete from documents_collected d1
        using documents_collected d2
        where d1.workflow_instance_id = d2.workflow_instance_id
          and d1.field_name = d2.field_name
          and d1.id < d2.id;

        alter table documents_collected
            add constraint documents_collected_workflow_instance_id_field_name_key
            unique (workflow_instance_id, field_name);
    end if;
end $$;

-- 2. Ensure trigger function and trigger exist on workflow_instances
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists set_workflow_instances_updated_at on workflow_instances;
create trigger set_workflow_instances_updated_at
    before update on workflow_instances
    for each row
    execute function update_updated_at_column();
