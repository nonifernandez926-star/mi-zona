import mongoose from "mongoose";

// Registro de acciones de los clientes sobre un negocio dentro de Mi Zona. Alimenta las estadísticas
// PRIVADAS del dueño (que se consultan desde Mi Asistente). Estos datos nunca salen en rutas públicas.
const eventoSchema = new mongoose.Schema(
  {
    bizId: { type: String, required: true },
    tipo: { type: String, enum: ["visita", "ubicacion", "guardado", "contacto"], required: true },
    clienteId: { type: String, required: true }, // id anónimo del dispositivo (para contar personas distintas)
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

eventoSchema.index({ bizId: 1, createdAt: -1 });
eventoSchema.index({ bizId: 1, tipo: 1, clienteId: 1, createdAt: -1 });
// Se conservan 400 días de historia y después se borran solos, para que la colección no crezca sin fin
eventoSchema.index({ createdAt: 1 }, { expireAfterSeconds: 400 * 24 * 60 * 60 });

export default mongoose.model("Evento", eventoSchema);
