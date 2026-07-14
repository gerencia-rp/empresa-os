-- Ranking de inversionistas (rediseño 14-jul): el capital del ranking es "Capital aportado"
-- (fldrePoqg3C3caiZ5) PURO — capital_inversionista quedó coalesced con "Capital del inversionista"
-- (fld2aby0lrH7iQNWw) y difiere en Stonleigh (45,000 vs 35,000 aportado). Columna nueva, sin pisar la vieja.
alter table ff_deals add column if not exists capital_aportado numeric;
