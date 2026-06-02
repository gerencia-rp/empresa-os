-- ============================================================
-- Presentaciones generadas con IA + web search (data live)
-- ============================================================

create table if not exists public.edu_presentations (
  id uuid primary key default gen_random_uuid(),
  mentorship_id text references public.edu_mentorships(id) on delete cascade,
  -- Input
  title text not null,
  topic text,
  audience text,
  presentation_type text default 'class' check (presentation_type in ('class','workshop','webinar','keynote')),
  class_number int,
  duration_min int,
  language text default 'es',
  -- Estructura generada
  outline jsonb default '[]'::jsonb,
  slides jsonb default '[]'::jsonb,
  -- [{
  --   "number": 1,
  --   "title": "...",
  --   "subtitle": "...",
  --   "bullets": ["..."],
  --   "speaker_notes": "...",
  --   "layout": "title|content|two-column|chart|quote|stats|closing",
  --   "stats": [{label, value, source_url}],
  --   "sources": [{title, url, accessed_at}],
  --   "chart_data": {...}
  -- }]
  sources jsonb default '[]'::jsonb,
  -- Meta
  status text default 'draft' check (status in ('draft','generated','edited','published','archived')),
  cost_tokens_used int,
  web_searches_used int,
  generated_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists edu_pres_mentorship on public.edu_presentations(mentorship_id);
create index if not exists edu_pres_recent on public.edu_presentations(updated_at desc);

alter table public.edu_presentations enable row level security;
drop policy if exists edu_pres_all on public.edu_presentations;
create policy edu_pres_all on public.edu_presentations for all using (auth.role()='authenticated') with check (auth.role()='authenticated');
