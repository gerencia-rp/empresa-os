# Jarvis · Modelo de continuidad operativa

**Estado:** implementación incremental  
**Objetivo:** que el holding pueda sostener su operación durante una ausencia prolongada del CEO sin perder control, evidencia ni rentabilidad.

## Principio operativo

Jarvis automatiza la observación, el análisis, la priorización, la coordinación, los borradores y los reportes. Las acciones irreversibles o reguladas conservan un responsable humano por rol: pagos, contratos, movimientos contables, credenciales, mensajes externos sensibles, contratación/despido y cambios de producción de alto riesgo.

Autonomía no significa ausencia de gobierno. Significa que el sistema detecta, asigna, persigue, comprueba y escala el trabajo sin depender de que el CEO recuerde cada paso.

## Flujo objetivo

1. Las fuentes canónicas se sincronizan y declaran su frescura.
2. Los agentes especialistas revisan excepciones y producen evidencia.
3. Cada gerente de empresa consolida una foto ejecutiva y tres decisiones máximas.
4. El Director de Continuidad comprueba fallos, huecos, decisiones envejecidas, crons y reportes faltantes.
5. El Cerebro Matutino reúne las fotos y la revisión de continuidad en una directiva única.
6. El trabajo reversible se ejecuta dentro de límites; lo sensible se enruta al responsable humano del rol, no necesariamente al CEO.
7. Toda resolución deja evidencia, resultado y aprendizaje reutilizable.

## Cadencia de reuniones entre agentes

| Cadencia | Participantes | Resultado obligatorio |
|---|---|---|
| Diario 06:50 | Director de Continuidad + auditoría de sistemas | Excepciones de continuidad y fuentes desactualizadas |
| Diario 07:30 | Gerentes de Rentas, Remodelación y Fix & Flip | Foto por empresa, top 3 decisiones y cola priorizada |
| Diario 07:35 | Cerebro Matutino + Director de Continuidad + gerentes | Directiva única, responsables y decisiones sensibles |
| Lunes 07:10 | Continuidad + gerentes + Auditor de Agentes | Capacidad, fallos repetidos, tareas sin dueño y mejoras de proceso |
| Día 1 07:10 | Continuidad + Finanzas + Capital/Inversionistas | Cierre, margen, caja, compromisos, distribuciones y riesgos del mes |

## Cobertura mínima por negocio

| Área | Debe observar | Debe producir | Escala cuando |
|---|---|---|---|
| Rentas | ocupación, mora, contratos, servicios, tareas, gastos | cobranza preparada, plan de ocupación, reporte operativo y financiero | dinero, contrato, desalojo o mensaje sensible |
| Remodelación | avance, presupuesto, materiales, nómina, draws, calidad | plan diario, desviaciones, inspección, pronóstico y reporte | cambio de alcance, pago, draw o riesgo de seguridad |
| Fix & Flip | adquisición, underwriting, HML, etapas, salida, inversionistas | escenarios, plan por propiedad, capital y reporte de retorno | oferta, deuda, venta/refi o distribución |
| Educación | estudiantes, avance, tareas, comunicaciones y riesgo de abandono | seguimiento, alertas, plan de éxito y reporte de cohorte | comunicación sensible, cambio contractual o devolución |
| Holding | P&L, caja, libros, decisiones, capital y riesgos | directiva, cierre, variaciones y prioridades | pago, asiento, firma, credencial o obligación legal |
| Sistemas | sincronizaciones, crons, seguridad, errores y linaje | salud, incidentes, recuperación y evidencia | secreto, permiso, caída o cambio destructivo |

## Prueba de que un agente funciona

Un agente cuenta como operativo únicamente si tiene:

1. ejecutor real;
2. horario o disparador;
3. responsable y respaldo;
4. misión y tareas claras;
5. evidencia reciente;
6. estado promovido después de validación;
7. ruta de escalamiento;
8. métrica de resultado, no solo de actividad.

## Brechas que deben cerrarse por fases

1. Incorporar continuidad a la reunión matutina y hacer visibles sus excepciones.
2. Profundizar Finanzas del Holding, Capital/Inversionistas, Educación y Confiabilidad como dominios verificables.
3. Asignar respaldo por rol para que ninguna aprobación dependa exclusivamente del CEO.
4. Medir resultados por agente: dinero recuperado/protegido, tiempo ahorrado, errores evitados y SLA cumplido.
5. Convertir fallos repetidos en cambios de proceso; no limitarse a crear más alertas.
6. Probar escenarios de ausencia: fuente caída, agente sin correr, responsable ausente y decisión vencida.

## Absorción del equipo antiguo

Los puestos transversales anteriores no se consideran eliminados por estar ocultos. Cada responsabilidad debe tener un dueño canónico con ejecutor, horario y evidencia. La prueba versionada es `npm run audit:coverage`.

Tres traspasos permanecen deliberadamente como paridad pendiente hasta ver evidencia real en producción: liderazgo contable transversal, auditoría integral de datos y señales del antiguo Sabueso Contable. El Director de Continuidad los coordina, pero no se declararán absorbidos por completo solo por existir una ficha.

Educación deja de ser un hueco silencioso: el Gerente de Éxito Estudiantil revisa estudiantes activos sin plan, inactividad, riesgo, planes sin tareas y trabajo pendiente. Solo reporta y propone; no modifica planes ni contacta estudiantes sin aprobación.

## Indicadores de autonomía segura

- porcentaje de procesos críticos con dueño primario y respaldo;
- porcentaje de agentes con evidencia dentro de su SLA;
- decisiones abiertas por antigüedad y nivel de riesgo;
- tiempo medio de detección y resolución de excepciones;
- reportes esperados vs entregados por empresa;
- frescura de cada fuente canónica;
- mejoras implementadas y efecto económico verificado;
- acciones sensibles ejecutadas sin aprobación: debe ser siempre cero.
