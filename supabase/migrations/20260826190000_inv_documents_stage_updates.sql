-- Ruta de la inversión: soportes y actualizaciones asociados a una etapa.
-- Aditivo: las filas anteriores quedan como soportes generales.
alter table public.inv_documents
  add column if not exists etapa text not null default 'general',
  add column if not exists descripcion text,
  add column if not exists formato text not null default 'documento',
  add column if not exists fecha_evento date,
  add column if not exists duracion_estimada_dias integer;

alter table public.inv_documents drop constraint if exists inv_documents_etapa_check;
alter table public.inv_documents add constraint inv_documents_etapa_check
  check (etapa in ('general','capital','financiamiento','compra','remodelacion','estabilizacion','refi','operacion'));
alter table public.inv_documents drop constraint if exists inv_documents_formato_check;
alter table public.inv_documents add constraint inv_documents_formato_check
  check (formato in ('documento','imagen','link','nota'));
alter table public.inv_documents drop constraint if exists inv_documents_duracion_check;
alter table public.inv_documents add constraint inv_documents_duracion_check
  check (duracion_estimada_dias is null or duracion_estimada_dias >= 0);

comment on column public.inv_documents.etapa is 'Etapa de la ruta del inversionista; general aparece en todas.';
comment on column public.inv_documents.descripcion is 'Explicación humana del soporte o actualización.';
comment on column public.inv_documents.formato is 'documento, imagen, link o nota.';
