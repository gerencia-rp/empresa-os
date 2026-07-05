# LOOP · BITÁCORA

## 5-jul-2026 · Ciclo FF-1 (en curso)
**Plan**: revivir sync FF (edge function molde Remodelación: upsert airtable_id + archive-unseen + paridad). **Verificación**: paridad 29=29, Σcompra $5,546,100, ΣARV $11,015,000 vs Airtable.
**FF-1 VERIFICADO** (5-jul): sync-ff-airtable deployado y corrido. Paridad deals 29=29, draws 24=24, investors 21=21 (in_sync=true). Σcompra $5,546,100 ✓exacto vs Airtable, ΣARV $11,015,000 ✓. remodel_complete ahora = Costo Remodelación Real (Bethune 155,659.5 = monto_real Remodelación). Nuevos espejos: ff_overhead 164 filas ($127,875 = equipo $86,294 + plataformas $41,581), ff_hml_payments 139 filas (intereses reales $256,086 vs $46k hardcodeado — 5.6x). Soft-delete completo (archived_at + archive-unseen).

## Ciclo FF-2 (en curso)
**Plan**: UI consume overhead/HML reales; borrar $146k/$46k de ff-command-center.js + os.js (5 spots); EBITDA FF real en Finanzas; footer honesto. **Verificación**: grep 0 hardcodes, UI muestra $127,875/$256,086, build+smoke OK.
**FF-2 VERIFICADO** (5-jul): 0 hardcodes 146k/46k en el repo (grep). UI muestra overhead real $127,875, intereses reales $256,086, EBITDA FF aprox, conciliación con badges "Real", footer honesto. Smoke: 29 deals, ff_overhead 164, ff_hml 139, 0 pageerrors. Recurrencia: cron diario sync-airtable ahora también dispara sync-ff-airtable + sync-remodel-airtable (sin función Vercel nueva, límite 12 respetado). Commits en main, bundle 95c41b741a5f.

## 5-jul · Ciclo RN-1 (en curso) — Rentas P0 paridad de pagos
**Plan**: diagnosticar los 22 pagos faltantes (skip rules del sync), fix + assert de paridad pm_* + verificar base de PRODUCCIÓN. **Verificación**: paridad pagos 326=326 (o skips justificados y visibles), ingresos recalculados, base correcta.
**RN-1 VERIFICADO** (5-jul): PARIDAD RENTAS 6/6 in_sync=true (props 21=21, units 48=48, tenants 89=89 [1 fila vacía en fuente, warning], bookings 65=65, PAGOS 326=326, gastos 497=497 [fantasma archivado]). Los 22 pagos sin fecha se importan con status 'revisar' (+warning pago_sin_fecha, accionable) y NO cuentan en ingresos ($285,579 idéntico pre/post). Migración: CHECK de status amplía con 'revisar'. Base verificada: default apptTKRYbx6gu701i (producción), secret AIRTABLE_BASE_ID no seteado. Assert de paridad pm_* en remodel_sync_parity, corre en cada sync.

## Ciclo CT-1 (en curso) — v_holding_pnl
**Plan**: vista consolidada (empresa: ingreso/costo/overhead/ebitda; FF separando realizado vs inyectado) + bloque en /contable. **Verificación**: remodel ebitda $130,275 en la vista; FF realizado vs inyectado suman Σ net_total; UI renderiza sin errores.
**CT-1 VERIFICADO** (5-jul): v_holding_pnl creada — remodelacion EBITDA $130,275 (exacto vs auditoría), fix_flip realizado −$187,203 / inyectado −$232,243 (suman Σ net_total −$419,446 ✓), rentas EBITDA −$140,439, consolidado −$325,242. Bloque "P&L del holding" en /contable renderiza (5 filas, 0 pageerrors). QuickBooks parqueado esperando input del CEO.
