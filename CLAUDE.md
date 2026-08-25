# CLAUDE.md — Empresa OS (Rental Profits)

Este archivo es la **memoria persistente** del proyecto para Claude (Claude Code, Claude Desktop, Cowork). Léelo siempre al iniciar una sesión. Mantenelo actualizado con cada decisión técnica importante.

---

## ✅ CONSOLIDADO A UN SOLO SISTEMA (23-ago-2026, decisión CEO #3) — LEER PRIMERO

- **Ya NO hay dos proyectos.** UN solo proyecto Vercel (`empresa-os`, GitHub-linked), UNA sola
  rama (`main`), UN solo dominio (**empresa-os.vercel.app**). Flujo único: `commit → push main →
  auto-deploy`. Detalle en `CONTRIBUTING.md` y en la pasada CONSOLIDACIÓN de `AUDITORIA-RENTAL-PROFITSS.md`.
- **`empresa-os-admin` está PAUSADO/retirado** (proyecto `prj_5Buo…`; su dominio da 503). No deployar
  ahí nunca más. Las ramas `feat/portal-inversionista-v2` y `merge/consolidacion` fueron **absorbidas
  en main y borradas en origin**. Respaldo: tag `backup-antes-consolidar-uno`.
- ⚠ La "REGLA DURA — DÓNDE MIRAR PROD" de abajo queda como **contexto histórico** (explica de dónde venía
  el lío de "bugs fantasma"): describe el estado pre-consolidación de dos proyectos. Ya no aplica al flujo
  de trabajo — hoy solo existe `main → empresa-os.vercel.app`.

---

## 🧠 CAPA DE INTELIGENCIA PROACTIVA (23-ago-2026) — reunión, memoria, ruteo, crons · EN VIVO

- 🧠 **REUNIÓN DIARIA DEL CEREBRO** — edge fn **`cerebro-reunion`** (rol mínimo `agentes_ia_exec`, kill switch
  `agent_registry.'Cerebro Matutino'`, test de aislamiento, audit log; patrón idéntico a los gerentes de área).
  - `mode=reunion` (cron `cerebro-reunion-matutina` `35 12 * * *` UTC = 07:35 Austin, tras los 3 gerentes 07:30):
    consolida `foto_ejecutiva_ff/_rentas/_remodelacion` + números transversales → **UNA Directiva del día** +
    cola de decisiones (cada una con fuente) → escribe `pm_informes` tipo **`foto_ejecutiva_holding`** (dedup por
    día) + **ACTA** en `pm_brain_memory` (tipo='decisión', fuente='cerebro-reunion'). El **Inicio (`os/os.js`
    `osGlobal`) prefiere esta directiva** (`OS.directiva`, badge "reunión matutina" + "por qué") con fallback a
    reglas client-side. Verificado en vivo (200, números exactos, `acta_creada:true`).
  - `mode=compactar` (cron `cerebro-memoria-compactar` `0 8 * * *` = 03:00 Austin): dedup por (tipo, texto norm) +
    embedding coseno ≥0.94 → **freshness-wins** (más nueva gana; vieja `activo=false`+`superseded_by`, REVERSIBLE,
    nunca DELETE; suma `hits`). `pm_brain_memory` += `superseded_by`/`hits`. Verificado (dedup + reversibilidad).
  - ⚠ Gotchas cazados: (1) con RLS ON, el grant NO alcanza — el rol exec necesita **policies RLS** propias
    (`exec_ins/exec_sel/exec_upd` en `pm_brain_memory`, espejo de `pm_informes`). (2) `pm_brain_memory.tipo`
    tiene CHECK `('hecho','decisión','aprendizaje','nota')` — usar **'decisión' CON tilde**.
- 🧭 **RUTEO DE MODELO POR ROL** — `agent_registry.modelo`: DECIDEN (Comando/Gerente/Financiero/Finance/Signal/
  Meta/Integrity)=**`claude-opus-4-8`** (22) · VOLUMEN (Reportes/Optimización/Ejecución/Ops)=**`claude-haiku-4-5-20251001`**
  (18). Helper `modelForRole(capa)` en `supabase/functions/_shared/anthropic.ts`. Declarado por rol, no global.
- 🔒 **AUDITORÍA DE SEGURIDAD SEMANAL** — `security_audit_run()` (SQL, cron `security-audit-weekly` lun 08:15 UTC):
  cuenta vistas `public` sin `security_invoker` + tablas sin RLS → `notification_log`. Verificada (5 vistas
  `market_*` sin invoker = data pública, 0 tablas sin RLS).
- Migrs `20260823130000..133000`. Edge deploy: `npx supabase functions deploy cerebro-reunion` (o MCP;
  `verify_jwt=false`, hace su propia auth bearer=SERVICE_KEY / requireAuth admin — patrón ff-gerente).

## 🚨 REGLA DURA — DÓNDE MIRAR PROD (06-ago, tras perder una sesión entera por esto) · HISTÓRICO (pre-consolidación 23-ago)

- **Hay DOS proyectos Vercel con el MISMO repo y builds distintos.** `empresa-os.vercel.app` = producción de **`main`** · **`empresa-os-admin.vercel.app`** = donde van los `vercel --prod` de las ramas (es el de `.vercel/project.json`).
- `empresa-os` **sí auto-deploya por push**, pero una rama que no es `main` solo genera **PREVIEWS** (`target: null`): su alias de producción **se queda en el último build de `main`**. Por eso una feature de rama "no aparece en prod" **ni siquiera en incógnito** — no es caché, es **otro build**.
- ⚠ La línea *"URL producción: https://empresa-os.vercel.app/"* del contexto de negocio (más abajo) **NO aplica al trabajo en ramas**. Antes de debuggear un "no se ve", **confirmá el dominio y el hash del bundle**: `curl -s <dominio>/ | grep -o 'assets/bundle\.[a-f0-9]*\.js'` y compará con `dist/`.
- 🔑 **Auth / link mágico por dominio**: el front YA pide `window.location.origin` en los 4 puntos (login ✉️, recovery, portal, invitar inversionista). Si un link mágico "vuelve siempre al dominio viejo", **NO es el código**: GoTrue **descarta en silencio** cualquier `redirect_to` que no esté en las **Redirect URLs** de Auth y cae al **Site URL** (= `https://empresa-os.vercel.app`). Diagnóstico en 1 comando (si el `Location` NO es el dominio que pediste, falta en la allowlist): `curl -s -o /dev/null -D - "https://nezbaljfhhyznhltpjnk.supabase.co/auth/v1/verify?token=x&type=magiclink&redirect_to=<URL>" | grep -i location`. **Dominio nuevo = agregarlo en Redirect URLs** (`https://<dominio>/**`) **y** en `_shared/cors.ts` (o en el secret `EXTRA_ALLOWED_ORIGINS`, coma-separado — 15 edge functions usan ese CORS y el navegador bloquea la respuesta si el origin no está).
- 🧪 **Verificar como el usuario, no con stubs**: `scripts/qa-dist-real.mjs` hace login por el formulario y navega de verdad (`QA_BASE=<dominio> QA_PASS=… node scripts/qa-dist-real.mjs`). Un harness que fuerza `osInit()` o stubbea el estado **puede pasar 15/15 sobre un bug real** — pasó. Gotcha de timing: `iaLoad()` tarda ~6-8 s y la pestaña Distribuciones dispara un 2º load (`IA.dists`); esperá esos dos flags, no un `sleep`.

## 🎯 Estado (12 Ago 2026 — 📅 FLUJO MENSUAL del inversionista con SERVICIO DE DEUDA) · EN VIVO

- 📅 **El "Flujo neto" del portal ya no ignora el pago del HML/refi** (rama feat/portal-inversionista-v2, deploy `empresa-os-admin.vercel.app`; solo `os/inv-portal.js` → `renderFlujo`): el loop de "Detalle año → mes" arrancaba con `if (!invEngine.pnlSi(m.categoria)) return;` y la deuda (financiero · P&L NO) **nunca entraba** → Michelle mostraba renta $3,700, gastos ~$0 y neto $3,700 cuando paga $2,116.13 de interés HML (o $3,032.26 de refi). Ahora la tabla mensual es **Ingresos · Gastos operativos · Servicio de deuda · Flujo neto** (neto = ingresos − operativos − deuda) y la fila del año suma las tres. Nuevas arriba: tarjeta **🏦 Servicio de deuda** (itemizada HML/refi) y **💰 Flujo después de deuda** (= `balanceOp − tDeuda`, que se calculaba y no se mostraba); el **NOI se mantiene**. En "Todos los movimientos" las filas de deuda ya no van en tenue (chip 🏦) — siguen sin mover el saldo operativo.
- ⚠ **REGLA aplicada: el Flujo Mensual del portal agrupa por `mes` del ledger (mes CONTABLE), no por `fecha`** — cierra el pendiente declarado el 06-ago y hace que el neto del inversionista y el de `inv_dist_auto` sean **el mismo número**: Michelle jun-26 3,700 − 0 − 2,116.13 = **1,583.87** · jul-26 3,700 − 148 − 3,032.26 = **519.74**, verificado llamando la RPC desde la sesión del navegador. El corte a HOY sigue por `fecha` y no divergen (0 filas de `pm_expenses` con fecha futura y mes pasado).
- ✅ QA en **carga real logueada** (`scripts/qa-flujo-deuda.mjs`: login por formulario → portal en la misma sesión → click en la pestaña, sin `osInit` forzado ni stubs): **18/18 · 0 pageerrors**. ⚠ `ci:gate` **12/15**: los 3 rojos son pre-existentes de datos/infra (6 `pm_units` con Estado real vacío → `v_ocupacion` incoherente · espejo QBO del 13-jul · corrida de linaje del 29-jul). `scripts/ci-gate.mjs` ahora acepta **`SB_APIKEY`** (anon) + `SB_KEY` = JWT de un admin, para correrlo sin la service key: devuelve los mismos números que el service role.

## 🎯 Estado (06 Ago 2026 — 💸 LEDGER con servicio de deuda + DISTRIBUCIÓN AUTOMÁTICA desde el Ledger) · EN VIVO

- 💰 **PARTE 1 — el Ledger contabiliza el SERVICIO DE DEUDA** (rama feat/portal-inversionista-v2; migr `20260806100000`): `inv_ledger` YA emitía `pago_hml`/`fee`/`ref30`; el hueco real era **no poder separarlos** del resto de los `financiero` (desembolso HML, cash-out, draws). Ahora la RPC devuelve **`subcategoria`**: `'servicio_deuda'` = interés HML + cuota refi 30a · `'fee_hml'` = comisiones puntuales · `null` = el resto. Conceptos renombrados a **"Pago interés HML"** / **"Pago refi 30 años (banco)"**. Verificado: Dove 10 cuotas refi $27,260 + 3 HML $10,269 · Virginia 11 HML $30,699.89 (+2 fees $2,444 **separados**) · Michelle 10 HML $21,161.30 + 1 refi $3,032.26.
- ⚠ **Las categorías NO cambian: el servicio de deuda sigue siendo `financiero` → P&L NO.** El **NOI/saldo operativo no se movió**. Son dos cosas distintas y ninguna reemplaza a la otra: **NOI = renta − operativos** · **flujo distribuible = NOI − servicio de deuda**.
- ⚙️ **PARTE 2 — distribución automática que LEE EL LEDGER** (migr `20260806110000`, RPC **`inv_dist_auto(pid, mes)`**): `neto = renta − gastos operativos − servicio de deuda`, repartido entre **TODOS** los inversionistas de la casa por su `reparto_pct`. **Reemplaza a `inv_dist_calc`** (30-jul), que recalculaba en paralelo con otra fórmula — restaba un **PM fee del 4% MODELADO** (no es un gasto real de `pm_expenses`) y **NO restaba el interés del HML**; queda **DEPRECADA sin dropear** (las distribuciones viejas referencian su `calc_meta`; el badge de traza distingue ambas fórmulas sin reescribir la historia).
- 🗓 **REGLA: `inv_ledger` ahora expone `mes` = MES CONTABLE** (`billing_ym` en `pm_payments`/`pm_expenses` — la regla dura de Rentas; mes de la fecha en el resto). Agrupar por `fecha` habría usado la **fecha de cobro**: en Dove Springs **3 de 27 pagos** caen en un mes distinto al que corresponden. Todo consumidor que agrupe plata por mes debe usar `mes`, no `fecha`. (El Flujo Mensual del portal sigue en `fecha` — filtra por AÑO, inmaterial; declarado como pendiente.)
- ⚠ **Contrato nuevo de `inv_ledger`**: la RPC devuelve **2 columnas más** (`mes`, `subcategoria`) → requirió `drop function` (no se puede cambiar el tipo de retorno con `create or replace`). Verificado 0 dependientes en `pg_depend` antes de dropear.
- 🧯 **Casos borde declarados** en la automática: neto ≤ 0 → **no crea nada** (Bethune jul-26: −$987.98) · **reparto en 0%** → avisa en vez de crear distribuciones de $0 (**7 de 26 holdings están en 0**, incluida Dove) · duplicados casa+mes → confirma antes de sumar · reversible con ⏸ · **no mueve dinero**, solo calcula y registra. Ejemplo verificado: **Michelle jun-26 → renta $3,700 − oper $0 − deuda $2,116.13 = neto $1,583.87 × 40% = $633.55**, contra los 2 únicos movimientos del Ledger de ese mes.
- ⚠ **Gate**: 14/15. El único rojo es `(e) cobertura de linaje: corrida fresca` — la última corrida del crawler es del **29-jul (>7 días)**, condición **pre-existente**, no la introdujo este cambio. Se limpia corriendo `npm run lineage:register` (necesita `SB_KEY`). Las pestañas del admin `/inversionistas` **no están en la lista de pantallas del crawler**, así que los números nuevos no requieren alta en `data_lineage`.

## 🎯 Estado (04 Ago 2026 — 🔨 INVERSIONISTAS: estado honesto en casas EN REHAB) · EN VIVO

- 🔨 **Mueren "-Infinity / Infinity% / cap negativo"** (rama feat/portal-inversionista-v2, deploy `empresa-os-admin.vercel.app`): Wellington (en rehab, `arriendo_hab=0` → NOI −$5,974) mostraba `CAP -1.1% · DSCR -Infinity · EQUILIBRIO Infinity%`. No era error de cálculo — el indicador **aún no aplica**, pero se leía como sistema roto. Fix en el MOTOR (`os/inv-engine.js`, una definición para admin + portal): `indicadores.estadoOperativo = {enRehab, sinRenta, sinDeuda, noiAnual, arriendoPleno, motivo, texto, razonCap, razonDscr, razonEquilibrio}`.
- ⚠ **REGLA NUEVA (contrato del motor): `capValor`/`capCosto`/`dscr`/`puntoEquilibrio` PUEDEN SER `null`** — en rehab (NOI ≤ 0) salen null, y fuera de rehab se sanean los no-finitos. **Todo consumidor nuevo DEBE null-guardear** (antes `dscr` era siempre número: `Infinity` cuenta como número y `.toFixed()` no tiraba). Vuelven solos a mostrar valores cuando NOI > 0. `tir31/vpn31/porHorizonte/profit/fases/series` INTACTOS.
- 🧠 **Razón POR INDICADOR** (el sub-bug que casi se cuela): una casa **RENTADA sin cuota de deuda** (cash / pre-refi) también da DSCR no-finito pero **NO está en rehab** — Bethune conserva CAP 14.3% y equilibrio 23.9%, y solo el DSCR dice n/a con su razón real. Nunca colapsar la tarjeta CAP/DSCR entera: escondería un número válido.
- 🗄 **Cache viejo**: la columna 🧪 Simulado sale de `inv_projection` (JSON); ahí el cap negativo sobrevivió pero los ±Infinity los volvió `null` el JSON → la fila leía `— · — · — · -1.1%`. El portal pasa el cache por la MISMA regla.
- 🤖 `api/brain-chat.mjs` recibe `estado_operativo` con regla explícita (decir "aún no aplica", nunca "null"/"no tengo el dato"). 🔍 `scripts/qa-sonda.js` ahora detecta `Infinity`/`null` (este bug le era invisible). ✅ Golden `scripts/test-inv-rehab.mjs` **24/24** con control de no-regresión (casa rentando: CAP 9.63% · DSCR 1.97 · equilibrio 92%, idénticos a antes).
- ⚠ **Gotchas de deploy**: este repo **NO auto-deploya por git push** — prod se hace con `vercel --prod` explícito, y **el proyecto es `empresa-os-admin`** (no `empresa-os`): sin `.vercel/project.json` local hay que `vercel link --project empresa-os-admin --scope rental-profits` primero, si no `--yes` adivina por el nombre de la carpeta y deploya al proyecto equivocado. El 404 de `/config.js` en prod es **por diseño** (override local gitignored, con `onerror="this.remove()"`), no es un bug.
## 🎨 REDISEÑO ROYAL — azabache + cobalto (26-jul, rama `feat/rediseno-royal` → main) · EN VIVO (deployado)

- **Reskin COMPLETO a la paleta de `design-ref.html`** (en la raíz — ese archivo es la referencia visual final aprobada; NO usar `borrador-empresa-os-azules.html`, versión vieja). Reemplaza la paleta cálida+verde bosque de la migración de arriba. **NO cambió estructura, orden de secciones, rutas, fetch ni lógica — solo diseño.**
- **Paleta nueva** (fuente de verdad `ui/tokens.css`, espejo en `os/os.js osInjectCSS` #os-root, y overlays #ff/#cc/#rc): DARK `--bg:#08090C` (azabache) / surface `#131519` SÓLIDA (ya no translúcida) / `--ink:#F1F3F7` / `--mut:#8b93a1` / `--mut2:#757d8b` (subido a AA 4.41:1) / accent cobalto **`--accent:#3A5BE0`** + `--accent-2:#5C79F0` + `--grad:linear-gradient(120deg,...)` + `--glow`/`--accent-soft` / pos `#4ADE9E` / neg `#FF6B6B` / amber `#FBBF24`. LIGHT `--bg:#EEF1F6` / tarjetas `#FFFFFF` / `--ink:#0E1420` / `--mut2:#6f7785` (AA 4.51:1) / accent `#2B44C6`+`#3E5BE0` / amber `#B45309` (legible; el ref deja #FBBF24 ilegible en blanco). **Alias design-ref** en tokens: `--surface/--surface-2/--surface-solid/--border/--dim/--text/--muted/--card-sh`.
- **Componentes** (estilo design-ref sobre las clases REALES): `.card` radio 20 + sombra con brillo arriba (`inset 0 1px 0 rgba(255,255,255,.05)`) + barra de acento superior en KPIs (`.kpi::after`/`.grid.k4>.card::after`) · `h1 span` texto en degradado · `.orb` glossy multi-radial azul · panel `.brain` con **borde degradado** (padding-box+border-box) · `.bgfx` fondo negro con glow cobalto arriba-derecha + `::after` grilla tenice 52px enmascarada · return-bar/logo con glow.
- **Tipografía**: += **JetBrains Mono** (`--font-mono`, cargada en index/inversionista/mi-plan) para números/data; helpers `.mono`/`.tabnum`; números tabulares globales (ya estaban). Inter (UI) + Fraunces (titulares) se mantienen — ignore CEO en `.impeccable/config.json`.
- **Codemod reutilizable** `scratchpad/royal-codemod.py` (hex cálido/frío-viejo → royal, mapa semántico: acentos→cobalto, pos/neg/amber→semánticos royal, neutrales→escala azabache). Aplicado a ~28 JS + 3 HTML standalone; **0 hex de paleta vieja restantes** (verificado grep). Emojis de UI ya eran `osIcon()` Lucide de la migración cálida (no toqué markup). `tokens.css?v=20260726royal`.
- **QA**: build OK · `node --check` en todos · verificación browser dark+light del Panel Global (iconos Lucide activos, 0 errores consola) · **/impeccable audit 19/20** (único finding accionable: contraste `--mut2`, ya subido a AA en polish; grid-bg + gradient-text son intencionales de design-ref). **DEPLOYADO 26-jul** (merge a main SHA `e520d0d` → Vercel `dpl_2sKFiS7…` READY; prod `empresa-os.vercel.app` sirve `tokens.css?v=20260726royal` con #08090c/#3a5be0/JetBrains, sin rastro de la paleta cálida). Rollback: revertir el merge o `isRollbackCandidate` del deploy previo `dpl_6HegQ57…` (paleta cálida, SHA 0ec370f).

---

## 🎯 Estado (3 Ago 2026 — 🗓 Planner: mover UNA actividad corre TODOS sus días) · EN VIVO (commit `d8366e4`, QA en prod)

- 🐛 **CAUSA RAÍZ** (fix que "no quedaba"): una actividad multi-día se guarda como UNA fila por día en `weekly_activities` con sufijo en el nombre — `activity_name: "X (día k/n)"` (`weekly-planner.js:1027` y `:2643`) → **comparar por `activity_name` exacto NUNCA engancha los otros días** (cada día tiene nombre distinto). La cascada vieja además se había perdido sin commitear.
- 🔧 **Helpers nuevos** (weekly-planner.js): `wpBaseActivityName(name)` quita el sufijo `(día k/n)` · `wpShiftFollowersSameActivity(movedAct, oldDate, newDate, opts)` corre los días POSTERIORES de la MISMA actividad (mismo `project_id` + nombre BASE) por el mismo delta, salta domingos, excluye `status='done'`, nota `[CORRIDA …]` vía `safeUpdate`, idempotente (delta 0 = no-op). NO toca `wpCascadeReschedule` (ruta crítica) ni `wpResched*` (reprogramar obra).
- 🔀 **Integrado en las 3 vías que mueven una actividad**: `wpConfirmPostpone` (aplazar con motivo — el motivo viaja a la nota), `wpReprogramTask` (input de fecha rápido; ganó chequeo de error que no tenía) y `wpDropOnCell` (arrastre). Toast con conteo de días corridos.
- ✅ QA en prod (BD real, datos QA borrados): mover día 2 de 5 → posteriores +3 con salto de domingo, `done` y días anteriores intactos, repetir = 0 corridos.
- 📏 **REGLA DE ORO (la razón por la que antes "no quedaba")**: todo fix va `node scripts/build.mjs` → grep de la lógica nueva en `dist/` → commit → **PUSH a main** → **verificar en la URL desplegada** (empresa-os.vercel.app sirviendo el hash nuevo del bundle, recarga dura por caché). Un fix sin push + verificación en prod NO existe.

---

## 🎯 Estado (29 Jul 2026 — 📊 INFORMES AUTOMÁTICOS DE RENTAS: los 3 informes manuales, vivos) · EN VIVO (deployado, merge SHA `d6b85da` → prod `5f140b2`; ci:gate 15/15; QA prod 0 errores)

- 📊 **Reemplazo de los 3 informes que el equipo armaba a mano** (spec de los PDFs 24/29-jul; ruta `/informes` en Rentas, guard rentas/operacion/contable): **① Semanal de Ocupación y Gestión** (marca RENTAL PROFITSS · PM, 7 secciones) · **② Balance de Rentas** (marca EVERHOME, cartera + matriz de antigüedad) · **③ Combinado** (EVERHOME, cartera con días de mora + plan de acción + estado del portafolio + anexo de unidades). Flujo: elegir tipo + corte → **borrador editable** (Carlos ajusta textos) → PDF (Guardar como PDF del navegador). **Cada emisión congela un snapshot INMUTABLE** → la franja "avance entre cortes" + badges NUEVO/RESUELTO/RENTA AUMENTADA comparan snapshots reales.
- 🗄 **Migraciones aditivas (aplicadas a PROD, sin DROP)**: `20260729120000_informes_rentas` (vista `v_rentas_unidades` + `v_rentas_reservas_futuras` · RPC `cartera_matriz(corte)` [deuda por mes + neteo a-favor + **días de mora por schedule real del inquilino** `dia_exacto_pago`, no "día 1" plano + banda crítico≥$3k/medio/bajo por saldo TOTAL] · RPC `rentas_contratos_por_vencer(corte,dias)` [§5, de pm_bookings activos] · tablas `pm_cartera_snapshots` + `pm_informes` bandeja, RLS has_area rentas/operacion/contable) · `..._enrich` (generador enriquecido) · `..._cron`.
- ⚙️ **UNA RPC generadora `rentas_generar_informe(tipo, corte, origen)`** (SECURITY INVOKER) congela TODO el payload (cartera, ocupación derivada [activas=total−mant, efectiva=(ocup+reserv)/total, ingreso contratado, potencial], movimientos de la semana, serie de cortes, discrepancias, delta de ingreso) e inserta el borrador en la bandeja. **La llaman el botón "Generar" Y el pg_cron** (jobs 38 `rentas-informe-semanal` lunes 13:00 UTC · 39 `rentas-informe-combinado` día 1) — una sola definición, sin sumar funciones Vercel (límite 12). Balance = manual por corte.
- 🎨 Front: `ui/informe-render.js` (render multi-página, 2 marcas, print CSS, concatenación de strings por el landmine de backticks) + `os/os-informes.js` (panel, **namespace `INF`** — `IN` colisionaba en el bundle; ⚠ regla: chequear colisión de globals con `node scripts/build.mjs`). Registrado en os.js (5 pasos) + index.html + BUNDLE_FILES.
- ✅ **Validación contra la spec (corte 29-jul, números VIVOS)**: cartera **bruto $30,961.01 · 20 casos · 13 propiedades · julio 67.3% ($20,825)** EXACTO al PDF manual · ocupación efectiva **89.6% (41+2)/48** exacto · activas 45 / 19 propiedades / 3 ciudades. **Deltas reportados como alerta (no copiados)**: el OS netea **$900 de adelantos** que el manual sumaba como bruto (neto real $30,061.01) · Lorissa $7,200→$6,850 (abonó) · ingreso contratado $63,144.56→$62,694.56 (empalme Capitol). Smoke del renderer 3/3 con todas las marcas (bandas, NUEVO, RENTA+, mora, SALE→ENTRA, discrepancias). Build esbuild verde (`bffa850d23e1`), `node --check` OK.
- ✅ **QA en prod (browser, 29-jul)**: los 3 informes generan y renderizan con 0 errores de consola. Combinado corte 29-jul verificado EXACTO: neto **$30,061.01** / bruto $30,961.01 / 20 casos / 13 propiedades (cartera) / concentración 67.3% / ocupación efectiva 89.6% / ingreso contratado $62,694.56; matriz con bandas + días de mora; portafolio con empalmes. Bandeja dejada VACÍA (arranca limpia; cron/usuario genera fresco). ⚠ dos bugs cazados en QA y corregidos en la RPC: `totales.propiedades` mezclaba conteo de ocupación (19) con cartera (13) → var separada `v_props_ocup`; franja de avance duplicaba cortes del mismo día → serie `distinct on (corte)`.
- ⏭ **PENDIENTE (cuando se pida)**: cablear el ENVÍO automático (email/WhatsApp) del borrador desde la bandeja — el motor `_pm-send.mjs` (Resend + WhatsApp + Storage `pm-reports`) ya existe; hoy el cron deja el borrador listo y un humano lo emite (Guardar como PDF). La "franja de avance entre cortes" se llena sola a medida que se emiten cortes reales.

---

## 🎯 Estado (17 Jul 2026 · 3 — 💵 PM: estatus de cobranza por BALANCE, no por fecha) · EN VIVO

- ⏰ **v3 — vencimiento POR INQUILINO** (rama feat/vencimiento-inquilino): `pm_tenants.vencimiento_pago` espeja 👤 "Vencimiento Pago Renta" (fldrUJY0EOjKEb0Qf, texto libre; migr `20260718100000`, sync mapea `inq_vencimiento`). El front extrae el día (`pmDiaVenc`: primer número 1-31, default 3) → un saldo del MES EN CURSO pasa de "⏳ Pendiente" a "🔴 Atrasado · N días" al pasar el día del inquilino (`pmDiasVencido` sobre billing_ym; `pmTextoVencido` "1 mes 5 d"). El MONTO sigue siendo SOLO el balance (deuda). `pmTenantDebt`/`pmLateBookings`/contador incluyen ahora el mes en curso vencido. 17/17 casos de aceptación. 18/96 inquilinos con vencimiento cargado en Airtable (resto default día 3 — irlos completando).

- 🐛 **"Atrasados" falsos del PM MUERTOS** (rama fix/estatus-cobranza-balance-v2): `pmTenantPayStatus`/`pmLateBookings` marcaban atrasado por días-desde-vencimiento del MES ACTUAL sobre TODAS las filas históricas (Enero 2026 mostraba a Matthew/Daryl/Melissa con balance 0/0/−50). Ahora el estatus se deriva SOLO de **`pm_payments.deuda`** (espejo de "Balance de pago" flduMsIV5gZRIv1eU = renta pactada del período − pago, las MISMAS columnas del /cartera de 15-jul) por período `billing_ym`: deuda≤0 (guard ±$6) = al día aunque el pago haya entrado tarde · deuda>0 en período CERRADO = Atrasado mostrando EL BALANCE (no la renta) · deuda>0 en mes en curso = "Pendiente del mes" · sin renta_pactada = "Revisar" (nunca asumir la renta actual) · PadSplit = plataforma, jamás deuda. Funciones nuevas: `pmPayStatus`/`pmPayBalance`/`pmTenantDebt` (pm-main.js junto a pmBillYm). Contador "Pagos atrasados" = inquilinos únicos con deuda>0 del mes visto; lista CEO muestra Σ deuda real. Verificación 14/14 contra el código real + deuda vencida DB $13,596.01 = Airtable exacto.
- 🔧 **3 typos de decimal corregidos en Airtable** (Renta pactada sin punto: Taylor jul-25 73136→731.36 · Abigail oct-25 40000→400 · jul-25 20000→200) — inflaban $131,804.64 de deuda falsa.
- ⚠ **Gotchas de esta sesión**: (1) casi-duplico renta_pactada/deuda con columnas nuevas por trabajar sobre un checkout desactualizado — SIEMPRE `git pull origin main` antes de tocar el sync (la regla multi-sesión aplica también al repo, no solo al deploy); las columnas duplicadas expected_amount/balance fueron dropeadas y su migración borrada del historial. (2) **pg_net está ROTO en prod**: "Couldn\'t resolve host name" en TODAS las llamadas de `cron_invoke_function` (los crons pm-sync-airtable-every-15min, sync-remodel, clickup, etc. NO están corriendo — revisar; el sync manual vía sb_secret sí funciona).

---

## 🎯 Estado (22 Jul 2026 · 2 — 🔮 ANALIZADOR DE PORTAFOLIO: venta 3/5/8 + waterfall) · EN VIVO

- 🔮 **`os/inv-escenarios.js`** (puro; IRR = invEngine, equity/paper/deuda = inv_indicadores_data — cero redefiniciones): escenarios de venta 3/5/8 con TIR BRUTA (deal) y NETA (inversionista post-waterfall capital-primero) SIEMPRE juntas; **validación del ejemplo de la spec 18/18 exacta**; mapeo único `desdeDatos` (admin = portal = vista-del-inversor). Config `esc_*` en ff_uw_config + override por casa (etiquetado); flujo negativo = bandera honesta (Dove: cuota 11.39% > renta — consistente con su déficit conocido). Salidas: tab 🔮 Analizador (admin, con recomendación SOLO-ADMIN y benchmark 15%) · "¿Y si vendemos?" en Mi Casa (neta + ⓘ + "no son promesas") · 🖨 hoja 1 página por inversionista con disclaimer. Sin deuda/renta = "por completar". Smoke 16/16.

## 🎯 Estado (22 Jul 2026 — 🚑 RENTAS: sync por cron REVIVIDO + archivado manual + TCPA fuera) · EN VIVO

- 🚑 **TODOS los crons de edge functions estaban MUERTOS** (no solo Rentas): `cron_invoke_function` skippeaba en silencio sin `app.settings.service_role_key` (jamás configurada) + job 20 duplicado con host placeholder + pg_net timeout 5s. Fix: key en **VAULT** (`service_role_key`), función lee vault→setting con timeout 240s, `unschedule(20)`. Verificado: 200s, last_synced_at fresco, tick autónomo 3×200. ⚠ regla: cron nuevo de función = `cron_invoke_function` (ya autenticada); si se rota la secret key, actualizar el secreto en Vault.
- 📦 **Archivado MANUAL de propiedades**: `pm_properties.archived_manual` + RPC `pm_archive_property` + botón 📦/↩ en la card del PM (🗑 delete eliminado — revivía con el sync); el sync respeta la marca; `v_ocupacion` excluye casas inactivas. Arcadia + Cervin archivadas (21→19). Gastos junio $48,986 visible (era el sync, no el código).
- 📵 **TCPA/consentimiento SMS RETIRADO de /cobros** (UI) y **canal SMS deshabilitado en cobros-motor** (solo email) — el CEO no textea. `consentimiento_sms` sigue en pm_tenants sin UI; reactivar = restaurar canal en el motor.

## 🎯 Estado (21 Jul 2026 — 💎 MEGA-BUILD Portal Inversionistas E1-E4.5) · EN VIVO

- 💰 **E1 Saldo OPERATIVO por flag P&L** (`invEngine.pnlSi`: SÍ=renta/ingreso/operativo/tax · NO=inversion/financiero/distribucion): Ledger admin ("Saldo operativo (P&L): $X", filas NO en tenue [P&L NO] repitiendo saldo) + Flujo portal (balance = renta−gastos P&L SÍ, deuda informativa) + meses "Julio 2026" (`invEngine.mesEs`) en todos los selectores. Starbright: draw recategorizado → saldo $0 (antes −$427k). Draw jamás P&L SÍ (validación alta/edición).
- 🏦 **E2 HML desglosado + draws migrados**: Bloque 4 = hm_compra + hm_rehab (manuales) + hm_inicial CALCULADO; los 44 draw_mN ($1,906,210, 22 casas) viven como movimientos "Draws (construcción)"·financiero (item "Migrado desde draw_mN" conserva el mes → `invEngine.drawsFromMovs`); **golden Dove 46.70%/$186,668 IDÉNTICO post-migración**. Advertencia ⚠ draws ejecutados > hm_rehab. Bloque 2 += estrategia/plan_salida/fecha_exit_proyectada.
- 🏷 **E3 Info del deal**: HML en líneas (compra / HML compra @tasa / HML rehab escrow) sin duplicar; "Pendiente de definir" (nunca sin-dato); casos $0 / Compra: cash / Pendiente.
- 📈 **E4 Indicadores** (`os/inv-indicadores.js` puro + RPC `inv_indicadores_data()` con RLS del portal + `ff_hml_loans.fecha_venta` sync): por casa TIR paper/múltiplos/LTV semáforo/yield/apreciación (n/a <30d, equity≤0, por-completar declarados); por inversionista DPI/RVPI/TVPI + TIR combinada (XIRR); portafolio en admin Global (XIRR all-in/compra, mult equity, LTV pond, checklist). **Banner "valor en papel" obligatorio en ambos portales**; Bartlett negativa visible; Arcadia venta real $615k@2026-05-04; Slaughter ARV proxy. **Targets del Excel CERRADOS 21-jul tarde**: el bug era `appraisal/arv/precio_venta=0` tomado como valor (paper $0 en ~10 casas) + all-in con draws en vez de **remodel_real** (definición del Excel). Resultado corte 20-jul: **70.9%/170.9%/2.39x vs targets 71.0/171.1/2.39; Dove 35.7% y Capitol 74.4% EXACTOS**. multEquity = definición Excel (todas las casas, deuda faltante 0 — declarado). Wellington compra 205k (espejo vivo gana sobre snapshot 200k). Auditoría Buffett 23/23 (seguridad API 10/10, recomputo=render 10/10, ⓘ 10/10, móvil 390 limpio, jerarquía 4 protagonistas).
- 📚 **E4.5 Capa educativa**: tabla `glosario_terminos` (35 términos ES/EN, editable en admin tab 📚) → ⓘ universal (qué es/para qué/TU CASO con números reales interpolados), pestaña "📚 Aprende" del portal (grupos+buscador+cómo leer el dashboard), asistente con glosario + "toda sigla se define", 👁 Ver como inversionista + 🖨 Guía imprimible por casa en admin.
- ✅ QA prod headless **20/20 · 0 pageerrors** (portal + admin) · ci:gate 15/15 · detalle por etapa en LOOP/BITACORA.md 21-jul.

## 🎯 Estado (17 Jul 2026 · 2 — 💎 PORTAL INVERSOR v3: RLS real + params guardables + acceso manual) · EN VIVO

- 🐛 **BUG RLS del portal MUERTO** (migr `20260717110000`; commits 4ee0472+53d10b7+356448a): inversionistas con perfil OS (Juan, Prueba OS tienen área fix-flip) veían las 23 casas/$955,846 por la rama `or has_area('fix-flip')` de las policies inv_* — y las write policies `FOR ALL` regalaban SELECT (permissive OR). Fix: **`inv_is_investor()`** → si tenés inv_access activo, la rama admin NO aplica (read+write, todas las inv_*, inv_portal_resumen, inv_ledger). Verificado server-side: Prueba OS 24→**2 holdings/$46,000**, Juan 24→0 (sin casas asignadas), gerencia intacta. ⚠ regla nueva: inversionista+staff pierde admin de inv_* — decidir por persona (log).
- 💾 **Params por BLOQUE con guardar de verdad**: 💾 por bloque + estado sin-guardar + aviso al salir; editar un AUTO va a **`inv_param_overrides`** (no pisa la fuente, ↩ reversible, auditado con editado_por); manual → update directo (ahora con audit trigger; inv_model_params ganó columna `id`). Efectivo = override ?? base (admin `iaLoadCasa` + portal `ipLoad` mergean). **Origen claro**: `real · Airtable FF · <tabla>` / `estimado · calculado|supuesto` / draws sin Desglose Draws = "estimado · repartido en partes iguales" (Starbright) / `manual (· override)` + **ⓘ por parámetro** (qué es, fórmula, de dónde sale, link a /mapa si real:ff_*). Portal chips real/estimado/manual.
- ✍️ **Acceso manual**: crear acceso eligiendo de Airtable O con nombre+email (id `manual-…`, misma RLS, sin casas = portal vacío), ⇄ vinculable a Airtable después (re-apunta holdings/dists/docs/msgs), created_by + audit en inv_access.

## 🎯 Estado (17 Jul 2026 — 🧭 MAPA con identificadores EXACTOS de Airtable) · EN RAMA feat/portal-inversionista-v2

- 🧭 **/mapa muestra la identidad REAL de Airtable por número** (commits cba5c9a+4123b2b; ci:gate 15/15): registro generado **`os/os-lineage-airtable.js`** (bases/tablas/campos con nombres EXACTOS + IDs, esquema API meta 17-jul; regenerar con `scripts/lineage-airtable-gen.mjs`) → nodo Base = nombre exacto + baseId (+ sync + ⚠ sandbox) · Tabla(s) = nombre + tableId · Columna(s) = **una por campo con field ID** (derivados listados uno a uno; texto sin campo directo = "derivado/espejo", sin inventar IDs; fld inline se resuelve al nombre VIGENTE) · botón **🔗 Abrir en Airtable** (`airtable.com/<baseId>/<tableId>`) en flujo/lista/diagrama/ⓘ · export += IDs. Resolución de alias en `LM_AT_TALIAS` ("Pagos HML"→"Pagos interes (HML & REFI)", etc.).
- 📡 **Base efectiva por módulo DECLARADA** (verificado 17-jul: secrets `AIRTABLE_BASE_ID/_FF/_REMODEL` NO existen → el default del código es la base real): Rentas → **"Empresa Rentas — Modelo Nuevo (sandbox)" `apptTKRYbx6gu701i` ⚠ el nombre dice sandbox** (pendiente CEO: confirmar/renombrar) · FF → "Flipping Rentals matriz " `applMXFyPq1hXj7iN` (NO la Plantilla) · Remodel → "Empresa de Remodelación" `appwFRqnkyyRljOld` · QBO → 4 realms (Flipping Rentals/Structure One/EverHome/Rental Profits). Las 5 bases parecidas NO leídas quedan listadas en el mapa. Tabla completa en IMPLEMENTATION_LOG 17-jul. ⚠ gotcha: FF y Remodel comparten table IDs idénticos (`tblw28KVOUcCAKZBU` es "Propiedades" en FF y "Propiedad en Reparación" en Remodel — bases duplicadas en su origen): el diccionario SIEMPRE se keyea por baseId.

## 🎯 Estado (14 Jul 2026 — RC: métricas LIMPIAS de Remodelación) · EN VIVO

- 💰 **El CC de Remodelación muestra utilidad/rentabilidad LIMPIAS** (separan la plata de Remodelación de la del flip): 3 campos fórmula nuevos en Airtable → columnas aditivas `utilidad_remodelacion` (fldQ3vhMvBuCDUJVR) / `rentabilidad_remodelacion` (fldywMYaieK1bQ9MP) / `deficit_ff` (fldXxmdccFiGk1zPI, Draws − Valor cliente) en `remodel_at_properties` (migr `remodel_at_properties_add_metricas_limpias`), mapeadas en `sync-remodel-airtable` v49. Solo Finalizado tiene utilidad/rent limpia (la fórmula lo exige).
- 📐 **Una definición**: `rcUtil()`/`rcRentPct()` en `remodel-command-center.js` — Utilidad, rentabilidad (ponderada Σutilidad/Σvalor_cliente, criterio B9), líderes, EVR, OKRs, ficha y EBITDA leen de ahí; Reportes CEO heredan vía `rcObraDataset()`. Déficit/Exceso F&F = tarjeta KPI + fila por obra. Las columnas viejas (`ganancia`/`rentabilidad`, con Draws) NO se borraron: visibles como "con Draws" (tarjeta, adaptador `utilidad_con_draws`, CSV).
- 🐛 **BUG FIX valor_cliente (14-jul tarde)**: `valor_cliente` mapeaba Draws Ingresados (fldAP3lI2FgXds14q) — corregido a "Valor Remodelación al cliente" (fldsRWMQJ4Lv86GOU, el mismo que usa la fórmula de Utilidad) en sync v53. Draws preservados en columna aditiva `draws_ingresados`. Efectos: margen Servicio/rentabilidad 15.0→16.9%, Pipeline proyectado −$121k→+$103k (estaba negativo de mentira), Arcadia/Bethune/Bramble 145/170/95→100/130/65k. Tarjeta "Margen realizado" RETIRADA (era Σ(monto_real−1.05×gastos)=$146,279 — utilidad con plata del flip, redundante con Servicio). `valor_interno` sigue mapeando fldsRWMQJ4Lv86GOU (semántica de avance vivo intacta).
- 🚨 **Alertas del RC = solo EN CONSTRUCCIÓN (14-jul tarde)**: `compAlerts` ya no lista finalizadas ("cerró con Xd" fuera). Activas: atraso = HOY vs fecha ESTIMADA (rojo >10d) · sobre-presupuesto PROPORCIONAL al avance (gasto > presup×avance%×(1+`alerta_sobrecosto_pct`)). Histórico → insight en Cerebro ("N cerraron con >10d, peor X") + Estimado vs Real. `rcDQ.sobrePresup` (total) sigue igual para badges/EVR/líderes.
- 🗑 **Déficit/Exceso F&F RETIRADO (14-jul tarde)**: la métrica salió del RC (tarjeta, ficha, adaptador, CSV) y el sync v52 ya NO lee fldXxmdccFiGk1zPI — borrar ese campo en Airtable no rompe nada. La columna `remodel_at_properties.deficit_ff` queda vacía y DEPRECADA (comment en DB; sin DROP, regla dura). Reversible re-mapeando. Utilidad/Rentabilidad limpias y Servicio/Costo F&F/Total empresa NO dependen de ella.
- 🧹 **Reconciliación de borrados en horas (14-jul tarde)**: `remodel_worker_hours` ahora tiene `archived_at` (migr `remodel_worker_hours_soft_delete`) — `sync-remodel-workers` v12 archiva al final de cada corrida lo no-visto (`last_synced_at < runStart`), ACOTADO a la ventana de fechas del pull (+ filas con fecha null); el upsert revive reapariciones (`archived_at: null`). Responde `archived: N`. Lectores filtrados: vistas `v_remodel_nomina_ledger` + `remodel_worker_pay_summary` (recreadas con `security_invoker=on`) y los 2 selects directos (desglose quincenal del RC, Sabueso). ⚠ Dato: Wellington tiene pares duplicados idénticos en Airtable (2× 30-jun, 2× 8-jul, ~$170 c/u) — vivos, no fantasmas.
- 💵 **Nómina fresca (14-jul tarde)**: "Pull Airtable" del RC dispara AMBOS syncs en paralelo (obras + `sync-remodel-workers`; si horas falla el pull no se rompe, toast warning) + cron pg_cron `sync-remodel-workers-hourly` (`5 * * * *`, a los :05 para no pisar obras :00/:30 ni clickup :00). Fix "?" del desglose quincenal: `rcWorkerName(h)` (definición única) = `worker` texto → `worker_rec_id` (LINK B8 a Personal en Campo) resuelto contra `remodel_crew_rates` ya en memoria → '?'.
- 👤 **Líderes POR PERSONA (14-jul tarde)**: la sección Líderes del RC explota "Lider asignado" por coma y agrega por persona individual con atribución COMPLETA (una casa con N líderes cuenta entera en cada uno → la suma por persona puede superar el total; nota visible en la UI). Una agregación (`rcAggLideres(porPersona)` en rcCompute), dos vistas: toggle 👤 Por persona (default; la usan insights/cerebro) / 👥 Por cuadrilla (el conjunto exacto, como antes) vía `RC.liderVista`. Reportes CEO conserva su propia regla `RP.liderMode` (split-50/primero/ambos) — NO se tocó.
- 📏 **Regla ÚNICA de avance (14-jul tarde)**: función SQL `remodel_avance_regla(proceso, total, done)` — Finalizado o todas-done → 100 · Pre construcción → 0 · con tareas → hechas/total · sin dato → null. La usan `recompute_casa_progress` (trigger del Planner) y la RPC `remodel_recompute_avance_all()` que el sync (v51) llama antes del write-back → los campos Airtable "Avance Real (Planner)" + "Porcentaje avance obra %" se llenan para las 26 casas (finalizadas 100, pre 0), siempre consistentes (salen del mismo `avance_real`). `v_remodel_progress` NO se tocó (sigue siendo el % técnico del Planner). ⚠ os.js B7: el avance promedio del OS ahora filtra `curso` (las finalizadas con 100 inflarían el KPI).
- 🏢 **Servicio vs empresa (14-jul tarde)**: fila de 3 KPIs en el CC — "Servicio (Remodelación)" (= utilidad limpia) · "Costo Fix & Flip" (`costo_ff` = Intereses fldHCVca9YHhdCRrA + Servicios Públicos fldvxo2bZXekrGSib + Muebles fldILIa8f6cQCTsiW, SUMADO EN EL SYNC — sin columnas nuevas en Airtable) · "Total empresa" (`resultado_empresa` = servicio − costo, null si no Finalizado). Columnas aditivas en `remodel_at_properties` (migr `remodel_at_properties_add_costo_ff_resultado_empresa`), sync v50. Ficha por obra: filas Costo F&F + Total empresa.

---

## 🎨 MIGRACIÓN CÁLIDA + VERDE BOSQUE (25-jul, rama `feat/ui-warm-forest`)

- **Paleta nueva (reemplaza el azul-gris frío/teal viejo).** Base cálida: dark `--bg:#14110c` (carbón cálido) / light `--bg:#f7f5f0` (papel hueso, `--paper` = alias de `--bg`). Acento de marca = **verde bosque `--accent:#2f6b4f`** (`--accent-ink:#fff`), `--grad` verde. Acentos: `--a1:#6fbf95`/light `#2f6b4f`, `--a2:#4e9b72`, `--a3` dorado `#c9a85c`/`#8a6a2f`. Muted/tinta cálidos (`--ink:#efe9de`/`#211e17`, `--mut:#a89f8f`/`#5f594c`). Espejo sincronizado en `os/os.js osInjectCSS` (#os-root dark+light).
- **Iconos: `ui/icons.js` (NUEVO, va ANTES de kit.js en index.html y en BUNDLE_FILES + STATIC_COPY).** `osIcon('name', {size,color,spin})` = SVG Lucide inline (133 iconos, generados de lucide-static con `scripts/gen-os-icons.mjs`; regenerar con `npm i --no-save lucide-static` + ese script). `kitStatusDot('ok'|'warn'|'bad'|'off', label)` reemplaza 🟢🟡🔴. `kitSpinner`/`kitSkeletonRows` = carga de marca. **REGLA: cero emojis como icono/estado en la UI** — usar osIcon/kitStatusDot. Glifos tipográficos (◧ ▦ ∑ ⌂ → ✓ ✗ ● ○ ◐ ♾ ∞) SÍ quedan. Excepción: emojis en CONTENIDO saliente (mensajes WhatsApp `edu-whatsapp.js`, captions viral, slides `edu-presentations.js`, y el campo `emoji:` de `cronograma.js` que va a WhatsApp/`<option>`) se PRESERVAN — no son UI.
- **Loaders:** `kitLoading`/`kitSpinner` (spinner verde + `.ui-spinner`) reemplazan "⏳ Cargando…". Skeleton shimmer `.skel`. `os.js` loader del shell = spinner de marca.
- **Tipografía:** titulares serif editorial **Fraunces** (`--font-display`, cargada en index.html + heads standalone; h1/h2/h3 global en tokens.css). Números tabulares: `body{font-variant-numeric:tabular-nums}` + `.hero-num` (ahora SÓLIDO verde, ya NO degradé de texto).
- **Codemods de la migración (en `scripts/`, reutilizables):** `emoji-codemod.mjs <archivo> [--bare --strip-rest --no-strip]` (scanner que respeta strings/comentarios/regex; splice `osIcon` en HTML, strip en texto plano/atributos, `kitStatusDot` para semáforos; `--no-strip` para archivos de contenido). `palette-codemod.mjs <archivo>` (hex frío→cálido; salta selectores `[style*=…]` del reskin). QA browser (25-jul): dark+light OK, 133 iconos, 0 errores de consola, helpers y overlays sin throw. Quedan ~72 emojis (comentarios, regex de lógica, contenido saliente) — intencionales. NO deployado (falta OK del CEO).

## 🎨 REGLA DURA — SISTEMA DE DISEÑO (12-jul, Fase 0 aprobada por el CEO) — HISTÓRICO, paleta superseded por la migración cálida de arriba

- **Toda superficie nueva importa `ui/tokens.css` + usa `ui/kit.js`** (kitMoney/kitMoney2/kitHero/kitCard/kitRow/kitInput/kitInputSm/kitBadge/kitEmpty/kitLoading/kitError — globales del bundle). **PROHIBIDO**: Tailwind nuevo, `:root`/paleta propia por módulo, hex/rgba de paleta inline. Familia canónica = la del shell (`--bg/--ink/--mut/--mut2/--glass/--glassb/--a1/--a2/--pos/--neg/--amber`); la familia FF (`--card/--line/--txt2/--txt3`) vive como ALIAS en tokens.css — no redefinirla.
- **Regla "sin dato ≠ $0"**: todo KPI usa `kitMoney(n)` (null→'—'), jamás un $0 mudo. **Contraste**: ningún texto legible por debajo de `--mut2`; badges amber en light = texto sólido `#b45309` sobre `#fef3c7`.
- **LIGHT canon** (CEO): `--bg:#eef1f7` (tinte, no blanco) · tarjetas `#ffffff` + borde `#e2e8f0` + sombra `0 1px 2px rgba(15,23,42,.05), 0 6px 16px rgba(15,23,42,.06)` + radio 16-20 · `--ink:#0f172a/--mut:#475569/--mut2:#64748b` · `--a1:#2563eb/--pos:#0f9d6b/--neg:#dc2626/--amber:#b45309`. ⚠ `osInjectCSS` (os/os.js) mantiene un ESPEJO scoped a #os-root — sincronizar si cambian los tokens.
- Quick wins globales en tokens.css: media query ≤768px (grids k2/k3/k4 → 1 col), `.overx` + `#os-root .card:has(table){overflow-x:auto}`, `.repbtn` por fin definido (el shell lo usaba sin definirlo).
- ⚠ **ANTI-RESET (12-jul)**: los overlays #os-root/#ff-overlay/#cc-overlay/#rc-overlay traen reset `#id *{margin:0;padding:0}` (1-0-1) que PISA clases bare (0-1-0) — mató los paddings del ARV (ap-css, ya auto-prefijado) y los del kit. tokens.css tiene bloque de SUPERVIVENCIA re-afirmando paddings del kit bajo esos 4 IDs; todo CSS de módulo en overlay se scopea con el ID contenedor; overlay nuevo con reset → sumarlo al bloque.
- 🪦 **Zombies borrados (12-jul)**: `cleaning-planner.js`, `ops-planner.js` (ya redirigían a Cronograma) y `remodel-dashboard.js` (reemplazado por el RC CC; `app.js` redirige el type legacy) — bundle −467 KB. **Auditoría completa de las 37 superficies (semáforos + problemas) en la conversación del 12-jul**; olas pendientes: replicar patrón Cash-Out en Intereses/Ingreso/Negocio · modernizar clásicos (PM/Cronograma/Estimador) · unificar standalone — revisar UNA POR UNA con el CEO antes de aplicar.
- ✅ **Olas 1-4 ejecutadas (12-jul)**: ola 1 patrón Cash-Out en Calc 1/4/5 del UW (hero+kit+ajustes colapsados, lógica intacta, golden tests OK) · ola 2 light canon en FF CC y Rentas CC + colores pelados tokenizados (color-mix) · ola 3 clásicos: red de seguridad dark p/ estilos inline (#modal y PM), pulido light (sombras+contraste), tablas con scroll en celular, acento PM light→canon · ola 4 standalone linkean tokens.css (locales ganan, cero regresión). **Finos CERRADOS (12-jul tarde)**: Seguimiento del Estimador con filtro por etapa + paginación 25/50/100 (`RM_SEG`, KPIs sobre el proyecto completo) · Viral studio con onboarding estático en el HTML (causa raíz del vacío: render async sin placeholder) + labels con contexto en los 4 tabs · Diagnóstico con minimapa de pasos navegable (`w.maxIdx`, solo recorridos clickeables) + toast de guardado. La auditoría de diseño quedó 100% ejecutada.
- 🏆 **ADN PREMIUM (12-jul, norte = Cash-Out + ARV Pro v2)**: tokens += `--grad` (teal→azul) / `.hero-num` (número en degradé) / `.tag-grad` / sombra light `0 6px 22px rgba(23,43,77,.07)`; kit += **kitVerdict/kitConfidence/kitRange/kitToggle**; `kitHero` sin color = degradé. **TODAS las 🟡 convertidas** (4 agentes paralelos + spot-check con screenshots en prod light+dark): FF Command (veredicto+hero+confianza+toggle Simple/Experto), Deals (veredicto déficit + vacíos 👻 + kanban mobile), Finanzas (kitMoney+hero+confianza), CRM (KPI contratos hardcodeado→"—" honesto [el campo NO existe en Airtable] + búsqueda), Cerebro (errores humanos), Contable (veredicto Sabueso con $ sin conciliar + P&L overx+consolidado destacado), Operación (hero cobranza), IA (labels chat+banda specs), inv-admin (labels+unidades+kitError), Reportes CEO (filtros colapsables+anti-NaN+hero R1), Planner (toasts al mover+hero semana), Educación (hero+empties). Los 4 agentes con guards `typeof kit*` y cero lógica tocada; golden tests verdes.
---

## 🎯 Estado (15 Jul 2026 · 5 — 📣 COBROS FASE 1: motor + dashboard, todo en sandbox) · EN SANDBOX

- 📣 **Módulo de Cobros F1** (commit a7dc51f; base propuesta Carlos; Twilio+Resend — NO TextNow/Gmail): motor diario `cobros-motor` + webhook `cobros-twilio-webhook` deployados, **modo SANDBOX** (A2P 10DLC en trámite) y **cron sin programar** — no se enciende sin OK del CEO. Construido SOBRE la definición corregida: v_cobros_estado (contrato activo = manual > is_currently_renting > renta pactada del mes corriente) → dry-run 38 casos: **Xinquan $0 · Jackelin $1,700 · Shamyra $637.50 parcial** ✓. Gates en cadena: plantilla→destino→opt-out→**TCPA consentimiento_sms**→link de pago→quiet hours 8-20; followups (3/7/10 tras el día de pago de cada inquilino) SOLO con vencido neto>0; dedupe por mes; TODO envío queda en cobros_recordatorios con provider_response; STOP → opt_out permanente. Plantillas ES/EN cordiales (TDCA) en pm_message_templates con {{link_pago}} (tenant.payment_link QBO → link_pago_default; sin link = skip registrado). dry_run es DEFAULT en la función. **Para encender**: consentimientos+teléfonos+links cargados, secrets TWILIO_*/RESEND, modo→live, cron. Fase 2 (late fee/notices) espera abogado. **Dashboard /cobros EN VIVO** (OK del CEO, commit 3b16016, QA prod 14/14): 4 métricas separadas + % cobranza + aging + checklist de encendido (26 sin consentimiento/2 sin tel/28 sin email/28 sin link) + timeline con entrega del proveedor + config TCPA inline (fecha+origen) + ▶ dry-run desde la UI. Linaje 211/211 en 31 pantallas.

## 🎯 Estado (15 Jul 2026 · 4 — 📋 INFORME DE CARTERA: tres números, neteo por inquilino) · EN VIVO

- 📋 **Informe de Cartera desde el OS** (`/cartera`, app en Rentas; módulo `os/os-cartera.js`; QA prod 17/17; detalle en IMPLEMENTATION_LOG): **pm_payments += renta_pactada (fldpUSJ1HdZQmQPMH) + deuda (flduMsIV5gZRIv1eU)** (migr + sync deployado + resync — sin la pactada el OS no podía calcular deuda). **UNA definición, TRES números** (RPC `cartera_informe(p_mes, p_desde)` invoker + v_cartera_inquilino/kpi): DEUDA VENCIDA (meses cerrados = mora real) · POR COBRAR DEL MES (NO es mora) · SALDO A FAVOR (adelantos CON pactada — los negativos históricos sin contrato espejado NO cuentan). **NETEO POR INQUILINO** (a favor cubre vencido→mes en curso): Xinquan neto $0 · Jackelin 1,700. **Validado AL CENTAVO: jun 9,860.00 · jul 42,137.50 · a favor 6,900.00 · total 51,997.50** (el manual sumaba todo como vencido, +195%). Aging 0-30/30-60/60+ · variación ⚠>100% ("¿real o carga de registros?") · anexo con detalle mes a mes · CSV + PDF (reportOpen). **Sabueso C22** (a/b/c: favor-cubre, mes-en-curso≠mora, variación — umbral `cartera_var_pct`). Linaje: 6 números + pantalla en el crawler (199/199 en 30 pantallas). ⚠ gotcha: `CA.desde` undefined = default mes-1; null/'' = todo el historial.

## 🎯 Estado (15 Jul 2026 · 3 — 💎 INVERSOR v2: ajustes de Juan + mapa colapsable) · EN VIVO

- 💎 **Admin /inversionistas v2** (obs Juan; QA prod 19/19; migr `20260715120000` aplicada): **Modelo & movimientos** — P&L DERIVADO de la categoría (ingreso/operativo/tax=SÍ · inversión/financiero=NO, tooltip; ya no se teclea `linea`) · fecha en vista YYYY-MM · selector con **guía de flujos** (DRAW=financiero, utilities=operativo) + **sugerencia automática** por descripción (`iaSugerirCat`, no pisa si tocaste el select) · `factura_url` = link "📄 Ver factura" · movimientos **✎ editables + 🗑 soft-delete con `inv_audit` inmutable por trigger** (insert/update/archive con email) · **UNA FUENTE**: ✍️ manuales + ⚙️ auto-importados del inv_ledger con badge auto·fuente (no se re-teclean; el 💰 Ledger = vista read-only de lo mismo). **Params en los 9 BLOQUES de Juan** (colapsables `iaTogglePB`; badge auto·fuente vs manual; total invertido calculado en b3; b6 muestra holdings + % operador calculado; b9 metas con "＋ faltan" que precarga el alta). **Distribuciones — bug Yeisson muerto**: `comprobante_url` (pago) ≠ `k1_url` (fiscal), ambos VISIBLES como links en admin y portal, ✎ edición auditada. **Casas & reparto** con buscador + orden. 🗺️ **/mapa: árbol con empresas colapsables** (cerradas por default salvo la activa, persistido en `lm_emp_open`; la búsqueda expande). ⚠ gotcha QA: los hints de bloques colapsados no están en el DOM hasta expandir.

## 🎯 Estado (15 Jul 2026 · 2 — 🕸 LINAJE v3: overlays 192/192 + lectura EN VIVO + ocupación única) · EN VIVO

- 🕸 **Crawler v3 con drivers de overlays** (`scripts/lineage-coverage.mjs`): recorre FF CC (+UW 6 calcs hipotético), Rentas CC, Remodel CC (+Reportes CEO), PM clásico (7 tabs) y Estimador — extractores por DNA (`.card.kpi`/`.kit-kpi`/`.hero-num`/`.kpi>.l+.v`/Tailwind). **GATE TOTAL 192/192 números en 29 pantallas · 0 sin cadena (verificado en prod)** · 95 descubiertos curados el mismo día · **216 números activos en data_lineage, 0 pend, 0 bug** · ci:gate 15/15. Kanban/tablas de registros excluidos por diseño (su linaje = columnas). Gotchas: overlays se abren por función global (`openFFCommandCenter`/`openCommandCenter`/`openRemodelCommandCenter`/`openPmSystem`/`openRemodelPro` con sys mínimo `{name,type,data:{},config:{}}`) — NO existe osOpenApp; separar apertura y navegación en evals distintos (race "Promise was collected").
- ⚡ **LECTURA EN VIVO**: `OS.lineage` (data_lineage) en osLoad + `osLineageRow(empresa,sistema,dato)` = fuente efectiva. Cableado el dual-source real: **"Renta mensual actual" de la Ficha** — evidencia prod 4/4: $4,850 FF·Propiedades → reasignar en /mapa → **$4,800 Rentas·Unidades ⚡mapa** → revertir → $4,850, todo en data_lineage_audit. Patrón a extender número por número (contable sigue gateada a reconciliación QBO).
- 🎯 **Ocupación ÚNICA**: el "bug del Global" era falso positivo (ya leía v_ocupacion; 90% = 43/48). El divergente real era el PM clásico → `pmOccupancyAt` prefiere v_ocupacion (dueño = fallback + detalle por casa/cobranza). **Prod 4/4: Global = Empresa Rentas = Rentas CC = PM Resumen (90%, 43/48)**. ⚠ nuevo hallazgo: PM·Finanzas "Ocupación portafolio" 80% = media del período financiero (3ª definición) — warn en el mapa.

## 🎯 Estado (15 Jul 2026 — 🔎 LINAJE v2: viene → número → alimenta + GATE de cobertura) · EN VIVO

- 🔎 **/mapa evolucionado al flujo por número** (réplica del artefacto "conexiones-al-detalle"; QA prod 15/15): árbol Empresa→sistema→**números** con semáforo + buscador; por número: ① cadena de nodos Base→Tabla→Columna→Vista→ƒ→[número] + fórmula + "🧬 la vista lee de…" · ⬅ se alimenta de (inverso) · ② **qué alimenta** con tarjetas que saltan y siguen la cadena (feeds curados 31 + automáticos por tabla·columna y por vistas consumidoras — diccionario `LM_MIRROR` Airtable→espejo pg). Schema v2 migr `20260715100000` (metric_key/vista/feeds[]/origen + vista alias **`data_lineage`** + `lineage_coverage_runs`).
- 📈 **GATE DE COBERTURA**: `npm run lineage:register|gate:lineage` (`scripts/lineage-coverage.mjs`) — crawler headless de las 7 pantallas del shell OS que exige que TODO número visible tenga entrada en data_lineage (labels dinámicos normalizados: meses/años/dígitos fuera). Inaugural: 64 vistos → 40 descubiertos → 40 curados → **63/63 verde en prod**; `ci:gate` ahora **15/15** (+3 checks: corrida ≤7d, 0 sin registro, 0 sin curar). 🔴 hallazgo: **Ocupación Rentas del Global = 90% (regla dueño /34) vs v_ocupacion 93.75% (/48)** — dos denominadores, marcado BUG en el mapa. Cobertura 121 números / 0 sin fuente (tabla por sistema en IMPLEMENTATION_LOG). ⚠ v3 pendiente: crawler sobre overlays (FF CC secciones/PM/Planner/Estimador) + switch de fuente en runtime. Gotcha QA: tras `osNav('/mapa')` esperar `.lm-num` en el DOM (lmLoad renderiza DESPUÉS de la query de cobertura).

## 🎯 Estado (14 Jul 2026 · 5 — 🗺️ MAPA DE CONEXIONES + Ficha conectada por property_id) · EN VIVO

- 🏠 **Ficha: paneles Rentas/Remodelación por fin conectados** (commit 21e41a8, QA prod 22/22): `osCasaMatch` resolvía anclando SOLO en Rentas por dirección — "Austin, **Texas**" (FF) vs "Austin, **TX**" (Rentas) → pid=null → paneles vacíos con la casa rentada. Fix: 2 pasadas (dirección en cualquier fuente → property_id → re-resolver TODO). Panel Rentas = renta/gastos mensuales de FF·Propiedades + **flujo = v_ff_portafolio.flujo_mes (una definición, la del CC)** + detalle Rentas si hay espejo; etapa rentada sin datos → "faltan datos" ámbar; sin obra pero terminada → "✔ Obra finalizada" con resumen FF. **Childress: 4,850 / 3,260 / 1,590 exactos en prod.**
- 🗺️ **Mapa de Conexiones `/mapa`** (commits 8420340+4b6df45; módulo `os/os-lineage.js`): linaje de datos NAVEGABLE Y EDITABLE de las 4 empresas — **`data_lineage_map`** (84 números: pantalla → base·tabla·columna con field IDs + fórmula + semáforo OK/REVISAR/BUG/PEND; migrs `20260714110000`+`110500`; RLS por áreas; **audit inmutable por trigger** con email del editor) · árbol Empresa→Sistema→número (réplica del artefacto explorador) · LISTA con buscador/estado inline/✎ reasignar fuente/＋ agregar/✕ soft-delete · DIAGRAMA de nodos SVG (colores por base, clic aísla, panel "Cambiar fuente" — réplica del artefacto real) · export JSON/CSV · **"la vista lee de…" GENERADO de information_schema** (RPC `lineage_view_usage` → `scripts/lineage-gen.mjs` → `os/os-lineage-views.js`, 27 vistas — regenerar tras cambiar vistas). Gobernanza: reasignar cifra contable → PENDIENTE hasta reconciliar QBO. **ⓘ "de dónde sale"** en la Ficha (`osLinI(empresa, sistema, dato)` reusable en cualquier pantalla). Accesos: card en Global + link en cada empresa. Pendientes declarados en IMPLEMENTATION_LOG (materializar KPI desde el mapa, switch de fuente en runtime, drag de nodos).

## 🎯 Estado (14 Jul 2026 · 4 — 💎 PORTAL INVERSIONISTA v2: el Excel entero dentro del portal) · EN VIVO

- 💎 **Portal `/inversionista` reescrito a las 5 pestañas del CEO** (rama feat/portal-inversionista-v2 → main; detalle en `RESUMEN-PORTAL.md`; QA headless 32/32 claro+oscuro × 1280/390, 0 pageerrors): **Mi Portafolio** (saludo + capital + 12 métricas con **ℹ concepto+fórmula con los números del socio**: CoC [base REAL = ventana 12m del ledger si hay rentas, si no modelo — siempre declarado], Equity Multiple, ROI anualizado CAGR, riqueza hoy, DSCR/CAP/VPN/Profit/TIR · info del deal · **evento de refi**: payoff HML + prestamista + cash-out real `cashout_real` con chip y "tu parte = máx(0, cashout−déficit)×%" · línea de tiempo real/modelo · P&L split inv/empresa · desembolso banco + 3 fases · 5 gráficas theme-aware · **comparativo de escenarios read-only** [Est/Proy/Real en browser + Simulado del cache inv_projection]) · **Flujo Mensual** (3 recuadros renta/gastos-sin-draws/balance + detalle año→mes + timeline completa; ⚠ pm_expenses trae gastos con FECHA FUTURA → se excluyen de la operación, solo quedan en el registro) · **Distribuciones** (próxima estimada + CSV) · **Documentos** (buscador + tipo) · **Mensajes**. **Tema claro/oscuro propio** (toggle ◐ persistido, light canon, charts adaptan ticks/grid). Admin `/inversionistas` += **➕ Agregar parámetro** (todo "sin dato" del portal es cargable sin código), **tab 📄 Documentos** (insert + soft-delete + vistas del audit), badge 🧪 ejemplo en Dove. Seed migr `20260714100000` (estrategia/plan_salida/cashout_real 22,207.13/es_ejemplo de Dove — idempotente, YA aplicada en prod). Goldens re-verificados con el código real: **TIR 46.70 / VPN 186,668 EXACTOS** + DSCR/CAP/CoC/payoff a mano (scratchpad verify-portal.mjs). CoC real de Dove = −7.8% y es CORRECTO (cuota refi 11.39% > renta neta; cuadra con el déficit $10,358). ⚠ gotcha QA: `innerText` respeta text-transform → labels `.lab` salen en MAYÚSCULAS (comparar case-insensitive). 🐛 **Bug pre-existente arreglado**: el rewrite SPA excluía `inversionista` como PREFIJO → `/inversionistas` (admin) daba 404 en prod por URL directa; ahora `inversionista$` (exacto) — smoke admin prod 7/7.

## 🎯 Estado (14 Jul 2026 · 3 — 🏠 CC FF REDISEÑADO: patrimonio real + déficit correcto) · EN VIVO

- 🏷 **Ficha de casa: "Compra $0" muerto (14-jul, smoke 7/7)**: la fila del panel FF leía `m.ff.purchase` (campo INEXISTENTE — roto en TODAS las fichas); ahora tarjeta y fila leen UNA cadena (`osFichaNums`): compra = v_property_360 → deal · all-in = compra+draws → +rehab REAL → +rehab estimada (SIEMPRE rotulado, guardrail faltan_draws) · equity = ARV − all-in misma cadena. 2º campo fantasma del sync: "Costo Remodelación Real" (fld9VNYFBzFI3tRdc) mapeado y nunca guardado → `ff_deals.remodel_real` espejado. Charles: compra 247,000 · all-in 357,000 (247+110 real) · equity 138,000 — exactos. ⚠ slug de ficha = dirección COMPLETA (osSlug del address).

- 🏠 **Command Center FF con el patrimonio del CEO** (smoke prod 13/13): regla ÚNICA del portafolio en `v_ff_portafolio`/`v_ff_portafolio_kpi` (modelo_negocio ≠ Operador Y stage ≠ vendida; espejo extendido: modelo_negocio flddjD6WsvC98sM1k + estrategia COMPLETA + draws_menos_deficit fldL4iMolqEibENFj — sync v13). Bloque superior: **VALOR $9,415,000 (23 casas)** [cuadre exacto 11,450,000 − 1,300,000 operador − 735,000 vendidas] · EQUITY $4,435,350 · DEUDA $4,979,650 (refi|HML por casa, drill + reconcile QBO Δ) · **RENDIMIENTO doble honesto: +$179,289 op / −$363,406 c/deuda** (pago = hml_payment + ref30_payment — así cuadra el número del CEO) + conteos 23 hechas/5 entregadas/23 portafolio (19-2-2). **Déficit del CEO** = [Total Draws − Déficit Total] − Down Payment (Capitol −$37,963.76 exacto) con GUARDRAIL: draws=0 con obra → "⚠ faltan draws" y EXCLUIDA del acumulado (−$289,188; Wellington/Charles/Slaughter/Harvest +3 = 7 casas, ver PENDIENTE_HUMANO.md). Pipeline/Propiedades: estrategia palabra completa, all-in = compra + Total Draws (fallback *rehab rotulado), badges Operador/Vendida atenuadas fuera de totales. "Capital del Holding" eliminado del command (v_capital_deployed sigue en /contable). ⚠ gotcha QA: el CC se abre por ruta de APP (/fix-and-flip/underwriting) + ffGo(), no por /fix-and-flip.

## 🎯 Estado (14 Jul 2026 · 3 — 💼 INVERSIONISTAS: ranking por capital desplegado) · EN VIVO

- 💼 **Módulo Inversionistas del FF CC rehecho** (obs CEO "no sirve"; bundle 1cbd3d5a00fc): **LISTA de co-inversionistas ACTIVOS** rankeada (capital desc, desempate nº casas) desde **`v_inversionistas`** (security_invoker; regla: 0 < ownership nuestro < 100% = sociedad viva · 100% = les compramos la parte, fuera · 0% = operador, va en su módulo · **vendidas = "salida realizada"**, se listan sin sumar). Capital = **`capital_aportado` PURO** (fldrePoqg3C3caiZ5, columna nueva + sync v14 — `capital_inversionista` quedó coalesced con fld2aby0lrH7iQNWw y difiere: Stonleigh 45k vs 35k aportado). Rentabilidad honesta: rentada = participación×(renta−gastos)×12÷capital · vendida = utilidad entregada÷capital · sin dato = "pendiente" (MEK 2 casas s/dato). **Verificado EXACTO al esperado del CEO: Jefferson $188,000/4 · MEK $112,870.14/2 · Ivy $77,000+Arcadia salida · … · TOTAL $654,746.14 · 11 inv · 16 casas.** QUITADO: propuesta-al-Cerebro (BACKLOG INV-1: modelo real), capital del holding, VIP/rangos, consocios, contratos sin firmar, cap table, 4 modelos (−FF_MODELOS/ffCapitalHero/ffCapCalc/ffPropuesta/ffCrmGuia). FF.invRank se carga con el resto del FF CC.

## 🎯 Estado (14 Jul 2026 · 2 — ⛓ CALCS ENCADENADAS: una base HML, payoff fluye solo) · EN VIVO

- ⛓ **Las 5 calcs del UW encadenadas** (rama feat/calcs-encadenadas → main, smoke prod 13/13): **UNA base del HML** = préstamo bruto %fin×(compra+DRAW TOTAL) resuelta por PUNTO FIJO en ffUwCalcNegocio (el interés del draw corre sobre el préstamo; antes Calc 1 $291,780 ≠ Calc 4 $280,000) — Calc 4 la lee de negocio.prestamo, NADIE la recalcula. Del Negocio cierra con **"EL HARD MONEY TE PRESTA"** (bruto − puntos − fees lender = desembolso neto) y **"PAYOFF DEL HML"** (principal + hml_capitaliza editable) — dos números distintos; el payoff se stashea en inp._payoffCalc y la Calc 3 lo usa solo (prioridad: override manual > pagado real Airtable > ⛓ calculado > saldo HML; "↩ volver al calculado" en la UI). **Tiempos separados (obs #11): meses_obra + meses_renta = hold DERIVADO** — interés HML × meses_OBRA (no el hold: carry −40% en el ejemplo), utilities × hold; deals reales: obra = hml_months, renta = hueco (interest_until_rent/mensual); legacy guard en ffUwAbrir (meses_hold viejo → obra=hold, renta=0, números intactos). **Intereses = DOS MODELITOS SEPARADOS (obs CEO, entregado fino 14-jul)**: tarjeta 1 "🔨 Pago mensual al Harmony" (solo interés CON CENTAVOS = préstamo ⛓ Del Negocio × tasa/12 — NO depende de meses; interés total del hold con meses editable: 295,856@12% → $2,958.56/mes · ×5m = $14,792.80) y tarjeta 2 "🏦 Pago mensual de la refi" (P&I amortizado sobre préstamo ⛓ Cash-Out: LTV×valor tasado / tope DSCR / override — 336,973@7.125%/30a → $2,270/mes); compra/%fin ya NO se re-teclean en Calc 4 (viven en Calc 1); Calc 5 (modelos + fallback) suma línea "⏳ Durante el hold" = flujo pagando el HML ⛓ en vez de la cuota DSCR. Verificación 6/6 con el código real (scratchpad verify-intereses.mjs) + before/after en IMPLEMENTATION_LOG.md 14-jul. Verificado (código real + prod): compra 200k · remod 100k · obra 3 · renta 2 → base 295,856 en Calc 1 y 4 · interés 8,876 · desembolso 288,428 · P&I refi 2,101 · cash-out honesto −2,640 (antes +293k con payoff 0). Goldens cash-out EXACTOS.

## 🎯 Estado (14 Jul 2026 — 🎯 ARV CERTERO: error medible vs tasaciones reales) · EN VIVO

- 🎯 **ARV certero deployado** (rama feat/arv-certero → main): motor puro `pm/ff-arv-engine.js` (UMD, en index.html Y BUNDLE_FILES antes de ff-arv-pro) = UNA matemática para Simple/Experto/back-test. **Back-test contra las 12 casas con "Valuación por el Appraisal": MdAPE 9.0→4.9% · sesgo −7.6→−1.6% (meta ≤6/±2 ✅)** vía `scripts/arv-backtest.mjs` (calibra y persiste en ff_uw_config + arv_calibracion; v_arv_calibracion alimenta el banner "🎯 precisión ±X% sobre N casas" + ♻ recalibrar 1-click con nudge al cerrar casa nueva). Claves: mediana PONDERADA (similitud×recencia×cercanía), outliers MAD, filtros tasador 1mi/6m/±15%/±1cama/tipo con EXPANSIÓN adaptativa declarada, saneo de subject (el condado dice 1 cama en Dove/Childress → dato DUDOSO, jamás usado en silencio), **gate PROVISIONAL** (conflictos multi-fuente RentCast/Airtable/manual, chips "usar N"), triangulación comps|AVM|assessed×1.235|tasación previa (⚠ >8% con razón probable), sesgo por SUBMERCADO (78745 +4.4 n=3 · 78664 +12 n=2 · Marlin −1.6 n=2). Params calibrados: GLA $70/sqft · cuarto $8k · baño $12.5k · MAD-k 3 · bias +3%. **Cervin (disparador): $415,773 → $457,539 con 4 camas confirmadas** (evidencia 460-480k) ✓ en prod. Caveats: n=12 (sobreajuste mitigado con MdAPE robusto + zips n≥2); Dove −20% y Childress −12.9% ADENTRO (tasaciones DSCR income-infladas — ni el AVM llega). Cuota RentCast 30/50 (cache 30d). ⚠ QA: sesiones paralelas pisan los passwords 🧪 → resetear dentro del script de smoke; ARV difiere ±$2 node/browser (FP).

## 🎯 Estado (13 Jul 2026 — 🏗 REBUILD AUDITORÍA MAESTRA mergeado a main) · EN VIVO

- ✅ **SCOPE B (obs del CEO) cerrado y deployado (13-jul, bundle 4227018da6a8, smoke 15/15 + portal 8/8, gate 12/12)**: UW **base = compra + DRAW TOTAL** (uw_base_modo en config; 335,080→301,572 exacto) + hold default = obra calibrada 1.8m + tasas HML/DSCR unificadas por deal (ffUwTasaHml/Dscr, editables en Calc 4) + payoff ⛓ del deal · **v_portal_inversor** (invoker sobre RPC inv_portal_resumen SECURITY DEFINER; tarjetas por casa en el portal; RLS probado con QA users por password — QaPortal2026!rls seteada a los 🧪) · Planner full-viewport + KPIs colapsables (wp_kpis_open) · Estimador nav 3 pasos (RM_GROUPS/RM_ACTIVE) · guía CRM + scorecard líderes (rcLiderScorecard) · **IA N8 funcional**: ia_data_whitelist + edge fn ia-data (JWT del usuario, gate aprobado_por, RPC ia_aprobar_artifact solo-admin) + __IA_DATA__ inyectada al sandbox. ⚠ gotchas: ia_artifacts check carril ampliado a 'datos' · RPC nueva = 404 hasta notify pgrst reload schema · main está checked-out en el worktree empresa-os → desde acá se pushea rama:main (fast-forward).

- 🏗 **Backlog completo de la Auditoría Maestra ejecutado y deployado** (rama `rebuild/os-audit-2026-07` → main; 21/22 ítems, detalle en `IMPLEMENTATION_LOG.md`): **capa única de KPIs** (v_capital_deployed, v_property_360, v_obras_kpi, v_ocupacion 48/45/3/0=93.75%, v_pnl_casa con interés HML, v_rent_roll, v_supuestos_calibrados, v_divergencias_legacy, v_casas_fantasma, v_disciplina_clickup — todas security_invoker, key property_id) · `property_alias` (175 aliases, QBO/ClickUp mapeados, Marlin fan-out) · kit de decisión (`ui/kit-decision.js`: glosario 24 términos, kitTerm/kitDrill/kitNext/kitKpi/kitSkeleton + noZeroAsReal/reconcileLE) · motor de reportes (`ui/report-engine.js` + reportCasa en la ficha) · nómina POR LINK (0 sin tarifa, 0 deudas negativas) · espejo QBO re-sincronizado (= QBO vivo, as_of) · checks Sabueso C19–C21 · gobernanza IA (área ⊆ allowed_areas + audit log inmutable) · **gate de CI** `npm run ci:gate` (12/12 ✓ — un tile que falle los 4 checks del punto 8 no mergea).
- ⚠ Gotchas nuevos: qb-oauth/sync renombra labels ("TOTAL ASSETS" mayúsculas — comparar case-insensitive) · vistas con subqueries correlacionadas + RLS → timeout con select * (usar CTEs) · innerHTML serializa & → &amp; (QA por innerText) · `osGo` NO existe (navegar por location.href en QA headless).
- 🙋 Acciones humanas pendientes (en el log): retirar campos legacy en la UI de Airtable · comprobante required en el form de pagos · N8 carril datos-lectura IA (spec lista).

---

## 🎯 Estado (12 Jul 2026 · noche 3 — 🎯 CALC 6: VISTA UNIFICADA PRO + ONE-PAGER) · EN VIVO

- 🎯 **Calc 6 rehecha** (rama `feat/ff-vista-unificada-pro`, módulo `pm/ff-unificada-pro.js`; `ffUwViewUnificada`/`ffUwPresentacion` delegan): **el deal de un vistazo encadenando las 5 calcs SIN recalcular** (todo de `ffUwComputeAll`) — banda veredicto GO/NO-GO con guardrails en palabras · secciones El proyecto (compra/remo/draw/**meses de obra y hasta rentar REALES** de ff_draws: cubiertos+hueco; el load de UW.draws ahora trae hml_months/intereses) · La inversión (pone HUD con centavos/presta Harmony/ARV con chip de confianza del TASADOR si corrió/MAO) · Renta y flujo (**chip del modelo elegido** de Calc 5) · El retorno (cash-out/capital recuperado con **♾️ si ≥100%**/ROI/all-in con barra) · **línea de tiempo** compra→obra→renta→refi→recuperado. **Faltantes honestos**: hipotética vacía muestra "🟡 falta: cargá X →" con link a la calc — nunca $0 fingido.
- 📄 **One-pager inversionista** (`ffUnificadaOnePager`, print CSS): RENTAL PROFITS + dirección + veredicto + hero 4 KPIs + Inversión requerida (HUD desglosado)/Proyecto/Retorno/Renta y flujo/Recuperación (timeline) + footer fecha + "Preparado por Rental Profits" + disclaimer. Mini-mapa OSM estático con onerror-hide (el servicio staticmap es flaky). ⚠ foto real: Airtable solo tiene links Drive no embebibles y attachments expiran — si se quiere foto, campo URL pública. QA prod 15/15 · 0 pageerrors · PDF verificado (puppeteer page.pdf).

---

## 🎯 Estado (13 Jul 2026 · noche — 📊 ANALÍTICA FF: métricas que sí sirven) · EN VIVO

- 📊 **Analítica & KPIs del FF CC reconstruida** (módulo `pm/ff-analitica.js`; `ffSecAnalitica` delega, fallback = vista vieja): **7 secciones** — S1 volumen 28 ops + ritmo 1.5/mes (close_date) · S2 rentabilidad realizada (Arcadia $615k/neta $11,928/ROI 7.0%; Slaughter "🟡 faltan datos"; lectura: **HOLD, no flip**) · S3 flujo operativo **+$179,289/año** vs post-deuda **−$363,406/año** (carry = hml_payment + ref30_payment ×12 de las 19 en renta — los ref30 de casas "rentada" también cuentan) · S4 patrimonio **$9,415,000** − deuda QBO $5,974,414 = equity **$3,440,586** → multiplicador **3.6×** · S5 proyección con slider 2–6% (equity proyectado amortiza el DSCR) · S6 velocidad (55d calibración; crudo 57d valida) · S7 pipeline refi (15 en HML, 12 🟢 listas al 75%×ARV) + concentración (v_inversionistas: Jefferson 28.7% > umbral 25%) + salud (1 sana/16 déficit/2 sin datos/7 obra). Todo con kitDrill "de dónde sale" + kitNext. ci:gate 12/12 · smoke prod 12/12.
- 🔑 **Reglas de negocio descubiertas** (verificadas al centavo): "casas propias" = activas, no vendidas y `modelo_negocio ≠ "Prestación de Servicios como Operador"` (Charles/Arthur Stiles/Bitter Creek se operan p/ terceros — NO patrimonio) · "co-inversión activa" = v_inversionistas ($654,746.14) NO Σ capital_aportado histórico ($917,598) · el post-deuda del CEO incluye cuotas ref30 en casas stage "rentada".
- 🗄 Espejo: campos de VENTA de "Datos por casa" → `ff_hml_loans` (precio_venta/utilidad_bruta_venta/utilidad_neta_venta/roi_venta, migr `20260713110000`) + `fecha_ref30` al select de ffLoadAll. ⚠ coordinación multi-sesión: deployar sync-ff-airtable pisa la versión del otro — siempre partir del MERGED (pasó con modeloNegocio/venta: redeployado unificado).

---

## 🎯 Estado (13 Jul 2026 — 🗓 Planner: sin domingos + barra colapsable + 📆 Reprogramar obra) · EN VIVO

- 🗓 **Ajustes UI del Planner** (`weekly-planner.js`, aprobados por el CEO): vista **mensual Lun–Sáb** (columna domingo oculta, solo vista; si hay tareas cargadas en domingo aparece nota ámbar con fechas clickeables — no se esconden en silencio) · **barra de actividades colapsable** (✕ en las tabs cierra; pestaña vertical "📥 Actividades" reabre; preferencia en localStorage `wp_sidebar_hidden`; el toggle también quedó en "⋯ Más" para desktop). La grilla semanal YA era Lun–Sáb.
- 📆 **"Reprogramar obra"** (botón 📆 en la fila de cada casa): mueve TODO el calendario de una obra **N días hábiles** (adelante/atrás) o a una **fecha de inicio directa** — solo cambian fechas (duración/orden/depends_on/etapa/responsables intactos), Lun–Sáb sin caer jamás en domingo (`wpAddWorkDays` firmada, distinta de `rmAddWorkDays` que además excluye sábados). Pregunta **¿re-plan (re-basa baseline) o atraso de ejecución (baseline queda → Desviación registra)?** · flujo PREVIEW (tabla por etapa, no escribe) → Confirmar → **Deshacer** (corrimiento inverso + start_date restaurado). Hechas/canceladas NO se mueven. Historial en **`remodel_reschedules`** (migr `20260713100000`, RLS has_area('remodelacion'), anon sin grant); si la tabla faltara degrada a deshacer-de-sesión. Consulta TODAS las actividades de la obra por DB (wpState.activities es solo la semana visible). Actualiza `remodel_projects.start_date` (el Estimador se re-ancla solo por offsets).
- 🚚 **Charles Street corrida +4 días hábiles** (aprobado, obra atrasada en arranque, re-plan): start 2026-07-07→**2026-07-11**, 153 actividades fecha+baseline, entrega 15-sept→**19-sept**. Backup fila por fila + README de rollback en `supabase/rollbacks/20260713-charles-street-*`; registro sembrado en `remodel_reschedules` (deshacer disponible desde la app).
- ⚠️ **Gotchas de QA headless nuevos**: el **service worker recarga la página** ~1 min tras cargar (controllerchange) → en el dev server (sin fallback SPA) da 404 a mitad de suite; stubear `navigator.serviceWorker.register` con `evaluateOnNewDocument`. La contraseña de `qa-admin-test@` la pisan sesiones paralelas → resetear por Auth admin API antes de cada corrida (uid `dd245e03-…`, ver memoria).

---

## 🎯 Estado (12 Jul 2026 · noche 2 — 🚪 CALC 5: INGRESO POR MODELO DE NEGOCIO) · EN VIVO

- 🚪 **Calc 5 rehecha como comparador de modelos** (rama `feat/ff-ingreso-modelos`, módulo `pm/ff-ingreso-modelos.js` en index+BUNDLE; `ffUwViewIngreso` delega; `ffUwCalcIngreso`/unificada intactos — renta_mensual sigue de fuente): **4 modelos LADO A LADO** (Casa Completa · Por Habitaciones · Por Unidades · Mixta) con bruta + flujo neto + CoC por modelo, el que más genera resaltado 💰 GENERA MÁS + frase comparadora ("generás $4,800 vs $3,100 — $1,700 más/mes, vacancy 10% vs 5%"). **Tarifas calibradas con Rentas REAL** (verificado vs pm_units: hab $780–880 · estudio $1,000–1,150 · apto $1,600–2,200 · casa Austin $2,600–3,700 · Marlin $1,000–1,400) en `ff_uw_config` migr `20260712120000`: `ing_hab` 800 · `ing_estudio` 1100 · `ing_apto` 2000 · `ing_casa` 3100 · `_marlin` 1200/450 — **editables POR ZONA** (sur/norte/rr/marlin, key `ing_<tipo>_<zona>` fallback base; zona auto por dirección/zip, override en la UI). **Vacancy por modelo** (`ing_vac_*`: casa 5 · hab 10 · unidades/mixta 8). **Mezcla real desde `pm_units`** (UW carga pm_properties/pm_units, dedupe por nombre; Childress → 6 hab exactas) + # hab de RentCast (Calc 2) + manual. Casa completa sugiere RentCast /avm/rent. Botón "→ Usar como renta" setea renta_mensual (explícito). Ejemplos verificados: Childress 6×800=$4,800 ✓ · Shadow 1 apto+2 est=$4,200 ✓ · Marlin casa $1,200 ✓. ⚠ gotcha: las clases `grid k4` del shell OS NO existen en el overlay FF → grid inline. QA prod 14/14 · 0 pageerrors · claro/oscuro verificados.

---

## 🎯 Estado (12 Jul 2026 · noche — 🚦 ARV SIMPLE: decidir en 10 segundos) · EN VIVO

- 🚦 **Calc 2 con toggle Simple/Experto** (rama `feat/ff-arv-simple`, mergeada; lógica INTACTA — regresión exacta): **Simple (default)** = franja subject verificable ("✓ Esta es tu casa" / "¿no es esta? corregila") · hero "Valor de reventa estimado (ya remodelada)" con **confianza EN PALABRAS** (nivel + por qué: dispersión/pocos comps/ajustes grandes) y rango "Si sale flojo / Lo más probable / Si sale bien" · **semáforo ¿Conviene?** 🟢🟡🔴 (compra vs oferta máx, tolerancia `arv_semaforo_tol_pct` 5%) con **oferta máxima = `allin_max_pct`(75%)×ARV − remod REAL de la Calc 1** y la cuenta visible fila por fila · mapa 300px · **comps tipo Zillow** (chip "★ La más parecida" al de menor gross, checkbox usar, "ajustada a $X") + nota "N no entraron → Experto". **Experto** = todo lo denso (ficha completa, criterio, resumen, grilla 1004 default, factores, calibración). Verificado Shadow: oferta máx $249,462 vs compra $245,000 → 🟢.
- 🎨 **Gotcha de TEMAS (clave)**: el overlay FF (`#ff-overlay`) tiene SU PROPIO `data-theme` y define `--ink/--mut` (NO existen `--txt2/--txt3/--card/--line` ahí — esos vienen del shell OS via html[data-theme]) → los estilos `.ap-*` usan `var(--ink)/var(--mut)` + **color explícito en los contenedores** (sin eso, modo claro = texto blanco sobre tarjeta blanca). En QA headless, cambiar tema = setear data-theme en html **Y** en #ff-overlay. Leaflet: **animaciones OFF + map.remove() antes del re-render** (innerHTML deja el contenedor huérfano → "_leaflet_pos" pageerror). QA prod 16/16 · 0 pageerrors · antes/después claro+oscuro en artifact.

---

## 🎯 Estado (12 Jul 2026 · tarde — 🗺 ARV UX PropStream: Calc 2 rediseñada al mockup del CEO) · EN VIVO

- 🗺 **Calc 2 con la UX del mockup PropStream** (rama `feat/ff-arv-ux-pro`, mergeada; lógica/calibración INTACTAS — regresión ARV exacta): **ficha del subject completa** (APN, condado, subdivisión, dueño + owner-occupied/absentee, HVAC, pisos/techo, valor tasado por año land+improvements, última venta de history, acres; specs editables como stat-chips con 🟡 faltante) · **mapa Leaflet central** (lazy desde **jsdelivr — el CSP de vercel.json bloquea unpkg**; tiles OSM pasan por img-src https:; pins divIcon con **iconSize:null** [si no recorta labels] mostrando $precio·distancia, SUBJECT en gradiente, filtrados atenuados, click en pin resalta la tarjeta) · **criterio de búsqueda visible** (chips editables = filtros) · **resumen SUBJECT vs BAJO/PROMEDIO/ALTO** · **comps como TARJETAS** (status Active/Inactive, foto placeholder [RentCast no da fotos], ajustes ±verde/rojo, valor ajustado + peso pill, incluir/excluir) + **toggle GRILLA 1004** lado a lado (columna subject azul sticky, secciones Ajustes/Resultado, ✅ al de menor gross) · hero con **barra de rango** cons/prob/opt + chips Δ Airtable/appraisal. CSS scopeado `.ap-*` con tokens del tema (claro/oscuro). Gotcha: "Bend" vs "Bnd" (RentCast abrevia) → el warning de dirección compara solo 10 chars normalizados. QA prod 13/13 + antes/después en artifact.

---

## 🎯 Estado (12 Jul 2026 — 🏷️ ARV PROFESIONAL: Calc 2 = tasador con comps RentCast) · EN VIVO

- 🏷️ **Calc 2 rehecha como TASADOR 1004** (rama `feat/ff-arv-profesional`, módulo `pm/ff-arv-pro.js` en index+BUNDLE): dirección → **RentCast** (edge fn `rentcast` v5: endpoint nuevo `property` = subject sqft/camas/baños/año/lote/features + `value` con `compCount=20`; cache 30d, cuota 50 — 7 usadas) → **filtros del tasador** (dist 0.8mi / 12m / sqft ±25% / camas / baños / año, checkbox por comp, 3–8) → **motor de ajustes por comp** (GLA $/sqft con override por zip `arv_adj_gla_psf_<zip>`, cuarto/baño $15k, año %/año, lote $/sqft, tendencia %/mes + manuales: condición/ubicación/concesiones/otros[piscina-garaje-fireplace]; RentCast NO trae features del comp → 🟡 manual) → valor ajustado + **Net/Gross Adj %** (warn >25%) → **reconciliación ponderada 1/(gross+2)** → ARV + rango ±6% + confianza (n/gross prom/dispersión). **NUNCA $/sqft promedio × sqft.** Estado en `UW.a.inputs.arvpro` (persiste con el análisis). ARV Airtable sigue de fuente de verdad; botón explícito "usar como ARV".
- 📏 **Calibración/aprendizaje**: `ff_deals.appraisal_link` espejado (Link Appraisal `fldOg97WmkVIQ0k0o`, sync deployado por `npx supabase@latest functions deploy --use-api` — el npx FUNCIONA aunque el CLI local esté roto) — 28/28 con PDF 📄. Tabla de 15 casas ARV vs appraisal (12 usadas + 3 excluidas de `arv_calib_excluir`: Capitol/Stonleigh/Barkbridge[/Slaughter]): |error| prom 9.0%, sesgo +4.2%, **sugerencia de bias que aplica un humano** (`arv_bias_pct` + por zip n≥3). 25 keys `arv_*` en `ff_uw_config`, TODAS editables desde la UI (`apCfgSet`). Meta <5% con semáforo.
- ✅ Demo real Shadow Bend: subject 1744sf/2bñ/1977 (camas 🟡 manual), 20 comps → 12 pasan filtros → 8 reconciliados → **ARV $467,526** (rango 439–496k) vs Airtable $460k (Δ+7.5k) vs appraisal $535k (−12.6% — ni los comps llegan al appraisal: señal honesta). QA prod 10/10 (0 pageerrors, excluir comp recalcula, 15 PDFs).
---

## 🎯 Estado (12 Jul 2026 — 💰 UW Calc 3 Cash-Out itemizada, refis reales EXACTOS) · EN VIVO

- 💰 **Calc 3 Cash-Out reescrita** (`ffUwCalcCashout`, rama `feat/ff-cashout-refi`) con ingeniería inversa de los refis REALES de Champions Funding (DSCR 30a): **estado de cierre itemizado** — valor tasado → ×LTV **y tope DSCR** (renta÷DSCR_obj − T/12 − S/12 despejado a principal; con renta baja manda el DSCR, caso Echo) → préstamo → −payoff → **−costos itemizados** (a fees Champions uw $1,495+proc $695+orig %; b título $2,100+escala; c interés prepagado préstamo×tasa/365×días; d seguro prima+impound; e **impuestos = valor×tasa condado×(1+M/12)** — computado, no plano) → **CASH-OUT** + box **escrows = plata propia guardada** + capital recuperado neto + recupera % (**♾️ retorno infinito** si ≥100, propagado a Unificada y deck). FIX del bug: antes era ARV×75%−payoff sin costos (inflado).
- 🔎 **Descubrimientos de la ingeniería inversa**: (1) el campo Airtable **"Monto Pagado al HML con la Refi" = payoff puro + costos de refi** (todo menos el cash-out) → identidad `préstamo − pagado = cash-out` EXACTA en Michelle/Echo/Childress/Meadow (⚠ **Dove Δ$3,133.80** — revisar en Airtable); el payoff puro se deriva `pagado − costos itemizados`. (2) **La base del préstamo es la TASACIÓN del refi (appraisal), no min(ARV, appraisal)** — Childress lo prueba: 75%×appraisal 380k = 285k con ARV 355k. (3) Tasa DSCR reverseada **7.125%** → `dscr_tasa_anual` actualizada (era 7.5 supuesto); PITI modelo vs reales Δ≤$165.
- 🗄 Migr `20260712100000`: `ff_hml_loans` += `monto_prestamo_refi/monto_pagado_hml_refi/fecha_refi/pct_banco_refi` (sync `sync-ff-airtable` v12 los mapea de "Datos por casa"; el LTV se precarga del % real del banco) + 11 seeds `refi_*` en `ff_uw_config`. **Golden tests `scripts/test-uw-cashout.mjs` (corren el código real): Michelle $23,093.29 · Echo $10,951.14 · Childress $50,968.24 · Meadow $138.63 EXACTOS** + camino HUD manual (payoff $272,116.57 + itemización orig 1.5% = costos $25,790.14 ✓).

---

## 🎯 Estado (11 Jul 2026 · tarde — 🏭 IA v3.1: modo ECONÓMICO, Haiku + Prompt Poderoso) · DEPLOYADO (⚠ sin créditos API)

- 💸 **Optimización de costo sobre v3**: la entrevista corre ENTERA en **Haiku** (`claude-haiku-4-5-20251001`, ~$0.01-0.03/wizard vs ~$1 con Opus) y **se QUITÓ el auto-build por API** (sin build Opus 16k, sin verificador Sonnet, sin action `publicar`). Tools quedan 2: `preguntar` (ficha en cada turno, igual) + **`finalizar`** → el **PROMPT PODEROSO lo arma el SERVIDOR** (plantilla maestra Guía v2 fija: 10 campos + requisitos técnicos anti-hardcode/anti-red + instrucción de entrega con insert a `ia_artifacts`) — determinista, costo cero.
- 📋 Al finalizar: spec en `ia_specs` con **ficha_json + carril + tipo** (migr `20260711110000`) — carril **libre → estado 'aprobado'** (el empleado ve el prompt + botón "📋 Copiar prompt · Pegá esto en Claude Code para construir tu artefacto") · carril **ok → 'pendiente'** (el empleado NO recibe el prompt, queda para el OK del admin, con advertencia "NO CONSTRUIR SIN APROBACIÓN" dentro del prompt). Upsert por session_id (re-finalizar pisa el mismo spec). El artefacto se construye en Claude Code y se publica a `ia_artifacts` (write = has_area('ia')/admin) → Galería intacta.
- ⚠️ **BLOQUEADOR 11-jul**: la cuenta Anthropic de `ANTHROPIC_API_KEY` (Supabase Secrets) quedó **SIN CRÉDITOS** ("credit balance too low") → ia-builder (y fm-ai-coach/remodel-ai/etc.) devuelven 502 con el error claro. Recargar en console.anthropic.com → Plans & Billing y correr `qa-ia-v31.mjs` (scratchpad) para el E2E pendiente.

---

## 🎯 Estado (11 Jul 2026 — 🏭 IA v3: FÁBRICA DE ARTEFACTOS guiada, Guía Maestra) · superseded por v3.1

- 🧙 **Wizard sobre la v2**: `ia-builder` ahora sigue la Guía Maestra — entrevista UNA pregunta por vez que llena la **FICHA DEL ARTEFACTO (10 campos)** (tool `preguntar` devuelve la ficha cada turno → **barra de progreso 10 pasos real** en el front) → **`proponer`** (pasos del flujo + carril; el front dibuja el diagrama con cajas CSS y el empleado CONFIRMA antes de construir) → **`entregar_libre`** exige caso de oro + caso borde con `tests_pasan` + **verificador independiente** (Sonnet `claude-sonnet-4-6`, tool `veredicto`: lógica vs los 2 casos + caza hardcode; 1 auto-corrección con feedback `[VERIFICADOR]` dentro del mismo request) → estado **`demo`** (paquete en `ia_sessions.paquete_json`, iframe sandbox inline + "Probalo con: caso de oro") → **publicar es `{action:'publicar'}` explícito** (ya no auto-publica). Reglas duras del cerebro: un solo trabajo por artefacto, PROHIBIDO hardcode (datos = inputs), resultado LÓGICO (decisión, no volcado de datos), paquete = artefacto+diagrama+**instructivo** (botón 📖 en la Galería).
- 🗄 Migr `20260711100000`: `ia_sessions` += `ficha_json`/`paquete_json` + estados `propuesta`/`demo`; `ia_artifacts` += `ficha_json`/`instructivo`. Rate limit subido a 30 msg/10min (el wizard usa ~8-12 turnos). E2E v3 en prod (`qa-ia-v3.mjs`): Prorrateo de Renta publicado (la IA detectó un error de matemática del usuario en el ejemplo de oro 💪) + WhatsApp/Airtable → propuesta carril OK → spec. Latencias: pregunta 4-15s · build+verificación ~56s.
---

## 🎯 Estado (11 Jul 2026 — 💵 UW Calc 1B "El inversionista pone" con HUD-1 real) · EN VIVO

- 💵 **Calc 1B recalibrada con el HUD-1 de Bethune** (rama `fix/ff-inversionista-pone-hud`, mergeada): **Base = compra + rehab** (el rehab holdback, NO el draw 1A con intereses/utilities — así Bethune da 410k exacto) · **Préstamo = Base × %financia** (input por deal: default 90% Harmony, 100% permitido) · **Pone = Down + gastos de cierre − créditos**. Gastos de cierre en 3 grupos editables (defaults calibrados Bethune, seed en `ff_uw_config` migr `20260711100000_uw_hud_closing`, fallback en `ffUwDefaults`): fees prestamista (origination 1.5% del préstamo + doc $1,495 + draw $500 + uw $995 + prepaid $2,042.40) · título/escrow/registro ~$3,400 (title 2,050/escrow 550/recording 250/UCC 150/courier 100/guaranty 300) · wholesale opcional (checkbox + assignment; Bethune $40,000). **Créditos = earnest + option + proración impuestos — se ACREDITAN, no se suman**; línea "ya pagado como earnest/option $Y · falta al cierre $Z". **Verificado EXACTO: Bethune 240k+170k al 100% → cierre $54,582.40 − créditos $4,370.79 = $50,211.61** (node 13/13 + QA prod 10/10 con el deal real). Propagado: `_ctcCalc`→recupera% (Cash-Out) · `_cashLeftIn`→cash-on-cash · Vista Unificada KPI+cadena · deck (`ffUwPresentacion`). Anclas reales de Airtable como Δ (`_ctc_real`, `_closing_real`); `closing_costs` legacy sin uso; `UW_M2` = formato con centavos (fidelidad HUD).
---

## 🎯 Estado (10 Jul 2026 — 📐 CIERRE ANTI-RECAÍDA: definiciones 9-jul + 10 checks + Capa 0) · EN VIVO

- 📐 **Motor de cierre `os/os-cierre-engine.js`** (UMD puro node+browser, en `index.html` + `BUNDLE_FILES`): las definiciones de la reunión 9-jul codificadas en el OS, NO en fórmulas de Airtable. `remodelCasa()` (monto real = draws − intereses − servicios − muebles − extensión · gasto interno real = trab+mat+5% margen · utilidad/rentabilidad · **drift vs la fórmula espejada de Airtable** — descubierto: la fórmula de Airtable NI SIQUIERA es consistente entre casas: Virginia Δ$21,912, Idlewood Δ$8,120, Michelle Δ$2,080) · `ffCasa()` (meses cubiertos vs hueco=DÉFICIT, jamás sumar ambos como el mismo periodo; pago mensual CON escrow; extensión suma al déficit) · `precioCobrar()` (= gasto interno esperado + rentabilidad objetivo + lo que sale del draw). Cada output declara valor+fórmula+fuente. Umbrales SOLO en `ct_config` (`CFG_DEF` como fallback).
- 🐕 **Sabueso += C9–C18** (los 10 checks de la reunión, `CierreEngine.runChecks()` desde `ctRunChecks`): C9 valor idéntico en 2 casas (centavos=crítica, redondo=info) · C10 meses interés > plazo+extensión · C11 draws≠cobrado · C12 labor $0 con obra ejecutada · C13 muebles doble conteo (columna + "Amazon - muebles" en materiales) · C14 sin comprobante (regla Silvia, agregado top-N) · C15 HML vencido sin extensión · C16 corte de empresas (servicios antes de 1ª renta=F&F, después=Rentas; `billing_ym` vs min renta por property_id) · C17 fuera de rango (mediana×8 por categoría, top-N por ratio) · C18 labor cargada a casa sin obra en el periodo (matcher por calle: Personal en Campo "RAMBLE" ↔ Remodel "514 Ramble Ln"). **RETRO-TEST 5/5** con los valores pre-corrección del 9-jul (Capitol/Virginia $546.31 ✓ · Michelle/Echo $654.41 ✓ · Idlewood 5+6=11>6 ✓ · Capitol gap $21,250 ✓). HOY dispara ~69 findings/$1.9M (C11 16 casas $596k · C15 9 vencidos · C14 1,815 pagos sin soporte $1.15M). ⚠ claves de findings a 48 chars + dedupe en `ctPersist` (claves truncadas colisionaban → "ON CONFLICT cannot affect row a second time").
- 🗓 **Vista "Cierre del mes"** (toggle en el Sabueso): SOLO excepciones (sin info), agrupadas por **dueño único por dato** (`ct_config` `cierre_dueno_*`: Juan draws/HML · Michell facturas · Alejandra obra · Carlos rentas · Silvia comprobantes; fallback por empresa) + 📋 copiar. Objetivo 30–60 min.
- 📄 **Capa 0 anti-tecleo**: `?resource=parse-doc` en `api/brain-chat.mjs` (fusionado, límite 12 fns; auth `verifyAuth`, máx 3MB body Vercel) — statement HML → {pago_mensual CON escrow desglosado, interés, fees, **extension{monto,meses,fecha}**} · factura → items categorizados material/mueble/herramienta (mixta=partir filas, mismo comprobante). **Nada se ejecuta solo**: modal 📄 en el Sabueso → `ct_doc_extracts` estado `propuesta` → humano aprueba → statement con extensión inserta `ff_extension_payments` (🆕 tabla OS, migr `20260710100000_cierre_anti_recaida`, el campo no existe en Airtable) · factura → `agent_proposals` p/ cargar en Airtable. Probado E2E en prod con PDF sintético: escrow+extensión extraídos exactos.
- 💰 **Regla del draw en el Estimador Pro** (`rm/rm-tab-editor.js`, card tras el desglose): inputs draws/intereses/servicios/muebles del draw → valor a COBRAR vs **monto real disponible** + brecha en rojo (caso Capitol: cobraron $85k con $63,750 → déficit $36k). QA 13/13 en prod + parser funcional.

---

## 🎯 Estado (10 Jul 2026 — 🏭 IA v2: FÁBRICA DE HERRAMIENTAS con Claude en vivo) · EN VIVO

- 🏭 **`/ia` es una fábrica, no un buzón**: chat → edge function **`ia-builder`** (Claude `claude-opus-4-8` vía `_shared/anthropic.ts`, tools forzadas `preguntar/publicar_libre/derivar_ok`) que ENTREVISTA al empleado (tarea/frecuencia/inputs/resultado/ejemplo, máx ~8 repreguntas) y clasifica en **2 carriles**: **LIBRE** (self-contained: calculadora/generador/checklist, cero datos reales/red/secretos) → genera HTML autocontenido y lo **publica al instante** en la Galería; **CON OK** (datos reales/plata/terceros) → NUNCA ejecuta: guarda el spec+prompt completo en `ia_specs` estado `pendiente` (lo construye un humano/Claude Code tras aprobar). E2E verificado en prod: conversor publicado en 30s · pedido WhatsApp+Airtable derivado a spec.
- 🗄 Migr `20260710100000`: `ia_sessions` (transcript jsonb, estado activa/publicada/spec/abandonada) + `ia_artifacts` += `carril/html/prompt_generador/solicitante/session_id` + `ia_specs` (prompt_completo, estado pendiente/aprobado/construido/descartado, update solo gestor) + **`ai_calls`** (telemetría de `_shared/anthropic.ts` — ⚠ descubierto en QA: NO existía → `checkRateLimit()` era no-op en TODAS las funciones IA; ahora el rate limit de ia-builder [15 msg/10min/usuario] opera de verdad). `ia_requests` (v1) queda en DB, fuera de la UI.
- 🔐 **Seguridad en capas**: (1) system prompt prohíbe auto-construir lo que toque datos/secretos/acciones; (2) **validador server-side** del HTML libre (blacklist fetch/XHR/WebSocket/supabase/localStorage/cookies/script-src/iframe/postMessage… → degrada automático a spec, jamás publica); (3) render en **`<iframe sandbox="allow-scripts">` SIN allow-same-origin** (origen opaco: sin storage/sesión/DOM padre); (4) `requireAuth` JWT + rate limit; (5) artifacts/specs los inserta SOLO la edge function (service role) — el usuario no escribe directo.
- 🖥 Tabs: **🏭 Crear** (chat, 🎤 voz, preview del artefacto al publicar) · **🖼 Galería** (buscador+filtro área, modal sandbox; legacy `ruta` sigue) · **📥 Pendientes de OK** (gestores: prompt copiable 📋 p/ Claude Code, estados+nota). Deploy de la función por **MCP Supabase** (CLI local roto); QA E2E: scratchpad `qa-ia-builder.mjs` (login QA + 2 carriles).
- ⚠️ **NAMESPACE**: el módulo usa `OSIA`/`osia*` — el prefijo `IA`/`ia*` ya lo ocupa `os/inv-admin.js`. Registrado en `OS_EMPRESAS['ia']`, card fija en el panel Global, `index.html` + `BUNDLE_FILES`. `/ia/<tab>` deep-linkea (rutas v1 pedir/bandeja redirigen).
---

## 🎯 Estado (9 Jul 2026 — 💎 Inversionistas ESCALADO a todas las casas + Ledger) · EN VIVO

- 🏘 **AUTO-POBLADO a TODAS las casas** (migr `20260709110000`, idempotente — Dove/manual NO se pisa): **23 casas · 23 holdings · 17 inversionistas · $955,846** desde `ff_deals` (capital_inversionista, ownership_pct como reparto, N:N por investor_rec_ids) + ~40 `inv_model_params`/casa mapeados de ff_deals/ff_hml_loans/ff_draws/ff_hml_payments con fuente declarada (refi_mes desde la 1ª cuota ref30; hm_inicial = monto_hml − draws; 75% LTV modelo). **Base oficial post-refi con utilidad REAL** ((renta−gastos)×12 + año0 = net_total) en las 17 casas con datos; el resto queda 'supuesto/en calibración' (5 casas ownership 0/sin capital quedan FUERA, sin romper). `inv_projection` con 92 proyecciones (23×4) — script `inv-proj.cjs` (motor en node + service key). Dove intacta (46.70%/$186,668).
- 💰 **LEDGER "movimiento del dinero"** — RPC `inv_ledger(pid)` SECURITY DEFINER (guard `inv_my_props()` o fix-flip; una definición para portal y admin): línea de tiempo unificada por property_id → compra+cierre+draws [FF] · desembolso/pagos/fees HML + cuotas banco + cash-out [ff_hml_*] · **renta cobrada + gastos por ítem [Rentas, via `pm_properties.property_id` — ya backfilleado 21/21]** · distribuciones pagadas [OS] · manuales [inv_cashflow_real]. Cada fila: fecha/concepto/tipo/categoría/monto/FUENTE/comprobante 📎. **⚠ dedup clave: la "Hipoteca" de pm_expenses se EXCLUYE (la cuota real viene de ff_hml_payments)** — eran $257,751 duplicados en el portafolio. Dove validada: 94 movimientos reales (34 rentas $40,281 + gastos + 10 cuotas + 3 pagos HML + compra/draws/cashout).
- 🖥 Portal: tab **💰 Movimiento del dinero** (resumen ingresos/gastos/distribuido/utilidad × su %, filtros tipo/mes, saldo acumulado, chip de fuente). Admin: tab **💰 Ledger** (selector casa, subtotales por categoría, fuentes). RLS verificado: ledger cruzado entre inversionistas = 0 · sin acceso = 0. QA 13/13 en prod.

---

## 🎯 Estado (8 Jul 2026 · tarde — 💎 Motor CUADRA EXACTO con el Excel) · EN VIVO

- ✅ **TIR 46.70% / VPN $186,668 EXACTOS** (targets del Excel "Renta VF" para Dove) — bug corregido en `fclPostRefi` (el año 1 metía el ciclo completo además del año 0 = cash atrapado, doble conteo → TIR 8.4%; ahora años 1-31 = operación post-refi). **Perfil de proyección configurable**: `postrefi_perfil` = `'motor'` (crecimiento apalancado) o `'plano'` (como el Excel). Calibración cerrada seedeada con `fuente='excel(calibrado)'`: `util_anual_postrefi=1941.55` ($161.80/mes; real $155) + `anio0_postrefi=4157.47` (real 4,612.90) — migr `20260708120000`. Al llegar la hoja real del Excel, se pisan esos 2 params en el admin y listo.
- 📉 **Análisis de 3 FASES** en el motor (`indicadores.fases`): fase 0 déficit inicial (Dove: máx **−$33,479 en mes 5**) · fase 1 cubre el déficit (**año 3**) · fase 2 recuperación del capital del inversionista solo por utilidades (**año 27** — el resto vía patrimonio/venta, declarado honesto).
- 📦 **CAPA DE PRODUCTO FlipTrack COMPLETA (8-jul, OK del CEO, 38/38 checks en prod)** — migr `20260709100000`: `inv_deals` (proposal JSONB con **markup — SOLO fix-flip**, jamás legible por el inversionista; link público via RPC `inv_proposal_public` con WHITELIST sanitizada), `inv_expenses`, `inv_distributions` (tipo/estado/K-1), `inv_messages` (fan-out por casa o directo, `read_by`, el inversionista escribe solo como él), `inv_documents.audit` (RPC `inv_doc_log`), `inv_access.rol/property_filter`.
  - **Portal con TABS**: 🏠 Propiedades · 💸 Distribuciones (countdown, alerta 14 días, CSV, K-1) · 💬 Mensajes (nuevo/leído + escribir) · 📄 Documentos (audit) · 🤖 **Investor Assistant** (`mode:'investor'` en `brain-chat` — sin función Vercel nueva; snapshot RLS-filtrado con motor+3 fases; responde en el idioma del usuario, honesto sobre riesgos). `window.IP` expuesto.
  - **Admin 8 tabs** (`os/inv-admin.js`): 📊 Global (capital por inversionista/propiedad, TIR prom/VPN agregado desde `inv_projection`, participaciones cerradas, alertas) · 🏗 Pipeline (3 etapas; **calculadora de propuesta** = adquisición+remodelación+holding+intereses+costos venta+**MARKUP** → precio al inversionista, escenarios ARV±10%; cerrar deal con bucket rentando/refi/vendida + **ventana reversión 48h**; CoC/Recuperado por casa) · accesos/holdings/modelo/escenarios/distribuciones/mensajes.
  - **`/propuesta?link=<uuid>`** standalone anon (`propuesta.html` en STATIC_COPY): propuesta sanitizada — verificado que markup/costos internos NUNCA salen (ni por query directa del inversionista). ⚠ CoC de la card del pipeline usa `utilidadAnualEstable` del perfil 'motor' (negativa hasta calibrar los gastos mensuales con la hoja del Excel — solo estética; TIR/VPN oficiales ya calibradas). Deal demo de Dove con números placeholder (275k/17k) — editar en la calculadora.

---

## 🎯 Estado (8 Jul 2026 — 💎 Portal de Inversionistas Fase 1) · EN VIVO

- 💎 **Sistema de Inversionistas F1** — **motor puro `os/inv-engine.js`** (réplica del Excel "Modelo financiero - Renta VF": flujo mensual 0-12 con rampa/piso servicios/UODI/FCL Proyecto-Financiación-Negocio, amortización 360m, anual 1-31 con inflación 3% + valorización 5.3%, %deuda/riqueza oculta/patrimonio, PROFIT/ROI/CAP/DSCR/VPN/TIR/equilibrio ×%inversionista/%empresa; corre en browser Y node). **Base OFICIAL de TIR/VPN = POST-REFI: año 0 = cash atrapado REAL (`ff_draws.net_total`)** — descubrimiento clave al validar contra el Excel (VPN Δ0.7% con perfil real; TIR exacta pendiente de calibrar params con la hoja del Excel → quedan `fuente='supuesto'` en `inv_model_params`, editables en el admin).
- 🗄 Tablas `inv_access/inv_holdings/inv_model_params/inv_cashflow_real/inv_projection/inv_documents` (migr `20260708100000`) + helpers `inv_my_ids()/inv_my_props()` + RPC `inv_claim_access()` (el inversionista reclama su acceso por email del JWT al loguearse). **RLS estricto verificado: el inversionista lee SOLO sus casas vía `inv_*` — jamás toca `ff_*`; usuario sin acceso = 0 filas en todo.** Escrituras solo `has_area('fix-flip')`. Reparto por casa en `inv_holdings.reparto_pct` (default 0.50).
- 🌐 **Portal `/inversionista`** (standalone renovado, magic link `shouldCreateUser` implícito del OTP): dashboard (inversión, su %, riqueza hoy = capital+equity amortizado+valorización ×%, funding mix, TIR/VPN 31 años, CAP, DSCR, equilibrio), tesis de patrimonio a 5/10/31, **las 5 gráficas** del modelo (Chart.js), flujo mensual+acumulado, transparencia ítem por ítem con **chip de fuente** (real/modelo/supuesto), documentos. Assets: `os/inv-engine.js` + `os/inv-portal.js` van en **STATIC_COPY** (página standalone) además del bundle.
- 🛠 **Admin OS `/inversionistas`** (`os/inv-admin.js`, guard área fix-flip): accesos (crear + ✉️ invitar por magic link + revocar), holdings (casa+inversión+%), editor de parámetros con fuente, carga de movimientos reales (hoja "Datos reales" → escenario Realizado) y preview del motor. Card "💎 Portal Inversionistas" en la empresa F&F.
- 🌱 Seed **Dove Springs** (property_id `419fc8c3…`): 36 params (reales de ff_deals/ff_hml_loans/ff_draws + supuestos declarados) + holding Valeria Bedoya $25,400 al 50% (nota: confirmar reparto vs Operating Agreement). Usuario QA: `qa-investor-test@rentalprofitss.com` vinculado al investor de Valeria para testear el portal real sin tocarla. **Fase 2 HECHA (8-jul)**: motor con `realesPorMes` (SUMIF de "Datos reales" por mes reemplaza la línea calculada) + `escenario()`/`movsPorMes()` → **4 escenarios** (Estimado=underwriting con `est_*`; Proyectado=params; Realizado=+movimientos reales; Simulado=overrides con refi 75%×ARV) + tab **🎛 Escenarios & simulador** en el admin (comparativa lado a lado + sensibilidad con Δ vs proyectado + 💾 cache de los 4 en `inv_projection`) + el portal corre **Realizado automático** si hay movimientos (badge). QA 17/17 en prod. **Fase 3 pendiente**: admin consolidado (todas las casas, comparativo, desembolso banco).

---

## 🎯 Estado (7 Jul 2026 — 🐕 Sabueso Contable en /contable) · EN VIVO

- 🐕 **Sabueso Contable** (`os/os-ct-sabueso.js`, sección de `/contable`): microscopio de conciliación con norte **"$0 = todo cuadra"** (arrancó en ~$6.75M sin conciliar / 43 descuadres). Catálogo **C1–C8**: C1 conciliación OS↔QBO (inversionistas en **3 conceptos**: comprometido $947k [OS aportado] / pagado $194k [OS] / contabilizado $728k [QBO] — comprometido−QBO va como *diferencia de definición*, no error; préstamos espejando el chart of accounts: HML vivo [OS, deals sin refi/venta] vs `Loan Payable–HML`, y `HML-Refin` $1.22M **sin espejo OS** → falta campo "Monto Refi" en Airtable FF; Rental Property por casa; préstamo activo en casa vendida) · C2 salud RAG (rojo margen bruto<0; FF realizado SEPARADO de inyectado) · C3 libros al día (EBITDA op vs Net QBO >10%) · C4 cobranza aging por casa (billing_ym) · C5 caja (D/E [QBO] con umbral `de_max`, cash por empresa; runway pendiente P&L mensual — no se inventa burn) · C7 anomalías por casa (draws >2× estimado = posible cash-out disfrazado, obras con pérdida, casas en rojo) · C8 higiene (Rentas sin QBO, Educación sin P&L → "sin datos" NUNCA $0, pagos revisar, gastos sin Año).
- ⚙️ **Infra**: `ct_config` (umbrales, cero hardcode) + `ct_findings` (persistente con soft-delete; **auto-resuelve** lo que deja de disparar → el cierre semanal trackea abierto→resuelto) — migr `20260707120000`. Acciones = `agent_proposals` `estado='propuesta'` con `agent_id` del **agente registrado en `agent_registry`** ("Sabueso Contable", P1/asistido, uuid `7eb3ab03…`) — **siempre aprueba un humano**. Policies de proposals/registry ampliadas a `operacion|contable`.
- 🧭 **Honestidad**: cada cifra declara fuente [OS/QBO/Airtable]; header muestra "libros QBO al {fetched_at}" (osLoad ahora trae `fetched_at` de `qb_report_cache`); botón "📋 Cierre p/ contadora" copia la lista ordenada por $ + resueltos de la semana.

---

## 🎯 Estado (7 Jul 2026 — Rentas: MES DE RENTA único + unidades/check-in + espejo limpio) · EN VIVO

- 💵 **REGLA DURA — "mes" de dinero en Rentas = MES DE RENTA (tag Mes/Año de Airtable), NUNCA la fecha de cobro.** Implementado como columna GENERADA **`billing_ym`** ('YYYY-MM') en `pm_payments` y `pm_expenses` (migrs `20260707100000`+`110000`; si falta el tag Año usa el año de la fecha). TODAS las superficies agrupan por `billing_ym`: PM Finanzas (`pmFinAgg`/`pmBillYm`), tab Pagos (columna "Mes renta"), cashflow, Rentas CC (`ccCompute`, aging de cobranza) y OS (`osBillYm`, cobranza). `paid_at` queda SOLO para "cobrado en el mes" (flujo de caja) — métrica separada y rotulada. Junio-2026 verificado contra Airtable directo: 52 pagos / $48,248.55 exacto.
- 🚪 **Propiedades despliega las unidades ACTIVAS del espejo** (tipo, estado, 🔑 código de acceso, renta) con **📄 Check-in POR unidad** (`pmGenerateWelcomeGuide(propId, unitId)` — la guía usa el código de ESA unidad). Bramble = 5 unidades, no 16: las inactivas legacy (external_id viejo `unit-{casa}-{slug}`) NUNCA se muestran; el set activo = 🚪 Unidades del Modelo Nuevo (keyed `unit-{recId}`).
- 🐛 **Fixes reales encontrados**: (1) pm-main cargaba `pm_payments` SIN filtro `active` con `limit(1000)` sobre 1,228 filas → los pagos sin fecha (status `revisar`) quedaban cortados; ahora `eq('active',true)` — los 902 pagos y 258 gastos inactivos legacy no entran en NINGÚN cálculo. (2) `pmRenderUnitRow` usaba un global `active` inexistente (ReferenceError latente).
- 💸 **Gastos**: el sync ahora trae **"Gastos x Empresa"** (`tbl9dJXwI9Vn3kjKy`) → `pm_expenses.scope='empresa'` (`gastoemp-{recId}`), y mapea el **Año** de Gastos X Casa. Finanzas agrupa por `billing_ym` y muestra "🏢 Gastos de empresa" como categoría propia. ⚠️ Data quality conocida: 7 gastos con Mes sin Año y 6 gastos de empresa (mayo) sin Año — caen al año de la fecha; ideal taguear Año en Airtable.
- 💡 **Utilities**: NO hay tabla fuente en el Modelo Nuevo — los 72 placeholders del seed se muestran colapsados como "pendiente de configurar" (no filas fantasma). "Servicios automáticos" se llena marcando 🔑 Accesos con Categoría=«servicio».
- 🔁 Sync 100% idempotente por `external_id` = recId (`casa-/tenant-/unit-/booking-/pay-/exp-/gastoemp-/cred-`), paridad Airtable=espejo con assert por tabla.

---

## 🎯 Estado (6 Jul 2026 — Panel de Admin + RLS por áreas + Login fácil) · EN VIVO

- 🛡 **Panel de Admin en el OS (`/admin`, solo role=admin)** — módulo `os/os-admin.js`: listar usuarios (con último acceso vía RPC `admin_users_overview()` SECURITY DEFINER), invitar (edge function `invite-user`, ahora roles `admin/pm/editor/viewer` + reactiva al re-invitar), editar rol/áreas/nivel (👁 ve / ✏️ edita → `profiles.area_levels`, hoy informativo), **desactivar = soft-delete** (`profiles.active/archived_at`, reversible — NUNCA hard-delete; el panel viejo con 🗑 redirige acá). Usuario inactivo no puede loguearse. Migración `20260706100000`.
- 🔐 **RLS REAL por `allowed_areas` (Etapas 1+2 aplicadas y verificadas)** — helper **`has_area(slug)`** (SECURITY DEFINER; admin activo siempre true). Slugs canónicos: `fix-flip, remodelacion, rentas, operacion, contable, education` (+`pm`=Project Mgmt legado). Mapa: `ff_*`→fix-flip · `qb_*`→contable · `remodel_*/weekly_*/wp_*/airtable_record_names/house_link_overrides`→remodelacion · `pm_*` property-mgmt→rentas · `pm_okrs/companies/one_on_ones...`(project-mgmt)→pm · `clickup_*/agent_*`→operacion · `ops_*/clean_*`→operacion|rentas · `edu_*`→education · `properties`→las 3 de la casa. **Las 78 vistas están en `security_invoker=on`** (antes bypasseaban RLS: anon leía v_holding_pnl, nómina, 1.3k pagos de materiales, espejo ClickUp…). NO tocado: portal alumno (`edu_diagnostic_invites/edu_student_plans/edu_student_plan_tasks/edu_materials`, los usa `mi-plan.html` con anon), policies admin-only/service-only, rol `agentes_ia`, RPC `investor_portal`. Syncs/crons (service_role) bypassean y no cambian. Migraciones `20260706110000` + `20260706120000`; **rollback ejecutable en `supabase/rollbacks/`**.
- ⚠️ **REGLA NUEVA (RLS): toda vista nueva DEBE crearse con `security_invoker=on`** (`alter view X set (security_invoker = on)`) — una vista sin eso vuelve a saltear el RLS de sus tablas base (pasó con `v_remodel_avance_vivo`/`v_remodel_progress`, ya corregidas). Y toda tabla espejo nueva lleva policy `has_area('<área>')`, NUNCA `to anon` ni `authenticated using(true)`.
- ⚠️ **Front bajo RLS:** lecturas fuera de tu área devuelven `[]` silencioso (no error). El OS gatea por `osCanArea()` (os.js) con `OS_EMPRESAS[].key`. Los endpoints de Vercel que leen data sensible deben mandar el **JWT del usuario** (ej. `brain-chat` → `recallMemories(q,k,bearer)`; el front manda `Authorization` en el chat del Cerebro).
- 🔑 **Login fácil:** ✉️ magic link (`signInWithOtp`, `shouldCreateUser:false`), 👁 mostrar contraseña, Enter para entrar, errores en español (`authErrorES`), "¿Olvidaste tu contraseña?" → email de recovery → **formulario "Creá tu nueva contraseña"** (`showNewPasswordForm`, reemplazó al `prompt()`; el hash con `type=magiclink` NO dispara el pedido de contraseña). Botón "Registrarse" eliminado (las cuentas entran por invitación del panel). Site URL/allowlist de Auth OK (prod). ⚠️ SMTP builtin = **2 emails de auth/hora** → si se escala, configurar SMTP custom (Resend).
- 🧪 **Usuarios QA en prod** (marcados 🧪, soft-deleteables): `qa-admin-test@` / `qa-viewer-test@` (viewer, rentas) / `qa-invitee-test@` — los usan las suites headless (`qa-admin-panel.mjs` / `qa-login.mjs`, guardadas en scratchpad de la sesión; correr desde la raíz del repo con `QA_BASE=` local o prod).
- 👥 **Coordinación multi-sesión:** hay sesiones Claude paralelas pusheando a main — SIEMPRE `git fetch origin main` + merge antes de pushear, y re-chequear `security_invoker` de vistas tras migraciones ajenas.

---

## 🎯 Estado (5 Jul 2026 — Blueprints FF §1 + Remodelación §2 COMPLETOS) · EN VIVO

- 🏚 **FIX & FLIP — Blueprint M1–M7 completo y verificado** (`arquitectura/BLUEPRINT_FF.md`, evidencia en `LOOP/BITACORA.md`): **M1** pipeline canónico 6 etapas (29/29) + 3 semáforos config (`ff_uw_config`; destapó 2 HML VENCIDOS 143/186d) · **M2** motor de underwriting unificado `ffUwModel` (cascada exacta, escenarios W/B/B, sensibilidad, 16+ supuestos en config) · **M3** selector de modelo (Fix&Flip/BRRRR/Renta/Wholesale, golden tests 4/4, split inversionista; calibración $/sqft SOLO Austin n=11 $36–89 prom $60, excluidas transparentes vía `calib_zonas`/`calib_psf_min`) · **M4** portal inversionista `/inversionista` (magic link + RPC `investor_portal()` SECURITY DEFINER, aislamiento verificado 3 casos; capital espejado: `ff_deals` investor links + `ff_investors` capital) · **M5** deck PPTX (`ffDeckGenerate`, 23ms, 0 hardcode) · **M6** analítica zona/modelo/inversionista + proyección 5 años hold vs sell vs refi (golden exacto) · **M7** informes (Excel/copiar/PDF). Sync FF con paridad (29/24/21/20) + `ff_hml_loans` + `ff_overhead` + `ff_hml_payments` + cron diario.
- 🔨 **REMODELACIÓN — Blueprint §2 C1–C4 completo** (`arquitectura/BLUEPRINT_ECOSISTEMA.md`): **C1** LOOP de aprendizaje ACTIVO — `v_remodel_calib_costos` (tendencia hist +32.4% vs últimas-5 +52.2% "empeorando") + `v_remodel_calib_etapas` (factor_dias aplicado en `rmAutoGenPlanner`/`rmSyncToPlanner`; interno ×1.141 n=198) · **C2** control de presupuesto por casa (`remodel_material_payments` 1,308 pagos $615k espejados + `v_remodel_presupuesto_casa` mat+MO(horas×rate) vs presup; umbral `alerta_sobrecosto_pct` en `remodel_forecast_params`, rcDQ unificado) · **C3** bitácora auto por casa (`wpOpenBitacora`, hechas/moves/avance, imprimible) · **C4** ledger de nómina (`v_remodel_nomina_ledger`: grano = trabajador×casa×día; `pago`=pagado registrado ese día; deuda NETA por trabajador $12,904, bruta por fila $14,574; ⚠ cobertura parcial: 2,504/3,364 filas sin rate por nombres que no matchean Personal en Campo — P1 corregir nombres en Airtable).
- 🏛 **Ecosistema/holding**: paridad con assert en TODAS las empresas espejadas (Remodel 30=30, FF 29=29, Rentas 6/6 tablas incl. pagos 326=326), `property_id` backbone (Remodel+FF+weekly_activities; falta pm_properties), `v_holding_pnl` en /contable (Remodel EBITDA $130,275 · FF realizado −$187k/inyectado −$232k · Rentas −$140k · consolidado −$325k), hardcodes $146k/$46k eliminados (overhead FF real $127,875 + intereses HML $256,086). Auditorías Fase 1 completas (6/6) en `auditoria/`.
- ✅ **Smoke global 5-jul: 56 superficies, 0 crashes, 0 pageerrors** (OS, FF CC+deck, RC+Reportes, PM, Estimador 18 tabs, Planner+bitácora, portal 200).
- 📋 **BACKLOG vivo en `LOOP/BACKLOG.md`** — próximos: §3 Rentas (blueprint); P0 Educación (espejo congelado 59 vs 45, sin cron — molde listo); decisión ClickUp (muerto 12-jun); QB conector (esperando input CEO); P1: property_id en pm_properties, scope write del PAT Airtable (write-back avance 403), Redirect URL del portal en Supabase Auth, nombres de trabajadores↔Personal en Campo (cobertura ledger).

---

## 🎯 Estado (3 Jul 2026 — Remodelación pro completa + QA pre-lanzamiento) · EN VIVO

- 🏗️ **Remodelación end-to-end** (Estimador Pro `remodel-pro.js` + `rm/*` · Planner `weekly-planner.js` · CC `remodel-command-center.js` · Ficha en `os/os.js`). Todo SOLO-LECTURA de datos de negocio; escribe solo lo operativo (actividades, hitos, etc.). Bases Airtable Remodelación `appwFRqnkyyRljOld`.
- 📅 **Planner Semanal**: recursos FIJOS por obra, actividad multi-día (`group_id`), pago Crew×Hora, **baseline/desviación por triggers** (`weekly_activities.baseline_date` + `weekly_activity_moves` + vista `remodel_stage_deviation`, migr `20260703100000`), reporte PDF (día/semana/mes, `wpOpenReport`), **ruta crítica** (`is_critical`, chip 🎯, diálogo de atrasadas `wpCheckCriticalLate`), **cascada** de dependientes al mover una crítica (`wpCascadeReschedule` por `depends_on` del catálogo), y **SIN DOMINGOS** (grilla lun–sáb, `wpDaysDiff` no cuenta domingos). Genera cronograma en **días laborables** (`rmAddWorkDays`).
- 🧮 **Estimador**: al **guardar** auto-genera el cronograma en el Planner (`rmAutoGenPlanner`, baseline, 1ª vez, no pisa ediciones); pronósticos **editar/soft-delete/dedup por dirección**; **seguimiento por propiedad** + import Excel de avance; historial **comparar 3**; tab **🏗 Obra Pro** (hitos plan-vs-real + draws, inspecciones/hold points, punch list, calendario laboral) → tablas `remodel_milestones/inspections/punch_list/calendar` (migr `20260703270000`, RLS + soft-delete).
- 📊 **CC Remodelación**: KPIs de gestión + **Estimado vs Real** + pipeline por `Procesos` (5 etapas) + **Líderes** (productividad $/sqft, hrs/sqft desde `remodel_worker_pay_summary`) + **Gestión EVM** (CPI/SPI por casa) + calibración (`remodel_obra_calibration`) + export CSV. Ficha de Obra en el OS (`osCasa`).
- 🔗 **Backbone property_id + avance único (5-jul, deployado)** — la CASA (`property_id` = `properties.id`, registro canónico que cruza FF/Rentas/ops/remodel) conecta Planner ↔ Estimador ↔ CC. **P0**: `norm_casa`/`norm_casa_name` (saca país/estado/ciudad/zip/sufijos; nf=número+calle, nn=solo-calle) backfillean property_id en `remodel_at_properties`(30)/`remodel_projects`(30)/`weekly_activities`; 30 casas de Remodelación **minteadas en `properties`** (status `remodeling`); 909 Neans soft-deleted (no en Airtable); vista `v_remodel_casas_unmatched` (0); RPC **`remodel_backfill_property_ids()`** llamado por el sync (self-healing de obras nuevas). **P1**: vista `v_remodel_progress` = `avance_real` por property_id (v1 done/total; cols `criticas/criticas_done` para v2 ponderado); trigger **`trg_wa_progress`** (recompute-on-write) → `remodel_at_properties.avance_real` + `remodel_projects.progress_real`; CC/Ficha overridean `avance_pct=avance_real`, Estimador muestra badge "Avance real (Planner)". **Verificado: 1133 Denfield = 96% en las 3 superficies** (antes 96/45/fase). **P1-5 write-back**: campo Airtable "Avance Real (Planner)" (`fld5nTFwW161Xu3sk`) + write-back en el sync — ⚠️ **el `AIRTABLE_TOKEN` es read-only en `appwFRqnkyyRljOld` (403)**; para que el sync lo mantenga hay que darle scope `data.records:write` en esa base (hoy poblado a mano para las 3 obras). El singleSelect grueso NO se retiró.
- 📑 **Reportes CEO (4-jul, deployado)** — módulo separado `remodel-reportes.js` (bundle + `index.html`, modular/vendible) montado como sección del CC (`RC_NAV` 'reportes', dispatch `window.rcSecReportes`). **5 reportes**: R1 Ejecutivo CEO, R2 P&L/EBITDA, R3 Líder/Obra, R4 KPIs+OKRs, R5 Costos $/sqft. Filtros (período mes/trim/YTD/histórico/custom + líder/estado/ciudad). KPIs + **Chart.js** + tablas + semáforos + mediana/outliers. **Regla de líder compartido** parametrizable (`RP.liderMode` split-50/primero/ambos, default split). **Adaptador** `rcObraDataset()` (una definición por métrica). **EBITDA** = ganancia bruta − overhead OPEX (capex vehículos/activos excluido por `CAPEX_RE` sobre categoría). **OKRs desde Airtable**: tabla `OKRs / Metas` (`tblGUPnE4E5IrUGEt`) → `remodel_okrs` (sync); fallback `OKR_DEFAULTS` + aviso "metas no configuradas". **Export**: PDF (print `@media`), Excel `.xlsx` (hoja por tabla, XLSX del CDN), Copiar resumen (KPIs + 3 decisiones). `window.RP`/`window.rp*` expuestos (los onclick los necesitan). ⚠️ index.html carga `.js` sueltos en dev → un módulo nuevo DEBE agregarse a `index.html` **y** a `BUNDLE_FILES` (build.mjs).
- 🔎 **Auditoría CC vs Airtable (3-jul, deployada)**: **paridad de conteo** — `remodel_at_properties.active`/`archived_at` + el sync archiva fantasmas (no-vistos por `last_synced_at`) y escribe `remodel_sync_parity` (Airtable vs espejo); el CC filtra `active=true` (30 obras, no 31) y muestra badge "sync desincronizado" + nota de paridad OK/ALERTA. **Capa financiera única (`rcFin`)**: ingreso=`monto_real` (Monto Real Remodelación/draws) · costo_real=(gasto_mat+gasto_trab)×1.05 (Valor Remodelación) · presupuesto=`presupuesto_interno`. "Desviación de costo"=(costo_real−presupuesto)/presupuesto (+7%, no el +29% falso que daba usar el ingreso); tarjeta **Margen**=ingreso−costo_real; ganancia rotulada BRUTO. **Outliers**: desviación de días con mediana + excluye |>180d| ("a revisar"). **Overhead/EBITDA**: `remodel_overhead` (sync de Gastos Empresariales `tblk1vS2`, Nómina Admin `tblv77`, Plataformas `tblgd4`) → Utilidad NETA=BRUTA−overhead. **$/sqft por obra** (costo_real/sqft, split mat/MO) + prom. **Badge completitud** N/5 campos. ⚠️ El entorno tiene un **linter async** que corrompe strings con backticks anidados / `'$'` literales en `.js` — usar templates *standalone* con forma `$${}` y verificar con `node --check` tras cada edición.
- ✅ **QA pre-lanzamiento (3 agentes + smoke test headless)**: **52 superficies, 0 pageerrors, 0 crashes** (OS deep-links, FF CC, RC, PM, Estimador 17 tabs, Planner). Todos los `.js` pasan `node --check`. Migraciones **aditivas** (sin DROP/TRUNCATE, RLS). Data intacta (354 activ, 31 proyectos, 3364 hrs). Bugs corregidos: `os.js` div sin cerrar en Ficha de Obra + import Excel del Planner no escribía `is_critical` + 2 landmines. Bundle en vivo `96f5d44740cf`.
- ⚠️ **Deuda técnica menor conocida** (no bloquea venta): Obra Pro usa `prompt()` (funcional; se puede hacer inline); cascada solo en reprogramar (no drag&drop); días laborables = fin de semana en la generación (feriados de `remodel_calendar` cargables pero aún no aplicados al cálculo).

---

## 📈 REGLA DURA — Gráficas Chart.js (8-jul, tras el bug del FF CC)

**Todo `<canvas>` de Chart.js va SIEMPRE envuelto en `<div style="position:relative;height:Npx;width:100%;overflow:hidden">`** — la altura FIJA + **`overflow:hidden` (el candado real: sin él, el resize del HOVER sigue empujando el contenedor)** + `responsive:true, maintainAspectRatio:false, resizeDelay:200` + `destroy()` previo (una instancia por canvas). **NUNCA** `height` (attr/CSS) en el canvas, y las filas de gráficas con **`align-items:start`** (una gráfica no debe estirar a la vecina — así colapsaba la dona). Barras horizontales: altura = n_barras×28+90. Alturas vigentes: FF CC 320 / n×28+90 / 320 / 300 · Rentas CC 160-320 · portal 300×4+260 · remodel `.rp-canvas` 230. Fix commits `3de788a`+`6829b90`; QA con HOVER INTENSIVO en prod (3 pasadas × 13 puntos: alturas idénticas, tooltip normal, 0 pageerrors).

---

## 🏛️ PILARES FUNDAMENTALES (aplican SIEMPRE, en cada tarea)

Estos 5 pilares son la base permanente del producto. Respetalos en todo cambio de acá en adelante:

1. **DATOS DESDE AIRTABLE, NUNCA HARDCODEADOS.** Ningún dato fijo/mockeado en la UI ni en la lógica. Todos los números vienen de la fuente real (Airtable / QuickBooks / Supabase espejo). Si no hay dato → **estado vacío claro** (skeleton / "sin datos"), nunca inventar ni hardcodear un número de ejemplo.
2. **USABLE POR CUALQUIERA (agnóstico a la fuente).** Cada sistema debe poder funcionar con: (a) nuestra base Airtable, (b) la base Airtable de un tercero, o (c) datos manuales — **sin cambiar su lógica**. Implementar una **CAPA DE DATOS (adaptador)** por sistema, desacoplada de la UI/lógica, con la **misma interfaz** para los 3 orígenes (mismo shape de entrada/salida). La UI consume el adaptador, no la fuente directa.
3. **MODULAR / PORTABLE / VENDIBLE.** Cada sistema debe poder extraerse o transferirse **individualmente** a otra plataforma: autocontenido (UI + lógica + adaptador), dependencias explícitas, interfaces claras. Evitar acoplamientos globales ocultos.
4. **CADA PROCESO ALIMENTA EL REGISTRO DE AGENTES IA.** Por cada proceso repetitivo, documentar qué agente/equipo de IA podría delegarlo (qué input consume, qué output produce, qué decisión toma un humano). Mantener ese registro vivo.
5. **ECOSISTEMA CON PUENTES ABIERTOS.** Fix & Flip ↔ Rentas ↔ Remodelación conectados; APIs/contratos abiertos entre módulos; la **CASA (`property_id`) es la clave común** que cruza empresas. Sin silos: una casa fluye Fix&Flip → Remodelación → Rentas → refi/venta con la misma identidad.

---

## 🎯 Estado (1 Jul 2026 — Flipping Rentals OS: shell del holding + Fix & Flip completo) · EN VIVO

- 🌐 **Flipping Rentals OS** (`os/os.js`): shell del ecosistema con **routing real (History API)** montado tras el login sobre el panel clásico (accesible con "⚙︎ Admin"). Niveles: **Global** (`/`, KPIs consolidados + 4 empresas + áreas Operación/Contable + Cerebro del Holding), **Empresa** (`/fix-and-flip`, `/rentas`, `/remodelacion`, `/educacion`), **áreas** `/operacion` (cronograma + cobranza = contrato − plata real) y `/contable` (conciliación QB + cap table), **apps** (`/fix-and-flip/underwriting` etc. abren la sección del Command Center). 404 con diseño. Título "Flipping Rentals OS" + OG.
- ⚠️ **ROUTING SPA (gotcha resuelto):** el rewrite de `vercel.json` DEBE apuntar a **`/`**, NO a `/index.html` — con `cleanUrls:true`, `/index.html` da 308→`/` y el rewrite falla (404). Config vigente: `rewrites:[{source:"/((?!api/|assets/|viral|diag|mi-plan|.*\\.).*)",destination:"/"}]` (excluye api, assets, las páginas standalone y archivos con extensión). Rewrites por-ruta también fallaban por lo mismo.
- 🏗️ **Fix & Flip completo** (`pm/ff-command-center.js`, área fix-flip, mirror `ff_*` de Airtable `applMXFyPq1hXj7iN`, SOLO LECTURA): Command Center (Kanban + insights), **Underwriting** (MAO, estimador calibrado \$7–100/sqft con validador de rango, HML, cash-out refi, ROI + recuperación con semáforo, ingeniería inversa), **Inversionistas** (CRM depurado 18 + 4 modelos + cap table + buy-out capital+15% + propuestas + alerta contrato sin firmar), **Finanzas/QuickBooks** (P&L cockpit, gastos por tipo, rentabilidad por casa, conciliación). Tablas: `ff_deals` (28), `ff_draws` (24), `ff_investors` (19, migración `20260701100000`).
- 🎨 **Tema claro/oscuro** en TODO el ecosistema (`pm/pos-theme.js`, `[data-theme="light"]`, persistido en localStorage; toggle ◐). Aplicado a OS, Rentas CC y FF CC.
- 🧠 **Cerebro** reusado (chat `/api/brain-chat` + memoria RAG `pm_brain_memory`); sembrado con reglas de Rentas (`seed`) y Fix & Flip (`ff-seed`): all-in ≤75% ARV, déficit OK si flujo+ y acum <\$20k, inversionista 15–18%, split 50/50, buy-out capital+15%, refi ≤ pago actual, Harmony solo intereses, CPI+3–5%, depósitos no son renta, **registrar la plata real no el contrato**.
- 💾 **Deploy por CLI** (el auto-deploy de GitHub estaba caído por el límite de funciones, ya resuelto): `VERCEL_TOKEN=<token> npx vercel@latest deploy --prod --yes`. Node en Vercel = 24.x (dashboard).
- 🔗 **Sistemas clásicos conectados al OS por el router (sin tocar su lógica):** las apps clásicas (Property Manager `pm-rental-mgmt`, Cronograma, Estimador Pro, Dashboard Obras, Educación) abren el sistema REAL vía `openSystem()` de app.js. Gotcha: abren como **modal `#modal` (z-50)** → quedaban tapados por `#os-root` (z-900). Puente en `os.js`: `osOpenApp`/`osOpenSystem` (busca el sistema por TIPO en TODAS las áreas de `state.systems` — ojo: `state` es binding léxico de app.js, NO `window.state`), al abrir oculta `#os-root` + inyecta barra **"← Volver"** (`osEnterClassic`), y al cerrar (×/ESC/backdrop/Volver → wrap de `closeModal`) restaura el OS y navega por History API (`osExitClassic`). Se sacó el botón "⚙︎ Admin" (dead-end a la UI vieja).
- 🎨 **Re-skin base de los clásicos = capa CSS** (`osInjectReskin`/`osApplyReskin`, `data-osreskin=<tema>` en `<html>`, scopeada a `#modal`/`#app`): mapea Tailwind viejo → tokens nuevos SIN tocar markup. El **oscuro** es el que más aporta (la UI vieja es light-only). Pendiente: afinar re-skin sistema por sistema (pm-main tiene CSS propio).

---

## 🎯 Estado (1 Jul 2026 — Property OS · Command Center + Cerebro IA) · rama `feat/cerebro-full` (mergeada a main)

- 🛰️ **Command Center** (`pm/command-center.js`, ~90KB): app unificada de Rentas, dark (mockup `docs/Property_OS_Mockup_RentalProfits.html`: #06080d, vidrio, gradiente teal→azul, orbe vivo). Sidebar 8 secciones (Command/Propiedades/Reservas/Operación/Inquilinos/Finanzas/Analítica/Cerebro IA). Se abre desde `systems` con `type='command-center'` (dispatch en `app.js`). **SOLO LECTURA** de datos de Airtable (no escribe NINGUNA tabla espejo); sólo escribe memoria/chat del Cerebro.
- 🧠 **Cerebro IA (3 fases):** (1) **Insights por reglas** (sin costo IA) rankeados por $; incluye **"Ocupada sin ingresos"** (cobranza/registro). (2) **Chat** `/api/brain-chat` → Claude `claude-opus-4-8` (env `ANTHROPIC_API_KEY`, ya en Vercel — la usa el módulo viral). (3) **Memoria RAG**: `pm_brain_memory`+`pm_brain_chat`+RPC `match_brain_memory` (pgvector, migración `20260701000000`), embeddings **Voyage `voyage-3-lite` 512d** vía `api/_brain.mjs` (Vercel env `VOYAGE_API_KEY` → fallback edge function `generate-embedding` que sí tiene la key en Supabase Secrets → degradar a "recientes"). `/api/brain-memory` = CRUD. Seed de 7 memorias (`20260701000100`). **Resumen del día** generado por el Cerebro arriba del Command Center.
- 📊 **Regla de unidades (34) en TODA la app** (Command Center, pm-main dashboard/ficha, Analítica, reportes). Ocupación oficial = ocupadas/34 (data-driven, cambia con el sync; a jul 2026 = **30/34 ≈ 88%**, verificado contra la fuente en la auditoría #15). Ningún tab muestra 49 (físico) como "unidades". Panel **Calidad de datos** accionable (ocupadas sin ingreso, unidades sin renta objetivo, reservas sin fecha, gastos sin monto → "Corregir en Airtable → tabla X").
- 🔌 **Interconexión:** "Operación de hoy" = `pm_tasks` real (cronograma); cadena reserva→turnover/recepción→gasto→KPI (auto-tareas del sync). Reportes PDF + Guía de Bienvenida accesibles desde el CC (cablean `pmOpenReport`/`pmGenerateWelcomeGuide`).
- ✅ **DEPLOYADO Y EN VIVO (1 Jul):** todo el Cerebro está en producción. Chat con memoria RAG por similitud verificado (`memory_used`, `mode: similarity`); `/api/brain-chat?resource=memory` = 200.
- 🚫 **CONSTRAINT CRÍTICO — Vercel Hobby = máx 12 Serverless Functions.** Cada archivo en `api/` (y subcarpetas) que NO empiece con `_` cuenta como función; los `_`-prefijados (helpers) NO cuentan. Hoy hay **exactamente 12** (`brain-chat`, `claude`, `pm-report`, `pm-welcome-guide` + `cron/`: check-contracts/occupancy/payments/services/tasks, report-weekly, report-monthly, sync-airtable). **Agregar una función nueva rompe TODOS los builds** con "No more than 12 Serverless Functions" (fue la causa de que el Bloque 1 no deployara: `brain-memory.mjs` fue el nº13). Por eso la CRUD de memoria se fusionó en `brain-chat` (`?resource=memory`). Para sumar endpoints: fusionar en uno existente, prefijar helpers con `_`, o pasar a plan Pro.
- 🚀 **Deploy manual por CLI** (cuando el auto-deploy de GitHub falla): `VERCEL_TOKEN=<token> npx vercel@latest deploy --prod --yes` (proyecto linkeado en `.vercel/project.json`). Warning no-bloqueante: Node 20.x se deprecia el 2026-10-01 → subir `engines.node` a `24.x` en `package.json` antes de esa fecha.

---

## 🏢 Contexto del negocio

**Empresa:** Rental Profits — Gestión de propiedades en alquiler (Property Management).

**Producto:** "Empresa OS" — plataforma interna para administrar propiedades, inquilinos, reservas, pagos, gastos, mantenimiento, planificación y comunicación.

**URL producción:** [https://empresa-os.vercel.app/](https://empresa-os.vercel.app/) **Dominio principal:** rentalprofitss.com

**Usuario principal:** Nicolás Lara (CEO) — `gerencia@rentalprofitss.com` **Operaciones:** Carlos (manager) — usa Property Manager (PM) y Pagos.

---

## 🛠️ Stack técnico

- **Frontend:** Vanilla JavaScript (NO React, NO Next.js, NO frameworks de SPA). HTML \+ JS \+ CSS puros. Deploy estático en Vercel.  
- **Backend:** Supabase  
  - ⚠️ **PROD SUPABASE = `nezbaljfhhyznhltpjnk`** (`nezbaljfhhyznhltpjnk.supabase.co`). **NUNCA correr SQL/migraciones en otro proyecto.** Hay varias bases en la cuenta; verificá el `<ref>` (URL del SQL Editor / `supabase/.temp/project-ref`) antes de ejecutar. Para queries server-side: `supabase db query --linked "..."`.  
  - PostgreSQL para data  
  - Edge Functions (Deno runtime) para lógica server-side y sincronización  
  - Storage para archivos  
  - Auth para login (Magic Link)  
- **Source of truth:** Airtable (base `apptTKRYbx6gu701i` — base NUEVA limpia, cutover 2026-06-29). La base vieja `appzEnsuy4qPT6iHj` ("Empresa Rentas") quedó **deprecada**.  
- **Deploy:** Vercel auto-deploy on `git push origin main`  
- **Hosting de funciones serverless adicionales:** `api/` carpeta del repo (Vercel Functions, Node runtime)  
- **Cron jobs:** Vercel Cron Jobs (definidos en `vercel.json`)

---

## 🔐 Reglas críticas de seguridad

1. **NUNCA hardcodear tokens en código.** Todos los secretos van en **Supabase Secrets** (server-side) o **Vercel Environment Variables**.  
   - Tokens conocidos en Secrets: `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`, claves OpenAI, claves Twilio, etc.  
2. **Frontend nunca debe ver tokens.** Si el front necesita interactuar con Airtable, lo hace vía edge function (que sí tiene el token).  
3. **PAT de Airtable:** se llama "property management" en la UI de Airtable. Scopes: `data.records:read/write` \+ `schema.bases:read/write`.  
4. **Cuando se regenere un token de Airtable:** actualizar en Supabase Secrets, NO en el código.  
5. **`config.public.js`** solo debe contener IDs públicos (Supabase URL, anon key). Nunca service role keys.

---

## 🗄️ Mapeo Airtable → Supabase DB

**Base NUEVA `apptTKRYbx6gu701i` (vigente desde cutover 2026-06-29).** 5 tablas con
**linked records reales** → se eliminó TODO el fuzzy matching (nicknames, match por nombre, normalizeAddress).

| Tabla DB (Supabase) | Tabla Airtable | Table ID | Notas |
| :---- | :---- | :---- | :---- |
| `pm_properties` | **Casas** | `tblisRfa2IW02ltCL` | 1 fila = 1 propiedad. Llave estable `airtable_address_id` = recId de la Casa |
| `pm_tenants` | **Inquilinos** | `tblXuFC9azHTZGjmE` | external_id = `tenant-{recId}` |
| `pm_bookings` | **Reservas** | `tblzz3fokkBprEpIm` | enlaza Casa + Inquilino. Saltea reservas sin Fecha Entrada (start_date NOT NULL) |
| `pm_units` | derivadas de **Reservas** | — | 1 por (Casa + "Unidad / Habitación"). external_id = `unit-{casaRecId}-{slug}` |
| `pm_payments` | **Pagos** | `tbl5p63dUEhrzgHVJ` | **resuelve tenant/property/booking por LINKED RECORD IDs** (Inquilino/Casa/Reserva) + backfill desde la Reserva |
| `pm_expenses` | **Gastos** | `tblGBQ5xn9Zp6YrTN` | 1 sola tabla (antes 4). property por linked Casa. category derivada de "Ámbito" (Casa/Plataforma/Equipo) → fallback "Tipo de Gasto" |
| `pm_credentials` | **Accesos** | `tblfb63Yhn0NIMDNw` | 🔑 servicios/claves por casa. external_id = `cred-{recId}`, property por linked Casa |
| `pm_tasks` | **Tareas Mantenimiento** | `tbl1Xyxex7Ve9j8QS` | 🧰 cronograma. external_id = `task-{recId}`. OJO: convive con tareas auto-generadas por la app (external_id NULL, no se archivan) |
| WiFi (enrich `pm_properties`) | campos en **Casas** | — | `WiFi Nombre` `fldnukNsOSGMk1nEQ`, `WiFi Clave` `fldMlhg35OmZwJA5i`, `Drive` `fldohaq4JEfOuYiCj` → wifi_name/wifi_pass/drive_url |

**Nota:** la base nueva también tiene una tabla dedicada **🚪 Unidades** (`tblItO7iMZT9QS87y`) que hoy NO se usa — `pm_units` se sigue derivando de Reservas. Migrar a la tabla Unidades es una mejora futura.

### Resolución de pagos (regla CRÍTICA)

- `pm_payments` resuelve `tenant_id`/`property_id`/`booking_id` por los **linked record IDs**
  de Airtable (campos Inquilino `fld01OK8T8TJl8ZXb`, Casa `fld0RYuPMMUpcgnoF`, Reserva `fldU0KUvfPEdpp1tY`).
- **NO hay fuzzy matching ni match por nombre.** Si el pago no enlaza Casa/Inquilino → warning `pago_link_faltante`.
- La base nueva tiene un campo "Revisar inquilino" (checkbox) + "Conciliación IA" que rellena el agente de conciliación.

### Nómina (Gastos Equipo)

- La base nueva NO tiene tabla `pm_payroll` separada: los gastos de equipo/nómina entran como filas de **Gastos**
  con `Ámbito = Equipo` (category `operational`). `pm_payroll` viejo quedó deprecado.

### Migración de propiedades (cutover)

- `pm_properties` **no tiene unique constraint usable para ON CONFLICT** (`airtable_address_id` sin unique;
  `address_normalized` es índice PARCIAL). El sync hace **INSERT/UPDATE explícito por fila**.
- Las 18 propiedades viejas se **re-vincularon por `address_normalized`** (se les seteó `airtable_address_id` = recId
  de la Casa nueva) para conservar su `id` y no duplicar.

---

## 🔄 Sincronización (Mirror Sync Pattern)

**Filosofía:** Airtable → DB en un solo sentido (lectura), con write-back controlado para pagos.

### Columnas estándar en tablas espejo:

- `active` (boolean) — true si está en Airtable actualmente  
- `last_synced_at` (timestamp) — última vez que se vio en sync  
- `archived_at` (timestamp) — cuando se marcó como inactivo

### Flags de modo defensivo:

- `DISABLE_ARCHIVE=true` (env) → no archiva registros que faltan, solo actualiza. Útil cuando hay dudas sobre completitud del fetch.  
- `WRITEBACK_SAFE_MODE=true` (env) → el write-back a Airtable (Pagos) usa `typecast: false` para no contaminar single-selects con valores inválidos.

### Sync sealing (regla):

- Cuando un fetch sube datos, marca `last_synced_at = now()`.  
- Registros con `last_synced_at` anterior al inicio del sync → se marcan `active=false, archived_at=now()`.  
- Si `DISABLE_ARCHIVE=true`, este paso se saltea.

### Cómo correr el sync (server-side, sin Docker)

El `pm-sync-airtable` se invoca por HTTP. Para autenticar como cron se usa la **secret key** del proyecto
(`sb_secret_...`, obtenible con `supabase projects api-keys --reveal`) en el header `Authorization: Bearer`
(la JWT legacy NO sirve: el secret `SUPABASE_SERVICE_ROLE_KEY` está en formato nuevo).

```shell
curl -s -X POST "https://nezbaljfhhyznhltpjnk.supabase.co/functions/v1/pm-sync-airtable" \
  -H "Authorization: Bearer sb_secret_..." -H "Content-Type: application/json" \
  -d '{"dry_run":false,"archive":false}'
```

- `dry_run:true` → no escribe (OJO: en dry_run el linking property→units/bookings/payments da 0 porque NO upsertea props primero; es artefacto, no bug).
- `archive:false` → no archiva (anti-wipe). `archive:true` → purga el residuo no visto este run.
- Cutover 2026-06-29: sync real verificado (21 props, 49 units, 81 tenants, 53 bookings, 275 pagos, 106 gastos) + purga del residuo de la base vieja (quedó `active=false`, recuperable).

---

## 🎨 Frontend (Property Manager)

**Archivos clave:**

- `pm/pm-main.js` (\~485 KB) — núcleo del PM: calendario, dedup, reservas, ocupación, dashboard, pagos, gastos, alertas. Todo el PM vive acá (NO existe `pm-dashboard.js`, aunque docs viejas lo mencionen).  
- `pm/pm-*.css` — estilos  
- `index.html` \+ `app.js` — shell de la aplicación, navegación  
- IDs hardcodeados de Airtable en `pm-main.js`: `PM_AIRTABLE_BASE` (base nueva) + table IDs en los links "Abrir en Airtable" (`pmAirtableLink`) + `PM_WARN_META`. Si cambia la base, actualizar los 3.

### Calendario (regla CRÍTICA dedup units)

**Cada habitación se muestra como una fila individual.** No se colapsan.

Para dedup de units (cuando hay duplicados activo+inactivo):

```javascript
// Score para elegir la unit "ganadora" en el dedup
score = (pmActiveBookingOf(x.id) ? 1000 : 0)
      + (x.is_active !== false ? 100 : 0)
      + ...
// Preferir: 1º la que tiene reserva activa, 2º la is_active=true
```

Bug conocido y fix:

- **`pmCollapseForCalendar(deduped)`** → bug: colapsaba habitaciones. Fix en commit `8a4b2e2`.  
- **Score de dedup elegía la vacía** en vez de la activa cuando había ambas → fix en commit `0b781a4`.

### Pagos en UI:

- Modal **"Marcar pago"** con campo observación (feedback de Carlos).  
- Filtros en Inquilinos.  
- Dedup de unidades en listados.

### Estados de pago (visual):

- **Pagado** (verde)  
- **Pendiente** (gris/amarillo)  
- **Por vencer** (rosa) — decisión: NO rojo, para no alarmar prematuramente  
- **Retrasado** (rojo)

---

## ⚡ Edge Functions clave

Todas en `supabase/functions/`:

| Función | Propósito | Notas |
| :---- | :---- | :---- |
| `pm-sync-airtable` | Sync principal Airtable → DB | El más crítico. v26+ (base nueva, linked records) |
| `pm-payment-writeback` | Write pagos → Airtable | Usa `WRITEBACK_SAFE_MODE` |
| `pm-alerts` | Genera alertas (pagos, contratos, ocupación) |  |
| `pm-daily-push`, `pm-daily-close`, `pm-weekly-review` | Cron jobs PM | Vercel Cron los dispara |
| `pm-group-report` | Reporte para grupo de WhatsApp |  |
| `pm-compute-performance` | KPIs del PM |  |
| `whatsapp-send`, `whatsapp-webhook`, `whatsapp-send-cloud` | Notificaciones WhatsApp |  |
| `clickup-execute`, `clickup-ai-agent`, `sync-clickup` | Integración ClickUp |  |
| `sync-education-airtable`, `edu-*` | Módulo educación | Universidad de Real Estate |
| `extract-appraisal`, `get-market-prices`, `deep-property-analysis`, `ai-deep-analyze`, `remodel-ai` | Análisis de propiedades (otro módulo) |  |

### Deploy de una edge function:

```shell
supabase functions deploy pm-sync-airtable
# o todas:
supabase functions deploy --no-verify-jwt
```

---

## 🗃️ Migraciones SQL importantes

Ubicación: `supabase/migrations/`

| Archivo | Qué hace |
| :---- | :---- |
| `2026-06-22-mirror-sync.sql` | Agrega columnas `active`, `last_synced_at`, `archived_at` a tablas principales |
| `2026-06-23-mirror-sync-aux-tables.sql` | Lo mismo para `pm_payroll`, `pm_credentials`, `pm_wifi_credentials`, `pm_tasks` |
| `2026-06-23-archive-dxc-bookings.sql` | Marcó obsoleto DxC bookings tras invertir mapeo |
| `2026-06-23-archive-ten-bookings.sql` | Diagnóstico de residuos booking-ten |
| `2026-06-25-address-norm.sql` | Pobla `address_normalized` \+ crea índice único parcial |

### Deploy de migraciones:

```shell
supabase db push  # aplica todas las migraciones pendientes al proyecto vinculado
```

---

## 🔧 Comandos comunes

### Desarrollo

```shell
# Trabajar en el repo
cd ~/Desktop/CLAUDE\ CODE/empresa-os

# Iniciar Claude Code
claude

# Pull cambios remotos
git pull origin main

# Ver últimos commits
git log --oneline -20
```

### Deploy

```shell
# Push a main = deploy automático en Vercel
git add . && git commit -m "tipo(scope): descripción" && git push origin main

# Deploy específico de una edge function
supabase functions deploy pm-sync-airtable

# Push de migraciones SQL
supabase db push
```

### Diagnóstico

```shell
# Ver edge functions activas
supabase functions list

# Ver proyectos vinculados
supabase projects list

# Logs de una edge function (últimas 24h)
supabase functions logs pm-sync-airtable
```

---

## 📝 Convenciones de commits

Formato: `tipo(scope): descripción`

**Tipos:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

**Scopes comunes:**

- `pm` — Property Manager  
- `edu` — Universidad de Real Estate  
- `remodel` — Remodel module  
- `viral` — Viral content app  
- `sync` — Sincronización Airtable  
- `auth` — Autenticación  
- `deploy` — Vercel/deploy config  
- `db` — Migraciones SQL

**Ejemplos:**

- `fix(pm): calendario dedup units prefiere activa con reserva`  
- `feat(sync): Airtable PAT server-side modal Sync sin pedir token`  
- `docs: README registro migración Mac nuevo`

---

## ✅ Checklist antes de cualquier cambio significativo

1. **Leer commits relacionados:** `git log --oneline --grep="palabra"`  
2. **Si toca `pm-main.js`:** verificar regla de dedup de units (no romper habitaciones individuales)  
3. **Si toca edge functions:** después del deploy, correr sync de prueba \+ verificar logs  
4. **Si toca migraciones SQL:** review cuidadoso, dry-run mental (qué pasa si la tabla está vacía? si tiene millones de filas?)  
5. **Si toca tokens / secrets:** confirmar que NO se commitean — `git diff --cached` antes de `git push`  
6. **Commits descriptivos:** `tipo(scope): qué cambió y por qué`  
7. **Push solo cuando el cambio está completo y testeado** — Vercel auto-deploya y rompe producción si está mal

---

## ⚠️ Cosas a EVITAR (lecciones aprendidas)

- ❌ **Hardcodear tokens** en cualquier archivo del repo  
- ❌ **Fuzzy matching de nombres** de inquilinos (mezcla personas distintas)  
- ❌ **Colapsar habitaciones** en el calendario (deben ser filas individuales)  
- ❌ **Borrar registros** de Airtable sin entender el flujo de sync  
- ❌ **Cambiar mapeo Airtable→DB** sin un plan de rollback (lo cambiamos varias veces, doloroso)  
- ❌ **Asumir que "21 registros procesados" \= "21 en DB"** — el dedup reduce a registros únicos  
- ❌ **Saltarse `WRITEBACK_SAFE_MODE`** al escribir pagos a Airtable (contamina single-selects)  
- ❌ **Asumir que `address_normalized` existe** — fue agregado en migración `2026-06-25`

---

## 📚 Documentación adicional del proyecto

En la carpeta `docs/cowork-context/` (cuando se migre del Mac viejo):

- `PM_AUDITORIA_LIVE_22JUN.md` — auditoría en vivo del PM  
- `CRONOGRAMAS_DIAGNOSTICO.md` — diagnóstico de cronogramas  
- `REPORTE_QA_LIVE_Y_FIX_FINAL.md` — reporte de QA y fixes  
- `PROMPTS_CLAUDE_CODE_EXITOSOS.md` — prompts que funcionaron bien  
- `PLAN_FINAL_PROPERTY_MANAGEMENT.md` — plan final del PM  
- `PLAN_MAESTRO_PROPERTY_MANAGEMENT.md` — plan maestro  
- `AUDITORIA_COMPLETA_AIRTABLE.md` — auditoría Airtable  
- `AUDITORIA_DATOS_CASA_TENANT.md` — auditoría datos DxC vs Tenant  
- `ARQUITECTURA_DATOS_PROPIEDADES.md` — arquitectura de datos  
- `COPIAR_Y_PEGAR_PASO_A_PASO.md` — runbook copiar-pegar  
- `DEPLOY_QA_FINAL.md` — checklist de deploy y QA

En la raíz del repo:

- `INFORME-3-SISTEMAS-FUNCIONANDO.md`  
- `INFORME-PPT-V2.md`  
- `PROPERTY-MANAGEMENT-SPEC.md`  
- `PM-COMO-CORRER.md`  
- `PM-AIRBNB-ICAL-COMO-CORRER.md`  
- `PM-AIRTABLE-SYNC-COMO-CORRER.md`  
- `PM-AIRTABLE-ANALISIS.md`

---

## 🎯 Estado (30 Jun 2026 — Solo-lectura + reportes + guía) · rama `feat/pm-reportes-mejoras`

- 🧹 **Sync limpio:** se eliminó el mapeo de la tabla **Tareas Mantenimiento** (borrada de Airtable). `pm_tasks` ahora es 100% app (auto-tareas). Tareas viejas `task-*` archivadas (active=false).
- 📊 **Ocupación exacta:** `pm_units` desde la tabla **Unidades** dedicada (status = Estado real Ocupada/Disponible/Reservada) + `target_rent` desde "Renta objetivo". El front lee `u.status` (pmUnitState).
- 🔢 **Regla de conteo de UNIDADES (dueño, jun 2026):** cada casa_completa=1, estudio=1, apto=1, y TODAS las habitaciones de la casa juntas=1 (6 hab=1). Ej: casa completa + 3 estudios = 4 (407 Capitol). Model-agnóstico, se calcula desde las unidades reales (`pmRentableUnitsOf`/`pmOccupiedRentableUnitsOf` en pm-main + `fetchWeeklyData` en el reporte). Equivale a Casas.Unidades de Airtable (`fldsr8FGN6y5OsaEr` → `pm_properties.total_units`, fallback). Ocupación (% y libres) usa la MISMA definición. El **calendario** sí muestra cada habitación como fila individual (no colapsa) — son cosas distintas.
- 🔒 **Read-only en 3 capas** (defensa de fondo): (1) guards que reemplazan las fns de escritura (`PM_RO_BLOCKED_FNS`), (2) barrido DOM que oculta botones, (3) `pmExecQuery` bloquea cualquier escritura a tablas espejo (`PM_RO_MIRROR_TABLES`); pm_tasks/pm_alerts/pm_data_warnings son capa propia y SÍ se escriben. Calendario con **pantalla completa** (`pmCalToggleFullscreen`) y scroll preservado al expandir casas (`pmPreserveScroll`).
- 📖 **App de SOLO-LECTURA:** módulo al final de `pm-main.js` (`PM_READONLY`) que (a) reemplaza las fns de escritura a datos-Airtable por un guard con toast y (b) barre `<button>` post-render para ocultarlos (`pmApplyReadOnlyDOM`, hook sobre `window.pmRender`). NO bloquea tareas/alertas (capa propia). Lista en `PM_RO_BLOCKED_FNS`.
- 🗑 **Tab Feeds eliminada** del PM.
- 🤖 **Auto-tareas** (en el sync, idempotentes por `external_id` `auto-clean-`/`auto-reception-` con `ignoreDuplicates`): Reserva Histórica→**limpieza/turnover** (task_type `cleaning`); Activa/Reservada con entrada próxima→**recepción** (task_type `recepcion`). Ventanas: clean check-out [-14,+1]d, recepción check-in [-3,+7]d.
- 📄 **Reportes PDF (impresión del navegador = chromium real del usuario):**
  - `api/pm-report.mjs` (`?type=weekly|monthly&month=YYYY-MM&format=html|pdf&send=email|whatsapp&to=`) — auth: service key o JWT de usuario (`api/_pm-auth.mjs`, valida con anon key).
  - **El front pide `format=html` y dispara "Guardar como PDF" del navegador** (`pmPrintReportHTML`). El render chromium serverless (`@sparticuz/chromium`) FALLA en Vercel por `libnss3.so` → NO se usa para la app; `format=pdf` queda best-effort.
  - Datos `api/_pm-report-data.mjs` (lee con service key si está, si no con JWT del usuario+RLS), diseño `api/_pm-report-templates.mjs` (branding Ever Home).
  - Crons `report-weekly` (lun 13:00 UTC) + `report-monthly` (día 1) → envían **email HTML / resumen WhatsApp** (sin chromium). En `vercel.json`.
  - Front: tab Finanzas → "Generar semanal/mensual" + "Enviar ›" (`pmOpenReport`/`pmSendReport`).
- 🏠 **Guía de Bienvenida:** `api/pm-welcome-guide.mjs?property_id=&unit_id=` (mismo patrón print). Botón en ficha de Casa. WiFi + keypad desde `pm_properties.access_code` (col nueva, migración `20260630020000`, sync mapea Casas `fldKuVpYVzh7JzRP8`) con fallback parse de `pm_units.access_codes`.
- 📤 **Envío** `api/_pm-send.mjs`: email=Resend (`RESEND_API_KEY`) con el HTML como cuerpo; WhatsApp=texto vía `whatsapp-send`. Sin PDF adjunto (no hay chromium server). Env: `REPORT_EMAIL_TO`/`REPORT_WHATSAPP_TO`.
- ⚠️ **PENDIENTE Vercel (para crons + datos completos):** setear **`SUPABASE_SERVICE_ROLE_KEY`** (el `sb_secret_...`) en Vercel env — NUNCA estuvo seteada (los crons `sync-airtable`/alertas tampoco corrían). Con eso: reportes leen completo (sin RLS), crons y sync diario funcionan. Para envío real: `RESEND_API_KEY`, `REPORT_EMAIL_TO`/`REPORT_WHATSAPP_TO` (+ tokens WhatsApp Cloud).
- Demo local de los 3 PDFs: `OUT=/tmp SUPABASE_SERVICE_ROLE_KEY=... node scripts/demo-pdfs.mjs` (usa Chrome local).

## 🎯 Estado anterior (29 Jun 2026 — Cutover base nueva)

- ✅ **Cutover a base Airtable nueva `apptTKRYbx6gu701i`** (commit `2983a74`). Esquema limpio con linked records, sin fuzzy.
- ✅ `pm-sync-airtable` remapeada y deployada (v26). Pagos resueltos por linked record IDs.
- ✅ Sync real + purga del residuo viejo corridos y verificados (solo data nueva activa).
- ✅ Front (`pm-main.js`) apuntando a la base nueva, pusheado a main.
- ✅ Property Manager funcionando, calendario con habitaciones individuales + dedup.
- ✅ Viral content generation app deployed en `/viral`.

**Pendientes conocidos:**

- ⏳ Setear secret `AIRTABLE_BASE_ID=apptTKRYbx6gu701i` en Supabase (hoy el código usa el default; el secret no está seteado).
- ⏳ Validar las 6 secciones del PM en la UI con la data nueva.
- Carlos: completar enlaces (Casa/Inquilino/Reserva) en Pagos sin link y Fechas de Entrada faltantes en Reservas (ver alertas de datos).
- Twilio SMS + WhatsApp integration completa (backlog).
- Posible refactor de `pm-main.js` (485KB, modularizar).

---

## 🤖 Instrucciones para Claude

## 🎨 Decisión de producto — Sistema Operativo de IA (24 Ago 2026)

- `/jarvis` se presenta como una **empresa digital viva**: Cerebro Ejecutivo → negocios/áreas → gerentes, managers y operadores.
- El estado visible se deriva de evidencia real de ejecución. `asistido` con corridas recientes se muestra como **“funcionando · supervisado”**; no se presenta como roto. Los agentes legacy `Transversal*` quedan fuera de la vista principal porque ya fueron absorbidos.
- El mapa debe ser entendible en segundos y suficientemente visual para demos y contenido: jerarquía clara, conexiones animadas y fichas expandibles con responsabilidad, skills, tareas, horario, última ejecución y decisiones pendientes.
- “Propuestas” se presenta como **Decisiones** en lenguaje de negocio. Nunca mostrar JSON crudo ni nombres internos como experiencia principal.
- Empresas muestra el equipo real completo de cada negocio; Horarios muestra el calendario declarado y la última ejecución real; Memoria compartida explica fuentes/contexto sin duplicar el mapa de agentes; Reportes traduce resultados técnicos a resúmenes humanos.
- El Cerebro puede reunir perspectivas de CEO, CFO, CTO, CMO, COO, Legal y Data, pero cualquier acción de publicación, gasto, contrato o cambio sensible conserva aprobación humana.

Cuando arranques una sesión en este repo:

1. **Leé este archivo completo primero.** Es la fuente de verdad para decisiones técnicas.  
2. **Si vas a hacer cambios:** mostrá el plan ANTES de tocar nada. Confirmá comprensión de las reglas críticas.  
3. **Si descubrís algo nuevo importante:** actualizá este archivo antes de cerrar la sesión.  
4. **Si encontrás contradicciones** entre este archivo y el código actual: pregntá al usuario qué prevalece antes de hacer cambios.  
5. **Idioma:** español rioplatense informal. Directo, claro, sin floritura.  
6. **Estilo de trabajo:** proactivo. Todo el PM vive en `pm-main.js` (no hay `pm-dashboard.js`). Si vas a tocar una edge function, verificá quién la llama.  
7. **Antes de commits/push:** mostrá el diff y pedí confirmación si el cambio toca producción.

---

*Última actualización: 24 Ago 2026 — dirección de producto del Sistema Operativo de IA y estados basados en evidencia*
