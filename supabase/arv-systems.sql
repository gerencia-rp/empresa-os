-- Precarga sistemas ARV calculator + Insights en Fix & Flip
insert into public.systems (id, area_id, type, name, icon, description, config, data, position) values
  ('arv-calculator', 'fix-flip', 'arv-calc', 'Calculadora ARV',  '🎯',
   'Estima el valor post-remodelación basado en tus appraisals históricos', '{}'::jsonb, '{}'::jsonb, 2),
  ('arv-insights', 'fix-flip', 'arv-insights', 'Insights de Appraisals', '📊',
   'Qué features mueven el valor — guía para maximizar ARV', '{}'::jsonb, '{}'::jsonb, 3)
on conflict (id) do nothing;
