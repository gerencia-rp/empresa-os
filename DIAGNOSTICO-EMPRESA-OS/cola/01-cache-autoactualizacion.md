TAREA: que la app se ACTUALICE SOLA. Verificamos con acceso directo a Vercel que ambos
dominios sí servían la versión nueva, pero el CEO veía "igual" porque el navegador cacheaba
una versión vieja. Hay que arreglar eso de raíz para que NUNCA más pase.

Si ya está resuelto (AUDITORIA / git log), confirmalo breve y terminá.

QUÉ HACER:
1. Revisá si hay un service worker o caché agresiva del shell/bundle. Si lo hay, agregá
   lógica de auto-update: cuando se publica una versión nueva, la app la detecta y (a) se
   refresca sola en la próxima navegación, o (b) muestra un aviso discreto "Hay una versión
   nueva — recargar". Sin que el usuario tenga que limpiar caché a mano.
2. Poné cache-busting en el bundle (hash de versión en el nombre del archivo o query) y
   headers correctos: el index.html NUNCA cacheado fuerte (no-cache), los assets con hash sí.
3. Mostrá en algún lugar discreto la VERSIÓN/commit desplegado (badge) para poder confirmar
   de un vistazo que se está viendo lo último.

VERIFICACIÓN: build OK + deploy a empresa-os.vercel.app (dominio oficial). Confirmá que una
segunda carga tras un cambio toma la versión nueva sin limpiar caché a mano. Documentá cómo
lo probaste.

Al terminar escribí EXACTAMENTE al final:
    === AUDITORIA COMPLETA ===
