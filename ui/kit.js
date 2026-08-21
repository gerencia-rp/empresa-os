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
// Valores NO monetarios: null/''/NaN → '— sin dato' (NUNCA un emoji o color como valor)
function kitValue(v, opts) {
  opts = opts || {};
  if (v == null || v === '' || (typeof v === 'number' && isNaN(v))) return '<span style="color:var(--mut2)" title="' + (opts.motivo || 'sin dato en la fuente') + '">—' + (opts.corto ? '' : ' sin dato') + '</span>';
  return kitEsc(v) + (opts.unidad ? ' ' + opts.unidad : '');
}

// ─── HERO: el número protagonista (patrón Cash-Out). Sin color → número en DEGRADÉ de marca (ADN ARV Pro). ───
function kitHero(titulo, valor, sub, color) {
  const grad = !color;                       // sin color explícito = look premium con --grad
  const c = color || 'var(--a1)';
  const numStyle = grad ? 'class="hero-num" style="font-size:40px;line-height:1.1;margin-top:4px"'
    : 'style="font-size:40px;font-weight:800;color:' + c + ';line-height:1.1;margin-top:4px;letter-spacing:-1px"';
  return '<div class="card" style="background:' + (grad ? 'var(--card)' : 'color-mix(in srgb, ' + c + ' 12%, transparent)') + ';border:1px solid ' + (grad ? 'var(--line)' : 'color-mix(in srgb, ' + c + ' 40%, transparent)') + ';border-radius:20px;padding:20px 24px;margin-bottom:16px">'
    + '<div style="font-size:12px;text-transform:uppercase;letter-spacing:.6px;color:' + (grad ? 'var(--mut2)' : c) + ';font-weight:700">' + titulo + '</div>'
    + '<div ' + numStyle + '>' + valor + '</div>'
    + (sub ? '<div style="font-size:12px;color:' + (grad ? 'var(--mut)' : c) + ';margin-top:4px;opacity:.92">' + sub + '</div>' : '') + '</div>';
}

// ─── VERDICT: banda de decisión (semáforo + acción) — ADN ARV Pro ───
// nivel: 'go' | 'revisar' | 'nogo' · titulo: la decisión en humano · accion: qué hacer ahora
function kitVerdict(nivel, titulo, accion) {
  const map = { go: ['var(--pos)', 'check-circle'], revisar: ['var(--amber)', 'alert'], nogo: ['var(--neg)', 'ban'] };
  const [c, ico] = map[nivel] || map.revisar;
  const icoHtml = (typeof osIcon === 'function') ? osIcon(ico, { size: 22, color: c }) : '';
  return '<div style="display:flex;align-items:center;gap:14px;background:color-mix(in srgb, ' + c + ' 10%, transparent);border:1px solid color-mix(in srgb, ' + c + ' 35%, transparent);border-radius:16px;padding:14px 18px;margin-bottom:16px;flex-wrap:wrap">'
    + '<span style="display:inline-flex">' + icoHtml + '</span>'
    + '<div style="flex:1;min-width:200px"><div style="font-size:14.5px;font-weight:800;color:' + c + '">' + titulo + '</div>'
    + (accion ? '<div style="font-size:12px;color:var(--txt2);margin-top:2px">' + accion + '</div>' : '') + '</div></div>';
}

// ─── CONFIDENCE: badge de confianza del dato — ADN ARV Pro ───
// nivel: 'alta' | 'media' | 'baja' · detalle opcional ("12 comps · Airtable")
function kitConfidence(nivel, detalle) {
  const map = { alta: ['var(--pos)', '●●●'], media: ['var(--amber)', '●●○'], baja: ['var(--neg)', '●○○'] };
  const [c, dots] = map[nivel] || map.media;
  return '<span style="display:inline-flex;align-items:center;gap:6px;font-size:10.5px;font-weight:700;padding:3px 10px;border-radius:20px;background:color-mix(in srgb, ' + c + ' 12%, transparent);color:' + c + ';border:1px solid color-mix(in srgb, ' + c + ' 30%, transparent)">'
    + '<span style="letter-spacing:1px">' + dots + '</span> confianza ' + nivel + (detalle ? ' <span style="font-weight:400;opacity:.8">· ' + detalle + '</span>' : '') + '</span>';
}

// ─── RANGE: barra flojo / probable / bien — ADN ARV Pro ───
// vals = {bajo, probable, alto} · labels opcionales · fmt opcional (default kitMoney)
function kitRange(vals, labels, fmt) {
  const f = fmt || kitMoney; const L = labels || ['flojo', 'probable', 'bien'];
  return '<div style="margin:10px 0">'
    + '<div style="position:relative;height:8px;border-radius:6px;background:linear-gradient(90deg, color-mix(in srgb, var(--neg) 55%, transparent), color-mix(in srgb, var(--amber) 55%, transparent), color-mix(in srgb, var(--pos) 55%, transparent))">'
    + '<span style="position:absolute;left:50%;top:-3px;width:3px;height:14px;background:var(--ink);border-radius:2px;transform:translateX(-50%)"></span></div>'
    + '<div style="display:flex;justify-content:space-between;margin-top:6px;font-size:11px;color:var(--mut)">'
    + '<span>' + L[0] + '<br><b style="color:var(--ink)">' + f(vals.bajo) + '</b></span>'
    + '<span style="text-align:center">' + L[1] + '<br><b class="hero-num" style="font-size:15px">' + f(vals.probable) + '</b></span>'
    + '<span style="text-align:right">' + L[2] + '<br><b style="color:var(--ink)">' + f(vals.alto) + '</b></span>'
    + '</div></div>';
}

// ─── TOGGLE Simple / Experto — ADN ARV Pro ───
// activo: true=segundo modo (experto) · onclickExpr: expresión que alterna y re-renderiza
function kitToggle(labelSimple, labelExperto, activo, onclickExpr) {
  const pill = (txt, on) => '<span style="padding:6px 14px;border-radius:9px;font-size:12px;font-weight:700;cursor:pointer;' + (on ? 'background:var(--grad);color:#fff' : 'color:var(--mut)') + '">' + txt + '</span>';
  return '<span onclick="' + onclickExpr + '" style="display:inline-flex;background:var(--card);border:1px solid var(--line);border-radius:11px;padding:3px;cursor:pointer;user-select:none">'
    + pill(labelSimple, !activo) + pill(labelExperto, !!activo) + '</span>';
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
  // icon: nombre de osIcon ('inbox', 'search', …). Legacy: si llega un emoji se ignora y va 'inbox'.
  const name = (icon && typeof osIcon === 'function' && window.OS_ICONS && OS_ICONS[icon]) ? icon : 'inbox';
  const ico = (typeof osIcon === 'function') ? osIcon(name, { size: 34, color: 'var(--mut2)' }) : '';
  return '<div class="ui-empty"><div style="margin-bottom:8px">' + ico + '</div><div>' + msg + '</div>'
    + (cta ? '<div style="margin-top:12px">' + cta + '</div>' : '') + '</div>';
}
function kitLoading(msg) {
  // Loader de marca (spinner verde + texto). Skeleton: kitSkeletonRows(n) de ui/icons.js.
  return '<div class="ui-loading"><div class="ui-spinner"></div><div>' + (msg || 'Cargando…') + '</div></div>';
}
function kitError(msg, retryExpr) {
  const ico = (typeof osIcon === 'function') ? osIcon('alert', { size: 14 }) + ' ' : '';
  return '<div class="ui-error">' + ico + kitEsc(msg) + (retryExpr ? ' <button class="btn-ghost" style="margin-left:8px;padding:4px 10px;font-size:11px" onclick="' + retryExpr + '">↻ Reintentar</button>' : '') + '</div>';
}

// exposición global (arquitectura vanilla del OS)
window.kitMoney = kitMoney; window.kitMoney2 = kitMoney2; window.kitPct = kitPct; window.kitNum = kitNum;
window.kitHero = kitHero; window.kitCard = kitCard; window.kitRow = kitRow;
window.kitInput = kitInput; window.kitInputSm = kitInputSm;
window.kitBadge = kitBadge; window.kitEmpty = kitEmpty; window.kitLoading = kitLoading; window.kitError = kitError; window.kitEsc = kitEsc;
window.kitVerdict = kitVerdict; window.kitConfidence = kitConfidence; window.kitRange = kitRange; window.kitToggle = kitToggle; window.kitValue = kitValue;
