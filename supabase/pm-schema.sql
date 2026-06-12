-- ════════════════════════════════════════════════════════════════
-- 🏠 PROPERTY MANAGEMENT · schema base
-- Soporta: Casa completa · Por habitaciones · Por estudios · Mixto
-- Listo para conectar Airtable después (cargar via API en backend o
-- pegando JSON desde el frontend).
-- ════════════════════════════════════════════════════════════════

-- ── 1. PROPIEDADES ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pm_properties (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id     TEXT,                          -- ID original de Airtable (para sync)
  name            TEXT NOT NULL,                 -- "4916 Barkbridge Trail"
  address         TEXT,
  city            TEXT,
  state           TEXT,
  zip             TEXT,
  -- Rental model — define cómo se desglosa
  rental_model    TEXT DEFAULT 'mixto' CHECK (rental_model IN ('casa_completa','por_habitaciones','por_estudios','por_apartamentos','mixto')),
  -- Resumen estructural (info read-only para UI; las unidades reales están en pm_units)
  total_rooms     INT,
  total_baths     NUMERIC(3,1),
  total_studios   INT DEFAULT 0,
  total_apts      INT DEFAULT 0,
  sqft            INT,
  -- Estado + metadata
  status          TEXT DEFAULT 'activa' CHECK (status IN ('activa','inactiva','en_remodelacion','vendida')),
  acquired_at     DATE,
  notes           TEXT,
  cover_url       TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pm_prop_status ON pm_properties(status);

-- ── 2. UNIDADES (cada hab / estudio / apto / casa completa rentable) ──
CREATE TABLE IF NOT EXISTS pm_units (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id     UUID NOT NULL REFERENCES pm_properties(id) ON DELETE CASCADE,
  external_id     TEXT,
  code            TEXT NOT NULL,                 -- "CHILD-HB3" / "CAPITOL-EST1" / "BARK-FULL"
  name            TEXT,                          -- "Habitación 3" / "Estudio 1" / "Casa completa"
  unit_type       TEXT NOT NULL DEFAULT 'habitacion' CHECK (unit_type IN ('habitacion','estudio','apartamento','casa_completa')),
  target_rent     NUMERIC,                       -- $/mes objetivo
  bath_shared     BOOLEAN DEFAULT FALSE,
  is_active       BOOLEAN DEFAULT TRUE,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(property_id, code)
);
CREATE INDEX IF NOT EXISTS idx_pm_units_property ON pm_units(property_id) WHERE is_active = TRUE;

-- ── 3. INQUILINOS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pm_tenants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id     TEXT,
  full_name       TEXT NOT NULL,
  phone           TEXT,
  email           TEXT,
  document_id     TEXT,                          -- SSN/DNI/Passport
  source          TEXT DEFAULT 'directo' CHECK (source IN ('directo','airbnb','booking','vrbo','hospitable','referido','walk-in','redes','otro')),
  emergency_contact TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. RESERVAS / CONTRATOS (modelo unificado) ─────────────────
CREATE TABLE IF NOT EXISTS pm_bookings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id         UUID NOT NULL REFERENCES pm_units(id) ON DELETE CASCADE,
  property_id     UUID NOT NULL REFERENCES pm_properties(id) ON DELETE CASCADE,  -- denormalizado para queries
  tenant_id       UUID REFERENCES pm_tenants(id),
  booking_type    TEXT DEFAULT 'contrato_directo' CHECK (booking_type IN ('contrato_directo','airbnb','booking','vrbo','hospitable','reserva_corta','otro')),
  external_ref    TEXT,                          -- ID en la plataforma
  title           TEXT,
  -- Fechas
  start_date      DATE NOT NULL,
  end_date        DATE,                          -- NULL = indefinido
  -- Económicas
  rent_amount     NUMERIC NOT NULL,
  rent_period     TEXT DEFAULT 'mensual' CHECK (rent_period IN ('noche','semana','mensual','quincenal','anual','estadia')),
  deposit         NUMERIC DEFAULT 0,
  payment_day     TEXT,                          -- "primer_dia","15","biweekly","cada_2_semanas","3_primeros_dias"
  -- Estado
  status          TEXT DEFAULT 'activo' CHECK (status IN ('borrador','confirmado','activo','vencido','cancelado','finalizado')),
  contract_url    TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pm_book_unit ON pm_bookings(unit_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_pm_book_prop ON pm_bookings(property_id);
CREATE INDEX IF NOT EXISTS idx_pm_book_active ON pm_bookings(status, start_date, end_date) WHERE status IN ('activo','confirmado');
CREATE INDEX IF NOT EXISTS idx_pm_book_tenant ON pm_bookings(tenant_id);

-- ── 5. PAGOS / FINANZAS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pm_payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      UUID REFERENCES pm_bookings(id) ON DELETE SET NULL,
  property_id     UUID REFERENCES pm_properties(id),
  unit_id         UUID REFERENCES pm_units(id),
  type            TEXT NOT NULL CHECK (type IN ('ingreso','gasto')),
  category        TEXT,                          -- 'renta','deposito','jardineria','limpieza','reparacion','servicios','impuestos','seguros','mantenimiento','administracion','otro'
  concept         TEXT NOT NULL,
  amount          NUMERIC NOT NULL,
  paid_at         DATE,                          -- NULL = pendiente
  due_at          DATE,
  payment_method  TEXT,                          -- 'transferencia','zelle','efectivo','cashapp','cheque','tarjeta'
  reference       TEXT,
  attachment_url  TEXT,
  status          TEXT DEFAULT 'pendiente' CHECK (status IN ('pendiente','pagado','vencido','anulado')),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pm_pay_property ON pm_payments(property_id, paid_at);
CREATE INDEX IF NOT EXISTS idx_pm_pay_booking ON pm_payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_pm_pay_pending ON pm_payments(status, due_at) WHERE status = 'pendiente';

-- ── 6. RLS abierto a authenticated (ajustar después según roles) ──
ALTER TABLE pm_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_units      ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_tenants    ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_bookings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_payments   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pm_prop_all ON pm_properties;
CREATE POLICY pm_prop_all ON pm_properties FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS pm_unit_all ON pm_units;
CREATE POLICY pm_unit_all ON pm_units FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS pm_ten_all ON pm_tenants;
CREATE POLICY pm_ten_all ON pm_tenants FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS pm_book_all ON pm_bookings;
CREATE POLICY pm_book_all ON pm_bookings FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS pm_pay_all ON pm_payments;
CREATE POLICY pm_pay_all ON pm_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── 7. VISTAS de soporte ───────────────────────────────────────

-- Ocupación actual por unidad
CREATE OR REPLACE VIEW pm_unit_occupancy AS
SELECT
  u.id AS unit_id,
  u.property_id,
  u.code,
  u.name AS unit_name,
  u.unit_type,
  u.target_rent,
  b.id AS active_booking_id,
  b.tenant_id,
  t.full_name AS tenant_name,
  b.start_date,
  b.end_date,
  b.rent_amount,
  CASE
    WHEN b.id IS NULL THEN 'libre'
    WHEN b.end_date IS NOT NULL AND b.end_date < CURRENT_DATE + INTERVAL '14 days' THEN 'vence_pronto'
    ELSE 'ocupada'
  END AS occupancy_status
FROM pm_units u
LEFT JOIN pm_bookings b ON b.unit_id = u.id
  AND b.status IN ('activo','confirmado')
  AND b.start_date <= CURRENT_DATE
  AND (b.end_date IS NULL OR b.end_date >= CURRENT_DATE)
LEFT JOIN pm_tenants t ON t.id = b.tenant_id
WHERE u.is_active = TRUE;

-- Resumen mensual de finanzas por propiedad
CREATE OR REPLACE VIEW pm_monthly_finance AS
SELECT
  property_id,
  DATE_TRUNC('month', COALESCE(paid_at, due_at))::DATE AS month,
  SUM(amount) FILTER (WHERE type = 'ingreso' AND status = 'pagado') AS ingresos,
  SUM(amount) FILTER (WHERE type = 'gasto'   AND status = 'pagado') AS gastos,
  SUM(amount) FILTER (WHERE type = 'ingreso' AND status = 'pagado')
  - SUM(amount) FILTER (WHERE type = 'gasto' AND status = 'pagado') AS utilidad
FROM pm_payments
WHERE COALESCE(paid_at, due_at) IS NOT NULL
GROUP BY property_id, DATE_TRUNC('month', COALESCE(paid_at, due_at));

-- ✅ LISTO. Verificá:
--   SELECT COUNT(*) FROM pm_properties;
--   SELECT * FROM pm_unit_occupancy LIMIT 5;
