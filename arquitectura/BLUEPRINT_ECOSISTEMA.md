# 🏛 BLUEPRINT · ECOSISTEMA FLIPPING RENTALS OS

Documento de trabajo por empresa. §1 Fix & Flip: ver `BLUEPRINT_FF.md` (**M1–M7 COMPLETO**, 5-jul).

---

# §2 · REMODELACIÓN (spec CEO 5-jul-2026)

**Base construida** (verificada en `auditoria/remodelacion.md`): Planner↔Estimador↔CC conectados por `property_id`, avance único (`v_remodel_progress` + triggers), Reportes CEO (R1–R5), paridad 30=30, EBITDA real.

## FASE 2 · Roadmap — existe vs falta

| # | Módulo | Ya existe | Falta | Métrica de éxito |
|---|---|---|---|---|
| **RM-C1** | **Loop de aprendizaje / calibración** | Lado COSTO promovido: `remodel_forecast_params` (psf_real 46.74, mo 47.4%, días/sqft 0.0437, n=18) consumido por el pronosticador; vistas `remodel_obra_calibration` (20 obras) y `remodel_stage_deviation` (baseline por triggers) | Lado DÍAS por etapa **aplicado** a la generación del cronograma; vista unificada del loop con **tendencia** (todas vs últimas 5 cerradas = "se afina con cada obra"); visibilidad en Estimador + CC | Vista `v_remodel_calibracion_loop` = SQL verificable; factor de días por etapa **aplicado** en `rmAutoGenPlanner`/`rmSyncToPlanner` (test: días escalan por factor con guard n≥umbral); desviación por etapa UI = SQL; tendencia últimas-5 vs histórico visible |
| **RM-C2** | Control exhaustivo de presupuesto por casa | presupuesto vs costo_real agregado (CC, `rcFin`), desvío por obra (EvR), `remodel_alerts` sobre-presupuesto (>110%) | Desglose **material vs horas** por casa (Pago de Materiales + Horas Trabajadas vs presupuesto), umbral de alerta en config, panel por casa | por casa: presup vs (mat real + MO real de horas×rate) = SQL exacto; alerta dispara al umbral config; 0 hardcode |
| **RM-C3** | Bitácoras de avance auto-generadas | Planner con `done` por día, `weekly_activity_moves`, reporte PDF día/semana/mes | Bitácora por casa: narrativa diaria/semanal auto (qué se hizo, quién, fotos si hay, % avance delta) exportable | bitácora de una casa = actividades done reales del rango; export; 0 invento |
| **RM-C4** | Ledger de nómina de campo | `remodel_worker_hours` (3,364) + `remodel_crew_rates` + vista pay_summary | **Deuda por trabajador**: devengado (horas×rate) vs pagado (campo pago), por casa y total; antigüedad | Σ devengado−pagado por trabajador = SQL exacto; por casa cruza por `casa_norm`/property_id; total cuadra con Σ horas×rate |

**Reglas**: property_id + data real (remodel_projects, weekly_activities, remodel_worker_pay_summary, Pago de Materiales, Horas Trabajadas, remodel_at_properties, remodel_overhead) · aditivo · soft-delete · una definición por métrica · verificación al cierre de cada módulo.

**ESTADO (5-jul-2026): RM-C1 ✅ RM-C2 ✅ RM-C3 ✅ RM-C4 ✅ — §2 COMPLETO.** Evidencia en LOOP/BITACORA.md.

## Definiciones únicas (nuevas)
- `factor_dias(etapa)` = 1 + avg_slip_days(etapa) — cada actividad del Planner es 1 día-tarea; el slip promedio por tarea ES el sobrecosto de tiempo de la etapa. Guard: solo se aplica con `n_tasks ≥ n_threshold` (param existente = 3).
- Tendencia del loop = métrica sobre TODAS las cerradas vs sobre las ÚLTIMAS 5 (por `fecha_real_fin`) — si convergen, el estimador está calibrado.
- MO real por casa = Σ horas×rate (worker_hours) · Material real = `gasto_materiales` (espejo) o Σ Pago de Materiales.

---

# §3 · RENTAS (Property Management) — blueprint 5-jul-2026

**Base construida** (la más madura del holding): espejo pm_* con **paridad 6/6 + assert** (pagos 326=326), cron diario + write-back de pagos, PM clásico (calendario por habitación, read-only 3 capas), Command Center Rentas + **Cerebro IA** (RAG, resumen del día, calidad de datos accionable), reportes PDF + crons email/WhatsApp, guía de bienvenida, auto-tareas turnover/recepción, ocupación data-driven (regla del dueño 30/33=91%), cobranza (contrato − plata real) en el OS, fila Rentas en `v_holding_pnl`.

## FASE 2 · Roadmap — existe vs falta

| # | Módulo | Ya existe | Falta | Métrica de éxito |
|---|---|---|---|---|
| **RN-M1** | **Cobranza sistemática + renta perdida** (P0: plata) | insight de mora en OS (top 3), deuda = contrato−pagado, infra whatsapp-send, campo "Conciliación IA" en fuente | **Aging por inquilino** (30/60/90), panel de cobranza en CC Rentas, **renta potencial perdida** ($6,200/mes YA medible: 4 unidades libres × renta objetivo), draft de cobro (agente) | aging por inquilino = SQL exacto; renta perdida visible = Σ target_rent de disponibles; draft WhatsApp generado con datos reales; 0 hardcode |
| **RN-M2** | **P&L por casa** | ingresos/gastos por casa en espejo; `Hipoteca mensual` + `Tipo Préstamo` + `Inicio Hipoteca` en fuente (NO espejados); rollups Ingresos/Gastos/Rentabilidad en Airtable Casas | espejar hipoteca → **P&L por casa/mes**: renta real − gastos directos − hipoteca = flujo; regla Cerebro "déficit OK si flujo+" explícita; EBITDA Rentas por casa | P&L por casa = SQL exacto vs espejo; flujo por casa cuadra con rollup de la fuente (spot-check 3 casas); hipoteca espejada con paridad |
| **RN-M3** | **property_id backbone + ficha única** | columna `property_id` ya existe con **19/21 pobladas** (¿por quién? verificar); ficha del OS junta FF+Remodel+Rentas por dirección | completar 21/21 + RPC self-healing (molde), **misma casa = mismo número** en Rentas↔FF↔Remodel (ej. hipoteca de FF `hml_payment` vs la de Rentas), unificar en la Ficha | 21/21 con property_id; ficha muestra renta + obra + deal con la MISMA llave; 2 casas sin match → reporte |
| **RN-M4** | **Contratos + depósitos** | fuente tiene `Fecha Inicio/Fin`, `Alerta Contrato` (fórmula), `Depósito` (NO espejados); cron check-contracts existe | espejar fechas+depósito → panel vencimientos de contrato (30/60d) + ledger de depósitos (regla Cerebro: "depósitos no son renta") | vencimientos = SQL vs fuente; Σ depósitos en custodia visible; alerta a N días (config) |
| **RN-M5** | **Informes CEO Rentas** | reportes PDF semanal/mensual operativos | molde R1–R5 (Reportes CEO): ejecutivo + P&L + ocupación/vacancia + cobranza + export Excel/copiar | mismo criterio que Remodelación: KPIs recalculables, export, 0 hardcode |

**Reglas**: property_id + data real (pm_payments/pm_expenses/pm_units/pm_tenants/pm_bookings + campos de Casas/Inquilinos sin espejar) · aditivo · soft-delete · una definición por métrica (deuda = contrato−pagado ya definida en OS; no duplicar) · verificación al cierre de cada módulo.

**ESTADO (5-jul-2026): RN-M1 ✅ M2 ✅ M3 ✅ M4 ✅ M5 ✅ — §3 COMPLETO.** Evidencia en LOOP/BITACORA.md.
