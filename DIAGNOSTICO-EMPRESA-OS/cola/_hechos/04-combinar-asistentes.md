TAREA ÚNICA: COMBINAR los dos asistentes en UNO SOLO, más poderoso, SIN PERDER NADA.
Todo lo demás (auditoría + fusión rama↔main) ya está hecho y desplegado; no lo rehagas.
No vuelvas a mergear main. Enfocate SOLO en unir Jarvis + Cerebro.

═══════════════════════════════════════════
QUÉ HAY HOY (lo verificamos en Supabase prod)
═══════════════════════════════════════════
- "JARVIS / Agent Network" (venía de main, YA está en la app consolidada y en vivo): una
  red de edge functions de agentes por área, entre ellas: ff-gerente, ff-financiero,
  ff-underwriting, ff-capital, ff-ejecucion, ff-reportes; rentas-gerente, rentas-financiero,
  rentas-ejecucion, rentas-reportes, rentas-optimizacion; remod-gerente, remod-financiero,
  remod-ejecucion, remod-reportes, remod-optimizacion; más ia-builder, ia-data, cobros-motor.
  Tiene su propia UI/entrada en la app consolidada.
- "CEREBRO" (lo construimos ahora): edge function `cerebro` (ACTIVE, requireAuth) que arma
  un snapshot server-side de NÚMEROS REALES desde las fuentes únicas (v_holding_pnl,
  v_cartera_kpi, v_ocupacion, v_ff_portafolio_kpi, ff_deals.deficit_total,
  v_remodel_avance_vivo, inv_*), responde simple "como a un niño" y es solo lectura.
  Su panel front `os/os-cerebro.js` está en la rama pero NO desplegado (para no pisar el diseño).

═══════════════════════════════════════════
OBJETIVO DE LA COMBINACIÓN
═══════════════════════════════════════════
UN solo asistente, omnipresente, con la UI ya consolidada (rebrand), donde:
1. El CEREBRO es el cerebro central / orquestador: SIEMPRE tiene el snapshot de números
   reales como verdad, responde simple y define toda sigla.
2. Conserva TODA la red de agentes de Jarvis: para preguntas/tareas de un área, el Cerebro
   DELEGA en el agente especializado correcto (ff-* para Fix&Flip, rentas-* para Rentas,
   remod-* para Remodelación) y unifica la respuesta. Nada se elimina; todo suma.
3. Una sola entrada visible (no dos chats compitiendo). Preferí conservar la UI de Jarvis
   que ya está en vivo y enchufarle el Cerebro por debajo; si es más limpio al revés,
   documentá por qué.

═══════════════════════════════════════════
CÓMO (con cuidado)
═══════════════════════════════════════════
PASO 1 (solo lectura) — Mapear en el código consolidado: dónde está la UI/entrada de Jarvis,
cómo invoca a sus agentes, y qué hace cada agente. Mapear cómo el panel/edge `cerebro`
arma el snapshot. Escribí el mapa en COMBINAR-ASISTENTES.md antes de tocar nada.

PASO 2 — Diseñar el ruteo: el Cerebro recibe la pregunta + contexto de pantalla, decide si
la responde con su snapshot (temas transversales/números del holding) o si delega en un
agente de área (ff/rentas/remod) y luego traduce la respuesta a lenguaje simple. Un solo
system-prompt maestro que sepa de TODO el negocio y conozca a su "equipo" de agentes.

PASO 3 — Implementar: una sola UI omnipresente (conservá el rebrand/tokens). Reusá
ANTHROPIC_API_KEY de secrets (nunca hardcodear). requireAuth en todo. Commit + push a la rama.

═══════════════════════════════════════════
SEGURIDAD (inquebrantable)
═══════════════════════════════════════════
- El asistente es SOLO LECTURA para datos. NUNCA dispara automáticamente pagos ni
  write-backs a Airtable/QuickBooks. Los agentes "*-ejecucion" y cualquier acción con
  efectos quedan SIEMPRE detrás de confirmación humana explícita — el Cerebro puede
  PROPONER la acción, nunca ejecutarla solo.
- No comitees secretos. No cambies el dominio de producción (paso manual del CEO).

═══════════════════════════════════════════
VERIFICACIÓN
═══════════════════════════════════════════
- Build OK + node --check. Deploy a empresa-os-admin.
- Probá que: (a) una pregunta transversal da números reales (caja atrapada $297,690;
  cartera $18,636/15 morosos; ocupación 70.59%); (b) una pregunta de un área ("¿cómo va la
  obra de tal casa?") se rutea al agente correcto (remod-*) y vuelve en lenguaje simple;
  (c) hay UNA sola entrada de asistente, no dos. Documentá en COMBINAR-ASISTENTES.md y
  AUDITORIA-RENTAL-PROFITSS.md.

Cuando el asistente combinado esté desplegado y probado (o parado de forma segura por falta
de créditos/algo bloqueante), escribí EXACTAMENTE al final:
    === AUDITORIA COMPLETA ===
