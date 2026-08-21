TAREA: CONSOLIDACIÓN rama ↔ main (el paso delicado). Hacelo con MÁXIMO cuidado.
Objetivo final: UNA sola app = la lógica y datos CORRECTOS de la rama
(feat/portal-inversionista-v2) + Portal Inversor v2 + TODOS los arreglos de la auditoría,
MÁS las features/estética de main: el sistema "Jarvis / Agent Network" y el REBRAND de
diseño "royal/cálida". El diseño ganador es el rebrand royal/cálida, pero montado sobre
la base sana de la rama.

═══════════════════════════════════════════
REGLA DE ORO DE ESTE MERGE (inquebrantable)
═══════════════════════════════════════════
En CUALQUIER conflicto, GANA la versión de la RAMA en todo lo que sea DATOS/LÓGICA/NÚMEROS
(déficit = ff_deals.deficit_total; horizontes 3/5/8; cartera única; renta = rent-roll
actual para NOI/DSCR; XIRR sin anualizar holds <1año; nómina deduplicada; unidades;
seguridad de edge functions). De main solo se toma la CAPA VISUAL (tokens/CSS del rebrand)
y las FEATURES NUEVAS (Jarvis/Agent Network) — nunca su lógica de números vieja.

═══════════════════════════════════════════
PASO 0 — Respaldos y rama de trabajo (antes de tocar nada)
═══════════════════════════════════════════
1. Verificá que existe el tag backup-main-antes-fusion; si no, crealo y pusheá.
2. Creá y pusheá un segundo respaldo: git tag backup-rama-antes-merge && git push origin backup-rama-antes-merge
3. Creá una rama nueva DESDE la rama de trabajo: git checkout -b merge/consolidacion
   NUNCA trabajes el merge sobre main ni sobre feat/portal-inversionista-v2 directamente.

═══════════════════════════════════════════
PASO 1 — Entender la divergencia (solo lectura)
═══════════════════════════════════════════
- git log --oneline feat/portal-inversionista-v2..main  → qué tiene main y la rama no.
- git log --oneline main..feat/portal-inversionista-v2  → qué tiene la rama y main no.
- git diff --stat main...feat/portal-inversionista-v2
- Clasificá los cambios de main en: (A) ADITIVOS separables (archivos nuevos de Jarvis/
  Agent Network; archivos de tokens/tema del rebrand) y (B) cambios que TOCAN los 4 core:
  os.js, ff-command-center.js, inv-portal.js, inv-admin.js. Escribí esta clasificación en
  MERGE-CONSOLIDACION.md.

═══════════════════════════════════════════
PASO 2 — Traer lo ADITIVO primero (bajo riesgo)
═══════════════════════════════════════════
- Traé de main los ARCHIVOS NUEVOS de Jarvis/Agent Network (los que no existen en la rama):
  git checkout main -- <ruta> para cada uno, o cherry-pick de los commits puramente aditivos.
- Traé la capa de diseño del rebrand (tokens.css / variables de tema / assets). Aplicá el
  look royal/cálida a nivel de tokens, sin reescribir la lógica de los módulos.
- Build + verificación rápida de que la app carga. Commit atómico por bloque.

═══════════════════════════════════════════
PASO 3 — Los 4 archivos core (alto riesgo, uno por uno)
═══════════════════════════════════════════
Para os.js, ff-command-center.js, inv-portal.js, inv-admin.js: NO hagas un merge ciego.
Partí de la versión de la RAMA (tiene los arreglos) y traé SOLO los cambios visuales/de
feature de main que no toquen los cálculos. Si un cambio de main pisa un número corregido,
descartalo. Verificá a mano cada fórmula tocada.

═══════════════════════════════════════════
PASO 4 — VERIFICACIÓN OBLIGATORIA (gate; si falla, revertí)
═══════════════════════════════════════════
Después de consolidar, corré ci:gate/build y RE-VERIFICÁ contra Supabase (datos reales) que
NINGÚN número se dañó. Deben seguir dando exactamente:
  • Déficit total del portafolio activo = $297,690 (Σ ff_deals.deficit_total).
  • Capitol = $0 · Virginia = $70,529 · Stonleigh = $70,855 (deficit_total).
  • Cartera vencida = $18,636.01 (v_cartera_kpi) igual en /cartera, /cobros, /dashboard.
  • Horizontes = 3/5/8 en todo el sistema (una sola constante).
  • XIRR no anualiza holds <1 año.
Si CUALQUIERA regresó a un valor viejo/errado, o el build rompe: revertí la rama
merge/consolidacion a backup-rama-antes-merge, dejá TODO documentado en
MERGE-CONSOLIDACION.md y NO sigas. Reportá qué archivo lo rompió.

═══════════════════════════════════════════
PASO 5 — Publicar (sin tocar el dominio de prod aún)
═══════════════════════════════════════════
- Solo si el PASO 4 pasó 100%: desplegá merge/consolidacion a empresa-os-admin para que el
  CEO lo vea (npx vercel --prod --yes --scope rental-profits).
- Fusioná merge/consolidacion → main con --no-ff (con los respaldos ya hechos). Push a main.
- NO cambies qué proyecto Vercel sirve el dominio de producción principal: dejá ese paso
  DOCUMENTADO en MERGE-CONSOLIDACION.md como acción manual del CEO (es lo único
  irreversible de cara al usuario final).
- Escribí el resultado (qué se trajo, qué ganó en cada core, verificación) en
  MERGE-CONSOLIDACION.md y AUDITORIA-RENTAL-PROFITSS.md.

Cuando la consolidación esté publicada y verificada (o parada de forma segura por el gate),
escribí EXACTAMENTE al final:
    === MERGE COMPLETO ===
