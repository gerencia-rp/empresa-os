-- ════════════════════════════════════════════════════════════════
-- B17 · SOFT-DELETE DE GHOSTS (auditoría 2026-07-13) — ADITIVA, jamás hard-delete.
-- Estado verificado al ejecutar:
--   · recp4dED0aFJvDldk (Propiedades F&F vacío): NO existe en el espejo (el sync filtra
--     registros sin dirección) → nada que archivar; queda documentado.
--   · 6 unidades vacías de Rentas: 0 activas en el espejo (sync no las materializa /
--     archivadas en 20260713110000); v_ocupacion además exige unit_type not null.
--   · Estimador: 1 duplicado real por dirección normalizada — 3403 Charles Street ×2
--     (difieren por una coma). Se archiva el MÁS VIEJO (updated_at menor).
-- ════════════════════════════════════════════════════════════════
update public.remodel_projects p
set archived_at = now()
where p.archived_at is null
  and public.pa_norm(p.address) in (
    select public.pa_norm(address) from public.remodel_projects
    where archived_at is null group by 1 having count(*) > 1
  )
  and p.updated_at < (
    select max(p2.updated_at) from public.remodel_projects p2
    where p2.archived_at is null and public.pa_norm(p2.address) = public.pa_norm(p.address)
  );

-- ─── ROLLBACK ───
-- update public.remodel_projects set archived_at = null where archived_at::date = current_date and address like '3403 Charles%';
