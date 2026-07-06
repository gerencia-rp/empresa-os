-- ════════════════════════════════════════════════════════════════
-- RLS ETAPA 1 — tapar el leak de inversionistas (anon leía 21 investors,
-- 24 draws, 29 deals con la anon key cruda). ADITIVA sobre policies,
-- rollback documentado al pie. profiles ya estaba bien (anon → 0 filas).
--
-- Nueva regla de lectura para ff_investors / ff_draws / ff_deals:
--   anon → NADA · authenticated → solo con área fix-flip (o admin activo)
-- El portal inversionista NO se toca: usa el RPC investor_portal()
-- (SECURITY DEFINER) que lee por adentro sin depender de estas policies.
-- Los syncs/crons usan service_role (bypass RLS).
-- ════════════════════════════════════════════════════════════════

-- Helper reusable para la Etapa 2: ¿el usuario activo tiene el área? (admin siempre sí)
create or replace function public.has_area(area text)
returns boolean
language sql stable security definer
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and active
      and (role = 'admin' or area = any(coalesce(allowed_areas, '{}')))
  );
$$;
grant execute on function public.has_area(text) to authenticated;

drop policy if exists ff_investors_read on public.ff_investors;
create policy ff_investors_read on public.ff_investors
  for select to authenticated using (public.has_area('fix-flip'));

drop policy if exists ff_draws_read on public.ff_draws;
create policy ff_draws_read on public.ff_draws
  for select to authenticated using (public.has_area('fix-flip'));

drop policy if exists ff_deals_read on public.ff_deals;
create policy ff_deals_read on public.ff_deals
  for select to authenticated using (public.has_area('fix-flip'));

-- ─────────────────────────────────────────────────────────────────
-- ROLLBACK (volver al estado anterior — lectura abierta anon+authenticated):
--   drop policy if exists ff_investors_read on public.ff_investors;
--   create policy ff_investors_read on public.ff_investors for select to anon, authenticated using (true);
--   drop policy if exists ff_draws_read on public.ff_draws;
--   create policy ff_draws_read on public.ff_draws for select to anon, authenticated using (true);
--   drop policy if exists ff_deals_read on public.ff_deals;
--   create policy ff_deals_read on public.ff_deals for select to anon, authenticated using (true);
--   drop function if exists public.has_area(text);
-- ─────────────────────────────────────────────────────────────────
