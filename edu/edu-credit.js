// ════════════════════════════════════════════════════════════
// 💳 Diagnóstico de crédito (extraído de education.js)
// Depende de: fmState (definido en education.js), eduState,
// fmGetStudentsForDiag, fmRender, openModal, sb, state, escapeHtml
// ════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════
// 💳 DIAGNÓSTICO DE CRÉDITO — wizard 16 preguntas → plan 90 días
// Tabla: edu_credit_diagnostics + edu_credit_plan_tasks
// ════════════════════════════════════════════════════════════

const FM_CREDIT_QUESTIONS = [
  // ── BLOQUE A · Score actual ───────────────────────────
  { id:'fico_band', bloque:'A · FICO',
    pregunta:'¿En qué rango está tu FICO score actual?',
    opciones:[
      { val:'sin_historial', label:'Sin historial crediticio en USA (ITIN o reciente)' },
      { val:'menos_580',     label:'< 580 — pobre, reconstruir' },
      { val:'580_619',       label:'580-619 — bajo, sub-prime' },
      { val:'620_659',       label:'620-659 — justo' },
      { val:'660_699',       label:'660-699 — bueno' },
      { val:'700_739',       label:'700-739 — muy bueno' },
      { val:'740_779',       label:'740-779 — excelente' },
      { val:'mas_780',       label:'≥ 780 — top tier' }
    ] },
  { id:'fico_exacto', bloque:'A · FICO',
    pregunta:'Si lo conocés exacto, escribilo (opcional)',
    tipo:'number', placeholder:'Ej. 712' },
  { id:'monitoring', bloque:'A · FICO',
    pregunta:'¿Estás monitoreando tu crédito hoy?',
    opciones:[
      { val:'experian',  label:'Sí, con Experian/MyFICO (pago)' },
      { val:'gratis',    label:'Sí, con Credit Karma / Capital One / Chase (gratis)' },
      { val:'nada',      label:'No tengo monitoreo activo' }
    ] },

  // ── BLOQUE B · Antigüedad e historial ─────────────────
  { id:'antiguedad', bloque:'B · Historial',
    pregunta:'¿Cuántos años tiene tu cuenta de crédito MÁS ANTIGUA en USA?',
    opciones:[
      { val:'menos_1',  label:'< 1 año (cuenta nueva)' },
      { val:'1_2',      label:'1-2 años' },
      { val:'3_5',      label:'3-5 años' },
      { val:'6_10',     label:'6-10 años' },
      { val:'mas_10',   label:'> 10 años (historial largo)' }
    ] },
  { id:'cuentas_activas', bloque:'B · Historial',
    pregunta:'¿Cuántas tarjetas de crédito activas tenés HOY?',
    opciones:[
      { val:'0',     label:'0 tarjetas — necesitás abrir' },
      { val:'1',     label:'1 tarjeta' },
      { val:'2_3',   label:'2-3 tarjetas' },
      { val:'4_6',   label:'4-6 tarjetas (mix saludable)' },
      { val:'mas_6', label:'7+ tarjetas (alto)' }
    ] },
  { id:'mix_credito', bloque:'B · Historial',
    pregunta:'Además de tarjetas, ¿qué otros tipos de crédito tenés?',
    multiSelect:true,
    opciones:[
      { val:'auto',       label:'🚗 Auto loan' },
      { val:'student',    label:'🎓 Student loan' },
      { val:'mortgage',   label:'🏠 Hipoteca (mortgage)' },
      { val:'personal',   label:'💵 Personal loan' },
      { val:'business',   label:'🏢 Business credit / línea' },
      { val:'ninguno',    label:'Ninguno — solo tarjetas' }
    ] },

  // ── BLOQUE C · Utilization ────────────────────────────
  { id:'utilization', bloque:'C · Uso',
    pregunta:'¿Qué % de tu límite total estás usando hoy (suma balances ÷ suma límites)?',
    opciones:[
      { val:'menos_10',  label:'< 10% — óptimo' },
      { val:'10_29',     label:'10-29% — bueno' },
      { val:'30_49',     label:'30-49% — sube tu score si bajás' },
      { val:'50_74',     label:'50-74% — alto, te penaliza' },
      { val:'mas_75',    label:'≥ 75% — crítico, pagá YA' },
      { val:'no_se',     label:'No sé' }
    ] },
  { id:'limite_total', bloque:'C · Uso',
    pregunta:'¿Cuál es el LÍMITE total combinado de todas tus tarjetas? (USD)',
    tipo:'number', placeholder:'Ej. 25000' },
  { id:'balance_total', bloque:'C · Uso',
    pregunta:'¿Cuál es el BALANCE actual combinado (deuda en tarjetas)? (USD)',
    tipo:'number', placeholder:'Ej. 7500' },

  // ── BLOQUE D · Derogatorios / negativos ───────────────
  { id:'pagos_tarde', bloque:'D · Negativos',
    pregunta:'¿Tuviste pagos atrasados (30+ días) en los últimos 24 meses?',
    opciones:[
      { val:'cero',    label:'Cero — siempre pago a tiempo' },
      { val:'1',       label:'1 pago tarde' },
      { val:'2_3',     label:'2-3 pagos tarde' },
      { val:'mas_3',   label:'4+ pagos tarde' }
    ] },
  { id:'derogatorios', bloque:'D · Negativos',
    pregunta:'¿Tenés alguno de estos derogatorios actualmente en tu reporte?',
    multiSelect:true,
    opciones:[
      { val:'collection',  label:'🚨 Cuenta en colección (collection)' },
      { val:'charge_off',  label:'🚨 Charge-off' },
      { val:'judgment',    label:'⚖️ Judgment / lien' },
      { val:'bankruptcy',  label:'💥 Bankruptcy (Cap 7 o 13)' },
      { val:'foreclosure', label:'🏚️ Foreclosure / short sale' },
      { val:'ninguno',     label:'✅ Ninguno' }
    ] },
  { id:'collection_amount', bloque:'D · Negativos',
    pregunta:'Si tenés cuentas en colección, ¿monto total de TODAS las collections activas? (USD)',
    tipo:'number', placeholder:'Ej. 3500 — 0 si no tenés' },
  { id:'consultas', bloque:'D · Negativos',
    pregunta:'¿Cuántas hard inquiries (consultas duras) tenés en los últimos 12 meses?',
    opciones:[
      { val:'0_2',    label:'0-2 — normal' },
      { val:'3_5',    label:'3-5 — medio' },
      { val:'mas_6',  label:'6+ — alto, evitá nuevas aplicaciones' }
    ] },

  // ── BLOQUE E · Ingresos y DTI ─────────────────────────
  { id:'ingreso_mensual', bloque:'E · Ingresos',
    pregunta:'¿Tu ingreso BRUTO mensual aproximado? (USD)',
    tipo:'number', placeholder:'Ej. 8500' },
  { id:'documentado', bloque:'E · Ingresos',
    pregunta:'¿Tu ingreso es DOCUMENTABLE para lenders (W-2 / 1099 / tax returns)?',
    opciones:[
      { val:'w2',         label:'✅ W-2 — empleado formal' },
      { val:'1099_2y',    label:'✅ 1099 con 2+ años tax returns' },
      { val:'1099_1y',    label:'⚠️ 1099 con menos de 2 años' },
      { val:'bank_only',  label:'⚠️ Solo bank statements (no tax returns)' },
      { val:'cash',       label:'❌ Mayormente efectivo / sin docs' }
    ] },
  { id:'dti', bloque:'E · Ingresos',
    pregunta:'¿Qué porcentaje de tu ingreso mensual se va en pagos de deuda (renta/hipoteca + tarjetas + autos)?',
    opciones:[
      { val:'menos_28',  label:'< 28% — saludable' },
      { val:'28_36',     label:'28-36% — aceptable' },
      { val:'37_43',     label:'37-43% — límite' },
      { val:'mas_43',    label:'> 43% — DQM (lender lo verá mal)' }
    ] },

  // ── BLOQUE F · Inmigración / setup ────────────────────
  { id:'inmigracion', bloque:'F · Setup',
    pregunta:'¿Cuál es tu status migratorio?',
    opciones:[
      { val:'ciudadano',  label:'🇺🇸 Ciudadano' },
      { val:'residente',  label:'🟢 Residente permanente (Green Card)' },
      { val:'work_visa',  label:'📄 Visa de trabajo (H1B/L1/E2)' },
      { val:'itin',       label:'🆔 ITIN (sin SSN)' },
      { val:'sin_status', label:'❓ Sin status definido' }
    ] },
  { id:'meta_uso', bloque:'F · Setup',
    pregunta:'¿Para qué necesitás el crédito en los próximos 6 meses?',
    opciones:[
      { val:'hml',         label:'💰 Hard Money Lender para flips' },
      { val:'mortgage',    label:'🏠 Mortgage convencional (Fix & Hold)' },
      { val:'dscr',        label:'📊 DSCR loan (rental)' },
      { val:'heloc',       label:'🏚️ HELOC sobre vivienda' },
      { val:'business',    label:'🏢 Business credit / líneas' },
      { val:'mejorar',     label:'📈 Solo mejorar score (sin meta inmediata)' }
    ] }
];

// ─── Estado del wizard de crédito (independiente del de FM) ───
fmState.credit = fmState.credit || {
  studentId: null,
  studentSearch: '',
  answers: {},
  step: 0,
  result: null,   // {perfil, plan, fico_meta, ...}
  saving: false
};

function fmCreditReset() {
  fmState.credit = { studentId:null, studentSearch:'', answers:{}, step:0, result:null, saving:false };
  fmRender();
}

function fmCreditSelectStudent(studentId) {
  if (!studentId) {
    fmState.credit.studentId = null;
    fmState.credit.answers = {};
    fmState.credit.step = 0;
    fmRender();
    return;
  }
  const s = (eduState.students || []).find(x => x.id === studentId);
  if (!s) return alert('Estudiante no encontrado. Sincronizá Mentorías Manager.');
  fmState.credit.studentId = studentId;
  // Pre-llenar lo que se pueda del estudiante
  const inferred = {};
  // capital del estudiante no es ingreso, pero podemos inferir documentación heurística
  if (s.fico_score) {
    const f = +s.fico_score;
    inferred.fico_exacto = String(f);
    if (f < 580) inferred.fico_band = 'menos_580';
    else if (f < 620) inferred.fico_band = '580_619';
    else if (f < 660) inferred.fico_band = '620_659';
    else if (f < 700) inferred.fico_band = '660_699';
    else if (f < 740) inferred.fico_band = '700_739';
    else if (f < 780) inferred.fico_band = '740_779';
    else inferred.fico_band = 'mas_780';
  }
  fmState.credit.answers = inferred;
  fmState.credit.step = 0;
  fmState.credit.result = null;
  fmRender();
}

function fmCreditSetStudentSearch(v) {
  fmState.credit.studentSearch = v || '';
  fmRender();
  setTimeout(() => { const inp = document.getElementById('fm-credit-student-search'); if (inp) { inp.focus(); inp.setSelectionRange(v.length, v.length); } }, 0);
}

function fmCreditAnswer(qid, val) {
  fmState.credit.answers[qid] = val;
  const active = FM_CREDIT_QUESTIONS;
  const idx = active.findIndex(q => q.id === qid);
  if (idx < active.length - 1) fmState.credit.step = idx + 1;
  else fmState.credit.result = fmCalcularPerfilCredito(fmState.credit.answers);
  fmRender();
}
function fmCreditToggle(qid, val) {
  const cur = Array.isArray(fmState.credit.answers[qid]) ? fmState.credit.answers[qid] : [];
  if (cur.includes(val)) fmState.credit.answers[qid] = cur.filter(v => v !== val);
  else fmState.credit.answers[qid] = [...cur, val];
  fmRender();
}
function fmCreditNext() {
  const active = FM_CREDIT_QUESTIONS;
  if (fmState.credit.step < active.length - 1) fmState.credit.step++;
  else fmState.credit.result = fmCalcularPerfilCredito(fmState.credit.answers);
  fmRender();
}
function fmCreditBack() { if (fmState.credit.step > 0) { fmState.credit.step--; fmRender(); } }
function fmCreditSetField(qid, val) { fmState.credit.answers[qid] = val; }

// ─── Categorización del perfil ───
function fmCalcularPerfilCredito(a) {
  // Tier por FICO
  const band = a.fico_band;
  let tier, ficoMid;
  if (band === 'sin_historial') { tier = 'sin_historial'; ficoMid = 0; }
  else if (band === 'menos_580') { tier = 'reconstruir'; ficoMid = 540; }
  else if (band === '580_619') { tier = 'reconstruir'; ficoMid = 600; }
  else if (band === '620_659') { tier = 'limitado'; ficoMid = 640; }
  else if (band === '660_699') { tier = 'limitado'; ficoMid = 680; }
  else if (band === '700_739') { tier = 'bueno'; ficoMid = 720; }
  else if (band === '740_779') { tier = 'excelente'; ficoMid = 760; }
  else if (band === 'mas_780') { tier = 'excelente'; ficoMid = 790; }
  else { tier = 'limitado'; ficoMid = 650; }
  const ficoExacto = +a.fico_exacto || ficoMid;

  // GAPS detectados
  const gaps = [];
  const strengths = [];

  // Si tiene balance + límite reales, calcular utilization preciso. Si no, usa el banding.
  const limReal = +a.limite_total || 0;
  const balReal = +a.balance_total || 0;
  if (limReal > 0 && balReal >= 0) {
    const utilPct = (balReal / limReal) * 100;
    if (utilPct >= 75) gaps.push({ area:'utilization', gravedad:'alta', label:`Utilization ${Math.round(utilPct)}% (real)` });
    else if (utilPct >= 50) gaps.push({ area:'utilization', gravedad:'alta', label:`Utilization ${Math.round(utilPct)}% (real)` });
    else if (utilPct >= 30) gaps.push({ area:'utilization', gravedad:'media', label:`Utilization ${Math.round(utilPct)}% (real)` });
    else if (utilPct < 10) strengths.push(`Utilization óptimo (${Math.round(utilPct)}% real)`);
  } else if (['50_74','mas_75'].includes(a.utilization)) {
    gaps.push({ area:'utilization', gravedad:'alta', label:'Utilization > 50%' });
  } else if (a.utilization === '30_49') {
    gaps.push({ area:'utilization', gravedad:'media', label:'Utilization 30-49%' });
  } else if (a.utilization === 'menos_10') {
    strengths.push('Utilization óptimo (<10%)');
  }

  if (a.pagos_tarde === 'mas_3') gaps.push({ area:'pagos', gravedad:'alta', label:'4+ pagos tarde 24m' });
  else if (a.pagos_tarde === '2_3') gaps.push({ area:'pagos', gravedad:'alta', label:'2-3 pagos tarde 24m' });
  else if (a.pagos_tarde === '1') gaps.push({ area:'pagos', gravedad:'media', label:'1 pago tarde 24m' });
  else if (a.pagos_tarde === 'cero') strengths.push('0 pagos tarde — pago perfecto');

  const derog = Array.isArray(a.derogatorios) ? a.derogatorios : [];
  if (derog.includes('bankruptcy')) gaps.push({ area:'derogatorios', gravedad:'crítica', label:'Bankruptcy en reporte' });
  if (derog.includes('foreclosure')) gaps.push({ area:'derogatorios', gravedad:'crítica', label:'Foreclosure en reporte' });
  if (derog.includes('collection')) gaps.push({ area:'derogatorios', gravedad:'alta', label:'Cuenta en colección' });
  if (derog.includes('charge_off')) gaps.push({ area:'derogatorios', gravedad:'alta', label:'Charge-off' });
  if (derog.includes('judgment')) gaps.push({ area:'derogatorios', gravedad:'alta', label:'Judgment / lien' });
  if (derog.includes('ninguno')) strengths.push('Sin derogatorios');

  if (['menos_1','1_2'].includes(a.antiguedad)) gaps.push({ area:'historial', gravedad:'media', label:'Historial < 2 años' });
  else if (['6_10','mas_10'].includes(a.antiguedad)) strengths.push('Historial sólido (>6 años)');

  if (a.cuentas_activas === '0') gaps.push({ area:'historial', gravedad:'alta', label:'Cero tarjetas activas' });
  else if (a.cuentas_activas === '1') gaps.push({ area:'historial', gravedad:'media', label:'Solo 1 tarjeta' });
  else if (['2_3','4_6'].includes(a.cuentas_activas)) strengths.push('Mix saludable de tarjetas');

  const mix = Array.isArray(a.mix_credito) ? a.mix_credito : [];
  if (mix.includes('ninguno') || mix.length === 0) gaps.push({ area:'mix', gravedad:'media', label:'Sin mix (solo tarjetas)' });
  else if (mix.length >= 2 && !mix.includes('ninguno')) strengths.push('Mix de tipos de crédito');

  if (a.consultas === 'mas_6') gaps.push({ area:'consultas', gravedad:'media', label:'6+ hard inquiries' });

  if (['cash','bank_only'].includes(a.documentado)) gaps.push({ area:'ingresos', gravedad:'alta', label:'Ingreso no documentable' });
  else if (a.documentado === '1099_1y') gaps.push({ area:'ingresos', gravedad:'media', label:'1099 con <2 años' });
  else if (['w2','1099_2y'].includes(a.documentado)) strengths.push('Ingreso documentable');

  if (a.dti === 'mas_43') gaps.push({ area:'dti', gravedad:'alta', label:'DTI > 43%' });
  else if (a.dti === '37_43') gaps.push({ area:'dti', gravedad:'media', label:'DTI 37-43%' });
  else if (a.dti === 'menos_28') strengths.push('DTI < 28%');

  if (['itin','sin_status'].includes(a.inmigracion)) gaps.push({ area:'inmigracion', gravedad:'media', label:'ITIN / sin SSN — lenders limitados' });

  // Generar plan
  const acciones = fmGenerarPlanCredito(tier, a, gaps);
  const ficoMeta = fmEstimarFicoMeta(ficoExacto, tier, gaps);

  // Texto del tier
  const tierLabel = {
    sin_historial:{ emoji:'🆕', nombre:'Sin historial', color:'slate', resumen:'Construyendo crédito desde cero. Foco: abrir 1-2 secured cards + pagos a tiempo + 6 meses de tradeline.' },
    reconstruir:  { emoji:'🛠️', nombre:'Reconstruir', color:'red',     resumen:'Score bajo con negativos. Plan: limpiar derogatorios + utilization + pagos a tiempo. 6-12 meses al objetivo.' },
    limitado:     { emoji:'⚠️', nombre:'Limitado',    color:'amber',   resumen:'Aprobás algunos productos pero con tasas malas. Plan: bajar utilization + extender historial + mix. 3-6 meses al objetivo.' },
    bueno:        { emoji:'✅', nombre:'Bueno',       color:'blue',    resumen:'Calificás HML estándar y mortgages no-prime. Plan: empujar a >740 para mejores tasas.' },
    excelente:    { emoji:'⭐', nombre:'Excelente',   color:'emerald', resumen:'Top tier. Plan: mantener + abrir líneas de business + maximizar puntos.' }
  }[tier];

  return {
    answers:a, tier, tierLabel, ficoActual:ficoExacto, ficoMeta,
    gaps, strengths, acciones,
    objetivo_90d: fmGenerarObjetivo90d(tier, a, ficoExacto, ficoMeta)
  };
}

function fmGenerarPlanCredito(tier, a, gaps) {
  const acciones = [];

  // Acción específica si reporta collection_amount > 0:
  // pay-for-delete es preferible a "saldar y dejar reportado".
  if (+a.collection_amount > 0) {
    acciones.push({
      prioridad:'alta', area:'derogatorios',
      accion:`Tenés ~$${(+a.collection_amount).toLocaleString()} en colecciones activas. Negociar pay-for-delete (por escrito ANTES de pagar) o consolidar en una sola.`,
      meta:'Collections removidas del reporte ($0 pendiente)',
      plazo_dias:90
    });
  }

  // Acción específica si balance/limite alto Y limite_total < $10K:
  // pedir aumentos de límite es más eficiente que pagar deuda en ese rango.
  const lim = +a.limite_total || 0;
  const bal = +a.balance_total || 0;
  if (lim > 0 && bal > 0) {
    const ratio = (bal / lim) * 100;
    if (ratio > 30 && lim < 10000) {
      acciones.push({
        prioridad:'media', area:'utilization',
        accion:`Tu límite total es bajo ($${lim.toLocaleString()}). Pedí aumento de credit limit en TODAS las tarjetas (sin hard pull si tenés 6+ meses con el issuer). Subir el denominador baja utilization sin pagar.`,
        meta:`Utilization (${Math.round(ratio)}% actual) bajar a < 30%`,
        plazo_dias:14
      });
    }
  }

  // Acciones por gap (no inventamos, mapeamos)
  gaps.forEach(g => {
    if (g.area === 'utilization') {
      acciones.push({
        prioridad:'alta', area:'utilization',
        accion:'Bajar utilization a < 10% — pagar balances o pedir aumento de límite',
        meta:'Suma de balances ÷ suma de límites < 10%',
        plazo_dias:30
      });
    }
    if (g.area === 'pagos') {
      acciones.push({
        prioridad:'alta', area:'pagos',
        accion:'Auto-pay del mínimo en TODAS las tarjetas + reminder 5 días antes del due',
        meta:'0 pagos tarde en próximos 6 meses',
        plazo_dias:7
      });
    }
    if (g.area === 'derogatorios') {
      if (g.label.includes('colección')) {
        acciones.push({
          prioridad:'alta', area:'derogatorios',
          accion:'Pay-for-delete: negociar con collection agency pago a cambio de remover del reporte (por escrito ANTES de pagar)',
          meta:'Cuenta removida del reporte',
          plazo_dias:60
        });
      }
      if (g.label.includes('Charge-off')) {
        acciones.push({
          prioridad:'alta', area:'derogatorios',
          accion:'Goodwill letter al acreedor original pidiendo remover charge-off (especialmente si ya pagado)',
          meta:'Charge-off removido o actualizado a "paid"',
          plazo_dias:90
        });
      }
      if (g.label.includes('Bankruptcy') || g.label.includes('Foreclosure')) {
        acciones.push({
          prioridad:'alta', area:'derogatorios',
          accion:'Esperar timing (BK Cap 7 = 10 años, Foreclosure = 7 años) + construir tradeline fuerte mientras tanto. NO disputar, validar accuracy del reporte.',
          meta:'Construir 3+ tradelines positivas durante el período',
          plazo_dias:180
        });
      }
    }
    if (g.area === 'historial' && g.label.includes('Cero')) {
      acciones.push({
        prioridad:'alta', area:'historial',
        accion:'Abrir 2 secured credit cards (Discover Secured + Capital One Secured) — depósito de $200-500 c/u',
        meta:'2 tradelines positivas activas',
        plazo_dias:21
      });
    }
    if (g.area === 'historial' && g.label.includes('1 tarjeta')) {
      acciones.push({
        prioridad:'media', area:'historial',
        accion:'Abrir 2da tarjeta (no-fee) — pedir auto-aumento de límite cada 6 meses sin hard inquiry',
        meta:'2-3 tarjetas activas',
        plazo_dias:30
      });
    }
    if (g.area === 'historial' && g.label.includes('< 2 años')) {
      acciones.push({
        prioridad:'media', area:'historial',
        accion:'Convertirse en authorized user en cuenta vieja de familiar con buen historial (suma su antigüedad a tu reporte)',
        meta:'+5+ años de historial promedio',
        plazo_dias:14
      });
    }
    if (g.area === 'mix') {
      acciones.push({
        prioridad:'baja', area:'mix',
        accion:'Agregar credit-builder loan ($1000 en Self / Credit Strong) — paga $50/mes 18-24m, suma installment al reporte',
        meta:'Mix tarjetas + installment',
        plazo_dias:30
      });
    }
    if (g.area === 'consultas') {
      acciones.push({
        prioridad:'media', area:'consultas',
        accion:'Stop applying — no aplicar a nada nuevo por 6 meses. Las inquiries viejas pesan menos cada mes.',
        meta:'< 3 hard inquiries en últimos 12 meses',
        plazo_dias:180
      });
    }
    if (g.area === 'ingresos') {
      if (g.label.includes('no documentable')) {
        acciones.push({
          prioridad:'alta', area:'ingresos',
          accion:'Empezar a depositar TODO el ingreso en banco + abrir cuenta de business si aplica. Hacer 12-24 meses de bank statements limpios.',
          meta:'12+ meses de bank statements consistentes',
          plazo_dias:365
        });
      }
      if (g.label.includes('<2 años')) {
        acciones.push({
          prioridad:'media', area:'ingresos',
          accion:'Mantener mismo tipo de trabajo/negocio y archivar tax returns cada año a tiempo. CPA-certified income letter ayuda.',
          meta:'Llegar a 2 años de tax returns 1099',
          plazo_dias:365
        });
      }
    }
    if (g.area === 'dti') {
      acciones.push({
        prioridad:'alta', area:'dti',
        accion:'Reducir DTI: refinanciar deuda alta-tasa, consolidar, o pagar deudas pequeñas primero (snowball). Subir ingreso documentado.',
        meta:'DTI < 36%',
        plazo_dias:120
      });
    }
    if (g.area === 'inmigracion') {
      acciones.push({
        prioridad:'media', area:'inmigracion',
        accion:'Tarjetas ITIN-friendly: Capital One, American Express (con SSN/ITIN), Latino Credit Union. Para HML: buscar lenders ITIN-friendly (Kiavi, RCN, ROC360).',
        meta:'2+ productos aprobados con ITIN',
        plazo_dias:60
      });
    }
  });

  // Acción de monitoreo (siempre)
  if (a.monitoring === 'nada') {
    acciones.unshift({
      prioridad:'alta', area:'monitoring',
      accion:'Activar Credit Karma (gratis, VantageScore) + MyFICO (pago, FICO real para lenders). Anotar score base hoy.',
      meta:'Monitoreo activo + score baseline',
      plazo_dias:3
    });
  }

  // Pull annualcreditreport.com (siempre)
  acciones.push({
    prioridad:'alta', area:'docs',
    accion:'Bajar los 3 reportes oficiales en annualcreditreport.com (Equifax, Experian, TransUnion) — gratis 1×/semana',
    meta:'3 reportes en PDF + revisar errores',
    plazo_dias:3
  });

  // Si va por HML, alinear con scoring threshold
  if (a.meta_uso === 'hml') {
    acciones.push({
      prioridad:'media', area:'meta',
      accion:'HMLs típicos requieren FICO 660+ pero los flexibles 2026 (Kiavi, RCN, Constructive Capital, Easy Street) aceptan 620+ en primer flip con LTV reducido. Si 700+, negociar puntos.',
      meta:'Calificar HML con tasa <12%',
      plazo_dias:90
    });
  }
  if (a.meta_uso === 'mortgage') {
    acciones.push({
      prioridad:'media', area:'meta',
      accion:'Mortgage convencional pide 620+ (FHA 580+). Empujá a 720+ para evitar PMI y obtener mejor APR.',
      meta:'FICO 720+ antes de aplicar',
      plazo_dias:120
    });
  }
  if (a.meta_uso === 'dscr') {
    acciones.push({
      prioridad:'media', area:'meta',
      accion:'DSCR loan ignora DTI personal pero pide FICO 660+ y reserves. Subir score y juntar 6 meses de reserves.',
      meta:'FICO 680+ + 6m reserves',
      plazo_dias:120
    });
  }
  if (a.meta_uso === 'heloc') {
    acciones.push({
      prioridad:'media', area:'meta',
      accion:'HELOC requiere equity 20%+ + FICO 680+ + DTI <43%. Verificar valor actual de vivienda (Redfin/Zillow) y equity.',
      meta:'Aprobación HELOC con tasa <prime+1%',
      plazo_dias:60
    });
  }

  return acciones;
}

function fmGenerarObjetivo90d(tier, a, ficoActual, ficoMeta) {
  if (tier === 'sin_historial') return `Construir base: 2 secured cards activas + 6 meses de pagos perfectos + 1 credit-builder loan. Score base medible en 6 meses.`;
  if (tier === 'reconstruir') return `Subir FICO de ${ficoActual} → ${ficoMeta}+ en 90 días. Foco: limpiar derogatorios + utilization < 10% + 0 pagos tarde.`;
  if (tier === 'limitado') return `Subir FICO de ${ficoActual} → ${ficoMeta}+ en 90 días. Foco: utilization < 30% + abrir 1 tarjeta más + mix.`;
  if (tier === 'bueno') return `Empujar FICO de ${ficoActual} → ${ficoMeta}+ (740) para mejores tasas. Foco: utilization < 10% + extender historial.`;
  return `Mantener score ${ficoActual}+ y diversificar con business credit. Foco: 0 hard inquiries innecesarias + utilization < 10%.`;
}

function fmEstimarFicoMeta(actual, tier, gaps) {
  // Estimación heurística: cuanto más gaps de alta gravedad, más puntos recuperables
  const altaCount = gaps.filter(g => g.gravedad === 'alta' || g.gravedad === 'crítica').length;
  const mediaCount = gaps.filter(g => g.gravedad === 'media').length;
  if (tier === 'sin_historial') return 660;
  const ganancia = Math.min(120, altaCount * 25 + mediaCount * 8);
  return Math.min(820, actual + ganancia);
}

// ─── Render Tab Crédito ───
function fmRenderCredito() {
  const c = fmState.credit || {};
  if (c.result) return fmRenderCreditoPlan();

  const students = fmGetStudentsForDiag();
  const filter = (c.studentSearch || '').toLowerCase().trim();
  const filtered = filter
    ? students.filter(s => ((s.full_name||'') + ' ' + (s.email||'') + ' ' + (s.current_stage||'')).toLowerCase().includes(filter))
    : students;
  const selStudent = c.studentId ? students.find(s => s.id === c.studentId) : null;

  const total = FM_CREDIT_QUESTIONS.length;
  const step = Math.min(c.step || 0, total - 1);
  const q = FM_CREDIT_QUESTIONS[step];
  const answered = Object.keys(c.answers || {}).filter(k => {
    const v = c.answers[k];
    return v != null && v !== '' && !(Array.isArray(v) && v.length === 0);
  }).length;
  const progress = Math.round((answered / total) * 100);
  const bloques = [...new Set(FM_CREDIT_QUESTIONS.map(qq => qq.bloque))];

  return `
    <div class="h-full overflow-y-auto bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <div class="max-w-3xl mx-auto px-6 py-8">
        <div class="bg-white rounded-xl border border-emerald-200 p-5 mb-4 shadow-sm">
          <h3 class="font-bold text-slate-900 mb-1">💳 Diagnóstico de Crédito</h3>
          <p class="text-sm text-slate-600">${total} preguntas en 6 bloques. Al final recibís perfil + plan de acción a 90 días con FICO estimado.</p>
        </div>

        <div class="bg-white border border-emerald-300 rounded-xl p-3 mb-4">
          <div class="flex items-center justify-between flex-wrap gap-2 mb-2">
            <div class="text-xs font-bold uppercase text-emerald-800">👤 Diagnóstico para estudiante</div>
            ${selStudent ? `<button onclick="fmCreditSelectStudent(null)" class="text-[10px] text-slate-500 hover:text-red-700">✕ Limpiar</button>` : ''}
          </div>
          ${selStudent ? `
            <div class="bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
              <div class="font-bold text-sm text-slate-900 truncate">${(selStudent.full_name||'').replace(/</g,'&lt;')}</div>
              <div class="text-[11px] text-slate-600">${selStudent.current_stage || 'Sin etapa'} ${selStudent.email ? '· '+selStudent.email : ''}</div>
            </div>
          ` : `
            <div class="text-[11px] text-slate-600 mb-2">Elegí un estudiante para vincular el resultado al CRM (opcional).</div>
            <input id="fm-credit-student-search" type="text" placeholder="🔍 Buscar..." value="${(c.studentSearch||'').replace(/"/g,'&quot;')}"
              oninput="fmCreditSetStudentSearch(this.value)" class="w-full border border-slate-300 rounded px-3 py-1.5 text-xs mb-2"/>
            <div class="max-h-40 overflow-y-auto scrollbar-thin border border-slate-200 rounded">
              ${filtered.length === 0 ? `
                <div class="px-3 py-3 text-center text-[11px] text-slate-500">${students.length === 0 ? 'No hay estudiantes cargados.' : 'Sin resultados'}</div>
              ` : filtered.slice(0, 30).map(s => `
                <button onclick="fmCreditSelectStudent('${s.id}')" class="w-full text-left px-3 py-2 hover:bg-emerald-50 border-b border-slate-100 last:border-b-0">
                  <div class="font-medium text-xs text-slate-900 truncate">${(s.full_name||'?').replace(/</g,'&lt;')}</div>
                  <div class="text-[10px] text-slate-500 truncate">${s.current_stage || '—'}</div>
                </button>
              `).join('')}
            </div>
          `}
        </div>

        <div class="mb-4 bg-white rounded-xl border border-slate-200 p-3">
          <div class="flex items-center gap-1 overflow-x-auto text-xs">
            ${bloques.map(b => {
              const qs = FM_CREDIT_QUESTIONS.filter(qq => qq.bloque === b);
              const done = qs.filter(qq => {
                const v = c.answers[qq.id];
                return v != null && v !== '' && !(Array.isArray(v) && v.length === 0);
              }).length;
              const isActive = b === q.bloque;
              return `<span class="px-3 py-1.5 rounded-full font-medium whitespace-nowrap ${isActive ? 'bg-emerald-500 text-white' : done === qs.length ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}">${b} <span class="ml-1 opacity-70">${done}/${qs.length}</span></span>`;
            }).join('')}
          </div>
        </div>

        <div class="mb-4">
          <div class="flex items-center justify-between text-xs text-slate-600 mb-1">
            <span>Pregunta ${step + 1} de ${total}</span>
            <span>${progress}% completado</span>
          </div>
          <div class="w-full bg-slate-200 rounded-full h-2 overflow-hidden"><div class="h-full bg-emerald-500 transition-all" style="width:${progress}%"></div></div>
        </div>

        <div class="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div class="text-xs font-bold text-emerald-600 tracking-wider mb-2">${q.bloque} · PREGUNTA ${step + 1}</div>
          <h4 class="text-xl font-bold text-slate-900 mb-5">${q.pregunta}</h4>
          ${fmRenderCreditQuestionInput(q)}
        </div>

        <div class="flex items-center justify-between mt-6">
          <button onclick="fmCreditBack()" ${step === 0 ? 'disabled' : ''} class="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 disabled:opacity-30">← Atrás</button>
          ${q.tipo === 'text' || q.tipo === 'number' || q.multiSelect ? `<button onclick="fmCreditNext()" class="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600">Siguiente →</button>` : ''}
          <button onclick="fmCreditReset()" class="px-3 py-2 text-xs text-slate-400 hover:text-slate-600">🔄 Reiniciar</button>
        </div>
      </div>
    </div>
  `;
}

function fmRenderCreditQuestionInput(q) {
  const c = fmState.credit;
  if (q.tipo === 'text' || q.tipo === 'number') {
    const val = c.answers[q.id] || '';
    return `<input type="${q.tipo}" value="${String(val).replace(/"/g,'&quot;')}" placeholder="${q.placeholder || ''}"
      oninput="fmCreditSetField('${q.id}', this.value)"
      onkeydown="if(event.key==='Enter'){fmCreditNext();}"
      class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"/>`;
  }
  if (q.multiSelect) {
    const vals = Array.isArray(c.answers[q.id]) ? c.answers[q.id] : [];
    return `<div class="space-y-2">
      ${q.opciones.map(o => {
        const sel = vals.includes(o.val);
        return `<button onclick="fmCreditToggle('${q.id}','${o.val}')" class="w-full text-left px-4 py-3 rounded-lg border-2 transition ${sel?'border-emerald-500 bg-emerald-50 text-emerald-900':'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50'}">
          <div class="flex items-center gap-3"><div class="w-5 h-5 rounded border-2 ${sel?'border-emerald-600 bg-emerald-600':'border-slate-300'} flex items-center justify-center flex-shrink-0">${sel?'<span class="text-white text-xs leading-none">✓</span>':''}</div><span class="text-sm">${o.label}</span></div>
        </button>`;
      }).join('')}
    </div>
    <p class="text-xs text-slate-500 mt-3">Podés seleccionar varios. Cuando termines, click "Siguiente →"</p>`;
  }
  return `<div class="space-y-2">
    ${q.opciones.map(o => {
      const sel = c.answers[q.id] === o.val;
      return `<button onclick="fmCreditAnswer('${q.id}','${o.val}')" class="w-full text-left px-4 py-3 rounded-lg border-2 transition ${sel?'border-emerald-500 bg-emerald-50 text-emerald-900':'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50'}">
        <div class="flex items-center gap-3"><div class="w-5 h-5 rounded-full border-2 ${sel?'border-emerald-600 bg-emerald-600':'border-slate-300'} flex items-center justify-center flex-shrink-0">${sel?'<div class="w-2 h-2 rounded-full bg-white"></div>':''}</div><span class="text-sm">${o.label}</span></div>
      </button>`;
    }).join('')}
  </div>`;
}

function fmRenderCreditoPlan() {
  const c = fmState.credit;
  const r = c.result;
  const tl = r.tierLabel;
  const colorMap = { slate:'bg-slate-500', red:'bg-red-500', amber:'bg-amber-500', blue:'bg-blue-500', emerald:'bg-emerald-500' };
  const bgColor = colorMap[tl.color] || 'bg-slate-500';
  const altaAcciones = r.acciones.filter(a => a.prioridad === 'alta');
  const mediaAcciones = r.acciones.filter(a => a.prioridad === 'media');
  const bajaAcciones = r.acciones.filter(a => a.prioridad === 'baja');

  const selStudent = c.studentId ? (eduState.students||[]).find(s => s.id === c.studentId) : null;

  return `
    <div class="h-full overflow-y-auto bg-slate-50">
      <div class="${bgColor} text-white">
        <div class="max-w-5xl mx-auto px-8 py-8">
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1">
              <div class="text-xs font-bold opacity-90 tracking-wider mb-2">DIAGNÓSTICO DE CRÉDITO · PERFIL ${tl.nombre.toUpperCase()}</div>
              <h1 class="text-3xl font-bold mb-2">${tl.emoji} ${tl.nombre}</h1>
              <p class="text-sm opacity-90">${tl.resumen}</p>
            </div>
            <div class="flex flex-col gap-2">
              ${selStudent
                ? `<button onclick="fmCreditSavePlan()" class="px-4 py-2 bg-white text-slate-900 rounded-lg text-sm font-bold">💾 Guardar plan para ${(selStudent.full_name||'estudiante').replace(/</g,'&lt;')}</button>`
                : `<button onclick="alert('Seleccioná un estudiante antes de guardar.\\n\\nO podés copiar el plan manualmente.')" class="px-4 py-2 bg-white/20 text-white rounded-lg text-sm font-bold cursor-help">💾 (Sin estudiante)</button>`
              }
              <button onclick="fmCreditReset()" class="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm">🔄 Repetir</button>
            </div>
          </div>
          <div class="mt-6 grid grid-cols-3 gap-3">
            <div class="bg-white/15 rounded-lg p-3"><div class="text-xs opacity-80">FICO actual</div><div class="text-2xl font-bold">${r.ficoActual || '—'}</div></div>
            <div class="bg-white/15 rounded-lg p-3"><div class="text-xs opacity-80">FICO meta (90-180d)</div><div class="text-2xl font-bold">${r.ficoMeta}</div></div>
            <div class="bg-white/15 rounded-lg p-3"><div class="text-xs opacity-80">Gap a recuperar</div><div class="text-2xl font-bold">${r.ficoMeta - (r.ficoActual||0)}pts</div></div>
          </div>
        </div>
      </div>

      <div class="max-w-5xl mx-auto px-8 py-6">
        <!-- Objetivo 90 días -->
        <div class="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-5 mb-6">
          <div class="text-xs font-bold uppercase text-emerald-700 tracking-wider mb-2">🎯 Objetivo 90 días</div>
          <p class="text-sm text-slate-900 font-medium">${r.objetivo_90d}</p>
        </div>

        <!-- Fortalezas + gaps -->
        <div class="grid md:grid-cols-2 gap-4 mb-6">
          <div class="bg-white border border-slate-200 rounded-xl p-4">
            <h3 class="font-bold text-sm text-slate-900 mb-3">✅ Fortalezas (${r.strengths.length})</h3>
            ${r.strengths.length ? r.strengths.map(s => `<div class="text-xs text-emerald-700 mb-1.5">✓ ${s}</div>`).join('') : '<div class="text-xs text-slate-400 italic">Sin fortalezas identificadas todavía.</div>'}
          </div>
          <div class="bg-white border border-slate-200 rounded-xl p-4">
            <h3 class="font-bold text-sm text-slate-900 mb-3">⚠️ Áreas a mejorar (${r.gaps.length})</h3>
            ${r.gaps.length ? r.gaps.map(g => {
              const colors = { 'crítica':'red', 'alta':'red', 'media':'amber', 'baja':'slate' };
              const col = colors[g.gravedad] || 'slate';
              return `<div class="flex items-center gap-2 mb-1.5"><span class="text-[9px] font-bold bg-${col}-100 text-${col}-700 px-1.5 py-0.5 rounded uppercase">${g.gravedad}</span><span class="text-xs text-slate-700">${g.label}</span></div>`;
            }).join('') : '<div class="text-xs text-emerald-700 italic">Sin gaps detectados. Perfil sólido.</div>'}
          </div>
        </div>

        <!-- Plan de acción -->
        <div class="bg-white border border-slate-200 rounded-xl overflow-hidden mb-6">
          <div class="bg-slate-900 text-white px-5 py-3"><h3 class="font-bold">📋 Plan de acción (${r.acciones.length} acciones)</h3></div>
          ${altaAcciones.length ? `
            <div class="px-5 py-4 border-b border-slate-100">
              <div class="text-xs font-bold uppercase text-red-700 mb-2">🔴 Prioridad ALTA — empezar ya</div>
              ${altaAcciones.map(a => fmRenderAccionCredito(a)).join('')}
            </div>` : ''}
          ${mediaAcciones.length ? `
            <div class="px-5 py-4 border-b border-slate-100">
              <div class="text-xs font-bold uppercase text-amber-700 mb-2">🟡 Prioridad MEDIA — siguiente</div>
              ${mediaAcciones.map(a => fmRenderAccionCredito(a)).join('')}
            </div>` : ''}
          ${bajaAcciones.length ? `
            <div class="px-5 py-4">
              <div class="text-xs font-bold uppercase text-slate-500 mb-2">⚪ Prioridad BAJA — cuando termines lo anterior</div>
              ${bajaAcciones.map(a => fmRenderAccionCredito(a)).join('')}
            </div>` : ''}
        </div>

        <div class="text-[10px] text-slate-500 italic">Disclaimer: este diagnóstico es orientativo. Validá con un broker/lender calificado antes de aplicar a productos específicos. FICO real para lenders solo via MyFICO.</div>
      </div>
    </div>
  `;
}

function fmRenderAccionCredito(a) {
  return `<div class="bg-slate-50 rounded p-3 mb-2">
    <div class="font-medium text-sm text-slate-900">${a.accion}</div>
    <div class="text-[11px] text-slate-600 mt-1">🎯 Meta: ${a.meta} · ⏱ ${a.plazo_dias} días</div>
  </div>`;
}

// ─── Guardar el diagnóstico + plan en DB vinculado al estudiante ───
async function fmCreditSavePlan() {
  const c = fmState.credit;
  if (!c.studentId) return alert('Seleccioná un estudiante primero.');
  if (!c.result) return alert('Generá el diagnóstico primero (completá las preguntas).');
  if (c.saving) return;
  c.saving = true;
  fmRender();
  try {
    const student = (eduState.students||[]).find(s => s.id === c.studentId);
    const mid = student?.mentorship_id || eduState.mentorshipId;

    // Archivar previo activo del mismo estudiante
    await sb.from('edu_credit_diagnostics').update({ status:'archived' })
      .eq('student_id', c.studentId).eq('status', 'active');

    const { data: diag, error } = await sb.from('edu_credit_diagnostics').insert({
      student_id: c.studentId,
      mentorship_id: mid,
      answers: c.result.answers,
      perfil: { tier: c.result.tier, tierLabel: c.result.tierLabel, gaps: c.result.gaps, strengths: c.result.strengths },
      plan: { acciones: c.result.acciones, objetivo_90d: c.result.objetivo_90d, fico_meta: c.result.ficoMeta },
      fico_actual: c.result.ficoActual || null,
      fico_meta: c.result.ficoMeta,
      status: 'active',
      created_by: state.user.id
    }).select().single();
    if (error) throw error;

    // Insertar tareas
    const tasks = c.result.acciones.map(a => ({
      diagnostic_id: diag.id, student_id: c.studentId,
      prioridad: a.prioridad, area: a.area,
      accion: a.accion, meta: a.meta, plazo_dias: a.plazo_dias
    }));
    if (tasks.length) await sb.from('edu_credit_plan_tasks').insert(tasks);

    alert(`✅ Diagnóstico crédito guardado para ${student?.full_name || 'estudiante'}\n\nFICO actual: ${c.result.ficoActual || '—'} → meta ${c.result.ficoMeta}\n${tasks.length} acción(es) en el plan\n\nVer en Mentorías Manager.`);
    c.saving = false;
  } catch (e) {
    c.saving = false;
    alert('Error guardando: ' + (e.message || e));
  }
}

