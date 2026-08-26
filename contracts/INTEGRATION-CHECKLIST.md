# INTEGRATION-CHECKLIST.md

**Versión:** v0.3 (BORRADOR) · **Fecha:** 2026-08-25 · Redactó: Claude · Incorpora obs. Codex

Requisitos para **promover un módulo de Empresa OS → La Bóveda Plus**, y para integrar cualquier cambio a producción. Nada se integra sin cumplir esto.

## A. Antes de promover un módulo (laboratorio → producto)
- [ ] El módulo está **probado con propiedades/operaciones reales** en Empresa OS.
- [ ] **Pruebas de paridad** verdes contra `GOLDEN-CASES.md` (mismos números, mismas entradas).
- [ ] **Adaptación a estudiante:** UX simplificada; sin exponer reglas internas, estructura administrativa ni datos reales de Rental Profitss.
- [ ] **Frontera de datos (D-009):** lo que cruza es agregado/anonimizado; cero datos crudos/privados.
- [ ] **Multi-tenant + RLS** verificado por impersonación (un estudiante no ve datos de otro).
- [ ] **Gating por entitlement/plan**: el módulo respeta Free vs Plus y los límites; el Free ve teaser, no pantalla rota.
- [ ] **Control de costos:** usa la Ficha 360 / caché única, presupuesto por usuario y kill switch; enriquecimiento escalonado.
- [ ] **Evidencia (AI-EVIDENCE-CONTRACT):** cada dato con fuente/fecha/estado/confianza; nada inventado.
- [ ] Contratos afectados actualizados y **sincronizados en ambos repos**; `DECISIONS.md` registrado.
- [ ] `CLAUDE.md` / `AGENTS.md` del repo receptor actualizados.

## B. Antes de tocar producción (cualquier cambio)
- [ ] Pruebas relevantes completas (unit + batería + paridad).
- [ ] Revisión de **seguridad y aislamiento** (RLS, service-role solo server-side, sin secretos en cliente/texto).
- [ ] **Validación visual** (render real logueado; screenshots).
- [ ] **Comparación de resultados** (paridad Empresa OS ⇄ Bóveda para los golden cases tocados).
- [ ] **Revisión de migraciones** (idempotentes; reversibles; md5 DB==local si hay artefactos).
- [ ] **Compatibilidad** (¿rompe algo existente? ¿retrocompatible?).
- [ ] **Costo de datos** (¿aumenta consumo de fuentes externas? ¿respeta caché/presupuesto/kill switch?).
- [ ] **Privacidad/licenciamiento** (¿expone datos de un tenant a otro o de Rental Profitss? ¿la fuente permite este uso/redistribución?).
- [ ] **`contracts:check` verde** (copias de contratos sincronizadas por hash).
- [ ] **Aprobación** explícita antes de afectar producción.
- [ ] Deploy con el scope correcto (`--scope rental-profits` en Bóveda); edges por CLI si cambian.

## C. Entrega verificable (toda corrida de Claude o Codex termina declarando)
1. **Qué completó.**
2. **Qué archivos cambió.**
3. **Qué pruebas ejecutó** (y resultado).
4. **Qué no pudo verificar** (y por qué).
5. **Si cambió contratos o base de datos** (y cuáles).
6. **Commit utilizado.**
7. **Qué requiere aprobación** antes de producción/integración.

## D. Cambios de contrato (recordatorio)
Cualquier cambio a campos, fórmulas, estados, eventos o `property_id`: **registrar en `DECISIONS.md` primero**, actualizar el contrato, sincronizar en ambos repos, y recién ahí implementar en el segundo sistema.
