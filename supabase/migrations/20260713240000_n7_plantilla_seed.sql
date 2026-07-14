-- ════════════════════════════════════════════════════════════════
-- N7 · PLANTILLA DEL AUTO-SCHEDULER LLENADA (cierra la dimensión #26) — ADITIVA.
-- Dueño por lista = ASIGNADO MÁS FRECUENTE REAL de esa lista en ClickUp (data-driven, no inventado);
-- listas sin histórico → dueño por dominio (los mismos de ct_config cierre_dueno_*: Juan draws/HML,
-- Michell facturas/obra-etapas, Carlos rentas, Alejandra obra). Editable en DB (RLS operacion).
-- FIX del fan-out: 'Entrega' ⊂ 'Pre-Entrega'/'POST-ENTREGA' y 'tareas' ⊂ 'Tareas recurrentes' →
-- v_tareas_huerfanas ahora elige el patrón MÁS LARGO que matchee (lateral limit 1), sin duplicar filas.
-- Rollback: delete from clickup_scheduler_plantilla where notas like 'seed 13-jul%';
--   (la vista vuelve con la versión de 20260713190000)
-- ════════════════════════════════════════════════════════════════
insert into public.clickup_scheduler_plantilla (lista_patron, dueno_default, dias_para_vencer, prioridad, notas)
select * from (values
  ('8. Remodelación',                        'Juan Manuel Sanchez', 7,  'normal', 'seed 13-jul · dueño = asignado real más frecuente (188 abiertas)'),
  ('Etapa Preconstruccion',                  'Michell Yanes',       7,  'normal', 'seed 13-jul · dueño = asignado real más frecuente'),
  ('Etapa Construccion',                     'Michell Yanes',       7,  'normal', 'seed 13-jul · dueño = asignado real más frecuente'),
  ('Pre-Entrega',                            'Michell Yanes',       7,  'normal', 'seed 13-jul · dueño = asignado real más frecuente'),
  ('POST-ENTREGA',                           'Michell Yanes',       7,  'normal', 'seed 13-jul · dueño = asignado real más frecuente'),
  ('Entrega',                                'Michell Yanes',       5,  'alta',   'seed 13-jul · entrega al cliente = fecha corta'),
  ('11. Estrategia de salida venta',         'Juan Manuel Sanchez', 7,  'normal', 'seed 13-jul · sin asignado histórico — dueño FF/venta (cierre C10/C11)'),
  ('9. Estrategia de Salida Renta',          'Juan Manuel Sanchez', 7,  'normal', 'seed 13-jul · dueño = asignado real más frecuente'),
  ('10. Proceso de refinanciación',          'Juan Manuel Sanchez', 5,  'alta',   'seed 13-jul · refi = plata del inversionista, fecha corta'),
  ('8. Cobros y pagos de renta',             'Carlos Vasquez',      3,  'alta',   'seed 13-jul · cobranza — dueño real + cierre C16 rentas'),
  ('7. Proceso de check-in',                 'Carlos Vasquez',      3,  'alta',   'seed 13-jul · huésped llegando, fecha corta'),
  ('3. Selección de Inversores',             'Juan Manuel Sanchez', 7,  'normal', 'seed 13-jul · dueño = asignado real más frecuente'),
  ('7. Cierre de la propiedad',              'Juan Manuel Sanchez', 5,  'alta',   'seed 13-jul · cierre con fechas contractuales'),
  ('Análisis y evaluación de propiedades',   'Juan Manuel Sanchez', 5,  'normal', 'seed 13-jul · dueño = asignado real más frecuente'),
  ('6. Contratistas',                        'Juan Manuel Sanchez', 7,  'normal', 'seed 13-jul · dueño = asignado real más frecuente'),
  ('2.1 Contacto empresa Remodelación',      'Juan Manuel Sanchez', 7,  'normal', 'seed 13-jul · dueño = asignado real más frecuente'),
  ('4. Poner Casa bajo contrato',            'Daniel Lara',         5,  'alta',   'seed 13-jul · dueño = asignado real más frecuente'),
  ('5. Hard Money Lender',                   'Juan Manuel Sanchez', 5,  'alta',   'seed 13-jul · sin asignado histórico — dueño HML (cierre C10/C15)'),
  ('6. Contratos y reservas',                'Carlos Vasquez',      5,  'normal', 'seed 13-jul · dueño = asignado real más frecuente'),
  ('Tareas recurrentes',                     'Michell Yanes',       7,  'normal', 'seed 13-jul · dueño = asignado real más frecuente'),
  ('tareas',                                 'Carlos Vasquez',      7,  'normal', 'seed 13-jul · lista operativa de Carlos'),
  ('Fase',                                   'Nicolás Lara',        14, 'baja',   'seed 13-jul · plan interno del OS (Fase 0-3) — dueño CEO'),
  ('1. Contrato de gestion',                 'Carlos Vasquez',      7,  'normal', 'seed 13-jul · onboarding rentas — dueño rentas (cierre C16)'),
  ('5. Publicar en plataformas',             'Carlos Vasquez',      7,  'normal', 'seed 13-jul · onboarding rentas — dueño rentas'),
  ('2. Acondicionamiento estético',          'Carlos Vasquez',      7,  'normal', 'seed 13-jul · onboarding rentas — dueño rentas'),
  ('4. Fotos',                               'Carlos Vasquez',      7,  'normal', 'seed 13-jul · onboarding rentas — dueño rentas'),
  ('1. Evidencias',                          'Michell Yanes',       7,  'normal', 'seed 13-jul · documentación — dueño facturas (cierre C13)'),
  ('9. Estrategia de Salida',                'Juan Manuel Sanchez', 7,  'normal', 'seed 13-jul · variante corta de la lista (la Renta matchea su patrón más largo)'),
  ('3. Habilitación y Publicación',          'Carlos Vasquez',      7,  'normal', 'seed 13-jul · onboarding rentas — dueño rentas'),
  ('0. Crear estructura de Drive',           'Michell Yanes',       7,  'normal', 'seed 13-jul · documentación')
) as v(lista_patron, dueno_default, dias_para_vencer, prioridad, notas)
where not exists (select 1 from public.clickup_scheduler_plantilla p where p.lista_patron = v.lista_patron);

-- vista sin fan-out: el patrón MÁS ESPECÍFICO (más largo) gana
create or replace view public.v_tareas_huerfanas as
select t.id, t.name, t.list_name, t.folder_name, t.primary_assignee, t.due_date, t.date_created,
  p.dueno_default as dueno_sugerido, p.dias_para_vencer,
  case when t.due_date is null and coalesce(trim(t.primary_assignee),'') = '' then 'sin fecha ni dueño'
       when t.due_date is null then 'sin fecha' else 'sin dueño' end as falta
from public.clickup_tasks_mirror t
left join lateral (
  select pp.dueno_default, pp.dias_para_vencer
  from public.clickup_scheduler_plantilla pp
  where pp.active and t.list_name ilike '%' || pp.lista_patron || '%'
  order by length(pp.lista_patron) desc limit 1
) p on true
where t.active and t.status_type is distinct from 'closed'
  and (t.due_date is null or coalesce(trim(t.primary_assignee),'') = '');
alter view public.v_tareas_huerfanas set (security_invoker = on);

-- resumen agregado para la card de /operacion (liviano: 1 fila por lista)
create or replace view public.v_huerfanas_resumen as
select list_name, dueno_sugerido, max(dias_para_vencer) as dias_para_vencer,
       count(*) as huerfanas,
       count(*) filter (where falta = 'sin fecha ni dueño') as sin_ambos
from public.v_tareas_huerfanas
group by 1, 2;
alter view public.v_huerfanas_resumen set (security_invoker = on);
