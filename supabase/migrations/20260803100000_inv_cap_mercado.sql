-- Indicadores institucionales del portal del inversor (valor forzado / compresión de cap / NAV).
-- Config nueva: cap de mercado (SUPUESTO editable) para valorar el NOI a precio de mercado.
-- Fluye al portal por inv_esc_config() (que devuelve todo esc_*) y al motor por invEsc.cfgDesde
-- (mapea esc_cap_mercado_pct -> cfg.cap_mercado_pct). Override por casa: inv_model_params key
-- 'cap_mercado_pct'. Idempotente.
insert into ff_uw_config (key, value)
values ('esc_cap_mercado_pct', 0.07)
on conflict (key) do nothing;
