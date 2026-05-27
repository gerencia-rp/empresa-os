-- ============================================================
-- SYNC desde Airtable "Empresa de Remodelación" (23 casas reales)
-- Sqft: cruzado con appraisals cuando disponible, sino seed conocido
-- ============================================================

alter table public.renovation_cases add column if not exists city text;
alter table public.renovation_cases add column if not exists state text;
alter table public.renovation_cases add column if not exists lider text;
alter table public.renovation_cases add column if not exists deviation_label text;
alter table public.renovation_cases add column if not exists start_date date;
alter table public.renovation_cases add column if not exists end_date date;

-- Borrar y reinsertar todo limpio (data fresca de Airtable)
delete from public.renovation_cases;

insert into public.renovation_cases (code, address, city, state, lider, sqft, materials, labor, hours, internal_cost, days, budget, sold_for, deviation_pct, deviation_label, status, start_date, end_date, is_seed, is_atypical, is_calibrator) values
  -- Casas grandes
  ('CAPPS',    '406 Capps St, Marlin TX',              'Marlin',     'Texas', 'Eduardo', null, 90000.00, 90000.00, null, 189000.00, 34, 189000.00, 189000.00,   0.00,  'En presupuesto',         'Finalizado', '2025-02-05', null,         false, false, false),
  ('RAMBLE',   '514 Ramble Ln, Austin TX 78745',       'Austin',     'Texas', 'Roberto',1519, 56241.67, 43942.51, 2557, 105193.39, 80, 100000.00, 150000.00,   5.19,  'Sobre presupuesto',      'Finalizado', '2025-11-28', '2026-03-02', false, false, true),
  ('ARCADIA',  '1109 Arcadia Ave, Austin TX 78757',    'Austin',     'Texas', 'Óscar',  1509, 34548.00, 43610.34, 2426,  82066.26, 69,  89790.00, 145000.00,  -8.60,  '¡Excelente! Ahorro',     'Finalizado', '2025-12-02', '2026-02-16', false, false, true),
  ('CAPITOL',  '407 Capitol Dr, Austin TX 78753',      'Austin',     'Texas', 'Eduardo', null, 35019.63, 42118.53, null,  80995.07, 72,  77422.81,  75003.00,   4.61,  'Sobre presupuesto',      'Finalizado', '2025-08-01', '2025-09-28', false, false, false),
  ('PICNIC',   '1607 Picnic Cove, Round Rock TX 78664','Round Rock', 'Texas', 'Eduardo',1508, 33398.23, 41080.21, 2332,  78202.36, 56,  76566.95,  85000.00,   2.14,  'Sobre presupuesto',      'Finalizado', '2025-09-29', '2026-01-12', false, false, true),
  ('ECHO',     '1100 Echo Ln, Austin TX 78745',        'Austin',     'Texas', 'Vato',   1600, 36316.71, 36204.82, null,  76147.61, 69,  76147.61, 100000.00,   0.00,  '¡Excelente! Ahorro',     'Finalizado', '2025-08-10', '2025-10-09', false, false, false),
  ('MICHELLE', '5003 Michelle Ct, Austin TX 78744',    'Austin',     'Texas', 'Roberto',2174, 32945.74, 38086.70, null,  74584.06, 33,  74584.06,  85000.00,   0.00,  'Sobre presupuesto',      'Finalizado', '2025-09-12', '2025-10-15', false, false, false),
  ('IDLE',     '6107 Idlewood Cove, Austin TX 78745',  'Austin',     'Texas', 'Vato',   1135, 33609.03, 35429.16, 1959,  72490.10, 69,  65000.00,  80000.00,  11.52,  '¡ALERTA! +10%',          'Finalizado', '2025-11-28', '2026-02-19', false, false, true),
  ('BRAMBLE',  '512 Bramble Dr, Austin TX 78745',      'Austin',     'Texas', 'Eduardo',1666, 22577.15, 37620.81, 2257,  63207.86, 55,  41000.00,  65000.00,  54.17,  '¡ALERTA! +10%',          'Finalizado', '2026-02-17', '2026-05-08', false, false, false),
  ('BETHUNE',  '7105 Bethune Ave, Austin TX 78752',    'Austin',     'Texas', 'Óscar',  null, 23369.04, 34034.35, null,  60273.56, 81, 100000.00, 150000.00, -39.73,  '¡Excelente! Ahorro',     'En construcción', '2026-04-01', null,    false, false, false),
  ('CHILDRESS','9909 Childress Dr, Austin TX 78753',   'Austin',     'Texas', 'Eduardo',1402, 34705.99, 19710.60, null,  57137.42, 42,  57137.42,  60703.00,   0.00,  'En presupuesto',         'Finalizado', '2025-06-13', '2025-07-25', false, false, false),
  ('DOVE',     '2315 Dove Springs Dr, Austin TX 78744','Austin',     'Texas', 'Roberto',null, 30563.75, 23460.05, null,  56724.99, 58,  56724.99,  75000.00,   0.00,  'En presupuesto',         'Finalizado', '2025-05-16', '2025-06-20', false, false, false),
  ('SHADOW',   '6203 Shadow Bend, Austin TX 78745',    'Austin',     'Texas', 'Roberto',null, 19868.33, 32665.06, null,  55160.06, 51,  70000.00,  75000.00, -21.20,  '¡Excelente! Ahorro',     'Finalizado', '2026-03-11', null,         false, false, false),
  ('NESTING',  '4905 Nesting Way, Austin TX 78744',    'Austin',     'Texas', 'Roberto',1330, 26306.63, 23134.50, null,  51913.19, 41,  51610.08,  66000.00,   0.59,  'Sobre presupuesto',      'Finalizado', '2025-06-28', '2025-08-14', false, false, false),
  ('GARDEN',   '1302 Garden Path Dr, Round Rock TX',   'Round Rock', 'Texas', 'Vato',   1878, 20114.45, 25833.78, 1550,  48245.64, 43,  40000.00,  55000.00,  20.61,  '¡ALERTA! +10%',          'Finalizado', '2026-02-21', '2026-04-28', false, false, false),
  ('MEADOW',   '5702 Meadow Crst, Austin TX 78744',    'Austin',     'Texas', 'Óscar',  1468, 19063.37, 21743.50, 1305,  42847.21, 50,  42847.21,  50000.00,   0.00,  'Sobre presupuesto',      'Finalizado', '2025-08-25', '2025-10-13', false, false, false),
  ('VIRGINIA', '902 Virginia Dr, Round Rock TX 78664', 'Round Rock', 'Texas', 'Adrián', 1935, 15857.71, 23383.25, 1643,  41203.01, 73,  41203.01,  85000.00,   0.00,  'En presupuesto',         'Finalizado', '2025-08-29', '2025-10-12', false, false, true),
  ('BARK',     '419 Barkbridge Trail, Austin TX',      'Austin',     'Texas', 'Roberto',null, 25200.00, 14000.00, null,  41160.00, 26,  41160.00,  41160.00,   0.00,  'En presupuesto',         'Finalizado', '2025-02-20', '2026-04-19', false, false, false),
  ('BITTER',   '2511 Bitter Creek Dr, Austin TX 78744','Austin',     'Texas', 'Luis',   1252, 19442.98, 13895.93,  834,  35005.86, 54,  35005.86,  60000.00,   0.00,  'En presupuesto',         'Finalizado', '2025-09-17', '2025-10-12', false, false, false),
  ('TRAILER',  'Trailer 259, 1601 E Slaughter Ln',     'Austin',     'Texas', 'Eduardo', null, 10000.00, 10000.00, null,  21000.00, 30,  21000.00,  21000.00,   0.00,  'En presupuesto',         'Finalizado', '2025-02-01', null,         false, true,  false),
  ('DENFIELD', '1133 Denfield St, Austin TX 78721',    'Austin',     'Texas', 'Eduardo', null,  3187.94,  6497.64, null,  10169.86, 59,  90000.00, 150000.00, -88.70,  '¡Excelente! Ahorro',     'En construcción', '2026-04-07', null,    false, false, false),
  ('BARK2',    '4916 Barkbridge #2',                   'Austin',     'Texas', 'Vato',   null,  2716.08,  2389.13, null,   5360.47,  3,   5360.47,   5360.47,   0.00,  'Sobre presupuesto',      'Finalizado', '2026-04-16', null,         false, true,  false),
  ('STONE',    '6504 Stonleigh Pl, Austin TX 78744',   'Austin',     'Texas', 'Roberto',1204,  2560.97,     0.00, null,   2689.02,  3,   2689.02,  10000.00,   0.00,  '¡Excelente! Ahorro',     'Finalizado', '2025-09-25', null,         false, true,  false);

-- Recalcular columna deviation_pct usando lo que viene de Airtable (ya está bien)
-- Recordatorio: las casas marcadas is_calibrator (5) son las que el estimador usa para derivar h/sqft y tarifa
