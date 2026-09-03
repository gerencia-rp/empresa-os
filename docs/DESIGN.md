# Design System

## Design Direction

Centro de control ejecutivo: denso pero legible, evidencia antes que decoración, una acción primaria por pantalla y detalles técnicos progresivos. El mapa de agentes y el Cerebro son la firma visual; las demás superficies priorizan decisiones y operación.

## Quality Floor

La excelencia funcional y visual es el mínimo de aceptación, no una fase opcional. Toda pantalla modificada debe quedar más clara, más confiable y más fácil de operar que antes, sin romper coherencia con el sistema completo.

Una superficie solo está terminada cuando:

- comunica propósito, estado, fuente de datos y próxima acción sin exigir interpretación técnica;
- contempla carga, vacío, error, éxito, permisos y recuperación;
- funciona en escritorio y móvil, con teclado, contraste y movimiento reducido;
- usa los tokens y componentes canónicos y elimina ruido o duplicación dentro del alcance tocado;
- muestra evidencia real y fechas de frescura; nunca maquilla ausencia, simulación o incertidumbre;
- supera una comprobación visual posterior a las pruebas funcionales.

La mejora continua no significa cambiar por cambiar: cada ajuste visual debe mejorar jerarquía, legibilidad, confianza o velocidad operativa.

## Typography

Inter para interfaz, Fraunces para titulares y JetBrains Mono para cifras. Contenido operativo en medidas cortas y números tabulares.

## Tokens

Fuente canónica: `ui/tokens.css`. Escala 4/8/16/24/32/48/64; azabache+cobalto; estados verde/ámbar/rojo reservados para evidencia operacional.

## Components

| Component | Decision | Status |
|---|---|---|
| Estado operativo | Debe incluir última evidencia/ejecución y no solo una etiqueta | en progreso |
| Acción crítica | Mostrar qué cambia, fuente y posibilidad de deshacer | pendiente |
| Error | Qué falló, por qué y cómo resolverlo | pendiente |
| Salud del sistema | Resumen profundo de dependencias y versión | en progreso |

## UX Audit Findings

| Issue | Heuristic | Severity (0-4) | Fix | Status |
|---|---|---:|---|---|
| No existía estado profundo del backend | Visibilidad del estado | 4 | `/api/health` con Supabase, configuración, versión y latencia | implementado local |
| Cron sin secreto configurado | Prevención de errores/seguridad | 4 | Configurar `CRON_SECRET` y comprobar 401 externo | secreto configurado; verificación pendiente deploy |
| Llamadas externas sin timeout | Control y recuperación | 4 | `fetchWithTimeout` en APIs Vercel críticas | implementado local |
| “Activo” sin evidencia reciente | Correspondencia con el mundo real | 3 | Estado = ejecución real + fecha + fuente | pendiente |
| Acciones/decisiones sin resumen suficiente | Reconocimiento antes que recuerdo | 3 | Tarjeta con contexto, impacto, fuente y recomendación | pendiente |
| Módulos redundantes | Consistencia y diseño minimalista | 2 | Consolidar detalle dentro del equipo/empresa | pendiente |

## Microinteraction Inventory

| Interaction | Trigger/Rules/Feedback/Loops | Fix | Status |
|---|---|---|---|
| Guardar | clic / validar / feedback inmediato / estado persistido | Botón “Guardando…” y confirmación junto al objeto | pendiente |
| Ejecutar agente | clic / autorización / progreso / evidencia final | Línea temporal de ejecución con fuente y resultado | pendiente |
| Sincronizar | manual o cron / timeout / resumen / próxima corrida | Mostrar parcial, fallos por fuente y reintento seguro | pendiente |
| Aprobar decisión | clic / impacto / aplicado / reversible | Resumen antes y opción deshacer cuando sea posible | pendiente |
