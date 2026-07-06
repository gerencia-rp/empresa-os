-- ROLLBACK de RLS Etapa 2 (20260706120000). Restaura el acceso previo
-- (semánticamente equivalente a las policies originales). Correr entero.

-- ff_hml_loans
drop policy if exists ff_hml_loans_area_read on public.ff_hml_loans;
drop policy if exists ff_hml_loans_area_write on public.ff_hml_loans;
drop policy if exists ff_hml_loans_area_ins on public.ff_hml_loans;
drop policy if exists ff_hml_loans_area_upd on public.ff_hml_loans;
drop policy if exists ff_hml_loans_area_update on public.ff_hml_loans;
create policy ff_hml_loans_rb_read on public.ff_hml_loans for select to anon, authenticated using (true);

-- ff_hml_payments
drop policy if exists ff_hml_payments_area_read on public.ff_hml_payments;
drop policy if exists ff_hml_payments_area_write on public.ff_hml_payments;
drop policy if exists ff_hml_payments_area_ins on public.ff_hml_payments;
drop policy if exists ff_hml_payments_area_upd on public.ff_hml_payments;
drop policy if exists ff_hml_payments_area_update on public.ff_hml_payments;
create policy ff_hml_payments_rb_read on public.ff_hml_payments for select to anon, authenticated using (true);

-- ff_overhead
drop policy if exists ff_overhead_area_read on public.ff_overhead;
drop policy if exists ff_overhead_area_write on public.ff_overhead;
drop policy if exists ff_overhead_area_ins on public.ff_overhead;
drop policy if exists ff_overhead_area_upd on public.ff_overhead;
drop policy if exists ff_overhead_area_update on public.ff_overhead;
create policy ff_overhead_rb_read on public.ff_overhead for select to anon, authenticated using (true);

-- ff_uw_config
drop policy if exists ff_uw_config_area_read on public.ff_uw_config;
drop policy if exists ff_uw_config_area_write on public.ff_uw_config;
drop policy if exists ff_uw_config_area_ins on public.ff_uw_config;
drop policy if exists ff_uw_config_area_upd on public.ff_uw_config;
drop policy if exists ff_uw_config_area_update on public.ff_uw_config;
create policy ff_uw_config_rb_read on public.ff_uw_config for select to anon, authenticated using (true);

-- qb_account_map
drop policy if exists qb_account_map_area_read on public.qb_account_map;
drop policy if exists qb_account_map_area_write on public.qb_account_map;
drop policy if exists qb_account_map_area_ins on public.qb_account_map;
drop policy if exists qb_account_map_area_upd on public.qb_account_map;
drop policy if exists qb_account_map_area_update on public.qb_account_map;
create policy qb_account_map_rb_read on public.qb_account_map for select to anon, authenticated using (true);

-- qb_report_cache
drop policy if exists qb_report_cache_area_read on public.qb_report_cache;
drop policy if exists qb_report_cache_area_write on public.qb_report_cache;
drop policy if exists qb_report_cache_area_ins on public.qb_report_cache;
drop policy if exists qb_report_cache_area_upd on public.qb_report_cache;
drop policy if exists qb_report_cache_area_update on public.qb_report_cache;
create policy qb_report_cache_rb_read on public.qb_report_cache for select to anon, authenticated using (true);

-- airtable_record_names
drop policy if exists airtable_record_names_area_read on public.airtable_record_names;
drop policy if exists airtable_record_names_area_write on public.airtable_record_names;
drop policy if exists airtable_record_names_area_ins on public.airtable_record_names;
drop policy if exists airtable_record_names_area_upd on public.airtable_record_names;
drop policy if exists airtable_record_names_area_update on public.airtable_record_names;
create policy airtable_record_names_rb_read on public.airtable_record_names for select to authenticated using (true);
create policy airtable_record_names_rb_write on public.airtable_record_names for all to authenticated using (true) with check (true);

-- house_link_overrides
drop policy if exists house_link_overrides_area_read on public.house_link_overrides;
drop policy if exists house_link_overrides_area_write on public.house_link_overrides;
drop policy if exists house_link_overrides_area_ins on public.house_link_overrides;
drop policy if exists house_link_overrides_area_upd on public.house_link_overrides;
drop policy if exists house_link_overrides_area_update on public.house_link_overrides;
create policy house_link_overrides_rb_read on public.house_link_overrides for select to authenticated using (true);
create policy house_link_overrides_rb_write on public.house_link_overrides for all to authenticated using (true) with check (true);

-- remodel_actuals
drop policy if exists remodel_actuals_area_read on public.remodel_actuals;
drop policy if exists remodel_actuals_area_write on public.remodel_actuals;
drop policy if exists remodel_actuals_area_ins on public.remodel_actuals;
drop policy if exists remodel_actuals_area_upd on public.remodel_actuals;
drop policy if exists remodel_actuals_area_update on public.remodel_actuals;
create policy remodel_actuals_rb_read on public.remodel_actuals for select to authenticated using (true);
create policy remodel_actuals_rb_write on public.remodel_actuals for all to authenticated using (true) with check (true);

-- remodel_alerts
drop policy if exists remodel_alerts_area_read on public.remodel_alerts;
drop policy if exists remodel_alerts_area_write on public.remodel_alerts;
drop policy if exists remodel_alerts_area_ins on public.remodel_alerts;
drop policy if exists remodel_alerts_area_upd on public.remodel_alerts;
drop policy if exists remodel_alerts_area_update on public.remodel_alerts;
create policy remodel_alerts_rb_read on public.remodel_alerts for select to authenticated using (true);
create policy remodel_alerts_rb_write on public.remodel_alerts for all to authenticated using (true) with check (true);

-- remodel_at_properties
drop policy if exists remodel_at_properties_area_read on public.remodel_at_properties;
drop policy if exists remodel_at_properties_area_write on public.remodel_at_properties;
drop policy if exists remodel_at_properties_area_ins on public.remodel_at_properties;
drop policy if exists remodel_at_properties_area_upd on public.remodel_at_properties;
drop policy if exists remodel_at_properties_area_update on public.remodel_at_properties;
create policy remodel_at_properties_rb_read on public.remodel_at_properties for select to authenticated using (true);
create policy remodel_at_properties_rb_write on public.remodel_at_properties for all to authenticated using (true) with check (true);

-- remodel_budget_versions
drop policy if exists remodel_budget_versions_area_read on public.remodel_budget_versions;
drop policy if exists remodel_budget_versions_area_write on public.remodel_budget_versions;
drop policy if exists remodel_budget_versions_area_ins on public.remodel_budget_versions;
drop policy if exists remodel_budget_versions_area_upd on public.remodel_budget_versions;
drop policy if exists remodel_budget_versions_area_update on public.remodel_budget_versions;
create policy remodel_budget_versions_rb_read on public.remodel_budget_versions for select to authenticated using (true);
create policy remodel_budget_versions_rb_write on public.remodel_budget_versions for all to authenticated using (true) with check (true);

-- remodel_calendar
drop policy if exists remodel_calendar_area_read on public.remodel_calendar;
drop policy if exists remodel_calendar_area_write on public.remodel_calendar;
drop policy if exists remodel_calendar_area_ins on public.remodel_calendar;
drop policy if exists remodel_calendar_area_upd on public.remodel_calendar;
drop policy if exists remodel_calendar_area_update on public.remodel_calendar;
create policy remodel_calendar_rb_read on public.remodel_calendar for select to authenticated using (true);
create policy remodel_calendar_rb_write on public.remodel_calendar for all to authenticated using (true) with check (true);

-- remodel_catalog_items
drop policy if exists remodel_catalog_items_area_read on public.remodel_catalog_items;
drop policy if exists remodel_catalog_items_area_write on public.remodel_catalog_items;
drop policy if exists remodel_catalog_items_area_ins on public.remodel_catalog_items;
drop policy if exists remodel_catalog_items_area_upd on public.remodel_catalog_items;
drop policy if exists remodel_catalog_items_area_update on public.remodel_catalog_items;
create policy remodel_catalog_items_rb_read on public.remodel_catalog_items for select to authenticated using (true);
create policy remodel_catalog_items_rb_write on public.remodel_catalog_items for all to authenticated using (true) with check (true);

-- remodel_change_orders
drop policy if exists remodel_change_orders_area_read on public.remodel_change_orders;
drop policy if exists remodel_change_orders_area_write on public.remodel_change_orders;
drop policy if exists remodel_change_orders_area_ins on public.remodel_change_orders;
drop policy if exists remodel_change_orders_area_upd on public.remodel_change_orders;
drop policy if exists remodel_change_orders_area_update on public.remodel_change_orders;
create policy remodel_change_orders_rb_read on public.remodel_change_orders for select to authenticated using (true);
create policy remodel_change_orders_rb_write on public.remodel_change_orders for all to authenticated using (true) with check (true);

-- remodel_crew
drop policy if exists remodel_crew_area_read on public.remodel_crew;
drop policy if exists remodel_crew_area_write on public.remodel_crew;
drop policy if exists remodel_crew_area_ins on public.remodel_crew;
drop policy if exists remodel_crew_area_upd on public.remodel_crew;
drop policy if exists remodel_crew_area_update on public.remodel_crew;
create policy remodel_crew_rb_read on public.remodel_crew for select to authenticated using (true);
create policy remodel_crew_rb_write on public.remodel_crew for all to authenticated using (true) with check (true);

-- remodel_crew_assignments
drop policy if exists remodel_crew_assignments_area_read on public.remodel_crew_assignments;
drop policy if exists remodel_crew_assignments_area_write on public.remodel_crew_assignments;
drop policy if exists remodel_crew_assignments_area_ins on public.remodel_crew_assignments;
drop policy if exists remodel_crew_assignments_area_upd on public.remodel_crew_assignments;
drop policy if exists remodel_crew_assignments_area_update on public.remodel_crew_assignments;
create policy remodel_crew_assignments_rb_read on public.remodel_crew_assignments for select to authenticated using (true);
create policy remodel_crew_assignments_rb_write on public.remodel_crew_assignments for all to authenticated using (true) with check (true);

-- remodel_forecast_coef
drop policy if exists remodel_forecast_coef_area_read on public.remodel_forecast_coef;
drop policy if exists remodel_forecast_coef_area_write on public.remodel_forecast_coef;
drop policy if exists remodel_forecast_coef_area_ins on public.remodel_forecast_coef;
drop policy if exists remodel_forecast_coef_area_upd on public.remodel_forecast_coef;
drop policy if exists remodel_forecast_coef_area_update on public.remodel_forecast_coef;
create policy remodel_forecast_coef_rb_read on public.remodel_forecast_coef for select to authenticated using (true);
create policy remodel_forecast_coef_rb_write on public.remodel_forecast_coef for all to authenticated using (true) with check (true);

-- remodel_forecast_diagnoses
drop policy if exists remodel_forecast_diagnoses_area_read on public.remodel_forecast_diagnoses;
drop policy if exists remodel_forecast_diagnoses_area_write on public.remodel_forecast_diagnoses;
drop policy if exists remodel_forecast_diagnoses_area_ins on public.remodel_forecast_diagnoses;
drop policy if exists remodel_forecast_diagnoses_area_upd on public.remodel_forecast_diagnoses;
drop policy if exists remodel_forecast_diagnoses_area_update on public.remodel_forecast_diagnoses;
create policy remodel_forecast_diagnoses_rb_read on public.remodel_forecast_diagnoses for select to authenticated using (true);
create policy remodel_forecast_diagnoses_rb_write on public.remodel_forecast_diagnoses for all to authenticated using (true) with check (true);

-- remodel_forecast_params
drop policy if exists remodel_forecast_params_area_read on public.remodel_forecast_params;
drop policy if exists remodel_forecast_params_area_write on public.remodel_forecast_params;
drop policy if exists remodel_forecast_params_area_ins on public.remodel_forecast_params;
drop policy if exists remodel_forecast_params_area_upd on public.remodel_forecast_params;
drop policy if exists remodel_forecast_params_area_update on public.remodel_forecast_params;
create policy remodel_forecast_params_rb_read on public.remodel_forecast_params for select to authenticated using (true);
create policy remodel_forecast_params_rb_write on public.remodel_forecast_params for all to authenticated using (true) with check (true);

-- remodel_forecasts
drop policy if exists remodel_forecasts_area_read on public.remodel_forecasts;
drop policy if exists remodel_forecasts_area_write on public.remodel_forecasts;
drop policy if exists remodel_forecasts_area_ins on public.remodel_forecasts;
drop policy if exists remodel_forecasts_area_upd on public.remodel_forecasts;
drop policy if exists remodel_forecasts_area_update on public.remodel_forecasts;
create policy remodel_forecasts_rb_read on public.remodel_forecasts for select to authenticated using (true);
create policy remodel_forecasts_rb_write on public.remodel_forecasts for all to authenticated using (true) with check (true);

-- remodel_house_sqft
drop policy if exists remodel_house_sqft_area_read on public.remodel_house_sqft;
drop policy if exists remodel_house_sqft_area_write on public.remodel_house_sqft;
drop policy if exists remodel_house_sqft_area_ins on public.remodel_house_sqft;
drop policy if exists remodel_house_sqft_area_upd on public.remodel_house_sqft;
drop policy if exists remodel_house_sqft_area_update on public.remodel_house_sqft;
create policy remodel_house_sqft_rb_read on public.remodel_house_sqft for select to authenticated using (true);
create policy remodel_house_sqft_rb_write on public.remodel_house_sqft for all to authenticated using (true) with check (true);

-- remodel_inspections
drop policy if exists remodel_inspections_area_read on public.remodel_inspections;
drop policy if exists remodel_inspections_area_write on public.remodel_inspections;
drop policy if exists remodel_inspections_area_ins on public.remodel_inspections;
drop policy if exists remodel_inspections_area_upd on public.remodel_inspections;
drop policy if exists remodel_inspections_area_update on public.remodel_inspections;
create policy remodel_inspections_rb_read on public.remodel_inspections for select to authenticated using (true);
create policy remodel_inspections_rb_write on public.remodel_inspections for all to authenticated using (true) with check (true);

-- remodel_milestones
drop policy if exists remodel_milestones_area_read on public.remodel_milestones;
drop policy if exists remodel_milestones_area_write on public.remodel_milestones;
drop policy if exists remodel_milestones_area_ins on public.remodel_milestones;
drop policy if exists remodel_milestones_area_upd on public.remodel_milestones;
drop policy if exists remodel_milestones_area_update on public.remodel_milestones;
create policy remodel_milestones_rb_read on public.remodel_milestones for select to authenticated using (true);
create policy remodel_milestones_rb_write on public.remodel_milestones for all to authenticated using (true) with check (true);

-- remodel_project_resources
drop policy if exists remodel_project_resources_area_read on public.remodel_project_resources;
drop policy if exists remodel_project_resources_area_write on public.remodel_project_resources;
drop policy if exists remodel_project_resources_area_ins on public.remodel_project_resources;
drop policy if exists remodel_project_resources_area_upd on public.remodel_project_resources;
drop policy if exists remodel_project_resources_area_update on public.remodel_project_resources;
create policy remodel_project_resources_rb_read on public.remodel_project_resources for select to authenticated using (true);
create policy remodel_project_resources_rb_write on public.remodel_project_resources for all to authenticated using (true) with check (true);

-- remodel_projects
drop policy if exists remodel_projects_area_read on public.remodel_projects;
drop policy if exists remodel_projects_area_write on public.remodel_projects;
drop policy if exists remodel_projects_area_ins on public.remodel_projects;
drop policy if exists remodel_projects_area_upd on public.remodel_projects;
drop policy if exists remodel_projects_area_update on public.remodel_projects;
create policy remodel_projects_rb_read on public.remodel_projects for select to authenticated using (true);
create policy remodel_projects_rb_write on public.remodel_projects for all to authenticated using (true) with check (true);

-- remodel_punch_list
drop policy if exists remodel_punch_list_area_read on public.remodel_punch_list;
drop policy if exists remodel_punch_list_area_write on public.remodel_punch_list;
drop policy if exists remodel_punch_list_area_ins on public.remodel_punch_list;
drop policy if exists remodel_punch_list_area_upd on public.remodel_punch_list;
drop policy if exists remodel_punch_list_area_update on public.remodel_punch_list;
create policy remodel_punch_list_rb_read on public.remodel_punch_list for select to authenticated using (true);
create policy remodel_punch_list_rb_write on public.remodel_punch_list for all to authenticated using (true) with check (true);

-- remodel_required_actions
drop policy if exists remodel_required_actions_area_read on public.remodel_required_actions;
drop policy if exists remodel_required_actions_area_write on public.remodel_required_actions;
drop policy if exists remodel_required_actions_area_ins on public.remodel_required_actions;
drop policy if exists remodel_required_actions_area_upd on public.remodel_required_actions;
drop policy if exists remodel_required_actions_area_update on public.remodel_required_actions;
create policy remodel_required_actions_rb_read on public.remodel_required_actions for select to authenticated using (true);
create policy remodel_required_actions_rb_write on public.remodel_required_actions for all to authenticated using (true) with check (true);

-- remodel_snapshots
drop policy if exists remodel_snapshots_area_read on public.remodel_snapshots;
drop policy if exists remodel_snapshots_area_write on public.remodel_snapshots;
drop policy if exists remodel_snapshots_area_ins on public.remodel_snapshots;
drop policy if exists remodel_snapshots_area_upd on public.remodel_snapshots;
drop policy if exists remodel_snapshots_area_update on public.remodel_snapshots;
create policy remodel_snapshots_rb_read on public.remodel_snapshots for select to authenticated using (true);
create policy remodel_snapshots_rb_write on public.remodel_snapshots for all to authenticated using (true) with check (true);

-- remodel_supplier_prices
drop policy if exists remodel_supplier_prices_area_read on public.remodel_supplier_prices;
drop policy if exists remodel_supplier_prices_area_write on public.remodel_supplier_prices;
drop policy if exists remodel_supplier_prices_area_ins on public.remodel_supplier_prices;
drop policy if exists remodel_supplier_prices_area_upd on public.remodel_supplier_prices;
drop policy if exists remodel_supplier_prices_area_update on public.remodel_supplier_prices;
create policy remodel_supplier_prices_rb_read on public.remodel_supplier_prices for select to authenticated using (true);
create policy remodel_supplier_prices_rb_write on public.remodel_supplier_prices for all to authenticated using (true) with check (true);

-- remodel_suppliers
drop policy if exists remodel_suppliers_area_read on public.remodel_suppliers;
drop policy if exists remodel_suppliers_area_write on public.remodel_suppliers;
drop policy if exists remodel_suppliers_area_ins on public.remodel_suppliers;
drop policy if exists remodel_suppliers_area_upd on public.remodel_suppliers;
drop policy if exists remodel_suppliers_area_update on public.remodel_suppliers;
create policy remodel_suppliers_rb_read on public.remodel_suppliers for select to authenticated using (true);
create policy remodel_suppliers_rb_write on public.remodel_suppliers for all to authenticated using (true) with check (true);

-- remodel_sync_log
drop policy if exists remodel_sync_log_area_read on public.remodel_sync_log;
drop policy if exists remodel_sync_log_area_write on public.remodel_sync_log;
drop policy if exists remodel_sync_log_area_ins on public.remodel_sync_log;
drop policy if exists remodel_sync_log_area_upd on public.remodel_sync_log;
drop policy if exists remodel_sync_log_area_update on public.remodel_sync_log;
create policy remodel_sync_log_rb_read on public.remodel_sync_log for select to authenticated using (true);
create policy remodel_sync_log_rb_write on public.remodel_sync_log for all to authenticated using (true) with check (true);

-- remodel_vendor_invoices
drop policy if exists remodel_vendor_invoices_area_read on public.remodel_vendor_invoices;
drop policy if exists remodel_vendor_invoices_area_write on public.remodel_vendor_invoices;
drop policy if exists remodel_vendor_invoices_area_ins on public.remodel_vendor_invoices;
drop policy if exists remodel_vendor_invoices_area_upd on public.remodel_vendor_invoices;
drop policy if exists remodel_vendor_invoices_area_update on public.remodel_vendor_invoices;
create policy remodel_vendor_invoices_rb_read on public.remodel_vendor_invoices for select to authenticated using (true);
create policy remodel_vendor_invoices_rb_write on public.remodel_vendor_invoices for all to authenticated using (true) with check (true);

-- remodel_weekly_insights
drop policy if exists remodel_weekly_insights_area_read on public.remodel_weekly_insights;
drop policy if exists remodel_weekly_insights_area_write on public.remodel_weekly_insights;
drop policy if exists remodel_weekly_insights_area_ins on public.remodel_weekly_insights;
drop policy if exists remodel_weekly_insights_area_upd on public.remodel_weekly_insights;
drop policy if exists remodel_weekly_insights_area_update on public.remodel_weekly_insights;
create policy remodel_weekly_insights_rb_read on public.remodel_weekly_insights for select to authenticated using (true);
create policy remodel_weekly_insights_rb_write on public.remodel_weekly_insights for all to authenticated using (true) with check (true);

-- weekly_activities
drop policy if exists weekly_activities_area_read on public.weekly_activities;
drop policy if exists weekly_activities_area_write on public.weekly_activities;
drop policy if exists weekly_activities_area_ins on public.weekly_activities;
drop policy if exists weekly_activities_area_upd on public.weekly_activities;
drop policy if exists weekly_activities_area_update on public.weekly_activities;
create policy weekly_activities_rb_read on public.weekly_activities for select to authenticated using (true);
create policy weekly_activities_rb_write on public.weekly_activities for all to authenticated using (true) with check (true);

-- weekly_activity_moves
drop policy if exists weekly_activity_moves_area_read on public.weekly_activity_moves;
drop policy if exists weekly_activity_moves_area_write on public.weekly_activity_moves;
drop policy if exists weekly_activity_moves_area_ins on public.weekly_activity_moves;
drop policy if exists weekly_activity_moves_area_upd on public.weekly_activity_moves;
drop policy if exists weekly_activity_moves_area_update on public.weekly_activity_moves;
create policy weekly_activity_moves_rb_read on public.weekly_activity_moves for select to authenticated using (true);
create policy weekly_activity_moves_rb_write on public.weekly_activity_moves for all to authenticated using (true) with check (true);

-- wp_day_templates
drop policy if exists wp_day_templates_area_read on public.wp_day_templates;
drop policy if exists wp_day_templates_area_write on public.wp_day_templates;
drop policy if exists wp_day_templates_area_ins on public.wp_day_templates;
drop policy if exists wp_day_templates_area_upd on public.wp_day_templates;
drop policy if exists wp_day_templates_area_update on public.wp_day_templates;
create policy wp_day_templates_rb_read on public.wp_day_templates for select to authenticated using (true);
create policy wp_day_templates_rb_write on public.wp_day_templates for all to authenticated using (true) with check (true);

-- wp_recurring
drop policy if exists wp_recurring_area_read on public.wp_recurring;
drop policy if exists wp_recurring_area_write on public.wp_recurring;
drop policy if exists wp_recurring_area_ins on public.wp_recurring;
drop policy if exists wp_recurring_area_upd on public.wp_recurring;
drop policy if exists wp_recurring_area_update on public.wp_recurring;
create policy wp_recurring_rb_read on public.wp_recurring for select to authenticated using (true);
create policy wp_recurring_rb_write on public.wp_recurring for all to authenticated using (true) with check (true);

-- wp_task_templates
drop policy if exists wp_task_templates_area_read on public.wp_task_templates;
drop policy if exists wp_task_templates_area_write on public.wp_task_templates;
drop policy if exists wp_task_templates_area_ins on public.wp_task_templates;
drop policy if exists wp_task_templates_area_upd on public.wp_task_templates;
drop policy if exists wp_task_templates_area_update on public.wp_task_templates;
create policy wp_task_templates_rb_read on public.wp_task_templates for select to authenticated using (true);
create policy wp_task_templates_rb_write on public.wp_task_templates for all to authenticated using (true) with check (true);

-- remodel_calibration_houses
drop policy if exists remodel_calibration_houses_area_read on public.remodel_calibration_houses;
drop policy if exists remodel_calibration_houses_area_write on public.remodel_calibration_houses;
drop policy if exists remodel_calibration_houses_area_ins on public.remodel_calibration_houses;
drop policy if exists remodel_calibration_houses_area_upd on public.remodel_calibration_houses;
drop policy if exists remodel_calibration_houses_area_update on public.remodel_calibration_houses;
create policy remodel_calibration_houses_rb_read on public.remodel_calibration_houses for select to authenticated using (true);

-- remodel_crew_rates
drop policy if exists remodel_crew_rates_area_read on public.remodel_crew_rates;
drop policy if exists remodel_crew_rates_area_write on public.remodel_crew_rates;
drop policy if exists remodel_crew_rates_area_ins on public.remodel_crew_rates;
drop policy if exists remodel_crew_rates_area_upd on public.remodel_crew_rates;
drop policy if exists remodel_crew_rates_area_update on public.remodel_crew_rates;
create policy remodel_crew_rates_rb_read on public.remodel_crew_rates for select to authenticated using (true);

-- remodel_okrs
drop policy if exists remodel_okrs_area_read on public.remodel_okrs;
drop policy if exists remodel_okrs_area_write on public.remodel_okrs;
drop policy if exists remodel_okrs_area_ins on public.remodel_okrs;
drop policy if exists remodel_okrs_area_upd on public.remodel_okrs;
drop policy if exists remodel_okrs_area_update on public.remodel_okrs;
create policy remodel_okrs_rb_read on public.remodel_okrs for select to authenticated using (true);

-- remodel_overhead
drop policy if exists remodel_overhead_area_read on public.remodel_overhead;
drop policy if exists remodel_overhead_area_write on public.remodel_overhead;
drop policy if exists remodel_overhead_area_ins on public.remodel_overhead;
drop policy if exists remodel_overhead_area_upd on public.remodel_overhead;
drop policy if exists remodel_overhead_area_update on public.remodel_overhead;
create policy remodel_overhead_rb_read on public.remodel_overhead for select to authenticated using (true);

-- remodel_sync_parity
drop policy if exists remodel_sync_parity_area_read on public.remodel_sync_parity;
drop policy if exists remodel_sync_parity_area_write on public.remodel_sync_parity;
drop policy if exists remodel_sync_parity_area_ins on public.remodel_sync_parity;
drop policy if exists remodel_sync_parity_area_upd on public.remodel_sync_parity;
drop policy if exists remodel_sync_parity_area_update on public.remodel_sync_parity;
create policy remodel_sync_parity_rb_read on public.remodel_sync_parity for select to authenticated using (true);

-- remodel_worker_hours
drop policy if exists remodel_worker_hours_area_read on public.remodel_worker_hours;
drop policy if exists remodel_worker_hours_area_write on public.remodel_worker_hours;
drop policy if exists remodel_worker_hours_area_ins on public.remodel_worker_hours;
drop policy if exists remodel_worker_hours_area_upd on public.remodel_worker_hours;
drop policy if exists remodel_worker_hours_area_update on public.remodel_worker_hours;
create policy remodel_worker_hours_rb_read on public.remodel_worker_hours for select to authenticated using (true);

-- remodel_material_payments
drop policy if exists remodel_material_payments_area_read on public.remodel_material_payments;
drop policy if exists remodel_material_payments_area_write on public.remodel_material_payments;
drop policy if exists remodel_material_payments_area_ins on public.remodel_material_payments;
drop policy if exists remodel_material_payments_area_upd on public.remodel_material_payments;
drop policy if exists remodel_material_payments_area_update on public.remodel_material_payments;
create policy remodel_material_payments_rb_read on public.remodel_material_payments for select to anon, authenticated using (true);

-- remodel_payroll_receipts
drop policy if exists remodel_payroll_receipts_area_read on public.remodel_payroll_receipts;
drop policy if exists remodel_payroll_receipts_area_write on public.remodel_payroll_receipts;
drop policy if exists remodel_payroll_receipts_area_ins on public.remodel_payroll_receipts;
drop policy if exists remodel_payroll_receipts_area_upd on public.remodel_payroll_receipts;
drop policy if exists remodel_payroll_receipts_area_update on public.remodel_payroll_receipts;
create policy remodel_payroll_receipts_rb_read on public.remodel_payroll_receipts for select to authenticated using (true);
create policy remodel_payroll_receipts_rb_ins on public.remodel_payroll_receipts for insert to authenticated with check (true);
create policy remodel_payroll_receipts_rb_upd on public.remodel_payroll_receipts for update to authenticated using (true) with check (true);

-- pm_properties
drop policy if exists pm_properties_area_read on public.pm_properties;
drop policy if exists pm_properties_area_write on public.pm_properties;
drop policy if exists pm_properties_area_ins on public.pm_properties;
drop policy if exists pm_properties_area_upd on public.pm_properties;
drop policy if exists pm_properties_area_update on public.pm_properties;
create policy pm_properties_rb_read on public.pm_properties for select to authenticated using (true);
create policy pm_properties_rb_write on public.pm_properties for all to authenticated using (true) with check (true);

-- pm_units
drop policy if exists pm_units_area_read on public.pm_units;
drop policy if exists pm_units_area_write on public.pm_units;
drop policy if exists pm_units_area_ins on public.pm_units;
drop policy if exists pm_units_area_upd on public.pm_units;
drop policy if exists pm_units_area_update on public.pm_units;
create policy pm_units_rb_read on public.pm_units for select to authenticated using (true);
create policy pm_units_rb_write on public.pm_units for all to authenticated using (true) with check (true);

-- pm_tenants
drop policy if exists pm_tenants_area_read on public.pm_tenants;
drop policy if exists pm_tenants_area_write on public.pm_tenants;
drop policy if exists pm_tenants_area_ins on public.pm_tenants;
drop policy if exists pm_tenants_area_upd on public.pm_tenants;
drop policy if exists pm_tenants_area_update on public.pm_tenants;
create policy pm_tenants_rb_read on public.pm_tenants for select to authenticated using (true);
create policy pm_tenants_rb_write on public.pm_tenants for all to authenticated using (true) with check (true);

-- pm_bookings
drop policy if exists pm_bookings_area_read on public.pm_bookings;
drop policy if exists pm_bookings_area_write on public.pm_bookings;
drop policy if exists pm_bookings_area_ins on public.pm_bookings;
drop policy if exists pm_bookings_area_upd on public.pm_bookings;
drop policy if exists pm_bookings_area_update on public.pm_bookings;
create policy pm_bookings_rb_read on public.pm_bookings for select to authenticated using (true);
create policy pm_bookings_rb_write on public.pm_bookings for all to authenticated using (true) with check (true);

-- pm_booking_history
drop policy if exists pm_booking_history_area_read on public.pm_booking_history;
drop policy if exists pm_booking_history_area_write on public.pm_booking_history;
drop policy if exists pm_booking_history_area_ins on public.pm_booking_history;
drop policy if exists pm_booking_history_area_upd on public.pm_booking_history;
drop policy if exists pm_booking_history_area_update on public.pm_booking_history;
create policy pm_booking_history_rb_read on public.pm_booking_history for select to authenticated using (true);
create policy pm_booking_history_rb_write on public.pm_booking_history for all to authenticated using (true) with check (true);

-- pm_payments
drop policy if exists pm_payments_area_read on public.pm_payments;
drop policy if exists pm_payments_area_write on public.pm_payments;
drop policy if exists pm_payments_area_ins on public.pm_payments;
drop policy if exists pm_payments_area_upd on public.pm_payments;
drop policy if exists pm_payments_area_update on public.pm_payments;
create policy pm_payments_rb_read on public.pm_payments for select to authenticated using (true);
create policy pm_payments_rb_write on public.pm_payments for all to authenticated using (true) with check (true);

-- pm_credentials
drop policy if exists pm_credentials_area_read on public.pm_credentials;
drop policy if exists pm_credentials_area_write on public.pm_credentials;
drop policy if exists pm_credentials_area_ins on public.pm_credentials;
drop policy if exists pm_credentials_area_upd on public.pm_credentials;
drop policy if exists pm_credentials_area_update on public.pm_credentials;
create policy pm_credentials_rb_read on public.pm_credentials for select to authenticated using (true);
create policy pm_credentials_rb_write on public.pm_credentials for all to authenticated using (true) with check (true);

-- pm_tasks
drop policy if exists pm_tasks_area_read on public.pm_tasks;
drop policy if exists pm_tasks_area_write on public.pm_tasks;
drop policy if exists pm_tasks_area_ins on public.pm_tasks;
drop policy if exists pm_tasks_area_upd on public.pm_tasks;
drop policy if exists pm_tasks_area_update on public.pm_tasks;
create policy pm_tasks_rb_read on public.pm_tasks for select to authenticated using (true);
create policy pm_tasks_rb_write on public.pm_tasks for all to authenticated using (true) with check (true);

-- pm_alerts
drop policy if exists pm_alerts_area_read on public.pm_alerts;
drop policy if exists pm_alerts_area_write on public.pm_alerts;
drop policy if exists pm_alerts_area_ins on public.pm_alerts;
drop policy if exists pm_alerts_area_upd on public.pm_alerts;
drop policy if exists pm_alerts_area_update on public.pm_alerts;
create policy pm_alerts_rb_read on public.pm_alerts for select to authenticated using (true);
create policy pm_alerts_rb_write on public.pm_alerts for all to authenticated using (true) with check (true);

-- pm_data_warnings
drop policy if exists pm_data_warnings_area_read on public.pm_data_warnings;
drop policy if exists pm_data_warnings_area_write on public.pm_data_warnings;
drop policy if exists pm_data_warnings_area_ins on public.pm_data_warnings;
drop policy if exists pm_data_warnings_area_upd on public.pm_data_warnings;
drop policy if exists pm_data_warnings_area_update on public.pm_data_warnings;
create policy pm_data_warnings_rb_read on public.pm_data_warnings for select to authenticated using (true);
create policy pm_data_warnings_rb_write on public.pm_data_warnings for all to authenticated using (true) with check (true);

-- pm_calendar_feeds
drop policy if exists pm_calendar_feeds_area_read on public.pm_calendar_feeds;
drop policy if exists pm_calendar_feeds_area_write on public.pm_calendar_feeds;
drop policy if exists pm_calendar_feeds_area_ins on public.pm_calendar_feeds;
drop policy if exists pm_calendar_feeds_area_upd on public.pm_calendar_feeds;
drop policy if exists pm_calendar_feeds_area_update on public.pm_calendar_feeds;
create policy pm_calendar_feeds_rb_read on public.pm_calendar_feeds for select to authenticated using (true);
create policy pm_calendar_feeds_rb_write on public.pm_calendar_feeds for all to authenticated using (true) with check (true);

-- pm_interactions
drop policy if exists pm_interactions_area_read on public.pm_interactions;
drop policy if exists pm_interactions_area_write on public.pm_interactions;
drop policy if exists pm_interactions_area_ins on public.pm_interactions;
drop policy if exists pm_interactions_area_upd on public.pm_interactions;
drop policy if exists pm_interactions_area_update on public.pm_interactions;
create policy pm_interactions_rb_read on public.pm_interactions for select to authenticated using (true);
create policy pm_interactions_rb_write on public.pm_interactions for all to authenticated using (true) with check (true);

-- pm_message_templates
drop policy if exists pm_message_templates_area_read on public.pm_message_templates;
drop policy if exists pm_message_templates_area_write on public.pm_message_templates;
drop policy if exists pm_message_templates_area_ins on public.pm_message_templates;
drop policy if exists pm_message_templates_area_upd on public.pm_message_templates;
drop policy if exists pm_message_templates_area_update on public.pm_message_templates;
create policy pm_message_templates_rb_read on public.pm_message_templates for select to authenticated using (true);
create policy pm_message_templates_rb_write on public.pm_message_templates for all to authenticated using (true) with check (true);

-- pm_sync_log
drop policy if exists pm_sync_log_area_read on public.pm_sync_log;
drop policy if exists pm_sync_log_area_write on public.pm_sync_log;
drop policy if exists pm_sync_log_area_ins on public.pm_sync_log;
drop policy if exists pm_sync_log_area_upd on public.pm_sync_log;
drop policy if exists pm_sync_log_area_update on public.pm_sync_log;
create policy pm_sync_log_rb_read on public.pm_sync_log for select to authenticated using (true);
create policy pm_sync_log_rb_write on public.pm_sync_log for all to authenticated using (true) with check (true);

-- pm_utilities
drop policy if exists pm_utilities_area_read on public.pm_utilities;
drop policy if exists pm_utilities_area_write on public.pm_utilities;
drop policy if exists pm_utilities_area_ins on public.pm_utilities;
drop policy if exists pm_utilities_area_upd on public.pm_utilities;
drop policy if exists pm_utilities_area_update on public.pm_utilities;
create policy pm_utilities_rb_read on public.pm_utilities for select to authenticated using (true);
create policy pm_utilities_rb_write on public.pm_utilities for all to authenticated using (true) with check (true);

-- pm_brain_memory
drop policy if exists pm_brain_memory_area_read on public.pm_brain_memory;
drop policy if exists pm_brain_memory_area_write on public.pm_brain_memory;
drop policy if exists pm_brain_memory_area_ins on public.pm_brain_memory;
drop policy if exists pm_brain_memory_area_upd on public.pm_brain_memory;
drop policy if exists pm_brain_memory_area_update on public.pm_brain_memory;
create policy pm_brain_memory_rb_read on public.pm_brain_memory for select to authenticated using (true);
create policy pm_brain_memory_rb_write on public.pm_brain_memory for all to authenticated using (true) with check (true);

-- pm_brain_chat
drop policy if exists pm_brain_chat_area_read on public.pm_brain_chat;
drop policy if exists pm_brain_chat_area_write on public.pm_brain_chat;
drop policy if exists pm_brain_chat_area_ins on public.pm_brain_chat;
drop policy if exists pm_brain_chat_area_upd on public.pm_brain_chat;
drop policy if exists pm_brain_chat_area_update on public.pm_brain_chat;
create policy pm_brain_chat_rb_read on public.pm_brain_chat for select to authenticated using (true);
create policy pm_brain_chat_rb_write on public.pm_brain_chat for all to authenticated using (true) with check (true);

-- pm_whatsapp_config
drop policy if exists pm_whatsapp_config_area_read on public.pm_whatsapp_config;
drop policy if exists pm_whatsapp_config_area_write on public.pm_whatsapp_config;
drop policy if exists pm_whatsapp_config_area_ins on public.pm_whatsapp_config;
drop policy if exists pm_whatsapp_config_area_upd on public.pm_whatsapp_config;
drop policy if exists pm_whatsapp_config_area_update on public.pm_whatsapp_config;
create policy pm_whatsapp_config_rb_read on public.pm_whatsapp_config for select to authenticated using (true);
create policy pm_whatsapp_config_rb_write on public.pm_whatsapp_config for all to authenticated using (true) with check (true);

-- pm_whatsapp_messages
drop policy if exists pm_whatsapp_messages_area_read on public.pm_whatsapp_messages;
drop policy if exists pm_whatsapp_messages_area_write on public.pm_whatsapp_messages;
drop policy if exists pm_whatsapp_messages_area_ins on public.pm_whatsapp_messages;
drop policy if exists pm_whatsapp_messages_area_upd on public.pm_whatsapp_messages;
drop policy if exists pm_whatsapp_messages_area_update on public.pm_whatsapp_messages;
create policy pm_whatsapp_messages_rb_read on public.pm_whatsapp_messages for select to authenticated using (true);
create policy pm_whatsapp_messages_rb_write on public.pm_whatsapp_messages for all to authenticated using (true) with check (true);

-- pm_whatsapp_recipients
drop policy if exists pm_whatsapp_recipients_area_read on public.pm_whatsapp_recipients;
drop policy if exists pm_whatsapp_recipients_area_write on public.pm_whatsapp_recipients;
drop policy if exists pm_whatsapp_recipients_area_ins on public.pm_whatsapp_recipients;
drop policy if exists pm_whatsapp_recipients_area_upd on public.pm_whatsapp_recipients;
drop policy if exists pm_whatsapp_recipients_area_update on public.pm_whatsapp_recipients;
create policy pm_whatsapp_recipients_rb_read on public.pm_whatsapp_recipients for select to authenticated using (true);
create policy pm_whatsapp_recipients_rb_write on public.pm_whatsapp_recipients for all to authenticated using (true) with check (true);

-- pm_companies
drop policy if exists pm_companies_area_read on public.pm_companies;
drop policy if exists pm_companies_area_write on public.pm_companies;
drop policy if exists pm_companies_area_ins on public.pm_companies;
drop policy if exists pm_companies_area_upd on public.pm_companies;
drop policy if exists pm_companies_area_update on public.pm_companies;
create policy pm_companies_rb_read on public.pm_companies for select to authenticated using (true);
create policy pm_companies_rb_write on public.pm_companies for all to authenticated using (true) with check (true);

-- pm_okrs
drop policy if exists pm_okrs_area_read on public.pm_okrs;
drop policy if exists pm_okrs_area_write on public.pm_okrs;
drop policy if exists pm_okrs_area_ins on public.pm_okrs;
drop policy if exists pm_okrs_area_upd on public.pm_okrs;
drop policy if exists pm_okrs_area_update on public.pm_okrs;
create policy pm_okrs_rb_read on public.pm_okrs for select to authenticated using (true);
create policy pm_okrs_rb_write on public.pm_okrs for all to authenticated using (true) with check (true);

-- pm_okr_progress
drop policy if exists pm_okr_progress_area_read on public.pm_okr_progress;
drop policy if exists pm_okr_progress_area_write on public.pm_okr_progress;
drop policy if exists pm_okr_progress_area_ins on public.pm_okr_progress;
drop policy if exists pm_okr_progress_area_upd on public.pm_okr_progress;
drop policy if exists pm_okr_progress_area_update on public.pm_okr_progress;
create policy pm_okr_progress_rb_read on public.pm_okr_progress for select to authenticated using (true);
create policy pm_okr_progress_rb_write on public.pm_okr_progress for all to authenticated using (true) with check (true);

-- pm_one_on_ones
drop policy if exists pm_one_on_ones_area_read on public.pm_one_on_ones;
drop policy if exists pm_one_on_ones_area_write on public.pm_one_on_ones;
drop policy if exists pm_one_on_ones_area_ins on public.pm_one_on_ones;
drop policy if exists pm_one_on_ones_area_upd on public.pm_one_on_ones;
drop policy if exists pm_one_on_ones_area_update on public.pm_one_on_ones;
create policy pm_one_on_ones_rb_read on public.pm_one_on_ones for select to authenticated using (true);
create policy pm_one_on_ones_rb_write on public.pm_one_on_ones for all to authenticated using (true) with check (true);

-- pm_risks
drop policy if exists pm_risks_area_read on public.pm_risks;
drop policy if exists pm_risks_area_write on public.pm_risks;
drop policy if exists pm_risks_area_ins on public.pm_risks;
drop policy if exists pm_risks_area_upd on public.pm_risks;
drop policy if exists pm_risks_area_update on public.pm_risks;
create policy pm_risks_rb_read on public.pm_risks for select to authenticated using (true);
create policy pm_risks_rb_write on public.pm_risks for all to authenticated using (true) with check (true);

-- pm_performance_weekly
drop policy if exists pm_performance_weekly_area_read on public.pm_performance_weekly;
drop policy if exists pm_performance_weekly_area_write on public.pm_performance_weekly;
drop policy if exists pm_performance_weekly_area_ins on public.pm_performance_weekly;
drop policy if exists pm_performance_weekly_area_upd on public.pm_performance_weekly;
drop policy if exists pm_performance_weekly_area_update on public.pm_performance_weekly;
create policy pm_performance_weekly_rb_read on public.pm_performance_weekly for select to authenticated using (true);
create policy pm_performance_weekly_rb_write on public.pm_performance_weekly for all to authenticated using (true) with check (true);

-- pm_coaching_prompts
drop policy if exists pm_coaching_prompts_area_read on public.pm_coaching_prompts;
drop policy if exists pm_coaching_prompts_area_write on public.pm_coaching_prompts;
drop policy if exists pm_coaching_prompts_area_ins on public.pm_coaching_prompts;
drop policy if exists pm_coaching_prompts_area_upd on public.pm_coaching_prompts;
drop policy if exists pm_coaching_prompts_area_update on public.pm_coaching_prompts;
create policy pm_coaching_prompts_rb_read on public.pm_coaching_prompts for select to authenticated using (true);
create policy pm_coaching_prompts_rb_write on public.pm_coaching_prompts for all to authenticated using (true) with check (true);

-- pm_daily_assignments
drop policy if exists pm_daily_assignments_area_read on public.pm_daily_assignments;
drop policy if exists pm_daily_assignments_area_write on public.pm_daily_assignments;
drop policy if exists pm_daily_assignments_area_ins on public.pm_daily_assignments;
drop policy if exists pm_daily_assignments_area_upd on public.pm_daily_assignments;
drop policy if exists pm_daily_assignments_area_update on public.pm_daily_assignments;
create policy pm_daily_assignments_rb_read on public.pm_daily_assignments for select to authenticated using (true);
create policy pm_daily_assignments_rb_write on public.pm_daily_assignments for all to authenticated using (true) with check (true);

-- pm_executive_reports
drop policy if exists pm_executive_reports_area_read on public.pm_executive_reports;
drop policy if exists pm_executive_reports_area_write on public.pm_executive_reports;
drop policy if exists pm_executive_reports_area_ins on public.pm_executive_reports;
drop policy if exists pm_executive_reports_area_upd on public.pm_executive_reports;
drop policy if exists pm_executive_reports_area_update on public.pm_executive_reports;
create policy pm_executive_reports_rb_read on public.pm_executive_reports for select to authenticated using (true);
create policy pm_executive_reports_rb_write on public.pm_executive_reports for all to authenticated using (true) with check (true);

-- pm_compliance_items
drop policy if exists pm_compliance_items_area_read on public.pm_compliance_items;
drop policy if exists pm_compliance_items_area_write on public.pm_compliance_items;
drop policy if exists pm_compliance_items_area_ins on public.pm_compliance_items;
drop policy if exists pm_compliance_items_area_upd on public.pm_compliance_items;
drop policy if exists pm_compliance_items_area_update on public.pm_compliance_items;
create policy pm_compliance_items_rb_read on public.pm_compliance_items for select to authenticated using (true);
create policy pm_compliance_items_rb_write on public.pm_compliance_items for all to authenticated using (true) with check (true);

-- pm_dependencies_cross
drop policy if exists pm_dependencies_cross_area_read on public.pm_dependencies_cross;
drop policy if exists pm_dependencies_cross_area_write on public.pm_dependencies_cross;
drop policy if exists pm_dependencies_cross_area_ins on public.pm_dependencies_cross;
drop policy if exists pm_dependencies_cross_area_upd on public.pm_dependencies_cross;
drop policy if exists pm_dependencies_cross_area_update on public.pm_dependencies_cross;
create policy pm_dependencies_cross_rb_read on public.pm_dependencies_cross for select to authenticated using (true);
create policy pm_dependencies_cross_rb_write on public.pm_dependencies_cross for all to authenticated using (true) with check (true);

-- clickup_action_log
drop policy if exists clickup_action_log_area_read on public.clickup_action_log;
drop policy if exists clickup_action_log_area_write on public.clickup_action_log;
drop policy if exists clickup_action_log_area_ins on public.clickup_action_log;
drop policy if exists clickup_action_log_area_upd on public.clickup_action_log;
drop policy if exists clickup_action_log_area_update on public.clickup_action_log;
create policy clickup_action_log_rb_read on public.clickup_action_log for select to authenticated using (true);
create policy clickup_action_log_rb_write on public.clickup_action_log for all to authenticated using (true) with check (true);

-- clickup_ai_proposals
drop policy if exists clickup_ai_proposals_area_read on public.clickup_ai_proposals;
drop policy if exists clickup_ai_proposals_area_write on public.clickup_ai_proposals;
drop policy if exists clickup_ai_proposals_area_ins on public.clickup_ai_proposals;
drop policy if exists clickup_ai_proposals_area_upd on public.clickup_ai_proposals;
drop policy if exists clickup_ai_proposals_area_update on public.clickup_ai_proposals;
create policy clickup_ai_proposals_rb_read on public.clickup_ai_proposals for select to authenticated using (true);
create policy clickup_ai_proposals_rb_write on public.clickup_ai_proposals for all to authenticated using (true) with check (true);

-- clickup_alerts
drop policy if exists clickup_alerts_area_read on public.clickup_alerts;
drop policy if exists clickup_alerts_area_write on public.clickup_alerts;
drop policy if exists clickup_alerts_area_ins on public.clickup_alerts;
drop policy if exists clickup_alerts_area_upd on public.clickup_alerts;
drop policy if exists clickup_alerts_area_update on public.clickup_alerts;
create policy clickup_alerts_rb_read on public.clickup_alerts for select to authenticated using (true);
create policy clickup_alerts_rb_write on public.clickup_alerts for all to authenticated using (true) with check (true);

-- clickup_automations
drop policy if exists clickup_automations_area_read on public.clickup_automations;
drop policy if exists clickup_automations_area_write on public.clickup_automations;
drop policy if exists clickup_automations_area_ins on public.clickup_automations;
drop policy if exists clickup_automations_area_upd on public.clickup_automations;
drop policy if exists clickup_automations_area_update on public.clickup_automations;
create policy clickup_automations_rb_read on public.clickup_automations for select to authenticated using (true);
create policy clickup_automations_rb_write on public.clickup_automations for all to authenticated using (true) with check (true);

-- clickup_sync_log
drop policy if exists clickup_sync_log_area_read on public.clickup_sync_log;
drop policy if exists clickup_sync_log_area_write on public.clickup_sync_log;
drop policy if exists clickup_sync_log_area_ins on public.clickup_sync_log;
drop policy if exists clickup_sync_log_area_upd on public.clickup_sync_log;
drop policy if exists clickup_sync_log_area_update on public.clickup_sync_log;
create policy clickup_sync_log_rb_read on public.clickup_sync_log for select to authenticated using (true);
create policy clickup_sync_log_rb_write on public.clickup_sync_log for all to authenticated using (true) with check (true);

-- clickup_weekly_insights
drop policy if exists clickup_weekly_insights_area_read on public.clickup_weekly_insights;
drop policy if exists clickup_weekly_insights_area_write on public.clickup_weekly_insights;
drop policy if exists clickup_weekly_insights_area_ins on public.clickup_weekly_insights;
drop policy if exists clickup_weekly_insights_area_upd on public.clickup_weekly_insights;
drop policy if exists clickup_weekly_insights_area_update on public.clickup_weekly_insights;
create policy clickup_weekly_insights_rb_read on public.clickup_weekly_insights for select to authenticated using (true);
create policy clickup_weekly_insights_rb_write on public.clickup_weekly_insights for all to authenticated using (true) with check (true);

-- clickup_snapshots
drop policy if exists clickup_snapshots_area_read on public.clickup_snapshots;
drop policy if exists clickup_snapshots_area_write on public.clickup_snapshots;
drop policy if exists clickup_snapshots_area_ins on public.clickup_snapshots;
drop policy if exists clickup_snapshots_area_upd on public.clickup_snapshots;
drop policy if exists clickup_snapshots_area_update on public.clickup_snapshots;
create policy clickup_snapshots_rb_read on public.clickup_snapshots for select to anon, authenticated using (true);
create policy clickup_snapshots_rb_write on public.clickup_snapshots for all to authenticated using (true) with check (true);

-- clickup_tasks_mirror
drop policy if exists clickup_tasks_mirror_area_read on public.clickup_tasks_mirror;
drop policy if exists clickup_tasks_mirror_area_write on public.clickup_tasks_mirror;
drop policy if exists clickup_tasks_mirror_area_ins on public.clickup_tasks_mirror;
drop policy if exists clickup_tasks_mirror_area_upd on public.clickup_tasks_mirror;
drop policy if exists clickup_tasks_mirror_area_update on public.clickup_tasks_mirror;
create policy clickup_tasks_mirror_rb_read on public.clickup_tasks_mirror for select to anon, authenticated using (true);
create policy clickup_tasks_mirror_rb_write on public.clickup_tasks_mirror for all to authenticated using (true) with check (true);

-- agent_proposals
drop policy if exists agent_proposals_area_read on public.agent_proposals;
drop policy if exists agent_proposals_area_write on public.agent_proposals;
drop policy if exists agent_proposals_area_ins on public.agent_proposals;
drop policy if exists agent_proposals_area_upd on public.agent_proposals;
drop policy if exists agent_proposals_area_update on public.agent_proposals;
create policy agent_proposals_rb_read on public.agent_proposals for select to anon, authenticated using (true);
create policy agent_proposals_rb_ins on public.agent_proposals for insert to authenticated with check (true);
create policy agent_proposals_rb_upd on public.agent_proposals for update to authenticated using (true) with check (true);

-- agent_registry
drop policy if exists agent_registry_area_read on public.agent_registry;
drop policy if exists agent_registry_area_write on public.agent_registry;
drop policy if exists agent_registry_area_ins on public.agent_registry;
drop policy if exists agent_registry_area_upd on public.agent_registry;
drop policy if exists agent_registry_area_update on public.agent_registry;
create policy agent_registry_rb_read on public.agent_registry for select to anon, authenticated using (true);

-- ops_day_routes
drop policy if exists ops_day_routes_area_read on public.ops_day_routes;
drop policy if exists ops_day_routes_area_write on public.ops_day_routes;
drop policy if exists ops_day_routes_area_ins on public.ops_day_routes;
drop policy if exists ops_day_routes_area_upd on public.ops_day_routes;
drop policy if exists ops_day_routes_area_update on public.ops_day_routes;
create policy ops_day_routes_rb_read on public.ops_day_routes for select to authenticated using (true);
create policy ops_day_routes_rb_write on public.ops_day_routes for all to authenticated using (true) with check (true);

-- ops_day_tasks
drop policy if exists ops_day_tasks_area_read on public.ops_day_tasks;
drop policy if exists ops_day_tasks_area_write on public.ops_day_tasks;
drop policy if exists ops_day_tasks_area_ins on public.ops_day_tasks;
drop policy if exists ops_day_tasks_area_upd on public.ops_day_tasks;
drop policy if exists ops_day_tasks_area_update on public.ops_day_tasks;
create policy ops_day_tasks_rb_read on public.ops_day_tasks for select to authenticated using (true);
create policy ops_day_tasks_rb_write on public.ops_day_tasks for all to authenticated using (true) with check (true);

-- ops_day_templates
drop policy if exists ops_day_templates_area_read on public.ops_day_templates;
drop policy if exists ops_day_templates_area_write on public.ops_day_templates;
drop policy if exists ops_day_templates_area_ins on public.ops_day_templates;
drop policy if exists ops_day_templates_area_upd on public.ops_day_templates;
drop policy if exists ops_day_templates_area_update on public.ops_day_templates;
create policy ops_day_templates_rb_read on public.ops_day_templates for select to authenticated using (true);
create policy ops_day_templates_rb_write on public.ops_day_templates for all to authenticated using (true) with check (true);

-- ops_property_durations
drop policy if exists ops_property_durations_area_read on public.ops_property_durations;
drop policy if exists ops_property_durations_area_write on public.ops_property_durations;
drop policy if exists ops_property_durations_area_ins on public.ops_property_durations;
drop policy if exists ops_property_durations_area_upd on public.ops_property_durations;
drop policy if exists ops_property_durations_area_update on public.ops_property_durations;
create policy ops_property_durations_rb_read on public.ops_property_durations for select to authenticated using (true);
create policy ops_property_durations_rb_write on public.ops_property_durations for all to authenticated using (true) with check (true);

-- ops_recurring
drop policy if exists ops_recurring_area_read on public.ops_recurring;
drop policy if exists ops_recurring_area_write on public.ops_recurring;
drop policy if exists ops_recurring_area_ins on public.ops_recurring;
drop policy if exists ops_recurring_area_upd on public.ops_recurring;
drop policy if exists ops_recurring_area_update on public.ops_recurring;
create policy ops_recurring_rb_read on public.ops_recurring for select to authenticated using (true);
create policy ops_recurring_rb_write on public.ops_recurring for all to authenticated using (true) with check (true);

-- ops_tasks
drop policy if exists ops_tasks_area_read on public.ops_tasks;
drop policy if exists ops_tasks_area_write on public.ops_tasks;
drop policy if exists ops_tasks_area_ins on public.ops_tasks;
drop policy if exists ops_tasks_area_upd on public.ops_tasks;
drop policy if exists ops_tasks_area_update on public.ops_tasks;
create policy ops_tasks_rb_read on public.ops_tasks for select to authenticated using (true);
create policy ops_tasks_rb_write on public.ops_tasks for all to authenticated using (true) with check (true);

-- clean_day_tasks
drop policy if exists clean_day_tasks_area_read on public.clean_day_tasks;
drop policy if exists clean_day_tasks_area_write on public.clean_day_tasks;
drop policy if exists clean_day_tasks_area_ins on public.clean_day_tasks;
drop policy if exists clean_day_tasks_area_upd on public.clean_day_tasks;
drop policy if exists clean_day_tasks_area_update on public.clean_day_tasks;
create policy clean_day_tasks_rb_read on public.clean_day_tasks for select to authenticated using (true);
create policy clean_day_tasks_rb_write on public.clean_day_tasks for all to authenticated using (true) with check (true);

-- clean_day_templates
drop policy if exists clean_day_templates_area_read on public.clean_day_templates;
drop policy if exists clean_day_templates_area_write on public.clean_day_templates;
drop policy if exists clean_day_templates_area_ins on public.clean_day_templates;
drop policy if exists clean_day_templates_area_upd on public.clean_day_templates;
drop policy if exists clean_day_templates_area_update on public.clean_day_templates;
create policy clean_day_templates_rb_read on public.clean_day_templates for select to authenticated using (true);
create policy clean_day_templates_rb_write on public.clean_day_templates for all to authenticated using (true) with check (true);

-- clean_recurring
drop policy if exists clean_recurring_area_read on public.clean_recurring;
drop policy if exists clean_recurring_area_write on public.clean_recurring;
drop policy if exists clean_recurring_area_ins on public.clean_recurring;
drop policy if exists clean_recurring_area_upd on public.clean_recurring;
drop policy if exists clean_recurring_area_update on public.clean_recurring;
create policy clean_recurring_rb_read on public.clean_recurring for select to authenticated using (true);
create policy clean_recurring_rb_write on public.clean_recurring for all to authenticated using (true) with check (true);

-- clean_tasks
drop policy if exists clean_tasks_area_read on public.clean_tasks;
drop policy if exists clean_tasks_area_write on public.clean_tasks;
drop policy if exists clean_tasks_area_ins on public.clean_tasks;
drop policy if exists clean_tasks_area_upd on public.clean_tasks;
drop policy if exists clean_tasks_area_update on public.clean_tasks;
create policy clean_tasks_rb_read on public.clean_tasks for select to authenticated using (true);
create policy clean_tasks_rb_write on public.clean_tasks for all to authenticated using (true) with check (true);

-- edu_alerts
drop policy if exists edu_alerts_area_read on public.edu_alerts;
drop policy if exists edu_alerts_area_write on public.edu_alerts;
drop policy if exists edu_alerts_area_ins on public.edu_alerts;
drop policy if exists edu_alerts_area_upd on public.edu_alerts;
drop policy if exists edu_alerts_area_update on public.edu_alerts;
create policy edu_alerts_rb_read on public.edu_alerts for select to authenticated using (true);
create policy edu_alerts_rb_write on public.edu_alerts for all to authenticated using (true) with check (true);

-- edu_credit_diagnostics
drop policy if exists edu_credit_diagnostics_area_read on public.edu_credit_diagnostics;
drop policy if exists edu_credit_diagnostics_area_write on public.edu_credit_diagnostics;
drop policy if exists edu_credit_diagnostics_area_ins on public.edu_credit_diagnostics;
drop policy if exists edu_credit_diagnostics_area_upd on public.edu_credit_diagnostics;
drop policy if exists edu_credit_diagnostics_area_update on public.edu_credit_diagnostics;
create policy edu_credit_diagnostics_rb_read on public.edu_credit_diagnostics for select to authenticated using (true);
create policy edu_credit_diagnostics_rb_write on public.edu_credit_diagnostics for all to authenticated using (true) with check (true);

-- edu_credit_plan_tasks
drop policy if exists edu_credit_plan_tasks_area_read on public.edu_credit_plan_tasks;
drop policy if exists edu_credit_plan_tasks_area_write on public.edu_credit_plan_tasks;
drop policy if exists edu_credit_plan_tasks_area_ins on public.edu_credit_plan_tasks;
drop policy if exists edu_credit_plan_tasks_area_upd on public.edu_credit_plan_tasks;
drop policy if exists edu_credit_plan_tasks_area_update on public.edu_credit_plan_tasks;
create policy edu_credit_plan_tasks_rb_read on public.edu_credit_plan_tasks for select to authenticated using (true);
create policy edu_credit_plan_tasks_rb_write on public.edu_credit_plan_tasks for all to authenticated using (true) with check (true);

-- edu_glscore_history
drop policy if exists edu_glscore_history_area_read on public.edu_glscore_history;
drop policy if exists edu_glscore_history_area_write on public.edu_glscore_history;
drop policy if exists edu_glscore_history_area_ins on public.edu_glscore_history;
drop policy if exists edu_glscore_history_area_upd on public.edu_glscore_history;
drop policy if exists edu_glscore_history_area_update on public.edu_glscore_history;
create policy edu_glscore_history_rb_read on public.edu_glscore_history for select to authenticated using (true);
create policy edu_glscore_history_rb_write on public.edu_glscore_history for all to authenticated using (true) with check (true);

-- edu_mentorships
drop policy if exists edu_mentorships_area_read on public.edu_mentorships;
drop policy if exists edu_mentorships_area_write on public.edu_mentorships;
drop policy if exists edu_mentorships_area_ins on public.edu_mentorships;
drop policy if exists edu_mentorships_area_upd on public.edu_mentorships;
drop policy if exists edu_mentorships_area_update on public.edu_mentorships;
create policy edu_mentorships_rb_read on public.edu_mentorships for select to authenticated using (true);
create policy edu_mentorships_rb_write on public.edu_mentorships for all to authenticated using (true) with check (true);

-- edu_okr_targets
drop policy if exists edu_okr_targets_area_read on public.edu_okr_targets;
drop policy if exists edu_okr_targets_area_write on public.edu_okr_targets;
drop policy if exists edu_okr_targets_area_ins on public.edu_okr_targets;
drop policy if exists edu_okr_targets_area_upd on public.edu_okr_targets;
drop policy if exists edu_okr_targets_area_update on public.edu_okr_targets;
create policy edu_okr_targets_rb_read on public.edu_okr_targets for select to authenticated using (true);
create policy edu_okr_targets_rb_write on public.edu_okr_targets for all to authenticated using (true) with check (true);

-- edu_presentations
drop policy if exists edu_presentations_area_read on public.edu_presentations;
drop policy if exists edu_presentations_area_write on public.edu_presentations;
drop policy if exists edu_presentations_area_ins on public.edu_presentations;
drop policy if exists edu_presentations_area_upd on public.edu_presentations;
drop policy if exists edu_presentations_area_update on public.edu_presentations;
create policy edu_presentations_rb_read on public.edu_presentations for select to authenticated using (true);
create policy edu_presentations_rb_write on public.edu_presentations for all to authenticated using (true) with check (true);

-- edu_reports
drop policy if exists edu_reports_area_read on public.edu_reports;
drop policy if exists edu_reports_area_write on public.edu_reports;
drop policy if exists edu_reports_area_ins on public.edu_reports;
drop policy if exists edu_reports_area_upd on public.edu_reports;
drop policy if exists edu_reports_area_update on public.edu_reports;
create policy edu_reports_rb_read on public.edu_reports for select to authenticated using (true);
create policy edu_reports_rb_write on public.edu_reports for all to authenticated using (true) with check (true);

-- edu_resources
drop policy if exists edu_resources_area_read on public.edu_resources;
drop policy if exists edu_resources_area_write on public.edu_resources;
drop policy if exists edu_resources_area_ins on public.edu_resources;
drop policy if exists edu_resources_area_upd on public.edu_resources;
drop policy if exists edu_resources_area_update on public.edu_resources;
create policy edu_resources_rb_read on public.edu_resources for select to authenticated using (true);
create policy edu_resources_rb_write on public.edu_resources for all to authenticated using (true) with check (true);

-- edu_student_activity
drop policy if exists edu_student_activity_area_read on public.edu_student_activity;
drop policy if exists edu_student_activity_area_write on public.edu_student_activity;
drop policy if exists edu_student_activity_area_ins on public.edu_student_activity;
drop policy if exists edu_student_activity_area_upd on public.edu_student_activity;
drop policy if exists edu_student_activity_area_update on public.edu_student_activity;
create policy edu_student_activity_rb_read on public.edu_student_activity for select to authenticated using (true);
create policy edu_student_activity_rb_write on public.edu_student_activity for all to authenticated using (true) with check (true);

-- edu_student_calls
drop policy if exists edu_student_calls_area_read on public.edu_student_calls;
drop policy if exists edu_student_calls_area_write on public.edu_student_calls;
drop policy if exists edu_student_calls_area_ins on public.edu_student_calls;
drop policy if exists edu_student_calls_area_upd on public.edu_student_calls;
drop policy if exists edu_student_calls_area_update on public.edu_student_calls;
create policy edu_student_calls_rb_read on public.edu_student_calls for select to authenticated using (true);
create policy edu_student_calls_rb_write on public.edu_student_calls for all to authenticated using (true) with check (true);

-- edu_student_interactions
drop policy if exists edu_student_interactions_area_read on public.edu_student_interactions;
drop policy if exists edu_student_interactions_area_write on public.edu_student_interactions;
drop policy if exists edu_student_interactions_area_ins on public.edu_student_interactions;
drop policy if exists edu_student_interactions_area_upd on public.edu_student_interactions;
drop policy if exists edu_student_interactions_area_update on public.edu_student_interactions;
create policy edu_student_interactions_rb_read on public.edu_student_interactions for select to authenticated using (true);
create policy edu_student_interactions_rb_write on public.edu_student_interactions for all to authenticated using (true) with check (true);

-- edu_student_stage_history
drop policy if exists edu_student_stage_history_area_read on public.edu_student_stage_history;
drop policy if exists edu_student_stage_history_area_write on public.edu_student_stage_history;
drop policy if exists edu_student_stage_history_area_ins on public.edu_student_stage_history;
drop policy if exists edu_student_stage_history_area_upd on public.edu_student_stage_history;
drop policy if exists edu_student_stage_history_area_update on public.edu_student_stage_history;
create policy edu_student_stage_history_rb_read on public.edu_student_stage_history for select to authenticated using (true);
create policy edu_student_stage_history_rb_write on public.edu_student_stage_history for all to authenticated using (true) with check (true);

-- edu_student_tasks
drop policy if exists edu_student_tasks_area_read on public.edu_student_tasks;
drop policy if exists edu_student_tasks_area_write on public.edu_student_tasks;
drop policy if exists edu_student_tasks_area_ins on public.edu_student_tasks;
drop policy if exists edu_student_tasks_area_upd on public.edu_student_tasks;
drop policy if exists edu_student_tasks_area_update on public.edu_student_tasks;
create policy edu_student_tasks_rb_read on public.edu_student_tasks for select to authenticated using (true);
create policy edu_student_tasks_rb_write on public.edu_student_tasks for all to authenticated using (true) with check (true);

-- edu_students
drop policy if exists edu_students_area_read on public.edu_students;
drop policy if exists edu_students_area_write on public.edu_students;
drop policy if exists edu_students_area_ins on public.edu_students;
drop policy if exists edu_students_area_upd on public.edu_students;
drop policy if exists edu_students_area_update on public.edu_students;
create policy edu_students_rb_read on public.edu_students for select to authenticated using (true);
create policy edu_students_rb_write on public.edu_students for all to authenticated using (true) with check (true);

-- edu_whatsapp_campaigns
drop policy if exists edu_whatsapp_campaigns_area_read on public.edu_whatsapp_campaigns;
drop policy if exists edu_whatsapp_campaigns_area_write on public.edu_whatsapp_campaigns;
drop policy if exists edu_whatsapp_campaigns_area_ins on public.edu_whatsapp_campaigns;
drop policy if exists edu_whatsapp_campaigns_area_upd on public.edu_whatsapp_campaigns;
drop policy if exists edu_whatsapp_campaigns_area_update on public.edu_whatsapp_campaigns;
create policy edu_whatsapp_campaigns_rb_read on public.edu_whatsapp_campaigns for select to authenticated using (true);
create policy edu_whatsapp_campaigns_rb_write on public.edu_whatsapp_campaigns for all to authenticated using (true) with check (true);

-- edu_whatsapp_messages
drop policy if exists edu_whatsapp_messages_area_read on public.edu_whatsapp_messages;
drop policy if exists edu_whatsapp_messages_area_write on public.edu_whatsapp_messages;
drop policy if exists edu_whatsapp_messages_area_ins on public.edu_whatsapp_messages;
drop policy if exists edu_whatsapp_messages_area_upd on public.edu_whatsapp_messages;
drop policy if exists edu_whatsapp_messages_area_update on public.edu_whatsapp_messages;
create policy edu_whatsapp_messages_rb_read on public.edu_whatsapp_messages for select to authenticated using (true);
create policy edu_whatsapp_messages_rb_write on public.edu_whatsapp_messages for all to authenticated using (true) with check (true);

-- properties
drop policy if exists properties_area_read on public.properties;
drop policy if exists properties_area_write on public.properties;
drop policy if exists properties_area_ins on public.properties;
drop policy if exists properties_area_upd on public.properties;
drop policy if exists properties_area_update on public.properties;
create policy prop_select on public.properties for select to public using ((auth.role() = 'authenticated'::text));
create policy prop_update on public.properties for update to public using ((auth.role() = 'authenticated'::text));

-- Vistas: volver al modo definer previo
alter view public.edu_calls_monthly_view reset (security_invoker);
alter view public.edu_ceo_conversion_etapas reset (security_invoker);
alter view public.edu_ceo_cuellos_botella reset (security_invoker);
alter view public.edu_ceo_funnel reset (security_invoker);
alter view public.edu_ceo_health_score reset (security_invoker);
alter view public.edu_ceo_motivos_desercion reset (security_invoker);
alter view public.edu_ceo_revenue reset (security_invoker);
alter view public.edu_ceo_snapshot reset (security_invoker);
alter view public.edu_ceo_tendencia_6m reset (security_invoker);
alter view public.edu_kpi_asistencia_mensual reset (security_invoker);
alter view public.edu_kpi_avance_plan reset (security_invoker);
alter view public.edu_kpi_cartera_por_antiguedad reset (security_invoker);
alter view public.edu_kpi_cartera_por_etapa reset (security_invoker);
alter view public.edu_kpi_cartera_por_grupo reset (security_invoker);
alter view public.edu_kpi_cartera_por_status reset (security_invoker);
alter view public.edu_kpi_churns_con_motivo reset (security_invoker);
alter view public.edu_kpi_coaches_actividad reset (security_invoker);
alter view public.edu_kpi_creditos_diagnosticados reset (security_invoker);
alter view public.edu_kpi_distribucion_sesiones reset (security_invoker);
alter view public.edu_kpi_estudiantes_con_plan reset (security_invoker);
alter view public.edu_kpi_inactivos_30d reset (security_invoker);
alter view public.edu_kpi_motivos_no_asistencia reset (security_invoker);
alter view public.edu_kpi_noshows_coach reset (security_invoker);
alter view public.edu_kpi_nps reset (security_invoker);
alter view public.edu_kpi_primer_deal reset (security_invoker);
alter view public.edu_kpi_renovaciones_churn reset (security_invoker);
alter view public.edu_kpi_resumen_mensual reset (security_invoker);
alter view public.edu_kpi_retencion_cohort reset (security_invoker);
alter view public.edu_kpi_sesiones_estudiante_mes reset (security_invoker);
alter view public.edu_kpi_sesiones_por_motivo reset (security_invoker);
alter view public.edu_kpi_tareas_por_bloque reset (security_invoker);
alter view public.edu_kpi_tiempo_por_etapa reset (security_invoker);
alter view public.edu_kpi_top_deals reset (security_invoker);
alter view public.edu_mkt_acquisition reset (security_invoker);
alter view public.edu_mkt_bottleneck reset (security_invoker);
alter view public.edu_mkt_engagement reset (security_invoker);
alter view public.edu_plan_bloques_lentos reset (security_invoker);
alter view public.edu_plan_distribucion_avance reset (security_invoker);
alter view public.edu_plan_estudiantes_en_riesgo reset (security_invoker);
alter view public.edu_plan_por_estudiante reset (security_invoker);
alter view public.edu_plan_resumen_ejecutivo reset (security_invoker);
alter view public.edu_plan_top_estudiantes reset (security_invoker);
alter view public.edu_plan_velocity_semanal reset (security_invoker);
alter view public.edu_student_followup_score reset (security_invoker);
alter view public.house_match_suggestions reset (security_invoker);
alter view public.ops_time_calibration reset (security_invoker);
alter view public.pm_bottleneck_heatmap reset (security_invoker);
alter view public.pm_executive_cross_company reset (security_invoker);
alter view public.pm_feeds_summary reset (security_invoker);
alter view public.pm_monthly_finance reset (security_invoker);
alter view public.pm_performance_leaderboard reset (security_invoker);
alter view public.pm_rentable_units reset (security_invoker);
alter view public.pm_scorecard reset (security_invoker);
alter view public.pm_unit_occupancy reset (security_invoker);
alter view public.remodel_actions_summary reset (security_invoker);
alter view public.remodel_crew_capacity reset (security_invoker);
alter view public.remodel_crew_workload reset (security_invoker);
alter view public.remodel_dynamic_benchmarks reset (security_invoker);
alter view public.remodel_invoices_summary reset (security_invoker);
alter view public.remodel_latest_approved_version reset (security_invoker);
alter view public.remodel_latest_supplier_prices reset (security_invoker);
alter view public.remodel_obra_calibration reset (security_invoker);
alter view public.remodel_price_summary reset (security_invoker);
alter view public.remodel_stage_deviation reset (security_invoker);
alter view public.remodel_worker_pay_summary reset (security_invoker);
alter view public.unified_houses reset (security_invoker);
alter view public.v_edu_student_plan_progress reset (security_invoker);
alter view public.v_holding_pnl reset (security_invoker);
alter view public.v_qb_status reset (security_invoker);
alter view public.v_remodel_avance_vivo reset (security_invoker);
alter view public.v_remodel_calib_costos reset (security_invoker);
alter view public.v_remodel_calib_etapas reset (security_invoker);
alter view public.v_remodel_casas_unmatched reset (security_invoker);
alter view public.v_remodel_nomina_ledger reset (security_invoker);
alter view public.v_remodel_presupuesto_casa reset (security_invoker);
alter view public.v_remodel_progress reset (security_invoker);