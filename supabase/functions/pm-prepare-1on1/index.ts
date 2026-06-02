// ============================================================
// S9-D · Edge Function: pm-prepare-1on1
// On-demand: Claude analiza la data de un recipient (performance, alertas,
// dailies, deps cross) y genera la agenda recomendada para el 1-on-1.
//
// Body: { "one_on_one_id": "uuid" }
// ============================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, authorization'
};

const SYSTEM_PROMPT = `Sos el copiloto de coaching del CEO de Rental Profitss (Austin TX).

Te paso los datos de UN miembro del equipo (performance últimas 4 semanas + tasks abiertas + alertas + dailies + dependencias) y vos preparás la agenda del 1-on-1 SEMANAL/QUINCENAL.

REGLAS:
- Respondé en JSON: { "agenda_md": "...", "talking_points": [{topic, why_now, data_evidence, suggested_question}] }
- agenda_md: markdown corto (max 600 palabras) con secciones:
  1. **Performance** (score actual + tendencia + 1 highlight + 1 area)
  2. **Lo crítico esta semana** (3-5 issues concretos con datos)
  3. **Reconocimiento** (qué reconocerle, si aplica)
  4. **Coaching action** (1 acción concreta para la persona esta semana)
  5. **Preguntas para entender contexto** (3 preguntas abiertas, no checklist)
- talking_points: 3-5 puntos máximo, ordenados por importancia
- Rioplatense, directo, sin jerga corporate. Sé constructivo no condescendiente.
- Si el score >85: foco en seguir creciendo, no en problemas.
- Si el score 70-85: 1-2 ajustes concretos.
- Si el score <70: intervención clara con plan a 2 semanas.`;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  const body = await req.json().catch(() => ({}));
  const { one_on_one_id } = body;

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  const supaUrl = Deno.env.get('SUPABASE_URL') || '';
  const supaKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!apiKey) {
    return new Response(JSON.stringify({ ok: false, error: 'ANTHROPIC_API_KEY no configurado' }), {
      status: 500, headers: { ...CORS, 'content-type': 'application/json' }
    });
  }

  const sb = createClient(supaUrl, supaKey);

  // 1-on-1 con recipient info
  const { data: oneOn } = await sb.from('pm_one_on_ones')
    .select('*, pm_whatsapp_recipients(*)')
    .eq('id', one_on_one_id)
    .single();

  if (!oneOn) {
    return new Response(JSON.stringify({ ok: false, error: '1-on-1 no encontrado' }), {
      status: 404, headers: { ...CORS, 'content-type': 'application/json' }
    });
  }

  const recipient = oneOn.pm_whatsapp_recipients;
  if (!recipient) {
    return new Response(JSON.stringify({ ok: false, error: 'recipient no encontrado' }), {
      status: 400, headers: { ...CORS, 'content-type': 'application/json' }
    });
  }

  // Cargar contexto: últimas 4 semanas de performance + tasks abiertas + dailies semana + alertas
  const fourWeeksAgo = new Date(Date.now() - 28 * 86400000).toISOString().split('T')[0];

  const [perfHist, openTasks, dailies, alerts, deps, prevOneOnOnes] = await Promise.all([
    sb.from('pm_performance_weekly').select('*, pm_companies(name, slug)').eq('recipient_id', recipient.id).gte('week_start', fourWeeksAgo).order('week_start', { ascending: false }),
    sb.from('clickup_tasks_mirror').select('id, name, status, priority, due_date, folder_name, company_id').eq('primary_assignee', recipient.clickup_username).neq('status_type', 'closed').limit(30),
    sb.from('pm_daily_assignments').select('assigned_date, tasks_total, tasks_done, tasks_carried_over').eq('recipient_id', recipient.id).gte('assigned_date', new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0]).order('assigned_date', { ascending: false }),
    sb.from('clickup_alerts').select('title, detail, severity').eq('related_assignee', recipient.clickup_username).is('resolved_at', null).limit(10),
    sb.from('pm_dependencies_cross').select('*').eq('resolved', false).or(`source_label.ilike.%${recipient.full_name}%,target_label.ilike.%${recipient.full_name}%`).limit(5),
    sb.from('pm_one_on_ones').select('scheduled_date, action_items, rating_engagement, rating_alignment').eq('recipient_id', recipient.id).eq('status', 'completed').order('scheduled_date', { ascending: false }).limit(3)
  ]);

  const context = {
    person: {
      name: recipient.full_name,
      role: recipient.role,
      areas: recipient.areas
    },
    performance_history: perfHist.data,
    open_tasks: openTasks.data,
    recent_dailies: dailies.data,
    open_alerts: alerts.data,
    cross_dependencies: deps.data,
    last_three_1on1s: prevOneOnOnes.data
  };

  // Llamar Claude
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2500,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `<context>\n${JSON.stringify(context, null, 2)}\n</context>\n\nPreparame el 1-on-1. Solo JSON.` }]
    })
  });

  if (!resp.ok) {
    return new Response(JSON.stringify({ ok: false, error: 'Anthropic: ' + await resp.text() }), {
      status: resp.status, headers: { ...CORS, 'content-type': 'application/json' }
    });
  }

  const claude = await resp.json();
  const text = (claude.content || []).map((c: any) => c.type === 'text' ? c.text : '').join('');
  let parsed: any = {};
  try {
    const match = text.match(/\{[\s\S]*\}/);
    parsed = match ? JSON.parse(match[0]) : { agenda_md: text };
  } catch { parsed = { agenda_md: text }; }

  await sb.from('pm_one_on_ones').update({
    ai_agenda_md: parsed.agenda_md || '',
    ai_talking_points: parsed.talking_points || [],
    ai_generated_at: new Date().toISOString(),
    ai_cost_tokens: (claude.usage?.input_tokens || 0) + (claude.usage?.output_tokens || 0)
  }).eq('id', one_on_one_id);

  return new Response(JSON.stringify({ ok: true, agenda_generated: true }), {
    headers: { ...CORS, 'content-type': 'application/json' }
  });
});
