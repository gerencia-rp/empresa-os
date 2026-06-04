-- Campañas WhatsApp masivas + tracking de respuestas
-- Cada campaña selecciona estudiantes (filtros) y genera mensajes personalizados
-- con IA. Las respuestas del estudiante se capturan manualmente o vía webhook
-- y la IA puede actualizar el plan automáticamente.

create table if not exists public.edu_whatsapp_campaigns (
  id uuid primary key default gen_random_uuid(),
  mentorship_id text references public.edu_mentorships(id) on delete cascade,
  name text not null,
  prompt_template text,                       -- prompt para generar mensaje (Claude lo personaliza por estudiante)
  filtros jsonb default '{}'::jsonb,          -- {etapa, grupo, status, inactivos_dias, ...}
  status text default 'draft' check (status in ('draft','generating','ready','sending','completed','archived')),
  total_recipients int default 0,
  sent_count int default 0,
  responded_count int default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.edu_whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.edu_whatsapp_campaigns(id) on delete cascade,
  student_id uuid references public.edu_students(id) on delete cascade,
  phone text,                                 -- snapshot del teléfono al momento del envío
  message_text text not null,                 -- mensaje personalizado generado por IA
  status text default 'pending' check (status in ('pending','sent','responded','no_response','failed')),
  sent_at timestamptz,
  response_text text,                         -- respuesta del estudiante
  response_at timestamptz,
  response_analysis jsonb,                    -- {sentimiento, intencion, accion_sugerida, plan_updates}
  plan_updated boolean default false,
  notes text,
  created_at timestamptz default now()
);

create index if not exists ewm_campaign on public.edu_whatsapp_messages(campaign_id);
create index if not exists ewm_student on public.edu_whatsapp_messages(student_id);
create index if not exists ewm_status on public.edu_whatsapp_messages(status);

alter table public.edu_whatsapp_campaigns enable row level security;
alter table public.edu_whatsapp_messages enable row level security;

drop policy if exists ewc_select on public.edu_whatsapp_campaigns;
create policy ewc_select on public.edu_whatsapp_campaigns for select using (auth.role() = 'authenticated');
drop policy if exists ewc_write on public.edu_whatsapp_campaigns;
create policy ewc_write on public.edu_whatsapp_campaigns for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists ewm_select on public.edu_whatsapp_messages;
create policy ewm_select on public.edu_whatsapp_messages for select using (auth.role() = 'authenticated');
drop policy if exists ewm_write on public.edu_whatsapp_messages;
create policy ewm_write on public.edu_whatsapp_messages for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- RPC para incrementar responded_count atómico
create or replace function public.increment_campaign_responded(p_campaign_id uuid)
returns void language plpgsql as $$
begin
  update public.edu_whatsapp_campaigns
    set responded_count = coalesce(responded_count, 0) + 1,
        updated_at = now()
  where id = p_campaign_id;
end$$;
grant execute on function public.increment_campaign_responded(uuid) to authenticated;

-- Sistema visible en el área de Educación
-- Detecta automáticamente el id real del area (puede ser 'education' o 'educacion')
do $$
declare
  edu_area_id text;
begin
  select id into edu_area_id from public.areas
    where id in ('education','educacion') or lower(name) like 'educaci%'
    limit 1;
  if edu_area_id is null then
    raise notice 'No existe area de Educación. Saltando insert del sistema.';
    return;
  end if;
  insert into public.systems (id, area_id, type, name, icon, description, config, data, position)
  values ('edu-whatsapp-mgr', edu_area_id, 'edu-whatsapp', 'WhatsApp Masivo IA', '💬',
    'Mensajes masivos personalizados con IA basados en etapa y plan del estudiante. Captura respuestas y actualiza el plan.',
    '{}'::jsonb, '{}'::jsonb, 5)
  on conflict (id) do nothing;
end$$;
