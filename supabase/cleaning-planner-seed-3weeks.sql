-- ============================================================
-- SEED: 3 semanas de Cronograma Limpieza con datos realistas
-- Caso de uso real:
--   - 2 Airbnbs activos (turnover semanal entre huéspedes)
--   - 1 coliving con 4 habitaciones (turnovers escalonados)
--   - 1 long-term (mensual de mantenimiento)
--   - 1 remodelación que termina semana 2 (post-obra al final)
-- Distribución por zona Norte/Sur, agrupada por casa.
--
-- Para correr: SQL Editor de Supabase, pegar y Run.
-- ============================================================

-- Limpiar seed previo (idempotente)
delete from public.clean_recurring where custom_title like 'SEED:%';
delete from public.clean_day_tasks where title like 'SEED:%';
delete from public.remodel_projects where name like 'SEED:%';
delete from public.properties where nickname like 'SEED:%';

-- ────────────────────────────────────────────────────────────
-- 1) PROPIEDADES de prueba (6 casas)
-- ────────────────────────────────────────────────────────────
-- NOTA: properties.status check constraint solo acepta:
--   'evaluating' | 'purchased' | 'remodeling' | 'renting' | 'sold' | 'declined'
-- Por eso Airbnbs/long-term usan 'renting' y el flip en obra usa 'remodeling'.
insert into public.properties (id, nickname, address, city, state, zip, property_type, status, user_id) values
  ('00000000-0000-0000-0000-c1ea0a000001', 'SEED: Casa Airbnb Norte 1', '1245 N Maple St', 'Austin', 'TX', '78701', 'single_family', 'renting', auth.uid()),
  ('00000000-0000-0000-0000-c1ea0a000002', 'SEED: Casa Airbnb Sur 1',   '8901 S Lakeview Dr', 'Austin', 'TX', '78745', 'single_family', 'renting', auth.uid()),
  ('00000000-0000-0000-0000-c1ea0a000003', 'SEED: Coliving Norte (4 rooms)', '3402 N Lamar Blvd', 'Austin', 'TX', '78705', 'townhouse', 'renting', auth.uid()),
  ('00000000-0000-0000-0000-c1ea0a000004', 'SEED: Renta LT Sur',        '5511 S Pleasant Valley Rd', 'Austin', 'TX', '78741', 'single_family', 'renting', auth.uid()),
  ('00000000-0000-0000-0000-c1ea0a000005', 'SEED: Flip Norte (en obra)', '2710 N Burnet Rd', 'Austin', 'TX', '78757', 'single_family', 'remodeling', auth.uid()),
  ('00000000-0000-0000-0000-c1ea0a000006', 'SEED: Casa Airbnb Norte 2', '4818 N Mopac Expy', 'Austin', 'TX', '78731', 'single_family', 'renting', auth.uid())
on conflict (id) do nothing;

-- ────────────────────────────────────────────────────────────
-- 2) Un proyecto de remodelación que termina semana 2
-- ────────────────────────────────────────────────────────────
insert into public.remodel_projects (id, name, address, status, user_id) values
  ('00000000-0000-0000-0000-7e60de100001', 'SEED: Flip Burnet Rd · entrega semana 2', '2710 N Burnet Rd, Austin TX', 'active', auth.uid())
on conflict (id) do nothing;

-- ────────────────────────────────────────────────────────────
-- 3) RECURRENTES (mensual long-term + turnovers Airbnb cada 7 días)
-- ────────────────────────────────────────────────────────────
insert into public.clean_recurring (
  property_id, custom_title, custom_duration_min, custom_materials, zona, business,
  interval_days, next_due, priority, active
) values
  ( '00000000-0000-0000-0000-c1ea0a000004', 'SEED: Mensual Long-Term Pleasant Valley',
    180, '["aspiradora","mopa","limpiavidrios","desinfectante","trapos"]'::jsonb,
    'Sur', 'rentas', 30, (current_date + 2)::date, 'normal', true ),

  ( '00000000-0000-0000-0000-c1ea0a000001', 'SEED: Turnover Airbnb Maple St',
    210, '["sábanas","toallas","amenities","productos limpieza","aspiradora","mopa"]'::jsonb,
    'Norte', 'rentas', 7, (current_date + 3)::date, 'high', true ),

  ( '00000000-0000-0000-0000-c1ea0a000002', 'SEED: Turnover Airbnb Lakeview Dr',
    210, '["sábanas","toallas","amenities","productos limpieza","aspiradora","mopa"]'::jsonb,
    'Sur', 'rentas', 7, (current_date + 5)::date, 'high', true ),

  ( '00000000-0000-0000-0000-c1ea0a000006', 'SEED: Turnover Airbnb Mopac',
    210, '["sábanas","toallas","amenities","productos limpieza","aspiradora","mopa"]'::jsonb,
    'Norte', 'rentas', 7, (current_date + 4)::date, 'high', true );

-- ────────────────────────────────────────────────────────────
-- 4) BACKLOG (tareas sin fecha — pendientes)
-- ────────────────────────────────────────────────────────────
insert into public.clean_day_tasks (
  title, duration_min, property_id, zona, business, materials, priority, status, assignee
) values
  ('SEED: Limpieza profunda baño habitación 3 (coliving)', 30, '00000000-0000-0000-0000-c1ea0a000003', 'Norte', 'rentas',
   '["limpiador baño","desinfectante"]'::jsonb, 'normal', 'planned', 'Equipo Limpieza'),
  ('SEED: Reposición amenities ALL Airbnbs', 60, null, 'Norte', 'rentas',
   '["shampoo","jabón","papel higiénico","café"]'::jsonb, 'low', 'planned', 'Equipo Limpieza'),
  ('SEED: Limpiar refri profundo · Casa Pleasant Valley', 45, '00000000-0000-0000-0000-c1ea0a000004', 'Sur', 'rentas',
   '["bicarbonato","trapos","desinfectante"]'::jsonb, 'normal', 'planned', 'Equipo Limpieza'),
  ('SEED: Lavandería ropa de cama acumulada', 90, null, 'Norte', 'rentas',
   '["detergente","suavizante"]'::jsonb, 'normal', 'planned', 'Equipo Limpieza');

-- ────────────────────────────────────────────────────────────
-- 5) TAREAS AGENDADAS · SEMANA 1 (Lun-Sáb)
--    Estrategia: Lunes y Jueves Norte, Martes y Viernes Sur
-- ────────────────────────────────────────────────────────────

-- LUNES (NORTE)
insert into public.clean_day_tasks (
  date, start_time, duration_min, title, property_id, zona, business, materials, priority, status, assignee, travel_min
) values
  ( current_date + ((1 - extract(dow from current_date)::int + 7) % 7)::int,
    '08:00', 210, 'SEED: 🏘️ Turnover Airbnb · Casa Maple',
    '00000000-0000-0000-0000-c1ea0a000001', 'Norte', 'rentas',
    '["sábanas","toallas","amenities"]'::jsonb, 'high', 'planned', 'Equipo Limpieza', 0 ),
  ( current_date + ((1 - extract(dow from current_date)::int + 7) % 7)::int,
    '11:30', 20, 'SEED: 🚗 Desplazamiento → Mopac', null, 'Norte', 'both', '[]'::jsonb, 'normal', 'planned', 'Equipo Limpieza', 20 ),
  ( current_date + ((1 - extract(dow from current_date)::int + 7) % 7)::int,
    '11:50', 210, 'SEED: 🏘️ Turnover Airbnb · Casa Mopac',
    '00000000-0000-0000-0000-c1ea0a000006', 'Norte', 'rentas',
    '["sábanas","toallas","amenities"]'::jsonb, 'high', 'planned', 'Equipo Limpieza', 0 ),
  ( current_date + ((1 - extract(dow from current_date)::int + 7) % 7)::int,
    '15:20', 60, 'SEED: 🍽️ Almuerzo', null, 'Norte', 'both', '[]'::jsonb, 'normal', 'planned', 'Equipo Limpieza', 0 );

-- MARTES (SUR)
insert into public.clean_day_tasks (
  date, start_time, duration_min, title, property_id, zona, business, materials, priority, status, assignee, travel_min
) values
  ( current_date + ((2 - extract(dow from current_date)::int + 7) % 7)::int,
    '08:00', 210, 'SEED: 🏘️ Turnover Airbnb · Casa Lakeview',
    '00000000-0000-0000-0000-c1ea0a000002', 'Sur', 'rentas',
    '["sábanas","toallas","amenities"]'::jsonb, 'high', 'planned', 'Equipo Limpieza', 0 ),
  ( current_date + ((2 - extract(dow from current_date)::int + 7) % 7)::int,
    '11:30', 30, 'SEED: 🚗 Desplazamiento → Pleasant Valley',
    null, 'Sur', 'both', '[]'::jsonb, 'normal', 'planned', 'Equipo Limpieza', 30 ),
  ( current_date + ((2 - extract(dow from current_date)::int + 7) % 7)::int,
    '12:00', 180, 'SEED: 📅 Mensual Long-Term · Pleasant Valley',
    '00000000-0000-0000-0000-c1ea0a000004', 'Sur', 'rentas',
    '["aspiradora","mopa","desinfectante"]'::jsonb, 'normal', 'planned', 'Equipo Limpieza', 0 ),
  ( current_date + ((2 - extract(dow from current_date)::int + 7) % 7)::int,
    '15:00', 60, 'SEED: 🍽️ Almuerzo', null, 'Sur', 'both', '[]'::jsonb, 'normal', 'planned', 'Equipo Limpieza', 0 );

-- MIÉRCOLES (Coliving Norte — turnovers habitación)
insert into public.clean_day_tasks (
  date, start_time, duration_min, title, property_id, zona, business, materials, priority, status, assignee, travel_min
) values
  ( current_date + ((3 - extract(dow from current_date)::int + 7) % 7)::int,
    '09:00', 75, 'SEED: 🛌 Turnover habitación 1 · Coliving',
    '00000000-0000-0000-0000-c1ea0a000003', 'Norte', 'rentas',
    '["sábanas","toallas","desinfectante"]'::jsonb, 'normal', 'planned', 'Equipo Limpieza', 0 ),
  ( current_date + ((3 - extract(dow from current_date)::int + 7) % 7)::int,
    '10:15', 75, 'SEED: 🛌 Turnover habitación 2 · Coliving',
    '00000000-0000-0000-0000-c1ea0a000003', 'Norte', 'rentas',
    '["sábanas","toallas","desinfectante"]'::jsonb, 'normal', 'planned', 'Equipo Limpieza', 0 ),
  ( current_date + ((3 - extract(dow from current_date)::int + 7) % 7)::int,
    '11:30', 90, 'SEED: Limpieza áreas comunes Coliving',
    '00000000-0000-0000-0000-c1ea0a000003', 'Norte', 'rentas',
    '["aspiradora","mopa","desinfectante"]'::jsonb, 'normal', 'planned', 'Equipo Limpieza', 0 );

-- JUEVES (NORTE — segundo round Airbnbs)
insert into public.clean_day_tasks (
  date, start_time, duration_min, title, property_id, zona, business, materials, priority, status, assignee, travel_min
) values
  ( current_date + ((4 - extract(dow from current_date)::int + 7) % 7)::int,
    '08:00', 210, 'SEED: 🏘️ Turnover Airbnb · Casa Maple (round 2)',
    '00000000-0000-0000-0000-c1ea0a000001', 'Norte', 'rentas',
    '["sábanas","toallas","amenities"]'::jsonb, 'high', 'planned', 'Equipo Limpieza', 0 ),
  ( current_date + ((4 - extract(dow from current_date)::int + 7) % 7)::int,
    '11:30', 20, 'SEED: 🚗 Desplazamiento → Coliving',
    null, 'Norte', 'both', '[]'::jsonb, 'normal', 'planned', 'Equipo Limpieza', 20 ),
  ( current_date + ((4 - extract(dow from current_date)::int + 7) % 7)::int,
    '11:50', 75, 'SEED: 🛌 Turnover habitación 3 · Coliving',
    '00000000-0000-0000-0000-c1ea0a000003', 'Norte', 'rentas',
    '["sábanas","toallas","desinfectante"]'::jsonb, 'normal', 'planned', 'Equipo Limpieza', 0 );

-- VIERNES (SUR — Lakeview round 2)
insert into public.clean_day_tasks (
  date, start_time, duration_min, title, property_id, zona, business, materials, priority, status, assignee, travel_min
) values
  ( current_date + ((5 - extract(dow from current_date)::int + 7) % 7)::int,
    '08:00', 210, 'SEED: 🏘️ Turnover Airbnb · Lakeview (round 2)',
    '00000000-0000-0000-0000-c1ea0a000002', 'Sur', 'rentas',
    '["sábanas","toallas","amenities"]'::jsonb, 'high', 'planned', 'Equipo Limpieza', 0 ),
  ( current_date + ((5 - extract(dow from current_date)::int + 7) % 7)::int,
    '11:30', 90, 'SEED: Lavandería + reposición amenities',
    null, 'Sur', 'rentas',
    '["detergente","amenities"]'::jsonb, 'low', 'planned', 'Equipo Limpieza', 0 );

-- ────────────────────────────────────────────────────────────
-- 6) SEMANA 2 (Lun-Vie) — mismo patrón + POST-OBRA al final
-- ────────────────────────────────────────────────────────────

-- Turnovers de la semana 2 (Lun Norte, Mar Sur, Jue Norte, Vie Sur)
insert into public.clean_day_tasks (
  date, start_time, duration_min, title, property_id, zona, business, materials, priority, status, assignee
) values
  ( current_date + 7 + ((1 - extract(dow from current_date)::int + 7) % 7)::int,
    '08:00', 210, 'SEED: 🏘️ Turnover Maple (s2)',
    '00000000-0000-0000-0000-c1ea0a000001', 'Norte', 'rentas',
    '["sábanas","toallas","amenities"]'::jsonb, 'high', 'planned', 'Equipo Limpieza' ),
  ( current_date + 7 + ((1 - extract(dow from current_date)::int + 7) % 7)::int,
    '11:50', 210, 'SEED: 🏘️ Turnover Mopac (s2)',
    '00000000-0000-0000-0000-c1ea0a000006', 'Norte', 'rentas',
    '["sábanas","toallas","amenities"]'::jsonb, 'high', 'planned', 'Equipo Limpieza' ),
  ( current_date + 7 + ((2 - extract(dow from current_date)::int + 7) % 7)::int,
    '08:00', 210, 'SEED: 🏘️ Turnover Lakeview (s2)',
    '00000000-0000-0000-0000-c1ea0a000002', 'Sur', 'rentas',
    '["sábanas","toallas","amenities"]'::jsonb, 'high', 'planned', 'Equipo Limpieza' ),
  ( current_date + 7 + ((3 - extract(dow from current_date)::int + 7) % 7)::int,
    '09:00', 75, 'SEED: 🛌 Turnover habitación 4 · Coliving',
    '00000000-0000-0000-0000-c1ea0a000003', 'Norte', 'rentas',
    '["sábanas","toallas","desinfectante"]'::jsonb, 'normal', 'planned', 'Equipo Limpieza' ),
  ( current_date + 7 + ((3 - extract(dow from current_date)::int + 7) % 7)::int,
    '10:30', 90, 'SEED: Limpieza profunda baños Coliving',
    '00000000-0000-0000-0000-c1ea0a000003', 'Norte', 'rentas',
    '["limpiador baño","desinfectante"]'::jsonb, 'normal', 'planned', 'Equipo Limpieza' ),
  -- POST-OBRA del Flip Burnet (terminó la obra esta semana)
  ( current_date + 7 + ((4 - extract(dow from current_date)::int + 7) % 7)::int,
    '08:00', 360, 'SEED: 🏗️ Limpieza Post-Remodelación · Flip Burnet',
    null, 'Norte', 'remodelacion',
    '["aspiradora HEPA","mopa industrial","limpiavidrios","desengrasante","quitapintura","mascarillas","guantes","bolsas industriales"]'::jsonb,
    'urgent', 'planned', 'Equipo Limpieza' );

update public.clean_day_tasks set project_id = '00000000-0000-0000-0000-7e60de100001'
  where title = 'SEED: 🏗️ Limpieza Post-Remodelación · Flip Burnet';

-- ────────────────────────────────────────────────────────────
-- 7) SEMANA 3 (Lun-Vie) — rutina estable + mensual long-term
-- ────────────────────────────────────────────────────────────
insert into public.clean_day_tasks (
  date, start_time, duration_min, title, property_id, zona, business, materials, priority, status, assignee
) values
  ( current_date + 14 + ((1 - extract(dow from current_date)::int + 7) % 7)::int,
    '08:00', 210, 'SEED: 🏘️ Turnover Maple (s3)',
    '00000000-0000-0000-0000-c1ea0a000001', 'Norte', 'rentas',
    '["sábanas","toallas","amenities"]'::jsonb, 'high', 'planned', 'Equipo Limpieza' ),
  ( current_date + 14 + ((1 - extract(dow from current_date)::int + 7) % 7)::int,
    '11:50', 210, 'SEED: 🏘️ Turnover Mopac (s3)',
    '00000000-0000-0000-0000-c1ea0a000006', 'Norte', 'rentas',
    '["sábanas","toallas","amenities"]'::jsonb, 'high', 'planned', 'Equipo Limpieza' ),
  ( current_date + 14 + ((2 - extract(dow from current_date)::int + 7) % 7)::int,
    '08:00', 210, 'SEED: 🏘️ Turnover Lakeview (s3)',
    '00000000-0000-0000-0000-c1ea0a000002', 'Sur', 'rentas',
    '["sábanas","toallas","amenities"]'::jsonb, 'high', 'planned', 'Equipo Limpieza' ),
  ( current_date + 14 + ((2 - extract(dow from current_date)::int + 7) % 7)::int,
    '11:30', 180, 'SEED: 📅 Mensual Long-Term · Pleasant Valley (mes 2)',
    '00000000-0000-0000-0000-c1ea0a000004', 'Sur', 'rentas',
    '["aspiradora","mopa","desinfectante"]'::jsonb, 'normal', 'planned', 'Equipo Limpieza' ),
  ( current_date + 14 + ((3 - extract(dow from current_date)::int + 7) % 7)::int,
    '09:00', 75, 'SEED: 🛌 Turnover habitación 1 · Coliving (s3)',
    '00000000-0000-0000-0000-c1ea0a000003', 'Norte', 'rentas',
    '["sábanas","toallas"]'::jsonb, 'normal', 'planned', 'Equipo Limpieza' ),
  ( current_date + 14 + ((4 - extract(dow from current_date)::int + 7) % 7)::int,
    '08:00', 210, 'SEED: 🏘️ Turnover Maple round 2 (s3)',
    '00000000-0000-0000-0000-c1ea0a000001', 'Norte', 'rentas',
    '["sábanas","toallas","amenities"]'::jsonb, 'high', 'planned', 'Equipo Limpieza' );

-- ────────────────────────────────────────────────────────────
-- Listo. Resumen:
-- - 6 propiedades (4 rentas activas + 1 coliving + 1 flip)
-- - 1 proyecto de remodelación
-- - 4 recurrentes (1 mensual + 3 turnovers semanales)
-- - 4 tareas en backlog
-- - 23+ tareas agendadas en 3 semanas
-- ============================================================
