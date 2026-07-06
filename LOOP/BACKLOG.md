# LOOP · BACKLOG — Flipping Rentals OS

Estados: `pendiente` · `en curso` · `verificado` · `bloqueado (razón)`

## FIX & FLIP (autorizado por CEO 5-jul: SOLO P0)
| # | P | Item | Estado |
|---|---|---|---|
| FF-1 | P0 | Sync FF recurrente (sync-ff-airtable): deals+draws+investors, paridad, soft-delete, cron diario | verificado |
| FF-2 | P0 | Overhead real FF + Pagos HML → EBITDA FF real; hardcodes eliminados | verificado |
| FF-3 | P1 | property_id en ff_deals | **NO AUTORIZADO aún** (orden del CEO: no tocar) |
| FF-4 | P1 | archived_at + alerta vencimientos HML | pendiente (post-P0) |

## Verificación de cierre exigida (CEO)
- Paridad 29=29 · Σ compra = $5,546,100 y Σ ARV = $11,015,000 contra Airtable · interés HML real ($156k) fluye a la UI.

## REMODELACIÓN (Fase 1 hecha; P1 pendientes de OK)
| # | P | Item | Estado |
|---|---|---|---|
| RM-1 | P1 | Cobertura Planner 3/30 casas | pendiente de OK |
| RN-1 | P0 | Rentas: paridad 6/6 con assert + pagos sin fecha importados como revisar + fantasma archivado + base PRODUCCIÓN verificada | verificado |
| CT-1 | P0 | v_holding_pnl consolidado (realizado vs inyectado) + bloque /contable | verificado |
| QB-1 | P0 | Conector QuickBooks | bloqueado (esperando input CEO: company+credenciales) |
| RM-2 | P1 | Write-back avance (requiere scope token, acción CEO) | bloqueado (PAT read-only) |
| RM-3 | P1 | Panel data-quality accionable | pendiente de OK |

## PRÓXIMOS
| # | P | Item | Estado |
|---|---|---|---|
| EC-3 | — | Blueprint §3 RENTAS | siguiente (OK CEO al quedar verde) |
| ED-1 | P0 | Educación: sync congelado 59 vs 45 + cron (molde FF listo) | pendiente de OK |
| OP-1 | P0 | Decisión ClickUp (muerto 12-jun): revivir o retirar | esperando CEO |
| QB-1 | P0 | Conector QuickBooks | bloqueado (input CEO) |
| LD-1 | P1 | Nombres trabajadores ↔ Personal en Campo (cobertura ledger 74% sin rate) | pendiente |
| PT-1 | P1 | Redirect URL portal en Supabase Auth + prueba real inversionista | acción CEO |
