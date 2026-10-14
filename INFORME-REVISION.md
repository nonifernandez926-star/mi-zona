# Mi Zona — Informe de revisión para Google Play (9 de octubre de 2026)

## Cómo leer esto
- ✅ Corregido en este paquete · ⚠️ Decisión o trámite tuyo (bloquea la publicación) · 📌 Recomendado, no hecho
- **Importante:** en este entorno no pude instalar paquetes ni ejecutar la app, así que no la vi funcionando ni compilé el `.aab`. Todo lo que cambié pasó verificación de sintaxis (servidor con `node --check`, web con esbuild), pero **hay que correr `npm install && npm run build` y probar en un celular antes de publicar**.

## 1. Requisitos de Google Play

| Requisito | Estado |
|---|---|
| Apuntar a Android 16 (API 36) en apps nuevas desde el 31/08/2026 | ⚠️ Se resuelve al empaquetar con la versión actual de Bubblewrap/PWABuilder (ver `play-store/GUIA-PLAY-STORE.md`) |
| **Pagos digitales con Google Play Billing** | ⚠️ **Riesgo alto.** La suscripción de negocios se cobra con Mercado Pago dentro de la app. Hay que elegir: Play Billing, o que la versión de Play no venda nada. Es decisión de negocio |
| Cuenta personal nueva: prueba cerrada con 12 testers × 14 días | ⚠️ Aplica si tu cuenta es personal y posterior al 13/11/2023 |
| Política de privacidad pública y completa | ✅ Estaba incompleta (ver errores). ⚠️ Falta tu correo y el titular: cargá `VITE_SOPORTE_EMAIL` y `LEGAL_TITULAR` |
| Enlace web para eliminar cuenta | ✅ Nuevo: `/eliminar-cuenta.html` |
| Eliminar cuenta dentro de la app | ✅ Ya existía y funciona completa |
| Acceso para revisores (la app exige cuenta) | ⚠️ Crear usuario/contraseña de prueba y cargarlo en "Acceso a la app" |
| Seguridad de los datos | ✅ Borrador listo en `play-store/SEGURIDAD-DE-LOS-DATOS.md` (verificalo) |
| Contenido de usuarios: reportar | ✅ Reseñas tienen "Reportar" |
| Contenido generado por IA: poder reportar respuestas | 📌 El chat/búsqueda con IA no tiene "Reportar respuesta". Google lo pide para apps con IA generativa. Puedo agregarlo |
| Ficha: ícono 512, gráfico 1024×500, capturas, textos | ✅ Ícono y gráfico (`play-store-grafico-1024x500.png`) y textos listos. ⚠️ Capturas: las sacás vos |
| Verificación de enlaces de la app (assetlinks) | ⚠️ Plantilla lista; falta la huella SHA-256 de Play App Signing |

## 2. Errores encontrados y corregidos
1. **La política de privacidad pública salía sin las listas** (qué datos guardás y con quién los compartís): el generador solo copiaba los párrafos. Corregido, y se agregaron los servicios que la app usa y no estaban (Open-Meteo, Nominatim, Georef, Google Fonts, alojamiento) y una sección de ubicación.
2. **Los códigos QR se generaban en un sitio externo** (`api.qrserver.com`): el código de canje y el enlace de tu negocio viajaban a un tercero, y si ese sitio caía el QR desaparecía. Ahora se generan dentro de la app (`qrcode`, nueva dependencia → `npm install`).
3. **El botón "atrás" de Android cerraba la app** desde cualquier pantalla. Ahora cierra la pantalla o ventana de más arriba (`src/atras.js`; cubre 20 pantallas y ventanas).
4. **Una pantalla que fallaba dejaba todo en blanco.** Ahora hay un aviso con "Reintentar" (`src/main.jsx`).
5. **Sin conexión no pasaba nada.** Ahora hay una pantalla "Sin conexión" y la app guarda su estructura (`public/sw.js`, `public/offline.html`). El service worker ahora se registra al abrir la app, no solo al activar notificaciones.
6. **Fuga de datos técnicos**: el login con Google devolvía el id de cliente en los errores, y 4 rutas devolvían el mensaje interno de error. Ahora responden genérico (el detalle queda en los logs; `DEBUG_AUTH=1` lo muestra al depurar).
7. **Límite de pedidos de `/api/eventos` falsificable** con el encabezado `x-forwarded-for`. Ahora usa la IP real.
8. **Cada visita a la lista de negocios escribía en la base** (barrido de vencidos). Ahora corre como máximo una vez por minuto.
9. Servidor: ruta `/healthz` (para monitores), respuesta JSON 404 en `/api` y registro de errores no atrapados.
10. Manifest: ícono *maskable* separado (el "any maskable" juntos se recorta mal), `id`, idioma, orientación y categorías. `index.html`: descripción, `color-scheme`, `noscript`.
11. `package.json`: el build ahora regenera las páginas legales; versión 1.1.0. Se agregó `netlify.toml` (cabeceras de seguridad y caché) y `.env.example` de la web. Si falta `VITE_API_URL`, la app publicada llama a `localhost` y no carga: está documentado como obligatoria.

## 3. Lo que sigue pendiente
- ⚠️ Pagos con Play Billing (arriba). Es lo más importante.
- 📌 **Modo oscuro**: hoy invierte los colores de toda la pantalla con un filtro CSS. Funciona pero es pesado en celulares modestos y no es un tema real. Rehacerlo con variables de color exige tocar `App.jsx` entero.
- 📌 **`App.jsx` tiene 5.610 líneas** (310 KB) y `cuenta.jsx` 1.215. Dividirlo en archivos baja el riesgo de errores y acelera cargas. No lo toqué a ciegas.
- 📌 No hay pruebas automáticas, ni monitoreo de errores (Sentry o similar), ni copias de seguridad programadas de MongoDB.
- 📌 Webhook de Mercado Pago: sin `MP_WEBHOOK_SECRET` no valida la firma. No permite falsificar pagos (se vuelve a consultar el pago a Mercado Pago), pero configurala igual.
- 📌 Tras pagar en Mercado Pago, el regreso a la app puede abrir una pestaña de Chrome en vez de la app (limitación de las TWA). Probalo.
- 📌 Fuentes de Google Fonts: autoalojarlas mejora velocidad, privacidad y modo sin conexión.
- 📌 Diseño: solo toqué lo seguro (íconos, gráfico, pantallas de error y sin conexión). No pude ver la app renderizada, así que no rediseñé pantallas a ciegas. Si me pasás capturas, lo hago con criterio.
- 📌 `LEEME.md` es un registro de cambios de 32 KB: conviene separarlo del manual.

## 4. Antes de publicar (en orden)
1. `npm install` (web y `server/`), `npm run build`, probar en el celular.
2. Resolver pagos y tipo de cuenta.
3. Cargar variables (`.env.example`), regenerar páginas legales, revisión legal.
4. Empaquetar, assetlinks, prueba interna → cerrada → producción (`play-store/GUIA-PLAY-STORE.md`).
