-- Expedientes de soporte para cerrar hallazgos financieros sin alterar libros.
-- Un soporte verificado NO resuelve un hallazgo: la regla fuente debe dejar de
-- dispararse en una corrida posterior. Esto preserva evidencia y segregación.

create table if not exists public.financial_finding_evidence (
  id uuid primary key default gen_random_uuid(),
  finding_id uuid not null references public.ct_findings(id) on delete restrict,
  evidence_type text not null check (evidence_type in
    ('statement','factura','recibo','payoff','extension','ledger','nomina','conciliacion','otro')),
  title text not null check (length(btrim(title)) between 3 and 160),
  artifact_url text not null check (artifact_url ~ '^https://'),
  notes text,
  source_date date,
  status text not null default 'submitted' check (status in ('submitted','verified','rejected')),
  submitted_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  submitted_at timestamptz not null default now(),
  verified_by uuid references auth.users(id) on delete restrict,
  verified_at timestamptz,
  verification_note text,
  constraint financial_evidence_verification_consistent check (
    (status='submitted' and verified_by is null and verified_at is null)
    or (status in ('verified','rejected') and verified_by is not null and verified_at is not null
      and verified_by<>submitted_by)
  )
);

create index if not exists financial_finding_evidence_finding_idx
  on public.financial_finding_evidence(finding_id,submitted_at desc);
alter table public.financial_finding_evidence enable row level security;

drop policy if exists financial_finding_evidence_read on public.financial_finding_evidence;
create policy financial_finding_evidence_read on public.financial_finding_evidence
  for select to authenticated using (public.has_area('contable'));

drop policy if exists financial_finding_evidence_insert on public.financial_finding_evidence;
create policy financial_finding_evidence_insert on public.financial_finding_evidence
  for insert to authenticated with check (
    public.has_area('contable') and submitted_by=auth.uid() and status='submitted'
  );

drop policy if exists financial_finding_evidence_verify on public.financial_finding_evidence;

create or replace function public.register_financial_finding_evidence(
  p_finding_id uuid,p_evidence_type text,p_title text,p_artifact_url text,
  p_notes text default null,p_source_date date default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_user uuid:=auth.uid();
begin
  if v_user is null or not public.has_area('contable') then
    raise exception 'No autorizado para registrar soporte financiero';
  end if;
  if p_artifact_url is null or p_artifact_url !~ '^https://' then
    raise exception 'El soporte debe usar un enlace https verificable';
  end if;
  if not exists(select 1 from public.ct_findings
    where id=p_finding_id and active and resolved_at is null and archived_at is null) then
    raise exception 'El hallazgo no existe o ya no está abierto';
  end if;
  insert into public.financial_finding_evidence
    (finding_id,evidence_type,title,artifact_url,notes,source_date,submitted_by)
  values(p_finding_id,p_evidence_type,btrim(p_title),p_artifact_url,nullif(btrim(p_notes),''),p_source_date,v_user)
  returning id into v_id;
  return v_id;
end $$;

revoke all on function public.register_financial_finding_evidence(uuid,text,text,text,text,date) from public;
grant execute on function public.register_financial_finding_evidence(uuid,text,text,text,text,date) to authenticated;

create or replace function public.verify_financial_finding_evidence(
  p_evidence_id uuid,p_accept boolean,p_verification_note text
) returns text language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_submitter uuid; v_status text;
begin
  if v_user is null or not public.is_admin() then
    raise exception 'Solo un administrador puede verificar soportes';
  end if;
  if length(btrim(coalesce(p_verification_note,'')))<10 then
    raise exception 'La verificación requiere una nota de al menos 10 caracteres';
  end if;
  select submitted_by,status into v_submitter,v_status
  from public.financial_finding_evidence where id=p_evidence_id for update;
  if v_submitter is null then raise exception 'El soporte no existe'; end if;
  if v_status<>'submitted' then raise exception 'El soporte ya fue revisado'; end if;
  if v_submitter=v_user then
    raise exception 'Quien adjunta un soporte no puede verificarlo';
  end if;
  update public.financial_finding_evidence set
    status=case when p_accept then 'verified' else 'rejected' end,
    verified_by=v_user,verified_at=now(),verification_note=btrim(p_verification_note)
  where id=p_evidence_id;
  return case when p_accept then 'verified' else 'rejected' end;
end $$;

revoke all on function public.verify_financial_finding_evidence(uuid,boolean,text) from public;
grant execute on function public.verify_financial_finding_evidence(uuid,boolean,text) to authenticated;

create or replace view public.v_financial_finding_evidence_status
with (security_invoker=true) as
select f.id finding_id,
  count(e.id)::int evidence_count,
  count(e.id) filter(where e.status='verified')::int verified_count,
  count(e.id) filter(where e.status='submitted')::int pending_verification_count,
  count(e.id) filter(where e.status='rejected')::int rejected_count,
  max(e.submitted_at) last_evidence_at,
  case
    when count(e.id)=0 then 'sin_soporte'
    when count(e.id) filter(where e.status<>'rejected')=0 then 'soporte_rechazado'
    when count(e.id) filter(where e.status='verified')=0 then 'pendiente_verificacion'
    else 'soporte_verificado_fuente_pendiente'
  end closure_state
from public.ct_findings f
left join public.financial_finding_evidence e on e.finding_id=f.id
where f.active and f.resolved_at is null and f.archived_at is null
group by f.id;

grant select on public.financial_finding_evidence,public.v_financial_finding_evidence_status to authenticated;
comment on view public.v_financial_finding_evidence_status is
  'Estado del expediente. Soporte verificado nunca equivale a resolución; la fuente debe pasar la regla.';
