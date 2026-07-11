-- ════════════════════════════════════════════════════════════════
-- 🏭 IA v3.1 "modo económico" — la Fábrica ya no auto-construye por API:
-- la entrevista (Haiku) llena la Ficha y el server genera el PROMPT PODEROSO
-- (plantilla Guía Maestra v2) que se guarda en ia_specs y se construye en
-- Claude Code. Aditiva: ia_specs guarda la ficha y el carril.
--   carril libre → estado 'aprobado' (listo para construir sin permiso)
--   carril ok    → estado 'pendiente' (igual que siempre, OK del admin)
-- ════════════════════════════════════════════════════════════════

alter table public.ia_specs add column if not exists ficha_json jsonb;
alter table public.ia_specs add column if not exists carril text check (carril is null or carril in ('libre','ok'));
alter table public.ia_specs add column if not exists tipo text check (tipo is null or tipo in ('prompt','dashboard','agente','automatizacion'));

-- ROLLBACK (manual):
--   alter table public.ia_specs drop column if exists ficha_json, drop column if exists carril, drop column if exists tipo;
