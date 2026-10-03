import express from "express";
import Business from "../models/Business.js";
import { identificar, requiereUsuario } from "../utils/auth.js";
import { sincronizarCobertura } from "../utils/asistente.js";
import { hoyISO } from "../utils/fechas.js";

const router = express.Router();
router.use(identificar);

// Datos internos que NUNCA salen en las respuestas públicas
const SECRETOS = ["ownerId", "ownerEmail", "ownerCode", "colabCode", "suscripcion", "pendientePago"];

// Campos que el dueño NO puede cambiar por su cuenta (los maneja el servidor: pagos, vencimiento, destacado, etc.)
const BLOQUEADOS_PARA_DUENO = [
  ...SECRETOS, "_id", "__v", "id", "kind", "status", "expiresAt", "lastRenewal",
  "createdAt", "updatedAt", "featured", "vecesFavorito",
];

function limpiarSalida(doc, { completo = false } = {}) {
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  if (!completo) SECRETOS.forEach((k) => delete obj[k]);
  else if (obj.suscripcion) {
    // ni siquiera al dueño le mostramos el historial interno de pagos
    obj.suscripcion = { plan: obj.suscripcion.plan, origen: obj.suscripcion.origen };
  }
  delete obj.__v;
  return obj;
}

// stringify con las claves ordenadas, para comparar objetos sin que importe el orden de las propiedades
function estable(v) {
  if (Array.isArray(v)) return `[${v.map(estable).join(",")}]`;
  if (v && typeof v === "object") return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${estable(v[k])}`).join(",")}}`;
  return JSON.stringify(v ?? null);
}

// La web guarda las reseñas mandando la lista completa. Acá se verifica que solo se haya AGREGADO una reseña
// (sin respuesta) y que, salvo la respuesta del dueño, nada de lo existente cambió. Así nadie puede borrar
// reseñas ajenas ni escribir respuestas en nombre del dueño.
function reseñasValidas(actuales = [], nuevas, esDueno) {
  if (!Array.isArray(nuevas)) return false;
  if (nuevas.length < actuales.length || nuevas.length > actuales.length + 1) return false;
  for (const a of actuales) {
    const n = nuevas.find((x) => x && x.id === a.id);
    if (!n) return false;
    const { respuesta: ra, ...restoA } = a;
    const { respuesta: rn, ...restoN } = n;
    if (estable(restoA) !== estable(restoN)) return false;
    if (!esDueno && estable(ra) !== estable(rn)) return false;
  }
  const ids = new Set(actuales.map((r) => r.id));
  return !nuevas.filter((r) => !ids.has(r.id)).some((r) => r.respuesta);
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
    res.status(500).json({ error: e.message });
  }
});

// Mis negocios (los de la cuenta con la que inició sesión), incluidos los que todavía esperan el pago.
// Acá se sincroniza con Mi Asistente: si ya pagó allá, el negocio queda cubierto sin volver a pagar.
router.get("/mios", requiereUsuario, async (req, res) => {
  try {
    const usuario = req.actor.usuario;
    await Business.updateMany(
      { ownerEmail: usuario.email, $or: [{ ownerId: { $exists: false } }, { ownerId: "" }, { ownerId: null }] },
      { $set: { ownerId: String(usuario._id) } }
    );
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
    res.status(500).json({ error: e.message });
  }
});

// Actualizar un negocio
//  · dueño (sesión de Google): todo menos lo que maneja el servidor (estado, vencimiento, destacado...)
//  · cualquier otra persona: solo sumar una visita y agregar una reseña
router.put("/:id", async (req, res) => {
  try {
    const { _id, __v, ...body } = req.body || {};
    const actor = req.actor;

    const biz = await Business.findOne({ id: req.params.id });
    if (!biz) return res.status(404).json({ error: "Negocio no encontrado" });
    const esDueno = actor?.tipo === "usuario" && biz.ownerId === String(actor.usuario._id);

    const cambios = {};
    if (esDueno) {
      Object.keys(body).forEach((k) => { if (!BLOQUEADOS_PARA_DUENO.includes(k)) cambios[k] = body[k]; });
    }
    // visitas: solo puede subir de a una por pedido (evita inflar el ranking de un golpe)
    if (Number.isInteger(body.views) && body.views >= (biz.views || 0) && body.views <= (biz.views || 0) + 1) cambios.views = body.views;
    else delete cambios.views;
    // reseñas: solo agregar una nueva; la respuesta a una reseña la puede escribir únicamente el dueño
    if (body.reviews !== undefined) {
      if (reseñasValidas(biz.reviews || [], body.reviews, esDueno)) cambios.reviews = body.reviews;
      else delete cambios.reviews;
    }

    if (!Object.keys(cambios).length) return res.json(limpiarSalida(biz));
    const updated = await Business.findOneAndUpdate({ id: req.params.id }, { $set: cambios }, { new: true });
    res.json(limpiarSalida(updated, { completo: esDueno }));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Sumar o restar 1 al contador de "veces guardado en favoritos" (atómico, para el ranking)
router.patch("/:id/favorito", async (req, res) => {
  try {
    const delta = req.body?.delta === -1 ? -1 : 1;
    const updated = await Business.findOneAndUpdate(
      { id: req.params.id },
      { $inc: { vecesFavorito: delta } },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: "Negocio no encontrado" });
    res.json({ vecesFavorito: Math.max(0, updated.vecesFavorito || 0) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Eliminar un negocio: solo su dueño
router.delete("/:id", async (req, res) => {
  try {
    const actor = req.actor;
    const biz = await Business.findOne({ id: req.params.id });
    if (!biz) return res.json({ ok: true });
    if (!(actor?.tipo === "usuario" && biz.ownerId === String(actor.usuario._id))) {
      return res.status(403).json({ error: "No tenés permiso para eliminar este negocio." });
    }
    await Business.deleteOne({ id: req.params.id });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
