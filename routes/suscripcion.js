import express from "express";
import crypto from "crypto";
import Business from "../models/Business.js";
import Usuario from "../models/Usuario.js";
import Compra from "../models/Compra.js";
import { identificar, requiereUsuario, compararSeguro, limitar } from "../utils/auth.js";
import { sanearNegocio } from "../utils/negocios.js";
import { PLANES, TIPOS, MES_GRATIS_MESES, productoConocido } from "../utils/planes.js";
import { hoyISO } from "../utils/fechas.js";
import { sincronizarCobertura } from "../utils/asistente.js";
import { revisarVencimientos } from "../utils/vencimientos.js";
import { declaracionPendiente } from "../utils/perfil.js";
import { suspensionVigente } from "../utils/moderacion.js";
import { fichaDelDueno, sumarTiempo } from "../utils/fichas.js";
import { playConfigurado, verificarCompra, reconocerCompra, hashToken } from "../utils/playBilling.js";
import { resumenInvitaciones } from "../utils/invitaciones.js";
import { resumenDeFicha } from "../utils/estadisticas.js";
import { diasHasta } from "../utils/fechas.js";

const router = express.Router();

function armarNegocioNuevo(datos, usuario) {
  const negocio = sanearNegocio(datos); // lista blanca: el resto (estado, vencimiento, dueño...) lo pone el servidor
  delete negocio.discounts; delete negocio.historias; delete negocio.busquedaEmpleo;
  return {
    ...negocio,
    id: crypto.randomBytes(8).toString("hex"),
    kind: "business",
    featured: false,
    status: "inactive", // se activa recién cuando empieza el mes gratis, se confirma una compra o lo cubre Mi Asistente
    pendientePago: true,
    createdAt: hoyISO(),
    expiresAt: null,
    lastRenewal: null,
    views: 0,
    reviews: [],
    discounts: [],
    historias: [],
    ownerId: String(usuario._id),
    ownerEmail: usuario.email,
    suscripcion: { plan: null, origen: null },
  };
}

// Una cuenta suspendida no puede activar ni comprar (sí puede entrar, leer el motivo y apelar)
const bloqueadaPorSuspension = (usuario, res) => {
  if (suspensionVigente(usuario)) { res.status(403).json({ error: "Tu cuenta está suspendida: por ahora no podés activar ni comprar. Revisá el aviso del equipo en Ajustes." }); return true; }
  return false;
};

// GET /api/suscripcion/planes → precios de referencia y ids de producto de Google Play, para los 3 tipos de ficha
router.get("/planes", (req, res) => res.json({ planes: PLANES, mesGratisMeses: MES_GRATIS_MESES, cobroDisponible: playConfigurado() }));

// GET /api/suscripcion/estado → qué mes gratis le queda a esta cuenta por tipo, y sus invitaciones y días disponibles
router.get("/estado", identificar, requiereUsuario, async (req, res) => {
  try {
    const u = req.actor.usuario;
    const usado = u.mesGratisUsado || {};
    res.json({
      mesGratisDisponible: Object.fromEntries(TIPOS.map((t) => [t, !usado[t]])),
      invitaciones: await resumenInvitaciones(u),
      cobroDisponible: playConfigurado(),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo cargar tu suscripción." });
  }
});

// GET /api/suscripcion/cobertura → ¿esta cuenta ya pagó Mi Asistente? (entonces el negocio no se cobra)
router.get("/cobertura", identificar, requiereUsuario, async (req, res) => {
  try {
    const c = await sincronizarCobertura(null, req.actor.usuario);
    res.json({ consultado: c.consultado, cubierto: c.cubierto, hasta: c.hasta });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo verificar tu suscripción de Mi Asistente." });
  }
});

// POST /api/suscripcion/iniciar   { business }
// Guarda el negocio NUEVO recién completado en el formulario SIN publicarlo. Después la persona elige: empezar el mes gratis o comprar con Google Play.
// Si la cuenta ya pagó Mi Asistente, se publica directo.
router.post("/iniciar", identificar, requiereUsuario, limitar("negocio-iniciar", 20, 3600 * 1000), async (req, res) => {
  try {
    const usuario = req.actor.usuario;
    if (bloqueadaPorSuspension(usuario, res)) return;
    const { business } = req.body || {};
    if (declaracionPendiente(usuario)) return res.status(403).json({ error: "Primero completá tu cuenta (18 años o más, términos y localidad)." });
    if (!business || typeof business !== "object" || Array.isArray(business)) return res.status(400).json({ error: "Datos del negocio inválidos." });
    const limpio = sanearNegocio(business);
    if (!limpio.name || !limpio.phone) return res.status(400).json({ error: "Completá el nombre y el teléfono del negocio." });
    if (!limpio.logo) return res.status(400).json({ error: "Subí el logo de tu negocio: es obligatorio." });
    if (!limpio.portada) return res.status(400).json({ error: "Elegí la foto de fondo de tu perfil." });

    const cob = await sincronizarCobertura(null, usuario);
    const datos = armarNegocioNuevo(business, usuario);
    // (La cobertura vale para UN negocio por cuenta: el segundo o tercero se activa con mes gratis o compra.)
    const yaUsoCobertura = await Business.exists({ ownerId: String(usuario._id), "suscripcion.origen": "asistente" });
    if (cob.cubierto && cob.hasta && !yaUsoCobertura) {
      const creado = await Business.create({
        ...datos, status: "active", pendientePago: false, expiresAt: cob.hasta, lastRenewal: hoyISO(),
        suscripcion: { plan: null, origen: "asistente" },
      });
      await sincronizarCobertura(creado, usuario); // conecta también el chat del asistente
      return res.json({ cubiertoPorAsistente: true, bizId: creado.id, expiresAt: creado.expiresAt });
    }

    // Si ya había cargado este mismo negocio y quedó sin activar (volvió atrás, cerró la app...), lo reutilizamos: no se duplica.
    const { id: _nuevoId, ...datosSinId } = datos;
    const previo = await Business.findOne({ ownerId: String(usuario._id), pendientePago: true, name: datos.name });
    let negocio;
    if (previo) { Object.assign(previo, datosSinId); await previo.save(); negocio = previo; }
    else negocio = await Business.create(datos);
    res.json({ bizId: negocio.id, pendientePago: true, mesGratisDisponible: !(usuario.mesGratisUsado?.negocio) });
  } catch (e) {
    console.error("Error guardando el negocio nuevo:", e);
    res.status(500).json({ error: "No se pudo guardar tu negocio. Probá de nuevo." });
  }
});

// POST /api/suscripcion/mes-gratis   { tipo, id }
// Regala un mes, sin tarjeta y sin pasar por Google Play. UNO por cuenta y por tipo de ficha (negocio, oficio, alquiler).
// La marca de "ya usado" se escribe de forma atómica: dos pedidos a la vez no pueden regalar dos meses.
router.post("/mes-gratis", identificar, requiereUsuario, limitar("mes-gratis", 20, 3600 * 1000), async (req, res) => {
  try {
    const usuario = req.actor.usuario;
    if (bloqueadaPorSuspension(usuario, res)) return;
    const { tipo, id } = req.body || {};
    if (!TIPOS.includes(tipo)) return res.status(400).json({ error: "Tipo de ficha inválido." });
    const ficha = await fichaDelDueno(tipo, id, usuario._id);
    if (!ficha) return res.status(404).json({ error: "No encontramos esa ficha en tu cuenta." });
    if (ficha.ocultaPorEquipo === true) return res.status(403).json({ error: "Esta ficha está oculta por el equipo de Mi Zona. Revisá el aviso en Ajustes." });
    const hoy = hoyISO();
    const campo = `mesGratisUsado.${tipo}`;
    const r = await Usuario.updateOne({ _id: usuario._id, $or: [{ [campo]: "" }, { [campo]: null }, { [campo]: { $exists: false } }] }, { $set: { [campo]: hoy } });
    if (r.modifiedCount !== 1) return res.status(409).json({ codigo: "mes_gratis_usado", error: "Ya usaste tu mes gratis para este tipo de ficha. Podés activarla con un plan de pago." });
    try {
      const v = await sumarTiempo(tipo, ficha, { meses: MES_GRATIS_MESES, origen: "gratis" });
      res.json({ ok: true, vence: v.despues });
    } catch (e) {
      await Usuario.updateOne({ _id: usuario._id }, { $set: { [campo]: "" } }); // no se llegó a regalar: se devuelve el mes
      throw e;
    }
  } catch (e) {
    console.error("Error activando el mes gratis:", e);
    res.status(500).json({ error: "No se pudo activar el mes gratis. Probá de nuevo." });
  }
});

// POST /api/suscripcion/compra   { tipo, id, productId, purchaseToken }
// La app compra con Google Play Billing y manda acá el comprobante. El SERVIDOR le pregunta a Google si la compra es real antes de
// sumar nada. Cada comprobante sirve una sola vez. Los meses se suman al vencimiento actual (no se pierde lo que quedaba).
router.post("/compra", identificar, requiereUsuario, limitar("compra", 30, 3600 * 1000), async (req, res) => {
  try {
    const usuario = req.actor.usuario;
    if (bloqueadaPorSuspension(usuario, res)) return;
    const { tipo, id, productId, purchaseToken } = req.body || {};
    const producto = productoConocido(productId);
    if (!producto || producto.tipo !== tipo) return res.status(400).json({ error: "Producto inválido." });
    if (typeof purchaseToken !== "string" || purchaseToken.length < 10 || purchaseToken.length > 4096) return res.status(400).json({ error: "Comprobante inválido." });
    const ficha = await fichaDelDueno(tipo, id, usuario._id);
    if (!ficha) return res.status(404).json({ error: "No encontramos esa ficha en tu cuenta." });
    if (!playConfigurado()) return res.status(503).json({ error: "El cobro con Google Play todavía no está configurado en el servidor." });

    const tokenHash = hashToken(purchaseToken);
    const previa = await Compra.findOne({ tokenHash }).lean();
    if (previa) {
      if (previa.usuarioId !== String(usuario._id)) return res.status(409).json({ error: "Este comprobante ya fue usado." });
      return res.json({ ok: true, yaAcreditada: true, vence: previa.venceDespues, consumir: true }); // reintento de la app: no se suma otra vez
    }

    let g;
    try { g = await verificarCompra(productId, purchaseToken); }
    catch (e) { console.error("No se pudo consultar a Google Play:", e.message); return res.status(502).json({ error: "No pudimos verificar la compra con Google en este momento. No se perdió: probá de nuevo en unos minutos." }); }
    if (g.pendiente) return res.status(202).json({ pendiente: true, error: "Tu pago está pendiente en Google Play. Cuando se confirme, activamos el plan." });
    if (!g.valida) return res.status(400).json({ error: g.motivo || "Google no confirmó esta compra." });

    let compra;
    try {
      compra = await Compra.create({ tokenHash, productoId: productId, orderId: g.orderId, usuarioId: String(usuario._id), tipo, fichaId: ficha.id, plan: producto.plan, meses: producto.meses });
    } catch (e) {
      if (e.code === 11000) return res.json({ ok: true, yaAcreditada: true, consumir: true }); // dos pedidos a la vez: el otro la acreditó
      throw e;
    }
    let v;
    try { v = await sumarTiempo(tipo, ficha, { meses: producto.meses, plan: producto.plan, origen: "play" }); }
    catch (e) { await Compra.deleteOne({ _id: compra._id }); throw e; } // no se acreditó: se libera el comprobante para reintentar
    await Compra.updateOne({ _id: compra._id }, { $set: { venciaAntes: v.antes, venceDespues: v.despues } });
    try { if (!g.reconocida) await reconocerCompra(productId, purchaseToken); }
    catch (e) { console.error("No se pudo reconocer la compra (Google la reembolsa si pasan 3 días):", e.message); }
    res.json({ ok: true, vence: v.despues, consumir: true });
  } catch (e) {
    console.error("Error acreditando la compra:", e);
    res.status(500).json({ error: "No se pudo activar el plan. Si Google te cobró, no pierdas el comprobante: escribinos desde Soporte." });
  }
});

// POST /api/suscripcion/usar-dias   { tipo, id }
// Aplica a una ficha los días regalados por invitaciones que la persona tiene disponibles (todos de una vez).
router.post("/usar-dias", identificar, requiereUsuario, limitar("usar-dias", 20, 3600 * 1000), async (req, res) => {
  try {
    const usuario = req.actor.usuario;
    if (bloqueadaPorSuspension(usuario, res)) return;
    const { tipo, id } = req.body || {};
    if (!TIPOS.includes(tipo)) return res.status(400).json({ error: "Tipo de ficha inválido." });
    const ficha = await fichaDelDueno(tipo, id, usuario._id);
    if (!ficha) return res.status(404).json({ error: "No encontramos esa ficha en tu cuenta." });
    if (ficha.ocultaPorEquipo === true) return res.status(403).json({ error: "Esta ficha está oculta por el equipo de Mi Zona. Revisá el aviso en Ajustes." });
    // Se descuentan los días de forma atómica antes de sumarlos: no se pueden usar dos veces
    const antes = await Usuario.findOneAndUpdate({ _id: usuario._id, diasDisponibles: { $gt: 0 } }, { $set: { diasDisponibles: 0 } }, { new: false }).select("diasDisponibles").lean();
    const dias = antes?.diasDisponibles || 0;
    if (dias <= 0) return res.status(409).json({ error: "No tenés días de invitación disponibles." });
    try {
      const v = await sumarTiempo(tipo, ficha, { dias, origen: ficha.suscripcion?.origen || "invitacion" });
      res.json({ ok: true, dias, vence: v.despues });
    } catch (e) {
      await Usuario.updateOne({ _id: usuario._id }, { $inc: { diasDisponibles: dias } }); // no se aplicaron: se devuelven
      throw e;
    }
  } catch (e) {
    console.error("Error aplicando los días de invitación:", e);
    res.status(500).json({ error: "No se pudieron aplicar los días. Probá de nuevo." });
  }
});

// GET /api/suscripcion/panel?tipo=negocio|oficio|alquiler&id=...   → panel del dueño (SOLO cantidades de los últimos 30 días; nunca quién fue)
router.get("/panel", identificar, requiereUsuario, limitar("panel-dueno", 60, 3600 * 1000), async (req, res) => {
  try {
    const usuario = req.actor.usuario;
    const tipo = String(req.query.tipo || "");
    if (!TIPOS.includes(tipo)) return res.status(400).json({ error: "Tipo de ficha inválido." });
    const ficha = await fichaDelDueno(tipo, String(req.query.id || ""), usuario._id);
    if (!ficha) return res.status(404).json({ error: "No encontramos esa ficha en tu cuenta." });
    const r = await resumenDeFicha(ficha.id, 30);
    const inv = await resumenInvitaciones(usuario);
    res.json({
      ...r,
      // Los favoritos de oficios y alquileres se guardan en el celular de cada persona: Mi Zona no puede contarlos
      guardados: tipo === "negocio" ? r.guardados : null,
      vence: ficha.expiresAt || null, diasParaVencer: ficha.expiresAt ? diasHasta(ficha.expiresAt) : null,
      invitaciones: inv.acreditadas, diasGanadosInvitando: inv.diasGanadosInvitando,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudieron cargar tus estadísticas." });
  }
});

// POST /api/suscripcion/revisar-vencimientos  (header x-cron-key = CRON_KEY)
// Manda los avisos de "te quedan N días", oculta las fichas vencidas y acredita invitaciones. El servidor ya lo hace solo cada 6 horas
// mientras está despierto; esta ruta sirve para llamarlo desde un cron externo (ver LEEME) porque Render gratis se duerme.
router.post("/revisar-vencimientos", async (req, res) => {
  try {
    if (!process.env.CRON_KEY) return res.status(503).json({ error: "Falta CRON_KEY en el servidor." });
    if (!compararSeguro(req.headers["x-cron-key"] || "", process.env.CRON_KEY)) return res.status(401).json({ error: "Clave inválida" });
    res.json(await revisarVencimientos());
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error del servidor" });
  }
});

export default router;
