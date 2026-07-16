# IMPLEMENTATION_LOG — Auditoría Maestra 2026-07-13

Rama `rebuild/os-audit-2026-07` · un commit por ítem · verificación contra fuente antes de commitear.
Estados: ⬜ pendiente · 🔄 en curso · ✅ hecho · ⛔ bloqueado (con nota).

## 15-jul (noche 3) · 📣 COBROS FASE 1 — motor de recordatorios (SANDBOX, checkpoint CEO antes de UI) (commit a7dc51f)
- ✅ **Bloqueante respetado**: construido SOBRE la definición corregida (v_cobros_estado → v_cartera_inquilino). Dry-run sobre los 38 casos reales: **Xinquan NETO $0 (current, 0 followups) · Jackelin $1,700 · Shamyra $637.50 (pago parcial reconocido)** · 12 vencidos reales / 21 mes en curso / 5 current · totales neteados 9,991 vencido / 36,034.35 mes en curso / 11,259.50 a favor.
- ✅ Schema (migr `20260715150000` aplicada): pm_tenants += TCPA (consentimiento_sms/opt_out/idioma/telefono_sms/dia_exacto_pago/payment_link) · cobros_config (modo **sandbox** default, followups 3/7/10, quiet 8-20) · cobros_recordatorios (todo envío con provider_response) · 4 plantillas ES/EN cordiales (TDCA) con {{link_pago}}.
- ✅ Edge fns deployadas: **cobros-motor** (dry_run default; due el día de pago; followups SOLO vencido neto>0; dedupe/mes; gates plantilla→destino→opt-out→TCPA→link→quiet; live=Twilio+Resend por secrets) · **cobros-twilio-webhook** (STOP→opt_out permanente + firma validada; delivery receipts → provider_status).
- ✅ Simulación día de pago: 56 candidatos, **TODOS frenados por las barandas** (26 skip_consent TCPA + 30 sin destino) — no sale nada ni en live hasta cargar consentimientos/teléfonos/links. Cron NO programado a propósito (no se enciende sin OK).
- ⚠ Gotcha del dry-run: is_currently_renting no viene poblado del sync → contrato activo se deriva de renta pactada del mes corriente (fix en la vista). Followups con día de pago 1 caen los días 4/8/11 (due+3/7/10).
- ⬜ Pendiente para encender: cargar consentimiento_sms (con fecha+origen del lease), teléfonos/emails, payment_link QBO por inquilino (o link_pago_default), A2P 10DLC aprobado, secrets TWILIO_*/RESEND_API_KEY en Supabase, modo→live, cron diario. Dashboard UI: tras el checkpoint del CEO. Fase 2 (late fee §92.019, notices §24.005) espera al abogado.

## 15-jul (noche 2) · 📋 Informe de Cartera — Rentas (commits 48a663f · 08db546 · bcf656d; QA prod 17/17)
- ✅ **Sync**: pm_payments += `renta_pactada` (fldpUSJ1HdZQmQPMH) + `deuda` (flduMsIV5gZRIv1eU) — causa del descuadre $32,261 vs $51,997.50: sin la renta pactada el OS no podía calcular deuda. Migr aditiva + pm-sync-airtable deployada + resync (205 con pactada / 45 con deuda).
- ✅ **UNA definición, TRES números** (RPC `cartera_informe(p_mes, p_desde)` invoker/RLS + v_cartera_*): DEUDA VENCIDA (meses cerrados = mora real) · POR COBRAR DEL MES (NO es mora) · SALDO A FAVOR (adelantos CON renta pactada; los negativos históricos sin contrato espejado NO cuentan, se declaran). ANTES el informe manual sumaba todo como "vencido" (+195%).
- ✅ **NETEO POR INQUILINO** (a favor cubre vencido primero, luego mes en curso): Xinquan 7,200 vs 3,600 → julio cubierto, **neto $0** · Jackelin → **debe 1,700, no 3,400** (verificados en QA con datos reales).
- ✅ **VALIDACIÓN AL CENTAVO vs el informe manual del CEO**: jun **9,860.00** · jul **42,137.50** · a favor **6,900.00** · total **51,997.50** — EXACTOS. Crítico ≥2k neteado **22,000** (CEO estimó ~21,300; el neteo Xinquan+Jackelin da exactamente −5,300 — la dif es qué inquilinos entran al corte crítico).
- ✅ **Vista /cartera** (app en Rentas): período con un clic (mes + ventana de vencidos), KPIs con ⓘ linaje, **aging 0-30/30-60/60+**, variación con ⚠ >100% ("¿real o carga de registros?" — julio da +352% justamente por la carga de registros nuevos con pactada), anexo por inquilino con detalle mes a mes, **⬇ CSV + 🖨 PDF** (reportOpen). 6 números en data_lineage + pantalla en el crawler (gate 199/199 en 30 pantallas).
- ✅ **Sabueso C22**: (a) moroso con saldo a favor que lo cubre → "neto $0, no es moroso" · (b) "Deuda Pendiente" de Airtable incluye el mes en curso → por cobrar, no mora · (c) variación >100% → mora real vs carga de registros (umbral `cartera_var_pct`). Los 3 disparan hoy con casos reales.
- 🐛 Fix cazado por el QA: `desde=null` ("todo el historial") se pisaba con el default mes-1.

## 15-jul (noche) · 🏷️ MODO VENTA (flip exit) — cascada de experto en el Underwriting
Pedido del CEO: la suite estaba armada para HOLD/refi; para una VENTA la matemática es otra. Construido el modo de experto fix&flip, encadenado con las otras calcs (mismo deal = mismos números).

**Item 0 — Toggle de estrategia + default desde Airtable** (ya venía de la sesión previa, confirmado): `[Vender (flip)] · [Rentar (hold)]` arriba; en Vender el nav OCULTA cashout/ingreso; default = Estrategia del deal (Fix and flip → Vender · Fix and hold → Rentar).

**Item 1 — "Usar ARV" → precio de venta** (encadenado): el ARV oficial (`inp.arv`, fix de propagación previo) fluye a la calc de Venta como **precio de venta esperado** (editable, con "↩ volver al ARV"). Verificado end-to-end: confirmar otro ARV mueve el precio y la utilidad.

**Item 2+3 — cascada de experto + métricas** (`ffUwCalcVenta`, reemplaza el modelo `netWire − capital`):
- ANTES: `utilidad = Net Wire − staging − capital` (mezclaba el payoff del préstamo con la economía del proyecto).
- DESPUÉS (modelo del CEO): `utilidad = precio − comisión% − cierre vendedor% − concesiones% − ALL-IN(compra+rehab) − INTERÉS HML total(solo interés × meses hasta vender) − holding(utilities+seguro+predial) − staging (− impuesto% opcional)`. El **payoff del HML NO entra en la utilidad** (es financiación del all-in); sí en el **Net Wire** (precio − costos venta − payoff = cash en la mesa, informativo).
- Métricas: **margen sobre venta %**, **ROI cash-on-cash** (utilidad ÷ capital), **★ ROI ANUALIZADO** (ROI × 12/meses — la velocidad manda), **check regla 70/75%** (all-in ≤ ARV×maxPct − costos), meses hasta vender, semáforo del deal.
- Reparto: **devolver capital a inversionistas → repartir la utilidad por % equity** (50/50 default, editable).
- **Golden 26/26 (código real): ejemplo del CEO $449,177 → comisión 26,951 · cierre 6,738 · all-in 330,000 · interés HML 14,850 · holding 5,000 → utilidad $65,638 · margen 14.6% · ROI 140% · anualizado 335%.** ✓

**Item 4/5 — Intereses en modo venta = SOLO HML**: se oculta todo el bloque DSCR/refi (préstamo del refi, cuota PITI, tope DSCR). Muestra solo el hard money: interés mensual × meses hasta vender = carry total que ⛓ alimenta la calc de Venta. El HML se cancela con el payoff en el cierre.

**UI**: vista Venta con hero (utilidad + margen), semáforo, cascada itemizada, Net Wire, métricas del flip, reparto. Unificada + one-pager adaptados (KPIs de venta, utilidad del flip, ROI anualizado, regla 70%, timeline compra→obra→venta→utilidad). Config `venta_cierre_pct`/`venta_concesiones_pct`/`venta_impuesto_pct` seedeados (migr `20260715131000`, editables). node --check + golden verdes.

## 15-jul (noche) · 💎 Inversor v2 — ajustes de Juan + mapa colapsable (commits 543ea3d · f16d252 · 3b88e9f; QA prod 19/19)
- ✅ **Mapa**: árbol con empresas COLAPSABLES (chevron, cerradas por default salvo la activa, persistido; la búsqueda expande).
- ✅ **Modelo & movimientos v2** — ANTES: línea P&L a mano, fecha completa, categorías sin guía, "# factura" texto que se perdía, movimientos sin edición, params en lista plana de 46 keys. DESPUÉS: **P&L derivado de la categoría** (ingreso/operativo/tax = SÍ · inversión/financiero = NO, tooltip "¿qué es P&L?") · fecha en vista **YYYY-MM** (completa guardada) · selector con **guía de flujos** (❓ panel: DRAW = financiero, utilities = operativo) + **sugerencia automática** por descripción · **factura_url** como link "📄 Ver factura" · movimientos **editables ✎ + soft-delete 🗑 con `inv_audit`** inmutable por trigger (insert/update/archive verificados) · **UNA FUENTE**: columna = ✍️ manuales (editables) + ⚙️ auto-importados del inv_ledger (FF/Rentas, badge auto·fuente, no se re-teclean); Ledger declarado vista de SOLO LECTURA de lo mismo.
- ✅ **Params en los 9 BLOQUES de Juan** (colapsables, badge auto·fuente vs manual): identificación / estrategia / compra (+total invertido calculado) / HML / refi / **inversionistas+equity con % del operador calculado** / operación / supuestos (manual) / **metas (manual, "＋ faltan" precarga el alta)**.
- ✅ **Distribuciones — bug Yeisson MUERTO**: el k1_url se guardaba pero la fila solo mostraba un emoji; ahora columna Links con **📎 pago ↗ y 📄 K-1 ↗ clickeables**, campos SEPARADOS `comprobante_url` (soporte) ≠ `k1_url` (fiscal), **edición ✎ auditada** + soft-delete; el portal del inversionista también muestra ambos links. Migr `20260715120000` aplicada.
- ✅ **Casas & reparto**: buscador (casa o inversionista) + orden A-Z casa / inversionista / mayor inversión.
- Vista del inversor ya separada por diseño (portal RLS solo-lectura); el modelo interno jamás sale.

## 15-jul (tarde) · 🕸 Linaje v3: overlays + lectura EN VIVO + ocupación única (commits d3f8d77 · c070f7e · 6c8a35d)
- ✅ **Crawler v3 con drivers de OVERLAYS** — abre y recorre headless: FF CC (6 secciones + Underwriting con hipotético y las 6 calcs vía `ffUwSub`), Rentas CC (7 secciones), Remodel CC (7 secciones + Reportes CEO r1/r2/r5), PM clásico (7 tabs), Estimador Pro (4 tabs) — extractores por DNA de cada overlay (`.card.kpi`, `.kit-kpi`, `.hero-num`, `.kpi>.l+.v`, Tailwind uppercase+bold). **GATE TOTAL: 192/192 números vistos en 29 pantallas · 0 sin cadena · verificado también EN PROD**. 95 descubiertos → TODOS curados con fuente exacta en la misma sesión (0 pendientes). Filas-registro (direcciones) excluidas por diseño: su linaje es el de sus columnas. UW hipotético sin inputs no muestra números ("sin dato ≠ $0" comprobado por el crawler). ci:gate 15/15.
- ✅ **LECTURA EN VIVO activada** — `OS.lineage` se carga en osLoad; `osLineageRow(empresa, sistema, dato)` = fuente efectiva; primer número cableado: **"Renta mensual actual" de la Ficha** (dual-source real). **EVIDENCIA en prod (qa-switch 4/4): $4,850 FF·Propiedades → reasignar en el mapa → $4,800 Rentas·Unidades ⚡mapa → revertir → $4,850**; los 3 cambios en data_lineage_audit (quién/cuándo/antes→después). Contable sigue gateada (reasignar → pend hasta reconciliar QBO).
- ✅ **Ocupación ÚNICA cerrada** — el "bug regla dueño en Global" era falso positivo (Global ya leía v_ocupacion: 90% = 43/48 redondeado); el divergente real era el **PM clásico** → `pmOccupancyAt` ahora prefiere v_ocupacion (regla dueño queda como fallback y para detalle por casa/cobranza). **Verificado en prod 4/4: Global 90% (43/48) = Empresa Rentas = Rentas CC = PM Resumen ("43 de 48")**. El calendario mide OTRA cosa (días cubiertos de la ventana — rotulado). ⚠ hallazgo nuevo del crawler: PM·Finanzas "Ocupación portafolio" 80% = media del PERÍODO financiero (tercera definición) — warn en el mapa, decidir rotular vs unificar.
- 📊 **Cobertura final: 216 números activos** — FF 73 (66 ok · 7 warn) · Rentas 63 (59 · 4) · Remodelación 50 (48 · 2) · Holding 16 (16) · Contable/QBO 14 (13 · 1) · **0 bug abiertos · 0 sin fuente**.

## 15-jul · 🔎 Linaje v2 "viene → número → alimenta" + GATE de cobertura (pedido CEO, commits d87ec2e · a27f94b · c9eb44b)
- ✅ **Flujo por número (réplica exacta de "conexiones-al-detalle")** — árbol Empresa → sistema → **NÚMEROS** con semáforo + buscador global; al elegir un número: **① De dónde viene** (nodos con flechas Base→Tabla→Columna→Vista→ƒ→[número resaltado], fórmula, nota ⚠, "🧬 la vista lee de…" desde information_schema) · **⬅ se alimenta también de** (grafo inverso) · **② Qué alimenta** (tarjetas con salto para seguir la cadena — feeds curados [31 cadenas seed] + AUTOMÁTICOS: mismo origen tabla·columna y vistas que consumen la tabla espejo vía diccionario Airtable→pg). Schema v2 (migr `20260715100000`): metric_key único, vista, feeds[], origen; vista alias `data_lineage` (nombre del prompt).
- ✅ **GATE DE COBERTURA — ningún número visible sin cadena** (`scripts/lineage-coverage.mjs`): crawler headless que recorre las pantallas del shell OS, junta cada número visible y lo cruza contra data_lineage; `--register` inventaría (origen=crawler, pend), `--gate` FALLA si hay números sin entrada → **quien agrega un número está obligado a registrar de dónde viene**. Corrida inaugural: 64 vistos → 40 descubiertos → **40/40 curados con fuente exacta** → **gate verde 63/63 EN PROD** (el 64º era la card del propio mapa, despseudonumerizada). `ci:gate` += 3 checks (e): corrida ≤7d + 0 sin registro + 0 sin curar → **15/15**. Cobertura visible en el home de /mapa y "N/N con fuente" por empresa en el árbol.
- 🔴 **Hallazgo del crawler**: "Ocupación Rentas" del Panel Global usa denominador REGLA DUEÑO (34 unidades → 90%) mientras la oficial v_ocupacion usa rentables (48 → 93.75%) — el caso "ocupación con distintos denominadores" de la lista del CEO, ahora marcado BUG en el mapa con la explicación.
- 📊 **Cobertura por empresa/sistema (121 números activos, 0 sin fuente)**: Fix & Flip 56 (Ficha 29 · CC 8 · UW 5 · Analítica 5 · Portal 4 · Inversionistas 3 · Empresa 2) · Rentas 20 · Remodelación 15 · Contable/QBO 14 · Holding 16 (Global 9 · Operación 7). Semáforo: 108 OK · 12 REVISAR (dual-source renta, draws vacíos, capital coalesced, etc.) · 1 BUG (ocupación).
- ⬜ Alcance declarado v2 del crawler: hoy recorre las 7 pantallas del shell OS; los overlays (FF CC secciones, PM clásico, Planner, Estimador, Reportes) están trazados por seed curado a nivel sistema — sumarlos al crawler es la v3 (requiere drivers por overlay). "Reasignar fuente ⇒ la app lee de la nueva fuente en runtime" sigue pendiente (hoy: documentado+auditado+gobernado con reconciliación QBO).

## 14-jul · Ficha conectada + 🗺️ Mapa de Conexiones (pedido CEO, commits 21e41a8 · 8420340 · 4b6df45)
- ✅ **Ficha: paneles Rentas/Remodelación conectados** — ANTES: 9909 Childress (rentada_y_refinanciada) mostraba "Todavía no está en Rentas" y "Sin obra en Remodelación" (osCasaMatch anclaba SOLO en Rentas por dirección; "Austin, Texas" de FF ≠ "Austin, TX" de Rentas → pid=null → los fallbacks por property_id jamás corrían). DESPUÉS: resolución en 2 pasadas (dirección en CUALQUIER fuente → property_id canónico → re-resolver todo) · panel Rentas = **renta $4,850 / gastos $3,260 (FF·Propiedades) / flujo $1,590 (v_ff_portafolio.flujo_mes, la MISMA definición del CC)** + detalle de unidades/cobranza del espejo Rentas · guardrail: etapa rentada sin datos → "faltan datos" ámbar, jamás vacío · sin obra pero casa terminada → "✔ Obra finalizada" con resumen FF. Childress verificado en prod (QA 22/22).
- ✅ **🗺️ Mapa de Conexiones `/mapa`** — data_lineage_map (84 números de las 4 empresas con base·tabla·columna·fórmula·semáforo, con field IDs; RLS por áreas; audit INMUTABLE por trigger con email real verificado) + árbol Empresa→Sistema→número + modo LISTA (buscador, estado editable, ✎ reasignar fuente, ＋ agregar, ✕ soft-delete) + modo DIAGRAMA (nodos y líneas SVG por color de base, clic aísla, panel detalle "Cambiar fuente" — réplica de los 3 artefactos de referencia del CEO) + export JSON/CSV + banda de la LLAVE (property_id↔Dirección). **Generación desde metadata**: RPC lineage_view_usage (information_schema.view_column_usage) → scripts/lineage-gen.mjs → os/os-lineage-views.js ("la vista lee de…" se regenera solo, 27 vistas). **Gobernanza**: reasignar fuente de cifra contable queda PENDIENTE hasta reconciliar QBO; todo cambio auditado. **ⓘ "de dónde sale"** junto a los números de la Ficha (osLinI/osLineageInfo reusables). Accesos: card en Global + link en cada empresa.
- ⬜ Pendiente declarado del mapa: (a) "crear KPI desde el mapa y que la app lo materialice" — hoy ＋ Agregar dato crea la fila gobernada (pend) pero NO genera la vista/tarjeta; (b) el motor de KPIs lee el mapa solo como ⓘ/documentación — el switch de fuente en runtime (que la app LEA de la nueva fuente al reasignar) queda para la fase 2 con el patrón osLineageSource(); (c) drag&drop de nodos (hoy el layout es fijo, el reordenamiento es por `orden`).

## FASE 0 — Fundaciones
- ✅ **0.1 · O2 property_id canónico** — `property_id` YA estaba poblado (FF 28/28, Remodel 26/26, Rentas 21/21; trabajo previo). Se creó `property_alias` (migr `20260713100000_o2_property_alias.sql`): 175 aliases activos = 28 FF + 28 recIds + 26 Remodel + 21 Rentas + 23 ClickUp folders + 29 maestra + **20 QBO** (las 19 cuentas del Balance mapeadas, 0 sin mapear). **Dudoso documentado:** QBO "Rental Property - Casas Marlin" agrupa 2 casas → alias FAN-OUT (2 filas: Bartlett + Capps; el unique incluye property_id a propósito). Bitter Creek 2425/2511 no está en los espejos activos (no hay deal activo con ese nombre) — si aparece, se agrega alias manual. **Aceptación OK:** query de prueba une ff_deals↔qb_report_cache por property_id (Idlewood $316,000, Nesting $286,012, Dove $270,000…). RLS: lectura por áreas, escritura solo service.
- ✅ **0.2 · O1 capa única de KPIs** — migr `20260713110000`: v_capital_deployed (equity $963,597.63 ✓ / QBO $728,361 stale→1.5, deuda HML OS $5.2M / QBO $4.5M separadas) · v_property_360 (Wellington equity +$200,000 ✓ exacto; líder resuelto vía airtable_record_names — parcial, faltan nombres en esa tabla) · v_obras+v_obras_kpi (26/7, utilidad $170,682 ✓, ingreso $1,466,360 ✓, margen ponderado 11.6% ✓) · v_ocupacion (48/45/3/0 = 93.75% ✓ EXACTO tras archivar 45 pm_units stale verificadas contra Airtable vivo) · v_pnl_casa (interés real Σpagos + prorrateado días×tasa con cap al vencimiento si refinanció; tasa_pct llega como fracción). security_invoker=on en todas.
- ✅ **0.3 · O3+O4** — ui/kit.js + tokens ya existían (trabajo previo); se agregó `ui/kit-decision.js`: GLOSARIO central 24 términos + kitTerm (tooltip hover) + kitDrill (overlay con fuente) + kitNext (🔍 Qué revisar, patrón EVM) + kitKpi (Tarjeta-KPI estándar con faltantes 🟡) + kitSkeleton (shimmer + prefers-reduced-motion). Unit tests OK.
- ✅ **0.4 · O8+P2** — lecturas YA eran Planner-first (os.js + CC verificado). v_divergencias_legacy (migr `20260713120000`): 3 obras avance legacy≠Planner + Bramble Unidades 3≠5 → check C19 en el Sabueso (el manual no pasa en silencio). ⚠ NOTA HUMANA: retirar el singleSelect "Porcentaje avance obra" y el campo "Unidades" desde la UI de Airtable (la API no borra campos).
- ✅ **0.5 · B17** — rec fantasma F&F recp4dED0aFJvDldk: NO entra al espejo (sync filtra sin dirección) · units vacías: 0 activas · Estimador: dupe real = Charles St ×2 → archivado el viejo (migr `20260713130000`), quedan 31 · guard-rails noZeroAsReal/reconcileLE/emptyState en kit-decision (tests OK).

## FASE 1 — Palancas de plata
- ✅ **1.1 · B1+B3** — "Rentabilidad draws/EBITDA FF" (Σnet_total −$320,230 ✓ reproducido) → "Déficit de capital en hold (a recuperar vía refi/venta)"; Ganancia real = Net Income P&L QBO YTD ($57,060.76 espejo al 6-jul; la auditoría vio $46,102.99 en QBO vivo — B10 re-sync pendiente en 1.5) con as_of; fantasma $1,067,530 NO reproducible en código ni espejo actual.
- ✅ **1.2 · #2** — v_capital_deployed en los 5 módulos (heros CC+Inversionistas = ffCapitalHero con DrillDown equity/deuda; Finanzas y Analítica reetiquetadas "All-in (COSTO)"; Global os.js). La deuda jamás se presenta como capital.
- ✅ **1.3 · N1+N3+N4** — KPIs al tope: interés/ingreso 68% + ICR 0.35× (rojo, TermTooltip+NextAction; auditoría decía 61.5%/0.29× con espejo más viejo) · waterfall único $170,682 → −interés YTD $141,907 → −overhead $133,226 → Net QBO $57,061 con residuo declarado · P&L por casa con interés HML en la línea (v_pnl_casa).
- ✅ **1.4 · N2** — panel "💎 Equity incorporado del holding" Σ(ARV−all-in) solo casas con obra real, barras + DrillDown por casa (ARV−compra−rehab).
- ✅ **1.5 · O5+B10** — re-sync ejecutado vía qb-oauth/sync (READ-only): Investor Contributions $728,361→**$763,361** ✓ y HML-Refin $1,220,700→**$1,459,200** ✓ (= QBO vivo de la auditoría), HML vivo $4,515,214 intacto, as_of 13-jul · reconciliador 3 columnas OS|QBO|Airtable en /contable con Δ y alerta >5% (umbral o5_delta_warn_pct).
- ✅ **1.6 · B2** — "sin conciliar" = solo C1–C3 (conciliación real, neteado por concepto); el resto es "$ señalado a revisar"; candado reconcileLE vs Total Assets del holding → "⛔ motor en error" si se viola.
- ✅ **1.7 · B5+B6+B8** — B5: ficha muestra Equity incorporado SIEMPRE (v_property_360: Wellington +$200,000; déficit en hold pasa a secundario "a recuperar, no es pérdida"; all-in desglosado compra+rehab; líder resuelto) · B6: verificado YA cubierto por trabajo previo (badge "en curso · proyectado", utilidad proyectada = valor_cliente − gasto = fórmula de la auditoría, Denfield +$63K; avance Planner-first de 0.4) · B8: sync-remodel-workers mapea el LINK Personal en Campo + lookup tarifa + link propiedad (deployado + corrido: 3,433/3,436 filas con recId), v_remodel_nomina_ledger v2 joinea por recId (texto libre solo fallback legacy) — **0 sin tarifa (antes 177) · 0 deudas negativas (antes 172)** · sobrepago $133,902 visible aparte · deuda neta $39,026. NOTA: si falta tarifa de alguien nuevo se carga EN AIRTABLE (Personal en Campo), no acá.

## FASE 2 — Consistencia
- ✅ **2.1 · B4+B13+B14** — v_ocupacion (48/45/3/0=93.75%) en Global + Rentas CC (todas sus secciones vía kpi override); libres=disponibles sin mantenimiento; snapshot 30/34 muerto. B14: el calendario clásico no muestra % (no reproducible — anotado). pm-main clásico conserva la regla del dueño internamente (alimenta cobranza), el headline del OS es la vista.
- ✅ **2.2 · B7+B9** — avance prom solo Planner (mata el 91%); rentabilidad = margen ponderado Σutilidad/Σvalor_interno = **11.6% ✓** (excl. denominador ≤0, mata 0.2% y Stonleigh 322%); obras ya venían del espejo (26).
- ✅ **2.3 · O6** — ui/report-engine.js (reportOpen genérico: marca, KPI cards, tablas badges, filas, conclusión, print CSS, sin-dato≠$0) + reportCasa() de las vistas O1, botón 📄 en la ficha.
- ✅ **2.4 · P7** — kitNext en Global (cobranza→Carlos, appraisal>ARV→Juan) + Ficha (déficit→refi/venta); Rentas CC ya traía action, Sabueso tiene proponer/contadora, FF Finanzas desde 1.3.
- ✅ **2.5 · O9+B11+B15** — colapso semántico 2,927→grupos priorizados (sla/críticas/volumen) en /operacion con filtro 1-clic · C20 interés negativo (Refin −$15,747.56 ✓ detectado; reclasificación = contadora, QBO read-only) · "Cobranza operativa" + A/R QBO al lado.

## FASE 3 — Datos / proceso / inteligencia
- ✅ **3.1 · O7** — v_supuestos_calibrados: obra $53/sqft REAL (19 finalizadas) vs $28 soñado · duración 1.8m vs 12m · holding financiero 4.6m. Visible en Del Negocio con aplicar-a-1-clic (psf_media / default_meses_hold → ff_uw_config). Mata el déficit fantasma del timeline.
- 🟡 **3.2 · N7 PARCIAL** — infraestructura lista: tabla clickup_scheduler_plantilla (dueño por rol + offset por lista) + v_tareas_huerfanas (alimenta el flujo propuesta→aprobación→clickup-execute existente). ⛔ NOTA (regla 7b): la PLANTILLA es config de negocio (qué dueño para qué lista) que debe llenar el CEO/operación — al llenarla, el flujo de propuestas la aplica en lote; el nacer-con-fecha requiere además un webhook de ClickUp (siguiente iteración).
- ✅ **3.3 · N5+N6+N9** — v_rent_roll (potencial vs realizada, gap $: Bethune $4,400/mes, Echo $3,600…; Garden Path ya no es el top — data fresca) + tabla en Analítica CC · ingreso por MODELO × mes de renta · ranking real por casa = P&L post-interés (FF) + NOI rank (CC).
- ✅ **3.4 · B16+O12+O13 (N8 especificado)** — insert de artefactos exige created_by=auth.uid() + área ⊆ allowed_areas del creador (ia_area_ok) · delete bloqueado · versionado (version+parent_id) · ia_audit_log INMUTABLE (solo insert) con trigger. 🟡 N8 (carril datos-lectura con conectores read-only whitelisted + artefactos con Design System): especificado como siguiente iteración — requiere diseño de producto del carril (gate de admin ya existe).
- ✅ **3.5 · N10+N11+N12** — C21 casa fantasma (encontró **Arcadia y Cervin** ✓, los casos exactos) · C14 top-20 con % del riesgo (comprobante requerido en form = config Airtable, acción humana) · v_disciplina_clickup + card en /operacion (higiene 50/al día 30/movimiento 20; peor: sin-dueño 911 tareas score 0).

## Cierre
- ✅ **Cierre · Gate de CI** — scripts/ci-gate.mjs (npm run ci:gate): (a) capa KPIs responde y es coherente (ocupación suma, margen 0–100), (b) property_id 100% + 20 aliases QBO, (c) guard-rails anti-$0 presentes, (d) espejo QBO fresco ≤30d + assets $7.67M + equity ≤ assets. **CORRIDO: 12/12 ✓**. ⚠ el re-sync QBO cambió "Total Assets"→"TOTAL ASSETS" (guard B2 y gate actualizados case-insensitive).

## MERGE A MAIN + DEPLOY (13-jul)
- Mergeado a main (bundle 35507bd74851) y verificado EN PROD con smoke headless: Global (capital/ocupación/cobranza operativa) + /contable (reconciliador, B2, C20, C21, espejo Refin $1,459,200) + FF Finanzas (ICR, déficit en hold, waterfall, equity panel, P&L por casa) — **17/17 · 0 pageerrors**.
- Fix post-deploy: v_pnl_casa reescrita con CTEs (migr 20260713200000) — la versión con 6 subqueries correlacionadas se iba a timeout bajo RLS con select * (el front recibía []).
- Gotcha de QA documentado: innerHTML serializa & → &amp; ("P&L" no matchea en el DOM; buscar por innerText).



## SCOPE B · OBSERVACIONES DEL CEO (13-jul, cerradas — commits por ítem en rebuild/os-audit-2026-07)
| Obs | ANTES | DESPUÉS (verificado contra fuente) |
|---|---|---|
| #8-#11 UW | Base = compra + rehab (Bethune legacy) · interés 6m fijo · tasa DSCR 7.5 en Calc 4 vs 7.125 en Calc 3 · payoff se re-pedía | **Base = compra + DRAW TOTAL** ($200,000+$135,080=$335,080 · 90% = **$301,572 exacto**, corrido contra el código real; modo legacy en ff_uw_config uw_base_modo) · interés del draw sobre **duración REAL calibrada (1.8m** de v_supuestos_calibrados, editable) · **una sola tasa HML (12%) y DSCR (7.125%/30a) para las 5 calcs**, visibles y editables inline con rótulos "HML · solo interés · durante obra" / "DSCR · 30a · amortizado" · payoff ⛓ fluye del deal (saldo HML Airtable, con chip de fuente) · goldens cash-out Michelle/Echo/Childress/Meadow intactos |
| #16 Portal inversor | portal sin resumen por casa; sin fecha de pago del déficit | **v_portal_inversor** (security_invoker sobre RPC inv_portal_resumen SECURITY DEFINER + inv_my_props) — por casa: invertido + hace cuánto · etapa/avance Planner · líder · flujo del último mes (billing_ym) · déficit desglosado (renta−gastos−interés HML, v_pnl_casa) + fecha estimada de pago (refi hecha ∣ inicio HML + holding calibrado) · próxima/última distribución (inv_distributions **ya existía** — 3 filas, verificado). **RLS probado en prod: inversionista QA = solo Dove ($25,400·13m·déficit $10,358.13 exacto) · viewer = 0 filas · anon = 401** |
| #20 Planner | tablero apretado bajo KPIs, tarjetas 8.5-11px | board **full-viewport**, KPIs/filtros **colapsables** (wp_kpis_open), columnas 220px con scroll propio, tarjetas 13.5px con líder visible; ruta crítica/alertas siempre visibles; cero lógica tocada |
| #19 Estimador | 17 tabs planos + 2 ocultos | nav **3 pasos Proyecto→Estimar→SOW** (19 tabs mapeados; Editor/Pronóstico/3-Estimaciones contiguos; Crew NO estaba vacío → sub-tab del grupo 3) + **proyecto activo compartido** (RM_ACTIVE + localStorage, restaurado al abrir) |
| #12+#14 CRM/rol | CRM sin onboarding; líderes solo productividad | guía colapsable "🧭 ¿qué hago acá?" (4 pasos, flujo CRM→propuesta→deal→portal) + **scorecard por líder**: cumple presupuesto/tiempo (rcFin/retraso_dias, sin dato = '—'), margen ponderado, 🔍 Qué revisar (peor obra + acción + dueño, patrón kitNext) |
| #24 IA N8 | spec en papel; ia_audit_log 0 filas | **carril datos-lectura FUNCIONAL**: ia_data_whitelist (6 vistas KPI) · edge fn ia-data (JWT del usuario → su RLS; solo select ≤500) · gate de admin EN DB (aprobado_por via RPC ia_aprobar_artifact) · front inyecta __IA_DATA__ al sandbox (el iframe jamás ve un token) · audit cableado: publicado/actualizado/aprobado/spec_*/datos_leidos. **E2E prod 9/9**: 403 sin OK → viewer no aprueba → admin aprueba → lee v_ocupacion 48/45 → fuera de whitelist 403 → RLS del usuario (viewer sin fix-flip ve nulls) |

Gate de CI post-Scope B: **12/12 ✓**. Gotcha nuevo: ia_artifacts tenía CHECK carril in (libre,ok) → extendido a 'datos'; RPC nueva = 404 hasta "notify pgrst, 'reload schema'".

### Deploy Scope B (13-jul)
- Mergeado a main (fast-forward, bundle 4227018da6a8) y verificado EN PROD con smoke headless: **15/15 · 0 pageerrors** (UW draw total+hold 1.8m+rótulos HML/DSCR+tasas inline · CRM guía · Estimador 3 pasos · Planner toggle KPIs · RC scorecard líderes · IA galería · portal 200) + **portal inversor con login QA real: 8/8** (Tus casas de un vistazo, Dove $25,400 · 13 meses · flujo últ. mes · déficit desglosado con interés HML · distribuciones · líder).


## FIX RLS ff_uw_config (14-jul, error del CEO "new row violates row-level security")
- Causa raíz: `ff_uw_config` SOLO tenía policies de SELECT — **ninguna escritura de la UI funcionó nunca** (aplicar $/sqft calibrado, hold, bias, tasas por zip, % de tax, recalibración ARV: todos los botones apCfgSet tiraban RLS). Migr `20260714140000`: insert/update para has_area(fix-flip), delete sigue bloqueado. Verificado: update 200 · insert key nueva 201 · viewer sin área 403.
- **Barrido completo del underwriting (smoke prod 9/9 · 0 pageerrors · 0 alerts de error)**: 6 tabs con hipotética vacía + con datos + casa real (Michelle) · ARV simple⇄experto · apCfgSet key existente y NUEVA · Calc 5 modelos · guardar. Escrituras del UW auditadas: ff_uw_config (fix), arv_calibracion ✓, ff_underwriting_analyses ✓ — todas con policy correcta.

## CALC 4 · PITI de la refi (14-jul): el pago mensual es el TOTAL PAYMENT — P&I + property tax mensual (2.1%/año del valor tasado, calibrado con los HUDs de Champions) + insurance/impound mensual (prima/12), desglosado con tax% y prima editables inline + Δ vs PITI real de Airtable. Verificado Michelle: 2,163 + 749 + 158.33 = **$3,070.33** vs real $3,032.26 (la misma calibración de los goldens). Smoke prod 6/6.

## CALC 1 · insurance + holding real + contingencia fija + FIX guardado (14-jul, pedido del CEO)
- **Estimador rápido: SUGERIDO (media)** entre el costo interno ($/sqft calibrado) y el de afuera ($110/sqft) + botón "→ usar" que lo pasa a costo real (1400 sqft media: 88,200 / 154,000 → sugerido **$121,100** ✓ prod). **Intereses SIEMPRE ajustables**: tasa HML editable también en Ajustes de Calc 1 (misma key que Calc 4) + monto MANUAL de intereses del draw (pisa el punto fijo, rotulado "MANUAL" con ↩ volver al calculado; draw/préstamo/payoff se recalculan con el manual). Smoke prod 6/6.
- **Insurance de la casa**: input mensual en Ajustes → insurance × meses de holding entra al draw (y por el punto fijo, al préstamo/interés/payoff). Config default `uw_insurance_mes`.
- **Meses HASTA RENTAR O VENDER** (antes "rentando hasta el refi"): obra + hasta rentar/vender = HOLDING, y el interés/utilities/insurance corren sobre ESA suma (el CEO: "esa suma es lo real que voy a pagar de intereses y tener de los draws") — ejemplo 3+2: interés = préstamo × 1% × 5 = $15,876 (antes solo obra ×3). Calc 4 muestra "Interés total del holding (5 m = obra 3 + hasta rentar/vender 2)" con ambos meses editables.
- **Contingencia FIJA** opcional (pisa el %): input en Ajustes; desglose rotula "Contingencia (FIJA)".
- **BUG del guardado (2 patas, cazado con instrumentación en prod)**: (1) el re-render inmediato del onchange DESTRUÍA el botón 💾 entre mousedown y mouseup → el click se perdía en silencio → render diferido 150ms + trigger delegado por pointerup; (2) el valor tipeado con el foco aún en el input no llegaba a commitear → flush en pointerdown del 💾 (inputs con value ≠ defaultValue → dispatch change ANTES del blur). **Verificado en prod 8/8**: tipear compra/insurance/contingencia y clickear 💾 sin blur → los 3 valores en UW.a.inputs Y en la base.

## % DEL HML SEPARADO: compra vs remodelación (14-jul, pedido del CEO)
- ANTES: un solo "% que financia" aplicado a toda la base → no modelaba la realidad (Harmony presta 90% de la compra y 100% de la remo). DESPUÉS: dos inputs en Calc 1 (`hml_pct_compra` 90 / `hml_pct_remo` 100 default) → **préstamo bruto = %compra×compra + %remo×draw** (punto fijo intacto).
- PROPAGACIÓN por la cadena (verificado en prod 6/6): interés del draw, payoff → Calc 3, base → Calc 4, Unificada — ejemplo 200k/100k/3m/2m: préstamo $309,168 · **down = solo 10% de la compra ($20,000)** · payoff/base4 = mismo número; editar % en vivo recalcula todo (100% compra → down $0, caso Bethune).
- Retro-compatibilidad AL CENTAVO: análisis guardados sin los campos nuevos usan hml_finance_pct legacy en ambos (guard en ffUwAbrir, mismo resultado que antes: $295,856.10 exacto). Goldens cash-out intactos.

## FICHA DE CASA · "Compra $0" con dato existente (14-jul)
| Qué | ANTES | DESPUÉS |
|---|---|---|
| Fila "Compra" del panel Fix & Flip | leía `m.ff.purchase` — campo INEXISTENTE (la columna es `purchase_price`) → $0/— en TODAS las fichas, no solo Charles | lee la cadena única `osFichaNums`: v_property_360.compra → deal.purchase_price — **Charles $247,000** ✔ |
| Tarjeta ALL-IN vs fila espejo | dos caminos distintos (p360.all_in vs compute local con rehab×1.3) — mismo dato, distinta info | **UNA cadena para tarjeta Y fila**: all-in = compra + Total Draws → compra + rehab REAL (rotulado "faltan draws") → compra + rehab ESTIMADA (rotulado) — Charles **$357,000** = 247,000 + rehab real 110,000 ✔ (el "Costo Remodelación Real" fld9VNYFBzFI3tRdc estaba mapeado en el sync y NUNCA guardado — 2º campo fantasma encontrado; ahora espejado en ff_deals.remodel_real) |
| Equity incorporado | p360.equity (rehab null → Charles daba $248,000 con rehab en 0 silencioso) | ARV − all-in de la MISMA cadena — Charles **$138,000** (495,000 − 357,000) ✔ · caveat "⚠ con datos incompletos" cuando faltan draws. **Deploy verificado EN PROD 7/7 · 0 pageerrors** (Charles 247,000/357,000×2/138,000 + barrido Capitol compra 200,000 · all-in compra+draws 263,750). Gotcha: el slug de la ficha es la DIRECCIÓN COMPLETA (3403-charles-street-austin-tx-78702) |
| Resto del panel (Remodelación/Holding/All-in/MAO) | mezcla de fuentes (est×1.3 proxy sin rotular; holding $0 sin draws) | Remodelación = draws → rehab real → estimada (SIEMPRE rotulado cuál es) · Holding "—" si no hay draws · MAO sobre la misma base · Appraisal/Cash-out/HML "—" solo cuando el dato NO existe (Charles ✔) |

## CC FIX & FLIP REDISEÑADO (14-jul — patrimonio real + déficit correcto)
| Qué | ANTES | DESPUÉS (verificado contra Airtable vivo) |
|---|---|---|
| Bloque superior | "Capital del Holding" (no le decía nada al CEO) + all-in como capital | **VALOR DEL PORTAFOLIO $9,415,000 (23 casas)** — cuadre exacto: $11,450,000 (28) − $1,300,000 operador (Arthur/Bitter/Charles) − $735,000 vendidas (Arcadia/Slaughter) · **EQUITY $4,435,350** (valor − deuda) · **DEUDA $4,979,650** (refi>0→refi, si no HML; drill por casa + reconcile QBO $5,974,414 con Δ visible) · **RENDIMIENTO: operativo +$179,289/año · después de deuda −$363,406/año** (los dos, honesto: el carry HML se come el flujo — pago = hml_payment + ref30_payment, EXACTO al número del CEO) + yield del equity |
| Conteos | deals activos/flip/hold | **23 hechas · 5 entregadas al inversionista · 23 en portafolio (19 renta · 2 rehab · 2 adquiridas)** — todos exactos |
| Regla del portafolio | no existía | modelo_negocio ≠ Operador Y stage ≠ vendida, en la capa de vistas (v_ff_portafolio/_kpi, security_invoker, property_id) — espejo extendido: modelo_negocio (flddjD6WsvC98sM1k) + estrategia completa (fldyijwnFRD2yFrx5) + draws_menos_deficit (fldL4iMolqEibENFj), sync v13 corrido 28/28 |
| Déficit por casa | dr.net_total (campo equivocado) → Wellington −$130k FALSO, Charles −$110k FALSO | **[Total Draws − Déficit Total] − Down Payment** (la fórmula del CEO): Capitol = −30,463.76 − 7,500 = **−$37,963.76 exacto** · GUARDRAIL: draws=0 con obra → "⚠ faltan draws" (Wellington/Charles/Slaughter/Harvest + 3 más = 7 casas), EXCLUIDAS del acumulado (**−$289,188** corregido) |
| Pipeline + Propiedades | "HOLD" recortado · all-in compra+rehab+holding · vendidas mezcladas | estrategia PALABRA COMPLETA ("Fix and hold") · **all-in = compra + Total Draws** (fallback compra+rehab ROTULADO *rehab) · badges Operador/Vendida atenuadas (siguen visibles, NO cuentan en totales) |

**Deploy verificado EN PROD** (smoke 13/13 · 0 pageerrors): los 4 KPIs con los números exactos del CEO + conteos + déficit corregido −$289,188 + estrategia completa + ⚠ faltan draws + badges Operador/Vendida. Gotcha QA: /fix-and-flip es la página de EMPRESA (cards) — el CC se abre por ruta de app (/fix-and-flip/underwriting) + ffGo(seccion).

## CALCS ENCADENADAS (14-jul, rama feat/calcs-encadenadas — "cuánto presta el HML → payoff → refi")
| Qué | ANTES | DESPUÉS (verificado corriendo el código real: compra $200,000 · remod $100,000 · obra 3 m · renta 2 m) |
|---|---|---|
| Base del HML | **3 bases para el MISMO deal**: Calc 1 $291,780 (compra+draw ×90%) · Calc 4 $280,000 (compra×90%+remod) · mismo dato, distinta info | **UNA base**: préstamo bruto = %fin × (compra + DRAW TOTAL), resuelta por PUNTO FIJO (el interés del draw corre sobre el préstamo y converge en 2-3 vueltas) → **$295,856 idéntico en Calc 1 y Calc 4** |
| Del Negocio | terminaba en "el inversionista pone" | + **EL HARD MONEY TE PRESTA**: bruto $295,856 − puntos 1.5% ($4,438) − fees lender ($2,990) = **desembolso neto $288,428** · + **PAYOFF DEL HML**: principal + capitalizados (editable) = **$295,856** — dos números DISTINTOS, visibles |
| Payoff → Cash-Out | input manual = 0 → cash-out $293,216 que no significaba NADA | se auto-llena ⛓ desde Del Negocio (fuente visible; override manual con "↩ volver al calculado") → **cash-out = 311,830 − 295,856 − 18,614 = −$2,640** (honesto: este deal no recupera por refi) |
| Obra vs renta | UN solo "meses de hold" (5m) — el interés del HML corría los 5 meses = carry INFLADO | **meses_obra (3) + meses_renta (2) = hold (5, derivado)**; interés HML = base × tasa × **meses_OBRA** ($8,876 = 295,856×1%×3, no ×5 = $14,793 inflado −40%); utilities sí corren el hold; deals reales: obra = meses cubiertos, renta = hueco (ff_draws) |
| Intereses | base propia + solo el mensual | préstamo bruto ⛓ (misma base) · interés mensual $2,959 · **interés TOTAL de la obra $8,876 (el carry real)** · refi $311,830 @ 7.125%/30a → **P&I $2,101** · tasas + meses de obra editables inline → se reflejan en TODAS las calcs |
| Legacy | — | análisis guardados con meses_hold viejo NO cambian (obra=hold, renta=0); goldens cash-out Michelle/Echo/Childress/Meadow EXACTOS |

## ARV CERTERO (13-jul, rama feat/arv-certero — directiva: error MEDIBLE contra tasaciones reales)
Disparador: Cervin dio \$415,773 con 3 camas (RentCast/condado) cuando tiene 4 — Zillow \$471,900, assessed \$486,691.

| Qué | ANTES | DESPUÉS (medido) |
|---|---|---|
| **Back-test motor vs tasaciones reales** | el motor NUNCA se había corrido contra la historia (la 'calibración' comparaba ARV Airtable vs appraisal, no el motor); corrido: **MdAPE 9.0% · sesgo −7.6%** | **MdAPE 4.9% · sesgo −1.6%** sobre las 12 casas con 'Valuación por el Appraisal' (excl. las 4 del CEO) — **META ≤6%/±2% ✅**, con Dove (−20%) y Childress (−12.9%) ADENTRO como outliers honestos (tasaciones DSCR income-infladas que ni el AVM alcanza: −18/−22%) |
| Subject | 1 fuente (RentCast) usada en silencio — Dove/Childress figuran con 1 CAMA en el condado y el filtro mataba 14/20 comps | saneo automático (dato implausible = DUDOSO, null) + conflictos multi-fuente (RentCast vs Airtable vs manual) + **gate PROVISIONAL**: el ARV se muestra atenuado con chips '⚠ camas: 3 (RentCast) — ✓ usar 3 / ✓ usar 4 / otro' hasta que el humano confirma |
| Selección de comps | 0.8mi/12m/±25% · si nada pasaba → 0 comps y silencio | filtros de tasador **1mi/6m/±15%/±1cama/mismo tipo** + outliers MAD fuera (declarados) + **expansión adaptativa** (6→9→12m) con confianza capada y aviso |
| ARV | promedio ponderado 1/(gross+2) | **mediana ponderada** (similitud × recencia × cercanía) — jamás promedio crudo |
| Confianza | adjetivo por reglas | **medida**: score 0-100 (CV/n/recencia/distancia/gross) + rango **P25–P75 real** de los comps ajustados |
| Triangulación | no existía | panel Comps · AVM RentCast · **assessed × 1.235 (factor calibrado, n=12)** · tasación previa · ARV Airtable — divergencia >8% = ⚠ con la razón probable (ej. 'camas en conflicto') |
| Calibración | bias global manual sugerido | \`calibrar()\` por coordenadas (GLA \$/sqft, cuarto, baño, año, tendencia, MAD-k) + **sesgo por SUBMERCADO** (78745 +4.4% n=3 · 78664 +12% n=2 · Marlin −1.6% n=2) + bias global con restricción de sesgo. Corrida persistida en \`arv_calibracion\` + \`v_arv_calibracion\` → la UI muestra '🎯 precisión ±4.9% sobre 12 casas' + botón ♻ recalibrar (auto-nudge al cerrar casa nueva) |
| **Cervin (disparador)** | \$415,773 (3 camas, comps flojos) | con 4 camas confirmadas: **\$457,541 (P25–P75 457–487k)** — dentro de la evidencia ~460–480k SIN forzar; con 3 camas ya da 449k por la mejor reconciliación; el gate marca 'camas: una sola fuente — confirmá' |

Un solo motor (\`pm/ff-arv-engine.js\` UMD) para Simple, Experto y back-test (\`scripts/arv-backtest.mjs\`). Params calibrados: GLA \$70/sqft · cuarto \$8k · baño \$12.5k · año 0.35%/a · lote \$3/sqft · MAD-k 3 · bias +3% + submercados. Cuota RentCast: 30/50 usadas (cache 30d). ⚠ Caveats declarados: n=12 (riesgo de sobreajuste, mitigado con MdAPE robusto + submercados solo n≥2); comps actuales vs tasaciones pasadas (sin fecha de appraisal espejada); assessed factor calibrado sobre refis DSCR.

## RE-AUDITORÍA 28 DIMENSIONES (13-jul, medida contra data viva)
| # | Dimensión | ANTES (auditoría) | DESPUÉS (medido hoy) | ✓ |
|---|---|---|---|---|
| 1 | Capital desplegado | $7.83M/$8.37M (deuda como capital) | equity $963,597.63 + deuda $4,515,214 separadas | ✅ |
| 2 | Equity en libros | espejo stale $728,361 | $763,361 = QBO vivo | ✅ |
| 3 | Ganancia | "EBITDA −$453,456" falso | Net Income QBO YTD $46,102.99 (exacto al vivo) | ✅ |
| 4 | Net Income fantasma | $1,067,530 inexistente | eliminado; no reproducible | ✅ |
| 5 | Déficit mal rotulado | "Rentabilidad draws −$320,230" | "Déficit de capital en hold (a recuperar)" | ✅ |
| 6 | Motor conciliación | $8.3M sin conciliar > assets | C1–C3 neteado + guard ≤ $7,669,529 (motor en error si viola) | ✅ |
| 7 | Espejo HML-Refin | Δ −$238,500 | $1,459,200 = QBO vivo · as_of 13-jul | ✅ |
| 8 | Ocupación | 4 valores distintos, 30/34 congelado | 48/45/3/0 = 93.75% única (= PDF equipo) | ✅ |
| 9 | Estados canónicos | libres incluía mantenimiento | disponibles=0 sin mantenimiento | ✅ |
| 10 | Conteo de obras | 31 (Estimador+dupes) · avance 91% legacy | 26/7 · avance solo Planner | ✅ |
| 11 | Utilidad realizada | inconsistente | $170,682 exacto en capa KPIs | ✅ |
| 12 | Rentabilidad | "0.2%" y Stonleigh 322% | 11.6% ponderado (excl. denominador ≤0) | ✅ |
| 13 | Ficha (Wellington) | "déficit −$130k" | equity +$200,000 (déficit hold secundario) | ✅ |
| 14 | Reporte de obra | "$0 🔴 PÉRDIDA" en curso | proyectada = valor−gasto + badge en curso | ✅ |
| 15 | Identidad nómina | re-match texto libre | por LINK: 3,433/3,436 filas · 149/149 grupos | ✅ |
| 16 | Tarifas nómina | 177 sin rate | 0 (lookup del link) | ✅ |
| 17 | Deudas nómina | 172 negativas | 0 · sobrepago $133,902 visible aparte | ✅ |
| 18 | Interés HML | invisible en P&L | $141,907 YTD = 66% ingreso · ICR 0.28× al tope + por casa | ✅ |
| 19 | Puente de ganancias | 3 números, 30× gap | waterfall único con residuo declarado | ✅ |
| 20 | Equity incorporado | tapado por cifras infladas | panel $2,852,652 (casas con obra) + ranking/drill | ✅ |
| 21 | Llave property_id | strings sucios entre 4 fuentes | 175 aliases · QBO 20/20 · joins por id | ✅ |
| 22 | Ghosts | rec vacío + 6 units + dupes | 0 · 0 · 0 | ✅ |
| 23 | Legacy en silencio | manual ≠ rollup sin alertar | 4 divergencias ALERTADAS (C19) | ✅ |
| 24 | $0 sobre vacío | ✅ sobre vacío en varias pantallas | guard-rails (kitMoney null='—', noZeroAsReal) + gate (c) | ✅ |
| 25 | Dato→decisión | EVM aislado en 1/50 pantallas | glosario 24 términos + Term/Drill/NextAction replicado | ✅ |
| 26 | Ruido de anomalías | 2,927 crudas sin priorizar | grupos por $ + **plantilla N7 LLENADA (13-jul)**: 30 reglas data-driven (dueño = asignado real más frecuente por lista) → 1,404/1,411 huérfanas (99.5%) con dueño+vencimiento sugeridos, card en /operacion; se aplican vía propuesta→OK humano→ClickUp | ✅ |
| 27 | Supuestos | $28/sqft · 12m soñados | $53/sqft real (19 obras) · obra 1.8m · holding 4.6m, aplicables 1-clic | ✅ |
| 28 | Gobernanza IA | viewer publicó cross-área, sin audit | área⊆allowed_areas + created_by + versionado + audit inmutable + **N8 carril datos FUNCIONAL** (whitelist 6 vistas · gate admin en DB · RLS del usuario · audit vivo) | ✅ |

**Score ronda 1: 26 ✅ · 2 🟡.** (rondas 2-3 abajo) Verificación adicional: smoke prod 17/17 · gate CI 12/12 · rent-roll vivo (Bethune gap $4,400/mes) · fantasmas Arcadia/Cervin detectadas solas.


### RE-AUDITORÍA ronda 2 (13-jul, post-Scope B — medida contra data viva)
**Score: 27 ✅ · 1 🟡** (solo queda #26: las ~2,934 anomalías crudas esperan la plantilla N7 — acción humana).
- Núcleo INTACTO tras Scope B (ningún KPI se movió): equity $963,597.63 · deuda $4,515,214 · Net Income YTD $46,102.99 · assets $7,669,529 · Refin $1,459,200 as_of 13-jul · ocupación 48/45/3/0 = 93.75% · obras 26/7 · utilidad $170,682 · margen 11.6% · Wellington +$200,000 · nómina 0 sin rate / 0 deudas neg · interés YTD $141,907 (66% del ingreso) · equity incorporado $2,852,652 · 175 aliases (QBO 20) · ghosts 0/0/0 · divergencias 4 · fantasmas Arcadia/Cervin · supuestos $53/sqft·1.8m·4.6m.
- **#28 → ✅**: ia_audit_log pasó de 0 a 6 eventos reales (publicado/actualizado/aprobado/datos_leidos×2), whitelist 6 vistas activa, check de carril incluye 'datos', gate de admin probado E2E en prod.
- Capacidades nuevas medidas: v_portal_inversor + RPC en prod (RLS: inversionista=1 casa, viewer=0, anon=401) · uw_base_modo='draw' en config · gate CI 12/12.
- Dato honesto: inv_distributions tiene 3 filas pero 0 activas (demo soft-deleted) — el portal muestra 'sin distribuciones programadas', correcto; se llena cuando se registre la primera real.


### Cierre #26 · plantilla N7 llenada (13-jul — Score final: 28 ✅ · 0 🟡)
- clickup_scheduler_plantilla: **30 reglas** — dueño por lista = ASIGNADO REAL más frecuente en ClickUp (Juan Manuel Sanchez fix-flip/HML/venta · Michell Yanes etapas/documentación · Carlos Vasquez rentas/cobros/check-in · Daniel Lara contratos · CEO plan del OS) + días por criticidad (cobranza/check-in/refi/cierre 3-5d · resto 7d · plan interno 14d). Editable en DB (RLS operacion).
- **Cobertura: 1,404/1,411 huérfanas (99.5%)** con dueño+vencimiento sugeridos; único resto honesto: 'List' (7 tareas, lista sin nombre real — corregir en ClickUp). Fix de bug latente: patrones solapados ('Entrega' ⊂ 'Pre-Entrega') duplicaban filas → v_tareas_huerfanas ahora elige el patrón MÁS LARGO (lateral, fan-out verificado = 0).
- v_huerfanas_resumen + card en /operacion (junto al índice de disciplina): total, % cubierto, top listas con dueño → días, y lo sin-cubrir declarado. Verificada EN PROD (bundle ea35344cb178): '1,411 huérfanas · dueños sugeridos visibles · List sin plantilla'.
- Aplicación = flujo existente propuesta → OK humano → clickup-execute (nada se asigna solo); el nacer-con-fecha vía webhook sigue como mejora futura, pero la CURA DE ORIGEN (quién y cuándo por default) quedó definida y operativa.

## ANTES → DESPUÉS (verificado contra fuente)
- Capital: "$7.83M/$8.37M desplegado" → equity $963,598 [Airtable] / $763,361 [QBO] + deuda separada.
- Ganancia: 3 números con 30× de gap → Net Income QBO YTD único + waterfall con residuo declarado.
- Espejo QBO: Investor Contributions y HML-Refin stale → = QBO vivo, as_of 13-jul.
- Ocupación: 4 valores distintos → 48/45/3/0 = 93.75% en todas las pantallas (= PDF del equipo).
- Obras: 91%/31 fantasma → 26/7, utilidad $170,682, margen 11.6% ponderado.
- Wellington: "déficit −$130k" → equity +$200,000 (déficit en hold como secundario honesto).
- Nómina: texto libre, 177 sin tarifa, 172 deudas negativas → por LINK (3,433/3,436), 0 y 0.
- Interés HML: invisible → 68% del ingreso · ICR 0.35× al tope en rojo + por casa en el P&L.
- Anomalías: 2,927 crudas → grupos accionables priorizados por $.
- Fantasmas: Arcadia/Cervin detectadas solas (C21); ghost F&F y units vacías fuera de conteos.

## MÓDULO INVERSIONISTAS REHECHO (14-jul — ranking por capital desplegado, obs CEO "el módulo actual no sirve")
| Qué | ANTES | DESPUÉS (verificado contra Airtable vivo) |
|---|---|---|
| Contenido del módulo | CRM plano (21 filas con rangos VIP/Blanco/Azul/Amarillo), "Capital del holding", KPI "Con socio"/"Contratos sin firmar" (—), 4 modelos con "✎ Generar propuesta" que mandaba al Cerebro, cap table paramétrica con aporte "típico" inventado (all-in/deals) | **LISTA de co-inversionistas ACTIVOS** rankeada de mayor a menor (capital desplegado, desempate nº casas) — todo lo demás se quitó; el generador de propuesta va al BACKLOG (INV-1) como modelo real fuera del Cerebro |
| Quién entra | todos los del CRM (incluía comprados, operadores y la propia empresa) | **participación viva**: 0 < ownership nuestro < 100% (Porcentaje de Owner Ship flddh8bS7oP34ak1M). Ownership 100% = les compramos su parte → fuera (Valeria, Caldas×2, Yeisson, Yeison, Diego, Flipping Rentals). Ownership 0 = operador → fuera, va en su módulo (Hitalo, Mirna, MEK/Charles, Jefferson/Harvest, Camilo). Vendidas con sociedad = **salida realizada** (se listan, no suman): Ivy · 1109 Arcadia |
| Capital | `capital_inversionista` coalesced ("Capital del inversionista" ?? aportado) — Stonleigh daba 45,000 | **`capital_aportado` PURO** (fldrePoqg3C3caiZ5, sync v14 + col nueva) — Stonleigh **35,000** ✔ |
| Ranking (data viva) | — | **Jefferson $188,000/4 · MEK $112,870.14/2 · Ivy $77,000/1+1 salida · Michael $43,000 · Jessica $35,968 · Ronald/Johanna/Cesar/Héctor $35,000 · Kysbel $34,708 · Daniel $23,200 — TOTAL $654,746.14 · 11 inversionistas · 16 casas EXACTO** al esperado del CEO |
| Rentabilidad | no existía | honesta desde `v_inversionistas` (security_invoker): rentada = participación × (renta − gastos) × 12 ÷ capital · vendida = utilidad entregada ÷ capital · sin renta/gastos = **"pendiente de dato"** (MEK: 2 casas s/dato), jamás $0. Detalle por casa: capital · % participación (1 − ownership) · etapa · flujo anual de su parte |

---

## 14-jul · Calc 4 Intereses = DOS MODELITOS SEPARADOS (obs del CEO, rama feat/calcs-encadenadas)

**Pedido:** la calc de Intereses en dos modelitos distintos, en dos lugares distintos — (1) Harmony/HML y (2) Refinanciación/DSCR — cada uno con SU pago mensual, sin re-teclear datos que ya viven en otras calcs.

### ANTES → DESPUÉS
- **UI**: una sola vista con hero del DSCR + tarjeta de inputs que RE-PEDÍA compra y % financia + un desglose que mezclaba HML y REFI en la misma tarjeta → **dos modelitos separados**: tarjeta 1 "🔨 Pago mensual al Harmony" (hero ámbar, etiqueta *HML · solo interés · durante la obra/hold*) y tarjeta 2 "🏦 Pago mensual de la refi" (hero azul, etiqueta *DSCR · refinanciación · amortizado*), cada una con su base, sus inputs y su nota de propagación + cierre "por qué son dos" (dos préstamos, dos bases, dos fórmulas).
- **Pago mensual HML**: redondeado a dólares ($2,959) → **con centavos** = préstamo × tasa/12 exacto (**$295,856 @12% → $2,958.56/mes**, verificado con el código real en node). El pago NO depende de los meses (probado: con 5 o 10 meses da idéntico); los meses (editables, estimado) solo mueven el **interés total del hold** ($2,958.56 × 5 = $14,792.80 exacto).
- **Inputs**: compra y % financia re-tecleados en Calc 4 → **eliminados de la vista** (viven en Calc 1; la base llega ⛓ por `negocio.prestamo`). Quedan editables inline solo lo propio del modelito: tasa HML + meses (M1) · tasa DSCR + plazo + préstamo override (M2, mismo `refi_prestamo_real` que ya mandaba en Cash-Out).
- **Base del refi**: rótulo fijo "75% × ARV" → **declara la fuente real ⛓ Cash-Out**: LTV% × (tasación del refi | ARV) o "tope DSCR — la renta manda" u override; verificado en cadena: ARV 449,297 → Cash-Out préstamo 336,973 → Calc 4 lee el MISMO número → **$2,270/mes @7.125%/30a** exacto.
- **Propagación nueva**: el pago HML no llegaba al Ingreso → **Calc 5 (modelos + fallback) muestra "⏳ Durante el hold"**: mismo flujo pero pagando el HML ⛓ en vez de la cuota DSCR (antes del refi la casa paga el hard money). Las demás cadenas ya existían y quedan intactas: interés total → reserva del draw (Calc 1)/déficit · cuota DSCR → flujo post-refi (Calc 5) · préstamo refi → cash-out (Calc 3) · Analítica del portafolio usa pagos REALES (hml_payment + ref30_payment del CC FF).

### Verificación
- `scratchpad/verify-intereses.mjs` (corre el código REAL): 6/6 ✅ — 2,958.56 · 14,792.80 · invariancia a meses · 2,270 · cadena ARV→Cash-Out→Intereses sin re-cálculo.
- Goldens `scripts/test-uw-cashout.mjs`: Michelle/Echo/Childress/Meadow **exactos** (sin cambios).
- `npm run ci:gate`: **12/12 ✓** · `node --check` OK en los 2 archivos tocados.

Commits: `04dde2c` (Calc 4 dos modelitos) · siguiente (propagación hold en Calc 5).

## ANALÍTICA FF — MÉTRICAS QUE SÍ SIRVEN (13-jul, main — rediseño pedido por el CEO)

Módulo nuevo `pm/ff-analitica.js` (ffSecAnalitica delega; fallback = vista vieja). KPIs desde capa v_* + espejo ff_*; cada KPI con drill "de dónde sale" (kitDrill) y NextAction donde aplica; sin $0/rojo sobre vacío (kitKpi.falta / noZeroAsReal). Espejo extendido: campos de VENTA de "Datos por casa" → ff_hml_loans (migr `20260713110000`, sync v13) + `fecha_ref30` al select de ffLoadAll.

| Qué | ANTES | DESPUÉS (verificado corriendo el código real, QA headless 12/12) |
| --- | --- | --- |
| Contenido | equity potencial + tablas por zona/modelo/inversionista (nada accionable) | 7 secciones: volumen+ritmo · rentabilidad realizada · renta op vs post-deuda · patrimonio · proyección · velocidad · salud/riesgo |
| Volumen | no existía | 28 operaciones (19 renta = 15+4 refi · 2 rehab · 5 adquiridas · 2 vendidas) + ritmo 1.5/mes histórico (3/6/12m) + chart por mes [close_date fldG2SABUD5Ptcuj8] |
| Vendidas | no existía | Arcadia $615,000 / bruta $110,653 / **NETA $11,928 / ROI 7.0%** · Slaughter "🟡 faltan datos" (jamás $0) + lectura: **el negocio hoy es HOLD, no flip** |
| Renta | no existía | flujo OPERATIVO **+$179,289/año** vs DESPUÉS de deuda **−$363,406/año** (carry $542,696 = HML 357,431 + ref30 65,277+119,988) · yield op 5.2% · CoC −37.7% · refi 4/19 |
| Patrimonio | no existía | valor **$9,415,000** (Σ ARV 23 propias — excluye 3 "Prestación de Servicios como Operador": Charles/Arthur Stiles/Bitter Creek) − deuda QBO **$5,974,414** = equity **$3,440,586** → multiplicador **3.6×** sobre $963,598 |
| Proyección | 1 deal elegido en UW | portafolio completo 5/10/15/20a, slider 2–6% (default 4% en ff_uw_config.an_apreciacion_pct), equity proyectado con amortización DSCR, rotulado SUPUESTO + chart |
| Velocidad | no existía | obra 55d/1.8m (v_supuestos_calibrados; crudo Datos por casa 57d n=19 ✓ valida) · hasta refi 194d (n=2, honesto) · 83% en presupuesto · 100% a tiempo vs plazo HML |
| Riesgo | no existía | pipeline refi: 15 en HML con ARV/saldo/tope 75%/semáforo/NextAction por fila · concentración: Jefferson 28.7% > umbral 25% en rojo (co-inversión $654,746) · salud: buckets sanas/déficit/sin datos/obra clickeables (déficit = flujo post-deuda por casa, jamás draws) |

QA: claro/oscuro + desktop/móvil (sonda solo marca los 🟡 de "falta" — deliberados) · 0 pageerrors · drill/slider/buckets probados · `ci:gate` **12/12 ✓**.
