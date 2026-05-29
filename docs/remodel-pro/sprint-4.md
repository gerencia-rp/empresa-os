# Sprint 4 — Operación en campo

3 frentes complementarios: gestionar al equipo, ordenar materiales just-in-time, y operar desde el celular.

## S4-G6 · Crew & asignaciones (✅ Hecho)

### Schema (`supabase/s4-g6-crew.sql`)

- **`remodel_crew`** — workers con `name UNIQUE`, `role`, `hourly_rate`, `skills text[]`, `capacity_hours_per_day`, `active`.
- **`remodel_crew_assignments`** — asignación de worker → actividad de un proyecto: `hours_planned`, `hours_actual`, `date_planned`, `date_actual`.
- **View `remodel_crew_workload`** — agregado por proyecto + actividad: num_workers, total_hours, labor_cost_planned vs actual.
- **View `remodel_crew_capacity`** — por worker: active_projects, assigned_activities, total_hours, total_hours_actual.
- RLS habilitado.

### UI

Tab nueva **👷 Crew (N)** entre Historial y Lista compra.

- **Workers**: tabla CRUD con edición inline (hourly_rate, capacity h/d) + columna "Cost MO comprometido" = horas asignadas × tarifa, calculada desde `remodel_crew_capacity`.
- **Asignaciones del proyecto cargado**: cada actividad muestra su MO estimada (de `rmCalcProject`), las horas asignadas total y costo comprometido. Si el comprometido > MO estimado → texto rojo.
- Botón **"+ Asignar"** por actividad → prompts (worker, horas planeadas, fecha)
- Cada asignación editable inline: h planeadas, h reales, fecha
- Función `rmCrewAdd`, `rmCrewUpdate`, `rmCrewToggleActive`, `rmCrewAssign`, `rmCrewAssignSetActual`, `rmCrewAssignDelete`.

## S4-G7 · Lista de compra (purchase order) (✅ Hecho)

Sin cambios de schema — vista derivada de `rmCalcProject()` + `RM_LEAD_TIMES` + `rmState.priceSummary`.

### Lógica

Para cada actividad seleccionada con `material > 0`:
- `date_use` = `phaseSchedule[phase].start`
- `lead_days` = `RM_LEAD_TIMES[code]` (si existe)
- `date_order` = `date_use − lead_days`
- `preferred_supplier` = del view `remodel_price_summary`

Agrupado por supplier. Items con `date_order ≤ hoy` se pintan rojo (ya hay que ordenar). Items dentro de 3 días → ámbar.

### UI

Tab nueva **🛒 Lista compra** entre Crew y Vista campo.

- Header KPIs: total items, total suppliers, total $ materiales
- Una sección por supplier con tabla de items
- Columnas: Code, Item, Cantidad, Material $, Lead, Ordenar antes (rojo/ámbar/normal), Usar el
- Botón **"⬇️ Export CSV"** que descarga el desglose listo para Home Depot Pro o lender.

Función `rmRenderPurchases`, `rmExportPurchasesCSV`.

## S4-G10 · Vista campo (mobile-first) (✅ Hecho)

Tab nueva **📱 Vista campo** después de Lista compra. Diseñada para celular del foreman:

- `max-w-md mx-auto` (ancho máximo 28rem, centrado)
- Header card oscuro con KPIs grandes: Estimado / Real / Cobertura
- **Lista vertical de cards** por actividad (no tabla)
  - Tap para expandir → muestra inputs grandes touch-friendly:
    - Costo real $
    - Días reales
    - Notas
    - Botón **📷 Foto** (usa `capture="environment"` para abrir cámara directa en móvil)
    - Botón **💾 Guardar**
- Cada card colapsada muestra: ícono fase, código, descripción, estimado, real, variación, indicador `+/−`

Función `rmRenderField` + `rmFieldUploadPhoto(code, file)` (sube a storage bucket `remodel-assets`).

### Cómo testear (mobile)

1. Aplicar `supabase/s4-g6-crew.sql` (2 tablas + 2 views + RLS).
2. Refrescar app.
3. **Tab 👷 Crew**: click "+ Worker" → "Mike Rodriguez", role "general", $/h 18 → aparece en lista. Repetir 2-3 más.
4. **Cargar proyecto** → volver a Crew → click "+ Asignar" en una actividad → seleccionar worker, ingresar horas, fecha → asignación creada.
5. **Tab 🛒 Lista compra**: muestra todos los materiales agrupados por supplier preferido. Items con lead time relevante (cabinets, countertops, windows) tienen "Ordenar antes" coloreado por urgencia.
6. **Click "⬇️ Export CSV"** → descarga lista lista para purchase order.
7. **Tab 📱 Vista campo** desde celular (o redimensionar navegador a ~400px): vista vertical apilada con cards grandes. Tap para expandir y registrar avance.
8. **Botón 📷 Foto en móvil** abre la cámara directamente (vía `capture="environment"`).

### Próximo: Sprint 5 — IA agente + propuesta cliente
- G8: Vendor invoices con upload PDF + OCR opcional (Claude vision)
- G9: Claude con function calling para agregar activities, sugerir suppliers, transcribir audio
- G11: Export PDF de propuesta cliente con branding RP
