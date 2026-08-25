// 📈 GATE DE COBERTURA DE LINAJE v3 — recorre el shell OS **y los overlays** (FF CC + UW,
// Rentas CC, Remodel CC + Reportes CEO, PM clásico, Estimador Pro), junta cada número KPI
// visible y lo cruza contra data_lineage. Modos:
//   --register  registra los números NUEVOS como origen='crawler', estado='pend'
//   --gate      NO registra: FALLA (exit 1) si algún número visible no tiene entrada
// Extracción por superficie (informe 15-jul):
//   overlays CC: .card.kpi (.lab/.big) · .card.kit-kpi (.kit-kpi-lab + b) · .card .hero-num ·
//   UW unificada .kpi>.l+.v · OS: .card .lab/.big + .kv · PM/Estimador (Tailwind): label
//   .uppercase.font-bold + valor bold hermano. Filtra filas-registro (direcciones) — las
//   tablas de registros no son métricas: su linaje es el de sus columnas, ya trazado.
// Uso: SERVICE_KEY=sb_secret_... QA_BASE=http://localhost:5173/index.html node scripts/lineage-coverage.mjs --register
import puppeteer from 'puppeteer-core';

const BASE = process.env.QA_BASE || 'http://localhost:5173/index.html';
const SB_URL = 'https://nezbaljfhhyznhltpjnk.supabase.co';
const SK = process.env.SERVICE_KEY || process.env.SB_KEY;
const MODE = process.argv.includes('--gate') ? 'gate' : 'register';
const EMAIL = 'qa-admin-test@rentalprofitss.com';
const PASS = 'QaPortal2026!cov';
if (!SK) { console.error('Falta SERVICE_KEY'); process.exit(1); }

// ── pantallas: shell OS + overlays con drivers (pre = JS a evaluar, wait = selector a esperar) ──
const S = (emp, sys, pre, host, wait) => ({ emp, sys, pre, host: host || '#os-root', wait });
const FF_OPEN = "await window.openFFCommandCenter({name:'FF',type:'ff-command-center',data:{},config:{}})";
const SCREENS = [
  S('Holding', 'Panel Global', "osNav('/')"),
  S('Fix & Flip', 'Empresa (OS)', "osNav('/fix-and-flip')"),
  S('Rentas', 'Empresa (OS)', "osNav('/rentas')"),
  S('Remodelación', 'Empresa (OS)', "osNav('/remodelacion')"),
  S('Holding', 'Operación', "osNav('/operacion')"),
  S('Contable / QBO', 'Contable (OS)', "osNav('/contable')"),
  S('Fix & Flip', 'Ficha de Casa', "osNav('/casa/' + osSlug('9909 Childress Dr, Austin, Texas 78753'))"),
  S('Rentas', 'Informe de Cartera', "osNav('/cartera'); await new Promise(r=>setTimeout(r,2500))"),
  S('Rentas', 'Cobros', "osNav('/cobros'); await new Promise(r=>setTimeout(r,2500))"),
  // FF Command Center
  S('Fix & Flip', 'Command Center', FF_OPEN + "; window.ffGo('command')", '#ff-overlay', '.card.kpi'),
  S('Fix & Flip', 'Deals', "window.ffGo('deals')", '#ff-overlay'),
  S('Fix & Flip', 'Propiedades (CC)', "window.ffGo('propiedades')", '#ff-overlay'),
  S('Fix & Flip', 'Inversionistas', "window.ffGo('inversionistas')", '#ff-overlay'),
  S('Fix & Flip', 'Finanzas (QBO)', "window.ffGo('finanzas')", '#ff-overlay'),
  S('Fix & Flip', 'Analítica', "window.ffGo('analitica')", '#ff-overlay', '.card.kit-kpi'),
  // Underwriting: análisis hipotético en memoria + las 6 calcs
  S('Fix & Flip', 'Underwriting · Del Negocio', "window.ffGo('uwsuite'); await new Promise(r=>setTimeout(r,1500)); window.ffUwNuevo(); await new Promise(r=>setTimeout(r,600)); window.ffUwSub('negocio')", '#ff-overlay'),
  S('Fix & Flip', 'Underwriting · ARV', "window.ffUwSub('arv')", '#ff-overlay'),
  S('Fix & Flip', 'Underwriting · Cash-Out', "window.ffUwSub('cashout')", '#ff-overlay'),
  S('Fix & Flip', 'Underwriting · Intereses', "window.ffUwSub('intereses')", '#ff-overlay'),
  S('Fix & Flip', 'Underwriting · Ingreso', "window.ffUwSub('ingreso')", '#ff-overlay'),
  S('Fix & Flip', 'Underwriting · Vista Unificada', "window.ffUwSub('unificada')", '#ff-overlay'),
  S('Fix & Flip', '(cerrar FF)', "window.closeFFCommandCenter && window.closeFFCommandCenter()", '#os-root'),
  // Rentas CC
  S('Rentas', 'Command Center', "await window.openCommandCenter({name:'Rentas',type:'command-center',data:{},config:{}}); window.ccGo('command')", '#cc-overlay', '.card.kpi'),
  S('Rentas', 'Propiedades (CC)', "window.ccGo('propiedades')", '#cc-overlay'),
  S('Rentas', 'Reservas (CC)', "window.ccGo('reservas')", '#cc-overlay'),
  S('Rentas', 'Operación (CC)', "window.ccGo('operacion')", '#cc-overlay'),
  S('Rentas', 'Inquilinos (CC)', "window.ccGo('inquilinos')", '#cc-overlay'),
  S('Rentas', 'Finanzas (CC)', "window.ccGo('finanzas')", '#cc-overlay'),
  S('Rentas', 'Analítica (CC)', "window.ccGo('analitica')", '#cc-overlay'),
  S('Rentas', '(cerrar CC)', "window.closeCommandCenter && window.closeCommandCenter()", '#os-root'),
  // Remodel CC + Reportes CEO (apertura separada de la navegación — evita la race del eval largo)
  S('Remodelación', '(abrir RC)', "await window.openRemodelCommandCenter({name:'Remodelación',type:'remodel-command-center',data:{},config:{}})", '#rc-overlay'),
  S('Remodelación', 'Command Center', "window.rcGo('command')", '#rc-overlay', '.card.kpi'),
  S('Remodelación', 'Estimado vs Real', "window.rcGo('evr')", '#rc-overlay'),
  S('Remodelación', 'Obras', "window.rcGo('obras')", '#rc-overlay'),
  S('Remodelación', 'Líderes', "window.rcGo('lideres')", '#rc-overlay'),
  S('Remodelación', 'Nómina de campo', "window.rcGo('nomina')", '#rc-overlay'),
  S('Remodelación', 'Gestión EVM', "window.rcGo('gestion')", '#rc-overlay'),
  S('Remodelación', 'Reportes CEO', "window.rcGo('reportes')", '#rc-overlay'),
  S('Remodelación', 'Reportes CEO · P&L', "window.rpSet('tipo','r2')", '#rc-overlay'),
  S('Remodelación', 'Reportes CEO · Costos $/sqft', "window.rpSet('tipo','r5')", '#rc-overlay'),
  S('Remodelación', '(cerrar RC)', "window.closeRemodelCommandCenter && window.closeRemodelCommandCenter()", '#os-root'),
  // PM clásico (#modal / #pm-root — Tailwind)
  S('Rentas', 'Property Manager · Resumen', "window.openPmSystem(); await new Promise(r=>setTimeout(r,2500)); window.pmSetTab('dashboard')", '#pm-root'),
  S('Rentas', 'Propiedades', "window.pmSetTab('properties')", '#pm-root'),
  S('Rentas', 'Calendario / Reservas', "window.pmSetTab('calendar')", '#pm-root'),
  S('Rentas', 'Inquilinos', "window.pmSetTab('tenants')", '#pm-root'),
  S('Rentas', 'Pagos', "window.pmSetTab('payments')", '#pm-root'),
  S('Rentas', 'Gastos', "window.pmSetTab('expenses')", '#pm-root'),
  S('Rentas', 'Finanzas (PM)', "window.pmSetTab('finance')", '#pm-root'),
  S('Rentas', '(cerrar PM)', "window.closeModal && window.closeModal()", '#os-root'),
  // Estimador Pro (#rm-root — Tailwind)
  S('Remodelación', 'Estimador · Proyectos', "await window.openRemodelPro({name:'Estimador Pro',type:'estimator',data:{},config:{}}); await new Promise(r=>setTimeout(r,2000)); window.rmSetTab('projects')", '#rm-root'),
  S('Remodelación', 'Estimador · Seguimiento', "window.rmSetTab('seguimiento')", '#rm-root'),
  S('Remodelación', 'Estimador · 3 Estimaciones', "window.rmSetTab('compare')", '#rm-root'),
  S('Remodelación', 'Estimador · Calibración', "window.rmSetTab('calibration')", '#rm-root'),
  S('Remodelación', '(cerrar Estimador)', "window.closeModal && window.closeModal()", '#os-root'),
];

const MESES = 'enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre';
function norm(s) {
  return String(s || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(new RegExp('\\b(' + MESES + ')\\b', 'g'), '')
    .replace(/[^a-z%&+ ]+/g, ' ')
    .replace(/\s+/g, ' ').trim();
}
const matches = (a, b) => a && b && (a === b || a.startsWith(b) || b.startsWith(a) || (a.length > 6 && b.includes(a)) || (b.length > 6 && a.includes(b)));

const H = { Authorization: 'Bearer ' + SK, apikey: SK, 'Content-Type': 'application/json' };
async function rest(path, opts) {
  const r = await fetch(SB_URL + '/rest/v1/' + path, { headers: { ...H, Prefer: 'return=representation' }, ...opts });
  if (!r.ok) throw new Error(path + ': ' + r.status + ' ' + (await r.text()).slice(0, 200));
  return r.json();
}

// extracción en el browser — multi-patrón, filtra filas-registro
const EXTRACT = (host) => `(() => {
  const out = []; const seen = new Set();
  const ADDR = /^\\s*\\d+\\s+[a-záéíóúñ]/i;   // "9909 Childress Dr…" = registro, no métrica
  const push = (label, value) => {
    label = String(label || '').replace(/ⓘ/g, '').replace(/\\s+/g, ' ').trim();
    value = String(value || '').trim().slice(0, 50);
    if (!label || label.length < 2 || label.length > 80 || !/\\d/.test(value)) return;
    if (ADDR.test(label)) return;
    if (/^\\d[\\d\\s.,%$xX×\\-–—:\\/]*$/.test(label)) return;
    const k = label.toLowerCase(); if (seen.has(k)) return; seen.add(k);
    out.push({ label, value });
  };
  const $$ = (sel) => [...document.querySelectorAll('${host} ' + sel)];
  $$('.card.kpi').forEach(c => {
    const lab = c.querySelector('.lab'), big = c.querySelector('.big');
    if (lab && big) return push(lab.textContent, big.textContent);
    const l = c.querySelector('.l'), v = c.querySelector('.v');
    if (l && v) push(l.textContent, v.textContent);
  });
  $$('.kpi').forEach(c => { const l = c.querySelector('.l'), v = c.querySelector('.v'); if (l && v) push(l.textContent, v.textContent); });
  $$('.card.kit-kpi').forEach(c => push((c.querySelector('.kit-kpi-lab') || {}).textContent, (c.querySelector('b') || {}).textContent));
  $$('.card .hero-num').forEach(n => {
    const card = n.closest('.card'); if (!card) return;
    const lab = [...card.children].find(ch => ch !== n && /[a-záéíóúñ]{3}/i.test(ch.textContent || '') && ch.textContent.length < 90);
    push(lab ? lab.textContent : 'hero', n.textContent);
  });
  if ('${host}' === '#os-root') {
    $$('.card').forEach(c => { const lab = c.querySelector('.lab'), big = c.querySelector('.big'); if (lab && big) push(lab.textContent, big.textContent); });
    $$('.kv').forEach(kv => { const s = kv.querySelector('span'), b = kv.querySelector('b'); if (s && b) push(s.textContent, b.textContent); });
  }
  if ('${host}' === '#pm-root' || '${host}' === '#rm-root') {
    $$('[class*="uppercase"]').forEach(l => {
      if (!/font-bold|font-extrabold/.test(l.className)) return;
      let v = l.nextElementSibling;
      if (v && /font-extrabold|font-bold|text-xl|text-2xl|text-3xl/.test(v.className)) push(l.textContent, v.textContent);
    });
  }
  return out;
})()`;

async function main() {
  const j = await (await fetch(SB_URL + '/auth/v1/admin/users?per_page=1000', { headers: H })).json();
  const u = (j.users || []).find(x => x.email === EMAIL);
  await fetch(SB_URL + '/auth/v1/admin/users/' + u.id, { method: 'PUT', headers: H, body: JSON.stringify({ password: PASS }) });

  const lineage = await rest('data_lineage_map?select=metric_key,empresa,sistema,dato&active=eq.true&limit=3000');
  const normed = lineage.map(r => ({ ...r, n: norm(r.dato) }));

  const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('dialog', d => d.dismiss().catch(() => {}));
  await page.evaluateOnNewDocument(() => { if (navigator.serviceWorker) navigator.serviceWorker.register = () => Promise.resolve({}); });
  await page.setViewport({ width: 1500, height: 1000 });
  await page.goto(BASE, { waitUntil: 'networkidle2' });
  await page.evaluate(async (email, pw) => {
    const c = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    const { error } = await c.auth.signInWithPassword({ email, password: pw });
    if (error) throw new Error(error.message);
  }, EMAIL, PASS);
  await page.goto(BASE, { waitUntil: 'networkidle2' });
  await page.waitForFunction(() => window.OS && window.OS.loaded, { timeout: 60000 });

  const vistos = [], sin = [];
  for (const sc of SCREENS) {
    try {
      await page.evaluate('(async () => { ' + sc.pre + ' })()');
      if (sc.wait) await page.waitForFunction("!!document.querySelector('" + sc.host + " " + sc.wait + "')", { timeout: 30000 });
      await new Promise(r => setTimeout(r, sc.pre.includes('open') ? 2500 : 1300));
      if (sc.sys.startsWith('(')) continue;   // pasos de cierre, no capturan
      const nums = await page.evaluate(EXTRACT(sc.host));
      for (const x of nums) {
        const n = norm(x.label);
        if (!n) continue;
        const hit = normed.find(r => r.empresa === sc.emp && r.sistema === sc.sys && matches(n, r.n))
          || normed.find(r => matches(n, r.n));
        vistos.push({ emp: sc.emp, sys: sc.sys, label: x.label, value: x.value, hit: hit ? hit.metric_key : null });
        if (!hit) sin.push({ emp: sc.emp, sys: sc.sys, label: x.label, value: x.value });
      }
      console.log('· ' + sc.emp + ' › ' + sc.sys + ': ' + nums.length + ' números');
    } catch (e) { console.error('⚠ ' + sc.sys + ': ' + e.message.slice(0, 120)); }
  }
  await browser.close();

  let nuevos = 0;
  if (MODE === 'register' && sin.length) {
    for (const s of sin) {
      const mk = [s.emp, s.sys, s.label].map(x => norm(x).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')).join('|');
      try {
        await rest('data_lineage_map', { method: 'POST', body: JSON.stringify({
          empresa: s.emp, sistema: s.sys, grupo: 'Descubiertos por el crawler', dato: s.label,
          base: '(por definir)', tabla: '(por definir)', columna: '(por definir)',
          nota: 'descubierto por el gate de cobertura — valor visto: ' + s.value, estado: 'pend', origen: 'crawler', metric_key: mk,
        }) });
        nuevos++;
      } catch (e) { if (!/duplicate|409/.test(e.message)) console.error('  insert ' + s.label + ': ' + e.message.slice(0, 120)); }
    }
  }
  const conLinaje = vistos.filter(v => v.hit).length;
  const sinFinal = MODE === 'register' ? 0 : sin.length;
  const porSys = {};
  vistos.forEach(v => { const k = v.emp + ' › ' + v.sys; porSys[k] = porSys[k] || { n: 0, sin: 0 }; porSys[k].n++; if (!v.hit) porSys[k].sin++; });
  await rest('lineage_coverage_runs', { method: 'POST', body: JSON.stringify({
    pantallas: SCREENS.filter(s => !s.sys.startsWith('(')).length, numeros_vistos: vistos.length, con_linaje: conLinaje + (MODE === 'register' ? nuevos : 0),
    sin_linaje: sinFinal, nuevos_registrados: nuevos,
    detalle: { modo: MODE, base: BASE, sin: sin.slice(0, 120), por_pantalla: Object.entries(porSys).map(([k, v]) => ({ sys: k, ...v })) },
  }) });
  console.log('\n📈 ' + vistos.length + ' números vistos en ' + Object.keys(porSys).length + ' pantallas · ' + conLinaje + ' ya trazados · ' + sin.length + ' sin entrada' + (MODE === 'register' ? ' → ' + nuevos + ' registrados (pend, curar en /mapa)' : ''));
  if (MODE === 'gate' && sin.length) {
    console.error('⛔ GATE: números visibles SIN entrada en data_lineage:');
    sin.slice(0, 30).forEach(s => console.error('   · [' + s.emp + ' › ' + s.sys + '] ' + s.label + ' = ' + s.value));
    process.exit(1);
  }
  console.log('✅ gate de linaje OK');
}
main().catch(e => { console.error('FATAL', e); process.exit(1); });
