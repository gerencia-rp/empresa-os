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
    return `<div class="p-8 max-w-3xl mx-auto"><div class="bg-red-50 border border-red-200 rounded-xl p-6"><h3 class="font-bold text-red-900 mb-2">⚠️ Error generando plan</h3><pre class="text-xs text-red-700 bg-white p-3 rounded border overflow-x-auto whitespace-pre-wrap">${escapeHtml(String(err?.message || err))}</pre><button onclick="fmDiagReset()" class="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm">🔄 Reiniciar diagnóstico</button></div></div>`;
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
                return `<button onclick="fmLinkPlanAStudiante('${fmState.diagStudentId}', '${sel?.mentorship_id||''}')" class="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg text-sm font-bold" title="Guardar y vincular directo a ${name.replace(/"/g,'&quot;')}">💾 Guardar plan para ${name.replace(/</g,'&lt;')}</button>`;
              })() : `<button onclick="fmAbrirVincularEstudiante()" class="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-lg text-sm font-bold">💾 Vincular a estudiante (CRM)</button>`}
              <button onclick="fmDiagPrintPlan()" class="px-4 py-2 bg-white text-slate-900 rounded-lg text-sm font-medium hover:bg-slate-100">🖨️ Imprimir</button>
              <button onclick="fmDiagCopyPlan()" class="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-600">📋 Copiar</button>
              <button onclick="fmDiagReset()" class="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-600">🔄 Repetir</button>
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
            <span>🔬</span> Análisis Profundo del Cliente
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
              <h4 class="text-sm font-bold text-emerald-900 mb-2">✅ Fortalezas identificadas</h4>
              <ul class="space-y-1 text-xs text-emerald-900">
                ${r.fortalezas.length ? r.fortalezas.map(f => `<li class="flex gap-1.5"><span>•</span><span>${f}</span></li>`).join('') : '<li class="italic text-emerald-700">Estás empezando — esa es tu primera fortaleza: claridad para construir desde cero.</li>'}
              </ul>
            </div>
            <div class="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 class="text-sm font-bold text-red-900 mb-2">⚠️ Riesgos críticos a mitigar</h4>
              <ul class="space-y-1 text-xs text-red-900">
                ${fmGenerarRiesgos(a, p).map(r => `<li class="flex gap-1.5"><span>•</span><span>${r}</span></li>`).join('')}
              </ul>
            </div>
          </div>
        </div>

        <!-- Selector de modo de detalle -->
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6 print:hidden">
          <h3 class="font-bold text-slate-900 mb-2">📐 ¿Cuánto detalle querés ver del plan?</h3>
          <p class="text-xs text-slate-600 mb-3">El plan completo tiene ${bloques.length} bloques (~${fmTotalHoras(bloques)} horas de trabajo total). Elegí el nivel de detalle según para qué lo necesitás.</p>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
            ${[
              { id: 'panorama', label: '🗺️ Panorama', desc: 'Lista de bloques sin detalle', count: '0 bloques abiertos' },
              { id: 'foco', label: '🎯 Foco', desc: 'Solo el bloque actual', count: '1 bloque' },
              { id: 'medio', label: '📋 Trimestre', desc: 'Próximos 3-4 bloques', count: `${Math.min(4, bloques.length)} bloques` },
              { id: 'completo', label: '📚 Completo', desc: 'TODO hasta meta final', count: `${bloques.length} bloques` }
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
              <h2 class="text-xl font-bold text-slate-900">📋 Plan de Acción · ${bloques.length} Bloques</h2>
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
                <div class="text-xs text-slate-500 flex-shrink-0">${visible || expandido ? '▼' : '▶'}</div>
              </a>
            `;}).join('')}
          </div>
        </div>

        <!-- Bloques visibles según modo -->
        ${bloques.filter(b => bloquesVisibles.includes(b) || fmState.diagExpandidos[b.id]).map((b, i) => {
          const realIdx = bloques.indexOf(b);
          return fmRenderBloque(b, realIdx, userProfile, a);
        }).join('')}

        ${fmState.diagModo !== 'completo' && bloques.length > bloquesVisibles.length ? `
          <div class="bg-amber-50 border-2 border-dashed border-amber-300 rounded-2xl p-6 text-center mb-6 print:hidden">
            <p class="text-sm text-amber-900 mb-3">Hay <strong>${bloques.length - bloquesVisibles.length} bloques más</strong> en el plan completo hasta tu meta final.</p>
            <button onclick="fmDiagSetModo('completo')" class="px-5 py-2.5 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700">📚 Ver plan completo</button>
          </div>
        ` : ''}

        <!-- Checklist Final -->
        <div class="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl shadow-sm p-6 mb-6 print:bg-white print:text-slate-900 print:border print:border-slate-300">
          <h2 class="text-xl font-bold mb-2 flex items-center gap-2"><span>✅</span> Checklist Final</h2>
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
          <button onclick="fmDiagOpenLibrary()" class="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">📚 Abrir Biblioteca</button>
          <button onclick="fmDiagPrintPlan()" class="flex-1 px-4 py-3 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800">🖨️ Imprimir Plan</button>
          <button onclick="fmDiagReset()" class="px-4 py-3 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300">🔄 Nuevo diagnóstico</button>
        </div>

      </div>
    </div>

    <style>
      @media print {
        #fm-plan-print { background: white !important; }
        .print\\:hidden { display: none !important; }
        .print\\:bg-white { background: white !important; }
        .print\\:text-slate-900 { color: #0F172A !important; }
        .print\\:border { border: 1px solid #E2E8F0 !important; }
        .print\\:bg-blue-50 { background: #EFF6FF !important; }
        .print\\:bg-amber-50 { background: #FFFBEB !important; }
        .print\\:text-amber-700 { color: #B45309 !important; }
        .print\\:text-blue-700 { color: #1D4ED8 !important; }
      }
    </style>
  `;
}

function fmRenderBloque(b, idx, p, a) {
  const actividadStr = typeof b.actividad === 'function' ? b.actividad(p, a) : b.actividad;
  const pasos = typeof b.pasos === 'function' ? b.pasos(p, a) : (b.pasos || []);
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
              <th class="bg-slate-800 text-white text-left p-3 w-1/3 align-top font-bold text-sm">⏱️ Tiempo estimado</th>
              <td class="p-3 align-top">${b.tiempo}</td>
            </tr>
            <tr class="border-b border-slate-300">
              <th class="bg-slate-800 text-white text-left p-3 align-top font-bold text-sm">🎯 Actividad</th>
              <td class="p-3 align-top">${actividadStr}</td>
            </tr>
            <tr class="border-b border-slate-300">
              <th class="bg-slate-800 text-white text-left p-3 align-top font-bold text-sm">📦 Entregable</th>
              <td class="p-3 align-top font-medium">${b.entregable}</td>
            </tr>
            <tr class="border-b border-slate-300">
              <th class="bg-slate-800 text-white text-left p-3 align-top font-bold text-sm">🪜 Paso a paso</th>
              <td class="p-3 align-top">
                <ol class="space-y-1.5 list-decimal list-inside text-slate-800">
                  ${pasos.map(paso => `<li>${paso}</li>`).join('')}
                </ol>
              </td>
            </tr>
            <tr class="border-b border-slate-300">
              <th class="bg-slate-800 text-white text-left p-3 align-top font-bold text-sm">🧰 Recursos y herramientas</th>
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
              <th class="bg-slate-800 text-white text-left p-3 align-top font-bold text-sm">⚠️ Errores reales que veo todo el tiempo</th>
              <td class="p-3 align-top">
                <ul class="space-y-1 text-slate-800">
                  ${b.errores.map(e => `<li class="flex gap-2"><span class="text-red-500">•</span><span>${e}</span></li>`).join('')}
                </ul>
              </td>
            </tr>
          </tbody>
        </table>
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
  return ({ 'menos_20k': '< $20K', '20_50k': '$20K-$50K', '50_100k': '$50K-$100K', '100_250k': '$100K-$250K', 'mas_250k': '> $250K' })[c] || 'definido';
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

  // Párrafo 1: contexto general
  parrafos.push(`Sos un perfil <strong>#${p.num} ${p.nombre}</strong>, ubicado en etapa <strong>${r.etapa}</strong> de la metodología FlipMentoría. Tu cronograma esperado para llegar al primer hito mayor es de <strong>${r.cronograma}</strong>. Trabajás con <strong>${a.tiempo === 'mas_30' ? 'tiempo full-time' : a.tiempo === '15_30' ? 'medio tiempo (15-30h/sem)' : 'tiempo limitado (<15h/sem)'}</strong>, lo cual ${a.tiempo === 'menos_15' ? 'extiende el cronograma — vas a tener que ser brutal con prioridades' : 'te permite avanzar a buen ritmo si la disciplina se sostiene'}.`);

  // Párrafo 2: capital
  const capitalTxt = fmCapitalRange(a.capital);
  const liquidoTxt = a.capital_real === 'todo' ? '100% líquido' : a.capital_real === 'mitad' ? '~50% líquido' : a.capital_real === 'minimo' ? 'mínimo líquido' : 'mayoritariamente teórico';
  parrafos.push(`Tu capital reportado es <strong>${capitalTxt}</strong> y está <strong>${liquidoTxt}</strong>. ${a.capital_real === 'teorico' || a.capital_real === 'minimo' ? 'Esto es un riesgo crítico — el capital teórico no se usa para ofertar. Antes de hacer cualquier oferta formal, tenés que convertir ese capital en líquido real (acceso 24-48h). Sin esto, los HMLs no te van a aprobar y los wholesalers no te van a tomar en serio.' : 'Esto te da capacidad real de cerrar deals con HML cuando aparezca la oportunidad correcta.'} ${a.fuentes_capital === 'a_construir' ? 'Además, mencionaste que tenés que CONSTRUIR fuentes de capital adicional — esto va en paralelo al estudio de mercado (Bloques de E2).' : ''}`);

  // Párrafo 3: crédito
  if (a.credit === 'menos_600' || a.credit === '600_660' || a.credit === 'sin_historial') {
    parrafos.push(`Tu credit score (<strong>${({ 'menos_600': '< 600', '600_660': '600-660', 'sin_historial': 'sin historial USA' })[a.credit]}</strong>) es el segundo riesgo crítico. Los HMLs nacionales 2026 (Kiavi, Lima One, RCN, Constructive Capital, Easy Street) aceptan 620+ con LTV reducido — el "660+ era duro" es la regla vieja. ${a.credit === 'menos_600' || a.credit === 'sin_historial' ? 'Aún así con < 600 necesitás reconstruir 6-12 meses ANTES de aplicar, o ir por: HMLs ITIN-friendly, partnership con socio con crédito, o empezar como buyer secundario.' : 'Tu score está en zona limítrofe — varios HMLs te aceptan pero con LTV 70-75% (vs 80% en 700+). Subir a 720+ destraba 5% más de LTV y baja tasa.'} Este es un track paralelo: no bloquea avanzar con E0 ni con análisis de mercado.`);
  } else {
    parrafos.push(`Tu credit score (<strong>${({ 'mas_780': '> 780', '720_780': '720-780', '660_720': '660-720' })[a.credit]}</strong>) te da acceso a los HMLs estándar nacionales (Kiavi, Lima One, RCN, Easy Street). Esto significa que el cuello de botella NO va a ser financiamiento — va a ser encontrar el deal correcto al precio correcto.`);
  }

  // Párrafo 4: setup legal
  if (a.llc === 'no') {
    parrafos.push(`<strong>No tenés LLC formada</strong>. Esto es la tarea #1 del Bloque E0 — sin LLC no se ofertan propiedades porque arriesgás tu patrimonio personal completo (casa, ahorros, autos) en cada transacción. La LLC toma 1-4 semanas dependiendo del estado, así que se inicia hoy mismo en paralelo al estudio de mercado.`);
  } else if (a.llc === 'si_otro') {
    parrafos.push(`Tenés LLC formada pero <strong>en otro estado al de inversión</strong>. Esto genera "foreign LLC registration" — costo doble (filing fee del estado original + del estado de inversión), compliance doble. La solución más limpia: formar segunda LLC en el estado donde vas a invertir, o consultar con abogado de real estate para foreign registration formal.`);
  } else if (a.llc === 'si_mismo') {
    const setupItems = Array.isArray(a.setup_legal) ? a.setup_legal : [];
    const completo = setupItems.includes('ein') && setupItems.includes('operating') && setupItems.includes('banco') && setupItems.includes('contabilidad') && setupItems.includes('cpa');
    parrafos.push(`Tu setup legal está ${completo ? '<strong>completo</strong> (LLC + EIN + OA + banco + contabilidad + CPA). Esta es una fortaleza importante — la mayoría de los novatos se traban acá durante meses.' : `<strong>parcial</strong> — falta(n): ${['ein','operating','banco','contabilidad','cpa','abogado'].filter(x => !setupItems.includes(x)).map(x => ({ein:'EIN',operating:'Operating Agreement',banco:'Cuenta bancaria',contabilidad:'Contabilidad activa',cpa:'CPA',abogado:'Abogado'})[x]).join(', ')}. Completar lo que falta es prerequisito antes de cerrar deal.`}`);
  }

  // Párrafo 5: red operativa y momentum
  const ofertasTxt = a.ofertas_mes === '10_mas' ? '10+ ofertas/mes' : a.ofertas_mes === '1_9' ? '1-9 ofertas/mes' : a.ofertas_mes === 'analisis_no_oferta' ? 'analizando deals pero sin ofertar' : 'sin ofertar todavía';
  const wsTxt = a.wholesalers === '10_mas' ? '10+ wholesalers activos' : a.wholesalers === '3_9' ? '3-9 wholesalers' : a.wholesalers === '1_2' ? '1-2 wholesalers ocasionales' : 'ningún wholesaler activo';
  parrafos.push(`Sobre tu momentum actual: <strong>${ofertasTxt}</strong> y <strong>${wsTxt}</strong>. ${a.ofertas_mes === 'cero' || a.ofertas_mes === 'analisis_no_oferta' ? 'El cuello de botella crítico es pasar de análisis a oferta. Sin volumen de ofertas (target 10+/mes) no hay deals cerrados. Los Bloques E1 (Buy Box, ARV, MAO) y E2 (HML, wholesalers) están diseñados para resolver esto en paralelo.' : 'Estás generando volumen. Foco ahora: mejorar tasa de aceptación con mejor pain identification del vendedor y closing más rápido.'}`);

  // Párrafo 6: obstáculo principal
  const obstaculoTxt = ({
    'capital': 'capital insuficiente o no líquido',
    'conocimiento': 'falta de conocimiento técnico (ARV, MAO, contratos)',
    'red': 'red de contactos inexistente o débil',
    'tiempo': 'tiempo limitado por otras responsabilidades',
    'miedo': 'parálisis por análisis / miedo a ofertar',
    'mercado': 'dificultad encontrando deals que pasen el filtro',
    'equipo': 'necesidad de equipo para escalar'
  })[a.mayor_obstaculo];
  if (obstaculoTxt) {
    parrafos.push(`Tu mayor obstáculo percibido es <strong>${obstaculoTxt}</strong>. El plan que sigue prioriza específicamente este obstáculo en los primeros bloques. ${a.mayor_obstaculo === 'miedo' ? 'Para parálisis, la solución NO es más información — es forzar volumen de ofertas. 10 ofertas/semana durante 30 días rompe el bloqueo.' : a.mayor_obstaculo === 'red' ? 'Para red débil, el Bloque "Base mínima de contactos" + "Wholesalers y pitch" te llevan de 0 a 25 contactos activos en 30-45 días.' : a.mayor_obstaculo === 'capital' ? 'Para capital, el Bloque "Capital Stack real" + opciones alternativas (private money, partnership, HELOC, wholesaling como bridge) está diseñado para resolver esto sin esperar años.' : 'El plan tiene bloques específicos para atacar este obstáculo directamente.'}`);
  }

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
  window.print();
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
      <div class="w-8 h-8 rounded-full bg-${color}-100 flex items-center justify-center flex-shrink-0 text-lg">🤖</div>
      <div class="bg-slate-50 rounded-2xl rounded-tl-sm px-4 py-3 text-sm max-w-3xl flex-1">
        <div class="prose prose-sm prose-slate max-w-none [&_pre]:bg-slate-900 [&_pre]:text-slate-100 [&_pre]:rounded [&_pre]:p-3 [&_code]:bg-slate-200 [&_code]:px-1 [&_code]:rounded [&_h1]:text-base [&_h2]:text-base [&_h3]:text-sm [&_strong]:text-slate-900 [&_blockquote]:border-l-4 [&_blockquote]:border-${color}-500 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-slate-700">${safe}</div>
      </div>
    </div>
  `;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

