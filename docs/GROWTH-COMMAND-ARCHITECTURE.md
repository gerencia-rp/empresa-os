# Growth Command Center: arquitectura de la primera entrega

## Contexto

La superficie se construye desde cero y se publica como una aplicación estática independiente dentro de Empresa OS. El código anterior de `/viral` no forma parte de la ejecución nueva. Durante la transición, sus archivos permanecen en el repositorio para que el cambio sea reversible, mientras la regla de Vercel dirige `/viral` al nuevo documento `growth-command.html`.

## Límites

```text
Supabase Auth existente
        |
        v
growth-command.html
        |
        +-- growth/app.js          interfaz y casos de uso
        +-- growth/data.js         contrato y repositorio demo
        +-- growth/agents.js       cliente, persistencia y batería de agentes
        +-- growth/integrations.js verificación y entrega manual
        +-- ui/tokens.css          sistema visual canónico
        +-- ui/icons.js            iconografía canónica
        |
        +-- api/brain-chat?resource=growth-readiness
                estado de configuración, solo para admin activo
        +-- api/brain-chat?resource=growth-agent-run
                inferencia autenticada y salida normalizada por agente
        +-- api/brain-chat?resource=growth-content-research
                perfiles públicos, ranking visible de YouTube y transcripciones

Adaptadores externos, todavía no conectados:
Google Drive | Metricool | Supabase Growth
```

La interfaz depende de un contrato de repositorio, no de un proveedor. La implementación demo expone:

- `getSnapshot()`;
- `updatePieceStatus(pieceId, status)`;
- `updateQaCheck(reviewerId, status)`;
- `updateFirstDayStep(stepId, status)`;
- `updateSignalDecision(signalId, decision)`;
- `reset()`.

El motor de agentes agrega un segundo contrato, separado del repositorio demo:

- `catalog()` describe los nueve agentes, su misión y el modelo asignado;
- `run(agentId, brief, snapshot, priorOutputs)` solicita una inferencia autenticada;
- `loadRuns()`, `saveRuns()` y `clearRuns()` mantienen la evidencia en el navegador;
- `exportRuns()` genera un paquete revisable que declara `publicationAuthorized: false`.

La batería completa ejecuta primero Gerencia; después Viralidad y Avatares; luego Producción y Lead Magnets; después Conversaciones y Nutrición; posteriormente Analítica; y termina con el Consejo de Calidad. Los grupos intermedios pueden correr en paralelo. Cada batería tiene un identificador propio: las salidas se resumen y entregan solo a agentes posteriores de la misma corrida, evitando mezclar evidencia antigua y acotando el prompt.

Los adaptadores futuros deberán implementar el mismo comportamiento y agregar control de concurrencia, auditoría y procedencia sin cambiar los componentes de vista.

### Investigación pública operativa

El centro puede consultar, con autenticación administradora, las superficies públicas documentadas de `@soynicolaslara` y `@Flippingrentalss`. El recolector usa destinos fijos —no acepta URLs del usuario— y devuelve fecha de consulta, alcance de la muestra, perfiles, vistas visibles, enlaces y hasta cuatro transcripciones públicas de los Shorts líderes. Esa evidencia entra al contrato de agentes bajo `snapshot.research`.

El modo resultante es **mixto**: únicamente `research` se considera evidencia real; embudo, calendario, señales editoriales y métricas privadas continúan siendo demostración. La lectura pública no sustituye Metricool ni YouTube Studio porque no expone retención, guardados, CTR, leads, agendas, ventas o atribución. Las transcripciones automáticas requieren revisión humana.

YouTube e Instagram pueden bloquear lecturas desde centros de datos. Para los cuatro Shorts líderes y el conteo público de Instagram existe una línea base verificada y fechada que solo actúa como respaldo del mismo recurso exacto. La respuesta identifica esa procedencia; nunca convierte un bloqueo en cero ni llama “en vivo” al respaldo.

## Modelo de dominio

- **Directiva semanal:** objetivo, cuello de botella, meta y confianza.
- **Jornada:** secuencia de ocho decisiones para poner la semana en marcha.
- **Señal:** fuente, canal, ventana de oportunidad, ajuste y decisión.
- **Etapa:** trabajo, dueño, SLA, estado y cantidad en cola.
- **Equipo:** misión, entradas, entregas, cadencia, KPIs y ejecución.
- **Pieza:** hipótesis creativa, avatar, ángulo, prueba, CTA, riesgo, canales y estado.
- **Sistema de comunicación:** experiencia buscada, tensión, reencuadre, claridad repetible, traducción dato→beneficio→escena y control de credibilidad.
- **Publicación planeada:** pieza, canal, día, hora y estado confirmado.
- **Patrón:** señal, tamaño de muestra, decisión siguiente.
- **Experimento:** hipótesis, métrica, estado y responsable.
- **Control de calidad:** especialidad, hallazgo, evidencia y dictamen.

## Seguridad y privacidad

- En producción, la pantalla exige una sesión válida de Supabase, un perfil activo y rol `admin`.
- Si la cuenta requiere MFA, el centro no acepta una sesión con nivel inferior y devuelve al flujo de acceso principal.
- La excepción `?auth=demo` solo funciona en `localhost` o `127.0.0.1` para pruebas automatizadas.
- No se incluyen secretos ni credenciales en la aplicación. La anon key pública existente solo inicializa Supabase Auth; RLS y el perfil controlan acceso.
- No hay escrituras externas. Las decisiones demo viven en `localStorage` y se pueden restaurar.
- Las corridas de agentes también viven en una clave local específica y pueden eliminarse sin tocar datos de Empresa OS.
- `growth-agent-run` acepta JWT de un administrador activo o autenticación interna de servicio; nunca devuelve claves, tokens ni prompts internos.
- El servidor limita tamaños, normaliza la respuesta a un esquema fijo y rechaza agentes desconocidos.
- La llamada al modelo tiene un timeout explícito. Los errores quedan visibles y permiten reintentar sin marcar la tarea como completada.
- El endpoint de preparación exige JWT de usuario, perfil activo y rol `admin`; solo devuelve booleanos derivados y nombres de requisitos, nunca valores de entorno.
- `configured` significa exclusivamente “variables presentes”. No se presenta como conexión probada ni habilita publicación.
- Ningún estado de publicación, conexión o ejecución real se infiere desde la presencia de configuración.

## Roles y modelos

Las funciones de juicio usan Claude Opus 4.8: Gerencia, Viralidad, Avatares, Analítica y Consejo de Calidad. Las funciones de volumen usan Claude Haiku 4.5: Producción, Lead Magnets, Conversaciones/CTA y Nutrición. En Vercel, el motor usa un broker interno mínimo de Supabase protegido por service role, de modo que la clave Anthropic permanece en un solo entorno; AI Gateway con OIDC y la API directa quedan como alternativas fuera de producción. La interfaz muestra proveedor, modelo, duración e identificador de corrida para que “activo” signifique una ejecución verificable.

`growth-agent-inference` no contiene estrategia ni persiste información: vuelve a validar el JWT y rol administrador que Vercel ya verificó, restringe modelos, tamaños, temperatura y timeout, y devuelve únicamente contenido/uso del proveedor. El endpoint de Vercel sigue siendo responsable del prompt, secuencia y normalización. El broker no comparte claves entre plataformas.

Cada respuesta usa structured outputs con un JSON Schema acotado y después se normaliza a: dictamen, titular, resumen, entregables, evidencia, supuestos, riesgos, próximos pasos y controles de calidad. El score refleja cumplimiento del contrato, no probabilidad de viralidad ni calidad comercial garantizada.

## Estados y recuperación

El repositorio permite simular carga, contenido, vacío y error. Una falla conserva una acción de reintento. Las decisiones de piezas y controles tienen feedback inmediato y persistencia local recuperable. Restaurar elimina únicamente el estado demo bajo la clave específica `empresa-os-growth-demo-v1`.

## Integraciones futuras

| Adaptador | Responsabilidad | Condición antes de activarlo |
|---|---|---|
| Google Drive | Resolver archivo, versión y permisos de guiones/recursos | `GOOGLE_DRIVE_CLIENT_EMAIL`, `GOOGLE_DRIVE_PRIVATE_KEY`, `GOOGLE_DRIVE_ROOT_FOLDER_ID`; luego prueba de acceso mínimo y enlace estable |
| Metricool | Leer calendario, programar y confirmar publicación/métricas | `METRICOOL_API_TOKEN`, `METRICOOL_USER_ID`, `METRICOOL_BLOG_ID`; luego idempotencia, zona horaria, confirmación de destino y rollback |
| Supabase Growth | Persistir semanas, decisiones, auditoría y aprendizajes | Esquema aprobado y versionado; `GROWTH_SUPABASE_ENABLED=true`, `GROWTH_SUPABASE_SCHEMA_VERSION`; luego RLS y pruebas por rol |

La presencia de estas variables no activa llamadas de escritura. La primera integración real deberá agregar una prueba de lectura, registrar la respuesta del proveedor y mantener deshabilitada toda acción de salida hasta completar ese control.

## Operación sin integraciones externas

La vista **Hoy** es el procedimiento de primer día. Nicolás revisa la directiva, ejecuta y compara los nueve agentes en **Agentes en vivo**, decide señales, valida avatares/ángulos, resuelve aprobación y Consejo de Calidad, y finalmente usa **Exportar paquete manual** en Calendario. El JSON resultante:

- declara `demo: true`;
- declara `publicationAuthorized: false`;
- incluye estado del activo por pieza;
- exige sustituir datos demo y adjuntar activos reales.

Esto permite ensayar el sistema sin fingir publicación, métricas o almacenamiento compartido.

## Riesgos conocidos

- La primera entrega usa datos demo y no demuestra la calidad de una integración real.
- Los agentes razonan sobre el brief y snapshot entregados. Pueden recibir la investigación pública ya recolectada por el servidor, pero no navegan por su cuenta ni consultan Metricool, Drive, conversaciones o analítica privada.
- El score automático verifica forma y cautelas mínimas; no sustituye la revisión humana del contenido.
- El almacenamiento local no sirve como fuente de verdad multiusuario.
- La exportación manual es una transferencia controlada, no una integración ni una autorización para publicar.
- Un panel estático protegido en cliente sigue entregando HTML y datos demo públicos; antes de datos sensibles se requiere autorización en servidor o lectura protegida por RLS.
- El consejo de calidad reduce riesgo, pero no garantiza viralidad ni ausencia de defectos.
- La atribución de contenido a ventas necesitará reglas y fuentes acordadas con ventas.
