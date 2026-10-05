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

// Actualiza, para TODOS los negocios conectados a un asistente, si Mi Asistente sigue pago o no.
// Así el chat deja de mostrarse a los clientes cuando vence, aunque el dueño no entre a Mi Zona.
export async function refrescarAsistentes() {
  if (!process.env.INTEGRACION_KEY) return { consultados: 0 };
  const negocios = await Business.find({ asistenteCodigoPublico: { $exists: true, $nin: ["", null] } }).select("id asistenteCodigoPublico asistenteActivo");
  if (!negocios.length) return { consultados: 0 };
  const control = new AbortController();
  const timer = setTimeout(() => control.abort(), 25000);
  try {
    const r = await fetch(`${MI_ASISTENTE_URL}/integracion/estado-asistentes`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-integracion-key": process.env.INTEGRACION_KEY },
      body: JSON.stringify({ codigos: [...new Set(negocios.map((n) => n.asistenteCodigoPublico))] }),
      signal: control.signal,
    });
    if (!r.ok) return { consultados: 0 };
    const { estados = {} } = await r.json();
    let cambiados = 0;
    for (const n of negocios) {
      const activo = estados[n.asistenteCodigoPublico] === true;
      if (!!n.asistenteActivo !== activo) {
        await Business.updateOne({ _id: n._id }, { $set: { asistenteActivo: activo } });
        cambiados++;
      }
    }
    return { consultados: negocios.length, cambiados };
  } catch {
    return { consultados: 0 }; // Mi Asistente dormido o sin conexión: se reintenta en la próxima vuelta
  } finally {
    clearTimeout(timer);
  }
}

// Si la cuenta ya pagó Mi Asistente, el negocio queda cubierto en Mi Zona hasta el mismo vencimiento (sin pagar de nuevo).
// Si después renueva en Mi Asistente, la próxima vez que entre a Mi Zona se extiende solo.
// `negocio` puede ser null (todavía no cargó ninguno): en ese caso solo informa si está cubierto.
export async function sincronizarCobertura(negocio, usuario) {
  // Las cuentas de correo y contraseña no tienen el correo verificado: no se pueden usar para reconocer pagos de Mi Asistente
  if (usuario.proveedor === "email") return { consultado: false, cubierto: false, hasta: null };
  const cuenta = await consultarCuentaAsistente({ googleId: usuario.googleId, email: usuario.email });
  if (!cuenta) return { consultado: false, cubierto: false, hasta: null };

  const cubierto = !!cuenta.suscripcionActiva;
  // Si la persona ya tenía un negocio de Mi Zona conectado a su Mi Asistente (por el código del asistente) pero
  // todavía sin cuenta, ese negocio pasa a ser suyo automáticamente. Es seguro: solo ella puede tener ese código en su cuenta de Google.
  if (cuenta.existe && cuenta.codigoPublico) {
    await Business.updateMany(
      { asistenteCodigoPublico: cuenta.codigoPublico, $or: [{ ownerId: { $exists: false } }, { ownerId: "" }, { ownerId: null }] },
      { $set: { ownerId: String(usuario._id) } }
    );
  }
  const hasta = cubierto && cuenta.fechaVencimiento ? String(cuenta.fechaVencimiento).slice(0, 10) : null;

  if (negocio && cuenta.existe) {
    const cambios = {};
    if (cuenta.codigoPublico && negocio.asistenteCodigoPublico !== cuenta.codigoPublico) {
      cambios.asistenteCodigoPublico = cuenta.codigoPublico; // conecta el chat del asistente automáticamente
    }
    // El chat con el asistente solo se muestra a los clientes mientras Mi Asistente esté PAGO
    if (cuenta.codigoPublico && (negocio.asistenteActivo || false) !== cubierto) {
      cambios.asistenteActivo = cubierto;
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
      if (cambios.asistenteActivo !== undefined) negocio.asistenteActivo = cambios.asistenteActivo;
    }
  }
  return { consultado: true, cubierto, hasta };
}
