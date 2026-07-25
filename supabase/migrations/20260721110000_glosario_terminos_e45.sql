-- E4.5 mega-build: glosario_terminos (capa educativa, editable en admin, sin hardcode).
-- APLICADA por MCP 21-jul-2026 con seed de 35 términos ES/EN — ver migración
-- glosario_terminos_e45 en Supabase para el seed completo. Rollback: drop table glosario_terminos;
create table if not exists glosario_terminos (
  clave text primary key,
  termino_es text not null, termino_en text,
  que_es text not null, que_es_en text,
  para_que text, para_que_en text,
  formula text,
  ejemplo_template text,
  tema text not null default 'retorno' check (tema in ('retorno','deuda','propiedad','proceso')),
  orden int default 100,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table glosario_terminos enable row level security;
create policy glosario_read on glosario_terminos for select to authenticated using (true);
create policy glosario_write on glosario_terminos for all to authenticated
  using (has_area('fix-flip') and not inv_is_investor())
  with check (has_area('fix-flip') and not inv_is_investor());
