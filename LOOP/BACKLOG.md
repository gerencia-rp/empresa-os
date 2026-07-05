# LOOP · BACKLOG — Flipping Rentals OS

Estados: `pendiente` · `en curso` · `verificado` · `bloqueado (razón)`

## FIX & FLIP (autorizado por CEO 5-jul: SOLO P0)
| # | P | Item | Estado |
|---|---|---|---|
| FF-1 | P0 | Sync FF recurrente (`sync-ff-airtable`): deals+draws+investors, upsert por airtable_id, archive-unseen (soft-delete), assert de paridad, badge UI + footer honesto | en curso |
| FF-2 | P0 | Espejar overhead real FF (Gastos Equipo + Plataformas → `ff_overhead`; Pagos HML → `ff_hml_payments`) → EBITDA FF real; borrar hardcodes $146k/$46k (ff-cc + os.js) | pendiente |
| FF-3 | P1 | property_id en ff_deals | **NO AUTORIZADO aún** (orden del CEO: no tocar) |
| FF-4 | P1 | archived_at + alerta vencimientos HML | pendiente (post-P0) |

## Verificación de cierre exigida (CEO)
- Paridad 29=29 · Σ compra = $5,546,100 y Σ ARV = $11,015,000 contra Airtable · interés HML real ($156k) fluye a la UI.

## REMODELACIÓN (Fase 1 hecha; P1 pendientes de OK)
| # | P | Item | Estado |
|---|---|---|---|
| RM-1 | P1 | Cobertura Planner 3/30 casas | pendiente de OK |
| RM-2 | P1 | Write-back avance (requiere scope token, acción CEO) | bloqueado (PAT read-only) |
| RM-3 | P1 | Panel data-quality accionable | pendiente de OK |

## Próximas auditorías Fase 1: Contable → Rentas → Operación → Educación
