// ════════════════════════════════════════════════════════════════
// 🌐 FLIPPING RENTALS OS — shell del ecosistema (global → empresa → app).
// Routing real (History API), 3 niveles + áreas transversales Operación/Contable.
// Diseño Property OS (dark/light vía pos-theme). SOLO LECTURA de datos (Airtable/QuickBooks).
// ════════════════════════════════════════════════════════════════
const OS = { route: { view: 'global' }, loaded: false, loadErr: null, ff: [], props: [], units: [], pay: [], book: [], tenants: [], tasks: [], investors: [], _charts: [], chat: [] };
window.OS = OS;

const OS_M = n => (n < 0 ? '-$' : '$') + Math.abs(Math.round(n || 0)).toLocaleString('en-US');
const OS_K = n => { const a = Math.abs(n); return (n < 0 ? '-$' : '$') + (a >= 1000 ? (a / 1000).toFixed(a >= 100000 ? 0 : 1) + 'k' : Math.round(a)); };
const OS_E = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function osAx() { return posGetTheme() === 'light' ? '#64748b' : '#5b6780'; }

// ─── Empresas / áreas del holding ───
const OS_EMPRESAS = {
  'fix-and-flip': { key: 'fix-flip', name: 'Fix & Flip', icon: '🏗️', tag: 'Compra · remodela · vende/refi', apps: [
    { k: 'command-center', name: 'Command Center', icon: '◧', fn: "osOpenApp('fix-and-flip','command-center')" },
    { k: 'deals', name: 'Deals & Pipeline', icon: '▦', fn: "osOpenApp('fix-and-flip','deals')" },
    { k: 'underwriting', name: 'Underwriting', icon: '∑', fn: "osOpenApp('fix-and-flip','underwriting')" },
    { k: 'inversionistas', name: 'Inversionistas', icon: '◍', fn: "osOpenApp('fix-and-flip','inversionistas')" },
    { k: 'finanzas', name: 'Finanzas · QuickBooks', icon: '$', fn: "osOpenApp('fix-and-flip','finanzas')" },
  ] },
  'rentas': { key: 'rentas', name: 'Rentas', icon: '🏠', tag: 'Property management · ocupación · cobros', apps: [
    { k: 'property-manager', name: 'Property Manager', icon: '⌂', fn: "osOpenApp('rentas','property-manager')" },
    { k: 'cronograma', name: 'Cronograma', icon: '📅', fn: "osOpenApp('rentas','cronograma')" },
  ] },
  'remodelacion': { key: 'remodelacion', name: 'Remodelación', icon: '🔨', tag: 'Obras · SOW · cronogramas', apps: [
    { k: 'remodel-pro', name: 'Estimador Pro', icon: '∑', fn: "osOpenApp('remodelacion','remodel-pro')" },
    { k: 'dashboard', name: 'Dashboard de Obras', icon: '▤', fn: "osOpenApp('remodelacion','dashboard')" },
    { k: 'cronograma', name: 'Cronograma', icon: '📅', fn: "osOpenApp('remodelacion','cronograma')" },
  ] },
  'educacion': { key: 'education', name: 'Educación', icon: '🎓', tag: 'Universidad de Real Estate', apps: [
    { k: 'manager', name: 'Mentorías Manager', icon: '◍', fn: "osOpenApp('educacion','manager')" },
    { k: 'reportes', name: 'Informes Ejecutivos', icon: '▤', fn: "osOpenApp('educacion','reportes')" },
  ] },
};
const OS_AREAS = {
  operacion: { name: 'Operación', icon: '⚙️', tag: 'Cronograma + cobranza · cruza todas las empresas' },
  contable: { name: 'Contable', icon: '📒', tag: 'QuickBooks · conciliación · cap table' },
};

// ════════════════════════════════════════════════════════════════
// CSS
// ════════════════════════════════════════════════════════════════
function osInjectCSS() {
  if (document.getElementById('os-styles')) return;
  const st = document.createElement('style'); st.id = 'os-styles';
  st.textContent = `
  #os-root{position:fixed;inset:0;z-index:900;overflow:auto;
    --bg:#06080d;--ink:#eef2f8;--mut:#93a0b6;--mut2:#5b6780;--glass:rgba(255,255,255,.045);--glassb:rgba(255,255,255,.09);
    --a1:#45e3c6;--a2:#4f8dff;--a3:#8a7bff;--pos:#48d69c;--neg:#f0687a;--amber:#e7b65e;
    --mesh1:rgba(69,227,198,.14);--mesh2:rgba(79,141,255,.15);--mesh3:rgba(138,123,255,.12);--bggrad:linear-gradient(180deg,#070a11,#05070c);
    color:var(--ink);background:var(--bg);font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;-webkit-font-smoothing:antialiased}
  #os-root[data-theme="light"]{--bg:#eef2f8;--ink:#0f1c2e;--mut:#48566e;--mut2:#8595ac;--glass:rgba(255,255,255,.82);--glassb:rgba(15,23,42,.09);
    --a1:#12b5a0;--a2:#2f6ef0;--a3:#6b5bef;--pos:#0ea371;--neg:#e0455f;--amber:#c98a1e;
    --mesh1:rgba(18,181,160,.1);--mesh2:rgba(47,110,240,.1);--mesh3:rgba(107,91,239,.08);--bggrad:linear-gradient(180deg,#f6f8fc,#eaf0f8)}
  #os-root *{box-sizing:border-box;margin:0;padding:0}
  #os-root .bgfx{position:fixed;inset:0;z-index:0;pointer-events:none;background:radial-gradient(760px 520px at 8% -6%,var(--mesh1),transparent 58%),radial-gradient(820px 560px at 100% 4%,var(--mesh2),transparent 56%),radial-gradient(700px 620px at 70% 118%,var(--mesh3),transparent 60%),var(--bggrad)}
  #os-root .wrap{position:relative;z-index:1;max-width:1500px;margin:0 auto;padding:22px 30px 60px}
  #os-root .bar{display:flex;align-items:center;gap:14px;margin-bottom:24px}
  #os-root .logo{width:38px;height:38px;border-radius:11px;background:linear-gradient(135deg,var(--a1),var(--a2));display:grid;place-items:center;color:#04121a;font-weight:900;font-size:15px;box-shadow:0 6px 20px -6px rgba(79,141,255,.6)}
  #os-root .brandt b{font-size:16px;font-weight:760}#os-root .brandt span{display:block;font-size:9px;color:var(--mut2);letter-spacing:2.4px;margin-top:1px}
  #os-root .crumbs{display:flex;align-items:center;gap:7px;font-size:12px;color:var(--mut);margin-left:8px}
  #os-root .crumbs a{color:var(--mut);cursor:pointer;text-decoration:none}#os-root .crumbs a:hover{color:var(--ink)}#os-root .crumbs .sep{color:var(--mut2)}#os-root .crumbs b{color:var(--ink)}
  #os-root .barr{margin-left:auto;display:flex;gap:8px;align-items:center}
  #os-root .ibtn{background:var(--glass);border:1px solid var(--glassb);color:var(--mut);height:34px;padding:0 12px;border-radius:10px;cursor:pointer;font-size:12px;display:flex;align-items:center;gap:6px;backdrop-filter:blur(10px)}
  #os-root .ibtn:hover{color:var(--ink);border-color:var(--a2)}
  #os-root h1{font-size:25px;font-weight:770;letter-spacing:-.4px}#os-root h1 span{background:linear-gradient(90deg,var(--a1),var(--a2));-webkit-background-clip:text;background-clip:text;color:transparent}
  #os-root .sub{color:var(--mut);font-size:13px;margin:5px 0 20px}
  #os-root .grid{display:grid;gap:16px}#os-root .k4{grid-template-columns:repeat(4,minmax(0,1fr))}#os-root .k3{grid-template-columns:repeat(3,minmax(0,1fr))}#os-root .k2{grid-template-columns:repeat(2,minmax(0,1fr))}
  #os-root .card{position:relative;background:var(--glass);border:1px solid var(--glassb);border-radius:16px;padding:19px;backdrop-filter:blur(18px);box-shadow:0 26px 60px -34px rgba(0,0,0,.9);transition:.2s;overflow:hidden}
  #os-root[data-theme="light"] .card{box-shadow:0 10px 30px -18px rgba(15,23,42,.22)}
  #os-root .card::before{content:"";position:absolute;inset:0 0 auto 0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.2),transparent)}
  #os-root[data-theme="light"] .card::before{background:linear-gradient(90deg,transparent,rgba(15,23,42,.1),transparent)}
  #os-root .lab{font-size:10px;letter-spacing:1.4px;color:var(--mut2);text-transform:uppercase;font-weight:700}
  #os-root .big{font-size:29px;font-weight:780;margin-top:8px;letter-spacing:-.6px}#os-root .glow{text-shadow:0 0 22px rgba(69,227,198,.35)}#os-root[data-theme="light"] .glow{text-shadow:none}
  #os-root .meta{font-size:11.5px;color:var(--mut);margin-top:6px;line-height:1.5}
  #os-root .up{color:var(--pos)}#os-root .down{color:var(--neg)}#os-root .warn{color:var(--amber)}
  #os-root .unit{cursor:pointer}#os-root .unit:hover{transform:translateY(-3px);border-color:var(--a2)}
  #os-root .unit .ico{font-size:26px}#os-root .unit .un{font-size:16px;font-weight:700;margin-top:9px}#os-root .unit .ut{font-size:11.5px;color:var(--mut2);margin-top:3px;min-height:30px}
  #os-root .unit .kv{display:flex;justify-content:space-between;font-size:12px;padding:4px 0;border-top:1px solid var(--glassb);margin-top:10px}#os-root .unit .kv b{color:var(--ink)}
  #os-root .go{font-size:11px;color:var(--a2);margin-top:12px;font-weight:600}
  #os-root .brain{background:linear-gradient(180deg,rgba(30,28,58,.5),rgba(14,16,32,.5));border:1px solid rgba(138,123,255,.28)}
  #os-root[data-theme="light"] .brain{background:linear-gradient(180deg,rgba(138,123,255,.1),rgba(79,141,255,.05))}
  #os-root .bh{display:flex;align-items:center;gap:12px;margin-bottom:12px}
  #os-root .orb{width:32px;height:32px;border-radius:50%;position:relative;background:radial-gradient(circle at 34% 30%,#a9f5e6,#45e3c6 30%,#4f8dff 70%,#2a2f66);box-shadow:0 0 22px rgba(79,141,255,.5)}
  #os-root .orb::after{content:"";position:absolute;inset:-5px;border-radius:50%;background:conic-gradient(from 0deg,var(--a1),var(--a2),var(--a3),var(--a1)) border-box;-webkit-mask:linear-gradient(#000 0 0) padding-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;animation:osspin 6s linear infinite;opacity:.7}@keyframes osspin{to{transform:rotate(360deg)}}
  #os-root .bh b{font-size:14px}#os-root .bh span{font-size:9px;color:var(--mut2);display:block;letter-spacing:1.4px;margin-top:2px}
  #os-root .insight{display:flex;gap:11px;padding:10px 0;border-bottom:1px solid var(--glassb)}#os-root .insight:last-of-type{border-bottom:none}
  #os-root .insight .ic{font-size:8px;margin-top:6px}#os-root .ic.r{color:var(--neg)}#os-root .ic.y{color:var(--amber)}#os-root .ic.g{color:var(--pos)}#os-root .ic.b{color:var(--a2)}
  #os-root .insight .tx{font-size:12px;line-height:1.5}#os-root .insight .tx b{font-weight:650}#os-root .insight .tag{font-size:9px;color:var(--mut2);font-weight:700;letter-spacing:.6px;margin-top:4px;display:block}
  #os-root .app-card{cursor:pointer;display:flex;align-items:center;gap:13px}#os-root .app-card:hover{transform:translateY(-2px);border-color:var(--a2)}
  #os-root .app-card .ai{width:40px;height:40px;border-radius:11px;background:linear-gradient(135deg,rgba(69,227,198,.16),rgba(79,141,255,.1));display:grid;place-items:center;font-size:17px;flex-shrink:0}
  #os-root .app-card .an{font-size:13.5px;font-weight:640}#os-root .app-card .at{font-size:10.5px;color:var(--mut2);margin-top:2px}
  #os-root .soon{font-size:8.5px;font-weight:700;color:var(--a2);background:rgba(79,141,255,.12);padding:2px 7px;border-radius:10px;margin-left:auto}
  #os-root .ptable{width:100%;border-collapse:collapse;font-size:12.5px}
  #os-root .ptable th{text-align:left;color:var(--mut2);font-size:9.5px;letter-spacing:1px;text-transform:uppercase;padding:9px 8px;border-bottom:1px solid var(--glassb);font-weight:700}
  #os-root .ptable td{padding:10px 8px;border-bottom:1px solid var(--glassb)}#os-root .ptable tr:hover td{background:var(--glass)}
  #os-root .badge{font-size:10px;padding:3px 9px;border-radius:7px;font-weight:600}#os-root .b-red{background:rgba(240,104,122,.13);color:var(--neg)}#os-root .b-warn{background:rgba(231,182,94,.13);color:var(--amber)}#os-root .b-ok{background:rgba(72,214,156,.13);color:var(--pos)}
  #os-root .chart-h{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}#os-root .chart-h .t{font-size:13.5px;font-weight:640}#os-root .chart-h .k{font-size:11px;color:var(--mut2)}
  #os-root .op-item{display:flex;align-items:center;gap:11px;padding:9px 0;border-bottom:1px solid var(--glassb);font-size:12px}#os-root .op-time{color:var(--mut2);width:46px;font-variant-numeric:tabular-nums}
  #os-root .zpill{margin-left:auto;font-size:9.5px;padding:2px 9px;border-radius:20px;background:var(--glass);color:var(--mut)}
  #os-root .cbtn{background:linear-gradient(135deg,var(--a1),var(--a2));border:none;color:#04121a;font-weight:700;padding:6px 12px;border-radius:9px;cursor:pointer;font-size:11px}
  #os-root .empty{padding:50px;text-align:center;color:var(--mut2)}
  #os-root .card,#os-root .wrap{animation:osfade .35s ease}@keyframes osfade{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
  #os-root .cc-chat{display:flex;flex-direction:column;gap:10px;max-height:320px;overflow-y:auto;margin-top:6px}#os-root .cc-chat:empty{display:none}
  #os-root .cbub{max-width:82%;padding:10px 13px;border-radius:13px;font-size:12.5px;line-height:1.55;white-space:pre-wrap}
  #os-root .cbub.u{align-self:flex-end;background:linear-gradient(135deg,rgba(69,227,198,.16),rgba(79,141,255,.14));border:1px solid rgba(79,141,255,.3)}
  #os-root .cbub.a{align-self:flex-start;background:var(--glass);border:1px solid var(--glassb)}#os-root .cbub.err{border-color:rgba(240,104,122,.4);color:var(--neg)}#os-root .cbub.think{color:var(--mut2);font-style:italic}
  #os-root .ask{display:flex;gap:8px;margin-top:14px}#os-root .ask input{flex:1;background:var(--glass);border:1px solid rgba(138,123,255,.3);border-radius:11px;padding:11px 14px;color:var(--ink);font-size:12px;outline:none}
  #os-root .ask button{background:linear-gradient(135deg,var(--a1),var(--a2));border:none;color:#04121a;font-weight:750;padding:0 16px;border-radius:11px;cursor:pointer;font-size:12px}
  @media (max-width:900px){#os-root .wrap{padding:16px 14px 40px}#os-root .k4,#os-root .k3,#os-root .k2{grid-template-columns:minmax(0,1fr)}#os-root .k4.units{grid-template-columns:repeat(2,minmax(0,1fr))}}
  /* ── TOPBAR del OS sobre los sistemas en PÁGINA COMPLETA (marco de empresa) ── */
  #os-return-bar{position:fixed;top:0;left:0;right:0;z-index:2147483000;display:flex;align-items:center;gap:14px;height:54px;padding:0 20px;
    font-family:'Inter',-apple-system,'Segoe UI',Roboto,Arial,sans-serif;background:rgba(8,11,18,.72);border-bottom:1px solid rgba(255,255,255,.08);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}
  #os-return-bar[data-theme="light"]{background:rgba(255,255,255,.82);border-bottom-color:rgba(15,23,42,.08)}
  #os-return-bar .osrb-logo{width:32px;height:32px;border-radius:9px;background:linear-gradient(135deg,#45e3c6,#4f8dff);display:grid;place-items:center;color:#04121a;font-weight:900;font-size:12px;cursor:pointer;flex-shrink:0}
  #os-return-bar .osrb-crumb{display:flex;align-items:center;gap:8px;font-size:13px;color:#93a0b6;min-width:0}
  #os-return-bar .osrb-crumb a{color:#93a0b6;cursor:pointer;text-decoration:none;white-space:nowrap}#os-return-bar .osrb-crumb a:hover{color:#eef2f8}
  #os-return-bar .osrb-crumb b{color:#eef2f8;font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#os-return-bar .osrb-crumb .sep{color:#5b6780}
  #os-return-bar[data-theme="light"] .osrb-crumb,#os-return-bar[data-theme="light"] .osrb-crumb a{color:#48566e}#os-return-bar[data-theme="light"] .osrb-crumb b{color:#0f1c2e}
  #os-return-bar .osrb-back{margin-left:auto;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.13);color:#eef2f8;font-weight:600;font-size:12.5px;padding:8px 14px;border-radius:9px;cursor:pointer;flex-shrink:0}
  #os-return-bar .osrb-back:hover{border-color:#4f8dff}
  #os-return-bar[data-theme="light"] .osrb-back{background:rgba(15,23,42,.05);border-color:rgba(15,23,42,.12);color:#0f1c2e}
  #os-return-bar .osrb-theme{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.13);color:#93a0b6;font-size:13px;padding:8px 11px;border-radius:9px;cursor:pointer;flex-shrink:0}
  #os-return-bar[data-theme="light"] .osrb-theme{background:rgba(15,23,42,.05);border-color:rgba(15,23,42,.12);color:#48566e}
  /* ── #modal como PÁGINA COMPLETA (no modal flotante): ocupa todo, mesh de fondo, sin backdrop ── */
  #modal.os-syspage{padding:0 !important;display:block !important;overflow-y:auto;background:transparent}
  html[data-osreskin="dark"] #modal.os-syspage{background:
    radial-gradient(760px 520px at 6% -6%,rgba(69,227,198,.13),transparent 58%),
    radial-gradient(820px 560px at 100% 2%,rgba(79,141,255,.14),transparent 56%),
    radial-gradient(700px 620px at 74% 120%,rgba(138,123,255,.1),transparent 60%),
    linear-gradient(180deg,#070a11,#05070c) !important}
  html[data-osreskin="light"] #modal.os-syspage{background:
    radial-gradient(760px 520px at 6% -6%,rgba(18,181,160,.1),transparent 58%),
    radial-gradient(820px 560px at 100% 2%,rgba(47,110,240,.1),transparent 56%),
    linear-gradient(180deg,#f6f8fc,#eaf0f8) !important}
  #modal.os-syspage > div.bg-white{max-width:1520px !important;width:calc(100% - 40px) !important;margin:72px auto 28px !important;min-height:calc(100vh - 100px);max-height:none !important;height:auto !important;background:transparent !important;border:none !important;box-shadow:none !important;border-radius:0 !important;backdrop-filter:none !important;overflow:visible !important}
  #modal.os-syspage #modal-body{max-height:none !important;overflow:visible !important;padding:0 !important}
  /* ocultar el header propio del modal (título+×): el topbar del OS ya da contexto y "Volver" */
  #modal.os-syspage > div.bg-white > div:first-child{display:none !important}
  @media (max-width:640px){#modal.os-syspage > div.bg-white{width:calc(100% - 20px) !important;margin-top:64px !important}#os-return-bar .osrb-back{padding:7px 10px}}
  `;
  document.head.appendChild(st);
}

// ════════════════════════════════════════════════════════════════
// RE-SKIN base sobre los sistemas clásicos (CAPA de estilos — no toca markup/lógica).
// Mapea el look Tailwind viejo → tokens nuevos. El modo oscuro es el que más aporta
// (la UI vieja es light-only); en claro es pulido mínimo para no arriesgar layouts.
// ════════════════════════════════════════════════════════════════
function osInjectReskin() {
  if (document.getElementById('os-reskin')) return;
  const st = document.createElement('style'); st.id = 'os-reskin';
  const D = 'html[data-osreskin="dark"]'; const L = 'html[data-osreskin="light"]';
  st.textContent = `
  /* chrome del modal (ambos temas): más redondeado + tipografía del sistema nuevo */
  html[data-osreskin] #modal{transition:none}
  html[data-osreskin] #modal > div{border-radius:18px !important}
  ${L} #modal > div{box-shadow:0 24px 70px -26px rgba(15,23,42,.42) !important}
  /* ───────── DARK ───────── */
  ${D} #modal{background:rgba(4,7,12,.66) !important}
  ${D} #modal > div{background:#0f151e !important;color:#e7ecf5 !important;border:1px solid rgba(255,255,255,.1) !important;box-shadow:0 34px 90px -32px rgba(0,0,0,.92) !important}
  ${D} #modal .bg-white,${D} #modal .bg-slate-50,${D} #modal .bg-slate-100,${D} #modal .bg-gray-50,${D} #modal .bg-gray-100,${D} #modal .bg-neutral-50,${D} #modal .bg-neutral-100{background-color:#151d28 !important}
  ${D} #modal .bg-slate-800,${D} #modal .bg-slate-900,${D} #modal .bg-gray-800,${D} #modal .bg-gray-900{background-color:#1b2634 !important}
  ${D} #modal .text-slate-900,${D} #modal .text-slate-800,${D} #modal .text-slate-700,${D} #modal .text-slate-600,${D} #modal .text-gray-900,${D} #modal .text-gray-800,${D} #modal .text-gray-700,${D} #modal .text-black{color:#e7ecf5 !important}
  ${D} #modal .text-slate-500,${D} #modal .text-slate-400,${D} #modal .text-gray-500,${D} #modal .text-gray-400{color:#93a0b6 !important}
  ${D} #modal .border,${D} #modal .border-b,${D} #modal .border-t,${D} #modal .border-slate-200,${D} #modal .border-slate-100,${D} #modal .border-slate-300,${D} #modal .border-gray-200,${D} #modal .border-gray-100,${D} #modal .border-gray-300{border-color:rgba(255,255,255,.1) !important}
  ${D} #modal .divide-slate-200 > *+*,${D} #modal .divide-gray-200 > *+*,${D} #modal .divide-slate-100 > *+*{border-color:rgba(255,255,255,.08) !important}
  ${D} #modal input,${D} #modal select,${D} #modal textarea{background-color:#0b1119 !important;color:#e7ecf5 !important;border-color:rgba(255,255,255,.14) !important}
  ${D} #modal input::placeholder,${D} #modal textarea::placeholder{color:#5b6780 !important}
  ${D} #modal table th{color:#93a0b6 !important}
  ${D} #modal tr:hover td{background:rgba(255,255,255,.03) !important}
  ${D} #modal .shadow,${D} #modal .shadow-sm,${D} #modal .shadow-md,${D} #modal .shadow-lg{box-shadow:none !important}
  ${D} #modal .hover\\:bg-slate-50:hover,${D} #modal .hover\\:bg-slate-100:hover,${D} #modal .hover\\:bg-gray-50:hover,${D} #modal .hover\\:bg-gray-100:hover{background-color:rgba(255,255,255,.05) !important}
  /* bg-slate-900 lo maneja el sistema de diseño compartido (superficie oscura elevada, no gradiente,
     para no romper las cards de acento con sublabels muted). */
  /* Property Manager tiene su tema COMPLETO propio (pmInjectTheme en pm-main.js). */
  `;
  document.head.appendChild(st);
}
function osApplyReskin() {
  const t = (window.posGetTheme && posGetTheme()) || 'dark';
  document.documentElement.setAttribute('data-osreskin', t);
}
window.osApplyReskin = osApplyReskin;

// ════════════════════════════════════════════════════════════════
// ROUTER (History API)
// ════════════════════════════════════════════════════════════════
function osParse(path) {
  const p = (path || location.pathname).replace(/\/+$/, '') || '/';
  const seg = p.split('/').filter(Boolean);
  if (seg.length === 0) return { view: 'global' };
  if (seg[0] === 'operacion') return { view: 'operacion' };
  if (seg[0] === 'contable') return { view: 'contable' };
  if (OS_EMPRESAS[seg[0]]) {
    if (seg[1]) return { view: 'app', empresa: seg[0], app: seg[1], slug: seg[2] || null };
    return { view: 'empresa', empresa: seg[0] };
  }
  return { view: '404', path: p };
}
function osTitle(r) {
  const base = 'Flipping Rentals OS';
  if (r.view === 'global') return base;
  if (r.view === 'operacion') return 'Operación · ' + base;
  if (r.view === 'contable') return 'Contable · ' + base;
  if (r.empresa) return (OS_EMPRESAS[r.empresa].name) + ' · ' + base;
  return 'No encontrado · ' + base;
}
function osNav(path, replace) {
  if (replace) history.replaceState({}, '', path); else history.pushState({}, '', path);
  OS.route = osParse(path); document.title = osTitle(OS.route); osRender();
}
window.osNav = osNav;
function osInit() {
  if (OS._init) return; OS._init = true;
  osInjectCSS(); osInjectReskin();
  window.addEventListener('popstate', () => { OS.route = osParse(); document.title = osTitle(OS.route); osRender(); });
  // Interceptar clicks en [data-osnav]
  document.addEventListener('click', e => { const a = e.target.closest('[data-osnav]'); if (a) { e.preventDefault(); osNav(a.getAttribute('data-osnav')); } });
  OS.route = osParse(); document.title = osTitle(OS.route);
  osMount(); osLoad().then(osRender);
}
window.osInit = osInit;
function osMount() {
  let root = document.getElementById('os-root');
  if (!root) { root = document.createElement('div'); root.id = 'os-root'; document.body.appendChild(root); }
  posApplyTheme(root);
  root.innerHTML = '<div class="bgfx"></div><div class="wrap"><div style="padding:60px;color:#5b6780">⏳ Cargando Flipping Rentals OS…</div></div>';
}
function osToggleTheme() { posToggleTheme(); osApplyReskin(); osRender(); }
window.osToggleTheme = osToggleTheme;

async function osLoad() {
  OS.loaded = false; OS.loadErr = null;
  try {
    const [ff, props, units, pay, book, tenants, tasks, inv] = await Promise.all([
      sb.from('ff_deals').select('*').eq('active', true),
      sb.from('pm_properties').select('id,name,zone,rental_model,total_units').eq('active', true),
      sb.from('pm_units').select('id,property_id,status,target_rent,unit_type,is_active').eq('is_active', true),
      sb.from('pm_payments').select('amount,type,status,property_id,tenant_id,paid_at').eq('active', true).eq('type', 'ingreso').eq('status', 'pagado'),
      sb.from('pm_bookings').select('unit_id,property_id,tenant_id,start_date,end_date,status').eq('active', true),
      sb.from('pm_tenants').select('id,full_name,phone,client_state'),
      sb.from('pm_tasks').select('title,task_type,scheduled_date,zone,assignee,start_at,status,property_id').eq('active', true),
      sb.from('ff_investors').select('*').eq('active', true),
    ]);
    OS.ff = ff.data || []; OS.props = props.data || []; OS.units = units.data || []; OS.pay = pay.data || [];
    OS.book = book.data || []; OS.tenants = tenants.data || []; OS.tasks = tasks.data || []; OS.investors = inv.data || [];
    OS.loaded = true;
  } catch (e) { OS.loadErr = e.message || String(e); }
}

// ════════════════════════════════════════════════════════════════
// CÁLCULO (KPIs del holding, por empresa, cobranza)
// ════════════════════════════════════════════════════════════════
const OS_INDEP = ['casa_completa', 'apartamento', 'estudio'];
function osUnitState(u) { const s = (u.status || '').toLowerCase(); if (/mantenim/.test(s)) return 'mant'; if (/ocupad/.test(s)) return 'ocupada'; if (/reservad/.test(s)) return 'reservada'; return 'libre'; }
function osMonthBounds() { const d = new Date(); const y = d.getUTCFullYear(), m = d.getUTCMonth(); const py = m === 0 ? y - 1 : y, pm = m === 0 ? 12 : m; const mm = String(pm).padStart(2, '0'); const last = new Date(Date.UTC(py, pm, 0)).getUTCDate(); const MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']; return { from: `${py}-${mm}-01`, to: `${py}-${mm}-${String(last).padStart(2, '0')}`, label: `${MES[pm - 1]} ${py}` }; }
function osCompute() {
  // FIX & FLIP
  const drawN = {}; // (draws no cargados en OS; usamos remodel_est×1.3 como proxy si no hay)
  const ff = OS.ff.map(d => { const arv = Number(d.arv || 0); const allIn = Number(d.purchase_price || 0) + Number(d.remodel_est || 0) * 1.3; return { ...d, arv, allIn }; });
  const ffActive = ff.filter(d => d.stage !== 'vendida');
  const ffCapital = ffActive.reduce((s, d) => s + d.allIn, 0);
  const ffArv = ff.reduce((s, d) => s + d.arv, 0);
  // RENTAS (regla de unidades = habitaciones juntas 1)
  const mb = osMonthBounds(); const inM = x => x && x >= mb.from && x <= mb.to;
  let totalU = 0, occU = 0;
  OS.props.forEach(p => { const us = OS.units.filter(u => u.property_id === p.id); const indep = us.filter(u => OS_INDEP.includes(u.unit_type)); const rooms = us.filter(u => u.unit_type === 'habitacion'); const hasR = rooms.length ? 1 : 0; totalU += indep.length + hasR; occU += indep.filter(u => osUnitState(u) === 'ocupada').length + (hasR && rooms.some(u => osUnitState(u) === 'ocupada') ? 1 : 0); });
  const rentInc = OS.pay.filter(p => inM(p.paid_at)).reduce((s, p) => s + Number(p.amount || 0), 0);
  const occPct = totalU ? Math.round(occU / totalU * 100) : 0;
  // Cobranza (deuda contrato − plata real): por casa ocupada, renta esperada vs cobrada en el mes.
  const cobranza = osCobranza(mb);
  return {
    mb,
    ff: { deals: ff.length, activos: ffActive.length, capital: ffCapital, arv: ffArv, list: ff },
    rentas: { casas: OS.props.length, unidades: totalU, ocupadas: occU, occPct, ingresos: rentInc },
    cobranza,
    holding: { capital: ffCapital, arv: ffArv, unidades: totalU + ff.length, ingresosMes: rentInc, deudaCobranza: cobranza.total },
  };
}
function osCobranza(mb) {
  // Por casa ocupada: renta esperada (target_rent de unidades ocupadas) − cobrado en el mes.
  const pName = id => (OS.props.find(p => p.id === id)?.name || '').split(',')[0];
  const rows = [];
  OS.props.forEach(p => {
    const us = OS.units.filter(u => u.property_id === p.id);
    const occRent = us.filter(u => osUnitState(u) === 'ocupada').reduce((s, u) => s + Number(u.target_rent || 0), 0);
    if (occRent <= 0) return;
    const cobrado = OS.pay.filter(x => x.property_id === p.id && x.paid_at >= mb.from && x.paid_at <= mb.to).reduce((s, x) => s + Number(x.amount || 0), 0);
    const deuda = occRent - cobrado;
    if (deuda > 200) rows.push({ casa: pName(p.id), esperado: Math.round(occRent), cobrado: Math.round(cobrado), deuda: Math.round(deuda) });
  });
  rows.sort((a, b) => b.deuda - a.deuda);
  return { rows, total: rows.reduce((s, r) => s + r.deuda, 0) };
}

// Insights del holding (transversal)
function osInsights(comp) {
  const ins = [];
  // Fix & Flip: error de datos, appraisal>ARV, all-in>75% (leídos de ff_deals; el detalle fino vive en el CC de FF)
  comp.ff.list.filter(d => d.appraisal > 0 && d.arv > 0 && d.appraisal > d.arv * 1.05).forEach(d => ins.push({ sev: 'warning', impact: d.appraisal - d.arv, tag: 'FIX&FLIP · APPRAISAL>ARV', tx: `<b>${OS_E((d.address || '').split(',')[0])}</b>: appraisal ${OS_M(d.appraisal)} > ARV ${OS_M(d.arv)}.` }));
  // Cobranza (holding): casas con deuda
  comp.cobranza.rows.slice(0, 3).forEach(r => ins.push({ sev: 'critical', impact: r.deuda, tag: 'COBRANZA · MORA', tx: `<b>${OS_E(r.casa)}</b>: deuda de <b>${OS_M(r.deuda)}</b> este mes (esperado ${OS_M(r.esperado)}, cobrado ${OS_M(r.cobrado)}). El Cerebro puede redactar el cobro.` }));
  // Conocidos del negocio (info)
  ins.push({ sev: 'info', impact: 146000, tag: 'CONTABLE · OVERHEAD', tx: `~<b>$146k</b> de overhead fuera de QuickBooks (equipo + plataformas). Conciliar para P&L real.` });
  ins.push({ sev: 'info', impact: 46000, tag: 'CONTABLE · INTERESES', tx: `Gap estimado de <b>~$46k</b> de intereses HML no reflejado en libros.` });
  const rank = { critical: 0, warning: 1, info: 3 };
  ins.sort((a, b) => (rank[a.sev] - rank[b.sev]) || (b.impact - a.impact));
  return ins;
}

// ════════════════════════════════════════════════════════════════
// RENDER
// ════════════════════════════════════════════════════════════════
function osDestroyCharts() { OS._charts.forEach(c => { try { c.destroy(); } catch (e) {} }); OS._charts = []; }
function osRender() {
  const root = document.getElementById('os-root'); if (!root) return;
  posApplyTheme(root); osDestroyCharts();
  if (OS.loadErr) { root.innerHTML = osShell(`<div class="empty"><div style="font-size:40px">⚠️</div><div class="down" style="margin-top:10px">${OS_E(OS.loadErr)}</div></div>`); return; }
  if (!OS.loaded) { root.innerHTML = osShell('<div class="empty">⏳ Cargando datos del holding…</div>'); return; }
  const comp = osCompute();
  const view = { global: osGlobal, empresa: osEmpresa, operacion: osOperacion, contable: osContable, app: osAppView, '404': os404 }[OS.route.view] || osGlobal;
  root.innerHTML = osShell(view(comp));
  requestAnimationFrame(() => osMountCharts(comp));
}
window.osRender = osRender;
function osCrumbs() {
  const r = OS.route; const parts = [`<a data-osnav="/">Global</a>`];
  if (r.view === 'operacion') parts.push('<span class="sep">/</span><b>⚙️ Operación</b>');
  else if (r.view === 'contable') parts.push('<span class="sep">/</span><b>📒 Contable</b>');
  else if (r.empresa) { const e = OS_EMPRESAS[r.empresa]; parts.push(`<span class="sep">/</span>${r.view === 'empresa' ? `<b>${e.icon} ${e.name}</b>` : `<a data-osnav="/${r.empresa}">${e.icon} ${e.name}</a>`}`); if (r.app) parts.push(`<span class="sep">/</span><b>${OS_E(r.app)}</b>`); }
  return parts.join(' ');
}
function osShell(inner) {
  return `<div class="bgfx"></div><div class="wrap">
    <div class="bar"><div class="logo" data-osnav="/" style="cursor:pointer">FR</div><div class="brandt"><b>Flipping Rentals OS</b><span>RENTAL PROFITSS · HOLDING</span></div>
      <div class="crumbs">${osCrumbs()}</div>
      <div class="barr"><button class="ibtn" onclick="osToggleTheme()" title="Tema claro/oscuro">◐</button></div>
    </div>${inner}</div>`;
}
function osOpenAdmin() { const root = document.getElementById('os-root'); if (root) root.style.display = 'none'; if (window.toast) toast('Panel clásico (sistemas/áreas). Volvé al OS con el logo de la esquina o recargando /', 'info', { duration: 4000 }); }
window.osOpenAdmin = osOpenAdmin;

// ─── NIVEL 1 · GLOBAL (macro del holding) ───
function osGlobal(comp) {
  const insights = osInsights(comp); const h = comp.holding;
  const unitCard = (slug, e, extra) => `<div class="card unit" data-osnav="/${slug}"><div class="ico">${e.icon}</div><div class="un">${e.name}</div><div class="ut">${e.tag}</div>${extra}<div class="go">Abrir ${e.name} →</div></div>`;
  return `<h1>Panel <span>Global</span> · Rental Profitss</h1><div class="sub">Vista macro del holding — todas las empresas y áreas en un solo lugar. Los datos fluyen desde Airtable + QuickBooks (solo lectura).</div>
    <div class="grid k4">
      <div class="card"><div class="lab">Capital desplegado (F&F)</div><div class="big glow">${OS_M(h.capital)}</div><div class="meta">${comp.ff.activos} deals activos · ARV ${OS_K(comp.ff.arv)}</div></div>
      <div class="card"><div class="lab">Ocupación Rentas</div><div class="big">${comp.rentas.occPct}%</div><div class="meta">${comp.rentas.ocupadas}/${comp.rentas.unidades} unidades · ${comp.rentas.casas} casas</div></div>
      <div class="card"><div class="lab">Ingresos del mes · ${comp.mb.label}</div><div class="big up">${OS_M(comp.rentas.ingresos)}</div><div class="meta">plata real recibida (rentas)</div></div>
      <div class="card"><div class="lab">Deuda de cobranza</div><div class="big down">${OS_M(h.deudaCobranza)}</div><div class="meta">contrato − plata real · ${comp.cobranza.rows.length} casas</div></div>
    </div>
    <div class="grid k2" style="margin-top:16px">
      <div><div class="grid k2 units">
        ${unitCard('fix-and-flip', OS_EMPRESAS['fix-and-flip'], `<div class="kv"><span>Capital</span><b>${OS_K(comp.ff.capital)}</b></div><div class="kv"><span>Deals</span><b>${comp.ff.deals}</b></div>`)}
        ${unitCard('rentas', OS_EMPRESAS['rentas'], `<div class="kv"><span>Ocupación</span><b>${comp.rentas.occPct}%</b></div><div class="kv"><span>Ingresos/mes</span><b>${OS_K(comp.rentas.ingresos)}</b></div>`)}
        ${unitCard('remodelacion', OS_EMPRESAS['remodelacion'], `<div class="kv"><span>Obras</span><b>—</b></div>`)}
        ${unitCard('educacion', OS_EMPRESAS['educacion'], `<div class="kv"><span>Programa</span><b>—</b></div>`)}
      </div>
      <div class="grid k2" style="margin-top:16px">
        <div class="card unit" data-osnav="/operacion"><div class="ico">⚙️</div><div class="un">Operación</div><div class="ut">${OS_AREAS.operacion.tag}</div><div class="kv"><span>Deuda cobranza</span><b class="down">${OS_K(h.deudaCobranza)}</b></div><div class="go">Abrir →</div></div>
        <div class="card unit" data-osnav="/contable"><div class="ico">📒</div><div class="un">Contable</div><div class="ut">${OS_AREAS.contable.tag}</div><div class="kv"><span>Overhead fuera QB</span><b class="warn">~$146k</b></div><div class="go">Abrir →</div></div>
      </div></div>
      <div class="card brain"><div class="bh"><div class="orb"></div><div><b>Cerebro del Holding</b><span>ANÁLISIS TRANSVERSAL · REGLAS</span></div></div>
        ${insights.slice(0, 5).map(i => `<div class="insight"><div class="ic ${i.sev === 'critical' ? 'r' : i.sev === 'warning' ? 'y' : 'b'}">●</div><div class="tx">${i.tx}<span class="tag">${i.tag}${i.impact ? ' · ' + OS_M(i.impact) : ''}</span></div></div>`).join('')}
        <div class="ask"><input id="os-ask" placeholder="Preguntá al Cerebro del holding…" onkeydown="if(event.key==='Enter')osAsk()"><button onclick="osAsk()">Enviar</button></div>
        <div id="os-chat" class="cc-chat"></div>
      </div>
    </div>`;
}

// ─── NIVEL 2 · EMPRESA ───
function osEmpresa(comp) {
  const e = OS_EMPRESAS[OS.route.empresa]; const isFF = OS.route.empresa === 'fix-and-flip', isR = OS.route.empresa === 'rentas';
  const kpis = isFF ? [['Deals activos', comp.ff.activos, `${comp.ff.deals} total`], ['Capital desplegado', OS_M(comp.ff.capital), 'all-in'], ['ARV portafolio', OS_M(comp.ff.arv), ''], ['Alertas', osInsights(comp).filter(i => i.tag.includes('FIX')).length || '—', 'Cerebro FF']]
    : isR ? [['Ocupación', comp.rentas.occPct + '%', `${comp.rentas.ocupadas}/${comp.rentas.unidades}`], ['Ingresos/mes', OS_M(comp.rentas.ingresos), comp.mb.label], ['Casas', comp.rentas.casas, ''], ['Deuda cobranza', OS_M(comp.cobranza.total), 'contrato − real']]
    : [['—', '—', 'datos próximamente']];
  return `<h1>${e.icon} ${e.name} <span>· Empresa</span></h1><div class="sub">${e.tag}</div>
    <div class="grid k4">${kpis.map(k => `<div class="card"><div class="lab">${k[0]}</div><div class="big">${k[1]}</div><div class="meta">${k[2]}</div></div>`).join('')}</div>
    <div class="chart-h" style="margin:24px 4px 12px"><div class="t">Apps de ${e.name}</div><div class="k">clic para abrir</div></div>
    <div class="grid k3">${e.apps.map(a => `<div class="card app-card" ${a.soon ? '' : `onclick="${a.fn}"`}><div class="ai">${a.icon}</div><div style="flex:1"><div class="an">${a.name}</div><div class="at">${a.soon ? 'Fase 2' : 'Abrir app'}</div></div>${a.soon ? '<span class="soon">pronto</span>' : ''}</div>`).join('')}</div>`;
}

// ─── ÁREA · OPERACIÓN ───
function osOperacion(comp) {
  const today = new Date().toISOString().slice(0, 10);
  const open = OS.tasks.filter(t => t.status !== 'completado' && t.status !== 'cancelado');
  const hoy = open.filter(t => t.scheduled_date === today).sort((a, b) => (a.start_at || '9').localeCompare(b.start_at || '9'));
  const atras = open.filter(t => t.scheduled_date && t.scheduled_date < today);
  const zlbl = z => ({ norte: 'Norte', sur: 'Sur', round_rock: 'Round Rock', marlin: 'Marlin' }[z] || z || '—');
  return `<h1>⚙️ Operación <span>· Cronograma + Cobranza</span></h1><div class="sub">Cruza todas las empresas — el equipo (Juan + Limpieza) y la cobranza por inquilino. Deuda = contrato − plata real.</div>
    <div class="grid k4">
      <div class="card"><div class="lab">Tareas hoy</div><div class="big">${hoy.length}</div><div class="meta">${atras.length} atrasadas</div></div>
      <div class="card"><div class="lab">Turnover (limpieza)</div><div class="big">${open.filter(t => t.task_type === 'cleaning').length}</div><div class="meta">desde check-outs</div></div>
      <div class="card"><div class="lab">Deuda de cobranza</div><div class="big down">${OS_M(comp.cobranza.total)}</div><div class="meta">${comp.cobranza.rows.length} casas con saldo</div></div>
      <div class="card"><div class="lab">Recepciones</div><div class="big">${open.filter(t => t.task_type === 'recepcion').length}</div><div class="meta">check-ins próximos</div></div>
    </div>
    <div class="grid k2" style="margin-top:16px">
      <div class="card"><div class="chart-h"><div class="t">Cronograma de hoy</div><div class="k">Juan + Limpieza · por zona</div></div>
        ${hoy.length ? hoy.slice(0, 12).map(t => `<div class="op-item"><span class="op-time">${t.start_at ? String(t.start_at).slice(11, 16) : '—'}</span> <span style="flex:1">${OS_E((t.title || '').replace(/^[^A-Za-z0-9]+/, '')).slice(0, 34)}${t.assignee ? ` · <span style="color:var(--a2)">${OS_E(t.assignee)}</span>` : ''}</span><span class="zpill">${zlbl(t.zone)}</span></div>`).join('') : '<div class="meta" style="padding:14px 0">Sin tareas hoy.</div>'}</div>
      <div class="card"><div class="chart-h"><div class="t">Cobranza · deuda por casa</div><div class="k">contrato − plata real</div></div>
        <table class="ptable"><thead><tr><th>Casa</th><th>Esperado</th><th>Cobrado</th><th>Deuda</th><th></th></tr></thead><tbody>
        ${comp.cobranza.rows.slice(0, 12).map(r => `<tr><td>${OS_E(r.casa)}</td><td>${OS_M(r.esperado)}</td><td>${OS_M(r.cobrado)}</td><td class="down">${OS_M(r.deuda)}</td><td><button class="cbtn" onclick="osDraftCobro('${OS_E(r.casa)}',${r.deuda})">✎ Cobro</button></td></tr>`).join('') || '<tr><td colspan="5" class="up">Sin deuda pendiente ✓</td></tr>'}</tbody></table>
        <div class="meta" style="margin-top:10px">El Cerebro redacta el mensaje de cobro; un humano lo aprueba y envía. <b>Se registra la plata real, no el contrato.</b></div></div>
    </div>`;
}
function osDraftCobro(casa, deuda) { osAsk(`Redactá un mensaje de cobro cordial pero firme para el inquilino de ${casa}, que debe ${OS_M(deuda)} este mes. Recordale el saldo, ofrecé un plan si hace falta, y pedí confirmación de pago. Español neutro.`); }
window.osDraftCobro = osDraftCobro;

// ─── ÁREA · CONTABLE ───
function osContable(comp) {
  const capRows = OS.investors;
  return `<h1>📒 Contable <span>· QuickBooks + Conciliación</span></h1><div class="sub">P&L / balance / cashflow de QuickBooks, conciliación Airtable↔QuickBooks y cap table de inversionistas.</div>
    <div class="grid k4">
      <div class="card"><div class="lab">Ingresos rentas (mes)</div><div class="big up">${OS_M(comp.rentas.ingresos)}</div><div class="meta">plata real · ${comp.mb.label}</div></div>
      <div class="card"><div class="lab">Overhead fuera de QB</div><div class="big warn">~$146k</div><div class="meta">equipo + plataformas F&F</div></div>
      <div class="card"><div class="lab">Gap de intereses</div><div class="big warn">~$46k</div><div class="meta">HML no reflejado en libros</div></div>
      <div class="card"><div class="lab">Deuda de cobranza</div><div class="big down">${OS_M(comp.cobranza.total)}</div><div class="meta">por cobrar (rentas)</div></div>
    </div>
    <div class="grid k2" style="margin-top:16px">
      <div class="card"><div class="chart-h"><div class="t">Conciliación Airtable ↔ QuickBooks</div><div class="k">SOLO LECTURA</div></div>
        <table class="ptable"><thead><tr><th>Concepto</th><th>Estado</th><th>Impacto</th></tr></thead><tbody>
        <tr><td>Overhead de equipo + plataformas fuera de libros</td><td><span class="badge b-warn">Fuera de QB</span></td><td class="down">~$146k</td></tr>
        <tr><td>Intereses HML no reflejados</td><td><span class="badge b-warn">Gap</span></td><td class="down">~$46k</td></tr>
        <tr><td>Obligación a inversionistas (pasivo / cap table)</td><td><span class="badge b-warn">Pendiente</span></td><td>—</td></tr>
        <tr><td>Ingresos de rentas (plata real)</td><td><span class="badge b-ok">Conciliado</span></td><td class="up">${OS_M(comp.rentas.ingresos)}</td></tr>
        </tbody></table>
        <div class="meta" style="margin-top:10px">P&L / balance / cashflow de QuickBooks completos llegan en la Fase 2 (conector QB). Hoy: conciliación de los gaps conocidos.</div></div>
      <div class="card"><div class="chart-h"><div class="t">Cap table de inversionistas</div><div class="k">${capRows.length} inversionistas</div></div>
        ${capRows.length ? `<table class="ptable"><thead><tr><th>Inversionista</th><th>Etiqueta</th><th>Ciudad</th></tr></thead><tbody>${capRows.slice(0, 14).map(x => `<tr><td>${OS_E(x.name || '—')}</td><td>${OS_E(x.label || '—')}</td><td>${OS_E(x.city || '—')}</td></tr>`).join('')}</tbody></table>`
        : `<div class="empty"><div class="orb" style="margin:0 auto 12px"></div><div>El cap table (aportes, rentabilidad, saldos, contratos sin firmar) se carga con los inversionistas en la <b>Fase 2</b>.</div></div>`}</div>
    </div>`;
}

// ─── NIVEL 3 · APP (abre el Command Center correspondiente) ───
function osAppView(comp) {
  const r = OS.route;
  // Renderiza el panel de empresa como fondo y abre la app encima.
  setTimeout(() => osOpenApp(r.empresa, r.app, true), 30);
  return osEmpresa(comp);
}
// Apps que son SISTEMAS CLÁSICOS (viven en app.js, abren como modal/overlay) → tipo de sistema.
const OS_APP_SYS = {
  'rentas/property-manager': 'pm-rental-mgmt', 'rentas/cronograma': 'cronograma',
  'remodelacion/remodel-pro': 'remodel-pro', 'remodelacion/dashboard': 'remodel-dashboard', 'remodelacion/cronograma': 'cronograma',
  'educacion/manager': 'edu-manager', 'educacion/reportes': 'edu-reports',
};
function osOpenApp(empresa, app, fromRoute) {
  if (!fromRoute) osNav(`/${empresa}/${app}`);
  OS._returnTo = `/${empresa}`;
  // Command Centers nuevos (overlays propios z>os-root → no hace falta ocultar el OS).
  if (empresa === 'fix-and-flip') { if (window.openFFCommandCenter) { openFFCommandCenter({ name: 'Fix & Flip' }); const sec = { deals: 'deals', underwriting: 'underwriting', inversionistas: 'inversionistas', finanzas: 'finanzas', analitica: 'analitica' }[app]; if (sec && sec !== 'command-center') setTimeout(() => window.ffGo && ffGo(sec), 450); } return; }
  // El "Command Center" de Rentas se removió (duplicaba a Property Manager) → redirigir.
  if (empresa === 'rentas' && app === 'command-center') { return osNav('/rentas/property-manager'); }
  // Sistemas clásicos → dispatch de app.js, con el OS oculto + barra Volver.
  const sysType = OS_APP_SYS[`${empresa}/${app}`];
  if (sysType) return osOpenSystem(sysType, empresa);
}
window.osOpenApp = osOpenApp;

function osOpenSystem(sysType, empresaSlug) {
  // Busca el sistema por TIPO en TODAS las áreas (state.systems se indexa por id de área real, no por empresa).
  let found = null, areaId = null;
  const sysMap = (typeof state !== 'undefined' && state && state.systems) || {};
  for (const [aid, list] of Object.entries(sysMap)) {
    const s = (list || []).find(x => x.type === sysType);
    if (s) { found = s; areaId = aid; break; }
  }
  if (!found || !window.openSystem) { if (window.toast) toast('No encontré ese sistema en tu cuenta todavía.', 'error'); return; }
  const e = OS_EMPRESAS[empresaSlug];
  osEnterClassic(empresaSlug ? `/${empresaSlug}` : (OS._returnTo || '/'), (e ? `${e.icon} ${e.name}` : 'Panel'), found.name || 'Sistema');
  openSystem(areaId, found.id); // lógica intacta (abre su modal)
  // convertir el modal en PÁGINA COMPLETA (sin backdrop, ocupa todo el marco del OS)
  const m = document.getElementById('modal'); if (m) m.classList.add('os-syspage');
}
window.osOpenSystem = osOpenSystem;

// ─── Puente OS ↔ sistemas clásicos: oculta el OS mientras el sistema está abierto y
//     lo restaura al cerrar (×, ESC, backdrop o "Volver"). No toca la lógica del sistema.
function osEnterClassic(returnTo, empresaLabel, sysName) {
  OS._classicOpen = true; OS._returnTo = returnTo || '/';
  OS._sysEmpresa = empresaLabel || 'Panel'; OS._sysName = sysName || 'Sistema';
  // el OS se oculta; el sistema se muestra a PÁGINA COMPLETA con su propio marco (topbar + mesh).
  const root = document.getElementById('os-root'); if (root) root.style.display = 'none';
  const app = document.getElementById('app'); if (app) app.style.visibility = 'hidden'; // shell viejo fuera de vista
  osInjectReskin(); osApplyReskin();
  osInjectReturnBar(OS._sysEmpresa, OS._sysName);
  // Envolver closeModal UNA vez para volver al OS cuando el sistema se cierra.
  if (!OS._closeWrapped && typeof window.closeModal === 'function') {
    OS._closeWrapped = true; const orig = window.closeModal;
    window.closeModal = function () { const r = orig.apply(this, arguments); if (OS._classicOpen) osExitClassic(); return r; };
  }
}
function osExitClassic() {
  if (!OS._classicOpen) return; OS._classicOpen = false;
  document.getElementById('os-return-bar')?.remove();
  try { const m = document.getElementById('modal'); if (m) { m.classList.remove('os-syspage'); if (!m.classList.contains('hidden')) m.classList.add('hidden'); } } catch (e) {}
  const app = document.getElementById('app'); if (app) app.style.visibility = '';
  const root = document.getElementById('os-root'); if (root) root.style.display = '';
  osNav(OS._returnTo || '/');
}
window.osExitClassic = osExitClassic;
function osInjectReturnBar(empresaLabel, sysName) {
  document.getElementById('os-return-bar')?.remove();
  const t = (window.posGetTheme && posGetTheme()) || 'dark';
  const bar = document.createElement('div'); bar.id = 'os-return-bar'; bar.setAttribute('data-theme', t);
  bar.innerHTML = `<div class="osrb-logo" onclick="osExitClassic()" title="Volver al panel">FR</div>
    <div class="osrb-crumb"><a onclick="osExitClassic()">${OS_E(empresaLabel || 'Panel')}</a><span class="sep">›</span><b>${OS_E(sysName || 'Sistema')}</b></div>
    <button class="osrb-back" onclick="osExitClassic()">← Volver</button>
    <button class="osrb-theme" onclick="osReturnBarTheme()" title="Tema claro/oscuro">◐</button>`;
  document.body.appendChild(bar);
}
function osReturnBarTheme() { if (window.posToggleTheme) posToggleTheme(); const b = document.getElementById('os-return-bar'); if (b) b.setAttribute('data-theme', posGetTheme()); if (window.osApplyReskin) osApplyReskin(); }
window.osReturnBarTheme = osReturnBarTheme;

function os404() {
  return `<div class="empty" style="padding:90px 40px"><div style="font-size:54px">🧭</div><h1 style="margin-top:14px">Página no encontrada</h1><div class="sub">La ruta <b>${OS_E(OS.route.path || location.pathname)}</b> no existe en Flipping Rentals OS.</div><button class="cbtn" style="padding:10px 18px;margin-top:8px" data-osnav="/">← Volver al Panel Global</button></div>`;
}

// ─── Cerebro (chat holding) ───
function osSnapshot(comp) {
  return { negocio: 'Rental Profitss (holding: Fix&Flip + Rentas + Remodelación + Educación)', mes: comp.mb.label,
    holding: { capital_ff: Math.round(comp.ff.capital), arv_ff: Math.round(comp.ff.arv), deals_ff: comp.ff.deals, ocupacion_rentas_pct: comp.rentas.occPct, unidades_rentas: comp.rentas.unidades, ingresos_mes_rentas: Math.round(comp.rentas.ingresos), deuda_cobranza: Math.round(comp.cobranza.total) },
    cobranza: comp.cobranza.rows.slice(0, 10),
    reglas: ['all-in ≤75% ARV', 'déficit OK si flujo+ y acumulado <$20k', '15–18% al inversionista, split 50/50', 'buy-out capital+15%', 'refi no supera el pago actual', 'CPI+3–5%', 'depósitos no son renta', 'REGISTRAR LA PLATA REAL, NO EL CONTRATO'],
    insights: osInsights(comp).map(i => ({ tag: i.tag, detalle: i.tx.replace(/<[^>]+>/g, ''), impacto: Math.round(i.impact) })) };
}
function osChatHTML() { return OS.chat.map(m => m.role === 'user' ? `<div class="cbub u">${OS_E(m.content)}</div>` : `<div class="cbub a${m.error ? ' err' : ''}${m.thinking ? ' think' : ''}">${m.thinking ? 'Pensando' : (window.marked && window.DOMPurify ? DOMPurify.sanitize(marked.parse(m.content)) : OS_E(m.content))}</div>`).join(''); }
function osRenderChat() { const el = document.getElementById('os-chat'); if (el) { el.innerHTML = osChatHTML(); el.scrollTop = el.scrollHeight; } }
async function osAsk(q) {
  const inp = document.getElementById('os-ask'); const question = (q || (inp ? inp.value.trim() : '')).trim();
  if (!question || OS.chatBusy) return; if (inp) inp.value = '';
  if (OS.route.view !== 'global') { osNav('/'); await new Promise(r => setTimeout(r, 120)); }
  if (!document.getElementById('os-chat')) return;
  OS.chatBusy = true; OS.chat.push({ role: 'user', content: question }); OS.chat.push({ role: 'assistant', content: '', thinking: true }); osRenderChat();
  const history = OS.chat.filter(m => !m.thinking && !m.error).slice(0, -1).map(m => ({ role: m.role, content: m.content }));
  try {
    const r = await fetch('/api/brain-chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question, snapshot: osSnapshot(osCompute()), history }) });
    const data = await r.json().catch(() => ({})); OS.chat.pop();
    OS.chat.push(r.ok ? { role: 'assistant', content: data.answer || 'Sin respuesta.' } : { role: 'assistant', content: data.error || `Error (HTTP ${r.status}).`, error: true });
  } catch (e) { OS.chat.pop(); OS.chat.push({ role: 'assistant', content: 'No pude conectar: ' + (e.message || e), error: true }); }
  finally { OS.chatBusy = false; osRenderChat(); }
}
window.osAsk = osAsk;

// ─── Charts ───
function osMountCharts(comp) { /* placeholder — los charts del holding se agregan con la Analítica */ }
