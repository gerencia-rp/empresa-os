// ════════════════════════════════════════════════════════════════
// 🎨 Property OS · tema claro/oscuro compartido (persistido en localStorage).
// Lo usan los Command Center de Rentas (#cc-overlay) y Fix & Flip (#ff-overlay).
// El CSS de cada uno define overrides con [data-theme="light"].
// ════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════
// 💲 FORMATO DE NÚMEROS ÚNICO para TODA la app (#10). Fuente única, agnóstica al módulo.
//   posMoney(n)  → exacto con separador de miles: $7,509,362 · -$1,650
//   posMoneyK(n) → compacto: $7.51M / $146k / $17.4k / $850 (KPIs, headlines)
//   Los helpers de cada módulo (pmMoney, FF_MONEY, OS_M, OS_K) delegan acá.
// ════════════════════════════════════════════════════════════════
window.posMoney = function (n) {
  const x = Math.round(Number(n) || 0);
  return (x < 0 ? '-$' : '$') + Math.abs(x).toLocaleString('en-US');
};
window.posMoneyK = function (n) {
  const neg = Number(n) < 0 ? '-' : ''; const a = Math.abs(Number(n) || 0);
  if (a >= 1e6) return neg + '$' + (a / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M';   // $7.51M / $2M
  if (a >= 1e5) return neg + '$' + Math.round(a / 1e3) + 'k';                          // $146k
  if (a >= 1e3) return neg + '$' + (a / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';     // $17.4k
  return neg + '$' + Math.round(a).toLocaleString('en-US');                            // $850
};
window.posGetTheme = function () { try { return localStorage.getItem('pos-theme') || 'dark'; } catch (e) { return 'dark'; } };
// Estado de tema UNIFICADO: <html data-osreskin data-theme> es la fuente única para
// login + shell viejo + sistemas clásicos. Los overlays (OS/CC/FF) usan además su
// propio [data-pos-theme-root].
window.posApplyGlobal = function () {
  const t = window.posGetTheme();
  document.documentElement.setAttribute('data-osreskin', t);
  document.documentElement.setAttribute('data-theme', t);
};
window.posSetTheme = function (t) {
  try { localStorage.setItem('pos-theme', t); } catch (e) {}
  document.querySelectorAll('[data-pos-theme-root]').forEach(el => el.setAttribute('data-theme', t));
  window.posApplyGlobal();
};
window.posApplyTheme = function (el) { el.setAttribute('data-pos-theme-root', ''); el.setAttribute('data-theme', window.posGetTheme()); };
window.posToggleTheme = function () { const t = window.posGetTheme() === 'dark' ? 'light' : 'dark'; window.posSetTheme(t); return t; };
// Botón reutilizable (☀/☾). onclick debe re-renderizar para refrescar charts.
window.posThemeBtn = function (onToggle) {
  const dark = window.posGetTheme() === 'dark';
  return `<button class="pos-theme-btn" title="Cambiar tema claro/oscuro" onclick="${onToggle}">${dark ? '☀︎' : '☾'}</button>`;
};

// ════════════════════════════════════════════════════════════════
// CSS GLOBAL UNIFICADO (login + shell viejo + fondo del body). SOLO estilos.
// Keyed en html[data-osreskin] — la fuente única de tema.
// ════════════════════════════════════════════════════════════════
window.posInjectGlobalCSS = function () {
  if (document.getElementById('pos-global-css')) return;
  const st = document.createElement('style'); st.id = 'pos-global-css';
  st.textContent = `
  /* ── fondo del body según tema ── */
  html[data-osreskin="dark"] body{background:#06080d !important;color:#eef2f8}
  html[data-osreskin="light"] body{background:#eef2f8 !important;color:#0f1c2e}
  /* ── shell viejo (#app) detrás de los modales clásicos ── */
  html[data-osreskin="dark"] #app header.bg-white,html[data-osreskin="dark"] #app > main > header{background:#0e141d !important;border-color:rgba(255,255,255,.08) !important}
  html[data-osreskin="dark"] #app #area-title{color:#eef2f8 !important}html[data-osreskin="dark"] #app #area-desc{color:#93a0b6 !important}
  /* ════════ LOGIN (#auth-screen) — diseño nuevo, glass, ambos temas ════════ */
  #auth-screen{background:
    radial-gradient(760px 520px at 8% -6%,rgba(69,227,198,.16),transparent 58%),
    radial-gradient(820px 560px at 100% 4%,rgba(79,141,255,.17),transparent 56%),
    radial-gradient(700px 620px at 70% 118%,rgba(138,123,255,.13),transparent 60%),
    linear-gradient(180deg,#070a11,#05070c) !important;font-family:'Inter',system-ui,sans-serif}
  html[data-osreskin="light"] #auth-screen{background:
    radial-gradient(760px 520px at 8% -6%,rgba(18,181,160,.12),transparent 58%),
    radial-gradient(820px 560px at 100% 4%,rgba(47,110,240,.12),transparent 56%),
    radial-gradient(700px 620px at 70% 118%,rgba(107,91,239,.09),transparent 60%),
    linear-gradient(180deg,#f6f8fc,#eaf0f8) !important}
  #auth-screen > div{background:rgba(255,255,255,.05) !important;border:1px solid rgba(255,255,255,.1) !important;
    backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-radius:22px !important;
    box-shadow:0 34px 90px -30px rgba(0,0,0,.85) !important;padding:34px !important}
  html[data-osreskin="light"] #auth-screen > div{background:rgba(255,255,255,.86) !important;border-color:rgba(15,23,42,.08) !important;box-shadow:0 24px 70px -26px rgba(15,23,42,.3) !important}
  #auth-screen h1{color:#eef2f8 !important;letter-spacing:-.4px}
  html[data-osreskin="light"] #auth-screen h1{color:#0f1c2e !important}
  #auth-screen p,#auth-screen label{color:#93a0b6 !important}
  html[data-osreskin="light"] #auth-screen p,html[data-osreskin="light"] #auth-screen label{color:#48566e !important}
  #auth-screen input{background:rgba(6,9,16,.5) !important;border:1px solid rgba(255,255,255,.13) !important;color:#eef2f8 !important;border-radius:12px !important;padding:11px 13px !important}
  html[data-osreskin="light"] #auth-screen input{background:#fff !important;border-color:rgba(15,23,42,.14) !important;color:#0f1c2e !important}
  #auth-screen input:focus{border-color:#4f8dff !important;outline:none;box-shadow:0 0 0 3px rgba(79,141,255,.18) !important}
  #auth-screen #auth-login-btn{background:linear-gradient(135deg,#45e3c6,#4f8dff) !important;color:#fff !important;border-radius:12px !important;font-weight:750;box-shadow:0 10px 26px -10px rgba(79,141,255,.6) !important}
  #auth-screen #auth-login-btn:hover{filter:brightness(1.06)}
  #auth-screen #auth-signup-btn{background:rgba(255,255,255,.07) !important;color:#eef2f8 !important;border:1px solid rgba(255,255,255,.13) !important;border-radius:12px !important;font-weight:600}
  html[data-osreskin="light"] #auth-screen #auth-signup-btn{background:rgba(15,23,42,.05) !important;color:#0f1c2e !important;border-color:rgba(15,23,42,.12) !important}
  #auth-screen #auth-forgot-btn{color:#4f8dff !important}
  #auth-screen #auth-error{background:rgba(240,104,122,.15) !important;color:#f0687a !important;border-radius:10px !important}
  `;
  document.head.appendChild(st);
};
// ════════════════════════════════════════════════════════════════
// 🎨 SISTEMA DE DISEÑO COMPARTIDO (ADN del OS) para los sistemas clásicos que
// viven en #modal (PM, Estimador, calculadoras, Educación). Mismos componentes,
// tipografía, glass, mesh y tokens que el OS shell — claro y oscuro.
// SOLO estilos: mapea la estructura Tailwind existente al look del OS.
// ════════════════════════════════════════════════════════════════
window.posInjectDesignSystem = function () {
  if (document.getElementById('pos-ds-css')) return;
  const st = document.createElement('style'); st.id = 'pos-ds-css';
  const D = 'html[data-osreskin="dark"] #modal', L = 'html[data-osreskin="light"] #modal';
  st.textContent = `
  /* ── tokens del OS en el scope del modal ── */
  html[data-osreskin="dark"] #modal{--ink:#eef2f8;--mut:#93a0b6;--mut2:#6b7890;--glass:rgba(255,255,255,.05);--glassb:rgba(255,255,255,.1);--card:rgba(255,255,255,.045);--a1:#45e3c6;--a2:#4f8dff;--a3:#8a7bff;--pos:#48d69c;--neg:#f0687a;--amber:#e7b65e}
  html[data-osreskin="light"] #modal{--ink:#0f1c2e;--mut:#48566e;--mut2:#8595ac;--glass:rgba(255,255,255,.7);--glassb:rgba(15,23,42,.09);--card:rgba(255,255,255,.92);--a1:#12b5a0;--a2:#2f6ef0;--a3:#6b5bef;--pos:#0ea371;--neg:#e0455f;--amber:#c98a1e}
  html[data-osreskin] #modal *{font-family:'Inter',system-ui,-apple-system,sans-serif}
  /* ── panel: mesh gradient + glass (como el OS shell) ── */
  html[data-osreskin] #modal > div{border-radius:20px !important;overflow:hidden;color:var(--ink)}
  ${D} > div.bg-white{background:
    radial-gradient(680px 440px at 4% -8%,rgba(69,227,198,.1),transparent 56%),
    radial-gradient(720px 480px at 100% 0%,rgba(79,141,255,.11),transparent 55%),
    radial-gradient(600px 520px at 78% 120%,rgba(138,123,255,.09),transparent 60%),
    linear-gradient(180deg,#0a0e16,#070a11) !important;border:1px solid rgba(255,255,255,.09) !important;box-shadow:0 40px 100px -34px rgba(0,0,0,.92) !important;backdrop-filter:none !important}
  ${L} > div.bg-white{background:
    radial-gradient(680px 440px at 4% -8%,rgba(18,181,160,.08),transparent 56%),
    radial-gradient(720px 480px at 100% 0%,rgba(47,110,240,.08),transparent 55%),
    linear-gradient(180deg,#f4f7fb,#eef2f8) !important;border:1px solid #e3e9f1 !important;box-shadow:0 30px 80px -30px rgba(15,23,42,.4) !important;backdrop-filter:none !important}
  /* header del modal */
  html[data-osreskin] #modal #modal-title{color:var(--ink) !important;font-weight:750;letter-spacing:-.3px}
  ${D} > div > .border-b,${D} > div > div:first-child{border-color:rgba(255,255,255,.08) !important}
  html[data-osreskin] #modal #modal-close-x{color:var(--mut) !important}
  /* ── CARD (glass del OS) sobre cualquier contenedor .bg-white ── */
  html[data-osreskin] #modal .bg-white{position:relative;background:var(--card) !important;border:1px solid var(--glassb) !important;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}
  ${D} .bg-white{box-shadow:0 20px 50px -34px rgba(0,0,0,.9) !important}
  ${L} .bg-white{box-shadow:0 12px 30px -20px rgba(15,23,42,.22) !important}
  html[data-osreskin] #modal .rounded-lg,html[data-osreskin] #modal .rounded-xl{border-radius:15px !important}
  html[data-osreskin] #modal .rounded-2xl{border-radius:18px !important}
  /* superficies neutras */
  html[data-osreskin] #modal .bg-slate-50,html[data-osreskin] #modal .bg-gray-50,html[data-osreskin] #modal .bg-slate-100,html[data-osreskin] #modal .bg-gray-100{background:var(--glass) !important}
  ${D} .bg-slate-200,${D} .bg-gray-200{background:rgba(255,255,255,.09) !important}
  ${L} .bg-slate-200,${L} .bg-gray-200{background:#e3e9f1 !important}
  ${D} .bg-slate-800,${D} .bg-slate-900,${D} .bg-gray-800,${D} .bg-gray-900{background:#141d29 !important}
  ${L} .bg-slate-800,${L} .bg-slate-900{background:#0f1c2e !important}
  /* ── tipografía / texto ── */
  html[data-osreskin] #modal .text-slate-900,html[data-osreskin] #modal .text-slate-800,html[data-osreskin] #modal .text-slate-700,html[data-osreskin] #modal .text-gray-900,html[data-osreskin] #modal .text-gray-800,html[data-osreskin] #modal .text-gray-700,html[data-osreskin] #modal .text-black{color:var(--ink) !important}
  html[data-osreskin] #modal .text-slate-600,html[data-osreskin] #modal .text-gray-600{color:var(--mut) !important}
  html[data-osreskin] #modal .text-slate-500,html[data-osreskin] #modal .text-slate-400,html[data-osreskin] #modal .text-gray-500,html[data-osreskin] #modal .text-gray-400{color:var(--mut) !important}
  html[data-osreskin] #modal .text-slate-300,html[data-osreskin] #modal .text-gray-300{color:var(--mut2) !important}
  /* números grandes (KPI) tipo OS .big */
  html[data-osreskin] #modal .text-3xl,html[data-osreskin] #modal .text-4xl,html[data-osreskin] #modal .text-2xl{letter-spacing:-.6px}
  /* labels uppercase tipo OS .lab */
  html[data-osreskin] #modal .uppercase.tracking-wider,html[data-osreskin] #modal .uppercase.tracking-wide{letter-spacing:1.4px !important}
  /* ── bordes ── */
  html[data-osreskin] #modal .border,html[data-osreskin] #modal .border-b,html[data-osreskin] #modal .border-t,html[data-osreskin] #modal .border-l,html[data-osreskin] #modal .border-r,html[data-osreskin] #modal .border-2,html[data-osreskin] #modal .border-slate-100,html[data-osreskin] #modal .border-slate-200,html[data-osreskin] #modal .border-slate-300,html[data-osreskin] #modal .border-gray-100,html[data-osreskin] #modal .border-gray-200,html[data-osreskin] #modal .divide-slate-200>*+*,html[data-osreskin] #modal .divide-gray-200>*+*{border-color:var(--glassb) !important}
  /* ── inputs / selects estilo OS ── */
  html[data-osreskin] #modal input,html[data-osreskin] #modal select,html[data-osreskin] #modal textarea{background:var(--glass) !important;color:var(--ink) !important;border:1px solid var(--glassb) !important;border-radius:10px !important}
  html[data-osreskin] #modal input:focus,html[data-osreskin] #modal select:focus,html[data-osreskin] #modal textarea:focus{border-color:var(--a2) !important;outline:none;box-shadow:0 0 0 3px rgba(79,141,255,.16) !important}
  ${D} input::placeholder,${D} textarea::placeholder{color:var(--mut2) !important}
  /* ── tabs (border-b-2 activo) estilo OS ── */
  html[data-osreskin] #modal .border-emerald-500{border-color:var(--a1) !important}
  html[data-osreskin] #modal .text-emerald-700.border-emerald-500,html[data-osreskin] #modal button.border-emerald-500{color:var(--a1) !important}
  /* ── botones: primarios con borde/realce de acento; bg-slate-900 = superficie oscura elevada
       (sirve para cards de acento Y botones, sin romper sublabels muted) ── */
  html[data-osreskin] #modal button.bg-slate-900,html[data-osreskin] #modal .bg-slate-900.text-white{border:1px solid rgba(79,141,255,.3) !important;border-radius:10px !important}
  html[data-osreskin] #modal .rounded,html[data-osreskin] #modal .rounded-md{border-radius:9px !important}
  /* ── tablas estilo OS .ptable ── */
  html[data-osreskin] #modal table th{color:var(--mut2) !important;font-size:9.5px !important;letter-spacing:1px;text-transform:uppercase;font-weight:700}
  html[data-osreskin] #modal table td{border-color:var(--glassb) !important}
  ${D} table tr:hover td{background:rgba(255,255,255,.03) !important}
  ${L} table tr:hover td{background:rgba(15,23,42,.03) !important}
  /* ── badges/pills (rounded-full pequeños) ── */
  html[data-osreskin] #modal .shadow,html[data-osreskin] #modal .shadow-sm,html[data-osreskin] #modal .shadow-md,html[data-osreskin] #modal .shadow-lg,html[data-osreskin] #modal .shadow-xl{box-shadow:none !important}
  /* ── semánticos (tints → tinte, texto legible) mismo semáforo ── */
  ${D} .bg-emerald-50,${D} .bg-emerald-100,${D} .bg-green-50,${D} .bg-green-100{background:rgba(72,214,156,.14) !important}
  ${D} .bg-amber-50,${D} .bg-amber-100,${D} .bg-yellow-50,${D} .bg-yellow-100,${D} .bg-orange-50,${D} .bg-orange-100{background:rgba(231,182,94,.15) !important}
  ${D} .bg-red-50,${D} .bg-red-100,${D} .bg-red-200,${D} .bg-rose-50,${D} .bg-rose-100{background:rgba(240,104,122,.15) !important}
  ${D} .bg-blue-50,${D} .bg-blue-100,${D} .bg-sky-50,${D} .bg-sky-100,${D} .bg-indigo-50{background:rgba(79,141,255,.15) !important}
  ${D} .bg-purple-50,${D} .bg-purple-100,${D} .bg-violet-50,${D} .bg-violet-100{background:rgba(138,123,255,.16) !important}
  html[data-osreskin] #modal .text-emerald-900,html[data-osreskin] #modal .text-emerald-800,html[data-osreskin] #modal .text-emerald-700,html[data-osreskin] #modal .text-emerald-600,html[data-osreskin] #modal .text-green-700{color:var(--pos) !important}
  html[data-osreskin] #modal .text-amber-900,html[data-osreskin] #modal .text-amber-800,html[data-osreskin] #modal .text-amber-700,html[data-osreskin] #modal .text-amber-600,html[data-osreskin] #modal .text-yellow-700,html[data-osreskin] #modal .text-orange-700{color:var(--amber) !important}
  html[data-osreskin] #modal .text-red-900,html[data-osreskin] #modal .text-red-800,html[data-osreskin] #modal .text-red-700,html[data-osreskin] #modal .text-red-600,html[data-osreskin] #modal .text-rose-700{color:var(--neg) !important}
  html[data-osreskin] #modal .text-blue-900,html[data-osreskin] #modal .text-blue-800,html[data-osreskin] #modal .text-blue-700,html[data-osreskin] #modal .text-blue-600,html[data-osreskin] #modal .text-sky-700,html[data-osreskin] #modal .text-indigo-700{color:var(--a2) !important}
  ${D} .bg-emerald-500,${D} .bg-emerald-600,${D} .bg-emerald-700{background:#0ea371 !important;color:#fff !important}
  ${D} .bg-red-500,${D} .bg-red-600,${D} .bg-red-700{background:#dc4b63 !important;color:#fff !important}
  ${D} .bg-blue-500,${D} .bg-blue-600{background:#3b7fe0 !important;color:#fff !important}
  ${D} .bg-amber-500,${D} .bg-amber-600{background:#c98a1e !important;color:#fff !important}
  /* ── estados vacío / carga ── */
  html[data-osreskin] #modal .animate-pulse{opacity:.5}
  `;
  document.head.appendChild(st);
};
// aplicar tema + inyectar CSS lo antes posible (login aparece antes que el OS)
try { window.posApplyGlobal(); window.posInjectGlobalCSS(); window.posInjectDesignSystem(); } catch (e) {}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { try { window.posApplyGlobal(); window.posInjectGlobalCSS(); } catch (e) {} });
