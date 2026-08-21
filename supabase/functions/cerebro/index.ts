// ════════════════════════════════════════════════════════════════════
// 🧠 CEREBRO — asistente central del negocio Rental Profitss (omnipresente).
//
// UN solo asistente que combina el CEREBRO (números reales, verdad del holding)
// con la red de agentes de JARVIS (Agent Network). El Cerebro es el orquestador:
//   • Preguntas transversales / del holding → responde con su SNAPSHOT server-side
//     (fuentes únicas: v_holding_pnl, v_cartera_kpi, v_ocupacion, v_ff_portafolio_kpi,
//     ff_deals.deficit_total, v_remodel_avance_vivo, inv_*, pm_brain_memory).
//   • Preguntas de un ÁREA → DELEGA vía tool-use `consultar_agentes_area`, que lee el
//     PRODUCTO DE TRABAJO del agente correcto de esa área (último informe de pm_informes
//     + cola de propuestas de esa escuadra en agent_proposals + su roster) y lo traduce a
//     lenguaje simple, citando al agente. Los agentes de área son ejecutores batch (corren
//     por cron, escriben propuestas/informes); el Cerebro consume su salida, no los re-corre.
//
// SOLO LECTURA. Nunca ejecuta pagos ni write-backs. Puede PROPONER una acción (aprobar en
// /jarvis o en el módulo), nunca ejecutarla solo. Responde SIMPLE ("como a un niño") y define
// toda sigla. Reusa requireAuth + CORS + callAnthropic + ANTHROPIC_API_KEY (jamás hardcode).
//
// Deploy: npx supabase functions deploy cerebro --no-verify-jwt --use-api
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
const MAX_TOOL_ROUNDS = 3;

// ─── Mapa de áreas → escuadra + informes que produce su agente ───
const AREAS: Record<string, { squad: string; label: string; informes: string[]; findings?: boolean }> = {
  "fix-flip": { squad: "Escuadra Fix & Flip", label: "Fix & Flip (compra/reforma/venta, HML, inversionistas, underwriting)", informes: ["foto_ejecutiva_ff", "pipeline_ff"] },
  "rentas": { squad: "Escuadra Rentas", label: "Rentas / Property Management (cobranza, ocupación, aging)", informes: ["foto_ejecutiva_rentas", "ocupacion_semanal_rentas", "bitacora_semanal_rentas", "financiero_mensual_rentas", "mejora_mensual_rentas"] },
  "remodelacion": { squad: "Escuadra Remodelación", label: "Remodelación / obra (avance, draws, calidad)", informes: ["foto_ejecutiva_remodelacion", "avance_obra_remodelacion"] },
  "operacion": { squad: "Operación", label: "Operación (tareas, ClickUp, coordinación)", informes: [] },
  "contable": { squad: "Contable & Datos", label: "Contable / conciliación QBO + Sabueso (descuadres, datos)", informes: [], findings: true },
};

// ─── Snapshot transversal del negocio (fuentes únicas, solo lectura) ───
async function buildSnapshot(sb: any) {
  const snap: any = { negocio: "Rental Profitss — holding inmobiliario en Austin TX", generado: new Date().toISOString() };
  const safe = async (fn: () => Promise<any>) => { try { return await fn(); } catch { return null; } };

  const [
    holding, ocup, cartera, morosos, ffKpi, deficitRows, remAgg, remAtras, invDist, invHold, memoria, roster
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
    safe(() => sb.from("agent_registry").select("nombre,capa,area,equipo,estado").is("deleted_at", null)),
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

  // Equipo de agentes (la red de Jarvis) — para que el Cerebro sepa a quién delegar
  if (roster?.data?.length) {
    const porArea: Record<string, string[]> = {};
    for (const a of roster.data) {
      const key = a.area || "otros";
      (porArea[key] = porArea[key] || []).push(`${a.nombre} (${a.capa}${a.estado ? ", " + a.estado : ""})`);
    }
    snap.equipo_de_agentes = {
      total: roster.data.length,
      por_area: porArea,
      nota: "Estos agentes corren por cron y dejan su trabajo en informes (pm_informes) y en la cola de propuestas (agent_proposals). Para detalle de un área, usá la herramienta consultar_agentes_area.",
    };
  }

  if (memoria?.data?.length) snap.memoria_del_cerebro = memoria.data.map((m: any) => `[${m.tipo}] ${String(m.texto).slice(0, 240)}`);

  return snap;
}

// ─── Delegación: lee el PRODUCTO DE TRABAJO del agente del área (solo lectura) ───
async function fetchAreaWork(sb: any, areaRaw: string) {
  const area = String(areaRaw || "").trim().toLowerCase();
  const cfg = AREAS[area];
  if (!cfg) return { error: `Área desconocida: "${areaRaw}". Válidas: ${Object.keys(AREAS).join(", ")}.` };
  const safe = async (fn: () => Promise<any>) => { try { return await fn(); } catch { return null; } };
  const out: any = { area, descripcion: cfg.label, escuadra: cfg.squad };

  // Roster del área
  const roster = await safe(() => sb.from("agent_registry").select("nombre,capa,estado,nivel_riesgo").eq("area", area).is("deleted_at", null).order("capa"));
  if (roster?.data) out.agentes = roster.data.map((a: any) => `${a.nombre} · ${a.capa} · ${a.estado || "?"} · ${a.nivel_riesgo || ""}`);

  // Informe más reciente por cada tipo que produce el área
  if (cfg.informes.length) {
    out.informes_recientes = [];
    for (const tipo of cfg.informes) {
      const inf = await safe(() => sb.from("pm_informes").select("tipo,corte,titulo,payload,generado_por,estado").eq("tipo", tipo).is("archived_at", null).order("corte", { ascending: false }).limit(1).maybeSingle());
      if (inf?.data) {
        const p = inf.data.payload;
        out.informes_recientes.push({
          tipo: inf.data.tipo, corte: inf.data.corte, titulo: inf.data.titulo, estado: inf.data.estado,
          generado_por: inf.data.generado_por,
          resumen: JSON.stringify(p || {}).slice(0, 6000),
        });
      }
    }
    if (!out.informes_recientes.length) delete out.informes_recientes;
  }

  // Cola de propuestas abiertas de la escuadra (lo que espera aprobación humana)
  const cola = await safe(() => sb
    .from("agent_proposals")
    .select("tipo_accion,payload,evidencia,created_at,agent_registry!inner(nombre,equipo)")
    .eq("estado", "propuesta").is("deleted_at", null)
    .eq("agent_registry.equipo", cfg.squad)
    .order("created_at", { ascending: false }).limit(25));
  if (cola?.data?.length) {
    out.cola_propuestas_pendientes = {
      total: cola.data.length,
      nota: "Propuestas que esperan aprobación humana en /jarvis. El Cerebro NO las ejecuta.",
      items: cola.data.map((p: any) => ({
        agente: p.agent_registry?.nombre,
        accion: (p.payload && (p.payload.accion || p.payload.descripcion)) || p.tipo_accion,
        severidad: (p.payload && p.payload.severidad) || "info",
        tipo: p.evidencia && p.evidencia.tipo,
      })),
    };
  } else {
    out.cola_propuestas_pendientes = { total: 0, nota: "Sin propuestas abiertas de esta escuadra." };
  }

  // Sabueso / findings contables
  if (cfg.findings) {
    const f = await safe(() => sb.from("ct_findings").select("check_id,empresa,titulo,severidad,impacto_usd").is("resolved_at", null).eq("active", true).order("impacto_usd", { ascending: false, nullsFirst: false }).limit(15));
    if (f?.data?.length) out.sabueso_findings = { nota: "Descuadres/alertas abiertas del Sabueso Contable (impacto_usd = plata sin conciliar).", items: f.data.map((x: any) => ({ check: x.check_id, empresa: x.empresa, titulo: x.titulo, severidad: x.severidad, impacto_usd: x.impacto_usd })) };
  }

  return out;
}

const TOOLS = [{
  name: "consultar_agentes_area",
  description: "Consultá el trabajo del equipo de agentes de un área cuando la pregunta es sobre ESA área y necesitás detalle. Devuelve el informe ejecutivo más reciente de esa área (de pm_informes, generado por sus agentes) + la cola de propuestas pendientes de aprobación de esa escuadra (agent_proposals) + su roster. Es solo lectura: refleja lo que el agente del área ya produjo (corre por cron). Usalo para preguntas operativas/de detalle de un área concreta; para números globales del holding usá directamente el snapshot.",
  input_schema: {
    type: "object",
    properties: {
      area: {
        type: "string",
        enum: Object.keys(AREAS),
        description: "El área: 'fix-flip' (compra/reforma/venta, HML, inversionistas, underwriting) · 'rentas' (property management, cobranza, ocupación) · 'remodelacion' (obra, draws, avance) · 'operacion' (tareas/ClickUp) · 'contable' (conciliación QBO, Sabueso).",
      },
    },
    required: ["area"],
  },
}];

function buildSystem(snap: any, screen: string) {
  const snapStr = JSON.stringify(snap, null, 0).slice(0, 55000);
  return `Sos el CEREBRO de Rental Profitss, un holding inmobiliario en Austin TX con tres negocios: Fix & Flip (compra/reforma/venta y hold), Remodelación (obra) y Rentas (property management), más el Portal del Inversor y FlipMentoría. Sos el "líder" que entiende los números reales y COORDINA un equipo de agentes especializados por área.

TU EQUIPO (la red de agentes):
- Tenés agentes por área (Fix & Flip, Rentas, Remodelación, Operación, Contable). Cada uno corre por su cuenta y deja su trabajo en informes y en una cola de propuestas que un humano aprueba.
- Cuando la pregunta es de UN ÁREA y necesitás detalle operativo (cómo va una obra, qué propuestas de cobranza hay, el pipeline de deals, descuadres contables), usá la herramienta consultar_agentes_area con el área correcta y RESPONDÉ con eso, CITANDO al agente de origen ("según el Reportero de Remodelación…", "el Financiero de Rentas propuso…").
- Para números transversales / del holding (caja atrapada total, cartera, ocupación global, P&L por empresa, patrimonio, inversionistas), respondé DIRECTO con el SNAPSHOT de abajo, sin herramienta.

CÓMO RESPONDÉS:
- En español rioplatense, claro y directo. Explicás TODO SIMPLE, como a alguien que NO sabe de finanzas: sin jerga, con ejemplos concretos y SIEMPRE el número real.
- Si usás una sigla o término técnico (NOI, DSCR, CoC, EBITDA, caja atrapada, cap rate, aging), lo definís en una frase con palabras de todos los días.
- Conciso: apuntá al insight accionable. Nada de relleno.

REGLAS DURAS:
- SOLO LECTURA. No ejecutás pagos, no escribís en Airtable/QuickBooks, no cambiás nada, no corrés a los agentes. Si te piden una acción con efectos (mandar un cobro, pagar, editar, aprobar una propuesta), PODÉS PROPONERLA en pasos claros y decís que un humano la confirme y la haga en el módulo correspondiente o apruebe la propuesta en /jarvis. Nunca digas que la hiciste.
- NÚMEROS REALES ÚNICAMENTE: usá SOLO las cifras del SNAPSHOT o de lo que devuelva la herramienta. NO inventes. Si no tenés el dato, decilo ("no tengo ese dato en los números actuales") en vez de suponer.
- "Un dato, una fuente": no recalcules con otra fórmula. El DÉFICIT (caja atrapada) es ff_deals.deficit_total y ya viene sumado; la MORA es vencido_neto; la ocupación viene de v_ocupacion. Usalos tal cual.
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
    const messages: any[] = [...history, { role: "user", content: question }];

    // ── Loop de orquestación con tool-use ──
    let answer = "";
    const agentesConsultados: string[] = [];
    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const lastRound = round === MAX_TOOL_ROUNDS;
      const result = await callAnthropic({
        model: MODEL, max_tokens: MAX_TOKENS, system, messages,
        tools: lastRound ? undefined : TOOLS,   // último turno: forzá respuesta de texto
        user_id: auth.user_id, feature: "cerebro", timeoutMs: 60000, maxRetries: 2,
      });

      if (!result.ok) {
        const low = /credit|balance|429|529|overloaded/i.test(result.error || "");
        return new Response(JSON.stringify({ error: low ? "El Cerebro no está disponible ahora (proveedor de IA sin cupo/créditos o saturado). Probá en un rato." : ("No pude responder: " + result.error) }), { status: result.status || 502, headers: cors });
      }

      const data = result.data;
      answer = extractText(data) || answer;
      const toolUses = (data?.content || []).filter((c: any) => c.type === "tool_use");

      if (data?.stop_reason !== "tool_use" || !toolUses.length) break;

      // Registrar el turno del asistente (con los tool_use) y ejecutar las herramientas
      messages.push({ role: "assistant", content: data.content });
      const toolResults: any[] = [];
      for (const tu of toolUses) {
        if (tu.name === "consultar_agentes_area") {
          const area = String(tu.input?.area || "");
          agentesConsultados.push(area);
          const work = await fetchAreaWork(sb, area);
          toolResults.push({ type: "tool_result", tool_use_id: tu.id, content: JSON.stringify(work).slice(0, 22000) });
        } else {
          toolResults.push({ type: "tool_result", tool_use_id: tu.id, content: JSON.stringify({ error: "herramienta desconocida" }), is_error: true });
        }
      }
      messages.push({ role: "user", content: toolResults });
    }

    if (!answer) answer = "No tengo una respuesta para eso.";
    return new Response(JSON.stringify({ answer, delego_en: agentesConsultados }), { status: 200, headers: cors });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), { status: 500, headers: corsHeaders(req) });
  }
});
