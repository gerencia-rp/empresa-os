# CERTIFICATION.md

**Versión:** v0.9 · **Fecha:** 2026-08-25

Los contratos son una mejora correcta **pero la base NO está certificada al 100%**. Antes de aceptar definitivamente y de **multiplicar módulos de lujo**, hay que cerrar estas **7 compuertas** (C4 ya ✅).

> **Regla:** ningún módulo nuevo de lujo se construye hasta que C1–C6 estén en ✅.

| # | Compuerta | Dueño | Estado |
|---|---|---|---|
| **C1** | Documentar el **motor profesional de ARV** de Empresa OS en `CALCULATION-CONTRACT.md` §1 | Codex aporta spec → Claude integra | ✅ **CERRADA** (2026-08-25): motor sold+arms_length para la mediana profesional + cascada D-025; spec integrada en §1. |
| **C2** | **Golden cases** compartidos y ejecutables (paridad) | Conjunto | ✅ **CERRADA EN AMBOS SISTEMAS** (2026-08-26): Empresa OS 3/3 exactos (D-026) **y Bóveda 3/3 exactos** — `node scripts/contract-golden-cases.mjs --verify` en el repo Bóveda (espejo del fixture congelado, motor portado byte-idéntico a `packages/core`) → GC-001/002/003 al centavo. Blindada en CI de Bóveda (`packages/core/test/contract-engine.test.mjs`). |
| **C3** | Diferencia **USD 3,133.80** en el cash-out de **Dove** | Codex + HUD | 🟡 **PROPUESTO: no bloqueante** (a confirmar por Codex). Fórmula de cash-out **verificada**; causa probable = **mezcla con 4916 Barkbridge** (su cash $22,207.13 coincide). Appraisal de Dove recibido (ARV **$370k**). **Nicolás no tiene el HUD de refi de Dove** (menciona refi "por ~$380k", a confirmar; no cuadra con appraisal $370k ni con préstamo $282k de Empresa OS). Sin el settlement del refi **no se reconcilia el cash-out**. Es higiene de datos de **un deal histórico**, no falla de fórmula → **se documenta y se cierra si aparece el HUD**; **no traba la certificación**. Ver D-021, D-023. |
| **C4** | Completar **toda la batería de La Bóveda** | Claude | ✅ **CERRADA** (2026-08-25, commit `67e19eb`): 61/61 unit · 88/88 QA · guard:design 0 errores · md5 38/38 · build 2/2. Único no verificado: QA en vivo logueado (faltaban credenciales `RP_QA_*` en esa corrida) — fuera del gate de la batería. |
| **C5** | **Validación integral de Empresa OS** | Codex | ⏳ **12/15** controles pasan. Bloqueos: ocupación (51 unidades, distribución de estados no reconcilia), espejo QuickBooks viejo (13/jul), última corrida de linaje (29/jul). |
| **C6** | Bóveda Plus usa el **motor contractual aprobado** | Claude | ✅ **CERRADA** (2026-08-26): motor §1 (D-020 elegibilidad + MAD D-024 + Qw ponderados + sesgo por config; `±0.6745σ` eliminado) + cascada D-025 etiquetada (origen/verificación/confianza, sin ATTOM) + refi = mínimo D-013 (limitante declarado y persistido) + IRR raw/display/capped + supuestos (D-007) — en `packages/core` (núcleo byte-idéntico al de Empresa OS), `suite-underwriting`, E4·Salida, escenarios/simulador, post-compra y Mentor. Paridad 3/3 verde; unit 71/71 · QA 88/88 · build 2/2. **Deploy prod READY, pendiente de aprobación (§B)** — hasta esa subida, la DB viva conserva la versión anterior. |
| **C7** | Política de fuente y disponibilidad del ARV | Nicolás+Codex; ratifica Claude | ✅ **DECISIÓN CERRADA (D-025):** sin ATTOM ni proveedor nuevo. Mediana solo con ventas sold/closed + arms-length; si no bastan, RentCast AVM automático → appraisal/ARV existente → sqft×$/sqft configurado. Origen y confianza visibles; ARV no queda vacío. |

## Runtime transversal (Node)
Node 24 es el estándar oficial (D-004). La documentación local de ambos repos debe permanecer sin referencias normativas a Node 20.

## Notas
- **C3 corrige una hipótesis previa:** la diferencia de Dove NO viene de `refi = ARV·0.75` vs mínimo; Dove ya usa el préstamo real. Es una discrepancia de **registro/documento**, no de fórmula.
- **C1:** Codex confirma si en Empresa OS los activos **entran al cálculo del ARV** (→ conformar al contrato) o **solo se muestran** (→ aclarar UI). Ver D-020.

## Secuencia recomendada
1. Claude ejecuta **C6** usando los tres golden cases congelados; al obtener 3/3, C2 queda cerrada en ambos sistemas.
2. Codex completa por separado los tres controles operativos restantes de **C5**; no cambian las fórmulas C1/C2/C7.
3. C3 se conserva como higiene histórica no bloqueante hasta que aparezca el HUD correcto de Dove.
