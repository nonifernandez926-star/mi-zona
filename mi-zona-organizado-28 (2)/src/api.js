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

// Dibuja el botón oficial de "Continuar con Google" dentro de `contenedor` y llama a `alRecibir(idToken)`.
export async function dibujarBotonGoogle(contenedor, alRecibir, { texto = "continue_with", ancho = 280 } = {}) {
  const google = await cargarGoogle();
  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: (r) => alRecibir(r.credential),
    ux_mode: "popup",
  });
  contenedor.innerHTML = "";
  google.accounts.id.renderButton(contenedor, { theme: "outline", size: "large", text: texto, shape: "pill", width: ancho });
}

/* ---------- sesión ---------- */

export async function loginConGoogle(idToken) {
  const r = await pedirJSON("/auth/google", { method: "POST", body: JSON.stringify({ idToken }) }, { "Content-Type": "application/json" });
  setToken(r.token);
  return r; // { token, usuario, nombreGoogle, requiereNombre }
}

export async function traerMiSesion() {
  if (!getToken()) return null;
  try {
    return (await getUsuarioJSON("/auth/me")).usuario;
  } catch (e) {
    if (e.status === 401) setToken(null); // sesión vencida
    return null;
  }
}

export const guardarNombre = (nombre) => enviarUsuarioJSON("/auth/perfil", "PUT", { nombre }).then((r) => r.usuario);

/* ---------- negocios propios y suscripción ---------- */

export const traerMisNegocios = () => getUsuarioJSON("/businesses/mios"); // { negocios, cobertura }
export const traerPlanes = () => pedirJSON("/suscripcion/planes", {}, {});
export const traerCobertura = () => getUsuarioJSON("/suscripcion/cobertura"); // { consultado, cubierto, hasta }
export const iniciarPago = (cuerpo) => enviarUsuarioJSON("/suscripcion/iniciar", "POST", cuerpo);

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
