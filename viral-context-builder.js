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

  const STYLES = {
    ramiro_style: { tipo: 'carrusel', system: RAMIRO_SYSTEM, schema: ramiroSchema },
  };

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

  window.ContextBuilder = { build, buildLibre, getCurrentFase, autoSelectEnemigo, resolveEstilo, DOLOR_A_ENEMIGO };
})();
