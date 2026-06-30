# PATRONES VIRALES — Documento Maestro (Fuente Única de Verdad)

> Generado: 30 jun 2026. Para uso de Claude Code al implementar los 3 estilos en `viral-data/opera-imperio-data-v2.json`, `viral-context-builder.js` y `viral-validator.js`. Material extraído directamente de capturas reales de IG + 25 transcripciones procesadas por TurboScribe.

---

## SECCIÓN 0 — INSTRUCCIÓN PARA CLAUDE CODE

Este archivo es la FUENTE de verdad para implementar 3 estilos de contenido inspirados en creators reales. Por cada estilo encontrarás:

1. Quién es el creator + bio + métricas reales
2. Estructura visual exacta (con descripción de capturas)
3. Patrones de hook (con ejemplos textuales reales)
4. Patrón de CTA / caption
5. Few-shots ya adaptados a Fix & Flip (nicho Nicolás Lara — Rental Profits)

Tu trabajo es implementar los 3 estilos en el sistema. Las definiciones, ejemplos y few-shots aquí presentes son CANÓNICOS — no los inventes, copialos.

---

## ESTILO 1 — RAMIRO STYLE (@ramiro.cubria) — CARRUSEL TÉCNICO

### Identificación del creator

- **Handle**: @ramiro.cubria (verified ✓)
- **Seguidores**: 467 mil
- **Publicaciones**: 3589
- **Bio**: "📌 Te ayudo a vender más solo con contenido / 📌 Mi consultora hace +500K. Tengo 200 clientes entre 10k-500k / 📌 Click acá..."
- **Link**: consultoria.sellyourknowledge.io
- **Nicho**: IA aplicada a content marketing + creator economy
- **Idioma**: Español rioplatense
- **Métricas observadas**: comment/like ratio > 1 (engagement explosivo)

### Estructura visual exacta (6-8 slides)

**SLIDE 1 — PORTADA**
- Foto del autor en círculo pequeño arriba (top-center, ~10% del slide)
- Badge naranja redondeado con texto: "NUEVO" / "ÚLTIMO MOMENTO" / "PASO 1"
- Título grande blanco (50-60pt), máximo 2 líneas, una palabra clave en NARANJA (#FF6B35)
- Subtítulo descriptivo de 1 línea
- Visual wow: screenshot real / foto manipulada / dashboard
- Fondo: oscuro #0A0A0A con grilla sutil

**SLIDES 2 a N-1 — PASOS NUMERADOS**
- Foto del autor pequeña arriba (igual que portada)
- Badge naranja: "PASO 1", "PASO 2", "PASO 3"
- Título grande blanco del paso (verbo accionable: "Armá", "Subí", "Decile")
- Screenshot REAL de la herramienta usada (Claude, n8n, Notion — no genérico)
- Instrucción directa abajo en texto: "Pegale este prompt." / "Subí estos documentos." / "Creá un proyecto nuevo. Ponele de nombre 'Mentor Hormozi'"

**SLIDE PENÚLTIMO — RESULTADO**
- Foto del autor pequeña arriba
- Badge naranja: "RESULTADO"
- Título grande: "Te [verbo transformación] todo el negocio"
- Video o screenshot del producto en acción
- 4-5 bullets concretos con punto naranja al inicio:
  - "Identifica todos tus cuellos de botella."
  - "Te comparte recursos, frameworks y SOP's para escalar."
  - "Te comparte guiones de mensajes, ventas, y manejo de clientes."
  - "Te da respuestas completas de páginas."
  - "Te da accionables concretos para tu caso puntual."

**SLIDE FINAL — CTA**
- Fondo distinto (estético, cálido, con producto en escena — no oscuro como los anteriores)
- Visual del lead magnet (documentos saliendo de fondo cálido, dashboard, etc.)
- Botón GRANDE con borde naranja (sin fondo): COMENTÁ "[PALABRA]"
- Subtexto centrado: "para recibir [lead magnet específico]"
- Ejemplo real: COMENTÁ "6" / "para recibir los 6 documentos para armar el proyecto de Claude."

### Patrones de Hook (los 7 tipos validados)

1. **NÚMERO específico**
   - Ejemplo real: "Reemplacé a mi equipo de contenido de $3.000 al mes con esta automatización de IA. ¿Cómo funciona? Te explico →"

2. **CLONAR figura conocida**
   - Ejemplo real: "Cómo CLONAR a Hormozi adentro de Claude — Con toda la información gratuita que hay de él en internet."

3. **NECESITÁS X**
   - Ejemplo real: "Necesitás un Tablero de Contenido — Acá tenés todo lo que te hace falta para armar el tuyo."

4. **CÓMO + verbo brutal**
   - Ejemplo real: "Cómo convertirte en un genio de instagram"

5. **DECLARACIÓN ROTUNDA**
   - Ejemplo real: "Los traffickers están muertos. Claude se conecta con WhatsApp para correr todos tus anuncios."

6. **REEMPLACÉ X con Y**
   - Ejemplo real: "Armé un equipo de contenido de $28.967/mes por $200/mes con Claude Code"

7. **ÚLTIMO MOMENTO / BREAKING**
   - Ejemplo real: Badge rojo "ÚLTIMO MOMENTO" + "Los traffickers están muertos."

### Patrón de Caption + CTA

**Caption EXACTO (formato constante):**
```
Comentá [PALABRA] ⬇️
```

Donde [PALABRA] es:
- Un número: "6" (relacionado a # de slides + # de documentos del lead magnet)
- Una palabra simple en MAYÚSCULAS: "IA", "YO", "EQUIPO", "GUÍA", "CLAUDE", "MÉTODO"
- Conexión semántica con el lead magnet ofrecido

**Mecánica de engagement:**
- Bajo esfuerzo (1 palabra)
- Comentario dispara workflow automático de DM
- Filtra leads interesados
- Genera explosión de comments → algoritmo IG boost

### Diseño visual — paleta + tipografía

```
fondo_principal: #0A0A0A (negro casi puro)
acento_naranja: #FF6B35
texto_titulo: #FFFFFF (50-60pt, sans-serif bold)
texto_subtitulo: #FFFFFF (18-22pt, sans-serif regular)
texto_body: #CCCCCC (16-18pt)
grilla_fondo: #1A1A1A (sutil, 5% opacidad)
border_badge: #FF6B35 (1.5px)
```

### Few-shots para Fix & Flip (LISTOS para inyectar)

**EJEMPLO 1 — Patrón "REEMPLACÉ"**
```json
{
  "estilo": "ramiro_style",
  "caption": "Comentá CONTRATO ⬇️",
  "slides": [
    {
      "n": 1,
      "tipo": "portada",
      "badge": "NUEVO",
      "titulo": "Reemplacé a mi contractor de $40.000 con un sistema de $0",
      "palabra_naranja": "$0",
      "subtitulo": "Y mi último flip cerró 2 semanas antes."
    },
    {
      "n": 2,
      "tipo": "paso",
      "badge": "PASO 1",
      "titulo": "Calculá el MAO real",
      "screenshot": "Calculadora 4 Números — interfaz",
      "instruccion": "Ingresá ARV, rehab, holding y margen objetivo. La fórmula es: ARV × 0.70 − rehab − $30K = MAO."
    },
    {
      "n": 3,
      "tipo": "paso",
      "badge": "PASO 2",
      "titulo": "Vetea al GC con esta matriz",
      "screenshot": "Matriz GC — 12 preguntas con scoring",
      "instruccion": "Si saca <40 puntos, no firmes. Si saca 40-70, firmá pero exigí milestones. Si saca >70, dale todo el proyecto."
    },
    {
      "n": 4,
      "tipo": "paso",
      "badge": "PASO 3",
      "titulo": "Pegale este contrato blindado",
      "screenshot": "Template Word — Contrato GC blindado",
      "instruccion": "Cláusulas de milestones de pago, anti-abandono, penalty por retraso, y reemplazo de subcontratistas sin consulta."
    },
    {
      "n": 5,
      "tipo": "resultado",
      "badge": "RESULTADO",
      "titulo": "Te da vuelta tus flips",
      "bullets": [
        "Detectás GCs estafadores antes de firmar",
        "Pagás en milestones y no en avance",
        "Tenés cláusulas anti-abandono",
        "Ahorrás $20-40K por flip",
        "Cerrás 2-4 semanas antes"
      ]
    },
    {
      "n": 6,
      "tipo": "cta",
      "boton": "COMENTÁ \"CONTRATO\"",
      "subtitulo": "para recibir la plantilla de contrato blindado para GCs."
    }
  ]
}
```

**EJEMPLO 2 — Patrón "NECESITÁS"**
```json
{
  "estilo": "ramiro_style",
  "caption": "Comentá CALC ⬇️",
  "slides": [
    {
      "n": 1,
      "tipo": "portada",
      "badge": "SISTEMA FLIP",
      "titulo": "Necesitás una Calculadora 4 Números",
      "palabra_naranja": "Calculadora 4 Números",
      "subtitulo": "Acá tenés todo lo que te hace falta para nunca más comprar un flip malo."
    },
    {"n": 2, "tipo": "paso", "badge": "PASO 1", "titulo": "Buscá el ARV real con 3 comps", "screenshot": "Redfin/Zillow comps"},
    {"n": 3, "tipo": "paso", "badge": "PASO 2", "titulo": "Hacé el rehab walkthrough", "screenshot": "Spreadsheet partidas"},
    {"n": 4, "tipo": "paso", "badge": "PASO 3", "titulo": "Calculá holding + closing", "screenshot": "Holding cost calculator"},
    {"n": 5, "tipo": "resultado", "badge": "RESULTADO", "titulo": "Sabés si comprar o no", "bullets": ["Verde: comprás", "Amarillo: negociás", "Rojo: alejate"]},
    {"n": 6, "tipo": "cta", "boton": "COMENTÁ \"CALC\"", "subtitulo": "para recibir la calculadora Excel + video de uso."}
  ]
}
```

**EJEMPLO 3 — Patrón "ÚLTIMO MOMENTO"**
```json
{
  "estilo": "ramiro_style",
  "caption": "Comentá ITIN ⬇️",
  "slides": [
    {
      "n": 1,
      "tipo": "portada",
      "badge": "ÚLTIMO MOMENTO",
      "titulo": "Los gurúes te mintieron. No necesitás social security para comprar tu primer flip.",
      "palabra_naranja": "No necesitás",
      "subtitulo": "Con ITIN podés financiarte hasta $500K. Te muestro cómo."
    }
  ]
}
```

---

## ESTILO 2 — ALEJANDRA STYLE (@alrinconoficial) — CARRUSEL CONFESIONAL

### Identificación del creator

- **Handle**: @alrinconoficial (verified ✓)
- **Nombre**: Alejandra Rincon
- **Seguidores**: 349 mil
- **Publicaciones**: 942
- **Bio**: "Te enseño a convertir tu contenido en autoridad y ventas 🎬 CEO de LA PRIMERA CLÍNICA DE CONTENIDO DEL MUNDO 🔥+600..."
- **Link**: alejandrarincon.net/video
- **Nicho**: Video marketing + contenido + ventas
- **Story highlights**: FORMACIÓN, Alumnos, Acompañamiento, Trabajemos, Youtube, Encuentros, Producciones
- **Vibe**: Mujer empresaria, autoridad por experiencia personal, coaching/consultoría

### Estructura visual exacta (6-10 slides)

**SLIDE 1 — PORTADA CONFESIONAL**
- **Foto del autor GRANDE central** (no chiquita arriba — DOMINA el slide, 60-80%)
- Headline arriba en CAJA NEGRA: declaración emocional en MAYÚSCULAS
- Palabras clave en AMARILLO (#FFE600) y/o ROJO (#FF1100)
- Headline abajo en CAJA NEGRA: continuación de la idea
- Sandwich visual: foto del autor en el medio, texto arriba y abajo
- Fondo: foto real (paisaje, lugar) — NO fondo dark grilla como Ramiro

**SLIDES 2-3 — ANTES / PROBLEMA**
- Más fotos emocionales del autor (en escena, en momento difícil)
- Texto personal: "Yo era de los que..." / "Estaba estancada..." / "Sentía que..."
- Vulnerabilidad real, no falsa
- Primera persona

**SLIDE MEDIO — QUIEBRE / REVELACIÓN**
- "Hasta que entendí que..."
- Frase clave subrayada o resaltada
- Cambio visual: la foto del autor cambia de emocional a empoderada

**SLIDES PENÚLTIMOS — APRENDIZAJE**
- 3-5 lecciones específicas
- Bullets con emoji al inicio (🔥, ✅, 💡)
- Cada lección es accionable

**SLIDE FINAL — CTA CONVERSACIONAL**
- Pregunta directa al lector ("¿Estás listo para…?")
- Opcional: "Comentá X" (más suave que en Ramiro-style)
- Tono: invitación, no orden

### Patrones de Hook (los 5 tipos validados)

1. **DECLARACIÓN ENOJADA**
   - Ejemplo real: "ODIO VER QUE INVIERTEN PLATA EN PAUTA Y AGENCIAS DE MARKETING 😠"
   - + caption bottom: "PERO NO VENDEN NADA..."

2. **STORYTELLING PERSONAL CON NÚMERO**
   - Ejemplo real: "ESTA ERA YO EN 2024 FACTURANDO $10.000 USD AL MES..."
   - + caption bottom: "SINTIÉNDOME ESTANCADA."

3. **CONTROVERSIA ANTI-AUTORIDAD**
   - Ejemplo real: "META Y GOOGLE VIVEN DE QUE USTEDES PAUTEN MAL"

4. **URGENCIA EDUCATIVA**
   - Ejemplo real: "EL ALGORITMO CAMBIÓ HACE 6 MESES Y MUCHOS NO HAN ENTENDIDO POR QUÉ SUS CONTENIDOS MEGA PRODUCIDOS YA NO FUNCIONAN..."

5. **IRONIA DOLOROSA** (deducido del patrón)
   - "PODÉS SEGUIR PAGANDO $400/MES POR CURSOS QUE NO TE DAN RESULTADOS... O LEER ESTO"

### Patrón de Caption (LARGO, narrativo)

```
[Longitud: 200-500 caracteres]
[Estilo: coloquial, primera persona, vulnerable]
[Emoji emocionales: 🥲 🥹 🔥 🎬 💔 😤]
[Estructura: contexto → quiebre → aprendizaje → CTA suave]
```

**Ejemplo real:**
> "Sentirme estancada era mi día a día hasta que decidí trabajar en construir un equipo y fortalecer las áreas mas importantes del negocio. Hoy puedo decir que en definitiva: tomar desiciones difíciles, ser constante y aprender a delegar fue la clave para crecer. 🔥🪜🔻"

**Ejemplo real:**
> "ODIO VER QUE SIGUEN PERDIENDO PLATA EN ADS O EN AGENCIAS QUE SOLO HACEN CONTENIDO GENÉRICO... Y NO VENDEN NADA!"

### Diseño visual — paleta + tipografía

```
fondo_principal: foto real del autor (60-80% del slide)
bg_caja_texto: #000000 (negro sólido)
highlight_amarillo: #FFE600
highlight_rojo: #FF1100
texto_blanco: #FFFFFF (en cajas negras)
tipografia: sans-serif bold condensed (Impact, Bebas Neue, Anton)
size_titulo: muy grande, ALL CAPS
posicion_texto: TOP + BOTTOM (sandwich, NO centro)
```

### Few-shots para Fix & Flip

**EJEMPLO 1 — Patrón "DECLARACIÓN ENOJADA"**
```json
{
  "estilo": "alejandra_style",
  "caption": "Hace 4 años yo era de los que perdían $20K-$40K por flip por confiar en cualquier GC con buena verba 😤 Hasta que entendí que el problema NO era el GC, ERA YO. Yo no tenía un sistema de vetting. Yo no tenía un contrato blindado. Yo no tenía milestones de pago. Hoy mi sistema cierra flips sin sorpresas. Si querés que te mande la matriz de vetting + el contrato exacto que uso, comentá GC. 🔥",
  "slides": [
    {
      "n": 1,
      "tipo": "portada_confesional",
      "headline_top": "ODIO VER FLIPPERS PERDIENDO $40K",
      "highlight_top_color": "rojo",
      "highlight_top_palabras": ["$40K"],
      "foto_autor": "Nicolás con cara seria, fondo de obra inconclusa",
      "headline_bottom": "POR CONFIAR EN GCs SIN VETEAR",
      "highlight_bottom_color": "amarillo",
      "highlight_bottom_palabras": ["SIN VETEAR"]
    },
    {"n": 2, "tipo": "antes", "texto": "Yo era de los que firmaba contratos genéricos sin leer..."},
    {"n": 3, "tipo": "antes", "texto": "Pagaba 50% por adelantado porque 'todos lo hacen'..."},
    {"n": 4, "tipo": "quiebre", "texto": "Hasta que perdí $40K en mi tercer flip y dije BASTA."},
    {"n": 5, "tipo": "aprendizaje", "bullets": [
      "✅ Vetear es 70% del éxito",
      "✅ Pagar en milestones es no negociable",
      "✅ El contrato blindado vale más que cualquier curso"
    ]},
    {"n": 6, "tipo": "cta_conversacional", "texto": "¿Querés mi matriz exacta? Comentá GC abajo."}
  ]
}
```

**EJEMPLO 2 — Patrón "STORYTELLING PERSONAL"**
```json
{
  "estilo": "alejandra_style",
  "caption": "Esta era yo en 2022. Empleado en una financiera ganando $4.500/mes en pesos. Sintiéndome atrapado. Mirando a flippers en YouTube y pensando 'eso no es para mí'. Hoy tengo 4 empresas operando y +200 alumnos. ¿La clave? Dejé de creer en gurúes y empecé a aplicar UN sistema. Si querés conocer el SISTEMA Flip Anti-Riesgos™, mandame DM o seguí leyendo el carrusel. 🔥",
  "slides": [
    {
      "n": 1,
      "tipo": "portada_confesional",
      "headline_top": "ESTA ERA YO EN 2022",
      "highlight_top_palabras": ["2022"],
      "foto_autor": "Nicolás joven con traje, en oficina de banco",
      "headline_bottom": "GANANDO $4.500/MES Y ATRAPADO",
      "highlight_bottom_color": "rojo",
      "highlight_bottom_palabras": ["ATRAPADO"]
    }
  ]
}
```

**EJEMPLO 3 — Patrón "CONTROVERSIA ANTI-AUTORIDAD"**
```json
{
  "estilo": "alejandra_style",
  "caption": "Lo que NO te cuentan los gurúes de Real Estate es que ellos NUNCA hicieron un flip real 🥲 Viven de tu suscripción, de tu evento, de tu curso. NO de las propiedades. Por eso te enseñan TODO menos lo que importa: vetting, contratos, MAO real, salida defensiva. Yo NO vendo cursos. Yo OPERO. Y si querés ver cómo, te abro mi sistema acá abajo 👇",
  "slides": [
    {
      "n": 1,
      "tipo": "portada_confesional",
      "headline_top": "LOS GURÚES VIVEN DE",
      "foto_autor": "Nicolás señalando con cara seria",
      "headline_bottom": "QUE NUNCA HAGAS UN FLIP",
      "highlight_bottom_color": "amarillo",
      "highlight_bottom_palabras": ["NUNCA"]
    }
  ]
}
```

---

## ESTILO 3 — AMERICA STYLE — REEL DIÁLOGO + DESGLOSE + CTA PALABRA

### Identificación del creator

- **Handle deducido**: @americamente (se autodenomina "Américamente" en varios reels)
- **Seguidores**: estimado 200K-500K (no se capturó perfil directo)
- **Nicho**: Construcción de casas en USA para latinos inmigrantes (NO Fix & Flip — DESARROLLO desde cero)
- **Idioma**: Español latam, coloquial
- **Avatar objetivo**: Latino recién llegado a EE.UU., contratista que quiere escalar a desarrollador
- **Lead magnet primario**: "obra" (acceso a curso de construcción)
- **Estudiantes mencionados**: +400

### Estructura narrativa universal (siempre la misma)

```
[HOOK 3-5s] → [DESARROLLO 15-90s] → [CTA palabra 5-10s]
```

Total: 30-90 segundos (reel corto)

### Patrones de Hook (los 6 tipos validados — EJEMPLOS TEXTUALES REALES)

1. **NÚMERO + acción + tiempo**
   - "Gané 60 mil dólares, vendiendo un terreno que me costó solamente 10 mil dólares en 60 días."
   - "Vague de 159.200 dólares para construir esta casa en 90 días."
   - "Así es como hice 113.000 dólares con esta propiedad y sin haber invertido un solo centavo de mi bolsillo."

2. **PREGUNTA directa con tema actual**
   - "¿Cuánto costó construir esta casa?"
   - "¿Sabías que puedes ganar $1.000 dólares solo comprando y vendiendo terreno?"
   - "¿Cuántas casas necesito para ganar un millón de dólares?"

3. **DIÁLOGO escena vecina/sobrino**
   - "Vecina, ¿cuánto le está costando construir su casa? ¿Cero dólares? ¿Cómo que cero dólares?"
   - "Hola, qué buena casa. Oye, ¿cuánto pagas de renta? No, yo no pago renta. ¿Por qué? Yo soy la doña."
   - "¿Qué bien le está quedando a su casa? ¿Cuánto le costó? Cero dólares. ¿Pero cómo que? Cero dólares, ¿por qué se le apagó quién? El gobierno."

4. **PROVOCACIÓN al avatar**
   - "Recién llegué a Estados Unidos, ¿dónde crees que debería buscar trabajo? Si quieres ser pobre quedarte de esclavos, vete como contratista en la obra."
   - "¿Cuál es el peor error que comete un latino cuando llega a Estados Unidos? Trabajar en la construcción."

5. **OPOSICIÓN binaria (visual + verbal)**
   - "Esta es la maleta de un contratista en Estados Unidos. Y esta es la maleta del desarrollador."
   - "Esta es la camioneta del contratista. Esta es la camioneta del desarrollador. El que hace todo el trabajo, es el contratista. Y el desarrollador lleva todo el riesgo, pero no todo el trabajo."

6. **PEOR ERROR**
   - "¿Cuál es el peor error financiero que se comete? Depender de otros económicamente toda la vida."

### Formatos de desarrollo (los 3 detectados)

**FORMATO A — Desglose punto por punto con cifras reales**
- Lista exhaustiva de partidas con precios
- Tono: factual, sin adornos
- Cierra con: "Total construido en X meses, vendido por Y, ganancia Z"
- Ejemplo real (texto extraído):
  > "$425.000 me costó construir esta casa. Aquí está el desglose:
  > Terreno: $15.000
  > Limpiar el terreno: $11.200
  > Planos: $17.100
  > Permisos: $5.400
  > Conexiones de agua, electricidad y gas: $7.000
  > Tanque séptico: $7.000
  > Cimentación de slab: $20.700
  > ... [continúa por 25-30 partidas más]
  > Esta es una casa de 2.755 pies cuadrados que vendí por $767.000."

**FORMATO B — Diálogo de objeciones**
- Pregunta del avatar / objeción
- Respuesta directa del creator
- Ejemplo real:
  > "Pero yo no tengo el dinero para construir → Para eso están los bancos y las financieras.
  > Pero yo no tengo papeles → No importa, igual te prestan.
  > Pero yo no tengo el conocimiento para construir → El tampoco le tenía y ahora está construyendo sus propias casas.
  > ¿Y cuánto dinero ya está generando? → Entre $100 a $150 mil dólares por casa."

**FORMATO C — Comparativa entre opciones**
- Presenta 2 o 3 caminos
- Justifica cuál elige el creator
- Ejemplo real:
  > "Para ganar $1M:
  > Opción 1: vender 35 casas remodeladas
  > Opción 2: construir 6 casas, cada una genera $167K promedio
  > Yo elegí construir."

### Patrón de CTA — EXACTO

**Plantilla universal:**
```
"Si querés [PROMESA ESPECÍFICA], escribí la palabra [PALABRA] en los comentarios y te [LO QUE RECIBÍS]."
```

**Palabras detectadas en el material original (con conteo):**
- "obra" — 8+ veces (la más usada)
- "mapa" — terrenos
- "capital" — financiamiento
- "rensito" / "ranchito" — USDA
- "plan" — Planitron AI
- "cálicas" — guía colores

**Variantes detectadas:**

| Variante | Ejemplo textual real | Cuándo usar |
|---|---|---|
| Simple | "Solo escribe la palabra obra en los comentarios y te enseño como." | Reels educativos |
| Doble condición | "Te voy a dar el link con dos condiciones. La primera que me siga. ¿Y la segunda? Solamente escribo en la palabra ranchito en los comentarios." | Crecimiento follows |
| Pasiva-agresiva | "Oye, ya comenté y aún no me llega nada. Es que si no me sigues, no te llega." | Cierre con humor |
| Con autoridad | "Mira, te voy a ayudar... Te voy a dar el link" + "te he enseñado más de 400 alumnos" | Validar autoridad |

### Anti-patrones (lo que NUNCA hace)

❌ Hooks vagos del tipo: "Hola amigos, hoy quiero contarles..."
❌ CTAs débiles: "Síganme si les gustó"
❌ Cifras sin desglose: "Gané mucho dinero"
❌ Hablar mal del trabajador: es respetuoso, dice "está bien trabajar, pero..."
❌ Promesas sin proof: siempre cifras reales, escenas reales
❌ Lenguaje gurú: "desbloqueá tu potencial", "vibra millonaria"

### Few-shots para Fix & Flip (LISTOS para inyectar)

**EJEMPLO 1 — Patrón "NÚMERO + acción + tiempo"**
```json
{
  "estilo": "america_style",
  "patron": "numero_accion_tiempo",
  "duracion_estimada_seg": 60,
  "hook": "Hice 47 mil dólares en mi último flip, lo cerré en 4 meses sin poner un peso mío.",
  "desarrollo": "Compré la casa por debajo del 70% del ARV en una zona donde los wholesalers ni siquiera miran. Refinancié con un hard money lender que me prestó el 100% de compra y rehab. Mi rehab fue solo cosmética: pintura, pisos, cocina nueva. Vendí 8 días después de listarla porque el comparable del barrio venía subiendo.",
  "cta": "Y si vos también querés aprender a calcular el MAO real sin ilusionarte, escribí MAO en los comentarios y te paso mi calculadora.",
  "cta_palabra": "MAO"
}
```

**EJEMPLO 2 — Patrón "DIÁLOGO escena"**
```json
{
  "estilo": "america_style",
  "patron": "dialogo_escena",
  "duracion_estimada_seg": 70,
  "hook": "Sobrino, ¿cuánto pagaste por tu primer flip? Cero dólares.",
  "desarrollo": "Pero cómo cero dólares. Es que conseguí un hard money que me prestó el 100% de compra y rehab. Pero entonces tenías que tener buen crédito. No, con ITIN, sin social security. Y de dónde sacaste para los closing costs. Me los financió el seller, le pedí seller credit de 6 mil dólares. Sobrino, enséñame.",
  "cta": "Tío, mirá, escribí FLIP en los comentarios y te paso el script exacto que usé.",
  "cta_palabra": "FLIP"
}
```

**EJEMPLO 3 — Patrón "OPOSICIÓN binaria"**
```json
{
  "estilo": "america_style",
  "patron": "oposicion_binaria",
  "duracion_estimada_seg": 75,
  "hook": "Este es el wholesaler. Este es el flipper.",
  "desarrollo": "El wholesaler cobra 5 mil por deal y se queda corriendo sin parar. El flipper cobra entre 30 a 80 mil por deal y trabaja 3 deals al año. El wholesaler vive de volumen. El flipper vive de margen. Pero el flipper necesita dinero. Sí. Y de dónde lo saca. Capital privado, hard money, partners. Pero entonces el wholesaler es más fácil. Más fácil sí, pero más techo te pone.",
  "cta": "Si querés ver mi sistema completo para arrancar como flipper sin capital propio, escribí MÉTODO en los comentarios.",
  "cta_palabra": "MÉTODO"
}
```

**EJEMPLO 4 — Patrón "PEOR ERROR"**
```json
{
  "estilo": "america_style",
  "patron": "peor_error",
  "duracion_estimada_seg": 50,
  "hook": "¿Cuál es el peor error del flipper principiante? Confiar en cualquier GC con buena verba.",
  "desarrollo": "Yo perdí 40 mil dólares en mi tercer flip por eso. Firmé contrato genérico, pagué 50 por adelantado, y el GC desapareció a los 2 meses. Hoy uso una matriz de vetting de 12 preguntas, un contrato blindado con milestones de pago y cláusulas anti-abandono.",
  "cta": "Si querés mi matriz exacta y el contrato, escribí GC en los comentarios.",
  "cta_palabra": "GC"
}
```

**EJEMPLO 5 — Patrón "COMPARATIVA binaria"**
```json
{
  "estilo": "america_style",
  "patron": "comparativa_binaria",
  "duracion_estimada_seg": 65,
  "hook": "Para ganar 200 mil dólares en 12 meses tenés 3 caminos.",
  "desarrollo": "1: hacer 12 wholesales de 17 mil cada uno, trabajando todos los meses sin parar. 2: hacer 4 flips medianos de 50 mil de ganancia, 4 meses cada uno. 3: hacer 1 flip grande de 200 mil de ganancia, 8 meses, capital y nervios de acero. Yo elegí la opción 2 porque me da margen y escala razonable.",
  "cta": "Si querés ver el case study completo de mi último flip de 47 mil, escribí PRIMER en los comentarios.",
  "cta_palabra": "PRIMER"
}
```

**EJEMPLO 6 — Patrón "PROVOCACIÓN al avatar"**
```json
{
  "estilo": "america_style",
  "patron": "provocacion_avatar",
  "duracion_estimada_seg": 55,
  "hook": "Recién llegaste a Estados Unidos. ¿Querés ahorrar 5 años para tu primera propiedad o flippear ya con dinero ajeno?",
  "desarrollo": "La mayoría elige ahorrar y termina en el ciclo de la renta para siempre. Yo elegí flippear con capital privado y hoy tengo 4 empresas operando. Lo único que necesitás es saber 3 cosas: cómo calcular el MAO real, cómo conseguir el dinero sin papeles, y cómo vetear al GC.",
  "cta": "Si querés que te pase los 3 templates, escribí SISTEMA en los comentarios.",
  "cta_palabra": "SISTEMA"
}
```

---

## SECCIÓN 4 — LÓGICA DE AUTO-DETECCIÓN DE ESTILO

### Detector para CARRUSEL (Ramiro vs Alejandra)

```javascript
function detectarEstiloCarrusel(input_idea, dolor, tema) {
  const keywords_ramiro = [
    'sistema', 'tutorial', 'pasos', 'cómo hacer', 'fórmula',
    'método', 'plantilla', 'herramienta', 'calculadora', 'framework',
    'reemplazar', 'automatizar', 'IA', 'tecnología', 'configurar',
    'paso a paso', 'guía técnica', 'buy box', 'matriz', 'contrato'
  ];
  
  const keywords_alejandra = [
    'mi historia', 'me pasó', 'aprendí', 'fracasé', 'estancado',
    'estafado', 'engañado', 'descubrí', 'realidad', 'verdad',
    'mentira', 'gurúes', 'mafia', 'industria', 'antes era',
    'hace X años', 'transformación', 'cambio de vida', 'mindset',
    'odio ver', 'me molesta', 'cansé', 'reflexión',
    'peor flip', 'peor experiencia', 'me arrepiento'
  ];
  
  const texto = (input_idea + ' ' + dolor + ' ' + tema).toLowerCase();
  
  const score_ramiro = keywords_ramiro.filter(k => texto.includes(k)).length;
  const score_alejandra = keywords_alejandra.filter(k => texto.includes(k)).length;
  
  if (score_alejandra > score_ramiro) return 'alejandra_style';
  if (score_ramiro > score_alejandra) return 'ramiro_style';
  return 'ramiro_style'; // default cuando empate
}
```

### Detector para REEL (America vs Default)

```javascript
function detectarEstiloReel(input_idea, dolor, tema) {
  const keywords_america = [
    'cuánto cuesta', 'cuánto gané', 'sobrino', 'vecino', 'vecina',
    'desglose', 'partida', 'capital', 'sin papeles',
    'sin dinero', 'sin un peso', 'opcion 1', 'opcion 2',
    'maleta', 'maleta del', 'contratista vs', 'wholesaler vs',
    'peor error', 'que nunca hace', 'dialogo',
    'flip de', 'gané', 'hice', 'recién llegado',
    'latino', 'inmigrante', 'sin social', 'itin'
  ];
  
  const texto = (input_idea + ' ' + dolor + ' ' + tema).toLowerCase();
  const score = keywords_america.filter(k => texto.includes(k)).length;
  
  if (score >= 2) return 'america_style';
  return 'default';
}
```

---

## SECCIÓN 5 — REGLAS DE VALIDADOR

### Validador para CARRUSEL ramiro_style

- Slides ≥ 6 y ≤ 8
- Slide 1: debe tener badge + título + palabra naranja marcada
- Slides 2 a N-1: deben tener "PASO N" + título + screenshot referenciado
- Slide penúltimo: debe ser RESULTADO con 4-5 bullets
- Slide final: debe tener "COMENTÁ" + palabra en MAYÚSCULAS
- Caption debe matchear regex: `/^Comentá [A-ZÁÉÍÓÚÑ0-9]+ ⬇️$/`
- Si no cumple: regenerar (máx 3)

### Validador para CARRUSEL alejandra_style

- Slides ≥ 6 y ≤ 10
- Hook tiene MAYÚSCULAS (al menos 30% del hook en CAPS)
- Slide 1: debe tener "foto_autor_central" + "headline_sandwich" (top + bottom)
- Caption ≥ 200 chars y ≤ 500
- Caption tiene al menos 1 emoji emocional (🥲 🥹 🔥 🎬 💔 😤)
- Slide final NO requiere palabra DM mayúsculas (puede ser conversacional)
- Si no cumple: regenerar (máx 3)

### Validador para REEL america_style

- Hook ≤ 25 palabras
- Si hook menciona número $ → debe tener desglose en desarrollo
- CTA debe contener: `(escribí|estive|comentá|estiva)` + PALABRA_MAYUSCULAS + `comentarios`
- Palabra CTA en MAYÚSCULAS, 1 sola palabra, longitud 3-10 chars
- Duración estimada ≥ 30s y ≤ 90s (basado en word count: ~150 wpm)
- Lenguaje primera persona
- Si rechaza: regenerar máx 3 veces

---

## SECCIÓN 6 — UI EN STUDIO

### Cuando tipo == 'carrusel'

Agregar selector debajo del tipo:
```
Estilo del carrusel:
○ 🤖 Ramiro Style (tutorial, sistemático)
○ 🎬 Alejandra Style (confesional, storytelling)
● ✨ Auto (Claude decide según tema)
```

Default: Auto.

### Cuando tipo == 'reel'

Agregar selector debajo del tipo:
```
Estilo del reel:
○ 🇺🇸 America Style (diálogo + desglose, latam-USA)
● ✨ Auto (Claude decide)
○ 📝 Default (formato actual)
```

Default: Auto.

---

## SECCIÓN 7 — EJEMPLO DIFERENCIADOR (RESPUESTA SUTIL)

El creator America-style dijo literalmente: *"Remodelar casas es el peor negocio... siempre vistos que terminan costándote muchísimo dinero."*

Nicolás VIVE de remodelar (Fix & Flip). Esto es OPORTUNIDAD de generar al menos 1 reel/carrusel de RESPUESTA SUTIL al lanzar el sistema:

```json
{
  "estilo": "america_style",
  "patron": "respuesta_sutil",
  "hook": "Hay creadores que dicen que remodelar es el peor negocio.",
  "desarrollo": "Yo gané 200 mil dólares el año pasado con 4 flips. ¿Sabés por qué a ellos les va mal y a mí no? Yo tengo un sistema. Sé exactamente cuánto puedo pagar por una casa antes de mirarla. Sé qué partidas del rehab tienen riesgo. Sé cómo elegir un GC sin que me robe. No es magia, es método.",
  "cta": "Si querés que te muestre qué hace que un flip sea predecible, escribí MÉTODO en los comentarios.",
  "cta_palabra": "MÉTODO",
  "nota_estilo": "Sin nombrar al creador. Respetuoso pero contundente."
}
```

---

## SECCIÓN 8 — ARCHIVO ESTRUCTURADO PARA EL JSON

Para que Claude Code copie directamente al JSON `viral-data/opera-imperio-data-v2.json`:

```json
{
  "formulas_por_tipo": {
    "carrusel": {
      "default": { "...sin cambios..." },
      "ramiro_style": {
        "nombre": "Ramiro Style — Pasos + CTA palabra DM",
        "fuente_inspiracion": "@ramiro.cubria",
        "ver_seccion": "ESTILO 1 en docs/marketing/PATRONES-VIRALES-MAESTRO.md"
      },
      "alejandra_style": {
        "nombre": "Alejandra Style — Confesional + Headlines TV News",
        "fuente_inspiracion": "@alrinconoficial",
        "ver_seccion": "ESTILO 2 en docs/marketing/PATRONES-VIRALES-MAESTRO.md"
      }
    },
    "reel": {
      "default": { "...sin cambios..." },
      "america_style": {
        "nombre": "America Style — Diálogo + Desglose + CTA palabra",
        "fuente_inspiracion": "Creator construction USA-LATAM",
        "ver_seccion": "ESTILO 3 en docs/marketing/PATRONES-VIRALES-MAESTRO.md"
      }
    }
  }
}
```

Claude Code: lee este archivo COMPLETO antes de empezar a implementar. Copia los few-shots TEXTUALES (no los inventes). Inyecta los bloques de patrón en el system prompt según el estilo detectado.

---

## SECCIÓN 9 — FASE 4 FIXES (ÚLTIMO ITEM)

Después de los 3 estilos, completar:

1. **Migración SQL**: actualizar `supabase/migrations/20260630000000_rag_embeddings.sql` cambiando `VECTOR(1024)` → `VECTOR(512)` para consistencia futura.

2. **Comentario en `generate-embedding`**: corregir el comentario erróneo que decía 1024 (debe decir 512 para voyage-3-lite).

3. **Mensaje "sin historial suficiente"**: agregar al panel transparente de Studio que cuando `searchSimilar` devuelve <3 resultados, muestre: "📭 Sin historial suficiente — generá más piezas para activar RAG."

Commit final: `fix(viral): Fase 4 dimensión voyage-3-lite + mensaje sin historial`

---

## FIN DEL DOCUMENTO

Generado por Cowork — 30 jun 2026 — 11:30 AM
Fuentes: análisis de capturas IG @ramiro.cubria + @alrinconoficial + 25 transcripciones TurboScribe procesadas.
