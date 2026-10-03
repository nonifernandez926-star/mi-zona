import express from "express";
import crypto from "crypto";
import Business from "../models/Business.js";
import Evento from "../models/Evento.js";

const router = express.Router();

const TIPOS = ["visita", "ubicacion", "guardado", "contacto"];
// Para no inflar los números: la misma persona no suma dos veces la misma acción sobre el mismo negocio
// dentro de esta ventana (en minutos). "Guardado" se cuenta una vez por día por persona.
const VENTANA_MIN = { visita: 30, ubicacion: 30, contacto: 30, guardado: 24 * 60 };

const INTEGRACION_KEY = process.env.INTEGRACION_KEY || "";

// Límite simple en memoria (sin dependencias nuevas): máx. 120 eventos por minuto por IP
const golpes = new Map();
function limitePorIP(req, res, next) {
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip;
  const ahora = Date.now();
  const reg = golpes.get(ip) || { desde: ahora, n: 0 };
  if (ahora - reg.desde > 60000) { reg.desde = ahora; reg.n = 0; }
  reg.n += 1;
  golpes.set(ip, reg);
  if (golpes.size > 5000) { for (const [k, v] of golpes) if (ahora - v.desde > 60000) golpes.delete(k); }
  if (reg.n > 120) return res.status(429).end();
  next();
}

// POST /api/eventos   { bizId, tipo, clienteId }
// Lo llama la web de Mi Zona en segundo plano. Responde 204 siempre que la petición sea válida.
router.post("/", limitePorIP, async (req, res) => {
  try {
    const { bizId, tipo, clienteId } = req.body || {};
    if (typeof bizId !== "string" || typeof clienteId !== "string" || !TIPOS.includes(tipo) || clienteId.length < 8 || clienteId.length > 120) {
      return res.status(400).json({ error: "Datos inválidos" });
    }
    if (!(await Business.exists({ id: bizId }))) return res.status(404).json({ error: "Negocio no encontrado" });

    const desde = new Date(Date.now() - VENTANA_MIN[tipo] * 60 * 1000);
    const repetido = await Evento.exists({ bizId, tipo, clienteId, createdAt: { $gt: desde } });
    if (!repetido) await Evento.create({ bizId, tipo, clienteId });
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

function claveValida(recibida) {
  if (!INTEGRACION_KEY || typeof recibida !== "string") return false;
  const a = Buffer.from(recibida);
  const b = Buffer.from(INTEGRACION_KEY);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Zona horaria de Argentina (UTC-3 fijo)
const OFFSET_MS = 3 * 60 * 60 * 1000;
const diaArg = (fecha) => new Date(new Date(fecha).getTime() - OFFSET_MS).toISOString().slice(0, 10);
const sumarDias = (dia, n) => { const d = new Date(`${dia}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

// GET /api/eventos/resumen?codigoPublico=XXXX&dias=7
// PRIVADO: solo lo puede llamar el servidor de Mi Asistente (con la clave compartida). El dueño ve estos
// números dentro de su panel de Mi Asistente; nunca se exponen a clientes ni en el perfil público.
router.get("/resumen", async (req, res) => {
  try {
    if (!INTEGRACION_KEY) return res.status(503).json({ error: "Integración no configurada (falta INTEGRACION_KEY)" });
    if (!claveValida(req.headers["x-integracion-key"])) return res.status(401).json({ error: "No autorizado" });

    const codigoPublico = String(req.query.codigoPublico || "");
    const dias = [7, 30, 90].includes(Number(req.query.dias)) ? Number(req.query.dias) : 7;
    const biz = codigoPublico ? await Business.findOne({ asistenteCodigoPublico: codigoPublico }) : null;
    if (!biz) return res.status(404).json({ error: "Este asistente todavía no está vinculado a un negocio de Mi Zona" });

    const hoy = diaArg(new Date());
    const primerDia = sumarDias(hoy, -(dias - 1));
    const desde = new Date(`${primerDia}T00:00:00-03:00`);

    const [porDia, porPersona, primero] = await Promise.all([
      Evento.aggregate([
        { $match: { bizId: biz.id, createdAt: { $gte: desde } } },
        { $group: { _id: { tipo: "$tipo", dia: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "-03:00" } } }, total: { $sum: 1 } } },
      ]),
      Evento.aggregate([
        { $match: { bizId: biz.id, createdAt: { $gte: desde } } },
        { $group: { _id: { tipo: "$tipo", clienteId: "$clienteId" }, total: { $sum: 1 } } },
        { $group: { _id: "$_id.tipo", personas: { $sum: 1 }, total: { $sum: "$total" } } },
      ]),
      Evento.findOne({ bizId: biz.id }).sort({ createdAt: 1 }).select("createdAt"),
    ]);

    const CAMPO = { visita: "visitas", ubicacion: "ubicacion", guardado: "guardados", contacto: "contactos" };
    const serie = {};
    for (let i = 0; i < dias; i++) {
      const d = sumarDias(primerDia, i);
      serie[d] = { fecha: d, visitas: 0, ubicacion: 0, guardados: 0, contactos: 0 };
    }
    porDia.forEach((r) => { if (serie[r._id.dia]) serie[r._id.dia][CAMPO[r._id.tipo]] = r.total; });

    const totales = {};
    Object.values(CAMPO).forEach((c) => { totales[c] = { total: 0, personas: 0 }; });
    porPersona.forEach((r) => { totales[CAMPO[r._id]] = { total: r.total, personas: r.personas }; });

    res.json({
      totales,
      serie: Object.values(serie),
      guardadosActuales: Math.max(0, biz.vecesFavorito || 0), // cuántas personas lo tienen guardado hoy
      datosDesde: primero ? diaArg(primero.createdAt) : null, // desde cuándo se registran estos datos
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
