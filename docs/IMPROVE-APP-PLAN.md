# Improve App Plan

## Context

- Inicio: 24-ago-2026.
- Producto: Empresa OS, sistema operativo web del holding Rental Profits.
- Trabajo principal confirmado por el CEO: controlar desde un solo lugar las empresas, propiedades, dinero, obras, rentas, inversionistas y equipo de IA; entender qué ocurre y ejecutar la siguiente acción sin depender de pantallas técnicas.
- Fricción principal observada: información repetida o difícil de interpretar, acciones sin contexto, integraciones que parecen activas sin evidencia reciente y poca visibilidad del estado técnico global.
- Evidencia disponible: auditoría histórica de 59 ajustes, capturas y recorridos del CEO, pruebas golden, QA autenticado existente, linaje de datos y registros de producción.
- Plataforma: aplicación web/PWA en Vercel con Supabase, Airtable, ClickUp, QuickBooks, Claude, RentCast, WhatsApp y Resend.
- No existe paywall interno; la fase de persuasión se omite. La prioridad es operación diaria y confiabilidad.

## Phase Status

| Phase | Skill | Status | Artifact | Date |
|---|---|---|---|---|
| 1 | jobs-to-be-done | done | CUSTOMER.md | 24-ago-2026 |
| 2 | ux-heuristics | in-progress | DESIGN.md, EXPERIMENTS.md | 24-ago-2026 |
| 3 | design-everyday-things | pending | DESIGN.md, EXPERIMENTS.md | |
| 4 | refactoring-ui | pending | DESIGN.md, EXPERIMENTS.md | |
| 5 | microinteractions | pending | DESIGN.md, EXPERIMENTS.md | |
| 6 | made-to-stick | pending | POSITIONING.md, EXPERIMENTS.md | |
| 7 | influence-psychology | skipped: no paywall ni upsell interno | POSITIONING.md, EXPERIMENTS.md | 24-ago-2026 |
| 8 | high-perf-browser | in-progress | DESIGN.md, EXPERIMENTS.md | 24-ago-2026 |
| 9 | steve-jobs-design-review | pending | PRODUCT.md, DESIGN.md, EXPERIMENTS.md | |

## Key Decisions

| Date | Phase | Decision | Rationale |
|---|---|---|---|
| 24-ago-2026 | 1 | Priorizar control operativo y claridad sobre añadir más módulos | El CEO necesita que lo existente funcione, se entienda y permita actuar. |
| 24-ago-2026 | 1 | Un dato, una fuente y evidencia fechada | Evita cifras distintas entre pantallas y agentes falsamente “activos”. |
| 24-ago-2026 | 2 | Corregir primero severidad 4/3 y alta frecuencia | Seguridad, pérdidas de datos, acciones rotas y bloqueos superan cualquier ajuste visual. |
| 24-ago-2026 | 8 | Objetivos: llamadas acotadas, estado profundo visible, LCP <2.5s, INP <200ms, CLS <0.1 | Son límites operables y medibles. |
| 03-sep-2026 | Growth closure | Convertir `/viral` y `/growth` de tablero descriptivo a jornada guiada | El CEO necesita saber qué hacer hoy y qué sigue bloqueado, no reconstruir el proceso desde módulos separados. |
| 03-sep-2026 | Growth closure | Separar `verificado`, `configurado`, `no configurado` y `demo` | La presencia de una variable o un estado ficticio no demuestra que un proveedor opere. |
| 03-sep-2026 | Growth closure | Mantener publicación deshabilitada y ofrecer entrega manual marcada | Metricool y Drive no tienen credenciales disponibles; el producto debe degradar con honestidad. |
| 04-sep-2026 | Growth agents | Ejecutar nueve agentes reales sobre un brief común y cerrar con el Consejo de Calidad | Permite comprobar entregables y método sin fingir conexiones, publicación ni datos en vivo. |

## Growth Command closure — 03-sep-2026

Este frente queda cerrado dentro del alcance del centro de crecimiento, sin cambiar el estado de las fases globales que todavía abarcan otras superficies de Empresa OS.

- Auditoría UX: la nueva vista **Hoy** concentra el siguiente paso, progreso, responsables y bloqueos.
- Diseño cotidiano/refinamiento: navegación ampliada, jerarquía de jornada, radar y estados completos en escritorio/móvil.
- Microinteracciones: marcar/reabrir pasos, priorizar/descartar señales, aprobar/devolver piezas y revisar controles con feedback.
- Mensaje recordable: “Preparar, no publicar” cuando no existen conexiones verificadas.
- Rendimiento: solución estática sin framework adicional; un único chequeo autenticado y sin caché para preparación de conexiones.
- Revisión final: la inferencia de agentes se presenta como real y trazable; publicación, métricas, activos y fuentes externas permanecen demo/no conectados.

## Next Actions

- [x] Ejecutar sintaxis y pruebas golden locales (Codex, 24-ago-2026).
- [x] Añadir timeouts compartidos y endpoint de salud profundo (Codex, 24-ago-2026).
- [x] Proteger cron con secreto en Vercel (Codex, 24-ago-2026).
- [ ] Verificar rechazo 401 sin autorización después del deploy (Codex).
- [ ] Ejecutar QA autenticado por cada ruta central y registrar errores de consola/red (Codex).
- [ ] Ejecutar `ci:gate` con credencial de CI y renovar linaje (Codex).
- [x] Actualizar Chromium/Puppeteer juntos y reducir alertas compatibles con Node 20 (Codex, 24-ago-2026).
- [x] Alinear runtime a Node 24.x y Puppeteer 25 según la decisión vigente D-004 (Codex, 03-sep-2026).
- [ ] Completar auditoría UX por flujo y corregir severidad 4/3 (Codex).
- [x] Implementar motor autenticado, contrato y laboratorio para los nueve agentes Growth (Codex, 04-sep-2026).
- [ ] Ejecutar y revisar la batería real 9/9 en producción, con Consejo de Calidad al final (Codex).
