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
    logo: String,
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
    // Dueño: se identifica por su cuenta de Google (ya no hay códigos de dueño ni de colaborador)
    ownerId: { type: String, index: true },
    ownerEmail: { type: String, index: true }, // permite que el admin asigne un negocio viejo a una cuenta de Google
    // Suscripción del negocio en Mi Zona. expiresAt (YYYY-MM-DD) es la fecha de vencimiento real.
    pendientePago: { type: Boolean, default: false }, // cargado pero todavía sin pagar → no se muestra al público
    suscripcion: { type: mongoose.Schema.Types.Mixed, default: {} }, // { plan, origen, ultimoPagoId, pagosProcesados, ultimoAviso... }
    historias: { type: mongoose.Schema.Types.Mixed, default: [] },
    asistenteCodigo: String,
    asistenteCodigoPublico: String,
    busquedaEmpleo: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true, strict: false }
);

export default mongoose.model("Business", businessSchema);
