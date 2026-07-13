-- ════════════════════════════════════════════════════════════════
-- N7 · AUTO-SCHEDULER ClickUp — INFRAESTRUCTURA (auditoría 2026-07-13) — ADITIVA.
-- La plantilla (dueño por rol + offset de fecha + dependencias por lista) es CONFIG DE NEGOCIO
-- que define el CEO/operación — acá queda la tabla lista para llenar y la vista de tareas
-- huérfanas que alimenta las propuestas (flujo existente: propuesta → humano aprueba →
-- clickup-execute aplica). Activación: llenar clickup_scheduler_plantilla.
-- ════════════════════════════════════════════════════════════════
create table if not exists public.clickup_scheduler_plantilla (
  id uuid primary key default gen_random_uuid(),
  lista_patron text not null,          -- match por nombre de lista (ilike), ej. '8. Remodelación'
  dueno_default text,                  -- persona por ROL para esa lista
  dias_para_vencer int not null default 7,
  prioridad text,
  notas text,
  active boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.clickup_scheduler_plantilla enable row level security;
drop policy if exists csp_rw on public.clickup_scheduler_plantilla;
create policy csp_rw on public.clickup_scheduler_plantilla for all to authenticated
  using (public.has_area('operacion')) with check (public.has_area('operacion'));

create or replace view public.v_tareas_huerfanas as
select t.id, t.name, t.list_name, t.folder_name, t.primary_assignee, t.due_date, t.date_created,
  p.dueno_default as dueno_sugerido, p.dias_para_vencer,
  case when t.due_date is null and coalesce(trim(t.primary_assignee),'') = '' then 'sin fecha ni dueño'
       when t.due_date is null then 'sin fecha' else 'sin dueño' end as falta
from public.clickup_tasks_mirror t
left join public.clickup_scheduler_plantilla p on p.active and t.list_name ilike '%' || p.lista_patron || '%'
where t.active and t.status_type is distinct from 'closed'
  and (t.due_date is null or coalesce(trim(t.primary_assignee),'') = '');
alter view public.v_tareas_huerfanas set (security_invoker = on);

-- ─── ROLLBACK ───
-- drop view if exists public.v_tareas_huerfanas; drop table if exists public.clickup_scheduler_plantilla;
