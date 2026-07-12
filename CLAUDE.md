# CLAUDE.md — Empresa OS (Rental Profits)

Este archivo es la **memoria persistente** del proyecto para Claude (Claude Code, Claude Desktop, Cowork). Léelo siempre al iniciar una sesión. Mantenelo actualizado con cada decisión técnica importante.

---

## 🎨 REGLA DURA — SISTEMA DE DISEÑO (12-jul, Fase 0 aprobada por el CEO)

- **Toda superficie nueva importa `ui/tokens.css` + usa `ui/kit.js`** (kitMoney/kitMoney2/kitHero/kitCard/kitRow/kitInput/kitInputSm/kitBadge/kitEmpty/kitLoading/kitError — globales del bundle). **PROHIBIDO**: Tailwind nuevo, `:root`/paleta propia por módulo, hex/rgba de paleta inline. Familia canónica = la del shell (`--bg/--ink/--mut/--mut2/--glass/--glassb/--a1/--a2/--pos/--neg/--amber`); la familia FF (`--card/--line/--txt2/--txt3`) vive como ALIAS en tokens.css — no redefinirla.
- **Regla "sin dato ≠ $0"**: todo KPI usa `kitMoney(n)` (null→'—'), jamás un $0 mudo. **Contraste**: ningún texto legible por debajo de `--mut2`; badges amber en light = texto sólido `#b45309` sobre `#fef3c7`.
- **LIGHT canon** (CEO): `--bg:#eef1f7` (tinte, no blanco) · tarjetas `#ffffff` + borde `#e2e8f0` + sombra `0 1px 2px rgba(15,23,42,.05), 0 6px 16px rgba(15,23,42,.06)` + radio 16-20 · `--ink:#0f172a/--mut:#475569/--mut2:#64748b` · `--a1:#2563eb/--pos:#0f9d6b/--neg:#dc2626/--amber:#b45309`. ⚠ `osInjectCSS` (os/os.js) mantiene un ESPEJO scoped a #os-root — sincronizar si cambian los tokens.
- Quick wins globales en tokens.css: media query ≤768px (grids k2/k3/k4 → 1 col), `.overx` + `#os-root .card:has(table){overflow-x:auto}`, `.repbtn` por fin definido (el shell lo usaba sin definirlo).
- ⚠ **ANTI-RESET (12-jul)**: los overlays #os-root/#ff-overlay/#cc-overlay/#rc-overlay traen reset `#id *{margin:0;padding:0}` (1-0-1) que PISA clases bare (0-1-0) — mató los paddings del ARV (ap-css, ya auto-prefijado) y los del kit. tokens.css tiene bloque de SUPERVIVENCIA re-afirmando paddings del kit bajo esos 4 IDs; todo CSS de módulo en overlay se scopea con el ID contenedor; overlay nuevo con reset → sumarlo al bloque.
- 🪦 **Zombies borrados (12-jul)**: `cleaning-planner.js`, `ops-planner.js` (ya redirigían a Cronograma) y `remodel-dashboard.js` (reemplazado por el RC CC; `app.js` redirige el type legacy) — bundle −467 KB. **Auditoría completa de las 37 superficies (semáforos + problemas) en la conversación del 12-jul**; olas pendientes: replicar patrón Cash-Out en Intereses/Ingreso/Negocio · modernizar clásicos (PM/Cronograma/Estimador) · unificar standalone — revisar UNA POR UNA con el CEO antes de aplicar.
- ✅ **Olas 1-4 ejecutadas (12-jul)**: ola 1 patrón Cash-Out en Calc 1/4/5 del UW (hero+kit+ajustes colapsados, lógica intacta, golden tests OK) · ola 2 light canon en FF CC y Rentas CC + colores pelados tokenizados (color-mix) · ola 3 clásicos: red de seguridad dark p/ estilos inline (#modal y PM), pulido light (sombras+contraste), tablas con scroll en celular, acento PM light→canon · ola 4 standalone linkean tokens.css (locales ganan, cero regresión). **Finos CERRADOS (12-jul tarde)**: Seguimiento del Estimador con filtro por etapa + paginación 25/50/100 (`RM_SEG`, KPIs sobre el proyecto completo) · Viral studio con onboarding estático en el HTML (causa raíz del vacío: render async sin placeholder) + labels con contexto en los 4 tabs · Diagnóstico con minimapa de pasos navegable (`w.maxIdx`, solo recorridos clickeables) + toast de guardado. La auditoría de diseño quedó 100% ejecutada.
- 🏆 **ADN PREMIUM (12-jul, norte = Cash-Out + ARV Pro v2)**: tokens += `--grad` (teal→azul) / `.hero-num` (número en degradé) / `.tag-grad` / sombra light `0 6px 22px rgba(23,43,77,.07)`; kit += **kitVerdict/kitConfidence/kitRange/kitToggle**; `kitHero` sin color = degradé. **TODAS las 🟡 convertidas** (4 agentes paralelos + spot-check con screenshots en prod light+dark): FF Command (veredicto+hero+confianza+toggle Simple/Experto), Deals (veredicto déficit + vacíos 👻 + kanban mobile), Finanzas (kitMoney+hero+confianza), CRM (KPI contratos hardcodeado→"—" honesto [el campo NO existe en Airtable] + búsqueda), Cerebro (errores humanos), Contable (veredicto Sabueso con $ sin conciliar + P&L overx+consolidado destacado), Operación (hero cobranza), IA (labels chat+banda specs), inv-admin (labels+unidades+kitError), Reportes CEO (filtros colapsables+anti-NaN+hero R1), Planner (toasts al mover+hero semana), Educación (hero+empties). Los 4 agentes con guards `typeof kit*` y cero lógica tocada; golden tests verdes.
---

## 🎯 Estado (12 Jul 2026 · noche 3 — 🎯 CALC 6: VISTA UNIFICADA PRO + ONE-PAGER) · EN VIVO

- 🎯 **Calc 6 rehecha** (rama `feat/ff-vista-unificada-pro`, módulo `pm/ff-unificada-pro.js`; `ffUwViewUnificada`/`ffUwPresentacion` delegan): **el deal de un vistazo encadenando las 5 calcs SIN recalcular** (todo de `ffUwComputeAll`) — banda veredicto GO/NO-GO con guardrails en palabras · secciones El proyecto (compra/remo/draw/**meses de obra y hasta rentar REALES** de ff_draws: cubiertos+hueco; el load de UW.draws ahora trae hml_months/intereses) · La inversión (pone HUD con centavos/presta Harmony/ARV con chip de confianza del TASADOR si corrió/MAO) · Renta y flujo (**chip del modelo elegido** de Calc 5) · El retorno (cash-out/capital recuperado con **♾️ si ≥100%**/ROI/all-in con barra) · **línea de tiempo** compra→obra→renta→refi→recuperado. **Faltantes honestos**: hipotética vacía muestra "🟡 falta: cargá X →" con link a la calc — nunca $0 fingido.
- 📄 **One-pager inversionista** (`ffUnificadaOnePager`, print CSS): RENTAL PROFITS + dirección + veredicto + hero 4 KPIs + Inversión requerida (HUD desglosado)/Proyecto/Retorno/Renta y flujo/Recuperación (timeline) + footer fecha + "Preparado por Rental Profits" + disclaimer. Mini-mapa OSM estático con onerror-hide (el servicio staticmap es flaky). ⚠ foto real: Airtable solo tiene links Drive no embebibles y attachments expiran — si se quiere foto, campo URL pública. QA prod 15/15 · 0 pageerrors · PDF verificado (puppeteer page.pdf).

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

Cuando arranques una sesión en este repo:

1. **Leé este archivo completo primero.** Es la fuente de verdad para decisiones técnicas.  
2. **Si vas a hacer cambios:** mostrá el plan ANTES de tocar nada. Confirmá comprensión de las reglas críticas.  
3. **Si descubrís algo nuevo importante:** actualizá este archivo antes de cerrar la sesión.  
4. **Si encontrás contradicciones** entre este archivo y el código actual: pregntá al usuario qué prevalece antes de hacer cambios.  
5. **Idioma:** español rioplatense informal. Directo, claro, sin floritura.  
6. **Estilo de trabajo:** proactivo. Todo el PM vive en `pm-main.js` (no hay `pm-dashboard.js`). Si vas a tocar una edge function, verificá quién la llama.  
7. **Antes de commits/push:** mostrá el diff y pedí confirmación si el cambio toca producción.

---

*Última actualización: 29 Jun 2026 — Cutover a base Airtable nueva `apptTKRYbx6gu701i` (linked records, sin fuzzy)*  
