// ════════════════════════════════════════════════════════════════
// 🎨 Property OS · tema claro/oscuro compartido (persistido en localStorage).
// Lo usan los Command Center de Rentas (#cc-overlay) y Fix & Flip (#ff-overlay).
// El CSS de cada uno define overrides con [data-theme="light"].
// ════════════════════════════════════════════════════════════════
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
  #auth-screen #auth-login-btn{background:linear-gradient(135deg,#45e3c6,#4f8dff) !important;color:#04121a !important;border-radius:12px !important;font-weight:750;box-shadow:0 10px 26px -10px rgba(79,141,255,.6) !important}
  #auth-screen #auth-login-btn:hover{filter:brightness(1.06)}
  #auth-screen #auth-signup-btn{background:rgba(255,255,255,.07) !important;color:#eef2f8 !important;border:1px solid rgba(255,255,255,.13) !important;border-radius:12px !important;font-weight:600}
  html[data-osreskin="light"] #auth-screen #auth-signup-btn{background:rgba(15,23,42,.05) !important;color:#0f1c2e !important;border-color:rgba(15,23,42,.12) !important}
  #auth-screen #auth-forgot-btn{color:#4f8dff !important}
  #auth-screen #auth-error{background:rgba(240,104,122,.15) !important;color:#f0687a !important;border-radius:10px !important}
  `;
  document.head.appendChild(st);
};
// aplicar tema + inyectar CSS lo antes posible (login aparece antes que el OS)
try { window.posApplyGlobal(); window.posInjectGlobalCSS(); } catch (e) {}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { try { window.posApplyGlobal(); window.posInjectGlobalCSS(); } catch (e) {} });
