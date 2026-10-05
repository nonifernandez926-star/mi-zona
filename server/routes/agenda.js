import express from "express";
import AgendaItem from "../models/AgendaItem.js";
import Business from "../models/Business.js";
import { identificar, requiereUsuario, compararSeguro } from "../utils/auth.js";
import { ahoraArgentina, sumarDias, nombreDia } from "../utils/fechas.js";
import { perfilAgenda } from "../utils/agendaPerfiles.js";
import { interpretar, responderSobreAgenda } from "../utils/agendaIA.js";
import { recordatorioDebido, enviarRecordatoriosPush } from "../utils/recordatorios.js";
import { FOTOS_POR_DIA, fotosRestantes, consumirFoto, devolverFoto } from "../utils/fotosAgenda.js";

const router = express.Router();

const TIPOS_IMAGEN = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const RE_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const minutosDe = (hora) => { const [h, m] = hora.split(":").map(Number); return h * 60 + m; };

// La agenda es SOLO para dueños: hace falta tener al menos un negocio en la cuenta. El primero define el rubro.
async function requiereDueno(req, res, next) {
  try {
    const negocios = await Business.find({ ownerId: String(req.actor.usuario._id) }).sort({ createdAt: 1 }).select("cat name status pendientePago expiresAt asistenteActivo");
    if (!negocios.length) return res.status(403).json({ error: "La agenda es para dueños de negocios." });
    req.negocio = negocios[0];
    req.tieneNegocioActivo = negocios.some((n) => n.status === "active" && !n.pendientePago);
    req.tieneAsistente = negocios.some((n) => n.asistenteActivo);
    next();
  } catch (e) {
    next(e);
  }
}
const base = [identificar, requiereUsuario, requiereDueno];

// Las funciones con IA cuestan plata: solo con un negocio activo (pago) y con un tope por persona por hora
const usoIA = new Map();
function validarIA(req, res) {
  if (!process.env.ANTHROPIC_API_KEY) { res.status(503).json({ error: "La inteligencia artificial todavía no está configurada en el servidor." }); return false; }
  if (req.actor.usuario.privacidad?.iaAgenda === false) { res.status(403).json({ error: "Desactivaste el uso de IA con tu agenda en Privacidad. Podés volver a activarlo ahí." }); return false; }
  if (!req.tieneNegocioActivo) { res.status(402).json({ error: "Las funciones con IA se habilitan cuando tu negocio tiene la suscripción activa." }); return false; }
  const id = String(req.actor.usuario._id);
  const ahora = Date.now();
  const lista = (usoIA.get(id) || []).filter((t) => ahora - t < 3600 * 1000);
  if (lista.length >= 40) { res.status(429).json({ error: "Usaste muchas funciones con IA en poco tiempo. Probá de nuevo en un rato." }); return false; }
  lista.push(ahora);
  usoIA.set(id, lista);
  return true;
}

// Toma los datos que manda la web y deja solo los campos permitidos, con formato válido
function sanearItem(b, parcial = false) {
  const out = {};
  if (!parcial || b.titulo !== undefined) {
    const titulo = String(b.titulo || "").replace(/\s+/g, " ").trim().slice(0, 140);
    if (!titulo) return { error: "Escribí un título." };
    out.titulo = titulo;
  }
  if (b.tipo !== undefined) out.tipo = b.tipo === "tarea" ? "tarea" : "evento";
  if (b.fecha !== undefined) {
    if (b.fecha === "" || b.fecha === null) out.fecha = undefined;
    else if (!RE_FECHA.test(b.fecha)) return { error: "La fecha no es válida." };
    else out.fecha = b.fecha;
  }
  if (b.hora !== undefined) {
    if (b.hora === "" || b.hora === null) out.hora = undefined;
    else if (!RE_HORA.test(b.hora)) return { error: "La hora no es válida." };
    else out.hora = b.hora;
  }
  if (b.duracionMinutos !== undefined) { const d = Number(b.duracionMinutos); out.duracionMinutos = Number.isFinite(d) ? Math.min(1440, Math.max(5, Math.round(d))) : 30; }
  if (b.persona !== undefined) out.persona = String(b.persona || "").trim().slice(0, 80);
  if (b.notas !== undefined) out.notas = String(b.notas || "").trim().slice(0, 600);
  if (b.categoria !== undefined) out.categoria = String(b.categoria || "general").trim().slice(0, 40) || "general";
  if (b.recordatorioMinutos !== undefined) {
    const r = Number(b.recordatorioMinutos);
    out.recordatorioMinutos = b.recordatorioMinutos === null || b.recordatorioMinutos === "" || !Number.isFinite(r) || r < 0 ? null : Math.min(r, 60 * 24 * 14);
    out.avisoAppMostrado = false; // si cambió el aviso, vuelve a quedar pendiente
    out.avisoPushEnviado = false;
  }
  if (b.origen !== undefined && ["manual", "foto", "mensaje"].includes(b.origen)) out.origen = b.origen;
  return { datos: out };
}

// Junta todo lo del día: eventos + tareas pendientes (las vencidas también) + avisos de poco margen entre eventos
async function armarDia(usuarioId, fecha) {
  const [eventos, tareas] = await Promise.all([
    AgendaItem.find({ usuarioId, tipo: "evento", fecha }).lean(),
    AgendaItem.find({ usuarioId, tipo: "tarea", completada: false, $or: [{ fecha: { $lte: fecha } }, { fecha: { $exists: false } }, { fecha: null }, { fecha: "" }] }).lean(),
  ]);
  eventos.sort((a, b) => {
    if (!a.hora && !b.hora) return 0;
    if (!a.hora) return -1; // los "todo el día" van arriba
    if (!b.hora) return 1;
    return minutosDe(a.hora) - minutosDe(b.hora);
  });

  const avisos = [];
  const conHora = eventos.filter((e) => e.hora);
  for (let i = 0; i < conHora.length - 1; i++) {
    const a = conHora[i], b = conHora[i + 1];
    const margen = minutosDe(b.hora) - (minutosDe(a.hora) + (a.duracionMinutos || 30));
    if (margen < 0) avisos.push(`"${a.titulo}" (${a.hora}) se superpone con "${b.titulo}" (${b.hora}).`);
    else if (margen < 30) avisos.push(`Tenés solo ${margen} min entre "${a.titulo}" y "${b.titulo}".`);
  }
  const vencidas = tareas.filter((t) => t.fecha && t.fecha < fecha);
  if (vencidas.length) avisos.push(`Tenés ${vencidas.length} ${vencidas.length === 1 ? "tarea vencida" : "tareas vencidas"} sin completar.`);
  return { fecha, diaSemana: nombreDia(fecha), eventos, tareas, avisos };
}

const uid = (req) => String(req.actor.usuario._id);

// GET /api/agenda/perfil → tipos de evento y tareas sugeridas para el rubro
router.get("/perfil", base, async (req, res) => {
  try {
    res.json({
      ...perfilAgenda(req.negocio.cat),
      aiDisponible: Boolean(process.env.ANTHROPIC_API_KEY) && req.tieneNegocioActivo && req.actor.usuario.privacidad?.iaAgenda !== false,
      tieneAsistente: req.tieneAsistente, // si no lo tiene, la web le ofrece descargar Mi Asistente
      fotosPorDia: FOTOS_POR_DIA,
      fotosRestantesHoy: await fotosRestantes(uid(req), ahoraArgentina().fecha),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo cargar la agenda" });
  }
});

// GET /api/agenda/hoy → la vista "Hoy"
router.get("/hoy", base, async (req, res) => {
  try {
    res.json(await armarDia(uid(req), ahoraArgentina().fecha));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo cargar tu día" });
  }
});

// GET /api/agenda/semana → los próximos 7 días
router.get("/semana", base, async (req, res) => {
  try {
    const hoy = ahoraArgentina().fecha;
    const fechas = Array.from({ length: 7 }, (_, i) => sumarDias(hoy, i));
    const eventos = await AgendaItem.find({ usuarioId: uid(req), tipo: "evento", fecha: { $in: fechas } }).lean();
    const dias = fechas.map((f) => ({
      fecha: f,
      diaSemana: nombreDia(f),
      eventos: eventos.filter((e) => e.fecha === f).sort((a, b) => (a.hora || "").localeCompare(b.hora || "")),
    }));
    res.json({ dias });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo cargar la semana" });
  }
});

// GET /api/agenda/tareas → pendientes y las completadas hace poco
router.get("/tareas", base, async (req, res) => {
  try {
    const hace7 = new Date(Date.now() - 7 * 86400 * 1000);
    const [pendientes, hechas] = await Promise.all([
      AgendaItem.find({ usuarioId: uid(req), tipo: "tarea", completada: false }).lean(),
      AgendaItem.find({ usuarioId: uid(req), tipo: "tarea", completada: true, completadaEn: { $gte: hace7 } }).sort({ completadaEn: -1 }).limit(30).lean(),
    ]);
    pendientes.sort((a, b) => (a.fecha || "9999").localeCompare(b.fecha || "9999")); // las "sin fecha" al final
    res.json({ pendientes, hechas });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudieron cargar las tareas" });
  }
});

// POST /api/agenda → crear a mano
router.post("/", base, async (req, res) => {
  try {
    const { datos, error } = sanearItem(req.body || {});
    if (error) return res.status(400).json({ error });
    if ((datos.tipo || "evento") === "evento" && !datos.fecha) return res.status(400).json({ error: "Un evento necesita una fecha." });
    const item = await AgendaItem.create({ ...datos, usuarioId: uid(req) });
    res.status(201).json(item);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo guardar" });
  }
});

// POST /api/agenda/guardar-propuestas → guarda varios a la vez, los que el dueño ya revisó y confirmó
router.post("/guardar-propuestas", base, async (req, res) => {
  try {
    const lista = Array.isArray(req.body?.items) ? req.body.items.slice(0, 40) : [];
    const origen = ["foto", "mensaje"].includes(req.body?.origen) ? req.body.origen : "manual";
    const docs = [];
    for (const x of lista) {
      const { datos, error } = sanearItem({ ...x, origen });
      if (error) continue;
      if ((datos.tipo || "evento") === "evento" && !datos.fecha) continue;
      docs.push({ ...datos, usuarioId: uid(req) });
    }
    const creados = docs.length ? await AgendaItem.insertMany(docs) : [];
    res.status(201).json({ guardados: creados.length, omitidos: lista.length - creados.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo guardar" });
  }
});

// GET /api/agenda/recordatorios → avisos que ya llegaron a su hora (la web los consulta cada minuto mientras está abierta)
router.get("/recordatorios", base, async (req, res) => {
  try {
    const candidatos = await AgendaItem.find({
      usuarioId: uid(req), completada: false, avisoAppMostrado: false, recordatorioMinutos: { $ne: null }, fecha: { $exists: true, $ne: "" },
    }).lean();
    const debidos = candidatos.filter((i) => recordatorioDebido(i));
    if (debidos.length) await AgendaItem.updateMany({ _id: { $in: debidos.map((d) => d._id) } }, { $set: { avisoAppMostrado: true } });
    res.json({ recordatorios: debidos.map((d) => ({ id: d._id, titulo: d.titulo, tipo: d.tipo, fecha: d.fecha, hora: d.hora, persona: d.persona })) });
  } catch (e) {
    res.status(500).json({ error: "No se pudieron revisar los recordatorios" });
  }
});

// POST /api/agenda/enviar-recordatorios (header x-cron-key) → para un cron externo: manda los avisos por notificación al celular
router.post("/enviar-recordatorios", async (req, res) => {
  try {
    if (!process.env.CRON_KEY) return res.status(503).json({ error: "Falta CRON_KEY en el servidor." });
    if (!compararSeguro(req.headers["x-cron-key"] || "", process.env.CRON_KEY)) return res.status(401).json({ error: "Clave inválida" });
    res.json(await enviarRecordatoriosPush());
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/agenda/interpretar { texto } → "El jueves a las 16 reunión con Martín" => eventos/tareas propuestos
router.post("/interpretar", base, async (req, res) => {
  try {
    const texto = String(req.body?.texto || "").trim().slice(0, 2500);
    if (texto.length < 3) return res.status(400).json({ error: "Escribí qué querés agendar." });
    if (!validarIA(req, res)) return;
    res.json(await interpretar({ texto, hoy: ahoraArgentina().fecha, perfil: perfilAgenda(req.negocio.cat) }));
  } catch (e) {
    console.error("Error interpretando texto de agenda:", e.message);
    res.status(500).json({ error: "No pude interpretar el mensaje. Probá de nuevo." });
  }
});

// POST /api/agenda/interpretar-foto { imagen (base64 sin prefijo), mediaType } → foto de una agenda de papel => propuestas.
// La foto se analiza en memoria y se descarta: no se guarda en ningún lado.
router.post("/interpretar-foto", base, async (req, res) => {
  try {
    const { imagen, mediaType } = req.body || {};
    if (!imagen || typeof imagen !== "string") return res.status(400).json({ error: "Falta la foto." });
    if (!TIPOS_IMAGEN.includes(mediaType)) return res.status(400).json({ error: "Subí una imagen JPG, PNG o WEBP." });
    if (imagen.length > 4_200_000) return res.status(413).json({ error: "La foto es muy pesada. Probá con otra." });
    if (!/^[A-Za-z0-9+/=\s]+$/.test(imagen.slice(0, 2000))) return res.status(400).json({ error: "La foto no es válida." });
    if (!validarIA(req, res)) return;
    // Límite: 2 fotos por día por persona (hora argentina). Si la IA falla, la foto no cuenta.
    const hoy = ahoraArgentina().fecha;
    if (!(await consumirFoto(uid(req), hoy))) {
      return res.status(429).json({ error: `Ya usaste tus ${FOTOS_POR_DIA} fotos de hoy. Mañana podés importar más, o agregá tus eventos escribiéndolos.`, fotosRestantesHoy: 0 });
    }
    try {
      const resultado = await interpretar({ imagenBase64: imagen.replace(/\s/g, ""), mediaType, hoy, perfil: perfilAgenda(req.negocio.cat) });
      res.json({ ...resultado, fotosRestantesHoy: await fotosRestantes(uid(req), hoy) });
    } catch (e) {
      await devolverFoto(uid(req), hoy);
      throw e;
    }
  } catch (e) {
    console.error("Error interpretando foto de agenda:", e.message);
    res.status(500).json({ error: "No pude leer la foto. Probá con una más nítida y bien iluminada. Esta foto no cuenta en tu límite." });
  }
});

// POST /api/agenda/organizar-dia { fecha? } → resumen del día con avisos
router.post("/organizar-dia", base, async (req, res) => {
  try {
    const fecha = RE_FECHA.test(String(req.body?.fecha || "")) ? req.body.fecha : ahoraArgentina().fecha;
    const dia = await armarDia(uid(req), fecha);
    const datos = {
      fecha, diaSemana: dia.diaSemana,
      eventos: dia.eventos.map((e) => ({ hora: e.hora || "todo el día", duracionMin: e.duracionMinutos, titulo: e.titulo, persona: e.persona, notas: e.notas })),
      tareasPendientes: dia.tareas.slice(0, 20).map((t) => ({ titulo: t.titulo, fecha: t.fecha || "sin fecha" })),
      avisosDetectados: dia.avisos,
    };
    // Texto de respaldo (sin IA), por si Claude no responde o no hay nada que organizar
    const respaldo = () => {
      if (!dia.eventos.length && !dia.tareas.length) return "Tu día está libre: no tenés eventos ni tareas pendientes. 🎉";
      const lineas = dia.eventos.map((e) => `• ${e.hora || "Todo el día"} — ${e.titulo}${e.persona ? ` (${e.persona})` : ""}`);
      if (dia.tareas.length) lineas.push(`• ${dia.tareas.length} ${dia.tareas.length === 1 ? "tarea pendiente" : "tareas pendientes"}`);
      dia.avisos.forEach((a) => lineas.push(`⚠️ ${a}`));
      return lineas.join("\n");
    };
    if (!dia.eventos.length && !dia.tareas.length) return res.json({ resumen: respaldo(), avisos: dia.avisos });

    let resumen = respaldo();
    const sinRespuesta = { status: () => ({ json: () => {} }) }; // si la IA no está disponible, devolvemos el resumen simple sin error
    if (validarIA(req, sinRespuesta)) {
      try {
        resumen = (await responderSobreAgenda({
          instruccion: "Organizá mi día: armá un plan corto en orden de horarios, marcá lo más urgente y advertime si hay poco tiempo entre una cosa y otra. Terminá con una frase de ánimo corta.",
          datos, hoy: fecha,
        })) || resumen;
      } catch (e) { console.error("Error organizando el día:", e.message); }
    }
    res.json({ resumen, avisos: dia.avisos });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo organizar tu día" });
  }
});

// POST /api/agenda/preguntar { pregunta } → "¿Qué tengo pendiente esta semana?"
router.post("/preguntar", base, async (req, res) => {
  try {
    const pregunta = String(req.body?.pregunta || "").trim().slice(0, 300);
    if (pregunta.length < 3) return res.status(400).json({ error: "Escribí tu pregunta." });
    if (!validarIA(req, res)) return;
    const hoy = ahoraArgentina().fecha;
    const [eventos, tareas] = await Promise.all([
      AgendaItem.find({ usuarioId: uid(req), tipo: "evento", fecha: { $gte: sumarDias(hoy, -2), $lte: sumarDias(hoy, 30) } }).sort({ fecha: 1, hora: 1 }).limit(80).lean(),
      AgendaItem.find({ usuarioId: uid(req), tipo: "tarea", completada: false }).limit(80).lean(),
    ]);
    const datos = {
      hoy, diaSemanaHoy: nombreDia(hoy),
      eventos: eventos.map((e) => ({ fecha: e.fecha, dia: nombreDia(e.fecha), hora: e.hora || "todo el día", titulo: e.titulo, persona: e.persona, notas: e.notas })),
      tareasPendientes: tareas.map((t) => ({ titulo: t.titulo, fecha: t.fecha || "sin fecha", notas: t.notas })),
    };
    const respuesta = await responderSobreAgenda({ instruccion: `Respondé esta pregunta del dueño usando solo su agenda: "${pregunta}"`, datos, hoy });
    res.json({ respuesta: respuesta || "No encontré nada en tu agenda para esa consulta." });
  } catch (e) {
    console.error("Error respondiendo sobre la agenda:", e.message);
    res.status(500).json({ error: "No pude consultar tu agenda en este momento." });
  }
});

// PUT /api/agenda/:id/completar { completada }
router.put("/:id/completar", base, async (req, res) => {
  try {
    const completada = req.body?.completada !== false;
    const item = await AgendaItem.findOneAndUpdate(
      { _id: String(req.params.id), usuarioId: uid(req) },
      { $set: { completada, completadaEn: completada ? new Date() : undefined } },
      { new: true }
    );
    if (!item) return res.status(404).json({ error: "No se encontró" });
    res.json(item);
  } catch (e) {
    res.status(500).json({ error: "No se pudo actualizar" });
  }
});

// PUT /api/agenda/:id → editar
router.put("/:id", base, async (req, res) => {
  try {
    const { datos, error } = sanearItem(req.body || {}, true);
    if (error) return res.status(400).json({ error });
    const item = await AgendaItem.findOneAndUpdate({ _id: String(req.params.id), usuarioId: uid(req) }, { $set: datos }, { new: true });
    if (!item) return res.status(404).json({ error: "No se encontró" });
    res.json(item);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo guardar" });
  }
});

// DELETE /api/agenda/:id
router.delete("/:id", base, async (req, res) => {
  try {
    await AgendaItem.deleteOne({ _id: String(req.params.id), usuarioId: uid(req) });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "No se pudo eliminar" });
  }
});

export default router;
