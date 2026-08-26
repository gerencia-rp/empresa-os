# Luxury Deal Studio · M5

**Estado:** v1 local · 2026-08-26 · laboratorio Empresa OS

## Trabajo que resuelve

Convertir la Ficha 360 y el underwriting contractual de una propiedad en una sala ejecutiva de decisión: saber si el deal está listo, qué riesgo impide aprobarlo, cuánto capital exige y cuál es la salida prevista.

## Entrada única

El módulo no consulta RentCast, Airtable, QuickBooks ni Supabase directamente. Lee:

- `property_id` y Ficha 360 desde `v_property_360`, cargada una sola vez por `ffUwLoad`.
- Inputs del análisis activo.
- Outputs de `ffUwComputeAll()`; no replica ARV, refi, IRR, MAO ni retornos.
- Evidencia del ARV: origen, verificación, confianza y fecha.

## Salida estable

`LuxuryDealStudio.buildStudio(ficha360, underwritingOutput, config)` produce:

- `tier`: standard, premium o luxury, según umbrales configurables.
- `executive_summary`: ARV, all-in, utilidad, ROI e IRR raw/display/capped.
- `gates`: identidad, evidencia ARV, contingencia, capital, absorción y paridad contractual.
- `risk_register`: alerta, severidad y acción concreta.
- `capital_plan`: cash to close, payoff, refi, cash-out y pago DSCR.
- `exit_plan`: estrategia, plazo, net wire y reparto.
- `promotion_payload`: contrato anonimizado para Bóveda Plus.

## Gates iniciales

| Gate | Regla |
|---|---|
| Identidad | Existe `property_id` |
| ARV | Valor contractual positivo + fuente declarada |
| Contingencia | Lujo ≥15%, premium ≥12%, standard ≥10% |
| Capital | Capital definido y utilidad positiva |
| Absorción | Lujo ≤12 meses, premium ≤9, standard ≤7 |
| Contrato | Existe veredicto del motor compartido |

Los umbrales comerciales deben salir de configuración antes de producción; los valores actuales son fallbacks explícitos.

## Privacidad y promoción

El `promotion_payload` excluye responsable interno, documentos, pagos reales, nombres de inversionistas y registros operativos de Rental Profitss. Para promover a Bóveda Plus todavía debe cumplir íntegramente `contracts/INTEGRATION-CHECKLIST.md`: casos reales, aislamiento/RLS, entitlement Plus, control de costos y validación visual.

## Pruebas

- `node scripts/test-luxury-deal-studio.mjs`
- `node scripts/contract-golden-cases.mjs --verify`
- `npm run build`
