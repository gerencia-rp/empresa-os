// ════════════════════════════════════════════════════════════════
// 📅 PM-SYNC-CALENDARS · Edge Function
// Sincroniza feeds iCal externos (Airbnb por ahora; arquitectura
// abierta para VRBO/Booking).
//
// Cada VEVENT del iCal genera/actualiza un pm_bookings con
// external_uid = UID iCal (idempotente).
// ════════════════════════════════════════════════════════════════
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { requireAuth } from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json"
};
const json = (b: any, s = 200) => new Response(JSON.stringify(b), { status: s, headers: cors });

// ────────────────────────────────────────────────────────────────
// Parser iCal (regex-based, no necesita lib externa)
// ────────────────────────────────────────────────────────────────
interface ICalEvent {
  uid: string;
  start: string;       // YYYY-MM-DD
  end: string;
  summary?: string;
  description?: string;
  status?: string;
}

function parseICal(raw: string): ICalEvent[] {
  // Unfold lines (iCal usa "\n " para continuar líneas largas)
  const unfolded = raw.replace(/\r?\n[ \t]/g, "");
  const blocks = unfolded.split(/BEGIN:VEVENT/i).slice(1);
  const events: ICalEvent[] = [];

  for (const block of blocks) {
    const endIdx = block.search(/END:VEVENT/i);
    if (endIdx < 0) continue;
    const body = block.slice(0, endIdx);
    const getProp = (name: string): string | undefined => {
      // Soporta props con parámetros: "DTSTART;VALUE=DATE:20260615"
      const re = new RegExp(`^${name}(;[^:\\r\\n]*)?:([^\\r\\n]+)`, "im");
      const m = body.match(re);
      return m ? m[2].trim() : undefined;
    };
    const parseDate = (raw?: string): string | undefined => {
      if (!raw) return undefined;
      // Formatos comunes:
      //   "20260615" (DATE)
      //   "20260615T120000Z" (DATETIME UTC)
      //   "20260615T120000" (local)
      const compact = raw.replace(/[-:]/g, "").substring(0, 8);
      if (!/^\d{8}$/.test(compact)) return undefined;
      return `${compact.slice(0,4)}-${compact.slice(4,6)}-${compact.slice(6,8)}`;
    };
    const uid = getProp("UID");
    const start = parseDate(getProp("DTSTART"));
    const end = parseDate(getProp("DTEND"));
    const summary = getProp("SUMMARY");
    const description = getProp("DESCRIPTION");
    const status = getProp("STATUS");
    if (uid && start && end) {
      events.push({ uid, start, end, summary, description, status });
    }
  }
  return events;
}

// ────────────────────────────────────────────────────────────────
// Inferencia desde el SUMMARY de Airbnb
// ────────────────────────────────────────────────────────────────
function inferTenantNameFromSummary(summary: string | undefined): string | null {
  if (!summary) return null;
  // Airbnb suele poner: "Reserved" o "Reserved - John Doe (HMABCD)" o el nombre directo
  // Formatos comunes:
  //   "Reserved"
  //   "Reserved · John D"
  //   "Reservation – John Doe"
  //   "Closed - Not available"
  if (/closed|not available|unavailable/i.test(summary)) return "BLOCKED";
  if (/reserved/i.test(summary)) {
    const m = summary.match(/(?:reserved|reservation)[\s\-–·:]+([A-Za-zÀ-ÿ][\w\s.-]+?)(?:\s*\([^)]+\))?$/i);
    if (m) return m[1].trim();
    return null; // "Reserved" puro sin nombre
  }
  // Si el summary es un nombre directo (sin "Reserved")
  if (summary.length < 100 && !/http|airbnb/i.test(summary)) return summary.trim();
  return null;
}

// ────────────────────────────────────────────────────────────────
// MAIN HANDLER
// ────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const auth = await requireAuth(req);
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status || 401);

  let body: any = {};
  try { body = await req.json(); } catch { return json({ ok: false, error: "JSON inválido" }, 400); }

  const { feed_ids, all = false, dry_run = false } = body;

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const startMs = Date.now();

  // 1) Decidir qué feeds sincronizar
  let feedsQuery = supabase.from("pm_calendar_feeds").select("*").eq("active", true);
  if (feed_ids && Array.isArray(feed_ids) && feed_ids.length) {
    feedsQuery = feedsQuery.in("id", feed_ids);
  } else if (!all) {
    return json({ ok: false, error: "Pasá feed_ids: [...] o all: true" }, 400);
  }
  const { data: feeds, error: feedsErr } = await feedsQuery;
  if (feedsErr) return json({ ok: false, error: "Error cargando feeds: " + feedsErr.message }, 500);
  if (!feeds || !feeds.length) return json({ ok: true, message: "Sin feeds activos para sincronizar", stats: {} });

  const summary: any = { feeds_processed: 0, total_added: 0, total_updated: 0, total_events: 0, errors: [] };

  for (const feed of feeds) {
    if (!feed.source_url) {
      summary.errors.push(`Feed ${feed.id}: sin source_url`);
      continue;
    }
    const feedStart = Date.now();
    let ics: string;
    try {
      const r = await fetch(feed.source_url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      ics = await r.text();
    } catch (e: any) {
      const errMsg = `Feed ${feed.platform || 'unknown'}: fetch falló — ${e.message}`;
      summary.errors.push(errMsg);
      if (!dry_run) {
        await supabase.from("pm_calendar_feeds").update({
          last_synced_at: new Date().toISOString(),
          last_status: "error",
          last_error: errMsg
        }).eq("id", feed.id);
      }
      continue;
    }

    let events: ICalEvent[];
    try {
      events = parseICal(ics);
    } catch (e: any) {
      const errMsg = `Feed ${feed.platform}: parse falló — ${e.message}`;
      summary.errors.push(errMsg);
      if (!dry_run) {
        await supabase.from("pm_calendar_feeds").update({
          last_synced_at: new Date().toISOString(),
          last_status: "error",
          last_error: errMsg
        }).eq("id", feed.id);
      }
      continue;
    }

    summary.total_events += events.length;
    let added = 0, updated = 0;

    if (!dry_run) {
      // Lookup unit info para denormalizar
      let unitProperty: string | null = null;
      if (feed.unit_id) {
        const { data: u } = await supabase.from("pm_units").select("property_id").eq("id", feed.unit_id).single();
        unitProperty = u?.property_id || null;
      }

      // Upsert por cada VEVENT
      const bookingsToUpsert = events.map(ev => {
        const tenantHint = inferTenantNameFromSummary(ev.summary);
        const isBlocked = tenantHint === "BLOCKED";
        // En iCal, DTEND es exclusivo (no se ocupa esa noche). Lo ajustamos a fecha anterior.
        const endDate = new Date(ev.end + "T00:00:00Z");
        endDate.setUTCDate(endDate.getUTCDate() - 1);
        const endStr = endDate.toISOString().slice(0, 10);

        return {
          external_uid: `${feed.id}|${ev.uid}`,
          feed_id: feed.id,
          unit_id: feed.unit_id,
          property_id: feed.property_id || unitProperty,
          booking_type: feed.platform || "otro",
          start_date: ev.start,
          end_date: endStr,
          rent_amount: feed.default_rent || 0,
          rent_period: feed.default_period || "estadia",
          status: isBlocked ? "cancelado" : (ev.status?.toLowerCase() === "cancelled" ? "cancelado" : "confirmado"),
          notes: ev.description || ev.summary || null,
          title: ev.summary || `${feed.platform} reservation`
        };
      });

      // Upsert en chunks de 50
      for (let i = 0; i < bookingsToUpsert.length; i += 50) {
        const chunk = bookingsToUpsert.slice(i, i + 50);
        const { error: upErr, count } = await supabase
          .from("pm_bookings")
          .upsert(chunk, { onConflict: "external_uid", count: "exact" });
        if (upErr) {
          summary.errors.push(`Feed ${feed.platform}: upsert error — ${upErr.message}`);
          continue;
        }
        added += chunk.length; // Aproximado (no diferencia insert vs update fácilmente)
      }

      // Update feed con estado
      await supabase.from("pm_calendar_feeds").update({
        last_synced_at: new Date().toISOString(),
        last_status: "success",
        last_error: null,
        last_added: added,
        last_total: events.length
      }).eq("id", feed.id);
    } else {
      added = events.length;
    }

    summary.feeds_processed++;
    summary.total_added += added;
    console.log(`[ical-sync] Feed ${feed.platform} (${feed.id}): ${events.length} eventos, ${added} sincronizados en ${Date.now() - feedStart}ms`);
  }

  return json({
    ok: true,
    dry_run,
    stats: summary,
    duration_ms: Date.now() - startMs
  });
});
