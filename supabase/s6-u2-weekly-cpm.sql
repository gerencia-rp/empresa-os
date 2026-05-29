-- ============================================================
-- S6-U2 · Weekly Planner CPM-aware
-- Agrega activity_code para linkear weekly_activities con catálogo
-- y poder verificar dependencias (depends_on).
-- ============================================================

alter table public.weekly_activities
  add column if not exists activity_code text;

create index if not exists weekly_activities_code
  on public.weekly_activities(activity_code);

-- Back-fill: extraer activity_code de las notes "[Estimador] 5.4.2 · ..."
update public.weekly_activities
set activity_code = substring(notes from '\[Estimador\]\s+([0-9a-zA-Z\.]+)')
where activity_code is null
  and notes ~ '\[Estimador\]\s+[0-9a-zA-Z\.]+';

-- Smoke test
-- select count(*) filter (where activity_code is not null) as con_code,
--        count(*) filter (where activity_code is null) as sin_code,
--        count(*) as total
-- from public.weekly_activities;
