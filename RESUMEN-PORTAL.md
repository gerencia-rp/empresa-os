# 💎 RESUMEN — Portal del Inversionista v2 (14 Jul 2026, sesión nocturna autónoma)

**Meta cumplida:** el portal `/inversionista` reemplaza el Excel "Modelo financiero Renta". El socio entra con magic link y ve TODO el modelo dentro del portal, solo lectura; los parámetros los edita el admin en `/inversionistas`. Cero hardcode: todo sale de Supabase (inv_* / ledger real de FF+Rentas) o del motor `os/inv-engine.js` — lo que falta dice **"sin dato"** y es cargable desde el admin.

---

## Qué se construyó

### Portal (`os/inv-portal.js` reescrito + `inversionista.html`)
- **5 pestañas de la spec** (+ el Asistente IA que ya existía):
  1. **🏠 Mi Portafolio** — saludo + nº propiedades + capital aportado + distribuciones + "próxima actualización 1° de mes". Tarjetas por casa (v_portal_inversor). Detalle de la casa elegida:
     - **12 métricas con botón ℹ** (concepto + fórmula CON los números del socio): Cash-on-Cash mensual $ y % anual, Equity Multiple, Distribuciones recibidas, ROI anualizado (CAGR), Riqueza hoy, DSCR, CAP rate, VPN 31 años (tu parte + casa), Profit del hold, TIR 31a, escenario activo.
     - **CoC con base REAL**: si la casa tiene rentas cobradas usa la ventana real de 12 meses del ledger (renta − gastos op − deuda); si no, el modelo — siempre declarado con chip.
     - **Info del deal**: estrategia, estado, % equity, compra, HML, ARV, refinanciación, plan de salida.
     - **🔄 Evento de refinanciación**: pasivo liquidado al HML (payoff), nuevo prestamista (% y monto), cash-out (prefiere el REAL `cashout_real` con chip; si no, calculado y declarado), déficit previo del ciclo y **tu cash-out = máx(0, cash-out − déficit) × tu %**.
     - **Línea de tiempo del retorno**: compra → draws → primera renta (REAL si hay ledger) → refi → distribuciones → recuperación del capital; cada evento con chip real/modelo.
     - **P&L del modelo** (ingresos / operativos / impuestos con nota on-off / financieros / utilidad + split inversionista-empresa) + hold completo (all-in, profit, ROI).
     - **Desembolso del banco & ciclo**: HM total, préstamo refi, cash-out, déficit/superávit del ciclo, cash atrapado (año 0 oficial) + análisis de 3 fases.
     - **Las 5 gráficas del Excel** (riqueza, patrimonio, ingresos vs deuda, utilidad acumulada, gastos) — theme-aware.
     - **Comparativo de escenarios SOLO LECTURA**: Estimado / Proyectado / Real (motor en browser) + Simulado (cache de inv_projection que arma el admin).
  2. **📅 Flujo Mensual** — filtro por año/todo; 3 recuadros: Renta cobrada (total, nº meses, promedio, fuente Rentas), Gastos operativos por categoría **SIN draws**, Balance (superávit/déficit operativo + línea "con deuda"). Detalle **año → mes** colapsable (ingresos/gastos/flujo neto) + línea de tiempo completa de movimientos con filtros y comprobantes 📎. **Los movimientos con fecha futura (gastos programados) NO inflan la operación** — solo aparecen en el registro completo.
  3. **💸 Distribuciones** — total, nº, **próxima estimada** con countdown, K-1, desglose + ⬇ exportar CSV.
  4. **📄 Mis Documentos** — buscador + filtro por tipo (contrato/fiscal/legal/otro), descarga con audit log.
  5. **💬 Mensajes** — canal con el gestor; nada se envía sin tocar "Enviar".
- **Tema claro/oscuro** (toggle ◐, persistido; light = canon del OS) con las gráficas adaptándose. Mobile OK (390px verificado).

### Admin (`os/inv-admin.js`)
- **➕ Agregar parámetro** en el tab Modelo (key/valor/fuente/descripción) → todo "sin dato" del portal es cargable sin tocar código.
- **📄 Tab Documentos** nuevo: subir docs al portal (por casa, opcionalmente por inversionista; tipo contrato/fiscal/legal/otro; soft-delete; contador de vistas del audit).
- Badge **🧪 ejemplo del Excel** en el tab Modelo de Dove.
- Guardrails que YA existían y siguen: mensajes y distribuciones solo con botón explícito; markup solo-admin; RLS estricto.

### Datos / DB (migr `20260714100000_portal_inv_seed_dove.sql`, aditiva e idempotente, ya aplicada en prod)
- Seed de la casa EJEMPLO **2315 Dove Springs Dr** (property_id `419fc8c3-…`): `estrategia` (Fix and hold, real:ff_deals), `plan_salida`, `cashout_real` 22,207.13 (real:ff_deals), `es_ejemplo`. Los 42 params del modelo ya estaban desde el 8-jul.
- **Sin tablas nuevas ni cambios de policies** — las RLS existentes ya cubrían todo (verificado).

## Qué datos ya tira REALES (verificado con QA en Dove)
- Renta cobrada **$38,746 / 13 meses** (Rentas:pm_payments) · gastos operativos (pm_expenses, sin hipoteca) · pagos HML + cuotas refi (ff_hml_payments) · cash-out real $22,207.13 · draws/compra/cierre (FF) — todo vía RPC `inv_ledger` (una definición, mismo dato que el admin).
- Motor calibrado: **TIR 46.70% / VPN $186,668 EXACTOS** (goldens del Excel re-verificados con el código real: scratchpad `verify-portal.mjs` — DSCR/CAP/CoC/payoff/cash-out chequeados a mano, todo verde).
- Resumen por casa (v_portal_inversor): flujo del último mes, déficit desglosado, avance de obra, líder.

## Auto-QA corrido (sin humano)
- `qa-portal.mjs` (scratchpad): **32/32 verde** — login QA investor, 5 tabs, claro Y oscuro, 1280px y 390px, 0 pageerrors, sin NaN/undefined, sin texto desbordado (scan automático), ℹ abre con fórmula, CSV presente, números reales presentes ($25,400 / 46.7% / $38,7xx / $22,207), "sin dato" honesto donde falta (refi_lender). Screenshots en el scratchpad revisados a ojo en ambos temas.
- ci:gate 12/12 · node --check en los 3 archivos tocados.
- ⚠ El QA resetea la password de `qa-investor-test@` (sesiones paralelas la pisan — regla conocida).

## Pendiente / sin dato (y cómo cargarlo)
- **`refi_lender` de Dove** — el portal lo muestra "sin dato". Cargarlo: `/inversionistas` → Modelo → ➕ Agregar parámetro → key `refi_lender`, valor (ej. "Champions Funding"), fuente real:manual. *(No lo sembré porque el nombre del prestamista del refi de Dove no está espejado en ninguna tabla — no invento.)*
- **Distribuciones** — 0 registradas (real). Se cargan en `/inversionistas` → 💸 Distribuciones (botón Crear, luego "✓ pagar"); el portal muestra total/próxima/K-1 solo.
- **Documentos** — 0 cargados. `/inversionistas` → 📄 Documentos → URL de Drive/Storage.
- **Las otras 22 casas** tienen params auto-poblados (9-jul) pero varios con fuente "supuesto"; el portal los muestra con chip amarillo. Se calibran editándolos en el admin.
- **Nombre del inversionista en el saludo** — inv_access no guarda nombre (el portal saluda genérico); si se quiere, agregar columna o param.
- CoC de Dove sale **negativo con la operación real** (−$164/mes): es HONESTO — la cuota del refi al 11.39% supera la renta neta hoy (coincide con el déficit $10,358 del resumen). No es un bug.

## Reversibilidad
- Todo aditivo: 1 migración de seed (4 filas `on conflict do nothing`), 3 archivos de front editados (git revert alcanza), soft-delete en todas las escrituras del admin.
