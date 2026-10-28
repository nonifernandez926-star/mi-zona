# Pedido para Mi Asistente (para pasarle a otro Claude)

**Contexto.** Hay dos proyectos conectados: **Mi Zona** (web + servidor, ya actualizado en la Fase 17) y **Mi Asistente** (`empleado-virtual-ia-actualizado-fase12.zip`). Mi Zona ya está lista de su lado; lo que sigue es todo de Mi Asistente. Trabajá **solo en Mi Asistente**, cambios mínimos y sin romper lo que ya funciona. No se pudo compilar ni probar nada en el entorno de revisión (sin internet): corré `npm install` y probá antes de entregar.

**No cambies el contrato de estas rutas, porque Mi Zona las usa:** `POST /api/chat/:codigoPublico`, `POST /api/cliente/actividad`, `GET /api/puntos/publico/:codigo`, `POST /api/puntos/mis-puntos`, `POST /api/puntos/canjear`, y en `/api/integracion/`: `cuenta`, `estado-asistentes`, `conversaciones-cliente`, `reclamos`, `reclamos/estado`, `borrar-cliente` (todas con el header `x-integracion-key` = `INTEGRACION_KEY`, que **tiene que ser idéntica en los dos servidores**).

Orden sugerido: 1 → 3 → 4 → 5 → 2 (el pago es lo más grande y necesita una decisión del dueño).

---

## 1) Aviso de «tu pedido está listo» y pantalla «Mis pedidos» de Mi Zona (falta, importante)
Mi Zona ya tiene el receptor (`POST /api/integracion/pedido-estado`) y la pantalla «Mis pedidos», que pide los datos a `POST /api/integracion/pedidos-cliente` de Mi Asistente. **En la versión fase12 esa ruta no existe y nadie llama al receptor**, así que hoy «Mis pedidos» no trae nada y no llegan avisos.

El dueño tiene tres archivos viejos de otro Claude: `miZona.js` y `mi-asistente-pedidos.patch`. El parche **no aplica completo** en fase12 (el código cambió). Hay que hacerlo a mano:

- **a)** Crear `backend/utils/miZona.js` con el contenido de `miZona.js` (función `avisarPedidoActualizado`, «mejor esfuerzo»: si falla, no frena al dueño).
- **b)** En `backend/routes/pedidos.js`, ruta `PUT /:id/estado`: importar `{ avisarPedidoActualizado }` y, **justo después de `await pedido.save();`**, agregar `if (anterior !== estado) avisarPedidoActualizado(pedido, req.negocio);` (la variable `anterior` ya existe en esa ruta).
- **c)** En `backend/routes/integracion.js`, agregar `POST /pedidos-cliente` (está en el parche, segunda parte; se puede aplicar tal cual, y la primera parte sobra porque `Pedido` ya está importado). Recibe `{ sesionClienteId }` y devuelve `{ pedidos: [{ id, negocio:{nombre,codigoPublico}, estado, items:[{producto,cantidad,precioUnitario}], total, tipoEntrega, direccionEntrega, formaPago, estadoPago, pagoVerificado, observaciones, creado, actualizado }] }`. Estados: `pendiente, confirmado, en_preparacion, listo, entregado`.
- **d)** Variable nueva en Render (y en `backend/.env.example`): `MIZONA_API_URL` = `https://mi-zona-1.onrender.com/api` (el servidor de Mi Zona, terminado en `/api`).

## 2) Sistema de pago: pasar de Mercado Pago a Google Play Billing (importante, necesita decisión)
**Hoy:** `routes/suscripcion.js` crea un link de Mercado Pago (`/crear-pago`), el panel redirige a esa página (`frontend/js/admin.js`, función de pago, `window.location.href = data.initPoint`) y un webhook acredita (`utils/firmaWebhookMP.js`, `config/mercadopago.js`). El propio informe de Mi Asistente lo marca como **riesgo alto para Play Store**. El dueño quiere que pagar sea **como en cualquier app** (la hoja de pago de Google Play, como al suscribirse a Claude).

**Referencia ya hecha en Mi Zona** (copiar el esquema, adaptándolo a Mi Asistente):
`server/utils/playBilling.js` (verifica la compra con la API de Google, la reconoce y guarda el hash del token), `server/routes/suscripcion.js`, `server/models/Compra.js` (evita acreditar dos veces la misma compra), `server/utils/planes.js` (ids de producto `mizona_<tipo>_<plan>`), y en la web `src/playBilling.js` (Digital Goods API + Payment Request API dentro de la app de Play) y `src/suscripcion.jsx`.

**Reglas a respetar:**
- Mantener los datos que Mi Zona lee: `negocio.suscripcion.estado === 'activa'` y `suscripcion.fechaVencimiento` (las usan `/integracion/cuenta` y `/integracion/estado-asistentes`; así quien ya pagó Mi Asistente no paga de nuevo en Mi Zona).
- Variables nuevas en Render: `PLAY_PACKAGE_NAME` y `PLAY_SERVICE_ACCOUNT_JSON` (JSON de la cuenta de servicio con permiso en Play Console, en una sola línea). Sin ellas el servidor no acredita nada.
- Hay que crear los productos en **Play Console** (1, 3 y 6 meses). Los precios reales se cargan ahí; los de `PRECIO_*` del `.env` quedan solo como referencia.
- Mantener `CODIGOS_OWNER` (códigos que nunca vencen, para pruebas) y el vencimiento/renovación actuales.
- En la web común (fuera de la app de Play) Google exige que no se venda por afuera lo que se consume dentro de la app. **Verificá las reglas vigentes en el Centro de ayuda de Play antes de decidir qué mostrar en la web**; no se pudo confirmar desde acá.
- Actualizar los textos que nombran Mercado Pago: `play-store/SEGURIDAD-DE-LOS-DATOS.md`, `INFORME-REVISION.md`, `README.md` y las páginas legales (`scripts/generar-legales.js`).

**Decisión pendiente del dueño (preguntársela antes de empezar):**
- **A) Pagos por meses** (1/3/6 meses que se acumulan), como hoy en Mi Zona: más simple, se compra de nuevo al vencer.
- **B) Suscripción con renovación automática**, como Claude: hay que crear *suscripciones* (no productos sueltos) en Play Console, verificar con `purchases.subscriptionsv2` y recibir los avisos de Google (renovación, cancelación, pausa) con Pub/Sub. Es más trabajo y más cosas que configurar.

## 3) Borrado de cliente: anonimizar también los reclamos (obligatorio antes de publicar)
La política de privacidad de Mi Zona dice que, al eliminar la cuenta, se le pide a Mi Asistente que quite la identidad de la persona de sus reclamos. Hoy `POST /api/integracion/borrar-cliente` anonimiza pedidos, turnos y reseñas, **pero no reclamos**. Mi Zona manda como `cliente.ref` el mismo `sesionClienteId` con el que llama a `borrar-cliente`. Agregar en esa ruta:
`Reclamo.updateMany({ 'cliente.ref': sesionClienteId }, { $set: { 'cliente.ref': '', 'cliente.usuario': 'Cliente eliminado', fotos: [] } })`
(Mi Zona ya borra los archivos de las fotos en Cloudinary; acá solo hay que quitar los enlaces.) Debe ser repetible, como el resto de esa ruta.

## 4) Botón «Registrar mi negocio en Mi Zona»
`frontend/js/config.js` tiene `MI_ZONA_URL` con un texto de ejemplo (`TU-DOMINIO-DE-MI-ZONA.com/registrar-negocio`), así que el botón no funciona. Poner la dirección real de la web de Mi Zona (por ejemplo `https://mi-zona1.netlify.app`). Ojo: Mi Zona **no usa** ni `/registrar-negocio` ni `?codigo=` (la vinculación es por la misma cuenta de Google), así que `registro.js` y `admin.js` deberían abrir la dirección sin `?codigo=` y el texto debería decir que entre con la misma cuenta de Google.

## 5) Variables de entorno de la integración (Render → Mi Asistente)
| Variable | Valor |
|---|---|
| `INTEGRACION_KEY` | La misma que en Mi Zona |
| `MIZONA_WEBHOOK_URL` | `https://mi-zona-1.onrender.com/api/integracion/reclamo-decidido` (la respuesta del dueño a un reclamo llega al instante) |
| `MIZONA_API_URL` | `https://mi-zona-1.onrender.com/api` (para el aviso de pedidos, punto 1) |

Agregar `MIZONA_API_URL` a `backend/.env.example`, que hoy no está.

## 6) Mejoras técnicas (después de lo anterior)
- Los límites de intentos (`utils/limitador.js`) viven **en la memoria del servidor**: se pierden al reiniciar y no se comparten entre instancias. Guardarlos en MongoDB (Mi Zona tiene `models/LimiteIntentos.js` y `utils/limitador.js` como ejemplo).
- Configurar `MP_WEBHOOK_SECRET` y `CRON_SECRET` mientras exista Mercado Pago (el informe de Mi Asistente lo marca).
- Actualizar `INTEGRACION-RECLAMOS.md`: ya no dice «Mi Zona todavía tiene que enviar los reclamos»; Mi Zona los envía desde la Fase 17.
- Lo que hace el dueño y no el código: monitoreo de caídas, copias de seguridad programadas de MongoDB y probar todo en celulares reales.
