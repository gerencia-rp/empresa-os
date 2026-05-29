# Sprint 3 — Critical Path Method real

## S3-G3 · CPM con dependencias (✅ Hecho)

### Problema que resuelve

El cronograma original concatenaba las 6 fases secuencialmente (Demo → Cimentación → Exterior → Estructura → Interior → Limpieza). Esto:
- Sobrestima la duración real (no considera paralelismo, ej: exterior corre en paralelo con interior una vez el framing está listo)
- No identifica la ruta crítica → no hay claridad de qué actividades atrasan al proyecto
- No permite optimizar (slack disponible, qué se puede mover sin impacto)

### Qué cambió

#### Schema (`supabase/s3-g3-cpm.sql`)

UPDATE de los 70 seed items con `depends_on text[]` siguiendo lógica constructiva estándar de remodelación residencial. La columna `depends_on` ya existía en `remodel_catalog_items` (creada en S2-G4).

Lógica aplicada (resumen):
- **Fase 1 (Demo)**: sin deps, todo arranca acá
- **Fase 4 (Estructura)**: framing depende de cimentación + permits
- **Fase 3 (Exterior)**: la mayoría depende de framing (4.1.2 o 4.1.4); fence sin deps, landscaping al final
- **Fase 5 (Interior)**: secuencia rough-in → insulation → drywall → paint → flooring → trim/cabinets/finishes
- **Fase 6 (Limpieza)**: depende del cierre de finishes phase 5

Total: 73 UPDATEs (uno por item). El SQL solo escribe si `depends_on is null or empty` (no piso customizaciones).

#### Código (`remodel-pro.js`)

**Algoritmo CPM puro — `rmComputeCPM(activities)`:**
1. Construye grafo desde `cat.depends_on` filtrado por actividades seleccionadas del proyecto
2. Topological sort (Kahn's) — detecta ciclos
3. **Forward pass**: ES (earliest start) = max(deps.EF), EF = ES + duration
4. **Backward pass**: LF (latest finish) = min(successors.LS) o totalDays, LS = LF − duration
5. **Slack** = LS − ES; `critical = slack === 0 && duration > 0`
6. Devuelve `{ byCode: {code: {es, ef, ls, lf, slack, critical, deps}}, totalDays, criticalPath: [codes], error? }`

**Integración:**
- `rmCalcProject()` ahora devuelve `cpm` siempre (computa pasivo)
- Toggle `rmState.cpmMode` (default `false` para no romper cronogramas)
- En el Gantt, switch UI: "📊 Lineal por fase" vs "🔀 CPM avanzado"
- Cuando CPM está ON, se llama a `rmRenderGanttCPM(e)` que muestra:
  - 4 KPIs: critical path count, actividades con slack, duración CPM vs lineal, ahorro de días
  - Gantt por actividad individual (no solo fase) con bars posicionadas por ES/EF
  - Rojo = critical path · Azul = con slack · Gris translúcido = slack disponible después de cada bar
  - Lista numerada del critical path en panel rojo abajo

**Edición de dependencias:**
- Nueva columna **"🔗 Depends on"** en la tabla del Catálogo
- Input comma-separated (ej. `5.6.1, 5.2.4p`)
- Validación: codes deben existir, no se permite self-loop
- Función `rmCatalogUpdateDeps(code, value)` valida + actualiza `depends_on text[]` en DB

### Cómo testear

1. Aplicar `supabase/s3-g3-cpm.sql` (instantáneo, solo UPDATEs).
2. Refrescar app → cargar un proyecto existente con varias actividades.
3. Ir al tab **📅 Cronograma** → arriba a la derecha, click **🔀 CPM avanzado**.
4. Banner púrpura aparece + 4 KPIs nuevos. La duración CPM deberá ser ≤ duración lineal (típico 30-50% menor en proyectos con buen paralelismo).
5. Gantt por actividad debajo: identificá las barras rojas (critical path) vs azules (con slack).
6. Hover sobre cualquier barra muestra: ES, EF, duración, slack y deps.
7. Lista numerada del critical path abajo.
8. Volver al **🛠 Catálogo** → columna "🔗 Depends on" muestra los seeds aplicados.
9. Editá la dependencia de cualquier item (ej. `5.4.2` originalmente depende de `5.4.1`; cambiala a `5.4.1, 5.6.1`) → vuelve a Gantt CPM → el path puede cambiar.
10. Si introducís un ciclo (ej. A depende de B, B depende de A), el Gantt muestra "⚠️ Ciclo detectado en dependencias" sin romper la app.

### Limitaciones conocidas (mejorables en sprints futuros)

- El cálculo NO considera capacity humana (crew size). Una actividad de 5 días con 1 persona sigue siendo 5 días aunque haya 3 personas. Eso es Sprint 4 (G6 Crew).
- No considera lead times de materiales como dependencia hard. Por ahora se muestran como warning aparte.
- El slack se muestra después de la barra crítica, no antes. (Visual; matemáticamente correcto.)
- Sin drag-and-drop para reasignar dependencias visualmente. Solo edit por código.

### Próximo: Sprint 4 — Operación campo
- G6: Crew assignments (workers + hourly_rate + skills + capacity → afecta duraciones reales)
- G7: Lista de compra agregada (purchase order) por proveedor, por fecha, con lead times
- G10: Vista mobile dedicada para foreman en sitio (estimación rápida + seguimiento + foto antes/después)
