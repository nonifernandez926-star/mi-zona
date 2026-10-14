# Fase 5 — Alquileres

## Implementado

- Nueva pantalla de Alquileres, accesible desde la fila de categorías de Inicio y desde el menú `+`.
- Listado conectado al backend, búsqueda por texto, categorías, filtro de localidad, filtro de dormitorios para viviendas y carga progresiva de resultados.
- Ficha de alquiler separada del perfil de usuario, con varios artículos por ficha.
- Campos de artículo: nombre, foto opcional subida a Cloudinary, precio opcional y estado `Disponible / Ocupado / Ya no lo tengo`.
- Campos de ficha: nombre, categoría, descripción, localidad, zona, dirección opcional, contacto por WhatsApp opcional, logo/foto, condiciones y datos específicos de viviendas.
- Aviso antiestafa para alquileres, especialmente viviendas. La aplicación no gestiona pagos ni reservas.
- Gestión del propietario: crear, editar, pausar, reactivar, cambiar el estado de artículos y eliminar la ficha con confirmación.
- Contacto por WhatsApp a través de un enlace generado en el servidor; el número no se incluye en los resultados públicos.
- Modelo MongoDB e índices, rutas Express, validación en servidor, autenticación para cambios y límites de solicitudes en operaciones principales.
- Acceso a “Administrar mis alquileres” desde la pantalla existente de “Mis fichas”.

## Archivos principales

- `server/models/Alquiler.js`
- `server/routes/alquileres.js`
- `server/server.js` (registro de la ruta `/api/alquileres`)
- `src/alquileres.jsx`
- `src/api.js`
- `src/App.jsx` (conexión de navegación)
- `src/oficios.jsx` (acceso desde “Mis fichas”)

## Importante antes de publicar

- Esta fase no integra todavía el cobro de alquileres. La publicación queda activa sin cobro hasta que se implemente la fase 9 de suscripciones/Google Play Billing. No debe considerarse lista para producción comercial hasta conectar esa lógica.
- No se implementan reservas ni pagos dentro de los alquileres, de acuerdo con el alcance inicial.
- La compilación de Vite no se pudo ejecutar en este entorno porque las dependencias no estaban instaladas y la instalación de paquetes agotó el tiempo disponible. Se comprobaron la sintaxis de los archivos JSX/JS editados y la sintaxis Node de las rutas/modelos, pero todavía falta ejecutar `npm ci` y `npm run build` en un entorno con acceso a los paquetes.
- Probar en un entorno de prueba con MongoDB: crear, editar, pausar, reactivar, eliminar, filtrar por localidad, subir fotos y abrir el enlace de WhatsApp.
