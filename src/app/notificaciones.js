// Lógica de la campanita: armado de la lista de avisos, textos y claves guardadas en el celular.
// (Salió de App.jsx sin cambiar su comportamiento.)
import { Bell, CalendarCheck, Coins, Gift, Package, PartyPopper, Star, Tag } from "lucide-react";
import { infoSuscripcion } from "../cuenta.jsx";
import { activeDiscounts, enListados, historiasActivas } from "./negocios.js";
import { fmtDate, fmtNum, fmtPesos } from "./utilidades.js";

/* ---------- centro de notificaciones del cliente ---------- */
// Las notificaciones NO se inventan: cada una sale de un dato real (un pedido, un turno, puntos, un canje,
// una promoción o historia de un negocio que seguís, la respuesta a una reseña tuya). Lo único que se guarda
// en este dispositivo es cuáles ya leíste y cuáles eliminaste.

export const NOTIF_LEIDAS_KEY = "miZonaNotifLeidas";

export const NOTIF_ELIMINADAS_KEY = "miZonaNotifEliminadas";

export const NOTIF_VISTAS_KEY = "miZonaNotifVistas";

export const NOTIF_BANNER_KEY = "miZonaBannerPush";

export function getIdSet(key) {
  try { return new Set(JSON.parse(localStorage.getItem(key) || "[]")); } catch { return new Set(); }
}

export function saveIdSet(key, set) {
  try { localStorage.setItem(key, JSON.stringify([...set].slice(-600))); } catch { /* sin almacenamiento */ }
}

export const NOTIF_TIPOS = {
  pedido: { Icon: Package, color: "var(--azul)", bg: "var(--azul-suave)" },
  turno: { Icon: CalendarCheck, color: "#0B1437", bg: "#E4EAF5" },
  promo: { Icon: Tag, color: "#B8703F", bg: "#FBEBD1" },
  historia: { Icon: PartyPopper, color: "#2C9A5F", bg: "#E4F3EA" },
  resena: { Icon: Star, color: "#F5A623", bg: "#FDF3DC" },
  puntos: { Icon: Coins, color: "#B7791F", bg: "#FDF3DC" },
  canje: { Icon: Gift, color: "#7A4F9E", bg: "#F3ECFC" },
  suscripcion: { Icon: Bell, color: "#B8703F", bg: "#FBEBD1" },
};

export const NOTIF_TONO = { pedido: "azul", turno: "azul", promo: "naranja", historia: "verde", resena: "naranja", puntos: "naranja", canje: "violeta", suscripcion: "naranja" };

export const NOTIF_CAT = { pedido: "pedidos", turno: "pedidos", promo: "novedades", historia: "novedades", resena: "novedades", suscripcion: "novedades", puntos: "puntos", canje: "puntos" };

export const NOTIF_FILTROS = [["todas", "Todas"], ["sinleer", "Sin leer"], ["pedidos", "Pedidos y turnos"], ["novedades", "Novedades"], ["puntos", "Puntos"]];

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

export function buildNotificaciones({ actividad, businesses, favorites, autorId, ownerBizs = [] }) {
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
  businesses.filter((b) => favorites.includes(b.id) && b.kind !== "job" && b.status === "active" && enListados(b)).forEach((b) => {
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
