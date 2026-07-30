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
2. Tocá "Administrador", contraseña `padre`, agregá un negocio de prueba
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
