-- El rol de ejecución (agentes_ia_exec) necesita policies RLS explícitas en
-- pm_brain_memory para dejar el ACTA de la reunión + compactar (el grant solo
-- no alcanza con RLS habilitado). Espeja el patrón de pm_informes (exec_ins/exec_sel).
drop policy if exists exec_ins_pm_brain_memory on public.pm_brain_memory;
drop policy if exists exec_sel_pm_brain_memory on public.pm_brain_memory;
drop policy if exists exec_upd_pm_brain_memory on public.pm_brain_memory;
create policy exec_sel_pm_brain_memory on public.pm_brain_memory for select to agentes_ia_exec using (true);
create policy exec_ins_pm_brain_memory on public.pm_brain_memory for insert to agentes_ia_exec with check (true);
create policy exec_upd_pm_brain_memory on public.pm_brain_memory for update to agentes_ia_exec using (true) with check (true);
