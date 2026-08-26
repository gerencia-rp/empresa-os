# DATA-CONTRACT.md

**Versión:** v0.4 (BORRADOR) · **Fecha:** 2026-08-25 · Redactó: Claude · Incorpora obs. Codex y D-025

Define las entidades, campos, fuentes y — lo más importante — la identidad de propiedad `property_id`. Es el diccionario común de datos.

## 1. Identidad de propiedad (corregido v0.3 — obs. Codex)
Empresa OS **ya usa `property_id` como UUID interno conectado a muchas tablas**; no se reemplaza. Modelo de tres piezas:

- **`property_id`** — UUID **local e inmutable** de cada sistema (el que Empresa OS ya usa; La Bóveda tendrá el suyo). No cambia nunca.
- **`canonical_property_key`** — **identidad compartida entre productos**, determinística y **estable/inmutable una vez asignada**:
  ```
  canonical_property_key = "v1:" + sha256( normalize(address) )
  ```
  El prefijo `v1:` **versiona el algoritmo de normalización** (si `normalize` cambia, pasa a `v2:` sin romper las claves ya emitidas). **SHA-256** (no SHA-1).
- **`property_aliases`** — alias de la misma propiedad: direcciones alternativas, **APN**, IDs de proveedores externos. Se usan para **matching/dedup**.

`normalize(address)`: minúsculas y sin acentos; expande abreviaturas USPS (st→street, rd→road, ave→avenue, apt/#→unit…); colapsa espacios; formato `"{street_number} {street_name} {suffix} {unit?}, {city}, {state} {zip5}"`.

**Reglas duras:**
1. Incorporar un **APN** (u otro identificador) más tarde **entra como alias**, sirve para deduplicar, y **NUNCA cambia** la `canonical_property_key` ni el `property_id` ya asignados.
2. La `canonical_property_key` se asigna **una vez** y queda **congelada**.
3. Cada sistema mantiene el mapeo `property_id (UUID local) ↔ canonical_property_key ↔ aliases`.
4. `normalize()` y la derivación viven en el **núcleo compartido**. Cambiarla = subir versión (`v2:`) + registrar en `DECISIONS.md`.

Las dos bases Supabase son **distintas** (Empresa OS la suya; Bóveda+FlipTrack comparten `fliptrack-prod`). La `canonical_property_key` es lo que reconoce la misma casa en los dos lados **sin** compartir PK.

## 2. Entidades del núcleo
Nombres y campos canónicos. Cada sistema puede tener columnas extra propias, pero **estas son idénticas** en significado y unidad.

### Property
`property_id` (uuid local, inmutable) · `canonical_property_key` (str compartida, ver §1) · `address` (str normalizada) · `apn` (str|null) · `city` · `state` · `zip5` · `county_fips` · `lat` · `lng` · `property_type` (SFR|townhouse|condo|multifamily|land) · `beds` (num) · `baths` (num) · `sqft` (num) · `lot_sqft` (num|null) · `year_built` (int|null) · `stories` (num|null).

### MarketArea (investigación macro→micro)
`area_id` · `level` (city|zip|neighborhood|subdivision|segment) · `parent_area_id` · `name` · métricas: `median_sale_price` · `median_dom` (días en mercado) · `absorption_months` · `active_inventory` · `sale_to_list_ratio` · `price_cut_rate` · `median_rent` · `rent_dom` · `period` (rango de fechas) · `price_tier` (para segmento).

### Comp (comparable)
`comp_id` · `property_id` · `subject_property_id` · `status` (**sold|active|pending|expired|withdrawn**) · `sale_price` (num|null) · `list_price` (num|null) · `close_date` (date|null) · `dom` (int|null) · `condition` (retail|renovated|dated|distressed) · `sale_type` (arms_length|reo|foreclosure|short_sale|non_arms_length) · `distance_mi` · `adjustments` (jsonb) · `adjusted_value` (num) · `weight` (num) · `included_in_arv` (bool).
**Regla:** solo `status='sold'` y `sale_type='arms_length'` entran al ARV por default. `active`/`pending` = temperatura de mercado, **nunca** en la mediana del ARV. Ver `CALCULATION-CONTRACT.md`.

### Deal / Underwriting
`deal_id` · `property_id` · `user_id` (tenant) · `strategy` (flip|hold|brrrr) · `price_tier` · `stage` · inputs (`purchase`,`rehab`,`arv`,`financing` jsonb,`holding` jsonb,`taxes`,`insurance`) · outputs (`mao`,`all_in`,`gate_pass`,`utilidad`,`roi`,`moic`,`irr_pct`,`dscr`,`cap_rate`,`monthly_cashflow`) · `actuals` (jsonb: proyectado-vs-real) · `scenarios` (jsonb).

### RenovationSpec (ADN de reno)
`property_id` · `finish_level` (economy|standard|premium|luxury) · `scope` (jsonb: flooring, kitchen, counters, appliances_tier, bath, exterior, layout_changes) · `est_cost` · `cost_source` (evidence).

### EvidenceRecord (transversal)
Ver `AI-EVIDENCE-CONTRACT.md`. Cada dato relevante lleva: `source`, `retrieved_at`, `status`, `confidence`, `cost`.

### Report
`report_id` · `type` (property|cma_arv|neighborhood|due_diligence|underwriting|refi_readiness|portfolio|deal_packet) · `property_id` · `generated_at` · `source_snapshot_id` · `disclaimers`.

## 3. Fuentes de datos permitidas
- **RentCast** (AVM, renta y comps) — fuente automática integrada y fallback oficial del ARV (D-025). Cuando existen cierres `sold|closed` + `arms_length` verificables, alimentan el motor profesional. Cuando no alcanzan, se usa el **AVM de RentCast** como estimación separada, con fuente, fecha, verificación y confianza visibles. Nunca se presenta el AVM como una mediana de cierres ni se reclasifican listings.
- **Datos públicos** vía la capa `rp-data` (records, tax, historial donde estén disponibles).
- **Bright Data** — se mantiene **ACTIVO**; si no hay crédito, la interfaz **sigue sin interrumpir al cliente**, pero el dato se **marca `no_disponible`/desactualizado** (nunca se muestra como fresco) y se **genera una alerta operativa** (interna/admin). No se degrada "en silencio" hacia adentro; nunca se desactiva.
- **MLS / disclosures / paquetes del broker / PDFs** para gama alta (residencial de lujo trae fichas MLS y disclosures; los OM son más de comercial/multifamiliar). El sistema **acepta todos esos formatos**.
- **Sin proveedor nuevo en esta etapa:** por decisión de Nicolás no se incorpora ni se considera ATTOM. La solución usa RentCast, datos públicos disponibles, appraisals/ARV existentes y la estimación local configurada. La arquitectura puede seguir siendo extensible, pero no crea una dependencia, tarea ni bloqueo relacionado con otro proveedor.

**Prohibido:** que cada módulo consulte fuentes externas por su cuenta. Todo pasa por la **Ficha 360 / capa de datos única**.

**Licenciamiento:** antes de sumar cualquier fuente/proveedor se registra en `DECISIONS.md` el **riesgo de licenciamiento** (qué permite el proveedor: mostrar dueños, generar listas, redistribuir, cachear, exportar en PDF). No se redistribuye ni exporta dato que la licencia no permita.

## 4. Una consulta, reutilización múltiple (caché y costo)
- Los datos externos se consultan **una vez**, se guardan con **vigencia (TTL)** definida por tipo de dato, y se **reutilizan**.
- **Enriquecimiento escalonado:** filtro barato → resumen → análisis profundo **solo cuando el usuario abre/selecciona** una propiedad.
- **Presupuesto por usuario** + **kill switch global** de gasto de datos. Referencia existente: `boveda.rp_data_cache` (cache por dirección/ZIP, solo escribe la edge con service role), `boveda.market_data_cache`, `boveda.app_config`.
- Cada dato con costo registra su `cost` en el EvidenceRecord.

## 5. Multi-tenant y aislamiento
- Bóveda Plus: **RLS por `user_id`** en toda tabla con datos de estudiante; probado por impersonación (nadie ve lo de otro).
- Empresa OS: single-tenant interno.
- **Del laboratorio al producto** solo cruzan datos **agregados/anonimizados** (benchmarks, patrones), nunca deals reales, dueños, compradores, proveedores ni contratos de Rental Profitss.
- **Memoria por empresa:** conocimiento y motores compartidos; datos, permisos y aprendizajes **separados por negocio**.

## 6. Convenciones
- Moneda: **USD**. Porcentajes en 0–100 salvo que se indique fracción. Fechas **ISO 8601**. Superficie en **sqft**. Distancia en **millas**.
- Estados de comp: `sold|active|pending|expired|withdrawn`. Condición: `retail|renovated|dated|distressed`.
- `strategy`: `flip|hold|brrrr`. `finish_level`: `economy|standard|premium|luxury`.

## 7. Runtime de datos
- Edges (Supabase) corren en **Deno**; el código de derivación de `property_id`, normalización y fórmulas es **portable Node/Deno**. Ver `PRODUCT-CONTRACT.md` §8.
