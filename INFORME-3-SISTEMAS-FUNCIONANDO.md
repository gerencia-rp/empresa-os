# 🎓 Sistema Educativo · 3 sistemas conectados al 1000%

**Fecha:** 12 jun 2026
**Quién:** rental profits
**Objetivo:** Que un coach pueda hacer seguimiento real a 5+ estudiantes por semana, ver datos para junta directiva, y entregar informe accionable al área de marketing.

---

## 1 · Lo que se construyó

### 🎯 Sistema 1 · Mentorías Manager (CRM operativo del coach)

**Dashboard ahora arranca con la vista que más importa:**

🔥 **Seguimientos del día** — Top 5 estudiantes priorizados automáticamente por un score 0-100 que combina:
- Días sin contactarlos (peso 3×, máx 40 puntos)
- Días sin abrir el portal (peso 2×, máx 30 puntos)
- Estado de pago no-activo (+25 puntos)
- GLScore bajo <40 (+15 puntos)

Cada card de estudiante muestra: nombre, etapa actual, **2 motivos puntuales** por los que está priorizado, y 3 botones de acción:
- 💬 **WhatsApp** — abre modal con mensaje contextualizado
- 👁 **Ver ficha** — abre detalle del estudiante
- 📝 **Registrar contacto** — log de llamada/sesión presencial/email

**Modo "Sesión de seguimiento"**: botón verde "▶️ Empezar sesión seguimiento" abre los 5 estudiantes en cadena (uno tras otro). El coach hace los 5 seguimientos en 10-15 minutos sin elegir manualmente a cuál atender.

**Bridge a los otros 2 sistemas**: cards grandes para ir directo a Informes Ejecutivos o Metodología FlipMentoría.

### 💬 WhatsApp helper inteligente (contextualizado + logueado)

Antes el modal tenía 6 templates genéricos. Ahora:

**13 templates agrupados por 5 categorías:**
- 🔥 Seguimiento operativo (4): pregunta por tarea específica, check-in, recordá plan, cierre semana
- 📅 Sesiones (3): agendar, recordatorio, post-sesión
- 🎉 Refuerzo (2): felicitación logro, animar (semana floja)
- 🚨 Riesgo (2): reactivación, pago
- 🎯 Onboarding (2): invitación diagnóstico, mandá portal

**Cada template usa placeholders dinámicos**:
- `{nombre}` → primer nombre
- `{etapa}` → nombre de la etapa actual
- `{tarea}` → próxima tarea pendiente del plan
- `{dias_sin_contacto}` → cuántos días pasaron desde el último mensaje
- `{progreso}` → % o GLScore

El modal de WA muestra arriba 3 badges contextuales: **Etapa · Días sin contacto · Tarea actual**.

**Logging automático**: cuando el coach abre WA, se inserta una fila en `edu_student_interactions` con: canal, template_id, mensaje, outcome="sent", timestamp. Trigger SQL actualiza `last_contact_at` en `edu_students` automáticamente.

### 📘 Sistema 2 · Metodología FlipMentoría

- Header tiene 2 botones nuevos: "🎓 CRM Mentorías" y "📋 Informe ejecutivo" para navegar entre los 3 sistemas sin perder contexto.
- Conserva: biblioteca, diagnóstico, crédito (12 fases · 49 acciones).

### 📋 Sistema 3 · Informes Ejecutivos (board + marketing)

**Sección A · Resumen Ejecutivo en vivo** (board-friendly, ya estaba):
- 5 KPIs hero, embudo por etapa, top cohortes, distribución de perfiles, insights ejecutivos automáticos.

**🆕 Sección B · Dashboard Marketing & Ventas** (nueva, lo que pediste):
1. **4 KPIs hero MKT**: Leads totales · Conv. global · Revenue 30d · Logins por estudiante
2. **Origen + conversión por canal** (tabla con leads, clientes, conv%, revenue)
3. **Engagement actual** (activos / tibios / fríos / nunca abrió portal)
4. **Perfiles del cliente** desde diagnóstico (barras con %)
5. **💡 Análisis de respuestas del diagnóstico** — 3 columnas:
   - Top metas declaradas
   - Top obstáculos / objeciones
   - Nivel de experiencia
6. **Top 5 lecciones más vistas + Top 5 tareas más completadas** (tiempos por proceso)
7. **Ranking de templates WhatsApp por % de respuesta** (saber qué mensaje funciona)
8. **🚀 Recomendaciones accionables autogeneradas** para campañas, con categorías color-coded: CAMPAÑA · MENSAJE · RETENCIÓN · PRODUCTO · COMUNICACIÓN · CANAL
9. **Export CSV** para mandarle al equipo de marketing

---

## 2 · Schema SQL que hay que correr en Supabase

**Archivo:** `supabase/edu-tracking-schema.sql`

Crea:
- `edu_student_interactions` — log de cada WhatsApp/llamada/email del coach
- `edu_student_activity` — log de actividad del estudiante en el portal
- Columnas nuevas en `edu_students`: `lead_source`, `lead_campaign`, `lead_date`, `conversion_date`, `lead_value`, `last_contact_at`, `last_activity_at`, `last_template_id`
- Vistas: `edu_mkt_acquisition`, `edu_mkt_engagement`, `edu_mkt_bottleneck`, `edu_student_followup_score`
- 2 triggers automáticos: actualizar `last_contact_at` y `last_activity_at` desde las tablas de log
- RLS habilitado

**Cómo correr:**
1. Abrí Supabase → SQL Editor
2. Pegá el contenido de `supabase/edu-tracking-schema.sql`
3. Run
4. Verificá: `SELECT * FROM edu_student_followup_score ORDER BY urgency_score DESC LIMIT 5;`

---

## 3 · Cómo correr el flujo real con 5 estudiantes (paso a paso)

### Lunes 8am — Sesión de seguimiento (10-15 min)

1. Abrí **Educación → Mentorías Manager**
2. Tab Dashboard arranca con **🔥 Seguimientos del día · Top 5**
3. Click en **"▶️ Empezar sesión seguimiento"**
4. Se abre el modal de WhatsApp del primer estudiante:
   - Ya trae phone + código país
   - Elegí una plantilla (ej. "✅ Pregunta por tarea") — se reemplaza automático con su nombre + tarea pendiente + etapa
   - Click "💬 Abrir WhatsApp" → se abre wa.me con el mensaje listo
   - Mandás en WhatsApp Web → cerrás
5. Modal se cierra, pasás al siguiente estudiante automático. Repetís 4 veces más.
6. Cada envío se loguea en `edu_student_interactions` y actualiza `last_contact_at`.

### Durante la semana — Respuestas

- Cuando el estudiante responde, abrís su ficha (click 👁 en el card) y registrás con **📝 Registrar contacto**:
  - Canal: llamada/email/etc
  - Outcome: respondió / agendamos / no respondió
  - Notas: resumen de 2 líneas
- Esto alimenta el ranking de templates: si el "Pregunta por tarea" tiene 70% de respuesta y "Check-in genérico" tiene 20%, **lo verás en el dashboard marketing**.

### Viernes 5pm — Informe para Junta y Marketing

1. **Educación → Informes Ejecutivos**
2. Primera sección: **Resumen Ejecutivo** (5 KPIs hero, embudo, insights board-ready) → screenshot para junta
3. Segunda sección: **Dashboard Marketing**:
   - Mirá qué perfil del diagnóstico domina → ese es el target de tu próxima campaña
   - Mirá las objeciones más comunes → ese es el mensaje a usar en ads
   - Mirá qué canal convierte mejor → ahí va el presupuesto
   - Mirá qué template de WA tiene más respuesta → ese tono va a email marketing
   - Click **"📥 Export CSV"** → mandás al equipo MKT

---

## 4 · Cómo se conectan los 3 sistemas

| Desde | Hacia | Cómo |
|---|---|---|
| CRM Dashboard | Informes Ejecutivos | Card grande "📋 Informe ejecutivo" |
| CRM Dashboard | Metodología | Card grande "📘 Metodología FlipMentoría" |
| CRM Dashboard | Calendario/Alertas/Progreso | Botones de atajo |
| Informes Ejecutivos (header) | CRM | "🎓 Ver CRM →" |
| Informes Ejecutivos (header) | Metodología | "📘 Ver Metodología →" |
| Informes (banda alertas) | CRM tab Alertas | "Ver alertas →" |
| Metodología (header) | CRM | "🎓 CRM Mentorías" |
| Metodología (header) | Informes | "📋 Informe ejecutivo" |

**Sincronización de estado**: cuando seleccionás un estudiante en el CRM, se sincroniza `eduState.selectedStudentId` y `fmState.diagStudentId`. Si abrís Metodología, el diagnóstico ya carga ese estudiante.

---

## 5 · Lo que queda por hacer (para llegar al 1000% real)

1. **Loggear actividad del estudiante en el portal**: por ahora el frontend solo loguea las interacciones del coach. Para que el dashboard marketing muestre "lecciones más vistas" y "tiempos por proceso" hay que insertar a `edu_student_activity` cuando el estudiante:
   - Abre el portal (`portal_login`)
   - Abre una tarea (`task_view`)
   - Marca tarea como hecha (`task_complete` + `duration_seconds`)
   - Abre una lección (`lesson_view`)
   - Esto va en `student-portal.js` o donde esté el portal del estudiante. Pequeño wrapper de 20 líneas.

2. **Capturar `lead_source` al crear estudiante**: agregar dropdown al form de "Nuevo estudiante" con: instagram, fb_ads, referral, webinar, organic, youtube, tiktok. Mientras tanto, podés UPDATE manual en SQL.

3. **Reply tracking en interacciones**: el outcome se setea como "sent" automático. Cuando el estudiante responde, el coach lo marca manual en "📝 Registrar contacto" con outcome="answered". Si tuvieras Twilio o WA Business API conectado, esto se automatizaría.

4. **Sección en CRM Estudiantes para editar lead_source / lead_value**: ahora hay que hacerlo por SQL. Si querés, puedo agregar el campo al modal de edición de estudiante.

---

## 6 · Archivos modificados

- `education.js` — Dashboard CRM, Seguimientos del día, helpers `eduCalcFollowupScore`, `eduStartFollowupSession`, `eduQuickLogInteraction`, dashboard marketing `eduRenderMarketingDashboard`, `eduLoadMarketingData`, export CSV
- `edu-whatsapp.js` — Templates reescritos con categorías y placeholders contextuales, `eduGetStudentContext`, `eduFillTemplate`, `eduLogInteraction`, modal de WA con badges de contexto
- `supabase/edu-tracking-schema.sql` — **NUEVO** (correr en Supabase)
- `INFORME-3-SISTEMAS-FUNCIONANDO.md` — este documento

---

## 7 · Mentalidad detrás del diseño

**Como experto Fix & Flip**: el plan del estudiante es lo único que mueve la aguja. El sistema tiene que recordarle todos los días qué tarea concreta hacer, sin que el coach tenga que cargar 10 cosas. Por eso `{tarea}` en los templates trae la *primera pendiente del plan*, no una genérica.

**Como educador**: el aprendizaje pasa por la repetición y la retroalimentación rápida. Los seguimientos cortos de 5×3 minutos por WhatsApp son mejores que 1 sesión de 60 minutos sin tracking. El sistema empuja al coach a hacer ese ritmo.

**Como analista**: lo que no se mide no mejora. Cada interacción ahora se loguea. Cada respuesta del estudiante se categoriza. El dashboard marketing surfacea automáticamente qué funciona y qué no — sin que el coach tenga que hacer pivot tables en Excel. Las recomendaciones se autogeneran de los datos.

Esto está armado para que en 4 semanas tengas datos suficientes para tomar decisiones de marketing y producto **basadas en evidencia**, no en intuición.
