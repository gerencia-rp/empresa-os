# Auditoría · CONTABLE (área holding) — 5 Jul 2026

Auditor-arquitecto · Fase 1 (solo lectura, post-fix FF P0). El área Contable no tiene fuente propia: deriva de los espejos de las 4 empresas. QuickBooks: **sin conector, sin tablas** (verificado en FASE 0).

---

## 1 · Modelo de datos real

| Empresa | Ingresos (fuente) | Costos/Overhead (fuente) | ¿EBITDA computable hoy? |
|---|---|---|---|
| **Remodelación** | `monto_real` (draws) por obra | costo_real (mat+trab×1.05) + `remodel_overhead` 107 filas | ✅ **$130,275** (verificado al dólar) |
| **Fix & Flip** | `net_total` por casa (Σ **−$419,446**, cash inyectado — NO realizado) + 1 vendida | `ff_overhead` $127,875 + `ff_hml_payments` $256,086 | ⚠️ aprox y NO-realizado (ver P1-1) |
| **Rentas** | `pm_payments` ingreso/pagado: **$285,579** hist ($6,200 mes en curso) | `pm_expenses` **$426,068** hist (equipo $123,834) + `pm_payroll` 59 filas | ✅ computable: **−$140,489 operativo** hist — pero NO se muestra en ningún lado |
| **Educación** | ❌ **no existe tabla de ingresos** (mentorías cobradas fuera del sistema) | ❌ sin overhead propio | ❌ |
| **QuickBooks** | — | — | ❌ conector inexistente (Fase 2) |

## 2 · Paridad e integridad
N/A directa (área derivada). Los espejos subyacentes: Remodelación ✅ (30=30, assert), FF ✅ (29=29, assert desde hoy), Rentas → auditoría propia (siguiente). **Los $146k/$46k hardcodeados fueron eliminados hoy** (FF-2): /contable ahora muestra overhead FF real $127,875 e intereses reales $256,086 desde espejo.

## 3 · Verificación de KPIs de /contable (post-fix)

| Card /contable | Valor | Fuente | Veredicto |
|---|---|---|---|
| Ingresos rentas (mes) | `comp.rentas.ingresos` | pm_payments mes | ✅ data-driven (verificar cifra en auditoría Rentas) |
| Overhead FF real | **$127,875** | ff_overhead (espejo nuevo) | ✅ real desde hoy |
| Intereses HML reales | **$256,086** | ff_hml_payments (espejo nuevo) | ✅ real desde hoy |
| Deuda de cobranza | comp.cobranza | contrato − plata real (pm_*) | ✅ data-driven |
| Obligación a inversionistas | "—" | placeholder | ⚠️ P2: computable desde cap table FF (Capital aportado por inversionista existe en la fuente) |

## 4 · Findings priorizados

### P0
1. **No existe el P&L consolidado del holding.** La "verdad financiera a nivel holding" (ingreso → costo real → overhead → EBITDA **por empresa y consolidado**) hoy no se muestra en ningún lugar, aunque **3 de 4 empresas ya la tienen computable en espejos** (tabla §1). **Fix propuesto (chico):** vista SQL `v_holding_pnl` (una fila por empresa: ingreso, costo, overhead, ebitda + fila consolidada) + bloque en `/contable` que la lea. Sin tocar fuentes; pura agregación de espejos verificados.
2. **QuickBooks = decisión del CEO, no de código.** Para conciliar libros hace falta: (a) qué company/companies de QBO, (b) credenciales OAuth, (c) alcance (¿P&L only? ¿balance?). Hasta entonces, TODO lo contable debe rotularse "fuente: Airtable espejo" (ya se hace post-FF-2). **Bloqueado en backlog** hasta tu input.

### P1
1. **"EBITDA FF" es no-realizado y puede confundir**: Σ `net_total` = −$419,446 es *cash inyectado en casas vivas*, no pérdida realizada; la ganancia real de FF se realiza en venta/refi (solo 1 vendida; el cashout/refi vive en `ff_draws.cashout_refi` + `cashout`). **Fix:** separar en la UI "resultado realizado (vendidas/refi)" vs "cash inyectado (vivas)" — definiciones distintas, cards distintas.
2. **Rentas no muestra su propio P&L operativo** (−$140,489 hist; el modelo del negocio tolera déficit si flujo+ — regla del Cerebro) → mostrarlo con esa regla explícita.
3. **Educación invisible financieramente**: ni ingresos ni costos en el sistema. Mínimo viable: tabla Airtable de ingresos por mentoría/cohorte + espejo (mismo molde overhead).

### P2
4. Cap table / pasivo a inversionistas computable desde la fuente FF (Capital aportado) — reemplazar el "—".
5. Overhead de Rentas está mezclado dentro de `pm_expenses.category='operational'` — separar etiqueta overhead vs costo directo de casa para un EBITDA Rentas limpio.

## 5 · Oportunidades (agentes IA)
- **Agente conciliador holding**: corre la vista consolidada, compara mes vs mes, redacta el resumen CEO (molde del reporte R1 de Remodelación).
- **Agente de cobranza** (ya hay insight de mora en el OS): pasar de insight a draft de mensaje por WhatsApp (la infra whatsapp-send existe).

---
**Veredicto Contable: de ficción a espejo real en un día (FF-2), pero sin consolidado.** El P0-1 (vista holding) es barato y de alto impacto; el P0-2 (QB) espera tu decisión de alcance/credenciales.
