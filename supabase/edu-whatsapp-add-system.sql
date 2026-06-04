-- 1) Ver qué áreas existen (para saber el id real de Educación)
select id, name, position from public.areas order by position;

-- 2) Ver si el sistema ya existe (por id)
select id, area_id, type, name from public.systems where id = 'edu-whatsapp-mgr';

-- 3) Forzar el insert con el id real del area de Educación
-- (cambia 'education' por el id que viste en la query #1 si es diferente)
insert into public.systems (id, area_id, type, name, icon, description, config, data, position)
select 'edu-whatsapp-mgr',
       a.id,
       'edu-whatsapp',
       'WhatsApp Masivo IA',
       '💬',
       'Mensajes masivos personalizados con IA basados en etapa y plan del estudiante. Captura respuestas y actualiza el plan.',
       '{}'::jsonb, '{}'::jsonb,
       5
from public.areas a
where a.id in ('education','educacion') or lower(a.name) like 'educaci%'
limit 1
on conflict (id) do update set
  area_id    = excluded.area_id,
  name       = excluded.name,
  icon       = excluded.icon,
  description= excluded.description;

-- 4) Verificar que quedó
select id, area_id, type, name, position from public.systems where id = 'edu-whatsapp-mgr';
