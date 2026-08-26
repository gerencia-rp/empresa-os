// ═══ ARV BACK-TEST + CALIBRACIÓN contra tasaciones REALES (directiva ARV certero 13-jul) ═══
// Corre el ArvEngine REAL (pm/ff-arv-engine.js) por cada casa finalizada con "Valuación por el
// Appraisal" (Airtable → ff_deals.appraisal), comps de RentCast (cache 30d, cuota vigilada),
// mide MdAPE + sesgo, calibra los parámetros y persiste en ff_uw_config + arv_calibracion.
// Por seguridad, la corrida es de solo lectura por defecto.
// Para persistir una calibración mejor y dentro de meta se requiere --persist explícito.
//   SB_KEY=sb_secret_… node scripts/arv-backtest.mjs [--persist]
// Meta (directiva): MdAPE ≤ 6% · sesgo ±2%. Exit 1 si no la alcanza.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const Arv = require('../pm/ff-arv-engine.js');

const BASE = 'https://nezbaljfhhyznhltpjnk.supabase.co';
let KEY = process.env.SB_KEY;
if (!KEY) { try { KEY = JSON.parse(readFileSync(process.env.HOME + '/.cache/sbkeys.json', 'utf8')).secret; } catch {} }
if (!KEY) { console.error('Falta SB_KEY'); process.exit(1); }
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' };
const PERSIST = process.argv.includes('--persist');

const q = async (path) => { const r = await fetch(BASE + '/rest/v1/' + path, { headers: H }); if (!r.ok) throw new Error(path + ' → ' + r.status); return r.json(); };
const rentcast = async (address, endpoint) => {
  const r = await fetch(BASE + '/functions/v1/rentcast', { method: 'POST', headers: H, body: JSON.stringify({ address, endpoint }) });
  return r.json();
};

// ─── subject/comps desde los payloads (misma forma que la UI: apSubject/apComps) ───
const zipDe = a => { const m = String(a || '').match(/\b(7\d{4})\b/); return m ? m[1] : null; };
function subjectDe(prop, deal) {
  const p = prop || {}, feat = p.features || {};
  const conflictos = [];
  let sqft = p.squareFootage != null ? +p.squareFootage : null;
  if (sqft && deal.sqft && Math.abs(sqft - deal.sqft) / Math.max(sqft, deal.sqft) > 0.05)
    conflictos.push('sqft ' + sqft + ' (RentCast) vs ' + deal.sqft + ' (Airtable)');
  if (!sqft) sqft = +deal.sqft || null;
  return {
    s: { sqft, beds: p.bedrooms != null ? +p.bedrooms : null, baths: p.bathrooms != null ? +p.bathrooms : null,
      year: p.yearBuilt != null ? +p.yearBuilt : null, lot: p.lotSize != null ? +p.lotSize : null,
      pool: feat.pool != null ? !!feat.pool : null, garage: (feat.garage || feat.garageSpaces) ? true : null,
      zip: zipDe(deal.address) || p.zipCode || null, tipo: p.propertyType || null },
    conflictos,
    assessed: (() => { const tax = p.taxAssessments || {}; const ys = Object.keys(tax).sort(); return ys.length ? tax[ys[ys.length - 1]].value : null; })(),
  };
}
function compsDe(valuePayload) {
  return ((valuePayload || {}).comparables || []).map((c, i) => ({
    id: c.id || 'c' + i, dir: c.formattedAddress || c.address || ('comp ' + (i + 1)),
    price: +c.price || null, sqft: +c.squareFootage || null, beds: c.bedrooms != null ? +c.bedrooms : null,
    baths: c.bathrooms != null ? +c.bathrooms : null, year: c.yearBuilt != null ? +c.yearBuilt : null,
    lot: c.lotSize != null ? +c.lotSize : null, dist: c.distance != null ? +c.distance : null,
    fecha: c.removedDate || c.lastSeenDate || c.listedDate || null, tipo: c.propertyType || null,
    status: c.status || null, saleType: c.saleType || c.transactionType || null,
    closeDate: c.closeDate || c.saleDate || null,
    pool: null, garage: null,
  })).filter(c => c.price > 0);
}

// ─── data ───
const deals = await q('ff_deals?select=address,address_norm,sqft,arv,appraisal,stage&active=is.true&appraisal=gt.0&order=address');
const cfgRows = await q('ff_uw_config?select=key,value,text_value');
const cfg = {}; cfgRows.forEach(r => { cfg[r.key] = r.value != null ? +r.value : r.text_value; });
const exclTxt = String((cfgRows.find(r => r.key === 'arv_calib_excluir') || {}).text_value || '').toLowerCase();
const exclList = exclTxt.split(',').map(x => x.trim().replace(/[^a-z0-9]/g, '')).filter(Boolean);

const casas = [];
let llamadasAntes = (await q('rentcast_usage?select=llamadas&id=eq.1'))[0].llamadas;
console.log('RentCast llamadas usadas al inicio:', llamadasAntes, '/ 50\n');
for (const d of deals) {
  const norm = d.address_norm || '';
  if (exclList.some(e => e && norm.includes(e))) { console.log('  ⏭ excluida (CEO):', d.address.split(',')[0]); continue; }
  const [prop, val] = [await rentcast(d.address, 'property'), await rentcast(d.address, 'value')];
  if (!prop.ok || !val.ok || !val.payload) { console.log('  ⚠ sin datos RentCast:', d.address.split(',')[0], (prop.error || val.error || '')); continue; }
  const { s, conflictos, assessed } = subjectDe(prop.payload, d);
  const sane = Arv.saneaSubject(s);
  if (sane.dudosos.length) console.log('  🟡 subject dudoso', d.address.split(',')[0] + ':', sane.dudosos.map(x => x.motivo).join(' · '));
  const comps = compsDe(val.payload);
  casas.push({ casa: d.address.split(',')[0].trim(), subject: sane.s, comps, real: +d.appraisal, avm: +val.value || null, assessed, conflictos, dudosos: sane.dudosos, cached: prop.cached && val.cached });
}
const llamadasDespues = (await q('rentcast_usage?select=llamadas&id=eq.1'))[0].llamadas;
console.log('\ncasas con data:', casas.length, '· llamadas nuevas:', llamadasDespues - llamadasAntes, '→ total', llamadasDespues, '/ 50\n');

// ─── ANTES (params actuales) ───
const antes = Arv.backtest(casas, cfg);
const fmt = x => x == null ? '—' : (x >= 0 ? '+' : '') + x.toFixed(1) + '%';
console.log('═══ ANTES (params actuales) ═══');
antes.porCasa.forEach(x => console.log('  ' + x.casa.padEnd(30) + ' pred ' + String(x.pred || '—').padStart(8) + ' vs real ' + String(x.real).padStart(8) + '  err ' + fmt(x.errPct) + '  (' + x.n + ' comps, ' + (x.nivel || '—') + ')'));
console.log('  → MdAPE ' + fmt(antes.mdape) + ' · sesgo ' + fmt(antes.sesgo) + ' · n=' + antes.n + '\n');

// ─── CALIBRAR ───
const cal = Arv.calibrar(casas, cfg, { pasadas: 4 });
const d2 = cal.despues;
console.log('═══ DESPUÉS (calibrado, ' + cal.probados + ' combos probados) ═══');
d2.porCasa.forEach(x => console.log('  ' + x.casa.padEnd(30) + ' pred ' + String(x.pred || '—').padStart(8) + ' vs real ' + String(x.real).padStart(8) + '  err ' + fmt(x.errPct)));
console.log('  → MdAPE ' + fmt(d2.mdape) + ' · sesgo ' + fmt(d2.sesgo) + ' (mediano ' + fmt(d2.sesgoMediano) + ') · n=' + d2.n);
const KEYS = ['arv_adj_gla_psf', 'arv_adj_cuarto', 'arv_adj_bano', 'arv_adj_ano_pct', 'arv_mercado_pct_mes', 'arv_adj_lote_psf', 'arv_outlier_mad_k', 'arv_bias_pct'].concat(Object.keys(cal.params).filter(k => /^arv_bias_pct_/.test(k)));
if (cal.zipsCal && cal.zipsCal.length) console.log('  submercados calibrados: ' + cal.zipsCal.map(z => z.zip + ' ' + (z.bias > 0 ? '+' : '') + z.bias + '% (n=' + z.n + ')').join(' · '));
console.log('  params: ' + KEYS.map(k => k.replace('arv_', '') + '=' + cal.params[k]).join(' · ') + '\n');

// ─── assessed × factor (señal independiente p/ triangulación) ───
const factores = casas.filter(x => x.assessed > 0).map(x => x.real / x.assessed);
const facMed = factores.length >= 3 ? Math.round(Arv._mediana(factores) * 1000) / 1000 : null;
console.log('assessed × factor: mediana', facMed, '(n=' + factores.length + ')');

// ─── meta ───
const META_MDAPE = 6, META_SESGO = 2;
const pasa = d2.mdape != null && d2.mdape <= META_MDAPE && Math.abs(d2.sesgo) <= META_SESGO;
console.log('\n🎯 META: MdAPE ≤' + META_MDAPE + '% y sesgo ±' + META_SESGO + '% → ' + (pasa ? '✅ ALCANZADA' : '❌ NO alcanzada'));

// ─── persistir ───
const mejora = antes.mdape != null && d2.mdape != null && d2.mdape < antes.mdape;
if (PERSIST && pasa && mejora) {
  for (const k of KEYS) {
    await fetch(BASE + '/rest/v1/ff_uw_config?on_conflict=key', { method: 'POST', headers: { ...H, Prefer: 'resolution=merge-duplicates' }, body: JSON.stringify({ key: k, value: cal.params[k], updated_at: new Date().toISOString() }) });
  }
  if (facMed) await fetch(BASE + '/rest/v1/ff_uw_config?on_conflict=key', { method: 'POST', headers: { ...H, Prefer: 'resolution=merge-duplicates' }, body: JSON.stringify({ key: 'arv_assessed_factor', value: facMed, updated_at: new Date().toISOString() }) });
  const params = {}; KEYS.forEach(k => params[k] = cal.params[k]); if (facMed) params.arv_assessed_factor = facMed;
  const ins = await fetch(BASE + '/rest/v1/arv_calibracion', { method: 'POST', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify({
    n_casas: d2.n, mdape: d2.mdape && Math.round(d2.mdape * 100) / 100, mape: d2.mape && Math.round(d2.mape * 100) / 100,
    sesgo: d2.sesgo && Math.round(d2.sesgo * 100) / 100, params,
    detalle: d2.porCasa.map(x => ({ casa: x.casa, pred: x.pred, real: x.real, err_pct: x.errPct && Math.round(x.errPct * 100) / 100, n_comps: x.n, confianza: x.nivel })),
    fuente: 'backtest',
  }) });
  console.log('persistido:', ins.status === 201 ? '✓ ff_uw_config + arv_calibracion' : '⚠ ' + ins.status + ' ' + await ins.text());
} else if (PERSIST) {
  console.error('NO persistido: la calibración debe alcanzar la meta y mejorar el MdAPE actual.');
} else {
  console.log('modo solo lectura: usa --persist únicamente para una calibración que alcance la meta y mejore el MdAPE.');
}
process.exit(pasa ? 0 : 1);
