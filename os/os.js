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
function osAx() { return posGetTheme() === 'light' ? '#6f7785' : '#757d8b'; }
// Icono de empresa/app/área: nombre Lucide → SVG (osIcon); glifo tipográfico (◧ ▦ ∑ ⌂ …) → tal cual.
function osIco(val, opts) { return (window.OS_ICONS && OS_ICONS[val]) ? osIcon(val, opts) : (val || ''); }

// ─── Empresas / áreas del holding ───
const OS_EMPRESAS = {
  'fix-and-flip': { key: 'fix-flip', name: 'Fix & Flip', icon: 'construction', tag: 'Compra · remodela · vende/refi', apps: [
    { k: 'command-center', name: 'Command Center', icon: '◧', fn: "osOpenApp('fix-and-flip','command-center')" },
    { k: 'deals', name: 'Deals & Pipeline', icon: '▦', fn: "osOpenApp('fix-and-flip','deals')" },
    { k: 'underwriting', name: 'Underwriting', icon: '∑', fn: "osOpenApp('fix-and-flip','underwriting')" },
    { k: 'inversionistas', name: 'Inversionistas', icon: '◍', fn: "osOpenApp('fix-and-flip','inversionistas')" },
    { k: 'portal-inv', name: 'Portal Inversionistas', icon: 'gem', fn: "osNav('/inversionistas')" },
    { k: 'finanzas', name: 'Finanzas · QuickBooks', icon: '$', fn: "osOpenApp('fix-and-flip','finanzas')" },
    { k: 'dash', name: 'Dashboard Ejecutivo', icon: 'chart', fn: "osNav('/fix-and-flip/dashboard')" },
  ] },
  'rentas': { key: 'rentas', name: 'Rentas', icon: 'house', tag: 'Property management · ocupación · cobros', apps: [
    { k: 'property-manager', name: 'Property Manager', icon: '⌂', fn: "osOpenApp('rentas','property-manager')" },
    { k: 'cronograma', name: 'Cronograma', icon: 'calendar', fn: "osOpenApp('rentas','cronograma')" },
    { k: 'cartera', name: 'Informe de Cartera', icon: 'clipboard', fn: "osNav('/cartera')" },
    { k: 'cobros', name: 'Cobranza (recordatorios)', icon: 'megaphone', fn: "osNav('/cobros')" },
    { k: 'informes', name: 'Informes automáticos', icon: 'file-text', fn: "osNav('/informes')" },
    { k: 'dash', name: 'Dashboard Ejecutivo', icon: 'chart', fn: "osNav('/rentas/dashboard')" },
  ] },
  'remodelacion': { key: 'remodelacion', name: 'Remodelación', icon: 'hammer', tag: 'Obras · estimación · pipeline', apps: [
    { k: 'dash', name: 'Dashboard Ejecutivo', icon: 'chart', fn: "osNav('/remodelacion/dashboard')" },
    { k: 'remodel-pro', name: 'Estimador Pro', icon: '∑', fn: "osOpenApp('remodelacion','remodel-pro')" },
    { k: 'command-center', name: 'Command Center', icon: '◆', fn: "osOpenApp('remodelacion','command-center')" },
    { k: 'planner', name: 'Planner Semanal', icon: 'calendar-days', fn: "osOpenApp('remodelacion','planner')" },
    { k: 'diagnostico', name: 'Diagnóstico de Vivienda', icon: 'stethoscope', ext: true, fn: "window.open('/diagnostico','_blank')" },
    { k: 'airtable', name: 'Airtable Remodelación', icon: 'folder-open', ext: true, fn: "osOpenLink('Airtable Remodelacion')" },
    { k: 'drive', name: 'Drive · Structure One', icon: 'folder', ext: true, fn: "osOpenLink('Drive Compartida')" },
    // Fuera del panel (código intacto, se retoman después): Dashboard de Obras (→ Command Center), Cronograma (queda en Rentas), ClickUp Análisis.
  ] },
  'educacion': { key: 'education', name: 'Educación', icon: 'graduation-cap', tag: 'Universidad de Real Estate', apps: [
    { k: 'dash', name: 'Dashboard Ejecutivo', icon: 'chart', fn: "osNav('/educacion/dashboard')" },
    { k: 'manager', name: 'Mentorías Manager', icon: '◍', fn: "osOpenApp('educacion','manager')" },
    { k: 'reportes', name: 'Informes Ejecutivos', icon: '▤', fn: "osOpenApp('educacion','reportes')" },
  ] },
  // Departamento IA v2 (fábrica): Crear/Galería abiertos a todo usuario logueado;
  // Pendientes gateado adentro del módulo (os/os-ia.js) por has_area('ia')/admin.
  // Edge function ia-builder (Claude) + Supabase ia_sessions/ia_artifacts/ia_specs.
  'ia': { key: 'ia', name: 'IA', icon: 'factory', tag: 'Fábrica de herramientas · IA en vivo', apps: [
    { k: 'crear', name: 'Crear herramienta', icon: 'factory', fn: "osiaGo('crear')" },
    { k: 'galeria', name: 'Galería', icon: 'image', fn: "osiaGo('galeria')" },
    { k: 'pendientes', name: 'Pendientes de OK', icon: 'inbox', fn: "osiaGo('pendientes')" },
  ] },
};
const OS_AREAS = {
  operacion: { name: 'Operación', icon: 'settings', tag: 'Cronograma + cobranza · cruza todas las empresas' },
  contable: { name: 'Contable', icon: 'notebook', tag: 'QuickBooks · conciliación · cap table' },
};

// ════════════════════════════════════════════════════════════════
// CSS
// ════════════════════════════════════════════════════════════════
function osInjectCSS() {
  if (document.getElementById('os-styles')) return;
  const st = document.createElement('style'); st.id = 'os-styles';
  st.textContent = `
  #os-root{position:fixed;inset:0;z-index:900;overflow:auto;
    --bg:#08090c;--ink:#f1f3f7;--mut:#8b93a1;--mut2:#757d8b;--glass:#131519;--glassb:rgba(255,255,255,.07);
    --a1:#5c79f0;--a2:#3a5be0;--a3:#93b0e2;--pos:#4ade9e;--neg:#ff6b6b;--amber:#fbbf24;
    --accent:#3a5be0;--accent-ink:#ffffff;--accent-2:#5c79f0;--accent-soft:rgba(58,91,224,.18);--glow:rgba(58,91,224,.5);--grad:linear-gradient(120deg,#3a5be0,#5c79f0);
    --card:#131519;--line:rgba(255,255,255,.07);--txt2:#c7cdd8;--txt3:#8b93a1;--surface-2:#191c22;--surface-solid:#161a20;--radius:20px;
    --mesh1:rgba(58,91,224,.5);--mesh2:rgba(92,121,240,.16);--mesh3:rgba(58,91,224,.10);--bggrad:#08090c;
    color:var(--ink);background:var(--bg);font-family:'Inter',-apple-system,'Segoe UI',Roboto,Arial,sans-serif;-webkit-font-smoothing:antialiased}
  /* LIGHT canon royal — ESPEJO de ui/tokens.css (mantener sincronizado) */
  #os-root[data-theme="light"]{--bg:#eef1f6;--ink:#0e1420;--mut:#5a6270;--mut2:#6f7785;--glass:#ffffff;--glassb:rgba(14,20,32,.09);
    --a1:#3e5be0;--a2:#2b44c6;--a3:#5a78b4;--pos:#059669;--neg:#dc2626;--amber:#b45309;
    --accent:#2b44c6;--accent-2:#3e5be0;--accent-soft:rgba(43,68,198,.12);--glow:rgba(43,68,198,.24);--grad:linear-gradient(120deg,#2b44c6,#3e5be0);
    --card:#ffffff;--line:rgba(14,20,32,.09);--txt2:#3a4250;--txt3:#5a6270;--surface-2:#f1f4f8;--surface-solid:#ffffff;
    --mesh1:rgba(43,68,198,.24);--mesh2:rgba(62,91,224,.08);--mesh3:rgba(43,68,198,.05);--bggrad:#eef1f6}
  #os-root *{box-sizing:border-box;margin:0;padding:0}
  #os-root .bgfx{position:fixed;inset:0;z-index:0;pointer-events:none;background:radial-gradient(1100px 560px at 78% -12%,var(--mesh1),transparent 62%),radial-gradient(760px 520px at 8% 2%,var(--mesh2),transparent 58%),radial-gradient(700px 620px at 20% 120%,var(--mesh3),transparent 60%),var(--bggrad)}
  #os-root .bgfx::after{content:"";position:absolute;inset:0;opacity:.11;background-image:linear-gradient(var(--glassb) 1px,transparent 1px),linear-gradient(90deg,var(--glassb) 1px,transparent 1px);background-size:52px 52px;-webkit-mask-image:radial-gradient(circle at 60% 0%,#000,transparent 75%);mask-image:radial-gradient(circle at 60% 0%,#000,transparent 75%)}
  #os-root .wrap{position:relative;z-index:1;max-width:1500px;margin:0 auto;padding:22px 30px 60px}
  #os-root .bar{display:flex;align-items:center;gap:14px;margin-bottom:24px}
  #os-root .logo{width:38px;height:38px;border-radius:11px;background:var(--grad);display:grid;place-items:center;color:var(--accent-ink);font-weight:900;font-size:15px;box-shadow:0 0 18px var(--glow)}
  #os-root .brandt b{font-size:16px;font-weight:760}#os-root .brandt span{display:block;font-size:9px;color:var(--mut2);letter-spacing:2.4px;margin-top:1px}
  #os-root .crumbs{display:flex;align-items:center;gap:7px;font-size:12px;color:var(--mut);margin-left:8px}
  #os-root .crumbs a{color:var(--mut);cursor:pointer;text-decoration:none}#os-root .crumbs a:hover{color:var(--ink)}#os-root .crumbs .sep{color:var(--mut2)}#os-root .crumbs b{color:var(--ink)}
  #os-root .barr{margin-left:auto;display:flex;gap:8px;align-items:center}
  #os-root .ibtn{background:var(--glass);border:1px solid var(--glassb);color:var(--mut);height:34px;padding:0 12px;border-radius:10px;cursor:pointer;font-size:12px;display:flex;align-items:center;gap:6px;backdrop-filter:blur(10px)}
  #os-root .ibtn:hover{color:var(--ink);border-color:var(--a2)}
  #os-root h1{font-family:'Fraunces',Georgia,serif;font-size:25px;font-weight:640;letter-spacing:-.3px}#os-root h1 span{background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
  #os-root .sub{color:var(--mut);font-size:13px;margin:5px 0 20px}
  #os-root .grid{display:grid;gap:16px}#os-root .k4{grid-template-columns:repeat(4,minmax(0,1fr))}#os-root .k3{grid-template-columns:repeat(3,minmax(0,1fr))}#os-root .k2{grid-template-columns:repeat(2,minmax(0,1fr))}
  #os-root .card{position:relative;background:var(--glass);border:1px solid var(--glassb);border-radius:var(--radius);padding:19px;box-shadow:inset 0 1px 0 rgba(255,255,255,.05),0 22px 44px -28px rgba(0,0,0,.85);transition:.2s;overflow:hidden}
  #os-root[data-theme="light"] .card{box-shadow:0 1px 2px rgba(16,20,28,.04),0 18px 40px -28px rgba(16,20,28,.4)}
  /* Barra de acento superior en KPIs (design-ref .kpi::after) */
  #os-root .grid.k4>.card::after,#os-root .card.kpi::after{content:"";position:absolute;top:0;left:0;right:0;height:2px;background:var(--grad);opacity:.45}
  #os-root[data-theme="light"] .osbadge.warn,#os-root[data-theme="light"] .badge.b-warn{background:#e7edf9;color:#b45309;border-color:#c9d4ea}
  #os-root .card::before{content:"";position:absolute;inset:0 0 auto 0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.2),transparent)}
  #os-root[data-theme="light"] .card::before{background:linear-gradient(90deg,transparent,rgba(16,20,28,.12),transparent)}
  #os-root .lab{font-size:10px;letter-spacing:1.4px;color:var(--mut2);text-transform:uppercase;font-weight:700}
  #os-root .big{font-size:29px;font-weight:780;margin-top:8px;letter-spacing:-.6px;font-variant-numeric:tabular-nums}#os-root .glow{text-shadow:0 0 24px var(--glow)}#os-root[data-theme="light"] .glow{text-shadow:none}
  #os-root .meta{font-size:11.5px;color:var(--mut);margin-top:6px;line-height:1.5}
  #os-root .osbadge{display:inline-block;font-size:9.5px;font-weight:700;padding:2px 9px;border-radius:20px;margin-top:7px;letter-spacing:.2px}
  #os-root .osbadge.warn{background:var(--amber-bg,color-mix(in srgb,var(--amber) 16%,transparent));color:var(--amber);border:1px solid color-mix(in srgb,var(--amber) 32%,transparent)}
  #os-root .osbadge.ok{background:color-mix(in srgb,var(--pos) 14%,transparent);color:var(--pos);border:1px solid color-mix(in srgb,var(--pos) 30%,transparent)}
  #os-root .ff-dqx{display:inline-block;font-size:9.5px;font-weight:700;padding:2px 8px;border-radius:20px;background:color-mix(in srgb,var(--neg) 16%,transparent);color:var(--neg);border:1px solid color-mix(in srgb,var(--neg) 35%,transparent);white-space:nowrap}
  #os-root .up{color:var(--pos)}#os-root .down{color:var(--neg)}#os-root .warn{color:var(--amber)}
  #os-root .unit{cursor:pointer}#os-root .unit:hover{transform:translateY(-3px);border-color:var(--a2)}
  #os-root .unit .ico{font-size:26px}#os-root .unit .un{font-size:16px;font-weight:700;margin-top:9px}#os-root .unit .ut{font-size:11.5px;color:var(--mut2);margin-top:3px;min-height:30px}
  #os-root .unit .kv{display:flex;justify-content:space-between;font-size:12px;padding:4px 0;border-top:1px solid var(--glassb);margin-top:10px}#os-root .unit .kv b{color:var(--ink)}
  #os-root .card:not(.unit) .kv{display:flex;justify-content:space-between;gap:12px;font-size:12.5px;padding:6px 0;border-top:1px solid var(--glassb)}#os-root .card:not(.unit) .kv:first-of-type{border-top:none}#os-root .card:not(.unit) .kv span{color:var(--mut)}#os-root .card:not(.unit) .kv b{color:var(--ink);text-align:right}
  #os-root .go{font-size:11px;color:var(--a2);margin-top:12px;font-weight:600}
  #os-root .brain{border:1px solid transparent;background:linear-gradient(var(--surface-solid),var(--surface-solid)) padding-box,var(--grad) border-box;box-shadow:0 0 40px -20px var(--glow)}
  #os-root[data-theme="light"] .brain{background:linear-gradient(#ffffff,#ffffff) padding-box,var(--grad) border-box}
  #os-root .bh{display:flex;align-items:center;gap:12px;margin-bottom:12px}
  #os-root .orb{width:32px;height:32px;border-radius:50%;position:relative;background:radial-gradient(circle at 34% 26%,rgba(255,255,255,.85),transparent 32%),radial-gradient(circle at 30% 34%,var(--accent-2),transparent 58%),radial-gradient(circle at 70% 74%,var(--accent),#060814 92%);box-shadow:0 0 16px var(--glow),inset 0 -4px 10px rgba(0,0,0,.5)}
  #os-root .orb::after{content:"";position:absolute;inset:-5px;border-radius:50%;background:conic-gradient(from 0deg,var(--a1),var(--a2),var(--a3),var(--a1)) border-box;-webkit-mask:linear-gradient(#000 0 0) padding-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;animation:osspin 6s linear infinite;opacity:.7}@keyframes osspin{to{transform:rotate(360deg)}}
  #os-root .bh b{font-size:14px}#os-root .bh span{font-size:9px;color:var(--mut2);display:block;letter-spacing:1.4px;margin-top:2px}
  #os-root .insight{display:flex;gap:11px;padding:10px 0;border-bottom:1px solid var(--glassb)}#os-root .insight:last-of-type{border-bottom:none}
  #os-root .insight .ic{font-size:8px;margin-top:6px}#os-root .ic.r{color:var(--neg)}#os-root .ic.y{color:var(--amber)}#os-root .ic.g{color:var(--pos)}#os-root .ic.b{color:var(--a2)}
  #os-root .insight .tx{font-size:12px;line-height:1.5}#os-root .insight .tx b{font-weight:650}#os-root .insight .tag{font-size:9px;color:var(--mut2);font-weight:700;letter-spacing:.6px;margin-top:4px;display:block}
  #os-root .app-card{cursor:pointer;display:flex;align-items:center;gap:13px}#os-root .app-card:hover{transform:translateY(-2px);border-color:var(--a2)}
  #os-root .app-card .ai{width:40px;height:40px;border-radius:11px;background:linear-gradient(135deg,rgba(92,121,240,.16),rgba(58,91,224,.1));display:grid;place-items:center;font-size:17px;flex-shrink:0}
  #os-root .app-card .an{font-size:13.5px;font-weight:640}#os-root .app-card .at{font-size:10.5px;color:var(--mut2);margin-top:2px}
  #os-root .soon{font-size:8.5px;font-weight:700;color:var(--a2);background:var(--accent-soft);padding:2px 7px;border-radius:10px;margin-left:auto}
  #os-root .ptable{width:100%;border-collapse:collapse;font-size:12.5px}
  #os-root .ptable th{text-align:left;color:var(--mut2);font-size:9.5px;letter-spacing:1px;text-transform:uppercase;padding:9px 8px;border-bottom:1px solid var(--glassb);font-weight:700}
  #os-root .ptable td{padding:10px 8px;border-bottom:1px solid var(--glassb)}#os-root .ptable tr:hover td{background:var(--glass)}
  /* Tabla de Cobranza: rejilla completa (columnas + filas marcadas) */
  #os-root .cbtable{width:100%;border-collapse:collapse;font-size:12.5px}
  #os-root .cbtable thead th{position:sticky;top:0;z-index:1;background:var(--card,var(--glass));text-align:left;color:var(--mut2);font-size:9.5px;letter-spacing:1px;text-transform:uppercase;padding:9px 10px;border:1px solid var(--glassb);font-weight:700}
  #os-root .cbtable td{padding:9px 10px;border:1px solid var(--glassb);vertical-align:top}
  #os-root .cbtable td[style*="text-align:right"]{font-variant-numeric:tabular-nums}
  #os-root .cbtable tbody tr:not(.cb-detail):nth-child(4n-1){background:color-mix(in srgb,var(--glass) 45%,transparent)}
  #os-root .cbtable tbody tr:not(.cb-detail):hover td{background:var(--glass)}
  #os-root .cbtable tr.cb-detail td{background:var(--glass)}
  #os-root .badge{font-size:10px;padding:3px 9px;border-radius:7px;font-weight:600}#os-root .b-red{background:color-mix(in srgb,var(--neg) 13%,transparent);color:var(--neg)}#os-root .b-warn{background:var(--amber-bg,color-mix(in srgb,var(--amber) 13%,transparent));color:var(--amber)}#os-root .b-ok{background:color-mix(in srgb,var(--pos) 13%,transparent);color:var(--pos)}
  #os-root .chart-h{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}#os-root .chart-h .t{font-size:13.5px;font-weight:640}#os-root .chart-h .k{font-size:11px;color:var(--mut2)}
  #os-root .op-item{display:flex;align-items:center;gap:11px;padding:9px 0;border-bottom:1px solid var(--glassb);font-size:12px}#os-root .op-time{color:var(--mut2);width:46px;font-variant-numeric:tabular-nums}
  #os-root .zpill{margin-left:auto;font-size:9.5px;padding:2px 9px;border-radius:20px;background:var(--glass);color:var(--mut)}
  #os-root .cbtn{background:var(--grad);border:none;color:var(--accent-ink);font-weight:700;padding:6px 12px;border-radius:9px;cursor:pointer;font-size:11px}
  #os-root .empty{padding:50px;text-align:center;color:var(--mut2)}
  #os-root .card,#os-root .wrap{animation:osfade .35s ease}@keyframes osfade{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
  #os-root .cc-chat{display:flex;flex-direction:column;gap:10px;max-height:320px;overflow-y:auto;margin-top:6px}#os-root .cc-chat:empty{display:none}
  #os-root .cbub{max-width:82%;padding:10px 13px;border-radius:13px;font-size:12.5px;line-height:1.55;white-space:pre-wrap}
  #os-root .cbub.u{align-self:flex-end;background:linear-gradient(135deg,rgba(92,121,240,.18),rgba(58,91,224,.16));border:1px solid rgba(58,91,224,.35)}
  #os-root .cbub.a{align-self:flex-start;background:var(--glass);border:1px solid var(--glassb)}#os-root .cbub.err{border-color:color-mix(in srgb,var(--neg) 40%,transparent);color:var(--neg)}#os-root .cbub.think{color:var(--mut2);font-style:italic}
  #os-root .ask{display:flex;gap:8px;margin-top:14px}#os-root .ask input{flex:1;background:var(--surface-2);border:1px solid var(--glassb);border-radius:11px;padding:11px 14px;color:var(--ink);font-size:12px;outline:none}#os-root .ask input:focus{border-color:var(--accent)}
  #os-root .ask button{background:var(--grad);border:none;color:var(--accent-ink);font-weight:750;padding:0 16px;border-radius:11px;cursor:pointer;font-size:12px}
  @media (max-width:900px){#os-root .wrap{padding:16px 14px 40px}#os-root .k4,#os-root .k3,#os-root .k2{grid-template-columns:minmax(0,1fr)}#os-root .k4.units{grid-template-columns:repeat(2,minmax(0,1fr))}}
  /* ── TOPBAR del OS sobre los sistemas en PÁGINA COMPLETA (marco de empresa) ── */
  #os-return-bar{position:fixed;top:0;left:0;right:0;z-index:2147483000;display:flex;align-items:center;gap:14px;height:54px;padding:0 20px;
    font-family:'Inter',-apple-system,'Segoe UI',Roboto,Arial,sans-serif;background:rgba(8,9,12,.72);border-bottom:1px solid rgba(255,255,255,.07);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}
  #os-return-bar[data-theme="light"]{background:rgba(255,255,255,.82);border-bottom-color:rgba(14,20,32,.09)}
  #os-return-bar .osrb-logo{width:32px;height:32px;border-radius:9px;background:linear-gradient(120deg,#3a5be0,#5c79f0);display:grid;place-items:center;color:#fff;font-weight:900;font-size:12px;cursor:pointer;flex-shrink:0;box-shadow:0 0 14px rgba(58,91,224,.5)}
  #os-return-bar .osrb-crumb{display:flex;align-items:center;gap:8px;font-size:13px;color:#8b93a1;min-width:0}
  #os-return-bar .osrb-crumb a{color:#8b93a1;cursor:pointer;text-decoration:none;white-space:nowrap}#os-return-bar .osrb-crumb a:hover{color:#f1f3f7}
  #os-return-bar .osrb-crumb b{color:#f1f3f7;font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#os-return-bar .osrb-crumb .sep{color:#757d8b}
  #os-return-bar[data-theme="light"] .osrb-crumb,#os-return-bar[data-theme="light"] .osrb-crumb a{color:#5a6270}#os-return-bar[data-theme="light"] .osrb-crumb b{color:#0e1420}
  #os-return-bar .osrb-back{margin-left:auto;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.13);color:#f1f3f7;font-weight:600;font-size:12.5px;padding:8px 14px;border-radius:9px;cursor:pointer;flex-shrink:0}
  #os-return-bar .osrb-back:hover{border-color:#3a5be0}
  #os-return-bar[data-theme="light"] .osrb-back{background:rgba(14,20,32,.05);border-color:rgba(14,20,32,.12);color:#0e1420}
  #os-return-bar .osrb-theme{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.13);color:#8b93a1;font-size:13px;padding:8px 11px;border-radius:9px;cursor:pointer;flex-shrink:0}
  #os-return-bar[data-theme="light"] .osrb-theme{background:rgba(14,20,32,.05);border-color:rgba(14,20,32,.12);color:#5a6270}
  /* ── #modal como PÁGINA COMPLETA (no modal flotante): ocupa todo, mesh de fondo, sin backdrop ── */
  #modal.os-syspage{padding:0 !important;display:block !important;overflow-y:auto;background:transparent}
  html[data-osreskin="dark"] #modal.os-syspage{background:
    radial-gradient(1100px 560px at 78% -12%,rgba(58,91,224,.28),transparent 62%),
    radial-gradient(760px 520px at 8% 2%,rgba(92,121,240,.10),transparent 58%),
    radial-gradient(700px 620px at 20% 120%,rgba(58,91,224,.07),transparent 60%),
    #08090c !important}
  html[data-osreskin="light"] #modal.os-syspage{background:
    radial-gradient(1100px 560px at 78% -12%,rgba(43,68,198,.16),transparent 62%),
    radial-gradient(760px 520px at 8% 2%,rgba(62,91,224,.05),transparent 58%),
    #eef1f6 !important}
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
  ${L} #modal > div{box-shadow:0 24px 70px -26px rgba(16,20,28,.34) !important}
  /* ───────── DARK ───────── */
  ${D} #modal{background:rgba(6,7,10,.66) !important}
  ${D} #modal > div{background:#12141a !important;color:#f1f3f7 !important;border:1px solid rgba(255,255,255,.1) !important;box-shadow:0 34px 90px -32px rgba(0,0,0,.92) !important}
  ${D} #modal .bg-white,${D} #modal .bg-slate-50,${D} #modal .bg-slate-100,${D} #modal .bg-gray-50,${D} #modal .bg-gray-100,${D} #modal .bg-neutral-50,${D} #modal .bg-neutral-100{background-color:#161a20 !important}
  ${D} #modal .bg-slate-800,${D} #modal .bg-slate-900,${D} #modal .bg-gray-800,${D} #modal .bg-gray-900{background-color:#1e2430 !important}
  ${D} #modal .text-slate-900,${D} #modal .text-slate-800,${D} #modal .text-slate-700,${D} #modal .text-slate-600,${D} #modal .text-gray-900,${D} #modal .text-gray-800,${D} #modal .text-gray-700,${D} #modal .text-black{color:#f1f3f7 !important}
  ${D} #modal .text-slate-500,${D} #modal .text-slate-400,${D} #modal .text-gray-500,${D} #modal .text-gray-400{color:#8b93a1 !important}
  ${D} #modal .border,${D} #modal .border-b,${D} #modal .border-t,${D} #modal .border-slate-200,${D} #modal .border-slate-100,${D} #modal .border-slate-300,${D} #modal .border-gray-200,${D} #modal .border-gray-100,${D} #modal .border-gray-300{border-color:rgba(255,255,255,.1) !important}
  ${D} #modal .divide-slate-200 > *+*,${D} #modal .divide-gray-200 > *+*,${D} #modal .divide-slate-100 > *+*{border-color:rgba(255,255,255,.08) !important}
  ${D} #modal input,${D} #modal select,${D} #modal textarea{background-color:#0e1016 !important;color:#f1f3f7 !important;border-color:rgba(255,255,255,.14) !important}
  ${D} #modal input::placeholder,${D} #modal textarea::placeholder{color:#757d8b !important}
  ${D} #modal table th{color:#8b93a1 !important}
  ${D} #modal tr:hover td{background:rgba(255,255,255,.03) !important}
  ${D} #modal .shadow,${D} #modal .shadow-sm,${D} #modal .shadow-md,${D} #modal .shadow-lg{box-shadow:none !important}
  ${D} #modal .hover\\:bg-slate-50:hover,${D} #modal .hover\\:bg-slate-100:hover,${D} #modal .hover\\:bg-gray-50:hover,${D} #modal .hover\\:bg-gray-100:hover{background-color:rgba(255,255,255,.05) !important}
  /* bg-slate-900 lo maneja el sistema de diseño compartido (superficie oscura elevada, no gradiente,
     para no romper las cards de acento con sublabels muted). */
  /* Property Manager tiene su tema COMPLETO propio (pmInjectTheme en pm-main.js). */
  /* ───────── OLA 3 (12-jul): red de seguridad para ESTILOS INLINE de los clásicos en dark ───────── */
  ${D} #modal [style*="background:#fff"],${D} #modal [style*="background: #fff"],${D} #modal [style*="background:white"],${D} #modal [style*="background-color:#fff"]{background-color:#161a20 !important}
  ${D} #modal [style*="background:#fafafa"],${D} #modal [style*="background:#f8fafc"],${D} #modal [style*="background:#f9fafb"],${D} #modal [style*="background:#f1f5f9"]{background-color:#12141a !important}
  ${D} #modal [style*="color:#000"],${D} #modal [style*="color: #000"],${D} #modal [style*="color:black"],${D} #modal [style*="color:#111"],${D} #modal [style*="color:#1e293b"],${D} #modal [style*="color:#0f172a"]{color:#f1f3f7 !important}
  /* ───────── OLA 3: pulido LIGHT canon (tarjetas con sombra + contraste mínimo --mut2) ───────── */
  ${L} #modal .bg-white.rounded-xl,${L} #modal .bg-white.rounded-lg,${L} #modal .bg-white.rounded-2xl{box-shadow:0 1px 2px rgba(16,20,28,.05),0 6px 16px rgba(16,20,28,.06) !important;border-color:#dfe4ec !important}
  ${L} #modal .text-slate-500,${L} #modal .text-gray-500{color:#5a6270 !important}
  ${L} #modal .text-slate-400,${L} #modal .text-gray-400{color:#6f7785 !important}
  /* ───────── OLA 3: tablas de los clásicos scrollean en celular (no rompen la página) ───────── */
  @media (max-width:768px){ html[data-osreskin] #modal-body table{display:block;overflow-x:auto;max-width:100%;-webkit-overflow-scrolling:touch} }
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
  if (seg[0] === 'inversionistas') return { view: 'invadmin' };
  if (seg[0] === 'mapa') return { view: 'mapa' };
  if (seg[0] === 'cartera') return { view: 'cartera' };
  if (seg[0] === 'holding') return { view: 'dash', dashEmp: 'holding' };
  if (seg[0] === 'cobros') return { view: 'cobros' };
  if (seg[0] === 'informes') return { view: 'informes' };
  if (seg[0] === 'casa' && seg[1]) return { view: 'casa', slug: seg[1] };
  if (seg[0] === 'ia') { if (window.OSIA && seg[1]) OSIA.tab = seg[1]; return { view: 'empresa', empresa: 'ia' }; } // /ia/pedir|bandeja|galeria = tab del módulo
  if (OS_EMPRESAS[seg[0]]) {
    if (seg[1] === 'dashboard') return { view: 'dash', dashEmp: seg[0], empresa: seg[0] };
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
  if (r.view === 'invadmin') return 'Inversionistas · ' + base;
  if (r.view === 'mapa') return 'Mapa de Conexiones · ' + base;
  if (r.view === 'cartera') return 'Informe de Cartera · ' + base;
  if (r.view === 'dash') return 'Dashboard Ejecutivo · ' + base;
  if (r.view === 'cobros') return 'Cobranza · ' + base;
  if (r.view === 'informes') return 'Informes de Rentas · ' + base;
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
  root.innerHTML = '<div class="bgfx"></div><div class="wrap"><div class="ui-loading" style="padding:60px"><div class="ui-spinner"></div><div class="ui-brand">Flipping Rentals OS</div><div style="margin-top:6px">Cargando…</div></div></div>';
}
function osToggleTheme() { posToggleTheme(); osApplyReskin(); osRender(); }
window.osToggleTheme = osToggleTheme;

async function osLoad() {
  OS.loaded = false; OS.loadErr = null;
  try {
    const [ff, draws, props, units, pay, book, tenants, tasks, inv, remodel, edu, ffOh, ffHml, pnl, qbc, qbm, hmlL, cw, ckT, ckS, agP, agReg, sab, sabCfg] = await Promise.all([
      sb.from('ff_deals').select('*').eq('active', true),
      sb.from('ff_draws').select('*'),
      sb.from('pm_properties').select('id,name,zone,rental_model,total_units,property_id,address_normalized,mortgage_monthly').eq('active', true),
      sb.from('pm_units').select('id,property_id,status,target_rent,unit_type,is_active').eq('is_active', true),
      sb.from('pm_payments').select('amount,type,status,property_id,tenant_id,paid_at,billing_ym').eq('active', true).eq('type', 'ingreso').eq('status', 'pagado'),
      sb.from('pm_bookings').select('unit_id,property_id,tenant_id,start_date,end_date,status').eq('active', true),
      sb.from('pm_tenants').select('id,full_name,phone,client_state'),
      sb.from('pm_tasks').select('title,task_type,scheduled_date,zone,assignee,start_at,status,property_id').eq('active', true),
      sb.from('ff_investors').select('*').eq('active', true),
      sb.from('remodel_at_properties').select('address,city,lider,proceso,avance_pct,gasto_materiales,gasto_trabajadores,presupuesto_interno,valor_interno,valor_cliente,ganancia,fecha_inicio,fecha_estimada_fin,fecha_real_fin,dias_transcurridos,desviacion_label,sqft,retraso_dias,monto_por_gastar,rentabilidad,monto_real,avance_real,property_id'),
      sb.from('edu_ceo_snapshot').select('activos,con_plan_activo,nuevos_30d,antiguedad_promedio_dias').eq('mentorship_id', 'flipping-rentals'),
      sb.from('ff_overhead').select('source, monto').eq('active', true).then(r => r.data || []).catch(() => []),
      sb.from('ff_hml_payments').select('pago_hml').eq('active', true).then(r => r.data || []).catch(() => []),
      sb.from('v_holding_pnl').select('*').then(r => r.data || []).catch(() => []),
      sb.from('qb_report_cache').select('empresa, report, label, value, fetched_at').eq('active', true).then(r => r.data || []).catch(() => []),
      sb.from('qb_account_map').select('*').then(r => r.data || []).catch(() => []),
      sb.from('ff_hml_loans').select('monto_hml').eq('active', true).then(r => r.data || []).catch(() => []),
      sb.from('ff_uw_config').select('value').eq('key', 'concil_warn_pct').maybeSingle().then(r => r.data).catch(() => null),
      (async () => { // paginado: PostgREST capa a 1000 filas por request
        const all = []; for (let pg = 0; pg < 8; pg++) {
          const { data } = await sb.from('clickup_tasks_mirror').select('id,name,status,status_type,priority,primary_assignee,due_date,date_created,date_updated,date_done,date_closed,list_name,folder_name,space_id,url,last_synced_at,is_recurring,time_estimate,time_spent').eq('active', true).in('space_id', ['90113866319', '90113866434', '90113866436']).order('id').range(pg * 1000, pg * 1000 + 999);
          all.push(...(data || [])); if (!data || data.length < 1000) break;
        } return all; })().catch(() => []),
      sb.from('clickup_snapshots').select('snapshot_date,total_open,total_overdue,total_closed_last_7d,company_id').order('snapshot_date').then(r => r.data || []).catch(() => []),
      sb.from('agent_proposals').select('*').is('deleted_at', null).eq('estado', 'propuesta').order('created_at', { ascending: false }).limit(60).then(r => r.data || []).catch(() => []),
      sb.from('agent_registry').select('id, nombre').like('nombre', 'Ops%').is('deleted_at', null).then(r => r.data || []).catch(() => []),
      (async () => { const all = []; for (let pg = 0; pg < 5; pg++) { const { data } = await sb.from('sabueso_findings').select('*').eq('active', true).order('id').range(pg * 1000, pg * 1000 + 999); all.push(...(data || [])); if (!data || data.length < 1000) break; } return all; })().catch(() => []),
      sb.from('sabueso_config').select('*').eq('activo', true).then(r => r.data || []).catch(() => []),
    ]);
    // #2 (auditoría 13-jul): capital único desde la capa de KPIs — equity ≠ deuda
    OS.capital = await sb.from('v_capital_deployed').select('*').maybeSingle().then(r => r.data).catch(() => null);
    // B5: la ficha de casa lee equity/all-in/líder de la capa de KPIs (v_property_360)
    OS.p360 = await sb.from('v_property_360').select('*').then(r => r.data || []).catch(() => []);
    // Ficha (14-jul): all-in/déficit con la definición nueva (compra + Total Draws, guardrail faltan_draws)
    OS.ffPort = await sb.from('v_ff_portafolio').select('*').then(r => r.data || []).catch(() => []);
    // B4: ocupación ÚNICA desde v_ocupacion (48/45/3/0 = 93.75%) — mata el snapshot congelado
    OS.ocup = await sb.from('v_ocupacion').select('*').maybeSingle().then(r => r.data).catch(() => null);
    // 🗺️ LECTURA EN VIVO del Mapa de Conexiones: la fuente efectiva de los números con
    // alternativas implementadas la decide data_lineage (editable en /mapa, auditado, reversible).
    OS.lineage = await sb.from('data_lineage').select('metric_key,empresa,sistema,etiqueta,base,tabla,columna').limit(2000).then(r => r.data || []).catch(() => []);
    OS.pnl = pnl || [];
    OS.qbCache = qbc || []; OS.qbMap = qbm || [];
    OS.hmlTotal = (hmlL || []).reduce((t, x) => t + (+x.monto_hml || 0), 0);
    OS.concilWarn = cw ? +cw.value : 10;
    OS.ckTasks = ckT || []; OS.ckSnaps = ckS || []; OS.agProps = agP || [];
    OS.sabueso = sab || []; OS.sabCfg = {}; (sabCfg || []).forEach(c => OS.sabCfg[c.check_key] = c);
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
// MES DE RENTA (tag Mes/Año de Airtable → billing_ym); sin tag cae a la fecha de cobro.
function osBillYm(p) { return p.billing_ym || (p.paid_at || '').slice(0, 7); }
function osMonthLoadInfo(ym) {
  const cnt = yy => OS.pay.filter(p => osBillYm(p) === yy).length;
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
  // Ingresos del mes = RENTA DEL MES (tag Mes/Año), no fecha de cobro.
  const rentInc = OS.pay.filter(p => osBillYm(p) === mb.from.slice(0, 7)).reduce((s, p) => s + Number(p.amount || 0), 0);
  const occPct = totalU ? Math.round(occU / totalU * 100) : 0;
  // Cobranza (deuda contrato − plata real): por casa ocupada, renta esperada vs cobrada en el mes.
  const cobranza = osCobranza(mb);
  return {
    mb,
    ff: { deals: ff.length, activos: ffActive.length, capital: ffCapital, arv: ffArv, alertas: ffAlertas, list: ff },
    // B4 (auditoría 13-jul): la ocupación oficial viene de v_ocupacion (capa de KPIs) — misma cifra en todas las pantallas
    rentas: OS.ocup
      ? { casas: OS.props.length, unidades: +OS.ocup.unidades_rentables, ocupadas: +OS.ocup.ocupadas, occPct: Math.round(+OS.ocup.ocupacion_pct), mantenimiento: +OS.ocup.mantenimiento, disponibles: +OS.ocup.disponibles, ingresos: rentInc }
      : { casas: OS.props.length, unidades: totalU, ocupadas: occU, occPct, ingresos: rentInc },
    cobranza,
    holding: { capital: ffCapital, arv: ffArv, unidades: totalU + ff.length, ingresosMes: rentInc, deudaCobranza: cobranza.total },
    remodel: (() => {
      const fin = OS.remodel.filter(o => o.proceso === 'Finalizado');
      const curso = OS.remodel.filter(o => o.proceso !== 'Finalizado');
      // B7 (auditoría 13-jul): el avance promedio SOLO cuenta obras con % del Planner (avance_real);
      // promediar el singleSelect legacy daba el 91% fantasma. Solo EN CURSO: con la regla única
      // (remodel_avance_regla, 14-jul) las finalizadas tienen avance_real=100 y inflarían el promedio.
      const a = curso.filter(o => o.avance_real != null).map(o => Number(o.avance_real)).filter(x => x > 0);
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
    const cobrado = OS.pay.filter(x => x.property_id === p.id && osBillYm(x) === mb.from.slice(0, 7)).reduce((s, x) => s + Number(x.amount || 0), 0);
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
  comp.ff.list.filter(d => d.appraisal > 0 && d.arv > 0 && d.appraisal > d.arv * 1.05).forEach(d => ins.push({ sev: 'warning', impact: d.appraisal - d.arv, tag: 'FIX&FLIP · APPRAISAL>ARV', tx: `<b>${OS_E((d.address || '').split(',')[0])}</b>: appraisal ${OS_M(d.appraisal)} > ARV ${OS_M(d.arv)}.`, accion: 'actualizar el ARV en Airtable con el appraisal real', quien: 'Juan' }));
  // Cobranza (holding): casas con deuda
  comp.cobranza.rows.slice(0, 3).forEach(r => ins.push({ sev: 'critical', impact: r.deuda, tag: 'COBRANZA · MORA', tx: `<b>${OS_E(r.casa)}</b>: deuda de <b>${OS_M(r.deuda)}</b> este mes (esperado ${OS_M(r.esperado)}, cobrado ${OS_M(r.cobrado)}). El Cerebro puede redactar el cobro.`, accion: 'contactar al inquilino y registrar el pago o el acuerdo', quien: 'Carlos' }));
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
  if (r.view === 'invadmin') need = ['fix-flip'];
  else if (r.view === 'operacion') need = ['operacion'];
  else if (r.view === 'contable') need = ['contable'];
  else if (r.empresa === 'ia') need = null; // IA abierta a todo usuario logueado (Bandeja se gatea en el módulo)
  else if ((r.view === 'empresa' || r.view === 'app') && OS_EMPRESAS[r.empresa]) need = [OS_EMPRESAS[r.empresa].key];
  else if (r.view === 'casa') need = ['fix-flip', 'rentas', 'remodelacion'];
  else if (r.view === 'mapa') need = ['fix-flip', 'rentas', 'remodelacion', 'contable', 'operacion'];
  else if (r.view === 'cartera') need = ['rentas', 'operacion', 'contable'];
  else if (r.view === 'dash') need = r.dashEmp === 'holding' ? ['contable', 'operacion'] : [OS_EMPRESAS[r.dashEmp] ? OS_EMPRESAS[r.dashEmp].key : 'contable'];
  else if (r.view === 'cobros') need = ['rentas', 'operacion'];
  else if (r.view === 'informes') need = ['rentas', 'operacion', 'contable'];
  if (need && !need.some(osCanArea)) return need[0];
  return null;
}
function osNoAccess(what) {
  const lbl = what === 'admin' ? 'el Panel de Admin (solo administradores)' : 'esta sección';
  return `<div class="empty"><div style="font-size:40px">${osIcon('lock')}</div><div style="margin-top:10px">No tenés acceso a ${OS_E(lbl)}.</div><div class="meta" style="margin-top:6px">Pedile a un admin que te asigne el área en el Panel de Admin.</div><button class="cbtn" style="margin-top:14px" data-osnav="/">← Volver al inicio</button></div>`;
}

// ════════════════════════════════════════════════════════════════
// RENDER
// ════════════════════════════════════════════════════════════════
function osDestroyCharts() { OS._charts.forEach(c => { try { c.destroy(); } catch (e) {} }); OS._charts = []; }
function osRender() {
  const root = document.getElementById('os-root'); if (!root) return;
  posApplyTheme(root); osDestroyCharts();
  if (OS.loadErr) { root.innerHTML = osShell(`<div class="empty"><div style="font-size:40px">${osIcon('alert')}</div><div class="down" style="margin-top:10px">${OS_E(OS.loadErr)}</div></div>`); return; }
  if (!OS.loaded) { root.innerHTML = osShell('<div class="ui-loading"><div class="ui-spinner"></div><div>Cargando datos del holding…</div></div>'); return; }
  const guard = osRouteGuard(OS.route);
  if (guard) { root.innerHTML = osShell(osNoAccess(guard)); return; }
  const comp = osCompute();
  const view = { global: osGlobal, empresa: osEmpresa, operacion: osOperacion, contable: osContable, admin: (window.osAdminView || os404), invadmin: (window.invAdminView || os404), mapa: (window.osLineageView || os404), cartera: (window.osCarteraView || os404), cobros: (window.osCobrosView || os404), informes: (window.osInformesView || os404), dash: (window.osDashView || os404), app: osAppView, casa: osCasa, '404': os404 }[OS.route.view] || osGlobal;
  root.innerHTML = osShell(view(comp));
  requestAnimationFrame(() => osMountCharts(comp));
}
window.osRender = osRender;
function osCrumbs() {
  const r = OS.route; const parts = [`<a data-osnav="/">Global</a>`];
  if (r.view === 'operacion') parts.push('<span class="sep">/</span><b>' + osIcon('settings') + ' Operación</b>');
  else if (r.view === 'contable') parts.push('<span class="sep">/</span><b>' + osIcon('notebook') + ' Contable</b>');
  else if (r.view === 'admin') parts.push('<span class="sep">/</span><b>' + osIcon('shield') + ' Admin</b>');
  else if (r.empresa) { const e = OS_EMPRESAS[r.empresa]; const eico = osIco(e.icon, { size: 14 }); parts.push(`<span class="sep">/</span>${r.view === 'empresa' ? `<b style="display:inline-flex;align-items:center;gap:5px">${eico} ${e.name}</b>` : `<a data-osnav="/${r.empresa}" style="display:inline-flex;align-items:center;gap:5px">${eico} ${e.name}</a>`}`); if (r.app) parts.push(`<span class="sep">/</span><b>${OS_E(r.app)}</b>`); }
  return parts.join(' ');
}
function osShell(inner) {
  return `<div class="bgfx"></div><div class="wrap">
    <div class="bar"><div class="logo" data-osnav="/" style="cursor:pointer">FR</div><div class="brandt"><b>Flipping Rentals OS</b><span>RENTAL PROFITSS · HOLDING</span></div>
      <div class="crumbs">${osCrumbs()}</div>
      <div class="barr">${osRole() === 'admin' ? '<button class="ibtn" data-osnav="/admin" title="Usuarios, roles y accesos">' + osIcon('shield') + ' Admin</button>' : ''}<button class="ibtn" onclick="osToggleTheme()" title="Tema claro/oscuro">◐</button></div>
    </div>${inner}</div>`;
}
function osOpenAdmin() { const root = document.getElementById('os-root'); if (root) root.style.display = 'none'; if (window.toast) toast('Panel clásico (sistemas/áreas). Volvé al OS con el logo de la esquina o recargando /', 'info', { duration: 4000 }); }
window.osOpenAdmin = osOpenAdmin;

// ─── NIVEL 1 · GLOBAL (macro del holding) ───
function osGlobal(comp) {
  const insights = osInsights(comp); const h = comp.holding;
  const isAdm = osRole() === 'admin';
  const unitCard = (slug, e, extra) => osCanArea(e.key) ? `<div class="card unit" data-osnav="/${slug}"><div class="ico">${osIco(e.icon, { size: 26 })}</div><div class="un">${e.name}</div><div class="ut">${e.tag}</div>${extra}<div class="go">Abrir ${e.name} →</div></div>` : '';
  // KPIs macro por área: cada tarjeta solo si el usuario tiene el área (admin ve todo)
  const kpis = [
    osCanArea('fix-flip') ? `<div class="card"><div class="lab">Capital del holding (F&F)</div><div class="big glow">${OS.capital ? OS_M(+OS.capital.equity_comprometido_airtable) : OS_M(h.capital)}</div><div class="meta">${OS.capital ? `equity aportado [Airtable] + deuda HML ${OS_K(+(OS.capital.deuda_hml_qbo != null ? OS.capital.deuda_hml_qbo : OS.capital.deuda_hml_os_activa))} [QBO] — la deuda no es capital` : 'v_capital_deployed sin datos'} · ${comp.ff.activos} deals · ARV ${OS_K(comp.ff.arv)}</div></div>` : '',
    osCanArea('rentas') ? `<div class="card"><div class="lab">Ocupación Rentas</div><div class="big">${comp.rentas.occPct}%</div><div class="meta">${comp.rentas.ocupadas}/${comp.rentas.unidades} unidades · ${comp.rentas.casas} casas</div></div>` : '',
    osCanArea('rentas') ? `<div class="card"><div class="lab">Ingresos del mes · ${comp.mb.label}</div><div class="big up">${OS_M(comp.rentas.ingresos)}</div><div class="meta">renta del mes (tag Mes/Año)</div>${osMonthBadge(comp.mb.from.slice(0, 7))}</div>` : '',
    (osCanArea('operacion') || osCanArea('rentas')) ? `<div class="card"><div class="lab">Cobranza operativa</div><div class="big down">${OS_M(h.deudaCobranza)}</div><div class="meta">contrato − plata real · ${comp.cobranza.rows.length} casas · A/R contable [QBO]: ${(() => { const ar = (OS.qbCache || []).find(x => x.report === 'balance' && x.label === 'Total Accounts Receivable'); return ar ? OS_M(+ar.value) : 'sin libros'; })()}</div></div>` : '',
  ].join('');
  const areaCards = [
    osCanArea('operacion') ? `<div class="card unit" data-osnav="/operacion"><div class="ico">${osIcon('settings', { size: 26 })}</div><div class="un">Operación</div><div class="ut">${OS_AREAS.operacion.tag}</div><div class="kv"><span>Deuda cobranza</span><b class="down">${OS_K(h.deudaCobranza)}</b></div><div class="go">Abrir →</div></div>` : '',
    osCanArea('contable') ? `<div class="card unit" data-osnav="/contable"><div class="ico">${osIcon('notebook', { size: 26 })}</div><div class="un">Contable</div><div class="ut">${OS_AREAS.contable.tag}</div><div class="kv"><span>Overhead FF real</span><b class="warn">${OS_M(OS.ffOverhead || 0)}</b></div><div class="go">Abrir →</div></div>` : '',
    `<div class="card unit" data-osnav="/holding"><div class="ico">${osIcon('chart', { size: 26 })}</div><div class="un">Dashboard del Holding</div><div class="ut">LOS 5 NÚMEROS DE CADA EMPRESA</div><div class="kv"><span>Consolidado</span><b>EBITDA · cash · D/E · equity · anomalías</b></div><div class="go">Abrir →</div></div>`,
    `<div class="card unit" data-osnav="/mapa"><div class="ico">${osIcon('map', { size: 26 })}</div><div class="un">Mapa de Conexiones</div><div class="ut">DE DÓNDE SALE CADA NÚMERO</div><div class="kv"><span>Linaje de datos</span><b>viene → número → alimenta</b></div><div class="go">Abrir →</div></div>`,
  ].join('');
  // Cerebro del Holding = transversal (mezcla datos de todas las empresas) → solo admin
  const brain = isAdm ? `<div class="card brain"><div class="bh"><div class="orb"></div><div><b>Cerebro del Holding</b><span>ANÁLISIS TRANSVERSAL · REGLAS</span></div></div>
        ${insights.slice(0, 5).map(i => `<div class="insight"><div class="ic ${i.sev === 'critical' ? 'r' : i.sev === 'warning' ? 'y' : 'b'}">●</div><div class="tx">${i.tx}<span class="tag">${i.tag}${i.impact ? ' · ' + OS_M(i.impact) : ''}</span>${i.sev === 'critical' && i.accion && window.kitNext ? kitNext('', i.accion, i.quien) : ''}</div></div>`).join('')}
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
        <div class="card unit" data-osnav="/ia"><div class="ico">${osIcon('factory')}</div><div class="un">IA</div><div class="ut">Fábrica de herramientas · IA en vivo</div><div class="kv"><span>Contá una tarea</span><b>y sale una herramienta</b></div><div class="kv"><span>Publicadas</span><b>Galería</b></div><div class="go">Abrir IA →</div></div>
      </div>
      <div class="grid k2" style="margin-top:16px">${areaCards}</div></div>
      ${brain}
    </div>`;
}

// ─── NIVEL 2 · EMPRESA ───
function osEmpresa(comp) {
  const e = OS_EMPRESAS[OS.route.empresa]; const emp = OS.route.empresa;
  if (emp === 'ia') return window.osiaView ? osiaView() : `<div class="empty">Módulo IA no cargado (os/os-ia.js)</div>`;
  const isFF = emp === 'fix-and-flip', isR = emp === 'rentas', isRemo = emp === 'remodelacion', isEdu = emp === 'educacion';
  const kpis = isFF ? [['Deals activos', comp.ff.activos, `de ${comp.ff.deals} totales`], ['Capital desplegado', OS_M(comp.ff.capital), 'all-in (compra+remod+holding)'], ['ARV portafolio', OS_M(comp.ff.arv), ''], ['Alertas', comp.ff.alertas || '—', 'mismo conteo que el Command Center']]
    : isR ? [['Ocupación', comp.rentas.occPct + '%', `${comp.rentas.ocupadas}/${comp.rentas.unidades}`], ['Ingresos/mes', OS_M(comp.rentas.ingresos), comp.mb.label], ['Casas', comp.rentas.casas, ''], ['Deuda cobranza', OS_M(comp.cobranza.total), 'contrato − real']]
    : isRemo ? [['Obras activas', comp.remodel.activas, `de ${comp.remodel.obras} totales`], ['Avance promedio', comp.remodel.avance + '%', 'de las obras'], ['Utilidad finalizadas', OS_M(comp.remodel.gananciaFinal), 'realizada (obras terminadas)'], ['En curso (proyectado)', OS_M(comp.remodel.gananciaEnCurso), `${comp.remodel.enCursoN} obras · NO final`]]
    : isEdu ? (comp.educacion ? [['Alumnos activos', comp.educacion.activos, `${comp.educacion.conPlan} con plan`], ['Nuevos (30d)', comp.educacion.nuevos, ''], ['Antigüedad prom.', comp.educacion.antiguedad + 'd', 'en el programa'], ['Con plan activo', comp.educacion.conPlan, `de ${comp.educacion.activos}`]] : [['Sin datos', '—', 'no hay snapshot de educación cargado']])
    : [['—', '—', 'datos próximamente']];
  return `<h1 style="display:flex;align-items:center;gap:9px">${osIco(e.icon, { size: 24 })} ${e.name} <span>· Empresa</span></h1><div class="sub">${e.tag} · <a style="cursor:pointer;color:var(--a2)" data-osnav="/mapa">${osIcon('map', { size: 13 })} Mapa de Conexiones (de dónde sale cada número) →</a></div>
    <div class="grid k4">${kpis.map(k => `<div class="card" title="${k[0]}"><div class="lab">${k[0]}</div><div class="big">${k[1]}</div><div class="meta">${k[2]}</div></div>`).join('')}</div>
    <div class="chart-h" style="margin:24px 4px 12px"><div class="t">Apps de ${e.name}</div><div class="k">clic para abrir</div></div>
    <div class="grid k3">${e.apps.map(a => `<div class="card app-card" ${a.soon ? '' : `onclick="${a.fn}"`}><div class="ai">${osIco(a.icon, { size: 19 })}</div><div style="flex:1;min-width:0"><div class="an" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${a.name}</div><div class="at">${a.soon ? 'Fase 2' : 'Abrir app'}</div></div>${a.soon ? '<span class="soon">pronto</span>' : ''}</div>`).join('')}</div>`;
}

// ─── ÁREA · OPERACIÓN ───
function osOperacion(comp) { return opsPanel(comp); }
function osDraftCobro(casa, deuda) { osAsk(`Redactá un mensaje de cobro cordial pero firme para el inquilino de ${casa}, que debe ${OS_M(deuda)} este mes. Recordale el saldo, ofrecé un plan si hace falta, y pedí confirmación de pago. Español neutro.`); }
window.osDraftCobro = osDraftCobro;

// ─── ÁREA · CONTABLE ───
function osContable(comp) {
  const capRows = OS.investors.filter(x => !/flipping\s*rentals/i.test(x.name || '')); // sin la propia empresa (18, no 19)
  // Veredicto arriba de todo, derivado del Sabueso: si el Contable (CT) ya corrió usa sus descuadres abiertos (con $ de impacto); si no, los findings activos críticos/altos del Sabueso general.
  let veredicto = '';
  if (window.kitVerdict) {
    const ctAb = (window.CT && CT.loaded) ? (CT.db || []).filter(f => ['abierto', 'marcado_contadora', 'ajuste_propuesto'].includes(f.estado) && f.severidad !== 'info') : null;
    const ab = ctAb != null ? ctAb : (OS.sabueso || []).filter(x => x.active !== false && (x.severidad === 'critica' || x.severidad === 'alta'));
    const monto = ctAb != null ? ctAb.reduce((s, f) => s + (+f.impacto_usd || 0), 0) : 0;
    veredicto = ab.length
      ? kitVerdict('revisar', ab.length + (ab.length === 1 ? ' descuadre abierto' : ' descuadres abiertos') + (monto ? ' · ' + kitMoney(monto) + ' sin conciliar' : ''), 'Revisá el Sabueso Contable (abajo), ordenado por impacto en plata — el norte es cero.')
      : kitVerdict('go', 'Libros cuadrando', 'Sin descuadres abiertos del Sabueso — norte de cero sostenido.');
  }
  return `<h1 style="display:flex;align-items:center;gap:9px">${osIcon('notebook', { size: 24 })} Contable <span>· QuickBooks + Conciliación</span></h1><div class="sub">P&L / balance / cashflow de QuickBooks, conciliación Airtable↔QuickBooks y cap table de inversionistas.</div>
    ${veredicto}
    ${window.ctSabuesoBlock ? ctSabuesoBlock(comp) : ''}
    <div class="grid k4">
      <div class="card"><div class="lab">Ingresos rentas (mes)</div><div class="big up">${OS_M(comp.rentas.ingresos)}</div><div class="meta">renta del mes (tag Mes/Año) · ${comp.mb.label}</div>${osMonthBadge(comp.mb.from.slice(0, 7))}</div>
      <div class="card"><div class="lab">Overhead FF real</div><div class="big warn">${OS_M(OS.ffOverhead || 0)}</div><div class="meta">equipo + plataformas F&F (Airtable)</div></div>
      <div class="card"><div class="lab">Intereses HML reales</div><div class="big warn">${OS_M(OS.ffIntereses || 0)}</div><div class="meta">pagos fechados (Airtable)</div></div>
      <div class="card"><div class="lab">Deuda de cobranza</div><div class="big down">${OS_M(comp.cobranza.total)}</div><div class="meta">por cobrar (rentas)</div></div>
    </div>
    <div class="card" style="margin-top:16px"><div class="chart-h"><div class="t">P&L del holding (v_holding_pnl)</div><div class="k">una definición por métrica · fuente: espejos verificados</div></div>
      <div class="overx"><table class="ptable"><thead><tr><th>Empresa</th><th style="text-align:right">Ingreso</th><th style="text-align:right">Costo real</th><th style="text-align:right">Overhead</th><th style="text-align:right">Utilidad bruta</th><th style="text-align:right">EBITDA</th><th style="text-align:right">FF realizado / inyectado</th></tr></thead><tbody>
      ${(OS.pnl || []).map(r => {
        const nm = { remodelacion: 'Remodelación', fix_flip: 'Fix & Flip', rentas: 'Rentas', educacion: 'Educación', consolidado: 'CONSOLIDADO' }[r.empresa] || r.empresa;
        const v = x => x == null ? '—' : OS_M(+x);
        const cls = x => x == null ? '' : (+x >= 0 ? 'up' : 'down');
        const ffx = (r.realizado == null && r.inyectado == null) ? '—' : (v(r.realizado) + ' / ' + v(r.inyectado));
        const bold = r.empresa === 'consolidado' ? 'font-weight:800;border-top:2px solid var(--line);background:color-mix(in srgb, var(--a2) 5%, transparent)' : '';
        const num = 'text-align:right';
        return `<tr style="${bold}"><td>${nm}</td><td style="${num}">${v(r.ingreso)}</td><td style="${num}">${v(r.costo_real)}</td><td class="down" style="${num}">${v(r.overhead)}</td><td class="${cls(r.utilidad_bruta)}" style="${num}">${v(r.utilidad_bruta)}</td><td class="${cls(r.ebitda)}" style="${num}">${v(r.ebitda)}</td><td style="${num}">${ffx}</td></tr>`;
      }).join('')}
      </tbody></table></div>
      <div class="meta" style="margin-top:8px">FF: "realizado" = casas con ciclo cerrado (vendida/refi/rentada); "inyectado" = cash en casas vivas (no es pérdida realizada).</div>
    </div>
    ${osConcilBlock(comp)}
    <div class="grid k2" style="margin-top:16px">
      <div class="card"><div class="chart-h"><div class="t">Conciliación Airtable ↔ QuickBooks</div><div class="k">SOLO LECTURA</div></div>
        <div class="overx"><table class="ptable"><thead><tr><th>Concepto</th><th>Estado</th><th style="text-align:right">Impacto</th></tr></thead><tbody>
        <tr><td>Overhead FF (equipo + plataformas) — espejo Airtable</td><td><span class="badge b-ok">Real</span></td><td class="down" style="text-align:right">${OS_M(OS.ffOverhead || 0)}</td></tr>
        <tr><td>Intereses HML pagados (reales, fechados)</td><td><span class="badge b-ok">Real</span></td><td class="down" style="text-align:right">${OS_M(OS.ffIntereses || 0)}</td></tr>
        <tr><td>Obligación a inversionistas (pasivo / cap table)</td><td><span class="badge b-warn">Pendiente</span></td><td style="text-align:right">—</td></tr>
        <tr><td>Ingresos de rentas (plata real)</td><td><span class="badge b-ok">Conciliado</span></td><td class="up" style="text-align:right">${OS_M(comp.rentas.ingresos)}</td></tr>
        </tbody></table></div>
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
// fuente EFECTIVA de un número según el Mapa de Conexiones (reasignable en /mapa sin tocar código)
function osLineageRow(empresa, sistema, dato) {
  return (OS.lineage || []).find(x => x.empresa === empresa && x.sistema === sistema && x.etiqueta === dato) || null;
}
window.osLineageRow = osLineageRow;
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
  // BUG 14-jul: la resolución anclaba SOLO en la casa de Rentas por dirección — si el slug venía
  // de FF ("Austin, Texas") y Rentas escribe "Austin, TX", prop=null → pid=null → los paneles de
  // Rentas y Remodelación salían vacíos con la casa rentada (Childress). Fix: 1ª pasada por
  // dirección en CUALQUIER fuente → property_id canónico; 2ª pasada re-resuelve TODO por property_id.
  let prop = (OS.props || []).find(p => osHouseKey(p.address_normalized || p.name) === key) || null;
  let ff = (comp.ff.list || []).find(d => osHouseKey(d.address_norm || d.address) === key) || null;
  let remodel = (OS.remodel || []).find(r => osHouseKey(r.address) === key) || null;
  let p360 = (OS.p360 || []).find(r => osHouseKey(r.address) === key) || null;
  const pid = (prop && prop.property_id) || (ff && ff.property_id) || (remodel && remodel.property_id) || (p360 && p360.property_id) || null;
  if (pid) {
    prop = prop || (OS.props || []).find(p => p.property_id === pid) || null;
    ff = ff || (comp.ff.list || []).find(d => d.property_id === pid) || null;
    remodel = remodel || (OS.remodel || []).find(r => r.property_id === pid) || null;
    p360 = p360 || (OS.p360 || []).find(r => r.property_id === pid) || null;
  }
  const addr = (ff && ff.address) || (remodel && remodel.address) || (prop && prop.name) || slug;
  const port = (pid && (OS.ffPort || []).find(r => r.property_id === pid))
    || (ff && (OS.ffPort || []).find(r => r.address_norm === ff.address_norm)) || null;
  // ── Rentas: mensuales de FF·Propiedades (renta/gastos actuales) + detalle del espejo Rentas si existe ──
  const ffRenta = (ff && +ff.renta_mensual > 0) ? +ff.renta_mensual : null;
  const ffGastos = (ff && ff.gastos_mensuales != null && +ff.renta_mensual > 0) ? +ff.gastos_mensuales : null;
  // flujo: UNA definición — v_ff_portafolio.flujo_mes (la misma del Command Center); fallback renta − gastos
  const flujoMes = (port && port.flujo_mes != null) ? +port.flujo_mes
    : (ffRenta != null && ffGastos != null) ? ffRenta - ffGastos : null;
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
    rentas = { prop, detalle: true, totalU, occU, occPct: totalU ? Math.round(occU / totalU * 100) : 0, occRent: Math.round(occRent), cobrado: Math.round(cobrado), deuda: Math.round(Math.max(0, occRent - cobrado)) };
  }
  // 🗺 LECTURA EN VIVO: la fuente de "Renta mensual actual" la decide el Mapa de Conexiones
  // (dual-source conocido: FF·Propiedades·renta_mensual [default] vs Rentas·Unidades renta
  // objetivo ocupadas). Reasignar en /mapa cambia esto sin tocar código; reversible + auditado.
  const linRenta = (typeof osLineageRow === 'function') ? osLineageRow('Fix & Flip', 'Ficha de Casa', 'Renta mensual actual') : null;
  const rentaViva = (linRenta && linRenta.base === 'Rentas')
    ? { v: (rentas && rentas.detalle && rentas.occRent > 0) ? rentas.occRent : null, chip: 'Rentas·Unidades mapa' }
    : { v: ffRenta, chip: 'FF·Propiedades' };
  if (ffRenta != null || flujoMes != null || rentaViva.v != null) rentas = Object.assign(rentas || { detalle: false }, { renta: rentaViva.v, rentaChip: rentaViva.chip, ffRenta, ffGastos, flujoMes, pagoDeuda: (port && port.pago_deuda_mes != null) ? +port.pago_deuda_mes : null });
  return { key, slug, addr, ff, remodel, prop, rentas, p360, port };
}
// ── UNA sola cadena de lectura para la Ficha (tarjeta y fila espejo leen ESTO — jamás $0 sobre dato existente) ──
function osFichaNums(m) {
  const compra = (m.p360 && m.p360.compra != null) ? +m.p360.compra
    : (m.ff && m.ff.purchase_price != null) ? +m.ff.purchase_price : null;
  const rehabReal = (m.p360 && m.p360.rehab_real != null) ? +m.p360.rehab_real
    : (m.ff && +m.ff.remodel_real > 0) ? +m.ff.remodel_real : null;   // "Costo Remodelación Real" (Airtable directo)
  const rehabEst = (m.ff && +m.ff.remodel_est > 0) ? +m.ff.remodel_est : null;
  const draws = (m.port && +m.port.total_draws > 0) ? +m.port.total_draws : null;
  // all-in: compra + Total Draws → compra + rehab REAL → compra + rehab ESTIMADA (siempre rotulado)
  let allIn = null, allInSub = '', faltan = false;
  if (compra != null && draws != null) { allIn = compra + draws; allInSub = `compra ${OS_M(compra)} + draws ${OS_M(draws)}`; }
  else if (compra != null && rehabReal != null) { allIn = compra + rehabReal; allInSub = `compra ${OS_M(compra)} + rehab real ${OS_M(rehabReal)} <span style="color:var(--amber)">(faltan draws)</span>`; faltan = true; }
  else if (compra != null && rehabEst != null) { allIn = compra + rehabEst; allInSub = `compra ${OS_M(compra)} + rehab ESTIMADA ${OS_M(rehabEst)} <span style="color:var(--amber)">(faltan draws)</span>`; faltan = true; }
  else if (compra != null) { allIn = compra; allInSub = `compra ${OS_M(compra)} <span style="color:var(--amber)">(sin rehab/draws cargados)</span>`; faltan = true; }
  const arv = (m.ff && +m.ff.arv > 0) ? +m.ff.arv : (m.p360 && +m.p360.arv > 0 ? +m.p360.arv : null);
  const equity = (arv != null && allIn != null) ? arv - allIn : null;
  const rehabMostrar = draws != null ? { v: draws, lbl: 'draws desembolsados' }
    : rehabReal != null ? { v: rehabReal, lbl: 'rehab real (faltan draws)' }
    : rehabEst != null ? { v: rehabEst, lbl: 'rehab estimada' } : null;
  return { compra, rehabReal, rehabEst, draws, allIn, allInSub, faltan, arv, equity, rehabMostrar };
}
function osCasaInsights(m) {
  const ins = [];
  if (m.ff && m.ff.dq && m.ff.dq.revisar) ins.push({ s: 'r', t: `Error de datos: all-in ${OS_M(m.ff.allIn)} = ${Math.round(m.ff.allInPct * 100)}% del ARV (imposible). Revisar la carga en Airtable (Draws).` });
  if (m.ff && m.ff.dq && m.ff.dq.confiable && m.ff.deficit < -20000) ins.push({ s: 'r', t: `Déficit de ${OS_M(-m.ff.deficit)} (regla: OK si flujo+ y acumulado < $20k). Planear recuperación (refi/venta).`, accion: 'armar plan de refi o venta', quien: 'Juan' });
  if (m.ff && Number(m.ff.appraisal) > 0 && m.ff.arv > 0 && Number(m.ff.appraisal) > m.ff.arv * 1.05) ins.push({ s: 'y', t: `Appraisal ${OS_M(m.ff.appraisal)} supera el ARV ${OS_M(m.ff.arv)} — revisar (afecta refi y equity).` });
  if (m.remodel && m.remodel.proceso !== 'Finalizado') ins.push({ s: 'y', t: `Obra EN CURSO (${OS_E(m.remodel.proceso || 's/estado')}, ${Math.round(Number(m.remodel.avance_pct || 0))}% avance) — la utilidad de remodelación es preliminar, no final.` });
  if (m.rentas && m.rentas.deuda > 200) ins.push({ s: 'r', t: `Deuda de cobranza ${OS_M(m.rentas.deuda)} este mes (esperado ${OS_M(m.rentas.occRent)}, cobrado ${OS_M(m.rentas.cobrado)}).`, accion: 'gestionar cobro con el inquilino y registrar el pago', quien: 'Carlos' });
  if (/childress/i.test(m.addr)) ins.push({ s: 'y', t: `Contrato/documentación pendiente de firma (dato del negocio). Verificar antes de avanzar.` });
  return ins;
}
function osCasa(comp) {
  const m = osCasaMatch(OS.route.slug, comp);
  const fn = osFichaNums(m);   // UNA cadena de lectura: tarjeta y fila espejo muestran LO MISMO
  const kv = (l, v, cls) => `<div class="kv"><span>${l}</span><b class="${cls || ''}">${v}</b></div>`;
  if (!m.ff && !m.remodel && !m.rentas) {
    return `<div class="empty" style="padding:80px 40px"><div>${osIcon('house', { size: 48, color: 'var(--mut2)' })}</div><h1 style="margin-top:12px">Casa no encontrada</h1><div class="sub">No hay datos para <b>${OS_E(OS.route.slug)}</b> en Fix & Flip, Remodelación ni Rentas.</div><button class="cbtn" style="padding:10px 18px" data-osnav="/">← Volver al Panel Global</button></div>`;
  }
  const stageK = m.ff ? m.ff.stage : (m.remodel && m.remodel.proceso === 'Finalizado' ? 'refinanciada' : (m.remodel ? 'en_rehab' : (m.rentas ? 'rentada' : null)));
  const stageLbl = m.ff ? (OS_STAGE_LBL[m.ff.stage] || m.ff.stage) : (m.remodel ? m.remodel.proceso : (m.rentas ? 'Rentada' : '—'));
  const strat = m.ff ? (m.ff.strategy === 'flip' ? 'FLIP' : m.ff.strategy === 'hold' ? 'HOLD' : '') : '';
  const dqBadge = (m.ff && m.ff.dq && m.ff.dq.revisar) ? `<span class="ff-dqx">${osIcon('alert')} dato a revisar</span>` : '';
  const insights = osCasaInsights(m);
  const esRentada = m.ff ? /rentada|refinanciada/.test(m.ff.stage || '') : !!(m.rentas && m.rentas.detalle);
  const faltaDato = `<span style="color:var(--amber)">faltan datos</span>`;
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
  const fichaPid = (m.p360 && m.p360.property_id) || (m.prop && m.prop.property_id) || (m.ff && m.ff.property_id) || null;
  // ⓘ "de dónde sale": abre la cadena base·tabla·columna del Mapa de Conexiones (data_lineage_map)
  const LIN = d => window.osLinI ? ' ' + osLinI('Fix & Flip', 'Ficha de Casa', d) : '';
  return `<h1>${osIcon('house')} ${OS_E(ffShortAddr(m.addr))} <span>· Ficha de casa</span></h1>
    <div class="sub">${OS_E(m.addr)} — ciclo de vida de la casa a través de las empresas (Fuente: Airtable en vivo).${fichaPid && window.reportCasa ? ` <button class="cbtn" style="margin-left:8px" onclick="reportCasa('${fichaPid}')">${osIcon('file')} Reporte PDF de la casa</button>` : ''}</div>
    <div class="grid k4">
      <div class="card"><div class="lab">Etapa actual${LIN('Etapa actual')}</div><div class="big" style="font-size:20px">${stageLbl}</div><div class="meta">${strat ? strat + ' · ' : ''}${m.ff ? 'Fix & Flip' : m.remodel ? 'Remodelación' : 'Rentas'} ${dqBadge}</div></div>
      <div class="card"><div class="lab">All-in (compra + draws)${LIN('All-in')}</div><div class="big">${fn.allIn != null ? OS_M(fn.allIn) : '—'}</div><div class="meta">${fn.allInSub || (m.ff ? 'sin datos de compra' : 'sin deal F&F')}</div></div>
      <div class="card"><div class="lab">ARV${LIN('ARV')}</div><div class="big">${fn.arv != null ? OS_M(fn.arv) : '—'}</div><div class="meta">${m.ff && m.ff.appraisal ? 'appraisal ' + OS_M(m.ff.appraisal) : ''}</div></div>
      <div class="card"><div class="lab">Equity incorporado${LIN('Equity incorporado')}</div><div class="big ${fn.equity != null ? (fn.equity >= 0 ? 'up' : 'down') : ''}">${fn.equity != null ? OS_M(fn.equity) : '—'}</div><div class="meta">ARV − all-in (misma cadena que la tarjeta)${fn.faltan ? ' · <span style="color:var(--amber)">' + osIcon('alert') + ' con datos incompletos</span>' : ''}${m.port && !m.port.faltan_draws && m.port.deficit < 0 ? ` · cash en hold ${OS_M(+m.port.deficit)} (a recuperar, no es pérdida)` : ''}</div></div>
    </div>
    <div class="chart-h" style="margin:22px 4px 6px"><div class="t">Ciclo de vida</div><div class="k">${cycle.map((c, i) => `<span style="color:${i <= cyIdx ? 'var(--a1)' : 'var(--mut2)'}">${i <= cyIdx ? '●' : '○'} ${c}</span>`).join(' → ')}</div></div>
    <div class="grid k2" style="margin-top:12px">
      <div class="card"><div class="chart-h"><div class="t">${osIcon('construction')} Fix & Flip</div>${m.ff ? `<a class="go" style="cursor:pointer" onclick="osOpenApp('fix-and-flip','deals')">Abrir Deals →</a>` : ''}</div>
        <div class="overx">${m.ff ? `${kv('Compra' + LIN('Compra'), fn.compra != null ? OS_M(fn.compra) : '—')}${kv('Remodelación' + LIN('Remodelación (draws)'), fn.rehabMostrar ? OS_M(fn.rehabMostrar.v) + ` <span style="font-size:10px;color:var(--mut2)">${fn.rehabMostrar.lbl}</span>` : '—')}${kv('Holding (draws)', m.ff.dr ? OS_M(m.ff.holding) : '—')}${kv('All-in', fn.allIn != null ? OS_M(fn.allIn) + (fn.faltan ? ' <span style="font-size:10px;color:var(--amber)">' + osIcon('alert') + ' faltan draws</span>' : '') : '—', m.ff.dq.revisar ? 'down' : '')}${kv('ARV', fn.arv != null ? OS_M(fn.arv) : '—')}${kv('Appraisal', m.ff.appraisal ? OS_M(m.ff.appraisal) : '—')}${kv('MAO (ARV×75% − costos)', fn.arv != null ? OS_M(fn.arv * 0.75 - (fn.rehabMostrar ? fn.rehabMostrar.v : 0) - (m.ff.dr ? m.ff.holding : 0)) : '—')}${kv('Cash-out', m.ff.cashout ? OS_M(m.ff.cashout) : '—')}${kv('HML (pago)', m.ff.hml_payment ? OS_M(m.ff.hml_payment) : '—')}${m.ff.dq.revisar ? `<div class="meta" style="margin-top:8px;color:var(--neg)">${osIcon('alert')} all-in > 100% del ARV — dato a revisar en Airtable (probable error de carga).</div>` : ''}` : `<div class="empty" style="padding:26px">Sin deal en Fix & Flip.</div>`}</div></div>
      <div class="card"><div class="chart-h"><div class="t">${osIcon('hammer')} Ficha de obra</div>${m.remodel ? `<a class="go" style="cursor:pointer" onclick="osOpenApp('remodelacion','remodel-pro')">Abrir Estimador →</a>` : ''}</div>
        <div class="overx">${m.remodel ? `${remoEnCurso ? `<div class="meta" style="margin-bottom:8px"><span class="ff-dqx" style="background:var(--amber-bg);color:var(--amber);border-color:color-mix(in srgb,var(--amber) 32%,transparent)">${osIcon('loader')} obra en curso · estimado/utilidad preliminar (no final)</span></div>` : ''}${kv('Estado · Avance', `${OS_E(remoR.proceso || '—')} · ${Math.round(Number(remoR.avance_pct || 0))}%`)}${kv('Líder', OS_E((m.p360 && m.p360.lider) || remoR.lider || '—'))}${kv('Inicio → estimada → real', `${OS_E(remoR.fecha_inicio || 's/f')} → ${OS_E(remoR.fecha_estimada_fin || 's/f')} → ${OS_E(remoR.fecha_real_fin || 'en curso')}`)}${kv('Retraso', remoRetraso != null ? `${remoRetraso} días${remoR.desviacion_label ? ' · ' + OS_E(remoR.desviacion_label) : ' · sin nota'}` : (remoEnCurso ? 'en curso' : '—'), remoRetraso > 0 ? 'down' : '')}${kv('Draws Ingreso (inversionista)', OS_M(remoDraws))}<div class="kv"><span>Material (est aprox → real)</span><b>${OS_M(estMat)} → ${OS_M(remoMat)}${devBadge(estMat, remoMat)}</b></div><div class="kv"><span>Trabajadores (est aprox → real)</span><b>${OS_M(estLab)} → ${OS_M(remoLab)}${devBadge(estLab, remoLab)}</b></div>${kv('Presupuesto · % gastado', `${OS_M(remoPresup)} · ${remoPctGast}%`)}${kv('Por gastar', remoR.monto_por_gastar != null ? OS_M(remoR.monto_por_gastar) : '—')}${kv(remoEnCurso ? 'Utilidad (preliminar)' : 'Utilidad', OS_M(remoUtil) + (remoRent != null ? ` · ${remoRent.toFixed(1)}%` : ''), remoEnCurso ? 'warn' : (remoUtil >= 0 ? 'up' : 'down'))}<div class="meta" style="margin-top:8px;font-size:10px">Estimado material/MO = aprox (presupuesto × ratio real ${Math.round(matRatio*100)}%/${Math.round((1-matRatio)*100)}%). Real y desvío alimentan la calibración del Estimador.</div>` : ((m.ff && (/rentada|refinanciada|vendida|en_venta/.test(m.ff.stage || '') || fn.rehabReal != null || fn.draws != null)) ? `<div style="padding:14px 4px">${kv('Estado', 'Obra finalizada', 'up')}${fn.rehabReal != null ? kv('Costo de remodelación (real)', OS_M(fn.rehabReal)) : (fn.rehabEst != null ? kv('Remodelación (estimada)', OS_M(fn.rehabEst) + ' <span style="font-size:10px;color:var(--amber)">estimada</span>') : '')}${fn.draws != null ? kv('Draws desembolsados', OS_M(fn.draws)) : ''}<div class="meta" style="margin-top:8px">La casa ya pasó la etapa de obra (${OS_E(stageLbl)}). No hay registro de esta obra en la base de Remodelación — el resumen sale de Fix & Flip.</div></div>` : `<div class="empty" style="padding:26px">Sin obra en Remodelación.</div>`)}</div></div>
    </div>
    <div class="grid k2" style="margin-top:16px">
      <div class="card"><div class="chart-h"><div class="t">${osIcon('house')} Rentas</div>${m.rentas ? `<a class="go" style="cursor:pointer" onclick="osOpenApp('rentas','property-manager')">Abrir Property Manager →</a>` : ''}</div>
        <div class="overx">${m.rentas ? `${m.rentas.renta != null ? kv('Renta mensual actual' + LIN('Renta mensual actual'), OS_M(m.rentas.renta) + ` <span style="font-size:10px;color:var(--mut2)">${OS_E(m.rentas.rentaChip)}</span>`) : (esRentada ? kv('Renta mensual actual' + LIN('Renta mensual actual'), faltaDato) : '')}${m.rentas.ffGastos != null ? kv('Gastos mensuales' + LIN('Gastos mensuales'), OS_M(m.rentas.ffGastos)) : (esRentada ? kv('Gastos mensuales', faltaDato) : '')}${m.rentas.flujoMes != null ? kv('Flujo mensual' + LIN('Flujo mensual'), OS_M(m.rentas.flujoMes), m.rentas.flujoMes >= 0 ? 'up' : 'down') : (esRentada ? kv('Flujo mensual', faltaDato) : '')}${m.rentas.pagoDeuda != null ? kv('Pago de deuda /mes', OS_M(m.rentas.pagoDeuda)) : ''}${m.rentas.detalle ? `${kv('Unidades rentables', m.rentas.totalU)}${kv('Ocupación', m.rentas.occPct + '% (' + m.rentas.occU + '/' + m.rentas.totalU + ')')}${kv('Renta objetivo (ocupadas)', OS_M(m.rentas.occRent))}${kv('Cobrado (plata real · ' + comp.mb.label + ')', OS_M(m.rentas.cobrado), 'up')}${kv('Deuda de cobranza', OS_M(m.rentas.deuda), m.rentas.deuda > 200 ? 'down' : '')}` : `<div class="meta" style="margin-top:8px">Sin espejo en la base de Rentas (detalle de unidades/cobranza no disponible) — los mensuales salen de FF·Propiedades.</div>`}` : (esRentada ? `<div class="empty" style="padding:26px;color:var(--amber)">${osIcon('alert')} La etapa dice <b>${OS_E(stageLbl)}</b> pero faltan los datos de renta en Airtable (FF·Propiedades: Renta mensual actual / Gastos mensuales) — es un dato FALTANTE, no "sin rentas".</div>` : `<div class="empty" style="padding:26px">Todavía no está en Rentas.</div>`)}</div></div>
      <div class="card brain"><div class="bh"><div class="orb"></div><div><b>Cerebro · esta casa</b><span>INSIGHTS DE LA PROPIEDAD</span></div></div>
        ${insights.length ? insights.map(i => `<div class="insight"><div class="ic ${i.s === 'r' ? 'r' : i.s === 'y' ? 'y' : 'b'}">●</div><div class="tx">${i.t}${i.s === 'r' && i.accion && window.kitNext ? kitNext('', i.accion, i.quien) : ''}</div></div>`).join('') : '<div class="meta" style="padding:12px 0">Sin alertas para esta casa. ✓</div>'}
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
  osEnterClassic(empresaSlug ? `/${empresaSlug}` : (OS._returnTo || '/'), (e ? `${osIco(e.icon, { size: 15 })} ${e.name}` : 'Panel'), found.name || 'Sistema');
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
  return `<div class="empty" style="padding:90px 40px"><div style="font-size:54px">${osIcon('compass')}</div><h1 style="margin-top:14px">Página no encontrada</h1><div class="sub">La ruta <b>${OS_E(OS.route.path || location.pathname)}</b> no existe en Flipping Rentals OS.</div><button class="cbtn" style="padding:10px 18px;margin-top:8px" data-osnav="/">← Volver al Panel Global</button></div>`;
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
  const chip = delta == null ? '' : (mal ? ' <span class="badge b-warn">' + osIcon('alert') + ' descuadre</span>' : ' <span class="badge b-ok">✓</span>');
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
      <div class="meta" style="margin-top:8px">${osIcon('landmark')} <b>Capitalización (no mezclar con P&L):</b> QBO capitaliza las casas como ACTIVO — ${ff.capQB != null ? OS_M(ff.capQB) : '—'} en Fixed Assets + Inventory (cada casa = cuenta "Rental Property"). Por eso el neto contable (${ff.netQBall != null ? OS_M(ff.netQBall) : '—'}) difiere del operativo (${OS_M(ff.realizadoOS)}): el costo de las casas vivas está en el balance, no en el P&L. El Δ restante es la conciliación pendiente.</div></div>
    <div class="card"><div class="chart-h"><div class="t">Capa contable del holding</div><div class="k">EBITDA operativo vs Net Income QBO · umbral ${OS.concilWarn != null ? OS.concilWarn : 10}%</div></div>
      <table class="ptable"><thead><tr><th>Empresa</th><th style="text-align:right">EBITDA operativo</th><th style="text-align:right">QBO Net YTD</th><th style="text-align:right">QBO Net histórico</th></tr></thead><tbody>
      ${pnlRow('fix_flip', 'Fix & Flip')}${pnlRow('remodelacion', 'Remodelación')}${pnlRow('rentas', 'Rentas')}${pnlRow('educacion', 'Educación')}
      </tbody></table>
      <table class="ptable" style="margin-top:10px"><thead><tr><th>Remodelación: ingreso</th><th style="text-align:right">OPERATIVO</th><th style="text-align:right">QBO</th><th style="text-align:right">Δ</th></tr></thead><tbody>
      ${osConcilRow('Ingreso (draws vs libros)', remOSIngreso, remQBIncomeAll, 'monto_real finalizadas vs Total Income Structure One')}
      </tbody></table>
      <div class="meta" style="margin-top:8px">Rentas (EverHome, ${osIcon('alert')} configurada en COP) y Educación: libros sin movimientos — todo lo operativo está "fuera de libros" hasta que se carguen. Fuente: qb_report_cache (sync on-demand /qb-oauth/sync).</div></div>
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
function opsCongelada(t) { const u = t.date_updated; if (!u) return false; return (Date.now() - new Date(u).getTime()) / 86400000 > 14; }
function opsMovido7d(t) { const u = t.date_updated; if (!u) return false; return (Date.now() - new Date(u).getTime()) / 86400000 <= 7; }
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
  act.forEach(t => { const p = (t.primary_assignee || '').trim() || '(sin dueño)'; if (!P[p]) P[p] = { p, act: 0, venc: 0, urg: 0, cong: 0 }; P[p].act++; if (opsVencida(t)) P[p].venc++; if (OPS_URG.includes((t.priority || '').toLowerCase())) P[p].urg++; if (opsCongelada(t)) P[p].cong++; });
  const personas = Object.values(P).sort((a, b) => b.act - a.act);
  const cuellos = personas.filter(x => x.p !== '(sin dueño)' && x.act > (OS.sabCfg && OS.sabCfg.F2_wip ? +OS.sabCfg.F2_wip.umbral : 40));
  // por empresa
  const emp = Object.keys(OPS_EMP).map(sid => {
    const a = act.filter(t => t.space_id === sid);
    const hig = a.length ? a.filter(t => t.due_date && (t.primary_assignee || '').trim()).length / a.length : 1;
    const cong = a.length ? a.filter(opsCongelada).length / a.length : 0;
    const sinDue = a.length ? a.filter(t => !(t.primary_assignee || '').trim()).length / a.length : 0;
    const v = a.filter(opsVencida);
    // composite de FLUJO (0 malo → 1 sano): higiene alta, congelado bajo, sin-dueño bajo
    const score = 0.4 * hig + 0.35 * (1 - cong) + 0.25 * (1 - sinDue);
    const sem = score < 0.5 ? 'rojo' : score < 0.7 ? 'amarillo' : 'verde';
    // número-problema: el peor de los tres
    const probs = [{ k: 'sin fecha', v: a.filter(t => !t.due_date).length, pct: Math.round(100 * (a.filter(t => !t.due_date).length) / (a.length || 1)) }, { k: 'sin dueño', v: a.filter(t => !(t.primary_assignee || '').trim()).length, pct: Math.round(sinDue * 100) }, { k: 'congeladas', v: a.filter(opsCongelada).length, pct: Math.round(cong * 100) }].sort((x, y) => y.pct - x.pct);
    return { sid, nombre: OPS_EMP[sid], act: a.length, venc: v.length, higienePct: Math.round(hig * 100), congelPct: Math.round(cong * 100), sinDuenoN: a.filter(t => !(t.primary_assignee || '').trim()).length, problema: probs[0], score: Math.round(score * 100), sem };
  });
  // casas/listas estancadas: lista con ≥5 vencidas
  const L = {};
  venc.forEach(t => { const k = t.list_name || t.folder_name || '—'; L[k] = (L[k] || 0) + 1; });
  const estancadas = Object.entries(L).map(([k, n]) => ({ lista: k, n })).filter(x => x.n >= 5).sort((a, b) => b.n - a.n);
  // tendencia (snapshots sumados por fecha)
  const S = {};
  (OS.ckSnaps || []).forEach(s => { const d = s.snapshot_date; if (!S[d]) S[d] = { d, overdue: 0, open: 0, closed7: 0 }; S[d].overdue += +s.total_overdue || 0; S[d].open += +s.total_open || 0; S[d].closed7 += +s.total_closed_last_7d || 0; });
  const tend = Object.values(S).sort((a, b) => a.d.localeCompare(b.d)).slice(-14);
  // MÉTRICAS DE SALUD (flujo + higiene)
  const conFyD = act.filter(t => t.due_date && (t.primary_assignee || '').trim());  // higiene
  const higienePct = act.length ? Math.round(100 * conFyD.length / act.length) : 0;
  const movidos = act.filter(opsMovido7d);
  const movidoPct = act.length ? Math.round(100 * movidos.length / act.length) : 0;
  const congeladas = act.filter(opsCongelada);
  const congelPct = act.length ? Math.round(100 * congeladas.length / act.length) : 0;
  // cycle time (creación→cierre) de cerradas últimos 90d
  const cerr90 = T.filter(t => { const cierre = t.date_closed || t.date_done; return cierre && t.date_created && (Date.now() - new Date(cierre).getTime()) / 86400000 <= 90; });
  const leadDays = cerr90.map(t => ((new Date(t.date_closed || t.date_done) - new Date(t.date_created)) / 86400000)).filter(d => d >= 0).sort((a, b) => a - b);
  const cycleTime = leadDays.length ? Math.round(leadDays[Math.floor(leadDays.length / 2)]) : null;  // mediana
  const throughput = T.filter(t => t.date_done && (Date.now() - new Date(t.date_done).getTime()) / 86400000 <= 7).length;
  const propuestas = (OS.agProps || []).filter(x => !x.deleted_at && x.estado === 'propuesta');
  const dupIds = opsDuplicadas(act);
  const ccKeys = opsCasasCerradasKeys();
  const casaCerrada = act.filter(t => opsEnCasaCerrada(t, ccKeys));
  return { act, venc, vencBrutas, gestion, longterm, porConfig, ruidoN, sinD, urg, sinF, hoy, pctT, personas, cuellos, emp, estancadas, tend, propuestas, dupIds, casaCerrada, higienePct, movidoPct, congelPct, congeladas, cycleTime, throughput, cerradas7: throughput, totalBruto: (OS.ckTasks || []).length };
}
function opsGo(view, filtro) {
  OS.opsView = view;
  if (filtro !== undefined) OS.opsF = Object.assign({ emp: '', persona: '', tipo: '', q: '', sort: 'due', dir: 1 }, filtro || {});
  osRender();
}
function opsSetF(k, v) { OS.opsF = OS.opsF || { emp: '', persona: '', tipo: '', q: '', sort: 'due', dir: 1 }; OS.opsF[k] = v; osRender(); }
function opsSort(col) { const f = OS.opsF || {}; if (f.sort === col) f.dir = -f.dir; else { f.sort = col; f.dir = 1; } OS.opsF = f; osRender(); }
window.opsGo = opsGo; window.opsSetF = opsSetF; window.opsSort = opsSort;

function opsSemChip(sem) { return kitStatusDot(sem === 'rojo' ? 'bad' : sem === 'amarillo' ? 'warn' : 'ok'); }
function opsCeoView(o) {
  const kpi = (lab, val, meta, sub, good) => `<div class="card"><div class="lab">${lab}</div><div class="big ${good == null ? '' : good ? 'up' : 'down'}">${val}</div><div class="meta">${meta}${sub ? ' · ' + sub : ''}</div></div>`;
  const kpis = `<div class="grid k4">
    ${kpi('Higiene (fecha+dueño)', o.higienePct + '%', 'meta 100%', 'tablero configurado', o.higienePct >= 60)}
    ${kpi('Flujo (movido 7d)', o.movidoPct + '%', 'congelado ' + o.congelPct + '%', 'antídoto del estancamiento', o.movidoPct >= 40)}
    ${kpi('Tiempo de ciclo', (o.cycleTime != null ? o.cycleTime + 'd' : '—'), 'meta ≤30d', 'creación→cierre', o.cycleTime != null && o.cycleTime <= 30)}
    ${kpi('Throughput', o.throughput + '/sem', 'cerradas 7d', '', null)}
  </div>`;
  const empCards = o.emp.map(e => `<div class="card" style="cursor:pointer" onclick="opsGo('pm',{emp:'${e.sid}'})"><div class="lab">${opsSemChip(e.sem)} ${e.nombre} <span style="opacity:.5;font-weight:400">· salud ${e.score}</span></div><div style="display:flex;align-items:baseline;gap:8px;margin:4px 0"><div class="big">${e.act}</div><div class="down" style="font-size:13px;font-weight:700">${e.problema.v} ${e.problema.k} (${e.problema.pct}%)</div></div><div class="meta">higiene ${e.higienePct}% · congeladas ${e.congelPct}% · sin dueño ${e.sinDuenoN}</div></div>`).join('');
  // 3 DECISIONES por impacto ($/inversionista primero)
  const dec = [];
  const slaPlata = (OS.sabueso || []).filter(x => x.categoria === 'sla' && x.active !== false);
  if (slaPlata.length) dec.push({ imp: 3, tx: `<b>${slaPlata.length} tareas que TOCAN PLATA/inversionista</b> vencidas o congeladas — escalar hoy (mayor impacto $).`, f: { tab: 'sabueso', cat: 'sla' } });
  const peorEmp = [...o.emp].sort((a, b) => a.score - b.score)[0];
  if (peorEmp && peorEmp.sem === 'rojo') dec.push({ imp: 2, tx: `<b>${peorEmp.nombre}</b> en rojo: ${peorEmp.problema.v} ${peorEmp.problema.k} (${peorEmp.problema.pct}%) y ${peorEmp.congelPct}% congelado — sesión de higiene del tablero.`, f: { emp: peorEmp.sid } });
  const topWip = o.personas.filter(x => x.p !== '(sin dueño)').sort((a, b) => b.act - a.act)[0];
  if (topWip && topWip.act > 60) dec.push({ imp: 2, tx: `<b>${OS_E(topWip.p)}</b> sobrecargado: ${topWip.act} activas (${topWip.cong} congeladas) — redistribuir.`, f: { persona: topWip.p } });
  const critN = (OS.sabueso || []).filter(x => x.severidad === 'critica').length;
  if (critN) dec.push({ imp: 1, tx: `<b>${critN} anomalías CRÍTICAS</b> del Sabueso (estado terminal abierto, SLA) — revisar.`, f: { tab: 'sabueso' } });
  if (o.propuestas.length) dec.push({ imp: 1, tx: `<b>${o.propuestas.length} propuestas</b> del Ops Brain esperando aprobación (en 3 lotes).`, f: { tab: 'pm', tipo: 'propuestas' } });
  dec.sort((a, b) => b.imp - a.imp);
  const decHtml = dec.slice(0, 3).map((d, i) => `<div class="krow" style="cursor:pointer;padding:10px 0" onclick='${d.f.tab === 'sabueso' ? `opsGo("sabueso",${JSON.stringify(d.f)})` : `opsGo("pm",${JSON.stringify(d.f)})`}'><span>${i + 1}. ${d.tx}</span><b style="opacity:.5">→</b></div>`).join('') || '<div class="meta" style="padding:10px 0">Nada crítico esta semana ✓</div>';
  // mini-tendencia congeladas/vencidas (snapshots)
  const tend = o.tend.slice(-10);
  const maxO = Math.max(...tend.map(x => x.overdue), 1);
  const spark = tend.map(x => `<div title="${x.d}: ${x.overdue} vencidas" style="flex:1;background:linear-gradient(180deg,#ff6b6b,#b91c1c);height:${Math.max(4, Math.round(50 * x.overdue / maxO))}px;border-radius:3px 3px 0 0;opacity:.85"></div>`).join('');
  // N12 (auditoría 13-jul): índice de disciplina por persona (fecha+dueño 50% · al día 30% · movimiento 20%)
  if (OS.disciplina === undefined) { OS.disciplina = null; sb.from('v_disciplina_clickup').select('*').order('disciplina', { ascending: false }).then(r => { OS.disciplina = r.data || []; osRender(); }).catch(() => { OS.disciplina = []; }); }
  // N7 (plantilla llenada 13-jul): huérfanas con dueño/fecha SUGERIDOS por lista — cura de origen del ruido
  if (OS.huerfanas === undefined) { OS.huerfanas = null; sb.from('v_huerfanas_resumen').select('*').order('huerfanas', { ascending: false }).then(r => { OS.huerfanas = r.data || []; osRender(); }).catch(() => { OS.huerfanas = []; }); }
  const hTot = (OS.huerfanas || []).reduce((s, x) => s + (+x.huerfanas || 0), 0);
  const hCub = (OS.huerfanas || []).reduce((s, x) => s + (x.dueno_sugerido ? +x.huerfanas : 0), 0);
  const huerfCard = (OS.huerfanas && OS.huerfanas.length) ? `<div class="card" style="margin-top:14px"><div class="lab">${osIcon('inbox')} Tareas huérfanas (sin fecha/dueño) · plantilla N7 activa</div>
    <div class="meta" style="margin-bottom:4px"><b>${hTot.toLocaleString()}</b> huérfanas · <b>${hTot ? Math.floor(100 * hCub / hTot) : 0}%</b> ya tienen dueño y vencimiento SUGERIDOS por la plantilla (asignado real más frecuente por lista) — se aplican por el flujo propuesta → OK humano → ClickUp</div>
    ${OS.huerfanas.slice(0, 8).map(x => `<div class="krow" style="padding:5px 0"><span>${OS_E(x.list_name)} <span style="opacity:.5">· ${x.huerfanas}</span></span><b>${x.dueno_sugerido ? '→ ' + OS_E(x.dueno_sugerido) + ' · ' + x.dias_para_vencer + 'd' : '<span class="warn">sin plantilla</span>'}</b></div>`).join('')}
    ${(OS.huerfanas.some(x => !x.dueno_sugerido)) ? `<div class="meta" style="margin-top:6px">Sin cubrir: ${OS.huerfanas.filter(x => !x.dueno_sugerido).map(x => OS_E(x.list_name) + ' (' + x.huerfanas + ')').join(' · ')} — lista sin nombre real, corregir en ClickUp</div>` : ''}</div>` : '';
  const discCard = (OS.disciplina && OS.disciplina.length) ? `<div class="card" style="margin-top:14px"><div class="lab">${osIcon('compass')} Índice de disciplina por persona (ClickUp)</div><div class="meta" style="margin-bottom:4px">higiene (fecha+dueño) 50% · al día 30% · movimiento 7d 20% — accountability, no castigo</div>
    ${OS.disciplina.slice(0, 8).map(p => `<div class="krow" style="padding:5px 0"><span>${OS_E(p.persona)} <span style="opacity:.5">· ${p.tareas} tareas</span></span><b class="${p.disciplina >= 60 ? 'up' : p.disciplina >= 30 ? 'warn' : 'down'}">${p.disciplina}</b></div>`).join('')}</div>` : '';
  return `${kpis}
    <div class="grid k3" style="margin-top:14px">${empCards}</div>
    ${discCard}
    ${huerfCard}
    <div class="grid k2" style="margin-top:14px">
      <div class="card"><div class="lab">${osIcon('target')} Las 3 decisiones de la semana</div><div class="meta" style="margin-bottom:4px">rankeadas por impacto ($/inversionista primero)</div>${decHtml}</div>
      <div class="card"><div class="lab">Tendencia de vencidas · ${tend.length} días</div><div style="display:flex;align-items:flex-end;gap:3px;height:54px;margin:12px 0 4px">${spark || '<span class="meta">sin snapshots</span>'}</div><div class="meta">${tend.length ? tend[0].d + ' → ' + tend[tend.length - 1].d : ''}</div><div class="krow" style="cursor:pointer;margin-top:8px" onclick="opsGo('sabueso')"><span>${osIcon('dog')} <b>${(OS.sabueso || []).length} anomalías</b> del Sabueso</span><b style="opacity:.5">ver →</b></div></div>
    </div>
    <div class="meta" style="margin-top:10px">Salud por FLUJO+HIGIENE (no %vencidas — engaña con tablero sin fechas). Filtro de ruido: plantillas/recurrentes/refis fuera. Bruto: ${o.totalBruto} tareas → ${o.act.length} operativas. ${osIcon('alert')} dependencies no está en el espejo (P2) → higiene mide fecha+dueño.</div>`;
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
  const fila = t => { const v = opsVencida(t) && !opsEsGestion(t) && !opsEsLongterm(t); const urg = OPS_URG.includes((t.priority || '').toLowerCase()); const tags = (opsEsGestion(t) ? ` <span class="badge b-ok" style="font-size:8px">GESTIÓN — ${OS_E((t.folder_name || 'casa').slice(0, 18))}</span>` : '') + (opsEsLongterm(t) && !opsEsGestion(t) ? ' <span class="badge b-ok" style="font-size:8px">LONG-TERM</span>' : ''); return `<tr${v ? ' style="background:rgba(248,113,113,.06)"' : ''}><td><span class="badge ${v ? 'b-warn' : 'b-ok'}" style="font-size:9px">${OS_E(OPS_EMP[t.space_id] || '?')}</span></td><td><a href="${OS_E(t.url || '#')}" target="_blank" style="color:inherit;text-decoration:none"><b>${OS_E((t.name || '').slice(0, 60))}</b> ↗</a>${tags}</td><td style="font-size:11px;opacity:.75">${OS_E((t.list_name || t.folder_name || '—').slice(0, 26))}</td><td>${OS_E(t.primary_assignee || '—')}</td><td class="${v ? 'down' : ''}">${t.due_date ? String(t.due_date).slice(0, 10) : '—'}</td><td>${urg ? '<b class="warn">' + OS_E(t.priority) + '</b>' : OS_E(t.priority || '—')}</td><td style="font-size:11px">${OS_E(t.status || '—')}${f.tipo === 'por_configurar' ? `<div style="display:flex;gap:4px;margin-top:3px">${!t.due_date ? `<button class="repbtn ghost" style="padding:2px 7px;font-size:9px" onclick="opsProponer('${t.id}','fecha')">${osIcon('calendar')} fecha</button>` : ''}${!(t.primary_assignee || '').trim() ? `<button class="repbtn ghost" style="padding:2px 7px;font-size:9px" onclick="opsProponer('${t.id}','dueno')">${osIcon('user')} dueño</button>` : ''}</div>` : ''}${f.tipo === 'vencidas' ? `<div style="margin-top:3px"><button class="repbtn ghost" style="padding:2px 7px;font-size:9px" onclick="opsProponer('${t.id}','fecha')">${osIcon('calendar')} re-fechar</button></div>` : ''}${f.tipo === 'casa_cerrada' || f.tipo === 'duplicadas' ? `<div style="margin-top:3px"><button class="repbtn ghost" style="padding:2px 7px;font-size:9px" onclick="opsProponer('${t.id}','archivar')">${osIcon('package')} archivar</button></div>` : ''}</td></tr>`; };
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
        ${chip('vencidas', 'Vencidas', o.venc.length)}${chip('sin_dueno', 'Sin dueño', o.sinD.length)}${chip('sin_fecha', 'Sin fecha', o.sinF.length)}${chip('urgentes', 'Urgentes', o.urg.length)}${chip('hoy', 'Hoy', o.hoy.length)}${chip('por_configurar', 'Por configurar', o.porConfig.length)}${chip('gestion', 'Gestión rec.', o.gestion.length)}${chip('longterm', 'Long-term', o.longterm.length)}${chip('duplicadas', 'Duplicadas', o.dupIds.size)}${chip('casa_cerrada', 'Casa cerrada', o.casaCerrada.length)}
        <button class="repbtn ${OS.opsGroupCasa ? '' : 'ghost'}" style="padding:5px 10px;font-size:11px" onclick="OS.opsGroupCasa=!OS.opsGroupCasa;osRender()">${osIcon('house')} Por casa</button>
        <input placeholder="buscar tarea / casa / lista…" value="${OS_E(f.q || '')}" onchange="opsSetF('q',this.value)" style="flex:1;min-width:160px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:6px 10px;color:inherit;font-size:12px">
      </div>
      ${OS.opsGroupCasa ? opsPorCasaView(o, rows, fila) : `<div class="overx"><table class="ptable"><thead><tr>${th('emp', 'Emp.')}${th('tarea', 'Tarea')}${th('lista', 'Casa / Lista')}${th('dueno', 'Dueño')}${th('due', 'Fecha')}${th('prio', 'Prioridad')}${th('estado', 'Estado')}</tr></thead><tbody>
      ${rows.slice(0, 150).map(fila).join('') || '<tr><td colspan="7" style="padding:14px;color:#4ade9e">Sin tareas con estos filtros ✓</td></tr>'}</tbody></table></div>`}
      <div class="meta" style="margin-top:8px">Mostrando ${Math.min(150, rows.length)} de ${rows.length} · fuente: clickup_tasks_mirror (paridad 3/3 con ClickUp, sync diario). Acciones con aprobación (reasignar/re-fechar/archivar): fase siguiente.</div>
    </div>`;
}

// ─── VISTA SABUESO (scrum-master automático) ───
const SAB_SEV = { critica: { e: 'bad', o: 3, l: 'Crítica' }, alta: { e: 'bad', o: 2, l: 'Alta' }, media: { e: 'warn', o: 1, l: 'Media' }, baja: { e: 'off', o: 0, l: 'Baja' } };
const SAB_CAT = { higiene: 'Higiene', flujo: 'Flujo', proceso: 'Proceso', sla: 'SLA plata', datos: 'Datos' };
function opsSabuesoView(o) {
  const all = (OS.sabueso || []).filter(x => x.active !== false);
  const f = OS.sabF = OS.sabF || { cat: '', emp: '', persona: '' };
  // O9 (auditoría 13-jul): COLAPSO SEMÁNTICO — 2,927 anomalías crudas → ~grupos accionables,
  // priorizados por severidad (las de plata/inversionista primero). El grano fino sigue abajo.
  const grupos = {};
  all.forEach(x => {
    const k = (x.check_key || '?') + '|' + (x.categoria || '') + '|' + (x.empresa || '');
    if (!grupos[k]) grupos[k] = { check: x.check_key, cat: x.categoria, emp: x.empresa, n: 0, crit: 0, dueno: x.dueno_sugerido, accion: x.accion, ej: x.task_name };
    grupos[k].n++; if (x.severidad === 'critica') grupos[k].crit++;
  });
  const gList = Object.values(grupos).sort((a, b) => (b.cat === 'sla' ? 1 : 0) - (a.cat === 'sla' ? 1 : 0) || b.crit - a.crit || b.n - a.n);
  const colapso = `<div class="card" style="margin-bottom:12px"><div class="lab">${osIcon('brain')} Colapso semántico — ${all.length.toLocaleString()} anomalías → ${gList.length} grupos accionables</div>
    <div class="meta" style="margin-bottom:6px">un problema = una fila (no 3,000); prioridad: $/inversionista (sla) → críticas → volumen. La causa raíz del ruido se cura en origen (auto-scheduler N7).</div>
    ${gList.slice(0, 12).map(g => `<div class="krow" style="cursor:pointer;padding:7px 0" onclick='OS.sabF={cat:${JSON.stringify(g.cat || '')},emp:"",persona:""};osRender()'><span><b>${OS_E(g.check + (g.cat ? ' · ' + g.cat : ''))}</b> ${g.emp ? '· ' + OS_E(g.emp) : ''} — ${g.n.toLocaleString()} caso(s)${g.crit ? ` · <b class="down">${g.crit} críticas</b>` : ''}${g.accion ? `<div class="meta">→ ${OS_E(g.accion)}${g.dueno ? ' · ' + OS_E(g.dueno) : ''}</div>` : ''}</span><b style="opacity:.5">filtrar →</b></div>`).join('')}
  </div>`;
  let rows = all.slice();
  if (f.cat) rows = rows.filter(x => x.categoria === f.cat);
  if (f.emp) rows = rows.filter(x => x.empresa === OPS_EMP[f.emp]);
  if (f.persona) rows = rows.filter(x => x.dueno_sugerido === f.persona);
  rows.sort((a, b) => (SAB_SEV[b.severidad]?.o || 0) - (SAB_SEV[a.severidad]?.o || 0));
  const bySev = all.reduce((a, x) => { a[x.severidad] = (a[x.severidad] || 0) + 1; return a; }, {});
  const byCat = all.reduce((a, x) => { a[x.categoria] = (a[x.categoria] || 0) + 1; return a; }, {});
  // health por proceso/lista
  const byLista = {};
  (o.act || []).forEach(t => { const k = (t.list_name || t.folder_name || '—'); if (!byLista[k]) byLista[k] = { lista: k, n: 0, conFyD: 0, movido: 0 }; byLista[k].n++; if (t.due_date && (t.primary_assignee || '').trim()) byLista[k].conFyD++; if (opsMovido7d(t)) byLista[k].movido++; });
  // salud graduada: 50% higiene (fecha+dueño) + 50% flujo (movido 7d) — así los procesos se distinguen entre sí
  const procesos = Object.values(byLista).filter(x => x.n >= 4).map(x => ({ ...x, higiene: Math.round(100 * x.conFyD / x.n), flujo: Math.round(100 * x.movido / x.n), salud: Math.round(100 * (0.5 * x.conFyD / x.n + 0.5 * x.movido / x.n)) })).sort((a, b) => a.salud - b.salud).slice(0, 12);
  const catChip = (k, l, n) => `<button class="repbtn ${f.cat === k ? '' : 'ghost'}" style="padding:4px 10px;font-size:11px" onclick="OS.sabF=Object.assign(OS.sabF||{},{cat:'${f.cat === k ? '' : k}'});osRender()">${l} (${n})</button>`;
  const fila = x => `<tr><td>${kitStatusDot(SAB_SEV[x.severidad]?.e || 'off')}</td><td><b>${OS_E((x.task_name || x.detalle || '').slice(0, 54))}</b>${x.task_url ? ` <a href="${OS_E(x.task_url)}" target="_blank">↗</a>` : ''}<div style="font-size:10px;opacity:.6">${OS_E(x.detalle || '')}</div></td><td style="font-size:11px">${OS_E(x.empresa || '—')}</td><td style="font-size:11px">${OS_E(x.dueno_sugerido || '—')}</td><td>${x.task_id ? `<button class="repbtn ghost" style="padding:3px 8px;font-size:10px" onclick="opsSabAccion('${x.id}','${x.accion}')">${({ poner_fecha: 'fecha', asignar_dueno: 'dueño', refechar: 're-fechar', archivar: 'archivar', escalar: 'escalar', asignar_lista: 'lista', redistribuir: '⇄ redistribuir' })[x.accion] || x.accion}</button>` : ''}</td></tr>`;
  return `${colapso}<div class="card" style="text-align:center;padding:20px;border:1px solid ${all.length ? 'rgba(248,113,113,.4)' : 'rgba(52,211,153,.4)'}">
      <div class="lab">${osIcon('dog')} El Sabueso olfateó</div>
      <div style="font-size:52px;font-weight:800;color:${all.length ? '#ff6b6b' : '#4ade9e'}">${all.length}</div>
      <div class="meta">anomalías activas · ${bySev.critica || 0} críticas · ${bySev.alta || 0} altas · ${bySev.media || 0} medias · <b>norte: 0 = todo perfecto</b></div></div>
    <div style="display:flex;gap:5px;margin:12px 0;flex-wrap:wrap">${Object.entries(SAB_CAT).map(([k, l]) => byCat[k] ? catChip(k, l, byCat[k]) : '').join('')}
      <select class="repbtn ghost" style="padding:4px 8px" onchange="OS.sabF=Object.assign(OS.sabF||{},{emp:this.value});osRender()">${['', ...Object.keys(OPS_EMP)].map(sid => `<option value="${sid}" ${f.emp === sid ? 'selected' : ''}>${sid ? OPS_EMP[sid] : 'Todas'}</option>`).join('')}</select></div>
    <div class="grid k2">
      <div class="card"><div class="lab">Anomalías (por severidad)</div><div class="overx"><table class="ptable"><thead><tr><th>Sev</th><th>Qué huele mal</th><th>Emp.</th><th>Dueño sug.</th><th></th></tr></thead><tbody>${rows.slice(0, 120).map(fila).join('') || '<tr><td colspan="5" style="padding:14px;color:#4ade9e">Nada que olfatear ✓</td></tr>'}</tbody></table></div><div class="meta" style="margin-top:6px">Mostrando ${Math.min(120, rows.length)} de ${rows.length}. Cada acción es una PROPUESTA (dry-run) — se aplica con tu OK.</div></div>
      <div class="card"><div class="lab">Health score por proceso/lista</div><div class="overx"><table class="ptable"><thead><tr><th>Proceso / lista</th><th style="text-align:right">Tareas</th><th style="text-align:right">Salud</th></tr></thead><tbody>${procesos.map(p => `<tr><td>${OS_E(String(p.lista).replace(/^\d+[.)]\s*/, '').slice(0, 28))}<div style="font-size:9px;opacity:.5">higiene ${p.higiene}% · movido ${p.flujo}%</div></td><td style="text-align:right">${p.n}</td><td style="text-align:right"><b class="${p.salud < 40 ? 'down' : p.salud < 70 ? 'warn' : 'up'}">${p.salud}%</b></td></tr>`).join('')}</tbody></table></div><div class="meta" style="margin-top:6px">Salud = 50% higiene (fecha+dueño) + 50% flujo (movido 7d). Peores primero.</div></div>
    </div>`;
}
async function opsSabAccion(id, accion) {
  const finding = (OS.sabueso || []).find(x => x.id === id); if (!finding) return;
  const agId = (OS.agIds || {})['Ops · Auditor'] || (OS.agIds || {})['Ops · Coordinador'];
  if (!agId) { alert('Registry de agentes no cargado (necesitás sesión).'); return; }
  const map = { poner_fecha: 'refechar_tarea', refechar: 'refechar_tarea', asignar_dueno: 'reasignar_tarea', archivar: 'archivar_tarea', escalar: 'archivar_tarea', asignar_lista: 'archivar_tarea', redistribuir: 'reasignar_tarea' };
  const tipo = map[accion] || 'archivar_tarea';
  const payload = { titulo: `Sabueso: ${finding.check_key} — ${(finding.task_name || '').slice(0, 60)}`, agente: 'Ops · Sabueso', empresa: finding.empresa, task_id: finding.task_id, task_url: finding.task_url, task_name: finding.task_name, origen: 'sabueso' };
  if (tipo === 'refechar_tarea') payload.fecha_nueva = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
  if (tipo === 'archivar_tarea') payload.status_cierre = 'complete';
  const { error } = await sb.from('agent_proposals').insert({ agent_id: agId, tipo_accion: tipo, estado: 'propuesta', evidencia: finding.detalle, payload });
  if (error) { alert('No se pudo proponer: ' + error.message); return; }
  alert('Propuesta creada (dry-run) — aprobala en la Vista PM → propuestas.');
}
window.opsSabAccion = opsSabAccion;

function opsPanel(comp) {
  const o = opsCompute();
  const v = OS.opsView || 'ceo';
  const tog = (id, lbl) => `<button class="repbtn ${v === id ? '' : 'ghost'}" style="padding:6px 16px;font-weight:700" onclick="opsGo('${id}')">${lbl}</button>`;
  const fresh = (OS.ckTasks || []).length ? String((OS.ckTasks.map(t => t.last_synced_at).sort().pop() || '')).slice(0, 16).replace('T', ' ') : '—';
  const hero = window.kitHero ? kitHero('Deuda de cobranza del holding', kitMoney(comp.holding.deudaCobranza), 'contrato − plata real · ' + comp.cobranza.rows.length + ' casas con deuda este mes') : '';
  return `<h1>${osIcon('settings')} Panel de Operaciones <span>· ClickUp en vivo · 3 empresas</span></h1>
    <div class="sub" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">${tog('ceo', 'Vista CEO')}${tog('pm', 'Vista PM')}${tog('sabueso', 'Sabueso' + ((OS.sabueso||[]).length ? ' · '+(OS.sabueso||[]).length : ''))}<span style="margin-left:auto;font-size:11px;opacity:.6">último sync: ${fresh} UTC · paridad 3/3</span></div>
    ${hero}
    ${v === 'ceo' ? opsCeoView(o) : v === 'sabueso' ? opsSabuesoView(o) : opsPmView(o)}`;
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
  // agrupar en 3 lotes por tipo con aprobar-en-lote (no 43 tarjetas sueltas)
  const grupos = {};
  o.propuestas.forEach(p => { const t = p.tipo_accion || 'otro'; (grupos[t] = grupos[t] || []).push(p); });
  const LOTE = { refechar_tarea: { e: 'calendar', l: 'Re-fechar' }, archivar_tarea: { e: 'package', l: 'Archivar' }, reasignar_tarea: { e: 'user', l: 'Reasignar' }, informe: { e: 'clipboard', l: 'Informes' } };
  const open = OS._propOpen || {};
  const bloque = (tipo, arr) => {
    const info = LOTE[tipo] || { e: 'circle-dot', l: tipo };
    const detalle = open[tipo] ? `<div style="margin-top:6px">${arr.slice(0, 30).map(p => `<div class="krow" data-prop="${p.id}" style="padding:6px 0;font-size:11px;border-top:1px solid rgba(255,255,255,.05)"><span style="flex:1">${OS_E((p.payload || {}).titulo || p.evidencia || '')}${(p.payload || {}).task_url ? ` <a href="${OS_E(p.payload.task_url)}" target="_blank">↗</a>` : ''}</span><span style="display:flex;gap:5px"><button class="repbtn" style="padding:2px 8px;font-size:10px" onclick="opsDecide('${p.id}','aprobar')">✓</button><button class="repbtn ghost" style="padding:2px 7px;font-size:10px" onclick="opsDecide('${p.id}','rechazar')">✗</button></span></div>`).join('')}</div>` : '';
    return `<div style="border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:10px 12px;margin-bottom:8px">
      <div style="display:flex;align-items:center;gap:10px"><span style="display:inline-flex">${osIcon(info.e, { size: 18 })}</span><div style="flex:1"><b>${info.l}</b> <span style="opacity:.6">· ${arr.length} propuesta(s) del Ops Brain</span></div>
        <button class="repbtn ghost" style="padding:4px 9px;font-size:11px" onclick="OS._propOpen=Object.assign(OS._propOpen||{},{'${tipo}':!(OS._propOpen||{})['${tipo}']});osRender()">${open[tipo] ? 'ocultar' : 'ver'}</button>
        <button class="repbtn" style="padding:4px 12px;font-size:11px" onclick="opsAprobarLote('${tipo}')">✓ Aprobar los ${arr.length}</button></div>${detalle}</div>`;
  };
  const bloques = Object.entries(grupos).map(([t, arr]) => bloque(t, arr)).join('');
  return `<div class="card" style="margin-top:14px"><div class="lab">${osIcon('bot')} Ops Brain — ${o.propuestas.length} propuestas en ${Object.keys(grupos).length} lote(s)</div>
    <div class="meta" style="margin-bottom:8px">Aprobá por lote (no de a una). Cada acción se aplica en ClickUp vía edge function; nada se borra.</div>
    ${bloques || '<div class="meta" style="padding:8px 0">Sin propuestas pendientes ✓</div>'}</div>`;
}
async function opsAprobarLote(tipo) {
  const arr = o_propByTipo(tipo);
  if (!arr.length) return;
  if (!confirm(`¿Aprobar y aplicar las ${arr.length} propuestas de "${tipo}"? Se ejecutan en ClickUp (nada se borra).`)) return;
  let ok = 0;
  for (const p of arr) { const r = await opsDecideRaw(p.id, 'aprobar'); if (r) ok++; }
  alert(`${ok}/${arr.length} aplicadas.`);
  const { data } = await sb.from('agent_proposals').select('*').is('deleted_at', null).eq('estado', 'propuesta').order('created_at', { ascending: false }).limit(60);
  OS.agProps = data || OS.agProps; osRender();
}
function o_propByTipo(tipo) { return (OS.agProps || []).filter(x => !x.deleted_at && x.estado === 'propuesta' && (x.tipo_accion || 'otro') === tipo); }
async function opsDecideRaw(id, decision) {
  try { const { data: { session } } = await sb.auth.getSession();
    const res = await fetch(`${window.SUPABASE_URL}/functions/v1/clickup-writeback`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session ? session.access_token : window.SUPABASE_ANON_KEY}` }, body: JSON.stringify({ proposal_id: id, decision, decidido_por: (session && session.user && session.user.email) || 'ceo' }) });
    const j = await res.json(); return j.ok;
  } catch (e) { return false; }
}
window.opsAprobarLote = opsAprobarLote;
function opsDiarioCard(o) {
  const hoyIso = opsHoy();
  const doneHoy = (OS.ckTasks || []).filter(t => t.date_done && String(t.date_done).slice(0, 10) === hoyIso);
  const P = {};
  o.hoy.forEach(t => { const p = (t.primary_assignee || '(sin dueño)'); (P[p] = P[p] || { p, plan: 0, hechas: 0 }).plan++; });
  doneHoy.forEach(t => { const p = (t.primary_assignee || '(sin dueño)'); (P[p] = P[p] || { p, plan: 0, hechas: 0 }).hechas++; });
  const done7 = (OS.ckTasks || []).filter(t => t.date_done && (Date.now() - new Date(t.date_done).getTime()) / 86400000 <= 7 && t.date_created);
  const tProm = done7.length ? Math.round(done7.reduce((s, t) => s + (new Date(t.date_done) - new Date(t.date_created)) / 86400000, 0) / done7.length) : null;
  const rows = Object.values(P).sort((a, b) => b.plan - a.plan).map(x => {
    const sem = kitStatusDot(x.hechas >= x.plan && x.plan > 0 ? 'ok' : x.hechas > 0 ? 'warn' : x.plan > 0 ? 'bad' : 'off');
    return `<tr><td>${OS_E(x.p)}</td><td style="text-align:right">${x.plan}</td><td style="text-align:right" class="up">${x.hechas}</td><td style="text-align:right">${Math.max(0, x.plan - x.hechas)}</td><td style="text-align:right">${sem}</td></tr>`;
  }).join('');
  return `<div class="card" style="margin-top:14px"><div class="lab">${osIcon('calendar')} Seguimiento diario · ${hoyIso}</div>
    <div class="grid k3" style="margin:10px 0"><div class="card kpi"><div class="lab">Plan de hoy</div><div class="big">${o.hoy.length}</div></div>
    <div class="card kpi"><div class="lab">Cerradas hoy</div><div class="big up">${doneHoy.length}</div></div>
    <div class="card kpi"><div class="lab">Entrega promedio (7d)</div><div class="big">${tProm != null ? tProm + 'd' : '—'}</div><div class="meta">creación→cierre · ${done7.length} cerradas</div></div></div>
    <div class="overx"><table class="ptable"><thead><tr><th>Persona</th><th style="text-align:right">Plan hoy</th><th style="text-align:right">Hechas</th><th style="text-align:right">Pendientes</th><th style="text-align:right">Salud</th></tr></thead><tbody>${rows || '<tr><td colspan="5" style="padding:12px;opacity:.6">Sin tareas con fecha de hoy — el Coordinador puede proponer el plan.</td></tr>'}</tbody></table></div></div>`;
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
        <b style="flex:1">${osIcon('house')} ${OS_E(casa)}</b><span class="badge b-ok" style="font-size:9px">${OS_E(emp)}</span>
        <span style="font-size:11px;opacity:.75">${ts.length} tareas</span>
        ${venc ? `<span class="badge b-warn" style="font-size:9px">${venc} venc.</span>` : ''}
        ${sinCfg ? `<span style="font-size:10px;color:#fbbf24">${osIcon('zap')} ${sinCfg} por config.</span>` : ''}
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
    const sem = delta == null ? (kitStatusDot('off') + ' sin fecha') : delta <= 0 ? 'a tiempo' : `+${delta}d tarde`;
    const est = t.time_estimate ? Math.round(t.time_estimate / 3600000) : null;
    const real = t.time_spent ? Math.round(t.time_spent / 3600000) : null;
    return `<tr><td><b>${OS_E((t.name || '').slice(0, 50))}</b><div style="font-size:9px;opacity:.55">${OS_E(t.folder_name || '')}</div></td><td>${OS_E(t.primary_assignee || '—')}</td><td style="text-align:right">${due || '—'}</td><td style="text-align:right">${sem}</td><td style="text-align:right;font-size:11px">${est != null || real != null ? `${est != null ? est + 'h est' : '—'} / ${real != null ? real + 'h real' : '—'}` : '—'}</td></tr>`;
  }).join('');
  const conFecha = doneHoy.filter(t => t.due_date);
  const aT = conFecha.filter(t => hoyIso <= String(t.due_date).slice(0, 10)).length;
  return `<div class="card" style="margin-top:14px"><div class="lab">${osIcon('check-circle')} Cierre del día — ${doneHoy.length} cerradas hoy ${conFecha.length ? `· ${aT}/${conFecha.length} a tiempo` : ''}</div>
    <table class="ptable"><thead><tr><th>Tarea</th><th>Quién</th><th style="text-align:right">Planeada</th><th style="text-align:right">Entrega</th><th style="text-align:right">Est/Real</th></tr></thead><tbody>${rows || '<tr><td colspan="5" style="padding:12px;opacity:.6">Aún sin cierres hoy.</td></tr>'}</tbody></table>
    <div class="meta" style="margin-top:8px">Calidad con evidencia (adjuntos/comentarios): no espejada de ClickUp todavía — P2 del sync. Las no-hechas de ayer: el Coordinador las propone re-fechadas a hoy (marcadas atrasadas) en cada sync.</div></div>`;
}
