# 🔄 Sync Airtable ↔ PM · Cómo activarlo

**Lo que hay:** Edge Function `pm-sync-airtable` que jala las 10 tablas de tu Airtable y las mete a las tablas `pm_*` de Supabase. Idempotente (usa `external_id` para no duplicar).

---

## 🚀 Pasos para activarlo (5 min)

### Paso 1 — Correr el schema v2 en Supabase

1. Supabase SQL Editor → pegá `supabase/pm-schema-v2.sql` → Run
2. Esto agrega:
   - **Columnas nuevas** a `pm_properties` (zone, wifi_name, wifi_pass, drive_url)
   - **Columnas nuevas** a `pm_units` (bath_type, access_codes, decoration, maintenance_status, drive_url)
   - **Columnas nuevas** a `pm_bookings` (platform_account, contract_status, is_assistance_program, followup)
   - **Columnas nuevas** a `pm_tenants` (client_state, ai_summary)
   - **3 tablas nuevas**: `pm_credentials`, `pm_tasks`, `pm_interactions`
   - **1 tabla de logs**: `pm_sync_log`
   - **UNIQUE constraints** en `external_id` para upsert idempotente

Verificá:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'pm_properties' AND column_name IN ('zone','wifi_name');
-- Debe devolver 2 filas

SELECT COUNT(*) FROM pm_credentials;  -- 0 (tabla vacía recién creada)
SELECT COUNT(*) FROM pm_tasks;        -- 0
```

### Paso 2 — Crear el Airtable Personal Access Token

1. Abrí https://airtable.com/create/tokens
2. Click **+ Create new token**
3. Nombre: `Empresa OS PM Sync`
4. **Scopes** (marcá los dos):
   - ✅ `data.records:read`
   - ✅ `schema.bases:read`
5. **Access** → Add base → Buscá tu base **"Datos rentas"** (ID: `appzEnsuy4qPT6iHj`)
6. Click **Create token**
7. **Copialo** (no lo vas a poder ver de nuevo)

### Paso 3 — Push del código + deploy

```bash
cd "/Users/nicolara/Desktop/CLAUDE CODE/empresa-os"

git add pm/pm-main.js supabase/pm-schema-v2.sql supabase/functions/pm-sync-airtable PM-AIRTABLE-ANALISIS.md PM-AIRTABLE-SYNC-COMO-CORRER.md
git commit -m "PM: schema v2 + Edge Function sync Airtable + UI"
git push

# Deploy de la Edge Function
npx supabase functions deploy pm-sync-airtable --project-ref nezbaljfhhyznhltpjnk
```

### Paso 4 — Sync de prueba (dry run)

1. Hard refresh en la app (Cmd+Shift+R)
2. Abrir **Empresa OS → Rentas / Property Mgmt → Property Management**
3. Tab **🏘️ Propiedades** → botón **📥 Importar de Airtable** (ahora se llama "Sync Airtable")
4. Pegá tu token en el campo
5. El Base ID ya viene precargado: `appzEnsuy4qPT6iHj`
6. Click **🧪 Dry run** — esto simula sin escribir nada
7. Esperá 30-90 segundos
8. Vas a ver un resumen tipo:
   ```
   Propiedades: 18
   Unidades: 52
   Inquilinos: 54
   Reservas: 52
   Ingresos: XX
   Gastos: XX
   Accesos: XX
   Tareas: XX
   ```

### Paso 5 — Sync real

1. Volvé a abrir el modal
2. Click **🔄 Sync ahora** (esta vez sí escribe a la DB)
3. Después de los 30-90s, el sistema se llena automático
4. Ya podés navegar Propiedades, Calendario, Reservas, Finanzas

---

## 🔍 Qué hace la Edge Function paso a paso

1. **Lee `Datos x Casa`** → crea **18 propiedades** únicas (deduplicadas por dirección)
2. **Crea 52 unidades** (1 por fila), asociadas a su propiedad
3. **Lee `Base de datos Tenant`** → crea **54 inquilinos** con sus datos completos
4. **Crea 52 bookings** asociando unit + tenant + fechas + monto + status
5. **Lee `Pagos Rentas`** → inserta ingresos en `pm_payments`
6. **Lee `Gastos por casa`** → inserta gastos en `pm_payments`
7. **Lee `Acceso a plataforma`** → crea credenciales en `pm_credentials`
8. **Lee `Cuentas de wifi`** → enriquece `pm_properties` con wifi_name/pass
9. **Lee `Cronograma Tareas Juan Austin`** → crea tareas en `pm_tasks`

**Todo es idempotente:** si volvés a sincronizar, NO duplica. Updatea lo que cambió.

---

## ⚠️ Si algo falla

| Error | Causa | Fix |
|---|---|---|
| `HTTP 401: invalid token` | Token mal copiado o sin scopes | Recreá el token con los 2 scopes requeridos |
| `HTTP 403: NOT_AUTHORIZED` | El token no tiene acceso a la base | Agregá la base "Datos rentas" en el token |
| `properties: duplicate key` | Schema v2 no se corrió | Ejecutá `pm-schema-v2.sql` primero |
| `Function timeout` | Demasiados records | Correrlo una sola vez es OK; los chunks ya están |
| Sync OK pero no veo datos | Cache | Hard refresh + click en otra tab y volver |

Para diagnóstico, revisá el log:
```sql
SELECT * FROM pm_sync_log ORDER BY started_at DESC LIMIT 5;
```

---

## 📅 Sync programado (opcional, después)

Cuando esto funcione, podemos:
- Agregarlo a `scheduled-tasks` para que corra cada noche automático
- O agregarlo a un cron de Supabase (`pg_cron`)
- Te aviso por WhatsApp si algo falla

Pero por ahora, **manual con el botón** es lo más controlable.

---

## 🎯 Después del primer sync exitoso

Te vas a encontrar con:
- ✅ 18 propiedades cargadas con toda su info
- ✅ 52 unidades con tipo (habitación/estudio/etc) + rent + bath_type
- ✅ 54 inquilinos con teléfono + método de pago
- ✅ 52 reservas activas con fechas y montos
- ✅ Calendario tipo Airbnb mostrando ocupación real de las 52 unidades
- ✅ Finanzas con ingresos/gastos históricos (si tenés esa data cargada)
- ✅ Vault con tus credenciales (Gmail, Booking, etc.)
- ✅ Tareas de Juan Austin sincronizadas

Y a partir de ahí podés:
- Seguir editando en Airtable (tu equipo) y resync periódico
- O migrar 100% al sistema y dejar Airtable como histórico
