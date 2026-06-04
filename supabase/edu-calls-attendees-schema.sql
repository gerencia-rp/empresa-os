-- Asistentes adicionales para sesiones del calendario.
-- Soporta múltiples emails que reciben el ICS y aparecen como ATTENDEE.

alter table public.edu_student_calls
  add column if not exists attendee_emails text[] default '{}',  -- emails extra (coach team, observers, partners)
  add column if not exists location text,                        -- "Zoom https://..." | "Google Meet https://..." | dirección física
  add column if not exists meeting_url text;                     -- URL específica de video llamada
