-- ============================================================
-- RESTAURAR los 3 sistemas del área Educación
-- Safe re-run: usa ON CONFLICT, no rompe nada existente.
-- ============================================================

-- 1) Asegurar que el área "education" existe
insert into public.areas (id, name, icon, description, position) values
  ('education', 'Educación', '🎓',
   'Mentorías Flipping Rentals · Rental Profits · Wholesale. Seguimiento estudiantes, etapas, alertas.',
   50)
on conflict (id) do update set
  name = excluded.name,
  icon = excluded.icon,
  description = excluded.description;

-- 2) Re-insertar los 3 sistemas
insert into public.systems (id, area_id, type, name, icon, description, config, data, position) values
  -- Sistema 1: Mentorías Manager (el operativo principal)
  ('edu-manager', 'education', 'edu-manager',
   'Mentorías Manager', '🎓',
   'Gestor unificado de las 3 mentorías: estudiantes, etapas, plan IA, recursos, alertas, calendario.',
   '{}'::jsonb, '{}'::jsonb, 0),

  -- Sistema 2: Presentaciones IA (independiente)
  ('edu-presentations', 'education', 'edu-presentations',
   'Generador de Presentaciones IA', '🎬',
   'Crea presentaciones de clase con IA + web search live. Data verificable en vivo. Descarga PPTX listo para usar.',
   '{}'::jsonb, '{}'::jsonb, 1),

  -- Sistema 3: Informes Ejecutivos (independiente)
  ('edu-reports', 'education', 'edu-reports',
   'Informes Ejecutivos', '📈',
   'Informes semanales / quincenales / mensuales con análisis IA: cartera, progreso, clases. Para reuniones de management.',
   '{}'::jsonb, '{}'::jsonb, 2)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  type = excluded.type,
  area_id = excluded.area_id;

-- 3) Verificar que quedaron registrados
select id, area_id, type, name, icon, position
from public.systems
where area_id = 'education'
order by position;
