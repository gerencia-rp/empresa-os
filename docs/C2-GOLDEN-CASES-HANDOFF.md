# C2 — Golden cases ejecutables · entrega de Codex

**Estado:** Empresa OS ✅ 3/3 · paridad Bóveda pendiente de Claude
**Fecha:** 2026-08-25

## Artefacto compartible

`scripts/contract-golden-cases.mjs` contiene entradas completas, comparables sintéticos sin datos privados, supuestos, resultados congelados y el verificador exacto. La ejecución canónica es:

```bash
node scripts/contract-golden-cases.mjs --verify
```

Claude debe copiar/importar este mismo fixture en Bóveda, conectar sus funciones contractuales y demostrar los mismos resultados. C2 solo queda cerrado cuando ambas implementaciones pasan.

## Resultados congelados

| Métrica | GC-001 Flip estándar | GC-002 Hold/BRRRR | GC-003 Flip lujo |
|---|---:|---:|---:|
| ARV | 446,500 | 446,500 | 1,505,000 |
| MAO | 231,853 | 234,204 | 755,575 |
| All-in | 338,022 | 320,671 | 1,153,175 |
| Gate all-in | no pasa | pasa | no pasa |
| Utilidad | 62,254.98 | n/a | 95,944.24 |
| Cash invested | 65,000 | 29,782.70 | 260,000 |
| ROI | 95.78% | -1.70% | 36.90% |
| MOIC | 1.96x | n/a | 1.37x |
| IRR raw/display | 283.29% | n/a | 40.87% |
| DSCR | n/a | 1.20 | n/a |
| Cap rate | n/a | 4.53% | n/a |
| Flujo mensual | n/a | -42 | n/a |
| Equity recuperado refi | n/a | -77,417.27 | n/a |

## Lecturas que el fixture blinda

- Solo `sold|closed + arms_length + precio + fecha` entra al ARV; el activo de cada fixture queda con peso cero como temperatura.
- GC-002 está limitado por DSCR y produce cash-out negativo: no se oculta; representa capital adicional requerido al cierre.
- `cash_invested` está definido por caso. Para flip usa el override de capital; para hold usa `max(0, cash_to_close − max(0, cash_out))`.
- IRR de flip se anualiza desde el capital y el retorno final; se conserva raw y display por separado.

## Gaps contractuales visibles

Empresa OS todavía deriva MOIC e IRR en este adaptador porque el motor UI no los devuelve como campos canónicos. Bóveda no debe copiar una simplificación distinta: debe reproducir estas definiciones o registrar una decisión antes de cambiarlas.
