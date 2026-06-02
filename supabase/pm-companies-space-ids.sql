-- ============================================================
-- Configurar los 3 ClickUp Space IDs en pm_companies
-- Team ID: 9011352877 (Rental Profitss)
-- ============================================================

update public.pm_companies
set clickup_space_id = '90113866434', clickup_team_id = '9011352877', updated_at = now()
where slug = 'remodelacion';

update public.pm_companies
set clickup_space_id = '90113866436', clickup_team_id = '9011352877', updated_at = now()
where slug = 'rentas';

update public.pm_companies
set clickup_space_id = '90113866319', clickup_team_id = '9011352877', updated_at = now()
where slug = 'fix-flip';

-- Verificar
select slug, name, clickup_space_id, clickup_team_id, active
from public.pm_companies
order by position;
