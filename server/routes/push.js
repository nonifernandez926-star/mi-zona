import express from "express";
import PushSuscripcion from "../models/PushSuscripcion.js";
import { identificar, requiereUsuario } from "../utils/auth.js";
import { clavePublicaVapid, pushConfigurado, enviarPushAUsuario } from "../utils/push.js";
import { describirDispositivo } from "../utils/dispositivos.js";

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
    const disp = describirDispositivo(req.headers["user-agent"]);
    const limpia = { endpoint: subscription.endpoint, keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth } };
    await PushSuscripcion.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      { usuarioId: String(req.actor.usuario._id), endpoint: subscription.endpoint, subscription: limpia, nombre: disp.nombre, tipo: disp.tipo },
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

const CATEGORIAS = ["agenda", "suscripcion", "soporte"];
const prefsDe = (u) => ({
  agenda: u.notificaciones?.agenda !== false,
  suscripcion: u.notificaciones?.suscripcion !== false,
  soporte: u.notificaciones?.soporte !== false,
  seguridad: u.seguridad?.alertasInicio !== false,
});

// GET /api/push/estado → lo que necesita la pantalla Ajustes → Notificaciones: si el servidor las tiene configuradas,
// los dispositivos con avisos y qué tipos de aviso quiere recibir
router.get("/estado", identificar, requiereUsuario, async (req, res) => {
  try {
    const u = req.actor.usuario;
    const subs = await PushSuscripcion.find({ usuarioId: String(u._id) }).sort({ createdAt: 1 }).lean();
    res.json({
      configurado: pushConfigurado(),
      dispositivos: subs.map((d) => ({ endpoint: d.endpoint, nombre: d.nombre || "Dispositivo", tipo: d.tipo || "", desde: d.createdAt })),
      preferencias: prefsDe(u),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudieron cargar las notificaciones." });
  }
});

// PUT /api/push/preferencias   { agenda?, suscripcion?, soporte?, seguridad? }  (booleanos)
router.put("/preferencias", identificar, requiereUsuario, async (req, res) => {
  try {
    const u = req.actor.usuario;
    let cambio = false;
    for (const k of CATEGORIAS) {
      if (typeof req.body?.[k] === "boolean") { u.set(`notificaciones.${k}`, req.body[k]); cambio = true; }
    }
    if (typeof req.body?.seguridad === "boolean") { u.set("seguridad.alertasInicio", req.body.seguridad); cambio = true; }
    if (!cambio) return res.status(400).json({ error: "Pedido inválido." });
    await u.save();
    res.json({ preferencias: prefsDe(u) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo guardar el cambio." });
  }
});

// POST /api/push/probar → manda un aviso de prueba a los dispositivos de la persona
router.post("/probar", identificar, requiereUsuario, async (req, res) => {
  try {
    if (!pushConfigurado()) return res.status(503).json({ error: "Las notificaciones todavía no están configuradas en el servidor." });
    const enviados = await enviarPushAUsuario(req.actor.usuario._id, { titulo: "Mi Zona", cuerpo: "Listo: las notificaciones funcionan en este dispositivo.", url: "/" });
    res.json({ enviados });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo enviar el aviso de prueba." });
  }
});

export default router;
