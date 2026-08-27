-- Cierra las seis vistas detectadas por la auditoría semanal.
-- Las vistas de mercado ya eran públicas; se otorga lectura explícita únicamente
-- a sus fuentes de referencia para conservar el comportamiento con invoker.
grant usage on schema rp to anon,authenticated,service_role;
grant select on rp.city_market,rp.voucher_county,rp.fmr_county,rp.v_fmr_county,
  rp.macro,rp.state_market to anon,authenticated,service_role;

alter view public.market_cities set(security_invoker=true);
alter view public.market_fmr_county set(security_invoker=true);
alter view public.market_macro set(security_invoker=true);
alter view public.market_states set(security_invoker=true);
alter view public.market_voucher_county set(security_invoker=true);
alter view public.v_ff_stage_duration set(security_invoker=true);

select public.security_audit_run();
