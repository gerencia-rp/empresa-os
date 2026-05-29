# Remodel Pro — Changelog

Cronología de cambios al módulo `remodel-pro.js` y schemas `supabase/remodel-*.sql`. Más reciente arriba.

Formato: `YYYY-MM-DD · TIPO · alcance` (TIPO = Feature | Fix | Schema | UX | Doc | Refactor)

---

## 2026-05-28 — Sprint 5 · IA agente + PDF cliente + facturas + fotos (✅ Hecho)

- **S5-G11 · UI** — `rmGenerateProposalPDF()` abre HTML branded en ventana nueva con watermark DRAFT/FINAL + auto window.print(). Botón "📄 Generar propuesta cliente PDF" en sidebar Editor.
- **S5-G12 · UI** — Upload de foto en Vista campo ahora prompts ANTES/DESPUÉS/PROCESO + nota, persiste metadata enriquecida en `remodel_projects.photos`. Galería overlay full-screen por activity con `rmShowPhotoGallery(code)`.
- **S5-G8 · Schema** — `remodel_vendor_invoices` con subtotal generated column + view `remodel_invoices_summary`. RLS. Archivo: `supabase/s5-g8-invoices.sql`.
- **S5-G8 · UI** — Sección "🧾 Facturas" dentro de Lista compra. Upload PDF, prompts metadata, botón Reconciliar que suma `total_amount` al `real_cost` del activity asociado (alimenta `remodel_actuals`).
- **S5-G9 · Edge Function** — `supabase/functions/remodel-ai/index.ts` (Deno) con 5 tools declaradas + system prompt rioplatense + inyección de project_context.
- **S5-G9 · UI** — Tab "🤖 IA Agente" con chat panel + tool execution loop. `rmAgentSend`, `rmAgentExecuteTool` (5 handlers en JS), `rmBuildAgentContext`, `rmAgentClear`. Multi-round con safety counter de 6 iteraciones.
- Doc completo: `docs/remodel-pro/sprint-5.md`. **El plan original de 5 sprints quedó 100% completado.**

## 2026-05-28 — Sprint 4 · Operación en campo (✅ Hecho)

- **S4-G6 · Schema** — Tablas `remodel_crew` + `remodel_crew_assignments` + views `remodel_crew_workload` y `remodel_crew_capacity`. Archivo: `supabase/s4-g6-crew.sql`.
- **S4-G6 · UI** — Tab "👷 Crew (N)" con CRUD de workers y panel de asignaciones por actividad del proyecto cargado. Edición inline de h planeadas / h reales / fecha por asignación.
- **S4-G7 · UI** — Tab "🛒 Lista compra" (derivada, sin schema): agrupa materiales por supplier preferido, calcula `date_order = date_use − lead_time`, colorea por urgencia (rojo overdue / ámbar 3d). Export CSV.
- **S4-G10 · UI** — Tab "📱 Vista campo" mobile-first: max-w-md, cards verticales colapsables por actividad con inputs grandes touch-friendly. Botón cámara con `capture="environment"` para fotos directas.
- Doc completo: `docs/remodel-pro/sprint-4.md`

## 2026-05-28 — Sprint 3 · CPM real con dependencias (✅ Hecho)

- **S3-G3 · Schema** — UPDATE de los 70 seed items con `depends_on text[]` siguiendo lógica constructiva (rough-in → insulation → drywall → paint → finishes). Archivo: `supabase/s3-g3-cpm.sql`. Solo escribe si vacío (no piso customs).
- **S3-G3 · Algoritmo** — `rmComputeCPM(activities)`: topological sort Kahn + forward pass (ES/EF) + backward pass (LS/LF) + slack + critical path. Detecta ciclos. Pure function.
- **S3-G3 · Integración** — `rmCalcProject()` ahora devuelve `cpm` siempre. Toggle `rmState.cpmMode` (default off). Switch UI en tab Cronograma: "📊 Lineal" vs "🔀 CPM".
- **S3-G3 · Gantt CPM** — Nueva render con 4 KPIs (critical count, con slack, duración CPM, ahorro vs lineal), Gantt por actividad individual (no por fase), critical path en rojo, slack visualizado en gris, hover tooltip con ES/EF/slack/deps, lista numerada del path crítico.
- **S3-G3 · Catálogo UI** — Columna nueva "🔗 Depends on" en tabla de Catálogo. Input comma-separated. Función `rmCatalogUpdateDeps()` valida codes existen + previene self-loop.
- Doc completo: `docs/remodel-pro/sprint-3.md`

## 2026-05-28 — Sprint 2 · Catálogo editable + Suppliers (✅ Hecho)

- **S2-G4 · Schema** — `remodel_catalog_items` + seed UPSERT de 70 items con `is_seed=true`. Trigger updated_at + RLS. Archivo: `supabase/s2-g4-catalog.sql`.
- **S2-G4 · Código** — `rmActiveCatalog` + helper `rmGetCatalog()` con fallback al hardcoded. Refactor de 6 referencias `RM_CATALOG.find/filter` → `rmGetCatalog()`. Loader paralelo en `rmLoadAll`.
- **S2-G4 · UI** — Tab nueva "🛠 Catálogo" con tabla scrollable por fase, edición in-place de todos los campos, badges SEED/CUSTOM, toggle activo, delete (solo custom), export JSON, formulario inline para crear nuevas actividades.
- **S2-G5 · Schema** — `remodel_suppliers` + `remodel_supplier_prices` con histórico. Views `remodel_latest_supplier_prices` y `remodel_price_summary`. Seed de 5 suppliers Austin TX (Home Depot Pro, Lowes Pro, Floor & Decor, IKEA, Ferguson). Archivo: `supabase/s2-g5-suppliers.sql`.
- **S2-G5 · UI** — Panel Suppliers dentro del tab Catálogo. Toggle ⭐ preferido, botón "+ Precio" inline. Columna "Mejor precio" en tabla del catálogo con alerta ámbar si desvía >15% del default.
- Doc completo: `docs/remodel-pro/sprint-2.md`

## 2026-05-28 — Sprint 1 · G2 Versionado + Change Orders (✅ Hecho)

- **S1-G2 · Schema** — Nuevas tablas `remodel_budget_versions` (snapshot completo) y `remodel_change_orders` (delta entre versiones + aprobación cliente). View `remodel_latest_approved_version` para SOW. Funciones RPC `next_budget_version` y `next_change_order_number`. RLS activado. Archivo: `supabase/s1-g2-versions.sql`.
- **S1-G2 · Persistencia** — `rmLoadVersionsAndCOs(projectId)`, `rmApproveBudgetVersion()`, `rmCreateChangeOrder()`, `rmApproveChangeOrder(coId)`, `rmRejectChangeOrder(coId)`. Helper puro `rmDiffAgainstVersion(versionRow)`.
- **S1-G2 · UI** — Tab nuevo "📜 Historial" entre SOW y Precisión. Tabla de versiones + lista de COs con badges de status y botones aprobar/rechazar inline.
- Doc en `docs/remodel-pro/sprint-1.md` actualizado.

## 2026-05-28 — Sprint 1 · G1 Tracking granular (✅ Hecho)

- **S1-G1 · Schema** — `UNIQUE (project_id, activity_code)` + `updated_at` trigger en `remodel_actuals`. Schema delta en `supabase/s1-g1-actuals.sql`.
- **S1-G1 · Catálogo** — Constante `RM_CODE_TO_STAGE` + helper `rmActivityToStageKey(code)` que mapea cada uno de los ~70 codes a los 16 `stage_key` del modelo dinámico.
- **S1-G1 · Persistencia** — Funciones `rmLoadActuals(projectId)`, `rmSetActual()`, `rmSaveActuals()` con upsert por `(project_id, activity_code)`. `rmLoadProject` ahora es async.
- **S1-G1 · UI** — Tab Seguimiento refactorizado con switch "📊 Por fase / 🎯 Por actividad". Vista granular nueva con 4 KPIs (Cobertura, Est, Real parcial, Status modelo), tabla scrollable con columnas Est$/Real$/Est d/Real d/Real hrs/Var %/Notas, botón "Marcar completado" que dispara `completed_at` para alimentar `remodel_dynamic_benchmarks`.
- Doc completo: `docs/remodel-pro/sprint-1.md`

## 2026-05-28 — Quick Wins (S0)

Mejoras sin cambios mayores de arquitectura. Bloque ejecutado como warm-up antes del Sprint 1.

- **QW1 — Feature · UX** — Alerta visual en sidebar del Editor cuando `profitMarginPct < 18%` (industria estándar). Banner rojo con sugerencia: "subí markup_pct a ≥25% para estar en rango sano".
- **QW2 — Feature · Pricing** — Botón "📐 Auto Austin" en ajustes de pricing que calcula `permitsCost` según `sqft`: $1,500 base + $0.50/ft² sobre 1,500 (ej. 2,000 ft² → $1,750).
- **QW3 — Feature · UX** — Buscador en vivo del catálogo de actividades en el Editor (input arriba del primer `<details>` de fase). Filtra por `code`, `desc`, `subcat`. Mantiene fase abierta si tiene match.
- **QW4 — Feature + Schema · Tags** — Columna `tags text[]` agregada a `remodel_projects`. UI: chips editables en el header del Editor + filtro por tag en tab Proyectos. Schema delta en `supabase/qw4-tags.sql`.
- **QW5 — Feature · UX** — Mini-dashboard en header del tab Proyectos: KPI cards (Total budget, Total real, Weighted variance %, Top 3 desviaciones). Se calcula on-the-fly desde `rmState.projects`.
- **QW6 — Feature · UX** — Validación regex de URL Matterport al guardar (no bloqueante). Banner amarillo si no matchea `(my\.matterport\.com\/show\/\?m=|matterport\.com\/discover\/space\/)`.

---

## Estado base (pre-changelog · 2026-05-28)

Auditoría completa documentada en `~/Desktop/CLAUDE CODE/PLAN_FORTALECIMIENTO_REMODEL_PRO.md`. El módulo cubre 100% de la funcionalidad de la app Taskade "Presupuesto y cronograma" + diferenciadores propios (3 estimaciones, SOW lender, Critical Path, AI Claude, sync Weekly Planner).

- `remodel-pro.js`: 2,192 LOC
- Schemas: `remodel-pro-schema.sql`, `remodel-learning-schema.sql`, `remodel-assets-schema.sql`, `remodel-dashboard-schema.sql`
- 10 tabs UI: Proyectos, Estimación Rápida, 3 Estimaciones, Tasas, Editor, Seguimiento, Cronograma, SOW, Precisión, Calibración
- 5 casas calibradoras seed (Virginia, Picnic, Idlewood, Arcadia, Ramble)
- 16 stages con benchmarks $/ft²
