// Conexión con el servidor de Mi Zona: sesión de Google, permisos y llamadas comunes.

// URL del backend (servidor Express + MongoDB). En desarrollo local usa localhost;
// en producción se configura con la variable de entorno VITE_API_URL (ver LEEME.md).
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Mismo ID de cliente de Google que usa Mi Asistente. Se puede cambiar con VITE_GOOGLE_CLIENT_ID.
// Ojo: la dirección de Mi Zona tiene que estar en "Orígenes autorizados de JavaScript" (ver LEEME.md).
export const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID || "553562775987-ovo25d12tq3fhntvj34342nk3jlg7vtc.apps.googleusercontent.com";

const TOKEN_KEY = "miZonaToken";

export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function setToken(t) {
  try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch { /* sin almacenamiento */ }
}

// Para las rutas de negocios: manda el permiso de la cuenta de Google (si hay sesión).
export function authHeaders(extra = {}) {
  const t = getToken();
  return t ? { ...extra, Authorization: `Bearer ${t}` } : { ...extra };
}
// Para las rutas que son SIEMPRE de la cuenta de Google (perfil, suscripción, notificaciones push).
export function userHeaders(extra = {}) {
  const t = getToken();
  return t ? { ...extra, Authorization: `Bearer ${t}` } : { ...extra };
}

async function pedirJSON(ruta, opciones, headers) {
  const res = await fetch(`${API_URL}${ruta}`, { ...opciones, headers });
  const datos = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = new Error(datos.error || datos.mensaje || "Algo salió mal. Probá de nuevo.");
    e.status = res.status;
    e.datos = datos;
    throw e;
  }
  return datos;
}
export const getUsuarioJSON = (ruta) => pedirJSON(ruta, {}, userHeaders());
export const enviarUsuarioJSON = (ruta, metodo, cuerpo) =>
  pedirJSON(ruta, { method: metodo, body: JSON.stringify(cuerpo) }, userHeaders({ "Content-Type": "application/json" }));

/* ---------- Google Identity Services ---------- */

let googleCargado = null;
export function cargarGoogle() {
  if (window.google?.accounts?.id) return Promise.resolve(window.google);
  if (googleCargado) return googleCargado;
  googleCargado = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve(window.google);
    s.onerror = () => { googleCargado = null; reject(new Error("No se pudo cargar Google. Revisá tu conexión.")); };
    document.head.appendChild(s);
  });
  return googleCargado;
}

// Abre la ventana de Google para ELEGIR la cuenta (siempre muestra las cuentas del dispositivo) y devuelve un access token.
// Tiene que llamarse directo desde un toque del usuario (si no, el navegador bloquea la ventana).
// Antes hay que haber llamado a cargarGoogle() para que el script ya esté listo.
export function pedirCuentaGoogle() {
  return new Promise((resolve, reject) => {
    const oauth2 = window.google?.accounts?.oauth2;
    if (!oauth2) { reject(new Error("Google todavía está cargando. Esperá un segundo y probá de nuevo.")); return; }
    const cliente = oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: "openid email profile",
      prompt: "select_account",
      callback: (r) => {
        if (r?.access_token) resolve(r.access_token);
        else reject(Object.assign(new Error(r?.error_description || r?.error || "No se pudo entrar con Google."), { cancelado: r?.error === "access_denied" }));
      },
      error_callback: (e) => {
        if (e?.type === "popup_closed") reject(Object.assign(new Error("cancelado"), { cancelado: true }));
        else if (e?.type === "popup_failed_to_open") reject(new Error("Tu navegador bloqueó la ventana de Google. Permití las ventanas emergentes y probá de nuevo."));
        else reject(new Error("No se pudo abrir Google. Probá de nuevo."));
      },
    });
    cliente.requestAccessToken();
  });
}

/* ---------- sesión ---------- */

export async function loginConGoogle(accessToken, modo = "registro") {
  let r;
  try {
    r = await pedirJSON("/auth/google", { method: "POST", body: JSON.stringify({ accessToken, modo }) }, { "Content-Type": "application/json" });
  } catch (e) {
    if (e.status === undefined) e.message = "No se pudo conectar con el servidor. Si estaba dormido, esperá un minuto y probá de nuevo."; // fetch falló (sin conexión, CORS o servidor caído)
    else if (e.datos?.detalle) e.message = `${e.message} (${e.datos.detalle})`;
    throw e;
  }
  setToken(r.token);
  return r; // { token, usuario, nombreGoogle, requiereNombre }
}

// Registro e ingreso con correo y contraseña (alternativa a Google)
async function accesoConCorreo(ruta, cuerpo) {
  let r;
  try {
    r = await pedirJSON(ruta, { method: "POST", body: JSON.stringify(cuerpo) }, { "Content-Type": "application/json" });
  } catch (e) {
    if (e.status === undefined) e.message = "No se pudo conectar con el servidor. Si estaba dormido, esperá un minuto y probá de nuevo.";
    throw e;
  }
  setToken(r.token);
  return r;
}
// Paso 1 del ingreso con correo: { paso: "clave" | "crear" | "google" }
export const revisarCorreo = (email) => pedirJSON("/auth/correo", { method: "POST", body: JSON.stringify({ email }) }, { "Content-Type": "application/json" });
export const registrarConCorreo = (nombre, email, password) => accesoConCorreo("/auth/registro", { nombre, email, password });
export const entrarConCorreo = (email, password) => accesoConCorreo("/auth/login", { email, password });

// Enlace para descargar Mi Asistente. Poné el link exacto en Netlify con la variable VITE_PLAY_STORE_URL.
export const PLAY_STORE_URL = import.meta.env.VITE_PLAY_STORE_URL || "https://play.google.com/store/search?q=Mi%20Asistente&c=apps";

export async function traerMiSesion() {
  if (!getToken()) return null;
  try {
    return (await getUsuarioJSON("/auth/me")).usuario;
  } catch (e) {
    if (e.status === 401) setToken(null); // sesión vencida
    return null;
  }
}

// Liga el id de cliente de este dispositivo a la cuenta (devuelve el de la cuenta si ya tenía uno) y trae sus chats
export const vincularSesionCliente = (sesionClienteId) => enviarUsuarioJSON("/auth/sesion-cliente", "POST", { sesionClienteId });
export const traerMisConversaciones = () => enviarUsuarioJSON("/asistente/mis-conversaciones", "POST", {});

export const guardarNombre = (nombre) => enviarUsuarioJSON("/auth/perfil", "PUT", { nombre }).then((r) => r.usuario);

/* ---------- negocios propios y suscripción ---------- */

export const traerMisNegocios = () => getUsuarioJSON("/businesses/mios"); // { negocios, cobertura }
export const traerPlanes = () => pedirJSON("/suscripcion/planes", {}, {});
export const traerCobertura = () => getUsuarioJSON("/suscripcion/cobertura"); // { consultado, cubierto, hasta }
export const iniciarPago = (cuerpo) => enviarUsuarioJSON("/suscripcion/iniciar", "POST", cuerpo);

/* ---------- agenda del dueño ---------- */

export const agendaApi = {
  perfil: () => getUsuarioJSON("/agenda/perfil"),
  hoy: () => getUsuarioJSON("/agenda/hoy"),
  semana: () => getUsuarioJSON("/agenda/semana"),
  tareas: () => getUsuarioJSON("/agenda/tareas"),
  crear: (datos) => enviarUsuarioJSON("/agenda", "POST", datos),
  editar: (id, datos) => enviarUsuarioJSON(`/agenda/${id}`, "PUT", datos),
  completar: (id, completada) => enviarUsuarioJSON(`/agenda/${id}/completar`, "PUT", { completada }),
  eliminar: (id) => enviarUsuarioJSON(`/agenda/${id}`, "DELETE", {}),
  recordatorios: () => getUsuarioJSON("/agenda/recordatorios"),
  interpretar: (texto) => enviarUsuarioJSON("/agenda/interpretar", "POST", { texto }),
  interpretarFoto: (imagen, mediaType) => enviarUsuarioJSON("/agenda/interpretar-foto", "POST", { imagen, mediaType }),
  guardarPropuestas: (items, origen) => enviarUsuarioJSON("/agenda/guardar-propuestas", "POST", { items, origen }),
  organizarDia: (fecha) => enviarUsuarioJSON("/agenda/organizar-dia", "POST", { fecha }),
  preguntar: (pregunta) => enviarUsuarioJSON("/agenda/preguntar", "POST", { pregunta }),
};

/* ---------- notificaciones push ---------- */

function base64AUint8(base64) {
  const relleno = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + relleno).replace(/-/g, "+").replace(/_/g, "/");
  const crudo = atob(b64);
  return Uint8Array.from([...crudo].map((c) => c.charCodeAt(0)));
}

export function pushSoportado() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

// "no-soportado" | "bloqueado" | "activo" | "inactivo"
export async function estadoPush() {
  if (!pushSoportado()) return "no-soportado";
  if (Notification.permission === "denied") return "bloqueado";
  try {
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    const sub = await reg?.pushManager.getSubscription();
    return sub && Notification.permission === "granted" ? "activo" : "inactivo";
  } catch {
    return "inactivo";
  }
}

// Debe llamarse desde un toque del usuario (los navegadores lo exigen para pedir el permiso).
export async function activarPush() {
  if (!pushSoportado()) throw new Error("Este navegador no permite notificaciones. En iPhone, primero agregá Mi Zona a la pantalla de inicio.");
  const clave = await pedirJSON("/push/clave-publica", {}, {}).catch(() => null);
  if (!clave?.publicKey) throw new Error("Las notificaciones todavía no están configuradas en el servidor.");
  const permiso = await Notification.requestPermission();
  if (permiso !== "granted") throw new Error("No diste permiso para las notificaciones. Podés habilitarlo desde la configuración del navegador.");
  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: base64AUint8(clave.publicKey),
  }));
  await enviarUsuarioJSON("/push/suscribirse", "POST", { subscription: sub.toJSON() });
}

export async function desactivarPush() {
  const reg = await navigator.serviceWorker.getRegistration("/sw.js");
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await enviarUsuarioJSON("/push/cancelar", "POST", { endpoint: sub.endpoint }).catch(() => {});
  await sub.unsubscribe();
}
