// ════════════════════════════════════════════════════════════════
// 🌐 FLIPPING RENTALS OS — shell del ecosistema (global → empresa → app).
// Routing real (History API), 3 niveles + áreas transversales Operación/Contable.
// Diseño Property OS (dark/light vía pos-theme). SOLO LECTURA de datos (Airtable/QuickBooks).
// ════════════════════════════════════════════════════════════════
const OS = { route: { view: 'global' }, loaded: false, loadErr: null, ff: [], draws: [], props: [], units: [], pay: [], book: [], tenants: [], tasks: [], investors: [], remodel: [], edu: null, _charts: [], chat: [] };
window.OS = OS;

const OS_M = n => posMoney(n);              // #10: formato único (exacto con separador)
const OS_K = n => posMoneyK(n);             // #10: formato único (compacto $X.XXM / $XXXk)
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
  'remodelacion': { key: 'remodelacion', name: 'Remodelación', icon: '🔨', tag: 'Obras · estimación · pipeline', apps: [
    { k: 'remodel-pro', name: 'Estimador Pro', icon: '∑', fn: "osOpenApp('remodelacion','remodel-pro')" },
    { k: 'command-center', name: 'Command Center', icon: '◆', fn: "osOpenApp('remodelacion','command-center')" },
    { k: 'planner', name: 'Planner Semanal', icon: '🗓', fn: "osOpenApp('remodelacion','planner')" },
    { k: 'diagnostico', name: 'Diagnóstico de Vivienda', icon: '🏥', ext: true, fn: "window.open('/diagnostico','_blank')" },
    { k: 'airtable', name: 'Airtable Remodelación', icon: '🗂', ext: true, fn: "osOpenLink('Airtable Remodelacion')" },
    { k: 'drive', name: 'Drive · Structure One', icon: '📁', ext: true, fn: "osOpenLink('Drive Compartida')" },
    // Fuera del panel (código intacto, se retoman después): Dashboard de Obras (→ Command Center), Cronograma (queda en Rentas), ClickUp Análisis.
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
  #os-root .osbadge{display:inline-block;font-size:9.5px;font-weight:700;padding:2px 9px;border-radius:20px;margin-top:7px;letter-spacing:.2px}
  #os-root .osbadge.warn{background:rgba(231,182,94,.16);color:var(--amber);border:1px solid rgba(231,182,94,.32)}
  #os-root .osbadge.ok{background:rgba(72,214,156,.14);color:var(--pos);border:1px solid rgba(72,214,156,.3)}
  #os-root .ff-dqx{display:inline-block;font-size:9.5px;font-weight:700;padding:2px 8px;border-radius:20px;background:rgba(240,104,122,.16);color:var(--neg);border:1px solid rgba(240,104,122,.35);white-space:nowrap}
  #os-root .up{color:var(--pos)}#os-root .down{color:var(--neg)}#os-root .warn{color:var(--amber)}
  #os-root .unit{cursor:pointer}#os-root .unit:hover{transform:translateY(-3px);border-color:var(--a2)}
  #os-root .unit .ico{font-size:26px}#os-root .unit .un{font-size:16px;font-weight:700;margin-top:9px}#os-root .unit .ut{font-size:11.5px;color:var(--mut2);margin-top:3px;min-height:30px}
  #os-root .unit .kv{display:flex;justify-content:space-between;font-size:12px;padding:4px 0;border-top:1px solid var(--glassb);margin-top:10px}#os-root .unit .kv b{color:var(--ink)}
  #os-root .card:not(.unit) .kv{display:flex;justify-content:space-between;gap:12px;font-size:12.5px;padding:6px 0;border-top:1px solid var(--glassb)}#os-root .card:not(.unit) .kv:first-of-type{border-top:none}#os-root .card:not(.unit) .kv span{color:var(--mut)}#os-root .card:not(.unit) .kv b{color:var(--ink);text-align:right}
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
  if (seg[0] === 'admin') return { view: 'admin' };
  if (seg[0] === 'casa' && seg[1]) return { view: 'casa', slug: seg[1] };
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
  if (r.view === 'admin') return 'Admin · ' + base;
  if (r.view === 'casa') return 'Ficha de casa · ' + base;
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
    const [ff, draws, props, units, pay, book, tenants, tasks, inv, remodel, edu, ffOh, ffHml, pnl, qbc, qbm, hmlL, cw, ckT, ckS, agP, agReg] = await Promise.all([
      sb.from('ff_deals').select('*').eq('active', true),
      sb.from('ff_draws').select('*'),
      sb.from('pm_properties').select('id,name,zone,rental_model,total_units,property_id,address_normalized,mortgage_monthly').eq('active', true),
      sb.from('pm_units').select('id,property_id,status,target_rent,unit_type,is_active').eq('is_active', true),
      sb.from('pm_payments').select('amount,type,status,property_id,tenant_id,paid_at').eq('active', true).eq('type', 'ingreso').eq('status', 'pagado'),
      sb.from('pm_bookings').select('unit_id,property_id,tenant_id,start_date,end_date,status').eq('active', true),
      sb.from('pm_tenants').select('id,full_name,phone,client_state'),
      sb.from('pm_tasks').select('title,task_type,scheduled_date,zone,assignee,start_at,status,property_id').eq('active', true),
      sb.from('ff_investors').select('*').eq('active', true),
      sb.from('remodel_at_properties').select('address,city,lider,proceso,avance_pct,gasto_materiales,gasto_trabajadores,presupuesto_interno,valor_interno,valor_cliente,ganancia,fecha_inicio,fecha_estimada_fin,fecha_real_fin,dias_transcurridos,desviacion_label,sqft,retraso_dias,monto_por_gastar,rentabilidad,monto_real,avance_real,property_id'),
      sb.from('edu_ceo_snapshot').select('activos,con_plan_activo,nuevos_30d,antiguedad_promedio_dias').eq('mentorship_id', 'flipping-rentals'),
      sb.from('ff_overhead').select('source, monto').eq('active', true).then(r => r.data || []).catch(() => []),
      sb.from('ff_hml_payments').select('pago_hml').eq('active', true).then(r => r.data || []).catch(() => []),
      sb.from('v_holding_pnl').select('*').then(r => r.data || []).catch(() => []),
      sb.from('qb_report_cache').select('empresa, report, label, value').eq('active', true).then(r => r.data || []).catch(() => []),
      sb.from('qb_account_map').select('*').then(r => r.data || []).catch(() => []),
      sb.from('ff_hml_loans').select('monto_hml').eq('active', true).then(r => r.data || []).catch(() => []),
      sb.from('ff_uw_config').select('value').eq('key', 'concil_warn_pct').maybeSingle().then(r => r.data).catch(() => null),
      (async () => { // paginado: PostgREST capa a 1000 filas por request
        const all = []; for (let pg = 0; pg < 8; pg++) {
          const { data } = await sb.from('clickup_tasks_mirror').select('id,name,status,status_type,priority,primary_assignee,due_date,date_done,date_closed,list_name,folder_name,space_id,url,last_synced_at,is_recurring,time_estimate,time_spent').eq('active', true).in('space_id', ['90113866319', '90113866434', '90113866436']).order('id').range(pg * 1000, pg * 1000 + 999);
          all.push(...(data || [])); if (!data || data.length < 1000) break;
        } return all; })().catch(() => []),
      sb.from('clickup_snapshots').select('snapshot_date,total_open,total_overdue,total_closed_last_7d,company_id').order('snapshot_date').then(r => r.data || []).catch(() => []),
      sb.from('agent_proposals').select('*').is('deleted_at', null).eq('estado', 'propuesta').order('created_at', { ascending: false }).limit(60).then(r => r.data || []).catch(() => []),
      sb.from('agent_registry').select('id, nombre').like('nombre', 'Ops%').is('deleted_at', null).then(r => r.data || []).catch(() => []),
    ]);
    OS.pnl = pnl || [];
    OS.qbCache = qbc || []; OS.qbMap = qbm || [];
    OS.hmlTotal = (hmlL || []).reduce((t, x) => t + (+x.monto_hml || 0), 0);
    OS.concilWarn = cw ? +cw.value : 10;
    OS.ckTasks = ckT || []; OS.ckSnaps = ckS || []; OS.agProps = agP || [];
    OS.agIds = {}; (agReg || []).forEach(r => OS.agIds[r.nombre] = r.id);
    OS.ffOverhead = (ffOh || []).reduce((t, x) => t + (+x.monto || 0), 0);
    OS.ffIntereses = (ffHml || []).reduce((t, x) => t + (+x.pago_hml || 0), 0);
    OS.ff = ff.data || []; OS.draws = draws.data || []; OS.props = props.data || []; OS.units = units.data || []; OS.pay = pay.data || [];
    OS.book = book.data || []; OS.tenants = tenants.data || []; OS.tasks = tasks.data || []; OS.investors = inv.data || [];
    OS.remodel = (remodel.data || []).map(o => ({ ...o, avance_pct: (o.avance_real != null ? +o.avance_real : o.avance_pct) })); // avance del Planner si existe OS.edu = (edu.data && edu.data[0]) || null;
    OS.loaded = true;
  } catch (e) { OS.loadErr = e.message || String(e); }
}

// ════════════════════════════════════════════════════════════════
// CÁLCULO (KPIs del holding, por empresa, cobranza)
// ════════════════════════════════════════════════════════════════
const OS_INDEP = ['casa_completa', 'apartamento', 'estudio'];
function osUnitState(u) { const s = (u.status || '').toLowerCase(); if (/mantenim/.test(s)) return 'mant'; if (/ocupad/.test(s)) return 'ocupada'; if (/reservad/.test(s)) return 'reservada'; return 'libre'; }
function osMonthBounds() { const d = new Date(); const y = d.getUTCFullYear(), m = d.getUTCMonth(); const py = m === 0 ? y - 1 : y, pm = m === 0 ? 12 : m; const mm = String(pm).padStart(2, '0'); const last = new Date(Date.UTC(py, pm, 0)).getUTCDate(); const MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']; return { from: `${py}-${mm}-01`, to: `${py}-${mm}-${String(last).padStart(2, '0')}`, label: `${MES[pm - 1]} ${py}` }; }
// Indicador de COMPLETITUD DE CARGA del mes (mismo criterio que PM): nº de pagos cargados vs
// promedio de meses previos → un número bajo se lee como carga incompleta, no como mal mes.
function osYmShift(ym, delta) { const y = +ym.slice(0, 4), m = +ym.slice(5, 7) - 1 + delta; const dt = new Date(y, m, 1); return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`; }
function osMonthLoadInfo(ym) {
  const cnt = yy => OS.pay.filter(p => (p.paid_at || '').startsWith(yy)).length;
  const n = cnt(ym); const priors = []; for (let i = 1; i <= 3; i++) { const c = cnt(osYmShift(ym, -i)); if (c > 0) priors.push(c); }
  const avg = priors.length ? priors.reduce((s, x) => s + x, 0) / priors.length : 0;
  const nowd = new Date(); const curYm = `${nowd.getFullYear()}-${String(nowd.getMonth() + 1).padStart(2, '0')}`;
  const enCurso = ym === curYm; const incompleto = enCurso || (avg > 0 && n < avg * 0.7);
  return { count: n, avg: Math.round(avg), incompleto, enCurso };
}
function osMonthBadge(ym) {
  const i = osMonthLoadInfo(ym); const nota = i.enCurso ? 'en curso' : i.incompleto ? 'carga en progreso' : 'carga completa';
  const avgTxt = (i.avg && i.incompleto && !i.enCurso) ? ` · prom. previo ${i.avg}` : '';
  return `<span class="osbadge ${i.incompleto ? 'warn' : 'ok'}">${i.count} pagos cargados · ${nota}${avgTxt}</span>`;
}
// Conteo de alertas Fix & Flip con las MISMAS reglas que el FF Command Center (ffInsights) →
// una sola fuente por métrica. Mantener en sync con ff-command-center.js · ffInsights.
function osFFAlertCount(deals) {
  let n = 0;
  n += deals.filter(d => d.dr && Number(d.dr.remodel_internal) > Number(d.remodel_est || 0) * 2 && Number(d.dr.remodel_internal) >= 100000).length; // error de datos
  n += deals.filter(d => Number(d.appraisal) > 0 && d.arv > 0 && Number(d.appraisal) > d.arv * 1.05).length; // appraisal > ARV
  n += deals.filter(d => d.deficit < -20000 && !(d.dr && Number(d.dr.remodel_internal) >= 100000)).length; // déficit > $20k
  n += Math.min(4, deals.filter(d => d.stage !== 'vendida' && d.arv > 0 && d.allInPct > 0.78 && d.allIn > 0).length); // all-in > 78% ARV (máx 4)
  if (deals.filter(d => !d.dr && d.stage !== 'vendida').length) n += 1; // deals sin draws
  n += 3; // conocidos del negocio: overhead + gap intereses + contrato Childress
  return n;
}
function osCompute() {
  // FIX & FLIP
  // MISMA fórmula que el Fix & Flip Command Center (ffCompute) — una sola fuente por métrica.
  // all-in = compra + remodelación(draws) + holding(draws); si no hay draw → remodel_est×1.3 (proxy).
  const drawByNorm = {}; OS.draws.forEach(dr => { drawByNorm[dr.address_norm] = dr; });
  const ff = OS.ff.map(d => {
    const dr = drawByNorm[d.address_norm] || null;
    const arv = Number(d.arv || 0);
    const remComplete = dr ? Number(dr.remodel_complete || 0) : Number(d.remodel_est || 0) * 1.3;
    const holding = dr ? (Number(dr.interest_hml || 0) + Number(dr.services_hml || 0) + Number(dr.interest_until_rent || 0) + Number(dr.furniture || 0) + Number(dr.other_costs || 0)) : 0;
    const allIn = Number(d.purchase_price || 0) + remComplete + holding;
    const allInPct = arv ? allIn / arv : 0;
    const deficit = dr ? Number(dr.net_total || 0) : 0;
    const dq = (typeof ffDataQuality === 'function') ? ffDataQuality({ allIn, arv, allInPct, stage: d.stage }) : { revisar: false, sinDatos: false, preliminar: false, confiable: true, flags: [] };
    return { ...d, dr, arv, remComplete, holding, allIn, allInPct, deficit, dq };
  });
  const ffActive = ff.filter(d => d.stage !== 'vendida');
  const ffCapital = ffActive.reduce((s, d) => s + d.allIn, 0);
  const ffArv = ff.reduce((s, d) => s + d.arv, 0);
  const ffAlertas = osFFAlertCount(ff);
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
    ff: { deals: ff.length, activos: ffActive.length, capital: ffCapital, arv: ffArv, alertas: ffAlertas, list: ff },
    rentas: { casas: OS.props.length, unidades: totalU, ocupadas: occU, occPct, ingresos: rentInc },
    cobranza,
    holding: { capital: ffCapital, arv: ffArv, unidades: totalU + ff.length, ingresosMes: rentInc, deudaCobranza: cobranza.total },
    remodel: (() => {
      const fin = OS.remodel.filter(o => o.proceso === 'Finalizado');
      const curso = OS.remodel.filter(o => o.proceso !== 'Finalizado');
      const a = OS.remodel.map(o => Number(o.avance_pct || 0)).filter(x => x > 0);
      return {
        obras: OS.remodel.length,
        activas: curso.length,
        avance: a.length ? Math.round(a.reduce((s, x) => s + x, 0) / a.length) : 0,
        // DATA-GUARD (#2): la utilidad de obras en curso es PROYECTADA, no final → separada.
        gananciaFinal: fin.reduce((s, o) => s + Number(o.ganancia || 0), 0),
        gananciaEnCurso: curso.reduce((s, o) => s + Number(o.ganancia || 0), 0),
        enCursoN: curso.length,
      };
    })(),
    educacion: OS.edu ? { activos: Number(OS.edu.activos || 0), conPlan: Number(OS.edu.con_plan_activo || 0), nuevos: Number(OS.edu.nuevos_30d || 0), antiguedad: Math.round(Number(OS.edu.antiguedad_promedio_dias || 0)) } : null,
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
  try { const cf = osConcilFF(); const warn = (OS.concilWarn != null ? OS.concilWarn : 10) / 100;
    if (cf.aporteQB != null && Math.abs(cf.aporteOS - cf.aporteQB) / Math.max(cf.aporteQB, 1) > warn * 0.5) ins.push({ sev: 'warning', impact: Math.abs(cf.aporteOS - cf.aporteQB), tag: 'CONCILIACIÓN · APORTES', tx: `Aporte de inversionistas: OS <b>${OS_M(cf.aporteOS)}</b> vs QBO <b>${OS_M(cf.aporteQB)}</b> (Δ ${OS_M(cf.aporteOS - cf.aporteQB)}). Conciliar Investor Contributions.` });
    if (cf.deudaQB != null && Math.abs(cf.deudaOS - cf.deudaQB) / Math.max(cf.deudaQB, 1) > warn * 0.5) ins.push({ sev: 'warning', impact: Math.abs(cf.deudaOS - cf.deudaQB), tag: 'CONCILIACIÓN · DEUDA HML', tx: `Deuda de préstamos: OS <b>${OS_M(cf.deudaOS)}</b> vs QBO <b>${OS_M(cf.deudaQB)}</b> (Δ ${OS_M(cf.deudaOS - cf.deudaQB)}).` });
  } catch (e) {}
  if (OS.ffOverhead > 0) ins.push({ sev: 'info', impact: Math.round(OS.ffOverhead), tag: 'CONTABLE · OVERHEAD FF', tx: `Overhead Fix&Flip real: <b>${OS_M(OS.ffOverhead)}</b> (equipo + plataformas, espejo Airtable). Restar para P&L neto.` });
  if (OS.ffIntereses > 0) ins.push({ sev: 'info', impact: Math.round(OS.ffIntereses), tag: 'CONTABLE · INTERESES HML', tx: `Intereses HML pagados (reales): <b>${OS_M(OS.ffIntereses)}</b>.` });
  const rank = { critical: 0, warning: 1, info: 3 };
  ins.sort((a, b) => (rank[a.sev] - rank[b.sev]) || (b.impact - a.impact));
  return ins;
}

// ════════════════════════════════════════════════════════════════
// ACCESO (gating por role + allowed_areas del profile — slugs canónicos:
// fix-flip, remodelacion, rentas, operacion, contable, education).
// El front esconde lo no permitido; el enforcement REAL es RLS en la DB.
// ════════════════════════════════════════════════════════════════
function osRole() { try { return (state && state.role) || 'viewer'; } catch (e) { return 'viewer'; } }
function osAreasAllowed() { try { return (state && state.allowedAreas) || []; } catch (e) { return []; } }
function osCanArea(k) { return osRole() === 'admin' || osAreasAllowed().includes(k); }
window.osCanArea = osCanArea;
// área requerida por ruta (empresa usa OS_EMPRESAS[].key; casa = cualquiera de las 3 de la casa)
function osRouteGuard(r) {
  if (r.view === 'admin') return osRole() === 'admin' ? null : 'admin';
  let need = null;
  if (r.view === 'operacion') need = ['operacion'];
  else if (r.view === 'contable') need = ['contable'];
  else if ((r.view === 'empresa' || r.view === 'app') && OS_EMPRESAS[r.empresa]) need = [OS_EMPRESAS[r.empresa].key];
  else if (r.view === 'casa') need = ['fix-flip', 'rentas', 'remodelacion'];
  if (need && !need.some(osCanArea)) return need[0];
  return null;
}
function osNoAccess(what) {
  const lbl = what === 'admin' ? 'el Panel de Admin (solo administradores)' : 'esta sección';
  return `<div class="empty"><div style="font-size:40px">🔒</div><div style="margin-top:10px">No tenés acceso a ${OS_E(lbl)}.</div><div class="meta" style="margin-top:6px">Pedile a un admin que te asigne el área en el Panel de Admin.</div><button class="cbtn" style="margin-top:14px" data-osnav="/">← Volver al inicio</button></div>`;
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
  const guard = osRouteGuard(OS.route);
  if (guard) { root.innerHTML = osShell(osNoAccess(guard)); return; }
  const comp = osCompute();
  const view = { global: osGlobal, empresa: osEmpresa, operacion: osOperacion, contable: osContable, admin: (window.osAdminView || os404), app: osAppView, casa: osCasa, '404': os404 }[OS.route.view] || osGlobal;
  root.innerHTML = osShell(view(comp));
  requestAnimationFrame(() => osMountCharts(comp));
}
window.osRender = osRender;
function osCrumbs() {
  const r = OS.route; const parts = [`<a data-osnav="/">Global</a>`];
  if (r.view === 'operacion') parts.push('<span class="sep">/</span><b>⚙️ Operación</b>');
  else if (r.view === 'contable') parts.push('<span class="sep">/</span><b>📒 Contable</b>');
  else if (r.view === 'admin') parts.push('<span class="sep">/</span><b>🛡 Admin</b>');
  else if (r.empresa) { const e = OS_EMPRESAS[r.empresa]; parts.push(`<span class="sep">/</span>${r.view === 'empresa' ? `<b>${e.icon} ${e.name}</b>` : `<a data-osnav="/${r.empresa}">${e.icon} ${e.name}</a>`}`); if (r.app) parts.push(`<span class="sep">/</span><b>${OS_E(r.app)}</b>`); }
  return parts.join(' ');
}
function osShell(inner) {
  return `<div class="bgfx"></div><div class="wrap">
    <div class="bar"><div class="logo" data-osnav="/" style="cursor:pointer">FR</div><div class="brandt"><b>Flipping Rentals OS</b><span>RENTAL PROFITSS · HOLDING</span></div>
      <div class="crumbs">${osCrumbs()}</div>
      <div class="barr">${osRole() === 'admin' ? '<button class="ibtn" data-osnav="/admin" title="Usuarios, roles y accesos">🛡 Admin</button>' : ''}<button class="ibtn" onclick="osToggleTheme()" title="Tema claro/oscuro">◐</button></div>
    </div>${inner}</div>`;
}
function osOpenAdmin() { const root = document.getElementById('os-root'); if (root) root.style.display = 'none'; if (window.toast) toast('Panel clásico (sistemas/áreas). Volvé al OS con el logo de la esquina o recargando /', 'info', { duration: 4000 }); }
window.osOpenAdmin = osOpenAdmin;

// ─── NIVEL 1 · GLOBAL (macro del holding) ───
function osGlobal(comp) {
  const insights = osInsights(comp); const h = comp.holding;
  const isAdm = osRole() === 'admin';
  const unitCard = (slug, e, extra) => osCanArea(e.key) ? `<div class="card unit" data-osnav="/${slug}"><div class="ico">${e.icon}</div><div class="un">${e.name}</div><div class="ut">${e.tag}</div>${extra}<div class="go">Abrir ${e.name} →</div></div>` : '';
  // KPIs macro por área: cada tarjeta solo si el usuario tiene el área (admin ve todo)
  const kpis = [
    osCanArea('fix-flip') ? `<div class="card"><div class="lab">Capital desplegado (F&F)</div><div class="big glow">${OS_M(h.capital)}</div><div class="meta">${comp.ff.activos} deals activos · ARV ${OS_K(comp.ff.arv)}</div></div>` : '',
    osCanArea('rentas') ? `<div class="card"><div class="lab">Ocupación Rentas</div><div class="big">${comp.rentas.occPct}%</div><div class="meta">${comp.rentas.ocupadas}/${comp.rentas.unidades} unidades · ${comp.rentas.casas} casas</div></div>` : '',
    osCanArea('rentas') ? `<div class="card"><div class="lab">Ingresos del mes · ${comp.mb.label}</div><div class="big up">${OS_M(comp.rentas.ingresos)}</div><div class="meta">plata real cobrada (rentas)</div>${osMonthBadge(comp.mb.from.slice(0, 7))}</div>` : '',
    (osCanArea('operacion') || osCanArea('rentas')) ? `<div class="card"><div class="lab">Deuda de cobranza</div><div class="big down">${OS_M(h.deudaCobranza)}</div><div class="meta">contrato − plata real · ${comp.cobranza.rows.length} casas</div></div>` : '',
  ].join('');
  const areaCards = [
    osCanArea('operacion') ? `<div class="card unit" data-osnav="/operacion"><div class="ico">⚙️</div><div class="un">Operación</div><div class="ut">${OS_AREAS.operacion.tag}</div><div class="kv"><span>Deuda cobranza</span><b class="down">${OS_K(h.deudaCobranza)}</b></div><div class="go">Abrir →</div></div>` : '',
    osCanArea('contable') ? `<div class="card unit" data-osnav="/contable"><div class="ico">📒</div><div class="un">Contable</div><div class="ut">${OS_AREAS.contable.tag}</div><div class="kv"><span>Overhead FF real</span><b class="warn">${OS_M(OS.ffOverhead || 0)}</b></div><div class="go">Abrir →</div></div>` : '',
  ].join('');
  // Cerebro del Holding = transversal (mezcla datos de todas las empresas) → solo admin
  const brain = isAdm ? `<div class="card brain"><div class="bh"><div class="orb"></div><div><b>Cerebro del Holding</b><span>ANÁLISIS TRANSVERSAL · REGLAS</span></div></div>
        ${insights.slice(0, 5).map(i => `<div class="insight"><div class="ic ${i.sev === 'critical' ? 'r' : i.sev === 'warning' ? 'y' : 'b'}">●</div><div class="tx">${i.tx}<span class="tag">${i.tag}${i.impact ? ' · ' + OS_M(i.impact) : ''}</span></div></div>`).join('')}
        <div class="ask"><input id="os-ask" placeholder="Preguntá al Cerebro del holding…" onkeydown="if(event.key==='Enter')osAsk()"><button onclick="osAsk()">Enviar</button></div>
        <div id="os-chat" class="cc-chat"></div>
      </div>` : '';
  return `<h1>Panel <span>Global</span> · Rental Profitss</h1><div class="sub">${isAdm ? 'Vista macro del holding — todas las empresas y áreas en un solo lugar.' : 'Tus áreas del holding.'} Los datos fluyen desde Airtable + QuickBooks (solo lectura).</div>
    <div class="grid k4">${kpis}</div>
    <div class="grid ${brain ? 'k2' : 'k2'}" style="margin-top:16px">
      <div><div class="grid k2 units">
        ${unitCard('fix-and-flip', OS_EMPRESAS['fix-and-flip'], `<div class="kv"><span>Capital</span><b>${OS_K(comp.ff.capital)}</b></div><div class="kv"><span>Deals</span><b>${comp.ff.deals}</b></div>`)}
        ${unitCard('rentas', OS_EMPRESAS['rentas'], `<div class="kv"><span>Ocupación</span><b>${comp.rentas.occPct}%</b></div><div class="kv"><span>Ingresos/mes</span><b>${OS_K(comp.rentas.ingresos)}</b></div>`)}
        ${unitCard('remodelacion', OS_EMPRESAS['remodelacion'], `<div class="kv"><span>Obras activas</span><b>${comp.remodel.activas}</b></div><div class="kv"><span>Avance prom.</span><b>${comp.remodel.avance}%</b></div>`)}
        ${unitCard('educacion', OS_EMPRESAS['educacion'], `<div class="kv"><span>Alumnos activos</span><b>${comp.educacion ? comp.educacion.activos : '—'}</b></div><div class="kv"><span>Nuevos (30d)</span><b>${comp.educacion ? comp.educacion.nuevos : '—'}</b></div>`)}
      </div>
      <div class="grid k2" style="margin-top:16px">${areaCards}</div></div>
      ${brain}
    </div>`;
}

// ─── NIVEL 2 · EMPRESA ───
function osEmpresa(comp) {
  const e = OS_EMPRESAS[OS.route.empresa]; const emp = OS.route.empresa;
  const isFF = emp === 'fix-and-flip', isR = emp === 'rentas', isRemo = emp === 'remodelacion', isEdu = emp === 'educacion';
  const kpis = isFF ? [['Deals activos', comp.ff.activos, `de ${comp.ff.deals} totales`], ['Capital desplegado', OS_M(comp.ff.capital), 'all-in (compra+remod+holding)'], ['ARV portafolio', OS_M(comp.ff.arv), ''], ['Alertas', comp.ff.alertas || '—', 'mismo conteo que el Command Center']]
    : isR ? [['Ocupación', comp.rentas.occPct + '%', `${comp.rentas.ocupadas}/${comp.rentas.unidades}`], ['Ingresos/mes', OS_M(comp.rentas.ingresos), comp.mb.label], ['Casas', comp.rentas.casas, ''], ['Deuda cobranza', OS_M(comp.cobranza.total), 'contrato − real']]
    : isRemo ? [['Obras activas', comp.remodel.activas, `de ${comp.remodel.obras} totales`], ['Avance promedio', comp.remodel.avance + '%', 'de las obras'], ['Utilidad finalizadas', OS_M(comp.remodel.gananciaFinal), 'realizada (obras terminadas)'], ['En curso (proyectado)', OS_M(comp.remodel.gananciaEnCurso), `${comp.remodel.enCursoN} obras · NO final`]]
    : isEdu ? (comp.educacion ? [['Alumnos activos', comp.educacion.activos, `${comp.educacion.conPlan} con plan`], ['Nuevos (30d)', comp.educacion.nuevos, ''], ['Antigüedad prom.', comp.educacion.antiguedad + 'd', 'en el programa'], ['Con plan activo', comp.educacion.conPlan, `de ${comp.educacion.activos}`]] : [['Sin datos', '—', 'no hay snapshot de educación cargado']])
    : [['—', '—', 'datos próximamente']];
  return `<h1>${e.icon} ${e.name} <span>· Empresa</span></h1><div class="sub">${e.tag}</div>
    <div class="grid k4">${kpis.map(k => `<div class="card"><div class="lab">${k[0]}</div><div class="big">${k[1]}</div><div class="meta">${k[2]}</div></div>`).join('')}</div>
    <div class="chart-h" style="margin:24px 4px 12px"><div class="t">Apps de ${e.name}</div><div class="k">clic para abrir</div></div>
    <div class="grid k3">${e.apps.map(a => `<div class="card app-card" ${a.soon ? '' : `onclick="${a.fn}"`}><div class="ai">${a.icon}</div><div style="flex:1"><div class="an">${a.name}</div><div class="at">${a.soon ? 'Fase 2' : 'Abrir app'}</div></div>${a.soon ? '<span class="soon">pronto</span>' : ''}</div>`).join('')}</div>`;
}

// ─── ÁREA · OPERACIÓN ───
function osOperacion(comp) { return opsPanel(comp); }
function osDraftCobro(casa, deuda) { osAsk(`Redactá un mensaje de cobro cordial pero firme para el inquilino de ${casa}, que debe ${OS_M(deuda)} este mes. Recordale el saldo, ofrecé un plan si hace falta, y pedí confirmación de pago. Español neutro.`); }
window.osDraftCobro = osDraftCobro;

// ─── ÁREA · CONTABLE ───
function osContable(comp) {
  const capRows = OS.investors.filter(x => !/flipping\s*rentals/i.test(x.name || '')); // sin la propia empresa (18, no 19)
  return `<h1>📒 Contable <span>· QuickBooks + Conciliación</span></h1><div class="sub">P&L / balance / cashflow de QuickBooks, conciliación Airtable↔QuickBooks y cap table de inversionistas.</div>
    <div class="grid k4">
      <div class="card"><div class="lab">Ingresos rentas (mes)</div><div class="big up">${OS_M(comp.rentas.ingresos)}</div><div class="meta">plata real cobrada · ${comp.mb.label}</div>${osMonthBadge(comp.mb.from.slice(0, 7))}</div>
      <div class="card"><div class="lab">Overhead FF real</div><div class="big warn">${OS_M(OS.ffOverhead || 0)}</div><div class="meta">equipo + plataformas F&F (Airtable)</div></div>
      <div class="card"><div class="lab">Intereses HML reales</div><div class="big warn">${OS_M(OS.ffIntereses || 0)}</div><div class="meta">pagos fechados (Airtable)</div></div>
      <div class="card"><div class="lab">Deuda de cobranza</div><div class="big down">${OS_M(comp.cobranza.total)}</div><div class="meta">por cobrar (rentas)</div></div>
    </div>
    <div class="card" style="margin-top:16px"><div class="chart-h"><div class="t">P&L del holding (v_holding_pnl)</div><div class="k">una definición por métrica · fuente: espejos verificados</div></div>
      <table class="ptable"><thead><tr><th>Empresa</th><th>Ingreso</th><th>Costo real</th><th>Overhead</th><th>Utilidad bruta</th><th>EBITDA</th><th>FF realizado / inyectado</th></tr></thead><tbody>
      ${(OS.pnl || []).map(r => {
        const nm = { remodelacion: '🔨 Remodelación', fix_flip: '🏚 Fix & Flip', rentas: '🏠 Rentas', educacion: '🎓 Educación', consolidado: '🏛 CONSOLIDADO' }[r.empresa] || r.empresa;
        const v = x => x == null ? '—' : OS_M(+x);
        const cls = x => x == null ? '' : (+x >= 0 ? 'up' : 'down');
        const ffx = (r.realizado == null && r.inyectado == null) ? '—' : (v(r.realizado) + ' / ' + v(r.inyectado));
        const bold = r.empresa === 'consolidado' ? 'font-weight:800;border-top:1px solid var(--line, rgba(255,255,255,.2))' : '';
        return `<tr style="${bold}"><td>${nm}</td><td>${v(r.ingreso)}</td><td>${v(r.costo_real)}</td><td class="down">${v(r.overhead)}</td><td class="${cls(r.utilidad_bruta)}">${v(r.utilidad_bruta)}</td><td class="${cls(r.ebitda)}">${v(r.ebitda)}</td><td>${ffx}</td></tr>`;
      }).join('')}
      </tbody></table>
      <div class="meta" style="margin-top:8px">FF: "realizado" = casas con ciclo cerrado (vendida/refi/rentada); "inyectado" = cash en casas vivas (no es pérdida realizada).</div>
    </div>
    ${osConcilBlock(comp)}
    <div class="grid k2" style="margin-top:16px">
      <div class="card"><div class="chart-h"><div class="t">Conciliación Airtable ↔ QuickBooks</div><div class="k">SOLO LECTURA</div></div>
        <table class="ptable"><thead><tr><th>Concepto</th><th>Estado</th><th>Impacto</th></tr></thead><tbody>
        <tr><td>Overhead FF (equipo + plataformas) — espejo Airtable</td><td><span class="badge b-ok">Real</span></td><td class="down">${OS_M(OS.ffOverhead || 0)}</td></tr>
        <tr><td>Intereses HML pagados (reales, fechados)</td><td><span class="badge b-ok">Real</span></td><td class="down">${OS_M(OS.ffIntereses || 0)}</td></tr>
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
// ════════════════════════════════════════════════════════════════
// 🏠 FICHA DE CASA — una vista por propiedad que une el ciclo de vida entre empresas (pilar #5).
//   Unión por DIRECCIÓN NORMALIZADA (address_norm == address_normalized; remodel se normaliza igual).
// ════════════════════════════════════════════════════════════════
function osHouseKey(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
function osSlug(addr) { return String(addr || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
window.osSlug = osSlug;
const OS_STAGE_LBL = { adquirida: 'Adquirida', en_rehab: 'En rehab', en_venta: 'En venta', rentada: 'Rentada', refinanciada: 'Refinanciada', vendida: 'Vendida' };
function osOpenFicha(slug) {
  if (!slug) return;
  // cerrar overlays (CC/FF) y el sistema clásico (PM/Remodel) si están abiertos como página
  try { document.getElementById('ff-overlay')?.remove(); document.getElementById('cc-overlay')?.remove(); document.getElementById('rc-overlay')?.remove(); if (window.FF) FF.sys = null; } catch (e) {}
  try {
    OS._classicOpen = false;
    document.getElementById('os-return-bar')?.remove();
    const m = document.getElementById('modal'); if (m) { m.classList.remove('os-syspage'); if (!m.classList.contains('hidden')) m.classList.add('hidden'); }
    const app = document.getElementById('app'); if (app) app.style.visibility = '';
  } catch (e) {}
  const root = document.getElementById('os-root'); if (root) root.style.display = '';
  osNav('/casa/' + slug);
}
window.osOpenFicha = osOpenFicha;
function osCasaMatch(slug, comp) {
  const key = osHouseKey(slug);
  // Ancla: la casa de Rentas por slug; luego FF/Remodel por property_id (llave canónica), fallback dirección.
  const prop = (OS.props || []).find(p => osHouseKey(p.address_normalized || p.name) === key) || null;
  const pid = prop && prop.property_id;
  const ff = (pid && (comp.ff.list || []).find(d => d.property_id === pid))
    || (comp.ff.list || []).find(d => osHouseKey(d.address_norm || d.address) === key) || null;
  const remodel = (pid && (OS.remodel || []).find(r => r.property_id === pid))
    || (OS.remodel || []).find(r => osHouseKey(r.address) === key) || null;
  const addr = (ff && ff.address) || (remodel && remodel.address) || (prop && prop.name) || slug;
  let rentas = null;
  if (prop) {
    const mb = comp.mb;
    const us = OS.units.filter(u => u.property_id === prop.id);
    const indep = us.filter(u => OS_INDEP.includes(u.unit_type));
    const rooms = us.filter(u => u.unit_type === 'habitacion');
    const hasR = rooms.length ? 1 : 0;
    const totalU = indep.length + hasR;
    const occU = indep.filter(u => osUnitState(u) === 'ocupada').length + (hasR && rooms.some(u => osUnitState(u) === 'ocupada') ? 1 : 0);
    const occRent = us.filter(u => osUnitState(u) === 'ocupada').reduce((s, u) => s + Number(u.target_rent || 0), 0);
    const cobrado = OS.pay.filter(x => x.property_id === prop.id && x.paid_at >= mb.from && x.paid_at <= mb.to).reduce((s, x) => s + Number(x.amount || 0), 0);
    rentas = { prop, totalU, occU, occPct: totalU ? Math.round(occU / totalU * 100) : 0, occRent: Math.round(occRent), cobrado: Math.round(cobrado), deuda: Math.round(Math.max(0, occRent - cobrado)) };
  }
  return { key, slug, addr, ff, remodel, prop, rentas };
}
function osCasaInsights(m) {
  const ins = [];
  if (m.ff && m.ff.dq && m.ff.dq.revisar) ins.push({ s: 'r', t: `Error de datos: all-in ${OS_M(m.ff.allIn)} = ${Math.round(m.ff.allInPct * 100)}% del ARV (imposible). Revisar la carga en Airtable (Draws).` });
  if (m.ff && m.ff.dq && m.ff.dq.confiable && m.ff.deficit < -20000) ins.push({ s: 'r', t: `Déficit de ${OS_M(-m.ff.deficit)} (regla: OK si flujo+ y acumulado < $20k). Planear recuperación (refi/venta).` });
  if (m.ff && Number(m.ff.appraisal) > 0 && m.ff.arv > 0 && Number(m.ff.appraisal) > m.ff.arv * 1.05) ins.push({ s: 'y', t: `Appraisal ${OS_M(m.ff.appraisal)} supera el ARV ${OS_M(m.ff.arv)} — revisar (afecta refi y equity).` });
  if (m.remodel && m.remodel.proceso !== 'Finalizado') ins.push({ s: 'y', t: `Obra EN CURSO (${OS_E(m.remodel.proceso || 's/estado')}, ${Math.round(Number(m.remodel.avance_pct || 0))}% avance) — la utilidad de remodelación es preliminar, no final.` });
  if (m.rentas && m.rentas.deuda > 200) ins.push({ s: 'r', t: `Deuda de cobranza ${OS_M(m.rentas.deuda)} este mes (esperado ${OS_M(m.rentas.occRent)}, cobrado ${OS_M(m.rentas.cobrado)}).` });
  if (/childress/i.test(m.addr)) ins.push({ s: 'y', t: `Contrato/documentación pendiente de firma (dato del negocio). Verificar antes de avanzar.` });
  return ins;
}
function osCasa(comp) {
  const m = osCasaMatch(OS.route.slug, comp);
  const kv = (l, v, cls) => `<div class="kv"><span>${l}</span><b class="${cls || ''}">${v}</b></div>`;
  if (!m.ff && !m.remodel && !m.rentas) {
    return `<div class="empty" style="padding:80px 40px"><div style="font-size:48px">🏚️</div><h1 style="margin-top:12px">Casa no encontrada</h1><div class="sub">No hay datos para <b>${OS_E(OS.route.slug)}</b> en Fix & Flip, Remodelación ni Rentas.</div><button class="cbtn" style="padding:10px 18px" data-osnav="/">← Volver al Panel Global</button></div>`;
  }
  const stageK = m.ff ? m.ff.stage : (m.remodel && m.remodel.proceso === 'Finalizado' ? 'refinanciada' : (m.remodel ? 'en_rehab' : (m.rentas ? 'rentada' : null)));
  const stageLbl = m.ff ? (OS_STAGE_LBL[m.ff.stage] || m.ff.stage) : (m.remodel ? m.remodel.proceso : (m.rentas ? 'Rentada' : '—'));
  const strat = m.ff ? (m.ff.strategy === 'flip' ? 'FLIP' : m.ff.strategy === 'hold' ? 'HOLD' : '') : '';
  const dqBadge = (m.ff && m.ff.dq && m.ff.dq.revisar) ? `<span class="ff-dqx">⚠ dato a revisar</span>` : '';
  const insights = osCasaInsights(m);
  const remoEnCurso = m.remodel && m.remodel.proceso !== 'Finalizado';
  const remoMat = m.remodel ? Number(m.remodel.gasto_materiales || 0) : 0, remoLab = m.remodel ? Number(m.remodel.gasto_trabajadores || 0) : 0;
  const remoR = m.remodel || {};
  const remoGasto = remoMat + remoLab;
  const remoPresup = Number(remoR.presupuesto_interno || 0);
  const remoReal = Number(remoR.monto_real || 0) || remoGasto;
  const remoPctGast = remoPresup > 0 ? Math.round(remoReal / remoPresup * 100) : 0;
  const remoRent = remoR.rentabilidad != null ? Number(remoR.rentabilidad) : null;
  const remoRetraso = remoR.retraso_dias != null ? Number(remoR.retraso_dias) : null;
  const remoDraws = Number(remoR.valor_cliente || 0);
  const remoUtil = Number(remoR.ganancia || 0);
  const _finR = (OS.remodel || []).filter(o => o.proceso === 'Finalizado');
  const _tm = _finR.reduce((s, o) => s + Number(o.gasto_materiales || 0), 0), _tl = _finR.reduce((s, o) => s + Number(o.gasto_trabajadores || 0), 0);
  const matRatio = (_tm + _tl) > 0 ? _tm / (_tm + _tl) : 0.47;
  const estMat = remoPresup * matRatio, estLab = remoPresup * (1 - matRatio);
  const devPct = (est, real) => est > 0 ? Math.round((real - est) / est * 100) : null;
  const devBadge = (est, real) => { const d = devPct(est, real); return d == null ? '' : ` <span style="font-size:10px;color:${d > 5 ? 'var(--neg)' : d < -5 ? 'var(--pos)' : 'var(--mut)'}">(${d > 0 ? '+' : ''}${d}%)</span>`; };
  // etapas del ciclo (barra)
  const cycle = ['Adquirida', 'En rehab', 'Venta/Renta', 'Refi/Salida'];
  const cyIdx = m.ff ? ({ adquirida: 0, en_rehab: 1, en_venta: 2, rentada: 2, refinanciada: 3, vendida: 3 }[m.ff.stage] ?? 0) : (remoEnCurso ? 1 : (m.rentas ? 2 : 3));
  return `<h1>🏠 ${OS_E(ffShortAddr(m.addr))} <span>· Ficha de casa</span></h1>
    <div class="sub">${OS_E(m.addr)} — ciclo de vida de la casa a través de las empresas (Fuente: Airtable en vivo).</div>
    <div class="grid k4">
      <div class="card"><div class="lab">Etapa actual</div><div class="big" style="font-size:20px">${stageLbl}</div><div class="meta">${strat ? strat + ' · ' : ''}${m.ff ? 'Fix & Flip' : m.remodel ? 'Remodelación' : 'Rentas'} ${dqBadge}</div></div>
      <div class="card"><div class="lab">All-in</div><div class="big">${m.ff ? OS_M(m.ff.allIn) : '—'}</div><div class="meta">${m.ff ? Math.round(m.ff.allInPct * 100) + '% del ARV' : 'sin deal F&F'}</div></div>
      <div class="card"><div class="lab">ARV</div><div class="big">${m.ff && m.ff.arv ? OS_M(m.ff.arv) : '—'}</div><div class="meta">${m.ff && m.ff.appraisal ? 'appraisal ' + OS_M(m.ff.appraisal) : ''}</div></div>
      <div class="card"><div class="lab">${m.ff && m.ff.deficit < 0 ? 'Déficit' : 'Margen/Equity'}</div><div class="big ${m.ff && m.ff.deficit < 0 ? 'down' : 'up'}">${m.ff ? (m.ff.deficit < 0 ? OS_M(m.ff.deficit) : OS_M(m.ff.arv - m.ff.allIn)) : '—'}</div><div class="meta">${m.ff && m.ff.dq && !m.ff.dq.confiable ? 'no confiable' : m.ff ? 'ARV − all-in' : ''}</div></div>
    </div>
    <div class="chart-h" style="margin:22px 4px 6px"><div class="t">Ciclo de vida</div><div class="k">${cycle.map((c, i) => `<span style="color:${i <= cyIdx ? 'var(--a1)' : 'var(--mut2)'}">${i <= cyIdx ? '●' : '○'} ${c}</span>`).join(' → ')}</div></div>
    <div class="grid k2" style="margin-top:12px">
      <div class="card"><div class="chart-h"><div class="t">🏗️ Fix & Flip</div>${m.ff ? `<a class="go" style="cursor:pointer" onclick="osOpenApp('fix-and-flip','deals')">Abrir Deals →</a>` : ''}</div>
        ${m.ff ? `${kv('Compra', OS_M(m.ff.purchase))}${kv('Remodelación (est/draws)', OS_M(m.ff.remComplete))}${kv('Holding', OS_M(m.ff.holding))}${kv('All-in', OS_M(m.ff.allIn), m.ff.dq.revisar ? 'down' : '')}${kv('ARV', OS_M(m.ff.arv))}${kv('Appraisal', m.ff.appraisal ? OS_M(m.ff.appraisal) : '—')}${kv('MAO (ARV×75% − costos)', OS_M(m.ff.arv * 0.75 - m.ff.remComplete - m.ff.holding))}${kv('Cash-out', m.ff.cashout ? OS_M(m.ff.cashout) : '—')}${kv('HML (pago)', m.ff.hml_payment ? OS_M(m.ff.hml_payment) : '—')}${m.ff.dq.revisar ? `<div class="meta" style="margin-top:8px;color:var(--neg)">⚠ all-in > 100% del ARV — dato a revisar en Airtable (probable error de carga).</div>` : ''}` : `<div class="empty" style="padding:26px">Sin deal en Fix & Flip.</div>`}</div>
      <div class="card"><div class="chart-h"><div class="t">🔨 Ficha de obra</div>${m.remodel ? `<a class="go" style="cursor:pointer" onclick="osOpenApp('remodelacion','remodel-pro')">Abrir Estimador →</a>` : ''}</div>
        ${m.remodel ? `${remoEnCurso ? `<div class="meta" style="margin-bottom:8px"><span class="ff-dqx" style="background:rgba(231,182,94,.15);color:var(--amber);border-color:rgba(231,182,94,.32)">⏳ obra en curso · estimado/utilidad preliminar (no final)</span></div>` : ''}${kv('Estado · Avance', `${OS_E(remoR.proceso || '—')} · ${Math.round(Number(remoR.avance_pct || 0))}%`)}${kv('Líder', OS_E(remoR.lider || '—'))}${kv('Inicio → estimada → real', `${OS_E(remoR.fecha_inicio || 's/f')} → ${OS_E(remoR.fecha_estimada_fin || 's/f')} → ${OS_E(remoR.fecha_real_fin || 'en curso')}`)}${kv('Retraso', remoRetraso != null ? `${remoRetraso} días${remoR.desviacion_label ? ' · ' + OS_E(remoR.desviacion_label) : ' · sin nota'}` : (remoEnCurso ? 'en curso' : '—'), remoRetraso > 0 ? 'down' : '')}${kv('Draws Ingreso (inversionista)', OS_M(remoDraws))}<div class="kv"><span>Material (est aprox → real)</span><b>${OS_M(estMat)} → ${OS_M(remoMat)}${devBadge(estMat, remoMat)}</b></div><div class="kv"><span>Trabajadores (est aprox → real)</span><b>${OS_M(estLab)} → ${OS_M(remoLab)}${devBadge(estLab, remoLab)}</b></div>${kv('Presupuesto · % gastado', `${OS_M(remoPresup)} · ${remoPctGast}%`)}${kv('Por gastar', remoR.monto_por_gastar != null ? OS_M(remoR.monto_por_gastar) : '—')}${kv(remoEnCurso ? 'Utilidad (preliminar)' : 'Utilidad', OS_M(remoUtil) + (remoRent != null ? ` · ${remoRent.toFixed(1)}%` : ''), remoEnCurso ? 'warn' : (remoUtil >= 0 ? 'up' : 'down'))}<div class="meta" style="margin-top:8px;font-size:10px">Estimado material/MO = aprox (presupuesto × ratio real ${Math.round(matRatio*100)}%/${Math.round((1-matRatio)*100)}%). Real y desvío alimentan la calibración del Estimador.</div>` : `<div class="empty" style="padding:26px">Sin obra en Remodelación.</div>`}</div>
    </div>
    <div class="grid k2" style="margin-top:16px">
      <div class="card"><div class="chart-h"><div class="t">🏠 Rentas</div>${m.rentas ? `<a class="go" style="cursor:pointer" onclick="osOpenApp('rentas','property-manager')">Abrir Property Manager →</a>` : ''}</div>
        ${m.rentas ? `${kv('Unidades rentables', m.rentas.totalU)}${kv('Ocupación', m.rentas.occPct + '% (' + m.rentas.occU + '/' + m.rentas.totalU + ')')}${kv('Renta objetivo (ocupadas)', OS_M(m.rentas.occRent))}${kv('Cobrado (plata real · ' + comp.mb.label + ')', OS_M(m.rentas.cobrado), 'up')}${kv('Deuda de cobranza', OS_M(m.rentas.deuda), m.rentas.deuda > 200 ? 'down' : '')}` : `<div class="empty" style="padding:26px">Todavía no está en Rentas.</div>`}</div>
      <div class="card brain"><div class="bh"><div class="orb"></div><div><b>Cerebro · esta casa</b><span>INSIGHTS DE LA PROPIEDAD</span></div></div>
        ${insights.length ? insights.map(i => `<div class="insight"><div class="ic ${i.s === 'r' ? 'r' : i.s === 'y' ? 'y' : 'b'}">●</div><div class="tx">${i.t}</div></div>`).join('') : '<div class="meta" style="padding:12px 0">Sin alertas para esta casa. ✓</div>'}
        ${stageK === 'refinanciada' || stageK === 'vendida' ? `<div class="insight"><div class="ic g">●</div><div class="tx"><b>Salida:</b> ${stageLbl}${m.ff && m.ff.deficit >= 0 ? ' · utilidad ' + OS_M(m.ff.arv - m.ff.allIn) : ''}.</div></div>` : ''}
      </div>
    </div>
    <div style="margin-top:18px"><button class="ibtn" data-osnav="/">← Panel Global</button></div>`;
}
function ffShortAddr(a) { return String(a || '').split(',')[0].replace(/\s+(austin|tx|texas)\b.*$/i, '').trim() || a; }
function osAppView(comp) {
  const r = OS.route;
  // Renderiza el panel de empresa como fondo y abre la app encima.
  setTimeout(() => osOpenApp(r.empresa, r.app, true), 30);
  return osEmpresa(comp);
}
// Apps que son SISTEMAS CLÁSICOS (viven en app.js, abren como modal/overlay) → tipo de sistema.
const OS_APP_SYS = {
  'rentas/property-manager': 'pm-rental-mgmt', 'rentas/cronograma': 'cronograma',
  'remodelacion/remodel-pro': 'remodel-pro', 'remodelacion/planner': 'weekly-planner',
  'educacion/manager': 'edu-manager', 'educacion/reportes': 'edu-reports',
};
function osOpenApp(empresa, app, fromRoute) {
  if (!fromRoute) osNav(`/${empresa}/${app}`);
  OS._returnTo = `/${empresa}`;
  // Command Centers nuevos (overlays propios z>os-root → no hace falta ocultar el OS).
  if (empresa === 'fix-and-flip') { if (window.openFFCommandCenter) { openFFCommandCenter({ name: 'Fix & Flip' }); const sec = { deals: 'deals', underwriting: 'underwriting', inversionistas: 'inversionistas', finanzas: 'finanzas', analitica: 'analitica' }[app]; if (sec && sec !== 'command-center') setTimeout(() => window.ffGo && ffGo(sec), 450); } return; }
  // El "Command Center" de Rentas se removió (duplicaba a Property Manager) → redirigir.
  if (empresa === 'rentas' && app === 'command-center') { return osNav('/rentas/property-manager'); }
  // Command Center de Remodelación: overlay propio (z>os-root), como el de FF → abre directo.
  if (empresa === 'remodelacion' && app === 'command-center') { if (window.openRemodelCommandCenter) openRemodelCommandCenter({ name: 'Command Center · Remodelación' }); return; }
  // Sistemas clásicos → dispatch de app.js, con el OS oculto + barra Volver.
  const sysType = OS_APP_SYS[`${empresa}/${app}`];
  if (sysType) return osOpenSystem(sysType, empresa);
}
window.osOpenApp = osOpenApp;

// Links externos (Airtable / Drive): la URL vive en la config del sistema (tabla `systems`) → se lee de ahí, no se hardcodea.
function osOpenExternal(url) { if (url) window.open(url, '_blank', 'noopener'); }
function osOpenLink(nameLike) {
  const sysMap = (typeof state !== 'undefined' && state && state.systems) || {};
  for (const list of Object.values(sysMap)) {
    const s = (list || []).find(x => x.type === 'link' && (x.name || '').toLowerCase().includes(String(nameLike).toLowerCase()) && x.config && x.config.url);
    if (s) return osOpenExternal(s.config.url);
  }
  if (window.toast) toast('No encontré ese link en tu cuenta todavía.', 'error');
}
window.osOpenExternal = osOpenExternal; window.osOpenLink = osOpenLink;

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
    const tok = await (async () => { try { const s = await sb.auth.getSession(); return (s && s.data.session && s.data.session.access_token) || ''; } catch (e) { return ''; } })();
    const r = await fetch('/api/brain-chat', { method: 'POST', headers: { 'content-type': 'application/json', ...(tok ? { Authorization: 'Bearer ' + tok } : {}) }, body: JSON.stringify({ question, snapshot: osSnapshot(osCompute()), history }) });
    const data = await r.json().catch(() => ({})); OS.chat.pop();
    OS.chat.push(r.ok ? { role: 'assistant', content: data.answer || 'Sin respuesta.' } : { role: 'assistant', content: data.error || `Error (HTTP ${r.status}).`, error: true });
  } catch (e) { OS.chat.pop(); OS.chat.push({ role: 'assistant', content: 'No pude conectar: ' + (e.message || e), error: true }); }
  finally { OS.chatBusy = false; osRenderChat(); }
}
window.osAsk = osAsk;

// ─── Charts ───
function osMountCharts(comp) { /* placeholder — los charts del holding se agregan con la Analítica */ }

// ─── CT-2 · Conciliación OPERATIVO ↔ QuickBooks (libros reales) ───
function osQbVal(emp, report, label) {
  const r = (OS.qbCache || []).find(x => x.empresa === emp && x.report === report && x.label === label);
  return r ? +r.value : null;
}
function osQbConcept(emp, concepto) {
  const m = (OS.qbMap || []).find(x => x.concepto === concepto);
  if (!m) return null;
  const re = new RegExp(m.patron, 'i');
  const rows = (OS.qbCache || []).filter(x => x.empresa === emp && x.report === 'balance' && re.test(x.label));
  return rows.length ? rows.reduce((s, x) => s + (+x.value || 0), 0) : null;
}
function osQbTieneLibros(emp) { return (OS.qbCache || []).some(x => x.empresa === emp && +x.value); }
function osConcilFF() {
  const aporteOS = (OS.investors || []).reduce((s, i) => s + (+i.capital_aportado || 0), 0);
  const aporteQB = osQbConcept('fix_flip', 'aporte_inversionistas');
  const deudaOS = OS.hmlTotal || 0;
  const deudaQB = osQbConcept('fix_flip', 'deuda_prestamos');
  const capQB = osQbConcept('fix_flip', 'capitalizado_propiedades');
  const realizadoOS = (OS.draws || []).reduce((s, d) => {
    const deal = (OS.ff || []).find(x => x.address_norm === d.address_norm);
    return s + ((deal && ['vendida', 'refinanciada', 'rentada'].includes(deal.stage)) ? (+d.net_total || 0) : 0);
  }, 0);
  const netQBall = osQbVal('fix_flip', 'pnl_all', 'Net Income');
  const netQBytd = osQbVal('fix_flip', 'pnl_ytd', 'Net Income');
  return { aporteOS, aporteQB, deudaOS, deudaQB, capQB, realizadoOS, netQBall, netQBytd };
}
function osConcilRow(lab, vOS, vQB, nota) {
  const warn = (OS.concilWarn != null ? OS.concilWarn : 10) / 100;
  const delta = (vOS != null && vQB != null) ? vOS - vQB : null;
  const base = Math.max(Math.abs(vOS || 0), Math.abs(vQB || 0), 1);
  const mal = delta != null && Math.abs(delta) / base > warn;
  const chip = delta == null ? '' : (mal ? ' <span class="badge b-warn">⚠ descuadre</span>' : ' <span class="badge b-ok">✓</span>');
  return `<tr><td>${lab}${nota ? `<div style="font-size:9px;opacity:.55">${nota}</div>` : ''}</td><td style="text-align:right">${vOS != null ? OS_M(vOS) : '—'}</td><td style="text-align:right">${vQB != null ? OS_M(vQB) : '—'}</td><td style="text-align:right" class="${delta > 0 ? 'warn' : delta < 0 ? 'down' : ''}">${delta != null ? OS_M(delta) : '—'}${chip}</td></tr>`;
}
function osConcilBlock(comp) {
  const ff = osConcilFF();
  const remOSIngreso = (OS.remodel || []).filter(o => o.proceso === 'Finalizado').reduce((s, o) => s + (+o.monto_real || 0), 0);
  const remQBIncomeAll = osQbVal('remodelacion', 'pnl_all', 'Total Income');
  const pnlRow = (emp, nombre) => {
    const op = (OS.pnl || []).find(x => x.empresa === emp) || {};
    const ytd = osQbVal(emp, 'pnl_ytd', 'Net Income');
    const all = osQbVal(emp, 'pnl_all', 'Net Income');
    const libros = osQbTieneLibros(emp);
    return `<tr><td>${nombre}</td><td style="text-align:right">${op.ebitda != null ? OS_M(+op.ebitda) : '—'}</td><td style="text-align:right">${ytd != null ? OS_M(ytd) : (libros ? '—' : '<span style="opacity:.5">sin libros</span>')}</td><td style="text-align:right">${all != null ? OS_M(all) : (libros ? '—' : '<span style="opacity:.5">sin libros</span>')}</td></tr>`;
  };
  return `<div class="grid k2" style="margin-top:16px">
    <div class="card"><div class="chart-h"><div class="t">Conciliación Fix & Flip ↔ QuickBooks</div><div class="k">libros reales (Flipping Rentals LLC)</div></div>
      <table class="ptable"><thead><tr><th>Concepto</th><th style="text-align:right">OPERATIVO (OS)</th><th style="text-align:right">CONTABLE (QBO)</th><th style="text-align:right">Δ</th></tr></thead><tbody>
      ${osConcilRow('Aporte de inversionistas', ff.aporteOS, ff.aporteQB, 'ff_investors vs cuenta Investor Contributions')}
      ${osConcilRow('Deuda de préstamos (HML+refi)', ff.deudaOS, ff.deudaQB, 'ff_hml_loans vs Loan Payable')}
      ${osConcilRow('Resultado realizado', ff.realizadoOS, ff.netQBall, 'ciclos cerrados (draws) vs Net Income histórico QBO')}
      </tbody></table>
      <div class="meta" style="margin-top:8px">🏦 <b>Capitalización (no mezclar con P&L):</b> QBO capitaliza las casas como ACTIVO — ${ff.capQB != null ? OS_M(ff.capQB) : '—'} en Fixed Assets + Inventory (cada casa = cuenta "Rental Property"). Por eso el neto contable (${ff.netQBall != null ? OS_M(ff.netQBall) : '—'}) difiere del operativo (${OS_M(ff.realizadoOS)}): el costo de las casas vivas está en el balance, no en el P&L. El Δ restante es la conciliación pendiente.</div></div>
    <div class="card"><div class="chart-h"><div class="t">Capa contable del holding</div><div class="k">EBITDA operativo vs Net Income QBO · umbral ${OS.concilWarn != null ? OS.concilWarn : 10}%</div></div>
      <table class="ptable"><thead><tr><th>Empresa</th><th style="text-align:right">EBITDA operativo</th><th style="text-align:right">QBO Net YTD</th><th style="text-align:right">QBO Net histórico</th></tr></thead><tbody>
      ${pnlRow('fix_flip', '🏚 Fix & Flip')}${pnlRow('remodelacion', '🔨 Remodelación')}${pnlRow('rentas', '🏠 Rentas')}${pnlRow('educacion', '🎓 Educación')}
      </tbody></table>
      <table class="ptable" style="margin-top:10px"><thead><tr><th>Remodelación: ingreso</th><th style="text-align:right">OPERATIVO</th><th style="text-align:right">QBO</th><th style="text-align:right">Δ</th></tr></thead><tbody>
      ${osConcilRow('Ingreso (draws vs libros)', remOSIngreso, remQBIncomeAll, 'monto_real finalizadas vs Total Income Structure One')}
      </tbody></table>
      <div class="meta" style="margin-top:8px">Rentas (EverHome, ⚠ configurada en COP) y Educación: libros sin movimientos — todo lo operativo está "fuera de libros" hasta que se carguen. Fuente: qb_report_cache (sync on-demand /qb-oauth/sync).</div></div>
  </div>`;
}

// ═══ PANEL DE CONTROL DE OPERACIONES (espejo ClickUp, 3 empresas) ═══
// UNA definición por métrica (= SQL de referencia): activa = status_type≠closed y sin date_closed/date_done.
const OPS_EMP = { '90113866319': 'Fix & Flip', '90113866434': 'Remodelación', '90113866436': 'Rentas' };
const OPS_URG = ['urgent', 'high', 'urgente', 'alta'];
const OPS_RUIDO_RE = /plantilla|maestr|ejemplo|template/i;   // plantillas: fuera de TODO conteo
const OPS_GESTION_RE = /cobros y pagos|check.?in|bienvenida|bitacor|gestion|gestión/i; // recurrentes por casa
const OPS_LT_RE = /refinanc|estrategia de salida/i;          // procesos largos (meses): no son 'vencidas'
function opsEsRuido(t) { return OPS_RUIDO_RE.test(t.name || '') || OPS_RUIDO_RE.test(t.list_name || '') || OPS_RUIDO_RE.test(t.folder_name || ''); }
function opsEsGestion(t) { return OPS_GESTION_RE.test(t.list_name || ''); }
function opsEsLongterm(t) { return OPS_LT_RE.test(t.list_name || ''); }
function opsHoy() { return new Date().toISOString().slice(0, 10); }
function opsActiva(t) { return (t.status_type || '') !== 'closed' && !t.date_closed && !t.date_done; }
function opsVencida(t) { return opsActiva(t) && t.due_date && String(t.due_date).slice(0, 10) < opsHoy(); }
function opsCompute() {
  const T = (OS.ckTasks || []).filter(t => !opsEsRuido(t));
  const ruidoN = (OS.ckTasks || []).length - T.length;
  const act = T.filter(opsActiva);
  const gestion = act.filter(opsEsGestion);
  const longterm = act.filter(t => opsEsLongterm(t) && !opsEsGestion(t));
  const vencBrutas = act.filter(opsVencida);
  const venc = vencBrutas.filter(t => !opsEsGestion(t) && !opsEsLongterm(t)); // VENCIDAS OPERATIVAS (regla reunión)
  const porConfig = act.filter(t => !t.due_date || !(t.primary_assignee || '').trim());
  const sinD = act.filter(t => !(t.primary_assignee || '').trim());
  const urg = act.filter(t => OPS_URG.includes((t.priority || '').toLowerCase()));
  const sinF = act.filter(t => !t.due_date);
  const hoy = act.filter(t => t.due_date && String(t.due_date).slice(0, 10) === opsHoy());
  const conDone = T.filter(t => t.date_done && t.due_date);
  const aTiempo = conDone.filter(t => String(t.date_done).slice(0, 10) <= String(t.due_date).slice(0, 10));
  const pctT = conDone.length ? Math.round(100 * aTiempo.length / conDone.length) : null;
  // carga por persona
  const P = {};
  act.forEach(t => { const p = (t.primary_assignee || '').trim() || '(sin dueño)'; if (!P[p]) P[p] = { p, act: 0, venc: 0, urg: 0 }; P[p].act++; if (opsVencida(t)) P[p].venc++; if (OPS_URG.includes((t.priority || '').toLowerCase())) P[p].urg++; });
  const personas = Object.values(P).sort((a, b) => b.act - a.act);
  const cuellos = personas.filter(x => x.p !== '(sin dueño)' && (x.venc >= 10 || x.act >= 60));
  // por empresa
  const emp = Object.keys(OPS_EMP).map(sid => {
    const a = act.filter(t => t.space_id === sid), v = a.filter(opsVencida);
    const usd = a.filter(t => OPS_URG.includes((t.priority || '').toLowerCase()) && !(t.primary_assignee || '').trim());
    const ratio = a.length ? v.length / a.length : 0;
    const sem = (ratio >= 0.10 || usd.length >= 15) ? 'rojo' : (ratio >= 0.04 || usd.length >= 5) ? 'amarillo' : 'verde';
    return { sid, nombre: OPS_EMP[sid], act: a.length, venc: v.length, urgSinDueno: usd.length, ratio: Math.round(ratio * 100), sem };
  });
  // casas/listas estancadas: lista con ≥5 vencidas
  const L = {};
  venc.forEach(t => { const k = t.list_name || t.folder_name || '—'; L[k] = (L[k] || 0) + 1; });
  const estancadas = Object.entries(L).map(([k, n]) => ({ lista: k, n })).filter(x => x.n >= 5).sort((a, b) => b.n - a.n);
  // tendencia (snapshots sumados por fecha)
  const S = {};
  (OS.ckSnaps || []).forEach(s => { const d = s.snapshot_date; if (!S[d]) S[d] = { d, overdue: 0, open: 0, closed7: 0 }; S[d].overdue += +s.total_overdue || 0; S[d].open += +s.total_open || 0; S[d].closed7 += +s.total_closed_last_7d || 0; });
  const tend = Object.values(S).sort((a, b) => a.d.localeCompare(b.d)).slice(-14);
  const propuestas = (OS.agProps || []).filter(x => !x.deleted_at && x.estado === 'propuesta');
  const dupIds = opsDuplicadas(act);
  const ccKeys = opsCasasCerradasKeys();
  const casaCerrada = act.filter(t => opsEnCasaCerrada(t, ccKeys));
  return { act, venc, vencBrutas, gestion, longterm, porConfig, ruidoN, sinD, urg, sinF, hoy, pctT, personas, cuellos, emp, estancadas, tend, propuestas, dupIds, casaCerrada, cerradas7: tend.length ? tend[tend.length - 1].closed7 : 0 };
}
function opsGo(view, filtro) {
  OS.opsView = view;
  if (filtro !== undefined) OS.opsF = Object.assign({ emp: '', persona: '', tipo: '', q: '', sort: 'due', dir: 1 }, filtro || {});
  osRender();
}
function opsSetF(k, v) { OS.opsF = OS.opsF || { emp: '', persona: '', tipo: '', q: '', sort: 'due', dir: 1 }; OS.opsF[k] = v; osRender(); }
function opsSort(col) { const f = OS.opsF || {}; if (f.sort === col) f.dir = -f.dir; else { f.sort = col; f.dir = 1; } OS.opsF = f; osRender(); }
window.opsGo = opsGo; window.opsSetF = opsSetF; window.opsSort = opsSort;

function opsSemChip(sem) { return sem === 'rojo' ? '🔴' : sem === 'amarillo' ? '🟡' : '🟢'; }
function opsCeoView(o) {
  const empCards = o.emp.map(e => `<div class="card" style="cursor:pointer" onclick="opsGo('pm',{emp:'${e.sid}',tipo:'vencidas'})"><div class="lab">${opsSemChip(e.sem)} ${e.nombre}</div><div class="big">${e.act}</div><div class="meta">${e.venc} vencidas (${e.ratio}%) · ${e.urgSinDueno} urgentes sin dueño</div></div>`).join('');
  // decisiones del día
  const dec = [];
  if (o.porConfig.length > 50) dec.push({ tx: `<b>${o.porConfig.length} tareas POR CONFIGURAR</b> (sin fecha o dueño) — el agente diario no puede operar el tablero así. Meta: bajarlo a 0.`, f: { tipo: 'por_configurar' } });
  const top = o.personas.filter(x => x.p !== '(sin dueño)')[0];
  const topV = [...o.personas].filter(x => x.p !== '(sin dueño)').sort((a, b) => b.venc - a.venc)[0];
  if (topV && topV.venc >= 10) dec.push({ tx: `<b>${OS_E(topV.p)}</b> tiene <b>${topV.venc} tareas vencidas</b> (${topV.act} activas) — redistribuir o re-fechar.`, f: { persona: topV.p, tipo: 'vencidas' } });
  const usdN = o.urg.filter(t => !(t.primary_assignee || '').trim()).length;
  if (usdN) dec.push({ tx: `<b>${usdN} tareas urgentes SIN DUEÑO</b> — asignar hoy.`, f: { tipo: 'urgentes_sin_dueno' } });
  o.estancadas.slice(0, 2).forEach(x => dec.push({ tx: `<b>${OS_E(String(x.lista).replace(/^\d+[.)]\s*/, ''))}</b> estancada: ${x.n} vencidas en la misma lista/casa.`, f: { q: x.lista, tipo: 'vencidas' } }));
  if (o.tend.length >= 7 && o.tend[o.tend.length - 1].overdue > o.tend[Math.max(0, o.tend.length - 8)].overdue * 1.15) dec.push({ tx: `Las vencidas <b>subieron ${o.tend[o.tend.length - 1].overdue - o.tend[Math.max(0, o.tend.length - 8)].overdue}</b> en 7 días — la operación está empeorando.`, f: { tipo: 'vencidas' } });
  if (o.propuestas.length) dec.push({ tx: `<b>${o.propuestas.length} propuesta(s) del Ops Brain</b> esperando tu aprobación.`, f: { tipo: 'propuestas' } });
  const decHtml = dec.slice(0, 5).map((d, i) => `<div class="krow" style="cursor:pointer;padding:10px 0" onclick='opsGo("pm",${JSON.stringify(d.f)})'><span>${i + 1}. ${d.tx}</span><b style="opacity:.5">→</b></div>`).join('') || '<div class="meta" style="padding:10px 0">Nada crítico que decidir hoy ✓</div>';
  // tendencia sparkline
  const maxO = Math.max(...o.tend.map(x => x.overdue), 1);
  const spark = o.tend.map(x => `<div title="${x.d}: ${x.overdue} vencidas" style="flex:1;background:linear-gradient(180deg,#f87171,#b91c1c);height:${Math.max(4, Math.round(56 * x.overdue / maxO))}px;border-radius:3px 3px 0 0;opacity:.85"></div>`).join('');
  // carga por persona (top 8)
  const conDueno = o.personas.filter(x => x.p !== '(sin dueño)').slice(0, 8);
  const sinDuenoRow = o.personas.find(x => x.p === '(sin dueño)');
  const maxA = Math.max(...conDueno.map(x => x.act), 1);
  const carga = [...conDueno, ...(sinDuenoRow ? [sinDuenoRow] : [])].map(x => `<div class="krow" style="cursor:pointer" onclick="opsGo('pm',{persona:'${OS_E(x.p)}'})"><span style="min-width:150px">${OS_E(x.p)}</span><span style="flex:1;margin:0 10px"><span style="display:block;height:9px;border-radius:5px;background:rgba(255,255,255,.06);overflow:hidden"><i style="display:block;height:100%;width:${Math.min(100, Math.round(100 * x.act / maxA))}%;${x.p === '(sin dueño)' ? 'opacity:.35;' : ''}background:linear-gradient(90deg,#12b5a0,#2f6ef0)"></i></span></span><b style="min-width:44px;text-align:right">${x.act}</b><span class="${x.venc ? 'down' : ''}" style="min-width:84px;text-align:right;font-size:11px;margin-left:10px">${x.venc} venc.</span></div>`).join('');
  return `<div class="grid k4">
      <div class="card"><div class="lab">% a tiempo (histórico)</div><div class="big ${o.pctT >= 60 ? 'up' : 'down'}">${o.pctT != null ? o.pctT + '%' : '—'}</div><div class="meta">entregas con fecha cumplida</div></div>
      <div class="card" style="cursor:pointer" onclick="opsGo('pm',{tipo:'vencidas'})"><div class="lab">Vencidas OPERATIVAS</div><div class="big down">${o.venc.length}</div><div class="meta">excluye ${o.vencBrutas.length - o.venc.length} de gestión/long-term</div></div>
      <div class="card"><div class="lab">Cuellos de botella</div><div class="big ${o.cuellos.length ? 'warn' : 'up'}">${o.cuellos.length}</div><div class="meta">${o.cuellos.slice(0, 2).map(x => OS_E(x.p)).join(', ') || 'ninguno'}</div></div>
      <div class="card"><div class="lab">Cerradas últimos 7d</div><div class="big up">${o.cerradas7}</div><div class="meta">eficiencia del equipo</div></div>
    </div>
    <div class="card" style="margin-top:14px;border:1px solid rgba(231,182,94,.4);cursor:pointer" onclick="opsGo('pm',{tipo:'por_configurar'})"><div class="lab">⚡ POR CONFIGURAR — la prioridad (regla madre)</div><div style="display:flex;align-items:baseline;gap:14px;margin-top:6px"><div class="big warn">${o.porConfig.length}</div><div class="meta" style="flex:1">tareas sin fecha u dueño (${o.sinF.length} sin fecha · ${o.sinD.length} sin dueño). <b>El agente diario solo puede correr cuando toda tarea tenga fecha + dueño + dependencia.</b> Dependencias: aún no espejadas de ClickUp (P2). Click para trabajar la cola.</div></div></div>
    <div class="grid k3" style="margin-top:14px">${empCards}</div>
    <div class="grid k2" style="margin-top:14px">
      <div class="card"><div class="lab">🎯 Qué decidir hoy</div>${decHtml}</div>
      <div class="card"><div class="lab">Tendencia de vencidas · ${o.tend.length} días</div><div style="display:flex;align-items:flex-end;gap:3px;height:60px;margin:12px 0 4px">${spark}</div><div class="meta">${o.tend.length ? o.tend[0].d + ' → ' + o.tend[o.tend.length - 1].d : 'sin snapshots'} · fuente: clickup_snapshots diarios</div></div>
    </div>
    <div class="card" style="margin-top:14px"><div class="lab">Carga por persona (activas / vencidas)</div>${carga}</div>
    <div class="meta" style="margin-top:10px">Semáforo empresa: 🔴 vencidas ≥10% de activas o ≥15 urgentes sin dueño · 🟡 ≥4% o ≥5 · 🟢 resto. Click en cualquier tarjeta/alerta baja a la Vista PM filtrada.</div>`;
}
function opsPmView(o) {
  const f = OS.opsF = OS.opsF || { emp: '', persona: '', tipo: '', q: '', sort: 'due', dir: 1 };
  let rows = o.act.slice();
  if (f.tipo === 'vencidas') rows = rows.filter(opsVencida);
  if (f.tipo === 'sin_dueno') rows = rows.filter(t => !(t.primary_assignee || '').trim());
  if (f.tipo === 'sin_fecha') rows = rows.filter(t => !t.due_date);
  if (f.tipo === 'urgentes') rows = rows.filter(t => OPS_URG.includes((t.priority || '').toLowerCase()));
  if (f.tipo === 'urgentes_sin_dueno') rows = rows.filter(t => OPS_URG.includes((t.priority || '').toLowerCase()) && !(t.primary_assignee || '').trim());
  if (f.tipo === 'hoy') rows = rows.filter(t => t.due_date && String(t.due_date).slice(0, 10) === opsHoy());
  if (f.tipo === 'duplicadas') rows = rows.filter(t => o.dupIds.has(t.id));
  if (f.tipo === 'por_configurar') rows = rows.filter(t => !t.due_date || !(t.primary_assignee || '').trim());
  if (f.tipo === 'gestion') rows = rows.filter(opsEsGestion);
  if (f.tipo === 'longterm') rows = rows.filter(t => opsEsLongterm(t) && !opsEsGestion(t));
  if (f.tipo === 'casa_cerrada') rows = rows.filter(t => o.casaCerrada.includes(t));
  if (f.emp) rows = rows.filter(t => t.space_id === f.emp);
  if (f.persona) rows = rows.filter(t => (t.primary_assignee || '').trim() === f.persona || (f.persona === '(sin dueño)' && !(t.primary_assignee || '').trim()));
  if (f.q) { const q = f.q.toLowerCase(); rows = rows.filter(t => (t.name || '').toLowerCase().includes(q) || (t.list_name || '').toLowerCase().includes(q) || (t.folder_name || '').toLowerCase().includes(q)); }
  const dir = f.dir || 1;
  const sorters = { due: t => t.due_date || '9999', tarea: t => (t.name || '').toLowerCase(), emp: t => OPS_EMP[t.space_id] || '', dueno: t => (t.primary_assignee || 'zzz').toLowerCase(), prio: t => ({ urgent: 0, high: 1, normal: 2, low: 3 }[(t.priority || '').toLowerCase()] ?? 4), estado: t => (t.status || '').toLowerCase(), lista: t => (t.list_name || '').toLowerCase() };
  const key = sorters[f.sort] || sorters.due;
  rows.sort((a, b) => { const x = key(a), y = key(b); return (x < y ? -1 : x > y ? 1 : 0) * dir; });
  const th = (col, lbl, al) => `<th style="cursor:pointer;${al ? 'text-align:' + al : ''}" onclick="opsSort('${col}')">${lbl}${f.sort === col ? (dir > 0 ? ' ▲' : ' ▼') : ''}</th>`;
  const chip = (tipo, lbl, n) => `<button class="repbtn ${f.tipo === tipo ? '' : 'ghost'}" style="padding:4px 10px;font-size:11px" onclick="opsSetF('tipo','${f.tipo === tipo ? '' : tipo}')">${lbl} (${n})</button>`;
  const personasSel = ['', '(sin dueño)', ...o.personas.filter(x => x.p !== '(sin dueño)').map(x => x.p)];
  const fila = t => { const v = opsVencida(t) && !opsEsGestion(t) && !opsEsLongterm(t); const urg = OPS_URG.includes((t.priority || '').toLowerCase()); const tags = (opsEsGestion(t) ? ` <span class="badge b-ok" style="font-size:8px">GESTIÓN — ${OS_E((t.folder_name || 'casa').slice(0, 18))}</span>` : '') + (opsEsLongterm(t) && !opsEsGestion(t) ? ' <span class="badge b-ok" style="font-size:8px">LONG-TERM</span>' : ''); return `<tr${v ? ' style="background:rgba(248,113,113,.06)"' : ''}><td><span class="badge ${v ? 'b-warn' : 'b-ok'}" style="font-size:9px">${OS_E(OPS_EMP[t.space_id] || '?')}</span></td><td><a href="${OS_E(t.url || '#')}" target="_blank" style="color:inherit;text-decoration:none"><b>${OS_E((t.name || '').slice(0, 60))}</b> ↗</a>${tags}</td><td style="font-size:11px;opacity:.75">${OS_E((t.list_name || t.folder_name || '—').slice(0, 26))}</td><td>${OS_E(t.primary_assignee || '—')}</td><td class="${v ? 'down' : ''}">${t.due_date ? String(t.due_date).slice(0, 10) : '—'}</td><td>${urg ? '<b class="warn">' + OS_E(t.priority) + '</b>' : OS_E(t.priority || '—')}</td><td style="font-size:11px">${OS_E(t.status || '—')}${f.tipo === 'por_configurar' ? `<div style="display:flex;gap:4px;margin-top:3px">${!t.due_date ? `<button class="repbtn ghost" style="padding:2px 7px;font-size:9px" onclick="opsProponer('${t.id}','fecha')">📅 fecha</button>` : ''}${!(t.primary_assignee || '').trim() ? `<button class="repbtn ghost" style="padding:2px 7px;font-size:9px" onclick="opsProponer('${t.id}','dueno')">👤 dueño</button>` : ''}</div>` : ''}${f.tipo === 'vencidas' ? `<div style="margin-top:3px"><button class="repbtn ghost" style="padding:2px 7px;font-size:9px" onclick="opsProponer('${t.id}','fecha')">📅 re-fechar</button></div>` : ''}${f.tipo === 'casa_cerrada' || f.tipo === 'duplicadas' ? `<div style="margin-top:3px"><button class="repbtn ghost" style="padding:2px 7px;font-size:9px" onclick="opsProponer('${t.id}','archivar')">📦 archivar</button></div>` : ''}</td></tr>`; };
  const propBlock = (f.tipo === 'propuestas' || o.propuestas.length) ? opsPropCard(o) : '';
  const diarioBlock = f.tipo === 'hoy' ? opsDiarioCard(o) + opsCierreCard(o) : '';
  return `<div class="grid k4">
      <div class="card" style="cursor:pointer" onclick="opsSetF('tipo','')"><div class="lab">Activas</div><div class="big">${o.act.length}</div><div class="meta">FF ${o.emp[0].act} · Rem ${o.emp[1].act} · Ren ${o.emp[2].act}</div></div>
      <div class="card" style="cursor:pointer" onclick="opsSetF('tipo','vencidas')"><div class="lab">Vencidas</div><div class="big down">${o.venc.length}</div><div class="meta">due &lt; hoy</div></div>
      <div class="card" style="cursor:pointer" onclick="opsSetF('tipo','sin_dueno')"><div class="lab">Sin dueño</div><div class="big warn">${o.sinD.length}</div><div class="meta">sin responsable</div></div>
      <div class="card" style="cursor:pointer" onclick="opsSetF('tipo','urgentes')"><div class="lab">Urgentes</div><div class="big warn">${o.urg.length}</div><div class="meta">% a tiempo hist.: ${o.pctT != null ? o.pctT + '%' : '—'}</div></div>
    </div>
    ${propBlock}${diarioBlock}
    <div class="card" style="margin-top:14px">
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px">
        <select class="repbtn ghost" style="padding:5px 8px" onchange="opsSetF('emp',this.value)">${['', ...Object.keys(OPS_EMP)].map(sid => `<option value="${sid}" ${f.emp === sid ? 'selected' : ''}>${sid ? OPS_EMP[sid] : 'Todas las empresas'}</option>`).join('')}</select>
        <select class="repbtn ghost" style="padding:5px 8px" onchange="opsSetF('persona',this.value)">${personasSel.map(p => `<option value="${OS_E(p)}" ${f.persona === p ? 'selected' : ''}>${p || 'Todas las personas'}</option>`).join('')}</select>
        ${chip('vencidas', 'Vencidas', o.venc.length)}${chip('sin_dueno', 'Sin dueño', o.sinD.length)}${chip('sin_fecha', 'Sin fecha', o.sinF.length)}${chip('urgentes', 'Urgentes', o.urg.length)}${chip('hoy', 'Hoy', o.hoy.length)}${chip('por_configurar', '⚡ Por configurar', o.porConfig.length)}${chip('gestion', 'Gestión rec.', o.gestion.length)}${chip('longterm', 'Long-term', o.longterm.length)}${chip('duplicadas', 'Duplicadas', o.dupIds.size)}${chip('casa_cerrada', 'Casa cerrada', o.casaCerrada.length)}
        <button class="repbtn ${OS.opsGroupCasa ? '' : 'ghost'}" style="padding:5px 10px;font-size:11px" onclick="OS.opsGroupCasa=!OS.opsGroupCasa;osRender()">🏠 Por casa</button>
        <input placeholder="buscar tarea / casa / lista…" value="${OS_E(f.q || '')}" onchange="opsSetF('q',this.value)" style="flex:1;min-width:160px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:6px 10px;color:inherit;font-size:12px">
      </div>
      ${OS.opsGroupCasa ? opsPorCasaView(o, rows, fila) : `<table class="ptable"><thead><tr>${th('emp', 'Emp.')}${th('tarea', 'Tarea')}${th('lista', 'Casa / Lista')}${th('dueno', 'Dueño')}${th('due', 'Fecha')}${th('prio', 'Prioridad')}${th('estado', 'Estado')}</tr></thead><tbody>
      ${rows.slice(0, 150).map(fila).join('') || '<tr><td colspan="7" style="padding:14px;color:#48d69c">Sin tareas con estos filtros ✓</td></tr>'}</tbody></table>`}
      <div class="meta" style="margin-top:8px">Mostrando ${Math.min(150, rows.length)} de ${rows.length} · fuente: clickup_tasks_mirror (paridad 3/3 con ClickUp, sync diario). Acciones con aprobación (reasignar/re-fechar/archivar): fase siguiente.</div>
    </div>`;
}
function opsPanel(comp) {
  const o = opsCompute();
  const v = OS.opsView || 'ceo';
  const tog = (id, lbl) => `<button class="repbtn ${v === id ? '' : 'ghost'}" style="padding:6px 16px;font-weight:700" onclick="opsGo('${id}')">${lbl}</button>`;
  const fresh = (OS.ckTasks || []).length ? String((OS.ckTasks.map(t => t.last_synced_at).sort().pop() || '')).slice(0, 16).replace('T', ' ') : '—';
  return `<h1>⚙️ Panel de Operaciones <span>· ClickUp en vivo · 3 empresas</span></h1>
    <div class="sub" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">${tog('ceo', '👔 Vista CEO')}${tog('pm', '🛠 Vista PM')}<span style="margin-left:auto;font-size:11px;opacity:.6">último sync: ${fresh} UTC · paridad 3/3</span></div>
    ${v === 'ceo' ? opsCeoView(o) : opsPmView(o)}`;
}

// ─── Panel Ops fase 2: colas por revisar + seguimiento diario + aprobación de propuestas ───
function opsNormName(x) { return String(x || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
function opsDuplicadas(act) {
  // posibles duplicadas: mismo nombre normalizado (≥12 chars) en la misma lista, excluyendo recurrentes
  const g = {};
  // duplicada REAL = mismo nombre + mismo proceso (lista) + MISMA casa (folder). Clones entre casas = proceso 1-11, NO duplicado.
  act.filter(t => !t.is_recurring && opsNormName(t.name).length >= 12).forEach(t => { const k = (t.folder_name || '') + '|' + (t.list_name || '') + '|' + opsNormName(t.name).slice(0, 60); (g[k] = g[k] || []).push(t); });
  const out = new Set();
  Object.values(g).filter(x => x.length > 1).forEach(x => x.forEach(t => out.add(t.id)));
  return out;
}
function opsCasasCerradasKeys() {
  const keys = [];
  (OS.remodel || []).filter(o => o.proceso === 'Finalizado').forEach(o => { const k = opsNormName(String(o.address || '').split(',')[0]); if (k.length > 5) keys.push(k); });
  (OS.ff || []).filter(d => ['vendida', 'refinanciada'].includes(d.stage)).forEach(d => { const k = opsNormName(String(d.address || '').split(',')[0]); if (k.length > 5) keys.push(k); });
  return [...new Set(keys)];
}
function opsEnCasaCerrada(t, keys) {
  const ln = opsNormName(t.list_name), fn = opsNormName(t.folder_name);
  return keys.some(k => (ln && ln.includes(k)) || (fn && fn.includes(k)));
}
async function opsDecide(id, decision) {
  const btns = document.querySelectorAll(`[data-prop="${id}"] button`); btns.forEach(b => b.disabled = true);
  try {
    const { data: { session } } = await sb.auth.getSession();
    const res = await fetch(`${window.SUPABASE_URL}/functions/v1/clickup-writeback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session ? session.access_token : window.SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ proposal_id: id, decision, decidido_por: (session && session.user && session.user.email) || 'ceo' })
    });
    const j = await res.json();
    if (!j.ok) { alert('No se pudo: ' + (j.error || res.status)); btns.forEach(b => b.disabled = false); return; }
    OS.agProps = (OS.agProps || []).filter(p => p.id !== id);
    osRender();
  } catch (e) { alert('Error: ' + e.message); btns.forEach(b => b.disabled = false); }
}
window.opsDecide = opsDecide;
function opsPropCard(o) {
  const rows = o.propuestas.slice(0, 20).map(p => {
    const pay = p.payload || {};
    return `<div class="krow" data-prop="${p.id}" style="align-items:flex-start;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.05)">
      <span style="flex:1"><b>${OS_E(pay.agente || 'agente')}</b> · <span class="badge b-warn" style="font-size:9px">${OS_E(p.tipo_accion)}</span><br>
      <b style="font-size:12.5px">${OS_E(pay.titulo || '')}</b>${pay.task_url ? ` <a href="${OS_E(pay.task_url)}" target="_blank" style="font-size:11px">↗</a>` : ''}
      <div style="font-size:11px;opacity:.7;margin-top:3px">${OS_E(p.evidencia || '')}</div></span>
      <span style="display:flex;gap:6px;margin-left:10px">
        <button class="repbtn" style="padding:4px 12px;font-size:11px" onclick="opsDecide('${p.id}','aprobar')">✓ Aprobar</button>
        <button class="repbtn ghost" style="padding:4px 10px;font-size:11px" onclick="opsDecide('${p.id}','rechazar')">✗</button>
      </span></div>`;
  }).join('');
  return `<div class="card" style="margin-top:14px"><div class="lab">🤖 Propuestas del Ops Brain — ${o.propuestas.length} esperando tu OK</div>
    ${rows || '<div class="meta" style="padding:8px 0">Sin propuestas pendientes ✓ (los 4 agentes corren con cada sync)</div>'}
    <div class="meta" style="margin-top:8px">Aprobar aplica la acción en ClickUp vía edge function (re-fechar/archivar=cerrar; nada se borra). Rechazar solo marca. Informes (Analista/Líder) se aprueban como leídos.</div></div>`;
}
function opsDiarioCard(o) {
  const hoyIso = opsHoy();
  const doneHoy = (OS.ckTasks || []).filter(t => t.date_done && String(t.date_done).slice(0, 10) === hoyIso);
  const P = {};
  o.hoy.forEach(t => { const p = (t.primary_assignee || '(sin dueño)'); (P[p] = P[p] || { p, plan: 0, hechas: 0 }).plan++; });
  doneHoy.forEach(t => { const p = (t.primary_assignee || '(sin dueño)'); (P[p] = P[p] || { p, plan: 0, hechas: 0 }).hechas++; });
  const done7 = (OS.ckTasks || []).filter(t => t.date_done && (Date.now() - new Date(t.date_done).getTime()) / 86400000 <= 7 && t.date_created);
  const tProm = done7.length ? Math.round(done7.reduce((s, t) => s + (new Date(t.date_done) - new Date(t.date_created)) / 86400000, 0) / done7.length) : null;
  const rows = Object.values(P).sort((a, b) => b.plan - a.plan).map(x => {
    const sem = x.hechas >= x.plan && x.plan > 0 ? '🟢' : x.hechas > 0 ? '🟡' : x.plan > 0 ? '🔴' : '⚪';
    return `<tr><td>${OS_E(x.p)}</td><td style="text-align:right">${x.plan}</td><td style="text-align:right" class="up">${x.hechas}</td><td style="text-align:right">${Math.max(0, x.plan - x.hechas)}</td><td style="text-align:right">${sem}</td></tr>`;
  }).join('');
  return `<div class="card" style="margin-top:14px"><div class="lab">📅 Seguimiento diario · ${hoyIso}</div>
    <div class="grid k3" style="margin:10px 0"><div class="card kpi"><div class="lab">Plan de hoy</div><div class="big">${o.hoy.length}</div></div>
    <div class="card kpi"><div class="lab">Cerradas hoy</div><div class="big up">${doneHoy.length}</div></div>
    <div class="card kpi"><div class="lab">Entrega promedio (7d)</div><div class="big">${tProm != null ? tProm + 'd' : '—'}</div><div class="meta">creación→cierre · ${done7.length} cerradas</div></div></div>
    <table class="ptable"><thead><tr><th>Persona</th><th style="text-align:right">Plan hoy</th><th style="text-align:right">Hechas</th><th style="text-align:right">Pendientes</th><th style="text-align:right">Salud</th></tr></thead><tbody>${rows || '<tr><td colspan="5" style="padding:12px;opacity:.6">Sin tareas con fecha de hoy — el Coordinador puede proponer el plan.</td></tr>'}</tbody></table></div>`;
}

// Acción rápida de la cola POR CONFIGURAR: crea una PROPUESTA (contrato) — se aplica recién con tu OK.
async function opsProponer(taskId, que) {
  const t = (OS.ckTasks || []).find(x => x.id === taskId); if (!t) return;
  let tipo, payload, evidencia;
  if (que === 'fecha') {
    const fecha = prompt(`Fecha para "${(t.name || '').slice(0, 50)}" (YYYY-MM-DD):`, new Date(Date.now() + 86400000).toISOString().slice(0, 10));
    if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return;
    tipo = 'refechar_tarea'; payload = { fecha_nueva: fecha };
    evidencia = `Cola POR CONFIGURAR: sin fecha. Propuesta desde el panel: due ${fecha}.`;
  } else if (que === 'archivar') {
    if (!confirm(`¿Proponer archivar (cerrar en ClickUp) "${(t.name || '').slice(0, 50)}"? Nada se borra.`)) return;
    tipo = 'archivar_tarea'; payload = { status_cierre: 'complete' };
    evidencia = `Propuesta desde el panel: archivar (tarea en cola ${(OS.opsF || {}).tipo || ''}).`;
  } else {
    const nombres = [...new Set((OS.ckTasks || []).map(x => (x.primary_assignee || '').trim()).filter(Boolean))].sort();
    const persona = prompt(`Dueño para "${(t.name || '').slice(0, 50)}":\n${nombres.slice(0, 12).join(' · ')}`, nombres[0] || '');
    if (!persona) return;
    tipo = 'reasignar_tarea'; payload = { assignee_name: persona.trim() };
    evidencia = `Cola POR CONFIGURAR: sin dueño. Propuesta desde el panel: asignar a ${persona.trim()}.`;
  }
  const agId = (OS.agIds || {})['Ops · Coordinador'];
  if (!agId) { alert('Registry de agentes no cargado.'); return; }
  const { error } = await sb.from('agent_proposals').insert({
    agent_id: agId, tipo_accion: tipo, estado: 'propuesta', evidencia,
    payload: Object.assign({ titulo: `${que === 'fecha' ? 'Fechar' : 'Asignar'}: ${(t.name || '').slice(0, 80)}`, agente: 'Ops · Coordinador (vía panel)', empresa: OPS_EMP[t.space_id] || null, task_id: t.id, task_url: t.url || null, task_name: t.name || null, origen: 'panel' }, payload)
  });
  if (error) { alert('No se pudo proponer (¿logueado?): ' + error.message); return; }
  const { data } = await sb.from('agent_proposals').select('*').is('deleted_at', null).eq('estado', 'propuesta').order('created_at', { ascending: false }).limit(60);
  OS.agProps = data || OS.agProps; osRender();
}
window.opsProponer = opsProponer;

// ─── Parte 4: tablero agrupado POR CASA (folder_name = casa, misma nomenclatura en las 3 empresas) ───
function opsPorCasaView(o, rows, fila) {
  const G = {};
  rows.forEach(t => { const c = t.folder_name || '(sin casa)'; (G[c] = G[c] || []).push(t); });
  const casas = Object.entries(G).sort((a, b) => b[1].length - a[1].length);
  const abiertas = OS.opsCasasAbiertas = OS.opsCasasAbiertas || {};
  return casas.slice(0, 40).map(([casa, ts]) => {
    const venc = ts.filter(t => opsVencida(t) && !opsEsGestion(t) && !opsEsLongterm(t)).length;
    const sinCfg = ts.filter(t => !t.due_date || !(t.primary_assignee || '').trim()).length;
    const open = abiertas[casa];
    const emp = OPS_EMP[ts[0].space_id] || '';
    return `<div style="border:1px solid rgba(255,255,255,.07);border-radius:10px;margin-bottom:8px;overflow:hidden">
      <div style="display:flex;gap:10px;align-items:center;padding:10px 12px;cursor:pointer;background:rgba(255,255,255,.03)" onclick="opsToggleCasa('${OS_E(casa).replace(/'/g, '')}')">
        <b style="flex:1">🏠 ${OS_E(casa)}</b><span class="badge b-ok" style="font-size:9px">${OS_E(emp)}</span>
        <span style="font-size:11px;opacity:.75">${ts.length} tareas</span>
        ${venc ? `<span class="badge b-warn" style="font-size:9px">${venc} venc.</span>` : ''}
        ${sinCfg ? `<span style="font-size:10px;color:#e7b65e">⚡ ${sinCfg} por config.</span>` : ''}
        <span style="opacity:.5">${open ? '▾' : '▸'}</span></div>
      ${open ? `<table class="ptable" style="margin:0"><tbody>${ts.slice(0, 40).map(fila).join('')}</tbody></table>` : ''}</div>`;
  }).join('') || '<div class="meta" style="padding:14px">Sin tareas con estos filtros.</div>';
}
function opsToggleCasa(c) { OS.opsCasasAbiertas = OS.opsCasasAbiertas || {}; OS.opsCasasAbiertas[c] = !OS.opsCasasAbiertas[c]; osRender(); }
window.opsToggleCasa = opsToggleCasa;

// ─── Parte 5+: cierre del día — planeado vs real por tarea cerrada hoy ───
function opsCierreCard(o) {
  const hoyIso = opsHoy();
  const doneHoy = (OS.ckTasks || []).filter(t => !opsEsRuido(t) && t.date_done && String(t.date_done).slice(0, 10) === hoyIso);
  const rows = doneHoy.slice(0, 30).map(t => {
    const due = t.due_date ? String(t.due_date).slice(0, 10) : null;
    const delta = due ? Math.round((new Date(hoyIso) - new Date(due)) / 86400000) : null;
    const sem = delta == null ? '⚪ sin fecha' : delta <= 0 ? '🟢 a tiempo' : `🔴 +${delta}d tarde`;
    const est = t.time_estimate ? Math.round(t.time_estimate / 3600000) : null;
    const real = t.time_spent ? Math.round(t.time_spent / 3600000) : null;
    return `<tr><td><b>${OS_E((t.name || '').slice(0, 50))}</b><div style="font-size:9px;opacity:.55">${OS_E(t.folder_name || '')}</div></td><td>${OS_E(t.primary_assignee || '—')}</td><td style="text-align:right">${due || '—'}</td><td style="text-align:right">${sem}</td><td style="text-align:right;font-size:11px">${est != null || real != null ? `${est != null ? est + 'h est' : '—'} / ${real != null ? real + 'h real' : '—'}` : '—'}</td></tr>`;
  }).join('');
  const conFecha = doneHoy.filter(t => t.due_date);
  const aT = conFecha.filter(t => hoyIso <= String(t.due_date).slice(0, 10)).length;
  return `<div class="card" style="margin-top:14px"><div class="lab">✅ Cierre del día — ${doneHoy.length} cerradas hoy ${conFecha.length ? `· ${aT}/${conFecha.length} a tiempo` : ''}</div>
    <table class="ptable"><thead><tr><th>Tarea</th><th>Quién</th><th style="text-align:right">Planeada</th><th style="text-align:right">Entrega</th><th style="text-align:right">Est/Real</th></tr></thead><tbody>${rows || '<tr><td colspan="5" style="padding:12px;opacity:.6">Aún sin cierres hoy.</td></tr>'}</tbody></table>
    <div class="meta" style="margin-top:8px">Calidad con evidencia (adjuntos/comentarios): no espejada de ClickUp todavía — P2 del sync. Las no-hechas de ayer: el Coordinador las propone re-fechadas a hoy (marcadas atrasadas) en cada sync.</div></div>`;
}
