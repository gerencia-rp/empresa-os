# Reporte Nocturno — 30 jun 2026

## Resumen ejecutivo
- **Fases completadas: 2/3 ✅ + 1 SKIP** (Fase 3 ✅ · Fase 4 ⏸️ SKIP por falta de API key de embeddings · Fase 5 ✅)
- **Commits totales (misión): 5**
  - `d153f53` — Fase 3 OCR vision
  - `3a4709a` — Fase 4 RAG pgvector (SKIP)
  - `57fc1cf` — Fase 5 insights
  - `1773813` — endpoint delete-generation
  - (+ PASO 0 y limpiezas finales vía service role, sin commit)
- **Costo API estimado:** < USD 0.30 (solo ~3-4 llamadas vision Sonnet 4.5 para OCR; el seed y los insights no usan API). El RAG no consumió nada (SKIP).
- **Tiempo:** ~1 sesión continua. Todo pusheado a `main`, Vercel auto-deployó, verificado en `empresa-os.vercel.app/viral`.
- **DB final: limpia** (todas las tablas en 0).

---

## PASO 0 — Limpieza demo
- ✅ Borrada la pieza demo "$18K por Excel" + su `content_published` + `content_metrics` (cascade).
- Confirmado: `content_generations`, `content_published`, `content_metrics` → **0**.

---

## Detalle por fase

### Fase 3 — OCR Vision · ✅
- **Commit:** `d153f53`
- **Estado:** completa y verificada E2E.
- **Decisiones:** modelo `claude-sonnet-4-5` con vision, reusando el helper `_shared/anthropic.ts` (`callAnthropic` + `extractText`). Compresión client-side con canvas (maxW 1400, JPEG .85) para no superar límites. Falla suave: si el JSON sale inválido devuelve `raw` y el user llena manual.
- **Backend:** `supabase/functions/extract-metrics-from-image` → `{ extracted, confidence, notes }`. Convierte "1.2K"→1200.
- **Frontend:** botón "📸 Subir pantallazo" en el form de métricas → autocompleta los campos + muestra confianza/notas. El user corrige antes de guardar.
- **E2E verificado:**
  1. Curl con imagen de analytics real → extrajo views 12345, likes 678, saves 156, profile_visits 89 (confidence **high**).
  2. Browser: imagen generada en canvas ("Views 9,876…") → la función extrajo views 9876, likes 432, saves 111 → **autocompletó 5 campos del form** (mf-views=9876, mf-saves=111). ✅
- **Bugs encontrados:** ninguno. (Nota: `file_upload` del browser MCP no acepta paths del host; verifiqué el path completo generando la imagen dentro del browser — equivalente funcional.)

### Fase 4 — RAG pgvector · ⏸️ SKIP
- **Commit:** `3a4709a`
- **Estado:** **SKIP** — todo el código creado, migración aplicada y funciones deployadas, pero **sin backfill** porque no hay API key de embeddings en Secrets (solo está `ANTHROPIC_API_KEY`, y Anthropic no genera embeddings).
- **Lo que SÍ quedó hecho y deployado:**
  - Migración `20260630000000_rag_embeddings.sql`: `CREATE EXTENSION vector` + tabla `generation_embeddings VECTOR(1024)` + índice ivfflat + RPC `match_generations` (join generations+published+última métrica, orden por similarity y views). **Aplicada en prod.**
  - `generate-embedding`: Voyage `voyage-3-lite` (primario) → OpenAI `text-embedding-3-small` (fallback) → `{skipped:true}` si no hay key. Incluye modo `backfill`.
  - `search-similar-generations`: embeb query → `match_generations`. Soft `[]` sin key.
  - Integración en `viral-context-builder.js` (`build` + `buildLibre`): antes de armar el prompt, `studioGenerate` hace `searchSimilar`; si ≥3 resultados con similarity > 0.65 inyecta bloque "EJEMPLOS DE TU HISTORIAL" + panel "📈 Inspirado en N reels exitosos". Cada generación nueva se auto-embebe.
  - **Todo INERTE / soft-fail sin key:** verificado que `generate-embedding`→`{skipped:true}` y `search-similar`→`{results:[],skipped:true}`. Studio sigue funcionando normal (sin inyección RAG).
- **E2E:** parcial — verificado el soft-fail y que no rompe Studio. NO se pudo verificar el retrieval real (no hay embeddings sin key).
- **Decisión técnica (más barato + probado):** Voyage `voyage-3-lite` recomendado (1024 dim, ~5x más barato que OpenAI, calidad buena para retrieval corto).

#### 🔑 Instrucciones para ACTIVAR Fase 4 (Voyage — recomendado)
1. Ir a **https://www.voyageai.com** → Sign up (tiene free tier: 200M tokens gratis).
2. Dashboard → **API Keys** → **Create**.
3. Supabase → Project Settings → **Edge Functions → Secrets** → Add: `VOYAGE_API_KEY = <tu key>`.
   (o por CLI: `supabase secrets set VOYAGE_API_KEY=<tu key>`)
4. Correr el backfill 1 vez (embeb las generaciones existentes):
   ```
   curl -X POST "https://nezbaljfhhyznhltpjnk.supabase.co/functions/v1/generate-embedding" \
     -H "Authorization: Bearer <ANON_KEY>" -H "Content-Type: application/json" \
     -d '{"backfill":true}'
   ```
5. Listo: a partir de ahí Studio inyecta ejemplos del historial automáticamente.
- **Alternativa OpenAI:** si usás `OPENAI_API_KEY` en vez de Voyage, el modelo `text-embedding-3-small` devuelve **1536 dims** → hay que recrear la tabla/índice/función con `VECTOR(1536)` (cambiar `20260630000000_rag_embeddings.sql` y re-aplicar). Voyage 1024 es plug-and-play con lo ya aplicado.

### Fase 5 — Insights automáticos · ✅
- **Commit:** `57fc1cf`
- **Estado:** completa y verificada E2E.
- **Decisiones:** corre con ≥3 mediciones (no 5). Calcula: top enemigo por avg views (con % vs promedio), top avatar por engagement, guiado vs libre, mejor tipo, mejor día de semana. Guarda cada batch en `insights` (JSONB + flag `read`). El frontend **humaniza** los ids (enemigo/avatar) → nombres legibles.
- **Backend:** `compute-insights` (con guard `<3 → {need_more, count}`), `get-insights`, `mark-insight-read`.
- **Frontend:** cards "🧠 Insights" arriba del dashboard (prioridad alta/media/baja, evidencia, dismiss local por card + "Marcar leídos" del batch). Si <3 piezas: mensaje "necesitás 3".
- **E2E verificado:**
  1. Curl con 4 piezas seed variadas → 5 insights (Enemigo "contratistas" +78% prioridad alta, Avatar, Modo guiado vs libre, Formato reel, Martes mejor día). ✅
  2. Browser: tab Métricas mostró las 5 cards con **nombres humanizados** ("Los Contratistas que se Robaron tu Plata", "El Empleado Profesional que quiere EMPEZAR") + KPIs (4 publicados, avg 11.250, top 20.000) + Top 10. ✅ (screenshot tomado)
- **Bugs encontrados:** ninguno funcional. Mejora aplicada: humanizador de ids→nombres en las cards.
- **pg_cron:** NO configurado (opcional). Se puede agregar después; por ahora `compute-insights` se dispara al abrir la tab Métricas.

---

## Limpieza final
- ✅ Borradas las 4 piezas seed de Fase 4/5 + sus published/metrics (cascade) + el batch de insights.
- Confirmado **todas las tablas en 0**: `content_generations`, `content_published`, `content_metrics`, `generation_embeddings`, `insights`.

---

## DB state actual (limpio, listo para data real)
| Tabla | Filas |
|---|---|
| content_generations | 0 |
| content_published | 0 |
| content_metrics | 0 |
| generation_embeddings | 0 |
| insights | 0 |

**Tablas nuevas creadas esta noche:** `generation_embeddings` (pgvector), `insights`.
**Edge functions nuevas:** `extract-metrics-from-image`, `generate-embedding`, `search-similar-generations`, `compute-insights`, `get-insights`, `mark-insight-read`, `delete-generation`.

---

## Pendientes para mañana
1. **Activar Fase 4 (RAG):** generar `VOYAGE_API_KEY` (instrucciones arriba) + correr backfill. Sin esto, el RAG está inerte (no rompe nada, solo no inyecta historial).
2. Empezar a cargar **data real**: generar piezas en Studio, publicarlas, cargar métricas (o pantallazos con OCR). Con ≥3 mediciones aparecen los insights.

## Próximos pasos sugeridos
- Cuando haya ~10-15 piezas con métricas reales: los insights y (con Voyage activo) el RAG empiezan a ser realmente útiles.
- Considerar `pg_cron` para `compute-insights` semanal (lun 9am) una vez que haya flujo constante de data.
- Eventual: endpoint para múltiples mediciones temporales por pieza (ya soportado por `content_metrics`, falta UI para ver la evolución).
- Eventual: botón "borrar" en Biblioteca usando el nuevo `delete-generation`.

---

## Safeguards respetados
- ✅ No modifiqué secrets ni claves existentes.
- ✅ No toqué tablas existentes (solo añadí `generation_embeddings` e `insights`).
- ✅ Solo borré los datos dummy indicados (demo + seeds de prueba).
- ✅ Creé `delete-generation` (lo sugería el mission).
- ✅ Ninguna edge function falló 3 veces seguidas; todos los commits pushearon al primer intento.

**Buenas noches. Todo deployado, verificado y limpio. 🌙**
