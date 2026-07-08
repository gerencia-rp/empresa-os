-- ════════════════════════════════════════════════════════════════
-- 💎 SISTEMA DE INVERSIONISTAS — Fase 1 (ADITIVA, rollback al pie).
-- Réplica del "Modelo financiero - Renta VF": params por casa (cero hardcode),
-- movimientos reales, cache de proyección, docs, y acceso con RLS ESTRICTO:
-- un inversionista SOLO ve sus casas, vía tablas inv_* (nunca ff_* directo).
-- property_id = llave. Reparto configurable por casa (default 50/50).
-- ════════════════════════════════════════════════════════════════

create table if not exists public.inv_access (
  id uuid primary key default gen_random_uuid(),
  investor_airtable_id text not null,            -- → ff_investors.airtable_id
  user_id uuid references auth.users(id),
  email text not null,
  estado text not null default 'invitado' check (estado in ('invitado','activo','revocado')),
  invited_at timestamptz default now(),
  claimed_at timestamptz,
  active boolean not null default true, archived_at timestamptz,
  unique (investor_airtable_id, email)
);

create table if not exists public.inv_holdings (
  id uuid primary key default gen_random_uuid(),
  investor_airtable_id text not null,
  property_id uuid not null,                     -- → properties.id (la CASA canónica)
  inversion_aportada numeric not null default 0,
  reparto_pct numeric not null default 0.5 check (reparto_pct >= 0 and reparto_pct <= 1),
  fecha_entrada date, fecha_salida date,
  notas text,
  active boolean not null default true, archived_at timestamptz,
  unique (investor_airtable_id, property_id)
);

create table if not exists public.inv_model_params (
  property_id uuid not null,
  key text not null,
  value text not null,
  fuente text not null default 'supuesto',       -- real:<tabla> | excel | modelo | supuesto
  descripcion text,
  updated_at timestamptz not null default now(),
  active boolean not null default true, archived_at timestamptz,
  primary key (property_id, key)
);

create table if not exists public.inv_cashflow_real (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null,
  fecha date not null,
  linea text not null,                           -- clave P&L (SUMIF del Excel)
  detalle text,
  tipo text not null check (tipo in ('ingreso','gasto')),
  categoria text not null default 'operativo' check (categoria in ('inversion','operativo','financiero','tax','ingreso')),
  item text, concepto text,
  valor numeric not null,
  id_factura text,
  fuente text not null default 'manual',         -- manual | airtable | qbo
  created_at timestamptz not null default now(),
  active boolean not null default true, archived_at timestamptz
);

create table if not exists public.inv_projection (
  property_id uuid not null,
  escenario text not null default 'realizado' check (escenario in ('estimado','proyectado','realizado','simulado')),
  data jsonb not null,                           -- salida completa del motor (meses/anios/series/indicadores)
  params_hash text,
  computed_at timestamptz not null default now(),
  active boolean not null default true, archived_at timestamptz,
  primary key (property_id, escenario)
);

create table if not exists public.inv_documents (
  id uuid primary key default gen_random_uuid(),
  property_id uuid,
  investor_airtable_id text,                     -- null = documento de la casa (lo ven todos sus holders)
  tipo text not null default 'otro',             -- w9 | operating_agreement | appraisal | comprobante | otro
  nombre text not null,
  url text not null,
  created_at timestamptz not null default now(),
  active boolean not null default true, archived_at timestamptz
);

-- ── Helpers RLS (SECURITY DEFINER: consultan sin recursión de policies) ──
create or replace function public.inv_my_ids() returns setof text
language sql stable security definer set search_path = public as $$
  select investor_airtable_id from inv_access
  where user_id = auth.uid() and estado = 'activo' and active;
$$;
create or replace function public.inv_my_props() returns setof uuid
language sql stable security definer set search_path = public as $$
  select h.property_id from inv_holdings h
  where h.active and h.investor_airtable_id in (select public.inv_my_ids());
$$;
grant execute on function public.inv_my_ids() to authenticated;
grant execute on function public.inv_my_props() to authenticated;

-- El inversionista reclama su acceso al loguearse (magic link) — matchea por email del JWT.
create or replace function public.inv_claim_access() returns jsonb
language plpgsql security definer set search_path = public as $$
declare em text; n int;
begin
  em := lower(coalesce(auth.jwt() ->> 'email', ''));
  if em = '' or auth.uid() is null then return jsonb_build_object('ok', false, 'error', 'sin sesión'); end if;
  update inv_access set user_id = auth.uid(), estado = 'activo', claimed_at = now()
  where lower(email) = em and active and estado <> 'revocado' and (user_id is null or user_id = auth.uid());
  get diagnostics n = row_count;
  return jsonb_build_object('ok', true, 'accesos', n);
end $$;
grant execute on function public.inv_claim_access() to authenticated;

-- ── RLS: inversionista lee SOLO lo suyo; escribe SOLO el área fix-flip ──
alter table public.inv_access enable row level security;
alter table public.inv_holdings enable row level security;
alter table public.inv_model_params enable row level security;
alter table public.inv_cashflow_real enable row level security;
alter table public.inv_projection enable row level security;
alter table public.inv_documents enable row level security;

drop policy if exists inv_access_read on public.inv_access;
create policy inv_access_read on public.inv_access for select to authenticated
  using (user_id = auth.uid() or lower(email) = lower(coalesce(auth.jwt() ->> 'email','')) or public.has_area('fix-flip'));
drop policy if exists inv_access_write on public.inv_access;
create policy inv_access_write on public.inv_access for all to authenticated
  using (public.has_area('fix-flip')) with check (public.has_area('fix-flip'));

drop policy if exists inv_holdings_read on public.inv_holdings;
create policy inv_holdings_read on public.inv_holdings for select to authenticated
  using (investor_airtable_id in (select public.inv_my_ids()) or public.has_area('fix-flip'));
drop policy if exists inv_holdings_write on public.inv_holdings;
create policy inv_holdings_write on public.inv_holdings for all to authenticated
  using (public.has_area('fix-flip')) with check (public.has_area('fix-flip'));

drop policy if exists inv_params_read on public.inv_model_params;
create policy inv_params_read on public.inv_model_params for select to authenticated
  using (property_id in (select public.inv_my_props()) or public.has_area('fix-flip'));
drop policy if exists inv_params_write on public.inv_model_params;
create policy inv_params_write on public.inv_model_params for all to authenticated
  using (public.has_area('fix-flip')) with check (public.has_area('fix-flip'));

drop policy if exists inv_cashflow_read on public.inv_cashflow_real;
create policy inv_cashflow_read on public.inv_cashflow_real for select to authenticated
  using (property_id in (select public.inv_my_props()) or public.has_area('fix-flip'));
drop policy if exists inv_cashflow_write on public.inv_cashflow_real;
create policy inv_cashflow_write on public.inv_cashflow_real for all to authenticated
  using (public.has_area('fix-flip')) with check (public.has_area('fix-flip'));

drop policy if exists inv_projection_read on public.inv_projection;
create policy inv_projection_read on public.inv_projection for select to authenticated
  using (property_id in (select public.inv_my_props()) or public.has_area('fix-flip'));
drop policy if exists inv_projection_write on public.inv_projection;
create policy inv_projection_write on public.inv_projection for all to authenticated
  using (public.has_area('fix-flip')) with check (public.has_area('fix-flip'));

drop policy if exists inv_documents_read on public.inv_documents;
create policy inv_documents_read on public.inv_documents for select to authenticated
  using (((property_id in (select public.inv_my_props())) and (investor_airtable_id is null or investor_airtable_id in (select public.inv_my_ids()))) or public.has_area('fix-flip'));
drop policy if exists inv_documents_write on public.inv_documents;
create policy inv_documents_write on public.inv_documents for all to authenticated
  using (public.has_area('fix-flip')) with check (public.has_area('fix-flip'));

-- ═══ SEED · Dove Springs (property_id 419fc8c3-1d49-4bf5-a39a-6ef8a8024606) ═══
-- Valeria Bedoya (recqMSNwQwAXGPZhu) · inversión real ff_deals.capital_inversionista
insert into public.inv_holdings (investor_airtable_id, property_id, inversion_aportada, reparto_pct, fecha_entrada, notas)
values ('recqMSNwQwAXGPZhu', '419fc8c3-1d49-4bf5-a39a-6ef8a8024606', 25400, 0.5, '2025-05-15', 'reparto 50/50 DEFAULT — confirmar contra Operating Agreement')
on conflict (investor_airtable_id, property_id) do nothing;

insert into public.inv_model_params (property_id, key, value, fuente, descripcion) values
 ('419fc8c3-1d49-4bf5-a39a-6ef8a8024606','inflacion','0.03','modelo','inflación anual (renta y gastos años 2-31)'),
 ('419fc8c3-1d49-4bf5-a39a-6ef8a8024606','valorizacion','0.053','modelo','valorización anual del activo'),
 ('419fc8c3-1d49-4bf5-a39a-6ef8a8024606','retorno_esperado','0.08','modelo','tasa de descuento del VPN'),
 ('419fc8c3-1d49-4bf5-a39a-6ef8a8024606','compra','183000','real:ff_deals','precio de compra'),
 ('419fc8c3-1d49-4bf5-a39a-6ef8a8024606','cierre_compra','17346.78','real:ff_hml_loans','gastos de cierre HML'),
 ('419fc8c3-1d49-4bf5-a39a-6ef8a8024606','hm_inicial','183000','real:ff_hml_loans','fondeo inicial HM (monto 258,000 − draws 75,000)'),
 ('419fc8c3-1d49-4bf5-a39a-6ef8a8024606','hm_tasa','0.12','real:ff_hml_loans','tasa Hard Money'),
 ('419fc8c3-1d49-4bf5-a39a-6ef8a8024606','draw_m1','37500','real:ff_draws','draw remodelación mes 1 (rehab 15-may→20-jun)'),
 ('419fc8c3-1d49-4bf5-a39a-6ef8a8024606','draw_m2','37500','real:ff_draws','draw remodelación mes 2'),
 ('419fc8c3-1d49-4bf5-a39a-6ef8a8024606','otros_inv_m2','4801.86','real:ff_draws','muebles 3,862.90 + otros 750 + servicios HML 188.96'),
 ('419fc8c3-1d49-4bf5-a39a-6ef8a8024606','refi_mes','6','real:ff_hml_loans','HML venció 17-nov-2025 = mes 6'),
 ('419fc8c3-1d49-4bf5-a39a-6ef8a8024606','refi_monto','277500','real:calc','75% LTV × appraisal 370,000'),
 ('419fc8c3-1d49-4bf5-a39a-6ef8a8024606','refi_tasa','0.1139','real:ff_deals','derivada de la cuota real 2,725.57 (ref30_payment)'),
 ('419fc8c3-1d49-4bf5-a39a-6ef8a8024606','refi_plazo_m','360','modelo','30 años'),
 ('419fc8c3-1d49-4bf5-a39a-6ef8a8024606','cierre_refi','0','supuesto','costos de cierre del refi'),
 ('419fc8c3-1d49-4bf5-a39a-6ef8a8024606','arv','370000','real:ff_deals','appraisal'),
 ('419fc8c3-1d49-4bf5-a39a-6ef8a8024606','num_hab','5','supuesto','habitaciones PadSplit — calibrar con Excel'),
 ('419fc8c3-1d49-4bf5-a39a-6ef8a8024606','arriendo_hab','700','real:ff_deals','renta 3,500 / 5 hab'),
 ('419fc8c3-1d49-4bf5-a39a-6ef8a8024606','rampa','0,0,0,0.4,0.6,0.8,1,1,1,1,1,1,1','supuesto','ocupación mes 0-12 — calibrar con Excel'),
 ('419fc8c3-1d49-4bf5-a39a-6ef8a8024606','ocupacion_estable','1','supuesto','ocupación de largo plazo'),
 ('419fc8c3-1d49-4bf5-a39a-6ef8a8024606','piso_servicios','0.10','modelo','mínimo de servicios cuando está vacío'),
 ('419fc8c3-1d49-4bf5-a39a-6ef8a8024606','mantenimiento_mes','60','supuesto','mantenimiento mensual pleno'),
 ('419fc8c3-1d49-4bf5-a39a-6ef8a8024606','servicios_mes','250','supuesto','Σ 8 ítems de servicios públicos'),
 ('419fc8c3-1d49-4bf5-a39a-6ef8a8024606','hoa_mes','0','supuesto','HOA'),
 ('419fc8c3-1d49-4bf5-a39a-6ef8a8024606','padsplit_pct','0.08','modelo','fee PADSPLIT sobre ingreso'),
 ('419fc8c3-1d49-4bf5-a39a-6ef8a8024606','comision_pct','0.04','modelo','comisión sobre ingreso'),
 ('419fc8c3-1d49-4bf5-a39a-6ef8a8024606','imp_propiedad_pct','0.0161','modelo','property tax anual sobre avalúo'),
 ('419fc8c3-1d49-4bf5-a39a-6ef8a8024606','imp_renta_pct','0','modelo','impuesto de renta condicional (LLC pass-through)'),
 ('419fc8c3-1d49-4bf5-a39a-6ef8a8024606','seguro_mes','120','supuesto','seguro mensual'),
 ('419fc8c3-1d49-4bf5-a39a-6ef8a8024606','reparto_inv','0.5','default','reparto inversionista/empresa'),
 ('419fc8c3-1d49-4bf5-a39a-6ef8a8024606','cash_atrapado_real','4612.90','real:ff_draws','net_total — base año 0 de TIR/VPN post-refi'),
 ('419fc8c3-1d49-4bf5-a39a-6ef8a8024606','ciclo_meses','12','modelo',null),
 ('419fc8c3-1d49-4bf5-a39a-6ef8a8024606','anios','31','modelo',null),
 ('419fc8c3-1d49-4bf5-a39a-6ef8a8024606','estado_casa','rentada_y_refinanciada','real:ff_deals',null),
 ('419fc8c3-1d49-4bf5-a39a-6ef8a8024606','fecha_cierre','2025-05-15','real:ff_deals',null),
 ('419fc8c3-1d49-4bf5-a39a-6ef8a8024606','direccion','2315 Dove Springs Dr, Austin, TX 78744','real:ff_deals',null)
on conflict (property_id, key) do nothing;

-- ─────────────────────────────────────────────────────────────────
-- ROLLBACK: drop table inv_access/inv_holdings/inv_model_params/
--   inv_cashflow_real/inv_projection/inv_documents;
--   drop function inv_my_ids, inv_my_props, inv_claim_access;
-- ─────────────────────────────────────────────────────────────────
