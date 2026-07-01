// 🧠 Cerebro IA · endpoint unificado (Fase 2 chat + Fase 3 memoria RAG).
// Chat: recibe snapshot + pregunta + historial, arma system prompt de analista
//   (SOLO LECTURA, cita números reales) y llama a Claude (ANTHROPIC_API_KEY).
// Memoria (?resource=memory): CRUD de pm_brain_memory (list/crear/editar/desactivar).
//   Se fusionó acá para no pasar el límite de 12 Serverless Functions del plan Hobby.
//
// La API key vive SOLO en el servidor. El navegador nunca la ve.
import { recallMemories, embed, sbREST, vecLiteral } from './_brain.mjs';

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

export default async function handler(req, res) {
  // Routing: ?resource=memory → CRUD de memoria; si no → chat.
  if ((req.query && req.query.resource) === 'memory') return memoryHandler(req, res);
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

  // RAG: recuperar memorias relevantes (similitud si hay embeddings; si no, recientes).
  let mem = { rows: [], mode: 'none' };
  try { mem = await recallMemories(question, 6); } catch { /* memoria opcional */ }

  const payload = {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: buildSystem(body.snapshot, mem.rows),
    messages,
  };

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify(payload),
    });
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
