import express from "express";
import Business from "../models/Business.js";
import Usuario from "../models/Usuario.js";
import Evento from "../models/Evento.js";
import mongoose from "mongoose";
import { identificar, requiereUsuario, limitar } from "../utils/auth.js";
import { sanearNegocio, combinarResenas } from "../utils/negocios.js";
import { sincronizarCobertura } from "../utils/asistente.js";
import { hoyISO } from "../utils/fechas.js";
import { ocultaInfo } from "../utils/moderacion.js";
import { permitir } from "../utils/limitador.js";
import { ownersExcluidos, ownerExcluido } from "../utils/exclusiones.js";

const router = express.Router();
router.use(identificar);

// Datos internos que NUNCA salen en las respuestas públicas
const SECRETOS = ["ownerId", "ownerEmail", "ownerCode", "colabCode", "suscripcion", "pendientePago", "asistenteCodigo", "geoIntentos", "duenoEnPerfil", "duenoEnFicha"];

// Lo que decide el dueño en Privacidad. Para el público, el WhatsApp apagado NO sale (ni el número ni el botón): solo se avisa que está oculto.
export const whatsappVisible = (b) => b?.mostrarWhatsapp !== false;
export const apareceEnBusquedas = (b) => b?.apareceEnBusquedas !== false;

function limpiarSalida(doc, { completo = false } = {}) {
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  if (!completo) {
    SECRETOS.forEach((k) => delete obj[k]);
    if (!whatsappVisible(obj)) { delete obj.phone; obj.acceptsWhatsapp = false; obj.whatsappOculto = true; }
    delete obj.mostrarWhatsapp; delete obj.apareceEnBusquedas;
    delete obj.ocultaPorEquipo; delete obj.ocultaMotivo; delete obj.ocultaDesde; delete obj.ocultaMedidaId;
  } else {
    obj.mostrarWhatsapp = whatsappVisible(obj); obj.apareceEnBusquedas = apareceEnBusquedas(obj);
    obj.ocultaPorEquipo = ocultaInfo(obj); // Fase 8: si el equipo la ocultó, el dueño ve el motivo
    delete obj.ocultaMotivo; delete obj.ocultaDesde; delete obj.ocultaMedidaId;
    if (obj.suscripcion) {
      // ni siquiera al dueño le mostramos el historial interno de pagos
      obj.suscripcion = { plan: obj.suscripcion.plan, origen: obj.suscripcion.origen };
    }
  }
  delete obj.__v;
  // la huella interna de quien escribió cada reseña nunca sale
  if (Array.isArray(obj.reviews)) obj.reviews = obj.reviews.map(({ autorUid, ...r }) => r);
  return obj;
}

// Último barrido de negocios vencidos (se hace a lo sumo una vez por minuto, no en cada visita)
let ultimoBarrido = 0;

// Traer todos los negocios (público: sin datos internos)
router.get("/", async (req, res) => {
  try {
    // Los negocios con suscripción propia que ya vencieron dejan de mostrarse
    if (Date.now() - ultimoBarrido > 60 * 1000) {
      ultimoBarrido = Date.now();
      await Business.updateMany(
        { ownerId: { $exists: true, $nin: ["", null] }, status: "active", expiresAt: { $lt: hoyISO() } },
        { $set: { status: "inactive" } }
      );
    }
    // las fichas que su dueño sacó de las búsquedas no salen en ningún listado público
    // Fase 8: tampoco salen los negocios ocultos por el equipo, ni los de cuentas suspendidas o personas bloqueadas (en ningún sentido)
    const list = await Business.find({ pendientePago: { $ne: true }, apareceEnBusquedas: { $ne: false }, ocultaPorEquipo: { $ne: true }, ownerId: { $nin: await ownersExcluidos(req) } });
    // "Dueño: @usuario" solo aparece si el dueño lo activó para esa ficha Y su perfil es visible
    const idsDuenos = [...new Set(list.filter((b) => b.duenoEnFicha && b.ownerId && mongoose.isValidObjectId(b.ownerId)).map((b) => b.ownerId))];
    const duenos = new Map();
    if (idsDuenos.length) {
      const us = await Usuario.find({ _id: { $in: idsDuenos }, "privacidad.perfilVisible": { $ne: false }, usuario: { $gt: "" } }).select("usuario").lean();
      us.forEach((x) => duenos.set(String(x._id), x.usuario));
    }
    res.json(list.map((b) => {
      const salida = limpiarSalida(b);
      const dueno = b.duenoEnFicha ? duenos.get(String(b.ownerId)) : null;
      return dueno ? { ...salida, dueno } : salida;
    }));
  } catch (e) {
    res.status(500).json({ error: "Error del servidor" });
  }
});

// Mis negocios (los de la cuenta con la que inició sesión), incluidos los que todavía esperan el pago.
// Acá se sincroniza con Mi Asistente: si ya pagó allá, el negocio queda cubierto sin volver a pagar.
router.get("/mios", requiereUsuario, async (req, res) => {
  try {
    const usuario = req.actor.usuario;
    if (usuario.proveedor !== "email" || usuario.correoVerificado) { // el correo solo es de fiar si lo verificó Google
      await Business.updateMany(
        { ownerEmail: usuario.email, $or: [{ ownerId: { $exists: false } }, { ownerId: "" }, { ownerId: null }] },
        { $set: { ownerId: String(usuario._id) } }
      );
    }
    // Si la cuenta tiene Mi Asistente, sus negocios viejos conectados a ese asistente pasan a ser suyos (ver sincronizarCobertura)
    await sincronizarCobertura(null, usuario);
    const negocios = await Business.find({ ownerId: String(usuario._id) });
    let cobertura = { consultado: false, cubierto: false, hasta: null };
    if (negocios.length) {
      for (const n of negocios) cobertura = await sincronizarCobertura(n, usuario);
    } else {
      cobertura = await sincronizarCobertura(null, usuario);
    }
    res.json({ negocios: negocios.map((n) => limpiarSalida(n, { completo: true })), cobertura });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error del servidor" });
  }
});

// Actualizar un negocio
//  · dueño (sesión): solo los campos de la lista blanca de utils/negocios.js (nunca pagos, vencimiento, estado ni dueño)
//  · cualquier otra persona: solo sumar una visita y, con cuenta, agregar una reseña
router.put("/:id", limitar("negocio-put", 120, 10 * 60 * 1000), async (req, res) => {
  try {
    const body = req.body || {};
    const actor = req.actor;

    const biz = await Business.findOne({ id: String(req.params.id) });
    if (!biz) return res.status(404).json({ error: "Negocio no encontrado" });
    const esDueno = actor?.tipo === "usuario" && !!biz.ownerId && biz.ownerId === String(actor.usuario._id);
    // una ficha oculta de las búsquedas (o que todavía espera el pago) no se puede ver ni tocar desde afuera, aunque se conozca su id
    if (!esDueno && (biz.pendientePago || !apareceEnBusquedas(biz) || biz.ocultaPorEquipo === true || (await ownerExcluido(req, biz.ownerId)))) return res.status(404).json({ error: "Negocio no encontrado" });

    const cambios = esDueno ? sanearNegocio(body) : {};
    // visitas: solo puede subir de a una por pedido (evita inflar el ranking de un golpe)
    const sumaVisita = Number.isInteger(body.views) && body.views === (biz.views || 0) + 1;
    // reseñas: solo agregar una nueva; la respuesta a una reseña la puede escribir únicamente el dueño
    if (body.reviews !== undefined && actor?.tipo === "usuario") {
      const uidActor = String(actor.usuario._id);
      const dejaNueva = Array.isArray(body.reviews) && body.reviews.length > (biz.reviews || []).length;
      if (!dejaNueva || (await permitir(`resena|${uidActor}`, 10, 3600 * 1000))) {
        // la reseña se firma con el usuario de la cuenta (si por algún motivo no tiene, con su nombre)
        const nombreAutor = actor.usuario.usuario || actor.usuario.nombre || "";
        const lista = combinarResenas(biz.reviews || [], body.reviews, { esDueno, usuarioId: uidActor, nombreAutor, hoy: hoyISO() });
        // solo se escribe si hay una reseña nueva o una respuesta nueva (así un pedido viejo no pisa reseñas recién llegadas)
        if (lista && JSON.stringify(lista) !== JSON.stringify(biz.reviews || [])) cambios.reviews = lista;
      }
    }

    const operacion = {};
    if (Object.keys(cambios).length) operacion.$set = cambios;
    if (sumaVisita && (await permitir(`visita|${req.ip}|${biz.id}`, 30, 3600 * 1000, { soloMemoria: true }))) operacion.$inc = { views: 1 };
    if (!Object.keys(operacion).length) return res.json(limpiarSalida(biz, { completo: esDueno }));
    const updated = await Business.findOneAndUpdate({ id: biz.id }, operacion, { new: true });
    res.json(limpiarSalida(updated, { completo: esDueno }));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo guardar el negocio." });
  }
});

// PUT /api/businesses/:id/dueno   { enPerfil?, enFicha? }  → el dueño elige (y puede desactivar cuando quiera) si se muestra
// "Dueño de: [negocio]" en su perfil y "Dueño: @usuario" en la ficha. Son dos opciones independientes. Solo el dueño puede cambiarlas.
router.put("/:id/dueno", requiereUsuario, limitar("dueno", 60, 3600 * 1000), async (req, res) => {
  try {
    const biz = await Business.findOne({ id: String(req.params.id) });
    if (!biz || !biz.ownerId || biz.ownerId !== String(req.actor.usuario._id)) return res.status(404).json({ error: "Negocio no encontrado" });
    if (typeof req.body?.enPerfil === "boolean") biz.duenoEnPerfil = req.body.enPerfil;
    if (typeof req.body?.enFicha === "boolean") biz.duenoEnFicha = req.body.enFicha;
    await biz.save();
    res.json({ duenoEnPerfil: !!biz.duenoEnPerfil, duenoEnFicha: !!biz.duenoEnFicha });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo guardar." });
  }
});

// POST /api/businesses/:id/compartido → el dueño completó el menú de compartir tras publicar su negocio (Fase 6).
// Solo guarda CUÁNDO: no prueba que el mensaje llegó a alguien y no se usa para dar ni quitar nada.
router.post("/:id/compartido", requiereUsuario, limitar("negocio-compartido", 30, 3600 * 1000), async (req, res) => {
  try {
    const biz = await Business.findOne({ id: String(req.params.id) }).select("ownerId id").lean();
    if (!biz || !biz.ownerId || biz.ownerId !== String(req.actor.usuario._id)) return res.status(404).json({ error: "Negocio no encontrado" });
    const cuando = new Date();
    await Business.updateOne({ id: biz.id }, { $set: { compartioEn: cuando } }, { timestamps: false });
    res.json({ compartioEn: cuando });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo guardar." });
  }
});

// PUT /api/businesses/:id/privacidad   { mostrarWhatsapp?, apareceEnBusquedas? }  → el dueño decide, ficha por ficha, si se muestra el WhatsApp
// al público y si la ficha aparece en búsquedas y listados. Solo el dueño puede cambiarlo y solo se aceptan valores true/false.
router.put("/:id/privacidad", requiereUsuario, limitar("privacidad-ficha", 60, 3600 * 1000), async (req, res) => {
  try {
    const biz = await Business.findOne({ id: String(req.params.id) });
    if (!biz || !biz.ownerId || biz.ownerId !== String(req.actor.usuario._id)) return res.status(404).json({ error: "Negocio no encontrado" });
    const { mostrarWhatsapp, apareceEnBusquedas: aparece } = req.body || {};
    const hayCambio = typeof mostrarWhatsapp === "boolean" || typeof aparece === "boolean";
    if (!hayCambio) return res.status(400).json({ error: "No hay nada para cambiar." });
    if (typeof mostrarWhatsapp === "boolean") biz.mostrarWhatsapp = mostrarWhatsapp;
    if (typeof aparece === "boolean") biz.apareceEnBusquedas = aparece;
    await biz.save();
    res.json({ mostrarWhatsapp: whatsappVisible(biz), apareceEnBusquedas: apareceEnBusquedas(biz) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo guardar." });
  }
});

// Sumar o restar 1 al contador de "veces guardado en favoritos" (atómico, para el ranking)
router.patch("/:id/favorito", limitar("favorito", 60, 3600 * 1000), async (req, res) => {
  try {
    const delta = req.body?.delta === -1 ? -1 : 1;
    const updated = await Business.findOneAndUpdate(
      { id: String(req.params.id) },
      { $inc: { vecesFavorito: delta } },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: "Negocio no encontrado" });
    if ((updated.vecesFavorito || 0) < 0) await Business.updateOne({ _id: updated._id, vecesFavorito: { $lt: 0 } }, { $set: { vecesFavorito: 0 } });
    res.json({ vecesFavorito: Math.max(0, updated.vecesFavorito || 0) });
  } catch (e) {
    res.status(500).json({ error: "Error del servidor" });
  }
});

// Eliminar un negocio: solo su dueño
router.delete("/:id", async (req, res) => {
  try {
    const actor = req.actor;
    const biz = await Business.findOne({ id: String(req.params.id) });
    if (!biz) return res.json({ ok: true });
    if (!(actor?.tipo === "usuario" && biz.ownerId === String(actor.usuario._id))) {
      return res.status(403).json({ error: "No tenés permiso para eliminar este negocio." });
    }
    await Business.deleteOne({ id: String(req.params.id) });
    await Evento.deleteMany({ bizId: biz.id }); // sus estadísticas se van con la ficha (igual que al eliminar la cuenta)
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Error del servidor" });
  }
});

export default router;
