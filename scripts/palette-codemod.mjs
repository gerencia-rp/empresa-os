// ════════════════════════════════════════════════════════════════
// Codemod de PALETA: hex frío (azul/gris/teal/violeta) → cálido (verde bosque + hueso).
// Reemplaza tokens hex exactos (case-insensitive) en el texto del archivo. Los hex sólo
// aparecen como colores en CSS/estilos inline → reemplazo directo seguro (no son datos).
// Uso: node scripts/palette-codemod.mjs <archivo> [--dry]
// ════════════════════════════════════════════════════════════════
import { readFileSync, writeFileSync } from 'node:fs';

// cold → warm (todos en minúscula; el match es case-insensitive)
const MAP = {
  // ── acentos: teal/azul/violeta → verde bosque / oliva / dorado ──
  '#45e3c6': '#6fbf95', '#12c2b3': '#6fbf95', '#12b5a0': '#6fbf95', '#12b76a': '#63c08e', '#a9f5e6': '#b8e6cd',
  '#4f8dff': '#4e9b72', '#3b74ff': '#4e9b72', '#5b9dff': '#4e9b72',
  '#8a7bff': '#c9a85c', '#6b5bef': '#8a6a2f', '#b98cff': '#c9a85c',
  '#2563eb': '#2f6b4f', '#1d4ed8': '#275c43', '#1f6bff': '#2f6b4f', '#3b82f6': '#2f6b4f',
  '#2a2f66': '#1c3327', '#0891b2': '#2f6b4f',
  // ── fondos oscuros fríos → carbón cálido ──
  '#06080d': '#14110c', '#070a11': '#16130d', '#05070c': '#100e08', '#04101f': '#14110c',
  '#0a0e16': '#17140f', '#0f151e': '#171410', '#0b1119': '#120f0a', '#08090f': '#14110c',
  '#0f1420': '#17140f', '#171d2b': '#1d1913', '#1e2636': '#252017', '#151d28': '#1d1913',
  '#131a24': '#1a1610', '#1b2634': '#252017', '#1b2540': '#252017', '#151d31': '#1d1913',
  '#0a2342': '#14110c', '#1c1508': '#1c1508',
  // ── texto claro (sobre oscuro) ──
  '#eef2f8': '#efe9de', '#e6ebf5': '#efe9de', '#e7ecf5': '#efe9de', '#eef1f7': '#f7f5f0',
  '#c9d5ea': '#d9d1c2', '#9fb0c9': '#a69d8c', '#c9d5e9': '#d9d1c2', '#e7ecf5': '#efe9de',
  // ── grises muted fríos ──
  '#93a0b6': '#a89f8f', '#94a3b8': '#a89f8f', '#5b6780': '#7c7365', '#64748b': '#756c5c',
  '#475569': '#5f594c', '#48566e': '#5f594c', '#6b7a90': '#7c7365', '#8fa3bf': '#a89f8f',
  '#334155': '#454034', '#0f172a': '#211e17', '#0f1c2e': '#211e17', '#1e293b': '#252017',
  '#e2e8f0': '#e8e3d9', '#cbd5e1': '#d8d2c6', '#e4e8ee': '#e8e3d9', '#e3e8f0': '#e8e3d9',
  '#f3f5fa': '#f9f7f2', '#e9edf5': '#f2efe8', '#f8fafc': '#faf8f4', '#f1f5f9': '#f2efe8',
  '#edf1f6': '#f2efe8', '#f2f5f9': '#f7f5f0', '#f7f9fc': '#faf8f4',
  // ── semánticos (positivo teal-ish → verde cálido; se mantienen rojo/ámbar cálidos) ──
  '#48d69c': '#63c08e', '#0f9d6b': '#1f7a4d', '#34d399': '#63c08e', '#10b981': '#1f7a4d', '#00d084': '#1f7a4d', '#00794c': '#1f7a4d',
  '#f0687a': '#e4756a', '#f87171': '#e4756a',
  '#e7b65e': '#dca94f', '#b45309': '#8a6400',
  // ── meshes/glow fríos residuales ──
  '#2a3348': '#2a2417',
};

const file = process.argv[2];
const dry = process.argv.includes('--dry');
if (!file) { console.error('uso: node scripts/palette-codemod.mjs <archivo> [--dry]'); process.exit(1); }
let src = readFileSync(file, 'utf8');
let n = 0, skipped = 0;
// ¿el hex en `idx` está dentro de un selector de atributo `[style*="…#hex…"]`? (matcher de reskin —
// NO tocar: cambia a qué estilo inline de las apps clásicas engancha el override)
function inStyleMatcher(idx) {
  const back = src.slice(Math.max(0, idx - 40), idx);
  const ob = back.lastIndexOf('[style*='); if (ob < 0) return false;
  return !back.slice(ob).includes(']'); // abrió [style*= y aún no cerró ] antes del hex
}
for (const [cold, warm] of Object.entries(MAP)) {
  const re = new RegExp(cold + '(?![0-9a-fA-F])', 'gi');
  src = src.replace(re, (m, idx) => { if (inStyleMatcher(idx)) { skipped++; return m; } n++; return warm; });
}
if (!dry) writeFileSync(file, src);
console.log(`${file}  colores=${n}${skipped ? ' skip-matcher=' + skipped : ''}${dry ? ' (DRY)' : ''}`);
