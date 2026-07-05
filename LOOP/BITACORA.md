# LOOP · BITÁCORA

## 5-jul-2026 · Ciclo FF-1 (en curso)
**Plan**: revivir sync FF (edge function molde Remodelación: upsert airtable_id + archive-unseen + paridad). **Verificación**: paridad 29=29, Σcompra $5,546,100, ΣARV $11,015,000 vs Airtable.
**FF-1 VERIFICADO** (5-jul): sync-ff-airtable deployado y corrido. Paridad deals 29=29, draws 24=24, investors 21=21 (in_sync=true). Σcompra $5,546,100 ✓exacto vs Airtable, ΣARV $11,015,000 ✓. remodel_complete ahora = Costo Remodelación Real (Bethune 155,659.5 = monto_real Remodelación). Nuevos espejos: ff_overhead 164 filas ($127,875 = equipo $86,294 + plataformas $41,581), ff_hml_payments 139 filas (intereses reales $256,086 vs $46k hardcodeado — 5.6x). Soft-delete completo (archived_at + archive-unseen).

## Ciclo FF-2 (en curso)
**Plan**: UI consume overhead/HML reales; borrar $146k/$46k de ff-command-center.js + os.js (5 spots); EBITDA FF real en Finanzas; footer honesto. **Verificación**: grep 0 hardcodes, UI muestra $127,875/$256,086, build+smoke OK.
**FF-2 VERIFICADO** (5-jul): 0 hardcodes 146k/46k en el repo (grep). UI muestra overhead real $127,875, intereses reales $256,086, EBITDA FF aprox, conciliación con badges "Real", footer honesto. Smoke: 29 deals, ff_overhead 164, ff_hml 139, 0 pageerrors. Recurrencia: cron diario sync-airtable ahora también dispara sync-ff-airtable + sync-remodel-airtable (sin función Vercel nueva, límite 12 respetado). Commits en main, bundle 95c41b741a5f.
