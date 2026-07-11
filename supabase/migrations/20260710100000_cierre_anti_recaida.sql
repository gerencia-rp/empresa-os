-- ════════════════════════════════════════════════════════════════
-- 📐 CIERRE ANTI-RECAÍDA (reunión 9-jul) — ADITIVA, rollback al pie.
-- ff_extension_payments: 🆕 "Pago de extensión" (prórroga del HML) — el campo NO existe en
--   Airtable, vive en el OS. Lo carga Juan o el parser de statements, SIEMPRE con comprobante.
-- ct_doc_extracts: staging de la Capa 0 (parser statements HML / OCR facturas) — todo lo
--   extraído entra como PROPUESTA; un humano aprueba antes de que cuente.
-- ct_config: umbrales de los checks C9–C18 + dueño único por dato (sin hardcode en código).
-- ════════════════════════════════════════════════════════════════

create table if not exists public.ff_extension_payments (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id),
  address text,
  address_norm text,                       -- llave de cruce con ff_draws/ff_hml_loans
  monto numeric not null,
  meses numeric not null default 1,        -- meses de prórroga que compra (extiende el plazo en C10/C15)
  fecha date,
  comprobante_url text,                    -- link ESPECÍFICO al statement/recibo (sin soporte no se da por bueno)
  notas text,
  fuente text not null default 'manual',   -- manual | parser
  created_by text,
  created_at timestamptz not null default now(),
  active boolean not null default true,    -- soft-delete
  archived_at timestamptz
);
create index if not exists ff_ext_norm_idx on public.ff_extension_payments (address_norm) where active;
alter table public.ff_extension_payments enable row level security;
drop policy if exists ff_ext_read on public.ff_extension_payments;
create policy ff_ext_read on public.ff_extension_payments for select to authenticated
  using (public.has_area('fix-flip') or public.has_area('contable') or public.has_area('remodelacion'));
drop policy if exists ff_ext_write on public.ff_extension_payments;
create policy ff_ext_write on public.ff_extension_payments for all to authenticated
  using (public.has_area('fix-flip') or public.has_area('contable'))
  with check (public.has_area('fix-flip') or public.has_area('contable'));

create table if not exists public.ct_doc_extracts (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('hml_statement','factura')),
  casa text,
  property_id uuid references public.properties(id),
  payload jsonb not null default '{}'::jsonb,   -- filas extraídas (fecha/pago/interés/escrow/fee · ítems material/mueble/herramienta)
  comprobante_url text,
  estado text not null default 'propuesta' check (estado in ('propuesta','aprobado','rechazado')),
  aprobado_por text,
  aprobado_at timestamptz,
  created_by text,
  created_at timestamptz not null default now(),
  active boolean not null default true,
  archived_at timestamptz
);
alter table public.ct_doc_extracts enable row level security;
drop policy if exists ct_docx_rw on public.ct_doc_extracts;
create policy ct_docx_rw on public.ct_doc_extracts for all to authenticated
  using (public.has_area('contable') or public.has_area('fix-flip') or public.has_area('remodelacion'))
  with check (public.has_area('contable') or public.has_area('fix-flip') or public.has_area('remodelacion'));

-- Umbrales C9–C18 (mismos defaults que CFG_DEF del motor os/os-cierre-engine.js)
insert into public.ct_config (key, value, descripcion) values
  ('margen_error_materiales_pct','5',    'Capa 1: margen de error de materiales = gasto materiales real × este % (en moneda)'),
  ('c9_dup_min_usd',           '50',     'C9 valor idéntico en 2 casas: ignorar montos menores a esto'),
  ('c10_tolerancia_meses',     '0',      'C10 meses de interés > plazo: tolerancia en meses (regla dura = 0)'),
  ('c11_gap_min_usd',          '1000',   'C11 draws vs cobrado: gap mínimo para alertar'),
  ('c11_gap_critico_usd',      '5000',   'C11: severidad crítica si |gap| supera esto'),
  ('c12_avance_min_pct',       '50',     'C12 labor $0: obra "ejecutada" = Finalizado o avance ≥ este %'),
  ('c13_muebles_min_usd',      '100',    'C13 muebles doble conteo: mínimo en columna muebles Y en materiales'),
  ('c14_max_listar',           '12',     'C14 sin comprobante / C17 fuera de rango: top N listados (el resto agregado)'),
  ('c15_gracia_dias',          '15',     'C15 HML vencido: días de gracia antes de exigir extensión registrada'),
  ('c17_factor_mediana',       '8',      'C17 fuera de rango: monto > factor × mediana de su categoría'),
  ('c17_min_usd',              '2000',   'C17: y además supera este piso absoluto'),
  ('c17_min_muestras',         '8',      'C17: mediana solo con n muestras suficientes'),
  ('c18_ventana_dias',         '30',     'C18 labor sin obra: margen en días antes/después de la obra'),
  -- Dueño único por dato (vista Cierre del mes) — configurable, no hardcode
  ('cierre_dueno_c9',          'Michell','Dueño sugerido C9 (facturas/etiquetas; el lado rentas va a Carlos)'),
  ('cierre_dueno_c9_rentas',   'Carlos', 'Dueño sugerido C9 lado rentas'),
  ('cierre_dueno_c10',         'Juan',   'Dueño sugerido C10 (draws/HML)'),
  ('cierre_dueno_c11',         'Juan',   'Dueño sugerido C11 (draws/HML)'),
  ('cierre_dueno_c12',         'Alejandra','Dueño sugerido C12 (obra y fechas)'),
  ('cierre_dueno_c13',         'Michell','Dueño sugerido C13 (facturas y etiquetas)'),
  ('cierre_dueno_c14',         'Silvia', 'Dueño sugerido C14 (contabilidad/comprobantes)'),
  ('cierre_dueno_c15',         'Juan',   'Dueño sugerido C15 (draws/HML)'),
  ('cierre_dueno_c16',         'Carlos', 'Dueño sugerido C16 (rentas; el lado obra va a Michell)'),
  ('cierre_dueno_c16_remodelacion','Michell','Dueño sugerido C16 lado obra'),
  ('cierre_dueno_c17',         'Michell','Dueño sugerido C17 (facturas y etiquetas)'),
  ('cierre_dueno_c18',         'Alejandra','Dueño sugerido C18 (obra y fechas)')
on conflict (key) do nothing;

-- ─── ROLLBACK (ejecutar a mano si hiciera falta) ───
-- drop table if exists public.ct_doc_extracts;
-- drop table if exists public.ff_extension_payments;
-- delete from public.ct_config where key in ('margen_error_materiales_pct','c9_dup_min_usd','c10_tolerancia_meses','c11_gap_min_usd','c11_gap_critico_usd','c12_avance_min_pct','c13_muebles_min_usd','c14_max_listar','c15_gracia_dias','c17_factor_mediana','c17_min_usd','c17_min_muestras','c18_ventana_dias') or key like 'cierre_dueno_%';
