# CONSOLIDACIÓN rama ↔ main — Fusión de una sola app

> Ejecuta la decisión CEO #3: UNA sola app = lógica/datos CORRECTOS de la rama
> (`feat/portal-inversionista-v2`) + Portal Inversor v2 + arreglos de auditoría,
> MÁS Jarvis/Agent Network y el rebrand "royal/cálida" de `main`.
> **Regla de oro:** en todo conflicto de datos/lógica/números **gana la RAMA**;
> de main solo capa visual (tokens/CSS/iconos) y features nuevas (Jarvis).

Rama de trabajo: `merge/consolidacion` (NO se trabajó sobre main ni sobre la rama directo).
Commit del merge: `5b92bf2` (2 padres: p1 rama `49c8933` · p2 main `2ca0bd8`).

---

## PASO 0 — Respaldos (hechos)
- `backup-main-antes-fusion` = `origin/main` `2ca0bd8` (ya existía, verificado).
- `backup-rama-antes-merge` = rama `49c8933` (creado y pusheado).
- Rama nueva `merge/consolidacion` creada DESDE la rama.

## PASO 1 — Divergencia
- main tiene 56 commits que la rama no · rama tiene 60 que main no.
- main aportó **135 archivos / +15.463 / −3.966**.
- **Clasificación de los cambios de main:**
  - **(A) ADITIVOS separables** (automerge limpio, sin conflicto):
    - Sistema **Jarvis / Agent Network** (`os/os-command-center.js` /jarvis, 18 agentes,
      escuadras FF/Remodel/Rentas en asistido, Mapa de Agentes, grants least-privilege).
    - **Rebrand royal** (azabache+cobalto): `ui/tokens.css`, `ui/icons.js` (Lucide/StatusDot),
      JetBrains Mono/Fraunces, codemod emoji→`osIcon()` en todos los módulos que la rama NO tocó.
    - Remodel EVM (C.1/C.2/C.3), Rentas informes automáticos, Planner cascada multi-día,
      Estimador take-off, Cobros tabla inquilinos, WhatsApp CEO, CSV de Pagos.
  - **(B) Tocan los core** → conflicto real: `os/os.js`, `pm/ff-command-center.js`,
    `os/inv-portal.js`, `os/inv-admin.js`, `remodel-command-center.js`, `CLAUDE.md`.

## PASO 2 — Aditivo (bajo riesgo)
El `git merge origin/main` automergeó **129 de 135 archivos** limpios: Jarvis (archivos nuevos)
+ rebrand sobre archivos que la rama no había tocado + hunks no-solapados de tokens/CSS.
Verificado en el bundle: `jarvis` (7), `osIcon` (2086×), `OS_ICONS`, `Escuadra/agente` (29).

## PASO 3 — Los core (uno por uno, la rama gana lógica)
6 archivos, **31 hunks**. En cada uno se partió de la RAMA (números correctos) y solo se
trajo el visual/feature de main que no toca cálculos:

| Archivo | Lógica que GANÓ la rama | Visual/feature que se tomó de main |
|---|---|---|
| `os/os.js` | déficit = `ff_deals.deficit_total` (positivo = caja atrapada) · `osResolveNames` (Líder por nombre) | `osAx()` colores royal · `osIco()` · `osIcon('construction/hammer/alert')` · `var(--amber-bg)` |
| `pm/ff-command-center.js` | convención déficit **positiva** (`deficit_total`) en KPI/badge/kanban/chart/ROI/Propiedades · sort desc por déficit | `osIcon('alert/ghost')` · colores royal `#4ade9e/#ff6b6b` · empties por columna |
| `os/inv-portal.js` | Flujo Mensual con **servicio de deuda** + **flujo después de deuda** (4 cajas) · tab **Rendimiento** · guard TIR en rehab · filas de deuda a plena luz | tabs sin emoji · `osIcon('paperclip')` · Escenario 'Real/Proyectado' sin emoji |
| `os/inv-admin.js` | **horizontes 3/5/8** (`const N`+`hz()`) · **distribución automática** (neto=renta−oper−deuda) · **Ledger con servicio de deuda** · **rent-roll REAL** (Item 09) · tabs ocultos (Item 10/16/22) · `iaModeloChecklist`/`iaInjectCSS`/`iaTblIndicadores` · `tipo_contrato` en b2 | `osIcon('flask/save/plus/pencil/trash/settings/loader/ruler/gem/printer')` · labels sin emoji |
| `remodel-command-center.js` | **dedup nómina** `.trim()` (Item 52 Noe Hilario) · **rcVerdictoSimple** (Item 54) · filtro sobrepagados (Item 52 #2) | colores royal en barras · `osIcon('banknote/alert')` |
| `CLAUDE.md` | (docs) — se conservaron AMBAS historias | — |

## PASO 4 — GATE (verificado contra Supabase prod `nezbaljfhhyznhltpjnk`) ✅ PASA
| Check | Esperado | Obtenido | OK |
|---|---|---|---|
| Σ `ff_deals.deficit_total` activas | $297,690 | **$297,690.36** | ✅ |
| Capitol · Virginia · Stonleigh | 0 · 70.529 · 70.855 | **0 · 70.529 · 70.855** | ✅ |
| `v_cartera_kpi.vencido_neto` | $18,636.01 | **$18,636.01** (15 morosos) | ✅ |
| Horizontes | 3/5/8 constante única | `self.HORIZONTES=[3,5,8]`, 0 casos 4/6/8 | ✅ |
| XIRR no anualiza holds <1año | — | `inv-indicadores.js` `tirNA=dias<365`, XIRR solo ≥365d | ✅ |
| Build / parse | OK | bundle `fa78be29789f`, `node --check` 6/6 OK | ✅ |

Ningún número regresó. Build verde. **No hubo que revertir.**

## PASO 5 — Publicar
- Desplegado a **empresa-os-admin** (`npx vercel --prod --yes --scope rental-profits`).
- Fusionado `merge/consolidacion` → `main` con `--no-ff` (respaldos ya hechos) + push.
- ⚠️ **ACCIÓN MANUAL DEL CEO (único paso irreversible de cara al usuario):** apuntar el
  dominio de producción principal al proyecto Vercel que corresponda. **No se cambió el
  dominio de prod** en esta sesión (regla). Hoy `empresa-os.vercel.app` sirve `main`
  (que ahora YA contiene la consolidación) y `empresa-os-admin.vercel.app` sirve el deploy CLI.

## Rollback
- Rama: `git reset --hard backup-rama-antes-merge` (rama pre-merge `49c8933`).
- main: revertir el merge `--no-ff` o resetear a `backup-main-antes-fusion` (`2ca0bd8`).
