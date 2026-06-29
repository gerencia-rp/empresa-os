/* Viral Studio — generador de contenido viral para marca personal (BR/negocios)
   Paso 1: Generador de Reels con API de Claude en vivo. */

// ---------- Estado / config ----------
const LS = {
  get key()   { return localStorage.getItem('viral_api_key') || ''; },
  set key(v)  { localStorage.setItem('viral_api_key', v); },
  get model() { return localStorage.getItem('viral_model') || 'claude-sonnet-4-5'; },
  set model(v){ localStorage.setItem('viral_model', v); },
  get pass()  { return localStorage.getItem('viral_pass') || ''; },
  set pass(v) { localStorage.setItem('viral_pass', v); },
};

function refreshKeyStatus() {
  const el = document.getElementById('key-status');
  if (LS.key) { el.textContent = '● API (tu key)'; el.className = 'text-[11px] px-2 py-1 rounded-full bg-emerald-900/40 text-emerald-400'; }
  else { el.textContent = '● Modo servidor'; el.className = 'text-[11px] px-2 py-1 rounded-full bg-sky-900/40 text-sky-300'; }
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
PLAYBOOK VISUAL VIRALIDAD (técnicas transversales, usa la que mejor sirva):
- 4 técnicas que funcionan: TIME-LAPSE (procesos como remodelaciones antes→después) · B-ROLL + TEXTO grande encima (estilo educativo disfrazado) · PANTALLA DOBLE (comparación/reacción) · COLORES ESTRIDENTES (amarillo/colores fuertes para frenar el scroll).
- HOOK con imagen absurda/inesperada como scroll-stopper (objeto fuera de contexto).
- B-ROLL ESCRITO: texto corto y potente sobre b-roll de lifestyle (caminando, café, obra), da autoridad sin vender.
- REPOST/RECICLADO: se pueden reciclar clips virales (+5M) o de películas poniéndoles tu @ y tu caption (saveclip → CapCut con tu @ → copiar el copy original); publicar y ocultar del perfil para subir alcance.
- FEED LIMPIO: carruseles de autoridad + flatlays para limpiar el perfil y subir el nivel de marca.

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

const HISTORIA_SCHEMA = `=== SISTEMA STORY-SELLING · MÉTODO H.I.L.O.™ ===
Generas SECUENCIAS de Instagram Stories listas para grabar. El usuario aporta el CONTENIDO; tú aportas la ESTRUCTURA. Nunca al revés.

MÉTODO H.I.L.O. (toda secuencia sigue estas 4 fases, una secuencia tiene de 3 a 10 frames):
- H (Hook): frena el scroll en los primeros 2s. Pregunta / escasez / VS / contraste / curiosidad.
- I (Identificación): espejo del problema/deseo ("esto te pasa", "esto aburre vs esto conecta").
- L (Lleva, recorrido A→B): entrega el valor (paso a paso, comparación, demostración). DEBE incluir ≥1 frame de interacción (encuesta/pregunta/quiz).
- O (Oferta + CTA de respuesta): promesa (Resultado+Tiempo+Alivio) + palabra clave para DM.

8 PRINCIPIOS (respétalos siempre):
1. Estático aburre, dinámico conecta (datos sueltos → contexto + beneficio + escenario sensorial).
2. Hook en los primeros 2s.
3. CTA de respuesta (palabra clave a DM) > CTA directo (link).
4. La interacción es contenido (encuestas/quiz/preguntas suben alcance y declaran intención).
5. Promesa = Resultado + Tiempo + Alivio, y se siente POSIBLE, no mágica.
6. Recorrido A→B (mueve de estado actual a deseado; los pasos intermedios son el valor).
7. Validar antes de producir (si el objetivo es vender, sugiere un paso de validación).
8. El lanzamiento vive en historias.

BIBLIOTECA DE HOOKS (elige/combina):
- HOOK_PREGUNTA: "¿Cómo {resultado} sin {dolor}?"
- HOOK_ESCASEZ: "La ÚNICA {activo} disponible en {contexto}"
- HOOK_VS: "{A} VS {B} · ¿cuál {criterio}?"
- HOOK_CONTRASTE: "Esto {aburre} VS esto {conecta}"
- HOOK_CURIOSIDAD: "Cómo {logré resultado} en {tiempo} (y {prueba})"
- HOOK_ERROR: "Si {haces X}, estás perdiendo {recurso}. Hacé esto:"
- HOOK_PROMESA: "{Resultado} + en {Tiempo} + sin {Fricción}"

BIBLIOTECA DE CTAs: CTA_RESPUESTA ("Comenta '{PALABRA}' y te mando {recurso}", PREFERIDO) · CTA_ENCUESTA · CTA_PREGUNTA · CTA_QUIZ · CTA_LINK (último recurso).

REGLA ABURRE→CONECTA (reescribe el tema plano): lista de specs → info dinámica (beneficio+escenario+sensorial) · "vendo/disponible/escríbeme" → escasez + CTA de respuesta · solo foto → foto + hook pregunta · lista de opciones → lista + encuesta/quiz · "cómpralo/link" → venta comparativa.

3 CRITERIOS de toda historia que vende (etiqueta en cada frame cuáles cumple): 1) ENLAZA CON TU PRODUCTO/OFERTA · 2) INVOLUCRA AL CLIENTE · 3) CUENTA ALGO MÁS QUE EL MOMENTO (contextualiza + activa deseo, no solo "lo que hiciste").
MOTOR DE TRANSFORMACIÓN (de momento crudo a historia que vende): momento real → puente al dolor/deseo del avatar → enlaza con tu oferta → activa deseo → sticker específico → objetivo. Para CADA frame da TAMBIÉN su versión DÉBIL (lo genérico que pondría la mayoría, sobre ti) para visualizar el contraste débil vs estratégico (= aburre vs conecta).
PATRONES QUE VENDEN (úsalos cuando encajen): hook de honestidad/vulnerabilidad ("voy a ser muy honesta contigo…") · lista de errores/creencias + sticker de TAP "toca si te sientes identificado" · auto-diagnóstico que SEGMENTA leads ("¿Cómo ves tu situación hoy? [Necesito ayuda / Creo que estoy bien]"; el que pide ayuda es lead caliente). Cada frame persigue 1 objetivo: retención, interacción o venta.

VERTICALES (ajusta vocabulario):
- flipmentoria (educación): A "quiero invertir pero no sé empezar" → B "cierro mi primer flip con sistema". Hooks fuertes: ERROR ("Si calculas el MAO a ojo, pierdes el deal"), CURIOSIDAD. CTA: "comenta FLIP y te mando la calculadora de MAO".
- arbitraje (propiedades): A "propiedad vacía" → B "ocupada y rentando". Convierte specs en info dinámica. Hooks: ESCASEZ, VS ("renta tradicional VS arbitraje: el mismo cuarto, 3x el ingreso"). CTA: "responde CUARTO y te paso disponibilidad".
- marca_personal: A "no sé si esto es real / si yo puedo" → B "confío en Nicolás y quiero su sistema". Hooks: CURIOSIDAD, CONTRASTE ("lo que muestran del real estate VS lo que pasa de verdad"). Tono bilingüe ES/EN, introspectivo.

OBJETIVO: nutrir → H.I.L.O. con CTA_PREGUNTA (sin venta dura). validar → secuencia corta + CTA_ENCUESTA. vender → H.I.L.O. con CTA_RESPUESTA.

REGLAS DURAS (NUNCA romper):
- ≥1 frame de interacción por secuencia.
- CTA por defecto = de respuesta/palabra clave, no link.
- Toda promesa pasa el filtro Resultado+Tiempo+Alivio y se siente posible.
- Texto en pantalla ≤ ~12 palabras por frame (legible en mobile).
- No prometer rendimientos financieros garantizados ni cifras de inversión sin respaldo.

DEVUELVE ESTRICTAMENTE UN JSON VÁLIDO (sin texto antes ni después, sin backticks) con esta forma:
{
  "titulo_secuencia": "string",
  "vertical": "flipmentoria|arbitraje|marca_personal",
  "objetivo": "nutrir|validar|vender",
  "frames": [
    {
      "n": 1,
      "fase": "H|I|L|L-interaccion|O",
      "debil": "versión débil/aburrida del frame (lo genérico, sobre ti) para el contraste",
      "texto_en_pantalla": "≤12 palabras, la versión ESTRATÉGICA que va escrita en el frame",
      "voz_o_caption": "lo que se dice/escribe completo",
      "elemento_visual": "qué grabar/mostrar (aplica técnica visual: time-lapse, b-roll+texto, pantalla doble, colores estridentes)",
      "sticker": "ninguno | encuesta: A / B | pregunta: ¿...? | quiz: ... | auto-diagnóstico: ¿...? [Necesito ayuda / Estoy bien] | tap: toca si te identificas | countdown",
      "criterios": ["enlaza con producto", "involucra al cliente", "cuenta más que el momento"],
      "objetivo_frame": "retención|interacción|venta",
      "nota_grabacion": "indicación práctica para Nicolás"
    }
  ],
  "cta_final": { "tipo": "respuesta|encuesta|pregunta|quiz", "palabra_clave": "string", "recurso": "qué se entrega" },
  "variantes": ["1-2 hooks alternativos para A/B"],
  "checklist_publicacion": ["validar idea antes", "≥1 interacción", "promesa posible no mágica", "CTA de respuesta > link"]
}
La secuencia debe tener exactamente la cantidad de frames pedida y SIEMPRE incluir un frame con fase "L-interaccion".`;

// ---------- Banco de conocimiento (base_conocimiento.json) ----------
let KB = null;
async function loadKB() {
  try {
    const res = await fetch('base_conocimiento.json');
    KB = await res.json();
    setupKBPicker('r');
    setupKBPicker('c');
    setupKBPicker('y');
    setupKBPicker('h');
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
// Por defecto usa el proxy del servidor (/api/claude) con la key guardada como
// variable de entorno en Vercel — no hay que meter nada en el navegador.
// Si el usuario pone su propia key en Ajustes, la usa directamente (override).
async function callClaude(userPrompt, maxTokens = 4000, schema = '') {
  const body = JSON.stringify({
    model: LS.model,
    max_tokens: maxTokens,
    system: ESTRATEGIA + (schema ? '\n\n' + schema : '') + brandFacts(),
    messages: [{ role: 'user', content: userPrompt }],
  });
  let res;
  if (LS.key) {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': LS.key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body,
    });
  } else {
    res = await fetch('/api/claude', {
      method: 'POST',
      headers: Object.assign({ 'content-type': 'application/json' }, LS.pass ? { 'x-viral-pass': LS.pass } : {}),
      body,
    });
  }
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`API ${res.status}: ${t.slice(0, 300)}`);
  }
  const data = await res.json();
  return (data.content || []).map(b => b.text || '').join('');
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
  // sin key local → usa el proxy del servidor (/api/claude)

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
  // sin key local → usa el proxy del servidor (/api/claude)

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
  // sin key local → usa el proxy del servidor (/api/claude)

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
  // sin key local → usa el proxy del servidor (/api/claude)
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

// ---------- Generar historias (Método H.I.L.O.) ----------
const LONGITUD_FRAMES = { corta: 3, media: 5, larga: 8 };
async function generarHistorias() {
  const tema = document.getElementById('h-tema').value.trim();
  const dolor = findPregunta(document.getElementById('h-dolor').value);
  if (!tema && !dolor) { document.getElementById('h-tema').focus(); return; }
  // sin key local → usa el proxy del servidor (/api/claude)

  const vertical = document.getElementById('h-vertical').value;
  const objetivo = document.getElementById('h-objetivo').value;
  const activo = document.getElementById('h-activo').value;
  const longitud = document.getElementById('h-longitud').value;
  const palabra = document.getElementById('h-palabra').value.trim();
  const nFrames = LONGITUD_FRAMES[longitud] || 5;

  const out = document.getElementById('h-output');
  out.innerHTML = loadingHTML('').replace('Generando  reel(es) con la fórmula viral…', 'Armando tu secuencia H.I.L.O.…');
  const genBtn = document.getElementById('h-generate');
  genBtn.disabled = true; genBtn.classList.add('opacity-50', 'pointer-events-none');

  const prompt = `Genera 1 secuencia de Instagram Stories con el método H.I.L.O.
Vertical: ${vertical}
Objetivo: ${objetivo}
Tema (contenido del usuario): ${tema || '(usa el dolor del avatar de abajo)'}
${dolorPromptBlock(dolor)}Activo disponible: ${activo}
Longitud: ${nFrames} frames exactos.
Palabra clave para DM: ${palabra || 'invéntala según el tema (ej. FLIP, CUARTO, HISTORIAS)'}
Aplica la regla aburre→conecta al tema, sigue las 4 fases H.I.L.O., incluye SIEMPRE un frame "L-interaccion" y cierra con CTA de respuesta.`;

  try {
    const text = await callClaude(prompt, 1200 + nFrames * 700, HISTORIA_SCHEMA);
    const data = parseJSON(text);
    renderHistorias(data);
  } catch (e) {
    out.innerHTML = errorHTML(e.message);
  } finally {
    genBtn.disabled = false; genBtn.classList.remove('opacity-50', 'pointer-events-none');
  }
}

let LAST_HIST = null;
const FASE_INFO = {
  'H': { label: 'HOOK', color: 'bg-fuchsia-900/40 text-fuchsia-300' },
  'I': { label: 'IDENTIFICACIÓN', color: 'bg-sky-900/40 text-sky-300' },
  'L': { label: 'LLEVA (A→B)', color: 'bg-amber-900/40 text-amber-300' },
  'L-interaccion': { label: 'INTERACCIÓN', color: 'bg-purple-900/40 text-purple-300' },
  'O': { label: 'OFERTA + CTA', color: 'bg-emerald-900/40 text-emerald-300' },
};
function renderHistorias(s) {
  LAST_HIST = s;
  const out = document.getElementById('h-output');
  const frames = (s && Array.isArray(s.frames)) ? s.frames : [];
  if (!frames.length) { out.innerHTML = errorHTML('La IA no devolvió la secuencia. Intenta de nuevo.'); return; }
  out.innerHTML = historiaCard(s);
}
function frameCard(f) {
  const fi = FASE_INFO[f.fase] || { label: esc(f.fase || ''), color: 'bg-zinc-800 text-zinc-300' };
  const stick = f.sticker && f.sticker !== 'ninguno' ? `<div class="mt-2 text-[11px] bg-purple-950/40 border border-purple-900/40 rounded px-2 py-1 text-purple-200">🎯 ${esc(f.sticker)}</div>` : '';
  const crit = Array.isArray(f.criterios) && f.criterios.length ? `<div class="flex flex-wrap gap-1 mt-2">${f.criterios.map(c => `<span class="text-[9px] px-1.5 py-0.5 rounded bg-emerald-900/40 text-emerald-300">✓ ${esc(c)}</span>`).join('')}</div>` : '';
  return `
  <div class="border-t border-zinc-800 pt-3 mt-3">
    <div class="flex items-center gap-2 mb-1.5">
      <span class="text-zinc-600 text-xs">${esc(String(f.n ?? ''))}</span>
      <span class="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${fi.color}">${fi.label}</span>
      ${f.objetivo_frame ? `<span class="text-[9px] uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">${esc(f.objetivo_frame)}</span>` : ''}
    </div>
    ${f.debil ? `<div class="text-[11px] text-red-400/70 mb-1 line-through decoration-red-700/40">débil: ${esc(f.debil)}</div>` : ''}
    <div class="bg-zinc-950 rounded-lg p-2 text-sm font-semibold mb-1">📱 ${esc(f.texto_en_pantalla)}</div>
    ${f.voz_o_caption ? `<div class="text-sm text-zinc-300">${esc(f.voz_o_caption)}</div>` : ''}
    ${f.elemento_visual ? `<div class="text-[11px] text-zinc-500 mt-1">🎬 ${esc(f.elemento_visual)}</div>` : ''}
    ${stick}
    ${crit}
    ${f.nota_grabacion ? `<div class="text-[10px] text-zinc-600 mt-1">↳ ${esc(f.nota_grabacion)}</div>` : ''}
  </div>`;
}
function historiaCard(s) {
  const frames = Array.isArray(s.frames) ? s.frames : [];
  const cta = s.cta_final || {};
  const vars = Array.isArray(s.variantes) ? s.variantes : [];
  const chk = Array.isArray(s.checklist_publicacion) ? s.checklist_publicacion : [];
  return `
  <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-5">
    <div class="flex items-start justify-between gap-3 mb-1">
      <div>
        <div class="flex items-center gap-2">
          <span class="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">${esc(s.vertical)}</span>
          <span class="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">${esc(s.objetivo)}</span>
          <span class="text-[11px] text-zinc-500">${frames.length} frames</span>
        </div>
        <h3 class="text-lg font-bold mt-1">${esc(s.titulo_secuencia)}</h3>
      </div>
      <button onclick="copyHistoria(this)" class="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 shrink-0">📋 Copiar</button>
    </div>
    ${frames.map(frameCard).join('')}
    <div class="bg-emerald-950/30 border border-emerald-900/40 rounded-lg p-3 text-sm mt-3">
      <div class="text-[11px] text-emerald-400 font-semibold mb-0.5">📣 CTA FINAL (${esc(cta.tipo || '')})</div>
      Comenta <b>${esc(cta.palabra_clave || '')}</b> y te mando ${esc(cta.recurso || '')}
    </div>
    ${vars.length ? `<div class="mt-3"><div class="text-[11px] text-zinc-500 font-semibold mb-1">🔀 Hooks alternativos (A/B)</div>${vars.map(v => `<div class="text-xs text-zinc-400">• ${esc(v)}</div>`).join('')}</div>` : ''}
    ${chk.length ? `<div class="mt-3 flex flex-wrap gap-1">${chk.map(c => `<span class="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">✓ ${esc(c)}</span>`).join('')}</div>` : ''}
  </div>`;
}
function copyHistoria(btn) {
  const s = LAST_HIST; if (!s) return;
  const frames = Array.isArray(s.frames) ? s.frames : [];
  const cta = s.cta_final || {};
  const txt = `${s.titulo_secuencia} [${s.vertical} · ${s.objetivo}]\n\n` +
    frames.map(f => `FRAME ${f.n} (${f.fase})${f.debil ? '\n  DÉBIL: ' + f.debil : ''}\n  PANTALLA: ${f.texto_en_pantalla}\n  VOZ: ${f.voz_o_caption || ''}\n  VISUAL: ${f.elemento_visual || ''}${f.sticker && f.sticker !== 'ninguno' ? '\n  STICKER: ' + f.sticker : ''}${f.nota_grabacion ? '\n  NOTA: ' + f.nota_grabacion : ''}`).join('\n\n') +
    `\n\nCTA FINAL (${cta.tipo || ''}): Comenta ${cta.palabra_clave || ''} y te mando ${cta.recurso || ''}`;
  navigator.clipboard.writeText(txt);
  if (btn) { btn.textContent = '✓ Copiado'; setTimeout(() => { btn.textContent = '📋 Copiar'; }, 1500); }
}

// ---------- Estrategia (guía operativa) ----------
function renderEstrategia() {
  const out = document.getElementById('tab-estrategia');
  if (!out || out.dataset.rendered) return;
  out.dataset.rendered = '1';
  const card = (title, body) => `<div class="bg-zinc-900 border border-zinc-800 rounded-xl p-5"><h3 class="font-bold text-base mb-3">${title}</h3>${body}</div>`;
  const li = (arr) => `<ul class="space-y-1.5 text-sm text-zinc-300">${arr.map(x => `<li class="flex gap-2"><span class="text-fuchsia-400">▸</span><span>${x}</span></li>`).join('')}</ul>`;

  const principios = card('🧭 Principios maestros (las reglas que nunca rompes)', li([
    '<b>La marca NUNCA es el tema aparente.</b> El "chisme" (Messi, una camioneta, un drama) tapa el valor. Regala en público, vende en privado.',
    '<b>Criterio &gt; Capital.</b> Tu avatar cree que el problema es la plata; el real es el criterio para encontrar el deal. Ataca lo que QUIERE (comprar/jubilarse) → hazlo consciente de lo que NECESITA (criterio + sistema + acompañamiento).',
    '<b>Estático aburre, dinámico conecta.</b> Datos sueltos no mueven a nadie; contexto + beneficio + escenario sí.',
    '<b>Promesa = Resultado + Tiempo + Alivio</b>, y que se sienta posible, no mágica.',
    '<b>CTA de respuesta &gt; link.</b> Pide una palabra clave para DM (FLIP, CUARTO, CRITERIO), no "link en bio".',
    '<b>La interacción es contenido.</b> Encuestas, quiz y preguntas suben alcance y declaran intención de compra.',
  ]));

  const rutina = card('☀️ Rutina diaria (mínimo 2-3 publicaciones)', `
    <div class="overflow-x-auto"><table class="w-full text-sm">
      <thead><tr class="text-[10px] uppercase text-zinc-600 text-left"><th class="pb-2 pr-3">Hora</th><th class="pb-2 pr-3">Qué subir</th><th class="pb-2">Para qué</th></tr></thead>
      <tbody class="text-zinc-300">
        ${[['09:00','Reel viral o <b>repost reciclado</b> (humor) — y oculto del perfil','<span class="text-fuchsia-300">Alcance</span>'],
           ['14:00','<b>1ª historia del día</b> con un hook fuerte','<span class="text-sky-300">Enganche</span>'],
           ['16:00','<b>Secuencia de historias H.I.L.O.</b> (3-5 frames)','<span class="text-emerald-300">Conversión</span>'],
           ['18:00','Carrusel de autoridad o reel de valor','<span class="text-sky-300">Autoridad</span>'],
           ['21:00','Reel motivacional o reciclado','<span class="text-fuchsia-300">Alcance</span>']].map(r=>`<tr class="border-t border-zinc-800"><td class="py-2 pr-3 whitespace-nowrap text-zinc-500">${r[0]}</td><td class="py-2 pr-3">${r[1]}</td><td class="py-2">${r[2]}</td></tr>`).join('')}
      </tbody></table></div>
    <div class="mt-3 text-xs text-zinc-500"><b class="text-zinc-400">Siempre:</b> responde TODOS los comentarios y DMs (ahí se vende), y mira TikTok 10 min para tomar formatos virales que ya funcionan.</div>`);

  const mes = card('🌱 Ritmo del mes (siembra → cosecha)', li([
    '<b>Días 1-20 — SIEMBRA:</b> valor + hand-raisers (recursos gratis), conversaciones sin presión. NO vendes de frente.',
    '<b>Días 21-27 — COSECHA:</b> vendes sobre todo por <b>historias</b>, con urgencia/escasez real (Why Now). Máx 4-5 historias de venta en la semana.',
    '<b>Día 28:</b> vuelves a siembra.',
    '<b>YouTube:</b> 1-2 videos largos por semana (se cortan a reels verticales).',
    '<b>Antes de un lanzamiento:</b> valida la idea con una encuesta en historias.',
    'Un lead frío necesita <b>7-14 recursos</b> antes de contratar: ten paciencia con la siembra.',
  ]));

  const queSubir = card('📋 Qué subir (pilares de contenido)', li([
    '<b>Números:</b> los 4 números (MAO · rehab · ARV · margen), por qué el contratista cuesta más.',
    '<b>Criterio / búsqueda ★:</b> el Buy Box en 10 pasos, cómo inspeccionar una casa, dónde comprar por estado. (Es el cuello de botella real → máximo valor.)',
    '<b>Financiamiento:</b> Harmony Lender, ITIN/DSCR, "no necesitas 2 años de empresa", cómo usar tu crédito.',
    '<b>Mentalidad:</b> miedo a la deuda, criterio vs capital, "me jubilé a los 30", no actuar también pierde dinero.',
    '<b>El juego:</b> "La Copa Mundial del Flip" — wholesaler, realtor, GC, arquitecto, prestamista.',
    '<b>Sistema / acompañamiento:</b> mostrar mentores, el ejercicio real de una casa, mapa de ruta 30/60/90 días.',
    '<b>Modelos:</b> Fix&Flip, Fix&Hold, BRRRR, Arbitraje. <b>Legado:</b> patrimonio, herencia, primera generación.',
  ]));

  const comoSubir = card('🎬 Cómo subir (mecánicas y edición)', li([
    '<b>Repost reciclado:</b> copia el link de un reel +5M → <code>saveclip.app/es</code> → descarga → en CapCut pon tu @ encima de la marca de agua → copia el copy tal cual → publica y <b>oculta del perfil</b> (sube alcance sin ensuciar el feed).',
    '<b>4 técnicas visuales:</b> time-lapse (antes→después de remodelación) · b-roll + texto grande · pantalla doble (comparación) · colores estridentes.',
    '<b>B-roll escrito</b> (frase potente sobre lifestyle) y <b>flatlays</b> para limpiar el feed y dar autoridad.',
    '<b>Hook con imagen absurda</b> para frenar el scroll.',
    '<b>Edición:</b> corta cada 1-2s, subtítulos palabra por palabra (karaoke), quita los silencios, fondos dopaminérgicos.',
    '<b>Texto en pantalla ≤ 12 palabras</b> (legible en mobile).',
  ]));

  const formulas = card('🧱 Las fórmulas (lo que genera la app)', `
    <div class="grid sm:grid-cols-2 gap-3 text-sm">
      <div class="bg-zinc-950 rounded-lg p-3"><div class="text-[11px] text-fuchsia-400 font-semibold mb-1">REEL (Julio)</div>Hook → Chisme → Valor oculto → CTA (sígueme + comenta X). "Si no me sigues, no te llega."</div>
      <div class="bg-zinc-950 rounded-lg p-3"><div class="text-[11px] text-sky-400 font-semibold mb-1">REEL que vende (Sell Your Knowledge)</div>Hook → Problema → Solución (nuevo paradigma) → Prueba social → CTA.</div>
      <div class="bg-zinc-950 rounded-lg p-3"><div class="text-[11px] text-emerald-400 font-semibold mb-1">HISTORIAS · Método H.I.L.O.</div><b>H</b>ook → <b>I</b>dentificación → <b>L</b>leva (A→B con interacción) → <b>O</b>ferta + CTA de respuesta. Muestra débil vs estratégico.</div>
      <div class="bg-zinc-950 rounded-lg p-3"><div class="text-[11px] text-amber-400 font-semibold mb-1">YOUTUBE (Richard)</div>Idea = remix (formato outlier + tema + vector viral) · título por palanca (miedo/curiosidad/deseo) · miniatura por capas.</div>
    </div>`);

  const embudo = card('🔻 El embudo (cómo se convierte)', li([
    '<b>Reel</b> = atrae (alcance frío). <b>Historias</b> = venden (el vendedor). <b>Hand-raiser</b> = palabra clave → DM automático → conversación → llamada/venta.',
    '<b>3 secuencias de historias</b> (1 por día, 3-4 historias, alternando): <b>Lead Magnet</b> (hook de resultado → vehículo → CTA suave "comenta YO") · <b>CTA Directo</b> (muestra trabajo con clientes → CTA explícito "comenta DOC") · <b>Awareness</b> (momentos de trabajo + victorias, sin vender).',
    'Espaciá las historias cada 30-90 min, renová el hilo cada 24h. La 1ª del día tiene más alcance.',
    'Métrica que importa: no cuántos, sino <b>quiénes</b> responden y si terminan en llamada/venta.',
    'Automatiza el DM con ManyChat / Sell by Chat (responde 2-15 min después).',
  ]));

  const recursos = card('🎁 Recursos gratuitos (hand raisers)', li([
    '<b>Qué es:</b> contenido gratis (video, PDF/Notion, plantilla, calculadora, mini-curso, audio) que inicia una <b>conversación calificada</b>. No es regalar por regalar.',
    '<b>3 objetivos:</b> iniciar conversación · activar microcompromisos · generar confianza.',
    '<b>Sube el nivel de conciencia:</b> inconsciente del problema → consciente del problema → consciente de la solución.',
    '<b>Buen recurso:</b> genera conciencia del problema · se conecta a tu servicio · promesa específica · rápido de consumir · valor real.',
    '<b>Narrativa (3 pasos):</b> muestra el problema → ponle polémica/drama/seriedad → preséntalo como herramienta que da claridad.',
    '<b>Frecuencia:</b> 4-7 recursos/semana en reels+carruseles; historias 1-2 (cuenta chica) / 3-4 (cuenta grande).',
    '<b>Reutiliza</b> el mismo recurso con 3 ángulos distintos. Un lead frío necesita <b>7-14 recursos</b> antes de contratar.',
  ]));

  const metricas = card('📊 Qué mirar (métricas)', li([
    'Retención ≥ 50% → tiende a volverse viral.',
    'Comentarios · guardados · compartidos (la interacción manda).',
    '% visita→seguidor · clics en bio · DMs respondidos · agendas desde el perfil.',
    'Después de cada lanzamiento: qué historia/frame tuvo más respuestas → mejóralo el próximo.',
  ]));

  const perfil = card('🪪 Optimización del perfil (tu landing del embudo)', `
    <p class="text-sm text-zinc-400 mb-3">Tu perfil es la landing principal del embudo: en <b>5 segundos</b> debe quedar claro <b>qué haces, para quién, cómo y qué hacer ahora</b>. Vende el que transmite claridad, no el que grita más fuerte.</p>
    ${li([
      '<b>Foto:</b> tu cara en primer plano, fondo neutro, expresión cercana → confianza al instante. Sin logos confusos.',
      '<b>Nombre visible:</b> <code>Nombre | Especialidad</code> (ej. "Nicolás | Inversión en Bienes Raíces"). Instagram lo indexa → te encuentran al buscar tu tema.',
      '<b>Bio línea por línea:</b> (1) el resultado que ayudas a lograr · (2) resultados tuyos/de clientes · (3) método único (opcional) · (4) CTA claro.',
      '<b>El diferencial debe ser específico:</b> ❌ "Ayudo a invertir en bienes raíces" → ✅ "Ayudo a latinos en USA a cerrar su primer flip sin perder su capital".',
      '<b>Link en bio:</b> 1 solo link optimizado con objetivo único. NO un Linktree con 10 botones.',
      '<b>Historias destacadas:</b> Sobre mí (de A a B) · Cómo trabajo (oferta + paso a paso) · Testimonios · FAQs.',
      '<b>3 reels fijados:</b> (1) cómo trabajas / la oportunidad · (2) tu historia · (3) un caso de éxito fuerte (A→B).',
      '<b>Feed:</b> coherencia de marca, limpio y profesional — refuerza la percepción de valor.',
    ])}
    <div class="mt-3 text-xs text-zinc-500"><b class="text-zinc-400">Pregúntate:</b> si alguien entra a tu perfil ahora, ¿entiende qué vendes en 5 segundos? ¿Te escribiría hoy y agendaría una llamada?</div>`);

  const fuentes = card('📚 Tu información, integrada aquí', `<p class="text-xs text-zinc-500 leading-relaxed">Esta guía y el generador se alimentan de TODO lo que subiste: la grabación con tu mentora, el deck de Julio Iero, el video de Richard (YouTube), la reunión de ideas de fix &amp; flip, el banco de conocimiento (29 dolores), el playbook VIRALIDAD, los carruseles de historias (monikmontanez / danaherrera) y el brief del Método H.I.L.O. Nada se perdió — todo está plasmado en lo que tienes que hacer.</p>`);

  out.innerHTML = `
    <div class="mb-4">
      <h2 class="text-xl font-bold">Tu plan de contenido, día a día</h2>
      <p class="text-sm text-zinc-500">Qué subir, cómo subirlo y cuándo. Toda tu estrategia en un solo lugar.</p>
    </div>
    <div class="space-y-4">
      ${principios}${perfil}${rutina}${mes}${queSubir}${comoSubir}${formulas}${embudo}${recursos}${metricas}${fuentes}
    </div>`;
}

// ---------- Settings ----------
function openSettings() {
  document.getElementById('s-key').value = LS.key;
  const pf = document.getElementById('s-pass'); if (pf) pf.value = LS.pass;
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
        b.className = 'tab-btn px-3 py-2 border-b-2 ' + (on ? 'border-accent text-white font-medium' : 'border-transparent text-zinc-400 hover:text-zinc-200');
      });
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
      document.getElementById('tab-' + tab).classList.remove('hidden');
      if (tab === 'estrategia') renderEstrategia();
      if (window.OPERA_RENDERERS && window.OPERA_RENDERERS[tab]) window.OPERA_RENDERERS[tab]();
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
  document.getElementById('h-generate').addEventListener('click', generarHistorias);
  document.getElementById('s-save').addEventListener('click', () => {
    LS.key = document.getElementById('s-key').value.trim();
    const pf = document.getElementById('s-pass'); if (pf) LS.pass = pf.value.trim();
    const custom = document.getElementById('s-model-custom').value.trim();
    LS.model = custom || document.getElementById('s-model').value;
    refreshKeyStatus();
    document.getElementById('settings-modal').classList.add('hidden');
  });
});
