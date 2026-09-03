-- El Cerebro Matutino opera con el rol de mínimo privilegio agentes_ia_exec.
-- Le damos solo lectura a la política de destino y a la vista derivada de
-- traspasos; no recibe permisos para aprobar, actualizar ni ejecutar propuestas.
grant select on public.agent_decision_policies to agentes_ia_exec;
grant select on public.v_agent_handoff_queue to agentes_ia_exec;

drop policy if exists agent_decision_policies_read on public.agent_decision_policies;
create policy agent_decision_policies_read on public.agent_decision_policies
  for select to authenticated, agentes_ia_exec using (true);

