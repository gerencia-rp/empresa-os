// ════════════════════════════════════════════════════════════════
// Codemod: emojis-icono → Lucide (osIcon) / semáforos → kitStatusDot.
// SEGURO: opera SOLO dentro de string-literales JS ('...', "...", `...`),
// nunca en comentarios/código/regex. Reglas de destino:
//   - Emoji en posición de CONTENIDO HTML (el string tiene markup `<` y el
//     emoji NO está dentro de un `<...>`) → splice quote-aware de osIcon(name).
//   - Emoji en ATRIBUTO (dentro de `<...>`) o en string de TEXTO PLANO (sin `<`)
//     → strip (se elimina el emoji + espacio contiguo). (Regla 4 de la guía.)
//   - 🟢/🟡/🔴/🟠 → kitStatusDot('ok'|'warn'|'bad') (mismo criterio splice/strip;
//     en texto plano se elimina, no se puede meter markup).
// Uso: node scripts/emoji-codemod.mjs <archivo> [--dry]
//   Imprime por archivo: nº splice, nº strip, nº statusdot, y emojis DEJADOS.
// ════════════════════════════════════════════════════════════════
import { readFileSync, writeFileSync } from 'node:fs';

// mapa emoji (sin/ con VS16 ️) → nombre osIcon
const MAP = {
  '⚠': 'alert', '🚨': 'alert', '❗': 'alert', '‼': 'alert',
  '✅': 'check-circle', '☑': 'check-circle', '✔': 'check',
  '❌': 'x-circle', '⛔': 'ban', '🚫': 'ban',
  'ℹ': 'info', '❓': 'help', '❔': 'help',
  '📋': 'clipboard', '📝': 'pencil-line', '✏': 'pencil', '✎': 'pencil', '🖊': 'pencil',
  '🏠': 'house', '🏡': 'house', '🏘': 'building', '🏢': 'building', '🏛': 'landmark', '🏦': 'landmark',
  '🎯': 'target', '📅': 'calendar', '🗓': 'calendar-days', '📆': 'calendar',
  '📊': 'chart', '📈': 'trending-up', '📉': 'trending-down', '📐': 'ruler',
  '🔄': 'refresh', '♻': 'refresh', '🔃': 'refresh',
  '🤖': 'bot', '💾': 'save', '💡': 'lightbulb', '🧠': 'brain',
  '🔍': 'search', '🔎': 'search', '💬': 'message', '🗨': 'message', '⚡': 'zap',
  '📄': 'file', '📃': 'file', '📑': 'file', '🗑': 'trash', '🗄': 'folder',
  '⚙': 'settings', '🛠': 'wrench', '🔧': 'wrench', '📥': 'inbox', '📬': 'inbox', '📭': 'inbox', '📤': 'upload',
  '💰': 'dollar', '💵': 'banknote', '💸': 'banknote', '🪙': 'coins', '💳': 'credit-card', '🧾': 'receipt', '🐷': 'piggy-bank', '🐖': 'piggy-bank',
  '🚀': 'rocket', '🖨': 'printer', '🏗': 'construction', '🔨': 'hammer', '⚒': 'hammer', '🧱': 'brick', '🚚': 'truck', '🚛': 'truck',
  '📚': 'book', '📖': 'book', '📓': 'notebook', '📔': 'notebook',
  '🌐': 'globe', '👤': 'user', '🙋': 'user', '👥': 'users', '🧑': 'user', '👷': 'hard-hat', '🤝': 'handshake', '📦': 'package',
  '🔗': 'link', '🛏': 'bed', '🚪': 'door', '🔑': 'key', '🎓': 'graduation-cap',
  '🏆': 'trophy', '🥇': 'medal', '🏅': 'medal', '📁': 'folder', '📂': 'folder-open', '🗂': 'folder-open', '📎': 'paperclip',
  '➕': 'plus', '➖': 'minus', '📍': 'map-pin', '🗺': 'map', '🧭': 'compass',
  '⏳': 'loader', '⌛': 'hourglass', '🕐': 'clock', '⏰': 'clock', '🕒': 'clock',
  '📣': 'megaphone', '📢': 'megaphone', '💎': 'gem', '🖼': 'image', '🏭': 'factory', '🏥': 'stethoscope',
  '👻': 'ghost', '🐕': 'dog', '🐶': 'dog', '✉': 'mail', '📧': 'mail', '📨': 'mail',
  '📞': 'phone', '☎': 'phone', '🔔': 'bell', '⭐': 'star', '🌟': 'star', '✨': 'sparkles', '🔥': 'flame',
  '🔒': 'lock', '🔓': 'unlock', '👁': 'eye', '🧮': 'calculator', '💼': 'briefcase', '🕸': 'network', '🧬': 'dna', '🎤': 'mic',
  '⚖': 'scale', '🛡': 'shield', '🎉': 'party', '🥳': 'party', '👍': 'thumbs-up', '📜': 'file', '🌙': 'moon', '☀': 'sun',
  '🎨': 'palette', '📷': 'camera', '📸': 'camera', '🎬': 'video', '▶': 'play', '⏸': 'pause', '🎛': 'settings', '🎚': 'settings',
  '🔌': 'link', '🧩': 'package', '📌': 'map-pin', '🏷': 'clipboard', '🗃': 'folder', '🧰': 'wrench',
  '🏚': 'construction', '🔁': 'refresh', '🔂': 'refresh', '📏': 'ruler', '📽': 'video', '🎥': 'video',
  '🔬': 'search', '🛎': 'bell', '🛒': 'package', '📱': 'phone', '🧪': 'flask', '📡': 'globe', '📲': 'phone',
  '🗒': 'notebook', '📒': 'notebook', '📇': 'folder', '🗳': 'inbox', '📮': 'inbox', '🔦': 'search',
  '🧯': 'shield', '🚧': 'construction', '🏙': 'building', '🏬': 'store', '🏪': 'store', '🖥': 'globe', '💻': 'globe',
  '📉': 'trending-down', '💠': 'gem', '🔷': 'gem', '🔶': 'gem', '⏱': 'clock', '⏲': 'clock', '🗝': 'key',
  '🖌': 'palette', '🖍': 'palette', '🪟': 'ruler', '🌳': 'ruler', '🌲': 'ruler', '🌎': 'globe', '🌍': 'globe',
  '🅰': 'store', '🅱': 'store', '💧': 'wrench', '🚰': 'wrench', '🧴': 'wrench', '🪛': 'wrench', '🪜': 'construction',
  '🛁': 'wrench', '🚿': 'wrench', '💨': 'wrench', '❄': 'wrench', '🪵': 'ruler', '🪨': 'ruler', '🍳': 'package', '🧹': 'sparkles', '⛏': 'construction', '🔥': 'flame',
};
const STATUS = { '🟢': 'ok', '🟩': 'ok', '🟡': 'warn', '🟨': 'warn', '🟠': 'warn', '🟧': 'warn', '🔴': 'bad', '🟥': 'bad' };

const VS = '️';
function baseChar(ch) { return ch.replace(VS, ''); }

const file = process.argv[2];
const dry = process.argv.includes('--dry');
if (!file) { console.error('uso: node scripts/emoji-codemod.mjs <archivo> [--dry]'); process.exit(1); }
let src = readFileSync(file, 'utf8');

// Detectar string-literales de nivel de código (fuera de comentarios). Devuelve [{start,end,quote}].
// Los tramos de template se cortan en cada ${...}; las interpolaciones se saltan balanceadas.
function findStrings(s) {
  const out = [];
  const n = s.length;
  // salta un string simple/doble desde la comilla en `i`; REGISTRA el literal; devuelve índice tras la comilla de cierre.
  // (registra siempre, incluso dentro de interpolaciones ${...} — ahí también son strings que se renderizan)
  function skipQuoted(i, q) {
    const st = i; i++;
    while (i < n) { const c = s[i]; if (c === '\\') { i += 2; continue; } if (c === q) { out.push({ start: st, end: i, quote: q === "'" ? 'sq' : 'dq' }); return i + 1; } i++; }
    return i;
  }
  // salta una expresión `${ ... }` balanceada (respeta strings/templates/comentarios anidados)
  // keywords tras las que `/` SIEMPRE inicia un regex (no división)
  const RX_KW = new Set(['return', 'typeof', 'case', 'in', 'of', 'do', 'else', 'void', 'delete', 'yield', 'await', 'instanceof', 'new', 'throw']);
  // ¿un `/` en la posición i inicia un regex? (heurística por token previo significativo)
  function regexHere(i, prevSig) {
    if (prevSig === null) return true;
    // si el char previo es identificador/dígito, puede ser `x / y` (división) O `return /re/` (keyword→regex)
    if (/[A-Za-z0-9_$]/.test(prevSig)) {
      let j = i - 1; while (j >= 0 && /\s/.test(s[j])) j--;
      let e = j; while (j >= 0 && /[A-Za-z0-9_$]/.test(s[j])) j--;
      const word = s.slice(j + 1, e + 1);
      return RX_KW.has(word); // keyword → regex; identificador/nº normal → división
    }
    if (/[)\]}'"`]/.test(prevSig)) return false; // fin-de-valor → división
    return true; // (, =, :, ;, {, [, operadores, coma, etc. → regex
  }
  function skipRegex(i) { // i en el `/` inicial; devuelve índice tras el `/` de cierre (+flags)
    i++; let inClass = false;
    while (i < n) { const c = s[i]; if (c === '\\') { i += 2; continue; } if (c === '[') inClass = true; else if (c === ']') inClass = false; else if (c === '/' && !inClass) { i++; while (i < n && /[a-z]/i.test(s[i])) i++; return i; } else if (c === '\n') return i; i++; }
    return i;
  }
  // recibe i apuntando al `{` de `${`; devuelve índice del `}` de cierre
  function skipInterp(i) {
    let depth = 1; i++; let prevSig = '('; // consumir `{`
    while (i < n && depth > 0) {
      const c = s[i], c2 = s[i + 1];
      if (c === '/' && c2 === '/') { while (i < n && s[i] !== '\n') i++; continue; }
      if (c === '/' && c2 === '*') { i += 2; while (i < n && !(s[i] === '*' && s[i + 1] === '/')) i++; i += 2; continue; }
      if (c === '/' && regexHere(i, prevSig)) { i = skipRegex(i); prevSig = '/'; continue; }
      if (c === "'" || c === '"') { i = skipQuoted(i, c); prevSig = c; continue; }
      if (c === '`') { i = skipTpl(i); prevSig = '`'; continue; }
      if (c === '{') { depth++; i++; prevSig = '{'; continue; }
      if (c === '}') { depth--; i++; prevSig = '}'; continue; }
      if (!/\s/.test(c)) prevSig = c;
      i++;
    }
    return i - 1; // posición del `}`
  }
  // recorre un template desde el backtick en `i`; emite tramos; devuelve índice tras el backtick de cierre
  function skipTpl(i) {
    let segStart = i; i++; // tras backtick de apertura
    while (i < n) {
      const c = s[i], c2 = s[i + 1];
      if (c === '\\') { i += 2; continue; }
      if (c === '`') { out.push({ start: segStart, end: i, quote: 'tpl' }); return i + 1; }
      if (c === '$' && c2 === '{') { out.push({ start: segStart, end: i, quote: 'tpl' }); i = skipInterp(i + 1) + 1; segStart = i - 1; continue; }
      i++;
    }
    return i;
  }
  let i = 0; let prevSig = null;
  while (i < n) {
    const c = s[i], c2 = s[i + 1];
    if (c === '/' && c2 === '/') { while (i < n && s[i] !== '\n') i++; continue; }
    if (c === '/' && c2 === '*') { i += 2; while (i < n && !(s[i] === '*' && s[i + 1] === '/')) i++; i += 2; continue; }
    if (c === '/' && regexHere(i, prevSig)) { i = skipRegex(i); prevSig = '/'; continue; }
    if (c === "'") { i = skipQuoted(i, "'"); prevSig = "'"; continue; }
    if (c === '"') { i = skipQuoted(i, '"'); prevSig = '"'; continue; }
    if (c === '`') { i = skipTpl(i); prevSig = '`'; continue; }
    if (!/\s/.test(c)) prevSig = c;
    i++;
  }
  return out;
}

// ¿posición `pos` dentro del contenido `content` cae en un `<...>` (atributo/tag)?
function insideTag(content, rel) {
  let depth = 0;
  for (let k = 0; k < rel; k++) { if (content[k] === '<') depth++; else if (content[k] === '>') depth = Math.max(0, depth - 1); }
  return depth > 0;
}

// ¿el contenido del string es SOLO emojis/espacios? (típico `icon:'🏠'` — no stripear a '')
const ALL_EMOJI = /^[\s\u{1F000}-\u{1FAFF}\u{2190}-\u{27BF}\u{2B00}-\u{2BFF}️]*$/u;

const bareMode = process.argv.includes('--bare');
const stripRest = process.argv.includes('--strip-rest'); // estripa pictográficos NO mapeados que queden
const noStrip = process.argv.includes('--no-strip');     // NO estripar emojis en strings de texto plano
// (para archivos de CONTENIDO: WhatsApp/captions/slides — sus emojis en texto son contenido, no UI)
// Verificado en este repo: los emojis nunca aparecen en comparaciones/métodos de string
// (0 hits de === '🟢' / .includes('🧪') / etc.) → son puramente presentacionales. Sin guard.
function lineHasCompare() { return false; }
// ¿el code point cae en un plano de emoji pictográfico ALTO? (para --strip-rest de sobrantes no mapeados)
// Solo planos inequívocamente emoji: 0x1F000–0x1FAFF. Los símbolos BMP (0x2600-0x26FF: ♾ ☾ ✓ ⚡…)
// quedan (o ya están en MAP) — no se estripan para no borrar glifos con significado.
function isPicto(cp) { return cp >= 0x1F000 && cp <= 0x1FAFF; }
// nivel de status del contenido bare (primer char status); o null
function bareStatusLevel(content) { for (const ch of content.trim()) { const l = STATUS[baseChar(ch)]; if (l) return l; } return null; }
// nombre de icono si el bare es UN solo emoji mapeado; o null
function bareIconName(content) {
  const t = content.trim(); const cps = [...t]; const real = cps.filter(c => !/\s/.test(c) && c !== VS);
  if (real.length !== 1) return null; return MAP[baseChar(real[0])] || null;
}

const strings = findStrings(src);
let splice = 0, strip = 0, sdot = 0, bare = 0; const left = {}; const review = [];
// procesar de atrás hacia adelante para no invalidar offsets
const edits = [];
for (const st of strings) {
  const content = src.slice(st.start + 1, st.end); // sin comillas
  const hasMarkup = content.includes('<');
  // string que es SOLO emoji(s) sin markup: valor bare (icon:/estado). En --bare se convierte
  // (whole-string → osIcon/kitStatusDot) salvo en líneas con comparación; si no, va a revisión.
  if (!hasMarkup && ALL_EMOJI.test(content) && content.trim() !== '') {
    if (bareMode && st.quote !== 'tpl' && !lineHasCompare(st.start)) {
      const lvl = bareStatusLevel(content); const nm = bareIconName(content);
      if (lvl && !nm) { edits.push({ s: st.start, e: st.end + 1, repl: `kitStatusDot('${lvl}')` }); sdot++; continue; }
      if (nm) { edits.push({ s: st.start, e: st.end + 1, repl: `osIcon('${nm}')` }); bare++; continue; }
    }
    review.push({ start: st.start, text: content }); continue;
  }
  // recorrer por code points
  for (let k = 0; k < content.length; k++) {
    const cp = content.codePointAt(k);
    const ch = String.fromCodePoint(cp);
    const wide = cp > 0xFFFF; // surrogate pair ocupa 2 unidades
    let consume = wide ? 2 : 1;
    // absorber VS16 siguiente
    let raw = ch;
    if (content[k + consume] === VS) { raw += VS; }
    const base = baseChar(raw);
    const emo = base;
    const isStatus = STATUS[emo];
    const name = MAP[emo];
    if (!isStatus && !name) {
      // --strip-rest: sobrante pictográfico no mapeado (decorativo en texto) → estripar
      if (stripRest && isPicto(cp)) {
        const aS = st.start + 1 + k; let aE = aS + raw.length; if (src[aE] === ' ') aE++;
        edits.push({ s: aS, e: aE, repl: '' }); strip++; k += consume - 1; continue;
      }
      k += consume - 1; continue;
    }
    const absStart = st.start + 1 + k;
    const absEnd = absStart + raw.length; // fin del emoji (+VS)
    // ¿espacio contiguo a absorber al hacer strip?
    let delEnd = absEnd; if (src[delEnd] === ' ') delEnd++;
    let delStart = absStart; // (no comernos espacio previo para no pegar palabras)
    const rel = k;
    const inTag = hasMarkup && insideTag(content, rel);
    if (isStatus) {
      if (hasMarkup && !inTag) {
        const call = `kitStatusDot('${isStatus}')`;
        edits.push({ s: absStart, e: absEnd, repl: spliceExpr(st.quote, call) }); sdot++;
      } else if (!noStrip) { edits.push({ s: delStart, e: delEnd, repl: '' }); strip++; }
    } else {
      if (hasMarkup && !inTag) {
        const call = `osIcon('${name}')`;
        edits.push({ s: absStart, e: absEnd, repl: spliceExpr(st.quote, call) }); splice++;
      } else if (!noStrip) { edits.push({ s: delStart, e: delEnd, repl: '' }); strip++; left[emo] = 'strip'; }
    }
    k += consume - 1;
  }
}
function spliceExpr(quote, call) {
  if (quote === 'tpl') return '${' + call + '}';
  const q = quote === 'sq' ? "'" : '"';
  return q + ' + ' + call + ' + ' + q;
}
// aplicar de atrás hacia adelante
edits.sort((a, b) => b.s - a.s);
for (const e of edits) src = src.slice(0, e.s) + e.repl + src.slice(e.e);

if (!dry) writeFileSync(file, src);
console.log(`${file}  splice=${splice} strip=${strip} statusdot=${sdot} bareIcon=${bare} review=${review.length}${dry ? ' (DRY)' : ''}`);
if (review.length) {
  // ubicar línea de cada string a revisar (bare-emoji → posible icon: field)
  const lines = [];
  for (const r of review) { const ln = readFileSync(file, 'utf8').slice(0, r.start).split('\n').length; lines.push(`L${ln}: ${JSON.stringify(r.text)}`); }
  console.log('  REVIEW (bare-emoji, sin tocar):\n    ' + lines.join('\n    '));
}
