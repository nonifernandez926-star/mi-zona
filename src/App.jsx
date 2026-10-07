import { useState, useMemo, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Search, MapPin, Instagram, Clock, Eye, Plus, X, Lock, ShieldCheck,
  ChevronDown, MessageCircle, Grid3x3, Star, Pencil, Trash2, Power,
  RefreshCw, ImageIcon, LogOut, UtensilsCrossed, Wrench, Shirt, Sparkles,
  Home, Laptop, GraduationCap, Dog, Car, Tractor, PartyPopper, Building2,
  Palmtree, Dumbbell, Pill, Truck, Check, Hammer, ShoppingCart, Beef, Apple,
  Croissant, Droplet, Printer, KeyRound, Scissors, Package, Gift, HardHat,
  Baby, Church, Tag, Navigation, User, LocateFixed, Briefcase,
  Heart, Share2, Send, Mail, Settings, Menu, Bell, QrCode, Download, TrendingUp, Trophy,
  Sun, Moon, Smartphone, Coins, Ticket, List, Map as MapIcon, Minus, CheckCheck, CalendarCheck, BellOff, Crown, Medal, Phone, Layers, Facebook, Music2, Megaphone, Store, Info, BookOpen, Flag, EyeOff,
} from "lucide-react";
import {
  API_URL, authHeaders, userHeaders, setToken, traerMiSesion, getPrivacidad, setPrivacidadLocal, privacidadApi,
  traerMisNegocios, traerCobertura, iniciarPago, desactivarPush, seguridadApi, vincularSesionCliente, traerMisConversaciones, soporteApi,
} from "./api.js";
import { AgendaScreen, RecordatoriosToast, useRecordatoriosAgenda } from "./agenda.jsx";
import { PrivacidadScreen } from "./privacidad.jsx";
import { PantallaBienvenida, PantallaCrearUsuario } from "./bienvenida.jsx";
import { AcercaScreen, AyudaScreen, SoporteScreen } from "./ayuda.jsx";
import {
  LoginModal, NombreModal, MiCuentaScreen, NotificacionesPushScreen, SeguridadScreen, BotonVolver, BotonAtras,
  PlanesModal, TarjetaSuscripcion, infoSuscripcion,
} from "./cuenta.jsx";


const CATEGORIES = [
  { id: "comida", label: "Gastronomía", icon: UtensilsCrossed, color: "#C1443A", quick: true },
  { id: "salud", label: "Salud", icon: Pill, color: "#2C6E8A", quick: true },
  { id: "servicios", label: "Servicios", icon: Wrench, color: "#0B1437", quick: true },
  { id: "hogar", label: "Hogar", icon: Home, color: "#3C8558", quick: true },
  { id: "moda", label: "Moda y retail", icon: Shirt, color: "#7A4F9E", quick: true },
  { id: "automotor", label: "Automotor", icon: Car, color: "#4A5568", quick: false },
  { id: "belleza", label: "Belleza y estética", icon: Sparkles, color: "#B8703F", quick: false },
  { id: "mascotas", label: "Mascotas y veterinaria", icon: Dog, color: "#B0793A", quick: false },
  { id: "tecnologia", label: "Tecnología", icon: Laptop, color: "#2C6E8A", quick: false },
  { id: "educacion", label: "Educación", icon: GraduationCap, color: "#8A7A2E", quick: false },
  { id: "agro", label: "Agro e insumos rurales", icon: Tractor, color: "#5A7A3C", quick: false },
  { id: "eventos", label: "Eventos y fiestas", icon: PartyPopper, color: "#A6437A", quick: false },
  { id: "inmobiliaria", label: "Inmobiliaria", icon: Building2, color: "#3B5266", quick: false },
  { id: "turismo", label: "Turismo y alojamiento", icon: Palmtree, color: "#2350F5", quick: false },
  { id: "deportes", label: "Deportes y recreación", icon: Dumbbell, color: "#C1443A", quick: false },
  { id: "talleres", label: "Talleres y reparaciones", icon: Hammer, color: "#4A5568", quick: false },
  { id: "almacenes", label: "Almacenes y supermercados", icon: ShoppingCart, color: "#3C8558", quick: false },
  { id: "carnicerias", label: "Carnicerías y pollerías", icon: Beef, color: "#B23A2E", quick: false },
  { id: "verduleria", label: "Frutas y verduras", icon: Apple, color: "#5A8A3C", quick: false },
  { id: "farmacia", label: "Farmacias y perfumerías", icon: Pill, color: "#3B7A9E", quick: false },
  { id: "panaderia", label: "Panaderías y repostería", icon: Croissant, color: "#B8763A", quick: false },
  { id: "limpieza", label: "Limpieza y lavandería", icon: Droplet, color: "#2C8AA6", quick: false },
  { id: "imprenta", label: "Imprenta y gráfica", icon: Printer, color: "#5B5F6B", quick: false },
  { id: "cerrajeria", label: "Cerrajería", icon: KeyRound, color: "#8A7A2E", quick: false },
  { id: "barberias", label: "Barberías", icon: Scissors, color: "#0B1437", quick: false },
  { id: "mayoristas", label: "Mayoristas y distribuidores", icon: Package, color: "#4A5568", quick: false },
  { id: "florerias", label: "Florerías y regalos", icon: Gift, color: "#A6437A", quick: false },
  { id: "ferreterias", label: "Ferreterías y materiales", icon: HardHat, color: "#B8703F", quick: false },
  { id: "bebes", label: "Bebés y niños", icon: Baby, color: "#7A9EB8", quick: false },
  { id: "religion", label: "Religión y artículos religiosos", icon: Church, color: "#6E5A8A", quick: false },
];
const QUICK_CATEGORIES = CATEGORIES.filter((c) => c.quick);

// Preguntas específicas según el rubro elegido, para el formulario de alta de negocio.
// Los rubros más comunes tienen preguntas propias; el resto usa un set genérico.
const CATEGORY_QUESTIONS = {
  comida: [
    { key: "opcionesVeg", label: "¿Tenés opciones vegetarianas o veganas?", type: "bool" },
    { key: "aptoCeliaco", label: "¿Tenés opciones aptas para celíacos?", type: "bool" },
    { key: "reservas", label: "¿Se puede reservar mesa?", type: "bool" },
    { key: "tiempoEntrega", label: "Tiempo estimado de entrega/espera", type: "text", placeholder: "Ej: 30-40 minutos" },
  ],
  salud: [
    { key: "obraSocial", label: "¿Atendés obras sociales o prepagas?", type: "text", placeholder: "Ej: OSDE, Swiss Medical, PAMI..." },
    { key: "turnoOnline", label: "¿Se puede sacar turno online o por teléfono?", type: "bool" },
    { key: "urgencias", label: "¿Atendés urgencias?", type: "bool" },
    { key: "matricula", label: "N° de matrícula profesional (opcional)", type: "text", placeholder: "Ej: MP 12345" },
  ],
  servicios: [
    { key: "presupuestoSinCargo", label: "¿El presupuesto es sin cargo?", type: "bool" },
    { key: "vaDomicilio", label: "¿Vas al domicilio del cliente?", type: "bool" },
    { key: "garantia", label: "¿Ofrecés garantía sobre el trabajo?", type: "text", placeholder: "Ej: 30 días" },
    { key: "zonaCobertura", label: "Zona de cobertura", type: "text", placeholder: "Ej: toda la provincia, solo capital..." },
  ],
  hogar: [
    { key: "envioInstalacion", label: "¿El envío incluye instalación/armado?", type: "bool" },
    { key: "financiacion", label: "¿Ofrecés financiación o cuotas?", type: "bool" },
    { key: "marcas", label: "Marcas o rubros principales", type: "text", placeholder: "Ej: electrodomésticos, muebles, decoración" },
  ],
  moda: [
    { key: "talles", label: "Rango de talles disponibles", type: "text", placeholder: "Ej: S al XXL" },
    { key: "probador", label: "¿Tenés probador en el local?", type: "bool" },
    { key: "cambios", label: "Política de cambios y devoluciones", type: "text", placeholder: "Ej: cambios dentro de 10 días con ticket" },
  ],
};
const DEFAULT_QUESTIONS = [
  { key: "atencionPersonalizada", label: "¿Ofrecés atención personalizada o a medida?", type: "bool" },
  { key: "zonaCobertura", label: "Zona de cobertura o alcance", type: "text", placeholder: "Ej: toda la provincia, solo capital..." },
];

// Lista de respaldo (por si la API de Georef no responde). Las provincias y localidades
// reales de todo el país se obtienen en vivo desde la API oficial del Gobierno argentino.
const ZONES = [
  "San Miguel de Tucumán, Tucumán", "Yerba Buena, Tucumán", "Tafí Viejo, Tucumán",
  "Concepción, Tucumán", "Banda del Río Salí, Tucumán", "Aguilares, Tucumán",
];

const GEOREF_API = "https://apis.datos.gob.ar/georef/api";

// TODO: reemplazar por la URL real donde está publicado Mi Asistente
const MI_ASISTENTE_URL = "https://nonifernandez926-star.github.io/empleado-virtual-ia/registro.html";
// Panel de administración de Mi Asistente (misma web que el registro, pero admin.html)
const MI_ASISTENTE_ADMIN_URL = MI_ASISTENTE_URL.replace("registro.html", "admin.html");
let provinciasCache = null;
const localidadesCache = {};

async function fetchProvincias() {
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

async function fetchLocalidades(provinciaId) {
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

const PAYMENT_METHODS = ["Efectivo", "Tarjeta de débito", "Tarjeta de crédito", "Transferencia", "Mercado Pago"];
const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

/* ---------- utilidades ---------- */

function catInfo(id) {
  return CATEGORIES.find((c) => c.id === id);
}
/* ---------- apariencia: claro, oscuro o automático (según el celular) ---------- */
const TEMA_KEY = "miZonaTema";
function getTema() { try { return localStorage.getItem(TEMA_KEY) || "auto"; } catch { return "auto"; } }
function aplicarTema(t) {
  const oscuro = t === "oscuro" || (t === "auto" && !!window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("tema-oscuro", oscuro);
}
function guardarTema(t) { try { localStorage.setItem(TEMA_KEY, t); } catch { /* sin almacenamiento */ } aplicarTema(t); }

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function addDays(iso, days) {
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
function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("es-AR");
}
function fmtNum(n) {
  return (n || 0).toLocaleString("es-AR");
}
function isOpenNow(weekHours) {
  const now = new Date();
  const today = weekHours?.[now.getDay()];
  if (!today || today[0] === null || today[0] === undefined) return false;
  const [open, close] = today;
  const h = now.getHours();
  if (close === 0) return h >= open || h < 2;
  if (close > open) return h >= open && h < close;
  return h >= open || h < close;
}
function fmtHours(range) {
  if (!range || range[0] === null || range[0] === undefined) return "Cerrado";
  const [o, c] = range;
  return `${o}:00–${c === 0 ? "00" : c}:00`;
}
function busquedaEmpleoActiva(biz) {
  const b = biz.busquedaEmpleo;
  if (!b || !b.puesto) return false;
  if (!b.fechaFin) return true;
  return new Date() <= new Date(b.fechaFin);
}
function historiasActivas(biz) {
  const hace24h = Date.now() - 24 * 60 * 60 * 1000;
  return (biz.historias || []).filter((h) => new Date(h.subidaEn).getTime() > hace24h);
}

/* ---------- historial de búsquedas y negocios vistos recientemente (en este dispositivo) ---------- */

function getSearchHistory() {
  try { return JSON.parse(localStorage.getItem("miZonaHistorialBusqueda") || "[]"); } catch { return []; }
}
function addSearchHistory(q) {
  const query = q.trim();
  if (!query) return;
  const actual = getSearchHistory().filter((s) => s.toLowerCase() !== query.toLowerCase());
  localStorage.setItem("miZonaHistorialBusqueda", JSON.stringify([query, ...actual].slice(0, 8)));
}
function clearSearchHistory() {
  localStorage.removeItem("miZonaHistorialBusqueda");
}

function getRecentlyViewed() {
  try { return JSON.parse(localStorage.getItem("miZonaVistosRecientemente") || "[]"); } catch { return []; }
}
function addRecentlyViewed(bizId) {
  if (!getPrivacidad().guardarVistos) return; // lo apagó en Privacidad
  const actual = getRecentlyViewed().filter((id) => id !== bizId);
  localStorage.setItem("miZonaVistosRecientemente", JSON.stringify([bizId, ...actual].slice(0, 12)));
}

function avgRating(reviews) {
  if (!reviews || reviews.length === 0) return null;
  return (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);
}

/* ---------- ranking de negocios (Top) ---------- */
// Puntaje combinando vistas, reseñas y valoración. El peso de "guardado en favoritos"
// se suma cuando el negocio tenga el contador vecesFavorito sincronizado con el servidor.
function rankingScore(biz) {
  const vistas = biz.views || 0;
  const cantReviews = biz.reviews?.length || 0;
  const rating = avgRating(biz.reviews) ? parseFloat(avgRating(biz.reviews)) : 0;
  const vecesFavorito = biz.vecesFavorito || 0;
  return vistas * 0.3 + cantReviews * rating * 0.5 + vecesFavorito * 2;
}
function rankedBusinesses(businesses) {
  return [...businesses]
    .filter((b) => b.kind !== "job" && b.status === "active")
    .sort((a, b) => rankingScore(b) - rankingScore(a));
}
// Posición de un negocio puntual dentro del Top 10 de su propia zona (o null si no entra)
function businessRankPosition(biz, allBusinesses) {
  const ranking = rankedBusinesses(allBusinesses.filter((b) => b.zone === biz.zone));
  const idx = ranking.findIndex((b) => b.id === biz.id);
  return idx >= 0 && idx < 10 ? idx + 1 : null;
}

function mapsLink(loc, zone) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc + ", " + zone)}`;
}

/* ---------- favoritos (guardados en este dispositivo) ---------- */

function getFavorites() {
  try { return JSON.parse(localStorage.getItem("miZonaFavoritos") || "[]"); } catch { return []; }
}
function saveFavorites(list) {
  localStorage.setItem("miZonaFavoritos", JSON.stringify(list));
}

/* ---------- compartir un negocio ---------- */

async function shareBusiness(biz) {
  const url = `${window.location.origin}${window.location.pathname}?negocio=${biz.id}`;
  const data = { title: biz.name, text: `Mirá ${biz.name} en Mi Zona`, url };
  if (navigator.share) {
    try { await navigator.share(data); return; } catch { /* el usuario canceló */ }
  }
  try {
    await navigator.clipboard.writeText(url);
    alert("Enlace copiado al portapapeles");
  } catch { /* nada más que hacer */ }
}

/* ---------- chat con el asistente del negocio (memoria local del dispositivo) ---------- */

function getConversation(bizId) {
  try { return JSON.parse(localStorage.getItem(`miZonaChat_${bizId}`) || "[]"); } catch { return []; }
}
function saveConversation(bizId, messages) {
  localStorage.setItem(`miZonaChat_${bizId}`, JSON.stringify(messages));
}
function getAllConversationIds() {
  const ids = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("miZonaChat_")) ids.push(key.replace("miZonaChat_", ""));
  }
  return ids;
}
function getLastSeen(bizId) {
  return localStorage.getItem(`miZonaChatVisto_${bizId}`) || null;
}
function setLastSeen(bizId, iso) {
  localStorage.setItem(`miZonaChatVisto_${bizId}`, iso);
}
function countUnreadChats() {
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
function setReviewsLastSeen(bizId, iso) {
  localStorage.setItem(`miZonaResenasVistas_${bizId}`, iso);
}
function countUnseenReviews(biz) {
  const visto = getReviewsLastSeen(biz.id);
  if (!visto) return biz.reviews?.length || 0;
  return (biz.reviews || []).filter((r) => new Date(r.date) > new Date(visto)).length;
}

/* ---------- identidad anónima del cliente en este dispositivo ---------- */
// Un identificador aleatorio y persistente por dispositivo. Es lo que liga los puntos, los canjes y los
// avisos del cliente con cada negocio (sin cuentas ni contraseñas). NUNCA se publica: no se guarda dentro
// de reseñas ni de ningún dato público del negocio.
function randomHex(bytes = 16) {
  try {
    const arr = new Uint8Array(bytes);
    crypto.getRandomValues(arr);
    return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36) + Math.random().toString(36).slice(2);
  }
}
let clienteIdEnMemoria = null;
function getClienteId() {
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
function getAutorResenasId() {
  try {
    let id = localStorage.getItem("miZonaAutorResenas");
    if (!id) { id = "autor-" + randomHex(12); localStorage.setItem("miZonaAutorResenas", id); }
    return id;
  } catch {
    return "autor-anonimo";
  }
}

/* ---------- negocios nuevos ---------- */

const NUEVO_DIAS = 30; // un negocio es "nuevo en Mi Zona" durante sus primeros 30 días
function esNegocioNuevo(biz) {
  if (!biz.createdAt) return false;
  const t = new Date(biz.createdAt).getTime();
  return !isNaN(t) && Date.now() - t <= NUEVO_DIAS * 24 * 60 * 60 * 1000;
}

/* ---------- estadísticas privadas del dueño: registro de acciones de los clientes ---------- */
// Se manda en segundo plano al servidor. El dueño ve los totales SOLO desde su panel de Mi Asistente;
// nada de esto se muestra en pantallas públicas. tipo: "visita" | "ubicacion" | "guardado" | "contacto"
function trackEvento(bizId, tipo) {
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

async function fetchActividad() {
  const res = await fetch(`${API_URL}/asistente/cliente/actividad`, {
    method: "POST",
    headers: userHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({}), // el servidor usa el id de tu cuenta (no se manda desde acá)
  });
  if (!res.ok) throw new Error("No se pudo cargar la actividad");
  return res.json(); // { pedidos, turnos, puntos, canjes }
}

async function fetchMisPuntos() {
  const res = await fetch(`${API_URL}/asistente/puntos/mis-puntos`, {
    method: "POST",
    headers: userHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error("No se pudieron cargar tus puntos");
  return res.json(); // { negocios: [...], canjes: [...] }
}

async function fetchPuntosNegocio(codigoPublico) {
  const res = await fetch(`${API_URL}/asistente/puntos/negocio/${encodeURIComponent(codigoPublico)}`, { headers: userHeaders() });
  if (!res.ok) throw new Error("No se pudo cargar el programa de puntos");
  return res.json(); // { activo: false } o { activo: true, saldo, pesosPorPunto, recompensas, proxima, ... }
}

async function canjearRecompensaApi(codigoPublico, recompensaId, claveUnica) {
  const res = await fetch(`${API_URL}/asistente/puntos/canjear`, {
    method: "POST",
    headers: userHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ codigoPublico, recompensaId, claveUnica }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.mensaje || "No se pudo completar el canje. Probá de nuevo.");
  return data; // { canje, saldo }
}

function fmtPesos(n) {
  return `$${fmtNum(n)}`;
}
function fmtFechaAR(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" });
}

/* ---------- centro de notificaciones del cliente ---------- */
// Las notificaciones NO se inventan: cada una sale de un dato real (un pedido, un turno, puntos, un canje,
// una promoción o historia de un negocio que seguís, la respuesta a una reseña tuya). Lo único que se guarda
// en este dispositivo es cuáles ya leíste y cuáles eliminaste.

const NOTIF_LEIDAS_KEY = "miZonaNotifLeidas";
const NOTIF_ELIMINADAS_KEY = "miZonaNotifEliminadas";

function getIdSet(key) {
  try { return new Set(JSON.parse(localStorage.getItem(key) || "[]")); } catch { return new Set(); }
}
function saveIdSet(key, set) {
  try { localStorage.setItem(key, JSON.stringify([...set].slice(-600))); } catch { /* sin almacenamiento */ }
}

const NOTIF_TIPOS = {
  pedido: { Icon: Package, color: "#2350F5", bg: "#EDF1FF" },
  turno: { Icon: CalendarCheck, color: "#0B1437", bg: "#E4EAF5" },
  promo: { Icon: Tag, color: "#B8703F", bg: "#FBEBD1" },
  historia: { Icon: PartyPopper, color: "#2C9A5F", bg: "#E4F3EA" },
  resena: { Icon: Star, color: "#F5A623", bg: "#FDF3DC" },
  puntos: { Icon: Coins, color: "#B7791F", bg: "#FDF3DC" },
  canje: { Icon: Gift, color: "#7A4F9E", bg: "#F3ECFC" },
  suscripcion: { Icon: Bell, color: "#B8703F", bg: "#FBEBD1" },
};

const PEDIDO_TEXTOS = {
  pendiente: "Pedido enviado — esperando confirmación",
  confirmado: "Tu pedido fue confirmado",
  en_preparacion: "Tu pedido está en preparación",
  listo: "Tu pedido está listo",
  entregado: "Pedido entregado",
};
const TURNO_TEXTOS = {
  pendiente: "Turno solicitado — esperando confirmación",
  confirmado: "Tu turno fue confirmado",
  rechazado: "Tu turno no fue aprobado",
  cancelado: "Tu turno fue cancelado",
};

function buildNotificaciones({ actividad, businesses, favorites, autorId, ownerBizs = [] }) {
  const out = [];
  const bizDe = (codigoPublico) => businesses.find((b) => b.asistenteCodigoPublico === codigoPublico);
  const hace30d = Date.now() - 30 * 24 * 60 * 60 * 1000;

  // avisos de la suscripción de mis negocios (días que quedan). El id cambia solo al pasar de 7 → 3 → 1 → vencida,
  // así el aviso reaparece como "sin leer" únicamente en esos momentos y no todos los días.
  ownerBizs.forEach((b) => {
    const inf = infoSuscripcion(b);
    if (!inf || inf.estado === "activa") return;
    const base = { tipo: "suscripcion", destino: "suscripcion", bizId: b.id, fecha: new Date().toISOString() };
    if (inf.estado === "pendiente") {
      out.push({ ...base, id: `susc:${b.id}:pendiente`, titulo: "Falta pagar la suscripción", descripcion: `${b.name} todavía no se muestra en Mi Zona. Elegí un plan para publicarlo.` });
    } else if (inf.estado === "vencida") {
      out.push({ ...base, id: `susc:${b.id}:${b.expiresAt}:0`, titulo: "Tu suscripción venció", descripcion: `${b.name} ya no se muestra en Mi Zona. Renová para volver a aparecer.` });
    } else {
      const umbral = inf.dias <= 1 ? 1 : inf.dias <= 3 ? 3 : 7;
      out.push({
        ...base, id: `susc:${b.id}:${b.expiresAt}:${umbral}`,
        titulo: inf.dias === 0 ? "Tu suscripción vence hoy" : inf.dias === 1 ? "Tu suscripción vence mañana" : `Tu suscripción vence en ${inf.dias} días`,
        descripcion: `${b.name}. Podés agregar meses cuando quieras: se suman al tiempo que te queda.`,
      });
    }
  });

  (actividad?.pedidos || []).forEach((p) => {
    out.push({
      id: `pedido:${p.id}:${p.estado}`, tipo: "pedido", titulo: PEDIDO_TEXTOS[p.estado] || "Actualización de tu pedido",
      descripcion: `${p.negocio}${p.total ? ` · ${fmtPesos(p.total)}` : ""}`,
      fecha: p.actualizadoEn, bizId: bizDe(p.codigoPublico)?.id, codigoPublico: p.codigoPublico,
    });
  });

  (actividad?.turnos || []).forEach((t) => {
    out.push({
      id: `turno:${t.id}:${t.estado}`, tipo: "turno", titulo: TURNO_TEXTOS[t.estado] || "Actualización de tu turno",
      descripcion: `${t.negocio} · ${fmtDate(t.fecha)} ${t.hora} hs${t.motivo ? ` · ${t.motivo}` : ""}`,
      fecha: t.actualizadoEn, bizId: bizDe(t.codigoPublico)?.id, codigoPublico: t.codigoPublico,
    });
  });

  (actividad?.puntos || []).forEach((m) => {
    if (m.puntos <= 0) return;
    out.push({
      id: `puntos:${m.id}`, tipo: "puntos", titulo: `Sumaste ${fmtNum(m.puntos)} ${m.puntos === 1 ? "punto" : "puntos"}`,
      descripcion: `${m.negocio}${m.detalle ? ` · ${m.detalle}` : ""}`,
      fecha: m.creadoEn, destino: "puntos", codigoPublico: m.codigoPublico,
    });
  });

  (actividad?.canjes || []).forEach((c) => {
    out.push({
      id: `canje:${c.id}:pendiente`, tipo: "canje", titulo: "Canje listo para usar",
      descripcion: `${c.recompensa} · ${c.negocio} · código ${c.codigo}`,
      fecha: c.creadoEn, destino: "puntos", codigoPublico: c.codigoPublico,
    });
    if (c.estado === "utilizado") {
      out.push({
        id: `canje:${c.id}:utilizado`, tipo: "canje", titulo: "Canje utilizado",
        descripcion: `${c.recompensa} · ${c.negocio}`,
        fecha: c.utilizadoEn || c.creadoEn, destino: "puntos", codigoPublico: c.codigoPublico,
      });
    }
  });

  // respuestas del dueño a reseñas que escribí en este dispositivo
  businesses.forEach((b) => {
    (b.reviews || []).forEach((r) => {
      if (r.autorId && r.autorId === autorId && r.respuesta?.esDueño) {
        out.push({
          id: `resena:${b.id}:${r.id}`, tipo: "resena", titulo: `${b.name} respondió tu reseña`,
          descripcion: r.respuesta.texto.length > 90 ? `${r.respuesta.texto.slice(0, 90)}…` : r.respuesta.texto,
          fecha: `${r.respuesta.fecha}T12:00:00`, soloFecha: true, bizId: b.id,
        });
      }
    });
  });

  // novedades de los negocios que sigo (favoritos): promociones vigentes y historias activas
  businesses.filter((b) => favorites.includes(b.id) && b.kind !== "job" && b.status === "active").forEach((b) => {
    activeDiscounts(b).forEach((d) => {
      if (!d.startDate || new Date(`${d.startDate}T12:00:00`).getTime() < hace30d) return;
      out.push({
        id: `promo:${b.id}:${d.id}`, tipo: "promo", titulo: `Nueva promoción en ${b.name}`,
        descripcion: `${d.title}${d.percent ? ` · ${d.percent} OFF` : ""} · hasta el ${fmtDate(d.endDate)}`,
        fecha: `${d.startDate}T12:00:00`, soloFecha: true, bizId: b.id,
      });
    });
    historiasActivas(b).forEach((h) => {
      out.push({
        id: `historia:${b.id}:${h.id}`, tipo: "historia", titulo: `${b.name} subió una historia`,
        descripcion: "Está disponible por 24 horas.", fecha: h.subidaEn, bizId: b.id,
      });
    });
  });

  return out.filter((n) => n.fecha).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}

function fmtNotifTime(iso, soloFecha) {
  const d = new Date(iso);
  const hoy = new Date();
  const ayer = new Date(hoy); ayer.setDate(hoy.getDate() - 1);
  const hora = d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === hoy.toDateString()) return soloFecha ? "Hoy" : `Hoy · ${hora}`;
  if (d.toDateString() === ayer.toDateString()) return soloFecha ? "Ayer" : `Ayer · ${hora}`;
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" }) + (soloFecha ? "" : ` · ${hora}`);
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ---------- filtros del mapa ---------- */
// Solo negocios REGISTRADOS en Mi Zona (nada de negocios externos), activos y de la zona elegida.
function filtrarParaMapa(businesses, zone, f, favorites) {
  return businesses.filter((b) => {
    if (b.kind === "job" || b.status !== "active") return false;
    if (b.zone !== zone) return false;
    if (f.cat && b.cat !== f.cat) return false;
    if (f.abiertos && !isOpenNow(b.weekHours)) return false;
    if (f.delivery && !b.delivery) return false;
    if (f.promos && activeDiscounts(b).length === 0) return false;
    if (f.asistente && !(b.asistenteActivo && b.asistenteCodigoPublico)) return false;
    if (f.nuevos && !esNegocioNuevo(b)) return false;
    if (f.favoritos && !favorites.includes(b.id)) return false;
    return true;
  });
}

/* ---------- ubicación: geocodificar direcciones y calcular distancia ---------- */

async function geocodeAddress(loc, zone) {
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

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fmtDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1).replace(".", ",")} km`;
}

/* ---------- descuentos ---------- */

function isDiscountActive(d) {
  if (!d.active) return false;
  const today = todayISO();
  return d.startDate <= today && today <= d.endDate;
}
function activeDiscounts(biz) {
  return (biz.discounts || []).filter(isDiscountActive);
}

function emptyBusiness() {
  return {
    id: uid(), kind: "business",
    name: "", desc: "", cat: "comida", zone: ZONES[0],
    services: [], specialties: [], paymentMethods: [], delivery: false, acceptsWhatsapp: true,
    phone: "", ig: "", tiktok: "", facebook: "", logo: "", portada: "", photos: [], loc: "",
    lat: null, lng: null,
    weekHours: DAYS.map(() => [9, 20]),
    featured: false, status: "active",
    createdAt: todayISO(), expiresAt: addDays(todayISO(), 30), lastRenewal: todayISO(),
    views: 0, reviews: [], discounts: [], extra: {},
    historias: [], // [{ id, url, subidaEn }] — se filtran a las de las últimas 24hs al mostrarlas
    asistenteCodigoPublico: "", // lo conecta el servidor solo, cuando la cuenta de Google tiene Mi Asistente
    busquedaEmpleo: null, // { puesto, descripcion, contactoTipo, contactoValor, fechaInicio, fechaFin }
  };
}

/* ---------- almacenamiento persistente (backend Express + MongoDB) ---------- */

function normalizeBusiness(b) {
  return {
    kind: "business",
    lat: null, lng: null, discounts: [],
    ...b,
  };
}

async function loadBusinesses() {
  const res = await fetch(`${API_URL}/businesses`, { headers: authHeaders() });
  if (!res.ok) throw new Error("No se pudieron cargar los negocios");
  const list = await res.json();
  return list.map(normalizeBusiness);
}

async function buscarConAsistente(mensaje, historial, contexto = {}) {
  const res = await fetch(`${API_URL}/asistente/buscar`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ mensaje, historial, ubicacion: contexto.ubicacion, chats: contexto.chats }),
  });
  if (!res.ok) throw new Error("No se pudo consultar al asistente");
  return res.json(); // { respuesta, negocios: [ids] }
}

async function updateBusinessOnServer(id, biz) {
  const res = await fetch(`${API_URL}/businesses/${id}`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(biz),
  });
  if (!res.ok) throw new Error("No se pudo guardar el negocio");
  return res.json();
}

async function toggleFavoritoOnServer(id, delta) {
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

const CLOUDINARY_CLOUD_NAME = "hiyaxxdk";
const CLOUDINARY_UPLOAD_PRESET = "mi-zona-fotos";

async function uploadImage(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Error al subir la imagen a Cloudinary");
  const data = await res.json();
  return data.secure_url;
}

/* ---------- piezas visuales chicas ---------- */

function Photo({ cat, src, height = 128, radius = "10px 10px 0 0", iconSize = 34, onOpen, clickable = true }) {
  const c = catInfo(cat);
  const Icon = c?.icon || Home;
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    const img = <img src={src} alt="" className="w-full h-full object-cover" onError={() => setFailed(true)} />;
    if (!clickable) {
      return (
        <div className="relative overflow-hidden shrink-0 w-full" style={{ height, borderRadius: radius }}>
          {img}
        </div>
      );
    }
    return (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onOpen && onOpen(src); }}
        className="relative overflow-hidden shrink-0 w-full"
        style={{ height, borderRadius: radius }}
      >
        {img}
      </button>
    );
  }

  return (
    <div
      className="flex flex-col items-center justify-center relative overflow-hidden shrink-0 gap-1 px-2 text-center"
      style={{ height, background: failed ? "#FDF1EF" : `linear-gradient(135deg, ${c?.color}22, ${c?.color}08)`, borderRadius: radius }}
    >
      {failed ? (
        <>
          <ImageIcon size={Math.min(iconSize, 22)} color="#9A3B34" strokeWidth={1.5} />
          <span className="text-[10px] leading-tight" style={{ color: "#9A3B34" }}>El link de esta foto no funciona</span>
        </>
      ) : (
        <Icon size={iconSize} color={c?.color} strokeWidth={1.5} />
      )}
    </div>
  );
}

function OpenBadge({ weekHours }) {
  const open = isOpenNow(weekHours);
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1"
      style={{ borderRadius: 20, color: open ? "#1E6B44" : "#9A3B34", background: open ? "#E4F3EA" : "#FDF1EF" }}
    >
      <span className="rounded-full" style={{ width: 6, height: 6, backgroundColor: open ? "#2C9A5F" : "#C1443A" }} />
      {open ? "Abierto ahora" : "Cerrado"}
    </span>
  );
}

function StatusBadge({ status }) {
  const active = status === "active";
  return (
    <span
      className="text-xs font-medium px-2 py-0.5"
      style={{ borderRadius: 12, color: active ? "#1E6B44" : "#7A7D87", background: active ? "#E4F3EA" : "#EEEDE7" }}
    >
      {active ? "Activo" : "Inactivo"}
    </span>
  );
}

function StarPicker({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)}>
          <Star size={22} color={n <= value ? "#2350F5" : "#D1D5DB"} fill={n <= value ? "#2350F5" : "none"} />
        </button>
      ))}
    </div>
  );
}

/* ---------- selector de Provincia + Localidad (toda Argentina, vía API oficial) ---------- */

function ZonePicker({ value, onChange, dark = false, compact = false }) {
  const [provincias, setProvincias] = useState([]);
  const [localidades, setLocalidades] = useState([]);
  const [provinciaId, setProvinciaId] = useState("");
  const [localidad, setLocalidad] = useState("");
  const [loadingLoc, setLoadingLoc] = useState(false);

  useEffect(() => {
    fetchProvincias().then(setProvincias);
  }, []);

  // si `value` ya trae "Localidad, Provincia" (o venimos de la lista de respaldo), tratamos de ubicar la provincia
  useEffect(() => {
    if (!value || provincias.length === 0 || provinciaId) return;
    const partes = value.split(",").map((s) => s.trim());
    const nombreProv = partes[1] || partes[0];
    const match = provincias.find((p) => p.nombre.toLowerCase() === nombreProv.toLowerCase());
    if (match) { setProvinciaId(match.id); setLocalidad(partes[0]); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, provincias]);

  useEffect(() => {
    if (!provinciaId) { setLocalidades([]); return; }
    setLoadingLoc(true);
    fetchLocalidades(provinciaId).then((list) => { setLocalidades(list); setLoadingLoc(false); });
  }, [provinciaId]);

  const inputCls = "appearance-none text-sm px-3 py-2.5";
  const style = dark
    ? { borderRadius: 8, backgroundColor: "#ffffff15", color: "#fff", border: "1px solid #ffffff30" }
    : { borderRadius: 8, backgroundColor: "#fff", color: "#0B1437", border: "1px solid #E3E7F1" };

  return (
    <div className={compact ? "flex gap-2" : "flex flex-col gap-2 sm:flex-row"}>
      <select
        value={provinciaId}
        onChange={(e) => { setProvinciaId(e.target.value); setLocalidad(""); }}
        className={inputCls} style={{ ...style, flex: 1 }}
      >
        <option value="" style={{ color: "#0B1437" }}>Provincia...</option>
        {provincias.map((p) => <option key={p.id} value={p.id} style={{ color: "#0B1437" }}>{p.nombre}</option>)}
      </select>
      <select
        value={localidad}
        disabled={!provinciaId || loadingLoc}
        onChange={(e) => {
          const loc = e.target.value;
          setLocalidad(loc);
          const prov = provincias.find((p) => p.id === provinciaId);
          if (loc && prov) onChange(`${loc}, ${prov.nombre}`);
        }}
        className={inputCls} style={{ ...style, flex: 1, opacity: !provinciaId || loadingLoc ? 0.6 : 1 }}
      >
        <option value="" style={{ color: "#0B1437" }}>{loadingLoc ? "Cargando..." : "Localidad..."}</option>
        {localidades.map((l) => <option key={l} value={l} style={{ color: "#0B1437" }}>{l}</option>)}
      </select>
    </div>
  );
}

/* ---------- chat con el asistente del negocio ---------- */

function BusquedaAsistenteScreen({ onBack, businesses, onOpenBusiness, userLoc, onUbicacion }) {
  // La búsqueda usa la ubicación de la persona (el navegador le pide permiso) y un resumen de sus últimos chats con negocios
  const obtenerUbicacion = () => new Promise((resolve) => {
    if (userLoc) return resolve(userLoc);
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => { const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }; onUbicacion && onUbicacion(loc); resolve(loc); },
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 8000 }
    );
  });
  const [messages, setMessages] = useState([
    { id: uid(), rol: "asistente", texto: "¡Hola! Contame qué estás buscando y te ayudo a encontrarlo en Mi Zona.", negocios: [] },
  ]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const enviar = async () => {
    const contenido = text.trim();
    if (!contenido || sending) return;
    const historialActual = messages;
    const msgCliente = { id: uid(), rol: "cliente", texto: contenido, negocios: [] };
    setMessages((prev) => [...prev, msgCliente]);
    setText("");
    setSending(true);
    try {
      const priv = getPrivacidad(); // lo que la persona eligió en Privacidad
      const ubicacion = priv.ubicacionBusqueda ? await obtenerUbicacion() : null;
      const chats = priv.chatsBusqueda ? contextoDeChats(businesses) : [];
      const data = await buscarConAsistente(contenido, historialActual, { ubicacion, chats });
      const msgAsistente = { id: uid(), rol: "asistente", texto: data.respuesta, negocios: data.negocios || [] };
      setMessages((prev) => [...prev, msgAsistente]);
    } catch {
      setMessages((prev) => [...prev, { id: uid(), rol: "asistente", texto: "No pude buscar en este momento. Probá de nuevo en un rato.", negocios: [] }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80]" style={{ backgroundColor: "#F3F5FA", display: "flex", flexDirection: "column" }}>
      <div style={{ backgroundColor: "#0B1437" }}>
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <BotonAtras onClick={onBack} />
          <div className="flex items-center justify-center shrink-0" style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, #2350F5, #7FA8F5)" }}>
            <Search size={16} color="#fff" />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "#fff", fontFamily: "var(--fuente-titulo)" }}>Asistente de búsqueda</p>
            <p className="text-[11px]" style={{ color: "#BBD1FB" }}>Te ayudo a encontrar lo que necesitás</p>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-3xl w-full mx-auto px-4 py-4 flex flex-col gap-3 overflow-y-auto">
        {messages.map((m) => (
          <div key={m.id} className="flex flex-col" style={{ alignItems: m.rol === "cliente" ? "flex-end" : "flex-start" }}>
            <div
              className="px-3.5 py-2.5 text-sm"
              style={{
                maxWidth: "85%", borderRadius: 14,
                backgroundColor: m.rol === "cliente" ? "#2350F5" : "#fff",
                color: m.rol === "cliente" ? "#fff" : "#0B1437",
                border: m.rol === "cliente" ? "none" : "1px solid #E3E7F1",
                borderBottomRightRadius: m.rol === "cliente" ? 4 : 14,
                borderBottomLeftRadius: m.rol === "cliente" ? 14 : 4,
              }}
            >
              {m.texto}
            </div>
            {m.negocios?.length > 0 && (
              <div className="flex flex-col gap-2 mt-2" style={{ maxWidth: "85%", width: "100%" }}>
                {m.negocios.map((id) => {
                  const biz = businesses.find((b) => b.id === id);
                  if (!biz) return null;
                  const c = catInfo(biz.cat);
                  return (
                    <button
                      key={id}
                      onClick={() => onOpenBusiness(id)}
                      className="flex items-center gap-3 p-3 text-left bg-white"
                      style={{ borderRadius: 12, border: "1px solid #E3E7F1", boxShadow: "0 3px 10px rgba(11,20,55,0.07)" }}
                    >
                      <span className="flex items-center justify-center shrink-0" style={{ width: 40, height: 40, borderRadius: 10, background: c?.color || "#2350F5" }}>
                        {c?.icon ? <c.icon size={18} color="#fff" /> : <Building2 size={18} color="#fff" />}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold truncate" style={{ color: "#0B1437" }}>{biz.name}</span>
                        <span className="block text-xs truncate" style={{ color: "#5B6482" }}>{c?.label} · {biz.zone}</span>
                      </span>
                      <ChevronDown size={14} color="#2350F5" style={{ transform: "rotate(-90deg)" }} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
        {sending && (
          <div className="flex" style={{ justifyContent: "flex-start" }}>
            <div className="px-3.5 py-2.5 text-sm" style={{ borderRadius: 14, borderBottomLeftRadius: 4, backgroundColor: "#fff", border: "1px solid #E3E7F1", color: "#5B6482" }}>
              Buscando...
            </div>
          </div>
        )}
      </div>

      <div style={{ backgroundColor: "#fff", borderTop: "1px solid #E3E7F1" }}>
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-2">
          <input
            value={text} onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") enviar(); }}
            placeholder="Ej: quiero comer una hamburguesa..."
            className="flex-1 px-4 py-2.5 text-sm outline-none"
            style={{ borderRadius: 24, border: "1px solid #E3E7F1", backgroundColor: "#F3F5FA", color: "#0B1437" }}
          />
          <button
            onClick={enviar} disabled={sending || !text.trim()}
            className="flex items-center justify-center shrink-0"
            style={{ width: 40, height: 40, borderRadius: "50%", backgroundColor: "#2350F5", opacity: sending || !text.trim() ? 0.5 : 1 }}
          >
            <Send size={16} color="#fff" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ChatScreen({ biz, onBack }) {
  const c = catInfo(biz.cat);
  const tieneAsistenteReal = !!biz.asistenteCodigoPublico;
  const [messages, setMessages] = useState(() => getConversation(biz.id));
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    // Si el negocio NO tiene un asistente real conectado, mostramos un saludo genérico local.
    // Si SÍ lo tiene, dejamos que el propio asistente de Mi Asistente arranque la charla
    // cuando el cliente escriba, en vez de simular un saludo que no es suyo.
    if (messages.length === 0 && !tieneAsistenteReal) {
      const saludo = {
        id: uid(), rol: "asistente",
        texto: `¡Hola! Soy el asistente de ${biz.name}. ¿En qué puedo ayudarte?`,
        hora: new Date().toISOString(),
      };
      setMessages([saludo]);
      saveConversation(biz.id, [saludo]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { saveConversation(biz.id, messages); setLastSeen(biz.id, new Date().toISOString()); }, [biz.id, messages]);

  const enviar = async () => {
    const contenido = text.trim();
    if (!contenido || sending) return;
    const msgCliente = { id: uid(), rol: "cliente", texto: contenido, hora: new Date().toISOString() };
    const historial = [...messages, msgCliente];
    setMessages(historial);
    setText("");

    if (!tieneAsistenteReal) {
      // Este negocio todavía no conectó Mi Asistente: no hay a quién preguntarle de verdad.
      setSending(true);
      setTimeout(() => {
        setMessages((prev) => [...prev, {
          id: uid(), rol: "asistente",
          texto: "Gracias por tu mensaje. Este negocio todavía no activó su asistente virtual — igual, tu consulta va a quedar guardada acá.",
          hora: new Date().toISOString(),
        }]);
        setSending(false);
      }, 400);
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`${API_URL}/asistente/chat/${biz.asistenteCodigoPublico}`, {
        method: "POST",
        headers: userHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ mensaje: contenido, sesionClienteId: sesionClienteId() }),
      });
      const data = await res.json();
      if (!res.ok) {
        const texto = res.status === 401
          ? "Tu sesión venció. Iniciá sesión con Google de nuevo para seguir chateando."
          : data.error === "suscripcion_vencida"
          ? "Este asistente está pausado temporalmente por el negocio."
          : data.error === "limite_prueba_alcanzado"
          ? "Este negocio alcanzó el límite de mensajes de su prueba gratuita de Mi Asistente."
          : (data.mensaje || "No pude conectarme con el asistente en este momento.");
        setMessages((prev) => [...prev, { id: uid(), rol: "asistente", texto, hora: new Date().toISOString() }]);
        return;
      }
      setMessages((prev) => [...prev, {
        id: uid(), rol: "asistente", texto: data.respuesta, hora: new Date().toISOString(),
        imagenes: data.imagenes?.length ? data.imagenes : undefined,
        pedidoCreado: data.pedidoCreado || undefined,
        turnoCreado: data.turnoCreado || undefined,
      }]);
    } catch {
      setMessages((prev) => [...prev, {
        id: uid(), rol: "asistente",
        texto: "No pude conectarme con el asistente de este negocio en este momento. Probá de nuevo en un rato.",
        hora: new Date().toISOString(),
      }]);
    } finally {
      setSending(false);
    }
  };


  return (
    <div style={{ backgroundColor: "#F3F5FA", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div className="sticky top-0 z-30" style={{ backgroundColor: "#0B1437" }}>
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <BotonAtras onClick={onBack} />
          <div className="flex items-center justify-center shrink-0" style={{ width: 34, height: 34, borderRadius: "50%", background: c?.color || "#2350F5", color: "#fff", fontWeight: 700, fontSize: 14 }}>
            {biz.name?.[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: "#fff", fontFamily: "var(--fuente-titulo)" }}>{biz.name}</p>
            <p className="text-[11px] flex items-center gap-1" style={{ color: "#BBD1FB" }}>
              {tieneAsistenteReal ? "Asistente virtual" : c?.label}
              <span className="inline-flex items-center gap-1 ml-1">
                <span className="rounded-full" style={{ width: 5, height: 5, background: isOpenNow(biz.weekHours) ? "#2C9A5F" : "#C1443A" }} />
                {isOpenNow(biz.weekHours) ? "Abierto" : "Cerrado"}
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-3xl w-full mx-auto px-4 py-4 flex flex-col gap-2.5 overflow-y-auto" style={{ paddingBottom: 90 }}>
        {messages.map((m) => (
          <div key={m.id} className="flex flex-col" style={{ alignItems: m.rol === "cliente" ? "flex-end" : "flex-start" }}>
            <div
              className="px-3.5 py-2.5 text-sm"
              style={{
                maxWidth: "78%", borderRadius: 14,
                backgroundColor: m.rol === "cliente" ? "#2350F5" : "#fff",
                color: m.rol === "cliente" ? "#fff" : "#0B1437",
                border: m.rol === "cliente" ? "none" : "1px solid #E3E7F1",
                borderBottomRightRadius: m.rol === "cliente" ? 4 : 14,
                borderBottomLeftRadius: m.rol === "cliente" ? 14 : 4,
              }}
            >
              {m.texto}
            </div>
            {m.imagenes && (
              <div className="flex gap-2 mt-1.5 overflow-x-auto" style={{ maxWidth: "78%" }}>
                {m.imagenes.map((url, i) => (
                  <img key={i} src={url} alt="" className="object-cover shrink-0" style={{ width: 100, height: 100, borderRadius: 10, border: "1px solid #E3E7F1" }} />
                ))}
              </div>
            )}
            {(m.pedidoCreado || m.turnoCreado) && (
              <div className="flex items-center gap-2 mt-1.5 px-3 py-2" style={{ maxWidth: "78%", borderRadius: 10, background: "#E4F3EA", border: "1px solid #2C9A5F55" }}>
                <Check size={14} color="#1E6B44" />
                <span className="text-xs font-medium" style={{ color: "#1E6B44" }}>
                  {m.pedidoCreado ? "Pedido registrado" : "Turno reservado"}
                </span>
              </div>
            )}
          </div>
        ))}
        {sending && (
          <div className="flex" style={{ justifyContent: "flex-start" }}>
            <div className="px-3.5 py-2.5 text-sm" style={{ borderRadius: 14, borderBottomLeftRadius: 4, backgroundColor: "#fff", border: "1px solid #E3E7F1", color: "#5B6482" }}>
              Escribiendo...
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0" style={{ backgroundColor: "#fff", borderTop: "1px solid #E3E7F1" }}>
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-2">
          <input
            value={text} onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") enviar(); }}
            placeholder="Escribí tu mensaje..."
            className="flex-1 px-4 py-2.5 text-sm outline-none"
            style={{ borderRadius: 24, border: "1px solid #E3E7F1", backgroundColor: "#F3F5FA", color: "#0B1437" }}
          />
          <button
            onClick={enviar} disabled={sending || !text.trim()}
            className="flex items-center justify-center shrink-0"
            style={{ width: 40, height: 40, borderRadius: "50%", backgroundColor: "#2350F5", opacity: sending || !text.trim() ? 0.5 : 1 }}
          >
            <Send size={16} color="#fff" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Cuando la cuenta ya tiene un id de cliente (de otro dispositivo), este dispositivo lo adopta: así el historial,
// la memoria del asistente y los puntos la siguen.
function adoptarClienteId(id) {
  try { localStorage.setItem("miZonaClienteId", id); } catch { /* sin almacenamiento */ }
  clienteIdEnMemoria = id;
}

// Resumen de las últimas charlas con negocios, para que la búsqueda con asistente conozca lo que la persona necesita
function contextoDeChats(businesses) {
  return getAllConversationIds()
    .map((id) => {
      const biz = businesses.find((b) => b.id === id);
      const mensajes = getConversation(id);
      if (!biz || !mensajes.length) return null;
      return {
        negocio: biz.name,
        categoria: catInfo(biz.cat)?.label || "",
        ultima: new Date(mensajes[mensajes.length - 1].hora).getTime() || 0,
        mensajes: mensajes.filter((m) => m.rol === "cliente").slice(-3).map((m) => m.texto),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.ultima - a.ultima)
    .slice(0, 6)
    .map(({ ultima, ...resto }) => resto);
}

// Id anónimo que identifica a este cliente ante Mi Asistente (chat, puntos, canjes, avisos).
// Ahora es persistente por dispositivo (antes duraba solo la sesión del navegador).
function sesionClienteId() {
  return getClienteId();
}

function TagInput({ values, onChange, placeholder }) {
  const [text, setText] = useState("");
  const add = () => {
    const v = text.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setText("");
  };
  return (
    <div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {values.map((v) => (
            <span key={v} className="text-xs px-2 py-1 flex items-center gap-1" style={{ background: "#EEF0F6", borderRadius: 20 }}>
              {v}
              <button type="button" onClick={() => onChange(values.filter((x) => x !== v))}><X size={10} /></button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-1">
        <input
          value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          className="border px-2 py-1.5 text-xs flex-1" style={{ borderRadius: 6, borderColor: "#E3E7F1" }}
        />
        <button type="button" onClick={add} className="text-xs px-3 py-1.5 font-medium" style={{ background: "#0B1437", color: "#fff", borderRadius: 6 }}>
          Agregar
        </button>
      </div>
    </div>
  );
}

function ConfirmModal({ title, message, confirmLabel = "Confirmar", danger, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ background: "#0B1437cc" }} onClick={onCancel}>
      <div className="bg-white w-full max-w-sm p-6" style={{ borderRadius: 24 }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 700, fontSize: 19, letterSpacing: "-0.01em", color: "#0B1437" }}>{title}</h3>
        <p className="text-sm mt-2 mb-6" style={{ color: "#5B6482", lineHeight: 1.55 }}>{message}</p>
        <div className="flex gap-2.5 justify-end">
          <button onClick={onCancel} className="text-sm font-semibold px-4 py-2.5" style={{ borderRadius: 12, border: "1px solid #E3E7F1", background: "#fff", color: "#0B1437" }}>Cancelar</button>
          <button
            onClick={onConfirm}
            className="text-sm font-semibold px-4 py-2.5"
            style={{ borderRadius: 12, backgroundColor: danger ? "#C1443A" : "#0B1437", color: "#fff" }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function Lightbox({ src, onClose }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" style={{ background: "#0A0C12ee" }} onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 text-white"><X size={26} /></button>
      <img src={src} alt="" className="max-w-full max-h-full object-contain" style={{ borderRadius: 8 }} onClick={(e) => e.stopPropagation()} />
    </div>
  );
}

function AllPhotosModal({ photos, cat, onOpenPhoto, onClose }) {
  return (
    <div className="fixed inset-0 z-[65] flex items-end sm:items-center justify-center" style={{ background: "#0B1437cc" }} onClick={onClose}>
      <div className="bg-white w-full sm:max-w-2xl max-h-[85vh] overflow-y-auto p-5" style={{ borderRadius: "16px 16px 0 0" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 600, fontSize: 18 }}>{photos.length} fotos</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {photos.map((src, i) => (
            <Photo key={i} cat={cat} src={src} height={120} radius="10px" iconSize={20} onOpen={onOpenPhoto} />
          ))}
        </div>
      </div>
    </div>
  );
}

function CategoryModal({ activeCat, onSelect, onClose }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" style={{ background: "#0B1437cc" }} onClick={onClose}>
      <div className="bg-white w-full sm:max-w-lg max-h-[80vh] overflow-y-auto p-5" style={{ borderRadius: "16px 16px 0 0" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 600, fontSize: 18 }}>Todos los rubros</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          <button
            onClick={() => onSelect(null)}
            className="flex flex-col items-center gap-1.5 py-3 px-2 text-center"
            style={{ borderRadius: 12, backgroundColor: activeCat === null ? "#0B1437" : "#F5F4EF" }}
          >
            <Grid3x3 size={22} color={activeCat === null ? "#fff" : "#0B1437"} />
            <span className="text-xs font-medium" style={{ color: activeCat === null ? "#fff" : "#0B1437" }}>Todos</span>
          </button>
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            const active = activeCat === c.id;
            return (
              <button
                key={c.id} onClick={() => onSelect(c.id)}
                className="flex flex-col items-center gap-1.5 py-3 px-2 text-center"
                style={{ borderRadius: 12, backgroundColor: active ? c.color : "#F5F4EF" }}
              >
                <Icon size={22} color={active ? "#fff" : c.color} />
                <span className="text-xs font-medium leading-tight" style={{ color: active ? "#fff" : "#0B1437" }}>{c.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function WeekHoursEditor({ value, onChange }) {
  return (
    <div className="flex flex-col gap-1.5">
      {DAYS.map((day, i) => {
        const entry = value[i];
        const closed = !entry || entry[0] === null;
        return (
          <div key={day} className="flex items-center gap-2 text-xs">
            <span className="w-20 shrink-0" style={{ color: "#1F2937" }}>{day.slice(0, 3)}</span>
            <label className="flex items-center gap-1">
              <input
                type="checkbox" checked={closed}
                onChange={(e) => onChange(value.map((d, idx) => (idx === i ? (e.target.checked ? [null] : [9, 20]) : d)))}
              />
              Cerrado
            </label>
            {!closed && (
              <>
                <input
                  type="number" value={entry[0]}
                  onChange={(e) => onChange(value.map((d, idx) => (idx === i ? [Number(e.target.value), entry[1]] : d)))}
                  className="w-14 border px-1 py-0.5" style={{ borderRadius: 4, borderColor: "#E3E7F1" }}
                />
                <span>a</span>
                <input
                  type="number" value={entry[1]}
                  onChange={(e) => onChange(value.map((d, idx) => (idx === i ? [entry[0], Number(e.target.value)] : d)))}
                  className="w-14 border px-1 py-0.5" style={{ borderRadius: 4, borderColor: "#E3E7F1" }}
                />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------- ficha pública del negocio ---------- */

function BusinessCard({ biz, onOpen, onOpenPhoto, distanceKm, rank, isFavorite, onToggleFavorite, onTrack }) {
  const c = catInfo(biz.cat);
  const rating = avgRating(biz.reviews);
  const discounts = activeDiscounts(biz);
  const rankColor = rank === 1 ? "#F5A623" : rank === 2 ? "#8EA0B8" : rank === 3 ? "#C97B4A" : "#0B1437";
  return (
    <div
      role="button" tabIndex={0}
      onClick={() => onOpen(biz.id)}
      onKeyDown={(e) => (e.key === "Enter" ? onOpen(biz.id) : null)}
      className="bg-white flex flex-col overflow-hidden text-left cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-xl"
      style={{ borderRadius: 22, border: "1px solid #E3E7F1", boxShadow: "0 1px 2px rgba(11,20,55,.04)" }}
    >
      <div className="relative">
        <Photo cat={biz.cat} src={biz.portada || biz.logo || null} height={176} radius="0px" iconSize={42} clickable={false} />
        <div className="absolute inset-x-0 bottom-0 pointer-events-none" style={{ height: 84, background: "linear-gradient(to top, rgba(8,18,38,0.62), rgba(8,18,38,0))" }} />

        <div className="absolute top-3 left-3 flex flex-col items-start gap-1.5">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1" style={{ background: "#ffffffee", color: "#0B1437", borderRadius: 20, boxShadow: "0 2px 8px rgba(0,0,0,.15)", backdropFilter: "blur(6px)" }}>
            <span className="rounded-full" style={{ width: 7, height: 7, background: c?.color }} /> {c?.label}
          </span>
          {discounts.length > 0 && (
            <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1" style={{ background: "linear-gradient(135deg,#E5484D,#F2766B)", color: "#fff", borderRadius: 20, boxShadow: "0 3px 10px rgba(229,72,77,.4)" }}>
              <Tag size={11} /> {discounts[0].percent ? `${discounts[0].percent} OFF` : "Promo"}
            </span>
          )}
        </div>

        {rank && (
          <span className="absolute top-3 right-3 flex items-center gap-1 text-[11px] font-bold px-2.5 py-1" style={{ background: rankColor, color: "#fff", borderRadius: 20, boxShadow: "0 3px 10px rgba(0,0,0,0.3)" }}>
            <Trophy size={11} /> Top {rank}
          </span>
        )}

        {onToggleFavorite && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(biz.id); }}
            aria-label={isFavorite ? "Quitar de favoritos" : "Guardar en favoritos"}
            className="absolute bottom-3 right-3 flex items-center justify-center"
            style={{ width: 36, height: 36, borderRadius: "50%", background: "#fff", boxShadow: "0 4px 12px rgba(0,0,0,0.25)", transition: "transform 0.15s ease", transform: isFavorite ? "scale(1.1)" : "scale(1)" }}
          >
            <Heart size={17} color={isFavorite ? "#E5484D" : "#64748B"} fill={isFavorite ? "#E5484D" : "none"} />
          </button>
        )}
      </div>

      <div className="px-4 pt-3.5 pb-3.5 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2">
          <h3 style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 700, fontSize: 17, letterSpacing: "-0.015em", color: "#0B1437", lineHeight: 1.25 }}>{biz.name}</h3>
          {biz.featured && (
            <span className="flex items-center gap-0.5 text-[10px] font-bold px-2 py-1 shrink-0" style={{ background: "#FFF3D6", color: "#8A5B12", borderRadius: 8 }}>
              <Star size={10} fill="#C98A14" color="#C98A14" /> Destacado
            </span>
          )}
        </div>
        <p className="flex items-center flex-wrap gap-x-1.5 gap-y-0.5 text-[13px] mt-1.5" style={{ color: "#5B6482" }}>
          {rating ? (
            <>
              <Star size={14} fill="#F5B83D" color="#F5B83D" />
              <b style={{ color: "#0B1437" }}>{String(rating).replace(".", ",")}</b>
              <span>({biz.reviews.length} {biz.reviews.length === 1 ? "reseña" : "reseñas"})</span>
            </>
          ) : <span>Sin reseñas todavía</span>}
          {typeof distanceKm === "number" && <><span aria-hidden="true">·</span><span className="flex items-center gap-1 font-semibold" style={{ color: "#0B1437" }}><Navigation size={12} /> A {fmtDistance(distanceKm)} de vos</span></>}
        </p>
        <p className="text-sm mt-2 mb-3 flex-1" style={{ color: "#5B6482", lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{biz.desc}</p>

        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <OpenBadge weekHours={biz.weekHours} />
          {esNegocioNuevo(biz) && (
            <span className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1" style={{ borderRadius: 20, background: "#E4F3EA", color: "#1E6B44" }}>
              <Sparkles size={11} /> Nuevo
            </span>
          )}
          {c?.label && <span className="text-[11px] font-semibold px-2.5 py-1" style={{ borderRadius: 20, background: "#F1F4FA", color: "#5B6482" }}>{c.label}</span>}
        </div>

        <div className="flex items-center justify-between gap-3 pt-3" style={{ borderTop: "1px solid #EEF0F6" }}>
          <a
            href={mapsLink(biz.loc, biz.zone)} target="_blank" rel="noreferrer"
            onClick={(e) => { e.stopPropagation(); onTrack && onTrack(biz.id, "ubicacion"); }}
            className="flex items-center gap-1.5 text-xs min-w-0 hover:underline" style={{ color: "#5B6482" }}
          >
            <MapPin size={13} color="#2350F5" className="shrink-0" /> <span className="truncate">{biz.loc}</span>
          </a>
          <span className="flex items-center gap-1 text-[11px] shrink-0" style={{ color: "#64748B" }}>
            <Eye size={12} /> {fmtNum(biz.views)}
          </span>
        </div>
      </div>
    </div>
  );
}

function soloDigitos(t) { return String(t || "").replace(/\D/g, ""); }
// Número para WhatsApp (formato Argentina: 549 + código de área + número, sin 0 ni 15)
function numeroWhatsapp(t) {
  let d = soloDigitos(t);
  if (!d) return "";
  if (d.startsWith("54")) return d.startsWith("549") ? d : `549${d.slice(2)}`;
  if (d.startsWith("0")) d = d.slice(1);
  return `549${d}`;
}

function BusinessDetail({ biz, onBack, onOpenPhoto, onAddReview, onReplyReview, esDueño, onOpenChat, isFavorite, onToggleFavorite, rank, onTrack, onOpenPuntos }) {
  const c = catInfo(biz.cat);
  const todayIdx = new Date().getDay();
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [showEmpleoDetalle, setShowEmpleoDetalle] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewName, setReviewName] = useState("");
  const [tab, setTab] = useState("info"); // info | opiniones | fotos
  const [replyingId, setReplyingId] = useState(null);
  const [reportandoId, setReportandoId] = useState(null);
  const [avisoReporte, setAvisoReporte] = useState("");
  const [ocultas, setOcultas] = useState(() => { try { return JSON.parse(localStorage.getItem("zona_resenas_ocultas") || "[]"); } catch { return []; } });
  const MOTIVOS_REPORTE = ["Insultos u ofensas", "Spam o publicidad", "Falsa o engañosa", "Datos personales", "Otro motivo"];
  const ocultarResena = (id) => {
    const nuevas = [...ocultas, id];
    setOcultas(nuevas);
    try { localStorage.setItem("zona_resenas_ocultas", JSON.stringify(nuevas)); } catch { /* sin almacenamiento: queda oculta en esta sesión */ }
  };
  // Envía el reporte al equipo por Soporte y deja de mostrar la reseña en este dispositivo.
  const reportarResena = async (r, motivo) => {
    setReportandoId(null);
    ocultarResena(r.id);
    setAvisoReporte("Gracias. Ocultamos la reseña en este dispositivo y avisamos al equipo.");
    try {
      await soporteApi.enviar({ motivo: "resenas", tecnico: JSON.stringify({ negocioId: biz.id, resenaId: r.id }), asunto: `Reporte de reseña en ${biz.name}`, mensaje: `Motivo: ${motivo}\nNegocio: ${biz.name} (${biz.id})\nReseña: ${r.id} de ${r.name}\nTexto: ${String(r.text || "").slice(0, 300)}` });
    } catch {
      setAvisoReporte("Ocultamos la reseña en este dispositivo. No pudimos avisar al equipo: escribinos desde Ajustes → Soporte.");
    }
    setTimeout(() => setAvisoReporte(""), 6000);
  };
  const [replyText, setReplyText] = useState("");
  const rating = avgRating(biz.reviews);

  // programa de puntos del negocio (solo si tiene Mi Asistente conectado y el dueño lo activó)
  const [puntos, setPuntos] = useState(null);
  useEffect(() => {
    setPuntos(null);
    if (!biz.asistenteCodigoPublico || !biz.asistenteActivo) return;
    let cancelado = false;
    fetchPuntosNegocio(biz.asistenteCodigoPublico)
      .then((d) => { if (!cancelado && d.activo) setPuntos(d); })
      .catch(() => {}); // si Mi Asistente no responde, simplemente no se muestra la tarjeta
    return () => { cancelado = true; };
  }, [biz.id, biz.asistenteCodigoPublico, biz.asistenteActivo]);
  const tieneAsistente = !!biz.asistenteCodigoPublico && !!biz.asistenteActivo;

  const historias = historiasActivas(biz);
  const tieneHistorias = historias.length > 0;
  const [showHistoriaViewer, setShowHistoriaViewer] = useState(false);
  const pressTimer = useRef(null);
  const longPressed = useRef(false);
  const handlePressStart = () => {
    longPressed.current = false;
    pressTimer.current = setTimeout(() => {
      longPressed.current = true;
      if (biz.logo) onOpenPhoto(biz.logo);
    }, 450);
  };
  const handlePressEnd = () => {
    clearTimeout(pressTimer.current);
    if (!longPressed.current) {
      if (tieneHistorias) setShowHistoriaViewer(true);
      else if (biz.logo) onOpenPhoto(biz.logo);
    }
  };
  const cancelPress = () => clearTimeout(pressTimer.current);

  useEffect(() => {
    if (esDueño && tab === "opiniones") setReviewsLastSeen(biz.id, new Date().toISOString());
  }, [esDueño, tab, biz.id]);

  const submitReview = () => {
    if (!reviewText.trim()) return;
    const ok = onAddReview(biz.id, { id: uid(), rating: reviewRating, text: reviewText.trim(), name: reviewName.trim() || "Anónimo", date: todayISO(), autorId: getAutorResenasId() });
    if (ok === false) return; // todavía no se registró: no perdemos lo que escribió
    setReviewText(""); setReviewName(""); setReviewRating(5);
  };

  const TabButton = ({ id, label }) => (
    <button
      onClick={() => setTab(id)}
      className="flex-1 py-2 text-sm font-semibold transition-all"
      style={{ borderRadius: 12, background: tab === id ? "#fff" : "transparent", color: tab === id ? "#0B1437" : "#5B6482", boxShadow: tab === id ? "0 1px 2px rgba(11,20,55,.10), 0 4px 10px -2px rgba(11,20,55,.14)" : "none" }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ backgroundColor: "#F3F5FA", minHeight: "100vh" }}>
      <div className="max-w-3xl mx-auto">
        {/* foto principal con botones flotantes */}
        <div style={{ position: "relative" }}>
          <Photo cat={biz.cat} src={biz.portada || null} height={270} radius="0" iconSize={52} onOpen={onOpenPhoto} />
          <div className="absolute inset-x-0 top-0 pointer-events-none" style={{ height: 110, background: "linear-gradient(to bottom, rgba(8,18,38,0.55), rgba(8,18,38,0))" }} />
          <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-3" style={{ zIndex: 5 }}>
            <BotonAtras onClick={onBack} tono="foto" />
            <div className="flex items-center gap-2.5">
              <button onClick={() => shareBusiness(biz)} aria-label="Compartir" className="flex items-center justify-center" style={{ width: 40, height: 40, borderRadius: 14, background: "#ffffffee", boxShadow: "0 4px 14px rgba(0,0,0,.25)" }}>
                <Share2 size={17} color="#0B1437" />
              </button>
              <button onClick={() => onToggleFavorite(biz.id)} aria-label="Favorito" className="flex items-center justify-center" style={{ width: 40, height: 40, borderRadius: 14, background: "#ffffffee", boxShadow: "0 4px 14px rgba(0,0,0,.25)" }}>
                <Heart size={18} color={isFavorite ? "#E5484D" : "#0B1437"} fill={isFavorite ? "#E5484D" : "none"} />
              </button>
            </div>
          </div>
                    {rank && (
            <div
              className="absolute flex items-center gap-1 text-xs font-bold px-2.5 py-1.5"
              style={{
                bottom: 40, right: 16, borderRadius: 20, color: "#fff", boxShadow: "0 3px 10px rgba(0,0,0,0.3)",
                background: rank === 1 ? "#F5A623" : rank === 2 ? "#8EA0B8" : rank === 3 ? "#C97B4A" : "#0B1437",
              }}
            >
              <Trophy size={13} /> Top #{rank} en tu zona
            </div>
          )}
        </div>

        <div className="px-4">
          {/* tarjeta de identidad del negocio */}
          <div className="bg-white relative p-4 mb-4" style={{ borderRadius: 24, marginTop: -30, boxShadow: "0 12px 32px rgba(11,20,55,0.12)", border: "1px solid #E3E7F1" }}>
            <div className="flex items-start gap-3.5">
              <button
                onMouseDown={handlePressStart} onMouseUp={handlePressEnd} onMouseLeave={cancelPress}
                onTouchStart={handlePressStart} onTouchEnd={handlePressEnd} onTouchCancel={cancelPress}
                className="flex items-center justify-center shrink-0 text-xl font-bold overflow-hidden"
                style={{
                  width: 66, height: 66, borderRadius: 22, background: c?.color || "#2350F5", color: "#fff",
                  fontFamily: "var(--fuente-titulo)", marginTop: -36, border: "4px solid #fff",
                  boxShadow: tieneHistorias ? "0 0 0 3px #2350F5, 0 8px 18px rgba(11,20,55,.25)" : "0 8px 18px rgba(11,20,55,.25)",
                }}
              >
                {biz.logo ? <img src={biz.logo} alt="" className="w-full h-full object-cover" /> : biz.name?.[0]?.toUpperCase()}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 700, fontSize: 21, color: "#0B1437", lineHeight: 1.2 }}>{biz.name}</h1>
                  {biz.featured && (
                    <span className="flex items-center gap-0.5 text-[10px] font-bold px-2 py-1" style={{ background: "#FFF3D6", color: "#8A5B12", borderRadius: 8 }}>
                      <Star size={10} fill="#C98A14" color="#C98A14" /> Destacado
                    </span>
                  )}
                </div>
                <p className="text-xs mt-0.5 flex items-center gap-1.5" style={{ color: "#5B6482" }}>
                  <span className="rounded-full inline-block" style={{ width: 7, height: 7, background: c?.color }} /> {c?.label} · {biz.zone}
                </p>
                <div className="mt-1.5"><OpenBadge weekHours={biz.weekHours} /></div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-4">
              {[
                { Icon: Star, color: "#F5A623", valor: rating || "—", etiqueta: biz.reviews?.length ? `${biz.reviews.length} reseñas` : "Sin reseñas" },
                { Icon: Eye, color: "#2350F5", valor: fmtNum(biz.views), etiqueta: "visitas" },
                { Icon: Heart, color: "#E5484D", valor: fmtNum(biz.vecesFavorito || 0), etiqueta: "guardados" },
              ].map(({ Icon, color, valor, etiqueta }) => (
                <div key={etiqueta} className="text-center py-2" style={{ borderRadius: 14, background: "#F6F9FD" }}>
                  <span className="flex items-center justify-center gap-1" style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 700, fontSize: 16, color: "#0B1437" }}>
                    <Icon size={13} color={color} fill={Icon === Star || Icon === Heart ? color : "none"} /> {valor}
                  </span>
                  <span className="block text-[10px] mt-0.5" style={{ color: "#5B6482" }}>{etiqueta}</span>
                </div>
              ))}
            </div>

            {/* acciones rápidas: arriba WhatsApp + Cómo llegar; abajo las redes sociales, siempre en equilibrio */}
            {(() => {
              const handle = (v) => String(v || "").trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?[^/]+\//, "").replace(/\/+$/, "");
              const esUrl = (v) => /^https?:\/\//i.test(String(v || "").trim());
              // arriba: contacto directo + ubicación. Si el negocio no usa WhatsApp pero tiene teléfono, el botón de contacto es "Llamar".
              const contacto = biz.phone && biz.acceptsWhatsapp
                ? { Icon: MessageCircle, label: "WhatsApp", color: "#25A06A", href: `https://wa.me/${numeroWhatsapp(biz.phone)}`, track: "contacto" }
                : biz.phone ? { Icon: Phone, label: "Llamar", color: "#2C9A5F", href: `tel:${soloDigitos(biz.phone)}`, track: "contacto" } : null;
              const principales = [contacto, { Icon: Navigation, label: "Cómo llegar", color: "#2350F5", href: mapsLink(biz.loc, biz.zone), track: "ubicacion" }].filter(Boolean);
              const redes = [
                biz.ig && handle(biz.ig) && { Icon: Instagram, label: "Instagram", color: "#C13584", href: `https://instagram.com/${handle(biz.ig)}`, track: "contacto" },
                biz.tiktok && handle(biz.tiktok) && { Icon: Music2, label: "TikTok", color: "#111827", href: `https://www.tiktok.com/@${handle(biz.tiktok)}`, track: "contacto" },
                biz.facebook && handle(biz.facebook) && { Icon: Facebook, label: "Facebook", color: "#1877F2", href: esUrl(biz.facebook) ? biz.facebook.trim() : `https://facebook.com/${handle(biz.facebook)}`, track: "contacto" },
              ].filter(Boolean);
              const Boton = ({ Icon, label, color, href, track, ancho }) => (
                <a
                  href={href} target="_blank" rel="noreferrer"
                  onClick={() => onTrack && onTrack(biz.id, track)}
                  className="flex items-center justify-center gap-2 py-3"
                  style={{ borderRadius: 14, background: `${color}14`, gridColumn: ancho ? "span 2" : undefined }}
                >
                  <Icon size={17} color={color} />
                  <span className="text-xs font-semibold" style={{ color: "#0B1437" }}>{label}</span>
                </a>
              );
              return (
                <div className="mt-3 flex flex-col gap-2">
                  <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${principales.length}, minmax(0, 1fr))` }}>
                    {principales.map((a) => <Boton key={a.label} {...a} />)}
                  </div>
                  {redes.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {/* de a dos; si queda uno solo, ocupa todo el ancho para que no se vea desparejo */}
                      {redes.map((a, n) => <Boton key={a.label} {...a} ancho={redes.length % 2 === 1 && n === redes.length - 1} />)}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {busquedaEmpleoActiva(biz) && (
            <button
              onClick={() => setShowEmpleoDetalle(true)}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 mb-4 text-left"
              style={{ borderRadius: 10, background: "#EDF1FF", border: "1px solid #BFD6FB" }}
            >
              <Briefcase size={16} color="#2350F5" className="shrink-0" />
              <span className="flex-1 text-xs" style={{ color: "#0B1437" }}>
                <b>Buscan personal:</b> {biz.busquedaEmpleo.puesto}
              </span>
              <ChevronDown size={13} color="#2350F5" style={{ transform: "rotate(-90deg)" }} />
            </button>
          )}
          {showEmpleoDetalle && <EmpleoDetalleModal business={biz} onClose={() => setShowEmpleoDetalle(false)} />}
          {showHistoriaViewer && <HistoriaViewerModal business={biz} historias={historias} onClose={() => setShowHistoriaViewer(false)} />}

          {/* pestañas */}
          <div className="flex items-center gap-1 p-1 mb-5" style={{ borderRadius: 16, background: "#E8EEF7" }}>
            <TabButton id="info" label="Información" />
            <TabButton id="opiniones" label={`Opiniones${biz.reviews?.length ? ` (${biz.reviews.length})` : ""}`} />
            <TabButton id="fotos" label="Fotos" />
          </div>

          {tab === "info" && (
            <div className="pb-6">
              <p className="text-sm mb-4" style={{ color: "#1F2937" }}>{biz.desc}</p>

              {(biz.services?.length > 0 || biz.specialties?.length > 0) && (
                <div className="mb-4 flex flex-col gap-2">
                  {biz.services?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {biz.services.map((s) => (
                        <span key={s} className="text-xs px-2 py-1" style={{ background: "#EDF1FF", color: "#0B1437", borderRadius: 20 }}>{s}</span>
                      ))}
                    </div>
                  )}
                  {biz.specialties?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {biz.specialties.map((s) => (
                        <span key={s} className="text-xs px-2 py-1" style={{ background: "#F5F1E6", color: "#8A5B12", borderRadius: 20 }}>{s}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 mb-5 text-xs" style={{ color: "#2B3768" }}>
                {biz.paymentMethods?.length > 0 && <span>Pagos: {biz.paymentMethods.join(", ")}</span>}
                {biz.delivery && <span className="flex items-center gap-1"><Truck size={13} /> Hace envíos</span>}
              </div>

              {biz.ig && (
                <div className="flex gap-2 mb-5">
                  <a href={`https://instagram.com/${biz.ig}`} target="_blank" rel="noreferrer"
                    onClick={() => onTrack && onTrack(biz.id, "contacto")}
                    className="flex items-center justify-center gap-2 text-sm font-semibold px-4 py-3"
                    style={{ border: "1px solid #E3E7F1", color: "#0B1437", borderRadius: 10 }}
                  >
                    <Instagram size={17} /> @{biz.ig}
                  </a>
                </div>
              )}

              <a href={mapsLink(biz.loc, biz.zone)} target="_blank" rel="noreferrer" onClick={() => onTrack && onTrack(biz.id, "ubicacion")} className="flex items-center gap-1.5 text-sm mb-6 w-fit hover:underline" style={{ color: "#0B1437" }}>
                <MapPin size={15} /> {biz.loc} <span style={{ color: "#5B6482" }}>· ver en el mapa</span>
              </a>

              {puntos && (
                <div className="mb-6 p-4" style={{ borderRadius: 18, background: "linear-gradient(135deg,#FFF6E0,#FDEBC4)", border: "1px solid #F5D9A0" }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Coins size={17} color="#B7791F" />
                    <h2 style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 600, fontSize: 15, color: "#0B1437" }}>Puntos y recompensas</h2>
                  </div>
                  <p className="text-xs" style={{ color: "#5B4A1E" }}>
                    Ganás <b>1 punto</b> por cada <b>{fmtPesos(puntos.pesosPorPunto)}</b> que gastás en {biz.name}.
                    {puntos.saldo > 0 && <> Tenés <b>{fmtNum(puntos.saldo)} {puntos.saldo === 1 ? "punto" : "puntos"}</b>.</>}
                  </p>
                  {puntos.proxima && (
                    <p className="text-xs mt-1" style={{ color: "#5B4A1E" }}>
                      Te {puntos.proxima.faltan === 1 ? "falta" : "faltan"} {fmtNum(puntos.proxima.faltan)} para "{puntos.proxima.nombre}".
                    </p>
                  )}
                  <button
                    onClick={() => onOpenPuntos && onOpenPuntos(biz.asistenteCodigoPublico)}
                    className="w-full text-sm font-semibold py-2.5 mt-3"
                    style={{ borderRadius: 10, backgroundColor: "#0B1437", color: "#fff" }}
                  >
                    Ver recompensas
                  </button>
                </div>
              )}

              {activeDiscounts(biz).length > 0 && (
                <div className="mb-6">
                  <h2 className="flex items-center gap-2 mb-3" style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 600, fontSize: 16, color: "#0B1437" }}>
                    <Tag size={16} /> Descuentos vigentes
                  </h2>
                  <div className="flex flex-col gap-2">
                    {activeDiscounts(biz).map((d) => (
                      <div key={d.id} className="p-4" style={{ borderRadius: 18, border: "1px solid #F2C98E", background: "linear-gradient(135deg,#FFF3DC,#FBE3BC)" }}>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h3 style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 600, fontSize: 15, color: "#0B1437" }}>{d.title}</h3>
                          {d.percent && <span className="text-xs font-bold px-2 py-0.5" style={{ background: "#0B1437", color: "#2350F5", borderRadius: 20 }}>{d.percent} OFF</span>}
                        </div>
                        {d.item && <p className="text-xs mb-1" style={{ color: "#8A5B12" }}>Incluye: {d.item}</p>}
                        {d.desc && <p className="text-sm" style={{ color: "#1F2937" }}>{d.desc}</p>}
                        <p className="text-[11px] mt-1" style={{ color: "#5B6482" }}>Válido hasta el {fmtDate(d.endDate)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-2">
                <h2 className="flex items-center gap-2 mb-3" style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 600, fontSize: 16, color: "#0B1437" }}>
                  <Clock size={16} /> Horarios de atención
                </h2>
                <div className="bg-white overflow-hidden" style={{ borderRadius: 18, border: "1px solid #E3E7F1", boxShadow: "0 4px 14px rgba(11,20,55,0.05)" }}>
                  {DAYS.map((day, i) => (
                    <div key={day} className="flex items-center justify-between px-4 py-2.5 text-sm"
                      style={{ borderTop: i === 0 ? "none" : "1px solid #EEF0F6", backgroundColor: i === todayIdx ? "#EDF1FF" : "transparent", fontWeight: i === todayIdx ? 600 : 400, color: "#0B1437" }}
                    >
                      <span>{day}{i === todayIdx ? " · hoy" : ""}</span>
                      <span style={{ color: biz.weekHours[i]?.[0] === null ? "#9A3B34" : "#1F2937" }}>{fmtHours(biz.weekHours[i])}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === "opiniones" && (
            <div className="pb-6">
              <div className="bg-white p-4 mb-4" style={{ borderRadius: 18, border: "1px solid #E3E7F1", boxShadow: "0 4px 14px rgba(11,20,55,0.05)" }}>
                <p className="text-sm font-semibold mb-2" style={{ color: "#0B1437", fontFamily: "var(--fuente-titulo)" }}>Dejá tu opinión</p>
                <StarPicker value={reviewRating} onChange={setReviewRating} />
                <input
                  value={reviewName} onChange={(e) => setReviewName(e.target.value)} placeholder="Tu nombre (opcional)"
                  className="w-full border px-3 py-2 text-sm mt-3 mb-2" style={{ borderRadius: 8, borderColor: "#E3E7F1" }}
                />
                <textarea
                  value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder="Contá tu experiencia..."
                  rows={3} className="w-full border px-3 py-2 text-sm mb-2" style={{ borderRadius: 8, borderColor: "#E3E7F1" }}
                />
                <button onClick={submitReview} className="text-sm font-semibold px-4 py-2" style={{ backgroundColor: "#0B1437", color: "#fff", borderRadius: 8 }}>
                  Publicar reseña
                </button>
              </div>

              {avisoReporte && <p role="status" className="text-sm font-medium mb-3 px-3.5 py-2.5" style={{ borderRadius: 12, background: "#EDF1FF", color: "#2B3768", border: "1px solid #D6E3FB" }}>{avisoReporte}</p>}
              {biz.reviews?.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {[...biz.reviews].reverse().filter((r) => !ocultas.includes(r.id)).map((r) => (
                    <div key={r.id} className="bg-white p-4" style={{ borderRadius: 18, border: "1px solid #E3E7F1" }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{r.name}</span>
                        <span className="flex items-center gap-1.5">
                          <span className="text-xs" style={{ color: "#5B6482" }}>{fmtDate(r.date)}</span>
                          <button onClick={() => setReportandoId(reportandoId === r.id ? null : r.id)} aria-label="Reportar reseña" className="flex items-center justify-center" style={{ width: 28, height: 28, borderRadius: 9, background: reportandoId === r.id ? "#EDF1FF" : "transparent" }}>
                            <Flag size={14} color="#8D95B0" />
                          </button>
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5 mb-1.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star key={n} size={13} fill={n <= r.rating ? "#2350F5" : "none"} color={n <= r.rating ? "#2350F5" : "#D1D5DB"} />
                        ))}
                      </div>
                      <p className="text-sm mb-2" style={{ color: "#1F2937" }}>{r.text}</p>
                      {reportandoId === r.id && (
                        <div className="mb-2 p-3" style={{ borderRadius: 14, background: "#F3F5FA", border: "1px solid #E3E7F1", animation: "zona-aparecer .25s cubic-bezier(0.22,1,0.36,1) both" }}>
                          <p className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: "#0B1437" }}><EyeOff size={13} /> ¿Por qué querés reportarla? También la vas a dejar de ver.</p>
                          <div className="flex flex-wrap gap-1.5">
                            {MOTIVOS_REPORTE.map((m) => (
                              <button key={m} onClick={() => reportarResena(r, m)} className="text-xs font-semibold px-3 py-1.5" style={{ borderRadius: 999, background: "#fff", border: "1px solid #E3E7F1", color: "#0B1437" }}>{m}</button>
                            ))}
                          </div>
                        </div>
                      )}

                      {r.respuesta ? (
                        <div className="mt-2 p-3" style={{ borderRadius: 8, background: "#F3F5FA", borderLeft: "3px solid #2350F5" }}>
                          <div className="flex items-center gap-1.5 mb-1">
                            {r.respuesta.esDueño && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5" style={{ background: "#EDF1FF", color: "#2350F5", borderRadius: 6 }}>Respuesta del dueño</span>
                            )}
                            <span className="text-[11px]" style={{ color: "#64748B" }}>{fmtDate(r.respuesta.fecha)}</span>
                          </div>
                          <p className="text-sm" style={{ color: "#1F2937" }}>{r.respuesta.texto}</p>
                        </div>
                      ) : replyingId === r.id ? (
                        <div className="mt-2">
                          <textarea
                            value={replyText} onChange={(e) => setReplyText(e.target.value)} rows={2}
                            placeholder="Escribí una respuesta..."
                            className="w-full border px-3 py-2 text-sm mb-2" style={{ borderRadius: 8, borderColor: "#E3E7F1" }}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => { if (replyText.trim()) { onReplyReview(biz.id, r.id, replyText.trim(), esDueño); setReplyingId(null); setReplyText(""); } }}
                              className="text-xs font-semibold px-3 py-1.5" style={{ backgroundColor: "#2350F5", color: "#fff", borderRadius: 6 }}
                            >
                              Responder
                            </button>
                            <button onClick={() => { setReplyingId(null); setReplyText(""); }} className="text-xs font-medium px-3 py-1.5" style={{ color: "#5B6482" }}>
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => { setReplyingId(r.id); setReplyText(""); }} className="text-xs font-semibold" style={{ color: "#2350F5" }}>
                          Responder
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm" style={{ color: "#5B6482" }}>Sé el primero en dejar una reseña.</p>
              )}
            </div>
          )}

          {tab === "fotos" && (
            <div className="pb-6">
              {biz.photos?.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {biz.photos.map((src, i) => (
                    <Photo key={i} cat={biz.cat} src={src} height={140} radius="10px" iconSize={22} onOpen={onOpenPhoto} />
                  ))}
                </div>
              ) : (
                <p className="flex items-center gap-1.5 text-sm" style={{ color: "#5B6482" }}>
                  <ImageIcon size={15} /> Este negocio todavía no cargó fotos
                </p>
              )}
              {showAllPhotos && <AllPhotosModal photos={biz.photos} cat={biz.cat} onOpenPhoto={onOpenPhoto} onClose={() => setShowAllPhotos(false)} />}
            </div>
          )}

          {/* acciones principales: chat con el asistente y cómo llegar */}
          <div className="flex flex-col gap-2" style={{ paddingBottom: 100 }}>
            {tieneAsistente && (
              <button
                onClick={() => onOpenChat(biz)}
                className="flex items-center justify-center gap-2 text-sm font-semibold py-3.5 w-full"
                style={{ background: "linear-gradient(135deg,#2350F5,#5B91F7)", color: "#fff", borderRadius: 14, boxShadow: "0 8px 20px rgba(35,80,245,.35)" }}
              >
                <Sparkles size={16} /> Hablar con el asistente
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- pantallas con botón de retroceder ---------- */

// Subpantalla dentro de una pestaña (Herramientas, Ajustes...): "← Volver a ..." y su título
function SubPantalla({ titulo, desc, onBack, volverA = "Herramientas", children }) {
  return (
    <div>
      <BotonVolver texto={`Volver a ${volverA}`} onClick={onBack} />
      <h2 style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 700, fontSize: 20, color: "#0B1437" }}>{titulo}</h2>
      {desc && <p className="text-xs mt-0.5" style={{ color: "#5B6482" }}>{desc}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

// Barra de arriba de Chats, Herramientas y Ajustes: solo el título (son pestañas, como Inicio, no llevan flecha)

/* Icono de Apariencia: mitad sol, mitad luna */
function IconoSolLuna({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <defs>
        <clipPath id="zmIzq"><rect x="0" y="0" width="12" height="24" /></clipPath>
        <clipPath id="zmDer"><rect x="12" y="0" width="12" height="24" /></clipPath>
        <linearGradient id="zmSol" x1="0" y1="3" x2="0" y2="21" gradientUnits="userSpaceOnUse"><stop stopColor="#FBBF24" /><stop offset="1" stopColor="#F59E0B" /></linearGradient>
        <linearGradient id="zmLuna" x1="0" y1="3" x2="0" y2="21" gradientUnits="userSpaceOnUse"><stop stopColor="#6366F1" /><stop offset="1" stopColor="#4338CA" /></linearGradient>
      </defs>
      <circle cx="12" cy="12" r="6.6" fill="url(#zmSol)" clipPath="url(#zmIzq)" />
      <circle cx="12" cy="12" r="6.6" fill="url(#zmLuna)" clipPath="url(#zmDer)" />
      <g stroke="#F59E0B" strokeWidth="1.9" strokeLinecap="round" clipPath="url(#zmIzq)">
        <path d="M12 1.6v1.8" /><path d="M12 20.6v1.8" /><path d="M4.6 4.6l1.3 1.3" /><path d="M4.6 19.4l1.3-1.3" /><path d="M1.6 12h1.8" />
      </g>
      <path d="M15.2 9.2a3.4 3.4 0 1 0 3.2 4.6 3 3 0 0 1-3.2-4.6Z" fill="#fff" opacity=".95" />
      <circle cx="19.2" cy="8.4" r=".9" fill="#C7D2FE" /><circle cx="17.4" cy="17.6" r=".7" fill="#C7D2FE" />
      <path d="M12 5.4v13.2" stroke="#fff" strokeWidth="1.1" opacity=".9" />
    </svg>
  );
}

/* Montañas de la portada: ilustración propia, en capas, que se desvanece hacia el texto */
function PaisajePortada() {
  return (
    <svg aria-hidden="true" className="absolute pointer-events-none" viewBox="0 0 400 220" preserveAspectRatio="xMaxYMax slice" style={{ right: 0, bottom: 0, width: "100%", height: "100%", WebkitMaskImage: "linear-gradient(to right, transparent 10%, #000 58%)", maskImage: "linear-gradient(to right, transparent 10%, #000 58%)" }}>
      <defs>
        <linearGradient id="zmL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8fb0ee" /><stop offset=".6" stopColor="#4a6fc4" /><stop offset="1" stopColor="#2a4a9a" /></linearGradient>
        <linearGradient id="zmM" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3c5fb8" /><stop offset="1" stopColor="#1b3478" /></linearGradient>
        <linearGradient id="zmC" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1f3a82" /><stop offset="1" stopColor="#0e2054" /></linearGradient>
        <linearGradient id="zmF" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0f2258" /><stop offset="1" stopColor="#0a1538" /></linearGradient>
        <linearGradient id="zmB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9db9f2" stopOpacity="0" /><stop offset="1" stopColor="#9db9f2" stopOpacity=".38" /></linearGradient>
        <filter id="zmR" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4" /><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .09 0" /></filter>
      </defs>
      <circle cx="213" cy="32" r="0.5" fill="#fff" opacity="0.77"/><circle cx="309" cy="7" r="0.7" fill="#fff" opacity="0.49"/><circle cx="372" cy="41" r="0.9" fill="#fff" opacity="0.58"/><circle cx="278" cy="60" r="0.5" fill="#fff" opacity="0.70"/><circle cx="348" cy="11" r="0.9" fill="#fff" opacity="0.72"/><circle cx="384" cy="31" r="0.5" fill="#fff" opacity="0.56"/><circle cx="388" cy="61" r="0.9" fill="#fff" opacity="0.69"/><circle cx="164" cy="66" r="0.7" fill="#fff" opacity="0.51"/><circle cx="248" cy="26" r="0.9" fill="#fff" opacity="0.51"/><circle cx="311" cy="42" r="0.7" fill="#fff" opacity="0.71"/><circle cx="333" cy="8" r="0.5" fill="#fff" opacity="0.67"/><circle cx="305" cy="32" r="0.9" fill="#fff" opacity="0.56"/><circle cx="370" cy="54" r="0.5" fill="#fff" opacity="0.67"/><circle cx="327" cy="26" r="0.5" fill="#fff" opacity="0.59"/><circle cx="267" cy="68" r="0.5" fill="#fff" opacity="0.37"/><circle cx="174" cy="58" r="0.7" fill="#fff" opacity="0.43"/><circle cx="385" cy="22" r="0.9" fill="#fff" opacity="0.41"/><circle cx="303" cy="35" r="0.5" fill="#fff" opacity="0.82"/><circle cx="237" cy="16" r="0.7" fill="#fff" opacity="0.59"/><circle cx="314" cy="35" r="0.7" fill="#fff" opacity="0.70"/><circle cx="317" cy="29" r="0.9" fill="#fff" opacity="0.64"/><circle cx="394" cy="67" r="0.9" fill="#fff" opacity="0.42"/><circle cx="268" cy="38" r="0.7" fill="#fff" opacity="0.78"/><circle cx="303" cy="29" r="0.7" fill="#fff" opacity="0.69"/><circle cx="328" cy="51" r="0.5" fill="#fff" opacity="0.70"/><circle cx="335" cy="18" r="0.5" fill="#fff" opacity="0.63"/><circle cx="310" cy="19" r="0.9" fill="#fff" opacity="0.37"/><circle cx="165" cy="23" r="0.7" fill="#fff" opacity="0.36"/><circle cx="159" cy="20" r="0.7" fill="#fff" opacity="0.39"/><circle cx="171" cy="49" r="0.9" fill="#fff" opacity="0.48"/><circle cx="390" cy="37" r="0.7" fill="#fff" opacity="0.47"/><circle cx="234" cy="54" r="0.5" fill="#fff" opacity="0.79"/><circle cx="260" cy="59" r="0.5" fill="#fff" opacity="0.59"/><circle cx="333" cy="31" r="0.5" fill="#fff" opacity="0.55"/>
      <path d="M0.0 87.6 L3.1 89.5 L6.2 92.2 L9.4 93.3 L12.5 95.7 L15.6 95.3 L18.8 96.5 L21.9 97.6 L25.0 97.6 L28.1 97.2 L31.2 97.9 L34.4 99.0 L37.5 99.8 L40.6 100.6 L43.8 101.6 L46.9 100.2 L50.0 100.0 L53.1 101.3 L56.2 101.8 L59.4 100.3 L62.5 100.1 L65.6 100.6 L68.8 100.6 L71.9 99.0 L75.0 98.7 L78.1 99.5 L81.2 100.6 L84.4 100.3 L87.5 101.0 L90.6 102.0 L93.8 103.8 L96.9 106.8 L100.0 108.0 L103.1 107.2 L106.2 105.2 L109.4 104.5 L112.5 104.4 L115.6 105.5 L118.8 105.2 L121.9 105.8 L125.0 107.4 L128.1 107.1 L131.2 107.1 L134.4 109.1 L137.5 109.9 L140.6 111.1 L143.8 111.8 L146.9 111.1 L150.0 111.9 L153.1 112.5 L156.2 111.2 L159.4 110.7 L162.5 111.2 L165.6 112.7 L168.8 115.1 L171.9 116.3 L175.0 116.5 L178.1 117.3 L181.2 118.8 L184.4 120.0 L187.5 121.9 L190.6 124.4 L193.8 128.4 L196.9 129.2 L200.0 131.6 L203.1 131.9 L206.2 131.9 L209.4 130.4 L212.5 129.8 L215.6 129.6 L218.8 129.0 L221.9 130.0 L225.0 131.6 L228.1 129.2 L231.2 127.0 L234.4 126.5 L237.5 124.4 L240.6 124.9 L243.8 125.4 L246.9 124.6 L250.0 123.5 L253.1 123.9 L256.2 122.9 L259.4 122.1 L262.5 122.4 L265.6 122.4 L268.8 123.7 L271.9 123.5 L275.0 121.7 L278.1 121.2 L281.2 119.5 L284.4 118.2 L287.5 117.9 L290.6 115.9 L293.8 114.9 L296.9 115.4 L300.0 114.9 L303.1 115.4 L306.2 114.4 L309.4 113.1 L312.5 112.9 L315.6 112.5 L318.8 110.5 L321.9 109.1 L325.0 106.3 L328.1 106.5 L331.2 106.3 L334.4 107.0 L337.5 108.0 L340.6 106.9 L343.8 107.3 L346.9 107.5 L350.0 109.4 L353.1 110.3 L356.2 109.4 L359.4 109.5 L362.5 110.5 L365.6 111.5 L368.8 111.7 L371.9 110.3 L375.0 109.7 L378.1 109.2 L381.2 107.6 L384.4 105.8 L387.5 103.6 L390.6 101.0 L393.8 99.2 L396.9 97.8 L400.0 97.5 L400 220 L0 220Z" fill="url(#zmL)" opacity=".85" />
      <path d="" fill="#fff" opacity=".55" />
      <rect x="0" y="80" width="400" height="70" fill="url(#zmB)" />
      <path d="M0.0 145.6 L3.1 143.3 L6.2 142.3 L9.4 141.6 L12.5 140.0 L15.6 139.1 L18.8 139.6 L21.9 138.0 L25.0 136.1 L28.1 136.1 L31.2 136.3 L34.4 137.2 L37.5 139.0 L40.6 139.0 L43.8 138.3 L46.9 137.9 L50.0 137.4 L53.1 137.5 L56.2 137.2 L59.4 137.1 L62.5 135.6 L65.6 134.0 L68.8 133.1 L71.9 129.9 L75.0 128.2 L78.1 128.0 L81.2 128.4 L84.4 128.0 L87.5 127.1 L90.6 126.2 L93.8 126.3 L96.9 124.7 L100.0 124.2 L103.1 124.4 L106.2 123.3 L109.4 122.1 L112.5 120.5 L115.6 119.6 L118.8 118.8 L121.9 117.4 L125.0 114.6 L128.1 113.2 L131.2 112.3 L134.4 111.9 L137.5 110.9 L140.6 109.6 L143.8 109.2 L146.9 107.6 L150.0 106.3 L153.1 105.7 L156.2 104.1 L159.4 102.5 L162.5 99.6 L165.6 100.1 L168.8 99.5 L171.9 98.1 L175.0 97.1 L178.1 96.5 L181.2 95.7 L184.4 94.9 L187.5 94.8 L190.6 95.4 L193.8 97.2 L196.9 97.5 L200.0 97.8 L203.1 98.7 L206.2 98.5 L209.4 98.3 L212.5 97.0 L215.6 98.7 L218.8 99.6 L221.9 101.5 L225.0 101.8 L228.1 103.7 L231.2 106.2 L234.4 107.5 L237.5 109.9 L240.6 110.4 L243.8 111.1 L246.9 111.8 L250.0 113.1 L253.1 112.7 L256.2 113.2 L259.4 112.9 L262.5 112.9 L265.6 112.6 L268.8 111.9 L271.9 111.1 L275.0 110.2 L278.1 110.0 L281.2 110.3 L284.4 112.2 L287.5 113.0 L290.6 113.3 L293.8 112.1 L296.9 111.1 L300.0 110.3 L303.1 108.9 L306.2 108.8 L309.4 105.8 L312.5 104.2 L315.6 105.3 L318.8 105.1 L321.9 103.7 L325.0 103.7 L328.1 103.6 L331.2 102.8 L334.4 101.7 L337.5 100.4 L340.6 98.7 L343.8 97.6 L346.9 97.0 L350.0 95.5 L353.1 94.4 L356.2 94.9 L359.4 93.3 L362.5 92.8 L365.6 92.3 L368.8 91.8 L371.9 90.4 L375.0 90.4 L378.1 91.5 L381.2 91.6 L384.4 92.0 L387.5 93.3 L390.6 93.3 L393.8 94.4 L396.9 93.2 L400.0 93.5 L400 220 L0 220Z" fill="url(#zmM)" opacity=".92" />
      <rect x="0" y="120" width="400" height="60" fill="url(#zmB)" opacity=".7" />
      <path d="M0.0 175.8 L3.1 176.0 L6.2 177.1 L9.4 177.1 L12.5 177.1 L15.6 178.2 L18.8 178.7 L21.9 178.9 L25.0 178.3 L28.1 179.6 L31.2 180.4 L34.4 182.1 L37.5 182.7 L40.6 183.8 L43.8 184.8 L46.9 186.0 L50.0 186.2 L53.1 184.8 L56.2 184.5 L59.4 184.0 L62.5 184.1 L65.6 183.3 L68.8 182.5 L71.9 180.9 L75.0 179.8 L78.1 180.6 L81.2 180.8 L84.4 180.7 L87.5 180.3 L90.6 180.9 L93.8 181.4 L96.9 182.0 L100.0 181.7 L103.1 182.4 L106.2 183.0 L109.4 182.9 L112.5 183.2 L115.6 182.5 L118.8 182.0 L121.9 182.4 L125.0 182.1 L128.1 183.6 L131.2 184.1 L134.4 183.8 L137.5 184.3 L140.6 184.9 L143.8 184.7 L146.9 184.3 L150.0 182.9 L153.1 182.9 L156.2 182.9 L159.4 181.9 L162.5 180.8 L165.6 180.8 L168.8 181.6 L171.9 182.0 L175.0 182.3 L178.1 182.6 L181.2 182.8 L184.4 182.6 L187.5 182.1 L190.6 180.3 L193.8 179.7 L196.9 179.4 L200.0 178.1 L203.1 178.2 L206.2 178.4 L209.4 177.5 L212.5 176.8 L215.6 176.8 L218.8 176.1 L221.9 174.9 L225.0 173.7 L228.1 173.2 L231.2 172.8 L234.4 172.9 L237.5 172.5 L240.6 172.1 L243.8 172.7 L246.9 173.7 L250.0 174.7 L253.1 174.6 L256.2 174.7 L259.4 175.5 L262.5 175.1 L265.6 175.9 L268.8 175.6 L271.9 175.5 L275.0 175.9 L278.1 177.0 L281.2 178.1 L284.4 178.1 L287.5 179.0 L290.6 179.4 L293.8 180.0 L296.9 180.9 L300.0 181.0 L303.1 180.7 L306.2 179.5 L309.4 179.7 L312.5 180.0 L315.6 179.0 L318.8 178.5 L321.9 176.6 L325.0 175.5 L328.1 174.6 L331.2 173.5 L334.4 174.0 L337.5 173.4 L340.6 173.1 L343.8 173.7 L346.9 173.4 L350.0 172.5 L353.1 171.4 L356.2 171.4 L359.4 171.2 L362.5 171.7 L365.6 170.8 L368.8 170.6 L371.9 170.7 L375.0 170.3 L378.1 170.2 L381.2 170.4 L384.4 169.6 L387.5 169.2 L390.6 167.8 L393.8 166.2 L396.9 165.0 L400.0 164.8 L400 220 L0 220Z" fill="url(#zmC)" />
      <path d="M0.0 203.4 L3.1 203.5 L6.2 203.7 L9.4 203.7 L12.5 203.2 L15.6 202.6 L18.8 202.2 L21.9 201.8 L25.0 201.4 L28.1 201.2 L31.2 200.9 L34.4 200.3 L37.5 199.7 L40.6 199.4 L43.8 199.0 L46.9 198.8 L50.0 199.2 L53.1 199.0 L56.2 198.4 L59.4 198.4 L62.5 197.9 L65.6 197.1 L68.8 196.8 L71.9 196.1 L75.0 195.4 L78.1 195.3 L81.2 194.9 L84.4 195.2 L87.5 195.7 L90.6 195.0 L93.8 194.7 L96.9 194.4 L100.0 194.5 L103.1 194.7 L106.2 194.8 L109.4 194.4 L112.5 194.6 L115.6 194.7 L118.8 194.2 L121.9 193.7 L125.0 192.8 L128.1 193.2 L131.2 193.4 L134.4 193.3 L137.5 192.8 L140.6 192.9 L143.8 192.8 L146.9 193.2 L150.0 193.7 L153.1 193.8 L156.2 193.7 L159.4 193.7 L162.5 193.7 L165.6 194.3 L168.8 194.4 L171.9 194.6 L175.0 194.4 L178.1 194.5 L181.2 194.8 L184.4 195.3 L187.5 195.2 L190.6 195.2 L193.8 194.8 L196.9 194.6 L200.0 194.0 L203.1 193.5 L206.2 192.7 L209.4 192.3 L212.5 192.1 L215.6 192.0 L218.8 191.3 L221.9 191.7 L225.0 191.6 L228.1 191.3 L231.2 190.7 L234.4 191.0 L237.5 190.9 L240.6 190.0 L243.8 188.8 L246.9 188.3 L250.0 187.9 L253.1 188.1 L256.2 187.9 L259.4 187.6 L262.5 187.9 L265.6 187.3 L268.8 187.0 L271.9 186.5 L275.0 186.0 L278.1 185.3 L281.2 185.2 L284.4 184.6 L287.5 184.1 L290.6 184.0 L293.8 183.6 L296.9 183.8 L300.0 183.9 L303.1 183.6 L306.2 183.5 L309.4 184.0 L312.5 183.9 L315.6 184.2 L318.8 184.2 L321.9 184.6 L325.0 185.1 L328.1 185.3 L331.2 185.3 L334.4 185.1 L337.5 184.7 L340.6 184.6 L343.8 184.5 L346.9 183.8 L350.0 183.2 L353.1 183.7 L356.2 183.6 L359.4 183.4 L362.5 183.1 L365.6 183.2 L368.8 183.1 L371.9 183.7 L375.0 184.1 L378.1 183.8 L381.2 183.0 L384.4 182.7 L387.5 183.1 L390.6 183.6 L393.8 184.0 L396.9 184.1 L400.0 183.9 L400 220 L0 220Z" fill="url(#zmF)" />
      <rect width="400" height="220" filter="url(#zmR)" />
    </svg>
  );
}

function BarraTitulo({ titulo, sub, notifSinLeer = 0, onOpenNotificaciones, buscador }) {
  return (
    <div data-conservar-color className="sticky top-0 z-40" style={{ background: "radial-gradient(420px 220px at 105% -20%, rgba(54,104,255,.55), transparent 60%), radial-gradient(260px 160px at -10% 120%, rgba(23,198,255,.22), transparent 60%), #0a1235", borderRadius: 0 }}>
      <div className="max-w-6xl mx-auto px-4 pt-3 pb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center" style={{ width: 32, height: 32, borderRadius: 11, background: "linear-gradient(135deg,#2350F5,#7FA8F5)", boxShadow: "0 4px 12px rgba(35,80,245,.5)" }}>
              <MapPin size={17} color="#fff" />
            </span>
            <span style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 700, fontSize: 19, color: "#fff", letterSpacing: -0.3 }}>
              Mi<span style={{ color: "#7FA8F5" }}>Zona</span>
            </span>
          </div>
          {onOpenNotificaciones && (
            <button onClick={onOpenNotificaciones} aria-label="Notificaciones" className="relative flex items-center justify-center shrink-0" style={{ width: 38, height: 38, borderRadius: 12, background: "#ffffff1a" }}>
              <Bell size={17} color="#fff" />
              {notifSinLeer > 0 && (
                <span className="absolute flex items-center justify-center text-[9px] font-bold" style={{ top: -5, right: -5, minWidth: 17, height: 17, borderRadius: 9, background: "#E5484D", color: "#fff", padding: "0 4px", border: "2px solid #0B1437" }}>
                  {notifSinLeer > 9 ? "9+" : notifSinLeer}
                </span>
              )}
            </button>
          )}
        </div>
        <h1 className="mt-4" style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 800, fontSize: 28, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1.1 }}>{titulo}</h1>
        {sub && <p className="text-sm mt-1" style={{ color: "#BBD1FB" }}>{sub}</p>}
        {buscador && (
          <div className="flex items-center gap-2.5 px-4 mt-4" style={{ borderRadius: 16, background: "#ffffff1f", border: "1px solid #ffffff33" }}>
            <Search size={17} color="#BBD1FB" className="shrink-0" />
            <input
              value={buscador.valor} onChange={(e) => buscador.onChange(e.target.value)} maxLength={60}
              placeholder={buscador.placeholder} aria-label={buscador.placeholder}
              className="w-full outline-none text-sm bg-transparent py-3" style={{ color: "#fff" }}
            />
            {buscador.valor && <button onClick={() => buscador.onChange("")} aria-label="Borrar búsqueda" className="shrink-0"><X size={16} color="#BBD1FB" /></button>}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- header público ---------- */

function PublicHeader({ zone, setZone, query, setQuery, activeCat, setActiveCat, onOpenAllCats, onOpenOwner, onHerramientas, onAjustes, onAyuda, onSoporte, notifSinLeer = 0, onOpenNotificaciones }) {
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [pendingZone, setPendingZone] = useState(zone);
  const [showDrawer, setShowDrawer] = useState(false);
  const [historial, setHistorial] = useState(() => getSearchHistory());
  return (
    <>
      {/* barra superior fija: menú, logo y notificaciones */}
      <div data-conservar-color className="sticky top-0 z-40" style={{ backgroundColor: "#0B1437", boxShadow: "0 2px 14px rgba(11,20,55,0.25)" }}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowDrawer(true)} aria-label="Menú"
              className="flex items-center justify-center shrink-0"
              style={{ width: 38, height: 38, borderRadius: 12, background: "#ffffff1a" }}
            >
              <Menu size={18} color="#fff" />
            </button>
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center" style={{ width: 30, height: 30, borderRadius: 10, background: "linear-gradient(135deg,#2350F5,#7FA8F5)", boxShadow: "0 4px 12px rgba(35,80,245,.5)" }}>
                <MapPin size={16} color="#fff" />
              </span>
              <span style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 700, fontSize: 19, color: "#fff", letterSpacing: -0.3 }}>
                Mi<span style={{ color: "#7FA8F5" }}>Zona</span>
              </span>
            </div>
          </div>
          <button
            onClick={onOpenNotificaciones} aria-label="Notificaciones"
            className="relative flex items-center justify-center shrink-0"
            style={{ width: 38, height: 38, borderRadius: 12, background: "#ffffff1a" }}
          >
            <Bell size={17} color="#fff" />
            {notifSinLeer > 0 && (
              <span
                className="absolute flex items-center justify-center text-[9px] font-bold"
                style={{ top: -5, right: -5, minWidth: 17, height: 17, borderRadius: 9, background: "#E5484D", color: "#fff", padding: "0 4px", border: "2px solid #0B1437" }}
              >
                {notifSinLeer > 9 ? "9+" : notifSinLeer}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* portada: saludo, buscador y zona */}
      <div data-conservar-color className="relative overflow-hidden" style={{ background: "radial-gradient(420px 220px at 105% -20%, rgba(54,104,255,.55), transparent 60%), radial-gradient(260px 160px at -10% 120%, rgba(23,198,255,.22), transparent 60%), #0a1235" }}>
        <div style={{ position: "absolute", top: -70, right: -60, width: 220, height: 220, borderRadius: "50%", background: "#ffffff0d" }} />
        <div style={{ position: "absolute", bottom: -30, left: -60, width: 160, height: 160, borderRadius: "50%", background: "#7FA8F51a" }} />
        <PaisajePortada />
        <div className="relative max-w-6xl mx-auto px-4 pt-3 pb-12">
          <p style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 700, fontSize: 24, color: "#fff", lineHeight: 1.2, letterSpacing: -0.4 }}>
            Descubrí lo mejor<br />de tu zona
          </p>
          <p className="text-sm mt-1.5 mb-4" style={{ color: "#B8C9EA", maxWidth: 380 }}>
            Negocios, productos y servicios cerca tuyo, con reseñas reales.
          </p>

          <div className="flex items-center gap-2.5 bg-white px-4 py-3" style={{ borderRadius: 16, boxShadow: "0 10px 28px rgba(5,20,45,0.35)" }}>
            <Search size={18} color="#2350F5" />
            <input
              value={query} onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && query.trim()) { addSearchHistory(query); setHistorial(getSearchHistory()); e.target.blur(); } }}
              onBlur={() => { if (query.trim()) { addSearchHistory(query); setHistorial(getSearchHistory()); } }}
              placeholder="Buscá un negocio, producto o servicio..."
              className="w-full outline-none text-sm bg-transparent" style={{ color: "#0B1437" }}
            />
            {query && <button onClick={() => setQuery("")} aria-label="Borrar búsqueda"><X size={15} color="#5B6482" /></button>}
          </div>

          {!query && historial.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto">
              {historial.map((h) => (
                <button
                  key={h} onClick={() => setQuery(h)}
                  className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 shrink-0"
                  style={{ borderRadius: 20, background: "#ffffff1a", color: "#DCE7FB" }}
                >
                  <Clock size={10} /> {h}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => setShowZoneModal(true)}
            className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold px-3 py-1.5"
            style={{ color: "#fff", borderRadius: 20, background: "#ffffff1a", border: "1px solid #ffffff26" }}
          >
            <MapPin size={13} color="#7FA8F5" /> {zone} <ChevronDown size={12} />
          </button>
        </div>
      </div>

      {showDrawer && (
        <DrawerMenu
          onClose={() => setShowDrawer(false)}
          onHerramientas={() => { setShowDrawer(false); onHerramientas(); }}
          onAjustes={() => { setShowDrawer(false); onAjustes(); }}
          onAyuda={() => { setShowDrawer(false); onAyuda(); }}
          onSoporte={() => { setShowDrawer(false); onSoporte(); }}
          onOpenOwner={() => { setShowDrawer(false); onOpenOwner(); }}
        />
      )}

      {showZoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "#0B143766" }} onClick={() => setShowZoneModal(false)}>
          <div className="bg-white w-full max-w-sm p-5" style={{ borderRadius: 14, boxShadow: "0 12px 40px #00000033" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <span style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 500, fontSize: 16, color: "#0B1437" }}>¿Dónde estás?</span>
              <button onClick={() => setShowZoneModal(false)}><X size={18} color="#5B6482" /></button>
            </div>
            <ZonePicker value={pendingZone} onChange={setPendingZone} />
            <button
              onClick={() => { if (pendingZone) { setZone(pendingZone); setShowZoneModal(false); } }}
              disabled={!pendingZone}
              className="w-full text-sm font-semibold py-3 mt-4"
              style={{ backgroundColor: "#2350F5", color: "#fff", borderRadius: 10, opacity: pendingZone ? 1 : 0.5 }}
            >
              Confirmar ubicación
            </button>
          </div>
        </div>
      )}

      {/* categorías: tarjeta flotante que se superpone a la portada */}
      <div className="max-w-6xl mx-auto px-4" style={{ marginTop: -26, position: "relative", zIndex: 5 }}>
        <div className="bg-white px-4 pt-3.5 pb-3" style={{ borderRadius: 22, border: "1px solid #E3E7F1", boxShadow: "0 12px 32px rgba(11,20,55,0.12)" }}>
          <div className="flex items-center justify-between mb-3">
            <span style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 600, fontSize: 15, color: "#0B1437" }}>Categorías</span>
            <button onClick={onOpenAllCats} className="text-xs font-semibold px-2.5 py-1" style={{ color: "#2350F5", background: "#EDF1FF", borderRadius: 20 }}>Ver todas</button>
          </div>
          <div className="flex gap-3.5 overflow-x-auto pb-1">
            <button onClick={() => setActiveCat(null)} className="flex flex-col items-center gap-1.5 shrink-0" style={{ width: 64 }}>
              <span className="flex items-center justify-center" style={{ width: 52, height: 52, borderRadius: 18, background: activeCat === null ? "linear-gradient(135deg,#2350F5,#5B91F7)" : "#EEF3FB", boxShadow: activeCat === null ? "0 8px 18px #2350F555" : "none", transition: "all .2s" }}>
                <Grid3x3 size={21} color={activeCat === null ? "#fff" : "#2350F5"} />
              </span>
              <span className="text-[11px] text-center font-medium" style={{ color: activeCat === null ? "#0B1437" : "#2B3768" }}>Todos</span>
            </button>
            {QUICK_CATEGORIES.map((c) => {
              const Icon = c.icon;
              const active = activeCat === c.id;
              return (
                <button key={c.id} onClick={() => setActiveCat(active ? null : c.id)} className="flex flex-col items-center gap-1.5 shrink-0" style={{ width: 64 }}>
                  <span className="flex items-center justify-center" style={{ width: 52, height: 52, borderRadius: 18, background: active ? `linear-gradient(135deg, ${c.color}, ${c.color}cc)` : `${c.color}17`, boxShadow: active ? `0 8px 18px ${c.color}55` : "none", transition: "all .2s" }}>
                    <Icon size={21} color={active ? "#fff" : c.color} />
                  </span>
                  <span className="text-[11px] text-center leading-tight font-medium" style={{ color: active ? "#0B1437" : "#2B3768" }}>{c.label.split(" ")[0]}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

function DrawerMenu({ onClose, onHerramientas, onAjustes, onAyuda, onSoporte, onOpenOwner }) {
  const Item = ({ Icon, label, onClick, danger }) => (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-5 py-3 text-left" style={{ color: danger ? "#9A3B34" : "#0B1437" }}>
      <Icon size={18} color={danger ? "#9A3B34" : "#0B1437"} />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "#0B143766" }} />
      <div
        className="absolute top-0 left-0 bottom-0 bg-white flex flex-col"
        style={{ width: "min(78vw, 300px)", boxShadow: "6px 0 30px #00000033" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div data-conservar-color className="p-5 pt-7" style={{ background: "radial-gradient(420px 220px at 105% -20%, rgba(54,104,255,.55), transparent 60%), radial-gradient(260px 160px at -10% 120%, rgba(23,198,255,.22), transparent 60%), #0a1235" }}>
          <div
            className="flex items-center justify-center mb-3"
            style={{ width: 54, height: 54, borderRadius: 18, background: "linear-gradient(135deg, #2350F5, #7FA8F5)", boxShadow: "0 8px 20px rgba(35,80,245,.45)" }}
          >
            <MapPin size={26} color="#fff" />
          </div>
          <p style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 700, fontSize: 18, color: "#fff" }}>Mi<span style={{ color: "#9BBBF7" }}>Zona</span></p>
          <p className="text-xs mt-0.5" style={{ color: "#BBD1FB" }}>Explorá los negocios de tu zona</p>
        </div>
        <div className="py-2 flex-1 overflow-y-auto">
          <Item Icon={Wrench} label="Herramientas" onClick={onHerramientas} />
          <Item Icon={Settings} label="Ajustes" onClick={onAjustes} />
          <Item Icon={Building2} label="Mi negocio" onClick={onOpenOwner} />
          <div style={{ borderTop: "1px solid #EEF0F6", margin: "8px 0" }} />
          <Item Icon={Share2} label="Invitar amigos" onClick={async () => {
            const data = { title: "Mi Zona", text: "Descubrí negocios de tu zona con Mi Zona", url: window.location.origin };
            if (navigator.share) { try { await navigator.share(data); } catch {} }
            else { try { await navigator.clipboard.writeText(window.location.origin); alert("Enlace copiado al portapapeles"); } catch {} }
            onClose();
          }} />
          <Item Icon={MessageCircle} label="Centro de ayuda" onClick={onAyuda} />
          <Item Icon={Send} label="Soporte" onClick={onSoporte} />
        </div>
        <button onClick={onClose} className="flex items-center gap-1.5 justify-center text-xs font-medium py-4" style={{ color: "#5B6482", borderTop: "1px solid #EEF0F6" }}>
          <X size={13} /> Cerrar menú
        </button>
      </div>
    </div>
  );
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

const normalizar = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// Hora del día si es de hoy · "Ayer" · día de la semana con hora (últimos 6 días) · fecha
function fmtChatLista(iso) {
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

function IlustracionChats() {
  return (
    <svg width="168" height="132" viewBox="0 0 168 132" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="zcA" x1="20" y1="14" x2="96" y2="84" gradientUnits="userSpaceOnUse"><stop stopColor="#6FA0FF" /><stop offset="1" stopColor="#2350F5" /></linearGradient>
        <linearGradient id="zcB" x1="70" y1="48" x2="140" y2="116" gradientUnits="userSpaceOnUse"><stop stopColor="#F4F8FF" /><stop offset="1" stopColor="#CFE0FB" /></linearGradient>
      </defs>
      <ellipse cx="84" cy="116" rx="62" ry="10" fill="#2350F5" opacity=".10" />
      <path d="M78 50a20 20 0 0 1 20-20h28a20 20 0 0 1 20 20v22a20 20 0 0 1-20 20h-6l-12 14v-14h-10a20 20 0 0 1-20-20Z" fill="url(#zcB)" />
      <path d="M22 36a22 22 0 0 1 22-22h40a22 22 0 0 1 22 22v28a22 22 0 0 1-22 22H62L44 106V86h0a22 22 0 0 1-22-22Z" fill="url(#zcA)" />
      <circle cx="46" cy="50" r="5" fill="#fff" /><circle cx="64" cy="50" r="5" fill="#fff" /><circle cx="82" cy="50" r="5" fill="#fff" />
      <path d="M126 14l6-9M136 24l10-5M138 36l11 0" stroke="#6FA0FF" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

function ChatsScreen({ businesses, onOpenChat, query = "" }) {
  const conversaciones = useMemo(() => {
    return getAllConversationIds()
      .map((id) => {
        const biz = businesses.find((b) => b.id === id);
        if (!biz || !(biz.asistenteCodigoPublico && biz.asistenteActivo)) return null; // sin Mi Asistente pago no hay chat
        const mensajes = getConversation(id);
        if (mensajes.length === 0) return null;
        const ultimo = mensajes[mensajes.length - 1];
        const visto = getLastSeen(id);
        const sinLeer = mensajes.filter((m) => m.rol === "asistente" && (!visto || new Date(m.hora) > new Date(visto))).length;
        const noLeido = ultimo.rol === "asistente" && (!visto || new Date(ultimo.hora) > new Date(visto));
        return { biz, ultimo, noLeido, sinLeer: Math.max(sinLeer, noLeido ? 1 : 0) };
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.ultimo.hora) - new Date(a.ultimo.hora));
  }, [businesses]);

  const q = normalizar(query.trim());
  const visibles = q ? conversaciones.filter(({ biz, ultimo }) => normalizar(biz.name).includes(q) || normalizar(ultimo.texto).includes(q)) : conversaciones;

  return (
    <div>
      {conversaciones.length === 0 ? (
        <div className="text-center flex flex-col items-center" style={{ paddingTop: 36 }}>
          <IlustracionChats />
          <p className="mt-4 mb-1.5" style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 800, fontSize: 20, letterSpacing: "-0.01em", color: "#0B1437" }}>Todavía no tenés conversaciones</p>
          <p className="text-sm px-6" style={{ color: "#5B6482", lineHeight: 1.55, maxWidth: 340 }}>Abrí el chat con el asistente de un negocio y la conversación va a aparecer acá.</p>
        </div>
      ) : visibles.length === 0 ? (
        <div className="text-center py-14">
          <span className="flex items-center justify-center mx-auto mb-3" style={{ width: 56, height: 56, borderRadius: 18, background: "#F1F4FA", boxShadow: "inset 0 0 0 1px #E3E7F1" }}><Search size={24} color="#8D95B0" /></span>
          <p className="text-sm font-semibold mb-1" style={{ color: "#0B1437" }}>No encontramos chats para “{query.trim()}”</p>
          <p className="text-xs px-8" style={{ color: "#5B6482" }}>Probá con el nombre del negocio o con otra palabra del mensaje.</p>
        </div>
      ) : (
        <div className="flex flex-col">
          {visibles.map(({ biz, ultimo, noLeido, sinLeer }, i) => {
            const c = catInfo(biz.cat);
            const CatIcon = c?.icon;
            const abierto = isOpenNow(biz.weekHours);
            return (
              <button
                key={biz.id}
                onClick={() => onOpenChat(biz)}
                className="w-full flex items-center gap-3.5 px-3 py-3.5 text-left"
                style={{ borderRadius: noLeido ? 18 : 0, background: noLeido ? "#EEF4FF" : "transparent", borderBottom: !noLeido && i < visibles.length - 1 && !(visibles[i + 1] && visibles[i + 1].noLeido) ? "1px solid #EEF0F6" : "1px solid transparent" }}
              >
                <div className="relative shrink-0">
                  {biz.logo ? (
                    <img src={biz.logo} alt="" className="object-cover" style={{ width: 56, height: 56, borderRadius: "50%", boxShadow: "0 0 0 1px rgba(11,20,55,.08)" }} />
                  ) : (
                    <div className="flex items-center justify-center" style={{ width: 56, height: 56, borderRadius: "50%", background: c?.color || "#2350F5", color: "#fff", boxShadow: "inset 0 1px 0 rgba(255,255,255,.25)" }}>
                      {CatIcon ? <CatIcon size={24} color="#fff" /> : <span className="text-lg font-bold">{biz.name?.[0]?.toUpperCase()}</span>}
                    </div>
                  )}
                  {abierto && <span aria-label="Abierto ahora" className="absolute" style={{ right: 0, bottom: 1, width: 14, height: 14, borderRadius: "50%", background: "#22C55E", border: "2.5px solid #fff" }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate" style={{ fontFamily: "var(--fuente-titulo)", fontSize: 16, color: "#0B1437", fontWeight: noLeido ? 800 : 700 }}>{biz.name}</span>
                    <span className="text-xs shrink-0" style={{ color: noLeido ? "#2350F5" : "#5B6482", fontWeight: noLeido ? 600 : 400 }}>{fmtChatLista(ultimo.hora)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <span className="text-[13px]" style={{ color: noLeido ? "#1D2939" : "#5B6482", fontWeight: noLeido ? 500 : 400, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {ultimo.rol === "cliente" ? "Vos: " : ""}{ultimo.texto}
                    </span>
                    {noLeido ? (
                      <span className="shrink-0 flex items-center justify-center text-xs font-bold" style={{ minWidth: 24, height: 24, borderRadius: 12, background: "#2350F5", color: "#fff", padding: "0 7px", boxShadow: "0 4px 10px -3px rgba(35,80,245,.7)" }}>{sinLeer}</span>
                    ) : ultimo.rol === "asistente" ? (
                      <CheckCheck size={16} color="#2350F5" className="shrink-0" />
                    ) : null}
                  </div>
                </div>
                <ChevronDown size={16} color="#B9C0D6" className="shrink-0" style={{ transform: "rotate(-90deg)" }} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FavoritosScreen({ businesses, favorites, onToggleFavorite, onOpenBusiness, onBack }) {
  const guardados = businesses.filter((b) => favorites.includes(b.id) && b.kind !== "job");

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <BotonAtras onClick={onBack} tono="oscuro" size={36} />
        <p style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 500, fontSize: 16, color: "#0B1437" }}>Favoritos</p>
      </div>
      <p className="text-xs mb-5" style={{ color: "#5B6482" }}>Tus negocios guardados</p>

      {guardados.length === 0 ? (
        <div className="text-center py-14">
          <span className="flex items-center justify-center mx-auto mb-3" style={{ width: 52, height: 52, borderRadius: "50%", background: "#FDF1EF" }}>
            <Heart size={22} color="#C1443A" />
          </span>
          <p className="text-sm font-semibold mb-1" style={{ color: "#0B1437" }}>Todavía no guardaste ningún negocio</p>
          <p className="text-xs" style={{ color: "#5B6482" }}>Tocá el corazón en cualquier negocio para guardarlo acá.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {guardados.map((biz) => {
            const c = catInfo(biz.cat);
            const rating = avgRating(biz.reviews);
            return (
              <button
                key={biz.id}
                onClick={() => onOpenBusiness(biz.id)}
                className="w-full flex items-center gap-3 p-3 text-left bg-white"
                style={{ borderRadius: 14, border: "1px solid #E3E7F1", boxShadow: "0 3px 14px rgba(11,20,55,0.07)" }}
              >
                <div style={{ width: 52, height: 52, borderRadius: 12, overflow: "hidden", flexShrink: 0 }}>
                  <Photo cat={biz.cat} src={biz.logo || biz.photos?.[0]} height={52} radius="12px" iconSize={22} clickable={false} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: "#0B1437" }}>{biz.name}</p>
                  <p className="text-xs truncate mb-1" style={{ color: "#5B6482" }}>{c?.label} · {biz.zone}</p>
                  <div className="flex items-center gap-2">
                    {rating && (
                      <span className="flex items-center gap-0.5 text-xs" style={{ color: "#2B3768" }}>
                        <Star size={11} fill="#F5A623" color="#F5A623" /> {rating}
                      </span>
                    )}
                    <OpenBadge weekHours={biz.weekHours} compact />
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleFavorite(biz.id); }}
                  className="flex items-center justify-center shrink-0"
                  style={{ width: 36, height: 36, borderRadius: "50%", background: "#FDF1EF" }}
                >
                  <Heart size={16} color="#C1443A" fill="#C1443A" />
                </button>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------- mapa profesional de Mi Zona (solo negocios registrados) ---------- */

// Marcador con el LOGO del negocio (o su inicial sobre el color del rubro si todavía no cargó logo)
// Capas del mapa, todas gratuitas y sin clave. Solo se dibujan los negocios registrados en Mi Zona (marcadores propios).
//  · Mapa: calles claras al estilo Google Maps  · Relieve: sombreado de cerros, vegetación, ríos  · Satélite: fotos aéreas + nombres de calles
const CAPAS_MAPA = {
  mapa: {
    label: "Mapa", muestra: "linear-gradient(135deg,#EAF1E4 0%,#F6F1E6 45%,#CFE3F5 100%)",
    atribucion: "© OpenStreetMap · © CARTO",
    capas: [{ url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", opciones: { maxZoom: 19, subdomains: "abcd", detectRetina: true } }],
  },
  relieve: {
    label: "Relieve", muestra: "linear-gradient(135deg,#BFD8A2 0%,#E4D9B0 45%,#9CBFA0 100%)",
    atribucion: "Tiles © Esri — Esri, USGS, NOAA, HERE, Garmin, OpenStreetMap contributors",
    capas: [{ url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}", opciones: { maxZoom: 19, maxNativeZoom: 17 } }],
  },
  satelite: {
    label: "Satélite", muestra: "linear-gradient(135deg,#27402B 0%,#5D5A3A 45%,#2F4A5E 100%)",
    atribucion: "Imágenes © Esri, Maxar, Earthstar Geographics · Nombres © Esri",
    capas: [
      { url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", opciones: { maxZoom: 19, maxNativeZoom: 18 } },
      { url: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}", opciones: { maxZoom: 19, maxNativeZoom: 17, opacity: 0.9 } },
      { url: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", opciones: { maxZoom: 19, maxNativeZoom: 17 } },
    ],
  },
};

function crearIconoNegocio(b, seleccionado, mostrarNombre = true) {
  const c = catInfo(b.cat);
  const color = c?.color || "#2350F5";
  const size = seleccionado ? 54 : 42;
  const inicial = escapeHtml((b.name || "?").trim().charAt(0).toUpperCase());
  const logo = b.logo || b.photos?.[0];
  const img = logo
    ? `<img src="${escapeHtml(logo)}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:50%;background:#fff" onerror="this.style.display='none'" />`
    : "";
  const nombre = escapeHtml((b.name || "").length > 22 ? `${b.name.slice(0, 21)}…` : b.name || "");
  const etiqueta = mostrarNombre || seleccionado
    ? `<div style="position:absolute;left:50%;top:${size + 12}px;transform:translateX(-50%);white-space:nowrap;max-width:170px;overflow:hidden;text-overflow:ellipsis;
        background:#fff;color:#0B1437;font:600 11px 'Work Sans',sans-serif;padding:3px 8px;border-radius:10px;
        box-shadow:0 2px 8px rgba(11,20,55,.28);border:1px solid #E3E7F1">${nombre}</div>`
    : "";
  const html = `
    <div style="position:relative;width:${size}px;height:${size + 10}px">
      <div style="position:relative;width:${size}px;height:${size}px;border-radius:50%;background:${color};border:3px solid #fff;
        box-shadow:0 4px 12px rgba(11,20,55,.4)${seleccionado ? `,0 0 0 4px ${color}55` : ""};overflow:hidden;
        display:flex;align-items:center;justify-content:center;color:#fff;font:700 ${Math.round(size * 0.4)}px Poppins,sans-serif">
        ${inicial}${img}
      </div>
      <div style="position:absolute;left:50%;top:${size - 3}px;transform:translateX(-50%);width:0;height:0;border-left:7px solid transparent;
        border-right:7px solid transparent;border-top:11px solid #fff;filter:drop-shadow(0 2px 2px rgba(11,20,55,.25))"></div>
      ${etiqueta}
    </div>`;
  return L.divIcon({ className: "", html, iconSize: [size, size + 10], iconAnchor: [size / 2, size + 10] });
}

function MapaScreen({ businesses, zone, favorites, onToggleFavorite, onOpenBusiness, onBack, userLoc, locStatus, onRequestLocation, initialFilters, onTrack }) {
  const mapDivRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const userMarkerRef = useRef(null);
  const [vista, setVista] = useState("mapa"); // mapa | lista
  const [filtros, setFiltros] = useState({
    cat: null, abiertos: false, delivery: false, promos: false, asistente: false, nuevos: false, favoritos: false,
    ...(initialFilters || {}),
  });
  const [showCats, setShowCats] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [quiereUbicarme, setQuiereUbicarme] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [zoom, setZoom] = useState(12);
  const [capa, setCapa] = useState(() => { try { const c = localStorage.getItem("miZonaCapaMapa"); return CAPAS_MAPA[c] ? c : "mapa"; } catch { return "mapa"; } });
  const [capasAbierto, setCapasAbierto] = useState(false);
  const capasRef = useRef([]);
  const verNombres = zoom >= 14; // con el mapa muy alejado solo se ven los círculos, para que no se amontonen los nombres

  const setFiltro = (k, v) => setFiltros((f) => ({ ...f, [k]: v }));
  const hayFiltros = Object.values(filtros).some(Boolean);
  const limpiarFiltros = () => setFiltros({ cat: null, abiertos: false, delivery: false, promos: false, asistente: false, nuevos: false, favoritos: false });

  // Negocios sin coordenadas (cargados antes del mapa): los ubicamos en segundo plano, de a uno (límite del servicio gratuito
  // de direcciones) y guardamos el resultado en este dispositivo para no repetir la consulta.
  const [coordsExtra, setCoordsExtra] = useState({});
  useEffect(() => {
    let cancelado = false;
    const pendientes = businesses
      .filter((b) => b.kind !== "job" && b.status === "active" && b.zone === zone && b.loc && !(b.lat && b.lng) && !coordsExtra[b.id])
      .slice(0, 25);
    if (!pendientes.length) return;
    (async () => {
      for (const b of pendientes) {
        if (cancelado) return;
        const clave = `miZonaGeo_${b.id}_${b.loc}`;
        let punto = null;
        try { punto = JSON.parse(localStorage.getItem(clave) || "null"); } catch { punto = null; }
        if (!punto) {
          punto = await geocodeAddress(b.loc, b.zone);
          if (punto) { try { localStorage.setItem(clave, JSON.stringify(punto)); } catch { /* sin almacenamiento */ } }
          await new Promise((r) => setTimeout(r, 1100));
        }
        if (punto && !cancelado) setCoordsExtra((prev) => ({ ...prev, [b.id]: punto }));
      }
    })();
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businesses, zone]);

  // Dibuja la capa elegida (y saca la anterior). Se vuelve a ejecutar cada vez que la persona cambia de capa.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return undefined;
    capasRef.current.forEach((l) => map.removeLayer(l));
    capasRef.current = CAPAS_MAPA[capa].capas.map((c, i) => {
      const l = L.tileLayer(c.url, c.opciones).addTo(map);
      if (i > 0) l.bringToFront();
      return l;
    });
    try { localStorage.setItem("miZonaCapaMapa", capa); } catch { /* sin almacenamiento */ }
    return undefined;
  }, [capa]);

  const lista = useMemo(() => {
    const base = filtrarParaMapa(businesses, zone, filtros, favorites).map((b) => (b.lat && b.lng ? b : (coordsExtra[b.id] ? { ...b, ...coordsExtra[b.id] } : b)));
    if (userLoc) {
      const d = (b) => (b.lat && b.lng ? haversineKm(userLoc.lat, userLoc.lng, b.lat, b.lng) : Infinity);
      return [...base].sort((a, b) => d(a) - d(b));
    }
    return [...base].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
  }, [businesses, zone, filtros, favorites, userLoc, coordsExtra]);
  const conUbicacion = useMemo(() => lista.filter((b) => b.lat && b.lng), [lista]);
  const sinUbicacion = lista.length - conUbicacion.length;
  const selected = lista.find((b) => b.id === selectedId) || null;
  const distanciaDe = (b) => (userLoc && b.lat && b.lng ? haversineKm(userLoc.lat, userLoc.lng, b.lat, b.lng) : null);

  // crear el mapa una sola vez
  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return;
    const map = L.map(mapDivRef.current, { zoomControl: false, attributionControl: false, zoomSnap: 0.5, wheelPxPerZoomLevel: 90, maxZoom: 19 }).setView([-26.8241, -65.2226], 12); // Tucumán por defecto
    map.on("zoomend", () => setZoom(map.getZoom()));
    L.control.attribution({ prefix: false, position: "bottomleft" }).addAttribution("&copy; OpenStreetMap &copy; CARTO").addTo(map);
    map.on("click", () => setSelectedId(null));
    mapRef.current = map;
    // Leaflet calcula mal su tamaño si el contenedor todavía no terminó de acomodarse: sin esto el mapa puede verse en blanco
    const recalcular = () => { if (mapRef.current) map.invalidateSize(); };
    const t1 = setTimeout(recalcular, 120);
    const t2 = setTimeout(recalcular, 500);
    let ro = null;
    if (typeof ResizeObserver !== "undefined") { ro = new ResizeObserver(recalcular); ro.observe(mapDivRef.current); }
    return () => { clearTimeout(t1); clearTimeout(t2); ro && ro.disconnect(); map.remove(); mapRef.current = null; markersRef.current = {}; userMarkerRef.current = null; };
  }, []);

  // marcadores: se agregan/quitan/actualizan según los filtros y la selección
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const vivos = new Set(conUbicacion.map((b) => b.id));
    Object.keys(markersRef.current).forEach((id) => {
      if (!vivos.has(id)) { markersRef.current[id].remove(); delete markersRef.current[id]; }
    });
    conUbicacion.forEach((b) => {
      const sel = b.id === selectedId;
      let m = markersRef.current[b.id];
      if (!m) {
        m = L.marker([b.lat, b.lng], { icon: crearIconoNegocio(b, sel, verNombres), riseOnHover: true }).addTo(map);
        m.on("click", (e) => { L.DomEvent.stopPropagation(e); setSelectedId(b.id); });
        m._sel = sel; m._nom = verNombres; m._logo = b.logo; m._name = b.name;
        markersRef.current[b.id] = m;
      } else if (m._sel !== sel || m._nom !== verNombres || m._logo !== b.logo || m._name !== b.name) {
        m.setIcon(crearIconoNegocio(b, sel, verNombres));
        m._sel = sel; m._nom = verNombres; m._logo = b.logo; m._name = b.name;
      }
      m.setZIndexOffset(sel ? 1000 : 0);
    });
  }, [conUbicacion, selectedId, verNombres]);

  // encuadrar el mapa cuando cambia el conjunto de negocios visibles (filtros)
  const idsKey = conUbicacion.map((b) => b.id).join(",");
  useEffect(() => {
    const map = mapRef.current;
    if (!map || conUbicacion.length === 0) return;
    if (conUbicacion.length === 1) map.setView([conUbicacion[0].lat, conUbicacion[0].lng], 15);
    else map.fitBounds(L.latLngBounds(conUbicacion.map((b) => [b.lat, b.lng])), { padding: [60, 60], maxZoom: 16 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  // al elegir un negocio, lo centramos un poco más arriba para que la tarjeta flotante no lo tape
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selected || !selected.lat) return;
    const z = Math.max(map.getZoom(), 15);
    const p = map.project([selected.lat, selected.lng], z);
    p.y += 110;
    map.flyTo(map.unproject(p, z), z, { duration: 0.5 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // si el negocio elegido ya no está entre los resultados, cerramos su tarjeta
  useEffect(() => { if (selectedId && !selected) setSelectedId(null); }, [selectedId, selected]);

  // al volver a la vista de mapa, Leaflet necesita recalcular su tamaño
  useEffect(() => {
    if (vista === "mapa" && mapRef.current) setTimeout(() => mapRef.current && mapRef.current.invalidateSize(), 50);
  }, [vista]);

  // punto azul de "estás acá" + centrar cuando el usuario lo pidió
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userLoc) return;
    const icono = L.divIcon({
      className: "",
      html: `<div style="position:relative;width:22px;height:22px"><span style="position:absolute;inset:0;border-radius:50%;background:#2350F555;animation:mzPulse 1.8s ease-out infinite"></span><span style="position:absolute;inset:4px;border-radius:50%;background:#2350F5;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)"></span></div>`,
      iconSize: [22, 22], iconAnchor: [11, 11],
    });
    if (userMarkerRef.current) userMarkerRef.current.setLatLng([userLoc.lat, userLoc.lng]);
    else userMarkerRef.current = L.marker([userLoc.lat, userLoc.lng], { icon: icono, interactive: false, zIndexOffset: -100 }).addTo(map);
    if (quiereUbicarme) {
      map.flyTo([userLoc.lat, userLoc.lng], 15, { duration: 0.6 });
      setQuiereUbicarme(false);
    }
  }, [userLoc, quiereUbicarme]);

  useEffect(() => {
    if (quiereUbicarme && (locStatus === "denied" || locStatus === "error")) {
      setQuiereUbicarme(false);
      setAviso(locStatus === "denied"
        ? "No pudimos acceder a tu ubicación. Habilitá el permiso desde el candado de la barra del navegador y probá de nuevo."
        : "Tu navegador no permite obtener la ubicación.");
      setTimeout(() => setAviso(null), 5000);
    }
  }, [locStatus, quiereUbicarme]);

  const irAMiUbicacion = () => {
    if (userLoc && mapRef.current) {
      mapRef.current.flyTo([userLoc.lat, userLoc.lng], 15, { duration: 0.6 });
    } else {
      setQuiereUbicarme(true);
      onRequestLocation();
    }
  };

  const Chip = ({ label, Icon, active, onClick, activeBg = "#EDF1FF", activeColor = "#2350F5", activeBorder = "#2350F5" }) => (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 shrink-0 whitespace-nowrap"
      style={{ borderRadius: 20, backgroundColor: active ? activeBg : "#fff", color: active ? activeColor : "#2B3768", border: "1px solid " + (active ? activeBorder : "#E3E7F1") }}
    >
      {Icon && <Icon size={13} />} {label}
    </button>
  );

  const catActual = filtros.cat ? catInfo(filtros.cat) : null;
  const CtrlBtn = ({ onClick, children, label }) => (
    <button
      onClick={onClick} aria-label={label}
      className="flex items-center justify-center"
      style={{ width: 40, height: 40, background: "#fff", boxShadow: "0 3px 12px rgba(11,20,55,0.22)" }}
    >
      {children}
    </button>
  );

  return (
    <div className="fixed inset-0 z-[80]" style={{ backgroundColor: "#F3F5FA", display: "flex", flexDirection: "column" }}>
      <style>{`@keyframes mzPulse { 0% { transform: scale(0.6); opacity: 0.9; } 100% { transform: scale(2.2); opacity: 0; } }
        .leaflet-container { font-family: var(--fuente-texto); }`}</style>

      {/* encabezado */}
      <div style={{ backgroundColor: "#0B1437" }}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <BotonAtras onClick={onBack} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: "#fff", fontFamily: "var(--fuente-titulo)" }}>Mapa de {zone}</p>
            <p className="text-[11px]" style={{ color: "#BBD1FB" }}>
              {conUbicacion.length} {conUbicacion.length === 1 ? "negocio" : "negocios"} en el mapa
              {sinUbicacion > 0 ? ` · ${sinUbicacion} sin ubicación exacta` : ""}
            </p>
          </div>
          <div className="flex items-center p-0.5 shrink-0" style={{ borderRadius: 10, background: "#ffffff1f" }}>
            {[{ id: "mapa", label: "Mapa", Icon: MapIcon }, { id: "lista", label: "Lista", Icon: List }].map(({ id, label, Icon }) => (
              <button
                key={id} onClick={() => setVista(id)}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5"
                style={{ borderRadius: 8, background: vista === id ? "#fff" : "transparent", color: vista === id ? "#0B1437" : "#DCE7FB" }}
              >
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* filtros */}
      <div style={{ backgroundColor: "#fff", borderBottom: "1px solid #E3E7F1" }}>
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setShowCats(true)}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 shrink-0 whitespace-nowrap"
            style={{ borderRadius: 20, backgroundColor: catActual ? catActual.color : "#fff", color: catActual ? "#fff" : "#2B3768", border: "1px solid " + (catActual ? catActual.color : "#E3E7F1") }}
          >
            {catActual ? <catActual.icon size={13} /> : <Grid3x3 size={13} />} {catActual ? catActual.label : "Rubro"}
            {catActual ? <X size={12} onClick={(e) => { e.stopPropagation(); setFiltro("cat", null); }} /> : <ChevronDown size={12} />}
          </button>
          <Chip label="Abiertos ahora" active={filtros.abiertos} onClick={() => setFiltro("abiertos", !filtros.abiertos)} activeBg="#E4F3EA" activeColor="#1E6B44" activeBorder="#2C9A5F" />
          <Chip label="Delivery" Icon={Truck} active={filtros.delivery} onClick={() => setFiltro("delivery", !filtros.delivery)} />
          <Chip label="Promociones" Icon={Tag} active={filtros.promos} onClick={() => setFiltro("promos", !filtros.promos)} />
          <Chip label="Con asistente" Icon={Sparkles} active={filtros.asistente} onClick={() => setFiltro("asistente", !filtros.asistente)} activeBg="#F3ECFC" activeColor="#7A4F9E" activeBorder="#7A4F9E" />
          <Chip label="Nuevos" Icon={Sparkles} active={filtros.nuevos} onClick={() => setFiltro("nuevos", !filtros.nuevos)} />
          <Chip label="Favoritos" Icon={Heart} active={filtros.favoritos} onClick={() => setFiltro("favoritos", !filtros.favoritos)} activeBg="#FDF1EF" activeColor="#9A3B34" activeBorder="#C1443A" />
        </div>
      </div>

      {/* contenido */}
      <div className="relative flex-1 min-h-0">
        <div style={{ position: "absolute", inset: 0, zIndex: 0, isolation: "isolate", visibility: vista === "mapa" ? "visible" : "hidden" }}>
          <div ref={mapDivRef} style={{ width: "100%", height: "100%" }} />
        </div>

        {vista === "mapa" && (
          <div className="absolute pointer-events-none" style={{ left: 8, top: 6, zIndex: 12, maxWidth: "70%", fontSize: 9, lineHeight: 1.2, color: capa === "satelite" ? "#fff" : "#475569", textShadow: capa === "satelite" ? "0 1px 2px rgba(0,0,0,.8)" : "0 0 3px #fff", opacity: 0.85 }}>
            {CAPAS_MAPA[capa].atribucion}
          </div>
        )}

        {vista === "mapa" && lista.length > 0 && conUbicacion.length === 0 && (
          <div className="absolute inset-x-4 flex justify-center" style={{ top: 80, zIndex: 15 }}>
            <div className="bg-white px-4 py-3 text-center" style={{ borderRadius: 16, boxShadow: "0 8px 24px rgba(11,20,55,0.18)", maxWidth: 320 }}>
              <p className="text-sm font-semibold" style={{ color: "#0B1437", fontFamily: "var(--fuente-titulo)" }}>
                Ubicando los negocios...
              </p>
              <p className="text-xs mt-0.5" style={{ color: "#5B6482" }}>
                Estamos buscando sus direcciones en el mapa, puede tardar unos segundos.
              </p>
            </div>
          </div>
        )}

        {vista === "mapa" && (
          <>
            {/* controles: zoom y mi ubicación */}
            <div className="absolute flex flex-col gap-2" style={{ right: 12, top: 12, zIndex: 20 }}>
              <div className="flex flex-col overflow-hidden" style={{ borderRadius: 12, boxShadow: "0 3px 12px rgba(11,20,55,0.22)" }}>
                <CtrlBtn onClick={() => mapRef.current?.zoomIn()} label="Acercar"><Plus size={18} color="#0B1437" /></CtrlBtn>
                <div style={{ height: 1, background: "#E3E7F1" }} />
                <CtrlBtn onClick={() => mapRef.current?.zoomOut()} label="Alejar"><Minus size={18} color="#0B1437" /></CtrlBtn>
              </div>
              <div className="relative">
                <button
                  onClick={() => setCapasAbierto((v) => !v)} aria-label="Cambiar tipo de mapa"
                  className="flex items-center justify-center"
                  style={{ width: 40, height: 40, borderRadius: 12, background: capasAbierto ? "#2350F5" : "#fff", boxShadow: "0 3px 12px rgba(11,20,55,0.22)" }}
                >
                  <Layers size={18} color={capasAbierto ? "#fff" : "#0B1437"} />
                </button>
                {capasAbierto && (
                  <div className="absolute flex gap-2 p-2" style={{ right: 48, top: 0, borderRadius: 16, background: "#fff", boxShadow: "0 10px 28px rgba(11,20,55,0.28)" }}>
                    {Object.entries(CAPAS_MAPA).map(([id, c]) => (
                      <button key={id} onClick={() => { setCapa(id); setCapasAbierto(false); }} className="flex flex-col items-center gap-1">
                        <span style={{ width: 58, height: 58, borderRadius: 12, background: c.muestra, border: `3px solid ${capa === id ? "#2350F5" : "transparent"}`, boxShadow: "inset 0 0 0 1px rgba(0,0,0,.08)" }} />
                        <span className="text-[11px] font-semibold" style={{ color: capa === id ? "#2350F5" : "#2B3768" }}>{c.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={irAMiUbicacion} aria-label="Mi ubicación"
                className="flex items-center justify-center"
                style={{ width: 40, height: 40, borderRadius: 12, background: userLoc ? "#2350F5" : "#fff", boxShadow: "0 3px 12px rgba(11,20,55,0.22)" }}
              >
                <LocateFixed size={18} color={userLoc ? "#fff" : "#0B1437"} className={locStatus === "loading" ? "animate-pulse" : ""} />
              </button>
            </div>

            {aviso && (
              <div className="absolute left-3 right-3 px-4 py-2.5 text-xs" style={{ top: 12, zIndex: 25, maxWidth: 420, margin: "0 auto", borderRadius: 10, background: "#FDF1EF", color: "#9A3B34", boxShadow: "0 3px 12px rgba(0,0,0,0.15)", paddingRight: 60 }}>
                {aviso}
              </div>
            )}

            {lista.length === 0 && (
              <div className="absolute left-4 right-4 text-center p-5" style={{ top: "30%", zIndex: 15, maxWidth: 340, margin: "0 auto", borderRadius: 14, background: "#fff", boxShadow: "0 8px 24px rgba(11,20,55,0.2)" }}>
                <p className="text-sm font-semibold mb-1" style={{ color: "#0B1437" }}>No hay negocios con estos filtros</p>
                <p className="text-xs mb-3" style={{ color: "#5B6482" }}>Probá quitando alguno para ver más resultados en {zone}.</p>
                {hayFiltros && (
                  <button onClick={limpiarFiltros} className="text-xs font-semibold px-4 py-2" style={{ borderRadius: 8, backgroundColor: "#0B1437", color: "#fff" }}>Quitar filtros</button>
                )}
              </div>
            )}

            {/* tarjeta flotante del negocio elegido */}
            {selected && (() => {
              const c = catInfo(selected.cat);
              const rating = avgRating(selected.reviews);
              const km = distanciaDe(selected);
              const promos = activeDiscounts(selected);
              const esFav = favorites.includes(selected.id);
              const etiquetas = [
                selected.delivery && { t: "Delivery", Icon: Truck, bg: "#EDF1FF", color: "#0B1437" },
                (selected.asistenteCodigoPublico && selected.asistenteActivo) && { t: "Asistente disponible", Icon: Sparkles, bg: "#F3ECFC", color: "#7A4F9E" },
                promos.length > 0 && { t: promos[0].percent ? `${promos[0].percent} OFF` : "Promoción", Icon: Tag, bg: "#FBEBD1", color: "#8A5B12" },
                esNegocioNuevo(selected) && { t: "Nuevo", Icon: Sparkles, bg: "#E4F3EA", color: "#1E6B44" },
              ].filter(Boolean);
              return (
                <div className="absolute left-3 right-3" style={{ bottom: 14, zIndex: 20, maxWidth: 440, margin: "0 auto" }}>
                  <div className="bg-white p-4 relative" style={{ borderRadius: 16, border: "1px solid #E3E7F1", boxShadow: "0 10px 30px rgba(11,20,55,0.28)" }}>
                    <button onClick={() => setSelectedId(null)} className="absolute" style={{ top: 10, right: 10 }} aria-label="Cerrar"><X size={16} color="#64748B" /></button>
                    <div className="flex items-start gap-3 pr-5">
                      <div className="shrink-0 overflow-hidden" style={{ width: 58, height: 58, borderRadius: 14, border: "1px solid #E3E7F1" }}>
                        <Photo cat={selected.cat} src={selected.logo || selected.photos?.[0]} height={58} radius="14px" iconSize={22} clickable={false} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="truncate" style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 600, fontSize: 16, color: "#0B1437" }}>{selected.name}</h3>
                        <p className="text-xs truncate" style={{ color: "#5B6482" }}>
                          <span style={{ color: c?.color, fontWeight: 500 }}>{c?.label}</span>
                          {km !== null ? ` · A ${fmtDistance(km)} de vos` : ""}
                        </p>
                        {selected.loc && (
                          <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: "#2B3768" }}>
                            <MapPin size={11} className="shrink-0" /> <span className="truncate">{selected.loc}</span>
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {rating ? (
                            <span className="flex items-center gap-1 text-xs" style={{ color: "#2B3768" }}>
                              <Star size={12} fill="#F5A623" color="#F5A623" /> {rating} ({selected.reviews.length})
                            </span>
                          ) : (
                            <span className="text-[11px]" style={{ color: "#64748B" }}>Sin reseñas</span>
                          )}
                          <OpenBadge weekHours={selected.weekHours} />
                        </div>
                      </div>
                    </div>
                    {etiquetas.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {etiquetas.map(({ t, Icon, bg, color }) => (
                          <span key={t} className="flex items-center gap-1 text-[11px] font-medium px-2 py-1" style={{ borderRadius: 20, background: bg, color }}>
                            <Icon size={11} /> {t}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-3.5">
                      <button
                        onClick={() => onOpenBusiness(selected.id)}
                        className="flex-1 text-sm font-semibold py-2.5"
                        style={{ backgroundColor: "#2350F5", color: "#fff", borderRadius: 10 }}
                      >
                        Ver perfil
                      </button>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lng}`} target="_blank" rel="noreferrer"
                        onClick={() => onTrack && onTrack(selected.id, "ubicacion")}
                        className="flex items-center justify-center gap-1.5 text-sm font-semibold px-3.5 py-2.5"
                        style={{ backgroundColor: "#EDF1FF", color: "#0B1437", borderRadius: 10 }}
                      >
                        <Navigation size={15} /> Cómo llegar
                      </a>
                      <button
                        onClick={() => onToggleFavorite(selected.id)} aria-label="Guardar"
                        className="flex items-center justify-center shrink-0"
                        style={{ width: 40, height: 40, borderRadius: 10, background: esFav ? "#FDF1EF" : "#F3F5FA" }}
                      >
                        <Heart size={17} color={esFav ? "#C1443A" : "#64748B"} fill={esFav ? "#C1443A" : "none"} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </>
        )}

        {/* vista de lista */}
        {vista === "lista" && (
          <div className="absolute inset-0 overflow-y-auto" style={{ backgroundColor: "#F3F5FA", zIndex: 10 }}>
            <div className="max-w-3xl mx-auto px-4 py-4 flex flex-col gap-3" style={{ paddingBottom: 40 }}>
              {lista.length === 0 ? (
                <div className="text-center py-14">
                  <p className="text-sm font-semibold mb-1" style={{ color: "#0B1437" }}>No hay negocios con estos filtros</p>
                  <p className="text-xs mb-3" style={{ color: "#5B6482" }}>Probá quitando alguno para ver más resultados en {zone}.</p>
                  {hayFiltros && <button onClick={limpiarFiltros} className="text-xs font-semibold px-4 py-2" style={{ borderRadius: 8, backgroundColor: "#0B1437", color: "#fff" }}>Quitar filtros</button>}
                </div>
              ) : lista.map((biz) => {
                const c = catInfo(biz.cat);
                const rating = avgRating(biz.reviews);
                const km = distanciaDe(biz);
                return (
                  <div
                    key={biz.id} role="button" tabIndex={0}
                    onClick={() => onOpenBusiness(biz.id)}
                    onKeyDown={(e) => (e.key === "Enter" ? onOpenBusiness(biz.id) : null)}
                    className="w-full flex items-center gap-3 p-3 text-left bg-white cursor-pointer"
                    style={{ borderRadius: 14, border: "1px solid #E3E7F1", boxShadow: "0 3px 14px rgba(11,20,55,0.07)" }}
                  >
                    <div className="shrink-0 overflow-hidden" style={{ width: 54, height: 54, borderRadius: 12 }}>
                      <Photo cat={biz.cat} src={biz.logo || biz.photos?.[0]} height={54} radius="12px" iconSize={22} clickable={false} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold truncate" style={{ color: "#0B1437" }}>{biz.name}</p>
                        {esNegocioNuevo(biz) && <span className="text-[10px] font-semibold px-1.5 py-0.5 shrink-0" style={{ borderRadius: 6, background: "#E4F3EA", color: "#1E6B44" }}>Nuevo</span>}
                      </div>
                      <p className="text-xs truncate" style={{ color: "#5B6482" }}>
                        <span style={{ color: c?.color, fontWeight: 500 }}>{c?.label}</span>{km !== null ? ` · A ${fmtDistance(km)}` : ""}
                      </p>
                      {biz.loc && <p className="text-[11px] truncate mb-1" style={{ color: "#64748B" }}>{biz.loc}</p>}
                      <div className="flex items-center gap-2 flex-wrap">
                        {rating && <span className="flex items-center gap-0.5 text-xs" style={{ color: "#2B3768" }}><Star size={11} fill="#F5A623" color="#F5A623" /> {rating}</span>}
                        <OpenBadge weekHours={biz.weekHours} />
                        {biz.delivery && <Truck size={13} color="#0B1437" />}
                        {biz.asistenteCodigoPublico && biz.asistenteActivo && <Sparkles size={13} color="#7A4F9E" />}
                        {activeDiscounts(biz).length > 0 && <Tag size={13} color="#B8703F" />}
                      </div>
                    </div>
                    {biz.lat && biz.lng && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setVista("mapa"); setSelectedId(biz.id); }}
                        className="flex items-center justify-center shrink-0" aria-label="Ver en el mapa"
                        style={{ width: 36, height: 36, borderRadius: "50%", background: "#EDF1FF" }}
                      >
                        <MapPin size={16} color="#2350F5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {showCats && <CategoryModal activeCat={filtros.cat} onSelect={(id) => { setFiltro("cat", id); setShowCats(false); }} onClose={() => setShowCats(false)} />}
    </div>
  );
}

/* ---------- centro de notificaciones ---------- */

// Fila de notificación: se elimina deslizándola hacia la derecha (como en las apps móviles modernas)
function SwipeableNotification({ n, leida, onOpen, onDelete }) {
  const [dx, setDx] = useState(0);
  const [arrastrando, setArrastrando] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const inicio = useRef(null);
  const seMovio = useRef(false);
  const t = NOTIF_TIPOS[n.tipo] || NOTIF_TIPOS.pedido;
  const Icon = t.Icon;
  const UMBRAL = 90; // px que hay que deslizar para eliminar

  const onPointerDown = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    inicio.current = { x: e.clientX, y: e.clientY, eje: null };
    seMovio.current = false;
  };
  const onPointerMove = (e) => {
    const s = inicio.current;
    if (!s) return;
    const ddx = e.clientX - s.x;
    const ddy = e.clientY - s.y;
    if (s.eje === null && (Math.abs(ddx) > 8 || Math.abs(ddy) > 8)) {
      s.eje = Math.abs(ddx) > Math.abs(ddy) ? "h" : "v";
      if (s.eje === "h") {
        setArrastrando(true);
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* no crítico */ }
      }
    }
    if (s.eje === "h") {
      seMovio.current = true;
      setDx(Math.max(0, ddx)); // solo hacia la derecha
    }
  };
  const terminar = () => {
    const s = inicio.current;
    inicio.current = null;
    if (!s) return;
    setArrastrando(false);
    if (s.eje === "h" && dx > UMBRAL) {
      setSaliendo(true);
      setDx(window.innerWidth);
      setTimeout(onDelete, 400); // espera a que termine la animación de salida
    } else {
      setDx(0);
    }
    setTimeout(() => { seMovio.current = false; }, 50);
  };

  return (
    <div
      className="relative overflow-hidden"
      style={{ maxHeight: saliendo ? 0 : 220, opacity: saliendo ? 0 : 1, transition: "max-height 0.25s ease 0.12s, opacity 0.2s ease 0.1s", borderBottom: "1px solid #EEF0F6" }}
    >
      {/* fondo que se descubre al deslizar */}
      <div className="absolute inset-0 flex items-center gap-2 px-5" style={{ background: "#C1443A" }}>
        <Trash2 size={18} color="#fff" />
        <span className="text-xs font-semibold" style={{ color: "#fff" }}>Eliminar</span>
      </div>
      <div
        role="button" tabIndex={0}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={terminar} onPointerCancel={terminar}
        onClick={() => { if (!seMovio.current) onOpen(); }}
        onKeyDown={(e) => (e.key === "Enter" ? onOpen() : null)}
        className="relative flex items-start gap-3 px-4 py-3.5 cursor-pointer"
        style={{
          background: leida ? "#fff" : "#F3F8FF", transform: `translateX(${dx}px)`,
          transition: arrastrando ? "none" : "transform 0.25s ease", touchAction: "pan-y", userSelect: "none",
        }}
      >
        <span className="flex items-center justify-center shrink-0" style={{ width: 42, height: 42, borderRadius: "50%", background: t.bg }}>
          <Icon size={19} color={t.color} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm" style={{ color: "#0B1437", fontWeight: leida ? 500 : 700 }}>{n.titulo}</p>
            {!leida && <span className="shrink-0 rounded-full mt-1.5" style={{ width: 9, height: 9, background: "#2350F5" }} />}
          </div>
          <p className="text-xs mt-0.5" style={{ color: "#2B3768", wordBreak: "break-word" }}>{n.descripcion}</p>
          <p className="text-[11px] mt-1" style={{ color: leida ? "#64748B" : "#2350F5", fontWeight: leida ? 400 : 600 }}>{fmtNotifTime(n.fecha, n.soloFecha)}</p>
        </div>
      </div>
    </div>
  );
}

function NotificacionesScreen({ notificaciones, leidas, onOpen, onDelete, onMarkAllRead, onBack }) {
  const sinLeer = notificaciones.filter((n) => !leidas.has(n.id)).length;
  const hoy = new Date().toDateString();
  const ayer = new Date(Date.now() - 86400000).toDateString();
  const grupos = [
    { label: "Hoy", items: notificaciones.filter((n) => new Date(n.fecha).toDateString() === hoy) },
    { label: "Ayer", items: notificaciones.filter((n) => new Date(n.fecha).toDateString() === ayer) },
    { label: "Anteriores", items: notificaciones.filter((n) => ![hoy, ayer].includes(new Date(n.fecha).toDateString())) },
  ].filter((g) => g.items.length > 0);

  return (
    <div style={{ backgroundColor: "#F3F5FA", minHeight: "100vh" }}>
      <div className="sticky top-0 z-30" style={{ backgroundColor: "#0B1437" }}>
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <BotonAtras onClick={onBack} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: "#fff", fontFamily: "var(--fuente-titulo)" }}>Notificaciones</p>
            <p className="text-[11px]" style={{ color: "#BBD1FB" }}>{sinLeer > 0 ? `${sinLeer} sin leer` : "Estás al día"}</p>
          </div>
          <button
            onClick={onMarkAllRead} disabled={sinLeer === 0}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 shrink-0"
            style={{ borderRadius: 8, background: "#ffffff1f", color: "#fff", opacity: sinLeer === 0 ? 0.45 : 1 }}
          >
            <CheckCheck size={14} /> Marcar todas como leídas
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto" style={{ paddingBottom: 40 }}>
        {notificaciones.length === 0 ? (
          <div className="text-center py-20 px-8">
            <span className="flex items-center justify-center mx-auto mb-3" style={{ width: 56, height: 56, borderRadius: "50%", background: "#EDF1FF" }}>
              <BellOff size={24} color="#2350F5" />
            </span>
            <p className="text-sm font-semibold mb-1" style={{ color: "#0B1437" }}>No tenés notificaciones</p>
            <p className="text-xs" style={{ color: "#5B6482" }}>Acá vas a ver avisos de tus pedidos, turnos, promociones, puntos, canjes y novedades de los negocios que seguís.</p>
          </div>
        ) : (
          <>
            <p className="text-[11px] px-4 pt-3 pb-1" style={{ color: "#64748B" }}>Deslizá una notificación hacia la derecha para eliminarla.</p>
            {grupos.map((g) => (
              <div key={g.label}>
                <p className="text-[11px] font-semibold px-4 pt-3 pb-1.5" style={{ color: "#5B6482", letterSpacing: 0.4 }}>{g.label.toUpperCase()}</p>
                <div style={{ borderTop: "1px solid #EEF0F6" }}>
                  {g.items.map((n) => (
                    <SwipeableNotification key={n.id} n={n} leida={leidas.has(n.id)} onOpen={() => onOpen(n)} onDelete={() => onDelete(n.id)} />
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- puntos y recompensas (cliente) ---------- */
// Cada negocio tiene su propio programa: los puntos de un negocio solo sirven en ese negocio.

function RecompensaCard({ r, onCanjear, canjeando }) {
  const progreso = Math.min(100, Math.round(((r.puntos - r.faltan) / r.puntos) * 100));
  const bloqueoTexto = r.bloqueo === "agotada" ? "Agotada" : r.bloqueo === "limite" ? "Ya canjeaste el máximo permitido" : null;
  return (
    <div className="bg-white p-4" style={{ borderRadius: 14, border: "1px solid #E3E7F1", boxShadow: "0 3px 12px rgba(11,20,55,0.06)", opacity: bloqueoTexto ? 0.75 : 1 }}>
      <div className="flex items-start gap-3">
        {r.imagen ? (
          <img src={r.imagen} alt="" className="object-cover shrink-0" style={{ width: 56, height: 56, borderRadius: 12 }} />
        ) : (
          <span className="flex items-center justify-center shrink-0" style={{ width: 56, height: 56, borderRadius: 12, background: "#F3ECFC" }}>
            <Gift size={24} color="#7A4F9E" />
          </span>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold" style={{ color: "#0B1437" }}>{r.nombre}</p>
            <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 shrink-0" style={{ borderRadius: 20, background: "#FDF3DC", color: "#8A5B12" }}>
              <Coins size={11} /> {fmtNum(r.puntos)}
            </span>
          </div>
          {r.descripcion && <p className="text-xs mt-0.5" style={{ color: "#2B3768" }}>{r.descripcion}</p>}
        </div>
      </div>

      {(r.compraMinima > 0 || r.fechaVencimiento || r.cantidadDisponible !== null || r.limitePorCliente || r.condiciones) && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {r.compraMinima > 0 && <span className="text-[11px] px-2 py-0.5" style={{ borderRadius: 20, background: "#EEF0F6", color: "#2B3768" }}>Compra mínima {fmtPesos(r.compraMinima)}</span>}
          {r.fechaVencimiento && <span className="text-[11px] px-2 py-0.5" style={{ borderRadius: 20, background: "#EEF0F6", color: "#2B3768" }}>Canjeable hasta el {fmtFechaAR(r.fechaVencimiento)}</span>}
          {r.cantidadDisponible !== null && r.cantidadDisponible > 0 && <span className="text-[11px] px-2 py-0.5" style={{ borderRadius: 20, background: "#EEF0F6", color: "#2B3768" }}>Quedan {fmtNum(r.cantidadDisponible)}</span>}
          {r.limitePorCliente && <span className="text-[11px] px-2 py-0.5" style={{ borderRadius: 20, background: "#EEF0F6", color: "#2B3768" }}>Máx. {r.limitePorCliente} por persona</span>}
        </div>
      )}
      {r.condiciones && <p className="text-[11px] mt-2" style={{ color: "#5B6482" }}>Condiciones: {r.condiciones}</p>}

      <div className="mt-3.5">
        {bloqueoTexto ? (
          <p className="text-xs font-semibold" style={{ color: "#9A3B34" }}>{bloqueoTexto}</p>
        ) : r.puedeCanjear ? (
          <button
            onClick={() => onCanjear(r)} disabled={canjeando}
            className="w-full flex items-center justify-center gap-2 text-sm font-semibold py-2.5"
            style={{ backgroundColor: "#2350F5", color: "#fff", borderRadius: 10, opacity: canjeando ? 0.6 : 1 }}
          >
            <Ticket size={16} /> Canjear por {fmtNum(r.puntos)} puntos
          </button>
        ) : (
          <>
            <div style={{ height: 7, borderRadius: 4, background: "#EEF0F6", overflow: "hidden" }}>
              <div style={{ width: `${progreso}%`, height: "100%", background: "linear-gradient(90deg, #2350F5, #7FA8F5)", borderRadius: 4 }} />
            </div>
            <p className="text-xs mt-1.5" style={{ color: "#2B3768" }}>
              Te {r.faltan === 1 ? "falta" : "faltan"} <b>{fmtNum(r.faltan)} {r.faltan === 1 ? "punto" : "puntos"}</b>.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// Cupón de un canje: código único + QR para mostrarle al negocio
function CanjeModal({ canje, onClose }) {
  const usado = canje.estado === "utilizado";
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" style={{ background: "#0B1437cc" }} onClick={onClose}>
      <div className="bg-white w-full max-w-sm p-6 text-center" style={{ borderRadius: 16 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <span style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 600, fontSize: 16, color: "#0B1437" }}>Tu canje</span>
          <button onClick={onClose}><X size={18} color="#5B6482" /></button>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 mb-3" style={{ borderRadius: 20, background: usado ? "#EEEDE7" : "#E4F3EA", color: usado ? "#5B6482" : "#1E6B44" }}>
          {usado ? <Check size={12} /> : <Ticket size={12} />} {usado ? "Ya utilizado" : "Listo para usar"}
        </span>
        <p className="text-base font-semibold" style={{ color: "#0B1437" }}>{canje.recompensa}</p>
        {canje.negocio && <p className="text-xs mb-3" style={{ color: "#5B6482" }}>{canje.negocio}</p>}
        {!usado && (
          <img
            alt="Código QR del canje" className="mx-auto mb-3"
            style={{ width: 170, height: 170, borderRadius: 10, border: "1px solid #E3E7F1" }}
            src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(canje.codigo)}`}
          />
        )}
        <p className="text-xl font-mono font-bold mb-1" style={{ color: usado ? "#64748B" : "#0B1437", letterSpacing: 1, textDecoration: usado ? "line-through" : "none" }}>{canje.codigo}</p>
        {usado ? (
          <p className="text-xs" style={{ color: "#5B6482" }}>Utilizado el {fmtFechaAR(canje.utilizadoEn)}. Este código ya no sirve.</p>
        ) : (
          <p className="text-xs" style={{ color: "#5B6482" }}>Mostrale este código al negocio para retirar tu recompensa. Se puede usar una sola vez.</p>
        )}
        {(canje.condiciones || canje.compraMinima > 0) && (
          <p className="text-[11px] mt-3 p-2.5 text-left" style={{ borderRadius: 8, background: "#F3F5FA", color: "#2B3768" }}>
            {canje.compraMinima > 0 && <>Compra mínima: {fmtPesos(canje.compraMinima)}. </>}
            {canje.condiciones && <>Condiciones: {canje.condiciones}</>}
          </p>
        )}
      </div>
    </div>
  );
}

function PuntosScreen({ businesses, initialCodigo, onBack, onOpenBusiness }) {
  const [data, setData] = useState(null); // { negocios, canjes }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("puntos"); // puntos | canjes
  const [codigo, setCodigo] = useState(initialCodigo || null); // negocio cuyo detalle de recompensas se está viendo
  const [detalle, setDetalle] = useState(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [aCanjear, setACanjear] = useState(null); // recompensa pendiente de confirmar
  const [canjeando, setCanjeando] = useState(false);
  const [errorCanje, setErrorCanje] = useState(null);
  const [cupon, setCupon] = useState(null);
  const claveCanje = useRef(null);

  const bizDe = (cp) => businesses.find((b) => b.asistenteCodigoPublico === cp);

  const cargarLista = async () => {
    try {
      setError(null);
      setData(await fetchMisPuntos());
    } catch {
      setError("No pudimos cargar tus puntos en este momento. Probá de nuevo en un rato.");
    } finally {
      setLoading(false);
    }
  };
  const cargarDetalle = async (cp) => {
    setLoadingDetalle(true);
    try {
      setError(null);
      setDetalle(await fetchPuntosNegocio(cp));
    } catch {
      setError("No pudimos cargar las recompensas de este negocio. Probá de nuevo en un rato.");
    } finally {
      setLoadingDetalle(false);
    }
  };

  useEffect(() => { cargarLista(); }, []);
  useEffect(() => { if (codigo) cargarDetalle(codigo); else setDetalle(null); }, [codigo]);

  const confirmarCanje = async () => {
    if (!aCanjear || canjeando) return;
    setCanjeando(true);
    setErrorCanje(null);
    if (!claveCanje.current) claveCanje.current = randomHex(12); // misma clave si se reintenta: nunca descuenta dos veces
    try {
      const { canje } = await canjearRecompensaApi(codigo, aCanjear.id, claveCanje.current);
      claveCanje.current = null;
      setACanjear(null);
      setCupon(canje);
      await Promise.all([cargarDetalle(codigo), cargarLista()]);
    } catch (e) {
      setErrorCanje(e.message);
      setACanjear(null);
      cargarDetalle(codigo); // el estado pudo haber cambiado (se agotó, cambió el saldo...)
    } finally {
      setCanjeando(false);
    }
  };

  const Logo = ({ nombre, logoUrl, cp, size = 46 }) => {
    const biz = bizDe(cp);
    const src = biz?.logo || logoUrl;
    return src ? (
      <img src={src} alt="" className="object-cover shrink-0" style={{ width: size, height: size, borderRadius: "50%" }} />
    ) : (
      <span className="flex items-center justify-center shrink-0 font-bold" style={{ width: size, height: size, borderRadius: "50%", background: catInfo(biz?.cat)?.color || "#2350F5", color: "#fff" }}>
        {(nombre || "?")[0].toUpperCase()}
      </span>
    );
  };

  const cabecera = (titulo, subtitulo, atras) => (
    <div className="sticky top-0 z-30" style={{ backgroundColor: "#0B1437" }}>
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
        <BotonAtras onClick={atras} />
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: "#fff", fontFamily: "var(--fuente-titulo)" }}>{titulo}</p>
          {subtitulo && <p className="text-[11px]" style={{ color: "#BBD1FB" }}>{subtitulo}</p>}
        </div>
      </div>
    </div>
  );

  /* --- detalle de un negocio: todas sus recompensas --- */
  if (codigo) {
    const biz = bizDe(codigo);
    return (
      <div style={{ backgroundColor: "#F3F5FA", minHeight: "100vh" }}>
        {cabecera("Recompensas", detalle?.nombreNegocio || biz?.name || "", () => (initialCodigo ? onBack() : setCodigo(null)))}
        <div className="max-w-3xl mx-auto px-4 py-5" style={{ paddingBottom: 60 }}>
          {loadingDetalle && !detalle ? (
            <p className="text-sm text-center py-16" style={{ color: "#5B6482" }}>Cargando...</p>
          ) : error && !detalle ? (
            <p className="text-sm text-center py-16" style={{ color: "#9A3B34" }}>{error}</p>
          ) : detalle && !detalle.activo ? (
            <div className="text-center py-16 px-6">
              <p className="text-sm font-semibold mb-1" style={{ color: "#0B1437" }}>Este negocio no tiene programa de puntos</p>
              <p className="text-xs" style={{ color: "#5B6482" }}>Cuando lo active vas a poder ver acá sus recompensas.</p>
            </div>
          ) : detalle && (
            <>
              <div className="p-4 mb-4 flex items-center gap-3" style={{ borderRadius: 14, background: "radial-gradient(420px 220px at 105% -20%, rgba(54,104,255,.55), transparent 60%), radial-gradient(260px 160px at -10% 120%, rgba(23,198,255,.22), transparent 60%), #0a1235" }}>
                <Logo nombre={detalle.nombreNegocio} logoUrl={detalle.logoUrl} cp={codigo} size={50} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs" style={{ color: "#BBD1FB" }}>Tus puntos en {detalle.nombreNegocio}</p>
                  <p className="flex items-center gap-1.5" style={{ color: "#fff", fontFamily: "var(--fuente-titulo)", fontWeight: 700, fontSize: 24 }}>
                    <Coins size={20} color="#F5C85A" /> {fmtNum(detalle.saldo)}
                  </p>
                </div>
              </div>
              <p className="text-xs mb-4 px-1" style={{ color: "#2B3768" }}>
                Ganás <b>1 punto</b> por cada <b>{fmtPesos(detalle.pesosPorPunto)}</b> que gastás. Los puntos se suman cuando tu pedido se entrega y solo sirven en este negocio.
              </p>
              {errorCanje && (
                <p className="text-xs mb-3 px-3 py-2.5" style={{ borderRadius: 10, background: "#FDF1EF", color: "#9A3B34" }}>{errorCanje}</p>
              )}
              {detalle.recompensas.length === 0 ? (
                <p className="text-sm text-center py-10" style={{ color: "#5B6482" }}>Este negocio todavía no cargó recompensas.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {detalle.recompensas.map((r) => (
                    <RecompensaCard key={r.id} r={r} canjeando={canjeando} onCanjear={(rec) => { setErrorCanje(null); claveCanje.current = null; setACanjear(rec); }} />
                  ))}
                </div>
              )}
              {biz && (
                <button onClick={() => onOpenBusiness(biz.id)} className="w-full text-sm font-semibold py-3 mt-5" style={{ borderRadius: 10, backgroundColor: "#EDF1FF", color: "#0B1437" }}>
                  Ver perfil del negocio
                </button>
              )}
            </>
          )}
        </div>
        {aCanjear && (
          <ConfirmModal
            title="¿Canjear esta recompensa?"
            message={`Vas a usar ${fmtNum(aCanjear.puntos)} puntos para canjear "${aCanjear.nombre}". Se genera un código único para mostrarle al negocio.`}
            confirmLabel={canjeando ? "Canjeando..." : "Confirmar canje"}
            onConfirm={confirmarCanje} onCancel={() => !canjeando && setACanjear(null)}
          />
        )}
        {cupon && <CanjeModal canje={cupon} onClose={() => setCupon(null)} />}
      </div>
    );
  }

  /* --- lista: mis puntos por negocio + mis canjes --- */
  const negocios = data?.negocios || [];
  const canjes = data?.canjes || [];
  const pendientes = canjes.filter((c) => c.estado === "pendiente").length;

  return (
    <div style={{ backgroundColor: "#F3F5FA", minHeight: "100vh" }}>
      {cabecera("Mis puntos", "Cada negocio tiene sus propios puntos", onBack)}
      <div className="max-w-3xl mx-auto px-4 py-4" style={{ paddingBottom: 60 }}>
        <div className="flex items-center gap-6 mb-4" style={{ borderBottom: "1px solid #E3E7F1" }}>
          {[{ id: "puntos", label: "Mis puntos" }, { id: "canjes", label: `Mis canjes${pendientes ? ` (${pendientes})` : ""}` }].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className="px-1 pb-3 text-sm font-medium relative" style={{ color: tab === t.id ? "#2350F5" : "#5B6482" }}>
              {t.label}
              {tab === t.id && <span className="absolute left-0 right-0" style={{ bottom: 0, height: 2, background: "#2350F5", borderRadius: 2 }} />}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-center py-16" style={{ color: "#5B6482" }}>Cargando...</p>
        ) : error ? (
          <p className="text-sm text-center py-16" style={{ color: "#9A3B34" }}>{error}</p>
        ) : tab === "puntos" ? (
          negocios.length === 0 ? (
            <div className="text-center py-14 px-6">
              <span className="flex items-center justify-center mx-auto mb-3" style={{ width: 56, height: 56, borderRadius: "50%", background: "#FDF3DC" }}>
                <Coins size={24} color="#B7791F" />
              </span>
              <p className="text-sm font-semibold mb-1" style={{ color: "#0B1437" }}>Todavía no tenés puntos</p>
              <p className="text-xs" style={{ color: "#5B6482" }}>Los negocios con programa de puntos te suman puntos por tus compras. Cuando tengas, los vas a ver acá, separados por negocio.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {negocios.map((n) => (
                <div key={n.codigoPublico} className="bg-white p-4" style={{ borderRadius: 14, border: "1px solid #E3E7F1", boxShadow: "0 3px 14px rgba(11,20,55,0.07)" }}>
                  <div className="flex items-center gap-3">
                    <Logo nombre={n.nombreNegocio} logoUrl={n.logoUrl} cp={n.codigoPublico} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: "#0B1437" }}>{n.nombreNegocio}</p>
                      <p className="flex items-center gap-1 text-sm font-bold" style={{ color: "#8A5B12" }}><Coins size={13} /> {fmtNum(n.saldo)} puntos</p>
                    </div>
                  </div>
                  {n.proxima ? (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs mb-1.5" style={{ color: "#2B3768" }}>
                        <span className="truncate pr-2">{n.proxima.nombre} · {fmtNum(n.proxima.puntos)} puntos</span>
                      </div>
                      <div style={{ height: 7, borderRadius: 4, background: "#EEF0F6", overflow: "hidden" }}>
                        <div style={{ width: `${Math.min(100, Math.round((n.saldo / n.proxima.puntos) * 100))}%`, height: "100%", background: "linear-gradient(90deg, #2350F5, #7FA8F5)" }} />
                      </div>
                      <p className="text-xs mt-1.5" style={{ color: "#2B3768" }}>Te {n.proxima.faltan === 1 ? "falta" : "faltan"} <b>{fmtNum(n.proxima.faltan)} puntos</b>.</p>
                    </div>
                  ) : n.recompensas.some((r) => r.puedeCanjear) ? (
                    <p className="text-xs mt-3 font-medium" style={{ color: "#1E6B44" }}>¡Ya podés canjear una recompensa!</p>
                  ) : null}
                  <button
                    onClick={() => { setErrorCanje(null); setCodigo(n.codigoPublico); }}
                    className="w-full text-sm font-semibold py-2.5 mt-3.5"
                    style={{ borderRadius: 10, backgroundColor: "#EDF1FF", color: "#0B1437" }}
                  >
                    Ver recompensas
                  </button>
                </div>
              ))}
            </div>
          )
        ) : canjes.length === 0 ? (
          <div className="text-center py-14 px-6">
            <span className="flex items-center justify-center mx-auto mb-3" style={{ width: 56, height: 56, borderRadius: "50%", background: "#F3ECFC" }}>
              <Ticket size={24} color="#7A4F9E" />
            </span>
            <p className="text-sm font-semibold mb-1" style={{ color: "#0B1437" }}>Todavía no canjeaste nada</p>
            <p className="text-xs" style={{ color: "#5B6482" }}>Tus cupones aparecen acá, con su código y su estado.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {canjes.map((c) => {
              const usado = c.estado === "utilizado";
              return (
                <button key={c.id} onClick={() => setCupon(c)} className="w-full flex items-center gap-3 p-3.5 text-left bg-white" style={{ borderRadius: 14, border: "1px solid #E3E7F1", boxShadow: "0 3px 12px rgba(11,20,55,0.06)", opacity: usado ? 0.7 : 1 }}>
                  <span className="flex items-center justify-center shrink-0" style={{ width: 44, height: 44, borderRadius: 12, background: usado ? "#EEEDE7" : "#F3ECFC" }}>
                    {usado ? <Check size={19} color="#5B6482" /> : <Ticket size={19} color="#7A4F9E" />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold truncate" style={{ color: "#0B1437" }}>{c.recompensa}</span>
                    <span className="block text-xs truncate" style={{ color: "#5B6482" }}>{c.negocio} · {fmtFechaAR(c.creadoEn)}</span>
                    <span className="block text-xs font-mono mt-0.5" style={{ color: usado ? "#64748B" : "#0B1437", textDecoration: usado ? "line-through" : "none" }}>{c.codigo}</span>
                  </span>
                  <span className="text-[11px] font-semibold px-2 py-1 shrink-0" style={{ borderRadius: 20, background: usado ? "#EEEDE7" : "#E4F3EA", color: usado ? "#5B6482" : "#1E6B44" }}>
                    {usado ? "Utilizado" : "Pendiente de uso"}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      {cupon && <CanjeModal canje={cupon} onClose={() => setCupon(null)} />}
    </div>
  );
}

function RankingScreen({ businesses, zone, onOpenBusiness, onBack }) {
  const [catFiltro, setCatFiltro] = useState(null);
  const enZona = useMemo(() => rankedBusinesses(businesses.filter((b) => b.zone === zone)), [businesses, zone]);
  const categoriasPresentes = useMemo(() => {
    const ids = [...new Set(enZona.map((b) => b.cat))];
    return ids.map((id) => catInfo(id)).filter(Boolean);
  }, [enZona]);
  const ranking = useMemo(() => (catFiltro ? enZona.filter((b) => b.cat === catFiltro) : enZona).slice(0, 20), [enZona, catFiltro]);
  const [oro, plata, bronce] = ranking;
  const resto = ranking.slice(3);
  const topScore = Math.max(1, ...ranking.map((b) => rankingScore(b)));
  const totalResenas = enZona.reduce((s, b) => s + (b.reviews?.length || 0), 0);
  const [verComo, setVerComo] = useState(false);

  const PODIO = {
    1: { alto: 118, color: "#F5B83D", aro: "linear-gradient(135deg,#FFE08A,#F5A623)", avatar: 78 },
    2: { alto: 84, color: "#C9D3E3", aro: "linear-gradient(135deg,#F1F5FA,#A9B6CB)", avatar: 64 },
    3: { alto: 66, color: "#E0975F", aro: "linear-gradient(135deg,#F6C9A2,#C97B4A)", avatar: 64 },
  };

  const Puesto = ({ biz, puesto }) => {
    if (!biz) return <div style={{ flex: 1 }} />;
    const st = PODIO[puesto];
    const rating = avgRating(biz.reviews);
    const c = catInfo(biz.cat);
    return (
      <button onClick={() => onOpenBusiness(biz.id)} className="flex flex-col items-center" style={{ flex: 1, minWidth: 0 }}>
        {puesto === 1 && <Crown size={24} color={st.color} fill={st.color} style={{ marginBottom: 4, filter: "drop-shadow(0 2px 6px rgba(245,184,61,.6))" }} />}
        <div className="relative" style={{ marginBottom: 8 }}>
          <div style={{ width: st.avatar + 8, height: st.avatar + 8, borderRadius: "50%", padding: 4, background: st.aro, boxShadow: `0 8px 22px ${st.color}66` }}>
            <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", background: "#fff" }}>
              <Photo cat={biz.cat} src={biz.logo || biz.photos?.[0]} height={st.avatar} radius="50%" iconSize={st.avatar / 3} clickable={false} />
            </div>
          </div>
          <span className="absolute flex items-center justify-center text-[11px] font-bold" style={{ bottom: -4, right: -2, width: 24, height: 24, borderRadius: "50%", background: st.aro, color: "#0B1437", border: "2px solid #0B1437" }}>
            {puesto}
          </span>
        </div>
        <p className="text-xs font-semibold text-center leading-tight px-1" style={{ color: "#fff", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", maxWidth: "100%" }}>{biz.name}</p>
        <p className="text-[10px] mt-0.5 truncate" style={{ color: "#B8C9EA", maxWidth: "100%" }}>{c?.label}</p>
        <div className="flex items-center gap-2 mt-1.5 mb-2">
          {rating && (
            <span className="flex items-center gap-0.5 text-[11px] font-semibold" style={{ color: "#fff" }}>
              <Star size={10} fill="#F5B83D" color="#F5B83D" /> {rating}
            </span>
          )}
          <span className="text-[10px] font-bold px-1.5 py-0.5" style={{ borderRadius: 8, background: "#ffffff22", color: st.color }}>{Math.round(rankingScore(biz))} pts</span>
        </div>
        <div className="w-full flex items-start justify-center" style={{ height: st.alto, borderRadius: "16px 16px 0 0", background: `linear-gradient(180deg, ${st.color}55, ${st.color}08)`, border: `1px solid ${st.color}66`, borderBottom: "none", paddingTop: 10 }}>
          <span style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 700, fontSize: puesto === 1 ? 40 : 32, lineHeight: 1, color: st.color, opacity: 0.9 }}>{puesto}</span>
        </div>
      </button>
    );
  };

  return (
    <div>
      {/* portada oscura con título y podio */}
      <div data-conservar-color className="relative overflow-hidden" style={{ background: "radial-gradient(420px 220px at 105% -20%, rgba(54,104,255,.55), transparent 60%), radial-gradient(260px 160px at -10% 120%, rgba(23,198,255,.22), transparent 60%), #0a1235", padding: "16px 16px 0" }}>
        <div style={{ position: "absolute", top: -60, right: -50, width: 190, height: 190, borderRadius: "50%", background: "#ffffff0d" }} />
        <div style={{ position: "absolute", top: 70, left: -70, width: 150, height: 150, borderRadius: "50%", background: "#7FA8F51a" }} />
        <div className="relative max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <BotonAtras onClick={onBack} size={36} />
            <div className="flex-1 min-w-0">
              <p style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 700, fontSize: 20, color: "#fff", lineHeight: 1.15 }}>Ranking de la zona</p>
              <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: "#B8C9EA" }}><MapPin size={11} /> {zone}</p>
            </div>
            <span className="flex items-center justify-center shrink-0" style={{ width: 40, height: 40, borderRadius: 14, background: "linear-gradient(135deg,#FFE08A,#F5A623)", boxShadow: "0 6px 16px rgba(245,166,35,.45)" }}>
              <Trophy size={20} color="#7A4B00" />
            </span>
          </div>

          {enZona.length > 0 && (
            <div className="flex gap-2 mb-5">
              {[
                { Icon: Trophy, valor: enZona.length, etiqueta: enZona.length === 1 ? "negocio" : "negocios" },
                { Icon: Star, valor: totalResenas, etiqueta: totalResenas === 1 ? "reseña" : "reseñas" },
                { Icon: Eye, valor: fmtNum(enZona.reduce((s, b) => s + (b.views || 0), 0)), etiqueta: "visitas" },
              ].map(({ Icon, valor, etiqueta }) => (
                <div key={etiqueta} className="flex-1 flex items-center gap-2 px-3 py-2" style={{ borderRadius: 14, background: "#ffffff14", border: "1px solid #ffffff1f" }}>
                  <Icon size={14} color="#7FA8F5" />
                  <span className="min-w-0">
                    <span className="block text-sm font-bold leading-none" style={{ color: "#fff", fontFamily: "var(--fuente-titulo)" }}>{valor}</span>
                    <span className="block text-[10px] mt-0.5" style={{ color: "#B8C9EA" }}>{etiqueta}</span>
                  </span>
                </div>
              ))}
            </div>
          )}

          {ranking.length > 0 && (
            <div className="flex items-end justify-center gap-2" style={{ paddingTop: 6 }}>
              <Puesto biz={plata} puesto={2} />
              <Puesto biz={oro} puesto={1} />
              <Puesto biz={bronce} puesto={3} />
            </div>
          )}
        </div>
      </div>

      {/* cuerpo claro */}
      <div style={{ background: "#F4F7FB", borderRadius: "24px 24px 0 0", marginTop: ranking.length ? -2 : 0, position: "relative", padding: "18px 16px 24px" }}>
        <div className="max-w-3xl mx-auto">
          {categoriasPresentes.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-3 [&>*]:shrink-0" style={{ marginBottom: 6 }}>
              <button
                onClick={() => setCatFiltro(null)}
                className="text-xs font-semibold px-3 py-1.5"
                style={{ borderRadius: 20, background: catFiltro === null ? "#0B1437" : "#fff", color: catFiltro === null ? "#fff" : "#2B3768", border: "1px solid " + (catFiltro === null ? "#0B1437" : "#E3E7F1") }}
              >
                Todas
              </button>
              {categoriasPresentes.map((c) => {
                const Icon = c.icon;
                const act = catFiltro === c.id;
                return (
                  <button
                    key={c.id} onClick={() => setCatFiltro(act ? null : c.id)}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5"
                    style={{ borderRadius: 20, background: act ? c.color : "#fff", color: act ? "#fff" : "#2B3768", border: "1px solid " + (act ? c.color : "#E3E7F1") }}
                  >
                    <Icon size={13} color={act ? "#fff" : c.color} /> {c.label}
                  </button>
                );
              })}
            </div>
          )}

          {ranking.length === 0 ? (
            <div className="text-center py-14 px-6">
              <span className="inline-flex items-center justify-center mb-4" style={{ width: 72, height: 72, borderRadius: 24, background: "#EDF1FF" }}>
                <Trophy size={32} color="#2350F5" />
              </span>
              <p style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 600, fontSize: 17, color: "#0B1437" }}>Todavía no hay ranking</p>
              <p className="text-sm mt-1" style={{ color: "#5B6482" }}>
                {catFiltro ? "No hay negocios de esta categoría en tu zona." : "Cuando los negocios de tu zona reciban visitas, reseñas y favoritos, van a aparecer acá."}
              </p>
            </div>
          ) : (
            <>
              {resto.length > 0 && (
                <p className="text-xs font-semibold mb-2.5 mt-1" style={{ color: "#5B6482", letterSpacing: 0.6 }}>DEL PUESTO 4 AL {ranking.length}</p>
              )}
              <div className="flex flex-col gap-2.5">
                {resto.map((biz, i) => {
                  const puesto = i + 4;
                  const rating = avgRating(biz.reviews);
                  const c = catInfo(biz.cat);
                  const pts = Math.round(rankingScore(biz));
                  const pct = Math.max(6, Math.round((rankingScore(biz) / topScore) * 100));
                  const destacado = puesto <= 10;
                  return (
                    <button
                      key={biz.id} onClick={() => onOpenBusiness(biz.id)}
                      className="w-full flex items-center gap-3 p-3 text-left bg-white transition-shadow hover:shadow-lg"
                      style={{ borderRadius: 18, border: "1px solid #E3E7F1", boxShadow: "0 4px 16px rgba(11,20,55,0.06)" }}
                    >
                      <span className="flex items-center justify-center shrink-0 text-sm font-bold" style={{ width: 32, height: 32, borderRadius: 11, background: destacado ? "#0B1437" : "#EEF3FB", color: destacado ? "#fff" : "#6B7A90", fontFamily: "var(--fuente-titulo)" }}>
                        {puesto}
                      </span>
                      <div className="shrink-0 overflow-hidden" style={{ width: 48, height: 48, borderRadius: 14 }}>
                        <Photo cat={biz.cat} src={biz.logo || biz.photos?.[0]} height={48} radius="14px" iconSize={20} clickable={false} />
                      </div>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold truncate" style={{ color: "#0B1437", fontFamily: "var(--fuente-titulo)" }}>{biz.name}</span>
                        <span className="flex items-center gap-2 text-[11px] mt-0.5" style={{ color: "#5B6482" }}>
                          <span className="font-medium truncate" style={{ color: c?.color }}>{c?.label}</span>
                          {rating && <span className="flex items-center gap-0.5 shrink-0"><Star size={10} fill="#F5A623" color="#F5A623" /> {rating}</span>}
                          <span className="flex items-center gap-0.5 shrink-0"><Eye size={10} /> {fmtNum(biz.views || 0)}</span>
                          {(biz.vecesFavorito || 0) > 0 && <span className="flex items-center gap-0.5 shrink-0"><Heart size={10} color="#C1443A" fill="#C1443A" /> {biz.vecesFavorito}</span>}
                        </span>
                        <span className="block mt-1.5" style={{ height: 5, borderRadius: 5, background: "#EEF0F6", overflow: "hidden" }}>
                          <span className="block" style={{ width: `${pct}%`, height: "100%", borderRadius: 5, background: `linear-gradient(90deg, ${c?.color || "#2350F5"}, ${c?.color || "#2350F5"}aa)` }} />
                        </span>
                      </span>
                      <span className="text-right shrink-0" style={{ minWidth: 38 }}>
                        <span className="block text-base font-bold leading-none" style={{ color: "#0B1437", fontFamily: "var(--fuente-titulo)" }}>{pts}</span>
                        <span className="block text-[10px] mt-0.5" style={{ color: "#64748B" }}>pts</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setVerComo((v) => !v)}
                className="w-full flex items-center justify-between mt-5 px-4 py-3 bg-white"
                style={{ borderRadius: 16, border: "1px solid #E3E7F1" }}
              >
                <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#0B1437" }}><Medal size={16} color="#2350F5" /> ¿Cómo se calcula el ranking?</span>
                <ChevronDown size={16} color="#5B6482" style={{ transform: verComo ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
              </button>
              {verComo && (
                <div className="mt-2 p-4 bg-white" style={{ borderRadius: 16, border: "1px solid #E3E7F1" }}>
                  {[
                    { Icon: Eye, color: "#2350F5", titulo: "Visitas", texto: "Cada vez que alguien entra al perfil del negocio." },
                    { Icon: Star, color: "#F5A623", titulo: "Reseñas y valoración", texto: "Más reseñas y mejores estrellas suman más puntos." },
                    { Icon: Heart, color: "#C1443A", titulo: "Favoritos", texto: "Cada persona que guarda el negocio suma el doble que una visita." },
                  ].map(({ Icon, color, titulo, texto }) => (
                    <div key={titulo} className="flex items-start gap-3 mb-3 last:mb-0">
                      <span className="flex items-center justify-center shrink-0" style={{ width: 32, height: 32, borderRadius: 10, background: `${color}1A` }}><Icon size={15} color={color} /></span>
                      <span>
                        <span className="block text-sm font-semibold" style={{ color: "#0B1437" }}>{titulo}</span>
                        <span className="block text-xs" style={{ color: "#5B6482" }}>{texto}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function HerramientasScreen({ sub, setSub, usuario, ownerBiz, onLogin, onAddBusiness, onAgregarMeses, onEditBusiness, onViewProfile, onOpenAgenda, onOpenRanking, onOpenFavoritos, onOpenPuntos, onGuardarEmpleo, onSubirHistoria, onSaveDiscount, onToggleDiscount, onDeleteDiscount }) {
  const [subiendoHistoria, setSubiendoHistoria] = useState(false);
  const historiaInputRef = useRef(null);

  const handleSubirHistoria = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setSubiendoHistoria(true);
    try {
      const url = await uploadImage(file);
      onSubirHistoria(url);
    } catch {
      alert("No se pudo subir la imagen. Probá de nuevo.");
    } finally {
      setSubiendoHistoria(false);
    }
  };

  // fila de herramienta (para todos)
  const Tool = ({ Icon, bg, title, desc, onClick }) => (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3.5 p-3.5 text-left bg-white mb-2.5 transition-shadow hover:shadow-lg"
      style={{ borderRadius: 18, border: "1px solid #E3E7F1", boxShadow: "0 4px 16px rgba(11,20,55,0.06)" }}
    >
      <span className="flex items-center justify-center shrink-0" style={{ width: 44, height: 44, borderRadius: 14, background: bg, boxShadow: `inset 0 1px 0 rgba(255,255,255,.3), 0 6px 14px ${bg}55` }}>
        <Icon size={20} color="#fff" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold" style={{ color: "#0B1437", fontFamily: "var(--fuente-titulo)" }}>{title}</span>
        <span className="block text-xs mt-0.5" style={{ color: "#5B6482" }}>{desc}</span>
      </span>
      <ChevronDown size={15} color="#B9BCC5" style={{ transform: "rotate(-90deg)" }} />
    </button>
  );

  // mosaico de gestión (solo dueños)
  const Mosaico = ({ Icon, color, title, desc, onClick, badge }) => (
    <button
      onClick={onClick}
      className="relative text-left p-3.5 bg-white transition-all hover:-translate-y-0.5 hover:shadow-lg"
      style={{ borderRadius: 18, border: "1px solid #E3E7F1", boxShadow: "0 4px 16px rgba(11,20,55,0.06)" }}
    >
      <span className="flex items-center justify-center mb-2.5" style={{ width: 40, height: 40, borderRadius: 13, background: `${color}1A` }}>
        <Icon size={19} color={color} />
      </span>
      {badge > 0 && (
        <span className="absolute flex items-center justify-center text-[10px] font-bold" style={{ top: 10, right: 10, minWidth: 20, height: 20, borderRadius: 10, background: "#E5484D", color: "#fff", padding: "0 5px" }}>
          {badge > 9 ? "9+" : badge}
        </span>
      )}
      <span className="block text-sm font-semibold leading-tight" style={{ color: "#0B1437", fontFamily: "var(--fuente-titulo)" }}>{title}</span>
      <span className="block text-[11px] mt-1 leading-snug" style={{ color: "#5B6482" }}>{desc}</span>
    </button>
  );

  const Titulo = ({ children, sub }) => (
    <div className="mb-3 mt-6">
      <p style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 600, fontSize: 15, color: "#0B1437" }}>{children}</p>
      {sub && <p className="text-xs" style={{ color: "#5B6482" }}>{sub}</p>}
    </div>
  );

  const herramientasDeTodos = (
    <>
      <Tool Icon={Heart} bg="#E5484D" title="Favoritos" desc="Los negocios que guardaste." onClick={onOpenFavoritos} />
      <Tool Icon={Coins} bg="#F59E0B" title="Mis puntos" desc="Tus puntos por negocio, recompensas y canjes." onClick={onOpenPuntos} />
      <Tool Icon={Trophy} bg="#8B5CF6" title="Ranking" desc="Los negocios más destacados de tu zona." onClick={onOpenRanking} />
    </>
  );

  // ---------- sin negocio: solo herramientas para clientes ----------
  if (!ownerBiz) {
    return (
      <div>

        {herramientasDeTodos}
      </div>
    );
  }

  // ---------- dueños: panel de control del negocio ----------
  const c = catInfo(ownerBiz.cat);
  const inf = infoSuscripcion(ownerBiz);
  const estadoTexto = !inf ? "Activo" : inf.estado === "pendiente" ? "Falta pagar" : inf.estado === "vencida" ? "Vencida" : inf.estado === "por_vencer" ? "Por vencer" : "Activo";
  const estadoColor = !inf || inf.estado === "activa" ? { bg: "#E4F3EA", fg: "#1E6B44" } : inf.estado === "por_vencer" || inf.estado === "pendiente" ? { bg: "#FBEBD1", fg: "#8A5B12" } : { bg: "#FDF1EF", fg: "#9A3B34" };
  const rating = avgRating(ownerBiz.reviews);
  const promosVigentes = activeDiscounts(ownerBiz).length;
  const resenasSinVer = countUnseenReviews(ownerBiz);
  const tieneAsistente = !!ownerBiz.asistenteCodigoPublico && !!ownerBiz.asistenteActivo;

  const Estadistica = ({ Icon, color, valor, etiqueta }) => (
    <div className="p-3 bg-white" style={{ borderRadius: 16, border: "1px solid #E3E7F1", boxShadow: "0 4px 14px rgba(11,20,55,0.05)" }}>
      <span className="flex items-center justify-center mb-2" style={{ width: 30, height: 30, borderRadius: 10, background: `${color}1A` }}><Icon size={15} color={color} /></span>
      <span className="block leading-none" style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 700, fontSize: 20, color: "#0B1437" }}>{valor}</span>
      <span className="block text-[11px] mt-1" style={{ color: "#5B6482" }}>{etiqueta}</span>
    </div>
  );

  // ---------- subpantallas del dueño (cada una con su botón de volver) ----------
  if (sub === "promos") {
    return (
      <SubPantalla titulo="Mis promociones" desc="Aparecen en tu perfil y destacan tu negocio en la lista." onBack={() => setSub(null)}>
        <PromosSheet business={ownerBiz} onSave={onSaveDiscount} onToggle={onToggleDiscount} onDelete={onDeleteDiscount} />
      </SubPantalla>
    );
  }
  if (sub === "empleo") {
    return (
      <SubPantalla titulo="Búsqueda de personal" onBack={() => setSub(null)}>
        <EmpleoFormModal
          business={ownerBiz}
          onSave={(datos) => { onGuardarEmpleo(datos); setSub(null); }}
          onDelete={() => { onGuardarEmpleo(null); setSub(null); }}
        />
      </SubPantalla>
    );
  }
  if (sub === "qr") {
    return (
      <SubPantalla titulo="Mi código QR" onBack={() => setSub(null)}>
        <div className="bg-white p-6 text-center" style={{ borderRadius: 24, border: "1px solid #E3E7F1" }}>
          <img
            alt="Código QR de tu negocio"
            className="mx-auto mb-4"
            style={{ width: 200, height: 200, borderRadius: 14, border: "1px solid #E3E7F1" }}
            src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(`${window.location.origin}${window.location.pathname}?negocio=${ownerBiz.id}`)}`}
          />
          <p className="text-xs mb-3" style={{ color: "#5B6482" }}>Los clientes que escaneen este código van a llegar directo al perfil de tu negocio en Mi Zona.</p>
          <button onClick={() => shareBusiness(ownerBiz)} className="w-full text-sm font-semibold py-3" style={{ background: "linear-gradient(135deg,#2350F5,#5B91F7)", color: "#fff", borderRadius: 14 }}>
            Compartir enlace
          </button>
        </div>
      </SubPantalla>
    );
  }

  return (
    <div>

      {/* tarjeta de identidad */}
      <div data-conservar-color className="relative overflow-hidden p-4 mb-3" style={{ borderRadius: 22, background: "radial-gradient(420px 220px at 105% -20%, rgba(54,104,255,.55), transparent 60%), radial-gradient(260px 160px at -10% 120%, rgba(23,198,255,.22), transparent 60%), #0a1235", boxShadow: "0 14px 30px rgba(11,20,55,.28)" }}>
        <div style={{ position: "absolute", top: -50, right: -40, width: 150, height: 150, borderRadius: "50%", background: "#ffffff12" }} />
        <div className="relative flex items-center gap-3.5">
          <div className="shrink-0 overflow-hidden flex items-center justify-center text-xl font-bold" style={{ width: 62, height: 62, borderRadius: 20, background: c?.color || "#2350F5", color: "#fff", border: "3px solid #ffffff55", fontFamily: "var(--fuente-titulo)" }}>
            {ownerBiz.logo ? <img src={ownerBiz.logo} alt="" className="w-full h-full object-cover" /> : ownerBiz.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate" style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 700, fontSize: 18, color: "#fff" }}>{ownerBiz.name}</p>
            <p className="text-xs truncate" style={{ color: "#BBD1FB" }}>{c?.label} · {ownerBiz.zone}</p>
            <span className="inline-block text-[10px] font-bold px-2 py-0.5 mt-1.5" style={{ borderRadius: 10, background: estadoColor.bg, color: estadoColor.fg }}>{estadoTexto}</span>
          </div>
        </div>
        <button onClick={onViewProfile} className="relative w-full flex items-center justify-center gap-1.5 text-sm font-semibold py-2.5 mt-4" style={{ borderRadius: 14, background: "#ffffff1f", color: "#fff", border: "1px solid #ffffff33" }}>
          <Eye size={15} /> Ver cómo lo ven mis clientes
        </button>
      </div>

      <TarjetaSuscripcion negocio={ownerBiz} onAgregar={onAgregarMeses} />

      {/* números del negocio */}
      <div className="grid grid-cols-2 gap-2.5 mb-1">
        <Estadistica Icon={Eye} color="#2350F5" valor={fmtNum(ownerBiz.views || 0)} etiqueta="Visitas a tu perfil" />
        <Estadistica Icon={Heart} color="#E5484D" valor={fmtNum(ownerBiz.vecesFavorito || 0)} etiqueta="Veces guardado en favoritos" />
        <Estadistica Icon={Star} color="#F5A623" valor={rating ? `${rating}` : "—"} etiqueta={`${ownerBiz.reviews?.length || 0} ${(ownerBiz.reviews?.length || 0) === 1 ? "reseña" : "reseñas"}`} />
        <Estadistica Icon={Tag} color="#B8703F" valor={promosVigentes} etiqueta={promosVigentes === 1 ? "promoción vigente" : "promociones vigentes"} />
      </div>

      <Titulo sub="Todo para controlar los datos de tu negocio">Gestionar mi negocio</Titulo>
      <div className="grid grid-cols-2 gap-2.5">
        <Mosaico Icon={CalendarCheck} color="#E5484D" title="Mi agenda" desc="Eventos, tareas y recordatorios del día." onClick={onOpenAgenda} />
        <Mosaico Icon={Store} color="#1E8A55" title="Editar mis datos" desc="Nombre, fotos, horarios, dirección y contacto." onClick={onEditBusiness} />
        <Mosaico Icon={Megaphone} color="#13897F" title="Promociones" desc={promosVigentes ? `${promosVigentes} vigente(s) ahora` : "Creá descuentos para atraer clientes."} onClick={() => setSub("promos")} />
        <Mosaico Icon={MessageCircle} color="#7A4FD6" title="Reseñas" desc="Leé y respondé lo que dicen tus clientes." onClick={onViewProfile} badge={resenasSinVer} />
        <Mosaico Icon={PartyPopper} color="#2C9A5F" title="Subir historia" desc={subiendoHistoria ? "Subiendo..." : `${historiasActivas(ownerBiz).length} activa(s) ahora`} onClick={() => !subiendoHistoria && historiaInputRef.current?.click()} />
        <Mosaico Icon={Briefcase} color="#C97B4A" title="Buscar personal" desc={busquedaEmpleoActiva(ownerBiz) ? `Publicada: ${ownerBiz.busquedaEmpleo.puesto}` : "Publicá si necesitás sumar gente."} onClick={() => setSub("empleo")} />
        <Mosaico Icon={QrCode} color="#0B1437" title="Mi código QR" desc="Para que tus clientes te encuentren." onClick={() => setSub("qr")} />
        <Mosaico Icon={Share2} color="#7A4F9E" title="Compartir" desc="Mandalo por redes o WhatsApp." onClick={() => shareBusiness(ownerBiz)} />
        {tieneAsistente ? (
          <Mosaico Icon={Sparkles} color="#7A4F9E" title="Mi Asistente" desc="Clientes, pedidos, puntos y tu asistente virtual." onClick={() => window.open(MI_ASISTENTE_ADMIN_URL, "_blank")} />
        ) : (
          <Mosaico Icon={Download} color="#2C9A5F" title="Conseguir Mi Asistente" desc="Un asistente con IA que atiende a tus clientes." onClick={() => window.open(MI_ASISTENTE_URL, "_blank")} />
        )}
      </div>
      <input ref={historiaInputRef} type="file" accept="image/*" className="hidden" onChange={handleSubirHistoria} />

      <Titulo>Para explorar</Titulo>
      {herramientasDeTodos}

    </div>
  );
}

function AjustesScreen({ sub, setSub, usuario, negocios, onAbrirNegocio, onLogin, onLogged, onUsuarioActualizado, onCerrarSesion, onBorrarDatosLocales, onBorrarVistos, onCuentaEliminada }) {
  const [tema, setTemaEstado] = useState(() => getTema());
  // al cerrar sesión se vuelve a la lista de Ajustes (en vez de quedar en "Mi cuenta")
  useEffect(() => { if (!usuario && sub === "cuenta") setSub(null); }, [usuario?.id]);
  // Ayuda y Soporte se mandan entre sí (por ejemplo, "No me sirvió" → escribir a Soporte con el tema ya elegido)
  const [soporteCtx, setSoporteCtx] = useState({ tema: null, directo: false, desde: null });
  const irSoporte = (tema, desde, directo) => { setSoporteCtx({ tema: tema || null, directo: !!directo, desde: desde || null }); setSub("soporte"); };

  const TONOS = {
    azul: { bg: "linear-gradient(180deg,#EEF4FF,#DCE8FD)", fg: "#2350F5", aro: "#D3E1FA" },
    violeta: { bg: "linear-gradient(180deg,#F5EFFE,#E8DDFB)", fg: "#7A4FD6", aro: "#E0D2F8" },
    verde: { bg: "linear-gradient(180deg,#E9F8F0,#D4F0E1)", fg: "#1E8A55", aro: "#C3E8D3" },
    naranja: { bg: "linear-gradient(180deg,#FFF5E3,#FFE8C2)", fg: "#E08A12", aro: "#FADFAE" },
    rojo: { bg: "linear-gradient(180deg,#FEEFED,#FADBD7)", fg: "#D9423A", aro: "#F5C6C1" },
    agua: { bg: "linear-gradient(180deg,#E4F7F6,#CCEEEC)", fg: "#13897F", aro: "#BDE6E3" },
  };
  const Row = ({ Icon, title, desc, onClick, danger = false, badge, disabled = false, tono = "azul" }) => {
    const t = TONOS[danger ? "rojo" : tono];
    return (
    <button
      onClick={onClick} disabled={disabled}
      className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left bg-white hover:bg-slate-50"
      style={{ borderBottom: "1px solid #EEF0F6", opacity: disabled ? 0.55 : 1 }}
    >
      <span className="flex items-center justify-center shrink-0" style={{ width: 46, height: 46, borderRadius: 15, background: t.bg, boxShadow: `inset 0 0 0 1px ${t.aro}` }}>
        <Icon size={21} color={t.fg} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: danger ? "#9A3B34" : "#0B1437" }}>{title}</span>
          {badge && <span className="text-[10px] font-semibold px-1.5 py-0.5" style={{ background: "#F5F1E6", color: "#8A5B12", borderRadius: 6 }}>{badge}</span>}
        </span>
        {desc && <span className="block text-[13px] mt-0.5" style={{ color: "#5B6482", lineHeight: 1.4 }}>{desc}</span>}
      </span>
      <ChevronDown size={16} color="#B9C0D6" style={{ transform: "rotate(-90deg)" }} />
    </button>
    );
  };
  const SeccionAjustes = ({ Icon, children }) => (
    <div className="flex items-center gap-2.5 mb-2.5 px-0.5">
      <Icon size={19} color="#0B1437" />
      <span style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 700, fontSize: 16, color: "#0B1437" }}>{children}</span>
      <span className="flex-1" style={{ height: 1, background: "#E3E7F1" }} />
    </div>
  );

  if (sub === "cuenta") {
    return (
      <MiCuentaScreen
        usuario={usuario} local={{ favoritos: getFavorites().length }} negocios={negocios} onAbrirNegocio={onAbrirNegocio} onBack={() => setSub(null)} onLogged={onLogged}
        onUsuarioActualizado={onUsuarioActualizado}
        onCerrarSesion={onCerrarSesion}
        onCuentaEliminada={onCuentaEliminada}
      />
    );
  }
  if (sub === "notificaciones") {
    return <NotificacionesPushScreen usuario={usuario} onBack={() => setSub(null)} onLogin={onLogin} />;
  }

  if (sub === "seguridad") {
    return <SeguridadScreen usuario={usuario} onBack={() => setSub(null)} onLogin={() => onLogin("login")} />;
  }

  if (sub === "apariencia") {
    const opciones = [
      { id: "claro", titulo: "Claro", desc: "Fondo blanco, como siempre.", Icon: Sun },
      { id: "oscuro", titulo: "Oscuro", desc: "Fondo oscuro, más cómodo de noche.", Icon: Moon },
      { id: "auto", titulo: "Automático", desc: "Sigue el modo de tu celular.", Icon: Smartphone },
    ];
    return (
      <div>
        <BotonVolver texto="Volver a Ajustes" onClick={() => setSub(null)} />
        <h2 style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 600, fontSize: 18, color: "#0B1437" }} className="mb-1">Apariencia</h2>
        <p className="text-xs mb-4" style={{ color: "#5B6482" }}>Elegí cómo querés ver Mi Zona</p>
        <div className="overflow-hidden" style={{ borderRadius: 20, border: "1px solid #E3E7F1", boxShadow: "0 6px 20px rgba(11,20,55,0.07)" }}>
          {opciones.map(({ id, titulo, desc, Icon }) => {
            const activa = tema === id;
            return (
              <button
                key={id} onClick={() => { guardarTema(id); setTemaEstado(id); }}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left bg-white"
                style={{ borderBottom: "1px solid #EEF0F6" }}
              >
                <span className="flex items-center justify-center shrink-0" style={{ width: 38, height: 38, borderRadius: 13, background: activa ? "#2350F5" : "#EDF1FF" }}>
                  <Icon size={17} color={activa ? "#fff" : "#2350F5"} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium" style={{ color: "#0B1437" }}>{titulo}</span>
                  <span className="block text-xs mt-0.5" style={{ color: "#5B6482" }}>{desc}</span>
                </span>
                {activa && <Check size={18} color="#2350F5" />}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (sub === "privacidad") {
    return (
      <PrivacidadScreen
        usuario={usuario}
        onBack={() => setSub(null)}
        onLogin={() => onLogin("login")}
        onIrCuenta={() => setSub("cuenta")}
        onIrSeguridad={() => setSub("seguridad")}
        local={{ favoritos: getFavorites().length, chats: getAllConversationIds().length, vistos: getRecentlyViewed().length, busquedas: getSearchHistory().length }}
        onBorrarVistos={onBorrarVistos}
        onBorrarDatosLocales={onBorrarDatosLocales}
      />
    );
  }

  if (sub === "acerca") {
    return <AcercaScreen onBack={() => setSub(null)} onIrSoporte={() => irSoporte(null, "acerca", false)} />;
  }
  if (sub === "ayuda") {
    return <AyudaScreen onBack={() => setSub(null)} onContactar={(tema) => irSoporte(tema, "ayuda", true)} />;
  }
  if (sub === "soporte") {
    const desde = soporteCtx.desde;
    return (
      <SoporteScreen
        usuario={usuario} temaInicial={soporteCtx.tema} directo={soporteCtx.directo}
        textoVolver={desde === "acerca" ? "Volver a Acerca de Mi Zona" : desde === "ayuda" ? "Volver al Centro de ayuda" : "Volver a Ajustes"}
        onBack={() => { setSoporteCtx({ tema: null, directo: false, desde: null }); setSub(desde || null); }}
        onLogin={() => onLogin("login")}
        onIrAyuda={() => setSub("ayuda")}
      />
    );
  }

  return (
    <div>
      <SeccionAjustes Icon={User}>Cuenta y personalización</SeccionAjustes>
      <div className="overflow-hidden mb-6" style={{ borderRadius: 22, border: "1px solid #E3E7F1", boxShadow: "0 1px 2px rgba(11,20,55,.04)" }}>
        <Row Icon={User} tono="azul" title="Mi cuenta" desc={usuario ? (usuario.nombre || usuario.email) : "Iniciá sesión con Google para acceder"} onClick={() => setSub("cuenta")} />
        <Row Icon={Bell} tono="violeta" title="Notificaciones" desc="Avisos en tu celular, como los días que le quedan a tu suscripción" onClick={() => setSub("notificaciones")} />
        <Row Icon={ShieldCheck} tono="verde" title="Seguridad" desc="Contraseña, dispositivos y actividad de tu cuenta" onClick={() => setSub("seguridad")} />
        <Row Icon={IconoSolLuna} tono="naranja" title="Apariencia" desc={`Modo ${tema === "oscuro" ? "oscuro" : tema === "claro" ? "claro" : "automático"}`} onClick={() => setSub("apariencia")} />
        <Row Icon={Lock} tono="violeta" title="Privacidad" desc="Tus datos, controles de uso, descarga y eliminación" onClick={() => setSub("privacidad")} />
        {usuario && <Row Icon={LogOut} title="Cerrar sesión" desc={`Salir de ${usuario.email}`} danger onClick={onCerrarSesion} />}
      </div>

      <SeccionAjustes Icon={Info}>Soporte y más</SeccionAjustes>
      <div className="overflow-hidden mb-4" style={{ borderRadius: 22, border: "1px solid #E3E7F1", boxShadow: "0 1px 2px rgba(11,20,55,.04)" }}>
        <Row Icon={BookOpen} tono="azul" title="Acerca de Mi Zona" desc="Versión, términos y privacidad" onClick={() => setSub("acerca")} />
        <Row Icon={MessageCircle} tono="agua" title="Centro de ayuda" desc="Respuestas a las dudas más comunes" onClick={() => setSub("ayuda")} />
        <Row Icon={Send} tono="violeta" title="Soporte" desc="Escribinos o mirá tus consultas" onClick={() => setSub("soporte")} />
      </div>
    </div>
  );
}


function BottomNav({ active, onInicio, onChats, onAdd, onHerramientas, onAjustes, chatsSinLeer }) {
  const Item = ({ id, label, Icon, onClick, badge }) => {
    const on = active === id;
    return (
      <button onClick={onClick} aria-current={on ? "page" : undefined} className="flex flex-col items-center gap-0.5 py-1 relative" style={{ flex: 1 }}>
        <span className="relative flex items-center justify-center" style={{ width: 46, height: 28, borderRadius: 9, background: on ? "#E9EEFF" : "transparent", transition: "background .2s ease" }}>
          <Icon size={20} color={on ? "#2350F5" : "#8D95B0"} strokeWidth={on ? 2.3 : 1.9} />
          {badge > 0 && (
            <span
              className="absolute flex items-center justify-center text-[9px] font-bold"
              style={{ top: -4, right: 2, minWidth: 16, height: 16, borderRadius: 8, background: "#E5484D", color: "#fff", padding: "0 4px", border: "2px solid #fff" }}
            >
              {badge > 9 ? "9+" : badge}
            </span>
          )}
        </span>
        <span className="text-[10px]" style={{ color: on ? "#2350F5" : "#8D95B0", fontWeight: on ? 700 : 500 }}>{label}</span>
      </button>
    );
  };
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40" style={{ background: "#fff", borderRadius: "24px 24px 0 0", boxShadow: "none", borderTop: "1px solid #E3E7F1" }}>
      {/* botón flotante "+", elevado por encima de la barra, centrado */}
      <button
        onClick={onAdd} aria-label="Agregar mi negocio"
        className="fixed flex items-center justify-center"
        style={{
          left: "50%", transform: "translateX(-50%)", bottom: 44, width: 56, height: 56, borderRadius: "50%",
          background: "linear-gradient(135deg,#2350F5,#5B91F7)", boxShadow: "0 12px 24px -6px rgba(35,80,245,0.6), 0 0 0 1px rgba(35,80,245,0.18)", border: "4px solid #fff", zIndex: 41,
        }}
      >
        <Plus size={24} color="#fff" strokeWidth={2.6} />
      </button>

      <div className="max-w-6xl mx-auto px-3 flex items-center" style={{ paddingTop: 8, paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}>
        <Item id="inicio" label="Inicio" Icon={Home} onClick={onInicio} />
        <Item id="chats" label="Chats" Icon={MessageCircle} onClick={onChats} badge={chatsSinLeer} />
        <div style={{ width: 62 }} />
        <Item id="herramientas" label="Herramientas" Icon={Wrench} onClick={onHerramientas} />
        <Item id="ajustes" label="Ajustes" Icon={Settings} onClick={onAjustes} />
      </div>
    </div>
  );
}

/* ---------- formulario de negocio (admin y alta pública) ---------- */

function BusinessForm({ initial, onSave, onCancel, publicMode = false }) {
  const [form, setForm] = useState(initial);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingPortada, setUploadingPortada] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const setBool = (k) => (e) => setForm({ ...form, [k]: e.target.checked });

  const togglePayment = (method) => {
    setForm((f) => ({
      ...f,
      paymentMethods: f.paymentMethods.includes(method) ? f.paymentMethods.filter((m) => m !== method) : [...f.paymentMethods, method],
    }));
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    setUploadError(null);
    try {
      const url = await uploadImage(file);
      setForm((f) => ({ ...f, logo: url }));
    } catch (err) {
      console.error(err);
      setUploadError("No se pudo subir el logo. Revisá la configuración de Cloudinary.");
    } finally {
      setUploadingLogo(false);
      e.target.value = "";
    }
  };

  // Foto de fondo del perfil: una sola, la elige el dueño (no se toma de las fotos de productos)
  const handlePortadaUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPortada(true);
    setUploadError(null);
    try {
      const url = await uploadImage(file);
      setForm((f) => ({ ...f, portada: url }));
      setFormError(null);
    } catch (err) {
      console.error(err);
      setUploadError("No se pudo subir la foto de fondo. Revisá la configuración de Cloudinary.");
    } finally {
      setUploadingPortada(false);
      e.target.value = "";
    }
  };

  const handlePhotosUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploadingPhotos(true);
    setUploadError(null);
    try {
      const urls = await Promise.all(files.map((f) => uploadImage(f)));
      setForm((f) => ({ ...f, photos: [...(f.photos || []), ...urls] }));
    } catch (err) {
      console.error(err);
      setUploadError("No se pudieron subir una o más fotos. Revisá la configuración de Cloudinary.");
    } finally {
      setUploadingPhotos(false);
      e.target.value = "";
    }
  };

  const removePhoto = (url) => setForm((f) => ({ ...f, photos: f.photos.filter((p) => p !== url) }));

  const submit = async () => {
    if (!form.name.trim()) { setFormError("Escribí el nombre del negocio."); return; }
    if (!form.phone.trim()) { setFormError("Escribí el teléfono de contacto."); return; }
    if (!form.logo) { setFormError("Subí el logo de tu negocio: es obligatorio."); return; }
    if (!form.portada) { setFormError("Elegí la foto de fondo de tu perfil: es obligatoria."); return; }
    setFormError(null);
    setSaving(true);
    let coords = { lat: form.lat ?? null, lng: form.lng ?? null };
    // Si cambió la dirección o todavía no tiene coordenadas, geocodificamos automáticamente
    if (form.loc?.trim() && (!coords.lat || form.loc !== initial.loc || form.zone !== initial.zone)) {
      const geo = await geocodeAddress(form.loc, form.zone);
      if (geo) coords = geo;
    }
    setSaving(false);
    // Si la dirección no se pudo ubicar, el negocio no va a aparecer en el mapa: se le avisa antes de seguir
    if (form.loc?.trim() && !coords.lat && !window.confirm("No pudimos ubicar esa dirección en el mapa. Si seguís, tu negocio se va a ver en la lista pero no en el mapa. ¿Querés continuar igual? (Podés volver y escribir la dirección con calle y número.)")) return;
    onSave({ ...form, lat: coords.lat, lng: coords.lng, status: publicMode && !initial.name ? "inactive" : form.status });
  };

  return (
    <div className="fixed inset-0 z-[75] flex items-start justify-center overflow-y-auto" style={{ background: "#F3F5FA" }}>
      <div className="w-full max-w-lg p-5 pb-10">
        <BotonVolver texto="Volver" onClick={onCancel} />
        <h2 className="mb-4" style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 700, fontSize: 20, color: "#0B1437" }}>
          {initial.name ? "Editar mis datos" : "Registrar mi negocio"}
        </h2>
        <div className="bg-white p-5" style={{ borderRadius: 18, border: "1px solid #E3E7F1" }}>

        <div className="flex flex-col gap-3">
          <input placeholder="Nombre del negocio" value={form.name} onChange={set("name")} className="border px-3 py-2 text-sm" style={{ borderRadius: 8, borderColor: "#E3E7F1" }} />

          <select value={form.cat} onChange={set("cat")} className="border px-3 py-2 text-sm" style={{ borderRadius: 8, borderColor: "#E3E7F1" }}>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <ZonePicker value={form.zone} onChange={(z) => setForm((f) => ({ ...f, zone: z }))} />

          <textarea placeholder="Descripción" value={form.desc} onChange={set("desc")} rows={2} className="border px-3 py-2 text-sm" style={{ borderRadius: 8, borderColor: "#E3E7F1" }} />

          <div>
            <p className="text-xs font-medium mb-1" style={{ color: "#2B3768" }}>Servicios disponibles</p>
            <TagInput values={form.services} onChange={(v) => setForm({ ...form, services: v })} placeholder="Ej: reparación de celulares" />
          </div>
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: "#2B3768" }}>Especialidades</p>
            <TagInput values={form.specialties} onChange={(v) => setForm({ ...form, specialties: v })} placeholder="Ej: pastelería sin gluten" />
          </div>

          <div className="p-3" style={{ borderRadius: 8, background: "#F3F5FA", border: "1px solid #E3E7F1" }}>
            <p className="text-xs font-semibold mb-2.5" style={{ color: "#0B1437" }}>
              Preguntas sobre tu rubro ({CATEGORIES.find((c) => c.id === form.cat)?.label})
            </p>
            <div className="flex flex-col gap-2.5">
              {(CATEGORY_QUESTIONS[form.cat] || DEFAULT_QUESTIONS).map((q) => (
                <div key={q.key}>
                  {q.type === "bool" ? (
                    <label className="flex items-center gap-2 text-sm" style={{ color: "#1F2937" }}>
                      <input
                        type="checkbox"
                        checked={!!form.extra?.[q.key]}
                        onChange={(e) => setForm((f) => ({ ...f, extra: { ...f.extra, [q.key]: e.target.checked } }))}
                      />
                      {q.label}
                    </label>
                  ) : (
                    <>
                      <p className="text-xs mb-1" style={{ color: "#2B3768" }}>{q.label}</p>
                      <input
                        placeholder={q.placeholder}
                        value={form.extra?.[q.key] || ""}
                        onChange={(e) => setForm((f) => ({ ...f, extra: { ...f.extra, [q.key]: e.target.value } }))}
                        className="border px-3 py-2 text-sm w-full" style={{ borderRadius: 8, borderColor: "#E3E7F1" }}
                      />
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium mb-1" style={{ color: "#2B3768" }}>Métodos de pago</p>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_METHODS.map((m) => {
                const active = form.paymentMethods.includes(m);
                return (
                  <button key={m} type="button" onClick={() => togglePayment(m)}
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5"
                    style={{ borderRadius: 8, border: "1px solid " + (active ? "#0B1437" : "#E3E7F1"), backgroundColor: active ? "#0B1437" : "#fff", color: active ? "#fff" : "#0B1437" }}
                  >
                    {active && <Check size={12} />} {m}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.delivery} onChange={setBool("delivery")} /> Hace envíos</label>

          <input placeholder="Teléfono de contacto (código país, sin +)" value={form.phone} onChange={set("phone")} className="border px-3 py-2 text-sm" style={{ borderRadius: 8, borderColor: "#E3E7F1" }} />
          <input placeholder="Usuario de Instagram (sin @, opcional)" value={form.ig} onChange={set("ig")} className="border px-3 py-2 text-sm" style={{ borderRadius: 8, borderColor: "#E3E7F1" }} />
          <input placeholder="Usuario de TikTok (sin @, opcional)" value={form.tiktok || ""} onChange={set("tiktok")} className="border px-3 py-2 text-sm" style={{ borderRadius: 8, borderColor: "#E3E7F1" }} />
          <input placeholder="Facebook: usuario o link de tu página (opcional)" value={form.facebook || ""} onChange={set("facebook")} className="border px-3 py-2 text-sm" style={{ borderRadius: 8, borderColor: "#E3E7F1" }} />

          <div>
            <p className="text-xs font-medium mb-1" style={{ color: "#2B3768" }}>Logo (obligatorio)</p>
            <div className="flex items-center gap-3">
              {form.logo && <img src={form.logo} alt="" className="w-12 h-12 object-cover" style={{ borderRadius: 8 }} />}
              <label className="text-xs font-medium px-3 py-2 cursor-pointer" style={{ borderRadius: 8, border: "1px solid #E3E7F1" }}>
                {uploadingLogo ? "Subiendo..." : form.logo ? "Cambiar" : "Elegir foto"}
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
              </label>
              {form.logo && !uploadingLogo && (
                <button type="button" onClick={() => setForm({ ...form, logo: "" })} className="text-xs" style={{ color: "#C1443A" }}>Quitar</button>
              )}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium mb-1" style={{ color: "#2B3768" }}>Foto de fondo de tu perfil (obligatoria, una sola)</p>
            {form.portada && <img src={form.portada} alt="" className="w-full object-cover mb-2" style={{ height: 96, borderRadius: 10 }} />}
            <div className="flex items-center gap-3">
              <label className="text-xs font-medium px-3 py-2 cursor-pointer" style={{ borderRadius: 8, border: "1px solid #E3E7F1" }}>
                {uploadingPortada ? "Subiendo..." : form.portada ? "Cambiar" : "Elegir foto"}
                <input type="file" accept="image/*" className="hidden" onChange={handlePortadaUpload} disabled={uploadingPortada} />
              </label>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium mb-1" style={{ color: "#2B3768" }}>Fotos de productos</p>
            {form.photos?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {form.photos.map((url) => (
                  <div key={url} className="relative">
                    <img src={url} alt="" className="w-16 h-16 object-cover" style={{ borderRadius: 8 }} />
                    <button type="button" onClick={() => removePhoto(url)} className="absolute -top-1.5 -right-1.5 bg-white" style={{ borderRadius: "50%", border: "1px solid #E3E7F1" }}>
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <label className="text-xs font-medium px-3 py-2 cursor-pointer inline-block" style={{ borderRadius: 8, border: "1px solid #E3E7F1" }}>
              {uploadingPhotos ? "Subiendo..." : "Agregar fotos"}
              <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotosUpload} disabled={uploadingPhotos} />
            </label>
            {uploadError && <p className="text-xs mt-1" style={{ color: "#C1443A" }}>{uploadError}</p>}
          </div>

          <input placeholder="Dirección (calle y número)" value={form.loc} onChange={set("loc")} className="border px-3 py-2 text-sm" style={{ borderRadius: 8, borderColor: "#E3E7F1" }} />

          <div>
            <p className="text-xs font-medium mb-1.5" style={{ color: "#2B3768" }}>Horarios de la semana</p>
            <WeekHoursEditor value={form.weekHours} onChange={(v) => setForm({ ...form, weekHours: v })} />
          </div>

          {formError && <p className="text-xs font-medium" style={{ color: "#C1443A" }}>{formError}</p>}
          <div className="flex gap-2 mt-2">
            <button onClick={onCancel} className="flex-1 py-2.5 text-sm font-medium" style={{ borderRadius: 8, border: "1px solid #E3E7F1" }}>Cancelar</button>
            <button onClick={submit} disabled={saving} className="flex-1 py-2.5 text-sm font-semibold" style={{ backgroundColor: "#0B1437", color: "#fff", borderRadius: 8, opacity: saving ? 0.7 : 1 }}>
              {saving ? "Ubicando dirección..." : publicMode && !initial.name ? "Aceptar" : "Guardar"}
            </button>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- empleos ---------- */


const TIPOS_PUESTO = ["Cocina", "Chef", "Atención al cliente / Mozo", "Delivery / Repartidor", "Administrativo", "Ventas", "Otro"];
const DURACIONES_BUSQUEDA = [
  { dias: 7, label: "7 días" },
  { dias: 15, label: "15 días" },
  { dias: 30, label: "30 días" },
  { dias: 60, label: "60 días" },
];

function contactoEmpleoLink(b) {
  if (!b.busquedaEmpleo?.contactoValor) return "#";
  if (b.busquedaEmpleo.contactoTipo === "whatsapp") {
    return `https://wa.me/${b.busquedaEmpleo.contactoValor}?text=${encodeURIComponent(`Hola, te escribo por la búsqueda de personal (${b.busquedaEmpleo.puesto}) en Mi Zona.`)}`;
  }
  return /^https?:\/\//i.test(b.busquedaEmpleo.contactoValor) ? b.busquedaEmpleo.contactoValor : "#"; // nunca "javascript:" u otros esquemas
}

// Modal que ve el CLIENTE al tocar el aviso de "busca personal" en el perfil del negocio
// Visor de historias a pantalla completa: tocar la mitad derecha avanza, la izquierda retrocede
function HistoriaViewerModal({ business, historias, onClose }) {
  const [i, setI] = useState(0);
  const DURACION = 5000; // ms por historia, como cualquier red social

  useEffect(() => {
    if (i >= historias.length) { onClose(); return; }
    const t = setTimeout(() => setI((v) => v + 1), DURACION);
    return () => clearTimeout(t);
  }, [i, historias.length, onClose]);

  if (i >= historias.length) return null;
  const actual = historias[i];

  const tocar = (e) => {
    const x = e.clientX ?? e.changedTouches?.[0]?.clientX ?? 0;
    const mitad = window.innerWidth / 2;
    if (x < mitad) setI((v) => Math.max(0, v - 1));
    else setI((v) => (v + 1 >= historias.length ? historias.length : v + 1));
  };

  return (
    <div className="fixed inset-0 z-[90]" style={{ background: "#000" }}>
      <div className="absolute top-0 left-0 right-0 flex gap-1 px-2 pt-3 z-10">
        {historias.map((h, idx) => (
          <div key={h.id} className="flex-1 overflow-hidden" style={{ height: 3, borderRadius: 2, background: "#ffffff40" }}>
            <div style={{ height: "100%", width: idx < i ? "100%" : idx === i ? "100%" : "0%", background: "#fff", transition: idx === i ? `width ${DURACION}ms linear` : "none" }} />
          </div>
        ))}
      </div>

      <div className="absolute flex items-center gap-2 z-10" style={{ top: 20, left: 12, right: 12 }}>
        <div className="flex items-center justify-center shrink-0 text-xs font-bold" style={{ width: 28, height: 28, borderRadius: "50%", background: "#2350F5", color: "#fff" }}>
          {business.name?.[0]?.toUpperCase()}
        </div>
        <span className="text-sm font-semibold" style={{ color: "#fff" }}>{business.name}</span>
        <button onClick={onClose} className="ml-auto"><X size={22} color="#fff" /></button>
      </div>

      <div className="w-full h-full flex items-center justify-center" onClick={tocar}>
        <img src={actual.url} alt="" className="max-w-full max-h-full object-contain" />
      </div>
    </div>
  );
}

function EmpleoDetalleModal({ business, onClose }) {
  const e = business.busquedaEmpleo;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: "#0B143766" }} onClick={onClose}>
      <div className="bg-white w-full max-w-sm p-6" style={{ borderRadius: 16 }} onClick={(ev) => ev.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <span className="flex items-center gap-2" style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 600, fontSize: 16, color: "#0B1437" }}>
            <Briefcase size={17} color="#2350F5" /> Buscan personal
          </span>
          <button onClick={onClose}><X size={18} color="#5B6482" /></button>
        </div>
        <p className="text-xs font-semibold mb-1" style={{ color: "#2350F5" }}>{e.puesto}</p>
        <p className="text-sm mb-5" style={{ color: "#1F2937", lineHeight: 1.6 }}>{e.descripcion}</p>
        <a
          href={contactoEmpleoLink(business)} target="_blank" rel="noreferrer"
          className="flex items-center justify-center gap-2 text-sm font-semibold py-3 w-full"
          style={{ backgroundColor: "#2350F5", color: "#fff", borderRadius: 10 }}
        >
          {e.contactoTipo === "whatsapp" ? <MessageCircle size={16} /> : <Share2 size={16} />}
          Contactar por esta búsqueda
        </a>
      </div>
    </div>
  );
}

// Modal que usa el DUEÑO para crear, editar o eliminar su búsqueda de personal
function EmpleoFormModal({ business, onSave, onDelete }) {
  const existente = business.busquedaEmpleo;
  const [puesto, setPuesto] = useState(existente?.puesto || TIPOS_PUESTO[0]);
  const [otro, setOtro] = useState(existente?.puesto && !TIPOS_PUESTO.includes(existente.puesto) ? existente.puesto : "");
  const [descripcion, setDescripcion] = useState(existente?.descripcion || "");
  const [dias, setDias] = useState(30);
  const [contactoTipo, setContactoTipo] = useState(existente?.contactoTipo || "whatsapp");
  const [contactoValor, setContactoValor] = useState(existente?.contactoValor || "");

  const guardar = () => {
    const puestoFinal = puesto === "Otro" ? (otro.trim() || "Otro") : puesto;
    if (!puestoFinal.trim() || !descripcion.trim() || !contactoValor.trim()) return;
    const ahora = new Date();
    const fin = new Date(ahora); fin.setDate(fin.getDate() + dias);
    onSave({
      puesto: puestoFinal.trim(), descripcion: descripcion.trim(),
      contactoTipo, contactoValor: contactoValor.trim(),
      fechaInicio: ahora.toISOString(), fechaFin: fin.toISOString(),
    });
  };

  return (
    <div>
      <div className="bg-white p-5" style={{ borderRadius: 18, border: "1px solid #E3E7F1" }}>

        <div className="flex flex-col gap-3">
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: "#2B3768" }}>Tipo de puesto</p>
            <select value={puesto} onChange={(e) => setPuesto(e.target.value)} className="w-full border px-3 py-2.5 text-sm" style={{ borderRadius: 8, borderColor: "#E3E7F1" }}>
              {TIPOS_PUESTO.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {puesto === "Otro" && (
            <input value={otro} onChange={(e) => setOtro(e.target.value)} placeholder="¿Qué puesto buscás?" className="w-full border px-3 py-2.5 text-sm" style={{ borderRadius: 8, borderColor: "#E3E7F1" }} />
          )}
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: "#2B3768" }}>Descripción del trabajo</p>
            <textarea
              value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={3}
              placeholder="Contá qué va a hacer la persona, horarios, requisitos..."
              className="w-full border px-3 py-2.5 text-sm" style={{ borderRadius: 8, borderColor: "#E3E7F1" }}
            />
          </div>
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: "#2B3768" }}>¿Cuánto tiempo va a estar publicada?</p>
            <div className="flex gap-2 flex-wrap">
              {DURACIONES_BUSQUEDA.map((d) => (
                <button
                  key={d.dias} onClick={() => setDias(d.dias)}
                  className="text-xs font-medium px-3 py-1.5"
                  style={{ borderRadius: 20, border: "1px solid " + (dias === d.dias ? "#2350F5" : "#E3E7F1"), background: dias === d.dias ? "#EDF1FF" : "#fff", color: dias === d.dias ? "#2350F5" : "#2B3768" }}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: "#2B3768" }}>¿Cómo te van a contactar?</p>
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => setContactoTipo("whatsapp")}
                className="flex-1 text-xs font-medium py-2"
                style={{ borderRadius: 8, border: "1px solid " + (contactoTipo === "whatsapp" ? "#2350F5" : "#E3E7F1"), background: contactoTipo === "whatsapp" ? "#EDF1FF" : "#fff", color: contactoTipo === "whatsapp" ? "#2350F5" : "#2B3768" }}
              >
                WhatsApp
              </button>
              <button
                onClick={() => setContactoTipo("red_social")}
                className="flex-1 text-xs font-medium py-2"
                style={{ borderRadius: 8, border: "1px solid " + (contactoTipo === "red_social" ? "#2350F5" : "#E3E7F1"), background: contactoTipo === "red_social" ? "#EDF1FF" : "#fff", color: contactoTipo === "red_social" ? "#2350F5" : "#2B3768" }}
              >
                Red social / link
              </button>
            </div>
            <input
              value={contactoValor} onChange={(e) => setContactoValor(e.target.value)}
              placeholder={contactoTipo === "whatsapp" ? "Número con código de país, sin +" : "Link de Instagram, Facebook, etc."}
              className="w-full border px-3 py-2.5 text-sm" style={{ borderRadius: 8, borderColor: "#E3E7F1" }}
            />
          </div>

          <button onClick={guardar} className="text-sm font-semibold py-3 mt-1" style={{ backgroundColor: "#2350F5", color: "#fff", borderRadius: 10 }}>
            {existente ? "Guardar cambios" : "Publicar búsqueda"}
          </button>
          {existente && (
            <button onClick={onDelete} className="text-sm font-semibold py-2.5" style={{ color: "#9A3B34" }}>
              Eliminar búsqueda
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function DiscountForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = () => {
    if (!form.title.trim() || !form.startDate || !form.endDate) return;
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ background: "#0B1437cc" }} onClick={onCancel}>
      <div className="bg-white w-full max-w-sm p-6" style={{ borderRadius: 12 }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 600, fontSize: 18 }} className="mb-4">
          {initial.title ? "Editar descuento" : "Nuevo descuento"}
        </h2>
        <div className="flex flex-col gap-3">
          <input placeholder="Título (ej: 20% OFF en desayunos)" value={form.title} onChange={set("title")} className="border px-3 py-2 text-sm" style={{ borderRadius: 8, borderColor: "#E3E7F1" }} />
          <input placeholder="Producto o servicio incluido" value={form.item} onChange={set("item")} className="border px-3 py-2 text-sm" style={{ borderRadius: 8, borderColor: "#E3E7F1" }} />
          <input placeholder="Porcentaje o beneficio (ej: 20% o 2x1)" value={form.percent} onChange={set("percent")} className="border px-3 py-2 text-sm" style={{ borderRadius: 8, borderColor: "#E3E7F1" }} />
          <textarea placeholder="Descripción" value={form.desc} onChange={set("desc")} rows={2} className="border px-3 py-2 text-sm" style={{ borderRadius: 8, borderColor: "#E3E7F1" }} />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: "#2B3768" }}>Desde</p>
              <input type="date" value={form.startDate} onChange={set("startDate")} className="border px-3 py-2 text-sm w-full" style={{ borderRadius: 8, borderColor: "#E3E7F1" }} />
            </div>
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: "#2B3768" }}>Hasta</p>
              <input type="date" value={form.endDate} onChange={set("endDate")} className="border px-3 py-2 text-sm w-full" style={{ borderRadius: 8, borderColor: "#E3E7F1" }} />
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={onCancel} className="flex-1 py-2.5 text-sm font-medium" style={{ borderRadius: 8, border: "1px solid #E3E7F1" }}>Cancelar</button>
            <button onClick={submit} className="flex-1 py-2.5 text-sm font-semibold" style={{ backgroundColor: "#0B1437", color: "#fff", borderRadius: 8 }}>Guardar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PromosSheet({ business, onSave, onToggle, onDelete }) {
  const [editing, setEditing] = useState(null); // null = cerrado, objeto = nuevo o editando
  const emptyDiscount = () => ({ id: uid(), title: "", item: "", percent: "", desc: "", startDate: todayISO(), endDate: addDays(todayISO(), 30), active: true });
  const lista = business.discounts || [];

  return (
    <div>
      <div>
          <button onClick={() => setEditing(emptyDiscount())} className="w-full flex items-center justify-center gap-1.5 text-sm font-semibold py-3 mb-3" style={{ borderRadius: 14, background: "linear-gradient(135deg,#2350F5,#5B91F7)", color: "#fff", boxShadow: "0 8px 18px rgba(35,80,245,.3)" }}>
            <Plus size={16} /> Crear promoción
          </button>
          {lista.length === 0 ? (
            <div className="text-center py-8">
              <span className="inline-flex items-center justify-center mb-2" style={{ width: 52, height: 52, borderRadius: 18, background: "#FBEBD1" }}><Tag size={22} color="#B8703F" /></span>
              <p className="text-sm font-semibold" style={{ color: "#0B1437" }}>Todavía no creaste promociones</p>
              <p className="text-xs mt-0.5" style={{ color: "#5B6482" }}>Un descuento atrae más clientes a tu negocio.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {lista.map((d) => {
                const vigente = isDiscountActive(d);
                return (
                  <div key={d.id} className="p-3.5" style={{ borderRadius: 16, border: "1px solid #E3E7F1", background: vigente ? "#FFFBF2" : "#fff" }}>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 600, fontSize: 14, color: "#0B1437" }}>{d.title}</h4>
                      {d.percent && <span className="text-[11px] font-bold px-2 py-0.5 shrink-0" style={{ borderRadius: 10, background: "#0B1437", color: "#fff" }}>{d.percent} OFF</span>}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 mr-2" style={{ borderRadius: 8, background: vigente ? "#E4F3EA" : "#EEEDE7", color: vigente ? "#1E6B44" : "#7A7D87" }}>
                          {d.active ? (vigente ? "Vigente" : "Fuera de fecha") : "Pausada"}
                        </span>
                        <span className="text-[11px]" style={{ color: "#5B6482" }}>{fmtDate(d.startDate)} → {fmtDate(d.endDate)}</span>
                      </span>
                      <span className="flex gap-1.5 shrink-0">
                        <button onClick={() => setEditing(d)} aria-label="Editar" className="p-1.5" style={{ borderRadius: 8, border: "1px solid #E3E7F1" }}><Pencil size={13} /></button>
                        <button onClick={() => onToggle(d.id)} aria-label="Pausar o activar" className="p-1.5" style={{ borderRadius: 8, border: "1px solid #E3E7F1" }}><Power size={13} /></button>
                        <button onClick={() => { if (window.confirm("¿Eliminar esta promoción?")) onDelete(d.id); }} aria-label="Eliminar" className="p-1.5" style={{ borderRadius: 8, border: "1px solid #F3D9D5", color: "#C1443A" }}><Trash2 size={13} /></button>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      {editing && (
        <DiscountForm initial={editing} onCancel={() => setEditing(null)} onSave={(d) => { onSave(d); setEditing(null); }} />
      )}
    </div>
  );
}

export default function MiZona() {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);

  // navegación pública
  const [zone, setZone] = useState(ZONES[0]);
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState(null);
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [onlyVistos, setOnlyVistos] = useState(false);
  const [vistosIds, setVistosIds] = useState(() => getRecentlyViewed());
  const [onlyNuevos, setOnlyNuevos] = useState(false);
  const [onlyEmpleo, setOnlyEmpleo] = useState(false); // negocios que buscan personal
  const [sortBy, setSortBy] = useState("destacados");
  const [selectedId, setSelectedId] = useState(null);
  const [showAllCats, setShowAllCats] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState(null);

  const [errorMsg, setErrorMsg] = useState(null);

  // cuenta de Google
  const [usuario, setUsuario] = useState(null);
  // true cuando ya se revisó si este dispositivo tiene una sesión guardada (evita mostrar la bienvenida un instante a quien ya entró)
  const [sesionRevisada, setSesionRevisada] = useState(() => { try { return !localStorage.getItem("miZonaToken") && !localStorage.getItem("token"); } catch { return true; } });
  const [showLogin, setShowLogin] = useState(null); // null | { motivo, despues }
  const [nombrePendiente, setNombrePendiente] = useState(null); // { sugerido, despues } mientras se le pide el nombre
  const [misNegocios, setMisNegocios] = useState([]); // negocios de esta cuenta (incluye los que esperan el pago)
  const misNegociosRef = useRef([]);
  const [confirmandoPago, setConfirmandoPago] = useState(false);
  const [avisoOk, setAvisoOk] = useState(null);
  const ownerBizId = misNegocios[0]?.id || null;
  const misIds = useMemo(() => new Set(misNegocios.map((m) => m.id)), [misNegocios]);

  // agenda del dueño (solo quienes tienen un negocio en su cuenta)
  const [showAgenda, setShowAgenda] = useState(false);
  const [recordatoriosAgenda, setRecordatoriosAgenda] = useState([]);
  useRecordatoriosAgenda(!!ownerBizId, (nuevos) => setRecordatoriosAgenda((prev) => [...nuevos.filter((n) => !prev.some((p) => p.id === n.id)), ...prev]));
  // al tocar una notificación push de la agenda la web abre con ?ir=agenda
  const irAAgenda = useRef(new URLSearchParams(window.location.search).get("ir") === "agenda");
  useEffect(() => {
    if (!irAAgenda.current) return;
    window.history.replaceState({}, "", window.location.pathname);
    if (!ownerBizId) { irAAgenda.current = false; return; }
    irAAgenda.current = false;
    setShowAgenda(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerBizId]);

  // panel del dueño
  const [showEditOwnerBiz, setShowEditOwnerBiz] = useState(false);

  // agregar mi local + suscripción
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showAddBusiness, setShowAddBusiness] = useState(false);
  const [borrador, setBorrador] = useState(null); // negocio recién completado, esperando que elija el plan
  const [planesModal, setPlanesModal] = useState(null); // { modo: "nuevo" | "renovar", gratis, hasta, vencimiento }
  const [addBusinessDone, setAddBusinessDone] = useState(null); // { hasta } cuando se publicó sin pagar (ya pagó Mi Asistente)

  const recargarMisNegocios = async () => {
    try {
      const r = await traerMisNegocios();
      const mios = (r.negocios || []).map(normalizeBusiness);
      misNegociosRef.current = mios;
      setMisNegocios(mios);
      // los negocios propios (incluso los que esperan el pago) reemplazan a la versión pública dentro de la lista
      setBusinesses((prev) => [...mios, ...prev.filter((b) => !mios.some((m) => m.id === b.id))]);
      return mios;
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  // modo: "registro" (primera vez) | "login" (ya tiene cuenta)
  const abrirLogin = (motivo, despues = null, modo = "login") => setShowLogin({ motivo, despues, modo });
  const continuarDespues = (despues) => {
    if (despues === "agregar") setShowAddBusiness(true);
    else if (despues?.tipo === "chat") setChatBiz(despues.biz);
  };
  // Funciones importantes (registrar un negocio, dejar una reseña, chatear con el asistente) piden registrarse con Google primero
  const requerirSesion = (motivo, despues = null) => {
    if (usuario) return true;
    abrirLogin(motivo, despues);
    return false;
  };
  const abrirChat = (biz) => {
    if (requerirSesion("Para chatear con el asistente de este negocio necesitás una cuenta de Mi Zona.", { tipo: "chat", biz })) setChatBiz(biz);
  };
  const alIniciarSesion = (r) => {
    const despues = showLogin?.despues || null;
    setUsuario(r.usuario);
    setShowLogin(null);
    if (r.yaExistia && r.desdeRegistro) setAvisoOk("Ya estabas registrado con esa cuenta: te iniciamos sesión.");
    if (r.requiereNombre) setNombrePendiente({ sugerido: r.nombreGoogle, despues });
    else continuarDespues(despues);
  };
  const cerrarSesion = async () => {
    try { await desactivarPush(); } catch { /* no había push activo */ }
    await seguridadApi.salir(); // la sesión de este dispositivo deja de figurar como abierta en Seguridad → Dispositivos
    setToken(null);
    setUsuario(null);
    misNegociosRef.current = [];
    setMisNegocios([]);
    setShowEditOwnerBiz(false);
    try { setBusinesses(await loadBusinesses()); } catch { /* se queda la lista que ya estaba */ }
  };
  const borrarDatosLocales = () => {
    Object.keys(localStorage).filter((k) => k.startsWith("miZona")).forEach((k) => localStorage.removeItem(k));
    setFavorites([]);
    setOnlyFavorites(false);
    setNotifLeidas(new Set());
    setNotifEliminadas(new Set());
    setVistosIds([]);
    setOnlyVistos(false);
    aplicarTema("auto");
  };
  const abrirAgregarNegocio = () => {
    if (requerirSesion("Para registrar tu negocio necesitás una cuenta de Mi Zona. Es rápido y gratis.", "agregar")) setShowAddBusiness(true);
  };

  // Al completar el formulario y tocar "Aceptar": se ve cuánto tiene que pagar (o que no paga, si ya pagó Mi Asistente)
  const submitPublicBusiness = async (data) => {
    let gratis = false, hasta = null;
    try {
      const c = await traerCobertura();
      gratis = !!c.cubierto && !misNegocios.some((n) => n.suscripcion?.origen === "asistente");
      hasta = c.hasta;
    } catch { /* si no se puede consultar, se cobra normalmente */ }
    setBorrador(data);
    setPlanesModal({ modo: "nuevo", gratis, hasta });
  };
  const confirmarPlan = async (plan) => {
    const cuerpo = planesModal.modo === "nuevo" ? { plan, business: borrador } : { plan, bizId: ownerBizId };
    const r = await iniciarPago(cuerpo);
    if (r.cubiertoPorAsistente) {
      setPlanesModal(null); setBorrador(null); setShowAddBusiness(false);
      await recargarMisNegocios();
      setAddBusinessDone({ hasta: r.expiresAt });
      return;
    }
    if (r.initPoint) { window.location.href = r.initPoint; return; } // sigue en Mercado Pago
    throw new Error("No se pudo generar el link de pago.");
  };
  const abrirAgregarMeses = () => {
    const b = businesses.find((x) => x.id === ownerBizId);
    setPlanesModal({ modo: "renovar", vencimiento: b && !b.pendientePago ? b.expiresAt : null });
  };

  // pestaña activa de la barra inferior (Inicio | Explorar | Herramientas | Ajustes)
  const [activeTab, setActiveTab] = useState("inicio");
  const [chatQuery, setChatQuery] = useState("");
  const [confirmarSalida, setConfirmarSalida] = useState(false);
  // aplica la apariencia elegida y, en modo automático, la sigue cuando el celular cambia de claro a oscuro
  useEffect(() => {
    aplicarTema(getTema());
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    const alCambiar = () => { if (getTema() === "auto") aplicarTema("auto"); };
    mq?.addEventListener?.("change", alCambiar);
    return () => mq?.removeEventListener?.("change", alCambiar);
  }, []);
  const [subAjustes, setSubAjustes] = useState(null); // null | "cuenta" | "notificaciones" | "seguridad" | "apariencia" | "acerca" | "ayuda" | "soporte" | "privacidad"
  const [subHerramientas, setSubHerramientas] = useState(null); // null | "promos" | "empleo" | "qr"
  const irATab = (tab) => { setSubHerramientas(null); setSubAjustes(null); setActiveTab(tab); window.scrollTo(0, 0); };

  // favoritos (guardados en este dispositivo)
  const [favorites, setFavorites] = useState(() => getFavorites());
  const toggleFavorite = (bizId) => {
    const yaEsFavorito = favorites.includes(bizId);
    setFavorites((prev) => {
      const next = yaEsFavorito ? prev.filter((id) => id !== bizId) : [...prev, bizId];
      saveFavorites(next);
      return next;
    });
    // actualizamos el contador optimistamente en memoria para que el ranking lo refleje al toque,
    // y sincronizamos el número real con el servidor en segundo plano
    setBusinesses((prev) => prev.map((b) => (
      b.id === bizId ? { ...b, vecesFavorito: Math.max(0, (b.vecesFavorito || 0) + (yaEsFavorito ? -1 : 1)) } : b
    )));
    toggleFavoritoOnServer(bizId, yaEsFavorito ? -1 : 1);
    if (!yaEsFavorito && !misIds.has(bizId)) trackEvento(bizId, "guardado"); // estadística privada del dueño
  };

  // chat con el asistente de un negocio
  const [chatBiz, setChatBiz] = useState(null);
  const [showBusquedaAsistente, setShowBusquedaAsistente] = useState(false);
  const [showRanking, setShowRanking] = useState(false);
  const [showMapa, setShowMapa] = useState(false);
  const [showFavoritos, setShowFavoritos] = useState(false);
  const [mapaFiltros, setMapaFiltros] = useState(null); // filtros con los que se abre el mapa (null = mapa cerrado)

  // centro de notificaciones y puntos del cliente
  const [showNotificaciones, setShowNotificaciones] = useState(false);
  const [puntosView, setPuntosView] = useState(null); // null | { codigoPublico?: string }
  const [actividad, setActividad] = useState({ pedidos: [], turnos: [], puntos: [], canjes: [] });
  const [notifLeidas, setNotifLeidas] = useState(() => getIdSet(NOTIF_LEIDAS_KEY));
  const [notifEliminadas, setNotifEliminadas] = useState(() => getIdSet(NOTIF_ELIMINADAS_KEY));

  // "más cercanos"
  const [userLoc, setUserLoc] = useState(null); // { lat, lng } — solo en memoria, nunca se guarda
  const [locStatus, setLocStatus] = useState("idle"); // idle | loading | denied | error | ok

  const requestLocation = () => {
    if (!navigator.geolocation) { setLocStatus("error"); return; }
    setLocStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocStatus("ok");
      },
      () => setLocStatus("denied"),
      { enableHighAccuracy: false, timeout: 10000 }
    );
  };

  // Restaura la sesión de Google guardada en este dispositivo
  useEffect(() => {
    (async () => {
      try {
        const u = await traerMiSesion();
        if (!u) return;
        setUsuario(u);
        if (!u.nombre && u.usuario) setNombrePendiente({ sugerido: "", despues: null });
      } finally { setSesionRevisada(true); }
    })();
  }, []);

  // Con sesión: el id de cliente queda ligado a la cuenta y los chats que tuvo con los negocios se recuperan
  // (incluidos los de negocios que renovaron Mi Asistente después de vencer). Se hace una vez que los negocios cargaron.
  const chatsSincronizados = useRef(null);
  useEffect(() => {
    if (!usuario?.id || businesses.length === 0 || chatsSincronizados.current === usuario.id) return;
    chatsSincronizados.current = usuario.id;
    (async () => {
      try {
        const r = await vincularSesionCliente(getClienteId());
        if (r.sesionClienteId && r.sesionClienteId !== getClienteId()) adoptarClienteId(r.sesionClienteId);
        const { conversaciones = [] } = await traerMisConversaciones();
        conversaciones.forEach((c) => {
          const biz = businesses.find((b) => b.asistenteCodigoPublico === c.codigoPublico);
          if (!biz || !c.mensajes?.length) return;
          const locales = getConversation(biz.id);
          if (c.mensajes.length > locales.length) {
            saveConversation(biz.id, c.mensajes.map((m) => ({ id: uid(), rol: m.rol, texto: m.contenido, hora: m.fecha })));
          }
        });
        setBusinesses((lista) => [...lista]); // refresca las pantallas que leen los chats guardados
      } catch { /* sin conexión: quedan los chats de este dispositivo */ }
    })();
  }, [usuario?.id, businesses.length]);

  // Cuando hay sesión, trae los negocios de la cuenta (y ahí se verifica si ya pagó Mi Asistente)
  useEffect(() => {
    if (usuario) recargarMisNegocios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario?.id]);

  // Al volver de Mercado Pago (?pago=exito|pendiente|fallo) esperamos a que el aviso del pago llegue al servidor
  useEffect(() => {
    const resultado = new URLSearchParams(window.location.search).get("pago");
    if (!resultado) return;
    window.history.replaceState({}, "", window.location.pathname);
    setActiveTab("herramientas");
    if (resultado === "fallo") {
      setErrorMsg("El pago no se completó. Podés intentarlo de nuevo desde Herramientas → Mi suscripción.");
      return;
    }
    setConfirmandoPago(true);
  }, []);
  useEffect(() => {
    if (!confirmandoPago || !usuario) return;
    let cancelado = false;
    (async () => {
      const antes = Object.fromEntries((misNegociosRef.current || []).map((m) => [m.id, m]));
      for (let i = 0; i < 12 && !cancelado; i++) {
        const mios = await recargarMisNegocios();
        const confirmado = mios && mios.some((m) => {
          const previo = antes[m.id];
          return !m.pendientePago && (!previo || previo.pendientePago || (m.expiresAt || "") > (previo.expiresAt || ""));
        });
        if (confirmado) {
          if (!cancelado) { setAvisoOk("¡Pago confirmado! Tu suscripción ya está activa."); setConfirmandoPago(false); }
          return;
        }
        await new Promise((r) => setTimeout(r, 3000));
      }
      if (!cancelado) {
        setConfirmandoPago(false);
        setAvisoOk("Todavía no vemos tu pago. Puede tardar unos minutos en acreditarse: apenas llegue, tu negocio se activa solo.");
      }
    })();
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmandoPago, usuario?.id]);

  useEffect(() => {
    (async () => {
      try {
        const list = await loadBusinesses();
        const propios = misNegociosRef.current;
        setBusinesses([...propios, ...list.filter((b) => !propios.some((m) => m.id === b.id))]);
      } catch (e) {
        console.error(e);
        setErrorMsg("No se pudieron cargar los negocios. Revisá que el servidor esté encendido y VITE_API_URL apunte a él.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Actividad del cliente (pedidos, turnos, puntos, canjes) para el centro de notificaciones:
  // al abrir la app, al volver a ella y cada 2 minutos mientras está visible.
  useEffect(() => {
    if (!usuario?.id) { setActividad({ pedidos: [], turnos: [], puntos: [], canjes: [] }); return; } // la actividad es de la cuenta: sin sesión no hay nada que pedir
    let cancelado = false;
    const cargar = async () => {
      try {
        const a = await fetchActividad();
        if (!cancelado) setActividad(a);
      } catch { /* sin conexión con Mi Asistente: se muestran solo los avisos locales */ }
    };
    cargar();
    const timer = setInterval(() => { if (document.visibilityState === "visible") cargar(); }, 120000);
    const alVolver = () => { if (document.visibilityState === "visible") cargar(); };
    document.addEventListener("visibilitychange", alVolver);
    return () => { cancelado = true; clearInterval(timer); document.removeEventListener("visibilitychange", alVolver); };
  }, [usuario?.id]);

  const ownerBiz = businesses.find((b) => b.id === ownerBizId);
  const notificaciones = useMemo(
    () => buildNotificaciones({ actividad, businesses, favorites, autorId: getAutorResenasId(), ownerBizs: misNegocios.map((m) => businesses.find((b) => b.id === m.id) || m) }).filter((n) => !notifEliminadas.has(n.id)),
    [actividad, businesses, favorites, notifEliminadas, misNegocios]
  );
  const notifSinLeer = notificaciones.filter((n) => !notifLeidas.has(n.id)).length;
  const marcarNotifLeida = (id) => {
    setNotifLeidas((prev) => { if (prev.has(id)) return prev; const next = new Set(prev); next.add(id); saveIdSet(NOTIF_LEIDAS_KEY, next); return next; });
  };
  const marcarTodasLeidas = () => {
    setNotifLeidas((prev) => { const next = new Set(prev); notificaciones.forEach((n) => next.add(n.id)); saveIdSet(NOTIF_LEIDAS_KEY, next); return next; });
  };
  const eliminarNotif = (id) => {
    setNotifEliminadas((prev) => { const next = new Set(prev); next.add(id); saveIdSet(NOTIF_ELIMINADAS_KEY, next); return next; });
  };

  // Actualiza UN negocio en el estado local y lo guarda en el servidor
  const persistOne = (id, updaterOrObj) => {
    setBusinesses((prev) => {
      const next = prev.map((b) => (b.id === id ? (typeof updaterOrObj === "function" ? updaterOrObj(b) : updaterOrObj) : b));
      const updated = next.find((b) => b.id === id);
      if (updated) {
        updateBusinessOnServer(id, updated).catch((e) => {
          console.error(e);
          setErrorMsg("No se pudo guardar el cambio. Revisá que el servidor y MongoDB estén andando.");
        });
      }
      return next;
    });
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = businesses.filter((b) => {
      if (b.kind === "job") return false;
      if (b.status !== "active") return false;
      const matchCat = activeCat ? b.cat === activeCat : true;
      const matchZone = b.zone === zone;
      const haystack = [b.name, b.desc, ...(b.services || []), ...(b.specialties || [])].join(" ").toLowerCase();
      const matchQ = q ? haystack.includes(q) : true;
      const matchOpen = onlyOpen ? isOpenNow(b.weekHours) : true;
      const matchFav = onlyFavorites ? favorites.includes(b.id) : true;
      const matchVisto = onlyVistos ? vistosIds.includes(b.id) : true;
      const matchNuevo = onlyNuevos ? esNegocioNuevo(b) : true;
      const matchEmpleo = onlyEmpleo ? busquedaEmpleoActiva(b) : true;
      const matchDiscount = sortBy === "descuentos" ? activeDiscounts(b).length > 0 : true;
      return matchCat && matchZone && matchQ && matchOpen && matchFav && matchVisto && matchNuevo && matchEmpleo && matchDiscount;
    });
    list = [...list];
    if (onlyVistos) {
      list.sort((a, b) => vistosIds.indexOf(a.id) - vistosIds.indexOf(b.id)); // el último que viste primero
    } else if (onlyNuevos) {
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // los más recientes primero
    } else if (sortBy === "vistas") {
      list.sort((a, b) => b.views - a.views);
    } else if (sortBy === "cercanos" && userLoc) {
      const withCoords = list.filter((b) => b.lat && b.lng);
      const withoutCoords = list.filter((b) => !(b.lat && b.lng));
      withCoords.sort((a, b) => haversineKm(userLoc.lat, userLoc.lng, a.lat, a.lng) - haversineKm(userLoc.lat, userLoc.lng, b.lat, b.lng));
      list = [...withCoords, ...withoutCoords];
    } else {
      list.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    }
    return list;
  }, [businesses, query, activeCat, zone, onlyOpen, onlyFavorites, favorites, onlyVistos, vistosIds, onlyNuevos, onlyEmpleo, sortBy, userLoc]);

  const selected = businesses.find((b) => b.id === selectedId);

  const openDetail = (id) => {
    persistOne(id, (b) => ({ ...b, views: b.views + 1 }));
    if (!misIds.has(id)) trackEvento(id, "visita"); // estadística privada del dueño (no cuenta cuando mira su propio perfil)
    addRecentlyViewed(id);
    setVistosIds(getRecentlyViewed());
    setSelectedId(id);
    window.scrollTo(0, 0);
  };

  const addReview = (id, review) => {
    if (!requerirSesion("Para dejar una reseña necesitás una cuenta de Mi Zona.")) return false;
    const nombre = review.name && review.name !== "Anónimo" ? review.name : (usuario.nombre || "Anónimo");
    persistOne(id, (b) => ({ ...b, reviews: [...b.reviews, { ...review, name: nombre }] }));
    return true;
  };
  const replyToReview = (bizId, reviewId, texto, esDueño) => {
    persistOne(bizId, (b) => ({
      ...b,
      reviews: b.reviews.map((r) => (
        r.id === reviewId ? { ...r, respuesta: { texto, esDueño, fecha: todayISO() } } : r
      )),
    }));
  };

  // acciones del dueño (solo afectan su propio negocio, nunca otros)
  const saveOwnerDiscount = (discount) => {
    persistOne(ownerBizId, (b) => {
      const exists = (b.discounts || []).some((d) => d.id === discount.id);
      const discounts = exists ? b.discounts.map((d) => (d.id === discount.id ? discount : d)) : [...(b.discounts || []), discount];
      return { ...b, discounts };
    });
  };
  const toggleOwnerDiscount = (discountId) => {
    persistOne(ownerBizId, (b) => ({ ...b, discounts: b.discounts.map((d) => (d.id === discountId ? { ...d, active: !d.active } : d)) }));
  };
  const deleteOwnerDiscount = (discountId) => {
    persistOne(ownerBizId, (b) => ({ ...b, discounts: b.discounts.filter((d) => d.id !== discountId) }));
  };

  // Puerta de entrada: sin sesión se ve la bienvenida (Empezar → Registrarme / Iniciar sesión); con sesión abierta se entra directo al inicio.
  if (!sesionRevisada) return <div style={{ position: "fixed", inset: 0, background: "#050b2a" }} aria-hidden="true" />;
  if (!usuario) return <PantallaBienvenida onLogged={(u) => setUsuario(u)} />;
  if (!usuario.usuario) return <PantallaCrearUsuario usuario={usuario} onListo={(u) => setUsuario(u)} onSalir={cerrarSesion} />;

  if (loading) {
    return <div style={{ backgroundColor: "#F3F5FA", minHeight: "100vh" }} className="flex items-center justify-center text-sm" ><span style={{color:"#5B6482"}}>Cargando...</span></div>;
  }

  const globalStyle = (
    <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700&family=Work+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap');`}</style>
  );

  /* ---- vista chat con el asistente ---- */
  if (chatBiz) {
    return (
      <div style={{ fontFamily: "var(--fuente-texto)" }}>
        {globalStyle}
        <ChatScreen biz={chatBiz} onBack={() => setChatBiz(null)} />
      </div>
    );
  }

  /* ---- vista del asistente de búsqueda general ---- */
  if (showBusquedaAsistente) {
    return (
      <div style={{ fontFamily: "var(--fuente-texto)" }}>
        {globalStyle}
        <BusquedaAsistenteScreen
          userLoc={userLoc}
          onUbicacion={(loc) => { setUserLoc(loc); setLocStatus("ok"); }}
          businesses={businesses}
          onBack={() => setShowBusquedaAsistente(false)}
          onOpenBusiness={(id) => { setShowBusquedaAsistente(false); openDetail(id); }}
        />
      </div>
    );
  }

  /* ---- centro de notificaciones ---- */
  if (showNotificaciones) {
    return (
      <div style={{ fontFamily: "var(--fuente-texto)" }}>
        {globalStyle}
        <NotificacionesScreen
          notificaciones={notificaciones}
          leidas={notifLeidas}
          onBack={() => setShowNotificaciones(false)}
          onMarkAllRead={marcarTodasLeidas}
          onDelete={eliminarNotif}
          onOpen={(n) => {
            marcarNotifLeida(n.id);
            if (n.destino === "puntos") { setShowNotificaciones(false); setPuntosView({}); return; }
            if (n.destino === "suscripcion") { setShowNotificaciones(false); setActiveTab("herramientas"); window.scrollTo(0, 0); return; }
            if (n.bizId) { setShowNotificaciones(false); openDetail(n.bizId); }
          }}
        />
      </div>
    );
  }

  /* ---- mis puntos y recompensas ---- */
  if (puntosView) {
    return (
      <div style={{ fontFamily: "var(--fuente-texto)" }}>
        {globalStyle}
        <PuntosScreen
          businesses={businesses}
          initialCodigo={puntosView.codigoPublico}
          onBack={() => setPuntosView(null)}
          onOpenBusiness={(id) => { setPuntosView(null); openDetail(id); }}
        />
      </div>
    );
  }

  /* ---- vista de la agenda del dueño ---- */
  if (showAgenda && ownerBizId) {
    return (
      <div style={{ fontFamily: "var(--fuente-texto)" }}>
        {globalStyle}
        <RecordatoriosToast lista={recordatoriosAgenda} onCerrar={(id) => setRecordatoriosAgenda((l) => l.filter((r) => r.id !== id))} onAbrir={(r) => setRecordatoriosAgenda((l) => l.filter((x) => x.id !== r.id))} />
        <AgendaScreen negocioNombre={ownerBiz?.name} onBack={() => setShowAgenda(false)} />
      </div>
    );
  }

  /* ---- vista del ranking ---- */
  if (showRanking) {
    return (
      <div style={{ backgroundColor: "#F3F5FA", minHeight: "100vh", fontFamily: "var(--fuente-texto)" }}>
        {globalStyle}
        <RankingScreen
          businesses={businesses}
          zone={zone}
          onBack={() => setShowRanking(false)}
          onOpenBusiness={(id) => { setShowRanking(false); openDetail(id); }}
        />
      </div>
    );
  }

  /* ---- vista del mapa ---- */
  if (showMapa) {
    return (
      <div style={{ fontFamily: "var(--fuente-texto)" }}>
        {globalStyle}
        <MapaScreen
          businesses={businesses}
          zone={zone}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          userLoc={userLoc}
          locStatus={locStatus}
          onRequestLocation={requestLocation}
          initialFilters={mapaFiltros}
          onTrack={trackEvento}
          onBack={() => setShowMapa(false)}
          onOpenBusiness={(id) => { setShowMapa(false); openDetail(id); }}
        />
      </div>
    );
  }

  /* ---- vista de favoritos ---- */
  if (showFavoritos) {
    return (
      <div style={{ backgroundColor: "#F3F5FA", minHeight: "100vh", fontFamily: "var(--fuente-texto)" }}>
        {globalStyle}
        <div className="max-w-3xl mx-auto px-4 py-6" style={{ paddingBottom: 40 }}>
          <FavoritosScreen
            businesses={businesses}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
            onBack={() => setShowFavoritos(false)}
            onOpenBusiness={(id) => { setShowFavoritos(false); openDetail(id); }}
          />
        </div>
      </div>
    );
  }

  /* ---- vista ficha de negocio ---- */
  if (selected) {
    return (
      <div style={{ fontFamily: "var(--fuente-texto)" }}>
        {globalStyle}
        <BusinessDetail
          biz={selected} onBack={() => setSelectedId(null)} onOpenPhoto={setLightboxSrc} onAddReview={addReview}
          onReplyReview={replyToReview} esDueño={misIds.has(selected.id)}
          onOpenChat={abrirChat} isFavorite={favorites.includes(selected.id)} onToggleFavorite={toggleFavorite}
          rank={businessRankPosition(selected, businesses)}
          onTrack={trackEvento}
          onOpenPuntos={(codigoPublico) => setPuntosView({ codigoPublico })}
        />
        {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
      </div>
    );
  }

  /* ---- vista pública: listado ---- */
  return (
    <div style={{ backgroundColor: "#F3F5FA", minHeight: "100vh", fontFamily: "var(--fuente-texto)" }}>
      {globalStyle}

      {errorMsg && (
        <div className="px-4 py-2 text-center text-sm font-medium" style={{ background: "#FDF1EF", color: "#9A3B34" }}>
          {errorMsg} <button onClick={() => setErrorMsg(null)} className="underline ml-2">cerrar</button>
        </div>
      )}

      <RecordatoriosToast
        lista={recordatoriosAgenda}
        onCerrar={(id) => setRecordatoriosAgenda((l) => l.filter((r) => r.id !== id))}
        onAbrir={(r) => { setRecordatoriosAgenda((l) => l.filter((x) => x.id !== r.id)); setShowAgenda(true); }}
      />
      {avisoOk && (
        <div className="px-4 py-2 text-center text-sm font-medium" style={{ background: "#E4F3EA", color: "#1E6B44" }}>
          {avisoOk} <button onClick={() => setAvisoOk(null)} className="underline ml-2">cerrar</button>
        </div>
      )}
      {confirmandoPago && (
        <div className="px-4 py-2 text-center text-sm font-medium" style={{ background: "#EDF1FF", color: "#0B1437" }}>
          Confirmando tu pago con Mercado Pago...
        </div>
      )}
      {activeTab === "inicio" && (() => {
        // aviso fijo cuando falta pagar, quedan 7 días o menos, o ya venció
        const inf = infoSuscripcion(ownerBiz);
        if (!inf || inf.estado === "activa") return null;
        const texto = inf.estado === "pendiente" ? "Tu negocio todavía no se muestra: falta pagar la suscripción."
          : inf.estado === "vencida" ? "Tu suscripción venció y tu negocio ya no se muestra."
          : inf.dias === 0 ? "Tu suscripción vence hoy." : inf.dias === 1 ? "Tu suscripción vence mañana." : `Tu suscripción vence en ${inf.dias} días.`;
        const urgente = inf.estado === "vencida" || (inf.dias !== null && inf.dias <= 3);
        return (
          <div className="px-4 py-2 flex items-center justify-center gap-3 flex-wrap text-sm font-medium" style={{ background: urgente ? "#FDF1EF" : "#FBEBD1", color: urgente ? "#9A3B34" : "#8A5B12" }}>
            <span>{texto}</span>
            <button onClick={abrirAgregarMeses} className="text-xs font-semibold px-3 py-1" style={{ borderRadius: 20, background: urgente ? "#9A3B34" : "#8A5B12", color: "#fff" }}>
              {inf.estado === "pendiente" ? "Pagar ahora" : inf.estado === "vencida" ? "Renovar" : "Agregar meses"}
            </button>
          </div>
        );
      })()}

      {/* la cabecera (menú, buscador, zona y categorías) se ve solo en Inicio */}
      {activeTab === "inicio" ? (
        <PublicHeader
          zone={zone} setZone={setZone} query={query} setQuery={setQuery}
          activeCat={activeCat} setActiveCat={setActiveCat}
          onOpenAllCats={() => setShowAllCats(true)}
          onOpenOwner={() => irATab("herramientas")}
          onHerramientas={() => irATab("herramientas")}
          onAjustes={() => irATab("ajustes")}
          onAyuda={() => { irATab("ajustes"); setSubAjustes("ayuda"); }}
          onSoporte={() => { irATab("ajustes"); setSubAjustes("soporte"); }}
          notifSinLeer={notifSinLeer}
          onOpenNotificaciones={() => setShowNotificaciones(true)}
        />
      ) : (subHerramientas || subAjustes) ? null : (
        <BarraTitulo
          titulo={activeTab === "chats" ? "Chats" : activeTab === "herramientas" ? (ownerBiz ? "Mi negocio" : "Herramientas") : "Ajustes"}
          sub={activeTab === "chats" ? "Tus conversaciones con negocios" : activeTab === "herramientas" ? (ownerBiz ? "Controlá y mejorá tu negocio en Mi Zona" : "Todo lo que necesitás en Mi Zona") : "Configurá tu cuenta y preferencias"}
          notifSinLeer={notifSinLeer}
          onOpenNotificaciones={() => setShowNotificaciones(true)}
          buscador={activeTab === "chats" ? { valor: chatQuery, onChange: setChatQuery, placeholder: "Buscar chats..." } : undefined}
        />
      )}

      {showAllCats && <CategoryModal activeCat={activeCat} onSelect={(id) => { setActiveCat(id); setShowAllCats(false); }} onClose={() => setShowAllCats(false)} />}
      {confirmarSalida && (
        <ConfirmModal
          title="¿Cerrar sesión?"
          message={`Vas a salir de ${usuario?.email || "tu cuenta"}. Podés volver a entrar cuando quieras.`}
          confirmLabel="Cerrar sesión" danger
          onConfirm={() => { setConfirmarSalida(false); cerrarSesion(); }}
          onCancel={() => setConfirmarSalida(false)}
        />
      )}
      {showLogin && <LoginModal onClose={() => setShowLogin(null)} onLogged={alIniciarSesion} />}
      {nombrePendiente && (
        <NombreModal
          sugerido={nombrePendiente.sugerido}
          onGuardado={(u) => { const d = nombrePendiente.despues; setUsuario(u); setNombrePendiente(null); continuarDespues(d); }}
        />
      )}
      {planesModal && (
        <PlanesModal
          nombreNegocio={planesModal.modo === "nuevo" ? borrador?.name : ownerBiz?.name}
          gratis={!!planesModal.gratis} hastaGratis={planesModal.hasta}
          vencimientoActual={planesModal.vencimiento}
          onClose={() => setPlanesModal(null)}
          onConfirmar={confirmarPlan}
        />
      )}

      {showEditOwnerBiz && ownerBiz && (
        <BusinessForm
          publicMode
          initial={ownerBiz}
          onSave={(data) => { persistOne(ownerBizId, data); setShowEditOwnerBiz(false); }}
          onCancel={() => setShowEditOwnerBiz(false)}
        />
      )}

      {showAddSheet && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center sm:justify-center" style={{ background: "#0B143766" }} onClick={() => setShowAddSheet(false)}>
          <div className="bg-white w-full sm:max-w-sm p-5" style={{ borderRadius: "18px 18px 0 0", boxShadow: "0 -8px 30px #00000022" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, borderRadius: 4, background: "#E3E7F1", margin: "0 auto 16px" }} />
            <div className="flex items-center justify-between mb-4">
              <span style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 600, fontSize: 17, color: "#0B1437" }}>¿Qué querés hacer?</span>
              <button onClick={() => setShowAddSheet(false)}><X size={18} color="#5B6482" /></button>
            </div>
            <button
              onClick={() => { setShowAddSheet(false); abrirAgregarNegocio(); }}
              className="w-full flex items-center gap-3 p-3.5 text-left"
              style={{ borderRadius: 12, border: "1px solid #E3E7F1", boxShadow: "0 2px 8px #0000000d" }}
            >
              <span className="flex items-center justify-center shrink-0" style={{ width: 42, height: 42, borderRadius: 12, background: "#EDF1FF" }}>
                <Building2 size={19} color="#2350F5" />
              </span>
              <span>
                <span className="block text-sm font-semibold" style={{ color: "#0B1437" }}>Agregar mi negocio</span>
                <span className="block text-xs" style={{ color: "#5B6482" }}>Sumá tu negocio a Mi Zona y empezá a recibir clientes.</span>
              </span>
            </button>
          </div>
        </div>
      )}

      {showAddBusiness && (
        <BusinessForm
          publicMode
          initial={emptyBusiness()}
          onSave={submitPublicBusiness}
          onCancel={() => { setShowAddBusiness(false); setBorrador(null); }}
        />
      )}

      {addBusinessDone && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ background: "#0B1437cc" }} onClick={() => setAddBusinessDone(null)}>
          <div className="bg-white w-full max-w-sm p-6 text-center" style={{ borderRadius: 12 }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-center mx-auto mb-3" style={{ width: 48, height: 48, borderRadius: "50%", background: "#E4F3EA" }}>
              <Check size={24} color="#1E6B44" />
            </div>
            <h2 style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 600, fontSize: 18, color: "#0B1437" }} className="mb-2">¡Tu negocio ya está publicado!</h2>
            <p className="text-sm mb-5" style={{ color: "#2B3768" }}>
              Como ya pagaste Mi Asistente con esta cuenta de Google, no pagás Mi Zona{addBusinessDone.hasta ? `: tu negocio queda activo hasta el ${fmtDate(addBusinessDone.hasta)}` : ""}. Lo administrás desde Herramientas.
            </p>
                        <button onClick={() => setAddBusinessDone(null)} className="w-full text-sm font-semibold py-3" style={{ backgroundColor: "#2350F5", color: "#fff", borderRadius: 10 }}>
              Entendido
            </button>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 py-6" style={{ paddingBottom: 90 }}>
        {activeTab === "ajustes" ? (
          <AjustesScreen
            sub={subAjustes} setSub={setSubAjustes}
            usuario={usuario}
            negocios={businesses} onAbrirNegocio={openDetail}
            onLogin={(modo) => abrirLogin(null, null, modo || "login")}
            onLogged={alIniciarSesion}
            onUsuarioActualizado={setUsuario}
            onCerrarSesion={() => setConfirmarSalida(true)}
            onBorrarDatosLocales={() => {
              borrarDatosLocales(); // también se borró el token: la sesión de este dispositivo queda cerrada
              setUsuario(null);
              misNegociosRef.current = [];
              setMisNegocios([]);
              setShowEditOwnerBiz(false);
            }}
            onBorrarVistos={() => { try { localStorage.removeItem("miZonaVistosRecientemente"); } catch { /* sin almacenamiento */ } setVistosIds([]); setOnlyVistos(false); }}
            onCuentaEliminada={async () => {
              // la cuenta ya se borró en el servidor: se limpia este dispositivo y se vuelve al inicio
              try { await desactivarPush(); } catch { /* no había push activo */ }
              borrarDatosLocales();
              setUsuario(null);
              misNegociosRef.current = [];
              setMisNegocios([]);
              setShowEditOwnerBiz(false);
              setSubAjustes(null);
              try { setBusinesses(await loadBusinesses()); } catch { /* se queda la lista que ya estaba */ }
            }}
          />
        ) : activeTab === "chats" ? (
          <ChatsScreen
            businesses={businesses}
            onOpenChat={abrirChat}
            query={chatQuery}
          />
        ) : activeTab === "herramientas" ? (
          <HerramientasScreen
            sub={subHerramientas} setSub={setSubHerramientas}
            usuario={usuario}
            ownerBiz={ownerBiz}
            onLogin={(modo) => abrirLogin("Entrá con tu cuenta de Google para administrar tu negocio.", null, modo)}
            onAddBusiness={abrirAgregarNegocio}
            onAgregarMeses={abrirAgregarMeses}
            onEditBusiness={() => setShowEditOwnerBiz(true)}
            onViewProfile={() => openDetail(ownerBizId)}
            onOpenRanking={() => setShowRanking(true)}
            onOpenPuntos={() => setPuntosView({})}
            onOpenFavoritos={() => setShowFavoritos(true)}
            onOpenAgenda={() => { setShowAgenda(true); window.scrollTo(0, 0); }}
            onSaveDiscount={saveOwnerDiscount}
            onToggleDiscount={toggleOwnerDiscount}
            onDeleteDiscount={deleteOwnerDiscount}
            onGuardarEmpleo={(datos) => persistOne(ownerBizId, { ...ownerBiz, busquedaEmpleo: datos })}
            onSubirHistoria={(url) => {
              const hace48h = Date.now() - 48 * 60 * 60 * 1000;
              const historiasVigentes = (ownerBiz.historias || []).filter((h) => new Date(h.subidaEn).getTime() > hace48h);
              persistOne(ownerBizId, { ...ownerBiz, historias: [...historiasVigentes, { id: uid(), url, subidaEn: new Date().toISOString() }] });
            }}
          />
        ) : (
        <>
        <div className="flex justify-end mb-3">
          <button
            onClick={() => {
              // el mapa se abre con los mismos filtros que ya elegiste acá
              setMapaFiltros({ cat: activeCat, abiertos: onlyOpen, favoritos: onlyFavorites, nuevos: onlyNuevos, promos: sortBy === "descuentos" });
              setShowMapa(true);
            }}
            className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 shrink-0"
            style={{ borderRadius: 20, background: "radial-gradient(420px 220px at 105% -20%, rgba(54,104,255,.55), transparent 60%), radial-gradient(260px 160px at -10% 120%, rgba(23,198,255,.22), transparent 60%), #0a1235", color: "#fff", boxShadow: "0 6px 14px rgba(11,20,55,.28)" }}
          >
            <MapIcon size={13} /> Ver en el mapa
          </button>
        </div>
        <div className="mb-4">
          <div className="flex items-center justify-between gap-3 mb-2.5">
            <p style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 600, fontSize: 15, color: "#0B1437" }}>
              {filtered.length} {filtered.length === 1 ? "negocio" : "negocios"} <span style={{ fontWeight: 500, color: "#5B6482" }}>en {zone}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 [&>*]:shrink-0">
            <div className="relative">
              <select
                value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none font-medium pl-3.5 pr-8 py-2"
                style={{ fontSize: 13, borderRadius: 20, border: "1px solid #E3E7F1", color: "#0B1437", backgroundColor: "#fff" }}
              >
                <option value="destacados">⭐ Destacados</option>
                <option value="vistas">👁️ Más visitados</option>
                <option value="descuentos">🏷️ Descuentos</option>
                <option value="cercanos">📍 Más cercanos</option>
              </select>
              <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" color="#5B6482" />
            </div>
            {onlyFavorites && (
              <button
                onClick={() => setOnlyFavorites(false)}
                className="flex items-center gap-1.5 font-medium px-3.5 py-2"
                style={{ fontSize: 13, borderRadius: 20, backgroundColor: "#FDF1EF", color: "#9A3B34", border: "1px solid #C1443A" }}
              >
                <Heart size={14} fill="#9A3B34" /> Solo favoritos <X size={14} />
              </button>
            )}
            {[
              { activo: onlyOpen, alternar: () => setOnlyOpen((v) => !v), texto: "Abiertos", verde: true, icono: <span className="rounded-full" style={{ width: 8, height: 8, backgroundColor: onlyOpen ? "#2C9A5F" : "#B9BCC5" }} /> },
              { activo: onlyVistos, alternar: () => setOnlyVistos((v) => !v), texto: "Vistos", icono: <Clock size={14} /> },
              { activo: onlyNuevos, alternar: () => setOnlyNuevos((v) => !v), texto: "Nuevos", verde: true, icono: <Sparkles size={14} /> },
              { activo: onlyEmpleo, alternar: () => setOnlyEmpleo((v) => !v), texto: "Busca personal", icono: <Briefcase size={14} /> },
            ].map((c) => (
              <button
                key={c.texto}
                onClick={c.alternar}
                className="flex items-center gap-1.5 font-medium px-3.5 py-2"
                style={{
                  fontSize: 13, borderRadius: 20,
                  backgroundColor: c.activo ? (c.verde ? "#E4F3EA" : "#EDF1FF") : "#fff",
                  color: c.activo ? (c.verde ? "#1E6B44" : "#2350F5") : "#2B3768",
                  border: "1px solid " + (c.activo ? (c.verde ? "#2C9A5F" : "#2350F5") : "#E3E7F1"),
                }}
              >
                {c.icono}
                {c.texto}
              </button>
            ))}
          </div>
        </div>

        {sortBy === "cercanos" && locStatus === "idle" && (
          <div className="flex items-center justify-between gap-3 mb-4 px-4 py-3" style={{ background: "#EDF1FF", borderRadius: 10 }}>
            <p className="text-sm" style={{ color: "#0B1437" }}>Activá tu ubicación para ver qué negocios tenés más cerca.</p>
            <button
              onClick={requestLocation}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 shrink-0"
              style={{ borderRadius: 8, backgroundColor: "#0B1437", color: "#fff" }}
            >
              <LocateFixed size={14} /> Activar ubicación
            </button>
          </div>
        )}
        {sortBy === "cercanos" && locStatus === "loading" && (
          <p className="text-xs mb-4" style={{ color: "#2B3768" }}>Ubicándote para ordenar por cercanía...</p>
        )}
        {sortBy === "cercanos" && locStatus === "denied" && (
          <div className="flex items-center justify-between gap-3 mb-4 px-4 py-3 flex-wrap" style={{ background: "#FDF1EF", borderRadius: 10 }}>
            <p className="text-sm" style={{ color: "#9A3B34" }}>
              Rechazaste el permiso de ubicación. Para usar "Más cercanos" habilitalo desde el ícono de candado/ubicación en la barra del navegador, y tocá reintentar.
            </p>
            <button onClick={requestLocation} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 shrink-0" style={{ borderRadius: 8, backgroundColor: "#9A3B34", color: "#fff" }}>
              <LocateFixed size={14} /> Reintentar
            </button>
          </div>
        )}
        {sortBy === "cercanos" && locStatus === "error" && (
          <p className="text-xs mb-4 px-3 py-2" style={{ background: "#FDF1EF", color: "#9A3B34", borderRadius: 8 }}>
            Tu navegador no permite obtener la ubicación. Te mostramos el orden habitual.
          </p>
        )}

        {filtered.length === 0 ? (
          <div className="text-center py-16" style={{ color: "#5B6482" }}>
            <p className="mb-1" style={{ fontFamily: "var(--fuente-titulo)", fontSize: 19, color: "#0B1437" }}>
              {businesses.length === 0 ? "Todavía no hay negocios cargados" : onlyVistos && vistosIds.length === 0 ? "Todavía no viste ningún negocio" : `No hay resultados en ${zone}`}
            </p>
            <p className="text-sm">
              {businesses.length === 0 ? "Sé el primero: tocá el botón \"+\" para agregar tu negocio." : "Probá con otra categoría, otra búsqueda, o cambiá de zona."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((biz) => (
              <BusinessCard
                key={biz.id} biz={biz} onOpen={openDetail} onOpenPhoto={setLightboxSrc}
                distanceKm={sortBy === "cercanos" && userLoc && biz.lat && biz.lng ? haversineKm(userLoc.lat, userLoc.lng, biz.lat, biz.lng) : undefined}
                rank={businessRankPosition(biz, businesses)}
                isFavorite={favorites.includes(biz.id)} onToggleFavorite={toggleFavorite}
                onTrack={trackEvento}
              />
            ))}
          </div>
        )}
        </>
        )}
      </main>

      <button
        onClick={() => setShowBusquedaAsistente(true)}
        className="fixed z-40 flex items-center justify-center"
        style={{
          right: 16, bottom: 78, width: 54, height: 54, borderRadius: "50%",
          background: "linear-gradient(135deg, #2350F5, #7FA8F5)",
          boxShadow: "0 8px 20px rgba(35,80,245,0.45)",
        }}
        aria-label="Buscar con el asistente"
      >
        <Search size={22} color="#fff" />
      </button>

      <BottomNav
        active={activeTab}
        onInicio={() => { irATab("inicio"); setActiveCat(null); setSortBy("destacados"); setOnlyFavorites(false); }}
        onChats={() => irATab("chats")}
        onAdd={() => setShowAddSheet(true)}
        onHerramientas={() => irATab("herramientas")}
        onAjustes={() => irATab("ajustes")}
        chatsSinLeer={countUnreadChats()}
      />

      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </div>
  );
}
