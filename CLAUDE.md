# CLAUDE.md — Empresa OS (Rental Profits)

Este archivo es la **memoria persistente** del proyecto para Claude (Claude Code, Claude Desktop, Cowork). Léelo siempre al iniciar una sesión. Mantenelo actualizado con cada decisión técnica importante.

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
  - PostgreSQL para data  
  - Edge Functions (Deno runtime) para lógica server-side y sincronización  
  - Storage para archivos  
  - Auth para login (Magic Link)  
- **Source of truth:** Airtable (base `appzEnsuy4qPT6iHj` — "Empresa Rentas")  
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

Este mapeo cambió varias veces durante el desarrollo. **Decisión final (vigente):**

| Tabla DB (Supabase) | Fuente Airtable | Notas |
| :---- | :---- | :---- |
| `pm_properties` | DxC (Datos por Casa) | Address único, dedup por `address_normalized` |
| `pm_units` | DxC | Cada habitación/unidad es una fila individual |
| `pm_bookings` | DxC | Reservas activas e históricas |
| `pm_tenants` | **Tenant** (Base de datos Tenant) | NO híbrido — solo desde Tenant. No fuzzy matching: siempre nombre \+ apellido completos |
| `pm_payments` | Pagos Rentas | Estado: Pagado, Pendiente, Por vencer, Retrasado |
| `gastos` | 4 sources | Combinación de varias tablas Airtable |
| `pm_payroll`, `pm_credentials`, `pm_wifi_credentials`, `pm_tasks` | Tablas dedicadas en Airtable | Mirror sync |

### Tabla `Tenant` para Inquilinos (decisión final)

- **NO usar híbrido (DxC \+ Tenant).** Solo Tenant es la fuente.  
- Carlos debe mantener nombres+apellidos correctos en Airtable Tenant.  
- No hay fuzzy matching automático para evitar mezclar inquilinos distintos con nombres parecidos.

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

---

## 🎨 Frontend (Property Manager)

**Archivos clave:**

- `pm/pm-main.js` (\~485 KB) — núcleo del PM: calendario, dedup, reservas, ocupación  
- `pm/pm-dashboard.js` — dashboard  
- `pm/pm-*.css` — estilos  
- `index.html` \+ `app.js` — shell de la aplicación, navegación

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
| `pm-sync-airtable` | Sync principal Airtable → DB | El más crítico. v24+ |
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

## 🎯 Estado actual del proyecto (28 Jun 2026\)

- ✅ Migración a Mac nuevo completada (commit `ec8d5d3`)  
- ✅ Property Manager funcionando con todos los fixes de la semana  
- ✅ Calendario con habitaciones individuales \+ dedup correcto  
- ✅ Token Airtable server-side (Carlos no pasta token cada vez)  
- ✅ Mirror sync defensivo activo  
- ✅ Write-back de pagos en safe mode  
- ✅ 18 propiedades activas, dedup correcto por `address_normalized`  
- ✅ Viral content generation app deployed en `/viral`

**Pendientes conocidos (no urgentes):**

- Twilio SMS \+ WhatsApp integration completa (Task \#3 backlog)  
- Carlos manual cleanup de Airtable Tenant nombres  
- Posible refactor de `pm-main.js` (485KB es grande, modularizar)

---

## 🤖 Instrucciones para Claude

Cuando arranques una sesión en este repo:

1. **Leé este archivo completo primero.** Es la fuente de verdad para decisiones técnicas.  
2. **Si vas a hacer cambios:** mostrá el plan ANTES de tocar nada. Confirmá comprensión de las reglas críticas.  
3. **Si descubrís algo nuevo importante:** actualizá este archivo antes de cerrar la sesión.  
4. **Si encontrás contradicciones** entre este archivo y el código actual: pregntá al usuario qué prevalece antes de hacer cambios.  
5. **Idioma:** español rioplatense informal. Directo, claro, sin floritura.  
6. **Estilo de trabajo:** proactivo. Si vas a tocar pm-main.js, leé pm-dashboard.js también. Si vas a tocar una edge function, verificá quién la llama.  
7. **Antes de commits/push:** mostrá el diff y pedí confirmación si el cambio toca producción.

---

*Última actualización: 28 Jun 2026 — Migración Mac nuevo*  
