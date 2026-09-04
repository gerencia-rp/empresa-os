# Growth Command Center: estrategia de pruebas

## Prueba automatizada local

`npm run test:growth:ui` abre el centro con el bypass exclusivo de localhost y verifica:

- banner persistente de datos demo;
- jornada inicial de nueve pasos, progreso y persistencia local;
- radar de señales con fuente, vigencia y decisión;
- cinco etapas del embudo y cinco plataformas;
- meta semanal visible por plataforma;
- navegación entre las diez áreas;
- laboratorio con nueve agentes, corrida completa en fixture local y persistencia de resultados;
- presencia de los controles requeridos del Consejo de Calidad;
- dictamen bloqueado cuando existen hallazgos;
- persistencia de aprobación de piezas y controles;
- requisitos de integración visibles, publicación bloqueada y exportación manual disponible;
- estados vacío y recuperación al escenario demo;
- ausencia de errores JavaScript;
- navegación fija y ausencia de desborde horizontal en 390 px.

La prueba debe ejecutarse con Node 24.x y Chrome disponible. El script no usa credenciales ni llama fuentes operativas.

`npm run test:growth:readiness` comprueba que el verificador server-side distingue configuración ausente/presente y que su respuesta no refleja ningún valor secreto.

`npm run test:growth:agents` prueba el endpoint de ejecución con una respuesta Anthropic controlada: autenticación interna, catálogo de nueve agentes, selección Opus/Haiku, normalización del contrato, score, rechazo de agente desconocido, rechazo sin autorización y ausencia de secretos.

`npm run smoke:growth:agent -- management` hace una inferencia real y muestra únicamente agente, proveedor, modelo, score, dictamen, titular y duración. En modo Vercel usa `SUPABASE_SERVICE_ROLE_KEY` para el broker interno; fuera de Vercel admite `AI_GATEWAY_API_KEY`, `VERCEL_OIDC_TOKEN` o `ANTHROPIC_API_KEY`. Las credenciales deben inyectarse temporalmente y nunca guardarse ni imprimirse.

La corrida local de interfaz usa deliberadamente `fixture-local`. Comprueba el flujo y los estados, pero no se presenta como inferencia de IA. La evidencia de inferencia real solo se obtiene en un entorno con proveedor configurado y se identifica con el proveedor y modelo en cada tarjeta.

## Verificación de build

`npm run build` debe copiar `growth-command.html`, `growth/data.js`, `growth/agents.js`, `growth/integrations.js`, `growth/app.js` y `growth/growth-command.css` al artefacto `dist`. También debe verificarse que la configuración dirija `/viral` y `/growth` a la nueva aplicación sin modificar los archivos del piloto.

## Gate general

`npm run ci:gate` sigue siendo obligatorio por las reglas del repositorio. Requiere una sesión QA o `SB_KEY` disponible en el entorno y comprueba datos compartidos de Empresa OS; su resultado se reporta separado de las pruebas aisladas del Growth Command Center.

## Comprobación visual

Se inspeccionan al menos:

- jornada de hoy en escritorio 1440 px;
- agentes en vivo con estados inicial, progreso, resultado y error en escritorio 1440 px;
- consejo de calidad en escritorio 1440 px;
- jornada de hoy en móvil 390 px;
- consejo de calidad en móvil 390 px;
- agentes en vivo en móvil 390 px;
- tema oscuro canónico, jerarquía, contraste, truncado y navegación;
- estados cargando, vacío, error y éxito.

## Validación posterior al despliegue

- confirmar identidad del proyecto y dominio en Vercel antes de publicar;
- guardar el commit anterior y el identificador del deployment como punto de retorno;
- verificar que `/viral` devuelve la nueva aplicación;
- comprobar que una visita sin sesión muestra acceso privado;
- comprobar con una sesión administradora que se cargan las nueve áreas y el verificador devuelve estado sin secretos;
- ejecutar la batería completa con el brief demo y confirmar 9/9 corridas `anthropic`;
- comprobar que Gerencia abre la secuencia y que el Consejo de Calidad termina después de recibir resultados previos;
- revisar al menos dictamen, score, modelo, duración, entregables, evidencia, supuestos, riesgos y próximo paso de cada corrida;
- confirmar que ningún agente afirma haber publicado, escrito datos o consultado una fuente externa no conectada;
- confirmar que `/growth` sirve la misma versión y que los assets responden;
- no declarar operativas Google Drive, Metricool o Supabase Growth.
