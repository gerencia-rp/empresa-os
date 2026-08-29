# Release Jarvis — continuidad, evidencia y seguridad

**Estado:** release desplegado y verificado; certificación de ausencia continúa `no_listo` por brechas externas declaradas
**Proyecto Supabase autorizado:** `nezbaljfhhyznhltpjnk`
**Rama de producción:** `main`

## Objetivo

Publicar como una sola unidad coherente los controles financieros, cobertura humana y empresarial, seguridad de canales, continuidad operativa y verdad de automatizaciones. El release no se considera exitoso porque compile: debe demostrar resultados reales, permisos correctos, UI utilizable y ausencia de regresiones.

## Cambios que viajan juntos

Migraciones, en orden:

1. `20260828090000_financial_source_scan.sql`
2. `20260828093000_operational_role_assignment_audit.sql`
3. `20260828101500_financial_action_matrix.sql`
4. `20260828103000_business_agent_coverage.sql`
5. `20260828104500_effective_automation_health.sql`

Edge Functions modificadas:

- autenticación común;
- ClickUp (`clickup-execute`, `clickup-writeback`);
- automatizaciones de Property Management;
- OAuth de QuickBooks;
- sincronización de Remodelación;
- emisores y webhook de WhatsApp.

Superficie web: Jarvis, motor de cierre y Sabueso.

## Compuertas previas

- [x] Auditoría de cobertura: 21/21 traspasos.
- [x] Auditoría Jarvis: 26/26 agentes; 12/12 controles; 55/55 horarios catalogados.
- [x] Motor financiero: 9/9 aserciones.
- [x] Build Node 24 correcto.
- [x] Detector visual sin hallazgos.
- [x] Prueba de interfaz real en Chrome: navegación principal y destinos del plan de recuperación.
- [x] Prueba de seguridad de decisiones: metadatos bloqueados, evidencia sustantiva vigente habilitada y evidencia vencida bloqueada.
- [ ] `ci:gate` completo con `SB_KEY` y `QA_PASS` inyectados solo durante la ejecución.
- [ ] Revisión del diff por una segunda persona.
- [x] Confirmar que el proyecto vinculado es exactamente `nezbaljfhhyznhltpjnk`.
- [x] Exportar definición previa de las funciones/vistas reemplazadas y filas de `automation_expectations`.
- [ ] Configurar `META_APP_SECRET` y probar una firma válida e inválida antes de desplegar `whatsapp-webhook`.
- [x] Obtener autorización explícita para migración, commit, push y deploy.

## Evidencia de publicación

- Commit de release: `b5d23ca` en `main`.
- Vercel confirmó el despliegue y `https://empresa-os.vercel.app` respondió `200` con `assets/bundle.121e91521828.js`.
- La sesión autenticada de `/jarvis` cargó el organigrama completo, la ficha operativa y sus rutas principales sin errores de consola.
- Las rutas sensibles probadas sin sesión respondieron `401`: ClickUp, QuickBooks, Remodelación, WhatsApp y cierre diario.
- La validación SQL de producción terminó correctamente. `salud_automatizaciones` está saludable; `salud_integraciones` permanece en atención y `continuidad_ausencia_6_meses` permanece `no_listo`, sin falsos verdes.
- Seguimiento de cola: Financiero Rentas ahora reconcilia también el conjunto completo de alertas de servicios. La corrida productiva encontró y refrescó 11/11; no retiró ninguna porque todas siguen presentes en la fuente.
- Corrección de representación: los horarios semanales expresados mediante el nombre del día ya no se evalúan con una ventana diaria. `Reportes Remodelación` tenía cron exitoso y evidencia del miércoles, pero la interfaz lo mostraba 6/7 después de 72 horas; la cadencia visual ahora coincide con el control semanal real.
- Veracidad ejecutiva: el encabezado de Jarvis ya no afirma “todo bajo control” mientras la certificación de continuidad esté incompleta. Ahora muestra el número real de compuertas aprobadas y cambia a estado ámbar cuando existen controles pendientes.
- Dirección accionable: el Centro de mando convierte las compuertas fallidas en un plan ordenado por riesgo, con responsable, evidencia y acceso directo al frente correcto. El orden prioriza integridad financiera, cobertura humana, decisiones fuera de SLA e integraciones, sin aprobar ni asignar por inferencia.
- Aprobaciones con evidencia: una propuesta ya no se considera suficientemente sustentada por incluir solo metadatos como tipo, fuente, fecha o regla. Las aprobaciones sensibles exigen contenido verificable del negocio y evidencia vigente; la decisión final continúa siendo humana.

## Secuencia de publicación

1. Actualizar referencias remotas y confirmar que `main` no avanzó por otra sesión.
2. Ejecutar `ci:gate` con secretos efímeros; detener si falla cualquier prueba.
3. Aplicar las cinco migraciones dentro de la ventana aprobada.
4. Ejecutar `supabase/jarvis-release-validation.sql` antes de desplegar interfaces.
5. Desplegar Edge Functions excepto `whatsapp-webhook` si falta `META_APP_SECRET` o su prueba firmada.
6. Ejecutar sincronizaciones controladas y confirmar sus registros reales, no solamente el resultado del cron.
7. Commit y push de un único release coherente a `main`.
8. Verificar el despliegue de Vercel y realizar smoke tests autenticados en escritorio y móvil.
9. Ejecutar nuevamente la validación SQL y comparar los informes de salud.
10. Ejecutar `npm run gate:jarvis:prod` con credenciales efímeras; no certificar mientras reporte pendientes.

## Smoke tests obligatorios

- Jarvis abre Centro de mando, Equipo, Trabajo, Decisiones, Memoria y Reportes sin errores de consola.
- `npm run test:jarvis:ui` comprueba con un navegador real el cambio de vista y la apertura del destino de cada bloqueo.
- La misma prueba confirma que una decisión sensible queda bloqueada con metadatos solos o evidencia vencida, y solo se habilita con evidencia sustantiva vigente.
- “Trabajo automático” muestra causa, responsable y evidencia para resultados fallidos.
- ClickUp con una sincronización fallida nunca aparece verde y bloquea escrituras.
- La asignación de roles rechaza usuario no administrador, titular=respaldo y falta de atestación.
- Cada empresa activa conserva las seis capacidades requeridas.
- Todos los hallazgos financieros visibles tienen responsable, evidencia y siguiente acción.
- QuickBooks rechaza inicio OAuth anónimo y estados vencidos/manipulados.
- WhatsApp rechaza emisor anónimo; el webhook rechaza firma inválida antes de escribir datos.
- Tema oscuro, escritorio y móvil conservan contraste, foco, estados vacíos/error y jerarquía legible.

## Disparadores de reversión

Revertir o detener inmediatamente si ocurre cualquiera:

- una escritura externa se acepta sin administrador o service role;
- una automatización con error aparece saludable;
- una migración deja crons activos sin expectativa registrada;
- falta una empresa o capacidad en la matriz de cobertura;
- aparecen hallazgos financieros sin responsable/acción/evidencia;
- Jarvis no carga, pierde navegación o rompe un flujo operativo crítico;
- aumentan errores de aplicación o funciones respecto de la línea base previa.

## Reversión

1. Detener despliegues posteriores; no reintentar en bucle.
2. Restaurar en Vercel el deployment anterior conocido como estable.
3. Restaurar Edge Functions desde el commit anterior.
4. Restaurar las definiciones SQL exportadas antes del release y las filas previas de `automation_expectations`.
5. No borrar bitácoras, propuestas o evidencia producida: conservarlas para el análisis del incidente.
6. Ejecutar validación de lectura y documentar causa, impacto y corrección antes de reintentar.

## Estado conocido que no debe ocultarse

- ClickUp permanece degradado mientras su credencial sea rechazada.
- WhatsApp no puede certificarse hasta configurar `META_APP_SECRET` y completar una entrega firmada real.
- Los nueve roles humanos requieren confirmación expresa de titular y respaldo; candidatos con permisos no equivalen a aceptación ni competencia confirmada.
- La certificación final solo ocurre después de comprobar producción, no por el resultado local.
