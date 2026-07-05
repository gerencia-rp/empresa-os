# Auditoría · REMODELACIÓN — 5 Jul 2026

Auditor-arquitecto · Fase 1 (solo lectura). Fuente de verdad: Airtable `appwFRqnkyyRljOld` / tabla Propiedad en Reparación `tblw28KVOUcCAKZBU`. Espejo: Supabase `nezbaljfhhyznhltpjnk`.

---

## 1 · Modelo de datos real

| Tabla Supabase | Fuente | Filas (activas) | Llaves / columnas clave |
|---|---|---|---|
| `remodel_at_properties` | Airtable Propiedad en Reparación (sync `sync-remodel-airtable`) | **30** (+1 archivada) | `airtable_id` PK-lógica · `property_id` (uuid → `properties.id`) · `active/archived_at` · financieras: `monto_real` (ingreso/draws), `gasto_materiales`, `gasto_trabajadores`, `presupuesto_interno`, `ganancia`, `rentabilidad`, `retraso_dias`, `sqft` · `avance_pct` (grueso) · `avance_real` (Planner) |
| `remodel_projects` | Estimador Pro (app propia) | **30** (+1 archivado) | `id` uuid · `property_id` FK → `properties` · `progress` (jsonb granular) · `progress_real` (Planner) · budgets |
| `weekly_activities` | Planner Semanal (app propia) | **355** | `id` · `project_id` · `property_id` FK → `properties` (355/355 pobladas) · `status/is_critical/baseline_date` |
| `remodel_overhead` | Airtable: Gastos Empresariales `tblk1vS2` + Nómina Admin `tblv77` + Plataformas `tblgd4` | **107** | `airtable_id` PK · `source/categoria/monto` · soft-delete |
| `remodel_okrs` | Airtable: OKRs / Metas `tblGUPnE4E5IrUGEt` | **8** | `clave/objetivo/comparador/unidad` |
| `remodel_worker_hours` (+`remodel_crew_rates`, vista `remodel_worker_pay_summary`) | Airtable: Horas Trabajadas `tblyCieX` + Personal en Campo `tblQzJo` | **3,364** | `casa_norm` · horas/pago |
| `remodel_sync_parity` | escrita por el sync | 1 | assert de paridad Airtable vs espejo |
| Vistas | derivadas | — | `v_remodel_progress` (avance por casa) · `remodel_obra_calibration` · `remodel_stage_deviation` · `v_remodel_casas_unmatched` |

Adaptador front: `rcObraDataset()` + `rcFin()` (una definición por métrica) en `remodel-command-center.js`; Reportes CEO (`remodel-reportes.js`) consume el adaptador. ✅ Pilares 1–3 cumplidos en la capa de datos.

## 2 · Paridad e integridad — ✅ SANO

| Check | Espejo | Fuente | Estado |
|---|---|---|---|
| Obras activas | 30 | Airtable **30** (`totalRecordCount`) | ✅ match |
| Assert de paridad | `remodel_sync_parity.in_sync = true` (checked 5-jul) | — | ✅ activo, corre en cada sync |
| Fantasmas | 1 archivada ("909 Neans Dr", `active=false`) | no existe en Airtable | ✅ soft-delete respetado |
| Proyectos Estimador | 30 activos + 1 archivado (909 Neans) | — | ✅ |
| Distribución `Procesos` | Finalizado 22 · En construcción 3 · Pre construcción 5 | idéntico en Airtable | ✅ |
| `property_id` | obras 30/30 · proyectos 30/30 · actividades 355/355 | — | ✅ backbone completo |
| Casas sin match | `v_remodel_casas_unmatched` = **0** | — | ✅ |

## 3 · Verificación de KPIs (recalculados desde crudo)

| Métrica | Recalculado (SQL crudo) | Fuente Airtable | UI (CC/Reportes) | Veredicto |
|---|---|---|---|---|
| Ganancia BRUTA (Σ Utilidad finalizadas) | **$265,356** | **$265,355.74** (suma de las 22 `Utilidad`) | $265k | ✅ exacto |
| Ingreso (Σ Monto Real, fin.) | $1,635,689 | fórmula Airtable | — (base de margen) | ✅ |
| Costo real (Σ (mat+trab)×1.05) | $1,438,488 | = fórmula "Valor Remodelación" | — | ✅ |
| Margen bruto | **16%** | — | 16% | ✅ |
| Desviación de costo | **+7%** (costo_real vs presupuesto) | — | +7% | ✅ (corregido en auditoría previa; antes +29% falso por usar ingreso) |
| Desviación de días | **-2d** prom · mediana **0d** · **1 outlier** (>|180|: Barkbridge -397d) | — | -2d · mediana 0d · 1 a revisar | ✅ |
| $/sqft promedio | **$49** | — | $49 | ✅ |
| Rentabilidad prom | **14.6%** | — | 14.6% | ✅ |
| Overhead total / OPEX | $151,931 / **$135,081** (capex vehículos $16,850 excluido) | Σ de las 3 tablas | $152k / $135k | ✅ |
| EBITDA (BRUTA − OPEX) | **$130,275** (margen 8%) | — | $130k | ✅ |
| OKRs | 8 metas desde Airtable, 2/8 cumplidas | tabla OKRs / Metas | 2/8 | ✅ |
| Avance 1133 Denfield | Planner 96% = obra 96% = proyecto 96% | Airtable campo "Avance Real (Planner)" = 96 | 96% en las 3 superficies | ✅ fuente única |

**Ninguna métrica de la UI discrepa del recálculo crudo.** Definición única por métrica verificada (`rcFin` / `v_remodel_progress`).

## 4 · Ecosistema (property_id / puentes)

- `properties` (registro canónico) = 52 filas; **30 son de Remodelación** (mint del backbone, status `remodeling`).
- Cruce real de casas: **23/30 obras también están en Fix & Flip** (`ff_deals`, por `norm_casa`) y **17/30 en Rentas** (`pm_properties`). El flujo FF→Remodel→Rentas existe en la data.
- ⚠️ El cruce con FF/Rentas hoy es por **dirección normalizada**, no por `property_id`: `ff_deals` y `pm_properties` **no tienen columna `property_id`** → pilar 5 incompleto fuera de Remodelación (ver P1-2).

## 5 · UX / consistencia

- ✅ CC 7 secciones + Reportes CEO con filtros de período unificados (mes/trim/YTD/histórico/custom), tema claro/oscuro, badge de paridad, badges de completitud (N/5 campos), semáforos, formato $ consistente (`RC_M/RC_K`).
- ⚠️ P2: en Reportes, el **overhead no se prorratea** al período elegido (R2 con filtro "mes" resta el overhead histórico completo → EBITDA de período corto queda subestimado).
- ⚠️ P2: el `lider` en el espejo guarda **recIDs crudos** (`recX11N…`); la resolución a nombre ocurre solo en el front (`rcResolveName` + `remodel_crew_rates`). Cualquier consumidor nuevo (SQL, agente IA, export) ve recIDs.

## 6 · Findings priorizados

### P0 — (ninguno abierto)
La paridad, el soft-delete, la definición única de métricas y el avance único están implementados y verificados. No hay integridad rota.

### P1
1. **Cobertura del Planner = 3/30 casas (10%).** Solo Denfield/Wellington/Starbright tienen cronograma → 27 obras siguen con el `avance_pct` grueso (singleSelect manual) como único avance. El "avance único" es arquitectura lista pero adopción baja. **Fix:** generar cronograma para las obras en curso/pre-construcción restantes (el Estimador ya auto-genera al guardar; falta cargar/estimar esas obras) o import Excel masivo. Evidencia: `v_remodel_progress` = 3 property_id.
2. **`property_id` no existe en `ff_deals` ni `pm_properties`.** El puente inter-empresa corre por `norm_casa(address)` (funciona: 23 y 17 matches) pero es la llave débil. **Fix (chico):** `ADD COLUMN property_id uuid` + extender el RPC `remodel_backfill_property_ids()` a ambas tablas (mismas normas). Aditivo, sin romper nada.
3. **Write-back de avance a Airtable bloqueado (403).** El `AIRTABLE_TOKEN` es read-only en `appwFRqnkyyRljOld`; el sync ya trae el código y reporta `wb_status`. **Fix: acción del CEO** — dar scope `data.records:write` al PAT en esa base. Hoy el campo "Avance Real (Planner)" fue poblado a mano (96/34/23) y quedará desactualizado.
4. **Calidad de datos accionable:** 7/30 obras sin `sqft` (23% fuera del $/sqft y de la calibración), 5/30 sin líder. El badge N/5 lo muestra por card, pero no hay panel "corregir en Airtable" con la lista (patrón que Rentas sí tiene). **Fix:** mini-panel de data quality en el CC con deep-link a Airtable.

### P2
5. **Overhead sin dimensión temporal en Reportes** (R2/R1 con período ≠ histórico restan overhead completo). `remodel_overhead` ya tiene `mes/anio/fecha` → prorratear en `rpOverhead()` según el filtro.
6. **Resolución de líder en el sync, no en el front.** Persistir `lider_nombre` resuelto en el espejo (el raw queda para trazabilidad); el front y los agentes IA leen el nombre.
7. **Avance v2 pendiente (por diseño):** `v_remodel_progress` ya expone `criticas/criticas_done`; falta la versión ponderada por horas/`is_critical`.
8. **Outlier de fechas** (419 Barkbridge -397d) sigue sucio en la fuente; hoy se excluye y se marca "a revisar". **Fix:** corregir la fecha en Airtable (o agente IA de saneo de fechas).

## Oportunidades (pilar 4 — agentes IA)
- **Agente de saneo de datos**: barre `remodel_at_properties` (sqft nulo, fechas imposibles, líder vacío) → propone el fix con deep-link a Airtable. Input: espejo; output: lista accionable; humano: aprueba en Airtable.
- **Agente reporte mensual**: Fase 2 del módulo Reportes — R1 por mail al cierre de mes (cron + `_pm-send.mjs` de Rentas ya resuelve el envío).
- **Calibración del Estimador**: `remodel_obra_calibration` (20 obras, $54.8/sqft real, desv +32.4% histórica pre-corrección) está lista y **no se aplica** aún a los coeficientes del Estimador — el loop de aprendizaje es dato-listo.
- **Data valiosa no mostrada**: `remodel_snapshots` (SPI/CPI diario por obra — hay serie temporal para gráfica de tendencia); `weekly_activity_moves` (8 movimientos con motivo — ya alimenta Desviación, podría alimentar el Cerebro).

---
**Veredicto Remodelación: SANO.** Paridad exacta, KPIs verificados al dólar, backbone `property_id` completo, avance único operativo. Los P1 son de adopción/alcance (cobertura del Planner, token write, puente property_id hacia FF/Rentas), no de integridad.
