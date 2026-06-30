// ════════════════════════════════════════════════════════════════
// Templates HTML para PDF (chromium headless). Branding "Ever Home
// Management": header navy con barra de acento verde→oro, tarjetas claras.
//   · weeklyReportHTML(data)   — operación
//   · monthlyReportHTML(data)  — finanzas
//   · welcomeGuideHTML(data)   — guía de bienvenida (check-in)
// Funciones puras: data → string HTML. Sin dependencias.
// ════════════════════════════════════════════════════════════════

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const money = (n) => "$" + (Math.round((n || 0) * 100) / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const money2 = (n) => "$" + (Math.round((n || 0) * 100) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fdate = (iso) => { try { return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" }); } catch { return iso || ""; } };

export const BRAND = {
  name: "Ever Home Management",
  product: "Rental Profits · Property Manager",
  email: "info.flippingrentals@gmail.com",
  phone: "737-368-6846",
};

// ─── CSS base compartido ────────────────────────────────────────────
const BASE_CSS = `
*{box-sizing:border-box;margin:0;padding:0}
:root{--navy:#0f2742;--navy2:#1b3c63;--green:#2ecc71;--green-d:#10b981;--gold:#c9a227;--ink:#1e293b;--muted:#64748b;--line:#e2e8f0;--bg:#f4f5f0;--red:#dc2626;--red-bg:#fef2f2;--amber:#b45309;--amber-bg:#fffbeb}
@page{size:Letter;margin:0}
html,body{font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:var(--ink);background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:8.5in;min-height:11in;margin:0 auto;background:var(--bg);position:relative;display:flex;flex-direction:column}
.page+.page{page-break-before:always}
.hdr{background:linear-gradient(135deg,var(--navy) 0%,var(--navy2) 100%);color:#fff;padding:34px 44px 30px}
.hdr .eyebrow{font-size:10px;letter-spacing:2.5px;font-weight:700;color:var(--green);text-transform:uppercase;display:flex;align-items:center;gap:8px}
.hdr .eyebrow .dot{width:6px;height:6px;border-radius:50%;background:var(--green)}
.hdr h1{font-size:30px;font-weight:800;line-height:1.12;margin-top:14px;letter-spacing:-.5px}
.hdr .sub{font-size:13px;color:#c7d6e8;margin-top:10px;max-width:560px;line-height:1.5}
.hdr .pill{display:inline-flex;align-items:center;gap:10px;margin-top:18px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16);border-radius:10px;padding:10px 16px;font-size:13px}
.hdr .pill b{font-weight:700}.hdr .pill .meta{color:#9fb4cc}
.accent{height:5px;background:linear-gradient(90deg,var(--green) 0%,var(--green-d) 45%,var(--gold) 100%)}
.body{padding:26px 44px 30px;flex:1}
.sec{margin-top:26px}.sec:first-child{margin-top:6px}
.sec-h{display:flex;align-items:center;gap:12px;margin-bottom:14px}
.sec-h .ico{width:34px;height:34px;border-radius:9px;background:#fff;border:1px solid var(--line);display:flex;align-items:center;justify-content:center;font-size:17px;box-shadow:0 1px 2px rgba(15,39,66,.06)}
.sec-h h2{font-size:17px;font-weight:800;color:var(--navy)}
.sec-h .rule{flex:1;height:1px;background:var(--line)}
.card{background:#fff;border:1px solid var(--line);border-radius:13px;padding:18px 20px;box-shadow:0 1px 3px rgba(15,39,66,.05)}
.grid{display:grid;gap:14px}.g2{grid-template-columns:1fr 1fr}.g3{grid-template-columns:1fr 1fr 1fr}.g4{grid-template-columns:repeat(4,1fr)}
.kpi{background:#fff;border:1px solid var(--line);border-radius:13px;padding:16px 18px;box-shadow:0 1px 3px rgba(15,39,66,.05)}
.kpi .lbl{font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:var(--muted);font-weight:700}
.kpi .val{font-size:26px;font-weight:800;color:var(--navy);margin-top:6px;line-height:1}
.kpi .note{font-size:11px;color:var(--muted);margin-top:6px}
.kpi.good{border-left:4px solid var(--green-d)}.kpi.bad{border-left:4px solid var(--red)}.kpi.neutral{border-left:4px solid var(--navy2)}
.kpi .val.pos{color:var(--green-d)}.kpi .val.neg{color:var(--red)}
table{width:100%;border-collapse:collapse;font-size:12px}
th{text-align:left;font-size:10px;letter-spacing:.6px;text-transform:uppercase;color:var(--muted);font-weight:700;padding:8px 10px;border-bottom:2px solid var(--line)}
td{padding:9px 10px;border-bottom:1px solid #eef1f4;color:var(--ink)}
tr:last-child td{border-bottom:none}
.num{text-align:right;font-variant-numeric:tabular-nums;font-weight:600}
.bar{height:7px;border-radius:4px;background:#edf0f3;overflow:hidden;min-width:60px}
.bar>span{display:block;height:100%;border-radius:4px}
.chip{display:inline-block;font-size:10px;font-weight:700;padding:2px 9px;border-radius:20px}
.chip.red{background:var(--red-bg);color:var(--red)}.chip.amber{background:var(--amber-bg);color:var(--amber)}
.chip.green{background:#ecfdf5;color:var(--green-d)}.chip.slate{background:#f1f5f9;color:var(--muted)}
.alert{display:flex;gap:11px;padding:11px 14px;border-radius:10px;background:var(--red-bg);border:1px solid #fecaca;margin-bottom:8px;align-items:flex-start}
.alert .ic{color:var(--red);font-size:14px;margin-top:1px}
.alert .tx{font-size:12px;color:#7f1d1d;line-height:1.45}
.alert .tx b{color:#991b1b}
.banner{border-radius:12px;padding:14px 18px;display:flex;align-items:center;gap:12px;font-size:13px}
.banner.ok{background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46}
.banner.warn{background:var(--amber-bg);border:1px solid #fde68a;color:#92400e}
.foot{padding:14px 44px 26px;display:flex;justify-content:space-between;font-size:10px;color:var(--muted);border-top:1px solid var(--line);margin-top:auto}
.muted{color:var(--muted)}.small{font-size:11px}.b{font-weight:700}.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
.empty{font-size:12px;color:var(--muted);font-style:italic;padding:6px 2px}
`;

function shell(title, bodyHTML, css = "") {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${BASE_CSS}${css}</style></head><body>${bodyHTML}</body></html>`;
}
function header(eyebrow, h1, sub, pill) {
  return `<div class="hdr">
    <div class="eyebrow"><span class="dot"></span> ${esc(eyebrow)}</div>
    <h1>${esc(h1)}</h1>${sub ? `<div class="sub">${esc(sub)}</div>` : ""}
    ${pill ? `<div class="pill"><b>${esc(pill.main)}</b><span class="meta">${esc(pill.meta)}</span></div>` : ""}
  </div><div class="accent"></div>`;
}
function foot(left) {
  return `<div class="foot"><span>${esc(left)}</span><span>${esc(BRAND.name)} · ${esc(BRAND.product)}</span></div>`;
}
function barColor(pct) { return pct >= 80 ? "var(--green-d)" : pct >= 50 ? "var(--gold)" : "var(--red)"; }

// ════════════════════════════════════════════════════════════════
// SEMANAL · operación
// ════════════════════════════════════════════════════════════════
export function weeklyReportHTML(d) {
  const o = d.occupancy;
  const occBanner = o.pct >= 85
    ? `<div class="banner ok">✅ <span>Ocupación saludable: <b>${o.pct}%</b> (${o.occupied + o.reserved}/${o.total} unidades ocupadas o reservadas).</span></div>`
    : `<div class="banner warn">⚠️ <span>Ocupación en <b>${o.pct}%</b> — hay <b>${o.free}</b> unidad(es) libre(s) para colocar.</span></div>`;

  const lowRows = d.lowOccupancy.slice(0, 12).map((h) => `
    <tr><td class="b">${esc(h.name)}</td>
      <td><div style="display:flex;align-items:center;gap:8px"><div class="bar" style="flex:1"><span style="width:${h.pct}%;background:${barColor(h.pct)}"></span></div><span class="num" style="min-width:34px">${h.pct}%</span></div></td>
      <td class="num">${h.occ + h.res}/${h.total}</td>
      <td class="num"><span class="chip ${h.free > 0 ? "amber" : "green"}">${h.free} libre${h.free === 1 ? "" : "s"}</span></td></tr>`).join("");

  const freeRows = d.freeUnits.slice(0, 20).map((f) => `<tr><td class="b">${esc(f.house)}</td><td>${esc(f.unit)}</td></tr>`).join("");

  const critRows = d.criticalAlerts.slice(0, 14).map((a) => `
    <div class="alert"><span class="ic">●</span><div class="tx"><b>[${esc(a.category || "alerta")}]</b> ${esc(a.message)}</div></div>`).join("");

  const body = `
    ${header("Ever Home Management · Reporte Semanal", "Operación de la semana", "Estado de ocupación, unidades libres y alertas críticas abiertas para priorizar la semana.", { main: "Reporte de operación", meta: fdate(d.generatedAt) })}
    <div class="body">
      <div class="sec">${occBanner}</div>
      <div class="sec">
        <div class="grid g4">
          <div class="kpi neutral"><div class="lbl">Ocupación global</div><div class="val">${o.pct}%</div><div class="note">${o.occupied + o.reserved}/${o.total} unidades</div></div>
          <div class="kpi good"><div class="lbl">Ocupadas</div><div class="val">${o.occupied}</div><div class="note">+ ${o.reserved} reservadas</div></div>
          <div class="kpi ${o.free > 0 ? "bad" : "good"}"><div class="lbl">Libres</div><div class="val">${o.free}</div><div class="note">para colocar</div></div>
          <div class="kpi ${d.criticalAlerts.length ? "bad" : "good"}"><div class="lbl">Alertas críticas</div><div class="val">${d.criticalAlerts.length}</div><div class="note">${d.warningCount} advertencias</div></div>
        </div>
      </div>

      <div class="sec">
        <div class="sec-h"><div class="ico">📉</div><h2>Casas con baja ocupación</h2><div class="rule"></div></div>
        <div class="card">${d.lowOccupancy.length ? `<table><thead><tr><th>Casa</th><th style="width:38%">Ocupación</th><th class="num">Ocupadas</th><th class="num">Libres</th></tr></thead><tbody>${lowRows}</tbody></table>` : `<div class="banner ok">✅ <span>Todas las casas con ocupación completa.</span></div>`}</div>
      </div>

      <div class="sec">
        <div class="sec-h"><div class="ico">🔑</div><h2>Unidades libres (${d.freeUnits.length})</h2><div class="rule"></div></div>
        <div class="card">${d.freeUnits.length ? `<table><thead><tr><th>Casa</th><th>Unidad</th></tr></thead><tbody>${freeRows}</tbody></table>${d.freeUnits.length > 20 ? `<div class="small muted" style="margin-top:8px">… y ${d.freeUnits.length - 20} más</div>` : ""}` : `<div class="empty">Sin unidades libres.</div>`}</div>
      </div>

      <div class="sec">
        <div class="sec-h"><div class="ico">🚨</div><h2>Alertas críticas abiertas (${d.criticalAlerts.length})</h2><div class="rule"></div></div>
        ${d.criticalAlerts.length ? critRows : `<div class="banner ok">✅ <span>Sin alertas críticas abiertas.</span></div>`}
        ${d.criticalAlerts.length > 14 ? `<div class="small muted">… y ${d.criticalAlerts.length - 14} alertas críticas más.</div>` : ""}
      </div>
    </div>
    ${foot("Reporte semanal de operación · " + fdate(d.generatedAt))}`;

  return shell("Reporte Semanal · Operación", `<div class="page">${body}</div>`);
}

// ════════════════════════════════════════════════════════════════
// MENSUAL · finanzas
// ════════════════════════════════════════════════════════════════
export function monthlyReportHTML(d) {
  const cfPos = d.cashflow >= 0;
  const maxBucket = Math.max(1, ...d.breakdown.map((b) => b.total));
  const bdRows = d.breakdown.map((b) => `
    <tr><td class="b">${esc(b.label)}</td>
      <td style="width:34%"><div class="bar"><span style="width:${Math.round((b.total / maxBucket) * 100)}%;background:var(--navy2)"></span></div></td>
      <td class="num">${money2(b.total)}</td>
      <td class="num muted">${b.count}</td></tr>`).join("");

  const outRows = d.outliers.slice(0, 8).map((o) => `
    <div class="alert" style="background:var(--amber-bg);border-color:#fde68a"><span class="ic" style="color:var(--amber)">▲</span>
      <div class="tx" style="color:#92400e"><b>${esc(o.house)}</b> — ${esc(o.type)} de <b>${money2(o.amount)}</b> <span class="muted">(promedio ${money2(o.mean)})</span></div></div>`).join("");

  const lossRows = d.losses.slice(0, 12).map((h) => `
    <tr><td class="b">${esc(h.name)}</td><td class="num">${money2(h.income)}</td><td class="num">${money2(h.expense)}</td>
      <td class="num"><span class="chip red">${money2(h.net)}</span></td></tr>`).join("");

  const profRows = d.topProfit.slice(0, 8).map((h) => `
    <tr><td class="b">${esc(h.name)}</td><td class="num">${money2(h.income)}</td><td class="num">${money2(h.expense)}</td>
      <td class="num"><span class="chip green">+${money2(h.net)}</span></td></tr>`).join("");

  const body = `
    ${header("Ever Home Management · Reporte Mensual", "Finanzas de " + d.period.label, "Ingresos, gastos y cashflow del mes, con desglose por tipo, outliers de costo y casas en pérdida.", { main: d.period.label, meta: `${d.counts.payments} ingresos · ${d.counts.expenses} gastos` })}
    <div class="body">
      <div class="sec">
        <div class="grid g3">
          <div class="kpi good"><div class="lbl">Ingresos del mes</div><div class="val pos">${money(d.income)}</div><div class="note">${d.counts.payments} pagos cobrados</div></div>
          <div class="kpi bad"><div class="lbl">Gastos del mes</div><div class="val">${money(d.expenseTotal)}</div><div class="note">${d.counts.expenses} gastos</div></div>
          <div class="kpi ${cfPos ? "good" : "bad"}"><div class="lbl">Cashflow neto</div><div class="val ${cfPos ? "pos" : "neg"}">${money(d.cashflow)}</div><div class="note">${cfPos ? "superávit" : "déficit"} del mes</div></div>
        </div>
      </div>

      <div class="sec">
        <div class="sec-h"><div class="ico">📊</div><h2>Gastos por tipo</h2><div class="rule"></div></div>
        <div class="card"><table><thead><tr><th>Tipo</th><th>Peso</th><th class="num">Monto</th><th class="num">#</th></tr></thead><tbody>${bdRows || `<tr><td colspan="4" class="empty">Sin gastos en el mes.</td></tr>`}</tbody></table></div>
      </div>

      <div class="sec">
        <div class="sec-h"><div class="ico">▲</div><h2>Outliers de costo (hipoteca / servicios altos)</h2><div class="rule"></div></div>
        ${d.outliers.length ? outRows : `<div class="banner ok">✅ <span>Sin casas con hipoteca o servicios fuera de rango.</span></div>`}
      </div>

      <div class="sec">
        <div class="sec-h"><div class="ico">🔴</div><h2>Casas en pérdida este mes (${d.losses.length})</h2><div class="rule"></div></div>
        ${d.losses.length
          ? `<div class="card"><table><thead><tr><th>Casa</th><th class="num">Ingreso</th><th class="num">Gasto</th><th class="num">Neto</th></tr></thead><tbody>${lossRows}</tbody></table></div>`
          : `<div class="banner ok">✅ <span>Ninguna casa con rentabilidad negativa este mes.</span></div>`}
      </div>

      <div class="sec">
        <div class="sec-h"><div class="ico">🏆</div><h2>Casas más rentables</h2><div class="rule"></div></div>
        <div class="card"><table><thead><tr><th>Casa</th><th class="num">Ingreso</th><th class="num">Gasto</th><th class="num">Neto</th></tr></thead><tbody>${profRows || `<tr><td colspan="4" class="empty">Sin casas con utilidad este mes.</td></tr>`}</tbody></table></div>
        ${d.unassigned ? `<div class="small muted" style="margin-top:8px">Nota: ${money2(d.unassigned)} en gastos de nómina/plataforma no se asignan a una casa puntual (afectan el cashflow global, no el P&amp;L por casa).</div>` : ""}
      </div>
    </div>
    ${foot("Reporte mensual de finanzas · " + d.period.label)}`;

  return shell("Reporte Mensual · Finanzas", `<div class="page">${body}</div>`);
}

// ════════════════════════════════════════════════════════════════
// GUÍA DE BIENVENIDA · check-in (2 páginas, según muestra EverHome)
// ════════════════════════════════════════════════════════════════
export function welcomeGuideHTML(g) {
  const GUIDE_CSS = `
  .wp{height:11in;overflow:hidden}
  .wp .body{padding:18px 44px 14px}
  .wp .sec{margin-top:16px}.wp .sec:first-child{margin-top:2px}
  .wp .grid{gap:11px}
  .wp .hdr{padding:28px 44px 24px}
  .wp .hdr h1{font-size:32px}
  .wp .contact{margin-top:12px;padding:15px 22px}
  .wp .foot{padding:10px 44px 16px}
  .wp .rule-item{padding:8px 11px}
  .grule{margin:6px 0 2px;font-size:10px;letter-spacing:1.4px;text-transform:uppercase;color:var(--muted);font-weight:700}
  .step{display:flex;gap:11px;align-items:flex-start;padding:7px 0}
  .step .n{width:22px;height:22px;border-radius:50%;background:var(--navy);color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .codecard{border:1px dashed var(--gold);border-radius:11px;padding:14px;text-align:center;background:#fffdf5}
  .codecard .lbl{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);font-weight:700}
  .codecard .code{font-size:30px;font-weight:800;letter-spacing:7px;color:var(--navy);margin-top:6px;font-family:ui-monospace,Menlo,monospace}
  .codecard .alt{font-size:14px;font-weight:700;color:var(--gold);letter-spacing:1px}
  .wifi{border-left:4px solid var(--green-d)}
  .wrow{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px dotted var(--line)}
  .wrow:last-child{border:none}.wrow .k{font-size:13px;font-weight:700;color:var(--ink)}.wrow .v{font-family:ui-monospace,Menlo,monospace;font-weight:700;color:var(--navy)}
  .rule-item{display:flex;gap:10px;padding:9px 12px;background:#fff;border:1px solid var(--line);border-radius:10px}
  .rule-item .ic{font-size:14px}.rule-item .tx{font-size:12px;line-height:1.4}.rule-item .tx b{color:var(--navy)}
  .place .ph{font-size:13px;font-weight:700;color:var(--green-d);display:flex;gap:7px;align-items:center;margin-bottom:6px}
  .place ul{list-style:none}.place li{font-size:12px;padding:3px 0 3px 14px;position:relative;color:var(--ink)}
  .place li:before{content:"•";color:var(--gold);position:absolute;left:0;font-weight:700}
  .contact{background:linear-gradient(135deg,var(--navy),var(--navy2));color:#fff;border-radius:13px;padding:18px 22px;display:flex;justify-content:space-between;align-items:center;margin-top:18px}
  .contact .t{font-size:14px;font-weight:700;display:flex;gap:8px;align-items:center}.contact .s{font-size:12px;color:#c7d6e8;margin-top:4px;max-width:320px}
  .contact .c{font-size:13px;text-align:right}.contact .c div{margin:3px 0}
  `;
  const accessMain = g.accessCode ? `
    <div class="codecard"><div class="lbl">Main entrance keypad / Acceso principal</div><div class="code">${esc(g.accessCode)}</div></div>` : "";
  const accessUnit = g.unitAccess ? `
    <div class="codecard" style="margin-top:10px"><div class="lbl">Tu unidad — ${esc(g.unitName || "Habitación")}</div><div class="alt">${esc(g.unitAccess)}</div></div>`
    : (g.accessCode ? `<div class="codecard" style="margin-top:10px"><div class="lbl">Private rooms</div><div class="alt">Key in door lock</div></div>` : "");

  const rule = (ic, b, t) => `<div class="rule-item"><span class="ic">${ic}</span><div class="tx"><b>${esc(b)}</b> ${esc(t)}</div></div>`;
  const placeList = (title, ic, items) => `<div class="place card"><div class="ph">${ic} ${esc(title)}</div><ul>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul></div>`;

  const page1 = `<div class="page wp">
    ${header("Ever Home Management · Guest Welcome Guide · Page 1 of 2", "Welcome to Your New Home", "We're glad to host you. Below you'll find everything you need for a smooth check-in and a comfortable stay.", { main: g.address, meta: g.subtitle || "" })}
    <div class="body">
      <div class="sec">
        <div class="sec-h"><div class="ico">🔑</div><h2>Check-In Instructions</h2><div class="rule"></div></div>
        <div class="grid g2">
          <div class="card">
            <div class="grule">Keypad access</div>
            <div class="step"><span class="n">1</span><div class="tx" style="font-size:13px">Find the <b>keypad lock</b> at the main entrance.</div></div>
            <div class="step"><span class="n">2</span><div class="tx" style="font-size:13px">Enter the access code shown.</div></div>
            <div class="step"><span class="n">3</span><div class="tx" style="font-size:13px">For private units, your key is already in the unit's door lock.</div></div>
          </div>
          <div>${accessMain}${accessUnit}</div>
        </div>
        <div class="banner ok" style="margin-top:14px">ℹ️ <span>Check-in starts at 3:00 PM. Return any key to its lockbox upon move-out, and park only in designated areas.</span></div>
      </div>

      <div class="sec">
        <div class="sec-h"><div class="ico">📶</div><h2>Wi-Fi Information</h2><div class="rule"></div></div>
        <div class="card wifi">
          <div class="wrow"><span class="k">📡 Network (SSID)</span><span class="v">${esc(g.wifiName || "—")}</span></div>
          <div class="wrow"><span class="k">🔑 Password</span><span class="v">${esc(g.wifiPass || "—")}</span></div>
        </div>
      </div>

      <div class="sec">
        <div class="sec-h"><div class="ico">🏠</div><h2>House Rules</h2><div class="rule"></div></div>
        <div class="grid g2">
          ${rule("🚭", "No smoking", "inside the property at any time.")}
          ${rule("🚫", "No commercial, business, or illegal activities", "on the premises.")}
          ${rule("🌙", "Be mindful of noise", "especially evening & nighttime hours (10 PM–8 AM).")}
          ${rule("✨", "Keep shared spaces", "clean and organized after each use.")}
          ${rule("👥", "Only registered occupants", "may stay unless otherwise approved.")}
          ${rule("🐾", "Notify management", "before bringing any pets.")}
        </div>
      </div>
    </div>
    ${foot(g.address + " · Page 1 of 2")}
  </div>`;

  const page2 = `<div class="page wp">
    ${header("Ever Home Management · Guest Welcome Guide · Page 2 of 2", "Welcome to Your New Home", "A few more details to help you settle in, check out smoothly, and explore the area.", { main: g.address, meta: g.subtitle || "" })}
    <div class="body">
      <div class="sec">
        <div class="sec-h"><div class="ico">ℹ️</div><h2>Good to Know & Stay Tips</h2><div class="rule"></div></div>
        <div class="grid g2">
          ${rule("🛡️", "Security.", "Lock all doors & windows when you leave.")}
          ${rule("⚡", "Utilities.", "Included — please use water & power responsibly.")}
          ${rule("🌿", "Outdoors.", "Keep any patio or yard tidy; remove waste before check-out.")}
          ${rule("🚫", "No parties.", "Events that disturb neighbors are not allowed.")}
          ${rule("✨", "Shared areas.", "Clean the shared kitchen & bathrooms after each use.")}
          ${rule("🌙", "Quiet hours.", "Keep noise down between 10:00 PM and 8:00 AM.")}
        </div>
      </div>

      <div class="sec">
        <div class="sec-h"><div class="ico">➡️</div><h2>Check-Out Checklist</h2><div class="rule"></div></div>
        <div class="grid g2">
          ${rule("✅", "Towels.", "Gather used towels and leave them on the bathroom floor or tub.")}
          ${rule("✅", "Power.", "Turn off all lights, appliances, and climate control (AC / heating).")}
          ${rule("✅", "Trash.", "Bag any trash and place it in the designated bins.")}
          ${rule("✅", "Doors.", "Pull the door shut as you exit. For private rooms, leave keys on the nightstand.")}
        </div>
      </div>

      <div class="sec">
        <div class="sec-h"><div class="ico">📍</div><h2>Nearby Places</h2><div class="rule"></div></div>
        <div class="grid g2">
          ${placeList("Grocery", "🛒", g.nearby?.grocery || ["H-E-B (~5–8 min)", "Walmart Supercenter"])}
          ${placeList("Coffee & Dining", "☕", g.nearby?.dining || ["Local specialty coffee", "Food trucks & taquerías nearby"])}
          ${placeList("Parks & Outdoors", "🌳", g.nearby?.parks || ["Nearest district park", "Greenbelt / metro park"])}
          ${placeList("Getting Around", "🚗", g.nearby?.transit || ["Quick highway access", "~15 min to Downtown", "~12 min to AUS Airport"])}
        </div>
      </div>

      <div class="contact">
        <div><div class="t">📞 Need assistance?</div><div class="s">Our team is available throughout your stay — questions, maintenance, or anything else, just reach out.</div></div>
        <div class="c"><div>✉️ ${esc(BRAND.email)}</div><div>📱 ${esc(BRAND.phone)}</div></div>
      </div>
    </div>
    ${foot(g.address + " · Page 2 of 2")}
  </div>`;

  return shell("Guest Welcome Guide · " + g.address, page1 + page2, GUIDE_CSS);
}
