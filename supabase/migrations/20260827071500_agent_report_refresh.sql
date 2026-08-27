-- Los ejecutores pueden refrescar únicamente el contenido/fecha de informes que
-- ellos mismos generan. No pueden editar autor, tipo, corte, estado ni archivo.
grant update(payload,updated_at) on public.pm_informes to agentes_ia_exec;
drop policy if exists exec_upd_own_reports on public.pm_informes;
create policy exec_upd_own_reports on public.pm_informes for update to agentes_ia_exec
using (origen='ejecutor') with check (origen='ejecutor');
