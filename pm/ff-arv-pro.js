// ════════════════════════════════════════════════════════════════
// 🏷️ ARV PROFESIONAL (Calc 2 de la Suite UW) — tasador estilo formulario 1004, UX PropStream.
// Subject + comps de RentCast (proxy backend, key jamás en el front) → filtros del tasador →
// motor de ajustes por comp (GLA/cuarto/baño/año/lote/fecha + manuales) → reconciliación
// ponderada por MENOR gross adj % → ARV + rango + confianza → desviación vs appraisal real
// (aprendizaje: sesgo sugerido, lo aplica un humano). NUNCA $/sqft promedio × sqft.
// Cero hardcode: factores/filtros en ff_uw_config (editables acá mismo). Fuente de verdad
// guardada sigue siendo el ARV de Airtable; esto produce el "ARV estimado profesional".
// Estado por análisis en UW.a.inputs.arvpro (persiste con ff_underwriting_analyses).
// UI: mockup PropStream del CEO (12-jul) — ficha subject completa (APN/dueño/assessed/última
// venta), mapa Leaflet con pins de precio, criterio visible, resumen bajo/prom/alto,
// comps como TARJETAS + toggle GRILLA 1004 lado a lado. Fotos: RentCast no las da → placeholder.
// ════════════════════════════════════════════════════════════════

const AP_E = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const AP_M = n => (n == null || isNaN(n)) ? '—' : (n < 0 ? '-$' : '$') + Math.abs(Math.round(n)).toLocaleString('en-US');
const AP_K = n => (n == null || isNaN(n)) ? '—' : '$' + (Math.abs(n) >= 1000 ? Math.round(n / 1000) + 'k' : Math.round(n));
const AP_N = v => { const x = parseFloat(v); return isNaN(x) ? null : x; };
const AP_D = f => { if (!f) return '—'; const s = String(f).slice(0, 10); return s.slice(5, 7) + '/' + s.slice(0, 4); };

function apState() {
  if (!UW.a) return null;
  if (!UW.a.inputs.arvpro) UW.a.inputs.arvpro = { subj: {}, man: {}, excl: {}, filtros: {}, dir: '', vista: 'cards' };
  return UW.a.inputs.arvpro;
}
function apCfg(k, def) { return UWc(k, def); }
function apZip(addr) { const m = String(addr || '').match(/\b(7\d{4})\b/); return m ? m[1] : null; }
function apGlaPsf(zip) { return zip != null && UW.cfg['arv_adj_gla_psf_' + zip] != null ? +UW.cfg['arv_adj_gla_psf_' + zip] : apCfg('arv_adj_gla_psf', 90); }
function apMesesDesde(fecha) { if (!fecha) return null; const t = new Date(fecha).getTime(); return isNaN(t) ? null : (Date.now() - t) / (30.44 * 86400000); }

// ─── SUBJECT: RentCast /properties + overrides manuales (faltantes marcados) ───
function apRcPayload(ep) { const rc = (window.ffUwRcSlot && ffUwRcSlot(ep)) || null; return (rc && rc !== 'loading' && rc.payload) || null; }
function apSubject() {
  const st = apState(); if (!st) return null;
  const rc = (window.ffUwRcSlot && ffUwRcSlot('property')) || null;
  const p = (rc && rc !== 'loading' && rc.payload) || {};
  const feat = p.features || {};
  const dir = st.dir || (UW.a.direccion || UW.a.nombre || '');
  const v = (manual, rcVal) => manual != null && manual !== '' ? +manual : (rcVal != null ? +rcVal : null);
  return {
    dir, zip: apZip(dir) || p.zipCode || null,
    sqft: v(st.subj.sqft, p.squareFootage != null ? p.squareFootage : UW.a.inputs.est_sqft),
    beds: v(st.subj.beds, p.bedrooms), baths: v(st.subj.baths, p.bathrooms),
    year: v(st.subj.year, p.yearBuilt), lot: v(st.subj.lot, p.lotSize),
    pool: st.subj.pool != null ? !!st.subj.pool : !!feat.pool,
    garage: st.subj.garage != null ? !!st.subj.garage : !!(feat.garage || feat.garageSpaces),
    fireplace: st.subj.fireplace != null ? !!st.subj.fireplace : !!feat.fireplace,
    lat: AP_N(p.latitude), lng: AP_N(p.longitude),
    rcOk: !!(rc && rc !== 'loading' && rc.payload), rcLoading: rc === 'loading',
  };
}
// ficha extendida (APN, condado, dueño, assessed, última venta) — solo lectura, para confirmar LA casa
function apSubjectFicha() {
  const p = apRcPayload('property') || {};
  const feat = p.features || {};
  const tax = p.taxAssessments || {};
  const yrs = Object.keys(tax).sort();
  const assessed = yrs.length ? tax[yrs[yrs.length - 1]] : null;
  let ventaFecha = p.lastSaleDate || null, ventaPrecio = p.lastSalePrice || null;
  const hist = p.history || {};
  Object.values(hist).forEach(h => { if (h && h.event === 'Sale' && (!ventaFecha || h.date > ventaFecha)) { ventaFecha = h.date; if (h.price) ventaPrecio = h.price; } });
  return {
    dirRc: p.formattedAddress || null, apn: p.assessorID || null, condado: p.county || null,
    subdivision: p.subdivision || null, tipo: p.propertyType || null,
    dueno: p.owner && p.owner.names ? p.owner.names.join(', ') : null,
    ownerOcc: p.ownerOccupied, loteAcres: p.lotSize ? p.lotSize / 43560 : null,
    parking: feat.garageSpaces != null ? feat.garageSpaces + ' garaje' : feat.garage ? 'garaje' : null,
    hvac: [feat.coolingType ? 'AC ' + feat.coolingType : (feat.cooling ? 'AC' : null), feat.heatingType ? 'Heat ' + feat.heatingType : (feat.heating ? 'Heat' : null)].filter(Boolean).join(' · ') || null,
    pisos: feat.floorCount || null, techo: feat.roofType || null,
    assessed: assessed ? { anio: assessed.year, total: assessed.value, land: assessed.land, imp: assessed.improvements } : null,
    ventaFecha, ventaPrecio,
  };
}

// ─── COMPS: del payload de /avm/value (compCount=20) ───
function apComps() {
  const rc = (window.ffUwRcSlot && ffUwRcSlot('value')) || null;
  if (!rc || rc === 'loading' || !rc.payload) return [];
  return (rc.payload.comparables || []).map((c, i) => ({
    id: c.id || 'c' + i, dir: c.formattedAddress || c.address || ('comp ' + (i + 1)),
    price: AP_N(c.price), sqft: AP_N(c.squareFootage), beds: AP_N(c.bedrooms), baths: AP_N(c.bathrooms),
    year: AP_N(c.yearBuilt), lot: AP_N(c.lotSize), dist: AP_N(c.distance),
    fecha: c.removedDate || c.lastSeenDate || c.listedDate || null, dom: AP_N(c.daysOnMarket),
    corr: AP_N(c.correlation), lat: AP_N(c.latitude), lng: AP_N(c.longitude),
    status: c.status || null, listingType: c.listingType || null,
  })).filter(c => c.price > 0);
}

// ─── FILTROS del tasador (defaults de config, el CEO los mueve) ───
function apFiltros() {
  const st = apState(); const f = st.filtros || {};
  return {
    dist: f.dist != null ? +f.dist : apCfg('arv_filtro_dist_mi', 0.8),
    meses: f.meses != null ? +f.meses : apCfg('arv_filtro_meses', 12),
    sqftPct: f.sqftPct != null ? +f.sqftPct : apCfg('arv_filtro_sqft_pct', 25),
    camas: f.camas != null ? +f.camas : apCfg('arv_filtro_camas', 1),
    banos: f.banos != null ? +f.banos : apCfg('arv_filtro_banos', 1.5),
    ano: f.ano != null ? +f.ano : apCfg('arv_filtro_ano', 20),
  };
}
function apPasaFiltro(s, c, f) {
  const razones = [];
  if (c.dist != null && c.dist > f.dist) razones.push('a ' + c.dist.toFixed(2) + ' mi (>' + f.dist + ')');
  const m = apMesesDesde(c.fecha);
  if (m != null && m > f.meses) razones.push('venta hace ' + Math.round(m) + 'm (>' + f.meses + ')');
  if (s.sqft && c.sqft && Math.abs(c.sqft - s.sqft) / s.sqft * 100 > f.sqftPct) razones.push('sqft ±' + Math.round(Math.abs(c.sqft - s.sqft) / s.sqft * 100) + '% (>' + f.sqftPct + '%)');
  if (s.beds != null && c.beds != null && Math.abs(c.beds - s.beds) > f.camas) razones.push('camas Δ' + Math.abs(c.beds - s.beds));
  if (s.baths != null && c.baths != null && Math.abs(c.baths - s.baths) > f.banos) razones.push('baños Δ' + Math.abs(c.baths - s.baths));
  if (s.year && c.year && Math.abs(c.year - s.year) > f.ano) razones.push('año Δ' + Math.abs(c.year - s.year));
  return { pasa: razones.length === 0, razones };
}

// ─── MOTOR DE AJUSTES estilo 1004 (ajusto el COMP hacia el subject; + = el subject vale más) ───
// (cat = etiqueta de presentación para la grilla; la matemática no cambia)
function apAjustes(s, c) {
  const st = apState(); const man = st.man[c.id] || {};
  const rows = [];
  const add = (cat, concepto, monto, fuente) => { if (monto) rows.push({ cat, concepto, monto: Math.round(monto), fuente }); };
  if (s.sqft && c.sqft) add('gla', 'GLA ' + (s.sqft - c.sqft > 0 ? '+' : '') + Math.round(s.sqft - c.sqft) + ' sqft × $' + apGlaPsf(s.zip), (s.sqft - c.sqft) * apGlaPsf(s.zip), 'auto');
  if (s.beds != null && c.beds != null && s.beds !== c.beds) add('cuartos', 'Cuartos Δ' + (s.beds - c.beds), (s.beds - c.beds) * apCfg('arv_adj_cuarto', 15000), 'auto');
  if (s.baths != null && c.baths != null && s.baths !== c.baths) add('banos', 'Baños Δ' + (s.baths - c.baths), (s.baths - c.baths) * apCfg('arv_adj_bano', 15000), 'auto');
  if (s.year && c.year && s.year !== c.year) add('ano', 'Año Δ' + (s.year - c.year), (s.year - c.year) * (apCfg('arv_adj_ano_pct', 0.5) / 100) * c.price, 'auto');
  if (s.lot && c.lot && Math.abs(s.lot - c.lot) > 500) add('lote', 'Lote Δ' + Math.round(s.lot - c.lot) + ' sqft', (s.lot - c.lot) * apCfg('arv_adj_lote_psf', 2), 'auto');
  const m = apMesesDesde(c.fecha);
  const tend = apCfg('arv_mercado_pct_mes', 0);
  if (m != null && tend) add('tend', 'Tendencia mercado ' + Math.round(m) + 'm × ' + tend + '%/m', m * (tend / 100) * c.price, 'auto');
  add('man', 'Condición/reno (manual)', AP_N(man.cond) || 0, 'manual');
  add('man', 'Ubicación/submercado (manual)', AP_N(man.ubic) || 0, 'manual');
  add('man', 'Concesiones vendedor (manual)', -(AP_N(man.conces) || 0), 'manual');
  add('man', 'Piscina/garaje/fireplace/otros (manual)', AP_N(man.otros) || 0, 'manual');
  const neto = rows.reduce((x, r) => x + r.monto, 0);
  const bruto = rows.reduce((x, r) => x + Math.abs(r.monto), 0);
  return { rows, neto, bruto, valorAjustado: Math.round(c.price + neto), netPct: c.price ? neto / c.price * 100 : 0, grossPct: c.price ? bruto / c.price * 100 : 0 };
}

// ─── RECONCILIACIÓN: pondera por MENOR gross adj % (el más parecido pesa más) ───
function apReconciliar(s, comps) {
  const st = apState(); const f = apFiltros();
  const maxN = apCfg('arv_comps_max', 8), minN = apCfg('arv_comps_min', 3);
  const grossWarn = apCfg('arv_gross_adj_warn_pct', 25);
  const usables = comps.map(c => ({ c, filtro: apPasaFiltro(s, c, f), adj: apAjustes(s, c) }))
    .filter(x => x.filtro.pasa && !st.excl[x.c.id])
    .sort((a, b) => a.adj.grossPct - b.adj.grossPct)
    .slice(0, maxN);
  if (!usables.length) return { usables, arv: null, confianza: { nivel: 'sin comps', razones: ['ningún comp pasa filtros'] } };
  let sw = 0, sv = 0;
  usables.forEach(x => { const w = 1 / (x.adj.grossPct + 2); sw += w; sv += w * x.adj.valorAjustado; x.peso = w; });
  usables.forEach(x => x.pesoPct = Math.round(100 * x.peso / sw));
  const bias = apCfg('arv_bias_pct', 0);
  const arv = Math.round((sv / sw) * (1 + bias / 100));
  const rangoPct = apCfg('arv_rango_pct', 6);
  const vals = usables.map(x => x.adj.valorAjustado);
  const dispersion = arv ? (Math.max(...vals) - Math.min(...vals)) / arv * 100 : 0;
  const grossProm = usables.reduce((x, u) => x + u.adj.grossPct, 0) / usables.length;
  const razones = [usables.length + ' comps reconciliados', 'gross adj prom ' + grossProm.toFixed(1) + '%', 'dispersión ' + dispersion.toFixed(1) + '%'];
  if (bias) razones.push('sesgo aplicado ' + bias + '%');
  let nivel = 'baja';
  if (usables.length >= minN && grossProm <= grossWarn && dispersion <= 15) nivel = usables.length >= 4 && grossProm <= 15 && dispersion <= 10 ? 'alta' : 'media';
  if (usables.length < minN) razones.push('⚠ menos de ' + minN + ' comps');
  return { usables, arv, conservador: Math.round(arv * (1 - rangoPct / 100)), optimista: Math.round(arv * (1 + rangoPct / 100)), confianza: { nivel, razones }, grossProm, dispersion, bias };
}

// ─── CALIBRACIÓN: desviación ARV vs appraisal real (aprendizaje con humano en el loop) ───
function apCalibracion() {
  const exclTxt = (window.UWct ? UWct('arv_calib_excluir', '') : '').toLowerCase();
  const exclList = exclTxt.split(',').map(x => x.trim().replace(/[^a-z0-9]/g, '')).filter(Boolean);
  const filas = (UW.deals || []).filter(d => +d.arv > 0 && +d.appraisal > 0).map(d => {
    const norm = (d.address_norm || '');
    const excluida = exclList.some(e => e && norm.includes(e));
    return { casa: (d.address || '').split(',')[0], zip: apZip(d.address), arv: +d.arv, appr: +d.appraisal, dev: +d.arv - +d.appraisal, devPct: (+d.arv - +d.appraisal) / +d.appraisal * 100, link: d.appraisal_link, excluida };
  }).sort((a, b) => Math.abs(b.dev) - Math.abs(a.dev));
  const usadas = filas.filter(x => !x.excluida);
  const errorProm = usadas.length ? usadas.reduce((s, x) => s + x.devPct, 0) / usadas.length : null;
  const errorAbs = usadas.length ? usadas.reduce((s, x) => s + Math.abs(x.devPct), 0) / usadas.length : null;
  const porZip = {};
  usadas.forEach(x => { if (x.zip) (porZip[x.zip] = porZip[x.zip] || []).push(x.devPct); });
  const zips = Object.entries(porZip).filter(([z, arr]) => arr.length >= 3).map(([z, arr]) => ({ zip: z, n: arr.length, prom: arr.reduce((s, v) => s + v, 0) / arr.length }));
  return { filas, usadas, errorProm, errorAbs, sugerenciaBias: errorProm != null ? -errorProm : null, zips, meta: apCfg('arv_meta_error_pct', 5) };
}

// ─── acciones ───
async function apBuscar(refresh) {
  const st = apState(); if (!st) return;
  const dir = st.dir || UW.a.direccion || UW.a.nombre;
  if (!dir) { alert('Poné la dirección del subject.'); return; }
  UW.a.direccion = UW.a.direccion || dir;
  await Promise.all([ffUwRentcast('property', !!refresh), ffUwRentcast('value', !!refresh)]);
}
window.apBuscar = apBuscar;
function apSet(path, v) {
  const st = apState(); if (!st) return;
  const [g, k] = path.split('.');
  if (k) { st[g] = st[g] || {}; st[g][k] = v; } else st[path] = v;
  ffUwRender();
}
window.apSet = apSet;
function apManSet(id, k, v) { const st = apState(); st.man[id] = st.man[id] || {}; st.man[id][k] = v; ffUwRender(); }
window.apManSet = apManSet;
function apExclToggle(id) { const st = apState(); st.excl[id] = !st.excl[id]; ffUwRender(); }
window.apExclToggle = apExclToggle;
function apUsarArv(v) { if (!UW.a || !(v > 0)) return; UW.a.inputs.arv = v; UW.a.inputs.arv_airtable = UW.a.inputs.arv_airtable || 0; ffUwRender(); if (window.toast) toast('ARV del análisis ← ' + AP_M(v) + ' (profesional)', 'success'); }
window.apUsarArv = apUsarArv;
async function apCfgSet(key, v) {
  const num = AP_N(v); if (num == null) return;
  const { error } = await sb.from('ff_uw_config').upsert({ key, value: num, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) return alert('Config: ' + error.message);
  UW.cfg[key] = num; ffUwRender();
}
window.apCfgSet = apCfgSet;
async function apAplicarBias(v) {
  if (!confirm('Aplicar corrección de sesgo global de ' + v.toFixed(2) + '% al ARV reconciliado? (editable en ff_uw_config · arv_bias_pct)')) return;
  await apCfgSet('arv_bias_pct', v.toFixed(2));
}
window.apAplicarBias = apAplicarBias;

// ════════════════════════════════════ UI (mockup PropStream 12-jul) ════════════════════════════════════
function apCSS() {
  if (document.getElementById('ap-css')) return;
  const st = document.createElement('style'); st.id = 'ap-css';
  st.textContent = [
    '.ap-grad{background:linear-gradient(135deg,var(--a1,#12b5a0),var(--a2,#2f6ef0))}',
    '.ap-card{background:var(--card,rgba(255,255,255,.04));border:1px solid var(--line,rgba(255,255,255,.12));border-radius:16px;padding:18px}',
    '.ap-lab{color:var(--txt3,#9fb0c9);font-size:11px;text-transform:uppercase;letter-spacing:.8px;font-weight:700}',
    '.ap-searchbar{display:flex;gap:10px;align-items:center;background:var(--card,rgba(255,255,255,.04));border:1px solid var(--line,rgba(255,255,255,.12));border-radius:14px;padding:10px 14px;margin-bottom:16px}',
    '.ap-searchbar input{flex:1;background:transparent;border:none;color:inherit;font-size:15px;outline:none;min-width:180px}',
    '.ap-btn{background:linear-gradient(135deg,var(--a1,#12b5a0),var(--a2,#2f6ef0));color:#04121b;font-weight:700;border:none;border-radius:10px;padding:9px 16px;font-size:13px;cursor:pointer;white-space:nowrap}',
    '.ap-btn.ghost{background:var(--card,rgba(255,255,255,.06));color:inherit;border:1px solid var(--line,rgba(255,255,255,.12));font-weight:600}',
    '.ap-stat{background:var(--glass,rgba(255,255,255,.05));border:1px solid var(--line,rgba(255,255,255,.1));border-radius:10px;padding:7px 12px;min-width:72px}',
    '.ap-stat .n{font-size:16px;font-weight:700}.ap-stat .t{color:var(--txt3,#9fb0c9);font-size:10.5px}',
    '.ap-stat input{width:64px;background:transparent;border:none;border-bottom:1px dashed var(--line,rgba(255,255,255,.25));color:inherit;font-size:16px;font-weight:700;outline:none}',
    '.ap-big{font-size:44px;font-weight:800;background:linear-gradient(135deg,var(--a1,#12b5a0),var(--a2,#2f6ef0));-webkit-background-clip:text;background-clip:text;color:transparent;line-height:1.05;margin:6px 0 2px}',
    '.ap-conf{display:inline-block;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;border:1px solid}',
    '.ap-rline{height:8px;border-radius:6px;background:var(--line,rgba(255,255,255,.12));position:relative;margin:10px 0 6px}',
    '.ap-rline .fill{position:absolute;left:16%;right:16%;top:0;bottom:0;background:linear-gradient(135deg,var(--a1,#12b5a0),var(--a2,#2f6ef0));border-radius:6px;opacity:.45}',
    '.ap-rline .dot{position:absolute;left:50%;top:50%;width:15px;height:15px;border-radius:50%;background:#fff;border:3px solid var(--a2,#2f6ef0);transform:translate(-50%,-50%)}',
    '.ap-rvals{display:flex;justify-content:space-between;color:var(--txt3,#9fb0c9);font-size:11.5px}.ap-rvals b{color:var(--ink,inherit)}',
    '.ap-fchip{background:var(--card,rgba(255,255,255,.04));border:1px solid var(--line,rgba(255,255,255,.12));border-radius:20px;padding:6px 13px;font-size:12px;color:var(--txt3,#9fb0c9);display:inline-flex;align-items:center;gap:5px}',
    '.ap-fchip input{width:44px;background:transparent;border:none;border-bottom:1px dashed var(--line,rgba(255,255,255,.3));color:inherit;font-weight:700;font-size:12px;outline:none;text-align:center}',
    '.ap-kv{display:flex;justify-content:space-between;gap:8px;padding:3.5px 0;font-size:12px;border-bottom:1px dashed var(--line,rgba(255,255,255,.06))}',
    '.ap-kv span{color:var(--txt3,#9fb0c9)}.ap-kv b{text-align:right}',
    '#ap-map{height:400px;border-radius:16px;border:1px solid var(--line,rgba(255,255,255,.12));overflow:hidden;z-index:1}',
    '.ap-pin{background:var(--card,#1b2540);border:1px solid var(--line,#26314e);border-radius:8px;padding:3px 7px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,.35);color:var(--ink,#eaf0ff);cursor:pointer}',
    '.ap-pin.s{background:linear-gradient(135deg,var(--a1,#12b5a0),var(--a2,#2f6ef0));color:#04121b}',
    '.ap-pin.dim{opacity:.45;font-weight:500}',
    '.ap-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(310px,1fr));gap:14px;align-items:start}',
    '.ap-comp{background:var(--card,rgba(255,255,255,.04));border:1px solid var(--line,rgba(255,255,255,.12));border-radius:16px;overflow:hidden;transition:box-shadow .25s,border-color .25s}',
    '.ap-comp.hl{border-color:var(--a1,#12b5a0);box-shadow:0 0 0 2px var(--a1,#12b5a0)}',
    '.ap-comp.off{opacity:.45}',
    '.ap-photo{height:86px;background:linear-gradient(135deg,rgba(18,181,160,.18),rgba(47,110,240,.18));display:flex;align-items:center;justify-content:center;font-size:30px;position:relative}',
    '.ap-status{position:absolute;right:8px;top:8px;font-size:9.5px;font-weight:800;padding:2px 8px;border-radius:20px;background:rgba(0,0,0,.35);color:#fff;text-transform:uppercase;letter-spacing:.5px}',
    '.ap-wt{display:inline-block;font-size:11px;font-weight:800;color:#04121b;background:linear-gradient(135deg,var(--a1,#12b5a0),var(--a2,#2f6ef0));padding:2px 9px;border-radius:20px}',
    '.ap-pill{font-size:11px;padding:2px 9px;border-radius:20px;background:var(--glass,rgba(255,255,255,.06));border:1px solid var(--line,rgba(255,255,255,.12));color:var(--txt3,#9fb0c9)}',
    '.ap-adj{display:flex;justify-content:space-between;font-size:11px;padding:2px 0}',
    '.ap-adj span{color:var(--txt3,#9fb0c9)}',
    '.ap-pos{color:var(--pos,#34d399);font-weight:700}.ap-neg{color:var(--neg,#f87171);font-weight:700}',
    '.ap-grid table{border-collapse:collapse;width:100%;min-width:820px;font-size:12.5px}',
    '.ap-grid th,.ap-grid td{padding:9px 12px;text-align:right;border-bottom:1px solid var(--line,rgba(255,255,255,.08))}',
    '.ap-grid th:first-child,.ap-grid td:first-child{text-align:left;position:sticky;left:0;background:var(--bg2,var(--card,#151d31));color:var(--txt3,#9fb0c9);font-weight:600;font-size:11.5px;z-index:2}',
    '.ap-grid thead th{background:var(--glass,rgba(255,255,255,.05));vertical-align:bottom;font-size:11.5px}',
    '.ap-grid .subjcol{color:var(--a2,#2f6ef0)!important;font-weight:700}',
    '.ap-grid .sec td{background:var(--glass,rgba(255,255,255,.04));color:var(--txt3,#9fb0c9);font-size:10.5px;text-transform:uppercase;letter-spacing:.6px;font-weight:800;text-align:left}',
    '.ap-grid .best td{box-shadow:inset 0 2px 0 var(--a1,#12b5a0)}',
    '.ap-cbx{accent-color:var(--a1,#12b5a0);width:15px;height:15px;cursor:pointer}',
    '.ap-man input{width:64px;background:var(--glass,rgba(255,255,255,.05));border:1px solid var(--line,rgba(255,255,255,.12));border-radius:6px;padding:3px 6px;color:inherit;font-size:10.5px;text-align:right}',
  ].join('\n');
  document.head.appendChild(st);
}

// ─── mapa (Leaflet lazy, OSM tiles) ───
let AP_MAP = null;
function apLeaflet(cb) {
  if (window.L) return cb();
  // jsdelivr: es el único CDN de scripts permitido por el CSP de vercel.json (unpkg está bloqueado)
  if (!document.getElementById('ap-leaflet-css')) {
    const l = document.createElement('link'); l.id = 'ap-leaflet-css'; l.rel = 'stylesheet'; l.href = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(l);
  }
  if (document.getElementById('ap-leaflet-js')) { const t = setInterval(() => { if (window.L) { clearInterval(t); cb(); } }, 120); setTimeout(() => clearInterval(t), 8000); return; }
  const s = document.createElement('script'); s.id = 'ap-leaflet-js'; s.src = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js'; s.onload = cb; document.head.appendChild(s);
}
function apCompCssId(id) { return 'ap-comp-' + String(id).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40); }
function apPinClick(cssId) {
  const el = document.getElementById(cssId); if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.add('hl'); setTimeout(() => el.classList.remove('hl'), 2400);
}
window.apPinClick = apPinClick;
function apMapMount() {
  const el = document.getElementById('ap-map'); if (!el) return;
  const s = apSubject(); if (!s || s.lat == null || s.lng == null) { el.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--txt3,#9fb0c9);font-size:12px">🗺 El mapa aparece al buscar el subject (lat/long de RentCast)</div>'; return; }
  apLeaflet(() => {
    if (!document.getElementById('ap-map')) return;   // cambió la vista mientras cargaba
    if (AP_MAP) { try { AP_MAP.remove(); } catch (e) {} AP_MAP = null; }
    const map = L.map('ap-map', { scrollWheelZoom: false }).setView([s.lat, s.lng], 14);
    AP_MAP = map;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 19 }).addTo(map);
    const stx = apState(); const f = apFiltros();
    const rec = apReconciliar(s, apComps());
    const enRec = new Set(rec.usables ? rec.usables.map(u => u.c.id) : []);
    L.marker([s.lat, s.lng], { icon: L.divIcon({ className: '', html: '<div class="ap-pin s">SUBJECT</div>', iconAnchor: [34, 12] }) }).addTo(map)
      .bindPopup('<b>SUBJECT</b><br>' + AP_E(s.dir));
    const pts = [[s.lat, s.lng]];
    apComps().forEach(c => {
      if (c.lat == null || c.lng == null) return;
      pts.push([c.lat, c.lng]);
      const dim = !enRec.has(c.id);
      const lbl = AP_K(c.price) + (c.dist != null ? ' · ' + c.dist.toFixed(2) + 'mi' : '');
      const mk = L.marker([c.lat, c.lng], { icon: L.divIcon({ className: '', html: '<div class="ap-pin' + (dim ? ' dim' : '') + '">' + lbl + '</div>', iconAnchor: [30, 12] }) }).addTo(map);
      mk.on('click', () => apPinClick(apCompCssId(c.id)));
      mk.bindTooltip(AP_E(c.dir.split(',')[0]));
    });
    if (pts.length > 1) map.fitBounds(pts, { padding: [34, 34] });
  });
}

// ─── piezas de UI ───
function apConfColor(nivel) { return nivel === 'alta' ? 'var(--pos,#34d399)' : nivel === 'media' ? 'var(--amber,#e7b65e)' : 'var(--neg,#f87171)'; }
function apStat(lbl, val, key, opts) {
  opts = opts || {};
  const inner = key
    ? '<input value="' + (val == null || val === '' ? '' : AP_E(val)) + '" placeholder="—" onchange="apSet(\'' + key + '\',this.value)">'
    : '<div class="n">' + (val == null || val === '' ? '—' : AP_E(val)) + '</div>';
  return '<div class="ap-stat">' + inner + '<div class="t">' + lbl + (opts.falta ? ' <span title="RentCast no lo trajo — cargalo" style="color:var(--amber,#e7b65e)">🟡</span>' : '') + '</div></div>';
}
function apRangeBar(rec) {
  return '<div style="margin-top:14px"><div class="ap-rline"><div class="fill"></div><div class="dot"></div></div>'
    + '<div class="ap-rvals"><span>conservador <b>' + AP_M(rec.conservador) + '</b></span><span>probable <b>' + AP_M(rec.arv) + '</b></span><span>optimista <b>' + AP_M(rec.optimista) + '</b></span></div></div>';
}

function apVistaFicha(s) {
  const fi = apSubjectFicha();
  const kv = (k, v) => v ? '<div class="ap-kv"><span>' + k + '</span><b>' + AP_E(v) + '</b></div>' : '';
  const toggles = ['pool:Piscina', 'garage:Garaje', 'fireplace:Fireplace'].map(x => {
    const [k, l] = x.split(':');
    return '<button class="ap-btn ghost" style="padding:4px 10px;font-size:11px" onclick="apSet(\'subj.' + k + '\',' + (s[k] ? 'false' : 'true') + ')">' + (s[k] ? '☑' : '☐') + ' ' + l + '</button>';
  }).join(' ');
  return '<div class="ap-card">'
    + '<div class="ap-lab">Propiedad (subject) · ' + (s.rcLoading ? '⏳ RentCast…' : s.rcOk ? '✓ RentCast' : '<span style="color:var(--amber,#e7b65e)">sin RentCast — datos a mano</span>') + (s.zip ? ' · zip ' + s.zip : '') + '</div>'
    + '<div style="font-size:20px;font-weight:700;margin:6px 0 4px">' + AP_E((fi.dirRc || s.dir || '').split(',')[0] || '—') + '</div>'
    + (fi.dirRc && s.dir && fi.dirRc.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10) !== s.dir.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10) ? '<div style="font-size:11px;color:var(--neg,#f87171);margin-bottom:6px">⚠ RentCast devolvió otra dirección — verificá</div>' : '')
    + '<div style="display:flex;flex-wrap:wrap;gap:8px;margin:8px 0 10px">'
    + apStat('sqft', s.sqft, 'subj.sqft', { falta: s.rcOk && s.sqft == null })
    + apStat('camas', s.beds, 'subj.beds', { falta: s.rcOk && s.beds == null })
    + apStat('baños', s.baths, 'subj.baths', { falta: s.rcOk && s.baths == null })
    + apStat('año', s.year, 'subj.year', { falta: s.rcOk && s.year == null })
    + apStat('lote sqft', s.lot, 'subj.lot', { falta: s.rcOk && s.lot == null })
    + (fi.loteAcres ? apStat('acres', fi.loteAcres.toFixed(2)) : '')
    + '</div>'
    + '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">' + toggles + '</div>'
    + kv('APN', fi.apn) + kv('Condado', fi.condado) + kv('Subdivisión', fi.subdivision) + kv('Tipo', fi.tipo)
    + kv('Dueño', fi.dueno ? fi.dueno + (fi.ownerOcc === false ? ' · absentee' : fi.ownerOcc ? ' · owner-occupied' : '') : null)
    + kv('Parking', fi.parking) + kv('HVAC', fi.hvac) + kv('Pisos / techo', [fi.pisos, fi.techo].filter(Boolean).join(' · ') || null)
    + (fi.assessed ? kv('Valor tasado ' + fi.assessed.anio, AP_M(fi.assessed.total) + ' (land ' + AP_M(fi.assessed.land) + ' + imp ' + AP_M(fi.assessed.imp) + ')') : '')
    + kv('Última venta', fi.ventaFecha ? AP_D(fi.ventaFecha) + (fi.ventaPrecio ? ' · ' + AP_M(fi.ventaPrecio) : '') : null)
    + '<div style="margin-top:10px"><button class="ap-btn ghost" style="font-size:11px" onclick="document.getElementById(\'ap-dir\').focus();document.getElementById(\'ap-dir\').select()">¿No es esta? corregir dirección</button></div>'
    + '</div>';
}

function apVistaHero(rec, inp) {
  if (!rec || !rec.arv) return '<div class="ap-card"><div class="ap-lab">ARV estimado (comps ajustados)</div><div style="color:var(--txt3,#9fb0c9);padding:26px 0;text-align:center">Buscá el subject para reconciliar comps.</div></div>';
  const cc = apConfColor(rec.confianza.nivel);
  const arvAt = +inp.arv_airtable || +inp.arv || 0;
  const appr = +inp.appraisal || 0;
  return '<div class="ap-card">'
    + '<div class="ap-lab">ARV estimado (comps ajustados)</div>'
    + '<div class="ap-big">' + AP_M(rec.arv) + '</div>'
    + '<span class="ap-conf" style="color:' + cc + ';border-color:' + cc + ';background:transparent">● confianza ' + rec.confianza.nivel + ' · ' + rec.usables.length + ' comps · dispersión ' + rec.dispersion.toFixed(0) + '%</span>'
    + apRangeBar(rec)
    + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;font-size:11.5px">'
    + (arvAt ? '<span class="ap-pill">ARV Airtable ' + AP_M(arvAt) + ' · Δ <b class="' + (rec.arv - arvAt >= 0 ? 'ap-pos' : 'ap-neg') + '">' + AP_M(rec.arv - arvAt) + '</b></span>' : '')
    + (appr ? '<span class="ap-pill">Appraisal ' + AP_M(appr) + ' · Δ <b class="' + (Math.abs(rec.arv - appr) / appr <= 0.05 ? 'ap-pos' : 'ap-neg') + '">' + ((rec.arv - appr) / appr * 100).toFixed(1) + '%</b></span>' : '')
    + '</div>'
    + '<button class="ap-btn" style="margin-top:12px" onclick="apUsarArv(' + rec.arv + ')">→ Usar ' + AP_M(rec.arv) + ' como ARV del análisis</button>'
    + '</div>';
}

function apVistaCriterio(f, comps, rec) {
  const chip = (pre, key, val, suf) => '<span class="ap-fchip">' + pre + ' <input value="' + val + '" onchange="apSet(\'filtros.' + key + '\',this.value)">' + (suf || '') + '</span>';
  return '<div style="margin:14px 0 12px"><div class="ap-lab" style="margin-bottom:7px">Criterio de búsqueda · data set: ventas/listings RentCast · status: vendidas y activas · ' + comps.length + ' encontradas → ' + (rec && rec.usables ? rec.usables.length : 0) + ' reconciliadas</div>'
    + '<div style="display:flex;gap:8px;flex-wrap:wrap">'
    + chip('Distancia <', 'dist', f.dist, ' mi') + chip('Vendidas <', 'meses', f.meses, ' meses') + chip('Sqft ±', 'sqftPct', f.sqftPct, '%')
    + chip('Camas ±', 'camas', f.camas, '') + chip('Baños ±', 'banos', f.banos, '') + chip('Año ±', 'ano', f.ano, '')
    + '</div></div>';
}

function apVistaResumen(s, rec) {
  if (!rec || !rec.usables || !rec.usables.length) return '';
  const cs = rec.usables.map(u => u.c);
  const col = (fn) => { const v = cs.map(fn).filter(x => x != null && !isNaN(x)); return v.length ? { lo: Math.min(...v), hi: Math.max(...v), avg: v.reduce((a, b) => a + b, 0) / v.length } : null; };
  const rows = [
    ['Precio venta', s2 => null, c => c.price, AP_M],
    ['SqFt', () => s.sqft, c => c.sqft, v => Math.round(v).toLocaleString()],
    ['$/SqFt', () => null, c => c.sqft ? c.price / c.sqft : null, v => '$' + Math.round(v)],
    ['Camas', () => s.beds, c => c.beds, v => (Math.round(v * 10) / 10)],
    ['Baños', () => s.baths, c => c.baths, v => (Math.round(v * 10) / 10)],
    ['Lote sqft', () => s.lot, c => c.lot, v => Math.round(v).toLocaleString()],
    ['Año', () => s.year, c => c.year, v => Math.round(v)],
    ['Distancia mi', () => null, c => c.dist, v => v.toFixed(2)],
  ];
  const tr = rows.map(([lbl, sf, cf, fmt]) => {
    const st = col(cf); const sv = sf();
    return '<tr><td>' + lbl + '</td><td class="subjcol">' + (sv != null ? fmt(sv) : '—') + '</td>'
      + (st ? '<td>' + fmt(st.lo) + '</td><td>' + fmt(st.avg) + '</td><td>' + fmt(st.hi) + '</td>' : '<td>—</td><td>—</td><td>—</td>') + '</tr>';
  }).join('');
  return '<div class="ap-card ap-grid" style="padding:0;overflow-x:auto;margin-bottom:14px"><table><thead><tr><th>Resumen</th><th class="subjcol">SUBJECT</th><th>BAJO</th><th>PROMEDIO</th><th>ALTO</th></tr></thead><tbody>' + tr + '</tbody></table></div>';
}

function apCardComp(x, esRec) {
  const c = x.c, adj = x.adj, st = apState();
  const man = st.man[c.id] || {};
  const cssId = apCompCssId(c.id);
  const excl = !!st.excl[c.id];
  const mIn = (k, ph) => '<input value="' + (man[k] || '') + '" placeholder="' + ph + '" onchange="apManSet(\'' + c.id + '\',\'' + k + '\',this.value)">';
  const adjRows = adj.rows.map(r => '<div class="ap-adj"><span>' + AP_E(r.concepto) + '</span><b class="' + (r.monto >= 0 ? 'ap-pos' : 'ap-neg') + '">' + (r.monto >= 0 ? '+' : '−') + AP_M(Math.abs(r.monto)).slice(1 - 1) + '</b></div>').join('') || '<div class="ap-adj"><span>sin ajustes — gemelo del subject</span><b>$0</b></div>';
  return '<div class="ap-comp' + (excl || !x.filtro.pasa ? ' off' : '') + '" id="' + cssId + '">'
    + '<div class="ap-photo">🏠' + (c.status ? '<span class="ap-status">' + AP_E(c.status) + '</span>' : '') + '<span style="position:absolute;left:8px;bottom:6px;font-size:10px;color:var(--txt3,#9fb0c9)">foto: no disponible en RentCast</span></div>'
    + '<div style="padding:13px 15px">'
    + '<div style="display:flex;justify-content:space-between;gap:8px;align-items:start"><div style="font-weight:700;font-size:13px">' + AP_E(c.dir.split(',')[0]) + '</div>'
    + '<label style="display:flex;gap:5px;align-items:center;font-size:10px;color:var(--txt3,#9fb0c9);white-space:nowrap"><input type="checkbox" class="ap-cbx" ' + (!excl ? 'checked' : '') + ' onchange="apExclToggle(\'' + c.id + '\')"> incluir</label></div>'
    + '<div style="font-size:10.5px;color:var(--txt3,#9fb0c9);margin:1px 0 7px">' + (c.dist != null ? c.dist.toFixed(2) + ' mi' : '') + ' · ' + AP_D(c.fecha) + (c.dom ? ' · DOM ' + c.dom : '') + (x.filtro.pasa ? '' : ' · <span style="color:var(--amber,#e7b65e)">filtrado: ' + AP_E(x.filtro.razones.join('; ')) + '</span>') + '</div>'
    + '<div style="display:flex;justify-content:space-between;align-items:baseline"><div style="font-size:22px;font-weight:800">' + AP_M(c.price) + '</div><div style="font-size:11px;color:var(--txt3,#9fb0c9)">' + (c.sqft && c.price ? '$' + Math.round(c.price / c.sqft) + '/sqft' : '') + '</div></div>'
    + '<div style="font-size:11.5px;color:var(--txt3,#9fb0c9);margin:4px 0 9px">' + (c.sqft ? c.sqft.toLocaleString() + ' sqft' : 'sqft 🟡') + ' · ' + (c.beds != null ? c.beds : '🟡') + ' cm / ' + (c.baths != null ? c.baths : '🟡') + ' bñ · ' + (c.year || '🟡') + ' · lote ' + (c.lot ? c.lot.toLocaleString() : '🟡') + ' · piscina 🟡</div>'
    + '<div style="border-top:1px solid var(--line,rgba(255,255,255,.08));padding-top:7px">' + adjRows + '</div>'
    + '<details class="ap-man" style="margin:6px 0"><summary style="cursor:pointer;font-size:10.5px;color:var(--txt3,#9fb0c9)">± ajustes manuales (condición · ubicación · concesiones · pool/garaje/otros)</summary>'
    + '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">' + mIn('cond', 'condición') + mIn('ubic', 'ubicación') + mIn('conces', 'concesiones') + mIn('otros', 'otros') + '</div></details>'
    + '<div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--line,rgba(255,255,255,.08));padding-top:8px">'
    + '<div><div style="font-size:10px;color:var(--txt3,#9fb0c9)">valor ajustado · net ' + adj.netPct.toFixed(1) + '% · gross ' + adj.grossPct.toFixed(1) + '%' + (adj.grossPct > apCfg('arv_gross_adj_warn_pct', 25) ? ' ⚠' : '') + '</div><div style="font-size:17px;font-weight:800">' + AP_M(adj.valorAjustado) + '</div></div>'
    + (esRec && x.pesoPct != null ? '<span class="ap-wt">peso ' + x.pesoPct + '%</span>' : '<span class="ap-pill">fuera del cálculo</span>')
    + '</div></div></div>';
}

function apVistaGrilla(s, rec) {
  if (!rec || !rec.usables || !rec.usables.length) return '<div class="ap-card" style="text-align:center;color:var(--txt3,#9fb0c9)">Sin comps reconciliados.</div>';
  const us = rec.usables;
  const st = apState();
  const catSum = (x, cat) => x.adj.rows.filter(r => r.cat === cat).reduce((a, r) => a + r.monto, 0);
  const fmtAdj = v => v === 0 ? '$0' : '<b class="' + (v > 0 ? 'ap-pos' : 'ap-neg') + '">' + (v > 0 ? '+' : '−') + AP_M(Math.abs(v)).slice(0) + '</b>';
  const minGross = Math.min(...us.map(x => x.adj.grossPct));
  const head = '<tr><th>Comparable →</th><th class="subjcol">SUBJECT<div style="font-weight:500;font-size:10px;color:var(--txt3,#9fb0c9)">' + AP_E((s.dir || '').split(',')[0]) + '</div></th>'
    + us.map(x => '<th><div style="font-weight:700">' + AP_E(x.c.dir.split(',')[0]) + '</div><div style="font-weight:500;font-size:10px;color:var(--txt3,#9fb0c9)">' + (x.c.dist != null ? x.c.dist.toFixed(2) + ' mi · ' : '') + AP_D(x.c.fecha) + '</div></th>').join('') + '</tr>';
  const row = (lbl, sv, fn) => '<tr><td>' + lbl + '</td><td class="subjcol">' + sv + '</td>' + us.map(x => '<td>' + fn(x) + '</td>').join('') + '</tr>';
  const sec = lbl => '<tr class="sec"><td colspan="' + (us.length + 2) + '">' + lbl + '</td></tr>';
  return '<div class="ap-card ap-grid" style="padding:0;overflow-x:auto"><table><thead>' + head + '</thead><tbody>'
    + row('Precio de venta', '—', x => AP_M(x.c.price))
    + row('$/sqft', '—', x => x.c.sqft ? '$' + Math.round(x.c.price / x.c.sqft) : '—')
    + row('Sqft (GLA)', s.sqft ? s.sqft.toLocaleString() : '—', x => x.c.sqft ? x.c.sqft.toLocaleString() : '🟡')
    + row('Camas / Baños', (s.beds != null ? s.beds : '—') + ' / ' + (s.baths != null ? s.baths : '—'), x => (x.c.beds != null ? x.c.beds : '🟡') + ' / ' + (x.c.baths != null ? x.c.baths : '🟡'))
    + row('Año', s.year || '—', x => x.c.year || '🟡')
    + row('Lote sqft', s.lot ? s.lot.toLocaleString() : '—', x => x.c.lot ? x.c.lot.toLocaleString() : '—')
    + sec('Ajustes al subject')
    + row('Tamaño (GLA) · $' + apGlaPsf(s.zip) + '/sqft', '—', x => fmtAdj(catSum(x, 'gla')))
    + row('Cuartos', '—', x => fmtAdj(catSum(x, 'cuartos')))
    + row('Baños', '—', x => fmtAdj(catSum(x, 'banos')))
    + row('Año / condición', '—', x => fmtAdj(catSum(x, 'ano') + (AP_N((st.man[x.c.id] || {}).cond) || 0)))
    + row('Lote', '—', x => fmtAdj(catSum(x, 'lote')))
    + row('Manuales (ubic/conces/otros)', '—', x => fmtAdj(catSum(x, 'man') - (AP_N((st.man[x.c.id] || {}).cond) || 0)))
    + sec('Resultado')
    + row('Ajuste neto', '—', x => '<b class="' + (x.adj.netPct >= 0 ? 'ap-pos' : 'ap-neg') + '">' + (x.adj.netPct >= 0 ? '+' : '') + x.adj.netPct.toFixed(1) + '%</b>')
    + row('Ajuste bruto (similitud)', '—', x => x.adj.grossPct.toFixed(1) + '%' + (x.adj.grossPct === minGross ? ' ✅' : ''))
    + '<tr class="best"><td>Valor ajustado</td><td class="subjcol">—</td>' + us.map(x => '<td style="font-weight:800">' + AP_M(x.adj.valorAjustado) + '</td>').join('') + '</tr>'
    + row('Peso en el ARV', '—', x => '<span class="' + (x.adj.grossPct === minGross ? 'ap-wt' : 'ap-pill') + '">' + x.pesoPct + '%</span>')
    + row('Incluir en el cálculo', '—', x => '<input type="checkbox" class="ap-cbx" checked onchange="apExclToggle(\'' + x.c.id + '\')">')
    + '</tbody></table></div>';
}

function ffArvProView() {
  apCSS();
  const inp = UW.a.inputs;
  const st = apState();
  if (!st.dir) st.dir = UW.a.direccion || '';
  const s = apSubject();
  const comps = apComps();
  const f = apFiltros();
  const rec = comps.length ? apReconciliar(s, comps) : null;
  const cal = apCalibracion();

  // header + searchbar
  const head = '<div style="display:flex;align-items:center;gap:10px;margin-bottom:2px"><b style="font-size:18px">🏷️ ARV Profesional</b><span class="ap-pill">calibrado con tus appraisals</span></div>'
    + '<div style="color:var(--txt3,#9fb0c9);font-size:12.5px;margin-bottom:14px">La decisión más importante del negocio. Comps reales del mercado, ajustados como un tasador — nunca $/sqft promedio × sqft.</div>'
    + '<div class="ap-searchbar">🔎 <input id="ap-dir" value="' + AP_E(st.dir) + '" placeholder="Dirección del subject — ej. 6203 Shadow Bend, Austin, TX 78745" onchange="apSet(\'dir\',this.value)">'
    + '<button class="ap-btn ghost" onclick="apBuscar(true)">↺ Refrescar</button><button class="ap-btn" onclick="apBuscar(false)">Buscar comps</button></div>';

  // grid: ficha | hero
  const top = '<div class="grid k2" style="gap:14px;align-items:start;margin-bottom:14px">' + apVistaFicha(s) + apVistaHero(rec, inp) + '</div>';

  // mapa
  const mapa = '<div style="position:relative;margin-bottom:4px"><div id="ap-map"></div>'
    + '<div style="position:absolute;left:12px;top:10px;z-index:500;font-size:11px;color:var(--txt3,#9fb0c9);background:var(--card,rgba(10,14,20,.75));padding:4px 9px;border-radius:8px;border:1px solid var(--line,rgba(255,255,255,.1))">📍 Subject + ' + comps.length + ' comparables · click en un pin resalta el comp</div></div>';

  // criterio + resumen
  const criterio = apVistaCriterio(f, comps, rec);
  const resumen = apVistaResumen(s, rec);

  // comps: toggle tarjetas / grilla
  const vista = st.vista || 'cards';
  const toggle = '<div style="display:flex;justify-content:space-between;align-items:center;margin:2px 0 10px;flex-wrap:wrap;gap:8px"><div class="ap-lab">Comparables — el más parecido (menor ajuste bruto) pesa más</div>'
    + '<div style="display:flex;gap:6px"><button class="ap-btn ' + (vista === 'cards' ? '' : 'ghost') + '" style="padding:5px 12px;font-size:11px" onclick="apSet(\'vista\',\'cards\')">🃏 Tarjetas</button>'
    + '<button class="ap-btn ' + (vista === 'grid' ? '' : 'ghost') + '" style="padding:5px 12px;font-size:11px" onclick="apSet(\'vista\',\'grid\')">📋 Grilla 1004</button></div></div>';
  let compsHtml;
  if (!comps.length) compsHtml = '<div class="ap-card" style="text-align:center;padding:30px;color:var(--txt3,#9fb0c9)">Sin comps todavía — buscá el subject arriba.</div>';
  else if (vista === 'grid') compsHtml = apVistaGrilla(s, rec);
  else {
    const st2 = apState();
    const todos = comps.map(c => ({ c, filtro: apPasaFiltro(s, c, f), adj: apAjustes(s, c) }));
    const enRec = new Map((rec && rec.usables || []).map(u => [u.c.id, u]));
    todos.forEach(x => { const u = enRec.get(x.c.id); if (u) x.pesoPct = u.pesoPct; });
    const orden = todos.sort((a, b) => (enRec.has(b.c.id) ? 1 : 0) - (enRec.has(a.c.id) ? 1 : 0) || a.adj.grossPct - b.adj.grossPct);
    compsHtml = '<div class="ap-cards">' + orden.map(x => apCardComp(x, enRec.has(x.c.id))).join('') + '</div>';
  }

  // foot + calibración/factores (misma lógica de siempre)
  const foot = rec && rec.arv ? '<div style="display:flex;gap:12px;align-items:center;margin:14px 0;flex-wrap:wrap"><button class="ap-btn" onclick="apUsarArv(' + rec.arv + ')">→ Usar ' + AP_M(rec.arv) + ' como ARV del análisis</button>'
    + '<span style="font-size:11.5px;color:var(--txt3,#9fb0c9)">' + (rec.usables[0] ? 'El más parecido: ' + AP_E(rec.usables[0].c.dir.split(',')[0]) + ' (gross ' + rec.usables[0].adj.grossPct.toFixed(1) + '% → peso ' + rec.usables[0].pesoPct + '%).' : '') + ' El ARV de Airtable sigue siendo la fuente de verdad guardada.</span></div>' : '';

  const fEd = (k, l, def) => '<div style="margin-bottom:8px"><div style="font-size:10.5px;color:var(--txt2,#c9d5ea);font-weight:600;margin-bottom:2px">' + l + '</div><input value="' + apCfg(k, def) + '" onchange="apCfgSet(\'' + k + '\',this.value)" style="width:100%;background:var(--glass,rgba(255,255,255,.05));border:1px solid var(--line,rgba(255,255,255,.12));border-radius:8px;padding:6px 9px;color:inherit;font-size:12.5px;font-weight:600;outline:none"></div>';
  const factores = '<details class="ap-card" style="padding:14px;margin-bottom:14px"><summary style="cursor:pointer" class="ap-lab">⚙️ Factores de ajuste (calibrados, editables — ff_uw_config)</summary>'
    + '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:10px">'
    + fEd('arv_adj_gla_psf', 'GLA $/sqft' + (s.zip ? ' (zip ' + s.zip + ' usa arv_adj_gla_psf_' + s.zip + ' si existe)' : ''), 90)
    + fEd('arv_adj_cuarto', 'Cuarto $', 15000) + fEd('arv_adj_bano', 'Baño $', 15000) + fEd('arv_adj_piscina', 'Piscina $ (guía p/ manual)', 25000)
    + fEd('arv_adj_garaje', 'Garaje $ (guía p/ manual)', 20000) + fEd('arv_adj_fireplace', 'Fireplace $ (guía)', 1500) + fEd('arv_adj_lote_psf', 'Lote $/sqft', 2) + fEd('arv_adj_ano_pct', 'Año %/año', 0.5)
    + fEd('arv_mercado_pct_mes', 'Tendencia mercado %/mes', 0) + fEd('arv_rango_pct', 'Rango ±%', 6) + fEd('arv_gross_adj_warn_pct', 'Warn gross adj %', 25) + fEd('arv_bias_pct', 'Sesgo aplicado %', 0)
    + '</div><div style="font-size:10px;color:var(--txt3,#9fb0c9);margin-top:4px">Guías de piscina/garaje/fireplace: RentCast no dice si el COMP los tiene → usá el campo manual "otros" del comp con estos montos.</div></details>';

  const metaOk = cal.errorAbs != null && cal.errorAbs <= cal.meta;
  const filasCal = cal.filas.map(x =>
    '<tr style="' + (x.excluida ? 'opacity:.4' : '') + '"><td style="font-size:11.5px;text-align:left">' + AP_E(x.casa) + (x.excluida ? ' <span class="ap-pill" style="font-size:9px">excluida</span>' : '') + '</td>'
    + '<td>' + AP_M(x.arv) + '</td><td>' + AP_M(x.appr) + '</td>'
    + '<td style="font-weight:700" class="' + (Math.abs(x.devPct) <= 5 ? 'ap-pos' : 'ap-neg') + '">' + AP_M(x.dev) + ' (' + x.devPct.toFixed(1) + '%)</td>'
    + '<td style="text-align:center">' + (x.link ? '<a href="' + AP_E(x.link) + '" target="_blank" title="abrir appraisal PDF">📄</a>' : '—') + '</td></tr>').join('');
  const calHtml = '<div class="ap-card ap-grid" style="padding:14px"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px">'
    + '<div class="ap-lab">📏 Calibración — ARV nuestro vs appraisal real (' + cal.usadas.length + ' casas' + (cal.filas.length - cal.usadas.length ? ' + ' + (cal.filas.length - cal.usadas.length) + ' excluidas' : '') + ')</div>'
    + '<div style="font-size:12px">' + (cal.errorAbs != null ? '|error| prom <b class="' + (metaOk ? 'ap-pos' : 'ap-neg') + '">' + cal.errorAbs.toFixed(1) + '%</b> (meta ≤' + cal.meta + '%) · sesgo <b>' + (cal.errorProm >= 0 ? '+' : '') + cal.errorProm.toFixed(1) + '%</b> ' + (cal.errorProm > 1 ? '(pasados — estimamos de más)' : cal.errorProm < -1 ? '(conservadores)' : '(neutro)') : 'sin datos') + '</div></div>'
    + (cal.sugerenciaBias != null && Math.abs(cal.sugerenciaBias) > 0.5 && Math.abs(apCfg('arv_bias_pct', 0) - cal.sugerenciaBias) > 0.5
      ? '<div style="background:rgba(231,182,94,.08);border:1px solid rgba(231,182,94,.3);border-radius:9px;padding:8px 12px;margin-bottom:8px;font-size:11.5px">💡 Sugerencia de recalibración: aplicar sesgo <b>' + cal.sugerenciaBias.toFixed(2) + '%</b> al reconciliado (hoy ' + apCfg('arv_bias_pct', 0) + '%). '
      + cal.zips.map(z => 'zip ' + z.zip + ': ' + (-z.prom).toFixed(1) + '% (n=' + z.n + ')').join(' · ')
      + ' <button class="ap-btn" style="padding:3px 10px;font-size:10.5px;margin-left:8px" onclick="apAplicarBias(' + cal.sugerenciaBias.toFixed(2) + ')">Aplicar (humano aprueba)</button></div>' : '')
    + '<div style="overflow-x:auto"><table style="min-width:560px"><thead><tr><th style="text-align:left">Casa</th><th>ARV nuestro</th><th>Appraisal</th><th>Desviación</th><th style="text-align:center">PDF</th></tr></thead><tbody>' + filasCal + '</tbody></table></div>'
    + '<div style="font-size:10px;color:var(--txt3,#9fb0c9);margin-top:6px">Excluidas de la calibración (atípicos/datos sucios, editable en arv_calib_excluir): ' + AP_E(window.UWct ? UWct('arv_calib_excluir', '—') : '—') + '</div></div>';

  setTimeout(apMapMount, 40);
  return head + top + mapa + criterio + resumen + toggle + compsHtml + foot + factores + calHtml;
}
window.ffArvProView = ffArvProView;
