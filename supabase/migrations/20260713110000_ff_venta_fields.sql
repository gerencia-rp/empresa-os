-- 📊 Analítica FF · Sección 2 (rentabilidad realizada): espejo de los campos de VENTA
-- de "Datos por casa" (Airtable applMXFyPq1hXj7iN): Precio de Venta fldvBmFii4u9OtKy9,
-- Utilidad Bruta fldFB9AoZ6q3jJNRY, Utilidad Neta fld5t3ETIYxpHD7Z5, ROI fld0V8zYdDJhUX4mL.
-- Aditiva; los mapea sync-ff-airtable (solo lectura de Airtable).

alter table ff_hml_loans
  add column if not exists precio_venta numeric,
  add column if not exists utilidad_bruta_venta numeric,
  add column if not exists utilidad_neta_venta numeric,
  add column if not exists roi_venta numeric;
