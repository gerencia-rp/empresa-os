# CLAUDE.md — Empresa OS (Rental Profits)

Este archivo es la **memoria persistente** del proyecto para Claude (Claude Code, Claude Desktop, Cowork). Léelo siempre al iniciar una sesión. Mantenelo actualizado con cada decisión técnica importante.

---

## 🎯 Estado (1 Jul 2026 — Flipping Rentals OS: shell del holding + Fix & Flip completo) · EN VIVO

- 🌐 **Flipping Rentals OS** (`os/os.js`): shell del ecosistema con **routing real (History API)** montado tras el login sobre el panel clásico (accesible con "⚙︎ Admin"). Niveles: **Global** (`/`, KPIs consolidados + 4 empresas + áreas Operación/Contable + Cerebro del Holding), **Empresa** (`/fix-and-flip`, `/rentas`, `/remodelacion`, `/educacion`), **áreas** `/operacion` (cronograma + cobranza = contrato − plata real) y `/contable` (conciliación QB + cap table), **apps** (`/fix-and-flip/underwriting` etc. abren la sección del Command Center). 404 con diseño. Título "Flipping Rentals OS" + OG.
- ⚠️ **ROUTING SPA (gotcha resuelto):** el rewrite de `vercel.json` DEBE apuntar a **`/`**, NO a `/index.html` — con `cleanUrls:true`, `/index.html` da 308→`/` y el rewrite falla (404). Config vigente: `rewrites:[{source:"/((?!api/|assets/|viral|diag|mi-plan|.*\\.).*)",destination:"/"}]` (excluye api, assets, las páginas standalone y archivos con extensión). Rewrites por-ruta también fallaban por lo mismo.
- 🏗️ **Fix & Flip completo** (`pm/ff-command-center.js`, área fix-flip, mirror `ff_*` de Airtable `applMXFyPq1hXj7iN`, SOLO LECTURA): Command Center (Kanban + insights), **Underwriting** (MAO, estimador calibrado \$7–100/sqft con validador de rango, HML, cash-out refi, ROI + recuperación con semáforo, ingeniería inversa), **Inversionistas** (CRM depurado 18 + 4 modelos + cap table + buy-out capital+15% + propuestas + alerta contrato sin firmar), **Finanzas/QuickBooks** (P&L cockpit, gastos por tipo, rentabilidad por casa, conciliación). Tablas: `ff_deals` (28), `ff_draws` (24), `ff_investors` (19, migración `20260701100000`).
- 🎨 **Tema claro/oscuro** en TODO el ecosistema (`pm/pos-theme.js`, `[data-theme="light"]`, persistido en localStorage; toggle ◐). Aplicado a OS, Rentas CC y FF CC.
- 🧠 **Cerebro** reusado (chat `/api/brain-chat` + memoria RAG `pm_brain_memory`); sembrado con reglas de Rentas (`seed`) y Fix & Flip (`ff-seed`): all-in ≤75% ARV, déficit OK si flujo+ y acum <\$20k, inversionista 15–18%, split 50/50, buy-out capital+15%, refi ≤ pago actual, Harmony solo intereses, CPI+3–5%, depósitos no son renta, **registrar la plata real no el contrato**.
- 💾 **Deploy por CLI** (el auto-deploy de GitHub estaba caído por el límite de funciones, ya resuelto): `VERCEL_TOKEN=<token> npx vercel@latest deploy --prod --yes`. Node en Vercel = 24.x (dashboard).
- 🔗 **Sistemas clásicos conectados al OS por el router (sin tocar su lógica):** las apps clásicas (Property Manager `pm-rental-mgmt`, Cronograma, Estimador Pro, Dashboard Obras, Educación) abren el sistema REAL vía `openSystem()` de app.js. Gotcha: abren como **modal `#modal` (z-50)** → quedaban tapados por `#os-root` (z-900). Puente en `os.js`: `osOpenApp`/`osOpenSystem` (busca el sistema por TIPO en TODAS las áreas de `state.systems` — ojo: `state` es binding léxico de app.js, NO `window.state`), al abrir oculta `#os-root` + inyecta barra **"← Volver"** (`osEnterClassic`), y al cerrar (×/ESC/backdrop/Volver → wrap de `closeModal`) restaura el OS y navega por History API (`osExitClassic`). Se sacó el botón "⚙︎ Admin" (dead-end a la UI vieja).
- 🎨 **Re-skin base de los clásicos = capa CSS** (`osInjectReskin`/`osApplyReskin`, `data-osreskin=<tema>` en `<html>`, scopeada a `#modal`/`#app`): mapea Tailwind viejo → tokens nuevos SIN tocar markup. El **oscuro** es el que más aporta (la UI vieja es light-only). Pendiente: afinar re-skin sistema por sistema (pm-main tiene CSS propio).

---

## 🎯 Estado (1 Jul 2026 — Property OS · Command Center + Cerebro IA) · rama `feat/cerebro-full` (mergeada a main)

- 🛰️ **Command Center** (`pm/command-center.js`, ~90KB): app unificada de Rentas, dark (mockup `docs/Property_OS_Mockup_RentalProfits.html`: #06080d, vidrio, gradiente teal→azul, orbe vivo). Sidebar 8 secciones (Command/Propiedades/Reservas/Operación/Inquilinos/Finanzas/Analítica/Cerebro IA). Se abre desde `systems` con `type='command-center'` (dispatch en `app.js`). **SOLO LECTURA** de datos de Airtable (no escribe NINGUNA tabla espejo); sólo escribe memoria/chat del Cerebro.
- 🧠 **Cerebro IA (3 fases):** (1) **Insights por reglas** (sin costo IA) rankeados por $; incluye **"Ocupada sin ingresos"** (cobranza/registro). (2) **Chat** `/api/brain-chat` → Claude `claude-opus-4-8` (env `ANTHROPIC_API_KEY`, ya en Vercel — la usa el módulo viral). (3) **Memoria RAG**: `pm_brain_memory`+`pm_brain_chat`+RPC `match_brain_memory` (pgvector, migración `20260701000000`), embeddings **Voyage `voyage-3-lite` 512d** vía `api/_brain.mjs` (Vercel env `VOYAGE_API_KEY` → fallback edge function `generate-embedding` que sí tiene la key en Supabase Secrets → degradar a "recientes"). `/api/brain-memory` = CRUD. Seed de 7 memorias (`20260701000100`). **Resumen del día** generado por el Cerebro arriba del Command Center.
- 📊 **Regla de unidades (34) en TODA la app** (Command Center, pm-main dashboard/ficha, Analítica, reportes). Ocupación oficial = ocupadas/34 ≈ **82%**. Ningún tab muestra 49 (físico) como "unidades". Panel **Calidad de datos** accionable (ocupadas sin ingreso, unidades sin renta objetivo, reservas sin fecha, gastos sin monto → "Corregir en Airtable → tabla X").
- 🔌 **Interconexión:** "Operación de hoy" = `pm_tasks` real (cronograma); cadena reserva→turnover/recepción→gasto→KPI (auto-tareas del sync). Reportes PDF + Guía de Bienvenida accesibles desde el CC (cablean `pmOpenReport`/`pmGenerateWelcomeGuide`).
- ✅ **DEPLOYADO Y EN VIVO (1 Jul):** todo el Cerebro está en producción. Chat con memoria RAG por similitud verificado (`memory_used`, `mode: similarity`); `/api/brain-chat?resource=memory` = 200.
- 🚫 **CONSTRAINT CRÍTICO — Vercel Hobby = máx 12 Serverless Functions.** Cada archivo en `api/` (y subcarpetas) que NO empiece con `_` cuenta como función; los `_`-prefijados (helpers) NO cuentan. Hoy hay **exactamente 12** (`brain-chat`, `claude`, `pm-report`, `pm-welcome-guide` + `cron/`: check-contracts/occupancy/payments/services/tasks, report-weekly, report-monthly, sync-airtable). **Agregar una función nueva rompe TODOS los builds** con "No more than 12 Serverless Functions" (fue la causa de que el Bloque 1 no deployara: `brain-memory.mjs` fue el nº13). Por eso la CRUD de memoria se fusionó en `brain-chat` (`?resource=memory`). Para sumar endpoints: fusionar en uno existente, prefijar helpers con `_`, o pasar a plan Pro.
- 🚀 **Deploy manual por CLI** (cuando el auto-deploy de GitHub falla): `VERCEL_TOKEN=<token> npx vercel@latest deploy --prod --yes` (proyecto linkeado en `.vercel/project.json`). Warning no-bloqueante: Node 20.x se deprecia el 2026-10-01 → subir `engines.node` a `24.x` en `package.json` antes de esa fecha.

---

## 🏢 Contexto del negocio

**Empresa:** Rental Profits — Gestión de propiedades en alquiler (Property Management).

**Producto:** "Empresa OS" — plataforma interna para administrar propiedades, inquilinos, reservas, pagos, gastos, mantenimiento, planificación y comunicación.

**URL producción:** [https://empresa-os.vercel.app/](https://empresa-os.vercel.app/) **Dominio principal:** rentalprofitss.com

**Usuario principal:** Nicolás Lara (CEO) — `gerencia@rentalprofitss.com` **Operaciones:** Carlos (manager) — usa Property Manager (PM) y Pagos.

---

## 🛠️ Stack técnico

- **Frontend:** Vanilla JavaScript (NO React, NO Next.js, NO frameworks de SPA). HTML \+ JS \+ CSS puros. Deploy estático en Vercel.  
- **Backend:** Supabase  
  - ⚠️ **PROD SUPABASE = `nezbaljfhhyznhltpjnk`** (`nezbaljfhhyznhltpjnk.supabase.co`). **NUNCA correr SQL/migraciones en otro proyecto.** Hay varias bases en la cuenta; verificá el `<ref>` (URL del SQL Editor / `supabase/.temp/project-ref`) antes de ejecutar. Para queries server-side: `supabase db query --linked "..."`.  
  - PostgreSQL para data  
  - Edge Functions (Deno runtime) para lógica server-side y sincronización  
  - Storage para archivos  
  - Auth para login (Magic Link)  
- **Source of truth:** Airtable (base `apptTKRYbx6gu701i` — base NUEVA limpia, cutover 2026-06-29). La base vieja `appzEnsuy4qPT6iHj` ("Empresa Rentas") quedó **deprecada**.  
- **Deploy:** Vercel auto-deploy on `git push origin main`  
- **Hosting de funciones serverless adicionales:** `api/` carpeta del repo (Vercel Functions, Node runtime)  
- **Cron jobs:** Vercel Cron Jobs (definidos en `vercel.json`)

---

## 🔐 Reglas críticas de seguridad

1. **NUNCA hardcodear tokens en código.** Todos los secretos van en **Supabase Secrets** (server-side) o **Vercel Environment Variables**.  
   - Tokens conocidos en Secrets: `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`, claves OpenAI, claves Twilio, etc.  
2. **Frontend nunca debe ver tokens.** Si el front necesita interactuar con Airtable, lo hace vía edge function (que sí tiene el token).  
3. **PAT de Airtable:** se llama "property management" en la UI de Airtable. Scopes: `data.records:read/write` \+ `schema.bases:read/write`.  
4. **Cuando se regenere un token de Airtable:** actualizar en Supabase Secrets, NO en el código.  
5. **`config.public.js`** solo debe contener IDs públicos (Supabase URL, anon key). Nunca service role keys.

---

## 🗄️ Mapeo Airtable → Supabase DB

**Base NUEVA `apptTKRYbx6gu701i` (vigente desde cutover 2026-06-29).** 5 tablas con
**linked records reales** → se eliminó TODO el fuzzy matching (nicknames, match por nombre, normalizeAddress).

| Tabla DB (Supabase) | Tabla Airtable | Table ID | Notas |
| :---- | :---- | :---- | :---- |
| `pm_properties` | **Casas** | `tblisRfa2IW02ltCL` | 1 fila = 1 propiedad. Llave estable `airtable_address_id` = recId de la Casa |
| `pm_tenants` | **Inquilinos** | `tblXuFC9azHTZGjmE` | external_id = `tenant-{recId}` |
| `pm_bookings` | **Reservas** | `tblzz3fokkBprEpIm` | enlaza Casa + Inquilino. Saltea reservas sin Fecha Entrada (start_date NOT NULL) |
| `pm_units` | derivadas de **Reservas** | — | 1 por (Casa + "Unidad / Habitación"). external_id = `unit-{casaRecId}-{slug}` |
| `pm_payments` | **Pagos** | `tbl5p63dUEhrzgHVJ` | **resuelve tenant/property/booking por LINKED RECORD IDs** (Inquilino/Casa/Reserva) + backfill desde la Reserva |
| `pm_expenses` | **Gastos** | `tblGBQ5xn9Zp6YrTN` | 1 sola tabla (antes 4). property por linked Casa. category derivada de "Ámbito" (Casa/Plataforma/Equipo) → fallback "Tipo de Gasto" |
| `pm_credentials` | **Accesos** | `tblfb63Yhn0NIMDNw` | 🔑 servicios/claves por casa. external_id = `cred-{recId}`, property por linked Casa |
| `pm_tasks` | **Tareas Mantenimiento** | `tbl1Xyxex7Ve9j8QS` | 🧰 cronograma. external_id = `task-{recId}`. OJO: convive con tareas auto-generadas por la app (external_id NULL, no se archivan) |
| WiFi (enrich `pm_properties`) | campos en **Casas** | — | `WiFi Nombre` `fldnukNsOSGMk1nEQ`, `WiFi Clave` `fldMlhg35OmZwJA5i`, `Drive` `fldohaq4JEfOuYiCj` → wifi_name/wifi_pass/drive_url |

**Nota:** la base nueva también tiene una tabla dedicada **🚪 Unidades** (`tblItO7iMZT9QS87y`) que hoy NO se usa — `pm_units` se sigue derivando de Reservas. Migrar a la tabla Unidades es una mejora futura.

### Resolución de pagos (regla CRÍTICA)

- `pm_payments` resuelve `tenant_id`/`property_id`/`booking_id` por los **linked record IDs**
  de Airtable (campos Inquilino `fld01OK8T8TJl8ZXb`, Casa `fld0RYuPMMUpcgnoF`, Reserva `fldU0KUvfPEdpp1tY`).
- **NO hay fuzzy matching ni match por nombre.** Si el pago no enlaza Casa/Inquilino → warning `pago_link_faltante`.
- La base nueva tiene un campo "Revisar inquilino" (checkbox) + "Conciliación IA" que rellena el agente de conciliación.

### Nómina (Gastos Equipo)

- La base nueva NO tiene tabla `pm_payroll` separada: los gastos de equipo/nómina entran como filas de **Gastos**
  con `Ámbito = Equipo` (category `operational`). `pm_payroll` viejo quedó deprecado.

### Migración de propiedades (cutover)

- `pm_properties` **no tiene unique constraint usable para ON CONFLICT** (`airtable_address_id` sin unique;
  `address_normalized` es índice PARCIAL). El sync hace **INSERT/UPDATE explícito por fila**.
- Las 18 propiedades viejas se **re-vincularon por `address_normalized`** (se les seteó `airtable_address_id` = recId
  de la Casa nueva) para conservar su `id` y no duplicar.

---

## 🔄 Sincronización (Mirror Sync Pattern)

**Filosofía:** Airtable → DB en un solo sentido (lectura), con write-back controlado para pagos.

### Columnas estándar en tablas espejo:

- `active` (boolean) — true si está en Airtable actualmente  
- `last_synced_at` (timestamp) — última vez que se vio en sync  
- `archived_at` (timestamp) — cuando se marcó como inactivo

### Flags de modo defensivo:

- `DISABLE_ARCHIVE=true` (env) → no archiva registros que faltan, solo actualiza. Útil cuando hay dudas sobre completitud del fetch.  
- `WRITEBACK_SAFE_MODE=true` (env) → el write-back a Airtable (Pagos) usa `typecast: false` para no contaminar single-selects con valores inválidos.

### Sync sealing (regla):

- Cuando un fetch sube datos, marca `last_synced_at = now()`.  
- Registros con `last_synced_at` anterior al inicio del sync → se marcan `active=false, archived_at=now()`.  
- Si `DISABLE_ARCHIVE=true`, este paso se saltea.

### Cómo correr el sync (server-side, sin Docker)

El `pm-sync-airtable` se invoca por HTTP. Para autenticar como cron se usa la **secret key** del proyecto
(`sb_secret_...`, obtenible con `supabase projects api-keys --reveal`) en el header `Authorization: Bearer`
(la JWT legacy NO sirve: el secret `SUPABASE_SERVICE_ROLE_KEY` está en formato nuevo).

```shell
curl -s -X POST "https://nezbaljfhhyznhltpjnk.supabase.co/functions/v1/pm-sync-airtable" \
  -H "Authorization: Bearer sb_secret_..." -H "Content-Type: application/json" \
  -d '{"dry_run":false,"archive":false}'
```

- `dry_run:true` → no escribe (OJO: en dry_run el linking property→units/bookings/payments da 0 porque NO upsertea props primero; es artefacto, no bug).
- `archive:false` → no archiva (anti-wipe). `archive:true` → purga el residuo no visto este run.
- Cutover 2026-06-29: sync real verificado (21 props, 49 units, 81 tenants, 53 bookings, 275 pagos, 106 gastos) + purga del residuo de la base vieja (quedó `active=false`, recuperable).

---

## 🎨 Frontend (Property Manager)

**Archivos clave:**

- `pm/pm-main.js` (\~485 KB) — núcleo del PM: calendario, dedup, reservas, ocupación, dashboard, pagos, gastos, alertas. Todo el PM vive acá (NO existe `pm-dashboard.js`, aunque docs viejas lo mencionen).  
- `pm/pm-*.css` — estilos  
- `index.html` \+ `app.js` — shell de la aplicación, navegación  
- IDs hardcodeados de Airtable en `pm-main.js`: `PM_AIRTABLE_BASE` (base nueva) + table IDs en los links "Abrir en Airtable" (`pmAirtableLink`) + `PM_WARN_META`. Si cambia la base, actualizar los 3.

### Calendario (regla CRÍTICA dedup units)

**Cada habitación se muestra como una fila individual.** No se colapsan.

Para dedup de units (cuando hay duplicados activo+inactivo):

```javascript
// Score para elegir la unit "ganadora" en el dedup
score = (pmActiveBookingOf(x.id) ? 1000 : 0)
      + (x.is_active !== false ? 100 : 0)
      + ...
// Preferir: 1º la que tiene reserva activa, 2º la is_active=true
```

Bug conocido y fix:

- **`pmCollapseForCalendar(deduped)`** → bug: colapsaba habitaciones. Fix en commit `8a4b2e2`.  
- **Score de dedup elegía la vacía** en vez de la activa cuando había ambas → fix en commit `0b781a4`.

### Pagos en UI:

- Modal **"Marcar pago"** con campo observación (feedback de Carlos).  
- Filtros en Inquilinos.  
- Dedup de unidades en listados.

### Estados de pago (visual):

- **Pagado** (verde)  
- **Pendiente** (gris/amarillo)  
- **Por vencer** (rosa) — decisión: NO rojo, para no alarmar prematuramente  
- **Retrasado** (rojo)

---

## ⚡ Edge Functions clave

Todas en `supabase/functions/`:

| Función | Propósito | Notas |
| :---- | :---- | :---- |
| `pm-sync-airtable` | Sync principal Airtable → DB | El más crítico. v26+ (base nueva, linked records) |
| `pm-payment-writeback` | Write pagos → Airtable | Usa `WRITEBACK_SAFE_MODE` |
| `pm-alerts` | Genera alertas (pagos, contratos, ocupación) |  |
| `pm-daily-push`, `pm-daily-close`, `pm-weekly-review` | Cron jobs PM | Vercel Cron los dispara |
| `pm-group-report` | Reporte para grupo de WhatsApp |  |
| `pm-compute-performance` | KPIs del PM |  |
| `whatsapp-send`, `whatsapp-webhook`, `whatsapp-send-cloud` | Notificaciones WhatsApp |  |
| `clickup-execute`, `clickup-ai-agent`, `sync-clickup` | Integración ClickUp |  |
| `sync-education-airtable`, `edu-*` | Módulo educación | Universidad de Real Estate |
| `extract-appraisal`, `get-market-prices`, `deep-property-analysis`, `ai-deep-analyze`, `remodel-ai` | Análisis de propiedades (otro módulo) |  |

### Deploy de una edge function:

```shell
supabase functions deploy pm-sync-airtable
# o todas:
supabase functions deploy --no-verify-jwt
```

---

## 🗃️ Migraciones SQL importantes

Ubicación: `supabase/migrations/`

| Archivo | Qué hace |
| :---- | :---- |
| `2026-06-22-mirror-sync.sql` | Agrega columnas `active`, `last_synced_at`, `archived_at` a tablas principales |
| `2026-06-23-mirror-sync-aux-tables.sql` | Lo mismo para `pm_payroll`, `pm_credentials`, `pm_wifi_credentials`, `pm_tasks` |
| `2026-06-23-archive-dxc-bookings.sql` | Marcó obsoleto DxC bookings tras invertir mapeo |
| `2026-06-23-archive-ten-bookings.sql` | Diagnóstico de residuos booking-ten |
| `2026-06-25-address-norm.sql` | Pobla `address_normalized` \+ crea índice único parcial |

### Deploy de migraciones:

```shell
supabase db push  # aplica todas las migraciones pendientes al proyecto vinculado
```

---

## 🔧 Comandos comunes

### Desarrollo

```shell
# Trabajar en el repo
cd ~/Desktop/CLAUDE\ CODE/empresa-os

# Iniciar Claude Code
claude

# Pull cambios remotos
git pull origin main

# Ver últimos commits
git log --oneline -20
```

### Deploy

```shell
# Push a main = deploy automático en Vercel
git add . && git commit -m "tipo(scope): descripción" && git push origin main

# Deploy específico de una edge function
supabase functions deploy pm-sync-airtable

# Push de migraciones SQL
supabase db push
```

### Diagnóstico

```shell
# Ver edge functions activas
supabase functions list

# Ver proyectos vinculados
supabase projects list

# Logs de una edge function (últimas 24h)
supabase functions logs pm-sync-airtable
```

---

## 📝 Convenciones de commits

Formato: `tipo(scope): descripción`

**Tipos:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

**Scopes comunes:**

- `pm` — Property Manager  
- `edu` — Universidad de Real Estate  
- `remodel` — Remodel module  
- `viral` — Viral content app  
- `sync` — Sincronización Airtable  
- `auth` — Autenticación  
- `deploy` — Vercel/deploy config  
- `db` — Migraciones SQL

**Ejemplos:**

- `fix(pm): calendario dedup units prefiere activa con reserva`  
- `feat(sync): Airtable PAT server-side modal Sync sin pedir token`  
- `docs: README registro migración Mac nuevo`

---

## ✅ Checklist antes de cualquier cambio significativo

1. **Leer commits relacionados:** `git log --oneline --grep="palabra"`  
2. **Si toca `pm-main.js`:** verificar regla de dedup de units (no romper habitaciones individuales)  
3. **Si toca edge functions:** después del deploy, correr sync de prueba \+ verificar logs  
4. **Si toca migraciones SQL:** review cuidadoso, dry-run mental (qué pasa si la tabla está vacía? si tiene millones de filas?)  
5. **Si toca tokens / secrets:** confirmar que NO se commitean — `git diff --cached` antes de `git push`  
6. **Commits descriptivos:** `tipo(scope): qué cambió y por qué`  
7. **Push solo cuando el cambio está completo y testeado** — Vercel auto-deploya y rompe producción si está mal

---

## ⚠️ Cosas a EVITAR (lecciones aprendidas)

- ❌ **Hardcodear tokens** en cualquier archivo del repo  
- ❌ **Fuzzy matching de nombres** de inquilinos (mezcla personas distintas)  
- ❌ **Colapsar habitaciones** en el calendario (deben ser filas individuales)  
- ❌ **Borrar registros** de Airtable sin entender el flujo de sync  
- ❌ **Cambiar mapeo Airtable→DB** sin un plan de rollback (lo cambiamos varias veces, doloroso)  
- ❌ **Asumir que "21 registros procesados" \= "21 en DB"** — el dedup reduce a registros únicos  
- ❌ **Saltarse `WRITEBACK_SAFE_MODE`** al escribir pagos a Airtable (contamina single-selects)  
- ❌ **Asumir que `address_normalized` existe** — fue agregado en migración `2026-06-25`

---

## 📚 Documentación adicional del proyecto

En la carpeta `docs/cowork-context/` (cuando se migre del Mac viejo):

- `PM_AUDITORIA_LIVE_22JUN.md` — auditoría en vivo del PM  
- `CRONOGRAMAS_DIAGNOSTICO.md` — diagnóstico de cronogramas  
- `REPORTE_QA_LIVE_Y_FIX_FINAL.md` — reporte de QA y fixes  
- `PROMPTS_CLAUDE_CODE_EXITOSOS.md` — prompts que funcionaron bien  
- `PLAN_FINAL_PROPERTY_MANAGEMENT.md` — plan final del PM  
- `PLAN_MAESTRO_PROPERTY_MANAGEMENT.md` — plan maestro  
- `AUDITORIA_COMPLETA_AIRTABLE.md` — auditoría Airtable  
- `AUDITORIA_DATOS_CASA_TENANT.md` — auditoría datos DxC vs Tenant  
- `ARQUITECTURA_DATOS_PROPIEDADES.md` — arquitectura de datos  
- `COPIAR_Y_PEGAR_PASO_A_PASO.md` — runbook copiar-pegar  
- `DEPLOY_QA_FINAL.md` — checklist de deploy y QA

En la raíz del repo:

- `INFORME-3-SISTEMAS-FUNCIONANDO.md`  
- `INFORME-PPT-V2.md`  
- `PROPERTY-MANAGEMENT-SPEC.md`  
- `PM-COMO-CORRER.md`  
- `PM-AIRBNB-ICAL-COMO-CORRER.md`  
- `PM-AIRTABLE-SYNC-COMO-CORRER.md`  
- `PM-AIRTABLE-ANALISIS.md`

---

## 🎯 Estado (30 Jun 2026 — Solo-lectura + reportes + guía) · rama `feat/pm-reportes-mejoras`

- 🧹 **Sync limpio:** se eliminó el mapeo de la tabla **Tareas Mantenimiento** (borrada de Airtable). `pm_tasks` ahora es 100% app (auto-tareas). Tareas viejas `task-*` archivadas (active=false).
- 📊 **Ocupación exacta:** `pm_units` desde la tabla **Unidades** dedicada (status = Estado real Ocupada/Disponible/Reservada) + `target_rent` desde "Renta objetivo". El front lee `u.status` (pmUnitState).
- 🔢 **Regla de conteo de UNIDADES (dueño, jun 2026):** cada casa_completa=1, estudio=1, apto=1, y TODAS las habitaciones de la casa juntas=1 (6 hab=1). Ej: casa completa + 3 estudios = 4 (407 Capitol). Model-agnóstico, se calcula desde las unidades reales (`pmRentableUnitsOf`/`pmOccupiedRentableUnitsOf` en pm-main + `fetchWeeklyData` en el reporte). Equivale a Casas.Unidades de Airtable (`fldsr8FGN6y5OsaEr` → `pm_properties.total_units`, fallback). Ocupación (% y libres) usa la MISMA definición. El **calendario** sí muestra cada habitación como fila individual (no colapsa) — son cosas distintas.
- 🔒 **Read-only en 3 capas** (defensa de fondo): (1) guards que reemplazan las fns de escritura (`PM_RO_BLOCKED_FNS`), (2) barrido DOM que oculta botones, (3) `pmExecQuery` bloquea cualquier escritura a tablas espejo (`PM_RO_MIRROR_TABLES`); pm_tasks/pm_alerts/pm_data_warnings son capa propia y SÍ se escriben. Calendario con **pantalla completa** (`pmCalToggleFullscreen`) y scroll preservado al expandir casas (`pmPreserveScroll`).
- 📖 **App de SOLO-LECTURA:** módulo al final de `pm-main.js` (`PM_READONLY`) que (a) reemplaza las fns de escritura a datos-Airtable por un guard con toast y (b) barre `<button>` post-render para ocultarlos (`pmApplyReadOnlyDOM`, hook sobre `window.pmRender`). NO bloquea tareas/alertas (capa propia). Lista en `PM_RO_BLOCKED_FNS`.
- 🗑 **Tab Feeds eliminada** del PM.
- 🤖 **Auto-tareas** (en el sync, idempotentes por `external_id` `auto-clean-`/`auto-reception-` con `ignoreDuplicates`): Reserva Histórica→**limpieza/turnover** (task_type `cleaning`); Activa/Reservada con entrada próxima→**recepción** (task_type `recepcion`). Ventanas: clean check-out [-14,+1]d, recepción check-in [-3,+7]d.
- 📄 **Reportes PDF (impresión del navegador = chromium real del usuario):**
  - `api/pm-report.mjs` (`?type=weekly|monthly&month=YYYY-MM&format=html|pdf&send=email|whatsapp&to=`) — auth: service key o JWT de usuario (`api/_pm-auth.mjs`, valida con anon key).
  - **El front pide `format=html` y dispara "Guardar como PDF" del navegador** (`pmPrintReportHTML`). El render chromium serverless (`@sparticuz/chromium`) FALLA en Vercel por `libnss3.so` → NO se usa para la app; `format=pdf` queda best-effort.
  - Datos `api/_pm-report-data.mjs` (lee con service key si está, si no con JWT del usuario+RLS), diseño `api/_pm-report-templates.mjs` (branding Ever Home).
  - Crons `report-weekly` (lun 13:00 UTC) + `report-monthly` (día 1) → envían **email HTML / resumen WhatsApp** (sin chromium). En `vercel.json`.
  - Front: tab Finanzas → "Generar semanal/mensual" + "Enviar ›" (`pmOpenReport`/`pmSendReport`).
- 🏠 **Guía de Bienvenida:** `api/pm-welcome-guide.mjs?property_id=&unit_id=` (mismo patrón print). Botón en ficha de Casa. WiFi + keypad desde `pm_properties.access_code` (col nueva, migración `20260630020000`, sync mapea Casas `fldKuVpYVzh7JzRP8`) con fallback parse de `pm_units.access_codes`.
- 📤 **Envío** `api/_pm-send.mjs`: email=Resend (`RESEND_API_KEY`) con el HTML como cuerpo; WhatsApp=texto vía `whatsapp-send`. Sin PDF adjunto (no hay chromium server). Env: `REPORT_EMAIL_TO`/`REPORT_WHATSAPP_TO`.
- ⚠️ **PENDIENTE Vercel (para crons + datos completos):** setear **`SUPABASE_SERVICE_ROLE_KEY`** (el `sb_secret_...`) en Vercel env — NUNCA estuvo seteada (los crons `sync-airtable`/alertas tampoco corrían). Con eso: reportes leen completo (sin RLS), crons y sync diario funcionan. Para envío real: `RESEND_API_KEY`, `REPORT_EMAIL_TO`/`REPORT_WHATSAPP_TO` (+ tokens WhatsApp Cloud).
- Demo local de los 3 PDFs: `OUT=/tmp SUPABASE_SERVICE_ROLE_KEY=... node scripts/demo-pdfs.mjs` (usa Chrome local).

## 🎯 Estado anterior (29 Jun 2026 — Cutover base nueva)

- ✅ **Cutover a base Airtable nueva `apptTKRYbx6gu701i`** (commit `2983a74`). Esquema limpio con linked records, sin fuzzy.
- ✅ `pm-sync-airtable` remapeada y deployada (v26). Pagos resueltos por linked record IDs.
- ✅ Sync real + purga del residuo viejo corridos y verificados (solo data nueva activa).
- ✅ Front (`pm-main.js`) apuntando a la base nueva, pusheado a main.
- ✅ Property Manager funcionando, calendario con habitaciones individuales + dedup.
- ✅ Viral content generation app deployed en `/viral`.

**Pendientes conocidos:**

- ⏳ Setear secret `AIRTABLE_BASE_ID=apptTKRYbx6gu701i` en Supabase (hoy el código usa el default; el secret no está seteado).
- ⏳ Validar las 6 secciones del PM en la UI con la data nueva.
- Carlos: completar enlaces (Casa/Inquilino/Reserva) en Pagos sin link y Fechas de Entrada faltantes en Reservas (ver alertas de datos).
- Twilio SMS + WhatsApp integration completa (backlog).
- Posible refactor de `pm-main.js` (485KB, modularizar).

---

## 🤖 Instrucciones para Claude

Cuando arranques una sesión en este repo:

1. **Leé este archivo completo primero.** Es la fuente de verdad para decisiones técnicas.  
2. **Si vas a hacer cambios:** mostrá el plan ANTES de tocar nada. Confirmá comprensión de las reglas críticas.  
3. **Si descubrís algo nuevo importante:** actualizá este archivo antes de cerrar la sesión.  
4. **Si encontrás contradicciones** entre este archivo y el código actual: pregntá al usuario qué prevalece antes de hacer cambios.  
5. **Idioma:** español rioplatense informal. Directo, claro, sin floritura.  
6. **Estilo de trabajo:** proactivo. Todo el PM vive en `pm-main.js` (no hay `pm-dashboard.js`). Si vas a tocar una edge function, verificá quién la llama.  
7. **Antes de commits/push:** mostrá el diff y pedí confirmación si el cambio toca producción.

---

*Última actualización: 29 Jun 2026 — Cutover a base Airtable nueva `apptTKRYbx6gu701i` (linked records, sin fuzzy)*  
