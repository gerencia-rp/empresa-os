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

**Pendiente próximo (documentado):** Item 54 (EVM en lenguaje simple "rápida/lenta · cara/barata"),
B4/Item 27 (unidades 98→51 en pm-main, riesgo medio, requiere QA logueado), Item 35 (cartera única).

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

