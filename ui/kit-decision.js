// ════════════════════════════════════════════════════════════════
// 🧭 EMPRESA OS · KIT DE DECISIÓN (O4, auditoría 2026-07-13) — el puente dato→decisión.
// Tres componentes usables en CUALQUIER KPI (complementan ui/kit.js):
//   kitTerm(term[, txt])      → TermTooltip: definición al hover desde el GLOSARIO central.
//   kitDrill(valor, titulo, detalleHtml[, fuente]) → DrillDown: clic en el número abre su desglose
//                               y los registros de origen [Airtable/QBO/OS].
//   kitNext(porQue, queHacer[, quien]) → NextAction: cada estado ROJO trae "🔍 Qué revisar"
//                               + acción sugerida (patrón EVM, el norte validado por el CEO).
//   kitKpi(opts)              → Tarjeta-KPI estándar que combina los tres (gate del punto 8).
//   kitSkeleton(n)            → loading real (shimmer), no el atenuado que parece error.
// Funciones puras → strings HTML (arquitectura vanilla). Tokens de ui/tokens.css.
// ════════════════════════════════════════════════════════════════
/* eslint-disable no-unused-vars */

// ─── GLOSARIO CENTRAL (lenguaje humano — una sola definición por término) ───
const KIT_GLOSARIO = {
  'all-in': 'Todo lo que llevás metido en la casa: compra + remodelación (+ intereses del hold). La regla: que no pase del 75% del ARV.',
  'arv': 'After Repair Value — lo que vale la casa YA remodelada. Se estima con casas parecidas vendidas cerca (comps), no con promedios.',
  'mao': 'Máxima Oferta Aceptable — el precio máximo que podés pagar por la casa para que el deal siga ganando (75% del ARV − remodelación).',
  'dscr': 'Debt Service Coverage Ratio — cuántas veces la renta cubre la cuota del préstamo. El banco del refi pide que la renta alcance (≥1 es lo mínimo).',
  'hml': 'Hard Money Lender — el prestamista privado (Harmony) que financia compra + obra, caro y a corto plazo. Se paga al refinanciar o vender.',
  'draw': 'Desembolso del HML para la obra. Sale por partes contra avance; de ese mismo dinero salen intereses, servicios y muebles.',
  'cash-out': 'La plata que te devuelve el refinanciamiento: préstamo nuevo del banco − lo que debías al HML. Con eso recuperás capital.',
  'deficit': 'Plata que salió y todavía no volvió (se recupera vía refi o venta). NO es pérdida: es capital atrapado en el hold.',
  'spi': 'Schedule Performance Index — qué tan a tiempo va la obra (1 = en cronograma, <1 = atrasada).',
  'cpi': 'Cost Performance Index — qué tan dentro del presupuesto va la obra (1 = en presupuesto, <1 = gastando de más).',
  'icr': 'Interest Coverage Ratio — cuántas veces la operación cubre su propio interés (NOI ÷ interés). <1 = el interés se come el negocio.',
  'cap-rate': 'Capitalization rate — la renta neta anual dividida por el valor de la casa. Mide el retorno de la propiedad sin deuda.',
  'brrrr': 'Buy, Rehab, Rent, Refinance, Repeat — comprar, remodelar, rentar, refinanciar para recuperar el capital, y repetir con la misma plata.',
  'equity': 'El valor que ya es tuyo: lo que vale la casa (ARV) menos todo lo que llevás metido (all-in). Es la ganancia incorporada, aún sin vender.',
  'ltv': 'Loan-to-Value — qué % del valor de la casa presta el banco (ej. refi al 75% del appraisal).',
  'noi': 'Net Operating Income — renta menos gastos operativos, ANTES de pagar el préstamo.',
  'refi': 'Refinanciamiento — cambiar el préstamo caro del HML por uno bancario a 30 años; ahí se recupera capital (cash-out).',
  'escrow': 'Fondo que el prestamista retiene para impuestos/seguro (impound). Si el statement lo trae, va INCLUIDO en el pago mensual.',
  'comps': 'Casas comparables vendidas cerca, con las que un tasador estima el valor. Se ajustan por tamaño, cuartos, baños, año y lote.',
  'gross-adj': 'Ajuste bruto — cuánto hubo que ajustar un comp para compararlo (suma de ajustes en valor absoluto). Menor = más parecido.',
  'wholesale': 'Deal comprado a un intermediario (wholesaler) que cobra un assignment fee por pasarte el contrato.',
  'holding': 'El tiempo que la casa está tuya sin rentar: cada mes cuesta intereses + servicios (el costo del reloj).',
  'vacancy': 'El % del tiempo que una unidad está vacía entre inquilinos. Por habitaciones rota más que casa completa.',
  'ebitda': 'Ganancia operativa antes de intereses, impuestos, depreciación y amortización. Ojo: el déficit de capital en hold NO es EBITDA.',
};
function kitTerm(term, txt) {
  const key = String(term || '').toLowerCase();
  const def = KIT_GLOSARIO[key];
  const label = txt || term;
  if (!def) return kitEsc(label);
  return '<span class="kit-term" tabindex="0">' + kitEsc(label) + '<span class="kit-term-tip">' + kitEsc(def) + '</span></span>';
}

// ─── DRILLDOWN: clic en un número → overlay con el desglose y los registros de origen ───
const KIT_DRILL_REG = {};
let KIT_DRILL_SEQ = 0;
function kitDrill(valorHtml, titulo, detalleHtml, fuente) {
  const id = 'kd' + (++KIT_DRILL_SEQ);
  KIT_DRILL_REG[id] = { titulo, html: detalleHtml, fuente: fuente || 'OS' };
  return '<span class="kit-drill" onclick="kitDrillOpen(\'' + id + '\')" title="clic: ver desglose y origen">' + valorHtml + '<span class="kit-drill-ico">⌕</span></span>';
}
function kitDrillOpen(id) {
  const d = KIT_DRILL_REG[id]; if (!d) return;
  let ov = document.getElementById('kit-drill-ov');
  if (!ov) { ov = document.createElement('div'); ov.id = 'kit-drill-ov'; document.body.appendChild(ov); }
  ov.innerHTML = '<div class="kit-drill-panel">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px">'
    + '<div style="font-size:15px;font-weight:800;color:var(--ink)">' + d.titulo + ' <span class="badge b-warn" style="font-size:9px;vertical-align:middle">' + kitEsc(d.fuente) + '</span></div>'
    + '<button class="btn-ghost" style="padding:4px 12px" onclick="document.getElementById(\'kit-drill-ov\').remove()">✕</button></div>'
    + d.html + '</div>';
  ov.onclick = e => { if (e.target === ov) ov.remove(); };
}
window.kitDrillOpen = kitDrillOpen;

// ─── NEXTACTION: cada rojo trae "🔍 Qué revisar" + acción + dueño (patrón EVM) ───
function kitNext(porQue, queHacer, quien) {
  return '<div class="kit-next">'
    + '<div style="font-size:11px;font-weight:800;color:var(--amber);margin-bottom:3px">🔍 Qué revisar</div>'
    + '<div style="font-size:12px;color:var(--txt2, var(--ink))">' + porQue + '</div>'
    + (queHacer ? '<div style="font-size:12px;color:var(--ink);margin-top:5px">→ <b>' + queHacer + '</b>' + (quien ? ' <span style="color:var(--mut)">· ' + kitEsc(quien) + '</span>' : '') + '</div>' : '')
    + '</div>';
}

// ─── TARJETA-KPI ESTÁNDAR (combina TermTooltip + DrillDown + NextAction + fuente) ───
// opts: { label, term?, valor, sub?, estado?:'ok'|'warn'|'neg', fuente?:'OS'|'QBO'|'Airtable',
//         drill?:{titulo,html}, next?:{porque,accion,quien}, falta?:'texto de qué falta' }
function kitKpi(opts) {
  const o = opts || {};
  if (o.falta) return '<div class="card kit-kpi" style="border-style:dashed"><div class="kit-kpi-lab">' + (o.term ? kitTerm(o.term, o.label) : o.label) + '</div>'
    + '<div style="font-size:20px;font-weight:700;color:var(--mut)">—</div>'
    + '<div style="font-size:11px;color:var(--amber)">🟡 ' + o.falta + '</div></div>';
  const color = o.estado === 'ok' ? 'var(--pos)' : o.estado === 'neg' ? 'var(--neg)' : o.estado === 'warn' ? 'var(--amber)' : 'var(--ink)';
  const val = o.drill ? kitDrill('<b style="font-size:26px;font-weight:800;color:' + color + '">' + o.valor + '</b>', o.drill.titulo || o.label, o.drill.html, o.fuente)
    : '<b style="font-size:26px;font-weight:800;color:' + color + '">' + o.valor + '</b>';
  return '<div class="card kit-kpi">'
    + '<div class="kit-kpi-lab">' + (o.term ? kitTerm(o.term, o.label) : o.label)
    + (o.fuente ? ' <span class="badge b-warn" style="font-size:8.5px;opacity:.8">' + kitEsc(o.fuente) + '</span>' : '') + '</div>'
    + '<div style="margin:4px 0 2px">' + val + '</div>'
    + (o.sub ? '<div style="font-size:11px;color:var(--mut)">' + o.sub + '</div>' : '')
    + (o.next && o.estado === 'neg' ? kitNext(o.next.porque, o.next.accion, o.next.quien) : '')
    + '</div>';
}

// ─── SKELETON: loading real (shimmer) — no el "atenuado que parece error" ───
function kitSkeleton(n, alto) {
  let out = '';
  for (let i = 0; i < (n || 3); i++) out += '<div class="kit-skel" style="height:' + (alto || 16) + 'px;width:' + (70 + ((i * 13) % 30)) + '%"></div>';
  return '<div style="display:flex;flex-direction:column;gap:10px;padding:6px 0">' + out + '</div>';
}

// ─── CSS de los componentes (inyección única, tokens del design system) ───
(function kitDecisionCSS() {
  if (typeof document === 'undefined' || document.getElementById('kit-decision-css')) return;
  const st = document.createElement('style'); st.id = 'kit-decision-css';
  st.textContent = [
    '.kit-term{border-bottom:1.5px dotted var(--mut,#8ea0c4);cursor:help;position:relative}',
    '.kit-term .kit-term-tip{display:none;position:absolute;left:0;bottom:130%;z-index:1000;width:270px;background:var(--card,#151d31);color:var(--ink,#eaf0ff);border:1px solid var(--line,rgba(128,144,176,.3));border-radius:10px;padding:10px 12px;font-size:11.5px;font-weight:400;line-height:1.45;box-shadow:0 10px 30px rgba(0,0,0,.25);text-transform:none;letter-spacing:0}',
    '.kit-term:hover .kit-term-tip,.kit-term:focus .kit-term-tip{display:block}',
    '.kit-drill{cursor:pointer;border-radius:6px}',
    '.kit-drill:hover{background:color-mix(in srgb, var(--a2,#3b74ff) 10%, transparent)}',
    '.kit-drill-ico{font-size:11px;color:var(--mut,#8ea0c4);margin-left:4px;vertical-align:super}',
    '#kit-drill-ov{position:fixed;inset:0;background:rgba(5,10,20,.55);z-index:1300;display:flex;align-items:center;justify-content:center;padding:20px}',
    '.kit-drill-panel{background:var(--bg,#0e1526);color:var(--ink,#eaf0ff);border:1px solid var(--line,rgba(128,144,176,.3));border-radius:16px;padding:18px 20px;max-width:640px;width:100%;max-height:80vh;overflow:auto;box-shadow:0 20px 60px rgba(0,0,0,.4)}',
    '.kit-next{margin-top:9px;background:color-mix(in srgb, var(--amber,#f5b544) 9%, transparent);border:1px solid color-mix(in srgb, var(--amber,#f5b544) 30%, transparent);border-radius:10px;padding:9px 12px}',
    '.kit-kpi{padding:15px 17px}',
    '.kit-kpi-lab{font-size:10.5px;text-transform:uppercase;letter-spacing:.7px;color:var(--mut,#8ea0c4);font-weight:800}',
    '.kit-skel{border-radius:6px;background:linear-gradient(90deg,var(--card,rgba(255,255,255,.05)) 25%,color-mix(in srgb, var(--ink,#fff) 9%, transparent) 50%,var(--card,rgba(255,255,255,.05)) 75%);background-size:200% 100%;animation:kitShimmer 1.3s infinite}',
    '@keyframes kitShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}',
    '@media (prefers-reduced-motion: reduce){.kit-skel{animation:none}}',
  ].join('\n');
  document.head.appendChild(st);
})();

// ─── GUARD-RAILS DE SANITY (B17/P3) — reusables en cualquier tile ───
// noZeroAsReal: si el valor FUENTE es null/vacío → "sin dato" (nunca $0 con ✅).
function noZeroAsReal(v, fmt, motivo) {
  if (v == null || v === '' || (typeof v === 'number' && isNaN(v)))
    return '<span style="color:var(--mut)" title="' + kitEsc(motivo || 'la fuente no tiene este dato') + '">— sin dato</span>';
  return (fmt || kitMoney)(+v);
}
// reconcileLE: la parte no puede superar el total (ej. Σdescuadres ≤ Total Assets).
// Si se viola → {ok:false} + banda "motor en error" (B2): jamás mostrar la cifra imposible como real.
function reconcileLE(parte, total, etiqueta) {
  const ok = parte == null || total == null || +parte <= +total;
  return {
    ok,
    html: ok ? '' : '<div style="background:color-mix(in srgb, var(--neg) 10%, transparent);border:1px solid color-mix(in srgb, var(--neg) 35%, transparent);border-radius:10px;padding:9px 12px;font-size:12px;color:var(--neg);font-weight:700">⛔ Motor en error: ' + kitEsc(etiqueta || '') + ' — la cifra calculada (' + kitMoney(parte) + ') supera el total posible (' + kitMoney(total) + '). No se muestra como dato real.</div>',
  };
}
// emptyState: estado vacío estándar (alias semántico del kitEmpty del design system)
function emptyState(icon, msg, cta) { return kitEmpty(icon, msg, cta); }

// exposición global
window.KIT_GLOSARIO = KIT_GLOSARIO;
window.kitTerm = kitTerm; window.kitDrill = kitDrill; window.kitNext = kitNext;
window.kitKpi = kitKpi; window.kitSkeleton = kitSkeleton;
window.noZeroAsReal = noZeroAsReal; window.reconcileLE = reconcileLE; window.emptyState = emptyState;
