# Hallazgos de los 5 agentes expertos (análisis del código clonado)
Cada uno con archivo/línea. Priorizado P0 (bloqueante/seguridad) · P1 · P2. Estos alimentan los prompts finales.

═══════════════════════════════════════
## A · ARQUITECTURA WEB / SEGURIDAD / DEPLOY
═══════════════════════════════════════
P0-SEG-1 · Edge Functions de ESCRITURA sin auth + CORS "*" (bypass de RLS). update-airtable-record, pm-payment-writeback, remodel-nomina-writeback, clickup-writeback, sync-*-airtable usan SERVICE_ROLE_KEY sin requireAuth y con Allow-Origin:"*". Cualquiera con la anon key puede mutar. FIX: requireAuth(req) (+requireAdmin en writebacks) al inicio + whitelist de orígenes (ya existe en invite-user/_shared/auth.ts). CRÍTICO.
P0-SEG-2 · Funciones IA/costo abiertas (ai-deep-analyze, compute-insights, get-market-prices, rentcast) sin auth → abuso de cuota Anthropic/RentCast. FIX: requireAuth + rate-limit por user_id.
P0-DEPLOY-3 · DOS proyectos Vercel: empresa-os (prod viejo ← main) y empresa-os-admin (rama). El CEO mira empresa-os → ve bugs ya arreglados en la rama (ej. SVG). FIX: consolidar en UN proyecto, mergear rama→main, dominio prod apunta a main, el otro a Preview. Añadir badge de commit/branch visible en la UI.
P0-BUG-4 · SVG crudo en /rentas/property-manager: el markup NO existe en la rama (grep 0 resultados) → es el prod VIEJO. Causa del "texto": los slots de label/breadcrumb escapan input (OS_E en os.js:11, pmBreadcrumb en pm/pm-main.js:667); si les pasan markup de ícono <svg> en vez de emoji, sale &lt;svg… literal. FIX: (a) íconos nunca por slot escapado; (b) redeploy de la rama al dominio que ve el CEO (P0-DEPLOY-3).
P1-ARQ-5 · Archivos monolíticos: pm/pm-main.js 533KB, inv-admin.js 173KB, os.js 154KB, app.js 162KB, en scope global (window.*) → colisiones de globals (ya hay ReferenceError latente 'active'). FIX: modularizar (ES modules), empezar por pm-main.
P1-ARQ-6 · Re-render por innerHTML total en cada interacción (pmRender reescribe #pm-root) → frágil/costoso. FIX: render por sección.
P1-SEG-7 · Correr get_advisors y confirmar RLS ENABLED en todas las tablas sensibles (profiles, pm_payments, inv_*, edu_*). security-hardening.sql existe → verificar aplicada en prod.
P1-8 · Un solo helper esc() (hoy conviven OS_E, .replace inline, window.esc) → riesgo XSS almacenado si Airtable trae <script>. Lint que prohíba interpolar sin esc en innerHTML.

═══════════════════════════════════════
## B · RENTAS / PROPERTY MANAGER (integridad de datos)
═══════════════════════════════════════
P0-1 · pm_units inflada 98 vs 51 real: pm-main.js:169 carga pm_units.select('*') SIN .eq('is_active',true) (command-center.js:259 sí filtra → por eso cada vista da otro número). Además el dedupe legacy solo existe dentro de la tarjeta (pm-main.js:1419-1430), no en los conteos globales (pmUnitsOf:276, pmTotalRentableUnits:363). FIX: filtrar is_active en la carga + extraer pmDedupeUnits() global. Meta: 51 físicas / 36 rentables consistentes.
P0-2 · Ocupación desde STATUS (desactualizado), no desde reservas: pmUnitOccupied:305 → pmUnitState:1231 lee pm_units.status (las 75 infladas). FIX: reescribir a pmActiveBookingOf(u.id):294 (start≤hoy≤end). Regenerar status desde bookings en batch, no como fuente.
P0-3 · Ocupación con denominador único: fijar ocupación efectiva=(ocupadas+reservadas)/51 en :5279, pmOccupancyOf:314 y Disponibilidad → dar 76.5% en todas (hoy 73%/80%/83%).
P0-4 · Gastos Operativos $0: pm-main.js:4611 filtra category==='operational' (solo 6 filas de nómina, sin billing_ym). Los opex reales (Servicios públicos $34k, Aseo $17k, Manto $3.8k) son category='house'. Y Finanzas usa OTRA lógica (pmFinAgg:5095-5116, regex sobre subcategory) → nunca cuadran. FIX: UN clasificador pmExpenseBucket(e) (opex/deuda/inversión/corporativo) usado por Operativos, Por Casa y Finanzas. NOI = ingresos − opex real (margen ≠ 100%).
P0-5 · 6 filas de nómina sin período (Nicolás Sánchez, Gasolina, Daniel Lara, Cenas/Reuniones, Taxes $9,270): pmBillYm:414 devuelve '' → no caen en ningún mes. FIX: asignar billing_ym/expense_date en Airtable.
P1-6 · "Reserva activa" tiene 3 semánticas: pmActiveBookings:505 (incluye futuras=39/40), Resumen:1207 (solo status=80), pmActiveBookingOf:294 (vigente hoy). FIX: pmActiveBookingOf = única "activa hoy"; renombrar la de :505.
P1-7 · Inquilino activo = pmActiveBookings().length (incluye futuras) en :715,:3572 → 37/40. FIX: contar solo con reserva vigente hoy → cuadra con 38 ocupadas de Carlos.
P2-8 · Test de invariante de reconciliación: fallar si ocupadas difieren entre vistas, Σopex(Gastos)≠opex(Finanzas), o libres+ocupadas+reservadas+mant+inhab≠51.
REGLA DE ORO: una función por concepto (pmActiveBookingOf, pmRentableInventory, pmExpenseBucket, pmOccupancyEff) y que TODAS las vistas la llamen.

═══════════════════════════════════════
## C · PORTAL DEL INVERSOR (correctitud financiera)
═══════════════════════════════════════
P0-1 · Salud financiera usa renta MODELADA (ff_deals), no cobrada (pm_payments): base() en inv-escenarios.js:196, arriendoPleno en inv-engine.js:63. El mismo portal muestra dos rentas (Flujo Mensual usa real, Analizador usa modelo). FIX: NOI/DSCR/CoC con renta real (SUM pm_payments trailing-12) + opex real (pm_expenses). La modelada solo para proyección, etiquetada.
P0-2 · XIRR del Panel Global anualiza holds <1año: portfolio() en inv-indicadores.js:87-113 NO excluye holds cortos (casa() sí, invRend.portafolio() sí). "XIRR solo compra 147.2%" es markup. FIX: aplicar regla A1 en portfolio().
P0-3 · Déficit: 3 definiciones en la misma casa (rc.deficit en :809; fases.fase0.deficitMax en :606,625,916). FIX: una sola fuente (ff_deals.deficit_total); renombrar el del ciclo a "cash usado del ciclo (modelo)".
P1-4 · Horizontes NO unificados: 4/6/8 (inv-engine.js:229, inv-admin.js:396,416, inv-portal.js:736) vs 3/5/8 (inv-admin.js:1573+, inv-portal.js:834). Un inversor ve 3/5/8 y 4/6/8 en la misma casa. FIX: constante única HORIZONTES (lockear 1/3/5/8 o el que el CEO elija).
P1-5 · El fix de servicio de deuda depende de que la RPC inv_ledger etiquete subcategoria='servicio_deuda' en cada fila de ff_hml_payments (y NO en draws/cash-out). Verificar en SQL + test que sume y cuadre.
P2-6 · Apreciación anualizada mezcla plusvalía de mercado con valor forzado por rehab (inv-indicadores.js:59 usa ARV/compra) → 1697.9%. FIX: separar valorCreado (ARV−all-in) de apreciación de mercado, etiquetar.
P2-7 · Indicadores antes que datos reales (Item 19): mover el set calculado al final; renderCasaSimple:888 ya está bien.
Nota: el hilo dominante es renta/opex reales (P0-1/6). Arreglado, se caen las "recomendaciones vender/refi a todas".

═══════════════════════════════════════
## D · FIX&FLIP / HOLDING (déficit, deuda, salud por casa)
═══════════════════════════════════════
P0-1 · Déficit = 4 fórmulas con signos opuestos: (A) os-dash.js:162 Σff_deals.deficit_total $297,690 (+); (B) os.js:395 ff_draws.net_total por casa (−, ej. Capitol −$37,964); (C) os-cierre-engine.js:94 interés+extensión; (D) ff-command-center.js "draws−gastos−downpayment" −$144,188 (archivo NO está en /tmp/eo — incluirlo). FIX: fuente única = ff_deals.deficit_total (Airtable); prohibir recalcular.
P0-2 · Signo invertido: os-dash.js:189 rojo si déficit>0; os.js:377,755 tratan déficit<0. FIX: una convención (déficit = magnitud positiva de caja atrapada).
P0-3 · Per-casa usa net_total del draw, no el campo Airtable → Capitol app −$37,964 vs Airtable 0. FIX: deficit = ff_deals.deficit_total.
P0-4 · "Faltan draws" con remodel_real cargado (os.js:742): ya usa remodel_real pero marca ámbar "faltan". FIX: si remodel_real>0, all-in válido → quitar flag; "faltan" solo si NO hay draws NI remodel_real.
P1-5 · Deuda Airtable $4.98M (Σff_hml_loans.monto_hml) vs QBO $5.97M: falta sumar refi (monto_prestamo_refi) + draws desembolsados + intereses capitalizados. FIX: deuda OS = HML vivo + refi + draws; desglosar el Δ; QBO=contable, Airtable=operativo (declararlo).
P1-6 · Color por estado, no por signo (Dove Springs "Sano" −$17,812 en rojo). Semáforo: Sano(verde ARV−all-in>0 y flujo≥0) / Vigilar(ámbar) / Riesgo(rojo all-in>85% ARV o HML vencido).
P1-7 · Comunicar déficit como CAJA ATRAPADA (a recuperar en refi/venta), no pérdida — la ficha os.js:805 ya lo dice bien; propagar a Command Center y Dashboard. Mostrar equity en papel (ARV−all-in) al lado como big number.
P2-8 · Centralizar KPIs por casa en una capa (v_ff_portafolio, v_property_360, inv_indicadores_data) que las 3 vistas consuman.

═══════════════════════════════════════
## E · UX/UI/IX (experiencia)
═══════════════════════════════════════
P0-1 · DOS design systems literales: inv-portal/inv-admin usan tokens (dark, ui/tokens.css); app.js usa 372 clases Tailwind slate-* y 0 tokens (light). tokens.css canónico existe pero el shell viejo no lo importa. FIX: migrar app.js a tokens.css; una sola fuente.
P0-2 · La home es un lanzador vacío (app.js:1057-1102 renderSystems → "Sin sistemas aún"). FIX: hub con KPIs vivos por línea de negocio (Fix&Flip/Rentas/Portal): # casas, ocupación, capital, próximos pagos.
P0-3 · Documentos/Mensajes SIGUEN en el portal (inv-portal.js:416 TABS) — el removal (items 16/22) NO está aplicado. Confirmar antes del cierre.
P1-4 · KPI bifurcado: inversor tiene kpiI() con ℹ; admin usa kpi() plano sin explicador (inv-admin.js:927). FIX: componente KPI único con label+valor+fallback honesto "—"+ℹ+CTA.
P1-5 · Login es el sistema VIEJO (index.html:40-66 Tailwind blanco) → mala primera impresión. Tematizar con tokens.
P1-6 · No mobile-first (solo 3 @media en inv-portal.js); tablas no colapsan. FIX: DataTable → tarjetas <640px.
P2-7 · Emoji como sistema de iconos (frágil, ver SVG crudo) → set SVG único tokenizado.
P2-8 · Tres formateadores de números (money/pct vs dhM/dhP vs toFixed crudo en app.js sin guardas) → un módulo fmt con guarda honesta (nunca -Infinity/NaN/anualizado absurdo).
3 componentes canónicos a construir: KPI (fusiona kpiI+kpi+card), DataTable (colapsa a tarjetas), StatHero (número grande + selector horizonte 1/3/5/8) = la vista "activo/acción".
