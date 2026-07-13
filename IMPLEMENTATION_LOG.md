# IMPLEMENTATION_LOG — Auditoría Maestra 2026-07-13

Rama `rebuild/os-audit-2026-07` · un commit por ítem · verificación contra fuente antes de commitear.
Estados: ⬜ pendiente · 🔄 en curso · ✅ hecho · ⛔ bloqueado (con nota).

## FASE 0 — Fundaciones
- ✅ **0.1 · O2 property_id canónico** — `property_id` YA estaba poblado (FF 28/28, Remodel 26/26, Rentas 21/21; trabajo previo). Se creó `property_alias` (migr `20260713100000_o2_property_alias.sql`): 175 aliases activos = 28 FF + 28 recIds + 26 Remodel + 21 Rentas + 23 ClickUp folders + 29 maestra + **20 QBO** (las 19 cuentas del Balance mapeadas, 0 sin mapear). **Dudoso documentado:** QBO "Rental Property - Casas Marlin" agrupa 2 casas → alias FAN-OUT (2 filas: Bartlett + Capps; el unique incluye property_id a propósito). Bitter Creek 2425/2511 no está en los espejos activos (no hay deal activo con ese nombre) — si aparece, se agrega alias manual. **Aceptación OK:** query de prueba une ff_deals↔qb_report_cache por property_id (Idlewood $316,000, Nesting $286,012, Dove $270,000…). RLS: lectura por áreas, escritura solo service.
- ⬜ 0.2 · O1 capa única de KPIs
- ⬜ 0.3 · O3+O4 design system + TermTooltip/DrillDown/NextAction
- ⬜ 0.4 · O8+P2 retirar legacy + alerta divergencia
- ⬜ 0.5 · B17 soft-delete ghosts + guard-rails

## FASE 1 — Palancas de plata
- ⬜ 1.1 · B1+B3 EBITDA verdadero + matar fantasma
- ⬜ 1.2 · #2 capital desplegado único
- ⬜ 1.3 · N1+N3+N4 interés HML por casa + waterfall + ICR
- ⬜ 1.4 · N2 panel equity incorporado
- ⬜ 1.5 · O5+B10 reconciliador + re-sync espejo QBO
- ⬜ 1.6 · B2 guard-rail conciliación
- ⬜ 1.7 · B5+B6+B8 ficha + reporte obra + nómina

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
