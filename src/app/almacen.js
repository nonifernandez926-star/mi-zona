// Lo que Mi Zona guarda en este celular (localStorage): búsquedas, vistos, favoritos, conversaciones, identidad anónima del cliente.
// (Salió de App.jsx sin cambiar su comportamiento.)
import { getPrivacidad } from "../api.js";
import { randomHex } from "./utilidades.js";

/* ---------- historial de búsquedas y negocios vistos recientemente (en este dispositivo) ---------- */

export function getSearchHistory() {
  try { return JSON.parse(localStorage.getItem("miZonaHistorialBusqueda") || "[]"); } catch { return []; }
}

export function addSearchHistory(q) {
  const query = q.trim();
  if (!query) return;
  const actual = getSearchHistory().filter((s) => s.toLowerCase() !== query.toLowerCase());
  localStorage.setItem("miZonaHistorialBusqueda", JSON.stringify([query, ...actual].slice(0, 8)));
}

function clearSearchHistory() {
  localStorage.removeItem("miZonaHistorialBusqueda");
}

export function getRecentlyViewed() {
  try { return JSON.parse(localStorage.getItem("miZonaVistosRecientemente") || "[]"); } catch { return []; }
}

export function addRecentlyViewed(bizId) {
  if (!getPrivacidad().guardarVistos) return; // lo apagó en Privacidad
  const actual = getRecentlyViewed().filter((id) => id !== bizId);
  localStorage.setItem("miZonaVistosRecientemente", JSON.stringify([bizId, ...actual].slice(0, 12)));
}

/* ---------- favoritos (guardados en este dispositivo) ---------- */

export function getFavorites() {
  try { return JSON.parse(localStorage.getItem("miZonaFavoritos") || "[]"); } catch { return []; }
}

export function saveFavorites(list) {
  localStorage.setItem("miZonaFavoritos", JSON.stringify(list));
}

/* ---------- chat con el asistente del negocio (memoria local del dispositivo) ---------- */

export function getConversation(bizId) {
  try { return JSON.parse(localStorage.getItem(`miZonaChat_${bizId}`) || "[]"); } catch { return []; }
}

export function saveConversation(bizId, messages) {
  localStorage.setItem(`miZonaChat_${bizId}`, JSON.stringify(messages));
}

export function getAllConversationIds() {
  const ids = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("miZonaChat_")) ids.push(key.replace("miZonaChat_", ""));
  }
  return ids;
}

export function getLastSeen(bizId) {
  return localStorage.getItem(`miZonaChatVisto_${bizId}`) || null;
}

export function setLastSeen(bizId, iso) {
  localStorage.setItem(`miZonaChatVisto_${bizId}`, iso);
}

export function countUnreadChats() {
  return getAllConversationIds().filter((id) => {
    const mensajes = getConversation(id);
    if (mensajes.length === 0) return false;
    const ultimo = mensajes[mensajes.length - 1];
    const visto = getLastSeen(id);
    return ultimo.rol === "asistente" && (!visto || new Date(ultimo.hora) > new Date(visto));
  }).length;
}

function getReviewsLastSeen(bizId) {
  return localStorage.getItem(`miZonaResenasVistas_${bizId}`) || null;
}

export function setReviewsLastSeen(bizId, iso) {
  localStorage.setItem(`miZonaResenasVistas_${bizId}`, iso);
}

export function countUnseenReviews(biz) {
  const visto = getReviewsLastSeen(biz.id);
  if (!visto) return biz.reviews?.length || 0;
  return (biz.reviews || []).filter((r) => new Date(r.date) > new Date(visto)).length;
}

let clienteIdEnMemoria = null;

export function getClienteId() {
  if (clienteIdEnMemoria) return clienteIdEnMemoria;
  try {
    let id = localStorage.getItem("miZonaClienteId");
    if (!id) {
      // si la versión anterior ya había creado un id de sesión, lo conservamos para no perder la memoria del asistente
      id = sessionStorage.getItem("miZonaSesionCliente") || "sesion-" + randomHex(16);
      localStorage.setItem("miZonaClienteId", id);
    }
    clienteIdEnMemoria = id;
  } catch {
    clienteIdEnMemoria = "sesion-" + randomHex(16); // navegador sin almacenamiento: id solo para esta visita
  }
  return clienteIdEnMemoria;
}

// Id aparte, solo para reconocer "mis" reseñas. Es DISTINTO del anterior a propósito: las reseñas son públicas
// y el id del cliente da acceso a sus puntos y canjes, así que jamás debe quedar dentro de una reseña.
export function getAutorResenasId() {
  try {
    let id = localStorage.getItem("miZonaAutorResenas");
    if (!id) { id = "autor-" + randomHex(12); localStorage.setItem("miZonaAutorResenas", id); }
    return id;
  } catch {
    return "autor-anonimo";
  }
}

// Cuando la cuenta ya tiene un id de cliente (de otro dispositivo), este dispositivo lo adopta: así el historial,
// la memoria del asistente y los puntos la siguen.
export function adoptarClienteId(id) {
  try { localStorage.setItem("miZonaClienteId", id); } catch { /* sin almacenamiento */ }
  clienteIdEnMemoria = id;
}

// Id anónimo que identifica a este cliente ante Mi Asistente (chat, puntos, canjes, avisos).
// Ahora es persistente por dispositivo (antes duraba solo la sesión del navegador).
export function sesionClienteId() {
  return getClienteId();
}
