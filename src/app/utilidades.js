// Funciones de ayuda sin pantalla: formatos de fecha, número y precio, distancias, tema claro/oscuro, geocodificación y localidades.
// (Salió de App.jsx sin cambiar su comportamiento.)
import { aplicarApariencia, guardarApariencia, leerApariencia } from "../apariencia.js";
import { avisoDeCompartir, compartirFicha } from "../compartir.js";
import { CATEGORIES, CAT_OTROS, GEOREF_API, INFO_OTROS } from "./constantes.js";

let provinciasCache = null;

const localidadesCache = {};

export async function fetchProvincias() {
  if (provinciasCache) return provinciasCache;
  try {
    const res = await fetch(`${GEOREF_API}/provincias?campos=id,nombre&orden=nombre&max=30`);
    const data = await res.json();
    provinciasCache = data.provincias.map((p) => ({ id: p.id, nombre: p.nombre }));
    return provinciasCache;
  } catch {
    return [];
  }
}

export async function fetchLocalidades(provinciaId) {
  if (localidadesCache[provinciaId]) return localidadesCache[provinciaId];
  try {
    const res = await fetch(`${GEOREF_API}/localidades?provincia=${provinciaId}&campos=id,nombre&orden=nombre&max=5000&aplanar=true`);
    const data = await res.json();
    const nombres = [...new Set(data.localidades.map((l) => l.nombre))].sort((a, b) => a.localeCompare(b, "es"));
    localidadesCache[provinciaId] = nombres;
    return nombres;
  } catch {
    return [];
  }
}

/* ---------- utilidades ---------- */

export function catInfo(id) {
  return id === CAT_OTROS ? INFO_OTROS : CATEGORIES.find((c) => c.id === id);
}

/* ---------- apariencia: claro, oscuro o automático (según el celular) ---------- */
export function getTema() { return leerApariencia().tema; }

export function aplicarTema(t) { aplicarApariencia({ ...leerApariencia(), ...(t ? { tema: t } : {}) }); }

function guardarTema(t) { guardarApariencia({ tema: t }); }

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(iso, days) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysUntil(iso) {
  if (!iso) return null;
  const target = new Date(iso + "T00:00:00");
  const now = new Date(todayISO() + "T00:00:00");
  return Math.round((target - now) / 86400000);
}

export function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("es-AR");
}

export function fmtNum(n) {
  return (n || 0).toLocaleString("es-AR");
}

export function isOpenNow(weekHours) {
  const now = new Date();
  const today = weekHours?.[now.getDay()];
  if (!today || today[0] === null || today[0] === undefined) return false;
  const [open, close] = today;
  const h = now.getHours();
  if (close === 0) return h >= open || h < 2;
  if (close > open) return h >= open && h < close;
  return h >= open || h < close;
}

export function fmtHours(range) {
  if (!range || range[0] === null || range[0] === undefined) return "Cerrado";
  const [o, c] = range;
  return `${o}:00–${c === 0 ? "00" : c}:00`;
}

export function mapsLink(loc, zone) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc + ", " + zone)}`;
}

/* ---------- compartir un negocio ---------- */

export async function shareBusiness(biz) {
  const r = await compartirFicha({ tipo: "negocio", nombre: biz.name, zona: biz.zone, detalle: biz.desc, imagen: biz.logo || biz.photos?.[0] });
  const aviso = avisoDeCompartir(r);
  if (aviso) alert(aviso);
}

/* ---------- identidad anónima del cliente en este dispositivo ---------- */
// Un identificador aleatorio y persistente por dispositivo. Es lo que liga los puntos, los canjes y los
// avisos del cliente con cada negocio (sin cuentas ni contraseñas). NUNCA se publica: no se guarda dentro
// de reseñas ni de ningún dato público del negocio.
export function randomHex(bytes = 16) {
  try {
    const arr = new Uint8Array(bytes);
    crypto.getRandomValues(arr);
    return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36) + Math.random().toString(36).slice(2);
  }
}

export function fmtPesos(n) {
  return `$${fmtNum(n)}`;
}

export function fmtFechaAR(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" });
}

// Color con transparencia: funciona con hex ("#1877F2") y con variables del color de acento ("var(--azul)")
export const tinte = (c, pct) => (String(c).startsWith("var(") ? `color-mix(in srgb, ${c} ${pct}%, transparent)` : `${c}${Math.round(pct * 2.55).toString(16).padStart(2, "0")}`);

export function fmtNotifTime(iso, soloFecha) {
  const d = new Date(iso);
  const hoy = new Date();
  const ayer = new Date(hoy); ayer.setDate(hoy.getDate() - 1);
  const hora = d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === hoy.toDateString()) return soloFecha ? "Hoy" : `Hoy · ${hora}`;
  if (d.toDateString() === ayer.toDateString()) return soloFecha ? "Ayer" : `Ayer · ${hora}`;
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" }) + (soloFecha ? "" : ` · ${hora}`);
}

export function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ---------- ubicación: geocodificar direcciones y calcular distancia ---------- */

export async function geocodeAddress(loc, zone) {
  // Primero con la zona; si no aparece, un segundo intento solo con la dirección (Nominatim es sensible al formato)
  const intentos = [`${loc}, ${zone}, Tucumán, Argentina`, `${loc}, Tucumán, Argentina`];
  for (const texto of intentos) {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ar&q=${encodeURIComponent(texto)}`);
      if (!res.ok) continue;
      const data = await res.json();
      if (data?.[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    } catch { /* probamos con el siguiente formato */ }
  }
  return null;
}

export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function fmtDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1).replace(".", ",")} km`;
}

export function soloDigitos(t) { return String(t || "").replace(/\D/g, ""); }

// Número para WhatsApp (formato Argentina: 549 + código de área + número, sin 0 ni 15)
export function numeroWhatsapp(t) {
  let d = soloDigitos(t);
  if (!d) return "";
  if (d.startsWith("54")) return d.startsWith("549") ? d : `549${d.slice(2)}`;
  if (d.startsWith("0")) d = d.slice(1);
  return `549${d}`;
}

function fmtChatTime(iso) {
  const d = new Date(iso);
  const hoy = new Date();
  const esHoy = d.toDateString() === hoy.toDateString();
  const ayer = new Date(hoy); ayer.setDate(hoy.getDate() - 1);
  const esAyer = d.toDateString() === ayer.toDateString();
  const hora = d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  if (esHoy) return `Hoy · ${hora}`;
  if (esAyer) return `Ayer · ${hora}`;
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
}

export const normalizar = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// Hora del día si es de hoy · "Ayer" · día de la semana con hora (últimos 6 días) · fecha
export function fmtChatLista(iso) {
  const d = new Date(iso);
  const hoy = new Date();
  const hora = d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === hoy.toDateString()) return hora;
  const ayer = new Date(hoy); ayer.setDate(hoy.getDate() - 1);
  if (d.toDateString() === ayer.toDateString()) return "Ayer";
  const dias = Math.floor((hoy - d) / 86400000);
  if (dias < 7) return `${d.toLocaleDateString("es-AR", { weekday: "short" }).replace(".", "").replace(/^./, (x) => x.toUpperCase())}. ${hora}`;
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
}
