-- Hace explícita y verificable la mesa de trabajo del escaneo financiero.
-- La función conserva exactamente sus reglas C10/C11/C12/C15, pero deja de
-- depender de una tabla temporal invisible para el analizador de la base.
-- El candado transaccional evita que dos corridas mezclen resultados.
create table if not exists public.financial_scan_current (
  check_id text not null,
  empresa text not null,
  clave text not null,
  titulo text not null,
  detalle jsonb not null,
  fuente text not null,
  impacto_usd numeric not null,
  severidad text not null,
  primary key(check_id,clave)
);

alter table public.financial_scan_current enable row level security;

drop policy if exists financial_scan_current_contable_read
  on public.financial_scan_current;
create policy financial_scan_current_contable_read
  on public.financial_scan_current
  for select to authenticated
  using (public.has_area('contable'));

revoke all on table public.financial_scan_current from anon,authenticated;
grant select on table public.financial_scan_current to authenticated;
grant all on table public.financial_scan_current to service_role;

comment on table public.financial_scan_current is
  'Snapshot protegido de la última corrida C10/C11/C12/C15. Es evidencia de auditoría; no modifica fuentes financieras.';

do $migration$
declare
  v_definition text;
  v_lower text;
  v_start int;
  v_tail int;
  v_end int;
  v_marker text := ') on commit drop;';
begin
  select pg_get_functiondef('public.run_financial_source_scan()'::regprocedure)
    into v_definition;
  v_lower := lower(v_definition);
  v_start := strpos(v_lower,'create temporary table financial_scan_current');
  if v_start=0 then
    raise exception 'No se encontró la mesa temporal esperada en run_financial_source_scan';
  end if;
  v_tail := strpos(substr(v_lower,v_start),v_marker);
  if v_tail=0 then
    raise exception 'No se encontró el cierre de la mesa temporal esperada';
  end if;
  v_end := v_start+v_tail+length(v_marker)-2;
  v_definition := substr(v_definition,1,v_start-1)
    || E'perform pg_advisory_xact_lock(hashtextextended(''run_financial_source_scan'',0));\n  truncate table financial_scan_current;'
    || substr(v_definition,v_end+1);
  v_definition := replace(v_definition,'financial_scan_current','public.financial_scan_current');
  execute v_definition;
end
$migration$;

revoke all on function public.run_financial_source_scan() from public;
grant execute on function public.run_financial_source_scan() to postgres,service_role;

-- Comprueba la equivalencia funcional y actualiza la evidencia viva.
select public.run_financial_source_scan();
select public.run_data_integrity_review();
select public.run_financial_exception_triage();
