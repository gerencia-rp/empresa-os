// ════════════════════════════════════════════════════════════════
// 🚦 GATE DE CI (auditoría 2026-07-13, Definición de Terminado punto 8)
// Un tile no mergea si: (a) no lee de la capa de KPIs, (b) no resuelve por property_id,
// (c) muestra $0 sobre vacío, (d) cifra contable no reconcilia con QBO.
// Uso: SB_KEY=sb_secret_… node scripts/ci-gate.mjs   → exit 1 si algún check falla.
// ════════════════════════════════════════════════════════════════
import { readFileSync } from 'node:fs';

const REST = 'https://nezbaljfhhyznhltpjnk.supabase.co/rest/v1/';
const KEY = process.env.SB_KEY;
if (!KEY) { console.error('Falta SB_KEY'); process.exit(1); }
const q = async (path) => {
  const r = await fetch(REST + path, { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } });
  if (!r.ok) throw new Error(path + ' → ' + r.status);
  return r.json();
};
const ok = [], bad = [];
const chk = (n, c, e) => (c ? ok : bad).push(n + (e ? ' — ' + e : ''));

// (a) CAPA DE KPIs: las vistas O1 existen y devuelven datos coherentes
const [cap] = await q('v_capital_deployed?select=*');
chk('(a) v_capital_deployed responde', !!cap && +cap.equity_comprometido_airtable > 0);
const [ocup] = await q('v_ocupacion?select=*');
chk('(a) v_ocupacion coherente', !!ocup && +ocup.unidades_rentables === (+ocup.ocupadas + +ocup.disponibles + +ocup.mantenimiento + +ocup.reservadas), JSON.stringify(ocup));
const [okpi] = await q('v_obras_kpi?select=*');
chk('(a) v_obras_kpi coherente', !!okpi && +okpi.obras_total === (+okpi.obras_en_curso + +okpi.obras_finalizadas));
chk('(a) margen ponderado sano (0–100%)', okpi && +okpi.margen_pct > 0 && +okpi.margen_pct < 100, okpi && okpi.margen_pct + '%');

// (b) PROPERTY_ID: cobertura 100% en los 3 espejos + aliases QBO
const cov = await q('v_property_360?select=property_id&property_id=is.null');
chk('(b) v_property_360 sin property_id nulos', cov.length === 0, cov.length + ' nulos');
const aliases = await q('property_alias?select=tipo&tipo=eq.qbo_account&active=is.true');
chk('(b) cuentas QBO mapeadas por property_id (≥19)', aliases.length >= 19, aliases.length + ' aliases');

// (c) NO $0 SOBRE VACÍO: los guard-rails existen y se comportan
const kitSrc = readFileSync(new URL('../ui/kit.js', import.meta.url), 'utf8');
const decSrc = readFileSync(new URL('../ui/kit-decision.js', import.meta.url), 'utf8');
chk('(c) kitMoney(null) = "—" (código)', /if \(n == null \|\| isNaN\(n\)\) return opts\.vacio \|\| '—'/.test(kitSrc));
chk('(c) noZeroAsReal existe', /function noZeroAsReal/.test(decSrc));
chk('(c) reconcileLE existe (guard Σ ≤ total)', /function reconcileLE/.test(decSrc));

// (d) RECONCILIA CON QBO: espejo fresco (as_of ≤ 30 días) y guard de balance
const qb = await q('qb_report_cache?select=fetched_at&report=eq.balance&label=eq.Investor%20Contributions&limit=1');
const asOf = qb[0] && new Date(qb[0].fetched_at);
chk('(d) espejo QBO fresco (≤30 días)', asOf && (Date.now() - asOf.getTime()) / 86400000 <= 30, asOf && asOf.toISOString().slice(0, 10));
const assets = await q('qb_report_cache?select=value&report=eq.balance&label=eq.TOTAL%20ASSETS&active=is.true');
const totalAssets = assets.reduce((s, x) => s + (+x.value || 0), 0);
chk('(d) Total Assets del holding disponible', totalAssets > 0, '$' + Math.round(totalAssets).toLocaleString());
chk('(d) equity contable ≤ assets (sanidad)', cap && +cap.equity_qbo <= totalAssets);

console.log('\n🚦 GATE DE CI — ' + ok.length + ' OK · ' + bad.length + ' FALLAS');
ok.forEach(x => console.log('  ✓ ' + x));
if (bad.length) { bad.forEach(x => console.log('  ✗ ' + x)); process.exit(1); }
