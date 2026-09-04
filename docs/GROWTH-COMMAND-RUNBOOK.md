# Growth Command: procedimiento operativo y activación

## Lo primero que Nicolás debe hacer

1. Entrar a `https://empresa-os.vercel.app/viral` con su cuenta administradora.
2. Mantener seleccionado **Demo** y abrir **Hoy**.
3. Confirmar la directiva semanal y abrir **Agentes en vivo**.
4. Leer el brief de prueba, ejecutar **Ejecutar los 9 agentes** y esperar 9/9. Gerencia corre primero y el Consejo de Calidad, al final.
5. Abrir cada resultado y revisar dictamen, modelo, score, evidencia, supuestos, riesgos y próxima acción. Una inferencia real aparece como `anthropic`; `fixture-local` es solo una prueba de interfaz.
6. Corregir el brief y reejecutar individualmente cualquier agente con error o dictamen **Requiere revisión**. No confundir el score de estructura con garantía de desempeño.
7. Después revisar Radar, Aprobación y Consejo de Calidad en ese orden. No usar los números ni creatividades de la muestra como material real.
8. En Calendario, usar **Exportar paquete manual** para revisar la estructura de entrega. El archivo no autoriza publicación.

El resultado del primer recorrido debe ser una lista concreta de datos reales que reemplazarán la muestra, los tres hallazgos abiertos que deben corregirse y una persona responsable de conseguir cada acceso externo.

## Estado actual verificable

- Supabase Auth: operativo para acceso privado; requiere usuario activo con rol `admin` y respeta MFA.
- Supabase Growth: no activado; el escenario y las decisiones viven en el navegador.
- Google Drive: no configurado; los activos se muestran como ausentes.
- Metricool: no configurado; publicación e ingestión de métricas permanecen bloqueadas.

El producto consulta preparación desde servidor después de autenticar. Un estado **Configurado · sin prueba** no significa conectado.

## Qué está funcionando en los agentes

- La ejecución usa Anthropic desde el servidor y exige una sesión administradora.
- Los nueve agentes tienen misión, modelo y contrato propios; reciben el mismo brief y solo el contexto previo necesario.
- Las salidas se guardan en este navegador y se pueden exportar o borrar.
- Ningún agente publica, modifica Supabase, abre Drive, programa Metricool ni lee métricas/tendencias en vivo.
- Si una corrida falla, se conserva el error visible y puede reintentarse. No se debe avanzar a aprobación con menos de 9/9 resultados revisados.

## Batería de aceptación

1. Usar un brief que incluya objetivo, público, oferta, periodo y restricciones.
2. Ejecutar la batería completa sin cambiar de pestaña ni recargar.
3. Confirmar 9/9 resultados y que todos indiquen `anthropic`.
4. Comprobar que Producción usa los ángulos propuestos y que Conversaciones/Nutrición siguen el CTA sin fingir conversaciones reales.
5. Comprobar que Analítica distingue métricas demo de evidencia y propone medición futura.
6. Aceptar el cierre solo si el Consejo de Calidad identifica brechas concretas, asigna próximos pasos y evita garantías absolutas.
7. Exportar resultados para la revisión humana; el paquete no autoriza publicar.

## Activar Google Drive

1. Crear o elegir una cuenta de servicio con el mínimo permiso necesario.
2. Crear la carpeta raíz de Growth y compartirla solo con esa cuenta.
3. Cargar en Vercel, sin copiar valores en tickets o commits: `GOOGLE_DRIVE_CLIENT_EMAIL`, `GOOGLE_DRIVE_PRIVATE_KEY`, `GOOGLE_DRIVE_ROOT_FOLDER_ID`.
4. Hacer un redeploy controlado.
5. Implementar y pasar una prueba de lectura de metadatos y permisos antes de habilitar enlaces en piezas.
6. Probar un archivo temporal, confirmar versión/propietario y retirarlo de forma recuperable.

## Activar Metricool

1. Confirmar acceso oficial a API para la cuenta correcta y obtener token e identificadores.
2. Cargar en Vercel: `METRICOOL_API_TOKEN`, `METRICOOL_USER_ID`, `METRICOOL_BLOG_ID`.
3. Hacer un redeploy controlado.
4. Implementar primero una lectura del calendario y validar cuenta, canales y zona horaria.
5. Antes de programar, agregar llave de idempotencia, confirmación explícita de Nicolás, registro de solicitud/respuesta y reconciliación del identificador remoto.
6. Habilitar la escritura con una pieza de prueba claramente rotulada y un procedimiento de cancelación comprobado.

## Activar Supabase Growth

1. Aprobar el modelo de semanas, señales, piezas, activos, decisiones, publicaciones, métricas, aprendizajes y evidencias de calidad.
2. Crear una migración versionada y reversible con RLS de administrador.
3. Probar aislamiento por rol y auditoría de cada cambio.
4. Definir `GROWTH_SUPABASE_SCHEMA_VERSION` y solo entonces `GROWTH_SUPABASE_ENABLED=true`.
5. Migrar primero el escenario de prueba; no importar datos operativos del piloto.

## Criterio para habilitar publicación

La acción continúa deshabilitada hasta que Drive y Metricool estén probados, cada pieza tenga activo real/versionado, la aprobación humana esté registrada, el Consejo de Calidad no tenga hallazgos abiertos y la API confirme destino/horario. Ningún control garantiza viralidad ni elimina todo riesgo de fallo.
