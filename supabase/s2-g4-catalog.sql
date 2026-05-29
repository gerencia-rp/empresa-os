-- ============================================================
-- S2-G4 · Catálogo editable de actividades
-- Mueve RM_CATALOG hardcodeado (70 items) a tabla editable por usuario.
-- Cualquier operador puede agregar/editar/desactivar actividades sin tocar código.
-- ============================================================

create table if not exists public.remodel_catalog_items (
  code text primary key,
  phase text not null check (phase in ('1','2','3','4','5','6')),
  subcat text,
  description text not null,
  unit text not null,
  vu_default numeric not null default 0,        -- precio unitario por defecto
  mat_pct numeric not null default 0.5,         -- % materiales (0..1)
  days_per_qty numeric not null default 0,      -- días por unidad
  multiplicable bool default false,             -- ej. baños se multiplican
  depends_on text[] default '{}',               -- placeholder para Sprint 3 (CPM)
  active bool default true,
  is_seed bool default false,                   -- viene del seed inicial vs custom user
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid references auth.users(id)
);

create index if not exists remodel_catalog_phase on public.remodel_catalog_items(phase) where active;
create index if not exists remodel_catalog_active on public.remodel_catalog_items(active);

-- Trigger updated_at
create or replace function public.tg_remodel_catalog_touch()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_remodel_catalog_touch on public.remodel_catalog_items;
create trigger trg_remodel_catalog_touch before update on public.remodel_catalog_items
  for each row execute function public.tg_remodel_catalog_touch();

-- RLS — todo authenticated puede leer; solo authenticated puede escribir
alter table public.remodel_catalog_items enable row level security;

drop policy if exists rci_select on public.remodel_catalog_items;
create policy rci_select on public.remodel_catalog_items for select using (auth.role()='authenticated');

drop policy if exists rci_write on public.remodel_catalog_items;
create policy rci_write on public.remodel_catalog_items for all using (auth.role()='authenticated') with check (auth.role()='authenticated');

-- ============================================================
-- SEED: 70 items originales del RM_CATALOG hardcodeado
-- Marcados con is_seed=true. Safe re-run (upsert por code).
-- ============================================================

insert into public.remodel_catalog_items (code, phase, subcat, description, unit, vu_default, mat_pct, days_per_qty, multiplicable, is_seed) values
  -- 1. DEMOLICIÓN
  ('1.1.1','1','Demoliciones','Floor demolition - gut to studs','sqft',0.50,0.10,0.005,false,true),
  ('1.1.3','1','Demoliciones','Kitchen tearout (cabinets, countertops, appliances)','unit',600,0.10,1,false,true),
  ('1.1.4','1','Demoliciones','Bathroom tearout (full demolition)','unit',500,0.10,1,false,true),
  ('1.1.6','1','Demoliciones','Drywall removal','sqft',0.40,0.10,0.0015,false,true),
  ('1.1.7','1','Demoliciones','Top demolition concrete (entrance/backyard)','sqft',1.50,0.15,0.005,false,true),
  ('1.1.8','1','Demoliciones','Wall removal - load bearing','sqft',25,0.15,0.05,false,true),
  ('1.1.9','1','Disposición','Dumpster rental (per load)','load',450,1.0,0,false,true),
  ('1.1.12','1','Disposición','Disposal/dump fees per truckload','load',150,1.0,0,false,true),
  ('1.1.11','1','Preliminares','Site protection, plastic, signage','project',300,0.50,1,false,true),
  ('1.1.10','1','Disposición','Debris hauling','project',600,0.20,3,false,true),
  -- 2. CIMENTACIÓN
  ('2.1.4','2','Reparación','Foundation crack repair (basic settling)','project',10000,0.10,5,false,true),
  ('2.2.6','2','Concreto','Concrete slab repair (per unit)','unit',71.43,0.60,0.5,false,true),
  ('2.2.1','2','Concreto','Site excavation and grading','project',1800,0.20,2,false,true),
  ('2.1.1','2','Reparación','Foundation evaluation and inspection','project',500,0.0,2,false,true),
  ('2.2.9','2','Concreto','Waterproofing system (foundation)','project',2200,0.55,4,false,true),
  -- 3. EXTERIOR
  ('3.1.1','3','Cubierta','Roof replacement (architectural shingles)','roof',14000,0.50,4,false,true),
  ('3.1.2','3','Cubierta','Roof underlayment and flashing','roof',2200,0.60,1,false,true),
  ('3.1.3','3','Cubierta','Gutters and downspouts','lin_ft',12,0.55,0.02,false,true),
  ('3.4.1','3','Fachada','Siding replacement (Hardieboard fiber cement)','sqft',8.50,0.55,0.01,false,true),
  ('3.4.3','3','Fachada','Exterior paint (whole house, full prep)','house',5500,0.30,5,false,true),
  ('3.5.1','3','Puertas','Front entry door (premium)','door',1800,0.70,1,false,true),
  ('3.5.2','3','Puertas','Secondary exterior doors (back/side)','door',900,0.70,1,false,true),
  ('3.6.1','3','Urbanismo','Concrete patio installation','sqft',18,0.50,0.04,false,true),
  ('3.13.1','3','Urbanismo','Driveway repair/resurfacing','project',5500,0.50,3,false,true),
  ('3.14.1','3','Urbanismo','Wood fence (perimeter)','lin_ft',35,0.50,0.04,false,true),
  ('3.15.1','3','Urbanismo','Landscaping and sod (full refresh)','project',3500,0.35,2,false,true),
  ('3.7.1','3','Fachada','Window replacement (energy-efficient, all)','house',9000,0.70,3,false,true),
  ('3.16.1','3','Fachada','Wood replacement columns','unit',300,0.55,0.5,false,true),
  -- 4. ESTRUCTURA
  ('4.1.2','4','Estructura','Wood framing (structural carpentry, whole house)','sqft',6,0.55,0.005,false,true),
  ('4.1.3','4','Estructura','Steel beam / load-bearing modification','beam',3500,0.55,2,false,true),
  ('4.1.4','4','Estructura','Roof framing / truss repair','sqft',8,0.55,0.005,false,true),
  ('4.1.5','4','Estructura','Sub-floor installation (new)','sqft',4.5,0.60,0.003,false,true),
  ('4.2.1','4','Permisos','Building permits (whole house remodel)','project',1500,0.0,0,false,true),
  ('4.2.2','4','Permisos','Architect / structural engineer fees','project',2500,0.0,0,false,true),
  ('4.2.3','4','Permisos','General contractor management (overhead)','project',0,0.0,0,false,true),
  -- 5. INTERNO — Muros / Techo / Aislamiento
  ('5.1.1','5','Muros','Drywall installation/replacement','sqft',3.50,0.45,0.005,false,true),
  ('5.1.2','5','Muros','Interior painting (whole house)','sqft',1.40,0.25,0.012,false,true),
  ('5.1.3','5','Muros','Insulation - wall batts','sqft',1.80,0.55,0.004,false,true),
  ('5.2.1','5','Techo','Crown molding installation','lin_ft',8,0.50,0.02,false,true),
  ('5.2.3','5','Techo','Insulation - blown-in attic','sqft',1.50,0.55,0.002,false,true),
  -- 5. INTERNO — Baños (multiplicables)
  ('5.3.1','5','Baños','Bathroom tile (floor + walls)','sqft',18,0.50,0.04,true,true),
  ('5.3.2','5','Baños','Custom shower install','unit',2800,0.55,2,true,true),
  ('5.3.3','5','Baños','Glass enclosure shower','unit',1200,0.70,1,true,true),
  ('5.3.4','5','Baños','Bathroom accessories (medicine cabinet, mirror, towel bars)','set',400,0.85,0.5,true,true),
  ('5.3.5','5','Baños','Vanity + countertop','unit',1100,0.75,1,true,true),
  ('5.3.6','5','Baños','Toilet replacement','unit',380,0.70,0.5,true,true),
  -- 5. INTERNO — Cocina
  ('5.4.1','5','Cocina','Kitchen cabinets (semi-custom)','lin_ft',280,0.70,0.15,false,true),
  ('5.4.2','5','Cocina','Kitchen countertops (quartz)','sqft',75,0.75,0.05,false,true),
  ('5.4.3','5','Cocina','Tile backsplash','sqft',22,0.50,0.05,false,true),
  ('5.4.4','5','Cocina','Kitchen sink + faucet','unit',550,0.80,0.5,false,true),
  ('5.4.5','5','Cocina','Kitchen island construction','unit',2200,0.55,2,false,true),
  ('5.4.6','5','Cocina','Appliances (stove/fridge/dishwasher/microwave)','set',4500,0.95,0.5,false,true),
  -- 5. INTERNO — Pisos
  ('5.6.1','5','Pisos','Flooring installation (LVP)','sqft',5.50,0.60,0.008,false,true),
  ('5.6.2','5','Pisos','Carpet installation (bedrooms)','sqft',3.50,0.55,0.005,false,true),
  ('5.6.3','5','Pisos','Baseboards installation','lin_ft',5,0.50,0.015,false,true),
  -- 5. INTERNO — Carpintería
  ('5.8.1','5','Carpintería','Interior doors replacement','door',380,0.65,0.5,false,true),
  ('5.8.2','5','Carpintería','Closet shelving','closet',300,0.60,0.5,false,true),
  -- 5. INTERNO — Redes Eléctricas
  ('5.1.4','5','Redes Eléctricas','Outlets and switches (interior)','house',900,0.40,1,false,true),
  ('5.1.5','5','Redes Eléctricas','Electrical panel upgrade','panel',3500,0.50,2,false,true),
  ('5.1.6','5','Redes Eléctricas','Rewire whole house','house',9000,0.35,5,false,true),
  ('5.1.7','5','Redes Eléctricas','Light fixtures + ceiling fans','house',1200,0.55,1,false,true),
  ('5.1.9','5','Redes Eléctricas','Smoke and CO detectors (hardwired)','house',350,0.55,1,false,true),
  -- 5. INTERNO — Plomería
  ('5.2.1p','5','Plomería','Whole-house repipe (PEX)','house',11000,0.40,6,false,true),
  ('5.2.2p','5','Plomería','Sewer line replacement (main)','house',6500,0.40,5,false,true),
  ('5.2.3p','5','Plomería','Water heater replacement','unit',2200,0.70,1,false,true),
  ('5.2.4p','5','Plomería','Plumbing fixtures (sinks, faucets, etc.)','house',1200,0.55,2,false,true),
  -- 5. INTERNO — HVAC
  ('5.5.1h','5','HVAC','HVAC system replacement (AC + furnace + ducts)','house',13000,0.70,4,false,true),
  ('5.5.2h','5','HVAC','HVAC repair / 1 unit only','unit',6500,0.70,2,false,true),
  -- 6. LIMPIEZA
  ('6.1.1','6','Acabados finales','Touch-up painting and repairs','project',800,0.30,1,false,true),
  ('6.2.1','6','Cierre','Punch list completion','project',600,0.10,2,false,true),
  ('6.2.2','6','Cierre','City final inspection fees','inspection',250,0.0,1,false,true),
  ('6.2.3','6','Cierre','Move-in deep clean','house',600,0.10,2,false,true),
  ('6.3.1','6','Limpieza final','Final construction cleanup','sqft',0.45,0.10,0.001,false,true),
  ('6.3.2','6','Limpieza final','Deep cleaning (interior + exterior)','house',800,0.10,1,false,true)
on conflict (code) do update set
  phase = excluded.phase,
  subcat = excluded.subcat,
  description = excluded.description,
  unit = excluded.unit,
  vu_default = excluded.vu_default,
  mat_pct = excluded.mat_pct,
  days_per_qty = excluded.days_per_qty,
  multiplicable = excluded.multiplicable,
  is_seed = true,
  updated_at = now();

-- Smoke test
-- select phase, count(*) as items from public.remodel_catalog_items where active group by 1 order by 1;
