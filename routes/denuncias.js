import express from "express";
import mongoose from "mongoose";
import Denuncia from "../models/Denuncia.js";
import Bloqueo from "../models/Bloqueo.js";
import Usuario from "../models/Usuario.js";
import { identificar, requiereUsuario, limitar } from "../utils/auth.js";
import { permitir } from "../utils/limitador.js";
import { sanearDenuncia, LIM, MOTIVO_TEXTO, OBJETOS } from "../utils/moderacion.js";
import { resolverObjeto } from "../utils/objetosDenunciables.js";
import { avisarAlEquipo } from "../utils/medidas.js";

// Denunciar y bloquear (Fase 8). Todo se resuelve en el servidor a partir del tipo y el id público: la web nunca conoce la cuenta de quien publicó.
const router = express.Router();
router.use(identificar);
const uid = (req) => String(req.actor.usuario._id);
const DIA = 86400000;
const codigo = (d) => `MD-${String(d._id).slice(-6).toUpperCase()}`;

// POST /api/denuncias   { tipo, id, motivo, detalle? } → { ok, codigo, puedeBloquear, yaBloqueado }
router.post("/", requiereUsuario, limitar("denuncia", 10, 3600 * 1000), async (req, res) => {
  try {
    const yo = uid(req);
    const s = sanearDenuncia(req.body);
    if (s.error) return res.status(400).json({ error: s.error });
    if (!(await permitir(`denuncia-dia|${yo}`, 40, DIA))) return res.status(429).json({ error: "Hiciste muchas denuncias hoy. Probá mañana.", codigo: "limite_diario" });
    const objeto = await resolverObjeto(s.objetoTipo, s.objetoId);
    if (!objeto) return res.status(404).json({ error: "Eso ya no está disponible." });
    if (objeto.duenoId && objeto.duenoId === yo) return res.status(400).json({ error: "No podés denunciar tu propio contenido." });

    // lo mismo no se denuncia dos veces: mientras está abierta, ni hasta 30 días después de que se resolvió
    const previa = await Denuncia.findOne({ denuncianteId: yo, objetoTipo: s.objetoTipo, objetoId: objeto.id, createdAt: { $gte: new Date(Date.now() - LIM.repetirDenunciaDias * DIA) } }).select("estado").lean();
    if (previa) return res.status(409).json({ codigo: "ya_denunciada", error: previa.estado === "abierta" ? "Ya denunciaste esto. Lo estamos revisando." : "Ya revisamos tu denuncia anterior sobre esto." });

    let d;
    try {
      d = await Denuncia.create({ denuncianteId: yo, objetoTipo: s.objetoTipo, objetoId: objeto.id, duenoId: objeto.duenoId, motivo: s.motivo, detalle: s.detalle, snapshot: objeto.snapshot });
    } catch (e) {
      if (e.code === 11000) return res.status(409).json({ codigo: "ya_denunciada", error: "Ya denunciaste esto. Lo estamos revisando." });
      throw e;
    }
    avisarAlEquipo(`Nueva denuncia ${codigo(d)} · ${OBJETOS[d.objetoTipo]} · ${MOTIVO_TEXTO[d.motivo]}`);
    const yaBloqueado = objeto.duenoId ? !!(await Bloqueo.exists({ bloqueadorId: yo, bloqueadoId: objeto.duenoId })) : false;
    res.status(201).json({ ok: true, codigo: codigo(d), puedeBloquear: !!objeto.duenoId, yaBloqueado });
  } catch (e) {
    console.error("Error al denunciar:", e);
    res.status(500).json({ error: "No pudimos enviar tu denuncia. Probá de nuevo en un momento." });
  }
});

// GET /api/denuncias/mias → mis denuncias y si ya se revisaron (no se cuenta qué se decidió sobre la otra persona)
router.get("/mias", requiereUsuario, async (req, res) => {
  try {
    const filas = await Denuncia.find({ denuncianteId: uid(req) }).sort({ createdAt: -1 }).limit(50).select("objetoTipo motivo estado snapshot.titulo createdAt").lean();
    res.json({ denuncias: filas.map((d) => ({ id: String(d._id), codigo: codigo(d), tipo: OBJETOS[d.objetoTipo], motivo: MOTIVO_TEXTO[d.motivo], titulo: d.snapshot?.titulo || "", revisada: d.estado !== "abierta", creadaEn: d.createdAt })) });
  } catch (e) {
    res.status(500).json({ error: "No pudimos cargar tus denuncias." });
  }
});

/* ---------- Bloqueos ---------- */

// GET /api/denuncias/bloqueos → personas que bloqueé
router.get("/bloqueos", requiereUsuario, async (req, res) => {
  try {
    const filas = await Bloqueo.find({ bloqueadorId: uid(req) }).sort({ createdAt: -1 }).limit(LIM.maxBloqueos).lean();
    res.json({ bloqueados: filas.map((b) => ({ id: String(b._id), usuario: b.usuario || "", nombre: b.nombre || b.usuario || "Usuario", desde: b.createdAt })) });
  } catch (e) {
    res.status(500).json({ error: "No pudimos cargar tu lista de bloqueados." });
  }
});

// POST /api/denuncias/bloqueos   { tipo, id } → bloquea a quien publicó eso. Mientras dure, ninguno de los dos ve lo del otro.
router.post("/bloqueos", requiereUsuario, limitar("bloquear", 30, 3600 * 1000), async (req, res) => {
  try {
    const yo = uid(req);
    const s = sanearDenuncia({ ...req.body, motivo: "otro", detalle: "bloqueo bloqueo" });
    if (s.error) return res.status(400).json({ error: s.error });
    const objeto = await resolverObjeto(s.objetoTipo, s.objetoId);
    if (!objeto) return res.status(404).json({ error: "Eso ya no está disponible." });
    if (!objeto.duenoId) return res.status(400).json({ error: "No se puede bloquear a esta cuenta." });
    if (objeto.duenoId === yo) return res.status(400).json({ error: "No podés bloquearte a vos mismo." });
    if ((await Bloqueo.countDocuments({ bloqueadorId: yo })) >= LIM.maxBloqueos) return res.status(409).json({ error: "Llegaste al máximo de personas bloqueadas." });
    const u = await Usuario.findById(objeto.duenoId).select("usuario nombre").lean();
    if (!u) return res.status(404).json({ error: "Eso ya no está disponible." });
    const b = await Bloqueo.findOneAndUpdate({ bloqueadorId: yo, bloqueadoId: objeto.duenoId }, { $setOnInsert: { nombre: u.nombre || u.usuario || "", usuario: u.usuario || "" } }, { upsert: true, new: true });
    res.status(201).json({ bloqueado: { id: String(b._id), usuario: b.usuario, nombre: b.nombre || b.usuario || "Usuario" } });
  } catch (e) {
    console.error("Error al bloquear:", e);
    res.status(500).json({ error: "No pudimos bloquear. Probá de nuevo." });
  }
});

// DELETE /api/denuncias/bloqueos/:id → desbloquear (solo los míos)
router.delete("/bloqueos/:id", requiereUsuario, limitar("bloquear", 60, 3600 * 1000), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "No encontramos ese bloqueo." });
    const r = await Bloqueo.deleteOne({ _id: req.params.id, bloqueadorId: uid(req) });
    if (!r.deletedCount) return res.status(404).json({ error: "No encontramos ese bloqueo." });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "No pudimos desbloquear. Probá de nuevo." });
  }
});

export default router;
