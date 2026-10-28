# Seguridad de los datos (Play Console → Contenido de la app → Seguridad de los datos)

Armado a partir de lo que el código hace hoy (Fase 11) y de las definiciones de Google: *recopilar* = enviar datos fuera del dispositivo; *compartir* = transferirlos a un tercero; **no** cuenta como compartir pasarlos a un proveedor que los procesa por tu cuenta y según tus instrucciones («proveedor de servicios»); y los datos que se procesan solo un instante y no se guardan se pueden marcar como «procesados de forma efímera».
**Verificalo vos**: Google compara tus respuestas con la app y con la política de privacidad (`/privacidad.html`), y la responsabilidad de que sean exactas es tuya. Si más adelante agregás algo que envía datos nuevos, hay que actualizar esto y la política.

## Preguntas generales
- ¿Recopila o comparte datos del usuario? **Sí**
- ¿Todos los datos se cifran en tránsito? **Sí** (todo va por HTTPS)
- ¿Ofrece una forma de solicitar que se eliminen los datos? **Sí** → en la app: Ajustes → Privacidad → Eliminar cuenta · enlace web: `https://TU-DOMINIO/eliminar-cuenta.html`
- ¿Sigue la política de Familias? **No** (la app es para mayores de 18 años)
- ¿Revisión de seguridad independiente? **No** (no la hubo; no marques que sí)

## Datos que se recopilan
| Categoría → tipo | Qué es | Para qué | ¿Se comparte? | ¿Obligatorio u opcional? |
|---|---|---|---|---|
| Información personal → Nombre | Nombre que elegís al registrarte | Funciones de la app, administración de la cuenta | No | Obligatorio |
| Información personal → Dirección de correo | Correo de Google o el que ingresás | Administración de la cuenta, seguridad, comunicaciones del desarrollador | No (Google solo confirma quién sos al entrar) | Obligatorio |
| Información personal → ID de usuario | Nombre de usuario e identificador interno | Funciones de la app, administración de la cuenta | No | Obligatorio |
| Información personal → Número de teléfono | WhatsApp de una ficha, solo si lo cargás (se entrega a quien toca «contactar») | Funciones de la app | No | Opcional |
| Información personal → Dirección | Dirección de un negocio o ficha, si la cargás | Funciones de la app | No | Opcional |
| Información personal → Otra información | Localidad elegida y declaración de ser mayor de 18 años con su fecha | Funciones de la app, cumplimiento | No | Obligatorio |
| Ubicación → Aproximada | Localidad elegida; ubicación redondeada (~5 km) para el clima | Funciones de la app | **Sí** con Open-Meteo (clima)* | Opcional |
| Ubicación → Precisa | Solo si buscás con el asistente por cercanía: se envía en ese momento para calcular distancias y **no se guarda** | Funciones de la app | No (proveedor de IA como procesador) | Opcional · **procesada de forma efímera** |
| Fotos y videos → Fotos | Foto de perfil y fotos de negocios, fichas y artículos | Funciones de la app | No (Cloudinary aloja las fotos como proveedor de servicios) | Opcional |
| Fotos y videos → Fotos de la agenda | Se envían a la IA para leerlas y se descartan | Funciones de la app | No | Opcional · **procesadas de forma efímera** |
| Mensajes → Otros mensajes en la app | Consultas a Soporte, chats con asistentes de negocios y reclamos, devoluciones y cambios a negocios (estos viven en Mi Asistente) | Funciones de la app, comunicaciones del desarrollador | No (Mi Asistente es otro servicio tuyo; revisá cómo lo declarás) | Opcional |
| Actividad en la app → Interacciones | Visitas, guardados y contactos a un negocio (estadísticas del negocio) | Analítica, funciones de la app | No | Obligatorio |
| Actividad en la app → Historial de búsqueda en la app | Texto de las búsquedas con el asistente y con la ayuda de IA (se envía al proveedor de IA; no queda asociado a tu cuenta) | Funciones de la app | No (proveedor de IA como procesador) | Opcional · **efímera** |
| Actividad en la app → Otro contenido generado por el usuario | Reseñas, fichas de oficios y alquileres, publicaciones de Comunidad*, agenda, denuncias y bloqueos | Funciones de la app | No | Opcional |
| Información financiera → Historial de compras | Producto, fecha y vencimiento de cada plan comprado en Google Play (sin datos de pago) | Funciones de la app, contabilidad | No | Opcional (solo quien compra) |
| Información y rendimiento de la app → Registros de fallos y diagnóstico | Errores de la web: mensaje, pantalla, versión y tipo de celular; sin cuenta | Analítica (corregir fallos) | No | Obligatorio (la app los envía sola) |
| Dispositivo u otros ID → ID de dispositivo u otros | Identificador de la sesión del cliente y suscripción a notificaciones | Funciones de la app, seguridad | No | Opcional (las notificaciones) |

\* **Open-Meteo**: recibe una ubicación aproximada (redondeada a ~5 km) directamente desde el celular para dar el clima. Por ser un servicio que procesa el dato para mostrarlo, podría considerarse «proveedor de servicios» y no «compartir», pero no tiene un contrato con vos: lo más prudente es **declararlo como compartido**. También reciben datos que escribís o elegís: OpenStreetMap/Nominatim y datos.gob.ar (direcciones y localidades), Esri y OpenStreetMap (mapas) y Google Fonts (dirección IP para entregar la tipografía). La IP no es un tipo de dato del formulario, pero está nombrada en la política de privacidad.
\* **Comunidad**: marcá «Otro contenido generado por el usuario» (y la foto, si permitís fotos en publicaciones) solo si encendés `COMUNIDAD_HABILITADA=true` al publicar.

## Finalidades que vas a poder tildar
Funciones de la app · Administración de la cuenta · Analítica (estadísticas de negocios y errores) · Seguridad, prevención de fraude y cumplimiento (registro de actividad, huella anónima contra cuentas repetidas, 18+) · Comunicaciones del desarrollador (Soporte y avisos). **No** marques Publicidad ni Personalización: la app no tiene anuncios ni perfiles publicitarios.

## Eliminación de datos (lo que Google te pregunta)
- **Desde la app:** sí (Ajustes → Privacidad → Eliminar cuenta). **Desde la web:** `https://TU-DOMINIO/eliminar-cuenta.html` (explica los pasos, qué se borra y qué se conserva).
- **¿Se puede pedir borrar solo una parte?** Sí: reseñas, agenda, notificaciones y fichas se pueden borrar sueltas desde la app.
- **Datos que se conservan por motivos legítimos** (los tenés que declarar): comprobantes de compra sin identidad (contabilidad y reclamos); denuncias sin identidad hasta que se borran solas (un año); registro de acciones del equipo (3 años). Todo está en `/eliminar-cuenta.html`.
- ✅ **Eliminación de datos (Fase 12):** al eliminar la cuenta, Mi Zona le pide a Mi Asistente que borre los chats y datos de cliente (pedidos, turnos y reseñas quedan sin datos personales) y borra las fotos de Cloudinary; si algún servicio no responde, se reintenta solo. Requiere CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET en el servidor de Mi Zona, y Mi Asistente actualizado.

## Otras declaraciones
- **Anuncios:** No tiene.
- **Acceso a la app (login obligatorio):** cargá un usuario y contraseña de prueba **para los revisores**, con un negocio, una ficha de oficios y un alquiler de ejemplo cargados y la suscripción activa, y explicá cómo probar el buscador con IA. Sin esto Google no puede entrar y rechaza la app.
- **Contenido generado por usuarios:** tiene reseñas, fichas y (si la encendés) Comunidad, con **denunciar y bloquear** claros, términos que se aceptan al registrarse y moderación (cumple la política de UGC).
- **Contenido generado por IA:** el buscador con IA y los chats de asistentes tienen «Reportar respuesta» dentro de la app.
- **Público objetivo:** 18+ (no marques ningún grupo de menores).
- **Funciones financieras:** «Mi app no ofrece funciones financieras» (solo vende planes con Google Play Billing).
- **ID de publicidad:** No lo usa. Al subir el `.aab`, mirá si Play Console te muestra el permiso `AD_ID`: si aparece (lo puede traer una biblioteca), declaralo como «sin publicidad» o quitalo.
