// Registro de errores de la web (Fase 11). La app de Android es una TWA: corre esta web dentro de Chrome, así que Crashlytics y las herramientas
// nativas no ven sus errores. Esta pieza los manda al servidor (POST /api/errores) para verlos después: solo mensaje, pila, pantalla, versión y tipo de
// celular, nunca datos de la persona. Solo en la versión publicada, con un máximo de 5 avisos distintos por apertura de la app.
import { API_URL } from "./api.js";

const VERSION = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "";
const RUIDO = /ResizeObserver loop|^Script error\.?$|Non-Error promise rejection|Load failed|Failed to fetch|NetworkError|AbortError/i; // fallas de señal o del navegador: no son errores de la app
const vistos = new Set();

export function reportarError(error, donde = "") {
  try {
    if (!import.meta.env.PROD) return;
    const mensaje = String(error?.message || error || "").slice(0, 300);
    if (!mensaje || RUIDO.test(mensaje) || vistos.size >= 5) return;
    const clave = `${mensaje}|${donde}`;
    if (vistos.has(clave)) return;
    vistos.add(clave);
    fetch(`${API_URL}/errores`, {
      method: "POST", keepalive: true, headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mensaje, pila: String(error?.stack || "").slice(0, 900), pantalla: donde || window.location.pathname, version: VERSION, plataforma: String(navigator.userAgent || "").slice(0, 120) }),
    }).catch(() => {});
  } catch { /* un error al avisar de un error nunca debe romper la app */ }
}

export function iniciarRegistroDeErrores() {
  window.addEventListener("error", (e) => reportarError(e.error || e.message));
  window.addEventListener("unhandledrejection", (e) => reportarError(e.reason));
}
