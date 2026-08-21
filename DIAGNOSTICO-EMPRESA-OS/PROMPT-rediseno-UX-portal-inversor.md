Implementá esto en el repo empresa-os (rama feat/portal-inversionista-v2). Autónomo, commit Y PUSH a la rama, ci:gate verde, deploy a empresa-os-admin (vercel --prod). Verificar en carga NORMAL logueada (sin forzar osInit). Anotá antes/después en IMPLEMENTATION_LOG.md.

OBJETIVO: rediseñar la VISTA DEL INVERSIONISTA (os/inv-portal.js y estilos) con la calidad de experiencia de Robinhood / eToro — que el inversor vea su inversión súper fácil, sin que nadie se la explique. Actuar como experto UX/UI/IX. NO cambiar el motor de cálculo; es rediseño de presentación + jerarquía + claridad. Un dato, una fuente (leer del motor/ledger reales).

════════════════════════════════════════
PRINCIPIOS DE DISEÑO (Robinhood / eToro) A APLICAR
════════════════════════════════════════
1. UN número protagonista por pantalla, grande: arriba de todo, el valor que importa (ej. "Tu riqueza hoy" en la casa; "Valor de tu portafolio" en el portafolio) + su cambio en $ y % (verde sube / rojo baja).
2. GRÁFICA de evolución en el tiempo, protagonista, interactiva: línea/área del valor a lo largo del tiempo, con SELECTOR DE HORIZONTE (segmented control). Usar el set de horizontes definido (LOCKEAR: 1/3/5/8 años — CONFIRMAR con CEO). Al tocar la gráfica, mostrar el punto/valor. En holds cortos sin historia real, mostrar estado honesto, no una curva inventada.
3. JERARQUÍA por tarjetas, de lo simple a lo detallado (divulgación progresiva): primero el titular + gráfica; luego las fuentes de valor; el detalle técnico se expande o va más abajo. Nunca abrumar.
4. COLOR semántico consistente: verde = ganancia, rojo = pérdida/salida de plata, neutro = informativo. Nada de "todo rojo" (arreglar el caso donde casas "Sano" salían en rojo).
5. Lenguaje simple + tooltips ⓘ por término (TIR, TVPI, DPI, RVPI, cap, DSCR, cash-on-cash): "qué es · cómo leerlo · qué hacer", en cristiano. El inversor entiende sin ayuda.
6. Estados vacíos/pendientes HONESTOS y bonitos: "en rehab — aún no genera renta", "en registro", "aún no realizado" — nunca -Infinity, Infinity%, ni TIR/apreciación absurdas anualizadas en holds < 1 año.
7. Realizado vs proyectado SIEMPRE separado y etiquetado (banner + tags). Lo realizado (capital, distribuciones, equity en papel) lidera; lo proyectado va marcado "supuesto" y secundario.
8. Mobile-first, mucho aire, tap targets grandes, tipografía clara con números tabulares. Menos formulario, más tablero.
9. Segmented controls / toggles para cambiar vista: "Todo el portafolio ⇄ por casa", y el selector de horizonte.

════════════════════════════════════════
A APLICAR EN CADA PANTALLA DEL PORTAL (consolida los ajustes del diagnóstico)
════════════════════════════════════════
· MI PORTAFOLIO (home, estilo Robinhood): titular = valor total de tu posición + retorno total ($/%); gráfica de crecimiento (capital → hoy, con distribuciones marcadas) con selector de horizonte; DPI/RVPI/TVPI y múltiplo como tarjetas simples; abajo la lista de "tus casas" (cada una tarjeta con nombre, tu valor hoy, estado, mini-sparkline). Toggle Portafolio ⇄ por casa. (Items 07, 18, consolidado.)
· DETALLE DE CASA (estilo página de acción): titular "Tu riqueza hoy" + gráfica; luego PRIMERO los NÚMEROS REALES del negocio (compra, obra/draws pagados a remodelación, HML, ARV, estado, renta real, gastos reales, servicio de deuda, refi/cash-out, línea de tiempo) y AL FINAL los INDICADORES financieros (TIR, VPN, múltiplos, cap, DSCR) — con horizontes 1/3/5/8. (Items 19, 14, 21.)
· FLUJO MENSUAL: mostrar rentas reales + TODOS los gastos (operativos + pagos a remodelación/draws + servicio de deuda) mes a mes, con neto real; nada en $0 escondiendo la obra. (Items 09, 21.)
· INDICADORES: cada uno con su explicación de una línea y "qué hacer". Nada de números sin respaldo. (Items 07, 20.)
· "P&L del modelo" + "Desembolso del banco & ciclo": reescribir a lenguaje simple, una sola historia coherente (por qué la utilidad es negativa hoy pero el retorno total es positivo = valorización/rehab; qué es cash atrapado y cómo se recupera). Autoexplicativo. (Item 20.)
· CREDIBILIDAD: aplicar en TODA la vista la regla de no anualizar holds < 1 año (múltiplo + "en valorización"); apreciación anualizada absurda (1697.9%, 218997%) fuera. (Item 08/19.)

════════════════════════════════════════
SISTEMA DE DISEÑO (dejar consistente en TODA la app)
════════════════════════════════════════
- Definir/usar tokens únicos: colores (pos/neg/neutro/superficie), tipografía, radios, sombras, espaciados, componentes (tarjeta-KPI, fila-holding, gráfica, tooltip, segmented control, banner realizado/proyectado, estado-vacío). Reutilizar en todas las pestañas del inversor para que se vea UNA sola plataforma moderna (liga con Ajuste 01 de unificar diseño).
- Accesible: contraste AA, legible en claro y oscuro (ya hay toggle de tema).

════════════════════════════════════════
DoD
════════════════════════════════════════
- La vista del inversor se siente Robinhood/eToro: titular grande + gráfica con horizontes + tarjetas claras + lenguaje simple + tooltips + estados honestos + color semántico correcto.
- Números reales primero, indicadores al final; realizado vs proyectado separado; sin valores rotos ni TIR/apreciación absurdas.
- Un solo sistema de diseño consistente en todas las pestañas del inversor.
- Verificado en carga normal (incógnito) en empresa-os-admin, mobile y desktop, 0 errores de consola. Deploy verde + before/after en IMPLEMENTATION_LOG.md.
