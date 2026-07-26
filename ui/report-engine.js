// ════════════════════════════════════════════════════════════════
// 📄 EMPRESA OS · MOTOR DE REPORTES (O6, auditoría 2026-07-13) — entregable honesto y reusable.
// El estándar es el PDF semanal de Rentas: encabezado con marca, resumen ejecutivo, tarjetas KPI,
// tablas con badges, secciones, conclusión y print CSS. Números SIEMPRE de la capa de KPIs (O1);
// PROHIBIDO ✅ sobre vacío (usa noZeroAsReal); sin volcados crudos de fórmula.
// API: reportOpen({ titulo, subtitulo, empresa, badge, secciones:[...], conclusion, fuentes })
//   sección: { t:'kpis', items:[{lab,val,sub,estado}] } · { t:'tabla', titulo, cols, rows, nota }
//          · { t:'filas', titulo, filas:[[label, valor, clase?]] } · { t:'texto', titulo, html }
// reportCasa(property_id): reporte por casa desde v_property_360 + v_pnl_casa + v_obras.
// ════════════════════════════════════════════════════════════════
/* eslint-disable no-unused-vars */

function reportOpen(cfg) {
  const E = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fecha = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
  const estadoC = e => e === 'ok' ? '#059669' : e === 'neg' ? '#dc2626' : e === 'warn' ? '#b45309' : '#0e1420';
  const sec = (titulo, inner) => '<div class="sec">' + (titulo ? '<div class="st">' + E(titulo) + '</div>' : '') + inner + '</div>';
  const render = s => {
    if (s.t === 'kpis') return '<div class="kgrid" style="grid-template-columns:repeat(' + Math.min(4, s.items.length) + ',1fr)">'
      + s.items.map(k => '<div class="k"><div class="l">' + E(k.lab) + '</div><div class="v" style="color:' + estadoC(k.estado) + '">' + (k.val == null || k.val === '' ? '<span style="color:#8b93a1;font-size:13px">sin dato</span>' : k.val) + '</div>' + (k.sub ? '<div class="s">' + k.sub + '</div>' : '') + '</div>').join('') + '</div>';
    if (s.t === 'tabla') return sec(s.titulo, '<table><thead><tr>' + s.cols.map(c => '<th>' + E(c) + '</th>').join('') + '</tr></thead><tbody>'
      + s.rows.map(r => '<tr>' + r.map(c => '<td>' + (c == null ? '<span style="color:#8b93a1">—</span>' : c) + '</td>').join('') + '</tr>').join('') + '</tbody></table>'
      + (s.nota ? '<div class="nota">' + s.nota + '</div>' : ''));
    if (s.t === 'filas') return sec(s.titulo, s.filas.map(f => '<div class="row' + (f[2] ? ' ' + f[2] : '') + '"><span>' + f[0] + '</span><b>' + (f[1] == null ? '<span style="color:#8b93a1;font-weight:400">sin dato</span>' : f[1]) + '</b></div>').join(''));
    if (s.t === 'texto') return sec(s.titulo, '<div style="font-size:12.5px;line-height:1.55;color:#5a6270">' + s.html + '</div>');
    return '';
  };
  const html = '<!doctype html><html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&display=swap" rel="stylesheet"><title>' + E(cfg.titulo) + ' · Rental Profits</title><style>'
    + 'body{font-family:-apple-system,"Segoe UI",Inter,sans-serif;color:#0e1420;margin:0 auto;padding:34px;max-width:780px;line-height:1.45;background:#fff}'
    + '.top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #5c79f0;padding-bottom:13px;margin-bottom:4px}'
    + '.logo{font-size:20px;font-weight:800;color:#2b44c6;font-family:Fraunces,Georgia,serif}.logo em{font-style:normal;color:#5c79f0}.logo span{display:block;font-size:9px;letter-spacing:2.2px;color:#6f7785;font-weight:700;margin-top:2px}'
    + 'h1{font-size:21px;margin:14px 0 2px;font-family:Fraunces,Georgia,serif}.sub{font-size:12px;color:#6f7785}'
    + '.badge{display:inline-block;font-size:11px;font-weight:800;color:#fff;background:#3a5be0;padding:3px 12px;border-radius:18px;margin-top:8px}'
    + '.kgrid{display:grid;gap:9px;margin:14px 0}'
    + '.k{border:1px solid #dfe4ec;border-radius:10px;padding:10px 12px;background:#faf8f4}'
    + '.k .l{font-size:8.5px;text-transform:uppercase;letter-spacing:.7px;color:#6f7785;font-weight:800}'
    + '.k .v{font-size:18px;font-weight:800;margin-top:2px;font-variant-numeric:tabular-nums}.k .s{font-size:9.5px;color:#6f7785;margin-top:1px}'
    + '.sec{margin-top:14px;border:1px solid #dfe4ec;border-radius:11px;padding:13px 15px;page-break-inside:avoid}'
    + '.st{font-size:10px;text-transform:uppercase;letter-spacing:1px;font-weight:800;color:#2b44c6;margin-bottom:7px}'
    + 'table{border-collapse:collapse;width:100%;font-size:11.5px}th{text-align:left;font-size:9px;text-transform:uppercase;color:#6f7785;padding:4px 8px;border-bottom:2px solid #dfe4ec}td{padding:5px 8px;border-bottom:1px solid #eef1f6}'
    + '.b-ok{background:#e7f8f0;color:#059669;font-size:9.5px;font-weight:800;padding:1px 8px;border-radius:12px}.b-warn{background:#e7edf9;color:#b45309;font-size:9.5px;font-weight:800;padding:1px 8px;border-radius:12px}.b-neg{background:#fdeaee;color:#dc2626;font-size:9.5px;font-weight:800;padding:1px 8px;border-radius:12px}'
    + '.row{display:flex;justify-content:space-between;font-size:12px;padding:4.5px 0;border-bottom:1px dashed #eef1f6}.row b{font-variant-numeric:tabular-nums}.row.neg b{color:#dc2626}.row.big{font-size:13.5px}.row.big b{font-size:14px}'
    + '.nota{font-size:10px;color:#6f7785;margin-top:7px}'
    + '.foot{margin-top:20px;padding-top:11px;border-top:1px solid #dfe4ec;font-size:9.5px;color:#8b93a1;display:flex;justify-content:space-between;gap:10px}'
    + '.btn{position:fixed;top:12px;right:12px;padding:9px 18px;background:linear-gradient(135deg,#5c79f0,#3a5be0);color:#fff;border:none;border-radius:10px;cursor:pointer;font-weight:800;font-size:13px}'
    + '@media print{.btn{display:none}body{padding:16px}}'
    + '</style></head><body>'
    + '<button class="btn" onclick="window.print()">' + osIcon('printer') + ' Imprimir / PDF</button>'
    + '<div class="top"><div class="logo">RENTAL <em>PROFITS</em><span>' + E(cfg.empresa || 'FLIPPING RENTALS OS') + '</span></div>'
    + '<div style="text-align:right;font-size:11px;color:#6f7785">' + fecha + '</div></div>'
    + '<h1>' + E(cfg.titulo) + '</h1>'
    + (cfg.subtitulo ? '<div class="sub">' + E(cfg.subtitulo) + '</div>' : '')
    + (cfg.badge ? '<span class="badge" style="background:' + estadoC(cfg.badge.estado) + '">' + E(cfg.badge.txt) + '</span>' : '')
    + (cfg.secciones || []).map(render).join('')
    + (cfg.conclusion ? '<div class="sec" style="background:#faf8f4"><div class="st">Conclusión</div><div style="font-size:12.5px;line-height:1.55">' + cfg.conclusion + '</div></div>' : '')
    + '<div class="foot"><span>Preparado por <b>Rental Profits</b> · ' + fecha + (cfg.fuentes ? ' · fuentes: ' + E(cfg.fuentes) : '') + '</span><span>Cifras de la capa de KPIs, reconciliadas — "sin dato" nunca se muestra como $0.</span></div>'
    + '</body></html>';
  const w = window.open('', '_blank', 'width=840,height=1000');
  if (!w) { alert('El navegador bloqueó la ventana — permití popups.'); return; }
  w.document.write(html); w.document.close();
}

// ─── Reporte POR CASA (v_property_360 + v_pnl_casa + v_obras) ───
async function reportCasa(propertyId) {
  const M = window.kitMoney || (n => n == null ? '—' : '$' + Math.round(n).toLocaleString('en-US'));
  const [p360, pnl, obra] = await Promise.all([
    sb.from('v_property_360').select('*').eq('property_id', propertyId).maybeSingle().then(r => r.data),
    sb.from('v_pnl_casa').select('*').eq('property_id', propertyId).maybeSingle().then(r => r.data),
    sb.from('v_obras').select('*').eq('property_id', propertyId).maybeSingle().then(r => r.data).catch(() => null),
  ]);
  if (!p360) { alert('La casa no está en v_property_360.'); return; }
  const eqOk = p360.equity != null && +p360.equity >= 0;
  reportOpen({
    titulo: p360.casa, subtitulo: p360.address + ' · etapa ' + (p360.etapa || '—'), empresa: 'REPORTE DE CASA',
    badge: p360.equity != null ? { txt: (eqOk ? 'EQUITY +' : 'EQUITY ') + M(+p360.equity), estado: eqOk ? 'ok' : 'neg' } : null,
    fuentes: 'Airtable + QBO (capa de KPIs O1)',
    secciones: [
      { t: 'kpis', items: [
        { lab: 'Compra', val: p360.compra != null ? M(+p360.compra) : null },
        { lab: 'Rehab real', val: p360.rehab_real != null ? M(+p360.rehab_real) : null },
        { lab: 'All-in', val: p360.all_in != null ? M(+p360.all_in) : null },
        { lab: 'ARV', val: p360.arv != null ? M(+p360.arv) : null },
      ] },
      { t: 'filas', titulo: 'Obra', filas: [
        ['Estado', obra ? (obra.proceso || '—') : 'sin obra en Remodelación'],
        ['Avance (Planner)', obra && obra.avance_planner != null ? Math.round(obra.avance_planner) + '%' : null],
        ['Líder', p360.lider || null],
        ['Utilidad de obra', obra && obra.utilidad != null ? M(+obra.utilidad) + (obra.en_curso ? ' (proyectada, obra en curso)' : ' (final)') : null],
      ] },
      { t: 'filas', titulo: 'P&L de la casa (con el interés visible)', filas: pnl ? [
        ['Ingresos de renta', M(+pnl.ingresos_renta)],
        ['− Gastos operativos', '−' + M(+pnl.gastos_operativos), 'neg'],
        ['− Interés HML pagado', '−' + M(+pnl.interes_hml_real), 'neg'],
        ['= Neta post-interés', M(+pnl.utilidad_neta_post_interes), 'big' + (+pnl.utilidad_neta_post_interes < 0 ? ' neg' : '')],
      ] : [['P&L', null]] },
    ],
    conclusion: p360.equity != null
      ? (eqOk ? 'La casa lleva <b>' + M(+p360.equity) + ' de equity incorporado</b> (ARV − all-in). '
        : 'La casa está <b>' + M(Math.abs(+p360.equity)) + ' por encima de su ARV</b> en costo — revisar salida. ')
        + (pnl && +pnl.utilidad_neta_post_interes < 0 ? 'La operación aún no cubre su interés: priorizar renta plena o refinanciación.' : 'La operación cubre sus costos.')
      : 'Faltan datos de ARV/all-in para conclusión — completar en Airtable.',
  });
}
window.reportOpen = reportOpen; window.reportCasa = reportCasa;
