import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { requireAuth } from '../_shared/auth.ts';
import { corsResponse } from '../_shared/cors.ts';

const ALLOWED_MODELS = new Set(['claude-opus-4-8', 'claude-haiku-4-5-20251001']);

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse(req, {});
  if (req.method !== 'POST') return corsResponse(req, { ok: false, error: 'Method not allowed' }, 405);

  const auth = await requireAuth(req, { requireAdmin: true });
  if (!auth.ok) return corsResponse(req, { ok: false, error: auth.error }, auth.status || 401);

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY') || '';
  if (!apiKey) return corsResponse(req, { ok: false, error: 'Motor Anthropic no configurado en Supabase.' }, 503);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return corsResponse(req, { ok: false, error: 'JSON inválido.' }, 400); }

  const model = String(body.model || '');
  if (!ALLOWED_MODELS.has(model)) return corsResponse(req, { ok: false, error: 'Modelo no permitido.' }, 400);
  const system = typeof body.system === 'string' ? body.system.slice(0, 16000) : '';
  const messages = Array.isArray(body.messages) ? body.messages.slice(0, 4).map((item: any) => ({
    role: item?.role === 'assistant' ? 'assistant' : 'user',
    content: String(item?.content || '').slice(0, 90000)
  })) : [];
  if (!system || !messages.length) return corsResponse(req, { ok: false, error: 'Falta contexto para la inferencia.' }, 400);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 52000);
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model,
        max_tokens: Math.min(Math.max(Number(body.max_tokens) || 1600, 400), 2400),
        temperature: Math.min(Math.max(Number(body.temperature) || 0.2, 0), 0.5),
        system,
        messages
      }),
      signal: controller.signal
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = payload?.error?.message || `Anthropic HTTP ${response.status}`;
      return corsResponse(req, { ok: false, error: detail }, response.status);
    }
    return corsResponse(req, { ok: true, content: payload.content || [], usage: payload.usage || null, model: payload.model || model });
  } catch (error) {
    const message = error instanceof Error && error.name === 'AbortError' ? 'La inferencia excedió 52 segundos.' : 'No se pudo contactar el motor Anthropic.';
    return corsResponse(req, { ok: false, error: message }, 502);
  } finally {
    clearTimeout(timeout);
  }
});
