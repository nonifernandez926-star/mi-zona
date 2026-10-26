import express from "express";
import crypto from "crypto";
import Publicacion from "../models/Publicacion.js";
import { identificar, requiereUsuario, limitar } from "../utils/auth.js";
import { declaracionPendiente, localidadDe } from "../utils/perfil.js";
import { enlaceWhatsapp } from "../utils/oficios.js";
import { ownersExcluidos, ownerExcluido } from "../utils/exclusiones.js";
import { moderacionLista } from "../utils/adminAuth.js";
import {
  TIPOS, TIPO_IDS, ESTADOS_EVENTO, LIMITES, fechaAR, limpiarTextoSorteo, sanearPublicacion, prioridadAviso, textoBusqueda,
  publicacionPublica, publicacionDelAutor, rangosAR,
} from "../utils/comunidad.js";

// Comunidad (Fase 7). Publicar es GRATIS. Cada publicación se muestra solo a las personas del MISMO DEPARTAMENTO que el autor
// (con filtro por localidad dentro de él); para ver o publicar hace falta una cuenta con localidad. Todas vencen.
// La sección está APAGADA hasta que se complete la moderación (Fase 8): se enciende con COMUNIDAD_HABILITADA=true en el servidor.
const router = express.Router();
router.use(identificar);

const POR_PAGINA = 20;
const DIA = 86400000;
// Fase 8: además de COMUNIDAD_HABILITADA=true, el panel de moderación tiene que estar configurado (clave del equipo + verificación en dos pasos).
// Así Comunidad nunca queda abierta al público sin nadie que pueda atender las denuncias.
const habilitada = () => String(process.env.COMUNIDAD_HABILITADA || "").toLowerCase() === "true" && moderacionLista();

// GET /api/comunidad/estado → { habilitada }  (la web lo usa para mostrar u ocultar la sección)
router.get("/estado", (req, res) => res.json({ habilitada: habilitada() }));

router.use((req, res, next) => {
  if (!habilitada()) return res.status(403).json({ error: "Comunidad todavía no está disponible.", codigo: "no_habilitada" });
  next();
});

// Para ver o publicar: cuenta con la declaración completa y una localidad (de ahí sale el departamento)
function vecino(req, res, next) {
  const u = req.actor.usuario;
  if (declaracionPendiente(u)) return res.status(403).json({ error: "Primero completá tu cuenta (18 años o más, términos y localidad).", codigo: "cuenta_incompleta" });
  const loc = localidadDe(u);
  if (!loc) return res.status(409).json({ error: "Elegí tu localidad en tu perfil para ver y publicar en Comunidad.", codigo: "sin_localidad" });
  req.vecino = loc;
  next();
}

const esAutor = (p, req) => req.actor?.usuario && p.ownerId === String(req.actor.usuario._id);
async function miPublicacion(req, res) {
  const p = await Publicacion.findOne({ id: String(req.params.id) });
  if (!p || !esAutor(p, req)) { res.status(404).json({ error: "No encontramos esa publicación." }); return null; }
  return p;
}

// GET /api/comunidad/mias → todas MIS publicaciones (con su estado: activa, resuelta o vencida)
router.get("/mias", requiereUsuario, async (req, res) => {
  try {
    const ahora = new Date();
    const filas = await Publicacion.find({ ownerId: String(req.actor.usuario._id) }).sort({ createdAt: -1 }).limit(100).lean();
    res.json({ publicaciones: filas.map((p) => publicacionDelAutor(p, ahora)) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudieron cargar tus publicaciones." });
  }
});

// GET /api/comunidad?tipo=&localidadId=&actividad=&categoria=&vista=hoy|semana|finde&historial=1&pagina=
// Solo lo ACTIVO del departamento de quien mira. Eventos y deportes van en orden cronológico; avisos urgentes primero.
router.get("/", requiereUsuario, vecino, limitar("comunidad-lista", 240, 10 * 60 * 1000), async (req, res) => {
  try {
    const ahora = new Date();
    const { tipo, localidadId, actividad, categoria, vista, historial } = req.query;
    // Fase 8: sin lo que el equipo ocultó, ni lo de cuentas suspendidas o personas bloqueadas (en cualquier sentido)
    const y = [{ departamentoId: req.vecino.departamentoId }, { ocultaPorEquipo: { $ne: true } }, { ownerId: { $nin: await ownersExcluidos(req) } }];
    if (tipo !== undefined && tipo !== "") { if (!TIPOS[String(tipo)]) return res.status(400).json({ error: "Ese tipo no existe." }); y.push({ tipo: String(tipo) }); }
    if (localidadId) {
      if (!/^\d{5,12}$/.test(String(localidadId))) return res.status(400).json({ error: "Localidad inválida." });
      y.push({ "localidad.localidadId": String(localidadId) });
    }
    if (actividad) y.push({ "datos.actividad": String(actividad).slice(0, 20) });
    if (categoria) y.push({ "datos.categoria": String(categoria).slice(0, 20) });

    const cronologico = ["evento", "deporte", "sorteo"].includes(String(tipo || "")) || !!vista;
    let orden = { createdAt: -1, _id: 1 };
    if (historial === "1") {
      // historial: solo eventos que ya terminaron (últimos 60 días)
      y.push({ tipo: "evento" }, { expiresAt: { $lte: ahora } }, { expiresAt: { $gte: new Date(ahora.getTime() - 60 * DIA) } });
      orden = { inicioAt: -1, _id: 1 };
    } else {
      y.push({ resuelta: { $ne: true } }, { expiresAt: { $gt: ahora } });
      if (vista) {
        const r = rangosAR(ahora)[String(vista)];
        if (!r) return res.status(400).json({ error: "Vista inválida." });
        y.push({ inicioAt: { $lt: r.hasta } }, { expiresAt: { $gt: r.desde } });
      }
      if (cronologico) orden = { inicioAt: 1, _id: 1 };
      else if (String(tipo) === "aviso") orden = { prioridad: -1, createdAt: -1, _id: 1 };
    }
    const match = { $and: y };
    const pagina = Math.min(50, Math.max(1, parseInt(req.query.pagina, 10) || 1));
    const [total, filas] = await Promise.all([
      Publicacion.countDocuments(match),
      Publicacion.find(match).sort(orden).skip((pagina - 1) * POR_PAGINA).limit(POR_PAGINA).lean(),
    ]);
    res.json({ publicaciones: filas.map((p) => publicacionPublica(p, ahora)), total, pagina, hayMas: pagina * POR_PAGINA < total, departamento: req.vecino.departamento });
  } catch (e) {
    console.error("Error al listar Comunidad:", e);
    res.status(500).json({ error: "No se pudo cargar Comunidad." });
  }
});

// GET /api/comunidad/:id → detalle. Lo ve su autor y los vecinos de su departamento (con su estado: activa, resuelta o vencida)
router.get("/:id", requiereUsuario, limitar("comunidad-ficha", 240, 10 * 60 * 1000), async (req, res) => {
  try {
    const ahora = new Date();
    const p = await Publicacion.findOne({ id: String(req.params.id) }).lean();
    if (!p) return res.status(404).json({ error: "Esta publicación ya no está disponible." });
    if (esAutor(p, req)) return res.json({ publicacion: publicacionDelAutor(p, ahora), esMia: true });
    const loc = localidadDe(req.actor.usuario);
    if (!loc || loc.departamentoId !== p.departamentoId || p.ocultaPorEquipo === true || (await ownerExcluido(req, p.ownerId))) return res.status(404).json({ error: "Esta publicación ya no está disponible." });
    res.json({ publicacion: publicacionPublica(p, ahora), esMia: false });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo cargar la publicación." });
  }
});

// POST /api/comunidad/:id/contacto   { mensaje } → { url } enlace oficial de WhatsApp (solo vecinos del departamento, y solo si está activa)
router.post("/:id/contacto", requiereUsuario, vecino, limitar("comunidad-contacto", 40, 3600 * 1000), async (req, res) => {
  try {
    const ahora = new Date();
    const p = await Publicacion.findOne({ id: String(req.params.id) }).lean();
    const publica = p && publicacionPublica(p, ahora);
    if (!p || p.departamentoId !== req.vecino.departamentoId || p.ocultaPorEquipo === true || (await ownerExcluido(req, p.ownerId)) || publica.estado !== "activa" || publica.estadoEvento === "cancelado" || !publica.conContacto) return res.status(404).json({ error: "Esta publicación no tiene contacto disponible." });
    const url = enlaceWhatsapp(p.whatsapp, req.body?.mensaje);
    if (!url) return res.status(404).json({ error: "Esta publicación no tiene contacto disponible." });
    res.json({ url });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo abrir el contacto." });
  }
});

// POST /api/comunidad   { tipo, ...campos } → publicar. Gratis. Con límites antispam: por día, espera entre una y otra y máximo de activas.
router.post("/", requiereUsuario, vecino, limitar("comunidad-crear", 20, 3600 * 1000), async (req, res) => {
  try {
    const u = req.actor.usuario;
    const ownerId = String(u._id);
    const ahora = new Date();
    const tipo = String(req.body?.tipo || "");
    if (!TIPO_IDS.includes(tipo)) return res.status(400).json({ error: "Elegí qué querés publicar." });
    const { datos, extra, vence, inicio, error } = sanearPublicacion(req.body, tipo, ahora);
    if (error) return res.status(400).json({ error });
    if (datos.localidad.departamentoId !== req.vecino.departamentoId) return res.status(400).json({ error: `Solo podés publicar en tu departamento (${req.vecino.departamento}).` });

    if (tipo === "sorteo") {
      const abiertos = await Publicacion.countDocuments({ ownerId, tipo: "sorteo", resuelta: { $ne: true }, expiresAt: { $gt: ahora } });
      if (abiertos >= LIMITES.sorteosActivos) return res.status(429).json({ error: `Ya tenés ${LIMITES.sorteosActivos} sorteos publicados. Eliminá o cancelá alguno para publicar otro.`, codigo: "limite_sorteos" });
    }
    const [hoy24, ultima, activas] = await Promise.all([
      Publicacion.countDocuments({ ownerId, createdAt: { $gte: new Date(ahora.getTime() - DIA) } }),
      Publicacion.findOne({ ownerId }).sort({ createdAt: -1 }).select("createdAt").lean(),
      Publicacion.countDocuments({ ownerId, resuelta: { $ne: true }, expiresAt: { $gt: ahora } }),
    ]);
    if (hoy24 >= LIMITES.porDia) return res.status(429).json({ error: `Llegaste al máximo de ${LIMITES.porDia} publicaciones por día. Probá mañana.`, codigo: "limite_diario" });
    if (ultima && ahora.getTime() - new Date(ultima.createdAt).getTime() < LIMITES.esperaSeg * 1000) {
      const falta = Math.ceil((LIMITES.esperaSeg * 1000 - (ahora.getTime() - new Date(ultima.createdAt).getTime())) / 1000);
      return res.status(429).json({ error: `Esperá ${falta} segundos antes de publicar otra.`, codigo: "espera" });
    }
    if (activas >= LIMITES.activas) return res.status(429).json({ error: `Ya tenés ${LIMITES.activas} publicaciones activas. Eliminá o resolvé alguna para publicar otra.`, codigo: "limite_activas" });

    const creada = await Publicacion.create({
      ...datos, id: crypto.randomBytes(8).toString("hex"), ownerId, tipo, datos: extra, departamentoId: datos.localidad.departamentoId,
      expiresAt: vence, inicioAt: inicio, prioridad: tipo === "aviso" ? prioridadAviso(extra) : 0,
      textoBusqueda: textoBusqueda(datos, extra), borrarEn: new Date(vence.getTime() + 90 * DIA),
    });
    res.status(201).json({ publicacion: publicacionDelAutor(creada.toObject(), ahora) });
  } catch (e) {
    console.error("Error al publicar en Comunidad:", e);
    res.status(500).json({ error: "No se pudo publicar. Probá de nuevo." });
  }
});

// PUT /api/comunidad/:id → editar (solo el autor). El tipo no cambia. Con renovar:true, la duración elegida cuenta desde ahora.
// Si cambia la fecha de un evento, queda marcado como «reprogramado».
router.put("/:id", requiereUsuario, vecino, limitar("comunidad-editar", 60, 3600 * 1000), async (req, res) => {
  try {
    const p = await miPublicacion(req, res);
    if (!p) return;
    const ahora = new Date();
    const { datos, extra, vence, inicio, error } = sanearPublicacion(req.body, p.tipo, ahora);
    if (error) return res.status(400).json({ error });
    if (datos.localidad.departamentoId !== req.vecino.departamentoId) return res.status(400).json({ error: `Solo podés publicar en tu departamento (${req.vecino.departamento}).` });
    const conFecha = p.tipo === "deporte" || p.tipo === "evento" || p.tipo === "sorteo";
    // al editar un sorteo no se pierde el resultado que ya publicó el organizador
    if (p.tipo === "sorteo" && p.datos?.resultado) { extra.resultado = p.datos.resultado; extra.resultadoEn = p.datos.resultadoEn; }
    const nuevoVence = conFecha || req.body?.renovar === true ? vence : p.expiresAt;
    const cambioFecha = p.tipo === "evento" && p.inicioAt && inicio && new Date(p.inicioAt).getTime() !== inicio.getTime();
    Object.assign(p, datos, {
      datos: extra, textoBusqueda: textoBusqueda(datos, extra), expiresAt: nuevoVence, inicioAt: conFecha ? inicio : null,
      prioridad: p.tipo === "aviso" ? prioridadAviso(extra) : 0, borrarEn: new Date(new Date(nuevoVence).getTime() + 90 * DIA),
    });
    if (cambioFecha && (p.estadoEvento || "normal") === "normal") p.estadoEvento = "reprogramado";
    p.markModified("datos");
    await p.save();
    res.json({ publicacion: publicacionDelAutor(p.toObject(), ahora) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo guardar. Probá de nuevo." });
  }
});

// POST /api/comunidad/:id/resuelta   { resuelta: true|false } → marcar como resuelta (o volver a activarla)
router.post("/:id/resuelta", requiereUsuario, limitar("comunidad-resuelta", 60, 3600 * 1000), async (req, res) => {
  try {
    const p = await miPublicacion(req, res);
    if (!p) return;
    const valor = req.body?.resuelta !== false;
    p.resuelta = valor; p.resueltaEn = valor ? new Date() : null;
    await p.save();
    res.json({ publicacion: publicacionDelAutor(p.toObject(), new Date()) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo guardar." });
  }
});

// POST /api/comunidad/:id/evento   { estado: "normal" | "cancelado" | "reprogramado" } → solo eventos
router.post("/:id/evento", requiereUsuario, limitar("comunidad-evento", 60, 3600 * 1000), async (req, res) => {
  try {
    const p = await miPublicacion(req, res);
    if (!p) return;
    if (p.tipo !== "evento") return res.status(400).json({ error: "Solo los eventos se pueden cancelar o reprogramar." });
    const estado = String(req.body?.estado || "");
    if (!ESTADOS_EVENTO.includes(estado)) return res.status(400).json({ error: "Estado inválido." });
    p.estadoEvento = estado;
    await p.save();
    res.json({ publicacion: publicacionDelAutor(p.toObject(), new Date()) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo guardar." });
  }
});

// POST /api/comunidad/:id/sorteo   { accion: "resultado", texto } | { accion: "cancelar" } | { accion: "reactivar" } → solo sorteos, solo su autor.
// El resultado es un texto que escribe el organizador (por ejemplo «Salió el 047 en la Quiniela nocturna»); Mi Zona no sortea ni verifica nada.
// Se puede cargar desde el día del sorteo. Texto vacío = borrar el resultado.
router.post("/:id/sorteo", requiereUsuario, limitar("comunidad-sorteo", 60, 3600 * 1000), async (req, res) => {
  try {
    const p = await miPublicacion(req, res);
    if (!p) return;
    if (p.tipo !== "sorteo") return res.status(400).json({ error: "Esta acción es solo para sorteos." });
    const accion = String(req.body?.accion || "");
    if (accion === "cancelar") p.estadoEvento = "cancelado";
    else if (accion === "reactivar") p.estadoEvento = "normal";
    else if (accion === "resultado") {
      if ((p.estadoEvento || "normal") === "cancelado") return res.status(400).json({ error: "El sorteo está cancelado. Reactivalo para publicar un resultado." });
      const desdeDia = fechaAR(`${new Date(new Date(p.inicioAt).getTime() - 3 * 3600 * 1000).toISOString().slice(0, 10)}T00:00`);
      if (!desdeDia || desdeDia.getTime() > Date.now()) return res.status(400).json({ error: "Podés publicar el resultado desde el día del sorteo." });
      const texto = limpiarTextoSorteo(req.body?.texto);
      if (texto.error) return res.status(400).json({ error: texto.error });
      p.datos = { ...(p.datos || {}), resultado: texto.valor, resultadoEn: texto.valor ? new Date().toISOString() : null };
      p.markModified("datos");
    } else return res.status(400).json({ error: "Acción inválida." });
    await p.save();
    res.json({ publicacion: publicacionDelAutor(p.toObject(), new Date()) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo guardar." });
  }
});

// DELETE /api/comunidad/:id → eliminar (solo el autor; la web pide confirmación antes)
router.delete("/:id", requiereUsuario, limitar("comunidad-eliminar", 60, 3600 * 1000), async (req, res) => {
  try {
    const p = await miPublicacion(req, res);
    if (!p) return;
    await Publicacion.deleteOne({ id: p.id });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo eliminar." });
  }
});

export default router;
