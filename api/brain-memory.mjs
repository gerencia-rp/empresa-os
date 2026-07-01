// 🧠 Cerebro IA · CRUD de memorias (pm_brain_memory).
//   GET    → lista memorias (activas primero)
//   POST   { tipo, texto, fuente } → crea (embebe con Voyage si hay key)
//   PATCH  { id, texto?, tipo?, activo? } → edita (re-embebe si cambia texto)
// SOLO memoria (no toca datos de Airtable). Requiere JWT de usuario (authenticated).
import { embed, sbREST, vecLiteral } from './_brain.mjs';

const TIPOS = ['hecho', 'decisión', 'aprendizaje', 'nota'];
function jsonSafe(v, f) { try { return typeof v === 'string' ? JSON.parse(v) : v; } catch { return f; } }
function bearerOf(req) { return (req.headers['authorization'] || req.headers['Authorization'] || '').replace(/^Bearer\s+/i, '').trim(); }

export default async function handler(req, res) {
  const bearer = bearerOf(req);
  try {
    if (req.method === 'GET') {
      const rows = await sbREST('pm_brain_memory?select=id,tipo,texto,fuente,fecha,activo,embedding&order=activo.desc,fecha.desc', { bearer });
      // No devolvemos el vector entero al front; solo si tiene embedding.
      const out = (rows || []).map(m => ({ id: m.id, tipo: m.tipo, texto: m.texto, fuente: m.fuente, fecha: m.fecha, activo: m.activo, has_embedding: !!m.embedding }));
      res.status(200).json({ memories: out });
      return;
    }
    if (!bearer) { res.status(401).json({ error: 'Falta sesión (JWT).' }); return; }

    if (req.method === 'POST') {
      const b = jsonSafe(req.body, {}) || {};
      const texto = String(b.texto || '').trim();
      if (!texto) { res.status(400).json({ error: 'Falta el texto de la memoria.' }); return; }
      const tipo = TIPOS.includes(b.tipo) ? b.tipo : 'nota';
      const fuente = String(b.fuente || 'manual').slice(0, 80);
      const vec = await embed(`${tipo}: ${texto}`);
      const row = { tipo, texto, fuente, activo: true };
      if (vec) row.embedding = vecLiteral(vec);
      const created = await sbREST('pm_brain_memory', { method: 'POST', body: row, bearer, prefer: 'return=representation' });
      res.status(200).json({ ok: true, memory: Array.isArray(created) ? created[0] : created, embedded: !!vec });
      return;
    }

    if (req.method === 'PATCH') {
      const b = jsonSafe(req.body, {}) || {};
      const id = String(b.id || '').trim();
      if (!id) { res.status(400).json({ error: 'Falta id.' }); return; }
      const patch = { updated_at: new Date().toISOString() };
      if (typeof b.activo === 'boolean') patch.activo = b.activo;
      if (TIPOS.includes(b.tipo)) patch.tipo = b.tipo;
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
