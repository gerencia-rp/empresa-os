# Diagnóstico empresa OS — barrido completo (secuencia de prompts)
El CEO va mostrando sección por sección (pantallazos + lo que quiere). Cada ítem se convierte en un
prompt numerado. Al final se empaqueta en ZIP con run-all.sh y se corre en la terminal.

Convenciones de TODOS los prompts:
- Repo empresa-os, rama feat/portal-inversionista-v2. Autónomo. Commit Y PUSH a la rama. ci:gate verde.
- Deploy a producción de empresa-os-admin (vercel --prod). Verificar en carga NORMAL logueada (sin forzar osInit).
- "un dato, una fuente": Airtable es la verdad; no recalcular lo que la fuente ya tiene.
- Anotar antes/después en IMPLEMENTATION_LOG.md.

═══════════════════════════════════════
## SECUENCIA (se va llenando)
═══════════════════════════════════════

### 01 — Home/landing vieja: unificar diseño en TODA la app
Pantalla: al entrar a empresa-os.vercel.app aparece una vista vieja "Empresa OS · Fix & Flip Holding":
área casi vacía, botón "+ Nuevo sistema", sidebar con "+ Agregar área / Gestionar equipo / Auditoría / Salir".
Se ve desactualizada y distinta al resto (ej. el portal "Flipping Rentals OS" que ya tiene diseño moderno).
Pedido del CEO: que TODO tenga un mismo diseño, unificado y actualizado — nada viejo ni desactualizado; una sola identidad visual en toda la plataforma.
Para el prompt (a construir): auditar todas las vistas/áreas de la app, tomar el sistema de diseño moderno que ya se usa (tokens/estilos del portal actual) como base, y aplicarlo de forma consistente a la home/landing y a cualquier pantalla que quede con el estilo viejo. Rediseñar esta home para que sea el hub moderno del ecosistema (no una pantalla vacía). No romper funcionalidad; solo unificar UI/UX.
Pendiente de confirmar con CEO al cerrar: ¿esta home debe listar los sistemas (Fix&Flip, Rentas, Cobranza, Portal Inversor, Remodelación, etc.) como accesos, o va a otra cosa?

### 02 — Kanban "Deals & Pipeline": ocultar columnas vacías
Pantalla: Fix&Flip → Deals & Pipeline (Blueprint FF). Las columnas LEAD (0) y BAJO CONTRATO (0) siempre están vacías ("sin deals acá") y ocupan espacio.
Pedido: mostrar SOLO las columnas/etapas que tienen casas. Si aparece una casa nueva con un tag/etapa distinta (ej. Lead o Bajo contrato), esa columna se muestra automáticamente; mientras esté vacía, no se muestra. Optimizar el espacio horizontal del Kanban.

### 03 — Ficha de casa: "Líder" muestra el rec ID de Airtable, no el nombre
Pantalla: Ficha de casa (ej. 3403 Charles Street) → Ficha de obra → campo "Líder" muestra "recF0K8ERJoI5JGS5" (el ID del registro vinculado de Airtable) en vez del NOMBRE de la persona.
Pedido: resolver el linked record al nombre real del líder de obra (traer el campo Nombre de la tabla vinculada en Airtable / mapear el rec id → nombre en el sync). Que muestre el nombre, no el rec id. Revisar si el mismo patrón (rec id crudo) pasa en otros campos de esta ficha u otras vistas.

### 04 — Déficit: la app RECALCULA en vez de usar el dato de Airtable (un dato, una fuente) [CRÍTICO de datos]
Hallazgo (verificado en Supabase, sync fresco de hoy 06:46):
El "Déficit" por casa que muestra Command Center / Pipeline NO coincide con el campo real ff_deals.deficit_total (que viene de Airtable):
  · 407 Capitol: app −$37,964  vs  Airtable deficit_total = 0
  · 4916 Barkbridge: app −$35,233  vs  100
  · 902 Virginia: app −$30,709  vs  70,529
  · 1100 Echo lane: app −$30,047  vs  36,391
  · 5003 Michelle: app −$28,735  vs  3,874
  · 4905 nesting: app −$26,428  vs  17,072
La app usa una "fórmula CEO (draws − gastos − down payment)" recalculada, y VARIAS casas tienen "faltan draws" (datos incompletos), así que el número es poco confiable y contradice la fuente. Los márgenes (ARV − all-in) son POSITIVOS en todas (Capitol +$95k, Virginia +$128k, Michelle +$143k…) → NO es una pérdida real del negocio.
Pedido (a decidir con CEO): definir UNA sola fuente para el déficit. Opción A: usar ff_deals.deficit_total de Airtable (un dato, una fuente) y etiquetar la fórmula. Opción B: si la fórmula CEO es la buena, cargar los draws faltantes y dejar claro que es un cálculo, no la fuente. En ambos casos: que Command Center, Pipeline, ficha y dashboard muestren el MISMO número, y marcar "datos incompletos (faltan draws)" cuando aplique en vez de un número que asusta.

### 05 — Propiedades (Fix&Flip): "faltan draws" con rehab ya cargado + columna Déficit toda en rojo
Pantalla: Fix&Flip → Propiedades. Header: "28 propiedades · 23 en portafolio + 5 etiquetadas · 4 sin draws cargados en Airtable".
Hallazgo (verificado en Supabase, sync fresco hoy 06:46):
(a) La app marca "faltan draws / faltan datos de draws" aunque el REHAB REAL sí está en Airtable:
   · 3403 Charles St: remodel_real $110,000 pero ff_draws = $0 → dice "faltan draws".
   · 2425 Bitter Creek: remodel_real $80,000 pero draws $0.
   · (Bartlett y Capitol: draws NO cuadran con remodel_real — 45k vs 52.6k, 63.75k vs 85k.)
   · 5303 Harvest: remodel_real $0 y draws $0 → ese sí está realmente vacío.
   Fix: cuando falten los draws itemizados (ff_draws), usar `remodel_real` (que ya trae Airtable) como costo de rehab para calcular all-in/déficit. Solo mostrar "faltan datos" cuando NO haya ni draws ni remodel_real. Revisar los desajustes draws vs remodel_real y cuál manda.
(b) La columna "DÉFICIT" se muestra SIEMPRE en rojo, incluso en casas con estado "Sano" (ej. Dove Springs "Sano" −$17,812 en rojo). El color debe seguir al ESTADO real (Sano = neutro/verde, Déficit = rojo, All-in alto = ámbar), no pintar todo rojo. Y el número debe venir de la fuente correcta (ligado al Ajuste 04).
Relacionado con 04 (misma raíz: déficit recalculado vs fuente Airtable).

### 06 — Unificar "Deals & Pipeline" + "Propiedades" en una sola cosa + ficha de casa SÚPER profunda
Pedido: estas dos secciones del menú Fix&Flip podrían ser UNA sola (hoy muestran casi la misma lista). Y al abrir una casa, el CEO quiere ver TODO en un solo lugar: la FOTO de la casa + todos los números + cómo está rindiendo (algo súper profundo). Consolidar la ficha de casa como la vista 360° del inmueble (operación, obra, financiamiento, inversionistas, rendimiento, fotos).
A construir: fusionar las dos vistas (o dejar una lista y que "Propiedades" sea la ficha), y enriquecer la ficha de casa con foto + P&L + rendimiento + estado, tomando cada dato de su fuente correcta (Airtable). Depende de tener claro el mapa de fuentes (ver abajo).

### 🔎 QBO / Analítica — verificar números reales (via cuestionario de Juan)
QuickBooks conectado = "Flipping Rentals LLC" (empresa correcta, verificado). La app muestra en Finanzas: interés HML/ingreso 96% ($208,630 interés YTD / $216,351 ingreso [QBO]), ICR 0.19×, invertido $8,225,310, equity $3,055,690. En Analítica: 28 ops (19 renta/4 rehab/3 adq/2 vendidas), 2 vendidas, ingreso ventas $615,000, utilidad neta realizada $11,928 (bruta $110,653), ROI 7.0%. TODOS estos hay que confirmarlos contra la fuente real. Mecanismo elegido por el CEO → el CUESTIONARIO (abajo). Se puede además cruzar el ingreso/interés contra el P&L real de QBO por MCP.

### 🧭 MECANISMO DE VERIFICACIÓN (idea del CEO) — Cuestionario de fuentes para Juan
Generar un DOCUMENTO donde, número por número / campo por campo de cada pantalla, se pregunte de dónde se alimenta el dato. Juan escribe la RUTA exacta en Airtable (base → tabla → columna/vista) o la fuente (QBO, cálculo). Con eso: (1) confirmamos que la app lee del lugar correcto, (2) detectamos los que la app recalcula mal (ej. déficit), (3) alimentamos el rediseño de la ficha 360°. Entregable: "CUESTIONARIO-FUENTES-Juan.xlsx".

### 07 — PORTAL DEL INVERSOR: pasada MILIMÉTRICA (foco dedicado)
El CEO quiere trabajar milimétricamente TODO el portal del inversor. Requisito central: cada indicador debe EXPLICARSE y verse CLARO — que se entienda qué es y se pueda ACTUAR desde ahí (no solo un número suelto).
Pantalla Global (admin) muestra: XIRR portafolio 63.6% · XIRR solo compra 147.2% · Múltiplo sobre equity 2.45x · LTV ponderado 62.4% · Inversión total $7,678,348 · Valor papel $11,014,000 · Equity invertido→hoy $2,461,648→$6,034,350 · Fondo DPI·RVPI·TVPI 0.05x·1.05x·1.10x.
A construir (indicador por indicador): tooltip/explicación clara + "cómo leerlo" + "qué hacer", en lenguaje de inversionista. Definir la lista completa de indicadores del portal y su explicación.

### 08 — TIR por casa ABSURDA (holds cortos) — verificar en dominio admin
Pantalla Global → "Indicadores por casa": TIRs irreales en casas adquirida/en_rehab: Bitter Creek 3450.1%, Arthur Stiles 2541.2%, Charles 1612.0%, y Aprec./año 218997.8%. Es EXACTAMENTE el problema de anualizar holds < 1 año.
OJO: esta captura es de empresa-os.vercel.app (dominio VIEJO), no de empresa-os-admin. Es probable que el fix "no anualizar < 365 días" YA esté en admin. HAY QUE: (a) verificar en empresa-os-admin si estas casas ya muestran múltiplo + "en valorización" en vez de TIR gigante; (b) si el admin también las muestra, reforzar el fix; (c) en la vista por casa mostrar múltiplo (×all-in/×equity) como principal para holds cortos, no la TIR anualizada.

### 09 — [CRÍTICO] La RENTA del Analizador no es la renta real cobrada
El Analizador (portal inversor) declara fuente "ff_deals (renta/gastos)". Verificado en Supabase: `ff_deals.renta_mensual` NO coincide con la renta real cobrada (pm_payments/Rentas):
  · 9909 Childress: app $4,850/mes vs real ~$1,017 · 512 Bramble: $4,500 vs ~$833 · 7105 Bethune: $2,400 vs ~$1,250 · 902 Virginia: $3,400 vs ~$5,100 (app por debajo) · 1302 Garden Path: $2,800 vs ~$1,474.
(La cifra real es promedio rápido de pm_payments; casas por habitación pueden tener varias líneas/mes — afinar con SUM por mes/unidad.)
Efecto: NOI, CAP, FLUJO/MES, CoC y DSCR de TODAS las casas salen mal → todo dice "drena caja / vender-refinanciar" (bloque "Recomendación por casa" alarma a todas).
Fix: para la SALUD FINANCIERA (NOI/DSCR/flujo/CoC) usar la RENTA REAL de Rentas (pm_payments) y los GASTOS reales (pm_expenses), no el ff_deals.renta_mensual modelado. Reconciliar cuál es la fuente de verdad de renta/gastos y unificar (un dato, una fuente). Mientras la renta modelada mande, las recomendaciones de "vender/refi" no son confiables.

### 10 — Quitar "Pipeline" (Calculadora de propuesta) del portal admin  [CEO: "quitemos esto"]
El CEO pidió quitar la pestaña Pipeline (Calculadora de propuesta) del admin del portal. (Ya existe prompt "Ocultar Pipeline del admin"; confirmar que se aplique aquí — ocultar reversible.)

### 11 — "Casas & reparto" (Holdings): desglose completo del inversionista + % dudoso
Pantalla Casas & reparto → Holdings (26): inversionista · casa · inversión · su % · entrada.
Pedido del CEO: desglosar bien por holding: cuánto le corresponde, CUÁNDO empezaron (fecha entrada — ya está), si LES COMPRAMOS la parte (buyout/salida), y demás cosas importantes (distribuciones recibidas, estado del holding, capital devuelto). Convertirlo en la ficha del inversionista por casa (aporte, %, entrada, buyout, distribuciones, saldo).
⚠ Además: los % se ven raros — inversionistas con plata aportada y 0% (Yeisson $38,000·0%, Valeria $25,400·0%, Flipping Rentals LLC $46,000·0%) y otros $0 con 50%. Esto liga con el punto CRÍTICO B5 (el % del inversionista debe salir de Airtable Matriz→Propiedades→"% porcentaje del inversionista"). Verificar/corregir la fuente del reparto_pct.

### 12 — Desglose de "salud financiera" por casa Y por portafolio  [CEO]
El CEO quiere ver el DESGLOSE de todos los números para leer la salud financiera de cada casa y del portafolio completo (parte del Ajuste 06/07: ver cada casa como activo/acción). Depende del Ajuste 09 (renta real) para que los números sean confiables.

### 13 — "Modelo & movimientos" (Portal): MOSTRAR el movimiento del dinero ya calculado, organizado y claro
Pantalla: Portal admin → Modelo & movimientos (ej. 7105 Bethune). Hoy se siente como CARGA de datos: "Agregar parámetro (key/valor)" + "Parámetros del modelo (40)" en 9 bloques. El panel derecho ya lista movimientos reales (Renta cobrada, Gasto house COA/Texas Gas/Spectrum, Pago interés HML) con tags auto·FF / auto·Rentas y P&L SÍ/NO.
Pedido del CEO: que aquí se vea YA el MOVIMIENTO DE TODO EL DINERO — que NO le pida el número, sino que se lo MUESTRE ya calculado, más organizado, con TODAS las categorías bien hechas. Hoy no es claro y uno se pierde.
A construir: separar (a) la CONFIG de parámetros del modelo (que quede aparte, para el que la necesite) de (b) la VISTA de movimiento del dinero, que debe ser el resumen calculado y claro: agrupado por categorías (renta, gastos operativos por tipo, servicio de deuda HML/refi, inversión/draws, distribuciones), con totales por categoría y por mes, saldos, y qué mueve el P&L y qué no. Debe entenderse de un vistazo (menos formulario, más tablero). Reutiliza el Ledger (inv_ledger) como fuente. Liga con Ajuste 01 (claridad) y con el Ledger ya trabajado.

### 14 — "Escenarios & simulador" (Portal): horizontes cortos 3/5/8 + evolución del activo en el tiempo
Pantalla: Portal admin → Escenarios & simulador (ej. 7105 Bethune). Hoy los indicadores son a 31 años / año 10 / año 2 (TIR 31A, VPN 31A, Patrimonio inversionista año 10, Utilidad año 2). Columnas Estimado/Proyectado/Realizado/Simulado casi idénticas (ya anotado en Ajuste 02-bis / Item 2).
Pedido del CEO: ver MÁS escenarios a corto plazo — 3, 5 y 8 años — y poder ver BIEN cómo se mueve el ACTIVO EN EL TIEMPO (evolución año a año: valor, deuda, equity, flujo, patrimonio del inversionista).
A construir: (a) horizontes 3/5/8 (⚠ CONFLICTO A RESOLVER: antes el CEO eligió 4/6/8 en la pregunta; ahora pide 3/5/8 — CONFIRMAR el set final y usar el MISMO en TODO el sistema); (b) una vista de línea de tiempo / gráfica de cómo evoluciona el activo por año (patrimonio, equity, deuda, flujo acumulado) para "verlo moverse". Liga con Item 2 (Escenarios) y con Ajuste 06/07 (activo/acción).

### 15 — Distribuciones: pagos al inversor entran a los números del negocio + AVISOS de cuándo/cuánto pagar
Pantalla: Portal → Distribuciones (hoy: crear distribución manual, lista con tipo utilidad/devolucion_capital, estado programada/pagada, links pago/K-1).
Pedido del CEO: (a) cuando se hace un pago al inversor, que quede ASIGNADO y ese "reporte" entre dentro de los NÚMEROS DEL NEGOCIO (afecte caja/P&L del holding, no solo la lista del inversor). (b) Que la app le AVISE: cuándo tiene que enviar dinero, cuál es el déficit, cuándo se cumple el plazo (distribución programada), y CUÁNTO enviar "de lo que quedó" (el neto distribuible = renta − operativos − servicio de deuda × % del inversionista — la distribución automática que ya construimos).
A construir: panel/alertas de "próximos pagos a inversionistas" (programadas por vencer, monto sugerido calculado del neto real por casa/mes, déficit por cubrir), y que las distribuciones pagadas se reflejen en los números del negocio (Ledger/caja del holding) — un solo circuito. Liga con la distribución automática (prompt ya hecho) y con el déficit (Ajuste 04).
- ADEMÁS (confirmado por CEO en la vista Distribuciones del inversor): cuando se crea una distribución desde el ADMIN, asegurar que (a) aparezca en la pestaña "Distribuciones" del inversor (Total recibido, Historial, K-1) — hoy 0/vacío; y (b) se NOTIFIQUE AL EQUIPO para registrarla en QuickBooks y en Airtable (una tarea/aviso interno al equipo, no al inversor). Así la distribución queda sincronizada en los 3 lados (portal + QBO + Airtable) y nadie olvida asentarla. (La notificación es interna al equipo; el envío real requiere confirmación.)

### 16 — Quitar "Documentos" y "Mensajes" del portal admin  [CEO: "quitemos esto de documentos y mensajes"]
Portal admin: quitar las pestañas Documentos y Mensajes (hoy 0 docs / 0 mensajes). Ocultar reversible (no borrar), igual criterio. (Ya cubierto en el "PROMPT CONSOLIDADO - claridad admin"; confirmar que aplique en el portal del inversor.)

### 17 — El Ledger del portal se REPITE con los números del negocio → UNIFICAR en uno solo claro y completo
Pantalla: Portal → Ledger (Saldo operativo P&L $3,542, subtotales por categoría, Fuentes: FF:ff_deals/ff_hml_loans/ff_draws/ff_hml_payments + Rentas:pm_expenses/pm_payments + OS:manual). El CEO nota que esta info se REPITE con los números de todo el negocio (Command Center / Finanzas·QBO / Analizador).
Pedido: unificar y dejar UN solo tablero financiero muy claro y completo — que no haya el Ledger por un lado y "los números del negocio" por otro diciendo cosas parecidas (a veces distintas). Una sola definición, una sola fuente, un solo lugar donde ver el movimiento y la salud financiera (por casa y consolidado). Liga con Items 04 (déficit), 09 (renta real), 13 (modelo&movimientos), 12 (salud financiera) — es el mismo hilo: consolidar el "dinero del negocio" en una vista única y verdadera.

### 18 — Portal inversor (tarjetas por casa): VPN/Profit/TIR a horizontes TANGIBLES 1-3-5-8 años (no 31 años)
Pantalla: Portal público del inversionista (ej. 101 Starbright, viendo como MEK Housing). Tarjetas hoy: "TU VPN A 31 AÑOS $1,397,898", "TU PROFIT (HOLD 31A) $5,806,632", "TIR A 31 AÑOS 56.9%". El CEO quiere números más TANGIBLES: horizontes 1, 3, 5 y 8 años (no 31). (ROI anualizado ya sale "—" por hold < 3 meses — bien, el fix de credibilidad funciona aquí.)
A construir: reemplazar/complementar el horizonte 31 años por 1/3/5/8 en las tarjetas del inversor (VPN, profit, TIR por horizonte). Liga con Item 14 (escenarios) — MISMO set de horizontes en TODO.
⚠ CONFLICTO DE HORIZONTES (ACUMULADO — LOCKEAR UNO AL CIERRE): el CEO ha dicho 4/6/8 (respuesta formal), luego 3/5/8, luego 1/3/5/8. Hay que fijar UN set único y usarlo en Escenarios admin + tarjetas inversor + todo. PREGUNTAR al cerrar.

### 19 — Portal inversor (detalle de casa): reorganizar → datos REALES primero, indicadores financieros al FINAL
Pantalla: Portal público, detalle de casa (ej. 5320 Wellington, viendo como MEK Housing). Hoy arriba salen indicadores (TIR, VPN, CoC, DSCR, DPI/RVPI/TVPI, apreciación anualizada 1697.9%) y más abajo "Info del deal" y "Línea de tiempo".
Pedido del CEO: mostrar DATOS REALES de la casa y que sea FÁCIL leer los números. REORGANIZAR: primero los NÚMEROS DEL NEGOCIO como tal (info del deal real: compra, obra, HML, ARV, estado, movimientos reales, flujo real, refi/cash-out, línea de tiempo) y AL FINAL los INDICADORES FINANCIEROS (TIR, VPN, múltiplos, cap, DSCR, DPI/RVPI/TVPI). Jerarquía: lo tangible/real arriba, lo calculado/proyectado abajo.
⚠ Además: "Apreciación anualizada 1697.9%" es otro número absurdo por anualizar hold corto (mismo tema del Ajuste 08 credibilidad) — no mostrar anualizado en holds < 1 año. Los indicadores que dependen de renta (CoC 303.6%, yield on cost, DSCR) heredan el problema de la renta modelada (Ajuste 09).

### 20 — "P&L del modelo" + "Desembolso del banco & ciclo": autoexplicativo para el inversor en UNA vista
Pantalla: Portal inversor, tarjetas "P&L del modelo — año estabilizado" y "Desembolso del banco & ciclo". Hoy son densas/técnicas y contradictorias a la vista: Ingresos renta $0, Utilidad anual de la casa −$8,240, pero ROI sobre cash 959.5% y Profit total $2,024,549; Déficit máximo del ciclo −$211,010; Cash atrapado post-refi −$130,000; "Recuperación en 3 fases".
Pedido del CEO: que esto se vea y se entienda FÁCIL para el inversor, en UNA sola vista, sin que el CEO tenga que explicárselo. Lenguaje simple, historia coherente (por qué la utilidad sale negativa hoy pero el retorno total es positivo = está en rehab/valorización; qué significa cash atrapado y cómo se recupera). Que el inversor lo lea solo y lo entienda.
Liga con Item 07 (explicar indicadores), 19 (reorganizar real→indicadores) y credibilidad (holds cortos). Es el mismo objetivo: portal del inversor autoexplicativo.

### 21 — "Tu casa en números simples" (portal inversor): mostrar los pagos a la remodeladora y TODOS los gastos reales
Pantalla: Portal inversor → "Tu casa en números simples" (ej. Wellington, en rehab). Hoy "Gastos del mes $0" porque solo cuenta operación P&L SÍ; los pagos a la empresa de remodelación (draws/rehab) son inversión (P&L NO) y NO se muestran.
Pedido del CEO: en gastos SÍ se debe ver lo que se le va pagando a la empresa de remodelación y realmente TODOS los gastos del negocio (no $0). 
A construir: agregar al detalle de la casa una sección/desglose de "todo el dinero que ha salido" — pagos a remodelación (draws de ff_draws), gastos operativos (pm_expenses), servicio de deuda (ff_hml_payments), cierre, etc. — para que el inversor vea a dónde va la plata de verdad, además del "balance operativo" P&L. Distinguir claramente operación (P&L) de inversión/obra, pero sin esconder los pagos de obra en $0. Liga con Items 05 (draws), 13/17 (movimiento del dinero) y 21↔09 (datos reales).
- TAMBIÉN en el Flujo Mensual del inversor (pestaña "Flujo Mensual"): hoy renta $0 / gastos operativos $0, y la remodelación (draws −$160,000) y la compra (−$205,000) solo salen abajo como "inversión · P&L NO". El CEO quiere que ahí se muestren TANTO las rentas COMO los gastos de la casa Y la remodelación (no todo en $0). Que el inversor vea el movimiento real completo, con la obra visible.

### 22 — Quitar "Mis Documentos" del portal del INVERSOR  [CEO: "esto de documentos quitémoslo"]
Portal del inversionista (vista del inversor) → pestaña "Mis Documentos": quitarla. (Ya cubierto en el prompt "Vista inversor — limpiar tabs"; confirmar que se aplique. Ocultar reversible.) CONFIRMADO por CEO: también quitar "Mensajes" del inversor ("quitemos esto" en la pestaña Mensajes). Del inversor se quitan: Mis Documentos + Mensajes. ⚠ CORRECCIÓN: el "Asistente" NO se quita (ver Item 23) — el CEO quiere conservarlo y potenciarlo. Ocultar reversible solo Documentos y Mensajes.

### 23 — "Asistente" del inversor → convertirlo en un ASISTENTE DE IA PERSONALIZADO
Pantalla: Portal inversor → "Asistente" (Investor Assistant): hoy responde con chips ("Explícame mis indicadores", "¿Qué es el TVPI?", "¿Cómo va mi inversión?", "¿Cuándo recupero mi capital?") "solo con los datos de TU inversión".
Al CEO le gusta y quiere convertirlo en su ASISTENTE DE IA PERSONALIZADO:
- Conectar una API de una IA (LLM) para que tenga razonamiento real (no solo respuestas fijas).
- Alimentarlo con TODO: los números del negocio + la posición/ejercicio del inversor + cómo opera el negocio (base de conocimiento de "qué hacemos y cómo lo hacemos"), para que responda bien.
- El CEO YA TIENE un modelo/prompt que usa en OTRA de sus empresas → lo va a compartir como base (pedirlo).
- Reglas: responder con datos reales del inversor (RLS: solo SU info), números concretos, honesto sobre riesgos; para el inversor, en lenguaje simple.
PENDIENTE DE INSUMOS (pedir al CEO/Juan): (1) el prompt/modelo base de la otra empresa; (2) qué proveedor de IA/API usar (OpenAI, Anthropic/Claude, etc.) y la key; (3) alcance: ¿solo datos del inversor, o también conocimiento general del negocio? (definir qué puede ver por RLS).
Nota técnica: hay que decidir arquitectura (edge function que llame a la API con contexto de la casa/inversor) y cuidar que NO filtre datos de otros inversores (RLS).

### 24 — Rediseño UX/UI del Portal del Inversor (nivel Robinhood/eToro)  [PROMPT YA ESCRITO]
Investigado (Robinhood/eToro): titular grande + gráfica con selector de horizonte + tarjetas simples + color semántico + tooltips + estados honestos + divulgación progresiva + mobile-first. Consolida los ajustes 07/13/14/18/19/20/21 bajo un sistema de diseño único. → Archivo: "PROMPT - Rediseno UX-UI del Portal del Inversor (nivel Robinhood-eToro).md" (listo para el ZIP).

### 25 — "CEREBRO" central: IA omnipresente que conecta y maneja TODO  [visión mayor — extiende Item 23]
Ya existe un "Cerebro del Holding" (Panel Global, análisis transversal + reglas) y un "Cerebro Ejecutivo" en el Command Center / Agentic OS (/jarvis: holding → líneas → escuadras → 39 agentes, orquesta las escuadras). El CEO quiere que el Cerebro sea EL central:
- Súper conectado: une TODA la info y metodología ya construida. EXPERTO en todos los sistemas, casas y números. Acceso a Airtable + QuickBooks cuando se necesite. Razona con IA para responder cualquier número o proceso del sistema completo. OMNIPRESENTE, lo entiende todo, no se le pasa nada. LIDERA todo el equipo de IA/bots (escuadras del Agentic OS). "Todo súper conectado y el Cerebro maneja todo."
A definir (arquitectura, con CEO/Juan): (1) el Cerebro del inversor (Item 23) = fachada del mismo Cerebro central con RLS; (2) IA/API + key; (3) base de conocimiento (metodología); (4) conexión de datos (Airtable + QBO + Supabase) vía función segura; (5) orquestación de escuadras/bots. Proyecto grande — probablemente su propia sub-secuencia.

### 26 — [BUG] Código SVG crudo mostrándose como texto en Rentas · Property Manager
Pantalla: /rentas/property-manager. Arriba (junto a "Volver") aparece el MARKUP crudo de un ícono: `<svg class="icn" ...><path d="M15 21v-8a1 1 0 ...`. Imprime el HTML del ícono como texto en vez de renderizarlo (innerHTML/string mal armado o sin des-escapar). Corregir para que el ícono se renderice; revisar si el mismo patrón roto aparece en otras vistas.

### 27 — [CRÍTICO datos] Rentas · PM: conteos NO reconcilian (unidades/ocupación/inquilinos/reservas)
Verificado en Supabase: pm_properties activas=20 · pm_units=98 (ocupada 75 · disponible 14 · mant 4 · reservada 1 · null 4) · pm_tenants activos=103 · pm_bookings activas=80.
La app muestra el MISMO concepto distinto en cada vista: OCUPADAS 37 (Resumen)/35 (Calendario)/30 (Disponibilidad)/75 (DB status). TOTAL 51 anuncios/36 rentables/32 rentables/20 props/98 units. LIBRES 6/16/1. OCUPACIÓN 73%/80%. INQUILINOS activos 37/40. La app avisa "51 inconsistencias · Airtable contradictorio".
CAUSA: cada vista usa otra definición de "unidad"; y pm_units.status está desactualizado — la ocupación real debe salir de RESERVAS activas hoy (pm_bookings por fechas), no del status.
FIX: definir UN set canónico (unidad rentable, ocupada=reserva activa hoy, libre, mantenimiento; ocupación=ocupadas/rentables misma base; inquilino activo/reserva activa por fechas) y usarlo en TODAS las pestañas; derivar de bookings, corregir/sincronizar status; limpiar las 51 inconsistencias de Airtable. DoD: mismos números en todas las vistas y cuadran con reservas vigentes.

### 28 — Reservas "activas y al día"  [CEO]
Reservas: "80 · actuales y futuras 39". Que "activa" = período incluye hoy; separar pasadas/actuales/futuras/atrasadas por fechas; vista por defecto = vigente/al día. Liga con 27 (fuente por fechas).

### 29 — Alertas de ATRASADOS reales y cuadradas con Airtable  [CEO: importante]
Inquilinos·CRM: ATRASADOS 21 (Kelly, Devin, Kiki, Tara… tag ATRASADO). El CEO quiere confirmar que la alerta de "atrasado" sea REAL y coincida con cómo los tiene marcados en Airtable (mora/cobranza). Verificar la regla de "atrasado" (¿por último pago vs renta esperada del mes? ¿por fecha?) contra Airtable; que el conteo (21) y cada tag sean correctos y al día. Nota: Kiki "$3,200/mensual · últ pago $1,800" (pago parcial), Tara "sin pagos registrados" → definir bien qué es atrasado. Liga con Cobranza y con el Cerebro (avisos).

### 📄 DELIVERABLE — Cuestionario de fuentes para CARLOS (Rentas)  [CEO pidió]
Igual que el de Juan, pero para CARLOS (encargado de Rentas): documento con TODOS los números del negocio de Rentas que muestra la plataforma, dónde debería salir cada uno (Airtable), columnas para que Carlos confirme la ruta, + un INSTRUCTIVO de qué debe hacer. Objetivo: asegurar que la app toma la info como es. → generar "CUESTIONARIO-FUENTES-Carlos-Rentas.xlsx".

### 30 — Pagos · cobranza: mostrar MÉTODO de pago y QUIÉN recibió la plata
Pantalla Pagos·cobranza: columnas hoy = Mes renta · Cobrado (fecha) · Inquilino · Casa · Unit · Monto · Plataforma · Recurrencia · Estatus · Compr.(vacío) · Acc. KPIs: Renta $33,870 · Cobrado $29,078 · Pagos 38 · Atrasados 22 · Total atrasado $33,601.
Pedido del CEO: poder ver el MÉTODO DE PAGO (efectivo/transferencia/Zelle/tarjeta/plataforma) y QUIÉN RECIBIÓ la plata (a qué cuenta/persona/entidad entró), para revisar/conciliar que esté bien. Agregar esas columnas/datos (de Airtable) + el comprobante (hoy "Compr." está en "—"). Sirve para auditar la cobranza y cuadrar con QBO/banco.
Nota: "Plataforma" existe (Directo/Airbnb) pero no es lo mismo que método de pago ni quién recibió. Confirmar fuentes en Airtable con Carlos (va en su cuestionario).

### 31 — [CRÍTICO] Gastos Operativos muestra $0 aunque HAY gastos (problema de CATEGORÍA)
Verificado en Supabase pm_expenses: los gastos SÍ existen — house/Hipoteca 140 movs $289,755 · house/Servicios públicos 163 $34,014 · house/Aseo y Podada 162 $17,250 · house/Mantenimiento 6 $3,824 · operational/Equipo·Nómina 6 $9,270 (SIN billing_ym). 
Pero la pestaña "Gastos · Operativos" muestra $0 porque filtra category='operational' (solo 6 filas de nómina, y esas NO tienen fecha → no caen en ningún mes). Los gastos reales de operación (servicios públicos, aseo, mantenimiento, hipoteca) están como category='house' y solo salen en "Por Casa", no en "Operativos".
Efecto en cadena: el NOI/margen sale mal (Finanzas muestra "Margen NOI 100%", NOI = renta = $33,870 → opex tratado como $0). Y la app avisa "6 gastos sin fecha ni Mes/Año ($9,270) — no entran a ningún período (Nicolás Sánchez, Gasolina, Daniel Lara, Cenas y Reuniones Taxes)".
FIX: reconciliar la taxonomía de gastos: definir qué es "operativo" (servicios/aseo/mantenimiento/nómina) vs "financiero/deuda" (hipoteca) vs "inversión". Que "Gastos Operativos" incluya servicios públicos, aseo, mantenimiento y nómina (no solo category='operational'); que el NOI reste los opex reales; y arreglar las 6 filas sin fecha en Airtable. Un mapeo de categorías único para toda la app.

### 32 — Finanzas · Dashboard ejecutivo: que muestre TODO claro y REAL (ingresos, gastos, NOI, cash flow)
Pantalla: Rentas → Finanzas (Dashboard ejecutivo, botones "Generar semanal/mensual PDF"). Hoy: Renta $33,870 · Gastos totales $39,122 · NOI $33,870 (margen 100% ⚠) · Cash flow neto −$5,252 · Ocupación 83% (30/36) · Renta prom $1,829.
Pedido del CEO: que en Finanzas se vea TODO al final muy claro — ingresos, gastos y demás — para saber cómo se mueve el negocio, y que REALMENTE esté bien.
A construir: P&L claro y correcto: Ingresos (renta real cobrada) − Gastos operativos reales (servicios/aseo/manto/nómina) = NOI real (margen ≠ 100%) − servicio de deuda (hipoteca) = cash flow neto. Que cuadre con Pagos, con Gastos, con el P&L por casa y con el informe de Carlos. Corregir el margen NOI 100% (viene del bug de gastos, Item 31). Depende de 27/31 (datos reales).

### 33 — Auto-generar los INFORMES desde la app (Ocupación/Movimientos, Utilities, Cartera Vencida)
El CEO subió 3 informes reales (hechos a mano por el equipo): "Ocupación y Movimientos" (semanal), "Utilities 2026", "Cartera Vencida". La app ya tiene botones "Generar semanal (operación) / mensual (finanzas) PDF". 
Pedido: que la app genere ESOS informes automáticamente, con datos reales que cuadren con la operación, y que coincidan con lo que hace el equipo a mano. Aprender el formato/contenido de cada informe y replicarlo en la app (PDF). Corroborar los números de los informes contra Supabase + Airtable para corregir diferencias.
Referencia (Informe Ocupación 18-ago, REAL de Carlos): 20 props · 51 uds · ocupadas 38 · reservada 1 · disponibles 4 · mant 4 · inhabilitadas 4 · ocupación efectiva 76.5% (39/51) · renta ocupada $66,158 · ingreso confirmado $67,358. ESTA es la verdad → la app dice 37/73% y la DB pm_units 98/75 (inflada). Reconciliar (Item 27).

### 34 — Agentes expertos (análisis multi-agente)  [CEO pidió correr agentes]
El CEO pidió meter varios agentes expertos (cada parte del negocio + arquitectura/diseño web + UX + negocio) para analizar todo, corregir/crear/optimizar, corriendo independientes para mejorar sobre la marcha. → LANZADOS 5 agentes (UX/UI, arquitectura/seguridad, Rentas-datos, Portal inversor, Fix&Flip-finanzas). Sus hallazgos (con archivo/línea) están en "HALLAZGOS-EXPERTOS-agentes.md" — se integran a los prompts finales. Hallazgo P0 nuevo importante: varias Edge Functions de escritura sin auth + CORS "*" (bypass RLS) → arreglar antes de nada.

### 35 — [CRÍTICO datos] Cartera vs Cobranza vs Dashboard: 3 números distintos de "deuda vencida" + contraste con Carlos
Tres pantallas del MISMO concepto "deuda vencida (neta)" no coinciden:
· /cartera "Informe de Cartera·Rentas": Deuda vencida neta $14,400 · Por cobrar del mes $33,601 · Saldo a favor $9,155 · Pendiente neto $41,716 (27 inquilinos).
· /cobros "Cobranza·Rentas": Deuda vencida neta $18,636.01 (15 morosos) · Por cobrar $25,366 · Saldo a favor $15,605 · Total $44,002.
· /rentas/dashboard "Deuda vencida real": $18,636 (fuente v_cartera_kpi.vencido_neto).
→ Dashboard y Cobranza coinciden ($18,636); la página /cartera es la desalineada ($14,400). MISMO concepto, dos fuentes.
Contraste con el informe REAL de Carlos (Cartera Vencida 18-ago): TOTAL EN MORA $54,687.01 · 29 inquilinos · 18/19 props · Junio(75d) $4,536.01 · Julio(46d) $14,650 · Agosto(15d) $35,501 · Crítico 6 $9,886 / Medio 10 $26,800 / Bajo 13 $18,001. Mora desde el día 4 de cada mes; INCLUYE agosto (mes en curso).
Diagnóstico: la app decidió (bien) SEPARAR mes en curso de mora y NETEAR saldo a favor por inquilino (el informe manual los mezclaba y daba +195%). PERO: (a) las 3 pantallas de la app deben dar el MISMO número; (b) hay que reconciliar la definición con Carlos: la mora de meses cerrados (jun+jul) de Carlos = $19,186 bruto; la app neta a $14,400/$18,636 — cuadrar el neteo inquilino por inquilino contra el detalle de Carlos (29 inquilinos, prioridad 75/46/15 días). 
FIX: UNA sola fuente (v_cartera_kpi) para Cartera, Cobranza y Dashboard; misma definición (vencido = meses cerrados neteado; mes en curso aparte; agosto NO es mora). Verificar el total y el detalle por inquilino contra el informe de Carlos (mismos nombres/casas). Que el aging (0-30/30-60/60+) y la distribución por mes (jun/jul/ago) cuadren con Carlos.

### 36 — Dashboard Ejecutivo · Rentas: ya es la base buena — hacerlo tangible para decidir + arreglar datos
Pantalla /rentas/dashboard "Dashboard Ejecutivo · Rentas" — ES lo más cercano a lo que el CEO quiere: Ocupación 72.5% (v_ocupacion) · Renta cobrada $29,078 (pm_payments billing_ym) · NOI del mes $29,078 · Deuda vencida real $18,636 (v_cartera_kpi) · Cash flow post-deuda −$10,044 · tendencia 12 meses (renta/NOI/post-deuda) · Unit economics por casa (renta/mes 12m, NOI/mes, ocupación, DSCR). Cada cifra DECLARA su fuente ⓘ.
Pedido del CEO (repetido): ver cosas TANGIBLES y fáciles para decidir — cuánto hacemos al mes, ingresos y gastos mensuales, cartera por cobrar, ocupación y demás.
A construir: (a) este dashboard es el candidato a "vista de decisión" del negocio; pulirlo y hacerlo la home de Rentas; (b) ARREGLAR: NOI muestra "gastos operativos $0" (bug de categorías, Item 31) → el NOI/cash flow están mal; ocupación 72.5% vs real 76.5% (Item 27); (c) agregar cartera por cobrar como KPI (ya está la deuda vencida). Depende de 27/31/35.

### 37 — Ver la CASA como un ACTIVO (ingresos/gastos/NOI por casa) + consolidado del negocio  [CEO, repetido]
El CEO quiere ver cada casa como un activo: cuánto genera, sus gastos e ingresos, fácil, por casa Y por todo el negocio. La sección "Unit economics por casa" del Dashboard Ejecutivo (renta/mes, NOI/mes, ocupación, DSCR por casa) es la BASE. 
A construir: ficha/activo por casa (ingresos reales, gastos reales por categoría, NOI, deuda, cash flow, ocupación, DSCR, estado) + el consolidado del negocio; que sea la misma lógica del portal del inversor (casa como acción) pero para el CEO/operación. Liga con Items 06/12/24 (ficha 360°/activo). Requiere datos reales (renta real Item 09/27, gastos categorizados Item 31).

### 38 — Informes de Rentas automáticos: ya existe la bandeja — completarlos como Carlos los hace
Pantalla /informes "Informes de Rentas·automáticos": YA tiene los 3 tipos que el equipo hacía a mano: "Semanal·Ocupación y Gestión", "Balance de Rentas" (cartera vencida neteada, aging), "Cartera+Portafolio (combinado)". Genera borrador editable → PDF, snapshot inmutable, programable (semanal lun 8am, cierre de mes). Bandeja con 50 borradores.
Pedido del CEO: "los informes ya sabes cómo los quiero" → que salgan automáticos, con data viva del OS, que CUADREN con la realidad y coincidan con lo que hace Carlos a mano.
A construir/validar: que los 3 informes usen las fuentes ya corregidas (ocupación real 76.5%, cartera neteada = Carlos, gastos categorizados) y que el PDF replique el formato de los informes manuales de Carlos (Ocupación y Movimientos, Cartera Vencida, Utilities). Verificar los totales del PDF generado contra el informe manual (ej. total en mora, distribución jun/jul/ago, ocupación por propiedad). Depende de 27/31/35. (Falta leer a fondo el informe "Utilities 2026" para replicarlo — PENDIENTE.)

### 39 — Remodelación · Dashboard (Unit Economics por Obra): explicar el "GAP" + desglosar y facilitar los números
Pantalla /remodelacion/dashboard → "Unit Economics por Obra". Columnas: Obra · Estado · Draws recibidos · Cobrado (cliente) · GAP · Gasto interno · Utilidad · Rent.% · Avance real.
El CEO no entiende el "GAP". Definición (deducida): GAP = Draws recibidos − Cobrado al cliente (ej. 7105 Bethune $170,000−$130,000=$40,000; 407 Capitol $63,750−$85,000=−$21,250). Es la diferencia entre lo DESEMBOLSADO (draws del préstamo/inversión) y lo FACTURADO al dueño de la casa. Utilidad = Cobrado − Gasto interno; Rent.% = Utilidad/Cobrado.
Pedido del CEO: explicar qué es el GAP y ver los números MUCHO más fácil y desglosado.
A construir: (a) tooltip/explicación del GAP ("dinero recibido en draws vs facturado al cliente — positivo = por facturar/adelanto; negativo = facturado de más") y de Utilidad/Rent.%; (b) desglosar por obra: draws recibidos, cobrado, gasto interno (mano de obra/material/otros), utilidad, margen, avance — de forma clara; (c) verificar de dónde salen (ff_draws / remodel / Airtable) y que cuadren. Liga con "casa como activo" (Item 37) y con el informe "avance_obra_remodelacion" (Item 38). Nota: "Gasto interno" > "Cobrado" en varias finalizadas con utilidad negativa (ej. 1302 Garden Path −$2,052, 9909 Childress −$972) → confirmar si es real (obra con pérdida) o error de datos.

### 40 — [BUG datos] Remodelación: "1 trabajador · 2,144 h · 8 obras" es imposible
Pantalla /remodelacion/dashboard → "Utilización de cuadrillas (28 días): 2,144 h · 1 trabajadores · 8 obras activas" (fuente remodel_worker_hours). 2,144h / 28 días / 1 persona = 76 h/día → imposible. Causa probable: solo 1 trabajador registrado en Airtable mientras las horas se agregan de todas las cuadrillas, o doble conteo de horas. FIX: verificar remodel_worker_hours (nº real de trabajadores vs horas); cargar los trabajadores faltantes en Airtable y/o corregir la agregación. Un trabajador no puede cubrir 8 obras con esas horas — el dato no sirve para gestionar.

### 41 — Remodelación · Dashboard: números fáciles y REALES para inversionista Y cliente
Pantalla /remodelacion/dashboard (Dashboard Ejecutivo·Remodelación): EBITDA limpio $97,761 · Margen bruto 16.8% · Backlog $362,855 · Desviación costo −4.5% · $/sqft real vs cobrado $44.67/$52.38 · tendencia · unit economics por obra.
Pedido del CEO: que estos números sean fáciles de ver, leer y MOSTRAR a un inversionista y a un cliente — números que se usen y sean reales. 
A construir: presentación clara/tangible (como el resto del barrido UX), con cada cifra explicada, y verificada contra datos reales (ligado a Items 39/40: GAP explicado, horas de cuadrilla reales, utilidades negativas confirmadas). Debe servir para reportar tanto a inversionistas (rentabilidad de la obra) como a clientes (avance, valor, calidad).

### 42 — Holding consolidado: EBITDA de Remodelación NO cuadra entre vistas + 1,114 anomalías abiertas
Pantalla /holding (Dashboard Ejecutivo·Holding consolidado): EBITDA consolidado −$104,060 · Cash por empresa $1,466,057 (fix $338k · remo $1.13M · rent/educ "sin libros") · Deuda total 10.53x D/E · Equity portafolio (papel) $6,034,350 · ANOMALÍAS ABIERTAS 1,114 ($8,695,696 de impacto contable sin resolver, ct_findings+sabueso_findings).
La app MISMA declara la inconsistencia en la fila de Remodelación: "v_holding_pnl usa la fórmula VIEJA — el dashboard usa la limpia (declarado)" → la EBITDA de Remodelación difiere entre el holding ($33,856) y su propio dashboard ($97,761). 
FIX: unificar la fórmula de EBITDA de Remodelación (una sola, la "limpia") en v_holding_pnl y en el dashboard → un solo número. Además: (a) atacar las 1,114 anomalías contables ($8.7M) — es enorme; (b) Rentas/Educación "sin libros" en QBO → conectar o marcar; (c) el runway "requiere burn mensual QBO — pendiente". Este holding es un buen tablero raíz; hay que hacer que sus 3 empresas cuadren con sus dashboards individuales (un dato, una fuente, a nivel consolidado).
[AMPLÍA Item 41] El CEO quiere un dashboard PODEROSO pero SOLO de Remodelación: cómo van las remodelaciones, qué casas están activas, cuánto se gana por casa y en la empresa. El Dashboard Ejecutivo·Remodelación es la base; hacerlo potente, claro y real (obras activas, utilidad por obra, total empresa) — para mostrar a inversionista y cliente.

### 43 — [CRÍTICO · posible pérdida de trabajo] Remodelación · remodel-pro: estimaciones en $0 / duplicados
Pantalla /remodelacion/remodel-pro ("Proyectos de remodelación", 31 proyectos). El CEO ve casas en $0 que ya había estimado y teme que "se le borran las cosas que hace".
Diagnóstico (de la captura): parecen DUPLICADOS, no borrado — coexisten registros con datos y otros vacíos en $0 con la misma dirección aprox.: "Arthur Stiles Rd" $141,963 planning ↔ "1003 Arthur Stiles Rd" $0 active · "2422 Bitter creek" $89,815 completed ↔ "2425 Bitter Creek Dr" $0 active · "1112 Terry Dr" $0 active (sin gemelo visible). Los estados "active" en $0 sugieren fichas nuevas/vacías creadas por el sync o cargadas a mano sin presupuesto.
RIESGO REAL a verificar YA: que el sync de Airtable (o un guardado) NO esté SOBRESCRIBIENDO/duplicando las estimaciones del CEO (mismo tipo de incidente que el "los datos no se actualizaban"). 
FIX: (1) verificar en la base la tabla de proyectos de remodelación: ¿hay duplicados por dirección? ¿el sync hace upsert por una clave estable (address_norm) o crea registros nuevos? (2) proteger el trabajo del CEO: que el sync NO pise campos editados a mano (patrón override, como en el modelo del inversor); (3) deduplicar/mergear los $0 con su gemelo con datos; (4) confirmar con el CEO qué estimó para no perder nada. ANTES de correr cualquier sync de remodelación, respaldar. Prioridad alta — es confianza en el sistema.
Nota: el bug del SVG crudo (Item 26) también aparece aquí en la barra superior.
CONFIRMACIÓN: el Estimador (remodel-pro → Estimar → Pronóstico) MUESTRA la alerta "⚠ 4 duplicados por dirección" y "Diagnósticos guardados (12)". O sea la app ya detecta los duplicados por dirección → usar eso para deduplicar. La estimación del CEO SÍ está guardada (ej. Arthur Stiles $41,658, $28/sqft); tranquilizar al CEO: no se borra, hay que limpiar duplicados y blindar el sync.

### 44 — QA / regresión: verificar que TODOS los flujos sirvan y nada esté roto  [CEO]
El CEO pidió revisar que todos los flujos estén funcionando, que no haya nada roto, para que los sistemas realmente sirvan.
A construir/ejecutar: una pasada de QA por sistema (Fix&Flip, Rentas/PM, Cobranza, Remodelación, Portal Inversor, Holding): que cada pestaña cargue sin quedarse en blanco/congelada, sin errores de consola, con datos; probar los flujos clave (crear/editar/guardar estimación, cargar pago, generar informe, crear distribución, ver casa, etc.). Los agentes expertos ya listaron bugs (SVG crudo, monolitos, re-render por innerHTML, RLS/auth). Convertir en un checklist de "flujos que deben funcionar" y verificarlos en carga normal logueada en empresa-os-admin. DoD: lista verde de flujos + bugs corregidos.

### 45 — [BUG] Remodelación · remodel-pro: la pestaña "3 Estimaciones" se congela / queda en blanco
Pantalla /remodelacion/remodel-pro → Estimar → pestaña "3 Estimaciones": al abrirla, el contenido queda EN BLANCO (congelado), no renderiza. Bug real (posible error de JS que corta el render, o carga pesada sin estado de carga). FIX: revisar la consola en esa pestaña, capturar el error, arreglar el render, y agregar estado de "cargando" / manejo de error para que nunca quede en blanco. Liga con Item 44 (QA de flujos) y con el patrón de re-render frágil que señalaron los agentes.

### 46 — IA Agente de Remodel Pro → parte del CEREBRO central + no está activo
Pantalla /remodelacion/remodel-pro → pestaña "IA Agente — Claude para Remodel Pro". Hoy puede: agregar/modificar actividades del proyecto, sugerir suppliers/precios, generar SOW, validar presupuesto vs benchmarks; tiene acceso a catálogo, suppliers, 5 casas calibradoras y el proyecto cargado. PERO no está activo: dice "Para que funcione, deployá la Edge Function: supabase functions deploy remodel-ai --no-verify-jwt --use-api y seteá ANTHROPIC_API_KEY".
Pedido del CEO: que este agente sea EXPERTO de TODO el negocio y pueda analizar todos los números, casas, proyectos e info de remodelación para responder lo que se necesite.
A construir: (1) desplegar/activar la edge function remodel-ai + ANTHROPIC_API_KEY (⚠ y con auth: los agentes marcaron que --no-verify-jwt sin requireAuth es un riesgo — asegurar auth); (2) que NO sea un agente aislado de remodelación sino una FACHADA del Cerebro central (Item 25): mismo cerebro, con contexto de remodelación + acceso al resto del negocio (Airtable, QBO, Supabase) según permisos. Un solo cerebro, muchas caras (inversor, remodel, admin). Liga con Items 23/25.

### 47 — [SUBIR PRIORIDAD] SVG crudo (Item 26) es TRANSVERSAL en toda Remodelación
Confirmado: el markup <svg class="icn"...> impreso como texto aparece en TODAS las pantallas de Remodelación (remodel-pro: Proyectos, Estimar, Calibración, IA Agente) y en /rentas/property-manager. No es puntual — es el mismo componente de barra/ícono roto en el prod viejo. Subir la prioridad del Item 26 (P0 visual): arreglar el ícono + redeployar la rama al dominio que ve el CEO (P0-DEPLOY de los agentes). Es de las primeras cosas visibles a arreglar.

### 48 — [datos] Command Center Remodelación: números que NO cuadran / confunden + cuestionario Alejandra
El CEO dice que estos números no le hacen sentido. Análisis (Command Center /remodelacion/command-center):
· "Servicio (remodelación) $234k" = ganancia bruta de la EMPRESA de remodelación (19 finalizadas, margen 17%). OK como concepto.
· "Costo Fix & Flip $240k" = lo que Fix&Flip PAGÓ por remodelación (intereses+servicios+muebles).
· "Total empresa -$6.8k" = $234k − $240k → ⚠ ENGAÑOSO: resta la ganancia de una empresa contra el costo de otra; no es una utilidad real, es un netting intercompañía mal presentado. Redefinir o quitar.
· ⚠ DOS EBITDA: Command Center "utilidad neta $80.9k" (overhead $153k = nómina $106k+gastos $34.6k+plataformas $12.4k) vs Dashboard Ejecutivo "EBITDA $97,761" (overhead $135,828). Overhead distinto → EBITDA distinto. UNIFICAR una sola fórmula/fuente.
· "1 trabajador 2,144h" (Item 40) contamina la nómina/overhead → los números de utilidad neta dependen de nómina mal contada.
· Estimado vs Real: Presupuesto $1.3M vs Real $1.19M → desv -$110k (-8%): gastaron MENOS de lo presupuestado (bien); por casa unas sobre (rojo) otras bajo (verde). Gasto por tipo: Material $565k / Mano de obra $567k (50/50). Total gastado finalizadas $1,132,516.
FIX: reconciliar todos estos números a una fuente única; redefinir "total empresa"; unificar EBITDA; arreglar nómina (Item 40). → Cuestionario de fuentes generado: "CUESTIONARIO-FUENTES-Alejandra-Remodelacion.xlsx" (Alejandra confirma la ruta Airtable de cada número, como Juan/Carlos).

### 49 — Remodelación (Estimado vs Real y todo el módulo): leer e interpretar FÁCIL para decidir — por casa y general, por tiempo y dinero
Pedido del CEO (repetido, ahora en Estimado vs Real): que la info se lea e interprete FÁCIL para tomar decisiones — que se pueda ver POR CASA y EN GENERAL, y bien por TIEMPOS y por DINERO. Hoy "no se entiende".
A construir: aplicar el rediseño UX (Item 24) al módulo Remodelación: KPIs claros con su explicación, color semántico correcto (desviación negativa = bajo presupuesto = bueno, hoy confunde), vista por casa (estimado vs real, $ y días, rentabilidad, líder) y vista general (empresa), separando claramente TIEMPO (días plan vs real, % a tiempo) y DINERO (presupuesto vs real, desviación, margen). Que un vistazo diga "cómo vamos en obras: cuánto, cuándo, cuánto ganamos". Liga con Items 37/41 (casa como activo) y 24 (UX).

### 50 — Ficha de casa (360°): TODO el detalle de remodelación (gastado, por gastar, tiempos, utilidad, salud)
Pantalla /casa/<addr> "Ficha de casa" (ej. 3403 Charles Street). Ya tiene buena base: Etapa, All-in, ARV, Equity incorporado, ciclo de vida, Fix&Flip (compra/rehab/MAO/cash-out/HML), Ficha de obra (estado·avance, líder, inicio→estimada→real, draws, material est→real, trabajadores est→real, presupuesto·%gastado, por gastar, utilidad preliminar), Rentas, y "Cerebro · esta casa".
Pedido del CEO: en la ficha ver TODO lo de la remodelación al detalle: cuánto vamos gastado, cuánto queda por gastar, tiempos y demás. Y responder: ¿cuánto vamos a ganar? ¿el negocio está saludable? ¿vamos bien en rentabilidad y tiempo?
⚠ INCONSISTENCIA detectada en la Ficha de obra de Charles St: "Presupuesto $85,000 · 129% gastado" PERO "Por gastar $99,096" y real gastado ≈ $10,623 (Material $5,623 + Trabajadores $5,000, avance 6%). El "129% gastado" compara DRAWS recibidos ($110k) contra presupuesto ($85k), mientras "por gastar" usa el gasto REAL — MEZCLA draws con gasto real → número engañoso. Además el "Líder" muestra rec ID (Item 03) y "faltan draws" con rehab real cargado (Item 05).
A construir: ficha de obra clara y coherente que muestre, sin mezclar conceptos: PRESUPUESTO · GASTADO REAL (a la fecha) · POR GASTAR (presupuesto − gastado real) · % avance físico · TIEMPO (inicio→estimada→real, retraso) · UTILIDAD proyectada al cierre (con nota "preliminar, obra en curso"). Y un veredicto simple de salud (en presupuesto / a tiempo / rentabilidad esperada) — verde/ámbar/rojo. Que responda de un vistazo "cuánto llevamos, cuánto falta, cuándo termina, cuánto ganaríamos". Depende de arreglar draws vs gasto real (Items 05/48). Es el corazón de "casa como activo" (Items 06/37).

### 51 — Informes SEMANALES de obra por casa (EVM) — verlos NATIVOS en la app + generar el informe
El CEO subió 6 informes semanales por casa (Arthur, Bitter Creek, Denfield, Starbright, Wellington, Charles Street), corte 18-ago. Estructura (aprendida):
· Portada: casa, dirección, corte, estado (obra en curso / PAUSADA).
· Resumen ejecutivo: Avance físico real % · Presupuesto ejecutado % ($X de $Y) · ICT (Índice Cumplimiento Cronograma = avance real ÷ tiempo consumido) · Atraso proyectado (días).
· Avance financiero: gasto MO %/$ · gasto materiales %/$ · total ejecutado %/$ · saldo disponible %/$.
· ICT con semáforo: ≥0.95 a tiempo · 0.80–0.95 atención · <0.80 crítico.
· Proyección de cierre: días de atraso, fecha real estimada, SEMÁFORO COMBINADO costo (CPI) + cronograma (SPI/ICT) — "basta que un pilar esté en rojo".
· Diagnóstico EVM completo (imagen del dashboard EVM).
Ejemplos reales: Wellington avance 75% · presup 56.3% · ICT 0.68 (crítico) · CPI 1.33 · atraso ~27d. Starbright 73% · 67.3% · ICT 0.76 · CPI 1.08 · atraso ~20d. Charles Street PAUSADA · 5% · 12.8% ($10,856 de $85k).
Pedido del CEO: ver TODO esto DENTRO de la app sin tener que generar informes a mano, PERO también poder generar el informe. Ver fácil.
Bueno: la app YA tiene EVM (menú: Gestión EVM, Valor Ganado EVM) → puede hostear esto nativo. A construir: (a) vista de seguimiento semanal de obra por casa con avance físico, presupuesto ejecutado (MO/materiales/total/saldo), ICT+CPI+SPI con semáforo, proyección de cierre (atraso, fecha estimada) — igual que el informe; (b) botón "generar informe" (PDF/PPTX) con ese mismo formato; (c) CONFIRMAR que los números de la app = los del informe manual (avance, presupuesto ejecutado, ICT). El ICT es un indicador propio del equipo — implementarlo en el motor EVM. Liga con Item 33/38 (informes automáticos) y 49/50 (obra clara).

### 52 — Nómina y Pagos: fácil de ver/mover/PAGAR + generar el informe de pago  [+ BUGS de datos]
Pantalla /remodelacion (Nómina y Pagos): Deuda neta total $81,409 (devengado − pagado) · Deuda por trabajador (horas/devengado/pagado/deuda) · Historial de pagos quincenales (recibo firmable, write-back a "Nomina Trabajadores en Campo" Airtable, dry-run) · botón "Generar pago quincenal (desglose por casa · recibo firmable)".
El CEO subió el informe manual "Pago de Horas de Trabajo Semana" (por casa: Denfield $2,511.37, Starbright $3,670.96, Wellington $3,273.60, Arthur $1,305.60, con el detalle por trabajador).
Pedido del CEO: que los pagos se puedan SACAR fácil, ver, entender y mover para poder pagar y sacar el informe de pago.
A construir: flujo de pago claro (por casa y por trabajador, horas × tarifa, devengado/pagado/deuda), fácil de revisar y aprobar, y generar el "informe de pago" (PDF por casa, igual al manual). ⚠ SEGURIDAD: el write-back a Airtable/pago es una función sensible (los agentes marcaron writebacks sin auth) → requiere aprobación y PAT con scope write; NO ejecutar pagos automáticamente.
⚠ BUGS de datos detectados aquí: (1) "Noe Hilario" aparece DUPLICADO (269h deuda $4,840 Y 2135h con pagado $33,376) — trabajador duplicado; (2) en esa 2ª fila el PAGADO ($33,376) es MAYOR que el DEVENGADO ($6,398) → imposible, dato roto; (3) esto CONTRADICE el card "1 trabajador · 2,144h" del Item 40 (aquí hay ~20 trabajadores) → confirmar la fuente real de trabajadores/horas. Deduplicar trabajadores y cuadrar devengado/pagado.

### 53 — [CRÍTICO] Gestión EVM: los números NO cuadran con los informes manuales + la pantalla se contradice sola + UX
Pantalla /remodelacion → Gestión (EVM). Fuente v_remodel_avance_vivo. Problemas:
(a) NO coincide con los informes semanales manuales (corte 18-ago):
   · Wellington: app gasto real $43,380 (37%) / atraso +3d / CPI 1.91  vs  informe $65,632 (56.3%) / ~27d / CPI 1.33.
   · Starbright: app $48,057 (46%) / +10d / CPI 1.57  vs  informe $70,655 (67.3%) / ~20d / CPI 1.08.
   · Charles St: app 1% avance $5,623 (6%)  vs  informe 5% $10,856 (12.8%); presup app $86,638 vs $85,000.
   Causa probable: la app SUBCONTABILIZA el costo (sobre todo MANO DE OBRA — mismo problema de nómina duplicada / horas mal contadas Item 40/52) y el cronograma/atraso usa otra lógica (no el ICT del equipo). Por eso gasto real ≈ mitad y atraso mucho menor.
(b) LA MISMA PANTALLA SE CONTRADICE: la tabla "Planeado vs Real" y la tabla "EVM por casa" dan SPI/CPI DISTINTOS para la misma casa: Charles St 0.02/0.15 vs 0.13/0.48; Arthur Stiles 1.02/3.86 vs 0.70/1.42; Wellington SPI 0.95 vs 0.71. Dos cálculos de EVM en una sola vista → un dato, dos fuentes.
(c) UX: el CEO no entiende estos números; deben verse fáciles y de interpretación muy sencilla para decidir y ver "cómo va la obra".
FIX: (1) UNA sola definición/fuente de EVM (avance físico, gasto real completo con MO real, SPI, CPI, ICT, atraso) que cuadre con los informes manuales — arreglar primero el costo de mano de obra (nómina real por casa) y el gasto real total; (2) implementar el ICT del equipo (avance real ÷ tiempo consumido, semáforo ≥0.95/0.80/<0.80) y el semáforo combinado CPI+ICT; (3) unificar las dos tablas EVM en una; (4) rediseño simple (semáforo por casa: a tiempo / atención / crítico; "avance X%, gastado Y%, atraso Zd, cierre estimado", un vistazo). Verificar contra los 6 informes (Wellington ICT 0.68, Starbright 0.76, etc.). Liga con Items 40/48/51/52 (costo real, nómina, informes EVM).

### 54 — EVM en LENGUAJE de niño: "va rápida/lenta" y "va cara/barata" (no SPI/CPI crudo)
El CEO no entiende SPI/CPI; quiere entender su negocio fácil, "como un niño que no sabe nada de esto".
A construir: en toda la vista EVM (y en la ficha de obra), traducir la jerga a lenguaje simple con semáforo:
· CPI → "¿va cara o barata?" (>1 barato/bueno, <1 caro/malo).
· SPI → "¿va rápida o lenta?" (>1 adelantada/buena, <1 atrasada/mala).
· Mostrar la etiqueta simple por casa ("barata pero lenta", "cara y lenta", "a tiempo y barata") + semáforo verde/ámbar/rojo, y el número técnico solo en un tooltip "ver detalle". Cada obra debe leerse de un vistazo: cómo va en tiempo y en plata, y qué hacer. Parte del rediseño (Item 24) aplicado a Remodelación (Item 49/53).

### 55 — [UX] EVM: espacio vacío desperdiciado (layout)
Pantalla Gestión EVM: la tabla "EVM por casa" es angosta y a su derecha queda medio pantallazo en BLANCO (hueco desperdiciado); "Avance de obra EN VIVO" queda en una columna estrecha. El layout no aprovecha el ancho. FIX: reorganizar el grid para llenar el ancho (ej. tabla a ancho completo o 2 columnas balanceadas), sin huecos muertos. Parte del rediseño UX (Item 24). Nota: el panel "Avance de obra EN VIVO" SÍ tiene buen contenido (avance técnico/financiero/temporal, ganancia proyectada, "qué revisar") — aprovecharlo, no esconderlo en una columna angosta.

### 56 — Reportes CEO: vista clara para DECIDIR (por casa y negocio general)
Pantalla /remodelacion → Reportes CEO. El CEO quiere ver FÁCIL, por casa y en general: cuánto estamos haciendo · cuánto y CÓMO estamos gastando · cuánto nos queda · cuánto hemos hecho en total · DÓNDE se está yendo el dinero → información buena para tomar decisiones del negocio.
A construir: reporte ejecutivo simple y accionable: ingresos/valor generado, gastos por categoría (dónde va el dinero: material, mano de obra, overhead), presupuesto vs gastado vs por gastar, acumulado total, y por casa + consolidado. Lenguaje simple, semáforos, "cómo va el negocio de un vistazo". Debe cuadrar con Command Center/EVM/Estimado vs Real (un dato, una fuente). Liga con 24/49/54 (UX) y 32/36 (finanzas claras).

### 57 — [CRÍTICO] Conteo de obras y EVM del portafolio NO coinciden entre pantallas
El CEO nota: "en un lado dice 8 casas en remodelación, en otro 9, en otro 10". Confirmado en las capturas:
· Obras en curso: Command Center "8 en curso" · Gestión EVM "6 obras" · Valor Ganado (EVM) "7 obras" (incluye 5813 Cedardale 0%) · Planner "9 obras". (Y remodel-pro "31 proyectos", 27 obras totales.)
· EVM del portafolio se contradice: Gestión EVM → CPI 0.89 / SPI 0.67. Valor Ganado (EVM) → CPI 1.63 / SPI 0.63. Mismo concepto, dos páginas, dos números.
Causa: cada vista define distinto "obra en curso" (en construcción vs con baseline vs con actividades en el planner) y calcula EVM con otra fórmula/fuente.
FIX: UNA definición canónica de "obra activa/en curso" y UN cálculo de EVM del portafolio, usados por Command Center, Gestión EVM, Valor Ganado, Planner y Reportes CEO. El conteo de casas debe ser idéntico en toda la app. Verificar nada roto y mostrar lo mismo en todos lados. Liga con Item 53 (EVM) y el principio transversal.

### 58 — Conectar DIAGNÓSTICO ↔ ESTIMACIÓN ↔ PLANNER (desviaciones compartidas, todo el mismo negocio)
El CEO: las desviaciones deben COMPARTIR info entre el diagnóstico (visita previa/patologías), la estimación de remodelación (pronóstico $/ft²) y el Planner (cronograma real), para poder analizar DIAGNÓSTICO vs PLANEADO vs REAL conectado — es el mismo negocio y las mismas casas.
A construir: un hilo por casa que una: (1) diagnóstico inicial (Taskade/visita, patologías, alcance), (2) estimación/pronóstico (presupuesto por fase, $/ft²), (3) planner (cronograma planeado) y (4) real (avance físico, gasto real, atrasos). Que las desviaciones (costo y cronograma) se calculen sobre esa misma base y alimenten la calibración del estimador y el EVM. Hoy están en módulos separados; conectarlos por casa (address_norm / id de obra) para tener diagnóstico→planeado→real en un solo lugar. Liga con 51/53 (EVM) y 43/45 (estimador).

### 59 — CEREBRO (ampliación): experto del negocio + debe reconciliar TODO (extiende Item 25)
El CEO reitera: el Cerebro debe ser experto en el negocio y en TODOS los números y casas propias. Además, debe ser quien detecte/reconcilie inconsistencias como el conteo 8/9/10 (Item 57). El Cerebro central (Items 23/25/46) debe conocer la definición canónica de cada métrica y avisar cuando dos pantallas no cuadran. (No es solo un chat: es el guardián de "un dato, una fuente".)

### 🔁 PRINCIPIO TRANSVERSAL (aplica a TODO el barrido)

### 🔁 PRINCIPIO TRANSVERSAL (aplica a TODO el barrido)

### 🔁 PRINCIPIO TRANSVERSAL (aplica a TODO el barrido)

### 🔁 PRINCIPIO TRANSVERSAL (aplica a TODO el barrido)

### 🔁 PRINCIPIO TRANSVERSAL (aplica a TODO el barrido)
El CEO pidió: confirmar que cada dato se trae del LUGAR CORRECTO (Airtable = fuente), esté ACTUALIZADO/AL DÍA (sync fresco) y bien organizado. En cada ajuste hay que validar fuente + frescura, y no recalcular lo que la fuente ya tiene (como pasó con el déficit).
