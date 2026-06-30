# 🎯 ARQUITECTURA FINAL — Viral Studio v3

> **PIVOTE FUNDAMENTAL.**
> La app NO es 15 tabs de teoría + 4 generadores genéricos.
> La app ES un STUDIO de producción de contenido potenciado donde TODA la estrategia se inyecta automáticamente en cada generación.
>
> **Norte:** la app más potente de creatividad y generación de contenido para real estate latino en USA.

**Fecha:** 29 Jun 2026
**Reemplaza:** PLAN-REESTRUCTURACION (v1) + PROMPT-CLAUDE-CODE-V2

---

# 🧠 EL CAMBIO DE PARADIGMA

## ❌ Lo que ESTÁBAMOS construyendo (mal)

```
15 tabs lineales:
- 13 tabs de teoría (Manifiesto, Identidad, Visual, Psicología, Mis Redes,
  Sistema F&F, Avatares, Re-Launch, Calendario, Estrategia)
- 4 generadores genéricos sin contexto (Reels, Carruseles, Historias, YouTube)
- 1 Biblioteca

PROBLEMA: la teoría es decorativa. Los generadores producen contenido genérico
que no usa el manifiesto, el framework, los enemigos, las frases ni las palabras
de marca. App linda pero hueca.
```

## ✅ Lo que VAMOS a construir (correcto)

```
7 tabs principales, todas con VALOR EJECUTABLE:

1. 🎯 STUDIO (la estrella — donde se produce contenido potenciado)
2. 🛠️ HERRAMIENTAS (calculadoras del Sistema Flip Anti-Riesgos™)
3. 🔄 TRANSFORMADOR (input ajeno → tu marca)
4. 📚 BIBLIOTECA (piezas listas + estado pendiente/producida/publicada)
5. 🔥 TENDENCIAS (TikTok Creative Center + 10 apps externas)
6. 📅 CALENDARIO (plan 30 días + tracking + ritmo siembra/cosecha)
7. ⚙️ MARCA (engine — toda la teoría como acordeón colapsable)

PRINCIPIO: la teoría es ENGINE INTERNO. La producción es FRONTEND PRINCIPAL.
Cada generación lleva TODO el contexto inyectado automáticamente.
```

---

# 🎯 LA TAB ESTRELLA: STUDIO

Cuando abrís la app, lo PRIMERO que ves es STUDIO. Es la pantalla de producción.

## Layout (mobile-first, también desktop)

```
┌─────────────────────────────────────────────┐
│  HEADER                                      │
│  FLIPPEÁ CON MÉTODO  · Sistema Flip A-R™    │
│  [⚙️ Marca] [📚 Biblioteca] [🔥 Tendencias] │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  ¿QUÉ CREÁS HOY?                             │
│                                              │
│  [🎬 Reel] [🖼️ Carrusel] [📲 Stories]       │
│  [▶️ YouTube] [💬 Manifiesto] [📝 Post]      │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  CONFIGURACIÓN INTELIGENTE                   │
│  (todo se llena por defecto pero podés      │
│  ajustar)                                    │
│                                              │
│  📌 PARA QUIÉN:                              │
│    ⦿ Avatar 2 - Empleado Empezando (default)│
│    ○ Avatar 1 - Flipper Escalando            │
│                                              │
│  🎯 DOLOR DEL AVATAR:                        │
│    [Dropdown 29 dolores] · [🎲 Random]       │
│                                              │
│  👹 ENEMIGO A ATACAR:                        │
│    ⦿ Auto (recomendado según dolor)          │
│    ○ Manual: [Los Gurúes, Contratistas...] ▼ │
│                                              │
│  🧠 TÁCTICA PSICOLÓGICA:                     │
│    ⦿ Auto (recomendado según objetivo)       │
│    ○ Manual: [Hormozi framework, etc.] ▼     │
│                                              │
│  📅 FASE DEL MES:                            │
│    ⦿ Auto (siembra/cosecha según calendario) │
│    ○ Forzar: [Siembra / Cosecha]            │
│                                              │
│  ✍️ TEMA O ÁNGULO (opcional):               │
│    [text input grande]                       │
│                                              │
│  ⚙️ CONFIGURACIÓN AVANZADA ▼ (colapsado)    │
│    - Formato del reel                        │
│    - Variantes                               │
│    - CTA palabra clave                       │
│    - Modelo de IA                            │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│                                              │
│         ⚡ GENERAR CONTENIDO POTENCIADO       │
│                                              │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  CONTEXTO INYECTADO (auditable, transparente)│
│  ───────────────────────────────────────────│
│  ✓ Eslogan: "Flippeá con método"             │
│  ✓ Framework: Sistema Flip Anti-Riesgos™    │
│  ✓ Tagline: 4 empresas operando             │
│  ✓ Arquetipo: Operador con Método           │
│  ✓ Enemigo seleccionado: Los Contratistas   │
│  ✓ Táctica: Hormozi framework               │
│  ✓ Avatar: Empleado Empezando               │
│  ✓ Palabras prohibidas: 10 bloqueadas       │
│  ✓ Palabras de marca: 10 priorizadas        │
│  ✓ Validador post-output activo             │
│                                              │
│  [ver prompt completo enviado al API]        │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  RESULTADO                                   │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐        │
│  │ Reel V1 │ │ Reel V2 │ │ Reel V3 │        │
│  │ ━━━━━━━ │ │ ━━━━━━━ │ │ ━━━━━━━ │        │
│  │ Hook... │ │ Hook... │ │ Hook... │        │
│  │         │ │         │ │         │        │
│  │ [📋][💾]│ │ [📋][💾]│ │ [📋][💾]│        │
│  └─────────┘ └─────────┘ └─────────┘        │
│                                              │
│  [📚 Guardar en biblioteca]                  │
│  [🔄 Regenerar con cambios]                  │
│  [📥 Exportar a PDF/Notion]                  │
└─────────────────────────────────────────────┘
```

---

# 🧬 EL CORAZÓN: CONTEXT INJECTION AUTOMÁTICO

Cada vez que el usuario hace click en "GENERAR", la app construye un prompt al API de Claude con TODO el contexto del JSON master inyectado.

## El prompt completo que se envía al API:

```
═══════════════════════════════════════════════════
SYSTEM PROMPT (siempre el mismo, base de toda generación)
═══════════════════════════════════════════════════

Sos un asistente de creatividad y marketing para Nicolás Lara, operador de
Fix & Flip con +20 propiedades y 4 empresas inmobiliarias operando.

Tu único trabajo: generar contenido que suene exactamente como él, ataque a
sus enemigos, use sus palabras y su framework. Cero contenido genérico.

═══════════════════════════════════════════════════
CONTEXTO DE MARCA (obligatorio respetar siempre)
═══════════════════════════════════════════════════

🎯 ESLOGAN PRINCIPAL: "Flippeá con método"
🎯 FRAMEWORK: Sistema Flip Anti-Riesgos™ (mencionar cuando encaje)
🎯 TAGLINE: "4 empresas operando · +200 alumnos · 1 sistema"
🎯 FRASE MAESTRA: "Los gurúes te venden teoría. Yo te doy el sistema."

🧠 ARQUETIPO: Operador con Método (Constructor + Sabio + Educador concreto)
🧠 TONO: directo, español rioplatense, sin floritura, sin teoría suelta
🧠 ESTILO: técnico-accesible (que lo entienda mi tía pero sea profundo)

🏠 FOCO: 95% Fix & Flip. Las otras 3 empresas (Rental Profits, Empresa
Remodelación, Mentoría) SOLO se mencionan como CREDIBILIDAD/autoridad,
NUNCA como producto.

═══════════════════════════════════════════════════
PARÁMETROS DE ESTA PIEZA (vienen del UI)
═══════════════════════════════════════════════════

📌 AVATAR DESTINO: {avatar_seleccionado}
   - Si Avatar 1 (Flipper Escalando): tono más técnico, foco eficiencia/sistemas
   - Si Avatar 2 (Empleado Empezando): tono más cercano, foco seguridad/primer flip

🎯 DOLOR DEL AVATAR: {dolor_seleccionado_del_banco}
   - Detalle: {descripcion_del_dolor}
   - Categoría: {categoria_del_dolor}

👹 ENEMIGO A ATACAR: {enemigo_seleccionado}
   - Frase asociada: {frase_anti_enemigo}
   - Tu solución: {tu_solucion}
   - IMPORTANTE: atacar al ARQUETIPO, NUNCA a personas con nombre y apellido

🧠 TÁCTICA PSICOLÓGICA: {tactica_seleccionada}
   - Maestro: {maestro}
   - Técnica: {tecnica}
   - Cómo aplicarla: {tu_accion}

📅 FASE DEL MES: {fase}
   - Si Siembra (días 1-20): valor masivo, hand-raisers, NO vender de frente
   - Si Cosecha (días 21-27): vender desde stories con urgencia real

═══════════════════════════════════════════════════
PALABRAS PROHIBIDAS (NUNCA usar — el output se rechaza si aparecen)
═══════════════════════════════════════════════════

❌ hack, secret, secreto, easy money, plata fácil, mindset, manifestá, atraé,
   vida soñada, "te enseño en 30 días", pasivo (sin matices), sin trabajar,
   Imperio, hazte millonario, rich

═══════════════════════════════════════════════════
PALABRAS DE MARCA (usar al menos 3 en cada pieza)
═══════════════════════════════════════════════════

✅ flippear, flip, método, sistema, Anti-Riesgos, métricas, operar, operador,
   construir, validar, patrimonio, reducir riesgo, primer flip, documentar,
   decisión, Buy Box, MAO, ARV, hard money

═══════════════════════════════════════════════════
FRASES RECURRENTES (usar al menos 1 cada pieza)
═══════════════════════════════════════════════════

BANDERA:
- "Flippeá con método."
- "Sistema Flip Anti-Riesgos™."
- "Los gurúes te venden teoría. Yo te doy el sistema."
- "Tu primer flip, sin perder capital."
- "Sin gurúes. Con sistema."

PUENTE (en el body):
- "Lo que nadie te cuenta es..."
- "Antes de comprar, validá. Antes de remodelar, calculá. Antes de vender, ajustá."
- "Esto lo aprendí cagado a palos. Vos no tenés por qué."
- "Si lo podés medir, lo podés escalar."

CIERRE:
- "Tu próximo flip empieza por el método."
- "Comentá [PALABRA] y te paso el plan."
- "Operadores construyen. Especuladores improvisan."

═══════════════════════════════════════════════════
REGLAS DE CTA (CRÍTICO)
═══════════════════════════════════════════════════

✅ SIEMPRE: pedir palabra clave por DM (ej: "Comentá MÉTODO y te paso X")
❌ NUNCA: "link en bio" (fricción mata conversión)
❌ NUNCA: "DM open" / "escribime al privado" (vago)
✅ El CTA debe ser ESPECÍFICO sobre qué recibe la persona al comentar

═══════════════════════════════════════════════════
REGLAS DE EJECUTABILIDAD (post-auditoría Proyecto Génesis)
═══════════════════════════════════════════════════

❌ NO prometer "multiplicar capital" — promesa amplia, no creíble
✅ SÍ promesa aterrizada: "tu primer flip sin perder capital"
✅ SÍ números específicos: "$73K en 1 casa", "8 meses", "+200 alumnos"
✅ Caso real con persona común si encaja (Sergio Uber, Felipe Valet Parking)
✅ Toda info debe terminar en ACCIÓN aplicable hoy (template, calculadora, paso)

═══════════════════════════════════════════════════
FÓRMULA DE LA PIEZA (según tipo)
═══════════════════════════════════════════════════

[Si REEL]:
Hook (0-3 seg) → Chisme (3-8 seg) → Valor oculto (8-25 seg) → CTA (25-35 seg)

[Si CARRUSEL]:
Cover impactante → 5-9 slides body → Slide CTA con palabra DM

[Si HISTORIA H.I.L.O.]:
Hook → Identificación → Lleva (A→B con interacción) → Oferta + CTA respuesta

[Si YOUTUBE]:
Hook 30s → Authority 30s → Promise 30s → Body 10-50min → Cierre + CTA

═══════════════════════════════════════════════════
TAREA
═══════════════════════════════════════════════════

Generá {n_variantes} variantes de {tipo_pieza}.

TEMA/ÁNGULO LIBRE (opcional): {tema_input_usuario}
FORMATO: {formato_seleccionado}
PALABRA CLAVE DM: {palabra_clave}

DEVOLVÉ EN JSON con esta estructura:
{
  "variante_1": {
    "thumbnail_text": "...",
    "hook": "...",
    "chisme": "...",
    "valor_oculto": "...",
    "cta": "...",
    "caption_corta": "...",
    "caption_larga": "...",
    "palabra_clave_dm": "...",
    "mecanica_aplicada": "...",
    "validador": {
      "usa_palabras_marca": [...],
      "evita_palabras_prohibidas": true/false,
      "tiene_frase_recurrente": true/false,
      "cta_pide_dm": true/false
    }
  },
  "variante_2": {...},
  "variante_3": {...}
}
```

## Esto significa que el LLM va a generar contenido que:

1. ✅ Suena a vos (no a ChatGPT genérico)
2. ✅ Ataca a tus enemigos (sin nombrar personas)
3. ✅ Usa tu framework como branded asset
4. ✅ Inyecta tus frases recurrentes
5. ✅ Bloquea palabras prohibidas
6. ✅ Prioriza palabras de marca
7. ✅ Sigue tus reglas de CTA (palabra DM, no link)
8. ✅ Adapta el tono según avatar
9. ✅ Aplica la táctica psicológica correcta
10. ✅ Respeta foco F&F 95%

---

# 🛠️ TAB HERRAMIENTAS (Sistema Flip Anti-Riesgos™)

Las 5 fases con calculadoras REALES (no PDFs muertos).

## Fase 1 — Preparación
- 🧮 **Setup financiero 30 días** (checklist 20 items con checkboxes auto-save)
- 🧮 **Calculadora capital disponible** (inputs: ingreso, gastos, ahorros → output: cuánto invertir sin perder liquidez)
- 📄 **Templates LLC** (descarga ZIP con docs pre-llenados)
- 📞 **Lenders para latinos** (5 contactos con form de presentación)

## Fase 2 — Adquisición
- 🧙 **Buy Box Builder** (wizard 10 pasos → genera tu Buy Box JSON descargable)
- 🧮 **Calculadora 4 Números** (MAO + Rehab + ARV + Margen → output: COMPRÁS / NO COMPRÁS + explicación)
- ✅ **Inspección 30 segundos** (checklist visual con fotos de ejemplo)
- 💬 **Scripts negociación** (7 movimientos con texto copy-paste)

## Fase 3 — Ejecución
- 📊 **Matriz selección GC** (12 preguntas con scoring + 5 docs a pedir)
- 📄 **Contrato GC blindado** (PDF descargable con tu nombre + cláusulas)
- 🧮 **Presupuesto Rehab +20%** (calculadora con buffer automático)
- ✅ **Visita semanal obra** (checklist 15 puntos con fotos de ejemplo)

## Fase 4 — Salida
- 🧮 **Vender vs Hold** (calculadora ROI comparativa)
- 📋 **Listing optimizado** (12 elementos con ejemplos)
- ✅ **Closing sin sorpresas** (checklist 20 puntos pre-closing)

## Fase 5 — Escala
- 📅 **Plan 12 meses: 4 flips** (calendario interactivo)
- 📋 **Cuándo armar equipo** (decisión tree)
- 🧮 **ROI portafolio 5 años** (simulador)

---

# 🔄 TAB TRANSFORMADOR

```
┌─────────────────────────────────────────────┐
│  TRANSFORMADOR DE CONTENIDO                  │
│  Convertí cualquier viral en tu marca       │
│                                              │
│  INPUT:                                      │
│  ⦿ [📋 Pegar copy de texto]                 │
│  ○ [🖼️ Subir imágenes (carrusel/foto)]     │
│  ○ [🔗 Pegar URL TikTok/IG/YT]              │
│                                              │
│  CONFIG (mismo selector que Studio):         │
│  - Avatar destino                            │
│  - Inyectar framework Sistema Flip A-R™     │
│  - Palabra clave DM                          │
│                                              │
│  ⚡ TRANSFORMAR                              │
│                                              │
│  OUTPUT:                                     │
│  [Resultado adaptado a tu marca con          │
│   todo el contexto inyectado]                │
│                                              │
│  [📋 Copiar] [💾 Guardar] [🔄 Regenerar]     │
└─────────────────────────────────────────────┘
```

---

# 📚 TAB BIBLIOTECA

- **Las 45 piezas pre-armadas** (15 reels + 10 carruseles + 5 series H.I.L.O. + 5 videos + 10 TikToks)
- **Cada pieza con estado:** pendiente / producida / publicada (localStorage)
- **Filtros:** por pilar, por enemigo, por avatar, por estado
- **Búsqueda** por keyword
- **Click en pieza** → abre detalle con guión + thumbnail + mecánica
- **Botón "Llevar a Studio"** → carga la pieza en el editor para personalizarla

---

# 🔥 TAB TENDENCIAS

```
┌─────────────────────────────────────────────┐
│  TENDENCIAS EN VIVO                          │
│                                              │
│  🎵 TRENDING SOUNDS TIKTOK (USA/MX/CO/ES)    │
│  [iframe TikTok Creative Center]             │
│                                              │
│  📈 HASHTAGS HOT POR NICHO                   │
│  [scraping de Apify o link a Hashtagsforlikes]│
│                                              │
│  🎬 FORMATOS VIRALES DEL MOMENTO             │
│  [lista de 5-10 formatos recientes]          │
│                                              │
│  ─────────────────────────────────────────  │
│                                              │
│  📚 LAS 10 APPS RECOMENDADAS                 │
│  (cards con URL + costo + cómo usar)         │
│                                              │
│  - TikTok Creative Center (gratis oficial)   │
│  - Tokboard (free + $29)                     │
│  - Pentos ($50)                              │
│  - Meta Business Suite (gratis)              │
│  - Predis.ai (free + $32)                    │
│  - Trendpop ($99)                            │
│  - Apify TikTok Scraper ($30-50)             │
│  - VidIQ (free + $7.50)                      │
│  - Hashtagsforlikes ($13)                    │
│  - Trendpop Sounds (incluido)                │
│                                              │
│  GUÍA DE USO SEMANAL ▼                       │
│  PRESUPUESTO SUGERIDO ▼                      │
└─────────────────────────────────────────────┘
```

---

# 📅 TAB CALENDARIO

- **Plan fijo 30 días de re-launch** (ya pre-cargado con piezas específicas)
- **Generador adicional** para semanas custom (input: días, posts/día, fase, foco)
- **Tracking diario:** ¿publicaste hoy? checkbox con timestamp
- **Indicador automático fase del mes:** siembra (1-20) / cosecha (21-27)
- **Lista hoy:** las 3-5 piezas a publicar (con link directo a Studio o Biblioteca)

---

# ⚙️ TAB MARCA (engine + consulta)

**Esta es la tab "decorativa" para consultar cuando hace falta — pero también es el ENGINE que alimenta TODO.**

Acordeón colapsable con 7 secciones (todas las "tabs" anteriores condensadas):

```
⚙️ MARCA

▼ QUIÉN SOY
  - Manifiesto completo
  - Arquetipo: Operador con Método
  - Las 4 empresas (subcomunicación)
  - Tu narrativa oficial

▼ CÓMO HABLO
  - 15 frases recurrentes
  - 10 palabras prohibidas
  - 10 palabras de marca
  - Tono por canal

▼ CÓMO ME VEO
  - Símbolo hexagonal
  - Paleta cromática
  - Tipografía
  - 6 escenarios de vestuario
  - Gestos y postura

▼ QUIÉN ME ATACA
  - Los Gurúes (enemigo visible)
  - La Teoría Vacía (enemigo invisible)
  - 10 enemigos tácticos con frases

▼ CÓMO PERSUADO
  - 7 leyes universales
  - 32 tácticas históricas aplicadas
  - 18 casos en profundidad (Bernays, Goebbels, Marlboro, Apple, MrBeast, etc.)

▼ MIS AVATARES
  - Avatar 1: Flipper Escalando
  - Avatar 2: Empleado Empezando
  - Lead magnets de cada uno

▼ MIS REDES (estado real)
  - IG: 47,356 / TT: 640 / YT: 5,040
  - Bios actuales vs nuevas
  - Decisión handle YouTube
  - 7 acciones inmediatas
```

**Cada sección se puede:**
- Leer (cuando consultás)
- **EDITAR** (cuando refinás la marca)
- **VER USO** (cuando ves cómo se inyecta en cada generación)

---

# 🔧 IMPLEMENTACIÓN TÉCNICA

## Archivos a crear/modificar

```
viral-data/
├── opera-imperio-data-v3.json    (master con todo + estructura para context injection)
└── (jubilar v1 y v2)

js/
├── viral-app.js                   (entry)
├── viral-studio.js                (NEW — la pantalla principal)
├── viral-context-builder.js       (NEW — construye el prompt al API con TODO el contexto)
├── viral-validator.js             (NEW — valida output del API contra palabras prohibidas/marca)
├── viral-tools.js                 (NEW — calculadoras y wizards del Sistema F&F)
├── viral-transformer.js           (NEW — transformador)
├── viral-library.js               (existente, refactor)
├── viral-trends.js                (NEW — tendencias + 10 apps)
├── viral-calendar.js              (existente, refactor)
├── viral-brand.js                 (NEW — engine/consulta de marca)
└── viral-api.js                   (cliente Anthropic con prompt builder)

viral.html                         (rebuilt — 7 tabs, mobile-first)
viral.css                          (NEW — variables CSS, mobile-first)
```

## Funciones críticas en `viral-context-builder.js`

```javascript
function buildContextualPrompt({
  tipoContenido,      // 'reel', 'carrusel', 'historia', 'youtube', 'manifiesto', 'post'
  avatarDestino,      // 'avatar1' o 'avatar2'
  dolor,              // ID del dolor seleccionado
  enemigo,            // ID del enemigo (o 'auto')
  tactica,            // ID de la táctica (o 'auto')
  faseDelMes,         // 'siembra' o 'cosecha' (o 'auto')
  tema,               // texto libre del usuario
  formato,            // formato específico (Manita, Doble, etc.)
  variantes,          // número (1, 3, 5)
  palabraClaveDM      // texto
}) {
  const data = loadOperaData();

  // 1. Resolver auto-selecciones
  const enemigoResuelto = enemigo === 'auto'
    ? autoSelectEnemigoFromDolor(dolor, data)
    : data.arquetipo.enemigos.tacticos.find(e => e.id === enemigo);

  const tacticaResuelta = tactica === 'auto'
    ? autoSelectTacticaFromObjetivo(tipoContenido, data)
    : data.psicologia.tacticasAplicadas.find(t => t.id === tactica);

  const faseResuelta = faseDelMes === 'auto'
    ? getCurrentFase()
    : faseDelMes;

  const avatar = data.avatares[avatarDestino];

  // 2. Construir prompt con TODO el contexto
  return `
    [SYSTEM PROMPT con todas las reglas de marca, palabras, frases, etc.]
    [CONTEXTO ESPECÍFICO de esta pieza con avatar, enemigo, táctica, fase]
    [FÓRMULA según tipoContenido]
    [TAREA con tema, formato, variantes]
    [INSTRUCCIONES de output JSON estructurado]
  `;
}

function autoSelectEnemigoFromDolor(dolorId, data) {
  // Mapeo dolor → enemigo más relevante
  const mapeo = {
    'q001': 'algunDia',          // "Necesito tener todo el capital..." → enemigo procrastinación
    'q010': 'bancos',            // "Banco me pidió 2 años..." → enemigo bancos
    'q012': 'bancos',            // "Sin Social Security..." → enemigo bancos
    'q021': 'compradorEmocional', // "Buy Box..." → enemigo emocional
    'q030': 'wholesalers',       // "Cómo encuentro propiedades..." → wholesalers
    'q040': 'contratistas',      // "GC que no me robe..." → contratistas
    'q070': 'algunDia',          // "Miedo a endeudarme..." → procrastinación
    'q072': 'acumuladores',      // "No tomo acción..." → acumuladores
    // ... etc
  };
  return data.arquetipo.enemigos.tacticos.find(
    e => e.id === (mapeo[dolorId] || 'gurues')
  );
}
```

## Funciones críticas en `viral-validator.js`

```javascript
function validateOutput(textGenerado, data) {
  const errores = [];
  const warnings = [];

  // 1. Verificar palabras prohibidas
  data.arquetipo.palabrasProhibidas.forEach(palabra => {
    if (textGenerado.toLowerCase().includes(palabra.toLowerCase())) {
      errores.push(`Palabra prohibida usada: "${palabra}"`);
    }
  });

  // 2. Verificar al menos 3 palabras de marca
  const palabrasDeMarcaUsadas = data.arquetipo.palabrasDeMarca.filter(p =>
    textGenerado.toLowerCase().includes(p.toLowerCase())
  );
  if (palabrasDeMarcaUsadas.length < 3) {
    warnings.push(`Solo usa ${palabrasDeMarcaUsadas.length} palabras de marca. Mínimo 3.`);
  }

  // 3. Verificar al menos 1 frase recurrente
  const frasesUsadas = [
    ...data.arquetipo.frasesRecurrentes.bandera,
    ...data.arquetipo.frasesRecurrentes.cierre
  ].filter(f => textGenerado.includes(f));
  if (frasesUsadas.length === 0) {
    warnings.push(`No usa ninguna frase recurrente. Mínimo 1.`);
  }

  // 4. Verificar CTA con palabra DM
  const ctaPideDM = /coment[áa].*\b[A-Z]{3,}/i.test(textGenerado);
  if (!ctaPideDM) {
    errores.push(`CTA no pide palabra DM (debe ser "Comentá X" con X en mayúsculas)`);
  }

  // 5. Verificar que NO promete "multiplicar capital"
  if (/multiplicar capital|multiplica tu (dinero|capital)/i.test(textGenerado)) {
    errores.push(`Promesa amplia: NO usar "multiplicar capital". Usar "primer flip sin perder capital".`);
  }

  return { ok: errores.length === 0, errores, warnings, palabrasDeMarcaUsadas };
}

function regenerarSiInvalido(prompt, data, maxIntentos = 3) {
  for (let i = 0; i < maxIntentos; i++) {
    const output = callClaudeAPI(prompt);
    const validacion = validateOutput(output.texto, data);
    if (validacion.ok) {
      return { output, validacion };
    }
    // Si invalido, agregamos al prompt el feedback y reintentamos
    prompt += `\n\nINTENTO ${i+1} FALLÓ. Errores: ${validacion.errores.join(', ')}. Regenerá corrigiendo.`;
  }
  return { output: null, error: 'Max intentos alcanzados' };
}
```

---

# 🎯 RESUMEN: por qué esta arquitectura ES LA APP MÁS POTENTE

## Antes (lo que estábamos construyendo)
- 15 tabs lineales
- Teoría decorativa (no se conecta)
- Generadores genéricos (no usan el contexto)
- App linda pero sin alma

## Ahora (lo que vamos a construir)
- 7 tabs con valor real
- **STUDIO como protagonista** — la pantalla que se usa el 80% del tiempo
- **Toda la teoría inyectada AUTOMÁTICAMENTE** en cada generación
- **Validador post-output** que garantiza coherencia
- **Selectores tácticos** (enemigo, táctica, avatar) para variar contenido
- **Herramientas REALES** del Sistema Flip Anti-Riesgos™
- **Transformador** que convierte cualquier viral en tu marca
- **Tendencias en vivo** desde TikTok Creative Center + 10 apps
- **Biblioteca con state machine** para tracking
- **Calendario con tracking** de ritmo siembra/cosecha
- **Marca como engine + consulta** (todo lo conceptual condensado)

## El resultado
**Cada pieza que generás suena 100% a tu marca, ataca a tus enemigos, usa tu framework, respeta tus reglas, adapta el tono al avatar. Sin que vos toques nada. Auto-contextualizado.**

Eso es la app más potente de creatividad y generación de contenido para real estate latino en USA. Punto.

---

# 🚀 PRÓXIMO PASO

1. Generar `PROMPT-CLAUDE-CODE-V3.md` con instrucciones exactas para el refactor (lo hago ahora)
2. Posiblemente actualizar `opera-imperio-data-v3.json` con el campo `autoSeleccionEnemigos` y otros mapeos

---

_v3.0 — 29 Jun 2026 — Arquitectura FINAL: Producción como centro, teoría como engine_
