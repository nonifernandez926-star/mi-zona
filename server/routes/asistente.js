import express from "express";
import Business from "../models/Business.js";

const router = express.Router();

// URL base del backend de Mi Asistente (Render). Se configura en .env — nunca hardcodeada,
// porque puede cambiar de servicio o de plan.
const MI_ASISTENTE_URL = process.env.MI_ASISTENTE_API_URL || "https://empleado-virtual-ia.onrender.com/api";

// Clave compartida con Mi Asistente: le avisa que el pedido viene de este servidor (y le da un límite más alto,
// porque acá pasan las consultas de todos los clientes de Mi Zona).
function cabecerasAsistente() {
  const h = { "Content-Type": "application/json" };
  if (process.env.INTEGRACION_KEY) h["x-integracion-key"] = process.env.INTEGRACION_KEY;
  return h;
}

// Reenvía un pedido a Mi Asistente y devuelve su respuesta tal cual (con su código de estado).
async function reenviar(res, ruta, opciones = {}) {
  try {
    const r = await fetch(`${MI_ASISTENTE_URL}${ruta}`, { ...opciones, headers: cabecerasAsistente() });
    const datos = await r.json().catch(() => ({}));
    res.status(r.status).json(datos);
  } catch (e) {
    console.error(e);
    res.status(502).json({ error: "sin_conexion", mensaje: "No se pudo conectar con Mi Asistente. Probá de nuevo en un momento." });
  }
}

// POST /api/asistente/chat/:codigoPublico   { mensaje, sesionClienteId }
// Reenvía el mensaje del cliente directo al asistente REAL de ese negocio en Mi Asistente,
// y devuelve su respuesta (incluye pedidoCreado/turnoCreado si el asistente registró uno).
router.post("/chat/:codigoPublico", async (req, res) => {
  try {
    const { mensaje, sesionClienteId } = req.body;
    if (!mensaje || !sesionClienteId) {
      return res.status(400).json({ error: "Faltan datos: mensaje y sesionClienteId son obligatorios" });
    }
    const r = await fetch(`${MI_ASISTENTE_URL}/chat/${encodeURIComponent(req.params.codigoPublico)}`, {
      method: "POST",
      headers: cabecerasAsistente(),
      // origen: "mizona" le avisa a Mi Asistente que este chat nació en Mi Zona (para sus estadísticas)
      body: JSON.stringify({ mensaje, sesionClienteId, origen: "mizona" }),
    });
    const datos = await r.json();
    if (!r.ok) {
      // ej: suscripción vencida, límite de prueba alcanzado, asistente no encontrado
      return res.status(r.status).json(datos);
    }
    res.json(datos); // { respuesta, pedidoCreado, turnoCreado, imagenes }
  } catch (e) {
    console.error(e);
    res.status(502).json({ error: "No se pudo conectar con el asistente de este negocio. Probá de nuevo en un momento." });
  }
});

// POST /api/asistente/cliente/actividad   { sesionClienteId }
// Pedidos, turnos, puntos y canjes del cliente: con esto la web arma su centro de notificaciones.
router.post("/cliente/actividad", (req, res) =>
  reenviar(res, "/cliente/actividad", { method: "POST", body: JSON.stringify({ sesionClienteId: req.body?.sesionClienteId }) })
);

// GET /api/asistente/puntos/negocio/:codigoPublico?sesionClienteId=...
// Programa de puntos de un negocio y recompensas, con el saldo del cliente.
router.get("/puntos/negocio/:codigoPublico", (req, res) =>
  reenviar(res, `/puntos/publico/${encodeURIComponent(req.params.codigoPublico)}?sesionClienteId=${encodeURIComponent(req.query.sesionClienteId || "")}`)
);

// POST /api/asistente/puntos/mis-puntos   { sesionClienteId }
router.post("/puntos/mis-puntos", (req, res) =>
  reenviar(res, "/puntos/mis-puntos", { method: "POST", body: JSON.stringify({ sesionClienteId: req.body?.sesionClienteId }) })
);

// POST /api/asistente/puntos/canjear   { codigoPublico, sesionClienteId, recompensaId, claveUnica }
router.post("/puntos/canjear", (req, res) => {
  const { codigoPublico, sesionClienteId, recompensaId, claveUnica } = req.body || {};
  reenviar(res, "/puntos/canjear", { method: "POST", body: JSON.stringify({ codigoPublico, sesionClienteId, recompensaId, claveUnica }) });
});

const CATEGORY_LABELS = {
  comida: "Gastronomía", salud: "Salud", servicios: "Servicios", hogar: "Hogar",
  moda: "Moda y retail", automotor: "Automotor", belleza: "Belleza y estética",
};

// POST /api/asistente/buscar  { mensaje, historial: [{rol, texto}] }
router.post("/buscar", async (req, res) => {
  try {
    const { mensaje, historial = [] } = req.body;
    if (!mensaje || !mensaje.trim()) {
      return res.status(400).json({ error: "Falta el mensaje" });
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({
        respuesta: "La búsqueda con inteligencia artificial todavía no está configurada en el servidor.",
        negocios: [],
      });
    }

    // Traemos los negocios activos para que el asistente pueda recomendar entre ellos
    const negocios = await Business.find({ status: "active", kind: { $ne: "job" } })
      .select("id name cat zone desc services specialties")
      .limit(300);

    const listado = negocios
      .map((b) => `- id:${b.id} | ${b.name} | ${CATEGORY_LABELS[b.cat] || b.cat} | ${b.zone} | ${b.desc || ""} | servicios: ${(b.services || []).join(", ")}`)
      .join("\n");

    const systemPrompt = `Sos el asistente de búsqueda de Mi Zona, un directorio de negocios locales de Argentina.
Tu trabajo es ayudar a la persona a encontrar el negocio que necesita, entre esta lista de negocios activos:

${listado}

Reglas:
- Respondé siempre en español rioplatense, en 1 a 3 frases, tono cordial y directo.
- Recomendá SOLO negocios de la lista de arriba (nunca inventes negocios que no estén ahí).
- Si hay negocios que calzan con el pedido, mencionalos brevemente en tu respuesta de texto.
- Al final de tu respuesta agregá una línea aparte que empiece exactamente con "IDS:" seguida de los id de los negocios recomendados separados por coma (máximo 5), sin espacios. Ejemplo: IDS:abc123,def456
- Si no hay ningún negocio que calce, decilo con honestidad y dejá "IDS:" vacío.`;

    const messages = [
      ...historial.slice(-8).map((m) => ({ role: m.rol === "cliente" ? "user" : "assistant", content: m.texto })),
      { role: "user", content: mensaje },
    ];

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 400,
        system: systemPrompt,
        messages,
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("Error de Anthropic:", errText);
      return res.status(502).json({ respuesta: "No pude conectarme con el asistente en este momento. Probá de nuevo en un rato.", negocios: [] });
    }

    const data = await anthropicRes.json();
    const textoCompleto = (data.content || []).map((c) => c.text || "").join("\n").trim();

    // separamos la línea "IDS:..." del texto visible para el cliente
    const match = textoCompleto.match(/IDS:\s*([a-zA-Z0-9,\s]*)\s*$/m);
    const idsSugeridos = match ? match[1].split(",").map((s) => s.trim()).filter(Boolean) : [];
    const respuestaVisible = textoCompleto.replace(/IDS:\s*[a-zA-Z0-9,\s]*\s*$/m, "").trim();

    // solo devolvemos negocios que realmente existen en la lista que le pasamos
    const idsValidos = negocios.map((b) => b.id);
    const negociosRecomendados = idsSugeridos.filter((id) => idsValidos.includes(id));

    res.json({ respuesta: respuestaVisible || textoCompleto, negocios: negociosRecomendados });
  } catch (e) {
    console.error(e);
    res.status(500).json({ respuesta: "Ocurrió un error buscando negocios. Probá de nuevo.", negocios: [] });
  }
});

export default router;
