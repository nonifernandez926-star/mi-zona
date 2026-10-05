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
    if (typeof subscription?.endpoint !== "string" || !/^https:\/\/[^\s]{10,1000}$/.test(subscription.endpoint) || typeof subscription.keys?.p256dh !== "string" || typeof subscription.keys?.auth !== "string") {
      return res.status(400).json({ error: "Faltan datos de la suscripción." });
    }
    if ((await PushSuscripcion.countDocuments({ usuarioId: String(req.actor.usuario._id) })) >= 10 && !(await PushSuscripcion.exists({ endpoint: subscription.endpoint }))) {
      return res.status(400).json({ error: "Ya tenés muchos dispositivos con notificaciones. Desactivá alguno primero." });
    }
    // se guarda solo lo necesario para enviar la notificación
    const limpia = { endpoint: subscription.endpoint, keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth } };
    await PushSuscripcion.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      { usuarioId: String(req.actor.usuario._id), endpoint: subscription.endpoint, subscription: limpia },
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
    await PushSuscripcion.deleteOne({ endpoint: String(req.body?.endpoint || ""), usuarioId: String(req.actor.usuario._id) });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "No se pudo cancelar." });
  }
});

export default router;
