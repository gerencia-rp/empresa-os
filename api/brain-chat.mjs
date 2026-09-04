// 🧠 Cerebro IA · endpoint unificado (Fase 2 chat + Fase 3 memoria RAG).
// Chat: recibe snapshot + pregunta + historial, arma system prompt de analista
//   (SOLO LECTURA, cita números reales) y llama a Claude (ANTHROPIC_API_KEY).
// Memoria (?resource=memory): CRUD de pm_brain_memory (list/crear/editar/desactivar).
//   Se fusionó acá para no pasar el límite de 12 Serverless Functions del plan Hobby.
//
// La API key vive SOLO en el servidor. El navegador nunca la ve.
// Parser (?resource=parse-doc): Capa 0 anti-tecleo — statements HML / facturas → JSON estructurado.
//   Fusionado acá por el límite de 12 Serverless Functions. Requiere JWT válido (verifyAuth).
import { recallMemories, embed, sbREST, vecLiteral } from './_brain.mjs';
import { verifyAuth } from './_pm-auth.mjs';
import { fetchWithTimeout } from './_fetch.mjs';

// ─── MEMORIA (pm_brain_memory) ───
const MEM_TIPOS = ['hecho', 'decisión', 'aprendizaje', 'nota'];
function bearerOf(req) { return (req.headers['authorization'] || req.headers['Authorization'] || '').replace(/^Bearer\s+/i, '').trim(); }
async function memoryHandler(req, res) {
  const bearer = bearerOf(req);
  try {
    if (req.method === 'GET') {
      const rows = await sbREST('pm_brain_memory?select=id,tipo,texto,fuente,fecha,activo,embedding&order=activo.desc,fecha.desc', { bearer });
      const out = (rows || []).map(m => ({ id: m.id, tipo: m.tipo, texto: m.texto, fuente: m.fuente, fecha: m.fecha, activo: m.activo, has_embedding: !!m.embedding }));
      res.status(200).json({ memories: out });
      return;
    }
    if (!bearer) { res.status(401).json({ error: 'Falta sesión (JWT).' }); return; }
    const b = jsonSafe(req.body, {}) || {};
    if (req.method === 'POST') {
      const texto = String(b.texto || '').trim();
      if (!texto) { res.status(400).json({ error: 'Falta el texto de la memoria.' }); return; }
      const tipo = MEM_TIPOS.includes(b.tipo) ? b.tipo : 'nota';
      const fuente = String(b.fuente || 'manual').slice(0, 80);
      const vec = await embed(`${tipo}: ${texto}`);
      const row = { tipo, texto, fuente, activo: true };
      if (vec) row.embedding = vecLiteral(vec);
      const created = await sbREST('pm_brain_memory', { method: 'POST', body: row, bearer, prefer: 'return=representation' });
      res.status(200).json({ ok: true, memory: Array.isArray(created) ? created[0] : created, embedded: !!vec });
      return;
    }
    if (req.method === 'PATCH') {
      const id = String(b.id || '').trim();
      if (!id) { res.status(400).json({ error: 'Falta id.' }); return; }
      const patch = { updated_at: new Date().toISOString() };
      if (typeof b.activo === 'boolean') patch.activo = b.activo;
      if (MEM_TIPOS.includes(b.tipo)) patch.tipo = b.tipo;
      if (typeof b.texto === 'string' && b.texto.trim()) {
        patch.texto = b.texto.trim();
        const vec = await embed(`${patch.tipo || b.tipo || 'nota'}: ${patch.texto}`);
        if (vec) patch.embedding = vecLiteral(vec);
      }
      const updated = await sbREST(`pm_brain_memory?id=eq.${id}`, { method: 'PATCH', body: patch, bearer, prefer: 'return=representation' });
      res.status(200).json({ ok: true, memory: Array.isArray(updated) ? updated[0] : updated });
      return;
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
}

const MODEL = 'claude-opus-4-8';
const MAX_TOKENS = 1400;
const MAX_HISTORY = 8; // últimos N turnos para acotar contexto/costo

function jsonSafe(v, fallback) { try { return typeof v === 'string' ? JSON.parse(v) : v; } catch { return fallback; } }

async function healthHandler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.status(405).json({ ok: false, error: 'Method not allowed' }); return; }
  const started = Date.now();
  const checks = {};
  try {
    const supa = process.env.SUPABASE_URL || 'https://nezbaljfhhyznhltpjnk.supabase.co';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const r = await fetchWithTimeout(`${supa}/auth/v1/health`, {
      headers: { accept: 'application/json', apikey: serviceKey, authorization: `Bearer ${serviceKey}` },
    }, 4000, 1);
    checks.supabase = { ok: r.ok, status: r.status, ms: Date.now() - started };
  } catch (error) {
    checks.supabase = { ok: false, error: error.message, ms: Date.now() - started };
  }
  checks.configuration = {
    ok: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.ANTHROPIC_API_KEY),
    supabase_service: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    cron_secret: Boolean(process.env.CRON_SECRET),
  };
  const ok = checks.supabase.ok && checks.configuration.ok;
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Empresa-OS-Health', ok ? 'ready' : 'degraded');
  if (req.method === 'HEAD') { res.status(ok ? 200 : 503).end(); return; }
  res.status(ok ? 200 : 503).json({ ok, status: ok ? 'ready' : 'degraded', version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'local', region: process.env.VERCEL_REGION || 'local', duration_ms: Date.now() - started, checks, timestamp: new Date().toISOString() });
}

// Growth Command comparte esta función serverless para no superar el límite del
// proyecto en Vercel. Solo expone presencia de configuración, nunca valores.
export function growthIntegrationReadiness(env = process.env) {
  const all = keys => keys.every(key => Boolean(String(env[key] || '').trim()));
  return [
    {
      id: 'supabase-auth', name: 'Supabase · acceso', status: 'verified',
      purpose: 'Sesión privada y permisos', detail: 'Sesión administradora verificada por el servidor.',
      required: []
    },
    {
      id: 'supabase-growth', name: 'Supabase · datos Growth',
      status: all(['GROWTH_SUPABASE_ENABLED', 'GROWTH_SUPABASE_SCHEMA_VERSION']) && String(env.GROWTH_SUPABASE_ENABLED).toLowerCase() === 'true' ? 'configured' : 'not_configured',
      purpose: 'Persistencia, auditoría y aprendizaje', detail: 'La autenticación existe; el esquema operativo de Growth todavía requiere activación explícita.',
      required: ['GROWTH_SUPABASE_ENABLED', 'GROWTH_SUPABASE_SCHEMA_VERSION']
    },
    {
      id: 'drive', name: 'Google Drive',
      status: all(['GOOGLE_DRIVE_CLIENT_EMAIL', 'GOOGLE_DRIVE_PRIVATE_KEY', 'GOOGLE_DRIVE_ROOT_FOLDER_ID']) ? 'configured' : 'not_configured',
      purpose: 'Guiones, recursos y entregables', detail: 'Requiere cuenta de servicio y una carpeta raíz compartida.',
      required: ['GOOGLE_DRIVE_CLIENT_EMAIL', 'GOOGLE_DRIVE_PRIVATE_KEY', 'GOOGLE_DRIVE_ROOT_FOLDER_ID']
    },
    {
      id: 'metricool', name: 'Metricool',
      status: all(['METRICOOL_API_TOKEN', 'METRICOOL_USER_ID', 'METRICOOL_BLOG_ID']) ? 'configured' : 'not_configured',
      purpose: 'Calendario, publicación y métricas', detail: 'Requiere credenciales de API y los identificadores de cuenta.',
      required: ['METRICOOL_API_TOKEN', 'METRICOOL_USER_ID', 'METRICOOL_BLOG_ID']
    }
  ];
}

async function growthReadinessHandler(req, res) {
  if (req.method !== 'GET') { res.status(405).json({ ok: false, error: 'Method not allowed' }); return; }
  const auth = await verifyAuth(req);
  if (!auth.ok || auth.via !== 'user' || !auth.email) { res.status(401).json({ ok: false, error: 'Sesión de usuario requerida.' }); return; }
  try {
    const profile = await sbREST(`profiles?select=role,active&email=eq.${encodeURIComponent(auth.email)}&limit=1`, { bearer: auth.token });
    const me = Array.isArray(profile) ? profile[0] : null;
    if (!me || me.role !== 'admin' || me.active === false) { res.status(403).json({ ok: false, error: 'Solo administradores activos pueden revisar conexiones.' }); return; }
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ ok: true, checkedAt: new Date().toISOString(), integrations: growthIntegrationReadiness(process.env) });
  } catch {
    res.status(503).json({ ok: false, error: 'No pudimos comprobar la configuración en este momento.' });
  }
}

// Registra el resultado del crawler de linaje sin abrir INSERT por RLS a todo
// usuario autenticado. El endpoint valida la sesión y confirma el rol admin;
// la escritura se hace server-side con la service key y un payload acotado.
async function lineageRunHandler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'Method not allowed' }); return; }
  const auth = await verifyAuth(req);
  if (!auth.ok || auth.via !== 'user' || !auth.email) { res.status(401).json({ ok: false, error: 'Sesión de usuario requerida.' }); return; }
  try {
    const profile = await sbREST(`profiles?select=role,active&email=eq.${encodeURIComponent(auth.email)}&limit=1`, { bearer: auth.token });
    const me = Array.isArray(profile) ? profile[0] : null;
    if (!me || me.role !== 'admin' || me.active === false) { res.status(403).json({ ok: false, error: 'Solo administradores activos pueden registrar esta auditoría.' }); return; }
    const b = jsonSafe(req.body, {}) || {};
    const num = (v, max = 100000) => Math.max(0, Math.min(max, Math.trunc(Number(v) || 0)));
    const row = {
      pantallas: num(b.pantallas, 500),
      numeros_vistos: num(b.numeros_vistos),
      con_linaje: num(b.con_linaje),
      sin_linaje: num(b.sin_linaje),
      nuevos_registrados: num(b.nuevos_registrados),
      detalle: {
        modo: b.detalle && b.detalle.modo === 'register' ? 'register' : 'gate',
        base: String((b.detalle && b.detalle.base) || '').slice(0, 240),
        registrado_por: auth.email,
        origen: 'authenticated-browser-crawler',
        sin: Array.isArray(b.detalle && b.detalle.sin) ? b.detalle.sin.slice(0, 120) : [],
        por_pantalla: Array.isArray(b.detalle && b.detalle.por_pantalla) ? b.detalle.por_pantalla.slice(0, 120) : [],
      },
    };
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!serviceKey) { res.status(503).json({ ok: false, error: 'Servicio de auditoría no configurado.' }); return; }
    const supa = process.env.SUPABASE_URL || 'https://nezbaljfhhyznhltpjnk.supabase.co';
    const write = await fetchWithTimeout(`${supa}/rest/v1/lineage_coverage_runs`, {
      method: 'POST',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify(row),
    }, 10000);
    const created = await write.json().catch(() => null);
    if (!write.ok) throw new Error(`No se pudo registrar el control (${write.status}).`);
    res.status(200).json({ ok: true, run: Array.isArray(created) ? created[0] : created });
  } catch (e) { res.status(500).json({ ok: false, error: e.message || String(e) }); }
}

// Fase 3: acá se recuperará memoria relevante (pm_brain_memory + embeddings VoyageAI).
// Por ahora acepta hechos que ya vengan del front (si los hubiera) y los formatea.
function buildMemoryBlock(memory) {
  if (!Array.isArray(memory) || !memory.length) return '';
  const lines = memory.slice(0, 20).map(m => `- [${m.tipo || 'nota'}] ${String(m.texto || '').slice(0, 300)}`);
  return `\n\nMEMORIA DEL CEREBRO (hechos/decisiones guardados — tenelos en cuenta):\n${lines.join('\n')}`;
}

function buildSystem(snapshot, memory) {
  const snap = JSON.stringify(snapshot ?? {}, null, 0).slice(0, 60000);
  return `Sos el "Cerebro" de Property OS, el copiloto de negocio de Rental Profits (gestión de propiedades en alquiler). Le hablás a Nicolás (CEO) o a Carlos (operaciones).

TU ROL:
- Analista financiero/operativo del portafolio de rentas. Ayudás a decidir: qué casas están en rojo y por qué, qué unidades colocar primero, dónde se pierde plata, cómo mejorar ocupación y cashflow.
- Respondés en español rioplatense, directo y claro, sin floritura. Conciso: apuntá al insight accionable, no a párrafos largos.

REGLAS CRÍTICAS:
- SOLO LECTURA. No podés modificar datos, crear reservas ni escribir en Airtable. Si te lo piden, explicá que sos de solo lectura y que eso se hace en el módulo correspondiente.
- CITÁ NÚMEROS REALES del SNAPSHOT de abajo (montos, ocupación, nombres de casa). NO inventes cifras. Si un dato no está en el snapshot, decilo claramente ("no lo tengo en los datos actuales") en vez de suponer.
- La ocupación del portafolio usa la REGLA de unidades: las habitaciones de una casa cuentan juntas como 1 unidad. Usá los números tal como vienen en el snapshot (no recalcules distinto).
- Las cifras del snapshot son del último mes COMPLETO (campo "mes"). Si proyectás a futuro, aclaralo como estimación y basate en las tendencias del snapshot.
- Si te preguntan algo fuera del negocio de rentas, redirigí amablemente.

SNAPSHOT DE DATOS REALES (fuente: Airtable → pm_*):
${snap}${buildMemoryBlock(memory)}`;
}

// 🤖 Investor Assistant — asistente del PORTAL DE INVERSIONISTAS.
// El snapshot llega del portal, que solo puede leer los datos DEL inversionista (RLS).
function buildSystemInvestor(snapshot) {
  const snap = JSON.stringify(snapshot ?? {}, null, 0).slice(0, 30000);
  return `Sos el "Investor Assistant" del portal de inversionistas de Flipping Rentals (Austin, TX). Hablás con UN inversionista sobre SU inversión inmobiliaria (modelo: compra con Hard Money → remodelación → renta por habitación → refinanciación 30 años → hold con valorización).

REGLAS:
- Respondé SIEMPRE en el idioma en que te pregunta el usuario.
- SOLO tenés los datos de ESTE inversionista (snapshot de abajo). Si te preguntan por otras propiedades, otros inversionistas o datos internos de la empresa, decí que solo podés hablar de su inversión.
- NÚMEROS CONCRETOS del snapshot: inversión, % de participación, TIR/VPN a 31 años, CAP, DSCR, riqueza hoy, patrimonio a 5/10/31, distribuciones. NO inventes cifras.
- HONESTO SOBRE RIESGOS: la utilidad mensual temprana puede ser baja o negativa (fase 0/1); el retorno fuerte es a LARGO PLAZO (amortización + valorización). El punto de equilibrio y el DSCR dicen qué tan justa está la operación. Nada es garantía de retorno.
- Las 3 FASES (en snapshot.fases): fase 0 = déficit inicial del ciclo; fase 1 = la operación cubre el déficit; fase 2 = recuperación del capital solo por utilidades (el resto se recupera vía patrimonio/venta o distribuciones).
- Conciso, cálido y claro — el inversionista no es financiero. Explicá los términos la primera vez.
- SIEMPRE que uses una sigla o término técnico (TIR, TVPI, DPI, RVPI, LTV, DSCR, ARV, HML, draw, escrow, cash-out…), definilo en la MISMA respuesta en una frase simple. Si snapshot.glosario trae la definición, usala; y si snapshot.indicadores trae SUS números (DPI/RVPI/TVPI/TIR, LTV de su casa), respondé con esos números reales — nunca genéricos.
- Estados especiales: TIR "n/a" = la casa se compró hace muy poco para anualizar (mirar el múltiplo); "equity ≤ 0" = la deuda financió todo y el retorno sale de la valorización; "por completar" = el equipo aún está cargando la deuda de esa casa.
- CASA EN REHAB (snapshot.estado_operativo.enRehab = true): cap/dscr/equilibrio vienen en null A PROPÓSITO — el dato NO falta, el indicador TODAVÍA NO APLICA porque la casa aún no cobra renta. Decí exactamente eso ("todavía no aplica: la casa está en rehab y aún no genera renta"), NUNCA "no tengo el dato", nunca "null", y JAMÁS saques un número de otro lado para rellenar. Lo que sí podés responder en ese estado: capital invertido, costo total y valor en papel. Si estado_operativo.sinDeuda = true con la casa ya rentando, el DSCR no aplica por otro motivo: no hay cuota de deuda (compra en cash o todavía sin refi) — usá estado_operativo.razonDscr.

SNAPSHOT DE SU INVERSIÓN (datos reales + proyección del modelo):
${snap}`;
}

// ─── PARSER DE DOCUMENTOS (Capa 0) — statement HML / factura → JSON. Nada se guarda acá:
// el front lo mete en ct_doc_extracts como PROPUESTA y un humano aprueba. ───
async function parseDocHandler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  const auth = await verifyAuth(req);
  if (!auth.ok) { res.status(401).json({ error: 'Sesión requerida: ' + (auth.reason || '') }); return; }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) { res.status(500).json({ error: 'Falta ANTHROPIC_API_KEY en el servidor.' }); return; }
  const b = jsonSafe(req.body, {}) || {};
  const tipo = b.tipo === 'factura' ? 'factura' : 'hml_statement';
  const data = String(b.data_base64 || '');
  if (!data) { res.status(400).json({ error: 'Falta el documento (data_base64).' }); return; }
  const mt = String(b.media_type || 'application/pdf');
  const bloque = mt === 'application/pdf'
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } }
    : { type: 'image', source: { type: 'base64', media_type: mt, data } };
  const instr = tipo === 'hml_statement'
    ? 'Extraé del statement del préstamo HML un JSON con EXACTAMENTE esta forma: {"casa": "dirección si aparece o null", "fecha_statement": "YYYY-MM-DD|null", "pago_mensual": número, "interes": número|null, "escrow_impound": número|null, "fees": [{"concepto": "...", "monto": número}], "extension": {"monto": número, "meses": número, "fecha": "YYYY-MM-DD"} | null, "notas": "..."}. REGLAS: el pago mensual es el que efectivamente se paga — si el statement trae "trust account reserve impound" (escrow), va INCLUIDO en pago_mensual y desglosado en escrow_impound. Si hay cargo de extensión/prórroga (extension fee, loan extension), va en extension. NO inventes números: lo que no esté, null.'
    : 'Extraé de la factura/recibo un JSON con EXACTAMENTE esta forma: {"vendor": "...", "fecha": "YYYY-MM-DD|null", "total": número, "casa_sugerida": "dirección si aparece o null", "items": [{"descripcion": "...", "monto": número, "categoria": "material"|"mueble"|"herramienta"}], "mixta": true|false, "notas": "..."}. REGLAS: la categorización material/mueble/herramienta es OBLIGATORIA por ítem. Si la factura mezcla categorías (mixta=true), los ítems ya quedan partidos por categoría para cargarse como filas separadas con el mismo comprobante. NO inventes montos.';
  try {
    const r = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: MODEL, max_tokens: 2000,
        system: 'Sos un extractor de datos financieros. Respondés ÚNICAMENTE el JSON pedido, sin markdown ni texto extra. Números como number (sin $ ni comas). Lo que no está en el documento es null — jamás inventar.',
        messages: [{ role: 'user', content: [bloque, { type: 'text', text: instr }] }],
      }),
    }, 45000);
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { res.status(r.status).json({ error: d?.error?.message || ('Claude HTTP ' + r.status) }); return; }
    const txt = (d.content || []).filter(x => x.type === 'text').map(x => x.text).join('').trim();
    const m = txt.match(/\{[\s\S]*\}/);
    if (!m) { res.status(422).json({ error: 'El parser no devolvió JSON.', raw: txt.slice(0, 500) }); return; }
    res.status(200).json({ extract: JSON.parse(m[0]), tipo, usage: d.usage || null });
  } catch (e) { res.status(502).json({ error: 'Parser: ' + (e.message || String(e)) }); }
}

export default async function handler(req, res) {
  // Routing: ?resource=memory → CRUD de memoria; ?resource=parse-doc → parser Capa 0; si no → chat.
  if ((req.query && req.query.resource) === 'health') return healthHandler(req, res);
  if ((req.query && req.query.resource) === 'growth-readiness') return growthReadinessHandler(req, res);
  if ((req.query && req.query.resource) === 'lineage-run') return lineageRunHandler(req, res);
  if ((req.query && req.query.resource) === 'memory') return memoryHandler(req, res);
  if ((req.query && req.query.resource) === 'parse-doc') return parseDocHandler(req, res);
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    res.status(500).json({ error: 'Falta ANTHROPIC_API_KEY en el servidor. Configurala en Vercel → Settings → Environment Variables y hacé redeploy. Los insights automáticos (Fase 1) ya funcionan sin key.' });
    return;
  }

  const body = jsonSafe(req.body, {}) || {};
  const question = String(body.question || '').trim();
  if (!question) { res.status(400).json({ error: 'Falta la pregunta.' }); return; }
  const history = Array.isArray(body.history) ? body.history.slice(-MAX_HISTORY) : [];

  // messages: historial (user/assistant) + la pregunta nueva.
  const messages = [];
  for (const m of history) {
    if (!m || !m.content) continue;
    const role = m.role === 'assistant' ? 'assistant' : 'user';
    messages.push({ role, content: String(m.content).slice(0, 6000) });
  }
  // El historial debe alternar y empezar en user; si el último ya es user, lo dejamos igual.
  messages.push({ role: 'user', content: question });

  // Modo INVERSIONISTA: system propio, sin memoria del Cerebro (su snapshot ya viene
  // filtrado por RLS desde el portal — solo SU data).
  const esInvestor = body.mode === 'investor';
  let mem = { rows: [], mode: 'none' };
  if (!esInvestor) {
    // RAG: recuperar memorias relevantes (similitud si hay embeddings; si no, recientes).
    // Con RLS por áreas se lee con el JWT del usuario (anon ya no ve pm_brain_memory).
    try { mem = await recallMemories(question, 6, bearerOf(req)); } catch { /* memoria opcional */ }
  }

  const payload = {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: esInvestor ? buildSystemInvestor(body.snapshot) : buildSystem(body.snapshot, mem.rows),
    messages,
  };

  try {
    const r = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify(payload),
    }, 30000);
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const msg = data?.error?.message || `Error de la API de Claude (HTTP ${r.status}).`;
      res.status(r.status).json({ error: msg });
      return;
    }
    if (data.stop_reason === 'refusal') {
      res.status(200).json({ answer: 'No puedo responder eso. Probá reformular la pregunta enfocándola en el negocio de rentas.' });
      return;
    }
    const answer = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim()
      || 'No obtuve respuesta. Probá de nuevo.';
    res.status(200).json({ answer, usage: data.usage || null, memory_used: mem.rows.length, memory_mode: mem.mode });
  } catch (e) {
    res.status(502).json({ error: 'Error llamando a Claude: ' + (e.message || String(e)) });
  }
}
