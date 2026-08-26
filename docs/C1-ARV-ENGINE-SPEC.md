# C1 — Especificación verificable del motor profesional de ARV

**Estado:** especificación final de Codex para integrar en `CALCULATION-CONTRACT.md` §1
**Implementación revisada:** `pm/ff-arv-engine.js`
**Consumidor principal:** `pm/ff-arv-pro.js`
**Fecha de corte:** 2026-08-25

## 1. Propósito y salida

El motor estima el valor de reventa remodelado a partir de comparables ajustados. No calcula el ARV como precio promedio por pie cuadrado multiplicado por el área del subject.

Salida mínima:

- `arv`: mediana ponderada de valores ajustados, después de calibración.
- `p25` / `p75`: rango ponderado conservador y optimista.
- comparables incluidos, excluidos y outliers, con razones.
- filtros finalmente utilizados y nivel de expansión.
- confianza cualitativa, puntaje 0–100 y razones.
- sesgo global y por submercado aplicado.
- conflictos o datos dudosos del subject.

## 2. Entradas

### Subject

`sqft`, `beds`, `baths`, `year`, `lot`, `pool`, `garage`, `zip`, `tipo` y dirección/identificadores para trazabilidad.

### Comparable

`id`, `price`, `sqft`, `beds`, `baths`, `year`, `lot`, `dist`, `close_date`, `status`, `sale_type`, `tipo`, `pool`, `garage` y dirección.

Regla D-020:

- Solo `status=sold|closed`, `sale_type=arms_length`, precio positivo y fecha de cierre verificable son elegibles para la mediana.
- `active|pending` se conservan como capa separada de temperatura y jamás reciben peso.
- `inactive|removed` no equivale a vendido: queda excluido mientras no exista evidencia de cierre.
- `foreclosure|short_sale|reo|non_arms_length` queda excluido del ARV canónico.

### Configuración

Todas las tolerancias, factores y sesgos proceden de `ff_uw_config`. Los valores embebidos en el motor son fallbacks, no parámetros comerciales inmutables.

## 3. Saneamiento y conflictos del subject

Antes de filtrar comparables:

- `beds <= 1` con `sqft >= 1000` se marca dudoso y las camas no se usan silenciosamente.
- `baths < 1` se marca dudoso y no se usa.
- `sqft < 400` se marca dudoso y no se usa.
- Si dos fuentes difieren fuera de tolerancia en camas, baños, área o año, se registra el conflicto.
- Un override humano explícito resuelve el conflicto para el cálculo, pero debe conservar fuente y auditoría.

## 4. Elegibilidad y filtros

Cada comparable debe tener precio positivo y pasar los filtros configurados de:

- distancia máxima;
- antigüedad máxima de la venta/listing;
- diferencia porcentual de área;
- diferencia de camas y baños;
- diferencia de año;
- tipo de propiedad, cuando esté disponible;
- piscina, únicamente cuando subject y comparable tengan el dato.

Se eligen como máximo `arv_comps_max`, ordenando primero por menor ajuste bruto. Deben quedar al menos `arv_comps_min`.

### Expansión adaptativa

Si no se alcanza el mínimo, se prueban en orden:

1. filtros base;
2. meses × 1.5;
3. meses × 2 y distancia + 0.5 millas;
4. lo anterior más tolerancia de área + 10 puntos porcentuales.

La expansión queda declarada y reduce la confianza. Nunca se presenta una búsqueda expandida como equivalente a los filtros base.

## 5. Ajustes del comparable hacia el subject

Para cada comparable:

```text
valor_ajustado = precio_comp + suma(ajustes)
```

Ajustes automáticos:

```text
GLA       = (sqft_subject − sqft_comp) × adj_gla_psf[zip|global]
cuartos   = (beds_subject − beds_comp) × adj_cuarto
baños     = (baths_subject − baths_comp) × adj_baño
año       = (year_subject − year_comp) × adj_año_pct/100 × precio_comp
lote      = (lot_subject − lot_comp) × adj_lote_psf, si |Δ lote| > 500 sqft
piscina   = ±adj_piscina
garaje    = ±adj_garaje
tendencia = meses_desde_comp × mercado_pct_mes/100 × precio_comp
```

Ajustes manuales auditables: condición/remodelación, ubicación/submercado, concesiones del vendedor y otros. Las concesiones restan.

```text
ajuste_neto_pct  = suma(ajustes) / precio_comp × 100
ajuste_bruto_pct = suma(|ajuste|) / precio_comp × 100
```

## 6. Exclusión estadística por MAD

Con cuatro o más comparables utilizables:

```text
M  = mediana(valores_ajustados)
MAD = mediana(|valor_ajustado − M|)
z_robusto = |valor_ajustado − M| / (1.4826 × MAD)
```

Se excluye un comparable cuando `z_robusto > arv_outlier_mad_k`, siempre que la exclusión no reduzca la muestra por debajo del mínimo. La exclusión y su razón deben quedar visibles.

## 7. Pesos y reconciliación

Para cada comparable restante:

```text
peso_similitud = 1 / (ajuste_bruto_pct + 2)
peso_recencia  = 1 / (1 + meses_desde_venta / 6)
peso_distancia = 1 / (1 + distancia_millas)
peso_total     = peso_similitud × peso_recencia × peso_distancia
```

El ARV base es el cuantil ponderado 0.50; el rango usa cuantiles 0.25 y 0.75.

```text
sesgo_total = arv_bias_pct + arv_bias_pct_<zip>
ARV = round(Qw(0.50) × (1 + sesgo_total/100))
P25 = round(Qw(0.25) × (1 + sesgo_total/100))
P75 = round(Qw(0.75) × (1 + sesgo_total/100))
```

## 8. Confianza

Parte de 100 y resta penalizaciones por:

- dispersión de valores ajustados (CV);
- muestra pequeña;
- comparables antiguos;
- distancia;
- ajustes brutos altos;
- expansión adaptativa.

El motor devuelve puntaje y nivel `alta`, `media`, `baja` o `sin comps`, acompañado por razones cuantitativas. La confianza no puede reemplazar evidencia ni presentarse como probabilidad estadística.

## 9. Triangulación

ARV por comparables, AVM, assessed×factor y appraisal previa son señales separadas. Si la separación entre máximo y mínimo sobre la mediana supera `arv_triang_warn_pct`, se genera advertencia con las fuentes extremas y posibles conflictos del subject. La triangulación no promedia automáticamente señales heterogéneas.

## 10. Backtest y calibración

Con tasaciones o ventas reales:

```text
error_pct = (ARV_estimado − valor_real) / valor_real × 100
MdAPE     = mediana(|error_pct|)
MAPE      = promedio(|error_pct|)
sesgo     = promedio(error_pct)
```

La calibración busca parámetros por coordenadas minimizando MdAPE, después calcula sesgos por ZIP con muestra mínima y finalmente sesgo global sujeto a la meta. Una corrida es de solo lectura por defecto. Solo puede persistir con `--persist` cuando simultáneamente:

1. alcanza `MdAPE <= 6%`;
2. alcanza `|sesgo| <= 2%`;
3. mejora el MdAPE de la configuración activa.

## 11. Brechas que impiden aceptar C1 todavía

1. La fuente RentCast `/avm/value` observada expone `Active`/`Inactive` y `listingType`, pero no demuestra cierre arms-length. Por eso esas filas quedan fuera del ARV hasta ser enriquecidas por una fuente con `status`, `sale_type`, precio y fecha de cierre verificables.
2. Debe definirse el comportamiento cuando `MAD = 0`; hoy se sustituye por 1, decisión que debe quedar contractual y cubierta por prueba.
3. Los umbrales configurados en producción deben congelarse como fixture versionado, no asumirse por los fallbacks del código.
4. La calibración necesita validación fuera de muestra o partición temporal para reducir sobreajuste por ZIP con pocas tasaciones.
5. Falta convertir casos reales completos en fixtures sin datos privados y probar paridad Empresa OS ⇄ Bóveda.

La conformidad de código con D-020 se prueba con `node scripts/test-arv-d020.mjs`. C1 puede marcarse ✅ cuando Claude integre esta especificación en el contrato. La disponibilidad de datos sold+arms-length verificables y la paridad de fixtures se validan en C2.
