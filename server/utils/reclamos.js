// Reclamos, devoluciones y cambios: envío a Mi Asistente, consulta de cómo van y aplicación de la respuesta del dueño.
// Contrato con Mi Asistente: ver INTEGRACION-RECLAMOS.md de ese proyecto.
import Reclamo from "../models/Reclamo.js";
import { enviarPushAUsuario } from "./push.js";

const MI_ASISTENTE_URL = process.env.MI_ASISTENTE_API_URL || "https://empleado-virtual-ia.onrender.com/api";

export const TIPOS = ["reclamo", "devolucion", "cambio"];
export const MOTIVOS = ["mal_estado", "no_llego", "incorrecto", "calidad", "demora", "atencion", "otro"];
export const SOLUCIONES = ["reembolso", "cambio", "reposicion", "compensacion", "ninguna"];
// Categorías de negocio donde NO hay cambio de producto, solo devolución del dinero (Mi Asistente lo aplica con esComida)
export const CATEGORIAS_COMIDA = ["comida", "panaderia", "carnicerias", "verduleria"];
export const ABIERTOS = ["nuevo", "en_revision"];
export const MAX_INTENTOS = 10;

export const texto = (v, n) => String(v == null ? "" : v).trim().slice(0, n);

// Solo se aceptan fotos que ya subió la app a Cloudinary (https)
export function urlFoto(u) {
  try {
    const x = new URL(String(u));
    return x.protocol === "https:" && x.hostname === "res.cloudinary.com" ? x.toString().slice(0, 500) : null;
  } catch { return null; }
}

// POST a Mi Asistente con la clave compartida. Nunca lanza: devuelve { ok, status, datos, sinConexion }.
async function llamar(ruta, cuerpo, ms) {
  if (!process.env.INTEGRACION_KEY) return { ok: false, status: 503, datos: {}, sinConexion: true };
  const control = new AbortController();
  const corte = setTimeout(() => control.abort(), ms);
  try {
    const r = await fetch(`${MI_ASISTENTE_URL}${ruta}`, {
      method: "POST", signal: control.signal,
      headers: { "Content-Type": "application/json", "x-integracion-key": process.env.INTEGRACION_KEY },
      body: JSON.stringify(cuerpo),
    });
    const datos = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, datos, sinConexion: false };
  } catch (e) {
    return { ok: false, status: 0, datos: {}, sinConexion: true };
  } finally { clearTimeout(corte); }
}

// Envía un reclamo a Mi Asistente. Devuelve { ok, estado } o { ok:false, reintentable, status, error }.
// Reintentable = Mi Asistente no respondió (dormido, caído, sin clave): conviene guardar el reclamo y probar más tarde.
// No reintentable = Mi Asistente lo rechazó (negocio inexistente, datos inválidos): se le avisa a la persona.
export async function enviarReclamo(r, { sesionClienteId, usuario }) {
  const resp = await llamar("/integracion/reclamos", {
    codigoPublico: r.codigoPublico,
    refExterna: r.refExterna,
    // Solo el usuario público y el id de cliente (el mismo con el que se borra la cuenta). Nada de nombre, correo ni teléfono.
    cliente: { ref: sesionClienteId, usuario: texto(usuario, 40) },
    tipo: r.tipo, motivo: r.motivo, producto: r.producto, pedidoRef: r.pedidoRef,
    ...(Number.isFinite(r.monto) && r.monto >= 0 ? { monto: r.monto } : {}),
    esComida: !!r.esComida, descripcion: r.descripcion, fotos: r.fotos,
  }, 25000); // Render gratis puede tardar en despertar
  if (resp.ok) return { ok: true, estado: ["nuevo", "en_revision", "aceptado", "rechazado"].includes(resp.datos?.estado) ? resp.datos.estado : "nuevo" };
  if (resp.sinConexion || resp.status >= 500) return { ok: false, reintentable: true, status: resp.status };
  const error = resp.status === 404 ? "Este negocio ya no está disponible para recibir reclamos." : texto(resp.datos?.error, 200) || "Mi Asistente no pudo registrar el reclamo.";
  return { ok: false, reintentable: false, status: resp.status, error };
}

// Aplica la respuesta del dueño (viene del aviso de Mi Asistente o de la consulta de estado). La respuesta no se puede cambiar:
// solo se aplica a un reclamo que todavía está abierto. Avisa a la persona UNA sola vez.
export async function aplicarDecision(refExterna, d = {}) {
  if (!["aceptado", "rechazado"].includes(d.estado)) return null;
  const fecha = new Date(d.fecha);
  const r = await Reclamo.findOneAndUpdate(
    { refExterna: texto(refExterna, 80), estado: { $in: ABIERTOS } },
    { $set: {
      estado: d.estado,
      "respuesta.mensaje": texto(d.mensaje, 1500),
      "respuesta.solucion": SOLUCIONES.includes(d.solucion) ? d.solucion : "ninguna",
      "respuesta.fecha": Number.isNaN(fecha.getTime()) ? new Date() : fecha,
    } },
    { new: true }
  );
  if (!r) return null;
  const marcado = await Reclamo.findOneAndUpdate({ _id: r._id, avisado: false }, { $set: { avisado: true } });
  if (marcado) {
    const quien = r.negocio || "El negocio";
    enviarPushAUsuario(r.usuarioId, {
      titulo: d.estado === "aceptado" ? "Tu reclamo fue aceptado" : "Respondieron tu reclamo",
      cuerpo: `${quien} respondió tu reclamo. Tocá para leer la respuesta.`,
      url: "/?abrir=reclamos", tag: `reclamo-${String(r._id)}`,
    }, "pedidos").catch(() => {});
  }
  return r;
}

// Reenvía los reclamos que no llegaron a Mi Asistente (máximo 3 por vez, para no demorar la pantalla)
export async function reintentarPendientes(lista, datosCliente) {
  const pendientes = lista.filter((r) => !r.enviado && r.intentos < MAX_INTENTOS).slice(0, 3);
  for (const r of pendientes) {
    const res = await enviarReclamo(r, datosCliente);
    if (res.ok) { r.enviado = true; r.estado = res.estado; }
    else { r.intentos += 1; if (!res.reintentable) r.intentos = MAX_INTENTOS; }
    await r.save();
  }
}

// Pregunta a Mi Asistente cómo van los reclamos abiertos: pasa a "en revisión" y trae la respuesta si el aviso inmediato no llegó
export async function sincronizar(lista) {
  const abiertos = lista.filter((r) => r.enviado && ABIERTOS.includes(r.estado)).slice(0, 100);
  if (!abiertos.length) return;
  const resp = await llamar("/integracion/reclamos/estado", { refs: abiertos.map((r) => r.refExterna) }, 8000);
  if (!resp.ok || !Array.isArray(resp.datos?.reclamos)) return;
  for (const x of resp.datos.reclamos) {
    if (x.estado === "en_revision") {
      await Reclamo.updateOne({ refExterna: texto(x.refExterna, 80), estado: "nuevo" }, { $set: { estado: "en_revision" } });
    } else if (x.respuesta) {
      await aplicarDecision(x.refExterna, { estado: x.estado, mensaje: x.respuesta.mensaje, solucion: x.respuesta.solucion, fecha: x.respuesta.fecha });
    }
  }
}
