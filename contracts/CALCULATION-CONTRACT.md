# CALCULATION-CONTRACT.md

**Versión:** v0.4 (BORRADOR) · **Fecha:** 2026-08-25 · Redactó: Claude · Incorpora obs. Codex y D-025

Las **fórmulas oficiales**. Definición **única y canónica** por indicador. Si un producto necesita presentarlo más simple, **cambia la explicación, no la matemática**. Empresa OS y Bóveda Plus deben producir **exactamente los mismos números con las mismas entradas** (ver `GOLDEN-CASES.md`).

> Estas definiciones NO se cambian sin registrar la decisión en `DECISIONS.md` y sincronizar el contrato en ambos repos.

## 1. ARV (After Repair Value) — motor profesional canónico (C1 · integrado de Codex · spec v1.0)
Implementación de referencia: `pm/ff-arv-engine.js` (consumidor `pm/ff-arv-pro.js`). Toda tolerancia/factor/sesgo sale de **`ff_uw_config`**; los valores embebidos en el código son **fallbacks**, no parámetros comerciales inmutables.

**1.1 Salida.** Estima el **valor de reventa remodelado** a partir de comparables ajustados — **NO** precio promedio $/sqft × área. Devuelve: `arv` (mediana ponderada calibrada), `p25`/`p75` (rango conservador/optimista), comparables incluidos/excluidos/outliers con razones, filtros y nivel de expansión usados, confianza (nivel + puntaje 0–100 + razones), sesgo global y por submercado, y conflictos/datos dudosos del subject.

**1.2 Entradas.** Subject: `sqft, beds, baths, year, lot, pool, garage, zip, tipo`, dirección. Comparable: `id, price, sqft, beds, baths, year, lot, dist, close_date, status, sale_type, tipo, pool, garage`, dirección.

**1.3 Elegibilidad (regla D-020 — dura):** solo `status ∈ {sold, closed}` + `sale_type = arms_length` + precio positivo + fecha de cierre verificable entran a la mediana. `active|pending` = capa de **temperatura**, **peso 0, jamás en la mediana**. `inactive|removed` **≠ vendido** → excluido sin evidencia de cierre. `foreclosure|short_sale|reo|non_arms_length` → excluidos del ARV canónico.

**1.4 Saneamiento del subject (antes de filtrar):** `beds≤1 & sqft≥1000` → dudoso (las camas no se usan silenciosamente); `baths<1` → dudoso, no se usa; `sqft<400` → dudoso, no se usa; fuentes que difieren fuera de tolerancia (beds/baths/área/año) → **conflicto registrado**; un override humano explícito resuelve para el cálculo pero **conserva fuente + auditoría**.

**1.5 Filtros + expansión adaptativa.** Cada comp con precio positivo pasa los filtros de `ff_uw_config`: distancia máx, antigüedad máx de venta, Δ% área, Δ camas/baños, Δ año, tipo, piscina (solo si subject y comp tienen el dato). Se toman máx `arv_comps_max` ordenando por **menor ajuste bruto**; mínimo `arv_comps_min`. Si no se alcanza el mínimo, expansión en orden: (1) base; (2) meses×1.5; (3) meses×2 + distancia+0.5mi; (4) + tolerancia de área +10pp. La expansión se **declara** y **baja la confianza**; **nunca** se presenta como equivalente a los filtros base.

**1.6 Ajustes comp→subject:** `valor_ajustado = precio_comp + Σ(ajustes)`.
```
GLA       = (sqft_s − sqft_c) × adj_gla_psf[zip|global]
cuartos   = (beds_s − beds_c) × adj_cuarto
baños     = (baths_s − baths_c) × adj_baño
año       = (year_s − year_c) × adj_año_pct/100 × precio_comp
lote      = (lot_s − lot_c) × adj_lote_psf   (si |Δlote| > 500 sqft)
piscina   = ± adj_piscina ;  garaje = ± adj_garaje
tendencia = meses_desde_comp × mercado_pct_mes/100 × precio_comp
```
Manuales auditables: condición/remodelación, ubicación/submercado, concesiones del vendedor (restan). `ajuste_neto_pct = Σajustes/precio_comp×100`; `ajuste_bruto_pct = Σ|ajuste|/precio_comp×100`.

**1.7 Exclusión de outliers por MAD** (≥4 comps utilizables): `M=mediana(valores)`, `MAD=mediana(|valor−M|)`, `z=|valor−M|/(1.4826×MAD)`; se excluye si `z > arv_outlier_mad_k`, siempre que no baje del mínimo; exclusión + razón visibles. **`MAD=0` → se sustituye por 1** (D-024, cubierto por prueba). **Reemplaza el `±0.6745σ`, descartado.**

**1.8 Pesos y reconciliación:**
```
peso_similitud = 1 / (ajuste_bruto_pct + 2)
peso_recencia  = 1 / (1 + meses_desde_venta / 6)
peso_distancia = 1 / (1 + distancia_millas)
peso_total     = peso_similitud × peso_recencia × peso_distancia
sesgo_total    = arv_bias_pct + arv_bias_pct_<zip>
ARV = round(Qw(0.50) × (1 + sesgo_total/100))   ; P25/P75 con Qw(0.25)/Qw(0.75)
```
(Qw = cuantil ponderado.)

**1.9 Confianza:** parte de 100, resta por dispersión (CV), muestra chica, comps antiguos, distancia, ajustes brutos altos y expansión. Nivel `alta|media|baja|sin comps` + razones cuantitativas. **No** reemplaza evidencia ni es una probabilidad estadística.

**1.10 Triangulación:** ARV-comps, AVM, assessed×factor y appraisal previa son señales **separadas**; si `(máx−mín)/mediana > arv_triang_warn_pct` → advertencia con las fuentes extremas. **No** promedia señales heterogéneas automáticamente.

**1.10.1 Disponibilidad obligatoria y cascada (D-025):** el producto no deja el ARV vacío cuando existen datos básicos. Elige **una** fuente por prioridad, sin promediar ni ocultar el origen:
1. Motor profesional con comparables `sold|closed` + `arms_length` suficientes.
2. **RentCast AVM**, rotulado como estimación automática de RentCast, no como mediana de ventas verificadas.
3. Appraisal o ARV existente del deal, conservando fecha y origen.
4. `sqft_subject × arv_ppsf_zona_configurado`, rotulado como estimación local y con confianza baja.

Los activos/pending continúan con peso 0 y solo muestran temperatura. Ningún fallback puede transformar un listing en cierre ni declararse “verificado” si no lo está. Toda salida incluye `source`, `verification_status`, `confidence`, fecha y razón del fallback.

**1.11 Backtest/calibración:** `error_pct=(ARV_est−real)/real×100`; `MdAPE=mediana(|error|)`; `MAPE=promedio(|error|)`; `sesgo=promedio(error)`. Calibra por coordenadas minimizando MdAPE, luego sesgos por ZIP con muestra mínima, luego sesgo global sujeto a meta. **Solo lectura** por defecto; persiste con `--persist` **solo si** simultáneamente `MdAPE≤6%`, `|sesgo|≤2%` y **mejora** el MdAPE activo.

**1.12 Validación pendiente:** C7 queda resuelta por la política D-025 (RentCast + cascada existente; sin proveedor nuevo). `MAD=0→1` está cubierto por D-024. Empresa OS aporta tres fixtures sintéticos exactos y ejecutables (C2: 3/3); falta ejecutar su paridad en Bóveda durante C6. Continúan como mejoras posteriores, no como bloqueo del cálculo: congelar todos los umbrales comerciales de producción y ampliar la calibración fuera de muestra/temporal. Conformidad: `node scripts/test-arv-d020.mjs` y `node scripts/contract-golden-cases.mjs --verify`.

## 2. Regla del 75% — MAO y gate
```
MAO_PCT = 0.75                       (constante canónica; RP_MAO_PCT)
MAO = ARV · MAO_PCT − rehab          (máxima oferta de compra, versión rápida)
gate_pass = ( all_in ≤ ARV · MAO_PCT )   (validación estricta)
```
El 25% cubre utilidad + holding + closing + fees. `MAO` es la oferta máxima rápida; `gate_pass` es la validación con el all-in real.

## 3. All-in (costo total del proyecto)
```
all_in = purchase + rehab + holding_costs + closing_costs + financing_costs
```
- `holding_costs` = (taxes + insurance + utilities + intereses de deuda + otros) durante el holding period.
- `closing_costs` = compra + venta (comisiones, títulos, transferencia).
- `financing_costs` = puntos/originación/comisiones del préstamo.
Los componentes se documentan por deal; ningún componente se omite silenciosamente.

## 4. Financiamiento y refi (BRRRR/Hold) — corregido v0.3 (obs. Codex)
```
refi_loan = mínimo(
  límite_por_LTV,          (= ARV · 0.75, el tope por loan-to-value)
  límite_por_DSCR,         (máx préstamo cuyo servicio mantiene DSCR ≥ 1.20)
  límite_del_prestamista,  (tope/programa del lender)
  préstamo_real_confirmado (si existe, manda)
)
capital_recuperado = refi_loan − payoff_deuda_actual
cash_invested (post-refi) = all_in − refi_loan     (puede ser ≤ 0 → ver §7 retorno infinito)
```
`ARV · 0.75` es **uno** de los topes (el de LTV), no el refi por sí solo. Empresa OS ya aplica esta lógica de mínimos; simplificarla causa regresiones.

## 5. Renta (Hold / BRRRR)
```
NOI = ingreso_operativo_neto (renta efectiva − gastos operativos, sin servicio de deuda)
cap_rate = NOI / valor
monthly_cashflow = renta − (servicio_deuda + gastos_operativos_mensuales)
DSCR = NOI / servicio_de_deuda            (mínimo canónico: DSCR ≥ 1.20)
cash_on_cash_anual = cashflow_anual / cash_invested
```

## 6. Retornos de Flip
```
utilidad = precio_venta − all_in
ROI_proyecto (del período, NO anualizado) = utilidad / cash_invested
MOIC = capital_total_devuelto / cash_invested
pct_sobre_all_in = utilidad / all_in
```

## 7. IRR (regla anti-engaño) — corregido v0.3 (obs. Codex)
- El IRR sale de un **flujo de caja con fechas reales** (salida hoy, entradas cuando ocurren).
- **Persistencia sin destruir información** (no se guarda solo el valor capado):
  - `irr_raw_pct` — resultado matemático real (sin capar).
  - `irr_display_pct` — valor **para presentación** (en flip, capado a 200%).
  - `irr_is_capped` — bandera (true cuando display ≠ raw).
  - `irr_assumptions` + **fechas del flujo** — supuestos y timeline usados.
  Así no mostramos un 912% engañoso como titular **pero conservamos la trazabilidad**.
- **Flip:** titulares = Utilidad / ROI del período / MOIC / % sobre all-in, con el holding period a la vista. El IRR anualizado va **secundario, rotulado** ("anualizado — asume repetir el ciclo de N meses ~X×/año"); en pantalla se muestra `irr_display_pct`.
- **Hold/BRRRR:** IRR sobre **horizonte real (5–10 años)**; rango creíble ~10–25%.
- **Retorno infinito** (BRRRR con `cash_invested ≤ 0`): se rotula "∞ · capital recuperado", nunca un número absurdo.

## 8. Indicadores primarios por modelo (qué manda en pantalla)
| Modelo | Titulares | Secundarios |
|---|---|---|
| **Flip** | Utilidad · ROI (período) · MOIC · % sobre all-in · holding period | IRR anualizado (rotulado, capado 200%) |
| **Hold / BRRRR** | Flujo mensual · Cap rate · Cash-on-cash anual · DSCR · Equity recuperado al refi | IRR 5–10 años |

## 9. Presentación vs matemática
Un producto puede simplificar **la explicación** (menos jerga, tooltips, modo principiante) pero **no la fórmula**. El número que ve el estudiante Free, el estudiante Plus y el operador de Empresa OS para las mismas entradas es **el mismo**.

## 10. Redondeo y unidades
- Cálculos internos en full precision; redondeo **solo en presentación** ($ a entero, % a 1 decimal salvo indicación).
- Unidades por `DATA-CONTRACT.md` §6.

## 11. Paridad obligatoria
Toda implementación (Empresa OS y Bóveda) valida contra `GOLDEN-CASES.md`. Un cambio que altere cualquier golden case requiere: registrar en `DECISIONS.md`, actualizar los valores esperados con justificación, y re-verificar ambos sistemas.

**Discrepancia abierta (C3) — actualizada 2026-08-25:** la fórmula de cash-out quedó **VERIFICADA** contra un HUD real: `cash_out = refi_loan − payoffs − cargos_de_cierre(línea 1400)` → refi 4916 Barkbridge `140,250 − 103,645 − 14,397.87 = 22,207.13` ✓. **Hallazgo:** el $22,207.13 que Empresa OS registró "para Dove" es en realidad el cash-to-borrower del refi de **4916 Barkbridge** (otra propiedad) → probable **mezcla de propiedades**, no error de fórmula. **Falta el refi real de 2315 Dove Springs ($282,000)** para cerrar C3. Ver `CERTIFICATION.md` C3 y D-021.
