// =============================================================================
// Genera 3 PPTs profesionales para FlipMentoría usando PptxGenJS
// Replica el motor `eduBuildPPTX` de education.js (15 layouts custom).
// Salida: 3 .pptx en /sessions/.../outputs/
// =============================================================================

const PptxGenJS = require('pptxgenjs');
const fs = require('fs');

// =============================================================================
// MOTOR DE RENDERIZADO (copiado/adaptado de education.js)
// =============================================================================
function buildPPTX(p, filename) {
  const pres = new PptxGenJS();
  pres.layout = 'LAYOUT_WIDE';
  pres.title = p.title;
  pres.company = 'FlipMentoría · Empresa OS';

  const BRAND = (p.brand || 'FLIPMENTORÍA').toUpperCase();
  const YEAR = String(new Date().getFullYear());
  const NAV = '0F172A', NAV_LIGHT = '1E293B', ACCENT = '2563EB', GOLD = 'D97706';
  const GRAY_LIGHT = 'F1F5F9', GRAY_MED = '64748B', WHITE = 'FFFFFF';
  const c = { NAV, NAV_LIGHT, ACCENT, GOLD, GRAY_LIGHT, GRAY_MED, WHITE, BRAND, YEAR };

  pres.defineSlideMaster({
    title: 'BRAND',
    background: { color: WHITE },
    objects: [
      { text: { text: BRAND, options: { x: 0.4, y: 0.18, w: 5, h: 0.25, color: GRAY_MED, fontSize: 9, bold: true, charSpacing: 2 } } },
      { text: { text: YEAR, options: { x: 12.4, y: 0.18, w: 0.6, h: 0.25, color: GRAY_MED, fontSize: 9, bold: true, align: 'right' } } },
      { rect: { x: 0.4, y: 0.45, w: 12.5, h: 0.02, fill: { color: GRAY_LIGHT } } },
      { rect: { x: 0, y: 7.1, w: 13.333, h: 0.4, fill: { color: NAV } } },
      { text: { text: `${BRAND} · ${(p.title || '').slice(0, 60)}`, options: { x: 0.4, y: 7.15, w: 10, h: 0.3, color: WHITE, fontSize: 9 } } }
    ],
    slideNumber: { x: 12.6, y: 7.15, color: WHITE, fontSize: 10 }
  });
  pres.defineSlideMaster({ title: 'BARE', background: { color: NAV } });

  (p.slides || []).forEach((s, idx) => {
    const isCover = s.layout === 'cover' || (idx === 0 && !s.layout);
    const slide = pres.addSlide({ masterName: isCover ? 'BARE' : 'BRAND' });

    if (isCover) { renderCover(slide, s, p, c); return; }

    if (s.block_label) {
      slide.addText(String(s.block_label).toUpperCase(), {
        x: 0.4, y: 0.6, w: 12.5, h: 0.3, fontSize: 11, bold: true, color: GOLD, charSpacing: 3
      });
      slide.addShape(pres.shapes.RECTANGLE, { x: 0.4, y: 0.92, w: 0.9, h: 0.045, fill: { color: GOLD }, line: { color: GOLD } });
    }
    const titleY = s.block_label ? 1.05 : 0.7;
    slide.addText(s.title || `Slide ${idx + 1}`, { x: 0.4, y: titleY, w: 12.5, h: 0.6, fontSize: 26, bold: true, color: NAV });
    if (s.subtitle) slide.addText(s.subtitle, { x: 0.4, y: titleY + 0.6, w: 12.5, h: 0.4, fontSize: 14, color: GRAY_MED, italic: true });

    switch (s.layout) {
      case 'agenda':              renderAgenda(slide, s, c, pres); break;
      case 'comparison':          renderComparison(slide, s, c, pres); break;
      case 'benefits':            renderBenefits(slide, s, c, pres); break;
      case 'case-study':          renderCaseStudy(slide, s, c, pres); break;
      case 'framework':           renderFramework(slide, s, c, pres); break;
      case 'checklist':           renderChecklist(slide, s, c, pres); break;
      case 'strategy-grid':       renderStrategyGrid(slide, s, c, pres); break;
      case 'metrics-dashboard':   renderMetricsDashboard(slide, s, c, pres); break;
      case 'quote':               renderQuote(slide, s, c, pres); break;
      case 'closing':             renderClosing(slide, s, p, c, pres); break;
      case 'learning-objectives': renderLearningObjectives(slide, s, c, pres); break;
      case 'reflection-recap':    renderReflectionRecap(slide, s, c, pres); break;
      case 'transfer-activity':   renderTransferActivity(slide, s, c, pres); break;
      case 'goldbox':             renderGoldbox(slide, s, c, pres); break;
      case 'highlight':           renderHighlight(slide, s, c, pres); break;
      default:                    renderDefault(slide, s, c, pres);
    }

    if (s.speaker_notes) {
      slide.addNotes(s.speaker_notes);
    }
  });

  pres.writeFile({ fileName: filename }).then(() => {
    console.log(`✓ ${filename}`);
  });
}

function renderCover(slide, s, p, c) {
  slide.addText(c.BRAND, { x: 0.5, y: 0.5, w: 12.3, h: 0.4, color: c.GOLD, fontSize: 13, bold: true, charSpacing: 4 });
  slide.addText(c.YEAR, { x: 12.3, y: 0.5, w: 0.6, h: 0.4, color: c.GRAY_MED, fontSize: 13, align: 'right' });
  slide.addText(s.title || p.title, { x: 0.5, y: 2.0, w: 12.3, h: 1.6, fontSize: 46, bold: true, color: c.WHITE, align: 'center' });
  if (s.subtitle) {
    slide.addShape('rect', { x: 1, y: 3.8, w: 11.3, h: 0.04, fill: { color: c.GOLD }, line: { color: c.GOLD } });
    slide.addText(`"${s.subtitle}"`, { x: 0.5, y: 4.0, w: 12.3, h: 0.8, fontSize: 18, color: 'CBD5E1', align: 'center', italic: true });
  }
  const kpis = s.metric_cards || s.stats || [];
  if (kpis.length) {
    const top3 = kpis.slice(0, 3);
    const cardW = 12 / top3.length;
    top3.forEach((k, i) => {
      const x = 0.7 + i * cardW;
      slide.addText(String(k.value || ''), { x, y: 5.2, w: cardW - 0.2, h: 0.7, fontSize: 36, bold: true, color: c.GOLD, align: 'center' });
      slide.addText(String(k.label || ''), { x, y: 5.95, w: cardW - 0.2, h: 0.4, fontSize: 12, color: 'CBD5E1', align: 'center' });
    });
  }
}

function renderAgenda(slide, s, c) {
  const steps = s.agenda_steps || (s.bullets || []).map(b => ({ step: b, label: '' }));
  if (!steps.length) return;
  const n = Math.min(steps.length, 6);
  const cardW = 12 / n;
  const y = 2.6;
  steps.slice(0, n).forEach((st, i) => {
    const x = 0.7 + i * cardW;
    slide.addShape('ellipse', { x: x + cardW/2 - 0.4, y, w: 0.8, h: 0.8, fill: { color: c.ACCENT }, line: { color: c.ACCENT } });
    slide.addText(String(i+1), { x: x + cardW/2 - 0.4, y, w: 0.8, h: 0.8, fontSize: 24, bold: true, color: c.WHITE, align: 'center', valign: 'middle' });
    slide.addText(String(st.step || st.title || ''), { x: x + 0.1, y: y + 1.0, w: cardW - 0.2, h: 0.5, fontSize: 16, bold: true, color: c.NAV, align: 'center' });
    if (st.label) slide.addText(String(st.label), { x: x + 0.1, y: y + 1.5, w: cardW - 0.2, h: 0.7, fontSize: 10, color: c.NAV_LIGHT, align: 'center' });
    if (i < n - 1) {
      slide.addText('→', { x: x + cardW - 0.3, y: y + 0.2, w: 0.4, h: 0.5, fontSize: 20, color: c.NAV_LIGHT, align: 'center' });
    }
  });
}

function renderComparison(slide, s, c) {
  const cmp = s.comparison || { left: { title: 'A', items: [] }, right: { title: 'B', items: [] } };
  const y0 = 2.0, w = 5.9, h = 4.7;
  slide.addShape('roundRect', { x: 0.5, y: y0, w, h, fill: { color: 'FEE2E2' }, line: { color: 'F87171', width: 2 }, rectRadius: 0.15 });
  slide.addText(cmp.left?.title || 'Opción A', { x: 0.7, y: y0 + 0.2, w: w - 0.4, h: 0.5, fontSize: 18, bold: true, color: 'B91C1C' });
  const leftItems = (cmp.left?.items || []).map(t => ({ text: '✗ ' + t, options: { fontSize: 13, color: '7F1D1D', breakLine: true, paraSpaceAfter: 6 } }));
  slide.addText(leftItems, { x: 0.8, y: y0 + 0.9, w: w - 0.5, h: h - 1.1 });
  slide.addShape('roundRect', { x: 6.95, y: y0, w, h, fill: { color: 'DCFCE7' }, line: { color: '4ADE80', width: 2 }, rectRadius: 0.15 });
  slide.addText(cmp.right?.title || 'Opción B', { x: 7.15, y: y0 + 0.2, w: w - 0.4, h: 0.5, fontSize: 18, bold: true, color: '14532D' });
  const rightItems = (cmp.right?.items || []).map(t => ({ text: '✓ ' + t, options: { fontSize: 13, color: '14532D', breakLine: true, paraSpaceAfter: 6 } }));
  slide.addText(rightItems, { x: 7.25, y: y0 + 0.9, w: w - 0.5, h: h - 1.1 });
}

function renderBenefits(slide, s, c) {
  const items = (s.bullets || []).slice(0, 6);
  if (!items.length) return;
  const cols = items.length > 3 ? 2 : 1;
  const rows = Math.ceil(items.length / cols);
  const cardW = (12 / cols) - 0.3;
  const cardH = (4.5 / rows) - 0.2;
  items.forEach((b, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = 0.5 + col * (cardW + 0.3);
    const y = 2.0 + row * (cardH + 0.2);
    slide.addShape('roundRect', { x, y, w: cardW, h: cardH, fill: { color: c.GRAY_LIGHT }, line: { color: 'CBD5E1' }, rectRadius: 0.1 });
    slide.addShape('ellipse', { x: x + 0.2, y: y + 0.2, w: 0.6, h: 0.6, fill: { color: c.ACCENT }, line: { color: c.ACCENT } });
    slide.addText(String(i+1), { x: x + 0.2, y: y + 0.2, w: 0.6, h: 0.6, fontSize: 18, bold: true, color: c.WHITE, align: 'center', valign: 'middle' });
    slide.addText(b, { x: x + 1.0, y: y + 0.2, w: cardW - 1.2, h: cardH - 0.4, fontSize: 13, color: c.NAV, valign: 'middle' });
  });
}

function renderCaseStudy(slide, s, c) {
  const cs = s.case_study;
  if (!cs) return renderDefault(slide, s, c);
  slide.addShape('roundRect', { x: 0.4, y: 1.8, w: 12.5, h: 0.7, fill: { color: c.NAV }, line: { color: c.NAV }, rectRadius: 0.1 });
  slide.addText(`📍 ${cs.name}${cs.location ? ' · ' + cs.location : ''}`, { x: 0.7, y: 1.85, w: 8, h: 0.6, fontSize: 18, bold: true, color: 'FFFFFF', valign: 'middle' });
  if (cs.estrategia) slide.addText(cs.estrategia, { x: 8.7, y: 1.85, w: 4, h: 0.6, fontSize: 13, color: c.GOLD, valign: 'middle', align: 'right', italic: true });

  const kpis = [
    { label: 'Compra', value: cs.compra ? '$' + Math.round(cs.compra).toLocaleString() : '—', color: '64748B' },
    { label: 'Remodelación', value: cs.remodelacion ? '$' + Math.round(cs.remodelacion).toLocaleString() : '—', color: '64748B' },
    { label: 'ARV', value: cs.arv ? '$' + Math.round(cs.arv).toLocaleString() : '—', color: c.ACCENT },
    { label: 'Ganancia', value: cs.ganancia ? '$' + Math.round(cs.ganancia).toLocaleString() : '—', color: c.GOLD }
  ];
  kpis.forEach((k, i) => {
    const x = 0.4 + i * 3.15;
    slide.addShape('roundRect', { x, y: 2.8, w: 3.0, h: 1.6, fill: { color: c.GRAY_LIGHT }, line: { color: 'CBD5E1' }, rectRadius: 0.1 });
    slide.addText(k.label, { x: x + 0.15, y: 2.9, w: 2.7, h: 0.3, fontSize: 10, color: '64748B', bold: true });
    slide.addText(k.value, { x: x + 0.15, y: 3.25, w: 2.7, h: 0.9, fontSize: 26, bold: true, color: k.color, valign: 'middle' });
  });

  if (cs.duracion_meses) {
    slide.addShape('roundRect', { x: 0.4, y: 4.6, w: 6.05, h: 1.5, fill: { color: 'EFF6FF' }, line: { color: '93C5FD', width: 2 }, rectRadius: 0.1 });
    slide.addText('⏱ Duración del proyecto', { x: 0.6, y: 4.7, w: 5.8, h: 0.3, fontSize: 11, color: '1E40AF', bold: true });
    slide.addText(cs.duracion_meses + ' meses', { x: 0.6, y: 5.05, w: 5.8, h: 1.0, fontSize: 32, bold: true, color: '1E40AF', valign: 'middle' });
  }
  if (cs.roi) {
    slide.addShape('roundRect', { x: 6.55, y: 4.6, w: 6.4, h: 1.5, fill: { color: 'ECFDF5' }, line: { color: '6EE7B7', width: 2 }, rectRadius: 0.1 });
    slide.addText('💰 ROI del deal', { x: 6.75, y: 4.7, w: 6.0, h: 0.3, fontSize: 11, color: '047857', bold: true });
    slide.addText(cs.roi + '%', { x: 6.75, y: 5.05, w: 6.0, h: 1.0, fontSize: 32, bold: true, color: '047857', valign: 'middle' });
  }
  if (cs.key_takeaway) {
    slide.addText(`"${cs.key_takeaway}"`, { x: 0.4, y: 6.25, w: 12.5, h: 0.7, fontSize: 13, color: c.NAV, italic: true, align: 'center' });
  }
}

function renderFramework(slide, s, c) {
  const items = s.framework_items || (s.bullets || []).map(b => ({ label: b, value: '' }));
  if (!items.length) return;
  const cardW = 5.9, cardH = 0.7;
  items.forEach((it, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 0.5 + col * 6.3;
    const y = 2.0 + row * (cardH + 0.15);
    slide.addShape('rect', { x, y, w: 0.08, h: cardH, fill: { color: c.ACCENT }, line: { color: c.ACCENT } });
    slide.addShape('rect', { x: x + 0.08, y, w: cardW - 0.08, h: cardH, fill: { color: c.GRAY_LIGHT }, line: { color: 'E2E8F0' } });
    slide.addText(it.label || '', { x: x + 0.3, y, w: cardW - 2.0, h: cardH, fontSize: 13, color: c.NAV, valign: 'middle', bold: true });
    if (it.value) slide.addText(String(it.value), { x: x + cardW - 1.8, y, w: 1.6, h: cardH, fontSize: 14, bold: true, color: c.ACCENT, align: 'right', valign: 'middle' });
  });
}

function renderChecklist(slide, s, c) {
  const items = s.checklist_items || (s.bullets || []).map(b => ({ title: b, detail: '' }));
  if (!items.length) return;
  items.slice(0, 6).forEach((it, i) => {
    const y = 1.95 + i * 0.78;
    slide.addShape('rect', { x: 0.5, y: y + 0.1, w: 0.5, h: 0.5, fill: { color: '10B981' }, line: { color: '10B981' } });
    slide.addText('✓', { x: 0.5, y: y + 0.1, w: 0.5, h: 0.5, fontSize: 22, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle' });
    slide.addText(it.title || '', { x: 1.2, y, w: 11.5, h: 0.35, fontSize: 15, bold: true, color: c.NAV });
    if (it.detail) slide.addText(it.detail, { x: 1.2, y: y + 0.35, w: 11.5, h: 0.35, fontSize: 11, color: '64748B' });
  });
}

function renderStrategyGrid(slide, s, c) {
  const opts = s.strategy_options || [];
  if (!opts.length) return;
  const cols = Math.min(opts.length, 4);
  const cardW = (12.5 / cols) - 0.2;
  opts.slice(0, cols).forEach((op, i) => {
    const x = 0.4 + i * (cardW + 0.2);
    const y = 1.9, h = 4.5;
    slide.addShape('roundRect', { x, y, w: cardW, h, fill: { color: 'FFFFFF' }, line: { color: 'E2E8F0', width: 1 }, rectRadius: 0.1 });
    slide.addShape('rect', { x, y, w: cardW, h: 0.7, fill: { color: c.NAV }, line: { color: c.NAV } });
    slide.addText(op.name || `Opción ${i+1}`, { x: x + 0.1, y: y + 0.1, w: cardW - 0.2, h: 0.5, fontSize: 15, bold: true, color: 'FFFFFF', align: 'center' });
    const metrics = [
      { k: 'Capital inicial', v: op.cash_flow || '—' },
      { k: 'ROI esperado', v: op.scalability || '—' },
      { k: 'Tiempo', v: op.operation || '—' }
    ];
    metrics.forEach((m, mi) => {
      const my = y + 0.85 + mi * 0.85;
      slide.addText(m.k, { x: x + 0.2, y: my, w: cardW - 0.4, h: 0.25, fontSize: 9, color: '64748B', bold: true });
      slide.addText(m.v, { x: x + 0.2, y: my + 0.25, w: cardW - 0.4, h: 0.4, fontSize: 16, bold: true, color: c.ACCENT });
    });
    if (op.ideal_for) {
      slide.addText(op.ideal_for, { x: x + 0.2, y: y + h - 0.8, w: cardW - 0.4, h: 0.6, fontSize: 9, color: c.NAV_LIGHT, italic: true, align: 'center' });
    }
  });
}

function renderMetricsDashboard(slide, s, c) {
  const cards = s.metric_cards || s.stats || [];
  if (!cards.length) return;
  const cols = Math.min(cards.length, 4);
  const cardW = (12.5 / cols) - 0.2;
  cards.slice(0, 8).forEach((m, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = 0.4 + col * (cardW + 0.2);
    const y = 2.0 + row * 2.2;
    slide.addShape('roundRect', { x, y, w: cardW, h: 2.0, fill: { color: c.GRAY_LIGHT }, line: { color: 'CBD5E1' }, rectRadius: 0.1 });
    slide.addText(m.label || '', { x: x + 0.15, y: y + 0.15, w: cardW - 0.3, h: 0.3, fontSize: 11, color: c.NAV_LIGHT, bold: true });
    slide.addText(String(m.value || ''), { x: x + 0.15, y: y + 0.5, w: cardW - 0.3, h: 1.0, fontSize: 32, bold: true, color: c.ACCENT, valign: 'middle' });
    if (m.trend) slide.addText(m.trend, { x: x + 0.15, y: y + 1.55, w: cardW - 0.3, h: 0.35, fontSize: 11, color: '10B981', bold: true });
  });
}

function renderQuote(slide, s, c) {
  const txt = s.quote_text || s.title || '';
  slide.addText('"', { x: 0.5, y: 1.8, w: 1.5, h: 1.2, fontSize: 80, bold: true, color: c.ACCENT, valign: 'top' });
  slide.addText(txt, { x: 1.8, y: 2.4, w: 10.8, h: 2.6, fontSize: 28, bold: true, color: c.NAV, italic: true, valign: 'middle' });
  if (s.quote_author) {
    slide.addShape('rect', { x: 1.8, y: 5.2, w: 2, h: 0.04, fill: { color: c.ACCENT }, line: { color: c.ACCENT } });
    slide.addText('— ' + s.quote_author, { x: 1.8, y: 5.4, w: 10.8, h: 0.4, fontSize: 14, color: c.GRAY_MED, italic: true });
  }
}

function renderClosing(slide, s, p, c) {
  slide.background = { color: c.NAV };
  slide.addText(c.BRAND, { x: 0.5, y: 0.5, w: 12.3, h: 0.4, color: c.GOLD, fontSize: 13, bold: true, charSpacing: 4 });
  const q = s.quote_text || s.title || 'Gracias';
  slide.addText('"' + q + '"', { x: 1, y: 2.0, w: 11.3, h: 1.8, fontSize: 32, bold: true, color: c.WHITE, italic: true, align: 'center', valign: 'middle' });
  if (s.quote_author) {
    slide.addText('— ' + s.quote_author, { x: 1, y: 4.0, w: 11.3, h: 0.5, fontSize: 14, color: 'CBD5E1', align: 'center', italic: true });
  }
  const stats = s.metric_cards || s.stats || [];
  if (stats.length) {
    const top3 = stats.slice(0, 3);
    const cardW = 12 / top3.length;
    top3.forEach((k, i) => {
      const x = 0.7 + i * cardW;
      slide.addText(String(k.value || ''), { x, y: 5.0, w: cardW - 0.2, h: 0.8, fontSize: 40, bold: true, color: c.GOLD, align: 'center' });
      slide.addText(String(k.label || ''), { x, y: 5.85, w: cardW - 0.2, h: 0.4, fontSize: 12, color: 'CBD5E1', align: 'center' });
    });
  }
}

function renderDefault(slide, s, c) {
  if ((s.bullets || []).length) {
    const txt = s.bullets.map(b => ({ text: b, options: { bullet: { code: '25CF' }, fontSize: 16, color: c.NAV, breakLine: true, paraSpaceAfter: 8 } }));
    slide.addText(txt, { x: 0.6, y: 2.0, w: 12.2, h: 4.5 });
  }
}

function renderLearningObjectives(slide, s, c) {
  const items = (s.learning_objectives || []).slice(0, 4);
  if (!items.length) return;
  const baseY = s.block_label ? 2.05 : 1.85;
  const cardW = (12.4 / 4) - 0.15, cardH = 2.6;
  items.forEach((o, i) => {
    const x = 0.4 + i * (cardW + 0.15);
    slide.addShape('roundRect', { x, y: baseY, w: cardW, h: cardH, fill: { color: '16263F' }, line: { color: c.GOLD, width: 0.75 }, rectRadius: 0.1 });
    slide.addText(String(o.number || (i+1).toString().padStart(2, '0')), { x: x + 0.2, y: baseY + 0.2, w: cardW - 0.4, h: 0.6, fontSize: 26, bold: true, color: c.GOLD });
    slide.addText(String(o.title || ''), { x: x + 0.2, y: baseY + 0.95, w: cardW - 0.4, h: 0.5, fontSize: 14, bold: true, color: c.WHITE });
    slide.addText(String(o.body || ''), { x: x + 0.2, y: baseY + 1.45, w: cardW - 0.4, h: 1.05, fontSize: 11, color: 'CBD5E1', valign: 'top' });
  });
}

function renderReflectionRecap(slide, s, c) {
  const items = (s.reflection_items || []).slice(0, 3);
  if (!items.length) return renderDefault(slide, s, c);
  const baseY = s.block_label ? 2.5 : 2.3;
  const cardW = (12.4 / 3) - 0.15, cardH = 2.2;
  items.forEach((it, i) => {
    const x = 0.4 + i * (cardW + 0.15);
    const accent = i === items.length - 1 ? '10B981' : c.ACCENT;
    slide.addShape('roundRect', { x, y: baseY, w: cardW, h: cardH, fill: { color: c.WHITE }, line: { color: 'CBD5E1' }, rectRadius: 0.1 });
    slide.addShape('rect', { x, y: baseY, w: cardW, h: 0.08, fill: { color: accent }, line: { color: accent } });
    slide.addShape('ellipse', { x: x + 0.25, y: baseY + 0.25, w: 0.55, h: 0.55, fill: { color: '10B981' }, line: { color: '10B981' } });
    slide.addText('✓', { x: x + 0.25, y: baseY + 0.25, w: 0.55, h: 0.55, fontSize: 22, bold: true, color: c.WHITE, align: 'center', valign: 'middle' });
    slide.addText(String(it.title || 'Aprendiste a'), { x: x + 1.0, y: baseY + 0.3, w: cardW - 1.2, h: 0.4, fontSize: 13, bold: true, color: c.GOLD, charSpacing: 2 });
    slide.addText(String(it.body || ''), { x: x + 0.25, y: baseY + 0.95, w: cardW - 0.45, h: cardH - 1.1, fontSize: 14, color: c.NAV, valign: 'top', bold: true });
  });
}

function renderTransferActivity(slide, s, c) {
  const ta = s.transfer_activity || {};
  const baseY = s.block_label ? 2.0 : 1.85;
  const cardW = 5.95, cardH = 2.6;
  slide.addShape('roundRect', { x: 0.4, y: baseY, w: cardW, h: cardH, fill: { color: c.GRAY_LIGHT }, line: { color: 'CBD5E1' }, rectRadius: 0.1 });
  slide.addShape('rect', { x: 0.4, y: baseY, w: cardW, h: 0.07, fill: { color: c.ACCENT }, line: { color: c.ACCENT } });
  slide.addText('EL RETO', { x: 0.6, y: baseY + 0.2, w: cardW - 0.4, h: 0.3, fontSize: 11, bold: true, color: c.ACCENT, charSpacing: 3 });
  slide.addText(String(ta.challenge || ''), { x: 0.6, y: baseY + 0.55, w: cardW - 0.4, h: cardH - 0.7, fontSize: 14, color: c.NAV, valign: 'top' });
  slide.addShape('roundRect', { x: 6.95, y: baseY, w: cardW, h: cardH, fill: { color: c.GRAY_LIGHT }, line: { color: 'CBD5E1' }, rectRadius: 0.1 });
  slide.addShape('rect', { x: 6.95, y: baseY, w: cardW, h: 0.07, fill: { color: '10B981' }, line: { color: '10B981' } });
  slide.addText('ENTREGABLE', { x: 7.15, y: baseY + 0.2, w: cardW - 0.4, h: 0.3, fontSize: 11, bold: true, color: '047857', charSpacing: 3 });
  if (ta.deliverable) slide.addText(String(ta.deliverable), { x: 7.15, y: baseY + 0.55, w: cardW - 0.4, h: 0.5, fontSize: 13, bold: true, color: c.NAV });
  const items = (ta.deliverable_items || []).map(t => ({ text: t, options: { bullet: { code: '25CF' }, fontSize: 12, color: c.NAV, breakLine: true, paraSpaceAfter: 6 } }));
  slide.addText(items, { x: 7.25, y: baseY + 1.1, w: cardW - 0.5, h: cardH - 1.2 });
  if (ta.rule) {
    const y = baseY + cardH + 0.25;
    slide.addShape('roundRect', { x: 0.4, y, w: 12.5, h: 0.95, rectRadius: 0.08, fill: { color: '143726' }, line: { color: '10B981', width: 1 } });
    slide.addShape('rect', { x: 0.4, y, w: 0.08, h: 0.95, fill: { color: '10B981' }, line: { color: '10B981' } });
    slide.addText(String(ta.rule), { x: 0.7, y: y + 0.12, w: 12.2, h: 0.75, fontSize: 13, color: 'EAFFF3', valign: 'middle' });
  }
}

function renderGoldbox(slide, s, c) {
  const baseY = s.block_label ? 2.0 : 1.85;
  const boxH = 1.4;
  slide.addShape('roundRect', { x: 0.4, y: baseY, w: 12.5, h: boxH, rectRadius: 0.1, fill: { color: '1C2A40' }, line: { color: c.GOLD, width: 1.5 } });
  const runs = (s.goldbox_runs || (s.bullets || []).map(b => ({ text: b }))).map(r => ({
    text: r.text, options: { bold: !!r.bold, color: r.bold ? c.GOLD : 'EAFFF3', fontSize: 18 }
  }));
  slide.addText(runs, { x: 0.7, y: baseY + 0.15, w: 12.0, h: boxH - 0.3, valign: 'middle' });
  if ((s.bullets || []).length && s.goldbox_runs) {
    const items = s.bullets.map(b => ({ text: b, options: { bullet: { code: '25CF' }, fontSize: 14, color: c.NAV, breakLine: true, paraSpaceAfter: 8 } }));
    slide.addText(items, { x: 0.6, y: baseY + boxH + 0.3, w: 12.2, h: 7 - baseY - boxH - 0.5 });
  }
}

function renderHighlight(slide, s, c) {
  const baseY = s.block_label ? 2.05 : 1.85;
  const runs = s.highlight_runs || [{ text: s.highlight_text || s.title || '' }];
  slide.addShape('roundRect', { x: 0.4, y: baseY, w: 12.5, h: 1.5, rectRadius: 0.1, fill: { color: '143726' }, line: { color: '10B981', width: 1.25 } });
  slide.addShape('rect', { x: 0.4, y: baseY, w: 0.1, h: 1.5, fill: { color: '10B981' }, line: { color: '10B981' } });
  const rich = runs.map(r => ({ text: r.text, options: { bold: !!r.bold, color: r.bold ? c.GOLD : 'EAFFF3', fontSize: 17 } }));
  slide.addText(rich, { x: 0.75, y: baseY + 0.15, w: 12.0, h: 1.2, valign: 'middle', lineSpacingMultiple: 1.15 });
}

// =============================================================================
// PPT 1 · CLASE 1 — TU RUTA DE 90 DÍAS (Onboarding al programa)
// =============================================================================
const PPT_1 = {
  title: 'Clase 1 · Tu Ruta de 90 días',
  brand: 'FLIPMENTORÍA',
  slides: [
    { layout: 'cover', title: 'Tu Ruta de 90 días',
      subtitle: 'De la intención a tu primer deal estructurado',
      metric_cards: [
        { value: '6', label: 'Etapas (E0-E5)' },
        { value: '78', label: 'Tareas guiadas' },
        { value: '90', label: 'Días al primer deal' }
      ],
      speaker_notes: 'Bienvenida cálida. Pregunta retórica: ¿cuánto de lo que has aprendido en internet sobre fix & flip te ha llevado a un deal real? Casi siempre la respuesta es "poco". Este programa es diferente: no es teoría, es ejecución guiada paso a paso durante 90 días.'
    },
    { layout: 'goldbox', title: 'La diferencia entre los que cierran su primer deal y los que no…',
      goldbox_runs: [
        { text: 'No es ', bold: false },
        { text: 'conocimiento', bold: true },
        { text: ' — es ', bold: false },
        { text: 'ejecución guiada con criterio.', bold: true }
      ],
      speaker_notes: 'El 80% de quienes intentan invertir en bienes raíces nunca cierran su primer deal. El otro 20% sigue un proceso. Nosotros te damos ese proceso. No te enseñamos qué pensar; te enseñamos qué hacer cuando estás solo frente a tu pantalla un martes a las 9 PM con una propiedad que parece "una ganga".'
    },
    { layout: 'learning-objectives', title: 'Al terminar esta clase vas a…',
      learning_objectives: [
        { number: '01', title: 'Conocer el mapa', body: 'Entender las 6 etapas E0-E5 y por qué van en ese orden estricto.' },
        { number: '02', title: 'Ver tu rol', body: 'No eres "alguien que invierte" — eres operador de un negocio con cronograma.' },
        { number: '03', title: 'Calibrar tiempos', body: 'Cuántas horas por semana, qué semana hace qué, dónde quedan los hitos.' },
        { number: '04', title: 'Empezar HOY', body: 'Salir con tu Quick Win de semana 1 ya identificado y con fecha.' }
      ],
      speaker_notes: 'Estos son los 4 anclajes pedagógicos. Léelos al inicio y vuelve a ellos al final.'
    },
    { layout: 'agenda', title: 'Las 6 etapas del programa',
      agenda_steps: [
        { step: 'E0 Fundación',  label: 'Legal · Mentalidad · Stack' },
        { step: 'E1 Evaluar',    label: 'Buy Box · ARV · MAO' },
        { step: 'E2 Estructurar', label: 'Dinero · Red · Equipo' },
        { step: 'E3 Ejecutar',   label: 'Compra · Obra · Calidad' },
        { step: 'E4 Salida',     label: 'Vender · Rentar' },
        { step: 'E5 Escalar',    label: 'Sistemas · Multi-deal' }
      ],
      speaker_notes: 'Nadie empieza comprando. Empiezas construyendo el negocio (E0). Luego aprendes a mirar (E1). Luego consigues dinero y equipo (E2). Recién entonces compras (E3). El orden importa porque si te saltas pasos, pierdes dinero real.'
    },
    { layout: 'comparison', title: 'Lo que NO es esta mentoría vs. lo que SÍ es',
      comparison: {
        left: { title: 'Lo que NO es', items: [
          'Cursos genéricos que escuchas y olvidas',
          'Comunidades donde nadie cierra deals',
          'Gurús vendiéndote el "secret"',
          '"Invertir desde el celular en 5 minutos"',
          'Una promesa de hacerte rico rápido'
        ] },
        right: { title: 'Lo que SÍ es', items: [
          'Ruta operativa de 90 días con entregables',
          'Soporte 1-1 cuando te atascas',
          'Sistema con biblioteca de tareas y contactos',
          'Acompañamiento hasta tu primer deal cerrado',
          'Construcción de criterio, no atajos'
        ] }
      },
      speaker_notes: 'Sé honesto sobre lo que ESTO no es. Eso elimina expectativas equivocadas y atrae al estudiante correcto.'
    },
    { layout: 'metrics-dashboard', title: 'Cómo se ven los números si haces el trabajo',
      metric_cards: [
        { label: 'Capital típico para empezar', value: '$30-50K', trend: 'puede ser HML + socio' },
        { label: 'Margen objetivo por deal',    value: '18-25%', trend: 'sobre ARV' },
        { label: 'Tiempo del primer flip',      value: '4-6 meses', trend: 'incluyendo cierre' },
        { label: 'ROI sobre capital propio',    value: '25-40%', trend: 'apalancando bien' }
      ],
      speaker_notes: 'Estos números NO son promesas. Son rangos típicos cuando el estudiante sigue el sistema. Si alguien promete más, miente. Si alguien promete menos, no ha cerrado deals reales.'
    },
    { layout: 'framework', title: 'La fórmula que vamos a internalizar',
      framework_items: [
        { label: 'ARV (After Repair Value)', value: 'Lo que vale arreglada' },
        { label: '× 75% (Regla)',            value: 'Margen + costos' },
        { label: '− Remodelación',            value: 'Estimado conservador' },
        { label: '− Costos de cierre',        value: '~3-5% del precio' },
        { label: '= MAO (Max Allowable Offer)', value: 'Lo MÁXIMO que ofreces' },
        { label: 'Si te piden más → descartas', value: 'Sin negociación emocional' }
      ],
      speaker_notes: 'Esta fórmula te va a salvar la inversión. Cuando estés en una visita y la casa te enamora, repite: ARV × 75% − Remodelación − Cierre. Si el precio queda arriba, no es deal.'
    },
    { layout: 'checklist', title: 'Tu Semana 1 — qué entregas',
      checklist_items: [
        { title: 'Conocer el camino completo',         detail: 'Ver todas las etapas, no solo la siguiente' },
        { title: 'Configurar Taskade + Fliptrack',     detail: 'Tu portal personal del programa' },
        { title: 'Definir Big Why por escrito',        detail: 'Por qué quieres este negocio, frase específica' },
        { title: 'Bloquear 5 horas/semana en tu agenda', detail: 'No-negociable. Mismas horas, mismo lugar' },
        { title: 'Identificar tu Quick Win',           detail: 'Una victoria pequeña visible en 7 días' },
        { title: 'Subir tu primer entregable al sistema', detail: 'Aunque sea imperfecto. Submit > polish' }
      ],
      speaker_notes: 'Semana 1 NO es comprar. Es ordenar. Quienes saltan este orden, después se atascan en E2 sin estructura.'
    },
    { layout: 'highlight', title: 'La trampa que ya conoces',
      highlight_runs: [
        { text: 'No te atasques en "investigar más". Investigar más sin actuar es ', bold: false },
        { text: 'procrastinación disfrazada de aprendizaje.', bold: true }
      ],
      speaker_notes: 'Reconoce esto en voz alta porque MUCHOS estudiantes se quedan en esta trampa. Si llevas 6 meses leyendo y no has hecho UN drive-through a un ZIP code, no eres "más informado", estás bloqueado.'
    },
    { layout: 'transfer-activity', title: 'Tu primer Quick Win — antes de la próxima clase',
      transfer_activity: {
        challenge: 'Identifica 3 ZIP codes donde TE GUSTARÍA invertir y manéjate físicamente por uno de ellos esta semana. No analices nada todavía — solo mira. Toma 10 fotos.',
        deliverable: 'Entrega un mini-reporte (3 párrafos + 10 fotos)',
        deliverable_items: [
          '¿Qué notaste de las casas? (cuidadas, abandonadas, en obra)',
          '¿Quién camina por ahí? (familias, jóvenes, ancianos)',
          'Tu hipótesis: ¿es zona A, B o C? ¿por qué?'
        ],
        rule: 'Mejor un Quick Win imperfecto que la perfecta tarea que nunca entregas.'
      },
      speaker_notes: 'Esta es la primera transferencia: pasas de escuchar a actuar. El Quick Win NO es un análisis sofisticado — es entrenar tu ojo. Después en E1 lo vamos a sistematizar.'
    },
    { layout: 'reflection-recap', title: 'Lo que te llevas de hoy',
      reflection_items: [
        { title: 'Aprendiste a', body: 'Ver el negocio como 6 etapas con orden estricto, no como "buscar casas baratas"' },
        { title: 'Aprendiste que', body: 'El primer deal toma 90 días si sigues el sistema y construyes la base primero' },
        { title: 'Te comprometes a', body: 'Hacer tu drive-through esta semana y subir el reporte al sistema' }
      ],
      speaker_notes: 'Cierre pedagógico: hace memoria explícita de lo aprendido. Esto ancla el contenido en memoria de largo plazo.'
    },
    { layout: 'closing', title: 'Nos vemos en la Clase 2 — empezamos a construir tu negocio',
      quote_text: 'No empiezas comprando una casa. Empiezas siendo inversionista.',
      quote_author: 'FlipMentoría',
      metric_cards: [
        { value: 'E0', label: 'Estás aquí' },
        { value: '7', label: 'Días para tu Quick Win' },
        { value: '90', label: 'Días al primer deal' }
      ],
      speaker_notes: 'Cierra con energía. Confirma fecha y hora exacta de la próxima clase. Recuerda subir el Quick Win.'
    }
  ]
};

// =============================================================================
// PPT 2 · CLASE TÉCNICA — E1 EVALUAR: BUY BOX, ARV y MAO EN LA PRÁCTICA
// =============================================================================
const PPT_2 = {
  title: 'E1 Evaluar · Buy Box, ARV y MAO',
  brand: 'FLIPMENTORÍA',
  slides: [
    { layout: 'cover', title: 'E1 · Evaluar',
      subtitle: 'Cómo mirar números antes de enamorarte de una casa',
      metric_cards: [
        { value: '5', label: 'ZIP codes a calificar' },
        { value: '10', label: 'Comparables por casa' },
        { value: '75%', label: 'La regla maestra' }
      ],
      speaker_notes: 'Esta es la clase técnica más importante del programa. Si la dominas, tu primer deal será rentable. Si no, te enamorarás de la primera "ganga" y perderás dinero.'
    },
    { layout: 'goldbox', title: 'La premisa central de esta clase',
      goldbox_runs: [
        { text: 'El dinero no se gana ', bold: false },
        { text: 'remodelando bien', bold: true },
        { text: ' — se gana ', bold: false },
        { text: 'comprando bien', bold: true },
        { text: '. Esta clase te enseña a comprar bien.', bold: false }
      ],
      speaker_notes: 'Repite esto al menos 3 veces durante la clase. Es el principio operativo más importante. La obra es ejecución; el deal se decide en la oferta.'
    },
    { layout: 'learning-objectives', title: 'Al terminar vas a saber…',
      learning_objectives: [
        { number: '01', title: 'Buy Box',  body: 'Las reglas exactas de qué casa SÍ y qué casa NO compras.' },
        { number: '02', title: 'ZIPs A/B/C', body: 'Calificar zonas en 5 variables objetivas, sin emoción.' },
        { number: '03', title: 'ARV',       body: 'Estimar el valor after-repair con 10 comparables.' },
        { number: '04', title: 'MAO',       body: 'Calcular tu Max Allowable Offer aplicando la Regla del 75%.' }
      ]
    },
    { layout: 'framework', title: 'Tu Buy Box — las 10 variables que defines',
      framework_items: [
        { label: 'Estrategia primaria',         value: 'Flip o Rent' },
        { label: 'Tipo de propiedad',           value: 'SFR / Multi / Condo' },
        { label: 'Sub-mercado (ZIP codes)',     value: '5 prioritarios' },
        { label: 'Año de construcción mínimo',  value: '> 1960' },
        { label: 'Tamaño habitable mínimo',     value: '≥ 1,000 sqft' },
        { label: 'Habitaciones mínimas',        value: '3 BR / 2 BA' },
        { label: 'Rango de precio (compra)',    value: '$50K–$220K' },
        { label: 'Rango de remodel toleración', value: '$15K–$60K' },
        { label: 'Margen mínimo objetivo',      value: '≥ 18%' },
        { label: 'Red flags inmediatas',        value: 'Lista de 20' }
      ],
      speaker_notes: 'El Buy Box es el filtro que te separa de las 1,000 casas que ves al mes. Sin él, te disperses; con él, conviertes 1,000 vistas en 30 análisis y 3 ofertas.'
    },
    { layout: 'checklist', title: 'Cómo calificas un ZIP code en 5 variables',
      checklist_items: [
        { title: '1. Days on Market promedio', detail: 'A: <30 días · B: 30-60 · C: >60. Más rápido = más líquido' },
        { title: '2. Apreciación 12 meses',    detail: 'A: >5% · B: 2-5% · C: <2% o negativa' },
        { title: '3. Sale-to-list price ratio', detail: 'A: ≥98% · B: 92-98% · C: <92%' },
        { title: '4. Inventario activo',        detail: 'A: <2 meses · B: 2-4 · C: >4 (mercado de comprador)' },
        { title: '5. Drive-through cualitativo', detail: 'Casas cuidadas, sin abandono, escuelas decentes' }
      ],
      speaker_notes: 'Estas 5 son objetivas y baratas de calcular. Cualquier estudiante puede sacarlas de Zillow + Redfin en 30 minutos por ZIP. Te dan una calificación A/B/C que evita 80% de los malos deals.'
    },
    { layout: 'case-study', title: 'Caso real · Austin · Round Rock TX',
      case_study: {
        name: '512 Maple Dr', location: 'Round Rock, TX 78664',
        estrategia: 'Fix & Flip · ZIP A',
        compra: 178000, remodelacion: 38000, arv: 295000, ganancia: 41200,
        duracion_meses: 5, roi: '23',
        key_takeaway: 'La ganancia salió en el momento de hacer la oferta, no en la obra. Quien pagó $195K (el segundo postor) sale empatado.'
      },
      speaker_notes: 'Pasa por cada KPI lento. Pregunta a los estudiantes: ¿en qué momento se hizo la ganancia? Respuesta: en la oferta de $178K, no en la remodelación bien hecha. La obra fue solo no perder lo ganado.'
    },
    { layout: 'framework', title: 'La fórmula MAO — paso a paso',
      framework_items: [
        { label: 'ARV ($295,000 estimado)',     value: '$295,000' },
        { label: '× 0.75 (Regla)',              value: '$221,250' },
        { label: '− Remodelación ($38,000)',    value: '$183,250' },
        { label: '− Cierre/Holding (4% = $11,800)', value: '$171,450' },
        { label: '= MAO (lo MÁXIMO a ofrecer)', value: '$171,450' },
        { label: 'Oferta real ofrecida',        value: '$165,000' }
      ],
      speaker_notes: 'La regla del 75% no es arbitraria: 25% cubre 18% de margen objetivo + 7% de fricción real (errores, sobrecostos, comisión venta). Si compras a precio MAO o por debajo, llegas con margen incluso si la obra se descontrola.'
    },
    { layout: 'comparison', title: 'Análisis racional vs. compra emocional',
      comparison: {
        left: { title: 'Compra emocional (típica)', items: [
          '"Me encantó la cocina"',
          '"Es la más bonita del vecindario"',
          '"La conseguí $5K abajo del listado"',
          '"Voy a hacerle un upgrade que la dispare"',
          '"Sé que voy a sacar buena ganancia"'
        ] },
        right: { title: 'Análisis racional (Buy Box)', items: [
          'ARV: $295K basado en 10 comps recientes',
          'Remodel: $38K con SOW detallado',
          'MAO: $171K (no $185K que pide)',
          'Oferta: $165K. Si la rechazan, descarto',
          'Si la aceptan, margen 23% protegido'
        ] }
      }
    },
    { layout: 'metrics-dashboard', title: 'Tus números mínimos por mes en E1',
      metric_cards: [
        { label: 'ZIPs analizados',       value: '5',  trend: 'el 1er mes' },
        { label: 'Casas vistas online',   value: '~150',  trend: 'descarte rápido' },
        { label: 'Análisis ARV/MAO',      value: '20',    trend: 'tu Buy Box' },
        { label: 'Ofertas formales',      value: '10',    trend: 'al menos' }
      ],
      speaker_notes: 'Los números son críticos. Si haces solo 1-2 ofertas/mes, no cierras deal en 90 días. Volumen de ofertas = probabilidad de deal.'
    },
    { layout: 'highlight', title: 'La regla de hierro de E1',
      highlight_runs: [
        { text: 'Si la casa no pasa el ', bold: false },
        { text: 'MAO', bold: true },
        { text: ', no se ofrece — ', bold: false },
        { text: 'no importa qué bonita esté.', bold: true }
      ],
      speaker_notes: 'Esta regla te va a doler la primera vez que descartas una casa que "te gustaba". Pero te va a salvar la inversión.'
    },
    { layout: 'transfer-activity', title: 'Tu ejercicio antes de E2',
      transfer_activity: {
        challenge: 'Toma una casa REAL que esté en venta en tu mejor ZIP code. Investiga 10 comparables vendidas en los últimos 90 días. Calcula ARV (conservador y optimista). Estima remodel con tu lista. Calcula MAO.',
        deliverable: 'Sube al sistema un análisis estructurado',
        deliverable_items: [
          'URL de la propiedad + screenshot',
          'Lista de 10 comparables con $/sqft',
          'ARV conservador y optimista',
          'Remodel estimado por niveles',
          'MAO + diferencia con precio pedido'
        ],
        rule: 'Si la diferencia entre precio pedido y MAO es mayor a 5%, esta casa NO se ofrece — se aprende, no se compra.'
      }
    },
    { layout: 'reflection-recap', title: 'Lo que te llevas',
      reflection_items: [
        { title: 'Aprendiste a', body: 'Calificar ZIPs en 5 variables objetivas — sin opinión personal' },
        { title: 'Aprendiste a', body: 'Calcular MAO con la regla del 75% — fórmula no negociable' },
        { title: 'Te comprometes a', body: 'Hacer 1 análisis ARV/MAO completo de una casa real esta semana' }
      ]
    },
    { layout: 'closing', title: 'En E2 conseguimos el dinero',
      quote_text: 'Comprar bien no es suerte. Es proceso ejecutado bajo presión sin cambiar las reglas.',
      quote_author: 'FlipMentoría · Clase E1',
      metric_cards: [
        { value: 'E1', label: 'Estás aquí' },
        { value: '75%', label: 'Regla maestra' },
        { value: '10', label: 'Ofertas/mes objetivo' }
      ]
    }
  ]
};

// =============================================================================
// PPT 3 · CLASE TÉCNICA — E2 ESTRUCTURAR: HARD MONEY + WHOLESALERS
// =============================================================================
const PPT_3 = {
  title: 'E2 Estructurar · Hard Money, Wholesalers y Equipo',
  brand: 'FLIPMENTORÍA',
  slides: [
    { layout: 'cover', title: 'E2 · Estructurar',
      subtitle: 'Cómo armar tu red de dinero, deals y obra antes de comprar',
      metric_cards: [
        { value: '10', label: 'HMLs a entrevistar' },
        { value: '20', label: 'Wholesalers en tu red' },
        { value: '10', label: 'GCs verificados' }
      ]
    },
    { layout: 'goldbox', title: 'La verdad sobre el dinero en bienes raíces',
      goldbox_runs: [
        { text: 'No es ', bold: false },
        { text: 'tu dinero', bold: true },
        { text: ' el que compra la casa. Es el ', bold: false },
        { text: 'dinero de otra gente que confía en tu sistema.', bold: true }
      ],
      speaker_notes: 'Esto cambia el chip. La pregunta no es "¿cuánto tengo yo?", es "¿cuánta gente confía en mi sistema lo suficiente como para prestarme?" El primer deal se hace con $20K propio + $200K prestado.'
    },
    { layout: 'learning-objectives', title: 'Al terminar dominas…',
      learning_objectives: [
        { number: '01', title: 'Hard Money', body: 'Cómo entrevistar HMLs, comparar term sheets, elegir primario + backup.' },
        { number: '02', title: 'Wholesalers', body: 'Dónde encontrar mayoristas activos y cómo entrar a sus buyer lists.' },
        { number: '03', title: 'Contratistas', body: 'Cómo identificar 10 GCs, verificar licencias y pedir bids comparables.' },
        { number: '04', title: 'Red propia',  body: 'Sistemas de eventos, follow-up y construcción de relación a largo plazo.' }
      ]
    },
    { layout: 'agenda', title: 'Las 3 fuentes de financiación que conocerás',
      agenda_steps: [
        { step: 'Hard Money Lenders',    label: 'Para compra + remodel · Rápido · ~10-12%' },
        { step: 'Private Money / Socios', label: 'Familia, amigos, inversionistas pasivos' },
        { step: 'HELOC vivienda',        label: 'Tu casa principal como colateral · Barato' }
      ]
    },
    { layout: 'strategy-grid', title: 'Comparativa de las 3 fuentes',
      strategy_options: [
        { name: 'Hard Money',   cash_flow: '$0 down posible', scalability: '10-12%', operation: '7-15 días', ideal_for: 'Tu primer deal · Velocidad sobre todo' },
        { name: 'Private Money', cash_flow: 'Variable',       scalability: '6-10%',  operation: '15-30 días', ideal_for: 'Quienes ya tienen track record' },
        { name: 'HELOC',         cash_flow: '~$50K límite',   scalability: '7-9%',   operation: '30-60 días', ideal_for: 'Quien tiene equity en su casa principal' }
      ],
      speaker_notes: 'No hay una mejor que las otras. Hay una que cuadra a tu situación. Casi todos los estudiantes empiezan con HML porque es la más rápida y no exige track record.'
    },
    { layout: 'framework', title: 'Las 10 preguntas que le haces a cada HML',
      framework_items: [
        { label: '1. Tasa de interés',           value: '%/año' },
        { label: '2. Puntos al cierre',          value: '% del préstamo' },
        { label: '3. % de compra que financia',  value: '70%–85%' },
        { label: '4. ¿Financia remodel?',         value: 'Sí/no · ¿Cómo?' },
        { label: '5. Velocidad de cierre',       value: 'Días desde aplicación' },
        { label: '6. Mínimo de credit score',    value: '660+ típicamente' },
        { label: '7. ¿Pide tasación independiente?', value: 'Sí/no' },
        { label: '8. ¿Pre-pago penalizado?',     value: 'Sí/no' },
        { label: '9. ¿Reservas de cash exigidas?', value: '0 / 3 / 6 meses' },
        { label: '10. ¿Construction draws?',      value: 'Sí/cuántos' }
      ],
      speaker_notes: 'Esta es tu lista de chequeo. Llama 10 HMLs y haz exactamente estas preguntas. Vas a ver que las tasas son similares (10-12%), pero la diferencia está en velocidad y flexibilidad de remodel. Esa diferencia te ahorra deals.'
    },
    { layout: 'metrics-dashboard', title: 'Números de Hard Money típicos en EE.UU. 2026',
      metric_cards: [
        { label: 'Tasa promedio HML',     value: '10.5%', trend: 'rango 9-13%' },
        { label: 'Puntos al cierre',      value: '2.5pts',trend: 'rango 1-4 pts' },
        { label: '% compra financiada',   value: '80%',   trend: 'down 20% típico' },
        { label: 'Velocidad de cierre',   value: '10 días', trend: 'puede ser 5-30' }
      ],
      speaker_notes: 'Estos son rangos típicos. El número exacto importa menos que el TOTAL: tasa + puntos + términos = costo total del dinero. Suma todo antes de comparar.'
    },
    { layout: 'checklist', title: 'Cómo armas tu red de Wholesalers',
      checklist_items: [
        { title: 'Identifica 20 wholesalers activos en tu mercado', detail: 'Búsqueda en Facebook groups, REIAs, BiggerPockets' },
        { title: 'Suscríbete a sus buyer lists',                    detail: 'Por email — deals llegan a tu inbox' },
        { title: 'Preséntate con tu Buy Box corto',                 detail: '1 página: zona, tipo, precio, criterios' },
        { title: 'Asiste físicamente a 5 eventos REIA / mes',       detail: 'La presencia construye confianza' },
        { title: 'Follow-up activo dentro de 48hs',                 detail: 'Mensaje personal después de cada contacto' },
        { title: 'Análisis express de cada deal entrante',           detail: 'Respuesta en <2 horas con SÍ/NO + razón' }
      ]
    },
    { layout: 'case-study', title: 'Caso real · Cómo Mariana cerró su deal en Houston',
      case_study: {
        name: 'Caso M.G.', location: 'Spring, TX',
        estrategia: 'Wholesale → Flip · 1er deal',
        compra: 148000, remodelacion: 32000, arv: 252000, ganancia: 35400,
        duracion_meses: 4, roi: '24',
        key_takeaway: 'Su HML cerró en 8 días. Su wholesaler le mandó el deal antes de que llegara al MLS. Sin la red, no había deal — había una casa cara en Zillow.'
      },
      speaker_notes: 'Mariana no era especial: hizo el trabajo de E2 por 30 días, contactó 18 wholesalers, fue a 4 REIAs. Su 5to deal off-market recibido fue el bueno. Sin red, sin deal.'
    },
    { layout: 'framework', title: 'Cómo verificas que un GC no te vaya a estafar',
      framework_items: [
        { label: 'Licencia activa',              value: 'Verificar en portal del estado' },
        { label: 'Seguro de responsabilidad',    value: '≥$1M de cobertura GL' },
        { label: 'Workers Comp',                 value: 'Activo y vigente' },
        { label: '3 referencias verificables',   value: 'Llamadas, no mensajes' },
        { label: 'Visita a obra activa',         value: 'Ver cómo trabaja en vivo' },
        { label: 'Bid escrito detallado',        value: 'Línea por línea, no globo' },
        { label: 'BBB rating / Google reviews',  value: '≥4 estrellas, 20+ reseñas' },
        { label: 'Contrato AIA o equivalente',   value: 'Nada de "confiamos en la palabra"' }
      ],
      speaker_notes: 'El 80% de los problemas en obra son por GC mal elegido. Si saltas esta verificación, vas a pagar el doble: en sobrecosto y en estrés.'
    },
    { layout: 'highlight', title: 'La regla que vas a memorizar',
      highlight_runs: [
        { text: 'Antes de comprar tu primera casa necesitas tener ', bold: false },
        { text: '2 HMLs aprobados, 5 wholesalers en buyer list y 3 GCs verificados', bold: true },
        { text: '. No improvises ninguna pieza.', bold: false }
      ],
      speaker_notes: 'Cuando aparezca el deal bueno, no tienes 2 semanas para conseguir HML. Tienes 24-48 horas para decir "sí". Por eso E2 va antes que E3.'
    },
    { layout: 'transfer-activity', title: 'Tu ejercicio de la semana',
      transfer_activity: {
        challenge: 'Hace 10 llamadas a HMLs en tu mercado usando la lista de 10 preguntas. Identifica 20 wholesalers activos, suscribite a sus listas, asiste a 1 REIA presencial.',
        deliverable: 'Sube al sistema',
        deliverable_items: [
          '10 term sheets (o resumen de cada llamada)',
          'Tu HML primario elegido + razón',
          'Tu HML backup + razón',
          'Lista de 20 wholesalers contactados',
          'Foto del REIA donde estuviste'
        ],
        rule: 'Sin 2 HMLs aprobados + buyer list activa, NO se puede pasar a E3.'
      }
    },
    { layout: 'reflection-recap', title: 'Lo que te llevas',
      reflection_items: [
        { title: 'Aprendiste a', body: 'Comparar HMLs en 10 dimensiones — no solo tasa' },
        { title: 'Aprendiste a', body: 'Construir red de wholesalers sistemáticamente' },
        { title: 'Te comprometes a', body: 'Tener 2 HMLs aprobados y 5 wholesalers en lista en 2 semanas' }
      ]
    },
    { layout: 'closing', title: 'En E3 ya compramos la casa',
      quote_text: 'Los deals los gana quien tiene la red lista cuando el deal aparece, no quien la arma cuando ya pasó.',
      quote_author: 'FlipMentoría · Clase E2',
      metric_cards: [
        { value: '2', label: 'HMLs primarios' },
        { value: '20', label: 'Wholesalers contacto' },
        { value: '10', label: 'GCs verificados' }
      ]
    }
  ]
};

// =============================================================================
// EJECUTAR
// =============================================================================
async function main() {
  await Promise.all([
    new Promise(res => { buildPPTX(PPT_1, 'PPT-1_Clase1_Ruta_90_dias.pptx'); setTimeout(res, 2000); }),
    new Promise(res => { buildPPTX(PPT_2, 'PPT-2_E1_Buy_Box_ARV_MAO.pptx'); setTimeout(res, 2000); }),
    new Promise(res => { buildPPTX(PPT_3, 'PPT-3_E2_Hard_Money_Wholesalers.pptx'); setTimeout(res, 2000); })
  ]);
  console.log('✓ 3 PPTs generadas');
}
main();
