-- Keep one open decision per agent/type/dedup key while refreshing its evidence.
-- This prevents a still-valid finding from becoming stale merely because it was
-- already present in the decision queue. The function cannot approve or execute.

alter table public.agent_proposals
  add column if not exists last_validated_at timestamptz;

update public.agent_proposals
set last_validated_at = coalesce(created_at, now())
where last_validated_at is null;

create index if not exists agent_proposals_open_dedup_idx
  on public.agent_proposals(agent_id, tipo_accion, ((payload->>'dedup_key')))
  where estado='propuesta' and deleted_at is null and payload ? 'dedup_key';

create or replace function public.record_agent_proposal(
  p_agent_id uuid,
  p_tipo_accion text,
  p_payload jsonb,
  p_evidencia jsonb
) returns table(proposal_id uuid, outcome text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_key text := nullif(btrim(p_payload->>'dedup_key'), '');
begin
  if p_agent_id is null or nullif(btrim(p_tipo_accion),'') is null or v_key is null then
    raise exception 'agent_id, tipo_accion and payload.dedup_key are required';
  end if;
  if not exists (
    select 1 from public.agent_registry
    where id=p_agent_id and deleted_at is null and coalesce(enabled,true)
  ) then
    raise exception 'agent is missing or disabled';
  end if;

  select id into v_id
  from public.agent_proposals
  where agent_id=p_agent_id
    and tipo_accion=p_tipo_accion
    and estado='propuesta'
    and deleted_at is null
    and payload->>'dedup_key'=v_key
  order by created_at desc
  limit 1
  for update;

  if v_id is null then
    insert into public.agent_proposals(
      agent_id,tipo_accion,estado,payload,evidencia,last_validated_at
    ) values (
      p_agent_id,p_tipo_accion,'propuesta',p_payload,p_evidencia,now()
    ) returning id into v_id;
    return query select v_id,'created'::text;
  else
    update public.agent_proposals
    set payload=p_payload,
        evidencia=p_evidencia,
        last_validated_at=now()
    where id=v_id;
    return query select v_id,'refreshed'::text;
  end if;
end;
$$;

revoke all on function public.record_agent_proposal(uuid,text,jsonb,jsonb) from public;
grant execute on function public.record_agent_proposal(uuid,text,jsonb,jsonb) to agentes_ia_exec;
grant execute on function public.record_agent_proposal(uuid,text,jsonb,jsonb) to service_role;

comment on function public.record_agent_proposal(uuid,text,jsonb,jsonb) is
  'Creates or refreshes an open agent proposal. Never approves, rejects, or executes work.';

