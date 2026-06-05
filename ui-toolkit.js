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

  // ─── esc(str) ───
  // Escape HTML para insertar texto user-provided en innerHTML sin XSS.
  // Cubre <, >, &, ", ', backtick.
  window.esc = function(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/`/g, '&#96;');
  };

  // ─── usd(n) ───
  // Format USD canónico. Centraliza el `Fmt = n => '$' + ...` repetido en 5 archivos.
  window.usd = function(n, opts) {
    const o = opts || {};
    const v = Number(n) || 0;
    const fixed = o.decimals != null ? v.toFixed(o.decimals) : Math.round(v).toString();
    return '$' + Number(fixed).toLocaleString('en-US', { minimumFractionDigits: o.decimals || 0, maximumFractionDigits: o.decimals || 0 });
  };

  // ─── safeInsert / safeUpdate ───
  // Wrapper sobre supabase .insert/.update que detecta error
  // "Could not find the 'X' column of 'Y' in the schema cache"
  // y reintenta sin esa columna. Evita romper cuando un SQL de migración
  // todavía no se corrió en el ambiente del usuario.
  // Uso: await window.safeInsert(sb.from('tabla'), payload, { returning: 'single' })
  window._stripMissingCol = function(error, payload) {
    if (!error || !error.message) return null;
    const m = error.message.match(/Could not find the '([^']+)' column/i);
    if (!m) return null;
    const col = m[1];
    if (Array.isArray(payload)) {
      if (payload.length === 0 || !(col in payload[0])) return null;
      const next = payload.map(row => { const r = { ...row }; delete r[col]; return r; });
      return { col, payload: next };
    }
    if (!(col in payload)) return null;
    const next = { ...payload };
    delete next[col];
    return { col, payload: next };
  };
  // Pasale una función que devuelva el qb fresco: () => sb.from('tabla')
  // o pasale directamente el qb (intenta reutilizarlo).
  window.safeInsert = async function(qbOrFn, payload, opts) {
    opts = opts || {};
    let p = Array.isArray(payload) ? payload.map(r => ({ ...r })) : { ...payload };
    const getQb = typeof qbOrFn === 'function' ? qbOrFn : () => qbOrFn;
    for (let tries = 0; tries < 8; tries++) {
      let q = getQb().insert(p);
      if (opts.select !== false) {
        q = q.select(opts.select || '*');
        if (opts.single) q = q.single();
      }
      const res = await q;
      if (!res.error) return res;
      const fix = window._stripMissingCol(res.error, p);
      if (!fix) return res;
      console.warn('[safeInsert] columna faltante:', fix.col, '→ retry sin ella');
      p = fix.payload;
    }
    return { error: new Error('safeInsert: demasiados reintentos') };
  };
  // builderFn(p) debe devolver el query ya armado: sb.from('t').update(p).eq('id', id)
  // (o equivalente para .in, .match, etc.). Recibe el payload (posiblemente
  // ya sin columnas faltantes) y debe armar la query fresca cada vez.
  window.safeUpdate = async function(builderFn, payload) {
    let p = Array.isArray(payload) ? payload.map(r => ({ ...r })) : { ...payload };
    if (typeof builderFn !== 'function') {
      // Compat antiguo: si recibimos un qb directo, asumimos que .update se
      // aplica encima y filtros se aplicaron antes.
      const qb = builderFn;
      builderFn = (pp) => qb.update(pp);
    }
    for (let tries = 0; tries < 8; tries++) {
      const res = await builderFn(p);
      if (!res.error) return res;
      const fix = window._stripMissingCol(res.error, p);
      if (!fix) return res;
      console.warn('[safeUpdate] columna faltante:', fix.col, '→ retry sin ella');
      p = fix.payload;
    }
    return { error: new Error('safeUpdate: demasiados reintentos') };
  };

  // ─── safeEvalFormula(expr, vars) ───
  // Evaluador whitelisted que reemplaza new Function() (RCE).
  // Acepta: identificadores de vars, números, paréntesis, + - * / %,
  // Math.{abs,min,max,round,floor,ceil,sqrt,pow}.
  // Rechaza: cualquier otra cosa (palabras reservadas, accesos, llamadas a fns no whitelist).
  window.safeEvalFormula = function(expr, vars) {
    if (typeof expr !== 'string') throw new Error('expr no es string');
    const raw = expr.trim();
    // Whitelist regex: caracteres y nombres permitidos. Cualquier otra cosa = abort.
    const validChars = /^[a-zA-Z0-9_.+\-*/%() \t,]+$/;
    if (!validChars.test(raw)) throw new Error('Fórmula con caracteres no permitidos');
    // Verificar identificadores: cada token alfanumérico debe ser var conocida o Math.xxx whitelisted
    const allowedMathFns = new Set(['abs','min','max','round','floor','ceil','sqrt','pow','log','exp']);
    const tokens = raw.match(/[a-zA-Z_][a-zA-Z0-9_.]*/g) || [];
    for (const t of tokens) {
      if (t in (vars || {})) continue;
      if (t === 'Math') continue;
      if (t.startsWith('Math.')) {
        const fn = t.slice(5);
        if (!allowedMathFns.has(fn)) throw new Error('Math fn no permitida: ' + fn);
        continue;
      }
      // Número como NaN/Infinity tampoco
      throw new Error('Identificador no permitido: ' + t);
    }
    // Evaluar con Function pero solo con el contexto controlado
    // Como ya whitelistamos, es seguro. (Es la única manera sin parser AST completo.)
    const keys = Object.keys(vars || {});
    const fn = new Function('Math', ...keys, `"use strict"; return (${raw});`);
    return fn(Math, ...keys.map(k => vars[k]));
  };

  // ─── getAccessToken() ───
  // Devuelve el JWT del user logueado (con `sub` claim) para llamar edge functions
  // que requireAuth. Fallback a ANON_KEY si no hay sesión (compat con endpoints
  // públicos antiguos). Las funciones con requireAuth van a rechazar con
  // "missing sub claim" si solo reciben ANON_KEY — por eso este helper.
  window.getAccessToken = async function() {
    try {
      const sbClient = window.sb;
      if (!sbClient) return window.SUPABASE_ANON_KEY;
      const { data } = await sbClient.auth.getSession();
      return data?.session?.access_token || window.SUPABASE_ANON_KEY;
    } catch {
      return window.SUPABASE_ANON_KEY;
    }
  };

  console.log('[UI Toolkit] Cargado — toast, confirmDialog, promptDialog, withLoading, validateField, esc, usd, safeEvalFormula, getAccessToken');
})();
