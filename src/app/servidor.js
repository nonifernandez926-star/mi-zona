// Llamadas al servidor propias de Negocios: cargar, guardar, favoritos, asistente, actividad y puntos.
// (Salió de App.jsx sin cambiar su comportamiento.)
import { API_URL, authHeaders, getPrivacidad, userHeaders } from "../api.js";
import { getClienteId } from "./almacen.js";
import { normalizeBusiness } from "./negocios.js";

/* ---------- estadísticas privadas del dueño: registro de acciones de los clientes ---------- */
// Se manda en segundo plano al servidor. El dueño ve los totales SOLO desde su panel de Mi Asistente;
// nada de esto se muestra en pantallas públicas. tipo: "visita" | "ubicacion" | "guardado" | "contacto"
export function trackEvento(bizId, tipo) {
  if (!getPrivacidad().estadisticasAnonimas) return; // lo apagó en Privacidad
  try {
    fetch(`${API_URL}/eventos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bizId, tipo, clienteId: getClienteId() }),
      keepalive: true,
    }).catch(() => {});
  } catch { /* sin conexión: no pasa nada */ }
}

/* ---------- puntos, recompensas y actividad (vía el servidor de Mi Zona → Mi Asistente) ---------- */

export async function fetchActividad() {
  const res = await fetch(`${API_URL}/asistente/cliente/actividad`, {
    method: "POST",
    headers: userHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({}), // el servidor usa el id de tu cuenta (no se manda desde acá)
  });
  if (!res.ok) throw new Error("No se pudo cargar la actividad");
  return res.json(); // { pedidos, turnos, puntos, canjes }
}

export async function fetchMisPuntos() {
  const res = await fetch(`${API_URL}/asistente/puntos/mis-puntos`, {
    method: "POST",
    headers: userHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error("No se pudieron cargar tus puntos");
  return res.json(); // { negocios: [...], canjes: [...] }
}

export async function fetchPuntosNegocio(codigoPublico) {
  const res = await fetch(`${API_URL}/asistente/puntos/negocio/${encodeURIComponent(codigoPublico)}`, { headers: userHeaders() });
  if (!res.ok) throw new Error("No se pudo cargar el programa de puntos");
  return res.json(); // { activo: false } o { activo: true, saldo, pesosPorPunto, recompensas, proxima, ... }
}

export async function canjearRecompensaApi(codigoPublico, recompensaId, claveUnica) {
  const res = await fetch(`${API_URL}/asistente/puntos/canjear`, {
    method: "POST",
    headers: userHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ codigoPublico, recompensaId, claveUnica }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.mensaje || "No se pudo completar el canje. Probá de nuevo.");
  return data; // { canje, saldo }
}

export async function loadBusinesses() {
  const res = await fetch(`${API_URL}/businesses`, { headers: authHeaders() });
  if (!res.ok) throw new Error("No se pudieron cargar los negocios");
  const list = await res.json();
  return list.map(normalizeBusiness);
}

export async function buscarConAsistente(mensaje, historial, contexto = {}) {
  const res = await fetch(`${API_URL}/asistente/buscar`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ mensaje, historial, ubicacion: contexto.ubicacion, zona: contexto.zona }),
  });
  if (!res.ok) throw new Error("No se pudo consultar al asistente");
  return res.json(); // { respuesta, negocios: [ids], resultados: [{ tipo: "negocio"|"oficio"|"alquiler", id, km?, promedio?, cantidad?, ficha? }] }
}

export async function updateBusinessOnServer(id, biz) {
  const res = await fetch(`${API_URL}/businesses/${id}`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(biz),
  });
  if (!res.ok) throw new Error("No se pudo guardar el negocio");
  return res.json();
}

export async function toggleFavoritoOnServer(id, delta) {
  try {
    await fetch(`${API_URL}/businesses/${id}/favorito`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ delta }),
    });
  } catch {
    // si falla la sincronización del contador, el favorito local igual queda guardado
  }
}
