# IMPLEMENTATION_LOG — Auditoría Maestra 2026-07-13

Rama `rebuild/os-audit-2026-07` · un commit por ítem · verificación contra fuente antes de commitear.
Estados: ⬜ pendiente · 🔄 en curso · ✅ hecho · ⛔ bloqueado (con nota).

## FASE 0 — Fundaciones
- ✅ **0.1 · O2 property_id canónico** — `property_id` YA estaba poblado (FF 28/28, Remodel 26/26, Rentas 21/21; trabajo previo). Se creó `property_alias` (migr `20260713100000_o2_property_alias.sql`): 175 aliases activos = 28 FF + 28 recIds + 26 Remodel + 21 Rentas + 23 ClickUp folders + 29 maestra + **20 QBO** (las 19 cuentas del Balance mapeadas, 0 sin mapear). **Dudoso documentado:** QBO "Rental Property - Casas Marlin" agrupa 2 casas → alias FAN-OUT (2 filas: Bartlett + Capps; el unique incluye property_id a propósito). Bitter Creek 2425/2511 no está en los espejos activos (no hay deal activo con ese nombre) — si aparece, se agrega alias manual. **Aceptación OK:** query de prueba une ff_deals↔qb_report_cache por property_id (Idlewood $316,000, Nesting $286,012, Dove $270,000…). RLS: lectura por áreas, escritura solo service.
- ✅ **0.2 · O1 capa única de KPIs** — migr `20260713110000`: v_capital_deployed (equity $963,597.63 ✓ / QBO $728,361 stale→1.5, deuda HML OS $5.2M / QBO $4.5M separadas) · v_property_360 (Wellington equity +$200,000 ✓ exacto; líder resuelto vía airtable_record_names — parcial, faltan nombres en esa tabla) · v_obras+v_obras_kpi (26/7, utilidad $170,682 ✓, ingreso $1,466,360 ✓, margen ponderado 11.6% ✓) · v_ocupacion (48/45/3/0 = 93.75% ✓ EXACTO tras archivar 45 pm_units stale verificadas contra Airtable vivo) · v_pnl_casa (interés real Σpagos + prorrateado días×tasa con cap al vencimiento si refinanció; tasa_pct llega como fracción). security_invoker=on en todas.
- ✅ **0.3 · O3+O4** — ui/kit.js + tokens ya existían (trabajo previo); se agregó `ui/kit-decision.js`: GLOSARIO central 24 términos + kitTerm (tooltip hover) + kitDrill (overlay con fuente) + kitNext (🔍 Qué revisar, patrón EVM) + kitKpi (Tarjeta-KPI estándar con faltantes 🟡) + kitSkeleton (shimmer + prefers-reduced-motion). Unit tests OK.
- ✅ **0.4 · O8+P2** — lecturas YA eran Planner-first (os.js + CC verificado). v_divergencias_legacy (migr `20260713120000`): 3 obras avance legacy≠Planner + Bramble Unidades 3≠5 → check C19 en el Sabueso (el manual no pasa en silencio). ⚠ NOTA HUMANA: retirar el singleSelect "Porcentaje avance obra" y el campo "Unidades" desde la UI de Airtable (la API no borra campos).
- ✅ **0.5 · B17** — rec fantasma F&F recp4dED0aFJvDldk: NO entra al espejo (sync filtra sin dirección) · units vacías: 0 activas · Estimador: dupe real = Charles St ×2 → archivado el viejo (migr `20260713130000`), quedan 31 · guard-rails noZeroAsReal/reconcileLE/emptyState en kit-decision (tests OK).

## FASE 1 — Palancas de plata
- ✅ **1.1 · B1+B3** — "Rentabilidad draws/EBITDA FF" (Σnet_total −$320,230 ✓ reproducido) → "Déficit de capital en hold (a recuperar vía refi/venta)"; Ganancia real = Net Income P&L QBO YTD ($57,060.76 espejo al 6-jul; la auditoría vio $46,102.99 en QBO vivo — B10 re-sync pendiente en 1.5) con as_of; fantasma $1,067,530 NO reproducible en código ni espejo actual.
- ✅ **1.2 · #2** — v_capital_deployed en los 5 módulos (heros CC+Inversionistas = ffCapitalHero con DrillDown equity/deuda; Finanzas y Analítica reetiquetadas "All-in (COSTO)"; Global os.js). La deuda jamás se presenta como capital.
- ✅ **1.3 · N1+N3+N4** — KPIs al tope: interés/ingreso 68% + ICR 0.35× (rojo, TermTooltip+NextAction; auditoría decía 61.5%/0.29× con espejo más viejo) · waterfall único $170,682 → −interés YTD $141,907 → −overhead $133,226 → Net QBO $57,061 con residuo declarado · P&L por casa con interés HML en la línea (v_pnl_casa).
- ✅ **1.4 · N2** — panel "💎 Equity incorporado del holding" Σ(ARV−all-in) solo casas con obra real, barras + DrillDown por casa (ARV−compra−rehab).
- ✅ **1.5 · O5+B10** — re-sync ejecutado vía qb-oauth/sync (READ-only): Investor Contributions $728,361→**$763,361** ✓ y HML-Refin $1,220,700→**$1,459,200** ✓ (= QBO vivo de la auditoría), HML vivo $4,515,214 intacto, as_of 13-jul · reconciliador 3 columnas OS|QBO|Airtable en /contable con Δ y alerta >5% (umbral o5_delta_warn_pct).
- ✅ **1.6 · B2** — "sin conciliar" = solo C1–C3 (conciliación real, neteado por concepto); el resto es "$ señalado a revisar"; candado reconcileLE vs Total Assets del holding → "⛔ motor en error" si se viola.
- ✅ **1.7 · B5+B6+B8** — B5: ficha muestra Equity incorporado SIEMPRE (v_property_360: Wellington +$200,000; déficit en hold pasa a secundario "a recuperar, no es pérdida"; all-in desglosado compra+rehab; líder resuelto) · B6: verificado YA cubierto por trabajo previo (badge "en curso · proyectado", utilidad proyectada = valor_cliente − gasto = fórmula de la auditoría, Denfield +$63K; avance Planner-first de 0.4) · B8: sync-remodel-workers mapea el LINK Personal en Campo + lookup tarifa + link propiedad (deployado + corrido: 3,433/3,436 filas con recId), v_remodel_nomina_ledger v2 joinea por recId (texto libre solo fallback legacy) — **0 sin tarifa (antes 177) · 0 deudas negativas (antes 172)** · sobrepago $133,902 visible aparte · deuda neta $39,026. NOTA: si falta tarifa de alguien nuevo se carga EN AIRTABLE (Personal en Campo), no acá.

## FASE 2 — Consistencia
- ⬜ 2.1 · B4+B13+B14 ocupación única
- ⬜ 2.2 · B7+B9 roll-ups + rentabilidad
- ⬜ 2.3 · O6 motor de reportes PDF
- ⬜ 2.4 · P7 NextAction en toda la app
- ⬜ 2.5 · O9+B11+B15 cerebro por $ + limpiezas contables

## FASE 3 — Datos / proceso / inteligencia
- ⬜ 3.1 · O7 supuestos calibrados
- ⬜ 3.2 · N7 auto-scheduler ClickUp
- ⬜ 3.3 · N5+N6+N9 rent-roll + analítica + ranking
- ⬜ 3.4 · N8+B16+O12+O13 fábrica IA robusta
- ⬜ 3.5 · N10+N11+N12 detectores y disciplina

## Cierre
- ⬜ Gate de CI (4 checks) + re-auditoría 28 dimensiones
