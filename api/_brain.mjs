// 🧠 Cerebro IA · helpers compartidos (embeddings Voyage + acceso Supabase).
// Embeddings: Voyage voyage-3-lite output_dimension=512. Degradación con gracia:
//   1) VOYAGE_API_KEY en Vercel (directo)  2) edge function generate-embedding
//   (usa Supabase Secrets)  3) null → memoria sin vector (fallback por recientes).
import { PUBLIC_ANON_KEY, supabaseUrl } from './_pm-report-data.mjs';

export const ANON = process.env.SUPABASE_ANON_KEY || PUBLIC_ANON_KEY;
export const SUPA = supabaseUrl();

// vector(512) para PostgREST se manda como string "[a,b,c]".
export function vecLiteral(vec) { return '[' + vec.map(x => Number(x).toFixed(6)).join(',') + ']'; }

export async function embed(text) {
  const t = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 8000);
  if (!t) return null;
  const vk = process.env.VOYAGE_API_KEY;
  if (vk) {
    try {
      const r = await fetch('https://api.voyageai.com/v1/embeddings', {
        method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + vk },
        body: JSON.stringify({ model: 'voyage-3-lite', input: t, output_dimension: 512 }),
      });
      if (r.ok) { const d = await r.json(); const v = d?.data?.[0]?.embedding; if (Array.isArray(v)) return v; }
    } catch { /* fallthrough */ }
  }
  // Fallback: edge function (tiene VOYAGE_API_KEY en Supabase Secrets si está seteada allá).
  try {
    const r = await fetch(`${SUPA}/functions/v1/generate-embedding`, {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + ANON, apikey: ANON },
      body: JSON.stringify({ text: t }),
    });
    if (r.ok) { const d = await r.json(); if (Array.isArray(d?.embedding) && !d.skipped) return d.embedding; }
  } catch { /* fallthrough */ }
  return null;
}

// PostgREST helper. bearer = JWT del usuario (authenticated) o ANON.
export async function sbREST(path, { method = 'GET', body, bearer, prefer } = {}) {
  const headers = { apikey: ANON, Authorization: 'Bearer ' + (bearer || ANON) };
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (prefer) headers['Prefer'] = prefer;
  const r = await fetch(`${SUPA}/rest/v1/${path}`, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  const txt = await r.text();
  let data = null; try { data = txt ? JSON.parse(txt) : null; } catch { data = txt; }
  if (!r.ok) throw new Error(`REST ${path} → ${r.status} ${typeof data === 'string' ? data : JSON.stringify(data)}`);
  return data;
}

// Recupera memorias relevantes para una pregunta.
// Si hay embedding → RPC de similitud; si no → memorias activas recientes (fallback).
// bearer = JWT del usuario: con RLS por áreas (Etapa 2), pm_brain_memory ya no se
// lee con anon — hay que consultar como el usuario logueado (área rentas o admin).
export async function recallMemories(question, k = 6, bearer) {
  const vec = await embed(question);
  if (vec) {
    try {
      const rows = await sbREST('rpc/match_brain_memory', { method: 'POST', body: { query_embedding: vecLiteral(vec), match_count: k }, bearer });
      if (Array.isArray(rows) && rows.length) return { rows, mode: 'similarity' };
    } catch { /* fallthrough al fallback */ }
  }
  try {
    const rows = await sbREST(`pm_brain_memory?select=id,tipo,texto,fuente,fecha&activo=eq.true&order=fecha.desc&limit=${k}`, { bearer });
    return { rows: rows || [], mode: vec ? 'recent(sin-match)' : 'recent(sin-embedding)' };
  } catch {
    return { rows: [], mode: 'none' };
  }
}
