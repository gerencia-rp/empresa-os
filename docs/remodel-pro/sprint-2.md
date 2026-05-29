# Sprint 2 — Catálogo editable + Suppliers

## S2-G4 · Catálogo editable (✅ Hecho)

### Problema que resuelve

Los ~70 items de `RM_CATALOG` estaban hardcodeados en JS. Para agregar uno había que editar código y desplegar. Ningún operador podía customizar su catálogo.

### Qué cambió

#### Schema (`supabase/s2-g4-catalog.sql`)

- Tabla `remodel_catalog_items` con `code` PK, `phase`, `subcat`, `description`, `unit`, `vu_default`, `mat_pct`, `days_per_qty`, `multiplicable`, `depends_on text[]` (placeholder para S3 CPM), `active`, `is_seed`.
- Seed UPSERT de los 70 items originales con `is_seed=true`. Safe re-run.
- Trigger `updated_at`. RLS habilitado.

#### Código (`remodel-pro.js`)

- `let rmActiveCatalog = null` + helper `rmGetCatalog()` que devuelve DB o fallback al `RM_CATALOG` hardcoded.
- `rmLoadCatalog()` normaliza rows DB al shape JS esperado (`description→desc`, `vu_default→vu`).
- Refactor de 6 referencias `RM_CATALOG.find/filter` → `rmGetCatalog().find/filter` en: `rmCalcProject`, `rmRenderProjects`, editor render, `rmToggleActivity`, `rmSyncToPlanner`, `rmComputeSow`.
- `rmLoadCatalog()` se dispara junto con `rmLoadAll()` (paralelo).
- Tab nueva **"🛠 Catálogo"** entre Historial y Precisión, con `rmRenderCatalog(body)`:
  - Banner header indica si está usando DB (editable) o hardcoded (read-only)
  - Botón "+ Agregar actividad" (visible solo si DB activo)
  - Formulario inline para crear: code, fase, subcat, description, unit, vu_default, mat_pct, days_per_qty
  - Tabla por fase, scrollable, con inputs editables in-place (subcat/description/unit/vu/mat_pct/days_per_qty)
  - Badge "SEED" para los 70 originales, "CUSTOM" para nuevos del usuario
  - Botones ✓/○ (toggle activo) y 🗑 (delete, solo para custom)
  - Botón "⬇️ Export JSON" del catálogo completo
- Funciones CRUD: `rmCatalogAddNew`, `rmCatalogUpdateField`, `rmCatalogToggleActive`, `rmCatalogDelete`, `rmCatalogExportJson`.

## S2-G5 · Suppliers + precios reales (✅ Hecho)

### Problema que resuelve

El `vu_default` del catálogo es un promedio. No reflejaba precios reales de Home Depot vs Lowes vs distribuidores mayoristas. Sin tracking de precios históricos, no se podía detectar inflación ni elegir el supplier más barato.

### Qué cambió

#### Schema (`supabase/s2-g5-suppliers.sql`)

- Tabla `remodel_suppliers`: name UNIQUE, type, contact, phone, email, website, city, preferred bool, active.
- Tabla `remodel_supplier_prices`: supplier_id, activity_code (sin FK, soft link), unit_price, quote_date, valid_until, source (cotizacion/factura/estimado/website), notes.
- View `remodel_latest_supplier_prices`: último precio por (supplier, code).
- View `remodel_price_summary`: por activity_code → min, max, avg, num_suppliers, preferred_supplier, preferred_price.
- Seed de 5 suppliers comunes Austin TX: Home Depot Pro, Lowes Pro, Floor & Decor, IKEA, Ferguson.
- RLS habilitado.

#### Código (`remodel-pro.js`)

- Estado: `rmState.suppliers`, `rmState.priceSummary` (indexado por activity_code).
- `rmLoadSuppliers()` carga suppliers + price_summary en paralelo.
- Panel **Suppliers** dentro del tab Catálogo:
  - Tabla con nombre, tipo, ciudad, toggle ⭐ preferido
  - Botón "+ Agregar supplier" (prompts name, type, city)
  - Botón "+ Precio" por supplier → prompts code, price, source
- En la tabla de Catálogo, columna nueva **"Mejor precio"**:
  - Muestra el `min_price` del summary por code
  - Background ámbar si desvía >15% del `vu_default` (señal: revisar pricing)
  - Tooltip muestra # suppliers y supplier preferido
- Funciones: `rmSupplierAdd`, `rmSupplierTogglePreferred`, `rmSupplierAddPrice`.

### Cómo testear

1. Aplicar los 2 SQL en orden: `s2-g4-catalog.sql` (tarda 2s, inserta 70 rows), luego `s2-g5-suppliers.sql` (crea 2 tablas + 5 suppliers seed).
2. Refrescar app → entrar al Estimador → tab **"🛠 Catálogo"**.
3. Verás 70 items con badge SEED, agrupados por fase. Botón "+ Agregar actividad" arriba.
4. Click "+ Agregar actividad" → llenar code (ej. `5.4.7`), fase 5, descripción "Range hood install", unit `unit`, vu 350 → "💾 Crear".
5. Aparece en la fase 5 con badge CUSTOM. Editá in-place cualquier campo (subcat, vu, etc).
6. Panel **Suppliers** abajo: ya hay 5 seeds. Click "+ Precio" en Home Depot Pro → ingresar code `5.4.2`, precio 65 (vs 75 default). En la tabla del catálogo el `5.4.2` ahora muestra Mejor precio $65 con fondo ámbar (desvió >15%).
7. Probar "⬇️ Export JSON" → descarga el catálogo completo.

### Próximo: Sprint 3 — CPM real
- G3: dependencias entre actividades (`depends_on` ya está en schema)
- Topological sort + earliest start/latest finish
- Marcar critical path visualmente en el Gantt
