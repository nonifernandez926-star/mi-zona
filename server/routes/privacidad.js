import { fotosDeLaCuenta, borrarDatosExternos } from "../utils/borradoDatos.js";
import express from "express";
import Usuario from "../models/Usuario.js";
import Business from "../models/Business.js";
import Oficio from "../models/Oficio.js";
import Alquiler from "../models/Alquiler.js";
import Publicacion from "../models/Publicacion.js";
import AgendaItem from "../models/AgendaItem.js";
import PushSuscripcion from "../models/PushSuscripcion.js";
import UsoFotoAgenda from "../models/UsoFotoAgenda.js";
import Evento from "../models/Evento.js";
import Sesion from "../models/Sesion.js";
import Consulta from "../models/Consulta.js";
import Denuncia from "../models/Denuncia.js";
import Bloqueo from "../models/Bloqueo.js";
import Medida from "../models/Medida.js";
import crypto from "crypto";
import ActividadSeguridad from "../models/ActividadSeguridad.js";
import { identificar, requiereUsuario, verificarAccessTokenGoogle, limitar } from "../utils/auth.js";
import { verificarContrasena } from "../utils/contrasenas.js";
import { huellaAutor } from "../utils/negocios.js";
import { permitir } from "../utils/limitador.js";
import Compra from "../models/Compra.js";
import Invitacion from "../models/Invitacion.js";

const router = express.Router();
router.use(identificar, requiereUsuario);

const PREFS = ["ubicacionBusqueda", "chatsBusqueda", "iaAgenda", "perfilVisible"];
const prefsDe = (u) => Object.fromEntries(PREFS.map((k) => [k, u.privacidad?.[k] !== false]));
const uid = (req) => String(req.actor.usuario._id);

// GET /api/privacidad → todo lo que Mi Zona tiene guardado de esta cuenta (cantidades), más los controles actuales
router.get("/", async (req, res) => {
  try {
    const u = req.actor.usuario;
    const id = uid(req);
    const [negocios, oficio, alquileres, agenda, tareas, dispositivosPush, resenas, publicacionesComunidad] = await Promise.all([
      Business.find({ ownerId: id }).select("id name status pendientePago expiresAt duenoEnPerfil duenoEnFicha mostrarWhatsapp apareceEnBusquedas"),
      Oficio.findOne({ ownerId: id }).select("id nombre status pendientePago expiresAt duenoEnPerfil duenoEnFicha mostrarWhatsapp apareceEnBusquedas whatsapp"),
      Alquiler.find({ ownerId: id }).select("id nombre status pendientePago expiresAt duenoEnPerfil duenoEnFicha mostrarWhatsapp apareceEnBusquedas whatsapp").sort({ createdAt: 1 }),
      AgendaItem.countDocuments({ usuarioId: id, tipo: "evento" }),
      AgendaItem.countDocuments({ usuarioId: id, tipo: "tarea" }),
      PushSuscripcion.countDocuments({ usuarioId: id }),
      Business.aggregate([{ $unwind: "$reviews" }, { $match: { "reviews.autorUid": huellaAutor(id) } }, { $count: "n" }]),
      Publicacion.countDocuments({ ownerId: id }),
    ]);
    res.json({
      cuenta: { email: u.email, nombre: u.nombre, proveedor: u.proveedor, creadaEn: u.createdAt, conClave: !!(u.passwordHash || u.claveZona) },
      sesion: { venceEn: req.tokenExp ? new Date(req.tokenExp * 1000).toISOString() : null },
      negocios: negocios.map((n) => ({ id: n.id, nombre: n.name, estado: n.pendientePago ? "pendiente" : n.status, venceEl: n.expiresAt, duenoEnPerfil: !!n.duenoEnPerfil, duenoEnFicha: !!n.duenoEnFicha, mostrarWhatsapp: n.mostrarWhatsapp !== false, apareceEnBusquedas: n.apareceEnBusquedas !== false })),
      oficios: oficio ? [{ id: oficio.id, nombre: oficio.nombre, estado: oficio.pendientePago ? "pendiente" : oficio.status === "paused" ? "pausada" : "activa", venceEl: oficio.expiresAt || null, duenoEnPerfil: !!oficio.duenoEnPerfil, duenoEnFicha: !!oficio.duenoEnFicha, mostrarWhatsapp: oficio.mostrarWhatsapp === true, apareceEnBusquedas: oficio.apareceEnBusquedas !== false, tieneWhatsapp: !!oficio.whatsapp }] : [],
      alquileres: alquileres.map((a) => ({ id: a.id, nombre: a.nombre, estado: a.pendientePago ? "pendiente" : a.status === "paused" ? "pausada" : "activa", venceEl: a.expiresAt || null, duenoEnPerfil: !!a.duenoEnPerfil, duenoEnFicha: !!a.duenoEnFicha, mostrarWhatsapp: a.mostrarWhatsapp === true, apareceEnBusquedas: a.apareceEnBusquedas !== false, tieneWhatsapp: !!a.whatsapp })),
      agenda: { eventos: agenda, tareas },
      dispositivosPush,
      resenas: resenas[0]?.n || 0,
      publicacionesComunidad,
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
    const [negocios, oficioPropio, alquileresPropios, agenda, push, consultas, publicaciones, misDenuncias, misBloqueos, misMedidas] = await Promise.all([
      Business.find({ ownerId: id }),
      Oficio.findOne({ ownerId: id }).lean(),
      Alquiler.find({ ownerId: id }).lean(),
      AgendaItem.find({ usuarioId: id }).lean(),
      PushSuscripcion.find({ usuarioId: id }).select("createdAt").lean(),
      Consulta.find({ usuarioId: id }).select("motivo asunto mensaje estado respuesta createdAt -_id").lean(),
      Publicacion.find({ ownerId: id }).lean(),
      Denuncia.find({ denuncianteId: id }).select("objetoTipo motivo detalle estado createdAt -_id").lean(),
      Bloqueo.find({ bloqueadorId: id }).select("usuario nombre createdAt -_id").lean(),
      Medida.find({ usuarioId: id }).select("tipo motivo desde hasta permanente estado apelacion -_id").lean(),
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
      perfil: {
        descripcion: u.descripcion || "", foto: u.foto || "", localidad: u.localidad?.localidadId ? { provincia: u.localidad.provincia, departamento: u.localidad.departamento, localidad: u.localidad.localidad } : null,
        declaroSerMayorDe18: !!u.mayor18, fechaDeLaDeclaracion: u.mayor18Fecha || null, terminosAceptadosEl: u.terminosAceptadosEn || null,
      },
      preferenciasDePrivacidad: prefsDe(u),
      suscripcion: {
        mesGratisUsado: { negocio: u.mesGratisUsado?.negocio || null, oficio: u.mesGratisUsado?.oficio || null, alquiler: u.mesGratisUsado?.alquiler || null },
        codigoDeInvitacion: u.codigoInvitacion || null, diasDeInvitacionDisponibles: u.diasDisponibles || 0,
        compras: (await Compra.find({ usuarioId: id }).select("productoId plan meses venceDespues createdAt -_id").lean()),
      },
      negocios: negocios.map((n) => {
        const o = n.toObject();
        // se incluye lo que cargó el dueño; los datos internos de pagos no
        const { _id, __v, ownerId, suscripcion, geoIntentos, ...resto } = o;
        return { ...resto, suscripcion: { plan: suscripcion?.plan || null, origen: suscripcion?.origen || null }, reviews: (o.reviews || []).map(({ autorUid, ...r }) => r) };
      }),
      fichaDeOficios: oficioPropio ? (({ _id, __v, ownerId, textoBusqueda, ...r }) => r)(oficioPropio) : null,
      fichasDeAlquiler: alquileresPropios.map(({ _id, __v, ownerId, textoBusqueda, ...r }) => r),
      publicacionesDeComunidad: publicaciones.map(({ _id, __v, ownerId, textoBusqueda, borrarEn, departamentoId, ...r }) => r),
      agenda: agenda.map(({ _id, __v, usuarioId, ...r }) => r),
      reseñasQueEscribí: misResenas,
      dispositivosConNotificaciones: push.length,
      consultasASoporte: consultas,
      denunciasQueHice: misDenuncias,
      personasQueBloqueé: misBloqueos,
      avisosDelEquipoSobreMiCuenta: misMedidas,
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
    if (!(await permitir(`borrar-cuenta|${id}`, 5, 3600 * 1000))) return res.status(429).json({ error: "Demasiados intentos. Probá de nuevo en un rato." });
    if (req.body?.confirmacion !== "ELIMINAR") return res.status(400).json({ error: "Escribí ELIMINAR para confirmar." });

    if (u.passwordHash || u.claveZona) {
      if (!(await verificarContrasena(String(req.body?.password || ""), u.passwordHash || u.claveZona))) return res.status(401).json({ error: "La contraseña no es correcta." });
    } else {
      let datos;
      try { datos = await verificarAccessTokenGoogle(req.body?.accessToken); } catch { return res.status(401).json({ error: "No pudimos confirmar tu cuenta de Google. Probá de nuevo." }); }
      if (datos.googleId !== u.googleId) return res.status(403).json({ error: "Esa no es la cuenta de Google con la que entraste." });
    }

    const negocios = await Business.find({ ownerId: id }).select("id name");
    if (negocios.length && req.body?.eliminarNegocios !== true) {
      return res.status(409).json({ error: "negocios_pendientes", mensaje: "Tu cuenta tiene negocios. Confirmá que también querés eliminarlos.", negocios: negocios.map((n) => n.name) });
    }

    // Lo que vive afuera (fotos en Cloudinary y chats en Mi Asistente) se junta ahora y se borra al final
    const fotos = await fotosDeLaCuenta(id, u);
    const sesionClienteId = u.sesionClienteId || "";
    const huella = huellaAutor(id);
    await Business.updateMany({ "reviews.autorUid": huella }, { $pull: { reviews: { autorUid: huella } } });
    if (negocios.length) {
      const ids = negocios.map((n) => n.id);
      await Evento.deleteMany({ bizId: { $in: ids } });
      await Business.deleteMany({ ownerId: id });
    }
    if (u.sesionClienteId) await Evento.deleteMany({ clienteId: u.sesionClienteId });
    await Promise.all([
      Oficio.deleteMany({ ownerId: id }),
      Alquiler.deleteMany({ ownerId: id }),
      Invitacion.deleteMany({ $or: [{ invitadorId: id }, { invitadoId: id }] }),
      Publicacion.deleteMany({ ownerId: id }),
      AgendaItem.deleteMany({ usuarioId: id }),
      PushSuscripcion.deleteMany({ usuarioId: id }),
      UsoFotoAgenda.deleteMany({ usuarioId: id }),
      Sesion.deleteMany({ usuarioId: id }),
      ActividadSeguridad.deleteMany({ usuarioId: id }),
      Consulta.deleteMany({ usuarioId: id }),
      Bloqueo.deleteMany({ $or: [{ bloqueadorId: id }, { bloqueadoId: id }] }),
      Medida.deleteMany({ usuarioId: id }),
      Denuncia.deleteMany({ duenoId: id }), // denuncias sobre esta cuenta: ya no hay nada que moderar
    ]);
    // las denuncias que ella hizo se conservan sin su identidad (el equipo puede estar revisándolas)
    await Denuncia.updateMany({ denuncianteId: id }, { $set: { denuncianteId: `eliminado-${crypto.randomBytes(6).toString("hex")}` } });
    // Los comprobantes de compra de Google Play se conservan sin su identidad (sirven ante un reclamo o reembolso y para la contabilidad)
    await Compra.updateMany({ usuarioId: id }, { $set: { usuarioId: `eliminado-${crypto.randomBytes(6).toString("hex")}` } });
    await Usuario.deleteOne({ _id: u._id });
    // Si Mi Asistente o Cloudinary no responden, queda un pendiente sin datos personales que se reintenta solo
    const externos = await borrarDatosExternos({ sesionClienteId, urls: fotos });
    res.json({ ok: true, pendienteExterno: externos.pendiente });
  } catch (e) {
    console.error("Error al eliminar la cuenta:", e);
    res.status(500).json({ error: "No se pudo eliminar la cuenta. Probá de nuevo." });
  }
});

export default router;
