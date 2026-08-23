TAREA: dejar el asistente con UNA SOLA PUERTA de entrada. Hoy el cerebro ya es uno solo
(la edge fn `cerebro` alimenta tanto el botón flotante FAB como el chat de la sala de
Jarvis), pero hay DOS entradas conversacionales y confunde. El CEO quiere UNA sola.

Si ya está en una sola puerta (revisá AUDITORIA / git log), confirmalo breve y terminá.

QUÉ HACER:
1. Elegí UNA entrada conversacional única y omnipresente: el botón flotante (FAB
   os/os-cerebro.js) es el candidato natural — está en todas las pantallas. Que sea LA
   forma de hablarle al asistente.
2. La "sala de Jarvis" (os/os-command-center.js) NO se elimina: se conserva como TABLERO
   (mapa de los agentes, informes, colas de aprobación), pero SIN su propio chat duplicado.
   Su chat redirige/abre el mismo FAB (una sola conversación). Nada de la red de agentes
   se pierde.
3. Resultado: una sola caja de chat en toda la app (el FAB), con el mismo cerebro que ya
   lee números reales y delega en los agentes de área. El tablero de Jarvis queda como
   vista de control, no como segundo chat.

SEGURIDAD: sin cambios en la regla — solo lectura, ejecucion/pagos siempre tras
confirmación humana. No comitees secretos.

VERIFICACIÓN: build OK + deploy a empresa-os-admin (y queda para main vía prompt 01 si
corre después, o ya en main si este corre después de 01). Confirmá sobre el bundle en vivo
que hay UNA sola entrada de chat y que responde con números reales. Dejá nota para que el
CEO lo confirme en pantalla.

Al terminar escribí EXACTAMENTE al final:
    === AUDITORIA COMPLETA ===
