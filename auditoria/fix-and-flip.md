# Auditoría · FIX & FLIP — 5 Jul 2026

Auditor-arquitecto · Fase 1 (solo lectura). Fuente de verdad: Airtable `applMXFyPq1hXj7iN` "Flipping Rentals matriz". Espejo: `ff_deals` / `ff_draws` / `ff_investors`. UI: `pm/ff-command-center.js` + nivel FF del OS.

---

## 1 · Modelo de datos real

**Base Airtable (8 tablas)**: Propiedades `tblw28KVOUcCAKZBU` · Desglose Draws `tblB9Wh3303LTbI5k` · Inversionistas `tblWM1oaWDu0Ukdqf` · **Datos por casa** `tbluy4xlHJav9RtrZ` (préstamo HML: monto, tasa, vencimiento, draws aprobados/cobrados) · **Pagos HML** `tblV4wNA8hNs5Mmk8` (pagos reales) · Contactos del negocio · **Gastos Equipo FF** `tblE9UANWoYdlbEhX` · **Gasto Plataformas FF** `tblvULaFPu8YqDy1l`.

**Espejo Supabase (solo 3 de 8 tablas)**:
| Tabla | Filas | Columnas clave | Soft-delete |
|---|---|---|---|
| `ff_deals` | 28 | airtable_id, address, **address_norm**, stage, strategy, purchase_price, remodel_est, arv, appraisal, hml_payment, ref30_payment, cashout, close_date | ⚠️ `active` sin `archived_at` |
| `ff_draws` | 24 | total_draws, remodel_complete, interest_hml, services_hml, interest_until_rent, furniture, other_costs, net_total, cashout_refi | ídem |
| `ff_investors` | 19 | name, label, ranges, stage, has_partner | ídem |

**Cómo se pobló**: migración **`20260701100000_ff_tables.sql` (seed estático del 1-jul)**. Verificado con grep en todo el repo: **ningún código escribe `ff_*` después** — no hay edge function de sync, no hay pull en la UI, no hay cron. El FF Command Center y el OS solo leen.

## 2 · Paridad e integridad — ❌ ROTA (espejo congelado)

| Check | Espejo | Fuente Airtable | Estado |
|---|---|---|---|
| Propiedades | **28** | **29** (`totalRecordCount`) | ❌ falta **"1003 Arthur Stiles Rd"** (creada en Airtable 2-jul, un día después del seed) |
| Desglose Draws | 24 | 24 | ✅ (por ahora) |
| Última sync | `last_synced_at` = **2026-07-01** en todo | — | ❌ 4 días de staleness y creciendo |
| Assert de paridad | **no existe** para ff_* | — | ❌ (Remodelación sí lo tiene) |
| Soft-delete | `active` sin mantenimiento, sin `archived_at` | — | ⚠️ nominal, nadie lo opera |
| Draws huérfanos | 0 (todos matchean un deal por address_norm) | — | ✅ |

**Nota ecosistema**: "909 Neans Dr" vive legítimamente en FF (comprada 12-may) — el fantasma que archivamos en Remodelación era el residuo correcto de este flujo.

## 3 · Verificación de KPIs (recalculados)

Definiciones de la UI (`ffCompute`, disciplinadas): capital = Σ all-in (compra + remodel real de draws + holding) de activos; equity/déficit/margen **solo sobre "confiables"** (excluye flagged) ✔ buena práctica.

| Métrica | Espejo (lo que muestra la UI hoy) | Fuente Airtable (real, 5-jul) | Drift |
|---|---|---|---|
| # propiedades | 28 | **29** | **-1 deal** |
| Σ Precio de compra | $5,393,000 | **$5,546,100** | **-$153,100** |
| Σ ARV | $10,670,000 | **$11,015,000** | **-$345,000** |
| Σ Draws | $1,863,710 | (24=24, sin drift detectado) | ✅ |
| Σ Intereses HML (draws) | **$156,185** | — | dato real que la UI ignora (usa "$46k" fijo) |

**Conclusión**: la UI calcula bien sobre su espejo, pero **el espejo miente por congelado** → app ≠ fuente hoy. Cualquier decisión sobre capital/ARV está ~$0.3–0.5M desviada y empeora cada día.

**Métricas mal definidas / hardcodeadas:**
- ❌ **$146k "overhead fuera de QB"** — hardcode (`ff-command-center.js:307-310`, `os.js:377-501`) cuando la fuente REAL existe en la misma base (Gastos Equipo FF + Gasto Plataformas FF) y no está espejada. Mismo patrón que ya resolvimos en Remodelación (`remodel_overhead`).
- ❌ **$46k "gap de intereses HML"** — hardcode, cuando `ff_draws.interest_hml` (Σ $156,185) y la tabla **Pagos HML** (pagos reales fechados) existen.
- ⚠️ `remComplete` fallback = `remodel_est × 1.3` — multiplicador inventado; la calibración real existe (`remodel_obra_calibration`: desvío histórico medible).
- ⚠️ Footer del CC dice "Fuente de verdad · Airtable + QuickBooks · sincronizado" — **ninguna de las dos cosas es cierta** (QB no existe, sync no existe).

## 4 · Ecosistema (property_id)

- ❌ `ff_deals` **sin columna `property_id`**. Cruce actual por `address_norm`: **23/30** casas de Remodelación y **17** de Rentas matchean — el flujo FF→Remodel→Rentas es real en la data pero cuelga de strings.
- La casa NO muestra el mismo dato entre empresas: FF tiene `remodel_est` propio vs Remodelación tiene presupuesto/costo real vivos; sin puente fuerte no se reconcilian (ej. Denfield: FF `remodel_est` estático vs obra real $175k ingreso / 96% avance).
- ✅ La Ficha de Casa del OS ya junta FF+Remodel+Rentas por dirección normalizada — funciona, pero heredará el puente fuerte cuando exista.

## 5 · UX / consistencia

- ✅ Kanban por stage (12 rentadas / 5 adquiridas / 4 refi / 4 rehab / 2 venta / 1 vendida = 28), badges de calidad ("confiable/revisar/sin datos"), guards de datos imposibles, tema claro/oscuro, formato $ consistente.
- ⚠️ Sin indicador de staleness: no hay "última sincronización" visible → el usuario no sabe que mira datos del 1-jul.
- ⚠️ Sin badge de paridad (Remodelación lo tiene — replicar patrón).

## 6 · Findings priorizados

### P0
1. **FF no tiene sync — espejo congelado y ya desviado.** Evidencia: seed único 1-jul; falta 1 deal; drift −$153,100 compra / −$345,000 ARV; `last_synced_at` uniforme 1-jul. **Fix:** edge function `sync-ff-airtable` (patrón `sync-remodel-airtable`: upsert por `airtable_id`, archive-unseen soft-delete, fila en `remodel_sync_parity` → renombrar concepto a paridad global, badge en UI) + cron. Esfuerzo ~medio, molde ya existe.
2. **Contable FF inventado con fuente disponible.** $146k/$46k hardcodeados mientras Gastos Equipo FF + Gasto Plataformas FF + Pagos HML existen sin espejar. **Fix:** espejarlas (patrón `remodel_overhead`) → overhead FF real por mes → **EBITDA FF real** (y elimina 2 hardcodes de os.js/ff-cc). Esto además desbloquea la "verdad financiera holding" (Remodelación ya la tiene).

### P1
3. **`property_id` en `ff_deals`** (y `pm_properties`): columna + extensión del RPC `remodel_backfill_property_ids()` → pilar 5 completo FF↔Remodel↔Rentas.
4. **Soft-delete real**: `archived_at` en ff_* + mantenimiento por el sync nuevo (hoy `active` es decorativo).
5. **Tablas HML sin espejar = riesgo financiero ciego**: "Datos por casa" tiene **fecha de vencimiento del HML** por casa — nadie alerta vencimientos hoy. Espejar + alerta "HML vence en X días" (patrón `remodel_alerts`).
6. **Footer/labels honestos**: quitar "QuickBooks · sincronizado" hasta que sea verdad; mostrar "última sync + paridad".

### P2
7. `remodel_est × 1.3` → usar factor de calibración real de Remodelación (puente de aprendizaje entre empresas).
8. Data quality fuente: 2 deals sin compra/ARV (Arthur Stiles, Charles St) — completar en Airtable.
9. Inversionistas: filtro "sin la propia empresa" por regex de nombre (`/flipping rentals/i`) — frágil; mejor un flag en Airtable.

## Oportunidades (pilar 4 — agentes IA)
- **Agente de vencimientos HML**: lee "Datos por casa" (fecha vencimiento, tasa, monto) → alerta N días antes + calcula costo de extensión vs refi. Hoy ese riesgo no lo mira nadie automáticamente.
- **Agente de reconciliación FF↔Remodelación**: compara `remodel_est`/`Costo Remodelacion Real` (FF) vs presupuesto/costo real (base Remodelación) por casa y marca divergencias.
- **Data valiosa no mostrada**: "Renta mensual actual / Gastos mensuales / Flujo mensual / Déficit total" por casa viven en la tabla Propiedades de FF y el CC no los muestra en la card (el modelo déficit/buy-out los usa parcialmente).

---
**Veredicto Fix & Flip: UI disciplinada sobre un espejo MUERTO.** El front está bien construido (guards, confiables, modelos), pero sin sync la paridad está rota hoy (29≠28, drift $0.5M) y el área financiera usa 2 números inventados teniendo la fuente real a un sync de distancia. Los 2 P0 son exactamente el molde que Remodelación ya probó — replicarlo es bajo riesgo y alto impacto.
