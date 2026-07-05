# Auditoría · RENTAS (Property Management) — 5 Jul 2026

Auditor-arquitecto · Fase 1 (solo lectura). Fuente: Airtable `apptTKRYbx6gu701i` (⚠️ nombrada "Empresa Rentas — Modelo Nuevo (sandbox)"). Espejo: `pm_*` vía `pm-sync-airtable` (v26, linked records, cron diario — sync fresco: 5-jul).

---

## 1 · Modelo de datos real

7 tablas fuente (Casas, Inquilinos, Reservas, Pagos, Gastos, Unidades, Accesos) → espejo `pm_properties/pm_tenants/pm_bookings/pm_payments/pm_expenses/pm_units/pm_credentials` + capa propia (`pm_tasks` auto-generadas, `pm_alerts`, `pm_data_warnings`, WhatsApp, Cerebro RAG). Soft-delete completo (`active`+`archived_at`) ✅. Pagos resueltos por **linked record IDs** (cero fuzzy) ✅ — 0 pagos sin casa en el espejo.

## 2 · Paridad e integridad — ⚠️ DERIVA PARCIAL

| Tabla | Fuente Airtable | Espejo (activo) | Δ | Veredicto |
|---|---|---|---|---|
| 🏠 Casas | 21 | 21 | 0 | ✅ |
| 🚪 Unidades | 48 | 48 | 0 | ✅ |
| 📅 Reservas | 65 | 65 | 0 | ✅ |
| 👤 Inquilinos | 90 | 89 | **−1** | ⚠️ |
| 💵 **Pagos** | **326** | **304** | **−22 (−6.7%)** | ❌ |
| 📤 Gastos | 497 | 498 | **+1** | ⚠️ fantasma (borrado en Airtable, nunca archivado) |

**Causas probables** (a confirmar en Fase 3): (a) reglas de skip del sync (pagos sin link/monto/fecha se saltean silenciosamente), (b) el cron corre con `archive:false` **permanente** (anti-wipe defensivo) → los borrados de Airtable quedan como fantasmas para siempre, (c) **no hay assert de paridad para pm_*** (Remodelación y FF ya lo tienen).

## 3 · Verificación de KPIs

| Métrica | Recalculada desde crudo | Referencia | Veredicto |
|---|---|---|---|
| **Ocupación (regla del dueño)** | 29 directas (12 casa_completa+12 estudio+5 apto) + 4 casas-con-habitaciones = **33 rentables**; 26+4 = **30 ocupadas** → **91%** | CLAUDE.md: 30/34 ≈ 88% (jul-1) | ⚠️ el denominador cambió (34→33): una casa-con-habitaciones menos en el inventario activo. La regla se computa bien; el número documentado quedó viejo. |
| Fallback `total_units` (Casas.Unidades) | Σ = **46** | cálculo real = 33 | ❌ **la fuente Airtable dice 46, el cálculo data-driven 33** — si alguna vista usa el fallback muestra otra ocupación. Corregir "Unidades" en Airtable o retirar el fallback. |
| Ingresos (histórico) | **$285,579** (pagado) | — | ✅ pero **subcontado**: faltan 22 pagos del espejo |
| Ingresos (mes en curso) | $6,200 (jul, 5 días) | — | ✅ plausible |
| Gastos (histórico) | $426,068 (equipo $123,834) | — | ⚠️ +1 fantasma |
| Físico | 48 unidades: 44 ocupada / 4 disponible | — | ✅ consistente con calendario por habitación |

## 4 · Ecosistema
- ❌ `pm_properties` sin `property_id` (igual que ff_deals): 17/30 casas de Remodelación matchean por dirección. El flujo Remodel→Rentas existe; la llave es débil.
- ✅ Puentes internos ricos: reserva→turnover→gasto→KPI, cronograma compartido con Operación.

## 5 · UX / consistencia
- ✅ Command Center Rentas + PM clásico, panel Calidad de datos accionable, read-only en 3 capas, reportes PDF, guía de bienvenida.
- ⚠️ Sin badge de paridad/última-sync visible (patrón ya probado en Remodelación/FF).

## 6 · Findings priorizados

### P0
1. **Pagos: espejo 304 vs fuente 326 (−22, −6.7%).** Plata real que la app no ve → cobranza/KPIs/reportes subcontados. **Fix:** (a) loggear el motivo de cada skip en el sync (hoy silencioso), (b) assert de paridad pm_* en `remodel_sync_parity` (molde ya existente), (c) badge "sync desincronizado" en el CC de Rentas.

### P1
2. **Fantasmas por `archive:false` permanente**: +1 gasto (y acumulará). **Fix:** purga controlada periódica (`archive:true` semanal supervisado) o archive-unseen con umbral de seguridad (ej. si faltan >10% abortar y alertar — anti-wipe conservado).
3. **Inquilinos −1** (misma familia de causa que #1/#2).
4. **`Casas.Unidades` (46) ≠ unidades rentables reales (33)** — dato del dueño desactualizado en la fuente; corrígelo en Airtable o retirá el fallback del front.
5. **`property_id` en `pm_properties`** (junto con ff_deals cuando lo autorices).
6. **Base "sandbox"**: renombrar `apptTKRYbx6gu701i` a "Empresa Rentas — PRODUCCIÓN" y archivar las otras 2 homónimas (riesgo de que alguien edite la base equivocada).

### P2
7. Ocupación documentada (30/34) quedó vieja → actualizar CLAUDE.md a la regla (no al número).
8. Overhead Rentas: separar dentro de `pm_expenses` (etiqueta overhead vs costo de casa) para EBITDA Rentas limpio (ver auditoría Contable).

## Oportunidades (agentes IA)
- **Agente de conciliación de pagos** (el campo "Conciliación IA" + "Revisar inquilino" ya existen en la fuente — falta el agente que los rellene).
- **Agente de cobranza**: insight de mora → draft WhatsApp (infra whatsapp-send lista).
- Data no mostrada: `Renta objetivo` por unidad permite "renta potencial perdida" por vacancia ($ por unidad disponible).

---
**Veredicto Rentas: el espejo más maduro y el único con cron activo, pero con deriva silenciosa (−22 pagos) y sin assert de paridad.** El P0 es una tarde de trabajo con el molde ya probado en FF/Remodelación.
