# Sprint 8 — Área Project Management (sistema nervioso central)

Sprint que crea el área **🎯 Project Management** en Empresa OS — coordinación cross-empresa, WhatsApp Daily Loop con cierre automático, scorecard único, workload balancer, dependencias visuales, IA agente, reportes ejecutivos auto-generados, risks register y compliance tracker.

---

## 📦 Lo que se entrega en este sprint

### Schemas SQL (`supabase/s8-pm-area.sql`)
1. Área `pm` en `public.areas`
2. Sistema `pm-dashboard` en `public.systems`
3. **8 tablas nuevas:**
   - `pm_whatsapp_recipients` — quién recibe el daily, con su teléfono + clickup_username + role
   - `pm_whatsapp_config` — config singleton (hora push, hora close, group chat, timezone)
   - `pm_whatsapp_messages` — log completo de in/out
   - `pm_daily_assignments` — foto del daily por persona × fecha
   - `pm_dependencies_cross` — qué bloquea qué entre áreas
   - `pm_executive_reports` — weekly/monthly/quarterly auto-generados
   - `pm_risks` — risk register con score = prob × impact
   - `pm_compliance_items` — permits, licencias, seguros con vencimiento
4. **1 view:** `pm_scorecard` que cruza KPIs de las 5 áreas en 1 query
5. **4 cron jobs:**
   - `pm-daily-push-7am` (Mon-Sat 13:00 UTC ≈ 7am Texas)
   - `pm-daily-close-6pm` (Mon-Sat 00:00 UTC next day ≈ 6pm Texas)
   - `pm-group-report-8pm` (Mon-Sat 02:00 UTC next day ≈ 8pm Texas)
   - `pm-weekly-review-mon-7am` (Lunes 13:00 UTC ≈ 7am Texas)

### Edge Functions (5 nuevas)
- `whatsapp-send` — proxy a WhatsApp Cloud API (text/template/interactive). Log a `pm_whatsapp_messages`.
- `whatsapp-webhook` — recibe respuestas + status updates de Meta. Parsea "1 ok" / botones interactivos → cierra task en ClickUp.
- `pm-daily-push` — push 7am. Lee ClickUp tasks con due_date=hoy por persona, manda WhatsApp formateado.
- `pm-daily-close` — close 6pm. Pregunta qué faltó, mueve pendientes a mañana automáticamente.
- `pm-group-report` — reporte grupal 8pm. Resumen cross-equipo al chat central.
- `pm-weekly-review` — lunes 7am. Claude analiza últimos 7 días cross-empresa, genera Weekly Business Review, lo guarda en `pm_executive_reports`, manda resumen al grupo.

### UI (`pm-dashboard.js` — 1 modulo nuevo)
8 tabs:
- 📊 **Scorecard** — KPIs cross-área en vivo (obras activas, capital en obra, ClickUp open/overdue, bus factor, acciones pendientes, daily hoy, risks high, compliance expiring, deps cross)
- 📱 **WhatsApp** — config bot + recipients CRUD + log últimos 50 mensajes + botón "⚡ Correr push ahora"
- 👥 **Workload** — performance por persona últimos 7d (dailies, tareas, cumplimiento)
- 🔗 **Dependencias** — registro de qué bloquea qué cross-área, con severity
- 🤖 **IA Agente** — botón "🧠 Generar Weekly Review ahora"
- 📈 **Reportes** — historial de reportes ejecutivos auto-generados
- ⚠️ **Risks** — risk register score = prob × impact
- 📜 **Compliance** — permits/licencias/seguros con vencimiento

---

## 🚀 Setup paso a paso

### Paso 1 — Pegá el SQL en Supabase (1 query)

Abrí 👉 https://supabase.com/dashboard/project/_/sql/new y pegá el contenido de `supabase/s8-pm-area.sql` completo. Click Run. ✅ "Success".

Verificá con:
```sql
select id, name, icon from public.areas where id = 'pm';
select * from public.pm_scorecard;
select jobname, schedule, active from cron.job where jobname like 'pm-%';
```

### Paso 2 — Deploy las 6 Edge Functions

```bash
cd "/Users/nicolara/Desktop/CLAUDE CODE/empresa-os"
supabase functions deploy whatsapp-send --no-verify-jwt --use-api
supabase functions deploy whatsapp-webhook --no-verify-jwt --use-api
supabase functions deploy pm-daily-push --no-verify-jwt --use-api
supabase functions deploy pm-daily-close --no-verify-jwt --use-api
supabase functions deploy pm-group-report --no-verify-jwt --use-api
supabase functions deploy pm-weekly-review --no-verify-jwt --use-api
```

### Paso 3 — Setup WhatsApp Cloud API (15 min, único setup)

WhatsApp Cloud API es **gratis hasta 1,000 conversaciones por mes** (sobra para tu operación).

#### 3.1 — Crear app en Meta for Developers

1. Andá a 👉 https://developers.facebook.com/apps
2. Click **"Create App"**
3. Use case: **"Other"** → next
4. App type: **"Business"** → next
5. Nombre de la app: ej. `Empresa OS Bot`
6. Email de contacto: tu email
7. **Create App**

#### 3.2 — Agregar producto WhatsApp

1. En el panel izquierdo, scroll a **"Add products to your app"**
2. Buscá **"WhatsApp"** → click **"Set up"**
3. Te lleva al panel de WhatsApp Business

#### 3.3 — Obtener credenciales temporales (24h)

En la sección **"Send and receive messages"**:
- **Phone number ID** → copialo. Ej: `109361234567890`
- **Access token (temporary 24h)** → copialo. Empieza con `EAA...`
- **Business Account ID** → copialo

Setearlos como secrets:
```bash
supabase secrets set WA_PHONE_NUMBER_ID=109361234567890
supabase secrets set WA_ACCESS_TOKEN=EAA...
supabase secrets set WA_BUSINESS_ID=...
```

⚠️ **El access token temporal dura 24h.** Para producción necesitás un **System User permanent token** (paso 3.6).

#### 3.4 — Verificar que podés enviar

En el panel de Meta, agrega tu número de WhatsApp personal como **"Test number"** y mandate un mensaje de prueba con el template `hello_world`.

O probá la Edge Function:
```bash
curl -X POST "https://<tu_project>.supabase.co/functions/v1/whatsapp-send" \
  -H "Authorization: Bearer <tu_anon_key>" \
  -H "Content-Type: application/json" \
  -d '{"to":"+15125551234","type":"text","text":"Hola desde Empresa OS 👋"}'
```

#### 3.5 — Configurar webhook (para que el bot reciba respuestas)

En el panel WhatsApp → **"Configuration"**:

1. **Callback URL**: `https://<tu_project>.supabase.co/functions/v1/whatsapp-webhook`
2. **Verify token**: inventá uno (ej. `mi_token_secreto_123`) — pegá el mismo acá Y como secret:
   ```bash
   supabase secrets set WA_VERIFY_TOKEN=mi_token_secreto_123
   ```
3. Click **"Verify and save"** — debería decir ✓ verified.
4. En **"Webhook fields"** suscribíte a: `messages`, `message_template_status_update`.

#### 3.6 — Token permanente (para producción)

1. En Business Settings → **Users → System Users** → Create
2. Asignar al system user el rol `Admin` de tu WhatsApp Business Account
3. **Generate new token** → permisos: `whatsapp_business_messaging`, `whatsapp_business_management`
4. ⚠️ Copialo y guardalo seguro. Reemplazá el secret:
   ```bash
   supabase secrets set WA_ACCESS_TOKEN=<token-permanente>
   ```

#### 3.7 — Templates de mensajes (para iniciar conversaciones)

WhatsApp solo permite mandar **templates pre-aprobados** para iniciar conversaciones nuevas (después de 24h sin actividad del usuario).

Para el daily push, creá un template:
1. En Meta panel → **WhatsApp → Message Templates** → **Create template**
2. Categoría: **Utility**
3. Name: `daily_push`
4. Language: Spanish (Mexico) `es_MX`
5. Header: vacío
6. Body:
   ```
   Buenos días {{1}} 👋

   Hoy en tu lista ({{2}} tareas):

   {{3}}

   📲 Cuando termines una mandame el número + "ok" (ej: "1 ok"). Si las cerrás todas mandá "TODAS". ¡Vamos!
   ```
7. Submit. Meta aprueba en ~1h.

Una vez aprobado, el `pm-daily-push` puede usarlo con `type:'template'`. Mientras tanto usa `type:'text'` que funciona si el destinatario te escribió en las últimas 24h.

### Paso 4 — Cargá los destinatarios

Refrescá tu app productiva → Sidebar → área **🎯 Project Management** → click sistema **Dashboard PM** → tab **📱 WhatsApp** → botón **"+ Agregar"** por cada miembro:
- Roberto (+1512...)
- Eduardo (+1512...)
- Óscar (+1512...)
- Michell (+1512...)
- ...

El campo **"ClickUp username"** es crítico — tiene que matchear **exactamente** el username con el que aparecen como `primary_assignee` en `clickup_tasks_mirror`. Si no matchea, no van a recibir sus tasks.

### Paso 5 — Setear group_chat_id (para el reporte 8pm)

En tab WhatsApp → "Group chat ID" → pegá el ID del grupo de WhatsApp donde llegue el reporte.

Para obtener el ID del grupo:
- En WhatsApp Web → abrí el grupo → URL será `https://web.whatsapp.com/accept?code=xxx` — necesitás el `serialized` id. La forma más fácil: usá el endpoint `https://graph.facebook.com/v18.0/<phone_number_id>/conversations` después de que el grupo te escriba.

Alternativa rápida: usá un número personal en lugar de grupo (ej. el tuyo) hasta que tengas el grupo configurado.

### Paso 6 — Activá el bot

En tab WhatsApp → toggle **"Activo"** de Pausado a **🟢 Activo**.

### Paso 7 — Test manual

Click **"⚡ Correr push ahora"** → debería mandar el daily a todos los recipients activos. Verificá en sus WhatsApps que llegó.

### Paso 8 — Git push

```bash
cd "/Users/nicolara/Desktop/CLAUDE CODE/empresa-os"
git add .
git commit -m "feat(pm): sprint 8 — área Project Management completa con WhatsApp daily loop, scorecard, IA, risks, compliance"
git push
```

---

## 🔍 Verificación final (smoke tests SQL)

```sql
-- Área + sistema
select * from public.areas where id = 'pm';
select * from public.systems where area_id = 'pm';

-- Scorecard
select * from public.pm_scorecard;

-- Cron jobs activos
select jobname, schedule, active from cron.job where jobname like 'pm-%' order by jobname;

-- Recipients
select full_name, phone_number, clickup_username, active, receives_daily_push from public.pm_whatsapp_recipients;

-- Dailies de la semana
select assigned_date, recipient_id, tasks_total, tasks_done, status from public.pm_daily_assignments order by assigned_date desc limit 20;

-- Últimos mensajes
select direction, phone_number, message_type, status, sent_at from public.pm_whatsapp_messages order by sent_at desc limit 20;
```

---

## 🎯 Cómo funciona el Daily Loop (visual)

```
Mon-Sat
  7:00 AM Texas
    ↓
  cron pg_cron dispara `pm-daily-push`
    ↓
  Para cada recipient activo con receives_daily_push=true:
    - SELECT tasks de clickup_tasks_mirror con due_date=hoy + assignee = clickup_username
    - Arma mensaje formateado con nombres + emojis + lista numerada
    - POST a whatsapp-send con type:text
    - INSERT en pm_daily_assignments con tasks jsonb
    ↓
  Roberto recibe en WhatsApp:
    "Buenos días Roberto 👋
     Hoy en tu lista (5 tareas):
     1. ☐ 🟠 Demo Childress [Childress]
     2. ☐ Recoger material Home Depot
     3. ☐ Reporte semanal Picnic
     ...
     📲 Cuando termines respondé '1 ok'..."

🟢 Durante el día (cualquier hora)
    ↓
  Roberto responde "1 ok"
    ↓
  WhatsApp → webhook → `whatsapp-webhook`
    ↓
  parseCloseIntent detecta intent {kind:'index', index:1}
    ↓
  handleTaskClose:
    - Marca tasks[0].done = true en pm_daily_assignments
    - POST a clickup-execute con close_task + comment "Cerrada via WhatsApp por Roberto"
    - Update tasks_done++
    ↓
  Responde a Roberto: "✅ Marcada. Te quedan 4 en la lista."

  6:00 PM Texas
    ↓
  cron dispara `pm-daily-close`
    ↓
  Para cada daily NO closed:
    - SELECT pendientes
    - Para cada pendiente: clickup-execute comment "Movida automáticamente a mañana"
    - Manda WhatsApp con score del día + lista de pendientes movidas
    ↓
  Roberto recibe:
     "🟡 Día normal.
      📊 Cierre del día 4/5 (80%)
      📅 1 pendiente se mueve a mañana:
      1. Reporte semanal Picnic
      ..."

  8:00 PM Texas
    ↓
  cron dispara `pm-group-report`
    ↓
  - Agregado cross-equipo
  - POST whatsapp-send con grupal_chat_id
    ↓
  Grupo recibe:
     "📊 Cierre del día — viernes 30 de mayo
      ✅ Roberto: 4/5 (80%)
      ⚠️ Eduardo: 2/6 (33%) · 4 a mañana
      ✅ Michell: 8/8 (100%)
      ...
      📈 Total: 18/24 (75%) · 6 a mañana
      🏆 Buen día equipo!"
```

---

## 🧠 IA Agente (Weekly Business Review)

Cada lunes 7am Texas:
1. `pm-weekly-review` carga: pm_scorecard, alertas críticas, remodel_snapshots últimos 7d, clickup último snapshot, dailies de la semana, acciones pendientes
2. Llama a Claude Sonnet con prompt orientado a accionabilidad
3. Claude responde JSON con:
   - `executive_summary` (3 párrafos rioplatense)
   - `kpis` (5-8 números clave)
   - `alerts` (max 5 priorizadas)
   - `recommendations` (max 5 con responsable sugerido)
   - `this_week_focus` (1 frase macro)
4. Upsert en `pm_executive_reports`
5. Manda resumen al grupo WhatsApp

Costo: ~$0.03 por ejecución. Mensual: ~$0.12.

---

## 📋 Ideas para sprints futuros (no implementadas)

- **8-G** — Cuando una obra cierra → trigger auto-recalc benchmarks del Estimador
- **8-H** — Cuando inquilino se va → trigger checklist turnover en backlog de Juan
- **8-I** — Calendar integration (Google Calendar / iCal) para tus reuniones
- **8-J** — Telegram fallback si WhatsApp falla
- **8-K** — Mobile-first daily companion (PWA) para el supervisor
- **8-L** — Streak gamification para crews
- **8-M** — Workload auto-balancer que ejecuta redistribución contra ClickUp
- **8-N** — Risk auto-detector via Claude sobre alertas + snapshots
- **8-O** — Quarterly OKR scoreboard con auto-tracking

---

## ✅ Cierre del Sprint 8

Quedó construida el **área #6 de Empresa OS**: Project Management. Con esto el sistema:
- Tiene **scorecard único** que cruza las 5 áreas (Remodelación + Rentas + Fix&Flip + Coordinación + PM)
- Tiene **Daily Loop bidireccional vía WhatsApp** Mon-Sat con cierre automático
- Tiene **Weekly Business Review IA** los lunes 7am
- Tiene **risk register + compliance tracker** persistentes
- Tiene **dependencias cross-empresa** trackeadas

**Total acumulado tras 8 sprints**:
- 6 áreas en Empresa OS
- ~7,000 LOC entre los JS principales
- 22 schemas SQL aplicados
- 8 Edge Functions (remodel-ai, clickup-execute, clickup-ai-agent, sync-*, whatsapp-send, whatsapp-webhook, pm-daily-push, pm-daily-close, pm-group-report, pm-weekly-review)
- pg_cron corriendo 6 jobs diferentes
