import mongoose from "mongoose";

// Publicación de Comunidad (Fase 7). Gratis. Se muestra solo a los vecinos del mismo departamento. Siempre tiene vencimiento.
const publicacionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    ownerId: { type: String, required: true, index: true },
    tipo: { type: String, required: true }, // aviso | seguridad | perdido | ayuda | regalo | deporte | evento
    titulo: { type: String, default: "" },
    desc: { type: String, default: "" },
    localidad: {
      provinciaId: { type: String, default: "" }, provincia: { type: String, default: "" },
      departamentoId: { type: String, default: "" }, departamento: { type: String, default: "" },
      localidadId: { type: String, default: "" }, localidad: { type: String, default: "" },
    },
    departamentoId: { type: String, default: "" }, // copia de localidad.departamentoId para filtrar rápido: define QUIÉN la ve
    zona: { type: String, default: "" },
    fotos: { type: [String], default: [] },
    datos: { type: mongoose.Schema.Types.Mixed, default: {} }, // campos propios de cada tipo (subtipo, gravedad, mascota, categoría…)
    whatsapp: { type: String, default: "" }, // NUNCA sale en listados: se entrega recién al tocar «Contactar por WhatsApp»
    mostrarWhatsapp: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true }, // todas vencen
    inicioAt: { type: Date, default: null }, // deportes y eventos: cuándo empiezan (orden y filtros por fecha)
    prioridad: { type: Number, default: 0 }, // avisos: urgente 2, importante 1
    resuelta: { type: Boolean, default: false },
    resueltaEn: { type: Date, default: null },
    estadoEvento: { type: String, default: "normal" }, // normal | cancelado | reprogramado
    textoBusqueda: { type: String, default: "" },
    borrarEn: { type: Date, required: true }, // se borra sola de la base de datos (vencimiento + 90 días)
    // Fase 8: si el equipo de Mi Zona la ocultó por una denuncia, no sale en listados, búsquedas ni se abre desde afuera. El dueño la sigue viendo y puede apelar.
    ocultaPorEquipo: { type: Boolean, default: false },
    ocultaMotivo: { type: String, default: "" },
    ocultaDesde: { type: Date, default: null },
    ocultaMedidaId: { type: String, default: "" },
  },
  { timestamps: true }
);

publicacionSchema.index({ departamentoId: 1, tipo: 1, expiresAt: -1 });
publicacionSchema.index({ departamentoId: 1, resuelta: 1, createdAt: -1 });
publicacionSchema.index({ borrarEn: 1 }, { expireAfterSeconds: 0 }); // TTL: MongoDB borra las viejas solo

export default mongoose.model("Publicacion", publicacionSchema);
