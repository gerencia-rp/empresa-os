-- ============================================================
-- Separar Presentaciones e Informes como sistemas independientes
-- (antes eran tabs dentro de "Mentorías Manager")
-- ============================================================

-- Registrar 2 sistemas nuevos en el área education
insert into public.systems (id, area_id, type, name, icon, description, config, data, position) values
  ('edu-presentations', 'education', 'edu-presentations',
   'Generador de Presentaciones IA',
   '🎬',
   'Crea presentaciones de clase con IA + web search live. Data verificable en vivo. Descarga PPTX listo para usar.',
   '{}'::jsonb, '{}'::jsonb, 1),
  ('edu-reports', 'education', 'edu-reports',
   'Informes Ejecutivos',
   '📈',
   'Informes semanales / quincenales / mensuales con análisis IA: cartera, progreso, clases. Para reuniones de management.',
   '{}'::jsonb, '{}'::jsonb, 2)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon;
