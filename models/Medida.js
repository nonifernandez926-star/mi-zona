import mongoose from "mongoose";

// Medida del equipo de Mi Zona sobre una cuenta o un contenido (Fase 8): advertencia, contenido oculto o suspensión.
// Es lo que la persona ve en Ajustes → Avisos del equipo, con el motivo y la forma de apelar.
const medidaSchema = new mongoose.Schema(
  {
    usuarioId: { type: String, required: true, index: true },
    tipo: { type: String, required: true, enum: ["advertencia", "contenido_oculto", "suspension"] },
    motivo: { type: String, required: true }, // lo que se le explica a la persona
    objeto: { // solo contenido_oculto: qué se ocultó
      tipo: { type: String, default: "" }, id: { type: String, default: "" }, titulo: { type: String, default: "" },
      restaurar: { type: mongoose.Schema.Types.Mixed, default: null }, // solo perfil: lo que se quitó (foto, descripción), para devolverlo si la apelación se acepta
    },
    desde: { type: Date, default: Date.now },
    hasta: { type: Date, default: null }, // suspensión temporal: hasta cuándo
    permanente: { type: Boolean, default: false },
    estado: { type: String, enum: ["activa", "levantada"], default: "activa", index: true },
    levantadaEn: { type: Date, default: null },
    vistaEn: { type: Date, default: null }, // cuándo la persona la leyó y tocó «Entendido»
    denunciaIds: { type: [String], default: [] },
    apelacion: {
      texto: { type: String, default: "" },
      creadaEn: { type: Date, default: null },
      estado: { type: String, enum: ["", "pendiente", "aceptada", "rechazada"], default: "" },
      respuesta: { type: String, default: "" },
      resueltaEn: { type: Date, default: null },
    },
  },
  { timestamps: true }
);
medidaSchema.index({ "apelacion.estado": 1, "apelacion.creadaEn": 1 });

export default mongoose.model("Medida", medidaSchema);
