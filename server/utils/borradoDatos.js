// Borrado de los datos de una cuenta que viven FUERA de la base de Mi Zona (Google lo exige al eliminar la cuenta):
//  1) los chats y datos de cliente en Mi Asistente (otro servidor) y 2) las fotos subidas a Cloudinary.
// Si algo falla (Mi Asistente dormido, sin conexión), se guarda un pendiente sin datos personales y se reintenta solo.
import Business from "../models/Business.js";
import Oficio from "../models/Oficio.js";
import Alquiler from "../models/Alquiler.js";
import Publicacion from "../models/Publicacion.js";
import Reclamo from "../models/Reclamo.js";
import Usuario from "../models/Usuario.js";
import BorradoPendiente from "../models/BorradoPendiente.js";
import { borrarFotos, publicIdDe } from "./cloudinary.js";

const MI_ASISTENTE_URL = process.env.MI_ASISTENTE_API_URL || "https://empleado-virtual-ia.onrender.com/api";

const urlsDe = (...cosas) => cosas.flat(Infinity).map((x) => (typeof x === "string" ? x : x?.url)).filter((u) => typeof u === "string" && publicIdDe(u));

// Todas las fotos de la cuenta (perfil, negocios, oficios, alquileres y publicaciones de Comunidad). Se juntan ANTES de borrar las fichas.
export async function fotosDeLaCuenta(usuarioId, usuario) {
  const id = String(usuarioId);
  const [negocios, oficios, alquileres, publicaciones, reclamos] = await Promise.all([
    Business.find({ ownerId: id }).select("logo portada photos historias").lean(),
    Oficio.find({ ownerId: id }).select("logo fotos").lean(),
    Alquiler.find({ ownerId: id }).select("logo fotos foto articulos").lean(),
    Publicacion.find({ ownerId: id }).select("fotos").lean(),
    Reclamo.find({ usuarioId: id }).select("fotos").lean(),
  ]);
  return [...new Set(urlsDe(
    usuario?.foto,
    negocios.map((b) => [b.logo, b.portada, b.photos, b.historias]),
    oficios.map((o) => [o.logo, o.fotos]),
    alquileres.map((a) => [a.logo, a.fotos, a.foto, (a.articulos || []).map((x) => [x?.foto, x?.fotos])]),
    publicaciones.map((p) => p.fotos),
    reclamos.map((r) => r.fotos),
  ))];
}

// Le pide a Mi Asistente que borre lo de este cliente. true = listo (o nada que borrar).
export async function borrarClienteEnMiAsistente(sesionClienteId) {
  if (!sesionClienteId) return true;
  if (!process.env.INTEGRACION_KEY) return false;
  const control = new AbortController();
  const timer = setTimeout(() => control.abort(), 25000); // Render gratis puede tardar en despertar
  try {
    const r = await fetch(`${MI_ASISTENTE_URL}/integracion/borrar-cliente`, {
      method: "POST", signal: control.signal,
      headers: { "Content-Type": "application/json", "x-integracion-key": process.env.INTEGRACION_KEY },
      body: JSON.stringify({ sesionClienteId }),
    });
    if (!r.ok) console.error("Mi Asistente respondió", r.status, "al borrar un cliente");
    return r.ok;
  } catch (e) {
    console.error("No se pudo borrar el cliente en Mi Asistente:", e?.name === "AbortError" ? "tiempo agotado" : e?.message);
    return false;
  } finally { clearTimeout(timer); }
}

// Se llama al eliminar la cuenta (cuando la cuenta ya no existe). Lo que no se pueda borrar ahora queda pendiente.
export async function borrarDatosExternos({ sesionClienteId = "", urls = [] }) {
  const [chatsOk, fotosOk] = await Promise.all([borrarClienteEnMiAsistente(sesionClienteId), borrarFotos(urls)]);
  if (chatsOk && fotosOk) return { chatsOk, fotosOk, pendiente: false };
  try {
    await BorradoPendiente.create({ sesionClienteId: chatsOk ? "" : sesionClienteId, urls: fotosOk ? [] : urls });
  } catch (e) { console.error("No se pudo guardar el borrado pendiente:", e.message); }
  return { chatsOk, fotosOk, pendiente: true };
}

// Reintenta los pendientes (cada 6 horas y al arrancar)
export async function procesarBorradosPendientes() {
  const lista = await BorradoPendiente.find({}).sort({ createdAt: 1 }).limit(20);
  for (const b of lista) {
    const [chatsOk, fotosOk] = await Promise.all([borrarClienteEnMiAsistente(b.sesionClienteId), borrarFotos(b.urls)]);
    if (chatsOk && fotosOk) { await BorradoPendiente.deleteOne({ _id: b._id }); continue; }
    b.intentos += 1; b.ultimoError = `${chatsOk ? "" : "chats "}${fotosOk ? "" : "fotos"}`.trim();
    if (chatsOk) b.sesionClienteId = ""; if (fotosOk) b.urls = [];
    await b.save();
  }
  return { revisados: lista.length };
}

export function programarBorradosPendientes() {
  const correr = () => procesarBorradosPendientes().catch((e) => console.error("Error reintentando borrados:", e.message));
  setTimeout(correr, 2 * 60 * 1000);
  setInterval(correr, 6 * 60 * 60 * 1000);
}
