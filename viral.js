/* Viral Studio — generador de contenido viral para marca personal (BR/negocios)
   Paso 1: Generador de Reels con API de Claude en vivo. */

// ---------- Estado / config ----------
const LS = {
  get key()   { return localStorage.getItem('viral_api_key') || ''; },
  set key(v)  { localStorage.setItem('viral_api_key', v); },
  get model() { return localStorage.getItem('viral_model') || 'claude-sonnet-4-5'; },
  set model(v){ localStorage.setItem('viral_model', v); },
};

function refreshKeyStatus() {
  const el = document.getElementById('key-status');
  if (LS.key) { el.textContent = '● API conectada'; el.className = 'text-[11px] px-2 py-1 rounded-full bg-emerald-900/40 text-emerald-400'; }
  else { el.textContent = 'Sin API key'; el.className = 'text-[11px] px-2 py-1 rounded-full bg-zinc-800 text-zinc-400'; }
}

// ---------- Estrategia embebida (system prompt) ----------
const ESTRATEGIA = `Eres un guionista experto en contenido viral de formato corto (Reels/TikTok/Shorts) para una MARCA PERSONAL en el nicho de BIENES RAÍCES, INVERSIÓN y NEGOCIOS. Dominas la metodología de Julio Iero y la capa de conversión de "Sell Your Knowledge".

PRINCIPIO RECTOR: La marca NUNCA es el tema aparente del video. Al terminar, el espectador debe pensar que viste "el chisme" (Messi, una camioneta, una pelea de pareja, Steve Jobs), no que le vendiste bienes raíces. Regalá en público, vendé en privado.

ESTRUCTURA OBLIGATORIA DE CADA REEL:
1. HOOK (3-9s): rompe la inercia del scroll. Debe ser polarizante (amor/odio), contraintuitivo o polémico, nivel de consciencia BAJO (lo entiende un niño de 5 años). NO uses "¿quieres más X?". Usa afirmaciones tajantes y específicas.
2. CHISME / PUENTE: el gancho mainstream que "tapa" el valor + una pregunta o giro que polariza, genera controversia o duele.
3. VALOR OCULTO: la verdad reveladora del nicho (no el consejo obvio). Es el educativo disfrazado de entretenimiento.
4. CTA: dirige a seguir + palabra clave para comentar. Fórmula: resultado soñado + menor tiempo + menor esfuerzo. Incluye el cierre que fuerza el follow: "si no me sigues, no te llega".

FORMATOS (elige el que mejor sirva al tema):
- Manita: señalar con la mano objetos/precios, "¿cuánto cuesta esto?", cara + objeto.
- Doble: clon de la misma persona comparando (útil/inútil, pobre/rico, vulgar/elegante).
- Ranking: ordenar elementos de peor a mejor en pantalla.
- Sketch: mini actuación con 2 personajes y conflicto/drama.
- Mano arriba: afirmación/encuesta con imagen-gancho absurda para frenar el scroll.
- Entrevista en calle: abordar a alguien, dinero/lujo visible (camioneta, reloj).

REGLAS DE EJECUCIÓN Y EDICIÓN:
- Cambiar de toma cada 1-2 segundos (una idea = una toma).
- Quitar todos los silencios. Subtítulos palabra por palabra (karaoke), centrados.
- Lenguaje simple, frases cortas, hablado como a un amigo.
- Pantalla verde con fondos dopaminérgicos cuando aplique.
- Cargar el hook con varios clips rápidos + sound design.
- Técnicas visuales que funcionan (usa la que mejor sirva en 'edicion'): time-lapse (procesos como remodelaciones antes→después), b-roll + texto grande encima, pantalla doble (comparación/reacción), colores estridentes (amarillo/colores fuertes para frenar el scroll).
- Para el HOOK puedes usar una imagen absurda/inesperada como scroll-stopper (estilo objeto fuera de contexto).

Responde SIEMPRE en español neutro de LATAM. Sé concreto y grabable, nada genérico.`;

// ---------- Esquemas de salida por tipo de contenido ----------
const REEL_SCHEMA = `DEVUELVE ESTRICTAMENTE UN JSON VÁLIDO (sin texto antes ni después, sin backticks) con esta forma:
{
  "reels": [
    {
      "titulo": "nombre corto del reel",
      "formato": "uno de los formatos",
      "chisme": "el gancho mainstream usado para tapar el valor",
      "idea_viral_referencia": "qué formato/tendencia viral existente imita",
      "hook": "la línea exacta de apertura, lista para decir",
      "puente": "la frase/pregunta que conecta el chisme con el valor y polariza",
      "guion": [
        { "linea": "texto exacto que dice/aparece (1 beat = 1 toma)", "toma": "descripción visual de la toma/encuadre", "pantalla": "texto en pantalla (subtítulo o label), opcional" }
      ],
      "valor_oculto": "la verdad reveladora del nicho que enseñaste sin que se note",
      "cta": "el llamado a la acción final con palabra clave",
      "edicion": "indicaciones concretas de edición para este reel",
      "por_que_funciona": "1-2 frases: la psicología por la que se viraliza"
    }
  ]
}
El guion debe tener entre 6 y 14 beats.`;

const CARRUSEL_SCHEMA = `DEVUELVE ESTRICTAMENTE UN JSON VÁLIDO (sin texto antes ni después, sin backticks) con esta forma:
{
  "carruseles": [
    {
      "titulo": "nombre corto",
      "plantilla": "Referente famoso | Antes y después | Educativo",
      "gancho": "texto de la portada (slide 1), corto y muy potente",
      "slides": [
        { "n": 1, "tipo": "hook|problema|solucion|prueba|cta", "texto": "texto grande del slide (1-2 frases máx)", "visual": "qué foto/imagen va de fondo" }
      ],
      "caption": "el copy/descripción del post con CTA y palabra clave para comentar",
      "por_que_funciona": "1-2 frases"
    }
  ]
}
Cada carrusel tiene entre 6 y 10 slides. Slide 1 frena el scroll; el último es CTA.
Respeta la PLANTILLA elegida:
- "Referente famoso": slide1 = foto del experto antes + creencia del avatar; slides medios = historia de un referente famoso de la industria que la rompe; final = giro que cambia la creencia + CTA.
- "Antes y después": contrasta "la vida que te tocó" (antes) vs "la que construyes" (después) + frase que cambia la creencia + CTA.
- "Educativo": slide1 hook; 2-3 problema; 4-7 solución; 8-9 prueba social; 10 CTA.`;

const YT_SCHEMA = `=== MODO YOUTUBE LARGO (metodología Richard / One of 10) ===
El 90% del éxito de un video = IDEA + TÍTULO + MINIATURA (psicología humana, no el algoritmo).
- IDEA = REMIX: toma un FORMATO/outlier que YA funcionó + el TEMA de bienes raíces/negocios + un VECTOR VIRAL (algo que le importa a todo humano: dinero, lujo, Lamborghini, primera clase, "transparente/invisible", supervivencia, estatus).
- TÍTULO: solo hay 3 palancas → MIEDO, CURIOSIDAD, DESEO. Genera varias variantes y maximiza la intensidad. Cada palabra cuenta (ej. "señales SUTILES que la mayoría NO conoce").
- MINIATURA en 3 capas: formato (ej. pantalla dividida), composición (close-up, posición de la persona/objeto), elementos (qué se ve). Inspírate en formatos de OTROS nichos para destacar.
- Considera quitar tu cara si buscas alcance frío.
- Estructura de retención: hook potente en los primeros 30s, mantener tensión sin matar el deseo, payoff de valor, CTA.
- Marca los momentos que se pueden cortar a REELS verticales.

DEVUELVE ESTRICTAMENTE UN JSON VÁLIDO (sin texto antes ni después, sin backticks) con esta forma:
{
  "videos": [
    {
      "titulo_principal": "el mejor título",
      "idea": "el remix explicado: formato + tema + vector viral",
      "vector_viral": "el elemento universal que usa",
      "outlier_referencia": "qué formato/outlier imita y de qué nicho viene",
      "titulos": [ { "texto": "variante de título", "palanca": "miedo|curiosidad|deseo" } ],
      "miniatura": { "formato": "", "composicion": "", "elementos": "", "texto_en_miniatura": "máx 3-4 palabras" },
      "guion": [ { "seccion": "hook|contexto|retencion|payoff|cta", "tiempo": "0:00-0:30", "contenido": "qué se dice/muestra" } ],
      "cortes_reels": [ "momento del video que se puede cortar a un reel vertical" ],
      "por_que_funciona": "1-2 frases"
    }
  ]
}
Genera 4-6 variantes de título (cubriendo las 3 palancas) y un guion de 5-8 secciones.`;

const CAL_SCHEMA = `=== MODO CALENDARIO DE CONTENIDO ===
Plan semanal, 2-3 posts/día, todos los días. Mezcla: VIRAL (alcance) + AUTORIDAD (b-roll escrito, carruseles) + HAND-RAISERS (recursos gratis) + VENTA (solo en cosecha, sobre todo por historias).
Ritmo mensual: días 1-20 SIEMBRA (valor, hand-raisers, sin vender de frente); días 21-27 COSECHA (urgencia/escasez, venta por historias, Why Now real); día 28 vuelve a siembra.
Reglas: ~1 reel viral/día + 1 pieza de autoridad; repost reciclado opcional (humor en la mañana / motivacional en la noche). Historias: 1 secuencia/día (hook 14h, secuencia 16h). En cosecha: máx 4-5 historias de venta en toda la semana. YouTube: 1-2/semana.
Distribuye dolores/pilares del avatar variados a lo largo de la semana, sin repetir el mismo gancho.

DEVUELVE ESTRICTAMENTE UN JSON VÁLIDO (sin texto antes ni después, sin backticks) con esta forma:
{
  "resumen": "1-2 frases de la estrategia de la semana",
  "dias": [
    {
      "dia": "Lunes",
      "fase": "siembra|cosecha",
      "posts": [
        { "hora": "9:00", "canal": "Reel|Carrusel|Historia|Repost|YouTube", "tipo": "viral|autoridad|venta|hand-raiser|repost", "idea": "hook o título concreto, listo para usar", "formato": "manita/sketch/b-roll escrito/etc", "cta": "", "dolor": "pilar o dolor que toca" }
      ]
    }
  ]
}`;

// ---------- Banco de conocimiento (base_conocimiento.json) ----------
let KB = null;
async function loadKB() {
  try {
    const res = await fetch('base_conocimiento.json');
    KB = await res.json();
    setupKBPicker('r');
    setupKBPicker('c');
    setupKBPicker('y');
  } catch (e) { console.warn('No se pudo cargar el banco de conocimiento', e); }
}
function setupKBPicker(p) {
  if (!KB) return;
  const catSel = document.getElementById(p + '-categoria');
  if (!catSel) return;
  KB.categorias.forEach(c => {
    const o = document.createElement('option'); o.value = c.id; o.textContent = c.nombre; catSel.appendChild(o);
  });
  fillDolores(p, '');
  catSel.addEventListener('change', () => fillDolores(p, catSel.value));
  document.getElementById(p + '-dolor').addEventListener('change', () => showDolorHint(p));
}
function fillDolores(p, catId) {
  const sel = document.getElementById(p + '-dolor');
  sel.innerHTML = '<option value="">— Elige un dolor específico (opcional) —</option>';
  KB.preguntas.filter(q => !catId || q.categoria === catId).forEach(q => {
    const o = document.createElement('option'); o.value = q.id; o.textContent = q.pregunta; sel.appendChild(o);
  });
  showDolorHint(p);
}
function findPregunta(id) { return KB && KB.preguntas.find(q => q.id === id); }
function showDolorHint(p) {
  const q = findPregunta(document.getElementById(p + '-dolor').value);
  const hint = document.getElementById(p + '-dolor-hint');
  if (!hint) return;
  if (q) { hint.textContent = '✓ Reframe: ' + q.respuesta_corta.slice(0, 120) + '…'; hint.classList.remove('hidden'); }
  else hint.classList.add('hidden');
}
function dolorPromptBlock(dolor) {
  if (!dolor) return '';
  return `DOLOR REAL DEL AVATAR a atacar (del banco de conocimiento):
- Pregunta/creencia: "${dolor.pregunta}"
- Reframe correcto (úsalo como idea central, no lo cites textual): ${dolor.respuesta_corta}
- Detalle de apoyo: ${(dolor.respuesta_detallada || '').slice(0, 600)}
Parte de esa creencia equivocada y gírala con el reframe correcto.\n`;
}
function brandFacts() {
  if (!KB) return '';
  return `\n\n=== CONOCIMIENTO DE MARCA (usar como verdad factual, NO inventar datos) ===
Marca: ${KB.meta.marca}. Tono: ${KB.meta.tono}
Principio central: ${KB.meta.principio_central}
Hechos clave que debes respetar:
- Harmony Lender = préstamo de inversión basado en la PROPIEDAD/negocio, no en la persona; la LLC puede tener días.
- Existen préstamos ITIN (sin SSN) y DSCR (según flujo de renta, no W-2).
- Los 4 números: MAO (precio máximo de compra), costo de remodelación, ARV (valor después de reparar), margen.
- Metodología 5 E: Evaluación → Estructura → Ejecución → Salida → Escalabilidad.
- Modelos: Fix & Flip, Fix & Hold, BRRRR, Rental Arbitrage.
- Buy Box = criterios de búsqueda (tipo, zona, precio, condición, margen).
- El cuello de botella real es ENCONTRAR el deal (criterio), no el capital.
Nunca prometas riqueza fácil. Enfoca siempre criterio sobre capital.`;
}

// ---------- Llamada a la API ----------
async function callClaude(userPrompt, maxTokens = 4000, schema = '') {
  if (!LS.key) throw new Error('NO_KEY');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': LS.key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: LS.model,
      max_tokens: maxTokens,
      system: ESTRATEGIA + (schema ? '\n\n' + schema : '') + brandFacts(),
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`API ${res.status}: ${t.slice(0, 300)}`);
  }
  const data = await res.json();
  return data.content.map(b => b.text || '').join('');
}

function parseJSON(text) {
  // tolera backticks o texto envolvente
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) t = fence[1].trim();
  const start = t.indexOf('{'); const end = t.lastIndexOf('}');
  if (start !== -1 && end !== -1) t = t.slice(start, end + 1);
  return JSON.parse(t);
}

// ---------- Generar reels ----------
async function generarReels() {
  const tema = document.getElementById('r-tema').value.trim();
  const dolor = findPregunta(document.getElementById('r-dolor').value);
  if (!tema && !dolor) { document.getElementById('r-tema').focus(); return; }
  if (!LS.key) { openSettings(); return; }

  const formato = document.getElementById('r-formato').value;
  const variantes = document.getElementById('r-variantes').value;
  const cta = document.getElementById('r-cta').value.trim();

  const out = document.getElementById('r-output');
  out.innerHTML = loadingHTML(variantes);
  const genBtn = document.getElementById('r-generate');
  genBtn.disabled = true; genBtn.classList.add('opacity-50', 'pointer-events-none');

  const prompt = `Genera ${variantes} reel(es) virales distintos.
${dolorPromptBlock(dolor)}${tema ? 'Tema/ángulo libre adicional: ' + tema : ''}
Formato deseado: ${formato === 'auto' ? 'elige tú el mejor para cada uno (pueden variar)' : formato}
${cta ? 'CTA / palabra clave a usar: ' + cta : 'Inventa una palabra clave de comentario relevante.'}
Cada reel debe usar un CHISME diferente para no repetir el gancho.`;

  try {
    const text = await callClaude(prompt, 1200 + Number(variantes) * 1500, REEL_SCHEMA);
    const data = parseJSON(text);
    renderReels(data.reels || []);
  } catch (e) {
    out.innerHTML = errorHTML(e.message);
  } finally {
    genBtn.disabled = false; genBtn.classList.remove('opacity-50', 'pointer-events-none');
  }
}

// ---------- Render ----------
function esc(s) { return (s == null ? '' : String(s)).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }

function reelCard(r, i) {
  const guion = Array.isArray(r.guion) ? r.guion : [];
  const beats = guion.map((b, j) => `
    <tr class="border-t border-zinc-800 align-top">
      <td class="py-2 pr-2 text-zinc-600 text-xs">${j + 1}</td>
      <td class="py-2 pr-3 text-sm">${esc(b.linea)}</td>
      <td class="py-2 pr-3 text-xs text-zinc-400">${esc(b.toma)}</td>
      <td class="py-2 text-xs text-fuchsia-300">${esc(b.pantalla || '')}</td>
    </tr>`).join('');
  return `
  <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-5">
    <div class="flex items-start justify-between gap-3 mb-3">
      <div>
        <div class="text-[11px] uppercase tracking-wide text-fuchsia-400 font-semibold">${esc(r.formato)}</div>
        <h3 class="text-lg font-bold">${esc(r.titulo)}</h3>
      </div>
      <button onclick="copyReel(${i}, this)" class="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 shrink-0">📋 Copiar</button>
    </div>
    <div class="grid sm:grid-cols-2 gap-3 mb-4 text-sm">
      <div class="bg-zinc-950 rounded-lg p-3"><div class="text-[11px] text-zinc-500 font-semibold mb-0.5">🎣 HOOK</div>${esc(r.hook)}</div>
      <div class="bg-zinc-950 rounded-lg p-3"><div class="text-[11px] text-zinc-500 font-semibold mb-0.5">🗣️ CHISME</div>${esc(r.chisme)}</div>
      <div class="bg-zinc-950 rounded-lg p-3"><div class="text-[11px] text-zinc-500 font-semibold mb-0.5">🌉 PUENTE</div>${esc(r.puente)}</div>
      <div class="bg-zinc-950 rounded-lg p-3"><div class="text-[11px] text-zinc-500 font-semibold mb-0.5">💎 VALOR OCULTO</div>${esc(r.valor_oculto)}</div>
    </div>
    <details open class="mb-3">
      <summary class="cursor-pointer text-xs font-semibold text-zinc-400 mb-2">📝 Guion (${guion.length} tomas)</summary>
      <table class="w-full mt-2"><thead><tr class="text-[10px] uppercase text-zinc-600 text-left"><th></th><th>Dice</th><th>Toma</th><th>En pantalla</th></tr></thead><tbody>${beats}</tbody></table>
    </details>
    <div class="grid sm:grid-cols-2 gap-3 text-sm">
      <div class="bg-purple-950/30 border border-purple-900/40 rounded-lg p-3"><div class="text-[11px] text-purple-400 font-semibold mb-0.5">📣 CTA</div>${esc(r.cta)}</div>
      <div class="bg-zinc-950 rounded-lg p-3"><div class="text-[11px] text-zinc-500 font-semibold mb-0.5">✂️ EDICIÓN</div>${esc(r.edicion)}</div>
    </div>
    <div class="mt-3 text-xs text-zinc-500"><b class="text-zinc-400">Por qué funciona:</b> ${esc(r.por_que_funciona)}</div>
  </div>`;
}

let LAST_REELS = [];
function renderReels(reels) {
  LAST_REELS = reels;
  const out = document.getElementById('r-output');
  if (!reels.length) { out.innerHTML = errorHTML('La IA no devolvió reels. Intenta de nuevo.'); return; }
  out.innerHTML = reels.map((r, i) => reelCard(r, i)).join('');
}
function copyReel(i, btn) {
  const r = LAST_REELS[i]; if (!r) return;
  const guion = Array.isArray(r.guion) ? r.guion : [];
  const txt = `${r.titulo} [${r.formato}]
HOOK: ${r.hook}
CHISME: ${r.chisme}
PUENTE: ${r.puente}
GUION:
${guion.map((b, j) => `${j + 1}. ${b.linea}  (toma: ${b.toma}${b.pantalla ? ' | pantalla: ' + b.pantalla : ''})`).join('\n')}
VALOR OCULTO: ${r.valor_oculto}
CTA: ${r.cta}
EDICIÓN: ${r.edicion}`;
  navigator.clipboard.writeText(txt);
  if (btn) { btn.textContent = '✓ Copiado'; setTimeout(() => { btn.textContent = '📋 Copiar'; }, 1500); }
}

function loadingHTML(n) {
  return `<div class="border border-zinc-800 rounded-xl py-16 flex flex-col items-center text-zinc-500">
    <div class="typing text-3xl mb-3"><span>●</span><span>●</span><span>●</span></div>
    <p class="text-sm">Generando ${n} reel(es) con la fórmula viral…</p>
  </div>`;
}
function errorHTML(msg) {
  const friendly = msg === 'NO_KEY' ? 'Falta tu API key. Ábrela en Ajustes.' : msg;
  return `<div class="border border-red-900/50 bg-red-950/20 rounded-xl p-5 text-sm text-red-300">
    <b>Error:</b> ${esc(friendly)}
    <div class="text-xs text-red-400/70 mt-2">Si es error 404 de modelo, cambia el modelo en ⚙ Ajustes.</div>
  </div>`;
}

// ---------- Generar carruseles ----------
async function generarCarruseles() {
  const tema = document.getElementById('c-tema').value.trim();
  const dolor = findPregunta(document.getElementById('c-dolor').value);
  if (!tema && !dolor) { document.getElementById('c-tema').focus(); return; }
  if (!LS.key) { openSettings(); return; }

  const plantilla = document.getElementById('c-plantilla').value;
  const variantes = document.getElementById('c-variantes').value;
  const cta = document.getElementById('c-cta').value.trim();

  const out = document.getElementById('c-output');
  out.innerHTML = loadingHTML(variantes).replace('reel(es)', 'carrusel(es)');
  const genBtn = document.getElementById('c-generate');
  genBtn.disabled = true; genBtn.classList.add('opacity-50', 'pointer-events-none');

  const prompt = `Genera ${variantes} carrusel(es) para Instagram distintos.
${dolorPromptBlock(dolor)}${tema ? 'Tema/ángulo libre adicional: ' + tema : ''}
Plantilla a usar: ${plantilla === 'auto' ? 'elige la mejor para cada uno' : plantilla}
${cta ? 'CTA / palabra clave a usar: ' + cta : 'Inventa una palabra clave de comentario relevante.'}`;

  try {
    const text = await callClaude(prompt, 1200 + Number(variantes) * 1800, CARRUSEL_SCHEMA);
    const data = parseJSON(text);
    renderCarruseles(data.carruseles || []);
  } catch (e) {
    out.innerHTML = errorHTML(e.message);
  } finally {
    genBtn.disabled = false; genBtn.classList.remove('opacity-50', 'pointer-events-none');
  }
}

let LAST_CARR = [];
function renderCarruseles(carr) {
  LAST_CARR = carr;
  const out = document.getElementById('c-output');
  if (!carr.length) { out.innerHTML = errorHTML('La IA no devolvió carruseles. Intenta de nuevo.'); return; }
  out.innerHTML = carr.map((c, i) => carruselCard(c, i)).join('');
}
function carruselCard(c, i) {
  const slides = Array.isArray(c.slides) ? c.slides : [];
  const slideEls = slides.map((s) => `
    <div class="shrink-0 w-44 bg-zinc-950 border border-zinc-800 rounded-lg p-3 flex flex-col">
      <div class="flex items-center justify-between mb-1">
        <span class="text-[10px] font-bold text-fuchsia-400">SLIDE ${esc(String(s.n ?? ''))}</span>
        <span class="text-[9px] uppercase text-zinc-600">${esc(s.tipo || '')}</span>
      </div>
      <div class="text-sm font-medium leading-snug flex-1">${esc(s.texto)}</div>
      <div class="text-[10px] text-zinc-500 mt-2 border-t border-zinc-800 pt-1">📷 ${esc(s.visual || '')}</div>
    </div>`).join('');
  return `
  <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-5">
    <div class="flex items-start justify-between gap-3 mb-3">
      <div>
        <div class="text-[11px] uppercase tracking-wide text-fuchsia-400 font-semibold">${esc(c.plantilla)}</div>
        <h3 class="text-lg font-bold">${esc(c.titulo)}</h3>
      </div>
      <button onclick="copyCarrusel(${i}, this)" class="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 shrink-0">📋 Copiar</button>
    </div>
    <div class="flex gap-3 overflow-x-auto scrollbar-thin pb-2 mb-3">${slideEls}</div>
    <div class="bg-purple-950/30 border border-purple-900/40 rounded-lg p-3 text-sm mb-2"><div class="text-[11px] text-purple-400 font-semibold mb-0.5">📝 CAPTION</div>${esc(c.caption)}</div>
    <div class="text-xs text-zinc-500"><b class="text-zinc-400">Por qué funciona:</b> ${esc(c.por_que_funciona)}</div>
  </div>`;
}
function copyCarrusel(i, btn) {
  const c = LAST_CARR[i]; if (!c) return;
  const slides = Array.isArray(c.slides) ? c.slides : [];
  const txt = `${c.titulo} [${c.plantilla}]
${slides.map(s => `SLIDE ${s.n ?? ''} (${s.tipo || ''}): ${s.texto}  | imagen: ${s.visual || ''}`).join('\n')}
CAPTION: ${c.caption}`;
  navigator.clipboard.writeText(txt);
  if (btn) { btn.textContent = '✓ Copiado'; setTimeout(() => { btn.textContent = '📋 Copiar'; }, 1500); }
}

// ---------- Generar YouTube ----------
async function generarYoutube() {
  const tema = document.getElementById('y-tema').value.trim();
  const dolor = findPregunta(document.getElementById('y-dolor').value);
  if (!tema && !dolor) { document.getElementById('y-tema').focus(); return; }
  if (!LS.key) { openSettings(); return; }

  const variantes = document.getElementById('y-variantes').value;
  const cta = document.getElementById('y-cta').value.trim();

  const out = document.getElementById('y-output');
  out.innerHTML = loadingHTML(variantes).replace('reel(es)', 'video(s) de YouTube');
  const genBtn = document.getElementById('y-generate');
  genBtn.disabled = true; genBtn.classList.add('opacity-50', 'pointer-events-none');

  const prompt = `Genera ${variantes} concepto(s) de video de YouTube largo distintos.
${dolorPromptBlock(dolor)}${tema ? 'Tema/ángulo libre adicional: ' + tema : ''}
${cta ? 'CTA a usar: ' + cta : ''}
Cada video debe usar un VECTOR VIRAL distinto.`;

  try {
    const text = await callClaude(prompt, 1500 + Number(variantes) * 2200, YT_SCHEMA);
    const data = parseJSON(text);
    renderYoutube(data.videos || []);
  } catch (e) {
    out.innerHTML = errorHTML(e.message);
  } finally {
    genBtn.disabled = false; genBtn.classList.remove('opacity-50', 'pointer-events-none');
  }
}

let LAST_YT = [];
function renderYoutube(videos) {
  LAST_YT = videos;
  const out = document.getElementById('y-output');
  if (!videos.length) { out.innerHTML = errorHTML('La IA no devolvió videos. Intenta de nuevo.'); return; }
  out.innerHTML = videos.map((v, i) => youtubeCard(v, i)).join('');
}
function palancaColor(p) {
  return { miedo: 'text-red-400', curiosidad: 'text-amber-400', deseo: 'text-emerald-400' }[p] || 'text-zinc-400';
}
function youtubeCard(v, i) {
  const titulos = Array.isArray(v.titulos) ? v.titulos : [];
  const guion = Array.isArray(v.guion) ? v.guion : [];
  const cortes = Array.isArray(v.cortes_reels) ? v.cortes_reels : [];
  const m = v.miniatura || {};
  const titulosEl = titulos.map(t => `
    <li class="flex items-start gap-2 text-sm py-1">
      <span class="text-[10px] uppercase font-bold ${palancaColor(t.palanca)} shrink-0 w-16">${esc(t.palanca || '')}</span>
      <span>${esc(t.texto)}</span>
    </li>`).join('');
  const guionEl = guion.map(g => `
    <tr class="border-t border-zinc-800 align-top">
      <td class="py-2 pr-2 text-[10px] uppercase text-fuchsia-400 whitespace-nowrap">${esc(g.seccion || '')}</td>
      <td class="py-2 pr-3 text-xs text-zinc-500 whitespace-nowrap">${esc(g.tiempo || '')}</td>
      <td class="py-2 text-sm">${esc(g.contenido)}</td>
    </tr>`).join('');
  const cortesEl = cortes.map(c => `<li class="text-sm text-zinc-300">• ${esc(c)}</li>`).join('');
  return `
  <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-5">
    <div class="flex items-start justify-between gap-3 mb-3">
      <div>
        <div class="text-[11px] uppercase tracking-wide text-fuchsia-400 font-semibold">▶️ YouTube · vector: ${esc(v.vector_viral)}</div>
        <h3 class="text-lg font-bold">${esc(v.titulo_principal)}</h3>
      </div>
      <button onclick="copyYoutube(${i}, this)" class="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 shrink-0">📋 Copiar</button>
    </div>
    <div class="bg-zinc-950 rounded-lg p-3 text-sm mb-3"><div class="text-[11px] text-zinc-500 font-semibold mb-0.5">💡 IDEA (remix)</div>${esc(v.idea)}<div class="text-xs text-zinc-500 mt-1">Outlier ref: ${esc(v.outlier_referencia)}</div></div>
    <div class="mb-3">
      <div class="text-[11px] text-zinc-500 font-semibold mb-1">🏷️ TÍTULOS (por palanca)</div>
      <ul>${titulosEl}</ul>
    </div>
    <div class="bg-zinc-950 rounded-lg p-3 text-sm mb-3">
      <div class="text-[11px] text-zinc-500 font-semibold mb-1">🖼️ MINIATURA</div>
      <div class="text-xs"><b class="text-zinc-400">Texto:</b> ${esc(m.texto_en_miniatura)} · <b class="text-zinc-400">Formato:</b> ${esc(m.formato)} · <b class="text-zinc-400">Composición:</b> ${esc(m.composicion)} · <b class="text-zinc-400">Elementos:</b> ${esc(m.elementos)}</div>
    </div>
    <details class="mb-3">
      <summary class="cursor-pointer text-xs font-semibold text-zinc-400 mb-2">🎬 Guion / retención (${guion.length})</summary>
      <table class="w-full mt-2"><tbody>${guionEl}</tbody></table>
    </details>
    ${cortes.length ? `<div class="bg-purple-950/30 border border-purple-900/40 rounded-lg p-3 mb-2"><div class="text-[11px] text-purple-400 font-semibold mb-1">✂️ CORTES A REELS</div><ul>${cortesEl}</ul></div>` : ''}
    <div class="text-xs text-zinc-500"><b class="text-zinc-400">Por qué funciona:</b> ${esc(v.por_que_funciona)}</div>
  </div>`;
}
function copyYoutube(i, btn) {
  const v = LAST_YT[i]; if (!v) return;
  const titulos = Array.isArray(v.titulos) ? v.titulos : [];
  const guion = Array.isArray(v.guion) ? v.guion : [];
  const m = v.miniatura || {};
  const txt = `${v.titulo_principal}
IDEA: ${v.idea} (outlier: ${v.outlier_referencia} | vector: ${v.vector_viral})
TÍTULOS:
${titulos.map(t => `- [${t.palanca}] ${t.texto}`).join('\n')}
MINIATURA: ${m.texto_en_miniatura} | formato: ${m.formato} | composición: ${m.composicion} | elementos: ${m.elementos}
GUION:
${guion.map(g => `${g.seccion} (${g.tiempo}): ${g.contenido}`).join('\n')}
CORTES A REELS: ${(v.cortes_reels || []).join(' / ')}`;
  navigator.clipboard.writeText(txt);
  if (btn) { btn.textContent = '✓ Copiado'; setTimeout(() => { btn.textContent = '📋 Copiar'; }, 1500); }
}

// ---------- Generar calendario ----------
async function generarCalendario() {
  if (!LS.key) { openSettings(); return; }
  const dias = document.getElementById('cal-dias').value;
  const posts = document.getElementById('cal-posts').value;
  const fase = document.getElementById('cal-fase').value;
  const foco = document.getElementById('cal-foco').value.trim();

  const out = document.getElementById('cal-output');
  out.innerHTML = loadingHTML('').replace('Generando  reel(es) con la fórmula viral…', 'Armando tu plan de contenido…');
  const genBtn = document.getElementById('cal-generate');
  genBtn.disabled = true; genBtn.classList.add('opacity-50', 'pointer-events-none');

  const prompt = `Crea un plan de contenido para ${dias} días, ${posts} posts por día.
Fase del mes: ${fase === 'auto' ? 'decide tú según la semana (siembra por defecto)' : fase}.
${foco ? 'Foco/tema de la semana: ' + foco : 'Distribuye los pilares de contenido del nicho (números, búsqueda/criterio, financiamiento, mentalidad, el juego, sistema, modelos) a lo largo de la semana.'}
Cada idea debe ser concreta y lista para usar, no genérica.`;

  try {
    const text = await callClaude(prompt, 6000, CAL_SCHEMA);
    const data = parseJSON(text);
    renderCalendario(data);
  } catch (e) {
    out.innerHTML = errorHTML(e.message);
  } finally {
    genBtn.disabled = false; genBtn.classList.remove('opacity-50', 'pointer-events-none');
  }
}

let LAST_CAL = null;
const TIPO_COLOR = { viral: 'bg-fuchsia-900/40 text-fuchsia-300', autoridad: 'bg-sky-900/40 text-sky-300', venta: 'bg-emerald-900/40 text-emerald-300', 'hand-raiser': 'bg-amber-900/40 text-amber-300', repost: 'bg-zinc-800 text-zinc-300' };
function renderCalendario(cal) {
  LAST_CAL = cal;
  const out = document.getElementById('cal-output');
  const dias = (cal && Array.isArray(cal.dias)) ? cal.dias : [];
  if (!dias.length) { out.innerHTML = errorHTML('La IA no devolvió calendario. Intenta de nuevo.'); return; }
  const head = `
    <div class="flex items-start justify-between gap-3 mb-3">
      <div class="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-sm flex-1"><b class="text-zinc-400">Estrategia:</b> ${esc(cal.resumen)}</div>
      <button onclick="copyCalendario(this)" class="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 shrink-0">📋 Copiar todo</button>
    </div>`;
  const grid = dias.map(d => calDayCard(d)).join('');
  out.innerHTML = head + `<div class="grid sm:grid-cols-2 gap-3">${grid}</div>`;
}
function calDayCard(d) {
  const posts = Array.isArray(d.posts) ? d.posts : [];
  const faseBadge = d.fase === 'cosecha' ? 'bg-emerald-900/40 text-emerald-300' : 'bg-sky-900/40 text-sky-300';
  const postsEl = posts.map(p => `
    <div class="border-t border-zinc-800 pt-2 mt-2">
      <div class="flex items-center gap-2 mb-1 flex-wrap">
        <span class="text-[10px] text-zinc-500">${esc(p.hora || '')}</span>
        <span class="text-[10px] px-1.5 py-0.5 rounded ${TIPO_COLOR[p.tipo] || 'bg-zinc-800 text-zinc-300'}">${esc(p.tipo || '')}</span>
        <span class="text-[10px] text-zinc-400">${esc(p.canal || '')}${p.formato ? ' · ' + esc(p.formato) : ''}</span>
      </div>
      <div class="text-sm">${esc(p.idea)}</div>
      ${p.cta ? `<div class="text-[11px] text-purple-300 mt-0.5">📣 ${esc(p.cta)}</div>` : ''}
      ${p.dolor ? `<div class="text-[10px] text-zinc-600 mt-0.5">${esc(p.dolor)}</div>` : ''}
    </div>`).join('');
  return `
  <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
    <div class="flex items-center justify-between">
      <h3 class="font-bold">${esc(d.dia)}</h3>
      <span class="text-[10px] px-2 py-0.5 rounded-full ${faseBadge}">${esc(d.fase || '')}</span>
    </div>
    ${postsEl}
  </div>`;
}
function copyCalendario(btn) {
  if (!LAST_CAL) return;
  const dias = Array.isArray(LAST_CAL.dias) ? LAST_CAL.dias : [];
  const txt = `PLAN DE CONTENIDO\n${LAST_CAL.resumen || ''}\n\n` + dias.map(d =>
    `${d.dia} [${d.fase || ''}]\n` + (Array.isArray(d.posts) ? d.posts : []).map(p =>
      `  ${p.hora || ''} · ${p.canal || ''} · ${p.tipo || ''} (${p.formato || ''}): ${p.idea}${p.cta ? ' | CTA: ' + p.cta : ''}`).join('\n')
  ).join('\n\n');
  navigator.clipboard.writeText(txt);
  if (btn) { btn.textContent = '✓ Copiado'; setTimeout(() => { btn.textContent = '📋 Copiar todo'; }, 1500); }
}

// ---------- Settings ----------
function openSettings() {
  document.getElementById('s-key').value = LS.key;
  document.getElementById('s-model').value = ['claude-sonnet-4-5','claude-sonnet-4-6','claude-opus-4-1','claude-opus-4-8','claude-3-5-haiku-latest'].includes(LS.model) ? LS.model : 'claude-sonnet-4-5';
  if (!['claude-sonnet-4-5','claude-sonnet-4-6','claude-opus-4-1','claude-opus-4-8','claude-3-5-haiku-latest'].includes(LS.model)) document.getElementById('s-model-custom').value = LS.model;
  document.getElementById('settings-modal').classList.remove('hidden');
}

// ---------- Tabs ----------
function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => {
        const on = b.dataset.tab === tab;
        b.className = 'tab-btn px-4 py-2 border-b-2 ' + (on ? 'border-fuchsia-500 text-white font-medium' : 'border-transparent text-zinc-500 hover:text-zinc-300');
      });
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
      document.getElementById('tab-' + tab).classList.remove('hidden');
    });
  });
}

// ---------- Init ----------
document.addEventListener('DOMContentLoaded', () => {
  refreshKeyStatus();
  setupTabs();
  loadKB();
  document.getElementById('settings-btn').addEventListener('click', openSettings);
  document.getElementById('r-generate').addEventListener('click', generarReels);
  document.getElementById('c-generate').addEventListener('click', generarCarruseles);
  document.getElementById('y-generate').addEventListener('click', generarYoutube);
  document.getElementById('cal-generate').addEventListener('click', generarCalendario);
  document.getElementById('s-save').addEventListener('click', () => {
    LS.key = document.getElementById('s-key').value.trim();
    const custom = document.getElementById('s-model-custom').value.trim();
    LS.model = custom || document.getElementById('s-model').value;
    refreshKeyStatus();
    document.getElementById('settings-modal').classList.add('hidden');
  });
});
