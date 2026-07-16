-- 📋 CARTERA (15-jul) — ver 20260715140000: columnas espejo + vistas + RPC. Aplicadas en prod via MCP.
-- 1) pm_payments += renta_pactada (fldpUSJ1HdZQmQPMH) + deuda (flduMsIV5gZRIv1eU)
alter table pm_payments add column if not exists renta_pactada numeric;
alter table pm_payments add column if not exists deuda numeric;

-- 2) v_cartera_inquilino / v_cartera_kpi (security_invoker) + RPC cartera_informe(p_mes, p_desde)
-- (definiciones completas: ver historial MCP 15-jul; idempotentes con create or replace)
