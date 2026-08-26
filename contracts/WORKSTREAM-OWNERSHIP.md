# WORKSTREAM-OWNERSHIP.md

**Versión:** v0.3 (BORRADOR) · **Fecha:** 2026-08-25 · Redactó: Claude · Incorpora obs. Codex

Quién trabaja qué, para no editar lo mismo a la vez.

## Repos (obligatorios del núcleo compartido)
- **La Bóveda / Bóveda Plus** — `/Users/nicolaslara/boveda` — Supabase `fliptrack-prod` (`bbjbghpigulgywwufjqs`, esquema `boveda`). Deploy Vercel `boveda-portal` / `boveda-admin` (`--scope rental-profits`). Agente: **Claude**. **Copia canónica de contratos: `/Users/nicolaslara/boveda/contracts/`.**
- **Empresa OS** — `/Users/nicolaslara/Desktop/CLAUDE CODE/empresa-os` (github gerencia-rp/empresa-os) — **Supabase propia (distinta)**. Agente: **Codex**. Copia sincronizada: `.../empresa-os/contracts/`.

**Fuera del núcleo compartido (por ahora):**
- **FlipTrack** — `/Users/nicolaslara/dev-claude/fliptrack` — misma Supabase que Bóveda (esquema `public`). Sigue siendo de **Claude**, pero **NO forma parte de estos contratos** por ahora (D-011). Se incorpora más adelante si hace falta, con su propia decisión.

## Claude (principal)
- La Bóveda y La Bóveda Plus (portal + admin).
- Ficha 360 del estudiante.
- Investigación de mercado (vista producto).
- Integraciones de datos ya existentes en Bóveda (`rp-data`, `rp-analyze`, `rp-scrape`, etc.).
- Calculadoras y experiencia educativa.
- Membresías, planes, límites y consumo por estudiante.
- Jarvis educativo / del estudiante.
- Seguridad multiusuario y aislamiento de datos (RLS).

## Codex (principal)
- Empresa OS.
- Jarvis ejecutivo.
- Luxury Deal Studio.
- Operación de Fix & Flip.
- Remodelación, presupuesto y ejecución de obra.
- Rentas.
- Finanzas y QuickBooks.
- Reportes internos.
- Aprendizaje con resultados reales.
- Preparación de motores reutilizables por La Bóveda.

## Núcleo compartido (cambios = revisión conjunta)
Fórmulas, `property_id`/normalización, definiciones de entidades, reglas de evidencia. Vive como **paquete compartido** (candidato: `packages/core` de La Bóveda) + **tests de paridad**. Nadie cambia el núcleo sin: registrar en `DECISIONS.md`, avisar al otro, y sincronizar el contrato. Ver `DECISIONS.md` D-010.

**Contratos = copia canónica + hashes + chequeo automático.** La copia canónica vive en `boveda/contracts/` con un manifiesto `CONTRACTS.sha256`. El script `contracts:check` (a construir Claude+Codex) compara los hashes del otro repo contra el manifiesto y **falla en CI** si difieren. Nada de copiar a mano a ciegas.

## Reglas de convivencia (duras)
1. **Ramas/espacios separados.** La Bóveda usa `master`; **Empresa OS usa `main`**. Cada agente trabaja en su **rama de feature**, PRs chicos; nunca dos manos en la rama principal del mismo repo a la vez.
2. **No editar simultáneamente el mismo archivo/módulo.** Si hace falta tocar el área del otro, se registra primero un cambio formal en el contrato (`DECISIONS.md`) y se coordina.
3. **Cada entrega declara** (ver plantilla en `INTEGRATION-CHECKLIST.md` §Entrega verificable): qué completó, qué archivos cambió, qué pruebas corrió, qué no pudo verificar, si tocó contratos/DB, commit usado, qué requiere aprobación.
4. **Nada a producción** por "funciona local": antes van pruebas, revisión de seguridad/aislamiento, validación visual, comparación de resultados (paridad), revisión de migraciones y aprobación.
5. **AGENTS.md (Codex) y CLAUDE.md (Claude)** gobiernan cada repo pero **apuntan a estos contratos** y no los contradicen.

## Orden de arranque
1. **Contratos** (estos 8) aceptados por ambos. ← estamos acá.
2. **Codex:** primer módulo de Empresa OS = **Luxury Deal Studio** (tier-aware, lujo primero), contra el contrato.
3. **Claude (en paralelo):** **Fundación de La Bóveda Plus** = tiering/entitlements + Ficha 360 spine + control de costos, contra el contrato.
4. Los siguientes módulos (investigación → forense → ADN reno → buy box → underwriting → ejecución → salida → aprendizaje) se toman de a uno, cada uno con su registro en `DECISIONS.md`.
