# 🏚 BLUEPRINT · FIX & FLIP (empresa matriz)

**Spec del CEO (5-jul-2026) — documento de trabajo.** Todo módulo se construye y verifica contra esto.

## Visión

1. **Dashboard de casas + flujo de procesos**: todas las propiedades y su estado (Lead → Bajo contrato → Comprada → En remodelación → En renta/venta → Salida). **Semáforos por casa**: all-in > 75% ARV · vencimiento HML cerca · desvío de presupuesto.
2. **Motor de underwriting unificado**: calculadoras (ARV, **MAO = ARV×75% − rehab − holding − closing − lender fees − contingencia**, aporte del inversionista, hipoteca/HML Harmony solo intereses, renta neta) sobre **UN modelo por casa** + supuestos en config (nada hardcodeado); cambiar ARV recalcula en cascada. Escenarios best/base/worst + sensibilidad. **Calibradas con histórico** de casas cerradas ($/sqft por zona).
3. **Selector de modelo por casa** (Fix&Flip / BRRRR / Renta / Wholesale) → aplica calculadoras, flujo, rentabilidad y participación nuestra vs inversionista.
4. **Portal del inversionista** (solo lectura, aislado): cada inversionista ve solo sus proyectos, capital account, waterfall, distribuciones, estado de la casa.
5. **Generador de deck** para inversionista (PptxGenJS) con números reales + track record.
6. **Análisis de data y ejecución** (rentabilidad por zona/modelo/inversionista) + proyecciones (hold vs sell, refi, 5 años).
7. **Informes/KPIs.**

## Reglas duras
Todo sobre `property_id` y data real (`ff_deals`, `ff_draws`, `ff_investors`, `ff_hml_payments`, Datos por casa). Aditivo, soft-delete, una sola definición por métrica, calculadoras calibradas con histórico. Fuente = Airtable `applMXFyPq1hXj7iN` vía sync con paridad (ya en vivo, 29=29).

## Pipeline canónico (mapeo de stages)
`Estado Actual` (Airtable) → flujo blueprint:
| Blueprint | Stage espejo | Hoy |
|---|---|---|
| Lead | `lead` | 0 (columna lista, se llena desde Airtable) |
| Bajo contrato | `bajo_contrato` | 0 (ídem) |
| Comprada | `adquirida` | 5 |
| En remodelación | `en_rehab` | 4 |
| En renta/venta | `en_venta` + `rentada` | 2 + 12 |
| Salida | `refinanciada` + `vendida` | 4 + 1 |

## FASE 2 · Roadmap priorizado (métricas de éxito por módulo)

| # | Módulo | Depende de | Métrica de éxito (cómo sabemos que está) |
|---|---|---|---|
| **M1** | Dashboard casas + pipeline + semáforos | `ff_hml_loans` (espejo "Datos por casa") + `property_id` en ff_deals | Pipeline con las 6 etapas blueprint y 29/29 casas; 3 semáforos calculados de data real y verificables por SQL (N all-in>75%, N HML<45d, N desvío>10%); paridad `ff_hml_loans` = fuente; 0 pageerrors |
| **M2** | Motor de underwriting unificado + calibración | M1 + `ff_uw_config` (supuestos) + calibración $/sqft por zona (histórico cerradas + `remodel_obra_calibration`) | 1 modelo/casa: cambiar ARV recalcula MAO/aporte/renta en cascada (test: ARV±10% → MAO responde exacto); 0 supuestos hardcodeados (todos en config editable); banda $/sqft por zona derivada de ≥15 casas cerradas; escenarios b/b/w + sensibilidad |
| **M3** | Selector de modelo por casa | M2 | los 4 modelos aplican set de cálculo distinto y correcto (golden tests por modelo); split nosotros/inversionista por modelo |
| **M4** | Portal inversionista | M1 + waterfall def | aislamiento verificado (inversionista X no puede leer proyectos de Y — test RLS); capital account cuadra con Capital aportado (fuente) al dólar |
| **M5** | Deck generator | M2+M4 | deck PPTX con números 100% de espejo (0 hardcode) + track record histórico real; genera en <10s |
| **M6** | Análisis + proyecciones | M2 | rentabilidad por zona/modelo/inversionista recalculable por SQL; proyección 5 años con supuestos de config |
| **M7** | Informes/KPIs | M1–M6 | molde Reportes CEO Remodelación aplicado a FF |

**ESTADO (5-jul-2026): M1 ✅ M2 ✅ M3 ✅ M4 ✅ M5 ✅ M6 ✅ M7 ✅ — BLUEPRINT COMPLETO.** Evidencia por módulo en LOOP/BITACORA.md.

## Definiciones únicas (extienden las existentes)
- `all_in` = purchase + remodel_complete (real, = base Remodelación) + holding (draws) — YA en `ffCompute`.
- `all_in_pct` = all_in / ARV. Semáforo 🔴 si > 0.75 (config, no hardcode → `ff_uw_config.all_in_max_pct`).
- `hml_due_days` = Fecha Vencimiento HML − hoy (de `ff_hml_loans`). Semáforo por umbral config (`hml_warn_days`, default 45).
- `budget_dev_pct` = (remodel_complete − remodel_est) / remodel_est. Semáforo por `budget_warn_pct` (default 10%).
- `MAO` = ARV×`arv_factor` − rehab − holding_est − closing − lender_fees − contingencia (todos de config/calibración).

*Actualizar este doc con cada módulo entregado.*
