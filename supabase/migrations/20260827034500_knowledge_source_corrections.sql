-- Corrige nombres canónicos de fuentes en la memoria compartida.
-- inv_ledger es una RPC válida; las otras dos referencias usaban nombres viejos.
update public.agent_knowledge_domains
set fuentes='["ff_investors","inv_ledger (RPC)","inv_distributions","inv_documents","ff_deal_stage_history"]'::jsonb,
    updated_at=now()
where codigo='capital-inversionistas';

update public.agent_knowledge_domains
set fuentes='["ff_deals","v_ff_portafolio_kpi","v_pnl_casa","inv_ledger (RPC)","pm_informes:foto_ejecutiva_ff"]'::jsonb,
    updated_at=now()
where codigo='fix-flip';

update public.agent_knowledge_domains
set fuentes='["cron.job","agent_audit_log","lineage_coverage_runs","qb_report_cache","agent_registry"]'::jsonb,
    updated_at=now()
where codigo='sistemas-confiabilidad';
