// ════════════════════════════════════════════════════════════════
// 🛰️ PROPERTY OS · COMMAND CENTER — app unificada de Rentas (dark, sobria).
// Fuente de verdad = Airtable (apptTKRYbx6gu701i) vía pm_* (SOLO LECTURA).
// Secciones: Command Center · Propiedades · Reservas · Operación · Inquilinos
//            · Finanzas · Analítica · Cerebro IA (insights por reglas, sin IA externa).
// ════════════════════════════════════════════════════════════════
const CC = {
  sys: null, section: 'command', loading: false, loadError: null,
  props: [], units: [], pay: [], exp: [], book: [], tenants: [], tasks: [], alerts: [],
  _charts: [], chat: [], chatBusy: false,
  memories: [], memLoaded: false, memBusy: false,
  daily: { text: '', loading: false, error: null }, chatLoaded: false,
};
const CC_CHAT_SESSION = 'main';
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
  #cc-overlay[data-theme="light"]{
    --bg:#eef2f8;--ink:#0f1c2e;--mut:#48566e;--mut2:#8595ac;--glass:rgba(255,255,255,.82);--glassb:rgba(15,23,42,.09);
    --a1:#12b5a0;--a2:#2f6ef0;--a3:#6b5bef;--pos:#0ea371;--neg:#e0455f;--amber:#c98a1e}
  #cc-overlay[data-theme="light"] .bgfx{background:radial-gradient(760px 520px at 8% -6%,rgba(18,181,160,.1),transparent 58%),radial-gradient(820px 560px at 100% 4%,rgba(47,110,240,.1),transparent 56%),radial-gradient(700px 620px at 70% 118%,rgba(107,91,239,.08),transparent 60%),linear-gradient(180deg,#f6f8fc,#eaf0f8)}
  #cc-overlay[data-theme="light"] .side{background:linear-gradient(180deg,rgba(255,255,255,.85),rgba(240,244,250,.85))}
  #cc-overlay[data-theme="light"] .card{box-shadow:0 10px 30px -18px rgba(15,23,42,.25)}
  #cc-overlay[data-theme="light"] .glow{text-shadow:none}#cc-overlay[data-theme="light"] .ring i{background:#f6f8fc}
  #cc-overlay[data-theme="light"] .shimmer{background:linear-gradient(90deg,var(--a3) 30%,var(--a2) 50%,var(--a3) 70%);background-size:200% 100%;-webkit-background-clip:text;background-clip:text;color:transparent}
  #cc-overlay[data-theme="light"] .pill.ai,#cc-overlay[data-theme="light"] .cbub.u{color:var(--ink)}
  #cc-overlay .pos-theme-btn{position:fixed;top:16px;right:62px;z-index:5;background:var(--glass);border:1px solid var(--glassb);color:var(--mut);width:34px;height:34px;border-radius:10px;cursor:pointer;font-size:15px;backdrop-filter:blur(10px)}
  #cc-overlay .pos-theme-btn:hover{color:var(--ink);border-color:var(--a2)}
  /* ── QA modo claro: emparejar texto/paneles hardcodeados dark-first (contraste AA) ── */
  #cc-overlay[data-theme="light"] .brain{background:linear-gradient(180deg,rgba(107,91,239,.1),rgba(47,110,240,.05))}
  #cc-overlay[data-theme="light"] .daytxt,#cc-overlay[data-theme="light"] .daytxt b,#cc-overlay[data-theme="light"] .daytxt strong{color:var(--ink)}
  #cc-overlay[data-theme="light"] .insight .tx,#cc-overlay[data-theme="light"] .insight .tx b{color:var(--ink)}
  #cc-overlay[data-theme="light"] .cbub.u,#cc-overlay[data-theme="light"] .cbub.a,#cc-overlay[data-theme="light"] .cbub.a b,#cc-overlay[data-theme="light"] .cbub.a strong{color:var(--ink)}
  #cc-overlay[data-theme="light"] .cbub.err{color:var(--neg)}
  #cc-overlay[data-theme="light"] .memtxt,#cc-overlay[data-theme="light"] .reptitle,#cc-overlay[data-theme="light"] .dqhead,#cc-overlay[data-theme="light"] .dqitem{color:var(--ink)}
  #cc-overlay[data-theme="light"] .cbub .memsave{color:var(--a3)}
  #cc-overlay[data-theme="light"] .dqnote b{color:var(--a1)}#cc-overlay[data-theme="light"] .memtipo.t-hecho{color:var(--a2)}
  #cc-overlay[data-theme="light"] .dayre:hover,#cc-overlay[data-theme="light"] .chip:hover,#cc-overlay[data-theme="light"] .cbub .memsave:hover,#cc-overlay[data-theme="light"] .memacts button:hover,#cc-overlay[data-theme="light"] .tbtn:hover{color:var(--ink)}
  /* sparklines detrás del texto (evita "gráfica encima del texto") */
  #cc-overlay .kpi .lab,#cc-overlay .kpi .big,#cc-overlay .kpi .meta{position:relative;z-index:2}
  #cc-overlay .kpi .meta{padding-right:96px}
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
  #cc-overlay .top{display:flex;align-items:flex-start;gap:16px;margin-bottom:22px;padding-right:104px}
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
  #cc-overlay .spark{position:absolute;right:14px;bottom:12px;width:88px;height:34px;z-index:1;opacity:.7;pointer-events:none}
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
  #cc-overlay .iaction{font-size:11px;color:var(--a1);margin-top:5px;font-weight:500;opacity:.92}
  #cc-overlay .daybanner{display:flex;align-items:center;gap:14px;margin-bottom:16px;padding:14px 18px;border-radius:14px;
    background:linear-gradient(90deg,rgba(138,123,255,.12),rgba(79,141,255,.06));border:1px solid rgba(138,123,255,.24);backdrop-filter:blur(12px)}
  #cc-overlay .daytxt{font-size:13px;line-height:1.55;color:#e6ebf5}#cc-overlay .daytxt b,#cc-overlay .daytxt strong{color:#fff}
  #cc-overlay .daytxt p{margin:0 0 4px}#cc-overlay .daytxt p:last-child{margin:0}
  #cc-overlay .dayre{flex-shrink:0;background:rgba(255,255,255,.06);border:1px solid var(--glassb);color:var(--mut);width:34px;height:34px;border-radius:10px;cursor:pointer;font-size:15px}
  #cc-overlay .dayre:hover{color:#fff;border-color:rgba(138,123,255,.5)}#cc-overlay .dayre:disabled{opacity:.5;cursor:default}
  #cc-overlay .ask{display:flex;gap:8px;margin-top:14px}
  #cc-overlay .ask input{flex:1;background:rgba(6,9,16,.72);border:1px solid rgba(138,123,255,.32);border-radius:11px;padding:12px 14px;color:var(--ink);font-size:12px;outline:none}
  #cc-overlay .ask input::placeholder{color:var(--mut2)}
  #cc-overlay .ask button{background:linear-gradient(135deg,var(--a1),var(--a2));border:none;color:#04121a;font-weight:750;padding:0 16px;border-radius:11px;cursor:pointer;font-size:12px;box-shadow:0 8px 20px -8px rgba(79,141,255,.7)}
  #cc-overlay .chips{display:flex;gap:7px;flex-wrap:wrap;margin-top:11px}
  #cc-overlay .chip{font-size:11px;color:var(--mut);background:rgba(255,255,255,.04);border:1px solid var(--glassb);padding:6px 11px;border-radius:18px;cursor:pointer}
  #cc-overlay .chip:hover{color:#fff;border-color:rgba(138,123,255,.45)}
  #cc-overlay .cc-chat{margin-top:14px;display:flex;flex-direction:column;gap:10px;max-height:340px;overflow-y:auto;padding-right:4px}
  #cc-overlay .cc-chat:empty{display:none}
  #cc-overlay .cbub{max-width:82%;padding:10px 13px;border-radius:13px;font-size:12.5px;line-height:1.55;white-space:pre-wrap;word-wrap:break-word}
  #cc-overlay .cbub.u{align-self:flex-end;background:linear-gradient(135deg,rgba(69,227,198,.16),rgba(79,141,255,.14));border:1px solid rgba(79,141,255,.3);color:#eaf2ff}
  #cc-overlay .cbub.a{align-self:flex-start;background:rgba(255,255,255,.04);border:1px solid var(--glassb);color:#d6ddec}
  #cc-overlay .cbub.a b{color:#fff}#cc-overlay .cbub.a strong{color:#fff}
  #cc-overlay .cbub.err{border-color:rgba(240,104,122,.4);color:#f7b9c2}
  #cc-overlay .cbub.think{color:var(--mut2);font-style:italic}
  #cc-overlay .cbub p{margin:0 0 6px}#cc-overlay .cbub p:last-child{margin:0}
  #cc-overlay .cbub ul{margin:4px 0 6px 18px;list-style:disc}#cc-overlay .cbub ol{margin:4px 0 6px 20px;list-style:decimal}
  #cc-overlay .cbub li{margin:3px 0;padding-left:2px}#cc-overlay .cbub li p{display:inline;margin:0}
  @keyframes ccblink{0%,100%{opacity:.35}50%{opacity:1}}#cc-overlay .cbub.think::after{content:"▋";animation:ccblink 1s infinite}
  #cc-overlay .cbub .memsave{display:block;margin-top:8px;background:rgba(138,123,255,.14);border:1px solid rgba(138,123,255,.3);color:#c9c2ff;font-size:10px;padding:3px 9px;border-radius:7px;cursor:pointer}
  #cc-overlay .cbub .memsave:hover{background:rgba(138,123,255,.25);color:#fff}
  #cc-overlay .memadd{display:flex;gap:8px;margin:6px 0 14px;flex-wrap:wrap}
  #cc-overlay .memadd select{background:rgba(6,9,16,.72);border:1px solid var(--glassb);border-radius:10px;color:var(--ink);font-size:12px;padding:9px 10px;outline:none}
  #cc-overlay .memadd input{flex:1;min-width:220px;background:rgba(6,9,16,.72);border:1px solid var(--glassb);border-radius:10px;padding:9px 12px;color:var(--ink);font-size:12px;outline:none}
  #cc-overlay .memadd input::placeholder{color:var(--mut2)}
  #cc-overlay .memadd button{background:linear-gradient(135deg,var(--a1),var(--a2));border:none;color:#04121a;font-weight:750;padding:0 15px;border-radius:10px;cursor:pointer;font-size:12px}
  #cc-overlay .memrow{display:flex;gap:11px;align-items:flex-start;padding:11px 0;border-bottom:1px solid rgba(255,255,255,.05)}
  #cc-overlay .memrow.off{opacity:.42}
  #cc-overlay .memtipo{flex-shrink:0;font-size:10px;font-weight:700;padding:3px 8px;border-radius:7px;background:rgba(255,255,255,.05);color:var(--mut);white-space:nowrap;margin-top:1px}
  #cc-overlay .memtipo.t-hecho{background:rgba(79,141,255,.14);color:#8fb6ff}#cc-overlay .memtipo.t-dec{background:rgba(69,227,198,.14);color:var(--a1)}
  #cc-overlay .memtipo.t-aprendizaje{background:rgba(231,182,94,.14);color:var(--amber)}#cc-overlay .memtipo.t-nota{background:rgba(255,255,255,.06);color:var(--mut)}
  #cc-overlay .memtxt{flex:1;font-size:12.5px;line-height:1.55;color:#d6ddec}
  #cc-overlay .memmeta{font-size:10px;color:var(--mut2);margin-top:4px}
  #cc-overlay .memacts{display:flex;gap:5px;flex-shrink:0}
  #cc-overlay .memacts button{background:rgba(255,255,255,.05);border:1px solid var(--glassb);color:var(--mut);width:28px;height:28px;border-radius:8px;cursor:pointer;font-size:12px}
  #cc-overlay .memacts button:hover{color:#fff;border-color:rgba(255,255,255,.2)}
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
  #cc-overlay .op-eq{font-size:9.5px;color:var(--a2);background:rgba(79,141,255,.12);padding:1px 7px;border-radius:12px;margin-left:6px}
  #cc-overlay .tbtn{background:rgba(255,255,255,.05);border:1px solid var(--glassb);color:var(--mut);width:28px;height:26px;border-radius:7px;cursor:pointer;font-size:12px}
  #cc-overlay .tbtn:hover{color:#fff;border-color:rgba(69,227,198,.5)}
  #cc-overlay .reptools{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:16px;padding:12px 16px;border-radius:12px;background:var(--glass);border:1px solid var(--glassb)}
  #cc-overlay .reptitle{font-size:12px;font-weight:650;color:#e6ebf5}
  #cc-overlay .repbtn{background:linear-gradient(135deg,var(--a1),var(--a2));border:none;color:#04121a;font-weight:700;padding:8px 13px;border-radius:9px;cursor:pointer;font-size:11.5px}
  #cc-overlay .repbtn.ghost{background:rgba(255,255,255,.05);border:1px solid var(--glassb);color:var(--ink)}
  #cc-overlay .repbtn:hover{filter:brightness(1.08)}#cc-overlay .rephint{font-size:10.5px;color:var(--mut2);margin-left:auto}
  #cc-overlay .rtask{font-size:9.5px;padding:2px 8px;border-radius:12px;background:rgba(69,227,198,.12);color:var(--a1)}
  #cc-overlay .empty-sec{padding:60px;text-align:center;color:var(--mut2)}
  #cc-overlay .dqcat{padding:10px 0;border-bottom:1px solid rgba(255,255,255,.05)}#cc-overlay .dqcat:last-child{border-bottom:none}
  #cc-overlay .dqhead{display:flex;align-items:center;justify-content:space-between;font-size:12.5px;font-weight:640;color:#e6ebf5;margin-bottom:7px}
  #cc-overlay .dqcount{font-size:10px;font-weight:700;background:rgba(240,104,122,.14);color:var(--neg);padding:2px 9px;border-radius:20px}
  #cc-overlay .dqrow{display:flex;gap:12px;font-size:11.5px;padding:3px 0 3px 22px;color:var(--mut)}
  #cc-overlay .dqitem{color:#cdd6e6;min-width:150px;font-weight:500}#cc-overlay .dqdetail{color:var(--mut2)}
  #cc-overlay .dqmore{font-size:11px;color:var(--mut2);padding:3px 0 3px 22px}
  #cc-overlay .dqnote{font-size:11px;color:var(--a1);padding:6px 0 2px 22px;opacity:.9}#cc-overlay .dqnote b{color:#7ff0dc}
  #cc-overlay .main,#cc-overlay .card,#cc-overlay .nav a,#cc-overlay .daybanner{animation:ccfade .35s ease}
  @keyframes ccfade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
  @media (max-width:960px){
    #cc-overlay{overflow-x:hidden}
    #cc-overlay .app{grid-template-columns:minmax(0,1fr)}
    #cc-overlay .main{min-width:0;max-width:100%}
    #cc-overlay canvas{max-width:100%!important}
    #cc-overlay .kpis{grid-template-columns:repeat(2,minmax(0,1fr))}
    #cc-overlay .grid{grid-template-columns:minmax(0,1fr)}
    #cc-overlay .side{position:sticky;top:0;height:auto;flex-direction:column;gap:8px;padding:12px 14px;z-index:3}
    #cc-overlay .side .navlbl,#cc-overlay .side .foot{display:none}
    #cc-overlay .brand{padding:2px 4px 8px}
    #cc-overlay .nav{flex-direction:row;flex-wrap:nowrap;overflow-x:auto;gap:5px;padding-bottom:4px}
    #cc-overlay .nav a{white-space:nowrap;flex-shrink:0;padding:8px 11px;font-size:12px}
    #cc-overlay .nav a .b{display:none}#cc-overlay .nav a.on::before{display:none}
    #cc-overlay .main{padding:16px 14px 40px}
    #cc-overlay .row2,#cc-overlay .row3{grid-template-columns:minmax(0,1fr)}
    #cc-overlay .top{flex-direction:column;padding-right:46px}#cc-overlay .pills{margin-left:0;flex-wrap:wrap}
    #cc-overlay .top h1{font-size:20px}
    #cc-overlay .ptable{display:block;overflow-x:auto;min-width:0;font-size:11.5px}
    #cc-overlay .reptools .rephint{margin-left:0;width:100%}
    #cc-overlay .ccclose{top:12px;right:12px}
  }
  @media (max-width:560px){ #cc-overlay .kpis{grid-template-columns:minmax(0,1fr)} #cc-overlay .kpi .big{font-size:27px} }`;
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
  if (window.posApplyTheme) posApplyTheme(ov);
  ov.innerHTML = '<div class="bgfx"></div><div class="gridfx"></div><div class="app"><aside class="side"></aside><main class="main"><div style="padding:60px;color:#5b6780">⏳ Conectando con Airtable…</div></main></div><button class="pos-theme-btn" onclick="ccToggleTheme()" title="Tema claro/oscuro">◐</button><button class="ccclose" onclick="closeCommandCenter()" title="Cerrar">✕</button>';
  document.body.style.overflow = 'hidden';
  await ccLoadAll();
  if (!CC.chatLoaded) { try { await ccLoadChat(); } catch (e) {} }
  ccRender();
}
window.openCommandCenter = openCommandCenter;
function closeCommandCenter() { const ov = document.getElementById('cc-overlay'); if (ov) ov.remove(); document.body.style.overflow = ''; ccDestroyCharts(); }
window.closeCommandCenter = closeCommandCenter;
function ccToggleTheme() { if (window.posToggleTheme) posToggleTheme(); ccRender(); }
window.ccToggleTheme = ccToggleTheme;

async function ccLoadAll() {
  CC.loading = true; CC.loadError = null;
  try {
    const [props, units, pay, exp, book, tenants, tasks, alerts] = await Promise.all([
      sb.from('pm_properties').select('id,name,address,zone,rental_model,total_units,mortgage_monthly,loan_type').eq('active', true).order('name'),
      sb.from('pm_units').select('id,name,property_id,status,target_rent,unit_type,is_active').eq('is_active', true),
      sb.from('pm_payments').select('amount,type,status,property_id,tenant_id,unit_id,paid_at,billing_ym').eq('active', true).eq('type', 'ingreso').eq('status', 'pagado'),
      sb.from('pm_expenses').select('amount,category,subcategory,property_id,expense_date,billing_ym,scope').eq('active', true),
      sb.from('pm_bookings').select('unit_id,property_id,tenant_id,start_date,end_date,status').eq('active', true),
      sb.from('pm_tenants').select('id,full_name,phone,client_state,rent_amount,contract_start,contract_end,deposit'),
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
  // MES DE RENTA (tag Mes/Año de Airtable → billing_ym) — la definición oficial para
  // ingresos y gastos del mes. Sin tag, cae a la fecha (igual que antes para esas filas).
  const ymOf = x => x.billing_ym || (x.paid_at || x.expense_date || '').slice(0, 7);
  const inBillMonth = x => ymOf(x) === mb.from.slice(0, 7);
  const H = {};
  CC.props.forEach(p => H[p.id] = { id: p.id, name: p.name, zone: p.zone, model: p.rental_model, inc: 0, exp: 0, hipo: 0, hipoFija: Number(p.mortgage_monthly || 0), loanType: p.loan_type || '', units: [], pot: 0 });
  CC.units.forEach(u => { const h = H[u.property_id]; if (!h) return; h.units.push(u); h.pot += Number(u.target_rent || 0); });
  CC.pay.forEach(p => { if (inBillMonth(p) && H[p.property_id]) H[p.property_id].inc += Number(p.amount || 0); });
  CC.exp.forEach(e => { if (inBillMonth(e) && H[e.property_id]) { H[e.property_id].exp += Number(e.amount || 0); if (ccIsHipo(e)) H[e.property_id].hipo += Number(e.amount || 0); } });
  const houses = Object.values(H).map(h => {
    const r = ccRentable(h.units);
    // Renta esperada de las unidades OCUPADAS (para detectar "ocupada sin ingresos").
    const occRent = h.units.filter(u => ccUnitState(u) === 'ocupada').reduce((s, u) => s + Number(u.target_rent || 0), 0);
    return { ...h, net: h.inc - h.exp, flujoEstructural: occRent - h.hipoFija, total: r.total, occ: r.occ, res: r.res, free: r.free, mant: r.mant, pct: r.total ? Math.round(r.occ / r.total * 100) : 0, occRent };
  });

  // Global rentable (suma por casa, coherente con las fichas)
  const totalU = houses.reduce((s, h) => s + h.total, 0);
  const occU = houses.reduce((s, h) => s + h.occ, 0);
  const resU = houses.reduce((s, h) => s + h.res, 0);
  const freeU = houses.reduce((s, h) => s + h.free, 0);
  const inc = CC.pay.filter(inBillMonth).reduce((s, p) => s + Number(p.amount || 0), 0);
  const incCash = CC.pay.filter(p => inMonth(p.paid_at)).reduce((s, p) => s + Number(p.amount || 0), 0); // cobrado en el mes (caja)
  const expT = CC.exp.filter(inBillMonth).reduce((s, e) => s + Number(e.amount || 0), 0);
  const potTotal = CC.units.reduce((s, u) => s + Number(u.target_rent || 0), 0);
  const potFree = CC.units.filter(u => ccUnitState(u) === 'libre').reduce((s, u) => s + Number(u.target_rent || 0), 0);
  const capture = potTotal ? Math.round((potTotal - potFree) / potTotal * 100) : 0;

  return { mb, houses, kpi: { totalU, occU, resU, freeU, occPct: totalU ? Math.round(occU / totalU * 100) : 0, inc, incCash, expT, cashflow: inc - expT, potTotal, potFree, capture } };
}

// ─── INSIGHTS (reglas rankeadas por $ de impacto) ───
function ccInsights(comp) {
  const { houses, kpi, mb } = comp;
  const ins = [];
  // 0) OCUPADA SIN INGRESOS (cobranza/registro) — ocupada pero $0 (o casi) facturado.
  // El monto que DEBERÍA entrar es la renta de las unidades ocupadas (occRent).
  houses.filter(h => h.occ > 0 && h.occRent > 0 && h.inc < h.occRent * 0.35)
    .sort((a, b) => (b.occRent - b.inc) - (a.occRent - a.inc)).forEach(h => {
      const falta = h.occRent - h.inc;
      ins.push({ sev: 'critical', impact: falta, tag: 'COBRANZA / REGISTRO', sec: 'finanzas',
        tx: `<b>${CC_ESC(h.name)}</b> está <b>ocupada</b> (${h.occ} u.) pero solo facturó ${CC_MONEY(h.inc)} de ~${CC_MONEY(h.occRent)} esperados. Faltan <b>${CC_MONEY(falta)}/mes</b> — es problema de <b>cobranza o registro</b>, no de ocupación.`,
        action: `Revisar los pagos de ${h.name.split(',')[0]} en Airtable (¿faltan cargar? ¿inquilino sin pagar?)` });
    });
  // 1) Casas en rojo (peor primero) con causa — excluye las ya marcadas por cobranza.
  const cobranzaNames = new Set(ins.map(i => i.tx));
  houses.filter(h => h.net < 0 && (h.inc > 0 || h.exp > 0) && !(h.occ > 0 && h.occRent > 0 && h.inc < h.occRent * 0.35))
    .sort((a, b) => a.net - b.net).forEach(h => {
    const causa = h.free > 0 ? `${h.free} unidad(es) libre(s)` : (h.hipo > h.inc ? `hipoteca ${CC_MONEY(h.hipo)} > ingreso ${CC_MONEY(h.inc)}` : 'gastos altos');
    ins.push({ sev: 'critical', impact: Math.abs(h.net), tag: 'CRÍTICO · CASHFLOW', sec: 'finanzas',
      tx: `<b>${CC_ESC(h.name)}</b> arrastra <b>${CC_MONEY(-h.net)}/mes</b> (${causa}).`,
      action: h.free > 0 ? `Colocar las ${h.free} unidad(es) libre(s) de ${h.name.split(',')[0]}` : `Revisar gastos e hipoteca de ${h.name.split(',')[0]} en Airtable` });
  });
  // 2) Unidades libres / potencial perdido
  if (kpi.potFree > 0) {
    const peor = houses.filter(h => h.free > 0).sort((a, b) => b.free - a.free)[0];
    ins.push({ sev: 'opportunity', impact: kpi.potFree, tag: 'OPORTUNIDAD', sec: 'propiedades',
      tx: `<b>${kpi.freeU} unidades libres</b> = <b>${CC_MONEY(kpi.potFree)}/mes</b> en juego${peor ? `. ${CC_ESC(peor.name)} (${peor.free} libres) es la prioridad de turnover` : ''}.`,
      action: peor ? `Arrancar turnover/publicación de ${peor.name.split(',')[0]}` : 'Priorizar turnover de las unidades libres' });
  }
  // 3) Ocupación baja por zona
  const Z = {}; houses.forEach(h => { const z = h.zone || 'sin'; (Z[z] = Z[z] || { o: 0, t: 0, free: 0 }); Z[z].o += h.occ + h.res; Z[z].t += h.total; Z[z].free += h.free; });
  Object.entries(Z).filter(([z, v]) => v.t && v.o / v.t < 0.7).sort((a, b) => b[1].free - a[1].free).forEach(([z, v]) => ins.push({ sev: 'warning', impact: v.free * 800, tag: 'OCUPACIÓN', sec: 'propiedades',
    tx: `Zona <b>${ccZoneLabel(z === 'sin' ? null : z)}</b>: ocupación ${Math.round(v.o / v.t * 100)}% (${v.free} libres).`, action: `Enfocar publicación en zona ${ccZoneLabel(z === 'sin' ? null : z)}` }));
  // 4) Reservas por vencer (30 días)
  const today = new Date().toISOString().slice(0, 10); const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const venc = CC.book.filter(b => b.end_date && b.end_date >= today && b.end_date <= in30 && ['activo', 'confirmado'].includes(b.status));
  if (venc.length) ins.push({ sev: 'warning', impact: venc.length * 1000, tag: 'RESERVAS', sec: 'reservas',
    tx: `<b>${venc.length} reserva(s)</b> vencen en 30 días — renovar o preparar turnover.`, action: 'Contactar inquilinos por renovación y avisar a limpieza' });
  // 5) Outliers de gasto (hipoteca)
  const hipos = houses.filter(h => h.hipo > 0).map(h => h.hipo); const meanH = hipos.reduce((s, v) => s + v, 0) / (hipos.length || 1);
  houses.filter(h => h.hipo > meanH * 1.5).sort((a, b) => b.hipo - a.hipo).slice(0, 2).forEach(h => ins.push({ sev: 'warning', impact: h.hipo, tag: 'OUTLIER GASTO', sec: 'finanzas',
    tx: `<b>${CC_ESC(h.name)}</b>: hipoteca ${CC_MONEY(h.hipo)}/mes, muy sobre el promedio (${CC_MONEY(meanH)}).`, action: `Chequear términos del préstamo de ${h.name.split(',')[0]} (¿HML por refinanciar?)` }));
  // 6) Memoria / contexto (informativo)
  ins.push({ sev: 'info', impact: 0, tag: 'MEMORIA', sec: 'analitica',
    tx: `La <b>hipoteca</b> entra como gasto fijo por casa desde su fecha real → NOI por casa exacto. Cashflow de ${mb.label}: <b>${CC_MONEY(kpi.cashflow)}</b>.` });
  const rank = { critical: 0, warning: 1, opportunity: 1, info: 3 };
  ins.sort((a, b) => (rank[a.sev] - rank[b.sev]) || (b.impact - a.impact));
  return ins;
}

// ─── SNAPSHOT compacto para el Cerebro (Fase 2, chat) ───
// Solo números y nombres reales. Se manda al endpoint /api/brain-chat.
function ccSnapshot(comp) {
  const { kpi, houses, mb } = comp;
  const insights = ccInsights(comp);
  const stripTags = s => String(s || '').replace(/<[^>]+>/g, '');
  const today = new Date().toISOString().slice(0, 10);
  const open = CC.tasks.filter(t => t.status !== 'completado' && t.status !== 'cancelado');
  return {
    mes: mb.label,
    portafolio: {
      casas: CC.props.length, unidades_rentables: kpi.totalU,
      ocupadas: kpi.occU, reservadas: kpi.resU, libres: kpi.freeU, ocupacion_pct: kpi.occPct,
      ingresos_mes: kpi.inc, gastos_mes: kpi.expT, cashflow_mes: kpi.cashflow,
      renta_potencial_mes: kpi.potTotal, potencial_sin_cobrar: kpi.potFree, captura_pct: kpi.capture,
      inquilinos: CC.tenants.length, tareas_abiertas: open.length, tareas_atrasadas: open.filter(t => t.scheduled_date && t.scheduled_date < today).length,
    },
    casas: houses.filter(h => h.total).map(h => ({
      nombre: h.name, zona: ccZoneLabel(h.zone), modelo: h.model,
      unidades: h.total, ocupadas: h.occ, libres: h.free, ocupacion_pct: h.pct,
      ingreso: Math.round(h.inc), gasto: Math.round(h.exp), hipoteca: Math.round(h.hipo),
      cashflow: Math.round(h.net), renta_potencial: Math.round(h.pot),
    })).sort((a, b) => a.cashflow - b.cashflow),
    insights_top: insights.slice(0, 12).map(i => ({ tipo: i.sev, tag: i.tag, detalle: stripTags(i.tx), impacto_usd: Math.round(i.impact) })),
  };
}

// ─── CALIDAD DE DATOS (accionable; la app NO escribe, se corrige en Airtable) ───
function ccDataQuality(comp) {
  const pName = id => (CC.props.find(p => p.id === id)?.name || 'Sin casa').split(',')[0];
  const cats = [];
  const push = (cat, icon, tabla, items) => { if (items.length) cats.push({ cat, icon, tabla, items }); };
  // 1) Ocupadas sin ingreso (cobranza/registro)
  push('Ocupadas sin ingreso registrado', '💸', 'Pagos', comp.houses
    .filter(h => h.occ > 0 && h.occRent > 0 && h.inc < h.occRent * 0.35)
    .sort((a, b) => (b.occRent - b.inc) - (a.occRent - a.inc))
    .map(h => ({ item: h.name.split(',')[0], detail: `${h.occ} u. ocupada(s) · facturó ${CC_MONEY(h.inc)} de ~${CC_MONEY(h.occRent)}` })));
  // 2) Unidades sin renta objetivo
  push('Unidades sin renta objetivo', '🏷️', 'Unidades', CC.units
    .filter(u => !Number(u.target_rent) && ccUnitState(u) !== 'libre')
    .map(u => ({ item: `${pName(u.property_id)} · ${CC_ESC(u.name || u.unit_type || 'unidad')}`, detail: 'Renta objetivo vacía' })));
  // 3) Reservas sin fecha de entrada
  push('Reservas sin fecha de entrada', '📅', 'Reservas', CC.book
    .filter(b => !b.start_date)
    .map(b => ({ item: pName(b.property_id), detail: `estado ${b.status || '—'} · sin Fecha Entrada` })));
  // 4) Gastos sin monto
  push('Gastos sin monto', '🧾', 'Gastos', CC.exp
    .filter(e => !Number(e.amount))
    .slice(0, 30)
    .map(e => ({ item: pName(e.property_id), detail: `${CC_ESC(e.subcategory || e.category || 'gasto')} · monto vacío` })));
  const total = cats.reduce((s, c) => s + c.items.length, 0);
  return { cats, total };
}
function ccDataQualityCard(comp) {
  const dq = ccDataQuality(comp);
  const notaTabla = t => `Corregir en Airtable → tabla <b>${t}</b>`;
  return `<div class="grid" style="margin-top:16px"><div class="card">
    <div class="chart-h"><div class="t">🔎 Calidad de datos${dq.total ? ` · <span class="down">${dq.total} para revisar</span>` : ' · <span class="up">todo en orden ✓</span>'}</div><div class="k">la app no escribe — se corrige en Airtable</div></div>
    ${dq.total ? dq.cats.map(c => `<div class="dqcat">
      <div class="dqhead"><span>${c.icon} ${c.cat}</span><span class="dqcount">${c.items.length}</span></div>
      ${c.items.slice(0, 6).map(it => `<div class="dqrow"><span class="dqitem">${it.item}</span><span class="dqdetail">${it.detail}</span></div>`).join('')}
      ${c.items.length > 6 ? `<div class="dqmore">+ ${c.items.length - 6} más…</div>` : ''}
      <div class="dqnote">➜ ${notaTabla(c.tabla)}</div>
    </div>`).join('') : '<div style="color:#48d69c;font-size:12.5px;padding:12px 0">No se detectaron inconsistencias de datos. 🎉</div>'}
  </div></div>`;
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
  // Cargar memorias del Cerebro la primera vez que se entra a esa sección.
  if (CC.section === 'cerebro' && !CC.memLoaded) ccLoadMemories();
  // Resumen del día: generar una vez al entrar al Command Center.
  if (CC.section === 'command' && !CC.daily.text && !CC.daily.loading) ccDailySummary();
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
    <div class="daybanner" id="cc-daybanner">${ccDailyHTML()}</div>
    <div class="grid kpis">
      <div class="card kpi occ"><div><div class="lab">Ocupación</div>
        <div class="meta" style="margin-top:10px">${kpi.occU} de ${kpi.totalU} unidades<br><span class="${kpi.occPct >= 80 ? 'up' : 'warn'}">${kpi.occU} ocupadas · ${kpi.resU} reservadas · ${kpi.freeU} libres</span></div></div>
        <div class="ring" style="background:conic-gradient(from -90deg,var(--a1),var(--a2) ${kpi.occPct}%,rgba(255,255,255,.07) 0)"><i>${kpi.occPct}%</i></div></div>
      <div class="card kpi"><div class="lab">Cashflow del mes · ${comp.mb.label}</div>
        <div class="big ${cf < 0 ? 'down' : 'up'}">${CC_MONEY(cf)}</div>
        <div class="meta">Ingresos ${CC_K(kpi.inc)} · Gastos ${CC_K(kpi.expT)}${kpi.expT > kpi.inc ? ' · <span class="warn">hipoteca cargada</span>' : ''}</div></div>
      <div class="card kpi"><div class="lab">Renta potencial / mes</div>
        <div class="big glow">${CC_MONEY(kpi.potTotal)}</div>
        <div class="meta">Captura ${kpi.capture}% · <span class="warn">${CC_MONEY(kpi.potFree)} sin cobrar (${kpi.freeU} libres)</span></div></div>
      <div class="card kpi"><div class="lab">Alertas del cerebro</div>
        <div class="big">${insights.length}</div>
        <div class="meta"><span class="down">${crit} críticas</span> · ${insights.length - crit} por revisar · accionables</div></div>
    </div>
    <div class="grid row2">
      <div class="card"><div class="chart-h"><div class="t">Ingresos vs Gastos · 6 meses</div>
        <div class="legend"><span><b style="background:var(--pos)"></b>Ingresos</span><span><b style="background:var(--neg)"></b>Gastos</span></div></div>
        <canvas id="cc-cf" height="132"></canvas></div>
      <div class="card brain"><div class="bh"><div class="orb"></div><div><b>Cerebro IA</b><span>ANÁLISIS EN VIVO · REGLAS</span></div></div>
        ${insights.slice(0, 3).map(i => `<div class="insight"><div class="ic ${i.sev === 'critical' ? 'r' : i.sev === 'warning' ? 'y' : i.sev === 'opportunity' ? 'g' : 'b'}">●</div><div class="tx">${i.tx}${i.action ? `<div class="iaction">➜ ${CC_ESC(i.action)}</div>` : ''}<div class="tag">${i.tag}</div></div></div>`).join('')}
        <div class="ask"><input id="cc-ask" placeholder="Preguntá a tu copiloto…" onkeydown="if(event.key==='Enter')ccAsk()"><button onclick="ccAsk()">Enviar</button></div>
        <div class="chips"><span class="chip" onclick="ccGo('cerebro')">Ver todos los insights</span><span class="chip" onclick="ccGo('finanzas')">¿Casas en rojo?</span></div></div>
    </div>
    <div class="grid row3">
      <div class="card"><div class="chart-h"><div class="t">Cashflow por casa</div><div class="k">rojo = pérdida</div></div><canvas id="cc-house" height="240"></canvas></div>
      <div class="card"><div class="chart-h"><div class="t">Gastos por tipo · mes</div><div class="k">${CC_K(kpi.expT)}</div></div><canvas id="cc-donut" height="240"></canvas></div>
      <div class="card"><div class="chart-h"><div class="t">Operación de hoy</div><div class="k">cronograma real · ${todayTasks.length} tareas</div></div>
        ${todayTasks.length ? todayTasks.map(t => { const z = t.zone; const eq = t.assignee || (t.task_type === 'cleaning' ? 'Limpieza' : ''); return `<div class="op-item"><span class="op-time">${t.start_at ? String(t.start_at).slice(11, 16) : '—'}</span> <span style="flex:1">${CC_ESC((t.title || '').replace(/^[^A-Za-z0-9]+/, '')).slice(0, 28)}${eq ? ` <span class="op-eq">${CC_ESC(eq)}</span>` : ''}</span> <span class="op-zone ${z === 'norte' ? 'z-n' : 'z-s'}">${ccZoneLabel(z)}</span></div>`; }).join('') : '<div style="color:#5b6780;font-size:12px;padding:14px 0">Sin tareas hoy. Andá a Operación → Armar día.</div>'}
        <div style="margin-top:13px;font-size:11px;color:var(--mut)"><span class="chip" onclick="closeCommandCenter();setTimeout(()=>openCronograma({name:'Cronograma'}),150)">◆ Abrir Cronograma</span></div></div>
    </div>
    <div class="grid" style="margin-top:16px"><div class="card">
      <div class="chart-h"><div class="t">Propiedades · estado & rentabilidad</div><div class="k">${CC.props.length} casas · ${kpi.totalU} unidades</div></div>
      ${ccPropTable(rankHouses)}
    </div></div>
    ${ccDataQualityCard(comp)}`;
}

function ccPropTable(houses, opts = {}) {
  const modelLbl = m => ({ casa_completa: 'Casa Completa', por_habitaciones: 'Habitaciones', por_unidades: 'Unidades', mixta: 'Mixta', por_estudios: 'Estudios', por_apartamentos: 'Apartamentos' }[m] || 'Mixta');
  const badge = h => h.net < -1000 ? '<span class="badge b-red">En rojo</span>' : h.pct < 70 ? '<span class="badge b-warn">Baja ocup.</span>' : h.net < 0 ? '<span class="badge b-warn">Vigilar</span>' : '<span class="badge b-ok">Sana</span>';
  const lim = opts.limit || 12; const guide = !!opts.guide;
  return `<table class="ptable"><thead><tr><th>Casa</th><th>Zona</th><th>Modelo</th><th>Ocupación</th><th>Renta pot.</th><th>Cashflow</th><th>Estado</th>${guide ? '<th>Guía</th>' : ''}</tr></thead><tbody>
    ${houses.slice(0, lim).map(h => `<tr><td>${CC_ESC(h.name).slice(0, 30)}</td><td>${ccZoneLabel(h.zone)}</td><td>${modelLbl(h.model)} · ${h.total}u</td>
      <td><span class="mini-bar"><i style="width:${h.pct}%"></i></span>${h.pct}%</td><td>${CC_MONEY(h.pot)}</td>
      <td class="${h.net >= 0 ? 'up' : 'down'}">${CC_MONEY(h.net)}</td><td>${badge(h)}</td>${guide ? `<td><button class="tbtn" title="Guía de Bienvenida (check-in) en PDF" onclick="ccWelcomeGuide('${h.id}')">📄</button></td>` : ''}</tr>`).join('')}
  </tbody></table>`;
}
// Puentes a las funciones de reportes/guía de pm-main (SOLO LECTURA: generan PDF vía impresión).
function ccWelcomeGuide(id) { if (window.pmGenerateWelcomeGuide) window.pmGenerateWelcomeGuide(id); else if (window.toast) toast('La guía se genera desde el Property Manager.', 'info'); }
function ccReport(type) { if (window.pmOpenReport) window.pmOpenReport(type); else if (window.toast) toast('El reporte se genera desde el Property Manager.', 'info'); }
function ccSendReport(type) { if (window.pmSendReport) window.pmSendReport(type); }
window.ccWelcomeGuide = ccWelcomeGuide; window.ccReport = ccReport; window.ccSendReport = ccSendReport;

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
      <div class="bh"><div class="orb"></div><div><b>Chateá con el Cerebro</b><span>PREGUNTÁ SOBRE TUS NÚMEROS · SOLO LECTURA</span></div></div>
      <div id="cc-chat" class="cc-chat">${ccChatHTML()}</div>
      <div class="ask"><input id="cc-ask" placeholder="Preguntá a tu copiloto…" onkeydown="if(event.key==='Enter')ccAsk()"><button onclick="ccAsk()">Enviar</button></div>
      <div class="chips"><span class="chip" onclick="ccAsk('¿Cuáles son las casas en rojo este mes y por qué?')">¿Casas en rojo y por qué?</span><span class="chip" onclick="ccAsk('¿Qué unidades libres conviene colocar primero para recuperar más plata?')">¿Qué colocar primero?</span><span class="chip" onclick="ccAsk('Dame un resumen ejecutivo del mes en 4 puntos.')">Resumen ejecutivo</span></div>
    </div></div>
    <div class="grid" style="margin-top:16px"><div class="card">
      <div class="bh"><div class="orb" style="width:26px;height:26px"></div><div><b>Análisis en vivo</b><span>${insights.length} INSIGHTS · RANKEADOS POR $ (REGLAS · SIN IA)</span></div></div>
      ${insights.map(i => `<div class="insight"><div class="ic ${i.sev === 'critical' ? 'r' : i.sev === 'warning' ? 'y' : i.sev === 'opportunity' ? 'g' : 'b'}">●</div><div class="tx">${i.tx}${i.action ? `<div class="iaction">➜ ${CC_ESC(i.action)}</div>` : ''}<div class="tag">${i.tag}${i.impact ? ` · ${CC_MONEY(i.impact)}` : ''}</div></div>
        ${i.sec ? `<span class="chip" style="margin-left:auto;align-self:center" onclick="ccGo('${i.sec}')">Ver →</span>` : ''}</div>`).join('')}
    </div></div>
    ${ccMemCardHTML()}`;
}
// Render de las burbujas del chat (markdown seguro si marked+DOMPurify están).
function ccMdSafe(t) {
  try { if (window.marked && window.DOMPurify) return DOMPurify.sanitize(marked.parse(String(t))); } catch (e) {}
  return CC_ESC(t);
}
function ccChatHTML() {
  return CC.chat.map((m, idx) => m.role === 'user'
    ? `<div class="cbub u">${CC_ESC(m.content)}</div>`
    : `<div class="cbub a${m.error ? ' err' : ''}${m.thinking ? ' think' : ''}">${m.thinking ? 'Pensando' : ccMdSafe(m.content)}${(!m.thinking && !m.error) ? `<button class="memsave" title="Guardar en la memoria del Cerebro" onclick="ccSaveToMemory(${idx})">🧠 Guardar</button>` : ''}</div>`).join('');
}
function ccRenderChat() {
  const el = document.getElementById('cc-chat'); if (!el) return;
  el.innerHTML = ccChatHTML();
  el.scrollTop = el.scrollHeight;
}
async function ccAsk(q) {
  const inp = document.getElementById('cc-ask'); const question = (q || (inp ? inp.value.trim() : '')).trim();
  if (!question || CC.chatBusy) return;
  if (inp) inp.value = '';
  // El chat vive en la sección Cerebro. Si estamos en otra, saltamos ahí y disparamos.
  if (!document.getElementById('cc-chat')) { ccGo('cerebro'); setTimeout(() => ccSendChat(question), 80); return; }
  ccSendChat(question);
}
window.ccAsk = ccAsk;

async function ccSendChat(question) {
  if (CC.chatBusy) return;
  CC.chatBusy = true;
  CC.chat.push({ role: 'user', content: question });
  CC.chat.push({ role: 'assistant', content: '', thinking: true });
  ccRenderChat();
  // Historial previo (sin la pregunta recién pusheada ni el "pensando").
  const history = CC.chat.filter(m => !m.thinking && !m.error).slice(0, -1)
    .map(m => ({ role: m.role, content: m.content }));
  const snapshot = ccSnapshot(ccCompute());
  try {
    const tok = await ccAuthToken(); // JWT del usuario: con RLS por áreas, la memoria RAG se lee como el usuario
    const r = await fetch('/api/brain-chat', {
      method: 'POST', headers: { 'content-type': 'application/json', ...(tok ? { Authorization: 'Bearer ' + tok } : {}) },
      body: JSON.stringify({ question, snapshot, history }),
    });
    const data = await r.json().catch(() => ({}));
    CC.chat.pop(); // saca el "pensando"
    if (!r.ok) {
      const err = data.error || `Error (HTTP ${r.status}).`;
      CC.chat.push({ role: 'assistant', content: err, error: true });
    } else {
      const answer = data.answer || 'Sin respuesta.';
      CC.chat.push({ role: 'assistant', content: answer });
      ccPersistChat(question, answer);
    }
  } catch (e) {
    CC.chat.pop();
    CC.chat.push({ role: 'assistant', content: 'No pude conectar con el Cerebro: ' + (e.message || e), error: true });
  } finally {
    CC.chatBusy = false;
    ccRenderChat();
  }
}
window.ccSendChat = ccSendChat;

// ─── MEMORIA DEL CEREBRO (pm_brain_memory vía /api/brain-chat?resource=memory) ───
async function ccAuthToken() {
  try { const s = await sb.auth.getSession(); return s?.data?.session?.access_token || ''; } catch (e) { return ''; }
}
async function ccLoadMemories() {
  CC.memLoaded = true;
  try {
    const tok = await ccAuthToken();
    const r = await fetch('/api/brain-chat?resource=memory', { headers: tok ? { Authorization: 'Bearer ' + tok } : {} });
    const d = await r.json().catch(() => ({}));
    CC.memories = r.ok ? (d.memories || []) : [];
    CC._memErr = r.ok ? null : (d.error || 'Error cargando memorias');
  } catch (e) { CC.memories = []; CC._memErr = e.message || String(e); }
  ccRenderMemList();
}
const CC_MEM_TIPO = { hecho: '📌 Hecho', 'decisión': '🎯 Decisión', aprendizaje: '💡 Aprendizaje', nota: '📝 Nota' };
function ccMemCardHTML() {
  return `<div class="grid" style="margin-top:16px"><div class="card">
    <div class="bh"><div class="orb" style="width:26px;height:26px"></div><div><b>Memoria del Cerebro</b><span>LO QUE EL CEREBRO RECUERDA · SE INYECTA EN EL CHAT</span></div></div>
    <div class="memadd">
      <select id="cc-mem-tipo">${Object.entries(CC_MEM_TIPO).map(([k, v]) => `<option value="${k}"${k === 'hecho' ? ' selected' : ''}>${v}</option>`).join('')}</select>
      <input id="cc-mem-txt" placeholder="Agregá un hecho, decisión o aprendizaje que el Cerebro deba recordar…" onkeydown="if(event.key==='Enter')ccMemAdd()">
      <button onclick="ccMemAdd()">+ Guardar</button>
    </div>
    <div id="cc-memlist">${ccMemListHTML()}</div>
  </div></div>`;
}
function ccMemListHTML() {
  if (!CC.memLoaded) return '<div style="color:#5b6780;font-size:12px;padding:14px 0">⏳ Cargando memoria…</div>';
  if (CC._memErr) return `<div style="color:#f0687a;font-size:12px;padding:14px 0">${CC_ESC(CC._memErr)}</div>`;
  if (!CC.memories.length) return '<div style="color:#5b6780;font-size:12px;padding:14px 0">Sin memorias todavía. Agregá la primera arriba.</div>';
  return CC.memories.map(m => `<div class="memrow${m.activo ? '' : ' off'}">
    <span class="memtipo t-${m.tipo === 'decisión' ? 'dec' : m.tipo}">${CC_MEM_TIPO[m.tipo] || m.tipo}</span>
    <div class="memtxt">${CC_ESC(m.texto)}<div class="memmeta">${m.fuente || 'manual'} · ${(m.fecha || '').slice(0, 10)}${m.has_embedding ? ' · 🔎 vectorizada' : ''}</div></div>
    <div class="memacts">
      <button title="Editar" onclick="ccMemEdit('${m.id}')">✎</button>
      <button title="${m.activo ? 'Desactivar' : 'Activar'}" onclick="ccMemToggle('${m.id}',${!m.activo})">${m.activo ? '🚫' : '↺'}</button>
    </div></div>`).join('');
}
function ccRenderMemList() { const el = document.getElementById('cc-memlist'); if (el) el.innerHTML = ccMemListHTML(); }
async function ccMemAdd() {
  if (CC.memBusy) return;
  const txt = document.getElementById('cc-mem-txt'); const tipo = document.getElementById('cc-mem-tipo');
  const texto = (txt ? txt.value : '').trim(); if (!texto) return;
  CC.memBusy = true; if (txt) txt.value = '';
  await ccMemPost('POST', { tipo: tipo ? tipo.value : 'nota', texto, fuente: 'manual' });
  CC.memBusy = false;
}
async function ccMemToggle(id, activo) { await ccMemPost('PATCH', { id, activo }); }
async function ccMemEdit(id) {
  const m = CC.memories.find(x => x.id === id); if (!m) return;
  const nuevo = window.prompt('Editar memoria:', m.texto); if (nuevo === null || !nuevo.trim() || nuevo.trim() === m.texto) return;
  await ccMemPost('PATCH', { id, texto: nuevo.trim() });
}
async function ccSaveToMemory(idx) {
  const m = CC.chat[idx]; if (!m || m.role !== 'assistant') return;
  const texto = window.prompt('Guardar en memoria del Cerebro (editá si querés):', m.content.slice(0, 500));
  if (texto === null || !texto.trim()) return;
  if (!document.getElementById('cc-memlist')) { ccGo('cerebro'); await new Promise(r => setTimeout(r, 120)); }
  await ccMemPost('POST', { tipo: 'aprendizaje', texto: texto.trim(), fuente: 'chat' });
  if (window.toast) toast('🧠 Guardado en la memoria del Cerebro.', 'success');
}
async function ccMemPost(method, body) {
  try {
    const tok = await ccAuthToken();
    const r = await fetch('/api/brain-chat?resource=memory', { method, headers: { 'content-type': 'application/json', ...(tok ? { Authorization: 'Bearer ' + tok } : {}) }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { if (window.toast) toast('⚠️ ' + (d.error || 'No se pudo guardar la memoria'), 'error'); return; }
    CC.memLoaded = false; await ccLoadMemories();
  } catch (e) { if (window.toast) toast('⚠️ ' + (e.message || e), 'error'); }
}
window.ccMemAdd = ccMemAdd; window.ccMemToggle = ccMemToggle; window.ccMemEdit = ccMemEdit; window.ccSaveToMemory = ccSaveToMemory;

// ─── RESUMEN DEL DÍA (generado por el Cerebro, arriba del Command Center) ───
function ccDailyHTML() {
  const d = CC.daily;
  const inner = d.loading
    ? '<span class="daytxt shimmer">El Cerebro está leyendo tus números…</span>'
    : d.error
      ? `<span class="daytxt" style="color:#f0687a">${CC_ESC(d.error)}</span>`
      : d.text
        ? `<span class="daytxt">${ccMdSafe(d.text)}</span>`
        : '<span class="daytxt" style="color:var(--mut2)">El Cerebro puede resumirte el día. Tocá ⟳ para generarlo.</span>';
  return `<div class="orb" style="width:30px;height:30px;flex-shrink:0"></div>
    <div style="flex:1">${inner}</div>
    <button class="dayre" title="Regenerar resumen" onclick="ccDailySummary(true)" ${d.loading ? 'disabled' : ''}>⟳</button>`;
}
function ccRenderDaily() { const el = document.getElementById('cc-daybanner'); if (el) el.innerHTML = ccDailyHTML(); }
async function ccDailySummary(force) {
  if (CC.daily.loading) return;
  if (CC.daily.text && !force) return;
  CC.daily.loading = true; CC.daily.error = null; ccRenderDaily();
  try {
    const snapshot = ccSnapshot(ccCompute());
    const q = 'Generá el RESUMEN DEL DÍA en 2-3 frases cortas para el CEO: (1) estado general del portafolio con el número clave, (2) lo más urgente hoy, (3) UNA acción concreta sugerida. Directo, sin saludo, sin markdown de títulos.';
    const tok = await ccAuthToken();
    const r = await fetch('/api/brain-chat', { method: 'POST', headers: { 'content-type': 'application/json', ...(tok ? { Authorization: 'Bearer ' + tok } : {}) }, body: JSON.stringify({ question: q, snapshot, history: [] }) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) { CC.daily.error = data.error || 'No se pudo generar el resumen.'; }
    else { CC.daily.text = data.answer || ''; }
  } catch (e) { CC.daily.error = e.message || String(e); }
  finally { CC.daily.loading = false; ccRenderDaily(); }
}
window.ccDailySummary = ccDailySummary;

// ─── PERSISTENCIA DEL CHAT (pm_brain_chat vía sb del usuario, authenticated) ───
async function ccLoadChat() {
  CC.chatLoaded = true;
  try {
    const { data, error } = await sb.from('pm_brain_chat').select('rol,texto,fecha').eq('session_id', CC_CHAT_SESSION).order('fecha', { ascending: true }).limit(40);
    if (!error && Array.isArray(data)) CC.chat = data.map(m => ({ role: m.rol === 'assistant' ? 'assistant' : 'user', content: m.texto }));
  } catch (e) { /* chat vacío si falla */ }
}
async function ccPersistChat(question, answer) {
  try {
    await sb.from('pm_brain_chat').insert([
      { session_id: CC_CHAT_SESSION, rol: 'user', texto: question },
      { session_id: CC_CHAT_SESSION, rol: 'assistant', texto: answer },
    ]);
  } catch (e) { /* no bloquear el chat si falla la persistencia */ }
}

// ─── SECCIÓN: PROPIEDADES ───
function ccSecPropiedades(comp) {
  return `${ccHeader('Propiedades', 'Rentas', `${CC.props.length} casas · ${comp.kpi.totalU} unidades (regla) · ocupación ${comp.kpi.occPct}%`)}
    <div class="grid"><div class="card">
      <div class="chart-h"><div class="t">Todas las propiedades</div><div class="k">📄 = Guía de Bienvenida (check-in)</div></div>
      ${ccPropTable([...comp.houses].filter(h => h.total).sort((a, b) => a.net - b.net), { guide: true, limit: 99 })}</div></div>`;
}
// ─── SECCIÓN: FINANZAS ───
function ccSecFinanzas(comp) {
  const { kpi, houses } = comp;
  const rojo = houses.filter(h => h.net < 0 && (h.inc > 0 || h.exp > 0)).sort((a, b) => a.net - b.net);
  const top = houses.filter(h => h.net > 0).sort((a, b) => b.net - a.net).slice(0, 6);
  return `${ccHeader('Finanzas', comp.mb.label, `Ingresos ${CC_MONEY(kpi.inc)} · Gastos ${CC_MONEY(kpi.expT)} · Cashflow ${CC_MONEY(kpi.cashflow)}`)}
    <div class="reptools">
      <span class="reptitle">📄 Reportes (PDF)</span>
      <button class="repbtn" onclick="ccReport('weekly')">Generar semanal (operación)</button>
      <button class="repbtn" onclick="ccReport('monthly')">Generar mensual (finanzas)</button>
      <button class="repbtn ghost" onclick="ccSendReport('monthly')">Compartir ›</button>
      <span class="rephint">Números unificados (regla ${kpi.totalU}u). Se genera con "Guardar como PDF".</span>
    </div>
    <div class="grid kpis" style="grid-template-columns:repeat(3,1fr)">
      <div class="card kpi"><div class="lab">Ingresos del mes (renta del mes)</div><div class="big up">${CC_MONEY(kpi.inc)}</div><div class="meta">por tag Mes/Año · cobrado en el mes (caja): ${CC_MONEY(kpi.incCash)}</div></div>
      <div class="card kpi"><div class="lab">Gastos del mes</div><div class="big down">${CC_MONEY(kpi.expT)}</div></div>
      <div class="card kpi"><div class="lab">Cashflow neto</div><div class="big ${kpi.cashflow >= 0 ? 'up' : 'down'}">${CC_MONEY(kpi.cashflow)}</div></div>
    </div>
    ${ccCobranzaPanel()}
    ${(() => { const hs = houses.filter(h => h.total > 0 || h.hipoFija > 0).sort((x, y) => x.flujoEstructural - y.flujoEstructural); const fila = h => `<tr><td>${CC_ESC((h.name || '').split(',')[0])}<div style="font-size:9px;opacity:.55">${CC_ESC(h.loanType || '')}</div></td><td style="text-align:right" class="up">${CC_MONEY(h.inc)}</td><td style="text-align:right">${CC_MONEY(h.exp)}</td><td style="text-align:right">${h.hipoFija ? CC_MONEY(h.hipoFija) : '—'}<div style="font-size:9px;opacity:.55">${h.hipo ? 'pagada ' + CC_MONEY(h.hipo) : 'sin pago reg.'}</div></td><td style="text-align:right" class="${h.net >= 0 ? 'up' : 'down'}">${CC_MONEY(h.net)}</td><td style="text-align:right" class="${h.flujoEstructural >= 0 ? 'up' : 'down'}"><b>${CC_MONEY(h.flujoEstructural)}</b> ${h.flujoEstructural >= 0 ? '🟢' : '🔴'}</td></tr>`; const okN = hs.filter(h => h.flujoEstructural >= 0).length; return `<div class="grid" style="margin-top:14px"><div class="card"><div class="chart-h"><div class="t">P&L por casa — flujo estructural</div><div class="k">renta objetivo ocupada − hipoteca FIJA · regla del Cerebro: déficit OK si flujo+ · ${okN}/${hs.length} en verde</div></div><table class="ptable"><thead><tr><th>Casa</th><th style="text-align:right">Ingreso mes</th><th style="text-align:right">Gastos mes</th><th style="text-align:right">Hipoteca fija</th><th style="text-align:right">Flujo real</th><th style="text-align:right">Flujo estructural</th></tr></thead><tbody>${hs.map(fila).join('')}</tbody></table><div class="meta" style="margin-top:8px">Hipoteca FIJA = obligación mensual (espejo de Casas.Hipoteca mensual, 19 casas). "Flujo real" = ingreso − gastos del mes (depende de lo registrado); "flujo estructural" = capacidad de la casa a ocupación actual.</div></div></div>`; })()}
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
  // Cadena viva: cada reserva puede tener su tarea de turnover/recepción (auto-generada en el sync).
  const relTask = b => CC.tasks.find(t => t.property_id === b.property_id && ['cleaning', 'recepcion'].includes(t.task_type) && !['completado', 'cancelado'].includes(t.status));
  const taskChip = b => { const t = relTask(b); if (!t) return '<span style="color:#5b6780">—</span>'; return `<span class="rtask">${t.task_type === 'cleaning' ? '🧹 turnover' : '🛎 recepción'}${t.scheduled_date ? ' · ' + t.scheduled_date.slice(5) : ''}</span>`; };
  return `${ccHeader('Reservas', 'Calendario', `${CC.book.length} reservas · ${activas.length} activas · cadena reserva → turnover → gasto → KPI`)}
    <div class="grid"><div class="card"><div class="chart-h"><div class="t">Reservas activas</div><div class="k">reserva → tarea de operación</div></div>
      <table class="ptable"><thead><tr><th>Casa</th><th>Inquilino</th><th>Entrada</th><th>Salida</th><th>Estado</th><th>Operación</th></tr></thead><tbody>
      ${activas.slice(0, 20).map(b => `<tr><td>${CC_ESC(pName(b.property_id)).slice(0, 26)}</td><td>${CC_ESC(tName(b.tenant_id)).slice(0, 22)}</td><td>${b.start_date || '—'}</td><td>${b.end_date || '∞'}</td><td><span class="badge ${b.end_date && b.end_date < new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10) ? 'b-warn' : 'b-ok'}">${b.status}</span></td><td>${taskChip(b)}</td></tr>`).join('')}</tbody></table>
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
    ${CC.tenants.slice(0, 30).map(t => `<tr><td>${CC_ESC(t.full_name || '—')}</td><td>${CC_ESC(t.phone || '—')}</td><td><span class="badge b-ok">${CC_ESC(t.client_state || 'activo')}</span></td></tr>`).join('')}</tbody></table></div></div>
    ${ccContratosPanel()}`;
}
// ─── SECCIÓN: ANALÍTICA & KPIs ───
function ccSecAnalitica(comp) {
  const { kpi, houses } = comp;
  const tools = `<div class="reptools"><span class="reptitle">📊 Informes CEO</span><button class="repbtn" onclick="window.print()">🖨️ PDF</button><button class="repbtn" onclick="ccExportExcelRentas()">⬇ Excel</button><button class="repbtn ghost" onclick="ccCopyResumenRentas()">📋 Copiar resumen</button></div>`;
  const withData = houses.filter(h => h.inc > 0 || h.exp > 0);
  const best = [...withData].sort((a, b) => b.net - a.net)[0];
  const worst = [...withData].sort((a, b) => a.net - b.net)[0];
  const noiRank = [...houses].filter(h => h.total).map(h => ({ ...h, noi: h.inc - (h.exp - h.hipo) })).sort((a, b) => b.noi - a.noi);
  // Ocupación por zona (regla)
  const Z = {}; houses.forEach(h => { const z = ccZoneLabel(h.zone); (Z[z] = Z[z] || { o: 0, t: 0 }); Z[z].o += h.occ; Z[z].t += h.total; });
  const zoneRows = Object.entries(Z).filter(([, v]) => v.t).map(([z, v]) => ({ z, pct: Math.round(v.o / v.t * 100), o: v.o, t: v.t })).sort((a, b) => b.pct - a.pct);
  return `${ccHeader('Analítica', 'KPIs', `Tendencias e indicadores del portafolio · ${CC.props.length} casas · ${kpi.totalU} unidades (regla) · ${kpi.occPct}% ocupación`)}
    ${tools}
    <div class="grid kpis">
      <div class="card kpi"><div class="lab">Cashflow del mes</div><div class="big ${kpi.cashflow >= 0 ? 'up' : 'down'}">${CC_MONEY(kpi.cashflow)}</div><div class="meta">${comp.mb.label} · ing ${CC_K(kpi.inc)} / gas ${CC_K(kpi.expT)}</div></div>
      <div class="card kpi"><div class="lab">Mejor casa</div><div class="big up" style="font-size:20px">${best ? CC_ESC(best.name.split(',')[0]) : '—'}</div><div class="meta">${best ? CC_MONEY(best.net) + '/mes' : ''}</div></div>
      <div class="card kpi"><div class="lab">Peor casa</div><div class="big down" style="font-size:20px">${worst ? CC_ESC(worst.name.split(',')[0]) : '—'}</div><div class="meta">${worst ? CC_MONEY(worst.net) + '/mes' : ''}</div></div>
      <div class="card kpi"><div class="lab">Captura de renta</div><div class="big glow">${kpi.capture}%</div><div class="meta">${CC_MONEY(kpi.potTotal - kpi.potFree)} de ${CC_MONEY(kpi.potTotal)} potencial · <span class="warn">${CC_MONEY(kpi.potFree)} sin cobrar</span></div></div>
    </div>
    <div class="grid row2" style="margin-top:16px">
      <div class="card"><div class="chart-h"><div class="t">Ingresos vs Gastos · 12 meses</div><div class="legend"><span><b style="background:var(--pos)"></b>Ingresos</span><span><b style="background:var(--neg)"></b>Gastos</span></div></div><canvas id="cc-an-ie" height="150"></canvas></div>
      <div class="card"><div class="chart-h"><div class="t">Cashflow mensual · 12 meses</div><div class="k">rojo = pérdida</div></div><canvas id="cc-an-cf" height="150"></canvas></div>
    </div>
    <div class="grid row2" style="margin-top:16px">
      <div class="card"><div class="chart-h"><div class="t">Ocupación mensual · 12 meses</div><div class="k">estimada por reservas · regla</div></div><canvas id="cc-an-occ" height="150"></canvas></div>
      <div class="card"><div class="chart-h"><div class="t">Ocupación por zona</div><div class="k">${kpi.occPct}% global</div></div>
        ${zoneRows.map(z => `<div class="op-item"><span style="width:110px">${CC_ESC(z.z)}</span><span class="mini-bar" style="width:140px"><i style="width:${z.pct}%"></i></span><span style="margin-left:auto">${z.pct}% · ${z.o}/${z.t}</span></div>`).join('')}</div>
    </div>
    <div class="grid row2" style="margin-top:16px">
      <div class="card"><div class="chart-h"><div class="t">Cashflow por casa</div><div class="k">rojo = pérdida</div></div><canvas id="cc-an-noibar" height="300"></canvas></div>
      <div class="card"><div class="chart-h"><div class="t">Gastos por tipo · ${comp.mb.label}</div><div class="k">${CC_K(kpi.expT)}</div></div><canvas id="cc-an-donut" height="300"></canvas></div>
    </div>
    <div class="grid" style="margin-top:16px"><div class="card"><div class="chart-h"><div class="t">Evolución de gastos por tipo · 6 meses</div><div class="k">miles US$</div></div><canvas id="cc-an-exptrend" height="150"></canvas></div></div>
    <div class="grid" style="margin-top:16px"><div class="card">
      <div class="chart-h"><div class="t">NOI y cashflow por casa</div><div class="k">NOI = ingreso − gastos operativos (sin hipoteca)</div></div>
      <table class="ptable"><thead><tr><th>Casa</th><th>Zona</th><th>Ocup.</th><th>Ingreso</th><th>Gastos op.</th><th>Hipoteca</th><th>NOI</th><th>Cashflow</th></tr></thead><tbody>
      ${noiRank.map(h => `<tr><td>${CC_ESC(h.name.split(',')[0]).slice(0, 24)}</td><td>${ccZoneLabel(h.zone)}</td><td>${h.pct}%</td><td>${CC_MONEY(h.inc)}</td><td>${CC_MONEY(h.exp - h.hipo)}</td><td>${CC_MONEY(h.hipo)}</td><td class="${h.noi >= 0 ? 'up' : 'down'}">${CC_MONEY(h.noi)}</td><td class="${h.net >= 0 ? 'up' : 'down'}">${CC_MONEY(h.net)}</td></tr>`).join('')}
      </tbody></table></div></div>`;
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
// Serie mensual configurable (n meses). Devuelve labels + ingresos/gastos/cashflow (en $).
function ccMonthsSeries(n = 12) {
  const now = new Date(); const months = [];
  for (let i = n - 1; i >= 0; i--) { const d = new Date(now.getUTCFullYear(), now.getUTCMonth() - i, 1); months.push({ y: d.getFullYear(), m: d.getMonth() + 1 }); }
  const MES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const key = ({ y, m }) => `${y}-${String(m).padStart(2, '0')}`;
  const inc = months.map(mm => CC.pay.filter(p => p.paid_at && p.paid_at.slice(0, 7) === key(mm)).reduce((s, p) => s + Number(p.amount || 0), 0));
  const exp = months.map(mm => CC.exp.filter(e => e.expense_date && e.expense_date.slice(0, 7) === key(mm)).reduce((s, e) => s + Number(e.amount || 0), 0));
  return { labels: months.map(x => `${MES[x.m - 1]}${x.m === 1 ? " '" + String(x.y).slice(2) : ''}`), keys: months.map(key), inc, exp, cf: inc.map((v, i) => v - exp[i]) };
}
// Ocupación mensual estimada por RESERVAS (regla de unidades: habitaciones juntas=1).
function ccOccSeries(n = 12) {
  const now = new Date(); const months = [];
  for (let i = n - 1; i >= 0; i--) { const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)); months.push({ from: d.toISOString().slice(0, 10), to: new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).toISOString().slice(0, 10) }); }
  const MES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const unitById = {}; CC.units.forEach(u => unitById[u.id] = u);
  const overlaps = (b, mf, mt) => b.start_date && b.start_date <= mt && (!b.end_date || b.end_date >= mf);
  const pct = months.map(({ from, to }) => {
    // por casa: indep ocupada si su unidad tiene reserva; grupo habitaciones ocupado si alguna hab. tiene reserva.
    let occ = 0, total = 0;
    CC.props.forEach(p => {
      const us = CC.units.filter(u => u.property_id === p.id);
      const indep = us.filter(u => CC_INDEP.includes(u.unit_type));
      const rooms = us.filter(u => u.unit_type === 'habitacion');
      const hasR = rooms.length ? 1 : 0; total += indep.length + hasR;
      // Ocupada en el mes si alguna reserva de esa unidad solapa el mes (cualquier estado = ocupación real/histórica).
      const bkOfUnit = uid => CC.book.some(b => b.unit_id === uid && overlaps(b, from, to));
      occ += indep.filter(u => bkOfUnit(u.id)).length + (hasR && rooms.some(u => bkOfUnit(u.id)) ? 1 : 0);
    });
    return total ? Math.round(occ / total * 100) : 0;
  });
  const labels = []; for (let i = n - 1; i >= 0; i--) { const d = new Date(now.getUTCFullYear(), now.getUTCMonth() - i, 1); labels.push(MES[d.getMonth()]); }
  return { labels, pct };
}
// Gastos por tipo por mes (últimos n meses) → series apiladas.
function ccExpTypeSeries(n = 6) {
  const s = ccMonthsSeries(n);
  const bucket = e => { const t = (e.subcategory || '').toLowerCase(); if (/hipotec/.test(t)) return 'Hipoteca'; if (/servicio|públic|publico/.test(t)) return 'Servicios'; if (/nómina|nomina|equipo/.test(t)) return 'Nómina'; if (/plataforma/.test(t)) return 'Plataforma'; if (/aseo|podada|mantenim/.test(t)) return 'Mantenim.'; return 'Otros'; };
  const tipos = ['Hipoteca', 'Servicios', 'Mantenim.', 'Nómina', 'Plataforma', 'Otros'];
  const series = tipos.map(tp => s.keys.map(k => CC.exp.filter(e => e.expense_date && e.expense_date.slice(0, 7) === k && bucket(e) === tp).reduce((a, e) => a + Number(e.amount || 0), 0) / 1000));
  return { labels: s.labels, tipos, series };
}
function ccMountCharts(comp) {
  if (!window.Chart) return;
  const ax = { grid: { color: 'rgba(255,255,255,.05)' }, ticks: { color: '#5b6780', font: { size: 10 } } };
  const gext = { plugins: { legend: { display: false } }, maintainAspectRatio: false, scales: { x: { grid: { display: false }, ticks: { color: '#5b6780', font: { size: 10 } } }, y: ax } };
  const mk = (id, cfg) => { const el = document.getElementById(id); if (!el) return; try { const ex = Chart.getChart && Chart.getChart(el); if (ex) ex.destroy(); } catch (e) {} CC._charts.push(new Chart(el, cfg)); };
  const grad = (ctx, c1, c2) => { const g = ctx.createLinearGradient(0, 0, 0, 150); g.addColorStop(0, c1); g.addColorStop(1, c2); return g; };
  // sparklines
  const spark = (id, data, color) => mk(id, { type: 'line', data: { labels: data.map((_, i) => i), datasets: [{ data, borderColor: color, borderWidth: 1.8, tension: .4, pointRadius: 0, fill: false }] }, options: { plugins: { legend: { display: false } }, maintainAspectRatio: false, scales: { x: { display: false }, y: { display: false } } } });
  const tr = ccTrend6();
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

  // ─── Charts de ANALÍTICA (solo si la sección está activa) ───
  if (document.getElementById('cc-an-ie')) {
    const s12 = ccMonthsSeries(12); const inc12 = s12.inc.map(v => v / 1000), exp12 = s12.exp.map(v => v / 1000), cf12 = s12.cf.map(v => v / 1000);
    const ieEl = document.getElementById('cc-an-ie'); const ictx = ieEl.getContext('2d');
    mk('cc-an-ie', { type: 'line', data: { labels: s12.labels, datasets: [
      { label: 'Ingresos', data: inc12, borderColor: '#48d69c', backgroundColor: grad(ictx, 'rgba(72,214,156,.18)', 'rgba(72,214,156,0)'), fill: true, tension: .4, pointRadius: 2, borderWidth: 2 },
      { label: 'Gastos', data: exp12, borderColor: '#f0687a', backgroundColor: grad(ictx, 'rgba(240,104,122,.12)', 'rgba(240,104,122,0)'), fill: true, tension: .4, pointRadius: 2, borderWidth: 2 }] }, options: gext });
    mk('cc-an-cf', { type: 'bar', data: { labels: s12.labels, datasets: [{ data: cf12, borderRadius: 4, backgroundColor: cf12.map(v => v >= 0 ? '#48d69c' : '#f0687a') }] }, options: gext });
    const occ = ccOccSeries(12);
    mk('cc-an-occ', { type: 'line', data: { labels: occ.labels, datasets: [{ data: occ.pct, borderColor: '#4f8dff', backgroundColor: grad(document.getElementById('cc-an-occ').getContext('2d'), 'rgba(79,141,255,.18)', 'rgba(79,141,255,0)'), fill: true, tension: .4, pointRadius: 2, borderWidth: 2 }] }, options: { ...gext, scales: { x: gext.scales.x, y: { ...ax, min: 0, max: 100, ticks: { color: '#5b6780', font: { size: 10 }, callback: v => v + '%' } } } } });
    const hn = [...comp.houses].filter(h => h.inc > 0 || h.exp > 0).sort((a, b) => b.net - a.net);
    mk('cc-an-noibar', { type: 'bar', data: { labels: hn.map(h => h.name.split(',')[0].slice(0, 16)), datasets: [{ data: hn.map(h => h.net), borderRadius: 4, backgroundColor: hn.map(h => h.net >= 0 ? '#48d69c' : '#f0687a') }] }, options: { ...gext, indexAxis: 'y', scales: { x: ax, y: { grid: { display: false }, ticks: { color: '#93a0b6', font: { size: 9 } } } } } });
    mk('cc-an-donut', { type: 'doughnut', data: { labels: bl, datasets: [{ data: bv, backgroundColor: ['#4f8dff', '#45e3c6', '#8a7bff', '#3a6f74', '#4a5568', '#e7b65e'], borderColor: '#0a0e16', borderWidth: 3 }] }, options: { maintainAspectRatio: false, cutout: '64%', plugins: { legend: { position: 'bottom', labels: { color: '#93a0b6', font: { size: 10 }, boxWidth: 8, padding: 9 } } } } });
    const et = ccExpTypeSeries(6); const cols = { 'Hipoteca': '#f0687a', 'Servicios': '#4f8dff', 'Mantenim.': '#45e3c6', 'Nómina': '#8a7bff', 'Plataforma': '#e7b65e', 'Otros': '#4a5568' };
    mk('cc-an-exptrend', { type: 'bar', data: { labels: et.labels, datasets: et.tipos.map((tp, i) => ({ label: tp, data: et.series[i], backgroundColor: cols[tp], borderRadius: 3 })) }, options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#93a0b6', font: { size: 10 }, boxWidth: 8, padding: 8 } } }, scales: { x: { stacked: true, grid: { display: false }, ticks: { color: '#5b6780', font: { size: 10 } } }, y: { stacked: true, ...ax } } } });
  }
}

// ─── RN-M1 · Cobranza sistemática: aging por inquilino + renta perdida + draft de cobro ───
// MISMA definición que el OS (deuda = renta objetivo ocupada − pagado del período, umbral $200).
function ccCobranzaAging() {
  const hoy = new Date();
  const mes0 = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const meses = [0, 1, 2].map(k => {
    const d = new Date(mes0.getFullYear(), mes0.getMonth() - k, 1);
    const fin = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const iso = x => x.toISOString().slice(0, 10);
    return { k, from: iso(d), to: iso(fin), label: d.toLocaleDateString('es', { month: 'short' }) };
  });
  const unitById = {}; (CC.units || []).forEach(u => unitById[u.id] = u);
  const tenById = {}; (CC.tenants || []).forEach(t => tenById[t.id] = t);
  const propById = {}; (CC.props || []).forEach(p => propById[p.id] = p);
  const rows = [];
  const activos = (CC.book || []).filter(b => b.tenant_id && b.unit_id && (!b.end_date || b.end_date >= meses[2].from) && (b.start_date || '') <= meses[0].to);
  const porTenant = {};
  activos.forEach(b => {
    const u = unitById[b.unit_id]; if (!u || !(+u.target_rent > 0) || ccUnitState(u) !== 'ocupada') return;
    if (!porTenant[b.tenant_id]) porTenant[b.tenant_id] = { tenant_id: b.tenant_id, rent: 0, casa: (propById[b.property_id] || {}).name || '', unidad: u.name || '', start: b.start_date };
    porTenant[b.tenant_id].rent += +u.target_rent;
    if (b.start_date && (!porTenant[b.tenant_id].start || b.start_date < porTenant[b.tenant_id].start)) porTenant[b.tenant_id].start = b.start_date;
  });
  Object.values(porTenant).forEach(pt => {
    const t = tenById[pt.tenant_id] || {};
    const buckets = meses.map(mm => {
      if (pt.start && pt.start > mm.to) return null; // aún no vivía ese mes
      // Pagado de ESE mes = pagos con tag Mes/Año de ese mes (una renta de junio cobrada
      // en mayo cuenta como junio pagado). Sin tag, cae a la fecha de cobro.
      const ymm = mm.from.slice(0, 7);
      const pagado = (CC.pay || []).filter(x => x.tenant_id === pt.tenant_id && (x.billing_ym || (x.paid_at || '').slice(0, 7)) === ymm).reduce((s, x) => s + (+x.amount || 0), 0);
      return Math.max(0, Math.round(pt.rent - pagado));
    });
    const total = buckets.reduce((s, x) => s + (x || 0), 0);
    if (total > 200) rows.push({ nombre: t.full_name || pt.tenant_id, phone: t.phone || '', casa: (pt.casa || '').split(',')[0], unidad: pt.unidad, rent: Math.round(pt.rent), b0: buckets[0], b1: buckets[1], b2: buckets[2], total, tenant_id: pt.tenant_id });
  });
  rows.sort((a, b) => (b.b1 || 0) + (b.b2 || 0) - ((a.b1 || 0) + (a.b2 || 0)) || b.total - a.total);
  const vencida = rows.reduce((s, r) => s + (r.b1 || 0) + (r.b2 || 0), 0);
  const porCobrar = rows.reduce((s, r) => s + (r.b0 || 0), 0);
  const rentaPerdida = (CC.units || []).filter(u => ccUnitState(u) === 'libre').reduce((s, u) => s + (+u.target_rent || 0), 0);
  const unidadesLibres = (CC.units || []).filter(u => ccUnitState(u) === 'libre').length;
  return { rows, total: rows.reduce((s, r) => s + r.total, 0), vencida, porCobrar, meses, rentaPerdida: Math.round(rentaPerdida), unidadesLibres };
}
function ccDraftCobro(tenantId) {
  const ag = ccCobranzaAging();
  const r = ag.rows.find(x => x.tenant_id === tenantId);
  if (!r) return;
  const partes = [];
  if (r.b0) partes.push('mes en curso ' + CC_MONEY(r.b0));
  if (r.b1) partes.push('mes anterior ' + CC_MONEY(r.b1));
  if (r.b2) partes.push('hace 2 meses ' + CC_MONEY(r.b2));
  const msg = 'Hola ' + (r.nombre || '').split(' ')[0] + ', te escribimos de Rental Profits. Registramos un saldo pendiente de ' + CC_MONEY(r.total) + ' por tu renta en ' + r.casa + (r.unidad ? ' (' + r.unidad + ')' : '') + ' — ' + partes.join(', ') + '. ¿Podés confirmarnos la fecha de pago o mandarnos el comprobante si ya lo hiciste? ¡Gracias!';
  const doOpen = () => { if (r.phone) { const ph = String(r.phone).replace(/[^0-9]/g, ''); if (ph.length >= 10) window.open('https://wa.me/' + (ph.length === 10 ? '1' + ph : ph) + '?text=' + encodeURIComponent(msg), '_blank'); } };
  if (navigator.clipboard) navigator.clipboard.writeText(msg).then(() => { alert('Draft copiado' + (r.phone ? ' — abriendo WhatsApp…' : ' (sin teléfono registrado)')); doOpen(); }, () => alert(msg));
  else { alert(msg); doOpen(); }
}
window.ccCobranzaAging = ccCobranzaAging; window.ccDraftCobro = ccDraftCobro;
function ccCobranzaPanel() {
  const ag = ccCobranzaAging();
  const fila = r => `<tr><td><b>${CC_ESC(r.nombre)}</b><div style="font-size:10px;opacity:.6">${CC_ESC(r.casa)}${r.unidad ? ' · ' + CC_ESC(r.unidad) : ''}</div></td><td style="text-align:right">${CC_MONEY(r.rent)}</td><td style="text-align:right">${r.b0 ? CC_MONEY(r.b0) : '—'}</td><td style="text-align:right" class="${r.b1 ? 'down' : ''}">${r.b1 == null ? 'n/a' : r.b1 ? CC_MONEY(r.b1) : '—'}</td><td style="text-align:right" class="${r.b2 ? 'down' : ''}">${r.b2 == null ? 'n/a' : r.b2 ? CC_MONEY(r.b2) : '—'}</td><td style="text-align:right"><b class="down">${CC_MONEY(r.total)}</b></td><td style="text-align:right"><button class="repbtn" style="padding:3px 8px;font-size:10px" onclick="ccDraftCobro('${r.tenant_id}')">📱 cobrar</button></td></tr>`;
  return `<div class="grid kpis" style="grid-template-columns:repeat(4,1fr);margin-top:14px">
      <div class="card kpi"><div class="lab">Deuda VENCIDA (meses previos)</div><div class="big down">${CC_MONEY(ag.vencida)}</div><div class="meta">${ag.rows.filter(r => (r.b1 || 0) + (r.b2 || 0) > 0).length} inquilino(s) en mora</div></div>
      <div class="card kpi"><div class="lab">Por cobrar (mes en curso)</div><div class="big warn">${CC_MONEY(ag.porCobrar)}</div><div class="meta">aún no vencido — ${ag.meses[0].label}</div></div>
      <div class="card kpi"><div class="lab">Renta potencial perdida</div><div class="big warn">${CC_MONEY(ag.rentaPerdida)}/mes</div><div class="meta">${ag.unidadesLibres} unidad(es) libres × renta objetivo</div></div>
      <div class="card kpi"><div class="lab">Definición</div><div class="big" style="font-size:13px;line-height:1.4">renta objetivo ocupada − pagado</div><div class="meta">misma regla que el OS · umbral $200 · excluye pagos "revisar"</div></div>
    </div>
    <div class="grid" style="margin-top:14px"><div class="card"><div class="chart-h"><div class="t">Cobranza · aging por inquilino</div><div class="k">últimos 3 meses · draft de cobro con un click</div></div>
      <table class="ptable"><thead><tr><th>Inquilino</th><th style="text-align:right">Renta/mes</th><th style="text-align:right">${ag.meses[0].label}</th><th style="text-align:right">${ag.meses[1].label}</th><th style="text-align:right">${ag.meses[2].label}</th><th style="text-align:right">Deuda</th><th></th></tr></thead><tbody>
      ${ag.rows.map(fila).join('') || '<tr><td colspan="7" style="color:#48d69c;padding:14px">Sin deuda de cobranza ✓</td></tr>'}</tbody></table>
      <div class="meta" style="margin-top:8px">"n/a" = el inquilino aún no vivía ese mes. El draft se copia al portapapeles y abre WhatsApp si hay teléfono (no se envía solo — lo aprobás vos).</div></div></div>`;
}

// ─── RN-M4 · Contratos + depósitos ───
function ccContratosPanel() {
  const hoy = new Date().toISOString().slice(0, 10);
  const en = d => Math.round((new Date(d) - new Date(hoy)) / 86400000);
  const activos = (CC.tenants || []).filter(t => (t.client_state || '') === 'Activo');
  const porVencer = activos.filter(t => t.contract_end && en(t.contract_end) <= 60).sort((a, b) => (a.contract_end || '').localeCompare(b.contract_end || ''));
  const depositos = (CC.tenants || []).filter(t => (t.client_state || '') === 'Activo' && +t.deposit > 0);
  const depTotal = depositos.reduce((s, t) => s + (+t.deposit || 0), 0);
  const fila = t => { const d = en(t.contract_end); const cls = d < 0 ? 'down' : d <= 30 ? 'warn' : ''; return `<tr><td><b>${CC_ESC(t.full_name)}</b></td><td>${t.contract_end}</td><td style="text-align:right" class="${cls}"><b>${d < 0 ? 'VENCIDO ' + Math.abs(d) + 'd' : d + ' días'}</b></td><td style="text-align:right">${t.rent_amount ? CC_MONEY(+t.rent_amount) : '—'}</td><td style="text-align:right">${t.deposit ? CC_MONEY(+t.deposit) : '—'}</td></tr>`; };
  return `<div class="grid row2" style="margin-top:14px">
    <div class="card"><div class="chart-h"><div class="t">Contratos por vencer (60 días)</div><div class="k">${porVencer.length} de ${activos.length} activos</div></div>
      <table class="ptable"><thead><tr><th>Inquilino</th><th>Fin de contrato</th><th style="text-align:right">Vence en</th><th style="text-align:right">Renta</th><th style="text-align:right">Depósito</th></tr></thead><tbody>
      ${porVencer.map(fila).join('') || '<tr><td colspan="5" style="color:#48d69c;padding:12px">Ningún contrato vence en 60 días ✓</td></tr>'}</tbody></table></div>
    <div class="card"><div class="chart-h"><div class="t">Depósitos en custodia</div><div class="k">regla del Cerebro: los depósitos NO son renta</div></div>
      <div class="grid kpis" style="grid-template-columns:1fr 1fr"><div class="card kpi"><div class="lab">Total en custodia</div><div class="big warn">${CC_MONEY(depTotal)}</div><div class="meta">${depositos.length} inquilino(s) activos con depósito</div></div>
      <div class="card kpi"><div class="lab">Pasivo</div><div class="big" style="font-size:13px;line-height:1.4">devolver al salir (o aplicar a daños)</div><div class="meta">fuente: Inquilinos.Depósito</div></div></div>
      <table class="ptable" style="margin-top:8px"><tbody>${depositos.sort((a, b) => +b.deposit - +a.deposit).slice(0, 8).map(t => `<tr><td>${CC_ESC(t.full_name)}</td><td style="text-align:right"><b>${CC_MONEY(+t.deposit)}</b></td></tr>`).join('')}</tbody></table></div>
  </div>`;
}
// ─── RN-M5 · Informes CEO Rentas (molde export trio) ───
function ccExportExcelRentas() {
  if (typeof XLSX === 'undefined') { alert('Librería Excel no disponible.'); return; }
  const comp = ccCompute(); const ag = ccCobranzaAging();
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(comp.houses.map(h => ({ Casa: (h.name || '').split(',')[0], Zona: h.zone, Modelo: h.model, Unidades: h.total, Ocupadas: h.occ, IngresoMes: Math.round(h.inc), GastosMes: Math.round(h.exp), HipotecaFija: Math.round(h.hipoFija || 0), FlujoReal: Math.round(h.net), FlujoEstructural: Math.round(h.flujoEstructural || 0) }))), 'PnL_Casas');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ag.rows.map(r => ({ Inquilino: r.nombre, Casa: r.casa, Unidad: r.unidad, RentaMes: r.rent, MesActual: r.b0, Mes1: r.b1, Mes2: r.b2, DeudaTotal: r.total }))), 'Cobranza');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((CC.tenants || []).filter(t => t.client_state === 'Activo').map(t => ({ Inquilino: t.full_name, Estado: t.client_state, Renta: t.rent_amount, InicioContrato: t.contract_start, FinContrato: t.contract_end, Deposito: t.deposit }))), 'Contratos');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((CC.units || []).map(u => { const p = (CC.props || []).find(x => x.id === u.property_id) || {}; return { Casa: (p.name || '').split(',')[0], Unidad: u.name, Tipo: u.unit_type, Estado: u.status, RentaObjetivo: u.target_rent }; })), 'Unidades');
  XLSX.writeFile(wb, 'Rentas_Informe.xlsx');
}
function ccCopyResumenRentas() {
  const comp = ccCompute(); const ag = ccCobranzaAging();
  const hoy = new Date().toISOString().slice(0, 10);
  const en = d => Math.round((new Date(d) - new Date(hoy)) / 86400000);
  const venc = (CC.tenants || []).filter(t => t.client_state === 'Activo' && t.contract_end && en(t.contract_end) <= 60);
  const dep = (CC.tenants || []).filter(t => t.client_state === 'Activo' && +t.deposit > 0).reduce((s, t) => s + +t.deposit, 0);
  const verdes = comp.houses.filter(h => (h.flujoEstructural || 0) >= 0 && (h.total > 0 || h.hipoFija > 0)).length;
  const casasHipo = comp.houses.filter(h => h.total > 0 || h.hipoFija > 0).length;
  const L = [];
  L.push('RENTAS — RESUMEN EJECUTIVO · ' + new Date().toLocaleDateString('es-MX'));
  L.push('');
  L.push('Ocupación: ' + comp.kpi.occU + '/' + comp.kpi.totalU + ' (' + comp.kpi.occPct + '%) · Ingresos mes: ' + CC_MONEY(comp.kpi.inc) + ' · Cashflow: ' + CC_MONEY(comp.kpi.cashflow));
  L.push('Flujo estructural: ' + verdes + '/' + casasHipo + ' casas en verde · Deuda VENCIDA: ' + CC_MONEY(ag.vencida) + ' · Por cobrar mes: ' + CC_MONEY(ag.porCobrar));
  L.push('Renta perdida por vacancia: ' + CC_MONEY(ag.rentaPerdida) + '/mes · Depósitos en custodia: ' + CC_MONEY(dep));
  L.push('');
  L.push('3 DECISIONES:');
  L.push('1. ' + (ag.vencida > 0 ? 'Cobrar la deuda VENCIDA (' + CC_MONEY(ag.vencida) + '): ' + ag.rows.filter(r => (r.b1 || 0) + (r.b2 || 0) > 0).slice(0, 3).map(r => r.nombre.split(' ')[0]).join(', ') + ' — drafts listos en Finanzas.' : 'Sin deuda vencida ✓.'));
  L.push('2. ' + (ag.rentaPerdida > 0 ? 'Colocar ' + ag.unidadesLibres + ' unidad(es) libres: ' + CC_MONEY(ag.rentaPerdida) + '/mes en juego.' : 'Sin vacancia ✓.'));
  L.push('3. ' + (venc.length ? venc.length + ' contrato(s) vencen en ≤60d (' + venc.slice(0, 3).map(t => (t.full_name || '').split(' ')[0]).join(', ') + '): renovar o programar salida.' : 'Sin vencimientos de contrato próximos ✓.'));
  const txt = L.join('\n');
  if (navigator.clipboard) navigator.clipboard.writeText(txt).then(() => alert('Resumen copiado.'), () => alert(txt)); else alert(txt);
}
window.ccContratosPanel = ccContratosPanel; window.ccExportExcelRentas = ccExportExcelRentas; window.ccCopyResumenRentas = ccCopyResumenRentas;
