# Mi Zona — novedades de esta versión (LEER PRIMERO)

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

**4. Mercado Pago.** Usá la misma cuenta que en Mi Asistente. En Webhooks poné
`https://TU-SERVIDOR.onrender.com/api/suscripcion/webhook` y copiá la clave secreta en `MP_WEBHOOK_SECRET`.

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
- **Iniciar sesión / Registrarme:** pantalla como la de las apps: botón de Google (Google deja elegir con qué cuenta), o correo y contraseña, y abajo un enlace chico en azul para pasar de "Iniciar sesión" a "Registrarme". Las contraseñas se guardan cifradas (nunca en texto) y hay límite de intentos. Las cuentas de correo no tienen el correo verificado, por eso NO se usan para reconocer negocios viejos por email ni pagos de Mi Asistente: para eso hay que entrar con Google. Si alguien se registró con correo y después entra con Google con ese mismo correo, pasa a ser la misma cuenta. Todavía no hay "olvidé mi contraseña" (haría falta un servicio para enviar correos). Registrar un negocio, dejar una reseña y chatear con el asistente piden tener cuenta.
- **Error "Wrong recipient / requiredAudience":** en Render (servicio de Mi Zona) la variable `GOOGLE_CLIENT_ID` tiene que ser EXACTAMENTE el mismo ID de cliente que usa la web (`553562775987-ovo25d12tq3fhntvj34342nk3jlg7vtc.apps.googleusercontent.com`, el mismo de Mi Asistente). Sin comillas ni espacios.
- **Error "origin_mismatch":** agregar la dirección de la web (por ejemplo `https://mi-zona1.netlify.app`) en Google Cloud → Credenciales → tu ID de cliente → Orígenes autorizados de JavaScript, sin barra al final.
- **Fotos de la agenda:** máximo 2 por día por persona (hora argentina); si la IA falla, esa foto no cuenta. Antes de subir la foto se muestra cuántas quedan y, si el negocio no tiene Mi Asistente, un botón para descargarlo. Configurá el enlace exacto en Netlify con la variable `VITE_PLAY_STORE_URL` (hasta entonces el botón abre una búsqueda en Play Store).
- **Perfil del negocio:** arriba WhatsApp (o Llamar si no usa WhatsApp) y Cómo llegar; abajo las redes (Instagram, TikTok, Facebook), de a dos; si queda una sola, ocupa todo el ancho.
- **Chats que vuelven:** los chats de cada cliente quedan ligados a su cuenta de Google. Aunque un negocio venza Mi Asistente, los chats no se borran: al renovar, reaparecen y el asistente retoma lo que ya hablaron.
- **Mapa:** se quitó de Herramientas (queda "Ver en el mapa" en Inicio). Los negocios cargados sin coordenadas se ubican solos (el servidor lo hace cada 6 horas y la web lo hace al abrir el mapa).
- **Si falla el inicio de sesión:** abrí `https://TU-SERVIDOR.onrender.com/api/auth/estado` en el navegador. Muestra qué está configurado (sí/no, sin valores). Si `googleClientId` o `jwtSecret` dicen `false`, falta cargar esa variable en Render. Si todo dice `true`, revisá en Google Cloud que la dirección de Netlify esté en "Orígenes autorizados de JavaScript".
- **Agenda del dueño (solo para quienes tienen un negocio en su cuenta):** Herramientas → "Mi agenda". Vista Hoy, Semana y Tareas; eventos con hora, duración, persona, notas y recordatorio; tareas sugeridas según el rubro; importar desde una foto de agenda de papel o desde un mensaje (la IA propone y la persona revisa y confirma antes de guardar); "Organizar mi día" y preguntarle a la agenda. No incluye pedidos. Las funciones con IA usan `ANTHROPIC_API_KEY` y solo se habilitan si el negocio tiene la suscripción activa (tope de 40 usos por hora). La foto no se guarda: se analiza y se descarta. Opcional: `CLAUDE_MODEL_AGENDA` para cambiar el modelo.
- **Avisos de la agenda:** dentro de la app (cada minuto mientras está abierta) y por notificación al celular. Como Render gratis se duerme, para que SIEMPRE avise creá un cron (cron-job.org) que cada 5 minutos haga un POST a `https://TU-SERVIDOR.onrender.com/api/agenda/enviar-recordatorios` con el header `x-cron-key: TU_CRON_KEY`.
- **Mapa con capas (gratis):** botón de capas con Mapa (calles), Relieve (cerros, vegetación, ríos) y Satélite (fotos aéreas con nombres de calles). Solo se marcan los negocios registrados en Mi Zona. Usa mapas públicos de CARTO y Esri sin clave; si algún día tenés mucho tráfico, conviene pasar a un proveedor con clave gratuita (MapTiler, Stadia o una cuenta de Esri).
- **Búsqueda con asistente:** usa siempre la ubicación del cliente (el navegador le pide permiso) y sus últimos chats; no hay botón para desactivarla.
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
2. Iniciá sesión con Google, tocá el botón "+" y cargá un negocio de prueba (al pagar con Mercado Pago se publica)
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
