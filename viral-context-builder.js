/* viral-context-builder.js — EL CORAZÓN de v3.
   Construye el prompt al API inyectando TODO el contexto de marca del JSON (v2)
   + el dolor del banco de conocimiento + auto-selección de enemigo/táctica/fase.
   Depende de globals: OPERA (viral-opera.js) y findPregunta/KB (viral.js).
   Expone window.ContextBuilder. */
(function () {
  'use strict';

  // ---- Mapeo dolor → enemigo táctico (del PLAN v3) ----
  const DOLOR_A_ENEMIGO = {
    q001: 'algunDia', q002: 'bancos', q003: 'cursosIngles',
    q010: 'bancos', q011: 'cursosIngles', q012: 'bancos', q013: 'cursosIngles', q014: 'bancos',
    q020: 'compradorEmocional', q021: 'compradorEmocional', q022: 'contratistas',
    q030: 'wholesalers', q031: 'wholesalers',
    q040: 'contratistas', q041: 'contratistas', q042: 'bancos',
    q050: 'contratistas', q051: 'cursosIngles',
    q060: 'acumuladores', q061: 'cursosIngles', q062: 'cursosIngles', q063: '9a5',
    q070: 'algunDia', q071: 'compradorEmocional', q072: 'acumuladores',
    q080: '9a5', q081: '9a5', q090: 'algunDia', q091: 'algunDia',
  };

  // ---- Auto-táctica por tipo de contenido (ids de v2.psicologia.tacticasAplicadas) ----
  const TACTICA_POR_TIPO = { manifiesto: 5, reel: 1, post: 1, carrusel: 1, historia: 11, youtube: 3 };
  // Override opcional por objetivo declarado en el tema
  const TACTICA_POR_OBJETIVO = { caso: 16, educativo: 1, polemico: 6, aventura: 12 };

  function getData() { return (typeof OPERA !== 'undefined' && OPERA) ? OPERA : null; }
  function getDolor(id) {
    if (!id) return null;
    if (typeof findPregunta === 'function') return findPregunta(id);
    return null;
  }

  // ---- Resolutores ----
  function getCurrentFase() {
    const d = new Date().getDate();
    return (d >= 21 && d <= 27) ? 'cosecha' : 'siembra';
  }
  function autoSelectEnemigo(dolorId, data) {
    const en = data.arquetipo.enemigos;
    const tid = DOLOR_A_ENEMIGO[dolorId];
    const tac = tid && en.tacticos.find(e => e.id === tid);
    if (tac) return { id: tac.id, nombre: tac.nombre, tipo: 'táctico', frase: tac.frase, solucion: tac.tuSolucion, pain: tac.pain };
    return { id: 'principal', nombre: en.principal.nombre, tipo: 'principal', frase: (en.principal.frasesAntiEnemigo || [])[0] || '', solucion: 'Mostrar métricas, dashboards y casos reales con números.' };
  }
  function resolveEnemigo(enemigo, dolorId, data) {
    if (!enemigo || enemigo === 'auto') return autoSelectEnemigo(dolorId, data);
    const en = data.arquetipo.enemigos;
    if (enemigo === 'principal' || enemigo === 'gurues') return { id: 'principal', nombre: en.principal.nombre, tipo: 'principal', frase: (en.principal.frasesAntiEnemigo || [])[0] || '', solucion: 'Métricas y casos reales.' };
    if (enemigo === 'invisible') return { id: 'invisible', nombre: en.invisible.nombre, tipo: 'invisible', frase: (en.invisible.frasesAntiEnemigo || [])[0] || '', solucion: 'Todo output termina en algo aplicable hoy.' };
    const tac = en.tacticos.find(e => e.id === enemigo);
    return tac ? { id: tac.id, nombre: tac.nombre, tipo: 'táctico', frase: tac.frase, solucion: tac.tuSolucion, pain: tac.pain } : autoSelectEnemigo(dolorId, data);
  }
  function resolveTactica(tactica, tipoContenido, objetivo, data) {
    const tacs = data.psicologia.tacticasAplicadas;
    let id;
    if (tactica && tactica !== 'auto') id = Number(tactica);
    else if (objetivo && TACTICA_POR_OBJETIVO[objetivo]) id = TACTICA_POR_OBJETIVO[objetivo];
    else id = TACTICA_POR_TIPO[tipoContenido] || 1;
    return tacs.find(t => t.id === id) || tacs[0];
  }

  // ---- Fórmula y schema de salida por tipo ----
  const FORMULAS = {
    reel: 'Hook (0-3s) → Chisme (3-8s) → Valor oculto (8-25s) → CTA (25-35s).',
    post: 'Hook fuerte → desarrollo con 1 insight accionable → CTA con palabra DM.',
    carrusel: 'Cover impactante → 5-9 slides de body → slide CTA con palabra DM.',
    historia: 'H.I.L.O.: Hook → Identificación → Lleva (A→B con 1 interacción) → Oferta + CTA de respuesta.',
    youtube: 'Hook 30s → Authority 30s → Promise 30s → Body 10-50min → Cierre + CTA. + 4-6 títulos por palanca + 3 miniaturas A/B.',
    manifiesto: 'Declaración de identidad de tribu (estilo Apple Think Different): líneas cortas, contundentes, sin CTA de venta directo.',
  };
  const CAMPOS_BASE = `"thumbnail_text" (texto de portada, ≤5 palabras), "hook", "chisme", "valor_oculto", "cta", "caption_corta", "caption_larga", "palabra_clave_dm", "mecanica_aplicada"`;
  // Bloque RAG: ejemplos del historial con buenas métricas (Fase 4).
  function ragBlock(examples) {
    if (!examples || examples.length < 3) return '';
    const lines = examples.slice(0, 4).map((e, i) =>
      `Ejemplo ${i + 1} (similarity ${e.similarity}, views ${e.views}):\n  HOOK: ${e.hook || ''}\n  ${e.desarrollo || ''}\n  CTA: ${e.cta || ''}`).join('\n\n');
    return `\n\n═══ EJEMPLOS DE TU HISTORIAL (RAG) ═══
Estos outputs tuyos pasados son SIMILARES y obtuvieron buenas métricas. Aprendé de la estructura/hook/CTA. NO copies — adaptá.\n\n${lines}`;
  }
  function ragMeta(examples) {
    if (!examples || examples.length < 3) return null;
    const avg = Math.round(examples.reduce((a, e) => a + (e.views || 0), 0) / examples.length);
    return { count: examples.length, avgViews: avg };
  }
  function tipoExtra(tipo) {
    return {
      carrusel: `, "slides": [ { "n": 1, "tipo": "hook|problema|solucion|prueba|cta", "texto": "", "visual": "" } ]`,
      historia: `, "frames": [ { "fase": "H|I|L|L-interaccion|O", "texto_en_pantalla": "", "voz": "", "sticker": "" } ]`,
      youtube: `, "titulos": [ { "texto": "", "palanca": "miedo|curiosidad|deseo" } ], "miniaturas": [ { "variante": "A", "texto_en_miniatura": "", "composicion": "" } ]`,
      manifiesto: `, "lineas": [ "línea 1", "línea 2" ]`,
    }[tipo] || '';
  }
  function schemaPorTipo(tipo) {
    return `Devolvé SOLO un JSON válido (sin backticks, sin texto fuera) con esta forma:
{ "variantes": [ { ${CAMPOS_BASE}${tipoExtra(tipo)},
  "validador": { "usa_palabras_marca": [], "evita_palabras_prohibidas": true, "tiene_frase_recurrente": true, "cta_pide_dm": true } } ] }`;
  }

  // ============================================================
  //  ESTILOS DE CONTENIDO (inspirados en creators reales).
  //  Fuente canónica: docs/marketing/PATRONES-VIRALES-MAESTRO.md
  //  Few-shots TEXTUALES copiados del doc (NO inventados).
  // ============================================================

  // --- RAMIRO STYLE — carrusel técnico (@ramiro.cubria) ---
  const RAMIRO_FEWSHOTS = `
EJEMPLO 1 — patrón "REEMPLACÉ":
{"estilo":"ramiro_style","caption":"Comentá CONTRATO ⬇️","slides":[{"n":1,"tipo":"portada","badge":"NUEVO","titulo":"Reemplacé a mi contractor de $40.000 con un sistema de $0","palabra_naranja":"$0","subtitulo":"Y mi último flip cerró 2 semanas antes."},{"n":2,"tipo":"paso","badge":"PASO 1","titulo":"Calculá el MAO real","screenshot":"Calculadora 4 Números — interfaz","instruccion":"Ingresá ARV, rehab, holding y margen objetivo. La fórmula es: ARV × 0.70 − rehab − $30K = MAO."},{"n":3,"tipo":"paso","badge":"PASO 2","titulo":"Vetea al GC con esta matriz","screenshot":"Matriz GC — 12 preguntas con scoring","instruccion":"Si saca <40 puntos, no firmes. Si saca 40-70, firmá pero exigí milestones. Si saca >70, dale todo el proyecto."},{"n":4,"tipo":"paso","badge":"PASO 3","titulo":"Pegale este contrato blindado","screenshot":"Template Word — Contrato GC blindado","instruccion":"Cláusulas de milestones de pago, anti-abandono, penalty por retraso, y reemplazo de subcontratistas sin consulta."},{"n":5,"tipo":"resultado","badge":"RESULTADO","titulo":"Te da vuelta tus flips","bullets":["Detectás GCs estafadores antes de firmar","Pagás en milestones y no en avance","Tenés cláusulas anti-abandono","Ahorrás $20-40K por flip","Cerrás 2-4 semanas antes"]},{"n":6,"tipo":"cta","boton":"COMENTÁ \\"CONTRATO\\"","subtitulo":"para recibir la plantilla de contrato blindado para GCs."}]}

EJEMPLO 2 — patrón "NECESITÁS":
{"estilo":"ramiro_style","caption":"Comentá CALC ⬇️","slides":[{"n":1,"tipo":"portada","badge":"SISTEMA FLIP","titulo":"Necesitás una Calculadora 4 Números","palabra_naranja":"Calculadora 4 Números","subtitulo":"Acá tenés todo lo que te hace falta para nunca más comprar un flip malo."},{"n":2,"tipo":"paso","badge":"PASO 1","titulo":"Buscá el ARV real con 3 comps","screenshot":"Redfin/Zillow comps"},{"n":3,"tipo":"paso","badge":"PASO 2","titulo":"Hacé el rehab walkthrough","screenshot":"Spreadsheet partidas"},{"n":4,"tipo":"paso","badge":"PASO 3","titulo":"Calculá holding + closing","screenshot":"Holding cost calculator"},{"n":5,"tipo":"resultado","badge":"RESULTADO","titulo":"Sabés si comprar o no","bullets":["Verde: comprás","Amarillo: negociás","Rojo: alejate"]},{"n":6,"tipo":"cta","boton":"COMENTÁ \\"CALC\\"","subtitulo":"para recibir la calculadora Excel + video de uso."}]}

EJEMPLO 3 — patrón "ÚLTIMO MOMENTO":
{"estilo":"ramiro_style","caption":"Comentá ITIN ⬇️","slides":[{"n":1,"tipo":"portada","badge":"ÚLTIMO MOMENTO","titulo":"Los gurúes te mintieron. No necesitás social security para comprar tu primer flip.","palabra_naranja":"No necesitás","subtitulo":"Con ITIN podés financiarte hasta $500K. Te muestro cómo."}]}`;

  const RAMIRO_SYSTEM = `

═══ ESTILO: RAMIRO STYLE (carrusel técnico, inspirado en @ramiro.cubria) ═══
Estructura visual exacta (6-8 slides): PORTADA con badge naranja + título grande con UNA palabra en NARANJA → slides "PASO N" con screenshot REAL de una herramienta concreta (Calculadora 4 Números, Matriz GC, Redfin, etc.) + instrucción directa → slide RESULTADO con 4-5 bullets concretos → slide CTA con botón "COMENTÁ PALABRA".
Tono: tutorial sistemático, accionable, verbos imperativos ("Calculá", "Vetea", "Pegale", "Buscá").
Hook (portada) con UNO de estos patrones: NÚMERO específico · REEMPLACÉ X con Y · NECESITÁS X · CÓMO + verbo brutal · DECLARACIÓN ROTUNDA · ÚLTIMO MOMENTO.
Caption SIEMPRE con formato EXACTO: "Comentá PALABRA ⬇️" (PALABRA en MAYÚSCULAS, 1 sola palabra/número conectada al lead magnet).

FEW-SHOTS CANÓNICOS para Fix & Flip (imitá estructura/voz, NO copies literal — adaptá al tema pedido):${RAMIRO_FEWSHOTS}`;

  function ramiroSchema() {
    return `Devolvé SOLO un JSON válido (sin backticks, sin texto fuera) con esta forma EXACTA para ramiro_style:
{ "variantes": [ {
  "estilo": "ramiro_style",
  "thumbnail_text": "texto de portada ≤5 palabras",
  "hook": "el título de la portada",
  "caption": "Comentá PALABRA ⬇️",
  "caption_corta": "", "caption_larga": "", "palabra_clave_dm": "PALABRA",
  "mecanica_aplicada": "qué patrón de hook usaste",
  "slides": [
    { "n": 1, "tipo": "portada", "badge": "NUEVO|ÚLTIMO MOMENTO|SISTEMA FLIP|PASO 1", "titulo": "", "palabra_naranja": "fragmento del título que va en naranja", "subtitulo": "", "visual": "" },
    { "n": 2, "tipo": "paso", "badge": "PASO 1", "titulo": "verbo accionable", "screenshot": "herramienta real referenciada", "instruccion": "" },
    { "n": 3, "tipo": "paso", "badge": "PASO 2", "titulo": "", "screenshot": "", "instruccion": "" },
    { "n": 4, "tipo": "paso", "badge": "PASO 3", "titulo": "", "screenshot": "", "instruccion": "" },
    { "n": 5, "tipo": "resultado", "badge": "RESULTADO", "titulo": "", "bullets": ["4 a 5 bullets concretos"] },
    { "n": 6, "tipo": "cta", "boton": "COMENTÁ \\"PALABRA\\"", "subtitulo": "para recibir [lead magnet específico]" }
  ],
  "validador": { "usa_palabras_marca": [], "evita_palabras_prohibidas": true, "tiene_frase_recurrente": true, "cta_pide_dm": true }
} ] }
REGLAS DURAS: 6 a 8 slides · slide 1 portada con badge + título + palabra_naranja · slides intermedios "PASO N" + título (verbo) + screenshot real · penúltimo RESULTADO con 4-5 bullets · último CTA con botón COMENTÁ "PALABRA" en MAYÚSCULAS · caption con formato exacto: Comentá PALABRA ⬇️`;
  }

  // --- ALEJANDRA STYLE — carrusel confesional (@alrinconoficial) ---
  const ALEJANDRA_FEWSHOTS = `
EJEMPLO 1 — patrón "DECLARACIÓN ENOJADA":
{"estilo":"alejandra_style","caption":"Hace 4 años yo era de los que perdían $20K-$40K por flip por confiar en cualquier GC con buena verba 😤 Hasta que entendí que el problema NO era el GC, ERA YO. Yo no tenía un sistema de vetting. Yo no tenía un contrato blindado. Yo no tenía milestones de pago. Hoy mi sistema cierra flips sin sorpresas. Si querés que te mande la matriz de vetting + el contrato exacto que uso, comentá GC. 🔥","slides":[{"n":1,"tipo":"portada_confesional","headline_top":"ODIO VER FLIPPERS PERDIENDO $40K","highlight_top_color":"rojo","highlight_top_palabras":["$40K"],"foto_autor":"Nicolás con cara seria, fondo de obra inconclusa","headline_bottom":"POR CONFIAR EN GCs SIN VETEAR","highlight_bottom_color":"amarillo","highlight_bottom_palabras":["SIN VETEAR"]},{"n":2,"tipo":"antes","texto":"Yo era de los que firmaba contratos genéricos sin leer..."},{"n":3,"tipo":"antes","texto":"Pagaba 50% por adelantado porque 'todos lo hacen'..."},{"n":4,"tipo":"quiebre","texto":"Hasta que perdí $40K en mi tercer flip y dije BASTA."},{"n":5,"tipo":"aprendizaje","bullets":["✅ Vetear es 70% del éxito","✅ Pagar en milestones es no negociable","✅ El contrato blindado vale más que cualquier curso"]},{"n":6,"tipo":"cta_conversacional","texto":"¿Querés mi matriz exacta? Comentá GC abajo."}]}

EJEMPLO 2 — patrón "STORYTELLING PERSONAL":
{"estilo":"alejandra_style","caption":"Esta era yo en 2022. Empleado en una financiera ganando $4.500/mes en pesos. Sintiéndome atrapado. Mirando a flippers en YouTube y pensando 'eso no es para mí'. Hoy tengo 4 empresas operando y +200 alumnos. ¿La clave? Dejé de creer en gurúes y empecé a aplicar UN sistema. 🔥","slides":[{"n":1,"tipo":"portada_confesional","headline_top":"ESTA ERA YO EN 2022","highlight_top_palabras":["2022"],"foto_autor":"Nicolás joven con traje, en oficina de banco","headline_bottom":"GANANDO $4.500/MES Y ATRAPADO","highlight_bottom_color":"rojo","highlight_bottom_palabras":["ATRAPADO"]}]}

EJEMPLO 3 — patrón "CONTROVERSIA ANTI-AUTORIDAD":
{"estilo":"alejandra_style","caption":"Lo que NO te cuentan los gurúes de Real Estate es que ellos NUNCA hicieron un flip real 🥲 Viven de tu suscripción, de tu evento, de tu curso. NO de las propiedades. Por eso te enseñan TODO menos lo que importa: vetting, contratos, MAO real, salida defensiva. Yo NO vendo cursos. Yo OPERO. 🔥","slides":[{"n":1,"tipo":"portada_confesional","headline_top":"LOS GURÚES VIVEN DE","foto_autor":"Nicolás señalando con cara seria","headline_bottom":"QUE NUNCA HAGAS UN FLIP","highlight_bottom_color":"amarillo","highlight_bottom_palabras":["NUNCA"]}]}`;

  const ALEJANDRA_SYSTEM = `

═══ ESTILO: ALEJANDRA STYLE (carrusel confesional, inspirado en @alrinconoficial) ═══
Estructura visual (6-10 slides): PORTADA con foto del autor GRANDE central + headline en CAJA NEGRA arriba Y abajo (sandwich), MAYÚSCULAS, con palabras clave en AMARILLO/ROJO → slides ANTES/PROBLEMA en primera persona vulnerable ("Yo era de los que...") → slide QUIEBRE ("Hasta que entendí que...") → slides APRENDIZAJE con 3-5 lecciones (bullets con emoji) → CTA CONVERSACIONAL (pregunta/invitación, más suave que Ramiro).
Tono: storytelling personal, vulnerable real, primera persona, autoridad por experiencia.
Hook (portada) con UNO de estos patrones: DECLARACIÓN ENOJADA ("ODIO VER QUE...") · STORYTELLING PERSONAL CON NÚMERO ("ESTA ERA YO EN 2022...") · CONTROVERSIA ANTI-AUTORIDAD ("LOS GURÚES VIVEN DE...") · URGENCIA EDUCATIVA · IRONÍA DOLOROSA.
Caption LARGO (200-500 chars), coloquial, vulnerable, con al menos 1 emoji emocional (🥲 🥹 🔥 🎬 💔 😤). Estructura: contexto → quiebre → aprendizaje → CTA suave.

FEW-SHOTS CANÓNICOS para Fix & Flip (imitá estructura/voz, NO copies literal — adaptá al tema pedido):${ALEJANDRA_FEWSHOTS}`;

  function alejandraSchema() {
    return `Devolvé SOLO un JSON válido (sin backticks, sin texto fuera) con esta forma EXACTA para alejandra_style:
{ "variantes": [ {
  "estilo": "alejandra_style",
  "thumbnail_text": "texto de portada ≤5 palabras",
  "hook": "el headline de la portada (en MAYÚSCULAS)",
  "caption": "caption largo narrativo (200-500 chars, primera persona, con emoji emocional)",
  "caption_corta": "", "caption_larga": "", "palabra_clave_dm": "PALABRA (opcional, CTA suave)",
  "mecanica_aplicada": "qué patrón de hook usaste",
  "slides": [
    { "n": 1, "tipo": "portada_confesional", "headline_top": "DECLARACIÓN EN MAYÚSCULAS", "headline_bottom": "CONTINUACIÓN EN MAYÚSCULAS", "highlight_top_color": "amarillo|rojo", "highlight_top_palabras": [], "highlight_bottom_color": "amarillo|rojo", "highlight_bottom_palabras": [], "foto_autor": "descripción de la foto" },
    { "n": 2, "tipo": "antes", "texto": "Yo era de los que..." },
    { "n": 3, "tipo": "quiebre", "texto": "Hasta que entendí que..." },
    { "n": 4, "tipo": "aprendizaje", "bullets": ["✅ lección 1", "✅ lección 2", "✅ lección 3"] },
    { "n": 5, "tipo": "cta_conversacional", "texto": "pregunta/invitación suave al lector" }
  ],
  "validador": { "usa_palabras_marca": [], "evita_palabras_prohibidas": true, "tiene_frase_recurrente": true, "cta_pide_dm": true }
} ] }
REGLAS DURAS: 6 a 10 slides · slide 1 portada_confesional con headline_top + headline_bottom (sandwich) + foto_autor · hook con al menos 30% en MAYÚSCULAS · caption 200-500 chars con al menos 1 emoji emocional · slide final puede ser conversacional (NO requiere palabra DM en mayúsculas).`;
  }

  // --- AMERICA STYLE — reel diálogo + desglose + CTA palabra (creator construcción USA-LATAM) ---
  const AMERICA_FEWSHOTS = `
EJEMPLO 1 — "NÚMERO + acción + tiempo":
{"estilo":"america_style","patron":"numero_accion_tiempo","duracion_estimada_seg":60,"hook":"Hice 47 mil dólares en mi último flip, lo cerré en 4 meses sin poner un peso mío.","desarrollo":"Compré la casa por debajo del 70% del ARV en una zona donde los wholesalers ni siquiera miran. Refinancié con un hard money lender que me prestó el 100% de compra y rehab. Mi rehab fue solo cosmética: pintura, pisos, cocina nueva. Vendí 8 días después de listarla porque el comparable del barrio venía subiendo.","cta":"Y si vos también querés aprender a calcular el MAO real sin ilusionarte, escribí MAO en los comentarios y te paso mi calculadora.","cta_palabra":"MAO"}

EJEMPLO 2 — "DIÁLOGO escena":
{"estilo":"america_style","patron":"dialogo_escena","duracion_estimada_seg":70,"hook":"Sobrino, ¿cuánto pagaste por tu primer flip? Cero dólares.","desarrollo":"Pero cómo cero dólares. Es que conseguí un hard money que me prestó el 100% de compra y rehab. Pero entonces tenías que tener buen crédito. No, con ITIN, sin social security. Y de dónde sacaste para los closing costs. Me los financió el seller, le pedí seller credit de 6 mil dólares. Sobrino, enséñame.","cta":"Tío, mirá, escribí FLIP en los comentarios y te paso el script exacto que usé.","cta_palabra":"FLIP"}

EJEMPLO 3 — "OPOSICIÓN binaria":
{"estilo":"america_style","patron":"oposicion_binaria","duracion_estimada_seg":75,"hook":"Este es el wholesaler. Este es el flipper.","desarrollo":"El wholesaler cobra 5 mil por deal y se queda corriendo sin parar. El flipper cobra entre 30 a 80 mil por deal y trabaja 3 deals al año. El wholesaler vive de volumen. El flipper vive de margen. Pero el flipper necesita dinero. Sí. Y de dónde lo saca. Capital privado, hard money, partners. Pero entonces el wholesaler es más fácil. Más fácil sí, pero más techo te pone.","cta":"Si querés ver mi sistema completo para arrancar como flipper sin capital propio, escribí MÉTODO en los comentarios.","cta_palabra":"MÉTODO"}

EJEMPLO 4 — "PEOR ERROR":
{"estilo":"america_style","patron":"peor_error","duracion_estimada_seg":50,"hook":"¿Cuál es el peor error del flipper principiante? Confiar en cualquier GC con buena verba.","desarrollo":"Yo perdí 40 mil dólares en mi tercer flip por eso. Firmé contrato genérico, pagué 50 por adelantado, y el GC desapareció a los 2 meses. Hoy uso una matriz de vetting de 12 preguntas, un contrato blindado con milestones de pago y cláusulas anti-abandono.","cta":"Si querés mi matriz exacta y el contrato, escribí GC en los comentarios.","cta_palabra":"GC"}

EJEMPLO 5 — "COMPARATIVA binaria":
{"estilo":"america_style","patron":"comparativa_binaria","duracion_estimada_seg":65,"hook":"Para ganar 200 mil dólares en 12 meses tenés 3 caminos.","desarrollo":"1: hacer 12 wholesales de 17 mil cada uno, trabajando todos los meses sin parar. 2: hacer 4 flips medianos de 50 mil de ganancia, 4 meses cada uno. 3: hacer 1 flip grande de 200 mil de ganancia, 8 meses, capital y nervios de acero. Yo elegí la opción 2 porque me da margen y escala razonable.","cta":"Si querés ver el case study completo de mi último flip de 47 mil, escribí PRIMER en los comentarios.","cta_palabra":"PRIMER"}

EJEMPLO 6 — "PROVOCACIÓN al avatar":
{"estilo":"america_style","patron":"provocacion_avatar","duracion_estimada_seg":55,"hook":"Recién llegaste a Estados Unidos. ¿Querés ahorrar 5 años para tu primera propiedad o flippear ya con dinero ajeno?","desarrollo":"La mayoría elige ahorrar y termina en el ciclo de la renta para siempre. Yo elegí flippear con capital privado y hoy tengo 4 empresas operando. Lo único que necesitás es saber 3 cosas: cómo calcular el MAO real, cómo conseguir el dinero sin papeles, y cómo vetear al GC.","cta":"Si querés que te pase los 3 templates, escribí SISTEMA en los comentarios.","cta_palabra":"SISTEMA"}

EJEMPLO 7 — "RESPUESTA SUTIL" (al creador que dijo "remodelar es el peor negocio" — sin nombrarlo, respetuoso pero contundente):
{"estilo":"america_style","patron":"respuesta_sutil","hook":"Hay creadores que dicen que remodelar es el peor negocio.","desarrollo":"Yo gané 200 mil dólares el año pasado con 4 flips. ¿Sabés por qué a ellos les va mal y a mí no? Yo tengo un sistema. Sé exactamente cuánto puedo pagar por una casa antes de mirarla. Sé qué partidas del rehab tienen riesgo. Sé cómo elegir un GC sin que me robe. No es magia, es método.","cta":"Si querés que te muestre qué hace que un flip sea predecible, escribí MÉTODO en los comentarios.","cta_palabra":"MÉTODO"}`;

  const AMERICA_SYSTEM = `

═══ ESTILO: AMERICA STYLE (reel diálogo + desglose + CTA palabra, inspirado en creator construcción USA-LATAM) ═══
Estructura narrativa universal (siempre la misma): [HOOK 3-5s] → [DESARROLLO 15-90s] → [CTA palabra 5-10s]. Total 30-90 segundos.
Tono: español latam coloquial, factual, con cifras reales y desglose. Avatar: latino en EE.UU., contratista que quiere escalar.
Hook (≤25 palabras) con UNO de estos patrones: NÚMERO + acción + tiempo · PREGUNTA directa · DIÁLOGO escena (sobrino/vecina) · PROVOCACIÓN al avatar · OPOSICIÓN binaria (contratista vs desarrollador) · PEOR ERROR.
Si el hook menciona una cifra en dólares → el desarrollo DEBE traer el desglose o el cómo con números reales.
CTA EXACTO: "Si querés [PROMESA], escribí la palabra PALABRA en los comentarios y te [LO QUE RECIBÍS]." (PALABRA en MAYÚSCULAS, 1 sola palabra).
NUNCA: hooks vagos ("Hola amigos..."), CTAs débiles ("síganme"), cifras sin desglose, lenguaje gurú ("desbloqueá tu potencial"). Respetuoso con el trabajador.

FEW-SHOTS CANÓNICOS para Fix & Flip (imitá estructura/voz, NO copies literal — adaptá al tema pedido):${AMERICA_FEWSHOTS}`;

  function americaSchema() {
    return `Devolvé SOLO un JSON válido (sin backticks, sin texto fuera) con esta forma EXACTA para america_style:
{ "variantes": [ {
  "estilo": "america_style",
  "patron": "numero_accion_tiempo|pregunta_directa|dialogo_escena|provocacion_avatar|oposicion_binaria|peor_error|comparativa_binaria|respuesta_sutil",
  "thumbnail_text": "texto de portada ≤5 palabras",
  "duracion_estimada_seg": 60,
  "hook": "máximo 25 palabras",
  "desarrollo": "el cuerpo del reel (con desglose/cifras si el hook menciona dinero)",
  "cta": "Si querés ..., escribí PALABRA en los comentarios y te ...",
  "cta_palabra": "PALABRA",
  "caption_corta": "", "caption_larga": "", "palabra_clave_dm": "PALABRA",
  "mecanica_aplicada": "qué patrón usaste",
  "validador": { "usa_palabras_marca": [], "evita_palabras_prohibidas": true, "tiene_frase_recurrente": true, "cta_pide_dm": true }
} ] }
REGLAS DURAS: hook ≤25 palabras · si hook menciona $ → desarrollo con desglose · CTA con (escribí|comentá) + PALABRA en MAYÚSCULAS + "comentarios" · cta_palabra 1 sola palabra MAYÚSCULAS (3-10 chars) · duración estimada 30-90s · primera persona.`;
  }

  const STYLES = {
    ramiro_style: { tipo: 'carrusel', system: RAMIRO_SYSTEM, schema: ramiroSchema },
    alejandra_style: { tipo: 'carrusel', system: ALEJANDRA_SYSTEM, schema: alejandraSchema },
    america_style: { tipo: 'reel', system: AMERICA_SYSTEM, schema: americaSchema },
  };

  // --- Auto-detección de estilo de REEL (America vs Default) ---
  // TUNEADO vs DOC: keywords base = SECCIÓN 4 de PATRONES-VIRALES-MAESTRO.md.
  // Se AGREGÓ 'sin plata' — sin esto "flip de 47K sin plata" da score 1 (<2) y
  // cae al default. Mismo criterio que detectarEstiloCarrusel: auto-detección real
  // sobre fidelidad literal al doc.
  function detectarEstiloReel(input_idea, dolor, tema) {
    const keywords_america = [
      'cuánto cuesta', 'cuánto gané', 'sobrino', 'vecino', 'vecina',
      'desglose', 'partida', 'capital', 'sin papeles',
      'sin dinero', 'sin un peso', 'sin plata', 'opcion 1', 'opcion 2',
      'maleta', 'maleta del', 'contratista vs', 'wholesaler vs',
      'peor error', 'que nunca hace', 'dialogo',
      'flip de', 'gané', 'hice', 'recién llegado',
      'latino', 'inmigrante', 'sin social', 'itin',
    ];
    const texto = (String(input_idea || '') + ' ' + String(dolor || '') + ' ' + String(tema || '')).toLowerCase();
    const score = keywords_america.filter(k => texto.includes(k)).length;
    if (score >= 2) return 'america_style';
    return 'default';
  }

  // --- Auto-detección de estilo de CARRUSEL (Ramiro vs Alejandra) ---
  // TUNEADO vs DOC: keywords base = SECCIÓN 4 de PATRONES-VIRALES-MAESTRO.md.
  // Se AGREGARON 'peor'/'mi peor' (alejandra) — sin esto "mi peor GC" da empate
  // y cae al default (ramiro). Decisión del CEO: prioridad a la auto-detección que
  // funciona con frases reales cortas por sobre la fidelidad literal al doc.
  function detectarEstiloCarrusel(input_idea, dolor, tema) {
    const keywords_ramiro = [
      'sistema', 'tutorial', 'pasos', 'cómo hacer', 'fórmula',
      'método', 'plantilla', 'herramienta', 'calculadora', 'framework',
      'reemplazar', 'automatizar', 'ia', 'tecnología', 'configurar',
      'paso a paso', 'guía técnica', 'buy box', 'matriz', 'contrato',
    ];
    const keywords_alejandra = [
      'mi historia', 'me pasó', 'aprendí', 'fracasé', 'estancado',
      'estafado', 'engañado', 'descubrí', 'realidad', 'verdad',
      'mentira', 'gurúes', 'mafia', 'industria', 'antes era',
      'hace x años', 'transformación', 'cambio de vida', 'mindset',
      'odio ver', 'me molesta', 'cansé', 'reflexión',
      'peor flip', 'peor experiencia', 'me arrepiento', 'peor', 'mi peor',
    ];
    const texto = (String(input_idea || '') + ' ' + String(dolor || '') + ' ' + String(tema || '')).toLowerCase();
    const score_ramiro = keywords_ramiro.filter(k => texto.includes(k)).length;
    const score_alejandra = keywords_alejandra.filter(k => texto.includes(k)).length;
    if (score_alejandra > score_ramiro) return 'alejandra_style';
    if (score_ramiro > score_alejandra) return 'ramiro_style';
    return 'ramiro_style'; // default cuando empate
  }

  // Resuelve el estilo efectivo según tipo + selección del usuario (o auto-detección).
  function resolveEstilo(tipo, p) {
    p = p || {};
    if (tipo === 'carrusel') {
      let e = p.estiloCarrusel || 'auto';
      if (e === 'auto') {
        const t = [p.idea, p.tema, p.dolorTexto].filter(Boolean).join(' ');
        e = (typeof detectarEstiloCarrusel === 'function') ? detectarEstiloCarrusel(t, p.dolorTexto || '', p.tema || '') : 'ramiro_style';
      }
      return STYLES[e] && STYLES[e].tipo === 'carrusel' ? e : 'ramiro_style';
    }
    if (tipo === 'reel') {
      let e = p.estiloReel || 'auto';
      if (e === 'auto') {
        const t = [p.idea, p.tema, p.dolorTexto].filter(Boolean).join(' ');
        e = (typeof detectarEstiloReel === 'function') ? detectarEstiloReel(t, p.dolorTexto || '', p.tema || '') : 'default';
      }
      return e !== 'default' && STYLES[e] && STYLES[e].tipo === 'reel' ? e : 'default';
    }
    return 'default';
  }
  function styleSystem(estilo) { return (STYLES[estilo] && STYLES[estilo].system) || ''; }
  function styleSchema(estilo, tipo) { return (STYLES[estilo] && STYLES[estilo].schema) ? STYLES[estilo].schema() : schemaPorTipo(tipo); }

  // ---- Build principal ----
  function build(params) {
    const data = getData();
    if (!data) throw new Error('OPERA (data v2) no está cargada todavía.');
    const p = params || {};
    const tipo = p.tipoContenido || 'reel';
    const avatar = data.avatares[p.avatarDestino || 'avatar2'] || data.avatares.avatar2;
    const dolor = getDolor(p.dolor);
    const enemigo = resolveEnemigo(p.enemigo, p.dolor, data);
    const tactica = resolveTactica(p.tactica, tipo, p.objetivo, data);
    const fase = (!p.faseDelMes || p.faseDelMes === 'auto') ? getCurrentFase() : p.faseDelMes;
    const id = data.identidad, arq = data.arquetipo, marca = data.marca;
    const fr = arq.frasesRecurrentes;
    const estilo = resolveEstilo(tipo, Object.assign({}, p, { dolorTexto: dolor ? dolor.pregunta : '' }));

    const system = `Sos un asistente de creatividad y marketing para Nicolás Lara, operador de Fix & Flip con +20 propiedades y 4 empresas inmobiliarias operando.
Tu único trabajo: generar contenido que suene EXACTAMENTE como él, ataque a sus enemigos, use sus palabras y su framework. Cero contenido genérico.

=== CONTEXTO DE MARCA (obligatorio respetar) ===
ESLOGAN: "${id.esloganPrincipal}" · FRAMEWORK: ${id.framework} (mencionar cuando encaje)
TAGLINE: "${id.tagline}" · FRASE MAESTRA: "${id.fraseMaestra}"
ARQUETIPO: ${arq.nombre} — ${arq.descripcion}
TONO: directo, español rioplatense, sin floritura, técnico-accesible (que lo entienda mi tía pero sea profundo).
FOCO: ${marca.focoPrincipal}. Las otras empresas (${marca.subcomunicacion}) SOLO como CREDIBILIDAD, NUNCA como producto.

=== PALABRAS PROHIBIDAS (NUNCA usar — el output se rechaza si aparecen) ===
${arq.palabrasProhibidas.join(', ')}

=== PALABRAS DE MARCA (usar al menos 3) ===
${arq.palabrasDeMarca.join(', ')}

=== FRASES RECURRENTES (usar al menos 1) ===
BANDERA: ${fr.bandera.join(' · ')}
PUENTE: ${fr.puente.join(' · ')}
CIERRE: ${fr.cierre.join(' · ')}

=== REGLAS DE CTA ===
SIEMPRE pedir palabra clave por DM en MAYÚSCULAS ("Comentá MÉTODO y te paso X"). NUNCA "link en bio" ni "escribime al privado". El CTA dice QUÉ recibe la persona.

=== REGLAS DE EJECUTABILIDAD ===
NO prometer "multiplicar capital". SÍ promesa aterrizada ("tu primer flip sin perder capital"), números específicos ($73K, 8 meses, +200 alumnos), caso real si encaja, y todo termina en algo aplicable hoy.

=== FÓRMULA (${tipo}) ===
${FORMULAS[tipo] || FORMULAS.reel}` + ragBlock(p.ragExamples) + styleSystem(estilo);

    const userPrompt = `=== PARÁMETROS DE ESTA PIEZA ===
AVATAR DESTINO: ${avatar.nombre} — ${avatar.perfil}
  Ángulo: ${avatar.anguloMarketing} · Lead magnet: ${avatar.leadMagnet}
${dolor ? `DOLOR DEL AVATAR: "${dolor.pregunta}"
  Reframe correcto: ${dolor.respuesta_corta}
  Categoría: ${dolor.categoria} · Pilar: ${dolor.pilar}` : 'DOLOR: libre (no se eligió uno del banco).'}
ENEMIGO A ATACAR (al ARQUETIPO, NUNCA a personas): ${enemigo.nombre}
  Frase asociada: "${enemigo.frase}" · Tu solución: ${enemigo.solucion}
TÁCTICA PSICOLÓGICA: ${tactica.maestro} — ${tactica.tecnica}
  Cómo aplicarla: ${tactica.tuVersion}
FASE DEL MES: ${fase} ${fase === 'cosecha' ? '(días 21-27: vender desde stories con urgencia real)' : '(siembra: valor masivo, hand-raisers, NO vender de frente)'}

=== TAREA ===
Generá ${p.variantes || 3} variante(s) de ${tipo}.
${p.tema ? 'TEMA/ÁNGULO LIBRE: ' + p.tema : 'TEMA: elegí el ángulo más potente para el dolor/enemigo.'}
${p.formato ? 'FORMATO: ' + p.formato : ''}
PALABRA CLAVE DM: ${p.palabraClaveDM || 'elegí la más relevante (MÉTODO, BUYBOX, GC, HARMONY, SERGIO, PRIMERFLIP…)'}

${styleSchema(estilo, tipo)}`;

    // Objeto transparente para el panel "contexto inyectado"
    const contexto = {
      eslogan: id.esloganPrincipal,
      framework: id.framework,
      tagline: id.tagline,
      arquetipo: arq.nombre,
      enemigo: enemigo.nombre,
      enemigoTipo: enemigo.tipo,
      tactica: tactica.maestro + ' — ' + tactica.tecnica,
      avatar: avatar.nombre,
      dolor: dolor ? dolor.pregunta : null,
      fase,
      tipo,
      prohibidasCount: arq.palabrasProhibidas.length,
      marcaCount: arq.palabrasDeMarca.length,
      validador: true,
      rag: ragMeta(p.ragExamples),
      estilo: estilo !== 'default' ? estilo : null,
    };
    return { system, userPrompt, contexto, resueltos: { enemigo, tactica, fase, avatar, dolor }, tipo, estilo };
  }

  // ---- MODO LIBRE: Claude auto-decide avatar/dolor/enemigo/táctica/fase ----
  function buildLibre(params) {
    const data = getData();
    if (!data) throw new Error('OPERA (data v2) no está cargada todavía.');
    const p = params || {};
    const tipo = p.tipoContenido || 'reel';
    const id = data.identidad, arq = data.arquetipo, marca = data.marca, fr = arq.frasesRecurrentes;
    const fase = getCurrentFase();
    const estilo = resolveEstilo(tipo, p);
    const avatarCat = Object.keys(data.avatares).map(k => `${k}: ${data.avatares[k].nombre} — ${data.avatares[k].anguloMarketing}`).join('\n');
    const enemyCat = `principal: ${arq.enemigos.principal.nombre}\ninvisible: ${arq.enemigos.invisible.nombre}\n`
      + arq.enemigos.tacticos.map(e => `${e.id}: ${e.nombre} — "${e.frase}" (solución: ${e.tuSolucion})`).join('\n');
    const tacticaCat = data.psicologia.tacticasAplicadas.map(t => `${t.id}: ${t.maestro} — ${t.tecnica}`).join('\n');
    const doloresCat = (typeof KB !== 'undefined' && KB && KB.preguntas) ? KB.preguntas.map(q => `${q.id}: ${q.pregunta}`).join('\n') : '(banco no disponible — usá dolor_id null)';

    const system = `Sos un asistente de creatividad y marketing para Nicolás Lara, operador de Fix & Flip con +20 propiedades y 4 empresas inmobiliarias operando.
Tu trabajo: a partir de una IDEA cruda del usuario, DECIDIR internamente la mejor estrategia y generar contenido que suene EXACTAMENTE como él. Cero contenido genérico.

=== CONTEXTO DE MARCA (obligatorio respetar) ===
ESLOGAN: "${id.esloganPrincipal}" · FRAMEWORK: ${id.framework} · TAGLINE: "${id.tagline}" · FRASE MAESTRA: "${id.fraseMaestra}"
ARQUETIPO: ${arq.nombre} — ${arq.descripcion}
TONO: directo, español rioplatense, técnico-accesible. FOCO: ${marca.focoPrincipal}. Las otras empresas (${marca.subcomunicacion}) SOLO como CREDIBILIDAD.

=== PALABRAS PROHIBIDAS (NUNCA usar) ===
${arq.palabrasProhibidas.join(', ')}
=== PALABRAS DE MARCA (usar al menos 3) ===
${arq.palabrasDeMarca.join(', ')}
=== FRASES RECURRENTES (usar al menos 1) ===
${[].concat(fr.bandera, fr.cierre).join(' · ')}
=== REGLAS DE CTA ===
SIEMPRE palabra clave por DM en MAYÚSCULAS ("Comentá MÉTODO y te paso X"). NUNCA "link en bio".
=== REGLAS DE EJECUTABILIDAD ===
NO prometer "multiplicar capital". SÍ promesa aterrizada + números reales + algo aplicable hoy.
=== FÓRMULA (${tipo}) ===
${FORMULAS[tipo] || FORMULAS.reel}

=== CATÁLOGO DISPONIBLE (elegí lo más coherente con la idea; NO se lo muestres al usuario, usalo para decidir) ===
AVATARES:
${avatarCat}
ENEMIGOS (atacar al ARQUETIPO, nunca a personas):
${enemyCat}
TÁCTICAS:
${tacticaCat}
FASE DEL MES HOY: ${fase} (siembra = valor sin vender; cosecha = vender desde stories)
DOLORES DEL BANCO:
${doloresCat}` + ragBlock(p.ragExamples) + styleSystem(estilo);

    const userPrompt = `=== MODO LIBRE ===
El usuario te da una idea cruda. Decidí internamente qué avatar_id, dolor_id (del banco, o null si ninguno encaja), enemigo_id, tactica_id y fase aplican mejor, y generá el contenido.

IDEA DEL USUARIO: "${p.idea || ''}"
TIPO: ${tipo} · VARIANTES: ${p.variantes || 3}${p.formato ? ' · FORMATO: ' + p.formato : ''} · PALABRA CLAVE DM: ${p.palabraClaveDM || 'elegí la más relevante'}

Devolvé SOLO un JSON válido (sin backticks). PRIMERO incluí el objeto "decisiones_auto":
{ "decisiones_auto": { "avatar_id": "avatar1|avatar2", "dolor_id": "qXXX o null", "enemigo_id": "id del enemigo (principal|invisible|contratistas|wholesalers|bancos|cursosIngles|compradorEmocional|algunDia|acumuladores|lamboAlquilado|coachWhatsapp|9a5)", "tactica_id": número, "fase": "siembra|cosecha", "razon": "1 frase de por qué" },
  ... }
Y el array "variantes" con ESTA forma:
${STYLES[estilo] ? STYLES[estilo].schema() : `{ "variantes": [ { ${CAMPOS_BASE}${tipoExtra(tipo)},
    "validador": { "usa_palabras_marca": [], "evita_palabras_prohibidas": true, "tiene_frase_recurrente": true, "cta_pide_dm": true } } ] }`}`;

    const contexto = {
      eslogan: id.esloganPrincipal, framework: id.framework, tagline: id.tagline, arquetipo: arq.nombre,
      enemigo: null, enemigoTipo: 'auto', tactica: null, avatar: null, dolor: null, fase: null,
      prohibidasCount: arq.palabrasProhibidas.length, marcaCount: arq.palabrasDeMarca.length, validador: true, libre: true,
      rag: ragMeta(p.ragExamples),
      estilo: estilo !== 'default' ? estilo : null,
    };
    return { system, userPrompt, contexto, tipo, estilo };
  }

  window.ContextBuilder = { build, buildLibre, getCurrentFase, autoSelectEnemigo, resolveEstilo, detectarEstiloCarrusel, detectarEstiloReel, DOLOR_A_ENEMIGO };
})();
