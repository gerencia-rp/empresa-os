// ════════════════════════════════════════════════════════════════
// 🛰️ PROPERTY OS · COMMAND CENTER — app unificada de Rentas (dark, sobria).
// Fuente de verdad = Airtable (apptTKRYbx6gu701i) vía pm_* (SOLO LECTURA).
// Secciones: Command Center · Propiedades · Reservas · Operación · Inquilinos
//            · Finanzas · Analítica · Cerebro IA (insights por reglas, sin IA externa).
// ════════════════════════════════════════════════════════════════
const CC = {
  sys: null, section: 'command', loading: false, loadError: null,
  props: [], units: [], pay: [], exp: [], book: [], tenants: [], tasks: [], alerts: [],
  _charts: [],
};
window.CC = CC;

const CC_MONEY = n => (n < 0 ? '-$' : '$') + Math.abs(Math.round(n || 0)).toLocaleString('en-US');
const CC_K = n => { const a = Math.abs(n); return (n < 0 ? '-$' : '$') + (a >= 1000 ? (a / 1000).toFixed(1) + 'k' : Math.round(a)); };
const CC_ESC = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const CC_ZONE = { norte: 'Norte', sur: 'Sur', round_rock: 'Round Rock', marlin: 'Marlin' };
function ccZoneLabel(z) { return z ? (CC_ZONE[z] || z.charAt(0).toUpperCase() + z.slice(1)) : 'Sin zona'; }
function ccUnitState(u) { const s = (u.status || '').toLowerCase(); if (/mantenim/.test(s)) return 'mant'; if (/ocupad/.test(s)) return 'ocupada'; if (/reservad/.test(s)) return 'reservada'; return 'libre'; }
function ccIsHipo(e) { return /hipotec|mortgage/i.test(e.subcategory || ''); }
function ccMonthBounds(d = new Date()) {
  // Último mes COMPLETO (para cifras estables). Ej: hoy jul → junio.
  const y = d.getUTCFullYear(), m = d.getUTCMonth();
  const py = m === 0 ? y - 1 : y, pm = m === 0 ? 12 : m;
  const mm = String(pm).padStart(2, '0'); const last = new Date(Date.UTC(py, pm, 0)).getUTCDate();
  const MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return { from: `${py}-${mm}-01`, to: `${py}-${mm}-${String(last).padStart(2, '0')}`, label: `${MES[pm - 1]} ${py}`, y: py, m: pm };
}

// ─── CSS (replica del mockup, scoped bajo #cc-overlay) ───
function ccInjectCSS() {
  if (document.getElementById('cc-styles')) return;
  const st = document.createElement('style'); st.id = 'cc-styles';
  st.textContent = `
  #cc-overlay{position:fixed;inset:0;z-index:9998;overflow:auto;
    --bg:#06080d;--ink:#eef2f8;--mut:#93a0b6;--mut2:#5b6780;--glass:rgba(255,255,255,.045);--glassb:rgba(255,255,255,.09);
    --a1:#45e3c6;--a2:#4f8dff;--a3:#8a7bff;--pos:#48d69c;--neg:#f0687a;--amber:#e7b65e;
    color:var(--ink);background:var(--bg);font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;letter-spacing:.1px;-webkit-font-smoothing:antialiased}
  #cc-overlay *{box-sizing:border-box;margin:0;padding:0}
  #cc-overlay .bgfx{position:fixed;inset:0;z-index:0;pointer-events:none;background:
    radial-gradient(760px 520px at 8% -6%,rgba(69,227,198,.14),transparent 58%),
    radial-gradient(820px 560px at 100% 4%,rgba(79,141,255,.15),transparent 56%),
    radial-gradient(700px 620px at 70% 118%,rgba(138,123,255,.12),transparent 60%),linear-gradient(180deg,#070a11,#05070c)}
  #cc-overlay .gridfx{position:fixed;inset:0;z-index:0;pointer-events:none;opacity:.5;
    background-image:linear-gradient(rgba(255,255,255,.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.015) 1px,transparent 1px);
    background-size:44px 44px;-webkit-mask:radial-gradient(circle at 50% 30%,#000,transparent 78%);mask:radial-gradient(circle at 50% 30%,#000,transparent 78%)}
  #cc-overlay .app{position:relative;z-index:1;display:grid;grid-template-columns:244px 1fr;min-height:100vh}
  #cc-overlay .side{padding:22px 15px;position:sticky;top:0;height:100vh;background:linear-gradient(180deg,rgba(12,16,26,.72),rgba(7,10,17,.72));border-right:1px solid rgba(255,255,255,.05);backdrop-filter:blur(16px);display:flex;flex-direction:column}
  #cc-overlay .brand{display:flex;align-items:center;gap:11px;padding:4px 8px 22px}
  #cc-overlay .logo{width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,var(--a1),var(--a2));display:grid;place-items:center;color:#04121a;font-weight:900;font-size:16px;box-shadow:0 6px 20px -6px rgba(79,141,255,.6),inset 0 1px 0 rgba(255,255,255,.4)}
  #cc-overlay .brand b{font-size:15px;font-weight:750}#cc-overlay .brand span{display:block;font-size:9px;color:var(--mut2);letter-spacing:2.6px;margin-top:2px}
  #cc-overlay .navlbl{font-size:9px;letter-spacing:1.8px;color:var(--mut2);text-transform:uppercase;padding:12px 12px 7px;font-weight:700}
  #cc-overlay .nav{display:flex;flex-direction:column;gap:2px}
  #cc-overlay .nav a{display:flex;align-items:center;gap:11px;padding:10px 12px;border-radius:10px;color:var(--mut);text-decoration:none;font-size:13px;font-weight:500;transition:.16s;position:relative;cursor:pointer}
  #cc-overlay .nav a .i{width:16px;text-align:center;opacity:.85;font-size:13px}
  #cc-overlay .nav a:hover{background:rgba(255,255,255,.04);color:var(--ink)}
  #cc-overlay .nav a.on{color:#fff;background:linear-gradient(90deg,rgba(69,227,198,.16),rgba(79,141,255,.06));box-shadow:inset 0 0 0 1px rgba(255,255,255,.06)}
  #cc-overlay .nav a.on::before{content:"";position:absolute;left:-15px;top:8px;bottom:8px;width:3px;border-radius:3px;background:linear-gradient(180deg,var(--a1),var(--a2));box-shadow:0 0 10px var(--a1)}
  #cc-overlay .nav a .b{margin-left:auto;font-size:10px;color:var(--mut2)}
  #cc-overlay .side .foot{margin-top:auto;font-size:10.5px;color:var(--mut2);line-height:1.7;border-top:1px solid rgba(255,255,255,.05);padding-top:12px}
  #cc-overlay .side .foot b{color:var(--a1)}
  #cc-overlay .main{padding:24px 32px 46px;max-width:1560px}
  #cc-overlay .top{display:flex;align-items:flex-start;gap:16px;margin-bottom:22px;padding-right:52px}
  #cc-overlay .top h1{font-size:23px;font-weight:760;letter-spacing:-.3px}
  #cc-overlay .top h1 span{background:linear-gradient(90deg,var(--a1),var(--a2));-webkit-background-clip:text;background-clip:text;color:transparent}
  #cc-overlay .sub{color:var(--mut);font-size:12.5px;margin-top:5px}
  #cc-overlay .pills{margin-left:auto;display:flex;gap:9px;align-items:center}
  #cc-overlay .pill{display:flex;align-items:center;gap:8px;font-size:11.5px;color:var(--mut);background:var(--glass);border:1px solid var(--glassb);padding:8px 13px;border-radius:22px;backdrop-filter:blur(10px)}
  #cc-overlay .cdot{width:7px;height:7px;border-radius:50%;background:var(--a1);box-shadow:0 0 10px var(--a1)}
  #cc-overlay .cdot.live{animation:ccpulse 2s infinite}@keyframes ccpulse{0%,100%{opacity:1}50%{opacity:.35}}
  #cc-overlay .pill.ai{background:linear-gradient(90deg,rgba(138,123,255,.22),rgba(79,141,255,.14));border-color:rgba(138,123,255,.4);color:#eaeaff;cursor:pointer}
  #cc-overlay .shimmer{background:linear-gradient(90deg,#eaeaff 30%,#fff 50%,#eaeaff 70%);background-size:200% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:ccsh 3s linear infinite}
  @keyframes ccsh{to{background-position:-200% 0}}
  #cc-overlay .ccclose{position:fixed;top:16px;right:20px;z-index:5;background:var(--glass);border:1px solid var(--glassb);color:var(--mut);width:34px;height:34px;border-radius:10px;cursor:pointer;font-size:15px;backdrop-filter:blur(10px)}
  #cc-overlay .ccclose:hover{color:#fff;border-color:rgba(255,255,255,.2)}
  #cc-overlay .grid{display:grid;gap:16px}#cc-overlay .kpis{grid-template-columns:repeat(4,1fr)}
  #cc-overlay .card{position:relative;background:var(--glass);border:1px solid var(--glassb);border-radius:16px;padding:19px;backdrop-filter:blur(18px);box-shadow:0 1px 0 rgba(255,255,255,.05) inset,0 26px 60px -34px rgba(0,0,0,.9);transition:.2s;overflow:hidden}
  #cc-overlay .card::before{content:"";position:absolute;inset:0 0 auto 0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.22),transparent)}
  #cc-overlay .card:hover{transform:translateY(-2px);border-color:rgba(255,255,255,.14)}
  #cc-overlay .lab{font-size:10px;letter-spacing:1.5px;color:var(--mut2);text-transform:uppercase;font-weight:700}
  #cc-overlay .kpi .big{font-size:33px;font-weight:780;margin-top:9px;letter-spacing:-.8px}
  #cc-overlay .kpi .meta{font-size:11.5px;color:var(--mut);margin-top:7px;line-height:1.5}
  #cc-overlay .glow{text-shadow:0 0 22px rgba(69,227,198,.4)}
  #cc-overlay .up{color:var(--pos)}#cc-overlay .down{color:var(--neg)}#cc-overlay .warn{color:var(--amber)}
  #cc-overlay .spark{position:absolute;right:14px;bottom:12px;width:94px;height:36px}
  #cc-overlay .ring{width:64px;height:64px;border-radius:50%;display:grid;place-items:center;box-shadow:0 0 24px -4px rgba(69,227,198,.35)}
  #cc-overlay .ring i{width:50px;height:50px;border-radius:50%;background:#0a0e16;display:grid;place-items:center;font-style:normal;font-weight:760;font-size:15px}
  #cc-overlay .kpi.occ{display:flex;gap:15px;align-items:center}
  #cc-overlay .row2{grid-template-columns:1.6fr 1fr;margin-top:16px}#cc-overlay .row3{grid-template-columns:1fr 1fr 1fr;margin-top:16px}
  #cc-overlay .chart-h{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
  #cc-overlay .chart-h .t{font-size:13.5px;font-weight:640}#cc-overlay .chart-h .k{font-size:11px;color:var(--mut2)}
  #cc-overlay .legend{display:flex;gap:14px;font-size:11px;color:var(--mut)}#cc-overlay .legend b{display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:5px}
  #cc-overlay canvas{max-width:100%}
  #cc-overlay .brain{background:linear-gradient(180deg,rgba(30,28,58,.55),rgba(14,16,32,.55));border:1px solid rgba(138,123,255,.28);box-shadow:0 26px 70px -34px rgba(90,70,230,.5),0 1px 0 rgba(255,255,255,.06) inset}
  #cc-overlay .bh{display:flex;align-items:center;gap:12px;margin-bottom:14px}
  #cc-overlay .orb{width:32px;height:32px;border-radius:50%;position:relative;background:radial-gradient(circle at 34% 30%,#a9f5e6,#45e3c6 30%,#4f8dff 70%,#2a2f66);box-shadow:0 0 22px rgba(79,141,255,.55)}
  #cc-overlay .orb::after{content:"";position:absolute;inset:-5px;border-radius:50%;background:conic-gradient(from 0deg,var(--a1),var(--a2),var(--a3),var(--a1)) border-box;-webkit-mask:linear-gradient(#000 0 0) padding-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;animation:ccspin 6s linear infinite;opacity:.7}
  @keyframes ccspin{to{transform:rotate(360deg)}}
  #cc-overlay .bh b{font-size:14px}#cc-overlay .bh span{font-size:9px;color:var(--mut2);display:block;letter-spacing:1.5px;margin-top:2px}
  #cc-overlay .insight{display:flex;gap:11px;padding:11px 0;border-bottom:1px solid rgba(255,255,255,.06)}
  #cc-overlay .insight:last-of-type{border-bottom:none}
  #cc-overlay .insight .ic{font-size:8px;margin-top:6px}#cc-overlay .ic.r{color:var(--neg)}#cc-overlay .ic.y{color:var(--amber)}#cc-overlay .ic.g{color:var(--pos)}#cc-overlay .ic.b{color:var(--a2)}
  #cc-overlay .insight .tx{font-size:12px;line-height:1.5;color:#d6ddec}#cc-overlay .insight .tx b{color:#fff;font-weight:650}
  #cc-overlay .tag{display:inline-block;font-size:9px;letter-spacing:.7px;color:var(--mut2);margin-top:5px;font-weight:700}
  #cc-overlay .ask{display:flex;gap:8px;margin-top:14px}
  #cc-overlay .ask input{flex:1;background:rgba(6,9,16,.72);border:1px solid rgba(138,123,255,.32);border-radius:11px;padding:12px 14px;color:var(--ink);font-size:12px;outline:none}
  #cc-overlay .ask input::placeholder{color:var(--mut2)}
  #cc-overlay .ask button{background:linear-gradient(135deg,var(--a1),var(--a2));border:none;color:#04121a;font-weight:750;padding:0 16px;border-radius:11px;cursor:pointer;font-size:12px;box-shadow:0 8px 20px -8px rgba(79,141,255,.7)}
  #cc-overlay .chips{display:flex;gap:7px;flex-wrap:wrap;margin-top:11px}
  #cc-overlay .chip{font-size:11px;color:var(--mut);background:rgba(255,255,255,.04);border:1px solid var(--glassb);padding:6px 11px;border-radius:18px;cursor:pointer}
  #cc-overlay .chip:hover{color:#fff;border-color:rgba(138,123,255,.45)}
  #cc-overlay .ptable{width:100%;border-collapse:collapse;font-size:12.5px}
  #cc-overlay .ptable th{text-align:left;color:var(--mut2);font-size:9.5px;letter-spacing:1px;text-transform:uppercase;padding:9px 8px;border-bottom:1px solid rgba(255,255,255,.07);font-weight:700}
  #cc-overlay .ptable td{padding:11px 8px;border-bottom:1px solid rgba(255,255,255,.04)}
  #cc-overlay .ptable tr:hover td{background:rgba(255,255,255,.025)}
  #cc-overlay .badge{font-size:10px;padding:3px 9px;border-radius:7px;font-weight:600}
  #cc-overlay .b-ok{background:rgba(72,214,156,.13);color:var(--pos)}#cc-overlay .b-red{background:rgba(240,104,122,.13);color:var(--neg)}#cc-overlay .b-warn{background:rgba(231,182,94,.13);color:var(--amber)}
  #cc-overlay .mini-bar{height:5px;border-radius:5px;background:rgba(255,255,255,.08);overflow:hidden;width:74px;display:inline-block;vertical-align:middle;margin-right:7px}
  #cc-overlay .mini-bar i{display:block;height:100%;background:linear-gradient(90deg,var(--a1),var(--a2))}
  #cc-overlay .op-item{display:flex;align-items:center;gap:11px;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:12px}
  #cc-overlay .op-time{color:var(--mut2);font-variant-numeric:tabular-nums;width:46px;font-size:11.5px}
  #cc-overlay .op-zone{margin-left:auto;font-size:9.5px;padding:2px 9px;border-radius:20px;color:var(--mut)}
  #cc-overlay .z-n{background:rgba(69,227,198,.12)}#cc-overlay .z-s{background:rgba(255,255,255,.05)}
  #cc-overlay .empty-sec{padding:60px;text-align:center;color:var(--mut2)}
  `;
  document.head.appendChild(st);
}

// ════════════════════════════════════════════════════════════════
// ENTRADA + CARGA
// ════════════════════════════════════════════════════════════════
async function openCommandCenter(sys) {
  CC.sys = sys; CC.section = 'command';
  ccInjectCSS();
  let ov = document.getElementById('cc-overlay');
  if (!ov) { ov = document.createElement('div'); ov.id = 'cc-overlay'; document.body.appendChild(ov); }
  ov.innerHTML = '<div class="bgfx"></div><div class="gridfx"></div><div class="app"><aside class="side"></aside><main class="main"><div style="padding:60px;color:#5b6780">⏳ Conectando con Airtable…</div></main></div><button class="ccclose" onclick="closeCommandCenter()" title="Cerrar">✕</button>';
  document.body.style.overflow = 'hidden';
  await ccLoadAll();
  ccRender();
}
window.openCommandCenter = openCommandCenter;
function closeCommandCenter() { const ov = document.getElementById('cc-overlay'); if (ov) ov.remove(); document.body.style.overflow = ''; ccDestroyCharts(); }
window.closeCommandCenter = closeCommandCenter;

async function ccLoadAll() {
  CC.loading = true; CC.loadError = null;
  try {
    const [props, units, pay, exp, book, tenants, tasks, alerts] = await Promise.all([
      sb.from('pm_properties').select('id,name,address,zone,rental_model,total_units').eq('active', true).order('name'),
      sb.from('pm_units').select('id,name,property_id,status,target_rent,unit_type,is_active').eq('is_active', true),
      sb.from('pm_payments').select('amount,type,status,property_id,paid_at').eq('active', true).eq('type', 'ingreso').eq('status', 'pagado'),
      sb.from('pm_expenses').select('amount,category,subcategory,property_id,expense_date').eq('active', true),
      sb.from('pm_bookings').select('unit_id,property_id,tenant_id,start_date,end_date,status').eq('active', true),
      sb.from('pm_tenants').select('id,full_name,phone,client_state'),
      sb.from('pm_tasks').select('title,task_type,scheduled_date,property_id,unit_id,zone,assignee,start_at,status').eq('active', true),
      sb.from('pm_alerts').select('severity,category,message,property_id').eq('resolved', false),
    ]);
    if (props.error) throw props.error;
    CC.props = props.data || []; CC.units = units.data || []; CC.pay = pay.data || [];
    CC.exp = exp.data || []; CC.book = book.data || []; CC.tenants = tenants.data || [];
    CC.tasks = tasks.data || []; CC.alerts = alerts.data || [];
  } catch (e) { CC.loadError = e.message || String(e); }
  finally { CC.loading = false; }
}

// ════════════════════════════════════════════════════════════════
// MOTOR DE CÁLCULO (por casa, KPIs, insights)
// ════════════════════════════════════════════════════════════════
// REGLA DE UNIDADES (misma en toda la app): casa_completa=1, estudio=1, apto=1, y TODAS
// las habitaciones de la casa juntas=1. Ocupación = ocupadas / total rentable.
const CC_INDEP = ['casa_completa', 'apartamento', 'estudio'];
function ccRentable(units) {
  const indep = units.filter(u => CC_INDEP.includes(u.unit_type));
  const rooms = units.filter(u => u.unit_type === 'habitacion');
  const hasR = rooms.length ? 1 : 0;
  const roomsOcc = rooms.some(u => ccUnitState(u) === 'ocupada');
  const occ = indep.filter(u => ccUnitState(u) === 'ocupada').length + (hasR && roomsOcc ? 1 : 0);
  const res = indep.filter(u => ccUnitState(u) === 'reservada' && ccUnitState(u) !== 'ocupada').length + (hasR && !roomsOcc && rooms.some(u => ccUnitState(u) === 'reservada') ? 1 : 0);
  const mant = indep.filter(u => ccUnitState(u) === 'mant').length;
  const total = indep.length + hasR;
  return { total, occ, res, mant, free: Math.max(0, total - occ - res - mant), rooms: rooms.length };
}
function ccCompute() {
  const mb = ccMonthBounds();
  const inMonth = d => d && d >= mb.from && d <= mb.to;
  const H = {};
  CC.props.forEach(p => H[p.id] = { id: p.id, name: p.name, zone: p.zone, model: p.rental_model, inc: 0, exp: 0, hipo: 0, units: [], pot: 0 });
  CC.units.forEach(u => { const h = H[u.property_id]; if (!h) return; h.units.push(u); h.pot += Number(u.target_rent || 0); });
  CC.pay.forEach(p => { if (inMonth(p.paid_at) && H[p.property_id]) H[p.property_id].inc += Number(p.amount || 0); });
  CC.exp.forEach(e => { if (inMonth(e.expense_date) && H[e.property_id]) { H[e.property_id].exp += Number(e.amount || 0); if (ccIsHipo(e)) H[e.property_id].hipo += Number(e.amount || 0); } });
  const houses = Object.values(H).map(h => { const r = ccRentable(h.units); return { ...h, net: h.inc - h.exp, total: r.total, occ: r.occ, res: r.res, free: r.free, mant: r.mant, pct: r.total ? Math.round(r.occ / r.total * 100) : 0 }; });

  // Global rentable (suma por casa, coherente con las fichas)
  const totalU = houses.reduce((s, h) => s + h.total, 0);
  const occU = houses.reduce((s, h) => s + h.occ, 0);
  const resU = houses.reduce((s, h) => s + h.res, 0);
  const freeU = houses.reduce((s, h) => s + h.free, 0);
  const inc = CC.pay.filter(p => inMonth(p.paid_at)).reduce((s, p) => s + Number(p.amount || 0), 0);
  const expT = CC.exp.filter(e => inMonth(e.expense_date)).reduce((s, e) => s + Number(e.amount || 0), 0);
  const potTotal = CC.units.reduce((s, u) => s + Number(u.target_rent || 0), 0);
  const potFree = CC.units.filter(u => ccUnitState(u) === 'libre').reduce((s, u) => s + Number(u.target_rent || 0), 0);
  const capture = potTotal ? Math.round((potTotal - potFree) / potTotal * 100) : 0;

  return { mb, houses, kpi: { totalU, occU, resU, freeU, occPct: totalU ? Math.round(occU / totalU * 100) : 0, inc, expT, cashflow: inc - expT, potTotal, potFree, capture } };
}

// ─── INSIGHTS (reglas rankeadas por $ de impacto) ───
function ccInsights(comp) {
  const { houses, kpi, mb } = comp;
  const money = n => Math.round(n);
  const ins = [];
  // 1) Casas en rojo (peor primero) con causa
  houses.filter(h => h.net < 0 && (h.inc > 0 || h.exp > 0)).sort((a, b) => a.net - b.net).forEach(h => {
    const causa = h.free > 0 ? `${h.free} unidad(es) libre(s)` : (h.hipo > h.inc ? `hipoteca ${CC_MONEY(h.hipo)} > ingreso ${CC_MONEY(h.inc)}` : 'gastos altos');
    ins.push({ sev: 'critical', impact: Math.abs(h.net), tag: 'CRÍTICO · CASHFLOW', tx: `<b>${CC_ESC(h.name)}</b> arrastra <b>${CC_MONEY(-h.net)}/mes</b> (${causa}).`, sec: 'finanzas' });
  });
  // 2) Unidades libres / potencial perdido
  if (kpi.potFree > 0) {
    const peor = houses.filter(h => h.free > 0).sort((a, b) => b.free - a.free)[0];
    ins.push({ sev: 'opportunity', impact: kpi.potFree, tag: 'OPORTUNIDAD', tx: `<b>${kpi.freeU} unidades libres</b> = <b>${CC_MONEY(kpi.potFree)}/mes</b> en juego${peor ? `. ${CC_ESC(peor.name)} (${peor.free} libres) es la prioridad de turnover` : ''}.`, sec: 'propiedades' });
  }
  // 3) Ocupación baja por zona
  const Z = {}; houses.forEach(h => { const z = h.zone || 'sin'; (Z[z] = Z[z] || { o: 0, t: 0, free: 0 }); Z[z].o += h.occ + h.res; Z[z].t += h.total; Z[z].free += h.free; });
  Object.entries(Z).filter(([z, v]) => v.t && v.o / v.t < 0.7).sort((a, b) => b[1].free - a[1].free).forEach(([z, v]) => ins.push({ sev: 'warning', impact: v.free * 800, tag: 'OCUPACIÓN', tx: `Zona <b>${ccZoneLabel(z === 'sin' ? null : z)}</b>: ocupación ${Math.round(v.o / v.t * 100)}% (${v.free} libres).`, sec: 'propiedades' }));
  // 4) Reservas por vencer (30 días)
  const today = new Date().toISOString().slice(0, 10); const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const venc = CC.book.filter(b => b.end_date && b.end_date >= today && b.end_date <= in30 && ['activo', 'confirmado'].includes(b.status));
  if (venc.length) ins.push({ sev: 'warning', impact: venc.length * 1000, tag: 'RESERVAS', tx: `<b>${venc.length} reserva(s)</b> vencen en 30 días — renovar o preparar turnover.`, sec: 'reservas' });
  // 5) Outliers de gasto (hipoteca)
  const hipos = houses.filter(h => h.hipo > 0).map(h => h.hipo); const meanH = hipos.reduce((s, v) => s + v, 0) / (hipos.length || 1);
  houses.filter(h => h.hipo > meanH * 1.5).sort((a, b) => b.hipo - a.hipo).slice(0, 2).forEach(h => ins.push({ sev: 'warning', impact: h.hipo, tag: 'OUTLIER GASTO', tx: `<b>${CC_ESC(h.name)}</b>: hipoteca ${CC_MONEY(h.hipo)}/mes, muy sobre el promedio (${CC_MONEY(meanH)}).`, sec: 'finanzas' }));
  // 6) Memoria / contexto (informativo)
  ins.push({ sev: 'info', impact: 0, tag: 'MEMORIA', tx: `La <b>hipoteca</b> entra como gasto fijo por casa desde su fecha real → NOI por casa exacto. Cashflow de ${mb.label}: <b>${CC_MONEY(kpi.cashflow)}</b>.`, sec: 'analitica' });
  const rank = { critical: 0, warning: 1, opportunity: 1, info: 3 };
  ins.sort((a, b) => (rank[a.sev] - rank[b.sev]) || (b.impact - a.impact));
  return ins;
}

// ════════════════════════════════════════════════════════════════
// RENDER
// ════════════════════════════════════════════════════════════════
const CC_NAV = [
  ['command', '◧', 'Command Center', null],
  ['propiedades', '⌂', 'Propiedades', () => CC.props.length],
  ['reservas', '▦', 'Reservas & Calendario', () => CC.book.length],
  ['operacion', '◔', 'Operación & Cronogramas', null],
  ['inquilinos', '◍', 'Inquilinos', () => CC.tenants.length],
  ['finanzas', '$', 'Finanzas', null],
  ['analitica', '▤', 'Analítica & KPIs', null],
  ['cerebro', '◆', 'Cerebro IA', null],
];

function ccRender() {
  const ov = document.getElementById('cc-overlay'); if (!ov) return;
  const side = ov.querySelector('.side'), main = ov.querySelector('.main');
  if (CC.loadError) { main.innerHTML = `<div class="empty-sec"><div style="font-size:40px">⚠️</div><div style="color:#f0687a;margin-top:10px">${CC_ESC(CC.loadError)}</div><button class="chip" style="margin-top:14px" onclick="ccReload()">Reintentar</button></div>`; return; }
  const comp = ccCompute();
  side.innerHTML = ccSidebar();
  ccDestroyCharts();
  main.innerHTML = ({
    command: () => ccSecCommand(comp),
    cerebro: () => ccSecCerebro(comp),
    propiedades: () => ccSecPropiedades(comp),
    finanzas: () => ccSecFinanzas(comp),
    reservas: () => ccSecReservas(comp),
    operacion: () => ccSecOperacion(comp),
    inquilinos: () => ccSecInquilinos(comp),
    analitica: () => ccSecAnalitica(comp),
  }[CC.section] || (() => ccSecCommand(comp)))();
  // Charts después de pintar el DOM
  requestAnimationFrame(() => ccMountCharts(comp));
}
window.ccRender = ccRender;
async function ccReload() { await ccLoadAll(); ccRender(); }
window.ccReload = ccReload;
function ccGo(s) { CC.section = s; ccRender(); document.getElementById('cc-overlay')?.scrollTo(0, 0); }
window.ccGo = ccGo;

function ccSidebar() {
  return `
    <div class="brand"><div class="logo">R</div><div><b>Property OS</b><span>RENTAL PROFITS</span></div></div>
    <div class="navlbl">Rentas</div>
    <nav class="nav">
      ${CC_NAV.map(([k, i, l, cnt]) => `<a class="${CC.section === k ? 'on' : ''}" onclick="ccGo('${k}')"><span class="i">${i}</span> ${l}${cnt && cnt() ? ` <span class="b">${cnt()}</span>` : ''}</a>`).join('')}
    </nav>
    <div class="foot">Fuente de verdad · <b>Airtable</b><br>Solo lectura · sincronizado</div>`;
}
function ccHeader(title, accent, sub) {
  return `<div class="top"><div><h1>${title} · <span>${accent}</span></h1><div class="sub">${sub}</div></div>
    <div class="pills"><div class="pill"><span class="cdot live"></span> Airtable en vivo</div>
    <div class="pill ai" onclick="ccGo('cerebro')">◆ <span class="shimmer">Cerebro IA</span></div></div></div>`;
}

// ─── SECCIÓN: COMMAND CENTER (réplica del mockup) ───
function ccSecCommand(comp) {
  const { kpi, houses } = comp; const insights = ccInsights(comp);
  const crit = insights.filter(i => i.sev === 'critical').length;
  const cf = kpi.cashflow;
  const rankHouses = [...houses].filter(h => h.inc > 0 || h.exp > 0).sort((a, b) => b.net - a.net);
  const topBad = [...rankHouses].sort((a, b) => a.net - b.net).slice(0, 6);
  const todayTasks = CC.tasks.filter(t => t.scheduled_date === new Date().toISOString().slice(0, 10) && t.status !== 'completado' && t.status !== 'cancelado').sort((a, b) => (a.start_at || '9').localeCompare(b.start_at || '9')).slice(0, 6);
  const propName = id => CC.props.find(p => p.id === id)?.name || '';
  return `
    ${ccHeader('Command Center', 'Rentas', 'Todo el negocio de rentas en una sola vista — propiedades, reservas, operación y finanzas.')}
    <div class="grid kpis">
      <div class="card kpi occ"><div><div class="lab">Ocupación</div>
        <div class="meta" style="margin-top:10px">${kpi.occU} de ${kpi.totalU} unidades<br><span class="${kpi.occPct >= 80 ? 'up' : 'warn'}">${kpi.occU} ocupadas · ${kpi.resU} reservadas · ${kpi.freeU} libres</span></div></div>
        <div class="ring" style="background:conic-gradient(from -90deg,var(--a1),var(--a2) ${kpi.occPct}%,rgba(255,255,255,.07) 0)"><i>${kpi.occPct}%</i></div></div>
      <div class="card kpi"><div class="lab">Cashflow del mes · ${comp.mb.label}</div>
        <div class="big ${cf < 0 ? 'down' : 'up'}">${CC_MONEY(cf)}</div>
        <div class="meta">Ingresos ${CC_K(kpi.inc)} · Gastos ${CC_K(kpi.expT)}${kpi.expT > kpi.inc ? ' · <span class="warn">hipoteca cargada</span>' : ''}</div><canvas class="spark" id="cc-sp1"></canvas></div>
      <div class="card kpi"><div class="lab">Renta potencial / mes</div>
        <div class="big glow">${CC_MONEY(kpi.potTotal)}</div>
        <div class="meta">Captura ${kpi.capture}% · <span class="warn">${CC_MONEY(kpi.potFree)} sin cobrar (${kpi.freeU} libres)</span></div><canvas class="spark" id="cc-sp2"></canvas></div>
      <div class="card kpi"><div class="lab">Alertas del cerebro</div>
        <div class="big">${insights.length}</div>
        <div class="meta"><span class="down">${crit} críticas</span> · ${insights.length - crit} por revisar · accionables</div><canvas class="spark" id="cc-sp3"></canvas></div>
    </div>
    <div class="grid row2">
      <div class="card"><div class="chart-h"><div class="t">Ingresos vs Gastos · 6 meses</div>
        <div class="legend"><span><b style="background:var(--pos)"></b>Ingresos</span><span><b style="background:var(--neg)"></b>Gastos</span></div></div>
        <canvas id="cc-cf" height="132"></canvas></div>
      <div class="card brain"><div class="bh"><div class="orb"></div><div><b>Cerebro IA</b><span>ANÁLISIS EN VIVO · REGLAS</span></div></div>
        ${insights.slice(0, 3).map(i => `<div class="insight"><div class="ic ${i.sev === 'critical' ? 'r' : i.sev === 'warning' ? 'y' : i.sev === 'opportunity' ? 'g' : 'b'}">●</div><div class="tx">${i.tx}<div class="tag">${i.tag}</div></div></div>`).join('')}
        <div class="ask"><input id="cc-ask" placeholder="Preguntá a tu copiloto…" onkeydown="if(event.key==='Enter')ccAsk()"><button onclick="ccAsk()">Enviar</button></div>
        <div class="chips"><span class="chip" onclick="ccGo('cerebro')">Ver todos los insights</span><span class="chip" onclick="ccGo('finanzas')">¿Casas en rojo?</span></div></div>
    </div>
    <div class="grid row3">
      <div class="card"><div class="chart-h"><div class="t">Cashflow por casa</div><div class="k">rojo = pérdida</div></div><canvas id="cc-house" height="240"></canvas></div>
      <div class="card"><div class="chart-h"><div class="t">Gastos por tipo · mes</div><div class="k">${CC_K(kpi.expT)}</div></div><canvas id="cc-donut" height="240"></canvas></div>
      <div class="card"><div class="chart-h"><div class="t">Operación de hoy</div><div class="k">Juan + Limpieza</div></div>
        ${todayTasks.length ? todayTasks.map(t => { const z = t.zone; return `<div class="op-item"><span class="op-time">${t.start_at ? String(t.start_at).slice(11, 16) : '—'}</span> ${CC_ESC((t.title || '').replace(/^[^A-Za-z0-9]+/, '')).slice(0, 30)} <span class="op-zone ${z === 'norte' ? 'z-n' : 'z-s'}">${ccZoneLabel(z)}</span></div>`; }).join('') : '<div style="color:#5b6780;font-size:12px;padding:14px 0">Sin tareas hoy. Andá a Operación → Armar día.</div>'}
        <div style="margin-top:13px;font-size:11px;color:var(--mut)"><span class="chip" onclick="closeCommandCenter();setTimeout(()=>openCronograma({name:'Cronograma'}),150)">◆ Abrir Cronograma</span></div></div>
    </div>
    <div class="grid" style="margin-top:16px"><div class="card">
      <div class="chart-h"><div class="t">Propiedades · estado & rentabilidad</div><div class="k">${CC.props.length} casas · ${kpi.totalU} unidades</div></div>
      ${ccPropTable(rankHouses)}
    </div></div>`;
}

function ccPropTable(houses) {
  const modelLbl = m => ({ casa_completa: 'Casa Completa', por_habitaciones: 'Habitaciones', por_unidades: 'Unidades', mixta: 'Mixta', por_estudios: 'Estudios', por_apartamentos: 'Apartamentos' }[m] || 'Mixta');
  const badge = h => h.net < -1000 ? '<span class="badge b-red">En rojo</span>' : h.pct < 70 ? '<span class="badge b-warn">Baja ocup.</span>' : h.net < 0 ? '<span class="badge b-warn">Vigilar</span>' : '<span class="badge b-ok">Sana</span>';
  return `<table class="ptable"><thead><tr><th>Casa</th><th>Zona</th><th>Modelo</th><th>Ocupación</th><th>Renta pot.</th><th>Cashflow</th><th>Estado</th></tr></thead><tbody>
    ${houses.slice(0, 12).map(h => `<tr><td>${CC_ESC(h.name).slice(0, 30)}</td><td>${ccZoneLabel(h.zone)}</td><td>${modelLbl(h.model)} · ${h.total}u</td>
      <td><span class="mini-bar"><i style="width:${h.pct}%"></i></span>${h.pct}%</td><td>${CC_MONEY(h.pot)}</td>
      <td class="${h.net >= 0 ? 'up' : 'down'}">${CC_MONEY(h.net)}</td><td>${badge(h)}</td></tr>`).join('')}
  </tbody></table>`;
}

// ─── SECCIÓN: CEREBRO IA ───
function ccSecCerebro(comp) {
  const insights = ccInsights(comp);
  const byImpact = insights.reduce((s, i) => s + (i.sev === 'critical' ? i.impact : 0), 0);
  return `
    ${ccHeader('Cerebro IA', 'Insights', 'Motor de reglas sobre tus datos reales — rankeado por impacto en dólares. Sin IA externa (Fase 1).')}
    <div class="grid kpis" style="grid-template-columns:repeat(3,1fr)">
      <div class="card kpi"><div class="lab">Insights activos</div><div class="big">${insights.length}</div><div class="meta">${insights.filter(i => i.sev === 'critical').length} críticos · accionables</div></div>
      <div class="card kpi"><div class="lab">Drenaje mensual detectado</div><div class="big down">${CC_MONEY(-byImpact)}</div><div class="meta">suma de casas en rojo</div></div>
      <div class="card kpi"><div class="lab">Oportunidad recuperable</div><div class="big glow">${CC_MONEY(comp.kpi.potFree)}</div><div class="meta">colocando ${comp.kpi.freeU} unidades libres</div></div>
    </div>
    <div class="grid" style="margin-top:16px"><div class="card brain">
      <div class="bh"><div class="orb"></div><div><b>Análisis en vivo</b><span>${insights.length} INSIGHTS · RANKEADOS POR $</span></div></div>
      ${insights.map(i => `<div class="insight"><div class="ic ${i.sev === 'critical' ? 'r' : i.sev === 'warning' ? 'y' : i.sev === 'opportunity' ? 'g' : 'b'}">●</div><div class="tx">${i.tx}<div class="tag">${i.tag}${i.impact ? ` · ${CC_MONEY(i.impact)}` : ''}</div></div>
        ${i.sec ? `<span class="chip" style="margin-left:auto;align-self:center" onclick="ccGo('${i.sec}')">Ver →</span>` : ''}</div>`).join('')}
      <div class="ask"><input id="cc-ask" placeholder="Preguntá a tu copiloto (Fase 2 — requiere ANTHROPIC_API_KEY)…" onkeydown="if(event.key==='Enter')ccAsk()"><button onclick="ccAsk()">Enviar</button></div>
      <div class="chips"><span class="chip" onclick="ccAsk('¿Cuáles son las casas en rojo este mes?')">¿Casas en rojo este mes?</span><span class="chip" onclick="ccAsk('Proyectá el cashflow a 3 meses')">Proyectá el cashflow a 3 meses</span><span class="chip" onclick="ccAsk('¿Qué unidades conviene colocar primero?')">¿Qué colocar primero?</span></div>
    </div></div>`;
}
async function ccAsk(q) {
  const inp = document.getElementById('cc-ask'); const question = q || (inp ? inp.value.trim() : '');
  if (!question) return;
  // Fase 2: /api/brain-chat con ANTHROPIC_API_KEY. Placeholder por ahora.
  if (window.toast) toast('💬 El chat del Cerebro (Fase 2) necesita ANTHROPIC_API_KEY en Vercel. Los insights automáticos (Fase 1) ya funcionan abajo.', 'info', { duration: 5000 });
}
window.ccAsk = ccAsk;

// ─── SECCIÓN: PROPIEDADES ───
function ccSecPropiedades(comp) {
  const houses = [...comp.houses].filter(h => h.total).sort((a, b) => a.pct - b.pct || a.net - b.net);
  return `${ccHeader('Propiedades', 'Rentas', `${CC.props.length} casas · ${comp.kpi.totalU} unidades · ocupación ${comp.kpi.occPct}%`)}
    <div class="grid"><div class="card">${ccPropTable([...comp.houses].sort((a, b) => a.net - b.net))}</div></div>`;
}
// ─── SECCIÓN: FINANZAS ───
function ccSecFinanzas(comp) {
  const { kpi, houses } = comp;
  const rojo = houses.filter(h => h.net < 0 && (h.inc > 0 || h.exp > 0)).sort((a, b) => a.net - b.net);
  const top = houses.filter(h => h.net > 0).sort((a, b) => b.net - a.net).slice(0, 6);
  return `${ccHeader('Finanzas', comp.mb.label, `Ingresos ${CC_MONEY(kpi.inc)} · Gastos ${CC_MONEY(kpi.expT)} · Cashflow ${CC_MONEY(kpi.cashflow)}`)}
    <div class="grid kpis" style="grid-template-columns:repeat(3,1fr)">
      <div class="card kpi"><div class="lab">Ingresos del mes</div><div class="big up">${CC_MONEY(kpi.inc)}</div></div>
      <div class="card kpi"><div class="lab">Gastos del mes</div><div class="big down">${CC_MONEY(kpi.expT)}</div></div>
      <div class="card kpi"><div class="lab">Cashflow neto</div><div class="big ${kpi.cashflow >= 0 ? 'up' : 'down'}">${CC_MONEY(kpi.cashflow)}</div></div>
    </div>
    <div class="grid row2"><div class="card"><div class="chart-h"><div class="t">Casas en pérdida (${rojo.length})</div><div class="k">peor primero</div></div>
      <table class="ptable"><thead><tr><th>Casa</th><th>Ingreso</th><th>Hipoteca</th><th>Gasto</th><th>Neto</th></tr></thead><tbody>
      ${rojo.slice(0, 10).map(h => `<tr><td>${CC_ESC(h.name).slice(0, 26)}</td><td>${CC_MONEY(h.inc)}</td><td>${CC_MONEY(h.hipo)}</td><td>${CC_MONEY(h.exp)}</td><td class="down">${CC_MONEY(h.net)}</td></tr>`).join('') || '<tr><td colspan="5" style="color:#48d69c">Ninguna en pérdida ✓</td></tr>'}</tbody></table></div>
      <div class="card"><div class="chart-h"><div class="t">Gastos por tipo</div><div class="k">${CC_K(kpi.expT)}</div></div><canvas id="cc-donut" height="240"></canvas></div></div>`;
}
// ─── SECCIÓN: RESERVAS ───
function ccSecReservas(comp) {
  const today = new Date().toISOString().slice(0, 10);
  const activas = CC.book.filter(b => ['activo', 'confirmado'].includes(b.status));
  const tName = id => CC.tenants.find(t => t.id === id)?.full_name || '—';
  const pName = id => CC.props.find(p => p.id === id)?.name || '—';
  return `${ccHeader('Reservas', 'Calendario', `${CC.book.length} reservas · ${activas.length} activas`)}
    <div class="grid"><div class="card"><div class="chart-h"><div class="t">Reservas activas</div><div class="k">${activas.length}</div></div>
      <table class="ptable"><thead><tr><th>Casa</th><th>Inquilino</th><th>Entrada</th><th>Salida</th><th>Estado</th></tr></thead><tbody>
      ${activas.slice(0, 20).map(b => `<tr><td>${CC_ESC(pName(b.property_id)).slice(0, 26)}</td><td>${CC_ESC(tName(b.tenant_id)).slice(0, 22)}</td><td>${b.start_date || '—'}</td><td>${b.end_date || '∞'}</td><td><span class="badge ${b.end_date && b.end_date < new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10) ? 'b-warn' : 'b-ok'}">${b.status}</span></td></tr>`).join('')}</tbody></table>
      <div style="margin-top:12px"><span class="chip" onclick="closeCommandCenter();setTimeout(()=>{document.querySelector('[data-sys-type=pm-dashboard]')?.click()},150)">Abrir Calendario clásico</span></div></div></div>`;
}
// ─── SECCIÓN: OPERACIÓN ───
function ccSecOperacion(comp) {
  const open = CC.tasks.filter(t => t.status !== 'completado' && t.status !== 'cancelado');
  const today = new Date().toISOString().slice(0, 10);
  const hoy = open.filter(t => t.scheduled_date === today), atr = open.filter(t => t.scheduled_date && t.scheduled_date < today);
  return `${ccHeader('Operación', 'Cronogramas', `Juan + Limpieza unificados · ${open.length} tareas abiertas · ${atr.length} atrasadas`)}
    <div class="grid kpis" style="grid-template-columns:repeat(3,1fr)">
      <div class="card kpi"><div class="lab">Tareas hoy</div><div class="big">${hoy.length}</div></div>
      <div class="card kpi"><div class="lab">Atrasadas</div><div class="big down">${atr.length}</div></div>
      <div class="card kpi"><div class="lab">Turnover (limpieza)</div><div class="big">${open.filter(t => t.task_type === 'cleaning').length}</div></div>
    </div>
    <div class="grid" style="margin-top:16px"><div class="card empty-sec">
      <div class="orb" style="margin:0 auto 14px"></div>
      <div style="color:#eef2f8;font-size:15px;font-weight:600">Cronograma unificado</div>
      <div style="margin-top:6px;max-width:440px;margin-inline:auto">El motor de operación (Armar día por zona, turnover automático desde check-outs, WhatsApp al equipo) ya vive en el módulo <b>Cronograma</b>.</div>
      <button class="chip" style="margin-top:16px;padding:10px 18px" onclick="closeCommandCenter();setTimeout(()=>openCronograma({name:'Cronograma'}),150)">◆ Abrir Cronograma</button>
    </div></div>`;
}
// ─── SECCIÓN: INQUILINOS ───
function ccSecInquilinos(comp) {
  const active = CC.tenants.filter(t => (t.client_state || '').toLowerCase().includes('activ') || true);
  return `${ccHeader('Inquilinos', 'Rentas', `${CC.tenants.length} inquilinos`)}
    <div class="grid"><div class="card"><table class="ptable"><thead><tr><th>Inquilino</th><th>Teléfono</th><th>Estado</th></tr></thead><tbody>
    ${CC.tenants.slice(0, 30).map(t => `<tr><td>${CC_ESC(t.full_name || '—')}</td><td>${CC_ESC(t.phone || '—')}</td><td><span class="badge b-ok">${CC_ESC(t.client_state || 'activo')}</span></td></tr>`).join('')}</tbody></table></div></div>`;
}
// ─── SECCIÓN: ANALÍTICA ───
function ccSecAnalitica(comp) {
  const { kpi } = comp;
  return `${ccHeader('Analítica', 'KPIs', 'Tendencias e indicadores del portafolio.')}
    <div class="grid row2"><div class="card"><div class="chart-h"><div class="t">Ingresos vs Gastos · 6 meses</div>
      <div class="legend"><span><b style="background:var(--pos)"></b>Ingresos</span><span><b style="background:var(--neg)"></b>Gastos</span></div></div><canvas id="cc-cf" height="150"></canvas></div>
      <div class="card"><div class="chart-h"><div class="t">Cashflow por casa</div><div class="k">rojo = pérdida</div></div><canvas id="cc-house" height="260"></canvas></div></div>`;
}

// ════════════════════════════════════════════════════════════════
// CHARTS (Chart.js)
// ════════════════════════════════════════════════════════════════
function ccDestroyCharts() { CC._charts.forEach(c => { try { c.destroy(); } catch (e) {} }); CC._charts = []; }
function ccTrend6() {
  // Ingresos/gastos de los últimos 6 meses desde pm_payments/pm_expenses.
  const now = new Date(); const months = [];
  for (let i = 5; i >= 0; i--) { const d = new Date(now.getUTCFullYear(), now.getUTCMonth() - i, 1); months.push({ y: d.getFullYear(), m: d.getMonth() + 1 }); }
  const MES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const inc = months.map(({ y, m }) => CC.pay.filter(p => p.paid_at && p.paid_at.slice(0, 7) === `${y}-${String(m).padStart(2, '0')}`).reduce((s, p) => s + Number(p.amount || 0), 0) / 1000);
  const exp = months.map(({ y, m }) => CC.exp.filter(e => e.expense_date && e.expense_date.slice(0, 7) === `${y}-${String(m).padStart(2, '0')}`).reduce((s, e) => s + Number(e.amount || 0), 0) / 1000);
  return { labels: months.map(x => MES[x.m - 1]), inc, exp };
}
function ccMountCharts(comp) {
  if (!window.Chart) return;
  const ax = { grid: { color: 'rgba(255,255,255,.05)' }, ticks: { color: '#5b6780', font: { size: 10 } } };
  const gext = { plugins: { legend: { display: false } }, maintainAspectRatio: false, scales: { x: { grid: { display: false }, ticks: { color: '#5b6780', font: { size: 10 } } }, y: ax } };
  const mk = (id, cfg) => { const el = document.getElementById(id); if (el) CC._charts.push(new Chart(el, cfg)); };
  const grad = (ctx, c1, c2) => { const g = ctx.createLinearGradient(0, 0, 0, 150); g.addColorStop(0, c1); g.addColorStop(1, c2); return g; };
  // sparklines
  const spark = (id, data, color) => mk(id, { type: 'line', data: { labels: data.map((_, i) => i), datasets: [{ data, borderColor: color, borderWidth: 1.8, tension: .4, pointRadius: 0, fill: false }] }, options: { plugins: { legend: { display: false } }, maintainAspectRatio: false, scales: { x: { display: false }, y: { display: false } } } });
  const tr = ccTrend6();
  spark('cc-sp1', tr.inc.map((v, i) => v - tr.exp[i]), '#f0687a');
  spark('cc-sp2', [comp.kpi.potTotal / 1000, comp.kpi.potTotal / 1000], '#45e3c6');
  spark('cc-sp3', [3, 4, 5, 6, comp.kpi.freeU, ccInsights(comp).length], '#93a0b6');
  // ingresos vs gastos
  const cfEl = document.getElementById('cc-cf');
  if (cfEl) { const ctx = cfEl.getContext('2d'); mk('cc-cf', { type: 'line', data: { labels: tr.labels, datasets: [{ label: 'Ingresos', data: tr.inc, borderColor: '#48d69c', backgroundColor: grad(ctx, 'rgba(72,214,156,.20)', 'rgba(72,214,156,0)'), fill: true, tension: .4, pointRadius: 2.5, borderWidth: 2.2 }, { label: 'Gastos', data: tr.exp, borderColor: '#f0687a', backgroundColor: grad(ctx, 'rgba(240,104,122,.14)', 'rgba(240,104,122,0)'), fill: true, tension: .4, pointRadius: 2.5, borderWidth: 2.2 }] }, options: gext }); }
  // cashflow por casa
  const hs = [...comp.houses].filter(h => h.inc > 0 || h.exp > 0).sort((a, b) => b.net - a.net).slice(0, 10);
  mk('cc-house', { type: 'bar', data: { labels: hs.map(h => h.name.split(',')[0].slice(0, 16)), datasets: [{ data: hs.map(h => h.net), borderRadius: 5, backgroundColor: hs.map(h => h.net >= 0 ? '#48d69c' : '#f0687a') }] }, options: { ...gext, indexAxis: 'y', scales: { x: ax, y: { grid: { display: false }, ticks: { color: '#93a0b6', font: { size: 10 } } } } } });
  // donut gastos por tipo
  const mb = comp.mb; const inM = d => d && d >= mb.from && d <= mb.to;
  const bucket = e => { const s = (e.subcategory || '').toLowerCase(); if (/hipotec/.test(s)) return 'Hipoteca'; if (/servicio|públic|publico/.test(s)) return 'Servicios'; if (/nómina|nomina|equipo/.test(s)) return 'Nómina'; if (/plataforma/.test(s)) return 'Plataforma'; if (/aseo|podada|mantenim/.test(s)) return 'Mantenimiento'; return 'Otros'; };
  const byB = {}; CC.exp.filter(e => inM(e.expense_date)).forEach(e => byB[bucket(e)] = (byB[bucket(e)] || 0) + Number(e.amount || 0));
  const bl = Object.keys(byB), bv = Object.values(byB);
  mk('cc-donut', { type: 'doughnut', data: { labels: bl, datasets: [{ data: bv, backgroundColor: ['#4f8dff', '#45e3c6', '#8a7bff', '#3a6f74', '#4a5568', '#e7b65e'], borderColor: '#0a0e16', borderWidth: 3 }] }, options: { maintainAspectRatio: false, cutout: '66%', plugins: { legend: { position: 'bottom', labels: { color: '#93a0b6', font: { size: 10 }, boxWidth: 8, padding: 9 } } } } });
}
