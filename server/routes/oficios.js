import express from "express";
import crypto from "crypto";
import mongoose from "mongoose";
import Oficio from "../models/Oficio.js";
import Usuario from "../models/Usuario.js";
import { identificar, requiereUsuario, limitar } from "../utils/auth.js";
import { ownersExcluidos, ownerExcluido } from "../utils/exclusiones.js";
import { ahoraArgentina } from "../utils/fechas.js";
import { declaracionPendiente } from "../utils/perfil.js";
import { RUBROS, GRUPOS_RUBROS, RUBRO_IDS } from "../utils/rubros.js";
import { anotarEvento } from "../utils/estadisticas.js";
import { sanearOficio, textoBusqueda, normalizar, oficioPublico, oficioDelDueno, estadoOficio, enlaceWhatsapp, condicionesZona, puntajeFicha, CAMPOS_FORMULARIO } from "../utils/oficios.js";

const router = express.Router();
router.use(identificar);

const POR_PAGINA = 20;
const hoy = () => ahoraArgentina().fecha;
const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Una ficha se ve en listados solo si está activa (ni pausada ni vencida) y su dueño no la sacó de las búsquedas
function filtroVisible(h) {
  return {
    status: "active", pendientePago: { $ne: true }, apareceEnBusquedas: { $ne: false }, ocultaPorEquipo: { $ne: true },
    $or: [{ expiresAt: null }, { expiresAt: "" }, { expiresAt: { $exists: false } }, { expiresAt: { $gte: h } }],
  };
}
const esVisible = (o, h) => o && estadoOficio(o, h) === "activa" && o.apareceEnBusquedas !== false && o.ocultaPorEquipo !== true;

// "Dueño: @usuario": solo si el dueño lo activó para esta ficha Y su perfil es visible
async function usuariosDeFichas(lista) {
  const ids = [...new Set(lista.filter((o) => o.duenoEnFicha && mongoose.isValidObjectId(o.ownerId)).map((o) => o.ownerId))];
  const mapa = new Map();
  if (ids.length) {
    const us = await Usuario.find({ _id: { $in: ids }, "privacidad.perfilVisible": { $ne: false }, usuario: { $gt: "" } }).select("usuario").lean();
    us.forEach((u) => mapa.set(String(u._id), u.usuario));
  }
  return mapa;
}

async function miFicha(req, res) {
  const o = await Oficio.findOne({ id: String(req.params.id) });
  if (!o || o.ownerId !== String(req.actor.usuario._id)) { res.status(404).json({ error: "No encontramos esa ficha." }); return null; }
  return o;
}

// GET /api/oficios/rubros → lista de rubros (para quien quiera pedirla al servidor; la web trae su copia)
router.get("/rubros", (req, res) => res.json({ grupos: GRUPOS_RUBROS, rubros: RUBROS }));

// GET /api/oficios/mio → MI ficha (con lo privado: número, estado, vencimiento, privacidad) o null si todavía no tengo
router.get("/mio", requiereUsuario, async (req, res) => {
  try {
    const o = await Oficio.findOne({ ownerId: String(req.actor.usuario._id) });
    res.json({ oficio: o ? oficioDelDueno(o.toObject(), hoy()) : null });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo cargar tu ficha." });
  }
});

// GET /api/oficios?rubro=&q=&provinciaId=&departamentoId=&localidadId=&pagina=
// Listado público de a 20 (carga progresiva). Una persona con varios rubros aparece en la búsqueda de cada uno, sin duplicarse.
router.get("/", limitar("oficios-lista", 240, 10 * 60 * 1000), async (req, res) => {
  try {
    const h = hoy();
    const { rubro, q, provinciaId, departamentoId, localidadId } = req.query;
    // Fase 8: no se muestran cuentas suspendidas ni personas bloqueadas (en ningún sentido)
    const filtro = { ...filtroVisible(h), ownerId: { $nin: await ownersExcluidos(req) } };
    const y = [];
    if (rubro !== undefined && rubro !== "") {
      if (!RUBRO_IDS.has(String(rubro))) return res.status(400).json({ error: "Ese rubro no existe." });
      y.push({ rubros: String(rubro) });
    }
    const texto = normalizar(String(q ?? "")).slice(0, 60);
    if (texto.length >= 2) y.push({ textoBusqueda: { $regex: esc(texto) } });
    if (provinciaId !== undefined && provinciaId !== "") { if (!/^\d{2}$/.test(String(provinciaId))) return res.status(400).json({ error: "Provincia inválida." }); y.push({ "localidad.provinciaId": String(provinciaId) }); }
    if (departamentoId !== undefined && departamentoId !== "") { if (!/^\d{5}$/.test(String(departamentoId))) return res.status(400).json({ error: "Departamento inválido." }); y.push({ "localidad.departamentoId": String(departamentoId) }); }
    if (localidadId !== undefined && localidadId !== "") { if (!/^\d{5,12}$/.test(String(localidadId))) return res.status(400).json({ error: "Localidad inválida." }); y.push({ "localidad.localidadId": String(localidadId) }); }
    y.push(...condicionesZona(req.query)); // zona elegida en Inicio, por nombre
    const match = y.length ? { $and: [filtro, ...y] } : filtro;
    const orden = req.query.orden === "recientes" ? "recientes" : "recomendados";
    const pagina = Math.min(50, Math.max(1, parseInt(req.query.pagina, 10) || 1));

    const [total, filas] = await Promise.all([
      Oficio.countDocuments(match),
      Oficio.aggregate([
        { $match: match },
        { $addFields: { _disp: { $cond: [{ $and: [{ $eq: ["$disponible", true] }, { $eq: ["$disponibleEl", h] }] }, 1, 0] } } }, // los que marcaron "Disponible hoy" van primero
        { $addFields: { _pts: { $add: [
          { $multiply: ["$_disp", 3] }, { $cond: [{ $gt: [{ $strLenCP: { $ifNull: ["$logo", ""] } }, 0] }, 2, 0] },
          { $min: [3, { $size: { $ifNull: ["$fotos", []] } }] }, { $cond: [{ $eq: [{ $size: { $ifNull: ["$weekHours", []] } }, 7] }, 1, 0] },
          { $cond: [{ $gte: [{ $strLenCP: { $ifNull: ["$desc", ""] } }, 80] }, 1, 0] }, { $cond: [{ $and: [{ $gt: [{ $strLenCP: { $ifNull: ["$whatsapp", ""] } }, 0] }, { $eq: ["$mostrarWhatsapp", true] }] }, 1, 0] },
        ] } } },
        { $sort: orden === "recientes" ? { _disp: -1, updatedAt: -1, _id: 1 } : { _pts: -1, updatedAt: -1, _id: 1 } },
        { $skip: (pagina - 1) * POR_PAGINA }, { $limit: POR_PAGINA },
      ]),
    ]);
    const duenos = await usuariosDeFichas(filas);
    res.json({
      oficios: filas.map((o) => ({ ...oficioPublico(o, h, o.duenoEnFicha ? duenos.get(o.ownerId) || null : null), recomendado: puntajeFicha(o, h) >= 6 })),
      total, pagina, hayMas: pagina * POR_PAGINA < total,
    });
  } catch (e) {
    console.error("Error al listar oficios:", e);
    res.status(500).json({ error: "No se pudieron cargar los oficios." });
  }
});

// GET /api/oficios/:id → ficha pública (404 si está pausada, vencida, eliminada u oculta de las búsquedas)
router.get("/:id", limitar("oficios-ficha", 240, 10 * 60 * 1000), async (req, res) => {
  try {
    const h = hoy();
    const o = await Oficio.findOne({ id: String(req.params.id) }).lean();
    if (!esVisible(o, h) || (await ownerExcluido(req, o.ownerId))) return res.status(404).json({ error: "Esta ficha ya no está disponible." });
    const duenos = await usuariosDeFichas([o]);
    anotarEvento(req, o.id, "visita", o.ownerId); // solo una cantidad para el panel del dueño; no se guarda quién fue
    res.json({ oficio: oficioPublico(o, h, o.duenoEnFicha ? duenos.get(o.ownerId) || null : null) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo cargar la ficha." });
  }
});

// POST /api/oficios/:id/contacto   { mensaje }  → { url } enlace oficial de WhatsApp con el mensaje inicial.
// El número NO viaja en los listados: se entrega recién cuando la persona toca el botón (así no se puede juntar en masa).
// Mi Zona no envía ningún mensaje: solo abre el chat con el texto, que la persona revisa y puede cambiar antes de mandarlo.
router.post("/:id/contacto", limitar("oficio-contacto", 40, 3600 * 1000), async (req, res) => {
  try {
    const h = hoy();
    const o = await Oficio.findOne({ id: String(req.params.id) }).lean();
    if (!esVisible(o, h) || (await ownerExcluido(req, o.ownerId)) || !o.whatsapp || o.mostrarWhatsapp !== true) return res.status(404).json({ error: "Esta ficha no tiene WhatsApp disponible." });
    const url = enlaceWhatsapp(o.whatsapp, req.body?.mensaje);
    if (!url) return res.status(404).json({ error: "Esta ficha no tiene WhatsApp disponible." });
    anotarEvento(req, o.id, "contacto", o.ownerId);
    res.json({ url });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo abrir el contacto." });
  }
});

// POST /api/oficios → crear y ACTIVAR mi ficha (una por persona). Queda PENDIENTE: no se muestra hasta que la persona empiece su mes gratis o compre un plan (Fase 9, POST /api/suscripcion/mes-gratis y /compra).
// ENGANCHE Fase 6: la web muestra el paso de "compartir" después de esta respuesta.
router.post("/", requiereUsuario, limitar("oficio-crear", 10, 3600 * 1000), async (req, res) => {
  try {
    const u = req.actor.usuario;
    if (declaracionPendiente(u)) return res.status(403).json({ error: "Primero completá tu cuenta (18 años o más, términos y localidad)." });
    const ownerId = String(u._id);
    if (await Oficio.exists({ ownerId })) return res.status(409).json({ error: "Ya tenés una ficha de oficios. Editala o sumale rubros.", codigo: "ya_tiene" });
    const { datos, error } = sanearOficio(req.body);
    if (error) return res.status(400).json({ error });
    const creada = await Oficio.create({ ...datos, id: crypto.randomBytes(8).toString("hex"), ownerId, status: "active", pendientePago: true, expiresAt: null, suscripcion: { plan: null, origen: null }, textoBusqueda: textoBusqueda(datos) });
    res.status(201).json({ oficio: oficioDelDueno(creada.toObject(), hoy()) });
  } catch (e) {
    if (e?.code === 11000) return res.status(409).json({ error: "Ya tenés una ficha de oficios. Editala o sumale rubros.", codigo: "ya_tiene" });
    console.error("Error al crear la ficha de oficios:", e);
    res.status(500).json({ error: "No se pudo guardar tu ficha. Probá de nuevo." });
  }
});

// PUT /api/oficios/:id → editar mi ficha (solo el formulario; el estado, el vencimiento y el dueño no se tocan desde acá).
// Lo que no se manda queda como estaba, y todo se vuelve a revisar completo.
router.put("/:id", requiereUsuario, limitar("oficio-editar", 60, 3600 * 1000), async (req, res) => {
  try {
    const o = await miFicha(req, res); if (!o) return;
    const actual = o.toObject();
    const mezcla = {};
    for (const k of CAMPOS_FORMULARIO) mezcla[k] = Object.prototype.hasOwnProperty.call(req.body || {}, k) ? req.body[k] : actual[k];
    const { datos, error } = sanearOficio(mezcla);
    if (error) return res.status(400).json({ error });
    o.set({ ...datos, textoBusqueda: textoBusqueda(datos) });
    await o.save();
    res.json({ oficio: oficioDelDueno(o.toObject(), hoy()) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo guardar tu ficha. Probá de nuevo." });
  }
});

// PUT /api/oficios/:id/estado   { status: "active" | "paused" } → pausar (deja de verse, no se borra nada) o volver a activar
router.put("/:id/estado", requiereUsuario, limitar("oficio-estado", 60, 3600 * 1000), async (req, res) => {
  try {
    const o = await miFicha(req, res); if (!o) return;
    const s = req.body?.status;
    if (s !== "active" && s !== "paused") return res.status(400).json({ error: "Estado inválido." });
    o.status = s;
    await o.save();
    res.json({ oficio: oficioDelDueno(o.toObject(), hoy()) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo guardar." });
  }
});

// PUT /api/oficios/:id/disponibilidad   { disponible: true | false }  → "Disponible hoy" / "Ocupado" con un toque
router.put("/:id/disponibilidad", requiereUsuario, limitar("oficio-disp", 120, 3600 * 1000), async (req, res) => {
  try {
    const o = await miFicha(req, res); if (!o) return;
    if (typeof req.body?.disponible !== "boolean") return res.status(400).json({ error: "Elegí Disponible hoy u Ocupado." });
    o.disponible = req.body.disponible;
    o.disponibleEl = hoy();
    await o.save();
    res.json({ oficio: oficioDelDueno(o.toObject(), hoy()) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo guardar." });
  }
});

// PUT /api/oficios/:id/dueno   { enPerfil?, enFicha? } → igual que en negocios: dos opciones independientes que solo cambia el dueño
router.put("/:id/dueno", requiereUsuario, limitar("oficio-dueno", 60, 3600 * 1000), async (req, res) => {
  try {
    const o = await miFicha(req, res); if (!o) return;
    if (typeof req.body?.enPerfil !== "boolean" && typeof req.body?.enFicha !== "boolean") return res.status(400).json({ error: "No hay nada para cambiar." });
    if (typeof req.body.enPerfil === "boolean") o.duenoEnPerfil = req.body.enPerfil;
    if (typeof req.body.enFicha === "boolean") o.duenoEnFicha = req.body.enFicha;
    await o.save();
    res.json({ duenoEnPerfil: !!o.duenoEnPerfil, duenoEnFicha: !!o.duenoEnFicha });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo guardar." });
  }
});

// PUT /api/oficios/:id/privacidad   { mostrarWhatsapp?, apareceEnBusquedas? }
router.put("/:id/privacidad", requiereUsuario, limitar("oficio-privacidad", 60, 3600 * 1000), async (req, res) => {
  try {
    const o = await miFicha(req, res); if (!o) return;
    const { mostrarWhatsapp, apareceEnBusquedas } = req.body || {};
    if (typeof mostrarWhatsapp !== "boolean" && typeof apareceEnBusquedas !== "boolean") return res.status(400).json({ error: "No hay nada para cambiar." });
    if (mostrarWhatsapp === true && !o.whatsapp) return res.status(400).json({ error: "Primero cargá tu número de WhatsApp en tu ficha." });
    if (typeof mostrarWhatsapp === "boolean") o.mostrarWhatsapp = mostrarWhatsapp;
    if (typeof apareceEnBusquedas === "boolean") o.apareceEnBusquedas = apareceEnBusquedas;
    await o.save();
    res.json({ mostrarWhatsapp: o.mostrarWhatsapp === true, apareceEnBusquedas: o.apareceEnBusquedas !== false });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo guardar." });
  }
});

// DELETE /api/oficios/:id → eliminar mi ficha para siempre (la web pide confirmación antes). Desaparece de búsquedas, perfil y favoritos.
router.delete("/:id", requiereUsuario, limitar("oficio-borrar", 30, 3600 * 1000), async (req, res) => {
  try {
    const o = await miFicha(req, res); if (!o) return;
    await Oficio.deleteOne({ _id: o._id });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo eliminar la ficha." });
  }
});

// POST /api/oficios/:id/compartido → el dueño completó el menú de compartir tras activar (Fase 6).
// Solo guarda CUÁNDO: no prueba que el mensaje llegó a alguien, y no se usa para dar ni quitar nada.
router.post("/:id/compartido", requiereUsuario, limitar("oficio-compartido", 30, 3600 * 1000), async (req, res) => {
  try {
    const f = await miFicha(req, res);
    if (!f) return;
    const cuando = new Date();
    await Oficio.updateOne({ id: f.id }, { $set: { compartioEn: cuando } }, { timestamps: false });
    res.json({ compartioEn: cuando });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo guardar." });
  }
});

export default router;
