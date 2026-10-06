import express from "express";
import Usuario from "../models/Usuario.js";
import Business from "../models/Business.js";
import AgendaItem from "../models/AgendaItem.js";
import PushSuscripcion from "../models/PushSuscripcion.js";
import UsoFotoAgenda from "../models/UsoFotoAgenda.js";
import Evento from "../models/Evento.js";
import Sesion from "../models/Sesion.js";
import Consulta from "../models/Consulta.js";
import ActividadSeguridad from "../models/ActividadSeguridad.js";
import { identificar, requiereUsuario, verificarAccessTokenGoogle, limitar } from "../utils/auth.js";
import { verificarContrasena } from "../utils/contrasenas.js";
import { huellaAutor } from "../utils/negocios.js";
import { permitir } from "../utils/limitador.js";

const router = express.Router();
router.use(identificar, requiereUsuario);

const PREFS = ["ubicacionBusqueda", "chatsBusqueda", "iaAgenda"];
const prefsDe = (u) => Object.fromEntries(PREFS.map((k) => [k, u.privacidad?.[k] !== false]));
const uid = (req) => String(req.actor.usuario._id);

// GET /api/privacidad → todo lo que Mi Zona tiene guardado de esta cuenta (cantidades), más los controles actuales
router.get("/", async (req, res) => {
  try {
    const u = req.actor.usuario;
    const id = uid(req);
    const [negocios, agenda, tareas, dispositivosPush, resenas] = await Promise.all([
      Business.find({ ownerId: id }).select("id name status pendientePago expiresAt"),
      AgendaItem.countDocuments({ usuarioId: id, tipo: "evento" }),
      AgendaItem.countDocuments({ usuarioId: id, tipo: "tarea" }),
      PushSuscripcion.countDocuments({ usuarioId: id }),
      Business.aggregate([{ $unwind: "$reviews" }, { $match: { "reviews.autorUid": huellaAutor(id) } }, { $count: "n" }]),
    ]);
    res.json({
      cuenta: { email: u.email, nombre: u.nombre, proveedor: u.proveedor, creadaEn: u.createdAt, conClave: !!u.passwordHash },
      sesion: { venceEn: req.tokenExp ? new Date(req.tokenExp * 1000).toISOString() : null },
      negocios: negocios.map((n) => ({ id: n.id, nombre: n.name, estado: n.pendientePago ? "pendiente" : n.status, venceEl: n.expiresAt })),
      agenda: { eventos: agenda, tareas },
      dispositivosPush,
      resenas: resenas[0]?.n || 0,
      chatsVinculados: !!u.sesionClienteId,
      preferencias: prefsDe(u),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo cargar tu información de privacidad." });
  }
});

// GET /api/privacidad/resenas → lista de las reseñas que escribió esta cuenta (para Mi cuenta → Tu actividad)
router.get("/resenas", async (req, res) => {
  try {
    const lista = await Business.aggregate([
      { $unwind: "$reviews" }, { $match: { "reviews.autorUid": huellaAutor(uid(req)) } },
      { $project: { _id: 0, negocioId: "$id", negocio: "$name", valoracion: "$reviews.rating", texto: "$reviews.text", fecha: "$reviews.date" } },
    ]);
    lista.sort((a, b) => String(b.fecha || "").localeCompare(String(a.fecha || "")));
    res.json({ resenas: lista });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudieron cargar tus reseñas." });
  }
});

// PUT /api/privacidad/preferencias   { ubicacionBusqueda?, chatsBusqueda?, iaAgenda? }
// Estos controles los respeta el servidor: la búsqueda con asistente ignora la ubicación y los chats, y la agenda no usa IA.
router.put("/preferencias", async (req, res) => {
  try {
    const u = req.actor.usuario;
    for (const k of PREFS) if (typeof req.body?.[k] === "boolean") u.set(`privacidad.${k}`, req.body[k]);
    await u.save();
    res.json({ preferencias: prefsDe(u) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo guardar." });
  }
});

// GET /api/privacidad/exportar → copia de tus datos (se descarga como archivo JSON desde la web)
router.get("/exportar", limitar("exportar", 5, 3600 * 1000), async (req, res) => {
  try {
    const u = req.actor.usuario;
    const id = uid(req);
    const [negocios, agenda, push, consultas] = await Promise.all([
      Business.find({ ownerId: id }),
      AgendaItem.find({ usuarioId: id }).lean(),
      PushSuscripcion.find({ usuarioId: id }).select("createdAt").lean(),
      Consulta.find({ usuarioId: id }).select("motivo asunto mensaje estado respuesta createdAt -_id").lean(),
    ]);
    const huella = huellaAutor(id);
    const misResenas = await Business.aggregate([
      { $unwind: "$reviews" }, { $match: { "reviews.autorUid": huella } },
      { $project: { _id: 0, negocio: "$name", valoracion: "$reviews.rating", texto: "$reviews.text", fecha: "$reviews.date", nombreMostrado: "$reviews.name" } },
    ]);
    res.setHeader("Content-Disposition", 'attachment; filename="mis-datos-mi-zona.json"');
    res.json({
      generadoEl: new Date().toISOString(),
      cuenta: { email: u.email, nombre: u.nombre, proveedorDeAcceso: u.proveedor, creadaEl: u.createdAt },
      preferenciasDePrivacidad: prefsDe(u),
      negocios: negocios.map((n) => {
        const o = n.toObject();
        // se incluye lo que cargó el dueño; los datos internos de pagos no
        const { _id, __v, ownerId, suscripcion, geoIntentos, ...resto } = o;
        return { ...resto, suscripcion: { plan: suscripcion?.plan || null, origen: suscripcion?.origen || null }, reviews: (o.reviews || []).map(({ autorUid, ...r }) => r) };
      }),
      agenda: agenda.map(({ _id, __v, usuarioId, ...r }) => r),
      reseñasQueEscribí: misResenas,
      dispositivosConNotificaciones: push.length,
      consultasASoporte: consultas,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo preparar tu descarga." });
  }
});

// DELETE /api/privacidad/agenda → borra TODA la agenda (eventos y tareas) y los registros de uso de fotos
router.delete("/agenda", async (req, res) => {
  try {
    const r = await AgendaItem.deleteMany({ usuarioId: uid(req) });
    res.json({ ok: true, borrados: r.deletedCount || 0 });
  } catch (e) {
    res.status(500).json({ error: "No se pudo borrar la agenda." });
  }
});

// DELETE /api/privacidad/notificaciones → desvincula todos los dispositivos de las notificaciones push
router.delete("/notificaciones", async (req, res) => {
  try {
    const r = await PushSuscripcion.deleteMany({ usuarioId: uid(req) });
    res.json({ ok: true, borrados: r.deletedCount || 0 });
  } catch (e) {
    res.status(500).json({ error: "No se pudieron desactivar las notificaciones." });
  }
});

// DELETE /api/privacidad/resenas → borra las reseñas que escribió esta cuenta (desde que se guarda la huella de autor)
router.delete("/resenas", async (req, res) => {
  try {
    const r = await Business.updateMany({ "reviews.autorUid": huellaAutor(uid(req)) }, { $pull: { reviews: { autorUid: huellaAutor(uid(req)) } } });
    res.json({ ok: true, negociosAfectados: r.modifiedCount || 0 });
  } catch (e) {
    res.status(500).json({ error: "No se pudieron borrar tus reseñas." });
  }
});

// DELETE /api/privacidad/cuenta   { confirmacion: "ELIMINAR", password? | accessToken?, eliminarNegocios? }
// Borra la cuenta y sus datos. Se pide volver a demostrar quién es (contraseña, o Google de nuevo) para que alguien con el
// teléfono desbloqueado de otra persona no pueda borrarle todo. Si tiene negocios, hay que decidir explícitamente.
router.delete("/cuenta", async (req, res) => {
  try {
    const u = req.actor.usuario;
    const id = uid(req);
    if (!permitir(`borrar-cuenta|${id}`, 5, 3600 * 1000)) return res.status(429).json({ error: "Demasiados intentos. Probá de nuevo en un rato." });
    if (req.body?.confirmacion !== "ELIMINAR") return res.status(400).json({ error: "Escribí ELIMINAR para confirmar." });

    if (u.passwordHash) {
      if (!(await verificarContrasena(String(req.body?.password || ""), u.passwordHash))) return res.status(401).json({ error: "La contraseña no es correcta." });
    } else {
      let datos;
      try { datos = await verificarAccessTokenGoogle(req.body?.accessToken); } catch { return res.status(401).json({ error: "No pudimos confirmar tu cuenta de Google. Probá de nuevo." }); }
      if (datos.googleId !== u.googleId) return res.status(403).json({ error: "Esa no es la cuenta de Google con la que entraste." });
    }

    const negocios = await Business.find({ ownerId: id }).select("id name");
    if (negocios.length && req.body?.eliminarNegocios !== true) {
      return res.status(409).json({ error: "negocios_pendientes", mensaje: "Tu cuenta tiene negocios. Confirmá que también querés eliminarlos.", negocios: negocios.map((n) => n.name) });
    }

    const huella = huellaAutor(id);
    await Business.updateMany({ "reviews.autorUid": huella }, { $pull: { reviews: { autorUid: huella } } });
    if (negocios.length) {
      const ids = negocios.map((n) => n.id);
      await Evento.deleteMany({ bizId: { $in: ids } });
      await Business.deleteMany({ ownerId: id });
    }
    if (u.sesionClienteId) await Evento.deleteMany({ clienteId: u.sesionClienteId });
    await Promise.all([
      AgendaItem.deleteMany({ usuarioId: id }),
      PushSuscripcion.deleteMany({ usuarioId: id }),
      UsoFotoAgenda.deleteMany({ usuarioId: id }),
      Sesion.deleteMany({ usuarioId: id }),
      ActividadSeguridad.deleteMany({ usuarioId: id }),
      Consulta.deleteMany({ usuarioId: id }),
    ]);
    await Usuario.deleteOne({ _id: u._id });
    res.json({ ok: true });
  } catch (e) {
    console.error("Error al eliminar la cuenta:", e);
    res.status(500).json({ error: "No se pudo eliminar la cuenta. Probá de nuevo." });
  }
});

export default router;
