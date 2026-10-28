import express from "express";
import crypto from "crypto";
import Reclamo from "../models/Reclamo.js";
import Business from "../models/Business.js";
import { identificar, requiereUsuario, sesionClienteDe, limitar } from "../utils/auth.js";
import {
  TIPOS, MOTIVOS, ABIERTOS, MAX_INTENTOS, CATEGORIAS_COMIDA,
  texto, urlFoto, enviarReclamo, reintentarPendientes, sincronizar,
} from "../utils/reclamos.js";

// Reclamos, devoluciones y cambios que la persona le hace a un negocio desde "Mis pedidos".
// Se envían a Mi Asistente, donde el dueño los responde. Todo es de la CUENTA: el id sale siempre de la sesión.
const router = express.Router();
router.use(identificar, requiereUsuario);

const publico = (r) => ({
  id: String(r._id),
  codigoPublico: r.codigoPublico, negocio: r.negocio, tipo: r.tipo, motivo: r.motivo,
  producto: r.producto, pedidoRef: r.pedidoRef, monto: r.monto, descripcion: r.descripcion, fotos: r.fotos,
  estado: r.estado, enviado: r.enviado, fallo: !r.enviado && r.intentos >= MAX_INTENTOS,
  respuesta: r.respuesta?.fecha ? { mensaje: r.respuesta.mensaje, solucion: r.respuesta.solucion, fecha: r.respuesta.fecha } : null,
  creado: r.createdAt,
});

const traer = (usuarioId) => Reclamo.find({ usuarioId }).sort({ createdAt: -1 }).limit(100);

// GET /api/reclamos → mis reclamos. Antes de responder reenvía los que no llegaron y trae las respuestas nuevas.
// (Es GET a propósito: una cuenta suspendida puede leer sus reclamos, pero no crear nuevos.)
router.get("/", limitar("reclamos-lista", 60, 10 * 60 * 1000), async (req, res) => {
  try {
    const usuario = req.actor.usuario;
    const id = String(usuario._id);
    let lista = await traer(id);
    const hayTrabajo = lista.some((r) => (!r.enviado && r.intentos < MAX_INTENTOS) || (r.enviado && ABIERTOS.includes(r.estado)));
    if (hayTrabajo) {
      try {
        if (lista.some((r) => !r.enviado && r.intentos < MAX_INTENTOS)) {
          await reintentarPendientes(lista, { sesionClienteId: await sesionClienteDe(usuario), usuario: usuario.usuario });
        }
        await sincronizar(lista);
        lista = await traer(id);
      } catch (e) { console.error("Error al sincronizar reclamos:", e.message); }
    }
    res.json({ reclamos: lista.map(publico) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudieron traer tus reclamos." });
  }
});

// POST /api/reclamos   { codigoPublico, tipo, motivo, producto, pedidoRef, monto, descripcion, fotos, negocio, esComida }
router.post("/", limitar("reclamo-nuevo", 5, 3600 * 1000), async (req, res) => {
  try {
    const b = req.body || {};
    const usuario = req.actor.usuario;
    const id = String(usuario._id);

    if (!TIPOS.includes(b.tipo)) return res.status(400).json({ error: "Elegí si es un reclamo, una devolución o un cambio." });
    const codigoPublico = texto(b.codigoPublico, 40);
    if (!codigoPublico) return res.status(400).json({ error: "Falta el negocio al que le querés reclamar." });
    const descripcion = texto(b.descripcion, 1500);
    if (descripcion.length < 10) return res.status(400).json({ error: "Contanos qué pasó con un poco más de detalle (al menos 10 letras)." });
    const pedidoRef = texto(b.pedidoRef, 60);

    if (pedidoRef && await Reclamo.findOne({ usuarioId: id, codigoPublico, pedidoRef, tipo: b.tipo, estado: { $in: ABIERTOS } }).select("_id")) {
      return res.status(409).json({ error: "Ya enviaste este reclamo y el negocio todavía no respondió." });
    }
    if (await Reclamo.countDocuments({ usuarioId: id, estado: { $in: ABIERTOS } }) >= 10) {
      return res.status(429).json({ error: "Tenés muchos reclamos sin respuesta. Esperá a que los negocios respondan antes de enviar otro." });
    }

    // Si el negocio está en Mi Zona, su categoría decide si es comida (en comida solo se devuelve el dinero)
    const negocioMZ = await Business.findOne({ asistenteCodigoPublico: codigoPublico }).select("name cat").lean();
    const monto = Number(b.monto);
    const doc = new Reclamo({
      usuarioId: id,
      refExterna: `rz_${crypto.randomBytes(10).toString("hex")}`,
      codigoPublico,
      negocio: negocioMZ?.name || texto(b.negocio, 80),
      tipo: b.tipo,
      motivo: MOTIVOS.includes(b.motivo) ? b.motivo : "otro",
      producto: texto(b.producto, 120),
      pedidoRef,
      monto: Number.isFinite(monto) && monto >= 0 ? monto : null,
      esComida: negocioMZ ? CATEGORIAS_COMIDA.includes(negocioMZ.cat) : b.esComida === true,
      descripcion,
      fotos: (Array.isArray(b.fotos) ? b.fotos : []).map(urlFoto).filter(Boolean).slice(0, 4),
    });

    const envio = await enviarReclamo(doc, { sesionClienteId: await sesionClienteDe(usuario), usuario: usuario.usuario });
    if (!envio.ok && !envio.reintentable) {
      return res.status(envio.status === 404 ? 404 : 400).json({ error: envio.error });
    }
    doc.enviado = envio.ok;
    if (envio.ok) doc.estado = envio.estado;
    await doc.save();
    if (!envio.ok) {
      // Mi Asistente no respondió: queda guardado y se reenvía solo cuando la persona abra "Mis reclamos"
      return res.status(202).json({ reclamo: publico(doc), enviado: false, mensaje: "Guardamos tu reclamo, pero el negocio todavía no lo recibió. Lo reenviamos solos en un rato." });
    }
    res.status(201).json({ reclamo: publico(doc), enviado: true });
  } catch (e) {
    console.error("Error al crear un reclamo:", e);
    res.status(500).json({ error: "No se pudo enviar el reclamo. Probá de nuevo." });
  }
});

export default router;
