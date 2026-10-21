import Business from "../models/Business.js";
import Oficio from "../models/Oficio.js";
import Alquiler from "../models/Alquiler.js";
import { hoyISO, sumarMeses, sumarDias } from "./fechas.js";

// Los tres tipos de ficha que se pagan comparten la misma lógica de vencimiento. Acá se unifica cómo se las busca y se les suma tiempo.
export const MODELOS = { negocio: Business, oficio: Oficio, alquiler: Alquiler };

export async function fichaDelDueno(tipo, id, usuarioId) {
  const Modelo = MODELOS[tipo];
  if (!Modelo || !id) return null;
  const f = await Modelo.findOne({ id: String(id), ownerId: String(usuarioId) });
  return f || null;
}

export const nombreDeFicha = (tipo, f) => (tipo === "negocio" ? f.name : f.nombre || (tipo === "alquiler" ? "tu ficha de alquiler" : "tu ficha de oficios"));

// Suma { meses } o { dias } al vencimiento actual (si todavía le queda tiempo, se suma desde ahí: nada de lo pagado o regalado se pierde)
// y deja la ficha activa y visible. NO toca "pausada": si la persona la había pausado, sigue pausada.
export async function sumarTiempo(tipo, ficha, { meses = 0, dias = 0, origen, plan = null, extra = {} }) {
  const hoy = hoyISO();
  const base = ficha.expiresAt && ficha.expiresAt > hoy ? ficha.expiresAt : hoy;
  let nuevo = base;
  if (meses) nuevo = sumarMeses(nuevo, meses);
  if (dias) nuevo = sumarDias(nuevo, dias);
  const set = {
    expiresAt: nuevo, pendientePago: false, "suscripcion.origen": origen, ...extra,
  };
  if (plan) set["suscripcion.plan"] = plan;
  if (tipo === "negocio") { set.status = "active"; set.lastRenewal = hoy; }
  await MODELOS[tipo].updateOne({ _id: ficha._id }, { $set: set });
  return { antes: ficha.expiresAt || null, despues: nuevo };
}
