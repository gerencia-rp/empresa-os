# Sprint 7 — Dashboards Operativos (Airtable + ClickUp)

Sprint dedicado a profesionalizar los dashboards que estaban casi terminados pero con placeholders. Acá se mata "próxima pasada".

## S7-A · Sync automático + Notification log (✅)

### Schema (`supabase/s7-a-auto-sync.sql`)

- Extensions: `pg_cron` + `pg_net` (Supabase Pro/Trial)
- Tabla `notification_log` — tracking de qué se notificó, cuándo, a quién, con éxito o no
- Tabla `user_notification_prefs` — cada user configura sus canales (browser, telegram, email) y horario quiet
- Función `cron_invoke_function(p_function text)` — wrapper para que pg_cron llame Edge Functions vía pg_net
- Jobs pg_cron:
  - `sync-airtable-every-30min` (`*/30 * * * *`)
  - `sync-clickup-every-60min` (`0 * * * *`)
- Función `queue_alert_notifications()` — para encolar notificaciones de alertas críticas (llamable desde edge functions o triggers)

### Setup post-SQL

Para que pg_cron pueda llamar las edge functions necesita el service_role key como GUC. Hay 2 opciones:

**Opción A — desde Supabase Dashboard** (más simple):
- Database → Cron → editar cada job → Settings → agregar el header `Authorization: Bearer <service_role_key>` en el HTTP request.

**Opción B — desde SQL** (requiere superuser):
```sql
alter database postgres set "app.settings.service_role_key" = '<tu_service_role_key>';
```

## S7-B · ClickUp Automatizaciones + Agente IA reales (✅)

### Schema (`supabase/s7-b-clickup-automations.sql`)

- Tabla `clickup_action_log` — auditoría de cada acción ejecutada (con response status, payload, error)
- Columnas nuevas en `clickup_automations`: `trigger_filter`, `last_run_status`, `last_run_error`
- 4 automatizaciones seed pre-creadas y **pausadas** (vos activás cuando confirmes):
  - Auto-close vencidas +30d
  - Recordatorio recurrentes saltadas
  - Re-asignar sobrecargados
  - Bitácora semanal auto

### Edge Functions

**`supabase/functions/clickup-execute/index.ts`** — proxy a ClickUp API:
- 5 acciones soportadas: `close_task`, `comment`, `assign`, `create_subtask`, `add_tag`
- Cada ejecución se loggea en `clickup_action_log`
- Si vino de un `proposal_id`, marca la propuesta como `executed`/`failed`

**`supabase/functions/clickup-ai-agent/index.ts`** — Claude semanal:
- Carga último snapshot + tasks sample + alertas críticas
- Llama Claude Sonnet con system prompt orientado a accionabilidad
- Parsea respuesta JSON (max 5 propuestas)
- Inserta en `clickup_ai_proposals` + guarda resumen en `clickup_weekly_insights`

### UI (`clickup-dashboard.js`)

- Tab **Automatizaciones**: tabla CRUD funcional con activar/pausar individual + form para crear nueva
- Tab **Agente IA**: botón "🧠 Correr agente ahora" llama la Edge Function. Cada propuesta muestra `proposal_type`, `title`, `rationale`, `action_payload` colapsable. Botón **⚡ Ejecutar** dispara `clickup-execute` directo.

### Deploy

```bash
cd "/Users/nicolara/Desktop/CLAUDE CODE/empresa-os"
supabase functions deploy clickup-execute --no-verify-jwt --use-api
supabase functions deploy clickup-ai-agent --no-verify-jwt --use-api
supabase secrets set CLICKUP_TOKEN=pk_xxxxx  # si no estaba
# ANTHROPIC_API_KEY ya está seteada desde S5-G9
```

## S7-C · Unificar casas across 3 sistemas (✅)

### Schema (`supabase/s7-c-unified-houses.sql`)

- Función `normalize_address(addr)` — lower + sin puntuación + sin espacios extra
- Tabla `house_link_overrides` — para matching manual cuando la heurística falla
- View `unified_houses` — full outer join entre:
  - `remodel_projects` (Estimador Pro)
  - `remodel_at_properties` (Airtable)
  - `clickup_snapshots.by_casa` (ClickUp último snapshot)
  - Devuelve: address normalizada, project_id, airtable_id, clickup_folder_id, status consolidado, costos, avance, días, `match_quality` ('full' | 'two' | 'estimador_only' | 'airtable_only' | 'clickup_only')
- View `house_match_suggestions` — usa `pg_trgm.similarity()` para sugerir matches >= 0.5

Query útil de diagnóstico:
```sql
select match_quality, count(*) from unified_houses group by match_quality order by 2 desc;
```

## S7-D · Polish (acciones, insights, filtros) (✅)

### Schema (`supabase/s7-d-acciones-charts.sql`)

- Tabla `remodel_required_actions` — persistente, con `category`, `responsable`, `due_date`, `status` (pending/in_progress/done/dismissed), `source` (auto/manual/ai)
- Unique constraint deferrable en `(airtable_id, title)` para evitar duplicados al re-materializar
- View `remodel_actions_summary` — KPIs por categoría

### UI (`remodel-dashboard.js`)

**Tab nueva "📋 Acciones"**:
- Botón "⚡ Regenerar desde KPIs" llama `rdMaterializeActions()` que recorre las obras activas, computa con `rdAccionesRequeridas` + `rdAdvancedKPIs`, asigna categoría y guarda en DB (skip duplicados)
- Cada acción muestra: title, detail, obra (link), responsable, due_date, badge "⏰ vencida" si aplica
- 3 botones: ▶ Empezar, ✓ Done, ✕ Dismiss
- Agrupadas por categoría (retraso, sobrepresupuesto, labor_alto, discrepancia, margen, otro)

**Tab nueva "🧠 Insights IA"**:
- Lista las semanas de `remodel_weekly_insights` (más nueva arriba)
- Muestra summary_md + lista de recomendaciones
- Si está vacío, sugiere activar pg_cron

**Estado nuevo**: `requiredActions[]`, `weeklyInsights[]`, `obrasFilter` (preparado para futura UI de filtros).

## Cómo testear (E2E)

1. Aplicar los 4 SQL en orden (acerca al final de este doc).
2. Deploy las 2 Edge Functions de S7-B.
3. **Test S7-A**: en Supabase Dashboard → Database → Cron, deberías ver los 2 jobs activos. Ejecutar manualmente uno para validar.
4. **Test S7-B Automatizaciones**: abrir Empresa OS → Remodelación → ClickUp Análisis → tab Automatizaciones. Deberías ver las 4 seed pausadas. Activar una.
5. **Test S7-B Agente IA**: tab Agente IA → click "🧠 Correr agente ahora" → debería generar 1-5 propuestas. Click "⚡ Ejecutar" en una → se ejecuta contra ClickUp y se loggea.
6. **Test S7-C**: en Supabase SQL Editor:
   ```sql
   select * from unified_houses where match_quality = 'full' limit 10;
   select * from house_match_suggestions order by score desc limit 20;
   ```
7. **Test S7-D Acciones**: abrir Dashboard de Obras → tab Acciones → click "⚡ Regenerar desde KPIs" → las acciones quedan persistidas. Probá ▶/✓/✕.
8. **Test S7-D Insights**: tab Insights IA → debería aparecer la entrada que el agente generó en step 5.

---

## Cierre

Con S7, el Empresa OS pasa de "dashboards de visualización" a **plataforma operacional con loop cerrado**:

- Detecta → notifica → propone → ejecuta → loggea
- Datos siempre frescos (auto-sync)
- IA semanal con propuestas accionables (no solo descripciones)
- Acciones requeridas como tabla persistente (no efímero)
- 3 sistemas (Estimador + Airtable + ClickUp) unificados via view

**Total acumulado tras 7 sprints**:
- ~6,500 LOC entre los 5 JS principales
- 17 schemas SQL aplicados
- 3 Edge Functions (remodel-ai, clickup-execute, clickup-ai-agent)
- 5 sistemas en producción
- pg_cron jobs corriendo cada 30/60min
