TAREA: que el tablero no sea solo bonito — que FUNCIONE de verdad y sea ÚTIL cada día.
Conectá cada pantalla a datos reales y prendé la inteligencia por debajo. Guardrails intactos:
SOLO LECTURA; pagos/ejecución SIEMPRE tras confirmación humana (cola de "Decisiones por aprobar").

Si algo ya está hecho (AUDITORIA / git log), confirmalo breve y seguí con lo que falte.

1. DATOS REALES en cada sección (de las fuentes únicas, no recalcular):
   - Inicio: KPIs vivos (caja del mes, caja atrapada, ocupación, cartera).
   - Casas: ficha por casa (all-in, ARV, renta real, gastos, si drena/genera, etapa, semáforo).
   - Rentas: ocupación real (v_ocupacion), cobros del mes, morosos (v_cartera_kpi).
   - Remodelación: obras activas, gastado vs presupuesto, "a tiempo/atrasada" en simple.
   - Inversionistas: aporte, % , distribuciones.
   - Cobros y pagos: lo que se debe y lo que hay que pagar, con su fuente.

2. REUNIÓN DIARIA DEL CEREBRO (07:30, cron): lee lo de cada área, arma la "Directiva del día"
   (una prioridad clara) + la cola de "Decisiones que necesitan tu sí", y guarda un acta en
   memoria (tipo=decisión, fecha, porqué). Proactivo, no solo responde cuando le preguntan.

3. MEMORIA que aprende: cada aprendizaje con tipo/fuente/hora; tarea 3am que fusiona repetidos
   e invalida contradicciones (que no se pudra). Confirmá que pm_brain_memory soporta esto.

4. ENRUTAR MODELO POR ROL (ahorro): Opus para los que deciden (Cerebro, cobros/ventas, analista
   de reconciliación); modelo barato de ventana grande para los que barren volumen (mercado,
   reportes, informes de obra). Declarado por rol, no global.

5. CRON que faltan: reunión 07:30, compactación 3am, auditoría de seguridad semanal.

VERIFICACIÓN: build OK + deploy a empresa-os.vercel.app. Probá con datos reales que 3 preguntas
al Cerebro devuelven números correctos y que la Directiva del día se arma sola. Documentá.

Al terminar escribí EXACTAMENTE al final:
    === AUDITORIA COMPLETA ===
