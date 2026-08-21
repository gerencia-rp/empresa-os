// ════════════════════════════════════════════════════════════════════
// 🧠 CEREBRO — asistente central del negocio Rental Profitss (omnipresente)
//
// Experto en TODO el holding: Fix & Flip, Remodelación, Rentas (PM),
// Portal del Inversor y FlipMentoría. Responde SIMPLE ("como a un niño"),
// SOLO LECTURA, citando NÚMEROS REALES de las fuentes únicas (un dato,
// una fuente). Nunca ejecuta pagos ni write-backs; si algo requiere una
// acción con efectos, la describe y pide confirmación a un humano.
//
// Reusa el patrón de remodel-ai / ai-deep-analyze:
//   - requireAuth (JWT del usuario)  → _shared/auth.ts
//   - CORS whitelist                 → _shared/cors.ts
//   - callAnthropic (retry+log)      → _shared/anthropic.ts
//   - ANTHROPIC_API_KEY de secrets   → jamás hardcodeada
//
// El snapshot del negocio se arma SERVER-SIDE con service role, leyendo
// las MISMAS vistas/RPC que la app (v_holding_pnl, v_cartera_kpi,
// v_ocupacion, v_ff_portafolio_kpi, ff_deals.deficit_total,
// v_remodel_avance_vivo, inv_*). El Cerebro NO recalcula: lee la fuente.
//
// Deploy:
//   supabase functions deploy cerebro --no-verify-jwt --use-api
// ════════════════════════════════════════════════════════════════════
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { requireAuth } from "../_shared/auth.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { callAnthropic, extractText, checkRateLimit } from "../_shared/anthropic.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MODEL = Deno.env.get("CEREBRO_MODEL") || "claude-opus-4-8";
const MAX_TOKENS = 1600;
const MAX_HISTORY = 8;

// ─── Snapshot del negocio (fuentes únicas, solo lectura) ───
async function buildSnapshot(sb: any) {
  const snap: any = { negocio: "Rental Profitss — holding inmobiliario en Austin TX", generado: new Date().toISOString() };

  const safe = async (fn: () => Promise<any>) => { try { return await fn(); } catch { return null; } };

  const [
    holding, ocup, cartera, morosos, ffKpi, deficitRows, remAgg, remAtras, invDist, invHold, memoria
  ] = await Promise.all([
    safe(() => sb.from("v_holding_pnl").select("empresa,ingreso,costo_real,overhead,utilidad_bruta,ebitda,realizado,inyectado")),
    safe(() => sb.from("v_ocupacion").select("*").maybeSingle()),
    safe(() => sb.from("v_cartera_kpi").select("*").maybeSingle()),
    safe(() => sb.from("v_cartera_inquilino").select("inquilino,casa,vencido_neto").gt("vencido_neto", 0).order("vencido_neto", { ascending: false }).limit(6)),
    safe(() => sb.from("v_ff_portafolio_kpi").select("*").maybeSingle()),
    safe(() => sb.from("ff_deals").select("address,deficit_total,stage").not("deficit_total", "is", null).order("deficit_total", { ascending: false })),
    safe(() => sb.from("v_remodel_avance_vivo").select("proceso,atrasada_cronograma,pct_tecnico")),
    safe(() => sb.from("v_remodel_avance_vivo").select("address,proceso,atraso_dias,pct_tecnico").eq("atrasada_cronograma", true).order("atraso_dias", { ascending: false }).limit(5)),
    safe(() => sb.from("inv_distributions").select("monto,estado").eq("active", true)),
    safe(() => sb.from("inv_holdings").select("inversion_aportada").eq("active", true)),
    safe(() => sb.from("pm_brain_memory").select("tipo,texto").eq("activo", true).order("fecha", { ascending: false }).limit(12)),
  ]);

  // Fix & Flip / patrimonio
  if (ffKpi?.data) {
    const k = ffKpi.data;
    snap.fix_and_flip = {
      casas_portafolio: k.casas_portafolio, valor_portafolio: k.valor_portafolio,
      deuda_portafolio: k.deuda_portafolio, equity_portafolio: k.equity_portafolio,
      flujo_operativo_anual: k.flujo_operativo_anual, neto_despues_deuda_anual: k.neto_despues_deuda_anual,
      en_renta: k.port_en_renta, en_rehab: k.port_en_rehab, adquiridas: k.port_adquiridas,
      entregadas_a_inversionista: k.entregadas_inversionista,
    };
  }

  // Déficit = caja atrapada (fuente ÚNICA: ff_deals.deficit_total). No recalcular.
  if (deficitRows?.data) {
    const rows = deficitRows.data;
    const total = rows.reduce((s: number, r: any) => s + (Number(r.deficit_total) || 0), 0);
    snap.deficit_caja_atrapada = {
      definicion: "Caja metida que aún NO se recuperó; se recupera al refinanciar o vender. Fuente única: ff_deals.deficit_total (Airtable).",
      total_portafolio: Math.round(total * 100) / 100,
      casas_con_deficit: rows.length,
      top_que_mas_drena: rows.slice(0, 6).map((r: any) => ({ casa: String(r.address || "").trim(), deficit: Number(r.deficit_total), estado: r.stage })),
      nota: "Casas en rehab/adquiridas sin deficit_total = aún no estabilizadas, no tienen número.",
    };
  }

  if (ocup?.data) snap.rentas_ocupacion = ocup.data;
  if (cartera?.data) {
    const c = cartera.data;
    snap.rentas_cartera = {
      vencido_neto: c.vencido_neto, por_cobrar_del_mes: c.por_cobrar_neto,
      saldo_a_favor: c.saldo_a_favor, morosos_reales: c.morosos_reales, casos: c.casos,
      nota: "vencido_neto = mora real (meses cerrados, ya neteado el saldo a favor). por_cobrar_del_mes NO es mora.",
    };
  }
  if (morosos?.data) snap.rentas_top_morosos = morosos.data.map((m: any) => ({ inquilino: m.inquilino, casa: m.casa, vencido: Number(m.vencido_neto) }));

  if (holding?.data) {
    snap.pnl_por_empresa = holding.data.reduce((o: any, r: any) => {
      o[r.empresa] = { ingreso: r.ingreso, costo_real: r.costo_real, overhead: r.overhead, utilidad_bruta: r.utilidad_bruta, ebitda: r.ebitda, realizado_ff: r.realizado, inyectado_ff: r.inyectado };
      return o;
    }, {});
  }

  if (remAgg?.data) {
    const r = remAgg.data;
    const enCurso = r.filter((x: any) => x.proceso !== "Finalizado");
    snap.remodelacion = {
      obras_totales: r.length,
      en_curso: enCurso.length,
      atrasadas: r.filter((x: any) => x.atrasada_cronograma).length,
      avance_promedio_en_curso_pct: enCurso.length ? Math.round(enCurso.reduce((s: number, x: any) => s + (Number(x.pct_tecnico) || 0), 0) / enCurso.length) : null,
    };
    if (remAtras?.data?.length) snap.remodelacion.obras_atrasadas = remAtras.data.map((x: any) => ({ casa: String(x.address || "").trim(), atraso_dias: x.atraso_dias, avance_pct: x.pct_tecnico }));
  }

  // Inversionistas
  const distPagadas = (invDist?.data || []).filter((d: any) => d.estado === "pagada");
  snap.inversionistas = {
    distribuciones_pagadas_n: distPagadas.length,
    distribuciones_pagadas_total: distPagadas.reduce((s: number, d: any) => s + (Number(d.monto) || 0), 0),
    capital_holdings_total: (invHold?.data || []).reduce((s: number, h: any) => s + (Number(h.inversion_aportada) || 0), 0),
  };

  if (memoria?.data?.length) snap.memoria_del_cerebro = memoria.data.map((m: any) => `[${m.tipo}] ${String(m.texto).slice(0, 240)}`);

  return snap;
}

function buildSystem(snap: any, screen: string) {
  const snapStr = JSON.stringify(snap, null, 0).slice(0, 55000);
  return `Sos el CEREBRO de Rental Profitss, un holding inmobiliario en Austin TX con tres negocios: Fix & Flip (compra/reforma/venta y hold), Remodelación (obra) y Rentas (property management), más el Portal del Inversor y FlipMentoría. Sos el "líder" que entiende los números reales y coordina el equipo.

CÓMO RESPONDÉS:
- En español rioplatense, claro y directo. Explicás TODO SIMPLE, como a alguien que NO sabe de finanzas: sin jerga, con ejemplos concretos y SIEMPRE el número real.
- Si usás una sigla o término técnico (NOI, DSCR, CoC, EBITDA, caja atrapada, cap rate), lo definís en una frase con palabras de todos los días.
- Conciso: apuntá al insight accionable. Nada de párrafos de relleno.

REGLAS DURAS:
- SOLO LECTURA. No ejecutás pagos, no escribís en Airtable/QuickBooks, no cambiás nada. Si te piden una acción con efectos (mandar un cobro, pagar, editar), la explicás en pasos y pedís que un humano la confirme y la haga en el módulo correspondiente.
- NÚMEROS REALES ÚNICAMENTE: usá SOLO las cifras del SNAPSHOT de abajo. NO inventes. Si no tenés el dato, decilo tal cual ("no tengo ese dato en los números actuales") en vez de suponer.
- "Un dato, una fuente": no recalcules con otra fórmula. Por ejemplo, el DÉFICIT (caja atrapada) es ff_deals.deficit_total y ya viene sumado; la MORA es vencido_neto; la ocupación viene de v_ocupacion. Usalos tal cual.
- Déficit = plata metida que todavía no se recuperó (se recupera al refinanciar o vender), NO es una pérdida. Casas en rehab/adquiridas sin déficit calculado = "aún no estabilizada", no inventes un número.
- Distinguí mora (meses cerrados) de "por cobrar del mes" (todavía no vencido, no es mora).

PANTALLA ACTUAL DEL USUARIO: ${screen || "no especificada"}. Si la pregunta es sobre lo que está viendo, priorizá ese contexto.

SNAPSHOT DE NÚMEROS REALES (fuentes únicas: Supabase vistas/RPC ← Airtable/QuickBooks):
${snapStr}`;
}

serve(async (req: Request) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: cors });

  const auth = await requireAuth(req);
  if (!auth.ok) return new Response(JSON.stringify({ error: auth.error }), { status: auth.status || 401, headers: cors });

  try {
    const body = await req.json().catch(() => ({}));
    const question = String(body?.question || "").trim();
    const screen = String(body?.screen || body?.pantalla || "").slice(0, 200);
    if (!question) return new Response(JSON.stringify({ error: "Falta la pregunta." }), { status: 400, headers: cors });

    // Rate limit: 40 llamadas / 10 min por usuario
    const rl = await checkRateLimit(auth.user_id, 10, 40);
    if (!rl.ok) return new Response(JSON.stringify({ error: "Muchas preguntas seguidas. Esperá un minuto y volvé a intentar." }), { status: 429, headers: cors });

    if (!Deno.env.get("ANTHROPIC_API_KEY")) {
      return new Response(JSON.stringify({ error: "El Cerebro no está configurado (falta ANTHROPIC_API_KEY en los secrets)." }), { status: 503, headers: cors });
    }

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    const snapshot = await buildSnapshot(sb);
    const system = buildSystem(snapshot, screen);

    const history = Array.isArray(body?.history)
      ? body.history.filter((m: any) => m && (m.role === "user" || m.role === "assistant") && m.content).slice(-MAX_HISTORY)
        .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 4000) }))
      : [];
    const messages = [...history, { role: "user", content: question }];

    const result = await callAnthropic({
      model: MODEL, max_tokens: MAX_TOKENS, system, messages,
      user_id: auth.user_id, feature: "cerebro", timeoutMs: 60000, maxRetries: 2,
    });

    if (!result.ok) {
      const low = /credit|balance|429|529|overloaded/i.test(result.error || "");
      return new Response(JSON.stringify({ error: low ? "El Cerebro no está disponible ahora (proveedor de IA sin cupo/créditos o saturado). Probá en un rato." : ("No pude responder: " + result.error) }), { status: result.status || 502, headers: cors });
    }

    const answer = extractText(result.data) || "No tengo una respuesta para eso.";
    return new Response(JSON.stringify({ answer, tokens_out: result.tokens_out }), { status: 200, headers: cors });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), { status: 500, headers: corsHeaders(req) });
  }
});
