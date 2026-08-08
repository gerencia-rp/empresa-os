-- ════════════════════════════════════════════════════════════════
-- 🎯 COMMAND CENTER · North-Star configurable (HUD del /jarvis). Aditivo, admin-only.
-- Singleton (una fila). El % se calcula: si metric_key está seteado →
-- métrica_en_vivo / target; si no → manual_pct.
-- ════════════════════════════════════════════════════════════════
create table if not exists public.cc_northstar (
  id boolean primary key default true,
  label text not null default 'Ocupación Rentas al objetivo',
  metric_key text,                 -- 'ocupacion'|'deuda'|'pendientes'|'criticas'|'capital'|null
  target numeric,                  -- meta numérica (para métrica en vivo)
  manual_pct numeric,              -- % manual (si metric_key es null)
  unit text default '%',
  updated_by text,
  updated_at timestamptz default now(),
  constraint cc_northstar_singleton check (id)
);

alter table public.cc_northstar enable row level security;
drop policy if exists cc_northstar_admin_read on public.cc_northstar;
create policy cc_northstar_admin_read on public.cc_northstar for select to authenticated using (public.is_admin());
drop policy if exists cc_northstar_admin_write on public.cc_northstar;
create policy cc_northstar_admin_write on public.cc_northstar for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Semilla (métrica en vivo: ocupación al 95%)
insert into public.cc_northstar (id, label, metric_key, target, unit)
values (true, 'Ocupación Rentas al 95%', 'ocupacion', 95, '%')
on conflict (id) do nothing;

-- ── ROLLBACK ──  drop table if exists public.cc_northstar;
