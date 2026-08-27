-- Reconciliación automática de cartera con la vista canónica.
-- Sustituye el C4 histórico (renta esperada - pagos por casa), que duplicaba
-- deuda y no neteaba saldos a favor, por v_cartera_inquilino.vencido_neto.
-- Solo observa y clasifica: nunca cobra, contacta ni modifica el ledger.
create or replace function public.reconcile_canonical_rent_ar()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_now timestamptz := now();
  v_min numeric := 200;
  v_critical numeric := 3000;
  v_open int := 0;
  v_resolved int := 0;
begin
  select coalesce((select value::numeric from public.ct_config where key='c4_deuda_min_usd' limit 1),200)
    into v_min;
  select coalesce((select value::numeric from public.ct_config where key='c4_critico_usd' limit 1),3000)
    into v_critical;

  -- Cierra la metodología anterior y cualquier mora canónica que ya desapareció.
  update public.ct_findings f
     set estado='resuelto',resolved_at=v_now,
         nota=case when f.clave not like 'ar-neto-%'
           then 'Metodología C4 reemplazada por cartera neta canónica; historial preservado.'
           else 'La mora neta ya no supera el umbral canónico; cierre automático con evidencia fresca.' end
   where f.check_id='C4' and f.active and f.resolved_at is null
     and (f.clave not like 'ar-neto-%' or not exists (
       select 1 from public.v_cartera_inquilino c
       where 'ar-neto-'||replace(c.tenant_id::text,'-','')=f.clave
         and coalesce(c.vencido_neto,0)>v_min));
  get diagnostics v_resolved=row_count;

  insert into public.ct_findings(
    check_id,empresa,clave,titulo,detalle,fuente,impacto_usd,severidad,
    estado,first_seen,last_seen,resolved_at,active)
  select 'C4','rentas','ar-neto-'||replace(c.tenant_id::text,'-',''),
    'Mora neta · '||coalesce(nullif(c.inquilino,''),nullif(c.casa,''),'Inquilino sin nombre')||': $'||
      to_char(coalesce(c.vencido_neto,0),'FM999G999G990D00')||
      ' (vencido $'||to_char(coalesce(c.vencido_bruto,0),'FM999G999G990D00')||
      ' − saldo a favor $'||to_char(coalesce(c.a_favor,0),'FM999G999G990D00')||')',
    jsonb_build_object('tenant_id',c.tenant_id,'inquilino',c.inquilino,'casa',c.casa,
      'vencido_bruto',coalesce(c.vencido_bruto,0),'a_favor',coalesce(c.a_favor,0),
      'vencido_neto',coalesce(c.vencido_neto,0),'mes_mas_viejo',c.mes_mas_viejo,
      'aging',c.aging,'casos',c.casos),
    'v_cartera_inquilino',round(coalesce(c.vencido_neto,0),2),
    case when coalesce(c.vencido_neto,0)>=v_critical then 'critica' else 'media' end,
    'abierto',v_now,v_now,null,true
  from public.v_cartera_inquilino c
  where coalesce(c.vencido_neto,0)>v_min
  on conflict(check_id,clave) do update set
    empresa=excluded.empresa,titulo=excluded.titulo,detalle=excluded.detalle,
    fuente=excluded.fuente,impacto_usd=excluded.impacto_usd,severidad=excluded.severidad,
    estado='abierto',last_seen=excluded.last_seen,resolved_at=null,active=true;
  get diagnostics v_open=row_count;

  return jsonb_build_object('ok',true,'fuente','v_cartera_inquilino',
    'abiertos_refrescados',v_open,'cerrados',v_resolved,'umbral_usd',v_min,
    'limite','No modifica pagos, cobros, mensajes ni ledger.');
end $$;

revoke all on function public.reconcile_canonical_rent_ar() from public;
grant execute on function public.reconcile_canonical_rent_ar() to postgres,service_role;
comment on function public.reconcile_canonical_rent_ar() is
 'Reconcilia C4 contra mora neta por inquilino. Observación solamente; no cobra ni altera fuentes.';

do $$ begin
  perform cron.unschedule(jobname) from cron.job where jobname='canonical-rent-ar-daily';
exception when others then null; end $$;
select cron.schedule('canonical-rent-ar-daily','25 12 * * *',
  $$select public.reconcile_canonical_rent_ar()$$);

select public.reconcile_canonical_rent_ar();
select public.run_financial_exception_triage();
select public.run_data_integrity_review();
