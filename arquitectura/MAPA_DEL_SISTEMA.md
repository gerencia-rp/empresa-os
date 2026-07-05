# 🗺 MAPA DEL SISTEMA — Flipping Rentals OS

**Documento vivo** · FASE 0 (auditoría-arquitectura) · 5 Jul 2026
Fuentes de este mapa: inventario real de Supabase (`nezbaljfhhyznhltpjnk`, ~130 tablas con conteos), listado real de bases Airtable (12), barrido de código (30+ módulos JS, 10 APIs Vercel, ~30 edge functions), verificado con grep/SQL. Donde el barrido automático contradijo la DB real, manda la DB.

---

## 1 · Las 6 áreas y sus fuentes de verdad

| Área | Fuente de verdad | Base Airtable | Espejo Supabase (tablas · filas) | Sync |
|---|---|---|---|---|
| **Fix & Flip** | Airtable | `applMXFyPq1hXj7iN` "Flipping Rentals matriz" | `ff_deals` 28 · `ff_draws` 24 · `ff_investors` 19 | mirror, SOLO LECTURA |
| **Rentas (PM)** | Airtable | `apptTKRYbx6gu701i` ⚠️ *nombrada "Empresa Rentas — Modelo Nuevo (sandbox)"* | `pm_properties` 24 · `pm_units` 184 · `pm_tenants` 166 · `pm_bookings` 130 · `pm_payments` 1,206 · `pm_expenses` 675 · `pm_credentials` 210 · `pm_payroll` 59 · `pm_utilities` 72 | `pm-sync-airtable` (v26, linked records) + write-back de pagos |
| **Remodelación** | Airtable | `appwFRqnkyyRljOld` "Empresa de Remodelación" | `remodel_at_properties` 31 (30 activas) · `remodel_overhead` 107 · `remodel_okrs` 8 · `remodel_worker_hours` 3,364 · `remodel_crew_rates` 11 | `sync-remodel-airtable` + `sync-remodel-workers` + paridad + write-back avance (bloqueado 403) |
| **Educación** | Airtable | `appFNKrtV0mMk960t` "Estudiantes" + `appZhUnx6CNJ4hIfd` "Academia_FlipMentoria" + bases dinámicas por mentoría (`edu_mentorships.airtable_base_id`) | `edu_students` 545 · `edu_student_plans` 30 · `edu_student_plan_tasks` 3,170 · `edu_whatsapp_messages` 132 · `edu_okr_targets` 20 · ~25 tablas edu_* más | `sync-education-airtable` + edu-whatsapp-* |
| **Operación** | derivada (PM + Remodel + app) | — | `ops_tasks` 41 · `ops_day_tasks` 211 · `ops_day_templates` 11 · `clean_tasks` 51 · `pm_tasks` 251 (compartida con Rentas) · `clickup_tasks_mirror` 3,638 | consume, no es master |
| **Contable** | ⚠️ **SIN MASTER REAL** | — (QuickBooks = Fase 2, sin conector) | **0 tablas `qb_*`** — no existe espejo de QuickBooks | — |

### Apps propias (Supabase-native, no espejan Airtable)
- **Estimador Pro** (`remodel-pro.js` + `rm/*`): `remodel_projects` 31 · `remodel_actuals` · `remodel_budget_versions` · `remodel_change_orders` · `remodel_milestones/inspections/punch_list/calendar` (Obra Pro) · `remodel_forecast_*` (pronosticador) · `remodel_catalog_items` 74.
- **Planner Semanal** (`weekly-planner.js`): `weekly_activities` 355 · `weekly_activity_moves` 8 · `remodel_project_resources` · `wp_*` templates.
- **Cerebro IA** (Rentas + FF): `pm_brain_memory` 14 · `pm_brain_chat` (RAG pgvector).
- **Viral/Contenido**: `content_generations` 9 · `generation_embeddings` · base Airtable `app0XnxP7XtQJL1sC` "Rental Profitss | Producción".
- **ClickUp**: `clickup_tasks_mirror` 3,638 · snapshots/alerts/insights (sync `sync-clickup`).

## 2 · Registro canónico y columna vertebral

- **`properties` (52 filas)** = registro canónico de casas. FKs reales hacia él: `remodel_projects`, `weekly_activities`, `property_analyses`, `rental_predictions`, `ops_day_tasks`, `clean_*`, `ops_recurring`.
- **Cobertura `property_id` HOY** (verificado por SQL):
  - ✅ Remodelación completa: `remodel_at_properties` 30/30 · `remodel_projects` 30/30 · `weekly_activities` 355/355 (+ RPC self-healing `remodel_backfill_property_ids()` en cada sync + `v_remodel_casas_unmatched` = 0).
  - ❌ `ff_deals`: **sin columna property_id** (cruza por `address_norm`; 23/30 casas de Remodelación matchean).
  - ❌ `pm_properties`: **sin columna property_id** (17/30 matchean por dirección).
  - Funciones de normalización compartibles: `norm_casa()` / `norm_casa_name()` (SQL, inmutables).

### Diagrama del ecosistema (estado real)

```
                       properties (52) ← registro canónico
                            ▲ property_id (FK real)
        ┌───────────────────┼─────────────────────┐
        │                   │                     │
  remodel_projects    weekly_activities    remodel_at_properties
   (Estimador 30)       (Planner 355)        (espejo obra 30)
        └──────── avance_real único (v_remodel_progress + trigger) ────────┘
                            │
   ······ puente DÉBIL (por address_norm, sin property_id) ······
        │                                         │
    ff_deals (28)                          pm_properties (24)
    Fix & Flip                                 Rentas
        │                                         │
   Airtable applMXFyPq1…                   Airtable apptTKRY…

  Contable: ── SIN CONEXIÓN ── (QuickBooks inexistente; $146k/$46k hardcodeados)
  Educación: aislada por diseño (estudiantes, no casas) ✔ correcto
```

**Conectado**: Planner ↔ Estimador ↔ CC Remodelación (avance único, verificado 96/96/96 en 1133 Denfield).
**Débil**: FF ↔ Remodel ↔ Rentas (solo por dirección normalizada).
**Roto**: Contable (sin fuente); write-back Airtable de avance (token 403).

## 3 · Linaje de datos (flujo por casa)

1. **Compra/Underwriting** → Airtable FF (`applMXFyPq1hXj7iN`) → `ff_deals/ff_draws/ff_investors` → FF Command Center (MAO, ROI, cap table).
2. **Obra** → Airtable Remodelación → `remodel_at_properties` (financieras: ingreso=`monto_real`, costo_real=(mat+trab)×1.05, presupuesto) + Estimador (`remodel_projects`) + Planner (`weekly_activities` → `avance_real` por trigger).
3. **Renta/Cobro** → Airtable Rentas → `pm_*` (pagos resueltos por linked record IDs, sin fuzzy) → PM + Command Center Rentas.
4. **Salida (refi/venta)** → hoy vive en `ff_deals.stage` + underwriting; sin módulo dedicado.
5. **Overhead/EBITDA** → solo Remodelación lo tiene real (`remodel_overhead` 107 filas desde 3 tablas Airtable; EBITDA $130,275 verificado). FF/holding: hardcodeado.

## 4 · Integraciones externas

| Servicio | Estado | Dónde |
|---|---|---|
| Airtable (3 bases master + edu) | ✅ activo | syncs + write-back pagos (Rentas) · write-back avance (Remodel, **403 por scope del token**) |
| Claude API (`claude-opus-4-8`) | ✅ activo | brain-chat, edu-whatsapp, deep-analysis, clickup-ai |
| WhatsApp Cloud | ✅ activo | pm-daily-push/close, edu-whatsapp, whatsapp-send |
| ClickUp | ✅ activo | sync-clickup + espejo 3,638 tareas |
| Voyage (embeddings RAG) | ✅ activo | pm_brain_memory |
| Resend (email) | ✅ configurable | reportes PM |
| **QuickBooks** | ❌ **INEXISTENTE** | solo texto UI; ningún conector, ninguna tabla |
| Zillow/market | parcial | market_prices_cache, deep-property-analysis |

## 5 · Hallazgos de FASE 0 (para el diagnóstico de Fase 1)

1. **[P0 · pilar 1] Contable con datos inventados**: `$146k` overhead y `$46k` intereses HML **hardcodeados** en `os/os.js:377-378,436,493-501` y `pm/ff-command-center.js:307-310`. La "verdad financiera a nivel holding" hoy es texto fijo. Ni conector QB ni espejo `qb_*`.
2. **[P1 · riesgo de fuente]** 3 bases Airtable llamadas "Empresa Rentas": la vigente `apptTKRYbx6gu701i` se llama *"— Modelo Nuevo (sandbox)"*, conviven `appzEnsuy4qPT6iHj` (deprecada) y `appHZs8DWIBhwhunZ` (¿?). Renombrar/archivar para eliminar ambigüedad de master.
3. **[P1 · pilar 5]** `property_id` no existe en `ff_deals` ni `pm_properties` → el flujo FF→Remodel→Rentas cruza por dirección (llave débil).
4. **[P1]** Write-back de avance a Airtable bloqueado por scope del PAT (403).
5. **[P2 · higiene]** ~40 tablas con 0 filas (features muertas o aún no usadas: pm_okr_progress, pm_risks, edu_credit_*, clean_day_templates, remodel_vendor_invoices…) — candidatas a documentar o retirar del código que las consulta.
6. **[P2 · consistencia]** Soft-delete desigual: Remodelación/Rentas lo tienen completo (`active`+`archived_at`); muchas tablas edu_/ops_/clickup_ no tienen ninguna de las dos columnas.
7. **[Nota]** `00_CONTEXTO_GENERAL.md` no existe en el repo (referido pero nunca creado); este mapa lo reemplaza como contexto general.

## 6 · Vara de calidad (referencia)

Remodelación es el patrón a replicar: paridad con assert (`remodel_sync_parity`), soft-delete, capa financiera única (`rcFin`), adaptador (`rcObraDataset`), backbone property_id completo, avance de fuente única con recompute-on-write, OKRs desde Airtable, overhead/EBITDA real, reportes exportables. Ver `auditoria/remodelacion.md` (Fase 1 hecha: 0 P0, 4 P1, 4 P2).

---
*Actualizar este documento con cada cambio de arquitectura (nueva tabla, nuevo sync, nuevo puente).*
