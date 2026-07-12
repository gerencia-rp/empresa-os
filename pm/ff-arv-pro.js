// ════════════════════════════════════════════════════════════════
// 🏷️ ARV PROFESIONAL (Calc 2 de la Suite UW) — tasador estilo formulario 1004.
// Subject + comps de RentCast (proxy backend, key jamás en el front) → filtros del tasador →
// motor de ajustes por comp (GLA/cuarto/baño/año/lote/fecha + manuales) → reconciliación
// ponderada por MENOR gross adj % → ARV + rango + confianza → desviación vs appraisal real
// (aprendizaje: sesgo sugerido, lo aplica un humano). NUNCA $/sqft promedio × sqft.
// Cero hardcode: factores/filtros en ff_uw_config (editables acá mismo). Fuente de verdad
// guardada sigue siendo el ARV de Airtable; esto produce el "ARV estimado profesional".
// Estado por análisis en UW.a.inputs.arvpro (persiste con ff_underwriting_analyses).
// ════════════════════════════════════════════════════════════════

const AP_E = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const AP_M = n => (n == null || isNaN(n)) ? '—' : (n < 0 ? '-$' : '$') + Math.abs(Math.round(n)).toLocaleString('en-US');
const AP_N = v => { const x = parseFloat(v); return isNaN(x) ? null : x; };

function apState() {
  if (!UW.a) return null;
  if (!UW.a.inputs.arvpro) UW.a.inputs.arvpro = { subj: {}, man: {}, excl: {}, filtros: {}, dir: '' };
  return UW.a.inputs.arvpro;
}
function apCfg(k, def) { return UWc(k, def); }
function apZip(addr) { const m = String(addr || '').match(/\b(7\d{4})\b/); return m ? m[1] : null; }
function apGlaPsf(zip) { return zip != null && UW.cfg['arv_adj_gla_psf_' + zip] != null ? +UW.cfg['arv_adj_gla_psf_' + zip] : apCfg('arv_adj_gla_psf', 90); }
function apMesesDesde(fecha) { if (!fecha) return null; const t = new Date(fecha).getTime(); return isNaN(t) ? null : (Date.now() - t) / (30.44 * 86400000); }

// ─── SUBJECT: RentCast /properties + overrides manuales (faltantes marcados) ───
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
    rcOk: !!(rc && rc !== 'loading' && rc.payload), rcLoading: rc === 'loading',
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
    corr: AP_N(c.correlation),
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
function apAjustes(s, c) {
  const st = apState(); const man = st.man[c.id] || {};
  const rows = [];
  const add = (concepto, monto, fuente) => { if (monto) rows.push({ concepto, monto: Math.round(monto), fuente }); };
  if (s.sqft && c.sqft) add('GLA ' + (s.sqft - c.sqft > 0 ? '+' : '') + Math.round(s.sqft - c.sqft) + ' sqft × $' + apGlaPsf(s.zip), (s.sqft - c.sqft) * apGlaPsf(s.zip), 'auto');
  if (s.beds != null && c.beds != null && s.beds !== c.beds) add('Cuartos Δ' + (s.beds - c.beds), (s.beds - c.beds) * apCfg('arv_adj_cuarto', 15000), 'auto');
  if (s.baths != null && c.baths != null && s.baths !== c.baths) add('Baños Δ' + (s.baths - c.baths), (s.baths - c.baths) * apCfg('arv_adj_bano', 15000), 'auto');
  if (s.year && c.year && s.year !== c.year) add('Año Δ' + (s.year - c.year), (s.year - c.year) * (apCfg('arv_adj_ano_pct', 0.5) / 100) * c.price, 'auto');
  if (s.lot && c.lot && Math.abs(s.lot - c.lot) > 500) add('Lote Δ' + Math.round(s.lot - c.lot) + ' sqft', (s.lot - c.lot) * apCfg('arv_adj_lote_psf', 2), 'auto');
  const m = apMesesDesde(c.fecha);
  const tend = apCfg('arv_mercado_pct_mes', 0);
  if (m != null && tend) add('Tendencia mercado ' + Math.round(m) + 'm × ' + tend + '%/m', m * (tend / 100) * c.price, 'auto');
  add('Condición/reno (manual)', AP_N(man.cond) || 0, 'manual');
  add('Ubicación/submercado (manual)', AP_N(man.ubic) || 0, 'manual');
  add('Concesiones vendedor (manual)', -(AP_N(man.conces) || 0), 'manual');
  add('Piscina/garaje/fireplace/otros (manual)', AP_N(man.otros) || 0, 'manual');
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
  const { error } = await sb.from('ff_uw_config').upsert({ key, value: num, label: (UW.cfgTxt && UW.cfgTxt['label_' + key]) || undefined, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) return alert('Config: ' + error.message);
  UW.cfg[key] = num; ffUwRender();
}
window.apCfgSet = apCfgSet;
async function apAplicarBias(v) {
  if (!confirm('Aplicar corrección de sesgo global de ' + v.toFixed(2) + '% al ARV reconciliado? (editable en ff_uw_config · arv_bias_pct)')) return;
  await apCfgSet('arv_bias_pct', v.toFixed(2));
}
window.apAplicarBias = apAplicarBias;

// ─── UI ───
function apInput(lab, val, onchange, opts) {
  opts = opts || {};
  return '<div style="margin-bottom:8px"><div style="font-size:10.5px;color:var(--txt2,#c9d5ea);font-weight:600;margin-bottom:2px">' + lab + (opts.falta ? ' <span style="color:var(--amber,#e7b65e)" title="RentCast no lo cubre — entrada manual">🟡 faltante</span>' : '') + '</div>'
    + '<input value="' + (val == null || val === '' ? '' : AP_E(val)) + '" placeholder="' + (opts.ph || '—') + '" onchange="' + onchange + '" style="width:100%;background:var(--card,rgba(255,255,255,.05));border:1px solid var(--line,rgba(255,255,255,.12));border-radius:8px;padding:6px 9px;color:inherit;font-size:12.5px;font-weight:600;outline:none">' + '</div>';
}
function apChipConf(nivel) {
  const c = nivel === 'alta' ? 'var(--pos,#34d399)' : nivel === 'media' ? 'var(--amber,#e7b65e)' : 'var(--neg,#f87171)';
  return '<span style="border:1px solid ' + c + ';color:' + c + ';border-radius:20px;padding:2px 10px;font-size:11px;font-weight:700">confianza ' + nivel + '</span>';
}

function ffArvProView() {
  const inp = UW.a.inputs;
  const st = apState();
  if (!st.dir) st.dir = UW.a.direccion || '';
  const s = apSubject();
  const comps = apComps();
  const f = apFiltros();
  const rec = comps.length ? apReconciliar(s, comps) : null;
  const cal = apCalibracion();
  const grossWarn = apCfg('arv_gross_adj_warn_pct', 25);
  const netWarn = apCfg('arv_net_adj_warn_pct', 15);

  // ── header: buscar subject
  const buscar = '<div class="card" style="padding:16px;margin-bottom:14px"><div style="display:flex;gap:8px;align-items:end;flex-wrap:wrap">'
    + '<div style="flex:1;min-width:260px">' + apInput('Dirección del subject', st.dir, "apSet('dir',this.value)", { ph: 'ej. 6203 Shadow Bend, Austin, TX 78745' }) + '</div>'
    + '<button class="repbtn" style="margin-bottom:8px" onclick="apBuscar(false)">🔎 Buscar subject + comps</button>'
    + '<button class="repbtn ghost" style="margin-bottom:8px" onclick="apBuscar(true)">↻ Refrescar (gasta cuota)</button>'
    + '</div><div style="font-size:10px;color:var(--txt3,#9fb0c9)">RentCast vía backend (key en secret) · cache 30 días · comps = ventas/listings reales de la zona</div></div>';

  // ── subject card
  const rcTag = s.rcLoading ? '⏳ consultando…' : s.rcOk ? '<span class="up">✓ RentCast</span>' : '<span style="color:var(--amber,#e7b65e)">sin datos RentCast — cargá a mano</span>';
  const subjCard = '<div class="card" style="padding:16px;margin-bottom:14px"><div style="font-size:12px;font-weight:800;text-transform:uppercase;color:var(--a1,#12b5a0);margin-bottom:8px">Subject · ' + rcTag + (s.zip ? ' · zip ' + s.zip + ' (GLA $' + apGlaPsf(s.zip) + '/sqft)' : '') + '</div>'
    + '<div class="grid" style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px">'
    + apInput('Sqft (GLA)', s.sqft, "apSet('subj.sqft',this.value)", { falta: s.rcOk && s.sqft == null })
    + apInput('Camas', s.beds, "apSet('subj.beds',this.value)", { falta: s.rcOk && s.beds == null })
    + apInput('Baños', s.baths, "apSet('subj.baths',this.value)", { falta: s.rcOk && s.baths == null })
    + apInput('Año', s.year, "apSet('subj.year',this.value)", { falta: s.rcOk && s.year == null })
    + apInput('Lote sqft', s.lot, "apSet('subj.lot',this.value)", { falta: s.rcOk && s.lot == null })
    + '</div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:2px">'
    + ['pool:Piscina', 'garage:Garaje', 'fireplace:Fireplace'].map(x => { const [k, l] = x.split(':'); return '<button class="repbtn ' + (s[k] ? '' : 'ghost') + '" style="padding:4px 10px;font-size:11px" onclick="apSet(\'subj.' + k + '\',' + (s[k] ? 'false' : 'true') + ')">' + (s[k] ? '☑' : '☐') + ' ' + l + '</button>'; }).join('')
    + '</div></div>';

  // ── filtros
  const filtros = '<div class="card" style="padding:14px;margin-bottom:14px"><div style="font-size:12px;font-weight:800;text-transform:uppercase;color:var(--a1,#12b5a0);margin-bottom:8px">Filtros de comparables (como tu equipo)</div>'
    + '<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px">'
    + apInput('Distancia máx (mi)', f.dist, "apSet('filtros.dist',this.value)")
    + apInput('Venta hace máx (meses)', f.meses, "apSet('filtros.meses',this.value)")
    + apInput('Sqft ±%', f.sqftPct, "apSet('filtros.sqftPct',this.value)")
    + apInput('Camas ±', f.camas, "apSet('filtros.camas',this.value)")
    + apInput('Baños ±', f.banos, "apSet('filtros.banos',this.value)")
    + apInput('Año ±', f.ano, "apSet('filtros.ano',this.value)")
    + '</div></div>';

  // ── tabla de comps
  let compsHtml = '';
  if (!comps.length) compsHtml = '<div class="card" style="padding:24px;text-align:center;color:var(--txt3,#9fb0c9);margin-bottom:14px">Sin comps todavía — dale a 🔎 Buscar.</div>';
  else {
    const filas = comps.map(c => {
      const fl = apPasaFiltro(s, c, f);
      const adj = apAjustes(s, c);
      const inclUse = rec && rec.usables.some(u => u.c.id === c.id);
      const u = rec && rec.usables.find(u => u.c.id === c.id);
      const man = st.man[c.id] || {};
      const warn = adj.grossPct > grossWarn ? ' <span title="gross adj > ' + grossWarn + '% — comp poco comparable (estándar 1004)" style="color:var(--neg,#f87171)">⚠</span>' : '';
      const mIn = (k, ph) => '<input value="' + (man[k] || '') + '" placeholder="' + ph + '" onchange="apManSet(\'' + c.id + '\',\'' + k + '\',this.value)" style="width:74px;background:var(--card,rgba(255,255,255,.05));border:1px solid var(--line,rgba(255,255,255,.12));border-radius:6px;padding:3px 6px;color:inherit;font-size:10.5px;text-align:right">';
      return '<tr style="' + (st.excl[c.id] ? 'opacity:.35;' : !fl.pasa ? 'opacity:.45;' : '') + (inclUse ? 'background:rgba(18,181,160,.05)' : '') + '">'
        + '<td><input type="checkbox" ' + (!st.excl[c.id] ? 'checked' : '') + ' onchange="apExclToggle(\'' + c.id + '\')" title="incluir/excluir"></td>'
        + '<td style="max-width:190px"><div style="font-weight:600;font-size:11.5px">' + AP_E(c.dir.split(',')[0]) + '</div><div style="font-size:9.5px;opacity:.55">' + (c.dist != null ? c.dist.toFixed(2) + ' mi · ' : '') + (c.fecha ? String(c.fecha).slice(0, 10) : 's/fecha') + (c.dom ? ' · DOM ' + c.dom : '') + (fl.pasa ? '' : ' · <span style="color:var(--amber,#e7b65e)">filtrado: ' + AP_E(fl.razones.join('; ')) + '</span>') + '</div></td>'
        + '<td style="text-align:right;font-weight:700">' + AP_M(c.price) + '</td>'
        + '<td style="text-align:right;font-size:11px">' + (c.sqft || '—') + '<div style="font-size:9px;opacity:.5">' + (c.sqft && c.price ? '$' + Math.round(c.price / c.sqft) + '/sf' : '') + '</div></td>'
        + '<td style="text-align:center;font-size:11px">' + (c.beds != null ? c.beds : '🟡') + '/' + (c.baths != null ? c.baths : '🟡') + '<div style="font-size:9px;opacity:.5">' + (c.year || '🟡') + '</div></td>'
        + '<td style="font-size:10px;max-width:170px">' + adj.rows.map(r => '<div style="display:flex;justify-content:space-between;gap:6px"><span style="opacity:.65">' + AP_E(r.concepto) + '</span><b>' + AP_M(r.monto) + '</b></div>').join('') + '</td>'
        + '<td style="text-align:right;white-space:nowrap">' + mIn('cond', 'cond') + '<br>' + mIn('ubic', 'ubic') + '<br>' + mIn('conces', 'conces') + '<br>' + mIn('otros', 'otros') + '</td>'
        + '<td style="text-align:right;font-weight:800">' + AP_M(adj.valorAjustado) + '<div style="font-size:9px;opacity:.6;font-weight:400">net ' + adj.netPct.toFixed(1) + '% · gross ' + adj.grossPct.toFixed(1) + '%' + warn + (Math.abs(adj.netPct) > netWarn ? ' ⚠net' : '') + '</div>' + (u ? '<div style="font-size:9px;color:var(--a1,#12b5a0)">peso ' + u.pesoPct + '%</div>' : '') + '</td></tr>';
    }).join('');
    compsHtml = '<div class="card" style="padding:14px;margin-bottom:14px"><div style="font-size:12px;font-weight:800;text-transform:uppercase;color:var(--a1,#12b5a0);margin-bottom:8px">Comparables (' + comps.length + ' de RentCast · reconcilio ' + (rec ? rec.usables.length : 0) + ')</div>'
      + '<div style="overflow-x:auto"><table class="ptable" style="width:100%;font-size:12px"><thead><tr><th></th><th>Comp</th><th style="text-align:right">Precio</th><th style="text-align:right">Sqft</th><th style="text-align:center">Cm/Bñ·Año</th><th>Ajustes (auto)</th><th style="text-align:right">Manuales $</th><th style="text-align:right">Ajustado</th></tr></thead><tbody>' + filas + '</tbody></table></div>'
      + '<div style="font-size:10px;color:var(--txt3,#9fb0c9);margin-top:6px">🟡 = dato que RentCast no cubre (cargalo a mano en "Manuales": condición C1–C6/reno, ubicación, concesiones −, piscina/garaje/fireplace en "otros"). NUNCA se usa $/sqft promedio × sqft — solo comps ajustados.</div></div>';
  }

  // ── reconciliación / hero
  let hero = '';
  if (rec && rec.arv) {
    const arvAt = +inp.arv_airtable || +inp.arv || 0;
    const appr = +inp.appraisal || 0;
    hero = '<div style="background:linear-gradient(135deg,var(--a1,#12b5a0)22,transparent);border:1px solid var(--a1,#12b5a0)55;border-radius:14px;padding:18px 22px;margin-bottom:14px">'
      + '<div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:10px"><div>'
      + '<div style="font-size:12px;color:var(--txt2,#c9d5ea);font-weight:600;text-transform:uppercase;letter-spacing:.5px">ARV estimado profesional (comps ajustados)</div>'
      + '<div style="font-size:40px;font-weight:800;color:var(--a1,#12b5a0);line-height:1.1;margin:4px 0">' + AP_M(rec.arv) + '</div>'
      + '<div style="font-size:12px;color:var(--txt3,#9fb0c9)">🔻 ' + AP_M(rec.conservador) + ' · 🎯 ' + AP_M(rec.arv) + ' · 🔺 ' + AP_M(rec.optimista) + ' &nbsp; ' + apChipConf(rec.confianza.nivel) + '</div>'
      + '<div style="font-size:10px;color:var(--txt3,#9fb0c9);margin-top:4px">' + rec.confianza.razones.map(AP_E).join(' · ') + '</div></div>'
      + '<div style="text-align:right;font-size:12px">'
      + (arvAt ? '<div>ARV Airtable (fuente de verdad): <b>' + AP_M(arvAt) + '</b> · Δ <b class="' + (rec.arv - arvAt >= 0 ? 'up' : 'down') + '">' + AP_M(rec.arv - arvAt) + '</b></div>' : '')
      + (appr ? '<div>Appraisal real: <b>' + AP_M(appr) + '</b> · Δ <b class="' + (Math.abs(rec.arv - appr) / appr <= 0.05 ? 'up' : 'down') + '">' + AP_M(rec.arv - appr) + ' (' + ((rec.arv - appr) / appr * 100).toFixed(1) + '%)</b></div>' : '')
      + '<button class="repbtn" style="margin-top:8px" onclick="apUsarArv(' + rec.arv + ')">→ Usar como ARV del análisis</button>'
      + '</div></div></div>';
  }

  // ── factores editables
  const fEd = (k, l, def) => apInput(l, apCfg(k, def), "apCfgSet('" + k + "',this.value)");
  const factores = '<details class="card" style="padding:14px;margin-bottom:14px"><summary style="cursor:pointer;font-size:12px;font-weight:800;text-transform:uppercase;color:var(--a1,#12b5a0)">⚙️ Factores de ajuste (calibrados, editables — ff_uw_config)</summary>'
    + '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:10px">'
    + fEd('arv_adj_gla_psf', 'GLA $/sqft' + (s.zip ? ' (global; zip ' + s.zip + ' usa arv_adj_gla_psf_' + s.zip + ' si existe)' : ''), 90)
    + fEd('arv_adj_cuarto', 'Cuarto $', 15000) + fEd('arv_adj_bano', 'Baño $', 15000) + fEd('arv_adj_piscina', 'Piscina $ (guía p/ manual)', 25000)
    + fEd('arv_adj_garaje', 'Garaje $ (guía p/ manual)', 20000) + fEd('arv_adj_fireplace', 'Fireplace $ (guía)', 1500) + fEd('arv_adj_lote_psf', 'Lote $/sqft', 2) + fEd('arv_adj_ano_pct', 'Año %/año', 0.5)
    + fEd('arv_mercado_pct_mes', 'Tendencia mercado %/mes', 0) + fEd('arv_rango_pct', 'Rango ±%', 6) + fEd('arv_gross_adj_warn_pct', 'Warn gross adj %', 25) + fEd('arv_bias_pct', 'Sesgo aplicado %', 0)
    + '</div><div style="font-size:10px;color:var(--txt3,#9fb0c9);margin-top:4px">Guías de piscina/garaje/fireplace: RentCast no dice si el COMP los tiene → usá el campo manual "otros" del comp con estos montos.</div></details>';

  // ── calibración / desviación
  const metaOk = cal.errorAbs != null && cal.errorAbs <= cal.meta;
  const filasCal = cal.filas.map(x =>
    '<tr style="' + (x.excluida ? 'opacity:.4' : '') + '"><td style="font-size:11.5px">' + AP_E(x.casa) + (x.excluida ? ' <span class="osbadge" style="font-size:8.5px">excluida</span>' : '') + '</td>'
    + '<td style="text-align:right">' + AP_M(x.arv) + '</td><td style="text-align:right">' + AP_M(x.appr) + '</td>'
    + '<td style="text-align:right;font-weight:700" class="' + (Math.abs(x.devPct) <= 5 ? 'up' : 'down') + '">' + AP_M(x.dev) + ' (' + x.devPct.toFixed(1) + '%)</td>'
    + '<td style="text-align:center">' + (x.link ? '<a href="' + AP_E(x.link) + '" target="_blank" title="abrir appraisal PDF">📄</a>' : '—') + '</td></tr>').join('');
  const calHtml = '<div class="card" style="padding:14px"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px">'
    + '<div style="font-size:12px;font-weight:800;text-transform:uppercase;color:var(--a1,#12b5a0)">📏 Calibración — ARV nuestro vs appraisal real (' + cal.usadas.length + ' casas' + (cal.filas.length - cal.usadas.length ? ' + ' + (cal.filas.length - cal.usadas.length) + ' excluidas' : '') + ')</div>'
    + '<div style="font-size:12px">' + (cal.errorAbs != null ? '|error| prom <b class="' + (metaOk ? 'up' : 'down') + '">' + cal.errorAbs.toFixed(1) + '%</b> (meta ≤' + cal.meta + '%) · sesgo <b>' + (cal.errorProm >= 0 ? '+' : '') + cal.errorProm.toFixed(1) + '%</b> ' + (cal.errorProm > 1 ? '(pasados — estimamos de más)' : cal.errorProm < -1 ? '(conservadores)' : '(neutro)') : 'sin datos') + '</div></div>'
    + (cal.sugerenciaBias != null && Math.abs(cal.sugerenciaBias) > 0.5 && Math.abs(apCfg('arv_bias_pct', 0) - cal.sugerenciaBias) > 0.5
      ? '<div style="background:rgba(231,182,94,.08);border:1px solid rgba(231,182,94,.3);border-radius:9px;padding:8px 12px;margin-bottom:8px;font-size:11.5px">💡 Sugerencia de recalibración: aplicar sesgo <b>' + cal.sugerenciaBias.toFixed(2) + '%</b> al reconciliado (hoy ' + apCfg('arv_bias_pct', 0) + '%). '
      + cal.zips.map(z => 'zip ' + z.zip + ': ' + (-z.prom).toFixed(1) + '% (n=' + z.n + ')').join(' · ')
      + ' <button class="repbtn" style="padding:3px 10px;font-size:10.5px;margin-left:8px" onclick="apAplicarBias(' + cal.sugerenciaBias.toFixed(2) + ')">Aplicar (humano aprueba)</button></div>' : '')
    + '<div style="overflow-x:auto"><table class="ptable" style="width:100%;font-size:12px"><thead><tr><th>Casa</th><th style="text-align:right">ARV nuestro</th><th style="text-align:right">Appraisal</th><th style="text-align:right">Desviación</th><th style="text-align:center">PDF</th></tr></thead><tbody>' + filasCal + '</tbody></table></div>'
    + '<div style="font-size:10px;color:var(--txt3,#9fb0c9);margin-top:6px">Excluidas de la calibración (atípicos/datos sucios, editable en arv_calib_excluir): ' + AP_E(UWct ? UWct('arv_calib_excluir', '—') : '—') + '</div></div>';

  return buscar + subjCard + hero + filtros + compsHtml + factores + calHtml;
}
window.ffArvProView = ffArvProView;
