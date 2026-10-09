// Este archivo corre "en segundo plano", separado de la página. Hace dos cosas:
//  1) Notificaciones push: puede mostrar un aviso aunque Mi Zona esté cerrada (lo despierta el sistema operativo).
//  2) Modo sin conexión: guarda la "carcasa" de la app para que abra aunque no haya internet y muestre un aviso claro.
// Los datos de la API NUNCA se guardan acá (son de otro dominio y cambian todo el tiempo).

const VERSION = "mizona-v3";
const CARCASA = ["/", "/offline.html", "/icono-96.png", "/icono-192.png", "/icono-512.png", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => Promise.all(CARCASA.map((u) => cache.add(u).catch(() => null)))).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((claves) => Promise.all(claves.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const pedido = event.request;
  if (pedido.method !== "GET") return;
  const url = new URL(pedido.url);
  if (url.origin !== self.location.origin) return; // API, mapas, fuentes y fotos de otros sitios: los maneja el navegador
  if (url.pathname === "/sw.js" || url.pathname.startsWith("/.well-known/")) return;

  // Pantallas: primero la red (siempre lo más nuevo); sin internet, la última copia o el aviso "Sin conexión".
  if (pedido.mode === "navigate") {
    event.respondWith(
      fetch(pedido)
        .then((r) => { const copia = r.clone(); caches.open(VERSION).then((c) => c.put("/", copia)).catch(() => {}); return r; })
        .catch(() => caches.match("/").then((r) => r || caches.match("/offline.html")))
    );
    return;
  }

  // Archivos con huella en el nombre (/assets/...) e íconos: no cambian, así que primero la copia guardada.
  if (url.pathname.startsWith("/assets/") || /\.(png|svg|webp|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(pedido).then((guardado) => guardado || fetch(pedido).then((r) => {
        if (r.ok) { const copia = r.clone(); caches.open(VERSION).then((c) => c.put(pedido, copia)).catch(() => {}); }
        return r;
      }))
    );
  }
});

self.addEventListener("push", (event) => {
  let datos = { titulo: "Mi Zona", cuerpo: "", url: "/" };
  try { datos = { ...datos, ...event.data.json() }; } catch (error) { /* si no viene JSON usamos los valores por defecto */ }

  event.waitUntil(
    self.registration.showNotification(datos.titulo, {
      body: datos.cuerpo,
      icon: "/icono-192.png",
      badge: "/icono-96.png",
      data: { url: datos.url || "/" },
    })
  );
});

// Al tocar la notificación: si Mi Zona ya está abierta la enfoca, si no abre una pestaña nueva.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((lista) => {
      const abierta = lista.find((c) => new URL(c.url).origin === self.location.origin);
      if (abierta) return abierta.navigate(url).then((c) => (c || abierta).focus()).catch(() => abierta.focus());
      return self.clients.openWindow(url);
    })
  );
});
