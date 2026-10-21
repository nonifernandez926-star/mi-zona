import crypto from "crypto";
import Sesion from "../models/Sesion.js";
import ActividadSeguridad from "../models/ActividadSeguridad.js";
import { describirDispositivo } from "./dispositivos.js";
import { firmarTokenUsuario } from "./auth.js";
import { enviarPushAUsuario } from "./push.js";

const dispositivoDe = (req) => describirDispositivo(req?.headers?.["user-agent"]);

// Anota un hecho en el historial de seguridad. Nunca rompe lo que la persona estaba haciendo.
export async function registrarActividad(usuarioId, tipo, req) {
  try {
    await ActividadSeguridad.create({ usuarioId: String(usuarioId), tipo, dispositivo: dispositivoDe(req).nombre });
  } catch (e) {
    console.error("No se pudo anotar la actividad de seguridad:", e.message);
  }
}

// Crea la sesión de este dispositivo y devuelve su id (sid).
export async function crearSesion(req, usuario) {
  const d = dispositivoDe(req);
  const sid = crypto.randomBytes(16).toString("hex");
  await Sesion.create({ usuarioId: String(usuario._id), sid, dispositivo: d.nombre, tipo: d.tipo });
  return sid;
}

// Aviso de seguridad por notificación (si la persona tiene las alertas activadas y notificaciones en algún dispositivo).
export function avisarSeguridad(usuario, titulo, cuerpo) {
  if (usuario.seguridad?.alertasInicio === false) return;
  enviarPushAUsuario(usuario._id, { titulo, cuerpo, url: "/" }).catch(() => {});
}

// Inicio de sesión: abre la sesión de este dispositivo, la anota y devuelve el token.
// Si algo falla al registrarla, igual deja entrar (el token queda sin sid, como las sesiones anteriores a esta versión).
export async function iniciarSesion(req, usuario, { cuentaNueva = false } = {}) {
  let sid = null;
  try {
    const previas = cuentaNueva ? 0 : await Sesion.countDocuments({ usuarioId: String(usuario._id) });
    sid = await crearSesion(req, usuario);
    await registrarActividad(usuario._id, cuentaNueva ? "cuenta_creada" : "inicio_sesion", req);
    if (previas > 0) {
      avisarSeguridad(usuario, "Nuevo inicio de sesión", `Entraron a tu cuenta desde ${dispositivoDe(req).nombre}. Si no fuiste vos, cambiá tu contraseña y cerrá las otras sesiones.`);
    }
  } catch (e) {
    console.error("No se pudo registrar la sesión:", e.message);
  }
  return firmarTokenUsuario(usuario, sid);
}
