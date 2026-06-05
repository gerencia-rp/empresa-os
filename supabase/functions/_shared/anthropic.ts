// ════════════════════════════════════════════════════════════
// 🤖 Helper centralizado para llamadas a Anthropic API
// Resuelve: retry con backoff exponencial · rate-limit detection ·
// logging estructurado en ai_calls · timeouts.
// Reemplaza el fetch directo en generate-presentation, fm-ai-coach,
// ai-deep-analyze, edu-whatsapp-*, deep-property-analysis, remodel-ai.
// ════════════════════════════════════════════════════════════
import { createClient } from "jsr:@supabase/supabase-js@2";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export interface AnthropicCallOpts {
  model?: string;                  // 'claude-sonnet-4-5' default
  max_tokens?: number;             // 8000 default
  messages: Array<{ role: string; content: any }>;
  system?: string | Array<any>;
  tools?: any[];
  thinking?: { type: string; budget_tokens: number };
  // Telemetría
  user_id?: string;                // para log y rate limit
  feature?: string;                // 'presentation' | 'fm-coach' | 'whatsapp-generate' | ...
  timeoutMs?: number;              // 240000 default (4 min)
  maxRetries?: number;             // 2 default
}

export interface AnthropicCallResult {
  ok: boolean;
  data?: any;
  error?: string;
  status?: number;
  retried?: number;
  duration_ms?: number;
  tokens_in?: number;
  tokens_out?: number;
  cache_read?: number;
  cache_creation?: number;
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/**
 * Llama Anthropic con retry + timeout + logging.
 * Backoff: 1s, 3s, 9s.
 */
export async function callAnthropic(opts: AnthropicCallOpts): Promise<AnthropicCallResult> {
  if (!ANTHROPIC_KEY) return { ok: false, error: "Falta ANTHROPIC_API_KEY", status: 500 };

  const body: any = {
    model: opts.model || "claude-sonnet-4-5",
    max_tokens: opts.max_tokens || 8000,
    messages: opts.messages
  };
  if (opts.system) body.system = opts.system;
  if (opts.tools) body.tools = opts.tools;
  if (opts.thinking) body.thinking = opts.thinking;

  const maxRetries = opts.maxRetries ?? 2;
  const timeoutMs = opts.timeoutMs || 240000;
  const startMs = Date.now();
  let lastErr = "";
  let lastStatus = 0;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const ctrl = new AbortController();
    const tmr = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const r = await fetch(ANTHROPIC_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify(body),
        signal: ctrl.signal
      });
      clearTimeout(tmr);
      const duration_ms = Date.now() - startMs;

      if (r.ok) {
        const data = await r.json();
        const tokens_in = data?.usage?.input_tokens || 0;
        const tokens_out = data?.usage?.output_tokens || 0;
        const cache_read = data?.usage?.cache_read_input_tokens || 0;
        const cache_creation = data?.usage?.cache_creation_input_tokens || 0;

        // Log async (no bloquea respuesta)
        logCall({
          user_id: opts.user_id,
          feature: opts.feature || "unknown",
          model: body.model,
          status: "success",
          duration_ms,
          tokens_in, tokens_out, cache_read, cache_creation,
          retried: attempt
        }).catch(() => {});

        return {
          ok: true, data, duration_ms, tokens_in, tokens_out,
          cache_read, cache_creation, retried: attempt
        };
      }

      // Error de la API. 429/529 → retry con backoff. 4xx → abort.
      const txt = await r.text();
      lastStatus = r.status;
      lastErr = `Anthropic ${r.status}: ${txt.slice(0, 400)}`;

      if (r.status === 429 || r.status === 529 || r.status >= 500) {
        if (attempt < maxRetries) {
          await sleep(1000 * Math.pow(3, attempt)); // 1s, 3s, 9s
          continue;
        }
      }
      // No-retryable
      break;
    } catch (e: any) {
      clearTimeout(tmr);
      lastErr = e?.name === "AbortError" ? `Timeout (${timeoutMs}ms)` : (e?.message || String(e));
      if (attempt < maxRetries && e?.name !== "AbortError") {
        await sleep(1000 * Math.pow(3, attempt));
        continue;
      }
      break;
    }
  }

  const duration_ms = Date.now() - startMs;
  logCall({
    user_id: opts.user_id, feature: opts.feature || "unknown",
    model: body.model, status: "error", duration_ms,
    error: lastErr, retried: maxRetries
  }).catch(() => {});

  return { ok: false, error: lastErr, status: lastStatus || 500, duration_ms, retried: maxRetries };
}

/**
 * Inserta el log de la llamada en ai_calls (best effort).
 * No bloquea la respuesta al usuario.
 */
async function logCall(row: any) {
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    await sb.from("ai_calls").insert({
      user_id: row.user_id || null,
      feature: row.feature || "unknown",
      model: row.model || null,
      status: row.status || "success",
      duration_ms: row.duration_ms || null,
      tokens_in: row.tokens_in || null,
      tokens_out: row.tokens_out || null,
      cache_read: row.cache_read || null,
      cache_creation: row.cache_creation || null,
      retried: row.retried || 0,
      error_message: row.error ? String(row.error).slice(0, 1000) : null
    });
  } catch {}
}

/**
 * Extrae el texto plano de la respuesta de Anthropic (content blocks).
 */
export function extractText(result: any): string {
  if (!result?.content) return "";
  return result.content
    .filter((c: any) => c.type === "text")
    .map((c: any) => c.text)
    .join("\n");
}

/**
 * Rate limit por user_id desde tabla ai_calls.
 * Devuelve true si OK, false si excedido.
 */
export async function checkRateLimit(
  user_id: string | undefined,
  windowMin: number,
  maxCalls: number
): Promise<{ ok: boolean; recent: number }> {
  if (!user_id) return { ok: true, recent: 0 };
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    const since = new Date(Date.now() - windowMin * 60 * 1000).toISOString();
    const { count } = await sb
      .from("ai_calls")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user_id)
      .gte("created_at", since);
    const recent = count || 0;
    return { ok: recent < maxCalls, recent };
  } catch {
    return { ok: true, recent: 0 };
  }
}
