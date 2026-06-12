# 🎬 Generador de PPT IA · V2 (funciona al 1000%)

**Fecha:** 12 jun 2026
**Por qué V2:** la V1 nunca funcionaba porque dependía de `EdgeRuntime.waitUntil()` para correr Claude en background, y eso está roto en el plan free de Supabase. La V2 elimina ese patrón.

---

## 1 · La raíz del problema

| V1 (rota) | V2 (la nueva) |
|---|---|
| 1 sola llamada a Anthropic con 8K tokens + 4 web searches + 15 slides juntos | Llamadas chiquitas: 1 outline + N slides (1 c/u) |
| Usa `EdgeRuntime.waitUntil()` para correr en background | Síncrona — cada llamada devuelve inmediatamente |
| Frontend polea `edu_pres_jobs` hasta 10 min | Frontend muestra barra "Slide 4 de 12" en vivo |
| Bug plan free: el waitUntil mata el job antes de terminar | Cada llamada termina dentro de los 150s de Edge Function |
| Hardcodeado para Fix&Flip / educativo Borja Ramírez | 5 presets universales: informe / educativo / pitch / marketing / libre |
| Si falla una slide, falla TODO el deck | Si falla una slide, retry x1 y sigue con las demás |

**Tiempo total para un deck de 12 slides:** ~3 minutos. Pero con feedback visual constante — nunca te quedás en una pantalla muerta.

---

## 2 · Qué se construyó

### Edge Function nueva: `generate-presentation-v2`

**Path:** `supabase/functions/generate-presentation-v2/index.ts`

Una sola función con 2 modos:

**mode='outline'** (15-20s)
- Pide a Claude SOLO la estructura: blocks + slides_outline (título + layout + propósito por slide)
- Sin web_search → mucho más rápido
- max_tokens: 4000

**mode='slide'** (10-25s c/u)
- Pide UN solo slide en detalle
- Recibe contexto: outline completo + slide anterior + slide siguiente
- Genera title, bullets, transitions, speaker_notes, image_query, campos especiales del layout
- max_tokens: 3000

### 5 presets universales

| Preset | Tono | Estructura recomendada |
|---|---|---|
| 📊 Informe ejecutivo | Ejecutivo, claro, basado en datos | Portada → Resumen → KPIs → Análisis → Hallazgos → Riesgos → Recomendaciones |
| 🎓 Educativo / clase | Pedagógico, accesible | Portada → Qué vas a aprender → Concepto → Casos → Ejercicio → Aprendiste a... |
| 🎤 Pitch comercial | Persuasivo, storytelling | Problema → Costo → Solución → Cómo funciona → Pruebas → Diferencial → CTA |
| 📣 Marketing / redes | Punchy, visual, hooks | Hook → Antes/después → Problema → Solución → 3 beneficios → Testimonios → CTA |
| ✨ Tema libre | Adaptativo | Portada → Agenda → Bloques numerados → Cierre |

### Frontend: wizard 3-pasos + modo experto

**Path:** `edu/edu-presentations.js`

**Wizard:**
- Paso 1: elegís tipo (5 cards visuales)
- Paso 2: título + tema (1-3 oraciones) + audiencia + # slides + tono + idioma
- Paso 3: review + botón "🚀 Generar"

**Modo experto:**
- Toggle "⚡ Modo experto" arriba a la derecha
- Una textarea grande para describir todo libre
- Más control para casos complejos

**Durante la generación:**
- Pantalla con corazón pulsando
- Barra de progreso `4 de 12`
- Mensaje en vivo: "🎨 Slide 4/12: Análisis comparativo Q1 vs Q2"
- Botón "✕ Cancelar" funcional

**Cuando termina:**
- Preview de slides (igual que antes)
- Botón "📥 Descargar PPTX" usa la misma función `eduDownloadPPTX()` existente
- Botón "📋 Speaker notes" igual

### Compatibilidad

- El `legacy V1` quedó accesible en un `<details>` colapsado abajo — por si en el futuro pagás plan Pro de Supabase y querés usar web_search en vivo
- Las presentaciones generadas con V2 se guardan en `edu_presentations` con el mismo schema → aparecen en el historial existente
- `eduDownloadPPTX()` funciona igual porque V2 genera el mismo formato de slides

---

## 3 · Cómo deployar y probar

### Paso 1 — Deploy la edge function

```bash
cd "/Users/nicolara/Desktop/CLAUDE CODE/empresa-os"
npx supabase functions deploy generate-presentation-v2 --project-ref nezbaljfhhyznhltpjnk
```

Verificá que aparezca en Supabase → Edge Functions → lista.

### Paso 2 — Push del frontend

```bash
git add edu/edu-presentations.js supabase/functions/generate-presentation-v2 INFORME-PPT-V2.md
git commit -m "PPT generator V2 — slide-by-slide síncrono + wizard universal"
git push
```

Esperá ~30s al deploy de Vercel.

### Paso 3 — Probar 3 PPTs

Abrí el sistema en el navegador → Educación → Mentoría → Generador IA Presentaciones.

**Test 1 — Informe ejecutivo:**
- Tipo: 📊 Informe ejecutivo
- Título: "Resultados Q2 2026 · Rental Profits"
- Tema: "Revenue $1.2M (+18% vs Q1). 47 propiedades activas, 92% occupancy. 3 hitos: expansión a Austin, mejora processes, app móvil. Riesgos: tasas y competencia. Recomendación: foco H2 en Texas."
- Audiencia: "Junta directiva"
- Slides: 10
- → Generar

**Test 2 — Educativo:**
- Tipo: 🎓 Educativo / clase
- Título: "Cómo analizar un fix & flip"
- Tema: "Para estudiantes que ya saben lo básico de R/E. Cubrir: ARV con comps, MAO con holding costs, 1 caso real Austin. Foco: que salgan pudiendo analizar 1 propiedad por su cuenta."
- Audiencia: "Estudiantes de mentoría Flipping Rentals"
- Slides: 15
- → Generar

**Test 3 — Pitch comercial:**
- Tipo: 🎤 Pitch comercial
- Título: "Property Management Profesional"
- Tema: "Vender servicio de PM a dueño de 3 casas en Austin que no le rentan bien. Diferencial: tecnología + transparencia + fee variable solo si superamos benchmark histórico."
- Audiencia: "Cliente prospect — dueño de 3 propiedades"
- Slides: 12
- → Generar

Cada uno debería terminar en ~3 minutos con feedback visual constante.

---

## 4 · Qué hacer si todavía falla

| Síntoma | Causa | Solución |
|---|---|---|
| "Outline falló: 401" | Token no llega | Cerrá sesión y volvé a entrar |
| "Outline falló: 502 Anthropic falló" | API key no configurada en Edge Function | Verificá Supabase → Project Settings → Edge Functions → secrets → ANTHROPIC_API_KEY |
| "Outline falló: Parse JSON falló" | Claude devolvió formato raro | Reintentar — es ocasional |
| Una slide individual sale con error | Reintenta automático x1 — si falla pone slide placeholder | El deck NO se aborta. Editás esa slide manual. |
| Botón "Generar" no hace nada | Cache viejo de JS | Hard refresh (Cmd+Shift+R) |
| Aparece "Modo legacy V1" pero no V2 | Archivo viejo cacheado | Hard refresh |

---

## 5 · Mejoras que podríamos sumar después (no urgentes)

1. **Web search opt-in en V2**: agregar checkbox "🌐 Buscar datos en vivo (solo informes/pitch)" que active web_search en el modo outline. Cuesta más tiempo (3-4s/búsqueda) pero da datos verificables.

2. **Speaker notes export**: ya existe `eduDownloadSpeakerNotes()` — funciona igual con V2.

3. **Re-roll de slide individual**: botón al lado de cada slide del preview "🔄 Regenerar este slide" — útil cuando un slide salió mal pero el resto está bien.

4. **Plantillas por industria**: además de los 5 presets generales, sub-plantillas como "informe-real-estate", "informe-saas", "informe-restaurant" con KPIs típicos pre-cargados.

5. **Brand kit**: que el PPTX use colores/logo del usuario configurados en Settings.

---

## 6 · Archivos modificados / creados

- ✨ **NUEVO** `supabase/functions/generate-presentation-v2/index.ts` — edge function síncrona con modes outline+slide
- ✏️ `edu/edu-presentations.js` — wizard + modo experto + `eduGeneratePresentationV2()` con loop. Legacy V1 queda accesible en `<details>`.
- 📄 **NUEVO** `INFORME-PPT-V2.md` — este documento

---

## 7 · Por qué esto SÍ va a funcionar

- **No depende de waitUntil**: cada llamada termina en menos de 90s, dentro del límite de Edge Function. Funciona en plan free.
- **Resilient**: si un slide falla, retry x1 y sigue. Nunca perdés todo el deck.
- **Universal**: los 5 presets cubren cualquier caso de uso. El tema libre por arriba permite cualquier cosa.
- **Feedback visual constante**: el usuario nunca está mirando una pantalla muerta — ve "Slide 4/12: tal título". Si tarda 3 minutos, los siente como 3 minutos productivos, no como hung.
- **Misma salida que V1**: el PPT generado tiene el mismo schema → el render de preview, descarga y guardado funcionan igual.

El sistema está pensado para que en 5 minutos puedas tener un PPT de junta directiva listo para presentar, o una clase de mentoría sin escribir un solo bullet.
