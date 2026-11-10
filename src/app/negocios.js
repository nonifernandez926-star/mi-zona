// Reglas sobre los negocios: puntaje, ranking, promociones vigentes, historias, empleo, negocio vacío y normalizado, filtro del mapa.
// (Salió de App.jsx sin cambiar su comportamiento.)
import { CAT_OTROS, DAYS, NUEVO_DIAS, QUICK_CATEGORIES, ZONES } from "./constantes.js";
import { addDays, isOpenNow, todayISO, uid } from "./utilidades.js";

export function busquedaEmpleoActiva(biz) {
  const b = biz.busquedaEmpleo;
  if (!b || !b.puesto) return false;
  if (!b.fechaFin) return true;
  return new Date() <= new Date(b.fechaFin);
}

export function historiasActivas(biz) {
  const hace24h = Date.now() - 24 * 60 * 60 * 1000;
  return (biz.historias || []).filter((h) => new Date(h.subidaEn).getTime() > hace24h);
}

export function avgRating(reviews) {
  if (!reviews || reviews.length === 0) return null;
  return (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);
}

/* ---------- ranking de negocios (Top) ---------- */
// Puntaje combinando vistas, reseñas y valoración. El peso de "guardado en favoritos"
// se suma cuando el negocio tenga el contador vecesFavorito sincronizado con el servidor.
export function rankingScore(biz) {
  const vistas = biz.views || 0;
  const cantReviews = biz.reviews?.length || 0;
  const rating = avgRating(biz.reviews) ? parseFloat(avgRating(biz.reviews)) : 0;
  const vecesFavorito = biz.vecesFavorito || 0;
  return vistas * 0.3 + cantReviews * rating * 0.5 + vecesFavorito * 2;
}

export function rankedBusinesses(businesses) {
  return [...businesses]
    .filter((b) => b.kind !== "job" && b.status === "active" && enListados(b))
    .sort((a, b) => rankingScore(b) - rankingScore(a));
}

// Posición de un negocio puntual dentro del Top 10 de su propia zona (o null si no entra)
export function businessRankPosition(biz, allBusinesses) {
  const ranking = rankedBusinesses(allBusinesses.filter((b) => b.zone === biz.zone));
  const idx = ranking.findIndex((b) => b.id === biz.id);
  return idx >= 0 && idx < 10 ? idx + 1 : null;
}

export function esNegocioNuevo(biz) {
  if (!biz.createdAt) return false;
  const t = new Date(biz.createdAt).getTime();
  return !isNaN(t) && Date.now() - t <= NUEVO_DIAS * 24 * 60 * 60 * 1000;
}

/* ---------- filtros del mapa ---------- */
// Solo negocios REGISTRADOS en Mi Zona (nada de negocios externos), activos y de la zona elegida.
export function filtrarParaMapa(businesses, zone, f, favorites) {
  return businesses.filter((b) => {
    if (b.kind === "job" || b.status !== "active" || !enListados(b)) return false;
    if (b.zone !== zone) return false;
    if (f.cat === CAT_OTROS ? QUICK_CATEGORIES.some((q) => q.id === b.cat) : f.cat && b.cat !== f.cat) return false;
    if (f.abiertos && !isOpenNow(b.weekHours)) return false;
    if (f.delivery && !b.delivery) return false;
    if (f.promos && activeDiscounts(b).length === 0) return false;
    if (f.asistente && !(b.asistenteActivo && b.asistenteCodigoPublico)) return false;
    if (f.nuevos && !esNegocioNuevo(b)) return false;
    if (f.favoritos && !favorites.includes(b.id)) return false;
    return true;
  });
}

/* ---------- descuentos ---------- */

export function isDiscountActive(d) {
  if (!d.active) return false;
  const today = todayISO();
  return d.startDate <= today && today <= d.endDate;
}

export function activeDiscounts(biz) {
  return (biz.discounts || []).filter(isDiscountActive);
}

export function emptyBusiness() {
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

// El dueño puede sacar su ficha de las búsquedas y listados (Ajustes → Privacidad). El servidor ya no la manda a los demás;
// esto cubre al propio dueño, que la sigue viendo en "sus negocios" pero no mezclada con los resultados.
export const enListados = (b) => b.apareceEnBusquedas !== false;

export function normalizeBusiness(b) {
  return {
    kind: "business",
    lat: null, lng: null, discounts: [],
    ...b,
  };
}

export function contactoEmpleoLink(b) {
  if (!b.busquedaEmpleo?.contactoValor) return "#";
  if (b.busquedaEmpleo.contactoTipo === "whatsapp") {
    return `https://wa.me/${b.busquedaEmpleo.contactoValor}?text=${encodeURIComponent(`Hola, te escribo por la búsqueda de personal (${b.busquedaEmpleo.puesto}) en Mi Zona.`)}`;
  }
  return /^https?:\/\//i.test(b.busquedaEmpleo.contactoValor) ? b.busquedaEmpleo.contactoValor : "#"; // nunca "javascript:" u otros esquemas
}
