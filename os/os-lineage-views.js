// GENERADO por scripts/lineage-gen.mjs — NO editar a mano (regenerar tras cambiar vistas)
// Linaje real vista → tablas·columnas desde information_schema.view_column_usage (2026-07-14)
window.LINEAGE_VIEWS = {
 "v_arv_calibracion": [
  {
   "t": "arv_calibracion",
   "c": [
    "active",
    "detalle",
    "fuente",
    "id",
    "mape",
    "mdape",
    "n_casas",
    "params",
    "run_at",
    "sesgo"
   ]
  }
 ],
 "v_capital_deployed": [
  {
   "t": "ff_hml_loans",
   "c": [
    "active",
    "monto_hml"
   ]
  },
  {
   "t": "ff_investors",
   "c": [
    "active",
    "capital_aportado",
    "capital_pagado"
   ]
  },
  {
   "t": "qb_report_cache",
   "c": [
    "fetched_at",
    "label",
    "report",
    "value"
   ]
  }
 ],
 "v_casas_fantasma": [
  {
   "t": "pm_properties",
   "c": [
    "active",
    "id",
    "name",
    "property_id",
    "rental_model"
   ]
  },
  {
   "t": "pm_units",
   "c": [
    "active",
    "external_id",
    "property_id",
    "unit_type"
   ]
  }
 ],
 "v_disciplina_clickup": [
  {
   "t": "clickup_tasks_mirror",
   "c": [
    "active",
    "date_updated",
    "due_date",
    "primary_assignee",
    "status_type"
   ]
  }
 ],
 "v_divergencias_legacy": [
  {
   "t": "pm_properties",
   "c": [
    "active",
    "id",
    "name",
    "property_id",
    "total_units"
   ]
  },
  {
   "t": "pm_units",
   "c": [
    "active",
    "external_id",
    "property_id",
    "unit_type"
   ]
  },
  {
   "t": "remodel_at_properties",
   "c": [
    "active",
    "address",
    "avance_pct",
    "avance_real",
    "property_id"
   ]
  }
 ],
 "v_edu_student_plan_progress": [
  {
   "t": "edu_student_plan_tasks",
   "c": [
    "bloque_orden",
    "bloque_subetapa",
    "completed",
    "completed_at",
    "id",
    "paso_index",
    "plan_id"
   ]
  },
  {
   "t": "edu_student_plans",
   "c": [
    "id",
    "mentorship_id",
    "status",
    "student_id"
   ]
  }
 ],
 "v_ff_portafolio": [
  {
   "t": "ff_deals",
   "c": [
    "active",
    "address",
    "address_norm",
    "arv",
    "estrategia",
    "gastos_mensuales",
    "hml_payment",
    "modelo_negocio",
    "property_id",
    "purchase_price",
    "ref30_payment",
    "remodel_est",
    "renta_mensual",
    "stage"
   ]
  },
  {
   "t": "ff_draws",
   "c": [
    "active",
    "address_norm",
    "draws_menos_deficit",
    "remodel_complete",
    "total_draws"
   ]
  },
  {
   "t": "ff_hml_loans",
   "c": [
    "active",
    "address_norm",
    "down_payment",
    "monto_hml",
    "monto_prestamo_refi"
   ]
  }
 ],
 "v_ff_portafolio_kpi": [
  {
   "t": "v_ff_portafolio",
   "c": [
    "arv",
    "deficit",
    "deuda",
    "es_portafolio",
    "faltan_draws",
    "flujo_mes",
    "pago_deuda_mes",
    "stage"
   ]
  }
 ],
 "v_holding_pnl": [
  {
   "t": "ff_deals",
   "c": [
    "active",
    "address_norm",
    "stage"
   ]
  },
  {
   "t": "ff_draws",
   "c": [
    "active",
    "address_norm",
    "net_total"
   ]
  },
  {
   "t": "ff_overhead",
   "c": [
    "active",
    "monto"
   ]
  },
  {
   "t": "pm_expenses",
   "c": [
    "active",
    "amount",
    "category"
   ]
  },
  {
   "t": "pm_payments",
   "c": [
    "active",
    "amount",
    "status",
    "type"
   ]
  },
  {
   "t": "remodel_at_properties",
   "c": [
    "active",
    "ganancia",
    "gasto_materiales",
    "gasto_trabajadores",
    "monto_real",
    "proceso"
   ]
  },
  {
   "t": "remodel_overhead",
   "c": [
    "active",
    "categoria",
    "monto",
    "source"
   ]
  }
 ],
 "v_huerfanas_resumen": [
  {
   "t": "v_tareas_huerfanas",
   "c": [
    "dias_para_vencer",
    "dueno_sugerido",
    "falta",
    "list_name"
   ]
  }
 ],
 "v_inversionistas": [
  {
   "t": "ff_deals",
   "c": [
    "active",
    "address",
    "capital_aportado",
    "capital_inversionista",
    "estrategia",
    "gastos_mensuales",
    "investor_rec_ids",
    "ownership_pct",
    "property_id",
    "renta_mensual",
    "stage",
    "utilidad_entregada"
   ]
  },
  {
   "t": "ff_investors",
   "c": [
    "active",
    "airtable_id",
    "name"
   ]
  }
 ],
 "v_obras": [
  {
   "t": "remodel_at_properties",
   "c": [
    "active",
    "address",
    "avance_real",
    "fecha_inicio",
    "fecha_real_fin",
    "ganancia",
    "gasto_materiales",
    "gasto_trabajadores",
    "lider",
    "monto_real",
    "presupuesto_interno",
    "proceso",
    "property_id",
    "valor_interno"
   ]
  }
 ],
 "v_obras_kpi": [
  {
   "t": "v_obras",
   "c": [
    "en_curso",
    "ingreso",
    "utilidad"
   ]
  }
 ],
 "v_ocupacion": [
  {
   "t": "pm_units",
   "c": [
    "access_codes",
    "active",
    "archived_at",
    "bath_shared",
    "bath_type",
    "bathroom_count",
    "code",
    "created_at",
    "decoration",
    "drive_url",
    "external_id",
    "id",
    "is_active",
    "last_synced_at",
    "maintenance_status",
    "max_occupants",
    "name",
    "notes",
    "property_id",
    "status",
    "target_rent",
    "unit_type"
   ]
  }
 ],
 "v_pnl_casa": [
  {
   "t": "ff_deals",
   "c": [
    "active",
    "address",
    "address_norm",
    "property_id",
    "stage"
   ]
  },
  {
   "t": "ff_hml_loans",
   "c": [
    "active",
    "address_norm",
    "fecha_inicio",
    "fecha_vencimiento",
    "monto_hml",
    "tasa_pct"
   ]
  },
  {
   "t": "ff_hml_payments",
   "c": [
    "active",
    "address_norm",
    "pago_hml"
   ]
  },
  {
   "t": "pm_expenses",
   "c": [
    "active",
    "amount",
    "property_id"
   ]
  },
  {
   "t": "pm_payments",
   "c": [
    "active",
    "amount",
    "property_id",
    "status",
    "type"
   ]
  },
  {
   "t": "pm_properties",
   "c": [
    "id",
    "property_id"
   ]
  }
 ],
 "v_property_360": [
  {
   "t": "airtable_record_names",
   "c": [
    "name",
    "record_id"
   ]
  },
  {
   "t": "ff_deals",
   "c": [
    "active",
    "address",
    "address_norm",
    "arv",
    "property_id",
    "purchase_price",
    "stage"
   ]
  },
  {
   "t": "ff_draws",
   "c": [
    "active",
    "address_norm",
    "remodel_complete"
   ]
  },
  {
   "t": "ff_hml_payments",
   "c": [
    "active",
    "address_norm",
    "pago_hml"
   ]
  },
  {
   "t": "remodel_at_properties",
   "c": [
    "active",
    "avance_real",
    "lider",
    "property_id"
   ]
  }
 ],
 "v_qb_status": [
  {
   "t": "qb_connections",
   "c": [
    "active",
    "company_name",
    "connected_at",
    "empresa",
    "last_refreshed_at",
    "realm_id"
   ]
  }
 ],
 "v_remodel_avance_vivo": [
  {
   "t": "remodel_at_properties",
   "c": [
    "active",
    "address",
    "airtable_id",
    "gasto_materiales",
    "gasto_trabajadores",
    "proceso",
    "property_id",
    "valor_interno"
   ]
  },
  {
   "t": "remodel_cobro_modo",
   "c": [
    "active",
    "modo",
    "property_id"
   ]
  },
  {
   "t": "remodel_forecast_params",
   "c": [
    "key",
    "value"
   ]
  },
  {
   "t": "remodel_projects",
   "c": [
    "activities",
    "property_id"
   ]
  },
  {
   "t": "v_remodel_presupuesto_casa",
   "c": [
    "airtable_id",
    "pct_gastado",
    "presupuesto",
    "total_real"
   ]
  },
  {
   "t": "v_remodel_progress",
   "c": [
    "avance_real",
    "done",
    "metodo",
    "property_id",
    "tareas_sin_map",
    "total"
   ]
  },
  {
   "t": "weekly_activities",
   "c": [
    "date",
    "property_id",
    "status"
   ]
  }
 ],
 "v_remodel_calib_costos": [
  {
   "t": "remodel_at_properties",
   "c": [
    "active",
    "address",
    "fecha_real_fin"
   ]
  },
  {
   "t": "remodel_obra_calibration",
   "c": [
    "address",
    "desv_costo_pct",
    "desv_dias",
    "est_psf",
    "est_total",
    "lider",
    "mat_ratio_pct",
    "real_psf",
    "real_total",
    "rentabilidad",
    "sqft"
   ]
  }
 ],
 "v_remodel_calib_etapas": [
  {
   "t": "remodel_forecast_params",
   "c": [
    "key",
    "value"
   ]
  },
  {
   "t": "weekly_activities",
   "c": [
    "baseline_date",
    "date",
    "stage",
    "status"
   ]
  }
 ],
 "v_remodel_casas_unmatched": [
  {
   "t": "remodel_at_properties",
   "c": [
    "active",
    "address",
    "id",
    "property_id"
   ]
  },
  {
   "t": "remodel_projects",
   "c": [
    "address",
    "archived_at",
    "id",
    "name",
    "property_id"
   ]
  },
  {
   "t": "weekly_activities",
   "c": [
    "property_id",
    "property_name"
   ]
  }
 ],
 "v_remodel_nomina_ledger": [
  {
   "t": "remodel_crew_rates",
   "c": [
    "airtable_id",
    "nombre",
    "pago_x_hora"
   ]
  },
  {
   "t": "remodel_worker_hours",
   "c": [
    "casa",
    "casa_norm",
    "fecha",
    "horas",
    "pago",
    "pago_total_dia",
    "rate_hora",
    "worker",
    "worker_rec_id"
   ]
  }
 ],
 "v_remodel_presupuesto_casa": [
  {
   "t": "remodel_at_properties",
   "c": [
    "active",
    "address",
    "airtable_id",
    "gasto_materiales",
    "presupuesto_interno",
    "proceso",
    "property_id"
   ]
  },
  {
   "t": "remodel_forecast_params",
   "c": [
    "key",
    "value"
   ]
  },
  {
   "t": "remodel_material_payments",
   "c": [
    "active",
    "address_norm",
    "precio"
   ]
  },
  {
   "t": "remodel_worker_pay_summary",
   "c": [
    "casa_norm",
    "horas",
    "pago"
   ]
  }
 ],
 "v_remodel_progress": [
  {
   "t": "remodel_projects",
   "c": [
    "activities",
    "property_id"
   ]
  },
  {
   "t": "remodel_stage_weights",
   "c": [
    "active",
    "etapa",
    "peso_pct",
    "property_id"
   ]
  },
  {
   "t": "weekly_activities",
   "c": [
    "activity_code",
    "is_critical",
    "property_id",
    "stage",
    "status"
   ]
  }
 ],
 "v_rent_roll": [
  {
   "t": "pm_payments",
   "c": [
    "active",
    "amount",
    "billing_ym",
    "property_id",
    "status",
    "type"
   ]
  },
  {
   "t": "pm_properties",
   "c": [
    "active",
    "id",
    "name",
    "property_id",
    "rental_model"
   ]
  },
  {
   "t": "pm_units",
   "c": [
    "active",
    "external_id",
    "property_id",
    "status",
    "target_rent",
    "unit_type"
   ]
  }
 ],
 "v_supuestos_calibrados": [
  {
   "t": "ff_draws",
   "c": [
    "active",
    "hml_months",
    "interest_hml",
    "interest_until_rent"
   ]
  },
  {
   "t": "remodel_at_properties",
   "c": [
    "active",
    "fecha_inicio",
    "fecha_real_fin",
    "gasto_materiales",
    "gasto_trabajadores",
    "monto_real",
    "proceso",
    "sqft"
   ]
  }
 ],
 "v_tareas_huerfanas": [
  {
   "t": "clickup_scheduler_plantilla",
   "c": [
    "active",
    "dias_para_vencer",
    "dueno_default",
    "lista_patron"
   ]
  },
  {
   "t": "clickup_tasks_mirror",
   "c": [
    "active",
    "date_created",
    "due_date",
    "folder_name",
    "id",
    "list_name",
    "name",
    "primary_assignee",
    "status_type"
   ]
  }
 ]
};
