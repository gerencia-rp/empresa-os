# Property Manager — MIRROR SYNC desde Airtable

La app es un **espejo declarativo** de Airtable. Lo que está en Airtable es la verdad;
cada sync agrega/edita/archiva en `pm_*` sin pasos manuales ni fantasmas.

## Mapeo oficial (NO mezclar fuentes)

| Módulo app    | Tabla Airtable                         | Llave estable en `pm_*`                 |
|---------------|----------------------------------------|-----------------------------------------|
| 🏠 Propiedades | Datos x Casa (`tblbSJ4K8e7mSHT5E`)     | `airtable_address_id` = option_id de "Dirección" |
| 📅 Calendario  | Base de datos Tenant (`tblxEHBbGylH1aF2F`) | `external_id` (`booking-ten-<recid>`) |
| 🏡 Reservas    | Base de datos Tenant (misma)           | `external_id` (`booking-ten-<recid>`)   |
| 👥 Inquilinos  | Base de datos Tenant (misma)           | `external_id` (`tenant-at-<recid>`)     |
| 💰 Pagos       | Pagos Rentas (`tblqJlSgnLNfn34dh`)     | `external_id` (`pay-<recid>`)           |
| 💸 Gastos      | Gastos por Casa (`tblsihpE31f116RCR`)  | `external_id` (`exp-house-<recid>`)     |
| (interno) Unidades | Datos x Casa (derivadas)           | `external_id` (`unit-<dir>-<tipo>`, **deduplicada**) |

> `external_id` es la llave estable record-id (equivale al `airtable_record_id` del spec,
> con prefijo por tabla). Se reutiliza en vez de crear una columna nueva.

## Llaves estables
Editar texto/monto/cualquier campo en Airtable **no** cambia el id → el sync actualiza la
fila existente, nunca duplica ni pierde historia.

## Lógica del mirror (por tabla)
1. Leer **todos** los records de la tabla Airtable (paginado).
2. `upsert ON CONFLICT (llave) DO UPDATE` con todos los campos + `active=true`,
   `archived_at=NULL`, `last_synced_at=nowISO`.
3. **Soft-delete**: las filas con llave de Airtable que NO se vieron en este run
   (`last_synced_at <> nowISO`) → `active=false`, `archived_at=now()`.
   - Nunca toca registros **manuales** (sin `external_id`/`airtable_address_id`).
   - Propiedades además pasan a `status=inactiva` (el front filtra por status).
4. Reaparece en Airtable → `active=true` automáticamente.
5. **Hard delete PROHIBIDO** (se preservan bookings/payments/expenses históricos).

## Propiedades (caso especial)
- Options del select "Dirección" leídas por **Meta API** (captura opciones aún sin filas).
- `address` = `.name` LITERAL del option. Nunca transformar/recortar/normalizar.
- Conteos derivados de las filas agrupadas por sel_id:
  `cantidad_estudios/aptos` (tipos distintos), `rentada_por_habitaciones`,
  `cantidad_casa_completa` → alimentan `pm_calc_rentable_units()`.
- SOLO `syncProperties` crea propiedades. Tenant/Pagos/Gastos hacen **lookup** por `property_id`.

## Frontend
- Todos los listados/conteos filtran `active=true` (unidades: `is_active`) por defecto.
- Toggle **"📦 Mostrar archivados"** (`pmToggleArchived`) re-filtra sin recargar.
- Detalle de propiedad archivada muestra banner con `archived_at`.

## Fallback / idempotencia
- Si la migración `2026-06-22-mirror-sync.sql` no se aplicó, el sync detecta columnas
  ausentes (`MIRROR=false`) y corre como antes (sin romper el deploy).
- Correr el sync 2 veces no duplica ni rompe nada.

## Migraciones SQL relacionadas (orden)
1. `pm-rental-model.sql` (rental_model + vista rentable)
2. `pm-units-rule.sql` (campos numéricos + `pm_calc_rentable_units`)
3. `pm-data-sources-fix.sql` (pagos UNIQUE; limpieza direcciones)
4. `pm-properties-mirror.sql` (`airtable_address_id` + `active`)
5. `migrations/2026-06-22-mirror-sync.sql` (mirror cols en todas las tablas)
