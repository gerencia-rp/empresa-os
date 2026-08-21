// ════════════════════════════════════════════════════════════════
// 📐 C.3 — RECALCULAR $/ft² CON DESVIACIÓN (calibración del Estimador)
// Recalcula el costo por pie cuadrado real de las obras terminadas, con su
// margen de error (CV = desv/media), detección de outliers, e histórico
// (remodel_cost_calibracion) para ver el margen bajar con cada obra.
// Muestra el estimado con su margen ("$X/ft² · real $Z/ft² ±Y% n=N") en el
// Estimador Pro. NO altera el costo bottom-up del Estimador (solo referencia).
//
// $/ft² real por vivienda = costo_real / ft². Costo real = v_remodel_presupuesto_casa
// .total_real (plata real) con fallback gasto_materiales+gasto_trabajadores.
// ft² = remodel_at_properties.sqft (remodel_house_sqft está huérfana en el código).
// Media recomendada: ponderada por ft² (= Σcosto/Σft²). Outliers |z|>2 excluidos y listados.
// Escrituras: insert a remodel_cost_calibracion + upsert remodel_forecast_params. Auditable.
// ════════════════════════════════════════════════════════════════

// ── Estadística pura (testeable en Node) ─────────────────────────
// items: [{address, sqft, costo, est}]. opts: {weighted=true, zThresh=2}
function rmSqftStats(items, opts) {
  opts = opts || {};
  const z = opts.zThresh || 2;
  const clean = (items || []).filter(it => (+it.sqft > 0) && (+it.costo > 0));
  const nTotal = clean.length;
  const empty = { n: 0, nTotal: 0, psfSimple: null, psfWeighted: null, psfEst: null, std: null, cv: null, sesgo: null, desvCostoPct: null, outliers: [], detalle: [], meanRef: null };
  if (!nTotal) return empty;
  const all = clean.map(it => ({ address: it.address, sqft: +it.sqft, costo: +it.costo, est: +it.est || 0, psf: (+it.costo) / (+it.sqft) }));
  const mean0 = all.reduce((a, x) => a + x.psf, 0) / nTotal;
  const std0 = nTotal > 1 ? Math.sqrt(all.reduce((a, x) => a + (x.psf - mean0) ** 2, 0) / (nTotal - 1)) : 0;
  // Detección robusta de outliers: z modificado (mediana + MAD, Iglewicz-Hoaglin),
  // resistente al enmascaramiento que sufre el z clásico con un outlier extremo.
  const median = arr => { const a = arr.slice().sort((x, y) => x - y); const m = Math.floor(a.length / 2); return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };
  const med = median(all.map(x => x.psf));
  const mad = median(all.map(x => Math.abs(x.psf - med)));
  const thr = mad > 0 ? 3.5 : (z || 2);
  const outliers = [], included = [];
  all.forEach(x => {
    let mz = 0;
    if (mad > 0) mz = 0.6745 * (x.psf - med) / mad;
    else if (std0 > 0) mz = (x.psf - mean0) / std0;
    x._z = +mz.toFixed(2);
    if (nTotal >= 4 && Math.abs(mz) > thr) outliers.push(x); else included.push(x);
  });
  const n = included.length;
  const sumC = included.reduce((a, x) => a + x.costo, 0);
  const sumS = included.reduce((a, x) => a + x.sqft, 0);
  const psfWeighted = sumS > 0 ? sumC / sumS : null;
  const psfSimple = n > 0 ? included.reduce((a, x) => a + x.psf, 0) / n : null;
  const meanRef = (opts.weighted !== false) ? psfWeighted : psfSimple;
  const std = n > 1 ? Math.sqrt(included.reduce((a, x) => a + (x.psf - psfSimple) ** 2, 0) / (n - 1)) : 0;
  const cv = (meanRef > 0) ? std / meanRef * 100 : null;
  const withEst = included.filter(x => x.est > 0);
  const psfEst = withEst.length ? withEst.reduce((a, x) => a + (x.est / x.sqft), 0) / withEst.length : null;
  const sesgo = withEst.length ? withEst.reduce((a, x) => a + (x.psf - x.est / x.sqft), 0) / withEst.length : null;
  const desvCostoPct = withEst.length ? withEst.reduce((a, x) => a + ((x.costo - x.est) / x.est), 0) / withEst.length * 100 : null;
  const detalle = all.map(x => ({ address: x.address, sqft: x.sqft, costo: Math.round(x.costo), psf: +x.psf.toFixed(1), z: x._z, incluida: !outliers.includes(x) }));
  return { n, nTotal, psfSimple, psfWeighted, psfEst, std, cv, sesgo, desvCostoPct, meanRef, outliers: outliers.map(o => ({ address: o.address, psf: +o.psf.toFixed(1), z: o._z })), detalle };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { rmSqftStats };
}

/* ═══════════════════════ Browser ═══════════════════════ */
var rmSqftState = { stats: null, items: null, history: [], incluyeEnObra: false, ponderada: true, loading: false };

// Carga obras + costo real → construye items para el cálculo.
async function rmSqftLoadData() {
  rmSqftState.loading = true;
  try {
    const [props, pres, hist] = await Promise.all([
      sb.from('remodel_at_properties').select('airtable_id, property_id, address, proceso, sqft, monto_real, gasto_materiales, gasto_trabajadores, presupuesto_interno').eq('active', true).then(r => r.data || []).catch(() => []),
      sb.from('v_remodel_presupuesto_casa').select('airtable_id, property_id, total_real').then(r => r.data || []).catch(() => []),
      sb.from('remodel_cost_calibracion').select('run_at, n, psf_real_weighted, cv_pct, desv_costo_pct').eq('active', true).order('run_at', { ascending: true }).then(r => r.data || []).catch(() => [])
    ]);
    const presByAt = {}, presByProp = {};
    (pres || []).forEach(p => { if (p.airtable_id) presByAt[p.airtable_id] = p; if (p.property_id) presByProp[p.property_id] = p; });
    const inObra = rmSqftState.incluyeEnObra;
    const items = (props || []).filter(o => {
      const fin = (o.proceso || '').toLowerCase().includes('finaliz');
      const enObra = (o.proceso || '').toLowerCase().includes('construc');
      return (fin || (inObra && enObra)) && (+o.sqft > 0);
    }).map(o => {
      const pc = presByAt[o.airtable_id] || presByProp[o.property_id] || null;
      const costo = (pc && +pc.total_real > 0) ? +pc.total_real : ((+o.gasto_materiales || 0) + (+o.gasto_trabajadores || 0));
      return { address: o.address, sqft: +o.sqft, costo, est: +o.presupuesto_interno || 0 };
    }).filter(it => it.costo > 0);
    rmSqftState.items = items;
    rmSqftState.stats = rmSqftStats(items, { weighted: rmSqftState.ponderada });
    rmSqftState.history = hist || [];
  } catch (e) { rmSqftState.error = e && e.message; } finally { rmSqftState.loading = false; }
}

// Carga ligera del último corte para el badge del Estimador.
async function rmSqftLoadLatest() {
  if (typeof sb === 'undefined') return;
  try {
    const r = await sb.from('remodel_cost_calibracion').select('psf_real_weighted, cv_pct, n, run_at').eq('active', true).order('run_at', { ascending: false }).limit(1).maybeSingle();
    if (r.data) { window.RM_SQFT_CALIB = { psf_real: +r.data.psf_real_weighted, cv_pct: +r.data.cv_pct, n: r.data.n, run_at: r.data.run_at }; return; }
    const v = await sb.from('v_remodel_calib_costos').select('psf_real, desv_costo_pct, n').eq('ventana', 'historico').maybeSingle();
    if (v.data) window.RM_SQFT_CALIB = { psf_real: +v.data.psf_real, cv_pct: Math.abs(+v.data.desv_costo_pct || 0), n: v.data.n };
  } catch (e) { }
}

// Badge para el pricing-box del Estimador (remodel-pro.js). Compara costo directo/ft² vs real.
function rmSqftBadgeHtml(e) {
  const c = (typeof window !== 'undefined') ? window.RM_SQFT_CALIB : null;
  if (!c || !(+c.psf_real > 0) || !e || !(+e.sqft > 0) || !e.pricing) return '';
  const estPsf = (+e.pricing.directCost || 0) / (+e.sqft);
  const real = +c.psf_real, cv = +c.cv_pct || 0, n = c.n || 0;
  const lo = real * (1 - cv / 100), hi = real * (1 + cv / 100);
  const estado = estPsf < lo ? 'por debajo del real' : estPsf > hi ? 'por encima del real' : 'dentro del rango real';
  const color = estPsf > hi ? '#dc2626' : estPsf < lo ? '#d97706' : '#059669';
  return `<div style="font-size:11px;color:#5a6270;margin-top:6px;padding-top:6px;border-top:1px dashed #e2e8f0">Calibración real: <strong>$${real.toFixed(0)}/ft²</strong> ±${cv.toFixed(0)}% (n=${n}). Costo directo estimado <strong>$${estPsf.toFixed(0)}/ft²</strong> — <span style="color:${color};font-weight:700">${estado}</span>.</div>`;
}

// ── Panel UI ─────────────────────────────────────────────────────
async function rmSqftOpenPanel() {
  let el = document.getElementById('rmsq-modal');
  if (!el) { el = document.createElement('div'); el.id = 'rmsq-modal'; document.body.appendChild(el); }
  el.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:20px';
  el.innerHTML = `<div style="background:#14161b;color:#e7eaf0;border:1px solid rgba(255,255,255,.12);border-radius:16px;max-width:760px;width:100%;max-height:92vh;overflow:auto;padding:22px;font-family:inherit;box-shadow:0 20px 60px rgba(0,0,0,.5)"><div style="text-align:center;padding:30px;color:#8b93a1">${(typeof osIcon === 'function' ? osIcon('loader') : '⏳')} Calculando $/ft²…</div></div>`;
  await rmSqftLoadData();
  rmSqftRenderPanel();
}

function rmSqftRenderPanel() {
  const el = document.getElementById('rmsq-modal'); if (!el) return;
  const s = rmSqftState.stats || {};
  const money = n => n == null ? '—' : '$' + Math.round(n).toLocaleString();
  const psf = n => n == null ? '—' : '$' + (+n).toFixed(0) + '/ft²';
  const detRows = (s.detalle || []).slice().sort((a, b) => b.psf - a.psf).map(d => `<tr style="${d.incluida ? '' : 'opacity:.5'}">
      <td style="padding:4px 8px">${String(d.address || '').split(',')[0].replace(/</g, '&lt;')}</td>
      <td style="padding:4px 8px;text-align:right">${Math.round(d.sqft).toLocaleString()}</td>
      <td style="padding:4px 8px;text-align:right">${money(d.costo)}</td>
      <td style="padding:4px 8px;text-align:right;font-weight:700">${psf(d.psf)}</td>
      <td style="padding:4px 8px;text-align:center">${d.incluida ? '<span style="color:#4ade9e">✓</span>' : `<span style="color:#fbbf24" title="outlier z=${d.z}">outlier</span>`}</td>
    </tr>`).join('');

  el.innerHTML = `<div style="background:#14161b;color:#e7eaf0;border:1px solid rgba(255,255,255,.12);border-radius:16px;max-width:760px;width:100%;max-height:92vh;overflow:auto;padding:22px;font-family:inherit;box-shadow:0 20px 60px rgba(0,0,0,.5)">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><b style="font-size:16px">📐 Calibración de $/ft²</b><button onclick="rmSqftClose()" style="background:none;border:none;color:#8b93a1;font-size:20px;cursor:pointer">✕</button></div>
    <div style="font-size:12px;color:#8b93a1;margin-bottom:14px">Costo por pie cuadrado real de obras ${rmSqftState.incluyeEnObra ? 'terminadas + en obra' : 'terminadas'}, con margen de error. Recalcular guarda un corte para ver la tendencia.</div>

    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px">
      <div style="background:#1c1f26;border-radius:10px;padding:12px"><div style="font-size:10px;color:#8b93a1;text-transform:uppercase">$/ft² real (pond.)</div><div style="font-size:22px;font-weight:800">${psf(s.psfWeighted)}</div><div style="font-size:10px;color:#8b93a1">simple ${psf(s.psfSimple)}</div></div>
      <div style="background:#1c1f26;border-radius:10px;padding:12px"><div style="font-size:10px;color:#8b93a1;text-transform:uppercase">Margen de error (CV)</div><div style="font-size:22px;font-weight:800;color:${(s.cv || 0) > 20 ? '#f87171' : (s.cv || 0) > 10 ? '#fbbf24' : '#4ade9e'}">±${s.cv != null ? s.cv.toFixed(0) : '—'}%</div><div style="font-size:10px;color:#8b93a1">σ ${psf(s.std)}</div></div>
      <div style="background:#1c1f26;border-radius:10px;padding:12px"><div style="font-size:10px;color:#8b93a1;text-transform:uppercase">Viviendas (n)</div><div style="font-size:22px;font-weight:800">${s.n || 0}</div><div style="font-size:10px;color:#8b93a1">${s.outliers && s.outliers.length ? s.outliers.length + ' outlier(s) excl.' : 'sin outliers'}</div></div>
      <div style="background:#1c1f26;border-radius:10px;padding:12px"><div style="font-size:10px;color:#8b93a1;text-transform:uppercase">$/ft² estimado</div><div style="font-size:22px;font-weight:800">${psf(s.psfEst)}</div><div style="font-size:10px;color:#8b93a1">desv ${s.desvCostoPct != null ? (s.desvCostoPct > 0 ? '+' : '') + s.desvCostoPct.toFixed(0) + '%' : '—'}</div></div>
    </div>

    <label style="font-size:12px;color:#8b93a1;display:inline-flex;align-items:center;gap:6px;margin-bottom:12px;cursor:pointer"><input type="checkbox" ${rmSqftState.incluyeEnObra ? 'checked' : ''} onchange="rmSqftToggleEnObra(this.checked)"/> incluir obras en curso</label>

    ${rmSqftState.history && rmSqftState.history.length ? `<div style="font-size:11px;color:#8b93a1;text-transform:uppercase;letter-spacing:.4px;margin:6px 0 4px">Tendencia del margen de error</div><div style="position:relative;height:150px;background:#1c1f26;border-radius:10px;padding:8px"><canvas id="rmsq-trend"></canvas></div>` : '<div style="font-size:11px;color:#8b93a1;margin-bottom:8px">Aún no hay histórico. Al recalcular se guarda el primer corte y aparecerá la tendencia.</div>'}

    <div style="font-size:11px;color:#8b93a1;text-transform:uppercase;letter-spacing:.4px;margin:14px 0 4px">Por vivienda (${s.nTotal || 0})</div>
    <div style="max-height:220px;overflow:auto;border:1px solid rgba(255,255,255,.1);border-radius:8px">
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead><tr style="background:#1c1f26;color:#8b93a1;position:sticky;top:0"><th style="padding:6px 8px;text-align:left">Casa</th><th style="padding:6px 8px;text-align:right">ft²</th><th style="padding:6px 8px;text-align:right">Costo real</th><th style="padding:6px 8px;text-align:right">$/ft²</th><th style="padding:6px 8px;text-align:center">Incl.</th></tr></thead>
        <tbody>${detRows || '<tr><td colspan="5" style="padding:14px;color:#8b93a1;text-align:center">Sin obras terminadas con ft² y costo.</td></tr>'}</tbody>
      </table>
    </div>

    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
      <button onclick="rmSqftClose()" style="padding:9px 16px;border-radius:8px;background:#1c1f26;border:1px solid rgba(255,255,255,.14);color:#e7eaf0;cursor:pointer;font-size:13px">Cerrar</button>
      <button id="rmsq-recalc" onclick="rmSqftRecalcular()" ${(s.n || 0) < 1 ? 'disabled' : ''} style="padding:9px 18px;border-radius:8px;background:#059669;border:none;color:#fff;cursor:pointer;font-size:13px;font-weight:700;${(s.n || 0) < 1 ? 'opacity:.5' : ''}">↻ Recalcular y guardar corte</button>
    </div>
  </div>`;
  setTimeout(rmSqftMountTrend, 40);
}

function rmSqftMountTrend() {
  if (!window.Chart) return;
  const el = document.getElementById('rmsq-trend'); if (!el) return;
  try { const ex = Chart.getChart && Chart.getChart(el); if (ex) ex.destroy(); } catch (e) { }
  const h = rmSqftState.history || [];
  const labels = h.map(x => { try { return new Date(x.run_at).toLocaleDateString('es', { day: '2-digit', month: 'short' }); } catch (e) { return ''; } });
  new Chart(el, {
    type: 'line',
    data: { labels, datasets: [{ label: 'CV %', data: h.map(x => +x.cv_pct), borderColor: '#fbbf24', backgroundColor: 'rgba(251,191,36,.12)', borderWidth: 2, tension: .3, pointRadius: 3, fill: true }] },
    options: { maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => 'CV ' + c.parsed.y.toFixed(1) + '% · n=' + (h[c.dataIndex] ? h[c.dataIndex].n : '?') } } }, scales: { x: { grid: { display: false }, ticks: { color: '#8b93a1', font: { size: 9 } } }, y: { grid: { color: 'rgba(120,130,150,.1)' }, ticks: { color: '#8b93a1', font: { size: 9 }, callback: v => v + '%' } } } }
  });
}

function rmSqftToggleEnObra(v) { rmSqftState.incluyeEnObra = !!v; rmSqftOpenPanel(); }
function rmSqftClose() { const el = document.getElementById('rmsq-modal'); if (el) el.remove(); }

async function rmSqftRecalcular() {
  const s = rmSqftState.stats; if (!s || !s.n) return;
  const prev = (rmSqftState.history || []).slice(-1)[0] || null;
  const antes = prev ? `$${(+prev.psf_real_weighted).toFixed(0)}/ft² ±${(+prev.cv_pct).toFixed(0)}% (n=${prev.n})` : '— (primer corte)';
  const despues = `$${(s.psfWeighted || 0).toFixed(0)}/ft² ±${(s.cv || 0).toFixed(0)}% (n=${s.n})`;
  const ok = await confirmDialog(
    `Guardar corte de calibración de $/ft².<br><br><b>Antes:</b> ${antes}<br><b>Ahora:</b> ${despues}<br><br>Se registra en el histórico (auditable) y actualiza la referencia del Estimador.`,
    { title: 'Recalcular $/ft²', confirmText: 'Recalcular y guardar', cancelText: 'Cancelar' }
  );
  if (!ok) return;
  const btn = document.getElementById('rmsq-recalc');
  const run = async () => {
    const snap = {
      n: s.n, n_total: s.nTotal,
      psf_real_weighted: s.psfWeighted != null ? +s.psfWeighted.toFixed(2) : null,
      psf_real_simple: s.psfSimple != null ? +s.psfSimple.toFixed(2) : null,
      psf_est: s.psfEst != null ? +s.psfEst.toFixed(2) : null,
      std: s.std != null ? +s.std.toFixed(2) : null,
      cv_pct: s.cv != null ? +s.cv.toFixed(2) : null,
      desv_costo_pct: s.desvCostoPct != null ? +s.desvCostoPct.toFixed(2) : null,
      sesgo: s.sesgo != null ? +s.sesgo.toFixed(2) : null,
      n_outliers: (s.outliers || []).length, outliers: s.outliers || [],
      detalle: s.detalle || [],
      incluye_en_obra: !!rmSqftState.incluyeEnObra, ponderacion: rmSqftState.ponderada ? 'sqft' : 'simple', fuente_costo: 'total_real', source: 'recalc_manual'
    };
    const ins = (typeof safeInsert === 'function') ? await safeInsert(() => sb.from('remodel_cost_calibracion'), snap, { select: false }) : await sb.from('remodel_cost_calibracion').insert(snap);
    if (ins.error) { if (window.toast) toast('No se pudo guardar el corte: ' + ins.error.message, 'error'); return; }
    // Actualiza los escalares que consulta el Estimador/Pronosticador como referencia.
    const params = [
      { key: 'total_psf_real', value: s.psfWeighted != null ? +s.psfWeighted.toFixed(2) : null, label: '$/ft² real ponderado (calibración C.3)' },
      { key: 'total_psf_cv_pct', value: s.cv != null ? +s.cv.toFixed(2) : null, label: 'Margen de error del $/ft² (CV %)' },
      { key: 'total_psf_n', value: s.n, label: 'Viviendas en la calibración de $/ft²' }
    ].filter(p => p.value != null);
    try { await sb.from('remodel_forecast_params').upsert(params, { onConflict: 'key' }); } catch (e) { }
    window.RM_SQFT_CALIB = { psf_real: s.psfWeighted, cv_pct: s.cv, n: s.n, run_at: new Date().toISOString() };
    if (window.toast) toast('Calibración de $/ft² recalculada y guardada', 'success');
    await rmSqftLoadData(); rmSqftRenderPanel();
  };
  if (typeof withLoading === 'function' && btn) await withLoading(btn, run); else await run();
}

if (typeof window !== 'undefined') {
  window.rmSqftOpenPanel = rmSqftOpenPanel;
  window.rmSqftClose = rmSqftClose;
  window.rmSqftRecalcular = rmSqftRecalcular;
  window.rmSqftToggleEnObra = rmSqftToggleEnObra;
  window.rmSqftBadgeHtml = rmSqftBadgeHtml;
  // Carga diferida del badge (después de que sb esté listo).
  setTimeout(function () { try { rmSqftLoadLatest(); } catch (e) { } }, 2500);
}
