-- ════════════════════════════════════════════════════════════════
-- 🏠 PROPERTY MANAGEMENT · schema v2 (extensiones para Airtable sync)
-- IDEMPOTENTE: corré después de pm-schema.sql cuando quieras.
-- ════════════════════════════════════════════════════════════════

-- ── 1. EXTENDER pm_properties ──────────────────────────────────
ALTER TABLE pm_properties
  ADD COLUMN IF NOT EXISTS zone TEXT,             -- 'norte','sur','marlin','round_rock'
  ADD COLUMN IF NOT EXISTS wifi_name TEXT,
  ADD COLUMN IF NOT EXISTS wifi_pass TEXT,
  ADD COLUMN IF NOT EXISTS drive_url TEXT;

-- ── 2. EXTENDER pm_units ───────────────────────────────────────
ALTER TABLE pm_units
  ADD COLUMN IF NOT EXISTS bath_type TEXT,        -- 'privado','compartido','privado_compartido','sin_definir'
  ADD COLUMN IF NOT EXISTS access_codes TEXT,     -- "Casa: 1720, Hab: Llaves"
  ADD COLUMN IF NOT EXISTS decoration TEXT,
  ADD COLUMN IF NOT EXISTS maintenance_status TEXT, -- 'ok','en_mantenimiento','por_reparar'
  ADD COLUMN IF NOT EXISTS drive_url TEXT;

-- ── 3. EXTENDER pm_bookings ────────────────────────────────────
ALTER TABLE pm_bookings
  ADD COLUMN IF NOT EXISTS platform_account TEXT,     -- 'lucasbeltran0225@gmail.com'
  ADD COLUMN IF NOT EXISTS contract_status TEXT,      -- 'pendiente_firma','firmado','sin_contrato','vencido'
  ADD COLUMN IF NOT EXISTS is_assistance_program BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_followup_at DATE,
  ADD COLUMN IF NOT EXISTS followup_status TEXT;      -- 'Ms. Recordatorio 1','sin contacto', etc

-- ── 4. EXTENDER pm_tenants ─────────────────────────────────────
ALTER TABLE pm_tenants
  ADD COLUMN IF NOT EXISTS client_state TEXT,         -- 'activo','pasado','en_seguimiento'
  ADD COLUMN IF NOT EXISTS ai_summary TEXT;           -- la "Última observación generada (AI)" de Airtable

-- ── 5. NUEVA TABLA: pm_credentials (vault) ─────────────────────
CREATE TABLE IF NOT EXISTS pm_credentials (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id  TEXT,                                  -- airtable id
  name         TEXT NOT NULL,
  category     TEXT,                                  -- 'gmail','plataforma','propiedad','servicio','otro'
  property_id  UUID REFERENCES pm_properties(id) ON DELETE SET NULL,
  username     TEXT,
  password_enc TEXT,                                  -- ⚠️ producción: usar Supabase Vault o pgcrypto
  url          TEXT,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(external_id)
);
CREATE INDEX IF NOT EXISTS idx_pm_cred_category ON pm_credentials(category);
CREATE INDEX IF NOT EXISTS idx_pm_cred_property ON pm_credentials(property_id);

-- ── 6. NUEVA TABLA: pm_tasks (Cronograma Juan Austin) ──────────
CREATE TABLE IF NOT EXISTS pm_tasks (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id    TEXT,
  title          TEXT NOT NULL,
  property_id    UUID REFERENCES pm_properties(id) ON DELETE SET NULL,
  unit_id        UUID REFERENCES pm_units(id) ON DELETE SET NULL,
  zone           TEXT,                                -- ruta diaria
  priority       TEXT DEFAULT 'media' CHECK (priority IN ('baja','media','alta','urgente')),
  task_duration  TEXT,                                -- "30 min"
  travel_time    TEXT,                                -- "15 min"
  assignee       TEXT,
  status         TEXT DEFAULT 'pendiente' CHECK (status IN ('pendiente','en_progreso','completado','cancelado')),
  start_at       TIMESTAMPTZ,
  finish_at      TIMESTAMPTZ,
  tools_required TEXT,
  manual_url     TEXT,
  evidence_url   TEXT,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(external_id)
);
CREATE INDEX IF NOT EXISTS idx_pm_tasks_status ON pm_tasks(status, start_at);
CREATE INDEX IF NOT EXISTS idx_pm_tasks_property ON pm_tasks(property_id);

-- ── 7. NUEVA TABLA: pm_interactions (Seguimiento TextNow / WhatsApp) ──
CREATE TABLE IF NOT EXISTS pm_interactions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id  TEXT,
  tenant_id    UUID REFERENCES pm_tenants(id) ON DELETE SET NULL,
  booking_id   UUID REFERENCES pm_bookings(id) ON DELETE SET NULL,
  channel      TEXT,                                  -- 'whatsapp','textnow','email','llamada','manual'
  template_id  TEXT,                                  -- 'Ms. Recordatorio 1'
  message      TEXT,
  outcome      TEXT,                                  -- 'sent','answered','no_response'
  occurred_at  TIMESTAMPTZ DEFAULT NOW(),
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(external_id)
);
CREATE INDEX IF NOT EXISTS idx_pm_inter_tenant ON pm_interactions(tenant_id, occurred_at DESC);

-- ── 8. NUEVA TABLA: pm_sync_log (registra cada sync) ───────────
CREATE TABLE IF NOT EXISTS pm_sync_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source        TEXT NOT NULL,                       -- 'airtable'
  user_id       UUID,
  status        TEXT,                                -- 'success','error','partial'
  records_synced JSONB,                              -- {"properties":18,"units":52,...}
  error_message TEXT,
  duration_ms   INT,
  started_at    TIMESTAMPTZ DEFAULT NOW(),
  finished_at   TIMESTAMPTZ
);

-- ── 9. RLS para las nuevas tablas ──────────────────────────────
ALTER TABLE pm_credentials  ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_tasks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_sync_log     ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pm_cred_all ON pm_credentials;
CREATE POLICY pm_cred_all ON pm_credentials FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS pm_task_all ON pm_tasks;
CREATE POLICY pm_task_all ON pm_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS pm_inter_all ON pm_interactions;
CREATE POLICY pm_inter_all ON pm_interactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS pm_synclog_all ON pm_sync_log;
CREATE POLICY pm_synclog_all ON pm_sync_log FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── 10. ÍNDICES en external_id para upsert performance ─────────
CREATE INDEX IF NOT EXISTS idx_pm_prop_extid ON pm_properties(external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pm_unit_extid ON pm_units(external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pm_tenant_extid ON pm_tenants(external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pm_book_extid ON pm_bookings(external_id) WHERE external_id IS NOT NULL;

-- Para upsert único en pm_properties por external_id
DO $$ BEGIN
  ALTER TABLE pm_properties ADD CONSTRAINT pm_properties_extid_unique UNIQUE (external_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE pm_units ADD CONSTRAINT pm_units_extid_unique UNIQUE (external_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE pm_tenants ADD CONSTRAINT pm_tenants_extid_unique UNIQUE (external_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE pm_bookings ADD CONSTRAINT pm_bookings_extid_unique UNIQUE (external_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ✅ LISTO.
-- Verificá:
--   SELECT column_name FROM information_schema.columns WHERE table_name = 'pm_properties' AND column_name IN ('zone','wifi_name','drive_url');
--   SELECT count(*) FROM pm_credentials;
--   SELECT count(*) FROM pm_tasks;
--   SELECT count(*) FROM pm_interactions;
