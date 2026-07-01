// ════════════════════════════════════════════════════════════════
// 🎨 Property OS · tema claro/oscuro compartido (persistido en localStorage).
// Lo usan los Command Center de Rentas (#cc-overlay) y Fix & Flip (#ff-overlay).
// El CSS de cada uno define overrides con [data-theme="light"].
// ════════════════════════════════════════════════════════════════
window.posGetTheme = function () { try { return localStorage.getItem('pos-theme') || 'dark'; } catch (e) { return 'dark'; } };
window.posSetTheme = function (t) {
  try { localStorage.setItem('pos-theme', t); } catch (e) {}
  document.querySelectorAll('[data-pos-theme-root]').forEach(el => el.setAttribute('data-theme', t));
};
window.posApplyTheme = function (el) { el.setAttribute('data-pos-theme-root', ''); el.setAttribute('data-theme', window.posGetTheme()); };
window.posToggleTheme = function () { const t = window.posGetTheme() === 'dark' ? 'light' : 'dark'; window.posSetTheme(t); return t; };
// Botón reutilizable (☀/☾). onclick debe re-renderizar para refrescar charts.
window.posThemeBtn = function (onToggle) {
  const dark = window.posGetTheme() === 'dark';
  return `<button class="pos-theme-btn" title="Cambiar tema claro/oscuro" onclick="${onToggle}">${dark ? '☀︎' : '☾'}</button>`;
};
