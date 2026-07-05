-- Rentas P0 (paridad de pagos): permitir status 'revisar' para pagos sin Fecha de Pago en Airtable.
-- Ampliación del CHECK (permite un valor más — ningún dato existente viola). NO cuenta en ingresos
-- (los KPIs filtran status='pagado').
ALTER TABLE public.pm_payments DROP CONSTRAINT IF EXISTS pm_payments_status_check;
ALTER TABLE public.pm_payments ADD CONSTRAINT pm_payments_status_check
  CHECK (status = ANY (ARRAY['pendiente'::text, 'pagado'::text, 'vencido'::text, 'anulado'::text, 'revisar'::text]));
