-- ════════════════════════════════════════════════════════════════
-- 🔧 FIX · aflojar 2 constraints que impedían el sync completo
-- 1. UNIQUE(property_id, code) en pm_units → DROP (Airtable tiene
--    múltiples records distintos para la misma habitación física)
-- 2. CHECK constraint en pm_tenants.source → ampliar para aceptar
--    'contrato_directo' y 'padsplit' (que vienen de Airtable)
-- ════════════════════════════════════════════════════════════════

-- 1) pm_units: drop UNIQUE (property_id, code)
ALTER TABLE pm_units DROP CONSTRAINT IF EXISTS pm_units_property_id_code_key;

-- 2) pm_tenants: ampliar valores aceptados en source
ALTER TABLE pm_tenants DROP CONSTRAINT IF EXISTS pm_tenants_source_check;
ALTER TABLE pm_tenants ADD CONSTRAINT pm_tenants_source_check
  CHECK (source IN (
    'directo','contrato_directo',
    'airbnb','booking','vrbo','hospitable','padsplit',
    'referido','walk-in','redes','otro'
  ));

-- 3) BONUS · Aflojar también booking_type por las dudas (si llegan otros valores)
ALTER TABLE pm_bookings DROP CONSTRAINT IF EXISTS pm_bookings_booking_type_check;
ALTER TABLE pm_bookings ADD CONSTRAINT pm_bookings_booking_type_check
  CHECK (booking_type IN (
    'contrato_directo','airbnb','booking','vrbo','hospitable','padsplit','reserva_corta','otro'
  ));

-- ✅ LISTO. Después corré el sync de vuelta (no dry, esta vez sync real)
--    y vas a ver Reservas: 52 (o cerca).
