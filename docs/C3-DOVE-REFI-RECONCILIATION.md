# C3 — Conciliación del refinanciamiento de Dove Springs

**Propiedad:** 2315 Dove Springs Dr, Austin, TX 78744
**Fecha de corte:** 2026-08-25
**Estado:** bloqueado por documento fuente; no es seguro corregir un campo por inferencia.

## Datos espejados actuales

| Campo | Valor |
|---|---:|
| Appraisal | USD 370,000.00 |
| LTV registrado | 76.20% |
| Préstamo real del refi | USD 282,000.00 |
| “Monto pagado al HML con la refi” | USD 262,926.67 |
| Cash-out registrado | USD 22,207.13 |
| Cuota PITI real | USD 2,725.57 |

## Identidad contable esperada

El contrato vigente interpreta “Monto pagado al HML con la refi” como payoff más costos, es decir, todo lo descontado antes del balance al borrower:

```text
cash_out = préstamo_real − monto_pagado_total
cash_out = 282,000.00 − 262,926.67
cash_out = 19,073.33
```

Pero el campo de cash-out registra USD 22,207.13:

```text
diferencia = 19,073.33 − 22,207.13 = −3,133.80
```

Para que el cash-out registrado sea correcto, el monto total descontado tendría que ser:

```text
282,000.00 − 22,207.13 = 259,792.87
```

## Conclusión

La hipótesis de que la diferencia proviene de usar `ARV × 75%` frente a `mínimo(LTV, DSCR, lender, real)` queda descartada para este caso: Empresa OS ya usa el **préstamo real confirmado de USD 282,000**, por lo que la discrepancia ocurre después de fijar el préstamo.

Al menos uno de estos elementos está mal definido o mal transcrito:

1. cash-out / balance to borrower;
2. monto pagado al HML;
3. alcance semántico de “pagado al HML” (payoff puro versus payoff + costos);
4. algún crédito/débito del closing disclosure no representado en esos campos.

## Evidencia requerida para cerrar C3

Revisar el Closing Disclosure/HUD definitivo y extraer, con página y renglón:

- principal del préstamo;
- payoff del HML;
- costos del lender;
- título/registro;
- prepagados;
- escrows;
- otros créditos y débitos;
- balance/cash to borrower.

Luego se corrige únicamente el campo demostrado por el documento fuente y se crea el fixture ejecutable de Dove. Hasta entonces Dove no puede ser golden case exacto y la aplicación debe mostrar la discrepancia, no esconderla ni decidir cuál número “parece” correcto.
