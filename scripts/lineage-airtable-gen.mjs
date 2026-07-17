#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════
// 🧭 Regenera os/os-lineage-airtable.js — identificadores EXACTOS de Airtable
// (nombre real de base + baseId, tabla + tableId, campo + fieldId) para el
// Mapa de Conexiones (/mapa). Correr cuando cambie el esquema de Airtable:
//   AIRTABLE_API_KEY=pat... node scripts/lineage-airtable-gen.mjs
// El PAT necesita scope schema.bases:read sobre las 3 bases.
// Los base IDs efectivos salen del CÓDIGO de los syncs (default sin secret
// override — verificado 17-jul-2026 con `supabase secrets list`); si algún día
// se setean AIRTABLE_BASE_ID / _FF / _REMODEL en Supabase Secrets, actualizar acá.
// ════════════════════════════════════════════════════════════════
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KEY = process.env.AIRTABLE_API_KEY || process.env.AIRTABLE_TOKEN;
if (!KEY) { console.error('Falta AIRTABLE_API_KEY (PAT con schema.bases:read)'); process.exit(1); }

// alias del mapa → { módulo que sincroniza, env de override, archivo fuente + fallback esperado }
const MODULOS = [
  { alias: 'Rentas', modulo: 'pm-sync-airtable', env: 'AIRTABLE_BASE_ID', src: 'supabase/functions/pm-sync-airtable/index.ts', re: /AIRTABLE_BASE_ID"?\)\s*\|\|\s*"(app[A-Za-z0-9]{14})"/ },
  { alias: 'Fix & Flip', modulo: 'sync-ff-airtable', env: 'AIRTABLE_BASE_ID_FF', src: 'supabase/functions/sync-ff-airtable/index.ts', re: /AIRTABLE_BASE_ID_FF"?\)\s*\|\|\s*"(app[A-Za-z0-9]{14})"/ },
  { alias: 'Remodelación', modulo: 'sync-remodel-airtable · sync-remodel-workers', env: 'AIRTABLE_BASE_ID_REMODEL', src: 'supabase/functions/sync-remodel-airtable/index.ts', re: /AIRTABLE_BASE_ID_REMODEL"?\)\s*\|\|\s*"(app[A-Za-z0-9]{14})"/ },
];

const at = async (p) => {
  const r = await fetch('https://api.airtable.com/v0/meta/' + p, { headers: { Authorization: 'Bearer ' + KEY } });
  if (!r.ok) throw new Error(p + ' → HTTP ' + r.status + ' ' + (await r.text()).slice(0, 200));
  return r.json();
};

const bases = (await at('bases')).bases || [];
const nameOf = (id) => (bases.find((b) => b.id === id) || {}).name || null;

const out = { modulos: [], schema: {}, otras: [] };
for (const m of MODULOS) {
  const src = readFileSync(path.join(ROOT, m.src), 'utf8');
  const hit = src.match(m.re);
  if (!hit) throw new Error('No pude leer el base ID default de ' + m.src + ' — ¿cambió el patrón?');
  const baseId = hit[1];
  out.modulos.push({ ...m, baseId, nombre: nameOf(baseId) });
  const tables = (await at('bases/' + baseId + '/tables')).tables || [];
  out.schema[baseId] = {};
  for (const t of tables) {
    const f = {};
    for (const fl of t.fields || []) f[fl.id] = fl.name;
    out.schema[baseId][t.id] = { n: t.name, f };
  }
}
// otras bases con nombre parecido que la app NO lee (anti-confusión)
const leidas = new Set(out.modulos.map((m) => m.baseId));
out.otras = bases.filter((b) => !leidas.has(b.id) && /rentas|flipping rentals matriz|producci/i.test(b.name))
  .map((b) => ({ id: b.id, nombre: b.name }));

console.log('Bases leídas por la app:');
out.modulos.forEach((m) => console.log('  ' + m.alias + ' → "' + m.nombre + '" · ' + m.baseId + ' (' + m.modulo + ')'));
console.log('Otras parecidas (NO leídas): ' + out.otras.map((o) => o.id).join(', '));
console.log('\n⚠ Este script imprime el snapshot; pegar los cambios en os/os-lineage-airtable.js');
console.log('(el archivo generado se mantiene versionado — diff manual para no perder notas curadas).');
writeFileSync(path.join(ROOT, 'scripts', 'lineage-airtable-snapshot.json'), JSON.stringify(out, null, 2));
console.log('Snapshot escrito en scripts/lineage-airtable-snapshot.json');
