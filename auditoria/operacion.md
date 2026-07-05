# Auditoría · OPERACIÓN — 5 Jul 2026

Auditor-arquitecto · Fase 1 (solo lectura). Área derivada: consume Rentas (`pm_tasks`, `pm_properties`) + Remodelación (`remodel_projects`) + tablas propias (`ops_*`, `clean_*`, `wp_*`) + ClickUp espejo. UIs: Cronograma (`pm/cronograma.js`), OPS Planner (`ops-planner.js`), `/operacion` del OS.

## 1 · Modelo de datos real
- `pm_tasks` 251 filas (94 activas) — 100% generadas por la app (auto-turnover/recepción del sync de Rentas; la tabla Airtable de mantenimiento se retiró). ✅ correcta como capa propia.
- `ops_tasks` 41 · `ops_day_tasks` 211 (**con FK real a `properties`** ✓ único área ya en el canónico) · `ops_day_templates` 11 · `ops_property_durations` 13 · `ops_day_routes` 6 · `clean_tasks` 51.
- `clickup_tasks_mirror` 3,638 + snapshots/alerts (sync `sync-clickup`).

## 2 · Paridad e integridad
- N/A vs Airtable (capa propia). ✅ 0 pagos/tareas huérfanas críticas.
- ❌ **ClickUp congelado**: último snapshot **2026-06-12** (23 días). El espejo de 3,638 tareas + leaderboard de performance están stale; `pm-compute-performance` y `pm-weekly-review` consumen datos muertos.

## 3 · Verificación de KPIs
| Métrica | Recalculada | Veredicto |
|---|---|---|
| Tareas activas | 94 | ✅ |
| **Tareas vencidas sin cerrar** | **26 (28%)** con `scheduled_date` pasada y status ≠ done | ⚠️ operación no marca cierres |
| Status distintos en pm_tasks activas | **1** (todo en el mismo estado) | ❌ el ciclo de vida de tareas no se usa → cualquier KPI de cumplimiento da 0/100% falso |
| `ops_day_tasks` sin `property_id` | **69/211 (33%)** | ⚠️ agujero en el puente canónico que ya tienen |
| Cobranza (/operacion) | contrato − plata real (pm_*) | ✅ data-driven (fuente Rentas, paridad hoy 6/6) |

## 4 · Ecosistema
- ✅ `ops_day_tasks`/`clean_*` ya usan `properties.id` (canónico).
- ⚠️ **Dos espacios de ID conviven**: `pm_tasks.property_id` → `pm_properties.id` (espacio Rentas) mientras ops usa `properties.id` (canónico). Un "cronograma unificado" cruza dos llaves distintas por nombre. Unificar cuando se haga el puente pm_properties→properties (P1 ya identificado en Rentas).

## 5 · Findings priorizados
### P0
1. **ClickUp sync muerto (23 días)** — o se revive (cron + verificación token) o se retira de la UI (performance/leaderboard hoy mienten por stale). Decisión CEO: ¿ClickUp sigue siendo parte de la operación?
### P1
2. **Ciclo de vida de tareas sin uso** (1 solo status, 26 vencidas): definir con Carlos el flujo real (pendiente→hecha) o automatizar cierre por evidencia (foto/checkin). Sin esto no hay KPI de cumplimiento verdadero.
3. **69 `ops_day_tasks` sin property_id**: backfill por nombre (funciones `norm_casa` ya existen).
### P2
4. Doble espacio de IDs (pm_properties vs properties) — se resuelve con el puente global.

## 6 · Oportunidades (agentes IA)
- **Agente de cierre de tareas**: lee WhatsApp del grupo (infra existe) y marca done + evidencia.
- **Agente de rutas**: `ops_day_routes`/`ops_property_durations` ya existen con data — el optimizador de ruta diaria es un paso corto.

**Veredicto: funcional pero con higiene operativa débil** (nadie cierra tareas, ClickUp muerto). Los fixes son de proceso + 2 patches chicos.
