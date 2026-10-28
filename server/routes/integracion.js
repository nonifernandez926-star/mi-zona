import express from "express";
import crypto from "crypto";
import Usuario from "../models/Usuario.js";
import { enviarPushAUsuario } from "../utils/push.js";
import { aplicarDecision } from "../utils/reclamos.js";

// Rutas PRIVADAS para que Mi Asistente le avise cosas a Mi Zona. Se protegen con la clave compartida (INTEGRACION_KEY).
const router = express.Router();

function claveIntegracionOk(req) {
  const esperada = process.env.INTEGRACION_KEY;
  const recibida = req.get("x-integracion-key");
  if (!esperada || typeof recibida !== "string") return false;
  const a = Buffer.from(recibida), b = Buffer.from(esperada);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const AVISOS = {
  confirmado: (n) => ({ titulo: "Tu pedido fue confirmado", cuerpo: `${n} confirmó tu pedido.` }),
  en_preparacion: (n) => ({ titulo: "Tu pedido está en preparación", cuerpo: `${n} ya está preparando tu pedido.` }),
  listo: (n) => ({ titulo: "¡Tu pedido está listo!", cuerpo: `Tu pedido de ${n} ya está listo.` }),
  entregado: (n) => ({ titulo: "Pedido entregado", cuerpo: `${n} marcó tu pedido como entregado. ¡Gracias por tu compra!` }),
};

// POST /api/integracion/pedido-estado   { sesionClienteId, pedidoId, estado, negocio, codigoPublico }
// Mi Asistente lo llama cuando el dueño cambia el estado de un pedido: se le manda un aviso al celular de quien lo hizo.
router.post("/pedido-estado", async (req, res) => {
  if (!claveIntegracionOk(req)) return res.status(401).json({ error: "Clave de integración inválida" });
  try {
    const { sesionClienteId, estado, negocio, pedidoId } = req.body || {};
    const armar = AVISOS[estado];
    if (!sesionClienteId || typeof sesionClienteId !== "string" || !armar) return res.json({ ok: true, enviados: 0 }); // "pendiente" no avisa
    const usuario = await Usuario.findOne({ sesionClienteId }).select("_id").lean();
    if (!usuario) return res.json({ ok: true, enviados: 0 }); // el pedido lo hizo alguien sin cuenta de Mi Zona
    const nombre = String(negocio || "el negocio").slice(0, 60);
    const { titulo, cuerpo } = armar(nombre);
    const enviados = await enviarPushAUsuario(usuario._id, { titulo, cuerpo, url: "/?abrir=pedidos", tag: `pedido-${String(pedidoId || "").slice(0, 40)}` }, "pedidos");
    res.json({ ok: true, enviados });
  } catch (e) {
    console.error("Error al avisar el estado de un pedido:", e.message);
    res.status(500).json({ error: "No se pudo avisar" });
  }
});

// POST /api/integracion/reclamo-decidido   { evento, refExterna, estado, solucion, mensaje, fecha }
// Mi Asistente lo llama (MIZONA_WEBHOOK_URL) apenas el dueño responde un reclamo: se guarda la respuesta y se avisa a la persona.
// Si este aviso no llega, la persona igual ve la respuesta al abrir "Mis reclamos" (la app la consulta sola).
router.post("/reclamo-decidido", async (req, res) => {
  if (!claveIntegracionOk(req)) return res.status(401).json({ error: "Clave de integración inválida" });
  try {
    const b = req.body || {};
    if (!b.refExterna || typeof b.refExterna !== "string") return res.status(400).json({ error: "Falta refExterna" });
    const r = await aplicarDecision(b.refExterna, { estado: b.estado, mensaje: b.mensaje, solucion: b.solucion, fecha: b.fecha });
    res.json({ ok: true, aplicado: !!r }); // aplicado:false = ya estaba respondido o no es de Mi Zona: no es un error
  } catch (e) {
    console.error("Error al recibir la respuesta de un reclamo:", e.message);
    res.status(500).json({ error: "No se pudo guardar la respuesta" });
  }
});

export default router;
