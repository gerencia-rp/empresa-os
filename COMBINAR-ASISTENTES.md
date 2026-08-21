# COMBINAR ASISTENTES — Jarvis + Cerebro = UN solo asistente

> Objetivo (decisión CEO #5): UN asistente omnipresente. El **Cerebro** es el cerebro
> central / orquestador (siempre tiene el snapshot de números reales como verdad, responde
> simple y define toda sigla). Conserva **TODA** la red de agentes de Jarvis: para una
> pregunta de un área, el Cerebro **delega** en el agente especializado correcto y unifica
> la respuesta. Una sola entrada visible. SOLO LECTURA; toda acción con efectos queda detrás
> de confirmación humana.

Trabajado sobre la línea **`merge/consolidacion`** (worktree `empresa-os-admin/`), que es la
que alimenta el deploy que mira el CEO (`empresa-os-admin.vercel.app`). NO se toca `main`.

---

## PASO 1 — MAPA (qué hay hoy, verificado en el código y en Supabase prod)

### A) JARVIS / Agent Network — YA en vivo
- **UI:** `os/os-command-center.js` (namespace `JV`, ruta **`/jarvis`**, "Agent Network estilo
  ATTU · SOLO ADMIN"). Sidebar + 8 vistas. Dashboard operativo de la red: roster, propuestas,
  auditoría, alertas. Ya está en `index.html` + `scripts/build.mjs` (bundle) → **en vivo**.
- **Datos que lee (reales):**
  - `agent_registry` — roster de **38 agentes** (capa/área/equipo/riesgo/estado/enabled).
  - `agent_proposals` — cola de propuestas por escuadra (human-in-the-loop). Abiertas hoy:
    Escuadra Fix & Flip 22 · Remodelación 32 · Rentas 75 · Operación 33.
  - `agent_audit_log` — corridas / bitácora de cada agente.
  - `ct_findings` — alertas del Sabueso Contable (🔴).
  - Chat interno (`jvAsk`) que hoy pega a **`/api/brain-chat`** (Cerebro viejo de Vercel).
- **Los agentes de área (edge functions):** `ff-{gerente,financiero,underwriting,capital,
  reportes,ejecucion}`, `rentas-{gerente,financiero,optimizacion,reportes,ejecucion}`,
  `remod-{gerente,financiero,optimizacion,reportes,ejecucion}`.
  - **NO son chat.** Son **ejecutores batch** que corren por cron: LEEN el espejo del área y
    **ESCRIBEN SOLO PROPUESTAS** a `agent_proposals` o **BORRADORES** de informe a
    `pm_informes` (foto ejecutiva, pipeline, bitácora, ocupación, avance de obra…). Conectan
    como el rol DB `agentes_ia_exec` (least-privilege, test de aislamiento o ABORTAN). Cero
    acción con efectos: todo queda como propuesta que **aprueba un humano** en `/jarvis`.
  - Informes vivos en `pm_informes` (por tipo): `foto_ejecutiva_ff` (13), `pipeline_ff` (3),
    `foto_ejecutiva_rentas` (13), `ocupacion_semanal_rentas` (3), `bitacora_semanal_rentas`
    (3), `financiero_mensual_rentas` (1), `mejora_mensual_rentas` (1),
    `foto_ejecutiva_remodelacion` (13), `avance_obra_remodelacion` (3).

### B) CEREBRO — construido, backend en vivo, front no desplegado
- **Edge fn `cerebro`** (Supabase, ACTIVE, `requireAuth`): arma un **snapshot server-side de
  números reales** desde las fuentes únicas (`v_holding_pnl`, `v_cartera_kpi`,
  `v_cartera_inquilino`, `v_ocupacion`, `v_ff_portafolio_kpi`, `ff_deals.deficit_total`,
  `v_remodel_avance_vivo`, `inv_*`, `pm_brain_memory`). Responde SIMPLE, SOLO LECTURA. Reusa
  `_shared/{auth,cors,anthropic}.ts` y `ANTHROPIC_API_KEY` de secrets.
- **Front `os/os-cerebro.js`:** panel/FAB flotante **omnipresente** (se monta sobre
  `document.body`, z-index sobre `#os-root` y `#modal`, visible en cualquier pantalla para
  usuarios logueados). Estaba en la rama feat, **no desplegado**.

### Diagnóstico del solapamiento
Había **dos cerebros**: (1) el chat de Jarvis (`jvAsk` → `/api/brain-chat`, viejo, admin-only,
snapshot armado en el cliente), y (2) el `cerebro` edge fn nuevo (snapshot server-side, fuentes
únicas). Y el FAB omnipresente sin desplegar. Eso son "dos chats compitiendo".

---

## PASO 2 — DISEÑO DE LA COMBINACIÓN

**Una sola entrada, un solo cerebro, toda la red conservada.**

1. **El `cerebro` edge fn pasa a ser el ORQUESTADOR.** Sigue armando su snapshot transversal
   (verdad del holding) y ahora conoce a su "equipo" (roster de `agent_registry` resumido en
   el snapshot). Vía **tool-use de Anthropic** gana una herramienta `consultar_agentes_area`:
   cuando la pregunta es de un área y necesita detalle, el Cerebro la invoca; el server lee el
   **producto de trabajo del agente correcto** de esa área (el **informe más reciente** de
   `pm_informes` + la **cola de propuestas** de esa escuadra en `agent_proposals` + su roster),
   se lo devuelve, y el Cerebro **traduce a lenguaje simple citando al agente**.
   - **Por qué "leer el producto" y no "invocar el edge del agente en vivo":** los agentes de
     área NO son Q&A — son ejecutores batch que necesitan el rol `agentes_ia_exec`, hacen test
     de aislamiento y **escriben** informes/propuestas (con dedup por corte). Invocarlos por
     cada pregunta de chat sería pesado, podría generar informes duplicados y rompe el "solo
     lectura" del asistente. Leer su último informe + su cola ES consultar al agente, es
     instantáneo, es de solo lectura y refleja exactamente lo que el agente decidió. Los
     agentes siguen corriendo por sus crons; el Cerebro consume su salida.
2. **Ruteo:** el system-prompt maestro conoce TODO el negocio y a su equipo. Preguntas
   transversales / números del holding → snapshot directo. Preguntas de un área
   ("¿cómo va la obra de tal casa?", "¿qué propuestas de cobranza hay?") → tool
   `consultar_agentes_area(area)` → síntesis simple.
3. **Seguridad:** SOLO LECTURA. El Cerebro puede **PROPONER** una acción (y decir "aprobála en
   /jarvis" o "en el módulo X") pero **nunca ejecuta**. Los `*-ejecucion` y cualquier pago/
   write-back siguen detrás de confirmación humana (cola `agent_proposals`).

---

## PASO 3 — IMPLEMENTACIÓN (una sola UI omnipresente + un solo cerebro)

- **Entrada única omnipresente:** se despliega el FAB `os/os-cerebro.js` (en `index.html` +
  `scripts/build.mjs`). Es el asistente presente en toda pantalla, para todo usuario logueado.
- **Se elimina el segundo cerebro:** el chat interno de Jarvis (`jvAsk`) se **repunta al mismo
  `cerebro` edge fn** (ya no a `/api/brain-chat`). Así el control room `/jarvis` conserva su
  chat, pero es **literalmente el mismo Cerebro** (mismo backend, mismo snapshot, misma
  delegación) — no dos cerebros distintos. `/jarvis` queda como la **sala de control** de la
  red (roster/propuestas/auditoría), que es su valor real; el FAB es la entrada conversacional
  única de todo el OS.
  - **Se conservó la UI de Jarvis** (recomendación del CEO) y se le enchufó el Cerebro por
    debajo. No al revés, porque el FAB omnipresente es requisito de la decisión #5 y `/jarvis`
    es admin-only (no puede ser la única entrada para todos).

---

## VERIFICACIÓN
(ver sección "COMBINAR ASISTENTES" al final de AUDITORIA-RENTAL-PROFITSS.md)
