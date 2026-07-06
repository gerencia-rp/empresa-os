# Blueprint del Ecosistema — Flipping Rentals OS
### El sueño, empresa por empresa (norte para construir con Fable 5)

Esta es la visión completa de cómo el CEO quiere ver la empresa. Cada sección = **[Tu visión]** (lo que pediste) + **[+ Mis agregados]** (mejoras de experto para que sea clase mundial) + **[Data]** (de dónde sale, tablas reales ya auditadas). Educación queda afuera por ahora. Todo respeta los 5 Pilares, `property_id` como columna vertebral, y soft-delete.

---

## Principios transversales (aplican a las 5 áreas)

- **Columna vertebral `property_id`:** una casa = un registro que fluye por todas las empresas. La **Ficha de Casa** es la vista única de su ciclo de vida (compra → obra → renta → salida). *(Se está poblando ahora.)*
- **Motor de supuestos único:** cada calculadora lee sus supuestos de una config (nada hardcodeado). Cambiar un supuesto (ej. $/sqft, tasa HML) se propaga a TODAS las calculadoras — una sola verdad.
- **[+ Motor de predictibilidad / calibración]** *(mi agregado clave):* cada calculadora se afina contra los **resultados reales de las casas ya cerradas**. Entrega **bandas de confianza** (rango probable), no un solo número inventado. Cada casa nueva que se cierra hace que el sistema aprenda y prediga mejor.
- **Proyectado vs Real siempre visible:** en todo sistema se ve la desviación entre lo que se planeó y lo que pasó.
- **Informes / KPIs / export** en cada sistema. Soft-delete y audit trail en todo.

---

## 1 · FIX & FLIP — empresa matriz
*Compra las casas, las pone a disposición de Remodelación, y después renta o vende.*

### 1.1 Dashboard de casas + flujo de procesos
- **[Tu visión]** Ver todas las propiedades y el flujo de procesos de cada una: `Lead → Bajo contrato → Comprada → En remodelación → En renta/venta → Salida (refi/vendida)`.
- **[+ Mis agregados]** Semáforos por casa: all-in > 75% ARV, **vencimiento HML cerca** (hoy nadie los alerta), desvío de presupuesto. Próximos hitos por casa.
- **[Data]** `ff_deals`, "Datos por casa" (HML: monto, tasa, vencimiento, draws), `property_id`.

### 1.2 Suite de calculadoras — **motor de underwriting unificado**
- **[Tu visión]** Las calculadoras con las que se opera: **ARV**, **MAO** (precio máximo de oferta), **cuánto pedir al inversionista**, **hipoteca / préstamo Harmony (HML)**, **cuánto queda de la renta**. Todas usando la data histórica de casas ya desarrolladas.
- **[+ Mis agregados]** *Todas comparten UN modelo por casa y un set de supuestos* (hoy están sueltas → unificarlas evita el problema de "dos definiciones"; cambiar el ARV recalcula todo en cascada). Reglas del negocio ya en memoria: `MAO = ARV×75% − rehab − holding − closing − lender fees − contingencia`; con Harmony solo se pagan intereses; refi no supera el pago actual. **Escenarios best/base/worst + sensibilidad** (¿y si ARV −10%, rehab +15%?).
- **[Data]** `ff_deals`, `ff_hml_payments`, histórico de $/sqft por zona (casas vendidas).

### 1.3 Selector de modelo por casa
- **[Tu visión]** Por cada casa: qué **modelo** se está haciendo (Fix & Flip / BRRRR / Renta / Wholesale), **participación nuestra vs. inversionista**, y según el modelo elegido calcular **rentabilidad, proceso y modelo de negocio**.
- **[+ Mis agregados]** Elegir el modelo cambia qué calculadoras y qué flujo aplican, y el waterfall de participaciones.
- **[Data]** `ff_deals`, `ff_investors`.

### 1.4 Portal del inversionista (independiente, solo lectura)
- **[Tu visión]** Portal donde el inversionista ve **todos los números de su proyecto**.
- **[+ Mis agregados]** Cada inversionista ve SOLO lo suyo (aislamiento total de datos), con capital account, **waterfall de retornos**, distribuciones, estado y timeline de la casa. Retorno 15–18%, buy-out capital+15% (reglas de negocio).
- **[Data]** `ff_investors`, `ff_draws`, `property_id`.

### 1.5 Generador de presentaciones para el inversionista
- **[Tu visión]** Generar la presentación con **números reales** y trayectoria → un pitch de negocio para venderle la inversión.
- **[+ Mis agregados]** Incluir **track record real** (nuestras casas cerradas, ROI histórico) como prueba social. *La app ya carga PptxGenJS → se genera el `.pptx` directo.*

### 1.6 Análisis de data + de ejecución
- **[Tu visión]** Analizar toda la data de FF para partir de ahí y optimizar; analizar la **ejecución paso a paso** del negocio para optimizarla.
- **[+ Mis agregados]** Rentabilidad por zona / modelo / inversionista / ciclo; mapa del proceso adquisición → cierre → traspaso a obra → salida, con tiempo y costo de cada etapa.

### 1.7 Predictibilidad y proyecciones
- **[Tu visión]** Que los sistemas sean cada vez más **predecibles** con la info previa, entreguen números más reales, y **proyecciones** a largo plazo de cada casa/inversión.
- **[+ Mis agregados]** El motor de calibración (transversal) convierte cada casa cerrada en aprendizaje → bandas de confianza. Proyección **hold vs sell**, refi, flujo a 5 años, equity build por casa.

### 1.8 Informes / KPIs
- Pipeline value, all-in prom, ARV/compra, margen por casa, capital desplegado, **deuda HML y vencimientos**, ROI por inversionista, ciclo promedio.

---

## 2 · REMODELACIÓN — *lo mismo, ajustado (mucho ya construido)*
- **[Tu visión]** Calculadora de **gasto / tiempo / materiales** (proyección de gasto). **Calendario** que a medida que avanza **optimiza el presupuesto y el estimado, aprende, y muestra la desviación proyectado vs real**. Seguimiento detallado de tareas (cumplidas / por ejecutar). **Control exhaustivo del presupuesto** (material + horas trabajadas). **Bitácoras de avance**. Números por proceso/equipo: pago a empleados, **deudas a trabajadores**, materiales, **costo real** de la obra, rentabilidad. Presupuesto vs ganancia.
- **[+ Mis agregados / estado]** El Planner ↔ Estimador ↔ Command Center **ya están conectados por `property_id`** con un único avance. **Lo que falta cerrar es el aprendizaje:** que el real del Planner **recalibre** el Estimador (la tabla `remodel_obra_calibration` con 20 obras ya existe, lista para eso). Bitácoras auto-generadas desde el Planner. Ledger de "a quién le debemos" (nómina de campo).
- **[Data]** `remodel_projects` (estimado/activities), `weekly_activities` (planner), `remodel_worker_pay_summary`, Pago de Materiales, Horas Trabajadas, `remodel_at_properties`, `remodel_overhead`, `remodel_obra_calibration`.

---

## 3 · RENTAS — *lo mismo, ajustado*
- **[Tu visión]** Plataforma de property management: números, calendario, casas. **Check-in / check-out automáticos**; enviar check-in; **códigos de ingreso + WiFi**. Seguimiento de pagos (pagó / no / atrasado / desalojar, cuánto paga, cuánto debe). Gastos, ganancias, **casas rentadas vs. vacías**. **Alertas** para subir ocupación; alerta cuando sale una persona → mandar **limpieza**; alerta para **podar el pasto**. Cuánto entra / sale / ganancia / gasto + informes.
- **[+ Mis agregados]** **Owner statement** por casa; **escalado de morosidad** (atrasado → aviso → acción); **motor de ocupación** (día vacío = plata perdida → sugiere acción). Ocupación real recalculada bien (91%).
- **[Data]** `pm_properties`, `pm_units`, `pm_bookings`, `pm_payments`, `pm_tenants`, `pm_tasks`, `pm_alerts`.

---

## 4 · OPERACIÓN — área transversal *(candidato #1 para agentes IA)*
- **[Tu visión]** Un departamento de gerencia de operaciones que le hace seguimiento a **todas las tareas de todas las empresas** para asegurar que los equipos rindan al 100%. Cada día, todas las tareas del equipo, gestionadas: claridad de qué hace cada uno, si lo están haciendo, optimizar tiempo y recursos, **que no se pase ni una tarea**, generar nuevas, **detectar cuellos de botella**, generar planes, **medir eficiencia** (persona / equipo / empresa). Que las empresas no solo vayan al 100% sino que se optimicen y crezcan.
- **[+ Mis agregados]** Un **"Ops Brain"** (agente IA) que cruza `property_id`: cada casa tiene tareas en FF / Remodel / Rentas, y el agente las orquesta, alerta atrasos y bloqueos, y da un **score de eficiencia**. **Todo en modo dry-run / propone hasta tu OK** (regla de seguridad de agentes). Se apoya en ClickUp cuando el equipo lo reactive.
- **[Data]** `ops_day_tasks` (+`property_id`), ClickUp, `pm_tasks`, `weekly_activities`.

---

## 5 · CONTABLE — área transversal
- **[Tu visión]** Asegurar que **todos los números concuerden**, que no se pase ninguno, claridad de **cada transacción**, actualizado día a día, para saber realmente cómo están las finanzas.
- **[+ Mis agregados / estado]** El **P&L consolidado del holding ya está en vivo** (`v_holding_pnl`, realizado vs. inyectado). Falta: **conciliación continua** Airtable/Supabase ↔ **QuickBooks**, ledger de transacciones, **cierre diario**, y alertas de descuadre.
- **[Data]** tablas de overhead, `v_holding_pnl`, QuickBooks (cuando lo conectes).

---

## Cómo lo construimos
Fable 5 en **loop autónomo**, empresa por empresa, **empezando por Fix & Flip**. De este blueprint sale el **roadmap (Fase 2)** de FF; después **Fase 3** construye módulo por módulo, verificado contra la data real, con checkpoints tuyos. Todo sobre `property_id` + fuente real + soft-delete, y las calculadoras **calibradas con el histórico** desde el día uno.

### Orden recomendado de build para Fix & Flip
1. **Dashboard de casas + pipeline** (base visual, sobre `property_id`).
2. **Motor de underwriting unificado** (ARV · MAO · aporte inversionista · HML/hipoteca · renta neta) sobre un modelo por casa + supuestos en config.
3. **Calibración con histórico** (predictibilidad + bandas de confianza).
4. **Selector de modelo + participaciones** (nuestra vs inversionista).
5. **Portal del inversionista** (read-only, aislado).
6. **Generador de deck** (PptxGenJS, con track record real).
7. **Proyecciones a largo plazo + informes/KPIs**.
