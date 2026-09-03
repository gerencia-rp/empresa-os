# Growth Command Center: arquitectura de la primera entrega

## Contexto

La superficie se construye desde cero y se publica como una aplicación estática independiente dentro de Empresa OS. El código anterior de `/viral` no forma parte de la ejecución nueva. Durante la transición, sus archivos permanecen en el repositorio para que el cambio sea reversible, mientras la regla de Vercel dirige `/viral` al nuevo documento `growth-command.html`.

## Límites

```text
Supabase Auth existente
        |
        v
growth-command.html
        |
        +-- growth/app.js          interfaz y casos de uso
        +-- growth/data.js         contrato y repositorio demo
        +-- ui/tokens.css          sistema visual canónico
        +-- ui/icons.js            iconografía canónica

Adaptadores futuros, todavía no conectados:
Google Drive | Metricool | Supabase Growth
```

La interfaz depende de un contrato de repositorio, no de un proveedor. La implementación demo expone:

- `getSnapshot()`;
- `updatePieceStatus(pieceId, status)`;
- `updateQaCheck(reviewerId, status)`;
- `reset()`.

Los adaptadores futuros deberán implementar el mismo comportamiento y agregar control de concurrencia, auditoría y procedencia sin cambiar los componentes de vista.

## Modelo de dominio

- **Directiva semanal:** objetivo, cuello de botella, meta y confianza.
- **Etapa:** trabajo, dueño, SLA, estado y cantidad en cola.
- **Equipo:** misión, entradas, entregas, cadencia, KPIs y ejecución.
- **Pieza:** hipótesis creativa, avatar, ángulo, prueba, CTA, riesgo, canales y estado.
- **Publicación planeada:** pieza, canal, día, hora y estado confirmado.
- **Patrón:** señal, tamaño de muestra, decisión siguiente.
- **Experimento:** hipótesis, métrica, estado y responsable.
- **Control de calidad:** especialidad, hallazgo, evidencia y dictamen.

## Seguridad y privacidad

- En producción, la pantalla exige una sesión válida de Supabase, un perfil activo y rol `admin`.
- Si la cuenta requiere MFA, el centro no acepta una sesión con nivel inferior y devuelve al flujo de acceso principal.
- La excepción `?auth=demo` solo funciona en `localhost` o `127.0.0.1` para pruebas automatizadas.
- No se incluyen secretos ni credenciales en la aplicación. La anon key pública existente solo inicializa Supabase Auth; RLS y el perfil controlan acceso.
- No hay escrituras externas. Las decisiones demo viven en `localStorage` y se pueden restaurar.
- Ningún estado de publicación, conexión o ejecución real se infiere desde la presencia de configuración.

## Estados y recuperación

El repositorio permite simular carga, contenido, vacío y error. Una falla conserva una acción de reintento. Las decisiones de piezas y controles tienen feedback inmediato y persistencia local recuperable. Restaurar elimina únicamente el estado demo bajo la clave específica `empresa-os-growth-demo-v1`.

## Integraciones futuras

| Adaptador | Responsabilidad | Condición antes de activarlo |
|---|---|---|
| Google Drive | Resolver archivo, versión y permisos de guiones/recursos | Prueba de acceso mínimo y enlace estable |
| Metricool | Leer calendario, programar y confirmar publicación/métricas | Idempotencia, zona horaria, confirmación de destino y rollback |
| Supabase Growth | Persistir semanas, decisiones, auditoría y aprendizajes | Esquema aprobado, RLS, migración reversible y pruebas por rol |

## Riesgos conocidos

- La primera entrega usa datos demo y no demuestra la calidad de una integración real.
- El almacenamiento local no sirve como fuente de verdad multiusuario.
- Un panel estático protegido en cliente sigue entregando HTML y datos demo públicos; antes de datos sensibles se requiere autorización en servidor o lectura protegida por RLS.
- El consejo de calidad reduce riesgo, pero no garantiza viralidad ni ausencia de defectos.
- La atribución de contenido a ventas necesitará reglas y fuentes acordadas con ventas.
