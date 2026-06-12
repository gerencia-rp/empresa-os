# 🏠 Property Management · MVP listo · Cómo correr

**Fecha:** 12 jun 2026
**Estado:** Fase 1 + Calendario funcional

---

## ✅ Lo que ya está armado

### Backend (SQL)
- **5 tablas**: `pm_properties`, `pm_units`, `pm_tenants`, `pm_bookings`, `pm_payments`
- **2 vistas**: `pm_unit_occupancy`, `pm_monthly_finance`
- **RLS** abierto a authenticated
- Soporta: casa completa · por habitaciones · por estudios · por apartamentos · mixto

### Frontend
Un módulo nuevo en `pm/pm-main.js` con 4 tabs:

1. **🏘️ Propiedades** — grid de cards con KPIs por propiedad. Click → detalle con:
   - Calendario tipo Airbnb (timeline anual de esa casa)
   - Desglose de unidades agrupadas por tipo (casa completa / habitaciones / estudios / apartamentos)
   - Botones para agregar/editar unidades y reservas

2. **📅 Calendario** — vista general de todas las propiedades:
   - Timeline anual por propiedad (todas las unidades agrupadas)
   - Filtro por propiedad (drop-down)
   - Navegación de años
   - Cada barra colorada por tipo de booking: 🟢 contrato directo, 🔴 Airbnb, 🔵 Booking, 🟣 VRBO, 🩵 Hospitable
   - Marca de "hoy" en rojo vertical
   - Hover sobre barra: tooltip con inquilino + fechas + $
   - Click sobre barra: editar reserva

3. **📋 Reservas** — lista de todas las bookings:
   - Actuales/futuras arriba
   - Pasadas/finalizadas abajo (con opacity)
   - Color-coded por tipo
   - Click → editar

4. **💰 Finanzas** — ingresos/gastos/utilidad:
   - 3 KPIs hero
   - Tabla "Rendimiento por propiedad" (ranking)
   - Últimos 50 movimientos
   - Botones + Ingreso / + Gasto

### CRUD completo
Propiedades, Unidades, Reservas, Inquilinos, Pagos — todos con modales para crear/editar/eliminar.

### Importar de Airtable
Botón **📥 Importar de Airtable** en el tab Propiedades. Acepta JSON pegado a mano. Para la conexión directa con API necesito tu API key + Base ID (lo hacemos cuando estés listo).

---

## 🚀 3 pasos para que ande

### Paso 1 — Correr el schema SQL en Supabase

1. Supabase Dashboard → SQL Editor
2. Pegá el contenido de `supabase/pm-schema.sql`
3. Run

Verificá con:
```sql
SELECT COUNT(*) FROM pm_properties;
SELECT COUNT(*) FROM pm_units;
```
Tienen que devolver `0` cada uno (tablas creadas pero vacías).

### Paso 2 — Registrar el sistema en el dashboard

1. SQL Editor → pegá `supabase/pm-register-system.sql` → Run
2. Esto crea el área "Rentas · Property Management" y el sistema "Property Management" dentro.

Verificá:
```sql
SELECT * FROM systems WHERE type = 'pm-rental-mgmt';
```

### Paso 3 — Push del frontend

```bash
cd "/Users/nicolara/Desktop/CLAUDE CODE/empresa-os"
git add pm/ index.html app.js supabase/pm-schema.sql supabase/pm-register-system.sql PM-COMO-CORRER.md PROPERTY-MANAGEMENT-SPEC.md
git commit -m "Módulo Property Management MVP: propiedades + calendario + reservas + finanzas"
git push
```

Esperá ~30s al deploy de Vercel.

---

## 🎬 Cómo usarlo

1. Abrí Empresa OS
2. Vas a ver una nueva área: **🏠 Rentas · Property Management**
3. Click en el sistema "Property Management"
4. Se abre el modal con los 4 tabs

### Para arrancar a cargar datos:

**Opción A · Carga manual (rápido para 1-2 propiedades de prueba)**
- Tab Propiedades → + Nueva Propiedad
- Llená nombre, modelo de renta, dirección
- Guardás
- Click en la card → entrás al detalle
- + Unidad para agregar las habitaciones/estudios/etc.
- + Reserva por cada inquilino que ya tenés

**Opción B · Importar de Airtable (para tus 17 propiedades de una)**
- Tab Propiedades → 📥 Importar de Airtable
- En Airtable: exportá la tabla como CSV o copiá los registros como JSON
- Pegá el JSON en el modal
- El sistema acepta estos campos (alias soportados):
  - `name` / `Name` / `nombre` *(obligatorio)*
  - `address` / `Address` / `direccion`
  - `city` / `ciudad`
  - `state` / `estado`
  - `zip` / `codigo_postal`
  - `rental_model` / `modelo` (valores: `casa_completa`, `por_habitaciones`, `por_estudios`, `por_apartamentos`, `mixto`)
  - `total_rooms` / `habitaciones` / `rooms`
  - `total_baths` / `banos` / `baths`
  - `total_studios` / `estudios`
  - `sqft`
  - `notes` / `notas`
  - `id` / `airtable_id` (guarda como `external_id`)

Ejemplo de JSON pegable:
```json
[
  {"name":"4916 Barkbridge Trail","address":"4916 Barkbridge Trail, Austin TX 78744","rental_model":"por_habitaciones","total_rooms":5,"total_baths":2,"sqft":1200},
  {"name":"2315 Dove Springs Drive","address":"2315 Dove Springs Drive, Austin","rental_model":"por_habitaciones","total_rooms":5,"total_baths":3},
  {"name":"1100 Echo Ln","address":"1100 Echo Ln, Austin TX 78745","rental_model":"casa_completa","total_rooms":6,"total_baths":4}
]
```

---

## 🔌 Cuando estés listo · conectar Airtable directo

Para evitar el copy-paste, hacemos una **Edge Function** que jala las propiedades automáticamente desde tu Airtable. Necesito:

1. **API Key de Airtable** (https://airtable.com/account → Personal access tokens)
2. **Base ID** (la URL de tu base tiene el formato `airtable.com/appXXXXXXXXXXXX/...` — el `appXXX` es el Base ID)
3. **Nombres de las tablas** en Airtable (probablemente "Propiedades", "Inquilinos", etc.)

Con eso te armo:
- Edge function que jala cada hora
- Mapeo entre campos de Airtable y campos de tu DB
- Botón "🔄 Sync ahora" en el frontend

---

## 📌 Lo que queda para fases siguientes

Esto es Fase 1+1.5 (Propiedades + Calendario + Reservas + Finanzas básicas). Quedan estas mejoras para más adelante:

| Feature | Prio | Esfuerzo |
|---|---|---|
| 🚨 Centro de alertas (vencimientos, baja ocupación, pagos atrasados) | Alta | 1 día |
| 📅 Tareas Kanban (seguimientos, cobros) | Alta | 1 día |
| 💬 Botón WhatsApp por inquilino con templates | Alta | 0.5 día |
| 📊 Tab Mensual con tabla pivot propiedad×mes | Media | 1 día |
| 🔄 Sync Airtable automático | Media | 1 día |
| 📍 Tours / visitas agendadas | Media | 1 día |
| 📦 Activos fijos por propiedad | Baja | 1 día |
| 🔑 Vault de credenciales | Baja | 1 día |
| 🌐 Sync iCal con Airbnb/Booking | Baja | 2 días |
| 📄 Generador de contratos PDF | Baja | 2 días |

---

## 🆘 Si algo falla

| Síntoma | Causa | Fix |
|---|---|---|
| "Cargando datos..." infinito | Schema SQL no corrió | Correr `pm-schema.sql` |
| No aparece área "Rentas" en dashboard | Sistema no registrado | Correr `pm-register-system.sql` |
| "openPmSystem is not defined" | JS no cargado | Hard refresh (Cmd+Shift+R) |
| Error al guardar propiedad | RLS | Verificá que sesión esté activa, sino volvé a loguearte |
| El timeline del calendario sale vacío | Sin bookings con fechas en ese año | Cargá al menos 1 reserva con start_date dentro del año |

---

**Ya está todo. Cuando lo pruebes y veas qué cambiarías, me decís y refinamos.**
