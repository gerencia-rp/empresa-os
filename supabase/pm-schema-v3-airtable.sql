-- ════════════════════════════════════════════════════════════════
-- 🏠 PROPERTY MANAGEMENT · schema v3 (mapeo de Airtable appzEnsuy4qPT6iHj)
-- IDEMPOTENTE · ADITIVO. Corré después de pm-schema.sql y pm-schema-v2.sql.
--
-- DECISIÓN DE NAMING: el módulo PM en producción usa tablas pm_* cableadas
-- al frontend (pm-dashboard.js, app.js) y al sync. Este archivo NO crea un
-- schema paralelo sin prefijo; mapea la spec de Airtable sobre las tablas
-- pm_* existentes (ALTER para columnas faltantes) y solo CREA las tablas
-- genuinamente nuevas: pm_expenses, pm_payroll, pm_wifi_credentials, pm_alerts.
--
-- MAPEO spec → tabla real:
--   properties           → pm_properties
--   units                → pm_units
--   tenants              → pm_tenants
--   leases               → pm_bookings        (monthly_rent = rent_amount)
--   payments_received    → pm_payments         (lease_id = booking_id, payment_date = paid_at)
--   expenses             → pm_expenses         (NUEVA)
--   payroll              → pm_payroll          (NUEVA)
--   service_credentials  → pm_credentials      (ya cubre todos los campos)
--   wifi_credentials     → pm_wifi_credentials (NUEVA)
--   tasks                → pm_tasks
--   alerts               → pm_alerts           (NUEVA)
--   sync_log             → pm_sync_log
--
--   airtable_id (spec)   → external_id (convención existente del sync)
-- ════════════════════════════════════════════════════════════════

-- ── 1. EXTENDER pm_properties ──────────────────────────────────
--   airtable_id≡external_id ✓ · zone ✓(v2) · status ✓ · acquired_at/notes ✓
ALTER TABLE pm_properties
  ADD COLUMN IF NOT EXISTS neighborhood TEXT,
  ADD COLUMN IF NOT EXISTS total_units  INT DEFAULT 1;
--   NOTA: spec.type ('casa_completa'/'co_living'/'estudios') lo cubre
--   pm_properties.rental_model. No se duplica.

-- ── 2. EXTENDER pm_units ───────────────────────────────────────
--   unit_name≡name ✓ · bathroom_type≡bath_type ✓(v2) · target_rent ✓
ALTER TABLE pm_units
  ADD COLUMN IF NOT EXISTS bathroom_count TEXT,
  ADD COLUMN IF NOT EXISTS max_occupants  INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS status         TEXT DEFAULT 'disponible';
--   NOTA: la ocupación derivada vive en la vista pm_unit_occupancy;
--   esta columna status es el valor crudo que viene de Airtable.

-- ── 3. EXTENDER pm_tenants ─────────────────────────────────────
--   full_name/email/phone/emergency_contact/notes ✓
--   spec.status ('active'/'past'/'incoming') lo cubre client_state (v2). No se duplica.

-- ── 4. EXTENDER pm_bookings (≡ leases) ─────────────────────────
--   tenant/unit/property/start/end/deposit/status ✓ · monthly_rent≡rent_amount ✓
--   last_followup_at ✓(v2)
ALTER TABLE pm_bookings
  ADD COLUMN IF NOT EXISTS payment_platform     TEXT,  -- 'airbnb'/'venmo'/'directo'/'padsplit'
  ADD COLUMN IF NOT EXISTS followup_text_now    TEXT,
  ADD COLUMN IF NOT EXISTS followup_observation TEXT,
  ADD COLUMN IF NOT EXISTS comment              TEXT;

-- ── 5. EXTENDER pm_payments (≡ payments_received) ──────────────
--   booking_id≡lease_id · property/unit ✓ · paid_at≡payment_date
--   payment_method ✓ · attachment_url≡proof_url
ALTER TABLE pm_payments
  ADD COLUMN IF NOT EXISTS external_id TEXT,            -- airtable_id (faltaba en pm_payments)
  ADD COLUMN IF NOT EXISTS tenant_id   UUID REFERENCES pm_tenants(id),
  ADD COLUMN IF NOT EXISTS month       TEXT,
  ADD COLUMN IF NOT EXISTS year        INT,
  ADD COLUMN IF NOT EXISTS platform    TEXT;            -- 'airbnb'/'venmo'/'directo'
DO $$ BEGIN
  ALTER TABLE pm_payments ADD CONSTRAINT pm_payments_extid_unique UNIQUE (external_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 6. NUEVA: pm_expenses (gastos unificados) ──────────────────
CREATE TABLE IF NOT EXISTS pm_expenses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id  TEXT UNIQUE,                             -- airtable_id
  category     TEXT NOT NULL,                           -- 'house'/'operational'/'payroll'/'cleaning'
  subcategory  TEXT,                                    -- 'Coa'/'Texas Gas'/'Spectrum'/'Arreglos'/'Aseo'/'Cesped'/'Gasolina'/'Cenas Taxes'
  property_id  UUID REFERENCES pm_properties(id),       -- null si no es por casa
  amount       NUMERIC NOT NULL,
  expense_date DATE,
  month        TEXT,
  year         INT,
  description  TEXT,
  invoice_url  TEXT,                                    -- link a Drive
  paid         BOOLEAN DEFAULT FALSE,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── 7. NUEVA: pm_payroll ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS pm_payroll (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id   TEXT UNIQUE,                            -- airtable_id
  employee_name TEXT NOT NULL,
  salary        NUMERIC,
  month         TEXT,
  year          INT,
  paid          BOOLEAN DEFAULT FALSE,
  invoice_url   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── 8. NUEVA: pm_wifi_credentials ──────────────────────────────
--   (pm_credentials ya cubre service_credentials; wifi va aparte por spec)
CREATE TABLE IF NOT EXISTS pm_wifi_credentials (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id        TEXT UNIQUE,                       -- airtable_id
  property_id        UUID REFERENCES pm_properties(id),
  network_name       TEXT,
  password_encrypted TEXT,                              -- ⚠️ prod: Supabase Vault / pgcrypto
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ── 9. EXTENDER pm_tasks ───────────────────────────────────────
--   property_id ✓ · assignee≡assigned_to ✓ · status ✓ · notes ✓
ALTER TABLE pm_tasks
  ADD COLUMN IF NOT EXISTS task_type      TEXT,         -- 'aseo'/'cesped'/'inspeccion'/'renovacion_contrato'
  ADD COLUMN IF NOT EXISTS scheduled_date DATE;

-- ── 10. NUEVA: pm_alerts (alertas auto del sistema) ────────────
CREATE TABLE IF NOT EXISTS pm_alerts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        TEXT,                                     -- 'contract_expiring'/'payment_late'/'occupancy_low'
  severity    TEXT,                                     -- 'critical'/'warning'/'info'
  property_id UUID REFERENCES pm_properties(id),
  tenant_id   UUID REFERENCES pm_tenants(id),
  message     TEXT,
  read        BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 11. EXTENDER pm_sync_log ───────────────────────────────────
--   started_at≡sync_started_at · finished_at≡sync_completed_at · error_message≡errors
ALTER TABLE pm_sync_log
  ADD COLUMN IF NOT EXISTS tables_synced    TEXT[],
  ADD COLUMN IF NOT EXISTS records_added    INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS records_updated  INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS records_deleted  INT DEFAULT 0;

-- ── 12. ÍNDICES (spec) ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pm_prop_zone     ON pm_properties(zone);
CREATE INDEX IF NOT EXISTS idx_pm_units_status  ON pm_units(status);
CREATE INDEX IF NOT EXISTS idx_pm_book_enddate  ON pm_bookings(end_date);
CREATE INDEX IF NOT EXISTS idx_pm_pay_month     ON pm_payments(month);
CREATE INDEX IF NOT EXISTS idx_pm_pay_year      ON pm_payments(year);
CREATE INDEX IF NOT EXISTS idx_pm_pay_tenant    ON pm_payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pm_pay_extid     ON pm_payments(external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pm_exp_property  ON pm_expenses(property_id);
CREATE INDEX IF NOT EXISTS idx_pm_exp_category  ON pm_expenses(category);
CREATE INDEX IF NOT EXISTS idx_pm_exp_date      ON pm_expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_pm_exp_month     ON pm_expenses(month);
CREATE INDEX IF NOT EXISTS idx_pm_exp_year      ON pm_expenses(year);
CREATE INDEX IF NOT EXISTS idx_pm_payroll_year  ON pm_payroll(year, month);
CREATE INDEX IF NOT EXISTS idx_pm_wifi_property ON pm_wifi_credentials(property_id);
CREATE INDEX IF NOT EXISTS idx_pm_tasks_sched   ON pm_tasks(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_pm_alerts_unread ON pm_alerts(read, severity) WHERE read = FALSE;
CREATE INDEX IF NOT EXISTS idx_pm_alerts_prop   ON pm_alerts(property_id);

-- ── 13. RLS · tablas NUEVAS = solo admin (payroll/wifi son sensibles) ──
--   Usa public.is_admin() (jwt role 'admin' vía profiles). Las tablas pm_*
--   PREEXISTENTES conservan su policy `authenticated` para no romper la app
--   en producción; migrar esas a admin-only es un cambio aparte si se desea.
ALTER TABLE pm_expenses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_payroll          ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_wifi_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_alerts           ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pm_exp_admin ON pm_expenses;
CREATE POLICY pm_exp_admin ON pm_expenses FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS pm_payroll_admin ON pm_payroll;
CREATE POLICY pm_payroll_admin ON pm_payroll FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS pm_wifi_admin ON pm_wifi_credentials;
CREATE POLICY pm_wifi_admin ON pm_wifi_credentials FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS pm_alerts_admin ON pm_alerts;
CREATE POLICY pm_alerts_admin ON pm_alerts FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ✅ LISTO. Verificá:
--   SELECT column_name FROM information_schema.columns WHERE table_name='pm_bookings' AND column_name IN ('payment_platform','followup_text_now','comment');
--   SELECT to_regclass('public.pm_expenses'), to_regclass('public.pm_payroll'), to_regclass('public.pm_wifi_credentials'), to_regclass('public.pm_alerts');
