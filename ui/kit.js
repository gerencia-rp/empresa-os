// ════════════════════════════════════════════════════════════════
// 🧰 EMPRESA OS · UI KIT (Fase 0) — helpers de render compartidos.
// Generalización de los helpers ganadores de la suite UW (patrón Cash-Out).
// Funciones puras que devuelven strings HTML — encajan con la arquitectura
// vanilla (innerHTML) de todo el OS. Usa SIEMPRE los tokens de ui/tokens.css.
// REGLA DE ORO: sin dato ≠ $0 — kitMoney(null) = '—', nunca '$0' mudo.
// ════════════════════════════════════════════════════════════════
/* eslint-disable no-unused-vars */

const KIT_DLR = '$';
function kitEsc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

// ─── NÚMEROS: null/undefined/NaN → '—' (regla "sin dato ≠ $0") ───
function kitMoney(n, opts) {
  opts = opts || {};
  if (n == null || isNaN(n)) return opts.vacio || '—';
  if (n === 0 && opts.ceroEs) return opts.ceroEs;                       // ej: {ceroEs:'sin datos'}
  const abs = Math.abs(n);
  if (opts.k && abs >= 1000) return (n < 0 ? '-' : '') + KIT_DLR + (abs >= 1e6 ? (abs / 1e6).toFixed(2) + 'M' : Math.round(abs / 1000) + 'k');
  return (n < 0 ? '-' : '') + KIT_DLR + Math.round(abs).toLocaleString('en-US');
}
function kitMoney2(n, opts) {  // con centavos cuando los hay (fidelidad HUD)
  opts = opts || {};
  if (n == null || isNaN(n)) return opts.vacio || '—';
  const r = Math.round(n * 100) / 100, c = Math.abs(r - Math.round(r)) >= 0.005;
  return (r < 0 ? '-' : '') + KIT_DLR + Math.abs(r).toLocaleString('en-US', { minimumFractionDigits: c ? 2 : 0, maximumFractionDigits: c ? 2 : 0 });
}
function kitPct(n, dec) { return (n == null || isNaN(n)) ? '—' : (Math.round(n * Math.pow(10, dec || 0)) / Math.pow(10, dec || 0)) + '%'; }
function kitNum(n) { return (n == null || isNaN(n)) ? '—' : (+n).toLocaleString('en-US'); }

// ─── HERO: el número protagonista (patrón Cash-Out) ───
function kitHero(titulo, valor, sub, color) {
  const c = color || 'var(--a1)';
  return '<div style="background:color-mix(in srgb, ' + c + ' 12%, transparent);border:1px solid color-mix(in srgb, ' + c + ' 40%, transparent);border-radius:20px;padding:20px 24px;margin-bottom:16px">'
    + '<div style="font-size:12px;text-transform:uppercase;letter-spacing:.6px;color:' + c + ';font-weight:700">' + titulo + '</div>'
    + '<div style="font-size:40px;font-weight:800;color:' + c + ';line-height:1.1;margin-top:4px;letter-spacing:-1px">' + valor + '</div>'
    + (sub ? '<div style="font-size:12px;color:' + c + ';margin-top:4px;opacity:.9">' + sub + '</div>' : '') + '</div>';
}

// ─── CARD con título/propósito ───
function kitCard(titulo, proposito, inner) {
  return '<div class="card" style="padding:20px 22px">'
    + (titulo ? '<div style="margin-bottom:14px"><div style="font-size:16px;font-weight:700;color:var(--ink)">' + titulo + '</div>'
      + (proposito ? '<div style="font-size:12px;color:var(--mut2);margin-top:2px">' + proposito + '</div>' : '') + '</div>' : '')
    + inner + '</div>';
}

// ─── FILA de desglose (punteada, estilo estado de cierre) ───
function kitRow(l, v, opts) {
  opts = opts || {};
  const val = opts.txt != null ? opts.txt : (opts.money2 ? kitMoney2(v) : kitMoney(v));
  return '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:7px 0;'
    + (opts.last ? '' : 'border-bottom:1px dashed var(--line);') + (opts.big ? 'font-size:15px;' : 'font-size:13px;')
    + 'color:var(--txt2)"><span>' + l + '</span><b style="color:' + (opts.neg ? 'var(--neg)' : (opts.color || 'var(--ink)')) + ';font-weight:700;white-space:nowrap">' + val + '</b></div>';
}

// ─── INPUT grande protagonista (patrón Cash-Out: label + hint, número a la derecha) ───
// onchangeExpr: expresión JS con `this.value` limpio disponible como VAL, ej: "miSet('arv',VAL)"
function kitInput(lab, hint, val, onchangeExpr, opts) {
  opts = opts || {}; const pct = !!opts.pct, plain = !!opts.plain;
  const shown = (val == null || val === 0) ? '' : ((pct || plain) ? val : (Math.round(val * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 }));
  const handler = onchangeExpr.replace(/VAL/g, 'this.value.replace(/[,%\\s' + KIT_DLR + ']/g,&quot;&quot;)');
  return '<div style="margin-bottom:16px"><div style="font-size:13px;font-weight:600;margin-bottom:6px;color:var(--ink)">' + lab
    + (hint ? ' <span style="color:var(--mut2);font-weight:400;font-size:12px">— ' + hint + '</span>' : '') + '</div>'
    + '<div style="display:flex;align-items:center;border:1.5px solid var(--line);border-radius:12px;padding:0 12px;background:var(--card)">'
    + ((pct || plain) ? '' : '<span style="color:var(--mut2);font-size:15px">' + KIT_DLR + '</span>')
    + '<input value="' + shown + '" placeholder="0" inputmode="decimal" onchange="' + handler + '" style="border:0;outline:0;width:100%;padding:12px 8px;font-size:17px;font-weight:600;color:var(--ink);background:transparent;text-align:right">'
    + (pct ? '<span style="color:var(--mut2);font-size:15px">%</span>' : '') + '</div>'
    + (opts.foot ? '<div style="font-size:11px;color:var(--mut2);margin-top:4px">' + opts.foot + '</div>' : '') + '</div>';
}
function kitInputSm(lab, val, onchangeExpr, opts) {  // compacto para grillas "Ajustes"
  opts = opts || {}; const pct = !!opts.pct, plain = !!opts.plain;
  const shown = (val == null || val === 0) ? '' : val;
  const handler = onchangeExpr.replace(/VAL/g, 'this.value.replace(/[,%\\s' + KIT_DLR + ']/g,&quot;&quot;)');
  return '<div><div style="font-size:12px;font-weight:600;margin-bottom:5px;color:var(--txt2)">' + lab + '</div>'
    + '<div style="display:flex;align-items:center;border:1.5px solid var(--line);border-radius:10px;padding:0 10px;background:var(--card)">'
    + (pct || plain ? '' : '<span style="color:var(--mut2);font-size:13px">' + KIT_DLR + '</span>')
    + '<input value="' + shown + '" placeholder="0" inputmode="decimal" onchange="' + handler + '" style="border:0;outline:0;width:100%;padding:9px 6px;font-size:14px;font-weight:600;color:var(--ink);background:transparent;text-align:right">'
    + (pct ? '<span style="color:var(--mut2);font-size:13px">%</span>' : '') + '</div></div>';
}

// ─── BADGES / ESTADOS ───
function kitBadge(txt, kind) { return '<span class="badge ' + (kind === 'ok' ? 'b-ok' : kind === 'neg' ? 'b-red' : 'b-warn') + '">' + txt + '</span>'; }
function kitEmpty(icon, msg, cta) {
  return '<div class="ui-empty"><div style="font-size:36px;margin-bottom:8px">' + (icon || '📭') + '</div><div>' + msg + '</div>'
    + (cta ? '<div style="margin-top:12px">' + cta + '</div>' : '') + '</div>';
}
function kitLoading(msg) { return '<div class="ui-empty">⏳ ' + (msg || 'Cargando…') + '</div>'; }
function kitError(msg, retryExpr) {
  return '<div class="ui-error">⚠️ ' + kitEsc(msg) + (retryExpr ? ' <button class="btn-ghost" style="margin-left:8px;padding:4px 10px;font-size:11px" onclick="' + retryExpr + '">↻ Reintentar</button>' : '') + '</div>';
}

// exposición global (arquitectura vanilla del OS)
window.kitMoney = kitMoney; window.kitMoney2 = kitMoney2; window.kitPct = kitPct; window.kitNum = kitNum;
window.kitHero = kitHero; window.kitCard = kitCard; window.kitRow = kitRow;
window.kitInput = kitInput; window.kitInputSm = kitInputSm;
window.kitBadge = kitBadge; window.kitEmpty = kitEmpty; window.kitLoading = kitLoading; window.kitError = kitError; window.kitEsc = kitEsc;
