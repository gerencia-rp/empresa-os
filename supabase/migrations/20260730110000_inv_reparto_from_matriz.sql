-- B5 (CRÍTICO, obs Juan): el % del inversionista se sincronizaba de la columna EQUIVOCADA.
-- Airtable Flipping Rentals Matriz → Propiedades tiene DOS columnas percent:
--   flddh8bS7oP34ak1M "Porcentaje de Owner Ship"      → % que posee la EMPRESA (operador)
--   fldS7Jx6LgM19BXcY "Porcentaje del Inversionista"  → % del INVERSIONISTA  ← EL CORRECTO
-- El reparto (inv_holdings.reparto_pct) venía de ownership_pct (Owner Ship), a menudo el
-- COMPLEMENTO del real (ej. Stonleigh mostraba 60% cuando el inversionista tiene 40%).

alter table ff_deals add column if not exists investor_pct numeric;
comment on column ff_deals.investor_pct is 'Airtable Propiedades → "Porcentaje del Inversionista" (fldS7Jx6LgM19BXcY). Fuente CORRECTA del reparto. ownership_pct = "Owner Ship" (empresa), complementario — NO usar para reparto.';

-- Espeja el % correcto a inv_holdings.reparto_pct (y al param reparto_inv) desde ff_deals.investor_pct.
-- Airtable = fuente de verdad: cada sync re-deriva el reparto (los ajustes de % se hacen en Airtable).
create or replace function inv_reparto_from_deals()
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  update inv_holdings h set reparto_pct = d.investor_pct
    from ff_deals d
   where d.property_id = h.property_id and d.active and d.investor_pct is not null and h.active
     and h.reparto_pct is distinct from d.investor_pct;
  get diagnostics n = row_count;
  update inv_model_params p set value = d.investor_pct::text, updated_at = now()
    from ff_deals d
   where d.property_id = p.property_id and p.key = 'reparto_inv' and p.active and d.active and d.investor_pct is not null
     and p.value is distinct from d.investor_pct::text;
  return n;
end; $$;
