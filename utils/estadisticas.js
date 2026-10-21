import crypto from "crypto";
import Evento from "../models/Evento.js";

// Estadísticas del panel del dueño: SOLO cantidades. Nunca se guarda ni se muestra quién vio o contactó una ficha:
// cada visita se anota con una huella anónima de la red y el navegador (no se puede volver a la persona) y se borra sola a los 400 días.
const VENTANA_MIN = { visita: 30, contacto: 30 };

const huellaAnonima = (req) => "srv-" + crypto.createHash("sha256").update(`${req.ip || ""}|${req.get?.("user-agent") || ""}`).digest("hex").slice(0, 32);

// Anota una visita o un contacto de una ficha de oficios o de alquiler (los negocios ya los anota la web con /api/eventos).
// No cuenta lo que hace el propio dueño sobre su ficha. Si algo falla, no se interrumpe lo que la persona estaba haciendo.
export async function anotarEvento(req, fichaId, tipo, ownerId) {
  try {
    if (req.actor?.usuario && String(req.actor.usuario._id) === String(ownerId)) return;
    const clienteId = huellaAnonima(req);
    const desde = new Date(Date.now() - VENTANA_MIN[tipo] * 60 * 1000);
    if (await Evento.exists({ bizId: fichaId, tipo, clienteId, createdAt: { $gt: desde } })) return;
    await Evento.create({ bizId: fichaId, tipo, clienteId });
  } catch (e) { console.error("No se pudo anotar el evento:", e.message); }
}

// Cantidades de los últimos N días de una ficha
export async function resumenDeFicha(fichaId, dias = 30) {
  const desde = new Date(Date.now() - dias * 24 * 3600 * 1000);
  const filas = await Evento.aggregate([
    { $match: { bizId: fichaId, createdAt: { $gte: desde } } },
    { $group: { _id: "$tipo", n: { $sum: 1 } } },
  ]);
  const por = Object.fromEntries(filas.map((f) => [f._id, f.n]));
  return { visitas: por.visita || 0, contactos: por.contacto || 0, guardados: por.guardado || 0, ubicacion: por.ubicacion || 0, dias };
}
