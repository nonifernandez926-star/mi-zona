import express from "express";
import crypto from "crypto";
import Business from "../models/Business.js";
import { identificar, requiereUsuario, compararSeguro } from "../utils/auth.js";
import { sanearNegocio } from "../utils/negocios.js";
import { PLANES } from "../utils/planes.js";
import { hoyISO, sumarMeses } from "../utils/fechas.js";
import { sincronizarCobertura } from "../utils/asistente.js";
import { cargarMercadoPago, webhookEsValido } from "../utils/mercadopago.js";
import { revisarVencimientos } from "../utils/vencimientos.js";

const router = express.Router();

function armarNegocioNuevo(datos, usuario) {
  const negocio = sanearNegocio(datos); // lista blanca: el resto (estado, vencimiento, dueño...) lo pone el servidor
  delete negocio.discounts; delete negocio.historias; delete negocio.busquedaEmpleo;
  return {
    ...negocio,
    id: crypto.randomBytes(8).toString("hex"),
    kind: "business",
    featured: false,
    status: "inactive", // se activa recién cuando se confirma el pago (o queda cubierto por Mi Asistente)
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

function configCobroFaltante() {
  if (!process.env.MP_ACCESS_TOKEN) return "El cobro con Mercado Pago todavía no está configurado en el servidor.";
  if (!process.env.BACKEND_URL || !process.env.FRONTEND_URL) return "Faltan BACKEND_URL y FRONTEND_URL en el servidor.";
  return null;
}

// GET /api/suscripcion/planes → precios de los planes (para mostrarlos en la web)
router.get("/planes", (req, res) => res.json(PLANES));

// GET /api/suscripcion/cobertura → ¿esta cuenta ya pagó Mi Asistente? (entonces Mi Zona no se cobra)
router.get("/cobertura", identificar, requiereUsuario, async (req, res) => {
  try {
    const c = await sincronizarCobertura(null, req.actor.usuario);
    res.json({ consultado: c.consultado, cubierto: c.cubierto, hasta: c.hasta });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo verificar tu suscripción de Mi Asistente." });
  }
});

// POST /api/suscripcion/iniciar   { plan, business? , bizId? }
//  · business: negocio NUEVO recién completado en el formulario. Se guarda (sin publicar) y se manda a pagar.
//              Si la cuenta ya pagó Mi Asistente, se publica directo y no paga.
//  · bizId:    renovar / agregar meses a un negocio propio (los meses se suman al vencimiento actual).
router.post("/iniciar", identificar, requiereUsuario, async (req, res) => {
  try {
    const usuario = req.actor.usuario;
    const { plan, business, bizId } = req.body || {};
    const planElegido = Object.prototype.hasOwnProperty.call(PLANES, plan) ? PLANES[plan] : undefined;

    let negocio;
    if (business) {
      if (typeof business !== "object" || Array.isArray(business)) return res.status(400).json({ error: "Datos del negocio inválidos." });
      const limpio = sanearNegocio(business);
      if (!limpio.name || !limpio.phone) return res.status(400).json({ error: "Completá el nombre y el teléfono del negocio." });
      if (!limpio.portada) return res.status(400).json({ error: "Elegí la foto de fondo de tu perfil." });

      // ¿Ya pagó Mi Asistente con esta cuenta? Entonces publicamos el negocio sin cobrar.
      const cob = await sincronizarCobertura(null, usuario);
      const datos = armarNegocioNuevo(business, usuario);
      // (La cobertura vale para UN negocio por cuenta: el segundo o tercero se paga normalmente.)
      const yaUsoCobertura = await Business.exists({ ownerId: String(usuario._id), "suscripcion.origen": "asistente" });
      if (cob.cubierto && cob.hasta && !yaUsoCobertura) {
        const creado = await Business.create({
          ...datos, status: "active", pendientePago: false, expiresAt: cob.hasta, lastRenewal: hoyISO(),
          suscripcion: { plan: null, origen: "asistente" },
        });
        await sincronizarCobertura(creado, usuario); // conecta también el chat del asistente
        return res.json({ cubiertoPorAsistente: true, bizId: creado.id, expiresAt: creado.expiresAt });
      }

      if (!planElegido) return res.status(400).json({ error: "Elegí un plan." });
      const faltaConfig = configCobroFaltante();
      if (faltaConfig) return res.status(503).json({ error: faltaConfig });

      // Si ya había cargado este mismo negocio y quedó sin pagar (volvió atrás, falló el pago...), lo reutilizamos: no se duplica.
      const { id: _nuevoId, ...datosSinId } = datos;
      const previo = await Business.findOne({ ownerId: String(usuario._id), pendientePago: true, name: datos.name });
      if (previo) {
        Object.assign(previo, datosSinId);
        await previo.save();
        negocio = previo;
      } else {
        negocio = await Business.create(datos);
      }
    } else {
      if (!planElegido) return res.status(400).json({ error: "Plan inválido" });
      negocio = await Business.findOne({ id: String(bizId), ownerId: String(usuario._id) });
      if (!negocio) return res.status(404).json({ error: "No encontramos ese negocio en tu cuenta." });
      const faltaConfig = configCobroFaltante();
      if (faltaConfig) return res.status(503).json({ error: faltaConfig });
    }

    const { client, Preference } = await cargarMercadoPago();
    const resultado = await new Preference(client).create({
      body: {
        items: [{
          title: `Suscripción Mi Zona - ${planElegido.label} (${negocio.name})`,
          quantity: 1,
          unit_price: planElegido.precio,
          currency_id: "ARS",
        }],
        external_reference: `${negocio.id}:${plan}`,
        notification_url: `${process.env.BACKEND_URL}/api/suscripcion/webhook`,
        back_urls: {
          success: `${process.env.FRONTEND_URL}/?pago=exito`,
          failure: `${process.env.FRONTEND_URL}/?pago=fallo`,
          pending: `${process.env.FRONTEND_URL}/?pago=pendiente`,
        },
        auto_return: "approved",
      },
    });

    res.json({ initPoint: resultado.init_point, bizId: negocio.id });
  } catch (e) {
    console.error("Error iniciando el pago:", e);
    res.status(500).json({ error: "No se pudo generar el link de pago. Probá de nuevo." });
  }
});

// POST /api/suscripcion/webhook → Mercado Pago avisa acá cuando un pago cambia de estado
router.post("/webhook", async (req, res) => {
  try {
    if (!process.env.MP_ACCESS_TOKEN) return res.sendStatus(200);
    const paymentId = req.body?.data?.id || req.query["data.id"];
    if (!paymentId) return res.sendStatus(200); // otro tipo de notificación: la ignoramos

    if (!process.env.MP_WEBHOOK_SECRET) console.warn("MP_WEBHOOK_SECRET no está configurado: el webhook no está protegido.");
    const firmaOk = webhookEsValido({
      xSignature: req.headers["x-signature"], xRequestId: req.headers["x-request-id"],
      dataId: String(paymentId), secret: process.env.MP_WEBHOOK_SECRET,
    });
    if (!firmaOk) return res.sendStatus(401);

    const { client, Payment } = await cargarMercadoPago();
    const pago = await new Payment(client).get({ id: paymentId });
    if (pago.status !== "approved") return res.sendStatus(200);

    const [negocioId, plan] = (pago.external_reference || "").split(":");
    const planElegido = Object.prototype.hasOwnProperty.call(PLANES, plan) ? PLANES[plan] : undefined;
    if (!planElegido || Number(pago.transaction_amount) < planElegido.precio) return res.sendStatus(200);

    const pid = String(paymentId);
    const negocio = await Business.findOne({ id: negocioId });
    if (!negocio || (negocio.suscripcion?.pagosProcesados || []).includes(pid)) return res.sendStatus(200); // ya procesado

    // Si todavía le quedaba tiempo, los meses nuevos se suman a partir de ahí (no se pierde lo pagado antes)
    const hoy = hoyISO();
    const base = negocio.expiresAt && negocio.expiresAt > hoy ? negocio.expiresAt : hoy;
    await Business.updateOne(
      { _id: negocio._id, "suscripcion.pagosProcesados": { $ne: pid } }, // evita sumar dos veces si MP reintenta
      {
        $set: {
          expiresAt: sumarMeses(base, planElegido.meses), status: "active", pendientePago: false, lastRenewal: hoy,
          "suscripcion.plan": plan, "suscripcion.origen": "mercadopago", "suscripcion.ultimoPagoId": pid,
        },
        $push: { "suscripcion.pagosProcesados": pid },
      }
    );
    res.sendStatus(200);
  } catch (e) {
    console.error("Error procesando webhook de Mercado Pago:", e);
    res.sendStatus(200); // igual respondemos 200 para que MP no reintente en loop
  }
});

// POST /api/suscripcion/revisar-vencimientos  (header x-cron-key = CRON_KEY)
// Manda los avisos de "te quedan N días" y desactiva los negocios vencidos. El servidor ya lo hace solo cada 6 horas
// mientras está despierto; esta ruta sirve para llamarlo desde un cron externo (ver LEEME) porque Render gratis se duerme.
router.post("/revisar-vencimientos", async (req, res) => {
  try {
    if (!process.env.CRON_KEY) return res.status(503).json({ error: "Falta CRON_KEY en el servidor." });
    if (!compararSeguro(req.headers["x-cron-key"] || "", process.env.CRON_KEY)) return res.status(401).json({ error: "Clave inválida" });
    res.json(await revisarVencimientos());
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

export default router;
