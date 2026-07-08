-- ════════════════════════════════════════════════════════════════
-- 💎 INVERSIONISTAS · CAPA DE PRODUCTO (FlipTrack) — F1: distribuciones, mensajes,
-- documentos con audit, deals/pipeline (F2-ready), expenses. ADITIVA, rollback al pie.
-- Guard duro: el inversionista NUNCA lee inv_deals (markup) — el link público sale
-- por RPC sanitizada con WHITELIST de campos.
-- ════════════════════════════════════════════════════════════════

-- inv_access: rol + filtro opcional de propiedades
alter table public.inv_access add column if not exists rol text not null default 'investor';
alter table public.inv_access add column if not exists property_filter jsonb;

-- inv_documents: audit log (quién vio/descargó)
alter table public.inv_documents add column if not exists audit jsonb not null default '[]'::jsonb;

create table if not exists public.inv_deals (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null,
  etapa text not null default 'preventa' check (etapa in ('preventa','gestion','salida')),
  modelo text not null default 'brrrr' check (modelo in ('fixflip','fixhold','brrrr')),
  proposal jsonb not null default '{}'::jsonb,     -- adquisición/remodelación/holding/intereses/costos venta/markup_empresa/estructura/escenarios ARV±10%
  tracking jsonb not null default '{}'::jsonb,     -- rehab + capital (etapa 2)
  closure jsonb,                                   -- cierre (etapa 3) + reversible_until (48h)
  public_link_id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  active boolean not null default true, archived_at timestamptz,
  unique (property_id)
);

create table if not exists public.inv_expenses (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null,
  categoria text not null,
  presupuesto numeric not null default 0,
  real numeric not null default 0,
  notas text,
  updated_at timestamptz not null default now(),
  active boolean not null default true, archived_at timestamptz
);

create table if not exists public.inv_distributions (
  id uuid primary key default gen_random_uuid(),
  investor_airtable_id text not null,
  property_id uuid not null,
  fecha date not null,
  tipo text not null default 'utilidad' check (tipo in ('utilidad','refi','venta','devolucion_capital')),
  monto numeric not null,
  estado text not null default 'programada' check (estado in ('programada','pagada')),
  k1_url text,
  notas text,
  created_at timestamptz not null default now(),
  active boolean not null default true, archived_at timestamptz
);

create table if not exists public.inv_messages (
  id uuid primary key default gen_random_uuid(),
  investor_airtable_id text,                       -- null + property_id = broadcast a los holders de la casa
  property_id uuid,
  de text not null default 'admin' check (de in ('admin','inversionista')),
  asunto text,
  cuerpo text not null,
  read_by jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  active boolean not null default true, archived_at timestamptz
);

-- ── RLS ──
alter table public.inv_deals enable row level security;
alter table public.inv_expenses enable row level security;
alter table public.inv_distributions enable row level security;
alter table public.inv_messages enable row level security;

-- inv_deals: SOLO fix-flip (el markup vive acá — el inversionista jamás lo lee)
drop policy if exists inv_deals_admin on public.inv_deals;
create policy inv_deals_admin on public.inv_deals for all to authenticated
  using (public.has_area('fix-flip')) with check (public.has_area('fix-flip'));

drop policy if exists inv_expenses_read on public.inv_expenses;
create policy inv_expenses_read on public.inv_expenses for select to authenticated
  using (property_id in (select public.inv_my_props()) or public.has_area('fix-flip'));
drop policy if exists inv_expenses_write on public.inv_expenses;
create policy inv_expenses_write on public.inv_expenses for all to authenticated
  using (public.has_area('fix-flip')) with check (public.has_area('fix-flip'));

drop policy if exists inv_dist_read on public.inv_distributions;
create policy inv_dist_read on public.inv_distributions for select to authenticated
  using (investor_airtable_id in (select public.inv_my_ids()) or public.has_area('fix-flip'));
drop policy if exists inv_dist_write on public.inv_distributions;
create policy inv_dist_write on public.inv_distributions for all to authenticated
  using (public.has_area('fix-flip')) with check (public.has_area('fix-flip'));

drop policy if exists inv_msg_read on public.inv_messages;
create policy inv_msg_read on public.inv_messages for select to authenticated
  using (
    public.has_area('fix-flip')
    or investor_airtable_id in (select public.inv_my_ids())
    or (investor_airtable_id is null and property_id in (select public.inv_my_props()))
  );
drop policy if exists inv_msg_admin_write on public.inv_messages;
create policy inv_msg_admin_write on public.inv_messages for all to authenticated
  using (public.has_area('fix-flip')) with check (public.has_area('fix-flip'));
drop policy if exists inv_msg_investor_send on public.inv_messages;
create policy inv_msg_investor_send on public.inv_messages for insert to authenticated
  with check (de = 'inversionista' and investor_airtable_id in (select public.inv_my_ids()));

-- ── RPCs (SECURITY DEFINER, superficie mínima) ──
-- Propuesta pública SANITIZADA (whitelist — el markup y la estructura interna NUNCA salen)
create or replace function public.inv_proposal_public(link uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare d record; pr jsonb; esc jsonb;
begin
  select * into d from inv_deals where public_link_id = link and active limit 1;
  if d is null then return jsonb_build_object('ok', false, 'error', 'propuesta no encontrada'); end if;
  pr := coalesce(d.proposal, '{}'::jsonb);
  esc := coalesce(pr->'escenarios', '[]'::jsonb);
  return jsonb_build_object('ok', true,
    'modelo', d.modelo, 'etapa', d.etapa,
    'direccion', pr->>'direccion',
    'precio_total', pr->'precio_total',            -- precio AL INVERSIONISTA (ya con markup adentro)
    'arv', pr->'arv', 'renta_proyectada', pr->'renta_proyectada',
    'estructura', pr->'estructura_publica',        -- solo la parte pública de la estructura
    'escenarios', esc,
    'retornos', pr->'retornos_publicos');
end $$;
grant execute on function public.inv_proposal_public(uuid) to anon, authenticated;

-- Marcar mensaje leído (agrega mi email a read_by; solo si soy destinatario)
create or replace function public.inv_msg_marcar_leido(msg uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare em text; ok boolean;
begin
  em := lower(coalesce(auth.jwt() ->> 'email', ''));
  if em = '' then return jsonb_build_object('ok', false); end if;
  update inv_messages set read_by = read_by || to_jsonb(em)
  where id = msg and active and not (read_by ? em)
    and (investor_airtable_id in (select inv_my_ids())
         or (investor_airtable_id is null and property_id in (select inv_my_props()))
         or public.has_area('fix-flip'));
  get diagnostics ok = row_count;
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.inv_msg_marcar_leido(uuid) to authenticated;

-- Audit de documentos (quién vio/descargó, cuándo) — lo llama el propio portal
create or replace function public.inv_doc_log(doc uuid, accion text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare em text;
begin
  em := lower(coalesce(auth.jwt() ->> 'email', ''));
  if em = '' then return jsonb_build_object('ok', false); end if;
  update inv_documents set audit = audit || jsonb_build_object('email', em, 'accion', coalesce(accion,'ver'), 'at', now())
  where id = doc and active
    and (property_id in (select inv_my_props()) or public.has_area('fix-flip'));
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.inv_doc_log(uuid, text) to authenticated;

-- ─────────────────────────────────────────────────────────────────
-- ROLLBACK: drop table inv_deals/inv_expenses/inv_distributions/inv_messages;
--   alter table inv_documents drop column audit; alter table inv_access drop column rol, drop column property_filter;
--   drop function inv_proposal_public, inv_msg_marcar_leido, inv_doc_log;
-- ─────────────────────────────────────────────────────────────────
