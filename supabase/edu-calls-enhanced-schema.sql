-- Calendario de sesiones enriquecido para postventa
-- Agrega: tema, motivo, atendido_por, status_asistencia con motivo, evidencia,
-- resumen post-sesión, vínculo a reagendado.

alter table public.edu_student_calls
  add column if not exists mentorship_id text references public.edu_mentorships(id) on delete cascade,
  add column if not exists topic text,                         -- tema específico (ej. "Revisión buybox Austin SE")
  add column if not exists motivo text,                        -- categoría del motivo
  add column if not exists attended_by text,                   -- coach que atendió (email o nombre)
  add column if not exists status_attendance text default 'pendiente'
    check (status_attendance in ('pendiente','confirmado','asistio','no_asistio','reprogramo','cancelo')),
  add column if not exists status_reason text,                 -- motivo si no_asistio/reprogramo/cancelo
  add column if not exists evidence_url text,                  -- link a grabación / drive / notion
  add column if not exists summary text,                       -- resumen post-sesión
  add column if not exists rescheduled_to uuid references public.edu_student_calls(id) on delete set null,
  add column if not exists rescheduled_from uuid references public.edu_student_calls(id) on delete set null,
  add column if not exists email_sent_at timestamptz,
  add column if not exists invite_meta jsonb,                  -- {ics_uid, sent_to, ...}
  add column if not exists airtable_record_id text,            -- sync con Airtable
  add column if not exists updated_at timestamptz default now();

-- Index para reportes mensuales por mentoría
create index if not exists edu_calls_mentorship_date on public.edu_student_calls(mentorship_id, scheduled_at desc);
create index if not exists edu_calls_status on public.edu_student_calls(status_attendance);

-- Catálogo de motivos (semilla) — el frontend usa esto como dropdown
create table if not exists public.edu_call_motivos (
  id text primary key,
  label text not null,
  emoji text,
  active boolean default true,
  orden int default 0
);
insert into public.edu_call_motivos (id, label, emoji, orden) values
  ('bienvenida',     'Bienvenida / Onboarding',         '👋', 1),
  ('diagnostico',    'Diagnóstico inicial',             '🎯', 2),
  ('plan_review',    'Revisión Plan de Acción',         '📋', 3),
  ('coaching',       'Coaching 1-on-1',                 '💬', 4),
  ('credito',        'Diagnóstico / Coaching crédito',  '💳', 5),
  ('buybox',         'Buy Box / Análisis mercado',      '🏘️', 6),
  ('deal_review',    'Revisión de deal específico',     '🔍', 7),
  ('cierre',         'Cierre / Celebración deal',       '🎉', 8),
  ('crisis',         'Crisis / Bloqueo',                '🚨', 9),
  ('renovacion',     'Renovación / Renewal',            '🔄', 10),
  ('exit',           'Exit / Despedida',                '👋', 11),
  ('grupal',         'Sesión grupal',                   '👥', 12),
  ('otro',           'Otro',                            '📌', 99)
on conflict (id) do nothing;

-- Asegurar mentorship en rows viejas (best effort: el student_id define la mentoría)
update public.edu_student_calls c set mentorship_id = s.mentorship_id
  from public.edu_students s where c.student_id = s.id and c.mentorship_id is null;

-- Vista para reporte ejecutivo: sesiones por mes con desglose
create or replace view public.edu_calls_monthly_view as
select
  c.mentorship_id,
  date_trunc('month', c.scheduled_at) as mes,
  count(*) filter (where c.status_attendance = 'asistio') as asistidas,
  count(*) filter (where c.status_attendance = 'no_asistio') as no_asistidas,
  count(*) filter (where c.status_attendance = 'reprogramo') as reprogramadas,
  count(*) filter (where c.status_attendance = 'cancelo') as canceladas,
  count(*) filter (where c.status_attendance in ('pendiente','confirmado')) as pendientes,
  count(*) as total,
  round(100.0 * count(*) filter (where c.status_attendance = 'asistio') / nullif(count(*) filter (where c.status_attendance in ('asistio','no_asistio')), 0), 1) as pct_asistencia
from public.edu_student_calls c
group by 1, 2
order by 1, 2 desc;

grant select on public.edu_calls_monthly_view to authenticated;
grant select on public.edu_call_motivos to authenticated;
