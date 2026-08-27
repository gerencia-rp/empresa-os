-- Telemetría mensual y atómica de RentCast. No impone una cuota desconocida.
alter table public.rentcast_usage add column if not exists period_start date;
alter table public.rentcast_usage add column if not exists success_calls int not null default 0;
alter table public.rentcast_usage add column if not exists failed_calls int not null default 0;
alter table public.rentcast_usage add column if not exists last_status int;
alter table public.rentcast_usage add column if not exists last_error text;
alter table public.rentcast_usage add column if not exists monthly_limit int;
alter table public.rentcast_usage add column if not exists updated_at timestamptz not null default now();

update public.rentcast_usage set period_start=date_trunc('month',coalesce(ultima,now()))::date
 where period_start is null;
alter table public.rentcast_usage alter column period_start set default date_trunc('month',now())::date;
alter table public.rentcast_usage alter column period_start set not null;

create or replace function public.record_rentcast_call(p_status int,p_error text default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v public.rentcast_usage%rowtype; v_month date:=date_trunc('month',now())::date;
begin
  insert into public.rentcast_usage(id,llamadas,period_start) values(1,0,v_month)
  on conflict(id) do nothing;
  select * into v from public.rentcast_usage where id=1 for update;
  if v.period_start<>v_month then
    update public.rentcast_usage set llamadas=0,success_calls=0,failed_calls=0,
      period_start=v_month,last_status=null,last_error=null,updated_at=now() where id=1;
  end if;
  update public.rentcast_usage set llamadas=llamadas+1,
    success_calls=success_calls+(case when p_status between 200 and 299 then 1 else 0 end),
    failed_calls=failed_calls+(case when p_status between 200 and 299 then 0 else 1 end),
    ultima=now(),last_status=p_status,last_error=case when p_status between 200 and 299 then null else left(p_error,500) end,
    updated_at=now() where id=1 returning * into v;
  return jsonb_build_object('period_start',v.period_start,'calls',v.llamadas,'success',v.success_calls,
    'failed',v.failed_calls,'last_status',v.last_status,'monthly_limit',v.monthly_limit);
end $$;
revoke all on function public.record_rentcast_call(int,text) from public,anon,authenticated;
grant execute on function public.record_rentcast_call(int,text) to service_role;
comment on function public.record_rentcast_call(int,text) is
 'Registra de forma atómica uso mensual y salud de RentCast. No bloquea por cuota ni expone la llave.';
