# Lista de verificación para publicar Mi Zona en Google Play (Fase 11)

Marcá cada punto cuando lo hayas hecho. ✅ = ya resuelto en el código/documentos · ⚠️ = lo tenés que hacer vos · 📌 = recomendado.
Los requisitos de Google están explicados y verificados en `GUIA-PLAY-STORE.md`.

## A. Cuenta y trámites
- [ ] ⚠️ Cuenta de Play Console creada y con identidad verificada. Tipo: personal (→ prueba cerrada de 12 testers × 14 días) u organización (sin ese requisito).
- [ ] ⚠️ Cuenta de servicio de Google Cloud con permisos en Play Console, y `PLAY_SERVICE_ACCOUNT_JSON` + `PLAY_PACKAGE_NAME` cargados en Render.
- [ ] ⚠️ 9 productos de un solo pago creados y activos (ids en la guía). Mi correo como tester de licencia.
- [ ] ⚠️ Revisión legal de `src/legal.js` por un abogado (términos y privacidad).

## B. Web y servidor publicados
- [ ] ⚠️ Variables de Netlify (`.env.example` de la web): `VITE_API_URL`, `VITE_SOPORTE_EMAIL`, `LEGAL_TITULAR`. Variables de Render: todas las de `server/.env.example` que no digan «opcional» (entre otras `MONGODB_URI`, `JWT_SECRET`, `ANTHROPIC_API_KEY`, `FRONTEND_URL`, `SOPORTE_ADMIN_KEY`, `CRON_KEY`, `VAPID_*`, `BREVO_API_KEY` y las de Play del punto A). `COMUNIDAD_HABILITADA` decidida (ver D).
- [ ] ⚠️ `/privacidad.html`, `/terminos.html` y `/eliminar-cuenta.html` abren sin iniciar sesión y muestran tu correo de contacto al pie.
- [ ] ⚠️ Servidor siempre activo (o monitor sobre `/healthz`). Copias de seguridad programadas de MongoDB.
- [ ] ⚠️ `https://TU-DOMINIO/.well-known/assetlinks.json` publicado con el ID de paquete y la huella SHA-256 de Play App Signing (hoy NO existe en `public/`: depende de tu cuenta de Play). Sin él, no hay Play Billing y la app muestra la barra de Chrome.
- [ ] ✅ Registro de errores de la web (`/api/errores`) y consulta para el equipo (`/api/errores/admin` con `x-soporte-key`).
- [ ] ⚠️ Probá `npm run probar:todo` dentro de `server/` (pruebas sin internet) y `npm install && npm run build` en la raíz.

## C. Prueba en celulares reales (con Chrome como navegador predeterminado)
Probalo en al menos 2 celulares distintos (uno modesto y uno nuevo, idealmente con Android 16) y con señal mala.
- [ ] Instalar desde la pista de pruebas interna. Sin barra de Chrome arriba (si aparece: falta el `assetlinks.json`).
- [ ] Registro con Google, con correo (código de 6 números) y con usuario/contraseña. Declaración de 18+. Elegir localidad.
- [ ] Crear un negocio, una ficha de oficios y un alquiler con fotos. Ver que aparezcan en el buscador único.
- [ ] Mes gratis de cada tipo de ficha: se usa una sola vez por cuenta y tipo.
- [ ] **Compra con Google Play en los 3 tipos** (mínimo 1 plan de cada uno): el vencimiento se suma; reintentar con la misma compra no acredita dos veces; con el celular sin señal no se pierde la compra.
- [ ] Invitación: con 2 cuentas, los días se acreditan cuando la cuenta nueva lleva 72 horas sin ser denunciada ni suspendida (es fijo, así que esta prueba lleva 3 días) y respetan el tope.
- [ ] Buscador: una palabra, una frase («necesito alguien que me corte el pasto»), una búsqueda sin resultados, aceptar y rechazar el aviso de IA, «Reportar respuesta», «Dejar de usar la ayuda con IA».
- [ ] Denunciar y bloquear (negocio, ficha, reseña); la persona bloqueada desaparece de las búsquedas; cuenta suspendida (puede leer el motivo, descargar datos y eliminar la cuenta).
- [ ] Permisos: negar la ubicación (la app sigue andando); notificaciones (se piden en contexto, no al abrir).
- [ ] Botón y gesto «atrás» en cada pantalla: nunca cierra la app de golpe. Rotar, modo oscuro, tamaño de letra al máximo del sistema.
- [ ] Sin conexión: aparece la pantalla de «Sin conexión»; al volver la señal, todo sigue.
- [ ] **Eliminar cuenta** (con negocios y sin negocios) y comprobar que la web de eliminación coincide con lo que pasó.
- [ ] 📌 TalkBack en las pantallas principales (Inicio, buscador, perfil de un negocio, Ajustes).
- [ ] 📌 Probar con localidades de varias provincias (la lista oficial se pide a Georef).

## D. Declaraciones en Play Console (Contenido de la app)
- [ ] Política de privacidad: `https://TU-DOMINIO/privacidad.html`.
- [ ] Acceso a la app: usuario y contraseña de prueba con datos de ejemplo cargados (ver `SEGURIDAD-DE-LOS-DATOS.md`).
- [ ] Anuncios: **No**. Público objetivo: **18+**. Funciones financieras: ninguna. Salud, noticias, gobierno: no.
- [ ] Seguridad de los datos: completarla con `SEGURIDAD-DE-LOS-DATOS.md`. Eliminación de cuenta: ambos enlaces.
- [ ] Cuestionario de clasificación de contenido (IARC): contestá con la verdad según estas características reales: tiene contenido generado por usuarios con denuncia y bloqueo; los usuarios pueden contactarse por WhatsApp fuera de la app; **no** comparte la ubicación de una persona con otras; vende productos digitales (planes) con Google Play; usa IA para buscar y chatear; sin violencia, sexo, apuestas ni drogas en la app.
- [ ] ¿Comunidad encendida al publicar? Si **sí**: incluí «Otro contenido generado por el usuario» en Seguridad de los datos y la descripción de la ficha. Si **no**: no la menciones en la ficha. Los términos y la política ya hablan de ella en ambos casos.
- [ ] Ficha: textos de `FICHA-TIENDA.md`, ícono, gráfico y **capturas reales** (mínimo 2, con datos de ejemplo).

## E. Prueba cerrada y producción (cuenta personal)
- [ ] 12 testers (o más) con cuenta de Google, **opt-in durante 14 días seguidos**: si baja a 11 un solo día, se reinicia. Conviene reclutar ~20 y pedirles que abran la app seguido.
- [ ] Durante los 14 días: anotar fallos y cambios que hiciste (te lo preguntan en el cuestionario). Subir al menos una actualización con arreglos.
- [ ] Cuestionario de acceso a producción: respondé con hechos tuyos: cómo reclutaste testers, qué feedback recibiste, qué cambiaste, cuántos usuarios esperás, qué hace distinta a la app. No copies respuestas ajenas.

## F. Ya resuelto en esta fase ✅
Ver `INFORME-REVISION.md` (errores corregidos y lo que queda pendiente).

## G. Después de publicar
- [ ] Revisar todos los días de la primera semana: Android vitals (fallos y ANR), reseñas, Soporte, `/api/errores/admin`, uso y costo de la IA, compras sin acreditar.
- [ ] Responder las consultas de Soporte (la política promete 30 días como máximo para pedidos de eliminación).
- [ ] Cada año (agosto): subir el nivel de API objetivo y la biblioteca de Play Billing.

## H. Riesgos de revisión de Google (de mayor a menor)
| Riesgo | Por qué | Qué hacer |
|---|---|---|
| Pagos | Todo digital debe ir por Play Billing | ✅ Resuelto (Fase 9). Probar las compras en la pista interna |
| Eliminación de datos | ✅ Resuelto (Fase 12): al eliminar la cuenta se borran los chats en Mi Asistente y las fotos en Cloudinary, con reintento automático | Antes de publicar: cargar CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET en el servidor de Mi Zona, subir Mi Asistente actualizado y PROBAR eliminando una cuenta de prueba que tenga un chat y una foto |
| Contenido de usuarios | Exige denuncia, bloqueo, términos y moderación activa | ✅ Resuelto. Mantener la moderación al día |
| IA generativa | Exige poder reportar respuestas | ✅ «Reportar respuesta» en 3 lugares |
| Datos declarados ≠ app real | Google compara la ficha de datos con la app y la política | Releer `SEGURIDAD-DE-LOS-DATOS.md` con la app abierta |
| Incentivos por invitar | Google vigila incentivos de instalación (y prohíbe incentivar reseñas) | No pedir ni premiar calificaciones; el tope de días y la detección de cuentas repetidas ya existen |
| Mapas | OpenStreetMap limita el uso intensivo de sus teselas y Esri tiene condiciones propias | 📌 Si crece el uso, contratar un proveedor de mapas con contrato |
