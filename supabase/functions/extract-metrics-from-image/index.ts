// ════════════════════════════════════════════════════════════════
// extract-metrics-from-image · OCR de pantallazos de analytics con Claude vision
// Recibe { image_base64, media_type?, plataforma_hint? } y devuelve los números.
// ════════════════════════════════════════════════════════════════
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, corsResponse } from "../_shared/cors.ts";
import { callAnthropic, extractText } from "../_shared/anthropic.ts";

function authOk(req: Request): boolean {
  return !!(req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
}

const SYSTEM = `Sos experto en leer pantallas de analytics de redes sociales (Instagram, TikTok, YouTube).
Extraé los números que VEAS en la imagen y devolvé SOLO un JSON (sin backticks, sin texto fuera) con esta forma:
{
  "views": number|null, "likes": number|null, "comments": number|null, "shares": number|null, "saves": number|null,
  "watch_time_avg_seconds": number|null, "hook_hold_3s_percent": number|null, "midpoint_hold_percent": number|null,
  "completion_rate_percent": number|null, "followers_ganados": number|null, "profile_visits": number|null,
  "link_clicks": number|null, "dms_recibidos": number|null,
  "confidence": "high"|"medium"|"low", "notes": "qué leíste / qué dudaste"
}
Reglas: convertí "1.2K"→1200, "3,4 M"→3400000, "12.345"→12345. Si un campo NO aparece en la imagen, usá null. NO inventes números.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return corsResponse(req, { error: "Method not allowed" }, 405);
  if (!authOk(req)) return corsResponse(req, { error: "No autorizado" }, 401);

  try {
    const body = await req.json();
    const b64 = body.image_base64;
    if (!b64) return corsResponse(req, { error: "Falta image_base64" }, 400);
    const mediaType = body.media_type || "image/png";
    const hint = body.plataforma_hint ? `La plataforma es ${body.plataforma_hint}.` : "";

    const result = await callAnthropic({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      system: SYSTEM,
      feature: "metrics-ocr",
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: b64 } },
          { type: "text", text: `Leé los números de analytics de esta captura. ${hint}` },
        ],
      }],
    });
    if (!result.ok) return corsResponse(req, { error: result.error || "Anthropic error", status: result.status }, 502);

    const text = extractText(result.data);
    let parsed: Record<string, unknown> = {};
    try {
      const s = text.indexOf("{"), e = text.lastIndexOf("}");
      parsed = JSON.parse(text.slice(s, e + 1));
    } catch (_e) {
      return corsResponse(req, { error: "JSON inválido de la IA", raw: text.slice(0, 800) }, 200);
    }
    const confidence = (parsed.confidence as string) || "medium";
    const notes = (parsed.notes as string) || "";
    delete parsed.confidence; delete parsed.notes;
    return corsResponse(req, { extracted: parsed, confidence, notes });
  } catch (e) {
    return corsResponse(req, { error: String((e as Error).message || e) }, 500);
  }
});
