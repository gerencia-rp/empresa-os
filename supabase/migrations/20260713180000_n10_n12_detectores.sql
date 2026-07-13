-- ════════════════════════════════════════════════════════════════
-- N10 + N12 · DETECTORES Y DISCIPLINA (auditoría 2026-07-13) — ADITIVA.
-- N10: casa fantasma = Activa con 0 unidades rentables o sin modelo de negocio (Arcadia, Cervin…).
-- N12: índice de disciplina por persona (ClickUp): % con fecha+dueño, % vencidas, movimiento 7d.
-- ════════════════════════════════════════════════════════════════
create or replace view public.v_casas_fantasma as
select p.property_id, split_part(p.name, ',', 1) as casa, p.rental_model as modelo,
  (select count(*) from public.pm_units u
    where u.property_id = p.id and u.active and u.external_id like 'unit-rec%' and u.unit_type is not null) as unidades,
  case when p.rental_model is null then 'sin modelo de negocio' else '0 unidades rentables' end as motivo
from public.pm_properties p
where p.active and p.property_id is not null
  and (p.rental_model is null
    or 0 = (select count(*) from public.pm_units u
             where u.property_id = p.id and u.active and u.external_id like 'unit-rec%' and u.unit_type is not null));
alter view public.v_casas_fantasma set (security_invoker = on);

create or replace view public.v_disciplina_clickup as
select coalesce(nullif(trim(primary_assignee), ''), '(sin dueño)') as persona,
  count(*) as tareas,
  round(100.0 * count(*) filter (where due_date is not null and coalesce(trim(primary_assignee),'') <> '') / count(*)) as higiene_pct,
  round(100.0 * count(*) filter (where due_date is not null and due_date::date < current_date and status_type is distinct from 'closed') / nullif(count(*) filter (where due_date is not null), 0)) as vencidas_pct,
  round(100.0 * count(*) filter (where date_updated is not null and date_updated::date >= current_date - 7) / count(*)) as movidas_7d_pct,
  -- índice 0–100: higiene 50% + al-día 30% + movimiento 20%
  round(0.5 * (100.0 * count(*) filter (where due_date is not null and coalesce(trim(primary_assignee),'') <> '') / count(*))
      + 0.3 * (100 - coalesce(100.0 * count(*) filter (where due_date is not null and due_date::date < current_date and status_type is distinct from 'closed') / nullif(count(*) filter (where due_date is not null), 0), 100))
      + 0.2 * (100.0 * count(*) filter (where date_updated is not null and date_updated::date >= current_date - 7) / count(*))) as disciplina
from public.clickup_tasks_mirror
where active and status_type is distinct from 'closed'
group by 1
having count(*) >= 5;
alter view public.v_disciplina_clickup set (security_invoker = on);

-- ─── ROLLBACK ───
-- drop view if exists public.v_casas_fantasma; drop view if exists public.v_disciplina_clickup;
