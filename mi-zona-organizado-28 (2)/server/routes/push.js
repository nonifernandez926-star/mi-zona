import express from "express";
import PushSuscripcion from "../models/PushSuscripcion.js";
import { identificar, requiereUsuario } from "../utils/auth.js";
import { clavePublicaVapid, pushConfigurado } from "../utils/push.js";

const router = express.Router();

// GET /api/push/clave-publica → la clave pública VAPID que necesita el navegador para suscribirse (es pública a propósito)
router.get("/clave-publica", (req, res) => {
  if (!pushConfigurado()) return res.status(503).json({ error: "Las notificaciones push todavía no están configuradas en el servidor." });
  res.json({ publicKey: clavePublicaVapid });
});

// POST /api/push/suscribirse   { subscription }  (requiere sesión)
router.post("/suscribirse", identificar, requiereUsuario, async (req, res) => {
  try {
    const { subscription } = req.body || {};
    if (!subscription?.endpoint) return res.status(400).json({ error: "Faltan datos de la suscripción." });
    await PushSuscripcion.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      { usuarioId: String(req.actor.usuario._id), endpoint: subscription.endpoint, subscription },
      { upsert: true }
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo guardar la suscripción." });
  }
});

// POST /api/push/cancelar   { endpoint }
router.post("/cancelar", identificar, requiereUsuario, async (req, res) => {
  try {
    await PushSuscripcion.deleteOne({ endpoint: req.body?.endpoint, usuarioId: String(req.actor.usuario._id) });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "No se pudo cancelar." });
  }
});

export default router;
