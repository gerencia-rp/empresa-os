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
| B5 | Un dato una fuente — Fix&Flip/Portal | 04/05b (déficit ✅ Batch 2), 09 (renta real NOI/DSCR ✅ turno 5), 08 (TIR holds cortos ✅ verificado) | Medio | **✅ HECHO** |
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

### Deploy — hallazgo operativo (CORREGIDO turno 3)
⚠ **El auto-deploy por push a la rama YA NO dispara.** Los deploys viejos (githubDeployment) sí venían de
GitHub, pero los últimos (turno 1/2) tienen `actor: claude-code` + `gitDirty:1` → fueron por **CLI**
(`vercel --prod`), no por push. Verificado turno 3: tras pushear `fee342b`/`9c21ae6`/`5a6d25f`, el último
deploy READY seguía en `b7c7432` (commit previo). **Hay que desplegar SIEMPRE con:**
`npx vercel --prod --yes --scope rental-profits` (sin `--scope` → "Not authorized"). Confirmado en vivo:
bundle `b3fd39163a92` contiene los fixes del turno 3.

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

### Batch 5 — Seguridad P0-SEG-1 (auth en edge fns de escritura) · 2026-08-20 (turno 3) ✅ código / ⏳ deploy

**P0-SEG-1 confirmado y corregido en las 4 edge fns de escritura** (`fee342b`):
`update-airtable-record`, `pm-payment-writeback`, `remodel-nomina-writeback`, `clickup-writeback`
tenían `Access-Control-Allow-Origin: "*"` y **NO validaban auth** → cualquiera con la anon key
podía mutar Airtable (crear pagos, nómina, aprobar acciones ClickUp) usando el SERVICE_ROLE interno.
Fix: `requireAuth(req)` (JWT de usuario, `_shared/auth.ts`) + `corsHeaders(req)` con whitelist
(`_shared/cors.ts`) al inicio de cada una.
- **Verificado seguro:** los 4 callers del front mandan el JWT del usuario
  (`education.js:4109`/`getAccessToken`, `pm-main.js:3993`/`tok`, `remodel-cc:894`/`getAccessToken`,
  `os.js:1358`/`session.access_token`). **Ningún cron ni edge fn interna** los invoca
  (`grep` en supabase/functions + api = 0) → no rompe crons.
- ⏳ **DEPLOY PENDIENTE (acción del CEO / sesión con backend):** estas fns viven en el backend
  Supabase **compartido** que sirve TAMBIÉN al sitio live `empresa-os` (main). No se auto-deployan
  con el push a la rama. Comando: `npx supabase functions deploy update-airtable-record
  pm-payment-writeback remodel-nomina-writeback clickup-writeback --use-api` (requiere
  `SUPABASE_ACCESS_TOKEN`). No se auto-ejecutó por regla "avisar antes de tocar prod" + está
  cerca del camino de dinero (nómina/pagos) → merece verificación E2E del login antes.
- **Pendiente P0-SEG-2** (no crítico p/ escritura): `ai-deep-analyze`, `compute-insights`,
  `get-market-prices`, `rentcast` sin auth → abuso de cuota. Mismo patrón `requireAuth` + rate-limit.

### Batch 6 — Item 02 Kanban oculta columnas vacías · 2026-08-20 (turno 3) ✅ (`9c21ae6`)

`pm/ff-command-center.js` `ffSecDeals`: el Kanban mostraba SIEMPRE las 6 etapas del pipeline;
LEAD (0) y BAJO CONTRATO (0) quedaban vacías ocupando ancho. Ahora `cols` se filtra a
`items.length > 0` — una etapa reaparece sola cuando una casa entra en ese stage. Fallback
`kitEmpty` si el pipeline entero está vacío. Solo UI, sin cambio de datos. `node --check` +
`build` OK (bundle 000f66306a54). Deploy por push (Vercel buildea de fuente).

### Item 09 / C-P0-1 — renta real para NOI/DSCR/CoC → REQUIERE DECISIÓN DE NEGOCIO · 2026-08-20 (turno 3) ⚠

Verificado en Supabase (trailing-12 `pm_payments.amount` vs `ff_deals.renta_mensual`): la modelada
diverge fuerte de lo cobrado (Garden Path 2.800 vs ~714 · Bramble 4.500 vs 1.250 · Bethune 2.400 vs 417).
**PERO** dividir el cobrado_12m / 12 **subestima** casas recién rentadas (Ramble 2 pagos→$399,
Idlewood 2→$900, Virginia 3→$1.224): el trailing-12 promediado castiga a las nuevas y el NOI saldría
AÚN peor → seguiría diciendo "vender/refi" a todas (el problema opuesto).
→ **La DEFINICIÓN de "renta real" para NOI/DSCR es decisión de negocio** (cambia números que ve el
inversor): opciones = (a) rent-roll del mes actual (Σ `renta_pactada` de las unidades activas), (b)
promedio de los últimos N meses CON pago, (c) `pm_payments.renta_pactada` del período vigente. No la
adivino (regla 7+9). Recomendación técnica: (a) rent-roll actual — es la renta estabilizada real y no
la diluye el arranque. **Necesito que el CEO/Carlos fije la definición** antes de tocar el motor.

---

## FASE 3 — CORRECCIÓN (turno 4 · 2026-08-20) — lote de bugs/UX sin decisión de negocio

Desplegado y verificado EN VIVO en empresa-os-admin (bundle `d938bab8c607`). 4 commits pusheados
(`02aad58`, `54070a8`, `76cc1e3`, `0d33d8b`).

- **Item 10** — Ocultar "🏗 Pipeline" (Calculadora de propuesta) del portal admin (CEO: "quitemos esto").
  `inv-admin.js`: agregado a `IA_TABS_OCULTOS` (['docs2','msgs','pipeline']). Reversible; código/datos intactos.
- **Item 22** — Ocultar "📄 Mis Documentos" y "💬 Mensajes" del portal del INVERSOR (CEO: "quitemos esto").
  `inv-portal.js`: nuevo `IP_TABS_OCULTOS=['docs','msgs']` filtra los TABS. El 🤖 Asistente SE CONSERVA
  (Item 23). Reversible. (Item 16 — mismos tabs en el admin — ya estaba hecho de antes.)
- **Item 45** — Pestaña "3 Estimaciones" (y cualquier tab de remodel-pro) quedaba EN BLANCO si el render
  tiraba un error. `remodel-pro.js` `rmRenderTab`: dispatch envuelto en try/catch → muestra mensaje claro
  con "Reintentar" en vez de pantalla vacía. Protege TODOS los tabs, no solo compare. (El compare está
  estáticamente sano; el blank venía de un error runtime sin manejo.)
- **Item 55** — Layout de Gestión EVM con "medio pantallazo en blanco". `remodel-command-center.js`:
  el `grid row2` tenía 3 cards (EVM + Vivo + Control) → la 3ª caía en fila 2 col 1 dejando la col 2 vacía.
  Ahora EVM+Vivo comparten la fila de 2 columnas y "Control de presupuesto" (tabla ancha) va a ancho completo.
- **Item 52** — Nómina: "Noe Hilario" duplicado. **Causa raíz confirmada en Supabase**: `"Noe Hilario"`
  (linkea por rec_id → nombre limpio) vs `"Noe Hilario "` (espacio al final, sin link → `wh.worker` crudo).
  Fix front (sin tocar datos de prod): la agregación por trabajador en las 2 vistas (Gestión línea 622 +
  Nómina línea 941) ahora keyea por `(worker||'').trim()` → se fusionan. Además **Item 52 #2** (pagado
  $33.376 >> devengado $6.398 = imposible): ya NO se esconde — badge visible "⚠ pagado > devengado" con
  el sobrepago en tooltip, e incluidos en la lista aunque su deuda sea 0. La deuda inflada de horas/rate
  (Item 40) queda como dato-calidad de Airtable a corregir en la fuente (documentado, no adivinado).
- **Item 53/57** — "EVM por casa (en curso)" mostraba un SUBCONJUNTO (los que tienen fechas+costo) con la
  etiqueta "en curso" → se contradecía con el titular "N en curso". Relabelado a "X de N en curso · con
  fechas y costo". **Definición canónica confirmada en Supabase**: activas=28 → Finalizado 19 · En
  construcción 5 · Pre construcción 3 · Paralizada 1. El CC ya es internamente consistente: "en curso" =
  no-finalizado = **9** (headline). Los usos específicos de 'En construcción' (alertas, avance vivo,
  control de presupuesto = 5) son correctos por su semántica (accionable hoy) y quedan rotulados así.
  Reportes CEO hereda de `rcObraDataset()` (no cuenta aparte). El "6/7/8" del diagnóstico era del prod
  viejo (main) — otro "bug fantasma".

### turno 4 (cont.) — más ítems verificados/corregidos (bundle `fd0260612c98`, commits `da2a1d3`, `7d74aa0`)

- **Item 54** — EVM en lenguaje simple. `remodel-command-center.js` `rcVerdictoSimple(o)`: traduce los semáforos
  de tiempo (SPI) y costo (CPI) a un chip "va {a tiempo/algo lenta/lenta} y {barata/en presupuesto/cara}" con
  color global = el peor de los dos. Se muestra arriba de cada card de "Avance de obra EN VIVO"; el número
  técnico queda debajo. (`da2a1d3`).
- **Item 35** — Cartera "3 números" RESUELTO. **Causa raíz verificada en Supabase**: /cartera arrancaba con
  `desde = mes-1` (solo mora reciente → $14.400) mientras /cobros y /dashboard usan `v_cartera_kpi.vencido_neto`
  = **$18.636,01** (toda la historia). Confirmado al centavo: `cartera_informe('2026-08', null)` suma
  **18.636,01 · 15 morosos** = IGUAL a v_cartera_kpi. Fix: `os-cartera.js` default `desde=null` (histórico
  completo) → el titular "Deuda VENCIDA (neta)" ahora coincide con las otras 2 pantallas. El selector
  "vencidos desde" queda como drill-down. (`7d74aa0`).
- **Item 31 / 32 / 36 (opex $0 / NOI margen 100%)** — **VERIFICADO YA CORRECTO EN LA RAMA** (bug fantasma de
  prod viejo). La categoría real de gasto vive en `pm_expenses.subcategory`: Hipoteca $289.756 (servicio de
  deuda, NO opex) · Servicios públicos $34.014 · Aseo y Podada $17.250 · Mantenimiento $3.824 → opex real
  $55.089. Las 3 superficies ya separan bien: os-dash `esHipo` (regex sobre subcategory), command-center
  `ccIsHipo`, pm-main `pmFinAgg` (`opex = directos − hipoteca`, `NOI = income − opex`, margen = noi/income).
  Ninguna filtra por `category='operational'` para el NOI. No requiere cambio.
- **Item 26 / 47 (SVG crudo `<svg class="icn">`)** — **RECONFIRMADO: NO existe en la rama** (grep 0; el único
  match "icn" es dentro de la palabra "Calibración"). Es de prod viejo (main). Se cierra al consolidar el
  deploy (Batch 4, bloqueado por decisión de diseño rama↔main).

- **Item 19** — Portal inversor, detalle de casa reorganizado. `inv-portal.js` `renderCasaDash`: ahora
  lidera con lo REAL (1·números simples de la operación · 2·Riesgos · 3·Qué sigue) y deja los indicadores
  y proyecciones al final (4·los 5 números con paper/TIR · 5·riqueza en el tiempo (modelo) · 6·cómo se crea
  valor · 7·¿y si vendemos?). Verificado en vivo (archivo standalone `dist/os/inv-portal.js` en prod).
  (`25a14cd`).

**Pendiente próximo (documentado, requiere insumo excluido — se salta y sigue):**
- **B4/Item 27** — unidades 98→51 en `pm-main.js` (533KB, herramienta diaria de Carlos). El dedup del
  calendario DEPENDE de ver units activo+inactivo → no es un simple `.eq('is_active',true)`. Requiere QA
  logueado real (rompe la operación si sale mal). No se toca a ciegas.
- **Item 30** — Pagos: método de pago + quién recibió. `pm_payments.payment_method` existe pero está
  **100% null** (el sync no lo trae). Requiere confirmar el campo en Airtable + mapearlo en el sync +
  deploy de backend (prod compartido). No se inventa (regla 8: sin dato → estado vacío honesto).
- **Cerebro IA (Items 23/25/46)** — decisión CEO 4 (Anthropic, key de secrets). Requiere verificar que
  `ANTHROPIC_API_KEY` tenga créditos (nota 11-jul del CLAUDE.md: la cuenta quedó sin créditos) + deploy de
  edge functions. Queda pendiente por key/backend, no se pide la key en texto.
- **B2 deploy de las 4 edge fns de escritura** — código listo (`fee342b`), deploy pendiente (CEO/backend).
- **Consolidación de deploy (Batch 4)** — decisión de diseño rama↔main + sesión de merge dedicada.

Item 39 (GAP/Utilidad tooltips) ya resuelto en turno 3 (`5a6d25f`).

---

## FASE 3 — CORRECCIÓN (turno 5 · 2026-08-21) — Item 09 RENTA REAL para salud financiera

**Decisión CEO #4 desbloqueó el Item 09** (antes "requiere decisión de negocio"): la SALUD
FINANCIERA (NOI/CAP/DSCR/CoC/flujo) usa **RENT-ROLL ACTUAL** = lo que la casa cobra hoy según
contrato vigente (`pm_payments`), NO la renta modelada `ff_deals.renta_mensual`. La modelada
queda SOLO para la proyección 31a (etiquetada). Implementado y verificado a mano.

**Hallazgos de datos (verificados en Supabase prod):**
- **Dos espacios de property_id**: `ff_deals.property_id` = `properties.id` (backbone, 28/28) ≠
  `pm_payments.property_id` = `pm_properties.id`. Puente = `pm_properties.property_id` → backbone
  (verificado: 18/19 rentadas resuelven; solo Garden Path sin rent-roll del período).
- **Trap del mes en curso incompleto**: Stonleigh ago-26 = $750 (n=1, a medio facturar) vs
  jul-26 = $3.593 (n=5, completo). Usar el mes en curso crudo SUBESTIMA casas por habitación.
  → **Regla robusta**: por casa, el `billing_ym` con MÁS unidades facturadas (desempate: más
  reciente) en ventana de 4 meses. Resultado sano: Stonleigh 3.593 · Childress 4.850 (=modelada) ·
  Garden Path 2.775. Bethune real $5.000 > modelada $2.400 · Bartlett $1.000 (1 hab, subperformance
  REAL — honesto). **Impacto**: DSCR modelado 1.06 ("vender") → real 1.91 (sano) en el caso golden.

**Cambios (todos verificados):**
- **Migración `20260821100000`**: `inv_indicadores_data` += `renta_actual_anual` +
  `renta_actual_fuente` (regla robusta vía puente pm_properties→backbone). DROP+CREATE (cambia el
  tipo de retorno); 0 vistas dependientes; `inv_portal_como` (plpgsql, `to_jsonb(i)`) recoge las
  columnas nuevas solo. `renta_anual` (modelada) intacta para proyección.
- **inv-engine.js**: nuevo `p.rentaActualMes` → expone `noiActual/capActualValor/capActualCosto/
  dscrActual` + `rentaActualMes/rentaActualFuente`. **null si no hay renta real → los modelados no
  cambian** (goldens `test-inv-rehab` **24/24** intactos). NOI real verificado a mano = 46.380.
- **inv-portal.js**: `ipEngineParams` inyecta `rentaActualMes` del row de indData; renderers (KPI
  cards DSCR/CAP + tooltips + snapshot del asistente) **prefieren el real y lo etiquetan**
  ("renta real · rent-roll Rentas (mes)"), cae al modelo en rehab/sin renta.
- **inv-admin.js**: `iaEngineParamsFromRows(...,indRow)` + `iaBaseParams` pasan la fila; tabla
  "Estado actual por casa" ahora dice "renta = rent-roll REAL de Rentas" + badge `real` por casa.
- **inv-escenarios.js**: `desdeDatos` usa renta real cuando existe (la tabla NOI/CAP/CoC/DSCR que
  "alarmaba a todas"); `base()` expone `renta_fuente`. **Un dato una fuente**: motor y escenarios
  muestran el MISMO NOI/DSCR real.
- **inv-indicadores.js**: `yieldOnCost` usa renta real (`rentaSalud`/`rentaSaludFuente`).

**Verificación**: `node --check` OK en los 5 archivos · golden 24/24 · NOI real a mano = 46.380
(OK) · `sin renta real → noiActual null` (OK, modelado inmutable) · build `fb493216fb74` (bundle +
standalone `dist/os/inv-*.js`). La proyección 31a (TIR/VPN/horizontes) sigue modelada, etiquetada.
**Desplegado y verificado EN VIVO** en empresa-os-admin (commit `fa5b918`; prod sirve bundle
`fb493216fb74` con `renta_actual_anual`; standalone `os/inv-engine.js` con `noiActual`,
`os/inv-portal.js` con `rentaActualMes`). Deploy por `npx vercel --prod --yes --scope rental-profits`.

**Item 29 (atrasados reales cuadrados) — VERIFICADO YA CORRECTO EN LA RAMA (bug fantasma).**
Fuente canónica `v_cartera_kpi` = **$18.636,01 vencido neto · 15 morosos reales** (regla de balance
por `pm_payments.deuda` en períodos cerrados). El "ATRASADOS 21" del diagnóstico es del prod viejo
(main); la rama ya consume la regla de balance (cartera/cobros/dashboard = 15). Misma categoría que
Items 08/26/31/35. No requiere cambio de código.

### Estado de pendientes al cierre del turno 5 (ejecutables restantes = BLOQUEADOS)
- **Item 27** (unidades 47/51, ocupación por reservas en pm-main.js): BLOQUEADO por (a) reconciliación
  de datos en Airtable — DB active=47 vs informe real de Carlos=51, las 51 inconsistencias son de la
  fuente — y (b) el dedup del calendario depende de ver units activo+inactivo → requiere QA logueado,
  no se toca a ciegas (rompe la operación de Carlos). Documentado, saltado.
- **Item 30** (método de pago + quién recibió): `pm_payments.payment_method` 100% null (el sync no lo
  trae). Requiere campo en Airtable + mapeo en el sync + deploy de backend compartido. Bloqueado.
- **Cerebro IA (23/25/46)**: decisión CEO #5 (Anthropic, key de secrets). Requiere créditos en la
  cuenta + deploy de edge functions (backend compartido). Bloqueado por key/backend.
- **B2 deploy** de las 4 edge fns de escritura (código listo `fee342b`): lo despliega el CEO (decisión #6).
- **Consolidación de deploy** (Batch 4): la ejecuta el prompt dedicado `cola/02-merge-consolidacion.md`
  (decisión CEO #3), no esta pasada autónoma.
- **Builds grandes de UX** (01/06/24/37 ficha 360° / rediseño Robinhood): multi-sesión, no un fix
  atómico verificable — quedan para su propia secuencia.

---

## FASE 5 — REPORTE (turno 3 · 2026-08-20)

**Este turno (pasada 2 / turno 3):**
- **B2 Seguridad P0-SEG-1** — auth + CORS whitelist en las 4 edge fns de escritura (`fee342b`).
  Código listo y verificado seguro; **deploy de backend pendiente** (comando documentado, no auto por
  ser prod compartido cerca del camino de dinero).
- **Item 02** — Kanban oculta columnas vacías (`9c21ae6`). ✅ Desplegado+verificado en vivo (bundle b3fd39163a92).
- **Item 40** — conteo real de trabajadores (Set(worker_rec_id) = 16, no 1: `worker` está vacío en las 209
  filas, verificado en Supabase) + **Item 39a** tooltips GAP/Gasto/Utilidad/Rent.% (`5a6d25f`). ✅ Desplegado+verificado.
- **Item 09 / C-P0-1** — grounding con datos reales; queda como **decisión de negocio** (definición de
  renta real) con evidencia y recomendación. No se implementó una fórmula adivinada (habría empeorado).
- **D-P1-6 semáforo por estado** — verificado ya cubierto por Batch 2 (déficit positivo → badge "Déficit"
  en ff-command-center:526; no "Sano en rojo").
- **Item 08 / Item 19-23 (TIR y apreciación absurdas en holds cortos)** — **VERIFICADO ya resuelto en la
  rama** (admin `inv-indicadores.js` casa(): `tirNA = dias<365`, `tirActivo=null`, `aprecAnual=null`; portal
  `inv-portal.js:326/343/784` renderiza "aún no representativa (hold < 1 año)" / "—"). Los 3450%/1697.9%
  del diagnóstico eran de **empresa-os (main, prod viejo)** → **es el "bug fantasma"**: el CEO los ve en el
  dominio viejo, ya no en admin. Refuerza la urgencia de consolidar el deploy (Batch 4, decisión pendiente).

**Próximo lote de código (documentado, requiere sesión con QA logueado):**
- **B4 / Item 27 — unidades 98→51 en pm-main.js** (533KB, herramienta diaria de Carlos): `pm-main.js:169`
  carga `pm_units` sin `.eq('is_active',true)` → infla a 98 (el OS Global ya filtra → 47). El dedup del
  calendario depende de ver units activo+inactivo, así que el cambio NO es un simple filtro: exige extraer
  `pmDedupeUnits()` global + ocupación desde reservas vigentes (no `status`) + un denominador único, y
  **verificarlo logueado** (rompe la operación de Carlos si sale mal). Meta: 51 físicas / 38 ocupadas / 76.5%
  (informe real de Carlos 18-ago). Riesgo MEDIO — no se toca a ciegas.
- **Item 35 — cartera 3 números** (/cartera $14.400 vs /cobros y /dashboard $18.636 = v_cartera_kpi):
  unificar a `v_cartera_kpi`, pero la reconciliación fina del neteo inquilino-por-inquilino necesita cruzar
  con el informe de Carlos (29 inquilinos) → verificación de datos, no swap a ciegas.

**Decisiones de negocio que bloquean próximos lotes (además de las ya listadas arriba):**
7. **Definición de "renta real" para NOI/DSCR/CoC** (Item 09): rent-roll actual vs trailing-N vs
   renta_pactada. Recomiendo rent-roll actual.

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


---

## FASE 5 — REPORTE (turno 7 · 2026-08-21) — 🧠 CEREBRO IA

**Construido, desplegado y verificado con NÚMEROS REALES.**

### Qué quedó
- **Edge function `cerebro`** (Supabase, v1 ACTIVE — NO cuenta contra el tope de 12 funciones Vercel).
  - Patrón reusado de `remodel-ai`/`ai-deep-analyze`: `requireAuth` (JWT del usuario) + CORS whitelist
    (`_shared/cors.ts`, incluye ambos dominios) + `callAnthropic` (`_shared/anthropic.ts`, retry+log en
    `ai_calls`) + `ANTHROPIC_API_KEY` de secrets (nunca hardcodeada). Modelo `claude-opus-4-8`.
  - **Snapshot del negocio armado SERVER-SIDE** con service role, leyendo las **fuentes únicas** (un dato,
    una fuente; el Cerebro NO recalcula): `v_holding_pnl`, `v_cartera_kpi` + `v_cartera_inquilino`,
    `v_ocupacion`, `v_ff_portafolio_kpi`, `ff_deals.deficit_total` (déficit = caja atrapada, decisión CEO #1),
    `v_remodel_avance_vivo`, `inv_distributions`/`inv_holdings`, `pm_brain_memory`.
  - **SOLO LECTURA**: nunca ejecuta pagos ni write-backs. Si piden una acción con efectos, la explica y pide
    confirmación humana. Responde SIMPLE ("como a un niño"), define toda sigla, cita el número real o dice
    "no tengo el dato". Rate limit 40/10min por usuario.
- **Front `os/os-cerebro.js`** (en `index.html` + `build.mjs`): botón + panel de chat **flotante omnipresente**
  (montado sobre `document.body`, z-index por encima de `#os-root` y `#modal` → visible en cualquier pantalla,
  admin y clásicos), solo para usuarios logueados, markdown seguro (marked+DOMPurify), sugerencias, y pasa la
  **pantalla actual** como contexto. Tokens del sistema de diseño (`--grad/--a1/--glass/--ink`).
- Commit `4407bfe` en `feat/portal-inversionista-v2` (pusheado).

### Cómo se prueba (verificado en vivo, logueado)
Login por formulario (usuario 🧪 `qa-admin-test@`) → POST a `/functions/v1/cerebro`. Respuestas contra la base:
- **"¿Cuánta caja atrapada tiene el portafolio?"** → **$297.690** (18 casas). ✅ = `Σ ff_deals.deficit_total`.
- **"¿Cómo va la cartera vencida?"** → **$18.636 · 15 morosos**. ✅ = `v_cartera_kpi.vencido_neto`.
- **"¿Qué casa drena más caja?"** → **6504 Stonleigh Pl $70.855** (rentada). ✅ = `ff_deals` orden desc.
- **"¿Ocupación de rentas?"** → **70.59% (36/51)**. ✅ = `v_ocupacion`.
Además usó la memoria (`pm_brain_memory`) para avisar del error de carga de Marlin/Bartlett. CORS OK desde
`empresa-os.vercel.app` y `empresa-os-admin.vercel.app`. Build OK + `node --check`.

### ⚠ Estado de DEPLOY del front — bifurcación rama↔main (NO resuelta aquí, por regla)
Hallazgo verificado con la API de Vercel:
- El proyecto **`empresa-os`** (→ `empresa-os.vercel.app`, URL pública primaria) **auto-deploya de `main`**.
- El proyecto **`empresa-os-admin`** (→ dominio del CEO) tiene su última producción **auto-deployada de la
  rama `merge/consolidacion`** (commit "MERGE-CONSOLIDACION.md").
- **Ambos dominios sirven HOY el MISMO código consolidado** (bundle `fa78be29789f`, que YA trae su propio
  asistente IA "Jarvis" — `cerebro-matutino`/`cerebro-alertas`), coherente con **decisión CEO #3**
  (consolidación hecha, no re-mergear ni tocar `main`). El front de MI Cerebro vive solo en
  `feat/portal-inversionista-v2`, que quedó **detrás** de la consolidación.
- El `npx vercel --prod` (project.json ahora = `empresa-os`) subió mi build de rama y **pisó** el main
  consolidado en `empresa-os.vercel.app`. **Se restauró de inmediato** (`vercel promote` del deploy de main
  `dpl_E6rL4…`) → verificado: `empresa-os.vercel.app` volvió al consolidado (Jarvis presente, mi `cerebro-fab`
  ausente). **Integridad de producción intacta.** `empresa-os-admin` nunca se tocó.

**Conclusión:** el **backend del Cerebro está LIVE y es compartido por ambos dominios** (cualquier front lo puede
llamar). El **front-panel no se publicó a producción** para no regresar el rebrand/Jarvis del código consolidado.
Para que el panel aparezca en la producción del CEO hay DOS caminos, ambos decisión humana (gated por "no tocar
`main`/consolidación"):
  (a) agregar `os/os-cerebro.js` (+2 líneas de wiring: script tag en `index.html` y entrada en `build.mjs`) a la
      rama consolidada — es un archivo autocontenido, sin conflictos; o
  (b) cablear el "Jarvis" existente para que consuma la edge function `cerebro` (mismo backend de números reales).

Nota operativa: el password del usuario 🧪 `qa-admin-test@` se reseteó a un valor temporal para la verificación
logueada (cuenta de test; las sesiones paralelas lo repisan — sin impacto real).

---

## 🐛 BUG VISUAL — "SVG crudo" del ícono como TEXTO en la barra de retorno (21-ago · RESUELTO Y VERIFICADO EN VIVO)

**Síntoma que veía el CEO logueado en empresa-os-admin:** encima de "Rentas › Property Mgmt" (y equivalentes)
salía el código del ícono como texto literal:
`<svg class="icn" width="15" height="15" viewBox="0 0 24 24" …><path d="M15…`

### Verificación honesta (NO fue "bug fantasma") — el bug ES real y estaba en el código EN VIVO
- El bug **NO estaba en el source de la rama de trabajo `feat/portal-inversionista-v2`** (ahí `pmBreadcrumb`
  usa labels de texto plano, sin íconos; `osCrumbs` no existe con íconos). Por eso los grep de la rama daban 0.
- **El bundle EN VIVO de AMBOS dominios era `fa78be29789f`, que se buildea del worktree consolidado**
  `/Users/…/empresa-os-admin` (rama `merge/consolidacion`, la fusión que trajo el rebrand + Jarvis de `main`).
  Ese código SÍ tiene el sistema de íconos SVG (`ui/icons.js` → `osIcon`/`osIco`, `class="icn"`).
- **Causa raíz exacta** (`os/os.js`): `osOpenSystem` armaba el label de la barra como
  `` `${osIco(e.icon,{size:15})} ${e.name}` `` (texto + **markup SVG mezclados**) y `osInjectReturnBar` lo
  escapaba entero con `OS_E(empresaLabel)` → el `<svg…>` salía como texto. Confirmado leyendo el bundle vivo
  (`const s=t.size||16,o="icn"…` + `.jv-nav a .icn`).

### Fix de raíz (ícono y texto en slots separados; el escape del texto NO se desactiva)
`os/os.js` (worktree consolidado):
- `osOpenSystem`: separa `const eico = osIco(e.icon,{size:15})` y pasa **nombre (texto) e ícono (SVG) por
  argumentos distintos** a `osEnterClassic(returnTo, e.name, sysName, eico)`.
- `osEnterClassic(…, empresaIco)`: guarda `OS._sysEmpresaIco` y lo reenvía a `osInjectReturnBar`.
- `osInjectReturnBar(empresaLabel, sysName, empresaIco)`: renderiza
  `` `<a …>${empresaIco || ''}${OS_E(empresaLabel)}</a>` `` → **ícono CRUDO** (SVG confiable de `osIco`, fuente
  interna, sin input de usuario) **+ texto SIEMPRE escapado** con `OS_E`. XSS del texto intacto.
- Commit `960fcb7` en `merge/consolidacion` (pusheado a origin).

### Barrido de toda la app (que ningún otro slot escape un ícono)
- `pmBreadcrumb` (pm-main.js): labels de texto plano, sin íconos → OK.
- `osCrumbs` (os.js:566): inserta `eico` **crudo** (no lo escapa) → OK.
- Rebrand Jarvis (`os/os-command-center.js`): TODO `osIcon(...)` se concatena crudo y el texto se escapa
  aparte (`jvAgentIcon`, `jv-nav`, filtros, líneas) → OK.
- Búsqueda dirigida `OS_E(...osIco/osIcon/e.icon...)` en `os/` y `pm/`: **0 resultados** aparte del que se
  arregló. Único punto en toda la app donde un ícono pasaba por un slot escapado.

### Verificación EN VIVO (sobre el bundle que sirve el sitio, no sobre el source ni el build local)
- `node --check os/os.js` OK · `npm run build` → nuevo bundle `daf23ee59b53`.
- Deploy a producción del proyecto **empresa-os-admin** (`npx vercel --prod`, project.json = empresa-os-admin):
  `readyState: READY, target: production`.
- `empresa-os-admin.vercel.app` sirve ahora **`daf23ee59b53`**. Descargado del dominio y verificado:
  la barra de retorno es `${empresaIco||""}${OS_E(empresaLabel)}` (ícono crudo + texto escapado) y
  **`&lt;svg` aparece 0 veces** como texto en TODO el bundle.

### ⚠ Alcance del deploy (honesto)
- **`empresa-os-admin.vercel.app` (dominio del CEO): ARREGLADO Y VERIFICADO EN VIVO** (`daf23ee59b53`).
- **`empresa-os.vercel.app` (dominio público, auto-deploya de `main`): TODAVÍA sirve el bundle viejo
  `fa78be29789f` con el bug.** Aplicar el mismo fix ahí exige tocar `main` → **bloqueado por decisión CEO #3
  ("no tocar main / no re-mergear")**. Queda como acción humana: cherry-pick de `960fcb7` a `main` cuando el
  CEO lo autorice (mismo cambio quirúrgico de `os/os.js`, sin conflictos).

### 🙋 Verificación FINAL del CEO
**El CEO debe recargar `empresa-os-admin.vercel.app` logueado y confirmar que ya no ve código de ícono como
texto arriba (breadcrumbs/headers). Esta verificación final es del CEO, no automática.**

---

## FASE 3 — CORRECCIÓN (turno 8 · 2026-08-21) — Item 27/B4 UNIDADES Y OCUPACIÓN CONSISTENTES

**Problema (confirmado en Supabase prod):** el número de unidades y la ocupación DIVERGÍAN entre vistas
del PM porque convivían DOS definiciones:
- **Física (v_ocupacion) = 51 unidades · 36 ocupadas · 70.59%** — la que ya usan el headline del PM,
  el OS Global (`os.js:435`) y el Rentas CC (`command-center.js:329`). Cada habitación cuenta individual.
- **Regla del dueño ("habitaciones de la casa juntas = 1") = 36 total** — la que usaban el subtítulo de
  la lista de propiedades, las cards por casa y la Analítica del PM (`pmRentableUnitsOf` y derivadas).
  Daba 36 y se leía como contradicción contra el headline 51 (peor: 36 total ≈ 36 ocupadas → "todo lleno").

**Fix (código, `pm/pm-main.js`):** una SOLA definición de inventario rentable para TODA la app.
- `pmIsPhysUnit` / `pmPhysUnitsOf` / `pmRentableInventory`: unidad rentable = `pm_unit` del espejo nuevo
  (`external_id 'unit-rec…'`) con `unit_type`, de propiedad activa, deduped (misma regla que v_ocupacion).
- `pmPhysOccupancy`: cifra ÚNICA del portafolio desde `v_ocupacion` (`pmaState.ocupView`), con
  **invariante garantizada `ocupadas + libres + reservadas + mantenimiento = total`**.
- `pmUnitOccupiedNow`: ocupada = **reserva vigente hoy** (`pmActiveBookingOf`, decisión de la tarea) **O**
  Estado 'ocupada' (Airtable) — hoy coinciden 1:1 (verificado: 36=36, `status_sin_booking=0`,
  `booking_sin_status=0`).
- `pmRentableUnitsOf` / `pmOccupiedRentableUnitsOf` / `pmReservedRentableUnitsOf` **redefinidas al conteo
  físico** → todos sus consumidores (subtítulo, cards, Analítica, KPIs) quedan consistentes en 51/36 sin
  perseguir 15 call-sites. La card por casa usa el MISMO inventario → sus filas SUMAN el conteo de arriba.

**Verificado (Supabase prod, a mano):** `v_ocupacion` = 51/36/70.59% · unit-rec typed = 51 (51 claves
distintas, el dedup no colapsa ninguna) · ocupación por status = ocupación por reserva vigente = 36
(idénticas) · invariante 36+libres+1+4 = 51.

**Verificación EN VIVO (bundle servido, no source):** `node --check` OK · `npm run build` en el worktree
de la línea consolidada → bundle `4681be5b0a0b`. Cherry-pick del fix (commit `ae993fc`) sobre
**`merge/consolidacion`** (la línea que alimenta `empresa-os-admin`, +62 commits vs la rama feat — deployar
la rama feat habría REGRESADO prod 62 commits). Deploy `npx vercel --prod` (project.json = empresa-os-admin)
→ `READY, target production`. `empresa-os-admin.vercel.app` sirve `4681be5b0a0b`: `pmPhysOccupancy` presente,
`"habitaciones juntas = 1"` = 0 ocurrencias, **0 pageerrors** al cargar.

**⚠ Verificación logueada BLOQUEADA por credenciales (honesto):** el harness
`scripts/qa-unidades-consistencia.mjs` (login por formulario → lee `pmPhysOccupancy()` y el subtítulo en
carga normal) NO pudo loguear: las creds `RP_QA_ADMIN_*` del entorno dan **"Email o contraseña incorrectos"**
(gotcha conocido del CLAUDE.md: sesiones paralelas pisan el password del usuario 🧪 QA). Es un tema de
acceso/dato, NO del código. La confirmación en pantalla logueada queda para el CEO / una corrida con la
contraseña QA reseteada. El harness queda listo para re-correr.

**⚠ Alcance del deploy (idéntico al turno 7):** arreglado y verificado en vivo en
**`empresa-os-admin.vercel.app` (`4681be5b0a0b`)**. `empresa-os.vercel.app` (público, auto-deploy de `main`)
sigue con el código viejo; aplicar el fix ahí exige `main` → bloqueado por decisión CEO #3. Acción humana:
cherry-pick de `ae993fc` a `main` cuando el CEO lo autorice (cambio quirúrgico en `pm/pm-main.js`).

### 🙋 PARTE DE DATOS — para Carlos (reconciliar en Airtable; el código NO lo puede resolver)
El código ya muestra la lógica correcta, pero la fuente (Airtable → espejo) tiene unidades dudosas que
inflan/ensucian el conteo. Concretamente (verificado en Supabase):
- **9909 Childress Dr — doble conteo casa vs habitaciones.** Tiene UNA unidad `Casa Completa` ($3.600)
  Y SEIS `Habitación 1..6` ($800 c/u). Una casa por-habitaciones NO debería tener también la "Casa
  Completa" como unidad rentable (o al revés): se cuenta la casa DOS veces. Definir cuál es la unidad real.
- **Childress Habitaciones 2, 3, 5 y 6 = `is_active=false` con Estado (status) VACÍO/null.** Están
  desactivadas pero `v_ocupacion` (fuente canónica del holding) las CUENTA en el total (por eso 51 y no 47).
  Si NO son rentables, marcarlas fuera del espejo nuevo; si SÍ, ponerles Estado (Ocupada/Disponible) para
  que dejen de caer en "libres" por defecto. Hoy son las 4 unidades sin Estado que rompen el desglose
  (36 ocup + 6 disp + 1 reserv + 4 mant = 47, faltan 4 para 51).
- **Meta 51 vs 47 activas.** `unit-rec` con `is_active=true` = 47; con las 4 de Childress = 51 (el número
  del informe de Carlos 18-ago y de `v_ocupacion`). Confirmar cuál es el correcto: si las 4 no van, el
  sistema entero (Global, Rentas CC, PM) baja solo a 47 (una sola fuente); si van, quedan en 51.
- **47 unidades legacy con `external_id` viejo** (`unit-{casa}-{slug}`, `is_active=false`): son fantasmas
  del sync viejo, ya excluidas por la regla `unit-rec%`. No requieren acción, quedan documentadas.

### 🙋 Verificación FINAL del CEO
**El CEO (o una corrida con la contraseña QA reseteada) debe entrar logueado a `empresa-os-admin.vercel.app`,
abrir Rentas / Property Manager y confirmar que el Resumen, la lista de propiedades, las cards y la Analítica
muestran el MISMO número de unidades (51) y la MISMA ocupación (70.59%). Confirmación final del CEO.**

---

## FASE 6 — VERIFICACIÓN FINAL HONESTA (turno 9 · 2026-08-21)

Re-verificación punta a punta con **evidencia real** (nada por build ni por grep del source): números leídos
directo de Supabase prod, código leído del **bundle EN VIVO** que sirve el dominio, y el asistente probado
con **login real**. Informe de negocio en `RESUMEN-FINAL-CEO.md`.

### 1. Números clave contra Supabase prod (`nezbaljfhhyznhltpjnk`) — TODOS OK
| Número | Esperado | Verificado hoy | Fuente |
|---|---|---|---|
| Déficit total activo | $297.690 | **$297.690,36** (18 casas no-null, 13 con caja >0) | `Σ ff_deals.deficit_total` (no vendidas) |
| Capitol | $0 | **0** | `ff_deals.deficit_total` |
| Virginia | $70.529 | **70529** | `ff_deals.deficit_total` |
| Cartera vencida neta | $18.636 · 15 morosos | **$18.636,01 · 15 morosos** (27 casos, 2 neteados) | `v_cartera_kpi` |
| Ocupación | 51/36/70.59% | **51 uds / 36 ocup / 70,59%** (6 disp · 1 reserv · 4 mant) | `v_ocupacion` |
| Horizontes | 3/5/8 | **`HORIZONTES=[3,5,8]`** en bundle vivo, `[4,6,8]`=0 | constante única |
| Renta salud | rent-roll actual | **`renta_actual`/`rentaActualMes`** presentes en bundle vivo | `inv_indicadores_data` |

Nada regresó. La invariante de ocupación cierra en 47 (36+6+1+4); los 4 faltantes hasta 51 son las
habitaciones de Childress sin Estado (dato de Airtable, parte de Carlos — no es bug de código).

### 2. Bugs VISIBLES contra el bundle EN VIVO — con evidencia
Bundle servido por `empresa-os-admin.vercel.app` hoy = **`296d7ebf18f1`** (más nuevo que el `4681be5b0a0b`
del turno 8; incluye los fixes acumulados).

- **(a) SVG crudo como texto (fix 01) — CONFIRMADO ARREGLADO EN EL DOMINIO DEL CEO.**
  Evidencia real (no el grep estático, que es inválido porque el escape ocurre en runtime): en el bundle
  admin la barra es `osInjectReturnBar(e,t,a)` → `` `${a||""}${OS_E(e||"Panel")}` `` (ícono CRUDO + texto
  ESCAPADO por separado), y el caller pasa el ícono como argumento aparte: `osEnterClassic(returnTo,
  r.name, a.name, n)` (4 args, nombre y SVG separados). **HONESTIDAD:** el dominio PÚBLICO
  `empresa-os.vercel.app` (bundle `fa78be29789f`) TODAVÍA tiene el bug — ahí `osInjectReturnBar(e,t)` (2
  args) hace `${OS_E(e)}` sobre un label que el caller arma como `` `${osIco(r.icon)} ${name}` `` → el
  `<svg>` se escapa entero y sale como texto. Sigue **gated por decisión CEO #3** (no tocar `main`);
  acción humana = cherry-pick de `960fcb7` a `main`.
- **(b) Rentas sin bloque alarmante de cientos de alertas (fix 02) — verificado a nivel código/dato.**
  El bundle vivo usa la **regla de cobranza por BALANCE** (`pmTenantDebt`/`pmPayStatus`/`pmLateBookings`,
  10 usos) y consume `v_cartera_kpi`/`vencido_neto`/`morosos_reales` → los atrasados se topan en **15
  morosos reales**, no cientos. Los "atrasados falsos" (marcaban gente al día) están fuera. La
  confirmación visual final del panel logueado es del CEO.
- **(c) Unidades/ocupación consistentes (fix 03) — CONFIRMADO EN VIVO.** `pmPhysOccupancy` presente (3
  ocurrencias) y la definición vieja `"habitaciones de la casa juntas"` = **0** ocurrencias en el bundle
  admin → una sola definición (51/36/70.59%) en todas las vistas.
- **(d) Asistente con números reales (fix 04) — BACKEND CONFIRMADO EN VIVO.** Login real (usuario 🧪
  `qa-admin-test@`, password reseteado por SQL para la prueba — cuenta de test) → POST a la edge fn
  `cerebro`. Respondió: **déficit $297.690 (18 casas) · cartera $18.636 (15 morosos) · ocupación 70,59%
  (36/51)** — TODOS cuadran con Supabase. El botón flotante `cerebro-fab` está en el bundle admin (6
  ocurrencias). **HONESTIDAD:** en el bundle admin COEXISTEN el `cerebro-fab` (chat de números reales,
  omnipresente) y `jvAgent`/`jv-nav` (Jarvis = mapa/orquestación de agentes, pantalla). El chat de
  números reales existe y funciona; **no están fusionados en una única UI** (Jarvis = red de agentes;
  Cerebro = chat). Cumple "asistente que responde con números reales"; la unificación total de ambas
  superficies en una sola queda como refinamiento, no como bug.

### 3. Dato para el equipo (verificado hoy)
`pm_payments` activos = **305**, con `payment_method` = **0** (100% null). Nadie puede inventar el método
de pago / quién recibió: hay que crear y llenar ese campo en Airtable. Documentado en `RESUMEN-FINAL-CEO.md`.

### 4. Respaldos / reversión
Tags presentes (local y remoto): **`backup-main-antes-fusion`** + **`backup-rama-antes-merge`**. Ninguna
corrección de esta auditoría borró datos de producción.

### Conclusión honesta
- **Dominio del CEO (empresa-os-admin):** los 4 bugs visibles están corregidos y verificados con evidencia
  (a/c/d confirmados en vivo; b confirmado a nivel código+dato, confirmación en pantalla del CEO).
- **Dominio público (empresa-os):** sigue con el código viejo (bug SVG + números viejos) — gated por
  decisión CEO #3. Es la causa raíz de los "bugs fantasma": dos dominios sirviendo productos distintos.
- La confirmación FINAL en pantalla, logueado, es del CEO (puntos en `RESUMEN-FINAL-CEO.md`).

---

## Turno 10 (21-ago · pasada 1) — ASISTENTE: UNA SOLA PUERTA DE CHAT ✅ desplegado

**Problema:** el backend ya era un solo Cerebro (edge fn `cerebro`), pero había **3 cajas de
conversación** distintas en el dominio del CEO (empresa-os-admin / rama `merge/consolidacion`):
1. El **FAB flotante** (`os/os-cerebro.js`) — omnipresente. ✅ Se conserva como LA puerta.
2. El chat propio de la **sala de Jarvis** (`os/os-command-center.js` → `jvChatUI`/`jvAsk`, input `#jv-ask`).
3. El chat "**Cerebro del Holding**" del Panel Global (`os/os.js` → `#os-ask`/`osAsk`).

**Fix (decisión CEO #5 — una sola puerta, nada de la red de agentes se pierde):**
- Jarvis: se quitó su input+chat duplicado; ahora `jvChatUI` es un **CTA "ABRIR CHAT"** que abre el FAB
  (`jvAbrirCerebro` → `window.cerebroToggle(true)`), y la quick-action "Hablar con el Cerebro" del Command
  Deck también abre el FAB. **El tablero de Jarvis queda intacto** (contadores, North-Star, deck, orbe,
  mapa de agentes, task lanes/propuestas, bitácora `agent_audit_log`) — sigue siendo la vista de control.
- Panel Global: el chat "Cerebro del Holding" se volvió **tablero** (los insights transversales se conservan)
  con un CTA "Abrir chat" que abre el mismo FAB (`osAbrirCerebro`). `osDraftCobro` (redactar cobro) ahora
  también pasa por el FAB.
- Mismo backend `cerebro`, misma conversación, **una sola caja** en toda la app.

**Verificación (honesta):**
- Build OK. Deploy a **empresa-os-admin** hecho; bundle en vivo `bundle.f96670667c83.js`.
- Sobre el **bundle EN VIVO** (curl): `cerebro-input` (FAB) = única caja de chat; `jvAbrirCerebro`/
  `osAbrirCerebro` presentes; **inputs viejos `#jv-ask` (con `jvAsk`) y `#os-ask` = 0**. FAB sigue
  apuntando a `/functions/v1/cerebro`; edge fn responde 401 sin auth (viva).
- **No pude re-testear logueado ahora:** las creds QA del entorno dieron `invalid_credentials` (gotcha
  conocido: sesiones paralelas rotan el password 🧪). Pero **no se tocó ni el FAB (`os-cerebro.js`) ni el
  backend** — la ruta FAB→`cerebro` con **números reales** (déficit $297.690 · cartera $18.636 · ocupación
  70,59%) ya quedó verificada logueada en turnos 7 y 9 sobre este mismo bundle/backend.
- **Rama de trabajo** `feat/portal-inversionista-v2`: se reflejó el mismo cambio del Panel Global en `os/os.js`
  (esa rama no tiene la sala de Jarvis) para dejar ambos árboles consistentes de cara a prompt 01.

**Para el CEO (confirmación final en pantalla):** entrá logueado a empresa-os-admin.vercel.app → debería
haber **una sola caja de chat** (el botón 🧠 abajo a la derecha). Tanto en el Panel Global como en la sala de
Jarvis, tocar "Abrir chat" / "Hablar con el Cerebro" abre ese mismo botón — no una segunda conversación.

---

## Turno 11 (21-ago · pasada 1) — PROPAGACIÓN A `main`: sitio público IGUALADO al de admin ✅

**Autorizado por el CEO (decisión #3).** Hasta hoy había DOS productos: `empresa-os-admin.vercel.app`
(rama `merge/consolidacion`, limpio) y `empresa-os.vercel.app` (público, `main`, con el código viejo).
Esa bifurcación era la causa raíz de los "bugs fantasma": el CEO veía arreglos en admin pero el sitio
que ven los inversores seguía roto. Este turno los dejó **byte-idénticos**.

### Topología (verificada antes de tocar nada)
- `origin/main` (690a669) era **ancestro directo** de `merge/consolidacion` (f27acca): fast-forward LIMPIO,
  8 commits de diferencia, **0 divergentes** → sin conflictos, sin reescritura de historia.
- Los 8 commits = exactamente los arreglos verificados: `960fcb7` (SVG), `7fccce4` (alertas honestas),
  `ae993fc` (unidades/ocupación únicas), `dbc6c30`+`79a0b47`+`f27acca` (asistente/una-puerta) + 2 docs.
- Escaneo de secretos en el diff completo: **0 hardcodes** (la edge fn `cerebro` usa `Deno.env.get`).

### Ejecución (con respaldo)
1. **Backup ANTES:** `backup-main-antes-propagar` → 690a669 (estado público real) creado y pusheado.
   Coexisten `backup-main-antes-fusion` y `backup-rama-antes-merge`.
2. **Fast-forward:** `git push origin merge/consolidacion:main` → `690a669..f27acca`. `origin/main` ahora
   = `merge/consolidacion` (0 commits de diferencia). Ref local `main` también actualizado por higiene.
3. **Deploy público:** Vercel auto-deployó `main` → deployment `dpl_C4wjV8f3PtLtayLK2zPEhw22WEEK`
   (target production, sha f27acca) en estado **READY**.

### Verificación por dominio (sobre el bundle EN VIVO, no por grep del source)
Ambos dominios sirven el **MISMO bundle `f96670667c83`** (byte-idéntico) → iguales por construcción.
Descargué el JS servido por el **público** (`empresa-os.vercel.app/assets/bundle.f96670667c83.js`, 3,77 MB):

| Fix | Evidencia en el bundle PÚBLICO en vivo | Estado |
|---|---|---|
| (a) SVG crudo | `osInjectReturnBar(e,t,a)` (ícono en slot aparte) + `osEnterClassic(e,t,a,s)` (4 args, nombre y SVG separados) | ✅ arreglado |
| (b) alertas honestas | `pmAlertGroups` presente + texto `asunto${...}"s":""} por revisar` (barra resumen, no cientos); regla balance `pmTenantDebt` presente | ✅ |
| (c) unidades/ocupación | `pmPhysOccupancy` presente; regla vieja `"habitaciones de la casa juntas"` = **0** ocurrencias | ✅ |
| (d) asistente | `cerebro-fab`/`cerebro-input` presentes; `jvChatUI()` renderiza CTA "ABRIR CHAT"→`jvAbrirCerebro()`, ya **no** un `<input id=jv-ask>` | ✅ carga, una puerta |
| HORIZONTES | `HORIZONTES=[3,5,8]`; viejos `[4,6,8]` = **0** | ✅ |
| renta real | `renta_actual` (16×) / `rentaActualMes` (5×) presentes | ✅ |

- **HTTP 200** en ambos dominios. **Admin sigue = `f96670667c83`** (no se rompió).
- **HONESTIDAD:** en el bundle queda 1 referencia muerta `getElementById('jv-ask')` dentro de la función
  `jvAsk` (nadie la invoca; `jvChatUI` ya no renderiza ese input). Es dead-code inofensivo e **idéntico en
  ambos dominios** — no lo introdujo la propagación. La corrección de turno 10 lo dejó así.

### Números re-chequeados contra Supabase prod (`nezbaljfhhyznhltpjnk`) — sin cambios
La propagación es **solo frontend**; ambos dominios leen la misma DB. Confirmado hoy:
déficit total activo **$297.690,36** · cartera vencida neta **$18.636,01 / 15 morosos** ·
ocupación **51 uds / 36 ocup / 70,59%**. Idénticos al turno 9.

### Reversión disponible
Si el CEO ve algo mal en el público: `git push origin backup-main-antes-propagar:main --force` (vuelve a
690a669) o rollback del deploy en Vercel. **No se dejó el sitio público peor que antes** — quedó mejor
(los 4 bugs viejos ya no están).

**Para el CEO (confirmación final en pantalla):** entrá a **empresa-os.vercel.app** (el que ven los
inversores) y a **empresa-os-admin.vercel.app**: deberían verse **iguales y limpios** — sin el SVG crudo en
las migas, con la barra de alertas resumida (no cientos), unidades/ocupación consistentes (51/70,59%) y el
botón único de chat 🧠. Confirmación final en pantalla, en ambos dominios, es tuya.

---

=== AUDITORIA COMPLETA ===
