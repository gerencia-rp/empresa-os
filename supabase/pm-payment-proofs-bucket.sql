-- Buckets para comprobantes de pago (Inquilinos/Pagos) y facturas de gastos (Gastos).
-- Correr una vez en el SQL editor de Supabase. Idempotente.

-- 1. Crear buckets públicos (si no existen)
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', true), ('invoices', 'invoices', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Policies: authenticated puede subir/leer/borrar; público puede leer (buckets public).
DROP POLICY IF EXISTS pm_proofs_read ON storage.objects;
CREATE POLICY pm_proofs_read ON storage.objects
  FOR SELECT USING (bucket_id IN ('payment-proofs','invoices'));

DROP POLICY IF EXISTS pm_proofs_insert ON storage.objects;
CREATE POLICY pm_proofs_insert ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id IN ('payment-proofs','invoices'));

DROP POLICY IF EXISTS pm_proofs_update ON storage.objects;
CREATE POLICY pm_proofs_update ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id IN ('payment-proofs','invoices'));

DROP POLICY IF EXISTS pm_proofs_delete ON storage.objects;
CREATE POLICY pm_proofs_delete ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id IN ('payment-proofs','invoices'));
