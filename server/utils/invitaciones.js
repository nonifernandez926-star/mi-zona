import crypto from "crypto";
import Usuario from "../models/Usuario.js";
import Invitacion from "../models/Invitacion.js";
import { suspensionVigente } from "./moderacion.js";
import { enviarPushAUsuario } from "./push.js";
import { DIAS_POR_INVITACION, DIAS_INVITADO, TOPE_DIAS_INVITANDO, HORAS_PARA_ACREDITAR } from "./planes.js";

// Código de invitación: un texto corto que la persona escribe (no es un enlace). Sin letras ni números que se confunden (0/O, 1/I).
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const generar = () => Array.from(crypto.randomBytes(8), (b) => ALFABETO[b % ALFABETO.length]).join("");
export const normalizarCodigo = (t) => String(t || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

// Huella de la red del registro. Se guarda esto y no la IP, y solo sirve para comparar cuentas entre sí.
export const huellaDeRed = (req) => crypto.createHmac("sha256", process.env.JWT_SECRET || "mizona").update(`ip|${req.ip || ""}`).digest("hex").slice(0, 32);

export async function asegurarCodigo(u) {
  if (u.codigoInvitacion) return u.codigoInvitacion;
  for (let i = 0; i < 6; i++) {
    const codigo = generar();
    try {
      const r = await Usuario.updateOne({ _id: u._id, $or: [{ codigoInvitacion: "" }, { codigoInvitacion: { $exists: false } }] }, { $set: { codigoInvitacion: codigo } });
      if (r.modifiedCount === 1) { u.codigoInvitacion = codigo; return codigo; }
      const actual = await Usuario.findById(u._id).select("codigoInvitacion").lean();
      if (actual?.codigoInvitacion) { u.codigoInvitacion = actual.codigoInvitacion; return actual.codigoInvitacion; }
    } catch (e) { if (e.code !== 11000) throw e; /* código repetido: se prueba otro */ }
  }
  return "";
}

// Revisa el código que escribió la persona al registrarse (es opcional: vacío = no hay nada que revisar).
// Devuelve { error } si no sirve, { invitador } si sirve, o {} si no escribió nada.
export async function revisarCodigo(texto, invitado) {
  const codigo = normalizarCodigo(texto);
  if (!codigo) return {};
  if (invitado.invitadoPor) return { error: "Tu cuenta ya se registró con un código de invitación." };
  const invitador = await Usuario.findOne({ codigoInvitacion: codigo }).select("_id suspension").lean();
  if (!invitador) return { error: "Ese código de invitación no existe. Revisalo o dejalo vacío." };
  if (String(invitador._id) === String(invitado._id)) return { error: "No podés usar tu propio código." };
  return { invitador };
}

// Registra la invitación (queda PENDIENTE: los días se regalan unos días después, si la cuenta nueva es real y sigue en regla).
export async function registrarInvitacion(invitado, invitador, req) {
  const ipHash = huellaDeRed(req);
  const desde = new Date(Date.now() - 24 * 3600 * 1000);
  const recientes = await Invitacion.countDocuments({ invitadorId: String(invitador._id), createdAt: { $gte: desde } });
  const mismaRed = await Invitacion.exists({ invitadorId: String(invitador._id), ipHash, estado: { $ne: "rechazada" } });
  const miRed = invitador.ipRegistroHash && invitador.ipRegistroHash === ipHash;
  let estado = "pendiente", motivo = "";
  if (recientes >= 10) { estado = "rechazada"; motivo = "demasiadas invitaciones en 24 horas"; }
  else if (mismaRed) { estado = "rechazada"; motivo = "misma red que otra invitación de la misma persona"; }
  else if (miRed) { estado = "rechazada"; motivo = "misma red que quien invita"; }
  try {
    await Invitacion.create({
      invitadorId: String(invitador._id), invitadoId: String(invitado._id), estado, motivo, ipHash,
      acreditarEn: new Date(Date.now() + HORAS_PARA_ACREDITAR * 3600 * 1000),
    });
  } catch (e) { if (e.code === 11000) return; throw e; }
  await Usuario.updateOne({ _id: invitado._id }, { $set: { invitadoPor: String(invitador._id) } });
  invitado.invitadoPor = String(invitador._id);
}

// Se corre junto con la revisión de vencimientos: acredita las invitaciones pendientes cuya espera ya pasó.
export async function acreditarInvitaciones() {
  const resumen = { acreditadas: 0, rechazadas: 0 };
  const lista = await Invitacion.find({ estado: "pendiente", acreditarEn: { $lte: new Date() } }).limit(200);
  for (const inv of lista) {
    const [invitado, invitador] = await Promise.all([
      Usuario.findById(inv.invitadoId).select("suspension mayor18 terminosAceptadosEn correoVerificado").lean(),
      Usuario.findById(inv.invitadorId).select("suspension diasGanadosInvitando").lean(),
    ]);
    const rechazar = async (motivo) => { inv.estado = "rechazada"; inv.motivo = motivo; await inv.save(); resumen.rechazadas++; };
    if (!invitado || !invitador) { await rechazar("una de las cuentas ya no existe"); continue; }
    if (suspensionVigente(invitado) || suspensionVigente(invitador)) { await rechazar("cuenta suspendida"); continue; }
    if (!invitado.mayor18 || !invitado.terminosAceptadosEn || !invitado.correoVerificado) { await rechazar("la cuenta nueva no completó su registro"); continue; }
    const lugar = Math.max(0, TOPE_DIAS_INVITANDO - (invitador.diasGanadosInvitando || 0));
    const diasInvitador = Math.min(DIAS_POR_INVITACION, lugar);
    // Los días de la persona invitada no dependen del tope de quien invita
    if (diasInvitador > 0) await Usuario.updateOne({ _id: inv.invitadorId }, { $inc: { diasDisponibles: diasInvitador, diasGanadosInvitando: diasInvitador } });
    await Usuario.updateOne({ _id: inv.invitadoId }, { $inc: { diasDisponibles: DIAS_INVITADO } });
    inv.estado = "acreditada"; inv.diasInvitador = diasInvitador; inv.diasInvitado = DIAS_INVITADO; await inv.save();
    resumen.acreditadas++;
    if (diasInvitador > 0) {
      await enviarPushAUsuario(inv.invitadorId, { titulo: "¡Ganaste días gratis!", cuerpo: `Alguien se registró con tu código. Sumaste ${diasInvitador} días para usar en tus fichas.`, url: "/?tab=herramientas" }, "suscripcion");
    }
  }
  return resumen;
}

export async function resumenInvitaciones(u) {
  const codigo = await asegurarCodigo(u);
  const [acreditadas, pendientes] = await Promise.all([
    Invitacion.countDocuments({ invitadorId: String(u._id), estado: "acreditada" }),
    Invitacion.countDocuments({ invitadorId: String(u._id), estado: "pendiente" }),
  ]);
  return {
    codigo, acreditadas, pendientes, diasDisponibles: u.diasDisponibles || 0,
    diasGanadosInvitando: u.diasGanadosInvitando || 0, topeDias: TOPE_DIAS_INVITANDO,
    diasPorInvitacion: DIAS_POR_INVITACION, diasInvitado: DIAS_INVITADO,
  };
}
