# 🤖 PROMPT PARA CLAUDE CODE — Implementación Viral Studio → "Opera tu Imperio" OS

> Este archivo contiene el prompt definitivo que vas a pegarle a Claude Code en tu Mac para que reestructure la app completa. **El JSON `opera-imperio-data.json` tiene TODO el contenido**. Claude Code solo tiene que construir la UI alrededor.

---

# 📋 PASO 1 — Preparar los archivos

Antes de abrir Claude Code, mové los archivos al repo:

```bash
cd ~/Desktop/CLAUDE\ CODE/empresa-os

# Mover el JSON de datos a una carpeta data dentro de la app
mkdir -p public/viral-data || mkdir -p viral-data
mv ~/Downloads/opera-imperio-data.json viral-data/opera-imperio-data.json

# Mover el plan de reestructuración a docs
mkdir -p docs/marketing
mv ~/Downloads/PLAN-REESTRUCTURACION-VIRAL-STUDIO.md docs/marketing/

# Verificar
ls viral-data/
ls docs/marketing/
```

# 📋 PASO 2 — Abrir Claude Code en el repo

```bash
cd ~/Desktop/CLAUDE\ CODE/empresa-os
claude
```

# 📋 PASO 3 — Pegale ESTE prompt

```
Vamos a reestructurar completamente la app Viral Studio (viral.html + viral.js) para convertirla en el "Opera tu Imperio OS" — el sistema operativo completo de marca personal de Nicolás Lara.

═══════════════════════════════════════
CONTEXTO MAESTRO (LEE EN ORDEN)
═══════════════════════════════════════

1. CLAUDE.md — memoria persistente del proyecto
2. viral-data/opera-imperio-data.json — TODA la data estructurada (manifiesto, identidad, visual, psicología, mis redes, re-launch, biblioteca completa con 15 reels + 10 carruseles + 5 historias + 5 videos + 10 TikToks)
3. docs/marketing/PLAN-REESTRUCTURACION-VIRAL-STUDIO.md — plan técnico detallado
4. docs/marketing/IDENTIDAD-DE-MARCA-NICOLAS.md — playbook total (si necesitás más contexto)
5. docs/marketing/ESTRATEGIA-NUEVA-REDES-OPERA-IMPERIO.md — estrategia completa
6. docs/marketing/AUDITORIA-REDES-RESULTADOS.md — auditoría real de las 3 redes

═══════════════════════════════════════
ESTADO ACTUAL DE LA APP
═══════════════════════════════════════

Inspeccioná estos archivos antes de proponer nada:
- viral.html (markup actual)
- viral.js (lógica actual)
- base_conocimiento.json (29 dolores existentes)
- api/claude.mjs (endpoint Anthropic)

La app tiene HOY 6 tabs:
🎬 Reels · 🖼️ Carruseles · 📲 Historias · ▶️ YouTube · 📅 Calendario · 📖 Estrategia

═══════════════════════════════════════
OBJETIVO
═══════════════════════════════════════

Convertir la app en un "OS" con 13 tabs organizados en 4 secciones:

SECCIÓN A — IDENTIDAD (NUEVAS)
├── 🎯 Manifiesto    → eslogan, manifiesto, narrativa, variantes
├── 👤 Identidad     → arquetipo Operador, enemigo Gurúes Especuladores, 15 frases, palabras
└── 🎨 Visual        → símbolo hexagonal, paleta, tipografía, 6 vestuarios, gestos

SECCIÓN B — INTELIGENCIA (NUEVAS)
├── 🧠 Psicología    → 7 leyes + 32 tácticas históricas + casos profundos (Bernays/Goebbels/Apple/Marlboro/...)
└── 📊 Mis Redes     → estado IG (47K)/TT (640)/YT (5K) con data verificada + bios nuevas + decisión handle YT

SECCIÓN C — EJECUCIÓN (NUEVA + EXISTENTES MEJORADAS)
├── 🚀 Re-Launch     → plan 30 días (pre-launch -7 a 0, launch day, post-launch)
├── 📅 Calendario    → existente + nuevo: plan fijo de re-launch con tracking
└── 📖 Estrategia    → existente + amplificado con eco histórico de las 4 fórmulas

SECCIÓN D — PRODUCCIÓN (EXISTENTES MEJORADAS + 1 NUEVA)
├── 🎬 Reels         → existente + toggle "fórmula amplificada" + guardar en biblioteca
├── 🖼️ Carruseles    → existente + mismas mejoras
├── 📲 Historias     → existente + indicador fase del mes
├── ▶️ YouTube       → existente + sugerir 3 variantes thumbnail
└── 📚 Biblioteca    → NUEVA: 15 reels + 10 carruseles + 5 series + 5 videos + 10 TikToks listos para grabar

═══════════════════════════════════════
RESTRICCIONES TÉCNICAS
═══════════════════════════════════════

- Stack: Vanilla JavaScript (NO React, NO Next.js). Mantener simple.
- La app debe seguir cargando desde empresa-os.vercel.app/viral
- NO romper la funcionalidad existente (los 4 generadores deben seguir funcionando)
- Usar las variables CSS para los colores de marca:
  --primary: #0B1F3A (azul marino)
  --accent: #C8A864 (dorado mate)
  --light: #F5F2EB (blanco roto)
  --dark: #1F2429 (gris carbón)
- Tipografía: Playfair Display (display) + Inter (body) via Google Fonts
- Watermark con símbolo hexagonal en header
- Header nuevo: "OPERA TU IMPERIO" en grande con paleta de marca

═══════════════════════════════════════
LO QUE QUIERO QUE HAGAS AHORA
═══════════════════════════════════════

1. LEÉ todos los archivos listados arriba (CLAUDE.md + JSON + PLAN + docs/marketing/*)
2. INSPECCIONÁ el código actual (viral.html, viral.js, base_conocimiento.json, api/)
3. NO toques nada todavía
4. DEVOLVEME un PLAN DE EJECUCIÓN paso a paso con:
   a) Resumen de la arquitectura propuesta (confirmando que entendiste)
   b) Lista de archivos a crear (nuevos JSONs si necesitás splitear el master)
   c) Lista de modificaciones a viral.html (qué secciones agregar/cambiar)
   d) Lista de modificaciones a viral.js (qué funciones nuevas)
   e) Orden de implementación (qué primero, qué después)
   f) Estimación: ¿cuánto código nuevo? ¿modular en archivos separados?
   g) Riesgos identificados
   h) Cualquier dato que necesites de mí antes de empezar

5. ESPERÁ mi confirmación antes de tocar código.

═══════════════════════════════════════
ESTILO Y REGLAS
═══════════════════════════════════════

- Idioma: español rioplatense, directo, sin floritura
- NO exageres bugs
- Sé MUY objetivo
- Prioridad: que TODA la data del JSON aparezca en la app (cero palabras se pierden)
- Mobile-first (porque se va a usar también desde celular)
- Auto-save de estados (qué pieza es "pendiente/producida/publicada") en localStorage
- Toggle dark/light si querés (pero por defecto: dark con paleta de marca)

ARRANCÁ leyendo. Después devolveme el plan.
```

---

# 📋 PASO 4 — Después del plan de Claude Code

Cuando Claude Code te devuelva el plan, revisalo. Si te parece OK, decile:

```
Dale, arrancá por la SECCIÓN A (Identidad) — los 3 tabs nuevos: Manifiesto, Identidad, Visual.

Trabajá tab por tab:
1. Implementás Manifiesto completo
2. Te pruebo en local (npx vercel dev)
3. Si está OK, commit + push (Vercel auto-deploya)
4. Pasás al siguiente tab

Después seguimos con Sección B (Psicología + Mis Redes), C (Re-Launch), D (Biblioteca).
NO toques los generadores existentes (Reels/Carruseles/Historias/YouTube) hasta el final.
```

---

# 📋 PASO 5 — Verificación tab por tab

Después de cada tab implementado:

1. **Abrí en local:** `npx vercel dev` → `http://localhost:3000/viral`
2. **Verificá:** que el tab aparezca, que la data del JSON se vea correctamente, que no rompa los tabs existentes
3. **Si OK:** `git add . && git commit -m "feat(viral): add tab Manifiesto" && git push origin main`
4. **Vercel auto-deploya** en ~30 segundos
5. **Probá en producción:** `https://empresa-os.vercel.app/viral`

---

# 📋 PASO 6 — Cuando terminen TODAS las tabs

Pedile a Claude Code:

```
Última pasada:
1. Verificá que TODA la data del JSON está siendo usada en la app
2. Buscá cualquier campo del JSON que no se renderiza en ningún lado
3. Verificá que TODOS los textos de "OPERA TU IMPERIO" estén consistentes
4. Optimizá performance (lazy load de tabs no visibles si la app pesa mucho)
5. Documentá en docs/viral-studio-readme.md cómo agregar contenido nuevo al JSON

Después commit final con mensaje:
"feat(viral): Opera tu Imperio OS v1.0 - reestructuración completa"
```

---

# ✅ CHECKLIST FINAL

Cuando todo esté hecho, verificá en producción que la app tiene:

## Sección A — Identidad
- [ ] Tab Manifiesto con eslogan + 6 variantes + manifiesto completo
- [ ] Tab Identidad con arquetipo + enemigo + tabla Ellos vs Vos + 15 frases + palabras prohibidas + palabras de marca + tono por canal
- [ ] Tab Visual con símbolo hexagonal + paleta 6 colores + tipografía + 6 escenarios de vestuario al detalle + gestos completos

## Sección B — Inteligencia
- [ ] Tab Psicología con 7 leyes + 32 tácticas + 18 casos históricos
- [ ] Tab Mis Redes con estado IG/TT/YT + bios nuevas + decisión handle YT (botones) + 7 acciones inmediatas (checklist)

## Sección C — Ejecución
- [ ] Tab Re-Launch con pre-launch días -7 a 0 + launch day + post-launch
- [ ] Tab Calendario con generador + plan fijo 30 días
- [ ] Tab Estrategia ampliada con eco histórico

## Sección D — Producción
- [ ] Reels mejorado con toggle "fórmula amplificada"
- [ ] Carruseles mejorado
- [ ] Historias mejorado
- [ ] YouTube mejorado con 3 variantes thumbnail
- [ ] Biblioteca NUEVO con 15 reels + 10 carruseles + 5 historias + 5 videos + 10 TikToks
- [ ] Sistema de estado (pendiente/producida/publicada) en localStorage

## Branding general
- [ ] Header con "OPERA TU IMPERIO" + símbolo hexagonal dorado
- [ ] Paleta azul marino + dorado en TODA la app
- [ ] Tipografía Playfair Display + Inter
- [ ] Mobile responsive

## KPIs
- [ ] Dashboard de KPIs con baseline (IG 47K, TT 640, YT 5K) vs objetivos día 30

---

# 🆘 Si algo se rompe

```
Hubo un problema con [X tab]. Revertí los cambios y arrancá de nuevo desde [Y].
Decime qué falló para evitarlo en la próxima.
```

O hacé rollback manual:
```bash
git log --oneline | head -10        # Ver últimos commits
git revert <commit-hash>            # Revertir un commit específico
git push origin main                # Empuja la reversión
```

---

# 📊 DESPUÉS DE TODO IMPLEMENTADO

Cuando la app esté lista, podés:

1. **Compartirla con tu equipo** (Nicolás PM, Carlos, etc.) — ellos pueden ver el plan completo
2. **Usarla desde el celular** para chequear el calendario / marcar piezas publicadas
3. **Generar contenido nuevo** usando los generadores potenciados
4. **Acceder a la biblioteca** de piezas listas cuando necesites contenido rápido
5. **Trackear KPIs** para ver progreso del re-launch

---

# 💡 IDEAS FUTURAS (post v1.0)

Para versiones siguientes:

- **Integración con Buffer/Metricool** — programar piezas desde la app
- **Analytics de IG/TT/YT** — pull de métricas reales vía API
- **Editor visual de carruseles** — generar imágenes en Canva-style
- **Voice clone** — generar voiceover con tu voz para los reels
- **A/B testing automático** — generar 5 variantes de un reel y comparar
- **Sharing con tu equipo** — login para que Nicolás PM y Carlos puedan colaborar
- **Modo "agente"** — la app sugiere qué publicar HOY basado en el ritmo siembra/cosecha

---

_Plan creado: 29 Jun 2026_
_Después de implementar: la app vive como sistema operativo completo de tu marca personal_

**OPERA TU IMPERIO. 🎯**
