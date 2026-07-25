// ════════════════════════════════════════════════════════════
// 🎯 Nueva vista plan robusto tipo Miguel Guzmán (extraído de education.js)
// Render del plan generado con bloques + acciones.
// ════════════════════════════════════════════════════════════

// ─── NUEVA VISTA: Plan robusto tipo Miguel Guzmán ───
function fmRenderDiagPlan() {
  let r, a, p, userProfile, bloques, analisisProfundo, objetivoOperativo, reglaPlan, checklistFinal;
  try {
    r = fmState.diagResult;
    a = r.answers || {};
    p = r.perfil || { num: 1, nombre: 'Sin definir', emoji: '🏁', color: 'blue' };
    if (!Array.isArray(r.fortalezas)) r.fortalezas = [];
    if (!Array.isArray(r.gaps)) r.gaps = [];

    userProfile = {
      mercado: a.mercado_estado || 'tu mercado',
      estrategiaLabel: a.objetivo === 'flip' ? 'Fix & Flip' :
                       a.objetivo === 'hold' ? 'Fix & Hold' :
                       a.objetivo === 'hibrido' ? 'Mix Flip + Hold' :
                       a.objetivo === 'escalar' ? 'Escala de negocio' :
                       a.objetivo === 'lender' ? 'Private Money Lending' : 'Fix & Flip'
    };

    bloques = fmGenerarBloques(userProfile, a);
    analisisProfundo = fmGenerarAnalisisProfundo(p, r, a, userProfile);
    objetivoOperativo = fmGenerarObjetivoOperativo(userProfile, a);
    reglaPlan = fmGenerarReglaPlan(p, a);
    checklistFinal = fmGenerarChecklistFinal(bloques, a);

    // Filtrar bloques según modo de detalle elegido
    var bloquesVisibles = fmFiltrarBloquesPorModo(bloques, fmState.diagModo);
  } catch (err) {
    console.error('[fmRenderDiagPlan setup]', err);
    return `<div class="p-8 max-w-3xl mx-auto"><div class="bg-red-50 border border-red-200 rounded-xl p-6"><h3 class="font-bold text-red-900 mb-2">${osIcon('alert')} Error generando plan</h3><pre class="text-xs text-red-700 bg-white p-3 rounded border overflow-x-auto whitespace-pre-wrap">${escapeHtml(String(err?.message || err))}</pre><button onclick="fmDiagReset()" class="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm">${osIcon('refresh')} Reiniciar diagnóstico</button></div></div>`;
  }

  return `
    <div class="h-full overflow-y-auto bg-slate-50" id="fm-plan-print">
      <!-- Header del plan -->
      <div class="bg-gradient-to-br from-slate-900 to-slate-800 text-white print:bg-white print:text-slate-900">
        <div class="max-w-5xl mx-auto px-8 py-8">
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1">
              <div class="text-xs font-bold text-amber-400 tracking-wider mb-2 print:text-amber-700">FLIPMENTORÍA · PLAN DE TRABAJO PERSONALIZADO</div>
              <h1 class="text-3xl font-bold mb-2">${p.emoji} Plan de Trabajo · ${p.nombre}</h1>
              <p class="text-sm text-slate-300 print:text-slate-600">Perfil #${p.num} · ${r.etapa} · ${r.cronograma}</p>
            </div>
            <div class="flex gap-2 print:hidden">
              ${fmState.diagStudentId ? (() => {
                const sel = (eduState.students||[]).find(s => s.id === fmState.diagStudentId);
                const name = sel ? (sel.full_name || 'estudiante') : 'estudiante';
                return `<button onclick="fmLinkPlanAStudiante('${fmState.diagStudentId}', '${sel?.mentorship_id||''}')" class="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg text-sm font-bold" title="Guardar y vincular directo a ${name.replace(/"/g,'&quot;')}">Guardar plan para ${name.replace(/</g,'&lt;')}</button>`;
              })() : `<button onclick="fmAbrirVincularEstudiante()" class="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-lg text-sm font-bold">${osIcon('save')} Vincular a estudiante (CRM)</button>`}
              <button onclick="fmDiagPrintPlan()" class="px-4 py-2 bg-white text-slate-900 rounded-lg text-sm font-medium hover:bg-slate-100">${osIcon('printer')} Imprimir</button>
              <button onclick="fmDiagCopyPlan()" class="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-600">${osIcon('clipboard')} Copiar</button>
              <button onclick="fmDiagReset()" class="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-600">${osIcon('refresh')} Repetir</button>
            </div>
          </div>
          <div class="mt-6 bg-blue-900 bg-opacity-50 print:bg-blue-50 rounded-lg p-4 border border-blue-700 print:border-blue-200">
            <div class="text-xs font-bold text-blue-300 print:text-blue-700 tracking-wider mb-1">OBJETIVO OPERATIVO</div>
            <p class="text-sm font-medium print:text-slate-900">${objetivoOperativo}</p>
          </div>
          <div class="mt-3 bg-amber-900 bg-opacity-50 print:bg-amber-50 rounded-lg p-3 border border-amber-700 print:border-amber-200">
            <span class="text-xs font-bold text-amber-300 print:text-amber-700 tracking-wider">REGLA DEL PLAN: </span>
            <span class="text-sm">${reglaPlan}</span>
          </div>
        </div>
      </div>

      <!-- Análisis profundo del cliente -->
      <div class="max-w-5xl mx-auto px-8 py-8">
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
          <h2 class="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <span>${osIcon('search')}</span> Análisis Profundo del Cliente
          </h2>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
            <div class="bg-slate-50 rounded-lg p-3">
              <div class="text-xs font-bold text-slate-500 tracking-wider mb-1">PERFIL</div>
              <div class="font-bold text-slate-900">#${p.num} ${p.nombre}</div>
            </div>
            <div class="bg-slate-50 rounded-lg p-3">
              <div class="text-xs font-bold text-slate-500 tracking-wider mb-1">ETAPA ACTUAL</div>
              <div class="font-bold text-slate-900">${r.etapa}</div>
            </div>
            <div class="bg-slate-50 rounded-lg p-3">
              <div class="text-xs font-bold text-slate-500 tracking-wider mb-1">CRONOGRAMA</div>
              <div class="font-bold text-slate-900 text-sm">${r.cronograma}</div>
            </div>
          </div>

          <div class="space-y-4 text-sm text-slate-700 leading-relaxed">
            ${analisisProfundo.map(parrafo => `<p>${parrafo}</p>`).join('')}
          </div>

          <!-- Fortalezas + Riesgos lado a lado -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
            <div class="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <h4 class="text-sm font-bold text-emerald-900 mb-2">${osIcon('check-circle')} Fortalezas identificadas</h4>
              <ul class="space-y-1 text-xs text-emerald-900">
                ${r.fortalezas.length ? r.fortalezas.map(f => `<li class="flex gap-1.5"><span>•</span><span>${f}</span></li>`).join('') : '<li class="italic text-emerald-700">Estás empezando — esa es tu primera fortaleza: claridad para construir desde cero.</li>'}
              </ul>
            </div>
            <div class="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 class="text-sm font-bold text-red-900 mb-2">${osIcon('alert')} Riesgos críticos a mitigar</h4>
              <ul class="space-y-1 text-xs text-red-900">
                ${fmGenerarRiesgos(a, p).map(r => `<li class="flex gap-1.5"><span>•</span><span>${r}</span></li>`).join('')}
              </ul>
            </div>
          </div>
        </div>

        <!-- Selector de modo de detalle -->
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6 print:hidden">
          <h3 class="font-bold text-slate-900 mb-2">${osIcon('ruler')} ¿Cuánto detalle querés ver del plan?</h3>
          <p class="text-xs text-slate-600 mb-3">El plan completo tiene ${bloques.length} bloques (~${fmTotalHoras(bloques)} horas de trabajo total). Elegí el nivel de detalle según para qué lo necesitás.</p>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
            ${[
              { id: 'panorama', label: 'Panorama', desc: 'Lista de bloques sin detalle', count: '0 bloques abiertos' },
              { id: 'foco', label: 'Foco', desc: 'Solo el bloque actual', count: '1 bloque' },
              { id: 'medio', label: 'Trimestre', desc: 'Próximos 3-4 bloques', count: `${Math.min(4, bloques.length)} bloques` },
              { id: 'completo', label: 'Completo', desc: 'TODO hasta meta final', count: `${bloques.length} bloques` }
            ].map(m => {
              const active = fmState.diagModo === m.id;
              return `<button onclick="fmDiagSetModo('${m.id}')" class="text-left px-3 py-3 rounded-lg border-2 transition ${active ? 'border-amber-500 bg-amber-50' : 'border-slate-200 hover:border-amber-300'}">
                <div class="text-sm font-bold ${active ? 'text-amber-900' : 'text-slate-900'} mb-0.5">${m.label}</div>
                <div class="text-xs text-slate-600">${m.desc}</div>
                <div class="text-xs ${active ? 'text-amber-700' : 'text-slate-400'} mt-1">${m.count}</div>
              </button>`;
            }).join('')}
          </div>
        </div>

        <!-- TOC de Bloques -->
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
          <div class="flex items-start justify-between mb-3">
            <div>
              <h2 class="text-xl font-bold text-slate-900">${osIcon('clipboard')} Plan de Acción · ${bloques.length} Bloques</h2>
              <p class="text-sm text-slate-600 mt-1">Camino completo desde hoy hasta tu meta final. Cada bloque incluye qué hacer paso por paso, qué entregar, qué herramientas usar y errores comunes.</p>
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            ${bloques.map((b, i) => {
              const visible = bloquesVisibles.includes(b);
              const expandido = fmState.diagExpandidos[b.id] === true;
              return `
              <a href="#bloque-${b.id}" onclick="fmDiagExpandirBloque('${b.id}'); event.preventDefault(); setTimeout(() => document.getElementById('bloque-${b.id}')?.scrollIntoView({behavior:'smooth'}), 50);" class="px-3 py-2 ${visible || expandido ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50 border border-transparent hover:bg-slate-100'} rounded-lg flex items-center gap-3 text-sm transition cursor-pointer">
                <div class="w-7 h-7 rounded-full ${visible || expandido ? 'bg-amber-500' : 'bg-slate-700'} text-white font-bold text-xs flex items-center justify-center flex-shrink-0">${i + 1}</div>
                <div class="flex-1 min-w-0">
                  <div class="text-xs font-bold text-amber-700">${b.etapa}</div>
                  <div class="text-sm font-medium text-slate-900 truncate">${b.subetapa}</div>
                </div>
                <div class="text-xs text-slate-500 flex-shrink-0">${visible || expandido ? '▼' : osIcon('play')}</div>
              </a>
            `;}).join('')}
          </div>
        </div>

        <!-- Bloques visibles según modo -->
        ${(() => {
          const visibles = bloques.filter(b => bloquesVisibles.includes(b) || fmState.diagExpandidos[b.id]);
          return visibles.map((b, i) => {
            const realIdx = bloques.indexOf(b);
            const prevEtapa = i > 0 ? visibles[i-1].etapa : null;
            // Si cambia la etapa (o es el primer bloque visible), insertar header de etapa
            const showEtapaHeader = b.etapa !== prevEtapa;
            return (showEtapaHeader ? fmRenderEtapaHeader(b.etapa) : '') + fmRenderBloque(b, realIdx, userProfile, a);
          }).join('');
        })()}

        ${fmState.diagModo !== 'completo' && bloques.length > bloquesVisibles.length ? `
          <div class="bg-amber-50 border-2 border-dashed border-amber-300 rounded-2xl p-6 text-center mb-6 print:hidden">
            <p class="text-sm text-amber-900 mb-3">Hay <strong>${bloques.length - bloquesVisibles.length} bloques más</strong> en el plan completo hasta tu meta final.</p>
            <button onclick="fmDiagSetModo('completo')" class="px-5 py-2.5 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700">${osIcon('book')} Ver plan completo</button>
          </div>
        ` : ''}

        <!-- Checklist Final -->
        <div class="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl shadow-sm p-6 mb-6 print:bg-white print:text-slate-900 print:border print:border-slate-300">
          <h2 class="text-xl font-bold mb-2 flex items-center gap-2"><span>${osIcon('check-circle')}</span> Checklist Final</h2>
          <p class="text-sm text-slate-300 print:text-slate-600 mb-4">Vas a estar listo para tu primer (o próximo) deal cuando todos estos ítems estén ✓:</p>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            ${checklistFinal.map(item => `
              <div class="flex items-start gap-2 text-sm">
                <span class="text-amber-400 print:text-amber-700 mt-0.5">☐</span>
                <span>${item}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Frase final -->
        <div class="bg-amber-50 border-l-4 border-amber-500 rounded-r-2xl p-6 mb-6">
          <div class="text-xs font-bold text-amber-700 tracking-wider mb-2">FRASE FINAL QUE DEBÉS PODER SOSTENER</div>
          <p class="text-lg italic text-slate-900 font-medium leading-relaxed">${fmGenerarFraseFinal(userProfile, a)}</p>
        </div>

        <!-- Botones acción al final -->
        <div class="flex gap-3 print:hidden">
          <button onclick="fmDiagOpenLibrary()" class="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">${osIcon('book')} Abrir Biblioteca</button>
          <button onclick="fmDiagPrintPlan()" class="flex-1 px-4 py-3 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800">${osIcon('printer')} Imprimir Plan</button>
          <button onclick="fmDiagReset()" class="px-4 py-3 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300">${osIcon('refresh')} Nuevo diagnóstico</button>
        </div>

      </div>
    </div>

    <style>
      @media print {
        #fm-plan-print { background: white !important; }
        .print\\:hidden { display: none !important; }
        .print\\:bg-white { background: white !important; }
        .print\\:text-slate-900 { color: #211e17 !important; }
        .print\\:border { border: 1px solid #e8e3d9 !important; }
        .print\\:bg-blue-50 { background: #EFF6FF !important; }
        .print\\:bg-amber-50 { background: #FFFBEB !important; }
        .print\\:text-amber-700 { color: #8a6400 !important; }
        .print\\:text-blue-700 { color: #275c43 !important; }
      }
    </style>
  `;
}

// Mapa educativo de las 6 etapas — se muestra cuando un bloque arranca una etapa nueva
const FM_ETAPA_MAP = {
  'PRE-E0': {
    nombre: 'Pre-Fundación · Reconstrucción de Crédito',
    icono: '🪜',
    proposito: 'Antes de poder formar LLC y pedir HML, necesitás el crédito en orden. Esto es un track paralelo que no bloquea avanzar con el resto.',
    aprenderas: 'Cómo leer un reporte de crédito, identificar qué baja el score, reconstruirlo con secured cards + utilización < 30% + on-time pagos, y monitorear progreso mensual.',
    despues: 'E0 — Fundación legal y mental'
  },
  'E0': {
    nombre: 'Fundación · Bases legales, mentales y financieras',
    icono: osIcon('landmark'),
    proposito: 'Construir las bases legales (LLC, EIN, banco), mentales (Big Why, disciplina) y de equipo (CPA, abogado) ANTES de buscar deals. Sin estas bases, todo lo demás se cae.',
    aprenderas: 'Cómo proteger tu patrimonio con LLC en el estado correcto, formar Operating Agreement, obtener EIN, abrir cuenta bancaria de negocio, definir tu Big Why, instalar bloque diario no negociable, y armar tu equipo mínimo.',
    despues: 'E1 — Evaluar mercado y deals con criterio'
  },
  'E1': {
    nombre: 'Evaluar · Criterio de mercado y análisis de deals',
    icono: osIcon('search'),
    proposito: 'Aprender a leer el mercado y filtrar deals con números reales — no con intuición ni con lo que dice el wholesaler.',
    aprenderas: 'Cómo definir Buy Box operativo en 5 ZIPs, validar ARV con comparables vendidos, aplicar MAO (Máxima Oferta Aceptable) a 10+ propiedades, y descartar rápido lo que no funciona.',
    despues: 'E2 — Estructurar capital y financiamiento'
  },
  'E1/E2': {
    nombre: 'Evaluar + Estructurar (paralelo)',
    icono: osIcon('refresh'),
    proposito: 'Estos bloques mezclan análisis de deals + setup financiero. Avanzás los dos frentes en paralelo.',
    aprenderas: 'Cómo justificar ofertas por MAO con números reales y al mismo tiempo cerrar tu HML.',
    despues: 'E3 — Ofertar con autoridad'
  },
  'E2/E1': {
    nombre: 'Estructurar + Evaluar (paralelo)',
    icono: osIcon('refresh'),
    proposito: 'Estos bloques mezclan setup financiero + análisis de deals. Avanzás los dos frentes en paralelo.',
    aprenderas: 'Cómo cerrar HML y al mismo tiempo seguir analizando deals con MAO.',
    despues: 'E3 — Ofertar con autoridad'
  },
  'E2': {
    nombre: 'Estructurar · Capital y financiamiento listos',
    icono: osIcon('banknote'),
    proposito: 'Separar capital líquido del teórico y dejar el financiamiento pre-aprobado ANTES de ofertar. Los wholesalers no te toman en serio sin esto.',
    aprenderas: 'Cuánto earnest money podés poner, cuánto gap cubrir, cuántos meses de reservas necesitás, qué HMLs comparar y cómo conseguir 5 term sheets reales.',
    despues: 'E3 — Generar deal flow y ofertar'
  },
  'E3': {
    nombre: 'Ofertar · Red operativa y ofertas con autoridad',
    icono: osIcon('mail'),
    proposito: 'Construir red de wholesalers + realtors para que entren deals constantes y empezar a ofertar como buyer serio.',
    aprenderas: 'Cómo posicionarte ante wholesalers, armar tu pitch de buyer, ofertar con LOI + Proof of Funds, y hacer follow-up disciplinado para subir tasa de aceptación.',
    despues: 'E4 — Ejecutar tu primer deal'
  },
  'E4': {
    nombre: 'Ejecutar · Cerrar y operar tu primer deal',
    icono: osIcon('hammer'),
    proposito: 'Cerrar tu primer deal de forma controlada: due diligence completa, scope of work claro, GCs gestionados con disciplina.',
    aprenderas: 'Cómo correr inspecciones, armar SOW realista, manejar GC y subcontratistas con draw schedule, controlar presupuesto y cronograma sin sorpresas.',
    despues: 'E5 — Salir del deal con margen'
  },
  'E5': {
    nombre: 'Salir · Venta o renta con margen + sistema',
    icono: '🏁',
    proposito: 'Vender o rentar con la mejor estrategia para maximizar margen, documentar SOPs y construir el próximo deal con sistema.',
    aprenderas: 'Pricing real de salida, staging, elegir broker correcto, cuándo bajar precio, cuándo rentar vs vender, refinanciar con DSCR loan, y armar SOPs reproducibles.',
    despues: 'Escalar a 2+ deals/año con equipo'
  },
  'REVISIÓN': {
    nombre: 'Revisión · Preparación para sesión con mentor',
    icono: osIcon('chart'),
    proposito: 'Preparar todo el contexto para sacar el máximo provecho de tu próxima sesión con el coach.',
    aprenderas: 'Cómo armar un caso completo para revisión: números, decisiones, dudas concretas, screenshots de evidencia.',
    despues: 'Próxima sesión y siguiente ciclo'
  }
};

function fmRenderEtapaHeader(etapa) {
  const info = FM_ETAPA_MAP[etapa];
  if (!info) return '';
  return `
    <div class="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-5 mb-4 mt-6 first:mt-0 shadow-md print:bg-white print:text-slate-900 print:border print:border-slate-300">
      <div class="flex items-center gap-3 mb-3">
        <div class="text-3xl">${info.icono}</div>
        <div>
          <div class="text-[10px] font-bold tracking-widest text-amber-400 print:text-amber-700">ETAPA ${etapa} · MAPA EDUCATIVO</div>
          <div class="text-xl font-bold">${info.nombre}</div>
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
        <div class="bg-white/10 print:bg-blue-50 print:border print:border-blue-200 rounded p-2.5">
          <div class="text-[10px] font-bold text-amber-300 print:text-amber-800 mb-1">${osIcon('target')} PROPÓSITO DE ESTA ETAPA</div>
          <div class="text-slate-100 print:text-slate-800 leading-relaxed">${info.proposito}</div>
        </div>
        <div class="bg-white/10 print:bg-emerald-50 print:border print:border-emerald-200 rounded p-2.5">
          <div class="text-[10px] font-bold text-emerald-300 print:text-emerald-800 mb-1">${osIcon('brain')} QUÉ VAS A APRENDER</div>
          <div class="text-slate-100 print:text-slate-800 leading-relaxed">${info.aprenderas}</div>
        </div>
        <div class="bg-white/10 print:bg-blue-50 print:border print:border-blue-200 rounded p-2.5">
          <div class="text-[10px] font-bold text-blue-300 print:text-blue-800 mb-1">➡️ DESPUÉS DE ESTA ETAPA</div>
          <div class="text-slate-100 print:text-slate-800 leading-relaxed">${info.despues}</div>
        </div>
      </div>
    </div>
  `;
}

// Genera criterios de éxito a partir del entregable + reglas heurísticas
function fmGenerarCriteriosBloque(b) {
  const criterios = [];
  // Si el entregable existe, descomponerlo
  if (b.entregable) {
    const parts = b.entregable.split(/[.+]/).map(s => s.trim()).filter(s => s.length > 8);
    parts.forEach(p => criterios.push(p));
  }
  // Reglas por tipo de bloque
  const obs = (b.observacion || '').toLowerCase();
  const sub = (b.subetapa || '').toLowerCase();
  if (sub.includes('llc') && b.etapa === 'E0') {
    criterios.push('Tenés Certificate of Formation aprobado en mano (no pendiente del estado)');
    criterios.push('La cuenta bancaria de negocio acepta depósitos y tiene tarjeta crédito activa');
  }
  if (sub.includes('big why')) {
    criterios.push('El Big Why está escrito (no solo en tu cabeza) y compartido con al menos 2 personas');
    criterios.push('El bloque diario aparece recurrente en tu calendario los próximos 90 días');
  }
  if (sub.includes('buy box')) {
    criterios.push('Podés enviarle el Buy Box de 1 página a un wholesaler hoy mismo');
    criterios.push('Podés explicar tu pitch en menos de 60 segundos sin leer');
  }
  if (sub.includes('comparables') || sub.includes('arv')) {
    criterios.push('Tenés screenshots de 3+ comps vendidos por cada ZIP del Buy Box');
    criterios.push('Tu ARV conservador es más bajo que el ARV "optimista" del wholesaler');
  }
  if (sub.includes('mao') || sub.includes('análisis')) {
    criterios.push('Tu plantilla incluye holding costs, closing costs y contingencia');
    criterios.push('Descartaste el 70%+ de las propiedades que analizaste — esa es buena señal');
  }
  if (sub.includes('hml')) {
    criterios.push('Tenés 5 term sheets en PDF de HMLs distintos (no solo conversaciones)');
    criterios.push('Sabés exactamente cuánto interés, points y LTV te ofrece tu HML primario');
  }
  if (sub.includes('wholesaler')) {
    criterios.push('Te están enviando deals SIN que pidas — eso es la prueba real');
    criterios.push('Respondés cada deal en < 24h con análisis (aunque sea para descartar)');
  }
  return [...new Set(criterios)].slice(0, 5);
}

function fmRenderBloque(b, idx, p, a) {
  const actividadStr = typeof b.actividad === 'function' ? b.actividad(p, a) : b.actividad;
  const pasos = typeof b.pasos === 'function' ? b.pasos(p, a) : (b.pasos || []);
  const criterios = fmGenerarCriteriosBloque(b);
  return `
    <div id="bloque-${b.id}" class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
      <!-- Header del bloque -->
      <div class="bg-slate-900 text-white px-6 py-4 flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-amber-500 text-slate-900 font-bold text-lg flex items-center justify-center flex-shrink-0">${idx + 1}</div>
        <div class="flex-1">
          <div class="text-xs font-bold text-amber-300 tracking-wider">BLOQUE ${idx + 1} · ${b.etapa}</div>
          <div class="text-lg font-bold">${b.subetapa}</div>
        </div>
      </div>

      <!-- Observación del mentor -->
      <div class="px-6 pt-5">
        <div class="bg-blue-50 border-l-4 border-blue-500 rounded-r-lg p-4">
          <div class="text-xs font-bold text-blue-700 tracking-wider mb-1">OBSERVACIÓN DEL MENTOR</div>
          <p class="text-sm text-slate-800 leading-relaxed">${b.observacion}</p>
        </div>
      </div>

      <!-- Tabla del bloque -->
      <div class="p-6">
        <table class="w-full border border-slate-300 text-sm">
          <tbody>
            <tr class="border-b border-slate-300">
              <th class="bg-slate-800 text-white text-left p-3 w-1/3 align-top font-bold text-sm">${osIcon('clock')} Tiempo estimado</th>
              <td class="p-3 align-top">${b.tiempo}</td>
            </tr>
            <tr class="border-b border-slate-300">
              <th class="bg-slate-800 text-white text-left p-3 align-top font-bold text-sm">${osIcon('target')} Actividad</th>
              <td class="p-3 align-top">${actividadStr}</td>
            </tr>
            <tr class="border-b border-slate-300">
              <th class="bg-slate-800 text-white text-left p-3 align-top font-bold text-sm">${osIcon('package')} Entregable</th>
              <td class="p-3 align-top font-medium">${b.entregable}</td>
            </tr>
            <tr class="border-b border-slate-300">
              <th class="bg-slate-800 text-white text-left p-3 align-top font-bold text-sm">Paso a paso</th>
              <td class="p-3 align-top">
                <ol class="space-y-1.5 list-decimal list-inside text-slate-800">
                  ${pasos.map(paso => `<li>${paso}</li>`).join('')}
                </ol>
              </td>
            </tr>
            ${criterios.length ? `
              <tr class="border-b border-slate-300">
                <th class="bg-emerald-800 text-white text-left p-3 align-top font-bold text-sm">${osIcon('check-circle')} Cómo sabés que el bloque está LISTO</th>
                <td class="p-3 align-top bg-emerald-50/40">
                  <ul class="space-y-1.5 text-slate-800">
                    ${criterios.map(c => `<li class="flex gap-2"><span class="text-emerald-600 font-bold">✓</span><span>${c}</span></li>`).join('')}
                  </ul>
                </td>
              </tr>` : ''}
            <tr class="border-b border-slate-300">
              <th class="bg-slate-800 text-white text-left p-3 align-top font-bold text-sm">${osIcon('wrench')} Recursos y herramientas</th>
              <td class="p-3 align-top">
                <ul class="space-y-1.5">
                  ${b.recursos.map(r => `
                    <li class="text-sm">
                      <a href="${r.url}" target="_blank" rel="noopener" class="text-blue-600 hover:underline font-medium">${r.nombre}</a>
                      <span class="text-slate-600">— ${r.desc}</span>
                    </li>
                  `).join('')}
                </ul>
              </td>
            </tr>
            <tr>
              <th class="bg-slate-800 text-white text-left p-3 align-top font-bold text-sm">${osIcon('alert')} Errores reales que veo todo el tiempo</th>
              <td class="p-3 align-top">
                <ul class="space-y-1 text-slate-800">
                  ${b.errores.map(e => `<li class="flex gap-2"><span class="text-red-500">•</span><span>${e}</span></li>`).join('')}
                </ul>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Nota educativa de cierre del bloque -->
      <div class="px-6 pb-5">
        <div class="bg-amber-50 border-l-4 border-amber-500 rounded-r p-3 text-xs text-amber-900 print:bg-amber-50 print:border-amber-500">
          <strong>${osIcon('map-pin')} Antes de pasar al siguiente bloque:</strong> revisá los criterios de éxito arriba. Si alguno queda flojo, no avances — el siguiente bloque va a chocar con esa debilidad. La metodología funciona en secuencia.
        </div>
      </div>
    </div>
  `;
}

function fmGenerarObjetivoOperativo(p, a) {
  if (a.objetivo === 'lender') {
    return `Soy private money lender. Presto capital con Note + Deed of Trust en 1st lien position, evalúo operadores con framework propio, diversifico entre 3-5 operadores, y obtengo 8-12% anual sobre capital prestado.`;
  }
  if (a.objetivo === 'wholesale') {
    return `Hago wholesaling en ${p.mercado}, encuentro deals off-market con lead gen propio (1 canal dominado), cierro 1-2 assignments/mes con fee promedio $10K-$20K, y construyo capital para hacer mi primer flip propio en 12 meses.`;
  }
  const estrategiaTxt = a.objetivo === 'hold' ? 'Fix & Hold' : a.objetivo === 'hibrido' ? 'Mix Flip + Hold' : 'Fix & Flip';
  const metaTxt = a.meta_deals === '1' ? '1 deal' : a.meta_deals === '2_3' ? '2-3 deals' : a.meta_deals === '4_6' ? '4-6 deals' : '7+ deals';
  return `Compro propiedades en ${p.mercado}, con estrategia ${estrategiaTxt}, ${metaTxt} en los próximos 12 meses, con capital de ${fmCapitalRange(a.capital)}, HML primario pre-aprobado y red operativa de 25+ wholesalers, 3 GCs y CPA/abogado activos.`;
}

function fmCapitalRange(c) {
  // Cuando no hay rango específico devuelve un string fallback que SE DETECTA en fmGenerarAnalisisProfundo
  // (busca === 'definido') — si cambiás el string, actualizá tieneRangoReal.
  return ({ 'menos_20k': 'menos de $20K', '20_50k': 'entre $20K y $50K', '50_100k': 'entre $50K y $100K', '100_250k': 'entre $100K y $250K', 'mas_250k': 'más de $250K' })[c] || 'definido';
}

function fmGenerarReglaPlan(p, a) {
  if (a.objetivo === 'lender') return 'Due diligence sólida + estructura legal correcta + diversificación entre operadores.';
  if (a.objetivo === 'wholesale') return 'Lead gen propio + buyer list activa + contratos legales en paralelo.';
  if (p.num === 2) return 'Reconstruir crédito + LLC + ofertas en paralelo. Cada track tiene su propio ritmo, ninguno bloquea al otro.';
  if (p.num === 4 && (a.deals_cerrados === '5_mas')) return 'SOPs documentados + capital diversificado + equipo construido ANTES de escalar a múltiples deals simultáneos.';
  return 'Crédito en paralelo + deals en paralelo + contactos en paralelo. No esperás a tener todo perfecto; trabajás los 3 frentes a la vez.';
}

function fmGenerarAnalisisProfundo(p, r, a, userProfile) {
  const parrafos = [];

  // ── Helpers robustos: nunca devuelven undefined ──
  const nombre = (userProfile && userProfile.name) ? String(userProfile.name).split(' ')[0] : '';
  const saludo = nombre ? `${nombre}, ` : '';

  // Nombre del perfil (humano, no "#undefined undefined")
  const perfilNombre = p && p.nombre ? p.nombre :
    (a.deals_cerrados === '0' ? 'Inversor en formación' :
     a.deals_cerrados === '1_2' ? 'Inversor con experiencia inicial' :
     a.deals_cerrados === '3_5' ? 'Operador en consolidación' :
     a.deals_cerrados === '5_mas' ? 'Operador en escalamiento' : 'Inversor en desarrollo');

  // Etapa con nombre humano (no solo "E0")
  const etapaNombre = ({
    'E0': 'Fundación — construir las bases legales, mentales y financieras',
    'E1': 'Evaluar — desarrollar criterio de mercado y análisis de deals',
    'E2': 'Estructurar — capital y financiamiento listos antes de ofertar',
    'E3': 'Ofertar — generar deal flow y empezar a hacer ofertas reales',
    'E4': 'Ejecutar — cerrar y operar tu primer deal',
    'E5': 'Salir — vender o rentar con margen y construir el siguiente'
  })[r.etapa] || (r.etapa || 'Inicial');

  // Tiempo disponible
  const tiempoTxt = a.tiempo === 'mas_30' ? 'tiempo full-time (30+ horas/semana)' :
    a.tiempo === '15_30' ? 'medio tiempo (15-30 horas/semana)' :
    a.tiempo === 'menos_15' ? 'tiempo limitado (menos de 15 horas/semana)' :
    'el tiempo que tenés disponible para dedicar';

  // ──────────────────────────────────────────────────────────────
  // PÁRRAFO 1 — Apertura humana: dónde estás y qué significa
  // ──────────────────────────────────────────────────────────────
  parrafos.push(`${saludo}después de leer tus respuestas, este es el diagnóstico que armamos. Estás ubicado en la <strong>etapa ${r.etapa}: ${etapaNombre}</strong>. Eso significa que tu foco ahora no es comprar tu primera propiedad — es preparar todo lo que va antes de poder hacerlo bien. La metodología FlipMentoría está pensada para que avances en orden: primero las bases, después el criterio de mercado, después el capital, después las ofertas, después la ejecución y por último la salida. Saltarte etapas es la causa #1 de pérdidas en este negocio.`);

  parrafos.push(`Tu cronograma esperado para llegar al primer hito grande (tu primer deal cerrado y rentado) es de <strong>${r.cronograma || '9 a 15 meses'}</strong>. Eso no es lento — es realista. Las personas que prometen "primer deal en 60 días" generalmente terminan perdiendo dinero porque saltaron las bases. Vos vas a ir más lento al principio para ir mucho más rápido después. Trabajás con <strong>${tiempoTxt}</strong>, ${a.tiempo === 'menos_15' ? 'lo cual significa que tenés que ser quirúrgico con las prioridades — no podés perseguir 5 cosas a la vez, vas a enfocarte en lo que el bloque actual te pide.' : 'lo cual te permite avanzar a buen ritmo si la disciplina diaria se sostiene.'}`);

  // ──────────────────────────────────────────────────────────────
  // PÁRRAFO 2 — Capital con explicación clara
  // ──────────────────────────────────────────────────────────────
  const capitalRango = fmCapitalRange(a.capital);
  const tieneRangoReal = capitalRango !== 'definido';
  const liquidoTxt = a.capital_real === 'todo' ? '100% líquido (lo tenés disponible en 24-48 horas)' :
    a.capital_real === 'mitad' ? 'cerca de la mitad líquido y el resto entre cuentas o inversiones que tardan en moverse' :
    a.capital_real === 'minimo' ? 'mínimamente líquido — la mayoría está atado en otras inversiones' :
    a.capital_real === 'teorico' ? 'mayoritariamente teórico — está prometido o por construir, no disponible hoy' :
    'parcialmente disponible';

  parrafos.push(`<strong>Sobre tu capital:</strong> ${tieneRangoReal ? `reportaste un rango de <strong>${capitalRango}</strong>, y está <strong>${liquidoTxt}</strong>.` : `está <strong>${liquidoTxt}</strong>.`} En este negocio hay una regla que vas a leer muchas veces: <em>el capital teórico no compra propiedades</em>. ${a.capital_real === 'teorico' || a.capital_real === 'minimo' ? 'Antes de hacer cualquier oferta formal, vas a tener que convertir parte de ese capital en líquido real. Sin esto, los Hard Money Lenders no van a aprobarte y los wholesalers no van a mandarte deals porque saben que no podés cerrar. Esto NO bloquea avanzar — podés trabajar en las bases (E0) y en el criterio de mercado (E1) mientras resolvés el capital en paralelo.' : 'Esto te da capacidad real de cerrar deals con HML cuando aparezca la oportunidad. Tu trabajo ahora es asegurarte de no quemar ese capital en el primer deal — guardar reservas para imprevistos y mantener disciplina con el MAO (Máxima Oferta Aceptable).'} ${a.fuentes_capital === 'a_construir' ? 'Además, mencionaste que tenés que CONSTRUIR fuentes adicionales de capital. Esto se hace en paralelo: las primeras semanas vas a estar levantando private money, evaluando partnerships o ahorrando agresivamente, mientras el resto del plan avanza.' : ''}`);

  // ──────────────────────────────────────────────────────────────
  // PÁRRAFO 3 — Crédito explicado
  // ──────────────────────────────────────────────────────────────
  const creditTxt = ({
    'mas_780': 'arriba de 780',
    '720_780': 'entre 720 y 780',
    '660_720': 'entre 660 y 720',
    '600_660': 'entre 600 y 660',
    'menos_600': 'por debajo de 600',
    'sin_historial': 'sin historial crediticio en USA todavía'
  })[a.credit] || null;

  if (creditTxt) {
    if (a.credit === 'menos_600' || a.credit === '600_660' || a.credit === 'sin_historial') {
      parrafos.push(`<strong>Sobre tu crédito:</strong> tu score está <strong>${creditTxt}</strong>. Esto es importante explicarte porque muchos creen que es un bloqueo y no lo es. Los Hard Money Lenders nacionales (Kiavi, Lima One, RCN, Easy Street, Constructive Capital) ya aceptan scores desde 620 — solo te bajan el LTV (Loan-to-Value, cuánto te prestan sobre el valor) del 80% al 70-75%. ${a.credit === 'menos_600' || a.credit === 'sin_historial' ? 'Con score abajo de 600 o sin historial, tenés 3 caminos: (1) reconstruir crédito 6-12 meses antes de aplicar, (2) buscar HMLs ITIN-friendly que aceptan sin SSN, (3) hacer partnership con un socio que ponga el crédito mientras vos ponés capital y operación. Mientras tanto NO te quedes parado — las E0 y E1 avanzan igual.' : 'Tu score está en zona limítrofe. Subirlo a 720+ destraba 5% más de LTV y 1-2% menos de tasa. Vamos a trabajar esto en paralelo: pagar revolving balances debajo del 30% de utilización, no abrir cuentas nuevas, mantener pagos perfectos.'} Recordá: <em>el crédito es un track paralelo</em>, no bloquea avanzar con lo demás.`);
    } else {
      parrafos.push(`<strong>Sobre tu crédito:</strong> tu score está <strong>${creditTxt}</strong>, lo cual te da acceso a los Hard Money Lenders estándar (Kiavi, Lima One, RCN, Easy Street) con condiciones razonables. Esto significa que el cuello de botella de tu negocio NO va a ser el financiamiento — va a ser encontrar el deal correcto al precio correcto. Tu trabajo ahora es mantener ese score: pagos siempre on-time, utilización debajo del 30%, no abrir cuentas nuevas en los próximos 6 meses si vas a aplicar a HML.`);
    }
  }

  // ──────────────────────────────────────────────────────────────
  // PÁRRAFO 4 — Setup legal explicado
  // ──────────────────────────────────────────────────────────────
  if (a.llc === 'no') {
    parrafos.push(`<strong>Sobre tu setup legal:</strong> todavía no tenés LLC formada. Esto es la tarea #1 del bloque E0 — <em>no se hacen ofertas de propiedades sin LLC</em>. ¿Por qué? Porque si firmás un contrato de compra como persona natural y algo sale mal (un demanda del comprador final, un accidente en la obra, un problema con un contratista), arriesgás tu patrimonio personal completo: tu casa, tus ahorros, tus autos, todo. La LLC es el escudo que separa tu vida personal de tu negocio. Formarla toma 1 a 4 semanas dependiendo del estado, así que se arranca HOY mismo en paralelo al estudio de mercado. No es un trámite — es protección legal real.`);
  } else if (a.llc === 'si_otro') {
    parrafos.push(`<strong>Sobre tu setup legal:</strong> tenés LLC formada pero en un estado distinto al de inversión. Esto genera lo que se llama "foreign LLC registration" — vas a pagar filing fees en los dos estados y vas a tener compliance doble (reportes anuales, registered agent, etc). La solución más limpia es formar una segunda LLC en el estado donde vas a invertir, o si querés mantener la única, hacer el foreign registration formal con un abogado de real estate. Esto se decide en el bloque E0 antes de cualquier oferta.`);
  } else if (a.llc === 'si_mismo') {
    const setupItems = Array.isArray(a.setup_legal) ? a.setup_legal : [];
    const completo = setupItems.includes('ein') && setupItems.includes('operating') && setupItems.includes('banco') && setupItems.includes('contabilidad') && setupItems.includes('cpa');
    const labels = { ein: 'EIN del IRS', operating: 'Operating Agreement', banco: 'Cuenta bancaria de negocio', contabilidad: 'Software contable conectado', cpa: 'CPA de real estate', abogado: 'Abogado de real estate' };
    const faltan = ['ein','operating','banco','contabilidad','cpa','abogado'].filter(x => !setupItems.includes(x)).map(x => labels[x]);
    parrafos.push(`<strong>Sobre tu setup legal:</strong> ${completo ? 'lo tenés <strong>completo</strong> — LLC en el estado correcto, EIN, Operating Agreement firmado, banco, contabilidad y CPA activos. Esto es una fortaleza grande, porque el 80% de los principiantes se traban acá durante meses. Vos ya superaste esa barrera, podés enfocarte en lo realmente productivo.' : `lo tenés <strong>parcial</strong>. Te falta(n): ${faltan.join(', ')}. Completar esto es prerequisito antes de la primera oferta — no es burocracia, es la infraestructura que te permite operar como negocio real.`}`);
  }

  // ──────────────────────────────────────────────────────────────
  // PÁRRAFO 5 — Red operativa y momentum
  // ──────────────────────────────────────────────────────────────
  const ofertasTxt = a.ofertas_mes === '10_mas' ? 'haciendo 10 o más ofertas por mes' :
    a.ofertas_mes === '1_9' ? 'haciendo entre 1 y 9 ofertas por mes' :
    a.ofertas_mes === 'analisis_no_oferta' ? 'analizando deals pero sin ofertar todavía' :
    a.ofertas_mes === 'cero' ? 'sin ofertas formales todavía' : null;
  const wsTxt = a.wholesalers === '10_mas' ? 'con 10+ wholesalers activos' :
    a.wholesalers === '3_9' ? 'con 3 a 9 wholesalers' :
    a.wholesalers === '1_2' ? 'con 1 o 2 wholesalers ocasionales' :
    a.wholesalers === 'cero' ? 'sin wholesalers activos todavía' : null;

  if (ofertasTxt && wsTxt) {
    parrafos.push(`<strong>Sobre tu momentum actual:</strong> estás <strong>${ofertasTxt}</strong> y <strong>${wsTxt}</strong>. ${a.ofertas_mes === 'cero' || a.ofertas_mes === 'analisis_no_oferta' ? 'Acá hay un patrón clásico: la mayoría de los principiantes se traban entre "analizando deals" y "haciendo ofertas reales". Te leés 50 libros, mirás 100 propiedades en Zillow, y nunca enviás una LOI (Letter of Intent). El plan está diseñado específicamente para romper ese bloqueo: en E1 vas a definir tu Buy Box, en E2 vas a pre-aprobar HML, y en E3 vas a empezar a mandar ofertas con criterio. El target real es 10+ ofertas/mes — sin volumen no hay deals cerrados.' : 'Tenés momentum operativo. Tu foco ahora es subir la tasa de aceptación: identificar mejor el pain real del vendedor, escribir LOIs más limpias y cerrar más rápido cuando el vendedor dice sí.'}`);
  }

  // ──────────────────────────────────────────────────────────────
  // PÁRRAFO 6 — Obstáculo principal y cómo el plan lo ataca
  // ──────────────────────────────────────────────────────────────
  const obstaculoMap = {
    'capital': { txt: 'el capital insuficiente o no líquido', plan: 'En el bloque "Capital Stack real" vas a separar líquido, probable y teórico. Después vamos a explorar opciones: private money (gente que conozcas), partnerships, HELOC sobre propiedad propia, o usar wholesaling como puente para generar capital rápido sin riesgo. No hace falta esperar años para arrancar.' },
    'conocimiento': { txt: 'la falta de conocimiento técnico (ARV, MAO, contratos)', plan: 'Los bloques de E1 están diseñados para esto exactamente. Vas a analizar 50 propiedades calculando ARV con comparables vendidos, vas a aplicar MAO a 10 de ellas, y vas a leer 3 contratos reales línea por línea con un abogado. Al final de E1 vas a poder analizar cualquier propiedad en 15 minutos.' },
    'red': { txt: 'la red de contactos inexistente o débil', plan: 'Los bloques "Base mínima de contactos" + "Wholesalers y pitch" te llevan de 0 a 25 contactos activos en 30-45 días. Tenés un script para llamadas, plantillas de email, y un sistema para hacer follow-up. No es networking improvisado — es un proceso reproducible.' },
    'tiempo': { txt: 'el tiempo limitado por otras responsabilidades', plan: 'Para esto la metodología tiene una respuesta clara: bloque diario de 90 minutos NO NEGOCIABLE. No 2 horas algunos días y 0 otros — 90 minutos todos los días a la misma hora. Eso son 10 horas/semana de trabajo enfocado, suficiente para avanzar.' },
    'miedo': { txt: 'la parálisis por análisis o miedo a ofertar', plan: 'Para parálisis la solución NO es más información — es forzar volumen de ofertas. 10 ofertas/semana durante 30 días rompe el bloqueo mental. La mayoría de esas ofertas van a ser rechazadas, y eso es exactamente lo que necesitás: aprender que un rechazo no te mata.' },
    'mercado': { txt: 'la dificultad encontrando deals que pasen el filtro', plan: 'Esto se ataca en dos frentes: (1) ampliar las fuentes de deals (wholesalers + realtors investor-friendly + direct mail + auctions) y (2) bajar el filtro a algo realista. Los deals "perfectos" no existen — buscamos deals que cumplan el 70% rule con margen para sorpresas.' },
    'equipo': { txt: 'la necesidad de equipo para escalar', plan: 'Acá vamos a documentar tus SOPs (Standard Operating Procedures) primero, después contratar Project Manager, después delegar la primera obra. Sin SOPs no podés delegar — terminás reentrenando a cada persona desde cero.' }
  };
  const obs = obstaculoMap[a.mayor_obstaculo];
  if (obs) {
    parrafos.push(`<strong>Sobre tu mayor obstáculo:</strong> identificaste <strong>${obs.txt}</strong> como lo que más te frena. Es importante que el plan ataque eso directamente y no te dé generalidades. ${obs.plan}`);
  }

  // ──────────────────────────────────────────────────────────────
  // PÁRRAFO 7 — Cierre + cómo usar este plan
  // ──────────────────────────────────────────────────────────────
  parrafos.push(`<strong>Cómo usar este plan:</strong> la metodología FlipMentoría funciona por bloques en secuencia. Cada bloque tiene un propósito educativo (qué vas a aprender), un entregable concreto (qué tenés que producir), tareas paso a paso, criterios de éxito (cómo sabés que está listo) y errores comunes a evitar. <em>No saltes bloques.</em> Si terminás antes de tiempo, repasá los criterios de éxito — probablemente algo quedó a medias. Si te atascás, llamá a tu mentor antes de improvisar. Este plan es tu hoja de ruta: si lo seguís en orden, vas a estar listo para tu primer deal en el cronograma que mencionamos arriba.`);

  return parrafos;
}

function fmGenerarRiesgos(a, p) {
  const riesgos = [];
  if (a.capital_real === 'teorico') riesgos.push('Capital declarado es teórico — no se puede ofertar con esto.');
  if (a.capital_real === 'minimo') riesgos.push('Mayoría del capital no líquido — convertir a líquido es prerequisito.');
  if (a.credit === 'menos_600') riesgos.push('Credit score <600 bloquea HMLs estándar — track de reconstrucción 6-12 meses.');
  if (a.credit === 'sin_historial') riesgos.push('Sin historial credit USA — necesita build credit desde cero o partnership.');
  if (a.llc === 'no' && a.deals_cerrados !== '0') riesgos.push('Operar sin LLC con deals activos es riesgo legal alto.');
  if (a.hml_status === 'ninguno' && a.objetivo !== 'wholesale' && a.objetivo !== 'lender') riesgos.push('Sin HML pre-aprobado, las ofertas se rechazan automáticamente (90%).');
  if (a.deals_cerrados === '0' && a.ofertas_mes === 'cero') riesgos.push('Sin ofertas formales en último mes — riesgo de parálisis por análisis.');
  if (a.wholesalers === 'cero' && a.objetivo !== 'lender') riesgos.push('Sin wholesalers activos = dependencia única en MLS (poco margen).');
  if (a.deals_cerrados === '5_mas' && a.gc_status !== 'primario_backup') riesgos.push('5+ deals sin GC primario+backup es riesgo operativo crítico.');
  if (a.tiempo === 'menos_15' && a.meta_deals !== '1') riesgos.push('Tiempo limitado + meta agresiva = cronograma irreal — ajustar meta o tiempo.');
  if (a.inmigracion === 'internacional' && a.deals_cerrados === '0') riesgos.push('Inversor internacional sin ITIN obtenido — agregar 6-11 semanas al cronograma.');
  if (riesgos.length === 0) riesgos.push('Sin riesgos críticos identificados — momentum positivo, mantener disciplina de hábitos.');
  return riesgos;
}

function fmGenerarChecklistFinal(bloques, a) {
  const items = [];

  // Items base por etapa de bloques activos
  const etapas = new Set(bloques.map(b => b.etapa));
  if (etapas.has('PRE-E0')) {
    items.push('Credit score subiendo (mínimo +50 puntos en 6 meses).');
    items.push('Secured credit card activa con pagos 100% on-time.');
  }
  if (etapas.has('E0')) {
    items.push('LLC aprobada por el Secretary of State.');
    items.push('EIN del IRS obtenido.');
    items.push('Operating Agreement firmado.');
    items.push('Cuenta bancaria de negocio + tarjeta crédito activas.');
    items.push('Software de contabilidad conectado al banco.');
    items.push('CPA + abogado de real estate identificados.');
    items.push('Big Why escrito + bloque diario 90 min en calendario.');
    items.push('Quick Win semana 1 completado + documentado.');
  }
  if (etapas.has('E1') || etapas.has('E1+E2') || etapas.has('E2/E1') || etapas.has('E1/E2')) {
    items.push('Buy Box de 1 página listo para enviar.');
    items.push('5 ZIP codes definidos y validados con investigación de mercado.');
    items.push('Lista de 20 SÍ y 20 NO (red flags) documentada.');
    items.push('50 ARVs calculados con ARV conservador por ZIP.');
    items.push('10+ propiedades analizadas con MAO en planilla.');
    items.push('Ofertas formales enviadas: 10+/mes con LOI + Proof of Funds.');
  }
  if (etapas.has('E2') || etapas.has('E2/E1') || etapas.has('E1/E2')) {
    items.push('Capital Stack documentado (líquido / probable / teórico).');
    items.push('Earnest money máximo definido.');
    items.push('Gap máximo definido.');
    items.push('Reserva mínima definida que no se toca.');
    items.push('10 HMLs entrevistados + 5 term sheets oficiales en PDF.');
    items.push('HML primario pre-aprobado + HML backup.');
    items.push('25 wholesalers en base + 10 activos enviando deals.');
    items.push('10 realtors investor-friendly + 5 distressed agents.');
    items.push('5 contactos REIA/networking activos.');
    items.push('5 posibles private lenders en pipeline.');
    items.push('10 contratistas filtrados + top 3 listos para cotizar.');
    items.push('2 title companies investor-friendly identificadas.');
    items.push('3 ofertas justificadas por MAO listas para presentar.');
  }
  if (etapas.has('E5')) {
    items.push('Post-mortem del primer deal completo + presentado al coach.');
    items.push('3-5 SOPs documentados y validados con prueba real.');
    items.push('Project Manager contratado + 1 obra delegada.');
    items.push('Red de private money en construcción (5+ contactos).');
    items.push('Sistema de lead gen propio activo (1 canal).');
    items.push('Plan anual documentado con metas trimestrales.');
  }
  if (a.objetivo === 'wholesale') {
    items.push('Buyer list de 50+ cash buyers activos.');
    items.push('1 canal de lead gen funcionando con métricas semanales.');
    items.push('5 templates de contratos legales adaptados a tu estado.');
  }
  if (a.objetivo === 'lender') {
    items.push('Framework de evaluación de operadores documentado.');
    items.push('Abogado + title company para 1st lien recording.');
    items.push('1 deal piloto con Note + Deed of Trust firmados.');
    items.push('Diversificación entre 3+ operadores planeada.');
  }
  items.push('1 caso listo para revisión profunda con mentor.');
  return items;
}

function fmGenerarFraseFinal(p, a) {
  if (a.objetivo === 'lender') {
    return `"Presto capital con Note + Deed of Trust en 1st lien position, evalúo operadores con framework propio, diversifico entre 3-5 operadores activos, y obtengo 8-12% anual sobre capital prestado en plazos de 6-12 meses."`;
  }
  if (a.objetivo === 'wholesale') {
    return `"Encuentro deals off-market en ${p.mercado} con lead gen propio dominado, mantengo buyer list de 50+ cash buyers activos, y cierro 1-2 assignments/mes con fee promedio $10K-$20K mientras construyo capital para mi primer flip propio."`;
  }
  const estrategia = a.objetivo === 'hold' ? 'Fix & Hold' : a.objetivo === 'hibrido' ? 'Mix Flip + Hold' : 'Fix & Flip';
  return `"Compro propiedades tipo [SFH/Duplex], en ZIP codes [tus 5 ZIPs], para estrategia ${estrategia}, con ARV entre [$X-$Y], rehab máximo de [$X], cierre estimado en [14-21 días], usando [HML primario] + [$X de capital líquido + gap disponible]."`;
}

function fmDiagOpenLibrary() {
  fmState.activeTab = 'biblioteca';
  fmState.activeEtapa = 'INDICE';
  const estadosDoc = fmState.docs.find(d => d.categoria === 'perfiles');
  if (estadosDoc) {
    fmState.activeDocId = estadosDoc.id;
  }
  fmRender();
}

function fmDiagSetModo(modo) {
  fmState.diagModo = modo;
  fmState.diagExpandidos = {}; // reset expansions individuales
  fmRender();
  setTimeout(() => document.querySelector('#fm-plan-print')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
}

function fmDiagExpandirBloque(id) {
  fmState.diagExpandidos[id] = !fmState.diagExpandidos[id];
  fmRender();
}

function fmFiltrarBloquesPorModo(bloques, modo) {
  if (modo === 'completo') return bloques;
  if (modo === 'panorama') return [];
  if (modo === 'foco') return bloques.slice(0, 1);
  if (modo === 'medio') return bloques.slice(0, 4);
  return bloques.slice(0, 4);
}

function fmTotalHoras(bloques) {
  // Estimación grosera: extraer número aproximado del campo `tiempo` y sumar
  let total = 0;
  bloques.forEach(b => {
    const t = String(b.tiempo || '');
    const m = t.match(/(\d+)\s*[-a–]\s*(\d+)/);
    if (m) total += (parseInt(m[1]) + parseInt(m[2])) / 2;
    else {
      const single = t.match(/(\d+)/);
      if (single) total += parseInt(single[1]);
    }
  });
  return Math.round(total);
}

function fmDiagPrintPlan() {
  // Bug: window.print() solo imprime la pantalla visible (el modal tiene
  // overflow-y:auto y max-h, así que sale 1 sola página).
  // Fix: copiar el HTML del plan a una ventana nueva sin restricciones
  // de altura y disparar print desde ahí.
  const planEl = document.querySelector('#fm-plan-print');
  if (!planEl) {
    alert('No encuentro el plan en pantalla. Reabrí el plan e intentá de nuevo.');
    return;
  }

  const planHTML = planEl.innerHTML;
  const win = window.open('', '_blank', 'width=1000,height=1200');
  if (!win) {
    alert('El navegador bloqueó la ventana. Autorizá popups para este sitio y reintentá.');
    return;
  }

  win.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Plan de Acción · FlipMentoría</title>
<script src="https://cdn.tailwindcss.com"><\/script>
<style>
  body { font-family: 'Inter', system-ui, sans-serif; background: white; }
  @page { margin: 1.2cm; }
  @media print {
    .no-print { display: none !important; }
    .bg-slate-900, .bg-slate-800, .bg-slate-700 { background: #fff !important; color: #211e17 !important; }
    .text-white { color: #211e17 !important; }
    .text-slate-300, .text-slate-400 { color: #5f594c !important; }
    /* Forzar que cada bloque grande no se corte feo */
    [id^="bloque-"] { page-break-inside: avoid; break-inside: avoid; }
    /* Evitar fondos oscuros que gasten tinta */
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
  <div class="no-print sticky top-0 z-50 bg-emerald-600 text-white p-3 flex justify-between items-center shadow-md">
    <div class="text-sm font-bold">${osIcon('clipboard')} Plan de Acción listo para imprimir</div>
    <div class="flex gap-2">
      <button onclick="window.print()" class="bg-white text-emerald-700 font-bold px-4 py-2 rounded-lg text-sm">${osIcon('printer')} Imprimir / Guardar PDF</button>
      <button onclick="window.close()" class="bg-emerald-700 hover:bg-emerald-800 font-bold px-4 py-2 rounded-lg text-sm">✕ Cerrar</button>
    </div>
  </div>
  <div class="p-6 max-w-5xl mx-auto">${planHTML}</div>
  <script>
    // Esperar a que Tailwind cargue antes de imprimir
    window.addEventListener('load', () => { setTimeout(() => window.print(), 800); });
  <\/script>
</body>
</html>`);
  win.document.close();
}

function fmDiagCopyPlan() {
  const r = fmState.diagResult;
  if (!r) return;
  const text = `PLAN PERSONALIZADO — FlipMentoría
Perfil: #${r.perfil.num} ${r.perfil.nombre}
Etapa actual: ${r.etapa}
Cronograma: ${r.cronograma}

FORTALEZAS:
${r.fortalezas.map(f => '- ' + f).join('\n')}

GAPS PRIORITARIOS:
${r.gaps.map((g, i) => `${i+1}. [${g.codigo}] ${g.titulo} (${g.prioridad})`).join('\n')}
`;
  navigator.clipboard.writeText(text);
  alert('Plan copiado al clipboard');
}

function fmRenderChatMessage(m, i, mode) {
  if (m.role === 'user') {
    return `<div class="flex justify-end"><div class="bg-slate-900 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm max-w-2xl">${escapeHtml(m.content)}</div></div>`;
  }
  const color = mode === 'diagnose' ? 'amber' : 'blue';
  const html = typeof marked !== 'undefined' ? marked.parse(m.content) : escapeHtml(m.content);
  const safe = typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(html) : html;
  return `
    <div class="flex items-start gap-3">
      <div class="w-8 h-8 rounded-full bg-${color}-100 flex items-center justify-center flex-shrink-0 text-lg">${osIcon('bot')}</div>
      <div class="bg-slate-50 rounded-2xl rounded-tl-sm px-4 py-3 text-sm max-w-3xl flex-1">
        <div class="prose prose-sm prose-slate max-w-none [&_pre]:bg-slate-900 [&_pre]:text-slate-100 [&_pre]:rounded [&_pre]:p-3 [&_code]:bg-slate-200 [&_code]:px-1 [&_code]:rounded [&_h1]:text-base [&_h2]:text-base [&_h3]:text-sm [&_strong]:text-slate-900 [&_blockquote]:border-l-4 [&_blockquote]:border-${color}-500 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-slate-700">${safe}</div>
      </div>
    </div>
  `;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

