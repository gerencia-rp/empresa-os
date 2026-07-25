// ════════════════════════════════════════════════════════════════
// 📋 INFORME DE CARTERA (Rentas) — reemplaza el informe manual de Airtable.
// UNA definición, TRES números que antes se mezclaban (el manual sumaba todo como
// "vencido" y daba +195%):
//   · DEUDA VENCIDA   = meses ya cerrados sin pagar (mora real)
//   · POR COBRAR MES  = mes corriente aún no cobrado (NO es mora)
//   · SALDO A FAVOR   = pagos por adelantado (se netea POR INQUILINO: cubre primero
//     lo vencido y después el mes en curso — caso Xinquan $7,200 vs $3,600 → neto $0)
// Fuente: RPC cartera_informe(p_mes, p_desde) sobre pm_payments espejo
// (Renta pactada fldpUSJ1HdZQmQPMH · Deuda flduMsIV5gZRIv1eU). Validado al centavo
// contra el informe manual jun→jul: 9,860 + 42,137.50 = 51,997.50 · a favor 6,900.
// Export: 🖨 PDF (reportOpen) + ⬇ CSV. Ruta /cartera (guard rentas).
// ════════════════════════════════════════════════════════════════
/* global sb, OS, osRender, OS_E, osLinI, reportOpen */

const CA = { rows: null, prev: null, loading: false, err: null, mes: null, open: {} };   // desde: undefined = default mes-1 · null/'' = todo el historial
window.CA = CA;

const caYm = d => d.toISOString().slice(0, 7);
const caShift = (ym, n) => { const dt = new Date(+ym.slice(0, 4), +ym.slice(5, 7) - 1 + n, 1); return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0'); };
const caM = v => (v == null || isNaN(+v)) ? '—' : (+v < 0 ? '−$' : '$') + Math.abs(+v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

async function caLoad(force) {
  if (CA.loading || (CA.rows && !force)) return;
  CA.loading = true; CA.err = null;
  CA.mes = CA.mes || caYm(new Date());
  if (CA.desde === undefined) CA.desde = caShift(CA.mes, -1);   // solo el primer load; null/'' = todo el historial
  try {
    const [cur, prev] = await Promise.all([
      sb.rpc('cartera_informe', { p_mes: CA.mes, p_desde: CA.desde || null }),
      sb.rpc('cartera_informe', { p_mes: caShift(CA.mes, -1), p_desde: CA.desde ? caShift(CA.desde, -1) : null }),
    ]);
    if (cur.error) throw cur.error;
    CA.rows = cur.data || [];
    CA.prev = prev.data || [];
  } catch (e) { CA.err = e.message || String(e); }
  CA.loading = false;
  osRender();
}
window.caLoad = caLoad;
function caSet(k, v) { CA[k] = v; CA.rows = null; caLoad(true); osRender(); }
window.caSet = caSet;
function caToggle(id) { CA.open[id] = !CA.open[id]; osRender(); }
window.caToggle = caToggle;

function caTotals(rows) {
  const s = k => rows.reduce((a, r) => a + (+r[k] || 0), 0);
  return { vencido: s('vencido'), por_cobrar: s('por_cobrar'), a_favor: s('a_favor'), vencido_neto: s('vencido_neto'), por_cobrar_neto: s('por_cobrar_neto'), neto: s('neto_total'),
    casos: rows.filter(r => +r.vencido > 0 || +r.por_cobrar > 0).length };
}

function caCSV() {
  const head = ['inquilino', 'casa', 'vencido', 'por_cobrar_mes', 'saldo_a_favor', 'vencido_neto', 'por_cobrar_neto', 'neto_total', 'mes_mas_viejo', 'aging'];
  const csv = [head.join(',')].concat((CA.rows || []).map(r => head.map(h => '"' + String(r[h === 'por_cobrar_mes' ? 'por_cobrar' : h === 'saldo_a_favor' ? 'a_favor' : h] ?? '').replace(/"/g, '""') + '"').join(','))).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'cartera_' + CA.mes + '.csv'; a.click();
}
window.caCSV = caCSV;

function caPDF() {
  const t = caTotals(CA.rows || []);
  const badge = t.vencido_neto > 0 ? { txt: 'MORA REAL ' + caM(t.vencido_neto), estado: t.vencido_neto > 10000 ? 'neg' : 'warn' } : { txt: 'SIN MORA REAL', estado: 'ok' };
  reportOpen({
    titulo: 'Informe de Cartera · ' + CA.mes,
    subtitulo: 'Período ' + (CA.desde || 'histórico completo') + ' → ' + CA.mes + ' · neteado por inquilino · tres métricas separadas (la deuda vencida NO incluye el mes en curso)',
    empresa: 'RENTAS · COBRANZA', badge, fuentes: 'pm_payments espejo Airtable (Renta pactada + Deuda) · RPC cartera_informe',
    secciones: [
      { t: 'kpis', items: [
        { lab: 'Deuda VENCIDA (neta)', val: caM(t.vencido_neto), sub: 'bruta ' + caM(t.vencido) + ' · meses cerrados', estado: t.vencido_neto > 0 ? 'neg' : 'ok' },
        { lab: 'Por cobrar del MES', val: caM(t.por_cobrar), sub: 'mes en curso — NO es mora', estado: 'warn' },
        { lab: 'Saldo A FAVOR', val: caM(t.a_favor), sub: 'adelantos — netean por inquilino', estado: 'ok' },
        { lab: 'Pendiente NETO total', val: caM(t.neto), sub: t.casos + ' inquilinos con pendiente', estado: 'warn' },
      ] },
      { t: 'tabla', titulo: 'Anexo por inquilino (neteado)', cols: ['Inquilino', 'Casa', 'Vencido', 'Mes en curso', 'A favor', 'NETO', 'Aging'],
        rows: (CA.rows || []).filter(r => +r.neto_total > 0 || +r.a_favor > 0).map(r => [
          OS_E(r.inquilino || '—'), OS_E(r.casa || '—'),
          +r.vencido > 0 ? caM(r.vencido) : '—', +r.por_cobrar > 0 ? caM(r.por_cobrar) : '—',
          +r.a_favor > 0 ? '<span class="b-ok">' + caM(r.a_favor) + '</span>' : '—',
          '<b>' + caM(r.neto_total) + '</b>',
          r.aging ? '<span class="' + (r.aging === '60+' ? 'b-neg' : r.aging === '30-60' ? 'b-warn' : 'b-ok') + '">' + r.aging + '</span>' : '—',
        ]),
        nota: 'Neteo por inquilino: el saldo a favor cubre primero lo vencido y después el mes en curso. Aging por el mes impago más viejo.' },
    ],
    conclusion: 'Mora real (vencido neteado): <b>' + caM(t.vencido_neto) + '</b>. El mes en curso (' + caM(t.por_cobrar) + ') es cobranza normal, no mora — mezclarlos inflaba el informe manual. Saldos a favor por ' + caM(t.a_favor) + ' ya aplicados.',
  });
}
window.caPDF = caPDF;

function osCarteraView() {
  if (!CA.rows && !CA.err) { caLoad(); return '<div class="empty">' + osIcon('loader') + ' Calculando la cartera…</div>'; }
  if (CA.err) return '<div class="empty down">' + OS_E(CA.err) + ' <button class="cbtn" onclick="caLoad(true)">Reintentar</button></div>';
  const rows = CA.rows || [];
  const t = caTotals(rows);
  const tp = caTotals(CA.prev || []);
  const LIN = d => (window.osLinI ? ' ' + osLinI('Rentas', 'Informe de Cartera', d) : '');
  const varPct = tp.neto > 0 ? (t.neto - tp.neto) / tp.neto : null;
  const varBig = varPct != null && Math.abs(varPct) > 1;
  const aging = { '0-30': 0, '30-60': 0, '60+': 0 };
  rows.forEach(r => { if (r.aging && +r.vencido_neto > 0) aging[r.aging] += +r.vencido_neto; });
  const kpi = (lab, val, meta, cls) => '<div class="card"><div class="lab">' + lab + '</div><div class="big ' + (cls || '') + '">' + val + '</div><div class="meta">' + meta + '</div></div>';
  const agB = a => a === '60+' ? 'style="color:var(--neg);font-weight:700"' : a === '30-60' ? 'style="color:var(--amber);font-weight:700"' : 'style="color:var(--pos);font-weight:700"';
  return '<h1>' + osIcon('clipboard') + ' Informe de Cartera <span>· Rentas</span></h1>'
    + '<div class="sub">UNA definición, tres números separados — la deuda vencida NO incluye el mes en curso (el informe manual los mezclaba y daba +195%). Neteado por inquilino. Fuente: espejo Airtable (Renta pactada + Deuda), validado al centavo.</div>'
    + '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:10px 0 14px">'
    + '<span class="meta">Mes del informe</span><input type="month" class="ibtn" value="' + OS_E(CA.mes) + '" onchange="caSet(\'mes\', this.value)">'
    + '<span class="meta">vencidos desde</span><select class="ibtn" onchange="caSet(\'desde\', this.value || null)">'
    + [[caShift(CA.mes, -1), 'mes anterior (como el informe manual)'], [caShift(CA.mes, -3), '3 meses'], [caShift(CA.mes, -6), '6 meses'], ['', 'todo el historial']]
      .map(o => '<option value="' + o[0] + '"' + ((CA.desde || '') === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select>'
    + '<span style="margin-left:auto;display:flex;gap:6px"><button class="ibtn" onclick="caCSV()">⬇ CSV</button><button class="cbtn" style="padding:8px 14px" onclick="caPDF()">' + osIcon('printer') + ' Informe PDF</button></span></div>'
    + '<div class="grid k4">'
    + kpi('Deuda VENCIDA (neta)' + LIN('Deuda vencida'), caM(t.vencido_neto), 'bruta ' + caM(t.vencido) + ' · meses cerrados sin pagar — la mora REAL', t.vencido_neto > 0 ? 'down' : 'up')
    + kpi('Por cobrar del MES' + LIN('Por cobrar del mes'), caM(t.por_cobrar), 'mes en curso aún no cobrado — <b>NO es mora</b>', 'warn')
    + kpi('Saldo A FAVOR' + LIN('Saldo a favor'), caM(t.a_favor), 'pagos por adelantado — netean por inquilino antes de clasificar', 'up')
    + kpi('Pendiente NETO' + LIN('Pendiente neto total'), caM(t.neto), t.casos + ' inquilinos · variación vs mes anterior: ' + (varPct == null ? 'sin base' : '<b style="color:' + (varBig ? 'var(--amber)' : 'var(--mut)') + '">' + (varPct >= 0 ? '+' : '') + Math.round(varPct * 100) + '%</b>' + (varBig ? ' verificar si es real o carga de registros nuevos' : '')), '')
    + '</div>'
    + '<div class="grid k3" style="margin-top:12px">'
    + kpi('Aging 0-30', caM(aging['0-30']), 'vencido neto con mora ≤ 30 días', aging['0-30'] > 0 ? 'warn' : 'up')
    + kpi('Aging 30-60', caM(aging['30-60']), 'entre 30 y 60 días', aging['30-60'] > 0 ? 'warn' : 'up')
    + kpi('Aging 60+', caM(aging['60+']), 'más de 60 días — prioridad de gestión', aging['60+'] > 0 ? 'down' : 'up')
    + '</div>'
    + '<div class="card overx" style="margin-top:14px"><div class="chart-h"><div class="t">Anexo por inquilino · ' + rows.length + '</div><div class="k">clic en la fila = detalle mes a mes · neteo aplicado</div></div>'
    + '<table><thead><tr><th>Inquilino</th><th>Casa</th><th style="text-align:right;padding-left:16px">Vencido</th><th style="text-align:right;padding-left:16px">Mes en curso</th><th style="text-align:right;padding-left:16px">A favor</th><th style="text-align:right;padding-left:16px">NETO</th><th style="padding-left:16px">Aging</th></tr></thead><tbody>'
    + rows.map((r, i) => {
      const open = CA.open[i];
      const neteado = +r.a_favor > 0 && (+r.vencido > 0 || +r.por_cobrar > 0);
      return '<tr onclick="caToggle(' + i + ')" style="cursor:pointer' + (+r.neto_total <= 0 && +r.a_favor > 0 ? ';opacity:.65' : '') + '">'
        + '<td>' + (open ? '▾ ' : '▸ ') + OS_E(r.inquilino || '—') + (neteado && +r.neto_total <= 0 ? ' <span class="src" style="font-size:8px">✓ cubierto por adelanto</span>' : '') + '</td>'
        + '<td>' + OS_E((r.casa || '—').split(',')[0]) + '</td>'
        + '<td style="text-align:right" class="' + (+r.vencido > 0 ? 'down' : '') + '">' + (+r.vencido > 0 ? caM(r.vencido) : '—') + '</td>'
        + '<td style="text-align:right">' + (+r.por_cobrar > 0 ? caM(r.por_cobrar) : '—') + '</td>'
        + '<td style="text-align:right" class="up">' + (+r.a_favor > 0 ? caM(r.a_favor) : '—') + '</td>'
        + '<td style="text-align:right"><b>' + caM(r.neto_total) + '</b></td>'
        + '<td>' + (r.aging ? '<span ' + agB(r.aging) + '>' + r.aging + '</span>' : '—') + '</td></tr>'
        + (open ? '<tr><td colspan="7" style="background:var(--glass);font-size:11px;padding:8px 14px">'
          + (r.detalle || []).map(d => OS_E(d.mes) + ': pactado ' + caM(d.pactada) + ' · pagado ' + caM(d.pagado) + ' · deuda <b class="' + (+d.deuda > 0 ? 'down' : +d.deuda < 0 ? 'up' : '') + '">' + caM(d.deuda) + '</b>').join('<br>')
          + '</td></tr>' : '');
    }).join('')
    + '</tbody></table></div>'
    + '<div class="meta" style="margin-top:12px">Neteo por inquilino: el saldo a favor cubre primero lo vencido y después el mes en curso (Xinquan: pagó doble en junio → su julio queda cubierto; Jackelin: adelantó $1,700 → debe $1,700, no $3,400). Aging por el mes impago más viejo. Los adelantos históricos sin renta pactada espejada no cuentan como saldo a favor (se declaran, no se inventan).</div>';
}
window.osCarteraView = osCarteraView;
