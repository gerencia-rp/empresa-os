// Sync Fix & Flip: Airtable "Flipping Rentals matriz" (applMXFyPq1hXj7iN) → ff_* (Supabase).
// Molde de sync-remodel-airtable: upsert por airtable_id + archive-unseen (soft-delete) + assert de paridad.
// Mapea DIRECTO de los campos fuente (una sola definición por métrica; remodel_complete = Costo Remodelación
// Real, el mismo número que la base de Remodelación — consistencia cross-empresa).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const AIRTABLE_TOKEN = Deno.env.get("AIRTABLE_TOKEN")!;
const BASE = Deno.env.get("AIRTABLE_BASE_ID_FF") || "applMXFyPq1hXj7iN";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const T = {
  deals: "tblw28KVOUcCAKZBU",      // Propiedades
  draws: "tblB9Wh3303LTbI5k",      // Desglose Draws
  investors: "tblWM1oaWDu0Ukdqf",  // Inversionistas
  equipo: "tblE9UANWoYdlbEhX",     // Gastos Equipo Fix and Flip
  plataformas: "tblvULaFPu8YqDy1l",// Gasto Plataformas Fix And Flip
  hml: "tblV4wNA8hNs5Mmk8",        // Pagos HML
  datosCasa: "tbluy4xlHJav9RtrZ", // Datos por casa (préstamo HML)
};

const F = {
  deals: { dir: "fldaDd6TuMkEKILyn", estado: "fldzXun3iR1Bqucs9", modeloNegocio: "flddjD6WsvC98sM1k", ciudad: "fldupd1Y33ciLAHjj", compra: "fldeJFg5lD5L69Hio", remodelEst: "fldsRWMQJ4Lv86GOU", remodelReal: "fld9VNYFBzFI3tRdc", arv: "fldPmfjmdVv7PRxjK", appraisal: "fldLz4tIq3KMkS22h", cierre: "fldG2SABUD5Ptcuj8", estrategia: "fldyijwnFRD2yFrx5", hmlPago: "fldMglNT8uPBvBZat", ref30: "fldaFJSXqjV7VXiCI", sqft: "fldZtdnJytZnfMYxI", cashout: "fldqIlx3P6eWXh6Pn", adq: "fldQ03XEnRDfow20c", invLink: "fld8O5pRBbbKy8eHf", capInv: "fld2aby0lrH7iQNWw", capAportado: "fldrePoqg3C3caiZ5", rentProm: "fld9aN2wuYOIQs8fI", utilEntregada: "fldi8gnI3G1qw3s0P", deficitTotal: "fldyglRho5ubMH0WU", rentaMes: "fldj3xoSM5amtrBOQ", gastosMes: "fldnid53AmifS7kK1", ownership: "flddh8bS7oP34ak1M", investorPct: "fldS7Jx6LgM19BXcY", apprLink: "fldOg97WmkVIQ0k0o" },
  draws: { dir: "fldEU8dXcmwovZP16", drawsMenosDef: "fldL4iMolqEibENFj", total: "fld208iuposxA20W0", meses: "fldEVC4tKVI5gnvrm", intHml: "fldf3D0KEwJv8CLZA", utilHml: "fldXsh3w2phWLiAmE", intRent: "fldH5ARDkRu1QL3Ny", utilRent: "fldpmyUxjat9b1s2d", muebles: "fldXwCW30iscTn3iL", appraisal: "fldSB6YjUmMZku28J", otros: "fld7D7gN3GuhTMzaU", rent: "fldOezTNcwnaWW7bD", refi: "fldEYY25oThUoOOIb", remodelRealLk: "fldr4DfeUx99NYC5R" },
  inv: { nombre: "fldI09roeZswP65PK", etiqueta: "fldaSlCHNfi5dqKDi", email: "fldoixuufPLltt6ZF", tel: "fldZKnOD3pu8CP3WS", ciudad: "fldSvCPZsP5J1Mhf4", estado: "fldQukBRQ8bhCrffa", rangos: "fldnguKQ6cgTiBNBR", w9: "fldyLYGF9RuHQw2si", socio: "fldB0k2KTsR4rvZHJ", socioNombre: "fld5rdexk6h7iJ1UZ", propLink: "fldJZcAtnPeC8EN1c", capLookup: "fldXMQGQDauo5HnnV", capPagado: "fld0oPQaFZK8Drv3h" },
  eq: { name: "fldSsNBs1zQ6YZPxm", salario: "fldRIzVjmccCPyslQ", mes: "fldwdnqHKkr4Pvl9y", nombre: "fldckFo7H81jAMaBY" },
  pl: { plataforma: "fldZUdExLDg4nsjeY", mes: "fldMblARwfiZ2NVqq", valor: "fldaV7Mc21PaMYwg4" },
  hml: { prop: "fldDyPAYGHDBmBdvk", fecha: "fld7y5uQLeJlCHgno", pago: "fldDe1BDW4fP5s3WR", fee: "fldrSE3aeiMqkfpHE", ref30: "fldWACGPEKKhLp206", fechaRef: "fldlDpPWUnYhIsETm", check: "fldOOSgpzzdfw8ABA" },
  dc: { prop: "fldgRmcy4oAfn9JYQ", cierre: "fld58rjMzZuoEwtDj", down: "fldxuB3kYq8cNQHIK", ctc: "fldzH5n6milc56KAU", monto: "fldZnz7Sq9iSuTtLe", tasa: "fld4Hv76aZCjXVhQ3", plazo: "fldbnPE1wT9Fm6D46", ini: "fldFI4BNG08elmnO1", venc: "flddtzbmaVXAPSSoC", rehabIni: "fldlhgKbDSkeXrXzi", rehabFin: "fldPul8pDQ3bHrirm", drAprob: "fld3UZOKmHMOw6VmS", drCobr: "fldlyv2c38vhBLHDd",
    // refi (Calc 3 Cash-Out): préstamo DSCR real, payoff real, fecha y % del banco (lookup)
    refiMonto: "fldif2zUp7yJDfiAu", refiPagado: "fldZsDNjV8DmJH7Wd", refiFecha: "fldttSOwH3FXQfZJr", refiPct: "fldiHb7SktnfkT5F1",
    // venta (Analítica S2 — rentabilidad realizada)
    ventaPrecio: "fldvBmFii4u9OtKy9", ventaUtilBruta: "fldFB9AoZ6q3jJNRY", ventaUtilNeta: "fld5t3ETIYxpHD7Z5", ventaRoi: "fld0V8zYdDJhUX4mL",
    ventaFecha: "fldq9iOwlJ0jY8hen" }, // "Fecha de Venta" — XIRR con la venta REAL en su fecha (E4)
};

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const norm = (s: any) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const num = (v: any) => (typeof v === "number" ? v : null);
const sel = (v: any) => (v == null ? null : typeof v === "string" ? v : (v.name ?? (Array.isArray(v) ? v.map((x: any) => x?.name ?? x).filter(Boolean).join(", ") : null)));
const lookupSum = (v: any): number | null => {
  if (v == null) return null;
  if (Array.isArray(v)) { const nums = v.map((x: any) => (typeof x === "number" ? x : null)).filter((x: any) => x != null); return nums.length ? nums.reduce((s: number, x: number) => s + x, 0) : null; }
  if (typeof v === "object" && v.valuesByLinkedRecordId) { let t = 0, any = false; Object.values(v.valuesByLinkedRecordId).forEach((arr: any) => (arr || []).forEach((x: any) => { if (typeof x === "number") { t += x; any = true; } })); return any ? t : null; }
  return typeof v === "number" ? v : null;
};
const linkIds = (v: any): string | null => {
  if (!Array.isArray(v) || !v.length) return null;
  return v.map((x: any) => (typeof x === "string" ? x : x?.id)).filter(Boolean).join(",");
};
const lookup1 = (v: any) => { // lookup de Airtable: array de valores o {valuesByLinkedRecordId}
  if (v == null) return null;
  if (Array.isArray(v)) return num(v[0]);
  if (typeof v === "object" && v.valuesByLinkedRecordId) { const k = Object.keys(v.valuesByLinkedRecordId)[0]; return k ? num(v.valuesByLinkedRecordId[k]?.[0]) : null; }
  return num(v);
};
const stageNorm = (v: any) => { const s = sel(v); return s ? s.toLowerCase().trim().replace(/\s+/g, "_") : null; };

async function fetchAll(tableId: string): Promise<any[]> {
  const recs: any[] = []; let offset: string | undefined;
  do {
    const url = new URL(`https://api.airtable.com/v0/${BASE}/${tableId}`);
    url.searchParams.set("returnFieldsByFieldId", "true");
    if (offset) url.searchParams.set("offset", offset);
    const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } });
    if (!res.ok) throw new Error(`Airtable ${tableId} ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    recs.push(...(data.records || [])); offset = data.offset;
  } while (offset);
  return recs;
}

async function upsert(sb: any, table: string, rows: any[]) {
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await sb.from(table).upsert(rows.slice(i, i + 500), { onConflict: "airtable_id" });
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

async function archiveUnseen(sb: any, table: string, runStartIso: string) {
  await sb.from(table).update({ active: false, archived_at: new Date().toISOString() })
    .lt("last_synced_at", runStartIso).eq("active", true);
}

async function parity(sb: any, source: string, airtableCount: number, table: string) {
  const { count } = await sb.from(table).select("airtable_id", { count: "exact", head: true }).eq("active", true);
  await sb.from("remodel_sync_parity").upsert({
    source, airtable_count: airtableCount, mirror_count: count ?? 0,
    in_sync: (count ?? 0) === airtableCount, checked_at: new Date().toISOString(),
  }, { onConflict: "source" });
  return { airtable: airtableCount, mirror: count ?? 0 };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const startMs = Date.now();
  const runStartIso = new Date(startMs).toISOString();
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    const now = () => new Date().toISOString();

    // 1) DEALS (Propiedades)
    const dealsRecs = await fetchAll(T.deals);
    const addrById: Record<string, string> = {};
    const dealRows = dealsRecs.map((r) => {
      const f = r.fields || {};
      const addr = f[F.deals.dir] || null;
      if (addr) addrById[r.id] = addr;
      return {
        airtable_id: r.id, address: addr, address_norm: norm(addr), city: f[F.deals.ciudad] || null,
        stage: stageNorm(f[F.deals.estado]), strategy: (() => { const s = (sel(f[F.deals.estrategia]) || "").toLowerCase(); return s.includes("flip") ? "flip" : s ? "hold" : null; })(),
        estrategia: sel(f[F.deals.estrategia]) || null,        // palabra COMPLETA (obs CEO: no "HOLD" recortado)
        modelo_negocio: sel(f[F.deals.modeloNegocio]) || null, // "Prestación de Servicios como Operador" ≠ portafolio
        purchase_price: num(f[F.deals.compra]), remodel_est: num(f[F.deals.remodelEst]), remodel_real: num(f[F.deals.remodelReal]), arv: num(f[F.deals.arv]),
        appraisal: num(f[F.deals.appraisal]), appraisal_link: f[F.deals.apprLink] || null, hml_payment: num(f[F.deals.hmlPago]), ref30_payment: num(f[F.deals.ref30]),
        sqft: num(f[F.deals.sqft]), cashout: num(f[F.deals.cashout]), close_date: f[F.deals.cierre] || null,
        investor_rec_ids: linkIds(f[F.deals.invLink]),
        capital_inversionista: num(f[F.deals.capInv]) ?? num(f[F.deals.capAportado]),
        capital_aportado: num(f[F.deals.capAportado]),  // fldrePoqg3C3caiZ5 PURO — la cifra del ranking de inversionistas
        rentabilidad_prometida: num(f[F.deals.rentProm]), utilidad_entregada: num(f[F.deals.utilEntregada]),
        deficit_total: num(f[F.deals.deficitTotal]), renta_mensual: num(f[F.deals.rentaMes]),
        gastos_mensuales: num(f[F.deals.gastosMes]), ownership_pct: num(f[F.deals.ownership]),
        investor_pct: num(f[F.deals.investorPct]),   // B5: "Porcentaje del Inversionista" (correcto) ≠ ownership ("Owner Ship")
        acquisition: sel(f[F.deals.adq]), active: true, archived_at: null, last_synced_at: now(),
      };
    }).filter((r) => r.address);
    await upsert(sb, "ff_deals", dealRows);
    // B5: espeja el % del inversionista (Matriz) a inv_holdings.reparto_pct — Airtable = fuente de verdad
    try { await sb.rpc("inv_reparto_from_deals"); } catch (_e) { /* no romper el sync si la RPC falla */ }

    // 2) DRAWS (Desglose Draws) — address resuelta por el link a Propiedades
    const drawsRecs = await fetchAll(T.draws);
    const drawRows = drawsRecs.map((r) => {
      const f = r.fields || {};
      const linked = Array.isArray(f[F.draws.dir]) ? f[F.draws.dir][0] : null;
      const linkId = typeof linked === "string" ? linked : linked?.id;
      const addr = (linkId && addrById[linkId]) || null;
      const intHml = num(f[F.draws.intHml]) || 0, intRent = num(f[F.draws.intRent]) || 0;
      const utils = (num(f[F.draws.utilHml]) || 0) + (num(f[F.draws.utilRent]) || 0);
      const otros = (num(f[F.draws.otros]) || 0) + (num(f[F.draws.appraisal]) || 0);
      const total = num(f[F.draws.total]) || 0;
      const muebles = num(f[F.draws.muebles]) || 0;
      return {
        airtable_id: r.id, address: addr, address_norm: norm(addr),
        total_draws: total,
        remodel_internal: total - intHml - intRent - utils - muebles - otros, // draws netos a obra
        remodel_complete: lookup1(f[F.draws.remodelRealLk]),                  // Costo Remodelación Real (= base Remodelación)
        hml_months: num(f[F.draws.meses]), interest_hml: intHml, services_hml: utils,
        interest_until_rent: intRent, furniture: muebles, other_costs: otros,
        net_total: num(f[F.draws.rent]), cashout_refi: sel(f[F.draws.refi]),
        draws_menos_deficit: num(f[F.draws.drawsMenosDef]),    // fórmula Airtable [Total Draws − Déficit Total]
        active: true, archived_at: null, last_synced_at: now(),
      };
    }).filter((r) => r.address);
    await upsert(sb, "ff_draws", drawRows);

    // 3) INVESTORS
    const invRecs = await fetchAll(T.investors);
    const invRows = invRecs.map((r) => {
      const f = r.fields || {};
      return {
        airtable_id: r.id, name: f[F.inv.nombre] || null, label: sel(f[F.inv.etiqueta]),
        email: f[F.inv.email] || null, phone: f[F.inv.tel] || null, city: f[F.inv.ciudad] || null,
        state: f[F.inv.estado] || null, ranges: sel(f[F.inv.rangos]), stage: sel(f[F.inv.w9]),
        has_partner: sel(f[F.inv.socio]), partner_name: f[F.inv.socioNombre] || null,
        capital_aportado: lookupSum(f[F.inv.capLookup]), capital_pagado: num(f[F.inv.capPagado]),
        deal_rec_ids: linkIds(f[F.inv.propLink]),
        active: true, archived_at: null, last_synced_at: now(),
      };
    }).filter((r) => r.name);
    await upsert(sb, "ff_investors", invRows);

    // 4) OVERHEAD FF (equipo + plataformas)
    const eqRecs = await fetchAll(T.equipo);
    const plRecs = await fetchAll(T.plataformas);
    const ohRows = [
      ...eqRecs.map((r) => { const f = r.fields || {}; return { airtable_id: r.id, source: "equipo", concepto: sel(f[F.eq.nombre]) || f[F.eq.name] || null, monto: num(f[F.eq.salario]), mes: sel(f[F.eq.mes]), active: true, archived_at: null, last_synced_at: now() }; }),
      ...plRecs.map((r) => { const f = r.fields || {}; return { airtable_id: r.id, source: "plataformas", concepto: f[F.pl.plataforma] || null, monto: num(f[F.pl.valor]), mes: sel(f[F.pl.mes]), active: true, archived_at: null, last_synced_at: now() }; }),
    ];
    await upsert(sb, "ff_overhead", ohRows);

    // 5) PAGOS HML reales
    const hmlRecs = await fetchAll(T.hml);
    const hmlRows = hmlRecs.map((r) => {
      const f = r.fields || {};
      const linked = Array.isArray(f[F.hml.prop]) ? f[F.hml.prop][0] : null;
      const linkId = typeof linked === "string" ? linked : linked?.id;
      const addr = (linkId && addrById[linkId]) || null;
      return {
        airtable_id: r.id, address: addr, address_norm: norm(addr),
        fecha: f[F.hml.fecha] || null, pago_hml: num(f[F.hml.pago]), fee: num(f[F.hml.fee]),
        ref30: num(f[F.hml.ref30]), fecha_ref30: f[F.hml.fechaRef] || null, pagado: !!f[F.hml.check],
        active: true, archived_at: null, last_synced_at: now(),
      };
    });
    await upsert(sb, "ff_hml_payments", hmlRows);

    // 5b) DATOS POR CASA (préstamo HML) → ff_hml_loans
    const dcRecs = await fetchAll(T.datosCasa);
    const dcRows = dcRecs.map((r) => {
      const f = r.fields || {};
      const linked = Array.isArray(f[F.dc.prop]) ? f[F.dc.prop][0] : null;
      const linkId = typeof linked === "string" ? linked : linked?.id;
      const addr = (linkId && addrById[linkId]) || null;
      return {
        airtable_id: r.id, address: addr, address_norm: norm(addr),
        monto_hml: num(f[F.dc.monto]), tasa_pct: num(f[F.dc.tasa]), plazo_meses: f[F.dc.plazo] != null ? String(f[F.dc.plazo]) : null,
        fecha_inicio: f[F.dc.ini] || null, fecha_vencimiento: f[F.dc.venc] || null,
        gastos_cierre: num(f[F.dc.cierre]), down_payment: num(f[F.dc.down]), cash_to_close: num(f[F.dc.ctc]),
        draws_aprobados: num(f[F.dc.drAprob]), draws_cobrados: num(f[F.dc.drCobr]),
        fecha_inicio_rehab: f[F.dc.rehabIni] || null, fecha_fin_rehab: f[F.dc.rehabFin] || null,
        monto_prestamo_refi: num(f[F.dc.refiMonto]), monto_pagado_hml_refi: num(f[F.dc.refiPagado]),
        fecha_refi: f[F.dc.refiFecha] || null,
        pct_banco_refi: num(Array.isArray(f[F.dc.refiPct]) ? f[F.dc.refiPct][0] : f[F.dc.refiPct]), // lookup percent → decimal (0.75)
        precio_venta: num(f[F.dc.ventaPrecio]), utilidad_bruta_venta: num(f[F.dc.ventaUtilBruta]),
        utilidad_neta_venta: num(f[F.dc.ventaUtilNeta]), roi_venta: num(f[F.dc.ventaRoi]),
        fecha_venta: f[F.dc.ventaFecha] || null,
        active: true, archived_at: null, last_synced_at: now(),
      };
    }).filter((r) => r.address);
    await upsert(sb, "ff_hml_loans", dcRows);

    // 5c) property_id backbone FF (self-healing)
    try { await sb.rpc("ff_backfill_property_ids"); } catch (e) { console.warn("ff pid skip:", String(e)); }

    // 6) Soft-delete: archivar lo no visto en este run
    for (const t of ["ff_deals", "ff_draws", "ff_investors", "ff_overhead", "ff_hml_payments", "ff_hml_loans"]) {
      await archiveUnseen(sb, t, runStartIso);
    }

    // 7) Assert de paridad (por tabla espejo)
    const p1 = await parity(sb, "ff_deals", dealRows.length, "ff_deals");
    const p2 = await parity(sb, "ff_draws", drawRows.length, "ff_draws");
    const p3 = await parity(sb, "ff_investors", invRows.length, "ff_investors");
    const p4 = await parity(sb, "ff_hml_loans", dcRows.length, "ff_hml_loans");

    return new Response(JSON.stringify({
      ok: true, deals: p1, draws: p2, investors: p3, hml_loans: p4,
      overhead: ohRows.length, hml_payments: hmlRows.length, duration_ms: Date.now() - startMs,
    }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String((e as any)?.message || e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
