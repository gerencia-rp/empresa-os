// RentCast proxy — la API key vive SOLO en el backend (RENTCAST_API_KEY secret).
// El front nunca la ve; toda llamada pasa por acá con el header X-Api-Key.
// GET/POST ?address=...&endpoint=value|rent&refresh=true
// Cache 30 días en rentcast_cache; cuenta llamadas en rentcast_usage (límite 50 gratis).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const KEY = Deno.env.get("RENTCAST_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type, apikey", "Content-Type": "application/json" };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: CORS });
const CACHE_DAYS = 30;
const norm = (s: string) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  try {
    const url = new URL(req.url);
    let address = url.searchParams.get("address") || "";
    let endpoint = url.searchParams.get("endpoint") || "value";  // value | rent
    let refresh = url.searchParams.get("refresh") === "true";
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      address = body.address || address; endpoint = body.endpoint || endpoint; refresh = body.refresh || refresh;
    }
    if (!address) return json({ ok: false, error: "falta address" }, 400);
    if (!KEY) return json({ ok: false, error: "RENTCAST_API_KEY no configurada en el backend", disponible: false }, 200);

    const db = createClient(SUPABASE_URL, SERVICE_KEY);
    const key = norm(address);
    const ep = endpoint === "rent" ? "avm_rent" : "avm_value";

    // cache
    if (!refresh) {
      const { data: c } = await db.from("rentcast_cache").select("*").eq("address_norm", key).eq("endpoint", ep).eq("active", true).maybeSingle();
      if (c && c.fetched_at && (Date.now() - new Date(c.fetched_at).getTime()) / 86400000 < CACHE_DAYS) {
        return json({ ok: true, cached: true, fetched_at: c.fetched_at, endpoint: ep, value: c.value, payload: c.payload });
      }
    }

    // llamar RentCast
    const path = endpoint === "rent"
      ? `/avm/rent/long-term?address=${encodeURIComponent(address)}`
      : `/avm/value?address=${encodeURIComponent(address)}`;
    const res = await fetch(`https://api.rentcast.io/v1${path}`, { headers: { "X-Api-Key": KEY, Accept: "application/json" } });
    // contar la llamada (aunque falle, consume cuota si llegó al server)
    const { data: u } = await db.from("rentcast_usage").select("llamadas").eq("id", 1).maybeSingle();
    await db.from("rentcast_usage").update({ llamadas: (u?.llamadas || 0) + 1, ultima: new Date().toISOString() }).eq("id", 1);

    if (!res.ok) {
      const txt = await res.text();
      return json({ ok: false, disponible: false, status: res.status, error: `RentCast ${res.status}: ${txt.slice(0, 160)}`, llamadas: (u?.llamadas || 0) + 1 }, 200);
    }
    const data = await res.json();
    const value = endpoint === "rent" ? (data.rent ?? data.rentEstimate ?? null) : (data.price ?? data.value ?? null);

    await db.from("rentcast_cache").upsert({ address_norm: key, endpoint: ep, address, payload: data, value, fetched_at: new Date().toISOString(), active: true, archived_at: null }, { onConflict: "address_norm,endpoint" });

    return json({ ok: true, cached: false, endpoint: ep, value, payload: data, llamadas: (u?.llamadas || 0) + 1 });
  } catch (e) {
    return json({ ok: false, disponible: false, error: String((e as any)?.message || e) }, 200);
  }
});
