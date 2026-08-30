-- Manual Operativo Vivo: áreas, posiciones, tareas declaradas, procesos y SOPs.
-- Capturar/documentar NO ejecuta acciones ni convierte una tarea en automatización.

create extension if not exists pgcrypto;

create table if not exists public.ops_areas (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  empresa text not null,
  nombre text not null,
  proposito text,
  resultado_esperado text,
  sistemas text[] not null default '{}',
  kpis jsonb not null default '[]'::jsonb,
  riesgos jsonb not null default '[]'::jsonb,
  estado text not null default 'borrador' check (estado in ('borrador','en_revision','validada','archivada')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.ops_positions (
  id uuid primary key default gen_random_uuid(),
  area_id uuid not null references public.ops_areas(id),
  titulo text not null,
  mision text,
  tipo text not null default 'humana' check (tipo in ('humana','agente_ia','hibrida')),
  reporta_a_id uuid references public.ops_positions(id),
  responsabilidades jsonb not null default '[]'::jsonb,
  decisiones_permitidas jsonb not null default '[]'::jsonb,
  sistemas text[] not null default '{}',
  skills text[] not null default '{}',
  kpis jsonb not null default '[]'::jsonb,
  horario text,
  respaldo text,
  agent_registry_id uuid references public.agent_registry(id),
  estado text not null default 'borrador' check (estado in ('borrador','en_revision','validada','archivada')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.ops_task_intake (
  id uuid primary key default gen_random_uuid(),
  area_id uuid not null references public.ops_areas(id),
  position_id uuid references public.ops_positions(id),
  titulo text not null,
  descripcion text,
  frecuencia text,
  disparador text,
  duracion_minutos integer check (duracion_minutos is null or duracion_minutos between 0 and 10080),
  sistemas text[] not null default '{}',
  entradas text,
  resultado text,
  destinatario text,
  problemas text,
  consecuencia text,
  evidencia_requerida text,
  requiere_aprobacion boolean not null default false,
  nivel_riesgo text not null default 'bajo' check (nivel_riesgo in ('bajo','medio','alto','critico')),
  fuente text not null default 'equipo' check (fuente in ('equipo','clickup','airtable','quickbooks','supabase','observacion','otro')),
  clasificacion text check (clasificacion is null or clasificacion in ('conservar','simplificar','eliminar','unificar','automatizar','asistir_ia','mantener_humana','requiere_informacion')),
  estado text not null default 'capturada' check (estado in ('capturada','en_revision','validada','disenada_para_agente','prueba_supervisada','operativa','archivada')),
  created_by uuid not null default auth.uid() references auth.users(id),
  validated_by uuid references auth.users(id),
  validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.ops_processes (
  id uuid primary key default gen_random_uuid(),
  area_id uuid not null references public.ops_areas(id),
  nombre text not null,
  objetivo text,
  disparador text,
  owner_position_id uuid references public.ops_positions(id),
  tiempo_objetivo_horas numeric check (tiempo_objetivo_horas is null or tiempo_objetivo_horas >= 0),
  kpi text,
  estado_actual text,
  estado_futuro text,
  estado text not null default 'borrador' check (estado in ('borrador','en_revision','validado','activo','archivado')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.ops_process_steps (
  id uuid primary key default gen_random_uuid(),
  process_id uuid not null references public.ops_processes(id) on delete cascade,
  orden integer not null check (orden > 0),
  titulo text not null,
  descripcion text,
  position_id uuid references public.ops_positions(id),
  sistema text,
  requiere_aprobacion boolean not null default false,
  evidencia_requerida text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(process_id, orden)
);

create table if not exists public.ops_sops (
  id uuid primary key default gen_random_uuid(),
  area_id uuid not null references public.ops_areas(id),
  process_id uuid references public.ops_processes(id),
  position_id uuid references public.ops_positions(id),
  titulo text not null,
  proposito text,
  cuando_usar text,
  requisitos text,
  pasos jsonb not null default '[]'::jsonb,
  resultado_esperado text,
  evidencia_requerida text,
  errores_frecuentes text,
  recuperacion text,
  escalamiento text,
  version integer not null default 1 check (version > 0),
  estado text not null default 'borrador' check (estado in ('borrador','en_revision','vigente','obsoleto','archivado')),
  created_by uuid references auth.users(id),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.ops_manual_audit (
  id bigint generated always as identity primary key,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  actor_id uuid references auth.users(id),
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ops_positions_area_idx on public.ops_positions(area_id) where deleted_at is null;
create index if not exists ops_tasks_area_status_idx on public.ops_task_intake(area_id, estado) where deleted_at is null;
create index if not exists ops_tasks_creator_idx on public.ops_task_intake(created_by, created_at desc) where deleted_at is null;
create index if not exists ops_processes_area_idx on public.ops_processes(area_id) where deleted_at is null;
create index if not exists ops_sops_area_status_idx on public.ops_sops(area_id, estado) where deleted_at is null;

create or replace function public.ops_manual_touch() returns trigger
language plpgsql as $$ begin new.updated_at=now(); return new; end $$;

create or replace function public.ops_manual_log() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  insert into public.ops_manual_audit(entity_type,entity_id,action,actor_id,before_data,after_data)
  values (tg_table_name,coalesce(new.id,old.id),tg_op,auth.uid(),case when tg_op='INSERT' then null else to_jsonb(old) end,case when tg_op='DELETE' then null else to_jsonb(new) end);
  return coalesce(new,old);
end $$;

create or replace function public.ops_manual_validate_state() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if tg_table_name='ops_task_intake' and new.estado in ('validada','disenada_para_agente','prueba_supervisada','operativa')
     and old.estado is distinct from new.estado then
    if not public.ops_manual_manager() then raise exception 'Solo un responsable puede validar una tarea'; end if;
    new.validated_by=auth.uid(); new.validated_at=now();
  end if;
  if tg_table_name='ops_sops' and new.estado='vigente' and old.estado is distinct from new.estado then
    if not public.ops_manual_manager() then raise exception 'Solo un responsable puede publicar un SOP'; end if;
    new.approved_by=auth.uid(); new.approved_at=now();
  end if;
  return new;
end $$;

do $$ declare t text; begin
  foreach t in array array['ops_areas','ops_positions','ops_task_intake','ops_processes','ops_process_steps','ops_sops'] loop
    execute format('drop trigger if exists %I_touch on public.%I',t,t);
    execute format('create trigger %I_touch before update on public.%I for each row execute function public.ops_manual_touch()',t,t);
    execute format('drop trigger if exists %I_audit on public.%I',t,t);
    execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function public.ops_manual_log()',t,t);
  end loop;
end $$;

drop trigger if exists ops_task_intake_validate_state on public.ops_task_intake;
create trigger ops_task_intake_validate_state before update on public.ops_task_intake
for each row execute function public.ops_manual_validate_state();
drop trigger if exists ops_sops_validate_state on public.ops_sops;
create trigger ops_sops_validate_state before update on public.ops_sops
for each row execute function public.ops_manual_validate_state();

alter table public.ops_areas enable row level security;
alter table public.ops_positions enable row level security;
alter table public.ops_task_intake enable row level security;
alter table public.ops_processes enable row level security;
alter table public.ops_process_steps enable row level security;
alter table public.ops_sops enable row level security;
alter table public.ops_manual_audit enable row level security;

create or replace function public.ops_manual_manager() returns boolean
language sql security definer stable set search_path=public as $$
  select public.is_admin() or public.has_area('operacion') or public.has_area('ia')
$$;

do $$ declare t text; begin
  foreach t in array array['ops_areas','ops_positions','ops_task_intake','ops_processes','ops_process_steps','ops_sops'] loop
    execute format('drop policy if exists %I_read on public.%I',t,t);
    execute format('create policy %I_read on public.%I for select to authenticated using (true)',t,t);
    execute format('drop policy if exists %I_manager_write on public.%I',t,t);
    execute format('create policy %I_manager_write on public.%I for all to authenticated using (public.ops_manual_manager()) with check (public.ops_manual_manager())',t,t);
  end loop;
end $$;

drop policy if exists ops_task_team_insert on public.ops_task_intake;
create policy ops_task_team_insert on public.ops_task_intake for insert to authenticated
with check (created_by=auth.uid());
drop policy if exists ops_task_own_draft_update on public.ops_task_intake;
create policy ops_task_own_draft_update on public.ops_task_intake for update to authenticated
using (created_by=auth.uid() and estado in ('capturada','en_revision'))
with check (created_by=auth.uid() and estado in ('capturada','en_revision'));

drop policy if exists ops_manual_audit_read on public.ops_manual_audit;
create policy ops_manual_audit_read on public.ops_manual_audit for select to authenticated
using (public.ops_manual_manager());

insert into public.ops_areas(slug,empresa,nombre,proposito,resultado_esperado,sistemas,estado)
values
  ('holding-direccion','Holding','Dirección y Holding','Convertir información transversal en prioridades, decisiones y control.','Operación rentable, líquida y gobernada con evidencia.',array['Empresa OS','QuickBooks','Supabase'],'en_revision'),
  ('rentas','Rentas','Rentas','Mantener propiedades ocupadas, cobrar correctamente y atender la operación.','Ocupación saludable, cartera controlada y servicio verificable.',array['Airtable','QuickBooks','ClickUp','Empresa OS'],'en_revision'),
  ('remodelacion','Remodelación','Remodelación','Entregar obras dentro de alcance, costo, tiempo y estándar de calidad.','Obras terminadas, conciliadas y documentadas.',array['Airtable','ClickUp','Empresa OS'],'en_revision'),
  ('fix-flip','Fix & Flip','Fix & Flip','Adquirir, financiar, ejecutar y cerrar negocios rentables.','Deals con retorno, riesgo y salida controlados.',array['Airtable','RentCast','QuickBooks','Empresa OS'],'en_revision'),
  ('educacion','Educación','Educación','Acompañar al estudiante desde diagnóstico hasta ejecución verificable.','Estudiantes avanzando, entregables persistentes y bloqueos atendidos.',array['Empresa OS','Supabase'],'en_revision')
on conflict(slug) do nothing;

comment on table public.ops_task_intake is 'Bandeja declarativa del trabajo real. No ejecuta automatizaciones ni modifica agent_registry.';
comment on table public.ops_sops is 'Procedimientos versionados; vigente requiere aprobación explícita en la aplicación.';
