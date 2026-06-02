# Sprint E1 · Área Educación (FlipMentoría) — Fundación

**Fecha:** 2026-06-02
**Objetivo:** Levantar el área Educación como módulo completo dentro de Empresa OS con portal estudiante + panel mentor + biblioteca + Q&A.

## Qué se entregó

| Archivo | Qué hace |
|---|---|
| `supabase/sE1-education-area.sql` | Schema: 12 tablas, 2 vistas (`edu_scorecard`, `edu_alerts`), RLS por rol student/mentor/admin, registra el área en `system_areas` + 5 sistemas en `systems`. |
| `supabase/sE1-seed-curriculum.sql` | Seed: 6 etapas (E0-E5), 22 bloques, 78 tareas con códigos jerárquicos (E0.1.1, E1.3.4...), 16 dependencias clave, 10 recursos esenciales. |
| `education.js` | Reescrito desde cero. 5 vistas: Mi Ruta, Biblioteca, Q&A, Panel Mentor, Curriculum. |
| `app.js` | Dispatcher para los 5 tipos de sistema `education-*`. |

## Modelo de datos (resumen)

```
edu_cohorts (2026-Q1, 2026-Q2...)
   └── edu_enrollments (alumno × cohorte)
        └── edu_student_progress (alumno × tarea → status + evidencia)

edu_curriculum_stages (E0..E5)
   └── edu_curriculum_blocks (E0.1, E0.2...)
        └── edu_curriculum_tasks (E0.1.1, E0.1.2... las 78)
             └── edu_curriculum_deps (qué tarea bloquea cuál)

edu_students      → perfil extendido del user (big_why, capital, ciudad invest)
edu_resources     → contactos + tools + plantillas, etiquetados por etapa/tarea/estado
edu_deliverables  → entregables estructurados (LLC, Buy Box, ARV, MAO...)
edu_questions     → Q&A estudiante → mentor (publicables para cohorte)
edu_office_hours  → sesiones grupales agendadas

VIEWS:
edu_scorecard → % avance por alumno + breakdown por etapa
edu_alerts    → estudiantes atascados >7 días + tareas pendientes de revisión
```

## RLS (Row Level Security)

- **student**: ve y edita sólo SUS datos (progress, deliverables, questions).
- **mentor / admin**: ve y edita TODOS (función helper `is_mentor_or_admin()`).
- **curriculum + resources**: lectura para todos los autenticados; escritura sólo mentor/admin.

## Curriculum sembrado (resumen)

- **E0 Fundación · 10 tareas** — LLC, Operating Agreement, EIN, cuenta de negocio, software contable, abogado/contador, Big Why, bloque diario, Quick Win, stack Taskade.
- **E1 Evaluar · 17 tareas** — 5 Buy Box renta + 5 Buy Box venta, investigación ZIP A/B/C, drive-through, 10 comparables, ARV conservador/optimista, remodelación por niveles, MAO regla 75%, 10 ofertas/mes.
- **E2 Estructurar · 26 tareas** — 10 HMLs entrevistados, term sheets, private money, HELOC, 5 eventos REIA, 20 wholesalers, 10 GCs con bids verificados, permisos, SOW + cronograma + contingencia.
- **E3 Ejecutar · 9 tareas** — Supervisión 3×/sem, draw schedule, budget tracker, inspecciones en hitos, bitácoras.
- **E4 Salida · 7 tareas** — Staging, fotografía, pricing, marketing 4 plataformas, open house, agente.
- **E5 Escalar · 8 tareas** — Postmortem, SOPs, red privada, lead gen, contratar PM, expansión 2do mercado.

## Cómo aplicar (paso a paso)

1. Abre Supabase SQL Editor.
2. Pega y ejecuta `supabase/sE1-education-area.sql` (schema + RLS + áreas).
3. Pega y ejecuta `supabase/sE1-seed-curriculum.sql` (78 tareas + 22 bloques + 6 etapas + deps + 10 recursos).
4. Recarga la app — verás el área **🎓 Educación** en el sidebar con 5 sistemas.
5. Como admin, entra a **Panel Mentor** → "+ Cohorte" → crea tu primera cohorte.
6. Como admin, entra a "+ Estudiante" → invita por email (debe crear cuenta con ese mismo email después).
7. El estudiante hace signup → entra a **Mi Ruta 90 días** → se auto-inscribe en la cohorte activa.

## Próximos sprints (roadmap)

- **E2 — Cargar contenido completo de Drive**: parsear los 8 .docx restantes y poblar:
  - Steps detallados por tarea (`edu_curriculum_tasks.steps`)
  - Errores comunes (`common_errors`)
  - 400 contactos del Doc A en `edu_resources`
  - Plantillas/KPIs/scripts del Doc C
- **E3 — Office hours + recordatorios WhatsApp**: integrar con el bot PM existente.
- **E4 — Integración con herramientas Empresa OS**:
  - Cuando el estudiante esté en E1.3 → atajo al Estimador Pro precargado.
  - Cuando esté en E1.1 → editor estructurado de Buy Box que guarda como JSON en `edu_deliverables`.
- **E5 — Postmortem automático del primer flip**: ingiere datos del Estimador Pro + actuals y genera el análisis E5.1.1.

## Notas técnicas

- El schema usa `pg_trgm` para búsqueda fuzzy en `edu_resources.name`.
- La vista `edu_scorecard` calcula % avance combinando completed + submitted (no requiere aprobación del mentor para contar como avance del alumno).
- La vista `edu_alerts` separa 2 tipos: `stuck` (sin actividad >7 días) y `awaiting_review` (tareas con status='submitted').
- El JS no usa frameworks. Solo Tailwind CDN + Supabase JS.
- `education.js` se cargó después de `pm-dashboard.js` en index.html (ya estaba la referencia desde antes).
