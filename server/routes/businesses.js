import express from "express";
import Business from "../models/Business.js";
import { identificar, requiereUsuario, limitar } from "../utils/auth.js";
import { sanearNegocio, combinarResenas } from "../utils/negocios.js";
import { sincronizarCobertura } from "../utils/asistente.js";
import { hoyISO } from "../utils/fechas.js";
import { permitir } from "../utils/limitador.js";

const router = express.Router();
router.use(identificar);

// Datos internos que NUNCA salen en las respuestas públicas
const SECRETOS = ["ownerId", "ownerEmail", "ownerCode", "colabCode", "suscripcion", "pendientePago", "asistenteCodigo", "geoIntentos"];

function limpiarSalida(doc, { completo = false } = {}) {
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  if (!completo) SECRETOS.forEach((k) => delete obj[k]);
  else if (obj.suscripcion) {
    // ni siquiera al dueño le mostramos el historial interno de pagos
    obj.suscripcion = { plan: obj.suscripcion.plan, origen: obj.suscripcion.origen };
  }
  delete obj.__v;
  // la huella interna de quien escribió cada reseña nunca sale
  if (Array.isArray(obj.reviews)) obj.reviews = obj.reviews.map(({ autorUid, ...r }) => r);
  return obj;
}

// Traer todos los negocios (público: sin datos internos)
router.get("/", async (req, res) => {
  try {
    // Los negocios con suscripción propia que ya vencieron dejan de mostrarse
    await Business.updateMany(
      { ownerId: { $exists: true, $nin: ["", null] }, status: "active", expiresAt: { $lt: hoyISO() } },
      { $set: { status: "inactive" } }
    );
    const list = await Business.find({ pendientePago: { $ne: true } });
    res.json(list.map((b) => limpiarSalida(b)));
  } catch (e) {
    res.status(500).json({ error: "Error del servidor" });
  }
});

// Mis negocios (los de la cuenta con la que inició sesión), incluidos los que todavía esperan el pago.
// Acá se sincroniza con Mi Asistente: si ya pagó allá, el negocio queda cubierto sin volver a pagar.
router.get("/mios", requiereUsuario, async (req, res) => {
  try {
    const usuario = req.actor.usuario;
    if (usuario.proveedor !== "email") { // el correo solo es de fiar si lo verificó Google
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

    const cambios = esDueno ? sanearNegocio(body) : {};
    // visitas: solo puede subir de a una por pedido (evita inflar el ranking de un golpe)
    const sumaVisita = Number.isInteger(body.views) && body.views === (biz.views || 0) + 1;
    // reseñas: solo agregar una nueva; la respuesta a una reseña la puede escribir únicamente el dueño
    if (body.reviews !== undefined && actor?.tipo === "usuario") {
      const uidActor = String(actor.usuario._id);
      const dejaNueva = Array.isArray(body.reviews) && body.reviews.length > (biz.reviews || []).length;
      if (!dejaNueva || permitir(`resena|${uidActor}`, 10, 3600 * 1000)) {
        const lista = combinarResenas(biz.reviews || [], body.reviews, { esDueno, usuarioId: uidActor, hoy: hoyISO() });
        // solo se escribe si hay una reseña nueva o una respuesta nueva (así un pedido viejo no pisa reseñas recién llegadas)
        if (lista && JSON.stringify(lista) !== JSON.stringify(biz.reviews || [])) cambios.reviews = lista;
      }
    }

    const operacion = {};
    if (Object.keys(cambios).length) operacion.$set = cambios;
    if (sumaVisita && permitir(`visita|${req.ip}|${biz.id}`, 30, 3600 * 1000)) operacion.$inc = { views: 1 };
    if (!Object.keys(operacion).length) return res.json(limpiarSalida(biz, { completo: esDueno }));
    const updated = await Business.findOneAndUpdate({ id: biz.id }, operacion, { new: true });
    res.json(limpiarSalida(updated, { completo: esDueno }));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo guardar el negocio." });
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
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Error del servidor" });
  }
});

export default router;
