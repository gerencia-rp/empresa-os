# PRODUCT-CONTRACT.md

**Versión:** v0.3 (BORRADOR) · **Fecha:** 2026-08-25 · Redactó: Claude · Incorpora obs. Codex

Define la arquitectura, los productos, los usuarios, los módulos y los límites. Es el marco al que se subordinan los demás contratos.

## 1. Principio rector
Una sola arquitectura, dos productos, un núcleo compartido.

- **Empresa OS** — sistema operativo **interno** de Rental Profitss. Es el **laboratorio real**: se prueba con propiedades y operaciones reales. Dueño: Codex.
- **La Bóveda Plus** — producto **comercial, multiusuario y simplificado** para estudiantes/clientes. Dueño: Claude.
- **Núcleo compartido** — propiedades, fórmulas, fuentes, underwriting, comparables, evidencia, remodelación y reportes. Mismos motores, misma matemática.

Regla: **Empresa OS no se copia entero a La Bóveda.** Solo se transfieren módulos ya **probados** y **adaptados** para estudiantes, sin exponer datos, reglas internas ni estructura administrativa de Rental Profitss. Un módulo pasa de laboratorio a producto solo cumpliendo `INTEGRATION-CHECKLIST.md`.

## 2. Alcance del motor
El motor se diseña **tier-aware (para cualquier franja de precio)**. La **primera implementación profunda es para flips de lujo** (el caso más exigente), pero nada se codea de forma que quede encerrado en lujo: la franja es un **parámetro**, no una bifurcación de código.

## 3. Usuarios y roles
**Empresa OS (interno):** equipo de Rental Profitss (dirección, operación, obra, finanzas). Single-tenant (una empresa).

**La Bóveda Plus (producto):** multi-tenant.
- **Estudiante Free** — formación, biblioteca, metodología, calculadoras manuales, datos públicos/RentCast básico, Mentor educativo.
- **Estudiante Plus (pago)** — todo lo Free + Ficha 360, investigación de mercado profunda, underwriting Plus, Jarvis sobre sus propios deals, reportes profesionales, monitoreo — con límites por plan.
- **Admin/Staff** — gestión, soporte, analítica (ya existe en el panel admin).

Aislamiento: cada estudiante ve **solo sus datos** (RLS por `user_id`, probado por impersonación). Ver `DATA-CONTRACT.md` §multi-tenant.

## 4. Mapa de módulos (embudo de profundidad)
Numeración canónica del recorrido macro→micro. Cada módulo lee de la Ficha 360 (única fuente por propiedad) y usa los motores del núcleo.

| # | Módulo | Empresa OS | Bóveda Plus |
|---|---|---|---|
| M0 | Fundación (tiering, entitlements, Ficha 360 spine, control de costos) | n/a | **Claude (primero)** |
| M1 | Investigación de mercado: ciudad → ZIP → segmento | comparte núcleo | Claude |
| M2 | Forense de propiedades vendidas (detector de flips, realtors, contratistas) | Codex | Claude (vista producto) |
| M3 | ADN de diseño y remodelación (IA: fotos, disclosures/OM, acabados) | Codex | Claude (vista producto) |
| M4 | Buy Box (data-driven, por micromercado) | comparte núcleo | Claude |
| M5 | Underwriting (comparables, números, escenarios) | Codex (Luxury Deal Studio) | Claude (Underwriting Plus) |
| M6 | Ejecución de obra (alcance, presupuesto, cronograma, compras, calidad) | **Codex** | (no; solo lectura de resultados) |
| M7 | Estrategia de salida y venta (listing, staging, DOM, playbook) | Codex | Claude (vista producto) |
| M8 | Proyectado vs Real / aprendizaje | **Codex (datos reales)** | Claude (versión estudiante) |
| M9 | Rentas / Finanzas (QuickBooks) / Reportes internos | **Codex** | Claude (versión simplificada Plus) |
| MJ | Jarvis | ejecutivo (Codex) | educativo/estudiante (Claude) |

## 5. Jarvis: dos experiencias, mismos motores
- **Jarvis ejecutivo (Empresa OS):** opera sobre datos reales de Rental Profitss, con agentes por área. Dueño: Codex.
- **Jarvis del estudiante (Bóveda Plus):** trabaja sobre los deals y datos **del estudiante**, con RLS. Explica y guía. Dueño: Claude.
- **Mentor IA** (ya existe) sigue siendo el que **enseña la metodología**; Jarvis del estudiante **trabaja sobre datos**. Comparten cerebro/corpus donde corresponde, no historial entre usuarios.

## 6. Planes y límites (Bóveda Plus)
Basado en lo que ya existe: `boveda.plans`, `boveda.entitlements` (`grant_type ∈ {all,plan,resource}`, `source ∈ {purchase,fliptrack-student,admin-grant,gift}`), `can_access_resource()`.

- **Free:** experiencia actual del estudiante (no cambia).
- **Plus (~$99–100/mes):** desbloquea módulos Plus vía entitlement de plan. Límites mensuales iniciales sugeridos (a confirmar): 25 fichas completas, 10 underwriting completos, 3 mercados/vecindarios monitoreados, 5 propiedades en Portfolio Monitor, Jarvis con uso razonable, reportes incluidos, créditos adicionales para análisis extra.
- **Gating visual:** los módulos Plus se ven para todos; el Free ve estado teaser + CTA "Actualizá a Plus" (nunca pantallas rotas). El default **sin** entitlement Plus = experiencia actual intacta.

## 7. Frontera laboratorio → producto (regla dura)
De Empresa OS a Bóveda Plus viajan **patrones, benchmarks y motores** — **nunca** datos crudos, deals reales, proveedores, contratos ni reglas internas de Rental Profitss. Todo lo que cruza es agregado/anonimizado. Detalle en `AI-EVIDENCE-CONTRACT.md` y `INTEGRATION-CHECKLIST.md`.

## 8. Runtime (por sistema — corregido v0.3, obs. Codex)
Cada repo documenta su stack por separado (no son iguales):
- **La Bóveda / Bóveda Plus:** **Next.js** sobre **Node**. Hoy declara `>=20`; se **valida en Node 24** y luego se fija el pin.
- **Empresa OS:** **JavaScript puro** (NO Next.js) sobre **Node 24** (ya declarado).
- **Edge Functions (Supabase):** **Deno** (ambos productos).
- El **núcleo de fórmulas se escribe portable** (ES modules, sin APIs exclusivas de Node) para correr igual en Node y Deno. Ver `DATA-CONTRACT.md` §7 y `DECISIONS.md` D-004.
