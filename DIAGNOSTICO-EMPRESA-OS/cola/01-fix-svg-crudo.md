TAREA ÚNICA Y QUIRÚRGICA: eliminar el "SVG crudo" — el código de ícono que se muestra
como TEXTO en la parte de arriba de la app (breadcrumbs, títulos, labels, chips). El CEO
lo está viendo EN VIVO, logueado, en empresa-os-admin. Ejemplo real que ve:
    <svg class="icn" width="15" height="15" viewBox="0 0 24 24" ... ><path d="M15...
Aparece encima de "Rentas › Property Mgmt" y en otros lados. NO es un bug fantasma: es
REAL y está en el código consolidado (la fusión trajo el patrón de íconos de main).

IMPORTANTE — cambio de actitud en la verificación:
- NO declares esto "arreglado" solo porque el build pasa o porque un grep del código fuente
  da 0. El bug es de RENDERIZADO. Tenés que confirmar sobre el BUNDLE/HTML que sirve el sitio.
- No repitas el error previo de decir "es del prod viejo". Asumí que es real y arreglalo.

═══════════════════════════════════════════
CAUSA RAÍZ (documentada en HALLAZGOS-EXPERTOS-agentes.md)
═══════════════════════════════════════════
Markup de íconos <svg …> se está pasando a slots de label/breadcrumb que ESCAPAN el HTML
(p.ej. OS_E en os.js, pmBreadcrumb en pm/pm-main.js, y equivalentes que trajo main). Al
escapar el markup del ícono, en vez de dibujarse el ícono sale el código literal como texto.

═══════════════════════════════════════════
QUÉ HACER
═══════════════════════════════════════════
1. Buscá en TODO el código consolidado los lugares donde se arma un breadcrumb/título/label/
   chip y se le concatena o inyecta un ícono SVG a un slot que luego se escapa. Cubrí tanto
   los helpers de la rama (OS_E/os.js, pmBreadcrumb/pm-main.js) como los que llegaron de main
   (el rebrand usa un set de íconos SVG — revisá la función que genera `class="icn"`).
2. Arreglá el patrón de raíz: el ícono debe renderizarse como HTML real (nodo/innerHTML del
   ícono), NUNCA pasar por el slot de texto escapado. Donde el slot deba seguir escapando el
   texto del usuario (correcto, por seguridad XSS), separá el ícono del texto: el ícono va por
   su propio contenedor sin escapar; el texto sigue escapado. No desactives el escape del texto.
3. Barré TODA la app: breadcrumbs, headers de sección, títulos de tarjetas, chips/badges,
   tabs, botones. Que NINGUNO muestre `<svg…>` como texto.

═══════════════════════════════════════════
VERIFICACIÓN (honesta y real)
═══════════════════════════════════════════
- Build OK + node --check. Deploy a empresa-os-admin.
- Confirmá sobre el bundle EN VIVO que la cadena literal `class=\"icn\"` (o `&lt;svg`) NO
  aparece como CONTENIDO DE TEXTO renderizado en breadcrumbs/headers. Listá cada lugar que
  tocaste y por qué ya no escapa el ícono.
- Dejá escrito en AUDITORIA-RENTAL-PROFITSS.md: "El CEO debe recargar empresa-os-admin
  logueado y confirmar que ya no ve código de ícono como texto arriba. Esta verificación
  final es del CEO, no automática."
- NO toques números, ni el merge, ni el asistente. SOLO este bug visual.

Cuando esté desplegado, escribí EXACTAMENTE al final:
    === AUDITORIA COMPLETA ===
