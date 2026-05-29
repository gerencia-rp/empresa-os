-- ============================================================
-- S6-U1 · Unificar remodel_crew (S4) con resources.crew (weekly-planner)
-- Una sola fuente de verdad para "quién es mi equipo".
-- Trigger sincroniza automáticamente al crear/editar/borrar remodel_crew.
-- ============================================================

-- Función auxiliar: derivar emoji según rol
create or replace function public.crew_role_emoji(p_role text)
returns text language sql immutable as $$
  select case lower(coalesce(p_role, 'general'))
    when 'electrician' then '⚡'
    when 'plumber' then '🔧'
    when 'carpenter' then '🪚'
    when 'painter' then '🖌️'
    when 'hvac' then '❄️'
    when 'tile' then '◼️'
    when 'roofer' then '🏠'
    when 'drywall' then '🪟'
    when 'concrete' then '🧱'
    when 'supervisor' then '👷‍♂️'
    when 'specialist' then '👨‍🔧'
    else '👷'
  end;
$$;

-- Trigger function: SECURITY DEFINER para saltar RLS de resources al sincronizar
create or replace function public.sync_crew_to_resource()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_cost numeric;
  v_emoji text;
  v_category text;
begin
  v_cost := coalesce(new.hourly_rate, 17.50) * coalesce(new.capacity_hours_per_day, 8);
  v_emoji := public.crew_role_emoji(new.role);
  v_category := coalesce(initcap(new.role), 'General');

  if tg_op = 'INSERT' then
    insert into public.resources (id, name, type, category, emoji, cost_per_day, capacity, active, notes)
    values (
      new.id, new.name, 'crew', v_category, v_emoji, v_cost, 1, new.active,
      'Sincronizado desde remodel_crew. Editá horas/tarifa en tab Crew.'
    )
    on conflict (id) do update set
      name = excluded.name,
      category = excluded.category,
      emoji = excluded.emoji,
      cost_per_day = excluded.cost_per_day,
      active = excluded.active;
  elsif tg_op = 'UPDATE' then
    update public.resources set
      name = new.name,
      category = v_category,
      emoji = v_emoji,
      cost_per_day = v_cost,
      active = new.active
    where id = new.id;

    if not found then
      -- Si no existía aún, lo creamos
      insert into public.resources (id, name, type, category, emoji, cost_per_day, capacity, active, notes)
      values (new.id, new.name, 'crew', v_category, v_emoji, v_cost, 1, new.active,
              'Sincronizado desde remodel_crew');
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_sync_crew_to_resource on public.remodel_crew;
create trigger trg_sync_crew_to_resource
  after insert or update on public.remodel_crew
  for each row execute function public.sync_crew_to_resource();

-- Borrar también al borrar el crew
create or replace function public.delete_crew_from_resource()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.resources where id = old.id and type = 'crew';
  return old;
end $$;

drop trigger if exists trg_delete_crew_from_resource on public.remodel_crew;
create trigger trg_delete_crew_from_resource
  after delete on public.remodel_crew
  for each row execute function public.delete_crew_from_resource();

-- Backfill: insertar TODOS los remodel_crew actuales en resources (idempotente)
insert into public.resources (id, name, type, category, emoji, cost_per_day, capacity, active, notes)
select
  c.id, c.name, 'crew',
  coalesce(initcap(c.role), 'General'),
  public.crew_role_emoji(c.role),
  coalesce(c.hourly_rate, 17.50) * coalesce(c.capacity_hours_per_day, 8),
  1, c.active,
  'Sincronizado desde remodel_crew'
from public.remodel_crew c
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  emoji = excluded.emoji,
  cost_per_day = excluded.cost_per_day,
  active = excluded.active;

-- Marker en notes de los crews seed del weekly-planner (Crew Roberto, etc.)
-- así son distinguibles de los unificados desde remodel_crew
update public.resources
set notes = coalesce(notes, '') ||
  case when notes like '%legacy%' or notes like '%Sincronizado%' then '' else ' [legacy seed]' end
where type = 'crew' and name like 'Crew %'
  and id not in (select id from public.remodel_crew);

-- Smoke test
-- select id, name, type, category, cost_per_day, notes from public.resources where type = 'crew' order by name;
-- select c.name as crew_name, r.name as resource_name from public.remodel_crew c left join public.resources r on r.id = c.id;
