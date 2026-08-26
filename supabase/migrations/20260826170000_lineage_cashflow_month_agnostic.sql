-- C5 · El KPI cambia de mes en pantalla; el linaje debe representar la métrica,
-- no una etiqueta congelada en junio.
update public.data_lineage_map
set dato = 'Cashflow',
    columna = 'ingresos − gastos − nómina (billing_ym del mes visible)',
    nota = 'KPI mensual dinámico; la etiqueta visible agrega mes y año.',
    origen = 'curado',
    estado = 'ok'
where metric_key = 'rentas|property_manager_resumen|cashflow_jun'
  and empresa = 'Rentas'
  and sistema = 'Property Manager · Resumen';
