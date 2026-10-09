// Límite de intentos. Se guarda en MongoDB (sobrevive a reinicios y vale para varias instancias).
// Si MongoDB no responde, se usa una cuenta en memoria como respaldo para no dejar la app sin protección ni caerse.
import mongoose from "mongoose";
import LimiteIntentos from "../models/LimiteIntentos.js";

const memoria = new Map(); // clave -> { n, desde }  (respaldo y contadores poco importantes)

function permitirEnMemoria(clave, max, ventanaMs) {
  const ahora = Date.now();
  const r = memoria.get(clave);
  if (!r || ahora - r.desde > ventanaMs) { memoria.set(clave, { n: 1, desde: ahora }); return true; }
  r.n += 1;
  return r.n <= max;
}

// Suma un intento de forma atómica: si la ventana venció (o no existe) empieza de nuevo en 1; si no, suma 1.
async function sumarIntento(clave, ventanaMs) {
  const ahora = new Date();
  const vigente = { $gt: [{ $ifNull: ["$expira", new Date(0)] }, ahora] };
  const actualizar = () =>
    LimiteIntentos.findOneAndUpdate(
      { clave },
      [{ $set: {
        n: { $cond: [vigente, { $add: [{ $ifNull: ["$n", 0] }, 1] }, 1] },
        expira: { $cond: [vigente, "$expira", new Date(ahora.getTime() + ventanaMs)] },
      } }],
      { upsert: true, new: true }
    ).lean();
  try {
    return await actualizar();
  } catch (e) {
    if (e.code === 11000) return actualizar(); // dos pedidos crearon la clave a la vez: el segundo ya la encuentra
    throw e;
  }
}

// Devuelve true si todavía puede intentar. Cada llamada cuenta como un intento.
// { soloMemoria: true } es para contadores sin valor de seguridad (p. ej. visitas), que no justifican escribir en la base en cada vista.
export async function permitir(clave, max, ventanaMs, { soloMemoria = false } = {}) {
  if (soloMemoria || mongoose.connection.readyState !== 1) return permitirEnMemoria(clave, max, ventanaMs); // sin conexión a la base no se espera: se usa la memoria
  try {
    const r = await sumarIntento(clave, ventanaMs);
    return r.n <= max;
  } catch (e) {
    console.error("Límite de intentos: MongoDB no respondió, se usa la memoria:", e.message);
    return permitirEnMemoria(clave, max, ventanaMs);
  }
}

// Borra el contador (por ejemplo, tras un inicio de sesión correcto).
export async function olvidar(clave) {
  memoria.delete(clave);
  try { await LimiteIntentos.deleteOne({ clave }); } catch { /* si falla, el contador vence solo */ }
}

setInterval(() => {
  const ahora = Date.now();
  for (const [k, r] of memoria) if (ahora - r.desde > 3600 * 1000) memoria.delete(k);
}, 10 * 60 * 1000).unref();
