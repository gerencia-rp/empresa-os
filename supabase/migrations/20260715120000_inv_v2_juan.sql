-- 💎 Portal del Inversor v2 — ajustes de Juan (15-jul). Aditivo, soft-delete, audit inmutable.
--  · inv_cashflow_real += factura_url (el "# factura" pasa a ser un LINK de Drive que no se pierde)
--  · inv_distributions += comprobante_url (soporte del pago ≠ K-1; el bug de Yeisson era que el
--    k1_url se guardaba pero la UI del admin no lo mostraba — ahora ambos links se guardan Y se ven)
--  · inv_audit: quién/cuándo/antes→después de CADA edición de movimientos y distribuciones,
--    escrito por trigger security definer (el front no puede saltearlo)

alter table inv_cashflow_real add column if not exists factura_url text;
alter table inv_distributions add column if not exists comprobante_url text;
alter table inv_cashflow_real add column if not exists updated_at timestamptz;
alter table inv_distributions add column if not exists updated_at timestamptz;

create table if not exists inv_audit (
  id bigint generated always as identity primary key,
  tabla text not null,             -- inv_cashflow_real | inv_distributions
  row_id uuid,
  accion text not null,           -- insert | update | archive
  antes jsonb,
  despues jsonb,
  editado_por text,
  at timestamptz default now()
);
alter table inv_audit enable row level security;
drop policy if exists inv_audit_read on inv_audit;
create policy inv_audit_read on inv_audit for select to authenticated using (has_area('fix-flip'));
-- inserta SOLO el trigger (security definer) — sin policy de escritura para usuarios

create or replace function trg_inv_audit() returns trigger
language plpgsql security definer set search_path = public as $$
declare who text;
begin
  who := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email', 'service');
  if tg_op = 'INSERT' then
    insert into inv_audit (tabla, row_id, accion, antes, despues, editado_por)
      values (tg_table_name, new.id, 'insert', null, to_jsonb(new), who);
    return new;
  else
    insert into inv_audit (tabla, row_id, accion, antes, despues, editado_por)
      values (tg_table_name, new.id,
        case when new.active = false and old.active then 'archive' else 'update' end,
        to_jsonb(old), to_jsonb(new), who);
    new.updated_at := now();
    return new;
  end if;
end $$;
drop trigger if exists inv_cashflow_real_audit on inv_cashflow_real;
create trigger inv_cashflow_real_audit before insert or update on inv_cashflow_real
  for each row execute function trg_inv_audit();
drop trigger if exists inv_distributions_audit on inv_distributions;
create trigger inv_distributions_audit before insert or update on inv_distributions
  for each row execute function trg_inv_audit();
