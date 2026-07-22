# PENDIENTE_HUMANO — acciones que requieren una persona (no código)

## De la auditoría maestra (13-jul)
- Retirar campos legacy en la UI de Airtable: singleSelect "Porcentaje avance obra" y campo "Unidades" (la API no borra campos).
- Poner "comprobante" como required en el form de pagos de Airtable (regla Silvia, check C14).
- Cargar tarifas de trabajadores nuevos en "Personal en Campo" (Airtable) cuando el ledger de nómina marque faltantes.
- Renombrar la lista "List" de ClickUp (7 tareas huérfanas sin lista con nombre real — no cubribles por la plantilla N7).

## Del rediseño del Command Center FF (14-jul)
- **Cargar "Total Draws desembolsados" en las casas que están en 0** — hoy inflan el déficit con rojo falso
  (la UI ya las marca "⚠ faltan draws" y las EXCLUYE del déficit acumulado, pero el dato hay que cargarlo):
  5320 Wellington, 1601 Slaughter, 5303 Harvest, 3403 Charles y las demás marcadas en Propiedades (7 en total al 14-jul).
- **Confirmar clasificación de 5303 Harvest** (hoy "Pendiente" en Modelo de Negocio) y de las 3 de Operador
  (1003 Arthur Stiles, 2425 Bitter Creek, 3403 Charles) — definen qué cuenta como portafolio del CEO.
- Espejar la fecha de refi en Airtable ("Datos por casa") para las casas ya refinanciadas sin fecha —
  el portal del inversionista muestra "fecha sin espejar" en esas.

## 21-jul-2026 · Deuda HML de 7 casas — JUAN (term sheets reales, NO se inventa)
Denfield · Wellington · Starbright · Arthur Stiles · Charles · Bitter Creek · Harvest no tienen
"Datos por casa" en Airtable (Flipping Rentals matriz → tbluy4xlHJav9RtrZ) → el OS las muestra
"por completar" (múltiplo equity del portafolio las cuenta con deuda 0, sesgo declarado en la UI).
Juan carga Monto HML/tasa/plazo/fechas del term sheet real → el sync los trae y todo se recalcula solo.
Deep-links directos en Admin → Inversionistas → 📊 Global → checklist "Por completar".
También pendiente: precio de venta de Slaughter (hoy ARV como proxy, declarado).
