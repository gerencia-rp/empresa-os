# Auditoría · EDUCACIÓN — 5 Jul 2026

Auditor-arquitecto · Fase 1 (solo lectura). Fuentes: Airtable `appFNKrtV0mMk960t` "Estudiantes Flipping Rentals" (16 tablas: estudiantes, ventas, onboarding, seguimiento con Health Score, satisfacción, equipo, + curriculum Fliptrack: Etapas/Procesos/Sistemas/Biblioteca/Glosario) + `appZhUnx6CNJ4hIfd` "Academia_FlipMentoria". Espejo: ~30 tablas `edu_*` vía `sync-education-airtable`.

## 1 · Modelo de datos real
- `edu_students` 545 (2 mentorships: **flipping-rentals 45** + **rental-profits 500**) · `edu_student_plans` 30 · `edu_student_plan_tasks` 3,170 · `edu_whatsapp_messages` 132 · `edu_okr_targets` 20 · `edu_ceo_snapshot` (KPIs que lee el OS).
- La fuente es RICA: TBL Seguimiento tiene **Health Score + Alerta por fórmula**, etapa/subetapa, capital actual; Ventas tiene **Monto de Inscripción / Estado de Pago / Cash pendiente** (¡los ingresos de Educación SÍ existen en la fuente!).

## 2 · Paridad e integridad — ❌ ROTA (espejo congelado)
| Check | Fuente | Espejo | Δ |
|---|---|---|---|
| Estudiantes (0.0Tbl_Estudiantes) | **59** | **45** (flipping-rentals) | **−14 (−24%)** |
| Cron de sync | — | **NO EXISTE** (`sync-education-airtable` solo manual) | mismo patrón FF pre-fix |
| `edu_student_activity` | — | **0 filas** | señal de actividad muerta |
| Soft-delete | — | sin `archived_at` en la mayoría de edu_* | ⚠️ |

## 3 · Verificación de KPIs (edu_ceo_snapshot, lo que muestra el OS)
| KPI snapshot | Valor | Contraste con crudo | Veredicto |
|---|---|---|---|
| total / activos | 45 / 44 (97.8%) | fuente = **59** | ❌ subcontado 24% |
| inactivos_30d | 44 (**100%**) | contradice "97.8% activos" | ❌ definición rota: sin señales de actividad (0 filas), TODO figura inactivo |
| sesiones_mes / asistencias | 0 / 0 | `edu_student_calls` = 1 fila | ❌ señal no sincronizada |
| con_plan_activo | 28 | plans 30 | plausible ✓ |
| **Ingresos Educación** | no existe | fuente los tiene (1.Tbl Ventas: Monto de Inscripción, Cash pendiente) | ❌ oportunidad directa para el P&L holding |

## 4 · Ecosistema
✔ Correctamente aislada por diseño (estudiantes, no casas). Puente pendiente natural: `tbl_Propiedades_estudiantes` (deals de alumnos) podría alimentar casos de éxito/underwriting, sin property_id del holding.

## 5 · Findings priorizados
### P0
1. **Espejo congelado y subcontado (59 vs 45, sin cron)** — replicar EXACTO el molde FF: cron (colgarlo del cron diario existente) + assert de paridad (`edu_students` en `remodel_sync_parity`) + soft-delete archive-unseen.
2. **KPIs del snapshot contradictorios** (97.8% activos + 100% inactivos + 0 sesiones): las señales de actividad no se sincronizan (`edu_student_activity` vacía, calls=1). O se sincronizan las fuentes de actividad (Seguimiento/llamadas/WhatsApp) o se retiran esos KPIs del snapshot (hoy mienten).
### P1
3. **Ingresos de Educación al P&L holding**: espejar `1.Tbl Ventas` (Monto de Inscripción, Estado de Pago, Cash pendiente) → fila `educacion` de `v_holding_pnl` deja de ser NULL. La fuente ya lo tiene TODO.
4. **Health Score/Alerta de Seguimiento no llegan al OS** — la fuente calcula salud del alumno por fórmula y el sistema no la muestra (churn prevention gratis).
### P2
5. Soft-delete (`archived_at`) en edu_*.
6. La mentorship 'rental-profits' (500 estudiantes) — ¿de qué base viene, sigue viva? Documentar o archivar.

## 6 · Oportunidades (agentes IA)
- **Agente de retención**: Health Score + Alerta (fórmulas ya en fuente) → mensaje WhatsApp al alumno en riesgo (infra edu-whatsapp-* YA existe y analiza respuestas con Claude).
- **Cash collection**: "Cash pendiente por recolección" en Ventas → agente de cobranza de mentorías.

**Veredicto: la fuente es la más rica del holding y el espejo el más desactualizado.** Mismo remedio que FF (ya probado dos veces hoy): cron + paridad + soft-delete, y los ingresos de Educación completan el P&L consolidado.
