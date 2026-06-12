// ════════════════════════════════════════════════════════════
// 🎬 Generador de presentaciones IA + builder PPTX
// (extraído de education.js)
// V2: wizard universal (informe/educativo/pitch/mkt/libre) + modo
// experto. Genera slide-por-slide vía edge function generate-presentation-v2
// (síncrona, sin timeout, funciona en plan free de Supabase).
// ════════════════════════════════════════════════════════════

// Estado del wizard V2 (vive en window para no perderse)
window.eduPresWizard = window.eduPresWizard || {
  step: 1,
  preset_type: 'libre',
  title: '',
  topic: '',
  audience: '',
  slides_count: 12,
  tone_extra: '',
  language: 'es',
  expertMode: false,
  expertPrompt: '',
  generating: false,
  progress: { phase: 'idle', current: 0, total: 0, message: '' },
  cancel: false
};

const EDU_PRES_PRESETS = [
  { key: 'informe',   icon: '📊', label: 'Informe ejecutivo',  desc: 'KPIs, hallazgos, recomendaciones. Para junta directiva o socios.', defaultSlides: 10 },
  { key: 'educativo', icon: '🎓', label: 'Educativo / clase',  desc: 'Objetivos de aprendizaje, casos, ejercicios. Para mentorías y workshops.', defaultSlides: 15 },
  { key: 'pitch',     icon: '🎤', label: 'Pitch comercial',    desc: 'Problema, solución, prueba, CTA. Para vender a un cliente.', defaultSlides: 12 },
  { key: 'marketing', icon: '📣', label: 'Marketing / redes',  desc: 'Hooks visuales, antes/después. Para carruseles o contenido.', defaultSlides: 8 },
  { key: 'libre',     icon: '✨', label: 'Tema libre',         desc: 'Cualquier tema. La IA adapta estructura al input.', defaultSlides: 12 }
];

function eduPresSetField(field, value) {
  window.eduPresWizard[field] = value;
  // Re-render solo si cambió step o preset (para mostrar/ocultar campos)
  if (field === 'step' || field === 'preset_type' || field === 'expertMode') eduRender();
}

function eduPresWizardNext() {
  const w = window.eduPresWizard;
  if (w.step === 1 && !w.preset_type) return alert('Elegí un tipo de presentación primero.');
  if (w.step === 2) {
    // Capturar valores actuales del form
    w.title = (document.getElementById('wz-title')?.value || '').trim();
    w.topic = (document.getElementById('wz-topic')?.value || '').trim();
    w.audience = (document.getElementById('wz-audience')?.value || '').trim();
    w.slides_count = +(document.getElementById('wz-slides')?.value) || 10;
    w.tone_extra = (document.getElementById('wz-tone')?.value || '').trim();
    w.language = document.getElementById('wz-language')?.value || 'es';
    if (!w.title) return alert('El título es obligatorio.');
    if (!w.topic) return alert('El tema es obligatorio — escribí qué cubrir en 1-3 oraciones.');
    if (!w.audience) w.audience = 'profesionales del rubro';
  }
  w.step = Math.min(3, w.step + 1);
  eduRender();
}

function eduPresWizardBack() {
  window.eduPresWizard.step = Math.max(1, window.eduPresWizard.step - 1);
  eduRender();
}

function eduPresWizardReset() {
  window.eduPresWizard = {
    step: 1,
    preset_type: 'libre',
    title: '', topic: '', audience: '',
    slides_count: 12, tone_extra: '', language: 'es',
    expertMode: false, expertPrompt: '',
    generating: false,
    progress: { phase: 'idle', current: 0, total: 0, message: '' },
    cancel: false
  };
  // Limpiar el draft visible
  const aiKey = `edu-pres-${eduState.mentorshipId || 'no-mentorship'}`;
  if (window.aiState && window.aiState[aiKey]) delete window.aiState[aiKey].presentation;
  eduRender();
}

function eduPresPickPreset(key) {
  const p = EDU_PRES_PRESETS.find(x => x.key === key);
  if (!p) return;
  window.eduPresWizard.preset_type = key;
  window.eduPresWizard.slides_count = p.defaultSlides;
  window.eduPresWizard.step = 2;
  eduRender();
}

function eduPresCancelGeneration() {
  window.eduPresWizard.cancel = true;
}

window.eduPresSetField = eduPresSetField;
window.eduPresWizardNext = eduPresWizardNext;
window.eduPresWizardBack = eduPresWizardBack;
window.eduPresWizardReset = eduPresWizardReset;
window.eduPresPickPreset = eduPresPickPreset;
window.eduPresCancelGeneration = eduPresCancelGeneration;

// TAB: PRESENTACIONES IA — genera slides con web search live + descarga PPTX
// ============================================================
function eduRenderPresentations() {
  const m = eduCurrentMentorship();
  const presentations = (eduState.presentations || []).filter(p => p.mentorship_id === eduState.mentorshipId);
  const aiKey = `edu-pres-${eduState.mentorshipId || 'no-mentorship'}`;
  const ai = (window.aiState && window.aiState[aiKey]) || {};
  const draft = ai.presentation;
  const w = window.eduPresWizard;
  const sel = EDU_PRES_PRESETS.find(p => p.key === w.preset_type);

  return `
    <div class="space-y-3">

      <!-- 🆕 WIZARD UNIVERSAL V2 -->
      <div class="bg-gradient-to-br from-violet-50 to-purple-50 border-2 border-violet-300 rounded-xl overflow-hidden">
        <div class="bg-violet-700 text-white px-4 py-3 flex items-center justify-between flex-wrap gap-2">
          <div>
            <div class="text-[10px] uppercase font-bold text-violet-200 tracking-wider">🎬 Generador IA de presentaciones</div>
            <div class="text-base font-bold mt-0.5">${w.expertMode ? 'Modo experto · prompt libre' : `Wizard · Paso ${w.step} de 3`}</div>
          </div>
          <div class="flex gap-2">
            <button onclick="window.eduPresWizard.expertMode = !window.eduPresWizard.expertMode; eduRender();" class="text-[11px] bg-white/20 hover:bg-white/30 text-white font-bold px-3 py-1.5 rounded">${w.expertMode ? '🧙 Volver al wizard' : '⚡ Modo experto'}</button>
            ${w.step > 1 && !w.expertMode ? `<button onclick="eduPresWizardReset()" class="text-[11px] bg-white/10 hover:bg-white/20 text-white font-bold px-3 py-1.5 rounded">↺ Reiniciar</button>` : ''}
          </div>
        </div>

        ${w.generating ? `
          <!-- VISTA DE PROGRESO -->
          <div class="p-6 text-center bg-white">
            <div class="text-3xl mb-2">🧠</div>
            <div class="font-bold text-violet-900 text-base">${w.progress.message || 'Generando...'}</div>
            ${w.progress.total > 0 ? `
              <div class="mt-3 max-w-md mx-auto">
                <div class="w-full bg-violet-100 rounded-full h-3">
                  <div class="bg-violet-600 h-3 rounded-full transition-all" style="width:${Math.round(100*w.progress.current/w.progress.total)}%"></div>
                </div>
                <div class="text-[11px] text-violet-700 mt-1">${w.progress.current} de ${w.progress.total} slides</div>
              </div>
            ` : ''}
            <div class="text-[11px] text-slate-500 mt-3">Cada slide tarda 10-25s. No cierres esta ventana.</div>
            <button onclick="eduPresCancelGeneration()" class="mt-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-1.5 rounded">✕ Cancelar</button>
          </div>
        ` : w.expertMode ? `
          <!-- MODO EXPERTO -->
          <div class="p-4 space-y-3">
            <div>
              <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Tipo</label>
              <select id="exp-preset" class="w-full border border-slate-300 rounded px-3 py-2 text-sm">
                ${EDU_PRES_PRESETS.map(p => `<option value="${p.key}" ${w.preset_type===p.key?'selected':''}>${p.icon} ${p.label}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Título *</label>
              <input id="exp-title" value="${(w.title||'').replace(/"/g,'&quot;')}" placeholder="Ej. Resultados Q2 2026 · Rental Profits" class="w-full border border-slate-300 rounded px-3 py-2 text-sm font-bold"/>
            </div>
            <div>
              <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Prompt libre — describí qué querés *</label>
              <textarea id="exp-prompt" rows="5" placeholder="Ej: presentación de 12 slides para junta directiva sobre los resultados del Q2 2026 de Rental Profits. Incluí: revenue $1.2M (+18% vs Q1), 47 propiedades activas, 92% occupancy, 3 nuevos mercados (Austin/Houston/San Antonio), 2 riesgos principales (tasas + competencia), 3 recomendaciones para Q3. Tono ejecutivo, KPIs claros." class="w-full border border-slate-300 rounded px-3 py-2 text-sm">${(w.expertPrompt||'').replace(/</g,'&lt;')}</textarea>
              <div class="text-[10px] text-slate-500 mt-0.5">Cuanto más específico, mejor sale. Mencioná: tema, audiencia, # slides, datos clave, tono.</div>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1"># Slides</label>
                <input id="exp-slides" type="number" min="5" max="40" value="${w.slides_count}" class="w-full border border-slate-300 rounded px-3 py-2 text-sm"/>
              </div>
              <div>
                <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Idioma</label>
                <select id="exp-language" class="w-full border border-slate-300 rounded px-3 py-2 text-sm">
                  <option value="es" ${w.language==='es'?'selected':''}>Español</option>
                  <option value="en" ${w.language==='en'?'selected':''}>English</option>
                </select>
              </div>
            </div>
            <button onclick="eduGeneratePresentationV2(true)" class="w-full bg-violet-700 hover:bg-violet-800 text-white font-bold py-2.5 rounded">🚀 Generar presentación</button>
          </div>
        ` : w.step === 1 ? `
          <!-- PASO 1: ELEGIR TIPO -->
          <div class="p-4">
            <div class="text-sm font-bold text-slate-900 mb-3">1. ¿Qué tipo de presentación querés?</div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
              ${EDU_PRES_PRESETS.map(p => `
                <button onclick="eduPresPickPreset('${p.key}')" class="text-left p-3 rounded-lg border-2 ${w.preset_type===p.key?'border-violet-600 bg-violet-50':'border-slate-200 bg-white hover:border-violet-400'} transition">
                  <div class="text-lg">${p.icon} <span class="font-bold text-sm text-slate-900">${p.label}</span></div>
                  <div class="text-[11px] text-slate-600 mt-1">${p.desc}</div>
                  <div class="text-[9px] text-violet-600 mt-1">~${p.defaultSlides} slides recomendados</div>
                </button>
              `).join('')}
            </div>
          </div>
        ` : w.step === 2 ? `
          <!-- PASO 2: TEMA + DETALLES -->
          <div class="p-4 space-y-3">
            <div class="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>2. Contame sobre ${sel?.icon || ''} ${sel?.label || 'la presentación'}</span>
            </div>
            <div>
              <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Título de la presentación *</label>
              <input id="wz-title" value="${(w.title||'').replace(/"/g,'&quot;')}" placeholder="Ej. Resultados Q2 2026 · Rental Profits" class="w-full border border-slate-300 rounded px-3 py-2 text-sm font-bold"/>
            </div>
            <div>
              <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Tema / qué cubrir en 1-3 oraciones *</label>
              <textarea id="wz-topic" rows="3" placeholder="${w.preset_type==='informe' ? 'Ej: Revenue Q2: $1.2M (+18%). 47 propiedades activas, 92% occupancy. Hubo 3 hitos: nuevos mercados, mejora processes, app móvil. Riesgos: tasas y competencia. Recomendación: foco H2 en Texas.' : w.preset_type==='educativo' ? 'Ej: Cómo analizar un fix&flip. Cubrir: ARV, MAO, comps. Caso real Austin. Audiencia ya sabe lo básico de R/E.' : w.preset_type==='pitch' ? 'Ej: Vender servicio de property management. El cliente es dueño de 3 casas que no le rentan bien. Diferencial: tecnología + transparencia + cobramos % solo si superamos benchmark.' : 'Describí qué querés cubrir...'}" class="w-full border border-slate-300 rounded px-3 py-2 text-sm">${(w.topic||'').replace(/</g,'&lt;')}</textarea>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Audiencia</label>
                <input id="wz-audience" value="${(w.audience||(w.preset_type==='informe'?'Junta directiva y socios':w.preset_type==='educativo'?'Estudiantes de mentoría':w.preset_type==='pitch'?'Cliente prospect':w.preset_type==='marketing'?'Audiencia general en redes':'Profesionales del rubro')).replace(/"/g,'&quot;')}" class="w-full border border-slate-300 rounded px-3 py-2 text-sm"/>
              </div>
              <div>
                <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1"># Slides</label>
                <input id="wz-slides" type="number" min="5" max="40" value="${w.slides_count}" class="w-full border border-slate-300 rounded px-3 py-2 text-sm"/>
              </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Tono extra (opcional)</label>
                <input id="wz-tone" value="${(w.tone_extra||'').replace(/"/g,'&quot;')}" placeholder="Ej. Cercano, formal, técnico, divertido..." class="w-full border border-slate-300 rounded px-3 py-2 text-sm"/>
              </div>
              <div>
                <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Idioma</label>
                <select id="wz-language" class="w-full border border-slate-300 rounded px-3 py-2 text-sm">
                  <option value="es" ${w.language==='es'?'selected':''}>Español</option>
                  <option value="en" ${w.language==='en'?'selected':''}>English</option>
                </select>
              </div>
            </div>
            <div class="flex justify-between items-center pt-2 border-t border-violet-200">
              <button onclick="eduPresWizardBack()" class="text-sm text-slate-600 hover:text-slate-900">← Atrás</button>
              <button onclick="eduPresWizardNext()" class="bg-violet-700 hover:bg-violet-800 text-white font-bold text-sm px-5 py-2 rounded">Siguiente →</button>
            </div>
          </div>
        ` : `
          <!-- PASO 3: CONFIRMAR Y GENERAR -->
          <div class="p-4 space-y-3">
            <div class="text-sm font-bold text-slate-900">3. Confirmar y generar</div>
            <div class="bg-white border border-violet-200 rounded-lg p-3 space-y-2">
              <div class="flex justify-between text-sm"><span class="text-slate-600">Tipo:</span><strong>${sel?.icon} ${sel?.label}</strong></div>
              <div class="flex justify-between text-sm"><span class="text-slate-600">Título:</span><strong class="text-right max-w-[60%] truncate">${(w.title||'—').replace(/</g,'&lt;')}</strong></div>
              <div class="flex justify-between text-sm"><span class="text-slate-600">Audiencia:</span><strong>${(w.audience||'—').replace(/</g,'&lt;')}</strong></div>
              <div class="flex justify-between text-sm"><span class="text-slate-600"># Slides:</span><strong>${w.slides_count}</strong></div>
              <div class="flex justify-between text-sm"><span class="text-slate-600">Idioma:</span><strong>${w.language==='es'?'Español':'English'}</strong></div>
              <div class="text-xs text-slate-700 pt-2 border-t border-violet-100"><span class="text-slate-500 font-bold">Tema:</span> ${(w.topic||'—').replace(/</g,'&lt;')}</div>
            </div>
            <div class="bg-amber-50 border border-amber-200 rounded p-2 text-[11px] text-amber-900">
              ⏱ Tiempo estimado: <strong>~${15 + (w.slides_count * 15)} segundos</strong> (outline 15s + slide 15s c/u). Genera slide-por-slide en vivo, con barra de progreso.
            </div>
            <div class="flex justify-between items-center pt-2">
              <button onclick="eduPresWizardBack()" class="text-sm text-slate-600 hover:text-slate-900">← Atrás</button>
              <button onclick="eduGeneratePresentationV2(false)" class="bg-violet-700 hover:bg-violet-800 text-white font-bold text-sm px-6 py-2.5 rounded shadow">🚀 Generar presentación</button>
            </div>
          </div>
        `}
      </div>

      ${ai.error ? `<div class="bg-red-50 border border-red-200 rounded p-3 text-xs text-red-900 whitespace-pre-wrap">⚠️ ${ai.error}</div>` : ''}

      <!-- 📦 LEGACY: completamente oculto (solo accesible cambiando flag en consola) -->
      ${window.__eduShowLegacy ? `
      <details class="bg-slate-50 border border-slate-200 rounded-xl">
        <summary class="cursor-pointer text-[10px] font-bold uppercase text-slate-500 px-3 py-2">🔧 Modo legacy V1 (dev only)</summary>
        <div class="p-4">
        <div class="text-xs font-bold uppercase text-violet-900 mb-3">🎬 Generar presentación con IA + web search live</div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-[10px] font-bold text-slate-600 mb-1">Título de la presentación *</label>
            <input id="edu-pres-title" placeholder="Ej. Clase 1 — Buy Box, ARV y MAO en Texas 2026" class="w-full border border-slate-300 rounded px-3 py-2 text-sm font-bold" />
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-600 mb-1">Tipo</label>
            <select id="edu-pres-type" class="w-full border border-slate-300 rounded px-3 py-2 text-sm">
              <option value="class">📚 Clase magistral</option>
              <option value="workshop">🛠 Taller práctico</option>
              <option value="webinar">📡 Webinar abierto</option>
              <option value="keynote">🎤 Keynote / Pitch</option>
            </select>
          </div>
        </div>

        <div class="mt-2">
          <label class="block text-[10px] font-bold text-slate-600 mb-1">Tema / qué cubrir *</label>
          <textarea id="edu-pres-topic" rows="2" placeholder="Ej. Buy Box en Texas: cómo definirla, ARV con comps validados, MAO con holding costs. Foco Austin/Houston 2026, números reales y casos." class="w-full border border-slate-300 rounded px-3 py-2 text-sm"></textarea>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
          <div>
            <label class="block text-[10px] font-bold text-slate-600 mb-1"># Clase</label>
            <input id="edu-pres-class-number" type="number" placeholder="1" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-600 mb-1">Duración (min)</label>
            <input id="edu-pres-duration" type="number" value="60" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-600 mb-1"># Slides aprox</label>
            <input id="edu-pres-slides" type="number" value="15" min="5" max="40" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-600 mb-1">Idioma</label>
            <select id="edu-pres-lang" class="w-full border border-slate-300 rounded px-3 py-2 text-sm">
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>

        <!-- Dominio temático + foco geográfico — para que las fuentes se adapten -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
          <div>
            <label class="block text-[10px] font-bold text-slate-600 mb-1">Dominio temático *</label>
            <select id="edu-pres-domain" class="w-full border border-slate-300 rounded px-3 py-2 text-sm">
              <option value="real-estate">🏠 Real Estate (Redfin, FRED, NAR, MLS)</option>
              <option value="marketing">📣 Marketing / Growth (HubSpot, Statista, Pew)</option>
              <option value="finance">💰 Finanzas / Inversión (SEC, FRED, Bloomberg)</option>
              <option value="tech">💻 Tech / Software (Gartner, IDC, CB Insights)</option>
              <option value="sales">🤝 Ventas / B2B (HubSpot Sales, Salesforce, Gong)</option>
              <option value="leadership">👥 Liderazgo / Management (HBR, McKinsey, Bain)</option>
              <option value="general">🌍 General / Otro tema</option>
            </select>
            <div class="text-[9px] text-slate-500 mt-0.5">Define qué fuentes prioriza la IA</div>
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-600 mb-1">Foco geográfico (opcional)</label>
            <input id="edu-pres-geo" placeholder="Ej. Texas · USA · LATAM · Global · México" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
            <div class="text-[9px] text-slate-500 mt-0.5">Default Real Estate: Texas. Vacío en otros dominios.</div>
          </div>
        </div>

        <div class="mt-2">
          <label class="block text-[10px] font-bold text-slate-600 mb-1">Outline sugerido (opcional)</label>
          <textarea id="edu-pres-outline" rows="2" placeholder="Si tenés ya una estructura en mente, pegala acá. Si no, Claude la arma." class="w-full border border-slate-300 rounded px-3 py-2 text-xs"></textarea>
        </div>

        <div class="mt-2">
          <label class="block text-[10px] font-bold text-slate-600 mb-1">🔍 Fuentes preferidas (opcional)</label>
          <textarea id="edu-pres-sources" rows="2" placeholder="Si querés que la IA priorice fuentes específicas, listalas. Ej: 'Statista, Gartner, McKinsey 2024 report'. La IA igual usa las del dominio por default." class="w-full border border-slate-300 rounded px-3 py-2 text-xs"></textarea>
        </div>

        <div class="mt-2">
          <label class="block text-[10px] font-bold text-slate-600 mb-1">Audiencia</label>
          <input id="edu-pres-audience" value="${m?.name ? 'Estudiantes de ' + m.name : 'Estudiantes de la mentoría'}" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
        </div>

        <div class="flex flex-col gap-2 mt-3 pt-3 border-t border-violet-200">
          <div class="flex items-center gap-4 flex-wrap">
            <label class="flex items-center gap-2 text-xs">
              <input type="checkbox" id="edu-pres-live" checked />
              <span><strong>🌐 Web search live</strong> — datos verificables en vivo</span>
            </label>
            <label class="flex items-center gap-2 text-xs bg-amber-50 border border-amber-300 px-2 py-1 rounded">
              <input type="checkbox" id="edu-pres-research" />
              <span><strong>🔬 Investigación profunda</strong> — extended thinking + 25 búsquedas (3-5 min, +costo, insights no obvios)</span>
            </label>
          </div>
          <button onclick="withLoading(this, eduGeneratePresentation)" class="bg-violet-700 hover:bg-violet-800 text-white text-sm font-bold px-5 py-2.5 rounded">🤖 Generar con IA</button>
        </div>
        <div class="text-[10px] text-violet-700 mt-2 italic" id="edu-pres-time-hint">⚡ Modo normal: ~30-90 seg, 8 web searches. Modo investigación: ~3-5 min, 25 searches + thinking. Activá investigación para casos donde necesitás profundidad real (clase nueva, tema técnico, lanzamiento).</div>
        </div>
      </details>
      ` : ''}

      ${ai.loading ? `
        <div class="bg-violet-50 border border-violet-200 rounded-xl p-4 text-center">
          <div class="text-3xl animate-pulse">🧠</div>
          <div class="mt-2 font-bold text-violet-900">${ai.status === 'starting' ? 'Iniciando job en background...' : ai.status === 'running' ? 'Claude analizando + buscando data live...' : 'Procesando...'}</div>
          <div class="text-[11px] text-violet-700 mt-1">
            ${ai.elapsed_sec != null ? `⏱ ${ai.elapsed_sec}s transcurridos` : ''}
            ${ai.job_id ? ` · job <code class="text-[9px]">${ai.job_id.slice(0,8)}</code>` : ''}
            ${(ai.missed_polls||0) > 0 ? ` <span class="text-amber-700">· ${ai.missed_polls} polls sin respuesta (RLS?)</span>` : ''}
          </div>
          ${ai.last_poll_error ? `<div class="text-[10px] text-amber-700 mt-1">Último error polling: ${(ai.last_poll_error||'').replace(/</g,'&lt;')}</div>` : ''}
          <div class="text-[10px] text-violet-600 mt-2 italic">Esto puede tardar 60-120 segundos.</div>
        </div>
      ` : ''}
      ${ai.error ? `<div class="bg-red-50 border border-red-200 rounded p-3 text-xs text-red-900 whitespace-pre-wrap">⚠️ ${ai.error}</div>` : ''}

      ${draft ? `
        <!-- Preview de la presentación generada -->
        <div class="bg-white border-2 border-emerald-300 rounded-xl overflow-hidden">
          <div class="bg-emerald-50 border-b border-emerald-200 px-3 py-2 flex justify-between items-center flex-wrap gap-2">
            <div class="text-xs font-bold uppercase text-emerald-900">✅ Generada · ${(draft.slides||[]).length} slides</div>
            <div class="flex gap-1">
              <button onclick="eduDownloadPPTX()" class="bg-slate-900 hover:bg-slate-700 text-white text-xs font-bold px-3 py-1.5 rounded">📥 Descargar PPTX</button>
              <button onclick="eduDownloadSpeakerNotes()" class="bg-blue-100 hover:bg-blue-200 text-blue-900 text-xs font-bold px-3 py-1.5 rounded">📋 Speaker notes</button>
              <button onclick="eduDownloadPresJSON()" class="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded" title="Backup en JSON por si el PPTX no funciona">📄 JSON</button>
            </div>
          </div>
          <div class="p-4 max-h-[60vh] overflow-y-auto">
            <h2 class="text-lg font-bold mb-2">${draft.title}</h2>
            ${draft.outline?.length ? `<div class="text-xs text-slate-600 mb-3"><strong>Outline:</strong> ${draft.outline.join(' → ')}</div>` : ''}
            <div class="space-y-3">
              ${(draft.slides || []).map(s => `
                <div class="border border-slate-200 rounded-lg p-3 hover:shadow-sm">
                  <div class="flex justify-between items-start gap-2 mb-1">
                    <div>
                      <span class="text-[10px] bg-slate-900 text-white px-1.5 py-0.5 rounded font-bold">Slide ${s.number}</span>
                      <span class="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded ml-1">${s.layout || 'content'}</span>
                    </div>
                  </div>
                  <div class="font-bold text-sm">${s.title || ''}</div>
                  ${s.subtitle ? `<div class="text-xs text-slate-600 mt-0.5">${s.subtitle}</div>` : ''}
                  ${(s.bullets || []).length ? `<ul class="text-xs text-slate-700 mt-2 ml-4 list-disc space-y-0.5">${s.bullets.map(b => `<li>${b}</li>`).join('')}</ul>` : ''}
                  ${(s.stats || []).length ? `
                    <div class="mt-2 grid grid-cols-2 md:grid-cols-3 gap-1">
                      ${s.stats.map(st => `<div class="bg-blue-50 border border-blue-200 rounded p-1.5 text-[10px]"><strong>${st.label}</strong><div class="text-blue-700 font-bold">${st.value}</div>${st.source_name?`<div class="text-[9px] text-slate-500">📍 ${st.source_name}</div>`:''}</div>`).join('')}
                    </div>
                  ` : ''}
                  ${s.speaker_notes ? `<details class="mt-2"><summary class="cursor-pointer text-[10px] text-slate-600 font-bold">🎙 Speaker notes</summary><div class="text-[11px] text-slate-700 mt-1 bg-slate-50 rounded p-2 whitespace-pre-wrap">${s.speaker_notes}</div></details>` : ''}
                  ${(s.sources || []).length ? `<div class="text-[9px] text-slate-500 mt-2">Fuentes: ${s.sources.map(src => `<a href="${src.url}" target="_blank" class="text-blue-600 hover:underline">${src.title || src.url}</a>`).join(' · ')}</div>` : ''}
                </div>
              `).join('')}
            </div>
            ${(draft.all_sources || []).length ? `
              <div class="mt-4 pt-3 border-t border-slate-200">
                <div class="text-xs font-bold uppercase text-slate-700 mb-1">📚 Todas las fuentes citadas</div>
                <ul class="text-[10px] text-slate-600 space-y-0.5">
                  ${draft.all_sources.map(src => `<li>• <a href="${src.url}" target="_blank" class="text-blue-600 hover:underline">${src.title || src.url}</a></li>`).join('')}
                </ul>
              </div>
            ` : ''}
          </div>
        </div>
      ` : ''}

      <!-- Historial de presentaciones -->
      ${presentations.length > 0 ? `
        <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div class="bg-slate-100 px-3 py-2 text-xs font-bold uppercase text-slate-700">📚 Historial — ${presentations.length} presentaciones</div>
          <div class="divide-y divide-slate-100 max-h-72 overflow-y-auto">
            ${presentations.map(p => `
              <div class="p-2 flex justify-between items-start gap-2 hover:bg-slate-50">
                <div class="flex-1 min-w-0">
                  <div class="text-xs font-bold truncate">${p.title}</div>
                  <div class="text-[10px] text-slate-500">${p.presentation_type}${p.class_number ? ' · Clase #'+p.class_number : ''} · ${(p.slides||[]).length} slides · ${new Date(p.created_at).toLocaleDateString('es-MX')}</div>
                </div>
                <div class="flex gap-1 flex-shrink-0">
                  <button onclick="eduLoadPresentation('${p.id}')" class="text-blue-600 text-[10px] hover:underline">cargar</button>
                  <button onclick="eduDeletePresentation('${p.id}')" class="text-red-500 hover:text-red-700 text-[10px]">🗑</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

// ════════════════════════════════════════════════════════════════
// 🆕 GENERATE V2 — slide-por-slide síncrono, sin timeout
// Llama a /generate-presentation-v2 con mode='outline' y luego mode='slide'
// una vez por cada slide. Actualiza la barra de progreso en vivo.
// ════════════════════════════════════════════════════════════════
async function eduGeneratePresentationV2(isExpertMode) {
  const w = window.eduPresWizard;

  // Si es modo experto, leer del form de expert
  if (isExpertMode) {
    w.preset_type = document.getElementById('exp-preset')?.value || 'libre';
    w.title       = (document.getElementById('exp-title')?.value || '').trim();
    w.topic       = (document.getElementById('exp-prompt')?.value || '').trim();
    w.slides_count = +(document.getElementById('exp-slides')?.value) || 12;
    w.language    = document.getElementById('exp-language')?.value || 'es';
    w.audience    = w.audience || 'profesionales del rubro';
    if (!w.title || !w.topic) return alert('Título y prompt son obligatorios en modo experto.');
  }

  // Validar auth
  if (!state || !state.user || !state.user.id) return alert('No hay sesión activa. Refrescá y volvé a iniciar sesión.');

  const aiKey = `edu-pres-${eduState.mentorshipId || 'no-mentorship'}`;
  window.aiState = window.aiState || {};
  delete window.aiState[aiKey]; // limpiar draft viejo

  w.generating = true;
  w.cancel = false;
  w.progress = { phase: 'outline', current: 0, total: w.slides_count, message: '📋 Generando outline (estructura del deck)...' };
  eduRender();

  const baseUrl = `${window.SUPABASE_URL}/functions/v1/generate-presentation-v2`;

  // 🔐 AUTH STRICT: el token debe ser el access_token del user (con `sub` claim),
  // NO la anon key. Si la sesión está vacía/expirada, intentamos refresh y si falla
  // pedimos relogin con mensaje claro.
  let token;
  try {
    const sbAuth = (typeof sb !== 'undefined' && sb) ? sb : (window.sb || null);
    if (!sbAuth) throw new Error('Cliente Supabase no disponible');
    let sess = await sbAuth.auth.getSession();
    if (!sess?.data?.session?.access_token) {
      // Intentar refresh por si el token está vencido pero hay refresh_token
      try { await sbAuth.auth.refreshSession(); sess = await sbAuth.auth.getSession(); } catch (e) {}
    }
    token = sess?.data?.session?.access_token;
    if (!token) throw new Error('No hay sesión activa');
    // Sanity: la anon key empieza con eyJ y es muy larga pero NO debería usarse
    if (token === window.SUPABASE_ANON_KEY) throw new Error('Caché devolvió anon key en vez de session token');
  } catch (e) {
    return _eduPresFail(
      '⚠️ Tu sesión expiró o no se pudo leer.\n\n' +
      'Hacé esto:\n' +
      '1) Cerrá sesión (botón Salir abajo a la izquierda)\n' +
      '2) Volvé a entrar con tu email\n' +
      '3) Retomá el wizard\n\n' +
      'Detalle técnico: ' + (e.message || String(e))
    );
  }
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  // PASO 1: OUTLINE
  let outline;
  try {
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        mode: 'outline',
        preset_type: w.preset_type,
        title: w.title,
        topic: w.topic,
        audience: w.audience,
        slides_count: w.slides_count,
        language: w.language,
        tone_extra: w.tone_extra
      })
    });
    const txt = await res.text();
    let r;
    try { r = JSON.parse(txt); } catch { throw new Error(`HTTP ${res.status}: ${txt.slice(0,300)}`); }
    if (!r.ok) throw new Error(r.error || 'Edge function falló');
    outline = r.outline;
    if (!outline || !Array.isArray(outline.slides_outline)) throw new Error('Outline inválido: faltan slides_outline');
    w.progress = { phase: 'outline', current: 0, total: outline.slides_outline.length, message: `✓ Outline listo (${outline.slides_outline.length} slides). Generando slides...` };
    eduRender();
  } catch (e) {
    return _eduPresFail('Outline falló: ' + e.message);
  }

  // PASO 2: SLIDES (uno por uno, con retry x1)
  const slides = [];
  for (let i = 0; i < outline.slides_outline.length; i++) {
    if (w.cancel) return _eduPresFail('Generación cancelada por el usuario.');
    const slideInfo = outline.slides_outline[i];
    const prevSlide = i > 0 ? outline.slides_outline[i - 1] : null;
    const nextOutline = i + 1 < outline.slides_outline.length ? outline.slides_outline[i + 1] : null;

    w.progress = { phase: 'slide', current: i + 1, total: outline.slides_outline.length, message: `🎨 Slide ${i + 1}/${outline.slides_outline.length}: ${slideInfo.title}` };
    eduRender();

    let slide = null;
    for (let attempt = 0; attempt < 2 && !slide; attempt++) {
      try {
        const res = await fetch(baseUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            mode: 'slide',
            preset_type: w.preset_type,
            audience: w.audience,
            language: w.language,
            slide_info: slideInfo,
            outline,
            prev_slide: prevSlide,
            next_outline: nextOutline
          })
        });
        const txt = await res.text();
        let r;
        try { r = JSON.parse(txt); } catch { throw new Error(`HTTP ${res.status}: ${txt.slice(0,200)}`); }
        if (!r.ok) throw new Error(r.error || 'edge function falló');
        slide = r.slide;
      } catch (e) {
        if (attempt === 1) {
          // Fallback: slide básico para no abortar todo el deck
          slide = {
            number: slideInfo.number,
            title: slideInfo.title,
            layout: slideInfo.layout || 'content',
            block_label: slideInfo.block_label || '',
            bullets: [slideInfo.purpose || 'Contenido del slide'],
            speaker_notes: `Hubo un error generando este slide. Editalo manual. Error: ${e.message}`,
            _generation_error: e.message
          };
        }
      }
    }
    slides.push(slide);
  }

  // PASO 3: ENSAMBLAR EN EL FORMATO QUE ESPERA EL PREVIEW/DOWNLOAD
  const presentation = {
    title: outline.title || w.title,
    subtitle: outline.subtitle || '',
    brand: w.audience.toLowerCase().includes('rental profit') ? 'RENTAL PROFITS' : w.audience.toLowerCase().includes('flipping') ? 'FLIPPING RENTALS' : 'EMPRESA OS',
    outline: (outline.blocks || []).map(b => b.name),
    slides,
    all_sources: [],
    summary: outline.narrative_arc || ''
  };

  // Guardar en aiState para que el preview/download funcionen igual que antes
  window.aiState[aiKey] = { loading: false, presentation };

  // (Opcional) guardar en edu_presentations
  try {
    const m = eduCurrentMentorship();
    if (m && typeof sb !== 'undefined') {
      const { data: saved } = await sb.from('edu_presentations').insert({
        mentorship_id: m.id,
        title: presentation.title,
        topic: w.topic,
        audience: w.audience,
        presentation_type: w.preset_type,
        duration_min: w.slides_count * 4,
        language: w.language,
        outline: presentation.outline,
        slides: presentation.slides,
        sources: [],
        status: 'generated',
        generated_by: state.user.id
      }).select().single();
      if (saved) window.aiState[aiKey].saved_id = saved.id;
    }
  } catch (e) { console.warn('[edu-pres-v2] no se pudo guardar en DB:', e.message); }

  w.generating = false;
  w.progress = { phase: 'done', current: slides.length, total: slides.length, message: '✓ Listo. Descargá la PPTX abajo.' };
  if (typeof eduLoadAll === 'function') await eduLoadAll();
  eduRender();
}

function _eduPresFail(msg) {
  const w = window.eduPresWizard;
  w.generating = false;
  w.progress = { phase: 'error', current: 0, total: 0, message: msg };
  const aiKey = `edu-pres-${eduState.mentorshipId || 'no-mentorship'}`;
  window.aiState = window.aiState || {};
  window.aiState[aiKey] = { loading: false, error: msg };
  eduRender();
}

window.eduGeneratePresentationV2 = eduGeneratePresentationV2;

async function eduGeneratePresentation() {
  const title = (document.getElementById('edu-pres-title')?.value || '').trim();
  const topic = (document.getElementById('edu-pres-topic')?.value || '').trim();
  if (!title || !topic) return alert('Título y tema son obligatorios');
  if (!state || !state.user || !state.user.id) {
    return alert('No hay sesión activa. Refresh la página y volvé a iniciar sesión.');
  }
  const m = eduCurrentMentorship();
  if (!m && !eduState.mentorshipId) {
    return alert('Seleccioná una mentoría primero (los botones arriba del formulario).');
  }
  const aiKey = `edu-pres-${eduState.mentorshipId || 'no-mentorship'}`;
  window.aiState = window.aiState || {};
  window.aiState[aiKey] = { loading: true, status: 'starting', started_at: Date.now() };
  eduRender();
  try {
    const payload = {
      mentorship_id: m?.id,
      title,
      topic,
      audience: document.getElementById('edu-pres-audience')?.value || undefined,
      presentation_type: document.getElementById('edu-pres-type')?.value || 'class',
      class_number: +document.getElementById('edu-pres-class-number')?.value || null,
      duration_min: +document.getElementById('edu-pres-duration')?.value || 60,
      slides_count: +document.getElementById('edu-pres-slides')?.value || 15,
      language: document.getElementById('edu-pres-lang')?.value || 'es',
      outline_hint: document.getElementById('edu-pres-outline')?.value || null,
      domain: document.getElementById('edu-pres-domain')?.value || 'real-estate',
      geographic_focus: document.getElementById('edu-pres-geo')?.value || null,
      preferred_sources: document.getElementById('edu-pres-sources')?.value || null,
      require_live_data: document.getElementById('edu-pres-live')?.checked ?? true,
      research_mode: document.getElementById('edu-pres-research')?.checked || false,
      user_id: state.user.id
    };
    console.log('[edu-pres] POST →', payload);
    let res, r;
    try {
      res = await fetch(`${window.SUPABASE_URL}/functions/v1/generate-presentation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${await getAccessToken()}` },
        body: JSON.stringify(payload)
      });
    } catch (netErr) {
      throw new Error('Sin conexión a la edge function: ' + netErr.message);
    }
    const txt = await res.text();
    try { r = JSON.parse(txt); }
    catch { throw new Error(`HTTP ${res.status}: respuesta no-JSON: ${txt.slice(0,300)}`); }
    console.log('[edu-pres] response →', r);
    if (!r.ok) throw new Error(r.error || `HTTP ${res.status}: falló sin mensaje`);

    // Pattern async: job_id devuelto → polling cada 5s hasta done/error
    if (r.async && r.job_id) {
      // Capturar mentorshipId al inicio para detectar si el user cambia mientras polleamos
      const lockedMentorshipId = eduState.mentorshipId;
      window.aiState[aiKey] = { loading: true, job_id: r.job_id, status: 'running', started_at: Date.now(), missed_polls: 0 };
      eduRender();
      const pollStart = Date.now();
      const maxWait = 10 * 60 * 1000; // 10 min máximo
      const MAX_CONSECUTIVE_MISSES = 6; // Si después de 30s no encontramos el job, abortamos
      while (Date.now() - pollStart < maxWait) {
        await new Promise(rs => setTimeout(rs, 5000));
        // Si el user cambió de mentoría o cerró el modal, abortar
        if (eduState.mentorshipId !== lockedMentorshipId || !document.getElementById('edu-root')) {
          console.log('[edu-pres] polling abortado: cambio de mentoría o modal cerrado');
          break;
        }
        const pollRes = await sb.from('edu_pres_jobs').select('*').eq('id', r.job_id).maybeSingle();
        const job = pollRes && pollRes.data;
        const pollErr = pollRes && pollRes.error;

        if (!job) {
          // No encontrado — puede ser RLS, latencia eventual, o realmente eliminado
          window.aiState[aiKey].missed_polls = (window.aiState[aiKey].missed_polls || 0) + 1;
          window.aiState[aiKey].last_poll_error = pollErr ? pollErr.message : 'job no encontrado';
          window.aiState[aiKey].elapsed_sec = Math.round((Date.now() - pollStart) / 1000);
          eduRender();
          if (window.aiState[aiKey].missed_polls >= MAX_CONSECUTIVE_MISSES) {
            window.aiState[aiKey] = {
              loading: false,
              error: `No pude leer el job ${r.job_id} después de ${MAX_CONSECUTIVE_MISSES * 5}s.\n\nPosibles causas:\n• RLS bloqueando (correr supabase/edu-pres-jobs-rls-fix.sql)\n• Sesión expirada (cerrá sesión y volvé a entrar)\n• Job realmente borrado.\n\nÚltimo error: ${window.aiState[aiKey].last_poll_error}`
            };
            break;
          }
          continue;
        }
        // Job encontrado — reset misses
        window.aiState[aiKey].missed_polls = 0;
        window.aiState[aiKey].status = job.status;
        window.aiState[aiKey].elapsed_sec = Math.round((Date.now() - pollStart) / 1000);
        eduRender();
        if (job.status === 'done') {
          window.aiState[aiKey] = {
            loading: false, presentation: job.result, saved_id: job.saved_pres_id,
            web_searches: job.web_searches, tokens: { total: job.tokens_used },
            duration_ms: job.duration_ms
          };
          await eduLoadAll();
          break;
        }
        if (job.status === 'error') {
          window.aiState[aiKey] = { loading: false, error: 'Edge function devolvió error: ' + (job.error_message || 'sin mensaje') };
          break;
        }
      }
      if (window.aiState[aiKey].loading) {
        window.aiState[aiKey] = { loading: false, error: 'Timeout polling (>10min). Job: ' + r.job_id };
      }
    } else {
      // Backward compat (respuesta sincrónica vieja)
      window.aiState[aiKey] = { loading: false, presentation: r.presentation, saved_id: r.saved_id, web_searches: r.web_searches, tokens: r.tokens };
      await eduLoadAll();
    }
  } catch (e) {
    window.aiState[aiKey] = { loading: false, error: e.message };
  }
  eduRender();
}

// Carga PptxGenJS dinámicamente si no está disponible (fallback robusto)
async function _eduEnsurePptxGen() {
  if (typeof PptxGenJS !== 'undefined') return true;
  console.warn('[edu-pres] PptxGenJS no está en window. Intentando cargarla dinámicamente...');
  return new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/gh/gitbrent/PptxGenJS@v3.12.0/dist/pptxgen.bundle.js';
    s.onload = () => { console.log('[edu-pres] PptxGenJS cargada dinámicamente OK'); resolve(true); };
    s.onerror = () => { console.error('[edu-pres] No pude cargar PptxGenJS del CDN'); resolve(false); };
    document.head.appendChild(s);
  });
}

// ─── DOWNLOAD PPTX usando PptxGenJS — robusto a 3 niveles ───
async function eduDownloadPPTX() {
  // Buscar la presentación
  const k1 = `edu-pres-${eduState.mentorshipId}`;
  const k2 = `edu-pres-${eduState.mentorshipId || 'no-mentorship'}`;
  const p = (window.aiState?.[k1] || window.aiState?.[k2] || {}).presentation;
  if (!p) return alert('Sin presentación cargada. Generá una primero.');
  if (!Array.isArray(p.slides) || !p.slides.length) return alert('La presentación no tiene slides válidos.');
  console.log('[edu-pres] Click Descargar PPTX. Slides:', p.slides.length, '· Título:', p.title);

  // Asegurar que PptxGenJS esté disponible
  const ok = await _eduEnsurePptxGen();
  if (!ok || typeof PptxGenJS === 'undefined') {
    return alert('⚠️ No pude cargar la librería PptxGenJS.\n\nProbá:\n1) Verificar que tengas internet\n2) Desactivar bloqueadores de ads/scripts\n3) Hard refresh (Cmd+Shift+R)\n\nMientras tanto, podés usar el botón "📋 Speaker notes" para descargar como markdown.');
  }

  // Construir + descargar con método robusto (blob + anchor)
  try {
    const pres = eduBuildPPTX(p, { download: false }); // construir sin auto-download
    const safeName = (p.title || 'presentacion').replace(/[^a-z0-9]/gi, '_').slice(0, 60);
    const fileName = `${new Date().toISOString().split('T')[0]}_${safeName}.pptx`;

    // writeFile es el método "fácil" pero falla en algunos contextos
    // Usar write() → blob → anchor click es más confiable
    console.log('[edu-pres] PPT construido OK. Generando blob...');
    const blob = await pres.write({ outputType: 'blob' });
    console.log('[edu-pres] Blob listo, tamaño:', blob.size, 'bytes. Descargando como', fileName);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
    console.log('[edu-pres] ✅ Descarga disparada');
  } catch (e) {
    console.error('[edu-pres] Error generando PPTX:', e);
    // Fallback: probar writeFile() directo (método viejo)
    try {
      console.log('[edu-pres] Intentando fallback writeFile()...');
      eduBuildPPTX(p, { download: true });
    } catch (e2) {
      console.error('[edu-pres] Fallback writeFile() también falló:', e2);
      alert('⚠️ Error generando el .pptx:\n\n' + (e?.message || String(e)) + '\n\nMientras tanto:\n• Click "📋 Speaker notes" para markdown\n• O click "📄 JSON" para descargar el contenido raw\n\nPasame screenshot de la consola (F12) para que lo arregle.');
    }
  }
}

// Descarga la presentación como JSON (plan C — útil si el .pptx no funciona)
function eduDownloadPresJSON() {
  const k1 = `edu-pres-${eduState.mentorshipId}`;
  const k2 = `edu-pres-${eduState.mentorshipId || 'no-mentorship'}`;
  const p = (window.aiState?.[k1] || window.aiState?.[k2] || {}).presentation;
  if (!p) return alert('Sin presentación.');
  const blob = new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = (p.title || 'presentacion').replace(/[^a-z0-9]/gi, '_').slice(0, 60);
  a.href = url; a.download = `${safeName}.json`;
  document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
}
window.eduDownloadPresJSON = eduDownloadPresJSON;

// ──────────────────────────────────────────────────────────────────
// HELPERS DE ENRIQUECIMIENTO VISUAL (Unsplash + QuickChart auto)
// ──────────────────────────────────────────────────────────────────
// NEGOCIO FIX: Unsplash Source API descontinuada en junio 2024 → 404/redirect.
// Migrado a Picsum (gratis, sin auth, estable). Seed determinístico por query
// para que el mismo slide siempre tenga la misma imagen.
// FLAG: bloquear imágenes externas porque la CSP de Vercel no permite
// connect-src a picsum.photos / quickchart.io. Cuando se arregle el CSP
// (vercel.json), poner en false para reactivar imágenes auto.
const _EDU_BLOCK_EXTERNAL_IMG = true;

function eduPicsumUrl(query, w = 1600, h = 900) {
  if (_EDU_BLOCK_EXTERNAL_IMG) return null;
  let h2 = 0;
  for (let i = 0; i < String(query||'').length; i++) {
    h2 = ((h2 << 5) - h2 + String(query).charCodeAt(i)) | 0;
  }
  const seed = Math.abs(h2) % 1000;
  return `https://picsum.photos/seed/${seed}/${w}/${h}`;
}
function eduUnsplashUrl(query, w = 1600, h = 900) {
  return eduPicsumUrl(query, w, h);
}
function eduQuickChartUrl(config, w = 900, h = 500) {
  if (_EDU_BLOCK_EXTERNAL_IMG) return null;
  const c = encodeURIComponent(JSON.stringify(config));
  return `https://quickchart.io/chart?bkg=white&w=${w}&h=${h}&c=${c}`;
}
function eduSlideToImageQuery(slide, presTitle) {
  if (slide.image_query) return slide.image_query;
  const txt = `${slide.title || ''} ${slide.subtitle || ''} ${presTitle || ''}`.toLowerCase();
  if (/real estate|casa|inmobili|flip|wholesa|propiedad/.test(txt)) return 'modern suburban home neighborhood';
  if (/dinero|hard money|financ|loan|invest/.test(txt)) return 'finance investment money charts';
  if (/equipo|team|contratist|networking/.test(txt)) return 'business team meeting professional';
  if (/remodel|obra|construc/.test(txt)) return 'home renovation construction worker';
  if (/buy box|análisis|deal|underwrit/.test(txt)) return 'real estate analysis data charts';
  if (/vend|sale|listing|stagi/.test(txt)) return 'beautiful staged living room';
  if (/cierre|escritu|legal/.test(txt)) return 'business contract signing handshake';
  if (/escal|crec|sistem/.test(txt)) return 'business growth strategy success';
  return 'professional business meeting modern office';
}
function eduStatsToChartUrl(stats, brand = '2563EB') {
  if (!stats || !stats.length) return null;
  const numericStats = stats.filter(s => {
    const v = String(s.value || '').replace(/[$,%kKmMxX\s]/g, '');
    return !isNaN(parseFloat(v));
  });
  if (numericStats.length < 2) return null;
  return eduQuickChartUrl({
    type: 'bar',
    data: {
      labels: numericStats.map(s => String(s.label || '').slice(0, 18)),
      datasets: [{
        data: numericStats.map(s => parseFloat(String(s.value).replace(/[$,%kKmMxX\s]/g, ''))),
        backgroundColor: '#' + brand,
        borderRadius: 8
      }]
    },
    options: {
      plugins: { legend: { display: false }, title: { display: false } },
      scales: { y: { beginAtZero: true, grid: { color: '#e5e7eb' } }, x: { grid: { display: false } } }
    }
  });
}

// Builder de PPTX con layouts ricos estilo Flipping Rentals
function eduBuildPPTX(p, opts = {}) {
  const pres = new PptxGenJS();
  pres.layout = 'LAYOUT_WIDE';
  pres.title = p.title;
  pres.company = 'Empresa OS';

  // Branding
  const BRAND = (p.brand || 'EMPRESA OS').toUpperCase();
  const YEAR = String(new Date().getFullYear());
  const NAV = '0F172A', NAV_LIGHT = '1E293B', ACCENT = '2563EB', GOLD = 'D97706';
  const GRAY_LIGHT = 'F1F5F9', GRAY_MED = '64748B', WHITE = 'FFFFFF';

  // Master con header + footer branding
  pres.defineSlideMaster({
    title: 'BRAND',
    background: { color: WHITE },
    objects: [
      // Header: marca + año en esquina superior izquierda
      { text: { text: BRAND, options: { x: 0.4, y: 0.18, w: 5, h: 0.25, color: GRAY_MED, fontSize: 9, bold: true, charSpacing: 2 } } },
      { text: { text: YEAR, options: { x: 12.4, y: 0.18, w: 0.6, h: 0.25, color: GRAY_MED, fontSize: 9, bold: true, align: 'right' } } },
      // Línea divisoria
      { rect: { x: 0.4, y: 0.45, w: 12.5, h: 0.02, fill: { color: GRAY_LIGHT } } },
      // Footer
      { rect: { x: 0, y: 7.1, w: 13.333, h: 0.4, fill: { color: NAV } } },
      { text: { text: `${BRAND} · ${(p.title || '').slice(0, 60)}`, options: { x: 0.4, y: 7.15, w: 10, h: 0.3, color: WHITE, fontSize: 9 } } }
    ],
    slideNumber: { x: 12.6, y: 7.15, color: WHITE, fontSize: 10 }
  });

  // Master sin chrome (para covers)
  pres.defineSlideMaster({ title: 'BARE', background: { color: NAV } });

  const slides = p.slides || [];
  let failedCount = 0;
  slides.forEach((s, idx) => {
    try {
    const isCover = s.layout === 'cover' || (idx === 0 && !s.layout);
    const slide = pres.addSlide({ masterName: isCover ? 'BARE' : 'BRAND' });

    if (isCover) return renderCover(slide, s, p, { BRAND, YEAR, ACCENT, GOLD, WHITE, GRAY_MED });

    // Block label (BLOQUE N · TEMA) sobre el título — pedagogía estilo Borja Ramírez
    if (s.block_label) {
      slide.addText(String(s.block_label).toUpperCase(), {
        x: 0.4, y: 0.6, w: 12.5, h: 0.3,
        fontSize: 11, bold: true, color: GOLD, charSpacing: 3
      });
      slide.addShape('rect', { x: 0.4, y: 0.92, w: 0.9, h: 0.045, fill: { color: GOLD } });
    }

    // Título de slide (más abajo si hay block_label)
    const titleY = s.block_label ? 1.05 : 0.7;
    slide.addText(s.title || `Slide ${s.number}`, { x: 0.4, y: titleY, w: 12.5, h: 0.6, fontSize: 26, bold: true, color: NAV });
    if (s.subtitle) slide.addText(s.subtitle, { x: 0.4, y: titleY + 0.6, w: 12.5, h: 0.4, fontSize: 14, color: GRAY_MED, italic: true });

    const C = { NAV, NAV_LIGHT, ACCENT, GOLD, GRAY_LIGHT, GRAY_MED, WHITE, BRAND };

    // ─── ENRIQUECIMIENTO AUTO (DESACTIVADO) ─────────────────────────
    // BUG: Picsum + QuickChart están bloqueados por CSP `connect-src` de Vercel.
    // PptxGenJS intenta fetch xhr y falla → el deck entero no descarga.
    // Hasta agregar esos dominios al CSP (o usar base64 inline), no auto-asignamos.
    // Si V2 devuelve image_url/chart_url explícita, igual lo intentamos pero con
    // safety: si la URL no carga, el render fallback a versión sin imagen.
    // ── ANTES (rompía):
    //   if (!s.image_url ... ) s.image_url = eduUnsplashUrl(...);
    //   if (s.layout === 'chart-spotlight' && ...) s.chart_url = eduStatsToChartUrl(...);
    // ── AHORA: dejamos las flags pero NO inventamos URLs externas.
    const _BLOCK_EXTERNAL_IMAGES = true;
    if (_BLOCK_EXTERNAL_IMAGES) {
      // Limpiar image_url externas que vinieron del LLM por las dudas
      if (s.image_url && /^https?:\/\/(picsum|images\.unsplash|quickchart)/i.test(s.image_url)) {
        delete s.image_url;
      }
      if (s.chart_url && /^https?:\/\/(picsum|images\.unsplash|quickchart)/i.test(s.chart_url)) {
        delete s.chart_url;
      }
    }

    switch (s.layout) {
      case 'agenda':              renderAgenda(slide, s, C); break;
      case 'comparison':          renderComparison(slide, s, C); break;
      case 'benefits':            renderBenefits(slide, s, C); break;
      case 'case-study':          renderCaseStudy(slide, s, C); break;
      case 'framework':           renderFramework(slide, s, C); break;
      case 'checklist':           renderChecklist(slide, s, C); break;
      case 'strategy-grid':       renderStrategyGrid(slide, s, C); break;
      case 'metrics-dashboard':   renderMetricsDashboard(slide, s, C); break;
      case 'quote':               renderQuote(slide, s, C); break;
      case 'closing':             renderClosing(slide, s, p, C); break;
      case 'learning-objectives': renderLearningObjectives(slide, s, C); break;
      case 'reflection-recap':    renderReflectionRecap(slide, s, C); break;
      case 'transfer-activity':   renderTransferActivity(slide, s, C); break;
      case 'goldbox':             renderGoldbox(slide, s, C); break;
      case 'highlight':           renderHighlight(slide, s, C); break;
      // ─── NUEVOS LAYOUTS VISUALES PREMIUM ───
      case 'hero-image':          renderHeroImage(slide, s, C); break;
      case 'split-image':         renderSplitImage(slide, s, C); break;
      case 'chart-spotlight':     renderChartSpotlight(slide, s, C); break;
      case 'image-grid':          renderImageGrid(slide, s, C); break;
      default:                    renderDefault(slide, s, C);
    }

    // Transition_out visible al pie del slide — hilo conductor visible
    if (s.transition_out && !isCover) {
      slide.addShape('rect', { x: 0, y: 6.92, w: 13.333, h: 0.18, fill: { color: GOLD }, line: { color: GOLD } });
      slide.addText('→ ' + String(s.transition_out).slice(0, 130), {
        x: 0.4, y: 6.7, w: 12.5, h: 0.22, fontSize: 9, italic: true, color: GRAY_MED, align: 'right'
      });
    }

    // Speaker notes con transitions explícitas (lo que el coach DIRÁ al pasar slides)
    const notesParts = [];
    if (s.transition_in)  notesParts.push('🔗 CONEXIÓN (decir al empezar):\n' + s.transition_in);
    if (s.speaker_notes)  notesParts.push((s.transition_in ? '\n📢 CONTENIDO:\n' : '') + s.speaker_notes);
    if (s.transition_out) notesParts.push('\n➡️ PUENTE al siguiente slide:\n' + s.transition_out);
    if ((s.sources||[]).length) notesParts.push('\n📚 Fuentes:\n' + s.sources.map(src => '• ' + (src.title||'') + ' — ' + (src.url||'')).join('\n'));
    if (notesParts.length) slide.addNotes(notesParts.join('\n'));
    } catch (slideErr) {
      // Si una slide individual falla al renderearse, no abortamos todo el deck.
      // Agregamos slide placeholder con el error visible.
      console.warn(`[edu-pres] Slide ${idx+1} (${s?.layout||'?'}) falló: ${slideErr?.message}`);
      failedCount++;
      try {
        const fb = pres.addSlide({ masterName: 'BRAND' });
        fb.addText(s?.title || `Slide ${idx+1}`, { x: 0.4, y: 1, w: 12.5, h: 0.8, fontSize: 26, bold: true, color: NAV });
        fb.addText('⚠️ Hubo un error renderizando este slide. Editalo manual.', { x: 0.4, y: 2.2, w: 12.5, h: 0.5, fontSize: 14, italic: true, color: GRAY_MED });
        if (Array.isArray(s?.bullets) && s.bullets.length) {
          fb.addText(s.bullets.map(b => '• ' + b).join('\n'), { x: 0.4, y: 3, w: 12.5, h: 3, fontSize: 14, color: NAV_LIGHT });
        }
        if (s?.speaker_notes) fb.addNotes(s.speaker_notes + '\n\n[Error técnico: ' + slideErr.message + ']');
      } catch (_) {}
    }
  });
  if (failedCount > 0) console.warn(`[edu-pres] ${failedCount}/${slides.length} slides cayeron a placeholder.`);

  // Slide final con fuentes
  if ((p.all_sources || []).length) {
    const sld = pres.addSlide({ masterName: 'BRAND' });
    sld.addText('Fuentes citadas', { x: 0.4, y: 0.7, w: 12.5, h: 0.6, fontSize: 26, bold: true, color: NAV });
    const list = p.all_sources.slice(0, 30).map((src, i) => ({
      text: `${i+1}. ${src.title || src.url}\n`,
      options: { fontSize: 10, color: ACCENT, breakLine: true }
    }));
    sld.addText(list, { x: 0.4, y: 1.5, w: 12.5, h: 5.3 });
  }

  if (opts.download !== false) {
    const safeName = (p.title || 'presentacion').replace(/[^a-z0-9]/gi, '_').slice(0, 60);
    pres.writeFile({ fileName: `${new Date().toISOString().split('T')[0]}_${safeName}.pptx` });
  }
  return pres;
}

// ─── LAYOUT RENDERERS ───
function renderCover(slide, s, p, c) {
  // Background image hero opcional (auto-generada si no se especifica)
  const heroUrl = s.image_url || eduUnsplashUrl(eduSlideToImageQuery({title: s.title || p.title, subtitle: s.subtitle}, p.title));
  try {
    slide.addImage({ path: heroUrl, x: 0, y: 0, w: 13.333, h: 7.5, sizing: { type: 'cover', w: 13.333, h: 7.5 } });
    // Overlay oscuro para que el texto se lea
    slide.addShape('rect', { x: 0, y: 0, w: 13.333, h: 7.5, fill: { color: '0F172A', transparency: 35 }, line: { type: 'none' } });
  } catch(e) { /* si la imagen falla, fondo navy normal */ }

  // Marca arriba
  slide.addText(c.BRAND, { x: 0.5, y: 0.5, w: 12.3, h: 0.4, color: c.GOLD, fontSize: 13, bold: true, charSpacing: 4 });
  slide.addText(c.YEAR, { x: 12.3, y: 0.5, w: 0.6, h: 0.4, color: c.GRAY_MED, fontSize: 13, align: 'right' });
  // Título central
  slide.addText(s.title || p.title, { x: 0.5, y: 2.0, w: 12.3, h: 1.6, fontSize: 50, bold: true, color: c.WHITE, align: 'center' });
  if (s.subtitle) {
    slide.addShape('rect', { x: 1, y: 3.8, w: 11.3, h: 0.04, fill: { color: c.GOLD } });
    slide.addText(`"${s.subtitle}"`, { x: 0.5, y: 4.0, w: 12.3, h: 0.8, fontSize: 18, color: 'CBD5E1', align: 'center', italic: true });
  }
  // 3 KPIs grandes
  const kpis = s.metric_cards || s.stats || [];
  if (kpis.length) {
    const top3 = kpis.slice(0, 3);
    const totalW = 12;
    const cardW = totalW / top3.length;
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
  const totalW = 12;
  const cardW = totalW / n;
  const y = 2.6;
  steps.slice(0, n).forEach((st, i) => {
    const x = 0.7 + i * cardW;
    // Círculo con número
    slide.addShape('ellipse', { x: x + cardW/2 - 0.4, y, w: 0.8, h: 0.8, fill: { color: c.ACCENT }, line: { color: c.ACCENT } });
    slide.addText(String(i+1), { x: x + cardW/2 - 0.4, y, w: 0.8, h: 0.8, fontSize: 24, bold: true, color: c.WHITE, align: 'center', valign: 'middle' });
    // Step name
    slide.addText(String(st.step || st.title || ''), { x: x + 0.1, y: y + 1.0, w: cardW - 0.2, h: 0.5, fontSize: 16, bold: true, color: c.NAV, align: 'center' });
    // Label
    if (st.label) slide.addText(String(st.label), { x: x + 0.1, y: y + 1.5, w: cardW - 0.2, h: 0.7, fontSize: 10, color: c.NAV_LIGHT, align: 'center' });
    // Flecha conectora
    if (i < n - 1) {
      slide.addText('→', { x: x + cardW - 0.3, y: y + 0.2, w: 0.4, h: 0.5, fontSize: 20, color: c.NAV_LIGHT, align: 'center' });
    }
  });
}

function renderComparison(slide, s, c) {
  const cmp = s.comparison || { left: { title: 'A', items: [] }, right: { title: 'B', items: [] } };
  const y0 = 2.0;
  const w = 5.9, h = 4.7;
  // LEFT card
  slide.addShape('roundRect', { x: 0.5, y: y0, w, h, fill: { color: 'FEE2E2' }, line: { color: 'F87171', width: 2 }, rectRadius: 0.15 });
  slide.addText(cmp.left?.title || 'Opción A', { x: 0.7, y: y0 + 0.2, w: w - 0.4, h: 0.5, fontSize: 18, bold: true, color: 'B91C1C' });
  const leftItems = (cmp.left?.items || []).map(t => ({ text: '✗ ' + t, options: { fontSize: 13, color: '7F1D1D', breakLine: true } }));
  slide.addText(leftItems, { x: 0.8, y: y0 + 0.9, w: w - 0.5, h: h - 1.1 });
  // RIGHT card
  slide.addShape('roundRect', { x: 6.95, y: y0, w, h, fill: { color: 'DCFCE7' }, line: { color: '4ADE80', width: 2 }, rectRadius: 0.15 });
  slide.addText(cmp.right?.title || 'Opción B', { x: 7.15, y: y0 + 0.2, w: w - 0.4, h: 0.5, fontSize: 18, bold: true, color: '14532D' });
  const rightItems = (cmp.right?.items || []).map(t => ({ text: '✓ ' + t, options: { fontSize: 13, color: '14532D', breakLine: true } }));
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
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 0.5 + col * (cardW + 0.3);
    const y = 2.0 + row * (cardH + 0.2);
    slide.addShape('roundRect', { x, y, w: cardW, h: cardH, fill: { color: c.GRAY_LIGHT }, line: { color: 'CBD5E1' }, rectRadius: 0.1 });
    // Número en círculo
    slide.addShape('ellipse', { x: x + 0.2, y: y + 0.2, w: 0.6, h: 0.6, fill: { color: c.ACCENT }, line: { color: c.ACCENT } });
    slide.addText(String(i+1), { x: x + 0.2, y: y + 0.2, w: 0.6, h: 0.6, fontSize: 18, bold: true, color: c.WHITE, align: 'center', valign: 'middle' });
    slide.addText(b, { x: x + 1.0, y: y + 0.2, w: cardW - 1.2, h: cardH - 0.4, fontSize: 13, color: c.NAV, valign: 'middle' });
  });
}

function renderCaseStudy(slide, s, c) {
  const cs = s.case_study;
  if (!cs) return renderDefault(slide, s, c);
  // Banner del caso
  slide.addShape('roundRect', { x: 0.4, y: 1.8, w: 12.5, h: 0.7, fill: { color: c.NAV }, line: { color: c.NAV }, rectRadius: 0.1 });
  slide.addText(`📍 ${cs.name}${cs.location ? ' · ' + cs.location : ''}`, { x: 0.7, y: 1.85, w: 8, h: 0.6, fontSize: 18, bold: true, color: 'FFFFFF', valign: 'middle' });
  if (cs.estrategia) slide.addText(cs.estrategia, { x: 8.7, y: 1.85, w: 4, h: 0.6, fontSize: 13, color: c.GOLD, valign: 'middle', align: 'right', italic: true });

  // 4 KPI cards
  const kpis = [
    { label: 'Compra', value: cs.compra ? '$' + Math.round(cs.compra).toLocaleString() : '—', color: '64748B' },
    { label: 'Remodelación', value: cs.remodelacion ? '$' + Math.round(cs.remodelacion).toLocaleString() : '—', color: '64748B' },
    { label: 'ARV', value: cs.arv ? '$' + Math.round(cs.arv).toLocaleString() : '—', color: c.ACCENT },
    { label: 'ROI Anual', value: cs.roi_anual ? cs.roi_anual + '%' : '—', color: c.GOLD }
  ];
  kpis.forEach((k, i) => {
    const x = 0.4 + i * 3.15;
    slide.addShape('roundRect', { x, y: 2.8, w: 3.0, h: 1.6, fill: { color: c.GRAY_LIGHT }, line: { color: 'CBD5E1' }, rectRadius: 0.1 });
    slide.addText(k.label, { x: x + 0.15, y: 2.9, w: 2.7, h: 0.3, fontSize: 10, color: '64748B', bold: true });
    slide.addText(k.value, { x: x + 0.15, y: 3.25, w: 2.7, h: 0.9, fontSize: 28, bold: true, color: k.color, valign: 'middle' });
  });

  // Cash flow mensual destacado
  if (cs.cash_flow_monthly) {
    slide.addShape('roundRect', { x: 0.4, y: 4.6, w: 6.05, h: 1.5, fill: { color: 'ECFDF5' }, line: { color: '6EE7B7', width: 2 }, rectRadius: 0.1 });
    slide.addText('💰 Cash Flow Mensual', { x: 0.6, y: 4.7, w: 5.8, h: 0.3, fontSize: 11, color: '047857', bold: true });
    slide.addText('$' + Math.round(cs.cash_flow_monthly).toLocaleString() + ' /mes', { x: 0.6, y: 5.05, w: 5.8, h: 1.0, fontSize: 36, bold: true, color: '047857', valign: 'middle' });
  }
  // Duración
  if (cs.duracion_meses) {
    slide.addShape('roundRect', { x: 6.55, y: 4.6, w: 6.4, h: 1.5, fill: { color: 'EFF6FF' }, line: { color: '93C5FD', width: 2 }, rectRadius: 0.1 });
    slide.addText('⏱ Duración del proyecto', { x: 6.75, y: 4.7, w: 6.0, h: 0.3, fontSize: 11, color: '1E40AF', bold: true });
    slide.addText(cs.duracion_meses + ' meses', { x: 6.75, y: 5.05, w: 6.0, h: 1.0, fontSize: 36, bold: true, color: '1E40AF', valign: 'middle' });
  }

  // Key takeaway
  if (cs.key_takeaway) {
    slide.addText(`"${cs.key_takeaway}"`, { x: 0.4, y: 6.25, w: 12.5, h: 0.7, fontSize: 13, color: c.NAV, italic: true, align: 'center' });
  }
}

function renderFramework(slide, s, c) {
  const items = s.framework_items || (s.bullets || []).map(b => ({ label: b, value: '' }));
  if (!items.length) return;
  const cols = 2, rows = Math.ceil(items.length / cols);
  const cardW = 5.9, cardH = 0.7;
  items.forEach((it, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = 0.5 + col * 6.3;
    const y = 2.0 + row * (cardH + 0.15);
    slide.addShape('rect', { x, y, w: 0.08, h: cardH, fill: { color: c.ACCENT } });
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
    // Checkbox
    slide.addShape('rect', { x: 0.5, y: y + 0.1, w: 0.5, h: 0.5, fill: { color: '10B981' }, line: { color: '10B981' } });
    slide.addText('✓', { x: 0.5, y: y + 0.1, w: 0.5, h: 0.5, fontSize: 22, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle' });
    // Title
    slide.addText(it.title || '', { x: 1.2, y, w: 11.5, h: 0.35, fontSize: 15, bold: true, color: c.NAV });
    // Detail
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
    const y = 1.9;
    const h = 4.5;
    slide.addShape('roundRect', { x, y, w: cardW, h, fill: { color: 'FFFFFF' }, line: { color: 'E2E8F0', width: 1 }, rectRadius: 0.1 });
    // Header colorido
    slide.addShape('rect', { x, y, w: cardW, h: 0.7, fill: { color: c.NAV }, line: { color: c.NAV } });
    slide.addText(op.name || `Opción ${i+1}`, { x: x + 0.1, y: y + 0.1, w: cardW - 0.2, h: 0.5, fontSize: 15, bold: true, color: 'FFFFFF', align: 'center' });
    // Métricas
    const metrics = [
      { k: 'Cash Flow', v: op.cash_flow || '—' },
      { k: 'Escalabilidad', v: op.scalability || '—' },
      { k: 'Operación', v: op.operation || '—' }
    ];
    metrics.forEach((m, mi) => {
      const my = y + 0.85 + mi * 0.85;
      slide.addText(m.k, { x: x + 0.2, y: my, w: cardW - 0.4, h: 0.25, fontSize: 9, color: '64748B', bold: true });
      slide.addText(m.v, { x: x + 0.2, y: my + 0.25, w: cardW - 0.4, h: 0.4, fontSize: 18, bold: true, color: c.ACCENT });
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
    slide.addText(String(m.value || ''), { x: x + 0.15, y: y + 0.5, w: cardW - 0.3, h: 1.0, fontSize: 36, bold: true, color: c.ACCENT, valign: 'middle' });
    if (m.trend) slide.addText(m.trend, { x: x + 0.15, y: y + 1.55, w: cardW - 0.3, h: 0.35, fontSize: 11, color: '10B981', bold: true });
    if (m.source_name) slide.addText(`📍 ${m.source_name}`, { x: x + 0.15, y: y + 1.7, w: cardW - 0.3, h: 0.25, fontSize: 8, color: c.GRAY_MED, italic: true });
  });
}

function renderQuote(slide, s, c) {
  const txt = s.quote_text || s.title || '';
  // Comillas decorativas grandes
  slide.addText('"', { x: 0.5, y: 1.8, w: 1.5, h: 1.2, fontSize: 80, bold: true, color: c.ACCENT, valign: 'top' });
  slide.addText(txt, { x: 1.8, y: 2.4, w: 10.8, h: 2.6, fontSize: 28, bold: true, color: c.NAV, italic: true, valign: 'middle' });
  if (s.quote_author) {
    slide.addShape('rect', { x: 1.8, y: 5.2, w: 2, h: 0.04, fill: { color: c.ACCENT } });
    slide.addText('— ' + s.quote_author, { x: 1.8, y: 5.4, w: 10.8, h: 0.4, fontSize: 14, color: c.GRAY_MED, italic: true });
  }
  // Stats decorativas si las hay
  if ((s.stats || []).length) renderMetricsDashboard(slide, { ...s, metric_cards: s.stats.slice(0, 3) }, c);
}

function renderClosing(slide, s, p, c) {
  slide.background = { color: c.NAV };
  slide.addText(c.BRAND, { x: 0.5, y: 0.5, w: 12.3, h: 0.4, color: c.GOLD, fontSize: 13, bold: true, charSpacing: 4 });
  // Quote central
  const q = s.quote_text || s.title || 'Gracias';
  slide.addText('"' + q + '"', { x: 1, y: 2.0, w: 11.3, h: 1.8, fontSize: 32, bold: true, color: c.WHITE, italic: true, align: 'center', valign: 'middle' });
  if (s.quote_author) {
    slide.addText('— ' + s.quote_author, { x: 1, y: 4.0, w: 11.3, h: 0.5, fontSize: 14, color: 'CBD5E1', align: 'center', italic: true });
  }
  // 3 stats finales
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
  let y = 2.0;
  if ((s.bullets || []).length) {
    const txt = s.bullets.map(b => ({ text: b, options: { bullet: { code: '25CF' }, fontSize: 16, color: c.NAV, breakLine: true, paraSpaceAfter: 8 } }));
    slide.addText(txt, { x: 0.6, y, w: 12.2, h: 4.5 });
  }
  if ((s.stats || []).length) {
    renderMetricsDashboard(slide, { ...s, metric_cards: s.stats }, c);
  }
}

// ─── LAYOUTS PEDAGÓGICOS (Borja Ramírez / metacognición) ───
function renderLearningObjectives(slide, s, c) {
  // 4 cards navy con número gold grande + título + body
  const items = (s.learning_objectives || []).slice(0, 4);
  if (!items.length) return;
  const baseY = s.block_label ? 2.05 : 1.85;
  const cardW = (12.4 / 4) - 0.15;
  const cardH = 2.6;
  items.forEach((o, i) => {
    const x = 0.4 + i * (cardW + 0.15);
    slide.addShape('roundRect', { x, y: baseY, w: cardW, h: cardH, fill: { color: '16263F' }, line: { color: c.GOLD, width: 0.75 }, rectRadius: 0.1 });
    slide.addText(String(o.number || (i+1).toString().padStart(2, '0')), { x: x + 0.2, y: baseY + 0.2, w: cardW - 0.4, h: 0.6, fontSize: 26, bold: true, color: c.GOLD });
    slide.addText(String(o.title || ''), { x: x + 0.2, y: baseY + 0.95, w: cardW - 0.4, h: 0.5, fontSize: 14, bold: true, color: c.WHITE });
    slide.addText(String(o.body || ''), { x: x + 0.2, y: baseY + 1.45, w: cardW - 0.4, h: 1.05, fontSize: 11, color: 'CBD5E1', valign: 'top' });
  });
  // Goldbox al final si hay
  if (s.goldbox_runs || s.footer_rule) {
    const y = baseY + cardH + 0.3;
    slide.addShape('roundRect', { x: 0.4, y, w: 12.5, h: 0.85, rectRadius: 0.08, fill: { color: '1C2A40' }, line: { color: c.GOLD, width: 1 } });
    const runs = s.goldbox_runs || [{ text: 'Regla: ', bold: true }, { text: s.footer_rule }];
    slide.addText(runs.map(r => ({ text: r.text, options: { bold: !!r.bold, color: r.bold ? c.GOLD : 'EAFFF3', fontSize: 13 } })), { x: 0.7, y: y + 0.1, w: 12.0, h: 0.65, valign: 'middle' });
  }
}

function renderReflectionRecap(slide, s, c) {
  // 3 cards "Aprendiste a..." con check verde
  const items = (s.reflection_items || []).slice(0, 3);
  if (!items.length) return renderDefault(slide, s, c);
  const baseY = s.block_label ? 2.5 : 2.3;
  const cardW = (12.4 / 3) - 0.15;
  const cardH = 2.2;
  items.forEach((it, i) => {
    const x = 0.4 + i * (cardW + 0.15);
    const accent = i === items.length - 1 ? '10B981' : c.ACCENT;
    slide.addShape('roundRect', { x, y: baseY, w: cardW, h: cardH, fill: { color: c.WHITE }, line: { color: 'CBD5E1' }, rectRadius: 0.1 });
    slide.addShape('rect', { x, y: baseY, w: cardW, h: 0.08, fill: { color: accent } });
    // Check verde grande
    slide.addShape('ellipse', { x: x + 0.25, y: baseY + 0.25, w: 0.55, h: 0.55, fill: { color: '10B981' }, line: { color: '10B981' } });
    slide.addText('✓', { x: x + 0.25, y: baseY + 0.25, w: 0.55, h: 0.55, fontSize: 22, bold: true, color: c.WHITE, align: 'center', valign: 'middle' });
    slide.addText(String(it.title || 'Aprendiste a'), { x: x + 1.0, y: baseY + 0.3, w: cardW - 1.2, h: 0.4, fontSize: 13, bold: true, color: c.GOLD, charSpacing: 2 });
    slide.addText(String(it.body || ''), { x: x + 0.25, y: baseY + 0.95, w: cardW - 0.45, h: cardH - 1.1, fontSize: 14, color: c.NAV, valign: 'top', bold: true });
  });
}

function renderTransferActivity(slide, s, c) {
  // 2 cards (reto + entregable) + highlight verde al pie
  const ta = s.transfer_activity || {};
  const baseY = s.block_label ? 2.0 : 1.85;
  const cardW = 5.95, cardH = 2.6;
  // RETO
  slide.addShape('roundRect', { x: 0.4, y: baseY, w: cardW, h: cardH, fill: { color: c.GRAY_LIGHT }, line: { color: 'CBD5E1' }, rectRadius: 0.1 });
  slide.addShape('rect', { x: 0.4, y: baseY, w: cardW, h: 0.07, fill: { color: c.ACCENT } });
  slide.addText('EL RETO', { x: 0.6, y: baseY + 0.2, w: cardW - 0.4, h: 0.3, fontSize: 11, bold: true, color: c.ACCENT, charSpacing: 3 });
  slide.addText(String(ta.challenge || ''), { x: 0.6, y: baseY + 0.55, w: cardW - 0.4, h: cardH - 0.7, fontSize: 14, color: c.NAV, valign: 'top' });
  // ENTREGABLE
  slide.addShape('roundRect', { x: 6.95, y: baseY, w: cardW, h: cardH, fill: { color: c.GRAY_LIGHT }, line: { color: 'CBD5E1' }, rectRadius: 0.1 });
  slide.addShape('rect', { x: 6.95, y: baseY, w: cardW, h: 0.07, fill: { color: '10B981' } });
  slide.addText('ENTREGABLE', { x: 7.15, y: baseY + 0.2, w: cardW - 0.4, h: 0.3, fontSize: 11, bold: true, color: '047857', charSpacing: 3 });
  if (ta.deliverable) slide.addText(String(ta.deliverable), { x: 7.15, y: baseY + 0.55, w: cardW - 0.4, h: 0.5, fontSize: 13, bold: true, color: c.NAV });
  const items = (ta.deliverable_items || []).map(t => ({ text: t, options: { bullet: { code: '25CF' }, fontSize: 12, color: c.NAV, breakLine: true, paraSpaceAfter: 6 } }));
  slide.addText(items, { x: 7.25, y: baseY + 1.1, w: cardW - 0.5, h: cardH - 1.2 });
  // HIGHLIGHT verde abajo
  if (ta.rule) {
    const y = baseY + cardH + 0.25;
    slide.addShape('roundRect', { x: 0.4, y, w: 12.5, h: 0.95, rectRadius: 0.08, fill: { color: '143726' }, line: { color: '10B981', width: 1 } });
    slide.addShape('rect', { x: 0.4, y, w: 0.08, h: 0.95, fill: { color: '10B981' } });
    slide.addText(String(ta.rule), { x: 0.7, y: y + 0.12, w: 12.2, h: 0.75, fontSize: 13, color: 'EAFFF3', valign: 'middle' });
  }
}

function renderGoldbox(slide, s, c) {
  // Caja navy con borde dorado + texto rich (runs alternando bold/regular)
  const baseY = s.block_label ? 2.0 : 1.85;
  const boxH = 1.4;
  slide.addShape('roundRect', { x: 0.4, y: baseY, w: 12.5, h: boxH, rectRadius: 0.1, fill: { color: '1C2A40' }, line: { color: c.GOLD, width: 1.5 } });
  const runs = (s.goldbox_runs || (s.bullets || []).map(b => ({ text: b }))).map(r => ({
    text: r.text, options: { bold: !!r.bold, color: r.bold ? c.GOLD : 'EAFFF3', fontSize: 18 }
  }));
  slide.addText(runs, { x: 0.7, y: baseY + 0.15, w: 12.0, h: boxH - 0.3, valign: 'middle' });
  // Si hay bullets adicionales debajo
  if ((s.bullets || []).length && !s.goldbox_runs) return;
  if ((s.bullets || []).length) {
    const items = s.bullets.map(b => ({ text: b, options: { bullet: { code: '25CF' }, fontSize: 14, color: c.NAV, breakLine: true, paraSpaceAfter: 8, indent: 14 } }));
    slide.addText(items, { x: 0.6, y: baseY + boxH + 0.3, w: 12.2, h: 7 - baseY - boxH - 0.5 });
  }
}

function renderHighlight(slide, s, c) {
  // Caja navy oscura con borde verde + texto destacado grande
  const baseY = s.block_label ? 2.05 : 1.85;
  const text = s.highlight_text || s.title || '';
  const runs = s.highlight_runs || [{ text }];
  slide.addShape('roundRect', { x: 0.4, y: baseY, w: 12.5, h: 1.5, rectRadius: 0.1, fill: { color: '143726' }, line: { color: '10B981', width: 1.25 } });
  slide.addShape('rect', { x: 0.4, y: baseY, w: 0.1, h: 1.5, fill: { color: '10B981' } });
  const rich = runs.map(r => ({ text: r.text, options: { bold: !!r.bold, color: r.bold ? c.GOLD : 'EAFFF3', fontSize: 17 } }));
  slide.addText(rich, { x: 0.75, y: baseY + 0.15, w: 12.0, h: 1.2, valign: 'middle', lineSpacingMultiple: 1.15 });
  // Cards "Antes de X" abajo
  const cards = s.cards || [];
  if (cards.length) {
    const yc = baseY + 1.75;
    const cardW = (12.4 / cards.length) - 0.15;
    cards.slice(0, 4).forEach((card, i) => {
      const x = 0.4 + i * (cardW + 0.15);
      slide.addShape('roundRect', { x, y: yc, w: cardW, h: 2.5, fill: { color: c.WHITE }, line: { color: 'CBD5E1' }, rectRadius: 0.1 });
      slide.addShape('rect', { x, y: yc, w: cardW, h: 0.06, fill: { color: c.GOLD } });
      slide.addText(String(card.title || ''), { x: x + 0.15, y: yc + 0.2, w: cardW - 0.3, h: 0.4, fontSize: 13, bold: true, color: c.NAV });
      const itemsR = (card.items || []).map(t => ({ text: t, options: { fontSize: 12, color: c.NAV, breakLine: true, paraSpaceAfter: 6 } }));
      slide.addText(itemsR, { x: x + 0.15, y: yc + 0.65, w: cardW - 0.3, h: 1.75 });
    });
  }
}

// ─── LAYOUTS PREMIUM VISUALES ───
function renderHeroImage(slide, s, c) {
  // Full-bleed hero image + título overlay grande (magazine cover style)
  const url = s.image_url || eduUnsplashUrl(eduSlideToImageQuery(s));
  if (url) {
    try {
      slide.addImage({ path: url, x: 0, y: 0, w: 13.333, h: 7.5, sizing: { type: 'cover', w: 13.333, h: 7.5 } });
      slide.addShape('rect', { x: 0, y: 4.5, w: 13.333, h: 3.0, fill: { color: '0F172A', transparency: 25 }, line: { type: 'none' } });
      slide.addShape('rect', { x: 0, y: 5.5, w: 13.333, h: 2.0, fill: { color: '0F172A', transparency: 10 }, line: { type: 'none' } });
    } catch(e) {}
  } else {
    // Sin imagen → fondo gradient simulado con shapes (navy + accent)
    slide.addShape('rect', { x: 0, y: 0, w: 13.333, h: 7.5, fill: { color: c.NAV }, line: { type: 'none' } });
    slide.addShape('rect', { x: 0, y: 4.0, w: 13.333, h: 3.5, fill: { color: c.NAV_LIGHT, transparency: 20 }, line: { type: 'none' } });
    slide.addShape('rect', { x: 0, y: 0, w: 0.15, h: 7.5, fill: { color: c.GOLD }, line: { color: c.GOLD } });
  }

  // Block label arriba a la izquierda
  if (s.block_label) {
    slide.addShape('roundRect', { x: 0.5, y: 0.6, w: 3.5, h: 0.5, rectRadius: 0.05, fill: { color: c.GOLD }, line: { color: c.GOLD } });
    slide.addText(String(s.block_label).toUpperCase(), { x: 0.5, y: 0.6, w: 3.5, h: 0.5, fontSize: 12, bold: true, color: c.NAV, align: 'center', valign: 'middle', charSpacing: 2 });
  }
  // Título abajo grande sobre el gradient
  slide.addText(s.title || '', { x: 0.6, y: 5.0, w: 12.2, h: 1.4, fontSize: 44, bold: true, color: c.WHITE, valign: 'bottom' });
  if (s.subtitle) {
    slide.addShape('rect', { x: 0.6, y: 6.5, w: 1.5, h: 0.05, fill: { color: c.GOLD }, line: { color: c.GOLD } });
    slide.addText(s.subtitle, { x: 0.6, y: 6.6, w: 12.2, h: 0.6, fontSize: 16, color: 'E2E8F0', italic: true });
  }
}

function renderSplitImage(slide, s, c) {
  // 50/50: imagen izquierda + contenido derecha
  const url = s.image_url || eduUnsplashUrl(eduSlideToImageQuery(s));
  if (url) {
    try {
      slide.addImage({ path: url, x: 0, y: 0.55, w: 6.5, h: 6.55, sizing: { type: 'cover', w: 6.5, h: 6.55 } });
    } catch(e) {
      slide.addShape('rect', { x: 0, y: 0.55, w: 6.5, h: 6.55, fill: { color: c.NAV }, line: { type: 'none' } });
    }
  } else {
    // Sin imagen → panel decorativo izquierdo
    slide.addShape('rect', { x: 0, y: 0.55, w: 6.5, h: 6.55, fill: { color: c.NAV }, line: { type: 'none' } });
    slide.addShape('rect', { x: 0.4, y: 1.2, w: 5.7, h: 0.08, fill: { color: c.GOLD }, line: { color: c.GOLD } });
    if (s.image_query) {
      slide.addText('🎨', { x: 0, y: 3, w: 6.5, h: 1.5, fontSize: 60, color: c.GOLD, align: 'center' });
    }
    slide.addText((s.block_label || s.title || '').toUpperCase(), { x: 0.4, y: 1.5, w: 5.7, h: 0.4, fontSize: 12, bold: true, color: c.GOLD, charSpacing: 3 });
  }
  // Banda dorada vertical entre imagen y texto
  slide.addShape('rect', { x: 6.5, y: 0.55, w: 0.08, h: 6.55, fill: { color: c.GOLD }, line: { color: c.GOLD } });

  // Contenido derecha
  const xT = 6.95, wT = 12.5 - xT;
  if (s.block_label) {
    slide.addText(String(s.block_label).toUpperCase(), { x: xT, y: 0.85, w: wT, h: 0.3, fontSize: 11, bold: true, color: c.GOLD, charSpacing: 3 });
  }
  slide.addText(s.title || '', { x: xT, y: s.block_label ? 1.25 : 1.0, w: wT, h: 1.0, fontSize: 28, bold: true, color: c.NAV });
  if (s.subtitle) {
    slide.addText(s.subtitle, { x: xT, y: s.block_label ? 2.3 : 2.05, w: wT, h: 0.5, fontSize: 14, color: c.GRAY_MED, italic: true });
  }
  const yC = s.block_label ? 2.95 : 2.7;
  // Bullets como cards mini
  const items = s.bullets || [];
  items.slice(0, 5).forEach((b, i) => {
    const y = yC + i * 0.75;
    slide.addShape('ellipse', { x: xT, y: y + 0.1, w: 0.4, h: 0.4, fill: { color: c.ACCENT }, line: { color: c.ACCENT } });
    slide.addText(String(i+1), { x: xT, y: y + 0.1, w: 0.4, h: 0.4, fontSize: 14, bold: true, color: c.WHITE, align: 'center', valign: 'middle' });
    slide.addText(b, { x: xT + 0.55, y, w: wT - 0.55, h: 0.6, fontSize: 13, color: c.NAV, valign: 'middle' });
  });
}

function renderChartSpotlight(slide, s, c) {
  // Chart grande 65% del slide + 3 insights laterales
  const chartUrl = s.chart_url || eduStatsToChartUrl(s.stats || s.metric_cards || [], c.ACCENT);
  if (chartUrl) {
    try {
      slide.addImage({ path: chartUrl, x: 0.4, y: 1.4, w: 8.2, h: 5.3 });
    } catch(e) {}
  } else {
    // Fallback: stats como bigcards visuales (sin necesidad de chart externo)
    slide.addShape('roundRect', { x: 0.4, y: 1.4, w: 8.2, h: 5.3, fill: { color: c.GRAY_LIGHT }, line: { color: 'CBD5E1' }, rectRadius: 0.1 });
    const stats = s.stats || s.metric_cards || [];
    if (stats.length) {
      const cols = Math.min(stats.length, 3);
      const cardW = (8.0 - 0.4 * (cols - 1)) / cols;
      stats.slice(0, 3).forEach((st, i) => {
        const x = 0.5 + i * (cardW + 0.4);
        slide.addShape('roundRect', { x, y: 1.7, w: cardW, h: 4.7, fill: { color: c.WHITE }, line: { color: c.ACCENT, width: 2 }, rectRadius: 0.08 });
        slide.addText(String(st.value || st.trend || ''), { x: x + 0.2, y: 2.2, w: cardW - 0.4, h: 1.5, fontSize: 36, bold: true, color: c.ACCENT, align: 'center', valign: 'middle' });
        slide.addText(String(st.label || ''), { x: x + 0.2, y: 4.0, w: cardW - 0.4, h: 1.0, fontSize: 14, color: c.NAV, align: 'center', valign: 'top' });
        if (st.source_name) slide.addText('📍 ' + st.source_name, { x: x + 0.2, y: 5.5, w: cardW - 0.4, h: 0.5, fontSize: 9, italic: true, color: c.GRAY_MED, align: 'center' });
      });
    } else {
      slide.addText('Datos clave', { x: 0.6, y: 3.8, w: 7.8, h: 0.6, fontSize: 18, bold: true, color: c.GRAY_MED, italic: true, align: 'center' });
    }
  }

  // Panel derecho con 3 insights
  const insights = s.insights || (s.bullets || []).slice(0, 3).map(b => ({ title: '💡', body: b }));
  const xI = 8.85, wI = 4.05;
  insights.slice(0, 3).forEach((ins, i) => {
    const y = 1.4 + i * 1.8;
    slide.addShape('roundRect', { x: xI, y, w: wI, h: 1.6, fill: { color: c.WHITE }, line: { color: c.ACCENT, width: 1.5 }, rectRadius: 0.1 });
    slide.addShape('rect', { x: xI, y, w: 0.1, h: 1.6, fill: { color: c.GOLD }, line: { color: c.GOLD } });
    slide.addText(String(ins.title || '💡'), { x: xI + 0.2, y: y + 0.15, w: wI - 0.4, h: 0.4, fontSize: 16, bold: true, color: c.ACCENT });
    slide.addText(String(ins.body || ''), { x: xI + 0.2, y: y + 0.55, w: wI - 0.4, h: 1.0, fontSize: 11, color: c.NAV, valign: 'top' });
  });
}

function renderImageGrid(slide, s, c) {
  // Grid de 2x2 o 1x3 con imágenes + captions
  const items = s.image_grid || (s.bullets || []).slice(0, 4).map(b => ({ caption: b, image_query: b }));
  const n = Math.min(items.length, 4);
  if (!n) return renderDefault(slide, s, c);
  const cols = n <= 2 ? n : 2;
  const rows = Math.ceil(n / cols);
  const baseY = s.block_label ? 1.9 : 1.7;
  const totalH = 5.0;
  const cardW = (12.5 / cols) - 0.15;
  const cardH = (totalH / rows) - 0.15;
  items.slice(0, n).forEach((item, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = 0.4 + col * (cardW + 0.15);
    const y = baseY + row * (cardH + 0.15);
    const url = item.image_url || eduUnsplashUrl(item.image_query || item.caption || 'business');
    if (url) {
      try {
        slide.addImage({ path: url, x, y, w: cardW, h: cardH * 0.72, sizing: { type: 'cover', w: cardW, h: cardH * 0.72 } });
      } catch(e) {
        slide.addShape('rect', { x, y, w: cardW, h: cardH * 0.72, fill: { color: c.NAV_LIGHT }, line: { type: 'none' } });
      }
    } else {
      // Placeholder visual sin imagen
      slide.addShape('rect', { x, y, w: cardW, h: cardH * 0.72, fill: { color: c.NAV_LIGHT }, line: { type: 'none' } });
      slide.addShape('rect', { x: x + cardW/2 - 0.05, y: y + cardH * 0.32, w: 0.1, h: 0.1, fill: { color: c.GOLD }, line: { color: c.GOLD } });
    }
    // Caption card abajo
    slide.addShape('rect', { x, y: y + cardH * 0.72, w: cardW, h: cardH * 0.28, fill: { color: c.NAV }, line: { color: c.NAV } });
    slide.addShape('rect', { x, y: y + cardH * 0.72, w: 0.06, h: cardH * 0.28, fill: { color: c.GOLD }, line: { color: c.GOLD } });
    slide.addText(item.caption || '', { x: x + 0.15, y: y + cardH * 0.72, w: cardW - 0.25, h: cardH * 0.28, fontSize: 11, bold: true, color: c.WHITE, valign: 'middle' });
  });
}

function eduDownloadSpeakerNotes() {
  const aiKey = `edu-pres-${eduState.mentorshipId}`;
  const p = (window.aiState[aiKey] || {}).presentation;
  if (!p) return;
  const text = `${p.title}\n${'='.repeat(p.title.length)}\n\n${(p.slides||[]).map(s => `--- Slide ${s.number}: ${s.title} ---\n${s.subtitle ? s.subtitle + '\n' : ''}${(s.bullets||[]).map(b => '• ' + b).join('\n')}\n\n🎙 NOTAS:\n${s.speaker_notes || '(sin notas)'}\n`).join('\n')}`;
  const blob = new Blob([text], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${p.title.replace(/[^a-z0-9]/gi,'_')}_speaker_notes.txt`;
  a.click();
}

function eduLoadPresentation(id) {
  const p = (eduState.presentations || []).find(x => x.id === id);
  if (!p) return alert('Presentación no encontrada');
  const aiKey = `edu-pres-${eduState.mentorshipId}`;
  window.aiState = window.aiState || {};
  window.aiState[aiKey] = { presentation: { title: p.title, outline: p.outline, slides: p.slides, all_sources: p.sources } };
  eduRender();
}

async function eduDeletePresentation(id) {
  if (!confirm('¿Eliminar esta presentación del historial?')) return;
  await sb.from('edu_presentations').delete().eq('id', id);
  await eduLoadAll(); eduRender();
}

// ============================================================
// TAB: INFORMES IA (stub)
// ============================================================
function eduRenderReports() {
  const reports = (eduState.reports || []).filter(r => r.mentorship_id === eduState.mentorshipId);
  return `
    <div class="space-y-3">
      <div class="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-900">
        💡 <strong>Informes IA</strong> — generá reportes semanales/quincenales/mensuales con análisis de cartera, progreso de estudiantes y notas de clases.
      </div>
      <div class="text-center py-8 text-slate-500">
        <div class="text-3xl mb-2">📈</div>
        <div class="text-sm font-bold">Sección en construcción</div>
        <div class="text-xs mt-1">La generación de informes con IA se conecta en el siguiente turno.</div>
      </div>
      ${reports.length ? `
        <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div class="bg-slate-100 px-3 py-2 text-xs font-bold uppercase">Informes guardados (${reports.length})</div>
          <div class="divide-y divide-slate-100 max-h-72 overflow-y-auto">
            ${reports.map(r => `<div class="p-2 text-xs"><strong>${r.title || r.period_type}</strong> · ${r.period_start} → ${r.period_end}</div>`).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

// ============================================================
// SISTEMA INDEPENDIENTE: GENERADOR DE PRESENTACIONES
// Reusa eduState + eduRenderPresentations pero abre su propio modal
// con selector de mentoría arriba.
// ============================================================
async function openEduPresentationsSystem(sys) {
  eduState.sys = sys;
  // Por default arranca con la primera mentoría activa
  openModal(`🎬 ${sys.name}`, '<div id="edu-root">Cargando...</div>');
  document.querySelector('#modal > div').classList.remove('max-w-3xl');
  document.querySelector('#modal > div').classList.add('max-w-7xl');
  await eduLoadAll();
  if (!eduState.mentorshipId && eduState.mentorships.length) {
    const firstActive = eduState.mentorships.find(m => m.active);
    if (firstActive) eduState.mentorshipId = firstActive.id;
  }
  eduState.tab = '__presentations_only__';  // marker para el render custom
  eduRenderPresentationsStandalone();
}

function eduRenderPresentationsStandalone() {
  const root = document.getElementById('edu-root');
  if (!root) return;
  const cur = eduCurrentMentorship();
  root.innerHTML = `
    <div class="flex flex-col h-full max-h-[84vh]">
      <!-- Selector mentoría -->
      <div class="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200 flex-wrap">
        <span class="text-[10px] font-bold uppercase text-slate-500 mr-1">Mentoría:</span>
        ${eduState.mentorships.filter(m => m.active).map(m => `
          <button onclick="eduState.mentorshipId='${m.id}'; eduRenderPresentationsStandalone()"
            class="px-3 py-1.5 rounded-lg text-xs font-bold ${eduState.mentorshipId===m.id?'bg-slate-900 text-white shadow':'bg-slate-100 hover:bg-slate-200'}">
            ${m.icon} ${m.name}
          </button>
        `).join('')}
        <div class="ml-auto text-[10px] text-slate-500">${cur ? cur.name : 'Sin mentoría seleccionada'}</div>
      </div>
      <!-- Reusa el render existente -->
      <div class="flex-1 overflow-y-auto">
        ${eduRenderPresentations()}
      </div>
    </div>
  `;
}

// Sobreescribir eduRender para volver acá cuando estamos en standalone
const _eduRenderOrig = eduRender;
window.eduRender = function() {
  if (eduState.tab === '__presentations_only__') return eduRenderPresentationsStandalone();
  if (eduState.tab === '__reports_only__') return eduRenderReportsStandalone();
  return _eduRenderOrig();
};
