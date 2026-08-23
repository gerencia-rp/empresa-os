TAREA ÚNICA DE ESTA CORRIDA: construir el CEREBRO IA (asistente central del negocio).
Todo lo demás de la auditoría ya está hecho y desplegado; NO lo rehagas. La consolidación
rama↔main ya está fusionada; NO vuelvas a mergear. Enfocate SOLO en el Cerebro.

═══════════════════════════════════════════
QUÉ ES EL CEREBRO
═══════════════════════════════════════════
Un asistente de IA OMNIPRESENTE en la app (visible desde cualquier pantalla, tanto en el
lado admin como donde tenga sentido), experto en TODO el negocio Rental Profitss:
Fix & Flip, Remodelación, Rentas/Property Management, Portal del Inversor y FlipMentoría.
Es el "líder" que entiende los números reales y responde SIMPLE, "como a un niño".

═══════════════════════════════════════════
CÓMO CONSTRUIRLO (reusando lo que ya existe)
═══════════════════════════════════════════
1. Proveedor: Anthropic (Claude). La key ya está en los secrets de Supabase como
   ANTHROPIC_API_KEY (confirmada presente). Reusá el patrón de las edge functions que ya
   llaman a Anthropic (ai-deep-analyze / remodel-ai): mirá cómo leen la key, arman el
   request y manejan CORS/auth, y seguí el MISMO patrón. NO hardcodees la key. NO la imprimas.
2. Creá (o extendé) una edge function `cerebro` con requireAuth (igual que el resto) que:
   - Reciba la pregunta del usuario + el contexto de la pantalla actual.
   - Tenga acceso de LECTURA a los datos reales para responder: usá las vistas/RPC que ya
     existen y son la fuente única (inv_indicadores_data, v_cartera_kpi,
     v_remodel_avance_vivo, v_ocupacion, v_holding_pnl, ff_deals, etc.). "Un dato, una
     fuente": el Cerebro NO inventa ni recalcula; lee de las mismas fuentes que la app.
   - NUNCA ejecute pagos ni write-backs a Airtable/QuickBooks automáticamente. Solo lectura
     y explicación. Si el usuario pide una acción con efectos, la describe y pide confirmación.
3. Front: un botón/panel flotante del Cerebro presente en el shell (omnipresente). Usá el
   diseño ya consolidado (rebrand royal/cálida + tokens). Debe verse integrado, no pegado.
4. PROMPT BASE del Cerebro (system prompt), en español, resumido:
   "Sos el Cerebro de Rental Profitss, un holding inmobiliario en Austin TX con tres
    negocios: Fix & Flip (compra/reforma/venta y hold), Remodelación (obra) y Rentas
    (property management), más el Portal del Inversor y FlipMentoría. Conocés los números
    reales del negocio (déficit = caja atrapada de ff_deals.deficit_total; renta real =
    rent-roll actual; cartera vencida; EVM de obra; ocupación; distribuciones a
    inversionistas). Explicás TODO simple, como a alguien que no sabe de finanzas, con
    ejemplos concretos y el número real. Nunca inventás cifras: si no tenés el dato, lo
    decís. Nunca ejecutás pagos ni cambios; si algo requiere acción, lo explicás y pedís
    confirmación al humano. Sos el líder que coordina y traduce el negocio para el equipo."

═══════════════════════════════════════════
VERIFICACIÓN
═══════════════════════════════════════════
- Build OK + node --check. Deploy de la edge function y del front a empresa-os-admin.
- Probá 3 preguntas reales y confirmá que responde con NÚMEROS REALES de la base (no
  inventados): p.ej. "¿cuánta caja atrapada tiene el portafolio?" → $297,690;
  "¿cómo va la cartera vencida?" → $18,636 (15 morosos); "¿qué casa drena más caja?".
- Documentá en AUDITORIA-RENTAL-PROFITSS.md qué quedó y cómo se prueba.

Si la key no respondiera (créditos/permite), dejá el Cerebro construido pero con un aviso
claro en la UI y documentá el paso pendiente; NO pidas la key en texto.

Cuando el Cerebro esté desplegado y probado (o parado de forma segura por falta de
créditos), escribí EXACTAMENTE al final:
    === AUDITORIA COMPLETA ===
