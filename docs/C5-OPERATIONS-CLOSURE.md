# C5 · Cierre operativo de Empresa OS

Fecha de diagnóstico: 2026-08-26. Las comprobaciones fueron de solo lectura contra el proyecto Supabase enlazado.

## 1. Ocupación

Hallazgo confirmado: `v_ocupacion` muestra 51 unidades, pero sus estados suman 47 (36 ocupadas, 6 disponibles, 4 en mantenimiento y 1 reservada). Las cuatro restantes son habitaciones archivadas el 2026-08-19 que conservan un indicador legado `active=true`, aunque `is_active=false`.

Corrección preparada:

- La migración `20260826160000_fix_ocupacion_archived_units.sql` exige `active=true`, `is_active=true`, `archived_at is null` y propiedad activa.
- El fallback visual y el reporte semanal usan exactamente la misma definición.
- El QA ya no fija un total histórico: exige que el total canónico reconcilie con sus estados y que OS y Property Manager coincidan.

Estado: **cerrado en producción**. Resultado verificado: 47 unidades activas, 36 ocupadas, 6 disponibles, 4 en mantenimiento, 1 reservada y 76.60% de ocupación; la distribución reconcilia con el total.

## 2. Espejo de QuickBooks

Hallazgo confirmado: las cuatro conexiones están activas y sus refresh tokens siguen vigentes hasta el 2026-10-22. El espejo `qb_report_cache` y `last_refreshed_at` quedaron detenidos el 2026-07-13. No se requiere reconectar las empresas; se requiere ejecutar `/qb-oauth/sync` y comprobar que cada empresa actualice P&L YTD, P&L histórico y balance sin errores.

Estado: **cerrado en producción**. Sincronización del 2026-08-26 completada para las cuatro empresas; P&L YTD, P&L histórico y balance respondieron sin errores.

## 3. Linaje

Hallazgo confirmado: la última corrida fue el 2026-07-29 y terminó correctamente: 48 pantallas, 202 números vistos, 202 con linaje y 0 sin linaje. Está desactualizada por fecha, no fallida.

Estado: **cerrado en producción**. La primera corrida detectó una etiqueta mensual congelada (`Cashflow · Jun 2026`); se convirtió en linaje mensual genérico y la repetición terminó `ok=true`: 48 pantallas, 190 números vistos, 190 con linaje y 0 sin linaje.

## Criterio de cierre

C5 queda cerrado únicamente cuando:

1. La vista desplegada reconcilia total = ocupadas + disponibles + mantenimiento + reservadas.
2. Las cuatro empresas de QuickBooks tienen `last_refreshed_at` de la corrida actual y sus tres reportes terminan sin errores.
3. El gate de linaje recorre todas las pantallas, termina con cero métricas sin linaje y persiste una corrida `ok=true` actual.
4. La batería, el build y los golden cases continúan verdes.
