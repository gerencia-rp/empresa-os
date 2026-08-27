// ════════════════════════════════════════════════════════════════
// 🧠 CEREBRO MATUTINO — la REUNIÓN diaria del holding (consolida, no re-hace).
//
// Corre 07:35 Austin (después de los 3 gerentes de área a las 07:30). Lee las
// 3 fotos ejecutivas de área (foto_ejecutiva_ff / _rentas / _remodelacion) + los
// números transversales (cartera, ocupación, déficit=caja atrapada, cola de
// propuestas) y produce EN UNA PASADA:
//   • la DIRECTIVA DEL DÍA (una sola prioridad clara, por reglas + tus números),
//   • la COLA de "Decisiones que necesitan tu sí" (priorizada, cada una con fuente),
//   • un ACTA en memoria (pm_brain_memory tipo='decisión') para que el Cerebro
//     aprenda y no se olvide de la directiva de hoy.
// Deja la foto en pm_informes (tipo='foto_ejecutiva_holding'), dedup por día.
//
// 🌙 MODO compactar (03:00 Austin) — MEMORIA QUE APRENDE, no se pudre:
//   dentro de cada tipo, agrupa memorias casi idénticas (texto normalizado o
//   embedding coseno ≥ 0.94) y deja viva SOLO la más nueva (freshness-wins:
//   resuelve duplicados Y contradicciones sobre el mismo tema), marcando las
//   viejas activo=false + superseded_by = la ganadora (REVERSIBLE, nunca DELETE),
//   y sumando sus hits en la ganadora.
//
// 🔒 SEGURIDAD IMPUESTA POR LA DB: conecta COMO agentes_ia_exec (least-privilege):
//   SELECT en el espejo + INSERT/UPDATE en pm_informes / pm_brain_memory /
//   agent_audit_log. CERO pm_credentials/PII, CERO pagos, CERO write-back a
//   Airtable/QBO. Test de AISLAMIENTO al arrancar; si no diera "denied", ABORTA.
//
// SOLO LEE el negocio. Propone, nunca ejecuta. Guardrails intactos.
// Kill switch: agent_registry.enabled ('Cerebro Matutino').
// Auth HTTP: bearer = SERVICE_KEY (cron) o admin JWT.  Modo (?mode=): reunion | compactar
// Deploy: npx supabase functions deploy cerebro-reunion
// ════════════════════════════════════════════════════════════════
import postgres from "https://deno.land/x/postgresjs@v3.4.5/mod.js";
import { requireAuth } from "../_shared/auth.ts";

const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const money = (n: number) => "$" + Math.round(+n || 0).toLocaleString("en-US");

function execSql() {
  const raw = Deno.env.get("SUPABASE_DB_URL");
  const pwd = Deno.env.get("AGENTES_IA_EXEC_PWD");
  if (!raw || !pwd) throw new Error("faltan SUPABASE_DB_URL / AGENTES_IA_EXEC_PWD");
  const ref = (Deno.env.get("SUPABASE_URL") || "").replace(/^https?:\/\//, "").split(".")[0];
  const u = new URL(raw);
  const pooler = u.hostname.includes("pooler");
  const user = pooler ? `agentes_ia_exec.${ref}` : "agentes_ia_exec";
  const conn = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(pwd)}@${u.hostname}:${u.port || 5432}${u.pathname || "/postgres"}`;
  return postgres(conn, { prepare: false, max: 1, idle_timeout: 5, connect_timeout: 15, ssl: "require" });
}

// Aislamiento: el rol NUNCA debe poder leer credenciales ni PII. Si puede → ABORT.
async function isolationTest(sql: ReturnType<typeof postgres>) {
  const iso: Record<string, string> = {};
  try { await sql`select 1 as x from pm_credentials limit 1`; iso.pm_credentials = "LEAK"; }
  catch (e) { iso.pm_credentials = /permission denied/i.test(String((e as Error).message || e)) ? "PASS·permission denied" : "ERR:" + (e as Error).message; }
  try { await sql`select document_id from pm_tenants limit 1`; iso.pm_tenants_document_id = "LEAK"; }
  catch (e) { iso.pm_tenants_document_id = /permission denied/i.test(String((e as Error).message || e)) ? "PASS·permission denied" : "ERR:" + (e as Error).message; }
  return iso;
}
const isolationOk = (iso: Record<string, string>) => iso.pm_credentials?.startsWith("PASS") && iso.pm_tenants_document_id?.startsWith("PASS");

// ─────────────────────────── REUNIÓN DIARIA ───────────────────────────
async function runReunion(sql: ReturnType<typeof postgres>, agentId: string) {
  const [{ corte }] = await sql`select (now() at time zone 'America/Chicago')::date::text as corte`;

  // (1) Números transversales — fuentes ÚNICAS, no recalcular.
  const [cart] = await sql`select vencido_neto, morosos_reales, por_cobrar_neto from v_cartera_kpi`;
  const [ocup] = await sql`select * from v_ocupacion limit 1`;
  const defRows = await sql`select address, deficit_total, stage from ff_deals where deficit_total is not null and deficit_total > 0 order by deficit_total desc`;
  const defTot = defRows.reduce((s: number, r: Record<string, unknown>) => s + Number(r.deficit_total || 0), 0);

  // (2) Las 3 fotos ejecutivas de área (lo que produjeron los gerentes 07:30)
  // + la revisión previa de continuidad (06:50). Así la reunión no presume que
  // el sistema está sano: recibe explícitamente fallos, fuentes viejas y huecos.
  const fotos = await sql`
    select tipo, corte::text corte, payload
    from pm_informes
    where tipo in ('foto_ejecutiva_ff','foto_ejecutiva_rentas','foto_ejecutiva_remodelacion')
      and archived_at is null
    order by tipo, corte desc`;
  const fotoDe = (t: string) => fotos.find((f: Record<string, unknown>) => f.tipo === t) as Record<string, unknown> | undefined;
  const [continuidad] = await sql`
    select corte::text corte, payload from pm_informes
    where tipo='continuidad_operativa_diaria' and archived_at is null
    order by corte desc limit 1`;
  const [decisionSla] = await sql`
    select corte::text corte, payload from pm_informes
    where tipo='sla_decisiones' and archived_at is null
    order by corte desc limit 1`;
  const areaResumen = (t: string, label: string) => {
    const f = fotoDe(t);
    if (!f) return { area: label, foto: null, nota: "sin foto de hoy todavía" };
    const p = f.payload as Record<string, unknown>;
    return { area: label, corte: f.corte, top_decisiones: (p?.top_3_decisiones as unknown[])?.slice(0, 3) || [], resumen: p?.resumen ?? null };
  };

  // (3) Cola global de propuestas que esperan el sí humano (por escuadra).
  const cola = await sql`
    select ar.equipo, ap.tipo_accion tipo, count(*)::int n,
           round(coalesce(sum((ap.evidencia->>'monto_vencido_neto')::numeric),0)) monto
    from agent_proposals ap join agent_registry ar on ar.id=ap.agent_id
    where ap.estado='propuesta' and ap.deleted_at is null
    group by 1,2 order by 3 desc`;
  const propuestasTotal = cola.reduce((a: number, x: Record<string, unknown>) => a + Number(x.n), 0);

  const vencido = Number(cart?.vencido_neto || 0);
  const morosos = Number(cart?.morosos_reales || 0);
  const occPct = ocup?.ocupacion_pct != null ? Number(ocup.ocupacion_pct) : (ocup?.pct != null ? Number(ocup.pct) : null);

  // ── DIRECTIVA DEL DÍA: una sola prioridad, por reglas + tus números ──
  let directiva: string, porque: string, prioridadArea: string;
  if (vencido > 0) {
    directiva = `Cobrá los ${morosos} atrasos (${money(vencido)} vencido) antes de mover cualquier gasto de obra.`;
    porque = "La mora es plata que ya es tuya y no entró: recuperarla es más barato que cualquier ingreso nuevo.";
    prioridadArea = "rentas/cobranza";
  } else if (defTot > 0 && defRows.length >= 5) {
    directiva = `Sin mora hoy — enfocá en refinanciar/vender las casas que más caja atrapan (${money(defTot)} en ${defRows.length}).`;
    porque = "Caja atrapada = plata metida que solo vuelve al refinanciar o vender; liberarla financia el resto.";
    prioridadArea = "fix-flip";
  } else {
    directiva = "Sin urgencias de caja hoy — sostené el volumen de renta y avanzá las obras en curso.";
    porque = "No hay fuego que apagar: el mejor uso del día es progreso constante, no reacción.";
    prioridadArea = "operación";
  }

  // ── DECISIONES QUE NECESITAN TU SÍ (priorizadas, cada una con fuente) ──
  const decisiones: Array<Record<string, unknown>> = [];
  if (vencido > 0) decisiones.push({ prioridad: "critico", decision: `Aprobar la cobranza: ${morosos} inquilinos, ${money(vencido)} vencido neto`, requiere: "tu OK para enviar los recordatorios (borradores listos)", fuente: "Financiero Rentas → cola de propuestas" });
  if (propuestasTotal > 0) decisiones.push({ prioridad: "medio", decision: `${propuestasTotal} propuestas de tus agentes esperando OK`, requiere: "revisar y aprobar en /decisiones (Agentes)", fuente: "cola agent_proposals" });
  if (defRows.length > 0) decisiones.push({ prioridad: "medio", decision: `${defRows.length} casas con caja atrapada (${money(defTot)})`, requiere: "definir plan de refi/venta por casa", fuente: "Fix & Flip · ff_deals.deficit_total" });
  const remFoto = fotoDe("foto_ejecutiva_remodelacion");
  const remAtras = remFoto ? Number(((remFoto.payload as Record<string, unknown>)?.resumen as Record<string, unknown>)?.obras_atrasadas ?? 0) : 0;
  if (remAtras > 0) decisiones.push({ prioridad: "medio", decision: `${remAtras} obras atrasadas`, requiere: "reprogramar o sumar recursos", fuente: "Gerente de Remodelación" });
  const continuidadPayload = (continuidad?.payload || {}) as Record<string, unknown>;
  const continuidadEx = (continuidadPayload.excepciones || {}) as Record<string, unknown>;
  if (continuidadPayload.severidad === "critico" || continuidadPayload.severidad === "atencion") {
    decisiones.unshift({
      prioridad: continuidadPayload.severidad === "critico" ? "critico" : "medio",
      decision: "Resolver excepciones de continuidad antes de abrir trabajo nuevo",
      requiere: String(continuidadPayload.recomendacion || "revisar el informe de continuidad"),
      fuente: "Director de Continuidad Operativa",
    });
  }
  const decisionSlaPayload = (decisionSla?.payload || {}) as Record<string, unknown>;
  if (Number(decisionSlaPayload.fuera_de_sla || 0) > 0) {
    decisiones.unshift({
      prioridad: "critico",
      decision: `Resolver ${Number(decisionSlaPayload.fuera_de_sla)} decisiones fuera de plazo`,
      requiere: String(decisionSlaPayload.proxima_accion || "asignar responsable y fecha"),
      fuente: "Director de Continuidad Operativa · SLA de decisiones",
    });
  }

  const payload = {
    corte,
    titulo: "Reunión matutina del Cerebro — Directiva del día",
    directiva, porque, prioridad_area: prioridadArea,
    decisiones_que_necesitan_tu_si: decisiones,
    numeros_clave: {
      caja_atrapada: Math.round(defTot * 100) / 100, casas_con_deficit: defRows.length,
      cartera_vencida: vencido, morosos, por_cobrar_del_mes: Number(cart?.por_cobrar_neto || 0),
      ocupacion_pct: occPct, propuestas_en_cola: propuestasTotal,
    },
    areas: [areaResumen("foto_ejecutiva_ff", "Fix & Flip"), areaResumen("foto_ejecutiva_rentas", "Rentas"), areaResumen("foto_ejecutiva_remodelacion", "Remodelación")],
    continuidad_operativa: continuidad ? {
      corte: continuidad.corte,
      severidad: continuidadPayload.severidad || "sin clasificar",
      excepciones: continuidadEx,
      recomendacion: continuidadPayload.recomendacion || null,
    } : { estado: "sin revisión previa disponible" },
    sla_decisiones: decisionSla ? decisionSlaPayload : { estado: "sin revisión previa disponible" },
    fidelidad: "consolida las 3 fotos de área + números transversales; cada decisión cita su fuente; nada inventado, nada dropeado",
    regla: "el Cerebro SOLO LEE — la directiva es una recomendación; ejecutar/pagar siempre lo confirma un humano",
    origen: "cerebro-reunion (agentes_ia_exec)",
  };

  // Persistir la foto (dedup por día).
  let created = 0, skipped = 0;
  const [ex] = await sql`select id from pm_informes where tipo='foto_ejecutiva_holding' and corte=${corte} and archived_at is null limit 1`;
  if (ex) { skipped++; }
  else {
    await sql`insert into pm_informes (tipo, corte, titulo, estado, origen, payload, generado_por)
              values ('foto_ejecutiva_holding', ${corte}, ${"Directiva del día " + corte}, 'borrador', 'ejecutor', ${sql.json(payload)}, 'cerebro-reunion (agentes_ia_exec)')`;
    created++;
  }

  // ACTA en memoria (tipo='decisión') — que el Cerebro aprenda la directiva de hoy. Dedup por día.
  const actaTxt = `Directiva ${corte}: ${directiva} (por qué: ${porque}). Números: caja atrapada ${money(defTot)} en ${defRows.length} casas · vencido ${money(vencido)}/${morosos} morosos · ocupación ${occPct ?? "?"}% · ${propuestasTotal} propuestas en cola.`;
  const [mex] = await sql`select id from pm_brain_memory where tipo='decisión' and fuente='cerebro-reunion' and texto like ${"Directiva " + corte + ":%"} and activo=true limit 1`;
  if (!mex) {
    await sql`insert into pm_brain_memory (tipo, texto, fuente, fecha, activo) values ('decisión', ${actaTxt}, 'cerebro-reunion', now(), true)`;
  }

  const preview = { directiva, decisiones: decisiones.map((d) => d.decision), numeros: payload.numeros_clave };
  await sql`insert into agent_audit_log (agent_id, input, output, resultado) values (${agentId}, ${sql.json({ mode: "reunion", corte, rol_db: "agentes_ia_exec" })}, ${sql.json({ created, skipped, acta_creada: !mex, preview })}, 'ok')`;
  return { ok: true, mode: "reunion", corte, created, skipped, acta_creada: !mex, preview };
}

// ─────────────────────────── COMPACTAR MEMORIA (3am) ───────────────────────────
const norm = (t: string) => (t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

async function runCompactar(sql: ReturnType<typeof postgres>, agentId: string) {
  // Traigo las memorias activas (con o sin embedding). Freshness-wins por tipo.
  const rows = await sql`select id, tipo, texto, fecha, coalesce(hits,1) hits, (embedding is not null) tiene_emb from pm_brain_memory where activo=true order by fecha desc` as unknown as Array<Record<string, unknown>>;
  let dedupExact = 0, dedupSemantico = 0;
  const superseded = new Set<string>();

  // (A) Duplicado exacto por (tipo, texto normalizado): gana la más nueva.
  const byKey = new Map<string, Record<string, unknown>>();
  for (const r of rows) {
    if (superseded.has(r.id as string)) continue;
    const key = (r.tipo as string) + "||" + norm(r.texto as string);
    if (!norm(r.texto as string)) continue;
    const win = byKey.get(key);
    if (!win) { byKey.set(key, r); continue; }
    // win es más nuevo (orden desc). Marcar r como superseded por win.
    await sql`update pm_brain_memory set activo=false, superseded_by=${win.id as string}, updated_at=now() where id=${r.id as string}`;
    await sql`update pm_brain_memory set hits=coalesce(hits,1)+${Number(r.hits) || 1}, updated_at=now() where id=${win.id as string}`;
    superseded.add(r.id as string);
    dedupExact++;
  }

  // (B) Casi-duplicado / contradicción por EMBEDDING coseno ≥ 0.94 dentro del tipo:
  //     gana la más nueva; la vieja se marca superseded (reversible). Bounded por SQL.
  const semRows = await sql`
    with pares as (
      select a.id a_id, b.id b_id, a.tipo,
             1 - (a.embedding <=> b.embedding) sim,
             a.fecha a_fecha, b.fecha b_fecha
      from pm_brain_memory a
      join pm_brain_memory b
        on a.tipo=b.tipo and a.id < b.id
       and a.embedding is not null and b.embedding is not null
       and a.activo=true and b.activo=true
      where 1 - (a.embedding <=> b.embedding) >= 0.94
    )
    select * from pares order by sim desc limit 200` as unknown as Array<Record<string, unknown>>;
  for (const p of semRows) {
    const aId = p.a_id as string, bId = p.b_id as string;
    if (superseded.has(aId) || superseded.has(bId)) continue;
    // el más nuevo gana
    const aNewer = new Date(p.a_fecha as string) >= new Date(p.b_fecha as string);
    const winId = aNewer ? aId : bId, loseId = aNewer ? bId : aId;
    await sql`update pm_brain_memory set activo=false, superseded_by=${winId}, updated_at=now() where id=${loseId}`;
    await sql`update pm_brain_memory set hits=coalesce(hits,1)+1, updated_at=now() where id=${winId}`;
    superseded.add(loseId);
    dedupSemantico++;
  }

  const [{ activas }] = await sql`select count(*)::int activas from pm_brain_memory where activo=true`;
  const out = { ok: true, mode: "compactar", dedup_exacto: dedupExact, dedup_semantico: dedupSemantico, memorias_activas: Number(activas) };
  await sql`insert into agent_audit_log (agent_id, input, output, resultado) values (${agentId}, ${sql.json({ mode: "compactar", rol_db: "agentes_ia_exec" })}, ${sql.json(out)}, 'ok')`;
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const bearer = (req.headers.get("authorization") || "").replace(/^bearer /i, "").trim();
  if (bearer !== SERVICE_KEY) {
    const auth = await requireAuth(req, { requireAdmin: true });
    if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status || 401);
  }
  const url = new URL(req.url);
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  let mode = String(url.searchParams.get("mode") || (body as { mode?: string }).mode || "reunion");
  if (mode === "run") mode = "reunion";
  if (mode !== "reunion" && mode !== "compactar") return json({ ok: false, error: "modo inválido: " + mode }, 400);

  let sql: ReturnType<typeof postgres> | null = null;
  try {
    sql = execSql();
    const [agent] = await sql`select id, coalesce(enabled,true) as enabled from agent_registry where nombre='Cerebro Matutino' and deleted_at is null limit 1`;
    if (!agent) return json({ ok: false, error: "no existe el agente 'Cerebro Matutino'" }, 404);
    if (agent.enabled === false) {
      await sql`insert into agent_audit_log (agent_id, input, output, resultado) values (${agent.id}, ${sql.json({ mode, accion: "skip" })}, ${sql.json({ reason: "kill switch OFF" })}, 'skipped')`;
      return json({ ok: true, skipped: "disabled", mode });
    }
    const iso = await isolationTest(sql);
    if (!isolationOk(iso)) {
      await sql`insert into agent_audit_log (agent_id, input, output, resultado) values (${agent.id}, ${sql.json({ mode, accion: "abort" })}, ${sql.json({ isolation_test: iso, motivo: "el rol pudo leer credenciales/PII — ABORT" })}, 'ABORT')`;
      return json({ ok: false, aborted: true, isolation_test: iso }, 500);
    }
    const res = mode === "reunion" ? await runReunion(sql, agent.id) : await runCompactar(sql, agent.id);
    return json({ ...res, isolation_test: iso });
  } catch (e) {
    return json({ ok: false, error: String((e as Error).message || e) }, 500);
  } finally {
    if (sql) { try { await sql.end({ timeout: 5 }); } catch (_e) { /* noop */ } }
  }
});
