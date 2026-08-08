-- ════════════════════════════════════════════════════════════════
-- 🏘️ ESCUADRA RENTAS — piloto (blueprint). Aditivo, idempotente.
-- 5 agentes por-empresa (Gerente/Ejecución/Optimización/Reportes/Financiero) en
-- DRY-RUN. Coexisten con los transversales (Verificador/Reportero Rentas).
-- Columna `squad` para agruparlos sin romper el modelo de capas (capa funcional).
-- Reglas duras: todo dry-run; plata/mensaje a tercero = delegado propone → Nicolás confirma.
-- ════════════════════════════════════════════════════════════════
alter table public.agent_registry add column if not exists squad text;

insert into public.agent_registry (nombre, proceso, empresa, area, capa, squad, inputs, outputs, acciones, nivel_riesgo, estado, dueno)
select v.nombre, v.proceso, v.empresa, v.area, v.capa, v.squad,
       v.inputs::jsonb, v.outputs::jsonb, v.acciones::jsonb, v.nivel_riesgo, v.estado, v.dueno
from (values
  ('Gerente de Rentas',
   'Cabeza de la escuadra de Rentas: lee a Ejecución/Optimización/Reportes/Financiero, resuelve conflictos, decide qué sube a Nicolás. Reporta al Cerebro Ejecutivo.',
   'Rentas','rentas','Command','Rentas',
   '["salidas de los 4 agentes de Rentas","agent_proposals de Rentas"]',
   '["foto ejecutiva de Rentas","top 3 decisiones","cola priorizada de propuestas"]',
   '["consolidar → agent_proposals (no ejecuta; Nicolás decide)"]',
   'P2','dry-run','CEO'),

  ('Ejecución Rentas',
   'Que cada tarea se cumpla: vigila los 9 pasos de cada casa + rituales diarios, persigue vencidas/sin-dueño, mantiene Airtable vivo. Trabajo físico = proveedor.',
   'Rentas','rentas','Ops','Rentas',
   '["ClickUp tareas/etapas","Airtable estado casa","plataformas Airbnb/PadSplit"]',
   '["Airtable sincronizado","órdenes de trabajo","detección vencidas/sin-dueño"]',
   '["propone nudges/órdenes a terceros (aprueba humano); sync/checklist 100% auto"]',
   'P1','dry-run','Nicolás Lara'),

  ('Optimización Rentas',
   'Revisa el día a día (tareas, tiempos de etapa, ocupación) y mejora: cuellos de botella, precios dinámicos, casas estancadas, agenda de la reunión de mejora.',
   'Rentas','rentas','Ops','Rentas',
   '["tiempos por etapa (ClickUp)","ocupación y precios (plataformas)","histórico"]',
   '["mejoras accionables con impacto estimado","propuesta de precios dinámicos"]',
   '["propone cambios de precio (regla o aprobación)"]',
   'P1','dry-run','Nicolás Lara'),

  ('Reportes Rentas',
   'Convierte todo en PDFs internos claros al Command Center (bitácora semanal, ocupación, financiero mensual), versionados. Sin envío autónomo.',
   'Rentas','rentas','Report','Rentas',
   '["Ejecución + Financiero + Optimización","Airtable/QB"]',
   '["PDF interno versionado en el Command Center"]',
   '["genera y guarda PDF (sin envío autónomo)"]',
   'P2','dry-run','Nicolás Lara'),

  ('Financiero Rentas',
   'Vigila el movimiento del dinero de Rentas: aging de mora, conciliación Airtable↔QB↔banco, detección de descuadres; redacta cobros y órdenes de pago. Registra la plata real, no el contrato.',
   'Rentas','rentas','Finance','Rentas',
   '["Airtable plata real cobrada/pagada","QuickBooks","aging"]',
   '["aging de mora","conciliación al centavo o descuadre marcado","borradores de cobro/pago"]',
   '["propone cobro (mensaje a inquilino) y pago (movimiento de plata) → Nicolás confirma; cero acción financiera autónoma"]',
   'P1','dry-run','Nicolás Lara')
) as v(nombre, proceso, empresa, area, capa, squad, inputs, outputs, acciones, nivel_riesgo, estado, dueno)
where not exists (select 1 from public.agent_registry r where r.nombre = v.nombre and r.deleted_at is null);

-- ── ROLLBACK ──
--   delete from public.agent_registry where squad='Rentas'
--     and nombre in ('Gerente de Rentas','Ejecución Rentas','Optimización Rentas','Reportes Rentas','Financiero Rentas');
--   -- columna squad queda (aditiva).
