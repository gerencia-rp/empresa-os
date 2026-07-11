-- ════════════════════════════════════════════════════════════════
-- 🏭 FÁBRICA DE ARTEFACTOS v3 (Guía Maestra) — wizard con Ficha de 10 campos,
-- propuesta confirmable, demo en vivo y publicación explícita.
-- Aditiva sobre 20260710100000. Soft-delete `activo`, sin DELETE policies.
--   ia_sessions  += ficha_json (los 10 campos) + paquete_json (artefacto en demo)
--                 + estados nuevos 'propuesta'/'demo' en el check
--   ia_artifacts += ficha_json + instructivo (paquete completo publicado)
-- ════════════════════════════════════════════════════════════════

alter table public.ia_sessions add column if not exists ficha_json jsonb;
alter table public.ia_sessions add column if not exists paquete_json jsonb;
alter table public.ia_sessions drop constraint if exists ia_sessions_estado_check;
alter table public.ia_sessions add constraint ia_sessions_estado_check
  check (estado in ('activa','propuesta','demo','publicada','spec','abandonada'));

alter table public.ia_artifacts add column if not exists ficha_json jsonb;
alter table public.ia_artifacts add column if not exists instructivo text;

-- ROLLBACK (manual):
--   alter table public.ia_sessions drop column if exists ficha_json, drop column if exists paquete_json;
--   alter table public.ia_artifacts drop column if exists ficha_json, drop column if exists instructivo;
--   (re-crear el check original de estado si hiciera falta)
