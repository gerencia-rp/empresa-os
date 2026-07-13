-- ════════════════════════════════════════════════════════════════
-- Scope B obs #24 · N8 CARRIL DATOS-LECTURA de la fábrica IA — de spec a funcional. ADITIVA.
-- (1) ia_data_whitelist: los ÚNICOS recursos (vistas security_invoker) que un artefacto 'datos'
--     puede leer. El proxy (edge fn ia-data) ejecuta con el JWT DEL USUARIO → su RLS aplica igual.
-- (2) Gate de admin: un artefacto carril='datos' NO sirve data hasta aprobado_por (solo role=admin
--     via RPC ia_aprobar_artifact) — el gate queda en DB, no en el front.
-- (3) Wire ia_audit_log: 'aprobado' (RPC), 'spec_<estado>' (trigger en ia_specs) y 'datos_leidos'
--     (edge fn) — el trigger de publicar/actualizar ya existía (20260713170000).
-- Rollback: drop trigger trg_ia_spec_audit on ia_specs; drop function ia_spec_audit_trigger(),
--   ia_aprobar_artifact(uuid); drop table ia_data_whitelist;
--   alter table ia_artifacts drop column aprobado_por, drop column aprobado_at;
-- ════════════════════════════════════════════════════════════════
alter table public.ia_artifacts add column if not exists aprobado_por uuid;
alter table public.ia_artifacts add column if not exists aprobado_at timestamptz;

-- carril nuevo 'datos' (el check original solo permitía libre/ok)
alter table public.ia_artifacts drop constraint if exists ia_artifacts_carril_check;
alter table public.ia_artifacts add constraint ia_artifacts_carril_check
  check (carril is null or carril = any (array['libre'::text, 'ok'::text, 'datos'::text]));

create table if not exists public.ia_data_whitelist (
  id uuid primary key default gen_random_uuid(),
  recurso text not null unique,          -- nombre de la vista (security_invoker) permitida
  area text not null,                    -- área dueña (informativo — el RLS real lo pone la vista)
  descripcion text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.ia_data_whitelist enable row level security;
drop policy if exists ia_wl_select on public.ia_data_whitelist;
create policy ia_wl_select on public.ia_data_whitelist for select to authenticated using (true);
drop policy if exists ia_wl_admin on public.ia_data_whitelist;
create policy ia_wl_admin on public.ia_data_whitelist for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and p.active))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and p.active));

-- seed: solo VISTAS de la capa de KPIs (security_invoker, agregadas, sin PII)
insert into public.ia_data_whitelist (recurso, area, descripcion) values
  ('v_ocupacion',            'rentas',        'Ocupación canónica del portafolio (48/45/3/0)'),
  ('v_rent_roll',            'rentas',        'Rent roll: renta objetivo vs cobrada por casa'),
  ('v_obras_kpi',            'remodelacion',  'KPIs de obras (en curso/finalizadas/margen)'),
  ('v_supuestos_calibrados', 'remodelacion',  'Supuestos calibrados con la historia real'),
  ('v_capital_deployed',     'fix-flip',      'Capital desplegado: equity vs deuda'),
  ('v_pnl_casa',             'fix-flip',      'P&L por casa con interés HML')
on conflict (recurso) do nothing;

-- gate de admin: aprobar un artefacto 'datos' (queda auditado)
create or replace function public.ia_aprobar_artifact(aid uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin' and p.active) then
    raise exception 'solo un admin puede aprobar artefactos con datos';
  end if;
  update ia_artifacts set aprobado_por = auth.uid(), aprobado_at = now() where id = aid;
  insert into ia_audit_log (artifact_id, accion, actor, detalle)
  values (aid, 'aprobado', auth.uid(), jsonb_build_object('carril', (select carril from ia_artifacts where id = aid)));
end $$;
grant execute on function public.ia_aprobar_artifact(uuid) to authenticated;

-- wire: transiciones de estado de ia_specs → audit log (antes solo publicar/actualizar de artifacts)
create or replace function public.ia_spec_audit_trigger() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.estado is distinct from old.estado then
    insert into ia_audit_log (artifact_id, accion, actor, detalle)
    values (null, 'spec_' || coalesce(new.estado, '?'), auth.uid(),
            jsonb_build_object('spec_id', new.id, 'estado_antes', old.estado, 'estado_despues', new.estado));
  end if;
  return new;
end $$;
drop trigger if exists trg_ia_spec_audit on public.ia_specs;
create trigger trg_ia_spec_audit after update on public.ia_specs
  for each row execute function public.ia_spec_audit_trigger();
