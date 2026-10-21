import express from "express";
import crypto from "crypto";
import mongoose from "mongoose";
import Alquiler from "../models/Alquiler.js";
import Usuario from "../models/Usuario.js";
import { anotarEvento } from "../utils/estadisticas.js";
import { identificar, requiereUsuario, limitar } from "../utils/auth.js";
import { ownersExcluidos, ownerExcluido } from "../utils/exclusiones.js";
import { ahoraArgentina } from "../utils/fechas.js";
import { declaracionPendiente } from "../utils/perfil.js";
import {
  CATEGORIAS, CATEGORIA_IDS, ETIQUETA_TIPO, ESTADOS_ARTICULO, LIMITES, CAMPOS_FORMULARIO,
  sanearAlquiler, sanearArticulo, nuevoArticulo, textoBusqueda, normalizar, estadoFicha, alquilerPublico, alquilerDelDueno, enlaceWhatsapp,
} from "../utils/alquileres.js";

const router = express.Router();
router.use(identificar);

const POR_PAGINA = 20;
const hoy = () => ahoraArgentina().fecha;
const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function filtroVisible(h) {
  return {
    status: "active", pendientePago: { $ne: true }, apareceEnBusquedas: { $ne: false }, ocultaPorEquipo: { $ne: true },
    $or: [{ expiresAt: null }, { expiresAt: "" }, { expiresAt: { $exists: false } }, { expiresAt: { $gte: h } }],
  };
}
const esVisible = (a, h) => a && estadoFicha(a, h) === "activa" && a.apareceEnBusquedas !== false && a.ocultaPorEquipo !== true;

async function usuariosDeFichas(lista) {
  const ids = [...new Set(lista.filter((a) => a.duenoEnFicha && mongoose.isValidObjectId(a.ownerId)).map((a) => a.ownerId))];
  const mapa = new Map();
  if (ids.length) {
    const us = await Usuario.find({ _id: { $in: ids }, "privacidad.perfilVisible": { $ne: false }, usuario: { $gt: "" } }).select("usuario").lean();
    us.forEach((u) => mapa.set(String(u._id), u.usuario));
  }
  return mapa;
}

// Devuelve MI ficha (con la ficha completa para poder modificarla) o responde 404. Solo el dueño pasa.
async function miFicha(req, res) {
  const a = await Alquiler.findOne({ id: String(req.params.id) });
  if (!a || a.ownerId !== String(req.actor.usuario._id)) { res.status(404).json({ error: "No encontramos esa ficha." }); return null; }
  return a;
}
const tocar = (a) => { a.actualizadoEn = new Date(); };

// GET /api/alquileres/categorias → categorías y tipos (la web trae su copia; esto es por si hace falta pedirlas)
router.get("/categorias", (req, res) => res.json({ categorias: CATEGORIAS }));

// GET /api/alquileres/mios → TODAS mis fichas de alquiler (con lo privado)
router.get("/mios", requiereUsuario, async (req, res) => {
  try {
    const lista = await Alquiler.find({ ownerId: String(req.actor.usuario._id) }).sort({ createdAt: 1 }).lean();
    const h = hoy();
    res.json({ alquileres: lista.map((a) => alquilerDelDueno(a, h)), maximo: LIMITES.fichas });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudieron cargar tus fichas." });
  }
});

// GET /api/alquileres?categoria=&tipo=&q=&provinciaId=&departamentoId=&localidadId=&dormitorios=&amoblado=&pagina=
// Listado público de a 20. Los filtros de vivienda (dormitorios, amoblado) solo valen en la categoría "viviendas".
router.get("/", limitar("alquileres-lista", 240, 10 * 60 * 1000), async (req, res) => {
  try {
    const h = hoy();
    const { categoria, tipo, q, provinciaId, departamentoId, localidadId, dormitorios, amoblado } = req.query;
    const y = [];
    if (categoria !== undefined && categoria !== "") {
      if (!CATEGORIA_IDS.has(String(categoria))) return res.status(400).json({ error: "Esa categoría no existe." });
      y.push({ categoria: String(categoria) });
    }
    if (tipo !== undefined && tipo !== "") {
      if (!ETIQUETA_TIPO[String(tipo)]) return res.status(400).json({ error: "Ese tipo no existe." });
      y.push({ tipos: String(tipo) });
    }
    if (categoria === "viviendas") {
      if (dormitorios !== undefined && dormitorios !== "") { const n = parseInt(dormitorios, 10); if (!(n >= 0 && n <= 20)) return res.status(400).json({ error: "Dormitorios inválidos." }); y.push({ "vivienda.dormitorios": { $gte: n } }); }
      if (amoblado === "true") y.push({ "vivienda.amoblado": true });
    }
    const texto = normalizar(String(q ?? "")).slice(0, 60);
    if (texto.length >= 2) y.push({ textoBusqueda: { $regex: esc(texto) } });
    if (provinciaId !== undefined && provinciaId !== "") { if (!/^\d{2}$/.test(String(provinciaId))) return res.status(400).json({ error: "Provincia inválida." }); y.push({ "localidad.provinciaId": String(provinciaId) }); }
    if (departamentoId !== undefined && departamentoId !== "") { if (!/^\d{5}$/.test(String(departamentoId))) return res.status(400).json({ error: "Departamento inválido." }); y.push({ "localidad.departamentoId": String(departamentoId) }); }
    if (localidadId !== undefined && localidadId !== "") { if (!/^\d{5,12}$/.test(String(localidadId))) return res.status(400).json({ error: "Localidad inválida." }); y.push({ "localidad.localidadId": String(localidadId) }); }
    // Fase 8: no se muestran cuentas suspendidas ni personas bloqueadas (en ningún sentido)
    const filtro = { ...filtroVisible(h), ownerId: { $nin: await ownersExcluidos(req) } };
    const match = y.length ? { $and: [filtro, ...y] } : filtro;
    const pagina = Math.min(50, Math.max(1, parseInt(req.query.pagina, 10) || 1));
    const [total, filas] = await Promise.all([
      Alquiler.countDocuments(match),
      Alquiler.find(match).sort({ actualizadoEn: -1, _id: 1 }).skip((pagina - 1) * POR_PAGINA).limit(POR_PAGINA).lean(),
    ]);
    const duenos = await usuariosDeFichas(filas);
    const ahora = new Date();
    res.json({
      alquileres: filas.map((a) => { const p = alquilerPublico(a, a.duenoEnFicha ? duenos.get(a.ownerId) || null : null, ahora); delete p.articulos; return p; }), // el listado no lleva los artículos: se ven al abrir la ficha
      total, pagina, hayMas: pagina * POR_PAGINA < total,
    });
  } catch (e) {
    console.error("Error al listar alquileres:", e);
    res.status(500).json({ error: "No se pudieron cargar los alquileres." });
  }
});

// GET /api/alquileres/:id → ficha pública (404 si está pausada, vencida, eliminada u oculta de las búsquedas)
router.get("/:id", limitar("alquileres-ficha", 240, 10 * 60 * 1000), async (req, res) => {
  try {
    const a = await Alquiler.findOne({ id: String(req.params.id) }).lean();
    if (!esVisible(a, hoy()) || (await ownerExcluido(req, a.ownerId))) return res.status(404).json({ error: "Esta ficha ya no está disponible." });
    const duenos = await usuariosDeFichas([a]);
    anotarEvento(req, a.id, "visita", a.ownerId); // solo una cantidad para el panel del dueño; no se guarda quién fue
    res.json({ alquiler: alquilerPublico(a, a.duenoEnFicha ? duenos.get(a.ownerId) || null : null) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo cargar la ficha." });
  }
});

// POST /api/alquileres/:id/contacto  { mensaje } → { url } (el número no viaja en los listados; Mi Zona no envía nada)
router.post("/:id/contacto", limitar("alquiler-contacto", 40, 3600 * 1000), async (req, res) => {
  try {
    const a = await Alquiler.findOne({ id: String(req.params.id) }).lean();
    if (!esVisible(a, hoy()) || (await ownerExcluido(req, a.ownerId)) || !a.whatsapp || a.mostrarWhatsapp !== true) return res.status(404).json({ error: "Esta ficha no tiene WhatsApp disponible." });
    const url = enlaceWhatsapp(a.whatsapp, req.body?.mensaje);
    if (!url) return res.status(404).json({ error: "Esta ficha no tiene WhatsApp disponible." });
    anotarEvento(req, a.id, "contacto", a.ownerId);
    res.json({ url });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo abrir el contacto." });
  }
});

// POST /api/alquileres → crear y ACTIVAR una ficha con sus primeros artículos. Queda PENDIENTE: no se muestra hasta que la persona empiece su mes gratis o compre un plan (Fase 9, POST /api/suscripcion/mes-gratis y /compra).
// ENGANCHE Fase 6: la web muestra el paso de "compartir" después de esta respuesta.
router.post("/", requiereUsuario, limitar("alquiler-crear", 15, 3600 * 1000), async (req, res) => {
  try {
    const u = req.actor.usuario;
    if (declaracionPendiente(u)) return res.status(403).json({ error: "Primero completá tu cuenta (18 años o más, términos y localidad)." });
    const ownerId = String(u._id);
    if ((await Alquiler.countDocuments({ ownerId })) >= LIMITES.fichas) return res.status(409).json({ error: `Ya tenés ${LIMITES.fichas} fichas de alquiler, que es el máximo. Eliminá una para crear otra.`, codigo: "maximo" });
    const { datos, error } = sanearAlquiler(req.body);
    if (error) return res.status(400).json({ error });
    const enviados = Array.isArray(req.body?.articulos) ? req.body.articulos : [];
    if (enviados.length < 1) return res.status(400).json({ error: "Agregá al menos un artículo (lo que alquilás)." });
    if (enviados.length > LIMITES.articulos) return res.status(400).json({ error: `Podés cargar hasta ${LIMITES.articulos} artículos.` });
    const articulos = [];
    for (const x of enviados) { const r = sanearArticulo(x); if (r.error) return res.status(400).json({ error: r.error }); articulos.push(nuevoArticulo(r.datos)); }
    const creada = await Alquiler.create({ ...datos, articulos, id: crypto.randomBytes(8).toString("hex"), ownerId, status: "active", pendientePago: true, expiresAt: null, suscripcion: { plan: null, origen: null }, textoBusqueda: textoBusqueda({ ...datos, articulos }), actualizadoEn: new Date() });
    res.status(201).json({ alquiler: alquilerDelDueno(creada.toObject(), hoy()) });
  } catch (e) {
    console.error("Error al crear la ficha de alquiler:", e);
    res.status(500).json({ error: "No se pudo guardar tu ficha. Probá de nuevo." });
  }
});

// PUT /api/alquileres/:id → editar el formulario de mi ficha (los artículos, el estado y el dueño se cambian por sus propias rutas)
router.put("/:id", requiereUsuario, limitar("alquiler-editar", 60, 3600 * 1000), async (req, res) => {
  try {
    const a = await miFicha(req, res); if (!a) return;
    const actual = a.toObject();
    const mezcla = {};
    for (const k of CAMPOS_FORMULARIO) mezcla[k] = Object.prototype.hasOwnProperty.call(req.body || {}, k) ? req.body[k] : actual[k];
    const { datos, error } = sanearAlquiler(mezcla);
    if (error) return res.status(400).json({ error });
    a.set({ ...datos, textoBusqueda: textoBusqueda({ ...datos, articulos: actual.articulos }) });
    tocar(a);
    await a.save();
    res.json({ alquiler: alquilerDelDueno(a.toObject(), hoy()) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo guardar tu ficha. Probá de nuevo." });
  }
});

// PUT /api/alquileres/:id/estado  { status: "active" | "paused" }
router.put("/:id/estado", requiereUsuario, limitar("alquiler-estado", 60, 3600 * 1000), async (req, res) => {
  try {
    const a = await miFicha(req, res); if (!a) return;
    const s = req.body?.status;
    if (s !== "active" && s !== "paused") return res.status(400).json({ error: "Estado inválido." });
    a.status = s; tocar(a);
    await a.save();
    res.json({ alquiler: alquilerDelDueno(a.toObject(), hoy()) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo guardar." });
  }
});

// ---- artículos: agregar, editar, cambiar el estado con un toque y quitar. Solo el dueño de la ficha. ----

// POST /api/alquileres/:id/articulos
router.post("/:id/articulos", requiereUsuario, limitar("alquiler-art-nuevo", 120, 3600 * 1000), async (req, res) => {
  try {
    const a = await miFicha(req, res); if (!a) return;
    if (a.articulos.length >= LIMITES.articulos) return res.status(400).json({ error: `Podés cargar hasta ${LIMITES.articulos} artículos.` });
    const r = sanearArticulo(req.body); if (r.error) return res.status(400).json({ error: r.error });
    a.articulos.push(nuevoArticulo(r.datos)); tocar(a);
    a.textoBusqueda = textoBusqueda({ ...a.toObject() });
    await a.save();
    res.status(201).json({ alquiler: alquilerDelDueno(a.toObject(), hoy()) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo guardar el artículo." });
  }
});

const buscarArticulo = (a, id) => a.articulos.find((x) => x.id === String(id));

// PUT /api/alquileres/:id/articulos/:aid  (nombre, foto, precio)
router.put("/:id/articulos/:aid", requiereUsuario, limitar("alquiler-art-editar", 240, 3600 * 1000), async (req, res) => {
  try {
    const a = await miFicha(req, res); if (!a) return;
    const art = buscarArticulo(a, req.params.aid);
    if (!art) return res.status(404).json({ error: "No encontramos ese artículo." });
    const r = sanearArticulo(req.body); if (r.error) return res.status(400).json({ error: r.error });
    Object.assign(art, r.datos); tocar(a);
    a.textoBusqueda = textoBusqueda({ ...a.toObject() });
    await a.save();
    res.json({ alquiler: alquilerDelDueno(a.toObject(), hoy()) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo guardar el artículo." });
  }
});

// PUT /api/alquileres/:id/articulos/:aid/estado  { estado: "disponible" | "ocupado" | "retirado" }  → el toque
router.put("/:id/articulos/:aid/estado", requiereUsuario, limitar("alquiler-art-estado", 360, 3600 * 1000), async (req, res) => {
  try {
    const a = await miFicha(req, res); if (!a) return;
    const art = buscarArticulo(a, req.params.aid);
    if (!art) return res.status(404).json({ error: "No encontramos ese artículo." });
    if (!ESTADOS_ARTICULO.includes(req.body?.estado)) return res.status(400).json({ error: "Elegí Disponible, Ocupado o Ya no lo tengo." });
    art.estado = req.body.estado; art.estadoEl = new Date(); tocar(a);
    await a.save();
    res.json({ alquiler: alquilerDelDueno(a.toObject(), hoy()) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo guardar." });
  }
});

// POST /api/alquileres/:id/confirmar → "Todo sigue igual": renueva la fecha de confirmación de los artículos disponibles con un toque
router.post("/:id/confirmar", requiereUsuario, limitar("alquiler-confirmar", 60, 3600 * 1000), async (req, res) => {
  try {
    const a = await miFicha(req, res); if (!a) return;
    const ahora = new Date();
    a.articulos.forEach((x) => { if (x.estado !== "retirado") x.estadoEl = ahora; });
    tocar(a);
    await a.save();
    res.json({ alquiler: alquilerDelDueno(a.toObject(), hoy()) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo guardar." });
  }
});

// DELETE /api/alquileres/:id/articulos/:aid → quitar el artículo para siempre (la web pide confirmación)
router.delete("/:id/articulos/:aid", requiereUsuario, limitar("alquiler-art-borrar", 120, 3600 * 1000), async (req, res) => {
  try {
    const a = await miFicha(req, res); if (!a) return;
    if (!buscarArticulo(a, req.params.aid)) return res.status(404).json({ error: "No encontramos ese artículo." });
    a.articulos = a.articulos.filter((x) => x.id !== String(req.params.aid)); tocar(a);
    a.textoBusqueda = textoBusqueda({ ...a.toObject() });
    await a.save();
    res.json({ alquiler: alquilerDelDueno(a.toObject(), hoy()) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo quitar el artículo." });
  }
});

// PUT /api/alquileres/:id/dueno  { enPerfil?, enFicha? }
router.put("/:id/dueno", requiereUsuario, limitar("alquiler-dueno", 60, 3600 * 1000), async (req, res) => {
  try {
    const a = await miFicha(req, res); if (!a) return;
    if (typeof req.body?.enPerfil !== "boolean" && typeof req.body?.enFicha !== "boolean") return res.status(400).json({ error: "No hay nada para cambiar." });
    if (typeof req.body.enPerfil === "boolean") a.duenoEnPerfil = req.body.enPerfil;
    if (typeof req.body.enFicha === "boolean") a.duenoEnFicha = req.body.enFicha;
    await a.save();
    res.json({ duenoEnPerfil: !!a.duenoEnPerfil, duenoEnFicha: !!a.duenoEnFicha });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo guardar." });
  }
});

// PUT /api/alquileres/:id/privacidad  { mostrarWhatsapp?, apareceEnBusquedas? }
router.put("/:id/privacidad", requiereUsuario, limitar("alquiler-privacidad", 60, 3600 * 1000), async (req, res) => {
  try {
    const a = await miFicha(req, res); if (!a) return;
    const { mostrarWhatsapp, apareceEnBusquedas } = req.body || {};
    if (typeof mostrarWhatsapp !== "boolean" && typeof apareceEnBusquedas !== "boolean") return res.status(400).json({ error: "No hay nada para cambiar." });
    if (mostrarWhatsapp === true && !a.whatsapp) return res.status(400).json({ error: "Primero cargá tu número de WhatsApp en tu ficha." });
    if (typeof mostrarWhatsapp === "boolean") a.mostrarWhatsapp = mostrarWhatsapp;
    if (typeof apareceEnBusquedas === "boolean") a.apareceEnBusquedas = apareceEnBusquedas;
    await a.save();
    res.json({ mostrarWhatsapp: a.mostrarWhatsapp === true, apareceEnBusquedas: a.apareceEnBusquedas !== false });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo guardar." });
  }
});

// DELETE /api/alquileres/:id → eliminar mi ficha para siempre (la web pide confirmación antes)
router.delete("/:id", requiereUsuario, limitar("alquiler-borrar", 30, 3600 * 1000), async (req, res) => {
  try {
    const a = await miFicha(req, res); if (!a) return;
    await Alquiler.deleteOne({ _id: a._id });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo eliminar la ficha." });
  }
});

// POST /api/alquileres/:id/compartido → el dueño completó el menú de compartir tras activar (Fase 6).
// Solo guarda CUÁNDO: no prueba que el mensaje llegó a alguien, y no se usa para dar ni quitar nada.
router.post("/:id/compartido", requiereUsuario, limitar("alquiler-compartido", 30, 3600 * 1000), async (req, res) => {
  try {
    const f = await miFicha(req, res);
    if (!f) return;
    const cuando = new Date();
    await Alquiler.updateOne({ id: f.id }, { $set: { compartioEn: cuando } }, { timestamps: false });
    res.json({ compartioEn: cuando });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo guardar." });
  }
});

export default router;
