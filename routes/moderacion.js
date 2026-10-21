import express from "express";
import mongoose from "mongoose";
import Denuncia from "../models/Denuncia.js";
import Medida from "../models/Medida.js";
import Usuario from "../models/Usuario.js";
import AccionModeracion from "../models/AccionModeracion.js";
import { identificar, requiereUsuario, limitar } from "../utils/auth.js";
import { ingresarAlPanel, adminOk, registrarAccion } from "../utils/adminAuth.js";
import { LIM, DIAS_SUSPENSION, MOTIVO_TEXTO, OBJETOS, limpiarTexto, medidaPublica, puedeApelar, suspensionVigente } from "../utils/moderacion.js";
import { resolverObjeto, estadoDeObjetos, mostrarObjeto } from "../utils/objetosDenunciables.js";
import { advertir, ocultarContenido, limpiarPerfilDe, suspender, levantarSuspension, revertirMedida, cerrarDenuncias, avisarDenunciantes, avisarAlEquipo } from "../utils/medidas.js";
import { enviarPushAUsuario } from "../utils/push.js";
import { PANEL_MODERACION } from "../utils/panelModeracion.js";

const router = express.Router();

/* =====================  PANEL DEL EQUIPO (fuera de la app)  =====================
   Clave del equipo + código de la app autenticadora. No se enlaza desde la app. Cada acción queda en el registro. */
const admin = express.Router();
const POR_PAGINA = 50;
const idOk = (id) => mongoose.isValidObjectId(id);
const codigoD = (d) => `MD-${String(d._id).slice(-6).toUpperCase()}`;
const quien = (u) => (u ? { id: String(u._id), usuario: u.usuario || "", nombre: u.nombre || "" } : null);

admin.post("/login", ingresarAlPanel);
admin.use(adminOk);

// GET /admin/denuncias?estado=abierta|resuelta|descartada  → agrupadas por lo denunciado (varias personas pueden denunciar lo mismo)
admin.get("/denuncias", async (req, res) => {
  try {
    const estado = ["abierta", "resuelta", "descartada"].includes(req.query.estado) ? req.query.estado : "abierta";
    const filas = await Denuncia.find({ estado }).sort({ createdAt: 1 }).limit(400).lean();
    const grupos = new Map();
    for (const d of filas) {
      const k = `${d.objetoTipo}:${d.objetoId}`;
      if (!grupos.has(k)) grupos.set(k, { clave: k, denunciaId: String(d._id), objetoTipo: d.objetoTipo, tipo: OBJETOS[d.objetoTipo], objetoId: d.objetoId, duenoId: d.duenoId, snapshot: d.snapshot, estado: d.estado, resolucion: d.resolucion, primera: d.createdAt, denuncias: [] });
      const g = grupos.get(k);
      g.denuncias.push({ codigo: codigoD(d), motivo: MOTIVO_TEXTO[d.motivo], detalle: d.detalle, fecha: d.createdAt });
    }
    let lista = [...grupos.values()];
    lista.sort((a, b) => estado === "abierta" ? b.denuncias.length - a.denuncias.length || new Date(a.primera) - new Date(b.primera) : new Date(b.primera) - new Date(a.primera));
    lista = lista.slice(0, POR_PAGINA);
    const [estados, duenos] = await Promise.all([
      estadoDeObjetos(lista.map((g) => [g.objetoTipo, g.objetoId])),
      Usuario.find({ _id: { $in: lista.map((g) => g.duenoId).filter(idOk) } }).select("usuario nombre suspension").lean(),
    ]);
    const pDuenos = new Map(duenos.map((u) => [String(u._id), u]));
    res.json({ grupos: lista.map((g) => ({ ...g, cantidad: g.denuncias.length, vivo: estados.get(g.clave) || { existe: false, oculto: false }, dueno: quien(pDuenos.get(g.duenoId)), duenoSuspendido: !!suspensionVigente(pDuenos.get(g.duenoId)) })) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudieron cargar las denuncias." });
  }
});

// Carga la denuncia, lo denunciado y a su dueño; las acciones de abajo la usan
async function contexto(req, res) {
  if (!idOk(req.params.id)) { res.status(404).json({ error: "No existe esa denuncia." }); return null; }
  const d = await Denuncia.findById(req.params.id);
  if (!d) { res.status(404).json({ error: "No existe esa denuncia." }); return null; }
  const motivo = limpiarTexto(req.body?.motivo, LIM.motivoMedida[1]);
  return { d, motivo, objeto: { tipo: d.objetoTipo, id: d.objetoId, snapshot: d.snapshot } };
}
const faltaMotivo = (motivo, res) => {
  if (motivo.length < LIM.motivoMedida[0]) { res.status(400).json({ error: `Escribí el motivo que se le va a explicar a la persona (al menos ${LIM.motivoMedida[0]} letras).` }); return true; }
  return false;
};
const sinDueno = (d, res) => {
  if (!d.duenoId || !idOk(d.duenoId)) { res.status(400).json({ error: "Esto no tiene una cuenta dueña (negocio viejo sin dueño): solo se puede ocultar o descartar." }); return true; }
  return false;
};

async function cerrarYRegistrar(req, d, { estado, accion, nota, medida, extra = "" }) {
  const abiertas = await cerrarDenuncias(d.objetoTipo, d.objetoId, { estado, accion, nota, medidaId: medida ? String(medida._id) : "" });
  avisarDenunciantes(abiertas, estado === "resuelta");
  const ok = await registrarAccion(req, { accion, objetivo: { tipo: d.objetoTipo, id: d.objetoId, usuarioId: d.duenoId }, detalle: `${nota || ""} ${extra}`.trim(), denunciaIds: abiertas.map((x) => x._id), medidaId: medida ? medida._id : "" });
  return { ok: true, cerradas: abiertas.length, aviso: ok ? "" : "La acción se hizo pero no se pudo escribir el registro." };
}

admin.post("/denuncias/:id/descartar", async (req, res) => {
  try {
    const c = await contexto(req, res); if (!c) return;
    res.json(await cerrarYRegistrar(req, c.d, { estado: "descartada", accion: "descartar", nota: limpiarTexto(req.body?.nota, LIM.nota) }));
  } catch (e) { console.error(e); res.status(500).json({ error: "No se pudo completar la acción." }); }
});

admin.post("/denuncias/:id/ocultar", async (req, res) => {
  try {
    const c = await contexto(req, res); if (!c) return;
    if (c.d.objetoTipo === "perfil") return res.status(400).json({ error: "Un perfil no se oculta: usá «Quitar foto y descripción» o suspender." });
    if (faltaMotivo(c.motivo, res) || sinDueno(c.d, res)) return;
    const m = await ocultarContenido(c.d.duenoId, c.objeto, c.motivo, [String(c.d._id)]);
    res.json(await cerrarYRegistrar(req, c.d, { estado: "resuelta", accion: "ocultar", nota: c.motivo, medida: m }));
  } catch (e) { console.error(e); res.status(500).json({ error: "No se pudo completar la acción." }); }
});

admin.post("/denuncias/:id/limpiar-perfil", async (req, res) => {
  try {
    const c = await contexto(req, res); if (!c) return;
    if (c.d.objetoTipo !== "perfil") return res.status(400).json({ error: "Esta acción es solo para perfiles." });
    if (faltaMotivo(c.motivo, res) || sinDueno(c.d, res)) return;
    const m = await limpiarPerfilDe(c.d.duenoId, c.objeto, c.motivo, [String(c.d._id)]);
    if (!m) return res.status(404).json({ error: "La cuenta ya no existe." });
    res.json(await cerrarYRegistrar(req, c.d, { estado: "resuelta", accion: "limpiar_perfil", nota: c.motivo, medida: m }));
  } catch (e) { console.error(e); res.status(500).json({ error: "No se pudo completar la acción." }); }
});

admin.post("/denuncias/:id/advertir", async (req, res) => {
  try {
    const c = await contexto(req, res); if (!c) return;
    if (faltaMotivo(c.motivo, res) || sinDueno(c.d, res)) return;
    const m = await advertir(c.d.duenoId, c.motivo, [String(c.d._id)]);
    res.json(await cerrarYRegistrar(req, c.d, { estado: "resuelta", accion: "advertir", nota: c.motivo, medida: m }));
  } catch (e) { console.error(e); res.status(500).json({ error: "No se pudo completar la acción." }); }
});

function datosSuspension(body, res) {
  const motivo = limpiarTexto(body?.motivo, LIM.motivoMedida[1]);
  if (faltaMotivo(motivo, res)) return null;
  const permanente = body?.permanente === true;
  const dias = Number(body?.dias);
  if (!permanente && !DIAS_SUSPENSION.includes(dias)) { res.status(400).json({ error: "Elegí cuántos días dura la suspensión (o permanente)." }); return null; }
  return { motivo, permanente, dias };
}

admin.post("/denuncias/:id/suspender", async (req, res) => {
  try {
    const c = await contexto(req, res); if (!c) return;
    if (sinDueno(c.d, res)) return;
    const s = datosSuspension(req.body, res); if (!s) return;
    const m = await suspender(c.d.duenoId, { ...s, denunciaIds: [String(c.d._id)] });
    res.json(await cerrarYRegistrar(req, c.d, { estado: "resuelta", accion: "suspender", nota: s.motivo, medida: m, extra: s.permanente ? "(permanente)" : `(${s.dias} días)` }));
  } catch (e) { console.error(e); res.status(500).json({ error: "No se pudo completar la acción." }); }
});

// ---- Cuentas (sin pasar por una denuncia) ----
admin.get("/usuarios", async (req, res) => {
  try {
    const q = limpiarTexto(req.query.q, 30).toLowerCase().replace(/[^a-z0-9._]/g, "");
    if (q.length < 3) return res.status(400).json({ error: "Escribí al menos 3 letras del usuario." });
    const us = await Usuario.find({ usuario: { $regex: `^${q}` } }).select("usuario nombre createdAt suspension").limit(10).lean();
    const ids = us.map((u) => String(u._id));
    const [medidas, recibidas] = await Promise.all([
      Medida.find({ usuarioId: { $in: ids } }).sort({ createdAt: -1 }).limit(60).lean(),
      Denuncia.aggregate([{ $match: { duenoId: { $in: ids } } }, { $group: { _id: "$duenoId", n: { $sum: 1 } } }]),
    ]);
    const nRec = new Map(recibidas.map((r) => [r._id, r.n]));
    res.json({ usuarios: us.map((u) => ({ ...quien(u), desde: u.createdAt, suspension: suspensionVigente(u), denunciasRecibidas: nRec.get(String(u._id)) || 0, medidas: medidas.filter((m) => m.usuarioId === String(u._id)).slice(0, 8).map((m) => ({ id: String(m._id), tipo: m.tipo, motivo: m.motivo, estado: m.estado, desde: m.desde, hasta: m.hasta, permanente: m.permanente })) })) });
  } catch (e) { console.error(e); res.status(500).json({ error: "No se pudo buscar." }); }
});

admin.post("/usuarios/:id/advertir", async (req, res) => {
  try {
    if (!idOk(req.params.id) || !(await Usuario.exists({ _id: req.params.id }))) return res.status(404).json({ error: "No existe esa cuenta." });
    const motivo = limpiarTexto(req.body?.motivo, LIM.motivoMedida[1]); if (faltaMotivo(motivo, res)) return;
    const m = await advertir(req.params.id, motivo);
    await registrarAccion(req, { accion: "advertir", objetivo: { tipo: "cuenta", id: req.params.id, usuarioId: req.params.id }, detalle: motivo, medidaId: m._id });
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: "No se pudo completar la acción." }); }
});

admin.post("/usuarios/:id/suspender", async (req, res) => {
  try {
    if (!idOk(req.params.id) || !(await Usuario.exists({ _id: req.params.id }))) return res.status(404).json({ error: "No existe esa cuenta." });
    const s = datosSuspension(req.body, res); if (!s) return;
    const m = await suspender(req.params.id, s);
    await registrarAccion(req, { accion: "suspender", objetivo: { tipo: "cuenta", id: req.params.id, usuarioId: req.params.id }, detalle: `${s.motivo} ${s.permanente ? "(permanente)" : `(${s.dias} días)`}`, medidaId: m._id });
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: "No se pudo completar la acción." }); }
});

admin.post("/usuarios/:id/levantar", async (req, res) => {
  try {
    if (!idOk(req.params.id) || !(await Usuario.exists({ _id: req.params.id }))) return res.status(404).json({ error: "No existe esa cuenta." });
    await levantarSuspension(req.params.id);
    enviarPushAUsuario(req.params.id, { titulo: "Levantamos la suspensión de tu cuenta", cuerpo: "Ya podés usar Mi Zona con normalidad.", url: "/" }, "soporte").catch(() => {});
    await registrarAccion(req, { accion: "levantar", objetivo: { tipo: "cuenta", id: req.params.id, usuarioId: req.params.id }, detalle: limpiarTexto(req.body?.nota, LIM.nota) });
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: "No se pudo completar la acción." }); }
});

// Volver a mostrar un contenido oculto (sin apelación)
admin.post("/contenido/mostrar", async (req, res) => {
  try {
    const tipo = String(req.body?.tipo || ""), id = String(req.body?.id || "");
    const o = await resolverObjeto(tipo, id);
    if (!o || tipo === "perfil") return res.status(404).json({ error: "No encontramos ese contenido." });
    await mostrarObjeto(tipo, id);
    await Medida.updateMany({ usuarioId: o.duenoId, tipo: "contenido_oculto", "objeto.id": id, estado: "activa" }, { $set: { estado: "levantada", levantadaEn: new Date() } });
    await registrarAccion(req, { accion: "mostrar", objetivo: { tipo, id, usuarioId: o.duenoId }, detalle: limpiarTexto(req.body?.nota, LIM.nota) });
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: "No se pudo completar la acción." }); }
});

// ---- Apelaciones ----
admin.get("/apelaciones", async (req, res) => {
  try {
    const estado = ["pendiente", "aceptada", "rechazada"].includes(req.query.estado) ? req.query.estado : "pendiente";
    const ms = await Medida.find({ "apelacion.estado": estado }).sort({ "apelacion.creadaEn": 1 }).limit(100).lean();
    const us = await Usuario.find({ _id: { $in: ms.map((m) => m.usuarioId).filter(idOk) } }).select("usuario nombre").lean();
    const p = new Map(us.map((u) => [String(u._id), u]));
    res.json({ apelaciones: ms.map((m) => ({ id: String(m._id), tipo: m.tipo, motivo: m.motivo, objeto: m.objeto?.tipo ? { tipo: m.objeto.tipo, titulo: m.objeto.titulo } : null, desde: m.desde, hasta: m.hasta, permanente: m.permanente, estadoMedida: m.estado, texto: m.apelacion.texto, respuesta: m.apelacion.respuesta, creadaEn: m.apelacion.creadaEn, usuario: quien(p.get(m.usuarioId)) })) });
  } catch (e) { console.error(e); res.status(500).json({ error: "No se pudieron cargar las apelaciones." }); }
});

admin.post("/apelaciones/:id", async (req, res) => {
  try {
    if (!idOk(req.params.id)) return res.status(404).json({ error: "No existe esa apelación." });
    const m = await Medida.findById(req.params.id);
    if (!m || m.apelacion?.estado !== "pendiente") return res.status(404).json({ error: "Esa apelación no está pendiente." });
    const aceptar = req.body?.decision === "aceptar";
    if (!aceptar && req.body?.decision !== "rechazar") return res.status(400).json({ error: "Elegí aceptar o rechazar." });
    const respuesta = limpiarTexto(req.body?.respuesta, LIM.motivoMedida[1]);
    if (respuesta.length < 5) return res.status(400).json({ error: "Escribí la respuesta que va a leer la persona." });
    m.apelacion.estado = aceptar ? "aceptada" : "rechazada"; m.apelacion.respuesta = respuesta; m.apelacion.resueltaEn = new Date();
    if (aceptar) await revertirMedida(m); else await m.save();
    enviarPushAUsuario(m.usuarioId, { titulo: aceptar ? "Aceptamos tu apelación" : "Revisamos tu apelación", cuerpo: "Abrí Mi Zona para leer la respuesta del equipo.", url: "/?ir=avisos" }, "soporte").catch(() => {});
    await registrarAccion(req, { accion: aceptar ? "apelacion_aceptada" : "apelacion_rechazada", objetivo: { tipo: "cuenta", id: m.usuarioId, usuarioId: m.usuarioId }, detalle: respuesta, medidaId: m._id });
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: "No se pudo completar la acción." }); }
});

admin.get("/registro", async (req, res) => {
  try {
    const pagina = Math.max(1, parseInt(req.query.pagina, 10) || 1);
    const filas = await AccionModeracion.find({}).sort({ createdAt: -1 }).skip((pagina - 1) * POR_PAGINA).limit(POR_PAGINA).lean();
    res.json({ acciones: filas.map((a) => ({ fecha: a.createdAt, accion: a.accion, objetivo: a.objetivo, detalle: a.detalle, ip: a.ip })), pagina, hayMas: filas.length === POR_PAGINA });
  } catch (e) { res.status(500).json({ error: "No se pudo cargar el registro." }); }
});

router.use("/admin", admin);

// GET /api/moderacion/panel → página del equipo (pide clave + código; no guarda nada en el servidor; no está enlazada desde la app)
router.get("/panel", (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.send(PANEL_MODERACION);
});

/* =====================  LO QUE VE CADA PERSONA  ===================== */
router.use(identificar);

// GET /api/moderacion/medidas → avisos del equipo sobre mi cuenta (advertencias, contenidos ocultos, suspensiones)
router.get("/medidas", requiereUsuario, async (req, res) => {
  try {
    const ahora = new Date();
    const ms = await Medida.find({ usuarioId: String(req.actor.usuario._id) }).sort({ createdAt: -1 }).limit(50).lean();
    res.json({ medidas: ms.map((m) => medidaPublica(m, ahora)), sinVer: ms.filter((m) => !m.vistaEn && m.estado === "activa").length, suspension: suspensionVigente(req.actor.usuario, ahora) });
  } catch (e) {
    res.status(500).json({ error: "No pudimos cargar los avisos del equipo." });
  }
});

// POST /api/moderacion/medidas/:id/visto → «Entendido»
router.post("/medidas/:id/visto", requiereUsuario, async (req, res) => {
  try {
    if (!idOk(req.params.id)) return res.status(404).json({ error: "No encontramos ese aviso." });
    const r = await Medida.updateOne({ _id: req.params.id, usuarioId: String(req.actor.usuario._id), vistaEn: null }, { $set: { vistaEn: new Date() } });
    res.json({ ok: true, cambio: r.modifiedCount > 0 });
  } catch (e) {
    res.status(500).json({ error: "No se pudo guardar." });
  }
});

// POST /api/moderacion/medidas/:id/apelar   { texto } → una sola vez, dentro de los 30 días
router.post("/medidas/:id/apelar", requiereUsuario, limitar("apelar", 10, 3600 * 1000), async (req, res) => {
  try {
    if (!idOk(req.params.id)) return res.status(404).json({ error: "No encontramos ese aviso." });
    const texto = limpiarTexto(req.body?.texto, LIM.apelacion[1]);
    if (texto.length < LIM.apelacion[0]) return res.status(400).json({ error: `Contanos por qué creés que fue un error (al menos ${LIM.apelacion[0]} letras).` });
    const m = await Medida.findOne({ _id: req.params.id, usuarioId: String(req.actor.usuario._id) });
    if (!m) return res.status(404).json({ error: "No encontramos ese aviso." });
    if (!puedeApelar(m)) return res.status(409).json({ error: m.apelacion?.estado ? "Ya enviaste una apelación sobre esto." : "Ya pasó el plazo para apelar (30 días) o la medida ya no está vigente." });
    m.apelacion = { texto, creadaEn: new Date(), estado: "pendiente", respuesta: "", resueltaEn: null };
    await m.save();
    avisarAlEquipo("Nueva apelación pendiente en el panel de moderación");
    res.json({ medida: medidaPublica(m.toObject()) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No pudimos enviar tu apelación. Probá de nuevo." });
  }
});

export default router;
