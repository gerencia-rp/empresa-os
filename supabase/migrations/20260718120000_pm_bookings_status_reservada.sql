-- pm_bookings.status += 'reservada' — el sync ahora preserva el Estado "Reservada"
-- de Airtable como status propio (antes se derivaba por fechas y caía en 'activo').
-- Rollback: recrear el check sin 'reservada' (tras re-mapear esas filas).

alter table public.pm_bookings drop constraint if exists pm_bookings_status_check;
alter table public.pm_bookings add constraint pm_bookings_status_check
  check (status = any (array['borrador'::text, 'confirmado'::text, 'reservada'::text, 'activo'::text, 'vencido'::text, 'cancelado'::text, 'finalizado'::text]));
