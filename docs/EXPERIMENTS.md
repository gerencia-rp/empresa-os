# Experiments

## Experiment Cards

### EXP-001 — Estado técnico visible
- Hypothesis: Creemos que el equipo detectará fallas antes de que afecten usuarios si existe una comprobación profunda con dependencia, versión y latencia.
- Type: smoke test
- Primary metric & threshold (pre-committed): `/api/health` responde en <5s y distingue ready/degraded.
- Guardrail metric: no expone secretos ni datos personales.
- Decision rule (pivot / persevere / iterate): mantener si detecta dependencia caída y no añade información sensible.
- Result & verdict: pendiente de deploy.

### EXP-002 — Integraciones acotadas
- Hypothesis: Creemos que los procesos dejarán de quedar colgados si toda llamada Vercel crítica tiene timeout explícito.
- Type: regression/resilience
- Primary metric & threshold (pre-committed): 100% de `fetch` en `api/` usa helper acotado; fallos regresan 502/503 dentro del límite.
- Guardrail metric: cero regresiones en golden tests y build.
- Decision rule (pivot / persevere / iterate): mantener si build+tests pasan y el timeout simulado falla rápido.
- Result & verdict: en progreso.

## Experiment Backlog

| Idea | ICE (impact/confidence/ease) | Status |
|---|---|---|
| Evidencia fechada en cada agente | 9/9/6 | pendiente |
| Centro único de decisiones con contexto | 10/8/6 | pendiente |
| QA autenticado de todas las rutas críticas | 10/9/5 | en progreso |
| Presupuesto de rendimiento por bundle/ruta | 8/8/7 | pendiente |

### EXP-003 - Revisión semanal unificada

- Hypothesis: Creemos que Nicolás puede dirigir una semana multiplataforma sin abrir otra herramienta si ve contexto estratégico, estado de producción, embudo y aprendizaje en una sola revisión.
- Type: concierge / prototype test
- Primary metric & threshold (pre-committed): aprobar, rechazar o reprogramar cinco piezas en menos de 15 minutos y sin explicación externa.
- Guardrail metric: ninguna cifra demo se interpreta como real; ninguna acción escribe en servicios externos.
- Decision rule (pivot / persevere / iterate): perseverar si completa 5/5 decisiones; iterar si completa al menos 4/5 con una sola confusión recurrente; replantear el flujo si completa 3/5 o menos.
- Result & verdict: awaiting-evidence.

## Growth Command Center Experiment Backlog

| Idea | ICE (impact/confidence/ease) | Status |
|---|---|---|
| Prioridad automática basada en cuello de botella del embudo | 9/6/7 | pendiente |
| Importar calendario de Metricool en modo lectura | 8/8/6 | pendiente |
| Vincular entregables de Google Drive | 8/7/5 | pendiente |
| Registrar aprendizajes aprobados en Supabase | 9/7/5 | pendiente |
| Medir hallazgos previos frente a retrabajo posterior del consejo de calidad | 9/6/6 | pendiente |

### EXP-004 — Batería operativa de agentes

- Hypothesis: Creemos que Nicolás puede evaluar y dirigir el equipo digital si cada uno de los nueve agentes ejecuta una misión real sobre el mismo brief, entrega una salida estructurada y el Consejo de Calidad revisa el conjunto al final.
- Type: smoke test funcional con supervisión humana.
- Primary metric & threshold (pre-committed): 9/9 agentes completan; cada resultado incluye entregables, evidencia, supuestos, riesgos y próximos pasos; el Consejo de Calidad recibe las salidas previas.
- Guardrail metric: cero publicaciones o escrituras externas; cero afirmaciones de acceso a fuentes no conectadas; cero promesas de viralidad, ventas o ausencia total de fallos.
- Decision rule (pivot / persevere / iterate): perseverar con 9/9 y dictamen utilizable; iterar si alguna salida completa pero requiere revisión; bloquear si una ejecución falla, omite el contrato o simula evidencia externa.
- Result & verdict: primera batería real ejecutada el 04-sep-2026; 9/9 solicitudes alcanzaron el proveedor, pero Opus rechazó un parámetro obsoleto y cuatro respuestas Haiku agotaron el presupuesto antes de cerrar JSON. Corrección aplicada: eliminar `temperature`, imponer límites de concisión y ampliar el presupuesto. Repetición completa pendiente.
