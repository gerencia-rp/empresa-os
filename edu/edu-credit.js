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
      { val:'ciudadano',  label:'🇺🇸 Ciudadano' },
      { val:'residente',  label:'🟢 Residente permanente (Green Card)' },
      { val:'work_visa',  label:'📄 Visa de trabajo (H1B/L1/E2/TN)' },
      { val:'itin',       label:'🆔 ITIN (sin SSN)' },
      { val:'sin_status', label:'❓ Sin status definido' }
    ] },
  { id:'monitoring', bloque:'A · Tu score',
    pregunta:'¿Estás monitoreando tu crédito HOY? (lección 2.1)',
    opciones:[
      { val:'experian',  label:'Sí — Experian / MyFICO (pago, FICO real)' },
      { val:'gratis',    label:'Sí — Credit Karma / Capital One / Chase (gratis, VantageScore)' },
      { val:'nada',      label:'❌ No tengo monitoreo activo' }
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
      { val:'auto',       label:'🚗 Auto loan' },
      { val:'student',    label:'🎓 Student loan' },
      { val:'mortgage',   label:'🏠 Hipoteca' },
      { val:'personal',   label:'💵 Personal loan' },
      { val:'business',   label:'🏢 Business credit' },
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
      { val:'collection',  label:'🚨 Cuenta en colección' },
      { val:'charge_off',  label:'🚨 Charge-off' },
      { val:'judgment',    label:'⚖️ Judgment / lien' },
      { val:'bankruptcy',  label:'💥 Bankruptcy (Cap 7 o 13)' },
      { val:'foreclosure', label:'🏚️ Foreclosure / short sale' },
      { val:'ninguno',     label:'✅ Ninguno — limpio' }
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
      { val:'hml',         label:'💰 Hard Money Lender para flips' },
      { val:'mortgage',    label:'🏠 Mortgage convencional (Fix & Hold)' },
      { val:'dscr',        label:'📊 DSCR loan (rental)' },
      { val:'heloc',       label:'🏚️ HELOC sobre vivienda' },
      { val:'business',    label:'🏢 Business credit / líneas de empresa' },
      { val:'cash',        label:'💵 Convertir tarjetas en cash (lección 6.5)' },
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
  // Plan estructurado en 4 FASES secuenciales (metodología real del programa):
  // FASE 1 · DEFENSA & DIAGNÓSTICO (semana 1)
  // FASE 2 · LIMPIEZA (semanas 2-4) — solo si hay derogatorios
  // FASE 3 · OPTIMIZACIÓN (mes 2)
  // FASE 4 · CONSTRUCCIÓN / ACELERACIÓN (mes 3+)
  const acciones = [];
  const derog = Array.isArray(a.derogatorios) ? a.derogatorios : [];
  const tieneDeroga = derog.length > 0 && !derog.includes('ninguno');

  // ════════ FASE 1 · DEFENSA & DIAGNÓSTICO (semana 1) ════════
  acciones.push({
    fase:1, prioridad:'alta', area:'setup',
    accion:'Bajar los 3 reportes oficiales en annualcreditreport.com (Equifax, Experian, TransUnion) — gratis 1×/semana cada uno',
    meta:'3 reportes en PDF + revisar errores',
    plazo_dias:3,
    leccion_ref:['1.3','2.1'],
    por_que:'Necesitás el reporte REAL antes de planear. Lo que ves en Credit Karma es VantageScore; los lenders usan FICO desde estos burós.'
  });

  if (a.monitoring === 'nada') {
    acciones.push({
      fase:1, prioridad:'alta', area:'setup',
      accion:'Activar monitoreo: Credit Karma (gratis, VantageScore) + MyFICO (pago, FICO real). Anotar score base de HOY.',
      meta:'Monitoreo activo + baseline registrado',
      plazo_dias:3,
      leccion_ref:['2.1','2.2','2.3'],
      por_que:'Sin baseline no podés medir progreso. El programa enseña a interpretar la diferencia entre VantageScore y FICO real.'
    });
  }
  acciones.push({
    fase:1, prioridad:'media', area:'setup',
    accion:'Congelar los 3 burós (Equifax, Experian, TransUnion) — bloquea fraude y aplicaciones no autorizadas',
    meta:'3 burós congelados con PIN guardado',
    plazo_dias:7,
    leccion_ref:['2.4'],
    por_que:'Defensa básica. Se descongela en 1 minuto cuando necesites aplicar a algo real.'
  });
  if (['itin','sin_status'].includes(a.inmigracion)) {
    acciones.push({
      fase:1, prioridad:'alta', area:'setup',
      accion:'Revisar tu reporte ITIN-specific: Experian y TransUnion son los que mejor reportan con ITIN. Usar los métodos específicos para tu caso.',
      meta:'Reporte ITIN confirmado y entendido',
      plazo_dias:7,
      leccion_ref:['2.5'],
      por_que:'Con ITIN la jugada es diferente — no todos los burós te reportan igual y muchos bancos sí aceptan tu perfil.'
    });
  }

  // ════════ FASE 2 · LIMPIEZA (semanas 2-4) — solo si hay derogatorios ════════
  if (tieneDeroga) {
    acciones.push({
      fase:2, prioridad:'alta', area:'derogatorios',
      accion:'Identificar TODAS las marcas negativas del reporte (collections, charge-offs, late payments, judgments) — listarlas con monto, acreedor y fecha',
      meta:'Tabla con cada marca negativa documentada',
      plazo_dias:14,
      leccion_ref:['3.0','3.1'],
      por_que:'No podés disputar lo que no tenés mapeado. El programa enseña qué errores tipo de información personal corregir primero porque son los más fáciles.'
    });
    if (derog.includes('collection')) {
      acciones.push({
        fase:2, prioridad:'alta', area:'derogatorios',
        accion:'Pay-for-delete: negociar con la collection agency pago A CAMBIO de remover del reporte (carta por escrito ANTES de pagar — sin acuerdo escrito, NO pagar)',
        meta:'Collection removida (no solo "paid")',
        plazo_dias:60,
        leccion_ref:['3.2'],
        por_que:'Pagar sin pay-for-delete deja la marca en el reporte 7 años. Pagar CON pay-for-delete la borra. La carta escrita es no-negociable.'
      });
    }
    if (derog.includes('charge_off')) {
      acciones.push({
        fase:2, prioridad:'alta', area:'derogatorios',
        accion:'Goodwill letter al acreedor original pidiendo remover el charge-off (especialmente si ya está pagado o si tu historial general es bueno)',
        meta:'Charge-off removido o actualizado a "paid as agreed"',
        plazo_dias:90,
        leccion_ref:['3.2','3.3'],
        por_que:'Charge-off es de los peores marks. Goodwill funciona ~30% de las veces con acreedores originales — vale el intento.'
      });
    }
    if (derog.includes('judgment')) {
      acciones.push({
        fase:2, prioridad:'alta', area:'derogatorios',
        accion:'Validar el judgment: pedir validación de deuda al acreedor (FDCPA). Si no responde en 30 días, disputar como inexacto.',
        meta:'Judgment validado o removido',
        plazo_dias:60,
        leccion_ref:['3.3'],
        por_que:'Bajo FDCPA tienen que probar la deuda. Muchas agencias compraron papeles viejos sin documentación y no pueden validar.'
      });
    }
    if (derog.includes('bankruptcy') || derog.includes('foreclosure')) {
      acciones.push({
        fase:2, prioridad:'media', area:'derogatorios',
        accion:'BK Cap 7 dura 10 años, Foreclosure 7 años — NO se pueden disputar (son legales). Estrategia: construir 3+ tradelines positivas EN PARALELO para diluir el peso del derog.',
        meta:'3+ cuentas positivas activas mientras pasa el tiempo',
        plazo_dias:180,
        leccion_ref:['3.3','4.5'],
        por_que:'No podés borrar lo que existió legalmente. Pero un reporte con 5 tradelines positivas + 1 BK vieja vale mucho más que solo la BK.'
      });
    }
  }
  if (a.pagos_tarde !== 'cero') {
    acciones.push({
      fase:2, prioridad:'alta', area:'pagos',
      accion:'AUTO-PAY del mínimo en TODAS las tarjetas + reminder 5 días antes del due date. Para los pagos tarde recientes (<24m), enviar goodwill letters.',
      meta:'0 pagos tarde en próximos 6 meses + remover los recientes',
      plazo_dias:7,
      leccion_ref:['4.2','4.3'],
      por_que:'Historial de pagos = 35% del FICO. Un solo pago tarde de 30 días te puede bajar 60-110 puntos.'
    });
  }

  // ════════ FASE 3 · OPTIMIZACIÓN (mes 2) ════════
  if (['30_49','50_74','mas_75','no_se'].includes(a.utilization)) {
    acciones.push({
      fase:3, prioridad:'alta', area:'utilization',
      accion:'Bajar utilization a <10%: (1) Pagar antes del statement date (no del due date), (2) Pedir aumento de credit limit en TODAS las tarjetas (sin hard pull en issuers con 6+ meses), (3) Si tenés más cash, pagar la tarjeta con mayor % primero',
      meta:'Suma de balances ÷ suma de límites < 10%',
      plazo_dias:30,
      leccion_ref:['4.4'],
      por_que:'Utilization = 30% del FICO. Es el CAMBIO MÁS RÁPIDO de score: bajar de 50% a 10% puede subir 30-60 puntos en 1 ciclo. Truco: el saldo que reporta es el del cierre del statement, NO el del due date.'
    });
  }
  if (['mas_6','3_5'].includes(a.consultas)) {
    acciones.push({
      fase:3, prioridad:'alta', area:'consultas',
      accion:'PAUSAR aplicaciones nuevas por 6 meses. Las inquiries pesan 12 meses y caen del scoring a los 24 meses.',
      meta:'< 3 hard inquiries útiles 12m a futuro',
      plazo_dias:180,
      leccion_ref:['4.7','6.1'],
      por_que:'Cada aplicación nueva = -3 a -10 puntos por 12 meses. Si vas a hacer ronda de tarjetas, hacerlas TODAS el mismo día (lección 6.3).'
    });
  }

  // ════════ FASE 4 · CONSTRUCCIÓN (mes 3+) ════════
  if (a.antiguedad === 'cero') {
    acciones.push({
      fase:4, prioridad:'alta', area:'historial',
      accion:'Abrir 2 secured credit cards: Discover Secured + Capital One Secured. Depósito $200-500 c/u. Usar 5-10% del límite. Auto-pay total.',
      meta:'2 tradelines positivas activas en 21 días',
      plazo_dias:21,
      leccion_ref:['4.1','4.5','6.2'],
      por_que:'Sin historial no hay score. 2 cuentas dan estabilidad estadística al algoritmo FICO y se gradúan a tarjetas normales en 12 meses.'
    });
  }
  if (['1_nueva','1_vieja','2_3_nuevas'].includes(a.antiguedad)) {
    acciones.push({
      fase:4, prioridad:'media', area:'historial',
      accion:'Aumentar mix: convertirte en Authorized User en cuenta VIEJA (5+ años) de familiar con buen historial. Suma su antigüedad y utilization a TU reporte.',
      meta:'+5 años de historial promedio en 14 días',
      plazo_dias:14,
      leccion_ref:['4.5'],
      por_que:'El familiar no asume riesgo (no necesitas la tarjeta física). Su historial pasa al tuyo. Es uno de los hacks más rápidos para subir antigüedad.'
    });
  }
  const mix = Array.isArray(a.mix_credito) ? a.mix_credito : [];
  if (mix.includes('ninguno') || mix.length === 0) {
    acciones.push({
      fase:4, prioridad:'media', area:'mix',
      accion:'Agregar credit-builder loan ($500-1000 en Self o Credit Strong). Pagás $50/mes 18-24m. Suma installment al reporte sin gastar dinero real (te lo devuelven al final).',
      meta:'1 installment loan reportando',
      plazo_dias:30,
      leccion_ref:['4.6'],
      por_que:'Credit Mix = 10% del FICO. Tener solo tarjetas limita tu score techo. Un installment activo abre el siguiente nivel.'
    });
  }

  // ════════ ESTRATEGIA BANCARIA & APLICACIONES (mes 3-4) ════════
  if (tier !== 'sin_historial' && tier !== 'reconstruir') {
    acciones.push({
      fase:4, prioridad:'media', area:'estrategia',
      accion:'Centrífuga bancaria: abrir cuentas en 3-5 bancos diferentes para generar relaciones (lección 5.4). Algunos te pagan $200-500 por abrir cuenta nueva (lección 5.2).',
      meta:'3-5 relaciones bancarias activas',
      plazo_dias:60,
      leccion_ref:['5.1','5.2','5.3','5.4'],
      por_que:'Bancos donde tenés cuenta corriente son ~3× más probables de aprobarte tarjeta sin hard pull. La centrífuga construye esta red.'
    });
  }

  // ════════ ACCIONES POR META (mes 3+) ════════
  if (a.meta_uso === 'hml') {
    acciones.push({
      fase:4, prioridad:'alta', area:'meta',
      accion:'HMLs típicos (Kiavi, RCN, ROC360) piden FICO 660+. Flexibles 2026 aceptan 620+ con LTV reducido. Si tenés 700+, negociar puntos. Si <620, pausar HML y enfocar en subir score primero.',
      meta:'Calificar HML con tasa <12% y puntos <3',
      plazo_dias:90,
      leccion_ref:['7.2'],
      por_que:'HMLs miran principalmente equity y exit strategy, pero un FICO bajo te sube 2-3 puntos en costo del préstamo. Vale la pena llegar a 660+.'
    });
  }
  if (a.meta_uso === 'mortgage') {
    acciones.push({
      fase:4, prioridad:'alta', area:'meta',
      accion:'Mortgage convencional pide 620+ (FHA 580+). Empujar a 720+ para evitar PMI y obtener mejor APR. Diferencia 680 vs 760 = $50K+ en intereses totales en una casa de $400K.',
      meta:'FICO 720+ antes de aplicar',
      plazo_dias:120,
      leccion_ref:['4.1','4.4'],
      por_que:'Para un mortgage tradicional el score IMPORTA tanto como el ingreso. Cada 20 puntos arriba de 700 te ahorra dinero real.'
    });
  }
  if (a.meta_uso === 'dscr') {
    acciones.push({
      fase:4, prioridad:'alta', area:'meta',
      accion:'DSCR loan ignora DTI personal pero pide FICO 660+ y reserves (6 meses de PITI). Subir score y juntar reserves en paralelo.',
      meta:'FICO 680+ + 6m reserves líquidos',
      plazo_dias:120,
      leccion_ref:['4.1'],
      por_que:'DSCR mira la renta de la propiedad como ingreso, NO el tuyo. Pero el score y reserves son no-negociables.'
    });
  }
  if (a.meta_uso === 'heloc') {
    acciones.push({
      fase:4, prioridad:'alta', area:'meta',
      accion:'HELOC requiere equity 20%+, FICO 680+ y DTI <43%. Verificar valor actual de tu vivienda (Redfin/Zillow) y el equity disponible.',
      meta:'Aprobación HELOC tasa <prime+1%',
      plazo_dias:60,
      leccion_ref:['4.1'],
      por_que:'HELOC es el dinero más barato para invertir si ya tenés equity. La key es: NO usarlo para gastos personales, solo para deal.'
    });
  }
  if (a.meta_uso === 'business') {
    acciones.push({
      fase:4, prioridad:'alta', area:'meta',
      accion:'Iniciar build de Business Credit: (1) LLC + EIN, (2) Net30 vendors para reportes a Dun & Bradstreet, (3) primera business credit card. Hay tarjetas que NO revisan tu crédito personal.',
      meta:'Business credit perfil activo en Nav/D&B',
      plazo_dias:90,
      leccion_ref:['8.1','8.2','8.3','8.6','8.8'],
      por_que:'Crédito de empresa = límites más altos sin afectar tu personal. Y los bancos del Módulo 8 que NO revisan tu personal son la llave si tu score personal está limitado.'
    });
  }
  if (a.meta_uso === 'cash') {
    acciones.push({
      fase:4, prioridad:'media', area:'meta',
      accion:'Convertir tarjetas en cash via balance transfer a 0% APR (12-18 meses) o cash-back optimization. Estrategias específicas en lección 6.5 y 7.1.',
      meta:'Cash deployable de tu límite de crédito',
      plazo_dias:30,
      leccion_ref:['6.5','7.1'],
      por_que:'Las tarjetas son tu banco más flexible si las usás bien. 0% APR durante 18 meses = dinero gratis para deal si lo pagás antes que termine.'
    });
  }
  if (a.meta_uso === 'mejorar' && tier === 'bueno') {
    acciones.push({
      fase:4, prioridad:'media', area:'meta',
      accion:'Empujar de 700+ a 760+: foco en (1) utilization <5%, (2) edad promedio de cuentas creciente, (3) NO abrir tarjetas innecesarias.',
      meta:'FICO 760+ en 6 meses',
      plazo_dias:180,
      leccion_ref:['4.4','4.5','7.3'],
      por_que:'De 720 a 760 hay diferencia mínima en aprobación pero significativa en tasa. Vale la pena cuando vas a comprar mortgage o auto.'
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

        <!-- Plan de acción ESTRUCTURADO en 4 FASES (metodología real) -->
        <div class="bg-white border border-slate-200 rounded-xl overflow-hidden mb-6">
          <div class="bg-slate-900 text-white px-5 py-3 flex items-center justify-between">
            <h3 class="font-bold">📋 Plan de acción (${r.acciones.length} acciones · 4 fases)</h3>
            <div class="text-[10px] opacity-80">Mapeado a lecciones del programa</div>
          </div>
          ${fmRenderFaseCredito(r.acciones, 1, '🛡️ FASE 1 · Defensa & Diagnóstico', 'Semana 1', 'sky')}
          ${fmRenderFaseCredito(r.acciones, 2, '🧹 FASE 2 · Limpieza de Marcas Negativas', 'Semanas 2-4', 'red')}
          ${fmRenderFaseCredito(r.acciones, 3, '⚙️ FASE 3 · Optimización (utilization / inquiries)', 'Mes 2', 'amber')}
          ${fmRenderFaseCredito(r.acciones, 4, '🚀 FASE 4 · Construcción & Aceleración', 'Mes 3+', 'emerald')}
        </div>

        <div class="text-[10px] text-slate-500 italic">Plan mapeado al programa de 42 lecciones (Módulos 1-8). Cada acción cita las lecciones específicas a estudiar primero. Validá con broker/lender antes de aplicar a productos. FICO real solo via MyFICO.</div>
      </div>
    </div>
  `;
}

function fmRenderFaseCredito(acciones, faseNum, titulo, plazo, color) {
  const xs = acciones.filter(a => a.fase === faseNum);
  if (!xs.length) return '';
  const colorMap = {
    sky:      { bg:'bg-sky-50',     border:'border-sky-200',     text:'text-sky-800',     accent:'bg-sky-600' },
    red:      { bg:'bg-red-50',     border:'border-red-200',     text:'text-red-800',     accent:'bg-red-600' },
    amber:    { bg:'bg-amber-50',   border:'border-amber-200',   text:'text-amber-800',   accent:'bg-amber-500' },
    emerald:  { bg:'bg-emerald-50', border:'border-emerald-200', text:'text-emerald-800', accent:'bg-emerald-600' }
  };
  const c = colorMap[color] || colorMap.sky;
  return `
    <div class="border-b border-slate-100 last:border-0">
      <div class="${c.bg} ${c.text} px-5 py-2 flex items-center justify-between">
        <div class="font-bold text-sm">${titulo}</div>
        <div class="text-[10px] uppercase tracking-wider font-bold opacity-75">${plazo} · ${xs.length} acción${xs.length===1?'':'es'}</div>
      </div>
      <div class="p-4 space-y-3">
        ${xs.map(a => fmRenderAccionCredito(a, c)).join('')}
      </div>
    </div>
  `;
}

function fmRenderAccionCredito(a, color) {
  const c = color || { accent:'bg-slate-600', text:'text-slate-700' };
  const lecciones = Array.isArray(a.leccion_ref) ? a.leccion_ref : [];
  const prioBadge = {
    alta: '<span class="text-[9px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded uppercase">Alta</span>',
    media: '<span class="text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded uppercase">Media</span>',
    baja: '<span class="text-[9px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded uppercase">Baja</span>'
  }[a.prioridad] || '';

  return `
    <div class="bg-white border border-slate-200 rounded-lg p-3 hover:shadow-sm transition">
      <div class="flex items-start justify-between gap-2 mb-2">
        <div class="font-semibold text-sm text-slate-900 flex-1">${a.accion}</div>
        ${prioBadge}
      </div>
      <div class="grid grid-cols-2 gap-2 text-[11px] mb-2">
        <div class="text-emerald-700"><strong>🎯 Meta:</strong> ${a.meta}</div>
        <div class="text-slate-600 text-right"><strong>⏱</strong> ${a.plazo_dias} días</div>
      </div>
      ${a.por_que ? `<div class="bg-slate-50 border-l-2 ${c.accent.replace('bg-','border-')} rounded-r px-3 py-2 text-[11px] text-slate-700 italic mb-2">
        <strong class="not-italic ${c.text}">¿Por qué?</strong> ${a.por_que}
      </div>` : ''}
      ${lecciones.length ? `<div class="flex items-center gap-1 flex-wrap mt-1.5">
        <span class="text-[10px] text-slate-500 font-bold mr-1">📚 Estudiar:</span>
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

    alert(`✅ Diagnóstico crédito guardado para ${student?.full_name || 'estudiante'}\n\nFICO actual: ${c.result.ficoActual || '—'} → meta ${c.result.ficoMeta}\n${tasks.length} acción(es) en el plan\n\nVer en Mentorías Manager.`);
    c.saving = false;
  } catch (e) {
    c.saving = false;
    alert('Error guardando: ' + (e.message || e));
  }
}

