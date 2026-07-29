// ════════════════════════════════════════════════════════════════
// 📊 RENDER DE INFORMES DE RENTAS (29-jul-2026) — multi-página, print-ready, dos marcas.
// Toma el payload congelado de rentas_generar_informe (data + textos editables) y produce
// el HTML final de cada informe. NO consulta la DB (todo viene del payload). Se abre en una
// ventana nueva con botón "Imprimir / PDF" (chromium del usuario).
//   informeRender(payload) -> string HTML   ·   informeOpen(payload) -> abre ventana
// Marcas: semanal = RENTAL PROFITSS · PROPERTY MANAGEMENT · combinado/balance = EVERHOME MANAGEMENT.
// Estilo con concatenación de strings (evita el linter que corrompe backticks anidados).
// ════════════════════════════════════════════════════════════════
(function () {
  var E = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); };
  var M = function (n) { if (n == null || isNaN(+n)) return '—'; var v = +n; return (v < 0 ? '−$' : '$') + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  var M0 = function (n) { if (n == null || isNaN(+n)) return '—'; return (+n < 0 ? '−$' : '$') + Math.abs(Math.round(+n)).toLocaleString('en-US'); };
  var PC = function (n) { return (n == null || isNaN(+n)) ? '—' : (+n).toLocaleString('en-US', { maximumFractionDigits: 1 }) + '%'; };
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var ymLabel = function (ym) { if (!ym) return '—'; var p = ym.split('-'); var m = MESES[(+p[1]) - 1] || ''; return (m ? m.charAt(0).toUpperCase() + m.slice(1) : ym) + ' ' + p[0]; };
  var ymShort = function (ym) { if (!ym) return '—'; var p = ym.split('-'); var m = MESES[(+p[1]) - 1] || ''; return (m ? m.charAt(0).toUpperCase() + m.slice(1, 3) : ym); };
  var fechaLarga = function (d) { var dt = d ? new Date(d + 'T00:00:00') : new Date(); return dt.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }); };
  var num = function (v) { return v == null ? 0 : +v; };

  var BRANDS = {
    rp: { logo: 'RENTAL <em>PROFITSS</em>', sub: 'PROPERTY MANAGEMENT', accent: '#2b44c6', accent2: '#5c79f0', soft: '#eef1fb', foot: 'Confidencial — Uso interno · Responsable: Carlos Vásquez / Equipo OPS' },
    eh: { logo: 'EVER<em>HOME</em> MANAGEMENT', sub: 'GESTIÓN DE PROPIEDADES', accent: '#0f2742', accent2: '#2f8f5b', soft: '#eaf3ee', foot: 'Confidencial — Uso interno · EverHome Management' }
  };

  // ─── componentes ───
  function kpi(lab, val, sub, estado) {
    var col = estado === 'neg' ? '#dc2626' : estado === 'ok' ? '#059669' : estado === 'warn' ? '#b45309' : 'inherit';
    return '<div class="kpi"><div class="l">' + E(lab) + '</div><div class="v" style="color:' + col + '">' + (val == null || val === '' ? '<span class="nd">sin dato</span>' : val) + '</div>' + (sub ? '<div class="s">' + sub + '</div>' : '') + '</div>';
  }
  function distbar(segs) { // segs: [{label,n,color}]
    var tot = segs.reduce(function (a, s) { return a + num(s.n); }, 0) || 1;
    var bar = '<div class="dist">' + segs.filter(function (s) { return num(s.n) > 0; }).map(function (s) {
      return '<span style="width:' + (100 * num(s.n) / tot) + '%;background:' + s.color + '" title="' + E(s.label) + '"></span>';
    }).join('') + '</div><div class="distleg">' + segs.map(function (s) {
      return '<span><i style="background:' + s.color + '"></i>' + E(s.label) + ' <b>' + num(s.n) + '</b></span>';
    }).join('') + '</div>';
    return bar;
  }
  function trend(map, mesCorte) { // map: {ym:monto}
    var keys = Object.keys(map || {}).sort();
    if (!keys.length) return '';
    var max = Math.max.apply(null, keys.map(function (k) { return num(map[k]); })) || 1;
    return '<div class="trend">' + keys.map(function (k) {
      var h = Math.max(6, Math.round(100 * num(map[k]) / max));
      var cur = k === mesCorte;
      return '<div class="tb"><div class="tv">' + M0(map[k]) + '</div><div class="bar" style="height:' + h + 'px;background:' + (cur ? '#2f8f5b' : '#9fb3c8') + '"></div><div class="tl">' + ymShort(k) + '</div></div>';
    }).join('') + '</div>';
  }
  function estadoUnidad(st) {
    var m = { ocupada: ['OCUPADA', '#059669', '#e7f8f0'], disponible: ['DISPONIBLE', '#2563eb', '#e7edfb'], mantenimiento: ['MANTENIM.', '#b45309', '#fef3c7'], reservada: ['RESERVADA', '#7c3aed', '#f0e9fb'] };
    var x = m[st] || [String(st || '—').toUpperCase(), '#64748b', '#eef1f6'];
    return '<span class="ub" style="color:' + x[1] + ';background:' + x[2] + '">' + x[0] + '</span>';
  }
  function prioBadge(p) {
    var m = { ALTA: ['#dc2626', '#fdeaee'], MEDIA: ['#b45309', '#fef3c7'], 'SEGUIM': ['#2563eb', '#e7edfb'], 'SEGUIM.': ['#2563eb', '#e7edfb'] };
    var x = m[p] || ['#64748b', '#eef1f6'];
    return '<span class="ub" style="color:' + x[0] + ';background:' + x[1] + '">' + E(p) + '</span>';
  }
  function bandaInfo(b) {
    return ({ critico: { txt: 'CRÍTICO', desc: 'saldo ≥ $3,000', col: '#dc2626', bg: '#fdeaee' }, medio: { txt: 'MEDIO', desc: '$1,000 – $2,999', col: '#b45309', bg: '#fef3c7' }, bajo: { txt: 'BAJO', desc: '< $1,000', col: '#2563eb', bg: '#e7edfb' } })[b];
  }
  function alertBox(kind, titulo, inner) {
    var c = { ok: ['#059669', '#e7f8f0'], info: ['#2563eb', '#e7edfb'], neg: ['#dc2626', '#fdeaee'], warn: ['#b45309', '#fef3c7'] }[kind] || ['#64748b', '#eef1f6'];
    return '<div class="abox" style="border-left:4px solid ' + c[0] + ';background:' + c[1] + '"><div class="at" style="color:' + c[0] + '">' + E(titulo) + '</div>' + inner + '</div>';
  }
  function secTitle(t) { return '<div class="st">' + E(t) + '</div>'; }

  // ─── shell ───
  function shell(brand, corte, titulo, badge, body) {
    var b = BRANDS[brand] || BRANDS.eh;
    var css = 'body{font-family:-apple-system,"Segoe UI",Inter,Arial,sans-serif;color:#0e1420;margin:0 auto;padding:30px;max-width:860px;line-height:1.42;background:#fff;font-size:12px}'
      + '*{box-sizing:border-box}'
      + '.top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid ' + b.accent + ';padding-bottom:11px;margin-bottom:6px}'
      + '.logo{font-size:19px;font-weight:800;color:' + b.accent + ';letter-spacing:.4px}.logo em{font-style:normal;color:' + b.accent2 + '}.logo span{display:block;font-size:8.5px;letter-spacing:2.4px;color:#6f7785;font-weight:700;margin-top:3px}'
      + '.hd-r{text-align:right;font-size:10.5px;color:#6f7785}'
      + 'h1{font-size:20px;margin:12px 0 2px;font-weight:800}.sub{font-size:11.5px;color:#6f7785}'
      + '.badge{display:inline-block;font-size:10.5px;font-weight:800;color:#fff;padding:3px 12px;border-radius:16px;margin-top:8px}'
      + '.st{font-size:10px;text-transform:uppercase;letter-spacing:1px;font-weight:800;color:' + b.accent + ';margin:18px 0 8px;border-bottom:1px solid #e3e8f0;padding-bottom:4px}'
      + '.kgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin:8px 0}'
      + '.kpi{border:1px solid #e0e5ee;border-radius:10px;padding:10px 12px;background:' + b.soft + '}'
      + '.kpi .l{font-size:8px;text-transform:uppercase;letter-spacing:.7px;color:#5a6472;font-weight:800}.kpi .v{font-size:17px;font-weight:800;margin-top:3px;font-variant-numeric:tabular-nums}.kpi .s{font-size:9px;color:#5a6472;margin-top:2px;line-height:1.3}'
      + '.nd{color:#94a3b8;font-size:12px;font-weight:600}'
      + '.dist{display:flex;height:20px;border-radius:6px;overflow:hidden;margin:8px 0 5px}.dist span{display:block}'
      + '.distleg{display:flex;gap:14px;flex-wrap:wrap;font-size:9.5px;color:#5a6472}.distleg i{display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:4px;vertical-align:middle}.distleg b{font-variant-numeric:tabular-nums}'
      + '.trend{display:flex;gap:16px;align-items:flex-end;height:120px;padding:8px 4px;border-bottom:1px solid #e3e8f0}'
      + '.tb{display:flex;flex-direction:column;align-items:center;justify-content:flex-end}.tb .tv{font-size:9px;font-weight:700;color:#334155;margin-bottom:3px;font-variant-numeric:tabular-nums}.tb .bar{width:44px;border-radius:5px 5px 0 0}.tb .tl{font-size:9px;color:#64748b;margin-top:4px;font-weight:600}'
      + 'table{border-collapse:collapse;width:100%;font-size:10.5px;margin-top:4px}th{text-align:left;font-size:8.5px;text-transform:uppercase;color:#5a6472;padding:5px 7px;border-bottom:1.5px solid #d7deea;letter-spacing:.4px}td{padding:5px 7px;border-bottom:1px solid #eef1f6;vertical-align:top}'
      + 'td.r,th.r{text-align:right;font-variant-numeric:tabular-nums}'
      + '.grp td{background:#f4f7fb;font-weight:800;font-size:10px;color:#334155;text-transform:uppercase;letter-spacing:.4px}'
      + '.bandhead td{font-weight:800;font-size:10.5px;letter-spacing:.4px}'
      + '.tot td{font-weight:800;border-top:2px solid #cbd5e1;background:#f8fafc}'
      + '.ub{display:inline-block;font-size:8px;font-weight:800;padding:2px 7px;border-radius:10px;letter-spacing:.3px;white-space:nowrap}'
      + '.tag-new{background:#059669;color:#fff;font-size:7.5px;font-weight:800;padding:1px 6px;border-radius:8px;margin-left:5px}'
      + '.tag-up{background:#7c3aed;color:#fff;font-size:7.5px;font-weight:800;padding:1px 6px;border-radius:8px;margin-left:5px}'
      + '.mora{display:block;font-size:8px;color:#dc2626;font-weight:700;margin-top:1px}'
      + '.abox{border-radius:8px;padding:9px 12px;margin:8px 0;font-size:10.5px}.abox .at{font-size:9px;text-transform:uppercase;letter-spacing:.6px;font-weight:800;margin-bottom:4px}.abox ul{margin:3px 0 0;padding-left:16px}.abox li{margin:2px 0}'
      + '.box2{display:grid;grid-template-columns:1fr 1fr;gap:12px}'
      + '.mini{border:1px solid #e0e5ee;border-radius:9px;padding:10px 12px}.mini .mt{font-size:9px;text-transform:uppercase;letter-spacing:.6px;color:#5a6472;font-weight:800;margin-bottom:5px}'
      + '.mv{display:flex;gap:10px;flex-wrap:wrap;margin-top:6px}.mv .mvc{flex:1;min-width:120px;border:1px dashed #cbd5e1;border-radius:8px;padding:7px 9px}.mv .mvc b{display:block;font-size:16px;font-variant-numeric:tabular-nums}.mv .mvc span{font-size:8.5px;color:#64748b;text-transform:uppercase;letter-spacing:.4px}'
      + '.acards{display:grid;grid-template-columns:1fr 1fr;gap:10px}.ac{border:1px solid #e0e5ee;border-radius:10px;padding:11px 13px;background:#fbfcfe}.ac .ah{font-weight:800;font-size:11px;margin-bottom:3px;color:' + b.accent + '}.ac .ap{font-size:10px;color:#475569;line-height:1.4}'
      + '.chk{list-style:none;padding:0;margin:6px 0}.chk li{padding:4px 0;border-bottom:1px dashed #eef1f6;font-size:11px}.chk li:before{content:"☐";margin-right:8px;color:#94a3b8}'
      + '.gpm{list-style:none;padding:0;margin:6px 0;counter-reset:g}.gpm li{padding:6px 0;border-bottom:1px dashed #eef1f6;font-size:11px;counter-increment:g}.gpm li:before{content:counter(g)". ";font-weight:800;color:' + b.accent + '}'
      + '.gest-badge{display:inline-block;font-size:7.5px;font-weight:800;padding:1px 7px;border-radius:9px;margin-left:6px;background:' + b.soft + ';color:' + b.accent + '}'
      + '.note{font-size:9px;color:#6f7785;margin-top:6px;line-height:1.4}'
      + '.src{font-size:8px;color:#94a3b8}'
      + '.page{page-break-after:always}'
      + '.foot{margin-top:22px;padding-top:10px;border-top:1px solid #d7deea;font-size:8.5px;color:#94a3b8;display:flex;justify-content:space-between;gap:12px}'
      + '.btn{position:fixed;top:12px;right:12px;padding:9px 18px;background:' + b.accent + ';color:#fff;border:none;border-radius:9px;cursor:pointer;font-weight:800;font-size:13px}'
      + '@media print{.btn{display:none}body{padding:12px;max-width:none}.page{page-break-after:always}} @page{margin:12mm}';
    return '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>' + E(titulo) + '</title><style>' + css + '</style></head><body>'
      + '<button class="btn" onclick="window.print()">Imprimir / Guardar PDF</button>'
      + '<div class="top"><div class="logo">' + b.logo + '<span>' + E(b.sub) + '</span></div>'
      + '<div class="hd-r">Corte: <b>' + fechaLarga(corte) + '</b><br>Generado: ' + fechaLarga(null) + '</div></div>'
      + '<h1>' + E(titulo) + '</h1>'
      + (badge ? '<span class="badge" style="background:' + (badge.estado === 'neg' ? '#dc2626' : badge.estado === 'ok' ? '#059669' : badge.estado === 'warn' ? '#b45309' : b.accent) + '">' + E(badge.txt) + '</span>' : '')
      + body
      + '<div class="foot"><span>' + E(b.foot) + '</span><span>Cada cifra sale de la capa de datos viva del OS (pm_*, cartera_matriz, v_ocupacion). "Sin dato" nunca se muestra como $0.</span></div>'
      + '</body></html>';
  }

  // ══════════════════════════════════════════════════════════════
  // Helpers de cartera (matriz / bandas / deltas) — compartidos balance + combinado
  // ══════════════════════════════════════════════════════════════
  function mesesDe(cartera) {
    var set = {};
    (cartera || []).forEach(function (c) { Object.keys(c.por_mes || {}).forEach(function (m) { set[m] = 1; }); });
    return Object.keys(set).sort();
  }
  function bandas(cartera) {
    var b = { critico: { n: 0, monto: 0 }, medio: { n: 0, monto: 0 }, bajo: { n: 0, monto: 0 } };
    (cartera || []).forEach(function (c) { if (b[c.banda]) { b[c.banda].n++; b[c.banda].monto += num(c.neto); } });
    return b;
  }
  function deltas(payload) {
    var prev = payload.prev_snapshot;
    var cur = payload.cartera || [];
    var nuevos = [], resueltos = [], aumento = [];
    var prevMap = {};
    if (prev && prev.casos_json) prev.casos_json.forEach(function (p) { prevMap[p.tenant_id] = p; });
    cur.forEach(function (c) {
      var p = prevMap[c.tenant_id];
      if (!p) nuevos.push(c);
      else {
        var ra = num(c.renta_actual), rp = num(p.renta_actual);
        if (ra > 0 && rp > 0 && Math.abs(ra - rp) >= 1) aumento.push({ c: c, prev: rp, delta: ra - rp });
      }
    });
    var curSet = {}; cur.forEach(function (c) { curSet[c.tenant_id] = 1; });
    if (prev && prev.casos_json) prev.casos_json.forEach(function (p) { if (!curSet[p.tenant_id] && num(p.neto) > 0) resueltos.push(p); });
    return { nuevos: nuevos, resueltos: resueltos, aumento: aumento, prevMap: prevMap };
  }

  // matriz de antigüedad agrupada por banda
  function matrizAntiguedad(payload, conMora) {
    var cartera = payload.cartera || [];
    var meses = mesesDe(cartera);
    var d = deltas(payload);
    var orden = ['critico', 'medio', 'bajo'];
    var totCol = {}; meses.forEach(function (m) { totCol[m] = 0; }); var totGen = 0;
    var body = '';
    orden.forEach(function (bk) {
      var grupo = cartera.filter(function (c) { return c.banda === bk; });
      if (!grupo.length) return;
      var bi = bandaInfo(bk);
      body += '<tr class="bandhead"><td colspan="' + (meses.length + 3) + '" style="background:' + bi.bg + ';color:' + bi.col + '">' + bi.txt + ' · ' + bi.desc + ' — ' + grupo.length + ' caso(s) · ' + M(grupo.reduce(function (a, c) { return a + num(c.neto); }, 0)) + '</td></tr>';
      grupo.forEach(function (c) {
        var esNuevo = !d.prevMap[c.tenant_id] && payload.prev_snapshot;
        var au = d.aumento.find(function (x) { return x.c.tenant_id === c.tenant_id; });
        body += '<tr><td><b>' + E(c.inquilino || '—') + '</b>' + (esNuevo ? '<span class="tag-new">NUEVO</span>' : '') + (au ? '<span class="tag-up">RENTA +' + M0(au.delta) + '</span>' : '') + '<br><span class="src">' + E((c.casa || '—').split(',')[0]) + (c.city ? ' · ' + E(c.city) : '') + '</span></td>';
        meses.forEach(function (m) {
          var cell = (c.por_mes || {})[m];
          totCol[m] += cell ? num(cell.deuda) : 0;
          if (!cell) { body += '<td class="r">—</td>'; }
          else { body += '<td class="r">' + M(cell.deuda) + (conMora && num(cell.dias_mora) > 0 ? '<span class="mora">' + num(cell.dias_mora) + ' d mora</span>' : '') + '</td>'; }
        });
        totGen += num(c.neto);
        body += '<td class="r"><b>' + M(c.neto) + '</b></td>';
        if (conMora) body += '<td class="r">' + (num(c.mora_max_dias) > 0 ? num(c.mora_max_dias) + ' d' : '—') + '</td>';
        body += '</tr>';
      });
    });
    var head = '<tr><th>Propiedad · Inquilino</th>' + meses.map(function (m) { return '<th class="r">' + ymLabel(m) + '</th>'; }).join('') + '<th class="r">TOTAL</th>' + (conMora ? '<th class="r">Mora máx.</th>' : '') + '</tr>';
    var totRow = '<tr class="tot"><td>TOTALES</td>' + meses.map(function (m) { return '<td class="r">' + M(totCol[m]) + '</td>'; }).join('') + '<td class="r">' + M(totGen) + '</td>' + (conMora ? '<td class="r"></td>' : '') + '</tr>';
    return '<table><thead>' + head + '</thead><tbody>' + body + totRow + '</tbody></table>'
      + '<div class="note">"—" = sin saldo ese mes. Los saldos a favor NO se incluyen (se netean por inquilino antes de clasificar). Banda por saldo TOTAL acumulado del caso.'
      + (conMora ? ' Días de mora calculados por el schedule real de cada contrato (día de pago del inquilino), no por "vencimiento día 1" plano.' : '') + '</div>';
  }

  function bloqueCartera(payload, conMora, brand) {
    var t = payload.totales || {}; var b = bandas(payload.cartera);
    var d = deltas(payload);
    var prev = payload.prev_snapshot;
    var varMonto = prev ? num(t.neto) - num(prev.total_neto) : null;
    var varPct = (prev && num(prev.total_neto) > 0) ? (varMonto / num(prev.total_neto) * 100) : null;
    var out = '';
    // KPIs
    out += '<div class="kgrid">'
      + kpi('Total cartera (Σ meses)', M(t.bruto), num(t.a_favor) > 0 ? 'neto tras adelantos ' + M(t.neto) : 'sin adelantos que netear', 'neg')
      + kpi('Casos activos', (t.casos || 0) + ' en ' + (t.propiedades || 0) + ' propiedades', 'inquilinos con saldo', 'warn')
      + kpi('Concentración mes de corte', PC(t.conc_pct), M(t.conc_monto) + ' en ' + ymLabel(payload.mes), 'warn')
      + kpi('Variación vs corte previo', varPct == null ? null : (varPct >= 0 ? '+' : '') + PC(varPct), prev ? ((varMonto >= 0 ? '+' : '−') + M0(Math.abs(varMonto)) + ' vs ' + fechaLarga(prev.corte)) : 'primer corte registrado', varPct == null ? '' : (varPct > 0 ? 'neg' : 'ok'))
      + '</div>';
    // Franja de avance entre cortes
    var serie = payload.serie || [];
    if (serie.length >= 2) {
      out += secTitle('Avance entre cortes recientes');
      out += '<table><thead><tr><th>Corte</th><th class="r">Total neto</th><th class="r">Casos</th><th class="r">Propiedades</th><th class="r">Δ vs corte anterior</th></tr></thead><tbody>';
      serie.forEach(function (s, i) {
        var pr = i > 0 ? serie[i - 1] : null;
        var dv = pr ? num(s.total_neto) - num(pr.total_neto) : null;
        var dp = (pr && num(pr.total_neto) > 0) ? dv / num(pr.total_neto) * 100 : null;
        out += '<tr><td>' + fechaLarga(s.corte) + '</td><td class="r">' + M(s.total_neto) + '</td><td class="r">' + s.casos + '</td><td class="r">' + s.propiedades + '</td><td class="r" style="color:' + (dv == null ? '#94a3b8' : dv > 0 ? '#dc2626' : '#059669') + '">' + (dv == null ? '—' : (dv >= 0 ? '+' : '−') + M0(Math.abs(dv)) + (dp == null ? '' : ' (' + (dp >= 0 ? '+' : '') + PC(dp) + ')')) + '</td></tr>';
      });
      out += '</tbody></table>';
    }
    // cajas verde / azul
    var okInner = '';
    if (d.resueltos.length) okInner += '<div><b>Salieron de la cartera:</b><ul>' + d.resueltos.map(function (p) { return '<li>' + E(p.inquilino || '—') + ' — saldó ' + M(p.neto) + '</li>'; }).join('') + '</ul></div>';
    if (d.aumento.length) okInner += '<div style="margin-top:4px"><b>Renta actualizada entre cortes:</b><ul>' + d.aumento.map(function (a) { return '<li>' + E(a.c.inquilino || '—') + ': renta ' + M0(a.prev) + ' → ' + M0(a.prev + a.delta) + ' (+' + M0(a.delta) + ') — es un ajuste de contrato, no un error.</li>'; }).join('') + '</ul></div>';
    if (!okInner) okInner = '<div>Sin cambios respecto al corte anterior (o es el primer corte registrado).</div>';
    out += alertBox('ok', 'Actualizaciones aplicadas', okInner);
    var azulInner = '';
    if (d.nuevos.length) azulInner += '<div><b>Casos nuevos este corte:</b><ul>' + d.nuevos.map(function (c) { return '<li>' + E(c.inquilino || '—') + ' — ' + M(c.neto) + '</li>'; }).join('') + '</ul></div>';
    if (payload.editable && payload.editable.notas_casos) azulInner += '<div style="margin-top:4px">' + E(payload.editable.notas_casos) + '</div>';
    if (azulInner) out += alertBox('info', 'Casos nuevos y notas', azulInner);
    // discrepancias / deltas vs manual
    (payload.discrepancias || []).forEach(function (x) {
      out += alertBox('warn', x.label, '<div>Cifra verificada: <b>' + (typeof x.verificado === 'number' ? M(x.verificado) : E(x.verificado)) + '</b> — <span class="src">' + E(x.fuente) + '</span></div><div>' + E(x.detalle) + '</div>');
    });
    // tendencia mensual
    out += secTitle('Tendencia mensual de la cartera');
    out += trend(payload.por_mes, payload.mes);
    // distribución por prioridad
    out += secTitle('Distribución por prioridad (según saldo total del caso)');
    out += distbar([{ label: 'Crítico ≥$3,000', n: b.critico.n, color: '#dc2626' }, { label: 'Medio $1k–3k', n: b.medio.n, color: '#f59e0b' }, { label: 'Bajo <$1,000', n: b.bajo.n, color: '#2563eb' }]);
    out += '<div class="note">Crítico ' + M(b.critico.monto) + ' · Medio ' + M(b.medio.monto) + ' · Bajo ' + M(b.bajo.monto) + '.</div>';
    // tabla casos críticos con desglose por mes
    var crit = (payload.cartera || []).filter(function (c) { return c.banda === 'critico'; });
    if (crit.length) {
      var meses = mesesDe(payload.cartera);
      out += secTitle('Casos críticos — desglose por mes');
      out += '<table><thead><tr><th>Propiedad</th><th>Inquilino</th>' + meses.map(function (m) { return '<th class="r">' + ymLabel(m) + '</th>'; }).join('') + '<th class="r">Total</th></tr></thead><tbody>';
      var sub = {}; meses.forEach(function (m) { sub[m] = 0; }); var subT = 0;
      crit.forEach(function (c) {
        out += '<tr><td>' + E((c.casa || '—').split(',')[0]) + '</td><td>' + E(c.inquilino || '—') + '</td>';
        meses.forEach(function (m) { var cell = (c.por_mes || {})[m]; sub[m] += cell ? num(cell.deuda) : 0; out += '<td class="r">' + (cell ? M(cell.deuda) + (conMora && num(cell.dias_mora) > 0 ? '<span class="mora">' + num(cell.dias_mora) + ' d</span>' : '') : '—') + '</td>'; });
        subT += num(c.neto); out += '<td class="r"><b>' + M(c.neto) + '</b></td></tr>';
      });
      out += '<tr class="tot"><td colspan="2">SUBTOTAL CRÍTICOS</td>' + meses.map(function (m) { return '<td class="r">' + M(sub[m]) + '</td>'; }).join('') + '<td class="r">' + M(subT) + '</td></tr>';
      out += '</tbody></table>';
    }
    return out;
  }

  // plan de acción (informe combinado) — tarjetas generadas por reglas
  function planAccion(payload) {
    var cartera = payload.cartera || [];
    var cards = [];
    var mayor = cartera[0];
    if (mayor) cards.push({ h: 'Contacto inmediato — mayor deudor', p: E(mayor.inquilino || '—') + ' acumula ' + M(mayor.neto) + ' (' + E((mayor.casa || '').split(',')[0]) + '). Priorizar llamada/visita esta semana; es el caso de mayor impacto en la cartera.' });
    var parcial = cartera.find(function (c) { return num(c.a_favor) > 0 && num(c.neto) > 0; }) || cartera.find(function (c) { return Object.keys(c.por_mes || {}).length >= 2; });
    if (parcial) cards.push({ h: 'Plan de pago — deudor con pagos parciales', p: E(parcial.inquilino || '—') + ' viene abonando pero arrastra saldo (' + M(parcial.neto) + '). Ofrecer plan de pago formal para regularizar sin perder al inquilino.' });
    var chicos = cartera.filter(function (c) { return c.banda === 'bajo'; });
    if (chicos.length) cards.push({ h: 'Depurar — saldos residuales chicos', p: chicos.length + ' caso(s) con saldo < $1,000 (' + M(chicos.reduce(function (a, c) { return a + num(c.neto); }, 0)) + ' en total). Revisar si son diferencias de registro o mora real; depurar los que sean ruido contable.' });
    var viejos = cartera.filter(function (c) { return num(c.mora_max_dias) >= 60; });
    if (viejos.length) cards.push({ h: 'Validar antes de contar — saldos muy antiguos', p: viejos.length + ' caso(s) con mora ≥ 60 días. Validar comprobantes y contrato antes de darlos por mora firme (evitar contar como deuda lo que ya se pagó o no aplica).' });
    if (!cards.length) return '';
    return '<div class="acards">' + cards.slice(0, 4).map(function (c) { return '<div class="ac"><div class="ah">' + c.h + '</div><div class="ap">' + c.p + '</div></div>'; }).join('') + '</div>';
  }

  // estado del portafolio (informe combinado, pág 3)
  function estadoPortafolio(payload) {
    var o = payload.ocupacion || {}; var od = payload.ocup_derivado || {};
    var reservas = payload.reservas || [];
    var out = secTitle('Estado general del portafolio');
    out += '<div class="kgrid">'
      + kpi('Ocupadas', num(o.ocupadas), 'de ' + num(o.unidades_rentables) + ' unidades', 'ok')
      + kpi('Reservadas (mes próximo)', num(o.reservadas), 'lease firmado a futuro', 'warn')
      + kpi('Disponibles', num(o.disponibles), 'listas para rentar', 'warn')
      + kpi('Mantenimiento', num(o.mantenimiento), 'fuera de mercado', 'neg')
      + '</div>';
    out += distbar([{ label: 'Ocupadas', n: num(o.ocupadas), color: '#059669' }, { label: 'Reservadas', n: num(o.reservadas), color: '#7c3aed' }, { label: 'Disponibles', n: num(o.disponibles), color: '#2563eb' }, { label: 'Mantenimiento', n: num(o.mantenimiento), color: '#f59e0b' }]);
    out += '<div class="note">Ocupación efectiva = (ocupadas + reservadas) / total = <b>' + PC(od.ocup_efectiva_pct) + '</b> — la reserva ya está comprometida.</div>';
    if (reservas.length) {
      out += '<div class="mini" style="margin-top:10px"><div class="mt">Ingresos programados (reservas confirmadas)</div><ul style="margin:0;padding-left:16px;font-size:10.5px">'
        + reservas.map(function (r) { return '<li>' + E(r.inquilino || '—') + ' → ' + E((r.casa || '').split(',')[0]) + ' · ' + E(r.unidad || '') + ' · ' + M0(r.renta) + '/mes · ingresa ' + fechaLarga(r.start_date) + '</li>'; }).join('') + '</ul></div>';
    }
    // movimientos del próximo mes (salidas -> empalmes con reservas)
    var salidas = (payload.movimientos && payload.movimientos.salidas) || [];
    var unidades = payload.unidades || [];
    var proxSalidas = unidades.filter(function (u) { return u.contract_end && u.status === 'ocupada'; });
    if (reservas.length || salidas.length) {
      out += '<div class="mini" style="margin-top:10px"><div class="mt">Movimientos del próximo mes (empalmes)</div><ul style="margin:0;padding-left:16px;font-size:10.5px">';
      var emp = reservas.map(function (r) {
        var sale = unidades.find(function (u) { return u.unit_id === r.unit_id && u.status === 'ocupada'; });
        return '<li>' + E((r.casa || '').split(',')[0]) + ' · ' + E(r.unidad || '') + ': ' + (sale ? E(sale.inquilino || 'actual') + ' sale → ' : '') + E(r.inquilino || '—') + ' ingresa ' + fechaLarga(r.start_date) + '</li>';
      });
      out += (emp.length ? emp.join('') : '<li>Sin empalmes programados.</li>') + '</ul></div>';
    }
    return out;
  }

  // anexo detalle de unidades por propiedad (informe combinado + §7 semanal)
  function detallePorPropiedad(payload, conVigencia) {
    var unidades = payload.unidades || [];
    if (!unidades.length) return '<div class="note">Sin unidades en el espejo activo.</div>';
    var reservas = payload.reservas || [];
    var resByUnit = {}; reservas.forEach(function (r) { resByUnit[r.unit_id] = r; });
    var grupos = {};
    unidades.forEach(function (u) { var k = u.casa + '§' + (u.city || ''); (grupos[k] = grupos[k] || []).push(u); });
    var cols = conVigencia ? 5 : 5;
    var out = '<table><thead><tr><th>Unidad</th><th>Estado</th><th>Inquilino</th><th class="r">Renta</th><th>' + (conVigencia ? 'Vigencia' : 'Anotación') + '</th></tr></thead><tbody>';
    Object.keys(grupos).sort().forEach(function (k) {
      var casa = k.split('§')[0]; var city = k.split('§')[1];
      out += '<tr class="grp"><td colspan="' + cols + '">' + E(casa) + (city ? ' · ' + E(city) : '') + '</td></tr>';
      grupos[k].forEach(function (u) {
        var res = resByUnit[u.unit_id];
        var vig = (u.vigencia_inicio || u.vigencia_fin) ? (fechaLarga(u.vigencia_inicio) + ' → ' + (u.vigencia_fin ? fechaLarga(u.vigencia_fin) : 'sin fin')) : (u.contract_end ? 'contrato hasta ' + fechaLarga(u.contract_end) : '—');
        var anot = res ? (E((res.inquilino || 'nuevo')) + ' ingresa ' + fechaLarga(res.start_date)) : '';
        out += '<tr><td><b>' + E(u.unidad || '—') + '</b></td><td>' + estadoUnidad(u.status) + '</td><td>' + E(u.inquilino || (u.status === 'ocupada' ? '(sin nombre)' : '—')) + (res && u.status === 'ocupada' ? '<span class="tag-up">SALE→ENTRA</span>' : '') + '</td><td class="r">' + (u.status === 'ocupada' ? M0(u.renta) : '<span class="src">obj. ' + M0(u.target_rent) + '</span>') + '</td><td class="src">' + (conVigencia ? E(vig) : E(anot || vig)) + '</td></tr>';
      });
    });
    out += '</tbody></table>';
    return out;
  }

  // ══════════════════════════════════════════════════════════════
  // INFORME 1 — SEMANAL
  // ══════════════════════════════════════════════════════════════
  function informeSemanal(payload) {
    var o = payload.ocupacion || {}; var od = payload.ocup_derivado || {}; var ed = payload.editable || {};
    var mov = payload.movimientos || {}; var di = payload.delta_ingreso;
    var body = '';
    // 1. Resumen ejecutivo
    body += secTitle('1 · Resumen ejecutivo');
    body += '<div class="kgrid">'
      + kpi('Ocupación (activas)', PC(od.ocup_activas_pct), num(o.ocupadas) + '/' + num(od.activas) + ' · activas = total − mantenimiento', num(od.ocup_activas_pct) >= 90 ? 'ok' : 'warn')
      + kpi('Portafolio total', num(o.unidades_rentables) + ' unidades', num(od.propiedades) + ' propiedades · ' + num(od.ciudades) + ' ciudades', '')
      + kpi('Ingreso mensual contratado', M(od.ingreso_contratado), di ? ((num(di.delta) >= 0 ? '▲ +' : '▼ −') + M0(Math.abs(num(di.delta))) + ' vs semana previa') : 'renta de las ocupadas', di ? (num(di.delta) >= 0 ? 'ok' : 'neg') : '')
      + kpi('Potencial no capturado', M(od.potencial_no_capturado), 'renta de disponibles + mantenimiento', 'warn')
      + '</div>';
    body += distbar([{ label: 'Ocupadas', n: num(o.ocupadas), color: '#059669' }, { label: 'Reservadas', n: num(o.reservadas), color: '#7c3aed' }, { label: 'Disponibles', n: num(o.disponibles), color: '#2563eb' }, { label: 'Mantenimiento', n: num(o.mantenimiento), color: '#f59e0b' }]);
    body += '<div class="note">Ocupación sobre portafolio total: <b>' + PC(o.ocupacion_pct) + '</b> (' + num(o.ocupadas) + '/' + num(o.unidades_rentables) + '). Sobre activas: <b>' + PC(od.ocup_activas_pct) + '</b>.</div>';
    body += '<div class="mv">'
      + '<div class="mvc"><b>' + ((mov.entradas || []).length) + '</b><span>Ingresos (entradas)</span></div>'
      + '<div class="mvc"><b>' + ((mov.salidas || []).length) + '</b><span>Salidas</span></div>'
      + '<div class="mvc"><b>' + num(mov.pagos_n) + '</b><span>Pagos registrados · ' + M0(mov.pagos_monto) + '</span></div>'
      + '</div>';
    if ((mov.entradas || []).length || (mov.salidas || []).length) {
      body += '<div class="note">';
      if ((mov.entradas || []).length) body += '<b>Entradas:</b> ' + mov.entradas.map(function (e) { return E((e.inquilino || '—').trim()) + ' → ' + E((e.casa || '').split(',')[0]) + ' ' + E(e.unidad || ''); }).join(' · ') + '<br>';
      if ((mov.salidas || []).length) body += '<b>Salidas:</b> ' + mov.salidas.map(function (e) { return E((e.inquilino || '—').trim()) + ' ← ' + E((e.casa || '').split(',')[0]) + ' ' + E(e.unidad || ''); }).join(' · ');
      body += '</div>';
    }
    // 2. Alertas
    body += secTitle('2 · Alertas para revisión');
    if ((payload.discrepancias || []).length) {
      payload.discrepancias.forEach(function (x) { body += alertBox('warn', x.label, '<div>Cifra verificada: <b>' + (typeof x.verificado === 'number' ? (x.verificado) : E(x.verificado)) + '</b> — <span class="src">' + E(x.fuente) + '</span></div><div>' + E(x.detalle) + '</div>'); });
    } else { body += alertBox('ok', 'Sin discrepancias', '<div>El resumen y el detalle cuadran; no hay hallazgos del sistema esta semana.</div>'); }
    // 3. Gestión PM (editable)
    body += secTitle('3 · Gestión PM — cierre de semana');
    var gpm = ed.gestion_pm || [];
    if (gpm.length) body += '<ul class="gpm">' + gpm.map(function (g) { return '<li>' + E(g.texto || '') + (g.estado ? '<span class="gest-badge">' + E(g.estado) + '</span>' : '') + '</li>'; }).join('') + '</ul>';
    else body += '<div class="note">— Sin frentes cargados. Editá este bloque en el borrador antes de emitir (agregá los frentes de trabajo con su estado: META / AVANZANDO / EN PROCESO / EN SEGUIMIENTO / EVALUACIÓN).</div>';
    // 4. Unidades a gestionar
    body += secTitle('4 · Unidades a gestionar');
    var disp = (payload.unidades || []).filter(function (u) { return u.status === 'disponible'; });
    var mant = (payload.unidades || []).filter(function (u) { return u.status === 'mantenimiento'; });
    var tblUn = function (arr, vacio) { return arr.length ? '<table><thead><tr><th>Propiedad</th><th>Unidad</th><th class="r">Renta obj.</th></tr></thead><tbody>' + arr.map(function (u) { return '<tr><td>' + E((u.casa || '').split(',')[0]) + '</td><td>' + E(u.unidad || '') + '</td><td class="r">' + M0(u.target_rent) + '</td></tr>'; }).join('') + '</tbody></table>' : '<div class="note">' + vacio + '</div>'; };
    body += '<div class="box2"><div><div class="mt" style="font-size:9px;text-transform:uppercase;letter-spacing:.6px;color:#5a6472;font-weight:800;margin-bottom:4px">Disponibles (' + disp.length + ')</div>' + tblUn(disp, 'Ninguna disponible.') + '</div>'
      + '<div><div class="mt" style="font-size:9px;text-transform:uppercase;letter-spacing:.6px;color:#5a6472;font-weight:800;margin-bottom:4px">En mantenimiento (' + mant.length + ')</div>' + tblUn(mant, 'Ninguna en mantenimiento.') + '</div></div>';
    if (ed.notas_unidades) body += alertBox('info', 'Notas', '<div>' + E(ed.notas_unidades) + '</div>');
    // 5. Cartera a gestionar — vencimientos 90 días
    body += secTitle('5 · Cartera a gestionar — vencimientos de contrato (próximos 90 días)');
    var ctr = payload.contratos || [];
    if (ctr.length) {
      body += '<table><thead><tr><th>Vence</th><th>Propiedad</th><th>Unidad</th><th class="r">Renta</th><th>Inquilino</th><th>Prioridad</th></tr></thead><tbody>'
        + ctr.map(function (c) { return '<tr><td>' + fechaLarga(c.vence) + '<br><span class="src">en ' + num(c.dias) + ' días</span></td><td>' + E((c.propiedad || '').split(',')[0]) + '</td><td>' + E(c.unidad || '') + '</td><td class="r">' + M0(c.renta) + '</td><td>' + E((c.inquilino || '—')) + '</td><td>' + prioBadge(c.prioridad) + '</td></tr>'; }).join('')
        + '</tbody></table><div class="note">Prioridad: ALTA ≤ 15 días · MEDIA ≤ 45 días · SEGUIM. el resto. Fuente: reservas activas con fecha de fin (pm_bookings).</div>';
    } else body += '<div class="note">Sin contratos por vencer en los próximos 90 días.</div>';
    // 6. Próximas actividades
    body += secTitle('6 · Próximas actividades');
    var pa = ed.proximas_actividades || [];
    if (pa.length) body += '<ul class="chk">' + pa.map(function (x) { return '<li>' + E(typeof x === 'string' ? x : (x.texto || '')) + '</li>'; }).join('') + '</ul>';
    else body += '<div class="note">— Checklist vacío. Editalo en el borrador.</div>';
    if (ed.punto_mejora) body += alertBox('warn', 'Punto de mejora', '<div>' + E(ed.punto_mejora) + '</div>');
    // 7. Detalle por propiedad
    body += '<div class="st" style="page-break-before:always">7 · Detalle por propiedad</div>';
    body += detallePorPropiedad(payload, true);
    return shell('rp', payload.corte, 'Informe Semanal de Ocupación y Gestión', { txt: 'OCUPACIÓN ' + PC(od.ocup_activas_pct) + ' · ' + num(o.ocupadas) + '/' + num(od.activas) + ' ACTIVAS', estado: num(od.ocup_activas_pct) >= 90 ? 'ok' : 'warn' }, body);
  }

  // ══════════════════════════════════════════════════════════════
  // INFORME 2 — BALANCE DE RENTAS
  // ══════════════════════════════════════════════════════════════
  function informeBalance(payload) {
    var t = payload.totales || {};
    var body = '<div class="page">';
    body += bloqueCartera(payload, false, 'eh');
    body += '</div>';
    body += '<div class="st">Anexo — Matriz de antigüedad por inquilino</div>';
    body += matrizAntiguedad(payload, false);
    return shell('eh', payload.corte, 'Balance de Rentas — Avance del Proceso', { txt: 'CARTERA ' + M(t.bruto) + ' · ' + (t.casos || 0) + ' CASOS', estado: 'neg' }, body);
  }

  // ══════════════════════════════════════════════════════════════
  // INFORME 3 — COMBINADO
  // ══════════════════════════════════════════════════════════════
  function informeCombinado(payload) {
    var t = payload.totales || {}; var od = payload.ocup_derivado || {};
    var body = '<div class="page">';
    body += bloqueCartera(payload, true, 'eh');
    body += '</div>';
    // pág 2: plan de acción + matriz
    var pa = planAccion(payload);
    if (pa) { body += '<div class="st">Plan de acción — recomendaciones</div>' + pa; }
    body += '<div class="st" style="page-break-before:always">Anexo — Matriz de antigüedad por inquilino (con mora)</div>';
    body += matrizAntiguedad(payload, true);
    // pág 3: estado del portafolio
    body += '<div class="page"></div>';
    body += '<div style="page-break-before:always">' + estadoPortafolio(payload) + '</div>';
    // pág 4-5: anexo unidades
    body += '<div class="st" style="page-break-before:always">Anexo — Detalle de unidades por propiedad</div>';
    body += detallePorPropiedad(payload, true);
    return shell('eh', payload.corte, 'Informe de Cartera Vencida + Estado General del Portafolio', { txt: 'CARTERA ' + M(t.bruto) + ' · OCUP. EFECTIVA ' + PC(od.ocup_efectiva_pct), estado: 'neg' }, body);
  }

  function informeRender(payload) {
    if (!payload || !payload.tipo) return shell('eh', null, 'Informe', null, '<div class="note">Payload vacío.</div>');
    if (payload.tipo === 'semanal') return informeSemanal(payload);
    if (payload.tipo === 'balance') return informeBalance(payload);
    if (payload.tipo === 'combinado') return informeCombinado(payload);
    return shell('eh', payload.corte, 'Informe de Rentas', null, '<div class="note">Tipo no reconocido: ' + E(payload.tipo) + '</div>');
  }
  function informeOpen(payload) {
    var html = informeRender(payload);
    var w = window.open('', '_blank', 'width=900,height=1040');
    if (!w) { alert('El navegador bloqueó la ventana — permití popups para descargar el PDF.'); return; }
    w.document.write(html); w.document.close();
  }
  window.informeRender = informeRender;
  window.informeOpen = informeOpen;
})();
