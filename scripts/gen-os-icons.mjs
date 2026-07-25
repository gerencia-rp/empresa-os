// Genera ui/icons.js para Empresa OS desde lucide-static (SVGs oficiales).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIR = join(import.meta.dirname, '..', 'node_modules/lucide-static/icons');
const OUT = join(import.meta.dirname, '..', 'ui/icons.js');

// nombre canónico nuestro → candidatos lucide (el primero que exista gana)
const WANT = {
  'alert': ['triangle-alert', 'alert-triangle'],
  'alert-circle': ['circle-alert', 'alert-circle'],
  'check': ['check'],
  'check-circle': ['circle-check', 'check-circle'],
  'x': ['x'],
  'x-circle': ['circle-x', 'x-circle'],
  'ban': ['ban'],
  'info': ['info'],
  'help': ['circle-help', 'help-circle'],
  'clipboard': ['clipboard-list'],
  'clipboard-check': ['clipboard-check'],
  'house': ['house', 'home'],
  'target': ['target'],
  'calendar': ['calendar'],
  'calendar-days': ['calendar-days'],
  'chart': ['chart-column', 'bar-chart-3'],
  'chart-line': ['chart-line', 'line-chart'],
  'trending-up': ['trending-up'],
  'trending-down': ['trending-down'],
  'refresh': ['refresh-cw'],
  'bot': ['bot'],
  'save': ['save'],
  'lightbulb': ['lightbulb'],
  'brain': ['brain'],
  'search': ['search'],
  'message': ['message-circle'],
  'zap': ['zap'],
  'file': ['file-text'],
  'file-plus': ['file-plus'],
  'pencil': ['pencil'],
  'pencil-line': ['pencil-line'],
  'trash': ['trash-2'],
  'settings': ['settings'],
  'inbox': ['inbox'],
  'dollar': ['dollar-sign'],
  'banknote': ['banknote'],
  'wallet': ['wallet'],
  'coins': ['coins'],
  'credit-card': ['credit-card'],
  'receipt': ['receipt'],
  'piggy-bank': ['piggy-bank'],
  'rocket': ['rocket'],
  'printer': ['printer'],
  'construction': ['construction'],
  'hammer': ['hammer'],
  'wrench': ['wrench'],
  'ruler': ['ruler'],
  'brick': ['brick-wall'],
  'truck': ['truck'],
  'book': ['book-open'],
  'notebook': ['notebook-text', 'notebook'],
  'library': ['library'],
  'globe': ['globe'],
  'user': ['user'],
  'users': ['users'],
  'hard-hat': ['hard-hat'],
  'handshake': ['handshake'],
  'package': ['package'],
  'landmark': ['landmark'],
  'building': ['building-2'],
  'store': ['store'],
  'link': ['link'],
  'bed': ['bed-double', 'bed'],
  'door': ['door-open'],
  'key': ['key-round', 'key'],
  'graduation-cap': ['graduation-cap'],
  'trophy': ['trophy'],
  'medal': ['medal'],
  'folder': ['folder'],
  'folder-open': ['folder-open'],
  'paperclip': ['paperclip'],
  'plus': ['plus'],
  'minus': ['minus'],
  'map-pin': ['map-pin'],
  'map': ['map'],
  'compass': ['compass'],
  'hourglass': ['hourglass'],
  'clock': ['clock'],
  'loader': ['loader-circle', 'loader-2'],
  'megaphone': ['megaphone'],
  'gem': ['gem'],
  'image': ['image'],
  'factory': ['factory'],
  'stethoscope': ['stethoscope'],
  'upload': ['upload'],
  'download': ['download'],
  'ghost': ['ghost'],
  'dog': ['dog'],
  'flask': ['flask-conical'],
  'mail': ['mail'],
  'phone': ['phone'],
  'bell': ['bell'],
  'sun': ['sun'],
  'moon': ['moon'],
  'star': ['star'],
  'sparkles': ['sparkles'],
  'flame': ['flame'],
  'lock': ['lock'],
  'unlock': ['lock-open', 'unlock'],
  'eye': ['eye'],
  'eye-off': ['eye-off'],
  'calculator': ['calculator'],
  'briefcase': ['briefcase'],
  'network': ['waypoints', 'network'],
  'dna': ['dna'],
  'mic': ['mic'],
  'scale': ['scale'],
  'shield': ['shield'],
  'shield-check': ['shield-check'],
  'filter': ['funnel', 'filter'],
  'copy': ['copy'],
  'external-link': ['external-link'],
  'maximize': ['maximize-2', 'maximize'],
  'list': ['list'],
  'layout': ['layout-dashboard'],
  'table': ['table'],
  'pie-chart': ['chart-pie', 'pie-chart'],
  'activity': ['activity'],
  'party': ['party-popper'],
  'thumbs-up': ['thumbs-up'],
  'send': ['send'],
  'log-out': ['log-out'],
  'palette': ['palette'],
  'camera': ['camera'],
  'video': ['video'],
  'play': ['play'],
  'pause': ['pause'],
  'chevron-down': ['chevron-down'],
  'chevron-right': ['chevron-right'],
  'arrow-right': ['arrow-right'],
  'arrow-left': ['arrow-left'],
  'undo': ['undo-2', 'undo'],
  'circle-dot': ['circle-dot'],
};

const icons = {};
const missing = [];
for (const [name, cands] of Object.entries(WANT)) {
  let hit = null;
  for (const c of cands) { const p = join(DIR, c + '.svg'); if (existsSync(p)) { hit = p; break; } }
  if (!hit) { missing.push(name); continue; }
  const svg = readFileSync(hit, 'utf8');
  const inner = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>[\s\S]*$/, '')
    .replace(/<!--[\s\S]*?-->/g, '').replace(/\n\s*/g, ' ').trim();
  icons[name] = inner;
}
if (missing.length) { console.error('FALTAN:', missing.join(', ')); process.exit(1); }

const body = Object.entries(icons).map(([k, v]) => `  '${k}': ${JSON.stringify(v)}`).join(',\n');

const out = `// ════════════════════════════════════════════════════════════════
// 🧩 EMPRESA OS · ICONOS (Lucide inline, generado de lucide-static — NO editar a mano;
// regenerar con scripts/gen-os-icons.mjs (npm i --no-save lucide-static) si se agregan iconos).
// Reemplaza los emojis-icono del sistema de diseño (regla jul-2026: cero emojis en UI).
// API:
//   osIcon('house')                      → string SVG 16px stroke currentColor
//   osIcon('alert', {size:18, cls:'x'})  → tamaño/clase extra; {spin:true} para loaders
//   kitStatusDot('ok'|'warn'|'bad'|'off', 'texto opcional')  → semáforo (ex 🟢/🟡/🔴)
//   kitSpinner(msg) / kitSkeletonRows(n) → carga de marca (ver tokens.css)
// Funciones puras que devuelven strings HTML (arquitectura vanilla del OS).
// ════════════════════════════════════════════════════════════════
/* eslint-disable no-unused-vars */

const OS_ICONS = {
${body}
};

function osIcon(name, opts) {
  opts = opts || {};
  const inner = OS_ICONS[name];
  if (!inner) return '';
  const s = opts.size || 16;
  const cls = 'icn' + (opts.spin ? ' spin' : '') + (opts.cls ? ' ' + opts.cls : '');
  const style = opts.color ? ' style="color:' + opts.color + '"' : '';
  return '<svg class="' + cls + '"' + style + ' width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inner + '</svg>';
}

// ─── STATUS DOT: el semáforo canónico (reemplaza 🟢/🟡/🔴) ───
// estado: 'ok' | 'warn' | 'bad' | 'off' (acepta también 'go/revisar/nogo' y 'verde/amarillo/rojo')
function kitStatusDot(estado, label, opts) {
  opts = opts || {};
  const map = { ok: 'ok', go: 'ok', verde: 'ok', green: 'ok', pos: 'ok',
    warn: 'warn', revisar: 'warn', amarillo: 'warn', yellow: 'warn', med: 'warn',
    bad: 'bad', nogo: 'bad', rojo: 'bad', red: 'bad', neg: 'bad' };
  const k = map[String(estado || '').toLowerCase()] || 'off';
  const t = label != null && label !== '' ? label : '';
  return '<span class="status-dot ' + k + '"' + (opts.title ? ' title="' + opts.title + '"' : '') + '>'
    + '<span class="dot"></span>' + t + '</span>';
}

// ─── LOADERS de marca (reemplazan "⏳ Cargando…") ───
function kitSpinner(msg) {
  return '<div class="ui-loading"><div class="ui-spinner"></div><div>' + (msg || 'Cargando…') + '</div></div>';
}
function kitSkeletonRows(n, h) {
  let out = '<div style="display:grid;gap:10px">';
  for (let i = 0; i < (n || 3); i++) out += '<div class="skel" style="height:' + (h || 14) + 'px;width:' + (100 - (i % 3) * 12) + '%"></div>';
  return out + '</div>';
}

// exposición global (arquitectura vanilla del OS)
window.OS_ICONS = OS_ICONS; window.osIcon = osIcon; window.kitStatusDot = kitStatusDot;
window.kitSpinner = kitSpinner; window.kitSkeletonRows = kitSkeletonRows;
`;
writeFileSync(OUT, out);
console.log('OK', Object.keys(icons).length, 'iconos →', OUT);
