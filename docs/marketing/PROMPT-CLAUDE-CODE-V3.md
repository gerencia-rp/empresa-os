# 🚀 PROMPT v3 — PIVOTE ARQUITECTURA: Producción como centro

> Reemplaza al PROMPT v2 (que reemplazó al v1).
> Si Claude Code ya implementó v1 y empezó v2: PARÁ TODO. Leé esto primero.

---

# 📋 PASO 1 — Commitear archivos v3 al repo

```bash
cd ~/Desktop/CLAUDE\ CODE/empresa-os
mv ~/Downloads/PLAN-ARQUITECTURA-FINAL.md docs/marketing/PLAN-ARQUITECTURA-FINAL.md
mv ~/Downloads/PROMPT-CLAUDE-CODE-V3.md docs/marketing/PROMPT-CLAUDE-CODE-V3.md
git pull --rebase origin main
git add docs/marketing/
git commit -m "feat(viral): v3 arquitectura final - produccion como centro + context injection"
git push origin main
```

# 📋 PASO 2 — Pegale ESTO a Claude Code

```
═══════════════════════════════════════
PIVOTE FUNDAMENTAL v3 — LEER COMPLETO ANTES DE TOCAR CÓDIGO
═══════════════════════════════════════

CONTEXTO: ya implementaste v1 (13 tabs decorativas + 4 generadores). El problema:
los generadores NO usan la identidad/inteligencia/sistema. Son genéricos. La
teoría es decorativa.

Nicolás (el dueño) lo detectó. Cambio total de approach.

NUEVO NORTE:
La app NO es 15 tabs de teoría + generadores genéricos.
La app ES un STUDIO de producción de contenido donde toda la estrategia se
inyecta automáticamente en cada generación.

═══════════════════════════════════════
LEÉ EN ORDEN
═══════════════════════════════════════

1. docs/marketing/PLAN-ARQUITECTURA-FINAL.md  ← el plan v3 completo
2. viral-data/opera-imperio-data-v2.json      ← el contenido (usá este, NO crees v3 todavía)
3. Tu código actual viral.html + viral.js     ← lo que ya construiste

═══════════════════════════════════════
LA NUEVA ARQUITECTURA (7 tabs en lugar de 15)
═══════════════════════════════════════

REEMPLAZÁ las 13 tabs actuales por estas 7:

1. 🎯 STUDIO              ← LA ESTRELLA. Pantalla principal de producción.
2. 🛠️ HERRAMIENTAS        ← Calculadoras del Sistema Flip Anti-Riesgos™
3. 🔄 TRANSFORMADOR       ← Input ajeno (texto/imagen/URL) → tu marca
4. 📚 BIBLIOTECA          ← 45 piezas + state machine pendiente/producida/publicada
5. 🔥 TENDENCIAS          ← TikTok Creative Center + 10 apps externas
6. 📅 CALENDARIO          ← Plan 30 días + tracking ritmo siembra/cosecha
7. ⚙️ MARCA               ← TODO lo de Identidad/Inteligencia/Sistema/Ejecución
                             condensado en acordeón colapsable (consulta + engine)

NO mantengas las 13 tabs anteriores. CONSOLIDÁ todo dentro de las 7 nuevas.

═══════════════════════════════════════
LA TAB ESTRELLA: STUDIO
═══════════════════════════════════════

Cuando el usuario abre la app, lo PRIMERO que ve es STUDIO. Es la pantalla de
producción de contenido.

LAYOUT (mobile-first):

[1] Header: "FLIPPEÁ CON MÉTODO" + Sistema Flip A-R™ + links rápidos a otras tabs

[2] Selector de tipo de contenido (6 botones grandes):
    🎬 Reel · 🖼️ Carrusel · 📲 Story · ▶️ YouTube · 💬 Manifiesto · 📝 Post

[3] Configuración inteligente (con defaults inteligentes):
    📌 PARA QUIÉN: Avatar 2 (default) ⦿ vs Avatar 1 ○
    🎯 DOLOR DEL AVATAR: dropdown 29 dolores + botón Random
    👹 ENEMIGO A ATACAR: Auto (recomendado según dolor) ⦿ vs Manual ○
    🧠 TÁCTICA PSICOLÓGICA: Auto ⦿ vs Manual ○ (de las 32 del JSON)
    📅 FASE DEL MES: Auto (siembra/cosecha según fecha) ⦿ vs Forzar ○
    ✍️ TEMA/ÁNGULO LIBRE (opcional)
    ⚙️ CONFIG AVANZADA ▼ (colapsado: formato, variantes, CTA palabra clave, modelo IA)

[4] Botón gigante: ⚡ GENERAR CONTENIDO POTENCIADO

[5] Panel de contexto inyectado (TRANSPARENCIA — el usuario VE qué se inyecta):
    ✓ Eslogan: "Flippeá con método"
    ✓ Framework: Sistema Flip Anti-Riesgos™
    ✓ Tagline: 4 empresas operando
    ✓ Arquetipo: Operador con Método
    ✓ Enemigo seleccionado: [nombre]
    ✓ Táctica: [nombre]
    ✓ Avatar: [nombre]
    ✓ Palabras prohibidas: 10 bloqueadas
    ✓ Palabras de marca: 10 priorizadas
    ✓ Validador post-output activo
    [link: ver prompt completo enviado al API]

[6] Resultado (cards de N variantes):
    Cada card: thumbnail text + hook + chisme + valor + CTA + mecánica aplicada
    Botones: 📋 Copiar | 💾 Guardar a Biblioteca | 🔄 Regenerar | 📥 Exportar

═══════════════════════════════════════
CONTEXT INJECTION (LO CRÍTICO — NO NEGOCIABLE)
═══════════════════════════════════════

CREÁ un archivo nuevo: js/viral-context-builder.js

Su única función: construir el prompt al API de Claude inyectando TODO el contexto
del JSON.

EJEMPLO de cómo debe quedar el prompt al API después del context injection
(este es el ejemplo de un REEL):

[Ver sección "El prompt completo que se envía al API" del PLAN-ARQUITECTURA-FINAL.md
para el template exacto]

Resumiendo, el prompt debe inyectar:
- ESLOGAN principal + tagline + frase maestra (del JSON)
- ARQUETIPO + tono (del JSON)
- FOCO 95% F&F + subcomunicación 4 empresas (del JSON)
- AVATAR seleccionado con su perfil + lead magnet
- DOLOR seleccionado del banco
- ENEMIGO seleccionado con frase + tu solución
- TÁCTICA psicológica con maestro + cómo aplicar
- FASE DEL MES (siembra/cosecha)
- PALABRAS PROHIBIDAS (lista que NO debe usar)
- PALABRAS DE MARCA (lista que SÍ debe usar, mínimo 3)
- FRASES RECURRENTES (al menos 1 obligatoria)
- REGLAS DE CTA (palabra DM, NO link en bio)
- REGLAS DE EJECUTABILIDAD (post-auditoría Génesis: aterrizar promesa)
- FÓRMULA según tipo de contenido (Reel: Hook→Chisme→Valor→CTA, etc.)

═══════════════════════════════════════
VALIDADOR DE OUTPUT (post-generación)
═══════════════════════════════════════

CREÁ otro archivo: js/viral-validator.js

Después de que la API devuelve el contenido, validá:
1. ¿Usa alguna palabra prohibida? → si sí, REGENERAR con feedback
2. ¿Usa al menos 3 palabras de marca? → si no, REGENERAR
3. ¿Usa al menos 1 frase recurrente? → si no, REGENERAR
4. ¿El CTA pide palabra DM en mayúsculas? → si no, REGENERAR
5. ¿NO promete "multiplicar capital"? → si lo hace, REGENERAR
6. Máximo 3 intentos de regeneración

Mostrá al usuario el resultado del validador (palabras de marca usadas, etc.)

═══════════════════════════════════════
AUTO-SELECCIÓN INTELIGENTE
═══════════════════════════════════════

Si el usuario elige "Auto" en enemigo/táctica/fase:

ENEMIGO AUTO:
Mapeo dolor → enemigo más relevante (te paso el mapeo abajo).
Si no hay mapeo, usar "Los Gurúes" como default.

TÁCTICA AUTO:
Mapeo objetivo de pieza → táctica relevante.
Si genera Caso de éxito → Iman Gadzhi (testimonios con números)
Si genera Educativo → Hormozi (framework con nombre)
Si genera Polémico → Trump (controversia productiva)
Si genera Aventura → Red Bull (brand as media)

FASE DEL MES AUTO:
Día del mes < 21 → Siembra
Día del mes 21-27 → Cosecha
Día 28 → Volver a siembra

MAPEO DOLOR → ENEMIGO (poner en JSON v3 o hardcodear en JS):
q001 → algunDia       (Necesito todo el capital)
q002 → bancos         (Down payment)
q003 → cursosIngles   (Levantar capital)
q010 → bancos         (2 años LLC)
q011 → cursosIngles   (Harmony Lender)
q012 → bancos         (Sin Social)
q013 → cursosIngles   (DSCR)
q014 → bancos         (Crédito bajo)
q020 → compradorEmocional (4 números)
q021 → compradorEmocional (Buy Box)
q022 → contratistas   (Inspeccionar)
q030 → wholesalers    (Sin realtor)
q031 → wholesalers    (Wholesalers basura)
q040 → contratistas   (GC que no robe)
q041 → contratistas   (Costos rehab)
q042 → bancos         (Permisos)
q050 → contratistas   (Equipo)
q051 → cursosIngles   (Diferencia jugadores)
q060 → acumuladores   (Primer mes mentoría)
q061 → cursosIngles   (Metodología completa)
q062 → cursosIngles   (Modelos de negocio)
q063 → 9a5            (Propiedades caras estado)
q070 → algunDia       (Miedo deuda)
q071 → compradorEmocional (Mentalidad)
q072 → acumuladores   (Llevo tiempo investigando)
q080 → 9a5            (Familia no apoya)
q081 → 9a5            (Sociedad familia)
q090 → algunDia       (Para qué hago esto)
q091 → algunDia       (Patrimonio largo plazo)

═══════════════════════════════════════
TABS DETALLADAS — QUÉ VA EN CADA UNA
═══════════════════════════════════════

🛠️ HERRAMIENTAS:
Las 5 fases del Sistema Flip Anti-Riesgos™ con calculadoras/wizards reales.
Cada herramienta interactiva (no PDFs muertos):
- Setup financiero 30 días: checklist con checkboxes
- Calculadora capital disponible: inputs → output
- Buy Box Builder: wizard 10 pasos → JSON descargable
- Calculadora 4 Números: MAO+Rehab+ARV+Margen → COMPRÁS/NO COMPRÁS
- Inspección 30 seg: checklist visual
- Matriz GC: 12 preguntas con scoring
- Contrato GC blindado: descarga PDF/Word
- Presupuesto Rehab +20%: calculadora con buffer auto
- Vender vs Hold: ROI comparativo
- Plan 12 meses: 4 flips: calendario interactivo

🔄 TRANSFORMADOR:
- Input: textarea (copy) | file upload (imágenes) | URL (TikTok/IG/YT)
- Para imágenes: API Anthropic Claude Sonnet 4.5 con vision
- Para URL: yt-dlp o oEmbed (si TikTok/IG bloquean, fallback: input manual de transcripción)
- Config: avatar destino, inyectar framework, palabra clave DM
- Output: copy/carrusel/script adaptado a marca (USA EL CONTEXT INJECTION)

📚 BIBLIOTECA:
- Las 45 piezas pre-armadas (de la sección biblioteca del JSON)
- Cada pieza: tarjeta con thumbnail + título + estado
- Estados: pendiente / producida / publicada (localStorage)
- Filtros: pilar, enemigo, avatar, estado
- Búsqueda por keyword
- Click → modal con guión completo
- Botón "Llevar a Studio" → carga la pieza en Studio para personalizar

🔥 TENDENCIAS:
- Iframe TikTok Creative Center (https://ads.tiktok.com/business/creativecenter/inspiration/popular)
- Lista estática de las 10 apps con sus links + costo + cómo usar (del JSON)
- Guía de uso semanal
- Presupuesto sugerido (gratis/intermedio/pro)

📅 CALENDARIO:
- Plan fijo 30 días de re-launch (del JSON: reLaunch.calendario30Dias)
- Generador adicional para semanas custom
- Tracking diario con checkbox + timestamp
- Indicador automático fase del mes
- Lista "hoy" con piezas a publicar + link a Studio o Biblioteca

⚙️ MARCA (acordeón colapsable, 7 secciones):
- Quién soy (manifiesto + arquetipo + 4 empresas + narrativa)
- Cómo hablo (15 frases + 10 prohibidas + 10 marca + tono por canal)
- Cómo me veo (símbolo + paleta + tipografía + 6 vestuarios + gestos)
- Quién me ataca (Los Gurúes + La Teoría Vacía + 10 tácticos)
- Cómo persuado (7 leyes + 32 tácticas + 18 casos profundos)
- Mis avatares (2 separados con lead magnets)
- Mis redes (estado actual + bios + acciones inmediatas)

═══════════════════════════════════════
RESTRICCIONES TÉCNICAS
═══════════════════════════════════════

- Stack: Vanilla JavaScript (NO React)
- Mobile-first (la mayoría va a usar la app desde el celular)
- Mantener la API actual (/api/claude.mjs) para llamadas a Anthropic
- localStorage para state (pendiente/producida/publicada, configuración)
- Carga inicial RÁPIDA (lazy load de tabs no visibles)
- Variables CSS:
  --primary: #0B1F3A (azul marino)
  --accent: #C8A864 (dorado mate)
  --light: #F5F2EB (blanco roto)
  --dark: #1F2429 (gris carbón)
- Tipografía: Playfair Display (display) + Inter (body) via Google Fonts
- Header: "FLIPPEÁ CON MÉTODO" + Sistema Flip Anti-Riesgos™ + watermark hexagonal

═══════════════════════════════════════
ORDEN DE IMPLEMENTACIÓN
═══════════════════════════════════════

Como ya tenés v1/v2 con mucho código, hacé refactor INTELIGENTE:

1. CRÍTICO PRIMERO: js/viral-context-builder.js + js/viral-validator.js
   → Esto es la base. Sin esto, los generadores siguen siendo genéricos.

2. STUDIO: rebuilt completo de la tab principal con context injection
   → Esta es LA tab. Testeá MUY bien.

3. MARCA: condensar las 7 ex-tabs en 1 con acordeón
   → Reutiliza el render que ya hiciste, solo reorganizá.

4. HERRAMIENTAS: las 18 herramientas del Sistema Flip Anti-Riesgos™
   → Esto es nuevo, va a tomar tiempo. Empezá por las 5 más críticas:
      Calculadora 4 Números, Buy Box Builder, Matriz GC, Contrato GC, Calculadora Capital.

5. BIBLIOTECA: refactor con context injection en "Llevar a Studio"

6. TRANSFORMADOR: nueva, con API + vision

7. TENDENCIAS: estática, fácil

8. CALENDARIO: refactor con tracking + fase auto

9. QA mobile + pulido

═══════════════════════════════════════
PREGUNTAS QUE ESPERO ANTES DE EMPEZAR
═══════════════════════════════════════

Pregúntame ANTES de tocar código:
1. ¿Conservás algún componente de v1/v2 o tiro todo?
2. ¿Algún detalle del context injection que no quede claro?
3. ¿Decisión técnica sobre vision API para imágenes en Transformador?
4. ¿Algún edge case del validador (qué hago si después de 3 intentos sigue mal)?

Devolveme un PLAN DE EJECUCIÓN v3 con:
- Qué reutilizás de v1/v2
- Qué tirás
- Archivos a crear
- Orden de implementación
- Estimación de líneas de código por archivo
- Riesgos

Esperá mi OK antes de tocar código.

═══════════════════════════════════════
ESTILO Y CALIDAD
═══════════════════════════════════════

- Español rioplatense en código y comentarios
- Funciones puras donde se pueda
- Naming en inglés para código, español para UI
- Comentarios en español
- Mobile-first siempre
- Performance: lazy load tabs no visibles, debounce inputs

═══════════════════════════════════════
NORTE FINAL
═══════════════════════════════════════

Esta app tiene que ser LA APP MÁS POTENTE DE CREATIVIDAD Y GENERACIÓN DE
CONTENIDO PARA REAL ESTATE LATINO EN USA.

Cada pieza que genera debe sonar 100% a Nicolás Lara, atacar a sus enemigos,
usar su framework, respetar sus reglas, adaptar el tono al avatar.

Sin que el usuario toque nada manual. Auto-contextualizado.

Eso es lo que vale.

ARRANCÁ leyendo el PLAN-ARQUITECTURA-FINAL.md.
```

---

# 📋 PASO 3 — Después del plan de Claude Code

Si el plan que devuelve te parece bien, decile:

```
Dale, arrancá por viral-context-builder.js + viral-validator.js (los más críticos).
Después STUDIO. Commit + push después de cada pieza grande.
```

---

# ✅ CHECKLIST POST-IMPLEMENTACIÓN

## Context injection
- [ ] Existe js/viral-context-builder.js
- [ ] Cada generación inyecta TODO: eslogan, framework, arquetipo, enemigo, táctica, avatar, fase
- [ ] Existe js/viral-validator.js
- [ ] Valida palabras prohibidas, marca, frases, CTA
- [ ] Regenera automáticamente si invalida (max 3 intentos)
- [ ] Auto-selección de enemigo según dolor (mapeo)
- [ ] Auto-selección de táctica según objetivo

## STUDIO
- [ ] Es la pantalla principal al abrir
- [ ] 6 tipos de contenido seleccionables
- [ ] Configuración inteligente con defaults sensatos
- [ ] Panel de "contexto inyectado" transparente
- [ ] Resultado en cards con botones (copiar/guardar/regenerar/exportar)
- [ ] Mobile-first

## 7 tabs
- [ ] STUDIO
- [ ] HERRAMIENTAS (al menos 5 calculadoras funcionando)
- [ ] TRANSFORMADOR (con API + vision)
- [ ] BIBLIOTECA (45 piezas + estado + "Llevar a Studio")
- [ ] TENDENCIAS (iframe + 10 apps)
- [ ] CALENDARIO (plan + tracking)
- [ ] MARCA (acordeón con 7 secciones)

## Branding
- [ ] Header "FLIPPEÁ CON MÉTODO"
- [ ] Eslogan en todos los CTAs
- [ ] Paleta azul marino + dorado
- [ ] Tipografía Playfair Display + Inter

---

_v3 — 29 Jun 2026 — Pivote arquitectura: producción como centro_

**FLIPPEÁ CON MÉTODO. 🎯**
