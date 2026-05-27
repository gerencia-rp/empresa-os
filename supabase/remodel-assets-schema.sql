-- ============================================================
-- Activos del proyecto de remodelación: Matterport, scope, audio, planos
-- ============================================================

alter table public.remodel_projects add column if not exists matterport_url text;
alter table public.remodel_projects add column if not exists scope_text text;
alter table public.remodel_projects add column if not exists scope_audio_path text;
alter table public.remodel_projects add column if not exists scope_audio_transcript text;
alter table public.remodel_projects add column if not exists plans jsonb default '[]'::jsonb;
alter table public.remodel_projects add column if not exists photos jsonb default '[]'::jsonb;

-- Storage bucket para todos los assets del proyecto
insert into storage.buckets (id, name, public)
values ('remodel-assets', 'remodel-assets', false)
on conflict (id) do nothing;

drop policy if exists "ra_storage_select" on storage.objects;
create policy "ra_storage_select" on storage.objects for select
  using (bucket_id = 'remodel-assets' and auth.role() = 'authenticated');

drop policy if exists "ra_storage_insert" on storage.objects;
create policy "ra_storage_insert" on storage.objects for insert
  with check (bucket_id = 'remodel-assets' and auth.role() = 'authenticated');

drop policy if exists "ra_storage_delete" on storage.objects;
create policy "ra_storage_delete" on storage.objects for delete
  using (bucket_id = 'remodel-assets' and auth.role() = 'authenticated');
