# Mi Zona — Fase 15: pestañas Comunidad y Negocio, «+» en Chats y perfil de alquiler como el de negocio (volver a publicar SOLO la web · el servidor no cambió)

- **Barra de abajo (5 pestañas iguales, como WhatsApp):** Inicio · Chats · Comunidad · Negocio (o Herramientas) · Ajustes. El «+» del centro se mantiene (agregar negocio, oficio o alquiler).
- **Comunidad:** ahora es una pestaña (con solapas «Publicaciones | Mis publicaciones» y un botón «+» redondo para publicar las fichas). Si el servidor no la habilitó, muestra «llega muy pronto».
- **Negocio** (`src/negocio.jsx`): aparece **solo cuando la cuenta tiene un negocio, un oficio o un alquiler**; si no, esa pestaña es «Herramientas» (con los accesos para sumar lo propio). Lista «Mis perfiles» (negocios, oficio y alquileres) y, al tocar uno, su panel: ver cómo lo ven, editar, plan/suscripción, estadísticas, pausar/activar, eliminar y sus herramientas (promociones, reseñas, historia, personal, QR, Mi Asistente en negocios; disponibilidad en oficio; artículos en alquiler). Mi agenda e invitaciones también están ahí. Reemplaza a «Mis fichas» y al panel que estaba en Herramientas.
- **Quien ya tiene Negocio:** Mis pedidos, Favoritos, Mis puntos y Ranking pasan a la primera sección de Ajustes.
- **Chats:** botón «+» abajo a la derecha (como WhatsApp). Abre «Chatear con un negocio» (lleva a Inicio), «Agregar un amigo» y «Crear un grupo» (marcados «Próximamente», para más adelante). El botón de búsqueda con asistente ahora se ve solo en Inicio.
- **Perfil de alquiler** igual al de negocio (`src/componentes/PerfilFicha.jsx`): portada con botones flotantes, tarjeta con logo, números (artículos, disponibles, actualizada), WhatsApp y Cómo llegar, redes, pestañas Información / Artículos / Fotos y botón principal. Oficios puede usar el mismo componente.
- **Cambia a mano en el código:** `MisFichasScreen` (misFichas.jsx) ya no se usa (se conservan `PasoNegocioActivado`, `BotonPlan` e `infoNegocio`). Textos de ayuda actualizados.
- **No pude compilar con Vite** (sin internet): revisé sintaxis e identificadores y rendericé las pantallas nuevas sin errores en un entorno de prueba, pero sin estilos Tailwind. Corré `npm install && npm run build` y probalo en un celular real (barra de 5 pestañas a 360 px, botones «+», perfil de alquiler).

---

# Mi Zona — Fase 14: revisión y pulido (volver a publicar SOLO la web · el servidor no cambió)

- **Qué es:** una revisión de accesibilidad y diseño hecha con cuidado de no cambiar cómo funciona nada. No hay cambios de datos, de servidor ni de la API.
- **Formulario de negocios** (`BusinessForm` en `App.jsx`): ahora está dividido en secciones, con barra de avance y un solo botón principal fijo abajo. Usa las mismas piezas que oficios y alquileres (`formKit.jsx`, `Pagina`, `Hoja`).
- **Editor de horarios en negocios:** ya no acepta horas inválidas (por ejemplo, cierre antes de la apertura).
- **Botón fijo de abajo en los formularios:** una animación de `index.css` lo dejaba al final de la pantalla en vez de pegado abajo. Se corrigió en el CSS (`backwards` en lugar de `both`). Todos los formularios usan el mismo componente (`Pagina`), así que el arreglo les llega a todos, pero solo lo vi funcionando en el de negocios: probalo también en oficios, alquileres y Comunidad.
- **Botones de 44 px o más** en las «X» y los botones redondos de cuenta, agenda, pedidos, selector de localidad, selector de ubicación y quitar foto (Comunidad y formularios). Se ve igual, pero se toca mejor con el dedo.
- **Etiquetas para lectores de pantalla** en 22 campos que solo tenían texto de ejemplo, y en fecha, hora, duración, tipo y recordatorio de la agenda.
- **Contraste:** los textos chicos en gris claro (`#8D95B0`, 3:1) pasaron a un gris un poco más oscuro (`#6B7390`, 4,7:1) en avisos, ayuda y ajustes.
- **Fotos de listas** (logos en Chats, imágenes de pedidos y de alquileres): se cargan cuando se acercan a la pantalla (`loading="lazy"`), sin cambiar tamaño ni aspecto.
- **No se tocó:** servidor, modelos, rutas, nombres de campos, ids de categorías y rubros.
- **No pude compilar la web con Vite** (sin internet para `npm install`): revisé la sintaxis de todos los `.jsx` con esbuild y las pruebas del servidor siguen pasando (`npm run probar:todo`). Corré `npm install && npm run build` y probá en un celular real antes de publicar.

---

# Mi Zona — Fase 13: los sorteos pasan a ser una ficha más de Comunidad (volver a publicar servidor Y web)

- **Qué cambió:** los sorteos y rifas ya **no son una sección aparte**. Son un tipo más de publicación de **Comunidad** («Sorteo o rifa»), con su filtro y su ficha. La persona anuncia su sorteo (a beneficio o por otro motivo) y quien se interese le escribe por WhatsApp. Lo que arreglen, incluido el pago, pasa **fuera de la app**.
- **Inicio:** el selector vuelve a tener Negocios · Alquileres · Oficios. Quien tenía «Sorteos» guardado vuelve a Negocios solo.
- **La ficha lleva:** título, descripción, quién organiza, motivo, premios (hasta 6), cantidad de números (opcional, solo como dato), fecha (hora opcional), cómo se define (Quiniela, Lotería, en vivo, redes u otra), lugar (opcional), foto (opcional), localidad y botón «Escribirle por WhatsApp» (el número no viaja en los listados: se entrega al tocar el botón). Siempre muestra el aviso «Mi Zona no organiza ni cobra sorteos…».
- **Se eliminó:** la grilla de números, reservar, marcar pagado, «ventas cerradas», precio por número, forma de pago, recaudado, la barra de progreso, la declaración de autorización, `server/routes/sorteos.js`, `server/models/Sorteo.js`, `server/utils/sorteos.js`, `src/sorteos.jsx` y las pruebas viejas.
- **Reglas en el servidor** (`server/utils/comunidad.js`): sin premios en dinero, sin precios ni formas de pago ni números largos (teléfonos, cuentas), WhatsApp obligatorio, máximo 5 sorteos abiertos por persona, fecha hasta 120 días adelante, la ficha se oculta 3 días después de la fecha.
- **El organizador puede:** publicar los números ganadores (solo texto, desde el día del sorteo), editar, cancelar, reactivar y eliminar (`POST /api/comunidad/:id/sorteo`). Se denuncia con `HojaDenunciar` (tipo `publicacion`), se puede bloquear, se borra al eliminar la cuenta.
- **Datos viejos:** si en la base ya existía la colección `sorteos` de la versión anterior, queda sin usar; podés borrarla desde MongoDB Atlas. No se migra nada (la versión anterior no se había publicado).
- **Textos:** `SORTEOS-ARGENTINA.md` reescrito, artículo nuevo «Sorteos y rifas» en el Centro de ayuda, términos actualizados (`LEGAL_ACTUALIZADO` = 25 de octubre de 2026; se regeneran solos en `npm run build`).
- **Pruebas sin internet ni base de datos:** en `server/`, `npm run probar:sorteos` (16 pruebas del tipo Sorteo) y `npm run probar:todo`.
- **Google Play:** ver `INFORME-REVISION.md`, sección «Sorteos y la política de Google Play». Hay una duda que no puedo resolver yo.
- **No pude compilar la web con Vite** (sin internet para `npm install`): revisé la sintaxis de todos los `.jsx` con esbuild y saqué capturas a 360×740 y 390×844 con Chromium. Corré `npm install && npm run build` y probalo en un celular real.

---

# Mi Zona — Fase 11: Publicación en Google Play (volver a publicar servidor Y web · empezar por `play-store/LISTA-DE-VERIFICACION.md`)

Esta fase prepara la publicación. Los requisitos de Google se verificaron el 21/10/2026 en su documentación oficial y están explicados en `play-store/GUIA-PLAY-STORE.md` (nivel de API 36, Play Billing Library 8, prueba cerrada de 12 testers × 14 días, eliminación de cuenta, contenido de usuarios, IA generativa, verificación de desarrolladores). **No pude compilar la web ni generar el `.aab`**: hay que correr `npm install && npm run build` y probar en celulares reales.

- **Documentos nuevos o reescritos (`play-store/`):** `GUIA-PLAY-STORE.md`, `LISTA-DE-VERIFICACION.md` (cuenta, pruebas en celulares, declaraciones, prueba cerrada, riesgos), `SEGURIDAD-DE-LOS-DATOS.md` (según el código real y las definiciones de Google), `FICHA-TIENDA.md`, `twa-manifest.json.plantilla` (ahora con Play Billing y ubicación). `INFORME-REVISION.md` es el informe final.
- **Reportar respuesta de la IA** (`src/componentes/ReportarRespuestaIA.jsx`): botón dentro de la app en el buscador con IA, en la búsqueda con asistente y en el chat de cada negocio. Envía a Soporte (motivo nuevo «Respuesta de la IA») solo lo que la persona ve en el aviso. Requiere sesión.
- **Registro de errores de la web** (`src/errores.js`, `server/routes/errores.js`, `server/utils/errores.js`, `server/models/ErrorApp.js`): la app envía los errores a `POST /api/errores` sin datos de personas (se les quitan correos, teléfonos, claves y parámetros de enlaces); se agrupan por huella y se borran a los 30 días. El equipo los ve en `GET /api/errores/admin` con el encabezado `x-soporte-key`. Solo funciona en la versión publicada.
- **Textos legales** (`src/legal.js`, actualizados al 21 de octubre de 2026) y **página de eliminación de cuenta** (`scripts-generar-legales.mjs`): ahora dicen todo lo que la app guarda, qué se borra, qué se conserva y por cuánto tiempo, el contenido prohibido, la IA, los menores y los avisos técnicos. Las páginas `public/*.html` se regeneran solas en `npm run build` (con tu correo si cargaste `VITE_SOPORTE_EMAIL`).
- **Clima:** la ubicación que se envía a Open-Meteo se redondea a ~5 km (antes ~100 m; la política decía «aproximada»).
- **Build:** si falta `VITE_API_URL`, `vite build` se frena con un aviso (antes publicaba una app que llamaba a localhost). La versión de `package.json` (1.2.0) viaja con cada aviso de error.
- **Cuentas suspendidas:** pueden usar la búsqueda con IA y «resolver favoritos» (pedidos de solo lectura que estaban bloqueados).
- **Servidor:** la bandera `mercadoPago` del diagnóstico se cambió por `playBilling`.
- **Pruebas sin internet ni base de datos:** en `server/`, `npm run probar:todo` (33 pruebas: búsqueda con IA, errores y permisos de cuentas suspendidas).
- **Pendiente:** ver `INFORME-REVISION.md`, sección 3 (chats de Mi Asistente y fotos de Cloudinary no se borran al eliminar la cuenta; Comunidad apagada por defecto).

---

# Mi Zona — Fase 10: Búsqueda con IA (volver a publicar servidor Y web · 2 variables nuevas OPCIONALES en el servidor)

- **Cuándo entra la IA:** el buscador común va siempre primero. La IA solo se ofrece cuando (a) la persona escribió una frase («necesito alguien que me corte el pasto»: 4 palabras o más, una pregunta o un pedido) o (b) la búsqueda común no encontró nada. Con una categoría elegida a mano no entra. La primera vez se muestra un aviso (qué hace, para qué sirve, qué sucederá) con «Usar IA» y «Ahora no». Lo aceptado queda solo en el celular y se retira con «Dejar de usar la ayuda con IA» (debajo de los resultados de IA).
- **Qué hace la IA:** solo **interpreta** el texto y devuelve filtros: tipo (negocios, oficios o alquileres), rubros, tipos y categorías de alquiler, categorías de negocio, hasta 4 palabras y una localidad si la persona la escribió. El servidor revisa todo contra las listas reales (`server/utils/busquedaIA.js`): un id inventado o un texto raro se descarta. Los **resultados salen siempre de la base de datos** (`POST /api/buscar/ia`, en `routes/buscar.js`) con las mismas reglas que la búsqueda común: fichas activas, no ocultas por el equipo, con «Aparecer en búsquedas» encendido y sin personas bloqueadas ni suspendidas. La IA no inventa resultados, precios ni disponibilidad, y no publica, no envía mensajes ni modifica datos (no tiene herramientas).
- **Qué se envía a la IA:** solo el texto de la búsqueda (máximo 200 caracteres), y antes se le sacan correos, teléfonos y enlaces. Sin nombre, sin cuenta, sin ubicación, sin chats y sin la lista de negocios. La clave de Anthropic vive solo en el servidor (`ANTHROPIC_API_KEY`, la misma de siempre).
- **Pregunta breve:** si la búsqueda es tan vaga que no se puede armar ningún filtro («algo para mi casa»), la IA hace **una** pregunta corta; la respuesta se suma al texto y se busca de nuevo (una sola vez).
- **Localidad:** si la persona la escribió («en Famaillá») manda sobre la zona elegida; si ahí no hay nada, se busca en la zona elegida y se avisa. Los negocios siguen siendo los de la zona elegida en Inicio.
- **Costo controlado:** caché de 12 horas de la interpretación (la misma consulta no vuelve a gastar), pedidos iguales a la vez comparten una sola llamada, tope por persona (20 por hora y 60 por día), tope total por día (3000) y la lista fija de rubros va marcada para el caché de prompts de Anthropic. Los resultados nunca se guardan en caché. Si la IA falla, no está configurada o se llegó a un tope, la web muestra un aviso corto y el buscador común sigue funcionando igual.
- **Variables nuevas (opcionales):** `BUSQUEDA_IA_MODELO` (por defecto el mismo modelo del buscador con asistente, `claude-sonnet-4-5`; es una tarea corta, podés probar uno más chico y comparar) y `BUSQUEDA_IA_TOPE_DIARIO` (por defecto 3000). Están en `server/.env.example`.
- **Corregido de paso:** (1) el buscador común no mandaba la sesión al servidor, así que no ocultaba lo de personas bloqueadas (Fase 8): ahora sí (`src/api.js`). (2) Una cuenta suspendida puede usar la búsqueda con IA, porque solo lee (`utils/moderacion.js`); sin eso habría recibido el cartel de suspensión.
- **Textos:** política de privacidad (`src/legal.js`, actualizada al 20 de octubre de 2026; se regenera sola en `npm run build`) y el artículo «Buscar en todo Mi Zona» del Centro de ayuda.
- **No se tocó:** la «búsqueda con asistente» de Inicio (`BusquedaAsistenteScreen` y `/api/asistente/buscar`). Esa sí envía a la IA la lista de negocios, las distancias y, si la persona lo permite, un resumen de sus chats (lo pedido en su momento). Queda pendiente decidir si se alinea con la regla de esta fase.
- **Pendiente / no incluido:** ayuda opcional para redactar la descripción de una ficha; «fecha» en la interpretación (hoy negocios, oficios y alquileres no tienen fecha: tendría sentido cuando Comunidad entre al buscador); resultados de Comunidad en la búsqueda con IA.
- **Archivos:** servidor: `utils/busquedaIA.js` (nuevo), `routes/buscar.js`, `utils/moderacion.js`, `.env.example`, `package.json`, `scripts/probar-busqueda-ia.mjs`, `scripts/probar-ruta-busqueda-ia.mjs` y `scripts/arnes-modelos-falsos.mjs` (nuevos). Web: `src/buscador.jsx`, `src/api.js`, `src/legal.js`, `src/ayudaContenido.js`.
- **Pruebas sin internet ni base de datos:** en `server/`, `npm run probar:busqueda-ia` (24 pruebas: limpieza del texto, validación de lo que contesta la IA, caché, topes, la ruta completa con modelos falsos).

---

# Mi Zona — Fase 8: Denuncias, bloqueo y moderación (volver a publicar servidor Y web · variable nueva en el SERVIDOR · una configuración única)

- **Dentro de la app:** ícono de bandera («Denunciar o bloquear») en negocios, fichas de oficios y alquiler, publicaciones de Comunidad y perfiles. 7 motivos (spam, estafa, suplantación, acoso, ofensivo/sexual, información falsa, otro con texto), advertencia antes de enviar, confirmación con código y opción de **bloquear** a quien publicó. La misma persona no puede denunciar lo mismo dos veces (ni hasta 30 días después de que se resuelva). Quien denuncia nunca se revela. Ajustes → **Usuarios bloqueados**, **Avisos del equipo** (con apelación) y **Reglas de convivencia**.
- **Bloqueo:** mutuo e invisible. Ninguno de los dos ve lo que publica el otro (negocios, oficios, alquileres, Comunidad, perfil, buscador, favoritos, búsqueda con IA) ni puede contactarlo; lo decide el servidor. La web nunca conoce la cuenta de quien publicó: manda solo el tipo y el id público.
- **Panel del equipo (fuera de la app):** `https://TU-SERVIDOR.onrender.com/api/moderacion/panel`. No está enlazado desde la app. Entra con la **clave del equipo (la misma `SOPORTE_ADMIN_KEY`) + un código de 6 cifras de tu app autenticadora**. Los intentos se frenan por IP y en total, un código sirve una sola vez y la sesión dura 30 minutos. Pestañas: Denuncias (agrupadas por lo denunciado), Apelaciones, Cuentas, Registro. Acciones: **ocultar** un contenido, **quitar foto y descripción** de un perfil, **advertir**, **suspender** (1, 3, 7, 15, 30, 90 días o permanente), **descartar**, aceptar o rechazar apelaciones y levantar suspensiones. **Cada acción queda en el Registro** (fecha, IP, a quién, motivo; se conserva 3 años).
- **Qué le pasa a la persona:** se le explica el motivo (aviso en la app + notificación si la tiene activada). Puede **apelar una vez en 30 días**; si el equipo acepta, se deshace la medida (contenido visible de nuevo, perfil devuelto, suspensión levantada). Con la cuenta **suspendida**: puede entrar, leer el motivo, apelar, descargar sus datos y eliminar su cuenta; no puede publicar, editar, contactar ni reseñar (**lo rechaza el servidor**) y lo que publicó no se muestra. La suspensión temporal termina sola.
- **Configurar una sola vez:**
  1. En tu computadora: `cd server && node scripts/generar-totp.mjs`. Imprime una clave.
  2. En tu app autenticadora (Google Authenticator, Aegis, etc.): «Agregar cuenta» → «Ingresar clave de configuración» → pegá esa clave.
  3. En Render (servidor) cargá `MODERACION_TOTP_SECRET` con esa clave y reiniciá. Asegurate de tener también `SOPORTE_ADMIN_KEY` y `JWT_SECRET`.
  4. (Opcional) `SOPORTE_AVISO_URL` ya avisa también de denuncias y apelaciones nuevas (sin datos personales).
- **Comunidad sigue apagada hasta que vos la enciendas:** ahora `COMUNIDAD_HABILITADA=true` **solo funciona si la moderación está configurada** (si no, Comunidad queda apagada y el servidor avisa en el log). Antes de encenderla, probá el panel con dos cuentas (ver «Qué probar»).
- **Rutas nuevas:** `POST /api/denuncias`, `GET /api/denuncias/mias`, `GET|POST|DELETE /api/denuncias/bloqueos`, `GET /api/moderacion/medidas`, `POST /api/moderacion/medidas/:id/{visto|apelar}`, `/api/moderacion/admin/*` y `GET /api/moderacion/panel` (equipo).
- **Archivos nuevos:** servidor: `models/{Denuncia,Bloqueo,Medida,AccionModeracion}.js`, `utils/{moderacion,exclusiones,medidas,objetosDenunciables,adminAuth,totp,panelModeracion}.js`, `routes/{denuncias,moderacion}.js`, `scripts/generar-totp.mjs`. Web: `src/denuncias.jsx`, `src/denuncias.js`.
- **Datos:** «Descargar mis datos» incluye mis denuncias, bloqueos y avisos del equipo. «Eliminar cuenta» borra mis bloqueos y avisos; mis denuncias quedan sin mi identidad hasta que se borran solas (1 año después de resolverse). Términos, política y ayuda actualizados (`LEGAL_ACTUALIZADO` = 18 de octubre de 2026; corré `npm run legales`, ya corre solo en `npm run build`).
- **Limitaciones conocidas:** el panel de consultas viejo (`/api/soporte/panel`, con la reseña reportada) sigue entrando solo con la clave, sin código. Una persona suspendida de forma permanente puede borrar su cuenta y registrarse de nuevo con otro correo. Las denuncias de reseñas siguen yendo por Soporte, como antes. La caché de cuentas suspendidas dura 30 segundos.

---

# Mi Zona — Fase 7: Comunidad (volver a publicar servidor Y web · variable nueva en el SERVIDOR)

- **Está APAGADA por defecto** (regla de la Fase 7: no se habilita al público hasta completar la Fase 8). Para PROBARLA: en el servidor (Render) poné `COMUNIDAD_HABILITADA=true` y reiniciá. Con `false` o sin la variable, la web ni muestra la tarjeta, ni el «+» ni nada, y el servidor responde 403.
- **Qué es:** fichas breves de los vecinos, **gratis**. 7 tipos: Aviso de la zona (vence en 2 a 48 horas, nombres neutros, importancia informativo/importante/urgente), Seguridad (sin fotos, sin contacto, sin teléfonos en el texto, siempre «No verificado» + «denunciálo a la policía»), Perdido o encontrado (mascotas con especie/tamaño/color/señas, hasta 3 fotos), Ayuda vecinal (necesito/ofrezco), Regalo, Deporte o actividad, Evento o feria (inicio y fin, lugar general, gratis/precio, enlace https, cancelado/reprogramado).
- **Quién ve qué:** solo las personas del **mismo departamento** que el autor (sale de la localidad de su perfil; hace falta cuenta con localidad). Filtro por localidad dentro del departamento, por tipo, por actividad (deportes) y por categoría (eventos). Eventos y deportes: vistas Hoy / Esta semana / Fin de semana (hora de Argentina) y «Ya pasaron» (historial de 60 días); orden cronológico. Avisos urgentes primero.
- **Vencimiento:** todas vencen. Estados: activa, resuelta, vencida. Las vencidas y resueltas dejan de aparecer; MongoDB las borra solo (vencimiento + 90 días, índice TTL). Cambiar la fecha de un evento lo marca «reprogramado».
- **Antispam:** máx. 5 publicaciones por día, 60 segundos de espera entre una y otra, máx. 15 activas por persona.
- **Contacto:** WhatsApp opcional (no en avisos ni seguridad); el número nunca sale en los listados: el servidor entrega el enlace al tocar el botón y solo a vecinos del departamento.
- **Autor:** edita (con «Renovar desde hoy»), marca resuelta y elimina (con confirmación) desde el detalle o **Mis fichas → Mis publicaciones**. Antes de publicar se muestra qué se publica, a quién se muestra y cuánto dura.
- **Compartir:** mantener apretada una publicación o ícono dentro de la ficha (mismo mensaje con enlace de descarga al final).
- **Búsqueda sin resultados:** botón «Publicar lo que necesitás en Comunidad» (abre «Ayuda vecinal» con el texto buscado).
- **Rutas nuevas:** `GET /api/comunidad/estado`, `GET /api/comunidad`, `GET /api/comunidad/mias`, `GET|PUT|DELETE /api/comunidad/:id`, `POST /api/comunidad`, `POST /api/comunidad/:id/{resuelta|evento|contacto}`. Descargar mis datos y Eliminar cuenta ya incluyen las publicaciones.
- **Archivos nuevos:** `server/models/Publicacion.js`, `server/utils/comunidad.js`, `server/routes/comunidad.js`, `src/comunidad.js`, `src/comunidad.jsx`.
- **Pendiente / enganches:** botón **Denunciar** y bloqueo (Fase 8: hay un comentario `ENGANCHE Fase 8` en el detalle). Recordatorios y avisos push de eventos (fase de notificaciones; hoy no se envía ninguna por publicación). Resultados de Comunidad dentro del buscador único. Ampliar a departamentos vecinos: ver propuesta en el resumen de la fase.

---

# Mi Zona — Fase 6: Buscador, favoritos y compartir (volver a publicar servidor Y web · variable nueva opcional)

- **Buscador único:** en Inicio, botón «Buscar en negocios, oficios y alquileres» (o Enter en la barra). Resultados **clasificados por tipo**, filtros manuales (tipo, categoría, zona), sugerencias al escribir, recientes (comparte la lista de la barra de Inicio) y «Ampliar la búsqueda» cuando no hay resultados. Varias palabras y plurales («sillas» encuentra «silla»). Sin IA (eso es la Fase 10). Ruta: `GET /api/buscar` (oficios y alquileres; los negocios se buscan en la lista que la web ya trae).
- **Favoritos:** ahora incluyen **oficios y alquileres** (corazón en listado y ficha) con filtros por **tipo, zona y fecha**. Se guardan en el dispositivo; `POST /api/favoritos/resolver` dice qué sigue visible: pausadas, vencidas u ocultas no se muestran y **vuelven solas** si se reactivan; las eliminadas se sacan de la lista. Sin señal se muestra lo último cargado.
- **Compartir:** ícono en cada ficha y **mantener apretada** una tarjeta (≈0,6 s). Va un texto breve + imagen si el celular lo permite + **al final el enlace de descarga**; nunca un enlace directo a la ficha (el menú «Compartir enlace» de negocios y «Invitar amigos» usan lo mismo).
- **Paso de compartir al activar** (negocio, oficio y alquiler): botón grande «Compartir Mi Zona» y «Ahora no» chico. No bloquea nada. La app solo sabe que el menú se completó, **no** que el mensaje llegó: se guarda `compartioEn` (solo la fecha). Si elige «Ahora no», en **Mis fichas** queda un recordatorio. No se ata el mes gratis ni los días por invitación a compartir (Fase 9).
- **Variable nueva (opcional, Netlify):** `VITE_MIZONA_DESCARGA_URL` = enlace de Mi Zona en Google Play. Vacía, se usa la dirección web de la app. Es distinta de `VITE_PLAY_STORE_URL` (que es de Mi Asistente).
- **Rutas nuevas:** `GET /api/buscar`, `POST /api/favoritos/resolver`, `POST /api/{businesses|oficios|alquileres}/:id/compartido` (solo el dueño).
- **Archivos nuevos:** `src/buscador.jsx`, `src/favoritosPantalla.jsx`, `src/compartir.js`, `src/favoritos.js`, `src/componentes/PasoCompartir.jsx`, `server/routes/buscar.js`, `server/routes/favoritos.js`. Favoritos pasó a ser una capa (así se abren oficios y alquileres encima).
- **Pendiente:** al abrir un negocio desde el buscador o favoritos se cierra esa pantalla (atrás vuelve al Inicio). Contadores de favoritos de oficios/alquileres y panel del dueño: Fase 9. Mi Asistente para alquileres y oficios: su fase.

---

# Mi Zona — Fase 5: Alquileres (volver a publicar servidor Y web · no hay variables nuevas)

- **Qué es:** fichas de alquiler que funcionan como el perfil de un pequeño negocio, con **artículos adentro**. Una persona puede tener hasta **5 fichas** (ej. una de eventos y otra de herramientas) además de su negocio y su ficha de oficios. Categorías: Viviendas y espacios, Cumpleaños y eventos, Herramientas y equipos, Otros (lista en `server/utils/alquileres.js` y copia en `src/alquileres.js`; se amplía agregando una línea).
- **Artículos:** nombre, foto opcional y precio opcional (por hora, día, semana, **mes** —lo agregué porque las viviendas se alquilan por mes— o «Consultar precio»). Estado de un toque: **Disponible / Ocupado / Ya no lo tengo** (este último lo oculta al público; el dueño lo sigue viendo). Se cambia desde **Mis fichas → Artículos** o desde la propia ficha («Gestionar»), sin editar el formulario. También se agregan, editan y quitan de a uno (con confirmación).
- **No afirmar lo que no está al día:** muestra «Actualizado hace X días»; un artículo «Disponible» que no se confirmó en 30 días se muestra **«Sin confirmar»**. El dueño lo renueva con «Todo sigue igual». Aviso antiestafa visible en cada ficha («No pagues por adelantado sin ver el lugar o a la persona»).
- **Viviendas:** dormitorios, baños, capacidad, amoblado y mascotas solo existen en esa categoría (el servidor los descarta en las demás). Los filtros se adaptan: dormitorios y amoblado solo aparecen al elegir Viviendas.
- **Dónde está:** Inicio → tarjeta «Alquileres» (junto a Oficios y servicios, en una sola fila) y botón **+** → «Ofrecer en alquiler». Listado con búsqueda, categoría, tipo, zona (localidad/departamento/provincia/país), carga de a 20 y último resultado guardado para mala señal. WhatsApp igual que en oficios: el número no viaja en los listados, se entrega al tocar el botón con un mensaje editable.
- **Reutilizado:** privacidad por ficha (Dueño de / Dueño: @usuario / Mostrar WhatsApp / Aparecer en búsquedas) ya incluye los alquileres; «Dueño de» en el perfil público; «Descargar mis datos» y «Eliminar cuenta» los incluyen. «Mis fichas» pasó a `src/misFichas.jsx` y muestra negocio, oficio y alquileres.
- **Enganches para las próximas fases:** compartir (Fase 6) en `PasoAlquilerActivado`; mes gratis, precio de 2000 y vencimiento (Fase 9) en `POST /api/alquileres` y en `expiresAt` (hoy vacío: no se cobra). Favoritos de alquileres y Mi Asistente quedan para sus fases.
- **Rutas nuevas:** `/api/alquileres` (listado y ficha públicos, `/mios`, crear, editar, `/estado`, `/dueno`, `/privacidad`, `/contacto`, `/confirmar`, y `/:id/articulos` con su `/estado`).

# Mi Zona — Fase 4: Oficios y servicios + correcciones de la Fase 3 (volver a publicar servidor Y web · no hay variables nuevas)

- **Corrección 1 — Selector de localidad:** ahora se elige solo **provincia → localidad**, con buscador (sin tildes ni mayúsculas) porque hay provincias con cientos. El **departamento se guarda solo**, tomado de lo que devuelve Georef para cada localidad (sirve para filtrar por departamento). Si Georef no lista localidades en un departamento (ej. comunas de CABA), el departamento aparece como opción y hace de localidad. Si hay dos localidades con el mismo nombre, se aclara su departamento. Archivos: `src/localidades.js`, `src/selectorLocalidad.jsx`, `server/utils/perfil.js`, textos de privacidad/legales.
- **Corrección 2 — Centro de privacidad:** dos interruptores nuevos **por ficha** (como «Dueño»): **Mostrar WhatsApp** (apagado: el listado público no lleva ni el número ni el botón; sigue siendo obligatorio al cargarlo) y **Aparecer en búsquedas** (apagado: no sale en listados, ni en el buscador con IA, ni en «Dueño de», ni se abre por id; el dueño la sigue viendo). Avisan al encender y al apagar; el servidor valida que sea el dueño y que el valor sea true/false. Rutas: `PUT /api/businesses/:id/privacidad` y `PUT /api/oficios/:id/privacidad`. Las fichas existentes quedan «encendidas».
- **Fase 4 — Oficios y servicios:** una ficha por persona con varios rubros (lista en `server/utils/rubros.js` y copia en `src/rubros.js`, más «Otro» propio). Datos: nombre, rubros, descripción, localidad, zona, dirección (opcional, con aviso), WhatsApp (opcional, con aviso), Instagram/Facebook/TikTok, logo, hasta 8 fotos de trabajos, días y horarios, precio orientativo, etiquetas. Listado con búsqueda, rubro y zona (localidad/departamento/provincia/país), carga de a 20 y último resultado guardado para mala señal. El **número de WhatsApp no viaja en los listados**: se entrega al tocar «Contactar» con el enlace oficial y un mensaje editable (Mi Zona no envía nada). «Disponible hoy / Ocupado» con un toque («Disponible hoy» vale solo ese día). Estados activa / pausada / vencida. **Mis fichas** (Ajustes → Mi cuenta): ver, editar, pausar y eliminar la ficha de oficios, y **editar y eliminar los negocios** (eliminar un negocio no existía en la app; avisa que no hay reembolso). Entradas: Inicio → «Oficios y servicios» y botón **+** → «Ofrecer mis servicios».
- **Enganches para las próximas fases:** compartir (Fase 6) en `PasoOficioActivado`; mes gratis, precio y vencimiento (Fase 9) en `POST /api/oficios` y en `expiresAt` (hoy vacío: no se cobra). Favoritos de oficios y Mi Asistente de oficios quedan para sus fases.
- **Corregido en fases anteriores:** el servidor ahora exige la declaración (18 años, términos, localidad) para publicar un negocio (antes solo lo hacía la pantalla); eliminar un negocio borra también sus estadísticas; el buscador con IA ya no recomienda fichas ocultas; «Eliminar cuenta» avisa que también borra la ficha de oficios y la exportación de datos la incluye.

# Mi Zona 1.1.0 — Preparada para Google Play (LEER PRIMERO · hacer `npm install` en la web y en `server/`, y volver a publicar servidor Y web)

Detalle completo en `INFORME-REVISION.md`. Guía de publicación en `play-store/`.
- **Nuevo:** botón atrás de Android (`src/atras.js`), pantalla de error con "Reintentar", modo sin conexión (`public/sw.js`, `public/offline.html`), QR generados dentro de la app (dependencia `qrcode`), íconos *maskable*, página `/eliminar-cuenta.html`, `netlify.toml`, `.env.example` de la web.
- **Corregido:** la política de privacidad pública salía sin las listas de datos y terceros; QR que se pedían a un sitio externo; errores del servidor que mostraban detalles internos; límite de `/api/eventos` falsificable; barrido de negocios vencidos en cada visita.
- **Diseño (según capturas):** el buscador de la portada no mostraba su texto de ayuda (blanco sobre blanco); insignias de ranking más legibles; textos de la portada con sombra para leerse sobre las nubes; el contenido ya no queda tapado por el botón de búsqueda (que ahora se oculta en Ajustes y Herramientas); versión 1.1.0.
- **Variables nuevas:** `VITE_SOPORTE_EMAIL` (obligatoria para Play) y `LEGAL_TITULAR` en la web; `DEBUG_AUTH=1` (opcional) en el servidor.

# Mi Zona — Ajustes → Notificaciones completo y cielo que se mueve en tiempo real (volver a publicar servidor Y web)

- **Ajustes → Notificaciones** (como en Mi Asistente): estado de este dispositivo, activar/desactivar, aviso de prueba, qué avisos recibir en el celular (agenda, suscripción, respuestas del equipo, seguridad), cartel y sonido dentro de la app, y lista de dispositivos con "Quitar". Servidor: `GET /api/push/estado`, `PUT /api/push/preferencias`, `POST /api/push/probar`; el push respeta las preferencias.
- **Portada con clima:** el sol y la luna se mueven de forma continua según la hora (sol alto al mediodía, baja y se esconde tras las montañas; la luna sube de noche y baja al amanecer). Las nubes, la lluvia y los rayos aparecen y se van de a poco (nubes ~6 min, lluvia ~4 min, tormenta ~3 min) en vez de cambiar de golpe.

# Mi Zona — Acceso corregido, color de acento global, avisos y ayuda al estilo Mi Asistente (LEER PRIMERO · volver a publicar servidor Y web)

- **Acceso:** usuario + contraseña entra al panel; correo + "Continuar" ahora abre un paso aparte y Google pide la contraseña del correo (ya no entra solo); "Acceder con Google" elige cuenta; "Registrarme" abre la lista de cuentas y, si la cuenta ya existe, avisa que inicie sesión y NO entra al panel (servidor: `POST /api/auth/google` responde 409 `cuenta_existente`). Si se escribe un correo, la cuenta elegida en Google tiene que ser ese mismo correo.
- **Apariencia:** el color elegido cambia todo lo que era azul (lupa, "Ver en el mapa", cabeceras, botón +, degradados, botones, fondos suaves).
- **Clima:** temperatura y humedad subieron a la esquina superior para que no los tapen los rubros.
- **Notificaciones:** aviso para activar las notificaciones del celular dentro del centro, cartel emergente y campana que se sacude cuando llega algo nuevo.
- **Centro de ayuda, Soporte y Acerca de:** rehechos con el formato de Mi Asistente (buscador + temas + artículos que se abren; consulta + Mis consultas; Cómo funciona + Legal).

# Mi Zona — Acerca de, Centro de ayuda y Soporte (LEER PRIMERO · volver a publicar servidor Y web)

**Qué hay:** Acerca de Mi Zona (cómo funciona, términos, política de privacidad, licencias, compartir), Centro de ayuda (34 artículos en 8 temas, buscador, "¿Te sirvió?") y Soporte (formulario con tema, "Mis consultas" con respuestas del equipo y estados). El menú lateral también abre Centro de ayuda y Soporte.

**Configurar una sola vez:**
1. **Render (servidor):** agregá `SOPORTE_ADMIN_KEY` con una clave larga. Sin esa variable nadie puede leer ni responder consultas.
2. **Leer y responder consultas:** abrí `https://TU-SERVIDOR.onrender.com/api/soporte/panel`, pegá la clave y elegí Abiertas / Respondidas. Al responder, la persona con cuenta lo ve en Soporte → Mis consultas y recibe una notificación (si las activó). Las consultas **sin cuenta** se responden por correo a la dirección que dejaron (el panel la muestra).
3. **Aviso de consulta nueva (opcional):** en `SOPORTE_AVISO_URL` poné el enlace (webhook) de un canal de Slack o Discord, o de Make/Zapier. Si no, entrá al panel de vez en cuando.
4. **Netlify (web, opcional):** `VITE_SOPORTE_EMAIL` y `VITE_SOPORTE_WHATSAPP` (solo números con código de país, ej. 5491122334455) muestran los botones de Correo y WhatsApp en Soporte. Si no los cargás, esos botones no aparecen.

**Antes de publicar:** los términos y la política (`src/legal.js`) son un texto base pensado para esta app. Pedí a un abogado o contador que los revise, completá el nombre legal/CUIT del titular si corresponde y actualizá `LEGAL_ACTUALIZADO` cuando cambien. Revisá en especial la regla de reembolsos (hoy: al eliminar la cuenta no se reembolsa el período pagado).
**Para editar la ayuda:** los artículos están en `src/ayudaContenido.js`. Si cambiás algo de la app (precios, pantallas, pasos), actualizá el artículo que lo explica.
**Servidor:** modelo `Consulta`, rutas `/api/soporte`. Las consultas se borran con la cuenta y van en "Descargar mis datos".

---

# Mi Zona — Seguridad sin repetir, Privacidad completa y Mi cuenta con datos reales (LEER PRIMERO · volver a publicar servidor Y web)

- **Seguridad:** se quitó la pantalla "Revisión de seguridad", que repetía las mismas funciones de abajo (Dispositivos y Alertas). Ahora el estado va en un cartel arriba ("Tu cuenta está al día" / "N cosas para revisar") y cada fila de abajo se marca en ámbar cuando hay algo para mirar.
- **Privacidad:** nuevo control "Guardar los negocios que vi"; "Lo que guardamos de vos" ahora incluye nombre, forma de acceso, dispositivos con notificaciones, chats ligados a la cuenta, vistos y búsquedas del dispositivo; nuevo bloque "Qué es público y qué es privado"; acciones nuevas: desactivar notificaciones en todos los dispositivos y borrar vistos y búsquedas; acceso directo a Seguridad.
- **Mi cuenta:** tarjeta con tu inicial, nombre, correo y forma de acceso; "Tu actividad en Mi Zona" (miembro desde, reseñas, favoritos, negocios) y "Tus negocios" con su estado (activo, vence en N días, esperando el pago). Cerrar sesión y Eliminar cuenta siguen igual.
- **Mi cuenta → Tu actividad en Mi Zona:** cada fila abre su subpantalla (Miembro desde, Mis reseñas, Mis favoritos, Mis negocios). Servidor: ruta nueva `GET /api/privacidad/resenas`.

---

# Mi Zona — Seguridad con subpantallas (LEER PRIMERO · volver a publicar servidor Y web)

Seguridad ahora funciona como en Google, Instagram y Mercado Pago: un menú corto y cada fila abre su propia pantalla.
- **Revisión de seguridad:** recomendaciones (dispositivos de más, alertas apagadas, notificaciones apagadas); cada una lleva a donde se resuelve.
- **Contraseña:** cambiar contraseña (cuentas con correo) o enlace a Google (cuentas con Google).
- **Alertas de inicio de sesión:** interruptor + estado de las notificaciones de este dispositivo. Manda un aviso push cuando entran desde un dispositivo nuevo o cambian la contraseña.
- **Dispositivos:** sesiones abiertas con nombre ("Chrome en Android") y último uso; cerrar una, o todas las demás.
- **Actividad reciente:** inicios de sesión y cambios de seguridad de los últimos 90 días.

**Servidor (nuevo):** modelos `Sesion` y `ActividadSeguridad`, `utils/sesiones.js`, `utils/dispositivos.js`; rutas `GET/DELETE /api/auth/sesiones`, `POST /api/auth/salir`, `GET /api/auth/actividad`, `GET/PUT /api/auth/alertas`. El token ahora lleva el id de la sesión de cada dispositivo.
Las sesiones abiertas antes de esta versión siguen funcionando; aparecen en Dispositivos la primera vez que abrís esa pantalla. "Cerrar sesión" también la borra del servidor. Al eliminar la cuenta se borran las sesiones y el historial.

# Mi Zona — cambios de diseño (LEER PRIMERO)

- Privacidad: se quitó el bloque "Seguridad".
- Formulario de negocio: el logo ahora es obligatorio (en la web y también en el servidor, `routes/suscripcion.js`).
- Tipografía: antes se pedía "Poppins" pero nunca se cargaba, por eso se veía una letra genérica. Ahora se cargan Inter (texto) y Plus Jakarta Sans (títulos) desde `index.html`; se definen en `src/index.css` (`--fuente-titulo`, `--fuente-texto`).
- Legibilidad: textos grises más oscuros y letra chica un poco más grande.
- Hay que volver a publicar la web y el servidor.

# Mi Zona — novedades de esta versión (LEER PRIMERO)

## Revisión de seguridad y nueva Privacidad (volver a publicar el servidor Y la web)

**Seguridad (servidor):**
- Puntos, canjes, actividad y chats ya no aceptan el id de cliente que manda el navegador: exigen sesión y usan el id de la cuenta (armado por el servidor). Antes, conociendo el id de otra persona se podían ver sus pedidos/puntos o canjearlos.
- `/auth/sesion-cliente` no deja adoptar un id que ya pertenece a otra cuenta (índice único nuevo en `usuarios.sesionClienteId`).
- Si alguien se registraba con el correo de otra persona (sin verificar) y la víctima después entraba con Google, el atacante conservaba su contraseña. Ahora al unir las cuentas se borra la contraseña vieja y se cierran las sesiones anteriores.
- Edición de negocios con lista blanca (`server/utils/negocios.js`): el dueño ya no puede escribir campos internos con claves tipo `suscripcion.plan` ni enlaces `javascript:`. Lo mismo al crear un negocio.
- Reseñas: el servidor arma la reseña (fecha, valoración, huella de autor); no se pueden borrar ni editar reseñas ajenas ni escribir respuestas del dueño.
- `asistenteCodigo` y `geoIntentos` ya no salen en `/api/businesses`.
- Límites de pedidos (búsqueda con IA, chat, canjes, favoritos, visitas, reseñas, login con Google), JWT fijado a HS256, CORS limitado a `FRONTEND_URL` (si está configurada), encabezados de seguridad y errores 5xx sin detalles internos.

**Privacidad (Ajustes → Privacidad):** resumen de datos, controles reales (ubicación y chats en la búsqueda, IA en la agenda, estadísticas anónimas, vistos recientes), descarga de datos (JSON), borrar agenda / reseñas / historial / notificaciones, y eliminar cuenta (pide contraseña o Google de nuevo). Rutas nuevas en `/api/privacidad`.
Las reseñas escritas antes de esta versión no tienen huella de autor: no se pueden borrar desde Privacidad.


Qué cambió: inicio de sesión con Google, suscripción por negocio (Mercado Pago), no pagar si ya pagó Mi Asistente,
notificaciones push, avisos de vencimiento, mapa con logo/nombre/dirección, "Cerrar sesión" y se eliminaron los códigos.

## A. Lo que tenés que configurar (una sola vez)

**1. Servidor de Mi Zona en Render.** El servidor (`/server`) TIENE que estar publicado en Render (Web Service) y la web de
Netlify tiene que apuntar a él con `VITE_API_URL=https://TU-SERVIDOR.onrender.com/api`. Si no está publicado, la web
no puede guardar ni cargar negocios (es la causa más probable de que no te deje cargar uno). Para verificarlo, abrí
`https://TU-SERVIDOR.onrender.com/api/businesses` en el navegador: tiene que mostrar una lista (vacía o con negocios).

**2. Variables de entorno en Render** (mirá `server/.env.example`, están todas comentadas):
`MONGODB_URI` (con I, no URL), `GOOGLE_CLIENT_ID`, `JWT_SECRET`, `ANTHROPIC_API_KEY`, `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`,
`BACKEND_URL`, `FRONTEND_URL`, `PRECIO_1_MES/3_MESES/6_MESES`, `VAPID_PUBLIC_KEY/PRIVATE_KEY/SUBJECT`,
`INTEGRACION_KEY`, `MI_ASISTENTE_API_URL`, `CRON_KEY`.

**3. Google (para que el botón funcione en Mi Zona).** Google Cloud Console → Credenciales → tu ID de cliente OAuth
(el mismo de Mi Asistente) → **Orígenes autorizados de JavaScript** → agregá la dirección de Mi Zona (la de Netlify,
y `http://localhost:5173` para probar). Sin esto Google rechaza el botón.

**4. Cobro con Google Play (Fase 9).** Mercado Pago ya no se usa. Seguí los pasos de `play-store/GUIA-PLAY-STORE.md` (9 productos, cuenta de servicio y las variables `PLAY_PACKAGE_NAME` y `PLAY_SERVICE_ACCOUNT_JSON`).

**5. Notificaciones push.** En la carpeta `server` corré `npx web-push generate-vapid-keys` (una sola vez) y pegá las dos
claves en Render (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`). Los usuarios las activan en Ajustes → Notificaciones.

**6. Que NO pague Mi Zona quien ya pagó Mi Asistente.** Poné la MISMA `INTEGRACION_KEY` en el servidor de Mi Zona y en el de
Mi Asistente (los dos en Render) y volvé a publicar Mi Asistente (se le agregó la ruta `/api/integracion/cuenta`).
Funciona por la cuenta de Google: si la persona se registró en Mi Asistente con el mismo Gmail y su suscripción está
vigente, su primer negocio en Mi Zona se publica sin cobrar, hasta el mismo vencimiento (se extiende solo cuando renueva allá).

**7. Avisos de vencimiento (Render gratis se duerme).** El servidor revisa cada 6 horas, pero solo si está despierto.
Para que siempre avise, creá un cron gratis (por ejemplo en cron-job.org) que cada día haga un POST a
`https://TU-SERVIDOR.onrender.com/api/suscripcion/revisar-vencimientos` con el header `x-cron-key: TU_CRON_KEY`.

## B. Cómo funciona ahora

- **Registro:** botón de Google → si es la primera vez, pide el nombre → se edita en Ajustes → Mi cuenta.
- **Agregar negocio:** completa el formulario → **Aceptar** → elige 1 mes ($3.000), 3 meses ($8.100) o 6 meses ($14.400) →
  paga en Mercado Pago → el negocio se publica solo al confirmarse el pago. Si no paga, queda guardado pero oculto.
- **Renovar / agregar meses:** en Herramientas → "Mi suscripción". Los meses nuevos se suman al vencimiento actual.
- **Avisos:** cartel dentro de la app y notificación push a los 7, 3 y 1 día, y al vencer. Al vencer, el negocio deja de mostrarse.
- **Mapa:** logo y nombre del negocio en su dirección; al tocarlo se ve la dirección completa. Si una dirección no se puede
  ubicar, el formulario avisa (conviene escribir calle y número).
- **Cerrar sesión:** en Ajustes (y dentro de Mi cuenta).
- **Administrador:** se eliminó por completo (contraseña, panel y rutas del servidor). Cada dueño maneja solo su negocio con su cuenta de Google.
- **Negocios cargados antes de esta versión:** quedaron sin dueño y los códigos viejos ya no sirven. Si querés conservar alguno, en MongoDB Atlas
  (Browse Collections → businesses) escribí en ese negocio el campo `ownerEmail` con el Gmail de su dueño: cuando esa persona entre con Google, el negocio pasa a su cuenta.
- **Entrar con Google y ver el negocio de antes:** al iniciar sesión, si la cuenta tiene Mi Asistente y ese asistente ya estaba conectado a un negocio de Mi Zona, el negocio pasa solo a su cuenta. Los negocios sin conexión con Mi Asistente se asignan escribiendo el campo `ownerEmail` en MongoDB Atlas (ver más abajo).
- **Chat con el asistente:** solo aparece para los clientes si el negocio tiene Mi Asistente PAGO. El servidor lo revisa cada 6 horas (y cuando el dueño entra); si vence, el chat, los puntos y el filtro "con asistente" se ocultan solos.
- **Herramientas (dueños):** panel "Mi negocio" con estado, suscripción, visitas, favoritos y reseñas, y accesos a editar datos, promociones, reseñas, historias, búsqueda de personal, QR, compartir y Mi Asistente. Los clientes solo ven favoritos, puntos, ranking y mapa.
- **Iniciar sesión / Registrarme:** una sola pantalla "Iniciar sesión". El botón **Acceder con Google** es para entrar con una cuenta que ya existe. El enlace chico azul **Registrarme** abre directo la lista de cuentas de Google para elegir (sin otro botón en el medio). Con correo: primero se escribe el correo y **recién después** aparece la contraseña; si ese correo no tiene cuenta, pide nombre y contraseña para crearla. Las contraseñas se guardan cifradas (nunca en texto) y hay límite de intentos. Las cuentas de correo no tienen el correo verificado, por eso NO se usan para reconocer negocios viejos por email ni pagos de Mi Asistente: para eso hay que entrar con Google. Si alguien se registró con correo y después entra con Google con ese mismo correo, pasa a ser la misma cuenta. Todavía no hay "olvidé mi contraseña" (haría falta un servicio para enviar correos). Registrar un negocio, dejar una reseña y chatear con el asistente piden tener cuenta.
- **Pantallas:** la cabecera (menú, buscador, zona y categorías) se ve solo en Inicio. Chats, Herramientas y Ajustes tienen una barra con flecha para volver, y cada opción (Promociones, Buscar personal, Mi código QR, Editar mis datos, Mi cuenta, Privacidad...) abre su propia subpantalla con "Volver".
- **Fotos del negocio:** el formulario tiene tres lugares: logo (una), foto de fondo del perfil (una, la elige el dueño) y fotos de productos (todas las que quiera). La foto de fondo ya no se toma de la primera foto de productos; si el dueño no eligió una, el perfil muestra el ícono de su rubro. Los negocios cargados antes de este cambio no tienen foto de fondo: el dueño la elige en Herramientas → Editar mis datos.
- **Google (ventana de cuentas):** ahora se usa la ventana oficial de Google para elegir cuenta. Si da error: (1) la dirección de Netlify tiene que estar en Google Cloud → Credenciales → tu ID de cliente → Orígenes autorizados de JavaScript (sin barra al final); (2) si la pantalla de consentimiento está en modo "Prueba", solo entran los usuarios de prueba (publicala o agregá el Gmail); (3) en Render, `GOOGLE_CLIENT_ID` tiene que ser el mismo ID que usa la web. Hay que volver a publicar el servidor (cambió `/api/auth/google` y se agregó `/api/auth/correo`).
- **Error "Wrong recipient / requiredAudience":** en Render (servicio de Mi Zona) la variable `GOOGLE_CLIENT_ID` tiene que ser EXACTAMENTE el mismo ID de cliente que usa la web (`553562775987-ovo25d12tq3fhntvj34342nk3jlg7vtc.apps.googleusercontent.com`, el mismo de Mi Asistente). Sin comillas ni espacios.
- **Error "origin_mismatch":** agregar la dirección de la web (por ejemplo `https://mi-zona1.netlify.app`) en Google Cloud → Credenciales → tu ID de cliente → Orígenes autorizados de JavaScript, sin barra al final.
- **Fotos de la agenda:** máximo 2 por día por persona (hora argentina); si la IA falla, esa foto no cuenta. Antes de subir la foto se muestra cuántas quedan y, si el negocio no tiene Mi Asistente, un botón para descargarlo. Configurá el enlace exacto en Netlify con la variable `VITE_PLAY_STORE_URL` (hasta entonces el botón abre una búsqueda en Play Store).
- **Perfil del negocio:** arriba WhatsApp (o Llamar si no usa WhatsApp) y Cómo llegar; abajo las redes (Instagram, TikTok, Facebook), de a dos; si queda una sola, ocupa todo el ancho.
- **Chats que vuelven:** los chats de cada cliente quedan ligados a su cuenta de Google. Aunque un negocio venza Mi Asistente, los chats no se borran: al renovar, reaparecen y el asistente retoma lo que ya hablaron.
- **Mapa:** se quitó de Herramientas (queda "Ver en el mapa" en Inicio). Los negocios cargados sin coordenadas se ubican solos (el servidor lo hace cada 6 horas y la web lo hace al abrir el mapa).
- **Si falla el inicio de sesión:** pedí el estado del servidor con tu clave de administrador (`SOPORTE_ADMIN_KEY`): `curl -H "x-soporte-key: TU_CLAVE" https://TU-SERVIDOR.onrender.com/api/auth/estado`. Muestra qué está configurado (sí/no, sin valores). Sin la clave la ruta responde 404, a propósito: así nadie de afuera puede ver qué servicios usa el servidor. Si `googleClientId` o `jwtSecret` dicen `false`, falta cargar esa variable en Render. Si todo dice `true`, revisá en Google Cloud que la dirección de Netlify esté en "Orígenes autorizados de JavaScript".
- **Agenda del dueño (solo para quienes tienen un negocio en su cuenta):** Herramientas → "Mi agenda". Vista Hoy, Semana y Tareas; eventos con hora, duración, persona, notas y recordatorio; tareas sugeridas según el rubro; importar desde una foto de agenda de papel o desde un mensaje (la IA propone y la persona revisa y confirma antes de guardar); "Organizar mi día" y preguntarle a la agenda. No incluye pedidos. Las funciones con IA usan `ANTHROPIC_API_KEY` y solo se habilitan si el negocio tiene la suscripción activa (tope de 40 usos por hora). La foto no se guarda: se analiza y se descarta. Opcional: `CLAUDE_MODEL_AGENDA` para cambiar el modelo.
- **Avisos de la agenda:** dentro de la app (cada minuto mientras está abierta) y por notificación al celular. Como Render gratis se duerme, para que SIEMPRE avise creá un cron (cron-job.org) que cada 5 minutos haga un POST a `https://TU-SERVIDOR.onrender.com/api/agenda/enviar-recordatorios` con el header `x-cron-key: TU_CRON_KEY`.
- **Mapa con capas (gratis):** botón de capas con Mapa (calles), Relieve (cerros, vegetación, ríos) y Satélite (fotos aéreas con nombres de calles). Solo se marcan los negocios registrados en Mi Zona. Usa mapas públicos de CARTO y Esri sin clave; si algún día tenés mucho tráfico, conviene pasar a un proveedor con clave gratuita (MapTiler, Stadia o una cuenta de Esri).
- **Búsqueda con asistente:** usa la ubicación del cliente (el navegador le pide permiso) y un resumen de sus últimos chats, salvo que los apague en Ajustes → Privacidad (el servidor lo respeta).
- **Inicio:** la portada muestra solo "Visto recientemente"; "Recién agregados" es un filtro más, junto a "Solo abiertos ahora" y los demás.
- **Ranking:** podio con los 3 primeros, filtro por categoría, puntaje, barras de comparación y explicación de cómo se calcula.

---

# Mi Zona — guía completa desde cero (MongoDB + Cloudinary)

Este proyecto ahora tiene DOS partes que hay que poner en marcha:

- **`/` (raíz del proyecto)**: la página web (frontend) — se publica en Netlify, como ya sabés.
- **`/server`**: un servidor nuevo (backend) que conecta con MongoDB — se publica en un servicio distinto (Render, gratis).

La página web le pide los datos a este servidor, y el servidor es el único que habla con MongoDB. Las fotos van directo del navegador a Cloudinary (sin pasar por el servidor).

---

## 1. Crear y configurar la cuenta de MongoDB

1. Andá a **mongodb.com/cloud/atlas/register** y creá una cuenta gratis
2. Te va a ofrecer crear un "Cluster" — elegí el plan **gratuito (M0)**
3. Elegí una región cercana (ej. São Paulo) y creá el cluster (tarda uno o dos minutos)

## 2. Crear la base de datos y el usuario de acceso

1. En el menú izquierdo, andá a **"Database Access"** → **"Add New Database User"**
   - Usuario: elegí uno, ej. `mizona-admin`
   - Contraseña: generá una y **guardala**, la vas a necesitar
   - Dale permisos de "Read and write to any database"
2. Andá a **"Network Access"** → **"Add IP Address"** → elegí **"Allow access from anywhere"** (`0.0.0.0/0`) — es necesario porque tu servidor va a estar en internet, no en tu computadora
3. Andá a **"Database"** → tocá **"Connect"** en tu cluster → **"Drivers"** → copiá la cadena de conexión, que se ve así:
   ```
   mongodb+srv://mizona-admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
4. Reemplazá `<password>` por la contraseña que generaste, y agregá el nombre de la base al final, antes del `?`:
   ```
   mongodb+srv://mizona-admin:TU_PASSWORD@cluster0.xxxxx.mongodb.net/mizona?retryWrites=true&w=majority
   ```

No hace falta crear la colección a mano — el servidor la crea sola la primera vez que guardás un negocio (se va a llamar `businesses`, dentro de la base `mizona`).

---

## 3. Crear y configurar Cloudinary (para las fotos)

1. Andá a **cloudinary.com** → creá una cuenta gratis (no pide tarjeta)
2. En el Dashboard, copiá el **"Cloud name"**
3. Andá a **Settings** (engranaje) → pestaña **"Upload"** → **"Upload presets"** → **"Add upload preset"**
4. Cambiá **"Signing Mode"** a **"Unsigned"** → Guardar
5. Copiá el nombre del preset que quedó creado

---

## 4. Variables de entorno — qué son y dónde van

Hay 3 datos "secretos/configurables" y van en 2 lugares distintos:

### En el servidor (`/server/.env`)
Copiá el archivo `server/.env.example`, renombralo a `server/.env`, y completá:
```
MONGODB_URI=mongodb+srv://mizona-admin:TU_PASSWORD@cluster0.xxxxx.mongodb.net/mizona?retryWrites=true&w=majority
PORT=5000
```

### En la página web (`src/App.jsx`)
Abrí `src/App.jsx` y completá estas dos líneas (buscalas cerca del principio del archivo):
```js
const CLOUDINARY_CLOUD_NAME = "PEGA_ACA_TU_CLOUD_NAME";
const CLOUDINARY_UPLOAD_PRESET = "PEGA_ACA_TU_UPLOAD_PRESET";
```

### En Netlify (cuando publiques)
Variable de entorno `VITE_API_URL` con la URL de tu servidor ya publicado (ver paso 10). Mientras probás en tu computadora, no hace falta tocar nada: usa `http://localhost:5000/api` por defecto.

---

## 5. Instalar las dependencias

Necesitás instalar dos proyectos por separado (uno para la web, otro para el servidor). Se hace en la terminal, parado en la carpeta correspondiente:

**Para la web (raíz del proyecto):**
```
npm install
```

**Para el servidor:**
```
cd server
npm install
```

---

## 6. Probar todo en tu computadora antes de publicar

1. Abrí una terminal en la carpeta `server` y corré:
   ```
   npm run dev
   ```
   Si ves el mensaje "✅ Conectado a MongoDB" y "🚀 Servidor corriendo en el puerto 5000", vas bien.
2. Abrí OTRA terminal (dejá la anterior abierta) en la carpeta raíz del proyecto y corré:
   ```
   npm run dev
   ```
   Te va a dar un link tipo `http://localhost:5173`

## 7. Cómo conecta todo (backend + MongoDB + Cloudinary)

- La página web (React) le pide los negocios al servidor con `fetch` a `http://localhost:5000/api/businesses` (esa dirección viene de `VITE_API_URL`)
- El servidor (Express) recibe ese pedido y usa `mongoose` para leer/escribir en tu base de MongoDB Atlas usando el `MONGODB_URI`
- Cuando agregás una foto desde el panel de administración, el navegador la sube **directo a Cloudinary** (sin pasar por tu servidor) y Cloudinary devuelve un link; ese link (texto) es lo único que se guarda en MongoDB

## 8. Cómo probar que los negocios se guardan correctamente

1. Con ambos servidores corriendo (paso 6), entrá a `http://localhost:5173`
2. Iniciá sesión con Google, tocá el botón "+" y cargá un negocio de prueba (al tocar "Empezar mi mes gratis" se publica)
3. Andá a MongoDB Atlas → tu cluster → **"Browse Collections"** → deberías ver la base `mizona` con una colección `businesses` y tu negocio adentro
4. Recargá la página de tu navegador (F5) — el negocio tiene que seguir apareciendo (si desaparece, el guardado no está funcionando)

## 9. Cómo verificar que las imágenes se suben correctamente

1. En el panel de administración, al crear/editar un negocio, subí una foto de logo o producto
2. Debería pasar de "Subiendo..." a mostrar la miniatura
3. Andá a tu cuenta de Cloudinary → **"Media Library"** — la foto debería aparecer ahí
4. En MongoDB (Atlas → Browse Collections), el negocio debería tener el campo `logo` o `photos` con un link que empieza con `https://res.cloudinary.com/...`

---

## 10. Publicar todo en Internet (para que cualquiera pueda entrar)

### Publicar el servidor (backend) en Render — gratis

1. Subí la carpeta `server` a un repositorio de GitHub (puede ser el mismo repo que ya tenés, o uno nuevo)
2. Andá a **render.com** → creá una cuenta gratis → **"New +"** → **"Web Service"**
3. Conectá tu repositorio de GitHub
4. Configurá:
   - **Root Directory**: `server` (si subiste todo el proyecto junto) o dejalo vacío si el repo es solo el server
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. En **"Environment Variables"**, agregá `MONGODB_URI` con tu cadena de conexión completa (la misma del paso 4)
6. Deploy — Render te va a dar una URL como `https://mi-zona-api.onrender.com`
7. Probá que funcione entrando a `https://mi-zona-api.onrender.com/api/businesses` en el navegador — debería mostrarte una lista (vacía al principio) en formato texto/JSON

*Nota: en el plan gratis de Render, el servidor "se duerme" después de un rato sin uso, y tarda unos segundos en despertar la próxima vez que alguien entra a la página. Es normal, no es un error.*

### Publicar la web (frontend) en Netlify

1. En Netlify, andá a tu sitio → **"Site configuration"** → **"Environment variables"** → agregá:
   - `VITE_API_URL` = `https://mi-zona-api.onrender.com/api` (la URL que te dio Render, con `/api` al final)
2. Volvé a publicar el sitio (subí de nuevo el código a GitHub, o tocá "Trigger deploy" en Netlify si no cambiaste código) para que tome la nueva variable

Con esto, cualquier persona que entre a tu link de Netlify va a estar hablando con tu servidor de Render, que guarda todo de forma real y permanente en MongoDB.

---

## Sobre la ubicación ("Más cercanos")

Ahora hay un botón explícito **"Activar ubicación"** que aparece al elegir "Más cercanos" — hay que tocarlo para que el navegador pida permiso (antes se pedía automáticamente y algunos navegadores lo bloqueaban en silencio). Si el usuario lo rechaza, aparece un botón de "Reintentar". Cada negocio muestra la distancia como "A 850 m de vos" o "A 3,2 km de vos", calculada en el momento con la ubicación real del usuario (nunca se guarda esa ubicación en ningún lado).

## Resumen de lo que cambió respecto a la versión anterior

- Se eliminó Firebase por completo (Firestore y su configuración)
- Se agregó `/server`: un backend en Node/Express que se conecta a MongoDB con `mongoose`
- La web ahora habla con ese servidor por HTTP (`fetch`), no con Firebase
- El número de WhatsApp de contacto ya está cargado: +54 381 6265332
- La subida de fotos sigue siendo con Cloudinary (no cambió)


## Cómo asignar un negocio viejo a una cuenta de Google (MongoDB Atlas)

1. Entrá a cloud.mongodb.com → tu proyecto → **Browse Collections**.
2. Elegí la base de datos de Mi Zona → colección **businesses**.
3. Buscá el negocio (por ejemplo filtrando `{ "name": "Nombre del negocio" }`) y tocá el lápiz para editarlo.
4. Agregá un campo nuevo: nombre `ownerEmail`, tipo **String**, valor el Gmail del dueño **en minúsculas**.
5. Guardá con **Update**. Cuando esa persona entre a Mi Zona con ese Gmail, el negocio aparece en su cuenta.

## Cómo publicar los cambios en Render

1. Subí el código nuevo a GitHub (el mismo repositorio de Mi Zona).
2. Render lo detecta y vuelve a publicar solo (si no, entrá al servicio → **Manual Deploy → Deploy latest commit**).
3. Mi Asistente también cambió (ruta nueva `/api/integracion/estado-asistentes`): subilo y publicalo igual.
4. Netlify: con subir a GitHub se actualiza solo la web.

- **Google (actualización):** el servidor ahora acepta siempre el ID de cliente de la web de Mi Zona, aunque `GOOGLE_CLIENT_ID` en Render esté mal cargado o vacío (igual conviene que sea el mismo ID; se pueden poner varios separados por coma). Si todavía falla, el error muestra los primeros caracteres del ID que recibió y del que esperaba.
- **Foto de fondo obligatoria:** sin ella el formulario no deja guardar (y el servidor tampoco acepta un negocio nuevo sin foto de fondo). Los negocios viejos tienen que cargarla la próxima vez que editen sus datos.
- **Cerrar sesión:** pide confirmación (Cancelar / Cerrar sesión) tanto en Ajustes como dentro de Mi cuenta.
- **Apariencia:** Claro, Oscuro o Automático (sigue el celular). Se guarda en el dispositivo. El modo oscuro invierte los colores de la pantalla y deja las fotos, el mapa y las barras azules con sus colores.
- **Seguridad:** muestra cómo entra la cuenta (Google o correo), permite cambiar la contraseña (cuentas con correo) y cerrar sesión en los demás dispositivos. Hay que volver a publicar el servidor.
- **Botón de volver:** en cada subpantalla hay uno solo ("Volver a Ajustes", "Volver a Herramientas"), grande, con ícono azul. Dentro de una subpantalla se oculta la barra de arriba, que queda solo en las listas principales (Chats, Herramientas, Ajustes).
- **Filtros del inicio:** ya no hay carrusel "Visto recientemente" ni filtro "Busca personal". Ahora hay tres filtros chicos: **Abiertos**, **Vistos** (los negocios que miraste, el último primero) y **Nuevos**, al lado del selector (Destacados, Más visitados, Descuentos, Más cercanos). "Vistos" se guarda en el celular.

## Seguridad: cambios recientes

- **Registro con correo cerrado:** `POST /api/auth/registro` ya no existe. El correo no se verificaba y cualquiera podía reservar el correo o el usuario de otra persona. Las cuentas nuevas se crean con Google (`POST /api/auth/google`) y se completan con usuario y contraseña (`PUT /api/auth/completar`). Las cuentas viejas creadas con correo siguen pudiendo entrar, y si entran con Google pasan a ser cuentas de Google (se les borra la contraseña vieja).
- **`/api/auth/estado` protegida:** pide el encabezado `x-soporte-key`. La comparación de la clave ahora es de tiempo constante (también en el panel de Soporte).
- **Límite de intentos en MongoDB:** el contador (`LimiteIntentos`) sobrevive a los reinicios del servidor y vale aunque haya varias instancias. Cada registro se borra solo al vencer su ventana. Si MongoDB no responde, se usa una cuenta en memoria de respaldo. Las visitas a negocios siguen contando en memoria (no son un dato de seguridad y no justifican una escritura por vista).
- **Correo escrito y cuenta de Google:** si la persona escribe un correo y elige otra cuenta en Google, el servidor rechaza el acceso. Es una ayuda de uso, no una barrera de seguridad: Google ya verifica quién es cada persona.


## Entrar con código al correo + elegir la ubicación en el mapa

- **Entrar con el correo:** al escribir un correo en "Usuario o correo electrónico" ya no se pide contraseña: se manda un código de 6 números a ese correo y se escribe para entrar (vence en 10 minutos, sirve una sola vez, 5 intentos, reenvío cada 45 s). Solo para cuentas que ya existen; para crear una cuenta nueva sigue siendo "Registrarme" (Google). Rutas nuevas: `POST /api/auth/codigo/enviar` y `POST /api/auth/codigo/verificar`. El código se guarda como huella (HMAC), nunca en claro.
- **Configurar el envío (obligatorio, una sola vez):** Render gratis no permite SMTP, así que se envía por API con **Brevo** (gratis, sin dominio propio): 1) creá la cuenta en brevo.com; 2) Remitentes → agregá tu correo y confirmalo; 3) SMTP y API → API Keys → creá una clave; 4) en Render (servidor de Mi Zona) cargá `BREVO_API_KEY` y `CORREO_REMITENTE` (ej.: `Mi Zona <tu-correo@gmail.com>`). Sin eso el servidor responde "No pudimos enviar el correo". Se puede usar Resend con `RESEND_API_KEY` si tenés dominio propio.
- **Cuentas viejas creadas con correo y contraseña sin verificar:** la primera vez que entran con un código, se les borra la contraseña vieja y se cierran sus sesiones anteriores (cualquiera pudo haberlas creado con el correo de otra persona). Después quedan como cuentas con correo verificado.
- **Mapa en el formulario del negocio:** debajo de "Dirección" está el botón **Elegir en el mapa**. Se mueve el pin (arrastrándolo o tocando el mapa), se puede buscar una calle o usar "mi ubicación", y con **Confirmar ubicación** la dirección se escribe sola en el campo. El negocio guarda las coordenadas exactas (no se vuelve a buscar la dirección). Funciona con el botón "atrás" de Android.
- **Sin Brevo (más simple):** se puede enviar desde tu propio Gmail con un script de Google gratis. Abrí `server/correo-apps-script.gs` y seguí los 4 pasos de los comentarios; después cargá en Render `APPS_SCRIPT_URL` y `APPS_SCRIPT_CLAVE`. Gmail gratis permite unos 100 correos por día. Si está cargado, tiene prioridad sobre Brevo.

## Mis pedidos (Herramientas → Mis pedidos)

El cliente sigue el estado de sus pedidos (Enviado → Confirmado → En preparación → Listo → Entregado). El estado lo pone el dueño desde Mi Asistente.

- **Datos:** la web pide `POST /api/asistente/mis-pedidos`; el servidor de Mi Zona consulta a Mi Asistente (`POST /api/integracion/pedidos-cliente`) con el id de cliente de la cuenta, nunca con uno que mande el navegador. Se actualiza al abrir la app, al volver a ella, cada 2 minutos y cada 30 segundos con la pantalla abierta.
- **Aviso al celular:** cuando el dueño cambia el estado, Mi Asistente llama a `POST /api/integracion/pedido-estado` (de este servidor) y se manda un push ("Tu pedido está listo", etc.). Tocar el aviso abre la app en Mis pedidos. Se puede apagar en Ajustes → Notificaciones → "Estado de tus pedidos".
- **Configuración nueva en el servidor de Mi Asistente:** `MIZONA_API_URL` = dirección del servidor de Mi Zona terminada en `/api` (ej. `https://tu-mizona.onrender.com/api`). La clave `INTEGRACION_KEY` ya existe y es la misma en los dos servidores. Sin `MIZONA_API_URL` todo funciona igual, solo que no se manda el aviso push (la campana de la app igual muestra el cambio al actualizarse).
- **Cambios en Mi Asistente:** `utils/miZona.js` (nuevo), `routes/pedidos.js` (avisa al cambiar el estado) y `routes/integracion.js` (nuevo endpoint `pedidos-cliente`). Están en `mi-asistente-pedidos.patch`.

---

## Fase 9 — Planes, mes gratis, Google Play Billing e invitaciones

**Qué hace.** Se paga SOLO por tener un negocio, un oficio o un alquiler publicados. Cada tipo tiene **1 mes gratis por cuenta** (sin tarjeta). Después, planes de **1, 3 y 6 meses** (3 meses con 10% menos, 6 meses con 20% menos), pago único que no se renueva solo. Al vencer la ficha se **oculta, no se borra**, y vuelve al renovar. Mercado Pago se eliminó.

**Precios de referencia (ARS):** negocio 3000 / 8100 / 14400 · oficio 1000 / 2700 / 4800 · alquiler 2000 / 5400 / 9600. Los precios reales de cobro se cargan en Play Console.

**Invitaciones:** quien invita gana +5 días y quien se registra con el código gana +5 (tope 60 días ganados por invitar). Se acreditan a las 72 h si la cuenta nueva completó su registro y no está suspendida; se rechazan las que vienen de la misma red o más de 10 en 24 h. Los días se usan desde "Agregar tiempo" en cada ficha. Se ajustan con `INVITACION_DIAS`, `INVITACION_DIAS_INVITADO` e `INVITACION_TOPE_DIAS`.

**Servidor:** `utils/planes.js`, `utils/playBilling.js` (verifica cada compra con Google), `utils/fichas.js`, `utils/invitaciones.js`, `utils/estadisticas.js`, modelos `Compra` e `Invitacion`, y rutas nuevas en `/api/suscripcion` (`planes`, `estado`, `iniciar`, `mes-gratis`, `compra`, `usar-dias`, `panel`).
**Web/app:** `src/suscripcion.jsx` (modal de activación, tarjeta de invitaciones, panel con estadísticas), `src/playBilling.js`, botón "Activar / Agregar tiempo" en Mis fichas y campo "Código de invitación" en el registro.

**Antes de publicar (ver `play-store/GUIA-PLAY-STORE.md`):** crear los 9 productos en Play Console, configurar `PLAY_PACKAGE_NAME` y `PLAY_SERVICE_ACCOUNT_JSON`, y probar las compras con un tester de licencia. Este código no se pudo ejecutar contra Google Play ni compilar en el entorno donde se escribió: probalo en un dispositivo antes de subirlo.


## Novedades: Inicio unificado y formularios (los sorteos de esta versión se reemplazaron en la Fase 13: ver arriba)

- **Inicio**: un selector (Negocios · Alquileres · Oficios) muestra lo elegido en la zona de Inicio. Ya no hay segundo buscador ni subpantallas de Oficios/Alquileres. Código: `src/inicio.jsx` (+ cambios en `App.jsx`).

- **Formularios** de oficios y alquileres rediseñados con `src/formKit.jsx` y horarios semanales (`src/horarios.js`, campo `weekHours` en servidor).

- **Servidor**: `?localidad=&provincia=` (por nombre) en `/oficios` y `/alquileres`; `orden=recomendados|recientes` en oficios.
