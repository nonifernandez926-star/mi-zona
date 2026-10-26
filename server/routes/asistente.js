import express from "express";
import Business from "../models/Business.js";
import { identificar, requiereUsuario, sesionClienteDe, limitar } from "../utils/auth.js";
import Oficio from "../models/Oficio.js";
import Alquiler from "../models/Alquiler.js";
import { ownersExcluidos, ownerExcluido } from "../utils/exclusiones.js";
import { visible, condicionesZona, hoy, palabrasDeBusqueda } from "./buscar.js";
import { oficioPublico } from "../utils/oficios.js";
import { alquilerPublico } from "../utils/alquileres.js";
import { ETIQUETA_CATEGORIA_NEGOCIO, SIN_VALOR } from "../utils/busquedaIA.js";
import { chatsPropiosConNegocios } from "../utils/chatsPropios.js";
import { armarPrompt, lineaNegocio, lineaOficio, lineaAlquiler, resumenResenas, distanciaKm, separarRespuesta, elegirValidos } from "../utils/contextoIA.js";

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
router.post("/chat/:codigoPublico", identificar, requiereUsuario, limitar("chat", 40, 10 * 60 * 1000), async (req, res) => {
  try {
    const mensaje = typeof req.body?.mensaje === "string" ? req.body.mensaje.trim().slice(0, 2000) : "";
    // El id de cliente es SIEMPRE el de la cuenta: se arma en el servidor y no se acepta el que mande el navegador,
    // así nadie puede leer ni escribir los chats de otra persona.
    const sesionClienteId = await sesionClienteDe(req.actor.usuario);
    if (!mensaje) {
      return res.status(400).json({ error: "Escribí un mensaje." });
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

// POST /api/asistente/mis-conversaciones  (requiere sesión)
// Trae de Mi Asistente las conversaciones que esta cuenta tuvo con los negocios, para que reaparezcan
// en cualquier dispositivo y cuando un negocio vuelva a pagar Mi Asistente.
router.post("/mis-conversaciones", identificar, requiereUsuario, async (req, res) => {
  const sesionClienteId = req.actor.usuario.sesionClienteId;
  if (!sesionClienteId) return res.json({ conversaciones: [] });
  reenviar(res, "/integracion/conversaciones-cliente", { method: "POST", body: JSON.stringify({ sesionClienteId }) });
});

// Las rutas de abajo (actividad, puntos y canjes) pertenecen a UNA persona. Antes aceptaban el id de cliente que
// mandaba el navegador, y cualquiera que lo conociera podía ver o gastar puntos ajenos. Ahora exigen sesión y usan
// siempre el id de la cuenta, armado por el servidor.

// POST /api/asistente/mis-pedidos
// Los pedidos que hizo la persona en los asistentes de los negocios, con el estado que les pone cada dueño.
// El id de cliente sale siempre de la cuenta (nunca del navegador): nadie puede ver los pedidos de otra persona.
router.post("/mis-pedidos", identificar, requiereUsuario, limitar("mis-pedidos", 60, 10 * 60 * 1000), async (req, res) =>
  reenviar(res, "/integracion/pedidos-cliente", { method: "POST", body: JSON.stringify({ sesionClienteId: await sesionClienteDe(req.actor.usuario) }) })
);

// POST /api/asistente/cliente/actividad
// Pedidos, turnos, puntos y canjes del cliente: con esto la web arma su centro de notificaciones.
router.post("/cliente/actividad", identificar, requiereUsuario, async (req, res) =>
  reenviar(res, "/cliente/actividad", { method: "POST", body: JSON.stringify({ sesionClienteId: await sesionClienteDe(req.actor.usuario) }) })
);

// GET /api/asistente/puntos/negocio/:codigoPublico
// Programa de puntos de un negocio y recompensas. El saldo solo se incluye si hay sesión (es el de esa cuenta).
router.get("/puntos/negocio/:codigoPublico", identificar, async (req, res) => {
  const sesion = req.actor?.usuario ? await sesionClienteDe(req.actor.usuario) : "";
  reenviar(res, `/puntos/publico/${encodeURIComponent(req.params.codigoPublico)}?sesionClienteId=${encodeURIComponent(sesion)}`);
});

// POST /api/asistente/puntos/mis-puntos
router.post("/puntos/mis-puntos", identificar, requiereUsuario, async (req, res) =>
  reenviar(res, "/puntos/mis-puntos", { method: "POST", body: JSON.stringify({ sesionClienteId: await sesionClienteDe(req.actor.usuario) }) })
);

// POST /api/asistente/puntos/canjear   { codigoPublico, recompensaId, claveUnica }
router.post("/puntos/canjear", identificar, requiereUsuario, limitar("canje", 20, 3600 * 1000), async (req, res) => {
  const { codigoPublico, recompensaId, claveUnica } = req.body || {};
  if ([codigoPublico, recompensaId, claveUnica].some((v) => v !== undefined && typeof v !== "string" && typeof v !== "number")) {
    return res.status(400).json({ error: "datos_invalidos", mensaje: "Datos inválidos." });
  }
  reenviar(res, "/puntos/canjear", { method: "POST", body: JSON.stringify({ codigoPublico, sesionClienteId: await sesionClienteDe(req.actor.usuario), recompensaId, claveUnica }) });
});

// Búsqueda unificada con asistente (Inicio). La persona escribe lo que necesita; la IA recomienda con un texto corto y el servidor devuelve
// debajo las fichas reales (negocios, oficios y alquileres) con sus datos públicos.
//
// PRIVACIDAD: la IA solo recibe (1) lo que la persona escribió, (2) datos públicos de fichas activas y (3) los chats que ESTA cuenta tuvo con asistentes
// de negocios, leídos por el servidor con el id de la cuenta (nunca con datos del navegador) y solo si no los apagó en Privacidad.
// Los chats con amigos que se agreguen más adelante NO se leen acá: ver utils/contextoIA.js y `npm run probar:privacidad-ia`.
// Los km se calculan en el servidor; a la IA no se le manda ninguna coordenada, solo "a 600 m".
const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const MAX_CANDIDATOS = 40; // oficios y alquileres que se le muestran a la IA

// Candidatos de un tipo de ficha: primero los que coinciden con palabras del pedido, después los más recientes hasta completar
async function candidatosDe(Modelo, base, palabras, orden) {
  const porPalabra = palabras.length
    ? await Modelo.find({ $and: [...base, { $or: palabras.map((w) => ({ textoBusqueda: { $regex: esc(w) } })) }] }).sort(orden).limit(MAX_CANDIDATOS).lean()
    : [];
  if (porPalabra.length >= MAX_CANDIDATOS) return porPalabra;
  const resto = await Modelo.find({ $and: [...base, { _id: { $nin: porPalabra.map((f) => f._id) } }] }).sort(orden).limit(MAX_CANDIDATOS - porPalabra.length).lean();
  return [...porPalabra, ...resto];
}

// POST /api/asistente/buscar  { mensaje, historial: [{rol, texto}], ubicacion?: {lat, lng}, zona?: {provinciaId, departamentoId, localidadId} }
// Cuesta plata (usa IA): tope por persona o por IP. Si la persona apagó la ubicación o el uso de chats en Privacidad, el servidor lo respeta.
router.post("/buscar", identificar, limitar("buscar", 30, 10 * 60 * 1000), async (req, res) => {
  try {
    const mensaje = typeof req.body?.mensaje === "string" ? req.body.mensaje.trim().slice(0, 600) : "";
    const usuario = req.actor?.usuario || null;
    const priv = usuario?.privacidad;
    const ubicacion = priv && priv.ubicacionBusqueda === false ? undefined : req.body?.ubicacion;
    const historial = (Array.isArray(req.body?.historial) ? req.body.historial : []).filter((m) => m && typeof m.texto === "string").map((m) => ({ rol: m.rol === "cliente" ? "cliente" : "asistente", texto: m.texto.slice(0, 1000) }));
    if (!mensaje) return res.status(400).json({ error: "Falta el mensaje" });
    const zona = condicionesZona(req.body?.zona || {});
    if (zona.error) return res.status(400).json({ error: zona.error });
    // ubicación (opcional): solo se usa para calcular km en esta consulta, no se guarda ni se le manda a la IA
    const miLat = Number(ubicacion?.lat), miLng = Number(ubicacion?.lng);
    const tieneUbicacion = Number.isFinite(miLat) && Number.isFinite(miLng) && Math.abs(miLat) <= 90 && Math.abs(miLng) <= 180;
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({ respuesta: "La búsqueda con inteligencia artificial todavía no está configurada en el servidor.", negocios: [], resultados: [] });
    }

    const h = hoy();
    const ahora = new Date();
    const excluidos = await ownersExcluidos(req); // cuentas suspendidas y personas bloqueadas
    const palabras = palabrasDeBusqueda(mensaje).filter((w) => w.length >= 4 && !SIN_VALOR.has(w));
    const [filasN, filasO, filasA, chats] = await Promise.all([
      Business.find({ status: "active", kind: { $ne: "job" }, pendientePago: { $ne: true }, apareceEnBusquedas: { $ne: false }, ocultaPorEquipo: { $ne: true }, ownerId: { $nin: excluidos } })
        .select("id name cat zone desc services specialties loc lat lng delivery reviews").limit(300).lean(),
      candidatosDe(Oficio, [visible(h, excluidos), ...zona.y], palabras, { updatedAt: -1, _id: 1 }),
      candidatosDe(Alquiler, [visible(h, excluidos), ...zona.y], palabras, { actualizadoEn: -1, _id: 1 }),
      chatsPropiosConNegocios(usuario), // solo los chats de esta cuenta
    ]);

    // negocios: km (calculados acá) y reseñas; los más cercanos primero si hay ubicación
    const negocios = filasN.map((b) => ({ b, km: tieneUbicacion ? distanciaKm(b.lat, b.lng, miLat, miLng) : null, resenas: resumenResenas(b.reviews) }));
    if (tieneUbicacion) negocios.sort((x, y) => (x.km ?? 1e9) - (y.km ?? 1e9));
    const negociosIA = negocios.slice(0, 120);
    const oficios = filasO.map((o) => oficioPublico(o, h, null));
    const alquileres = filasA.map((a) => { const p = alquilerPublico(a, null, ahora); delete p.articulos; return p; });

    const systemPrompt = armarPrompt({
      lineasNegocios: negociosIA.map(({ b, km, resenas }) => lineaNegocio(b, km, resenas, ETIQUETA_CATEGORIA_NEGOCIO[b.cat] || b.cat)),
      lineasOficios: oficios.map(lineaOficio),
      lineasAlquileres: alquileres.map(lineaAlquiler),
      chats, tieneUbicacion,
    });

    const messages = [
      ...historial.slice(-8).map((m) => ({ role: m.rol === "cliente" ? "user" : "assistant", content: m.texto })),
      { role: "user", content: mensaje },
    ];

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-5", max_tokens: 450, system: systemPrompt, messages }),
    });
    if (!anthropicRes.ok) {
      console.error("Error de Anthropic:", await anthropicRes.text());
      return res.status(502).json({ respuesta: "No pude conectarme con el asistente en este momento. Probá de nuevo en un rato.", negocios: [], resultados: [] });
    }
    const data = await anthropicRes.json();
    const { visible: respuesta, ids } = separarRespuesta((data.content || []).map((c) => c.text || "").join("\n"));

    // Solo salen fichas que de verdad se le pasaron a la IA; los datos de cada una los pone el servidor, no la IA
    const candidatos = { n: new Map(negociosIA.map((x) => [x.b.id, x])), o: new Map(oficios.map((o) => [o.id, o])), a: new Map(alquileres.map((a) => [a.id, a])) };
    const resultados = elegirValidos(ids, candidatos).map(({ tipo, id }) => {
      if (tipo === "negocio") { const { km, resenas } = candidatos.n.get(id); return { tipo, id, km: km == null ? null : Math.round(km * 10) / 10, promedio: resenas.promedio, cantidad: resenas.cantidad }; }
      return { tipo, id, ficha: candidatos[tipo === "oficio" ? "o" : "a"].get(id) };
    });
    res.json({ respuesta, negocios: resultados.filter((r) => r.tipo === "negocio").map((r) => r.id), resultados });
  } catch (e) {
    console.error(e);
    res.status(500).json({ respuesta: "Ocurrió un error buscando. Probá de nuevo.", negocios: [], resultados: [] });
  }
});

export default router;
