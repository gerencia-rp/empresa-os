# 📅 Airbnb iCal Sync · Cómo activarlo

**Lo que hace:** sincroniza el calendario de cada listing de Airbnb (vía iCal) → reservas automáticas en `pm_bookings`. Funciona también para VRBO, Booking, Hospitable y cualquier iCal custom.

---

## 🚀 Pasos para activarlo

### Paso 1 — Schema SQL en Supabase

1. Supabase SQL Editor → pegá `supabase/pm-calendar-feeds-schema.sql` → Run
2. Esto crea:
   - Tabla `pm_calendar_feeds` (configuración de feeds)
   - Columnas nuevas en `pm_bookings`: `feed_id`, `external_uid`
   - UNIQUE constraint en `external_uid` para upsert idempotente
   - Vista `pm_feeds_summary`

Verificá:
```sql
SELECT count(*) FROM pm_calendar_feeds;  -- 0
```

### Paso 2 — Deploy de la Edge Function

```bash
cd "/Users/nicolara/Desktop/CLAUDE CODE/empresa-os"
git add pm/pm-main.js supabase/pm-calendar-feeds-schema.sql supabase/functions/pm-sync-calendars PM-AIRBNB-ICAL-COMO-CORRER.md
git commit -m "PM: feeds iCal · Airbnb/VRBO/Booking sync"
git push
npx supabase functions deploy pm-sync-calendars --project-ref nezbaljfhhyznhltpjnk
```

### Paso 3 — Sacar el iCal de Airbnb (por cada listing)

⚠️ **Tenés que hacer esto UNA vez por cada listing** (= por cada unidad en el sistema).

1. Entrá a Airbnb (cuenta de host) en otra pestaña
2. **Today** → **Calendar** (en el menú superior)
3. Elegí el listing en el dropdown
4. En el calendario, arriba a la derecha → **Availability** → buscá **"Connect another website's calendar"** o **"Sync calendars"**
5. Scrolleá hasta la sección **"Export calendar"** (o "Export your calendar")
6. Vas a ver un link tipo:
   ```
   https://www.airbnb.com/calendar/ical/12345678.ics?s=abcdef1234567890
   ```
7. Click **Copy** en ese link

### Paso 4 — Agregar el feed en el sistema PM

1. En la app: **Property Management → Tab "📡 Feeds"**
2. Click **+ Nuevo feed**
3. Llená:
   - **Plataforma**: Airbnb
   - **Unidad**: elegí la unidad del listing (ej. BARK-HB1)
   - **URL del iCal**: pegá el link que copiaste
   - **$/noche default**: el precio promedio que cobrás esa unidad por noche (porque iCal no trae monto)
   - **Período**: Noche (lo más común para Airbnb)
   - ✅ Activo
   - ✅ Sync automático
4. Click **Crear feed**
5. Te pregunta "¿Sincronizar ahora?" → click **OK**
6. Esperá 5-30 segundos → vas a ver el resumen: `Eventos: X · Sincronizados: X`
7. Click **Ver reservas** → vas a ver las reservas en el tab Reservas
8. Andá al tab **📅 Calendario** → las reservas aparecen pintadas en **rojo Airbnb** en el timeline de esa unidad

### Paso 5 — Repetir por cada listing

Para cada unidad de Airbnb que tengas, repetí los pasos 3-4. Si tenés 10 listings, vas a tener 10 feeds.

---

## 🔄 Sincronizaciones futuras

**Manual** (recomendado por ahora):
- Tab Feeds → 🔄 al lado de cada feed (sync ese) o **🔄 Sync todos** (todos los activos)

**Automático** (próximo paso, no implementado todavía):
- Cron de Supabase que llame `pm-sync-calendars` con `all: true` cada 6 horas
- Si querés activarlo ahora, decímelo y lo configuramos

---

## 🎯 Qué viene en cada reserva sincronizada

Por cada VEVENT del iCal:
- `external_uid` = `feed_id|UID-del-evento` (clave para idempotencia)
- `start_date`, `end_date` = fechas del evento (DTEND ajustado a día anterior porque iCal lo usa exclusivo)
- `booking_type` = `airbnb` (o lo que sea la plataforma)
- `rent_amount` = el default que pusiste en el feed × días (aprox)
- `status` = `confirmado` (o `cancelado` si el evento dice "blocked"/"not available")
- `notes` = el SUMMARY o DESCRIPTION del evento
- `feed_id` = ID del feed que generó la reserva

⚠️ **Lo que iCal NO trae:**
- Monto exacto de la reserva (Airbnb oculta esto)
- Teléfono / email del huésped
- Mensajes del huésped

**Si querés esa data,** hay que usar Hospitable API (que ya tenés contratado según tu Airtable).

---

## 🆘 Troubleshooting

| Error | Causa | Solución |
|---|---|---|
| `fetch falló — HTTP 401` | URL iCal con token vencido | Recopiá el iCal de Airbnb (rotan los tokens cada cierto tiempo) |
| `fetch falló — HTTP 403` | Airbnb bloqueó por rate limit | Esperá 5 min y reintentá |
| `Parse falló` | URL no es un iCal válido | Verificá que la URL devuelva texto que empieza con `BEGIN:VCALENDAR` |
| Eventos: 0 pero el feed parecía bien | El listing no tiene reservas | Normal — sin reservas no hay nada que sincronizar |
| Sync OK pero no aparecen en el calendario | Cache | Cambiá de tab y volvé al Calendario |
| `relation "pm_calendar_feeds" does not exist` | No corriste el SQL | Pegá `pm-calendar-feeds-schema.sql` primero |

Para debug:
```sql
-- Ver últimos syncs
SELECT * FROM pm_feeds_summary ORDER BY last_synced_at DESC;

-- Ver reservas que vienen de iCal
SELECT b.*, f.platform
FROM pm_bookings b
LEFT JOIN pm_calendar_feeds f ON f.id = b.feed_id
WHERE b.feed_id IS NOT NULL
ORDER BY b.start_date DESC LIMIT 20;
```

---

## 🔮 Próximos pasos (cuando este esté funcionando)

1. **Sync automático cron** (cada 6h) — 5 min de setup
2. **VRBO/Booking iCal** (mismo flujo) — ya está soportado, solo pegar otra URL
3. **Hospitable API** (data rica con montos y huéspedes) — necesita ~1 día de dev
4. **Padsplit scraping** (Chrome MCP) — ~2 días, más frágil
5. **Notificaciones**: WhatsApp cuando llega nueva reserva
6. **Avoid double-booking**: bloquear Airbnb cuando ya hay contrato directo activo
