-- Fix & Flip · historial real de etapas para Optimización.
-- Aditiva y reversible: captura cambios futuros del espejo ff_deals; no intenta
-- reconstruir fechas pasadas. La fila inicial es baseline y queda excluida de
-- cualquier cálculo de duración.

create table if not exists public.ff_deal_stage_history (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.ff_deals(id),
  property_id uuid,
  airtable_id text,
  stage text not null,
  observed_at timestamptz not null,
  exited_at timestamptz,
  source text not null default 'sync-ff-airtable',
  source_sync_at timestamptz,
  is_baseline boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (exited_at is null or exited_at >= observed_at)
);

create unique index if not exists ff_stage_history_one_open
  on public.ff_deal_stage_history(deal_id) where exited_at is null;
create index if not exists ff_stage_history_stage_dates
  on public.ff_deal_stage_history(stage, observed_at, exited_at);
create index if not exists ff_stage_history_property
  on public.ff_deal_stage_history(property_id, observed_at);

create or replace function public.capture_ff_deal_stage_history()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_at timestamptz := coalesce(new.last_synced_at, now());
begin
  if tg_op='INSERT' then
    if nullif(btrim(coalesce(new.stage,'')), '') is not null then
      insert into ff_deal_stage_history
        (deal_id,property_id,airtable_id,stage,observed_at,source_sync_at,is_baseline,metadata)
      values
        (new.id,new.property_id,new.airtable_id,new.stage,v_at,new.last_synced_at,true,
         jsonb_build_object('reason','first_observation_not_historical_entry'))
      on conflict do nothing;
    end if;
    return new;
  end if;

  if old.stage is distinct from new.stage and nullif(btrim(coalesce(new.stage,'')), '') is not null then
    update ff_deal_stage_history set exited_at=v_at
      where deal_id=new.id and exited_at is null;
    insert into ff_deal_stage_history
      (deal_id,property_id,airtable_id,stage,observed_at,source_sync_at,is_baseline,metadata)
    values
      (new.id,new.property_id,new.airtable_id,new.stage,v_at,new.last_synced_at,false,
       jsonb_build_object('previous_stage',old.stage,'reason','observed_source_transition'));
  end if;
  return new;
end $$;

revoke all on function public.capture_ff_deal_stage_history() from public;

drop trigger if exists ff_deals_capture_stage_history on public.ff_deals;
create trigger ff_deals_capture_stage_history
after insert or update of stage on public.ff_deals
for each row execute function public.capture_ff_deal_stage_history();

insert into public.ff_deal_stage_history
  (deal_id,property_id,airtable_id,stage,observed_at,source_sync_at,is_baseline,metadata)
select d.id,d.property_id,d.airtable_id,d.stage,coalesce(d.last_synced_at,now()),d.last_synced_at,true,
       jsonb_build_object('reason','migration_baseline_not_historical_entry')
from public.ff_deals d
where d.active is not false and nullif(btrim(coalesce(d.stage,'')), '') is not null
  and not exists(select 1 from public.ff_deal_stage_history h where h.deal_id=d.id and h.exited_at is null);

create or replace view public.v_ff_stage_duration as
select id,deal_id,property_id,airtable_id,stage,observed_at,exited_at,
       extract(epoch from (exited_at-observed_at))/86400.0 as duration_days,
       source,source_sync_at
from public.ff_deal_stage_history
where is_baseline=false and exited_at is not null;

alter table public.ff_deal_stage_history enable row level security;
drop policy if exists ff_stage_history_area_read on public.ff_deal_stage_history;
create policy ff_stage_history_area_read on public.ff_deal_stage_history for select to authenticated
  using (public.has_area('fix-flip') or public.has_area('operacion'));

grant select on public.ff_deal_stage_history, public.v_ff_stage_duration to authenticated;
grant select on public.ff_deal_stage_history, public.v_ff_stage_duration to agentes_ia_exec;

do $$ begin
  perform cron.unschedule(jobname) from cron.job where jobname='ff-optimizacion-semanal';
exception when others then null; end $$;
select cron.schedule('ff-optimizacion-semanal','30 13 * * 4',
  $$select public.cron_invoke_function('ff-optimizacion?mode=revision')$$);

comment on table public.ff_deal_stage_history is
  'Observaciones reales de cambio de etapa. Baselines nunca se usan como duración histórica.';

-- ROLLBACK:
-- select cron.unschedule('ff-optimizacion-semanal');
-- drop trigger if exists ff_deals_capture_stage_history on public.ff_deals;
-- drop function if exists public.capture_ff_deal_stage_history();
-- drop view if exists public.v_ff_stage_duration;
-- drop table if exists public.ff_deal_stage_history;
