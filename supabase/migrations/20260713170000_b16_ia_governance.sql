-- ════════════════════════════════════════════════════════════════
-- B16 + O12 + O13 · GOBERNANZA DE LA FÁBRICA IA (auditoría 2026-07-13) — ADITIVA.
-- B16: el creador queda registrado (created_by = auth.uid()) y el ÁREA del artefacto debe estar
--      dentro de las allowed_areas del creador (un viewer de Rentas ya no publica en Fix&Flip).
-- O12: versionado real (version, parent_id) — nada de duplicar filas sin linaje.
-- O13: ia_audit_log INMUTABLE (solo INSERT por RLS; sin policies de update/delete) + trigger.
-- ════════════════════════════════════════════════════════════════
alter table public.ia_artifacts add column if not exists created_by uuid;
alter table public.ia_artifacts add column if not exists version int not null default 1;
alter table public.ia_artifacts add column if not exists parent_id uuid references public.ia_artifacts(id);

-- área del artefacto (label de UI) → slug de allowed_areas
create or replace function public.ia_area_ok(area_label text) returns boolean
language sql stable security definer as $$
  select case lower(coalesce(area_label, ''))
    when 'fix & flip' then public.has_area('fix-flip')
    when 'rentas' then public.has_area('rentas')
    when 'remodelación' then public.has_area('remodelacion')
    when 'remodelacion' then public.has_area('remodelacion')
    when 'educación' then public.has_area('education')
    when 'educacion' then public.has_area('education')
    when 'operación' then public.has_area('operacion')
    when 'operacion' then public.has_area('operacion')
    when 'contable' then public.has_area('contable')
    else public.has_area('ia')   -- Administración/Otro: alcanza con ser gestor de la fábrica
  end
$$;

drop policy if exists ia_artifacts_write on public.ia_artifacts;
create policy ia_artifacts_insert on public.ia_artifacts for insert to authenticated
  with check (public.has_area('ia') and created_by = auth.uid() and public.ia_area_ok(area));
create policy ia_artifacts_update on public.ia_artifacts for update to authenticated
  using (public.has_area('ia'))
  with check (public.has_area('ia') and public.ia_area_ok(area));
create policy ia_artifacts_delete on public.ia_artifacts for delete to authenticated
  using (false);  -- jamás hard-delete: soft vía activo/archived

-- O13 · audit log INMUTABLE
create table if not exists public.ia_audit_log (
  id uuid primary key default gen_random_uuid(),
  artifact_id uuid,
  accion text not null,          -- publicado | actualizado | aprobado | version_nueva
  actor uuid,
  detalle jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.ia_audit_log enable row level security;
drop policy if exists ia_audit_insert on public.ia_audit_log;
create policy ia_audit_insert on public.ia_audit_log for insert to authenticated with check (actor = auth.uid());
drop policy if exists ia_audit_select on public.ia_audit_log;
create policy ia_audit_select on public.ia_audit_log for select to authenticated using (public.has_area('ia'));
-- sin policies de UPDATE/DELETE → inmutable para todos los roles no-service.

create or replace function public.ia_audit_trigger() returns trigger
language plpgsql security definer as $$
begin
  insert into public.ia_audit_log (artifact_id, accion, actor, detalle)
  values (new.id, case when tg_op = 'INSERT' then 'publicado' else 'actualizado' end, auth.uid(),
          jsonb_build_object('titulo', new.titulo, 'area', new.area, 'version', new.version));
  return new;
end $$;
drop trigger if exists trg_ia_audit on public.ia_artifacts;
create trigger trg_ia_audit after insert or update on public.ia_artifacts
  for each row execute function public.ia_audit_trigger();

-- ─── ROLLBACK ───
-- drop trigger if exists trg_ia_audit on public.ia_artifacts; drop function if exists public.ia_audit_trigger();
-- drop table if exists public.ia_audit_log; drop function if exists public.ia_area_ok(text);
-- (recrear ia_artifacts_write como en 20260710100000_ia_fabrica.sql)
