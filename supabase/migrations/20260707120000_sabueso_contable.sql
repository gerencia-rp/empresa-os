-- ════════════════════════════════════════════════════════════════
-- 🐕 SABUESO CONTABLE — infraestructura (ADITIVA, rollback al pie).
-- ct_config: umbrales configurables (sin hardcode en código).
-- ct_findings: descuadres persistentes (trackea abierto→resuelto entre cierres).
-- agent_proposals: el área contable también puede proponer/aprobar (antes solo operación).
-- ════════════════════════════════════════════════════════════════

create table if not exists public.ct_config (
  key text primary key,
  value text not null,
  descripcion text,
  updated_at timestamptz not null default now()
);
insert into public.ct_config (key, value, descripcion) values
  ('c1_delta_abs_usd',        '5000',   'C1 conciliación OS↔QBO: descuadre si |Δ| supera este monto'),
  ('c1_delta_pct',            '10',     'C1: o si |Δ| supera este % de la base'),
  ('c1_critico_usd',          '50000',  'C1: severidad crítica si |Δ| supera este monto'),
  ('c2_ebitda_caida_pct',     '15',     'C2 salud: amarillo si el EBITDA cae más de este % vs período previo'),
  ('c3_libros_pct',           '10',     'C3 libros al día: alerta si |EBITDA op − Net QBO| supera este % de la base'),
  ('c3_qbo_stale_dias',       '30',     'C3: crítico si el snapshot QBO tiene más de estos días'),
  ('c4_deuda_min_usd',        '200',    'C4 cobranza: deuda mínima por inquilino/casa para listar'),
  ('c6_delta_inversionista_usd','1000', 'C6 cap table: descuadre por inversionista si |Δ| supera esto'),
  ('c7_draw_ratio',           '2',      'C7 anomalía: draw remodelación > ratio × estimado del deal'),
  ('c7_draw_min_usd',         '100000', 'C7: y además supera este monto'),
  ('de_max',                  '8',      'KPI apalancamiento: alerta si Deuda/Equity (QBO) supera esto')
on conflict (key) do nothing;

create table if not exists public.ct_findings (
  id uuid primary key default gen_random_uuid(),
  check_id text not null,                 -- C1..C8
  empresa text,                           -- fix_flip | rentas | remodelacion | educacion | holding
  clave text not null,                    -- id estable del ítem (para dedupe/track entre corridas)
  titulo text not null,
  detalle jsonb not null default '{}'::jsonb,
  fuente text,                            -- OS | QBO | OS↔QBO | Airtable
  impacto_usd numeric not null default 0,
  severidad text not null default 'media' check (severidad in ('critica','media','info')),
  estado text not null default 'abierto' check (estado in ('abierto','marcado_contadora','ajuste_propuesto','aceptado','resuelto')),
  nota text,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  resolved_at timestamptz,
  active boolean not null default true,   -- soft-delete
  archived_at timestamptz,
  unique (check_id, clave)
);
alter table public.ct_findings enable row level security;
alter table public.ct_config enable row level security;
drop policy if exists ct_findings_area_read on public.ct_findings;
create policy ct_findings_area_read on public.ct_findings for select to authenticated using (public.has_area('contable'));
drop policy if exists ct_findings_area_write on public.ct_findings;
create policy ct_findings_area_write on public.ct_findings for all to authenticated using (public.has_area('contable')) with check (public.has_area('contable'));
drop policy if exists ct_config_area_read on public.ct_config;
create policy ct_config_area_read on public.ct_config for select to authenticated using (public.has_area('contable'));
drop policy if exists ct_config_area_write on public.ct_config;
create policy ct_config_area_write on public.ct_config for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- agent_proposals: contable también propone/gestiona (aprobación humana igual que operación)
drop policy if exists agent_proposals_area_read on public.agent_proposals;
create policy agent_proposals_area_read on public.agent_proposals for select to authenticated
  using ((public.has_area('operacion') or public.has_area('contable')));
drop policy if exists agent_proposals_area_ins on public.agent_proposals;
create policy agent_proposals_area_ins on public.agent_proposals for insert to authenticated
  with check ((public.has_area('operacion') or public.has_area('contable')));
drop policy if exists agent_proposals_area_upd on public.agent_proposals;
create policy agent_proposals_area_upd on public.agent_proposals for update to authenticated
  using ((public.has_area('operacion') or public.has_area('contable'))) with check ((public.has_area('operacion') or public.has_area('contable')));

-- agent_registry: contable también lo lee (necesita el id del agente para proponer)
drop policy if exists agent_registry_area_read on public.agent_registry;
create policy agent_registry_area_read on public.agent_registry for select to authenticated
  using ((public.has_area('operacion') or public.has_area('contable')));

-- Registro del agente (pilar #4): qué consume, qué produce, qué decide un humano
insert into public.agent_registry (nombre, proceso, empresa, inputs, outputs, acciones, nivel_riesgo, estado, dueno)
select 'Sabueso Contable', 'Cierre financiero: conciliación OS↔QBO, salud por empresa, cobranza, anomalías por casa e higiene de datos', 'holding',
 to_jsonb(array['v_holding_pnl','ff_investors','ff_hml_loans','ff_draws','ff_deals','ff_overhead','pm_monthly_finance','pm_payments (billing_ym)','pm_expenses (billing_ym)','qb_report_cache','qb_account_map','ct_config']),
 to_jsonb(array['ct_findings (descuadres con $ impacto y severidad)','cierre semanal para la contadora']),
 to_jsonb(array['proponer ajuste contable (agent_proposals, estado=propuesta) — NUNCA ejecuta solo; aprueba un humano']),
 'P1', 'asistido', 'CEO'
where not exists (select 1 from public.agent_registry where nombre='Sabueso Contable' and deleted_at is null);

-- ─────────────────────────────────────────────────────────────────
-- ROLLBACK:
--   drop table if exists public.ct_findings; drop table if exists public.ct_config;
--   update public.agent_registry set deleted_at=now() where nombre='Sabueso Contable';
--   (agent_proposals/agent_registry: recrear las policies solo con has_area('operacion'))
-- ─────────────────────────────────────────────────────────────────
