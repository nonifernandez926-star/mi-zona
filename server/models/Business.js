import mongoose from "mongoose";

const businessSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: String,
    desc: String,
    cat: String,
    zone: String,
    services: [String],
    specialties: [String],
    paymentMethods: [String],
    delivery: Boolean,
    acceptsWhatsapp: Boolean,
    phone: String,
    ig: String,
    tiktok: String,
    facebook: String,
    logo: String,
    portada: String, // foto de fondo del perfil: la elige el dueño (una sola)
    photos: [String],
    loc: String,
    lat: Number,
    lng: Number,
    weekHours: { type: mongoose.Schema.Types.Mixed },
    featured: { type: Boolean, default: false },
    status: { type: String, default: "active" },
    createdAt: String,
    expiresAt: String,
    lastRenewal: String,
    views: { type: Number, default: 0 },
    vecesFavorito: { type: Number, default: 0 },
    reviews: { type: mongoose.Schema.Types.Mixed, default: [] },
    discounts: { type: mongoose.Schema.Types.Mixed, default: [] },
    geoIntentos: { type: Number, default: 0 }, // cuántas veces se intentó ubicar la dirección en el mapa sin éxito
    // El chat con el asistente solo se muestra a los clientes si el negocio tiene Mi Asistente PAGO (lo actualiza el servidor)
    asistenteActivo: { type: Boolean, default: false },
    // Dueño: se identifica por su cuenta de Google (ya no hay códigos de dueño ni de colaborador)
    ownerId: { type: String, index: true },
    // El dueño decide (y puede desactivar cuando quiera): que su perfil muestre "Dueño de: este negocio" y que la ficha muestre "Dueño: @usuario"
    duenoEnPerfil: { type: Boolean, default: false },
    duenoEnFicha: { type: Boolean, default: false },
    // Privacidad de la ficha (la decide el dueño en Ajustes → Privacidad; el servidor la hace respetar en lo que sale al público):
    //  · mostrarWhatsapp: si está apagado, el teléfono/WhatsApp del negocio NO sale al público (sigue siendo obligatorio al cargarlo)
    //  · apareceEnBusquedas: si está apagado, la ficha no sale en búsquedas ni listados; el dueño la sigue viendo en sus negocios
    // Las fichas anteriores no tienen estos campos: se toman como "encendido".
    mostrarWhatsapp: { type: Boolean, default: true },
    apareceEnBusquedas: { type: Boolean, default: true },
    ownerEmail: { type: String, index: true }, // permite que el admin asigne un negocio viejo a una cuenta de Google
    // Suscripción del negocio en Mi Zona. expiresAt (YYYY-MM-DD) es la fecha de vencimiento real.
    pendientePago: { type: Boolean, default: false }, // cargado pero todavía sin pagar → no se muestra al público
    suscripcion: { type: mongoose.Schema.Types.Mixed, default: {} }, // { plan, origen, ultimoPagoId, pagosProcesados, ultimoAviso... }
    historias: { type: mongoose.Schema.Types.Mixed, default: [] },
    compartioEn: { type: Date, default: null }, // Fase 6: cuándo completó el menú de compartir (no prueba que el mensaje llegó)
    asistenteCodigo: String,
    asistenteCodigoPublico: String,
    busquedaEmpleo: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true, strict: false }
);

export default mongoose.model("Business", businessSchema);
