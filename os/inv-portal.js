// ════════════════════════════════════════════════════════════════
// 💎 PORTAL DEL INVERSIONISTA v2 — página standalone (inversionista.html).
// Reemplaza el Excel "Modelo financiero - Renta VF": el socio ve TODO el modelo
// dentro del portal, SOLO LECTURA (los parámetros se editan en /inversionistas).
// Login magic link → inv_claim_access() → lee SOLO tablas inv_* + RPCs con RLS
// estricto (sus casas, nada más; jamás toca ff_*). El motor (inv-engine.js)
// corre en el browser con inv_model_params (cada param con su fuente visible).
// 5 pestañas: Mi Portafolio · Flujo Mensual · Distribuciones · Documentos ·
// Mensajes (+ Asistente IA). Regla dura: sin dato ≠ $0 — todo faltante se
// declara "sin dato" y es cargable desde administración.
// ════════════════════════════════════════════════════════════════

const sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
const IP = { holdings: [], params: {}, cashflow: {}, docs: {}, casa: null, charts: [], email: '', tab: 'port', myIds: [], dists: [], msgs: [], chat: [], ledger: {}, ledgerF: { tipo: 'todos', mes: 'todos' }, anio: 'todos', anioOpen: {}, docQ: '', docTipo: 'todos', proj: [], infoDefs: {}, resumen: [], viewOnly: false, ver: null, verNombre: '', verList: [] };
window.IP = IP;

const $money = v => (v == null || isNaN(+v)) ? '—' : (+v < 0 ? '−$' : '$') + Math.abs(Math.round(+v)).toLocaleString('en-US');
const $pct = v => (v == null || isNaN(+v)) ? '—' : (v * 100).toFixed(1) + '%';
const $pct2 = v => (v == null || isNaN(+v)) ? '—' : (+(v * 100).toFixed(2)) + '%';   // tasas con 2 decimales (ej. hm_tasa 10.24%)
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const SD = '<span class="warn" title="este dato todavía no está cargado — se carga desde administración">sin dato</span>';
// BLOQUE 3B (04-ago): casa en rehab / sin renta. El motor (inv-engine) declara
// indicadores.estadoOperativo y devuelve null en CAP/DSCR/equilibrio en vez de
// -Infinity / Infinity% / cap negativo. Acá se traduce a lenguaje del inversor.
// "aún no aplica" ≠ "sin dato": el dato está, el indicador todavía no tiene sentido.
// razon = 'razonCap' | 'razonDscr' | 'razonEquilibrio' — se explica el indicador que se
// está tapando, nunca un motivo genérico (una casa rentada SIN cuota no está en rehab).
const ipRehabTxt = (i, razon) => ((i && i.estadoOperativo && (i.estadoOperativo[razon || ''] || i.estadoOperativo.texto)) || 'Aún no aplica todavía.');
const ipEnRehab = i => !!(i && i.estadoOperativo && i.estadoOperativo.enRehab);
const sd = v => (v == null || v === '' || (typeof v === 'number' && isNaN(v))) ? SD : esc(v);
const app = () => document.getElementById('app');

// ─── tema claro/oscuro (persistido) ───
function ipTheme() { return localStorage.getItem('ip_theme') || 'dark'; }
function ipApplyTheme() { document.documentElement.setAttribute('data-theme', ipTheme()); }
function ipToggleTheme() { localStorage.setItem('ip_theme', ipTheme() === 'dark' ? 'light' : 'dark'); ipApplyTheme(); render(); }
window.ipToggleTheme = ipToggleTheme;
ipApplyTheme();

// ─── login (magic link) ───
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

// ─── 👁 modo VISTA DEL INVERSOR (solo admin): mismos datasets, filtrados server-side
// por el inversionista objetivo vía inv_portal_como (guard rol admin + audit). Read-only.
function ipRO() { alert('👁 Modo vista — solo lectura. Ninguna acción se ejecuta.'); }
async function ipLoadComo() {
  const pay = await sb.rpc('inv_portal_como', { p_inv: IP.ver }).then(r => r.data).catch(() => null);
  if (!pay) {
    app().innerHTML = '<div class="login card"><h1>Vista no <span>disponible</span></h1><div class="meta" style="margin-top:10px">La vista del inversor es SOLO para administradores (queda auditada). Tu usuario no tiene ese rol.</div><button class="ibtn" style="margin-top:14px" onclick="location.href=\'/inversionista\'">Ir a mi portal</button></div>';
    return;
  }
  sb.rpc('inv_portal_como_log', { p_inv: IP.ver }).then(() => {}, () => {});
  IP.viewOnly = true; IP.verNombre = pay.nombre || IP.ver; IP.verList = pay.selector || [];
  IP.holdings = pay.holdings || [];
  IP.resumen = pay.resumen || []; IP.proj = pay.proj || []; IP.indData = pay.ind || [];
  IP.dists = pay.dists || []; IP.msgs = pay.msgs || []; IP.myIds = [IP.ver];
  IP.params = {}; (pay.params || []).forEach(r => { (IP.params[r.property_id] = IP.params[r.property_id] || {})[r.key] = r; });
  (pay.overrides || []).forEach(o => {
    const P = (IP.params[o.property_id] = IP.params[o.property_id] || {});
    const b = P[o.key];
    P[o.key] = { ...(b || { property_id: o.property_id, key: o.key }), value: o.valor, fuente: 'manual', descripcion: 'ajustado por el equipo' + (b && b.fuente ? ' (origen: ' + b.fuente + ')' : '') };
  });
  IP.cashflow = {}; (pay.cashflow || []).forEach(r => { (IP.cashflow[r.property_id] = IP.cashflow[r.property_id] || []).push(r); });
  IP.docs = {}; (pay.docs || []).forEach(r => { (IP.docs[r.property_id] = IP.docs[r.property_id] || []).push(r); });
  const glosL = await sb.from('glosario_terminos').select('*').eq('active', true).then(r => r.data || []).catch(() => []);
  IP.glos = {}; glosL.forEach(g => { IP.glos[g.clave] = g; });
  IP.escCfg = await sb.rpc('inv_esc_config').then(r => (window.invEsc ? invEsc.cfgDesde(r.data || []) : null)).catch(() => null);
  const qc = new URLSearchParams(location.search).get('casa');
  const props = [...new Set(IP.holdings.map(h => h.property_id))];
  IP.casa = (qc && props.includes(qc)) ? qc : props[0];
  if (!IP.holdings.length) { app().innerHTML = '<div class="login card"><h1>👁 ' + esc(IP.verNombre) + '</h1><div class="meta" style="margin-top:10px">Este inversionista no tiene casas asignadas todavía — su portal se ve vacío (igual que lo vería él).</div>' + ipVerBar() + '</div>'; return; }
  render();
}
function ipVerBar() {
  if (!IP.viewOnly) return '';
  const sel = (IP.verList || []).length > 1
    ? '<select class="ibtn" onchange="location.href=\'/inversionista?ver=\'+encodeURIComponent(this.value)">' + IP.verList.map(v => '<option value="' + esc(v.inv) + '"' + (v.inv === IP.ver ? ' selected' : '') + '>' + esc(v.nombre || v.email) + '</option>').join('') + '</select>' : '';
  return '<div style="position:sticky;top:0;z-index:999;display:flex;gap:10px;align-items:center;flex-wrap:wrap;background:rgba(245,178,61,.14);border:1px solid rgba(245,178,61,.5);border-radius:10px;padding:8px 12px;margin-bottom:12px;font-size:12.5px">'
    + '👁 <b>Estás viendo como ' + esc(IP.verNombre) + '</b> — solo lectura (mismos datos y componente que su portal real)' + sel
    + '<button class="ibtn" style="margin-left:auto" onclick="location.href=\'/inversionistas\'">Salir de la vista</button></div>';
}

// ─── carga (solo inv_* — RLS) ───
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
  const [prm, cf, dc, acc, dist, msg, res, pj, ovr, indD, glosL, escCfgL] = await Promise.all([
    sb.from('inv_model_params').select('*').in('property_id', props).eq('active', true),
    sb.from('inv_cashflow_real').select('*').in('property_id', props).eq('active', true).order('fecha'),
    sb.from('inv_documents').select('*').in('property_id', props).eq('active', true),
    sb.from('inv_access').select('investor_airtable_id').eq('active', true),
    sb.from('inv_distributions').select('*').eq('active', true),
    sb.from('inv_messages').select('*').eq('active', true),
    sb.from('v_portal_inversor').select('*').then(r => r.data || []).catch(() => []),
    sb.from('inv_projection').select('property_id,escenario,data,computed_at').eq('active', true).then(r => r.data || []).catch(() => []),
    sb.from('inv_param_overrides').select('*').in('property_id', props).eq('active', true).then(r => r.data || []).catch(() => []),
    sb.rpc('inv_indicadores_data').then(r => r.data || []).catch(() => []),
    sb.from('glosario_terminos').select('*').eq('active', true).then(r => r.data || []).catch(() => []),
    sb.rpc('inv_esc_config').then(r => r.data || []).catch(() => []),
  ]);
  IP.resumen = res || []; IP.proj = pj || [];
  IP.indData = indD || [];
  IP.glos = {}; (glosL || []).forEach(g => { IP.glos[g.clave] = g; });
  IP.escCfg = window.invEsc ? invEsc.cfgDesde(escCfgL || []) : null;
  IP.params = {}; (prm.data || []).forEach(r => { (IP.params[r.property_id] = IP.params[r.property_id] || {})[r.key] = r; });
  // overrides del admin: el valor EFECTIVO es el ajustado a mano; la fuente original queda declarada
  (ovr || []).forEach(o => {
    const P = (IP.params[o.property_id] = IP.params[o.property_id] || {});
    const b = P[o.key];
    P[o.key] = { ...(b || { property_id: o.property_id, key: o.key }), value: o.valor, fuente: 'manual', descripcion: 'ajustado por el equipo' + (b && b.fuente ? ' (origen: ' + b.fuente + ')' : '') };
  });
  IP.cashflow = {}; (cf.data || []).forEach(r => { (IP.cashflow[r.property_id] = IP.cashflow[r.property_id] || []).push(r); });
  IP.docs = {}; (dc.data || []).forEach(r => { (IP.docs[r.property_id] = IP.docs[r.property_id] || []).push(r); });
  IP.myIds = [...new Set((acc.data || []).map(a => a.investor_airtable_id))];
  IP.dists = dist.data || []; IP.msgs = msg.data || [];
  IP.casa = IP.casa || props[0];
  render();
}

// ─── params → motor ───
// SERVICIO DE DEUDA del ledger = interés HML + cuota de la refi 30a, y NADA MÁS.
// CRITERIO ESTRICTO, el MISMO del Ledger del admin (iaTabLedger): subcategoria='servicio_deuda'.
// ⚠ NO volver al fallback `categoria === 'financiero' && tipo === 'gasto'`: "financiero" también
// son el desembolso del HML, los draws y el cash-out del refi — plata que ENTRA o que es
// inversión, no cuotas. En 5003 Michelle ese fallback tragaba 5 draws manuales ($76,500) y el
// cash-out ($23,093.29) y sep-25 mostraba $49,116 de "deuda" en vez de $2,116.13.
function ipEsDeuda(m) {
  return m.subcategoria === 'servicio_deuda';
}
function num(P, k, d) { const r = P[k]; const v = r ? parseFloat(r.value) : NaN; return isNaN(v) ? d : v; }
function txt(P, k) { const r = P[k]; return r ? r.value : null; }
function ipEngineParams(pid) {
  const P = IP.params[pid] || {};
  const draws = {}, otros = {};
  Object.keys(P).forEach(k => {
    let m = k.match(/^draw_m(\d+)$/); if (m) draws[+m[1]] = parseFloat(P[k].value) || 0;
    m = k.match(/^otros_inv_m(\d+)$/); if (m) otros[+m[1]] = parseFloat(P[k].value) || 0;
  });
  const holding = IP.holdings.find(h => h.property_id === pid) || {};
  const indRow = (IP.indData || []).find(r => r.property_id === pid) || {};   // renta real (rent-roll)
  // E2: draws ya no viven como params — se reconstruyen de los movimientos migrados;
  // hm_compra (HML al cierre) reemplaza a hm_inicial (que ahora es compra+rehab, calculado)
  const drawsEf = Object.keys(draws).length ? draws : invEngine.drawsFromMovs(IP.cashflow[pid] || [], txt(P, 'fecha_cierre'));
  return {
    compra: num(P, 'compra', 0), cierreCompra: num(P, 'cierre_compra', 0),
    hmInicial: num(P, 'hm_compra', num(P, 'hm_inicial', 0)), hmTasa: num(P, 'hm_tasa', 0),
    draws: drawsEf, otrosInversionMes: otros,
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
    postRefiPerfil: P.postrefi_perfil ? P.postrefi_perfil.value : null,
    utilAnualPostRefi: num(P, 'util_anual_postrefi', null),
    anio0PostRefi: num(P, 'anio0_postrefi', null),
    inversionAportada: +holding.inversion_aportada || null,
    // renta REAL para salud (NOI/CAP/DSCR) — rent-roll actual; null → cae al modelo (CEO #4)
    rentaActualMes: (indRow.renta_actual_anual != null ? +indRow.renta_actual_anual / 12 : null),
    rentaActualFuente: indRow.renta_actual_fuente || null,
  };
}
function srcChip(P, k) {
  // origen en cristiano (pedido Juan): real = dato de la base · estimado = lo calcula el
  // modelo (no hay dato real todavía) · manual = lo cargó el equipo (override declarado)
  const r = (P || {})[k]; if (!r) return '';
  const f = r.fuente || '';
  const lbl = /^(manual|real:manual)/.test(f) ? 'manual'
    : (/^real:|^excel/.test(f) && !/\((estimado|derivado)/.test(f)) ? 'real' : 'estimado';
  return '<span class="src' + (lbl === 'real' ? '' : ' sup') + '" title="' + esc(f) + (r.descripcion ? ' — ' + esc(r.descripcion) : '') + '">' + lbl + '</span>';
}

// ─── ℹ explicador de métricas (concepto + fórmula con los números reales) ───
function ipInfo(k) {
  const d = IP.infoDefs[k]; if (!d) return;
  const old = document.getElementById('ip-info-ov'); if (old) old.remove();
  const ov = document.createElement('div');
  ov.id = 'ip-info-ov'; ov.className = 'ipov';
  ov.onclick = e => { if (e.target === ov) ov.remove(); };
  ov.innerHTML = '<div class="ipov-card">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px"><b style="font-size:15px">' + d.t + '</b><button class="ibtn" onclick="document.getElementById(\'ip-info-ov\').remove()">✕ Cerrar</button></div>'
    + '<div style="font-size:13px;line-height:1.6;color:var(--mut)">' + d.c + '</div>'
    + (d.f ? '<div class="lab" style="margin-top:12px">Cómo se calcula (con tus números)</div><div class="ipov-f">' + d.f + '</div>' : '')
    + '</div>';
  document.body.appendChild(ov);
}
window.ipInfo = ipInfo;
// tarjeta KPI con botón ℹ
function kpiI(lab, val, meta, cls, infoKey) {
  return '<div class="card" style="position:relative">'
    + (infoKey ? '<button class="infob" title="¿Qué significa?" onclick="ipInfo(\'' + infoKey + '\')">ℹ</button>' : '')
    + '<div class="lab">' + lab + '</div><div class="big ' + (cls || '') + '">' + val + '</div>'
    + (meta ? '<div class="meta">' + meta + '</div>' : '') + '</div>';
}

// ─── métricas del inversionista (reales del ledger cuando hay; si no, modelo — SIEMPRE declarado) ───
function ipMetrics(pid, p, r, holding) {
  const inv = p.repartoInv;
  const cap = +holding.inversion_aportada || null;
  const led = Array.isArray(IP.ledger[pid]) ? IP.ledger[pid] : null;
  const distMias = (IP.dists || []).filter(d => d.property_id === pid && d.estado === 'pagada');
  const distTotal = distMias.reduce((s, d) => s + (+d.monto || 0), 0);
  // riqueza hoy: capital + equity amortizado a hoy×% + valorización a hoy×%
  const cierre = txt(IP.params[pid] || {}, 'fecha_cierre');
  const mesesDesde = cierre ? Math.max(0, Math.floor((Date.now() - new Date(cierre + 'T00:00:00').getTime()) / (30.44 * 86400000))) : 0;
  const mesesBanco = Math.max(0, mesesDesde - (p.refiMes || 0));
  const abonoHoy = r.banco.tabla.slice(0, mesesBanco).reduce((s, f) => s + f.abono, 0);
  const valHoy = p.arv * (Math.pow(1 + p.valorizacion, mesesDesde / 12) - 1);
  const riquezaHoy = cap == null ? null : cap + (abonoHoy + valHoy) * inv;
  // flujo REAL de los últimos 12 meses (ledger): renta − operativos − servicio de deuda (gastos financieros)
  let real = null;
  if (led && led.length) {
    const hoyIso = new Date().toISOString().slice(0, 10);
    const pasado = led.filter(m => String(m.fecha || '') <= hoyIso); // lo programado a futuro no cuenta como operación real
    const rentas = pasado.filter(m => m.categoria === 'renta');
    if (rentas.length) {
      const maxF = pasado.reduce((s, m) => (m.fecha > s ? m.fecha : s), '');
      const desde = new Date(new Date(maxF + 'T00:00:00').getTime() - 365 * 86400000).toISOString().slice(0, 10);
      const w = pasado.filter(m => m.fecha >= desde);
      const rw = w.filter(m => m.categoria === 'renta').reduce((s, m) => s + +m.monto, 0);
      const ow = w.filter(m => m.categoria === 'operativo').reduce((s, m) => s + +m.monto, 0);
      const dw = w.filter(ipEsDeuda).reduce((s, m) => s + +m.monto, 0);
      const nMeses = [...new Set(w.filter(m => m.categoria === 'renta').map(m => String(m.fecha).slice(0, 7)))].length || 1;
      real = { renta: rw, oper: ow, deuda: dw, nMeses, flujoCasa: rw - ow - dw, desde };
    }
  }
  const cocBase = real ? 'real' : 'modelo';
  const flujoAnualCasa = real ? (real.flujoCasa / real.nMeses) * 12 : (r.indicadores.utilidadAnualEstable ? r.indicadores.utilidadAnualEstable.total : null);
  const cocMensual = cap && flujoAnualCasa != null ? (flujoAnualCasa / 12) * inv : null;
  const cocAnualPct = cap && flujoAnualCasa != null ? (flujoAnualCasa * inv) / cap : null;
  // equity multiple + ROI anualizado (CAGR desde la entrada)
  const em = cap ? (distTotal + riquezaHoy) / cap : null;
  const entrada = holding.fecha_entrada || cierre;
  const mesesInv = entrada ? Math.max(1, Math.round((Date.now() - new Date(entrada + 'T00:00:00').getTime()) / (30.44 * 86400000))) : null;
  const roiAnu = (em != null && mesesInv && mesesInv >= 3) ? Math.pow(em, 12 / mesesInv) - 1 : null;
  return { inv, cap, distTotal, distMias, riquezaHoy, abonoHoy, valHoy, mesesDesde, real, cocBase, cocMensual, cocAnualPct, em, roiAnu, mesesInv, flujoAnualCasa };
}

// ─── 📚 E4.5: capa educativa — ⓘ universal desde glosario_terminos (tabla, sin hardcode) ───
IP._glosVals = {};
function ipInterp(tpl, vals) { return String(tpl || '').replace(/\{\{(\w+)\}\}/g, (_, k) => (vals && vals[k] != null) ? vals[k] : '—'); }
// ícono ⓘ inline: guarda los NÚMEROS REALES del inversionista para interpolar en "Tu caso"
function gI(clave, vals, key) {
  const k = key || clave;
  if (vals) IP._glosVals[k] = vals;
  return (IP.glos || {})[clave] ? ' <span style="cursor:pointer;color:var(--mut2);font-size:10px;vertical-align:middle" title="¿Qué es esto?" onclick="event.stopPropagation();ipGlos(\'' + clave + '\',\'' + k + '\')">ⓘ</span>' : '';
}
window.gI = gI;
function ipGlos(clave, key) {
  const g = (IP.glos || {})[clave]; if (!g) return;
  const vals = IP._glosVals[key || clave] || {};
  const old = document.getElementById('ip-info-ov'); if (old) old.remove();
  const ov = document.createElement('div'); ov.id = 'ip-info-ov'; ov.className = 'ipov';
  ov.onclick = e => { if (e.target === ov) ov.remove(); };
  const caso = g.ejemplo_template ? ipInterp(g.ejemplo_template, vals) : null;
  ov.innerHTML = '<div class="ipov-card">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px"><b style="font-size:15px">' + esc(g.termino_es) + '</b><button class="ibtn" onclick="document.getElementById(\'ip-info-ov\').remove()">✕ Cerrar</button></div>'
    + '<div class="lab">Qué es</div><div style="font-size:13px;line-height:1.6;color:var(--mut)">' + esc(g.que_es) + '</div>'
    + (g.para_que ? '<div class="lab" style="margin-top:10px">Para qué te sirve</div><div style="font-size:12.5px;line-height:1.55;color:var(--mut)">' + esc(g.para_que) + '</div>' : '')
    + (g.formula ? '<div class="lab" style="margin-top:10px">Fórmula</div><div class="ipov-f">' + esc(g.formula) + '</div>' : '')
    + (caso ? '<div class="lab" style="margin-top:10px">Tu caso</div><div class="ipov-f">' + esc(caso) + '</div>' : '')
    + '</div>';
  document.body.appendChild(ov);
}
window.ipGlos = ipGlos;

// ─── 📈 E4: indicadores de retorno (VALOR EN PAPEL) — cálculo = os/inv-indicadores.js ───
function renderIndicadores(pid, met) {
  if (!window.invInd || !(IP.indData || []).length) return '';
  const hoy = new Date().toISOString().slice(0, 10);
  // B3: el override manual del precio de compra (si existe) prevalece sobre Airtable
  const cAll = (IP.indData || []).map(r => {
    const ov = ((IP.params[r.property_id] || {}).compra || {}).value;
    return invInd.casa(ov != null && isFinite(+ov) ? { ...r, compra: +ov } : r, hoy);
  });
  const c = cAll.find(x => x.property_id === pid);
  const $x = v => v == null ? '—' : v.toFixed(2) + 'x';
  // por inversionista (todas sus casas): DPI/RVPI/TVPI + TIR combinada
  const aportes = IP.holdings.map(h => ({ fecha: h.fecha_entrada || (((IP.params[h.property_id] || {}).fecha_cierre || {}).value || null), monto: +h.inversion_aportada || 0 }));
  let residual = 0, residualParcial = false;
  IP.holdings.forEach(h => {
    const ci = cAll.find(x => x.property_id === h.property_id);
    const rep = +h.reparto_pct || 0;
    if (ci && ci.equityHoy != null) residual += Math.max(0, ci.equityHoy) * rep; else residualParcial = true;
  });
  const distsPag = (IP.dists || []).filter(d => d.estado === 'pagada');
  const im = invInd.inversionista(aportes, distsPag, residual, hoy);
  IP.lastInd = { casa: c ? { casa: c.casa, tir: c.tirActivo, tirNA: c.tirNA, multAllIn: c.multAllIn, multEquity: c.multEquity, equityLeq0: c.equityLeq0, ltv: c.ltv, yield: c.yieldOnCost, aprec: c.aprecAnual, paper: c.paper_value, paper_fuente: c.paper_fuente, porCompletar: c.porCompletar } : null, inversor: im, residualParcial };
  const vals = { capital: $money(im.capital), dist: $money(im.distTotal), residual: $money(residual), dpi: im.dpi != null ? im.dpi.toFixed(2) + 'x' : '—', rvpi: im.rvpi != null ? im.rvpi.toFixed(2) + 'x' : '—', tvpi: im.tvpi != null ? im.tvpi.toFixed(2) + 'x' : '—', tir: $pct(im.tir), ltv: c ? $pct(c.ltv) : '—',
    mult_equity: !c ? '—' : (c.porCompletar ? 'por completar (falta registrar el HML: ' + $money(c.all_in) + ' invertidos)' : (c.equityLeq0 ? 'equity ≤ 0: la deuda (' + $money(c.deuda_vigente) + ') financió toda la inversión (' + $money(c.all_in) + ') — tu retorno sale de la valorización' : $x(c.multEquity))),
    mult_allin: c ? $x(c.multAllIn) : '—', yield: c ? $pct(c.yieldOnCost) : '—', aprec: c ? $pct(c.aprecAnual) : '—',
    paper: c ? $money(c.paper_value) : '—', paper_fuente: c ? String(c.paper_fuente || '') : '—' };
  const valsCasa = c ? { ...vals, tir: c.tirNA ? 'aún no representativa (hold < 1 año)' : $pct(c.tirActivo) } : vals;
  const card = (lab, clave, val, linea, cls) => '<div class="card"><div class="lab">' + lab + gI(clave, vals) + '</div><div class="big ' + (cls || '') + '">' + val + '</div><div class="meta">' + linea + '</div></div>';
  let casaCards = '';
  if (c) {
    const tirVal = c.tirNA ? (c.multAllIn != null ? $x(c.multAllIn) : 'n/a') : $pct(c.tirActivo);
    const tirLinea = c.tirNA ? 'En fase de valorización — la TIR anualizada aún no es representativa (hold < 1 año). Te mostramos el múltiplo (valor ÷ costo).' : 'tu inversión crece a este ritmo anual, en papel';
    const eqVal = c.porCompletar ? 'por completar' : (c.equityLeq0 ? 'equity ≤ 0' : $x(c.multEquity));
    const eqLinea = c.porCompletar ? 'sin HML registrado — el equipo está completando la deuda' : (c.equityLeq0 ? 'la deuda financió todo — tu retorno sale de la valorización' : 'cuántas veces se multiplicó la plata propia');
    const ltvDot = c.ltvSem ? '<span style="display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:5px;background:' + (c.ltvSem === 'verde' ? 'var(--pos)' : c.ltvSem === 'ambar' ? 'var(--amber)' : 'var(--neg)') + '"></span>' : '';
    const ltvLinea = c.ltv != null ? 'el banco es dueño del ' + Math.round(c.ltv * 100) + '% del valor; vos del ' + Math.max(0, 100 - Math.round(c.ltv * 100)) + '%' : (c.vendida ? 'vendida — deuda saldada' : 'deuda por completar');
    casaCards = '<div class="grid k3" style="margin-top:10px">'
      + '<div class="card"><div class="lab">TIR del activo (papel)' + gI('tir', valsCasa, 'tir@casa') + '</div><div class="big ' + (c.tirActivo > 0 ? 'up' : '') + '">' + tirVal + '</div><div class="meta">' + tirLinea + '</div></div>'
      + card('Múltiplo all-in', 'mult_allin', $x(c.multAllIn), 'valor hoy ÷ todo lo que costó (compra + obra)', c.multAllIn >= 1 ? 'up' : 'down')
      + card('Múltiplo sobre equity', 'mult_equity', eqVal, eqLinea, c.multEquity != null && c.multEquity >= 1 ? 'up' : '')
      + '</div><div class="grid k3" style="margin-top:10px">'
      + card('LTV actual', 'ltv', ltvDot + $pct(c.ltv), ltvLinea, '')
      + card('Yield on cost', 'yield_on_cost', $pct(c.yieldOnCost), c.yieldOnCost != null ? 'renta anual ÷ inversión total' : 'sin renta registrada todavía', '')
      + card('Apreciación anualizada', 'apreciacion', c.tirNA ? '—' : $pct(c.aprecAnual), c.tirNA ? 'hold < 1 año — aún no se anualiza (mirá el múltiplo)' : 'cuánto sube el valor por año desde la compra', c.aprecAnual > 0 ? 'up' : '')
      + '</div>'
      + '<div class="meta" style="margin-top:6px">Valor en papel: <b>' + $money(c.paper_value) + '</b> <span class="src' + (/venta real|appraisal/.test(c.paper_fuente || '') ? '' : ' sup') + '">' + esc(c.paper_fuente || '') + '</span>' + gI('paper_value', vals) + ' · corte: ' + hoy + '</div>';
  }
  const invCards = '<div class="grid k4" style="margin-top:14px">'
    + card('DPI', 'dpi', vals.dpi, 'lo YA recibido por cada dólar que pusiste', im.dpi > 0 ? 'up' : '')
    + card('RVPI', 'rvpi', vals.rvpi, 'lo que tu parte vale HOY en papel, por dólar' + (residualParcial ? ' (parcial: hay casas sin deuda registrada)' : ''), '')
    + card('TVPI', 'tvpi', vals.tvpi, 'retorno total = DPI + RVPI · 1.0x = empatás', im.tvpi >= 1 ? 'up' : '')
    + card('Tu TIR combinada', 'tir', $pct(im.tir), 'XIRR de tus aportes, distribuciones y tu equity de hoy', im.tir > 0 ? 'up' : '')
    + '</div>';
  return '<div class="card" style="margin-top:14px"><div class="chart-h"><div class="t">📈 Indicadores de retorno' + (c ? ' · ' + esc(c.casa) : '') + '</div><div class="k">metodología del Excel IRR Portafolio · una definición (os/inv-indicadores.js)</div></div>'
    + '<div style="padding:8px 12px;border:1px solid rgba(245,178,61,.45);background:rgba(245,178,61,.08);border-radius:9px;font-size:11.5px;color:var(--amber)">📄 Indicadores sobre <b>valor en papel</b> (appraisal/ARV) — no incluyen rentas, intereses ni gastos; <b>no son ganancias realizadas</b> hasta la venta o el refi.</div>'
    + casaCards
    + '<div class="lab" style="margin-top:14px">Tu posición como inversionista (todas tus casas)</div>'
    + invCards
    + '</div>';
}

// ─── 📚 E4.5: pestaña "Aprende" — glosario agrupado + cómo leer el dashboard ───
function ipGlosQ(v) { IP.glosQ = v; render(); const el = document.getElementById('ip-glos-q'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }
window.ipGlosQ = ipGlosQ;
function renderGlosario() {
  const temas = [['retorno', '💰 Tu retorno'], ['deuda', '🏦 La deuda'], ['propiedad', '🏠 La propiedad'], ['proceso', '🧭 El proceso']];
  const q = (IP.glosQ || '').toLowerCase();
  const list = Object.values(IP.glos || {}).sort((a, b) => (a.orden || 0) - (b.orden || 0))
    .filter(g => !q || (g.termino_es + ' ' + (g.termino_en || '') + ' ' + g.que_es).toLowerCase().includes(q));
  const guia = '<div class="card" style="margin-bottom:14px"><div class="chart-h"><div class="t">Cómo leer tu dashboard en 2 minutos</div></div>'
    + '<div style="font-size:12.5px;line-height:1.8;color:var(--mut)">'
    + '1️⃣ <b>Tu inversión</b>: cuánto pusiste y qué % de la casa es tuyo.<br>'
    + '2️⃣ <b>Indicadores de retorno</b>: TVPI = la foto completa (recibido + papel). TIR = a qué ritmo anual crece. LTV = cuánta deuda tiene la casa.<br>'
    + '3️⃣ <b>Info del deal</b>: la estrategia, el préstamo (HML) y el plan de salida — cómo y cuándo vuelve tu plata.<br>'
    + '4️⃣ <b>Flujo Mensual</b>: la operación real (renta − gastos). Los draws y la deuda aparecen aparte como [P&L NO] — informativos.<br>'
    + '5️⃣ <b>Distribuciones</b>: la plata que YA te pagamos, con comprobante y K-1.<br>'
    + 'Tocá cualquier <b>ⓘ</b> para ver qué es, para qué sirve y TU caso con tus números.</div></div>';
  return '<div class="card" style="margin-bottom:14px"><div class="chart-h"><div class="t">📚 Aprende — glosario del inversionista</div><div class="k">todo término del portal, explicado sin jerga</div></div>'
    + '<input id="ip-glos-q" placeholder="🔍 Buscar término…" value="' + esc(IP.glosQ || '') + '" oninput="ipGlosQ(this.value)" style="width:100%;background:var(--glass);border:1px solid var(--glassb);border-radius:10px;padding:9px 12px;color:var(--ink);font-size:13px;outline:none">'
    + '</div>' + guia
    + temas.map(([t, tit]) => {
      const rows = list.filter(g => g.tema === t);
      if (!rows.length) return '';
      return '<div class="card" style="margin-bottom:14px"><div class="chart-h"><div class="t">' + tit + '</div></div>'
        + rows.map(g => '<div style="padding:9px 0;border-top:1px solid var(--glassb)">'
          + '<b style="font-size:13px">' + esc(g.termino_es) + '</b>' + (g.termino_en && g.termino_en !== g.termino_es ? ' <span class="meta">(' + esc(g.termino_en) + ')</span>' : '')
          + '<div style="font-size:12.5px;color:var(--mut);margin-top:3px">' + esc(g.que_es) + '</div>'
          + (g.para_que ? '<div class="meta" style="margin-top:2px">➜ ' + esc(g.para_que) + '</div>' : '')
          + (g.formula ? '<div class="meta" style="margin-top:2px;font-family:ui-monospace,Menlo,monospace">ƒ ' + esc(g.formula) + '</div>' : '')
          + '</div>').join('')
        + '</div>';
    }).join('');
}

// ─── render raíz ───
function render() {
  IP.charts.forEach(c => { try { c.destroy(); } catch (e) {} }); IP.charts = [];
  const pid = IP.casa;
  const P = IP.params[pid] || {};
  const holding = IP.holdings.find(h => h.property_id === pid) || {};
  const p = ipEngineParams(pid);
  const movsCasa = IP.cashflow[pid] || [];
  const fechaC = P.fecha_cierre ? P.fecha_cierre.value : null;
  const escenario = (movsCasa.length && fechaC) ? 'realizado' : 'proyectado';
  const pRun = escenario === 'realizado' ? invEngine.escenario(p, 'realizado', { movsPorMes: invEngine.movsPorMes(movsCasa, fechaC) }) : p;
  const r = window.invEngine.run(pRun);
  const dir = P.direccion ? P.direccion.value : 'Casa';
  const docs = IP.docs[pid] || [];

  const selector = IP.holdings.length > 1
    ? '<select class="ibtn" onchange="IP.casa=this.value;render()">' + IP.holdings.map(h => {
        const d = (IP.params[h.property_id] || {}).direccion; const nm = d ? d.value.split(',')[0] : h.property_id.slice(0, 8);
        return '<option value="' + h.property_id + '" ' + (h.property_id === pid ? 'selected' : '') + '>' + esc(nm) + '</option>';
      }).join('') + '</select>' : '';

  const noLeidos = (IP.msgs || []).filter(m => m.de === 'admin' && !(m.read_by || []).includes(IP.email.toLowerCase())).length;
  // Auditoría Item 22 (20-ago): 'docs' (Mis Documentos) y 'msgs' (Mensajes) OCULTOS del portal del
  // inversor por pedido del CEO ("quitemos esto"). El 🤖 Asistente SE CONSERVA (Item 23). Código y
  // datos intactos (renderDocs/renderMsgs siguen y se renderizan si se navega directo). PARA REACTIVAR:
  // sacá el tab de IP_TABS_OCULTOS.
  const IP_TABS_OCULTOS = ['docs', 'msgs'];
  const TABS = [['port', '🏠 Mi Portafolio'], ['rend', '📈 Rendimiento'], ['casa', '🏡 Mi Casa'], ['flujo', '📅 Flujo Mensual'], ['dist', '💸 Distribuciones'], ['docs', '📄 Mis Documentos'], ['glos', '📚 Aprende'], ['msgs', '💬 Mensajes' + (noLeidos ? ' (' + noLeidos + ')' : '')], ['ia', '🤖 Asistente']].filter(t => !IP_TABS_OCULTOS.includes(t[0]));
  const head = ipVerBar()
    + '<div class="bar"><div class="logo">FR</div><div class="brandt"><b>Portal de Inversionistas</b><span>FLIPPING RENTALS</span></div>'
    + '<div class="barr">' + selector
    + '<button class="ibtn" title="tema claro / oscuro" onclick="ipToggleTheme()">◐</button>'
    + '<span class="meta hide-sm">' + esc(IP.email) + '</span><button class="ibtn" onclick="ipLogout()">Salir</button></div></div>'
    + '<div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">' + TABS.map(t => '<button class="ibtn tabb' + (IP.tab === t[0] ? ' on' : '') + '" onclick="IP.tab=\'' + t[0] + '\';render()">' + t[1] + '</button>').join('') + '</div>';

  let body = '';
  if (IP.tab === 'rend') body = renderRendimiento();
  else if (IP.tab === 'casa') body = renderCasaDash(pid, P, holding, p, r, dir);
  else if (IP.tab === 'flujo') body = renderFlujo(pid, p.repartoInv);
  else if (IP.tab === 'dist') body = renderDist(pid, p.repartoInv);
  else if (IP.tab === 'msgs') body = renderMsgs(pid);
  else if (IP.tab === 'docs') body = renderDocs(docs);
  else if (IP.tab === 'glos') body = renderGlosario();
  else if (IP.tab === 'ia') body = renderIA();
  else body = renderPortafolio(pid, P, holding, p, r, escenario, movsCasa, dir);

  app().innerHTML = head + body;
  if (IP.tab === 'port' || !IP.tab) drawCharts(r, p.repartoInv);
  if (IP.tab === 'rend') drawRendChart();
  if (IP.tab === 'casa') drawCasaChart(r, p.repartoInv);
  const met = ipMetrics(pid, p, r, holding);
  IP.lastSnapshot = { casa: dir, escenario, inversion: met.cap || 0, reparto: met.inv, tir31: r.indicadores.tir31PostRefi, vpn31: r.indicadores.vpn31PostRefi, vpn31_inv: r.indicadores.vpn31PostRefi * met.inv, cap: (r.indicadores.capActualValor != null ? r.indicadores.capActualValor : r.indicadores.capValor), dscr: (r.indicadores.dscrActual != null ? r.indicadores.dscrActual : r.indicadores.dscr), equilibrio: r.indicadores.puntoEquilibrio,
    // 3B: si la casa está en rehab, cap/dscr/equilibrio van null A PROPÓSITO — el asistente
    // debe decir "aún no aplica", nunca "sin dato" ni inventar un número.
    estado_operativo: r.indicadores.estadoOperativo,
    riqueza_hoy: met.riquezaHoy, coc_anual: met.cocAnualPct, equity_multiple: met.em, roi_anualizado: met.roiAnu, fases: r.indicadores.fases, distribuciones: met.distMias.map(d => ({ fecha: d.fecha, tipo: d.tipo, monto: +d.monto, estado: d.estado })) };
}

// ─── 🏠 MI PORTAFOLIO ───
function renderPortafolio(pid, P, holding, p, r, escenario, movsCasa, dir) {
  const i = r.indicadores;
  // SALUD con renta REAL (rent-roll actual) cuando existe; si no, cae al modelo (CEO #4).
  // Un solo número de NOI/CAP/DSCR mostrado: el real si la casa está rentada, etiquetado.
  const iRentaReal = i.noiActual != null;
  const iNoi = iRentaReal ? i.noiActual : i.noiAnual;
  const iDscr = (i.dscrActual != null ? i.dscrActual : i.dscr);
  const iCap = (i.capActualValor != null ? i.capActualValor : i.capValor);
  const iCapCosto = (i.capActualCosto != null ? i.capActualCosto : i.capCosto);
  const rentaLbl = iRentaReal ? ('renta real · ' + esc(i.rentaActualFuente || 'rent-roll Rentas')) : 'renta del modelo';
  const inv = p.repartoInv;
  const estado = P.estado_casa ? P.estado_casa.value.replace(/_/g, ' ') : null;
  const cierre = P.fecha_cierre ? P.fecha_cierre.value : null;
  // el flujo REAL (ledger) alimenta CoC/timeline — se carga lazy y re-renderiza
  if (IP.ledger[pid] === undefined) ipLoadLedger(pid, true);
  const met = ipMetrics(pid, p, r, holding);

  // ── portfolio strip (todas tus casas) ──
  const capTotal = IP.holdings.reduce((s, h) => s + (+h.inversion_aportada || 0), 0);
  const nProps = [...new Set(IP.holdings.map(h => h.property_id))].length;
  const distTodas = (IP.dists || []).filter(d => d.estado === 'pagada').reduce((s, d) => s + (+d.monto || 0), 0);
  const hoy = new Date();
  const prox1 = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1);
  const saludo = '<h1>👋 Hola <span>· tu portafolio</span></h1>'
    + '<div class="sub">' + nProps + (nProps === 1 ? ' propiedad' : ' propiedades') + ' · capital aportado <b>' + $money(capTotal) + '</b> · distribuciones recibidas <b>' + $money(distTodas) + '</b> · próxima actualización de datos: <b>' + prox1.toISOString().slice(0, 10) + '</b> (1° de mes)</div>';

  // ── tus casas de un vistazo (v_portal_inversor) ──
  const resumenCards = (IP.resumen || []).length ? ''
    + '<div class="card" style="margin-bottom:14px"><div class="chart-h"><div class="t">Tus casas de un vistazo</div><div class="k">tocá una tarjeta para ver el detalle completo</div></div>'
    + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:12px;align-items:start">'
    + IP.resumen.map(rc => {
      const activa = rc.property_id === pid;
      const meses = rc.meses_invertido != null ? (rc.meses_invertido >= 12 ? Math.floor(rc.meses_invertido / 12) + ' a ' + (rc.meses_invertido % 12) + ' m' : rc.meses_invertido + ' meses') : null;
      const flujo = rc.flujo_ult_mes != null
        ? '<span style="color:' + (rc.flujo_ult_mes >= 0 ? 'var(--pos)' : 'var(--neg)') + ';font-weight:700">' + $money(rc.flujo_ult_mes) + '</span> <span class="meta">(' + esc(rc.flujo_ult_mes_ym || '') + ')</span>'
        : '<span class="meta">sin rentas todavía</span>';
      const deficit = +rc.deficit > 0
        ? '<div style="margin-top:6px;font-size:12px;color:var(--neg)">Déficit acumulado: <b>' + $money(rc.deficit) + '</b> <span class="src" style="font-size:9px">Airtable</span>'
          + '<div class="meta" style="font-size:11px">caja atrapada de la operación — se recupera con el refi/venta' + (rc.fecha_estimada_pago ? ' · fecha estimada: <b>' + esc(rc.fecha_estimada_pago) + '</b>' : '') + '</div></div>'
        : '';
      const dist = rc.proxima_dist_fecha
        ? '<div style="margin-top:6px;font-size:12px">💸 Próxima distribución: <b>' + esc(rc.proxima_dist_fecha) + '</b>' + (rc.proxima_dist_monto != null ? ' · ' + $money(rc.proxima_dist_monto) : '') + '</div>'
        : (rc.ultima_dist_fecha ? '<div class="meta" style="margin-top:6px;font-size:11px">última distribución pagada: ' + esc(rc.ultima_dist_fecha) + (rc.ultima_dist_monto != null ? ' (' + $money(rc.ultima_dist_monto) + ')' : '') + '</div>'
          : '<div class="meta" style="margin-top:6px;font-size:11px">sin distribuciones programadas</div>');
      return '<div class="card" onclick="IP.casa=\'' + rc.property_id + '\';render()" style="cursor:pointer;margin:0' + (activa ? ';border-color:var(--a2)' : '') + '">'
        + '<div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline"><b>' + esc(rc.casa || '—') + '</b><span class="src">' + esc((rc.etapa || '—').replace(/_/g, ' ')) + '</span></div>'
        + '<div class="meta" style="margin-top:4px">' + (rc.avance_planner != null ? '🏗 obra ' + Math.round(rc.avance_planner) + '% · ' : '') + (rc.lider ? '👷 ' + esc(String(rc.lider).split(',')[0]) : '') + '</div>'
        + '<div style="margin-top:8px;font-size:13px">Invertiste <b>' + $money(rc.invertido) + '</b>' + (meses ? ' <span class="meta">hace ' + meses + '</span>' : '') + '</div>'
        + '<div style="margin-top:4px;font-size:12px">Flujo del último mes: ' + flujo + '</div>'
        + deficit + dist + '</div>';
    }).join('')
    + '</div></div>' : '';

  // ── ℹ definiciones (con los números de ESTA casa) ──
  const fx = (parts) => parts.map(x => '<div>' + x + '</div>').join('');
  const baseTag = met.cocBase === 'real' ? '<span class="src">real (últimos 12 meses de operación)</span>' : '<span class="src sup">modelo (año estabilizado — todavía sin rentas suficientes)</span>';
  IP.infoDefs = {
    coc: { t: 'Cash-on-Cash (CoC)', c: 'Cuánta plata en efectivo te genera la casa por cada dólar que pusiste, sin contar valorización ni amortización. Es el retorno "de bolsillo". Base: ' + baseTag + '.', f: fx([
      'Flujo anual de la casa = renta − gastos operativos − pagos de deuda = <b>' + $money(met.flujoAnualCasa) + '</b>' + (met.real ? ' <span class="meta">(promedio de ' + met.real.nMeses + ' meses reales × 12)</span>' : ''),
      'Tu parte (' + $pct(met.inv) + ') = <b>' + $money(met.flujoAnualCasa != null ? met.flujoAnualCasa * met.inv : null) + '</b> /año → <b>' + $money(met.cocMensual) + '</b> /mes',
      'CoC anual = tu flujo ÷ tu capital (' + $money(met.cap) + ') = <b>' + $pct(met.cocAnualPct) + '</b>']) },
    em: { t: 'Equity Multiple', c: 'Cuántas veces ya "vale" tu inversión: lo que recibiste en distribuciones más tu riqueza de hoy (capital + tu parte del equity y la valorización), dividido por lo que pusiste. 1.0× = empatás; 2.0× = duplicaste.', f: fx([
      'Distribuciones recibidas = <b>' + $money(met.distTotal) + '</b>',
      'Tu riqueza hoy = capital ' + $money(met.cap) + ' + equity amortizado ' + $money(met.abonoHoy * met.inv) + ' + valorización ' + $money(met.valHoy * met.inv) + ' = <b>' + $money(met.riquezaHoy) + '</b>',
      'Equity Multiple = (' + $money(met.distTotal) + ' + ' + $money(met.riquezaHoy) + ') ÷ ' + $money(met.cap) + ' = <b>' + (met.em != null ? met.em.toFixed(2) + '×' : '—') + '</b>']) },
    dist: { t: 'Distribuciones recibidas', c: 'Plata que ya te pagamos en efectivo por esta casa (utilidades, cash-out del refi o devolución de capital). Es 100% tuya — no se reparte.', f: fx(['Suma de distribuciones con estado "pagada" de esta casa = <b>' + $money(met.distTotal) + '</b> (' + met.distMias.length + ' pagos)']) },
    roi: { t: 'ROI anualizado', c: 'El crecimiento anual compuesto de tu inversión desde que entraste, contando distribuciones recibidas + tu riqueza de hoy. Compáralo con lo que te daría el banco o la bolsa.', f: fx([
      'Equity Multiple = <b>' + (met.em != null ? met.em.toFixed(2) + '×' : '—') + '</b> en ' + (met.mesesInv || '—') + ' meses',
      'ROI anualizado = (multiple)^(12÷meses) − 1 = <b>' + $pct(met.roiAnu) + '</b>' + (met.roiAnu == null ? ' <span class="meta">(se calcula con al menos 3 meses de historia)</span>' : '')]) },
    dscr: { t: 'DSCR — cobertura de la deuda', c: 'Cuántas veces la operación de la casa cubre la cuota del banco. Arriba de 1.20× el banco está tranquilo y sobra plata; abajo de 1.0× la renta no alcanza para la cuota.', f: fx([
      'NOI anual (renta − gastos operativos · <b>' + rentaLbl + '</b>) = <b>' + $money(iNoi) + '</b>',
      'Cuota mensual del banco = <b>' + $money(r.banco.cuota) + '</b>',
      // 3B: en rehab (NOI ≤ 0 / sin cuota) el DSCR no aplica — antes salía "-Infinity"
      iDscr != null ? 'DSCR = (NOI ÷ 12) ÷ cuota = <b>' + iDscr.toFixed(2) + '×</b>'
        : '<b>Aún no aplica</b> — ' + esc(ipRehabTxt(i, 'razonDscr'))]) },
    cap: { t: 'CAP rate', c: 'El rendimiento de la casa como negocio puro, sin deuda: utilidad operativa anual dividida por el valor de la propiedad. Sirve para comparar contra otras propiedades del mercado.', f: fx([
      'NOI anual (<b>' + rentaLbl + '</b>) = <b>' + $money(iNoi) + '</b>',
      iCap != null ? 'CAP sobre valor = NOI ÷ valor (' + $money(p.arv * (1 + p.valorizacion)) + ') = <b>' + $pct(iCap) + '</b>'
        : '<b>Aún no aplica</b> — ' + esc(ipRehabTxt(i, 'razonCap')),
      iCapCosto != null ? 'CAP sobre costo (all-in) = <b>' + $pct(iCapCosto) + '</b>' : '']) },
    vpn: { t: 'VPN a 31 años', c: 'Cuánto vale HOY todo el flujo futuro del negocio (31 años de operación + venta al final), descontado al ' + $pct(p.retornoEsperado) + ' anual (tu retorno esperado). Positivo = el negocio le gana a tu alternativa.', f: fx([
      'Base oficial post-refi (como el Excel): año 0 = cash atrapado real, años 1–31 = operación',
      'VPN de la casa = <b>' + $money(i.vpn31PostRefi) + '</b> · tu parte (' + $pct(met.inv) + ') = <b>' + $money(i.vpn31PostRefi * met.inv) + '</b>']) },
    profit: { t: 'Profit del hold completo', c: 'La utilidad total proyectada de los 31 años: toda la operación + la venta terminal, después de pagar toda la deuda. Es el "premio final" del plan completo.', f: fx([
      'Σ flujos años 1–31 + venta terminal (' + $money(i.terminal) + ') + año 0',
      'Profit de la casa = <b>' + $money(i.profit.total) + '</b> · tu parte = <b>' + $money(i.profit.inversionista) + '</b> · empresa = ' + $money(i.profit.empresa)]) },
    riq: { t: 'Tu riqueza hoy', c: 'Foto de hoy: tu capital + lo que la casa ya amortizó de deuda (equity) + lo que se valorizó, multiplicado por tu participación.', f: fx([
      'Capital ' + $money(met.cap) + ' + equity amortizado ' + $money(met.abonoHoy * met.inv) + ' + valorización ' + $money(met.valHoy * met.inv) + ' = <b>' + $money(met.riquezaHoy) + '</b>',
      '<span class="meta">' + met.mesesDesde + ' meses desde el cierre · valorización ' + $pct(p.valorizacion) + '/año del modelo</span>']) },
  };

  // ── hero métricas con ℹ ──
  // Auditoría "Buffett" 2.7/2.9: la PRIMERA fila responde en 30 segundos
  // "cuánto puse · cuánto vale hoy · cuánto me pagaron · cuánto es en total"
  const hero = '<div class="grid k4" style="margin-top:14px">'
    + kpiI('Tu inversión', $money(met.cap), 'aportada el ' + sd(holding.fecha_entrada || cierre) + ' · participación <b>' + $pct(met.inv) + '</b>', '', null)
    + kpiI('Tu riqueza hoy', $money(met.riquezaHoy), 'lo que vale tu posición: capital + equity amortizado + valorización × tu %', 'up', 'riq')
    + kpiI('Distribuciones recibidas', $money(met.distTotal), met.distMias.length + ' pagos ya en tu bolsillo · ver pestaña 💸', met.distTotal > 0 ? 'up' : '', 'dist')
    + kpiI('Equity Multiple', met.em != null ? met.em.toFixed(2) + '×' : '—', 'retorno total: (recibido + riqueza hoy) ÷ capital · 1.0× = empatás', met.em != null && met.em >= 1 ? 'up' : '', 'em')
    + '</div>'
    + '<div class="grid k4" style="margin-top:14px">'
    + kpiI('Cash-on-Cash', $pct(met.cocAnualPct), (met.cocMensual != null ? $money(met.cocMensual) + ' /mes en tu bolsillo · ' : '') + (met.cocBase === 'real' ? 'con la operación real' : 'según el modelo (aún sin rentas)'), met.cocAnualPct != null && met.cocAnualPct > 0 ? 'up' : '', 'coc')
    + kpiI('ROI anualizado', $pct(met.roiAnu), met.roiAnu == null ? 'se calcula con 3+ meses de historia' : 'crecimiento anual compuesto desde tu entrada', met.roiAnu != null && met.roiAnu > 0 ? 'up' : '', 'roi')
    // 3B: casa en rehab / sin renta → estado honesto (antes: DSCR "-Infinity", equilibrio "Infinity%")
    + kpiI('DSCR', iDscr != null ? iDscr.toFixed(2) + '×' : '—',
      iDscr != null ? (iRentaReal ? 'renta real cubre la deuda' : 'la renta cubre la deuda') + (i.puntoEquilibrio != null ? ' · equilibrio: ' + $pct(i.puntoEquilibrio) + ' de ocupación' : '') : '🔨 ' + ipRehabTxt(i, 'razonDscr'),
      iDscr != null && iDscr >= 1.2 ? 'up' : 'warn', 'dscr')
    + kpiI('CAP rate', iCap != null ? $pct(iCap) : '—',
      iCap != null ? 'NOI ' + $money(iNoi) + ' ÷ valor · sobre costo ' + $pct(iCapCosto) + (iRentaReal ? ' · renta real' : '') : '🔨 ' + ipRehabTxt(i, 'razonCap'),
      '', 'cap')
    + '</div>'
    + '<div class="grid k4" style="margin-top:14px">'
    + kpiI('Tu VPN a 31 años', $money(i.vpn31PostRefi * met.inv), 'casa completa ' + $money(i.vpn31PostRefi) + ' · descuento ' + $pct(p.retornoEsperado), 'up', 'vpn')
    + kpiI('Tu Profit (hold 31a)', $money(i.profit.inversionista), 'utilidad total proyectada del plan completo, con venta al final', 'up', 'profit')
    // 3B item 5 (coherente con A1): en rehab no se muestra TIR anualizada — no hay operación que la sostenga
    + kpiI('TIR a 31 años', ipEnRehab(i) ? '—' : $pct(i.tir31PostRefi),
      ipEnRehab(i) ? '🔨 ' + ipRehabTxt(i) : 'retorno anual del hold completo (base post-refi del Excel)', ipEnRehab(i) ? 'warn' : 'up', null)
    + kpiI('Escenario', escenario === 'realizado' ? '✅ Real' : '🎯 Proyectado', escenario === 'realizado' ? movsCasa.length + ' movimientos reales cargados' : 'premisas del modelo — lo real se carga desde administración', '', null)
    + '</div>';

  // ── info del deal ──
  const estrategia = txt(P, 'estrategia'), planSalida = txt(P, 'plan_salida'), lender = txt(P, 'refi_lender');
  // E3: nunca "sin dato" en estrategia/plan — "Pendiente de definir"; HML en líneas separadas
  // (compra vs rehab/escrow) SIN duplicar montos; casos borde declarados
  const pend = v => (v == null || String(v).trim() === '') ? '<span class="warn" title="el equipo todavía no lo definió">Pendiente de definir</span>' : esc(v);
  const hmC = num(P, 'hm_compra', null), hmR = num(P, 'hm_rehab', null);
  let hmLineas;
  if (hmC == null && hmR == null) {
    hmLineas = p.hmInicial
      ? '<div class="kv"><span>Hard Money' + srcChip(P, 'hm_inicial') + '</span><b>' + $money(p.hmInicial) + (p.hmTasa ? ' @ ' + $pct2(p.hmTasa) : '') + '</b></div>'
      : '<div class="kv"><span>Hard Money</span><b><span class="warn">Pendiente</span></b></div>';
  } else {
    hmLineas = '<div class="kv"><span>HML para compra' + srcChip(P, 'hm_compra') + '</span><b>'
      + (hmC == null ? '<span class="warn">Pendiente</span>' : (hmC === 0 ? 'Compra: cash <span class="meta">(sin HML en la compra)</span>' : $money(hmC) + (p.hmTasa ? ' @ ' + $pct2(p.hmTasa) : ''))) + '</b></div>'
      + '<div class="kv"><span>HML para rehab (escrow)' + srcChip(P, 'hm_rehab') + '</span><b>'
      + (hmR == null ? '<span class="warn">Pendiente</span>' : $money(hmR)) + '</b></div>';
  }
  const dealInfo = '<div class="grid k2" style="margin-top:14px">'
    + '<div class="card"><div class="chart-h"><div class="t">Info del deal</div><div class="k">' + esc(dir) + '</div></div>'
    + '<div class="kv"><span>Estrategia' + srcChip(P, 'estrategia') + '</span><b>' + pend(estrategia) + '</b></div>'
    + '<div class="kv"><span>Estado' + srcChip(P, 'estado_casa') + '</span><b>' + sd(estado) + '</b></div>'
    + '<div class="kv"><span>Tu % de equity</span><b>' + $pct(met.inv) + '</b></div>'
    + '<div class="kv"><span>Compra' + srcChip(P, 'compra') + '</span><b>' + $money(p.compra || null) + (cierre ? ' <span class="meta">(' + esc(cierre) + ')</span>' : '') + '</b></div>'
    + hmLineas
    + '<div class="kv"><span>ARV (valor remodelada)' + srcChip(P, 'arv') + '</span><b>' + $money(p.arv || null) + '</b></div>'
    + '<div class="kv"><span>Refinanciación' + srcChip(P, 'refi_monto') + '</span><b>' + (p.refiMes != null ? $money(p.refiMonto) + ' @ ' + $pct(p.refiTasa) + ' · ' + Math.round(p.refiPlazoM / 12) + ' años' : '<span class="warn">Pendiente</span>') + '</b></div>'
    + '<div class="kv"><span>Plan de salida' + srcChip(P, 'plan_salida') + '</span><b style="max-width:60%;text-align:right;font-weight:600;font-size:11.5px">' + pend(planSalida) + '</b></div>'
    + '<div class="kv"><span>Próxima actualización</span><b>' + prox1.toISOString().slice(0, 10) + ' <span class="meta">(1° de mes)</span></b></div>'
    + '</div>'
    + renderRefiCard(pid, P, p, r, met, lender)
    + '</div>';

  // ── línea de tiempo del retorno ──
  const tl = renderTimeline(pid, P, p, r, met, cierre);

  // ── P&L + desembolso del banco + reparto ──
  const est = r.anios[2] || r.anios[1];
  const allIn = p.compra + p.cierreCompra + Object.values(p.draws).reduce((s, v) => s + v, 0) + Object.values(p.otrosInversionMes).reduce((s, v) => s + v, 0);
  const fin2 = est.cuota + p.seguroMes * 12;
  const taxesOn = (p.impRentaPct || 0) > 0;
  const hmTotal = p.hmInicial + Object.values(p.draws).reduce((s, v) => s + v, 0);
  const cashoutReal = num(P, 'cashout_real', null);
  const cashoutCalc = p.refiMes != null ? p.refiMonto - (p.cierreRefi || 0) - hmTotal : null;
  const cashout = cashoutReal != null ? cashoutReal : cashoutCalc;
  const deficitCiclo = i.fases && i.fases.fase0 ? i.fases.fase0.deficitMax : null;
  const pnl = '<div class="grid k2" style="margin-top:14px">'
    + '<div class="card"><div class="chart-h"><div class="t">P&amp;L del modelo — año estabilizado</div><div class="k">año 2 · precios de hoy + inflación</div></div>'
    + '<div class="kv"><span>Ingresos (renta)</span><b class="up">' + $money(est.ingreso) + '</b></div>'
    + '<div class="kv"><span>Gastos operativos</span><b class="down">−' + $money(est.operativos) + '</b></div>'
    + '<div class="kv"><span>Impuestos <span class="src' + (taxesOn ? '' : ' sup') + '">' + (taxesOn ? 'renta + propiedad' : 'solo propiedad — imp. renta apagado') + '</span></span><b class="down">−' + $money(est.impuestos) + '</b></div>'
    + '<div class="kv"><span>Financieros (cuota banco + seguro)</span><b class="down">−' + $money(fin2) + '</b></div>'
    + '<div class="kv" style="border-top:2px solid var(--glassb)"><span><b>Utilidad anual de la casa</b></span><b class="' + (est.fclNegocio >= 0 ? 'up' : 'down') + '">' + $money(est.fclNegocio) + '</b></div>'
    + '<div class="kv"><span>→ Tu parte (' + $pct(met.inv) + ')</span><b class="' + (est.fclNegocio >= 0 ? 'up' : 'down') + '">' + $money(est.fclNegocio * met.inv) + '</b></div>'
    + '<div class="kv"><span>→ Empresa (' + $pct(1 - met.inv) + ')</span><b>' + $money(est.fclNegocio * (1 - met.inv)) + '</b></div>'
    + '<div class="lab" style="margin-top:12px">Hold completo (31 años)</div>'
    + '<div class="kv"><span>Costo de inversión (all-in)</span><b>' + $money(allIn) + '</b></div>'
    + '<div class="kv"><span>Profit total (con venta terminal)</span><b class="up">' + $money(i.profit.total) + '</b></div>'
    + '<div class="kv"><span>ROI sobre cash invertido</span><b class="up">' + $pct(i.roi) + '</b></div>'
    + '</div>'
    + '<div class="card"><div class="chart-h"><div class="t">Desembolso del banco &amp; ciclo</div><div class="k">de dónde salió y volvió la plata</div></div>'
    + '<div class="kv"><span>Hard Money desembolsado (compra + draws)</span><b>' + $money(hmTotal || null) + '</b></div>'
    + '<div class="kv"><span>Préstamo del refi (banco nuevo)</span><b>' + (p.refiMes != null ? $money(p.refiMonto) : SD) + '</b></div>'
    + '<div class="kv"><span>Cash-out del refi' + (cashoutReal != null ? srcChip(P, 'cashout_real') : ' <span class="src sup">calculado</span>') + '</span><b class="' + (cashout != null && cashout >= 0 ? 'up' : 'down') + '">' + $money(cashout) + '</b></div>'
    + '<div class="kv"><span>' + (deficitCiclo != null && deficitCiclo < 0 ? 'Cash máximo usado en el ciclo (mes ' + i.fases.fase0.mes + ') <span class="src sup">modelo</span>' : 'Superávit del ciclo <span class="src sup">modelo</span>') + '</span><b class="' + (deficitCiclo != null && deficitCiclo < 0 ? 'down' : 'up') + '">' + $money(deficitCiclo) + '</b></div>'
    + '<div class="kv"><span>Cash atrapado post-refi (año 0 oficial)' + srcChip(P, 'anio0_postrefi') + '</span><b>' + $money(i.anio0PostRefi) + '</b></div>'
    + '<div class="lab" style="margin-top:12px">Recuperación (análisis de 3 fases)</div>'
    + '<div class="kv"><span>Fase 1 · la operación cubre el déficit</span><b>' + (i.fases.fase1.anio ? 'año ' + i.fases.fase1.anio : 'no en 31 años') + '</b></div>'
    + '<div class="kv"><span>Fase 2 · recuperás tu capital solo con utilidades</span><b>' + (i.fases.fase2.anio ? 'año ' + i.fases.fase2.anio : 'vía patrimonio / venta / refi') + '</b></div>'
    + (i.fases.fase2.nota ? '<div class="meta" style="margin-top:6px">' + esc(i.fases.fase2.nota) + '</div>' : '')
    + '</div></div>';

  // ── tesis + gráficas ──
  const tesis = '<div class="card" style="margin-top:14px"><div class="chart-h"><div class="t">La tesis: riqueza a largo plazo, no solo el año 1</div><div class="k">amortización + rentabilidad + valorización · tu parte al ' + $pct(met.inv) + '</div></div>'
    + '<div class="grid k3">'
    + kpiI('Tu patrimonio año 5', $money(r.anios[5].patrimonioInv), 'equity de la casa × tu %', '', null)
    + kpiI('Tu patrimonio año 10', $money(r.anios[10].patrimonioInv), '', '', null)
    + kpiI('Tu patrimonio año 31', $money(r.anios[Math.min(31, r.anios.length - 1)].patrimonioInv), 'deuda en $0 — la casa es tuya en un ' + $pct(met.inv), '', null)
    + '</div></div>';
  const charts = '<div class="grid k2" style="margin-top:14px">'
    + '<div class="card"><div class="chart-h"><div class="t">1 · Tu riqueza año a año</div><div class="k">amortización + rentabilidad + valorización (tu parte)</div></div><div style="position:relative;overflow:hidden;height:300px;width:100%"><canvas id="ch1"></canvas></div></div>'
    + '<div class="card"><div class="chart-h"><div class="t">2 · Evolución del patrimonio</div><div class="k">valor vs deuda (desapalancamiento)</div></div><div style="position:relative;overflow:hidden;height:300px;width:100%"><canvas id="ch2"></canvas></div></div>'
    + '<div class="card"><div class="chart-h"><div class="t">3 · Ingresos vs deuda fija</div><div class="k">la inflación trabaja para vos (DSCR crece)</div></div><div style="position:relative;overflow:hidden;height:300px;width:100%"><canvas id="ch3"></canvas></div></div>'
    + '<div class="card"><div class="chart-h"><div class="t">4 · Utilidad acumulada</div><div class="k">negativa al inicio, compuesta después (tu parte)</div></div><div style="position:relative;overflow:hidden;height:300px;width:100%"><canvas id="ch4"></canvas></div></div>'
    + '</div>'
    + '<div class="card" style="margin-top:14px"><div class="chart-h"><div class="t">5 · Gastos: operativos · impuestos · financieros</div><div class="k">transparencia total (casa completa)</div></div><div style="position:relative;overflow:hidden;height:260px;width:100%"><canvas id="ch5"></canvas></div></div>';

  // ── comparativo de escenarios (solo lectura) ──
  const escTable = renderEscenarios(pid, P, p, movsCasa);

  // ── transparencia de gastos + ciclo mensual del modelo ──
  const gastosCard = '<div class="grid k2" style="margin-top:14px">'
    + '<div class="card"><div class="chart-h"><div class="t">Transparencia de gastos — ítem por ítem</div><div class="k">cada parámetro con su fuente</div></div>'
    + [['mantenimiento_mes', 'Mantenimiento /mes'], ['servicios_mes', 'Servicios públicos /mes'], ['hoa_mes', 'HOA /mes'], ['padsplit_pct', 'PADSPLIT (% ingreso)'], ['comision_pct', 'Comisión (% ingreso)'], ['imp_propiedad_pct', 'Impuesto propiedad (anual s/ avalúo)'], ['imp_renta_pct', 'Impuesto a la renta (s/ utilidad)'], ['seguro_mes', 'Seguro /mes'], ['cierre_compra', 'Gastos de cierre compra'], ['refi_tasa', 'Tasa refi 30 años'], ['hm_tasa', 'Tasa Hard Money']]
      .map(([k, lab]) => { const rr = P[k]; if (!rr) return '<div class="kv"><span>' + lab + '</span><b>' + SD + '</b></div>'; const v = parseFloat(rr.value); const isPct = /pct|tasa/.test(k); return '<div class="kv"><span>' + lab + srcChip(P, k) + '</span><b>' + (isPct ? $pct(v) : $money(v)) + '</b></div>'; }).join('')
    + '</div>'
    + '<div class="card overx"><div class="chart-h"><div class="t">Flujo del ciclo (modelo, mes 0–' + p.cicloMeses + ')</div><div class="k">' + (movsCasa.length ? 'con movimientos reales cargados' : 'proyección — lo real vive en 📅 Flujo Mensual') + '</div></div>'
    + '<table><thead><tr><th>Mes</th><th>Ocup.</th><th>Ingreso</th><th>Gastos</th><th>Financiación</th><th>FCL</th></tr></thead><tbody>'
    + r.meses.map(x => '<tr><td>m' + x.m + '</td><td>' + Math.round(x.ocupacion * 100) + '%</td><td>' + $money(x.ingreso) + '</td><td>' + $money(-(x.operativos + x.impPropiedad + x.impRenta)) + '</td><td>' + $money(x.fin) + '</td><td class="' + (x.fclNegocio >= 0 ? 'up' : 'down') + '">' + $money(x.fclNegocio) + '</td></tr>').join('')
    + '</tbody></table></div></div>';

  const disclaimer = '<div class="meta" style="margin-top:16px;opacity:.75">Proyección del modelo financiero (valorización ' + $pct(p.valorizacion) + '/año · inflación ' + $pct(p.inflacion) + ' · descuento ' + $pct(p.retornoEsperado) + ') — no constituye garantía de retorno. <span class="src">real</span> = dato de la operación · <span class="src sup">supuesto</span> = premisa en calibración. Los faltantes dicen "sin dato" y se cargan desde administración — este portal nunca inventa números.</div>';

  // 3B: aviso honesto arriba de todo cuando la casa todavía no cobra renta
  const rehabBanner = ipEnRehab(i)
    ? '<div class="card" style="margin-top:10px;border-color:var(--amber)"><div style="font-size:12.5px;line-height:1.6">'
      + '<b>🔨 Esta casa está en fase de rehab.</b> Todavía no cobra renta, así que los indicadores que se calculan sobre la renta '
      + '(<b>DSCR</b>, <b>CAP rate</b>, punto de equilibrio y la TIR anualizada) <b>aún no aplican</b> — no son malos números, es que todavía no hay operación que medir. '
      + 'Aparecen solos en cuanto la casa empiece a rentar. Mientras tanto lo que vale es tu <b>capital invertido</b>, el <b>costo total</b> y el <b>valor en papel</b>.'
      + '</div></div>'
    : '';
  return saludo + resumenCards + '<h1 style="font-size:18px;margin-top:6px">' + esc(dir.split(',')[0]) + ' <span>· tu inversión en detalle</span></h1>'
    + rehabBanner + hero + renderIndicadores(pid, met) + dealInfo + tl + pnl + tesis + charts + escTable + gastosCard + disclaimer;
}

// ─── 🏡 MI CASA: mini-dashboard simple por casa (misma estructura de 5 secciones
// que los ejecutivos, en versión entendible; ⓘ del glosario en todo) ───
// ─── 📈 PARTE 1: Panel de Rendimiento (Robinhood) — números REALES, proyecciones etiquetadas ───
function ipSetHor(n) { IP.rendHor = n; render(); }
window.ipSetHor = ipSetHor;
function ipRendPaneles() {
  if (!window.invRend || !window.invEsc) return [];
  invRend.setEsc(invEsc);
  const hoy = new Date().toISOString().slice(0, 10);
  const N = IP.rendHor || 5;
  return (IP.holdings || []).map(h => {
    let ind = (IP.indData || []).find(x => x.property_id === h.property_id);
    if (!ind) return null;
    const Pnest = IP.params[h.property_id] || {};
    const Pv = {}; Object.keys(Pnest).forEach(k => Pv[k] = Pnest[k].value);
    // B3: si hay override manual del precio de compra (inv_param_overrides), prevalece sobre Airtable
    if (Pv.compra != null && isFinite(+Pv.compra)) ind = { ...ind, compra: +Pv.compra };
    const dists = (IP.dists || []).filter(d => d.property_id === h.property_id && d.estado === 'pagada').map(d => ({ fecha: d.fecha, monto: +d.monto }));
    return invRend.panel({ ind, Pv, holding: h, distribuciones: dists, hoy }, IP.escCfg || {}, N);
  }).filter(Boolean);
}
function ipRendCard(pnl) {
  const N = pnl.horizonte.anios, x2 = v => v == null ? '—' : v.toFixed(2) + 'x';
  const proyBadge = pnl.esProyeccion
    ? '<span class="src sup" title="no hay avalúo cargado — valor proyectado a tasa supuesta">proyección</span>'
    : '<span class="src" title="valor de avalúo/ARV real">' + esc(pnl.valorFuente || 'avalúo') + '</span>';
  const fuente = (ic, lab, val, sub, tipTxt, cls) => '<div class="kv"><span title="' + esc(tipTxt) + '" style="cursor:help">' + ic + ' ' + lab + (sub ? ' <span class="meta">' + sub + '</span>' : '') + '</span><b class="' + (cls || '') + '">' + val + '</b></div>';
  const flows = pnl.horizonte.flows.map(f => '<div class="kv" style="font-size:11px;padding:2px 0"><span>' + esc(f.fecha) + '</span><b class="' + (f.monto >= 0 ? 'up' : 'down') + '">' + (f.monto >= 0 ? '+' : '') + $money(f.monto) + '</b></div>').join('');
  const spGana = pnl.horizonte.multiplo != null && pnl.horizonte.multiplo > pnl.sp500.multiplo;
  return '<div class="card" style="margin-bottom:12px">'
    + '<div class="chart-h"><div class="t">' + esc(pnl.casa || '') + '</div><div class="k">tu inversión ' + $money(pnl.capital) + ' · ' + $pct(pnl.pct) + ' de la casa · valor hoy ' + $money(pnl.valorActual) + ' ' + proyBadge + '</div></div>'
    + '<div class="grid k2">'
    + '<div><div class="lab" style="margin-bottom:4px">Tus 4 fuentes de ganancia</div>'
    + fuente('💵', 'Flujo cobrado', $money(pnl.fuentes.flujo), null, 'Distribuciones que ya te pagaron (real).', 'up')
    + fuente('📈', 'Apreciación', $money(pnl.fuentes.apreciacion), pnl.fuentes.apreciacionCAGR != null ? $pct(pnl.fuentes.apreciacionCAGR) + '/año' : '', 'Cuánto subió el valor de tu parte desde la compra' + (pnl.esProyeccion ? ' (proyectado)' : ' (avalúo real)') + '.', 'up')
    + fuente('🏦', 'Amortización', $money(pnl.fuentes.amortizacion), '"se paga sola"', 'Capital del préstamo que se paga con la renta — tu parte.', 'up')
    + fuente('💸', 'Cash-out del refi', pnl.fuentes.cashout != null ? $money(pnl.fuentes.cashout) : '—', pnl.fuentes.cashout == null ? 'por completar' : '', 'Capital que te devolvió el refinanciamiento (baja tu plata en riesgo).', '')
    + '<div class="kv" style="border-top:2px solid var(--glassb)"><span><b>Retorno total</b></span><b class="' + (pnl.retornoTotal >= 0 ? 'up' : 'down') + '">' + $money(pnl.retornoTotal) + ' <span class="meta">(' + $pct(pnl.retornoTotalPct) + ')</span></b></div>'
    + '<div class="kv"><span title="flujo cobrado ÷ tu capital, anualizado" style="cursor:help">Cash-on-cash</span><b>' + $pct(pnl.cocAnual) + '/año <span class="meta">· ' + $pct(pnl.cocMensual) + '/mes</span></b></div>'
    + '</div>'
    + '<div><div class="lab" style="margin-bottom:4px">Si vendés en ' + N + ' años <span class="src sup">proyección · supuesto</span></div>'
    + '<div class="kv"><span>Precio de venta estimado</span><b>' + $money(pnl.horizonte.precioVenta) + '</b></div>'
    + '<div class="kv"><span>− costo de venta + payoff deuda</span><b class="down">−' + $money((pnl.horizonte.costoVenta || 0) + (pnl.horizonte.payoff || 0)) + '</b></div>'
    + '<div class="kv"><span><b>Neto para vos</b></span><b class="up">' + $money(pnl.horizonte.netoInv) + '</b></div>'
    + '<div class="kv"><span title="cuánto rendiría tu plata al año SI se vende en ' + N + ' años (supuesto, no promesa)" style="cursor:help">TIR proyectada (' + N + ' años) <span class="src sup">supuesto</span></span><b>' + $pct(pnl.horizonte.tir) + '</b></div>'
    + '<div class="kv"><span title="por cada $1 que pusiste, cuánto volvería con la venta" style="cursor:help">Múltiplo proyectado</span><b>' + x2(pnl.horizonte.multiplo) + '</b></div>'
    + '<div class="kv"><span>vs S&amp;P 500 <span class="meta">(' + $pct(pnl.sp500.tasa) + ', ilustración)</span></span><b class="' + (spGana ? 'up' : '') + '">' + x2(pnl.sp500.multiplo) + (spGana ? ' · tu casa rinde más' : '') + '</b></div>'
    + '</div></div>'
    + (pnl.realizado.distAcum === 0 ? '<div class="meta" style="margin-top:8px;padding:7px 10px;border:1px solid var(--glassb);border-radius:8px">🏗 <b>En fase de rehab/estabilización</b> — todavía no recibiste distribuciones. Lo realizado hoy es tu equity en papel (RVPI ' + x2(pnl.rvpi) + '); los números de venta de arriba son <b>proyección</b>, no promesa.</div>' : '')
    + '<details style="margin-top:8px"><summary style="cursor:pointer;font-size:11px;color:var(--a2)">ver los flujos que alimentan la TIR</summary><div style="margin-top:6px">' + (flows || '<div class="meta">sin flujos aún</div>') + '<div class="meta" style="font-size:10px;margin-top:4px">−tu capital al comprar · +distribuciones reales fechadas · +neto de venta al horizonte (supuesto)</div></div></details>'
    + (pnl.esProyeccion ? '<div class="meta" style="margin-top:6px;font-size:10.5px;color:var(--amber)">⚠ Sin avalúo cargado: la apreciación es proyección a ' + $pct(pnl.supuestos.apreciacion) + '/año (editable por administración).</div>' : '')
    + (pnl.yrsHeld != null && pnl.yrsHeld < 1 ? '<div class="meta" style="font-size:10.5px">ℹ La TIR realizada anualiza menos de un año — puede verse extrema; leé el escenario de venta a ' + N + ' años para una lectura estable.</div>' : '')
    + '</div>';
}
function renderRendimiento() {
  if (!window.invRend || !window.invEsc || !IP.escCfg) return '<div class="empty">Cargando el panel de rendimiento…</div>';
  const N = IP.rendHor || 5;
  const paneles = ipRendPaneles();
  if (!paneles.length) return '<div class="empty">Todavía no hay datos de rendimiento para tus casas.</div>';
  const agg = invRend.portafolio(paneles, new Date().toISOString().slice(0, 10));
  const horSel = (window.HORIZONTES || [3, 5, 8]).map(n => '<button class="ibtn' + (N === n ? ' on' : '') + '" onclick="ipSetHor(' + n + ')">' + n + ' años</button>').join('');
  const tip = t => ' <span class="src" title="' + esc(t) + '" style="cursor:help">ⓘ</span>';
  const banner = '<div style="padding:8px 12px;border:1px solid rgba(245,178,61,.45);background:rgba(245,178,61,.08);border-radius:9px;font-size:11.5px;color:var(--amber);margin-bottom:12px">📈 <b>Realizado</b> = distribuciones ya pagadas + avalúo real. <b>Proyectado</b> (venta futura, apreciación, S&amp;P 500) = <b>supuestos editables</b>, no promesas. Apreciación ' + $pct(IP.escCfg.apreciacion_anual) + '/año · costo de venta ' + $pct(IP.escCfg.costo_venta) + ' · S&amp;P ' + $pct(IP.escCfg.sp500_anual) + '.</div>';
  const kpi = (lab, val, sub, cls) => '<div class="card"><div class="lab">' + lab + '</div><div class="big ' + (cls || '') + '">' + val + '</div>' + (sub ? '<div class="meta">' + sub + '</div>' : '') + '</div>';
  const x2 = v => v == null ? '—' : v.toFixed(2) + 'x';
  // A3: el TITULAR lidera con lo REALIZADO — capital, distribuciones (DPI), equity en papel (RVPI), TVPI.
  const resumen = '<div class="grid k4">'
    + kpi('Capital invertido' + tip('la plata que pusiste en total'), $money(agg.capitalT), agg.n + ' casas', '')
    + kpi('Distribuciones recibidas' + tip('lo que ya te pagaron (realizado). DPI = por cada $1 que pusiste'), $money(agg.distT), 'DPI ' + x2(agg.dpi), agg.distT > 0 ? 'up' : '')
    + kpi('Tu equity hoy (en papel)' + tip('valor actual de tu parte menos la deuda. RVPI = por cada $1'), $money(agg.equityT), 'RVPI ' + x2(agg.rvpi), 'up')
    + kpi('TVPI' + tip('DPI + RVPI: por cada $1 que pusiste, cuánto vale hoy tu inversión (recibido + papel)'), x2(agg.tvpi), 'recibido + papel', agg.tvpi != null && agg.tvpi >= 1 ? 'up' : '')
    + '</div>'
    // TIR anualizada de la cartera: secundaria y SOLO si el hold es representativo (≥1 año)
    + '<div class="card" style="margin-top:12px"><div class="kv" style="border:none;padding:0"><span>' + (agg.tirCorto
        ? '📊 <b>En fase de valorización</b> — la TIR anualizada de tu cartera <b>aún no es representativa</b> (hold promedio < 1 año). El número que importa hoy es el <b>TVPI (' + x2(agg.tvpi) + ')</b>: por cada $1 que pusiste, tenés eso en recibido + papel.'
        : 'TIR anualizada de tu cartera (realizada, con flujos reales fechados)') + '</span>'
      + (agg.tirCorto ? '' : '<b class="up" style="font-size:16px">' + $pct(agg.tir) + '</b>') + '</div></div>';
  const hasDists = (IP.dists || []).some(d => d.estado === 'pagada' && (IP.holdings || []).some(h => h.property_id === d.property_id));
  const chart = hasDists
    ? '<div class="card" style="margin-top:14px"><div class="chart-h"><div class="t">Flujo real que te pagaron (acumulado)</div><div class="k">solo distribuciones pagadas — 100% real</div></div><div style="position:relative;height:240px;width:100%;overflow:hidden"><canvas id="chRend"></canvas></div></div>'
    : '<div class="card" style="margin-top:14px"><div class="meta">Cuando empiecen a pagarte distribuciones, acá vas a ver tu flujo real acumulado en el tiempo.</div></div>';
  return '<div style="display:flex;gap:8px;align-items:center;margin-bottom:12px;flex-wrap:wrap"><b style="font-size:15px">📈 Tu rendimiento</b><span class="meta">horizonte de venta:</span>' + horSel + '</div>'
    + banner + resumen + chart
    + '<div class="lab" style="margin:18px 0 8px">Por propiedad · las 4 fuentes de ganancia + escenario de venta a ' + N + ' años</div>'
    + paneles.map(ipRendCard).join('');
}
function drawRendChart() {
  const el = document.getElementById('chRend'); if (!el || !window.Chart) return;
  const light = ipTheme() === 'light';
  const all = (IP.dists || []).filter(d => d.estado === 'pagada' && (IP.holdings || []).some(h => h.property_id === d.property_id))
    .map(d => ({ fecha: String(d.fecha).slice(0, 10), monto: +d.monto })).sort((a, b) => a.fecha.localeCompare(b.fecha));
  let acc = 0; const labels = [], data = [];
  all.forEach(d => { acc += d.monto; labels.push(d.fecha); data.push(Math.round(acc)); });
  IP.charts.push(new Chart(el, { type: 'line', data: { labels, datasets: [{ label: 'Flujo acumulado (real)', data, borderColor: '#4f8dff', pointRadius: 3, fill: true, backgroundColor: 'rgba(79,141,255,.10)', stepped: true }] }, options: { responsive: true, maintainAspectRatio: false, resizeDelay: 200, plugins: { legend: { labels: { color: light ? '#475569' : '#93a0b6', boxWidth: 10, font: { size: 10 } } } }, scales: { x: { ticks: { color: light ? '#64748b' : '#5b6780', font: { size: 9 } } }, y: { ticks: { color: light ? '#64748b' : '#5b6780', font: { size: 9 } } } } } }));
}
function renderCasaDash(pid, P, holding, p, r, dir) {
  if (IP.ledger[pid] === undefined) ipLoadLedger(pid, true);
  const met = ipMetrics(pid, p, r, holding);
  const hoy = new Date().toISOString().slice(0, 10);
  const cAll = (IP.indData || []).map(x => (window.invInd ? invInd.casa(x, hoy) : x));
  const c = cAll.find(x => x.property_id === pid) || null;
  const rc = (IP.resumen || []).find(x => x.property_id === pid) || {};
  const vals = { capital: $money(met.cap), residual: c && c.equityHoy != null ? $money(Math.max(0, c.equityHoy) * met.inv) : '—', dist: $money(met.distTotal), tvpi: met.em != null ? met.em.toFixed(2) + 'x' : '—', paper: c ? $money(c.paper_value) : '—', paper_fuente: c ? String(c.paper_fuente || '') : '—', tir: c ? (c.tirNA ? 'n/a (muy reciente)' : $pct(c.tirActivo)) : '—' };
  const card5 = (lab, clave, val, linea, cls) => '<div class="card" style="margin:0"><div class="lab">' + lab + (clave ? gI(clave, vals) : '') + '</div><div class="big ' + (cls || '') + '">' + val + '</div><div class="meta" style="font-size:10.5px">' + linea + '</div></div>';
  const sec1 = '<div style="padding:8px 12px;border:1px solid rgba(245,178,61,.45);background:rgba(245,178,61,.08);border-radius:9px;font-size:11.5px;color:var(--amber);margin-bottom:10px">📄 "Lo que vale tu casa" es <b>valor en papel</b> (' + esc(vals.paper_fuente) + ') — se vuelve ganancia real al vender o refinanciar.</div>'
    + '<div class="grid k5" style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px">'
    + card5('Tu inversión', null, $money(met.cap), 'lo que pusiste · ' + $pct(met.inv) + ' de la casa')
    + card5('Lo que vale tu casa hoy', 'paper_value', c ? $money(c.paper_value) : SD, 'en papel · fuente: ' + esc(vals.paper_fuente))
    + card5('Tu riqueza hoy', 'equity', $money(met.riquezaHoy), 'capital + equity + valorización × tu %', 'up')
    + card5('Lo que te han pagado', 'distribucion', $money(met.distTotal), met.distMias.length + ' pagos — 100% tuyos', met.distTotal > 0 ? 'up' : '')
    + card5('Tu retorno', 'tvpi', (met.em != null ? met.em.toFixed(2) + '×' : '—'), c && c.tirNA ? 'TIR n/a: la casa es muy reciente para anualizar' : 'TIR de la casa: ' + vals.tir, met.em >= 1 ? 'up' : '')
    + '</div><style>@media(max-width:900px){.grid.k5{grid-template-columns:repeat(2,1fr)!important}}@media(max-width:560px){.grid.k5{grid-template-columns:1fr!important}}</style>';
  // 3 · tu casa en números simples (mes actual, solo P&L SÍ)
  const led = Array.isArray(IP.ledger[pid]) ? IP.ledger[pid] : [];
  const ym = hoy.slice(0, 7);
  const pnl = m => (window.invEngine ? invEngine.pnlSi(m.categoria) : ['renta', 'ingreso', 'operativo', 'tax'].includes(m.categoria));
  const rMes = led.filter(m => String(m.fecha || '').slice(0, 7) === ym && pnl(m) && m.tipo === 'ingreso').reduce((s, m) => s + +m.monto, 0);
  const gMes = led.filter(m => String(m.fecha || '').slice(0, 7) === ym && pnl(m) && m.tipo === 'gasto').reduce((s, m) => s + +m.monto, 0);
  const lender = txt(P, 'refi_lender');
  const deudaTxt = c && c.deuda_vigente != null
    ? $money(c.deuda_vigente) + ' <span class="meta">(' + (c.refinanciada ? 'banco a 30 años' + (lender ? ': ' + esc(lender) : '') : 'Hard Money') + ')</span>'
    : '<span class="warn" title="el equipo está registrando el préstamo">en registro</span>';
  const enObra = rc.etapa && !/rentada|refinanciad|vendida/i.test(rc.etapa);
  const sec3 = '<div class="card" style="margin:0"><div class="chart-h"><div class="t">Tu casa en números simples · ' + esc((window.invEngine && invEngine.mesEs) ? invEngine.mesEs(ym) : ym) + '</div><div class="k">solo operación (P&L SÍ) — los draws y la deuda no inflan esto</div></div>'
    + '<div class="kv"><span>Renta que produce' + gI('noi', vals) + '</span><b class="up">' + (rMes ? $money(rMes) : (enObra ? '<span class="warn">todavía no genera — en remodelación</span>' : $money(0))) + '</b></div>'
    + '<div class="kv"><span>Gastos del mes</span><b class="down">' + (gMes ? '−' + $money(gMes) : $money(0)) + '</b></div>'
    + '<div class="kv"><span><b>Balance operativo del mes</b></span><b class="' + (rMes - gMes >= 0 ? 'up' : 'down') + '">' + $money(rMes - gMes) + '</b></div>'
    + '<div class="kv"><span>Deuda de la casa' + gI('deuda_vigente', vals) + '</span><b>' + deudaTxt + '</b></div>'
    + (enObra ? '<div class="kv"><span>Etapa de la obra</span><b>' + esc((rc.etapa || '').replace(/_/g, ' ')) + (rc.avance_planner != null ? ' · ' + Math.round(rc.avance_planner) + '% de avance' : '') + '</b></div>' : '')
    + '</div>';
  // 4 · riesgos en lenguaje humano (solo lo que le afecta a ÉL)
  const riesgos = [];
  if (enObra && !rMes) riesgos.push('🔨 Tu casa está en remodelación — todavía no genera renta. Es lo normal en esta etapa: primero la obra, después la renta.');
  if (+rc.deficit > 0) riesgos.push('🕳 La operación usó ' + $money(rc.deficit) + ' más de lo que entró hasta ahora. Se cubre con la refinanciación o la venta' + (rc.fecha_estimada_pago ? ' (fecha estimada: ' + esc(rc.fecha_estimada_pago) + ')' : '') + '.');
  if (c && c.deuda_vigente == null && !c.vendida) riesgos.push('📋 El equipo está terminando de registrar el préstamo de esta casa — mientras tanto, algunos indicadores dicen "en registro" en vez de inventar un número.');
  if (!enObra && rMes && rMes - gMes < 0) riesgos.push('⚖️ Este mes la renta no alcanzó a cubrir los gastos — mirá el detalle en 📅 Flujo Mensual.');
  const sec4 = '<div class="card" style="margin:0"><div class="chart-h"><div class="t">Riesgos, en cristiano</div><div class="k">solo lo que afecta a TU casa</div></div>'
    + (riesgos.length ? riesgos.map(t => '<div style="padding:8px 0;border-top:1px solid var(--glassb);font-size:12.5px;line-height:1.55;color:var(--mut)">' + t + '</div>').join('') : '<div class="empty" style="padding:14px">Sin alertas para tu casa hoy 🎯</div>')
    + '</div>';
  // 5 · qué sigue
  const fExit = txt(P, 'fecha_exit_proyectada');
  const prox1 = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().slice(0, 10);
  const pend = v => (v == null || String(v).trim() === '') ? '<span class="warn">Pendiente de definir</span>' : esc(v);
  const sec5 = '<div class="card" style="margin:0"><div class="chart-h"><div class="t">Qué sigue</div></div>'
    + '<div class="kv"><span>Plan de salida' + gI('plan_salida', vals) + '</span><b>' + pend(txt(P, 'plan_salida')) + '</b></div>'
    + '<div class="kv"><span>Fecha proyectada del exit</span><b>' + pend(fExit) + (fExit ? ' <span class="src sup">estimado</span>' : '') + '</b></div>'
    + (rc.proxima_dist_fecha ? '<div class="kv"><span>Próxima distribución (estimada)</span><b>' + esc(rc.proxima_dist_fecha) + (rc.proxima_dist_monto != null ? ' · ' + $money(rc.proxima_dist_monto) : '') + '</b></div>' : '')
    + '<div class="kv"><span>Próxima actualización de datos</span><b>' + prox1 + ' <span class="meta">(1° de mes)</span></b></div>'
    + '</div>';
  // ── 🔮 ¿Y si vendemos? (escenarios 3/5/8 — TIR NETA post-waterfall, supuestos visibles) ──
  let secVender = '';
  if (window.invEsc && window.invEngine && IP.escCfg) {
    invEsc.setEngine(invEngine);
    const indRow = (IP.indData || []).find(x => x.property_id === pid);
    const h = IP.holdings.find(x => x.property_id === pid);
    if (indRow && h) {
      const Pv = {}; Object.keys(P).forEach(k => Pv[k] = P[k].value);
      const casaE = invEsc.desdeDatos(indRow, Pv, h);
      const e = invEsc.escenarios(casaE, IP.escCfg, [3, 5, 8]);
      const x2 = v => v == null ? '—' : v.toFixed(2) + 'x';
      const valsV = { ...vals };
      secVender = '<div class="card" style="margin:0">'
        + '<div style="padding:8px 12px;border:1px solid rgba(245,178,61,.45);background:rgba(245,178,61,.08);border-radius:9px;font-size:11.5px;color:var(--amber);margin-bottom:8px">🔮 Escenarios con <b>supuestos</b> (apreciación ' + $pct(e.supuestos.apreciacion) + '/año · renta +' + $pct(e.supuestos.crec_renta) + '/año · costo de venta ' + $pct(e.supuestos.costo_venta) + ' · vacancia ' + $pct(e.supuestos.vacancia) + ') — <b>no son promesas</b>.</div>'
        + (e.porCompletar
          ? '<div class="empty" style="padding:14px">Escenarios por completar: falta registrar ' + (!(+indRow.renta_anual > 0) ? 'la renta de esta casa (está en obra o sin espejo)' : 'el préstamo de esta casa') + ' — no inventamos números.</div>'
          : '<div class="overx"><table><thead><tr><th>Si vendemos en…</th><th style="text-align:right">Te tocaría de la venta' + gI('waterfall', valsV) + '</th><th style="text-align:right">Tu TIR (neta)' + gI('tir_neta', valsV) + '</th><th style="text-align:right">Tu múltiplo</th></tr></thead><tbody>'
            + e.filas.map(f => '<tr><td><b>' + f.n + ' años</b></td><td style="text-align:right" class="up">' + $money(f.reparto) + '</td><td style="text-align:right">' + $pct(f.irrNeta) + '</td><td style="text-align:right">' + x2(f.multNeto) + '</td></tr>').join('')
            + '</tbody></table></div>'
            + '<div class="meta" style="margin-top:8px;font-size:11px">El reparto devuelve primero TU capital y la ganancia se divide según tu ' + $pct(casaE.pct) + gI('waterfall', valsV) + ' · la TIR del deal completo (bruta' + gI('tir_bruta', valsV) + ') es mayor — la tuya es después del reparto. <b>Por cada $1 que pusiste, hoy vale ' + (met.em != null ? '$' + met.em.toFixed(2) : '—') + '</b>.</div>'
            + (e.flujoNegativo ? '<div class="meta" style="margin-top:4px;font-size:11px;color:var(--amber)">⚠ Hoy la renta no cubre la cuota — el plan contempla salir por refinanciación o venta (por eso vender más temprano rinde mejor acá).</div>' : ''))
        + '</div>';
    }
  }
  // ── 🏗 Cómo se crea valor en esta casa (NAV + valor forzado, estilo simple) ──
  let secValor = '';
  if (window.invEsc && window.invRend && IP.escCfg) {
    invEsc.setEngine(window.invEngine); invRend.setEsc(invEsc);
    const indRow = (IP.indData || []).find(x => x.property_id === pid);
    const h = IP.holdings.find(x => x.property_id === pid);
    if (indRow && h) {
      const Pv = {}; Object.keys(P).forEach(k => Pv[k] = P[k].value);
      let navEquity = null;
      try { const pnl = invRend.panel({ ind: indRow, Pv, holding: h, distribuciones: met.distMias.map(d => ({ fecha: d.fecha, monto: d.monto })), hoy }, IP.escCfg, IP.rendHor || 5); navEquity = pnl.equityActual; } catch (e) {}
      const vc = invEsc.valorCreado(invEsc.desdeDatos(indRow, Pv, h), IP.escCfg, navEquity);
      const deudaEnRegistro = c && c.deuda_vigente == null && !(c && c.vendida);
      const tt = t => ' <span class="src" title="' + esc(t) + '" style="cursor:help">ⓘ</span>';
      const capPct = $pct(vc.capMercado);
      const navHtml = (vc.nav != null && !deudaEnRegistro)
        ? '<div class="big up" style="font-size:26px">' + $money(vc.nav) + '</div>'
        : (deudaEnRegistro ? '<div class="warn" style="font-size:13px;font-weight:600">en registro — se calcula al cerrar el préstamo</div>' : '<div class="warn">' + SD + '</div>');
      const contratoBadge = vc.tipoContrato && vc.tipoContrato !== 'N/D'
        ? '<span class="src" title="NNN: el inquilino paga impuestos/seguro/mantenimiento (mayor NOI para el dueño). N/NN: el dueño asume más gastos." style="cursor:help">contrato ' + esc(vc.tipoContrato) + '</span>' : '';
      let cuerpoValor;
      if (vc.porCompletar) {
        cuerpoValor = '<div class="meta" style="padding:10px 12px;border:1px solid var(--glassb);border-radius:9px">🏗 Esta casa todavía no tiene renta registrada (está en obra o estabilizándose). El <b>valor creado</b> se calcula cuando empiece a producir — no inventamos un número.</div>';
      } else {
        cuerpoValor = '<div class="grid k2">'
          + '<div><div class="lab" style="margin-bottom:4px">NAV — valor de tu parte hoy' + tt('Cuánto vale tu parte hoy: valor de la casa menos la deuda, por tu porcentaje.') + '</div>'
          + navHtml
          + '<div class="meta" style="font-size:10.5px">(' + $money(vc.valorActual) + ' valor − ' + (vc.deuda != null ? $money(vc.deuda) : 'deuda en registro') + ' deuda) × ' + $pct(vc.pct) + ' tuyo · <b>en papel</b></div></div>'
          + '<div><div class="lab" style="margin-bottom:4px">Valor que creamos con la remodelación' + tt('El valor extra que se creó porque compramos y mejoramos por debajo del mercado.') + '</div>'
          + '<div class="big ' + (vc.spread >= 0 ? 'up' : 'down') + '" style="font-size:22px">' + (vc.spread >= 0 ? '+' : '−') + Math.abs(vc.spread * 100).toFixed(2) + ' pp</div>'
          + '<div class="meta" style="font-size:10.5px">≈ ' + $money(vc.valorForzado) + ' <span class="src sup">aprox., supuesto de cap de mercado ' + capPct + '</span></div></div></div>'
          + '<div style="margin-top:10px;padding:9px 12px;border:1px solid var(--glassb);border-radius:9px;font-size:12px;line-height:1.55;color:var(--mut)">Compramos y remodelamos a un rendimiento de <b>' + $pct(vc.yieldOnCost) + '</b>' + tt('El rendimiento sobre lo que costó comprar y remodelar (NOI ÷ costo total).') + ', mientras el mercado valora casas así a <b>' + capPct + '</b>' + tt('A qué rendimiento el mercado valora casas parecidas (supuesto, editable).') + '. Esa diferencia es <b>valor que se creó</b>.</div>'
          + '<div class="kv" style="margin-top:8px"><span>NOI — lo que renta después de gastos de operación, sin deuda' + tt('Lo que renta la casa después de gastos de operación, sin contar la deuda.') + '</span><b class="' + (vc.noi >= 0 ? 'up' : 'down') + '">' + $money(vc.noi) + '/año</b></div>';
      }
      secValor = '<div class="card" style="margin:0">'
        + '<div class="chart-h"><div class="t">Cómo se crea valor en esta casa</div><div class="k">' + contratoBadge + (contratoBadge ? ' · ' : '') + 'valores en papel · el cap de mercado es un supuesto editable</div></div>'
        + cuerpoValor + '</div>';
    }
  }
  const lab = t => '<div class="lab" style="margin:16px 0 8px">' + t + '</div>';
  // Item 19: datos REALES primero (operación del mes, riesgos, qué sigue), indicadores financieros y
  // proyecciones (paper value/TIR, riqueza modelada, cómo se crea valor, escenarios de venta) AL FINAL.
  return '<h1 style="font-size:18px">' + esc(dir.split(',')[0]) + ' <span>· tu casa de un vistazo</span></h1>'
    + lab('1 · Tu casa en números simples') + sec3
    + lab('2 · Riesgos') + sec4
    + lab('3 · Qué sigue') + sec5
    + lab('4 · Los 5 números de tu casa') + sec1
    + lab('5 · Tu riqueza en el tiempo') + '<div class="card" style="margin:0"><div style="position:relative;height:260px;width:100%;overflow:hidden"><canvas id="chCasa"></canvas></div><div class="meta" style="margin-top:6px;font-size:10.5px">tu parte año a año: amortización + rentabilidad + valorización (modelo)' + gI('valorizacion', vals) + '</div></div>'
    + (secValor ? lab('6 · Cómo se crea valor') + secValor : '')
    + lab('7 · ¿Y si vendemos?') + secVender;
}
function drawCasaChart(r, inv) {
  const el = document.getElementById('chCasa'); if (!el || !window.Chart) return;
  const light = ipTheme() === 'light';
  const A = r.anios.filter(x => x.a >= 1);
  IP.charts.push(new Chart(el, { type: 'line', data: { labels: A.map(x => 'año ' + x.a), datasets: [
    { label: 'Tu riqueza (patrimonio)', data: A.map(x => Math.round(x.patrimonioInv)), borderColor: '#4f8dff', pointRadius: 0, fill: true, backgroundColor: 'rgba(79,141,255,.10)' },
  ] }, options: { responsive: true, maintainAspectRatio: false, resizeDelay: 200, plugins: { legend: { labels: { color: light ? '#475569' : '#93a0b6', boxWidth: 10, font: { size: 10 } } } }, scales: { x: { ticks: { color: light ? '#64748b' : '#5b6780', font: { size: 9 } } }, y: { ticks: { color: light ? '#64748b' : '#5b6780', font: { size: 9 } } } } } }));
}

// ─── evento de refinanciación ───
function renderRefiCard(pid, P, p, r, met, lender) {
  if (p.refiMes == null) {
    return '<div class="card"><div class="chart-h"><div class="t">🔄 Evento de refinanciación</div><div class="k">todavía no ocurre</div></div>'
      + '<div class="meta">Cuando la casa se refinancia, acá vas a ver el pasivo liquidado al Hard Money, el nuevo prestamista y tu parte del cash-out.</div></div>';
  }
  const hmTotal = p.hmInicial + Object.values(p.draws).reduce((s, v) => s + v, 0);
  const cashoutReal = num(P, 'cashout_real', null);
  const cashoutCalc = p.refiMonto - (p.cierreRefi || 0) - hmTotal;
  const cashout = cashoutReal != null ? cashoutReal : cashoutCalc;
  const deficit = r.indicadores.fases && r.indicadores.fases.fase0 ? Math.abs(Math.min(0, r.indicadores.fases.fase0.deficitMax)) : 0;
  const tuCashout = cashout != null ? Math.max(0, cashout - deficit) * met.inv : null;
  return '<div class="card"><div class="chart-h"><div class="t">🔄 Evento de refinanciación</div><div class="k">mes ' + p.refiMes + ' del ciclo</div></div>'
    + '<div class="kv"><span>Pasivo liquidado al Hard Money</span><b class="down">−' + $money(hmTotal) + '</b></div>'
    + '<div class="kv"><span>Nuevo prestamista' + srcChip(P, 'refi_lender') + '</span><b>' + sd(lender) + '</b></div>'
    + '<div class="kv"><span>Nuevo préstamo</span><b>' + $money(p.refiMonto) + ' @ ' + $pct(p.refiTasa) + ' · ' + Math.round(p.refiPlazoM / 12) + ' años</b></div>'
    + '<div class="kv"><span>Cash-out de la casa' + (cashoutReal != null ? srcChip(P, 'cashout_real') : ' <span class="src sup">calculado: préstamo − cierre − payoff</span>') + '</span><b class="' + (cashout >= 0 ? 'up' : 'down') + '">' + $money(cashout) + '</b></div>'
    + '<div class="kv"><span>Déficit previo del ciclo (se cubre primero)</span><b class="down">−' + $money(deficit) + '</b></div>'
    + '<div class="kv" style="border-top:2px solid var(--glassb)"><span><b>Tu cash-out (' + $pct(met.inv) + ' del neto)</b></span><b class="' + (tuCashout > 0 ? 'up' : 'warn') + '">' + $money(tuCashout) + '</b></div>'
    + '<div class="meta" style="margin-top:6px">Tu parte = máx(0, cash-out − déficit previo) × tu % de equity. La distribución real se registra en 💸 Distribuciones cuando se paga.</div>'
    + '</div>';
}

// ─── línea de tiempo del retorno ───
function renderTimeline(pid, P, p, r, met, cierre) {
  const led = Array.isArray(IP.ledger[pid]) ? IP.ledger[pid] : null;
  const addM = (iso, m) => { if (!iso) return null; const d = new Date(iso + 'T00:00:00'); d.setMonth(d.getMonth() + m); return d.toISOString().slice(0, 10); };
  const ev = [];
  if (cierre) ev.push({ f: cierre, ic: '🏠', t: 'Compra de la casa', d: $money(p.compra) + ' + cierre ' + $money(p.cierreCompra), src: 'real' });
  Object.keys(p.draws).sort((a, b) => +a - +b).forEach(m => ev.push({ f: addM(cierre, +m), ic: '🔨', t: 'Remodelación — draw mes ' + m, d: $money(p.draws[m]), src: 'real' }));
  const rentaReal = led ? led.filter(x => x.categoria === 'renta').map(x => x.fecha).sort()[0] : null;
  if (rentaReal) ev.push({ f: rentaReal, ic: '💵', t: 'Primera renta cobrada', d: 'la casa empieza a producir', src: 'real' });
  else { const m1 = (p.rampa || []).findIndex(x => x > 0); if (m1 > 0 && cierre) ev.push({ f: addM(cierre, m1), ic: '💵', t: 'Empieza la renta (modelo)', d: 'ocupación ' + Math.round(p.rampa[m1] * 100) + '%', src: 'modelo' }); }
  if (p.refiMes != null && cierre) {
    const rc = (IP.resumen || []).find(x => x.property_id === pid);
    const fReal = rc && rc.fecha_pago_fuente && /Airtable\)$/.test(rc.fecha_pago_fuente) ? rc.fecha_estimada_pago : null;
    ev.push({ f: fReal || addM(cierre, p.refiMes), ic: '🔄', t: 'Refinanciación', d: 'se paga el Hard Money · entra el banco a 30 años', src: fReal ? 'real' : 'modelo' });
  }
  met.distMias.forEach(d => ev.push({ f: d.fecha, ic: '💸', t: 'Distribución pagada (' + d.tipo + ')', d: $money(d.monto) + ' para vos', src: 'real' }));
  const prox = (IP.dists || []).filter(d => d.property_id === pid && d.estado !== 'pagada' && d.fecha >= new Date().toISOString().slice(0, 10)).sort((a, b) => a.fecha.localeCompare(b.fecha))[0];
  if (prox) ev.push({ f: prox.fecha, ic: '⏳', t: 'Próxima distribución (estimada)', d: $money(prox.monto), src: 'programada' });
  const f2 = r.indicadores.fases.fase2.anio;
  if (f2 && cierre) ev.push({ f: addM(cierre, f2 * 12), ic: '🏁', t: 'Recuperás tu capital con utilidades (modelo)', d: 'año ' + f2 + ' del hold', src: 'modelo' });
  ev.sort((a, b) => String(a.f).localeCompare(String(b.f)));
  const hoy = new Date().toISOString().slice(0, 10);
  return '<div class="card" style="margin-top:14px"><div class="chart-h"><div class="t">Línea de tiempo de tu retorno</div><div class="k"><span class="src">real</span> pasó de verdad · <span class="src sup">modelo</span> proyectado</div></div>'
    + '<div class="tl">' + ev.map(e => '<div class="tl-it' + (e.f && e.f <= hoy ? ' past' : '') + '"><div class="tl-dot">' + e.ic + '</div><div><div style="font-size:12.5px;font-weight:650">' + e.t + ' <span class="src' + (e.src === 'real' ? '' : ' sup') + '">' + e.src + '</span></div><div class="meta">' + (e.f || 'fecha ' + SD) + ' · ' + e.d + '</div></div></div>').join('')
    + '</div></div>';
}

// ─── comparativo de escenarios (solo lectura) ───
function renderEscenarios(pid, P, base, movsCasa) {
  if (!window.invEngine) return '';
  const g = k => { const rr = P[k]; const v = rr ? parseFloat(rr.value) : NaN; return isNaN(v) ? null : v; };
  const fechaC = P.fecha_cierre ? P.fecha_cierre.value : null;
  const defs = [
    ['estimado', '📋 Estimado', 'el underwriting original'],
    ['proyectado', '🎯 Proyectado', 'premisas confirmadas + supuestos'],
    ['realizado', '✅ Real', movsCasa.length ? movsCasa.length + ' movimientos reales' : 'sin movimientos aún = proyectado'],
  ];
  const runs = {};
  defs.forEach(d => {
    try {
      const pp = invEngine.escenario(base, d[0], { est: { remodelTotal: g('est_remodel_total'), arv: g('est_arv'), cierrePct: g('est_cierre_pct') }, movsPorMes: d[0] === 'realizado' && fechaC ? invEngine.movsPorMes(movsCasa, fechaC) : null });
      runs[d[0]] = invEngine.run(pp);
    } catch (e) { runs[d[0]] = null; }
  });
  const simCache = (IP.proj || []).find(x => x.property_id === pid && x.escenario === 'simulado');
  let simInd = simCache && simCache.data && simCache.data.indicadores;
  // 3B: el Simulado sale de inv_projection (JSON CACHEADO, puede ser anterior al fix).
  // En el cache viejo el cap de una casa en rehab quedó como número negativo real (-1.1%)
  // mientras que dscr/equilibrio eran ±Infinity → JSON los volvió null. Resultado: la fila
  // mostraba "— · — · — · -1.1%", dos respuestas contradictorias. Se aplica la MISMA regla
  // del motor sobre el cache: si la casa está en rehab hoy, el Simulado tampoco aplica.
  if (simInd) {
    const finito = v => (typeof v === 'number' && isFinite(v)) ? v : null;
    const eoLive = (runs.proyectado && runs.proyectado.indicadores.estadoOperativo) || {};
    const tapar = !!(simInd.estadoOperativo ? simInd.estadoOperativo.enRehab : eoLive.enRehab);
    simInd = { ...simInd,
      capValor: tapar ? null : finito(simInd.capValor),
      capCosto: tapar ? null : finito(simInd.capCosto),
      dscr: tapar ? null : finito(simInd.dscr),
      puntoEquilibrio: tapar ? null : finito(simInd.puntoEquilibrio) };
  }
  const inv = base.repartoInv;
  const cell = v => '<td style="text-align:right">' + v + '</td>';
  const fila = (lab, fn, fmt, simFn) => '<tr><td>' + lab + '</td>'
    + defs.map(d => cell(runs[d[0]] ? fmt(fn(runs[d[0]])) : '—')).join('')
    + cell(simInd && simFn ? fmt(simFn(simInd)) : '—') + '</tr>';
  return '<div class="card overx" style="margin-top:14px"><div class="chart-h"><div class="t">Comparativo de escenarios</div><div class="k">solo lectura · mismo motor, distintos inputs · el Simulado lo arma administración</div></div>'
    + '<table><thead><tr><th>Indicador</th>' + defs.map(d => '<th style="text-align:right" title="' + d[2] + '">' + d[1] + '</th>').join('') + '<th style="text-align:right">🧪 Simulado</th></tr></thead><tbody>'
    + fila('TIR 31 años', x => x.indicadores.tir31PostRefi, $pct, s => s.tir31PostRefi)
    + fila('VPN 31 años · casa', x => x.indicadores.vpn31PostRefi, $money, s => s.vpn31PostRefi)
    + fila('VPN · tu parte (' + $pct(inv) + ')', x => x.indicadores.vpn31PostRefi * inv, $money, s => s.vpn31PostRefi * inv)
    + fila('CAP rate', x => x.indicadores.capValor, v => v == null ? '—' : $pct(v), s => s.capValor)
    + fila('DSCR', x => x.indicadores.dscr, v => v == null ? '—' : v.toFixed(2) + '×', s => s.dscr)
    + fila('Utilidad año 2 (casa)', x => x.anios[2] ? x.anios[2].fclNegocio : null, $money, null)
    + '</tbody></table>'
    + '<div class="meta" style="margin-top:8px">Estimado = lo que se proyectó al entrar · Proyectado = el plan vigente · Real = con la plata que efectivamente se movió · Simulado = sensibilidad que corre administración (cacheada' + (simCache ? ' el ' + esc(String(simCache.computed_at || '').slice(0, 10)) : '') + ').</div></div>';
}

// ─── 📅 FLUJO MENSUAL (real, desde inv_ledger) ───
async function ipLoadLedger(pid, silent) {
  IP.ledger[pid] = null; // loading
  const { data, error } = await sb.rpc('inv_ledger', { pid });
  IP.ledger[pid] = error ? { err: error.message } : (data || []);
  render();
}
function ipLedgerF(k, v) { IP.ledgerF[k] = v; render(); }
window.ipLedgerF = ipLedgerF;
function ipSetAnio(v) { IP.anio = v; render(); }
window.ipSetAnio = ipSetAnio;
function ipToggleAnio(y) { IP.anioOpen[y] = !IP.anioOpen[y]; render(); }
window.ipToggleAnio = ipToggleAnio;

function renderFlujo(pid, inv) {
  const led = IP.ledger[pid];
  if (led === undefined || led === null) { if (led === undefined) ipLoadLedger(pid); return '<div class="empty">⏳ Armando tu flujo mensual…</div>'; }
  if (led.err) return '<div class="empty">Error: ' + esc(led.err) + '</div>';
  if (!led.length) return '<div class="empty">Sin movimientos registrados todavía para esta casa. Cuando empiece a moverse la plata (rentas, gastos, deuda) lo ves acá, mes a mes.</div>';

  // MES del dinero = el mes CONTABLE del ledger (`mes`: billing_ym en Rentas, mes de la fecha
  // en el resto). Es el MISMO agrupador que usa la distribución automática (inv_dist_auto),
  // así el neto que ve el inversionista y el que se reparte son el mismo número.
  const mesDe = m => String(m.mes || String(m.fecha || '').slice(0, 7));
  const anios = [...new Set(led.map(m => mesDe(m).slice(0, 4)))].filter(Boolean).sort().reverse();
  const F = IP.anio;
  const hoyIso = new Date().toISOString().slice(0, 10);
  // la OPERACIÓN se corta a HOY: movimientos con fecha futura (gastos programados) no inflan los totales
  const w = led.filter(m => (F === 'todos' || mesDe(m).startsWith(F)) && String(m.fecha || '') <= hoyIso);
  // operación mensual: renta / operativos / deuda — SIN draws-inversión y SIN distribuciones
  // E1: la OPERACIÓN = solo movimientos P&L SÍ (regla única invEngine.pnlSi);
  // la deuda (financiero) NO entra al balance — se declara informativa
  const rentas = w.filter(m => invEngine.pnlSi(m.categoria) && m.tipo === 'ingreso');
  const oper = w.filter(m => invEngine.pnlSi(m.categoria) && m.tipo === 'gasto');
  const deuda = w.filter(ipEsDeuda);
  const tRenta = rentas.reduce((s, m) => s + +m.monto, 0);
  const tOper = oper.reduce((s, m) => s + +m.monto, 0);
  const tDeuda = deuda.reduce((s, m) => s + +m.monto, 0);
  const mesesRenta = [...new Set(rentas.map(m => String(m.fecha).slice(0, 7)))];
  const promRenta = mesesRenta.length ? tRenta / mesesRenta.length : null;
  const balanceOp = tRenta - tOper;
  const balanceTot = balanceOp - tDeuda;
  // gastos por categoría (parse del concepto "Gasto {cat} · …")
  const porCat = {};
  oper.forEach(m => { const mm = String(m.concepto || '').match(/^Gasto ([^·]+?)( ·|$)/); const c = mm ? mm[1].trim() : 'otros'; porCat[c] = (porCat[c] || 0) + +m.monto; });
  const catRows = Object.entries(porCat).sort((a, b) => b[1] - a[1]).map(([c, v]) => '<div class="kv"><span>' + esc(c) + '</span><b class="down">−' + $money(v) + '</b></div>').join('');
  // el servicio de deuda también se itemiza (interés HML vs cuota de la refi) — es plata que sale de la casa
  const porDeu = {};
  deuda.forEach(m => { const c = String(m.concepto || 'Servicio de deuda').replace(/\s*·.*$/, ''); porDeu[c] = (porDeu[c] || 0) + +m.monto; });
  const deuRows = Object.entries(porDeu).sort((a, b) => b[1] - a[1]).map(([c, v]) => '<div class="kv"><span>' + esc(c) + '</span><b class="down">−' + $money(v) + '</b></div>').join('');
  const anioSel = '<select class="ibtn" onchange="ipSetAnio(this.value)"><option value="todos"' + (F === 'todos' ? ' selected' : '') + '>Todo el historial</option>' + anios.map(y => '<option value="' + y + '"' + (F === y ? ' selected' : '') + '>' + y + '</option>').join('') + '</select>';

  const box = (lab, val, meta, cls, extra) => '<div class="card"><div class="lab">' + lab + '</div><div class="big ' + (cls || '') + '">' + val + '</div>' + (meta ? '<div class="meta">' + meta + '</div>' : '') + (extra || '') + '</div>';
  const tres = '<div class="grid k4">'
    + box('💵 Renta cobrada', $money(tRenta), mesesRenta.length + ' meses con renta · promedio ' + $money(promRenta) + '/mes <span class="src">Rentas</span>', 'up')
    + box('🧾 Gastos operativos', tOper ? '−' + $money(tOper) : $money(0), 'de la operación de la casa — sin draws de remodelación', 'down', '<div style="margin-top:8px">' + (catRows || '<div class="meta">sin gastos en el período</div>') + '</div>')
    + box('🏦 Servicio de deuda', tDeuda ? '−' + $money(tDeuda) : $money(0), 'interés del HML + cuota de la refi a 30 años pagados en el período <span class="src">FF:ff_hml_payments</span>', 'down', '<div style="margin-top:8px">' + (deuRows || '<div class="meta">sin pagos de deuda en el período</div>') + '</div>')
    + box('⚖️ Balance operativo (NOI)', $money(balanceOp), 'renta − gastos operativos (solo P&L SÍ) · <span title="el servicio de deuda es financiero · P&L NO: no entra en el NOI, pero sí se resta abajo para saber cuánto queda de verdad.">no incluye el servicio de deuda</span>', balanceOp >= 0 ? 'up' : 'down')
    + '</div>'
    // el número que importa: lo que queda DESPUÉS de pagarle al banco / al hard money
    + '<div class="card" style="margin-top:14px;border-color:' + (balanceTot >= 0 ? 'var(--pos)' : 'var(--neg)') + '">'
    + '<div class="lab">💰 Flujo después de deuda (lo que realmente queda)</div>'
    + '<div class="big ' + (balanceTot >= 0 ? 'up' : 'down') + '">' + $money(balanceTot) + '</div>'
    + '<div class="meta">renta ' + $money(tRenta) + ' − gastos operativos ' + $money(tOper) + ' − servicio de deuda ' + $money(tDeuda)
    + ' · es el mismo neto que usa la distribución automática (tu parte = este número × ' + $pct(inv) + ')</div></div>';

  // detalle anual → mensual: ingresos · gastos operativos · SERVICIO DE DEUDA · flujo neto
  // (el neto resta la deuda: es lo que de verdad queda, la misma cuenta de inv_dist_auto)
  const porMes = {};
  led.forEach(m => {
    if (String(m.fecha || '') > hoyIso) return; // lo programado a futuro no es operación ocurrida
    const ym = mesDe(m); if (!/^\d{4}-\d{2}$/.test(ym)) return;
    const esDeu = ipEsDeuda(m);
    if (!esDeu && !invEngine.pnlSi(m.categoria)) return; // el resto de lo financiero/inversión no es operación
    const o = porMes[ym] = porMes[ym] || { ing: 0, gas: 0, deu: 0 };
    if (esDeu) o.deu += +m.monto || 0;
    else if (m.tipo === 'ingreso') o.ing += +m.monto; else o.gas += +m.monto;
  });
  const porAnio = {};
  Object.keys(porMes).forEach(ym => { const y = ym.slice(0, 4); (porAnio[y] = porAnio[y] || []).push(ym); });
  const anual = Object.keys(porAnio).sort().reverse().filter(y => F === 'todos' || y === F).map(y => {
    const meses = porAnio[y].sort();
    const ti = meses.reduce((s, ym) => s + porMes[ym].ing, 0), tg = meses.reduce((s, ym) => s + porMes[ym].gas, 0);
    const td = meses.reduce((s, ym) => s + porMes[ym].deu, 0);
    const tn = ti - tg - td;
    const open = IP.anioOpen[y] !== false; // abierto por default
    return '<div style="margin-bottom:8px">'
      + '<div onclick="ipToggleAnio(\'' + y + '\')" style="display:flex;justify-content:space-between;gap:10px;cursor:pointer;padding:8px 10px;border:1px solid var(--glassb);border-radius:10px;background:var(--glass);flex-wrap:wrap">'
      + '<b>' + (open ? '▾' : '▸') + ' ' + y + '</b><span style="font-variant-numeric:tabular-nums">ingresos <b class="up">' + $money(ti) + '</b> · gastos <b class="down">−' + $money(tg) + '</b> · deuda <b class="down">−' + $money(td) + '</b> · neto <b class="' + (tn >= 0 ? 'up' : 'down') + '">' + $money(tn) + '</b></span></div>'
      + (open ? '<div class="overx"><table style="margin-top:4px"><thead><tr><th>Mes</th><th>Ingresos</th><th>Gastos operativos</th><th>Servicio de deuda</th><th>Flujo neto</th></tr></thead><tbody>'
        + meses.map(ym => { const o = porMes[ym]; const n = o.ing - o.gas - o.deu; return '<tr><td>' + esc(invEngine.mesEs(ym)) + '</td><td class="up">' + $money(o.ing) + '</td><td class="down">−' + $money(o.gas) + '</td><td class="down">−' + $money(o.deu) + '</td><td class="' + (n >= 0 ? 'up' : 'down') + '">' + $money(n) + '</td></tr>'; }).join('')
        + '</tbody></table></div>' : '')
      + '</div>';
  }).join('');

  // línea de tiempo completa (todos los movimientos, con filtros)
  let acum = 0; // saldo OPERATIVO: solo avanza con P&L SÍ; las filas NO repiten el anterior
  const full = led.map(m => { const si = invEngine.pnlSi(m.categoria); if (si) acum += (m.tipo === 'ingreso' ? 1 : -1) * (+m.monto || 0); return { ...m, acum, pnl: si, deu: ipEsDeuda(m) }; });
  const mesesAll = [...new Set(led.map(m => mesDe(m)))].filter(x => /^\d{4}-\d{2}$/.test(x)).sort().reverse();
  const LF = IP.ledgerF;
  const rows = full.filter(m => (LF.tipo === 'todos' || m.tipo === LF.tipo) && (LF.mes === 'todos' || mesDe(m) === LF.mes));
  const srcTag = f => '<span class="src' + (/manual/.test(f) ? ' sup' : '') + '" title="' + esc(f) + '">' + esc(String(f).split(':')[0]) + '</span>';
  const sel = (campo, opts, cur) => '<select class="ibtn" style="padding:7px 10px" onchange="ipLedgerF(\'' + campo + '\', this.value)">' + opts.map(o => '<option value="' + o[0] + '"' + (cur === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select>';

  return '<div style="display:flex;gap:8px;align-items:center;margin-bottom:14px;flex-wrap:wrap"><b style="font-size:15px">📅 Flujo mensual de la operación</b>' + anioSel + '</div>'
    + tres
    + '<div class="card" style="margin-top:14px"><div class="chart-h"><div class="t">Detalle año → mes</div><div class="k">operación: renta − gastos − deuda · sin draws ni distribuciones</div></div>' + (anual || '<div class="empty" style="padding:18px">Sin operación en el período elegido.</div>') + '</div>'
    + '<div class="card" style="margin-top:14px"><div class="chart-h"><div class="t">Todos los movimientos · ' + led.length + '</div><div class="k" style="display:flex;gap:6px;flex-wrap:wrap">'
    + sel('tipo', [['todos', 'Todos'], ['ingreso', '↑ Ingresos'], ['gasto', '↓ Gastos']], LF.tipo)
    + sel('mes', [['todos', 'Todos los meses']].concat(mesesAll.map(m => [m, invEngine.mesEs(m)])), LF.mes)
    + '</div></div>'
    + '<div class="overx"><table><thead><tr><th>Fecha</th><th>Concepto</th><th>Categoría</th><th style="text-align:right">Monto</th><th style="text-align:right">Saldo operativo</th><th>Fuente</th></tr></thead><tbody>'
    // las filas de SERVICIO DE DEUDA se ven a plena luz (son plata que sale de la casa), aunque
    // sean P&L NO para el saldo operativo — el resto de lo financiero/inversión queda en tenue
    + rows.slice().reverse().map(m => '<tr' + (m.pnl || m.deu ? '' : ' style="opacity:.55"') + '><td style="white-space:nowrap">' + esc(m.fecha) + '</td>'
      + '<td>' + esc(m.concepto)
      + (m.deu ? ' <span class="src" title="interés del HML / cuota de la refi — se resta del flujo neto del mes, no del NOI">🏦 servicio de deuda</span>' : (m.pnl ? '' : ' <span class="src sup" title="informativo — no afecta balance operativo">P&L NO</span>'))
      + (m.comprobante ? ' <a href="' + esc(m.comprobante) + '" target="_blank" style="color:var(--a2)">📎</a>' : '') + '</td>'
      + '<td>' + esc(m.categoria) + '</td>'
      + '<td style="text-align:right;white-space:nowrap" class="' + (m.tipo === 'ingreso' ? 'up' : 'down') + '">' + (m.tipo === 'ingreso' ? '+' : '−') + $money(m.monto) + '</td>'
      + '<td style="text-align:right;white-space:nowrap;color:' + (m.acum >= 0 ? 'var(--pos)' : 'var(--neg)') + '"' + (m.pnl ? '' : ' title="P&L NO: repite el saldo anterior"') + '>' + $money(m.acum) + '</td>'
      + '<td>' + srcTag(m.fuente) + '</td></tr>').join('')
    + '</tbody></table></div>'
    + '<div class="meta" style="margin-top:10px">Cada movimiento declara su fuente (FF = Fix &amp; Flip · Rentas = property management · OS = registro del holding). El detalle es de la casa completa; tu parte de la utilidad es el ' + $pct(inv) + '. Los draws vienen agregados (la fuente no fecha draw por draw).</div>'
    + '</div>';
}

// ─── 💸 Distribuciones ───
function renderDist(pid, inv) {
  const rows = (IP.dists || []).slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
  const pagadas = rows.filter(d => d.estado === 'pagada');
  const total = pagadas.reduce((s, d) => s + (+d.monto || 0), 0);
  const hoy = new Date().toISOString().slice(0, 10);
  const prox = rows.filter(d => d.estado !== 'pagada' && d.fecha >= hoy).sort((a, b) => a.fecha.localeCompare(b.fecha))[0];
  const dias = prox ? Math.ceil((new Date(prox.fecha) - Date.now()) / 86400000) : null;
  const kpi = (lab, val, meta, cls) => '<div class="card"><div class="lab">' + lab + '</div><div class="big ' + (cls || '') + '">' + val + '</div>' + (meta ? '<div class="meta">' + meta + '</div>' : '') + '</div>';
  return '<div class="grid k3">'
    + kpi('Total recibido', $money(total), pagadas.length + (pagadas.length === 1 ? ' distribución pagada' : ' distribuciones pagadas'), total > 0 ? 'up' : '')
    + kpi('Próxima estimada', prox ? $money(prox.monto) : '—', prox ? esc(prox.fecha) + ' · faltan ' + dias + ' días' + (dias <= 14 ? ' <b class="warn">⏰</b>' : '') : 'sin distribuciones programadas por ahora', prox && dias <= 14 ? 'warn' : '')
    + kpi('K-1 disponibles', String(rows.filter(d => d.k1_url).length), 'documentos fiscales de tus distribuciones')
    + '</div>'
    + '<div class="card" style="margin-top:14px"><div class="chart-h"><div class="t">Historial</div><div class="k"><button class="ibtn" onclick="ipDistCSV()">⬇ Exportar CSV</button></div></div>'
    + (rows.length ? '<div class="overx"><table><thead><tr><th>Fecha</th><th>Casa</th><th>Tipo</th><th>Monto</th><th>Estado</th><th>Comprobante</th><th>K-1</th></tr></thead><tbody>'
      + rows.map(d => { const dd = (IP.params[d.property_id] || {}).direccion; return '<tr><td>' + esc(d.fecha) + '</td><td>' + esc(dd ? dd.value.split(',')[0] : '—') + '</td><td>' + esc(d.tipo) + '</td><td class="up">' + $money(d.monto) + '</td><td>' + (d.estado === 'pagada' ? '<span class="up">✓ pagada</span>' : '<span class="warn">programada</span>') + '</td><td>' + (d.comprobante_url ? '<a href="' + esc(d.comprobante_url) + '" target="_blank" style="color:var(--a2)">📎 Ver ↗</a>' : '—') + '</td><td>' + (d.k1_url ? '<a href="' + esc(d.k1_url) + '" target="_blank" style="color:var(--a2)">K-1 ↗</a>' : '—') + '</td></tr>'; }).join('')
      + '</tbody></table></div>' : '<div class="empty">Todavía no hay distribuciones registradas. Cuando la casa reparta utilidades o cash-out, aparecen acá con su comprobante y su K-1.</div>')
    + '</div>';
}
function ipDistCSV() {
  const rows = (IP.dists || []);
  const csv = 'fecha,tipo,monto,estado,k1\n' + rows.map(d => [d.fecha, d.tipo, d.monto, d.estado, d.k1_url || ''].join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'distribuciones.csv'; a.click();
}
window.ipDistCSV = ipDistCSV;

// ─── 📄 Mis Documentos (buscador + tipos + audit log) ───
function ipDocQ(v) { IP.docQ = v; render(); const el = document.getElementById('ip-doc-q'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }
window.ipDocQ = ipDocQ;
function ipDocTipo(v) { IP.docTipo = v; render(); }
window.ipDocTipo = ipDocTipo;
function renderDocs(docs) {
  const tipos = ['todos', 'contrato', 'fiscal', 'legal', 'otro'];
  const norm = t => { const x = String(t || '').toLowerCase(); if (/contrat/.test(x)) return 'contrato'; if (/fiscal|tax|k-?1/.test(x)) return 'fiscal'; if (/legal|escritur|deed|title/.test(x)) return 'legal'; return 'otro'; };
  const q = (IP.docQ || '').toLowerCase();
  const rows = docs.filter(d => (IP.docTipo === 'todos' || norm(d.tipo) === IP.docTipo) && (!q || (String(d.nombre || '') + ' ' + String(d.tipo || '')).toLowerCase().includes(q)));
  return '<div class="card"><div class="chart-h"><div class="t">Mis documentos</div><div class="k">contratos · fiscales · legales — cada vista queda registrada</div></div>'
    + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">'
    + '<input id="ip-doc-q" placeholder="🔍 Buscar documento…" value="' + esc(IP.docQ) + '" oninput="ipDocQ(this.value)" style="flex:1;min-width:200px;background:var(--glass);border:1px solid var(--glassb);border-radius:10px;padding:9px 12px;color:var(--ink);font-size:13px;outline:none">'
    + tipos.map(t => '<button class="ibtn tabb' + (IP.docTipo === t ? ' on' : '') + '" onclick="ipDocTipo(\'' + t + '\')">' + t + '</button>').join('')
    + '</div>'
    + (rows.length ? '<div class="overx"><table><thead><tr><th>Documento</th><th>Tipo</th><th>Subido</th><th style="text-align:right">Descargar</th></tr></thead><tbody>'
      + rows.map(d => '<tr><td>' + esc(d.nombre) + '</td><td>' + esc(d.tipo || '—') + '</td><td>' + esc(String(d.created_at || '').slice(0, 10)) + '</td><td style="text-align:right"><a href="#" onclick="ipVerDoc(\'' + d.id + '\',\'' + esc(d.url) + '\');return false" style="color:var(--a2)">⬇ Abrir ↗</a></td></tr>').join('')
      + '</tbody></table></div>'
    : (docs.length ? '<div class="empty" style="padding:20px">Nada coincide con la búsqueda.</div> ' : '<div class="empty" style="padding:20px">Todavía no hay documentos cargados. Tus contratos, K-1 y documentos legales van a aparecer acá cuando administración los suba.</div>'))
    + '</div>';
}
async function ipVerDoc(id, url) { if (!IP.viewOnly) { try { await sb.rpc('inv_doc_log', { doc: id, accion: 'ver' }); } catch (e) {} } window.open(url, '_blank'); }
window.ipVerDoc = ipVerDoc;

// ─── 💬 Mensajes del gestor ───
function renderMsgs(pid) {
  const rows = (IP.msgs || []).slice().sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  if (IP.viewOnly) return '<div class="card" style="margin-bottom:14px"><div class="empty" style="padding:14px">👁 Modo vista: el formulario de mensajes está deshabilitado (solo lectura).</div></div>'
    + (rows.length ? rows.map(m => '<div class="card" style="margin-bottom:8px"><div class="kv" style="border:none;padding:0"><span>' + (m.de === 'admin' ? '🏢 Flipping Rentals' : '👤 Inversionista') + ' · ' + esc((m.created_at || '').slice(0, 10)) + '</span></div>' + (m.asunto ? '<div style="font-weight:700;font-size:13px;margin:4px 0">' + esc(m.asunto) + '</div>' : '') + '<div style="font-size:12.5px;color:var(--mut);white-space:pre-wrap">' + esc(m.cuerpo) + '</div></div>').join('') : '<div class="empty">Sin mensajes todavía.</div>');
  return '<div class="card" style="margin-bottom:14px"><div class="chart-h"><div class="t">Escribinos</div><div class="k">te respondemos en el portal — nada se envía sin que toques "Enviar"</div></div>'
    + '<input id="ip-msg-asunto" placeholder="Asunto" style="width:100%;background:var(--glass);border:1px solid var(--glassb);border-radius:10px;padding:10px 12px;color:var(--ink);font-size:13px;margin-bottom:8px;outline:none">'
    + '<textarea id="ip-msg-cuerpo" rows="3" placeholder="Tu mensaje…" style="width:100%;background:var(--glass);border:1px solid var(--glassb);border-radius:10px;padding:10px 12px;color:var(--ink);font-size:13px;outline:none"></textarea>'
    + '<button class="cbtn" style="margin-top:8px" onclick="ipEnviarMsg()">Enviar</button></div>'
    + (rows.length ? rows.map(m => {
      const leido = (m.read_by || []).includes(IP.email.toLowerCase());
      return '<div class="card" style="margin-bottom:8px;' + (!leido && m.de === 'admin' ? 'border-color:var(--a2)' : '') + '" ' + (!leido ? 'onclick="ipMarcarLeido(\'' + m.id + '\')"' : '') + '>'
        + '<div class="kv" style="border:none;padding:0"><span>' + (m.de === 'admin' ? '🏢 Flipping Rentals' : '👤 Vos') + ' · ' + esc((m.created_at || '').slice(0, 10)) + (!leido && m.de === 'admin' ? ' · <b style="color:var(--a2)">nuevo</b>' : '') + '</span></div>'
        + (m.asunto ? '<div style="font-weight:700;font-size:13px;margin:4px 0">' + esc(m.asunto) + '</div>' : '')
        + '<div style="font-size:12.5px;color:var(--mut);white-space:pre-wrap">' + esc(m.cuerpo) + '</div></div>';
    }).join('') : '<div class="empty">Sin mensajes todavía.</div>');
}
async function ipEnviarMsg() {
  if (IP.viewOnly) return ipRO();
  const asunto = (document.getElementById('ip-msg-asunto').value || '').trim();
  const cuerpo = (document.getElementById('ip-msg-cuerpo').value || '').trim();
  if (!cuerpo) return;
  const { error } = await sb.from('inv_messages').insert({ investor_airtable_id: IP.myIds[0], de: 'inversionista', asunto, cuerpo });
  if (error) return alert('Error: ' + error.message);
  await ipReloadProducto(); render();
}
window.ipEnviarMsg = ipEnviarMsg;
async function ipMarcarLeido(id) {
  if (IP.viewOnly) return; await sb.rpc('inv_msg_marcar_leido', { msg: id }); await ipReloadProducto(); render(); }
window.ipMarcarLeido = ipMarcarLeido;

// ─── 🤖 Asistente IA ───
function renderIA() {
  const sugeridos = ['Explícame mis indicadores', '¿Qué es el TVPI?', '¿Por qué mi TIR dice n/a?', '¿Cómo va mi inversión?', '¿Cuándo recupero mi capital?'];
  return '<div class="card"><div class="chart-h"><div class="t">🤖 Investor Assistant</div><div class="k">responde SOLO con los datos de TU inversión · números concretos · honesto sobre riesgos</div></div>'
    + '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">' + sugeridos.map(s => '<button class="ibtn" onclick="ipAsk(\'' + s.replace(/'/g, "\\'") + '\')">' + s + '</button>').join('') + '</div>'
    + '<div id="ip-chat" style="display:flex;flex-direction:column;gap:8px;max-height:380px;overflow-y:auto;margin-bottom:10px">'
    + (IP.chat || []).map(m => '<div style="max-width:85%;padding:10px 13px;border-radius:12px;font-size:12.5px;line-height:1.55;white-space:pre-wrap;' + (m.role === 'user' ? 'align-self:flex-end;background:rgba(79,141,255,.16);border:1px solid rgba(79,141,255,.3)' : 'align-self:flex-start;background:var(--glass);border:1px solid var(--glassb)') + '">' + esc(m.content) + '</div>').join('')
    + '</div>'
    + '<div style="display:flex;gap:8px"><input id="ip-ia-q" placeholder="Preguntá sobre tu inversión…" onkeydown="if(event.key===\'Enter\')ipAsk()" style="flex:1;background:var(--glass);border:1px solid var(--glassb);border-radius:11px;padding:11px 14px;color:var(--ink);font-size:13px;outline:none"><button class="cbtn" onclick="ipAsk()">Enviar</button></div>'
    + '</div>';
}
async function ipAsk(q) {
  if (IP.viewOnly) return ipRO();
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
      body: JSON.stringify({ mode: 'investor', question, snapshot: { ...(IP.lastSnapshot || {}), indicadores: IP.lastInd || null, glosario: Object.values(IP.glos || {}).map(g => ({ t: g.termino_es, q: g.que_es })) }, history: IP.chat.filter(m => m.content !== '…pensando').slice(0, -1) }),
    });
    const d = await res.json();
    IP.chat.pop();
    IP.chat.push({ role: 'assistant', content: res.ok ? (d.answer || 'Sin respuesta.') : ('Error: ' + (d.error || res.status)) });
  } catch (e) { IP.chat.pop(); IP.chat.push({ role: 'assistant', content: 'No pude conectar: ' + e.message }); }
  render();
}
window.ipAsk = ipAsk;

async function ipReloadProducto() {
  const [dc, ms] = await Promise.all([
    sb.from('inv_distributions').select('*').eq('active', true),
    sb.from('inv_messages').select('*').eq('active', true),
  ]);
  IP.dists = dc.data || []; IP.msgs = ms.data || [];
}

// ─── gráficas (theme-aware; canvas SIEMPRE en wrapper fijo con overflow hidden) ───
function drawCharts(r, inv) {
  const light = ipTheme() === 'light';
  const tick = light ? '#64748b' : '#5b6780', leg = light ? '#475569' : '#93a0b6', grid = light ? 'rgba(15,23,42,.08)' : 'rgba(255,255,255,.05)';
  const A = r.anios.filter(x => x.a >= 1);
  const labels = A.map(x => 'a' + x.a);
  const C = (id, cfg) => { const el = document.getElementById(id); if (!el || !window.Chart) return; cfg.options = Object.assign({ resizeDelay: 200 }, cfg.options || {}); IP.charts.push(new Chart(el, cfg)); };
  const gopt = { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: leg, boxWidth: 10, font: { size: 10 } } } }, scales: { x: { ticks: { color: tick, font: { size: 9 } }, grid: { color: grid } }, y: { ticks: { color: tick, font: { size: 9 } }, grid: { color: grid } } } };
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
  IP.ver = new URLSearchParams(location.search).get('ver');
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { loginView(); }
  else { IP.email = session.user.email || ''; await (IP.ver ? ipLoadComo() : ipLoad()); }
  sb.auth.onAuthStateChange(async (ev, s) => {
    if (ev === 'SIGNED_IN' && s && !IP.holdings.length) { IP.email = s.user.email || ''; await (IP.ver ? ipLoadComo() : ipLoad()); }
    if (ev === 'SIGNED_OUT') loginView();
  });
})();
