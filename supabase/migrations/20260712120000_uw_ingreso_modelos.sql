-- ════════════════════════════════════════════════════════════════
-- 🏠 CALC 5 · INGRESO POR MODELO DE NEGOCIO (ADITIVA, rollback al pie).
-- Tarifas semilla calibradas con la base de Rentas real (apptTKRYbx6gu701i):
--   Habitación $800 (Childress 6 hab → $4,800) · Estudio $1,000–1,200 (default 1,100;
--   Shadow apto+2 estudios → $4,200) · Apartamento $1,600–2,400 (default 2,000) ·
--   Casa completa Austin $2,600–3,700 (default 3,100) / Marlin $1,000–1,400 (default 1,200).
-- Overrides por ZONA: sufijo _sur/_norte/_rr/_marlin (ej. ing_hab_norte) — editables en la UI.
-- Vacancy REALISTA por modelo (más rotación en habitaciones/unidades).
-- ════════════════════════════════════════════════════════════════
insert into public.ff_uw_config (key, value, label) values
  -- tarifas base (Austin; override por zona con sufijo _sur/_norte/_rr/_marlin)
  ('ing_hab',            '800',  'Ingreso · $/habitación/mes (Austin; override ing_hab_<zona>)'),
  ('ing_estudio',        '1100', 'Ingreso · $/estudio/mes (rango real 1,000–1,200)'),
  ('ing_apto',           '2000', 'Ingreso · $/apartamento/mes (rango real 1,600–2,400)'),
  ('ing_casa',           '3100', 'Ingreso · $ casa completa/mes (Austin, rango real 2,600–3,700)'),
  ('ing_casa_marlin',    '1200', 'Ingreso · $ casa completa/mes Marlin (rango real 1,000–1,400)'),
  ('ing_hab_marlin',     '450',  'Ingreso · $/habitación/mes Marlin'),
  -- vacancy realista POR MODELO (%)
  ('ing_vac_casa',       '5',    'Ingreso · vacancy % Casa Completa (menos rotación)'),
  ('ing_vac_hab',        '10',   'Ingreso · vacancy % Por Habitaciones (más rotación)'),
  ('ing_vac_unidades',   '8',    'Ingreso · vacancy % Por Unidades'),
  ('ing_vac_mixta',      '8',    'Ingreso · vacancy % Mixta')
on conflict (key) do nothing;

-- ─── ROLLBACK ───
-- delete from public.ff_uw_config where key like 'ing\_%' escape '\';
