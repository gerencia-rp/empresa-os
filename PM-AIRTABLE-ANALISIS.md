# 🔍 Airtable de Rentas · Análisis completo y cruce con nuestro sistema PM

**Base Airtable:** `appzEnsuy4qPT6iHj` · "Datos rentas"
**Fecha:** 12 jun 2026
**Estado:** análisis listo, pendiente migración

---

## 1 · Lo que hay en Airtable (10 tablas)

| # | Tabla | Records | Función | Mapeo a nuestro PM |
|---|---|---|---|---|
| 1 | **Datos x Casa** | 52 | Cada fila = 1 unidad con su inquilino actual | `pm_properties` + `pm_units` + `pm_bookings` |
| 2 | **Base de datos Tenant** | 54 | Inquilinos con contratos | `pm_tenants` + `pm_bookings` |
| 3 | **Acceso a plataforma** | ? | Vault de credenciales | `pm_credentials` (nuevo) |
| 4 | **Cuentas de wifi** | ? | Wifi por casa | Metadata de `pm_properties` |
| 5 | **Pagos Rentas** | ? | Pagos recibidos | `pm_payments` (type=ingreso) |
| 6 | **Gastos por casa** | ? | Gastos operativos | `pm_payments` (type=gasto) |
| 7 | **Gastos por Plataforma** | ? | Fees Airbnb/Booking | `pm_payments` (type=gasto, cat=plataforma) |
| 8 | **Gastos Equipo** | ? | Salarios | `pm_payments` (type=gasto, cat=equipo) |
| 9 | **Gastos Aseo y Podada** | ? | Limpieza | `pm_payments` (type=gasto, cat=aseo) |
| 10 | **Cronograma Tareas Juan Austin** | ? | Tareas operativas | `pm_tasks` (nuevo) |

---

## 2 · 18 propiedades únicas detectadas

| # | Propiedad | Modelo de renta | Ubicación |
|---|---|---|---|
| 1 | 4916 Barkbridge Trail 78744 | Mixto (Casa Completa + 4 habs) | Sur |
| 2 | 2315 Dove Springs Drive 78744 | Renta por habitaciones (5 habs) | Sur |
| 3 | 9909 Childress Drive 78753 | Renta por habitaciones (6 habs) | Norte |
| 4 | 4905 Nesting Way 78744 | Renta tradicional (Casa Completa) | Sur |
| 5 | 407 Capitol Dr 78753 | Renta por estudios (3 estudios + casa completa) | Norte |
| 6 | 5003 Michelle Court 78744 | Renta tradicional | Sur |
| 7 | 1100 Echo Ln 78745 | Renta tradicional | Sur |
| 8 | 5702 Meadow Crest 78744 | Renta tradicional | Sur |
| 9 | 6504 Stonleigh 78744 | Renta por habitaciones (5 habs) | Sur |
| 10 | 1607 Picnic 78664 | Mixto (Casa + 2 estudios) | Norte |
| 11 | 406 Capps St, Marlin, TX 76661 | Renta tradicional | Marlin |
| 12 | 311 Bartlett St, Marlin, TX 76661 | Renta tradicional | Marlin |
| 13 | 1302 Garden Path Dr, Round Rock 78664 | Renta por apartamentos (4 unidades) | Norte |
| 14 | 512 Bramble Dr, Austin 78745 | Mixto (3 unidades) | Sur |
| 15 | 902 Virginia Dr, Round Rock 78664 | Renta tradicional | Norte |
| 16 | 6203 Shadow Bend, Austin 78745 | Renta por estudios + apartamentos | Sur |
| 17 | 7105 Bethune Ave, Austin 78752 | Renta por apartamentos (4 aparts) — en Mantenimiento | Norte |
| 18 | 6107 Idlewood Cove, Austin 78745 | Renta tradicional | Sur |

---

## 3 · Conceptos clave que voy a mapear

### Estados de unidad
- `OCUPADA` → bookings.status = 'activo'
- `Reservado` → bookings.status = 'confirmado'
- `DISPONIBLE` → sin booking activo
- `Mantenimiento` → unit.is_active = false + tag mantenimiento

### Modelos de negocio (en Airtable)
- Renta Tradicional → `casa_completa`
- Renta por habitaciones → `habitacion`
- Renta por estudios → `estudio`
- Renta por Apartamentos → `apartamento`
- Programas de ayuda → categoría especial (Section 8 / housing assistance)

### Fuentes / canales
- Directo → `contrato_directo`
- Airbnb → `airbnb` (con subaccounts: lucasbeltran0225@, danilara@)
- Padsplit → `padsplit` (cuenta gerencia@rentalprofitss.com)
- Booking → `booking`

### Tiempos de pago
- "4 semanas" → mensual (cada 4 semanas)
- "2 semanas" → quincenal
- "Airbnb" → estadía completa
- "Padsplit" → quincenal/biweekly (típico)
- "Primer día de cada mes" → mensual
- "Primeros 3 dias" → mensual con grace
- "Estadía Completa" → reserva corta

### Métodos de pago
- Cash · Zelle · Cheque · Cash App · Airbnb (auto) · Padsplit (auto)

---

## 4 · Lo que el sistema PM YA soporta vs lo que falta

| Concepto Airtable | Nuestro PM ya tiene | Falta agregar |
|---|---|---|
| Propiedades con ubicación, sqft, modelo | ✅ pm_properties | ➕ campo `zone` (Norte/Sur/Marlin) |
| Unidades (habs/estudios/aparts/casa completa) | ✅ pm_units con unit_type | ✅ |
| Tipo de baño (compartido/privado) | ❌ | ➕ `unit.bath_type` |
| Estado del inquilino (activo/pasado) | ✅ pm_tenants implícito | ✅ |
| Bookings con fechas + monto | ✅ pm_bookings | ✅ |
| Depósito | ✅ pm_bookings.deposit | ✅ |
| Fuente (Directo/Airbnb/Padsplit/Booking) | ✅ pm_bookings.booking_type | ➕ Padsplit como opción |
| Sub-cuenta Airbnb (lucasbeltran/danilara) | ❌ | ➕ `booking.platform_account` |
| Métodos de pago (Zelle/Cash/etc) | ✅ pm_payments.payment_method | ✅ |
| Tiempos de pago (4 semanas/15/etc) | ✅ pm_bookings.payment_day | ✅ |
| Drive links de contratos | ✅ pm_bookings.contract_url | ✅ |
| Accesos (códigos de puerta) | ❌ | ➕ `unit.access_codes` |
| Wifi por casa | ❌ | ➕ `property.wifi_name` + `wifi_pass` |
| Observaciones | ✅ multiple `notes` fields | ✅ |
| Comentarios estado de firma | ❌ | ➕ `booking.contract_status` enum |
| Seguimiento Text Now | ❌ | ➕ `pm_interactions` (tabla nueva tipo CRM) |
| **Programas de ayuda** (Section 8) | ❌ | ➕ `booking.is_assistance_program` boolean |
| Categorías de gastos (jardinería, equipo, etc) | ✅ pm_payments.category | ✅ |
| Comprobantes adjuntos | ❌ | ➕ `pm_payments.attachment_url` (ya está) |
| **Tareas (Cronograma Juan Austin)** | ❌ | ➕ `pm_tasks` (nuevo) |
| **Vault de credenciales** | ❌ | ➕ `pm_credentials` (nuevo) |

---

## 5 · Plan de migración en 3 fases

### 🟢 FASE 1 — Esta sesión: agregar lo que falta al schema + script de migración

**1.1 Schema PM v2 — agregar columnas/tablas:**

```sql
-- A pm_properties
ALTER TABLE pm_properties
  ADD COLUMN IF NOT EXISTS zone TEXT,                -- 'norte','sur','marlin','round_rock'
  ADD COLUMN IF NOT EXISTS wifi_name TEXT,
  ADD COLUMN IF NOT EXISTS wifi_pass TEXT,
  ADD COLUMN IF NOT EXISTS drive_url TEXT;

-- A pm_units
ALTER TABLE pm_units
  ADD COLUMN IF NOT EXISTS bath_type TEXT,           -- 'privado','compartido','mixto'
  ADD COLUMN IF NOT EXISTS access_codes TEXT,        -- "Casa: 1720, Hab: Llaves"
  ADD COLUMN IF NOT EXISTS rooms INT,
  ADD COLUMN IF NOT EXISTS decoration TEXT,
  ADD COLUMN IF NOT EXISTS maintenance_status TEXT;  -- 'ok','en_mantenimiento','por_reparar'

-- A pm_bookings
ALTER TABLE pm_bookings
  ADD COLUMN IF NOT EXISTS platform_account TEXT,    -- 'lucasbeltran0225@gmail.com'
  ADD COLUMN IF NOT EXISTS contract_status TEXT,     -- 'pendiente_firma','firmado','sin_contrato','vencido'
  ADD COLUMN IF NOT EXISTS is_assistance_program BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS source_followup TEXT,     -- "Text Now Recordatorio 1"
  ADD COLUMN IF NOT EXISTS last_followup_at DATE;

-- Nueva tabla pm_credentials (vault)
CREATE TABLE IF NOT EXISTS pm_credentials (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  category     TEXT,                                 -- 'gmail','plataforma','servicio','otro'
  property_id  UUID REFERENCES pm_properties(id),
  username     TEXT,
  password_enc TEXT,                                 -- usar Supabase Vault en prod
  url          TEXT,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Nueva tabla pm_tasks (Cronograma Juan Austin)
CREATE TABLE IF NOT EXISTS pm_tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  property_id   UUID REFERENCES pm_properties(id),
  unit_id       UUID REFERENCES pm_units(id),
  zone          TEXT,                                -- ruta diaria
  priority      TEXT DEFAULT 'media' CHECK (priority IN ('baja','media','alta','urgente')),
  task_duration TEXT,                                -- "30 min"
  travel_time   TEXT,                                -- "15 min"
  assignee      TEXT,
  status        TEXT DEFAULT 'pendiente' CHECK (status IN ('pendiente','en_progreso','completado','cancelado')),
  start_at      TIMESTAMPTZ,
  finish_at     TIMESTAMPTZ,
  tools_required TEXT,
  manual_url    TEXT,
  evidence_url  TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Nueva tabla pm_interactions (Seguimiento Text Now de Airtable)
CREATE TABLE IF NOT EXISTS pm_interactions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID REFERENCES pm_tenants(id),
  booking_id   UUID REFERENCES pm_bookings(id),
  channel      TEXT,                                 -- 'whatsapp','textnow','email','llamada'
  template_id  TEXT,                                 -- 'Ms. Recordatorio 1'
  message      TEXT,
  outcome      TEXT,                                 -- 'sent','answered','no_response'
  occurred_at  TIMESTAMPTZ DEFAULT NOW(),
  notes        TEXT
);
```

**1.2 Script de migración Airtable → Supabase**

3 opciones:

**Opción A · Edge Function que jala Airtable (recomendada)**
- 1 Edge Function `pm-sync-airtable` con tu API key + base ID
- Botón "🔄 Sync Airtable" en el módulo PM
- Idempotente: usa `external_id` para detectar updates vs inserts

**Opción B · One-shot SQL precalculado**
- Genero el SQL ahora con todas las 18 propiedades + 52 unidades + 54 tenants
- Lo corrés una vez
- Después editás en el sistema directamente (Airtable queda como histórico)

**Opción C · CSV export + import**
- Vos exportás las tablas de Airtable como CSV
- Te paso un script Node.js que lo procesa y mete a Supabase
- Más control pero más manual

### 🟡 FASE 2 — Próxima sesión: tabs nuevos en el módulo PM

1. **Tab "Tareas"** (Kanban estilo Juan Austin)
2. **Tab "Accesos"** (vault de credenciales)
3. **Tab "Seguimientos"** (TextNow / WhatsApp tracking)
4. **Mejoras en Reservas**: tag de programa de ayuda, plataforma_account, contract_status

### 🟣 FASE 3 — Más adelante: features avanzadas

1. **Sync automático Airtable** cada X horas con webhook
2. **Generador de mensajes** para seguimiento (recordatorio pago, bienvenida, salida)
3. **Alertas automáticas** (vence contrato, pago atrasado, unidad libre)
4. **Reportes mensuales** para inversores

---

## 6 · Insights operativos del Airtable

Cosas que aprendí viendo tus datos:

**🟢 Lo que se ve bien:**
- Tenés un control granular por unidad (no solo por propiedad)
- El modelo "habitaciones + estudios + apartamentos + casa completa" en la misma propiedad es flexible
- Diversificación de canales (Directo + Airbnb + Padsplit) reduce dependencia

**🟡 Áreas de mejora detectables:**
- **Muchos contratos "✅ Falta firmar"** — necesitás workflow de firma con DocuSign/Zoho
- **Inconsistencias de teléfonos** (algunos con +1, otros sin, formatos varios) — normalizar a E.164
- **7105 Bethune Ave en Mantenimiento** — perdés $$$ mientras no rente. ¿Cuánto lleva así?
- **Bookings finalizados sin `end_date` claro** en algunos casos
- **Programas de ayuda** mezclados con regulares — separar para reportes (paga el estado, no el inquilino)

**🔴 Riesgos detectables:**
- Sin tabla central de pagos asociada a bookings → difícil saber morosidad real
- `Drive` con URLs públicos en muchas filas → potencial leak de info de inquilinos
- Cron tareas Juan Austin parece separado del resto → no se ve impacto en utilidad

---

## 7 · Decisión pendiente

**¿Cuál opción de migración querés?**

| | Opción A · Edge Function | Opción B · SQL one-shot | Opción C · CSV manual |
|---|---|---|---|
| **Esfuerzo inicial** | Alto (necesito tu API key) | Bajo (yo genero SQL ahora) | Medio |
| **Sync futuro** | Automático cada X horas | Manual (re-correr SQL) | Manual |
| **Mejor para...** | Mantener Airtable como source of truth | Migrar definitivamente | Híbrido |
| **Riesgo de duplicados** | Bajo (idempotente con external_id) | Bajo si corre 1 sola vez | Medio |

**Mi recomendación:** **Opción A** porque mantenés Airtable activo (para tu equipo que ya lo usa) y el sistema PM se va llenando automático. Después con el tiempo migrás 100% al sistema y desactivás Airtable.

**Para activarla necesito:**
1. Airtable Personal Access Token (https://airtable.com/create/tokens) con scopes `data.records:read` y `schema.bases:read` para la base
2. Confirmás que el Base ID es `appzEnsuy4qPT6iHj`

¿Vamos con A? ¿O preferís B (SQL one-shot ahora mismo)?
