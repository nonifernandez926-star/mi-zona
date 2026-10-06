import mongoose from "mongoose";

// Consulta que una persona le manda al equipo de Mi Zona desde Ajustes → Soporte.
// Puede venir de alguien con sesión (usuarioId) o de alguien que no pudo entrar (solo email).
const consultaSchema = new mongoose.Schema(
  {
    usuarioId: { type: String, default: "", index: true },
    email: { type: String, required: true, index: true },
    nombre: { type: String, default: "" },
    motivo: { type: String, required: true }, // cuenta | negocio | pagos | asistente | resenas | error | sugerencia | otro
    asunto: { type: String, required: true },
    mensaje: { type: String, required: true },
    estado: { type: String, enum: ["abierta", "respondida", "cerrada"], default: "abierta", index: true },
    respuesta: { type: String, default: "" },
    respondidaEn: { type: Date, default: null },
    // datos técnicos que ayudan a reproducir un problema (los manda la app, la persona los ve antes de enviar)
    tecnico: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Consulta", consultaSchema);
