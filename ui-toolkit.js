// ============================================================
// UI TOOLKIT — Toasts · loading buttons · confirm/prompt modales · form validation
// Reemplaza las APIs nativas alert/confirm/prompt con UX moderna.
// ============================================================

(function() {
  if (window._uiToolkitLoaded) return;
  window._uiToolkitLoaded = true;

  // ─── Inyectar estilos ───
  const style = document.createElement('style');
  style.textContent = `
    #ui-toast-container {
      position: fixed; top: 16px; right: 16px; z-index: 9999;
      display: flex; flex-direction: column; gap: 8px;
      max-width: 420px; pointer-events: none;
    }
    .ui-toast {
      display: flex; gap: 10px; align-items: flex-start;
      background: white; border-radius: 10px; padding: 12px 14px;
      box-shadow: 0 8px 24px rgba(0,0,0,.12);
      border-left: 4px solid #6b7280;
      pointer-events: auto;
      animation: ui-toast-in 0.18s ease-out;
      max-width: 100%;
    }
    .ui-toast.ui-success { border-left-color: #10b981; }
    .ui-toast.ui-error { border-left-color: #ef4444; }
    .ui-toast.ui-warning { border-left-color: #f59e0b; }
    .ui-toast.ui-info { border-left-color: #3b82f6; }
    .ui-toast.ui-leaving { animation: ui-toast-out 0.18s ease-in forwards; }
    .ui-toast-icon { font-size: 18px; line-height: 1; flex-shrink: 0; margin-top: 1px; }
    .ui-toast-body { flex: 1; min-width: 0; }
    .ui-toast-title { font-weight: 700; font-size: 13px; color: #0f172a; }
    .ui-toast-msg { font-size: 12px; color: #475569; margin-top: 2px; word-break: break-word; white-space: pre-wrap; }
    .ui-toast-close { background: transparent; border: 0; color: #94a3b8; cursor: pointer; font-size: 16px; line-height: 1; padding: 0 2px; }
    .ui-toast-close:hover { color: #0f172a; }
    @keyframes ui-toast-in { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes ui-toast-out { to { opacity: 0; transform: translateX(20px); } }

    /* Confirm/Prompt overlays — usan z-index más alto que el modal regular */
    #ui-confirm-overlay, #ui-prompt-overlay {
      position: fixed; inset: 0; background: rgba(15,23,42,.5);
      display: flex; align-items: center; justify-content: center;
      z-index: 10000; padding: 16px;
    }
    .ui-dialog {
      background: white; border-radius: 14px; max-width: 440px; width: 100%;
      box-shadow: 0 25px 50px rgba(0,0,0,.25);
      overflow: hidden;
      animation: ui-dialog-in 0.16s ease-out;
    }
    @keyframes ui-dialog-in { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
    .ui-dialog-header { padding: 16px 18px 8px; }
    .ui-dialog-title { font-weight: 700; font-size: 15px; color: #0f172a; }
    .ui-dialog-body { padding: 4px 18px 16px; font-size: 13px; color: #475569; white-space: pre-wrap; line-height: 1.45; }
    .ui-dialog-input { width: 100%; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; font-size: 13px; margin-top: 8px; }
    .ui-dialog-input:focus { outline: 2px solid #0f172a; outline-offset: -1px; border-color: #0f172a; }
    .ui-dialog-actions { display: flex; gap: 8px; padding: 12px 18px 16px; background: #f8fafc; }
    .ui-btn { flex: 1; border: 0; border-radius: 6px; padding: 8px 14px; font-size: 13px; font-weight: 700; cursor: pointer; transition: background .12s; }
    .ui-btn-secondary { background: #e2e8f0; color: #334155; }
    .ui-btn-secondary:hover { background: #cbd5e1; }
    .ui-btn-primary { background: #0f172a; color: white; }
    .ui-btn-primary:hover { background: #334155; }
    .ui-btn-danger { background: #dc2626; color: white; }
    .ui-btn-danger:hover { background: #b91c1c; }

    /* Loading state para botones */
    .ui-btn-loading { position: relative; pointer-events: none; opacity: 0.7; }
    .ui-btn-loading::after {
      content: ''; position: absolute; right: 10px; top: 50%; margin-top: -7px;
      width: 14px; height: 14px; border: 2px solid currentColor;
      border-right-color: transparent; border-radius: 50%;
      animation: ui-spin 0.7s linear infinite;
    }
    @keyframes ui-spin { to { transform: rotate(360deg); } }

    /* Form validation */
    .ui-field-error { border-color: #ef4444 !important; box-shadow: 0 0 0 2px rgba(239,68,68,.18); }
    .ui-error-msg { color: #dc2626; font-size: 11px; margin-top: 4px; }
  `;
  document.head.appendChild(style);

  // ─── Toast container ───
  function ensureToastContainer() {
    let c = document.getElementById('ui-toast-container');
    if (!c) {
      c = document.createElement('div');
      c.id = 'ui-toast-container';
      document.body.appendChild(c);
    }
    return c;
  }

  // ─── toast(msg, type) ───
  // type: 'success' | 'error' | 'warning' | 'info'
  window.toast = function(msg, type = 'info', opts = {}) {
    const container = ensureToastContainer();
    const el = document.createElement('div');
    el.className = `ui-toast ui-${type}`;
    const icons = { success: '✅', error: '⛔', warning: '⚠️', info: 'ℹ️' };
    const titles = { success: 'Listo', error: 'Error', warning: 'Atención', info: 'Aviso' };
    const message = String(msg || '');
    // Detectar título si vino con \n\n o si el primer línea termina con :
    let title = opts.title || titles[type] || '';
    let body = message;
    if (!opts.title && message.includes('\n')) {
      const parts = message.split('\n');
      title = parts[0];
      body = parts.slice(1).join('\n').trim();
    }
    el.innerHTML = `
      <div class="ui-toast-icon">${icons[type] || icons.info}</div>
      <div class="ui-toast-body">
        ${title ? `<div class="ui-toast-title">${title}</div>` : ''}
        ${body ? `<div class="ui-toast-msg">${body.replace(/</g,'&lt;')}</div>` : ''}
      </div>
      <button class="ui-toast-close" aria-label="Cerrar">×</button>
    `;
    container.appendChild(el);
    const duration = opts.duration ?? (type === 'error' ? 7000 : 4000);
    const close = () => {
      el.classList.add('ui-leaving');
      setTimeout(() => el.remove(), 200);
    };
    el.querySelector('.ui-toast-close').addEventListener('click', close);
    if (duration > 0) setTimeout(close, duration);
    return { close };
  };

  // ─── Helpers semánticos ───
  window.toastSuccess = (m, o) => toast(m, 'success', o);
  window.toastError = (m, o) => toast(m, 'error', o);
  window.toastWarning = (m, o) => toast(m, 'warning', o);
  window.toastInfo = (m, o) => toast(m, 'info', o);

  // ─── Monkey-patch alert() → toast ───
  // Mantiene compatibilidad con los 200+ call sites existentes.
  const _nativeAlert = window.alert.bind(window);
  window.alert = function(msg) {
    const text = String(msg ?? '');
    // Heurística: si el texto empieza con ✓/✅/Listo/OK → success
    // si tiene Error/⛔/❌ → error; ⚠️/Aviso → warning; default → info
    let type = 'info';
    const t = text.toLowerCase();
    if (/^(✓|✅|listo|ok\b|guardado|completad)/.test(text) || /\b(éxito|exito|success)\b/i.test(t)) type = 'success';
    else if (/error|⛔|❌|falló|fallo|no se pudo/.test(t)) type = 'error';
    else if (/⚠️|atención|atencion|cuidado|warning/.test(t)) type = 'warning';
    toast(text, type);
  };
  window._nativeAlert = _nativeAlert; // por si se necesita

  // ─── confirmDialog(message, opts) → Promise<boolean> ───
  // opts: { title, confirmText, cancelText, danger }
  window.confirmDialog = function(message, opts = {}) {
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.id = 'ui-confirm-overlay';
      const dangerCls = opts.danger ? 'ui-btn-danger' : 'ui-btn-primary';
      overlay.innerHTML = `
        <div class="ui-dialog" role="dialog" aria-modal="true">
          <div class="ui-dialog-header"><div class="ui-dialog-title">${opts.title || '¿Estás seguro?'}</div></div>
          <div class="ui-dialog-body">${String(message||'').replace(/</g,'&lt;')}</div>
          <div class="ui-dialog-actions">
            <button class="ui-btn ui-btn-secondary" data-act="cancel">${opts.cancelText || 'Cancelar'}</button>
            <button class="ui-btn ${dangerCls}" data-act="ok">${opts.confirmText || 'Confirmar'}</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      const close = (val) => { overlay.remove(); resolve(val); };
      overlay.querySelector('[data-act="cancel"]').onclick = () => close(false);
      overlay.querySelector('[data-act="ok"]').onclick = () => close(true);
      overlay.addEventListener('click', e => { if (e.target === overlay) close(false); });
      const onKey = (e) => {
        if (e.key === 'Escape') { close(false); document.removeEventListener('keydown', onKey); }
        if (e.key === 'Enter') { close(true); document.removeEventListener('keydown', onKey); }
      };
      document.addEventListener('keydown', onKey);
      // Focus el botón primario
      setTimeout(() => overlay.querySelector('[data-act="ok"]').focus(), 30);
    });
  };

  // ─── promptDialog(label, opts) → Promise<string|null> ───
  // opts: { title, placeholder, defaultValue, type, confirmText, cancelText, multiline }
  window.promptDialog = function(label, opts = {}) {
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.id = 'ui-prompt-overlay';
      const inputType = opts.type || 'text';
      const inputEl = opts.multiline
        ? `<textarea class="ui-dialog-input" rows="4" placeholder="${(opts.placeholder||'').replace(/"/g,'&quot;')}">${(opts.defaultValue||'').replace(/</g,'&lt;')}</textarea>`
        : `<input class="ui-dialog-input" type="${inputType}" placeholder="${(opts.placeholder||'').replace(/"/g,'&quot;')}" value="${String(opts.defaultValue ?? '').replace(/"/g,'&quot;')}" />`;
      overlay.innerHTML = `
        <div class="ui-dialog" role="dialog" aria-modal="true">
          <div class="ui-dialog-header"><div class="ui-dialog-title">${opts.title || 'Entrada requerida'}</div></div>
          <div class="ui-dialog-body">
            ${String(label||'').replace(/</g,'&lt;')}
            ${inputEl}
          </div>
          <div class="ui-dialog-actions">
            <button class="ui-btn ui-btn-secondary" data-act="cancel">${opts.cancelText || 'Cancelar'}</button>
            <button class="ui-btn ui-btn-primary" data-act="ok">${opts.confirmText || 'Aceptar'}</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      const input = overlay.querySelector('.ui-dialog-input');
      const close = (val) => { overlay.remove(); resolve(val); };
      overlay.querySelector('[data-act="cancel"]').onclick = () => close(null);
      overlay.querySelector('[data-act="ok"]').onclick = () => close(input.value);
      overlay.addEventListener('click', e => { if (e.target === overlay) close(null); });
      const onKey = (e) => {
        if (e.key === 'Escape') { close(null); document.removeEventListener('keydown', onKey); }
        if (e.key === 'Enter' && !opts.multiline) { e.preventDefault(); close(input.value); document.removeEventListener('keydown', onKey); }
      };
      document.addEventListener('keydown', onKey);
      setTimeout(() => { input.focus(); if (input.select) input.select(); }, 30);
    });
  };

  // ─── withLoading(buttonOrSelector, asyncFn) ───
  // Disabilita botón + muestra spinner durante una operación async.
  // Uso:
  //   <button onclick="withLoading(this, async () => { await save(); })">Guardar</button>
  window.withLoading = async function(btnOrSelector, asyncFn) {
    const btn = typeof btnOrSelector === 'string' ? document.querySelector(btnOrSelector) : btnOrSelector;
    if (!btn) {
      console.warn('withLoading: botón no encontrado');
      return asyncFn();
    }
    const originalText = btn.textContent;
    const originalPadding = btn.style.paddingRight;
    btn.classList.add('ui-btn-loading');
    btn.disabled = true;
    btn.style.paddingRight = '34px';
    try {
      return await asyncFn();
    } finally {
      btn.classList.remove('ui-btn-loading');
      btn.disabled = false;
      btn.style.paddingRight = originalPadding;
      btn.textContent = originalText;
    }
  };

  // ─── validateField(input, validator) ───
  // validator: (value) => string | null  // devuelve mensaje de error o null si ok
  // Devuelve true si válido, false si no.
  window.validateField = function(inputOrId, validator) {
    const input = typeof inputOrId === 'string' ? document.getElementById(inputOrId) : inputOrId;
    if (!input) return true;
    const msg = validator(input.value);
    // Limpiar errores previos
    const existingErr = input.parentNode.querySelector('.ui-error-msg');
    if (existingErr) existingErr.remove();
    input.classList.remove('ui-field-error');
    if (msg) {
      input.classList.add('ui-field-error');
      const errEl = document.createElement('div');
      errEl.className = 'ui-error-msg';
      errEl.textContent = msg;
      input.parentNode.appendChild(errEl);
      input.focus();
      return false;
    }
    return true;
  };

  console.log('[UI Toolkit] Cargado — toast, confirmDialog, promptDialog, withLoading, validateField');
})();
