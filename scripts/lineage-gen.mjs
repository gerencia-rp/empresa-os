// 🗺️ Generador del linaje de VISTAS desde la metadata REAL de Postgres.
// Lee information_schema.view_column_usage (qué columnas de qué tablas consume cada v_*)
// y escribe os/os-lineage-views.js (window.LINEAGE_VIEWS) — el Mapa de Conexiones lo usa
// para mostrar "esta vista lee de…" sin escribirlo a mano. Correr tras cambiar vistas:
//   SB_KEY=sb_secret_... node scripts/lineage-gen.mjs
import { writeFileSync } from 'fs';

const URL = 'https://nezbaljfhhyznhltpjnk.supabase.co';
const KEY = process.env.SB_KEY;
if (!KEY) { console.error('Falta SB_KEY'); process.exit(1); }

const SQL = `select view_name, table_name, array_agg(distinct column_name order by column_name) cols
from information_schema.view_column_usage
where view_schema='public' and view_name like 'v\\_%' group by 1,2 order by 1,2`;

// pg-meta query endpoint no está expuesto por REST — usamos la RPC exec de supabase-js vía postgrest /rpc no existe;
// fallback: el endpoint de pg-meta de la Management API requiere token. Para simplicidad usamos el
// SQL API de Supabase (POST /pg) si está, si no instruimos correrlo desde el MCP y pegar el JSON.
async function main() {
  const r = await fetch(URL + '/rest/v1/rpc/lineage_view_usage', {
    method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, body: '{}',
  });
  if (!r.ok) {
    console.error('RPC lineage_view_usage no disponible (' + r.status + ').');
    console.error('Creala una vez con:\n  create or replace function lineage_view_usage() returns table(view_name text, table_name text, cols text[]) language sql security definer set search_path=public as $$ ' + SQL + ' $$;');
    process.exit(1);
  }
  const rows = await r.json();
  const map = {};
  rows.forEach(x => { (map[x.view_name] = map[x.view_name] || []).push({ t: x.table_name, c: x.cols }); });
  const out = '// GENERADO por scripts/lineage-gen.mjs — NO editar a mano (regenerar tras cambiar vistas)\n'
    + '// Linaje real vista → tablas·columnas desde information_schema.view_column_usage (' + new Date().toISOString().slice(0, 10) + ')\n'
    + 'window.LINEAGE_VIEWS = ' + JSON.stringify(map, null, 1) + ';\n';
  writeFileSync(new globalThis.URL('../os/os-lineage-views.js', import.meta.url), out);
  console.log('✓ os/os-lineage-views.js — ' + Object.keys(map).length + ' vistas');
}
main();
