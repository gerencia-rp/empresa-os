# Handoff · Luxury Deal Studio M5 → Fundación Bóveda Plus

**Fecha:** 2026-08-26  
**Estado:** laboratorio de Empresa OS implementado; validación real inicial completada.

## Qué lee

Una sola entrada ensamblada por Empresa OS:

- `property_id` inmutable y `canonical_property_key` cuando exista.
- Ficha 360: dirección, etapa, compra, rehab real, appraisal, ARV, avance y evidencia.
- Inputs del análisis vigente, incluyendo contingencia.
- Outputs del motor contractual: negocio, cash-out/refi, intereses, venta y vista unificada.

No consulta RentCast, Supabase, Airtable ni otra fuente por separado. Es un consumidor puro de Ficha 360 + motor contractual.

## Qué produce

- Franja `standard | premium | luxury` configurable.
- Resumen ejecutivo: ARV, all-in, utilidad, ROI, IRR raw/display/capped y veredicto.
- Seis gates: identidad, evidencia ARV, contingencia, capital, absorción y paridad contractual.
- Registro de riesgos con acción recomendada.
- Plan de capital y plan de salida.
- `promotion_payload` versionado y anonimizado para Bóveda Plus.

## Gate de producto

En Bóveda Plus el módulo debe estar detrás de la capacidad `luxury_deal_studio`. El teaser puede mostrar el método y los seis gates, pero nunca datos internos de Rental Profitss ni resultados de una propiedad interna.

## Caso real validado

`1109 Arcadia Ave` se clasificó como `premium` por ARV de $660,000. El motor entregó 5/6 gates; el único gate pendiente fue contingencia: 10% cargado frente a mínimo recomendado de 12% para esa franja. Esto confirma que el tiering no es decorativo: cambia el criterio de decisión sin modificar las fórmulas contractuales.

## Promoción

Antes de promover a Bóveda Plus:

1. Ejecutar golden cases 3/3 en ambos productos.
2. Validar al menos un caso real por franja.
3. Verificar que el payload no contenga responsable interno, documentos, intereses internos ni PII.
4. Activar por entitlement, con medición de uso y costo.
5. Registrar cualquier cambio de shape o fórmula en `DECISIONS.md` antes de implementarlo.
