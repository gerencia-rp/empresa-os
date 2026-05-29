-- ============================================================
-- S5-G8 · Vendor invoices con upload PDF
-- ============================================================

create table if not exists public.remodel_vendor_invoices (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.remodel_projects(id) on delete cascade,
  supplier_id uuid references public.remodel_suppliers(id) on delete set null,
  activity_code text,                        -- nullable: factura puede ser de varias actividades
  invoice_number text,
  invoice_date date default current_date,
  pdf_path text,                             -- path en storage bucket remodel-assets
  total_amount numeric not null default 0,
  tax_amount numeric default 0,
  subtotal numeric generated always as (greatest(total_amount - coalesce(tax_amount,0), 0)) stored,
  status text default 'pending' check (status in ('pending','reconciled','disputed','paid')),
  reconciled_actual_id uuid references public.remodel_actuals(id) on delete set null,
  notes text,
  uploaded_at timestamptz default now(),
  uploaded_by uuid references auth.users(id)
);

create index if not exists remodel_invoices_project on public.remodel_vendor_invoices(project_id);
create index if not exists remodel_invoices_status on public.remodel_vendor_invoices(status);
create index if not exists remodel_invoices_supplier on public.remodel_vendor_invoices(supplier_id);

-- Vista: agregado por proyecto (cuántas facturas, cuánto total, cuánto reconciliado)
create or replace view public.remodel_invoices_summary as
select
  project_id,
  count(*) as total_invoices,
  count(*) filter (where status = 'reconciled') as reconciled_count,
  count(*) filter (where status = 'pending') as pending_count,
  count(*) filter (where status = 'disputed') as disputed_count,
  sum(total_amount) as total_amount,
  sum(total_amount) filter (where status = 'reconciled') as reconciled_amount,
  sum(total_amount) filter (where status = 'pending') as pending_amount
from public.remodel_vendor_invoices
group by project_id;

-- RLS
alter table public.remodel_vendor_invoices enable row level security;

drop policy if exists rvi_select on public.remodel_vendor_invoices;
create policy rvi_select on public.remodel_vendor_invoices for select using (auth.role()='authenticated');
drop policy if exists rvi_write on public.remodel_vendor_invoices;
create policy rvi_write on public.remodel_vendor_invoices for all using (auth.role()='authenticated') with check (auth.role()='authenticated');

-- Smoke test
-- select * from public.remodel_invoices_summary;
