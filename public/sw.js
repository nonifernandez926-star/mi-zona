// Este archivo corre "en segundo plano", separado de la página. Por eso puede mostrar una notificación
// aunque Mi Zona esté cerrada: quien lo despierta no es la web, es el sistema operativo cuando llega un push.

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
