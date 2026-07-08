-- 💎 Inversionistas — CALIBRACIÓN EXCEL de Dove Springs (perfil post-refi plano).
-- Con el fix del motor (año 1 post-refi = operación, no el ciclo — se contaba doble),
-- el perfil plano calibrado reproduce EXACTO los targets de la hoja:
--   TIR 31a = 46.70% · VPN 31a = $186,668
-- Solución cerrada: utilidad anual plana $1,941.55 ($161.80/mes; real OS $155/mes)
-- y año 0 = −$4,157.47 (cash atrapado real $4,612.90 − ajustes de cierre del refi).
-- ADITIVA. Rollback: delete de estas 3 keys (el motor cae al perfil 'motor').
insert into public.inv_model_params (property_id, key, value, fuente, descripcion) values
 ('419fc8c3-1d49-4bf5-a39a-6ef8a8024606','postrefi_perfil','plano','excel(calibrado)','proyección 1-31 post-refi: plano (como el Excel) — el motor también soporta ''motor'' (crecimiento apalancado)'),
 ('419fc8c3-1d49-4bf5-a39a-6ef8a8024606','util_anual_postrefi','1941.55','excel(calibrado)','utilidad anual plana post-refi — calibrada para TIR 46.70% / VPN $186,668'),
 ('419fc8c3-1d49-4bf5-a39a-6ef8a8024606','anio0_postrefi','4157.47','excel(calibrado)','año 0 post-refi (cash atrapado del ciclo según el Excel; real ff_draws.net_total = 4,612.90)')
on conflict (property_id, key) do nothing;
