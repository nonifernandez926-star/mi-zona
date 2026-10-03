import Business from "../models/Business.js";
import { hoyISO } from "./fechas.js";

const MI_ASISTENTE_URL = process.env.MI_ASISTENTE_API_URL || "https://empleado-virtual-ia.onrender.com/api";

// Le pregunta a Mi Asistente (servidor a servidor, con la clave compartida) si esta cuenta de Google
// tiene un negocio y una suscripción vigente allá. Devuelve null si no se pudo consultar.
export async function consultarCuentaAsistente({ googleId, email }) {
  if (!process.env.INTEGRACION_KEY) return null;
  const control = new AbortController();
  const timer = setTimeout(() => control.abort(), 20000); // Render gratis puede tardar en despertar
  try {
    const r = await fetch(`${MI_ASISTENTE_URL}/integracion/cuenta`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-integracion-key": process.env.INTEGRACION_KEY },
      body: JSON.stringify({ googleId, email }),
      signal: control.signal,
    });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Si la cuenta ya pagó Mi Asistente, el negocio queda cubierto en Mi Zona hasta el mismo vencimiento (sin pagar de nuevo).
// Si después renueva en Mi Asistente, la próxima vez que entre a Mi Zona se extiende solo.
// `negocio` puede ser null (todavía no cargó ninguno): en ese caso solo informa si está cubierto.
export async function sincronizarCobertura(negocio, usuario) {
  const cuenta = await consultarCuentaAsistente({ googleId: usuario.googleId, email: usuario.email });
  if (!cuenta) return { consultado: false, cubierto: false, hasta: null };

  const cubierto = !!cuenta.suscripcionActiva;
  const hasta = cubierto && cuenta.fechaVencimiento ? String(cuenta.fechaVencimiento).slice(0, 10) : null;

  if (negocio && cuenta.existe) {
    const cambios = {};
    if (cuenta.codigoPublico && negocio.asistenteCodigoPublico !== cuenta.codigoPublico) {
      cambios.asistenteCodigoPublico = cuenta.codigoPublico; // conecta el chat del asistente automáticamente
    }
    if (cubierto && hasta && (!negocio.expiresAt || hasta > negocio.expiresAt)) {
      const estabaVencido = !negocio.expiresAt || negocio.expiresAt < hoyISO();
      cambios.expiresAt = hasta;
      cambios["suscripcion.origen"] = negocio.suscripcion?.origen === "mercadopago" ? "mercadopago" : "asistente";
      if (negocio.pendientePago || estabaVencido) {
        cambios.status = "active";
        cambios.pendientePago = false;
        cambios.lastRenewal = hoyISO();
      }
    }
    if (Object.keys(cambios).length) {
      await Business.updateOne({ _id: negocio._id }, { $set: cambios });
      Object.assign(negocio, cambios.status ? { status: cambios.status, pendientePago: false } : {});
      if (cambios.expiresAt) negocio.expiresAt = cambios.expiresAt;
      if (cambios.asistenteCodigoPublico) negocio.asistenteCodigoPublico = cambios.asistenteCodigoPublico;
    }
  }
  return { consultado: true, cubierto, hasta };
}
