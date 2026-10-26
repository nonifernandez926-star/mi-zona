import mongoose from "mongoose";

// Denuncia de una persona sobre un perfil, un negocio, un oficio, un alquiler o una publicación de Comunidad (Fase 8).
// Se guarda una "foto" de lo denunciado (snapshot): si después lo editan o lo borran, el equipo igual ve qué se denunció.
// Cada persona puede denunciar lo mismo una sola vez mientras esté abierta (índice parcial) y no de nuevo hasta 30 días después de que se resuelva.
const denunciaSchema = new mongoose.Schema(
  {
    denuncianteId: { type: String, required: true, index: true },
    objetoTipo: { type: String, required: true, enum: ["publicacion", "negocio", "oficio", "alquiler", "sorteo", "perfil"] /* "sorteo" quedó solo por denuncias viejas: los sorteos ahora son publicaciones de Comunidad */ },
    objetoId: { type: String, required: true }, // id de la ficha o publicación; para un perfil, el nombre de usuario
    duenoId: { type: String, default: "", index: true }, // cuenta de quien publicó lo denunciado ("" si es un negocio viejo sin dueño)
    motivo: { type: String, required: true, enum: ["spam", "estafa", "suplantacion", "acoso", "ofensivo", "falso", "otro"] },
    detalle: { type: String, default: "" },
    snapshot: { type: mongoose.Schema.Types.Mixed, default: {} }, // { titulo, resumen, subtipo, zona }
    estado: { type: String, enum: ["abierta", "resuelta", "descartada"], default: "abierta", index: true },
    resolucion: {
      accion: { type: String, default: "" }, // ocultar | advertir | suspender | limpiar_perfil | descartar | ya_no_existe
      nota: { type: String, default: "" },
      medidaId: { type: String, default: "" },
      en: { type: Date, default: null },
    },
    borrarEn: { type: Date }, // las resueltas se borran solas un año después de resolverse
  },
  { timestamps: true }
);

denunciaSchema.index({ denuncianteId: 1, objetoTipo: 1, objetoId: 1 }, { unique: true, partialFilterExpression: { estado: "abierta" } });
denunciaSchema.index({ objetoTipo: 1, objetoId: 1, estado: 1 });
denunciaSchema.index({ estado: 1, createdAt: -1 });
denunciaSchema.index({ borrarEn: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("Denuncia", denunciaSchema);
