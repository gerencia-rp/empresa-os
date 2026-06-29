# Empresa OS — Rental Profitss

Sistema operativo de la empresa: **Fix & Flip**, **Remodelación**, **Rentas**, **Educación** (mentorías), **Project Management**.

App live: **https://empresa-os.vercel.app**

---

## 🚀 Setup local

```bash
git clone https://github.com/gerencia-rp/empresa-os.git
cd empresa-os

# 1. Config local (anon keys gitignored)
cp config.example.js config.js
# editar config.js con SUPABASE_URL + SUPABASE_ANON_KEY

# 2. Instalar deps de build (esbuild)
npm install

# 3. Dev server (sin build, scripts individuales — recarga inmediata)
npm run dev          # → http://localhost:5173

# 4. Build prod (concatena + minifica + hash automático)
npm run build        # → dist/
```

## 🏗️ Arquitectura

### Frontend
- **Vanilla JS** (sin framework). Funciones globales + `window.*`. No ES modules.
- **Tailwind CSS** vía CDN. Sin paso de build de CSS.
- **20+ archivos JS** organizados por sistema, cargados en orden por el bundler.
- **Build**: `scripts/build.mjs` concatena los `.js` (preservando los globals) y minifica con esbuild. Genera `dist/assets/bundle.[hash].js` con cache infinito.

```
empresa-os/
├── index.html              # Marca [BUNDLE] ... [/BUNDLE] reemplazada en prod
├── app.js                  # Auth, MFA, áreas, sistemas, modales globales
├── ui-toolkit.js           # toast, confirmDialog, esc, usd, safeEvalFormula
├── lib/
│   └── deal-rules.js       # MAO, BRRRR, cap rate (fórmulas Fix&Flip)
├── education.js            # Manager mentorías (core)
├── edu/
│   ├── edu-fm-bloques.js       # Biblioteca de bloques Miguel Guzmán
│   ├── edu-fm-vista-plan.js    # Vista plan generado
│   ├── edu-fm-diagnostico.js   # Wizard diagnóstico clínico
│   ├── edu-presentations.js    # Builder PPTX + layouts
│   ├── edu-credit.js           # Diagnóstico de crédito
│   ├── edu-calendar.js         # Calendario sesiones + Google Calendar
│   └── edu-reports.js          # KPIs + informe ejecutivo profundo
├── edu-whatsapp.js         # Campañas WhatsApp masivas con IA
├── remodel-pro.js          # Estimador Pro (core)
├── rm/
│   ├── rm-tab-editor.js        # Tab editor de actividades
│   ├── rm-tab-seguimiento.js   # Tracking en vivo % vs presupuesto
│   ├── rm-tab-versions.js      # Snapshots + change orders
│   ├── rm-tab-assets.js        # Matterport + planos + audio
│   ├── rm-tab-sow.js           # Scope of Work para lenders
│   ├── rm-tab-gantt.js         # Cronograma con inspecciones + CPM
│   ├── rm-export.js            # Excel multi-sheet
│   └── rm-sync-planner.js      # Sync → Weekly Planner
├── remodel-forecast.js     # Pronosticador rápido (Taskade JSON)
├── weekly-planner.js       # Calendario obra (casas × días)
├── ops-planner.js          # Cronograma Juan Austin (zonas + recurrentes)
├── rental-predictor.js     # Predictor cashflow rentas
├── loan-calculator.js      # HML + DSCR + BRRRR check
├── property-analyzer.js    # Análisis profundo IA de propiedad
├── estimator.js            # Estimador rápido $/sqft
├── remodel-dashboard.js    # Dashboard obras
├── clickup-dashboard.js    # Sync ClickUp
├── pm-dashboard.js         # Project Management (1-on-1, performance)
└── scripts/
    ├── build.mjs           # Build prod (concatena + minifica + hash)
    └── serve.mjs           # Dev server estático
```

### Backend (Supabase)

```
supabase/
├── *.sql                          # Schemas + migrations (correr en SQL Editor)
└── functions/                     # Edge functions (Deno)
    ├── _shared/
    │   ├── auth.ts                # requireAuth(req, {requireAdmin})
    │   ├── anthropic.ts           # callAnthropic con retry + log
    │   ├── deal-rules.ts          # Mismo MAO/BRRRR que cliente
    │   └── cors.ts                # CORS whitelist
    ├── generate-presentation/     # PPT con web_search live
    ├── fm-ai-coach/               # Coach metodología FM
    ├── ai-deep-analyze/           # Análisis profundo multi-sistema
    ├── deep-property-analysis/    # Análisis propiedad con MAO determinístico
    ├── remodel-ai/                # Agente IA del Estimador Pro
    ├── edu-whatsapp-generate/     # Mensajes WhatsApp personalizados IA
    ├── edu-whatsapp-analyze-response/  # Análisis respuesta + actualiza plan
    ├── admin-set-password/        # Admin reset password
    ├── delete-user/               # Borrar usuario completo (profile+auth)
    ├── invite-user/               # Invitar con rol + áreas
    ├── update-airtable-record/    # Sync inverso a Airtable
    └── sync-*                     # Sync con Airtable / ClickUp
```

## 🔐 Seguridad

- **JWT obligatorio** en todas las edge functions sensibles (`requireAuth`).
- **RLS estricto**: `properties` y `remodel_projects` UPDATE/DELETE solo admin.
- **CSP header** en `vercel.json` con whitelist de dominios.
- **Password complexity**: mínimo 8 chars + 3 de 4 reglas (mayúscula/minúscula/número/símbolo).
- **MFA TOTP** opcional en perfil (compat Authy/Google Authenticator/1Password).
- **Audit log** con `auth.uid() = actor_id` (no falsificable).
- **CORS whitelist** explícita (no `*`).
- **safeEvalFormula** reemplaza `new Function()` (RCE) en calculadoras user-defined.

## 🤖 Llamadas IA

Toda llamada a Anthropic pasa por `_shared/anthropic.ts`:
- Retry exponencial en 429/529/5xx (1s, 3s, 9s).
- Timeout configurable (60s - 8min según pesadez).
- Logging automático en `ai_calls` con tokens, duration, cache hits, errores.
- `checkRateLimit(user_id, windowMin, maxCalls)` con datos reales de `ai_calls`.

Dashboard de costos: `select * from ai_calls_monthly order by mes desc;`

## 📅 Deploy

```bash
# Frontend (auto via Vercel)
git push origin main         # Vercel: npm install + npm run build → dist/

# Edge functions (después de cambios)
cd "/Users/nicolara/Desktop/CLAUDE CODE/empresa-os"
for f in generate-presentation fm-ai-coach ai-deep-analyze deep-property-analysis remodel-ai \
         edu-whatsapp-generate edu-whatsapp-analyze-response \
         admin-set-password delete-user invite-user; do
  npx supabase functions deploy "$f" --no-verify-jwt=false
done

# SQL (al agregar features)
# Abrir Supabase Dashboard → SQL Editor → pegar contenido de supabase/*.sql
```

## 📤 Workflow diario

```bash
git pull origin main         # antes de empezar
# ... trabajar ...
git add .
git commit -m "feat: ..."
git push origin main         # auto-deploy Vercel
```

## 🔑 Credenciales

| Archivo | Qué guarda | Status |
|---|---|---|
| `config.public.js` | Anon key Supabase | ✅ committed (safe con RLS) |
| `config.js` | Override local opcional | 🚫 gitignored |
| Supabase Secrets | `ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | ⚙️ env vars Supabase |
| Vercel | `APP_URL` | ⚙️ env vars Vercel |

**Nunca commitear:** `config.js`, `.env`, service role keys.

## 📊 Stack resumen

| Capa | Tech |
|---|---|
| Frontend | Vanilla JS + Tailwind CDN |
| Bundling | esbuild (script propio) |
| Hosting | Vercel (static) |
| Backend | Supabase (Postgres + Auth + Edge Functions) |
| Edge runtime | Deno |
| Auth | Supabase Auth + MFA TOTP |
| IA | Anthropic Claude (Sonnet 4.5 / 4.6) con web_search |
| Storage | Supabase Storage (planos, audio, fotos) |

## 🧪 Audit / health check

Ver la lista de findings en commits `audit: ...` o leer el changelog que arranca con `feat:`, `fix:`, `batch N:`.

Últimos cambios estructurales:
- Batch 1-6: 50+ fixes priorizados (seguridad, bugs, UX).
- Batch 7-8: split de `education.js` (-65%) y `remodel-pro.js` (-39%).
- Batch 9: build con esbuild (concatenación + hash automático).
- Batch 10: 6 edge functions migradas a `callAnthropic` con retry + log.
- Batch 11-12: 7 archivos `rm/*` + `edu/*` extraídos.
- Batch 13: MFA TOTP en login + perfil.
- Batch 14: docs (este archivo).

Migración a Mac nuevo: 2026-06-28 ✅
