# Sprint 1 — Tracking granular + Versionado de presupuesto

## S1-G1 · Tracking granular por actividad (✅ Hecho)

### Problema que resuelve

Antes de S1, `rmRenderSeguimiento()` solo permitía editar % avance + gasto real a nivel de las **6 fases** (Demolición, Cimentación, Exterior, Estructura, Interno, Limpieza). La tabla `remodel_actuals` estaba diseñada para nivel actividad, pero la UI no la usaba, así que el modelo de aprendizaje (`remodel_dynamic_benchmarks` view) se quedaba hambriento de datos y la precisión nunca mejoraba con cada proyecto completado.

### Qué cambió

#### Schema (`supabase/s1-g1-actuals.sql`)

- `UNIQUE (project_id, activity_code)` en `remodel_actuals` → permite `upsert()` por par sin duplicados
- `updated_at` column + trigger en `remodel_actuals`
- Cleanup defensivo de duplicados existentes antes de aplicar el constraint

#### Código (`remodel-pro.js`)

- **Estado nuevo en `rmState`:**
  - `seguimientoView`: `'fase'` o `'actividad'` (toggle de sub-tabs)
  - `actualsByCode`: `{ [activity_code]: { real_cost, real_days, real_hours, real_materials_cost, real_labor_cost, notes } }`

- **Constante nueva `RM_CODE_TO_STAGE`** + helper `rmActivityToStageKey(code)`:
  - Mapea cada `activity_code` del catálogo a uno de los 16 `stage_key` del modelo de aprendizaje
  - Fallback por prefijo de fase para códigos custom que aparezcan en el futuro
  - Soft costs (permits, engineering, GC fee) mapean a `null` (excluidos del modelo)

- **Funciones nuevas:**
  - `rmLoadActuals(projectId)` — carga `remodel_actuals` del proyecto en `rmState.actualsByCode`
  - `rmSetActual(code, field, value)` — handler de inputs con re-render debounced
  - `rmSaveActuals()` — upsert con `onConflict: 'project_id,activity_code'`
  - `rmMarkProjectCompleted()` — setea `status='completed'` + `completed_at=now()` para que los actuales empiecen a alimentar `remodel_dynamic_benchmarks`

- **`rmRenderSeguimiento()` refactorizado:**
  - Switch en header: "📊 Por fase" / "🎯 Por actividad"
  - Extrae render anterior en `rmRenderSeguimientoFase(e)` (preservado 1:1)
  - Nueva vista `rmRenderSeguimientoActividad(e)`:
    - 4 KPIs: Cobertura tracking (%), Total estimado, Total real (parcial), Status modelo
    - Tabla scrollable agrupada por fase, una fila por actividad seleccionada
    - Columnas: Actividad (con `code · stage_key` arriba), Est $, Real $, Est d, Real d, Real hrs, Var %, Notas
    - Botones: "💾 Guardar actuales" y "🎯 Marcar como completado"
    - Footer informativo de cómo funciona el modelo

- **`rmLoadProject(p)` ahora es async** y llama `await rmLoadActuals(p.id)` antes del render
- **`rmNewProject()`** resetea `actualsByCode = {}`

### Mapeo `activity_code` → `stage_key`

Las 16 stage_keys del modelo:
`demolicion, estructura, techo, hvac, electricidad, plomeria, aislamiento, drywall, pisos, pintura_int, pintura_ext, cocina, banos, trim, exteriores, limpieza_final`

| Códigos | stage_key |
|---|---|
| `1.x.x` (todo Demolición) | `demolicion` |
| `2.x.x` (Cimentación) | `estructura` |
| `3.1.1`, `3.1.2` (Roof replacement, underlayment) | `techo` |
| `3.1.3` (Gutters) | `exteriores` |
| `3.4.3` (Exterior paint) | `pintura_ext` |
| `3.4.1`, `3.5.x`, `3.6.x`, `3.7.x`, `3.13.x`, `3.14.x`, `3.15.x`, `3.16.x` | `exteriores` |
| `4.1.x` (Framing, beams, sub-floor) | `estructura` |
| `4.2.x` (Permits, engineer, GC) | `null` (excluidos) |
| `5.1.1` (Drywall) | `drywall` |
| `5.1.2` (Interior paint) | `pintura_int` |
| `5.1.3`, `5.2.3` (Insulation) | `aislamiento` |
| `5.1.4-9` (Electrical) | `electricidad` |
| `5.2.xp` (Plumbing) | `plomeria` |
| `5.5.xh` (HVAC) | `hvac` |
| `5.3.x` (Bathroom) | `banos` |
| `5.4.x` (Kitchen) | `cocina` |
| `5.6.1-2` (Flooring, carpet) | `pisos` |
| `5.6.3`, `5.8.x`, `5.2.1` (Baseboards, doors, trim) | `trim` |
| `6.x.x` (Cierre y limpieza) | `limpieza_final` |

### Cómo testear

1. **Aplicar SQL** en Supabase del proyecto **empresa-os** (NO universidad-rentals):

   ```
   Supabase Dashboard → SQL Editor → New query → pegar contenido de:
   /Users/nicolara/Desktop/CLAUDE CODE/empresa-os/supabase/s1-g1-actuals.sql
   → Run
   ```

   Verificar resultado: 0 errores, 1 constraint creado.

2. **Refrescar la app** (`index.html` deploys / local).

3. **Cargar un proyecto existente** (ej. "Virginia") desde tab Proyectos → 📝.

4. **Ir a tab Seguimiento** → click "🎯 Por actividad". Deberías ver:
   - 4 KPI cards arriba con Cobertura 0%, Total estimado, Total real "—", Status "⏳ Pending"
   - Tabla agrupada por fase con todas las actividades seleccionadas, una por fila
   - Cada fila tiene su código + stage_key debajo

5. **Llenar algunas filas:**
   - Real $: poné un número real distinto al estimado
   - Real d: días reales
   - Real hrs: horas reales
   - Notas: cualquier nota (ej. "subió por cambio cliente")

6. **Click "💾 Guardar actuales"**. Debería:
   - Alert "✓ X actuales guardados"
   - Cobertura sube del 0% al % real
   - Recargar la página y los valores siguen ahí

7. **Verificar en Supabase:**

   ```sql
   select project_id, count(*), sum(real_cost), avg(variance_cost_pct)
   from public.remodel_actuals
   where real_cost is not null
   group by 1;
   ```

8. **Click "🎯 Marcar como completado"** → confirmar → el botón cambia a "✅ Ya completado" y status del KPI "Status modelo" pasa a "✅ Alimentando".

9. **Verificar que el modelo dinámico se alimenta:**

   ```sql
   select * from public.remodel_dynamic_benchmarks order by stage_key;
   ```

   Esto debería traer rows para los `stage_key` que tengan actuales registradas.

10. **Crear una nueva Estimación Rápida** → los benchmarks ahora deberían tener `enriched: true` y mezclar la calibración semilla (5 casas) con los actuals del proyecto recién completado.

---

## S1-G2 · Versionado de presupuesto + Change Orders (✅ Hecho)

### Problema que resuelve

Cuando el cliente cambia el scope mid-proyecto, `remodel_projects.activities` se sobrescribe y se pierde el budget aprobado. El lender no puede ver budget vs ejecutado y los change orders no quedan documentados.

### Qué cambió

#### Schema (`supabase/s1-g2-versions.sql`)

- **`remodel_budget_versions`** — snapshot completo del presupuesto: `version`, `label`, `activities jsonb`, totales (`budget_*`), `pricing jsonb` (contingencia/overhead/markup snapshot), `sqft`, `approved_by`, `approved_at`. Único por `(project_id, version)`.
- **`remodel_change_orders`** — delta entre 2 versiones: `from_version → to_version`, `number` (CO #N), `title`, `description`, `reason`, `delta_cost`, `delta_days`, JSON con `activities_added/removed/modified`, `status` (pending/approved/rejected/executed), `client_approved_by`. Único por `(project_id, number)`.
- **View `remodel_latest_approved_version`** — última versión aprobada por proyecto, lista para que el SOW Lender la consuma.
- **Funciones helper RPC:**
  - `next_budget_version(p_project_id)` → siguiente número de versión
  - `next_change_order_number(p_project_id)` → siguiente número de CO
- RLS habilitado en ambas tablas con políticas `authenticated`.

#### Código (`remodel-pro.js`)

- **Estado nuevo en `rmState`:**
  - `versions`: array de `remodel_budget_versions` del proyecto cargado
  - `changeOrders`: array de `remodel_change_orders` del proyecto

- **Funciones nuevas:**
  - `rmLoadVersionsAndCOs(projectId)` — load paralelo
  - `rmApproveBudgetVersion()` — prompts por label y approver, calcula snapshot completo desde `rmCalcProject()`, llama `next_budget_version` RPC
  - `rmDiffAgainstVersion(versionRow)` — calcula `{added, removed, modified, deltaCost, deltaDays}` comparando actividades actuales vs snapshot
  - `rmCreateChangeOrder()` — flujo: prompts → snapshot nueva versión → `next_change_order_number` RPC → insert CO con diff calculado
  - `rmApproveChangeOrder(coId)` / `rmRejectChangeOrder(coId)` — UI de aprobación cliente

- **Tab nuevo "📜 Historial"** con `rmRenderVersions(body)`:
  - Tabla de versiones (v#, etiqueta, budget, $/ft², aprobado por, fecha, # actividades)
  - Lista de Change Orders agrupados por status visual (⏳ pending / ✅ approved / ❌ rejected / ⚙️ executed)
  - Cada CO muestra: título, descripción, razón, delta $$$ y delta días, contador added/removed/modified
  - Botones Aprobar/Rechazar inline para CO pending
  - Footer con flujo recomendado paso a paso

- **`rmLoadProject(p)`** ahora dispara load paralelo de actuals + versions + COs

### Cómo testear

1. **Aplicar SQL** en Supabase:
   ```
   SQL Editor → pegar contenido de:
   /Users/nicolara/Desktop/CLAUDE CODE/empresa-os/supabase/s1-g2-versions.sql → Run
   ```
   Verificar: 2 tablas creadas, 1 view, 2 funciones, 0 errores.

2. **Refrescar app** → entrar al área Remodelación → "Estimador Pro".

3. **Cargar proyecto** existente (ej. "Virginia") → 📝.

4. **Tab "📜 Historial"** → "Sin versiones aún" + botón "📋 Aprobar versión actual".

5. **Click "📋 Aprobar versión actual"** → prompts:
   - Etiqueta: "Inicial cliente"
   - Aprobado por: "John Doe (lender)"
   - Confirmar → alert "✓ Versión 1 creada y aprobada por John Doe (lender)"
   - Refrescá Historial → ahora v1 aparece en la tabla.

6. **Volver al Editor** → modificar alguna actividad (agregar nueva, cambiar qty, etc.).

7. **Volver a Historial** → aparece botón nuevo "🔄 Crear Change Order".

8. **Click "🔄 Crear Change Order"** → prompts:
   - Título: "Agregar quartz en isla"
   - Razón: "cliente_solicitado"
   - Descripción: "Cliente pidió upgrade de countertop"
   - Confirmar → snapshot v2 + CO #1 creado → redirige a Historial

9. **En Historial**: CO #1 visible en status ⏳ pending con delta cost + days y conteos added/removed/modified.

10. **Click "✅ Aprobar"** → prompt cliente → CO pasa a status ✅ approved.

11. **Verificar en Supabase**:
    ```sql
    select * from public.remodel_budget_versions where project_id = '<uuid>';
    select * from public.remodel_change_orders where project_id = '<uuid>';
    select * from public.remodel_latest_approved_version;
    ```

### Próximo: Sprint 2 — Catálogo editable + Suppliers
- G4: mover RM_CATALOG a `remodel_catalog_items` table con CRUD desde UI
- G5: tabla `remodel_suppliers` + `remodel_supplier_prices` con histórico
