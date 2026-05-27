-- ============================================================
-- SEED: 5 casas de prueba con actividades para esta semana
-- Cada casa: 3-4 actividades en días distintos con recursos asignados
-- ============================================================

-- Limpiar actividades previas de prueba (opcional)
delete from public.weekly_activities where property_name in
  ('TEST 1234 Cedar St', 'TEST 5678 Oak Ave', 'TEST 910 Pine Dr', 'TEST 2222 Maple Ln', 'TEST 3333 Birch Way');

-- Obtener IDs de recursos para asignar (con CTE)
with res as (
  select id, name from public.resources where active = true
),
roberto as (select id from res where name = 'Crew Roberto' limit 1),
eduardo as (select id from res where name = 'Crew Eduardo' limit 1),
vato as (select id from res where name = 'Crew Vato' limit 1),
oscar as (select id from res where name = 'Crew Óscar' limit 1),
luis as (select id from res where name = 'Crew Luis' limit 1),
electric as (select id from res where name = 'Electricista certificado' limit 1),
plumber as (select id from res where name = 'Plomero certificado' limit 1),
hvac as (select id from res where name = 'HVAC técnico' limit 1),
tile as (select id from res where name = 'Tile setter' limit 1),
roof as (select id from res where name = 'Roofer' limit 1),
drywall as (select id from res where name = 'Drywall finisher' limit 1),
paint as (select id from res where name = 'Pintor especializado' limit 1),
concrete as (select id from res where name = 'Concreto specialist' limit 1),
mezcla as (select id from res where name = 'Mezcladora concreto' limit 1),
excav as (select id from res where name = 'Mini excavadora (renta)' limit 1),
escalera as (select id from res where name = 'Escalera 24ft + andamios' limit 1),
dumpster as (select id from res where name = 'Dumpster (Bunch trash)' limit 1)

-- Calcular lunes de la semana actual
, week_start as (select (current_date - ((extract(dow from current_date)::int + 6) % 7))::date as monday)

-- Insertar actividades
insert into public.weekly_activities
  (property_name, date, activity_name, stage, resource_ids, start_hour, end_hour, status, priority, notes)
select * from (values

  -- ─── CASA 1: TEST 1234 Cedar St (full reno) ───
  ('TEST 1234 Cedar St', (select monday from week_start),                           'Demolición cocina + baños', 'demolicion',  jsonb_build_array((select id from roberto), (select id from dumpster)), 7, 17, 'planned', 'high', 'Tear-out completo cabinets + tile baños'),
  ('TEST 1234 Cedar St', (select monday + 1 from week_start),                       'Rough plumbing', 'rough',                jsonb_build_array((select id from plumber)),                            8, 16, 'planned', 'high', 'PEX repipe + drenajes'),
  ('TEST 1234 Cedar St', (select monday + 2 from week_start),                       'Rough electrical + panel', 'rough',       jsonb_build_array((select id from electric)),                           8, 16, 'planned', 'normal', 'Upgrade panel 200A'),
  ('TEST 1234 Cedar St', (select monday + 4 from week_start),                       'HVAC install nuevo', 'rough',             jsonb_build_array((select id from hvac)),                               9, 15, 'planned', 'high', 'Sistema completo AC + furnace'),

  -- ─── CASA 2: TEST 5678 Oak Ave (cosmetico) ───
  ('TEST 5678 Oak Ave', (select monday from week_start),                            'Pintura interior toda la casa', 'pintura', jsonb_build_array((select id from eduardo), (select id from paint)),    7, 18, 'in_progress', 'normal', 'Primer + 2 capas blanco'),
  ('TEST 5678 Oak Ave', (select monday + 2 from week_start),                       'Instalación LVP', 'pisos',                 jsonb_build_array((select id from eduardo)),                            8, 17, 'planned', 'normal', '1200 sqft LVP roble'),
  ('TEST 5678 Oak Ave', (select monday + 5 from week_start),                       'Limpieza final', 'limpieza',                jsonb_build_array((select id from luis)),                               9, 14, 'planned', 'normal', 'Deep clean + touch-ups'),

  -- ─── CASA 3: TEST 910 Pine Dr (exterior + roof) ───
  ('TEST 910 Pine Dr', (select monday + 1 from week_start),                         'Roof replacement', 'exterior',             jsonb_build_array((select id from roof), (select id from escalera)),    7, 18, 'planned', 'urgent', 'Architectural shingles, 1800 sqft'),
  ('TEST 910 Pine Dr', (select monday + 3 from week_start),                        'Siding Hardieboard', 'exterior',           jsonb_build_array((select id from vato), (select id from escalera)),    8, 17, 'planned', 'high', 'Fachada completa'),
  ('TEST 910 Pine Dr', (select monday + 5 from week_start),                        'Pintura exterior', 'exterior',              jsonb_build_array((select id from vato), (select id from paint)),       7, 16, 'planned', 'normal', 'Full prep + 2 capas'),

  -- ─── CASA 4: TEST 2222 Maple Ln (concreto + foundation) ───
  ('TEST 2222 Maple Ln', (select monday from week_start),                           'Excavación + grading', 'cimientos',         jsonb_build_array((select id from oscar), (select id from excav)),      7, 16, 'planned', 'high', 'Sitio para patio nuevo'),
  ('TEST 2222 Maple Ln', (select monday + 2 from week_start),                      'Foundation crack repair', 'cimientos',     jsonb_build_array((select id from concrete)),                            8, 15, 'planned', 'urgent', 'Settling crack sala'),
  ('TEST 2222 Maple Ln', (select monday + 3 from week_start),                      'Concrete patio install', 'exterior',        jsonb_build_array((select id from concrete), (select id from mezcla)),  7, 17, 'planned', 'normal', '340 sqft patio'),

  -- ─── CASA 5: TEST 3333 Birch Way (interior finishes) ───
  ('TEST 3333 Birch Way', (select monday + 1 from week_start),                     'Drywall + texture', 'interior',             jsonb_build_array((select id from drywall)),                            8, 17, 'planned', 'normal', '2100 sqft'),
  ('TEST 3333 Birch Way', (select monday + 3 from week_start),                    'Tile baños master', 'interior',             jsonb_build_array((select id from tile)),                                8, 16, 'planned', 'high', 'Floor + walls master bath'),
  ('TEST 3333 Birch Way', (select monday + 4 from week_start),                    'Tile cocina backsplash', 'interior',         jsonb_build_array((select id from tile)),                                9, 15, 'planned', 'normal', 'Subway tile blanco'),
  ('TEST 3333 Birch Way', (select monday + 6 from week_start),                    'Trim + interior doors', 'interior',          jsonb_build_array((select id from roberto)),                            8, 17, 'planned', 'normal', 'Baseboards + 8 puertas')

) as v(property_name, date, activity_name, stage, resource_ids, start_hour, end_hour, status, priority, notes);
