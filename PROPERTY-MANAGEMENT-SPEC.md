# 🏠 Sistema de Property Management · Spec base

**Inspirado en:** RentasPro (Taskade app) — `rental-operations-dashboard-1540.taskade.app`
**Para:** Rental Profits · empresa de Nico
**Fecha análisis:** 12 jun 2026
**Estado:** Spec sin código todavía — esto es la base para empezar a construir cuando estés listo.

---

## 1 · Resumen ejecutivo

RentasPro es un sistema de property management con foco en **operación diaria** de un portfolio de rentas (17 propiedades, 40 unidades, 25 inquilinos). Combina:

- **CRM operativo** (inquilinos, contratos, seguimientos)
- **Calendario de ocupación tipo Airbnb/iCal** (timeline anual con huecos detectados)
- **Finanzas** (ingresos, gastos, utilidad por propiedad, comparativa mensual)
- **Centro de tareas** (Kanban con seguimientos y cobros)
- **Centro de alertas** automáticas (vencimientos, baja ocupación, pagos)
- **Tours/visitas** agendadas
- **Inventario de activos fijos** por propiedad
- **Vault de credenciales** (Gmail, Booking, Airbnb, Hospitable, etc.)

**Filosofía**: el dueño ve en 1 vista por dónde está sangrando dinero (ingreso perdido por unidades vacías) y qué tiene que hacer hoy (seguimientos, cobros).

---

## 2 · Mapa funcional · tab por tab

### 📊 Tab 1 · Dashboard Ejecutivo
**Propósito:** "Vista general del negocio · Abril 2026"
- **8 KPIs hero**: Propiedades (17) · Unidades (40) · Ocupación (70%) · Inquilinos (3) · Ingresos mes ($2,830) · Gastos mes ($13,496) · Utilidad neta (-$10,666) · Pendiente cobro ($0)
- **Ocupación por propiedad** (lista con barras de progreso: verde=ocupada, naranja=parcial, rojo=vacía)
- **Alertas Activas** (panel derecho)
- **Estado de unidades** (donut: Ocupadas / Libres / Reservadas / Mantenimiento)
- **Tareas pendientes** (20) con prioridad

### 🏘️ Tab 2 · Propiedades
**Propósito:** "17 propiedades · Click para ver unidades"
- Lista de propiedades con:
  - Nombre / dirección
  - Estado (Activa)
  - # habitaciones, baños, estudios, sqft
  - Tipo (Casa Completa / Por Habitaciones / Por Estudios)
  - Footer: # unidades · # inquilinos · # contratos · $renta/mes
- Botón **+ Nueva Propiedad**
- Click en propiedad → expande para mostrar unidades (no exploré profundidad)
- Acciones por fila: ✏️ editar / 🗑 eliminar

### 📦 Tab 3 · Activos Fijos
**Propósito:** "Inventario de enseres y equipamiento"
- Tabs internas: Inventario General / Registrar Activo
- KPIs: Total activos · Incluidos · Mantenimiento · Por incluir
- Filtros: por estado · por propiedad
- Búsqueda por código
- Estado vacío con CTA "Registrar Activo"

### 📄 Tab 4 · Contratos
**Propósito:** "20 actuales · 0 próximos · 3 anteriores"
- Tabs internas: Listado / Creación de Contratos
- KPIs: Actuales / Próximos / Anteriores
- Lista de contratos con:
  - Nombre/descripción ("Contrato renta mensual - HB2 Childress - Maricruz")
  - Estado (Activo) + alerta "⚠️ Vence en 14d"
  - Propiedad · unidad · inquilino
  - Fechas (inicio → fin)
  - $renta/mes · depósito
  - Tipo (Mensual / Anual)
  - Estado pago (Pendiente)
  - Frecuencia cobro ("Primeros 3 días de cada mes", "Cada 2 semanas", "15 de cada mes", "Primer día de cada mes")
  - Acciones: Previsualizar documento / Sin docs

### 👥 Tab 5 · Inquilinos
**Propósito:** "Contratos directos y reservas por plataformas"
- 25 total · 25 activos · 23 por contrato · 2 por plataforma (Airbnb)
- Tabs internas: Todos / Contrato Directo / Próximos a llegar / Próximos a salir / Registrar
- Buscador por nombre/propiedad/canal
- Por inquilino (card):
  - Nombre
  - Propiedad · unidad
  - Tipo (Contrato Directo / Airbnb)
  - Estado (Activo / Vencido)
  - Teléfono
  - $renta + frecuencia (ps-3days, ps-biweekly, ps-1st, ps-15th, Estadía)
  - Para directos: Inicio/Fin contrato
  - Para Airbnb: Check-in/Check-out
  - Acciones: Editar / Eliminar

### 💰 Tab 6 · Finanzas
**Propósito:** "Ingresos, gastos y utilidad en un solo lugar"
- Filtro: por propiedad
- Botones: + Ingreso · + Gasto
- KPIs: Ingresos · Gastos · Utilidad · Tasa Cobro
- Tabs internas: Resumen / Ingresos (6) / Gastos (53)
- **Rendimiento por propiedad** (cards ordenadas por utilidad):
  - Nombre
  - Utilidad neta grande
  - Ingresos vs Gastos
  - # unidades, % ocup., # contratos
  - Link "Ver →"

### 📈 Tab 7 · Mensual
**Propósito:** "Flujo Mensual por Propiedad — Ve cómo fluctúan las rentas mes a mes"
- Toggle vista: Utilidad / Ingresos / Gastos
- KPIs: Total Ingresos · Total Gastos · Utilidad Neta · Promedio/mes
- **Tabla pivot**: propiedades en filas × meses en columnas (Ene-Dic) con valores y total
- **Ranking de propiedades por utilidad** (top 10) con medallas 🥇🥈🥉

### 📅 Tab 8 · Calendario (★ joya de la corona)
**Propósito:** "Calendario de Ocupación 2026 · Meta: 100% ocupación — Detecta huecos y planifica rotaciones"
- Tabs internas: Línea de tiempo / Reservas
- Vista: Año / Mes / Semana / Rango · navegación años · botón "Huecos"
- KPIs: Cobertura (15%) · Unidades (40) · Días vacíos (12316) · **Ingreso perdido estimado ($612,228)** · Al 100% (0/40)
- **Timeline anual estilo Gantt**:
  - Filas = unidades agrupadas por propiedad
  - Columnas = 12 meses
  - Barras de colores: 👤 Inquilino directo · 📄 Contrato · 🌐 Plataforma · ⬜ Hueco
  - Cada barra con nombre del inquilino + fechas
  - Cálculo automático de "Xd vacío" y "~$X perdidos"
- **Huecos Detectados** abajo: lista de las 40 unidades con días vacíos + $ perdido estimado

### 📍 Tab 9 · Tours
**Propósito:** "Cronograma Tours · Agenda compartida · sincronización en tiempo real"
- Tabs internas: Cronograma / Agendar Tour
- KPIs: Total agendados · Próximos · Hoy · Guías activos
- Botón **+ Agendar Tour**
- Lista de tours pasados / futuros

### ✅ Tab 10 · Tareas
**Propósito:** "Tareas del Equipo · 51 tareas · 20 pendientes · arrastra para cambiar estado"
- **Kanban 3 columnas**: 🔴 Pendiente (20) · 🔵 En Progreso (8) · 🟢 Completado (0)
- Por tarea (card):
  - Emoji + título ("🤝 Seguimiento de bienestar — Kiki", "💳 Recordatorio de pago — Brandon")
  - Prioridad (Alta / Media)
  - Categoría (Comercial)
  - Propiedad — unidad
  - Vence: fecha
- Drag&drop entre columnas
- Botón **+ Nueva Tarea**

### 🚨 Tab 11 · Alertas
**Propósito:** "Centro de Alertas · 21 alertas activas"
- KPIs: Críticas (2) · Advertencias (19) · Info (0)
- Agrupado por propiedad (acordeón)
- Por propiedad: "X crítica / Y alertas"
- Al expandir, cada alerta con:
  - Severidad (🔴 / 🟡 / 🔵)
  - Título descriptivo: "⚠️ Sin contrato: DeQuan" · "Unidad libre: GAR-UND3" · "Baja ocupación: 50% (2/4 unidades)" · "Gasto pendiente: Jardinería"
  - Categoría: Contratos / Vacancia / Ocupación / Gastos
  - Sub-info: "Renta objetivo: $1,500/mes" · "Inquilino activo sin contrato vigente"

### 🔑 Tab 12 · Accesos
**Propósito:** "13 credenciales guardadas"
- Tabs filtro: Todos (13) · Propiedad (1) · Plataforma Renta (2) · Otro (10)
- Búsqueda por nombre/URL/usuario
- Botón **+ Nuevo Acceso**
- Por credencial (card):
  - Nombre (ej: "Gmail Gerencia", "Booking", "Hospitable", "Zoho Sign")
  - Categoría
  - URL (opcional)
  - Usuario
  - Contraseña enmascarada
  - Notas (opcional)

---

## 3 · Modelo de datos sugerido (SQL para Supabase)

```sql
-- ════════════════════════════════════════════════════════════════
-- PROPERTY MANAGEMENT SCHEMA · base mínima
-- ════════════════════════════════════════════════════════════════

-- ── 1. PROPIEDADES ──
CREATE TABLE pm_properties (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,                -- "4916 Barkbridge Trail"
  address         TEXT NOT NULL,
  city            TEXT,
  state           TEXT,
  zip             TEXT,
  bedrooms        INT,
  bathrooms       NUMERIC(3,1),
  studios         INT DEFAULT 0,
  sqft            INT,
  rental_type     TEXT CHECK (rental_type IN ('casa_completa','por_habitaciones','por_estudios')),
  status          TEXT DEFAULT 'activa' CHECK (status IN ('activa','inactiva','en_remodelacion')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. UNIDADES (cada hab, estudio o casa completa) ──
CREATE TABLE pm_units (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id     UUID NOT NULL REFERENCES pm_properties(id) ON DELETE CASCADE,
  code            TEXT NOT NULL,                -- "CHILD-HB3" / "BARKBRIDGE - CASA COMPLETA"
  name            TEXT,                         -- "Casa Childress Hab 3"
  unit_type       TEXT CHECK (unit_type IN ('habitacion','estudio','casa_completa','departamento')),
  target_rent     NUMERIC,                      -- $800/mes objetivo
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(property_id, code)
);

-- ── 3. INQUILINOS ──
CREATE TABLE pm_tenants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name       TEXT NOT NULL,
  phone           TEXT,
  email           TEXT,
  document_id     TEXT,                         -- DNI/SSN/Passport
  source          TEXT CHECK (source IN ('directo','airbnb','booking','vrbo','hospitable','referido','walk-in')),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. CONTRATOS / RESERVAS (modelo unificado) ──
CREATE TABLE pm_bookings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id         UUID NOT NULL REFERENCES pm_units(id),
  tenant_id       UUID REFERENCES pm_tenants(id),
  booking_type    TEXT NOT NULL CHECK (booking_type IN ('contrato_directo','plataforma','reserva_corta')),
  platform        TEXT,                         -- 'airbnb','booking','vrbo','hospitable' si aplica
  external_ref    TEXT,                         -- ID del booking en la plataforma
  title           TEXT,                         -- "Contrato renta mensual - HB3 Childress"

  -- Fechas
  start_date      DATE NOT NULL,
  end_date        DATE,                         -- NULL = indefinido

  -- Económicas
  rent_amount     NUMERIC NOT NULL,             -- monto/periodo
  rent_period     TEXT CHECK (rent_period IN ('estadia','dia','semana','mensual','anual')),
  deposit         NUMERIC DEFAULT 0,

  -- Frecuencia de cobro (solo para contratos)
  payment_day     TEXT,                         -- "primer_dia", "15", "3_primeros_dias", "cada_2_semanas", "biweekly"

  -- Estado
  status          TEXT DEFAULT 'activo' CHECK (status IN ('borrador','activo','vencido','cancelado','finalizado')),

  -- Documento
  contract_url    TEXT,                         -- URL en Storage al PDF firmado

  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_pm_bookings_unit_dates ON pm_bookings(unit_id, start_date, end_date);
CREATE INDEX idx_pm_bookings_status ON pm_bookings(status) WHERE status = 'activo';

-- ── 5. PAGOS / FINANZAS ──
CREATE TABLE pm_payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      UUID REFERENCES pm_bookings(id),
  property_id     UUID REFERENCES pm_properties(id),  -- denormalizado para queries
  type            TEXT NOT NULL CHECK (type IN ('ingreso','gasto')),
  category        TEXT,                         -- 'renta','deposito','jardineria','limpieza','reparacion','servicios','impuestos','seguros','mantenimiento','administracion'
  concept         TEXT NOT NULL,                -- "Renta mayo 2026 — Kiki"
  amount          NUMERIC NOT NULL,
  paid_at         DATE,                         -- NULL = pendiente
  due_at          DATE,
  payment_method  TEXT,                         -- 'transferencia','zelle','efectivo','cashapp','cheque'
  reference       TEXT,                         -- # de transferencia, recibo
  attachment_url  TEXT,
  status          TEXT DEFAULT 'pendiente' CHECK (status IN ('pendiente','pagado','vencido','anulado')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_pm_payments_property_month ON pm_payments(property_id, paid_at);
CREATE INDEX idx_pm_payments_pending ON pm_payments(status, due_at) WHERE status = 'pendiente';

-- ── 6. TAREAS ──
CREATE TABLE pm_tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,                -- "🤝 Seguimiento bienestar — Kiki"
  description     TEXT,
  priority        TEXT DEFAULT 'media' CHECK (priority IN ('baja','media','alta','critica')),
  category        TEXT,                         -- 'comercial','mantenimiento','cobranza','legal','operacional'
  status          TEXT DEFAULT 'pendiente' CHECK (status IN ('pendiente','en_progreso','completado','cancelado')),
  -- Asociaciones (opcionales)
  property_id     UUID REFERENCES pm_properties(id),
  unit_id         UUID REFERENCES pm_units(id),
  tenant_id       UUID REFERENCES pm_tenants(id),
  booking_id      UUID REFERENCES pm_bookings(id),
  -- Asignación
  assignee        TEXT,                         -- email o user_id del responsable
  -- Fechas
  due_at          DATE,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 7. ALERTAS (autogeneradas por triggers/views) ──
CREATE TABLE pm_alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  severity        TEXT CHECK (severity IN ('critica','advertencia','info')),
  category        TEXT CHECK (category IN ('contratos','vacancia','ocupacion','gastos','mantenimiento','pagos','documentos')),
  title           TEXT NOT NULL,
  description     TEXT,
  property_id     UUID REFERENCES pm_properties(id),
  unit_id         UUID REFERENCES pm_units(id),
  is_dismissed    BOOLEAN DEFAULT FALSE,
  dismissed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 8. TOURS ──
CREATE TABLE pm_tours (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id     UUID REFERENCES pm_properties(id),
  unit_id         UUID REFERENCES pm_units(id),
  prospect_name   TEXT NOT NULL,
  prospect_phone  TEXT,
  prospect_email  TEXT,
  scheduled_at    TIMESTAMPTZ NOT NULL,
  guide           TEXT,                         -- nombre del guía
  status          TEXT DEFAULT 'agendado' CHECK (status IN ('agendado','realizado','no_show','reagendado','cancelado')),
  outcome         TEXT,                         -- 'aplicó','rechazó','sin_respuesta'
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 9. ACTIVOS FIJOS ──
CREATE TABLE pm_assets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT UNIQUE,                  -- "BARK-FRIDGE-01"
  name            TEXT NOT NULL,                -- "Refrigerador Whirlpool 18 cu ft"
  category        TEXT,                         -- 'electrodomestico','muebles','herramienta','tecnologia','decoracion'
  property_id     UUID REFERENCES pm_properties(id),
  unit_id         UUID REFERENCES pm_units(id),
  status          TEXT CHECK (status IN ('incluido','mantenimiento','por_incluir','dado_de_baja')),
  purchase_date   DATE,
  purchase_cost   NUMERIC,
  expected_life   INT,                          -- años
  notes           TEXT,
  photo_url       TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 10. ACCESOS / CREDENCIALES (cifrado!) ──
CREATE TABLE pm_credentials (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,                -- "Booking Gerencia"
  category        TEXT,                         -- 'plataforma','propiedad','servicio','otro'
  url             TEXT,
  username        TEXT,
  password_enc    TEXT,                         -- ⚠️ usar Supabase Vault o pgcrypto AES
  notes           TEXT,
  tags            TEXT[],
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════
-- VISTAS para Dashboard / Calendario / Finanzas
-- ════════════════════════════════════════════════════════════════

-- Ocupación actual por unidad
CREATE OR REPLACE VIEW pm_unit_occupancy AS
SELECT
  u.id AS unit_id,
  u.property_id,
  u.code,
  u.target_rent,
  b.id AS active_booking_id,
  b.tenant_id,
  b.start_date,
  b.end_date,
  CASE WHEN b.id IS NULL THEN 'libre'
       WHEN b.end_date IS NOT NULL AND b.end_date < CURRENT_DATE + INTERVAL '14 days' THEN 'vence_pronto'
       ELSE 'ocupada' END AS status
FROM pm_units u
LEFT JOIN pm_bookings b ON b.unit_id = u.id
  AND b.status = 'activo'
  AND (b.start_date <= CURRENT_DATE)
  AND (b.end_date IS NULL OR b.end_date >= CURRENT_DATE);

-- Resumen mensual de finanzas
CREATE OR REPLACE VIEW pm_monthly_finance AS
SELECT
  property_id,
  DATE_TRUNC('month', paid_at)::DATE AS month,
  SUM(amount) FILTER (WHERE type = 'ingreso') AS ingresos,
  SUM(amount) FILTER (WHERE type = 'gasto') AS gastos,
  SUM(amount) FILTER (WHERE type = 'ingreso') - SUM(amount) FILTER (WHERE type = 'gasto') AS utilidad
FROM pm_payments
WHERE status = 'pagado' AND paid_at IS NOT NULL
GROUP BY property_id, DATE_TRUNC('month', paid_at);

-- Días vacíos por unidad este año (para Calendario huecos detectados)
-- Lógica: días del año - días con booking activo. Implementarlo en frontend o como función.
```

---

## 4 · Arquitectura sugerida (consistente con Empresa OS)

| Capa | Tecnología | Por qué |
|---|---|---|
| Frontend | Vanilla JS + Tailwind CDN | Igual que Empresa OS — no requiere build, deploy directo |
| Storage / DB | Supabase Postgres + RLS | Ya lo usás, ya pagás |
| Auth | Supabase Auth | Mismo proveedor |
| Storage de docs (contratos PDF, fotos) | Supabase Storage | Buckets por property |
| Edge functions | Solo si necesitás integraciones (Hospitable webhook, etc.) | Lo más liviano |
| Hosting | Vercel (lo que ya usás) | Deploy con git push |
| Mensajería | WhatsApp wa.me para inquilinos / Twilio si después | Igual patrón que Empresa OS |

**Carpeta sugerida dentro de `empresa-os/`:**
```
empresa-os/
├── pm/                          # nuevo módulo
│   ├── pm-properties.js
│   ├── pm-units.js
│   ├── pm-tenants.js
│   ├── pm-bookings.js
│   ├── pm-finances.js
│   ├── pm-calendar.js
│   ├── pm-tasks.js
│   ├── pm-alerts.js
│   ├── pm-tours.js
│   └── pm-assets.js
└── supabase/
    └── pm-schema.sql
```

Empresa OS pasa a ser **el holding** que contiene todos los sistemas (educación, rentals, fix&flip, etc.) y desde el dashboard principal abrís el sistema de Rentals.

---

## 5 · Roadmap MVP — 4 fases priorizadas

### 🟢 FASE 1 · CORE (2-3 semanas si lo arrancás full-time)
**Objetivo:** poder cargar todo lo que ya tenés en RentasPro hoy.

1. Schema completo en Supabase (corres el SQL de arriba)
2. **CRUD Propiedades** — alta, edición, lista
3. **CRUD Unidades** — colgadas de propiedades
4. **CRUD Inquilinos** — alta con teléfono/email
5. **CRUD Contratos/Bookings** — unificado para directos + plataforma
6. **Dashboard básico** — los 8 KPIs hero + lista de ocupación por propiedad

**Resultado:** podés migrar todo RentasPro a tu sistema y empezar a usarlo.

### 🟡 FASE 2 · OPERACIÓN DIARIA (1-2 semanas)
**Objetivo:** que reemplace el día a día.

7. **Finanzas** — alta de ingresos/gastos + KPIs + filtro por propiedad
8. **Tab Mensual** — tabla pivot prop × mes
9. **Tareas (Kanban)** — 3 columnas drag&drop con prioridad
10. **WhatsApp helper** — botón "💬 contactar" en cada inquilino (igual al de Empresa OS)

### 🔵 FASE 3 · CALENDARIO ★ (la joya — 2 semanas, es lo más complejo)
**Objetivo:** detectar huecos y calcular ingreso perdido.

11. **Timeline anual estilo Gantt** — unidades en filas × meses en columnas
12. **Cálculo automático de huecos** — días sin booking activo
13. **Estimación de ingreso perdido** — días vacíos × target_rent
14. **Botón Nueva Reserva** desde celdas del calendario

### 🟣 FASE 4 · INTELIGENCIA (1-2 semanas)
**Objetivo:** que el sistema te avise solo.

15. **Centro de Alertas** — generadas por trigger SQL o por view:
    - Contratos venciendo en próximos 14 días
    - Unidades libres > 30 días
    - Baja ocupación de propiedad < 50%
    - Gastos pendientes > 7 días
    - Pagos atrasados
16. **Tours** — agenda de visitas + estado outcome
17. **Activos fijos** — inventario por propiedad
18. **Vault de accesos** — credenciales cifradas (Supabase Vault)

---

## 6 · Lo que RentasPro hace bien y vale la pena copiar (con prioridad)

| Feature | Por qué es brillante | Prio |
|---|---|---|
| **Calendario anual con huecos** | Inmediatamente ves dónde sangrás $$$. Cálculo "Ingreso perdido ~$612,228" es shocking. Genera urgencia. | ⭐⭐⭐ |
| **Ranking de propiedades por utilidad** con medallas | Gamifica. Muestra dónde focalizar. | ⭐⭐⭐ |
| **Frecuencias de cobro flexibles** (ps-3days, ps-1st, ps-15th, cada 2 semanas) | Refleja la realidad de los contratos con inquilinos de bajo income que pagan distinto. | ⭐⭐⭐ |
| **Alertas autogeneradas con contexto** ("Renta objetivo: $1,500/mes") | El usuario sabe el impacto $$$ de cada alerta, no es genérico. | ⭐⭐⭐ |
| **Modelo unificado contratos + plataforma** | No discrimina entre Airbnb y contrato directo — todo es "booking" con tipo distinto. | ⭐⭐⭐ |
| **Tab Mensual con pivot** | Ve la tendencia mes a mes, detecta propiedades en bajada. | ⭐⭐ |
| **Tareas Kanban con prioridad y categoría** | Operación visual. | ⭐⭐ |
| **Vault de accesos** | Centraliza credenciales (Gmail, Booking, Airbnb) en un lugar seguro. | ⭐⭐ |
| **Tours agendados** | Mide conversion del funnel: tour → aplicación → firma. | ⭐⭐ |
| **Asistente IA en sidebar** | Para preguntar cosas tipo "qué propiedades están vacías hace +60 días". | ⭐ |
| **Activos Fijos** | Útil cuando ya tenés escala — para inicial podés saltearlo. | ⭐ |

---

## 7 · Lo que YO agregaría además de RentasPro

Cosas que vi que le faltan a RentasPro y harían tu sistema MEJOR:

1. **Sincronización iCal con Airbnb/Booking** — bajar las reservas externas automático en vez de cargarlas a mano
2. **WhatsApp automático para cobros** — el día 1 del mes manda recordatorio
3. **Historial de mantenimiento por unidad** — registro de cada arreglo con $ y proveedor (esto ya está parcial en Empresa OS para fix&flip)
4. **Photo upload por unidad** — fotos antes/después de cada turnover
5. **Generador de contratos PDF** desde template con merge de datos
6. **Reporte mensual auto** para inversores — el sistema genera un PDF al día 5 con los números del mes anterior
7. **Score de inquilino** — track de puntualidad de pago, daños, comportamiento → al renovar contrato sabés si conviene
8. **Proyección de cash flow 12 meses adelante** — con contratos vigentes + huecos esperados

---

## 8 · Próximos pasos sugeridos

**Cuando quieras arrancar a construir:**

1. Confirmar el schema (ajustes que veas necesarios)
2. Correr el SQL en Supabase
3. Decidir si va dentro de `empresa-os/` como sub-módulo o app standalone
4. Yo te genero el código de la **Fase 1 (CORE)** en 1 sesión
5. Probas con datos reales (migrás 1 propiedad a mano)
6. Iteramos por fase

**Mientras tanto, podés:**
- Seguir usando RentasPro para tu operación diaria
- Capturar pantallas/notas de las features que más te sirven
- Pensar QUÉ datos hoy te falta capturar (mantenimientos, comunicación, etc.)

---

**Doc base creado. Cuando quieras arrancar a desarrollar, este doc es la spec — me pasás "Fase 1, dale" y empiezo a generar código.**
