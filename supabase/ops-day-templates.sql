-- ============================================================
-- Plantillas de día completo (snapshot replicable)
-- ============================================================

create table if not exists public.ops_day_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  -- Snapshot: [{title, start_time, duration_min, travel_min, materials, checklist,
  --            zona, business, property_id, project_id, priority, notes}]
  tasks jsonb not null default '[]'::jsonb,
  zona text,                       -- zona dominante (auto-detectada al guardar)
  task_count int default 0,
  total_min int default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists ops_day_templates_recent on public.ops_day_templates(updated_at desc);

alter table public.ops_day_templates enable row level security;
drop policy if exists odt_all on public.ops_day_templates;
create policy odt_all on public.ops_day_templates for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
