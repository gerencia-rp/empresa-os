# Create an App Plan

## Context

Inicio: 2026-09-03. Aplicación: centro de mando privado de crecimiento y contenido para Nicolás Lara. La primera entrega es un prototipo web navegable con datos de demostración, sin credenciales externas y sin reemplazar `/viral`.

El brief delegado cubre el intake: usuario único inicial (Nicolás), carga baja, construcción web dentro de Empresa OS, sin cliente iOS nativo. El supuesto más riesgoso es que una revisión semanal unificada permita decidir qué producir y publicar sin volver a hojas, chats o herramientas separadas. El prototipo es el instrumento para comprobarlo.

## Phase Status

| Phase | Skill | Status | Artifact | Date |
|---|---|---|---|---|
| 1 | lean-startup | awaiting-evidence | PRODUCT.md, EXPERIMENTS.md | 2026-09-03 |
| 2 | design-sprint | awaiting-evidence | DESIGN.md, EXPERIMENTS.md | 2026-09-03 |
| 3 | clean-architecture | done | GROWTH-COMMAND-ARCHITECTURE.md | 2026-09-03 |
| 4 | domain-driven-design | done | GROWTH-COMMAND-ARCHITECTURE.md | 2026-09-03 |
| 5 | clean-code | done | GROWTH-COMMAND-TESTING.md | 2026-09-03 |
| 6 | pragmatic-programmer | done | GROWTH-COMMAND-TESTING.md, GROWTH-COMMAND-ARCHITECTURE.md | 2026-09-03 |
| 7 | system-design | done | GROWTH-COMMAND-ARCHITECTURE.md | 2026-09-03 |
| 8 | ios-hig-design | skipped: no existe cliente iOS nativo en el alcance | DESIGN.md | 2026-09-03 |
| 9 | 37signals-way | done | PRODUCT.md, GROWTH-COMMAND-RESEARCH.md | 2026-09-03 |
| 10 | software-design-philosophy | done | GROWTH-COMMAND-ARCHITECTURE.md | 2026-09-03 |

Statuses: pending · in-progress · awaiting-evidence · done · deferred: <reason> · skipped: <reason>

## Key Decisions

| Date | Phase | Decision | Rationale |
|---|---|---|---|
| 2026-09-03 | Intake | Crear una superficie nueva en `/growth` | Evita reutilizar o poner en riesgo el sistema publicado en `/viral`. |
| 2026-09-03 | 1 | Usar la revisión semanal como experimento central | Es el momento donde Nicolás necesita convertir señales en decisiones. |
| 2026-09-03 | 2 | Diseñar un cockpit oscuro, denso y progresivo | Mantiene coherencia con Empresa OS y prioriza estado, evidencia y próxima acción. |
| 2026-09-03 | 2 | Toda cifra inicial se identifica como demostración | Evita que actividad simulada se confunda con desempeño real. |
| 2026-09-03 | Architecture preview | Encapsular datos detrás de un repositorio | Permite sustituir demo por Google Drive, Metricool y Supabase sin reescribir la UI. |
| 2026-09-03 | Quality | Incluir un consejo final como compuerta visible | Hace explícitos hallazgos, evidencia y decisión de salida sin prometer viralidad. |
| 2026-09-03 | Security | Reutilizar Supabase Auth y limitar el centro a perfiles admin activos | Evita una contraseña paralela y conserva MFA cuando está habilitado. |
| 2026-09-03 | Release | Generar `dist/viral.html` desde la aplicación nueva y conservar el `viral.html` fuente | Vercel prioriza archivos estáticos; así se reemplaza la ruta sin destruir el piloto recuperable. |

## Next Actions

- [ ] Nicolás completa una revisión semanal usando solamente el prototipo y registra fricciones (Nicolás, siguiente revisión).
- [ ] Medir si puede aprobar/rechazar/reprogramar las cinco piezas sin ayuda y en menos de 15 minutos (Nicolás, siguiente revisión).
- [ ] Decidir si el flujo validado avanza a arquitectura persistente e integraciones (Nicolás + Codex, después de evidencia).
