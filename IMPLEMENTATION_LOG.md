# IMPLEMENTATION_LOG — Auditoría Maestra 2026-07-13

Rama `rebuild/os-audit-2026-07` · un commit por ítem · verificación contra fuente antes de commitear.
Estados: ⬜ pendiente · 🔄 en curso · ✅ hecho · ⛔ bloqueado (con nota).

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
