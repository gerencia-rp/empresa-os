// QuickBooks OAuth multi-empresa (Intuit OAuth2) — conecta cada company de QBO a una empresa del holding.
// Rutas (públicas para el redirect de Intuit; deploy con --no-verify-jwt):
//   POST /qb-oauth/authorize?empresa=fix_flip|remodelacion|rentas|educacion → devuelve URL de Intuit (admin)
//   GET /qb-oauth/callback?code=&realmId=&state=   → intercambia tokens, guarda + mapea empresa
//   GET /qb-oauth/status                            → conexiones (SIN tokens)
//   GET /qb-oauth/pnl?empresa=X                     → P&L YTD de esa empresa (verificación)
//   GET /qb-oauth/balance?empresa=X                 → Balance Sheet (verificación)
// Secrets: QB_CLIENT_ID, QB_CLIENT_SECRET (Intuit app), SUPABASE_SERVICE_ROLE_KEY.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { requireAuth } from "../_shared/auth.ts";

const CLIENT_ID = Deno.env.get("QBP_CLIENT_ID") || Deno.env.get("QB_CLIENT_ID") || "";
const CLIENT_SECRET = Deno.env.get("QBP_CLIENT_SECRET") || Deno.env.get("QB_CLIENT_SECRET") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET") || "";
const SELF = `${SUPABASE_URL}/functions/v1/qb-oauth`;
const REDIRECT_URI = `${SELF}/callback`;
const QBO_API = "https://quickbooks.api.intuit.com/v3/company";
const EMPRESAS = ["fix_flip", "remodelacion", "rentas", "educacion"];
const EMPRESA_LBL: Record<string, string> = { fix_flip: "Fix & Flip (Flipping Rentals LLC)", remodelacion: "Remodelación (Structure One LLC)", rentas: "Rentas (EverHome LLC)", educacion: "Educación (Rental Profits LLC)" };

function b64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function fromB64url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
}
async function oauthState(empresa: string): Promise<string> {
  const payload = b64url(new TextEncoder().encode(JSON.stringify({ empresa, exp: Date.now() + 10 * 60_000, nonce: crypto.randomUUID() })));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(CLIENT_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload)));
  return payload + '.' + b64url(sig);
}
async function verifyOauthState(state: string): Promise<string | null> {
  const [payload, signature] = String(state || '').split('.');
  if (!payload || !signature) return null;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(CLIENT_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('HMAC', key, fromB64url(signature), new TextEncoder().encode(payload));
  if (!ok) return null;
  const decoded = JSON.parse(new TextDecoder().decode(fromB64url(payload)));
  return decoded && decoded.exp >= Date.now() && EMPRESAS.includes(decoded.empresa) ? decoded.empresa : null;
}

const html = (body: string, status = 200) => new Response(
  `<!doctype html><html><head><meta charset="utf-8"><title>QuickBooks · Rental Profits OS</title><style>body{font-family:-apple-system,sans-serif;background:#0b1220;color:#e8eefc;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}div{max-width:560px;padding:32px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:16px;line-height:1.6}b{color:#12b5a0}.err{color:#f87171}</style></head><body><div>${body}</div></body></html>`,
  { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o, null, 1), { status, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" } });

function sb() { return createClient(SUPABASE_URL, SERVICE_KEY); }
function canOperate(req: Request, url: URL) {
  const auth = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const cron = req.headers.get("x-cron-secret") || url.searchParams.get("secret") || "";
  return auth === SERVICE_KEY || (!!CRON_SECRET && (auth === CRON_SECRET || cron === CRON_SECRET));
}

async function tokenExchange(params: Record<string, string>) {
  const res = await fetch("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${CLIENT_ID}:${CLIENT_SECRET}`),
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams(params).toString(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Intuit token ${res.status}: ${JSON.stringify(data).slice(0, 300)}`);
  return data;
}

// Token vigente para una empresa (refresh automático si venció)
async function accessTokenFor(empresa: string): Promise<{ token: string; realm: string; company: string }> {
  const db = sb();
  const { data: c } = await db.from("qb_connections").select("*").eq("empresa", empresa).eq("active", true).maybeSingle();
  if (!c) throw new Error(`Empresa ${empresa} sin conexión QB`);
  const expira = c.token_expires_at ? new Date(c.token_expires_at).getTime() : 0;
  if (expira - Date.now() > 120_000) return { token: c.access_token, realm: c.realm_id, company: c.company_name };
  const t = await tokenExchange({ grant_type: "refresh_token", refresh_token: c.refresh_token });
  await db.from("qb_connections").update({
    access_token: t.access_token, refresh_token: t.refresh_token,
    token_expires_at: new Date(Date.now() + (t.expires_in || 3600) * 1000).toISOString(),
    refresh_expires_at: new Date(Date.now() + (t.x_refresh_token_expires_in || 8726400) * 1000).toISOString(),
    last_refreshed_at: new Date().toISOString(),
  }).eq("realm_id", c.realm_id);
  return { token: t.access_token, realm: c.realm_id, company: c.company_name };
}

async function qboGet(empresa: string, path: string) {
  const { token, realm } = await accessTokenFor(empresa);
  return qboGetWithToken(token, realm, path);
}

async function qboGetWithToken(token: string, realm: string, path: string) {
  const res = await fetch(`${QBO_API}/${realm}${path}`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
  const data = await res.json();
  if (!res.ok) throw new Error(`QBO ${res.status}: ${JSON.stringify(data).slice(0, 300)}`);
  return data;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true });
  const url = new URL(req.url);
  const path = url.pathname.split("/qb-oauth")[1] || "/";
  try {
    if (!CLIENT_ID || !CLIENT_SECRET) {
      return html(`<h2 class="err">Faltan credenciales</h2><p>Seteá <b>QB_CLIENT_ID</b> y <b>QB_CLIENT_SECRET</b> en Supabase Secrets (app de developer.intuit.com) y registrá este redirect URI en la app:</p><p><code>${REDIRECT_URI}</code></p>`, 500);
    }

    if (path.startsWith("/authorize")) {
      if (req.method !== 'POST') return json({ ok: false, error: 'Usá POST autenticado para iniciar la conexión.' }, 405);
      const authUser = await requireAuth(req, { requireAdmin: true });
      if (!authUser.ok) return json({ ok: false, error: authUser.error }, authUser.status || 401);
      const empresa = url.searchParams.get("empresa") || "";
      if (!EMPRESAS.includes(empresa)) return html(`<h2 class="err">Empresa inválida</h2><p>Usá ?empresa= ${EMPRESAS.join(" | ")}</p>`, 400);
      const auth = new URL("https://appcenter.intuit.com/connect/oauth2");
      auth.searchParams.set("client_id", CLIENT_ID);
      auth.searchParams.set("response_type", "code");
      auth.searchParams.set("scope", "com.intuit.quickbooks.accounting");
      auth.searchParams.set("redirect_uri", REDIRECT_URI);
      auth.searchParams.set("state", await oauthState(empresa));
      return json({ ok: true, authorize_url: auth.toString(), expires_in_seconds: 600 });
    }

    if (path.startsWith("/callback")) {
      const code = url.searchParams.get("code"), realmId = url.searchParams.get("realmId"), empresa = await verifyOauthState(url.searchParams.get("state") || "");
      if (!code || !realmId) return html(`<h2 class="err">Callback incompleto</h2><p>${url.search}</p>`, 400);
      if (!empresa) return html(`<h2 class="err">Conexión rechazada</h2><p>El estado OAuth es inválido o venció. Iniciá nuevamente desde Empresa OS.</p>`, 401);
      const t = await tokenExchange({ grant_type: "authorization_code", code, redirect_uri: REDIRECT_URI });
      // nombre legal de la company
      let companyName = realmId;
      try {
        const info = await fetch(`${QBO_API}/${realmId}/companyinfo/${realmId}`, { headers: { Authorization: `Bearer ${t.access_token}`, Accept: "application/json" } }).then(r => r.json());
        companyName = info?.CompanyInfo?.CompanyName || realmId;
      } catch (_) { /* best effort */ }
      const db = sb();
      // si la empresa ya tenía otra company activa, archivarla (soft-delete)
      await db.from("qb_connections").update({ active: false, archived_at: new Date().toISOString() }).eq("empresa", empresa).neq("realm_id", realmId).eq("active", true);
      await db.from("qb_connections").upsert({
        realm_id: realmId, company_name: companyName, empresa,
        access_token: t.access_token, refresh_token: t.refresh_token,
        token_expires_at: new Date(Date.now() + (t.expires_in || 3600) * 1000).toISOString(),
        refresh_expires_at: new Date(Date.now() + (t.x_refresh_token_expires_in || 8726400) * 1000).toISOString(),
        connected_at: new Date().toISOString(), active: true, archived_at: null,
      }, { onConflict: "realm_id" });
      return html(`<h2>✅ Conectada</h2><p><b>${companyName}</b> (realm ${realmId})<br>→ mapeada a <b>${EMPRESA_LBL[empresa] || empresa}</b></p><p>Podés cerrar esta pestaña y conectar la siguiente empresa.</p>`);
    }

    if (path.startsWith("/status")) {
      const authUser = await requireAuth(req, { requireAdmin: true });
      if (!authUser.ok) return json({ ok: false, error: authUser.error }, authUser.status || 401);
      const { data } = await sb().from("qb_connections").select("empresa, company_name, connected_at, last_refreshed_at, token_expires_at").eq("active", true).order("empresa");
      return json({ ok: true, conexiones: data || [], esperadas: EMPRESA_LBL });
    }

    if (path.startsWith("/pnl") || path.startsWith("/balance")) {
      if (!canOperate(req, url)) return json({ ok: false, error: "No autorizado" }, 401);
      const empresa = url.searchParams.get("empresa") || "";
      const isPnl = path.startsWith("/pnl");
      const y = new Date().getFullYear();
      const from = url.searchParams.get("from") || `${y}-01-01`;
      const to = url.searchParams.get("to") || new Date().toISOString().slice(0, 10);
      const rep = isPnl
        ? await qboGet(empresa, `/reports/ProfitAndLoss?start_date=${from}&end_date=${to}`)
        : await qboGet(empresa, `/reports/BalanceSheet?date_macro=Today`);
      // resumen compacto: filas de nivel 1 con totales
      const rows: Array<{ label: string; value: string }> = [];
      const walk = (r: any) => { (r?.Row || []).forEach((row: any) => { const h = row.Summary?.ColData || row.Header?.ColData; if (h && h[0]?.value) rows.push({ label: h[0].value, value: (row.Summary?.ColData || [])[1]?.value ?? "" }); if (row.Rows) walk(row.Rows); }); };
      walk(rep?.Rows);
      return json({ ok: true, empresa, reporte: isPnl ? "P&L YTD" : "Balance", company: rep?.Header?.ReportName ? undefined : undefined, header: rep?.Header, resumen: rows.slice(0, 25) });
    }

    if (path.startsWith("/sync")) {
      if (!canOperate(req, url)) return json({ ok: false, error: "No autorizado" }, 401);
      const db = sb();
      const { data: conns } = await db.from("qb_connections").select("empresa").eq("active", true);
      const y = new Date().getFullYear();
      const hoy = new Date().toISOString().slice(0, 10);
      const out: Record<string, any> = {};
      const runStart = new Date().toISOString();
      await Promise.all((conns || []).map(async c => {
        const emp = c.empresa;
        const reports: Array<[string, string]> = [
          ["pnl_ytd", `/reports/ProfitAndLoss?start_date=${y}-01-01&end_date=${hoy}`],
          ["pnl_all", `/reports/ProfitAndLoss?start_date=2018-01-01&end_date=${hoy}`],
          ["balance", `/reports/BalanceSheet?date_macro=Today`],
        ];
        out[emp] = {};
        let auth: { token: string; realm: string; company: string };
        try { auth = await accessTokenFor(emp); }
        catch (e) {
          reports.forEach(([name]) => { out[emp][name] = "err: " + String((e as any)?.message || e).slice(0, 100); });
          return;
        }
        await Promise.all(reports.map(async ([name, pathQ]) => {
          try {
            const rep = await qboGetWithToken(auth.token, auth.realm, pathQ);
            const rows: Array<{ label: string; value: number }> = [];
            const walk = (r: any) => { (r?.Row || []).forEach((row: any) => {
              // totales/subtotales (Summary) + cuentas HOJA (Data rows con ColData directo)
              const h = row.Summary?.ColData || row.Header?.ColData || row.ColData;
              const cols = row.Summary?.ColData || row.ColData;
              if (h && h[0]?.value != null && cols && cols[1]?.value !== undefined && cols[1]?.value !== "") {
                const v = parseFloat(cols[1].value);
                if (!isNaN(v)) rows.push({ label: String(h[0].value).slice(0, 120), value: v });
              }
              if (row.Rows) walk(row.Rows);
            }); };
            walk(rep?.Rows);
            const seen = new Set<string>();
            const uniq = rows.filter(r => { if (seen.has(r.label)) return false; seen.add(r.label); return true; });
            for (let i = 0; i < uniq.length; i += 100) {
              await db.from("qb_report_cache").upsert(uniq.slice(i, i + 100).map(r => ({ empresa: emp, report: name, label: r.label, value: r.value, fetched_at: runStart, active: true, archived_at: null })), { onConflict: "empresa,report,label" });
            }
            await db.from("qb_report_cache").update({ active: false, archived_at: new Date().toISOString() }).eq("empresa", emp).eq("report", name).lt("fetched_at", runStart).eq("active", true);
            out[emp][name] = uniq.length;
          } catch (e) { out[emp][name] = "err: " + String((e as any)?.message || e).slice(0, 100); }
        }));
      }));
      const values = Object.values(out).flatMap(v => Object.values(v || {}));
      const errors = values.filter(v => typeof v === "string" && v.startsWith("err:")).length;
      const rows = values.filter(v => typeof v === "number").reduce((sum, v) => sum + Number(v), 0);
      const { data: agent } = await db.from("agent_registry").select("id").eq("nombre", "Cerebro Ejecutivo").is("deleted_at", null).maybeSingle();
      if (agent?.id) await db.from("agent_audit_log").insert({
        agent_id: agent.id,
        input: { tipo: "ejecucion_negocio", mode: "quickbooks_sync", source: "QuickBooks" },
        output: { source: "QuickBooks", companies: Object.keys(out).length, reports: values.length, rows, errors, fetched_at: runStart },
        resultado: errors ? "error" : "ok",
      });
      return json({ ok: errors === 0, sync: out, summary: { companies: Object.keys(out).length, reports: values.length, rows, errors, fetched_at: runStart } }, errors ? 207 : 200);
    }

    return html(`<h2>QuickBooks · Rental Profits OS</h2><p>Rutas: /authorize?empresa=… · /callback · /status · /pnl?empresa=… · /balance?empresa=…</p>`);
  } catch (e) {
    return json({ ok: false, error: String((e as any)?.message || e) }, 500);
  }
});
