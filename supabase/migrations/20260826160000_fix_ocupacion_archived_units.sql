-- C5 · Ocupación canónica: excluir unidades archivadas/inactivas.
-- El conteo anterior incluía 4 habitaciones archivadas (active=true legacy), por eso
-- unidades_rentables=51 mientras los estados reconciliables sumaban 47.
create or replace view public.v_ocupacion as
with u as (
  select un.*
  from public.pm_units un
  join public.pm_properties pp on pp.id = un.property_id and pp.active
  where un.active
    and un.is_active
    and un.archived_at is null
    and un.external_id like 'unit-rec%'
    and un.unit_type is not null
)
select count(*) as unidades_rentables,
  count(*) filter (where status = 'ocupada')        as ocupadas,
  count(*) filter (where status = 'mantenimiento')  as mantenimiento,
  count(*) filter (where status = 'disponible')     as disponibles,
  count(*) filter (where status = 'reservada')      as reservadas,
  round(100.0 * count(*) filter (where status = 'ocupada') / nullif(count(*),0), 2) as ocupacion_pct
from u;

alter view public.v_ocupacion set (security_invoker = on);

comment on view public.v_ocupacion is
  'Ocupación canónica: solo unidades activas, no archivadas, de propiedades activas; distribución siempre reconcilia con el total.';
