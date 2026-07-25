// ════════════════════════════════════════════════════════════════
// 📣 DASHBOARD DE COBRANZA (Cobros Fase 1) — sobre la definición CORREGIDA de cartera.
// Cuatro números SEPARADOS (jamás sumados como "vencido"): DEUDA VENCIDA (mora real,
// neteada) · POR COBRAR DEL MES (no es mora) · SALDO A FAVOR · TOTAL POR COBRAR.
// Historial por inquilino: pagos mes a mes + recordatorios enviados con ESTADO DE
// ENTREGA del proveedor + config TCPA editable (consentimiento con fecha/origen).
// El motor corre en SANDBOX; el checklist de encendido muestra qué falta para live.
// Ruta /cobros (guard rentas/operacion). Fuentes: v_cobros_estado + cartera_informe +
// cobros_recordatorios + pm_payments (billing_ym) — todo con linaje en /mapa.
// ════════════════════════════════════════════════════════════════
/* global sb, OS, osRender, OS_E, OS_M, osLinI, reportOpen */

const CB = { est: null, recs: {}, det: {}, mesPag: null, cfg: {}, loading: false, err: null, q: '', fCasa: 'todos', fEstado: 'todos', open: {}, dry: null, dryLoading: false };
window.CB = CB;
const cbM = v => (v == null || isNaN(+v)) ? '—' : '$' + Math.abs(+v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const cbYm = () => new Date().toISOString().slice(0, 7);

async function cbLoad(force) {
  if (CB.loading || (CB.est && !force)) return;
  CB.loading = true; CB.err = null;
  try {
    const ym = cbYm();
    const desde6 = (() => { const d = new Date(); d.setMonth(d.getMonth() - 6); return d.toISOString().slice(0, 7); })();
    const [est, recs, pag, cfg, det] = await Promise.all([
      sb.from('v_cobros_estado').select('*'),
      sb.from('cobros_recordatorios').select('*').eq('active', true).order('created_at', { ascending: false }).limit(600),
      sb.from('pm_payments').select('renta_pactada,amount,status,billing_ym').eq('active', true).eq('billing_ym', ym),
      sb.from('cobros_config').select('*'),
      sb.rpc('cartera_informe', { p_mes: ym, p_desde: desde6 }),
    ]);
    if (est.error) throw est.error;
    CB.est = est.data || [];
    CB.recs = {}; (recs.data || []).forEach(r => { (CB.recs[r.tenant_id] = CB.recs[r.tenant_id] || []).push(r); });
    CB.mesPag = pag.data || [];
    CB.cfg = {}; (cfg.data || []).forEach(c => CB.cfg[c.key] = c.value);
    CB.det = {}; (det.data || []).forEach(r => CB.det[r.tenant_id] = r.detalle || []);
  } catch (e) { CB.err = e.message || String(e); }
  CB.loading = false;
  osRender();
}
window.cbLoad = cbLoad;
function cbSet(k, v) { CB[k] = v; osRender(); if (k === 'q') { const el = document.getElementById('cb-q'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } } }
window.cbSet = cbSet;
function cbToggle(id) { CB.open[id] = !CB.open[id]; osRender(); }
window.cbToggle = cbToggle;

// config TCPA/operativa del inquilino — editable acá; el consentimiento queda con fecha+origen
async function cbSaveCfg(tid) {
  const g = k => { const el = document.getElementById('cb-c-' + k); return el ? (el.type === 'checkbox' ? el.checked : el.value.trim()) : null; };
  const consent = g('consent');
  const upd = {
    idioma: g('idioma') || 'es', telefono_sms: g('tel') || null, email: g('email') || null,
    dia_exacto_pago: parseInt(g('dia')) || null, payment_link: g('link') || null,
    consentimiento_sms: !!consent,
  };
  const row = CB.est.find(x => x.tenant_id === tid);
  if (consent && row && !row.consentimiento_sms) { upd.consentimiento_sms_fecha = new Date().toISOString(); upd.consentimiento_sms_origen = g('origen') || 'dashboard'; }
  if (!consent) { upd.consentimiento_sms_fecha = null; upd.consentimiento_sms_origen = null; }
  const { error } = await sb.from('pm_tenants').update(upd).eq('id', tid);
  if (error) return alert('Error: ' + error.message);
  if (window.toast) toast('✓ Config del inquilino guardada', 'success');
  await cbLoad(true);
}
window.cbSaveCfg = cbSaveCfg;

// dry-run del motor con el JWT del usuario (admin) — muestra qué haría HOY sin escribir nada
async function cbDryRun() {
  CB.dryLoading = true; osRender();
  try {
    const { data: { session } } = await sb.auth.getSession();
    const res = await fetch(window.SUPABASE_URL + '/functions/v1/cobros-motor', {
      method: 'POST', headers: { 'content-type': 'application/json', Authorization: 'Bearer ' + (session ? session.access_token : '') },
      body: JSON.stringify({ dry_run: true }),
    });
    CB.dry = await res.json();
    if (!res.ok) CB.dry = { error: (CB.dry && CB.dry.error) || res.status };
  } catch (e) { CB.dry = { error: e.message }; }
  CB.dryLoading = false; osRender();
}
window.cbDryRun = cbDryRun;

function cbCSV() {
  const head = ['inquilino', 'casa', 'vencido_neto', 'por_cobrar_mes', 'a_favor', 'total', 'aging', 'estado', 'consentimiento_sms', 'telefono', 'email', 'payment_link'];
  const csv = [head.join(',')].concat(cbRows().map(r => [r.inquilino, r.casa, r.vencido_neto, r.por_cobrar_neto, r.a_favor, (+r.vencido_neto || 0) + (+r.por_cobrar_neto || 0), r.aging || '', r.estado_cobro, r.consentimiento_sms, r.telefono || '', r.email || '', r.payment_link || ''].map(x => '"' + String(x ?? '').replace(/"/g, '""') + '"').join(','))).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'cobranza_' + cbYm() + '.csv'; a.click();
}
window.cbCSV = cbCSV;
function cbPDF() {
  const t = cbTotales();
  reportOpen({
    titulo: 'Dashboard de Cobranza · ' + cbYm(),
    subtitulo: 'Definición corregida: mora real neteada por inquilino — el mes en curso NO es mora',
    empresa: 'RENTAS · COBROS', fuentes: 'v_cobros_estado (espejo Airtable) + cobros_recordatorios',
    badge: { txt: 'MORA REAL ' + cbM(t.vencido), estado: t.vencido > 10000 ? 'neg' : 'warn' },
    secciones: [
      { t: 'kpis', items: [
        { lab: 'Deuda VENCIDA (neta)', val: cbM(t.vencido), sub: 'meses cerrados — mora real', estado: 'neg' },
        { lab: 'Por cobrar del MES', val: cbM(t.mes), sub: 'NO es mora', estado: 'warn' },
        { lab: 'Saldo A FAVOR', val: cbM(t.favor), sub: 'adelantos ya neteados', estado: 'ok' },
        { lab: '% cobranza del mes', val: t.pctCobranza != null ? Math.round(t.pctCobranza * 100) + '%' : null, sub: 'cobrado ' + cbM(t.cobrado) + ' de ' + cbM(t.pactado), estado: 'ok' },
      ] },
      { t: 'tabla', titulo: 'Por inquilino (neteado)', cols: ['Inquilino', 'Casa', 'Vencido', 'Mes', 'A favor', 'Aging'],
        rows: cbRows().filter(r => +r.vencido_neto > 0 || +r.por_cobrar_neto > 0).map(r => [OS_E(r.inquilino), OS_E(String(r.casa || '').split(',')[0]), +r.vencido_neto > 0 ? cbM(r.vencido_neto) : '—', +r.por_cobrar_neto > 0 ? cbM(r.por_cobrar_neto) : '—', +r.a_favor > 0 ? cbM(r.a_favor) : '—', r.aging || '—']) },
    ],
    conclusion: 'Mora real: <b>' + cbM(t.vencido) + '</b> en ' + t.morosos + ' inquilinos. Recordatorios en modo <b>' + (CB.cfg.modo || 'sandbox') + '</b>' + (CB.cfg.modo !== 'live' ? ' (sin envíos reales)' : '') + '.',
  });
}
window.cbPDF = cbPDF;

function cbRows() {
  const q = CB.q.toLowerCase();
  return (CB.est || []).filter(r =>
    (CB.fCasa === 'todos' || r.casa === CB.fCasa)
    && (CB.fEstado === 'todos' || r.estado_cobro === CB.fEstado)
    && (!q || ((r.inquilino || '') + ' ' + (r.casa || '')).toLowerCase().includes(q)))
    .sort((a, b) => ((+b.vencido_neto || 0) + (+b.por_cobrar_neto || 0)) - ((+a.vencido_neto || 0) + (+a.por_cobrar_neto || 0)));
}
function cbTotales() {
  const es = CB.est || [];
  const s = k => es.reduce((a, r) => a + (+r[k] || 0), 0);
  const pact = (CB.mesPag || []).reduce((a, p) => a + (+p.renta_pactada || 0), 0);
  const cobr = (CB.mesPag || []).filter(p => p.status === 'pagado').reduce((a, p) => a + (+p.amount || 0), 0);
  return { vencido: s('vencido_neto'), mes: s('por_cobrar_neto'), favor: s('a_favor'), total: s('vencido_neto') + s('por_cobrar_neto'),
    pactado: pact, cobrado: cobr, pctCobranza: pact > 0 ? Math.min(1, cobr / pact) : null,
    morosos: es.filter(r => +r.vencido_neto > 0).length };
}

function osCobrosView() {
  if (!CB.est && !CB.err) { cbLoad(); return '<div class="empty">' + osIcon('loader') + ' Calculando la cobranza…</div>'; }
  if (CB.err) return '<div class="empty down">' + OS_E(CB.err) + ' <button class="cbtn" onclick="cbLoad(true)">Reintentar</button></div>';
  const t = cbTotales();
  const rows = cbRows();
  const LIN = d => (window.osLinI ? ' ' + osLinI('Rentas', 'Cobros', d) : '');
  const activos = (CB.est || []).filter(r => r.estado_contrato === 'activo' && ((+r.vencido_neto || 0) + (+r.por_cobrar_neto || 0)) > 0);
  const sinConsent = activos.filter(r => !r.consentimiento_sms).length;
  const sinTel = activos.filter(r => !r.telefono).length;
  const sinEmail = activos.filter(r => !r.email).length;
  const sinLink = CB.cfg.link_pago_default ? 0 : activos.filter(r => !r.payment_link).length;
  const modo = CB.cfg.modo || 'sandbox';
  const kpi = (lab, val, meta, cls) => '<div class="card"><div class="lab">' + lab + '</div><div class="big ' + (cls || '') + '">' + val + '</div><div class="meta">' + meta + '</div></div>';
  const aging = { '0-30': 0, '30-60': 0, '60+': 0 };
  (CB.est || []).forEach(r => { if (r.aging && +r.vencido_neto > 0) aging[r.aging] += +r.vencido_neto; });
  const casas = [...new Set((CB.est || []).map(r => r.casa).filter(Boolean))].sort();

  // dry-run panel
  const dry = CB.dry ? (CB.dry.error
    ? '<div class="card" style="margin-top:10px;border-color:var(--neg)"><div class="meta">Dry-run: ' + OS_E(CB.dry.error) + '</div></div>'
    : '<div class="card" style="margin-top:10px;border-color:var(--a2)"><div class="chart-h"><div class="t">' + osIcon('play') + ' Dry-run del motor · hoy ' + OS_E(CB.dry.fecha) + ' · modo ' + OS_E(CB.dry.modo) + '</div><div class="k"><button class="ibtn" onclick="CB.dry=null;osRender()">✕</button></div></div>'
      + '<div class="meta">' + (CB.dry.decisiones || []).length + ' mensajes candidatos hoy · ' + OS_E(JSON.stringify(CB.dry.resumen || {})) + ' — NADA se envió (dry-run)</div>'
      + ((CB.dry.decisiones || []).slice(0, 8).map(d => '<div class="kv"><span>' + OS_E(d.inquilino) + ' · ' + OS_E(d.tipo) + ' · ' + OS_E(d.canal.toUpperCase()) + '</span><b><span class="src' + (/skip/.test(d.estado) ? ' sup' : '') + '">' + OS_E(d.estado) + (d.motivo ? ' · ' + OS_E(d.motivo) : '') + '</span></b></div>').join(''))
      + '</div>') : '';

  return '<h1>' + osIcon('megaphone') + ' Cobranza <span>· Rentas</span></h1>'
    + '<div class="sub">Cuatro números SEPARADOS con neteo por inquilino — el mes en curso jamás se suma como mora. Motor de recordatorios en modo <b>' + OS_E(modo) + '</b>' + (modo !== 'live' ? ' (registra sin enviar — A2P 10DLC en trámite)' : '') + '.</div>'
    + '<div class="card" style="margin:10px 0;border-color:' + (modo === 'live' ? 'var(--pos)' : 'var(--amber)') + '"><div class="chart-h"><div class="t">' + osIcon('link') + ' Checklist de encendido</div><div class="k"><button class="ibtn" ' + (CB.dryLoading ? 'disabled' : '') + ' onclick="cbDryRun()">' + (CB.dryLoading ? '…' : 'Dry-run del motor (no envía)') + '</button></div></div>'
    + '<div class="grid k4">'
    + kpi('Sin consentimiento SMS', sinConsent, 'TCPA: sin esto NO se textea — cargarlo abajo con fecha y origen', sinConsent ? 'warn' : 'up')
    + kpi('Sin teléfono', sinTel, 'de los activos con pendiente', sinTel ? 'warn' : 'up')
    + kpi('Sin email', sinEmail, 'canal de respaldo', sinEmail ? 'warn' : 'up')
    + kpi('Sin link de pago', sinLink, 'QBO payment link por inquilino (o link_pago_default en config)', sinLink ? 'warn' : 'up')
    + '</div><div class="meta" style="margin-top:6px">Para live faltan además: secrets TWILIO_*/RESEND_API_KEY en Supabase · A2P 10DLC aprobado · cobros_config.modo = live · cron diario. Nada de eso se activa desde acá.</div></div>'
    + dry
    + '<div class="grid k4" style="margin-top:12px">'
    + kpi('DEUDA VENCIDA (neta)' + LIN('Deuda vencida neta'), cbM(t.vencido), t.morosos + ' morosos reales · meses cerrados, neteado por inquilino', t.vencido > 0 ? 'down' : 'up')
    + kpi('POR COBRAR DEL MES' + LIN('Por cobrar del mes'), cbM(t.mes), 'mes en curso neteado — <b>NO es mora</b>', 'warn')
    + kpi('SALDO A FAVOR' + LIN('Saldo a favor'), cbM(t.favor), 'adelantos — ya aplicados en el neteo', 'up')
    + kpi('TOTAL POR COBRAR' + LIN('Total por cobrar'), cbM(t.total), 'vencido neto + mes en curso neto', '')
    + '</div>'
    + '<div class="grid k4" style="margin-top:12px">'
    + kpi('% cobranza del mes' + LIN('% cobranza del mes'), t.pctCobranza != null ? Math.round(t.pctCobranza * 100) + '%' : '—', 'cobrado ' + cbM(t.cobrado) + ' de ' + cbM(t.pactado) + ' pactado (' + cbYm() + ')', t.pctCobranza >= 0.9 ? 'up' : 'warn')
    + kpi('Aging 0-30', cbM(aging['0-30']), 'vencido neto ≤30 días', aging['0-30'] ? 'warn' : 'up')
    + kpi('Aging 30-60', cbM(aging['30-60']), '', aging['30-60'] ? 'warn' : 'up')
    + kpi('Aging 60+', cbM(aging['60+']), 'prioridad de gestión', aging['60+'] ? 'down' : 'up')
    + '</div>'
    + '<div class="card overx" style="margin-top:14px"><div class="chart-h"><div class="t">Inquilinos · ' + rows.length + '</div><div class="k" style="display:flex;gap:6px;flex-wrap:wrap">'
    + '<input id="cb-q" class="ibtn" style="min-width:180px" placeholder="inquilino o casa…" value="' + OS_E(CB.q) + '" oninput="cbSet(\'q\', this.value)">'
    + '<select class="ibtn" onchange="cbSet(\'fCasa\', this.value)"><option value="todos">Todas las casas</option>' + casas.map(c => '<option value="' + OS_E(c) + '"' + (CB.fCasa === c ? ' selected' : '') + '>' + OS_E(String(c).split(',')[0]) + '</option>').join('') + '</select>'
    + '<select class="ibtn" onchange="cbSet(\'fEstado\', this.value)">' + [['todos', 'Todos'], ['vencido', 'Vencidos'], ['mes_en_curso', 'Mes en curso'], ['current', 'Current']].map(o => '<option value="' + o[0] + '"' + (CB.fEstado === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select>'
    + '<button class="ibtn" onclick="cbCSV()">⬇ CSV</button><button class="ibtn" onclick="cbPDF()">' + osIcon('printer') + ' PDF</button></div></div>'
    + '<table><thead><tr><th>Inquilino</th><th>Casa</th><th style="text-align:right;padding-left:14px">Vencido</th><th style="text-align:right;padding-left:14px">Mes</th><th style="text-align:right;padding-left:14px">A favor</th><th style="padding-left:14px">Aging</th><th>Último recordatorio</th><th>Config</th></tr></thead><tbody>'
    + rows.map(r => {
      const open = CB.open[r.tenant_id];
      const recs = CB.recs[r.tenant_id] || [];
      const ult = recs.find(x => !/skip|entrante/.test(x.estado));
      const cfgChips = (r.consentimiento_sms ? '<span class="src" title="consentimiento SMS registrado">SMS✓</span>' : '<span class="src sup" title="TCPA: sin consentimiento — no se textea">SMS✗</span>')
        + (r.opt_out ? ' <span class="src sup" style="color:var(--neg)">STOP</span>' : '')
        + (r.payment_link ? ' <span class="src">link✓</span>' : ' <span class="src sup">sin link</span>');
      return '<tr onclick="cbToggle(\'' + r.tenant_id + '\')" style="cursor:pointer">'
        + '<td>' + (open ? '▾ ' : '▸ ') + OS_E(r.inquilino || '—') + '</td><td>' + OS_E(String(r.casa || '—').split(',')[0]) + '</td>'
        + '<td style="text-align:right" class="' + (+r.vencido_neto > 0 ? 'down' : '') + '">' + (+r.vencido_neto > 0 ? cbM(r.vencido_neto) : '—') + '</td>'
        + '<td style="text-align:right">' + (+r.por_cobrar_neto > 0 ? cbM(r.por_cobrar_neto) : '—') + '</td>'
        + '<td style="text-align:right" class="up">' + (+r.a_favor > 0 ? cbM(r.a_favor) : '—') + '</td>'
        + '<td>' + (r.aging ? '<span style="color:' + (r.aging === '60+' ? 'var(--neg)' : r.aging === '30-60' ? 'var(--amber)' : 'var(--pos)') + ';font-weight:700">' + r.aging + '</span>' : '—') + '</td>'
        + '<td class="meta" style="font-size:10.5px">' + (ult ? OS_E(String(ult.created_at).slice(0, 10)) + ' · ' + OS_E(ult.tipo) + ' · ' + OS_E(ult.canal) + ' · <b>' + OS_E(ult.provider_status || ult.estado) + '</b>' : 'ninguno') + '</td>'
        + '<td style="font-size:10px;white-space:nowrap">' + cfgChips + '</td></tr>'
        + (open ? '<tr><td colspan="8" style="background:var(--glass);padding:12px 16px">' + cbDetalle(r, recs) + '</td></tr>' : '');
    }).join('')
    + '</tbody></table></div>'
    + '<div class="meta" style="margin-top:12px">Neteo por inquilino (el a favor cubre vencido → mes en curso). Los recordatorios los decide el motor diario SOLO sobre deuda vencida neteada (+ aviso amistoso el día de pago); un pago registrado los frena solo en la próxima corrida. Fase 2 (late fees §92.019, notices §24.005) espera confirmación del abogado.</div>';
}
window.osCobrosView = osCobrosView;

// timeline + config editable del inquilino
function cbDetalle(r, recs) {
  const det = CB.det[r.tenant_id] || [];
  const tl = []
    .concat(det.map(d => ({ f: d.mes + '-01', txt: osIcon('banknote') + d.mes + ': pactado ' + cbM(d.pactada) + ' · pagado ' + cbM(d.pagado) + ' · deuda <b class="' + (+d.deuda > 0 ? 'down' : +d.deuda < 0 ? 'up' : '') + '">' + cbM(d.deuda) + '</b>' })))
    .concat(recs.map(x => ({ f: String(x.created_at).slice(0, 10), txt: osIcon('mail') + String(x.created_at).slice(0, 10) + ' · ' + OS_E(x.tipo) + ' · ' + OS_E(x.canal) + ' → <b>' + OS_E(x.provider_status || x.estado) + '</b>' + (x.destinatario ? ' <span class="meta">(' + OS_E(x.destinatario) + ')</span>' : '') })))
    .sort((a, b) => String(b.f).localeCompare(String(a.f)));
  return '<div class="grid k2" style="align-items:start">'
    + '<div><div class="lab" style="margin-bottom:6px">Línea de tiempo (pagos + recordatorios con entrega)</div>'
    + (tl.length ? tl.slice(0, 14).map(x => '<div style="font-size:11.5px;padding:3px 0;border-bottom:1px dashed var(--glassb)">' + x.txt + '</div>').join('') : '<div class="meta">Sin historial en la ventana de 6 meses.</div>')
    + '</div>'
    + '<div><div class="lab" style="margin-bottom:6px">Config del inquilino (TCPA + operativa)</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px" onclick="event.stopPropagation()">'
    + '<label style="display:flex;gap:6px;align-items:center;font-size:12px;grid-column:span 2"><input type="checkbox" id="cb-c-consent" ' + (r.consentimiento_sms ? 'checked' : '') + '> Consentimiento SMS (TCPA) — queda con fecha y origen</label>'
    + '<input id="cb-c-origen" class="ibtn" placeholder="origen (lease / formulario)" value="">'
    + '<select id="cb-c-idioma" class="ibtn"><option value="es"' + (r.idioma === 'es' ? ' selected' : '') + '>Español</option><option value="en"' + (r.idioma === 'en' ? ' selected' : '') + '>English</option></select>'
    + '<input id="cb-c-tel" class="ibtn" placeholder="teléfono SMS" value="' + OS_E(r.telefono || '') + '">'
    + '<input id="cb-c-email" class="ibtn" placeholder="email" value="' + OS_E(r.email || '') + '">'
    + '<input id="cb-c-dia" class="ibtn" type="number" min="1" max="28" placeholder="día de pago" value="' + OS_E(r.dia_pago || '') + '">'
    + '<input id="cb-c-link" class="ibtn" placeholder="link de pago QBO" value="' + OS_E(r.payment_link || '') + '" style="grid-column:span 2">'
    + '<button class="cbtn" style="padding:7px 14px" onclick="cbSaveCfg(\'' + r.tenant_id + '\')">' + osIcon('save') + ' Guardar config</button>'
    + (r.opt_out ? '<div class="meta" style="color:var(--neg)">' + osIcon('ban') + ' STOP recibido el ' + OS_E(String(r.opt_out_fecha || '').slice(0, 10)) + ' — no se textea más a este número.</div>' : '')
    + '</div></div></div>';
}
