-- Retire open findings that disappeared from a complete fresh scan.
-- This only soft-hides unapproved proposals; it never executes or rejects work.
create or replace function public.reconcile_agent_proposal_set(
  p_agent_id uuid,
  p_tipo_accion text,
  p_dedup_prefix text,
  p_seen_keys text[]
) returns integer
language plpgsql
security definer
set search_path=public
as $$
declare v_retired int:=0;
begin
  if p_agent_id is null or nullif(btrim(p_tipo_accion),'') is null
     or nullif(btrim(p_dedup_prefix),'') is null then
    raise exception 'agent_id, tipo_accion and dedup prefix are required';
  end if;
  if not exists(select 1 from public.agent_registry
    where id=p_agent_id and deleted_at is null and coalesce(enabled,true)) then
    raise exception 'agent is missing or disabled';
  end if;

  update public.agent_proposals
  set deleted_at=now(), evidencia=coalesce(evidencia,'{}'::jsonb)||jsonb_build_object(
    'retired_reason','El hallazgo desapareció en una revisión completa posterior',
    'retired_at',now()
  )
  where agent_id=p_agent_id and tipo_accion=p_tipo_accion
    and estado='propuesta' and deleted_at is null
    and payload->>'dedup_key' like p_dedup_prefix||'%'
    and not ((payload->>'dedup_key')=any(coalesce(p_seen_keys,array[]::text[])));
  get diagnostics v_retired=row_count;
  return v_retired;
end $$;

revoke all on function public.reconcile_agent_proposal_set(uuid,text,text,text[]) from public;
grant execute on function public.reconcile_agent_proposal_set(uuid,text,text,text[]) to agentes_ia_exec,service_role;
comment on function public.reconcile_agent_proposal_set(uuid,text,text,text[]) is
  'Soft-retires unapproved findings absent from a complete fresh scan. Never performs the proposed action.';

