# Fase 17 — qué tenés que hacer vos (Mi Zona)

Este zip agrega **reclamos, devoluciones y cambios** (ver `INFORME-REVISION.md`, sección Fase 17). Todo lo anterior sigue igual.

## 1) Variables nuevas en Mi Zona
**Ninguna es obligatoria.** Los reclamos usan las que ya tenías. Revisá que estén cargadas:

| Dónde | Variable | Valor |
|---|---|---|
| Render → servicio de Mi Zona (`mi-zona-1`) → Environment | `INTEGRACION_KEY` | La **misma** clave que tiene Mi Asistente (si difieren, la integración falla en silencio) |
| Render → Mi Zona | `MI_ASISTENTE_API_URL` | La dirección de Mi Asistente terminada en `/api` |
| Render → Mi Zona | `CLOUDINARY_API_KEY` y `CLOUDINARY_API_SECRET` | Sirven para borrar las fotos al eliminar una cuenta (ya estaban pedidas en la Fase 12) |
| Netlify → Mi Zona | (nada nuevo) | `VITE_API_URL` sigue igual |

## 2) Variable en Mi Asistente (la podés cargar ya, sin cambiar código)
En **Render → servicio de Mi Asistente → Environment**:

| Variable | Valor |
|---|---|
| `MIZONA_WEBHOOK_URL` | `https://mi-zona-1.onrender.com/api/integracion/reclamo-decidido` (cambiá el dominio si tu servidor de Mi Zona tiene otro) |

Con eso, cuando el dueño responde un reclamo, Mi Zona se entera al instante y manda la notificación. Si no la cargás, igual funciona: la respuesta aparece cuando la persona abre «Mis reclamos».

## 3) Cómo subirlo
1. Subí este proyecto a tu repositorio (reemplaza `mz/`). Render y Netlify vuelven a compilar solos.
2. Primero que termine Render (servidor), después Netlify (web).
3. En tu computadora, si querés probar antes: `cd server && npm install && npm run dev` y en otra terminal `npm install && npm run dev` en la carpeta del proyecto.

## 4) Cómo probarlo (lo ideal es con un celular)
1. Entrá a Mi Zona con una cuenta de cliente y hacé un pedido en el chat de un negocio que tenga Mi Asistente pago.
2. En Mi Asistente, el dueño cambia el pedido a «Confirmado» (el reclamo se habilita desde ese estado).
3. En Mi Zona: **Mis pedidos → ¿Hubo un problema? Hacer un reclamo** → completá y enviá.
4. En Mi Asistente el dueño lo ve en *Herramientas → Atención a tus clientes → Cambios y reclamos* y lo responde.
5. En Mi Zona tiene que llegar la notificación y verse la respuesta en **Mis reclamos**.

Importante: la fila «Cambios y reclamos» en Mi Asistente solo aparece si ese negocio está vinculado con Mi Zona. El primer reclamo lo vincula solo.

## 5) Lo que sigue siendo tuyo (Play Console y trámites)
Cuenta y pagos, usuario de prueba para los revisores, capturas de pantalla, revisión legal de los términos, `VITE_SOPORTE_EMAIL` y `LEGAL_TITULAR` para la política de privacidad, la configuración de Play Billing y el `assetlinks.json`. Detalle en `play-store/LISTA-DE-VERIFICACION.md`.

## 6) Lo que NO hice y por qué
- **No pude compilar ni correr pruebas** (sin internet): corré `npm install` y `npm run build` antes de publicar.
- **No rediseñé** detalle de negocio, Herramientas, Ajustes y chats: sin ver la web compilada es fácil romper lo que hoy funciona.
- **No toqué Mi Asistente.** Lo que le falta está en `PEDIDO-PARA-MI-ASISTENTE.md`.
