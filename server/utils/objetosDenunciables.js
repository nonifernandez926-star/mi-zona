// Qué se puede denunciar o bloquear (Fase 8) y cómo se ocultan o muestran. Todo se resuelve en el servidor a partir del tipo y el id público:
// la web nunca conoce el id de cuenta de quien publicó, así que no puede apuntar a otra persona.
import Publicacion from "../models/Publicacion.js";
import Business from "../models/Business.js";
import Oficio from "../models/Oficio.js";
import Alquiler from "../models/Alquiler.js";
import Usuario from "../models/Usuario.js";
import { snapshotDe } from "./moderacion.js";

export const MODELOS = { publicacion: Publicacion, negocio: Business, oficio: Oficio, alquiler: Alquiler };
const CAMPOS = {
  publicacion: "id ownerId titulo desc tipo zona localidad fotos",
  negocio: "id ownerId name desc cat zone logo",
  oficio: "id ownerId nombre desc rubros localidad zona logo fotos",
  alquiler: "id ownerId nombre desc categoria localidad zona logo",
};

// → { tipo, id, duenoId, snapshot } o null si no existe (o es un perfil privado). duenoId "" = negocio viejo sin dueño.
export async function resolverObjeto(tipo, id) {
  if (tipo === "perfil") {
    const u = await Usuario.findOne({ usuario: id }).select("_id usuario nombre descripcion foto localidad privacidad").lean();
    if (!u || u.privacidad?.perfilVisible === false) return null;
    return { tipo, id: u.usuario, duenoId: String(u._id), snapshot: snapshotDe("perfil", u) };
  }
  const Modelo = MODELOS[tipo];
  if (!Modelo) return null;
  const d = await Modelo.findOne({ id: String(id) }).select(CAMPOS[tipo]).lean();
  if (!d) return null;
  return { tipo, id: d.id, duenoId: d.ownerId ? String(d.ownerId) : "", snapshot: snapshotDe(tipo, d) };
}

export async function ocultarObjeto(tipo, id, { motivo, medidaId }) {
  const Modelo = MODELOS[tipo];
  if (!Modelo) throw new Error("Este tipo no se puede ocultar.");
  const r = await Modelo.updateOne({ id: String(id) }, { $set: { ocultaPorEquipo: true, ocultaMotivo: String(motivo || "").slice(0, 600), ocultaDesde: new Date(), ocultaMedidaId: String(medidaId || "") } }, { timestamps: false });
  return r.matchedCount > 0;
}

export async function mostrarObjeto(tipo, id) {
  const Modelo = MODELOS[tipo];
  if (!Modelo) throw new Error("Este tipo no se puede mostrar.");
  const r = await Modelo.updateOne({ id: String(id) }, { $set: { ocultaPorEquipo: false, ocultaMotivo: "", ocultaDesde: null, ocultaMedidaId: "" } }, { timestamps: false });
  return r.matchedCount > 0;
}

// Estado actual de varios objetos denunciados, para mostrarlo en el panel: Map("tipo:id" → { existe, oculto })
export async function estadoDeObjetos(pares) {
  const mapa = new Map();
  const porTipo = {};
  for (const [tipo, id] of pares) (porTipo[tipo] ||= new Set()).add(String(id));
  await Promise.all(Object.entries(porTipo).map(async ([tipo, ids]) => {
    const lista = [...ids];
    if (tipo === "perfil") {
      const us = await Usuario.find({ usuario: { $in: lista } }).select("usuario").lean();
      const hay = new Set(us.map((u) => u.usuario));
      lista.forEach((id) => mapa.set(`perfil:${id}`, { existe: hay.has(id), oculto: false }));
      return;
    }
    const Modelo = MODELOS[tipo];
    if (!Modelo) return;
    const filas = await Modelo.find({ id: { $in: lista } }).select("id ocultaPorEquipo").lean();
    const por = new Map(filas.map((f) => [f.id, f]));
    lista.forEach((id) => mapa.set(`${tipo}:${id}`, { existe: por.has(id), oculto: por.get(id)?.ocultaPorEquipo === true }));
  }));
  return mapa;
}
