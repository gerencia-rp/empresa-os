-- ════════════════════════════════════════════════════════════════
-- VENCIMIENTO DE PAGO POR INQUILINO — espejo de 👤 Inquilinos ·
-- "Vencimiento Pago Renta" (fldrUJY0EOjKEb0Qf, texto libre:
-- "Primeros 3 dias del mes" · "Dia 27 de cada mes"). El front extrae el
-- día (primer número 1-31, default 3) para decidir cuándo un saldo del
-- MES EN CURSO pasa de "Pendiente" a "Atrasado · N días".
-- ADITIVA. Rollback al pie.
-- ════════════════════════════════════════════════════════════════

alter table public.pm_tenants add column if not exists vencimiento_pago text;

-- ─────────────────────────────────────────────────────────────────
-- ROLLBACK:
--   alter table public.pm_tenants drop column if exists vencimiento_pago;
-- ─────────────────────────────────────────────────────────────────
