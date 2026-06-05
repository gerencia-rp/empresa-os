-- ════════════════════════════════════════════════════════════
-- FIX URGENTE: columnas faltantes que rompen el flujo
-- Idempotente (corré las veces que quieras)
-- ════════════════════════════════════════════════════════════

-- ─── remodel_projects.created_by ───
alter table public.remodel_projects
  add column if not exists created_by uuid references auth.users(id);

-- ─── weekly_activities columnas avanzadas (del Excel import) ───
alter table public.weekly_activities
  add column if not exists duration_days int default 1,
  add column if not exists checklist jsonb default '[]'::jsonb,
  add column if not exists materials jsonb default '[]'::jsonb,
  add column if not exists notes text,
  add column if not exists priority text default 'normal',
  add column if not exists assignee text,
  add column if not exists template_task_id uuid,
  add column if not exists recurring_id uuid,
  add column if not exists day_template_id uuid,
  add column if not exists code text,
  add column if not exists stage text,
  add column if not exists external boolean default false;

-- ─── Refrescar el schema cache de PostgREST ───
notify pgrst, 'reload schema';
