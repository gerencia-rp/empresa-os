// ============================================================
// S7-B · Edge Function: clickup-ai-agent
// Corre Claude sobre el último snapshot + tasks, genera propuestas concretas
// en clickup_ai_proposals con payload ejecutable.
//
// Deploy:
//   supabase functions deploy clickup-ai-agent --no-verify-jwt --use-api
//
// Secrets:
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxx
//
// Body (opcional):
// { "force": false, "max_proposals": 5 }
// ============================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, authorization'
};

const SYSTEM_PROMPT = `Sos el agente IA del Dashboard ClickUp de Rental Profitss (empresa de remodelación Austin TX).

Te paso un snapshot agregado de la operación + lista resumida de tasks. Tu rol es proponer ACCIONES CONCRETAS que mejoren la eficiencia.

REGLAS:
- Solo respondés con JSON válido: { "proposals": [...] }
- Cada propuesta tiene: type, title, rationale, action_payload, target_task_id (opcional), confidence (0-100)
- Tipos válidos: reassign | close | create | notify | automate
- Sé conservador: máximo 5 propuestas, solo las más claras
- Rationale corto (~30 palabras) explicando el "por qué"
- action_payload debe ser un objeto ejecutable directamente

EJEMPLOS DE PROPUESTAS BUENAS:
- type=close, target_task_id="X", action_payload={"comment":"Cerrada: 67d sin actividad"}, rationale="Task viene de un proyecto ya finalizado y sigue abierta. Distrae mentalmente."
- type=reassign, action_payload={"from":"Michell","to":"Diego","task_ids":[...]}, rationale="Michell tiene 38 abiertas vs promedio 12. Diego tiene 4. Re-balanceo urgente."
- type=automate, action_payload={"task_name":"Bitácoras Semanales","cron":"0 8 * * MON","template":"weekly_bitacora"}, rationale="Recurrente con 45% completitud. Automatizar evita el slip manual."

Sé práctico, no propongas cosas vagas como "revisar el flujo".`;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  try {
    const body = await req.json().catch(() => ({}));
    const { max_proposals = 5 } = body || {};

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    const supaUrl = Deno.env.get('SUPABASE_URL') || '';
    const supaKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    if (!apiKey) {
      return new Response(JSON.stringify({ ok: false, error: 'ANTHROPIC_API_KEY no configurado' }), {
        status: 500, headers: { ...CORS, 'content-type': 'application/json' }
      });
    }

    const sb = createClient(supaUrl, supaKey);

    // 1) Cargar último snapshot + tasks resumidas + alertas
    const [snap, tasks, alerts] = await Promise.all([
      sb.from('clickup_snapshots').select('*').order('snapshot_date', { ascending: false }).limit(1).single(),
      sb.from('clickup_tasks_mirror').select('id,name,status,status_type,priority,primary_assignee,due_date,folder_name,fase').limit(500),
      sb.from('clickup_alerts').select('*').is('resolved_at', null)
    ]);

    if (!snap.data) {
      return new Response(JSON.stringify({ ok: false, error: 'No hay snapshot todavía. Corré sync-clickup primero.' }), {
        status: 400, headers: { ...CORS, 'content-type': 'application/json' }
      });
    }

    // 2) Armar contexto para Claude
    const context = {
      snapshot: snap.data,
      alerts_count: (alerts.data || []).length,
      critical_alerts: (alerts.data || []).filter(a => a.severity === 'critical').slice(0, 10),
      tasks_sample: (tasks.data || []).slice(0, 100), // sample para no saturar
      tasks_total: (tasks.data || []).length,
      max_proposals
    };

    // 3) Llamar Claude
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2500,
        system: SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: `<context>\n${JSON.stringify(context, null, 2)}\n</context>\n\nGenerá hasta ${max_proposals} propuestas accionables. Solo JSON: { "proposals": [...] }`
        }]
      })
    });

    if (!resp.ok) {
      const err = await resp.text();
      return new Response(JSON.stringify({ ok: false, error: 'Anthropic: ' + err }), {
        status: resp.status, headers: { ...CORS, 'content-type': 'application/json' }
      });
    }

    const claude = await resp.json();
    const text = (claude.content || []).map((c: { type: string; text?: string }) => c.type === 'text' ? c.text : '').join('');
    // Extraer JSON del response (Claude a veces lo envuelve en ```json)
    let parsed: { proposals?: Array<Record<string, unknown>> } = {};
    try {
      const match = text.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : { proposals: [] };
    } catch {
      parsed = { proposals: [] };
    }

    const proposals = parsed.proposals || [];

    // 4) Guardar propuestas en clickup_ai_proposals
    const inserts = proposals.map((p) => ({
      proposal_type: String(p.type || 'notify'),
      title: String(p.title || 'Sin título'),
      rationale: String(p.rationale || ''),
      current_state: { snapshot_date: snap.data.snapshot_date },
      proposed_state: p.action_payload || {},
      action_payload: p.action_payload || {},
      status: 'pending'
    }));

    let inserted = 0;
    if (inserts.length) {
      const { error } = await sb.from('clickup_ai_proposals').insert(inserts);
      if (!error) inserted = inserts.length;
    }

    // 5) Guardar el resumen en weekly_insights (semana actual)
    const monday = new Date();
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    const weekStart = monday.toISOString().split('T')[0];

    await sb.from('clickup_weekly_insights').upsert({
      week_start: weekStart,
      summary_md: text.slice(0, 5000),
      automation_candidates: proposals.filter((p) => p.type === 'automate'),
      bottlenecks: proposals.filter((p) => ['reassign','close'].includes(String(p.type || ''))),
      recommendations: proposals,
      cost_tokens_used: (claude.usage?.input_tokens || 0) + (claude.usage?.output_tokens || 0)
    }, { onConflict: 'week_start' });

    return new Response(JSON.stringify({ ok: true, proposals_generated: inserted, week_start: weekStart }), {
      headers: { ...CORS, 'content-type': 'application/json' }
    });

  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500, headers: { ...CORS, 'content-type': 'application/json' }
    });
  }
});
