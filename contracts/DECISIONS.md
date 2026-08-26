# DECISIONS.md

**Versión:** v0.5 · **Fecha:** 2026-08-26

Bitácora de decisiones y cambios de contrato. **Toda** modificación a campos, fórmulas, estados, eventos o estructura de datos se registra **acá primero**.

Formato de entrada (ampliado):
```
D-XXX · fecha · estado(propuesta|en-revisión|aceptada|revertida) · autor
Título · Contexto / Decisión / Impacto (contratos/archivos)
Migraciones · Compatibilidad · Costo de datos · Riesgo privacidad/licenciamiento · Quién actualiza
```

> **Nada está "aceptada" todavía.** "Aceptado" = revisión técnica Claude + revisión técnica Codex + aprobación final Nicolás (D-012). Las entradas de abajo están **en-revisión** salvo hechos ya confirmados por Nicolás. Esta v0.3 incorpora las correcciones de Codex (D-003, D-006, D-007, D-008, D-010) y suma D-013…D-018.

---

**D-001 · en-revisión · Nicolás+Claude+Codex** — Dos productos, un núcleo. Empresa OS (interno, laboratorio) + La Bóveda Plus (comercial, multi-tenant) sobre núcleo compartido. Empresa OS no se copia entero; solo módulos probados y adaptados. Impacto: PRODUCT-CONTRACT.

**D-002 · en-revisión (hecho confirmado por Nicolás)** — Empresa OS usa **base Supabase distinta** de Bóveda/FlipTrack. Consecuencia: la identidad compartida es una **clave canónica derivada**, no una PK común. Impacto: DATA-CONTRACT §1, §5.

**D-003 · en-revisión · Claude+Codex** — REVISADA (obs. Codex). Identidad de propiedad en tres piezas: `property_id` (**UUID local inmutable**, el que Empresa OS ya usa; no se reemplaza) · `canonical_property_key` (**identidad compartida**, `"v1:"+sha256(normalize(address))`, versionada, estable/inmutable) · `property_aliases` (direcciones, APN, IDs de proveedor). **Incorporar un APN después nunca cambia la identidad existente** (entra como alias). SHA-256 versionado (no SHA-1).
Migraciones: Bóveda agrega `canonical_property_key` + tabla de aliases + mapeo; Empresa OS mapea su UUID existente. Compatibilidad: no rompe el `property_id` de Empresa OS. Costo: n/a. Riesgo: n/a. Impacto: DATA-CONTRACT §1-2.

**D-004 · aceptada · Nicolás+Claude+Codex** — Node 24 **CONFIRMADO estándar oficial**. Empresa OS declara `24.x`; Bóveda declara `>=24`; la documentación de ambos repos quedó alineada. Edges = Deno; núcleo portable Node/Deno. Migraciones: ninguna DB. Impacto: PRODUCT-CONTRACT §8, DATA-CONTRACT §7, `AGENTS.md`, `CLAUDE.md`.

**D-005 · en-revisión (Nicolás)** — Motor **tier-aware** (cualquier franja). Primera implementación profunda = flips de lujo (caso más exigente), sin encerrar el código en lujo. Impacto: PRODUCT-CONTRACT §2.

**D-006 · en-revisión · Claude+Codex** — REVISADA (obs. Codex). El **ARV canónico usa el motor profesional de Empresa OS** (mediana ponderada + exclusión de outliers por **MAD** + similitud/distancia/recencia + calibración vs appraisals + expansión adaptativa + conflictos de fuentes). Se **descarta** `± 0.6745σ` como banda. SOLD+arms_length siguen siendo la única entrada al ARV. Codex aporta la spec formal; se pinnea con golden cases. Impacto: CALCULATION-CONTRACT §1.

**D-007 · en-revisión · Claude+Codex** — REVISADA (obs. Codex). IRR: **no se destruye información**. Se persiste `irr_raw_pct` + `irr_display_pct` (flip capado 200%) + `irr_is_capped` + supuestos/fechas del flujo. Titulares de flip siguen siendo Utilidad/ROI/MOIC/%all-in. Migraciones: Bóveda migra de `irr_pct` único a los 3 campos + assumptions. Compat: aditivo; conserva el comportamiento de display. Impacto: CALCULATION-CONTRACT §7.

**D-008 · en-revisión · Codex+Claude** — REVISADA (obs. Codex). Evidencia en **tres ejes ortogonales**: **Origen** (source), **Verificación** (verificado/sin_verificar/calculado/inferido/no_disponible), **Confianza** (0–100). "Manual" es un **origen**, no un nivel de verificación. Nunca inferencia como hecho; nunca inventar datos ausentes. Impacto: AI-EVIDENCE-CONTRACT §1-2.

**D-009 · en-revisión · Claude+Codex** — Frontera laboratorio→producto: de Empresa OS a Bóveda cruzan solo patrones/benchmarks **agregados/anonimizados**, nunca datos crudos/privados de Rental Profitss. Impacto: PRODUCT-CONTRACT §7, DATA-CONTRACT §5.

**D-010 · en-revisión · Claude+Codex** — REVISADA/ACOTADA (obs. Codex): **solo sincronización documental de contratos**. Copia canónica en `boveda/contracts/` + manifiesto `CONTRACTS.sha256` + chequeo `contracts:check` que falla en CI si difieren. (El mecanismo para **compartir código** se separa en D-018.) Impacto: README, WORKSTREAM.

**D-011 · en-revisión · Codex+Nicolás** — **FlipTrack fuera del núcleo compartido** por ahora (sigue de Claude, esquema `public`). Impacto: WORKSTREAM, README, PRODUCT-CONTRACT.

**D-012 · aceptada · Nicolás** — Definición de "Aceptado": revisión Claude + revisión Codex + aprobación final Nicolás. Repos obligatorios: `/Users/nicolaslara/boveda` y `/Users/nicolaslara/Desktop/CLAUDE CODE/empresa-os`. Impacto: README, WORKSTREAM.

**D-013 · en-revisión · Claude+Codex** — NUEVA (obs. Codex). Refi = **mínimo(** límite por LTV (ARV·0.75), límite por DSCR, límite del prestamista, préstamo real confirmado **)**. `ARV·0.75` es solo el tope de LTV, no el refi. Impacto: CALCULATION-CONTRACT §4.

**D-014 · en-revisión · Codex+Claude** — NUEVA (obs. Codex). Bright Data **no falla en silencio**: la UI sigue sin interrumpir al cliente, pero el dato se marca `no_disponible`/desactualizado y se **genera alerta operativa** (interna/admin). Impacto: DATA-CONTRACT §3, AI-EVIDENCE §3.

**D-015 · en-revisión · Codex+Claude** — NUEVA (obs. Codex). Stacks **distintos por sistema**: Bóveda = Next.js/Node; **Empresa OS = JavaScript puro** (no Next.js). Se documenta cada uno por separado. Impacto: PRODUCT-CONTRACT §8.

**D-016 · en-revisión · Codex+Claude** — NUEVA (obs. Codex). Ramas principales: **Bóveda `master`**, **Empresa OS `main`**. Cada agente en su rama de feature. Impacto: WORKSTREAM.

**D-017 · en-revisión · Codex+Claude** — NUEVA (obs. Codex). Golden cases con **entradas completas + resultados exactos + fixtures ejecutables**, generados de una **corrida autoritativa** (no de logs). GC-001 de la v0.2 queda **invalidado**; se regenera. Impacto: GOLDEN-CASES, CALCULATION-CONTRACT §11.

**D-018 · propuesta · Claude+Codex** — NUEVA (separada de D-010). Mecanismo para **compartir código del núcleo** (paquete `packages/core` vía npm privado / submódulo / sync por CI) + **tests de paridad**. **Pendiente** de definir con el layout real de `empresa-os`. Impacto: WORKSTREAM, GOLDEN-CASES.

**D-019 · propuesta · Claude+Codex** — NUEVA (obs. Codex, punto 6). **Bóveda Plus usa exactamente el motor contractual aprobado** (ARV profesional de C1, refi = mínimo de restricciones D-013, IRR raw+display D-007), **no** la implementación simplificada actual de La Bóveda. La engine actual de La Bóveda (`RP.finance`, ARV ±0.6745σ, refi=ARV·0.75) **se migra** al motor contractual una vez fijada la spec (C1).
Migraciones: swap de engine con paridad contra golden cases. Compatibilidad: **cambia números vs el deploy actual** → re-verificar en Bóveda; el cambio de refi puede explicar la diferencia de Dove (C3). Costo: n/a. Riesgo: n/a. Impacto: CALCULATION-CONTRACT, CERTIFICATION C6.

**D-020 · CONFIRMADA por Nicolás (2026-08-25) · falta implementación** — **ARV = solo `sold` + `arms_length` en la MEDIANA.** Los activos/pending **solo se muestran al lado** como temperatura de mercado ("para hacerse una idea"), **nunca entran al cálculo del ARV**. Decisión de negocio **cerrada**. Resta la implementación: **Codex conforma el motor de ARV de Empresa OS** a esta regla (o confirma que solo los muestra y aclara la UI); **Claude integra la spec al contrato** (C1).
Migraciones: posible ajuste del motor de ARV de Empresa OS. Compat: donde hoy mezcle activos, corregirlo (es una corrección, no una regresión). Costo: n/a. Riesgo: n/a. Impacto: CALCULATION-CONTRACT §1, DATA-CONTRACT (Comp), C1.

**D-021 · en-revisión · Codex+Claude** — NUEVA (hallazgo C3). Definición precisa de **cash-out**: `cash_out = refi_loan − payoffs − cargos_de_cierre(línea 1400, incluye escrows/reservas)`. **VERIFICADA contra un HUD real** (refi 4916 Barkbridge Trl): `140,250 − 103,645 − 14,397.87 = 22,207.13` ✓.
**Hallazgo sobre Dove (Claude, 2026-08-25):** de los 3 HUD subidos, dos son la **compra** de 2315 Dove Springs (préstamo HML USAM **$258,000**) y el tercero ("HUD1 Dove springs.pdf") es en realidad el **refi de 4916 Barkbridge Trl** (cash to borrower **$22,207.13**). El $22,207.13 registrado en Empresa OS "para Dove" **coincide exacto con Barkbridge** → **hipótesis: mezcla de propiedades / documento mal etiquetado**, NO error de fórmula. **Falta el refi real de Dove ($282,000)** para cerrar C3; no se modifica ningún dato por suposición.
Migraciones: ninguna. Compat: n/a. Costo: n/a. Riesgo: n/a. Impacto: CALCULATION-CONTRACT §4/§11, GOLDEN-CASES, C3.

---

**D-022 · revertida por D-025 · Codex+Claude** — Proponía bloquear el ARV hasta contar con otra fuente de cierres. Nicolás decidió no incorporar proveedores nuevos y exigir disponibilidad continua; D-025 conserva la separación entre evidencia verificada y estimación, pero reemplaza el bloqueo por la cascada RentCast/existente/local.

**D-023 · propuesta (Claude) · a confirmar por Codex** — **C3 (Dove $3,133.80) pasa a NO bloqueante.** La fórmula de cash-out está verificada y la causa probable (mezcla con 4916 Barkbridge) identificada. Nicolás no tiene el HUD de refi de Dove (menciona un refi "~$380k" que no cuadra con el appraisal $370k ni con el préstamo $282k registrado). Es **higiene de datos de un deal histórico**, no una falla de arquitectura/fórmula → se **documenta** y se cierra si aparece el HUD; **no gatea la certificación** (C1, C2, C5, C6, C7 sí). Codex confirma (C3 era suyo).
Impacto: CERTIFICATION C3.

**Nota C4 (cerrada):** batería de La Bóveda **verde** el 2026-08-25 (commit `67e19eb`): 61/61 unit · 88/88 QA · build 2/2. C4 = ✅.
**Nota Dove (referencia):** appraisal de 2315 Dove Springs → **ARV $370,000** (07/08/2025, refi). El refi presta el **75% del appraisal** (regla de Nicolás = límite LTV, D-013): préstamo $282,000 ≈ 75% de ~$376k → **consistente**. Falta solo el HUD de refi para el cash-out exacto (no bloqueante). Ver `GOLDEN-CASES.md`.

**D-024 · en-revisión · Codex+Claude** — NUEVA (obs. Codex, spec §1.7). **`MAD = 0` → se sustituye por 1** en la exclusión de outliers (evita división por cero cuando los valores ajustados no dispersan). Decisión **contractual** + **cubierta por prueba**. Impacto: CALCULATION-CONTRACT §1.7.

**D-025 · aceptada · Nicolás+Codex; pendiente ratificación técnica Claude** — **ARV siempre disponible con la información existente, sin ATTOM ni proveedores nuevos.** Se mantiene D-020: la mediana profesional usa exclusivamente comparables `sold|closed` + `arms_length`. Si no hay evidencia suficiente para esa mediana, el sistema aplica una cascada visible y auditable: **(1)** ARV profesional por comparables verificados; **(2)** AVM de **RentCast** como estimación automática separada; **(3)** appraisal/ARV existente del deal; **(4)** `sqft × $/sqft` configurado para la zona. Nunca se reclasifica un listing activo/inactivo como venta cerrada. La UI muestra `source`, verificación y confianza, pero no deja el ARV vacío cuando existen los datos básicos de la propiedad. **D-025 sustituye el comportamiento “ARV no disponible” de D-022 y cierra la decisión C7.**
Migraciones: ninguna DB obligatoria; ajuste compatible del motor/UI. Compatibilidad: conserva D-020 y agrega fallback. Costo: usa RentCast ya contratado/integrado; **sin proveedor nuevo**. Privacidad/licenciamiento: respetar licencia/caché de RentCast; no redistribuir datos crudos fuera de lo permitido. Impacto: DATA-CONTRACT §3, CALCULATION-CONTRACT §1.10–1.12, AI-EVIDENCE, CERTIFICATION C7.

**D-026 · en-revisión · Codex; pendiente paridad Claude** — **C2 generado desde la corrida autoritativa de Empresa OS.** Los fixtures ejecutables `GC-001` (flip estándar), `GC-002` (hold/BRRRR) y `GC-003` (flip lujo) pasan **3/3 exactos** mediante `scripts/contract-golden-cases.mjs --verify`. Los inputs completos y resultados congelados se incorporan a `GOLDEN-CASES.md`. C2 queda **cerrada del lado Empresa OS** y pendiente únicamente de que Claude ejecute la misma paridad en Bóveda durante C6.
Migraciones: ninguna. Compatibilidad: estos valores son el baseline contractual. Costo: n/a. Privacidad: fixtures sintéticos, sin datos personales ni propiedades privadas. Impacto: GOLDEN-CASES, CERTIFICATION C2/C6.

**D-027 · propuesta Codex · pendiente aceptación Claude+Nicolás** — **Resolución física de D-018:** repositorio privado neutral `gerencia-rp/rp-deal-core` + paquete privado versionado `@rentalprofitss/deal-core` en GitHub Packages. Exportaciones ESM (Bóveda/Node), CJS (tests) e IIFE (Empresa OS vanilla); ambos productos fijan versión exacta y ejecutan los mismos golden cases en CI. Un release solo pasa de `rc` a estable con contratos sincronizados y paridad 3/3 en ambos. Se descartan como recomendación principal el submódulo (fricción operacional) y la copia directa por CI (riesgo de sobreescritura/sin unidad versionada). Detalle: `empresa-os/docs/D018-SHARED-CORE-PROPOSAL.md`.
Migraciones: ninguna. Compatibilidad: adopción incremental; el código actual permanece hasta que el paquete pruebe paridad. Costo: GitHub Packages privado dentro de la organización/cuenta existente. Privacidad: paquete sin datos, conectores ni secretos; fixtures únicamente sintéticos. Rollback: fijar la versión exacta anterior. Impacto: WORKSTREAM-OWNERSHIP, GOLDEN-CASES, CI de ambos repos.

**Nota C6/C2-Bóveda (2026-08-26, Claude):** **C6 ejecutada.** La Bóveda migró al motor contractual: núcleo portado a `packages/core` (`arv-engine.cjs` = copia byte-idéntica —sha256 igual— de `pm/ff-arv-engine.js`; `uw-compute.mjs` = extracción byte-idéntica de las calculadoras de `pm/ff-underwriting.js`), paridad **C2 3/3 exactos** en Bóveda (`scripts/contract-golden-cases.mjs --verify`, espejo del fixture congelado), D-020/D-024/D-025 en la suite (banda Qw(0.25)/Qw(0.75), cascada etiquetada origen/verificación/confianza, activos = temperatura peso 0), refi = mínimo D-013 con limitante declarado (reemplaza la regla UW-25 "préstamo = LTV siempre"; el QA `refi75-check` quedó reescrito como spec ejecutable del mínimo), IRR D-007 (raw+display+capped+assumptions persistidos, `irr_pct` legado = display). Reconciliado en suite/E4/escenarios/post-compra/Mentor. **Deploy prod READY pendiente de aprobación (§B)**; hasta esa subida la DB viva conserva la versión previa (md5 local≠DB esperado). C6 = ✅ · C2 = ✅ ambos lados.

**Nota C1 (integrada):** la spec del motor de ARV de Codex quedó **integrada en `CALCULATION-CONTRACT.md` §1** (v1.0). Codex autorizó: "C1 se marca ✅ cuando Claude integre la spec". → **C1 = ✅**. Los pendientes de §1.12 (fuente verificada, MAD=0, umbrales congelados, calibración OOS, fixtures) se validan en **C2/C7**, no reabren C1.

---

## Certificación (previa a aceptación definitiva)
Ver `CERTIFICATION.md`: **7 compuertas C1–C7**. Estado al 2026-08-25: **C1 ✅ · C4 ✅ · C7 ✅**; **C2 Empresa OS 3/3 ✅, pendiente paridad Bóveda en C6**; **C3** no bloqueante (D-023); **C5** 12/15 (Codex, ops); **C6** Bóveda migra y prueba el motor contractual.

---

### Pendientes (abrir como D-019+ al resolver)
- P-A → ahora **D-018** (mecanismo físico de compartir el paquete núcleo).
- P-B: Límites mensuales finales del plan Plus — a validar con costo real por estudiante.
- P-C: **cerrado por D-025 para esta etapa:** no se incorpora ATTOM ni otro proveedor; se usa RentCast y los recursos existentes.
- P-D: Formato exacto de APN por estado/county para los aliases.
- P-E (nuevo): Codex aporta la **spec formal del motor de ARV** de Empresa OS para D-006.

### Estado (según revisión de Codex, 2026-08-25)
- ✅ Estructura y sincronización documental.
- ✅ Dirección general de producto.
- ⛔ DATA-CONTRACT / CALCULATION-CONTRACT / GOLDEN-CASES: **corregidos en v0.3**, a re-revisar por Codex.
- ⏳ Los demás, aceptables **condicionados** a esos cambios.
- ⛔ No comenzar módulos compartidos hasta cierre.
