Vas a actuar como el DIRECTOR DE UN EQUIPO DE AGENTES EXPERTOS encargado de auditar,
corregir y dejar funcionando al 100% el sistema Flipping Rentals OS (repo empresa-os).
Este no es un ejercicio de diagnóstico teórico: cada hallazgo válido debe terminar en
una corrección real, aplicada y verificada, salvo riesgo que requiera aprobación (ver
"Reglas no negociables").

═══════════════════════════════════════════
CONTEXTO DEL NEGOCIO (dáselo a CADA agente que despliegues)
═══════════════════════════════════════════
- Empresa: Rental Profitss (Austin, TX). Holding con 3 empresas: FIX & FLIP (compra/
  reforma/venta y hold), REMODELACIÓN (obra), RENTAS/PROPERTY MANAGEMENT (arriendo).
  Además: Portal del Inversionista y FlipMentoría (estudiantes).
- Sistema: "Flipping Rentals OS" = app web interna (repo empresa-os). La usan el CEO,
  Juan (asistente/admin que opera todo), Carlos (rentas), Alejandra (remodelación),
  los inversionistas (portal, solo lectura) y estudiantes. Es operación REAL: errores
  afectan cobros, pagos de nómina, distribuciones a inversionistas y decisiones.
- Stack: JavaScript vanilla modular (app.js + os/*.js + pm/*.js; archivos grandes en
  scope global window.*). Backend: Supabase (Postgres + RLS + Edge Functions +
  RPCs/vistas como inv_ledger, v_cartera_kpi, v_remodel_avance_vivo). Hosting: Vercel.
  Datos: AIRTABLE es la fuente de verdad del negocio (bases "Flipping Rentals matriz",
  Rentas, Remodelación), sincronizada a Supabase. Contabilidad: QuickBooks (empresa
  "Flipping Rentals LLC"). Chat/IA: edge functions (remodel-ai, ai-deep-analyze).
- ⚠ DEPLOY (crítico): hay DOS proyectos Vercel — `empresa-os` (prod viejo, servido desde
  la rama `main`) y `empresa-os-admin` (donde se despliega la rama de trabajo
  `feat/portal-inversionista-v2`). El CEO usa empresa-os-admin.vercel.app. Parte de la
  auditoría es CONSOLIDAR esto en un solo proyecto/fuente de verdad y evitar "bugs
  fantasma" (código arreglado en la rama pero invisible en el dominio que se mira).
- REGLA DE ORO DEL NEGOCIO: "un dato, una fuente". Airtable manda; la app NO debe
  recalcular ni reinventar lo que la fuente ya tiene. Muchos bugs son exactamente eso.

═══════════════════════════════════════════
PUNTO DE PARTIDA — EL DIAGNÓSTICO YA ESTÁ HECHO (no empieces de cero)
═══════════════════════════════════════════
En este paquete hay un diagnóstico exhaustivo ya realizado (con verificación contra
Supabase, Airtable, QuickBooks y lectura del código). ÚSALO como tu Fase 1 ya adelantada:
- `DIAGNOSTICO-59-AJUSTES.md` — 59 ajustes/hallazgos numerados por pantalla y sistema,
  con causa, evidencia y fix propuesto (Home, Command Center, Pipeline, Propiedades,
  Ficha de casa, QuickBooks, Analítica, Portal del Inversor completo, Rentas/PM,
  Cobranza, Remodelación/EVM/Nómina, Holding). Incluye los CRÍTICOS: déficit con 3-4
  fórmulas distintas, renta modelada ≠ real, unidades 98 vs 51, gastos operativos $0 por
  categoría mal, cartera vencida en 3 números, EVM que no cuadra con los informes
  manuales, conteo de obras 6/7/8/9, nómina con trabajador duplicado y pagado>devengado,
  el "Líder" mostrando rec ID, el SVG crudo transversal, etc.
- `HALLAZGOS-EXPERTOS-agentes.md` — auditoría de código por 5 agentes (arquitectura/
  seguridad, Rentas-datos, Portal inversor, Fix&Flip-finanzas, UX) con archivo y línea:
  incluye P0 de seguridad (edge functions de escritura sin auth + CORS *), la causa raíz
  del SVG, el filtro is_active que infla unidades, el clasificador único de gastos, etc.
- `PROMPT-rediseno-UX-portal-inversor.md` — spec de rediseño UX nivel Robinhood/eToro.
- Cuestionarios de fuentes (xlsx) para Juan/Carlos/Alejandra: confirman de dónde sale
  cada dato en Airtable (aún por llenar por ellos).

Tu trabajo: consolidar estos hallazgos, priorizarlos, y EJECUTAR las correcciones. No
repitas el diagnóstico desde cero; verifica y ejecuta. Escribe el consolidado y el avance
en `AUDITORIA-RENTAL-PROFITSS.md`.

═══════════════════════════════════════════
FASE 0 — LÍNEA BASE
═══════════════════════════════════════════
1. Confirmá rama: trabajá en `feat/portal-inversionista-v2` (o creá `audit/full-system`
   desde ahí). NO toques main. git pull.
2. Detectá scripts de build/test/lint (ci:gate). Corré la línea base: qué está roto HOY.
3. Creá/append `AUDITORIA-RENTAL-PROFITSS.md` como fuente de verdad del proceso.
4. Leé DIAGNOSTICO-59-AJUSTES.md y HALLAZGOS-EXPERTOS-agentes.md completos.

═══════════════════════════════════════════
FASE 1 — VERIFICACIÓN PARALELA (solo lectura)
═══════════════════════════════════════════
Desplegá EN PARALELO subagentes expertos, cada uno tomando su dominio del diagnóstico ya
hecho y CONFIRMANDO en el código/datos antes de tocar: auditor-datos-formulas (el más
importante acá: rastrear cada número a su fuente Airtable, verificar fórmulas a mano —
déficit, renta/NOI, EVM, cartera, nómina), auditor-seguridad (P0: auth en edge
functions), auditor-codigo-bugs (SVG crudo, tabs en blanco, duplicados), auditor-ux-ui
(rediseño, lenguaje simple, semáforos), auditor-arquitectura (dos dominios Vercel,
monolitos), auditor-negocio-producto (¿resuelve la operación?), auditor-rendimiento,
auditor-estandares-calidad. Cada uno escribe su sección en AUDITORIA-RENTAL-PROFITSS.md.

═══════════════════════════════════════════
FASE 2 — PRIORIZACIÓN
═══════════════════════════════════════════
Consolidá y priorizá por severidad + impacto de negocio + riesgo de la corrección.
Orden sugerido de arranque (bajo riesgo y alto impacto primero):
  1) Consolidar deploy (un solo dominio) + arreglar SVG crudo (P0 visual/estructural).
  2) Seguridad: auth en edge functions de escritura + CORS whitelist (P0).
  3) "Un dato, una fuente" de los CRÍTICOS de datos: déficit (fuente única
     ff_deals.deficit_total), renta real (pm_payments) para NOI/DSCR, unidades 51/
     ocupación por reservas, gastos por clasificador único, cartera vencida única,
     EVM/conteo de obras único, nómina deduplicada.
  4) UX: rediseño + lenguaje simple (SPI/CPI → "rápido/lento · caro/barato"), ficha 360°.
  5) Features nuevas (Cerebro IA, informes EVM auto, distribución/notificación).
Antes de tocar datos reales, credenciales, Airtable/QuickBooks o pagos: pedí aprobación.
Para bugs claros / UX / código: procedé sin pedir permiso en cada paso.

═══════════════════════════════════════════
FASE 3 — CORRECCIÓN ITERATIVA
═══════════════════════════════════════════
Por lote: subagente en modo corrección → editar → correr ci:gate/build → commit atómico
Y PUSH a la rama → deploy a empresa-os-admin (vercel --prod si git push da 403) →
verificar en carga NORMAL logueada (sin forzar osInit) → actualizar
AUDITORIA-RENTAL-PROFITSS.md. Nunca dejes el sistema peor de como estaba.

═══════════════════════════════════════════
FASE 4 — VERIFICACIÓN FINAL
═══════════════════════════════════════════
Segunda pasada de los agentes en modo verificación (que su hallazgo quedó resuelto y no
se rompió otra cosa). Corré ci:gate completo. Smoke test de flujos críticos: login,
Ledger, Distribuciones, Pagos/nómina, informes, EVM, cada dashboard carga sin blanco.

═══════════════════════════════════════════
FASE 5 — REPORTE FINAL
═══════════════════════════════════════════
Resumen por categoría/severidad (resueltos vs pendientes), cambios de alto impacto en
lenguaje de negocio, pendientes que requieren decisión mía (horizontes 3/5/8 vs 4/6/8;
proveedor/API del Cerebro IA; llenado de los cuestionarios), y recomendaciones (CI,
tests, linters).

═══════════════════════════════════════════
REGLAS NO NEGOCIABLES
═══════════════════════════════════════════
1. Nunca borres datos de producción/Airtable/QuickBooks/Supabase sin pedírmelo.
2. Nunca comitees secretos/keys/tokens. Si hay uno hardcodeado = CRÍTICO → a variables
   de entorno.
3. Nunca push directo a main/production. Todo en la rama; al final me preguntás si
   fusionar o abrir PR.
4. Nunca elimines funcionalidad para "simplificar" sin confirmarlo (verificá que no se
   use). "Ocultar, no borrar" cuando el CEO pidió quitar pestañas (reversible).
5. Priorizá dejar el sistema funcional sobre "perfecto"; cambios grandes en pasos chicos.
6. Todo cambio documentado en AUDITORIA-RENTAL-PROFITSS.md.
7. Decisión de negocio no resuelta → preguntámela, no asumas.
8. Ningún dato (métrica, total, %, fecha) sin trazabilidad a su fuente real. Hardcodeado/
   simulado mostrado como real = CRÍTICO → conectar a la fuente o marcarlo visiblemente
   como ejemplo. (Es el problema central de este sistema.)
9. Toda fórmula/cálculo (ROI, déficit, NOI, DSCR, TIR, prorrateos, EVM/CPI/SPI, cartera,
   nómina) verificada A MANO con un caso real antes de darla por buena. El número debe
   ser el CORRECTO, no solo que "no truene". Cuando dos pantallas muestran el mismo dato,
   deben COINCIDIR (una sola fuente).
10. Pagos/write-backs a Airtable/QuickBooks: NUNCA ejecutar automáticamente; siempre
    aprobación manual (dry-run + firma).

Empezá ahora por la FASE 0. (Definiciones de subagentes y checklist de estándares
internacionales: ver el documento del CEO; podés crear los subagentes en .claude/agents/
o desplegarlos ad-hoc con la herramienta Task/Agent.)
