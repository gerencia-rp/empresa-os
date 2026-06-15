-- ════════════════════════════════════════════════════════════════
-- 🛠 PM · Tab Operación + Sistema de alertas
-- Extiende pm_alerts (resolve/assign/dedup), pm_credentials (servicios con
-- pago automático), crea pm_message_templates y siembra 5 plantillas.
-- Idempotente. Correr una vez en el SQL editor de Supabase.
-- ════════════════════════════════════════════════════════════════

-- ── 1. pm_alerts: columnas para resolver/asignar + dedup de crons ──
ALTER TABLE pm_alerts
  ADD COLUMN IF NOT EXISTS category    TEXT,            -- 'contract'/'payment'/'service'/'task'/'occupancy'
  ADD COLUMN IF NOT EXISTS resolved    BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS assigned_to TEXT,
  ADD COLUMN IF NOT EXISTS dedup_key   TEXT;            -- evita duplicar la misma alerta cada corrida

-- Un alert "vivo" por dedup_key (mientras no esté resuelto).
CREATE UNIQUE INDEX IF NOT EXISTS idx_pm_alerts_dedup
  ON pm_alerts(dedup_key) WHERE dedup_key IS NOT NULL AND resolved = FALSE;

-- Policy authenticated (la app interna es single-tenant; convive con pm_alerts_admin).
DROP POLICY IF EXISTS pm_alerts_auth ON pm_alerts;
CREATE POLICY pm_alerts_auth ON pm_alerts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── 2. pm_credentials: servicios con pago automático ──
ALTER TABLE pm_credentials
  ADD COLUMN IF NOT EXISTS auto_pay          BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS next_payment_date DATE,
  ADD COLUMN IF NOT EXISTS payment_failed    BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS amount            NUMERIC;

-- ── 3. pm_message_templates ──
CREATE TABLE IF NOT EXISTS pm_message_templates (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key        TEXT UNIQUE,                               -- 'payment_reminder', etc.
  name       TEXT NOT NULL,
  category   TEXT,
  body       TEXT NOT NULL,                             -- usa {{variables}}
  variables  TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE pm_message_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pm_msg_tpl_auth ON pm_message_templates;
CREATE POLICY pm_msg_tpl_auth ON pm_message_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed de plantillas (no pisa si ya existen por key)
INSERT INTO pm_message_templates (key, name, category, body, variables) VALUES
('payment_reminder', 'Recordatorio de pago', 'cobranza',
 'Hola {{tenant_name}} 👋 Te recordamos que la renta de {{property_address}} por ${{amount}} vence el {{due_date}}. Cualquier duda, quedamos atentos. ¡Gracias!',
 ARRAY['tenant_name','property_address','amount','due_date']),
('welcome', 'Bienvenida nuevo inquilino', 'onboarding',
 '¡Bienvenido/a {{tenant_name}}! 🎉 Nos alegra tenerte en {{property_address}}. Tu contrato inicia el {{start_date}}. Ante cualquier necesidad escribinos por acá.',
 ARRAY['tenant_name','property_address','start_date']),
('lease_termination', 'Salida / fin de contrato', 'salida',
 'Hola {{tenant_name}}, te escribimos respecto al cierre de tu contrato en {{property_address}} con fecha {{end_date}}. Coordinemos la entrega y la devolución del depósito. Gracias por este tiempo.',
 ARRAY['tenant_name','property_address','end_date']),
('renewal', 'Renovación de contrato', 'renovacion',
 'Hola {{tenant_name}} 👋 Tu contrato en {{property_address}} vence el {{end_date}}. ¿Te gustaría renovar? La renta propuesta sería ${{amount}}. Avisanos y lo dejamos listo.',
 ARRAY['tenant_name','property_address','end_date','amount']),
('tech_visit', 'Aviso de visita técnica', 'mantenimiento',
 'Hola {{tenant_name}}, te avisamos que el {{visit_date}} pasará nuestro equipo por {{property_address}} para {{reason}}. Por favor confirmanos disponibilidad. ¡Gracias!',
 ARRAY['tenant_name','property_address','visit_date','reason'])
ON CONFLICT (key) DO NOTHING;

-- Verificá:
--   select to_regclass('public.pm_message_templates');
--   select key, name from pm_message_templates order by key;
