-- Bucket para comprobantes de pago de inquilinos (tab Inquilinos · CRM).
-- Correr una vez en el SQL editor de Supabase. Idempotente.

-- 1. Crear bucket público (si no existe)
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Policies: authenticated puede subir/leer/borrar; público puede leer (bucket public).
DROP POLICY IF EXISTS pm_proofs_read ON storage.objects;
CREATE POLICY pm_proofs_read ON storage.objects
  FOR SELECT USING (bucket_id = 'payment-proofs');

DROP POLICY IF EXISTS pm_proofs_insert ON storage.objects;
CREATE POLICY pm_proofs_insert ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'payment-proofs');

DROP POLICY IF EXISTS pm_proofs_update ON storage.objects;
CREATE POLICY pm_proofs_update ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'payment-proofs');

DROP POLICY IF EXISTS pm_proofs_delete ON storage.objects;
CREATE POLICY pm_proofs_delete ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'payment-proofs');
