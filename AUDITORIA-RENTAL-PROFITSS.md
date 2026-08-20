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
Commit `0435f8e`. **Desplegado y verificado EN VIVO** en empresa-os-admin.vercel.app (bundle 95c37a4815ea
contiene `osResolveNames` y "rehab real (Airtable)"). ⚠ Deploy: el push NO auto-deploya; se disparó con
`npx vercel --prod --yes --scope rental-profits` (sin `--scope` → "Not authorized").

---

### Batch 2 — Déficit fuente ÚNICA = ff_deals.deficit_total · 2026-08-20 ✅ (decisión CEO desbloqueada)

El CEO fijó la fuente: **`ff_deals.deficit_total` (Airtable), la app NO recalcula.** Convención:
**caja atrapada = magnitud POSITIVA** (se recupera al refi/venta) · `null` = obra en curso / no
estabilizada (no se inventa número) · `<=0` = recuperado. Verificado en Supabase: Σ activas =
**$297,690.36** (18 casas con dato), **5 casas** con caja atrapada > $20k (Stonleigh 70.855, Virginia
70.529, Bartlett 40.000, Echo 36.391, Dove 30.430).

- **os.js** (`9eb29a9`): per-casa `deficit` desde `d.deficit_total`; consumidores (alertas, insight de ficha,
  tarjeta Equity, línea de salida) a la nueva convención. Antes usaba `dr.net_total` (otro número:
  Capitol −$37.964 vs Airtable 0).
- **ff-command-center.js** (`9eb29a9`): ~16 sitios convertidos; `deficitAcum = Σ deficit_total` (obras en
  curso = null → no suman) = **$297,690**, MISMO número que el Dashboard (os-dash ya lo usaba). Draws
  neto del ciclo (`dr.net_total`, tablas "sanas"/ingeniería inversa) se conservan como concepto aparte.
- **Portal inversor** (`e00cabd`, migr `20260820120000`): RPC `inv_portal_resumen.deficit` ahora =
  `greatest(0, deficit_total)` — MISMA fuente que ficha/admin. Antes `greatest(0,-utilidad_neta_post_interes)`
  de v_pnl_casa daba un número distinto (Virginia 29.982 vs 70.529). JS: chip "Airtable", se quita el
  desglose que no sumaba; el déficit modelado del ciclo se relabela "Cash máximo usado en el ciclo (modelo)".
- **os-dash.js**: ya usaba `Σ ff_deals.deficit_total` → sin cambios, ahora consistente con todo.

Cierra: D-P0-1/2/3/4, C-P0-3. **Falta propagar** a `ff-analitica.js` (salud usa flujo mensual, otro criterio —
queda para el lote de semáforo por estado) y a inv-engine `fases.fase0` (modelo del ciclo, ya relabelado).

### Batch 3 — Horizontes 3/5/8 FIJO (constante única HORIZONTES) · 2026-08-20 ✅ (`8e6c314`)

Decisión CEO. `window.HORIZONTES=[3,5,8]` definido en **inv-engine.js** (fuente única). **inv-portal.js**
(selector + defaults 6→5) e **inv-admin.js** (BLOQUE 3 default 6→5, selector) leen `(window.HORIZONTES||[3,5,8])`.
Eliminado el set 4/6/8 que convivía con 3/5/8 (un inversor veía ambos en la misma casa). Golden inv-rehab
**24/24** (tir31/vpn31 intactos).

## GROUNDING ADICIONAL PARA PRÓXIMOS LOTES (verificado en prod)

### B4 · Unidades / ocupación (Item 27) — CONFIRMADO
`pm_units`: **98** filas con `active=true`, de las cuales solo **47** tienen `is_active=true` (y **51** con
`is_active=false` = legacy). `pm_properties active`=20. **Reservas vigentes hoy** (start≤hoy≤end o sin fin)=**37**.
- El **OS Global ya filtra bien** (`os/os.js:294` carga pm_units con `.eq('is_active',true)` → 47).
- El **PM clásico (pm-main.js) NO filtra** → infla a 98 (raíz del "98 vs 51" y de que cada vista dé otro número).
- Fix B4 (pendiente): en pm-main cargar con `is_active=true`, ocupación desde **reservas vigentes** (no `status`),
  un solo denominador. Informe real de Carlos: 51 uds / 38 ocupadas / 76.5%. Riesgo MEDIO (pm-main 533KB, global).

### Deploy — hallazgo operativo
El auto-deploy de empresa-os-admin **sí** dispara por push a la rama (los últimos ~20 deploys son de esta rama
vía `githubDeployment`). No hace falta token/CLI para desplegar: basta push a `feat/portal-inversionista-v2`.

---

### Batch 4 — Consolidación de deploy: PARADA por divergencia sustantiva (regla CEO 3d) · 2026-08-20 ⏸

El CEO autorizó fusionar rama→main **con backup y seguro**. Hecho el paso seguro; **la fusión NO se ejecuta**
porque cae exactamente en la cláusula "si los commits de main son sustantivos/ambiguos o hay conflictos reales, PARÁ".

- ✅ **Backup creado y pusheado:** tag `backup-main-antes-fusion` = `origin/main` actual (recuperable siempre).
- **Divergencia real (2026-08-20):** rama **43 adelante** / **56 detrás** de `origin/main`.
- **Los 56 commits que main tiene y la rama NO son enormes y sustantivos** (135 archivos, **+15.463 / −3.966**):
  1. **Sistema "Jarvis" / Agent Network completo** (Command Center /jarvis, 18 agentes, escuadras FF/Remodel/Rentas
     en modo asistido, Mapa de Agentes, grants least-privilege, 7 migraciones `2026080934…46…`).
  2. **Rebrand de diseño COMPLETO** — dos olas: "cálida + verde bosque" y luego "royal (azabache+cobalto)",
     con **codemods emoji→Lucide/StatusDot en TODOS los módulos**, `ui/icons.js` nuevo, `ui/tokens.css` +204/−…,
     JetBrains Mono/Fraunces. Es OTRO sistema de diseño distinto al "light canon" de la rama.
  3. **Remodel EVM** (C.1/C.2/C.3), **Rentas informes automáticos** (crons+snapshots), **Planner cascada multi-día**,
     **Estimador take-off**, **Cobros tabla inquilinos**, WhatsApp CEO, CSV de Pagos.
- **Conflictos reales confirmados** (`git merge-tree`): `os/os.js`, `pm/ff-command-center.js`, `os/inv-portal.js`,
  `os/inv-admin.js`, `CLAUDE.md` (ambos lados tocaron los mismos archivos core + tokens).

**➡ DECISIÓN DE NEGOCIO REQUERIDA (no la asumo):** la "consolidación de deploy" NO es un merge mecánico —
son **dos sistemas de diseño y dos sets de features divergentes**. Antes de fusionar hay que decidir:
(a) ¿qué diseño gana — "light canon" de la rama o "royal/cálida" de main? (b) ¿el Portal Inversor v2 + auditoría
de la rama se lleva a main, o main (con Jarvis+rebrand) se lleva a la rama? Recomendación: sesión dedicada de
merge asistido en un worktree aparte, archivo por archivo, con el CEO eligiendo el diseño; NO auto-merge.
La raíz de los "bugs fantasma" es justamente esto: el CEO mira `empresa-os-admin` (rama) y `empresa-os` (main)
que hoy son productos **diferentes**, no versiones del mismo.

---

## FASE 5 — REPORTE (turno 2 · 2026-08-20)

**Resuelto, verificado con datos reales y desplegado a empresa-os-admin este turno:**
- **Déficit fuente ÚNICA `ff_deals.deficit_total`** en ficha/global (os.js), FF Command Center y Portal
  inversor (RPC) — antes 3-4 fórmulas distintas. Verificado: acumulado **$297.690,36**, 5 casas >$20k
  (`9eb29a9`, `e00cabd`, migr `20260820120000`).
- **Horizontes 3/5/8 FIJO** (constante única `HORIZONTES`) — eliminado el 4/6/8 (`8e6c314`). Golden 24/24.
- **XIRR del portafolio excluye holds <1 año** (regla A1) — dejaba de anualizar casas recién cerradas con
  equity en papel (`b7c7432`).
- **Batch 1 (turno previo):** Líder rec ID→nombre, "faltan draws" falso.

**Parada documentada (regla CEO):** consolidación de deploy — backup `backup-main-antes-fusion` creado; la
fusión NO se hace porque main tiene 56 commits sustantivos (Jarvis + rebrand completo) con conflictos reales
→ requiere decisión de diseño + sesión de merge dedicada (ver Batch 4).

**Próximos lotes (código, sin decisión pendiente):** B4 Rentas unidades 51/ocupación por reservas (pm-main.js,
riesgo medio), C-P0-1 NOI/DSCR/CoC con renta real (pm_payments) en indicadores del portal, B2 seguridad
(auth en edge fns de escritura — cuidar crons), semáforo por estado (D-P1-6, ff-analitica salud), Cerebro IA
(Anthropic key ya autorizada).

**Recomendaciones de proceso:** (1) exportar `SB_KEY` para `ci:gate` en CI; (2) test de invariante de
reconciliación (ocupadas iguales entre vistas, Σopex Gastos=Finanzas); (3) linter anti-interpolación sin
`esc()`; (4) **resolver la bifurcación de diseño rama↔main** — es la causa raíz de los "bugs fantasma".

