-- ════════════════════════════════════════════════════════════════
-- RLS ETAPA 2 — espejos por allowed_areas (has_area) + vistas con security_invoker.
-- Un usuario solo lee/escribe las tablas de SUS áreas; admin activo ve todo;
-- service_role (syncs/crons/EFs) bypassea RLS y no cambia.
-- NO se tocan: portal alumno (edu_diagnostic_invites / edu_student_plans /
-- edu_student_plan_tasks / edu_materials / edu_pres_jobs / fm_documents),
-- policies admin-only (pm_expenses/pm_payroll/pm_wifi/rch_admin/rp_update...),
-- policies service-only ni el rol agentes_ia.
-- ROLLBACK completo en supabase/rollbacks/20260706120000_rls_etapa2_rollback.sql
-- ════════════════════════════════════════════════════════════════

-- ff_hml_loans
drop policy if exists "ff_hml_loans_read" on public.ff_hml_loans;
create policy ff_hml_loans_area_read on public.ff_hml_loans for select to authenticated using (public.has_area('fix-flip'));

-- ff_hml_payments
drop policy if exists "ff_hml_read" on public.ff_hml_payments;
create policy ff_hml_payments_area_read on public.ff_hml_payments for select to authenticated using (public.has_area('fix-flip'));

-- ff_overhead
drop policy if exists "ff_overhead_read" on public.ff_overhead;
create policy ff_overhead_area_read on public.ff_overhead for select to authenticated using (public.has_area('fix-flip'));

-- ff_uw_config
drop policy if exists "ff_uw_read" on public.ff_uw_config;
create policy ff_uw_config_area_read on public.ff_uw_config for select to authenticated using (public.has_area('fix-flip'));

-- qb_account_map
drop policy if exists "qbam_read" on public.qb_account_map;
create policy qb_account_map_area_read on public.qb_account_map for select to authenticated using (public.has_area('contable'));

-- qb_report_cache
drop policy if exists "qbrc_read" on public.qb_report_cache;
create policy qb_report_cache_area_read on public.qb_report_cache for select to authenticated using (public.has_area('contable'));

-- airtable_record_names
drop policy if exists "arn_all" on public.airtable_record_names;
create policy airtable_record_names_area_read on public.airtable_record_names for select to authenticated using (public.has_area('remodelacion'));
create policy airtable_record_names_area_write on public.airtable_record_names for all to authenticated using (public.has_area('remodelacion')) with check (public.has_area('remodelacion'));

-- house_link_overrides
drop policy if exists "hlo_all" on public.house_link_overrides;
create policy house_link_overrides_area_read on public.house_link_overrides for select to authenticated using (public.has_area('remodelacion'));
create policy house_link_overrides_area_write on public.house_link_overrides for all to authenticated using (public.has_area('remodelacion')) with check (public.has_area('remodelacion'));

-- remodel_actuals
drop policy if exists "ra_select" on public.remodel_actuals;
drop policy if exists "ra_write" on public.remodel_actuals;
create policy remodel_actuals_area_read on public.remodel_actuals for select to authenticated using (public.has_area('remodelacion'));
create policy remodel_actuals_area_write on public.remodel_actuals for all to authenticated using (public.has_area('remodelacion')) with check (public.has_area('remodelacion'));

-- remodel_alerts
drop policy if exists "ra_select" on public.remodel_alerts;
drop policy if exists "ra_write" on public.remodel_alerts;
create policy remodel_alerts_area_read on public.remodel_alerts for select to authenticated using (public.has_area('remodelacion'));
create policy remodel_alerts_area_write on public.remodel_alerts for all to authenticated using (public.has_area('remodelacion')) with check (public.has_area('remodelacion'));

-- remodel_at_properties
drop policy if exists "rap_select" on public.remodel_at_properties;
drop policy if exists "rap_write" on public.remodel_at_properties;
create policy remodel_at_properties_area_read on public.remodel_at_properties for select to authenticated using (public.has_area('remodelacion'));
create policy remodel_at_properties_area_write on public.remodel_at_properties for all to authenticated using (public.has_area('remodelacion')) with check (public.has_area('remodelacion'));

-- remodel_budget_versions
drop policy if exists "rbv_select" on public.remodel_budget_versions;
drop policy if exists "rbv_write" on public.remodel_budget_versions;
create policy remodel_budget_versions_area_read on public.remodel_budget_versions for select to authenticated using (public.has_area('remodelacion'));
create policy remodel_budget_versions_area_write on public.remodel_budget_versions for all to authenticated using (public.has_area('remodelacion')) with check (public.has_area('remodelacion'));

-- remodel_calendar
drop policy if exists "remodel_calendar_all" on public.remodel_calendar;
create policy remodel_calendar_area_read on public.remodel_calendar for select to authenticated using (public.has_area('remodelacion'));
create policy remodel_calendar_area_write on public.remodel_calendar for all to authenticated using (public.has_area('remodelacion')) with check (public.has_area('remodelacion'));

-- remodel_catalog_items
drop policy if exists "rci_select" on public.remodel_catalog_items;
drop policy if exists "rci_write" on public.remodel_catalog_items;
create policy remodel_catalog_items_area_read on public.remodel_catalog_items for select to authenticated using (public.has_area('remodelacion'));
create policy remodel_catalog_items_area_write on public.remodel_catalog_items for all to authenticated using (public.has_area('remodelacion')) with check (public.has_area('remodelacion'));

-- remodel_change_orders
drop policy if exists "rco_select" on public.remodel_change_orders;
drop policy if exists "rco_write" on public.remodel_change_orders;
create policy remodel_change_orders_area_read on public.remodel_change_orders for select to authenticated using (public.has_area('remodelacion'));
create policy remodel_change_orders_area_write on public.remodel_change_orders for all to authenticated using (public.has_area('remodelacion')) with check (public.has_area('remodelacion'));

-- remodel_crew
drop policy if exists "rc_select" on public.remodel_crew;
drop policy if exists "rc_write" on public.remodel_crew;
create policy remodel_crew_area_read on public.remodel_crew for select to authenticated using (public.has_area('remodelacion'));
create policy remodel_crew_area_write on public.remodel_crew for all to authenticated using (public.has_area('remodelacion')) with check (public.has_area('remodelacion'));

-- remodel_crew_assignments
drop policy if exists "rca_select" on public.remodel_crew_assignments;
drop policy if exists "rca_write" on public.remodel_crew_assignments;
create policy remodel_crew_assignments_area_read on public.remodel_crew_assignments for select to authenticated using (public.has_area('remodelacion'));
create policy remodel_crew_assignments_area_write on public.remodel_crew_assignments for all to authenticated using (public.has_area('remodelacion')) with check (public.has_area('remodelacion'));

-- remodel_forecast_coef
drop policy if exists "rfc_all" on public.remodel_forecast_coef;
create policy remodel_forecast_coef_area_read on public.remodel_forecast_coef for select to authenticated using (public.has_area('remodelacion'));
create policy remodel_forecast_coef_area_write on public.remodel_forecast_coef for all to authenticated using (public.has_area('remodelacion')) with check (public.has_area('remodelacion'));

-- remodel_forecast_diagnoses
drop policy if exists "rfd_all" on public.remodel_forecast_diagnoses;
create policy remodel_forecast_diagnoses_area_read on public.remodel_forecast_diagnoses for select to authenticated using (public.has_area('remodelacion'));
create policy remodel_forecast_diagnoses_area_write on public.remodel_forecast_diagnoses for all to authenticated using (public.has_area('remodelacion')) with check (public.has_area('remodelacion'));

-- remodel_forecast_params
drop policy if exists "rfp_all" on public.remodel_forecast_params;
create policy remodel_forecast_params_area_read on public.remodel_forecast_params for select to authenticated using (public.has_area('remodelacion'));
create policy remodel_forecast_params_area_write on public.remodel_forecast_params for all to authenticated using (public.has_area('remodelacion')) with check (public.has_area('remodelacion'));

-- remodel_forecasts
drop policy if exists "rf_all" on public.remodel_forecasts;
create policy remodel_forecasts_area_read on public.remodel_forecasts for select to authenticated using (public.has_area('remodelacion'));
create policy remodel_forecasts_area_write on public.remodel_forecasts for all to authenticated using (public.has_area('remodelacion')) with check (public.has_area('remodelacion'));

-- remodel_house_sqft
drop policy if exists "rhs_all" on public.remodel_house_sqft;
create policy remodel_house_sqft_area_read on public.remodel_house_sqft for select to authenticated using (public.has_area('remodelacion'));
create policy remodel_house_sqft_area_write on public.remodel_house_sqft for all to authenticated using (public.has_area('remodelacion')) with check (public.has_area('remodelacion'));

-- remodel_inspections
drop policy if exists "remodel_inspections_all" on public.remodel_inspections;
create policy remodel_inspections_area_read on public.remodel_inspections for select to authenticated using (public.has_area('remodelacion'));
create policy remodel_inspections_area_write on public.remodel_inspections for all to authenticated using (public.has_area('remodelacion')) with check (public.has_area('remodelacion'));

-- remodel_milestones
drop policy if exists "remodel_milestones_all" on public.remodel_milestones;
create policy remodel_milestones_area_read on public.remodel_milestones for select to authenticated using (public.has_area('remodelacion'));
create policy remodel_milestones_area_write on public.remodel_milestones for all to authenticated using (public.has_area('remodelacion')) with check (public.has_area('remodelacion'));

-- remodel_project_resources
drop policy if exists "rpr_all" on public.remodel_project_resources;
create policy remodel_project_resources_area_read on public.remodel_project_resources for select to authenticated using (public.has_area('remodelacion'));
create policy remodel_project_resources_area_write on public.remodel_project_resources for all to authenticated using (public.has_area('remodelacion')) with check (public.has_area('remodelacion'));

-- remodel_projects
drop policy if exists "rp_select" on public.remodel_projects;
drop policy if exists "rp_write" on public.remodel_projects;
create policy remodel_projects_area_read on public.remodel_projects for select to authenticated using (public.has_area('remodelacion'));
create policy remodel_projects_area_write on public.remodel_projects for all to authenticated using (public.has_area('remodelacion')) with check (public.has_area('remodelacion'));

-- remodel_punch_list
drop policy if exists "remodel_punch_list_all" on public.remodel_punch_list;
create policy remodel_punch_list_area_read on public.remodel_punch_list for select to authenticated using (public.has_area('remodelacion'));
create policy remodel_punch_list_area_write on public.remodel_punch_list for all to authenticated using (public.has_area('remodelacion')) with check (public.has_area('remodelacion'));

-- remodel_required_actions
drop policy if exists "rra_select" on public.remodel_required_actions;
drop policy if exists "rra_write" on public.remodel_required_actions;
create policy remodel_required_actions_area_read on public.remodel_required_actions for select to authenticated using (public.has_area('remodelacion'));
create policy remodel_required_actions_area_write on public.remodel_required_actions for all to authenticated using (public.has_area('remodelacion')) with check (public.has_area('remodelacion'));

-- remodel_snapshots
drop policy if exists "rs_select" on public.remodel_snapshots;
drop policy if exists "rs_write" on public.remodel_snapshots;
create policy remodel_snapshots_area_read on public.remodel_snapshots for select to authenticated using (public.has_area('remodelacion'));
create policy remodel_snapshots_area_write on public.remodel_snapshots for all to authenticated using (public.has_area('remodelacion')) with check (public.has_area('remodelacion'));

-- remodel_supplier_prices
drop policy if exists "rsp_select" on public.remodel_supplier_prices;
drop policy if exists "rsp_write" on public.remodel_supplier_prices;
create policy remodel_supplier_prices_area_read on public.remodel_supplier_prices for select to authenticated using (public.has_area('remodelacion'));
create policy remodel_supplier_prices_area_write on public.remodel_supplier_prices for all to authenticated using (public.has_area('remodelacion')) with check (public.has_area('remodelacion'));

-- remodel_suppliers
drop policy if exists "rs_select" on public.remodel_suppliers;
drop policy if exists "rs_write" on public.remodel_suppliers;
create policy remodel_suppliers_area_read on public.remodel_suppliers for select to authenticated using (public.has_area('remodelacion'));
create policy remodel_suppliers_area_write on public.remodel_suppliers for all to authenticated using (public.has_area('remodelacion')) with check (public.has_area('remodelacion'));

-- remodel_sync_log
drop policy if exists "rsl_select" on public.remodel_sync_log;
drop policy if exists "rsl_write" on public.remodel_sync_log;
create policy remodel_sync_log_area_read on public.remodel_sync_log for select to authenticated using (public.has_area('remodelacion'));
create policy remodel_sync_log_area_write on public.remodel_sync_log for all to authenticated using (public.has_area('remodelacion')) with check (public.has_area('remodelacion'));

-- remodel_vendor_invoices
drop policy if exists "rvi_select" on public.remodel_vendor_invoices;
drop policy if exists "rvi_write" on public.remodel_vendor_invoices;
create policy remodel_vendor_invoices_area_read on public.remodel_vendor_invoices for select to authenticated using (public.has_area('remodelacion'));
create policy remodel_vendor_invoices_area_write on public.remodel_vendor_invoices for all to authenticated using (public.has_area('remodelacion')) with check (public.has_area('remodelacion'));

-- remodel_weekly_insights
drop policy if exists "rwi_select" on public.remodel_weekly_insights;
drop policy if exists "rwi_write" on public.remodel_weekly_insights;
create policy remodel_weekly_insights_area_read on public.remodel_weekly_insights for select to authenticated using (public.has_area('remodelacion'));
create policy remodel_weekly_insights_area_write on public.remodel_weekly_insights for all to authenticated using (public.has_area('remodelacion')) with check (public.has_area('remodelacion'));

-- weekly_activities
drop policy if exists "wa_select" on public.weekly_activities;
drop policy if exists "wa_write" on public.weekly_activities;
create policy weekly_activities_area_read on public.weekly_activities for select to authenticated using (public.has_area('remodelacion'));
create policy weekly_activities_area_write on public.weekly_activities for all to authenticated using (public.has_area('remodelacion')) with check (public.has_area('remodelacion'));

-- weekly_activity_moves
drop policy if exists "wam_all" on public.weekly_activity_moves;
create policy weekly_activity_moves_area_read on public.weekly_activity_moves for select to authenticated using (public.has_area('remodelacion'));
create policy weekly_activity_moves_area_write on public.weekly_activity_moves for all to authenticated using (public.has_area('remodelacion')) with check (public.has_area('remodelacion'));

-- wp_day_templates
drop policy if exists "wdt_select" on public.wp_day_templates;
drop policy if exists "wdt_write" on public.wp_day_templates;
create policy wp_day_templates_area_read on public.wp_day_templates for select to authenticated using (public.has_area('remodelacion'));
create policy wp_day_templates_area_write on public.wp_day_templates for all to authenticated using (public.has_area('remodelacion')) with check (public.has_area('remodelacion'));

-- wp_recurring
drop policy if exists "wr_select" on public.wp_recurring;
drop policy if exists "wr_write" on public.wp_recurring;
create policy wp_recurring_area_read on public.wp_recurring for select to authenticated using (public.has_area('remodelacion'));
create policy wp_recurring_area_write on public.wp_recurring for all to authenticated using (public.has_area('remodelacion')) with check (public.has_area('remodelacion'));

-- wp_task_templates
drop policy if exists "wtt_select" on public.wp_task_templates;
drop policy if exists "wtt_write" on public.wp_task_templates;
create policy wp_task_templates_area_read on public.wp_task_templates for select to authenticated using (public.has_area('remodelacion'));
create policy wp_task_templates_area_write on public.wp_task_templates for all to authenticated using (public.has_area('remodelacion')) with check (public.has_area('remodelacion'));

-- remodel_calibration_houses
drop policy if exists "rch_select" on public.remodel_calibration_houses;
create policy remodel_calibration_houses_area_read on public.remodel_calibration_houses for select to authenticated using (public.has_area('remodelacion'));

-- remodel_crew_rates
drop policy if exists "rcr_read" on public.remodel_crew_rates;
create policy remodel_crew_rates_area_read on public.remodel_crew_rates for select to authenticated using (public.has_area('remodelacion'));

-- remodel_okrs
drop policy if exists "rokr_read" on public.remodel_okrs;
create policy remodel_okrs_area_read on public.remodel_okrs for select to authenticated using (public.has_area('remodelacion'));

-- remodel_overhead
drop policy if exists "roh_read" on public.remodel_overhead;
create policy remodel_overhead_area_read on public.remodel_overhead for select to authenticated using (public.has_area('remodelacion'));

-- remodel_sync_parity
drop policy if exists "rsp_read" on public.remodel_sync_parity;
create policy remodel_sync_parity_area_read on public.remodel_sync_parity for select to authenticated using (public.has_area('remodelacion'));

-- remodel_worker_hours
drop policy if exists "rwh_read" on public.remodel_worker_hours;
create policy remodel_worker_hours_area_read on public.remodel_worker_hours for select to authenticated using (public.has_area('remodelacion'));

-- remodel_material_payments
drop policy if exists "rmp_read" on public.remodel_material_payments;
create policy remodel_material_payments_area_read on public.remodel_material_payments for select to authenticated using (public.has_area('remodelacion'));

-- remodel_payroll_receipts
drop policy if exists "rpr_ins" on public.remodel_payroll_receipts;
drop policy if exists "rpr_read" on public.remodel_payroll_receipts;
drop policy if exists "rpr_upd" on public.remodel_payroll_receipts;
create policy remodel_payroll_receipts_area_read on public.remodel_payroll_receipts for select to authenticated using (public.has_area('remodelacion'));
create policy remodel_payroll_receipts_area_ins on public.remodel_payroll_receipts for insert to authenticated with check (public.has_area('remodelacion'));
create policy remodel_payroll_receipts_area_upd on public.remodel_payroll_receipts for update to authenticated using (public.has_area('remodelacion')) with check (public.has_area('remodelacion'));

-- pm_properties
drop policy if exists "pm_prop_all" on public.pm_properties;
create policy pm_properties_area_read on public.pm_properties for select to authenticated using (public.has_area('rentas'));
create policy pm_properties_area_write on public.pm_properties for all to authenticated using (public.has_area('rentas')) with check (public.has_area('rentas'));

-- pm_units
drop policy if exists "pm_unit_all" on public.pm_units;
create policy pm_units_area_read on public.pm_units for select to authenticated using (public.has_area('rentas'));
create policy pm_units_area_write on public.pm_units for all to authenticated using (public.has_area('rentas')) with check (public.has_area('rentas'));

-- pm_tenants
drop policy if exists "pm_ten_all" on public.pm_tenants;
create policy pm_tenants_area_read on public.pm_tenants for select to authenticated using (public.has_area('rentas'));
create policy pm_tenants_area_write on public.pm_tenants for all to authenticated using (public.has_area('rentas')) with check (public.has_area('rentas'));

-- pm_bookings
drop policy if exists "pm_book_all" on public.pm_bookings;
create policy pm_bookings_area_read on public.pm_bookings for select to authenticated using (public.has_area('rentas'));
create policy pm_bookings_area_write on public.pm_bookings for all to authenticated using (public.has_area('rentas')) with check (public.has_area('rentas'));

-- pm_booking_history
drop policy if exists "pm_bkhist_auth" on public.pm_booking_history;
create policy pm_booking_history_area_read on public.pm_booking_history for select to authenticated using (public.has_area('rentas'));
create policy pm_booking_history_area_write on public.pm_booking_history for all to authenticated using (public.has_area('rentas')) with check (public.has_area('rentas'));

-- pm_payments
drop policy if exists "pm_pay_all" on public.pm_payments;
create policy pm_payments_area_read on public.pm_payments for select to authenticated using (public.has_area('rentas'));
create policy pm_payments_area_write on public.pm_payments for all to authenticated using (public.has_area('rentas')) with check (public.has_area('rentas'));

-- pm_credentials
drop policy if exists "pm_cred_all" on public.pm_credentials;
create policy pm_credentials_area_read on public.pm_credentials for select to authenticated using (public.has_area('rentas'));
create policy pm_credentials_area_write on public.pm_credentials for all to authenticated using (public.has_area('rentas')) with check (public.has_area('rentas'));

-- pm_tasks
drop policy if exists "pm_task_all" on public.pm_tasks;
create policy pm_tasks_area_read on public.pm_tasks for select to authenticated using (public.has_area('rentas'));
create policy pm_tasks_area_write on public.pm_tasks for all to authenticated using (public.has_area('rentas')) with check (public.has_area('rentas'));

-- pm_alerts
drop policy if exists "pm_alerts_auth" on public.pm_alerts;
create policy pm_alerts_area_read on public.pm_alerts for select to authenticated using (public.has_area('rentas'));
create policy pm_alerts_area_write on public.pm_alerts for all to authenticated using (public.has_area('rentas')) with check (public.has_area('rentas'));

-- pm_data_warnings
drop policy if exists "pm_dw_auth" on public.pm_data_warnings;
create policy pm_data_warnings_area_read on public.pm_data_warnings for select to authenticated using (public.has_area('rentas'));
create policy pm_data_warnings_area_write on public.pm_data_warnings for all to authenticated using (public.has_area('rentas')) with check (public.has_area('rentas'));

-- pm_calendar_feeds
drop policy if exists "pm_feeds_all" on public.pm_calendar_feeds;
create policy pm_calendar_feeds_area_read on public.pm_calendar_feeds for select to authenticated using (public.has_area('rentas'));
create policy pm_calendar_feeds_area_write on public.pm_calendar_feeds for all to authenticated using (public.has_area('rentas')) with check (public.has_area('rentas'));

-- pm_interactions
drop policy if exists "pm_inter_all" on public.pm_interactions;
create policy pm_interactions_area_read on public.pm_interactions for select to authenticated using (public.has_area('rentas'));
create policy pm_interactions_area_write on public.pm_interactions for all to authenticated using (public.has_area('rentas')) with check (public.has_area('rentas'));

-- pm_message_templates
drop policy if exists "pm_msg_tpl_auth" on public.pm_message_templates;
create policy pm_message_templates_area_read on public.pm_message_templates for select to authenticated using (public.has_area('rentas'));
create policy pm_message_templates_area_write on public.pm_message_templates for all to authenticated using (public.has_area('rentas')) with check (public.has_area('rentas'));

-- pm_sync_log
drop policy if exists "pm_synclog_all" on public.pm_sync_log;
create policy pm_sync_log_area_read on public.pm_sync_log for select to authenticated using (public.has_area('rentas'));
create policy pm_sync_log_area_write on public.pm_sync_log for all to authenticated using (public.has_area('rentas')) with check (public.has_area('rentas'));

-- pm_utilities
drop policy if exists "pm_utilities_auth" on public.pm_utilities;
create policy pm_utilities_area_read on public.pm_utilities for select to authenticated using (public.has_area('rentas'));
create policy pm_utilities_area_write on public.pm_utilities for all to authenticated using (public.has_area('rentas')) with check (public.has_area('rentas'));

-- pm_brain_memory
drop policy if exists "pm_brain_mem_all" on public.pm_brain_memory;
drop policy if exists "pm_brain_mem_read_active" on public.pm_brain_memory;
create policy pm_brain_memory_area_read on public.pm_brain_memory for select to authenticated using (public.has_area('rentas'));
create policy pm_brain_memory_area_write on public.pm_brain_memory for all to authenticated using (public.has_area('rentas')) with check (public.has_area('rentas'));

-- pm_brain_chat
drop policy if exists "pm_brain_chat_all" on public.pm_brain_chat;
create policy pm_brain_chat_area_read on public.pm_brain_chat for select to authenticated using (public.has_area('rentas'));
create policy pm_brain_chat_area_write on public.pm_brain_chat for all to authenticated using (public.has_area('rentas')) with check (public.has_area('rentas'));

-- pm_whatsapp_config
drop policy if exists "pwc_all" on public.pm_whatsapp_config;
create policy pm_whatsapp_config_area_read on public.pm_whatsapp_config for select to authenticated using (public.has_area('rentas'));
create policy pm_whatsapp_config_area_write on public.pm_whatsapp_config for all to authenticated using (public.has_area('rentas')) with check (public.has_area('rentas'));

-- pm_whatsapp_messages
drop policy if exists "pwm_all" on public.pm_whatsapp_messages;
create policy pm_whatsapp_messages_area_read on public.pm_whatsapp_messages for select to authenticated using (public.has_area('rentas'));
create policy pm_whatsapp_messages_area_write on public.pm_whatsapp_messages for all to authenticated using (public.has_area('rentas')) with check (public.has_area('rentas'));

-- pm_whatsapp_recipients
drop policy if exists "pwr_all" on public.pm_whatsapp_recipients;
create policy pm_whatsapp_recipients_area_read on public.pm_whatsapp_recipients for select to authenticated using (public.has_area('rentas'));
create policy pm_whatsapp_recipients_area_write on public.pm_whatsapp_recipients for all to authenticated using (public.has_area('rentas')) with check (public.has_area('rentas'));

-- pm_companies
drop policy if exists "pmc_all" on public.pm_companies;
create policy pm_companies_area_read on public.pm_companies for select to authenticated using (public.has_area('pm'));
create policy pm_companies_area_write on public.pm_companies for all to authenticated using (public.has_area('pm')) with check (public.has_area('pm'));

-- pm_okrs
drop policy if exists "pmo_all" on public.pm_okrs;
create policy pm_okrs_area_read on public.pm_okrs for select to authenticated using (public.has_area('pm'));
create policy pm_okrs_area_write on public.pm_okrs for all to authenticated using (public.has_area('pm')) with check (public.has_area('pm'));

-- pm_okr_progress
drop policy if exists "pop_all" on public.pm_okr_progress;
create policy pm_okr_progress_area_read on public.pm_okr_progress for select to authenticated using (public.has_area('pm'));
create policy pm_okr_progress_area_write on public.pm_okr_progress for all to authenticated using (public.has_area('pm')) with check (public.has_area('pm'));

-- pm_one_on_ones
drop policy if exists "p1o1_all" on public.pm_one_on_ones;
create policy pm_one_on_ones_area_read on public.pm_one_on_ones for select to authenticated using (public.has_area('pm'));
create policy pm_one_on_ones_area_write on public.pm_one_on_ones for all to authenticated using (public.has_area('pm')) with check (public.has_area('pm'));

-- pm_risks
drop policy if exists "pmr_all" on public.pm_risks;
create policy pm_risks_area_read on public.pm_risks for select to authenticated using (public.has_area('pm'));
create policy pm_risks_area_write on public.pm_risks for all to authenticated using (public.has_area('pm')) with check (public.has_area('pm'));

-- pm_performance_weekly
drop policy if exists "ppw_all" on public.pm_performance_weekly;
create policy pm_performance_weekly_area_read on public.pm_performance_weekly for select to authenticated using (public.has_area('pm'));
create policy pm_performance_weekly_area_write on public.pm_performance_weekly for all to authenticated using (public.has_area('pm')) with check (public.has_area('pm'));

-- pm_coaching_prompts
drop policy if exists "pcp_all" on public.pm_coaching_prompts;
create policy pm_coaching_prompts_area_read on public.pm_coaching_prompts for select to authenticated using (public.has_area('pm'));
create policy pm_coaching_prompts_area_write on public.pm_coaching_prompts for all to authenticated using (public.has_area('pm')) with check (public.has_area('pm'));

-- pm_daily_assignments
drop policy if exists "pda_all" on public.pm_daily_assignments;
create policy pm_daily_assignments_area_read on public.pm_daily_assignments for select to authenticated using (public.has_area('pm'));
create policy pm_daily_assignments_area_write on public.pm_daily_assignments for all to authenticated using (public.has_area('pm')) with check (public.has_area('pm'));

-- pm_executive_reports
drop policy if exists "per_all" on public.pm_executive_reports;
create policy pm_executive_reports_area_read on public.pm_executive_reports for select to authenticated using (public.has_area('pm'));
create policy pm_executive_reports_area_write on public.pm_executive_reports for all to authenticated using (public.has_area('pm')) with check (public.has_area('pm'));

-- pm_compliance_items
drop policy if exists "pci_all" on public.pm_compliance_items;
create policy pm_compliance_items_area_read on public.pm_compliance_items for select to authenticated using (public.has_area('pm'));
create policy pm_compliance_items_area_write on public.pm_compliance_items for all to authenticated using (public.has_area('pm')) with check (public.has_area('pm'));

-- pm_dependencies_cross
drop policy if exists "pdc_all" on public.pm_dependencies_cross;
create policy pm_dependencies_cross_area_read on public.pm_dependencies_cross for select to authenticated using (public.has_area('pm'));
create policy pm_dependencies_cross_area_write on public.pm_dependencies_cross for all to authenticated using (public.has_area('pm')) with check (public.has_area('pm'));

-- clickup_action_log
drop policy if exists "cal_all" on public.clickup_action_log;
create policy clickup_action_log_area_read on public.clickup_action_log for select to authenticated using (public.has_area('operacion'));
create policy clickup_action_log_area_write on public.clickup_action_log for all to authenticated using (public.has_area('operacion')) with check (public.has_area('operacion'));

-- clickup_ai_proposals
drop policy if exists "cap_all" on public.clickup_ai_proposals;
create policy clickup_ai_proposals_area_read on public.clickup_ai_proposals for select to authenticated using (public.has_area('operacion'));
create policy clickup_ai_proposals_area_write on public.clickup_ai_proposals for all to authenticated using (public.has_area('operacion')) with check (public.has_area('operacion'));

-- clickup_alerts
drop policy if exists "ca_all" on public.clickup_alerts;
create policy clickup_alerts_area_read on public.clickup_alerts for select to authenticated using (public.has_area('operacion'));
create policy clickup_alerts_area_write on public.clickup_alerts for all to authenticated using (public.has_area('operacion')) with check (public.has_area('operacion'));

-- clickup_automations
drop policy if exists "cau_all" on public.clickup_automations;
create policy clickup_automations_area_read on public.clickup_automations for select to authenticated using (public.has_area('operacion'));
create policy clickup_automations_area_write on public.clickup_automations for all to authenticated using (public.has_area('operacion')) with check (public.has_area('operacion'));

-- clickup_sync_log
drop policy if exists "csl_all" on public.clickup_sync_log;
create policy clickup_sync_log_area_read on public.clickup_sync_log for select to authenticated using (public.has_area('operacion'));
create policy clickup_sync_log_area_write on public.clickup_sync_log for all to authenticated using (public.has_area('operacion')) with check (public.has_area('operacion'));

-- clickup_weekly_insights
drop policy if exists "cwi_all" on public.clickup_weekly_insights;
create policy clickup_weekly_insights_area_read on public.clickup_weekly_insights for select to authenticated using (public.has_area('operacion'));
create policy clickup_weekly_insights_area_write on public.clickup_weekly_insights for all to authenticated using (public.has_area('operacion')) with check (public.has_area('operacion'));

-- clickup_snapshots
drop policy if exists "cks_read" on public.clickup_snapshots;
drop policy if exists "cs_all" on public.clickup_snapshots;
create policy clickup_snapshots_area_read on public.clickup_snapshots for select to authenticated using (public.has_area('operacion'));
create policy clickup_snapshots_area_write on public.clickup_snapshots for all to authenticated using (public.has_area('operacion')) with check (public.has_area('operacion'));

-- clickup_tasks_mirror
drop policy if exists "ckt_read" on public.clickup_tasks_mirror;
drop policy if exists "ctm_all" on public.clickup_tasks_mirror;
create policy clickup_tasks_mirror_area_read on public.clickup_tasks_mirror for select to authenticated using (public.has_area('operacion'));
create policy clickup_tasks_mirror_area_write on public.clickup_tasks_mirror for all to authenticated using (public.has_area('operacion')) with check (public.has_area('operacion'));

-- agent_proposals
drop policy if exists "agp_read" on public.agent_proposals;
drop policy if exists "agp_ins" on public.agent_proposals;
drop policy if exists "agp_upd" on public.agent_proposals;
create policy agent_proposals_area_read on public.agent_proposals for select to authenticated using (public.has_area('operacion'));
create policy agent_proposals_area_ins on public.agent_proposals for insert to authenticated with check (public.has_area('operacion'));
create policy agent_proposals_area_upd on public.agent_proposals for update to authenticated using (public.has_area('operacion')) with check (public.has_area('operacion'));

-- agent_registry
drop policy if exists "agr_read" on public.agent_registry;
create policy agent_registry_area_read on public.agent_registry for select to authenticated using (public.has_area('operacion'));

-- ops_day_routes
drop policy if exists "ops_rt_read" on public.ops_day_routes;
drop policy if exists "ops_rt_write" on public.ops_day_routes;
create policy ops_day_routes_area_read on public.ops_day_routes for select to authenticated using ((public.has_area('operacion') or public.has_area('rentas')));
create policy ops_day_routes_area_write on public.ops_day_routes for all to authenticated using ((public.has_area('operacion') or public.has_area('rentas'))) with check ((public.has_area('operacion') or public.has_area('rentas')));

-- ops_day_tasks
drop policy if exists "odt_select" on public.ops_day_tasks;
drop policy if exists "odt_write" on public.ops_day_tasks;
create policy ops_day_tasks_area_read on public.ops_day_tasks for select to authenticated using ((public.has_area('operacion') or public.has_area('rentas')));
create policy ops_day_tasks_area_write on public.ops_day_tasks for all to authenticated using ((public.has_area('operacion') or public.has_area('rentas'))) with check ((public.has_area('operacion') or public.has_area('rentas')));

-- ops_day_templates
drop policy if exists "odt_all" on public.ops_day_templates;
create policy ops_day_templates_area_read on public.ops_day_templates for select to authenticated using ((public.has_area('operacion') or public.has_area('rentas')));
create policy ops_day_templates_area_write on public.ops_day_templates for all to authenticated using ((public.has_area('operacion') or public.has_area('rentas'))) with check ((public.has_area('operacion') or public.has_area('rentas')));

-- ops_property_durations
drop policy if exists "ops_dur_read" on public.ops_property_durations;
drop policy if exists "ops_dur_write" on public.ops_property_durations;
create policy ops_property_durations_area_read on public.ops_property_durations for select to authenticated using ((public.has_area('operacion') or public.has_area('rentas')));
create policy ops_property_durations_area_write on public.ops_property_durations for all to authenticated using ((public.has_area('operacion') or public.has_area('rentas'))) with check ((public.has_area('operacion') or public.has_area('rentas')));

-- ops_recurring
drop policy if exists "or_select" on public.ops_recurring;
drop policy if exists "or_write" on public.ops_recurring;
create policy ops_recurring_area_read on public.ops_recurring for select to authenticated using ((public.has_area('operacion') or public.has_area('rentas')));
create policy ops_recurring_area_write on public.ops_recurring for all to authenticated using ((public.has_area('operacion') or public.has_area('rentas'))) with check ((public.has_area('operacion') or public.has_area('rentas')));

-- ops_tasks
drop policy if exists "ot_select" on public.ops_tasks;
drop policy if exists "ot_write" on public.ops_tasks;
create policy ops_tasks_area_read on public.ops_tasks for select to authenticated using ((public.has_area('operacion') or public.has_area('rentas')));
create policy ops_tasks_area_write on public.ops_tasks for all to authenticated using ((public.has_area('operacion') or public.has_area('rentas'))) with check ((public.has_area('operacion') or public.has_area('rentas')));

-- clean_day_tasks
drop policy if exists "cdt_select" on public.clean_day_tasks;
drop policy if exists "cdt_write" on public.clean_day_tasks;
create policy clean_day_tasks_area_read on public.clean_day_tasks for select to authenticated using ((public.has_area('operacion') or public.has_area('rentas')));
create policy clean_day_tasks_area_write on public.clean_day_tasks for all to authenticated using ((public.has_area('operacion') or public.has_area('rentas'))) with check ((public.has_area('operacion') or public.has_area('rentas')));

-- clean_day_templates
drop policy if exists "cdtmpl_select" on public.clean_day_templates;
drop policy if exists "cdtmpl_write" on public.clean_day_templates;
create policy clean_day_templates_area_read on public.clean_day_templates for select to authenticated using ((public.has_area('operacion') or public.has_area('rentas')));
create policy clean_day_templates_area_write on public.clean_day_templates for all to authenticated using ((public.has_area('operacion') or public.has_area('rentas'))) with check ((public.has_area('operacion') or public.has_area('rentas')));

-- clean_recurring
drop policy if exists "cr_select" on public.clean_recurring;
drop policy if exists "cr_write" on public.clean_recurring;
create policy clean_recurring_area_read on public.clean_recurring for select to authenticated using ((public.has_area('operacion') or public.has_area('rentas')));
create policy clean_recurring_area_write on public.clean_recurring for all to authenticated using ((public.has_area('operacion') or public.has_area('rentas'))) with check ((public.has_area('operacion') or public.has_area('rentas')));

-- clean_tasks
drop policy if exists "ct_select" on public.clean_tasks;
drop policy if exists "ct_write" on public.clean_tasks;
create policy clean_tasks_area_read on public.clean_tasks for select to authenticated using ((public.has_area('operacion') or public.has_area('rentas')));
create policy clean_tasks_area_write on public.clean_tasks for all to authenticated using ((public.has_area('operacion') or public.has_area('rentas'))) with check ((public.has_area('operacion') or public.has_area('rentas')));

-- edu_alerts
drop policy if exists "edu_alerts_all" on public.edu_alerts;
create policy edu_alerts_area_read on public.edu_alerts for select to authenticated using (public.has_area('education'));
create policy edu_alerts_area_write on public.edu_alerts for all to authenticated using (public.has_area('education')) with check (public.has_area('education'));

-- edu_credit_diagnostics
drop policy if exists "ecd_select" on public.edu_credit_diagnostics;
drop policy if exists "ecd_write" on public.edu_credit_diagnostics;
create policy edu_credit_diagnostics_area_read on public.edu_credit_diagnostics for select to authenticated using (public.has_area('education'));
create policy edu_credit_diagnostics_area_write on public.edu_credit_diagnostics for all to authenticated using (public.has_area('education')) with check (public.has_area('education'));

-- edu_credit_plan_tasks
drop policy if exists "ecpt_select" on public.edu_credit_plan_tasks;
drop policy if exists "ecpt_write" on public.edu_credit_plan_tasks;
create policy edu_credit_plan_tasks_area_read on public.edu_credit_plan_tasks for select to authenticated using (public.has_area('education'));
create policy edu_credit_plan_tasks_area_write on public.edu_credit_plan_tasks for all to authenticated using (public.has_area('education')) with check (public.has_area('education'));

-- edu_glscore_history
drop policy if exists "edu_glscore_all" on public.edu_glscore_history;
create policy edu_glscore_history_area_read on public.edu_glscore_history for select to authenticated using (public.has_area('education'));
create policy edu_glscore_history_area_write on public.edu_glscore_history for all to authenticated using (public.has_area('education')) with check (public.has_area('education'));

-- edu_mentorships
drop policy if exists "edu_mentorships_all" on public.edu_mentorships;
create policy edu_mentorships_area_read on public.edu_mentorships for select to authenticated using (public.has_area('education'));
create policy edu_mentorships_area_write on public.edu_mentorships for all to authenticated using (public.has_area('education')) with check (public.has_area('education'));

-- edu_okr_targets
drop policy if exists "eot_select" on public.edu_okr_targets;
drop policy if exists "eot_write" on public.edu_okr_targets;
create policy edu_okr_targets_area_read on public.edu_okr_targets for select to authenticated using (public.has_area('education'));
create policy edu_okr_targets_area_write on public.edu_okr_targets for all to authenticated using (public.has_area('education')) with check (public.has_area('education'));

-- edu_presentations
drop policy if exists "edu_pres_all" on public.edu_presentations;
create policy edu_presentations_area_read on public.edu_presentations for select to authenticated using (public.has_area('education'));
create policy edu_presentations_area_write on public.edu_presentations for all to authenticated using (public.has_area('education')) with check (public.has_area('education'));

-- edu_reports
drop policy if exists "edu_reports_all" on public.edu_reports;
create policy edu_reports_area_read on public.edu_reports for select to authenticated using (public.has_area('education'));
create policy edu_reports_area_write on public.edu_reports for all to authenticated using (public.has_area('education')) with check (public.has_area('education'));

-- edu_resources
drop policy if exists "edu_resources_all" on public.edu_resources;
create policy edu_resources_area_read on public.edu_resources for select to authenticated using (public.has_area('education'));
create policy edu_resources_area_write on public.edu_resources for all to authenticated using (public.has_area('education')) with check (public.has_area('education'));

-- edu_student_activity
drop policy if exists "edu_act_all" on public.edu_student_activity;
create policy edu_student_activity_area_read on public.edu_student_activity for select to authenticated using (public.has_area('education'));
create policy edu_student_activity_area_write on public.edu_student_activity for all to authenticated using (public.has_area('education')) with check (public.has_area('education'));

-- edu_student_calls
drop policy if exists "edu_calls_all" on public.edu_student_calls;
create policy edu_student_calls_area_read on public.edu_student_calls for select to authenticated using (public.has_area('education'));
create policy edu_student_calls_area_write on public.edu_student_calls for all to authenticated using (public.has_area('education')) with check (public.has_area('education'));

-- edu_student_interactions
drop policy if exists "edu_inter_all" on public.edu_student_interactions;
create policy edu_student_interactions_area_read on public.edu_student_interactions for select to authenticated using (public.has_area('education'));
create policy edu_student_interactions_area_write on public.edu_student_interactions for all to authenticated using (public.has_area('education')) with check (public.has_area('education'));

-- edu_student_stage_history
drop policy if exists "esh_select" on public.edu_student_stage_history;
drop policy if exists "esh_write" on public.edu_student_stage_history;
create policy edu_student_stage_history_area_read on public.edu_student_stage_history for select to authenticated using (public.has_area('education'));
create policy edu_student_stage_history_area_write on public.edu_student_stage_history for all to authenticated using (public.has_area('education')) with check (public.has_area('education'));

-- edu_student_tasks
drop policy if exists "edu_tasks_all" on public.edu_student_tasks;
create policy edu_student_tasks_area_read on public.edu_student_tasks for select to authenticated using (public.has_area('education'));
create policy edu_student_tasks_area_write on public.edu_student_tasks for all to authenticated using (public.has_area('education')) with check (public.has_area('education'));

-- edu_students
drop policy if exists "edu_students_all" on public.edu_students;
create policy edu_students_area_read on public.edu_students for select to authenticated using (public.has_area('education'));
create policy edu_students_area_write on public.edu_students for all to authenticated using (public.has_area('education')) with check (public.has_area('education'));

-- edu_whatsapp_campaigns
drop policy if exists "ewc_select" on public.edu_whatsapp_campaigns;
drop policy if exists "ewc_write" on public.edu_whatsapp_campaigns;
create policy edu_whatsapp_campaigns_area_read on public.edu_whatsapp_campaigns for select to authenticated using (public.has_area('education'));
create policy edu_whatsapp_campaigns_area_write on public.edu_whatsapp_campaigns for all to authenticated using (public.has_area('education')) with check (public.has_area('education'));

-- edu_whatsapp_messages
drop policy if exists "ewm_select" on public.edu_whatsapp_messages;
drop policy if exists "ewm_write" on public.edu_whatsapp_messages;
create policy edu_whatsapp_messages_area_read on public.edu_whatsapp_messages for select to authenticated using (public.has_area('education'));
create policy edu_whatsapp_messages_area_write on public.edu_whatsapp_messages for all to authenticated using (public.has_area('education')) with check (public.has_area('education'));

-- properties
drop policy if exists "prop_select" on public.properties;
drop policy if exists "prop_update" on public.properties;
create policy properties_area_read on public.properties for select to authenticated using ((public.has_area('fix-flip') or public.has_area('rentas') or public.has_area('remodelacion')));
create policy properties_area_update on public.properties for update to authenticated using ((public.has_area('fix-flip') or public.has_area('rentas') or public.has_area('remodelacion'))) with check ((public.has_area('fix-flip') or public.has_area('rentas') or public.has_area('remodelacion')));

-- Vistas: security_invoker=on → la vista respeta el RLS de sus tablas base
alter view public.edu_calls_monthly_view set (security_invoker = on);
alter view public.edu_ceo_conversion_etapas set (security_invoker = on);
alter view public.edu_ceo_cuellos_botella set (security_invoker = on);
alter view public.edu_ceo_funnel set (security_invoker = on);
alter view public.edu_ceo_health_score set (security_invoker = on);
alter view public.edu_ceo_motivos_desercion set (security_invoker = on);
alter view public.edu_ceo_revenue set (security_invoker = on);
alter view public.edu_ceo_snapshot set (security_invoker = on);
alter view public.edu_ceo_tendencia_6m set (security_invoker = on);
alter view public.edu_kpi_asistencia_mensual set (security_invoker = on);
alter view public.edu_kpi_avance_plan set (security_invoker = on);
alter view public.edu_kpi_cartera_por_antiguedad set (security_invoker = on);
alter view public.edu_kpi_cartera_por_etapa set (security_invoker = on);
alter view public.edu_kpi_cartera_por_grupo set (security_invoker = on);
alter view public.edu_kpi_cartera_por_status set (security_invoker = on);
alter view public.edu_kpi_churns_con_motivo set (security_invoker = on);
alter view public.edu_kpi_coaches_actividad set (security_invoker = on);
alter view public.edu_kpi_creditos_diagnosticados set (security_invoker = on);
alter view public.edu_kpi_distribucion_sesiones set (security_invoker = on);
alter view public.edu_kpi_estudiantes_con_plan set (security_invoker = on);
alter view public.edu_kpi_inactivos_30d set (security_invoker = on);
alter view public.edu_kpi_motivos_no_asistencia set (security_invoker = on);
alter view public.edu_kpi_noshows_coach set (security_invoker = on);
alter view public.edu_kpi_nps set (security_invoker = on);
alter view public.edu_kpi_primer_deal set (security_invoker = on);
alter view public.edu_kpi_renovaciones_churn set (security_invoker = on);
alter view public.edu_kpi_resumen_mensual set (security_invoker = on);
alter view public.edu_kpi_retencion_cohort set (security_invoker = on);
alter view public.edu_kpi_sesiones_estudiante_mes set (security_invoker = on);
alter view public.edu_kpi_sesiones_por_motivo set (security_invoker = on);
alter view public.edu_kpi_tareas_por_bloque set (security_invoker = on);
alter view public.edu_kpi_tiempo_por_etapa set (security_invoker = on);
alter view public.edu_kpi_top_deals set (security_invoker = on);
alter view public.edu_mkt_acquisition set (security_invoker = on);
alter view public.edu_mkt_bottleneck set (security_invoker = on);
alter view public.edu_mkt_engagement set (security_invoker = on);
alter view public.edu_plan_bloques_lentos set (security_invoker = on);
alter view public.edu_plan_distribucion_avance set (security_invoker = on);
alter view public.edu_plan_estudiantes_en_riesgo set (security_invoker = on);
alter view public.edu_plan_por_estudiante set (security_invoker = on);
alter view public.edu_plan_resumen_ejecutivo set (security_invoker = on);
alter view public.edu_plan_top_estudiantes set (security_invoker = on);
alter view public.edu_plan_velocity_semanal set (security_invoker = on);
alter view public.edu_student_followup_score set (security_invoker = on);
alter view public.house_match_suggestions set (security_invoker = on);
alter view public.ops_time_calibration set (security_invoker = on);
alter view public.pm_bottleneck_heatmap set (security_invoker = on);
alter view public.pm_executive_cross_company set (security_invoker = on);
alter view public.pm_feeds_summary set (security_invoker = on);
alter view public.pm_monthly_finance set (security_invoker = on);
alter view public.pm_performance_leaderboard set (security_invoker = on);
alter view public.pm_rentable_units set (security_invoker = on);
alter view public.pm_scorecard set (security_invoker = on);
alter view public.pm_unit_occupancy set (security_invoker = on);
alter view public.remodel_actions_summary set (security_invoker = on);
alter view public.remodel_crew_capacity set (security_invoker = on);
alter view public.remodel_crew_workload set (security_invoker = on);
alter view public.remodel_dynamic_benchmarks set (security_invoker = on);
alter view public.remodel_invoices_summary set (security_invoker = on);
alter view public.remodel_latest_approved_version set (security_invoker = on);
alter view public.remodel_latest_supplier_prices set (security_invoker = on);
alter view public.remodel_obra_calibration set (security_invoker = on);
alter view public.remodel_price_summary set (security_invoker = on);
alter view public.remodel_stage_deviation set (security_invoker = on);
alter view public.remodel_worker_pay_summary set (security_invoker = on);
alter view public.unified_houses set (security_invoker = on);
alter view public.v_edu_student_plan_progress set (security_invoker = on);
alter view public.v_holding_pnl set (security_invoker = on);
alter view public.v_qb_status set (security_invoker = on);
alter view public.v_remodel_avance_vivo set (security_invoker = on);
alter view public.v_remodel_calib_costos set (security_invoker = on);
alter view public.v_remodel_calib_etapas set (security_invoker = on);
alter view public.v_remodel_casas_unmatched set (security_invoker = on);
alter view public.v_remodel_nomina_ledger set (security_invoker = on);
alter view public.v_remodel_presupuesto_casa set (security_invoker = on);
alter view public.v_remodel_progress set (security_invoker = on);