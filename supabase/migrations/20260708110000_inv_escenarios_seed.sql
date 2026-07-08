-- 💎 Inversionistas F2 — parámetros del escenario ESTIMADO (underwriting original) para Dove.
-- ADITIVA. Rollback: delete de estas keys.
insert into public.inv_model_params (property_id, key, value, fuente, descripcion) values
 ('419fc8c3-1d49-4bf5-a39a-6ef8a8024606','est_remodel_total','71739','real:ff_deals','remodelación ESTIMADA del underwriting (remodel_est)'),
 ('419fc8c3-1d49-4bf5-a39a-6ef8a8024606','est_arv','370000','real:ff_deals','ARV estimado del underwriting'),
 ('419fc8c3-1d49-4bf5-a39a-6ef8a8024606','est_cierre_pct','0.02','modelo','originación estimada (2% sobre compra+remodelación)')
on conflict (property_id, key) do nothing;
