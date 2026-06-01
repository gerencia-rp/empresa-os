-- ============================================================
-- Extender diagnoses para soportar archivos Taskade (Visita Previa)
-- ============================================================

alter table public.remodel_forecast_diagnoses
  add column if not exists detalle jsonb default '{}'::jsonb,
  add column if not exists archivo_url text,
  add column if not exists archivo_nombre text,
  add column if not exists taskade_id text unique,
  add column if not exists veredicto text,
  add column if not exists dano_global_pct numeric;

create index if not exists rfd_taskade on public.remodel_forecast_diagnoses(taskade_id);
create index if not exists rfd_dano on public.remodel_forecast_diagnoses(dano_global_pct desc);

-- Storage bucket para archivos crudos de Taskade
insert into storage.buckets (id, name, public)
values ('taskade-visitas', 'taskade-visitas', false)
on conflict (id) do nothing;

-- Políticas de Storage (usuarios autenticados pueden subir y leer)
drop policy if exists "taskade_visitas_upload" on storage.objects;
create policy "taskade_visitas_upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'taskade-visitas');

drop policy if exists "taskade_visitas_read" on storage.objects;
create policy "taskade_visitas_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'taskade-visitas');

drop policy if exists "taskade_visitas_update" on storage.objects;
create policy "taskade_visitas_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'taskade-visitas');

drop policy if exists "taskade_visitas_delete" on storage.objects;
create policy "taskade_visitas_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'taskade-visitas');
