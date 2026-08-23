TAREA ÚNICA: dejar CONSISTENTE el conteo de unidades y la ocupación en toda la app
(Rentas/Property Management). Hoy el número de unidades y la ocupación difieren entre vistas.

Si ya está resuelto (AUDITORIA-RENTAL-PROFITSS.md / git log), confirmalo breve y terminá.

PARTE DE CÓDIGO (esto SÍ se hace ahora, autónomo):
1. Una sola fuente para "inventario rentable": una función única (ej. pmRentableInventory /
   pmDedupeUnits) que filtre is_active y deduplique unidades legacy, usada por TODAS las
   vistas (tarjetas, resúmenes, KPIs). Meta consistente: 51 físicas.
2. Ocupación desde RESERVAS vigentes hoy (pmActiveBookingOf: start≤hoy≤end), no desde
   pm_units.status (desactualizado). Un solo denominador en todas las vistas → el mismo %
   de ocupación en Resumen, Disponibilidad y KPIs.
3. Que "unidades ocupadas", "libres", "reservadas" sumen exactamente el inventario y no se
   contradigan entre pantallas. Test de invariante si es fácil.

PARTE DE DATOS (esto NO lo puede hacer el código — documentarlo, no inventarlo):
- La reconciliación fina de CUÁLES unidades están activas/duplicadas en Airtable la tiene
  que hacer Carlos. El código va a mostrar la lógica correcta, pero si Airtable trae una
  unidad mal marcada, hay que corregirla en Airtable. Dejá en AUDITORIA-RENTAL-PROFITSS.md
  una lista concreta de las unidades que se ven dudosas (duplicadas / sin período / estado
  raro) para que Carlos las arregle en la fuente.

VERIFICACIÓN: build OK + deploy a empresa-os-admin. Confirmá contra Supabase que las vistas
dan el MISMO número de unidades y la MISMA ocupación. NO toques el merge ni otros números.

Cuando esté desplegado, escribí EXACTAMENTE al final:
    === AUDITORIA COMPLETA ===
