# Growth Command Center: investigación estratégica transferible

## Propósito y límite de uso

Este documento conserva los aprendizajes de estrategia, contenido, conversión y medición encontrados en el piloto de `/viral` y en su documentación asociada. El piloto se trató como fuente exhaustiva de investigación, no como base técnica.

La nueva aplicación no debe reutilizar:

- código, componentes, rutas internas ni estructura de navegación del piloto;
- su experiencia de usuario o su taxonomía de pantallas;
- publicaciones, guiones, copies, calendarios o recursos creativos literales;
- métricas históricas, seguidores, resultados, estados o cualquier otro dato operativo;
- credenciales, integraciones, registros de memoria o configuraciones del piloto.

Sí deben transferirse los principios comprobables que aparecen a continuación. `/viral` permanece intacto hasta que la nueva experiencia tenga validación humana y exista una decisión explícita de reemplazo.

## Fuentes revisadas

| Fuente | Aporte principal | Tratamiento |
|---|---|---|
| `viral-data/opera-imperio-data.json` | Hipótesis inicial de marca, psicología, arquetipo, distribución y lanzamiento | Investigación histórica; sus cifras y piezas no se reutilizan |
| `viral-data/opera-imperio-data-v2.json` | Giro hacia Fix & Flip, dos avatares, sistema por etapas, enemigos, tácticas, recursos y tendencias | Principios resumidos y desacoplados de la implementación |
| `viral-data/base_conocimiento.json` | Preguntas reales organizadas por dolores y áreas de decisión | Taxonomía estratégica, no respuestas literales |
| `viral.js` | Fórmulas, ritmo de siembra/cosecha, pilares, embudo y guía operativa | Patrones abstractos, no prompts ni UI |
| `viral-context-builder.js` | Selección de contexto, fase, avatar, ángulo y aprendizaje previo | Requisito para trazabilidad futura |
| `viral-validator.js` | Guardrails de marca, estructura, CTA y reintentos | Requisito de control de calidad independiente |
| `viral-memory.js`, `viral-metrics.js` | Ciclo publicación-métricas-insight y captura manual/OCR | Modelo de aprendizaje, sin reutilizar registros |
| `viral-agente.js` | Asistencia para idear, analizar y decidir la próxima publicación | Separación entre recomendación y producción |
| `viral-opera.js`, `viral.html` | Evolución del centro de producción y estados de biblioteca | Lecciones de producto, no estructura heredada |
| `docs/marketing/PLAN-ARQUITECTURA-FINAL.md` | Decisión de hacer invisible la teoría y central la ejecución | Principio rector de la nueva experiencia |
| `docs/marketing/PATRONES-VIRALES-MAESTRO.md` | Patrones, detectores, validadores y anti-patrones por formato | Gramática de contenido abstracta |
| `docs/marketing/PROMPT-CLAUDE-CODE-IMPLEMENTACION*.md` | Evolución v1-v3, criterios de alcance y decisiones descartadas | Registro de decisiones y advertencias |
| `docs/marketing/REPORTE-NOCTURNO-2026-06-30.md` | OCR, RAG, umbrales de evidencia, degradación segura y limpieza de datos demo | Reglas para una capa de datos honesta |
| Historial Git relacionado con `viral` | Secuencia real de construcción: producción, validación, memoria, métricas, OCR, insights y RAG | Evidencia de evolución, no código reutilizable |
| `videoplayback (1).pdf` | Transcripción aportada por Nicolás sobre comunicación, puesta en escena, claridad, credibilidad, objeciones y traducción de datos | Marco analizado y abstraído; no se copian frases, historia ni estructura narrativa literal |

## Evolución de las decisiones

### Primera hipótesis: identidad amplia y teoría visible

La primera versión intentaba sostener una marca personal alrededor de varias empresas inmobiliarias y convertir una investigación extensa en muchas secciones consultables. Tenía ideas útiles sobre identidad, autoridad mediante evidencia, repetición de mensajes, comunidad y distribución multicanal. También incluía datos y planes operativos fechados.

La decisión posterior fue estrechar el foco a Fix & Flip y descartar la identidad amplia como propuesta principal. Por eso, los nombres, slogans, calendarios y objetivos de esa versión son material histórico, no activos vigentes.

### Segunda hipótesis: especialización y herramientas ejecutables

La segunda versión definió una promesa más concreta, dos segmentos de audiencia y un sistema por etapas para reducir riesgo. La teoría dejó de ser suficiente: cada concepto estratégico debía convertirse en una decisión, filtro, herramienta, métrica o entregable utilizable.

### Tercera hipótesis: producción al frente, contexto por debajo

La arquitectura final del piloto concluyó que el usuario entra a producir y decidir, no a navegar una enciclopedia. Marca, avatar, enemigo, fase, táctica, restricciones y memoria debían funcionar como contexto inyectado y auditable. La navegación extensa de la primera versión se consideró un problema, no una solución a copiar.

### Cuarta hipótesis: aprendizaje desde resultados

Las últimas iteraciones conectaron generación, publicación, captura de métricas, cruces analíticos, insights y recuperación de ejemplos relevantes. La regla más importante fue aprender la estructura de lo que funcionó sin copiar su creatividad. Un aprendizaje solo debía presentarse con suficiente evidencia y trazabilidad.

### Quinta hipótesis: la comunicación también es un sistema

La transcripción externa aportada en septiembre de 2026 refuerza que un mensaje memorable no depende de carisma espontáneo. La comunicación debe diseñarse, ensayarse y auditarse igual que una operación. Sus mecanismos transferibles son: tensión relevante, sorpresa con propósito, reencuadre, simplificación radical, traducción de datos a escenas, coherencia entre promesa y entrega y gestión serena de objeciones.

Estos aprendizajes se incorporan como criterios, no como una estética que deba aplicarse a toda pieza. La aplicación debe elegir el mecanismo mínimo que sirve al objetivo y preservar la voz de Nicolás. Los relatos, frases y ejemplos históricos de la fuente no se reutilizan como creatividad.

## Núcleo de marca transferible

### Posicionamiento

- La categoría central es Fix & Flip. Otros negocios aportan credibilidad solamente cuando refuerzan esa especialización.
- La transformación no es “hacer dinero fácil”, sino adquirir criterio operativo para tomar decisiones con menor riesgo.
- La autoridad procede de procesos, decisiones, pruebas y resultados verificables. Nunca de ostentación o afirmaciones sin respaldo.
- La identidad aspiracional es la de una persona que opera con método: directa, competente, generosa con el conocimiento y capaz de reconocer errores.

### Voz

- Español claro con naturalidad rioplatense, frases cortas y lenguaje hablado.
- Técnico pero accesible: explicar decisiones y consecuencias, no esconderlas detrás de jerga.
- Mostrar números o casos solamente cuando son reales, actuales y tienen procedencia.
- Evitar promesas mágicas, riqueza rápida, pasividad sin matices y lenguaje genérico de gurú.
- La provocación puede abrir atención, pero no debe humillar a trabajadores, alumnos, colegas ni prospectos.

### Tensión narrativa

El enemigo visible es la enseñanza sin operación ni evidencia. El enemigo profundo es la teoría vacía que sustituye el criterio. Puede dramatizarse la diferencia entre operar y especular, siempre atacando el patrón o la conducta, nunca a personas identificables.

### Prueba y confianza

- La prueba debe acompañar la afirmación: caso, desglose, decisión, pantalla, proceso o resultado verificable.
- La producción auténtica suele reforzar la credibilidad más que una apariencia excesivamente publicitaria.
- Documentar trabajo, decisiones y correcciones es una fuente de contenido de autoridad.
- Si un caso es ficticio o una cifra es demostrativa, debe permanecer rotulado durante toda la experiencia.

## Modelo de audiencia

El piloto convergió en dos situaciones de progreso, más útiles que una segmentación demográfica:

1. **Operador que quiere escalar.** Ya tiene experiencia o una operación próxima. Sus tensiones son consistencia, equipo, capital, ejecución, margen y repetibilidad. Responde a sistemas, evidencia, optimización y reducción de retrabajo.
2. **Profesional que quiere empezar.** Tiene intención, recursos parciales o empleo, pero le falta criterio para elegir y ejecutar el primer deal. Sus tensiones son miedo a perder capital, financiamiento, selección de mercado, equipo y secuencia de pasos. Responde a claridad, filtros, acompañamiento y reducción de incertidumbre.

La base de conocimiento organiza preguntas alrededor de capital, crédito, criterio de compra, búsqueda, equipo, remodelación, proceso, familia, legado y creencias. La conclusión transversal es que la audiencia suele formular el problema como falta de dinero, cuando el cuello de botella puede ser falta de criterio para evaluar y reducir riesgo.

Para el nuevo sistema, “avatar” no debe ser una etiqueta decorativa. Debe conectar:

- señal o pregunta observada;
- dolor, deseo u objeción;
- nivel de conciencia;
- promesa posible;
- prueba disponible;
- formato y canal;
- CTA y siguiente paso;
- resultado posterior.

## Portafolio de contenido

El sistema anterior combina cinco trabajos del contenido que conviene mantener como una cartera balanceada:

- **Personalidad:** cercanía, criterio propio, decisiones, errores y vida del operador.
- **Valor:** herramientas, filtros, desgloses y pasos que producen una mejora inmediata.
- **Autoridad:** casos, procesos, documentación, resultados y marcos aplicados.
- **Comunidad:** preguntas, votaciones, debates y participación alrededor de una identidad compartida.
- **Conversión:** recursos, respuestas y ofertas que convierten intención en una conversación calificada.

La mezcla no debe optimizarse por volumen aislado. Cada pieza necesita una función dentro del embudo y una hipótesis de aprendizaje.

## Gramática de formatos

### Video corto

Secuencia transferible: interrupción de patrón, puente hacia un problema relevante, valor específico o nuevo criterio, prueba y siguiente acción. El primer tramo debe reducir la fricción cognitiva y la edición debe sostener atención sin convertir la pieza en ruido.

Una variante de conversión reemplaza el entretenimiento central por problema, nuevo paradigma, prueba y CTA. Ambas deben ser grabables y evitar introducciones vagas.

### Carrusel técnico

Portada orientada a resultado o error, acciones numeradas y concretas, evidencia visual cuando exista, cierre con consecuencia y recurso específico. El lector debe poder usarlo, no solamente guardarlo.

### Carrusel narrativo

Primera persona, tensión reconocible, punto de quiebre, decisión y lecciones accionables. La historia funciona cuando cambia una creencia y conduce a una conversación, no cuando solo cuenta una anécdota.

### Historias

Secuencia: gancho, identificación, recorrido del estado actual al deseado con al menos una interacción, y oferta o siguiente acción por respuesta. La encuesta o pregunta no es decoración: valida interés y declara intención antes de producir o vender.

### YouTube

La idea, el título y la miniatura son parte del producto. Conviene probar varias formulaciones desde miedo, curiosidad o deseo, mantener tensión hasta el valor prometido y marcar cortes que puedan convertirse en piezas nativas verticales. Reutilizar una idea no significa publicar el mismo archivo en todos los canales.

### LinkedIn y X

El conocimiento del piloto favorece contenido más denso, sobrio y basado en decisiones para estos canales. Debe conservar la voz de la marca, pero adaptar longitud, apertura, prueba y conversación al comportamiento de cada plataforma.

## CTA, recursos y conversaciones

- La respuesta con palabra clave suele ser un paso más útil que enviar tráfico frío a un enlace genérico.
- El recurso debe resolver el siguiente problema concreto del prospecto y relacionarse con la oferta real.
- Un buen recurso inicia conversación, crea un microcompromiso, aumenta conciencia y permite calificar intención.
- La promesa combina resultado, tiempo y alivio, pero debe sentirse posible y contar con respaldo.
- El mismo recurso puede probarse desde varios ángulos; el resultado debe medirse por conversación calificada, agenda y venta, no solo por descargas.
- La velocidad y calidad de respuesta a comentarios y mensajes forman parte del contenido y del sistema comercial.
- Nutrir significa continuar entregando criterio hasta que el prospecto esté listo, no perseguirlo con la misma oferta.

## Cadencia y fases

El piloto separa una fase predominante de siembra y una ventana de cosecha:

- **Siembra:** valor, autoridad, participación y recursos; se construye confianza sin venta frontal constante.
- **Cosecha:** una oferta clara, urgencia o escasez real y mayor peso de historias y conversaciones.
- **Reinicio:** volver al valor y documentar los aprendizajes del ciclo.

Esto es una política estratégica, no una regla rígida de fechas para el producto nuevo. La fase debe ser visible, editable y justificada por oferta, inventario de confianza y comportamiento real. La meta nueva de al menos cinco piezas semanales por Instagram, TikTok, YouTube, LinkedIn y X exige una matriz de cobertura por plataforma, propósito y etapa del embudo.

## Inteligencia de tendencias

La rutina histórica combinaba observación diaria de formatos y una investigación semanal de señales en fuentes de cada plataforma. El nuevo radar debería registrar:

- fuente y fecha de detección;
- formato o patrón, no solo tema;
- velocidad y vida útil estimada;
- audiencia y plataforma donde aparece;
- compatibilidad con marca, prueba y oferta;
- oportunidad de respuesta en menos de 24 horas;
- decisión: probar, adaptar, vigilar o descartar;
- resultado posterior.

La regla de transformación es conservar el mecanismo de atención o la estructura, reescribir por completo la creatividad y aportar una verdad propia de Fix & Flip.

## Medición y aprendizaje

El circuito estratégico completo es:

`señal -> hipótesis -> pieza -> aprobación -> publicación -> métricas -> conversación -> resultado comercial -> aprendizaje -> próxima hipótesis`

### Métricas por nivel

- **Atención:** alcance, retención, finalización y tiempo de visualización.
- **Audiencia:** visitas, seguidores pertinentes, guardados, compartidos y respuestas.
- **Intención:** palabra clave, solicitud de recurso, mensaje y calidad de la conversación.
- **Pipeline:** lead calificado, agenda, asistencia y oportunidad.
- **Negocio:** venta, ingreso atribuible cuando sea posible y tiempo de ciclo.
- **Operación:** piezas listas, tiempo de producción, retrabajo, cobertura por plataforma y cumplimiento del acuerdo semanal.

### Reglas de evidencia

- No confundir configuración disponible con integración operativa.
- Un panel sin datos reales debe mostrar un estado vacío honesto.
- Las métricas ingresadas manualmente u obtenidas por OCR requieren fuente, confianza y corrección humana.
- Un patrón necesita una muestra mínima antes de presentarse como aprendizaje; el piloto utilizó tres observaciones como umbral inicial.
- El sistema debe explicar qué funcionó, para quién, con qué formato, CTA y contexto.
- La memoria recupera ejemplos por relevancia, pero instruye aprender su estructura y nunca copiar el contenido.
- Los fallos de una integración o un proveedor de IA no deben bloquear la operación manual ni inventar resultados.

## Supervisión humana y calidad

La automatización propone y organiza. Nicolás conserva la decisión semanal sobre:

- precisión y procedencia de afirmaciones;
- adecuación a la voz y al momento comercial;
- riesgo legal, reputacional o de promesa;
- prioridad y distribución;
- aprobación, revisión o descarte;
- qué aprendizaje entra a la memoria operativa.

La validación de una pieza debe revisar, como mínimo: gancho, claridad, prueba, estructura del formato, CTA específico, restricciones de marca, lenguaje prohibido, adaptación por plataforma y rotulado de material ficticio o demo. Si la generación falla repetidamente, se detiene y se eleva una decisión humana; no se oculta el problema detrás de reintentos infinitos.

### Consejo final de aseguramiento

Antes de autorizar calendario, publicación o una nueva versión del sistema, un consejo visible debe emitir un dictamen respaldado por evidencia. Sus controles mínimos son:

- estrategia general de redes y coherencia con el embudo;
- potencial de distribución y calidad del mecanismo de atención, sin prometer viralidad;
- revisión nativa independiente para Instagram, TikTok, YouTube, LinkedIn y X;
- calidad de agentes de IA, patrones, trazabilidad, sesgo y repetición;
- arquitectura, lógica, seguridad, privacidad, accesibilidad y bugs conocidos;
- orquestación de equipos, contratos de entrada/salida y reglas de transferencia;
- gerencia de proyecto, responsables, cadencia, KPIs, dependencias y bloqueos;
- auditoría de procedencia, completitud, atribución y uso de datos en decisiones;
- marca, precisión de promesas, ética y riesgo reputacional.

Cada control puede aprobar o pedir mejora, debe registrar hallazgo y evidencia, y puede bloquear la salida. Aprobar todos los controles no significa garantizar viralidad ni ausencia de fallos: significa que los riesgos conocidos fueron revisados con la evidencia disponible y que la decisión final humana puede avanzar.

## Lecciones de producto

1. **La producción y la decisión son la interfaz principal.** La teoría funciona como motor auditable, no como menú enciclopédico.
2. **Automatización con transparencia.** Avatar, ángulo, fase, objetivo, prueba y criterios de validación deben poder inspeccionarse.
3. **Cada concepto debe terminar en una acción.** Una metodología sin entrada, entrega, responsable, horario y KPI es documentación, no operación.
4. **Estados simples y explícitos.** Borrador, pendiente, aprobado, revisión, programado, publicado y medido permiten ubicar el trabajo.
5. **La biblioteca sirve al flujo.** Buscar, filtrar, reutilizar un aprendizaje y llevarlo a una nueva producción; no acumular piezas.
6. **La revisión semanal es el centro de control.** Alertas y datos deben culminar en pocas decisiones con dueño y fecha.
7. **Mobile y escritorio cumplen trabajos distintos.** Móvil permite revisar, aprobar y responder alertas; escritorio permite comparar, planificar y analizar.
8. **La ausencia de datos también es información.** Nunca se muestran ejecuciones, conexiones o actividad positiva sin evidencia vigente.

## Traducción a equipos de agentes

| Equipo | Misión | Entrada | Entrega | KPI principal | Supervisión |
|---|---|---|---|---|---|
| Gerencia de crecimiento | Elegir el cuello de botella semanal | Embudo, alertas, aprendizajes | Directiva, prioridades, decisiones | Leads, agendas, ventas | Inicio y cierre semanal |
| Radar de viralidad | Detectar señales con vida útil | Tendencias, referentes, búsquedas | Radar priorizado | Señales útiles y tiempo a producción | Excepciones y riesgo de marca |
| Avatares y ángulos | Traducir intención en hipótesis | Preguntas, objeciones, resultados | Mapa de ángulos | Conversión por segmento | Validación de promesa |
| Fábrica de contenido | Crear piezas nativas | Brief, prueba, formato | Guion y adaptaciones | Piezas listas y retrabajo | Aprobación de Nicolás |
| Lead magnets | Resolver el siguiente problema | Preguntas, oferta, CTA | Recurso y criterio de calificación | Solicitud a lead calificado | Calidad y vigencia |
| Conversaciones y CTA | Convertir intención en siguiente paso | Comentarios, mensajes, palabras clave | Respuesta, calificación, agenda | Tiempo de respuesta y agenda | Casos sensibles |
| Nutrición | Sostener confianza | Etapa, objeción, historial | Secuencia y próxima conversación | Agenda asistida y tiempo a venta | Frecuencia y tono |
| Analítica y aprendizaje | Convertir resultados en decisiones | Métricas, embudo, decisiones humanas | Patrones, alertas, experimentos | Lift por iteración y completitud | Aceptación del aprendizaje |
| Consejo de calidad | Encontrar riesgos antes de salida | Plan, piezas, pruebas y cambios | Dictamen, hallazgos, decisión de salida | Hallazgos resueltos y controles con evidencia | Nicolás conserva la autorización final |

## Qué se descarta deliberadamente

- La navegación y el número de secciones de cualquiera de las versiones anteriores.
- Los prompts embebidos como núcleo del producto.
- Las bibliotecas de piezas preescritas y los calendarios históricos.
- Las métricas base y objetivos fechados del piloto.
- El acceso directo a proveedores desde el navegador y el almacenamiento local de credenciales.
- La publicación automática sin una aprobación humana visible.
- La idea de que una misma pieza se distribuye idéntica en todos los canales.
- Cualquier afirmación que presente memoria, OCR, RAG, Metricool, Drive o Supabase como conectado antes de verificarlo.

## Decisiones para la primera entrega nueva

- Crear `/growth` como superficie independiente y dejar `/viral` sin cambios.
- Usar datos ficticios, coherentes y rotulados de manera persistente como demostración.
- Hacer navegables siete trabajos: mando, equipos, flujo, aprobación, calendario, aprendizaje y consejo de calidad.
- Permitir aprobar, pedir revisión y restaurar el estado demo con persistencia local.
- Mostrar las integraciones futuras como no conectadas.
- Representar la meta de cinco piezas por plataforma como cobertura visible, no como promesa de publicación.
- Incluir estados de carga, vacío y error verificables sin depender de credenciales.
- Validar la primera entrega localmente en escritorio y móvil antes de proponer cualquier cambio de destino público.

## Decisiones pendientes después del prototipo

| Prioridad | Decisión | Responsable | Evidencia necesaria |
|---|---|---|---|
| Alta | Definir quién puede aprobar y qué acciones requieren doble confirmación | Nicolás | Una revisión semanal real |
| Alta | Elegir la fuente de verdad de calendario y publicación | Nicolás + implementación | Comparación Metricool/Supabase y flujo actual |
| Alta | Definir criterios reales de lead calificado, agenda y venta atribuida | Nicolás + ventas | Muestra de conversaciones y pipeline |
| Media | Acordar taxonomía final de avatares, ángulos y ofertas | Nicolás + estrategia | Resultados por segmento |
| Media | Diseñar política de retención y privacidad para conversaciones | Nicolás + implementación | Requisitos legales y operativos |
| Media | Determinar qué archivos viven en Drive y cuáles en Supabase | Implementación | Prueba de operación semanal |
| Baja | Evaluar publicación asistida o automática por canal | Nicolás | Historial de aprobaciones confiable |
