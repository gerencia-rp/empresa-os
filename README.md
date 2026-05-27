# Empresa OS — Rental Profitss

Sistema operativo de la empresa: Fix & Flip, Remodelación, Rentas.

## 🚀 Setup en una computadora nueva

```bash
# 1. Clonar
git clone https://github.com/TU_USUARIO/empresa-os.git
cd empresa-os

# 2. Crear config local (NO está en el repo por seguridad)
cp config.example.js config.js
# Editar config.js con la URL + anon key de Supabase

# 3. Levantar server local (cualquiera de las dos)
npx serve -p 3000          # opción 1 (Node)
python3 -m http.server 3000 # opción 2 (Python)

# Abrir http://localhost:3000
```

## 📤 Workflow diario (sync entre PCs)

```bash
# Al empezar el día (sea cual sea PC)
git pull origin main

# Al terminar (siempre)
git add .
git commit -m "feat: descripción del cambio"
git push origin main
```

## 🌐 Producción

App live: https://empresa-os.vercel.app

Cada `git push` a `main` → auto-deploy en Vercel (cuando el repo esté conectado).

## 📦 Estructura

- `index.html` — entrada
- `app.js` — core (auth, áreas, sistemas)
- `estimator.js` — estimador rápido Fix & Flip
- `remodel-pro.js` — estimador pro de remodelación + cronograma + SOW
- `weekly-planner.js` — planner semanal
- `rental-predictor.js` — predictor cashflow rentas
- `loan-calculator.js` — calculadora préstamos
- `property-analyzer.js` — análisis profundo IA
- `supabase/` — schemas SQL + edge functions

## 🔑 Credenciales

- Frontend (`config.js`): solo la anon key pública de Supabase (RLS protege los datos)
- Backend: las secret keys viven en Supabase Edge Function secrets
- **Nunca commitear:** `config.js`, archivos `.env`, service role keys
