import express from "express";
import ErrorApp from "../models/ErrorApp.js";
import { claveAdminOk, limitar } from "../utils/auth.js";
import { sanearError } from "../utils/errores.js";

const router = express.Router();

// POST /api/errores  { mensaje, pila?, pantalla?, version?, plataforma? }
// La web avisa de un error (sin sesión ni datos de la persona). Siempre responde 204: si falla, a la app no le importa.
router.post("/", limitar("errores", 20, 3600 * 1000), async (req, res) => {
  try {
    const e = sanearError(req.body);
    if (!e) return res.status(204).end();
    const { huella, ...datos } = e;
    await ErrorApp.updateOne({ huella }, { $setOnInsert: { ...datos, primeraVez: new Date() }, $set: { ultimaVez: new Date() }, $inc: { veces: 1 } }, { upsert: true });
    console.error(`[error-web] ${e.version || "?"} ${e.pantalla || "?"}: ${e.mensaje}`);
  } catch (err) {
    if (err?.code !== 11000) console.error("No se pudo guardar un error de la web:", err.message);
  }
  res.status(204).end();
});

// GET /api/errores/admin → los errores más repetidos de los últimos 30 días. Solo el equipo, con el encabezado x-soporte-key (la misma SOPORTE_ADMIN_KEY).
router.get("/admin", async (req, res) => {
  if (!claveAdminOk(req)) return res.status(403).json({ error: "No autorizado." });
  const lista = await ErrorApp.find({}).sort({ ultimaVez: -1 }).limit(100).lean();
  res.json({ errores: lista.map((x) => ({ veces: x.veces, mensaje: x.mensaje, pantalla: x.pantalla, version: x.version, plataforma: x.plataforma, ultimaVez: x.ultimaVez, pila: x.pila })).sort((a, b) => b.veces - a.veces) });
});

export default router;
