// Medidas del equipo sobre cuentas y contenidos (Fase 8): crear la medida, aplicarla, avisar y poder revertirla si una apelación se acepta.
// Lo usa el panel de moderación. Cada función hace UNA cosa; el registro de auditoría lo escribe quien las llama (routes/moderacion.js).
import Medida from "../models/Medida.js";
import Denuncia from "../models/Denuncia.js";
import Usuario from "../models/Usuario.js";
import { enviarPushAUsuario } from "./push.js";
import { olvidarSuspendidos } from "./exclusiones.js";
import { ocultarObjeto, mostrarObjeto } from "./objetosDenunciables.js";
import { pushDeMedida } from "./moderacion.js";

const DIA = 86400000;

// Avisa al equipo de algo nuevo (denuncia, apelación) por el mismo enlace del soporte (Slack, Discord, Make...). Sin datos personales. Si falla, no afecta a nadie.
export async function avisarAlEquipo(texto) {
  const url = process.env.SOPORTE_AVISO_URL;
  if (!url) return;
  try {
    await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: texto, content: texto }) });
  } catch (e) {
    console.error("No se pudo avisar al equipo de moderación:", e.message);
  }
}

// Crea la medida y le avisa a la persona (aviso en la app + notificación al celular si la tiene activada)
export async function crearMedida(datos) {
  const m = await Medida.create(datos);
  enviarPushAUsuario(String(m.usuarioId), { ...pushDeMedida(m), url: "/?ir=avisos" }, "soporte").catch(() => {});
  return m;
}

export const advertir = (usuarioId, motivo, denunciaIds = []) => crearMedida({ usuarioId, tipo: "advertencia", motivo, denunciaIds });

export async function ocultarContenido(usuarioId, objeto, motivo, denunciaIds = []) {
  const m = await crearMedida({ usuarioId, tipo: "contenido_oculto", motivo, objeto: { tipo: objeto.tipo, id: objeto.id, titulo: objeto.snapshot?.titulo || "" }, denunciaIds });
  await ocultarObjeto(objeto.tipo, objeto.id, { motivo, medidaId: String(m._id) });
  return m;
}

// Perfil: se quita la foto y la descripción (lo que suele denunciarse) y se guarda lo anterior por si la apelación se acepta
export async function limpiarPerfilDe(usuarioId, objeto, motivo, denunciaIds = []) {
  const u = await Usuario.findById(usuarioId).select("foto descripcion");
  if (!u) return null;
  const previo = { foto: u.foto || "", descripcion: u.descripcion || "" };
  const m = await crearMedida({ usuarioId, tipo: "contenido_oculto", motivo, objeto: { tipo: "perfil", id: objeto.id, titulo: "Foto y descripción de tu perfil", restaurar: previo }, denunciaIds });
  await Usuario.updateOne({ _id: usuarioId }, { $set: { foto: "", descripcion: "" } });
  return m;
}

export async function suspender(usuarioId, { motivo, dias, permanente, denunciaIds = [] }) {
  const ahora = new Date();
  const hasta = permanente ? null : new Date(ahora.getTime() + dias * DIA);
  await Medida.updateMany({ usuarioId, tipo: "suspension", estado: "activa" }, { $set: { estado: "levantada", levantadaEn: ahora } }); // reemplaza una suspensión anterior
  const m = await crearMedida({ usuarioId, tipo: "suspension", motivo, desde: ahora, hasta, permanente: !!permanente, denunciaIds });
  await Usuario.updateOne({ _id: usuarioId }, { $set: { suspension: { activa: true, permanente: !!permanente, desde: ahora, hasta, motivo, medidaId: String(m._id) } } });
  olvidarSuspendidos();
  return m;
}

export async function levantarSuspension(usuarioId) {
  await Usuario.updateOne({ _id: usuarioId }, { $set: { "suspension.activa": false } });
  await Medida.updateMany({ usuarioId, tipo: "suspension", estado: "activa" }, { $set: { estado: "levantada", levantadaEn: new Date() } });
  olvidarSuspendidos();
}

// Deshace una medida (apelación aceptada o decisión del equipo): muestra de nuevo el contenido, devuelve el perfil o levanta la suspensión
export async function revertirMedida(m) {
  if (m.tipo === "suspension") await levantarSuspension(m.usuarioId);
  if (m.tipo === "contenido_oculto") {
    if (m.objeto?.tipo === "perfil") {
      const r = m.objeto.restaurar;
      if (r) await Usuario.updateOne({ _id: m.usuarioId }, { $set: { foto: r.foto || "", descripcion: r.descripcion || "" } });
    } else if (m.objeto?.tipo && m.objeto?.id) {
      await mostrarObjeto(m.objeto.tipo, m.objeto.id);
    }
  }
  m.estado = "levantada"; m.levantadaEn = new Date();
  await m.save();
}

// Cierra TODAS las denuncias abiertas sobre lo mismo (varias personas pueden haber denunciado lo mismo) y deja anotado qué se hizo
export async function cerrarDenuncias(objetoTipo, objetoId, { estado, accion, nota = "", medidaId = "" }) {
  const filtro = { objetoTipo, objetoId, estado: "abierta" };
  const abiertas = await Denuncia.find(filtro).select("_id denuncianteId").lean();
  if (!abiertas.length) return [];
  const ahora = new Date();
  await Denuncia.updateMany({ _id: { $in: abiertas.map((d) => d._id) } }, { $set: { estado, resolucion: { accion, nota: String(nota).slice(0, 500), medidaId: String(medidaId), en: ahora }, borrarEn: new Date(ahora.getTime() + 365 * DIA) } });
  return abiertas;
}

// A quienes denunciaron: se les agradece sin contarles qué se decidió sobre la otra persona
export function avisarDenunciantes(abiertas, huboMedida) {
  const cuerpo = huboMedida ? "Gracias por avisarnos. Revisamos lo que denunciaste y tomamos las medidas que correspondían." : "Revisamos lo que denunciaste y no encontramos un incumplimiento de las reglas de convivencia. Gracias por avisarnos.";
  for (const id of new Set(abiertas.map((d) => d.denuncianteId))) enviarPushAUsuario(id, { titulo: "Revisamos tu denuncia", cuerpo, url: "/" }, "soporte").catch(() => {});
}
