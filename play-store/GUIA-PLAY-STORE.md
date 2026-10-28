# Guía: de la web a Google Play (Android) — actualizada el 21 de octubre de 2026

Los requisitos de abajo marcados con 🔎 los verifiqué el 21/10/2026 en la documentación oficial de Google (Play Console Help, Android Developers). Cambian cada año: antes de enviar, revisalos de nuevo en Play Console.

La app es una web (React + Vite) con servidor Express/MongoDB. La forma más simple y segura de llevarla a Play es una **TWA (Trusted Web Activity)**: una app de Android que abre tu web en Chrome a pantalla completa. **No uses un WebView (Capacitor/Cordova)**: Google bloquea el inicio de sesión con Google dentro de un WebView y la app dejaría de poder entrar.

## 0. Decisiones y trámites previos (bloquean la publicación)
1. **Tipo de cuenta de desarrollador.** 🔎 Una cuenta **personal** creada después del 13/11/2023 debe correr una **prueba cerrada con 12 testers opt-in durante 14 días seguidos** antes de pedir producción (después se responde un cuestionario). Una cuenta de **organización** no tiene ese requisito. Presupuestá ~3 semanas hasta publicar.
2. **Verificación de desarrollador.** 🔎 Android está sumando una verificación de identidad de quien publica apps (empezó el 30/09/2026 en Brasil, Indonesia, Singapur y Tailandia; el resto del mundo, desde 2027). Si publicás en Play, entrá a Play Console → Inicio y revisá que tu app figure como registrada.
3. **Pagos (Fase 9).** Todo cobro digital pasa por Google Play Billing; Mercado Pago ya no está. En Play Console (una sola vez):
   - **Productos de un solo pago** (Monetizar → Productos → Productos integrados), 9 productos con estos ids exactos y estado **Activo**: `mizona_negocio_1m`, `mizona_negocio_3m`, `mizona_negocio_6m`, `mizona_oficio_1m`, `mizona_oficio_3m`, `mizona_oficio_6m`, `mizona_alquiler_1m`, `mizona_alquiler_3m`, `mizona_alquiler_6m`. Precios sugeridos (ARS): negocio 3000 / 8100 / 14400; oficio 1000 / 2700 / 4800; alquiler 2000 / 5400 / 9600. Verificá el precio mínimo que Google permite para Argentina.
   - **Cuenta de servicio**: en Google Cloud creá una, descargá su clave JSON y en Play Console → Usuarios y permisos invitá su correo con permiso para ver datos financieros y administrar pedidos. Pegá el JSON en `PLAY_SERVICE_ACCOUNT_JSON` y el id de la app en `PLAY_PACKAGE_NAME` (Render).
   - **TWA con Play Billing**: 🔎 funciona con la Digital Goods API + Payment Request API, solo dentro de una TWA con **Chrome 101 o superior**, y exige `features.playBilling` y `alphaDependencies` activados en `twa-manifest.json` (ya están en la plantilla). ⚠️ El **navegador predeterminado del celular de prueba tiene que ser Chrome**: en Brave u otros la TWA no ofrece Play Billing y el botón de pagar no aparece.
   - **Biblioteca de Play Billing**: 🔎 desde el 31/08/2026 las apps nuevas y las actualizaciones deben usar **Play Billing Library 8 o superior**. Bubblewrap la trae por la dependencia `androidbrowserhelper`: usá siempre la última versión de Bubblewrap (`npm i -g @bubblewrap/cli`). Si Play Console te avisa «debe usar la versión 8.0.0 o posterior», actualizá Bubblewrap y volvé a generar el `.aab`.
   - **Probar**: agregá tu correo como *tester de licencia* y probá las 9 compras en la pista de pruebas interna antes de publicar.
   - **Mes gratis**: lo da la app sin cobrar (sin tarjeta); no es un «período de prueba» de Play (los productos son pagos únicos, no suscripciones). No encontré en la política de pagos nada que lo impida, pero confirmalo en Play Console al enviar.
   - **Incentivos**: 🔎 Google prohíbe incentivar calificaciones, reseñas e instalaciones para manipular el ranking, aunque reconoce que las invitaciones con recompensa pueden ser una vía legítima de crecimiento. Los días por invitar son por **invitar personas** y nunca por calificar la app en Play: no los menciones junto a calificaciones.
   - La web común (fuera de la app de Play) **no** vende nada: solo muestra un aviso para abrir la app. No pongas enlaces de pago externos.
   - **Pendiente**: los reembolsos hechos desde Google no quitan tiempo solos (hay que revisar a mano las compras anuladas).

## 1. Preparar la web (una vez)
1. Publicá el servidor (Render) y la web (Netlify) con **dominio propio** (recomendado).
2. Cargá en Netlify las variables de `.env.example`. **Obligatorias:** `VITE_API_URL` y `VITE_SOPORTE_EMAIL`; completá `LEGAL_TITULAR`. Desde la Fase 11, si falta `VITE_API_URL` el armado de la web **se frena con un aviso** (antes publicaba una app rota que llamaba a localhost).
3. Verificá que existan y carguen: `/privacidad.html`, `/terminos.html`, `/eliminar-cuenta.html`, `/manifest.webmanifest`, `/sw.js`. Abrí `/privacidad.html`: tiene que mostrar tu correo de contacto al pie (si no, falta `VITE_SOPORTE_EMAIL`).
4. Pedí a un abogado que revise términos y privacidad (`src/legal.js`).
5. Render gratis se duerme: el primer pedido tarda 30–60 s y parece que la app no abre. Pasá a un plan siempre activo, o pedí `https://TU-SERVIDOR/healthz` cada 10 min con un monitor gratuito.
6. Mirá los errores reales desde el servidor: `GET https://TU-SERVIDOR/api/errores/admin` con el encabezado `x-soporte-key: TU_SOPORTE_ADMIN_KEY` (los errores más repetidos de los últimos 30 días, sin datos de personas).

## 2. Empaquetar (TWA)
1. Elegí el **ID de paquete** definitivo (no se puede cambiar), por ejemplo `com.tuempresa.mizona`.
2. Generá el proyecto con **Bubblewrap** (`npx @bubblewrap/cli init --manifest https://TU-DOMINIO/manifest.webmanifest`) o con PWABuilder.com. Tenés la plantilla `twa-manifest.json.plantilla`. 🔎 Desde el 31/08/2026 Play exige apuntar a **Android 16 (API 36)** en apps nuevas y actualizaciones: usá la versión más nueva de la herramienta y comprobalo al subir el `.aab` (Play Console te avisa si no cumple). Con API 36 el botón «atrás» usa el gesto predictivo; probalo (la web ya maneja el atrás con `src/atras.js`).
3. Generá el `.aab` (`bubblewrap build`) y subilo a Play Console. Activá **Play App Signing**.
4. En Play Console → Integridad de la app copiá la huella **SHA-256 del certificado de firma de la app**, ponela en `assetlinks.json.plantilla`, guardalo como `public/.well-known/assetlinks.json` y volvé a publicar la web. Sin esto la app muestra una barra de Chrome arriba (y Play Billing no funciona).
5. Probalo en un celular real con Chrome como navegador predeterminado: `LISTA-DE-VERIFICACION.md` → sección C.

## 3. Ficha y declaraciones en Play Console
Todo está resuelto en documentos de esta carpeta:
- Textos y gráficos: `FICHA-TIENDA.md`.
- Seguridad de los datos: `SEGURIDAD-DE-LOS-DATOS.md`.
- Resto de declaraciones, cuestionario de clasificación, acceso para revisores, pruebas y respuestas para el cuestionario de producción: `LISTA-DE-VERIFICACION.md`.
- Enlace de eliminación de cuenta (🔎 obligatorio porque la app permite crear cuenta; tiene que existir también dentro de la app, y ambos existen): `https://TU-DOMINIO/eliminar-cuenta.html`.
- Contenido de usuarios (🔎 política UGC): la app tiene términos que se aceptan al registrarse, **denunciar y bloquear** claramente rotulados, moderación y reglas de convivencia.
- IA generativa (🔎 política de contenido generado por IA): hay «Reportar respuesta» dentro de la app en el buscador con IA y en los dos chats de asistente.

## 4. Salida
Prueba interna → prueba cerrada (12 testers × 14 días si corresponde) → solicitud de producción → revisión de Google (de horas a varios días). Después de publicar, revisá todos los días de la primera semana: Play Console → Calidad → Android vitals, las reseñas, Soporte (consultas con motivo «Respuesta de la IA») y `/api/errores/admin`.
