# Sprint 6 — Mejoras de Planner Semanal + Cronograma Juan Austin

Sprint focalizado en el sistema de planeación operativa (no solo el Estimador). Cierra los gaps entre los 2 planners y el Estimador Pro.

## S6-U1 · Unificar remodel_crew ↔ resources.crew (✅ Hecho)

### Problema

S4-G6 creó `remodel_crew` (workers para el Estimador). El weekly-planner ya tenía `resources` con type `crew`. Dos listas separadas → tenías que mantener dos veces el mismo equipo.

### Solución (`supabase/s6-u1-unified-crew.sql`)

Trigger SECURITY DEFINER sobre `remodel_crew` que automáticamente:
- Crea / actualiza una fila en `resources` con el mismo `id`
- Mapea `role → emoji` con `crew_role_emoji()` (electrician → ⚡, plumber → 🔧, carpenter → 🪚, painter → 🖌️, hvac → ❄️, etc)
- Calcula `cost_per_day = hourly_rate × capacity_hours_per_day` automáticamente
- Borra el resource cuando borrás el crew

Backfill al final del SQL inserta TODOS los `remodel_crew` actuales en `resources` (idempotente). Los crews seed legacy del weekly-planner ("Crew Roberto", "Crew Eduardo", etc.) reciben tag `[legacy seed]` en `notes` para distinguirlos.

**Resultado**: cada vez que agregás un worker en tab Crew del Estimador Pro, aparece automáticamente en el sidebar del Weekly Planner como recurso crew.

## S6-U2 · Weekly Planner CPM-aware (✅ Hecho)

### Problema

El weekly-planner mostraba actividades pero no respetaba el critical path de S3-G3. Podías arrastrar "drywall" antes que "rough-in" estuviera done.

### Solución

**Schema** (`supabase/s6-u2-weekly-cpm.sql`):
- Columna nueva `weekly_activities.activity_code` (text, indexado)
- Backfill: extrae el code de las notes `[Estimador] X.Y.Z · ...`

**Código** (`remodel-pro.js`):
- `rmSyncToPlanner` ahora popula `activity_code: code` al sincronizar.

**Código** (`weekly-planner.js`):
- `wpLoadAll` ahora también carga `remodel_catalog_items` (catálogo con depends_on).
- Helper `wpGetActivityDeps(act)` devuelve los activity_codes que deben estar done antes.
- Helper `wpCheckDeps(act, allHomeActs)` devuelve `{satisfied, blockers, minDate}`. minDate = día después de la última dep completada.
- En `wpRenderCell`, cada actividad muestra:
  - Badge `🔗 N dep` (ámbar) si tiene deps no satisfechas
  - Fondo ámbar en lugar de blanco
  - Línea "📅 Sugerido: YYYY-MM-DD" con la fecha más temprana posible
- En `wpDropOnCell` (mover actividad entre celdas), si el destino viola las deps → `confirm()` con detalle (no bloquea, pero te avisa).

## S6-U3 · Drag & drop entre celdas (✅ Hecho)

### Problema

Para mover una actividad de lunes a miércoles había que abrir modal → cambiar fecha → guardar.

### Solución

Cada `<div>` de actividad en `wpRenderCell` ahora es `draggable="true"`. Handler `wpActivityDragStart(activityId, ev)` setea `wpState.draggedActivityId`. `wpDropOnCell` ahora detecta si lo que se dropeó es una actividad o un recurso y actúa en consecuencia.

Cuando movés una actividad:
- Mismo día + misma casa → no hace nada
- Día/casa distinta → `UPDATE weekly_activities SET date, project_id, property_name`
- Si viola deps → confirm con detalle (S6-U2)

## S6-U4 · Vista "Crew × Hora" del día (✅ Hecho)

### Problema

Cuando 1 worker está en 2 obras a la misma hora, el grid Casa × Día no lo muestra explícitamente.

### Solución

Nueva función `wpOpenCrewByHour(dateStr)` accessible desde botón "👷 Hoy Crew × Hora" en el header.

Genera un grid 18 columnas × N rows:
- Columnas: horas 5-22
- Rows: cada worker (crew + specialist)
- Cada celda muestra un bloque coloreado según la casa donde está el worker a esa hora
- Si 2+ casas distintas para el mismo worker en la misma hora → ring rojo `ring-2 ring-red-500` + `⚠️N` en el centro
- Columna final: total horas asignadas + flag ⚠️ si hay overbooking
- Footer con explicación
- 3 botones de navegación: día anterior / volver al calendario / día siguiente

Mostrá esto al inicio del día para detectar overbookings antes de que Roberto te llame diciendo "estoy en dos obras a la vez".

## S6-U5 · Search + filtros backlog Ops Planner (✅ Hecho)

### Problema

El backlog solo filtraba por zona/business. Cuando crezca a 50+ tareas iba a ser difícil navegar.

### Solución

Estado nuevo:
- `backlogSearch` (string)
- `backlogCategoryFilter` (template category)
- `backlogPriorityFilter` (low/normal/high/urgent)
- `backlogSort` (oldest/newest/priority/duration)

`opRenderBacklogPanel` aplica filtros + ordenamiento antes de agrupar por casa:
- Input search arriba — busca en title, property name, notes
- 2 selects: categoría (desde templates) + prioridad
- Select ordenamiento
- Cuando hay filtros activos → muestra "X de Y" + botón "✕ limpiar"

## S6-U6 · Auto-agrupar por casa al armar día (✅ Hecho)

### Problema

`opEjecutarArmarDia` agrupaba por casa pero no diferenciaba viaje intra-zona vs inter-zona. Toda casa-a-casa usaba el mismo `OP_TRAVEL_BETWEEN_HOUSES`.

### Solución

UI del modal "Armar día":
- Input "Viaje misma zona" (default 20m)
- Input nuevo "Viaje cruzar zona" (default 40m)

`opEjecutarArmarDia`:
- Orden de casas: primero por zona, después por antigüedad de pendiente
- Cuando idx > 0, detecta si la casa actual está en distinta zona que la anterior → usa `travelCross`. Si misma zona → `travelSame`
- Alert final: "X tareas, Y casas across Z zonas. 🚗 Viajes: A intra-zona, B inter-zona"

Resultado: el día queda mejor optimizado, todas las tareas de zona Norte van juntas antes de cruzar a Sur.

---

## Cómo testear

1. **Aplicar 2 SQL** (`s6-u1-unified-crew.sql`, `s6-u2-weekly-cpm.sql`).
2. **S6-U1**: andá a Estimador Pro → tab Crew → agregá "Mike García" rol carpenter. Cerrá el modal. Andá a Remodelación → Planner Semanal → sidebar "Recursos" → tendría que aparecer "🪚 Mike García" en grupo Crews.
3. **S6-U2**: cargá un proyecto del Estimador → "📅 Enviar al Planner Semanal". Andá al planner. Las actividades con código de catálogo se ven con badge `🔗 N dep` si tienen dependencias y no están done. Probá arrastrar "drywall" antes que "rough-in" → te avisa.
4. **S6-U3**: arrastrá cualquier actividad del lunes al miércoles. Debería moverse sin abrir modal.
5. **S6-U4**: click "👷 Hoy Crew × Hora" en el header → grid timeline horario por worker. Probá asignar el mismo crew a 2 obras a la misma hora → ring rojo + ⚠️.
6. **S6-U5**: andá a Cronograma Juan Austin → backlog → search box arriba. Probá "limpieza" → filtra.
7. **S6-U6**: "🎯 Armar día" → seleccionar "Todas las pendientes" + ingresar viaje intra-zona 15m, inter-zona 35m → Armar. El alert final muestra el split.

---

## Cierre — Estado del sistema completo

Todo el plan original quedó implementado (Sprints 1-5 del Estimador Pro) + Sprint 6 (Planners). Tu Empresa OS ahora tiene:

- **Estimador Pro de Remodelación**: catálogo editable, suppliers, CPM, crew, lista de compra, vista campo móvil, IA agente, PDF cliente, facturas, fotos georef
- **Weekly Planner**: drag entre celdas, vista Crew × Hora, CPM-aware, unificado con Crew del Estimador
- **Cronograma Juan Austin**: search + filtros backlog, optimización por zonas con viaje diferenciado

Total: 16 tabs en la UI, ~5,500 LOC entre remodel-pro.js + weekly-planner.js + ops-planner.js, 14 schemas SQL aplicados, 1 Edge Function (IA agente).
