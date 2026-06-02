// ============================================================
// S9-E · Edge Function: pm-coaching-prompts
// Cada lunes 7:30am: Claude genera 5-10 sugerencias de coaching para el CEO
// basándose en la performance de cada persona + alertas + dailies.
// Las guarda en pm_coaching_prompts y manda resumen al CEO via WhatsApp.
// ============================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, authorization'
};

const SYSTEM_PROMPT = `Sos el copiloto del CEO de Rental Profitss para coaching del equipo.

Te paso el estado de TODO el equipo (performance scores última semana + tareas open + alertas + dailies). Tu job: armar el "playbook de coaching de la semana" — qué decirle a cada persona, ordenado por urgencia.

REGLAS:
- Respondé JSON: { "prompts": [{recipient_clickup_username, type, title, message, priority, evidence}] }
- Tipos: feedback | recognition | intervention | learning | reassignment
- Máximo 10 prompts. Prioridad: 'urgent' las que requieren acción esta semana, 'high' importantes pero no urgentes
- message: lo que el CEO le diría literalmente (max 50 palabras, rioplatense, directo, constructivo)
- evidence: array de 1-3 datos concretos que respaldan ("score bajó de 78 a 62", "3 tasks vencidas en obra Picnic", etc)

EJEMPLOS:
- Recognition: alguien con score >85 + streak 3+ semanas
- Intervention: score <60 o tendencia down 2 semanas seguidas
- Reassignment: alguien con >30 tasks abiertas y baja performance
- Feedback: cosas medias que se pueden ajustar (lead time alto, tareas vencidas específicas)
- Learning: alguien que necesita capacitación o tiene un gap claro

Sé práctico, no genérico. Nada de "comunicar mejor" — decir literalmente qué hacer/decir.`;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  const supaUrl = Deno.env.get('SUPABASE_URL') || '';
  const supaKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!apiKey) {
    return new Response(JSON.stringify({ ok: false, error: 'ANTHROPIC_API_KEY no configurado' }), {
      status: 500, headers: { ...CORS, 'content-type': 'application/json' }
    });
  }

  const sb = createClient(supaUrl, supaKey);

  // Esta semana
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(monday.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  const weekStart = monday.toISOString().split('T')[0];

  // Cargar el leaderboard de performance + alertas + dailies
  const [leaderboard, alerts, dailies, recipients] = await Promise.all([
    sb.from('pm_performance_leaderboard').select('*'),
    sb.from('clickup_alerts').select('related_assignee, severity').is('resolved_at', null),
    sb.from('pm_daily_assignments').select('recipient_id, tasks_total, tasks_done').gte('assigned_date', weekStart),
    sb.from('pm_whatsapp_recipients').select('id, full_name, clickup_username, active').eq('active', true)
  ]);

  // Agregar para alimentar Claude
  const context = {
    week_start: weekStart,
    leaderboard: leaderboard.data,
    alerts_by_person: aggregateAlerts(alerts.data || []),
    dailies_by_person: aggregateDailies(dailies.data || [], recipients.data || [])
  };

  // Claude
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `<context>\n${JSON.stringify(context, null, 2)}\n</context>\n\nGeneré el playbook de coaching de esta semana. Solo JSON.` }]
    })
  });

  if (!resp.ok) {
    return new Response(JSON.stringify({ ok: false, error: 'Anthropic: ' + await resp.text() }), {
      status: resp.status, headers: { ...CORS, 'content-type': 'application/json' }
    });
  }

  const claude = await resp.json();
  const text = (claude.content || []).map((c: any) => c.type === 'text' ? c.text : '').join('');
  let parsed: any = { prompts: [] };
  try {
    const match = text.match(/\{[\s\S]*\}/);
    parsed = match ? JSON.parse(match[0]) : { prompts: [] };
  } catch {}

  const prompts = parsed.prompts || [];

  // Mapear clickup_username → recipient_id y guardar
  const inserts = [];
  for (const p of prompts) {
    const r = (recipients.data || []).find((x: any) => x.clickup_username === p.recipient_clickup_username);
    if (!r) continue;
    inserts.push({
      week_start: weekStart,
      recipient_id: r.id,
      prompt_type: p.type || 'feedback',
      title: p.title || 'Coaching sugerido',
      message: p.message || '',
      evidence: p.evidence || [],
      priority: p.priority || 'normal',
      delivered: false
    });
  }
  if (inserts.length > 0) {
    await sb.from('pm_coaching_prompts').insert(inserts);
  }

  // Mandar resumen al CEO via WhatsApp (buscar el "pm" o admin)
  const { data: ceoRecipient } = await sb.from('pm_whatsapp_recipients')
    .select('phone_number')
    .eq('role', 'pm')
    .eq('active', true)
    .limit(1)
    .maybeSingle();

  if (ceoRecipient?.phone_number && inserts.length > 0) {
    const summary = inserts.slice(0, 5).map((p, i) => `${i+1}. ${prioEmoji(p.priority)} ${p.title}\n   ${p.message.slice(0, 100)}…`).join('\n\n');
    const total = inserts.length;
    const body = `🎯 *Coaching playbook* — semana del ${weekStart}\n\n${total} sugerencias generadas. Top 5:\n\n${summary}\n\n📊 Ver todas en Dashboard PM → Coaching IA`;
    await fetch(`${supaUrl}/functions/v1/whatsapp-send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supaKey}` },
      body: JSON.stringify({ to: ceoRecipient.phone_number, type: 'text', text: body })
    });
  }

  return new Response(JSON.stringify({
    ok: true,
    prompts_generated: inserts.length,
    week_start: weekStart,
    cost_tokens: (claude.usage?.input_tokens || 0) + (claude.usage?.output_tokens || 0)
  }), { headers: { ...CORS, 'content-type': 'application/json' } });
});

function aggregateAlerts(alerts: any[]) {
  const m: Record<string, number> = {};
  alerts.forEach(a => { if (a.related_assignee) m[a.related_assignee] = (m[a.related_assignee] || 0) + 1; });
  return m;
}

function aggregateDailies(dailies: any[], recipients: any[]) {
  const m: Record<string, { total: number; done: number; pct: number; days: number }> = {};
  dailies.forEach(d => {
    const r = recipients.find(x => x.id === d.recipient_id);
    if (!r) return;
    const k = r.clickup_username;
    if (!m[k]) m[k] = { total: 0, done: 0, pct: 0, days: 0 };
    m[k].total += d.tasks_total;
    m[k].done += d.tasks_done;
    m[k].days++;
  });
  Object.values(m).forEach(v => { v.pct = v.total > 0 ? Math.round(v.done / v.total * 100) : 0; });
  return m;
}

function prioEmoji(p: string) {
  return p === 'urgent' ? '🚨' : p === 'high' ? '⚠️' : p === 'low' ? 'ℹ️' : '📌';
}
