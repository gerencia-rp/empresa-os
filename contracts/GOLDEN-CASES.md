# GOLDEN-CASES.md

**Versión:** v0.4 (C2 Empresa OS 3/3) · **Fecha:** 2026-08-25 · Redactó: Claude+Codex

Propiedades de **referencia** con **entradas completas** y **resultados exactos**, usadas como **fixtures ejecutables** de paridad. Empresa OS y La Bóveda deben producir **exactamente los mismos números con las mismas entradas**.

## Estado C2
El GC-001 de la v0.2 era matemáticamente inconsistente y permanece descartado. Esta v0.4 congela tres casos **sintéticos, sin datos privados**, generados por la corrida autoritativa de Empresa OS en `scripts/contract-golden-cases.mjs`.

- **Ningún golden case se siembra con números sacados de logs.** Cada caso se genera de **una corrida autoritativa del motor** con **entradas completas** y se **congela** al centavo.
- Los tres casos deben tener: **todas** las entradas, **todos** los resultados esperados, y un **fixture ejecutable** (mismo archivo de test importado por ambos repos).
- Empresa OS: **3/3 exactos ✅** (`node scripts/contract-golden-cases.mjs --verify`).
- Bóveda: **3/3 exactos ✅** (2026-08-26, C6): mismo script espejo en `boveda/scripts/contract-golden-cases.mjs --verify`, corriendo el motor contractual portado a `packages/core` (`arv-engine.cjs` byte-idéntico + `uw-compute.mjs` extracción byte-idéntica). Blindado en CI (`packages/core/test/contract-engine.test.mjs`).

## Esquema obligatorio de un golden case
```
GC-XXX
  descripcion, canonical_property_key, strategy, price_tier
  inputs (COMPLETOS, sin faltantes):
    purchase, rehab, closing_costs_compra, closing_costs_venta,
    financing{ tipo, monto, tasa, puntos, plazo }, holding{ meses, taxes, insurance, utilities, otros },
    arv_inputs{ comps[] con status/sale_price/close_date/dom/condition/sale_type/distance/adjustments } o arv_fijo,
    (hold) rent, gastos_operativos, refi{ ltv, dscr_min, lender_cap, prestamo_confirmado? }
  cash_invested: DEFINIDO explícitamente (fórmula y valor)
  esperado (EXACTOS):
    arv, mao, all_in, gate_pass, utilidad, roi_pct, moic, pct_sobre_all_in,
    irr_raw_pct, irr_display_pct, irr_is_capped,
    (hold) dscr, cap_rate, monthly_cashflow, cash_on_cash_anual, equity_recuperado_refi
  tolerancia: full precision interna; redondeo solo en presentación
```

## Inputs comunes congelados
- `usar_estimador=false`; appraisal ausente; moneda USD.
- Subject estándar: 1,800 sqft. Lujo: 3,500 sqft.
- Compra: HML 90% compra, 100% rehab, 12% anual; costos de originación/cierre definidos por el fixture ejecutable.
- Refi: LTV 75%, DSCR mínimo 1.20, tasa 7.125%, 30 años; se aplica el mínimo contractual.
- ARV estándar: cierres sintéticos arms-length de $445,000, $450,000, $455,000 y $460,000; listing activo de $900,000 con peso 0. Resultado del motor: $446,500.
- ARV lujo: cierres sintéticos arms-length de $1,480,000, $1,505,000, $1,530,000 y $1,555,000; listing activo de $2,100,000 con peso 0. Resultado: $1,505,000.
- Los campos completos — fechas, distancias, características, holding, cierres, fees, impuestos, seguros y financiación — están versionados en el fixture ejecutable. Ese fixture es parte normativa de C2; esta tabla es su resumen humano.

## GC-001 — Flip estándar
- **strategy:** flip · **price_tier:** standard
- **inputs principales:** purchase $235,000 · rehab $85,000 · holding 6 meses · staging $3,500 · `cash_invested` $65,000.
- **esperado exacto:** `arv=446500` · `mao=231853` · `all_in=338022` · `gate_pass=false` · `utilidad=62254.98` · `cash_invested=65000` · `roi_pct=95.78` · `moic=1.96` · `pct_sobre_all_in=18.42` · `irr_raw_pct=283.29` · `irr_display_pct=283.29` · `irr_is_capped=false`.
- **Propósito:** blindar MAO, all-in, gate, utilidad, ROI, MOIC y el manejo de IRR (raw/display/capped).

## GC-002 — Hold / BRRRR
- **strategy:** hold/brrrr · **price_tier:** standard
- **inputs principales:** purchase $220,000 · rehab $80,000 · renta $3,200/mes · demora renta 2 meses; refi por mínimos contractual.
- **esperado exacto:** `arv=446500` · `mao=234204` · `all_in=320671` · `gate_pass=true` · `utilidad=null` · `cash_invested=29782.70` · `roi_pct=-1.70` · `moic=null` · `pct_sobre_all_in=null` · `irr=null` · `dscr=1.20` · `cap_rate=4.53` · `monthly_cashflow=-42` · `cash_on_cash_anual=-1.70` · `equity_recuperado_refi=-77417.27`.
- **semántica:** el equity recuperado negativo significa capital adicional requerido, no dinero retirado.
- **Propósito:** blindar renta, el **refi por mínimos** y el equity recuperado.

## GC-003 — Flip de lujo
- **strategy:** flip · **price_tier:** luxury
- **inputs principales:** purchase $780,000 · rehab $310,000 · holding 11 meses · staging/marketing $28,000 · contingencia 18% · `cash_invested` $260,000.
- **esperado exacto:** `arv=1505000` · `mao=755575` · `all_in=1153175` · `gate_pass=false` · `utilidad=95944.24` · `cash_invested=260000` · `roi_pct=36.90` · `moic=1.37` · `pct_sobre_all_in=8.32` · `irr_raw_pct=40.87` · `irr_display_pct=40.87` · `irr_is_capped=false`.
- **Propósito:** estresar el motor tier-aware en el caso más exigente sin romper la doctrina.

## Caso real de referencia: 2315 Dove Springs (reconstruido con lo disponible)
Etiquetado por evidencia (AI-EVIDENCE): **[V]** verificado en documento · **[M]** manual/Nicolás (a confirmar) · **[ND]** no disponible.

- **Compra [V]** (HUD 15/05/2025): precio **$160,000**; préstamo HML USAM **$258,000** (incluye reservas: repair $75,000, default $25,800, tax $3,459.61); cash del comprador **$36,401.57**.
- **Appraisal [V]** (07/08/2025, refi): **ARV $370,000** (enfoque de ventas comparables; "subject to" terminar cocina/estufa). Nicolás menciona **~$380,000 [M]** como valor del refi.
- **Refi — regla de préstamo [V/M]:** "prestan el **75% del appraisal**" = límite por LTV (D-013). Préstamo registrado en Empresa OS **$282,000 [V-EmpresaOS]** ≈ **75% de ~$376,000** → **consistente con la regla del 75%**. (Con appraisal $370k, 75% = $277,500; el préstamo real $282k implica un valor usado por el lender ≈ $376k.)
- **Cash-out [ND]:** no calculable sin el **HUD de refi de Dove** (faltan payoff del HML USAM y costos de cierre). El $22,207.13 que figuraba "para Dove" era en realidad de **4916 Barkbridge** (ver `CERTIFICATION.md` C3 / D-021).

> Esto **no es todavía un golden case ejecutable** (faltan entradas completas y el settlement del refi). Es una **reconstrucción documentada** que valida la regla del 75% en el préstamo. El golden case ejecutable se arma con el motor conformado (C1) y, para el cash-out, idealmente con el HUD de refi.

## Cómo se usan
1. Cada repo importa estos casos como **fixtures de test ejecutables** (mismo archivo, mismos números).
2. `CALCULATION-CONTRACT.md` se valida contra estos valores en CI de ambos repos.
3. Un cambio que altere cualquier valor esperado ⇒ registrar en `DECISIONS.md`, justificar, actualizar el esperado, re-verificar **ambos** sistemas antes de integrar.
4. **Quién genera los valores:** se corre el motor autoritativo (Empresa OS aporta su motor de ARV/refi; Claude verifica en Bóveda) y se **congelan** de común acuerdo.
