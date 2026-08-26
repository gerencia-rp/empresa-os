# Contratos Compartidos — Empresa OS ⇄ La Bóveda Plus

**Versión:** v0.12 (BORRADOR — D-027 propone mecanismo físico del núcleo)
**Fecha:** 2026-08-26

**v0.12:** C1–C7 cerradas; D-027 registra la propuesta de Codex para resolver D-018 mediante un paquete privado neutral `@rentalprofitss/deal-core`, con exportaciones ESM/CJS/IIFE, versiones exactas y golden cases obligatorios en CI. Pendiente aceptación de Claude y Nicolás antes de crear o publicar el paquete.

**v0.11:** **C2 listo del lado Empresa OS (3/3 exactos)**: GC-001 flip estándar, GC-002 hold/BRRRR y GC-003 flip lujo quedaron congelados y ejecutables. **C7 decidida por Nicolás (D-025):** sin ATTOM ni proveedor nuevo; RentCast es el fallback automático oficial, seguido de appraisal/ARV existente y estimación local configurada. La mediana profesional continúa usando solo sold/closed + arms-length y el origen siempre queda visible. Claude puede ejecutar C6 y cerrar la paridad de Bóveda.

**v0.10:** **C1 ✅** — la spec del motor de ARV de Codex quedó integrada en `CALCULATION-CONTRACT.md` §1. Cerradas C1 y C4.

**v0.9:** **C3 (Dove) baja a no bloqueante** (D-023, a confirmar por Codex): fórmula verificada, causa probable identificada, falta solo el HUD de refi de Dove (Nicolás no lo tiene). No traba la certificación. Lo que **sí** gatea: **C1** (integrar spec), **C7** (fuente de ventas verificadas), **C5** (Codex), **C6** (tras C1), **C2** (golden cases).

> ⚠️ **Merge:** esta v0.8 reconcilia el estado. El agente que corrió C4 editó `CERTIFICATION.md` en el repo (marcó C4 ✅) sobre una v0.5. Esta v0.8 ya incluye **todo** (v0.6 D-020, v0.7 C3, C4 ✅, C1 conformado, C7). **Re-sincronizá la carpeta `contracts/` completa con esta v0.8 en ambos repos** para dejar todo idéntico. De acá en más, para evitar drift, el estado de las compuertas lo consolido yo en esta copia canónica.

**v0.8:** **C4 ✅** (batería verde, commit `67e19eb`). **C1:** Codex conformó el motor de ARV (sold+arms_length only; no fabrica ARV) y actualizó la spec — falta que suban `C1-ARV-ENGINE-SPEC.md` para integrarla al §1. **Nuevo C7 + D-022:** el ARV necesita una **fuente de ventas verificadas** (RentCast solo no certifica cierres/arms-length) antes de desplegar. **C3:** el HUD re-subido sigue siendo Barkbridge; appraisal de Dove recibido (**ARV $370k**); falta el HUD de refi de Dove.

**v0.7:** hallazgo C3 (HUD "Dove" = 4916 Barkbridge; fórmula de cash-out verificada). **v0.6:** D-020 confirmada.

**v0.6:** Nicolás confirmó **D-020** (ARV = solo vendidas + arms_length). C1 desbloqueada.

**v0.5:** actualiza `CERTIFICATION.md` con el avance real de Codex (C1 spec redactada pero **bloqueada** por el conflicto activos-en-ARV; C3 **no era el refi**, necesita el HUD de Dove; C5 12/15). Nuevas decisiones **D-020** (ARV solo vendidas+arms_length en la mediana) y **D-021** (definición precisa de cash-out + HUD de Dove). **D-004** confirma Node 24 y reparte la limpieza `CLAUDE.md`/`AGENTS.md`. La base sigue **funcional pero no certificada al 100%**.

**v0.4:** se agregó `CERTIFICATION.md` (6 compuertas C1–C6) y `DECISIONS.md` D-019.
**Autores:** redactado por Claude; incorpora las correcciones de la revisión de Codex; a re-revisar/aceptar.

**Cambios v0.3 (correcciones de Codex):** identidad de propiedad reestructurada (`property_id` UUID local + `canonical_property_key` + aliases; SHA-256 versionado); ARV = motor profesional (MAD, calibración…), se descarta `±0.6745σ`; refi = mínimo de restricciones; IRR persiste raw+display+capped+supuestos; evidencia en 3 ejes (origen/verificación/confianza); Bright Data marca dato + alerta operativa; stacks por sistema (Empresa OS = JS puro); ramas `master`/`main`; golden cases con entradas completas (GC-001 anterior invalidado); D-010 acotada a sync documental. Detalle en `DECISIONS.md` D-003…D-018.

**"Aceptado" significa:** revisión técnica de **Claude** + revisión técnica de **Codex** + **aprobación final de Nicolás**. Hasta las tres cosas, un contrato sigue en BORRADOR.

Estos son los **documentos de acuerdo común** entre los dos agentes (Claude y Codex) y los dos productos (Empresa OS y La Bóveda Plus). Son la **fuente de verdad**: ninguno de los dos construye módulos compartidos hasta que estos contratos estén aceptados.

## Los 8 documentos

| Archivo | Qué define |
|---|---|
| `PRODUCT-CONTRACT.md` | Arquitectura, productos, usuarios, módulos, planes y límites |
| `DATA-CONTRACT.md` | Entidades, campos, fuentes permitidas y `property_id` |
| `CALCULATION-CONTRACT.md` | Fórmulas oficiales (ARV, MAO, all-in, retornos, DSCR…) |
| `AI-EVIDENCE-CONTRACT.md` | Reglas para Jarvis: fuentes, evidencia y confianza |
| `WORKSTREAM-OWNERSHIP.md` | Qué trabaja Claude y qué trabaja Codex |
| `DECISIONS.md` | Bitácora de decisiones y cambios de contrato |
| `INTEGRATION-CHECKLIST.md` | Requisitos para pasar un módulo de Empresa OS → Bóveda Plus |
| `GOLDEN-CASES.md` | Propiedades de referencia para pruebas de paridad |
| `CERTIFICATION.md` | Las 7 compuertas (C1–C7) de certificación y su estado |

## Dónde viven
**Repos obligatorios del núcleo compartido:**
- `/Users/nicolaslara/boveda` (La Bóveda / Bóveda Plus — Claude) → **copia canónica** en `contracts/`.
- `/Users/nicolaslara/Desktop/CLAUDE CODE/empresa-os` (Empresa OS — Codex) → copia sincronizada en `contracts/`.

**FlipTrack NO forma parte del núcleo compartido por ahora** (sigue siendo de Claude, pero fuera del alcance de estos contratos).

Los archivos locales `AGENTS.md` (Codex) y `CLAUDE.md` (Claude) siguen gobernando cada repo, pero **deben apuntar a estos contratos** como acuerdo común y no contradecirlos.

## Copia canónica + verificación (sin copias manuales a ciegas)
- La **copia canónica** vive en `/Users/nicolaslara/boveda/contracts/`.
- `CONTRACTS.sha256` (manifiesto de hashes) acompaña a los 8 archivos: un **sha256 por contrato**.
- Un **chequeo de sincronización automático** (script `contracts:check`, a construir por Claude+Codex) compara los hashes de `empresa-os/contracts/` contra el manifiesto canónico y **falla** si difieren. Se corre en CI de ambos repos.
- Así garantizamos que las dos copias son **idénticas** sin depender de que alguien copie a mano.

## Cómo se cambian (regla dura)
1. Cualquier cambio a un contrato se registra **primero** en `DECISIONS.md` (incluyendo migraciones, compatibilidad, costo de datos y riesgo de privacidad/licenciamiento — ver plantilla).
2. Se actualiza el contrato afectado (subiendo su versión) y se **regenera `CONTRACTS.sha256`**.
3. Se **sincroniza** la copia en el otro repo y el chequeo `contracts:check` queda verde antes de implementar el cambio en el segundo sistema.
4. Ningún cambio de fórmula, campo, estado o `property_id` se implementa sin estar reflejado en el contrato y **aceptado** (Claude + Codex + Nicolás).

## Estado de aceptación (al 2026-08-25)
- ✅ Estructura de 8 documentos — **aceptada**.
- ✅ Regla "no modificar módulos compartidos hasta cerrar los contratos" — **aceptada**.
- ⏳ Contenido individual de los 8 archivos — **en revisión** (Claude entregó; Codex revisa uno por uno contra Empresa OS).
- ⛔ `DECISIONS.md` D-001…D-010 — **aún no aceptadas** (propuestas).
- ⛔ Implementar módulos compartidos — **no autorizado todavía**.

Checklist de aceptación por archivo (cada uno requiere las 3 firmas):

| Contrato | Claude | Codex | Nicolás |
|---|---|---|---|
| PRODUCT-CONTRACT | ✅ | ⏳ re-revisar (v0.3) | ⏳ |
| DATA-CONTRACT | ✅ | ⛔→✅? corregido, re-revisar | ⏳ |
| CALCULATION-CONTRACT | ✅ | ⛔→✅? corregido, re-revisar | ⏳ |
| AI-EVIDENCE-CONTRACT | ✅ | ⏳ re-revisar (v0.3) | ⏳ |
| WORKSTREAM-OWNERSHIP | ✅ | ⏳ re-revisar (v0.3) | ⏳ |
| INTEGRATION-CHECKLIST | ✅ | ⏳ | ⏳ |
| GOLDEN-CASES | ✅ | ⛔→✅? corregido, re-revisar | ⏳ |
| DECISIONS D-001…D-018 | ✅ | ⏳ re-revisar | ⏳ |

Hasta que las tres columnas estén ✅, **nadie toca módulos compartidos**.
