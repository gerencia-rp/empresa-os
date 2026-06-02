# Sprint 9 — PM Pro · Multi-empresa + Performance Management

Extiende el área Project Management de Sprint 8 con todo lo necesario para gestionar 4+ empresas, medir performance por persona, OKRs trimestrales, coaching estructurado y IA proactiva.

## 🎁 Lo que se entrega

### Schema (`supabase/s9-pm-pro.sql`)
- **`pm_companies`** — multi-empresa con clickup_space_id, color, icon
- **`pm_performance_weekly`** — métricas semanales por persona × empresa con 5 scores (completion/quality/velocity/capacity/composite) + trend
- **`pm_okrs`** + **`pm_okr_progress`** — OKRs trimestrales con KRs medibles
- **`pm_one_on_ones`** — coaching 1:1 con agenda IA + action items
- **`pm_coaching_prompts`** — playbook semanal generado por IA
- **Vistas**: `pm_bottleneck_heatmap`, `pm_executive_cross_company`, `pm_performance_leaderboard`
- **Cron jobs nuevos**: `pm-compute-performance-mon-6am`, `pm-coaching-prompts-mon-7am`
- `clickup_tasks_mirror` y `clickup_snapshots` ahora tienen `company_id`

### Edge Functions nuevas
- **`sync-clickup`** (refactor) — itera `pm_companies.clickup_space_id`, syncea cada space, etiqueta tasks con company_id
- **`pm-compute-performance`** — calcula los 5 scores por persona × empresa × semana, detecta tendencia vs semana anterior
- **`pm-prepare-1on1`** — Claude prepara agenda del 1-on-1 con data real (4 semanas perf + tasks + alertas + dailies + last 3 1-on-1s)
- **`pm-coaching-prompts`** — Claude analiza al equipo entero y genera playbook semanal con sugerencias priorizadas. Manda resumen al CEO via WhatsApp.

### UI (`pm-dashboard.js` extendido — 15 tabs total)
**Nuevas tabs:**
- 🏢 **Cross-Empresa** — dashboard ejecutivo con N empresas comparativas
- 🏆 **Performance** — leaderboard con 5 scores, tendencia, tier
- 🎯 **OKRs** — CRUD trimestral con barras de progreso por KR
- 💬 **1-on-1s** — agenda con IA pre-preparada
- 🧠 **Coaching IA** — playbook semanal con prompts priorizados
- 🔥 **Heatmap** — status × tiempo de bloqueo (cuellos de botella visuales)
- 🏛️ **Empresas** — CRUD config de empresas + clickup_space_ids

## 🚀 Setup

### Paso 1 — SQL único

Pegá el contenido entero de `supabase/s9-pm-pro.sql` en el SQL Editor y Run.

Verificá:
```sql
select name, slug, clickup_space_id, active from public.pm_companies order by position;
select * from public.pm_executive_cross_company;
select * from public.pm_bottleneck_heatmap limit 10;
select jobname, schedule from cron.job where jobname like 'pm-%' order by jobname;
```

Deberías ver 4 empresas seed (Holding, Remodelación, Rentas, Fix&Flip) y 2 cron jobs nuevos.

### Paso 2 — Configurá los Space IDs de ClickUp

En la app → Área Project Management → Dashboard PM → tab **🏛️ Empresas** → editá cada empresa con su `clickup_space_id`:

**Cómo encontrar el Space ID:** abrí tu ClickUp space en el navegador → la URL será `https://app.clickup.com/<team_id>/v/s/<space_id>`. Copiá el `space_id` (números).

Pegá cada uno en su empresa correspondiente. Cuando estén cargados, click "+ Empresa" si tenés más empresas que las 4 seed.

### Paso 3 — Deploy las 4 Edge Functions

```bash
cd "/Users/nicolara/Desktop/CLAUDE CODE/empresa-os"
supabase functions deploy sync-clickup --no-verify-jwt --use-api
supabase functions deploy pm-compute-performance --no-verify-jwt --use-api
supabase functions deploy pm-prepare-1on1 --no-verify-jwt --use-api
supabase functions deploy pm-coaching-prompts --no-verify-jwt --use-api
```

### Paso 4 — Primera sincronización multi-empresa

Andá al dashboard ClickUp Análisis → click **🔄 Sync** — ahora itera todas las empresas activas con space_id configurado. El alert te muestra cuántas tasks se sincronizaron de cada una.

Verificá:
```sql
select c.name, count(t.*) as tasks
from public.pm_companies c
left join public.clickup_tasks_mirror t on t.company_id = c.id
group by c.name order by 2 desc;
```

### Paso 5 — Calculá los performance scores

En Dashboard PM → tab **🏆 Performance** → click **"🧮 Recalcular ahora"**. Te calcula los scores de la semana actual.

### Paso 6 — Generá el primer coaching playbook

En tab **🧠 Coaching IA** → click **"🧠 Generar ahora"**. Claude analiza al equipo y propone sugerencias. Si tenés un recipient con `role='pm'` y un teléfono cargado, el resumen te llega por WhatsApp.

### Paso 7 — Programá el primer 1-on-1

Tab **💬 1-on-1s** → **"+ Programar 1-on-1"** → elegís persona + fecha + cadencia.

Después click **"🧠 Preparar IA"** en ese 1-on-1 → Claude lee los últimos 28 días de esa persona y arma la agenda completa (performance, lo crítico, reconocimiento, acción coaching, preguntas abiertas).

### Paso 8 — Definí OKRs del trimestre

Tab **🎯 OKRs** → **"+ OKR"**:
- Elegí empresa
- Quarter (formato `2026-Q2`)
- Objetivo (ej. "Cerrar 6 obras con margen ≥25%")
- 3 KRs medibles con target numérico (ej. "Margen promedio ≥ 25 %", "Obras cerradas ≥ 6 obras", "Tiempo promedio ≤ 70 días")

### Paso 9 — Git push

```bash
git add .
git commit -m "feat(pm): sprint 9 — multi-empresa + performance + OKRs + 1on1s + coaching IA"
git push
```

## 🔁 Cómo funciona el loop semanal (visual)

```
Lunes 6:00 AM Texas
  ↓ cron pm-compute-performance
  ↓ Calcula 5 scores por cada persona × cada empresa de la semana
  ↓ Detecta tendencia (up/flat/down/new)
  ↓ Upsert en pm_performance_weekly

Lunes 7:00 AM Texas
  ↓ cron pm-weekly-review (S8)
  ↓ Weekly Business Review IA al grupo central via WhatsApp

Lunes 7:30 AM Texas
  ↓ cron pm-coaching-prompts
  ↓ Claude lee leaderboard + alertas + dailies
  ↓ Genera playbook con 5-10 sugerencias accionables
  ↓ Guarda en pm_coaching_prompts
  ↓ Manda top 5 al CEO via WhatsApp:
     "🎯 Coaching playbook — semana del 27 may
      
      5 sugerencias generadas. Top 5:
      1. 🚨 Intervenir Eduardo: 3 sem score <60, sobrecargado
      2. 🏆 Reconocer Michell: 5 sem >85, lidera leaderboard
      3. ⚠️ Reasignar 8 tasks de Roberto a Diego
      4. 📌 Capacitar a Vato en plomería
      5. ℹ️ Hablar con Luis sobre lead time"

Durante la semana
  ↓ Vos abrís Dashboard PM → 💬 1-on-1s
  ↓ Programás 1-on-1 con Eduardo (lunes 3pm)
  ↓ Click "🧠 Preparar IA" → Claude arma la agenda con su data:
     **Performance**: Score 58, ↓ desde 72 (3 sem). Foco: capacity bajo (40%).
     **Lo crítico**: 3 tasks vencidas en obra Picnic, alerta "Childress estancada", carry-over de 8 tasks en la semana.
     **Coaching action**: Reducir su daily a 5 tareas, no 12.
     **Preguntas**: ¿Qué te bloquea cerrar las de Picnic? ¿Necesitás ayuda con plomería?

Lunes siguiente
  ↓ Loop se repite. Performance recalculada. Tendencia visible.
```

## 📊 Cómo se calculan los scores

| Score | Fórmula | Peso |
|---|---|---|
| **Completion** | tasks_completed / tasks_assigned × 100 | 30% |
| **On-time** | tasks_completed_ontime / tasks_completed × 100 | 20% |
| **Quality** | 100 − (overdue/assigned × 50) | 20% |
| **Velocity** | 50 + (team_avg_lead / person_lead − 1) × 50 | 15% |
| **Capacity** | daily_done / daily_total × 100 (del WhatsApp) | 15% |
| **Composite** | Σ weighted | 100% |

**Tiers** (basado en composite):
- 🏆 **Top** (≥85)
- ✅ **Bueno** (70-84)
- 🟡 **Atención** (50-69)
- 🔴 **Crítico** (<50)

**Tendencia**: compara composite_score con semana anterior. delta > +5 = up, < -5 = down, intermedio = flat.

## 💡 Tips de uso

1. **Empezá conservador con las cron**: dejá los jobs pero NO activés el daily loop de S8 hasta confirmar que los recipients y los space_ids están bien. Una sync errónea con teléfonos equivocados es vergonzosa.

2. **OKRs**: poné max 3-4 OKRs por empresa por trimestre. Más es ruido.

3. **1-on-1s**: cadence recomendada — weekly con lideres clave, biweekly con specialists, monthly con office staff.

4. **Coaching IA**: Claude es bueno con datos pero no conoce la dinámica humana. Usá sus sugerencias como punto de partida, no como verdad absoluta.

5. **Heatmap**: la zona roja superior derecha (tareas en algún status 15d+) son las más graves. Atendé esas primero.

## 🎉 Estado del sistema tras Sprint 9

- **6 áreas** en Empresa OS
- **~9,000 LOC** total
- **24 schemas SQL** aplicados
- **15 Edge Functions** en producción
- **9 cron jobs** corriendo
- **15 tabs** en el Dashboard PM
- **Performance management end-to-end**: medir → coaching IA → 1-on-1 estructurado → OKRs trimestrales → loop semanal

Tu área de Project Management ahora es literalmente un **CPO/COO en una caja** que mide al equipo, te dice qué hacer y mantiene la operación apretada.
