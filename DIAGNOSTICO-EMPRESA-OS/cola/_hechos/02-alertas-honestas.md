TAREA ÚNICA: hacer HONESTO y CALMADO el sistema de alertas de la app. Hoy el CEO ve en
la pantalla principal de Rentas cosas alarmantes como "500 alertas activas · 59 críticas ·
321 advertencias · 120 informativas" y "40 inconsistencias de datos". Eso vino con la
fusión (Agent Network de main) y asusta más de lo que ayuda.

Si esto ya está resuelto (revisá AUDITORIA-RENTAL-PROFITSS.md / git log), confirmalo breve
y terminá.

QUÉ HACER:
1. NO borres la detección: los problemas reales (Airtable con datos contradictorios,
   campos nulos, unidades) deben seguir detectándose. El objetivo es PRESENTARLOS bien.
2. Deduplicá y agrupá: 500 alertas casi siempre son el mismo puñado de problemas repetidos
   por muchas filas. Colapsá por tipo de problema (ej. "12 rentas sin período", "3 unidades
   duplicadas") en vez de escupir 500 líneas.
3. Tono calmado y accionable: un resumen tipo "Hay N cosas por revisar" con la lista corta
   de QUÉ y DÓNDE, sin números rojos gigantes en la cara. Nada de "59 CRÍTICAS" si no hay
   59 cosas realmente críticas distintas.
4. Cada "inconsistencia" debe LINKear al dato real (la casa/unidad/campo concreto), no ser
   un contador abstracto. Que el CEO pueda ir y arreglarlo, no solo asustarse.
5. No inventes severidades: "crítico" solo lo que de verdad afecta dinero/operación hoy.

VERIFICACIÓN: build OK + deploy a empresa-os-admin. Confirmá que la pantalla de Rentas ya
NO muestra el bloque alarmante de cientos de alertas, sino un resumen honesto y corto.
Dejá nota en AUDITORIA-RENTAL-PROFITSS.md de que el CEO lo confirme en pantalla.
NO toques números de negocio ni el merge. SOLO la presentación de alertas.

Cuando esté desplegado, escribí EXACTAMENTE al final:
    === AUDITORIA COMPLETA ===
