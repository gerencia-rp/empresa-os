// ════════════════════════════════════════════════════════════════
// 💎 PORTAL DEL INVERSIONISTA — página standalone (inversionista.html).
// Login por magic link → inv_claim_access() → lee SOLO tablas inv_* (RLS estricto:
// sus casas, nada más; jamás toca ff_*). El motor (inv-engine.js) corre en el browser
// con los parámetros de inv_model_params (cada uno con su fuente, visible en la UI).
// Norte de comunicación: retorno a LARGO PLAZO (TIR/VPN 31 años), no solo año-1.
// ════════════════════════════════════════════════════════════════

const sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
const IP = { holdings: [], params: {}, cashflow: {}, docs: {}, casa: null, charts: [], email: '', tab: 'props', myIds: [], dists: [], msgs: [], chat: [] };
window.IP = IP;

const $money = v => '$' + Math.round(+v || 0).toLocaleString('en-US');
const $pct = v => (v == null ? '—' : (v * 100).toFixed(1) + '%');
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const app = () => document.getElementById('app');

// ─── login (magic link — igual flujo que el portal anterior) ───
function loginView(msg, bad) {
  app().innerHTML = '<div class="login card">'
    + '<div class="logo" style="margin:0 auto 12px">FR</div>'
    + '<h1>Portal de <span>Inversionistas</span></h1>'
    + '<div class="sub">Flipping Rentals · acceso privado</div>'
    + '<input id="em" type="email" placeholder="tu@email.com" onkeydown="if(event.key===\'Enter\')ipSendLink()" />'
    + '<button class="cbtn" style="width:100%" onclick="ipSendLink()">Enviarme el link de acceso</button>'
    + (msg ? '<div class="meta" style="margin-top:10px;color:' + (bad ? 'var(--neg)' : 'var(--pos)') + '">' + esc(msg) + '</div>' : '')
    + '<div class="meta" style="margin-top:14px">Te llega un correo con un link que abre tu portal — sin contraseña. Solo funciona para inversionistas registrados.</div>'
    + '</div>';
}
async function ipSendLink() {
  const em = (document.getElementById('em').value || '').trim();
  if (!em) return loginView('Poné tu email', true);
  const { error } = await sb.auth.signInWithOtp({ email: em, options: { emailRedirectTo: location.origin + '/inversionista' } });
  if (error) return loginView('No se pudo enviar: ' + error.message, true);
  loginView('✓ Listo — revisá tu correo (puede tardar 1-2 min; mirá spam).');
}
window.ipSendLink = ipSendLink;
async function ipLogout() { await sb.auth.signOut(); loginView(); }
window.ipLogout = ipLogout;

// ─── carga (solo inv_*) ───
async function ipLoad() {
  try { await sb.rpc('inv_claim_access'); } catch (e) { /* claim opcional */ }
  const { data: hold, error } = await sb.from('inv_holdings').select('*').eq('active', true);
  if (error) { app().innerHTML = '<div class="empty">Error: ' + esc(error.message) + '</div>'; return; }
  IP.holdings = hold || [];
  if (!IP.holdings.length) {
    app().innerHTML = '<div class="login card"><h1>Sin inversiones <span>registradas</span></h1>'
      + '<div class="meta" style="margin-top:10px">Tu email (' + esc(IP.email) + ') no tiene casas vinculadas todavía. Si creés que es un error, escribinos.</div>'
      + '<button class="ibtn" style="margin-top:14px" onclick="ipLogout()">Salir</button></div>';
    return;
  }
  const props = [...new Set(IP.holdings.map(h => h.property_id))];
  const [prm, cf, dc, acc, dist, msg] = await Promise.all([
    sb.from('inv_model_params').select('*').in('property_id', props).eq('active', true),
    sb.from('inv_cashflow_real').select('*').in('property_id', props).eq('active', true).order('fecha'),
    sb.from('inv_documents').select('*').in('property_id', props).eq('active', true),
    sb.from('inv_access').select('investor_airtable_id').eq('active', true),
    sb.from('inv_distributions').select('*').eq('active', true),
    sb.from('inv_messages').select('*').eq('active', true),
  ]);
  IP.params = {}; (prm.data || []).forEach(r => { (IP.params[r.property_id] = IP.params[r.property_id] || {})[r.key] = r; });
  IP.cashflow = {}; (cf.data || []).forEach(r => { (IP.cashflow[r.property_id] = IP.cashflow[r.property_id] || []).push(r); });
  IP.docs = {}; (dc.data || []).forEach(r => { (IP.docs[r.property_id] = IP.docs[r.property_id] || []).push(r); });
  IP.myIds = [...new Set((acc.data || []).map(a => a.investor_airtable_id))];
  IP.dists = dist.data || []; IP.msgs = msg.data || [];
  IP.casa = IP.casa || props[0];
  render();
}

// ─── params → motor ───
function num(P, k, d) { const r = P[k]; const v = r ? parseFloat(r.value) : NaN; return isNaN(v) ? d : v; }
function ipEngineParams(pid) {
  const P = IP.params[pid] || {};
  const draws = {}, otros = {};
  Object.keys(P).forEach(k => {
    let m = k.match(/^draw_m(\d+)$/); if (m) draws[+m[1]] = parseFloat(P[k].value) || 0;
    m = k.match(/^otros_inv_m(\d+)$/); if (m) otros[+m[1]] = parseFloat(P[k].value) || 0;
  });
  const holding = IP.holdings.find(h => h.property_id === pid) || {};
  return {
    compra: num(P, 'compra', 0), cierreCompra: num(P, 'cierre_compra', 0),
    hmInicial: num(P, 'hm_inicial', 0), hmTasa: num(P, 'hm_tasa', 0),
    draws, otrosInversionMes: otros,
    refiMes: num(P, 'refi_mes', null), refiMonto: num(P, 'refi_monto', 0), refiTasa: num(P, 'refi_tasa', 0),
    refiPlazoM: num(P, 'refi_plazo_m', 360), cierreRefi: num(P, 'cierre_refi', 0),
    arv: num(P, 'arv', 0), valorizacion: num(P, 'valorizacion', 0), inflacion: num(P, 'inflacion', 0),
    retornoEsperado: num(P, 'retorno_esperado', 0.08),
    numHab: num(P, 'num_hab', 1), arriendoHab: num(P, 'arriendo_hab', 0),
    rampa: (P.rampa ? P.rampa.value.split(',').map(parseFloat) : []),
    ocupacionEstable: num(P, 'ocupacion_estable', 1), pisoServicios: num(P, 'piso_servicios', 0.1),
    mantenimientoMes: num(P, 'mantenimiento_mes', 0), serviciosMes: num(P, 'servicios_mes', 0), hoaMes: num(P, 'hoa_mes', 0),
    padsplitPct: num(P, 'padsplit_pct', 0), comisionPct: num(P, 'comision_pct', 0),
    impPropiedadPct: num(P, 'imp_propiedad_pct', 0), impRentaPct: num(P, 'imp_renta_pct', 0),
    seguroMes: num(P, 'seguro_mes', 0),
    cicloMeses: num(P, 'ciclo_meses', 12), anios: num(P, 'anios', 31),
    repartoInv: holding.reparto_pct != null ? +holding.reparto_pct : num(P, 'reparto_inv', 0.5),
    cashAtrapadoReal: num(P, 'cash_atrapado_real', null),
    // calibración Excel: perfil post-refi plano (TIR/VPN oficiales de la hoja)
    postRefiPerfil: P.postrefi_perfil ? P.postrefi_perfil.value : null,
    utilAnualPostRefi: num(P, 'util_anual_postrefi', null),
    anio0PostRefi: num(P, 'anio0_postrefi', null),
    inversionAportada: +holding.inversion_aportada || null,
  };
}
function srcChip(P, k) {
  const r = (P || {})[k]; if (!r) return '';
  const sup = !/^real|^excel|^modelo/.test(r.fuente || '');
  return '<span class="src' + (sup ? ' sup' : '') + '" title="' + esc(r.fuente) + (r.descripcion ? ' — ' + esc(r.descripcion) : '') + '">' + esc((r.fuente || '').split(':')[0]) + '</span>';
}

// ─── render ───
function render() {
  IP.charts.forEach(c => { try { c.destroy(); } catch (e) {} }); IP.charts = [];
  const pid = IP.casa;
  const P = IP.params[pid] || {};
  const holding = IP.holdings.find(h => h.property_id === pid) || {};
  const p = ipEngineParams(pid);
  // Escenario automático: con movimientos reales cargados corre REALIZADO (SUMIF por mes);
  // sin movimientos, PROYECTADO (premisas). Mismo motor, una definición.
  const movsCasa = IP.cashflow[pid] || [];
  const fechaC = (IP.params[pid] || {}).fecha_cierre ? IP.params[pid].fecha_cierre.value : null;
  const escenario = (movsCasa.length && fechaC) ? 'realizado' : 'proyectado';
  const pRun = escenario === 'realizado' ? invEngine.escenario(p, 'realizado', { movsPorMes: invEngine.movsPorMes(movsCasa, fechaC) }) : p;
  const r = window.invEngine.run(pRun);
  const i = r.indicadores;
  const inv = p.repartoInv;
  const dir = P.direccion ? P.direccion.value : 'Casa';
  const estado = P.estado_casa ? P.estado_casa.value.replace(/_/g, ' ') : '—';
  const cierre = P.fecha_cierre ? P.fecha_cierre.value : '—';
  const cf = IP.cashflow[pid] || [];
  const docs = IP.docs[pid] || [];
  // riqueza HOY: capital + equity amortizado a hoy×% + valorización a hoy×%
  const mesesDesde = cierre !== '—' ? Math.max(0, Math.floor((Date.now() - new Date(cierre).getTime()) / (30.44 * 86400000))) : 0;
  const mesesBanco = Math.max(0, mesesDesde - (p.refiMes || 0));
  const abonoHoy = r.banco.tabla.slice(0, mesesBanco).reduce((s, f) => s + f.abono, 0);
  const valHoy = p.arv * (Math.pow(1 + p.valorizacion, mesesDesde / 12) - 1);
  const riquezaHoy = (+holding.inversion_aportada || 0) + (abonoHoy + valHoy) * inv;
  const fundingHM = p.hmInicial + Object.values(p.draws).reduce((s, v) => s + v, 0);
  const fundingEq = p.compra + p.cierreCompra + Object.values(p.draws).reduce((s, v) => s + v, 0) + Object.values(p.otrosInversionMes).reduce((s, v) => s + v, 0) - fundingHM;

  const selector = IP.holdings.length > 1
    ? '<select class="ibtn" onchange="IP.casa=this.value;render()">' + IP.holdings.map(h => {
        const d = (IP.params[h.property_id] || {}).direccion; const nm = d ? d.value.split(',')[0] : h.property_id.slice(0, 8);
        return '<option value="' + h.property_id + '" ' + (h.property_id === pid ? 'selected' : '') + '>' + esc(nm) + '</option>';
      }).join('') + '</select>' : '';

  const kpi = (lab, val, meta, cls) => '<div class="card"><div class="lab">' + lab + '</div><div class="big ' + (cls || '') + '">' + val + '</div>' + (meta ? '<div class="meta">' + meta + '</div>' : '') + '</div>';
  const acumRows = (() => { let acc = 0; return r.meses.map(x => { acc += x.fclNegocio; return acc; }); })();

  const noLeidos = (IP.msgs || []).filter(m => !(m.read_by || []).includes(IP.email.toLowerCase())).length;
  const TABS = [['props', '🏠 Propiedades'], ['dist', '💸 Distribuciones'], ['msgs', '💬 Mensajes' + (noLeidos ? ' (' + noLeidos + ')' : '')], ['docs', '📄 Documentos'], ['ia', '🤖 Asistente']];
  const head = ''
    + '<div class="bar"><div class="logo">FR</div><div class="brandt"><b>Portal de Inversionistas</b><span>FLIPPING RENTALS</span></div>'
    + '<div class="barr">' + selector + '<span class="meta">' + esc(IP.email) + '</span><button class="ibtn" onclick="ipLogout()">Salir</button></div></div>'
    + '<h1>' + esc(dir.split(',')[0]) + ' <span>· tu inversión</span></h1>'
    + '<div class="sub">' + esc(dir) + ' · estado: <b>' + esc(estado) + '</b> · cierre: ' + esc(cierre) + ' · escenario: <b>' + (escenario === 'realizado' ? '✅ Realizado (' + movsCasa.length + ' movimientos reales) + proyección' : '🎯 Proyectado (premisas)') + '</b> · <span class="src">real</span> = dato real; <span class="src sup">supuesto</span> = premisa en calibración.</div>'
    + '<div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">' + TABS.map(t => '<button class="ibtn" style="' + (IP.tab === t[0] ? 'border-color:var(--a2);color:var(--ink)' : '') + '" onclick="IP.tab=\'' + t[0] + '\';render()">' + t[1] + '</button>').join('') + '</div>';

  let body = '';
  if (IP.tab === 'dist') body = renderDist(pid, inv);
  else if (IP.tab === 'msgs') body = renderMsgs(pid);
  else if (IP.tab === 'docs') body = renderDocs(docs);
  else if (IP.tab === 'ia') body = renderIA();
  else body = ''
    + '<div class="grid k4">'
    + kpi('Tu inversión', $money(holding.inversion_aportada), 'aportada el ' + esc(holding.fecha_entrada || cierre))
    + kpi('Tu participación', $pct(inv), 'de la utilidad y el patrimonio de esta casa')
    + kpi('Tu riqueza hoy', $money(riquezaHoy), 'capital + tu parte del equity amortizado (' + $money(abonoHoy * inv) + ') + valorización (' + $money(valHoy * inv) + ')', 'up')
    + kpi('Funding mix', $money(fundingHM) + ' HM', '+ ' + $money(Math.max(0, fundingEq)) + ' equity · refi 75% LTV = ' + $money(p.refiMonto))
    + '</div>'

    + '<div class="grid k4" style="margin-top:14px">'
    + kpi('TIR a 31 años', $pct(i.tir31PostRefi), 'retorno anual del hold completo (base post-refi)', 'up')
    + kpi('Tu VPN a 31 años', $money(i.vpn31PostRefi * inv), 'valor presente al ' + $pct(p.retornoEsperado) + ' con venta terminal · total casa ' + $money(i.vpn31PostRefi), 'up')
    + kpi('CAP rate', $pct(i.capValor), 'NOI ' + $money(i.noiAnual) + ' / valor · sobre costo: ' + $pct(i.capCosto))
    + kpi('DSCR', i.dscr.toFixed(2), 'la renta cubre la deuda ' + i.dscr.toFixed(2) + '× · equilibrio: ' + $pct(i.puntoEquilibrio) + ' de ocupación', i.dscr >= 1.2 ? 'up' : 'warn')
    + '</div>'

    + '<div class="card" style="margin-top:14px"><div class="chart-h"><div class="t">La tesis: riqueza a largo plazo, no solo el año 1</div><div class="k">amortización + rentabilidad + valorización · tu parte al ' + $pct(inv) + '</div></div>'
    + '<div class="grid k3">'
    + kpi('Tu patrimonio año 5', $money(r.anios[5].patrimonioInv), 'equity de la casa × tu %')
    + kpi('Tu patrimonio año 10', $money(r.anios[10].patrimonioInv), '')
    + kpi('Tu patrimonio año 31', $money(r.anios[Math.min(31, r.anios.length - 1)].patrimonioInv), 'deuda en $0 — la casa es tuya en un ' + $pct(inv))
    + '</div></div>'

    + '<div class="grid k2" style="margin-top:14px">'
    + '<div class="card"><div class="chart-h"><div class="t">1 · Construcción de riqueza anual</div><div class="k">amortización + rentabilidad + valorización</div></div><canvas id="ch1"></canvas></div>'
    + '<div class="card"><div class="chart-h"><div class="t">2 · Evolución del patrimonio</div><div class="k">valor vs deuda (desapalancamiento)</div></div><canvas id="ch2"></canvas></div>'
    + '<div class="card"><div class="chart-h"><div class="t">3 · Ingresos vs deuda fija</div><div class="k">la inflación trabaja para vos (DSCR crece)</div></div><canvas id="ch3"></canvas></div>'
    + '<div class="card"><div class="chart-h"><div class="t">4 · Utilidad acumulada</div><div class="k">negativa al inicio, compuesta después</div></div><canvas id="ch4"></canvas></div>'
    + '</div>'
    + '<div class="card" style="margin-top:14px"><div class="chart-h"><div class="t">5 · Gastos: operativos · impuestos · financieros</div><div class="k">transparencia total</div></div><canvas id="ch5" style="max-height:220px"></canvas></div>'

    + '<div class="card overx" style="margin-top:14px"><div class="chart-h"><div class="t">Flujo operativo del ciclo (mes 0–' + p.cicloMeses + ')</div><div class="k">' + (cf.length ? 'con movimientos reales cargados' : 'proyección desde parámetros — los movimientos reales se cargan desde administración') + '</div></div>'
    + '<table><thead><tr><th>Mes</th><th>Ocup.</th><th>Ingreso</th><th>Operativos</th><th>UODI</th><th>Financiación</th><th>FCL del mes</th><th>Acumulado</th></tr></thead><tbody>'
    + r.meses.map((x, ix) => '<tr><td>m' + x.m + '</td><td>' + Math.round(x.ocupacion * 100) + '%</td><td>' + $money(x.ingreso) + '</td><td>' + $money(-(x.operativos + x.impPropiedad + x.impRenta)) + '</td><td>' + $money(x.uodi) + '</td><td>' + $money(x.fin) + '</td><td class="' + (x.fclNegocio >= 0 ? 'up' : 'down') + '">' + $money(x.fclNegocio) + '</td><td class="' + (acumRows[ix] >= 0 ? 'up' : 'down') + '">' + $money(acumRows[ix]) + '</td></tr>').join('')
    + '</tbody></table></div>'

    + '<div class="grid k2" style="margin-top:14px">'
    + '<div class="card"><div class="chart-h"><div class="t">Transparencia de gastos — ítem por ítem</div><div class="k">cada parámetro con su fuente</div></div>'
    + [['mantenimiento_mes', 'Mantenimiento /mes'], ['servicios_mes', 'Servicios públicos /mes'], ['hoa_mes', 'HOA /mes'], ['padsplit_pct', 'PADSPLIT (% ingreso)'], ['comision_pct', 'Comisión (% ingreso)'], ['imp_propiedad_pct', 'Impuesto propiedad (anual s/ avalúo)'], ['seguro_mes', 'Seguro /mes'], ['cierre_compra', 'Gastos de cierre compra'], ['refi_tasa', 'Tasa refi 30 años'], ['hm_tasa', 'Tasa Hard Money']]
      .map(([k, lab]) => { const rr = P[k]; if (!rr) return ''; const v = parseFloat(rr.value); const isPct = /pct|tasa/.test(k); return '<div class="kv"><span>' + lab + srcChip(P, k) + '</span><b>' + (isPct ? $pct(v) : $money(v)) + '</b></div>'; }).join('')
    + (cf.length ? '<div class="lab" style="margin-top:12px">Movimientos reales (' + cf.length + ')</div>' + cf.slice(0, 40).map(m => '<div class="kv"><span>' + esc(m.fecha) + ' · ' + esc(m.item || m.linea) + (m.id_factura ? ' · #' + esc(m.id_factura) : '') + '</span><b class="' + (m.tipo === 'ingreso' ? 'up' : 'down') + '">' + $money(m.tipo === 'ingreso' ? m.valor : -m.valor) + '</b></div>').join('') : '')
    + '</div>'
    + '<div class="card"><div class="chart-h"><div class="t">Documentos</div><div class="k">de tu casa e inversión</div></div>'
    + (docs.length ? docs.map(d => '<div class="kv"><span>' + esc(d.tipo) + '</span><b><a href="' + esc(d.url) + '" target="_blank" style="color:var(--a2)">' + esc(d.nombre) + ' ↗</a></b></div>').join('') : '<div class="empty" style="padding:20px">Todavía no hay documentos cargados.</div>')
    + '</div></div>'

    + '<div class="meta" style="margin-top:16px;opacity:.7">Proyección del modelo financiero (valorización ' + $pct(p.valorizacion) + '/año · inflación ' + $pct(p.inflacion) + ' · descuento ' + $pct(p.retornoEsperado) + ') — no constituye garantía de retorno. Cifras "real" desde registros de la operación; "supuesto" en calibración contra el modelo maestro.</div>';

  app().innerHTML = head + body;
  if (IP.tab === 'props' || !IP.tab) drawCharts(r, inv);
  IP.lastSnapshot = { casa: dir, escenario, inversion: +holding.inversion_aportada || 0, reparto: inv, tir31: i.tir31PostRefi, vpn31: i.vpn31PostRefi, vpn31_inv: i.vpn31PostRefi * inv, cap: i.capValor, dscr: i.dscr, equilibrio: i.puntoEquilibrio, riqueza_hoy: riquezaHoy, utilidad_mensual: Math.round((r.anios[2] ? r.anios[2].fclNegocio : 0) / 12), fases: i.fases, patrimonio_a5: r.anios[5].patrimonioInv, patrimonio_a10: r.anios[10].patrimonioInv, patrimonio_a31: r.anios[Math.min(31, r.anios.length - 1)].patrimonioInv, distribuciones: (IP.dists || []).filter(d => d.property_id === pid).map(d => ({ fecha: d.fecha, tipo: d.tipo, monto: +d.monto, estado: d.estado })) };
}

// ─── 💸 Distribuciones ───
function renderDist(pid, inv) {
  const rows = (IP.dists || []).slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
  const pagadas = rows.filter(d => d.estado === 'pagada');
  const total = pagadas.reduce((s, d) => s + (+d.monto || 0), 0);
  const hoy = new Date().toISOString().slice(0, 10);
  const prox = rows.filter(d => d.estado === 'programada' && d.fecha >= hoy).sort((a, b) => a.fecha.localeCompare(b.fecha))[0];
  const dias = prox ? Math.ceil((new Date(prox.fecha) - Date.now()) / 86400000) : null;
  const kpi = (lab, val, meta, cls) => '<div class="card"><div class="lab">' + lab + '</div><div class="big ' + (cls || '') + '">' + val + '</div>' + (meta ? '<div class="meta">' + meta + '</div>' : '') + '</div>';
  return '<div class="grid k3">'
    + kpi('Total recibido', $money(total), pagadas.length + ' distribuciones pagadas', 'up')
    + kpi('Próxima distribución', prox ? $money(prox.monto) : '—', prox ? esc(prox.fecha) + ' · faltan ' + dias + ' días' + (dias <= 14 ? ' <b class="warn">⏰ en menos de 14 días</b>' : '') : 'sin programadas', prox && dias <= 14 ? 'warn' : '')
    + kpi('K-1 disponibles', rows.filter(d => d.k1_url).length, 'documentos fiscales de tus distribuciones')
    + '</div>'
    + '<div class="card" style="margin-top:14px"><div class="chart-h"><div class="t">Historial</div><div class="k"><button class="ibtn" onclick="ipDistCSV()">⬇ CSV</button></div></div>'
    + (rows.length ? '<div class="overx"><table><thead><tr><th>Fecha</th><th>Tipo</th><th>Monto</th><th>Estado</th><th>K-1</th></tr></thead><tbody>'
      + rows.map(d => '<tr><td>' + esc(d.fecha) + '</td><td>' + esc(d.tipo) + '</td><td class="up">' + $money(d.monto) + '</td><td>' + (d.estado === 'pagada' ? '<span class="up">✓ pagada</span>' : '<span class="warn">programada</span>') + '</td><td>' + (d.k1_url ? '<a href="' + esc(d.k1_url) + '" target="_blank" style="color:var(--a2)">K-1 ↗</a>' : '—') + '</td></tr>').join('')
      + '</tbody></table></div>' : '<div class="empty">Todavía no hay distribuciones registradas.</div>')
    + '</div>';
}
function ipDistCSV() {
  const rows = (IP.dists || []);
  const csv = 'fecha,tipo,monto,estado,k1\n' + rows.map(d => [d.fecha, d.tipo, d.monto, d.estado, d.k1_url || ''].join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'distribuciones.csv'; a.click();
}
window.ipDistCSV = ipDistCSV;

// ─── 💬 Mensajes ───
function renderMsgs(pid) {
  const rows = (IP.msgs || []).slice().sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  return '<div class="card" style="margin-bottom:14px"><div class="chart-h"><div class="t">Escribinos</div><div class="k">te respondemos en el portal</div></div>'
    + '<input id="ip-msg-asunto" class="login-input" placeholder="Asunto" style="width:100%;background:var(--glass);border:1px solid var(--glassb);border-radius:10px;padding:10px 12px;color:var(--ink);font-size:13px;margin-bottom:8px">'
    + '<textarea id="ip-msg-cuerpo" rows="3" placeholder="Tu mensaje…" style="width:100%;background:var(--glass);border:1px solid var(--glassb);border-radius:10px;padding:10px 12px;color:var(--ink);font-size:13px"></textarea>'
    + '<button class="cbtn" style="margin-top:8px" onclick="ipEnviarMsg()">Enviar</button></div>'
    + (rows.length ? rows.map(m => {
      const leido = (m.read_by || []).includes(IP.email.toLowerCase());
      return '<div class="card" style="margin-bottom:8px;' + (!leido && m.de === 'admin' ? 'border-color:rgba(79,141,255,.45)' : '') + '" ' + (!leido ? 'onclick="ipMarcarLeido(\'' + m.id + '\')"' : '') + '>'
        + '<div class="kv" style="border:none;padding:0"><span>' + (m.de === 'admin' ? '🏢 Flipping Rentals' : '👤 Vos') + ' · ' + esc((m.created_at || '').slice(0, 10)) + (!leido && m.de === 'admin' ? ' · <b style="color:var(--a2)">nuevo</b>' : '') + '</span></div>'
        + (m.asunto ? '<div style="font-weight:700;font-size:13px;margin:4px 0">' + esc(m.asunto) + '</div>' : '')
        + '<div style="font-size:12.5px;color:var(--mut);white-space:pre-wrap">' + esc(m.cuerpo) + '</div></div>';
    }).join('') : '<div class="empty">Sin mensajes todavía.</div>');
}
async function ipEnviarMsg() {
  const asunto = (document.getElementById('ip-msg-asunto').value || '').trim();
  const cuerpo = (document.getElementById('ip-msg-cuerpo').value || '').trim();
  if (!cuerpo) return;
  const { error } = await sb.from('inv_messages').insert({ investor_airtable_id: IP.myIds[0], de: 'inversionista', asunto, cuerpo });
  if (error) return alert('Error: ' + error.message);
  await ipReloadProducto(); render();
}
window.ipEnviarMsg = ipEnviarMsg;
async function ipMarcarLeido(id) { await sb.rpc('inv_msg_marcar_leido', { msg: id }); await ipReloadProducto(); render(); }
window.ipMarcarLeido = ipMarcarLeido;

// ─── 📄 Documentos (con audit log) ───
function renderDocs(docs) {
  return '<div class="card"><div class="chart-h"><div class="t">Documentos de tu inversión</div><div class="k">cada vista queda registrada</div></div>'
    + (docs.length ? docs.map(d => '<div class="kv"><span>' + esc(d.tipo) + '</span><b><a href="#" onclick="ipVerDoc(\'' + d.id + '\',\'' + esc(d.url) + '\');return false" style="color:var(--a2)">' + esc(d.nombre) + ' ↗</a></b></div>').join('') : '<div class="empty" style="padding:20px">Todavía no hay documentos cargados.</div>')
    + '</div>';
}
async function ipVerDoc(id, url) { try { await sb.rpc('inv_doc_log', { doc: id, accion: 'ver' }); } catch (e) {} window.open(url, '_blank'); }
window.ipVerDoc = ipVerDoc;

// ─── 🤖 Asistente IA ───
function renderIA() {
  const sugeridos = ['¿Cómo va mi inversión?', '¿Cómo viene mi flujo de efectivo?', '¿Cuál es mi ROI y qué significa?', '¿Cuándo recupero mi capital?'];
  return '<div class="card"><div class="chart-h"><div class="t">🤖 Investor Assistant</div><div class="k">responde SOLO con los datos de TU inversión · números concretos · honesto sobre riesgos</div></div>'
    + '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">' + sugeridos.map(s => '<button class="ibtn" onclick="ipAsk(\'' + s.replace(/'/g, "\\'") + '\')">' + s + '</button>').join('') + '</div>'
    + '<div id="ip-chat" style="display:flex;flex-direction:column;gap:8px;max-height:380px;overflow-y:auto;margin-bottom:10px">'
    + (IP.chat || []).map(m => '<div style="max-width:85%;padding:10px 13px;border-radius:12px;font-size:12.5px;line-height:1.55;white-space:pre-wrap;' + (m.role === 'user' ? 'align-self:flex-end;background:rgba(79,141,255,.16);border:1px solid rgba(79,141,255,.3)' : 'align-self:flex-start;background:var(--glass);border:1px solid var(--glassb)') + '">' + esc(m.content) + '</div>').join('')
    + '</div>'
    + '<div style="display:flex;gap:8px"><input id="ip-ia-q" placeholder="Preguntá sobre tu inversión…" onkeydown="if(event.key===\'Enter\')ipAsk()" style="flex:1;background:var(--glass);border:1px solid var(--glassb);border-radius:11px;padding:11px 14px;color:var(--ink);font-size:13px;outline:none"><button class="cbtn" onclick="ipAsk()">Enviar</button></div>'
    + '</div>';
}
async function ipAsk(q) {
  const input = document.getElementById('ip-ia-q');
  const question = (q || (input ? input.value : '') || '').trim();
  if (!question) return;
  IP.chat = IP.chat || [];
  IP.chat.push({ role: 'user', content: question });
  IP.chat.push({ role: 'assistant', content: '…pensando' });
  render();
  try {
    const { data: { session } } = await sb.auth.getSession();
    const tok = session ? session.access_token : '';
    const res = await fetch('/api/brain-chat', {
      method: 'POST', headers: { 'content-type': 'application/json', ...(tok ? { Authorization: 'Bearer ' + tok } : {}) },
      body: JSON.stringify({ mode: 'investor', question, snapshot: IP.lastSnapshot || {}, history: IP.chat.filter(m => m.content !== '…pensando').slice(0, -1) }),
    });
    const d = await res.json();
    IP.chat.pop();
    IP.chat.push({ role: 'assistant', content: res.ok ? (d.answer || 'Sin respuesta.') : ('Error: ' + (d.error || res.status)) });
  } catch (e) { IP.chat.pop(); IP.chat.push({ role: 'assistant', content: 'No pude conectar: ' + e.message }); }
  render();
}
window.ipAsk = ipAsk;

async function ipReloadProducto() {
  const props = [...new Set(IP.holdings.map(h => h.property_id))];
  const [dc, ms] = await Promise.all([
    sb.from('inv_distributions').select('*').eq('active', true),
    sb.from('inv_messages').select('*').eq('active', true),
  ]);
  IP.dists = dc.data || []; IP.msgs = ms.data || [];
}

function drawCharts(r, inv) {
  const A = r.anios.filter(x => x.a >= 1);
  const labels = A.map(x => 'a' + x.a);
  const C = (id, cfg) => { const el = document.getElementById(id); if (el && window.Chart) IP.charts.push(new Chart(el, cfg)); };
  const gopt = { responsive: true, plugins: { legend: { labels: { color: '#93a0b6', boxWidth: 10, font: { size: 10 } } } }, scales: { x: { ticks: { color: '#5b6780', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,.05)' } }, y: { ticks: { color: '#5b6780', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,.05)' } } } };
  C('ch1', { type: 'bar', data: { labels, datasets: [
    { label: 'Amortización', data: r.series.riqueza.filter(x => x.a >= 1).map(x => x.amortizacion * inv), backgroundColor: '#4f8dff' },
    { label: 'Rentabilidad', data: r.series.riqueza.filter(x => x.a >= 1).map(x => x.rentabilidad * inv), backgroundColor: '#48d69c' },
    { label: 'Valorización', data: r.series.riqueza.filter(x => x.a >= 1).map(x => x.valorizacion * inv), backgroundColor: '#45e3c6' },
  ] }, options: { ...gopt, scales: { ...gopt.scales, x: { ...gopt.scales.x, stacked: true }, y: { ...gopt.scales.y, stacked: true } } } });
  C('ch2', { type: 'line', data: { labels, datasets: [
    { label: 'Valor de la casa', data: A.map(x => x.valor), borderColor: '#45e3c6', pointRadius: 0 },
    { label: 'Deuda', data: A.map(x => x.saldo), borderColor: '#f0687a', pointRadius: 0 },
    { label: 'Tu patrimonio', data: A.map(x => x.patrimonioInv), borderColor: '#4f8dff', pointRadius: 0, fill: true, backgroundColor: 'rgba(79,141,255,.08)' },
  ] }, options: gopt });
  C('ch3', { type: 'bar', data: { labels, datasets: [
    { label: 'Ingreso anual', data: r.series.dscr.filter(x => x.a >= 1).map(x => x.ingreso), backgroundColor: '#48d69c' },
    { label: 'Cuota deuda (fija)', data: r.series.dscr.filter(x => x.a >= 1).map(x => x.deuda), backgroundColor: '#f0687a' },
  ] }, options: gopt });
  C('ch4', { type: 'line', data: { labels, datasets: [
    { label: 'Utilidad acumulada (tu parte)', data: r.series.utilidadAcum.filter(x => x.a >= 1).map(x => x.acum * inv), borderColor: '#e7b65e', pointRadius: 0, fill: true, backgroundColor: 'rgba(231,182,94,.08)' },
  ] }, options: gopt });
  C('ch5', { type: 'bar', data: { labels, datasets: [
    { label: 'Operativos', data: r.series.gastos.filter(x => x.a >= 1).map(x => x.operativos), backgroundColor: '#4f8dff' },
    { label: 'Impuestos', data: r.series.gastos.filter(x => x.a >= 1).map(x => x.impuestos), backgroundColor: '#e7b65e' },
    { label: 'Financieros (cuota)', data: r.series.gastos.filter(x => x.a >= 1).map(x => x.financieros), backgroundColor: '#f0687a' },
  ] }, options: { ...gopt, scales: { ...gopt.scales, x: { ...gopt.scales.x, stacked: true }, y: { ...gopt.scales.y, stacked: true } } } });
}
window.render = render;

// ─── boot ───
(async function main() {
  if (location.hash.includes('access_token')) history.replaceState(null, '', location.pathname);
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { loginView(); }
  else { IP.email = session.user.email || ''; await ipLoad(); }
  sb.auth.onAuthStateChange(async (ev, s) => {
    if (ev === 'SIGNED_IN' && s && !IP.holdings.length) { IP.email = s.user.email || ''; await ipLoad(); }
    if (ev === 'SIGNED_OUT') loginView();
  });
})();
