// Empresa OS · Service Worker — KILL SWITCH (auto-destructivo).
//
// El SW cacheaba assets y servía versiones VIEJAS aunque ya se hubiera deployado
// lo nuevo (el CEO veía el bundle viejo, incluso inconsistente en incógnito).
// La app NO es una PWA offline crítica, así que la solución de raíz es NO tener SW:
// este worker se auto-desregistra, borra TODAS las caches y recarga los clients una
// vez, para que a partir de ahí todo salga siempre de la red (deploy instantáneo).
//
// Los usuarios que ya tienen el SW viejo instalado reciben este sw.js en el próximo
// chequeo de actualización → se limpia solo. NO hay fetch handler: nada de caché.

self.addEventListener('install', () => {
  // activar de inmediato, sin esperar
  self.skipWaiting();
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil((async () => {
    try {
      // 1) borrar TODAS las caches (build viejo versionado por hash y cualquier otra)
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    } catch (e) {}
    try {
      // 2) tomar control y desregistrarse a sí mismo
      await self.clients.claim();
      await self.registration.unregister();
    } catch (e) {}
    try {
      // 3) recargar cada ventana controlada UNA vez → sirve el bundle fresco desde la red
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach(c => { try { c.navigate(c.url); } catch (e) {} });
    } catch (e) {}
  })());
});

// SIN fetch handler → el navegador va siempre a la red (nada desde caché).
// Se mantiene notificationclick por si llega un push (no cachea nada).
self.addEventListener('notificationclick', (ev) => {
  ev.notification.close();
  const target = (ev.notification.data && ev.notification.data.url) || '/';
  ev.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const c of clients) {
        if (c.url.includes(self.location.origin)) {
          c.focus();
          if (target && target !== '/') c.postMessage({ type: 'navigate', url: target });
          return;
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
