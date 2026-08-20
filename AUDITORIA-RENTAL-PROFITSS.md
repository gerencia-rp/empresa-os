# AUDITORÍA RENTAL PROFITSS — Flipping Rentals OS

> Fuente de verdad del proceso de auditoría/corrección. Se actualiza por lote.
> Rama: `feat/portal-inversionista-v2` · Deploy que ve el CEO: **empresa-os-admin.vercel.app**
> Regla de oro: **un dato, una fuente** (Airtable manda; la app no recalcula lo que la fuente ya tiene).

---

## FASE 0 — LÍNEA BASE (2026-08-20)

- **Rama:** `feat/portal-inversionista-v2`. Divergencia con `main`: **56 adelante / 36 atrás**.
  → Esto explica los "bugs fantasma": el CEO en `empresa-os` (servido desde `main`) NO ve 56 commits
  de la rama, y la rama no tiene 36 de main. **Decisión de negocio pendiente** (ver abajo).
- **Scripts:** `build` (scripts/build.mjs), `ci:gate` (scripts/ci-gate.mjs, requiere `SB_KEY`),
  `gate:lineage`, `lineage:register`. No hay tests unitarios ni linter configurado (recomendación al final).
- **ci:gate baseline:** requiere `SB_KEY=sb_secret_…` (no disponible en este entorno sin exportarla).
  Se corre `node --check` sobre los `.js` tocados y `node scripts/build.mjs` como gate local.
- **Diagnóstico de partida:** `DIAGNOSTICO-EMPRESA-OS/DIAGNOSTICO-59-AJUSTES.md` (59 ajustes) +
  `HALLAZGOS-EXPERTOS-agentes.md` (P0/P1/P2 con archivo:línea). Consumidos completos.

---

## FASE 1 — VERIFICACIÓN CONTRA FUENTES REALES (Supabase prod `nezbaljfhhyznhltpjnk`)

Verificado por consulta directa (MCP Supabase) — no se confió ciegamente en el diagnóstico:

### Déficit (Items 04/05, D-P0-1..4) — CONFIRMADO
`ff_deals.deficit_total` (Airtable) es la fuente. Está **null** en obras en curso (Charles, Bitter Creek,
Starbright, Wellington, Denfield, Arthur, Harvest, Slaughter, Arcadia, Capps) y con valor real en rentadas
(Virginia 70.529, Stonleigh 70.855, Echo 36.391, Nesting 17.072…). El `ff_draws.net_total` da números
**totalmente distintos** (Capitol: Airtable=0 vs net_total=−22.750; Virginia: 70.529 vs −750).
→ La app (os.js:395 y `v_ff_portafolio.deficit`) usa `net_total`/fórmula CEO, **no** la fuente Airtable.
**Elección de fuente = decisión de negocio (Opción A vs B) → pendiente CEO.** Los bugs asociados (semáforo
siempre rojo, "faltan draws" con rehab cargado) SÍ se corrigen sin esa decisión.

### Líder = rec ID (Item 03) — CONFIRMADO + causa raíz encontrada
`remodel_at_properties.lider` guarda **strings de rec IDs separados por coma** ("rec…, rec…").
Causa: `sync-remodel-airtable/index.ts:159-162` (`resolveLinked`) solo matchea un recID **único**
(`/^rec…$/`), no un string con comas → devuelve el crudo. Los nombres SÍ existen en
`airtable_record_names` (Óscar Pineda, Adrián Arriaga, Eduardo Segundo, Jose Pineda…, de "Cuadrillas"/
"Personal en Campo"). **FIX aplicado (Batch 1):** resolver en display desde esa tabla (fuente única de
nombres) + nota para arreglo durable en el sync.

### "faltan draws" falso (Item 05a) — CONFIRMADO
Charles St: `remodel_real`=$110.000, `ff_draws`=$0 → la app dice "faltan draws". Igual Bitter Creek ($80k).
`remodel_real` (de Airtable) es un all-in válido. **FIX aplicado (Batch 1):** no marcar "faltan draws"
cuando hay `remodel_real`; el flag queda solo cuando no hay ni draws ni remodel_real.

---

## FASE 2 — PRIORIZACIÓN (consolidado 59 ajustes + hallazgos expertos)

Orden por severidad × impacto de negocio × riesgo de la corrección:

| # | Lote | Ítems | Riesgo | Estado |
|---|------|-------|--------|--------|
| B1 | Fixes CEO-facing verificados sin decisión de negocio | 03 (Líder), 05a (faltan draws) | Bajo | **✅ EN CURSO** |
| B2 | Seguridad P0 | Edge fns de escritura sin auth + CORS `*` (P0-SEG-1/2) | Medio (crons) | Pendiente |
| B3 | SVG crudo + consolidación de deploy | 26/47, P0-DEPLOY-3 | Bajo/Medio | Pendiente (ver nota SVG) |
| B4 | Un dato una fuente — Rentas | 27 (unidades 51/ocupación por reservas), 31 (gastos clasificador único), 35 (cartera única) | Medio | Pendiente |
| B5 | Un dato una fuente — Fix&Flip/Portal | 04/05b (déficit — **requiere decisión CEO**), 09 (renta real NOI/DSCR), 08 (TIR holds cortos) | Medio | Pendiente |
| B6 | Remodelación / EVM | 39/40/48/52/53/57 (nómina dedupe, EVM única, conteo obras único) | Medio-Alto | Pendiente |
| B7 | UX / rediseño | 01,24, lenguaje simple EVM (54), ficha 360° (06/37/50) | Bajo | Pendiente |
| B8 | Features | 23/25/46 (Cerebro IA), 15/33/38/51 (informes/distribuciones) | Requiere insumos CEO | Pendiente |

### Nota SVG (Item 26/47)
El markup `<svg class="icn">` crudo **no existe en la rama** (grep 0 resultados). Es del **prod viejo**
(`main`/empresa-os). Se resuelve consolidando el deploy (B3), no con un cambio de código en la rama.

---

## DECISIONES DE NEGOCIO PENDIENTES (no las asumo — Regla 7)

1. **Consolidación de deploy:** ¿fusionar `feat/portal-inversionista-v2` → `main` y apuntar el dominio prod
   a main? Hoy `main` (empresa-os) muestra bugs ya arreglados. Riesgo: main tiene 36 commits que la rama no
   — hay que revisar qué son antes de fusionar.
2. **Fuente del déficit (Item 04):** Opción A = `ff_deals.deficit_total` (Airtable, "un dato una fuente") ó
   Opción B = mantener fórmula CEO y cargar los draws faltantes. Afecta Command Center, Pipeline, ficha, dashboard.
3. **Horizontes:** unificar en **3/5/8** ó **4/6/8** (hoy conviven). Recomendación del paquete: 3/5/8.
4. **Cerebro IA:** proveedor/API (Anthropic vs OpenAI) + key + alcance (solo datos del inversor vs conocimiento del negocio).
5. **Deuda Airtable (~$4.98M) vs QuickBooks (~$5.97M):** reconciliar el ~$1M (definición operativa vs contable).
6. **Ledger / Documentos / Mensajes:** ocultar (reversible), no borrar — confirmar.

---

## FASE 3 — CORRECCIÓN (bitácora por lote)

### Batch 1 — Líder recID + "faltan draws" falso  · 2026-08-20 ✅

**Item 03 — "Líder" mostraba rec ID crudo → ahora muestra el nombre.**
- `os/os.js`: nuevo `osResolveNames(v)` (resuelve uno o varios rec IDs separados por coma contra
  `OS.recNames`, cargado de `airtable_record_names` = fuente única rec→nombre). Aplicado al render del
  Líder en la ficha de obra. Antes: `recF0K8ERJoI5JGS5` → Ahora: `Óscar Pineda, Adrián Arriaga…`.
- `supabase/functions/sync-remodel-airtable/index.ts`: `resolveLinked` ahora parte strings con coma y
  resuelve cada rec ID (fix durable). **No redeployado este lote** (el resolver de display ya corrige la
  UI; el deploy de la edge fn queda listo para B2/B6). No fuerza resync de prod.

**Item 05a — "faltan draws" falso con `remodel_real` cargado.**
- `os/os.js`: cuando el all-in usa `remodel_real` (Airtable), ya NO se marca "(faltan draws)" ni el flag
  `faltan` — es un all-in válido. El flag queda solo si no hay ni draws ni remodel_real (solo estimado).
  Verificado: Charles St ($110k remodel_real, draws $0) deja de decir "faltan draws".

**No tocado (decisión de negocio):** la FUENTE del número de déficit (Item 04, Opción A/B) — pendiente CEO.
**Verificación:** `node --check os/os.js` OK · `node scripts/build.mjs` OK (bundle 95c37a4815ea).

