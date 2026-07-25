// ════════════════════════════════════════════════════════════
// 💳 Diagnóstico de crédito (extraído de education.js)
// Depende de: fmState (definido en education.js), eduState,
// fmGetStudentsForDiag, fmRender, openModal, sb, state, escapeHtml
// ════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════
// 💳 DIAGNÓSTICO DE CRÉDITO — wizard 16 preguntas → plan 90 días
// Tabla: edu_credit_diagnostics + edu_credit_plan_tasks
// ════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════
// CATÁLOGO DE LECCIONES DEL PROGRAMA (Drive · 42 lecciones)
// El plan de acción mapea cada gap a las lecciones reales que el
// estudiante tiene que ver (no inventamos contenido).
// ════════════════════════════════════════════════════════════
const FM_CREDIT_LESSONS = {
  // Módulo 1 — Fundamentos
  '1.1': '¿Qué es el Crédito?',
  '1.2': '¿Qué es el FICO Score?',
  '1.3': 'Burós de Crédito',
  '1.4': 'El Perfil Crediticio',
  '1.5': 'Principios Claves para Administrar el Crédito',
  // Módulo 2 — Monitoreo
  '2.1': 'Cómo Ver y Monitorear tu Crédito',
  '2.2': 'Cómo Revisar tu Crédito con las Apps de los Bancos',
  '2.3': 'Interpretar tu Score de Crédito',
  '2.4': 'Congela tu Buró de Crédito',
  '2.5': 'Cómo Revisar tu Reporte de Crédito si Tienes ITIN',
  // Módulo 3 — Limpieza de marcas negativas
  '3.0': 'Identificar Marcas Negativas',
  '3.1': 'Corregir Información Personal',
  '3.2': 'Eliminar Marcas Negativas (Parte 1)',
  '3.3': 'Eliminar Marcas Negativas (Parte 2)',
  // Módulo 4 — Construcción del FICO
  '4.1': 'Cómo Funciona el Crédito',
  '4.2': 'Historial de Pagos',
  '4.3': 'Historial de Pagos (Parte 2)',
  '4.4': 'Utilización del Crédito',
  '4.5': 'Historial Crediticio',
  '4.6': 'Credit Mix (Mezcla de Créditos)',
  '4.7': 'Nuevo Crédito',
  // Módulo 5 — Relación bancaria
  '5.1': 'Mejores Bancos y sus Categorías',
  '5.2': 'Gana Dinero Abriendo Cuentas de Banco',
  '5.3': 'Credit Unions Recomendados',
  '5.4': 'Crea Movimientos Bancarios (Centrífuga Bancaria)',
  // Módulo 6 — Estrategia de tarjetas
  '6.1': 'Qué Hacer Antes de Aplicar a una Tarjeta',
  '6.2': 'Cómo Elegir la Tarjeta Perfecta para Mí',
  '6.3': 'Cómo Hacer una Ronda de Aplicación a Tarjetas',
  '6.4': 'Guía para Aplicar a una Tarjeta de Crédito',
  '6.5': 'Convertir las Tarjetas de Crédito en Cash',
  '6.6': 'Reglas de Algunos Bancos (antes de aplicar)',
  // Módulo 7 — Estrategias avanzadas
  '7.1': 'Cómo Pagar Tarjetas a 0% de Interés (estrategias avanzadas)',
  '7.2': 'Bancos que Prestan Dinero Fácil y Rápido para Empresas',
  '7.3': 'Estrategias Avanzadas de Crédito',
  // Módulo 8 — Crédito de empresa
  '8.1': 'Crédito de Empresa',
  '8.2': 'Estudio y Preparación para la Aplicación',
  '8.3': 'Cómo Crear Historial Crediticio para Empresa Rápido',
  '8.4': 'Aplicación a Tarjetas de Crédito para Empresas',
  '8.5': 'Aumenta tu Red de Bancos',
  '8.6': 'Tarjetas que NO Revisan Perfil Personal',
  '8.7': 'Convertir Tarjetas de Crédito en Cash',
  '8.8': 'Bancos para Empresa que NO Revisan Crédito Personal'
};

// ════════════════════════════════════════════════════════════
// CUESTIONARIO REDUCIDO · 10 preguntas en 4 bloques
// (antes 18 — feedback: "más corto, conciso y práctico")
// ════════════════════════════════════════════════════════════
const FM_CREDIT_QUESTIONS = [
  // ── BLOQUE A · DÓNDE ESTÁS HOY (3 preguntas) ──────────
  { id:'fico_band', bloque:'A · Tu score',
    pregunta:'¿En qué rango está tu FICO hoy?',
    opciones:[
      { val:'sin_historial', label:'Sin historial crediticio en USA (ITIN o reciente)' },
      { val:'menos_580',     label:'< 580 — pobre' },
      { val:'580_619',       label:'580-619 — bajo / sub-prime' },
      { val:'620_659',       label:'620-659 — justo' },
      { val:'660_699',       label:'660-699 — bueno' },
      { val:'700_739',       label:'700-739 — muy bueno' },
      { val:'740_779',       label:'740-779 — excelente' },
      { val:'mas_780',       label:'≥ 780 — top tier' }
    ] },
  { id:'inmigracion', bloque:'A · Tu score',
    pregunta:'¿Cuál es tu status migratorio? (define qué bancos te aceptan)',
    opciones:[
      { val:'ciudadano',  label:'Ciudadano' },
      { val:'residente',  label:'Residente permanente (Green Card)' },
      { val:'work_visa',  label:'Visa de trabajo (H1B/L1/E2/TN)' },
      { val:'itin',       label:'ITIN (sin SSN)' },
      { val:'sin_status', label:'Sin status definido' }
    ] },
  { id:'monitoring', bloque:'A · Tu score',
    pregunta:'¿Estás monitoreando tu crédito HOY? (lección 2.1)',
    opciones:[
      { val:'experian',  label:'Sí — Experian / MyFICO (pago, FICO real)' },
      { val:'gratis',    label:'Sí — Credit Karma / Capital One / Chase (gratis, VantageScore)' },
      { val:'nada',      label:'No — no tengo monitoreo activo' }
    ] },

  // ── BLOQUE B · COMPOSICIÓN (3 preguntas) ──────────────
  { id:'antiguedad', bloque:'B · Composición',
    pregunta:'¿Cuántos años tiene tu cuenta MÁS ANTIGUA + cuántas tarjetas activas tenés? (lección 4.5)',
    opciones:[
      { val:'cero',        label:'0 tarjetas — arrancando de cero' },
      { val:'1_nueva',     label:'1 tarjeta · <2 años' },
      { val:'1_vieja',     label:'1 tarjeta · ≥2 años' },
      { val:'2_3_nuevas',  label:'2-3 tarjetas · todas <2 años' },
      { val:'2_3_mixto',   label:'2-3 tarjetas · alguna ≥3 años' },
      { val:'4_6_solido',  label:'4-6 tarjetas · al menos una ≥3 años (mix saludable)' },
      { val:'mas_6',       label:'7+ tarjetas (perfil avanzado)' }
    ] },
  { id:'utilization', bloque:'B · Composición',
    pregunta:'¿Qué % de tu límite total estás usando? (lección 4.4 · el factor #2 después de pagos)',
    opciones:[
      { val:'menos_10',  label:'< 10% — óptimo · max score' },
      { val:'10_29',     label:'10-29% — bueno' },
      { val:'30_49',     label:'30-49% — empieza a doler' },
      { val:'50_74',     label:'50-74% — penaliza fuerte' },
      { val:'mas_75',    label:'≥ 75% — crítico, pagar YA' },
      { val:'no_se',     label:'No sé — necesito calcularlo' }
    ] },
  { id:'mix_credito', bloque:'B · Composición',
    pregunta:'Además de tarjetas, ¿qué otros créditos activos tenés? (lección 4.6 · Credit Mix)',
    multiSelect:true,
    opciones:[
      { val:'auto',       label:'Auto loan' },
      { val:'student',    label:'Student loan' },
      { val:'mortgage',   label:'Hipoteca' },
      { val:'personal',   label:'Personal loan' },
      { val:'business',   label:'Business credit' },
      { val:'ninguno',    label:'Ninguno — solo tarjetas' }
    ] },

  // ── BLOQUE C · MARCAS NEGATIVAS (2 preguntas) ─────────
  { id:'pagos_tarde', bloque:'C · Marcas negativas',
    pregunta:'¿Pagos tarde (30+ días) en los últimos 24 meses? (lección 4.2)',
    opciones:[
      { val:'cero',   label:'Cero — historial perfecto' },
      { val:'1',      label:'1 pago tarde' },
      { val:'2_3',    label:'2-3 pagos tarde' },
      { val:'mas_3',  label:'4+ pagos tarde (riesgo alto)' }
    ] },
  { id:'derogatorios', bloque:'C · Marcas negativas',
    pregunta:'¿Qué derogatorios tenés HOY en tu reporte? (lección 3.0 · Identificar)',
    multiSelect:true,
    opciones:[
      { val:'collection',  label:'Cuenta en colección' },
      { val:'charge_off',  label:'Charge-off' },
      { val:'judgment',    label:'Judgment / lien' },
      { val:'bankruptcy',  label:'Bankruptcy (Cap 7 o 13)' },
      { val:'foreclosure', label:'Foreclosure / short sale' },
      { val:'ninguno',     label:'Ninguno — limpio' }
    ] },

  // ── BLOQUE D · META (2 preguntas) ──────────────────────
  { id:'consultas', bloque:'D · Tu meta',
    pregunta:'Hard inquiries (consultas duras) en los últimos 12 meses (lección 4.7)',
    opciones:[
      { val:'0_2',    label:'0-2 — normal' },
      { val:'3_5',    label:'3-5 — medio' },
      { val:'mas_6',  label:'6+ — alto, pausar aplicaciones' }
    ] },
  { id:'meta_uso', bloque:'D · Tu meta',
    pregunta:'¿Para qué querés el crédito en los próximos 6 meses? (define tu plan de acción)',
    opciones:[
      { val:'hml',         label:'Hard Money Lender para flips' },
      { val:'mortgage',    label:'Mortgage convencional (Fix & Hold)' },
      { val:'dscr',        label:'DSCR loan (rental)' },
      { val:'heloc',       label:'HELOC sobre vivienda' },
      { val:'business',    label:'Business credit / líneas de empresa' },
      { val:'cash',        label:'Convertir tarjetas en cash (lección 6.5)' },
      { val:'mejorar',     label:'Solo mejorar score (sin meta inmediata)' }
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
  const ficoExacto = ficoMid;  // usamos el midpoint del band (eliminamos pregunta fico_exacto)

  // GAPS detectados
  const gaps = [];
  const strengths = [];

  // Utilization (ahora solo se infiere del banding — eliminamos balance/limite explícitos)
  if (['50_74','mas_75'].includes(a.utilization)) {
    gaps.push({ area:'utilization', gravedad:'alta', label:'Utilization > 50% (lección 4.4)' });
  } else if (a.utilization === '30_49') {
    gaps.push({ area:'utilization', gravedad:'media', label:'Utilization 30-49% (lección 4.4)' });
  } else if (a.utilization === 'menos_10') {
    strengths.push('Utilization óptimo (<10%)');
  } else if (a.utilization === 'no_se') {
    gaps.push({ area:'utilization', gravedad:'media', label:'Utilization sin medir (lección 2.3)' });
  }

  if (a.pagos_tarde === 'mas_3') gaps.push({ area:'pagos', gravedad:'crítica', label:'4+ pagos tarde 24m (lección 4.2)' });
  else if (a.pagos_tarde === '2_3') gaps.push({ area:'pagos', gravedad:'alta', label:'2-3 pagos tarde 24m (lección 4.2)' });
  else if (a.pagos_tarde === '1') gaps.push({ area:'pagos', gravedad:'media', label:'1 pago tarde 24m' });
  else if (a.pagos_tarde === 'cero') strengths.push('0 pagos tarde — pago perfecto');

  const derog = Array.isArray(a.derogatorios) ? a.derogatorios : [];
  if (derog.includes('bankruptcy')) gaps.push({ area:'derogatorios', gravedad:'crítica', label:'Bankruptcy en reporte (lección 3.3)' });
  if (derog.includes('foreclosure')) gaps.push({ area:'derogatorios', gravedad:'crítica', label:'Foreclosure en reporte' });
  if (derog.includes('collection')) gaps.push({ area:'derogatorios', gravedad:'alta', label:'Cuenta en colección (lección 3.2)' });
  if (derog.includes('charge_off')) gaps.push({ area:'derogatorios', gravedad:'alta', label:'Charge-off (lección 3.2)' });
  if (derog.includes('judgment')) gaps.push({ area:'derogatorios', gravedad:'alta', label:'Judgment / lien' });
  if (derog.includes('ninguno')) strengths.push('Sin derogatorios');

  // Antigüedad + #cuentas en 1 sola pregunta nueva
  const ant = a.antiguedad;
  if (ant === 'cero') {
    gaps.push({ area:'historial', gravedad:'alta', label:'Cero tarjetas activas (lección 4.5)' });
  } else if (ant === '1_nueva' || ant === '1_vieja') {
    gaps.push({ area:'historial', gravedad:'media', label:'Solo 1 tarjeta — necesitas más mix (lección 6.3)' });
  } else if (ant === '2_3_nuevas') {
    gaps.push({ area:'historial', gravedad:'media', label:'Historial corto (<2 años) — paciencia (lección 4.5)' });
  } else if (ant === '2_3_mixto' || ant === '4_6_solido') {
    strengths.push('Mix saludable de tarjetas con antigüedad');
  } else if (ant === 'mas_6') {
    strengths.push('Perfil avanzado (7+ tarjetas)');
  }

  const mix = Array.isArray(a.mix_credito) ? a.mix_credito : [];
  if (mix.includes('ninguno') || mix.length === 0) gaps.push({ area:'mix', gravedad:'media', label:'Sin mix — solo tarjetas (lección 4.6)' });
  else if (mix.filter(m => m !== 'ninguno').length >= 2) strengths.push('Mix de tipos de crédito');

  if (a.consultas === 'mas_6') gaps.push({ area:'consultas', gravedad:'alta', label:'6+ hard inquiries (lección 4.7) — PAUSAR aplicaciones' });
  else if (a.consultas === '3_5') gaps.push({ area:'consultas', gravedad:'media', label:'3-5 inquiries últimos 12m' });

  if (['itin','sin_status'].includes(a.inmigracion)) gaps.push({ area:'inmigracion', gravedad:'media', label:'ITIN / sin SSN — bancos específicos (lección 2.5)' });

  // Setup defensivo
  if (a.monitoring === 'nada') gaps.push({ area:'setup', gravedad:'alta', label:'Sin monitoreo activo (lección 2.1)' });

  // Generar plan
  const acciones = fmGenerarPlanCredito(tier, a, gaps);
  const ficoMeta = fmEstimarFicoMeta(ficoExacto, tier, gaps);

  // Texto del tier
  const tierLabel = {
    sin_historial:{ emoji:'🆕', nombre:'Sin historial', color:'slate', resumen:'Construyendo crédito desde cero. Foco: abrir 1-2 secured cards + pagos a tiempo + 6 meses de tradeline.' },
    reconstruir:  { emoji:osIcon('wrench'), nombre:'Reconstruir', color:'red',     resumen:'Score bajo con negativos. Plan: limpiar derogatorios + utilization + pagos a tiempo. 6-12 meses al objetivo.' },
    limitado:     { emoji:osIcon('alert'), nombre:'Limitado',    color:'amber',   resumen:'Aprobás algunos productos pero con tasas malas. Plan: bajar utilization + extender historial + mix. 3-6 meses al objetivo.' },
    bueno:        { emoji:osIcon('check-circle'), nombre:'Bueno',       color:'blue',    resumen:'Calificás HML estándar y mortgages no-prime. Plan: empujar a >740 para mejores tasas.' },
    excelente:    { emoji:osIcon('star'), nombre:'Excelente',   color:'emerald', resumen:'Top tier. Plan: mantener + abrir líneas de business + maximizar puntos.' }
  }[tier];

  return {
    answers:a, tier, tierLabel, ficoActual:ficoExacto, ficoMeta,
    gaps, strengths, acciones,
    objetivo_90d: fmGenerarObjetivo90d(tier, a, ficoExacto, ficoMeta)
  };
}

// ════════════════════════════════════════════════════════════
// HELPER · agrega una acción al plan con todos los campos
// ════════════════════════════════════════════════════════════
function _addAccion(acciones, opts) {
  acciones.push({
    fase: opts.fase,
    nivel: opts.nivel || 'basico',         // basico | intermedio | avanzado | pro | elite
    prioridad: opts.prioridad || 'media',  // alta | media | baja
    area: opts.area,
    accion: opts.accion,
    meta: opts.meta,
    plazo_dias: opts.plazo_dias,
    leccion_ref: opts.leccion_ref || [],
    por_que: opts.por_que,
    puntos_estimados: opts.puntos_estimados || null,  // ej "+15-30 pts"
    costo: opts.costo || 'gratis',          // gratis | bajo | medio | alto
    pasos: opts.pasos || []                  // pasos concretos paso a paso
  });
}

function fmGenerarPlanCredito(tier, a, gaps) {
  // ════════════════════════════════════════════════════════════
  // PLAN PROFUNDO · 12 FASES · estrategias básica → pro
  // Ataca los 5 factores FICO sistemáticamente + 7 vías de capital
  // ════════════════════════════════════════════════════════════
  const acciones = [];
  const derog = Array.isArray(a.derogatorios) ? a.derogatorios : [];
  const tieneDeroga = derog.length > 0 && !derog.includes('ninguno');
  const mix = Array.isArray(a.mix_credito) ? a.mix_credito : [];
  const ficoEstimado = (() => {
    const map = {'sin_historial':0,'menos_580':540,'580_619':600,'620_659':640,'660_699':680,'700_739':720,'740_779':760,'mas_780':790};
    return map[a.fico_band] || 650;
  })();

  // ═══════════════════════════════════════════════════════════════════
  // FASE 1 · DEFENSA & MONITOREO (Semana 1) — todos sí o sí
  // ═══════════════════════════════════════════════════════════════════
  _addAccion(acciones, {
    fase:1, nivel:'basico', prioridad:'alta', area:'setup',
    accion:'Bajar los 3 reportes oficiales en annualcreditreport.com (Equifax + Experian + TransUnion) — gratis 1×/semana cada uno',
    meta:'3 reportes en PDF + leídos línea por línea',
    plazo_dias:3, costo:'gratis',
    leccion_ref:['1.3','2.1'],
    por_que:'El reporte oficial es la única foto real. Credit Karma muestra VantageScore (no FICO); MyFICO es el FICO real que ven los lenders.',
    pasos:[
      'Entrar a annualcreditreport.com (NO confundir con sitios fake)',
      'Bajar 1 reporte por semana de cada buró → en 3 semanas tenés los 3',
      'Guardar los PDFs en carpeta "Crédito · Reportes" con fecha',
      'Hacer una tabla: cuentas + montos + fechas + estado en cada buró'
    ]
  });
  _addAccion(acciones, {
    fase:1, nivel:'basico', prioridad:'alta', area:'setup',
    accion:'Activar 3 capas de monitoreo: Credit Karma (gratis · VantageScore) + Experian app (gratis · FICO 8) + MyFICO (~$20/mes · los 9 FICO scores que usan lenders)',
    meta:'Score baseline anotado en 3 fuentes',
    plazo_dias:3, costo:'bajo',
    leccion_ref:['2.1','2.2','2.3'],
    por_que:'Cada buró reporta distinto. Lender de auto usa FICO 8 Auto, mortgage usa FICO 2/4/5, tarjetas usa FICO 8 Bankcard. MyFICO te muestra los 9.',
    puntos_estimados:'Diagnóstico (no sube puntos directamente)'
  });
  _addAccion(acciones, {
    fase:1, nivel:'intermedio', prioridad:'alta', area:'setup',
    accion:'Congelar (freeze) los 3 burós + ChexSystems + LexisNexis. PIN guardado en password manager.',
    meta:'5 freezes activos con PINs guardados',
    plazo_dias:7, costo:'gratis',
    leccion_ref:['2.4'],
    por_que:'Bloquea fraude Y bloquea aplicaciones automáticas. Se descongela en 1 minuto cuando vos quieras aplicar a algo. ChexSystems y LexisNexis los olvida el 99% de la gente y son los que usan los bancos para abrir cuentas.',
    pasos:[
      'Equifax: equifax.com/personal/credit-report-services/credit-freeze',
      'Experian: experian.com/freeze',
      'TransUnion: transunion.com/credit-freeze',
      'ChexSystems: chexsystems.com → Security Freeze',
      'LexisNexis: consumer.risk.lexisnexis.com → Security Freeze'
    ]
  });
  if (['itin','sin_status'].includes(a.inmigracion)) {
    _addAccion(acciones, {
      fase:1, nivel:'intermedio', prioridad:'alta', area:'setup',
      accion:'Pull ITIN-specific: Experian y TransUnion son los que mejor reportan con ITIN. Equifax solo si tenés SSN.',
      meta:'Reporte ITIN confirmado y entendido',
      plazo_dias:7, costo:'gratis',
      leccion_ref:['2.5'],
      por_que:'Con ITIN tu reporte vive principalmente en 2 burós. Saber esto te ahorra estrés cuando un buró diga "no record found".'
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // FASE 2 · DIAGNÓSTICO PROFUNDO DEL REPORTE (Semana 1-2)
  // ═══════════════════════════════════════════════════════════════════
  _addAccion(acciones, {
    fase:2, nivel:'basico', prioridad:'alta', area:'diagnostico',
    accion:'Auditoría del reporte línea por línea: info personal, cada tradeline (apertura, status, balance, límite, pagos), inquiries de 24m, public records',
    meta:'Lista master con TODO lo que aparece + errores marcados',
    plazo_dias:10, costo:'gratis',
    leccion_ref:['3.0','3.1'],
    por_que:'El 79% de los reportes tienen al menos 1 error. Errores = puntos perdidos. Encontrarlos = subir 10-30 puntos gratis.',
    pasos:[
      'Info personal: nombre exacto, direcciones (eliminar antiguas), empleadores, SSN parcial',
      'Por cada cuenta: fecha apertura, fecha último pago, status (open/closed/charge-off)',
      'Inquiries: anotar cuáles fueron autorizadas y cuáles no',
      'Public records: judgments, liens, bankruptcies'
    ]
  });
  _addAccion(acciones, {
    fase:2, nivel:'intermedio', prioridad:'media', area:'diagnostico',
    accion:'Calcular utilization REAL por tarjeta + global. Identificar la tarjeta con peor ratio para atacar primero.',
    meta:'Tabla de utilization individual y global',
    plazo_dias:10, costo:'gratis',
    leccion_ref:['4.4'],
    por_que:'El FICO mira utilization individual Y global. Una tarjeta a 90% baja tu score aunque las otras estén a 0%.',
    puntos_estimados:'+20-50 pts al optimizar'
  });

  // ═══════════════════════════════════════════════════════════════════
  // FASE 3 · PAYMENT HISTORY (35% del FICO) — el factor más grande
  // ═══════════════════════════════════════════════════════════════════
  _addAccion(acciones, {
    fase:3, nivel:'basico', prioridad:'alta', area:'pagos',
    accion:'Auto-pay del MÍNIMO en TODAS las tarjetas (defensa contra olvidos) + auto-pay del FULL BALANCE programado 3 días antes del statement date',
    meta:'0% probabilidad de pago tarde + utilization reportada baja',
    plazo_dias:7, costo:'gratis',
    leccion_ref:['4.2','4.3'],
    por_que:'Pagos tarde son el #1 destructor de FICO. Un solo pago de 30 días tarde te baja 60-110 puntos. Auto-pay del mínimo = seguro. Auto-pay del full antes del statement = utilization óptima.',
    puntos_estimados:'Protege todo tu progreso futuro'
  });
  if (a.pagos_tarde !== 'cero') {
    _addAccion(acciones, {
      fase:3, nivel:'intermedio', prioridad:'alta', area:'pagos',
      accion:'Goodwill letter a CADA acreedor que reporta pagos tarde recientes (<24m). Modelo: explicar circunstancia + historial reciente perfecto + pedir remoción.',
      meta:'30-50% de las marcas de tarde removidas',
      plazo_dias:60, costo:'gratis',
      leccion_ref:['3.3','4.2'],
      por_que:'Goodwill funciona ~30% de las veces con acreedores buenos (Discover, Cap One, Chase). Cada late removida = 30-60 puntos de regreso.',
      puntos_estimados:'+30-90 pts si funciona',
      pasos:[
        'Buscar dirección de "executive customer relations" del banco (no la 800)',
        'Carta de 1 página: contexto + apología + status actual + pedido específico',
        'Adjuntar evidencia de pagos perfectos posteriores',
        'Si rechazan: reintento cada 90 días con persona diferente'
      ]
    });
  }
  if (a.pagos_tarde === 'mas_3' || a.pagos_tarde === '2_3') {
    _addAccion(acciones, {
      fase:3, nivel:'avanzado', prioridad:'alta', area:'pagos',
      accion:'Si las tardes son por un MISMO período (ej: hospital, desempleo) → estrategia "string of lates" + dispute por inaccuracy si las fechas no coinciden exactamente con el sistema del acreedor',
      meta:'Lates removidas por inconsistencia',
      plazo_dias:90, costo:'gratis',
      leccion_ref:['3.2','3.3'],
      por_que:'Los acreedores rara vez reportan las fechas EXACTAS al buró. Si vos demostrás que la fecha reportada no coincide con tu evidencia, el buró debe remover.'
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // FASE 4 · LIMPIEZA DE NEGATIVOS (Semanas 2-6) — solo si hay derogatorios
  // ═══════════════════════════════════════════════════════════════════
  if (tieneDeroga) {
    _addAccion(acciones, {
      fase:4, nivel:'basico', prioridad:'alta', area:'derogatorios',
      accion:'Dispute carta certificada al buró por CADA marca negativa cuestionable. Bajo FCRA tienen 30 días para verificar o remover.',
      meta:'Iniciar 1 dispute por marca cuestionable',
      plazo_dias:14, costo:'bajo',
      leccion_ref:['3.0','3.1','3.2'],
      por_que:'El buró NO investiga — solo manda código al acreedor. Si el acreedor no responde en 30 días, la marca DEBE removerse por ley.',
      pasos:[
        'Carta certificada CON acuse de recibo a cada buró',
        'Específica QUÉ marca + razón (ej: "no es mía", "monto incorrecto", "fecha mal")',
        'Adjuntar copia de tu ID + utility bill (proof of address)',
        'Marcar 30 días en calendario para seguimiento'
      ]
    });
    if (derog.includes('collection')) {
      _addAccion(acciones, {
        fase:4, nivel:'intermedio', prioridad:'alta', area:'derogatorios',
        accion:'Pay-for-delete con la collection agency: carta ofreciendo pagar 30-50% del balance A CAMBIO de remover (no solo marcar paid). ACUERDO POR ESCRITO antes de transferir.',
        meta:'Collection removida del reporte',
        plazo_dias:60, costo:'medio',
        leccion_ref:['3.2'],
        por_que:'Pagar sin pay-for-delete deja la marca 7 años. Pagar CON acuerdo escrito la borra. Las agencias compran deuda al 5-10% del valor — aceptan 30-50%.',
        puntos_estimados:'+30-100 pts por collection removida'
      });
      _addAccion(acciones, {
        fase:4, nivel:'avanzado', prioridad:'media', area:'derogatorios',
        accion:'Validation letter (FDCPA) ANTES de pagar: pedir prueba de que la deuda es tuya, contrato firmado, chain of custody. Muchas no pueden validar.',
        meta:'Collection removida por inability to validate',
        plazo_dias:45, costo:'gratis',
        leccion_ref:['3.2','3.3'],
        por_que:'Las agencias compraron papeles de 5-10 años atrás sin documentación. ~40% no puede validar legalmente. Si no validan en 30 días, deben remover.'
      });
    }
    if (derog.includes('charge_off')) {
      _addAccion(acciones, {
        fase:4, nivel:'intermedio', prioridad:'alta', area:'derogatorios',
        accion:'Si el charge-off es del acreedor original (no vendido): Goodwill letter pidiendo "soft delete" especialmente si lo pagaste o tenés relación activa',
        meta:'Charge-off "Paid as agreed" o removido',
        plazo_dias:90, costo:'gratis',
        leccion_ref:['3.2','3.3'],
        por_que:'Charge-off del original es de los peores. Si pagás SIN acuerdo de remoción, sigue mostrando 7 años. Goodwill tiene ~30% éxito.',
        puntos_estimados:'+50-100 pts si funciona'
      });
    }
    if (derog.includes('judgment')) {
      _addAccion(acciones, {
        fase:4, nivel:'avanzado', prioridad:'alta', area:'derogatorios',
        accion:'Judgment requiere validación legal: pedir certified copy del judgment + proof of service. Si fuiste no notificado correctamente, "Motion to Vacate".',
        meta:'Judgment vacated o expirado',
        plazo_dias:120, costo:'medio',
        leccion_ref:['3.3'],
        por_que:'Si no te notificaron correctamente (sirvieron a dirección vieja), el judgment es vacatable. Eso lo borra como si nunca hubiera existido.'
      });
    }
    if (derog.includes('bankruptcy')) {
      _addAccion(acciones, {
        fase:4, nivel:'pro', prioridad:'alta', area:'derogatorios',
        accion:'BK Cap 7 dura 10 años (Cap 13: 7). NO disputable. Estrategia paralela: construir 3+ tradelines positivas Y aplicar a tarjetas BK-friendly (Capital One, Petal, Mission Lane, OpenSky).',
        meta:'4+ tradelines positivas durante el waiting period',
        plazo_dias:180, costo:'medio',
        leccion_ref:['3.3','4.5'],
        por_que:'Las tarjetas BK-friendly te aprueban 12 meses post-discharge. Cada año post-BK pesa menos. Después de 4 años con buen historial, el FICO puede estar arriba de 700.'
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // FASE 5 · UTILIZATION (30% del FICO) — el factor más rápido de mover
  // ═══════════════════════════════════════════════════════════════════
  if (a.utilization !== 'menos_10') {
    _addAccion(acciones, {
      fase:5, nivel:'basico', prioridad:'alta', area:'utilization',
      accion:'TRUCO #1 · Pagar antes del statement date (no del due date). El balance del statement es el que se reporta al buró.',
      meta:'Statement balance reportado <10% del límite',
      plazo_dias:30, costo:'gratis',
      leccion_ref:['4.4'],
      por_que:'El due date es para evitar pago tarde. El statement date es para utilization. Pagar 2 días antes del statement = $0 reportado al buró = score máximo.',
      puntos_estimados:'+20-50 pts en 1 ciclo'
    });
    _addAccion(acciones, {
      fase:5, nivel:'intermedio', prioridad:'alta', area:'utilization',
      accion:'TRUCO #2 · Pedir Credit Limit Increase (CLI) en TODAS las tarjetas con 6+ meses de antigüedad. La mayoría de issuers (Cap One, Discover, Chase via website) lo hacen con SOFT pull.',
      meta:'+25-100% más límite total',
      plazo_dias:14, costo:'gratis',
      leccion_ref:['4.4','6.4'],
      por_que:'Subir el denominador es más fácil que pagar deuda. $5K balance con $10K límite = 50%. Subís límite a $30K = 17% sin pagar nada.',
      puntos_estimados:'+15-40 pts',
      pasos:[
        'Cap One: login → cuenta → Request Credit Line Increase (cada 6m, soft)',
        'Discover: igual proceso, sin hard pull si tiene 6m+',
        'Chase: llamar reconsideration line si la web no ofrece',
        'Amex: cada 6m por web, NO genera hard pull',
        'Bank of America: por web, OJO algunos generan hard pull'
      ]
    });
  }
  if (['30_49','50_74','mas_75'].includes(a.utilization)) {
    _addAccion(acciones, {
      fase:5, nivel:'avanzado', prioridad:'alta', area:'utilization',
      accion:'AZEO Method (All Zero Except One): pagar TODAS las tarjetas a $0 ANTES del statement. Dejar SOLO una con balance bajo (1-9%). Es la utilization óptima FICO 8.',
      meta:'1 tarjeta reportando 1-9% · resto $0',
      plazo_dias:45, costo:'gratis',
      leccion_ref:['4.4','7.3'],
      por_que:'FICO penaliza tener "muchas tarjetas con balance". AZEO te da el máximo posible. Subir de 30% a AZEO puede dar +60 puntos.',
      puntos_estimados:'+30-60 pts vs. utilization regular'
    });
    _addAccion(acciones, {
      fase:5, nivel:'pro', prioridad:'media', area:'utilization',
      accion:'Balance transfer a tarjeta 0% APR (12-21 meses). Mueve la deuda de tarjetas a una sola → bajas múltiples ratios + ganás tiempo sin interés.',
      meta:'Deuda consolidada a 0% APR',
      plazo_dias:30, costo:'bajo',
      leccion_ref:['7.1','6.5'],
      por_que:'BT fee es 3-5% (mucho menor que 20-29% APR de tarjeta normal). 18 meses de 0% para pagar = $2-5K ahorrados en intereses según el balance.',
      pasos:[
        'Citi Diamond Preferred: 21m 0% BT (best 2026)',
        'Wells Fargo Reflect: 21m 0% BT',
        'Chase Slate Edge: 18m 0% (genera hard pull)',
        'Hacer math: BT fee vs interés futuro = pagás si la diferencia es positiva'
      ]
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // FASE 6 · LENGTH OF HISTORY (15% del FICO)
  // ═══════════════════════════════════════════════════════════════════
  _addAccion(acciones, {
    fase:6, nivel:'basico', prioridad:'media', area:'historial',
    accion:'NUNCA cerrar tarjetas viejas. Si tienen annual fee → pedir "product change" a versión sin fee (mantiene la fecha de apertura).',
    meta:'Cuenta más vieja sigue activa',
    plazo_dias:7, costo:'gratis',
    leccion_ref:['4.5'],
    por_que:'Cerrar tu tarjeta más vieja te puede tirar el promedio de antigüedad de 8 años a 3 — eso son 50+ puntos perdidos. Product change mantiene la fecha.',
    puntos_estimados:'Protege 30-80 pts'
  });
  if (['cero','1_nueva','1_vieja','2_3_nuevas'].includes(a.antiguedad)) {
    _addAccion(acciones, {
      fase:6, nivel:'intermedio', prioridad:'alta', area:'historial',
      accion:'Authorized User en cuenta VIEJA (5+ años) de familiar con buen pago. Suma su antigüedad y utilization a tu reporte.',
      meta:'+5 años de avg age en 14 días',
      plazo_dias:14, costo:'gratis',
      leccion_ref:['4.5'],
      por_que:'El familiar no pierde nada (vos no necesitás la tarjeta física). Su buen historial pasa a tu reporte. Hack de los más rápidos.',
      puntos_estimados:'+30-80 pts en 30 días',
      pasos:[
        'Pedir a padre/tío/amigo con tarjeta de 10+ años',
        'Que te agregue como Authorized User',
        'Verificar que el banco reporte AUs al buró (Amex/Chase/Cap One sí; Discover varía)',
        'Tu reporte muestra esa cuenta como propia para scoring'
      ]
    });
    _addAccion(acciones, {
      fase:6, nivel:'avanzado', prioridad:'media', area:'historial',
      accion:'Tradeline rental: pagar $200-500 por aparecer como AU en una tarjeta de 10-20 años con buen pago. Útil cuando no tenés familia con buen crédito.',
      meta:'1-2 tradelines vieja agregada',
      plazo_dias:30, costo:'medio',
      leccion_ref:['4.5'],
      por_que:'Servicios como Tradeline Supply alquilan tradelines de 10-20 años. Reportan 2 ciclos. Sube avg age + utilization en un mes.',
      puntos_estimados:'+40-100 pts temporal (2 meses)'
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // FASE 7 · CREDIT MIX (10% del FICO)
  // ═══════════════════════════════════════════════════════════════════
  if (mix.includes('ninguno') || mix.length === 0 || (mix.length === 1 && mix[0] !== 'ninguno')) {
    _addAccion(acciones, {
      fase:7, nivel:'basico', prioridad:'media', area:'mix',
      accion:'Credit Builder Loan: $500-1000 en Self, Credit Strong o local credit union. Pagás $50/mes por 12-24m. Te devuelven el dinero al final.',
      meta:'1 installment loan activo reportando',
      plazo_dias:30, costo:'bajo',
      leccion_ref:['4.6'],
      por_que:'Sin installment tu Credit Mix está limitado. CBL no requiere score (es secured) y aporta tipo nuevo al reporte sin riesgo.',
      puntos_estimados:'+10-25 pts'
    });
    _addAccion(acciones, {
      fase:7, nivel:'intermedio', prioridad:'baja', area:'mix',
      accion:'Personal loan pequeño ($1-5K) en credit union local + pagarlo en 6-12 meses. Añade installment y se cierra positivo.',
      meta:'1 personal loan cerrado positivo',
      plazo_dias:180, costo:'bajo',
      leccion_ref:['4.6','5.3'],
      por_que:'Personal loan cerrado positivo = tradeline buena por 10 años después de cerrar. Sube mix + length con 1 sola acción.'
    });
  }
  if (mix.length >= 1 && !mix.includes('auto') && tier !== 'reconstruir' && tier !== 'sin_historial') {
    _addAccion(acciones, {
      fase:7, nivel:'avanzado', prioridad:'baja', area:'mix',
      accion:'Auto loan secured: si necesitás auto, financialo aunque puedas pagarlo cash. Aporta installment grande al reporte.',
      meta:'Auto loan activo reportando',
      plazo_dias:60, costo:'gratis',
      leccion_ref:['4.6'],
      por_que:'Auto loan = installment grande con pago mensual fijo. Sube mix significativamente.'
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // FASE 8 · NEW CREDIT & INQUIRIES (10% del FICO)
  // ═══════════════════════════════════════════════════════════════════
  if (a.consultas === 'mas_6') {
    _addAccion(acciones, {
      fase:8, nivel:'basico', prioridad:'alta', area:'consultas',
      accion:'PAUSA TOTAL de aplicaciones por 6 meses. Las inquiries dejan de afectar score a los 12m (pero quedan visibles 24m).',
      meta:'<3 hard inquiries a futuro 12m',
      plazo_dias:180, costo:'gratis',
      leccion_ref:['4.7','6.1'],
      por_que:'Cada hard inquiry baja 3-10 pts por 12 meses. 6+ inquiries indica desesperación financiera al algoritmo.',
      puntos_estimados:'+10-30 pts cuando caigan'
    });
  }
  _addAccion(acciones, {
    fase:8, nivel:'intermedio', prioridad:'media', area:'consultas',
    accion:'Pre-qualification antes de aplicar: usar herramientas de soft-pull (CardMatch, Chase pre-qualified, Cap One pre-approval) para saber qué tarjetas te dan SI o SÍ antes del hard pull.',
    meta:'0 rechazos por aplicar a ciegas',
    plazo_dias:30, costo:'gratis',
    leccion_ref:['6.1','6.2'],
    por_que:'Aplicar y ser rechazado = hard pull SIN tarjeta. Pre-qual te muestra ofertas con 90%+ probabilidad de aprobación sin tocar tu score.'
  });
  if (tier !== 'sin_historial' && tier !== 'reconstruir') {
    _addAccion(acciones, {
      fase:8, nivel:'avanzado', prioridad:'media', area:'consultas',
      accion:'RONDA DE APLICACIÓN (lección 6.3): aplicar a 3-5 tarjetas el MISMO DÍA. El algoritmo cuenta múltiples inquiries en 14-45 días como 1 (rate shopping).',
      meta:'3-5 tarjetas aprobadas con 1-2 inquiries efectivas',
      plazo_dias:1, costo:'gratis',
      leccion_ref:['6.3','6.4'],
      por_que:'Si vas a abrir 5 tarjetas en 6 meses, mejor el mismo día → solo 1 hard pull cuenta para scoring. Las otras 4 son "shopping".',
      puntos_estimados:'Aprobaciones múltiples = +límite + edad futura'
    });
  }
  _addAccion(acciones, {
    fase:8, nivel:'pro', prioridad:'baja', area:'consultas',
    accion:'Reconsideration line: si te rechazan, llamar a la línea de reconsideration del banco (no la 800 normal) para revertir el rechazo en vivo.',
    meta:'Revertir 30-50% de los rechazos',
    plazo_dias:7, costo:'gratis',
    leccion_ref:['6.4'],
    por_que:'El sistema rechaza automático, pero un agente humano puede aprobar moviendo límite de otra tarjeta o pidiendo info extra. ~40% de éxito.',
    pasos:[
      'Chase recon: 1-888-270-2127',
      'Amex recon: 1-800-567-1083',
      'Cap One recon: 1-800-625-7866',
      'Citi recon: 1-800-695-5171',
      'Decir: "I want to reconsider my application denied on [fecha]"'
    ]
  });

  // ═══════════════════════════════════════════════════════════════════
  // FASE 9 · CONSTRUCCIÓN BANCARIA (Mes 2-3)
  // ═══════════════════════════════════════════════════════════════════
  _addAccion(acciones, {
    fase:9, nivel:'basico', prioridad:'media', area:'bancos',
    accion:'Sólida cuenta corriente primaria 3+ meses (Chase / BoA / Wells / local CU) con depósitos directos regulares.',
    meta:'1 relación bancaria principal sólida',
    plazo_dias:90, costo:'gratis',
    leccion_ref:['5.1'],
    por_que:'Tu banco principal te aprueba productos a tasa preferencial. Tener 3+ meses de actividad mejora aprobación de tarjetas Y préstamos.'
  });
  _addAccion(acciones, {
    fase:9, nivel:'intermedio', prioridad:'media', area:'bancos',
    accion:'Centrífuga bancaria · bonos de bienvenida: abrir cuentas en 3-5 bancos diferentes que pagan $200-500 por nueva cuenta con depósito directo.',
    meta:'$1000-3000 en bonos + 3-5 relaciones',
    plazo_dias:120, costo:'gratis',
    leccion_ref:['5.2','5.4'],
    por_que:'Chase ofrece $300, Cap One $250, BMO $400, etc. Mientras hacés el trabajo de mover el depósito directo, ganás $$ Y relaciones futuras para tarjetas.',
    puntos_estimados:'Sin pts directo, pero acceso a +productos premium'
  });
  _addAccion(acciones, {
    fase:9, nivel:'avanzado', prioridad:'baja', area:'bancos',
    accion:'Credit Unions estratégicos: Penfed, Navy Federal (con vínculo militar), Alliant. Sus tarjetas son más fáciles de aprobar y tienen límites altos.',
    meta:'1-2 cuentas en credit unions premium',
    plazo_dias:60, costo:'gratis',
    leccion_ref:['5.3'],
    por_que:'CUs reportan a los 3 burós pero usan sus propios scoring. Penfed Power Cash Rewards y NFCU cashRewards Plus son de las mejores tarjetas accesibles.'
  });

  // ═══════════════════════════════════════════════════════════════════
  // FASE 10 · APLICACIÓN ESTRATÉGICA DE TARJETAS (Mes 3+)
  // ═══════════════════════════════════════════════════════════════════
  if (a.antiguedad === 'cero') {
    _addAccion(acciones, {
      fase:10, nivel:'basico', prioridad:'alta', area:'tarjetas',
      accion:'Abrir 2 secured cards: Discover Secured + Cap One Quicksilver Secured. Depósito $200-500 c/u. Auto-pay. Usar 5% del límite.',
      meta:'2 tradelines activas en 21 días',
      plazo_dias:21, costo:'medio',
      leccion_ref:['4.1','4.5','6.2'],
      por_que:'Sin historial necesitás iniciar. 2 secured cards dan base. Discover gradúa a unsecured en 12m + devuelve el depósito.'
    });
  }
  if (tier === 'reconstruir' || tier === 'limitado') {
    _addAccion(acciones, {
      fase:10, nivel:'intermedio', prioridad:'alta', area:'tarjetas',
      accion:'Tarjetas de transición (FICO 580-680): Capital One Platinum, Discover IT, Mission Lane Visa, Petal 2. Reportan a 3 burós sin fee.',
      meta:'1-2 tarjetas no-secured aprobadas',
      plazo_dias:30, costo:'gratis',
      leccion_ref:['6.2','6.4'],
      por_que:'Son las "starter cards" de 2026. Aceptan FICO 580+ con probabilidad ~70%. Sin annual fee. Reportan a los 3 burós.'
    });
  }
  if (tier === 'bueno' || tier === 'excelente') {
    _addAccion(acciones, {
      fase:10, nivel:'avanzado', prioridad:'alta', area:'tarjetas',
      accion:'Chase 5/24 strategy: si tenés <5 cuentas en últimos 24m, aplicar a TODAS las Chase quieras AHORA (Sapphire Preferred, Freedom Unlimited, Ink Business). Después de 5, Chase te rechaza por 24m.',
      meta:'3-4 Chase cards con bonuses $1000+ c/u',
      plazo_dias:14, costo:'gratis',
      leccion_ref:['6.3','6.4'],
      por_que:'Chase tiene los mejores sign-up bonuses ($1000+) pero rechaza si tenés 5+ cuentas nuevas. Si calificás, hacer la ronda completa ANTES de cualquier otra aplicación.',
      puntos_estimados:'$3-5K en bonus stacking'
    });
    _addAccion(acciones, {
      fase:10, nivel:'pro', prioridad:'media', area:'tarjetas',
      accion:'Amex pop-up jail / Amex Platinum / Gold / Business stack: Amex tiene "lifetime bonus rule" (1 por tarjeta) pero las business cards no afectan personal 5/24.',
      meta:'Amex personal + business stack',
      plazo_dias:60, costo:'bajo',
      leccion_ref:['6.3','8.4'],
      por_que:'Amex business cards no reportan a personal credit (mejor para tu utilization) Y son la mejor manera de stack puntos para travel.'
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // FASE 11 · BUSINESS CREDIT BUILD (Mes 4-12) — siempre, no solo si meta_uso=business
  // ═══════════════════════════════════════════════════════════════════
  _addAccion(acciones, {
    fase:11, nivel:'basico', prioridad:'media', area:'business',
    accion:'Setup foundational: LLC en TU estado + EIN gratuito en irs.gov + DBA si vendés con otro nombre. Sin esto NO hay business credit.',
    meta:'LLC + EIN activos',
    plazo_dias:30, costo:'medio',
    leccion_ref:['8.1','8.2'],
    por_que:'Business credit corre paralelo al personal pero NO se mezcla. Esto es lo primero. Sin EIN no podés abrir nada de empresa.'
  });
  _addAccion(acciones, {
    fase:11, nivel:'intermedio', prioridad:'media', area:'business',
    accion:'DUNS Number en Dun & Bradstreet (gratis · gov contracts; $189 si lo apurás) + Nav profile (gratis, monitorea business credit) + Experian Business (auto-genera al primer reporte)',
    meta:'3 burós de business activos',
    plazo_dias:30, costo:'bajo',
    leccion_ref:['8.2','8.3'],
    por_que:'Sin perfil en estos 3, las business cards no encuentran tu empresa. DUNS es la identidad legal de tu empresa para B2B.'
  });
  _addAccion(acciones, {
    fase:11, nivel:'intermedio', prioridad:'alta', area:'business',
    accion:'3 Net30 vendors reportando: Uline, Crown Office Supplies, Quill, Grainger. Pedís cualquier cosa pequeña ($50-100), pagás en 15 días, ellos reportan a D&B.',
    meta:'3 tradelines de empresa reportando',
    plazo_dias:90, costo:'bajo',
    leccion_ref:['8.3'],
    por_que:'Necesitás 3+ tradelines en D&B para tener un Paydex score (el FICO de empresa). Sin eso, ninguna business card seria te aprueba.'
  });
  _addAccion(acciones, {
    fase:11, nivel:'avanzado', prioridad:'media', area:'business',
    accion:'Primera business card que NO revisa personal credit (módulo 8.6/8.8): Brex (necesita $50K+ en banco empresa), Capital on Tap, Ramp (B2B), Divvy.',
    meta:'Business card no-personal activa',
    plazo_dias:60, costo:'gratis',
    leccion_ref:['8.4','8.6','8.8'],
    por_que:'Tu personal score deja de ser cuello de botella. Brex aprueba con $50K+ en cuenta empresa SIN mirar tu FICO. Capital on Tap acepta empresas con 3+ meses.'
  });
  _addAccion(acciones, {
    fase:11, nivel:'pro', prioridad:'media', area:'business',
    accion:'Después de 6m de business credit: aplicar a líneas $50K-100K (Bluevine, Fundbox, OnDeck). Estas se basan en revenue empresa, no en tu FICO.',
    meta:'Línea de crédito empresarial $50K+',
    plazo_dias:240, costo:'gratis',
    leccion_ref:['7.2','8.5'],
    por_que:'Estas líneas miran tu revenue mensual ($10K+/mes te abre puertas) y los 6m de paydex. Tu FICO personal puede ser 600 y aprobarte $100K si la empresa lo merece.'
  });

  // ═══════════════════════════════════════════════════════════════════
  // FASE 12 · ACCESO A CAPITAL — la meta final · 7 vías
  // ═══════════════════════════════════════════════════════════════════
  if (a.meta_uso === 'hml') {
    _addAccion(acciones, {
      fase:12, nivel:'avanzado', prioridad:'alta', area:'capital_hml',
      accion:'HML stack: Kiavi (660+, fastest), RCN (620+, flexible), ROC360 (640+), Easy Street Capital (no min · solo equity), Constructive Capital (creative).',
      meta:'2 HMLs aprobados a tasa <12%',
      plazo_dias:90, costo:'gratis',
      leccion_ref:['7.2'],
      por_que:'HMLs no son commodity — algunos miran solo equity (Easy Street), otros score Y experiencia (Kiavi). Tener 2-3 te da palanca de negociación.'
    });
  }
  if (a.meta_uso === 'mortgage') {
    _addAccion(acciones, {
      fase:12, nivel:'avanzado', prioridad:'alta', area:'capital_mortgage',
      accion:'Mortgage stack: Conventional (Fannie/Freddie 620+), FHA (580+ 3.5% down), VA (vet, 0% down, no min), USDA (rural 640+), Non-QM (no min · DSCR · bank stmt loans · ITIN).',
      meta:'Aprobación con APR < market+0.5%',
      plazo_dias:120, costo:'gratis',
      leccion_ref:['4.1','4.4'],
      por_que:'No todos los mortgages requieren score alto. Non-QM lenders (Angel Oak, Athas, Sprout) aceptan ITIN y bank statements. FHA es la entrada con score bajo.'
    });
  }
  if (a.meta_uso === 'dscr') {
    _addAccion(acciones, {
      fase:12, nivel:'avanzado', prioridad:'alta', area:'capital_dscr',
      accion:'DSCR stack 2026: Visio Lending (660+), Velocity (640+), Lima One Capital (proven track), Civic Financial (LTC alto), Constructive Capital (creative for ITIN).',
      meta:'DSCR loan aprobado · 1.25+ ratio',
      plazo_dias:120, costo:'gratis',
      leccion_ref:['4.1'],
      por_que:'DSCR vive del rent/PITI ratio (>1.0). Score importa pero no es el cuello principal. Para ITIN-friendly: Constructive y Athas.'
    });
  }
  if (a.meta_uso === 'heloc' || (a.meta_uso === 'mortgage' && tier === 'bueno')) {
    _addAccion(acciones, {
      fase:12, nivel:'avanzado', prioridad:'media', area:'capital_heloc',
      accion:'HELOC stack: Figure (online · 5 días · 680+), Spring EQ, Discover Home Equity, BoA HELOC (existing customer rate). Equity 20%+ required.',
      meta:'HELOC línea $50K+',
      plazo_dias:60, costo:'bajo',
      leccion_ref:['4.1'],
      por_que:'Figure es el más rápido (5 días). BoA es el más barato si ya sos cliente. Spring EQ acepta investment properties (raro).'
    });
  }
  _addAccion(acciones, {
    fase:12, nivel:'intermedio', prioridad:'media', area:'capital_personal',
    accion:'Personal lines of credit: SoFi ($5K-100K · 680+), LightStream ($5K-100K · 660+), Discover Personal Loan, Marcus by Goldman. Para gap financing en deals.',
    meta:'1-2 personal lines aprobadas',
    plazo_dias:30, costo:'gratis',
    leccion_ref:['7.2'],
    por_que:'Personal loans son gap financing rápido. LightStream funda en 24h. SoFi tiene los mejores rates si tenés ingreso alto.'
  });
  _addAccion(acciones, {
    fase:12, nivel:'pro', prioridad:'media', area:'capital_0apr',
    accion:'0% APR stack: convertir tarjetas en CASH via balance transfer (Citi Diamond 21m), cash advance check, plastiq (paga cualquier factura con tarjeta · 2.5% fee), Curve / Wise Multi (workarounds).',
    meta:'$10K-50K en cash a 0% por 18-21 meses',
    plazo_dias:30, costo:'bajo',
    leccion_ref:['6.5','7.1'],
    por_que:'Si tenés tarjetas con $50K límite y 0% APR, eso ES capital. Plastiq permite pagar mortgage/rent con tarjeta (2.5% fee). Manejado bien = capital gratis 18m.'
  });
  if (a.meta_uso === 'cash' || tier === 'bueno' || tier === 'excelente') {
    _addAccion(acciones, {
      fase:12, nivel:'elite', prioridad:'baja', area:'capital_avanzado',
      accion:'Estrategias avanzadas (lección 7.3): manufactured spending, gift card arbitrage, business loans via revenue (Clearco · Pipe · revenue-based), invoice factoring, equipment financing.',
      meta:'Sistema de capital continuo $10K+/mes',
      plazo_dias:180, costo:'bajo',
      leccion_ref:['7.1','7.3','8.5'],
      por_que:'Estas son las jugadas de los pros que combinan crédito personal + business + manejo de cashflow para tener liquidez constante.'
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
          <h3 class="font-bold text-slate-900 mb-1">${osIcon('credit-card',{size:15})} Diagnóstico de Crédito</h3>
          <p class="text-sm text-slate-600">${total} preguntas en 6 bloques. Al final recibís perfil + plan de acción a 90 días con FICO estimado.</p>
        </div>

        <div class="bg-white border border-emerald-300 rounded-xl p-3 mb-4">
          <div class="flex items-center justify-between flex-wrap gap-2 mb-2">
            <div class="text-xs font-bold uppercase text-emerald-800">${osIcon('user',{size:13})} Diagnóstico para estudiante</div>
            ${selStudent ? `<button onclick="fmCreditSelectStudent(null)" class="text-[10px] text-slate-500 hover:text-red-700">✕ Limpiar</button>` : ''}
          </div>
          ${selStudent ? `
            <div class="bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
              <div class="font-bold text-sm text-slate-900 truncate">${(selStudent.full_name||'').replace(/</g,'&lt;')}</div>
              <div class="text-[11px] text-slate-600">${selStudent.current_stage || 'Sin etapa'} ${selStudent.email ? '· '+selStudent.email : ''}</div>
            </div>
          ` : `
            <div class="text-[11px] text-slate-600 mb-2">Elegí un estudiante para vincular el resultado al CRM (opcional).</div>
            <input id="fm-credit-student-search" type="text" placeholder="Buscar..." value="${(c.studentSearch||'').replace(/"/g,'&quot;')}"
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
          <button onclick="fmCreditReset()" class="px-3 py-2 text-xs text-slate-400 hover:text-slate-600">${osIcon('refresh',{size:12})} Reiniciar</button>
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
              <h1 class="text-3xl font-bold mb-2">${osIcon({sin_historial:'sparkles',reconstruir:'hammer',limitado:'alert',bueno:'check-circle',excelente:'star'}[r.tier]||'circle-dot',{size:26})} ${tl.nombre}</h1>
              <p class="text-sm opacity-90">${tl.resumen}</p>
            </div>
            <div class="flex flex-col gap-2">
              ${selStudent
                ? `<button onclick="fmCreditSavePlan()" class="px-4 py-2 bg-white text-slate-900 rounded-lg text-sm font-bold">${osIcon('save',{size:13})} Guardar plan para ${(selStudent.full_name||'estudiante').replace(/</g,'&lt;')}</button>`
                : `<button onclick="alert('Seleccioná un estudiante antes de guardar.\\n\\nO podés copiar el plan manualmente.')" class="px-4 py-2 bg-white/20 text-white rounded-lg text-sm font-bold cursor-help">${osIcon('save',{size:13})} (Sin estudiante)</button>`
              }
              <button onclick="fmCreditReset()" class="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm">${osIcon('refresh',{size:13})} Repetir</button>
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
          <div class="text-xs font-bold uppercase text-emerald-700 tracking-wider mb-2">${osIcon('target',{size:13})} Objetivo 90 días</div>
          <p class="text-sm text-slate-900 font-medium">${r.objetivo_90d}</p>
        </div>

        <!-- Fortalezas + gaps -->
        <div class="grid md:grid-cols-2 gap-4 mb-6">
          <div class="bg-white border border-slate-200 rounded-xl p-4">
            <h3 class="font-bold text-sm text-slate-900 mb-3">${osIcon('check-circle',{size:14})} Fortalezas (${r.strengths.length})</h3>
            ${r.strengths.length ? r.strengths.map(s => `<div class="text-xs text-emerald-700 mb-1.5">✓ ${s}</div>`).join('') : '<div class="text-xs text-slate-400 italic">Sin fortalezas identificadas todavía.</div>'}
          </div>
          <div class="bg-white border border-slate-200 rounded-xl p-4">
            <h3 class="font-bold text-sm text-slate-900 mb-3">${osIcon('alert',{size:14})} Áreas a mejorar (${r.gaps.length})</h3>
            ${r.gaps.length ? r.gaps.map(g => {
              const colors = { 'crítica':'red', 'alta':'red', 'media':'amber', 'baja':'slate' };
              const col = colors[g.gravedad] || 'slate';
              return `<div class="flex items-center gap-2 mb-1.5"><span class="text-[9px] font-bold bg-${col}-100 text-${col}-700 px-1.5 py-0.5 rounded uppercase">${g.gravedad}</span><span class="text-xs text-slate-700">${g.label}</span></div>`;
            }).join('') : '<div class="text-xs text-emerald-700 italic">Sin gaps detectados. Perfil sólido.</div>'}
          </div>
        </div>

        <!-- Plan de acción PROFUNDO · 12 FASES · cubre los 5 factores FICO + 7 vías de capital -->
        <div class="bg-white border border-slate-200 rounded-xl overflow-hidden mb-6">
          <div class="bg-slate-900 text-white px-5 py-4">
            <div class="flex items-center justify-between flex-wrap gap-2">
              <h3 class="font-bold text-base">${osIcon('clipboard',{size:15})} Plan PROFUNDO · ${r.acciones.length} acciones · 12 fases</h3>
              <div class="text-[10px] opacity-80">Ataca los 5 factores FICO + 7 vías de capital</div>
            </div>
            <div class="mt-3 grid grid-cols-2 md:grid-cols-5 gap-2 text-[10px]">
              <div class="bg-white/15 rounded px-2 py-1.5"><div class="font-bold">35%</div><div class="opacity-80">Payment History</div></div>
              <div class="bg-white/15 rounded px-2 py-1.5"><div class="font-bold">30%</div><div class="opacity-80">Amounts Owed</div></div>
              <div class="bg-white/15 rounded px-2 py-1.5"><div class="font-bold">15%</div><div class="opacity-80">Length History</div></div>
              <div class="bg-white/15 rounded px-2 py-1.5"><div class="font-bold">10%</div><div class="opacity-80">New Credit</div></div>
              <div class="bg-white/15 rounded px-2 py-1.5"><div class="font-bold">10%</div><div class="opacity-80">Credit Mix</div></div>
            </div>
          </div>
          ${fmRenderFaseCredito(r.acciones,  1, osIcon('shield',{size:13}) + ' FASE 1 · Defensa & Monitoreo',           'Semana 1',  'sky')}
          ${fmRenderFaseCredito(r.acciones,  2, osIcon('search',{size:13}) + ' FASE 2 · Diagnóstico Profundo',          'Semana 1-2','indigo')}
          ${fmRenderFaseCredito(r.acciones,  3, osIcon('credit-card',{size:13}) + ' FASE 3 · Payment History (35% del FICO)', 'Mes 1',     'rose')}
          ${fmRenderFaseCredito(r.acciones,  4, osIcon('trash',{size:13}) + ' FASE 4 · Limpieza de Negativos',          'Semana 2-6','red')}
          ${fmRenderFaseCredito(r.acciones,  5, osIcon('zap',{size:13}) + ' FASE 5 · Utilization (30% del FICO)',     'Mes 1-2',   'amber')}
          ${fmRenderFaseCredito(r.acciones,  6, osIcon('hourglass',{size:13}) + ' FASE 6 · Length of History (15%)',         'Mes 2',     'violet')}
          ${fmRenderFaseCredito(r.acciones,  7, osIcon('link',{size:13}) + ' FASE 7 · Credit Mix (10%)',                'Mes 2-3',   'fuchsia')}
          ${fmRenderFaseCredito(r.acciones,  8, osIcon('target',{size:13}) + ' FASE 8 · New Credit & Inquiries (10%)',   'Mes 2-3',   'orange')}
          ${fmRenderFaseCredito(r.acciones,  9, osIcon('landmark',{size:13}) + ' FASE 9 · Construcción Bancaria',          'Mes 2-3',   'cyan')}
          ${fmRenderFaseCredito(r.acciones, 10, osIcon('gem',{size:13}) + ' FASE 10 · Aplicación Estratégica Cards',  'Mes 3+',    'teal')}
          ${fmRenderFaseCredito(r.acciones, 11, osIcon('building',{size:13}) + ' FASE 11 · Business Credit Build',          'Mes 4-12',  'blue')}
          ${fmRenderFaseCredito(r.acciones, 12, osIcon('dollar',{size:13}) + ' FASE 12 · Acceso a Capital (7 vías)',     'Mes 4+',    'emerald')}
        </div>

        <div class="text-[10px] text-slate-500 italic">Plan PROFUNDO mapeado al programa de 42 lecciones · ataca cada factor FICO sistemáticamente · estrategias básica→pro→elite · 7 vías de capital. Validá con broker/lender antes de aplicar. FICO real solo via MyFICO.</div>
      </div>
    </div>
  `;
}

function fmRenderFaseCredito(acciones, faseNum, titulo, plazo, color) {
  const xs = acciones.filter(a => a.fase === faseNum);
  if (!xs.length) return '';
  const colorMap = {
    sky:      { bg:'bg-sky-50',      text:'text-sky-800',      accent:'bg-sky-600' },
    indigo:   { bg:'bg-indigo-50',   text:'text-indigo-800',   accent:'bg-indigo-600' },
    rose:     { bg:'bg-rose-50',     text:'text-rose-800',     accent:'bg-rose-600' },
    red:      { bg:'bg-red-50',      text:'text-red-800',      accent:'bg-red-600' },
    amber:    { bg:'bg-amber-50',    text:'text-amber-800',    accent:'bg-amber-500' },
    violet:   { bg:'bg-violet-50',   text:'text-violet-800',   accent:'bg-violet-600' },
    fuchsia:  { bg:'bg-fuchsia-50',  text:'text-fuchsia-800',  accent:'bg-fuchsia-600' },
    orange:   { bg:'bg-orange-50',   text:'text-orange-800',   accent:'bg-orange-500' },
    cyan:     { bg:'bg-cyan-50',     text:'text-cyan-800',     accent:'bg-cyan-600' },
    teal:     { bg:'bg-teal-50',     text:'text-teal-800',     accent:'bg-teal-600' },
    blue:     { bg:'bg-blue-50',     text:'text-blue-800',     accent:'bg-blue-600' },
    emerald:  { bg:'bg-emerald-50',  text:'text-emerald-800',  accent:'bg-emerald-600' }
  };
  const c = colorMap[color] || colorMap.sky;
  // Conteo por nivel
  const nivelCounts = { basico:0, intermedio:0, avanzado:0, pro:0, elite:0 };
  xs.forEach(x => { nivelCounts[x.nivel || 'basico'] = (nivelCounts[x.nivel || 'basico']||0) + 1; });
  const nivelChips = ['basico','intermedio','avanzado','pro','elite']
    .filter(n => nivelCounts[n] > 0)
    .map(n => `<span class="text-[9px] bg-white/80 ${c.text} px-1 rounded">${n} ${nivelCounts[n]}</span>`)
    .join('');

  return `
    <details class="border-b border-slate-100 last:border-0" open>
      <summary class="${c.bg} ${c.text} px-5 py-3 cursor-pointer hover:opacity-90 flex items-center justify-between flex-wrap gap-2">
        <div class="font-bold text-sm">${titulo}</div>
        <div class="flex items-center gap-2">
          ${nivelChips}
          <div class="text-[10px] uppercase tracking-wider font-bold opacity-75">${plazo} · ${xs.length} acc</div>
        </div>
      </summary>
      <div class="p-4 space-y-3 bg-slate-50/30">
        ${xs.map(a => fmRenderAccionCredito(a, c)).join('')}
      </div>
    </details>
  `;
}

function fmRenderAccionCredito(a, color) {
  const c = color || { accent:'bg-slate-600', text:'text-slate-700' };
  const lecciones = Array.isArray(a.leccion_ref) ? a.leccion_ref : [];
  const pasos = Array.isArray(a.pasos) ? a.pasos : [];

  // Badge de nivel (básico → elite)
  const nivelMap = {
    basico:     '<span class="text-[9px] font-bold bg-green-100 text-green-800 px-1.5 py-0.5 rounded uppercase">Básico</span>',
    intermedio: '<span class="text-[9px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded uppercase">Intermedio</span>',
    avanzado:   '<span class="text-[9px] font-bold bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded uppercase">Avanzado</span>',
    pro:        '<span class="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded uppercase">Pro</span>',
    elite:      '<span class="text-[9px] font-bold bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded uppercase">Elite</span>'
  };
  const nivelBadge = nivelMap[a.nivel || 'basico'] || '';

  const prioBadge = {
    alta: '<span class="text-[9px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded uppercase">Alta</span>',
    media: '<span class="text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded uppercase">Media</span>',
    baja: '<span class="text-[9px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded uppercase">Baja</span>'
  }[a.prioridad] || '';

  const costoBadge = a.costo ? {
    gratis: '<span class="text-[9px] text-emerald-700 font-bold">' + osIcon('check-circle',{size:10}) + ' Gratis</span>',
    bajo:   '<span class="text-[9px] text-slate-600 font-bold">' + osIcon('banknote',{size:10}) + ' Bajo costo</span>',
    medio:  '<span class="text-[9px] text-amber-700 font-bold">' + osIcon('dollar',{size:10}) + ' Costo medio</span>',
    alto:   '<span class="text-[9px] text-red-700 font-bold">' + osIcon('coins',{size:10}) + ' Costo alto</span>'
  }[a.costo] || '' : '';

  return `
    <div class="bg-white border border-slate-200 rounded-lg p-3 hover:shadow-sm transition">
      <div class="flex items-start justify-between gap-2 mb-2 flex-wrap">
        <div class="font-semibold text-sm text-slate-900 flex-1 min-w-[60%]">${a.accion}</div>
        <div class="flex items-center gap-1 flex-wrap">${nivelBadge}${prioBadge}</div>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-2 text-[11px] mb-2">
        <div class="text-emerald-700"><strong>${osIcon('target',{size:11})} Meta:</strong> ${a.meta}</div>
        <div class="text-slate-600"><strong>${osIcon('clock',{size:11})}</strong> ${a.plazo_dias} días · ${costoBadge}</div>
        ${a.puntos_estimados ? `<div class="text-blue-700"><strong>${osIcon('trending-up',{size:11})} Score:</strong> ${a.puntos_estimados}</div>` : ''}
      </div>
      ${a.por_que ? `<div class="bg-slate-50 border-l-2 ${c.accent.replace('bg-','border-')} rounded-r px-3 py-2 text-[11px] text-slate-700 italic mb-2">
        <strong class="not-italic ${c.text}">¿Por qué?</strong> ${a.por_que}
      </div>` : ''}
      ${pasos.length ? `<details class="mb-2">
        <summary class="text-[10px] text-slate-600 font-bold cursor-pointer hover:text-slate-900">${osIcon('pencil-line',{size:11})} Ver pasos detallados (${pasos.length})</summary>
        <ol class="mt-2 ml-4 space-y-1 list-decimal text-[11px] text-slate-700">
          ${pasos.map(p => `<li>${p.replace(/</g,'&lt;')}</li>`).join('')}
        </ol>
      </details>` : ''}
      ${lecciones.length ? `<div class="flex items-center gap-1 flex-wrap mt-1.5">
        <span class="text-[10px] text-slate-500 font-bold mr-1">${osIcon('book',{size:11})} Estudiar:</span>
        ${lecciones.map(L => {
          const titulo = (typeof FM_CREDIT_LESSONS !== 'undefined' && FM_CREDIT_LESSONS[L]) || L;
          return `<span class="inline-flex items-center text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded" title="${titulo.replace(/</g,'&lt;')}">${L}</span>`;
        }).join('')}
      </div>` : ''}
    </div>
  `;
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

    alert(`Diagnóstico crédito guardado para ${student?.full_name || 'estudiante'}\n\nFICO actual: ${c.result.ficoActual || '—'} → meta ${c.result.ficoMeta}\n${tasks.length} acción(es) en el plan\n\nVer en Mentorías Manager.`);
    c.saving = false;
  } catch (e) {
    c.saving = false;
    alert('Error guardando: ' + (e.message || e));
  }
}

