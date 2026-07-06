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
