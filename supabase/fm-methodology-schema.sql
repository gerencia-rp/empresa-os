-- ============================================================
-- FlipMentoría · Biblioteca Metodológica
-- Sistema robusto: 71 tareas, 400+ contactos, procesos, extras
-- ============================================================

-- 1) Tabla principal de documentos
create table if not exists public.fm_documents (
  id uuid primary key default gen_random_uuid(),
  etapa text not null,             -- 'E0', 'E1', 'E2', 'E3', 'E4', 'E5', 'INDICE', 'ANEXO_A', 'ANEXO_B', 'ANEXO_C'
  categoria text not null,         -- 'tareas', 'contactos', 'procesos', 'extras', 'caso_estudio', 'calculadoras', 'mindset', 'indice', 'lista_tareas'
  codigo text,                     -- 'E0.1.1', 'B.1', 'C.3' o null
  titulo text not null,
  subtitulo text,
  contenido_md text not null,
  metadata jsonb default '{}'::jsonb,
  tags text[] default '{}',
  posicion int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists fm_documents_etapa_idx on public.fm_documents(etapa, categoria, posicion);
create index if not exists fm_documents_codigo_idx on public.fm_documents(codigo);
create index if not exists fm_documents_search_idx on public.fm_documents using gin (to_tsvector('spanish', titulo || ' ' || contenido_md));
create index if not exists fm_documents_tags_idx on public.fm_documents using gin (tags);

-- RLS: admin/mentor lee/escribe, estudiantes solo leen
alter table public.fm_documents enable row level security;

drop policy if exists "FM docs - lectura todos autenticados" on public.fm_documents;
create policy "FM docs - lectura todos autenticados" on public.fm_documents
  for select using (auth.role() = 'authenticated');

drop policy if exists "FM docs - admin/service total" on public.fm_documents;
create policy "FM docs - admin/service total" on public.fm_documents
  for all using (auth.role() = 'service_role' or exists(
    select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','mentor')
  ));

-- 2) Registrar el sistema en area education
insert into public.systems (id, area_id, type, name, icon, description, config, data, position) values
  ('edu-methodology', 'education', 'edu-methodology',
   'Metodología FlipMentoría', '📘',
   'Sistema operativo completo: 71 tareas E0-E5, 400+ contactos verificados, procesos, plantillas, KPIs, scripts, casos de estudio, calculadoras y mindset.',
   '{}'::jsonb, '{}'::jsonb, 3)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  type = excluded.type,
  area_id = excluded.area_id;

select 'Schema fm_methodology creado + sistema registrado' as status;
