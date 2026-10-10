# Guía: de la web a Google Play (Android)

La app es una web (React + Vite) con servidor Express/MongoDB. La forma más simple y segura de llevarla a Play es una **TWA (Trusted Web Activity)**: una app de Android que abre tu web en Chrome a pantalla completa. **No uses un WebView (Capacitor/Cordova) sin revisar antes**: Google bloquea el inicio de sesión con Google dentro de un WebView y la app dejaría de poder entrar.

## 0. Decisiones previas (bloquean la publicación)
1. **Pagos de suscripción.** Google exige Google Play Billing para vender bienes o servicios digitales dentro de apps distribuidas en Play. Cobrar la suscripción de un negocio con Mercado Pago dentro de la app de Play puede ser rechazado o suspendido. Opciones: (a) usar Play Billing en la app de Android (se comisiona), o (b) que la versión de Play no venda nada (los dueños se suscriben desde la web, sin enlaces ni mensajes en la app que los dirijan allá). Antes de elegir, consultá la política vigente en Play Console → Ayuda de políticas. Decime cuál elegís y lo implemento.
2. **Tipo de cuenta de desarrollador.** Si es personal y se creó después del 13/11/2023, hay que correr una prueba cerrada con **12 testers durante 14 días seguidos** antes de pedir producción. Una cuenta de organización no tiene ese requisito. Estimá ~3 semanas hasta publicar.

## 1. Preparar la web (una vez)
1. Publicá el servidor (Render) y la web (Netlify) con **dominio propio** (recomendado; también funciona en netlify.app).
2. Cargá en Netlify las variables de `.env.example` (obligatorias: `VITE_API_URL` y `VITE_SOPORTE_EMAIL`; completá `LEGAL_TITULAR`).
3. Verificá que existan: `/privacidad.html`, `/terminos.html`, `/eliminar-cuenta.html`, `/manifest.webmanifest`, `/sw.js`.
4. Pedí a un abogado que revise términos y privacidad (`src/legal.js`).
5. Render gratis se duerme: el primer pedido tarda 30–60 s y parece que la app no abre. Pasá a un plan siempre activo, o al menos pedí `https://TU-SERVIDOR/healthz` cada 10 min con un monitor gratuito.

## 2. Empaquetar (TWA)
1. Elegí el **ID de paquete** definitivo (no se puede cambiar), por ejemplo `com.tuempresa.mizona`.
2. Generá el proyecto con **Bubblewrap** (`npx @bubblewrap/cli init --manifest https://TU-DOMINIO/manifest.webmanifest`) o con **PWABuilder.com**. Usá la versión más nueva: desde el 31/08/2026 Play exige apuntar a **Android 16 (API 36)**. Tenés una plantilla en `twa-manifest.json.plantilla`.
3. Generá el `.aab` (`bubblewrap build`) y subilo a Play Console. Activá **Play App Signing**.
4. En Play Console → Integridad de la app → copiá la huella **SHA-256 del certificado de firma de la app**, ponela en `assetlinks.json.plantilla`, guardalo como `public/.well-known/assetlinks.json` y volvé a publicar la web. Sin esto la app muestra una barra de Chrome arriba.
5. Probalo en un celular real: inicio de sesión (usuario y Google), notificaciones, mapa, ubicación, subir una foto, botón atrás.

## 3. Ficha y declaraciones en Play Console
- Textos y gráficos: `FICHA-TIENDA.md`.
- Seguridad de los datos: `SEGURIDAD-DE-LOS-DATOS.md`.
- Acceso a la app: usuario y contraseña de prueba para los revisores (la app exige cuenta).
- Cuestionario de clasificación de contenido (contiene contenido de usuarios, ubicación e IA).
- Enlace de eliminación de cuenta: `/eliminar-cuenta.html`.
- Capturas de pantalla reales (mín. 2).

## 4. Salida
Prueba interna → prueba cerrada (12 testers × 14 días si corresponde) → solicitud de producción → revisión de Google (de horas a varios días).
