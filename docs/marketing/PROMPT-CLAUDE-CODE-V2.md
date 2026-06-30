# 🚀 PROMPT v2 — IMPLEMENTACIÓN ACTUALIZADA (post-auditoría Proyecto Génesis)

> Reemplaza al PROMPT v1. Si Claude Code ya empezó a construir con v1, **STOP** — leer este v2 primero.

---

# 📋 PASO 1 — Mover el JSON v2 al repo

```bash
cd ~/Desktop/CLAUDE\ CODE/empresa-os
mv ~/Downloads/opera-imperio-data-v2.json viral-data/opera-imperio-data-v2.json
mv ~/Downloads/PROMPT-CLAUDE-CODE-V2.md docs/marketing/PROMPT-CLAUDE-CODE-V2.md
git add viral-data/ docs/marketing/
git commit -m "feat(viral): JSON v2 con foco F&F + Sistema Flip Anti-Riesgos + enemigos + recursos"
git push origin main
```

# 📋 PASO 2 — Pegale ESTO a Claude Code

```
═══════════════════════════════════════
ACTUALIZACIÓN v2 — POST AUDITORÍA
═══════════════════════════════════════

Vamos a usar la versión 2 del plan. Cambios mayores vs v1:

CAMBIOS CRÍTICOS:
1. Eslogan nuevo: "Flippeá con método" + framework "Sistema Flip Anti-Riesgos™" (Hormozi style)
2. Tagline: "4 empresas operando · +200 alumnos · 1 sistema"
3. Foco 95% Fix & Flip (las otras 3 empresas = CREDIBILIDAD, no protagonismo)
4. Enemigo principal: "Los Gurúes" (visible) + "La Teoría Vacía" (invisible)
5. 2 avatares separados (Flipper escalando + Empleado empezando) — auditoría Proyecto Génesis
6. TODO ejecutable — cada concepto teórico tiene HERRAMIENTA asociada
7. 3 tabs nuevas: Sistema F&F con herramientas, Transformador, Recursos & Tendencias

NUEVA FUENTE DE VERDAD:
viral-data/opera-imperio-data-v2.json (NO uses la v1)

CAMBIOS A LA ARQUITECTURA:

Tabs finales (14):

SECCIÓN A — IDENTIDAD
├── 🎯 Manifiesto (eslogan, manifiesto, narrativa, framework Sistema Flip Anti-Riesgos™)
├── 👤 Identidad (arquetipo Operador con Método, 10 enemigos tácticos + Los Gurúes + La Teoría Vacía)
└── 🎨 Visual (sin cambios mayores)

SECCIÓN B — INTELIGENCIA
├── 🧠 Psicología (cada táctica con HERRAMIENTA asociada, no solo teoría)
└── 📊 Mis Redes (sin cambios)

SECCIÓN C — SISTEMA (NUEVA — reemplaza foco solo en "Estrategia")
├── 🛠️ Sistema Flip Anti-Riesgos™ (las 5 fases con TODAS sus herramientas)
│   ├── Fase 1: Preparación (4 herramientas)
│   ├── Fase 2: Adquisición (4 herramientas — Buy Box Builder, Calculadora 4 Números, etc.)
│   ├── Fase 3: Ejecución (4 herramientas — Matriz GC, Contrato blindado, etc.)
│   ├── Fase 4: Salida (3 herramientas — Vender vs Hold, Listing optimizado, etc.)
│   └── Fase 5: Escala (3 herramientas — Plan 12 meses, ROI portafolio, etc.)
└── 📚 Avatares (2 avatares separados con bios + leads magnets)

SECCIÓN D — EJECUCIÓN
├── 🚀 Re-Launch (plan 30 días)
└── 📅 Calendario (existente)

SECCIÓN E — PRODUCCIÓN (existente + NUEVAS)
├── 🎬 Reels (existente + toggle "fórmula amplificada" + auto-insertar "Flippeá con método")
├── 🖼️ Carruseles (existente, mismas mejoras)
├── 📲 Historias (existente)
├── ▶️ YouTube (existente)
├── 🔄 Transformador (NUEVA — input: copy/imagen/URL viral de otros → output: tu marca)
├── 🔥 Tendencias (NUEVA — embed TikTok Creative Center + apps externas)
└── 📚 Biblioteca (15 reels reescritos con foco F&F + framework)

SECCIÓN F — RECURSOS
└── 🛠️ Recursos & Tendencias (NUEVA — links de apps explicados):
    - TikTok Creative Center (GRATIS oficial)
    - Tokboard, Pentos, Trendpop, Predis.ai, Apify, VidIQ, Hashtagsforlikes, etc.
    - Cada uno con: URL + costo + qué te da + cómo usarlo paso a paso + tip pro

═══════════════════════════════════════
EJECUTABILIDAD (LO MÁS IMPORTANTE)
═══════════════════════════════════════

CERO teoría sin herramienta. Cada sección del JSON tiene un campo "herramientas" o "herramientaApp".

Tu trabajo: convertir esos conceptos en INTERACTIVO real:
- "Buy Box Builder" → wizard de 10 preguntas → output JSON con el Buy Box del usuario
- "Calculadora 4 Números" → inputs MAO/Rehab/ARV/Margen → output: "COMPRÁS" / "NO COMPRÁS" con explicación
- "Matriz GC" → tabla interactiva donde el user califica 12 preguntas + sube 5 docs
- "Plantilla Contrato GC" → descarga PDF/Word pre-llenado
- "Generador de pseudo-eventos" → click → 5 ideas concretas para esa semana
- "Validador de hook" → user pega hook → la app le cuenta palabras + sugiere recortes
- "Transformador de copy" → user pega copy ajeno → output adaptado a su marca (vía API Anthropic)

═══════════════════════════════════════
PARA TRANSFORMADOR + TENDENCIAS
═══════════════════════════════════════

TRANSFORMADOR (tab nueva):
- Inputs: textarea (copy), file upload (imágenes carrusel), URL (TikTok/IG/YT)
- Para URL: si es TikTok/IG/YT, usar oEmbed o yt-dlp para extraer transcripción
- Para imágenes: Anthropic Claude con vision (modelo Sonnet 4.5 ya lo soporta)
- Output: copy reescrito + (si es carrusel) JSON con slides nuevos + (si es video) script con timing

TENDENCIAS (tab nueva):
- v1: iframe del TikTok Creative Center embebido (chequear si permite embedding — si no, screenshot manual semanal)
- v1: lista estática de los 10 apps del JSON con sus links + explicaciones
- v2 futuro: integración Apify para scraping diario automático

═══════════════════════════════════════
TU TAREA AHORA
═══════════════════════════════════════

1. LEÉ viral-data/opera-imperio-data-v2.json COMPLETO
2. LEÉ docs/marketing/PROMPT-CLAUDE-CODE-V2.md (este archivo)
3. INSPECCIONÁ código actual (viral.html, viral.js, base_conocimiento.json)
4. Si ya empezaste a implementar con v1: PARÁ. Devolveme git status y diff de lo hecho.
5. Devolveme un PLAN DE EJECUCIÓN v2 con:
   a) Si hay código v1 en progreso: cómo lo aprovechás (refactor) o tirás
   b) Lista de archivos a crear (viral-opera-v2.js, viral-tools.js, viral-transformer.js, viral-trends.js)
   c) Lista de modificaciones a viral.html (14 tabs en lugar de 13)
   d) Orden de implementación (mantenelo igual, pero agregando Sección F al final)
   e) Para Transformador: API endpoint, modelo Anthropic vision, costo estimado por uso
   f) Para Tendencias: estrategia iframe vs scraping vs lista estática
   g) Riesgos
   h) Confirmaciones que necesitás

6. ESPERÁ mi OK antes de tocar código.

═══════════════════════════════════════
ESTILO
═══════════════════════════════════════

- Español rioplatense
- Sin teoría suelta
- Cada feature debe responder: ¿esto el usuario lo usa el lunes a la mañana?
- Mobile-first
- Auto-save en localStorage
- Dark con paleta de marca por default

ARRANCÁ.
```

---

# 📋 PASO 3 — Cuando Claude Code te devuelva el plan v2

Si te parece OK, decile:

```
Dale. Si tenías código v1 en progreso, refactorialo o tiralo según lo que sea más rápido.

Orden de implementación:
1. Refactor del Shell para soportar 14 tabs (no 13)
2. Tabs estáticas de Identidad (Manifiesto + Identidad + Visual) — usando data del JSON v2
3. Tab SISTEMA FLIP ANTI-RIESGOS™ con sus 5 fases y herramientas (esta es la JOYA — TODO ejecutable)
4. Tab Recursos & Tendencias (lista estática de las 10 apps con explicaciones)
5. Tab Psicología (con cada táctica → herramienta)
6. Tab Mis Redes
7. Tab Re-Launch + Calendario refinado
8. Tab Biblioteca con los 15 reels reescritos
9. Tab Transformador (con API Anthropic + vision)
10. Mejoras a generadores (toggle fórmula amplificada + framework auto-insertado)
11. QA mobile

Commit + push después de cada tab. Yo verifico en empresa-os.vercel.app/viral.
```

---

# ✅ CHECKLIST POST-IMPLEMENTACIÓN

Cuando todo esté hecho:

## Identidad
- [ ] Eslogan "Flippeá con método" en TODOS los CTAs
- [ ] Framework "Sistema Flip Anti-Riesgos™" como branded asset
- [ ] Tagline "4 empresas operando · +200 alumnos · 1 sistema" en footer
- [ ] Manifiesto nuevo (no el de "Imperio")

## Foco F&F
- [ ] 95% del contenido habla de Fix & Flip
- [ ] Las otras 3 empresas mencionadas como CREDIBILIDAD (no protagonistas)
- [ ] Avatares 1 y 2 separados con leads magnets distintos

## Sistema Flip Anti-Riesgos™
- [ ] 5 fases visibles con herramientas funcionando
- [ ] Calculadora 4 Números operativa
- [ ] Buy Box Builder operativo
- [ ] Matriz GC operativa
- [ ] Templates descargables

## Enemigos
- [ ] "Los Gurúes" como enemigo principal visible
- [ ] "La Teoría Vacía" como enemigo invisible / columna vertebral
- [ ] 10 enemigos tácticos con frases anti-enemigo
- [ ] Generador de hooks anti-enemigo

## Recursos & Tendencias
- [ ] 10 apps listadas con: URL + costo + qué te da + cómo usarlo + tip pro
- [ ] Guía de uso semanal
- [ ] Presupuesto sugerido (gratis/intermedio/pro)

## Transformador
- [ ] Input texto/imagen/URL
- [ ] Output adaptado a marca
- [ ] Configuración: avatar destino, nicho, framework auto

## Biblioteca
- [ ] 15 reels reescritos con foco F&F
- [ ] Cada reel con: thumbnail, hook, chisme, valor, CTA, mecánica
- [ ] Sistema de estado (pendiente/producida/publicada)

---

# 🎯 IDEAS POST-V2 (futuro)

Cuando v2 esté funcionando:

1. **Integración Apify** para scraping diario de tendencias TikTok del nicho real estate
2. **Voice clone** (ElevenLabs) para generar voiceover del manifiesto
3. **Editor visual de carruseles** integrado con Canva API
4. **Login para tu equipo** (Carlos, Nicolás PM) — multi-user
5. **Analytics dashboard** con métricas IG/TT/YT pulled vía APIs oficiales
6. **Agente proactivo** — la app te dice qué publicar HOY según ritmo siembra/cosecha

---

_Plan v2 — 29 Jun 2026 — Post auditoría Proyecto Génesis_

**FLIPPEÁ CON MÉTODO. 🎯**
