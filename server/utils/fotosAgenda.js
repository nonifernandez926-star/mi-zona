import UsoFotoAgenda from "../models/UsoFotoAgenda.js";

export const FOTOS_POR_DIA = 2;

export async function fotosRestantes(usuarioId, fecha) {
  const uso = await UsoFotoAgenda.findOne({ usuarioId, fecha }).lean();
  return Math.max(0, FOTOS_POR_DIA - (uso?.cantidad || 0));
}

// Reserva una de las fotos del día. Es atómico: dos pedidos a la vez no pueden pasarse del límite.
export async function consumirFoto(usuarioId, fecha) {
  try {
    const r = await UsoFotoAgenda.findOneAndUpdate(
      { usuarioId, fecha, cantidad: { $lt: FOTOS_POR_DIA } },
      { $inc: { cantidad: 1 } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return !!r;
  } catch (e) {
    if (e.code === 11000) return false; // ya había un registro del día con el cupo completo
    throw e;
  }
}

// Si la IA falla, la foto no cuenta
export async function devolverFoto(usuarioId, fecha) {
  await UsoFotoAgenda.updateOne({ usuarioId, fecha, cantidad: { $gt: 0 } }, { $inc: { cantidad: -1 } });
}
