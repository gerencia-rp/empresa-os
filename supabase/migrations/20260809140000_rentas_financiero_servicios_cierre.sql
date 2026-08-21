-- ════════════════════════════════════════════════════════════════
-- 💵 rentas-financiero · modos servicios + cierre — grants aditivos.
-- El ejecutor (rol agentes_ia_exec) necesita leer gastos/unidades y escribir
-- el informe interno. Mínimo e impuesto por la DB. NO toca agentes_ia.
-- ════════════════════════════════════════════════════════════════
grant select on public.pm_expenses to agentes_ia_exec;
grant select on public.pm_units    to agentes_ia_exec;
grant select, insert on public.pm_informes to agentes_ia_exec;   -- INSERT = guardar el cierre en la bandeja

drop policy if exists exec_sel on public.pm_expenses; create policy exec_sel on public.pm_expenses for select to agentes_ia_exec using (true);
drop policy if exists exec_sel on public.pm_units;    create policy exec_sel on public.pm_units    for select to agentes_ia_exec using (true);
drop policy if exists exec_sel on public.pm_informes; create policy exec_sel on public.pm_informes for select to agentes_ia_exec using (true);
drop policy if exists exec_ins on public.pm_informes; create policy exec_ins on public.pm_informes for insert to agentes_ia_exec with check (true);

-- ── NOTA operativa ──
-- Reglas de servicios AFINADAS (conservadoras): se excluye el bundle
-- "Servicios públicos" de doble-pago y monto-fuera-de-rango (multi-fila y de alta
-- varianza), y "vencido sin pagar" usa 1 mes de lag (chequea el mes ya asentado,
-- no el recién cerrado que aún se carga). Resultado: de ~51 falsos positivos a ~4
-- descuadres reales. El cron 'rentas-financiero-servicios' quedó ACTIVO.
