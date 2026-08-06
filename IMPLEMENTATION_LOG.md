# IMPLEMENTATION_LOG — Auditoría Maestra 2026-07-13

Rama `rebuild/os-audit-2026-07` · un commit por ítem · verificación contra fuente antes de commitear.
Estados: ⬜ pendiente · 🔄 en curso · ✅ hecho · ⛔ bloqueado (con nota).

## 06-ago · 🔍 "El Ledger no muestra el servicio de deuda" — en empresa-os-admin SÍ lo muestra (verificado 4 veces) ✅

Los 3 chequeos pedidos, con evidencia:

**(1) ¿El bundle de prod es el HEAD de la rama?** **Sí.** `npm run build` sobre HEAD (`759c1ad`) genera **`bundle.06546640daad.js`** y eso es exactamente lo que sirve `empresa-os-admin.vercel.app`. No estaba atrasado.

**(2) Redeploy limpio:** hecho igual con `vercel --prod --force` (rebuild completo, sin caché) para eliminar la variable. Resultado: **mismo hash** `06546640daad` → confirma que no había nada viejo cacheado.

**(3) ¿`iaTabLedger` renderiza las filas y el total?** **Sí**, verificado en **carga real logueada** (login por formulario + `osNav` + click en la pestaña + selección de casa por el `<select>`, **sin stubs ni `osInit()` forzado**) con `scripts/qa-ledger-real.mjs`:

| Casa | Filas RPC | Filas `servicio_deuda` | Renderizadas en la tabla | Total del encabezado | ¿Cuadra? |
|---|---|---|---|---|---|
| **5003 Michelle Ct** | 29 | 11 | **11 de 29** | **$24,194** | rpc 24,193.56 ✓ |
| **2315 Dove Springs** | 94 | 13 | **13 de 94** | **$37,529** | rpc 37,529.00 ✓ |
| 7105 Bethune (la que abre por defecto) | 19 | 1 | 1 | $2,874 | ✓ |

Filas concretas renderizadas en Michelle — **son los números exactos del reporte**:
```
2026-07-03 | Pago refi 30 años (banco)  [P&L NO] [servicio de deuda] | financiero | −$3,032
2026-06-03 | Pago interés HML           [P&L NO] [servicio de deuda] | financiero | −$2,116
2026-05-04 | Pago interés HML           [P&L NO] [servicio de deuda] | financiero | −$2,116
```
**11 OK · 0 FALLAS · 0 pageerrors.** También verifiqué la RPC **por PostgREST** (el camino real del front, no SQL directo): 29 filas, columnas `fecha, mes, concepto, tipo, categoria, subcategoria, monto, fuente, comprobante`, 11 con `servicio_deuda` — descarta un caché de esquema de PostgREST tras el `drop function`.

**La diferencia está, otra vez, en el DOMINIO — y esta vez es sutil.** Corrí el MISMO script contra `empresa-os.vercel.app`:

| | `empresa-os-admin` | `empresa-os` |
|---|---|---|
| Filas de deuda en la tabla | **11 ✓** | **11 ✓** (¡también aparecen!) |
| Badge `servicio de deuda` | **✓** | **✗** |
| Total "Servicio de deuda" en el encabezado | **$24,194 ✓** | **✗ (no existe)** |

En el dominio viejo **las filas SÍ salen** (los conceptos "Pago interés HML"/"Pago refi 30 años" vienen de la RPC, que es compartida y ya está actualizada), pero **falta el badge y falta el total** — porque esos dos son del front nuevo, que ahí no está deployado. Visualmente: hay líneas de deuda sueltas entre las demás, **sin sección ni total identificable** — que es justo la sensación de "no muestra el servicio de deuda".

**No hubo cambio de código**: nada estaba roto en el dominio acordado. Se suma `scripts/qa-ledger-real.mjs` para que esto se pueda comprobar en 1 comando y no vuelva a costar una vuelta:
```bash
QA_PASS=… QA_CASA=Michelle node scripts/qa-ledger-real.mjs          # empresa-os-admin
QA_BASE=https://empresa-os.vercel.app QA_PASS=… node scripts/qa-ledger-real.mjs
```

**Nota menor (no es bug):** los montos del Ledger se muestran redondeados (`iaMoney`): `−$3,032` en vez de `$3,032.26`. Es el formato único de todo el admin; el total del encabezado sí cuadra al centavo contra la RPC ($24,194 vs $24,193.56). Si se quiere centavos en el Ledger, es un cambio de `iaMoney` en esa vista — decisión de diseño, no se tocó.

## 06-ago · 🔑 LINK MÁGICO siempre volvía a empresa-os.vercel.app — es la ALLOWLIST de Auth, no el código ✅ (falta 1 paso humano)

**Lo que YA estaba bien (verificado, no se tocó):** los 4 lugares que piden link mágico/recovery **ya usaban el origin actual** — `app.js:129` (login ✉️) y `app.js:229` (recovery) con `window.location.origin + '/'`, `inv-portal.js:55` e `inv-admin.js:168` con `location.origin + '/inversionista'`.

**Prueba de que el cliente manda lo correcto** (headless, interceptando el request — abortado para NO mandar mails):

| Página desde donde se pide | `redirect_to` que sale en `/auth/v1/otp` |
|---|---|
| `empresa-os-admin.vercel.app` | **`https://empresa-os-admin.vercel.app/`** ✓ |
| `empresa-os.vercel.app` | `https://empresa-os.vercel.app/` ✓ |

**LA CAUSA — GoTrue descarta el destino y cae al Site URL.** Si `redirect_to` no está en las **Redirect URLs** de Auth, GoTrue **lo ignora en silencio** (no hay error) y usa el **Site URL**. Probado contra el endpoint `verify`, que expone el comportamiento:

```
redirect_to=https://empresa-os-admin.vercel.app/ → Location: https://empresa-os.vercel.app/#error=...   ❌ descartado
redirect_to=https://empresa-os.vercel.app/       → Location: https://empresa-os.vercel.app/#error=...   ✓ permitido
redirect_to=https://evil-example.com/            → Location: https://empresa-os.vercel.app/#error=...   ✓ (bien rechazado)
```

`empresa-os-admin.vercel.app` se comporta **igual que un dominio ajeno** → NO está en la allowlist. **Site URL = `https://empresa-os.vercel.app`.**

**🙋 PASO HUMANO (único pendiente, no lo puedo hacer sin acceso al dashboard):** Supabase → Authentication → URL Configuration → **Redirect URLs** → agregar:

```
https://empresa-os-admin.vercel.app/**
```

(el `/**` cubre `/` y `/inversionista` en un solo patrón; si preferís explícito: `https://empresa-os-admin.vercel.app/` y `https://empresa-os-admin.vercel.app/inversionista`). **NO hace falta cambiar el Site URL** — dejalo en `empresa-os.vercel.app` para no romper los links viejos.

**Re-verificar en 5 s después de agregarlo** (tiene que devolver `Location: https://empresa-os-admin...`):
```bash
curl -s -o /dev/null -D - "https://nezbaljfhhyznhltpjnk.supabase.co/auth/v1/verify?token=x&type=magiclink&redirect_to=https://empresa-os-admin.vercel.app/" | grep -i location
```

**🐛 DOS BUGS REALES encontrados de paso en el dominio admin (arreglados y deployados):**

1. **CORS: 15 edge functions bloqueadas desde `empresa-os-admin`.** `_shared/cors.ts` no tenía ese dominio en `ALLOWED_ORIGINS` → devolvía `Allow-Origin: https://empresa-os.vercel.app` y el navegador **descartaba la respuesta**. Afecta a las 15 que usan el CORS compartido; la única que el front llama hoy es **`ia-data`** (módulo IA). Agregado el dominio + soporte de secret `EXTRA_ALLOWED_ORIGINS` (coma-separado) para no tocar código la próxima vez. **Verificado tras el deploy:** admin → `empresa-os-admin` ✓ · empresa-os → `empresa-os` ✓ · `evil-example.com` → cae al primero ✓ (sigue restrictivo).
2. **`invite-user` mandaba a los invitados SIEMPRE a `APP_URL`** (hardcodeado a `empresa-os.vercel.app`), sin importar desde qué dominio invitaras. Ahora el front manda `redirect_origin: location.origin` (`app.js` + `os/os-admin.js`) y la función lo respeta **validado contra whitelist** (`safeRedirect()`), con fallback a `APP_URL` — nadie puede redirigir una invitación a un sitio ajeno.

**Deploy:** edge functions `ia-data` (v3) e `invite-user` (v37) por MCP · front `bundle.06546640daad` en `empresa-os-admin` (READY, target production).

**⚠ Lo que NO pude verificar de punta a punta:** que el mail llegue y la sesión quede activa — el paso que falta es la allowlist (config del dashboard) y no tengo acceso a leer el correo. Todo lo demás de la cadena está probado: el cliente pide el dominio correcto ✓, GoTrue lo aceptará en cuanto esté en la lista ✓ (probado con los 3 casos de arriba), y la app ya sabe levantar la sesión del hash en ese dominio (es el mismo código que funciona hoy en empresa-os).

## 06-ago · 🎯 CAUSA REAL de "no se ve la carga automática": **el dominio equivocado** (no era el código) ✅

**⚠ Corrección de la entrada anterior.** Ahí escribí que la causa raíz era `.ct-btn` sin definir. **Eso era un problema real de estilos, pero NO era por qué el CEO no veía el control.** Lo diagnostiqué con un harness que **forzaba `window.osInit()` y stubbeaba `IA`** — nunca reprodujo la carga real, así que "verificó" algo que el usuario nunca ejecuta. Reemplazado por `scripts/qa-dist-real.mjs`, que hace **login por el formulario** y navega como el usuario, **sin un solo stub**.

**Reproducción REAL** (login `qa-admin-test@` → `osNav('/inversionistas')` → click en 💸 Distribuciones), **el mismo script contra los dos dominios**:

| Dominio | Resultado | Botones de modo | `#ia-styles` | Errores de consola |
|---|---|---|---|---|
| **`empresa-os-admin.vercel.app`** | **17/17 ✓** | `["✍️ Manual","⚙️ Automática"]` · 101×37 y 125×37 px · `display:flex·visible·opacity 1` | sí | **0** |
| `empresa-os.vercel.app` | **8/17 ✗** | **`[]` — ninguno** | no | **0** |

**Hallazgo clave: no hay ningún error de JS en ninguno de los dos.** El render nunca se cortó. Lo que difiere es **qué build sirve cada dominio**:

- `empresa-os` **sí auto-deploya desde GitHub**, pero la rama `feat/portal-inversionista-v2` solo genera **deployments de PREVIEW** (`target: null`). Su **alias de producción sigue apuntando al último build de `main`** (commit `09560ab`, "Planner: cascada multi-día"), que es **anterior a todo este trabajo** — ni Parte 1, ni Parte 2, ni el toggle.
- Todos los `vercel --prod` de estas sesiones fueron a **`empresa-os-admin`** (es el proyecto de `.vercel/project.json`).
- Por eso se ve **solo el formulario manual, también en incógnito**: no es caché — es **otro build**.

⚠ **Corrección a CLAUDE.md:** la sección de contexto dice *"URL producción: https://empresa-os.vercel.app/"*. Para esta rama **eso es falso**: el trabajo del portal de inversionistas vive en **`empresa-os-admin.vercel.app`**. `empresa-os.vercel.app` = producción de **`main`**.

**Timing (por qué mi primer intento de test real también falló):** `iaLoad()` tarda **~6-8 s** (4 queries + `iaLoadCasa`), y al entrar a Distribuciones hay un **segundo load** (`iaLoadProducto` → `IA.dists`). Medir antes de eso da "no existe la pestaña" y parece el bug. El script ahora **espera `IA.loaded` y después `IA.dists`**, sin forzar nada.

**Lo que SÍ arregló el commit anterior (y se mantiene):** `.ct-btn` estaba genuinamente sin definir en `/inversionistas` (solo la define `os-ct-sabueso.js` al entrar a /contable) → los 21 botones del admin caían al render nativo. `iaInjectCSS()` lo corrige y el toggle es ahora un segmented control con label "Modo de carga". Verificado en la carga real: `#ia-styles` presente ✓.

## 06-ago · 🐛 (parcial) `.ct-btn` sin definir en /inversionistas — mejora de estilos, NO la causa del síntoma

**El reporte:** "en Distribuciones sigue apareciendo solo el formulario manual; el modo Automática no está visible".

**Lo primero que descarté:** que la lógica no estuviera renderizada. **Sí lo estaba** — `iaTabDist` emitía los dos botones desde el 30-jul y el bundle de prod contenía `iaDistMode`, `tabBtn` y el form automático completo. El problema no era el "si se dibuja", era el **"se lee como control"**.

**Causa raíz (bug de estilos, no de lógica):** `inv-admin.js` usa la clase **`.ct-btn` en 21 botones** (incluido el toggle de modo), pero esa clase **solo la define `os-ct-sabueso.js`** dentro de su propio `<style>` inyectado, que se monta **al entrar a `/contable`**. En `/inversionistas` **nunca existió** → los botones caían al render **nativo del navegador**. El toggle quedaba como dos botoncitos grises del sistema pegados arriba del formulario: parecía un artefacto de la página, no un selector de modo. `inv-admin.js` **no inyectaba ningún estilo propio** (verificado: 0 `createElement('style')` en el módulo).

**Segundo hallazgo (importante para el CEO):** existen **dos proyectos Vercel** con builds distintos. `empresa-os.vercel.app` (el de la URL "principal" de este CLAUDE.md) sirve un bundle **viejo, sin `inv_dist_auto` NI `inv_dist_calc`** — o sea **sin ningún modo automático**. El proyecto correcto es **`empresa-os-admin.vercel.app`**. Si se mira el dominio viejo, el modo automático no aparece por más que esté deployado.

| | ANTES | DESPUÉS |
|---|---|---|
| `.ct-btn` en /inversionistas | **sin definir** → 21 botones nativos del navegador | `iaInjectCSS()` inyecta la MISMA regla scopeada a `#os-root` |
| Toggle de modo | 2 botones nativos sueltos, sin etiqueta | **segmented control** con label **"Modo de carga"**, activo en teal (`--a1`), + línea que explica qué hace cada modo |
| Dependencia de estilos | 100% de una clase externa | estilos **inline de respaldo**: se ve aunque el `<style>` no llegue a montarse |
| Etiqueta | "⚙️ Cálculo automático" | **"⚙️ Automática"** (par simétrico de "✍️ Manual") |

**VERIFICADO EN PANTALLA en prod** (`scripts/qa-dist-toggle.mjs`, nuevo — renderiza `invAdminView()` con `IA` stubbeado y mide **estilos computados**, no solo presencia en el DOM): **15/15 · 0 pageerrors**.
- 2 botones en el DOM: `["✍️ Manual","⚙️ Automática"]` · tamaños reales **101×37 y 125×37 px** · `display:flex · visibility:visible · opacity:1` (ninguno oculto) · el activo con fondo **`rgb(69,227,198)`** (= `--a1`).
- **Click real** en "Automática" → `IA.distMode === 'auto'` ✓ → aparecen selector de **casa**, selector de **mes**, botón **"Calcular desde el Ledger"** y la fórmula "renta − gastos operativos − servicio de deuda"; el form manual **desaparece** ✓.
- `#os-styles` presente y el botón primario `.cbtn` con su gradiente ✓ (el harness fuerza `window.osInit()`: sin eso el screenshot mentía, mostrando todo sin estilos).
- ⚠ gotcha reconfirmado: `.lab` lleva `text-transform:uppercase` y `innerText` lo respeta → el check de "Modo de carga" compara **case-insensitive**.

**No se tocó** la lógica de cálculo, ni la RPC, ni el modo manual.

## 06-ago · ⚙️ PARTE 2 — DISTRIBUCIÓN AUTOMÁTICA calculada DESDE EL LEDGER ✅

**Lo que había (y por qué no servía):** ya existía un modo "Cálculo automático" (`inv_dist_calc`, 30-jul) que **recalculaba en paralelo** con otra lógica: `ingresos − gastos − PM(4%) − ref30`, **por un solo inversionista**, y **solo para casas refinanciadas**. Tres problemas: (1) violaba la regla de oro — segunda consulta, segunda definición; (2) **no restaba el interés del HML** (solo la cuota ref30), así que en las casas todavía en Hard Money la deuda no se descontaba; (3) restaba un **PM fee del 4% MODELADO** que no es un gasto real de `pm_expenses` — un número inventado dentro de un cálculo que se presenta como "leído de la fuente".

**Lo nuevo (`inv_dist_auto(property_id, mes)`, migr `20260806110000`):** el cálculo **lee la RPC `inv_ledger`** — literalmente los mismos movimientos que el admin ve en la pestaña 💰 Ledger — filtrados al mes, y suma con los flags del motor:

```
Neto distribuible = Renta (categoria='renta')
                  − Gastos operativos (categoria='operativo')
                  − Servicio de deuda (subcategoria='servicio_deuda' ← Parte 1)
Monto por inversionista = Neto × reparto_pct   (inv_holdings, "Casas & reparto")
```

**🗓 Sub-hallazgo — el mes contable (regla dura de CLAUDE.md):** el ledger fecha las rentas con `coalesce(paid_at, billing_ym-01)`, así que agrupar por `fecha` habría usado la **fecha de cobro**, justo lo que la regla dura de Rentas prohíbe ("el mes del dinero es el MES DE RENTA, nunca la fecha de cobro"). **No es teórico: en 2315 Dove Springs 3 de 27 pagos caen en un mes distinto al que corresponden.** Por eso `inv_ledger` ganó la columna **`mes`** = mes CONTABLE (`billing_ym` en `pm_payments`/`pm_expenses`; mes de la fecha en el resto) y tanto el Ledger como la distribución agrupan por ahí → **son el mismo conjunto, por definición**.

**ANTES → DESPUÉS:**

| | ANTES (`inv_dist_calc`) | DESPUÉS (`inv_dist_auto`) |
|---|---|---|
| Fuente | consulta paralela a `pm_payments`/`pm_expenses`/`ff_hml_payments` | **la RPC `inv_ledger`** (los mismos movimientos del 💰 Ledger) |
| Fórmula | ingresos − gastos − **PM 4% modelado** − ref30 | renta − operativos − **servicio de deuda (interés HML + refi 30a)** |
| Interés del HML | **no se restaba** | se resta (subcategoria `servicio_deuda`) |
| Mes | `billing_ym` en unas fuentes, fecha en otras | **mes contable único** (`mes` del ledger) |
| Alcance | 1 inversionista por vez · **solo casas refinanciadas** | **todos los inversionistas de la casa** · cualquier casa con reparto |
| Reparto en 0% | creaba distribuciones de **$0** en silencio | avisa "no tiene reparto configurado" y **no crea nada** |

**Ejemplo COMPLETO verificado en prod — 5003 Michelle Ct, Junio 2026:**

| Concepto | Movimientos del Ledger (mes 2026-06) | Monto |
|---|---|---|
| Renta cobrada | 1 mov · `Renta cobrada · 2026-06 · Junio 2026` [Rentas:pm_payments] | **$3,700.00** |
| (−) Gastos operativos | 0 mov | **$0.00** |
| (−) Servicio de deuda | 1 mov · `Pago interés HML` 03-jun [FF:ff_hml_payments] | **−$2,116.13** |
| **(=) Neto distribuible** | | **$1,583.87** |
| Reparto (1 inversionista, 40%) | $1,583.87 × 0.40 | **$633.55** |

El Ledger de esa casa filtrado a Junio 2026 devuelve **exactamente esos 2 movimientos** — el desglose no es un cálculo aparte, es la suma de lo que se ve en pantalla. Insert verificado bajo RLS como admin (probado con `begin/rollback`: 0 filas dejadas).

**Casos borde verificados en prod:**
- **Neto ≤ 0** — 7105 Bethune, jul-2026: renta $2,800 − oper $913.77 − deuda $2,874.21 = **−$987.98** → "Sin distribución este mes — el neto quedó en cero o negativo". **No crea nada.**
- **Sin reparto** — 2315 Dove Springs: tiene 1 inversionista pero con `reparto_pct = 0` (7 de 26 holdings están así) → "Esta casa tiene inversionistas cargados pero **todos en 0%**". **No crea distribuciones de $0.**
- **Duplicados** — si ya hay automáticas para esa casa+mes, avisa con el conteo y pide confirmación antes de sumar otras.
- **Reversible** — se anulan con ⏸ (soft-delete) como cualquier manual.

- **La MANUAL no se tocó** (mismos campos, mismo insert, misma tabla). El badge ⚙️ Automática ahora muestra la traza correcta: las nuevas con `renta/operativos/deuda/neto`, las viejas con su fórmula "anterior a 06-ago" — **sin reescribir la historia**.
- **`inv_dist_calc` queda DEPRECADA** (no se dropea: las distribuciones creadas antes referencian su `calc_meta`; el comment en DB explica las diferencias). `inv_refinanced_props` ya no se consulta al cargar el admin.
- **No mueve dinero:** solo calcula y REGISTRA (informativo/contable). El envío real lo hace una persona por fuera — dicho en la UI.

**DoD Parte 2:** elijo casa + mes → veo el desglose (renta − operativos − deuda = neto) y el monto por inversionista ✓ · al confirmar se crean las distribuciones en `inv_distributions`, reversibles ✓ · la manual sigue igual ✓ · verificado en una casa con renta y deuda (Michelle jun-26: neto y % cuadran al centavo con el Ledger de ese mes) ✓.

**⚠ Pendiente declarado:** el **Flujo Mensual del portal** sigue agrupando por `fecha` (filtro por AÑO, donde la diferencia es inmaterial); si se quiere el mes contable también ahí, ya está disponible en `m.mes` — no se cambió para no mover números que el CEO ya validó en QA.

## 06-ago · 💸 PARTE 1 — El LEDGER contabiliza el SERVICIO DE DEUDA (interés HML + refi 30a) ✅

**El pedido:** "el Ledger trae rentas y gastos operativos pero NO muestra el pago mensual del HML ni el de la refi a 30 años, aunque el dato ya existe en `ff_hml_payments`".

**Lo que encontré (antes de tocar nada):** la RPC `inv_ledger` **ya emitía** esos movimientos (`pago_hml`, `fee`, `ref30`, cruzados por `address_norm` — el mismo puente que usa el resto del ledger) y los 18 `address_norm` de `ff_hml_payments` casan 1:1 con un `ff_deals` con `property_id`. Con el sync de hoy (153 filas, `last_synced_at` 06-ago 06:03) el dato **ya aparece**: Dove Springs devuelve 13 movimientos por $37,529.

**El hueco REAL (y el que bloqueaba la Parte 2):** no había forma de **separar** el servicio de deuda del resto de los `financiero` (desembolso HML, cash-out, draws, aportes). Sin esa marca, "servicio de deuda del mes" solo se podía obtener con **una consulta paralela con otra lógica** — exactamente lo que la regla de oro prohíbe (un dato, una fuente).

**El arreglo — una marca en el motor, no una segunda consulta** (migr `20260806100000_ledger_servicio_deuda.sql`):
- `inv_ledger` gana la columna de salida **`subcategoria`**: `'servicio_deuda'` → `pago_hml` + `ref30` · `'fee_hml'` → comisiones puntuales (NO son deuda recurrente) · `null` → todo lo demás.
- Conceptos renombrados al lenguaje del CEO: **"Pago interés HML"** y **"Pago refi 30 años (banco)"**.
- ⚠ requirió `drop function` (no se puede cambiar el tipo de retorno con `create or replace`). Verificado antes: **0 vistas/funciones dependen** de `inv_ledger` (`pg_depend`).
- **Las categorías NO cambian:** siguen siendo `financiero` → **P&L NO**. El **saldo operativo (NOI) no se movió**. La deuda es visible y totalizable aparte — que es justo lo que la Parte 2 le resta al NOI. (NOI = renta − operativos · flujo distribuible = NOI − deuda: dos cosas distintas.)

**ANTES → DESPUÉS (verificado corriendo la RPC como admin en prod):**

| Casa | Movimiento | ANTES | DESPUÉS |
|---|---|---|---|
| **2315 Dove Springs** | Pago refi 30 años (banco) | `Cuota banco (refi 30 años)`, indistinguible del resto de `financiero` | **10 pagos · $27,260** (sep-25 → jun-26, $2,726/mes) · `subcategoria=servicio_deuda` |
| | Pago interés HML | ídem | **3 pagos · $10,269** (jun→ago-25) · `servicio_deuda` |
| **902 Virginia** | Pago interés HML | ídem | **11 pagos · $30,699.89** (sep-25 → jul-26) · `servicio_deuda` |
| | Fee HML | se mezclaba con la deuda | **2 fees · $2,444** · `fee_hml` — **separado**, no cuenta como servicio de deuda |
| **5003 Michelle** | Pago interés HML | ídem | **10 pagos · $21,161.30** · `servicio_deuda` |
| | Pago refi 30 años (banco) | ídem | **1 pago · $3,032.26** (jul-26) · `servicio_deuda` |

- **Admin (`iaTabLedger`):** figura nueva **"Servicio de deuda"** en el encabezado (junto al Saldo operativo, con ⓘ que aclara que NO baja el NOI pero sí se resta para repartir) · badge rojo **`servicio de deuda`** por fila · los subtotales por categoría abren la línea `gasto · financiero · servicio de deuda (HML/refi)`. El panel **Fuentes** ya contaba `FF:ff_hml_payments` (13 movs en Dove).
- **Portal del inversor:** helper único `ipEsDeuda(m)` (usa `subcategoria`, con fallback a la regla vieja por si el ledger viniera de una definición anterior) reemplaza los 2 lugares que asumían "todo `financiero`+`gasto` es deuda" — antes el **Fee HML se contaba como servicio de deuda** en el CoC real de 12 meses y en el Flujo Mensual. Label corregido: "Deuda HML **pendiente**" → **"Servicio de deuda pagado (HML/refi)"** (decía "pendiente" mostrando lo ya PAGADO).
- **No se tocó:** ningún otro movimiento, ni el cálculo del saldo operativo, ni `pnlSi`. La exclusión de la "Hipoteca" de `pm_expenses` sigue (esa cuota entra por `ff_hml_payments` con fecha real — confirmado en Dove: 12 filas "Hipoteca" $2,725.57 en `pm_expenses` **excluidas**, contra `ref30` $2,726 del HML → sin doble conteo).

**DoD Parte 1:** casa con refi muestra la cuota mensual (Dove, 10 meses) ✓ · casas con HML activo muestran el interés mensual (Virginia 11, Michelle 10) ✓ · el NOI no cambió (siguen P&L NO) ✓ · visibles en la tabla y en Fuentes ✓.

## 04-ago · 🔨 BLOQUE 3B — ESTADO HONESTO en casas EN REHAB (mueren "-Infinity / Infinity% / cap negativo") ✅

**El síntoma (5320 Wellington Dr):** en el admin "Modelo & movimientos" y en el portal del inversor las tarjetas KPI se veían **rotas**: `CAP -1.1%` · `DSCR -Infinity` · `EQUILIBRIO Infinity%` · VPN negativo. Reproducido con los params REALES de prod antes de tocar nada.

**La causa (no era un error de cálculo):** la casa está en rehab y **todavía no cobra renta** (`arriendo_hab = 0` → arriendo pleno $0/mes → NOI **−$5,974**/año). Con eso las fórmulas se van a negativo o a infinito: `dscr = (NOI/12) ÷ cuota` con cuota 0 → **±Infinity** · `equilibrio = gasto ÷ arriendo` con arriendo 0 → **Infinity** · `cap = NOI ÷ valor` → negativo. El número no es "malo": el indicador **TODAVÍA NO APLICA**. Pero se leía como un sistema roto.

**El arreglo — una sola definición en el motor (`os/inv-engine.js`), la misma para admin y portal:**
- `indicadores.estadoOperativo = {enRehab, sinRenta, sinDeuda, noiAnual, arriendoPleno, motivo, texto, razonCap, razonDscr, razonEquilibrio}`.
- `capValor` / `capCosto` / `dscr` / `puntoEquilibrio` salen **null** en rehab; fuera de rehab se **sanean los no-finitos**. Vuelven SOLOS a mostrar valores en cuanto NOI > 0 (item 4 del DoD — no hay flag manual que tocar).
- **RAZÓN POR INDICADOR** (bug que casi se cuela): una casa **RENTADA sin cuota de deuda** (compra en cash o pre-refi) también da DSCR no-finito, pero **NO está en rehab** — decirle "todavía no cobra renta" sería mentira. Cada tarjeta explica el indicador que está tapando.
- **NO se tocó** `tir31/vpn31/porHorizonte/profit/fases/series` — siguen siendo la proyección del plan.

**ANTES → DESPUÉS (params reales de prod, corridos por el mapeo real del admin `iaEngineParamsFromRows`):**

| Casa | Indicador | ANTES | DESPUÉS |
|---|---|---|---|
| **5320 Wellington** (rehab, NOI −$5,974) | CAP | `-1.1%` | `n/a 🔨` + "En fase de rehab — sin renta todavía; este indicador aún no aplica." |
| | DSCR | **`-Infinity`** | `n/a 🔨` + misma razón |
| | Equilibrio | **`Infinity%`** | `n/a 🔨` + misma razón |
| | TIR 31a | (anualizada sin operación) | `n/a 🔨` (coherente con la regla A1 de holds < 1 año) |
| | VPN 31a | `-$11,412` mudo | `-$11,412` **rotulado "proyección del plan — la casa aún no opera"** |
| **7105 Bethune** (RENTADA, NOI $90,253, sin cuota) | CAP | 14.3% | **14.3%** (se sigue mostrando — es válido) |
| | DSCR | **`Infinity`** | `n/a 🔨` + "**no tiene cuota de deuda** (compra en cash o todavía sin refi)" ← razón correcta, NO "rehab" |
| | Equilibrio | 23.9% | **23.9%** (se sigue mostrando) |

- **ADMIN:** banner "🔨 esta casa está en fase de rehab" arriba de los KPIs + las 4 tarjetas con estado honesto. **CAP y DSCR se tapan por SEPARADO** — colapsar la tarjeta entera escondería un CAP válido (caso Bethune). La comparativa de Escenarios muestra `n/a 🔨` con la razón **del escenario**, no un texto fijo.
- **PORTAL DEL INVERSOR:** mismo banner en Mi Casa, tiles DSCR/CAP/TIR con el estado, ⓘ explicado. **Columna 🧪 Simulado corregida:** sale de `inv_projection` (JSON **cacheado**, anterior al fix) donde el cap de una casa en rehab quedó como número negativo real mientras `dscr`/`equilibrio` (±Infinity) los volvió `null` el JSON → la fila leía `— · — · — · -1.1%`, **dos respuestas contradictorias**. Ahora el cache pasa por la MISMA regla.
- **Asistente del inversor** (`api/brain-chat.mjs`): recibe `estado_operativo` y tiene regla explícita — decir "aún no aplica", **nunca "null" ni "no tengo el dato"**, y jamás rellenar con un número de otro lado.
- **Sonda de QA** (`scripts/qa-sonda.js`): ahora detecta `Infinity`/`null` además de NaN/undefined — **este bug era invisible para la sonda**.
- **Golden nuevo `scripts/test-inv-rehab.mjs` → 24/24**, con **control de NO regresión**: una casa rentando sigue dando **CAP 9.63% · DSCR 1.97 · equilibrio 92%**, idénticos a antes del cambio.

**DoD 3B:** Wellington ya no muestra -Infinity/Infinity%/cap negativo, muestra el estado honesto ✓ · aplica en admin y en el portal (mismo motor) ✓ · los indicadores que sí valen en rehab (capital invertido, costo total, valor en papel) se siguen mostrando ✓ · vuelven solos al cobrar renta ✓ · sin TIR anualizada en rehab ✓.

**BLOQUE 2 (fino):** los 3 chips `real`/`estimado`/`manual` del encabezado de ayuda y de la leyenda "Parámetros del modelo (N)" no tenían `title=` (se explicaban solo por el texto adyacente). Ahora llevan tooltip de una línea con **una definición compartida** (`IA_TIP_REAL/EST/MAN`) para que encabezado y leyenda no se desincronicen.

## 03-ago · 🧭 CLARIDAD + LIMPIEZA del ADMIN del portal de inversionistas (rama feat/portal-inversionista-v2) ✅ EN PROD

Mejoras de UX/claridad (sin tocar el motor de cálculo inv-indicadores/inv-escenarios; inv-engine solo aditivo). Verificado en prod `empresa-os-admin.vercel.app`, 0 pageerrors, ci:gate 15/15.

- **BLOQUE 1 — ocultar "Documentos" y "Mensajes":** `IA_TABS_OCULTOS=['docs2','msgs']` filtra la barra (reversible: sacarlos del array reactiva; código y datos intactos, `iaTabDocs`/`iaTabMsgs` siguen). **ANTES:** barra con 12 pestañas (…Distribuciones · Documentos · Mensajes · Ledger…). **DESPUÉS (prod):** `Global · Analizador · Pipeline · Accesos · Casas & reparto · Modelo & movimientos · Escenarios & simulador · Distribuciones · Ledger · Glosario` (sin Documentos/Mensajes).
- **BLOQUE 2 — "Modelo & movimientos" claro:** encabezado de ayuda (`iaModeloAyuda`: qué es + flujo real/estimado/manual), tooltips ⓘ en los 4 KPIs (TIR post-refi / VPN / CAP·DSCR / Equilibrio=ocupación mínima), **checklist "Qué falta para esta casa"** (`iaModeloChecklist`: estrategia/plan_salida/tipo_contrato/hm_tasa/refi_lender/cashout_real — desaparecen al completarse), tip "real" afinado ("no se teclea; editar = override reversible"), la guía imprimible describe el flujo. **DESPUÉS (prod, Bethune):** ayuda ✓ · checklist muestra los 5 que faltan (hm_tasa NO aparece = ya cargado) ✓ · 4 KPIs con ⓘ ✓. Cero cambios de valores/fórmulas.
- **BLOQUE 3 — "Escenarios & simulador" horizonte 4/6/8:** `inv-engine.js` gana `porHorizonte{4,6,8}` (ADITIVO — TIR/VPN de venta al año N con su propio `fclPostRefi` + terminal_N = valor_N−saldo_N; `tir31PostRefi` intacto). La comparativa tiene selector **4/6/8 (default 6, MISMO set que el panel del inversor — `[4,6,8]` en inv-portal.js)**; TIR/VPN/patrimonio/utilidad se recalculan al horizonte y los títulos lo reflejan ("TIR a {n} años", "Patrimonio del inversionista al año {n}"); tooltips por columna (Estimado/Proyectado/Realizado/Simulado); simulador Δ al horizonte N; proyección etiquetada "supuesto".
  - **DESPUÉS (prod, 7105 Bethune):** el selector CAMBIA todo — TIR (Proyectado) **4a 135.4% → 6a 80.8% → 8a 58.4%**, VPN casa **$521,357 → $496,190 → $472,115**, Patrimonio inversionista **$368,837 → $408,970 → $453,470**.
  - **Hallazgo columnas idénticas (revisado):** con la TIR de horizonte, **Estimado se SEPARA** (4a: 88.0% vs 135.4%) porque usa los `est_*` del underwriting. **Proyectado = Realizado = Simulado** son iguales → **NO es bug**: Simulado=Proyectado (no hay overrides en el simulador) y Realizado=Proyectado (los 2 movimientos reales de Bethune no cambian la proyección post-refi al horizonte — la parte anual `opsAnual` domina, el año 0 no se mueve). La nota (`notaIguales`) ahora COMPARA los valores reales al horizonte y explica cada coincidencia con su razón, en vez de asumir por flags.
- **BLOQUE 4 — "Ledger" explicado (se mantiene):** encabezado de ayuda (qué es = libro P&L de la casa, SOLO LECTURA, respaldo del NOI, se edita en Modelo & movimientos), tooltip en "Saldo operativo (P&L)", tooltips en columnas Cat. (P&L SÍ/NO) y Fuente (FF=Fix&Flip / Rentas=property mgmt / OS=cargado a mano). Cero cambios de números ni lógica. **DESPUÉS (prod):** ayuda ✓ · saldo con tooltip ✓ · Fuente con tooltip ✓.
- **DoD verificación:** barra sin Documentos/Mensajes (reactivables por `IA_TABS_OCULTOS`) ✓ · Bethune 4/6/8 mueve TIR/VPN/patrimonio ✓ (columnas idénticas = explicadas, no bug) · admin y portal del inversor usan el MISMO `[4,6,8]` default 6 (sin discrepancia de set) ✓.

## 03-ago · 💎 INDICADORES INSTITUCIONALES — valor forzado + compresión de cap + NAV (rama feat/portal-inversionista-v2) ✅ EN PROD

**Qué:** 4 indicadores NUEVOS que se SUMAN sobre el motor (NO se rehace ni recalcula nada): Yield on Cost + spread vs cap de mercado (valor forzado BRRRR), compresión de cap, NAV del inversionista y tipo de contrato (NNN/NN/N) por casa. Regla de oro respetada — **un dato, una fuente**: NOI/costo/valor/deuda REUSADOS del motor.

- **BLOQUE 1 (`os/inv-escenarios.js`):** `valorCreado(c,cfg,navEquity)` — reusa `base().noi` (renta operativa − gastos, del motor) y `ind.all_in` (= compra + remodelación, la MISMA def del motor para costo). YoC = NOI/costo · spread = YoC − cap_mercado (pp) · valor forzado = NOI/cap_mercado − costo · NAV = navEquity (= `equityActual` del Panel de Rendimiento, **un solo número**; fallback = base.equity×pct). `desdeDatos` += `costo_total`/`cap_mercado`(override por casa)/`tipo_contrato`. `cfgDesde` += `cap_mercado_pct:0.07`.
- **CONFIG:** `esc_cap_mercado_pct=0.07` (SUPUESTO editable) en `ff_uw_config` (migr `20260803100000`) → fluye al portal por `inv_esc_config()` (que ya devuelve todo `esc_*`) y al motor por `cfgDesde`.
- **BLOQUE 2 (`os/inv-admin.js`, Analizador):** tabla **"Portafolio — indicadores"** — 1 fila/casa (costo, NOI, cap mkt supuesto, YoC, spread pp, valor forzado $, valor, deuda, NAV total, estrategia, contrato), **ordenable** (clic en encabezado, default por spread ▾), **totales/ponderados** al pie (NAV total, Σnoi/Σcosto = YoC ponderado, spread ponderado), **tooltip por encabezado**. Config `cap de mercado` editable junto a apreciación/costo venta/sp500.
- **BLOQUE 3 (`os/inv-portal.js`, Mi Casa):** tarjeta **"Cómo se crea valor en esta casa"** — NAV grande (valor de tu parte hoy) + valor creado (spread pp + valor forzado $, "aprox., supuesto cap mercado X%") + frase simple YoC vs cap + NOI, **tooltips de una línea** por término. Rehab/sin renta → estado honesto (sin spread/NAV inflado); deuda en registro → sin NAV confiado.
- **BLOQUE 4:** `tipo_contrato` (NNN/NN/N/N/D) como **select** del Bloque 2 de params + ⓘ (no cambia el NOI; explica por qué es alto/bajo) + columna en la tabla admin + etiqueta en la tarjeta del inversor.

**ANTES:** ninguno de los 4 indicadores era explícito; el admin no veía YoC/spread/valor forzado/NAV por casa; el inversor no tenía un "cómo se crea valor" simple; cap de mercado no existía como supuesto editable; tipo de contrato no se capturaba.

**DESPUÉS (verificado en prod `empresa-os-admin.vercel.app`, 0 pageerrors):**
- **NAV = equity del panel (DoD crítico):** Capitol `panel.equityActual $106,500 === valorCreado.nav $106,500` ✅; con deuda amortizada también (Dove pct0.5 demo: panel $44,412 = nav $44,412, usa el saldo amortizado $281,175, no el crudo $282,000) → **un solo número, cero doble fuente**.
- **Tabla admin (prod):** Capitol → costo $285,000 · NOI $20,340 · cap mkt 7.00% · **YoC 7.14% · spread +0.14pp · valor forzado $5,571** · valor $500,000 · deuda $233,750 · **NAV $106,500**. Footer: **NAV total $790,139** · YoC ponderado 3.02% · spread ponderado −3.98pp.
- **Honestidad:** Dove NOI −$240 → spread −7.09pp / valor forzado −$261,429 (negativo REAL: su cuota refi > renta, coincide con su déficit conocido), NAV $0 (pct 0 por Airtable/B5). **Wellington (rehab sin datos): "por completar" — sin spread/valor forzado, deuda y NAV = "en registro", NO suma al NAV total** (fix: se detecta por `deuda_vigente==null`, no por el panel que colapsa null→0). Echo: por completar (sin renta en ff_deals).
- **Tarjeta inversor (prod, Dove):** renderiza simple con **5 tooltips**, NAV con desglose ($370k − $282k)×0% en papel, valor creado etiquetado supuesto, NOI con ⓘ.
- ci:gate **15/15** verde. Migración idempotente (solo seed de config, sin DDL destructivo).

## 30-jul · 🚨 BLOQUE B5 (CRÍTICO) — el % del inversionista se sincronizaba de la columna EQUIVOCADA

**El bug:** `inv_holdings.reparto_pct` (de él dependen distribuciones y TIR) venía de `ff_deals.ownership_pct`, que el sync mapea de Airtable Propiedades → **"Porcentaje de Owner Ship"** (`flddh8bS7oP34ak1M` = % de la EMPRESA). El correcto es **"Porcentaje del Inversionista"** (`fldS7Jx6LgM19BXcY`). Son distintos y a menudo COMPLEMENTARIOS → el portal mostraba el % del operador como si fuera el del inversionista.
- **ANTES (17 casas mal):** Stonleigh 60%→40 · Idlewood 65%→35 · Barkbridge 60%→40 · Capitol 60%→40 · Michelle/Picnic/Nesting 60%→40 · Arcadia/Ramble 65%→35 · Meadow 40%→50 · Echo/Denfield/Childress/Virginia/Bartlett/Capps/Dove 100%(o 50)→0.
- **Fix (`20260730110000_inv_reparto_from_matriz.sql`):** `ff_deals` += `investor_pct` (columna nueva) + RPC `inv_reparto_from_deals()` que espeja `investor_pct` → `inv_holdings.reparto_pct` + param `reparto_inv`. Sync `sync-ff-airtable` corregido (mapea `fldS7Jx6LgM19BXcY` → `investor_pct` y llama la RPC al final) — **deployado + re-sincronizado**.
- **DESPUÉS (verificado contra Airtable):** Stonleigh 0.4 ✓ · Idlewood 0.35 ✓ · Barkbridge 0.4 ✓ · Capitol 0.4 ✓ · Wellington 0.5 ✓ · Bramble 0.5 ✓ · **0 discrepancias** en las 28 casas, y **0 tras un resync completo** (self-healing: cada sync re-deriva de Airtable).
- **⚠ FLAG para Juan (7 casas con capital aportado > 0 pero % = 0 en Airtable):** Denfield $46k · Virginia $45k · Childress $45k · Echo $38k · Dove $25.4k · Bartlett/Capps $11.5k. El % ahora respeta Airtable (0%); si esos inversionistas SÍ tienen participación, cargar "Porcentaje del Inversionista" en la Matriz y el próximo sync lo corrige solo. (Dove es la casa 🧪 demo del QA — ahora 0% por Airtable.)

## 30-jul · 🔧 BLOQUE B — obs de Juan: hm_tasa (B1), override de compra (B3), confirmaciones (B2)

**B1 — formato de la tasa del HML** (`os/inv-admin.js` + `os/inv-portal.js`). Wellington tenía `hm_tasa="0.10.24"` (roto → se leía 10.0%).
- ANTES: el input de tasas se escribía en fracción (0.1024) y roto quedaba sin validar.
- DESPUÉS: el input de **hm_tasa se escribe en % directo** ("10.24" = 10.24%), se guarda como fracción (0.1024), con sufijo "%" y **validación que rechaza dos puntos** ("0.10.24" → error) o no-numéricos. Todo el sistema sigue usando la fracción (0.1024) en los cálculos. Nuevo `$pct2` (2 decimales) → **Info del Deal muestra "@ 10.24%"**. Dato de Wellington corregido en prod: `hm_tasa 0.10.24 → 0.1024`. Verificado (node): input 10.24→0.1024, "0.10.24"→REJECT, display 0.1024→"10.24", round-trip estable, Info del Deal "@ 10.24%".

**B2 — hm_compra/hm_rehab (solo confirmar):** Wellington efectivos = **hm_compra $159,375 · hm_rehab $160,000** (el rehab vive como override manual en `inv_param_overrides`, base 0) · HML total $319,375. La UI usa el efectivo (override ?? base), así que muestra $160,000. Valores NO tocados. ✓

**B3 — override manual del precio de compra** (`os/inv-portal.js`). El mecanismo de override (`inv_param_overrides`, patrón "real·Airtable / manual·override" reversible con ↩) YA funcionaba en el admin (compra es param auto → editarlo crea override; Wellington ya tenía uno = $190,000). El hueco real: los **displays del inversor ignoraban el override** y usaban `ind.compra` (Airtable).
- DESPUÉS: `ipRendPaneles` (Panel de Rendimiento) y `renderIndicadores` (E4, apreciación) **prefieren el override de `compra`** cuando existe. Info del Deal ya lo usaba (params merged). Reversible sin borrar el de Airtable.

## 30-jul · 📈 BLOQUE A — credibilidad del Panel de Rendimiento (ajustes finos)

**A1 — NO anualizar TIR en holds < 1 año** (`os/inv-indicadores.js` + `os/inv-rendimiento.js` + `os/inv-portal.js`).
- ANTES: `casa()` marcaba `tirNA` solo si `dias < 30` → una casa de pocos meses con el ARV ya subido anualizaba a TIR extrema (Echo ~387%, Dove cartera 58.8%) no representativa.
- DESPUÉS: umbral **< 365 días** para `tirNA`/`tirActivo`/`aprecAnual`. `inv-rendimiento.panel` suprime `realizado.tir` (→ null, flag `tirCorto`) y agrega `dpi/rvpi/tvpi`; `portafolio()` suprime la TIR anualizada si el hold ponderado por capital < 1 año (`tirCorto`) y expone DPI/RVPI/TVPI. UI muestra el **múltiplo + nota** "En fase de valorización — la TIR anualizada aún no es representativa (hold < 1 año)". Verificado Echo (node): realizado.tir=null, DPI 1.00 / RVPI 3.43 / TVPI 4.43, horizonte 6a TIR 52.7% (multi-año, intacta), cartera tir=null.

**A2 — supuesto de crecimiento de renta 8%→4%** (`ff_uw_config`): `update esc_crec_renta_anual '0.08'→'0.04'` (aplicado en prod). Resto conservador: apreciación 0.04 · costo_venta 0.07 · vacancia 0.05 · sp500 0.10 — todos etiquetados "supuesto" y editables en el Analizador.

**A3 — el titular lidera con lo REALIZADO** (`renderRendimiento`): el resumen de la pestaña 📈 Rendimiento ahora encabeza con **Capital invertido · Distribuciones recibidas (DPI) · Tu equity hoy en papel (RVPI) · TVPI** (antes lideraba "TIR de tu cartera", que era casi toda proyección). La TIR anualizada quedó **secundaria** y solo se muestra si el hold ponderado ≥ 1 año; si no, "📊 En fase de valorización — el número que importa hoy es el TVPI". Por casa: el escenario de venta 4/6/8 quedó rotulado **"proyección · supuesto"** (TIR proyectada / múltiplo proyectado), y las casas sin distribuciones muestran "🏗 En fase de rehab/estabilización — retornos aún no realizados". Banner realizado-vs-proyectado ya visible.

## 30-jul · 📈 PARTE 1 — Panel de Rendimiento del inversionista (Robinhood, números REALES)

**Qué:** nueva pestaña **📈 Rendimiento** en el portal del inversor — indicadores estándar de real estate sobre datos REALES de Supabase, con las proyecciones etiquetadas "supuesto" y editables (nunca como hecho). Regla de credibilidad del CEO respetada.

**Módulo nuevo `os/inv-rendimiento.js`** (PURO, browser+node; reusa `invEsc.desdeDatos`/`saldoTras` — cero redefinición):
- `panel({ind, Pv, holding, distribuciones, hoy}, cfg, horizonte)` → capital, valor actual (avalúo REAL `paper_value` o proyección declarada), **4 fuentes de ganancia** (flujo cobrado = distribuciones pagadas · apreciación = (valor−compra)×% con CAGR · amortización "se paga sola" = principal pagado del refi × % · cash-out × %), equity actual, retorno total $/%, CoC mensual/anual, **TIR realizada** (XIRR de flujos REALES fechados: −capital@compra + distribuciones + equity hoy), **escenario de venta** (precio×(1+aprec)^N − costo venta − payoff amortizado → neto×% → TIR y múltiplo por horizonte), **vs S&P 500** (capital compuesto a tasa supuesta). XIRR propia (bisección base 365). `porCompletar` honesto (jamás inventa).
- `portafolio(paneles)` → XIRR de TODOS los flujos reales + agregados.

**Fuentes (todo Supabase, ya sincronizado):** `inv_holdings` (capital/%), `inv_distributions` (flujos pagados fechados), `inv_indicadores_data` RPC (compra/close_date/paper_value/deuda/refinanciada), params (refi_tasa/plazo/mes, cashout_real, apreciacion/costo_venta override). **Ningún dato inventado**: la apreciación sale del avalúo real (ff_deals.appraisal/arv); sin avalúo → proyección a tasa supuesta VISIBLE.

**Portal `os/inv-portal.js`:** pestaña 📈 Rendimiento = resumen cartera (total invertido · equity hoy · retorno total $/% · TIR cartera) + **gráfica de flujo real acumulado** (solo distribuciones pagadas) + **card por casa** con las 4 fuentes + **selector de horizonte 4/6/8** (recalcula TIR/múltiplo/S&P) + `<details>` con la **línea de flujos que alimenta la TIR** (credibilidad) + tooltips de una línea por término + avisos (proyección sin avalúo · TIR <1 año volátil). Solo lectura.

**Config (admin `os/inv-admin.js`):** `apreciacion_anual_default`/`costo_venta_pct`/**`sp500_anual`** (nueva key `esc_sp500_anual`=0.10 en ff_uw_config; `cfgDesde` la mapea) ahora **editables** en el tab 🔮 Analizador (inputs + 💾 Guardar → `iaSaveEscCfg` upsert a ff_uw_config); se reflejan en el portal al refrescar.

**VERIFICADO:**
- Node (motor, datos reales Echo Lane): capital $38,000 · valor $467,000 (appraisal real) · 4 fuentes (flujo $38,000 · aprec $237,000 · amort $854) · **TIR horizonte 4/6/8 = 67.5% / 52.7% / 44.1% · múltiplo 5.70x / 6.92x / 8.27x · vs S&P 1.46x/1.77x/2.14x**.
- **Headless (UI real, investor Dove Springs, refinanciada):** cartera TIR **58.8%** · equity hoy $44,406 · retorno $93,906; card TIR **17.7% (6a) → 16.4% (8a)** al togglear horizonte · vs S&P "tu casa rinde más" · 4 fuentes visibles · **0 pageerrors**. Números cuadran con inv_holdings/ff_deals/ff_hml_loans.

**Registro:** módulo en index.html + inversionista.html + BUNDLE_FILES + STATIC_COPY. `ci:gate` 15/15.

## 30-jul · 🧹 PARTE 2 — 4 campos derivados del motor → SOLO LECTURA en el admin

**Contexto:** en Modelo & Movimientos / Parámetros, cuatro campos que son **cálculos del motor** (no inputs de negocio) aparecían como `<input>` editables → el admin podía pisarlos por error.
- **ANTES:** `util_anual_postrefi`, `anio0_postrefi`, `postrefi_perfil`, `cash_atrapado_real` renderizaban como input de texto libre (editables + guardables).
- **DESPUÉS:** `IA_PARAM_CALCULADO` en `iaParamControl` → esos 4 se muestran como **valor + badge "🔒 calculado"** (sin `<input>`). Como no hay `id="ia-p-<key>"`, `iaSaveBloque` los saltea (`getElementById` nulo → `continue`) → imposible pisarlos a mano. **No se borró ningún dato**; solo cambió el control a solo-lectura. El resto de parámetros sigue editable igual (harness 4/4: los 4 calculados read-only, `compra` sigue input).

## 30-jul · 💸 DISTRIBUCIONES AUTOMÁTICAS — cálculo mensual por inversionista (100% desde Supabase)

**Qué:** la pestaña Distribuciones (admin → Inversionistas → 💸) sumó una **modalidad "Cálculo automático"** junto a la Manual (que queda igual). Calcula el monto mensual por inversionista leyendo SOLO Supabase (Airtable = linaje; el sync ya trae todo). El monto calculado es **editable** antes de confirmar.

**Migración `20260730100000_inv_dist_automatica.sql` (aplicada en prod):**
- `inv_distributions` += `origen` ('manual'|'automatica', default 'manual') + `calc_meta` (jsonb, snapshot de trazabilidad).
- RPC `inv_refinanced_props()` (SECURITY DEFINER, guard `has_area('fix-flip')`): elegibilidad = `ff_hml_loans.fecha_refi` NO nulo **O** `ff_deals.stage ilike '%refinanciada%'`. Verificado: **4 refinanciadas de 28**.
- RPC `inv_dist_calc(property_id, investor, billing_ym)` (SECURITY DEFINER, guard fix-flip): recalcula fresco en cada llamada.
  - ingresos ← `pm_payments` (type='ingreso', billing_ym) · **cruce por `pm_properties.id`** (el property_id canónico vive en pm_properties; pm_payments/pm_expenses apuntan a pm_properties.id — mismo patrón que `inv_ledger`).
  - gastos ← `pm_expenses` (category='house', billing_ym) **excluyendo hipoteca**.
  - ref30 ← `ff_hml_payments.ref30` por `to_char(coalesce(fecha_ref30,fecha))=mes`, cruzado por address_norm.
  - pm_fee = ingresos×4% (calculado, no está en Airtable) · reparto_pct ← `inv_holdings` del (investor+property) → **por inversionista y por casa, resuelve multi-inversionista**.
  - `ganancia_neta = ingresos − gastos − pm_fee − ref30` · `distribucion = ganancia_neta × reparto_pct`.

**🐛 De-dup de la hipoteca (decisión de correctitud, ANTES→DESPUÉS):** la fórmula literal del spec (gastos = pm_expenses category='house') **duplicaba la hipoteca**: en Echo jun-2026 el gasto 'house' $3,084.34 == ref30 $3,084.34 al centavo (la cuota está booked en pm_expenses Y en ff_hml_payments) → neta salía −$6,168.68 (2× cuota). Adopté el mismo de-dup que la vista `inv_ledger` ("la hipoteca ya entra por ff_hml_payments"): se excluye `~*'hipoteca'` de gastos. **DESPUÉS**: Echo may-2026 = ingresos 3,600 − 0 − 144 − 0 = neta **3,456** × 100% = **$3,456.00**; jun-2026 = 0 − 0 − 0 − 3,084.34 = **−$3,084.34** (una sola cuota). Verificado E2E con JWT admin real (guard pasa; no-admin → 0 filas / "no autorizado").

**Frontend `os/inv-admin.js`:**
- Toggle de modalidad (✍️ Manual / ⚙️ Cálculo automático). Manual = sin cambios (ahora graba `origen:'manual'`).
- Auto: inversionista + casa (**solo refinanciadas**, de `IA.refi`) + selector de MES ("Junio 2026", `iaMesesRecientes`+`invEngine.mesEs`) + "Calcular monto automáticamente".
- **Parte D — desglose visible** bajo el monto: Ingresos · (−)Gastos operativos (sin hipoteca) · (−)PM(4%) · (−)Ref30 · (=)Ganancia neta · % del inversionista · (=)Distribución.
- **Parte E — override**: "Monto calculado" editable; al editar → 📝 + tooltip "valor automático: $X" + "🔄 volver al automático".
- **Parte F — casos**: F1 ingresos=$0 → bloquea con aviso; F2 neta<0 → confirm "¿continuar?"; F3 falta link Rentas/holding → aviso ⚠ inline permitiendo cargar manual; F5 duplicado inv+casa+mes (auto por billing_ym o manual por fecha) → confirm. Elegibilidad: casa no refinanciada nunca aparece en el dropdown + guard en `iaDistCalcular`.
- **Parte G — trazabilidad**: `calc_meta` guarda ingresos/gastos/pm_fee/ref30/reparto_pct/neta + monto_calculado + monto_final + editado + calc_at.
- **Parte H — listado**: nueva columna **ORIGEN** (✍️ Manual / ⚙️ Automática, con 📝 si editado) + tooltip con el desglose completo del snapshot.

**Cierre:** node --check OK · build OK · `ci:gate` **15/15 verde**. ⚠ Nota verificación: Echo jun-2026 real = $0 ingresos → muestra el aviso F1 (honesto); el mes con datos reales es may-2026 ($3,456).

## 29-jul · 🏷 INFO DEL DEAL + HML estructurado — auditoría E2/E3 + estrategia/plan_salida como SELECT

**Contexto (hallazgo honesto):** casi todo lo que pedía el ticket YA estaba implementado en los mega-builds **E2** (HML desglosado, draws migrados, hm_inicial calculado) y **E3** (tarjeta "Info del deal" con HML en 3 líneas). Auditado contra la data viva y el código; se completó el ÚNICO hueco real y se reportan las incoherencias de datos (Parte D).

**Data layer (confirmado en prod, `inv_model_params`):** `hm_compra`/`hm_rehab`/`hm_tasa` = 23 casas c/u · `estrategia`/`plan_salida` = 3 casas · `hm_inicial`/`draw_m1`/`draw_m2` = **0 filas** (ya no existen, como decía la corrección). No se reconstruyó el Bloque 4 ni se re-migraron draws.

**Ya estaba (verificado, sin tocar):**
- **Portal `os/inv-portal.js` — tarjeta "Info del deal"** (líneas 525-553): Estrategia y Plan de salida con `pend()` → "Pendiente de definir" (nunca "sin dato"); HML en 3 líneas SIN duplicar — `Compra` (kv propia) + `HML para compra` (hm_compra @ hm_tasa) + `HML para rehab (escrow)` (hm_rehab); casos borde: hm_compra=0 → "Compra: cash", hm_rehab=0 → "$0", null → "Pendiente". Estado/Tu %/ARV/Refi también cableados. Parte B = OK.
- **Admin `os/inv-admin.js` — Bloque 4** (`b4`, línea 785): regex `hm_compra|hm_rehab|hm_tasa|hm_plazo|hm_fecha_inicio|hm_puntos|otros_inv_m\d+` — **sin draw_***; `hm_inicial (HML total)` mostrado CALCULADO = hm_compra+hm_rehab, no editable; **advertencia amarilla** cuando Σ draws "(construcción)" > hm_rehab (línea ~948). Bloque 2 (`b2`) captura estrategia/plan_salida/fecha_exit_proyectada. Objetivos 1 = OK.
- **Conectividad (Parte C):** admin escribe manual→UPDATE directo a `inv_model_params`, auto→`inv_param_overrides`; el portal (`ipLoad`, líneas 116-131) mergea overrides (valor efectivo = override). Edición del admin → visible en el inversor al refrescar. OK.

**Hueco real corregido (ANTES → DESPUÉS) — Objetivo 2:**
- **ANTES:** `iaParamRow` renderizaba TODO parámetro como `<input>` de texto libre → `estrategia`/`plan_salida` a mano. Efecto real en la data: la misma estrategia escrita 3 formas distintas — **"Fix & Hold" / "Fix and hold" / "Fix And Hold"** — y `plan_salida` con descripciones largas inconsistentes ("Híbrido por Unidades…", "Hold a 31 años: refinanciación…", "Refinanciación").
- **DESPUÉS:** nuevo `IA_PARAM_OPCIONES` + `iaParamControl(p,bid)` → `estrategia` y `plan_salida` renderizan **`<select>`** con las opciones canónicas del ticket (estrategia: Fix & Flip / Fix & Hold / BRRRR / Wholesale / Otro · plan_salida: Venta / Refinanciación / Renta a largo plazo (Hold) / Sin definir aún). **Preserva el valor legacy** (lo antepone como opción si no está en la lista → cero pérdida de datos) y ofrece la canónica al lado. Mismo `id="ia-p-<key>"` → `iaSaveBloque` guarda sin cambios de contrato. Nuevo `iaAddSelectParam(key,desc)` + los links "＋ estrategia/＋ plan_salida" del Bloque 2 crean la fila vacía y muestran el select listo para elegir (sin obligar a teclear). Verificado con harness node: 6/6 (canónica selected, legacy preservado, vacío→sin definir, input normal intacto, id contract).

**PARTE D — INCOHERENCIAS (solo reporte, NO tocado):**
- **`hm_tasa` corrupta en Wellington = "0.10.24"** → `parseFloat` la lee como 0.1 (10%). Es la única casa con tasa malformada (las otras 22: 0.099–0.1299 válidas). No la corregí porque no sé la tasa real (¿10.24%?). **Acción humana:** corregir el valor en el Bloque 4 de Wellington.
- **`estrategia` con 3 grafías** para el mismo valor (ver arriba) — el select ya lo canoniza a futuro; las 3 casas existentes conservan su valor legacy hasta que un humano re-elija la opción canónica.
- **Campos DERIVADOS cargados como input manual** (deberían ser calculados/no-editables): `util_anual_postrefi` (17), `anio0_postrefi` (22), `postrefi_perfil` (17), `cash_atrapado_real` (22) — son calibración del motor (fuente excel(calibrado)/derivado), no inputs de negocio. Editables hoy en los bloques del admin. Sugerido: marcarlos no-editables o moverlos a una sección "calibración del motor".
- **`compra` de Wellington = $200,000** en el snapshot `inv_model_params` vs **$205,000** del espejo vivo (nota E4 "espejo vivo gana sobre snapshot"). El ticket esperaba $205,000 en la tarjeta. La tarjeta usa `p.compra` (snapshot). Coherencia de snapshot vs espejo — decisión de producto, no tocada.

**Cierre:** node --check OK (portal+admin) · build OK · `ci:gate` **15/15 verde**.

## 29-jul · 💵 SALDO OPERATIVO (P&L SÍ/NO) — re-verificación contra data viva + pulido de meses legibles

**Contexto (hallazgo honesto):** la tarea pedía corregir el saldo del Ledger (admin) y del Flujo Mensual (portal) para que SOLO cuente movimientos P&L SÍ, más el filtro de meses en "Julio 2026". **El núcleo ya estaba implementado en el mega-build E1** (commit `1fa602f`, 21-jul), presente en la rama actual. Se re-verificó contra la data en prod y se aplicó el pulido de meses que faltaba.

**Regla ÚNICA (confirmada, `os/inv-engine.js:pnlSi`):** P&L SÍ = categoría en `renta/ingreso/operativo/tax`; P&L NO = `inversion/inversión/financiero/distribucion` (todo lo demás → false). El saldo/balance operativo acumula SOLO P&L SÍ; los P&L NO se muestran en tenue (opacity .55) + badge "P&L NO" repitiendo el saldo anterior. Deriva de la columna `categoria` de `inv_cashflow_real` (no hay booleano guardado) — como pide la corrección de arquitectura.

**ANTES → DESPUÉS (verificado contra prod, 101 Starbright Dr `e4bb81f8-…`):**
- Ledger admin (`iaTabLedger`, inv-admin.js:744) y Flujo portal (`renderFlujo`, inv-portal.js:828): saldo YA se computa con `invEngine.pnlSi` (líneas 756/762 admin, 842-851/891 portal). Título "Saldo operativo (P&L): $X", subtotales por categoría intactos, tag P&L NO en tenue, filtro de meses con `invEngine.mesEs("2026-07")→"Julio 2026"`.
- **Data viva Starbright:** los 2 draws migrados + "Draw 1" + "Invoice 1" son `categoria=financiero` → **P&L NO, no mueven el saldo** (ya recategorizados en E1; el "Draw 1 · ingreso −427k" del ticket ya no existe). Entradas de prueba `TEST-E1 renta $3,000` (ingreso, P&L SÍ) y `TEST-E1 utilities $200` (operativo, P&L SÍ) → **saldo operativo = $2,800**, exactamente lo que pide la sección PRUEBAS del ticket. El `inv_ledger` RPC categoriza en fuente: compra/draws→`inversion`, HML/cash-out/cuotas→`financiero`, renta→`renta`, gastos Rentas→`operativo`, distribuciones→`distribucion`.
- **Pulido aplicado (único gap real, alineado con Problema 2 / Parte C — "fechas técnicas 2026-07 confunden"):**
  - `os/inv-portal.js` — detalle **año→mes** de Flujo Mensual: columna "Mes" `"2026-07"` → `invEngine.mesEs(ym)` = **"Julio 2026"**.
  - `os/inv-admin.js` — tab **Modelo & Movimientos**, prefijo de fecha en las listas ✍️ Manuales y ⚙️ Auto: `slice(0,7)="2026-07"` → `invEngine.mesEs(...)` = **"Julio 2026"** (la fecha exacta sigue en el `title`).
  - Los filtros de mes (selector "Todos los meses") en Ledger y Flujo ya usaban `mesEs`; Distribuciones muestra fecha exacta por fila (correcto — una distribución tiene fecha, no mes).
- **Nota A.4 (decisión de diseño):** se etiqueta SOLO el P&L NO (excepción visible); los P&L SÍ quedan sin badge para no meter ruido en cada fila de renta/gasto — el header + título ya declaran que solo P&L SÍ mueve el saldo. Coherente con el diseño E1.
- **Lineaje/gate:** re-corrida `lineage:register` contra prod (202/202 trazados); el crawler descubrió "Rentas › Pagos › Total atrasado" ($20,825) sin registro → curado a `pm_payments.deuda` (Balance de pago, regla pmPayBalance). **`ci:gate` 15/15 verde.** node --check OK en los 3 archivos.

## 20-jul · 📋 RESERVAS: botón "📄 Guía" por tarjeta + fix reserva duplicada en "Pasadas"
Dos reemplazos puntuales en `pm/pm-main.js` (pedido exacto del CEO):
- ✅ **Botón "📄 Guía" en cada tarjeta de reserva** (no finalizada/cancelada): llama `pmGenerateWelcomeGuide(property_id, unit_id?)` — la guía de bienvenida por unidad ya existente, ahora accesible directo desde la reserva sin pasar por la ficha de la casa.
- 🐛 **Fix duplicado en "Pasadas / Finalizadas"**: `pastOrFinished` usaba `(b.end_date || '') < today` — el string vacío ordena antes que cualquier fecha, así que TODA reserva sin fecha de salida (`end_date` null, ej. J'Onna Heath) caía también al grupo de pasadas y se mostraba duplicada. Ahora exige `end_date` presente: `(b.end_date && b.end_date < today)`.
- ✅ node --check OK · `pmGenerateWelcomeGuide` verificada global (pm-main.js:7526-7531).

## 20-jul · 📊 GASTOS: tablas ordenables por columna (Por Casa + Operativos)
- `pmExpenseTable` (compartida por las sub-pestañas Por Casa y Operativos) ganó encabezados clickeables: 1er clic A→Z ↑, 2º Z→A ↓, 3º vuelve al orden por defecto. Columnas: Mes gasto (billing_ym), Fecha, Casa, Categoría, Monto (numérico), Pagado, Notas — Factura y Acc. quedan fijas.
- Estado `expSortKey/expSortDir` en pmaState + `pmExpenseSortVal/pmExpensesSorted/pmExpenseSort` (localeCompare es, sensitivity base). La tabla de Nómina es aparte — pendiente si se pide.
- Verificación: node --check + build OK + suite de estatus 17/17 intacta.

## 22-jul · 🔮 ANALIZADOR DE PORTAFOLIO — escenarios de venta 3/5/8 + waterfall (commit 509f088)
- **Motor puro `os/inv-escenarios.js`** (browser+node): PMT/Saldo(n) exactos de la spec · IRR REUSADA de invEngine (una definición) · métricas base sobre snapshot FF (EGI/NOI/cap implícito/servicio/flujo/CoC/DSCR, fuente declarada — distinta lente que el modelo mensual del portal, verificada equivalencia donde comparten fuente: equity = invInd.equityHoy IDÉNTICO en Dove) · waterfall simple (capital→excedente×pct) + preferred opcional · DOS niveles siempre juntos (bruta del deal / neta del inversionista).
- ✅ **VALIDACIÓN OBLIGATORIA: 18/18 números del ejemplo CLAVADOS (nivel bruto)** — 3a: 506,189/295,017/175,738/19,478/74.4%/4.88x · 5a: 547,494/287,101/222,068/35,200/50.7%/6.43x · 8a: 615,856/272,950/299,797/63,820/38.0%/9.09x.
- **Dove real** (aporte 25,400 · 50% · renta 3,500 · gastos 40,140/año · papel 370,000 appraisal · deuda 282,000 @11.39% amortizada): flujo −33,468/año (consistente con el déficit conocido: cuota refi > renta neta; flujo operativo real ~$155/mes ✓ CLAUDE.md), DSCR ⚠, escenarios calculados con bandera "flujo negativo — la fórmula de la spec amplifica el déficit, leer como señal de salida temprana" (se mantuvo la fórmula VALIDADA, la bandera es la capa honesta). Equity 88,000 = invInd ✓.
- **Config**: defaults `esc_*` en ff_uw_config (vacancia 5% · apreciación 4% · renta +8% · costo venta 7% · cierre $8,000 · preferred off · benchmark 15%) · override por casa en inv_model_params (manual > default, origen etiquetado) · RPC `inv_esc_config` (supuestos legibles por el inversionista) · `gastos_anuales` agregado a inv_indicadores_data (el portal no lee ff_*).
- **Salidas**: A) tab 🔮 Analizador (admin FF): estado por casa · venta 3/5/8 bruta+neta+múltiplo vs benchmark (verde/rojo) · consolidado agregado · descomposición renta+amortización+plusvalía (5a) · **recomendación por casa SOLO ADMIN** (regla declarada: riesgo primero — DSCR<1.20/flujo −/equity atrapado/apreciación manual optimista — después equilibrio TIR↔múltiplo vs benchmark). B) portal "¿Y si vendemos?" en Mi Casa (+vista del inversor): 3 filas NETAS con reparto, ⓘ waterfall/bruta-neta, "por cada $1 hoy vale $X" (reusa equity multiple), banner supuestos "no son promesas", nota humana si flujo negativo. C) 🖨 hoja 1 página por inversionista (posición + escenarios netos + supuestos + disclaimer "análisis interno, no asesoría").
- Honestidad: sin deuda o sin renta = "por completar" (jamás inventar) · +7 términos al glosario (waterfall, tir_bruta, tir_neta, producto_neto, egi, preferred_return, escenario_venta) · TIR a 1 decimal.
- ci:gate 15/15 · smoke prod 16/16 · 0 pageerrors · bundle `c8e24e346111`.

## 22-jul · 🚑 AUDITORÍA RENTAS: sync muerto + archivado + TCPA fuera (commits 56d217d·39ed9ba·bb1ee6d)
**ÍTEM 1 — LA RAÍZ (sync Airtable→Supabase muerto)**: diagnóstico confirmado y AMPLIADO — no solo el job 20 con host placeholder (`TU_PROJECT_REF` → "Couldn't resolve host name" cada 15'); `cron_invoke_function` hacía **skip SILENCIOSO** ("succeeded" sin llamar nada) porque `app.settings.service_role_key` jamás se configuró → **TODOS los crons de edge functions estaban muertos** (pm-sync, sync-remodel, sync-clickup, alertas…), no solo Rentas. Y un 3er bug: pg_net timeout default 5s vs syncs de 30-90s. FIX: `alter database` denegado al rol del MCP → key en **VAULT** (secreto `service_role_key`) + `cron_invoke_function` lee vault→setting con `timeout_milliseconds=240000` + `cron.unschedule(20)`.
- ANTES: net._http_response = "Couldn't resolve host name" cada 15'; data solo con sync manual (Tara jun $1,600 stale). DESPUÉS: **HTTP 200** · `last_synced_at` fresco (<1 min) · **tick autónomo 12:00 = 3×200** (pm-sync + remodel + clickup revividos) · Tara jun pactada **$1,000 = Airtable** ✓.
**ÍTEM 2 — Gastos**: NO era código. Post-sync: 75 gastos junio `category='house'` `billing_ym='2026-06'` = **$48,986** en tabla Y EN LA UI (smoke headless: PM → Gastos → junio muestra $48,986). Cero cambios de código.
**ÍTEM 3 — Archivar propiedades**: `pm_properties.archived_manual` + RPC `pm_archive_property` (security definer, guard rentas) + botón **📦 Archivar / ↩ Reactivar** en la card (reversible; badge 📦 ARCHIVADA) — **el 🗑 delete real ELIMINADO de la UI** (revivía con el sync). El sync ahora NO pisa `active/status/archived_at` si `archived_manual=true` (deployado). `v_ocupacion` recreada excluyendo casas inactivas (security_invoker=on; hoy no cambia el 48 — Arcadia/Cervin no tienen unit-rec; el "1 disp" era de la regla del dueño del PM). ANTES: 21 activas · DESPUÉS: **19** (Arcadia + Cervin archivadas), header "19 propiedades" en UI, visibles solo con 📦 Mostrar archivados, **sync manual corrido y NO las revive** ✓.
**ÍTEM 4 — TCPA fuera**: /cobros sin checkbox de consentimiento, sin origen, sin chips SMS✓/✗, sin KPI "Sin consentimiento SMS" (grid 4→3; fila de linaje archivada); panel renombrado "Config del inquilino (operativa)" — idioma/tel/email/día/link + Guardar intactos (verificado en smoke). `consentimiento_sms` queda en tabla sin UI. **Motor `cobros-motor`: canal SMS deshabilitado por completo** (solo email; gate TCPA moot; reactivar = volver a `["sms","email"]`). Deployado.
- ci:gate 15/15 · smoke prod 8/8 · 0 pageerrors · bundle `9f60892efd18`.

## 20-jul · 🗓 PLANNER: el importador no reconocía las fechas del cronograma (mes en LETRAS)
Diagnóstico verificado contra `Seguimiento_Arthur_Stiles_Rd.xlsx`: **59 actividades, 0 con fecha**.
- **Causa**: las columnas Inicio/Fin vienen como TEXTO con mes en letras ("08-Jul", "16-Jul", sin año) y `wpParseExcelDate()` solo entendía Date/serial/ISO/"DD/MM/YYYY" → null en todas las filas. No era problema de datos ni del Estimador — solo el parser del importador (`weekly-planner.js`).
- **Fix**: `WP_MESES` es/en (ene/jan…dic/dec, con sept y normalización sin acentos) + patrón "DD-Mmm[-YYYY]" con año opcional; el año lo fija `wpDoImportExcel` con **`wpImportBaseYear` = año del `start_date` del proyecto destino** (fallback año actual) — el cronograma no trae año. Se mantienen serial/ISO/numérico; `v===0` ya no se descarta.
- **ANTES**: 59 leídas / 0 con fecha. **DESPUÉS (esperado con el mismo Excel)**: ~58/59 con fecha, rango 08-jul-2026 → 17-sep-2026; el preview muestra Inicio/Fin y duración por fila (sin-fecha quedan excluidas por default, como siempre).
- **Verificación**: parser 14/14 strings reales ("08-Jul", "17-sep", "05-Sept", "8 Ago", "12-dic-25", ISO, DD/MM, serial, basura→null) + E2E de `wpParseCronogramaSheet` con hoja sintética de la MISMA estructura (etapas "N. ETAPA" + filas "08-Jul") → 4/5 con fecha, projectStart 2026-07-08, la sin-fecha queda null. node --check · ci:gate 15/15.
- ⚠ Borde declarado: cronograma que cruce de año (dic→ene) necesita año explícito en la celda; con proyectos dentro del mismo año, el año base del proyecto resuelve el 100%.

## 17-jul · 💎 PORTAL INVERSOR v3 — RLS de verdad, guardar parámetros, origen claro, acceso manual (commits 4ee0472 · 53d10b7 · 356448a)
Ajustes de Juan. Migr `20260717110000_portal_inversor_v3` aplicada en prod (+ parche write policies en la misma migr del repo).
- 🐛 **BUG RLS (el serio) — causa raíz encontrada**: Juan (`juan.sanchez49115@`) y "Prueba OS" (`info.flippingrentals@`) tienen perfil OS con área **fix-flip** → TODAS las policies `inv_*` tenían la rama `or has_area('fix-flip')` → en el PORTAL veían las 23 casas y el capital total. Encima las policies de escritura `FOR ALL using(has_area)` regalaban SELECT por la vía permissive-OR (segundo leak). **Fix**: helper `inv_is_investor()` (tiene inv_access activo) — si sos inversionista, la rama admin NO aplica, ni en read ni en write; el preview-admin queda para staff SIN identidad de inversionista. También `inv_portal_resumen()` y `inv_ledger()`.
  - **BEFORE (simulación server-side como Juan)**: 24 holdings · $955,846.14 · 23 casas en resumen. **AFTER**: Juan 0 holdings (no tiene casas asignadas) · **Prueba OS: 2 holdings · $46,000 · 2 casas** (sus casas, exacto) · admin gerencia intacto (24/23/23). Accesos: cada inversor ve solo el suyo.
- 💾 **Guardar en Parámetros del modelo (antes NO persistía visiblemente — solo Enter oculto que ADEMÁS pisaba el valor de la fuente)**: botón 💾 por bloque (1..9 + Otros) con estado `● sin guardar / ✓ guardado` y aviso al salir (tab/casa/beforeunload). Regla: campo MANUAL → update directo a inv_model_params (ahora con audit trigger) · campo AUTO (`real:*`/`excel*`) → **`inv_param_overrides`** (valor + valor_origen + fuente_origen + tipo + editado_por, upsert por property_id+key, soft-delete) — la fuente NO se pisa, **↩ volver al valor de origen** en la fila y en el ⓘ. Portal y motor usan el valor EFECTIVO (override ?? base) — merge en iaLoadCasa/ipLoad. Ciclo verificado server-side: insert→audit `insert` → archive→audit `archive`.
- 🏷 **Origen claro (duda de Juan: "auto" ambiguo)**: badge por parámetro — `real · Airtable FF · <tabla>` (dict ff_deals→Propiedades, ff_draws→Desglose Draws, ff_hml_loans→Datos por casa, ff_hml_payments→Pagos interes) · `estimado · calculado/supuesto` · **`estimado · repartido en partes iguales`** para draws con fuente `real:ff_deals(estimado)` (caso 101 Starbright: sin registro en Desglose Draws → el modelo reparte la remo en 2 meses iguales; verificado en DB) · `manual` · `manual · override`. Test node 9/9 del mapeo con fuentes reales. **ⓘ por parámetro**: qué es (diccionario ~45 keys + genéricos draw_m*/otros_m*), fórmula si aplica, de dónde sale + link al Mapa de Conexiones cuando es `real:ff_*`. Portal: chips `real/estimado/manual` (antes fuente cruda).
- ✍️ **Crear acceso — dos caminos**: 📋 de Airtable (como hoy, ahora con nombre/origen/created_by) · **✍️ manual** (nombre+email al toque, `investor_airtable_id='manual-…'`, badge, contador de casas asignadas) — respeta la MISMA RLS (sin casas asignadas = portal vacío); **⇄ vincular a Airtable** cuando aparece el registro (re-apunta holdings/distribuciones/documentos/mensajes). Selects de inversionista en Casas&reparto/Distribuciones/Documentos/Mensajes incluyen los manuales. Audit: trigger en inv_access + columna created_by ("quién creó cada acceso").
- ✅ node --check · build OK · **ci:gate 15/15** · migr aditiva (reversible recreando policies con la rama vieja).
- ⚠️ **Decisión declarada**: un usuario que es inversionista Y staff a la vez pierde el acceso admin a los datos inv_* de otros (read y write) — si Juan/Prueba OS necesitan volver a ver TODO el módulo /inversionistas como staff, revocarles el inv_access (o quitarles el área fix-flip y dejarlos solo como inversores). Para el CEO decidir por persona.

## 17-jul · 🧭 MAPA: identificadores EXACTOS de Airtable (base·tabla·columna con IDs) + base efectiva por módulo (commits cba5c9a · 4123b2b)
Pedido del CEO: el mapa mostraba el alias amistoso ("Rentas") pero hay CUATRO bases llamadas "Empresa Rentas" — no se podía ubicar el dato para verificarlo/modificarlo.
- ✅ **Registro generado `os/os-lineage-airtable.js`** (nuevo; en index.html + BUNDLE antes de os-lineage.js; regenerable con `scripts/lineage-airtable-gen.mjs`, PAT con schema.bases:read): nombres EXACTOS + IDs de base/tabla/campo de las 3 bases leídas (esquema completo vía API meta, 17-jul) + 4 realms QBO reales (qb_connections) + lista de bases parecidas NO leídas.
- ✅ **① De dónde viene con IDs reales** (`lmATBase/lmATTables/lmATCols` en os-lineage.js): nodo BASE = nombre exacto + baseId (alias corto de subtítulo, sync que la lee, ⚠ si sandbox) · nodo TABLA = nombre exacto + tableId por cada tabla real (alias curados `LM_AT_TALIAS`: "Pagos HML"→"Pagos interes (HML & REFI)", "Nómina Admin"→"Nomina Equipo Administrativo - Remodelación", "Plataformas"→"Gasto Por Plataformas - Remodelación") · nodo COLUMNA = **UNA por campo**: derivados listados uno por uno con su field ID (split ' / ', ' + ', ' → ', ' × '; los fld ya inline se resuelven por ID → muestra el nombre VIGENTE en Airtable, ej. flduMsIV5gZRIv1eU hoy se llama "Balance de pago"); lo que no es campo directo queda declarado "derivado / columna del espejo" — jamás se inventa un field ID. Aplica a flujo, LISTA, panel del diagrama y ⓘ overlay; export JSON/CSV += base_exacta/base_id/tabla_ids/field_ids/url_airtable.
- ✅ **🔗 Abrir en Airtable**: botón por tabla → `https://airtable.com/<baseId>/<tableId>` (flujo, lista ↗, diagrama, ⓘ). El "editado por / origen del registro" se mantuvo.
- ✅ **📡 Base efectiva por módulo declarada en /mapa** (overview + línea compacta en cada sistema): verificado con `supabase secrets list` que **AIRTABLE_BASE_ID / _FF / _REMODEL NO existen** → el default del código de cada sync ES la base efectiva. Alerta `⚠ BASE DE PRUEBA` si el nombre contiene sandbox/plantilla/ejemplo/prueba/test → **Rentas dispara la alerta** (ver tabla). FF confirmado: lee la matriz real, NO la Plantilla appvfqSPiwuiD1iLm ni "Rental Profitss | Producción".
- 📋 **Mapeo base-ID → módulo (para que el CEO confirme la de producción)**:
  | Módulo (sync) | Base que lee HOY | Base ID | Estado |
  |---|---|---|---|
  | pm-sync-airtable (Rentas) | "Empresa Rentas — Modelo Nuevo (sandbox)" | `apptTKRYbx6gu701i` | ⚠ **el nombre dice sandbox** — si ya es la operativa real, renombrarla en Airtable (sacarle "(sandbox)") y regenerar el registro; la alerta se apaga sola |
  | sync-ff-airtable (Fix & Flip) | "Flipping Rentals matriz " | `applMXFyPq1hXj7iN` | ✓ la real (no la Plantilla) |
  | sync-remodel-airtable + sync-remodel-workers | "Empresa de Remodelación" | `appwFRqnkyyRljOld` | ✓ |
  | qb-oauth/qb-sync (Contable) | QuickBooks: Flipping Rentals LLC 9341456865356422 · Structure One LLC 9341456789703342 · EverHome LLC 9341456789885517 · Rental Profits LLC 9341456789875094 | — | ✓ 4 realms |
  | NO leídas (parecidas) | "Empresa Rentas" vieja `appzEnsuy4qPT6iHj` (deprecada) · "Empresa Rentas" `appHZs8DWIBhwhunZ` · "Empresa Rentas (Ejemplo)" `appQRDa3usFb6Loei` · "…matriz Plantilla" `appvfqSPiwuiD1iLm` · "Rental Profitss | Producción" `app0XnxP7XtQJL1sC` | — | declaradas en el mapa (colapsable) |
- **ANTES**: nodo columna "Reserva / Unidad / Fecha Entrada / Salida" en un solo texto, base "Rentas" sin ID, sin salto a Airtable. **DESPUÉS**: cada parte con su campo exacto + fld ID (verificado en node con el código real: "Monto préstamo Refi / tasa / plazo" → fldif2zUp7yJDfiAu · fld4Hv76aZCjXVhQ3 · fldbnPE1wT9Fm6D46; "(Gasto Materiales + Gasto trabajadores) × 1.05" → fldtqskgPEajaJT4Y + fldNmR8PgZWdjutIw; overhead 3 tablas → tblk1vS2/tblv77D/tblgd4w), botón directo a la tabla.
- ✅ node --check todos · build OK · **ci:gate 15/15** (cobertura de linaje 211/211 intacta — solo cambió el render, no las claves de data_lineage).
- ⬜ Humano: confirmar si `apptTKRYbx6gu701i` es la base operativa definitiva de Rentas (y renombrarla sin "(sandbox)") o si hay que apuntar el sync a otra; si algún día se setean los secrets AIRTABLE_BASE_ID*, correr `scripts/lineage-airtable-gen.mjs` y actualizar el registro.

## 16-jul · 🎚 SLIDER de ARV ajustable (draggable) → fuente única que fluye a todo
Pedido del CEO: el motor da rango (conservador·probable·optimista); poder MOVER la barra para fijar el ARV propio y usarlo en las otras calcs.
- **ANTES**: `apRangeBar` era una barra SOLO visual (dot fijo al 50%); el único valor usable era el probable del motor (botón "Usar $X").
- **DESPUÉS** (`apArvSlider` en `pm/ff-arv-pro.js`, compartido por modo Simple y Experto):
  - **Slider draggable** (`<input type=range>` estilizado, thumb 24px) sobre el rango real (min = cons − 40% del span · max = opt + 40%, permite ir más allá). **Marcas** Conservador/Probable/Optimista clickeables con **snap**. **Campo numérico** sincronizado (escribir el ARV exacto, ej. la tasación) que mueve el slider y viceversa. **Update EN VIVO durante el drag sin re-render** (labels por `getElementById`, fluido).
  - **Etiqueta de estado**: "del motor" (verde) vs "ajustado por vos" (ámbar) + **Δ vs motor / appraisal / Airtable** en vivo ("= appraisal", "−5.3% vs motor"). El estimado del motor queda como ancla (no se borra).
  - **"Usar como ARV"** toma el valor DEL SLIDER (ajustado o probable) → `inp.arv` (la fuente única del fix de propagación) → fluye a **Venta (precio) · Cash-Out/Refi (75%×ARV) · MAO · Equity · Command Center · Analítica**, recalculando en cascada. Persiste con `inputs.arvpro.arvSlider/arvManual` + `inputs.arv_manual`/`arv_fuente` (linaje "elegido por el usuario sobre el estimado del motor"). Chip "ARV oficial vigente" muestra manual + fuente.
  - **Guardrail**: si el valor supera el optimista o baja del conservador → aviso "fuera del rango de comps — justificá" (no bloquea). La oferta máxima del modo Simple ahora usa el ARV ELEGIDO (no el motor fijo).
- **Tests 13/13 (2 módulos cargados juntos)**: chosen motor↔ajustado · "Usar" → inp.arv=500,000 (la tasación) + manual + linaje → Resumen/Cash-Out/Venta/MAO todos en 500,000 · guardrail arriba/abajo · snap-al-motor. Venta golden 26/26 intacto · ci:gate 15/15 · node --check.

## 15-jul (noche 4) · 📣 COBROS — dashboard de cobranza (OK del CEO al checkpoint) (commit 3b16016; QA prod 14/14)
- ✅ **Dashboard /cobros** (app en Rentas, guard rentas/operacion): 4 métricas SEPARADAS (vencida neta 9,991 · por cobrar mes · a favor · total) + % cobranza del mes (cobrado/pactado billing_ym) + aging + filtros/búsqueda + CSV/PDF. **Checklist de encendido** visible: sin consentimiento SMS (26) / sin teléfono (2) / sin email (28) / sin link de pago (28) — lo que falta para live, editable ahí mismo.
- ✅ **Timeline por inquilino**: pagos mes a mes (pactado/pagado/deuda) + recordatorios con estado de ENTREGA del proveedor. **Config TCPA inline** (RLS rentas): consentimiento con fecha+origen al marcarlo, idioma, teléfono, día de pago, link QBO; STOP visible. **▶ Dry-run del motor desde la UI** (JWT admin, no escribe).
- ✅ El propio gate de cobertura cazó 3 números sin linaje (cards del checklist) → registrados → **211/211 en 31 pantallas**, ci:gate 15/15. QA: config editada y revertida en Jackelin, Xinquan current $0.
- ⏸ Envío real sigue bloqueado: modo sandbox + sin secrets + sin A2P + cron sin programar (por diseño).

## 15-jul (noche 3) · 📣 COBROS FASE 1 — motor de recordatorios (SANDBOX, checkpoint CEO antes de UI) (commit a7dc51f)
- ✅ **Bloqueante respetado**: construido SOBRE la definición corregida (v_cobros_estado → v_cartera_inquilino). Dry-run sobre los 38 casos reales: **Xinquan NETO $0 (current, 0 followups) · Jackelin $1,700 · Shamyra $637.50 (pago parcial reconocido)** · 12 vencidos reales / 21 mes en curso / 5 current · totales neteados 9,991 vencido / 36,034.35 mes en curso / 11,259.50 a favor.
- ✅ Schema (migr `20260715150000` aplicada): pm_tenants += TCPA (consentimiento_sms/opt_out/idioma/telefono_sms/dia_exacto_pago/payment_link) · cobros_config (modo **sandbox** default, followups 3/7/10, quiet 8-20) · cobros_recordatorios (todo envío con provider_response) · 4 plantillas ES/EN cordiales (TDCA) con {{link_pago}}.
- ✅ Edge fns deployadas: **cobros-motor** (dry_run default; due el día de pago; followups SOLO vencido neto>0; dedupe/mes; gates plantilla→destino→opt-out→TCPA→link→quiet; live=Twilio+Resend por secrets) · **cobros-twilio-webhook** (STOP→opt_out permanente + firma validada; delivery receipts → provider_status).
- ✅ Simulación día de pago: 56 candidatos, **TODOS frenados por las barandas** (26 skip_consent TCPA + 30 sin destino) — no sale nada ni en live hasta cargar consentimientos/teléfonos/links. Cron NO programado a propósito (no se enciende sin OK).
- ⚠ Gotcha del dry-run: is_currently_renting no viene poblado del sync → contrato activo se deriva de renta pactada del mes corriente (fix en la vista). Followups con día de pago 1 caen los días 4/8/11 (due+3/7/10).
- ⬜ Pendiente para encender: cargar consentimiento_sms (con fecha+origen del lease), teléfonos/emails, payment_link QBO por inquilino (o link_pago_default), A2P 10DLC aprobado, secrets TWILIO_*/RESEND_API_KEY en Supabase, modo→live, cron diario. Dashboard UI: tras el checkpoint del CEO. Fase 2 (late fee §92.019, notices §24.005) espera al abogado.

## 15-jul (noche 2) · 📋 Informe de Cartera — Rentas (commits 48a663f · 08db546 · bcf656d; QA prod 17/17)
- ✅ **Sync**: pm_payments += `renta_pactada` (fldpUSJ1HdZQmQPMH) + `deuda` (flduMsIV5gZRIv1eU) — causa del descuadre $32,261 vs $51,997.50: sin la renta pactada el OS no podía calcular deuda. Migr aditiva + pm-sync-airtable deployada + resync (205 con pactada / 45 con deuda).
- ✅ **UNA definición, TRES números** (RPC `cartera_informe(p_mes, p_desde)` invoker/RLS + v_cartera_*): DEUDA VENCIDA (meses cerrados = mora real) · POR COBRAR DEL MES (NO es mora) · SALDO A FAVOR (adelantos CON renta pactada; los negativos históricos sin contrato espejado NO cuentan, se declaran). ANTES el informe manual sumaba todo como "vencido" (+195%).
- ✅ **NETEO POR INQUILINO** (a favor cubre vencido primero, luego mes en curso): Xinquan 7,200 vs 3,600 → julio cubierto, **neto $0** · Jackelin → **debe 1,700, no 3,400** (verificados en QA con datos reales).
- ✅ **VALIDACIÓN AL CENTAVO vs el informe manual del CEO**: jun **9,860.00** · jul **42,137.50** · a favor **6,900.00** · total **51,997.50** — EXACTOS. Crítico ≥2k neteado **22,000** (CEO estimó ~21,300; el neteo Xinquan+Jackelin da exactamente −5,300 — la dif es qué inquilinos entran al corte crítico).
- ✅ **Vista /cartera** (app en Rentas): período con un clic (mes + ventana de vencidos), KPIs con ⓘ linaje, **aging 0-30/30-60/60+**, variación con ⚠ >100% ("¿real o carga de registros?" — julio da +352% justamente por la carga de registros nuevos con pactada), anexo por inquilino con detalle mes a mes, **⬇ CSV + 🖨 PDF** (reportOpen). 6 números en data_lineage + pantalla en el crawler (gate 199/199 en 30 pantallas).
- ✅ **Sabueso C22**: (a) moroso con saldo a favor que lo cubre → "neto $0, no es moroso" · (b) "Deuda Pendiente" de Airtable incluye el mes en curso → por cobrar, no mora · (c) variación >100% → mora real vs carga de registros (umbral `cartera_var_pct`). Los 3 disparan hoy con casos reales.
- 🐛 Fix cazado por el QA: `desde=null` ("todo el historial") se pisaba con el default mes-1.

## 15-jul (noche) · 🏷️ MODO VENTA (flip exit) — cascada de experto en el Underwriting
Pedido del CEO: la suite estaba armada para HOLD/refi; para una VENTA la matemática es otra. Construido el modo de experto fix&flip, encadenado con las otras calcs (mismo deal = mismos números).

**Item 0 — Toggle de estrategia + default desde Airtable** (ya venía de la sesión previa, confirmado): `[Vender (flip)] · [Rentar (hold)]` arriba; en Vender el nav OCULTA cashout/ingreso; default = Estrategia del deal (Fix and flip → Vender · Fix and hold → Rentar).

**Item 1 — "Usar ARV" → precio de venta** (encadenado): el ARV oficial (`inp.arv`, fix de propagación previo) fluye a la calc de Venta como **precio de venta esperado** (editable, con "↩ volver al ARV"). Verificado end-to-end: confirmar otro ARV mueve el precio y la utilidad.

**Item 2+3 — cascada de experto + métricas** (`ffUwCalcVenta`, reemplaza el modelo `netWire − capital`):
- ANTES: `utilidad = Net Wire − staging − capital` (mezclaba el payoff del préstamo con la economía del proyecto).
- DESPUÉS (modelo del CEO): `utilidad = precio − comisión% − cierre vendedor% − concesiones% − ALL-IN(compra+rehab) − INTERÉS HML total(solo interés × meses hasta vender) − holding(utilities+seguro+predial) − staging (− impuesto% opcional)`. El **payoff del HML NO entra en la utilidad** (es financiación del all-in); sí en el **Net Wire** (precio − costos venta − payoff = cash en la mesa, informativo).
- Métricas: **margen sobre venta %**, **ROI cash-on-cash** (utilidad ÷ capital), **★ ROI ANUALIZADO** (ROI × 12/meses — la velocidad manda), **check regla 70/75%** (all-in ≤ ARV×maxPct − costos), meses hasta vender, semáforo del deal.
- Reparto: **devolver capital a inversionistas → repartir la utilidad por % equity** (50/50 default, editable).
- **Golden 26/26 (código real): ejemplo del CEO $449,177 → comisión 26,951 · cierre 6,738 · all-in 330,000 · interés HML 14,850 · holding 5,000 → utilidad $65,638 · margen 14.6% · ROI 140% · anualizado 335%.** ✓

**Item 4/5 — Intereses en modo venta = SOLO HML**: se oculta todo el bloque DSCR/refi (préstamo del refi, cuota PITI, tope DSCR). Muestra solo el hard money: interés mensual × meses hasta vender = carry total que ⛓ alimenta la calc de Venta. El HML se cancela con el payoff en el cierre.

**UI**: vista Venta con hero (utilidad + margen), semáforo, cascada itemizada, Net Wire, métricas del flip, reparto. Unificada + one-pager adaptados (KPIs de venta, utilidad del flip, ROI anualizado, regla 70%, timeline compra→obra→venta→utilidad). Config `venta_cierre_pct`/`venta_concesiones_pct`/`venta_impuesto_pct` seedeados (migr `20260715131000`, editables). node --check + golden verdes.

## 15-jul (noche) · 💎 Inversor v2 — ajustes de Juan + mapa colapsable (commits 543ea3d · f16d252 · 3b88e9f; QA prod 19/19)
- ✅ **Mapa**: árbol con empresas COLAPSABLES (chevron, cerradas por default salvo la activa, persistido; la búsqueda expande).
- ✅ **Modelo & movimientos v2** — ANTES: línea P&L a mano, fecha completa, categorías sin guía, "# factura" texto que se perdía, movimientos sin edición, params en lista plana de 46 keys. DESPUÉS: **P&L derivado de la categoría** (ingreso/operativo/tax = SÍ · inversión/financiero = NO, tooltip "¿qué es P&L?") · fecha en vista **YYYY-MM** (completa guardada) · selector con **guía de flujos** (❓ panel: DRAW = financiero, utilities = operativo) + **sugerencia automática** por descripción · **factura_url** como link "📄 Ver factura" · movimientos **editables ✎ + soft-delete 🗑 con `inv_audit`** inmutable por trigger (insert/update/archive verificados) · **UNA FUENTE**: columna = ✍️ manuales (editables) + ⚙️ auto-importados del inv_ledger (FF/Rentas, badge auto·fuente, no se re-teclean); Ledger declarado vista de SOLO LECTURA de lo mismo.
- ✅ **Params en los 9 BLOQUES de Juan** (colapsables, badge auto·fuente vs manual): identificación / estrategia / compra (+total invertido calculado) / HML / refi / **inversionistas+equity con % del operador calculado** / operación / supuestos (manual) / **metas (manual, "＋ faltan" precarga el alta)**.
- ✅ **Distribuciones — bug Yeisson MUERTO**: el k1_url se guardaba pero la fila solo mostraba un emoji; ahora columna Links con **📎 pago ↗ y 📄 K-1 ↗ clickeables**, campos SEPARADOS `comprobante_url` (soporte) ≠ `k1_url` (fiscal), **edición ✎ auditada** + soft-delete; el portal del inversionista también muestra ambos links. Migr `20260715120000` aplicada.
- ✅ **Casas & reparto**: buscador (casa o inversionista) + orden A-Z casa / inversionista / mayor inversión.
- Vista del inversor ya separada por diseño (portal RLS solo-lectura); el modelo interno jamás sale.

## 15-jul (tarde) · 🕸 Linaje v3: overlays + lectura EN VIVO + ocupación única (commits d3f8d77 · c070f7e · 6c8a35d)
- ✅ **Crawler v3 con drivers de OVERLAYS** — abre y recorre headless: FF CC (6 secciones + Underwriting con hipotético y las 6 calcs vía `ffUwSub`), Rentas CC (7 secciones), Remodel CC (7 secciones + Reportes CEO r1/r2/r5), PM clásico (7 tabs), Estimador Pro (4 tabs) — extractores por DNA de cada overlay (`.card.kpi`, `.kit-kpi`, `.hero-num`, `.kpi>.l+.v`, Tailwind uppercase+bold). **GATE TOTAL: 192/192 números vistos en 29 pantallas · 0 sin cadena · verificado también EN PROD**. 95 descubiertos → TODOS curados con fuente exacta en la misma sesión (0 pendientes). Filas-registro (direcciones) excluidas por diseño: su linaje es el de sus columnas. UW hipotético sin inputs no muestra números ("sin dato ≠ $0" comprobado por el crawler). ci:gate 15/15.
- ✅ **LECTURA EN VIVO activada** — `OS.lineage` se carga en osLoad; `osLineageRow(empresa, sistema, dato)` = fuente efectiva; primer número cableado: **"Renta mensual actual" de la Ficha** (dual-source real). **EVIDENCIA en prod (qa-switch 4/4): $4,850 FF·Propiedades → reasignar en el mapa → $4,800 Rentas·Unidades ⚡mapa → revertir → $4,850**; los 3 cambios en data_lineage_audit (quién/cuándo/antes→después). Contable sigue gateada (reasignar → pend hasta reconciliar QBO).
- ✅ **Ocupación ÚNICA cerrada** — el "bug regla dueño en Global" era falso positivo (Global ya leía v_ocupacion: 90% = 43/48 redondeado); el divergente real era el **PM clásico** → `pmOccupancyAt` ahora prefiere v_ocupacion (regla dueño queda como fallback y para detalle por casa/cobranza). **Verificado en prod 4/4: Global 90% (43/48) = Empresa Rentas = Rentas CC = PM Resumen ("43 de 48")**. El calendario mide OTRA cosa (días cubiertos de la ventana — rotulado). ⚠ hallazgo nuevo del crawler: PM·Finanzas "Ocupación portafolio" 80% = media del PERÍODO financiero (tercera definición) — warn en el mapa, decidir rotular vs unificar.
- 📊 **Cobertura final: 216 números activos** — FF 73 (66 ok · 7 warn) · Rentas 63 (59 · 4) · Remodelación 50 (48 · 2) · Holding 16 (16) · Contable/QBO 14 (13 · 1) · **0 bug abiertos · 0 sin fuente**.

## 15-jul · 🔎 Linaje v2 "viene → número → alimenta" + GATE de cobertura (pedido CEO, commits d87ec2e · a27f94b · c9eb44b)
- ✅ **Flujo por número (réplica exacta de "conexiones-al-detalle")** — árbol Empresa → sistema → **NÚMEROS** con semáforo + buscador global; al elegir un número: **① De dónde viene** (nodos con flechas Base→Tabla→Columna→Vista→ƒ→[número resaltado], fórmula, nota ⚠, "🧬 la vista lee de…" desde information_schema) · **⬅ se alimenta también de** (grafo inverso) · **② Qué alimenta** (tarjetas con salto para seguir la cadena — feeds curados [31 cadenas seed] + AUTOMÁTICOS: mismo origen tabla·columna y vistas que consumen la tabla espejo vía diccionario Airtable→pg). Schema v2 (migr `20260715100000`): metric_key único, vista, feeds[], origen; vista alias `data_lineage` (nombre del prompt).
- ✅ **GATE DE COBERTURA — ningún número visible sin cadena** (`scripts/lineage-coverage.mjs`): crawler headless que recorre las pantallas del shell OS, junta cada número visible y lo cruza contra data_lineage; `--register` inventaría (origen=crawler, pend), `--gate` FALLA si hay números sin entrada → **quien agrega un número está obligado a registrar de dónde viene**. Corrida inaugural: 64 vistos → 40 descubiertos → **40/40 curados con fuente exacta** → **gate verde 63/63 EN PROD** (el 64º era la card del propio mapa, despseudonumerizada). `ci:gate` += 3 checks (e): corrida ≤7d + 0 sin registro + 0 sin curar → **15/15**. Cobertura visible en el home de /mapa y "N/N con fuente" por empresa en el árbol.
- 🔴 **Hallazgo del crawler**: "Ocupación Rentas" del Panel Global usa denominador REGLA DUEÑO (34 unidades → 90%) mientras la oficial v_ocupacion usa rentables (48 → 93.75%) — el caso "ocupación con distintos denominadores" de la lista del CEO, ahora marcado BUG en el mapa con la explicación.
- 📊 **Cobertura por empresa/sistema (121 números activos, 0 sin fuente)**: Fix & Flip 56 (Ficha 29 · CC 8 · UW 5 · Analítica 5 · Portal 4 · Inversionistas 3 · Empresa 2) · Rentas 20 · Remodelación 15 · Contable/QBO 14 · Holding 16 (Global 9 · Operación 7). Semáforo: 108 OK · 12 REVISAR (dual-source renta, draws vacíos, capital coalesced, etc.) · 1 BUG (ocupación).
- ⬜ Alcance declarado v2 del crawler: hoy recorre las 7 pantallas del shell OS; los overlays (FF CC secciones, PM clásico, Planner, Estimador, Reportes) están trazados por seed curado a nivel sistema — sumarlos al crawler es la v3 (requiere drivers por overlay). "Reasignar fuente ⇒ la app lee de la nueva fuente en runtime" sigue pendiente (hoy: documentado+auditado+gobernado con reconciliación QBO).

## 14-jul · Ficha conectada + 🗺️ Mapa de Conexiones (pedido CEO, commits 21e41a8 · 8420340 · 4b6df45)
- ✅ **Ficha: paneles Rentas/Remodelación conectados** — ANTES: 9909 Childress (rentada_y_refinanciada) mostraba "Todavía no está en Rentas" y "Sin obra en Remodelación" (osCasaMatch anclaba SOLO en Rentas por dirección; "Austin, Texas" de FF ≠ "Austin, TX" de Rentas → pid=null → los fallbacks por property_id jamás corrían). DESPUÉS: resolución en 2 pasadas (dirección en CUALQUIER fuente → property_id canónico → re-resolver todo) · panel Rentas = **renta $4,850 / gastos $3,260 (FF·Propiedades) / flujo $1,590 (v_ff_portafolio.flujo_mes, la MISMA definición del CC)** + detalle de unidades/cobranza del espejo Rentas · guardrail: etapa rentada sin datos → "faltan datos" ámbar, jamás vacío · sin obra pero casa terminada → "✔ Obra finalizada" con resumen FF. Childress verificado en prod (QA 22/22).
- ✅ **🗺️ Mapa de Conexiones `/mapa`** — data_lineage_map (84 números de las 4 empresas con base·tabla·columna·fórmula·semáforo, con field IDs; RLS por áreas; audit INMUTABLE por trigger con email real verificado) + árbol Empresa→Sistema→número + modo LISTA (buscador, estado editable, ✎ reasignar fuente, ＋ agregar, ✕ soft-delete) + modo DIAGRAMA (nodos y líneas SVG por color de base, clic aísla, panel detalle "Cambiar fuente" — réplica de los 3 artefactos de referencia del CEO) + export JSON/CSV + banda de la LLAVE (property_id↔Dirección). **Generación desde metadata**: RPC lineage_view_usage (information_schema.view_column_usage) → scripts/lineage-gen.mjs → os/os-lineage-views.js ("la vista lee de…" se regenera solo, 27 vistas). **Gobernanza**: reasignar fuente de cifra contable queda PENDIENTE hasta reconciliar QBO; todo cambio auditado. **ⓘ "de dónde sale"** junto a los números de la Ficha (osLinI/osLineageInfo reusables). Accesos: card en Global + link en cada empresa.
- ⬜ Pendiente declarado del mapa: (a) "crear KPI desde el mapa y que la app lo materialice" — hoy ＋ Agregar dato crea la fila gobernada (pend) pero NO genera la vista/tarjeta; (b) el motor de KPIs lee el mapa solo como ⓘ/documentación — el switch de fuente en runtime (que la app LEA de la nueva fuente al reasignar) queda para la fase 2 con el patrón osLineageSource(); (c) drag&drop de nodos (hoy el layout es fijo, el reordenamiento es por `orden`).

## FASE 0 — Fundaciones
- ✅ **0.1 · O2 property_id canónico** — `property_id` YA estaba poblado (FF 28/28, Remodel 26/26, Rentas 21/21; trabajo previo). Se creó `property_alias` (migr `20260713100000_o2_property_alias.sql`): 175 aliases activos = 28 FF + 28 recIds + 26 Remodel + 21 Rentas + 23 ClickUp folders + 29 maestra + **20 QBO** (las 19 cuentas del Balance mapeadas, 0 sin mapear). **Dudoso documentado:** QBO "Rental Property - Casas Marlin" agrupa 2 casas → alias FAN-OUT (2 filas: Bartlett + Capps; el unique incluye property_id a propósito). Bitter Creek 2425/2511 no está en los espejos activos (no hay deal activo con ese nombre) — si aparece, se agrega alias manual. **Aceptación OK:** query de prueba une ff_deals↔qb_report_cache por property_id (Idlewood $316,000, Nesting $286,012, Dove $270,000…). RLS: lectura por áreas, escritura solo service.
- ✅ **0.2 · O1 capa única de KPIs** — migr `20260713110000`: v_capital_deployed (equity $963,597.63 ✓ / QBO $728,361 stale→1.5, deuda HML OS $5.2M / QBO $4.5M separadas) · v_property_360 (Wellington equity +$200,000 ✓ exacto; líder resuelto vía airtable_record_names — parcial, faltan nombres en esa tabla) · v_obras+v_obras_kpi (26/7, utilidad $170,682 ✓, ingreso $1,466,360 ✓, margen ponderado 11.6% ✓) · v_ocupacion (48/45/3/0 = 93.75% ✓ EXACTO tras archivar 45 pm_units stale verificadas contra Airtable vivo) · v_pnl_casa (interés real Σpagos + prorrateado días×tasa con cap al vencimiento si refinanció; tasa_pct llega como fracción). security_invoker=on en todas.
- ✅ **0.3 · O3+O4** — ui/kit.js + tokens ya existían (trabajo previo); se agregó `ui/kit-decision.js`: GLOSARIO central 24 términos + kitTerm (tooltip hover) + kitDrill (overlay con fuente) + kitNext (🔍 Qué revisar, patrón EVM) + kitKpi (Tarjeta-KPI estándar con faltantes 🟡) + kitSkeleton (shimmer + prefers-reduced-motion). Unit tests OK.
- ✅ **0.4 · O8+P2** — lecturas YA eran Planner-first (os.js + CC verificado). v_divergencias_legacy (migr `20260713120000`): 3 obras avance legacy≠Planner + Bramble Unidades 3≠5 → check C19 en el Sabueso (el manual no pasa en silencio). ⚠ NOTA HUMANA: retirar el singleSelect "Porcentaje avance obra" y el campo "Unidades" desde la UI de Airtable (la API no borra campos).
- ✅ **0.5 · B17** — rec fantasma F&F recp4dED0aFJvDldk: NO entra al espejo (sync filtra sin dirección) · units vacías: 0 activas · Estimador: dupe real = Charles St ×2 → archivado el viejo (migr `20260713130000`), quedan 31 · guard-rails noZeroAsReal/reconcileLE/emptyState en kit-decision (tests OK).

## FASE 1 — Palancas de plata
- ✅ **1.1 · B1+B3** — "Rentabilidad draws/EBITDA FF" (Σnet_total −$320,230 ✓ reproducido) → "Déficit de capital en hold (a recuperar vía refi/venta)"; Ganancia real = Net Income P&L QBO YTD ($57,060.76 espejo al 6-jul; la auditoría vio $46,102.99 en QBO vivo — B10 re-sync pendiente en 1.5) con as_of; fantasma $1,067,530 NO reproducible en código ni espejo actual.
- ✅ **1.2 · #2** — v_capital_deployed en los 5 módulos (heros CC+Inversionistas = ffCapitalHero con DrillDown equity/deuda; Finanzas y Analítica reetiquetadas "All-in (COSTO)"; Global os.js). La deuda jamás se presenta como capital.
- ✅ **1.3 · N1+N3+N4** — KPIs al tope: interés/ingreso 68% + ICR 0.35× (rojo, TermTooltip+NextAction; auditoría decía 61.5%/0.29× con espejo más viejo) · waterfall único $170,682 → −interés YTD $141,907 → −overhead $133,226 → Net QBO $57,061 con residuo declarado · P&L por casa con interés HML en la línea (v_pnl_casa).
- ✅ **1.4 · N2** — panel "💎 Equity incorporado del holding" Σ(ARV−all-in) solo casas con obra real, barras + DrillDown por casa (ARV−compra−rehab).
- ✅ **1.5 · O5+B10** — re-sync ejecutado vía qb-oauth/sync (READ-only): Investor Contributions $728,361→**$763,361** ✓ y HML-Refin $1,220,700→**$1,459,200** ✓ (= QBO vivo de la auditoría), HML vivo $4,515,214 intacto, as_of 13-jul · reconciliador 3 columnas OS|QBO|Airtable en /contable con Δ y alerta >5% (umbral o5_delta_warn_pct).
- ✅ **1.6 · B2** — "sin conciliar" = solo C1–C3 (conciliación real, neteado por concepto); el resto es "$ señalado a revisar"; candado reconcileLE vs Total Assets del holding → "⛔ motor en error" si se viola.
- ✅ **1.7 · B5+B6+B8** — B5: ficha muestra Equity incorporado SIEMPRE (v_property_360: Wellington +$200,000; déficit en hold pasa a secundario "a recuperar, no es pérdida"; all-in desglosado compra+rehab; líder resuelto) · B6: verificado YA cubierto por trabajo previo (badge "en curso · proyectado", utilidad proyectada = valor_cliente − gasto = fórmula de la auditoría, Denfield +$63K; avance Planner-first de 0.4) · B8: sync-remodel-workers mapea el LINK Personal en Campo + lookup tarifa + link propiedad (deployado + corrido: 3,433/3,436 filas con recId), v_remodel_nomina_ledger v2 joinea por recId (texto libre solo fallback legacy) — **0 sin tarifa (antes 177) · 0 deudas negativas (antes 172)** · sobrepago $133,902 visible aparte · deuda neta $39,026. NOTA: si falta tarifa de alguien nuevo se carga EN AIRTABLE (Personal en Campo), no acá.

## FASE 2 — Consistencia
- ✅ **2.1 · B4+B13+B14** — v_ocupacion (48/45/3/0=93.75%) en Global + Rentas CC (todas sus secciones vía kpi override); libres=disponibles sin mantenimiento; snapshot 30/34 muerto. B14: el calendario clásico no muestra % (no reproducible — anotado). pm-main clásico conserva la regla del dueño internamente (alimenta cobranza), el headline del OS es la vista.
- ✅ **2.2 · B7+B9** — avance prom solo Planner (mata el 91%); rentabilidad = margen ponderado Σutilidad/Σvalor_interno = **11.6% ✓** (excl. denominador ≤0, mata 0.2% y Stonleigh 322%); obras ya venían del espejo (26).
- ✅ **2.3 · O6** — ui/report-engine.js (reportOpen genérico: marca, KPI cards, tablas badges, filas, conclusión, print CSS, sin-dato≠$0) + reportCasa() de las vistas O1, botón 📄 en la ficha.
- ✅ **2.4 · P7** — kitNext en Global (cobranza→Carlos, appraisal>ARV→Juan) + Ficha (déficit→refi/venta); Rentas CC ya traía action, Sabueso tiene proponer/contadora, FF Finanzas desde 1.3.
- ✅ **2.5 · O9+B11+B15** — colapso semántico 2,927→grupos priorizados (sla/críticas/volumen) en /operacion con filtro 1-clic · C20 interés negativo (Refin −$15,747.56 ✓ detectado; reclasificación = contadora, QBO read-only) · "Cobranza operativa" + A/R QBO al lado.

## FASE 3 — Datos / proceso / inteligencia
- ✅ **3.1 · O7** — v_supuestos_calibrados: obra $53/sqft REAL (19 finalizadas) vs $28 soñado · duración 1.8m vs 12m · holding financiero 4.6m. Visible en Del Negocio con aplicar-a-1-clic (psf_media / default_meses_hold → ff_uw_config). Mata el déficit fantasma del timeline.
- 🟡 **3.2 · N7 PARCIAL** — infraestructura lista: tabla clickup_scheduler_plantilla (dueño por rol + offset por lista) + v_tareas_huerfanas (alimenta el flujo propuesta→aprobación→clickup-execute existente). ⛔ NOTA (regla 7b): la PLANTILLA es config de negocio (qué dueño para qué lista) que debe llenar el CEO/operación — al llenarla, el flujo de propuestas la aplica en lote; el nacer-con-fecha requiere además un webhook de ClickUp (siguiente iteración).
- ✅ **3.3 · N5+N6+N9** — v_rent_roll (potencial vs realizada, gap $: Bethune $4,400/mes, Echo $3,600…; Garden Path ya no es el top — data fresca) + tabla en Analítica CC · ingreso por MODELO × mes de renta · ranking real por casa = P&L post-interés (FF) + NOI rank (CC).
- ✅ **3.4 · B16+O12+O13 (N8 especificado)** — insert de artefactos exige created_by=auth.uid() + área ⊆ allowed_areas del creador (ia_area_ok) · delete bloqueado · versionado (version+parent_id) · ia_audit_log INMUTABLE (solo insert) con trigger. 🟡 N8 (carril datos-lectura con conectores read-only whitelisted + artefactos con Design System): especificado como siguiente iteración — requiere diseño de producto del carril (gate de admin ya existe).
- ✅ **3.5 · N10+N11+N12** — C21 casa fantasma (encontró **Arcadia y Cervin** ✓, los casos exactos) · C14 top-20 con % del riesgo (comprobante requerido en form = config Airtable, acción humana) · v_disciplina_clickup + card en /operacion (higiene 50/al día 30/movimiento 20; peor: sin-dueño 911 tareas score 0).

## Cierre
- ✅ **Cierre · Gate de CI** — scripts/ci-gate.mjs (npm run ci:gate): (a) capa KPIs responde y es coherente (ocupación suma, margen 0–100), (b) property_id 100% + 20 aliases QBO, (c) guard-rails anti-$0 presentes, (d) espejo QBO fresco ≤30d + assets $7.67M + equity ≤ assets. **CORRIDO: 12/12 ✓**. ⚠ el re-sync QBO cambió "Total Assets"→"TOTAL ASSETS" (guard B2 y gate actualizados case-insensitive).

## MERGE A MAIN + DEPLOY (13-jul)
- Mergeado a main (bundle 35507bd74851) y verificado EN PROD con smoke headless: Global (capital/ocupación/cobranza operativa) + /contable (reconciliador, B2, C20, C21, espejo Refin $1,459,200) + FF Finanzas (ICR, déficit en hold, waterfall, equity panel, P&L por casa) — **17/17 · 0 pageerrors**.
- Fix post-deploy: v_pnl_casa reescrita con CTEs (migr 20260713200000) — la versión con 6 subqueries correlacionadas se iba a timeout bajo RLS con select * (el front recibía []).
- Gotcha de QA documentado: innerHTML serializa & → &amp; ("P&L" no matchea en el DOM; buscar por innerText).



## SCOPE B · OBSERVACIONES DEL CEO (13-jul, cerradas — commits por ítem en rebuild/os-audit-2026-07)
| Obs | ANTES | DESPUÉS (verificado contra fuente) |
|---|---|---|
| #8-#11 UW | Base = compra + rehab (Bethune legacy) · interés 6m fijo · tasa DSCR 7.5 en Calc 4 vs 7.125 en Calc 3 · payoff se re-pedía | **Base = compra + DRAW TOTAL** ($200,000+$135,080=$335,080 · 90% = **$301,572 exacto**, corrido contra el código real; modo legacy en ff_uw_config uw_base_modo) · interés del draw sobre **duración REAL calibrada (1.8m** de v_supuestos_calibrados, editable) · **una sola tasa HML (12%) y DSCR (7.125%/30a) para las 5 calcs**, visibles y editables inline con rótulos "HML · solo interés · durante obra" / "DSCR · 30a · amortizado" · payoff ⛓ fluye del deal (saldo HML Airtable, con chip de fuente) · goldens cash-out Michelle/Echo/Childress/Meadow intactos |
| #16 Portal inversor | portal sin resumen por casa; sin fecha de pago del déficit | **v_portal_inversor** (security_invoker sobre RPC inv_portal_resumen SECURITY DEFINER + inv_my_props) — por casa: invertido + hace cuánto · etapa/avance Planner · líder · flujo del último mes (billing_ym) · déficit desglosado (renta−gastos−interés HML, v_pnl_casa) + fecha estimada de pago (refi hecha ∣ inicio HML + holding calibrado) · próxima/última distribución (inv_distributions **ya existía** — 3 filas, verificado). **RLS probado en prod: inversionista QA = solo Dove ($25,400·13m·déficit $10,358.13 exacto) · viewer = 0 filas · anon = 401** |
| #20 Planner | tablero apretado bajo KPIs, tarjetas 8.5-11px | board **full-viewport**, KPIs/filtros **colapsables** (wp_kpis_open), columnas 220px con scroll propio, tarjetas 13.5px con líder visible; ruta crítica/alertas siempre visibles; cero lógica tocada |
| #19 Estimador | 17 tabs planos + 2 ocultos | nav **3 pasos Proyecto→Estimar→SOW** (19 tabs mapeados; Editor/Pronóstico/3-Estimaciones contiguos; Crew NO estaba vacío → sub-tab del grupo 3) + **proyecto activo compartido** (RM_ACTIVE + localStorage, restaurado al abrir) |
| #12+#14 CRM/rol | CRM sin onboarding; líderes solo productividad | guía colapsable "🧭 ¿qué hago acá?" (4 pasos, flujo CRM→propuesta→deal→portal) + **scorecard por líder**: cumple presupuesto/tiempo (rcFin/retraso_dias, sin dato = '—'), margen ponderado, 🔍 Qué revisar (peor obra + acción + dueño, patrón kitNext) |
| #24 IA N8 | spec en papel; ia_audit_log 0 filas | **carril datos-lectura FUNCIONAL**: ia_data_whitelist (6 vistas KPI) · edge fn ia-data (JWT del usuario → su RLS; solo select ≤500) · gate de admin EN DB (aprobado_por via RPC ia_aprobar_artifact) · front inyecta __IA_DATA__ al sandbox (el iframe jamás ve un token) · audit cableado: publicado/actualizado/aprobado/spec_*/datos_leidos. **E2E prod 9/9**: 403 sin OK → viewer no aprueba → admin aprueba → lee v_ocupacion 48/45 → fuera de whitelist 403 → RLS del usuario (viewer sin fix-flip ve nulls) |

Gate de CI post-Scope B: **12/12 ✓**. Gotcha nuevo: ia_artifacts tenía CHECK carril in (libre,ok) → extendido a 'datos'; RPC nueva = 404 hasta "notify pgrst, 'reload schema'".

### Deploy Scope B (13-jul)
- Mergeado a main (fast-forward, bundle 4227018da6a8) y verificado EN PROD con smoke headless: **15/15 · 0 pageerrors** (UW draw total+hold 1.8m+rótulos HML/DSCR+tasas inline · CRM guía · Estimador 3 pasos · Planner toggle KPIs · RC scorecard líderes · IA galería · portal 200) + **portal inversor con login QA real: 8/8** (Tus casas de un vistazo, Dove $25,400 · 13 meses · flujo últ. mes · déficit desglosado con interés HML · distribuciones · líder).


## FIX RLS ff_uw_config (14-jul, error del CEO "new row violates row-level security")
- Causa raíz: `ff_uw_config` SOLO tenía policies de SELECT — **ninguna escritura de la UI funcionó nunca** (aplicar $/sqft calibrado, hold, bias, tasas por zip, % de tax, recalibración ARV: todos los botones apCfgSet tiraban RLS). Migr `20260714140000`: insert/update para has_area(fix-flip), delete sigue bloqueado. Verificado: update 200 · insert key nueva 201 · viewer sin área 403.
- **Barrido completo del underwriting (smoke prod 9/9 · 0 pageerrors · 0 alerts de error)**: 6 tabs con hipotética vacía + con datos + casa real (Michelle) · ARV simple⇄experto · apCfgSet key existente y NUEVA · Calc 5 modelos · guardar. Escrituras del UW auditadas: ff_uw_config (fix), arv_calibracion ✓, ff_underwriting_analyses ✓ — todas con policy correcta.

## CALC 4 · PITI de la refi (14-jul): el pago mensual es el TOTAL PAYMENT — P&I + property tax mensual (2.1%/año del valor tasado, calibrado con los HUDs de Champions) + insurance/impound mensual (prima/12), desglosado con tax% y prima editables inline + Δ vs PITI real de Airtable. Verificado Michelle: 2,163 + 749 + 158.33 = **$3,070.33** vs real $3,032.26 (la misma calibración de los goldens). Smoke prod 6/6.

## CALC 1 · insurance + holding real + contingencia fija + FIX guardado (14-jul, pedido del CEO)
- **Estimador rápido: SUGERIDO (media)** entre el costo interno ($/sqft calibrado) y el de afuera ($110/sqft) + botón "→ usar" que lo pasa a costo real (1400 sqft media: 88,200 / 154,000 → sugerido **$121,100** ✓ prod). **Intereses SIEMPRE ajustables**: tasa HML editable también en Ajustes de Calc 1 (misma key que Calc 4) + monto MANUAL de intereses del draw (pisa el punto fijo, rotulado "MANUAL" con ↩ volver al calculado; draw/préstamo/payoff se recalculan con el manual). Smoke prod 6/6.
- **Insurance de la casa**: input mensual en Ajustes → insurance × meses de holding entra al draw (y por el punto fijo, al préstamo/interés/payoff). Config default `uw_insurance_mes`.
- **Meses HASTA RENTAR O VENDER** (antes "rentando hasta el refi"): obra + hasta rentar/vender = HOLDING, y el interés/utilities/insurance corren sobre ESA suma (el CEO: "esa suma es lo real que voy a pagar de intereses y tener de los draws") — ejemplo 3+2: interés = préstamo × 1% × 5 = $15,876 (antes solo obra ×3). Calc 4 muestra "Interés total del holding (5 m = obra 3 + hasta rentar/vender 2)" con ambos meses editables.
- **Contingencia FIJA** opcional (pisa el %): input en Ajustes; desglose rotula "Contingencia (FIJA)".
- **BUG del guardado (2 patas, cazado con instrumentación en prod)**: (1) el re-render inmediato del onchange DESTRUÍA el botón 💾 entre mousedown y mouseup → el click se perdía en silencio → render diferido 150ms + trigger delegado por pointerup; (2) el valor tipeado con el foco aún en el input no llegaba a commitear → flush en pointerdown del 💾 (inputs con value ≠ defaultValue → dispatch change ANTES del blur). **Verificado en prod 8/8**: tipear compra/insurance/contingencia y clickear 💾 sin blur → los 3 valores en UW.a.inputs Y en la base.

## % DEL HML SEPARADO: compra vs remodelación (14-jul, pedido del CEO)
- ANTES: un solo "% que financia" aplicado a toda la base → no modelaba la realidad (Harmony presta 90% de la compra y 100% de la remo). DESPUÉS: dos inputs en Calc 1 (`hml_pct_compra` 90 / `hml_pct_remo` 100 default) → **préstamo bruto = %compra×compra + %remo×draw** (punto fijo intacto).
- PROPAGACIÓN por la cadena (verificado en prod 6/6): interés del draw, payoff → Calc 3, base → Calc 4, Unificada — ejemplo 200k/100k/3m/2m: préstamo $309,168 · **down = solo 10% de la compra ($20,000)** · payoff/base4 = mismo número; editar % en vivo recalcula todo (100% compra → down $0, caso Bethune).
- Retro-compatibilidad AL CENTAVO: análisis guardados sin los campos nuevos usan hml_finance_pct legacy en ambos (guard en ffUwAbrir, mismo resultado que antes: $295,856.10 exacto). Goldens cash-out intactos.

## FICHA DE CASA · "Compra $0" con dato existente (14-jul)
| Qué | ANTES | DESPUÉS |
|---|---|---|
| Fila "Compra" del panel Fix & Flip | leía `m.ff.purchase` — campo INEXISTENTE (la columna es `purchase_price`) → $0/— en TODAS las fichas, no solo Charles | lee la cadena única `osFichaNums`: v_property_360.compra → deal.purchase_price — **Charles $247,000** ✔ |
| Tarjeta ALL-IN vs fila espejo | dos caminos distintos (p360.all_in vs compute local con rehab×1.3) — mismo dato, distinta info | **UNA cadena para tarjeta Y fila**: all-in = compra + Total Draws → compra + rehab REAL (rotulado "faltan draws") → compra + rehab ESTIMADA (rotulado) — Charles **$357,000** = 247,000 + rehab real 110,000 ✔ (el "Costo Remodelación Real" fld9VNYFBzFI3tRdc estaba mapeado en el sync y NUNCA guardado — 2º campo fantasma encontrado; ahora espejado en ff_deals.remodel_real) |
| Equity incorporado | p360.equity (rehab null → Charles daba $248,000 con rehab en 0 silencioso) | ARV − all-in de la MISMA cadena — Charles **$138,000** (495,000 − 357,000) ✔ · caveat "⚠ con datos incompletos" cuando faltan draws. **Deploy verificado EN PROD 7/7 · 0 pageerrors** (Charles 247,000/357,000×2/138,000 + barrido Capitol compra 200,000 · all-in compra+draws 263,750). Gotcha: el slug de la ficha es la DIRECCIÓN COMPLETA (3403-charles-street-austin-tx-78702) |
| Resto del panel (Remodelación/Holding/All-in/MAO) | mezcla de fuentes (est×1.3 proxy sin rotular; holding $0 sin draws) | Remodelación = draws → rehab real → estimada (SIEMPRE rotulado cuál es) · Holding "—" si no hay draws · MAO sobre la misma base · Appraisal/Cash-out/HML "—" solo cuando el dato NO existe (Charles ✔) |

## CC FIX & FLIP REDISEÑADO (14-jul — patrimonio real + déficit correcto)
| Qué | ANTES | DESPUÉS (verificado contra Airtable vivo) |
|---|---|---|
| Bloque superior | "Capital del Holding" (no le decía nada al CEO) + all-in como capital | **VALOR DEL PORTAFOLIO $9,415,000 (23 casas)** — cuadre exacto: $11,450,000 (28) − $1,300,000 operador (Arthur/Bitter/Charles) − $735,000 vendidas (Arcadia/Slaughter) · **EQUITY $4,435,350** (valor − deuda) · **DEUDA $4,979,650** (refi>0→refi, si no HML; drill por casa + reconcile QBO $5,974,414 con Δ visible) · **RENDIMIENTO: operativo +$179,289/año · después de deuda −$363,406/año** (los dos, honesto: el carry HML se come el flujo — pago = hml_payment + ref30_payment, EXACTO al número del CEO) + yield del equity |
| Conteos | deals activos/flip/hold | **23 hechas · 5 entregadas al inversionista · 23 en portafolio (19 renta · 2 rehab · 2 adquiridas)** — todos exactos |
| Regla del portafolio | no existía | modelo_negocio ≠ Operador Y stage ≠ vendida, en la capa de vistas (v_ff_portafolio/_kpi, security_invoker, property_id) — espejo extendido: modelo_negocio (flddjD6WsvC98sM1k) + estrategia completa (fldyijwnFRD2yFrx5) + draws_menos_deficit (fldL4iMolqEibENFj), sync v13 corrido 28/28 |
| Déficit por casa | dr.net_total (campo equivocado) → Wellington −$130k FALSO, Charles −$110k FALSO | **[Total Draws − Déficit Total] − Down Payment** (la fórmula del CEO): Capitol = −30,463.76 − 7,500 = **−$37,963.76 exacto** · GUARDRAIL: draws=0 con obra → "⚠ faltan draws" (Wellington/Charles/Slaughter/Harvest + 3 más = 7 casas), EXCLUIDAS del acumulado (**−$289,188** corregido) |
| Pipeline + Propiedades | "HOLD" recortado · all-in compra+rehab+holding · vendidas mezcladas | estrategia PALABRA COMPLETA ("Fix and hold") · **all-in = compra + Total Draws** (fallback compra+rehab ROTULADO *rehab) · badges Operador/Vendida atenuadas (siguen visibles, NO cuentan en totales) |

**Deploy verificado EN PROD** (smoke 13/13 · 0 pageerrors): los 4 KPIs con los números exactos del CEO + conteos + déficit corregido −$289,188 + estrategia completa + ⚠ faltan draws + badges Operador/Vendida. Gotcha QA: /fix-and-flip es la página de EMPRESA (cards) — el CC se abre por ruta de app (/fix-and-flip/underwriting) + ffGo(seccion).

## CALCS ENCADENADAS (14-jul, rama feat/calcs-encadenadas — "cuánto presta el HML → payoff → refi")
| Qué | ANTES | DESPUÉS (verificado corriendo el código real: compra $200,000 · remod $100,000 · obra 3 m · renta 2 m) |
|---|---|---|
| Base del HML | **3 bases para el MISMO deal**: Calc 1 $291,780 (compra+draw ×90%) · Calc 4 $280,000 (compra×90%+remod) · mismo dato, distinta info | **UNA base**: préstamo bruto = %fin × (compra + DRAW TOTAL), resuelta por PUNTO FIJO (el interés del draw corre sobre el préstamo y converge en 2-3 vueltas) → **$295,856 idéntico en Calc 1 y Calc 4** |
| Del Negocio | terminaba en "el inversionista pone" | + **EL HARD MONEY TE PRESTA**: bruto $295,856 − puntos 1.5% ($4,438) − fees lender ($2,990) = **desembolso neto $288,428** · + **PAYOFF DEL HML**: principal + capitalizados (editable) = **$295,856** — dos números DISTINTOS, visibles |
| Payoff → Cash-Out | input manual = 0 → cash-out $293,216 que no significaba NADA | se auto-llena ⛓ desde Del Negocio (fuente visible; override manual con "↩ volver al calculado") → **cash-out = 311,830 − 295,856 − 18,614 = −$2,640** (honesto: este deal no recupera por refi) |
| Obra vs renta | UN solo "meses de hold" (5m) — el interés del HML corría los 5 meses = carry INFLADO | **meses_obra (3) + meses_renta (2) = hold (5, derivado)**; interés HML = base × tasa × **meses_OBRA** ($8,876 = 295,856×1%×3, no ×5 = $14,793 inflado −40%); utilities sí corren el hold; deals reales: obra = meses cubiertos, renta = hueco (ff_draws) |
| Intereses | base propia + solo el mensual | préstamo bruto ⛓ (misma base) · interés mensual $2,959 · **interés TOTAL de la obra $8,876 (el carry real)** · refi $311,830 @ 7.125%/30a → **P&I $2,101** · tasas + meses de obra editables inline → se reflejan en TODAS las calcs |
| Legacy | — | análisis guardados con meses_hold viejo NO cambian (obra=hold, renta=0); goldens cash-out Michelle/Echo/Childress/Meadow EXACTOS |

## ARV CERTERO (13-jul, rama feat/arv-certero — directiva: error MEDIBLE contra tasaciones reales)
Disparador: Cervin dio \$415,773 con 3 camas (RentCast/condado) cuando tiene 4 — Zillow \$471,900, assessed \$486,691.

| Qué | ANTES | DESPUÉS (medido) |
|---|---|---|
| **Back-test motor vs tasaciones reales** | el motor NUNCA se había corrido contra la historia (la 'calibración' comparaba ARV Airtable vs appraisal, no el motor); corrido: **MdAPE 9.0% · sesgo −7.6%** | **MdAPE 4.9% · sesgo −1.6%** sobre las 12 casas con 'Valuación por el Appraisal' (excl. las 4 del CEO) — **META ≤6%/±2% ✅**, con Dove (−20%) y Childress (−12.9%) ADENTRO como outliers honestos (tasaciones DSCR income-infladas que ni el AVM alcanza: −18/−22%) |
| Subject | 1 fuente (RentCast) usada en silencio — Dove/Childress figuran con 1 CAMA en el condado y el filtro mataba 14/20 comps | saneo automático (dato implausible = DUDOSO, null) + conflictos multi-fuente (RentCast vs Airtable vs manual) + **gate PROVISIONAL**: el ARV se muestra atenuado con chips '⚠ camas: 3 (RentCast) — ✓ usar 3 / ✓ usar 4 / otro' hasta que el humano confirma |
| Selección de comps | 0.8mi/12m/±25% · si nada pasaba → 0 comps y silencio | filtros de tasador **1mi/6m/±15%/±1cama/mismo tipo** + outliers MAD fuera (declarados) + **expansión adaptativa** (6→9→12m) con confianza capada y aviso |
| ARV | promedio ponderado 1/(gross+2) | **mediana ponderada** (similitud × recencia × cercanía) — jamás promedio crudo |
| Confianza | adjetivo por reglas | **medida**: score 0-100 (CV/n/recencia/distancia/gross) + rango **P25–P75 real** de los comps ajustados |
| Triangulación | no existía | panel Comps · AVM RentCast · **assessed × 1.235 (factor calibrado, n=12)** · tasación previa · ARV Airtable — divergencia >8% = ⚠ con la razón probable (ej. 'camas en conflicto') |
| Calibración | bias global manual sugerido | \`calibrar()\` por coordenadas (GLA \$/sqft, cuarto, baño, año, tendencia, MAD-k) + **sesgo por SUBMERCADO** (78745 +4.4% n=3 · 78664 +12% n=2 · Marlin −1.6% n=2) + bias global con restricción de sesgo. Corrida persistida en \`arv_calibracion\` + \`v_arv_calibracion\` → la UI muestra '🎯 precisión ±4.9% sobre 12 casas' + botón ♻ recalibrar (auto-nudge al cerrar casa nueva) |
| **Cervin (disparador)** | \$415,773 (3 camas, comps flojos) | con 4 camas confirmadas: **\$457,541 (P25–P75 457–487k)** — dentro de la evidencia ~460–480k SIN forzar; con 3 camas ya da 449k por la mejor reconciliación; el gate marca 'camas: una sola fuente — confirmá' |

Un solo motor (\`pm/ff-arv-engine.js\` UMD) para Simple, Experto y back-test (\`scripts/arv-backtest.mjs\`). Params calibrados: GLA \$70/sqft · cuarto \$8k · baño \$12.5k · año 0.35%/a · lote \$3/sqft · MAD-k 3 · bias +3% + submercados. Cuota RentCast: 30/50 usadas (cache 30d). ⚠ Caveats declarados: n=12 (riesgo de sobreajuste, mitigado con MdAPE robusto + submercados solo n≥2); comps actuales vs tasaciones pasadas (sin fecha de appraisal espejada); assessed factor calibrado sobre refis DSCR.

## RE-AUDITORÍA 28 DIMENSIONES (13-jul, medida contra data viva)
| # | Dimensión | ANTES (auditoría) | DESPUÉS (medido hoy) | ✓ |
|---|---|---|---|---|
| 1 | Capital desplegado | $7.83M/$8.37M (deuda como capital) | equity $963,597.63 + deuda $4,515,214 separadas | ✅ |
| 2 | Equity en libros | espejo stale $728,361 | $763,361 = QBO vivo | ✅ |
| 3 | Ganancia | "EBITDA −$453,456" falso | Net Income QBO YTD $46,102.99 (exacto al vivo) | ✅ |
| 4 | Net Income fantasma | $1,067,530 inexistente | eliminado; no reproducible | ✅ |
| 5 | Déficit mal rotulado | "Rentabilidad draws −$320,230" | "Déficit de capital en hold (a recuperar)" | ✅ |
| 6 | Motor conciliación | $8.3M sin conciliar > assets | C1–C3 neteado + guard ≤ $7,669,529 (motor en error si viola) | ✅ |
| 7 | Espejo HML-Refin | Δ −$238,500 | $1,459,200 = QBO vivo · as_of 13-jul | ✅ |
| 8 | Ocupación | 4 valores distintos, 30/34 congelado | 48/45/3/0 = 93.75% única (= PDF equipo) | ✅ |
| 9 | Estados canónicos | libres incluía mantenimiento | disponibles=0 sin mantenimiento | ✅ |
| 10 | Conteo de obras | 31 (Estimador+dupes) · avance 91% legacy | 26/7 · avance solo Planner | ✅ |
| 11 | Utilidad realizada | inconsistente | $170,682 exacto en capa KPIs | ✅ |
| 12 | Rentabilidad | "0.2%" y Stonleigh 322% | 11.6% ponderado (excl. denominador ≤0) | ✅ |
| 13 | Ficha (Wellington) | "déficit −$130k" | equity +$200,000 (déficit hold secundario) | ✅ |
| 14 | Reporte de obra | "$0 🔴 PÉRDIDA" en curso | proyectada = valor−gasto + badge en curso | ✅ |
| 15 | Identidad nómina | re-match texto libre | por LINK: 3,433/3,436 filas · 149/149 grupos | ✅ |
| 16 | Tarifas nómina | 177 sin rate | 0 (lookup del link) | ✅ |
| 17 | Deudas nómina | 172 negativas | 0 · sobrepago $133,902 visible aparte | ✅ |
| 18 | Interés HML | invisible en P&L | $141,907 YTD = 66% ingreso · ICR 0.28× al tope + por casa | ✅ |
| 19 | Puente de ganancias | 3 números, 30× gap | waterfall único con residuo declarado | ✅ |
| 20 | Equity incorporado | tapado por cifras infladas | panel $2,852,652 (casas con obra) + ranking/drill | ✅ |
| 21 | Llave property_id | strings sucios entre 4 fuentes | 175 aliases · QBO 20/20 · joins por id | ✅ |
| 22 | Ghosts | rec vacío + 6 units + dupes | 0 · 0 · 0 | ✅ |
| 23 | Legacy en silencio | manual ≠ rollup sin alertar | 4 divergencias ALERTADAS (C19) | ✅ |
| 24 | $0 sobre vacío | ✅ sobre vacío en varias pantallas | guard-rails (kitMoney null='—', noZeroAsReal) + gate (c) | ✅ |
| 25 | Dato→decisión | EVM aislado en 1/50 pantallas | glosario 24 términos + Term/Drill/NextAction replicado | ✅ |
| 26 | Ruido de anomalías | 2,927 crudas sin priorizar | grupos por $ + **plantilla N7 LLENADA (13-jul)**: 30 reglas data-driven (dueño = asignado real más frecuente por lista) → 1,404/1,411 huérfanas (99.5%) con dueño+vencimiento sugeridos, card en /operacion; se aplican vía propuesta→OK humano→ClickUp | ✅ |
| 27 | Supuestos | $28/sqft · 12m soñados | $53/sqft real (19 obras) · obra 1.8m · holding 4.6m, aplicables 1-clic | ✅ |
| 28 | Gobernanza IA | viewer publicó cross-área, sin audit | área⊆allowed_areas + created_by + versionado + audit inmutable + **N8 carril datos FUNCIONAL** (whitelist 6 vistas · gate admin en DB · RLS del usuario · audit vivo) | ✅ |

**Score ronda 1: 26 ✅ · 2 🟡.** (rondas 2-3 abajo) Verificación adicional: smoke prod 17/17 · gate CI 12/12 · rent-roll vivo (Bethune gap $4,400/mes) · fantasmas Arcadia/Cervin detectadas solas.


### RE-AUDITORÍA ronda 2 (13-jul, post-Scope B — medida contra data viva)
**Score: 27 ✅ · 1 🟡** (solo queda #26: las ~2,934 anomalías crudas esperan la plantilla N7 — acción humana).
- Núcleo INTACTO tras Scope B (ningún KPI se movió): equity $963,597.63 · deuda $4,515,214 · Net Income YTD $46,102.99 · assets $7,669,529 · Refin $1,459,200 as_of 13-jul · ocupación 48/45/3/0 = 93.75% · obras 26/7 · utilidad $170,682 · margen 11.6% · Wellington +$200,000 · nómina 0 sin rate / 0 deudas neg · interés YTD $141,907 (66% del ingreso) · equity incorporado $2,852,652 · 175 aliases (QBO 20) · ghosts 0/0/0 · divergencias 4 · fantasmas Arcadia/Cervin · supuestos $53/sqft·1.8m·4.6m.
- **#28 → ✅**: ia_audit_log pasó de 0 a 6 eventos reales (publicado/actualizado/aprobado/datos_leidos×2), whitelist 6 vistas activa, check de carril incluye 'datos', gate de admin probado E2E en prod.
- Capacidades nuevas medidas: v_portal_inversor + RPC en prod (RLS: inversionista=1 casa, viewer=0, anon=401) · uw_base_modo='draw' en config · gate CI 12/12.
- Dato honesto: inv_distributions tiene 3 filas pero 0 activas (demo soft-deleted) — el portal muestra 'sin distribuciones programadas', correcto; se llena cuando se registre la primera real.


### Cierre #26 · plantilla N7 llenada (13-jul — Score final: 28 ✅ · 0 🟡)
- clickup_scheduler_plantilla: **30 reglas** — dueño por lista = ASIGNADO REAL más frecuente en ClickUp (Juan Manuel Sanchez fix-flip/HML/venta · Michell Yanes etapas/documentación · Carlos Vasquez rentas/cobros/check-in · Daniel Lara contratos · CEO plan del OS) + días por criticidad (cobranza/check-in/refi/cierre 3-5d · resto 7d · plan interno 14d). Editable en DB (RLS operacion).
- **Cobertura: 1,404/1,411 huérfanas (99.5%)** con dueño+vencimiento sugeridos; único resto honesto: 'List' (7 tareas, lista sin nombre real — corregir en ClickUp). Fix de bug latente: patrones solapados ('Entrega' ⊂ 'Pre-Entrega') duplicaban filas → v_tareas_huerfanas ahora elige el patrón MÁS LARGO (lateral, fan-out verificado = 0).
- v_huerfanas_resumen + card en /operacion (junto al índice de disciplina): total, % cubierto, top listas con dueño → días, y lo sin-cubrir declarado. Verificada EN PROD (bundle ea35344cb178): '1,411 huérfanas · dueños sugeridos visibles · List sin plantilla'.
- Aplicación = flujo existente propuesta → OK humano → clickup-execute (nada se asigna solo); el nacer-con-fecha vía webhook sigue como mejora futura, pero la CURA DE ORIGEN (quién y cuándo por default) quedó definida y operativa.

## ANTES → DESPUÉS (verificado contra fuente)
- Capital: "$7.83M/$8.37M desplegado" → equity $963,598 [Airtable] / $763,361 [QBO] + deuda separada.
- Ganancia: 3 números con 30× de gap → Net Income QBO YTD único + waterfall con residuo declarado.
- Espejo QBO: Investor Contributions y HML-Refin stale → = QBO vivo, as_of 13-jul.
- Ocupación: 4 valores distintos → 48/45/3/0 = 93.75% en todas las pantallas (= PDF del equipo).
- Obras: 91%/31 fantasma → 26/7, utilidad $170,682, margen 11.6% ponderado.
- Wellington: "déficit −$130k" → equity +$200,000 (déficit en hold como secundario honesto).
- Nómina: texto libre, 177 sin tarifa, 172 deudas negativas → por LINK (3,433/3,436), 0 y 0.
- Interés HML: invisible → 68% del ingreso · ICR 0.35× al tope en rojo + por casa en el P&L.
- Anomalías: 2,927 crudas → grupos accionables priorizados por $.
- Fantasmas: Arcadia/Cervin detectadas solas (C21); ghost F&F y units vacías fuera de conteos.

## MÓDULO INVERSIONISTAS REHECHO (14-jul — ranking por capital desplegado, obs CEO "el módulo actual no sirve")
| Qué | ANTES | DESPUÉS (verificado contra Airtable vivo) |
|---|---|---|
| Contenido del módulo | CRM plano (21 filas con rangos VIP/Blanco/Azul/Amarillo), "Capital del holding", KPI "Con socio"/"Contratos sin firmar" (—), 4 modelos con "✎ Generar propuesta" que mandaba al Cerebro, cap table paramétrica con aporte "típico" inventado (all-in/deals) | **LISTA de co-inversionistas ACTIVOS** rankeada de mayor a menor (capital desplegado, desempate nº casas) — todo lo demás se quitó; el generador de propuesta va al BACKLOG (INV-1) como modelo real fuera del Cerebro |
| Quién entra | todos los del CRM (incluía comprados, operadores y la propia empresa) | **participación viva**: 0 < ownership nuestro < 100% (Porcentaje de Owner Ship flddh8bS7oP34ak1M). Ownership 100% = les compramos su parte → fuera (Valeria, Caldas×2, Yeisson, Yeison, Diego, Flipping Rentals). Ownership 0 = operador → fuera, va en su módulo (Hitalo, Mirna, MEK/Charles, Jefferson/Harvest, Camilo). Vendidas con sociedad = **salida realizada** (se listan, no suman): Ivy · 1109 Arcadia |
| Capital | `capital_inversionista` coalesced ("Capital del inversionista" ?? aportado) — Stonleigh daba 45,000 | **`capital_aportado` PURO** (fldrePoqg3C3caiZ5, sync v14 + col nueva) — Stonleigh **35,000** ✔ |
| Ranking (data viva) | — | **Jefferson $188,000/4 · MEK $112,870.14/2 · Ivy $77,000/1+1 salida · Michael $43,000 · Jessica $35,968 · Ronald/Johanna/Cesar/Héctor $35,000 · Kysbel $34,708 · Daniel $23,200 — TOTAL $654,746.14 · 11 inversionistas · 16 casas EXACTO** al esperado del CEO |
| Rentabilidad | no existía | honesta desde `v_inversionistas` (security_invoker): rentada = participación × (renta − gastos) × 12 ÷ capital · vendida = utilidad entregada ÷ capital · sin renta/gastos = **"pendiente de dato"** (MEK: 2 casas s/dato), jamás $0. Detalle por casa: capital · % participación (1 − ownership) · etapa · flujo anual de su parte |

---

## 14-jul · Calc 4 Intereses = DOS MODELITOS SEPARADOS (obs del CEO, rama feat/calcs-encadenadas)

**Pedido:** la calc de Intereses en dos modelitos distintos, en dos lugares distintos — (1) Harmony/HML y (2) Refinanciación/DSCR — cada uno con SU pago mensual, sin re-teclear datos que ya viven en otras calcs.

### ANTES → DESPUÉS
- **UI**: una sola vista con hero del DSCR + tarjeta de inputs que RE-PEDÍA compra y % financia + un desglose que mezclaba HML y REFI en la misma tarjeta → **dos modelitos separados**: tarjeta 1 "🔨 Pago mensual al Harmony" (hero ámbar, etiqueta *HML · solo interés · durante la obra/hold*) y tarjeta 2 "🏦 Pago mensual de la refi" (hero azul, etiqueta *DSCR · refinanciación · amortizado*), cada una con su base, sus inputs y su nota de propagación + cierre "por qué son dos" (dos préstamos, dos bases, dos fórmulas).
- **Pago mensual HML**: redondeado a dólares ($2,959) → **con centavos** = préstamo × tasa/12 exacto (**$295,856 @12% → $2,958.56/mes**, verificado con el código real en node). El pago NO depende de los meses (probado: con 5 o 10 meses da idéntico); los meses (editables, estimado) solo mueven el **interés total del hold** ($2,958.56 × 5 = $14,792.80 exacto).
- **Inputs**: compra y % financia re-tecleados en Calc 4 → **eliminados de la vista** (viven en Calc 1; la base llega ⛓ por `negocio.prestamo`). Quedan editables inline solo lo propio del modelito: tasa HML + meses (M1) · tasa DSCR + plazo + préstamo override (M2, mismo `refi_prestamo_real` que ya mandaba en Cash-Out).
- **Base del refi**: rótulo fijo "75% × ARV" → **declara la fuente real ⛓ Cash-Out**: LTV% × (tasación del refi | ARV) o "tope DSCR — la renta manda" u override; verificado en cadena: ARV 449,297 → Cash-Out préstamo 336,973 → Calc 4 lee el MISMO número → **$2,270/mes @7.125%/30a** exacto.
- **Propagación nueva**: el pago HML no llegaba al Ingreso → **Calc 5 (modelos + fallback) muestra "⏳ Durante el hold"**: mismo flujo pero pagando el HML ⛓ en vez de la cuota DSCR (antes del refi la casa paga el hard money). Las demás cadenas ya existían y quedan intactas: interés total → reserva del draw (Calc 1)/déficit · cuota DSCR → flujo post-refi (Calc 5) · préstamo refi → cash-out (Calc 3) · Analítica del portafolio usa pagos REALES (hml_payment + ref30_payment del CC FF).

### Verificación
- `scratchpad/verify-intereses.mjs` (corre el código REAL): 6/6 ✅ — 2,958.56 · 14,792.80 · invariancia a meses · 2,270 · cadena ARV→Cash-Out→Intereses sin re-cálculo.
- Goldens `scripts/test-uw-cashout.mjs`: Michelle/Echo/Childress/Meadow **exactos** (sin cambios).
- `npm run ci:gate`: **12/12 ✓** · `node --check` OK en los 2 archivos tocados.

Commits: `04dde2c` (Calc 4 dos modelitos) · siguiente (propagación hold en Calc 5).

## ANALÍTICA FF — MÉTRICAS QUE SÍ SIRVEN (13-jul, main — rediseño pedido por el CEO)

Módulo nuevo `pm/ff-analitica.js` (ffSecAnalitica delega; fallback = vista vieja). KPIs desde capa v_* + espejo ff_*; cada KPI con drill "de dónde sale" (kitDrill) y NextAction donde aplica; sin $0/rojo sobre vacío (kitKpi.falta / noZeroAsReal). Espejo extendido: campos de VENTA de "Datos por casa" → ff_hml_loans (migr `20260713110000`, sync v13) + `fecha_ref30` al select de ffLoadAll.

| Qué | ANTES | DESPUÉS (verificado corriendo el código real, QA headless 12/12) |
| --- | --- | --- |
| Contenido | equity potencial + tablas por zona/modelo/inversionista (nada accionable) | 7 secciones: volumen+ritmo · rentabilidad realizada · renta op vs post-deuda · patrimonio · proyección · velocidad · salud/riesgo |
| Volumen | no existía | 28 operaciones (19 renta = 15+4 refi · 2 rehab · 5 adquiridas · 2 vendidas) + ritmo 1.5/mes histórico (3/6/12m) + chart por mes [close_date fldG2SABUD5Ptcuj8] |
| Vendidas | no existía | Arcadia $615,000 / bruta $110,653 / **NETA $11,928 / ROI 7.0%** · Slaughter "🟡 faltan datos" (jamás $0) + lectura: **el negocio hoy es HOLD, no flip** |
| Renta | no existía | flujo OPERATIVO **+$179,289/año** vs DESPUÉS de deuda **−$363,406/año** (carry $542,696 = HML 357,431 + ref30 65,277+119,988) · yield op 5.2% · CoC −37.7% · refi 4/19 |
| Patrimonio | no existía | valor **$9,415,000** (Σ ARV 23 propias — excluye 3 "Prestación de Servicios como Operador": Charles/Arthur Stiles/Bitter Creek) − deuda QBO **$5,974,414** = equity **$3,440,586** → multiplicador **3.6×** sobre $963,598 |
| Proyección | 1 deal elegido en UW | portafolio completo 5/10/15/20a, slider 2–6% (default 4% en ff_uw_config.an_apreciacion_pct), equity proyectado con amortización DSCR, rotulado SUPUESTO + chart |
| Velocidad | no existía | obra 55d/1.8m (v_supuestos_calibrados; crudo Datos por casa 57d n=19 ✓ valida) · hasta refi 194d (n=2, honesto) · 83% en presupuesto · 100% a tiempo vs plazo HML |
| Riesgo | no existía | pipeline refi: 15 en HML con ARV/saldo/tope 75%/semáforo/NextAction por fila · concentración: Jefferson 28.7% > umbral 25% en rojo (co-inversión $654,746) · salud: buckets sanas/déficit/sin datos/obra clickeables (déficit = flujo post-deuda por casa, jamás draws) |

QA: claro/oscuro + desktop/móvil (sonda solo marca los 🟡 de "falta" — deliberados) · 0 pageerrors · drill/slider/buckets probados · `ci:gate` **12/12 ✓**.
